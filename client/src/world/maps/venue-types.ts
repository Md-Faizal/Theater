import type * as THREE from "three";

export type Vec3 = [number, number, number];

export interface VenueObstacle {
  size: Vec3;
  position: Vec3;
  rotation?: [number, number, number, number];
}

export interface Venue {
  obstacles: VenueObstacle[];
  seatMeshes: THREE.Mesh[];
  seatPickMesh?: THREE.InstancedMesh;
  seatIdsByInstance?: string[];
  seatPositions?: Map<string, THREE.Vector3>;
  screenMesh: THREE.Mesh; // Active screen mesh
  curvedScreenMesh?: THREE.Mesh;
  screenPosition: Vec3;
  screenLight?: THREE.PointLight;
  houseLights?: THREE.PointLight[];
  screenTwoMesh?: THREE.Mesh;
  screenTwoPosition?: Vec3;
  screenTwoLight?: THREE.PointLight;
  setCinemaDimming?: (dimmed: boolean) => void;
  updateDoors?: (playerPos: THREE.Vector3, delta: number) => void;
  pushDoor?: (dir?: number) => void;
}

export interface BoxOptions {
  roughness?: number;
  metalness?: number;
  emissive?: string;
  emissiveIntensity?: number;
  solid?: boolean;
  rotation?: [number, number, number];
}

export interface VenueBuilder {
  scene: THREE.Scene;
  obstacles: VenueObstacle[];
  seatMeshes: THREE.Mesh[];
  finish: () => void;
  addBox: (
    name: string,
    size: Vec3,
    position: Vec3,
    color: string,
    options?: BoxOptions,
  ) => void;
  addObstacle: (size: Vec3, position: Vec3, rotation?: [number, number, number]) => void;
  addLight: (position: Vec3, color: string, intensity: number, distance: number) => THREE.PointLight;
}
