import * as THREE from "three";
import type { VenueBuilder, Vec3 } from "../../venue-types";
import {
  IMAX_LAYOUT,
  getSeatTransform,
  screenRowHeight,
  screenRowRadius,
} from "./layout";

export function buildScreenSeating(builder: VenueBuilder) {
  const { scene, seatMeshes, addBox } = builder;

  // Premium Cinema Materials
  const seatLeatherMat = new THREE.MeshStandardMaterial({
    color: "#181a26",
    roughness: 0.65,
    metalness: 0.1,
  });
  const cushionPillowMat = new THREE.MeshStandardMaterial({
    color: "#1f2334",
    roughness: 0.55,
    metalness: 0.08,
  });
  const armrestMat = new THREE.MeshStandardMaterial({
    color: "#222530",
    metalness: 0.5,
    roughness: 0.4,
  });
  const metalFrameMat = new THREE.MeshStandardMaterial({
    color: "#141620",
    metalness: 0.8,
    roughness: 0.3,
  });
  const cupHolderMat = new THREE.MeshStandardMaterial({
    color: "#0a0c14",
    metalness: 0.6,
    roughness: 0.3,
  });

  const {
    rowCount,
    banks,
    seatPlatformThickness: platThick,
    baseFloorY,
    roomStartX,
    roomHalfWidth,
    centerAisleWidth,
    seatingFocalX,
  } = IMAX_LAYOUT;

  // =========================================================================
  // 1. WATERTIGHT CONCENTRIC CURVED STADIUM TIERS
  // =========================================================================
  for (let r = 0; r < rowCount; r += 1) {
    const rowY = screenRowHeight(r);
    const radius = screenRowRadius(r);
    const isBackRow = r === rowCount - 1;

    // Platform extends from (radius + 0.45) behind the seats to (radius - 1.35) in front
    const rBack = radius + 0.45;
    const rFront = radius - 1.35;
    const radialDepth = rBack - rFront; // 1.80m
    const rMid = (rBack + rFront) / 2; // radius - 0.45m

    for (const side of [-1, 1]) {
      const bankName = side > 0 ? "r" : "l";
      const minZ = (centerAisleWidth / 2) * side;
      const maxZ = (roomHalfWidth - 0.3) * side;

      const minAngle = Math.asin(minZ / rMid);
      const maxAngle = Math.asin(maxZ / rMid);

      const startAngle = Math.min(minAngle, maxAngle);
      const endAngle = Math.max(minAngle, maxAngle);
      const segCount = 14;
      const angleStep = (endAngle - startAngle) / segCount;

      for (let s = 0; s < segCount; s += 1) {
        const segAngle = startAngle + (s + 0.5) * angleStep;
        const segZ = rMid * Math.sin(segAngle);
        const segX = seatingFocalX - rMid * Math.cos(segAngle);

        const segArcWidth = rMid * angleStep + 0.12; // Overlap prevents any micro gaps

        // If back row, extend platform back to meet the rear entrance wall/concourse
        const actualDepth = isBackRow ? Math.max(radialDepth, segX - roomStartX) : radialDepth;
        const actualCenterX = isBackRow ? (segX + (radialDepth / 2) + roomStartX) / 2 : segX;

        // Curved Tier Floor Platform
        addBox(
          `imax-tier-${r}-${bankName}-${s}`,
          [actualDepth + 0.04, platThick, segArcWidth],
          [actualCenterX, rowY - platThick / 2, segZ],
          "#111420",
          { solid: true, rotation: [0, segAngle, 0] },
        );

        // Solid Subfloor Foundation Beneath Tier (Eliminates all drop-through voids)
        const fillHeight = rowY - platThick - baseFloorY;
        if (fillHeight > 0.05) {
          addBox(
            `imax-tier-fill-${r}-${bankName}-${s}`,
            [actualDepth, fillHeight, segArcWidth],
            [actualCenterX, baseFloorY + fillHeight / 2, segZ],
            "#0c0e16",
            { solid: true, rotation: [0, segAngle, 0] },
          );
        }

        // Dark Luxury Carpet Runner
        addBox(
          `imax-tier-carpet-${r}-${bankName}-${s}`,
          [actualDepth - 0.04, 0.02, segArcWidth - 0.02],
          [actualCenterX, rowY + 0.01, segZ],
          "#161928",
          { rotation: [0, segAngle, 0] },
        );

        // Tier Front Nose Blue Safety LED Strip
        const noseX = seatingFocalX - rFront * Math.cos(segAngle);
        const noseZ = rFront * Math.sin(segAngle);
        addBox(
          `imax-step-led-${r}-${bankName}-${s}`,
          [0.04, 0.025, segArcWidth - 0.02],
          [noseX, rowY + 0.015, noseZ],
          "#00b4ff",
          { emissive: "#0066cc", rotation: [0, segAngle, 0] },
        );
      }
    }

    // =======================================================================
    // 2. LUXURY VIP CINEMA RECLINERS (14 Left + 14 Right = 28 per row x 10 = 280 Seats!)
    // =======================================================================
    for (let bIndex = 0; bIndex < banks.length; bIndex += 1) {
      const bank = banks[bIndex];
      for (let sIndex = 0; sIndex < bank.seatCount; sIndex += 1) {
        const { x, y, z, rotationY } = getSeatTransform(r, bIndex, sIndex);
        const seatId = `seat-r${r + 1}-${bank.code}-${sIndex + 1}`;

        const seatGroup = new THREE.Group();
        seatGroup.position.set(x, y, z);
        seatGroup.rotation.y = rotationY;
        seatGroup.userData.seatId = seatId;

        const addSeatPart = (
          geom: THREE.BufferGeometry,
          mat: THREE.Material,
          pos: Vec3,
          name: string,
        ) => {
          const mesh = new THREE.Mesh(geom, mat);
          mesh.name = name;
          mesh.position.set(...pos);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.userData.seatId = seatId;
          seatGroup.add(mesh);
          seatMeshes.push(mesh);
        };

        // Realistic Cinema Cushion
        addSeatPart(
          new THREE.BoxGeometry(0.50, 0.12, 0.52),
          seatLeatherMat,
          [0.02, 0.38, 0],
          "seat-cushion",
        );

        // Ergonomic Contoured Backrest
        addSeatPart(
          new THREE.BoxGeometry(0.12, 0.56, 0.50),
          seatLeatherMat,
          [-0.20, 0.68, 0],
          "seat-back",
        );

        // Contoured Headrest Pillow
        addSeatPart(
          new THREE.BoxGeometry(0.14, 0.18, 0.44),
          cushionPillowMat,
          [-0.22, 1.01, 0],
          "seat-headrest",
        );

        // Dual Padded Armrests with integrated cup holders
        for (const armSide of [-1, 1]) {
          const armZ = armSide * 0.29;
          addSeatPart(
            new THREE.BoxGeometry(0.40, 0.20, 0.06),
            metalFrameMat,
            [0.02, 0.46, armZ],
            "seat-arm-body",
          );
          addSeatPart(
            new THREE.BoxGeometry(0.42, 0.05, 0.08),
            armrestMat,
            [0.02, 0.58, armZ],
            "seat-arm-pad",
          );

          const cup = new THREE.Mesh(
            new THREE.CylinderGeometry(0.035, 0.03, 0.07, 16),
            cupHolderMat,
          );
          cup.position.set(0.16, 0.60, armZ);
          cup.userData.seatId = seatId;
          seatGroup.add(cup);
          seatMeshes.push(cup);
        }

        // Heavy-duty pedestal mount
        const pedestal = new THREE.Mesh(
          new THREE.BoxGeometry(0.16, 0.30, 0.20),
          metalFrameMat,
        );
        pedestal.position.set(-0.06, 0.15, 0);
        pedestal.userData.seatId = seatId;
        seatGroup.add(pedestal);
        seatMeshes.push(pedestal);

        scene.add(seatGroup);
      }
    }
  }
}
