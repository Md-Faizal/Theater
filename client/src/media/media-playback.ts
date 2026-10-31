import * as THREE from "three";
import { CSS3DObject } from "three/addons/renderers/CSS3DRenderer.js";
import type Hls from "hls.js";
import type { VideoState } from "../shared/types";
import type { SpatialAudio } from "../audio/spatial-audio";
import { apiUrl } from "../utils/api-url";

interface YoutubePlayer {
  getCurrentTime?(): number;
  getDuration?(): number;
  seekTo?(seconds: number, allowSeekAhead: boolean): void;
  playVideo?(): void;
  pauseVideo?(): void;
  setVolume?(volume: number): void;
  mute?(): void;
  unMute?(): void;
  isMuted?(): boolean;
  destroy?(): void;
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        element: HTMLElement | string,
        options: {
          videoId?: string;
          playerVars?: Record<string, unknown>;
          events?: {
            onReady?: () => void;
            onStateChange?: (event: { data: number }) => void;
          };
        },
      ) => YoutubePlayer;
      ready: (callback: () => void) => void;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

export interface MediaPlaybackOptions {
  screenVideo: HTMLVideoElement;
  screenMesh: THREE.Mesh;
  curvedScreenMesh?: THREE.Mesh;
  screenLight?: THREE.PointLight;
  screenMessage: HTMLElement;
  cssScene?: THREE.Scene;
  videoForm: HTMLFormElement;
  videoUrlInput: HTMLInputElement;
  videoNote: HTMLElement;
  playButton: HTMLButtonElement;
  seekBar: HTMLInputElement;
  videoTime: HTMLElement;
  showcaseSelect?: HTMLSelectElement;
  loadShowcaseButton?: HTMLButtonElement;
  localFileInput?: HTMLInputElement;
  localFileButton?: HTMLButtonElement;
  dragOverlay?: HTMLElement;
  skipBackButton?: HTMLButtonElement;
  skipForwardButton?: HTMLButtonElement;
  muteButton?: HTMLButtonElement;
  volumeSlider?: HTMLInputElement;
  volumeLabel?: HTMLElement;
  lightsButton?: HTMLButtonElement;
  spatialAudio: SpatialAudio;
  setCinemaDimming?: (dimmed: boolean) => void;
  isHost: () => boolean;
  send: (data: Record<string, unknown>) => void;
  showToast: (message: string) => void;
}

export class MediaPlayback {
  private readonly options: MediaPlaybackOptions;
  currentVideo: VideoState | null = null;
  private readonly curvedScreenMesh: THREE.Mesh;
  private readonly curvedScreenMaterial: THREE.MeshBasicMaterial;
  private screenVideoTexture: THREE.VideoTexture | null = null;
  private youtubeCssObject: CSS3DObject | null = null;
  private youtubeIframe: HTMLIFrameElement | null = null;
  private youtubePlayer: YoutubePlayer | null = null;
  private youtubePlayerReady = false;
  private youtubeReady: Promise<void> | null = null;
  private hlsPlayer: Hls | null = null;
  private activeVideoUrl: string | null = null;
  private lastVideoBroadcast = 0;
  private cinemaDimmed = false;

  // Offscreen sampling canvas for real-time Ambilight calculation on direct video
  private readonly sampleCanvas: HTMLCanvasElement;
  private readonly sampleCtx: CanvasRenderingContext2D | null;
  private lastSampleTime = 0;

  constructor(options: MediaPlaybackOptions) {
    this.options = options;
    this.curvedScreenMesh = options.curvedScreenMesh ?? options.screenMesh;
    this.curvedScreenMaterial = this.curvedScreenMesh.material as THREE.MeshBasicMaterial;
    this.curvedScreenMaterial.color.set("#0a0c14");
    this.curvedScreenMaterial.needsUpdate = true;

    this.sampleCanvas = document.createElement("canvas");
    this.sampleCanvas.width = 16;
    this.sampleCanvas.height = 10;
    this.sampleCtx = this.sampleCanvas.getContext("2d", { willReadFrequently: true });

    this.init3DYouTubeScreen();
    this.bindControls();
    this.bindFileDrop();
  }

  private get isYouTubePlayerReady(): boolean {
    return Boolean(
      this.youtubePlayerReady &&
      this.youtubePlayer &&
      typeof this.youtubePlayer.getCurrentTime === "function",
    );
  }

  private destroyYouTubePlayer() {
    this.youtubePlayerReady = false;
    try {
      this.youtubePlayer?.destroy?.();
    } catch {
      // Safe teardown
    }
    this.youtubePlayer = null;
  }

  // -------------------------------------------------------------------------
  // 3D YouTube Screen Initialization via CSS3DObject
  // -------------------------------------------------------------------------
  private init3DYouTubeScreen() {
    if (!this.options.cssScene) return;

    this.youtubeIframe = document.createElement("iframe");
    this.youtubeIframe.id = "imax-3d-youtube-player";
    this.youtubeIframe.style.width = "1920px";
    this.youtubeIframe.style.height = "1080px";
    this.youtubeIframe.style.border = "0";
    this.youtubeIframe.allow =
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    this.youtubeIframe.allowFullscreen = true;

    const wrapper = document.createElement("div");
    wrapper.className = "css3d-screen-wrapper";
    wrapper.style.width = "1920px";
    wrapper.style.height = "1080px";
    wrapper.append(this.youtubeIframe);

    this.youtubeCssObject = new CSS3DObject(wrapper);
    // Scale 1920x1080 to cinema dimensions (36.0m x 20.25m 16:9 frame)
    const scaleX = 36.0 / 1920;
    const scaleY = 20.25 / 1080;
    this.youtubeCssObject.scale.set(scaleX, scaleY, 1.0);
    // Placed right across the curved screen opening (X=43.5), facing the auditorium (-X)
    this.youtubeCssObject.position.set(43.5, 11.0, 0);
    this.youtubeCssObject.rotation.y = -Math.PI / 2;
    this.youtubeCssObject.visible = false;

    this.options.cssScene.add(this.youtubeCssObject);
  }

  isYouTube(url: string) {
    try {
      const fullUrl = url.includes("://") ? url : `https://${url}`;
      const parsed = new URL(fullUrl);
      const host = parsed.hostname.toLowerCase();
      return (
        host === "youtube.com" ||
        host === "www.youtube.com" ||
        host === "m.youtube.com" ||
        host === "youtu.be" ||
        host === "www.youtu.be"
      );
    } catch {
      return false;
    }
  }

  emit(videoUrl: string | null, currentTime: number, isPlaying: boolean) {
    if (this.options.isHost()) {
      this.options.send({
        type: "sync_video",
        video_url: videoUrl,
        current_time: currentTime,
        is_playing: isPlaying,
        timestamp: Date.now(),
      });
    }
    // Apply locally
    void this.apply({
      video_url: videoUrl ?? this.currentVideo?.video_url ?? null,
      current_time: currentTime,
      is_playing: isPlaying,
      timestamp: Date.now(),
    });
  }

  private get isIframeActive(): boolean {
    return Boolean(this.youtubeCssObject?.visible);
  }

  private async resolveViaBackend(url: string): Promise<{
    title?: string;
    stream_url: string;
    proxy_url: string;
    is_curved_compatible: boolean;
  } | null> {
    try {
      const res = await fetch(apiUrl(`/api/media/resolve?url=${encodeURIComponent(url)}`), {
        signal: AbortSignal.timeout(9000),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  async apply(video: VideoState) {
    this.currentVideo = video;
    const {
      screenVideo,
      screenMessage,
      videoNote,
      playButton,
      seekBar,
      videoTime,
    } = this.options;

    playButton.textContent = video.is_playing ? "Ⅱ" : "▶";
    playButton.disabled = false;
    seekBar.disabled = false;

    if (!video.video_url) {
      this.activeVideoUrl = null;
      screenVideo.pause();
      this.hlsPlayer?.destroy();
      this.hlsPlayer = null;
      screenVideo.removeAttribute("src");
      screenVideo.load();
      this.curvedScreenMaterial.map = null;
      this.curvedScreenMaterial.color.set("#0a0c14");
      this.curvedScreenMaterial.needsUpdate = true;
      this.curvedScreenMesh.visible = true;

      if (this.youtubeCssObject) this.youtubeCssObject.visible = false;
      if (this.youtubeIframe) this.youtubeIframe.src = "about:blank";
      this.destroyYouTubePlayer();

      screenVideo.style.display = "none";
      screenMessage.classList.remove("hidden");
      videoNote.textContent = "Select a YouTube trailer or cinema stream to begin.";
      seekBar.value = "0";
      videoTime.textContent = "0:00 / 0:00";
      this.updateCinemaLighting(false);
      return;
    }

    screenMessage.classList.add("hidden");
    const url = video.video_url;

    // -----------------------------------------------------------------------
    // YOUTUBE OR WEB VIDEO: ATTEMPT CURVED RESOLUTION VIA BACKEND
    // -----------------------------------------------------------------------
    if (this.isYouTube(url)) {
      videoNote.textContent = "Connecting to Rust cinema extractor for curved IMAX projection...";

      // Attempt stream extraction via backend proxy
      const resolved = await this.resolveViaBackend(url);
      if (resolved?.proxy_url) {
        // Direct stream extraction succeeded!
        videoNote.textContent = `100% Curved IMAX Projection: ${resolved.title || "Cinema Stream"}`;
        this.options.showToast("Curved IMAX Projection: Playing via backend extractor");
        await this.playDirectStream(resolved.proxy_url, video);
        return;
      }

      // Fallback: If backend stream extraction wasn't available or failed, play standard 3D YouTube frame
      videoNote.textContent = "Playing in standard 3D YouTube player (curved stream extractor offline or DRM-restricted).";
      this.options.showToast("Playing via standard 3D YouTube frame");
      await this.playYouTubeIframeFallback(url, video);
      return;
    }

    // -----------------------------------------------------------------------
    // DIRECT VIDEO / LOCAL FILE (100% CURVED ON THE 38M IMAX SCREEN)
    // -----------------------------------------------------------------------
    await this.playDirectStream(url, video);
  }

  private async playYouTubeIframeFallback(url: string, video: VideoState) {
    const { screenVideo } = this.options;
    this.curvedScreenMaterial.map = null;
    this.curvedScreenMaterial.color.set("#020204");
    this.curvedScreenMaterial.needsUpdate = true;
    this.curvedScreenMesh.visible = true;

    screenVideo.pause();
    this.hlsPlayer?.destroy();
    this.hlsPlayer = null;
    screenVideo.style.display = "none";

    try {
      const id = this.youtubeVideoId(url);
      if (!id) throw new Error("This YouTube URL does not contain a video ID.");

      if (this.activeVideoUrl !== url) {
        this.activeVideoUrl = url;
        if (this.youtubeCssObject) this.youtubeCssObject.visible = true;
        if (this.youtubeIframe) {
          const origin = encodeURIComponent(window.location.origin);
          this.youtubeIframe.src = `https://www.youtube.com/embed/${id}?enablejsapi=1&origin=${origin}&autoplay=1&controls=1&rel=0`;
        }

        await this.loadYouTubeApi();
        if (window.YT?.Player && this.youtubeIframe) {
          this.destroyYouTubePlayer();
          this.youtubePlayer = new window.YT.Player(this.youtubeIframe, {
            events: {
              onReady: () => {
                this.youtubePlayerReady = true;
                this.applyYouTubeSync(video);
                const currentVol = this.options.spatialAudio.getVolume();
                this.youtubePlayer?.setVolume?.(Math.round(currentVol * 100));
                if (this.options.spatialAudio.isMuted()) this.youtubePlayer?.mute?.();
                this.updateCinemaLighting(true);
              },
              onStateChange: (event) => {
                if (event.data === 1) this.updateCinemaLighting(true);
                else if (event.data === 2) this.updateCinemaLighting(false);
              },
            },
          });
        }
      } else {
        this.applyYouTubeSync(video);
      }

      this.updateCinemaLighting(video.is_playing);
    } catch (error) {
      this.options.showToast(error instanceof Error ? error.message : "Could not load YouTube video");
    }
  }

  private async playDirectStream(url: string, video: VideoState) {
    const { screenVideo, videoNote } = this.options;
    if (this.youtubeCssObject) this.youtubeCssObject.visible = false;
    if (this.youtubeIframe) this.youtubeIframe.src = "about:blank";
    this.destroyYouTubePlayer();

    this.curvedScreenMesh.visible = true;
    screenVideo.style.display = "none";
    if (!videoNote.textContent?.includes("Rust")) {
      videoNote.textContent = "Direct cinema playback is projected onto the full-scale 38.8m-wide, 21m-tall curved IMAX screen with 3D audio.";
    }

    if (this.activeVideoUrl !== url) {
      this.activeVideoUrl = url;
      screenVideo.pause();

      if (!url.startsWith("blob:") && !url.startsWith("data:")) {
        screenVideo.crossOrigin = "anonymous";
      } else {
        screenVideo.removeAttribute("crossorigin");
      }

      this.hlsPlayer?.destroy();
      this.hlsPlayer = null;

      const isHls = url.toLowerCase().includes(".m3u8");
      if (isHls && !screenVideo.canPlayType("application/vnd.apple.mpegurl")) {
        const { default: HlsRuntime } = await import("hls.js");
        if (HlsRuntime.isSupported()) {
          this.hlsPlayer = new HlsRuntime();
          this.hlsPlayer.loadSource(url);
          this.hlsPlayer.attachMedia(screenVideo);
          this.hlsPlayer.on(HlsRuntime.Events.ERROR, (_event, data) => {
            if (data.fatal) this.options.showToast("HLS stream failed. Check stream availability and CORS.");
          });
        } else {
          screenVideo.src = url;
          screenVideo.load();
        }
      } else {
        screenVideo.src = url;
        screenVideo.load();
      }
    }

    await this.syncDirectVideo(video);
    this.updateVideoTexture();
    this.updateCinemaLighting(video.is_playing);
  }

  updateFrame() {
    const { screenVideo, seekBar, videoTime } = this.options;
    const video = this.currentVideo;

    if (screenVideo.srcObject) {
      if (screenVideo.paused) {
        void screenVideo.play().catch(() => { });
      }
      if (this.screenVideoTexture) {
        this.screenVideoTexture.needsUpdate = true;
      } else if (screenVideo.readyState >= HTMLMediaElement.HAVE_METADATA) {
        this.updateVideoTexture();
      }
      const now = performance.now();
      if (now - this.lastSampleTime > 80) {
        this.lastSampleTime = now;
        this.sampleScreenLight();
      }
      return;
    }

    if (!this.isIframeActive && screenVideo.duration && Number.isFinite(screenVideo.duration)) {
      const progress = screenVideo.currentTime / screenVideo.duration;
      if (document.activeElement !== seekBar) {
        seekBar.value = String(Math.round(progress * 1000));
      }
      videoTime.textContent = `${this.formatTime(screenVideo.currentTime)} / ${this.formatTime(screenVideo.duration)}`;
      if (this.screenVideoTexture && !screenVideo.paused) {
        this.screenVideoTexture.needsUpdate = true;
      }
    } else if (this.isIframeActive && video?.video_url) {
      const time = this.isYouTubePlayerReady ? (this.youtubePlayer?.getCurrentTime?.() ?? video.current_time) : video.current_time;
      const duration = this.isYouTubePlayerReady ? (this.youtubePlayer?.getDuration?.() ?? 0) : 0;
      if (duration > 0 && document.activeElement !== seekBar) {
        seekBar.value = String(Math.round((time / duration) * 1000));
      }
      videoTime.textContent = `${this.formatTime(time)} / ${this.formatTime(duration)}`;
    }

    // Dynamic Ambilight light sampling on curved screen
    const now = performance.now();
    if (!screenVideo.paused && screenVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      if (now - this.lastSampleTime > 80) {
        this.lastSampleTime = now;
        this.sampleScreenLight();
      }
    }

    // Periodic sync broadcast for host
    if (this.options.isHost() && video?.video_url && now - this.lastVideoBroadcast > 2000) {
      this.lastVideoBroadcast = now;
      const time = this.isIframeActive
        ? (this.isYouTubePlayerReady ? (this.youtubePlayer?.getCurrentTime?.() ?? video.current_time) : video.current_time)
        : screenVideo.currentTime;
      const isPlaying = this.isIframeActive ? video.is_playing : !screenVideo.paused;
      this.emit(null, time, isPlaying);
    }
  }

  private sampleScreenLight() {
    if (!this.sampleCtx || !this.options.screenLight) return;
    const { screenVideo, screenLight } = this.options;
    try {
      this.sampleCtx.drawImage(screenVideo, 0, 0, 16, 10);
      const imgData = this.sampleCtx.getImageData(0, 0, 16, 10).data;
      let totalR = 0;
      let totalG = 0;
      let totalB = 0;
      const pixelCount = 16 * 10;
      for (let i = 0; i < imgData.length; i += 4) {
        totalR += imgData[i];
        totalG += imgData[i + 1];
        totalB += imgData[i + 2];
      }
      const r = totalR / pixelCount / 255;
      const g = totalG / pixelCount / 255;
      const b = totalB / pixelCount / 255;
      const brightness = Math.max(0.1, (r + g + b) / 3);

      screenLight.color.setRGB(Math.max(0.12, r), Math.max(0.12, g), Math.max(0.25, b));
      screenLight.intensity = Math.min(28, brightness * 40);
    } catch {
      screenLight.color.set("#0088ff");
      screenLight.intensity = 14;
    }
  }

  private updateCinemaLighting(isPlaying: boolean) {
    this.cinemaDimmed = isPlaying;
    if (this.options.setCinemaDimming) {
      this.options.setCinemaDimming(isPlaying);
    }
    if (this.options.screenLight) {
      this.options.screenLight.intensity = isPlaying ? 16 : 0;
    }
  }

  toggleCinemaLights() {
    this.cinemaDimmed = !this.cinemaDimmed;
    if (this.options.setCinemaDimming) {
      this.options.setCinemaDimming(this.cinemaDimmed);
    }
    this.options.showToast(this.cinemaDimmed ? "Auditorium lights dimmed." : "Auditorium lights turned on.");
  }

  private bindControls() {
    const {
      screenVideo,
      videoForm,
      videoUrlInput,
      playButton,
      seekBar,
      showcaseSelect,
      loadShowcaseButton,
      localFileInput,
      localFileButton,
      skipBackButton,
      skipForwardButton,
      muteButton,
      volumeSlider,
      volumeLabel,
      lightsButton,
      spatialAudio,
    } = this.options;

    videoForm.addEventListener("submit", (event) => {
      event.preventDefault();
      let url = videoUrlInput.value.trim();
      if (!url) return;
      if (!url.includes("://") && !url.startsWith("blob:") && !url.startsWith("data:")) {
        url = `https://${url}`;
      }
      this.emit(url, 0, true);
      videoUrlInput.value = "";
    });

    // Showcase Reel Selector
    const playSelectedShowcase = () => {
      const url = showcaseSelect?.value.trim();
      if (url) {
        this.emit(url, 0, true);
        this.options.showToast(this.isYouTube(url) ? "Loading 3D YouTube trailer..." : "Loading curved cinema stream...");
      }
    };
    showcaseSelect?.addEventListener("change", playSelectedShowcase);
    loadShowcaseButton?.addEventListener("click", playSelectedShowcase);

    // Local File Picker
    localFileButton?.addEventListener("click", () => {
      localFileInput?.click();
    });
    localFileInput?.addEventListener("change", () => {
      const file = localFileInput.files?.[0];
      if (file) {
        const objectUrl = URL.createObjectURL(file);
        this.emit(objectUrl, 0, true);
        this.options.showToast(`Playing local video: ${file.name}`);
      }
    });

    playButton.addEventListener("click", () => this.togglePlayback());
    seekBar.addEventListener("input", () => this.seek());
    seekBar.addEventListener("change", () => this.seek());

    skipBackButton?.addEventListener("click", () => this.skipRelative(-10));
    skipForwardButton?.addEventListener("click", () => this.skipRelative(10));

    // Volume & Mute Control
    volumeSlider?.addEventListener("input", () => {
      const val = Number(volumeSlider.value) / 100;
      spatialAudio.setVolume(val);
      if (this.isYouTubePlayerReady) {
        this.youtubePlayer?.setVolume?.(Math.round(val * 100));
      }
      if (volumeLabel) volumeLabel.textContent = `${Math.round(val * 100)}%`;
      if (muteButton) muteButton.textContent = val === 0 ? "🔇" : "🔊";
    });

    muteButton?.addEventListener("click", () => {
      const isMuted = spatialAudio.isMuted();
      spatialAudio.setMuted(!isMuted);
      if (this.isYouTubePlayerReady) {
        if (!isMuted) this.youtubePlayer?.mute?.();
        else this.youtubePlayer?.unMute?.();
      }
      muteButton.textContent = !isMuted ? "🔇" : "🔊";
      this.options.showToast(!isMuted ? "Audio muted" : "Audio unmuted");
    });

    lightsButton?.addEventListener("click", () => this.toggleCinemaLights());

    screenVideo.addEventListener("loadeddata", () => this.updateVideoTexture());
    screenVideo.addEventListener("canplay", () => this.updateVideoTexture());
    screenVideo.addEventListener("loadedmetadata", () => {
      if (this.currentVideo && !this.isYouTube(this.currentVideo.video_url ?? "")) {
        void this.syncDirectVideo(this.currentVideo);
      }
      this.updateVideoTexture();
    });
    screenVideo.addEventListener("play", () => this.updateCinemaLighting(true));
    screenVideo.addEventListener("pause", () => this.updateCinemaLighting(false));
    screenVideo.addEventListener("error", () => {
      // If anonymous CORS failed on a direct stream, retry without crossOrigin so it can still play
      if (screenVideo.crossOrigin) {
        screenVideo.removeAttribute("crossorigin");
        screenVideo.load();
        void screenVideo.play().catch(() => { });
      } else if (screenVideo.currentSrc) {
        this.options.showToast("Could not load direct video. Check URL availability.");
      }
    });
  }

  private bindFileDrop() {
    const { dragOverlay } = this.options;
    window.addEventListener("dragover", (event) => {
      event.preventDefault();
      if (dragOverlay) dragOverlay.classList.remove("hidden");
    });
    window.addEventListener("dragleave", (event) => {
      if (event.relatedTarget === null && dragOverlay) {
        dragOverlay.classList.add("hidden");
      }
    });
    window.addEventListener("drop", (event) => {
      event.preventDefault();
      if (dragOverlay) dragOverlay.classList.add("hidden");
      const file = event.dataTransfer?.files?.[0];
      if (file && file.type.startsWith("video/")) {
        const objectUrl = URL.createObjectURL(file);
        this.emit(objectUrl, 0, true);
        this.options.showToast(`Playing local video: ${file.name}`);
      } else if (file) {
        this.options.showToast("Please drop a valid video file (.mp4, .webm, .mkv).");
      }
    });
  }

  skipRelative(seconds: number) {
    const video = this.currentVideo;
    if (!video?.video_url) return;
    const { screenVideo } = this.options;
    if (this.isIframeActive) {
      const cur = this.isYouTubePlayerReady ? (this.youtubePlayer?.getCurrentTime?.() ?? video.current_time) : video.current_time;
      const target = Math.max(0, cur + seconds);
      if (this.isYouTubePlayerReady) {
        this.youtubePlayer?.seekTo?.(target, true);
      }
      this.emit(null, target, video.is_playing);
    } else if (Number.isFinite(screenVideo.duration)) {
      const target = Math.max(0, Math.min(screenVideo.duration, screenVideo.currentTime + seconds));
      screenVideo.currentTime = target;
      this.emit(null, target, !screenVideo.paused);
    }
  }

  togglePlayback() {
    const video = this.currentVideo;
    const { screenVideo, showcaseSelect } = this.options;

    // Default to the first showcase reel if none loaded
    if (!video?.video_url) {
      const fallbackUrl = showcaseSelect?.options[1]?.value;
      if (fallbackUrl) {
        this.emit(fallbackUrl, 0, true);
        this.options.showToast("Starting Avatar IMAX showcase trailer...");
        return;
      }
      this.options.showToast("Select a video from the list or paste a YouTube link.");
      return;
    }

    const playing = this.isIframeActive ? video.is_playing : !screenVideo.paused;

    if (this.isIframeActive) {
      if (this.isYouTubePlayerReady) {
        if (playing) this.youtubePlayer?.pauseVideo?.();
        else this.youtubePlayer?.playVideo?.();
      }
      const curTime = this.isYouTubePlayerReady ? (this.youtubePlayer?.getCurrentTime?.() ?? video.current_time) : video.current_time;
      this.emit(null, curTime, !playing);
      return;
    }

    if (playing) {
      screenVideo.pause();
    } else {
      void screenVideo.play().catch(() => {
        screenVideo.muted = true;
        void screenVideo.play().catch(() => { });
        this.options.showToast("Video unmuted required. Click unmute in the panel.");
      });
    }
    this.emit(null, screenVideo.currentTime, !playing);
  }

  private seek() {
    const video = this.currentVideo;
    if (!video?.video_url) return;
    const { seekBar, screenVideo } = this.options;
    if (this.isIframeActive) {
      const duration = this.isYouTubePlayerReady ? (this.youtubePlayer?.getDuration?.() ?? 0) : 0;
      const position = (Number(seekBar.value) / 1000) * Math.max(duration, 0);
      if (this.isYouTubePlayerReady) {
        this.youtubePlayer?.seekTo?.(position, true);
      }
      this.emit(null, position, video.is_playing);
    } else if (Number.isFinite(screenVideo.duration)) {
      const position = (Number(seekBar.value) / 1000) * screenVideo.duration;
      screenVideo.currentTime = position;
      this.emit(null, position, !screenVideo.paused);
    }
  }

  private youtubeVideoId(url: string) {
    try {
      const fullUrl = url.includes("://") ? url : `https://${url}`;
      const parsed = new URL(fullUrl);
      if (parsed.hostname.includes("youtu.be")) {
        return parsed.pathname.slice(1).split("/")[0] ?? "";
      }
      if (parsed.pathname.startsWith("/embed/")) {
        return parsed.pathname.split("/")[2] ?? "";
      }
      if (parsed.pathname.startsWith("/shorts/")) {
        return parsed.pathname.split("/")[2] ?? "";
      }
      if (parsed.pathname.startsWith("/live/")) {
        return parsed.pathname.split("/")[2] ?? "";
      }
      return parsed.searchParams.get("v") ?? "";
    } catch {
      return "";
    }
  }

  private loadYouTubeApi() {
    if (this.youtubeReady) return this.youtubeReady;
    this.youtubeReady = new Promise<void>((resolve, reject) => {
      if (window.YT?.Player) {
        resolve();
        return;
      }
      const timeout = window.setTimeout(() => reject(new Error("YouTube API timed out")), 12000);
      const previousReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        window.clearTimeout(timeout);
        previousReady?.();
        resolve();
      };
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.onerror = () => {
        window.clearTimeout(timeout);
        reject(new Error("Could not load YouTube IFrame API"));
      };
      document.head.append(script);
    });
    return this.youtubeReady;
  }

  private async syncDirectVideo(video: VideoState) {
    const { screenVideo } = this.options;
    if (screenVideo.readyState >= HTMLMediaElement.HAVE_METADATA) {
      const desired = this.expectedTime(video);
      if (Math.abs(screenVideo.currentTime - desired) > 0.5) screenVideo.currentTime = desired;
    }
    if (video.is_playing) {
      try {
        await screenVideo.play();
      } catch {
        // Autoplay policy fallback: mute and play
        screenVideo.muted = true;
        try {
          await screenVideo.play();
          this.options.showToast("Video started muted due to browser policy. Click unmute in the panel.");
        } catch {
          this.options.showToast("Click the screen once to enable media playback.");
        }
      }
    } else {
      screenVideo.pause();
    }
  }

  private expectedTime(video: VideoState) {
    return Math.max(0, video.current_time + (video.is_playing ? (Date.now() - video.timestamp) / 1000 : 0));
  }

  private applyYouTubeSync(video: VideoState) {
    if (!this.isYouTubePlayerReady || !this.youtubePlayer) return;
    try {
      const desired = this.expectedTime(video);
      const actual = typeof this.youtubePlayer.getCurrentTime === "function" ? this.youtubePlayer.getCurrentTime() : NaN;
      if (Number.isFinite(actual) && Math.abs(actual - desired) > 0.5) {
        this.youtubePlayer.seekTo?.(desired, true);
      }
      if (video.is_playing) this.youtubePlayer.playVideo?.();
      else this.youtubePlayer.pauseVideo?.();
    } catch {
      // Ignored if player is still initializing iframe postMessage
    }
  }

  notifyCastActive(isCasting: boolean, streamTitle?: string) {
    const { videoNote, screenVideo } = this.options;
    if (isCasting) {
      if (this.youtubeCssObject) this.youtubeCssObject.visible = false;
      if (this.youtubeIframe) this.youtubeIframe.src = "about:blank";
      this.destroyYouTubePlayer();
      this.curvedScreenMesh.visible = true;
      videoNote.textContent = `🔴 Live 60 FPS: ${streamTitle || "Cinema Tab Cast"}`;

      // Reset old texture so Three.js creates a fresh VideoTexture bound to the live stream
      if (this.screenVideoTexture) {
        this.screenVideoTexture.dispose();
        this.screenVideoTexture = null;
      }

      const applyStream = () => {
        this.updateVideoTexture();
        this.updateCinemaLighting(true);
      };

      if (screenVideo.readyState >= HTMLMediaElement.HAVE_METADATA) {
        applyStream();
      } else {
        screenVideo.addEventListener("loadedmetadata", applyStream, { once: true });
        screenVideo.addEventListener("canplay", applyStream, { once: true });
      }
    } else {
      videoNote.textContent = "Cast ended. Select a video or cast an OTT tab to begin.";
      if (this.screenVideoTexture) {
        this.screenVideoTexture.dispose();
        this.screenVideoTexture = null;
      }
      this.curvedScreenMaterial.map = null;
      this.curvedScreenMaterial.color.set("#0a0c14");
      this.curvedScreenMaterial.needsUpdate = true;
      this.updateCinemaLighting(false);
    }
  }

  private updateVideoTexture() {
    const { screenVideo } = this.options;
    if (screenVideo.readyState < HTMLMediaElement.HAVE_METADATA) return;

    if (!this.screenVideoTexture) {
      this.screenVideoTexture = new THREE.VideoTexture(screenVideo);
      this.screenVideoTexture.colorSpace = THREE.SRGBColorSpace;
      this.screenVideoTexture.minFilter = THREE.LinearFilter;
      this.screenVideoTexture.magFilter = THREE.LinearFilter;
      this.screenVideoTexture.generateMipmaps = false;
    }

    this.curvedScreenMesh.visible = true;
    this.curvedScreenMaterial.map = this.screenVideoTexture;
    this.curvedScreenMaterial.color.set(0xffffff); // Full brightness
    this.curvedScreenMaterial.needsUpdate = true;
  }

  private formatTime(seconds: number) {
    const safe = Math.max(0, Math.floor(seconds || 0));
    const mins = Math.floor(safe / 60);
    const secs = String(safe % 60).padStart(2, "0");
    return `${mins}:${secs}`;
  }
}
