import type { VenueBuilder } from "../../venue-types";
import { IMAX_LAYOUT, screenRowHeight, screenRowX } from "./layout";

const RAIL_HEIGHT = 0.85;

function addHandrail(
  builder: VenueBuilder,
  name: string,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  z: number,
) {
  const { addBox } = builder;
  const dx = endX - startX;
  const dy = endY - startY;
  const length = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;

  // Top grab rail (brushed metallic finish with electric blue underglow)
  addBox(
    `${name}-rail`,
    [length, 0.05, 0.05],
    [midX, midY + RAIL_HEIGHT, z],
    "#363a4c",
    { solid: true, metalness: 0.8, roughness: 0.25, rotation: [0, 0, angle] },
  );
  addBox(
    `${name}-glow`,
    [length - 0.1, 0.02, 0.02],
    [midX, midY + RAIL_HEIGHT - 0.035, z],
    "#00c8ff",
    { emissive: "#0066cc", rotation: [0, 0, angle] },
  );

  // Stanchions every ~2.0m
  const posts = Math.max(2, Math.floor(length / 2.0));
  for (let p = 0; p <= posts; p += 1) {
    const t = p / posts;
    const px = startX + t * dx;
    const py = startY + t * dy;
    addBox(
      `${name}-post-${p}`,
      [0.04, RAIL_HEIGHT, 0.04],
      [px, py + RAIL_HEIGHT / 2, z],
      "#202432",
      { solid: true, metalness: 0.7 },
    );
  }
}

export function buildScreenAisles(builder: VenueBuilder) {
  const { addBox } = builder;
  const {
    rowCount,
    centerAisleWidth,
    entranceStartX,
    entranceEndX,
    roomHalfWidth,
    baseFloorY,
    frontRowX,
    backRowX,
    screenBaseX,
  } = IMAX_LAYOUT;

  // =========================================================================
  // 1. SEAMLESS REAR CONCOURSE & ENTRANCE WALKWAY (Level at Y=0.0)
  // =========================================================================
  const entranceLength = entranceEndX - entranceStartX; // 4.75 - 2.2 = 2.55m
  const entranceCenterX = (entranceStartX + entranceEndX) / 2;
  const roomFullWidth = roomHalfWidth * 2; // 27.0m

  // Solid level entrance concourse floor across full width at the back
  addBox(
    "imax-entrance-concourse-floor",
    [entranceLength + 0.1, 0.3, roomFullWidth - 0.4],
    [entranceCenterX, -0.15, 0],
    "#10121a",
    { solid: true },
  );

  // Solid foundation beneath rear concourse down to base floor (-2.0m)
  const rearFillHeight = 0.0 - 0.3 - baseFloorY; // 1.7m
  addBox(
    "imax-entrance-concourse-fill",
    [entranceLength + 0.1, rearFillHeight, roomFullWidth - 0.4],
    [entranceCenterX, baseFloorY + rearFillHeight / 2, 0],
    "#0b0d14",
    { solid: true },
  );

  // Rear Concourse Carpet Runner
  addBox(
    "imax-entrance-concourse-runner",
    [entranceLength - 0.1, 0.02, roomFullWidth - 0.8],
    [entranceCenterX, 0.012, 0],
    "#161928",
  );

  // Entrance LED Guide Runners
  for (const side of [-1, 1]) {
    const ez = side * (centerAisleWidth / 2);
    addBox(
      `imax-entrance-led-${side > 0 ? "r" : "l"}`,
      [entranceLength, 0.035, 0.035],
      [entranceCenterX, 0.03, ez],
      "#00a2ff",
      { emissive: "#0055cc" },
    );
  }

  // =========================================================================
  // 2. GRAND CENTER AISLE STAIRCASE (Aligned with Double Doors)
  // =========================================================================
  for (let r = rowCount - 1; r > 0; r -= 1) {
    const topX = screenRowX(r);
    const botX = screenRowX(r - 1);
    const topY = screenRowHeight(r);
    const botY = screenRowHeight(r - 1);
    const stepsBetween = 2; // 2 steps per row

    for (let s = 0; s < stepsBetween; s += 1) {
      const t = (s + 0.5) / stepsBetween;
      const sx = topX + t * (botX - topX);
      const sy = topY + (s + 1) * ((botY - topY) / stepsBetween);
      const stepDepth = (botX - topX) / stepsBetween + 0.06;

      // Solid Step Tread
      addBox(
        `center-aisle-step-${r}-${s}`,
        [stepDepth, 0.20, centerAisleWidth - 0.06],
        [sx, sy - 0.10, 0],
        "#131622",
        { solid: true },
      );

      // Solid Foundation beneath step down to base floor
      const stepFillHeight = sy - 0.20 - baseFloorY;
      if (stepFillHeight > 0.05) {
        addBox(
          `center-aisle-fill-${r}-${s}`,
          [stepDepth, stepFillHeight, centerAisleWidth - 0.06],
          [sx, baseFloorY + stepFillHeight / 2, 0],
          "#0c0e16",
          { solid: true },
        );
      }

      // Step Carpet
      addBox(
        `center-aisle-carpet-${r}-${s}`,
        [stepDepth - 0.03, 0.02, centerAisleWidth - 0.12],
        [sx, sy + 0.01, 0],
        "#181c2e",
      );

      // Blue Safety LED Strip on Step Nose
      addBox(
        `center-aisle-led-${r}-${s}`,
        [0.035, 0.02, centerAisleWidth - 0.12],
        [sx + stepDepth / 2 - 0.015, sy + 0.015, 0],
        "#00b4ff",
        { emissive: "#0066cc" },
      );
    }
  }

  // Continuous Safety Handrails Flanking the Center Aisle
  const handrailStartX = backRowX - 0.45;
  const handrailEndX = frontRowX + 1.35;
  for (const side of [-1, 1]) {
    const rz = side * (centerAisleWidth / 2 - 0.08);
    addHandrail(
      builder,
      `center-aisle-rail-${side > 0 ? "r" : "l"}`,
      handrailStartX,
      0.0,
      handrailEndX,
      -1.44,
      rz,
    );
  }

  // =========================================================================
  // 3. FRONT ORCHESTRA FLOOR (Flush with Row 0 Platform at Y = -1.44)
  // =========================================================================
  const frontY = screenRowHeight(0); // -1.44m
  const orchestraStartX = frontRowX + 1.30; // 22.70m
  const orchestraEndX = screenBaseX + 0.2; // 27.70m
  const orchestraLength = orchestraEndX - orchestraStartX; // 5.0m
  const orchestraCenterX = (orchestraStartX + orchestraEndX) / 2;

  // Solid Front Orchestra Floor
  addBox(
    "imax-front-orchestra-floor",
    [orchestraLength + 0.1, 0.3, roomFullWidth - 0.4],
    [orchestraCenterX, frontY - 0.15, 0],
    "#111420",
    { solid: true },
  );

  // Solid Foundation beneath orchestra floor down to base floor (-2.0m)
  const orchFillHeight = frontY - 0.3 - baseFloorY;
  if (orchFillHeight > 0.05) {
    addBox(
      "imax-front-orchestra-fill",
      [orchestraLength + 0.1, orchFillHeight, roomFullWidth - 0.4],
      [orchestraCenterX, baseFloorY + orchFillHeight / 2, 0],
      "#0b0d14",
      { solid: true },
    );
  }

  // Front Orchestra Carpet
  addBox(
    "imax-front-orchestra-carpet",
    [orchestraLength - 0.1, 0.02, roomFullWidth - 0.8],
    [orchestraCenterX, frontY + 0.012, 0],
    "#161928",
  );
}

export function buildScreenCrossAisles(_builder: VenueBuilder) {
  // Integrated into buildScreenAisles
}
