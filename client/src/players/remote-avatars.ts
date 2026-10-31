import * as THREE from "three";
import { cameraEyeHeight } from "../world/physics/player-controller";
import type { Player } from "../shared/types";

interface RemoteAvatar {
  root: THREE.Group;
  target: THREE.Vector3;
  rotation: number;
  avatar: THREE.Mesh;
  head: THREE.Mesh;
}

function makeLabel(text: string, color: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context is unavailable");
  context.fillStyle = "#101117dd";
  context.beginPath();
  context.roundRect(16, 16, 480, 96, 24);
  context.fill();
  context.fillStyle = color;
  context.font = "600 38px sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text.slice(0, 24), 256, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  label.scale.set(2.4, 0.6, 1);
  label.position.y = 2.45;
  return label;
}

export class RemoteAvatars {
  private readonly avatars = new Map<string, RemoteAvatar>();
  private readonly scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  upsert(player: Player) {
    let state = this.avatars.get(player.id);
    if (!state) {
      const root = new THREE.Group();
      const color = new THREE.Color(player.avatar_color);
      const avatar = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.32, 0.75, 4, 8),
        new THREE.MeshStandardMaterial({ color, roughness: 0.68 }),
      );
      avatar.position.y = 0.9;
      avatar.castShadow = true;
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.23, 12, 10),
        new THREE.MeshStandardMaterial({ color: "#e5bd9e", roughness: 0.8 }),
      );
      head.position.y = 1.7;
      root.add(avatar, head, makeLabel(player.username, player.avatar_color));
      root.position.set(player.x, 0, player.z);
      this.scene.add(root);
      state = {
        root,
        target: new THREE.Vector3(player.x, 0, player.z),
        rotation: player.rotation_y,
        avatar,
        head,
      };
      this.avatars.set(player.id, state);
    }
    state.target.set(player.x, Math.max(0, player.y - cameraEyeHeight()), player.z);
    state.rotation = player.rotation_y;
    state.avatar.position.y = player.is_seated ? 0.58 : 0.9;
    state.avatar.scale.y = player.is_seated ? 0.68 : 1;
    state.head.position.y = player.is_seated ? 1.05 : 1.7;
  }

  remove(id: string) {
    const state = this.avatars.get(id);
    if (!state) return;
    this.scene.remove(state.root);
    state.root.traverse((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.Sprite) {
        child.geometry?.dispose();
        const material = child.material;
        if (Array.isArray(material)) material.forEach((entry) => entry.dispose());
        else material.dispose();
      }
    });
    this.avatars.delete(id);
  }

  update(delta: number) {
    for (const state of this.avatars.values()) {
      state.root.position.lerp(state.target, Math.min(1, delta * 10));
      state.root.rotation.y = THREE.MathUtils.lerp(state.root.rotation.y, state.rotation, Math.min(1, delta * 10));
    }
  }
}
