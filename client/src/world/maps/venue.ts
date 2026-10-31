import * as THREE from "three";
import { buildEntertainmentMall } from "./entertainment-mall";
import { buildScreenOneImax } from "./screens/screen-1-imax/screen-1-imax";
import { IMAX_LAYOUT } from "./screens/screen-1-imax/layout";
import { createVenueBuilder } from "./venue-primitives";
import { PhysicsDoubleDoor } from "../doors/physics-double-door";
import type { Venue } from "./venue-types";

export type { Venue, VenueObstacle } from "./venue-types";

export function buildVenue(scene: THREE.Scene): Venue {
  const builder = createVenueBuilder(scene);

  // Warm, luxurious enclosed mall interior ambient light
  scene.add(new THREE.HemisphereLight("#fff7ed", "#d4c8b8", 1.6));

  // Architectural skylight daylight streaming through the vaulted ceiling
  const skylightSun = new THREE.DirectionalLight("#fff4db", 2.2);
  skylightSun.position.set(-30, 32, 10);
  skylightSun.castShadow = false;
  scene.add(skylightSun);

  // Build the grand enclosed luxury entertainment mall concourse & atrium
  buildEntertainmentMall(builder);

  // Build Screen 1 (Flagship IMAX Palace Auditorium)
  const screenOne = buildScreenOneImax(builder);

  // Install physics-based double doors at the auditorium entrance.
  const doubleDoor = new PhysicsDoubleDoor({
    portalX: IMAX_LAYOUT.roomStartX,
    doorWidth: 1.45,
    doorHeight: 2.8,
    doorThickness: 0.10,
    maxAngleDeg: 82,
  });
  scene.add(doubleDoor.group);
  builder.finish();

  const baseHouseIntensities = (screenOne.houseLights ?? []).map((l: THREE.PointLight) => l.intensity);

  const setCinemaDimming = (dimmed: boolean) => {
    const factor = dimmed ? 0.06 : 1.0;
    (screenOne.houseLights ?? []).forEach((light: THREE.PointLight, i: number) => {
      light.intensity = (baseHouseIntensities[i] ?? 14) * factor;
    });
  };

  return {
    obstacles: builder.obstacles,
    seatMeshes: builder.seatMeshes,
    screenMesh: screenOne.curvedScreenMesh,
    curvedScreenMesh: screenOne.curvedScreenMesh,
    screenPosition: screenOne.screenPosition,
    screenLight: screenOne.screenLight,
    houseLights: screenOne.houseLights,
    setCinemaDimming,
    updateDoors: (playerPos: THREE.Vector3, delta: number) => doubleDoor.update(playerPos, delta),
    pushDoor: (dir?: number) => doubleDoor.push(dir),
  };
}
