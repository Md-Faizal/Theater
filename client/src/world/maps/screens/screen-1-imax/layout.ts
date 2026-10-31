export interface SeatBankConfig {
  id: "left" | "right";
  code: string;
  name: string;
  seatCount: number;
}

export const IMAX_LAYOUT = {
  // Auditorium Room Dimensions (Intimate Luxury Cinema Shell)
  roomStartX: 2.2,
  roomEndX: 28.2, // 26.0m room length
  roomLength: 26.0,
  roomHalfWidth: 13.5, // 27.0m total width
  ceilingHeight: 11.5, // 11.5m luxury ceiling
  baseFloorY: -2.0, // Solid structural subfloor foundation

  // Majestic Wall-to-Wall Curved IMAX Screen (24.0m Wide x 11.0m Tall in 27m Room)
  screenWidth: 24.0,
  screenHeight: 11.0,
  screenSag: 1.6, // Gentle 1.6m curvature across 24m chord
  screenRadius: 45.8,
  screenBaseX: 27.5, // Screen apex center furthest East
  screenCenterY: 4.5, // Bottom at -1.0m, top at 10.0m
  screenCircleCenterX: 27.5 - 45.8, // -18.3m
  flatScreenX: 27.5 - 1.6, // 25.9m

  // 10 Continuous Stadium Cinema Tiers
  rowCount: 10,
  backRowX: 5.2, // Back row at X=5.2m
  frontRowX: 21.4, // Front row at X=21.4m (16.2m span / 9 steps = 1.80m per row)
  backRowY: 0.0, // Top tier level with lobby at Y=0.0
  frontRowY: -1.44, // Gentle 0.16m drop per tier down to -1.44m
  rowDepth: 1.80, // 1.80m spacious luxury stadium tread
  seatPlatformThickness: 0.20,
  seatingFocalX: 48.0, // Sightline focal center point ensuring gentle concentric curve

  // Luxury VIP Seat Pitch & Layout
  seatPitch: 0.70, // 0.70m comfortable VIP pitch

  // 2 Symmetrical VIP Banks (14 Left + 14 Right = 28 per row x 10 rows = 280 VIP Recliners!)
  banks: [
    { id: "left", code: "L", name: "Left Wing", seatCount: 14 },
    { id: "right", code: "R", name: "Right Wing", seatCount: 14 },
  ] as const,

  // Walkways & Aisles
  centerAisleWidth: 1.8, // 1.8m center aisle aligned with double door entrance
  sideAisleWidth: 1.2,

  // Rear Arrival Concourse
  entranceStartX: 2.2,
  entranceEndX: 4.75, // Seamless flat arrival concourse from X=2.2m to X=4.75m
  entranceFloorY: 0.0,
} as const;

export const SCREEN_LAYOUT = IMAX_LAYOUT;

// Half-angle of screen cylinder arc
export function screenHalfAngle(): number {
  return Math.asin((IMAX_LAYOUT.screenWidth / 2) / IMAX_LAYOUT.screenRadius);
}

// X coordinate of screen surface at coordinate Z
export function screenSurfaceXAt(z: number): number {
  const clampedZ = Math.max(-IMAX_LAYOUT.screenWidth / 2, Math.min(IMAX_LAYOUT.screenWidth / 2, z));
  const R = IMAX_LAYOUT.screenRadius;
  return IMAX_LAYOUT.screenCircleCenterX + Math.sqrt(Math.max(0, R * R - clampedZ * clampedZ));
}

// Centerline X coordinate of row
export function screenRowX(row: number): number {
  const t = Math.max(0, Math.min(row / (IMAX_LAYOUT.rowCount - 1), 1));
  return IMAX_LAYOUT.frontRowX - t * (IMAX_LAYOUT.frontRowX - IMAX_LAYOUT.backRowX);
}

// Elevation Y coordinate of row
export function screenRowHeight(row: number): number {
  const t = Math.max(0, Math.min(row / (IMAX_LAYOUT.rowCount - 1), 1));
  return IMAX_LAYOUT.frontRowY + t * (IMAX_LAYOUT.backRowY - IMAX_LAYOUT.frontRowY);
}

// Radius from focal center to row
export function screenRowRadius(row: number): number {
  return IMAX_LAYOUT.seatingFocalX - screenRowX(row);
}

export interface SeatTransform {
  x: number;
  y: number;
  z: number;
  rotationY: number;
}

export function getSeatTransform(row: number, bankIndex: number, seatInBank: number): SeatTransform {
  const radius = screenRowRadius(row);
  const rowY = screenRowHeight(row);
  const seatArcSpacing = IMAX_LAYOUT.seatPitch / radius;
  const halfAisleArc = (IMAX_LAYOUT.centerAisleWidth / 2 + 0.30) / radius;

  // bankIndex 0 = Left (negative Z), bankIndex 1 = Right (positive Z)
  let angle = 0;
  if (bankIndex === 0) {
    angle = -halfAisleArc - seatInBank * seatArcSpacing;
  } else {
    angle = halfAisleArc + seatInBank * seatArcSpacing;
  }

  // Seat position on concentric circular arc
  const x = IMAX_LAYOUT.seatingFocalX - radius * Math.cos(angle);
  const z = radius * Math.sin(angle);

  // Facing screen center (27.5, 4.5, 0)
  const dx = IMAX_LAYOUT.screenBaseX - x;
  const dz = 0 - z;
  const rotationY = Math.atan2(-dz, dx);

  return { x, y: rowY, z, rotationY };
}
