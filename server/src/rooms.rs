use crate::{
    accounts::AccountProfile,
    protocol::{ClientMessage, Player, ServerMessage, VideoPlaybackState},
};
use axum::extract::ws::{Message, WebSocket};
use futures_util::{SinkExt, StreamExt};
use std::{
    collections::HashMap,
    sync::Arc,
    time::{SystemTime, UNIX_EPOCH},
};
use tokio::{
    sync::{RwLock, broadcast},
    time::Instant,
};
use uuid::Uuid;

const ROOM_CAPACITY: usize = 64;
const MAX_CHAT_LENGTH: usize = 500;
const MAX_ROOM_ID_LENGTH: usize = 64;
const MAX_VIDEO_URL_LENGTH: usize = 2048;

pub type SharedRooms = Arc<RwLock<HashMap<String, RoomState>>>;

pub struct RoomState {
    players: HashMap<String, Player>,
    video: VideoPlaybackState,
    updates: broadcast::Sender<ServerMessage>,
}

pub fn new_shared_rooms() -> SharedRooms {
    Arc::new(RwLock::new(HashMap::new()))
}

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}

fn clean_text(value: &str, max_chars: usize) -> String {
    value
        .chars()
        .filter(|character| !character.is_control())
        .take(max_chars)
        .collect::<String>()
        .trim()
        .to_owned()
}

fn video_url_is_allowed(url: &str) -> bool {
    if url.starts_with("blob:") {
        return true;
    }
    let Ok(parsed) = url::Url::parse(url) else {
        return false;
    };
    let scheme = parsed.scheme();
    let host = parsed.host_str().unwrap_or_default();
    let is_local = host == "localhost" || host == "127.0.0.1";
    if scheme != "https" && !(scheme == "http" && is_local) {
        return false;
    }
    matches!(
        host,
        "youtube.com" | "www.youtube.com" | "m.youtube.com" | "youtu.be" | "www.youtu.be"
    ) || matches!(
        parsed
            .path()
            .rsplit('.')
            .next()
            .unwrap_or_default()
            .to_ascii_lowercase()
            .as_str(),
        "mp4" | "m3u8" | "webm" | "mkv" | "ogg"
    ) || is_local
}

fn make_player(id: String, profile: &AccountProfile, is_host: bool) -> Player {
    Player {
        id,
        account_id: profile.user_id.clone(),
        username: profile.display_name.clone(),
        avatar_color: profile.avatar_color.clone(),
        x: -8.0,
        y: 1.7,
        z: 0.0,
        rotation_y: 0.0,
        is_seated: false,
        seat_id: None,
        is_host,
    }
}

async fn send_server_message(
    sender: &mut futures_util::stream::SplitSink<WebSocket, Message>,
    message: &ServerMessage,
) -> bool {
    match serde_json::to_string(message) {
        Ok(json) => sender.send(Message::Text(json.into())).await.is_ok(),
        Err(error) => {
            tracing::error!(%error, "could not serialize server message");
            false
        }
    }
}

async fn send_error(sender: &mut futures_util::stream::SplitSink<WebSocket, Message>, text: &str) {
    let message = ServerMessage::Error {
        message: text.to_owned(),
    };
    let _ = send_server_message(sender, &message).await;
}

pub async fn handle_socket(socket: WebSocket, rooms: SharedRooms, profile: AccountProfile) {
    let (mut sender, mut receiver) = socket.split();
    let mut joined_room: Option<String> = None;
    let mut player_id: Option<String> = None;
    let mut updates: Option<broadcast::Receiver<ServerMessage>> = None;
    let mut last_move_at: Option<Instant> = None;
    loop {
        tokio::select! {
            incoming = receiver.next() => {
                let Some(Ok(message)) = incoming else { break };
                match message {
                    Message::Text(text) => {
                        let event = match serde_json::from_str::<ClientMessage>(&text) {
                            Ok(event) => event,
                            Err(error) => {
                                tracing::debug!(%error, "invalid client message");
                                send_error(&mut sender, "Invalid message format").await;
                                continue;
                            }
                        };

                        match event {
                            ClientMessage::JoinRoom { room_id } => {
                                if joined_room.is_some() {
                                    send_error(&mut sender, "This connection has already joined a room").await;
                                    continue;
                                }
                                let room_id = clean_text(&room_id, MAX_ROOM_ID_LENGTH);
                                if room_id.is_empty() {
                                    send_error(&mut sender, "Room is required").await;
                                    continue;
                                }

                                let id = Uuid::new_v4().to_string();
                                let mut room_map = rooms.write().await;
                                let room = room_map.entry(room_id.clone()).or_insert_with(|| {
                                    let (updates, _) = broadcast::channel(256);
                                    RoomState {
                                        players: HashMap::new(),
                                        video: VideoPlaybackState {
                                            video_url: None,
                                            current_time: 0.0,
                                            is_playing: false,
                                            timestamp: now_ms(),
                                        },
                                        updates,
                                    }
                                });
                                if room.players.len() >= ROOM_CAPACITY {
                                    drop(room_map);
                                    send_error(&mut sender, "Room is full").await;
                                    continue;
                                }
                                let is_host = room.players.is_empty();
                                let player = make_player(id.clone(), &profile, is_host);
                                let room_snapshot = ServerMessage::RoomState {
                                    players: room.players.values().cloned().collect(),
                                    video: room.video.clone(),
                                };
                                let _ = room.updates.send(ServerMessage::PlayerJoined {
                                    player: player.clone(),
                                });
                                let _ = room.players.insert(id.clone(), player.clone());
                                let room_updates = room.updates.subscribe();
                                drop(room_map);
                                joined_room = Some(room_id.clone());
                                player_id = Some(id.clone());
                                updates = Some(room_updates);
                                let joined = ServerMessage::Joined {
                                    player_id: id.clone(),
                                    room_id: room_id.clone(),
                                };
                                let joined_ok = send_server_message(&mut sender, &joined).await;
                                let state_ok =
                                    send_server_message(&mut sender, &room_snapshot).await;
                                let own_join = ServerMessage::PlayerJoined { player };
                                let own_join_ok =
                                    send_server_message(&mut sender, &own_join).await;
                                if !(joined_ok && state_ok && own_join_ok) {
                                    break;
                                }
                            }
                            ClientMessage::PlayerMove { x, y, z, rotation_y, is_seated, seat_id } => {
                                let (Some(room_id), Some(id)) = (&joined_room, &player_id) else {
                                    send_error(&mut sender, "Join a room before sending player state").await;
                                    continue;
                                };
                                if ![x, y, z, rotation_y].iter().all(|value| value.is_finite()) {
                                    send_error(&mut sender, "Player coordinates must be finite").await;
                                    continue;
                                }

                                if last_move_at.is_some_and(|last| last.elapsed() < std::time::Duration::from_millis(40)) {
                                    continue;
                                }
                                last_move_at = Some(Instant::now());
                                let mut room_map = rooms.write().await;
                                let Some(room) = room_map.get_mut(room_id) else { continue };
                                let seat_id = if is_seated { seat_id.filter(|seat| seat.len() <= 32) } else { None };
                                if let Some(requested_seat) = &seat_id {
                                    if room.players.values().any(|other| other.id != *id && other.seat_id.as_ref() == Some(requested_seat)) {
                                        drop(room_map);
                                        send_error(&mut sender, "That seat is already occupied").await;
                                        continue;
                                    }
                                }
                                if let Some(player) = room.players.get_mut(id) {
                                    player.x = x.clamp(-55.0, 55.0);
                                    player.y = y.clamp(0.0, 20.0);
                                    player.z = z.clamp(-30.0, 30.0);
                                    player.rotation_y = rotation_y;
                                    player.is_seated = is_seated && seat_id.is_some();
                                    player.seat_id = if player.is_seated { seat_id } else { None };
                                    let _ = room.updates.send(ServerMessage::PlayerMoved {
                                        player: player.clone(),
                                    });
                                }
                            }
                            ClientMessage::SyncVideo { video_url, current_time, is_playing, .. } => {
                                let (Some(room_id), Some(id)) = (&joined_room, &player_id) else {
                                    send_error(&mut sender, "Join a room before changing playback").await;
                                    continue;
                                };
                                let mut room_map = rooms.write().await;
                                let Some(room) = room_map.get_mut(room_id) else { continue };
                                if !room.players.get(id).is_some_and(|player| player.is_host) {
                                    drop(room_map);
                                    send_error(&mut sender, "Only the room host can control playback").await;
                                    continue;
                                }
                                let current_url = video_url
                                    .map(|url| clean_text(&url, MAX_VIDEO_URL_LENGTH))
                                    .or_else(|| room.video.video_url.clone());
                                if current_url.as_deref().is_some_and(|url| !video_url_is_allowed(url)) {
                                    drop(room_map);
                                    send_error(&mut sender, "Use HTTPS MP4, HLS, or YouTube URLs").await;
                                    continue;
                                }
                                if !current_time.is_finite() || current_time < 0.0 {
                                    drop(room_map);
                                    send_error(&mut sender, "Video time must be a non-negative number").await;
                                    continue;
                                }
                                room.video = VideoPlaybackState {
                                    video_url: current_url,
                                    current_time: current_time.min(86_400.0),
                                    is_playing,
                                    timestamp: now_ms(),
                                };
                                let _ = room.updates.send(ServerMessage::VideoState {
                                    video: room.video.clone(),
                                });
                            }
                            ClientMessage::ChatMessage { text } => {
                                let (Some(room_id), Some(id)) = (&joined_room, &player_id) else {
                                    send_error(&mut sender, "Join a room before sending chat").await;
                                    continue;
                                };
                                let text = clean_text(&text, MAX_CHAT_LENGTH);
                                if text.is_empty() {
                                    continue;
                                }
                                let room_map = rooms.read().await;
                                let Some(room) = room_map.get(room_id) else { continue };
                                if let Some(player) = room.players.get(id) {
                                    let _ = room.updates.send(ServerMessage::ChatMessage {
                                        player_id: id.clone(),
                                        username: player.username.clone(),
                                        text,
                                        timestamp: now_ms(),
                                    });
                                }
                            }
                            ClientMessage::WebRtcSignal { target_player_id, signal_type, data } => {
                                let (Some(room_id), Some(id)) = (&joined_room, &player_id) else { continue };
                                let room_map = rooms.read().await;
                                let Some(room) = room_map.get(room_id) else { continue };
                                let _ = room.updates.send(ServerMessage::WebRtcSignal {
                                    from_player_id: id.clone(),
                                    target_player_id,
                                    signal_type,
                                    data,
                                });
                            }
                        }
                    }
                    Message::Close(_) => break,
                    Message::Ping(payload) => {
                        if sender.send(Message::Pong(payload)).await.is_err() { break; }
                    }
                    _ => {}
                }
            }
            update = async {
                match updates.as_mut() {
                    Some(receiver) => receiver.recv().await,
                    None => std::future::pending().await,
                }
            } => {
                match update {
                    Ok(event) => {
                        if let ServerMessage::WebRtcSignal { target_player_id: Some(target), from_player_id, .. } = &event {
                            if let Some(my_id) = &player_id {
                                if target != my_id || from_player_id == my_id {
                                    continue;
                                }
                            }
                        } else if let ServerMessage::WebRtcSignal { from_player_id, .. } = &event {
                            if let Some(my_id) = &player_id {
                                if from_player_id == my_id {
                                    continue;
                                }
                            }
                        }
                        if !send_server_message(&mut sender, &event).await { break; }
                    }
                    Err(broadcast::error::RecvError::Lagged(skipped)) => {
                        tracing::debug!(skipped, "client lagged behind room broadcast");
                    }
                    Err(broadcast::error::RecvError::Closed) => break,
                }
            }
        }
    }

    if let (Some(room_id), Some(id)) = (joined_room, player_id) {
        let mut room_map = rooms.write().await;
        if let Some(room) = room_map.get_mut(&room_id) {
            room.players.remove(&id);
            let _ = room
                .updates
                .send(ServerMessage::PlayerLeft { player_id: id });
            if room.players.is_empty() {
                room_map.remove(&room_id);
            } else if !room.players.values().any(|player| player.is_host) {
                if let Some(next_host) = room.players.values_mut().next() {
                    next_host.is_host = true;
                    let _ = room.updates.send(ServerMessage::PlayerMoved {
                        player: next_host.clone(),
                    });
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::video_url_is_allowed;

    #[test]
    fn accepts_https_media_with_query_parameters() {
        assert!(video_url_is_allowed(
            "https://cdn.example/movie.mp4?token=abc"
        ));
        assert!(video_url_is_allowed(
            "https://cdn.example/live.m3u8?token=abc"
        ));
    }

    #[test]
    fn accepts_youtube_domains_but_rejects_host_spoofing() {
        assert!(video_url_is_allowed("https://youtu.be/example"));
        assert!(video_url_is_allowed(
            "https://www.youtube.com/watch?v=example"
        ));
        assert!(!video_url_is_allowed(
            "https://youtube.com.attacker.example/watch?v=example"
        ));
        assert!(!video_url_is_allowed("http://cdn.example/movie.mp4"));
    }
}
