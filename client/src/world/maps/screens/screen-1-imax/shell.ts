import type * as THREE from "three";
import type { VenueBuilder } from "../../venue-types";
import { IMAX_LAYOUT } from "./layout";

export interface ShellResult {
  houseLights: THREE.PointLight[];
}

export function buildScreenShell({ addBox, addLight }: VenueBuilder): ShellResult {
  const roomWidth = IMAX_LAYOUT.roomHalfWidth * 2; // 27.0m
  const roomLength = IMAX_LAYOUT.roomLength; // 26.0m
  const roomCenterX = (IMAX_LAYOUT.roomStartX + IMAX_LAYOUT.roomEndX) / 2; // 15.2m
  const ceilingY = IMAX_LAYOUT.ceilingHeight; // 11.5m
  const baseFloorY = IMAX_LAYOUT.baseFloorY; // -2.0m
  const totalWallHeight = ceilingY - baseFloorY; // 13.5m
  const wallCenterY = (ceilingY + baseFloorY) / 2; // 4.75m
  const houseLights: THREE.PointLight[] = [];

  // 1. Structural Subfloor Base
  addBox("screen-1-base-floor", [roomLength, 0.4, roomWidth], [roomCenterX, baseFloorY - 0.2, 0], "#0c0d14", { solid: true });

  // 2. Enclosing Acoustic Walls
  addBox("screen-1-east-wall", [0.4, totalWallHeight, roomWidth], [IMAX_LAYOUT.roomEndX, wallCenterY, 0], "#090a10", { solid: true });
  addBox("screen-1-north-wall", [roomLength, totalWallHeight, 0.4], [roomCenterX, wallCenterY, IMAX_LAYOUT.roomHalfWidth + 0.2], "#0e1017", { solid: true });
  addBox("screen-1-south-wall", [roomLength, totalWallHeight, 0.4], [roomCenterX, wallCenterY, -IMAX_LAYOUT.roomHalfWidth - 0.2], "#0e1017", { solid: true });

  // 3. West Wall Interface with Double Door Entrance Portal (X = 2.2m)
  const westX = IMAX_LAYOUT.roomStartX; // 2.2m
  const doorwayWidth = 3.0; // 3.0m double door opening in center
  const flankWidth = (roomWidth - doorwayWidth) / 2; // 12.0m each side

  // Foundation wall below lobby floor (from Y=-2.0 to Y=0) across full width
  addBox("screen-1-west-subwall", [0.4, -baseFloorY, roomWidth], [westX, baseFloorY / 2, 0], "#0b0d13", { solid: true });

  // Upper west wall from Y=3.6 to ceiling across full width
  const upperWallHeight = ceilingY - 3.6;
  addBox("screen-1-west-upper-wall", [0.4, upperWallHeight, roomWidth], [westX, 3.6 + upperWallHeight / 2, 0], "#0c0e15", { solid: true });

  // Lower west wall flanks on either side of the double door opening
  const flankCenterZ = doorwayWidth / 2 + flankWidth / 2;
  addBox("screen-1-west-flank-l", [0.4, 3.6, flankWidth], [westX, 1.8, -flankCenterZ], "#0d0f16", { solid: true });
  addBox("screen-1-west-flank-r", [0.4, 3.6, flankWidth], [westX, 1.8, flankCenterZ], "#0d0f16", { solid: true });

  // 4. Ceiling
  addBox("screen-1-ceiling", [roomLength, 0.5, roomWidth], [roomCenterX, ceilingY, 0], "#07080d");

  // 5. Controllable Architectural House Lights
  houseLights.push(addLight([8, 10.0, 0], "#d8e6ff", 70, 24));
  houseLights.push(addLight([15, 10.0, 0], "#d8e6ff", 85, 26));
  houseLights.push(addLight([22, 9.5, 0], "#cce0ff", 85, 26));

  // Sidewall wash lights
  houseLights.push(addLight([12, 8.5, -6], "#d0e4ff", 60, 20));
  houseLights.push(addLight([12, 8.5, 6], "#d0e4ff", 60, 20));
  houseLights.push(addLight([20, 8.0, -6], "#c8e0ff", 55, 18));
  houseLights.push(addLight([20, 8.0, 6], "#c8e0ff", 55, 18));

  // 6. 3D Angled Acoustic Baffle Panels along sidewalls
  for (const x of [6, 11, 16, 21, 26]) {
    for (const side of [-1, 1]) {
      const z = side * (IMAX_LAYOUT.roomHalfWidth - 0.2);
      // Charcoal acoustic sound-absorption panel
      addBox(`wall-acoustic-panel-${x}-${side}`, [2.6, 7.5, 0.2], [x, 5.5, z], "#141724");
      // Vertical electric blue architectural LED fin
      addBox(`wall-acoustic-fin-${x}-${side}`, [0.12, 7.0, 0.06], [x, 5.5, z - side * 0.14], "#00a2ff", {
        emissive: "#0055cc",
      });
      // Lower wall wash runner
      addBox(`wall-base-runner-${x}-${side}`, [2.6, 0.06, 0.05], [x, 1.2, z - side * 0.12], "#00e5ff", {
        emissive: "#0066cc",
      });
    }
  }

  // Sidewall cove runner
  for (const side of [-1, 1]) {
    const z = side * (IMAX_LAYOUT.roomHalfWidth - 0.4);
    addBox(`sidewall-cove-shelf-${side}`, [roomLength - 2, 0.15, 0.3], [roomCenterX, 2.2, z], "#12141e");
    addBox(`sidewall-cove-led-${side}`, [roomLength - 2.2, 0.04, 0.05], [roomCenterX, 2.3, z], "#0088ff", {
      emissive: "#0044aa",
    });
  }

  // Ceiling Starry Downlights and Acoustic Baffles
  for (const x of [6, 12, 18, 24]) {
    addBox(`ceiling-acoustic-baffle-${x}`, [0.25, 0.2, roomWidth - 3], [x, ceilingY - 0.25, 0], "#12141f");
    for (const z of [-9, -4.5, 4.5, 9]) {
      addBox(`ceiling-star-light-${x}-${z}`, [0.1, 0.05, 0.1], [x, ceilingY - 0.35, z], "#d8f0ff", {
        emissive: "#6cb0e8",
      });
    }
  }

  return { houseLights };
}
