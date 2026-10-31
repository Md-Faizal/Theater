import type { ServerEvent } from "../shared/types";

interface RoomConnectionOptions {
  onEvent: (event: ServerEvent) => void;
  onStatus: (status: "connected" | "disconnected" | "error") => void;
  onError: (message: string) => void;
  onDisconnect: () => void;
}

export class RoomConnection {
  private socket: WebSocket | null = null;
  private readonly options: RoomConnectionOptions;

  constructor(options: RoomConnectionOptions) {
    this.options = options;
  }

  send(data: Record<string, unknown>) {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(data));
  }

  connect(roomId: string) {
    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    this.socket = new WebSocket(`${protocol}//${location.host}/ws`);
    this.socket.addEventListener("open", () => {
      this.options.onStatus("connected");
      this.send({ type: "join_room", room_id: roomId });
    });
    this.socket.addEventListener("message", (message) => {
      try {
        this.options.onEvent(JSON.parse(String(message.data)) as ServerEvent);
      } catch (error) {
        console.error("Could not process server event", error);
      }
    });
    this.socket.addEventListener("close", () => {
      this.options.onStatus("disconnected");
      this.options.onDisconnect();
    });
    this.socket.addEventListener("error", () => {
      this.options.onStatus("error");
      this.options.onError("Could not connect. Start the server and try again.");
    });
  }
}
