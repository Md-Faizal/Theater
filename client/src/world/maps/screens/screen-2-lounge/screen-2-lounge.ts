import * as THREE from "three";
import type { VenueBuilder, Vec3 } from "../../venue-types";
import { SCREEN_TWO_LAYOUT } from "./layout";

export interface ScreenTwoResult {
  curvedScreenMesh: THREE.Mesh;
  screenMesh: THREE.Mesh;
  screenPosition: Vec3;
  screenLight: THREE.PointLight;
  houseLights: THREE.PointLight[];
}

export function buildScreenTwoLounge(builder: VenueBuilder, sharedVideoMaterial?: THREE.Material | THREE.Material[]): ScreenTwoResult {
  const { scene, addBox, addLight, seatMeshes } = builder;
  const layout = SCREEN_TWO_LAYOUT;
  const cz = layout.centerZ; // -23.0

  // ---------------------------------------------------------------------------
  // Luxury Palette & Materials
  // ---------------------------------------------------------------------------
  const carpetDark = "#12141c";
  const carpetSunken = "#0c0e14";
  const walnutWood = "#2e1a12";
  const acousticFelt = "#0a0b0e";
  const marbleNero = "#07080a";
  const brassGold = "#d4af37";
  const velvetSlate = "#141724";
  const velvetEmerald = "#0a2618";
  const leatherCognac = "#5c2e14";
  const velvetAmber = "#703e0a";
  const ledWarm = "#ffb050";
  const ledCove = "#ffd285";
  const ledBias = "#00d0ff";
  const starlightWhite = "#eaf4ff";

  // Shared Seat Cushion Material
  const cushionVelvetMat = new THREE.MeshStandardMaterial({
    color: velvetSlate,
    roughness: 0.75,
    metalness: 0.1,
  });

  const backrestVelvetMat = new THREE.MeshStandardMaterial({
    color: "#181c2c",
    roughness: 0.7,
    metalness: 0.08,
  });

  const pillowEmeraldMat = new THREE.MeshStandardMaterial({
    color: velvetEmerald,
    roughness: 0.65,
    metalness: 0.12,
  });

  const pillowCognacMat = new THREE.MeshStandardMaterial({
    color: leatherCognac,
    roughness: 0.5,
    metalness: 0.15,
  });

  const pillowAmberMat = new THREE.MeshStandardMaterial({
    color: velvetAmber,
    roughness: 0.6,
    metalness: 0.1,
  });

  const houseLights: THREE.PointLight[] = [];

  // ===========================================================================
  // 1. ROOM ENCLOSURE SHELL (Acoustic Felt Walls & Ceiling)
  // ===========================================================================
  const totalLength = layout.roomEndX - layout.roomStartX; // 19.6m
  const totalWidth = layout.halfWidth * 2; // 17.0m
  const roomMidX = (layout.roomStartX + layout.roomEndX) / 2; // 12.0m

  // North Demising Wall (Z = -14.5, separating Screen 1 from Screen 2)
  addBox("s2-wall-north", [totalLength + 0.4, layout.ceilingHeight, 0.6], [roomMidX, layout.ceilingHeight / 2, cz + layout.halfWidth], acousticFelt, { solid: true });
  // South Exterior Wall (Z = -31.5)
  addBox("s2-wall-south", [totalLength + 0.4, layout.ceilingHeight, 0.6], [roomMidX, layout.ceilingHeight / 2, cz - layout.halfWidth], acousticFelt, { solid: true });
  // East Screen Wall (X = 21.8)
  addBox("s2-wall-east", [0.6, layout.ceilingHeight, totalWidth + 0.4], [layout.roomEndX, layout.ceilingHeight / 2, cz], acousticFelt, { solid: true });
  // West Entrance Wall (X = 2.2) flanking the 3.6m portal
  const portalHalfW = layout.portalWidth / 2; // 1.8m
  const westWallTopZ = cz + layout.halfWidth; // -14.5
  const westWallBotZ = cz - layout.halfWidth; // -31.5
  // North portion of West wall
  const northWLen = westWallTopZ - (cz + portalHalfW); // 6.7m
  addBox("s2-wall-west-n", [0.6, layout.ceilingHeight, northWLen], [layout.roomStartX, layout.ceilingHeight / 2, cz + portalHalfW + northWLen / 2], acousticFelt, { solid: true });
  // South portion of West wall
  const southWLen = (cz - portalHalfW) - westWallBotZ; // 6.7m
  addBox("s2-wall-west-s", [0.6, layout.ceilingHeight, southWLen], [layout.roomStartX, layout.ceilingHeight / 2, cz - portalHalfW - southWLen / 2], acousticFelt, { solid: true });
  // Header above entrance portal (Y = 3.2 to 5.4)
  addBox("s2-wall-west-header", [0.6, layout.ceilingHeight - layout.portalHeight, layout.portalWidth], [layout.roomStartX, layout.portalHeight + (layout.ceilingHeight - layout.portalHeight) / 2, cz], acousticFelt, { solid: true });

  // Main Ceiling Slab
  addBox("s2-ceiling", [totalLength, 0.4, totalWidth], [roomMidX, layout.ceilingHeight + 0.2, cz], acousticFelt, { solid: true });

  // ===========================================================================
  // 2. TIERED FLOORING & SUNKEN CONVERSATION PIT
  // ===========================================================================
  // Subfloor Foundation
  addBox("s2-subfloor", [totalLength + 2, 0.4, totalWidth + 2], [roomMidX, -0.6, cz], "#0a0a0c", { solid: true });

  // Tier 3 Rear VIP Platform (X: 2.2 to 6.8, Y = +0.50)
  const t3Len = layout.tierThreeEndX - layout.roomStartX; // 4.6m
  const t3MidX = (layout.roomStartX + layout.tierThreeEndX) / 2; // 4.5m
  addBox("s2-floor-t3", [t3Len, 0.50, totalWidth - 0.2], [t3MidX, 0.25, cz], carpetDark, { solid: true });
  // T3 Step Nosing LED Strip
  addBox("s2-step-t3-led", [0.06, 0.04, totalWidth - 0.4], [layout.tierThreeEndX, 0.49, cz], ledWarm, {
    emissive: ledWarm,
    emissiveIntensity: 2.2,
  });

  // Tier 2 Platform (X: 6.8 to 11.2, Y = +0.25)
  const t2Len = layout.tierTwoEndX - layout.tierTwoStartX; // 4.2m
  const t2MidX = (layout.tierTwoStartX + layout.tierTwoEndX) / 2; // 8.9m
  addBox("s2-floor-t2", [t2Len, 0.25, totalWidth - 0.2], [t2MidX, 0.125, cz], carpetDark, { solid: true });
  // T2 Step Nosing LED Strip
  addBox("s2-step-t2-led", [0.06, 0.04, totalWidth - 0.4], [layout.tierTwoEndX, 0.24, cz], ledWarm, {
    emissive: ledWarm,
    emissiveIntensity: 2.2,
  });

  // Tier 1 Level Floor Surrounding Sunken Pit (Y = 0.0)
  // Left wing (North of pit: Z from cz + pitHalfWidth to cz + halfWidth)
  const wingWidth = layout.halfWidth - layout.pitHalfWidth; // 4.0m
  addBox("s2-floor-t1-north", [8.5, 0.4, wingWidth], [15.5, -0.2, cz + layout.pitHalfWidth + wingWidth / 2], carpetDark, { solid: true });
  // Right wing (South of pit: Z from cz - halfWidth to cz - pitHalfWidth)
  addBox("s2-floor-t1-south", [8.5, 0.4, wingWidth], [15.5, -0.2, cz - layout.pitHalfWidth - wingWidth / 2], carpetDark, { solid: true });
  // Front apron between pit and screen (X: 18.0 to 21.6)
  addBox("s2-floor-t1-front", [3.6, 0.4, totalWidth - 0.2], [19.8, -0.2, cz], carpetDark, { solid: true });

  // Sunken Pit Floor (X: 11.8 to 17.8, Z: cz ± 4.5, Y = -0.40)
  const pitMidX = (layout.pitStartX + layout.pitEndX) / 2; // 14.8m
  const pitLen = layout.pitEndX - layout.pitStartX; // 6.0m
  const pitWid = layout.pitHalfWidth * 2; // 9.0m
  addBox("s2-pit-carpet", [pitLen, 0.04, pitWid], [pitMidX, layout.pitFloorY + 0.02, cz], carpetSunken, {
    roughness: 0.95,
  });

  // Sunken Pit Perimeter Walnut Edge & LED Contour Lights
  // West edge of pit
  addBox("s2-pit-edge-w", [0.12, 0.42, pitWid], [layout.pitStartX, -0.2, cz], walnutWood, { solid: true });
  addBox("s2-pit-led-w", [0.04, 0.04, pitWid - 0.2], [layout.pitStartX + 0.06, -0.01, cz], ledWarm, {
    emissive: ledWarm,
    emissiveIntensity: 2.5,
  });
  // East edge of pit
  addBox("s2-pit-edge-e", [0.12, 0.42, pitWid], [layout.pitEndX, -0.2, cz], walnutWood, { solid: true });
  addBox("s2-pit-led-e", [0.04, 0.04, pitWid - 0.2], [layout.pitEndX - 0.06, -0.01, cz], ledWarm, {
    emissive: ledWarm,
    emissiveIntensity: 2.5,
  });
  // North edge of pit
  addBox("s2-pit-edge-n", [pitLen, 0.42, 0.12], [pitMidX, -0.2, cz + layout.pitHalfWidth], walnutWood, { solid: true });
  addBox("s2-pit-led-n", [pitLen - 0.2, 0.04, 0.04], [pitMidX, -0.01, cz + layout.pitHalfWidth - 0.06], ledWarm, {
    emissive: ledWarm,
    emissiveIntensity: 2.5,
  });
  // South edge of pit
  addBox("s2-pit-edge-s", [pitLen, 0.42, 0.12], [pitMidX, -0.2, cz - layout.pitHalfWidth], walnutWood, { solid: true });
  addBox("s2-pit-led-s", [pitLen - 0.2, 0.04, 0.04], [pitMidX, -0.01, cz - layout.pitHalfWidth + 0.06], ledWarm, {
    emissive: ledWarm,
    emissiveIntensity: 2.5,
  });

  // ===========================================================================
  // 3. PLUSH MODULAR LOW SEATING IN SUNKEN PIT (Interactive Seats)
  // ===========================================================================
  // Helper to add interactive seat module
  const addInteractiveSeat = (
    seatId: string,
    pos: Vec3,
    rotY: number,
    cushionSize: [number, number, number],
    hasBackrest = true,
  ) => {
    const seatGroup = new THREE.Group();
    seatGroup.position.set(...pos);
    seatGroup.rotation.y = rotY;
    seatGroup.userData.seatId = seatId;

    // Plinth Base (Walnut)
    const baseMesh = new THREE.Mesh(
      new THREE.BoxGeometry(cushionSize[0], 0.10, cushionSize[2]),
      new THREE.MeshStandardMaterial({ color: walnutWood, roughness: 0.4 }),
    );
    baseMesh.position.set(0, 0.05, 0);
    seatGroup.add(baseMesh);

    // Thick Plush Velvet Cushion
    const cushionMesh = new THREE.Mesh(
      new THREE.BoxGeometry(cushionSize[0] - 0.04, cushionSize[1], cushionSize[2] - 0.04),
      cushionVelvetMat,
    );
    cushionMesh.position.set(0, 0.10 + cushionSize[1] / 2, 0);
    cushionMesh.userData.seatId = seatId;
    seatGroup.add(cushionMesh);
    seatMeshes.push(cushionMesh);

    // Angled Backrest
    if (hasBackrest) {
      const backMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.20, 0.38, cushionSize[2] - 0.04),
        backrestVelvetMat,
      );
      backMesh.position.set(-cushionSize[0] / 2 + 0.10, 0.10 + cushionSize[1] + 0.18, 0);
      backMesh.rotation.z = 0.14; // Gentle recline
      backMesh.userData.seatId = seatId;
      seatGroup.add(backMesh);
      seatMeshes.push(backMesh);
    }

    scene.add(seatGroup);

    // Add solid collision for seat unit
    builder.addObstacle([cushionSize[0], 0.45, cushionSize[2]], [pos[0], pos[1] + 0.22, pos[2]]);
    return seatGroup;
  };

  // U-Shaped Pit Seating Configuration:
  // A. Rear Section facing Screen (X = 12.8m, Z spanning from cz - 3.2 to cz + 3.2)
  const rearSeatZs = [-2.4, -0.8, 0.8, 2.4];
  for (let i = 0; i < rearSeatZs.length; i++) {
    const sId = `s2-pit-rear-${i + 1}`;
    addInteractiveSeat(
      sId,
      [12.8, layout.pitFloorY, cz + rearSeatZs[i]],
      0, // Facing East (+X) toward screen
      [1.1, 0.26, 1.4],
      true,
    );
    // Accent throw pillows on rear cushions
    const pMat = i % 3 === 0 ? pillowEmeraldMat : i % 3 === 1 ? pillowCognacMat : pillowAmberMat;
    const pMesh = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.14, 0.38), pMat);
    pMesh.position.set(12.6, layout.pitFloorY + 0.42, cz + rearSeatZs[i] + (i % 2 === 0 ? 0.25 : -0.25));
    pMesh.rotation.set(0.2, 0.15 * (i % 2 === 0 ? 1 : -1), 0.3);
    scene.add(pMesh);
  }

  // B. North Lounge Wing (Z = cz + 3.4, X from 13.8 to 17.0, facing South -Z)
  for (let i = 0; i < 3; i++) {
    const sx = 14.0 + i * 1.15;
    const sId = `s2-pit-north-${i + 1}`;
    addInteractiveSeat(
      sId,
      [sx, layout.pitFloorY, cz + 3.4],
      Math.PI / 2, // Facing South (-Z)
      [1.1, 0.26, 1.15],
      true,
    );
    // Pillow
    const pMesh = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.14, 0.36), i === 1 ? pillowCognacMat : pillowEmeraldMat);
    pMesh.position.set(sx, layout.pitFloorY + 0.42, cz + 3.65);
    pMesh.rotation.set(-0.25, 0.3, 0);
    scene.add(pMesh);
  }

  // C. South Lounge Wing (Z = cz - 3.4, X from 13.8 to 17.0, facing North +Z)
  for (let i = 0; i < 3; i++) {
    const sx = 14.0 + i * 1.15;
    const sId = `s2-pit-south-${i + 1}`;
    addInteractiveSeat(
      sId,
      [sx, layout.pitFloorY, cz - 3.4],
      -Math.PI / 2, // Facing North (+Z)
      [1.1, 0.26, 1.15],
      true,
    );
    // Pillow
    const pMesh = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.14, 0.36), i === 0 ? pillowAmberMat : pillowCognacMat);
    pMesh.position.set(sx, layout.pitFloorY + 0.42, cz - 3.65);
    pMesh.rotation.set(0.25, -0.3, 0);
    scene.add(pMesh);
  }

  // ===========================================================================
  // 4. LOW NERO MARQUINA MARBLE TABLE & LUXURY REFRESHMENTS
  // ===========================================================================
  const tableX = 15.0;
  const tableZ = cz;
  const tableTopY = layout.pitFloorY + 0.22; // Very low coffee table (~0.22m high)

  // Polished Black Nero Marquina Marble Slab
  addBox("s2-marble-table-top", [1.8, 0.06, 1.1], [tableX, tableTopY, tableZ], marbleNero, {
    roughness: 0.1,
    metalness: 0.1,
    solid: true,
  });
  // Recessed Brushed Brass Plinth Base
  addBox("s2-marble-table-base", [1.5, 0.16, 0.8], [tableX, layout.pitFloorY + 0.08, tableZ], brassGold, {
    metalness: 0.85,
    roughness: 0.25,
    solid: true,
  });

  // Brushed Brass Serving Tray on Marble Table
  addBox("s2-brass-tray", [0.55, 0.02, 0.4], [tableX - 0.35, tableTopY + 0.04, tableZ], brassGold, {
    metalness: 0.9,
    roughness: 0.2,
  });

  // Faceted Crystal Whiskey Decanter
  addBox("s2-whiskey-decanter", [0.12, 0.18, 0.12], [tableX - 0.42, tableTopY + 0.14, tableZ + 0.08], "#e0f2fe", {
    roughness: 0.05,
    metalness: 0.05,
  });
  // Golden Amber Liquid Core
  addBox("s2-whiskey-amber", [0.10, 0.12, 0.10], [tableX - 0.42, tableTopY + 0.11, tableZ + 0.08], "#f59e0b", {
    emissive: "#b45309",
    emissiveIntensity: 0.8,
  });
  // Crystal Tumbler Glasses
  addBox("s2-tumbler-1", [0.08, 0.09, 0.08], [tableX - 0.25, tableTopY + 0.09, tableZ - 0.08], "#e0f2fe");
  addBox("s2-tumbler-2", [0.08, 0.09, 0.08], [tableX - 0.25, tableTopY + 0.09, tableZ + 0.08], "#e0f2fe");

  // Cordless Brushed Brass Mushroom Table Lamp
  addBox("s2-table-lamp-stem", [0.04, 0.18, 0.04], [tableX + 0.45, tableTopY + 0.10, tableZ], brassGold, { metalness: 0.9 });
  addBox("s2-table-lamp-dome", [0.26, 0.06, 0.26], [tableX + 0.45, tableTopY + 0.20, tableZ], brassGold, { metalness: 0.9 });
  addBox("s2-table-lamp-emitter", [0.18, 0.02, 0.18], [tableX + 0.45, tableTopY + 0.17, tableZ], ledWarm, {
    emissive: ledWarm,
    emissiveIntensity: 3.0,
  });
  // Localized soft warm pool of light from table lamp
  const lampLight = addLight([tableX + 0.45, tableTopY + 0.25, tableZ], "#ffb74d", 12.0, 3.5);
  houseLights.push(lampLight);

  // ===========================================================================
  // 5. TIER 2 LOW CHAISES & TIER 3 VIP BANQUETTE
  // ===========================================================================
  // Tier 2 (Platform at Y = 0.25, X = 8.9): Twin Luxury Chaise Lounges
  for (const side of [-1, 1]) {
    const sz = cz + side * 2.2;
    const sId = `s2-t2-chaise-${side > 0 ? "n" : "s"}`;
    addInteractiveSeat(
      sId,
      [8.9, layout.tierTwoFloorY, sz],
      0, // Facing screen
      [1.4, 0.25, 1.8],
      true,
    );
  }
  // Central Walnut & Marble Drink Console between Chaises on Tier 2
  addBox("s2-t2-console-base", [1.1, 0.35, 0.7], [8.9, layout.tierTwoFloorY + 0.18, cz], walnutWood, { solid: true });
  addBox("s2-t2-console-top", [1.15, 0.04, 0.75], [8.9, layout.tierTwoFloorY + 0.37, cz], marbleNero, { solid: true });

  // Tier 3 (Platform at Y = 0.50, X = 4.8): Rear VIP Banquette
  const t3SeatZs = [-3.0, -1.0, 1.0, 3.0];
  for (let i = 0; i < t3SeatZs.length; i++) {
    const sId = `s2-t3-vip-${i + 1}`;
    addInteractiveSeat(
      sId,
      [4.8, layout.tierThreeFloorY, cz + t3SeatZs[i]],
      0,
      [1.1, 0.25, 1.5],
      true,
    );
  }

  // ===========================================================================
  // 6. ACOUSTIC WALNUT FLUTED SLAT WALLS & WARM GRAZING SCONCES
  // ===========================================================================
  const slatSpacing = 0.45;
  const slatCount = Math.floor(totalLength / slatSpacing);
  for (let i = 0; i < slatCount; i++) {
    const sx = layout.roomStartX + 0.3 + i * slatSpacing;
    if (sx > layout.roomEndX - 0.8) continue;
    // North wall slats (Z = cz + halfWidth - 0.1)
    addBox(`s2-slat-n-${i}`, [0.06, layout.ceilingHeight - 0.2, 0.14], [sx, layout.ceilingHeight / 2, cz + layout.halfWidth - 0.12], walnutWood);
    // South wall slats (Z = cz - halfWidth + 0.1)
    addBox(`s2-slat-s-${i}`, [0.06, layout.ceilingHeight - 0.2, 0.14], [sx, layout.ceilingHeight / 2, cz - layout.halfWidth + 0.12], walnutWood);
  }

  // Warm Architectural Sconces Washing Slats
  for (const side of [-1, 1]) {
    const wz = cz + side * (layout.halfWidth - 0.35);
    for (const sx of [6.0, 11.5, 17.0]) {
      addBox(`s2-sconce-body-${sx}-${side}`, [0.12, 0.35, 0.12], [sx, 2.8, wz], brassGold, { metalness: 0.9 });
      addBox(`s2-sconce-emit-top-${sx}-${side}`, [0.08, 0.02, 0.08], [sx, 2.98, wz], ledWarm, { emissive: ledWarm, emissiveIntensity: 2.0 });
      addBox(`s2-sconce-emit-bot-${sx}-${side}`, [0.08, 0.02, 0.08], [sx, 2.62, wz], ledWarm, { emissive: ledWarm, emissiveIntensity: 2.0 });

      const sconceLight = addLight([sx, 2.8, wz], "#ffb74d", 18.0, 4.5);
      houseLights.push(sconceLight);
    }
  }

  // ===========================================================================
  // 7. DROPPED WALNUT SOFFIT & STARLIGHT FIBER-OPTIC TRAY CEILING
  // ===========================================================================
  // Dropped Perimeter Walnut Soffit (Height Y = 5.0 to 5.2)
  const soffitY = 5.1;
  const soffitThick = 0.20;
  // North soffit
  addBox("s2-soffit-n", [totalLength, soffitThick, 1.8], [roomMidX, soffitY, cz + layout.halfWidth - 0.9], walnutWood);
  // South soffit
  addBox("s2-soffit-s", [totalLength, soffitThick, 1.8], [roomMidX, soffitY, cz - layout.halfWidth + 0.9], walnutWood);
  // West soffit
  addBox("s2-soffit-w", [1.8, soffitThick, totalWidth], [layout.roomStartX + 0.9, soffitY, cz], walnutWood);
  // East soffit
  addBox("s2-soffit-e", [1.8, soffitThick, totalWidth], [layout.roomEndX - 0.9, soffitY, cz], walnutWood);

  // Concealed Perimeter Cove LED Strips (Washing Upward & Inward)
  addBox("s2-cove-n", [totalLength - 3.6, 0.04, 0.04], [roomMidX, soffitY + 0.11, cz + layout.halfWidth - 1.8], ledCove, {
    emissive: ledCove,
    emissiveIntensity: 2.5,
  });
  addBox("s2-cove-s", [totalLength - 3.6, 0.04, 0.04], [roomMidX, soffitY + 0.11, cz - layout.halfWidth + 1.8], ledCove, {
    emissive: ledCove,
    emissiveIntensity: 2.5,
  });
  addBox("s2-cove-w", [0.04, 0.04, totalWidth - 3.6], [layout.roomStartX + 1.8, soffitY + 0.11, cz], ledCove, {
    emissive: ledCove,
    emissiveIntensity: 2.5,
  });
  addBox("s2-cove-e", [0.04, 0.04, totalWidth - 3.6], [layout.roomEndX - 1.8, soffitY + 0.11, cz], ledCove, {
    emissive: ledCove,
    emissiveIntensity: 2.5,
  });

  // Fiber-Optic Starlight Ceiling Tray (Recessed at Y = 5.25m)
  const trayLen = totalLength - 4.0;
  const trayWid = totalWidth - 4.0;
  addBox("s2-starlight-tray", [trayLen, 0.04, trayWid], [roomMidX, 5.25, cz], "#050608");

  // Distributed Micro-Star Points across Starlight Tray
  const starGeom = new THREE.BoxGeometry(0.03, 0.02, 0.03);
  const starMat = new THREE.MeshBasicMaterial({ color: starlightWhite });
  const starMeshInst = new THREE.InstancedMesh(starGeom, starMat, 80);
  const dummy = new THREE.Object3D();
  let starIdx = 0;
  for (let xi = 0; xi < 10; xi++) {
    for (let zi = 0; zi < 8; zi++) {
      const sx = layout.roomStartX + 2.5 + (xi / 9) * (trayLen - 1.0) + (Math.sin(xi * 7 + zi * 13) * 0.35);
      const sz = cz - (trayWid / 2 - 0.5) + (zi / 7) * (trayWid - 1.0) + (Math.cos(xi * 11 + zi * 5) * 0.35);
      dummy.position.set(sx, 5.23, sz);
      dummy.updateMatrix();
      starMeshInst.setMatrixAt(starIdx++, dummy.matrix);
    }
  }
  starMeshInst.instanceMatrix.needsUpdate = true;
  scene.add(starMeshInst);

  // ===========================================================================
  // 8. CURVED CINEMASCOPE SCREEN (2.40:1 Panoramic Display)
  // ===========================================================================
  const R = layout.screenRadius; // 18.0m
  const sWidth = layout.screenWidth; // 11.0m
  const sHeight = layout.screenHeight; // 4.5m
  const sHalfAngle = Math.asin(sWidth / (2 * R));

  const screenGeom = new THREE.CylinderGeometry(
    R,
    R,
    sHeight,
    64,
    1,
    true,
    -sHalfAngle,
    sHalfAngle * 2,
  );
  screenGeom.rotateY(Math.PI / 2);

  // Remap UV coordinates so video texture projects cleanly
  const uvs = screenGeom.attributes.uv;
  for (let i = 0; i < uvs.count; i += 1) {
    uvs.setX(i, 1 - uvs.getX(i));
  }
  uvs.needsUpdate = true;
  screenGeom.computeVertexNormals();

  const screenMaterial = sharedVideoMaterial ?? new THREE.MeshBasicMaterial({
    color: "#080a10",
    side: THREE.DoubleSide,
  });

  const curvedScreenMesh = new THREE.Mesh(screenGeom, screenMaterial);
  curvedScreenMesh.name = "screen-two-curved-screen";
  curvedScreenMesh.position.set(layout.screenCircleCenterX, layout.screenCenterY, cz);
  scene.add(curvedScreenMesh);

  // Screen Bezel Trim & Floating Acoustic Soundbar
  addBox("s2-soundbar", [0.22, 0.18, 4.2], [layout.screenBaseX - 0.2, layout.screenCenterY - sHeight / 2 - 0.15, cz], "#14161f", {
    metalness: 0.8,
    roughness: 0.3,
  });

  // Screen Ambient Bias Backlight (Gentle Cyan Halo)
  addBox("s2-screen-bias-top", [0.04, 0.04, sWidth], [layout.screenBaseX - 0.05, layout.screenCenterY + sHeight / 2 + 0.08, cz], ledBias, {
    emissive: ledBias,
    emissiveIntensity: 1.5,
  });
  addBox("s2-screen-bias-bot", [0.04, 0.04, sWidth], [layout.screenBaseX - 0.05, layout.screenCenterY - sHeight / 2 - 0.08, cz], ledBias, {
    emissive: ledBias,
    emissiveIntensity: 1.5,
  });

  // Screen Emissive Area Light bouncing into the room
  const screenLight = addLight([layout.screenBaseX - 1.5, layout.screenCenterY, cz], "#80d0ff", 35.0, 16.0);

  // ===========================================================================
  // 9. GRAND ENTRANCE PORTAL & MALL MARQUEE (West Facade at X = 2.2, Z = -23.0)
  // ===========================================================================
  // Portal Arch Surround
  addBox("s2-portal-trim-top", [0.4, 0.25, layout.portalWidth + 0.6], [layout.portalX - 0.1, layout.portalHeight + 0.12, cz], brassGold, { metalness: 0.9, roughness: 0.2 });
  addBox("s2-portal-trim-l", [0.4, layout.portalHeight, 0.25], [layout.portalX - 0.1, layout.portalHeight / 2, cz + portalHalfW + 0.12], brassGold, { metalness: 0.9 });
  addBox("s2-portal-trim-r", [0.4, layout.portalHeight, 0.25], [layout.portalX - 0.1, layout.portalHeight / 2, cz - portalHalfW - 0.12], brassGold, { metalness: 0.9 });

  // Illuminated Entrance Marquee Sign on Mall Side: "★ SCREEN 2 · THE VELVET LOUNGE ★"
  addBox("s2-marquee-backing", [0.2, 0.9, 5.2], [layout.portalX - 0.15, layout.portalHeight + 0.7, cz], "#0a0c12");
  addBox("s2-marquee-gold-trim", [0.25, 0.98, 5.3], [layout.portalX - 0.12, layout.portalHeight + 0.7, cz], brassGold, { metalness: 0.9 });
  addBox("s2-marquee-letters", [0.05, 0.6, 4.8], [layout.portalX - 0.26, layout.portalHeight + 0.7, cz], "#ffffff", {
    emissive: "#ffd700",
    emissiveIntensity: 2.8,
  });
  // Subtitle: "ULTRA-LUXURY SUNKEN SEATING & IMMERSIVE SCREEN"
  addBox("s2-marquee-sub", [0.04, 0.25, 4.2], [layout.portalX - 0.25, layout.portalHeight + 0.35, cz], "#ffb703", {
    emissive: "#ffb703",
    emissiveIntensity: 1.8,
  });

  // Plush Velvet Red Carpet Avenue leading from Mall Concourse into Screen 2
  addBox("s2-carpet-runner", [6.0, 0.02, 2.4], [layout.portalX - 3.0, 0.02, cz], "#5e0b16", { roughness: 0.85 });
  addBox("s2-carpet-gold-l", [6.0, 0.025, 0.10], [layout.portalX - 3.0, 0.022, cz + 1.2], brassGold);
  addBox("s2-carpet-gold-r", [6.0, 0.025, 0.10], [layout.portalX - 3.0, 0.022, cz - 1.2], brassGold);

  // Entrance Warm Glow Light
  const portalLight = addLight([layout.portalX - 0.5, 3.2, cz], "#ffe0b2", 22.0, 8.0);
  houseLights.push(portalLight);

  return {
    curvedScreenMesh,
    screenMesh: curvedScreenMesh,
    screenPosition: [layout.screenBaseX, layout.screenCenterY, cz],
    screenLight,
    houseLights,
  };
}
