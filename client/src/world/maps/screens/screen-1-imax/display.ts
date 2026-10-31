import * as THREE from "three";
import type { VenueBuilder, Vec3 } from "../../venue-types";
import { IMAX_LAYOUT, screenHalfAngle } from "./layout";

export interface ScreenDisplayResult {
  curvedScreenMesh: THREE.Mesh;
  screenMesh: THREE.Mesh;
  screenPosition: Vec3;
  screenLight: THREE.PointLight;
}

export function buildScreenDisplay({ scene, addBox }: VenueBuilder): ScreenDisplayResult {
  const {
    screenWidth,
    screenHeight,
    screenRadius: R,
    screenCenterY,
    screenCircleCenterX,
  } = IMAX_LAYOUT;

  const halfAngle = screenHalfAngle();

  // 1. TOWERING WALL-TO-WALL CURVED IMAX SCREEN (24m Wide x 11m Tall in 27m Room)
  const screenGeom = new THREE.CylinderGeometry(
    R,
    R,
    screenHeight,
    128,
    1,
    true,
    -halfAngle,
    halfAngle * 2,
  );
  screenGeom.rotateY(Math.PI / 2);

  // Remap UV coordinates so video texture projects perfectly without mirroring
  const uvs = screenGeom.attributes.uv;
  for (let i = 0; i < uvs.count; i += 1) {
    uvs.setX(i, 1 - uvs.getX(i));
  }
  uvs.needsUpdate = true;
  screenGeom.computeVertexNormals();

  const curvedScreenMaterial = new THREE.MeshBasicMaterial({
    color: "#080a10",
    side: THREE.DoubleSide,
  });

  const curvedScreenMesh = new THREE.Mesh(screenGeom, curvedScreenMaterial);
  curvedScreenMesh.name = "imax-curved-screen";
  curvedScreenMesh.position.set(screenCircleCenterX, screenCenterY, 0);
  scene.add(curvedScreenMesh);

  // 2. CONCENTRIC CURVED SCREEN BORDERS & BIAS LIGHTING (Top & Bottom)
  const borderMat = new THREE.MeshStandardMaterial({
    color: "#090b10",
    metalness: 0.85,
    roughness: 0.25,
    side: THREE.DoubleSide,
  });

  const ledMat = new THREE.MeshStandardMaterial({
    color: "#00a2ff",
    emissive: "#0055cc",
    emissiveIntensity: 1.8,
    roughness: 0.2,
    side: THREE.DoubleSide,
  });

  // Top curved border strip
  const topBorderGeom = new THREE.CylinderGeometry(
    R - 0.02,
    R - 0.02,
    0.25,
    128,
    1,
    true,
    -halfAngle * 1.01,
    halfAngle * 2.02,
  );
  topBorderGeom.rotateY(Math.PI / 2);
  const topBorder = new THREE.Mesh(topBorderGeom, borderMat);
  topBorder.position.set(screenCircleCenterX, screenCenterY + screenHeight / 2 + 0.125, 0);
  scene.add(topBorder);

  // Top curved LED backlight
  const topLedGeom = new THREE.CylinderGeometry(
    R - 0.04,
    R - 0.04,
    0.04,
    128,
    1,
    true,
    -halfAngle * 1.01,
    halfAngle * 2.02,
  );
  topLedGeom.rotateY(Math.PI / 2);
  const topLed = new THREE.Mesh(topLedGeom, ledMat);
  topLed.position.set(screenCircleCenterX, screenCenterY + screenHeight / 2 + 0.02, 0);
  scene.add(topLed);

  // Bottom curved border strip
  const botBorderGeom = new THREE.CylinderGeometry(
    R - 0.02,
    R - 0.02,
    0.25,
    128,
    1,
    true,
    -halfAngle * 1.01,
    halfAngle * 2.02,
  );
  botBorderGeom.rotateY(Math.PI / 2);
  const botBorder = new THREE.Mesh(botBorderGeom, borderMat);
  botBorder.position.set(screenCircleCenterX, screenCenterY - screenHeight / 2 - 0.125, 0);
  scene.add(botBorder);

  // Bottom curved LED backlight
  const botLedGeom = new THREE.CylinderGeometry(
    R - 0.04,
    R - 0.04,
    0.04,
    128,
    1,
    true,
    -halfAngle * 1.01,
    halfAngle * 2.02,
  );
  botLedGeom.rotateY(Math.PI / 2);
  const botLed = new THREE.Mesh(botLedGeom, ledMat);
  botLed.position.set(screenCircleCenterX, screenCenterY - screenHeight / 2 - 0.02, 0);
  scene.add(botLed);

  // 3. CURVED FRONT STAGE PLATFORM
  const stageR = R - 0.8;
  const stageArcHalfAngle = halfAngle * 1.02;
  const stageApronGeom = new THREE.CylinderGeometry(
    stageR,
    stageR,
    0.45,
    96,
    1,
    true,
    -stageArcHalfAngle,
    stageArcHalfAngle * 2,
  );
  stageApronGeom.rotateY(Math.PI / 2);
  const stageApronMat = new THREE.MeshStandardMaterial({
    color: "#0b0d14",
    roughness: 0.8,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });
  const stageApron = new THREE.Mesh(stageApronGeom, stageApronMat);
  stageApron.position.set(screenCircleCenterX, -1.22, 0); // Stage top at Y = -0.995m
  scene.add(stageApron);

  // Stage Edge LED runner
  const stageEdgeLedGeom = new THREE.CylinderGeometry(
    stageR - 0.03,
    stageR - 0.03,
    0.03,
    96,
    1,
    true,
    -stageArcHalfAngle,
    stageArcHalfAngle * 2,
  );
  stageEdgeLedGeom.rotateY(Math.PI / 2);
  const stageEdgeLed = new THREE.Mesh(stageEdgeLedGeom, ledMat);
  stageEdgeLed.position.set(screenCircleCenterX, -0.99, 0);
  scene.add(stageEdgeLed);

  // 4. ACOUSTIC SUB-BASS SPEAKER TOWERS FLANKING SCREEN WINGS
  for (const side of [-1, 1]) {
    const z = side * (screenWidth / 2 + 0.9);
    const x = screenCircleCenterX + Math.cos(halfAngle) * R;
    addBox(
      `imax-stage-speaker-tower-${side > 0 ? "r" : "l"}`,
      [1.2, screenHeight * 0.7, 1.4],
      [x, screenCenterY, z],
      "#090a10",
      { solid: true },
    );
    for (const y of [1.5, 4.5, 7.5]) {
      const cone = new THREE.Mesh(
        new THREE.CylinderGeometry(0.38, 0.32, 0.14, 20),
        new THREE.MeshStandardMaterial({ color: "#161928", metalness: 0.4, roughness: 0.5 }),
      );
      cone.position.set(x - 0.65, y, z);
      cone.rotation.z = Math.PI / 2;
      scene.add(cone);
    }
  }

  // 5. AMBILIGHT PROJECTION LIGHT
  const screenLight = new THREE.PointLight("#0088ff", 0.0, 45, 1.4);
  screenLight.name = "screen-ambilight";
  screenLight.position.set(25.5, screenCenterY, 0);
  scene.add(screenLight);

  const screenPosition: Vec3 = [IMAX_LAYOUT.screenBaseX - 1.0, screenCenterY, 0];
  return {
    curvedScreenMesh,
    screenMesh: curvedScreenMesh,
    screenPosition,
    screenLight,
  };
}
