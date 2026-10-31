import type { ServerEvent } from "../shared/types";

export interface OTTPlatform {
  id: string;
  name: string;
  url: string;
  color: string;
  badge: string;
  description: string;
}

export const INDIAN_OTT_PLATFORMS: OTTPlatform[] = [
  {
    id: "jiocinema",
    name: "JioCinema",
    url: "https://www.jiocinema.com",
    color: "#e5097f",
    badge: "Jio",
    description: "IPL, HBO, Warner Bros, Movies & Live TV",
  },
  {
    id: "hotstar",
    name: "Disney+ Hotstar",
    url: "https://www.hotstar.com/in",
    color: "#0c3b82",
    badge: "Hotstar",
    description: "Marvel, Star Wars, Cricket & Premieres",
  },
  {
    id: "netflix",
    name: "Netflix",
    url: "https://www.netflix.com/browse",
    color: "#e50914",
    badge: "N",
    description: "Originals, Hollywood & Bollywood Cinema",
  },
  {
    id: "primevideo",
    name: "Prime Video",
    url: "https://www.primevideo.com",
    color: "#00a8e1",
    badge: "Prime",
    description: "Global & Indian blockbusters with 4K UHD",
  },
  {
    id: "youtube",
    name: "YouTube",
    url: "https://www.youtube.com",
    color: "#ff0000",
    badge: "YT",
    description: "4K Trailers, Documentaries & Music",
  },
  {
    id: "sonyliv",
    name: "SonyLIV",
    url: "https://www.sonyliv.com",
    color: "#005ea6",
    badge: "Sony",
    description: "UCL, UEFA, WWE & Indian Web Series",
  },
  {
    id: "zee5",
    name: "Zee5",
    url: "https://www.zee5.com",
    color: "#832486",
    badge: "Zee5",
    description: "South Cinema, Regional Hits & Blockbusters",
  },
  {
    id: "aha",
    name: "Aha Video",
    url: "https://www.aha.video",
    color: "#ff6300",
    badge: "Aha",
    description: "100% Telugu & Tamil Non-stop Cinema",
  },
  {
    id: "mxplayer",
    name: "MX Player",
    url: "https://www.mxplayer.in",
    color: "#0066cc",
    badge: "MX",
    description: "Free Movies, Shows & Desi Dramas",
  },
  {
    id: "crunchyroll",
    name: "Crunchyroll",
    url: "https://www.crunchyroll.com",
    color: "#f47521",
    badge: "Anime",
    description: "Demon Slayer, JJK, One Piece & Anime in 1080p",
  },
];

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

export interface CinemaCastOptions {
  screenVideo: HTMLVideoElement;
  onCastStateChange: (isCasting: boolean, streamTitle?: string) => void;
  sendSignal: (signal: { target_player_id?: string; signal_type: string; data: any }) => void;
  showToast: (msg: string) => void;
  myPlayerId: () => string;
}

export class CinemaCast {
  private localStream: MediaStream | null = null;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private isCasting = false;
  private activeTitle = "Cinema Screen Cast";
  private readonly options: CinemaCastOptions;

  constructor(options: CinemaCastOptions) {
    this.options = options;
  }

  get isCastActive(): boolean {
    return this.isCasting;
  }

  get streamTitle(): string {
    return this.activeTitle;
  }

  // ---------------------------------------------------------------------------
  // Host: Start Screen / Tab Capture
  // ---------------------------------------------------------------------------
  async startCast(platformName?: string): Promise<boolean> {
    try {
      this.options.showToast("Choose 'Chrome Tab' and check 'Share tab audio' for best quality!");

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: "browser",
          frameRate: { ideal: 60, max: 60 },
          width: { ideal: 1920, max: 3840 },
          height: { ideal: 1080, max: 2160 },
        },
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      this.localStream = stream;
      this.isCasting = true;
      this.activeTitle = platformName ? `${platformName} Live Stream` : "Tab Cast (60 FPS)";

      // Reset any previous media src
      const video = this.options.screenVideo;
      video.pause();
      video.removeAttribute("src");
      video.srcObject = stream;
      video.muted = true; // Host must be muted to bypass browser autoplay block and avoid local audio loop
      video.playsInline = true;
      video.autoplay = true;

      try {
        await video.play();
      } catch (err) {
        console.warn("Cast video play failed on initial attempt, retrying:", err);
        video.muted = true;
        await video.play().catch(() => {});
      }

      // Notify UI
      this.options.onCastStateChange(true, this.activeTitle);
      this.options.showToast(`Broadcasting ${this.activeTitle} across the full-scale 38.8m-wide, 21m-tall curved IMAX screen!`);

      // Notify all connected peers that a cast has started
      this.options.sendSignal({
        signal_type: "cast_started",
        data: { title: this.activeTitle },
      });

      // Handle user stopping the cast from Chrome's top banner
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          this.stopCast();
        };
      }

      return true;
    } catch (err) {
      if (err instanceof Error && err.name !== "NotAllowedError") {
        this.options.showToast(`Could not start screen cast: ${err.message}`);
      }
      return false;
    }
  }

  stopCast() {
    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        track.stop();
      }
      this.localStream = null;
    }

    // Close peer connections
    for (const pc of this.peerConnections.values()) {
      pc.close();
    }
    this.peerConnections.clear();

    const wasCasting = this.isCasting;
    this.isCasting = false;

    if (this.options.screenVideo.srcObject) {
      this.options.screenVideo.srcObject = null;
      this.options.screenVideo.pause();
    }

    if (wasCasting) {
      this.options.sendSignal({
        signal_type: "cast_stopped",
        data: {},
      });
      this.options.onCastStateChange(false);
      this.options.showToast("Cinema cast ended.");
    }
  }

  // ---------------------------------------------------------------------------
  // WebRTC Signaling Handlers (Routed via Oracle Micro Server)
  // ---------------------------------------------------------------------------
  async handleSignal(event: Extract<ServerEvent, { type: "web_rtc_signal" }>) {
    const { from_player_id, signal_type, data } = event;

    switch (signal_type) {
      case "cast_started": {
        this.activeTitle = data?.title || "Live Cinema Cast";
        this.options.showToast(`Host started ${this.activeTitle}. Connecting stream...`);
        // Request offer from the host
        this.options.sendSignal({
          target_player_id: from_player_id,
          signal_type: "request_offer",
          data: {},
        });
        break;
      }

      case "cast_stopped": {
        this.stopReceiving();
        this.options.onCastStateChange(false);
        this.options.showToast("Live cinema cast ended.");
        break;
      }

      case "request_offer": {
        if (!this.localStream || !this.isCasting) return;
        await this.initiateOffer(from_player_id);
        break;
      }

      case "offer": {
        await this.handleOffer(from_player_id, data.sdp);
        break;
      }

      case "answer": {
        const pc = this.peerConnections.get(from_player_id);
        if (pc && pc.signalingState !== "closed") {
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        }
        break;
      }

      case "candidate": {
        const pc = this.peerConnections.get(from_player_id);
        if (pc && data.candidate) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          } catch {
            // Safe candidate drop
          }
        }
        break;
      }
    }
  }

  private async initiateOffer(targetPeerId: string) {
    if (!this.localStream) return;

    const pc = new RTCPeerConnection(ICE_SERVERS);
    this.peerConnections.set(targetPeerId, pc);

    for (const track of this.localStream.getTracks()) {
      pc.addTrack(track, this.localStream);
    }

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        this.options.sendSignal({
          target_player_id: targetPeerId,
          signal_type: "candidate",
          data: { candidate: e.candidate },
        });
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    this.options.sendSignal({
      target_player_id: targetPeerId,
      signal_type: "offer",
      data: { sdp: pc.localDescription },
    });
  }

  private async handleOffer(fromPeerId: string, sdp: RTCSessionDescriptionInit) {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    this.peerConnections.set(fromPeerId, pc);

    pc.ontrack = (e) => {
      if (e.streams[0]) {
        const video = this.options.screenVideo;
        video.pause();
        video.removeAttribute("src");
        video.srcObject = e.streams[0];
        video.playsInline = true;
        video.autoplay = true;
        video.muted = false;
        void video.play().catch(() => {
          video.muted = true;
          void video.play().catch(() => {});
          this.options.showToast("Click unmute in the panel to enable cinema audio.");
        });
        this.isCasting = true;
        this.options.onCastStateChange(true, this.activeTitle);
      }
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        this.options.sendSignal({
          target_player_id: fromPeerId,
          signal_type: "candidate",
          data: { candidate: e.candidate },
        });
      }
    };

    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    this.options.sendSignal({
      target_player_id: fromPeerId,
      signal_type: "answer",
      data: { sdp: pc.localDescription },
    });
  }

  private stopReceiving() {
    for (const pc of this.peerConnections.values()) {
      pc.close();
    }
    this.peerConnections.clear();
    this.isCasting = false;
    if (this.options.screenVideo.srcObject) {
      this.options.screenVideo.srcObject = null;
      this.options.screenVideo.pause();
    }
  }
}
