export interface Player {
  id: string;
  account_id: string;
  username: string;
  avatar_color: string;
  x: number;
  y: number;
  z: number;
  rotation_y: number;
  is_seated: boolean;
  seat_id: string | null;
  is_host: boolean;
}

export interface VideoState {
  video_url: string | null;
  current_time: number;
  is_playing: boolean;
  timestamp: number;
}

export interface AccountProfile {
  user_id: string;
  username: string | null;
  display_name: string;
  avatar_color: string;
  profile_complete: boolean;
  is_development_session: boolean;
}

export interface UsernameAvailability {
  available: boolean;
  valid: boolean;
  message: string | null;
}

export type ServerEvent =
  | { type: "joined"; player_id: string; room_id: string }
  | { type: "room_state"; players: Player[]; video: VideoState }
  | { type: "player_joined" | "player_moved"; player: Player }
  | { type: "player_left"; player_id: string }
  | { type: "chat_message"; player_id: string; username: string; text: string; timestamp: number }
  | { type: "video_state"; video: VideoState }
  | {
      type: "web_rtc_signal";
      from_player_id: string;
      target_player_id?: string | null;
      signal_type: string;
      data: any;
    }
  | { type: "error"; message: string };
