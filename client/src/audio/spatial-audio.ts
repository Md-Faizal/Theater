import * as THREE from "three";

export class SpatialAudio {
  private context: AudioContext | null = null;
  private panner: PannerNode | null = null;
  private gainNode: GainNode | null = null;
  private currentVolume = 0.8;
  private muted = false;
  private readonly direction = new THREE.Vector3();
  private readonly camera: THREE.Camera;
  private readonly screenPosition: [number, number, number];
  private readonly video: HTMLVideoElement;
  private readonly showToast: (message: string) => void;

  constructor(
    camera: THREE.Camera,
    screenPosition: [number, number, number],
    video: HTMLVideoElement,
    showToast: (message: string) => void,
  ) {
    this.camera = camera;
    this.screenPosition = screenPosition;
    this.video = video;
    this.showToast = showToast;
  }

  initialize() {
    if (this.context || !("AudioContext" in window)) return;
    try {
      this.context = new AudioContext();
      const source = this.context.createMediaElementSource(this.video);

      this.gainNode = this.context.createGain();
      this.gainNode.gain.value = this.muted ? 0 : this.currentVolume;

      this.panner = this.context.createPanner();
      this.panner.panningModel = "HRTF";
      this.panner.distanceModel = "inverse";
      this.panner.refDistance = 6;
      this.panner.maxDistance = 75;
      this.panner.rolloffFactor = 1.0;

      source.connect(this.gainNode);
      this.gainNode.connect(this.panner);
      this.panner.connect(this.context.destination);

      void this.context.resume();
    } catch (error) {
      this.context = null;
      this.panner = null;
      this.gainNode = null;
      console.error("Could not initialize spatial audio", error);
      this.showToast("Spatial audio is unavailable; using standard browser audio.");
    }
  }

  setVolume(volume: number) {
    this.currentVolume = Math.max(0, Math.min(1, volume));
    this.video.volume = this.currentVolume;
    if (this.gainNode && this.context) {
      const targetGain = this.muted ? 0 : this.currentVolume;
      this.gainNode.gain.setTargetAtTime(targetGain, this.context.currentTime, 0.05);
    }
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    this.video.muted = muted;
    if (this.gainNode && this.context) {
      const targetGain = this.muted ? 0 : this.currentVolume;
      this.gainNode.gain.setTargetAtTime(targetGain, this.context.currentTime, 0.05);
    }
  }

  getVolume() {
    return this.currentVolume;
  }

  isMuted() {
    return this.muted;
  }

  update(position: THREE.Vector3) {
    if (!this.context || !this.panner) return;
    const listener = this.context.listener;
    this.camera.getWorldDirection(this.direction);
    listener.positionX.value = position.x;
    listener.positionY.value = position.y;
    listener.positionZ.value = position.z;
    listener.forwardX.value = this.direction.x;
    listener.forwardY.value = this.direction.y;
    listener.forwardZ.value = this.direction.z;
    listener.upX.value = this.camera.up.x;
    listener.upY.value = this.camera.up.y;
    listener.upZ.value = this.camera.up.z;
    this.panner.positionX.value = this.screenPosition[0];
    this.panner.positionY.value = this.screenPosition[1];
    this.panner.positionZ.value = this.screenPosition[2];
  }
}
