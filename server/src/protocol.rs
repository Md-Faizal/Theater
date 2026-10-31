use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ClientMessage {
    JoinRoom {
        room_id: String,
    },
    PlayerMove {
        x: f32,
        y: f32,
        z: f32,
        rotation_y: f32,
        is_seated: bool,
        seat_id: Option<String>,
    },
    SyncVideo {
        video_url: Option<String>,
        current_time: f64,
        is_playing: bool,
        #[serde(rename = "timestamp")]
        _timestamp: i64,
    },
    ChatMessage {
        text: String,
    },
    WebRtcSignal {
        target_player_id: Option<String>,
        signal_type: String,
        data: serde_json::Value,
    },
}

#[derive(Debug, Clone, Serialize)]
pub struct Player {
    pub id: String,
    pub account_id: String,
    pub username: String,
    pub avatar_color: String,
    pub x: f32,
    pub y: f32,
    pub z: f32,
    pub rotation_y: f32,
    pub is_seated: bool,
    pub seat_id: Option<String>,
    pub is_host: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct VideoPlaybackState {
    pub video_url: Option<String>,
    pub current_time: f64,
    pub is_playing: bool,
    pub timestamp: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ServerMessage {
    Joined {
        player_id: String,
        room_id: String,
    },
    RoomState {
        players: Vec<Player>,
        video: VideoPlaybackState,
    },
    PlayerJoined {
        player: Player,
    },
    PlayerMoved {
        player: Player,
    },
    PlayerLeft {
        player_id: String,
    },
    ChatMessage {
        player_id: String,
        username: String,
        text: String,
        timestamp: i64,
    },
    VideoState {
        video: VideoPlaybackState,
    },
    WebRtcSignal {
        from_player_id: String,
        target_player_id: Option<String>,
        signal_type: String,
        data: serde_json::Value,
    },
    Error {
        message: String,
    },
}
