import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { CSS3DRenderer } from "three/addons/renderers/CSS3DRenderer.js";
import { AccountFlow } from "./account/account-flow";
import { SpatialAudio } from "./audio/spatial-audio";
import { MediaPlayback } from "./media/media-playback";
import { RoomConnection } from "./network/room-connection";
import { RemoteAvatars } from "./players/remote-avatars";
import type { AccountProfile, Player, ServerEvent } from "./shared/types";
import { VenueMinimap } from "./world/navigation/venue-minimap";
import { cameraEyeHeight, createPlayerController, type PlayerController } from "./world/physics/player-controller";
import { buildVenue } from "./world/maps/venue";
import { CinemaCast, INDIAN_OTT_PLATFORMS } from "./media/cinema-cast";
import { createCuttingEdgeRenderer } from "./world/rendering/cutting-edge-renderer";
import "./style.css";

const $ = <T extends HTMLElement>(id: string) => {
  const element = document.getElementById(id);
  if (!element) {
    console.warn(`[DOM] Element #${id} not found in DOM.`);
    return document.createElement("div") as unknown as T;
  }
  return element as T;
};

const joinError = $("join-error");
const sceneContainer = $("scene");
const statusElement = (document.getElementById("connection-status") || document.getElementById("room-label") || document.createElement("span")) as HTMLElement;
const roomLabel = (document.getElementById("room-label") || document.getElementById("connection-status") || document.createElement("span")) as HTMLElement;
const screenVideo = $("screen-video") as HTMLVideoElement;
const screenMessage = $("screen-message");
const videoForm = $("video-form") as HTMLFormElement;
const videoUrlInput = $("video-url") as HTMLInputElement;
const videoNote = $("video-note");
const playButton = $("play-button") as HTMLButtonElement;
const seekBar = $("seek-bar") as HTMLInputElement;
const videoTime = $("video-time");
const playerList = $("player-list");
const playerCount = $("player-count");
const hostBadge = $("host-badge");
const chatForm = $("chat-form") as HTMLFormElement;
const chatInput = $("chat-input") as HTMLInputElement;
const chatMessages = $("chat-messages");
const crosshair = $("crosshair");
const seatHint = $("seat-hint");
const toastElement = $("toast");

// Additional media control elements
const showcaseSelect = document.getElementById("showcase-select") as HTMLSelectElement | null;
const loadShowcaseButton = document.getElementById("load-showcase-button") as HTMLButtonElement | null;
const localFileInput = document.getElementById("local-file-input") as HTMLInputElement | null;
const localFileButton = document.getElementById("local-file-button") as HTMLButtonElement | null;
const dragOverlay = document.getElementById("drag-overlay") as HTMLElement | null;
const skipBackButton = document.getElementById("skip-back-button") as HTMLButtonElement | null;
const skipForwardButton = document.getElementById("skip-forward-button") as HTMLButtonElement | null;
const muteButton = document.getElementById("mute-button") as HTMLButtonElement | null;
const volumeSlider = document.getElementById("volume-slider") as HTMLInputElement | null;
const volumeLabel = document.getElementById("volume-label") as HTMLElement | null;
const lightsButton = document.getElementById("lights-button") as HTMLButtonElement | null;

// Indian OTT & Screen Cast Controls
const openOttButton = document.getElementById("open-ott-button") as HTMLButtonElement | null;
const closeOttButton = document.getElementById("close-ott-button") as HTMLButtonElement | null;
const ottModal = document.getElementById("ott-modal") as HTMLElement | null;
const ottGrid = document.getElementById("ott-grid") as HTMLElement | null;
const startCastModalButton = document.getElementById("start-cast-modal-button") as HTMLButtonElement | null;
const castBanner = document.getElementById("cast-banner") as HTMLElement | null;
const castStreamName = document.getElementById("cast-stream-name") as HTMLElement | null;
const stopCastButton = document.getElementById("stop-cast-button") as HTMLButtonElement | null;

const scene = new THREE.Scene();
scene.background = new THREE.Color("#161a24"); // Enclosed architectural interior background
scene.fog = new THREE.Fog("#1e2330", 75, 190); // Soft interior depth atmospheric fog
const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.1, 250);
camera.position.set(-26.0, 1.7, 0.0); // Spawn at the start of Red Carpet Concourse facing East to Screen 1
camera.rotation.order = "YXZ";
camera.rotation.y = 0; // Facing East towards the IMAX Cinema anchor

// 1. Cutting-Edge 3D Renderer (WebGPU with automatic WebGL 2.0 fallback)
const renderer = await createCuttingEdgeRenderer();
renderer.domElement.style.position = "absolute";
renderer.domElement.style.inset = "0";
renderer.domElement.style.zIndex = "2";
sceneContainer.append(renderer.domElement);

// 2. CSS3DRenderer for 3D YouTube & Web Embeds (underneath WebGL canvas)
const cssRenderer = new CSS3DRenderer();
cssRenderer.setSize(innerWidth, innerHeight);
cssRenderer.domElement.className = "css3d-container";
sceneContainer.append(cssRenderer.domElement);
const cssScene = new THREE.Scene();

const controls = new PointerLockControls(camera, renderer.domElement);
const raycaster = new THREE.Raycaster();
const clock = new THREE.Clock();
const venue = buildVenue(scene);
const seatMeshes = venue.seatMeshes;
const minimapCanvas = document.getElementById("minimap") as HTMLCanvasElement | null;
const minimap = minimapCanvas ? new VenueMinimap(minimapCanvas) : null;
const remoteAvatars = new RemoteAvatars(scene);
const minimapDirection = new THREE.Vector3();
const knownPlayers = new Map<string, Player>();
const keys = new Set<string>();
let myPlayerId = "";
let joined = false;
let seatedOn: string | null = null;
let seatedLookEnabled = true;
let jumpQueued = false;
let lastMoveAt = 0;
let toastTimer = 0;
let playerController: PlayerController | null = null;
(window as any).__DEV_VIRTUAL_CINEMA = {
  camera,
  getPlayerController: () => playerController,
  venue,
  getRendererStats: () => renderer.getStats(),
};

function showToast(message: string) {
  toastElement.textContent = message;
  toastElement.classList.remove("hidden");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastElement.classList.add("hidden"), 3000);
}

const roomConnection = new RoomConnection({
  onEvent: onServerEvent,
  onStatus: (status) => {
    statusElement.textContent = status === "connected" ? "Connected" : status === "disconnected" ? "Solo Mode" : "Offline Mode";
    statusElement.classList.toggle("connected", status === "connected");
  },
  onError: (message) => {
    joinError.textContent = message;
  },
  onDisconnect: () => {
    if (joined) showToast("Multiplayer disconnected. Continuing in solo cinema mode.");
  },
});

function send(data: Record<string, unknown>) {
  roomConnection.send(data);
}

const spatialAudio = new SpatialAudio(camera, venue.screenPosition, screenVideo, showToast);

const media = new MediaPlayback({
  screenVideo,
  screenMesh: venue.screenMesh,
  curvedScreenMesh: venue.curvedScreenMesh,
  screenLight: venue.screenLight,
  screenMessage,
  cssScene,
  videoForm,
  videoUrlInput,
  videoNote,
  playButton,
  seekBar,
  videoTime,
  showcaseSelect: showcaseSelect ?? undefined,
  loadShowcaseButton: loadShowcaseButton ?? undefined,
  localFileInput: localFileInput ?? undefined,
  localFileButton: localFileButton ?? undefined,
  dragOverlay: dragOverlay ?? undefined,
  skipBackButton: skipBackButton ?? undefined,
  skipForwardButton: skipForwardButton ?? undefined,
  muteButton: muteButton ?? undefined,
  volumeSlider: volumeSlider ?? undefined,
  volumeLabel: volumeLabel ?? undefined,
  lightsButton: lightsButton ?? undefined,
  spatialAudio,
  setCinemaDimming: venue.setCinemaDimming,
  isHost: () => knownPlayers.size === 0 || (knownPlayers.get(myPlayerId)?.is_host ?? true),
  send,
  showToast,
});

const cinemaCast = new CinemaCast({
  screenVideo,
  onCastStateChange: (isCasting, streamTitle) => {
    if (castBanner) castBanner.classList.toggle("hidden", !isCasting);
    if (isCasting && streamTitle) {
      if (castStreamName) castStreamName.textContent = streamTitle.toUpperCase();
      media.notifyCastActive(true, streamTitle);
    } else {
      media.notifyCastActive(false);
    }
  },
  sendSignal: (signal) => {
    send({
      type: "web_rtc_signal",
      ...signal,
    });
  },
  showToast,
  myPlayerId: () => myPlayerId,
});

function renderOttGrid() {
  if (!ottGrid) return;
  ottGrid.innerHTML = "";
  for (const ott of INDIAN_OTT_PLATFORMS) {
    const card = document.createElement("div");
    card.className = "ott-card";
    card.style.setProperty("--ott-color", ott.color);

    const info = document.createElement("div");
    info.className = "ott-info";

    const badge = document.createElement("div");
    badge.className = "ott-badge";
    badge.textContent = ott.badge;

    const details = document.createElement("div");
    details.className = "ott-details";
    const h4 = document.createElement("h4");
    h4.textContent = ott.name;
    const span = document.createElement("span");
    span.textContent = ott.description;
    details.append(h4, span);
    info.append(badge, details);

    const actions = document.createElement("div");
    actions.className = "ott-actions";

    const openBtn = document.createElement("button");
    openBtn.type = "button";
    openBtn.className = "ott-open-btn";
    openBtn.textContent = "Open & Cast ↗";
    openBtn.title = `Open ${ott.name} in a new tab`;
    openBtn.addEventListener("click", () => {
      window.open(ott.url, "_blank");
      showToast(`Opened ${ott.name}! Now click 'Start IMAX Cast' and select that tab.`);
    });

    actions.append(openBtn);
    card.append(info, actions);
    ottGrid.append(card);
  }
}

openOttButton?.addEventListener("click", () => {
  renderOttGrid();
  ottModal?.classList.remove("hidden");
});

closeOttButton?.addEventListener("click", () => {
  ottModal?.classList.add("hidden");
});

startCastModalButton?.addEventListener("click", async () => {
  ottModal?.classList.add("hidden");
  await cinemaCast.startCast();
});

stopCastButton?.addEventListener("click", () => {
  cinemaCast.stopCast();
});

function initializePlayerMovement() {
  void createPlayerController(venue.obstacles, camera.position)
    .then((controller) => {
      playerController = controller;
      controller.syncFromCamera(camera);
    })
    .catch((error: unknown) => {
      console.error("Could not initialize venue movement physics", error);
      showToast("Movement physics could not start. Refresh the page to try again.");
    });
}

initializePlayerMovement();

function addChatMessage(username: string, text: string) {
  const row = document.createElement("div");
  row.className = "chat-message";
  const name = document.createElement("strong");
  name.textContent = `${username}: `;
  const body = document.createTextNode(text);
  row.append(name, body);
  chatMessages.append(row);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function playerOccupiedSeat(seatId: string) {
  return [...knownPlayers.values()].some((player) => player.id !== myPlayerId && player.seat_id === seatId);
}

function updatePlayerList() {
  playerList.replaceChildren();
  for (const player of knownPlayers.values()) {
    const item = document.createElement("li");
    const dot = document.createElement("span");
    dot.className = "player-dot";
    dot.style.backgroundColor = player.avatar_color;
    const name = document.createElement("span");
    name.textContent = player.username + (player.is_host ? " · host" : "");
    item.append(dot, name);
    playerList.append(item);
  }
  playerCount.textContent = String(Math.max(1, knownPlayers.size));
  const me = knownPlayers.get(myPlayerId);
  const isHost = knownPlayers.size === 0 || (me?.is_host ?? true);
  videoForm.classList.toggle("hidden", !isHost);
  hostBadge.classList.toggle("hidden", !isHost);
  playButton.disabled = false;
  seekBar.disabled = false;
}

function makeRemotePlayer(player: Player) {
  remoteAvatars.upsert(player);
  knownPlayers.set(player.id, player);
  updatePlayerList();
}

function removeRemotePlayer(id: string) {
  remoteAvatars.remove(id);
  knownPlayers.delete(id);
  updatePlayerList();
}

function onServerEvent(event: ServerEvent) {
  switch (event.type) {
    case "joined":
      myPlayerId = event.player_id;
      roomLabel.textContent = `IMAX · ${event.room_id}`;
      history.replaceState(null, "", `?room=${encodeURIComponent(event.room_id)}`);
      break;
    case "room_state":
      event.players.forEach(makeRemotePlayer);
      void media.apply(event.video);
      updatePlayerList();
      break;
    case "player_joined":
    case "player_moved":
      if (event.player.id !== myPlayerId) makeRemotePlayer(event.player);
      else {
        knownPlayers.set(myPlayerId, event.player);
        updatePlayerList();
      }
      break;
    case "player_left":
      removeRemotePlayer(event.player_id);
      break;
    case "chat_message":
      addChatMessage(event.username, event.text);
      break;
    case "video_state":
      void media.apply(event.video);
      updatePlayerList();
      break;
    case "web_rtc_signal":
      void cinemaCast.handleSignal(event);
      break;
    case "error":
      showToast(event.message);
      break;
  }
}

function emitPlayerMove(force = false) {
  const now = performance.now();
  if (!force && now - lastMoveAt < 50) return;
  lastMoveAt = now;
  send({
    type: "player_move",
    x: camera.position.x,
    y: camera.position.y,
    z: camera.position.z,
    rotation_y: camera.rotation.y,
    is_seated: Boolean(seatedOn),
    seat_id: seatedOn,
  });
}

function movePlayer(delta: number) {
  if (!controls.isLocked || seatedOn || !playerController) return;
  const forward = Number(keys.has("KeyW") || keys.has("ArrowUp")) - Number(keys.has("KeyS") || keys.has("ArrowDown"));
  const sideways = Number(keys.has("KeyD") || keys.has("ArrowRight")) - Number(keys.has("KeyA") || keys.has("ArrowLeft"));
  playerController.update(camera, {
    forward,
    sideways,
    sprint: keys.has("ShiftLeft") || keys.has("ShiftRight"),
    jump: jumpQueued,
  }, delta);
  jumpQueued = false;
  emitPlayerMove();
}

function getTargetSeat() {
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  raycaster.far = 4.8;
  const [hit] = raycaster.intersectObjects(seatMeshes, false);
  const seatId = hit?.object.userData.seatId as string | undefined;
  if (!seatId || playerOccupiedSeat(seatId)) return null;
  return { seatId, object: hit.object };
}

function sitInSeat(seatId: string, seatMesh: THREE.Object3D) {
  let group = seatMesh.parent;
  while (group && !group.userData.seatId && group.parent) {
    group = group.parent;
  }
  if (!group || !seatId) return;
  if (playerOccupiedSeat(seatId)) {
    showToast("That seat is already occupied.");
    return;
  }
  const position = new THREE.Vector3();
  group.getWorldPosition(position);
  seatedOn = seatId;
  seatedLookEnabled = true;

  // Eye height in the realistic cinema seat
  camera.position.set(position.x, position.y + 1.05, position.z);

  // Directly frame the center of the giant curved IMAX screen (27.5, 4.5, 0)
  camera.lookAt(new THREE.Vector3(27.5, 4.5, 0));
  camera.rotation.z = 0;

  playerController?.syncFromCamera(camera);
  seatHint.textContent = "L toggle head look · Space stand";
  seatHint.classList.remove("hidden");
  crosshair.classList.add("hidden");
  emitPlayerMove(true);
}

function standUp() {
  if (!seatedOn) return;
  seatedOn = null;
  camera.position.y = Math.max(cameraEyeHeight(), camera.position.y);
  playerController?.syncFromCamera(camera);
  seatHint.classList.add("hidden");
  showToast(controls.isLocked ? "You stood up." : "You stood up. Click the scene to look around.");
  emitPlayerMove(true);
}

function resize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  cssRenderer.setSize(innerWidth, innerHeight);
}

// Fixed-timestep physics accumulator for 144Hz high refresh rate screens
let physicsAccumulator = 0;
const FIXED_PHYSICS_STEP = 1 / 120; // 120Hz deterministic physics sub-stepping
let frameCount = 0;
let cachedTargetSeat: ReturnType<typeof getTargetSeat> = null;

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.1);

  // Sub-step physics at fixed 120Hz for zero-jitter, frame-rate-independent physics
  physicsAccumulator += delta;
  while (physicsAccumulator >= FIXED_PHYSICS_STEP) {
    movePlayer(FIXED_PHYSICS_STEP);
    venue.updateDoors?.(camera.position, FIXED_PHYSICS_STEP);
    physicsAccumulator -= FIXED_PHYSICS_STEP;
  }

  camera.getWorldDirection(minimapDirection);
  minimap?.update(camera.position, minimapDirection, delta);
  remoteAvatars.update(delta);
  spatialAudio.update(camera.position);
  media.updateFrame();

  // Throttle seat raycasting to every 4th frame (~36Hz at 144FPS) to preserve 144Hz frame budget
  frameCount += 1;
  if (frameCount % 4 === 0) {
    cachedTargetSeat = getTargetSeat();
  }

  const target = cachedTargetSeat;
  const canInteract = target && !seatedOn;
  seatHint.classList.toggle("hidden", !seatedOn && !canInteract);
  if (canInteract) seatHint.textContent = `E sit in ${target.seatId} · Space jump · Esc release mouse`;

  renderer.render(scene, camera);
  cssRenderer.render(cssScene, camera);
}
animate();

const accountFlow = new AccountFlow({
  onEnter: (profile: AccountProfile, roomId: string) => {
    joined = true;
    spatialAudio.initialize();
    if (profile.user_id !== "guest-user") {
      roomConnection.connect(roomId);
    } else {
      statusElement.textContent = "Solo Mode";
      statusElement.classList.add("connected");
      hostBadge.classList.remove("hidden");
      videoForm.classList.remove("hidden");
      playButton.disabled = false;
      seekBar.disabled = false;
    }
    showToast(`Welcome to IMAX, ${profile.display_name}. Click the scene to look around.`);
  },
});
void accountFlow.initialize();

renderer.domElement.addEventListener("click", (event) => {
  if (seatedOn) {
    if (!controls.isLocked) controls.lock();
    return;
  }
  if (controls.isLocked) {
    const seat = getTargetSeat();
    if (seat) sitInSeat(seat.seatId, seat.object);
    return;
  }
  if (event.target === renderer.domElement) controls.lock();
});

document.addEventListener("keydown", (event) => {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
  keys.add(event.code);
  if (event.code === "Space" && !event.repeat) {
    event.preventDefault();
    if (seatedOn) standUp();
    else if (controls.isLocked) jumpQueued = true;
  }
  if (event.code === "KeyL" && seatedOn && !event.repeat) {
    seatedLookEnabled = !seatedLookEnabled;
    if (seatedLookEnabled && !controls.isLocked) controls.lock();
    else if (!seatedLookEnabled && controls.isLocked) controls.unlock();
    seatHint.textContent = `${seatedLookEnabled ? "L unlock" : "L lock"} head look · Space stand`;
  }
  if (event.code === "KeyE" && !seatedOn) {
    const seat = getTargetSeat();
    if (seat) {
      sitInSeat(seat.seatId, seat.object);
    } else if (Math.abs(camera.position.x - 2.2) < 3.2 && Math.abs(camera.position.z) < 2.2) {
      const dir = camera.position.x <= 2.2 ? 1 : -1;
      venue.pushDoor?.(dir);
    }
  }
});
document.addEventListener("keyup", (event) => keys.delete(event.code));
document.addEventListener("pointerlockchange", () => {
  crosshair.classList.toggle("hidden", !controls.isLocked || Boolean(seatedOn));
});
window.addEventListener("blur", () => keys.clear());
window.addEventListener("resize", resize);

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;
  send({ type: "chat_message", text });
  chatInput.value = "";
});

setInterval(() => {
  const me = knownPlayers.get(myPlayerId);
  if (me && controls.isLocked && !seatedOn) emitPlayerMove(true);
}, 50);
