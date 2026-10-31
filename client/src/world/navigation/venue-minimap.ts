import * as THREE from "three";
import { IMAX_LAYOUT, screenRowX } from "../maps/screens/screen-1-imax/layout";

const MAP_WIDTH = 270;
const MAP_HEIGHT = 165;
const WORLD = { minX: -67, maxX: 52, minZ: -33, maxZ: 33 };

export class VenueMinimap {
  private readonly context: CanvasRenderingContext2D;
  private elapsed = 0;

  constructor(canvas: HTMLCanvasElement) {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D context is unavailable for the minimap");
    this.context = context;
    canvas.width = MAP_WIDTH;
    canvas.height = MAP_HEIGHT;
  }

  update(position: THREE.Vector3, direction: THREE.Vector3, delta: number) {
    this.elapsed += delta;
    if (this.elapsed < 0.08) return;
    this.elapsed = 0;
    this.draw(position, direction);
  }

  private draw(position: THREE.Vector3, direction: THREE.Vector3) {
    const context = this.context;
    const scale = Math.min(
      (MAP_WIDTH - 20) / (WORLD.maxX - WORLD.minX),
      (MAP_HEIGHT - 20) / (WORLD.maxZ - WORLD.minZ),
    );
    const mapWidth = (WORLD.maxX - WORLD.minX) * scale;
    const mapHeight = (WORLD.maxZ - WORLD.minZ) * scale;
    const offsetX = (MAP_WIDTH - mapWidth) / 2;
    const offsetY = (MAP_HEIGHT - mapHeight) / 2;
    const mapPoint = (x: number, z: number) => ({
      x: offsetX + (x - WORLD.minX) * scale,
      y: offsetY + (WORLD.maxZ - z) * scale,
    });

    const drawBox = (
      name: string,
      x: number,
      z: number,
      width: number,
      depth: number,
      fill: string,
      stroke = "#ffffff22",
      textColor = "#a0a5b5",
      fontSize = 7,
    ) => {
      const topLeft = mapPoint(x, z + depth);
      const bottomRight = mapPoint(x + width, z);
      const w = bottomRight.x - topLeft.x;
      const h = bottomRight.y - topLeft.y;
      context.fillStyle = fill;
      context.fillRect(topLeft.x, topLeft.y, w, h);
      context.strokeStyle = stroke;
      context.lineWidth = 1;
      context.strokeRect(topLeft.x, topLeft.y, w, h);

      if (name) {
        context.fillStyle = textColor;
        context.font = `600 ${fontSize}px sans-serif`;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(name, topLeft.x + w / 2, topLeft.y + h / 2);
      }
    };

    context.clearRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
    context.fillStyle = "#080a12f5";
    context.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

    // =========================================================================
    // 1. ENCLOSED LUXURY MALL HALL (X = -65.0 to 2.2, Z = -32.0 to 32.0)
    // =========================================================================
    drawBox("", -65.0, -32.0, 67.2, 64.0, "#131620", "#384158", "", 7);

    // Central Vaulted Skylight Overhead Boundary
    const skyTopLeft = mapPoint(-58.0, 14.0);
    const skyBotRight = mapPoint(-4.0, -14.0);
    context.strokeStyle = "#00d0ff2a";
    context.setLineDash([3, 2]);
    context.lineWidth = 1;
    context.strokeRect(skyTopLeft.x, skyTopLeft.y, skyBotRight.x - skyTopLeft.x, skyBotRight.y - skyTopLeft.y);
    context.setLineDash([]);

    // Level 2 Mezzanine Galleries & Bridges
    drawBox("", -61.0, 18.0, 56.0, 13.8, "#191e2b", "#ffffff18");
    drawBox("", -61.0, -31.8, 56.0, 13.8, "#191e2b", "#ffffff18");
    drawBox("", -58.0, -18.0, 4.0, 36.0, "#191e2b", "#ffffff18"); // West bridge
    drawBox("", -10.0, -18.0, 4.0, 36.0, "#191e2b", "#ffffff18"); // East bridge

    // North Concourse: Food Court & Cafes
    drawBox("POPCORN & CO", -54.0, 21.0, 12.0, 9.0, "#2b2218", "#ffd16644", "#ffd166", 6.5);
    drawBox("GELATO & BOBA", -38.0, 21.0, 12.0, 9.0, "#162b28", "#70c1b344", "#70c1b3", 6.5);

    // South Concourse: Arcade & Cine-Store
    drawBox("PIXEL ARCADE", -54.0, -30.0, 16.0, 10.0, "#2b1429", "#ff007f44", "#ff007f", 6.5);
    drawBox("CINE-VAULT", -36.0, -30.0, 14.0, 10.0, "#292418", "#d4af3744", "#d4af37", 6.5);

    // Central Grand Atrium & Fountain
    const fCenter = mapPoint(-35.0, 0.0);
    const fRad = 4.2 * scale;
    context.fillStyle = "#00b4d82a";
    context.strokeStyle = "#00d0ff88";
    context.lineWidth = 1.2;
    context.beginPath();
    context.arc(fCenter.x, fCenter.y, fRad, 0, Math.PI * 2);
    context.fill();
    context.stroke();

    context.fillStyle = "#a8d5e5";
    context.font = "700 6.5px sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("ATRIUM", fCenter.x, fCenter.y);

    // Escalators (Twin Yellow Step Bars)
    context.strokeStyle = "#ffb703aa";
    context.lineWidth = 2.0;
    const e1Start = mapPoint(-38.0, 14.5);
    const e1End = mapPoint(-24.0, 14.5);
    context.beginPath();
    context.moveTo(e1Start.x, e1Start.y);
    context.lineTo(e1End.x, e1End.y);
    context.stroke();

    const e2Start = mapPoint(-38.0, -14.5);
    const e2End = mapPoint(-24.0, -14.5);
    context.beginPath();
    context.moveTo(e2Start.x, e2Start.y);
    context.lineTo(e2End.x, e2End.y);
    context.stroke();

    // Red Carpet Avenue (from Atrium straight to IMAX Screen 1 entrance)
    const carpetTopLeft = mapPoint(-28.0, 2.6);
    const carpetBotRight = mapPoint(IMAX_LAYOUT.roomStartX, -2.6);
    context.fillStyle = "#8b0015";
    context.fillRect(
      carpetTopLeft.x,
      carpetTopLeft.y,
      carpetBotRight.x - carpetTopLeft.x,
      carpetBotRight.y - carpetTopLeft.y,
    );
    context.strokeStyle = "#d4af37aa";
    context.lineWidth = 1.2;
    context.strokeRect(
      carpetTopLeft.x,
      carpetTopLeft.y,
      carpetBotRight.x - carpetTopLeft.x,
      carpetBotRight.y - carpetTopLeft.y,
    );

    // IMAX Cinema Anchor Facade Banner
    context.fillStyle = "#d4af37";
    context.font = "700 6.5px sans-serif";
    context.textAlign = "center";
    context.fillText("★ IMAX CINEMA ★", (carpetTopLeft.x + carpetBotRight.x) / 2, carpetTopLeft.y - 4);

    // =========================================================================
    // 2. Full-scale auditorium footprint.
    // =========================================================================
    const audTopLeft = mapPoint(IMAX_LAYOUT.roomStartX, IMAX_LAYOUT.roomHalfWidth);
    const audBottomRight = mapPoint(IMAX_LAYOUT.roomEndX, -IMAX_LAYOUT.roomHalfWidth);
    context.fillStyle = "#0d0f19";
    context.fillRect(audTopLeft.x, audTopLeft.y, audBottomRight.x - audTopLeft.x, audBottomRight.y - audTopLeft.y);
    context.strokeStyle = "#0088ff55";
    context.lineWidth = 1.5;
    context.strokeRect(audTopLeft.x, audTopLeft.y, audBottomRight.x - audTopLeft.x, audBottomRight.y - audTopLeft.y);

    // Physics-Based Double Doors at Entrance
    const doorTopLeft = mapPoint(IMAX_LAYOUT.roomStartX - 0.2, 1.5);
    const doorBotRight = mapPoint(IMAX_LAYOUT.roomStartX + 0.2, -1.5);
    context.fillStyle = "#d4af37";
    context.fillRect(doorTopLeft.x, doorTopLeft.y, doorBotRight.x - doorTopLeft.x, doorBotRight.y - doorTopLeft.y);

    // Three seating zones, each with two rows.
    context.lineWidth = 1.2;
    const tierColors = ["#d4af3766", "#00b4ff66", "#ffb70366"];
    for (let r = 0; r < IMAX_LAYOUT.rowCount; r += 1) {
      const rx = screenRowX(r);
      const arcCenter = mapPoint(IMAX_LAYOUT.seatingFocalX, 0);
      const worldRadius = IMAX_LAYOUT.seatingFocalX - rx;
      const radius = worldRadius * scale;
      const halfArc = Math.asin(IMAX_LAYOUT.roomHalfWidth / worldRadius);
      context.strokeStyle = tierColors[Math.floor(r / (IMAX_LAYOUT.rowCount / 3))] ?? "#ffffff20";
      context.beginPath();
      context.arc(arcCenter.x, arcCenter.y, radius, Math.PI - halfArc, Math.PI + halfArc);
      context.stroke();
    }

    // Rear Concourse Walkway (Flush at Y=0.0)
    const rearTopLeft = mapPoint(IMAX_LAYOUT.entranceStartX, IMAX_LAYOUT.roomHalfWidth - 0.2);
    const rearBotRight = mapPoint(IMAX_LAYOUT.entranceEndX, -IMAX_LAYOUT.roomHalfWidth + 0.2);
    context.fillStyle = "#16192833";
    context.fillRect(rearTopLeft.x, rearTopLeft.y, rearBotRight.x - rearTopLeft.x, rearBotRight.y - rearTopLeft.y);

    // Grand Center Aisle Staircase (Stepping gently from Row 9 to Row 0)
    const centerAisleTopLeft = mapPoint(IMAX_LAYOUT.roomStartX, IMAX_LAYOUT.centerAisleWidth / 2);
    const centerAisleBotRight = mapPoint(IMAX_LAYOUT.frontRowX, -IMAX_LAYOUT.centerAisleWidth / 2);
    context.fillStyle = "#00a2ff26";
    context.fillRect(
      centerAisleTopLeft.x,
      centerAisleTopLeft.y,
      centerAisleBotRight.x - centerAisleTopLeft.x,
      centerAisleBotRight.y - centerAisleTopLeft.y,
    );
    context.strokeStyle = "#00d0ffaa";
    context.lineWidth = 1.0;
    context.strokeRect(
      centerAisleTopLeft.x,
      centerAisleTopLeft.y,
      centerAisleBotRight.x - centerAisleTopLeft.x,
      centerAisleBotRight.y - centerAisleTopLeft.y,
    );

    // Three distinct luxury seating tiers
    context.fillStyle = "#8a94a6";
    context.font = "600 6px sans-serif";
    context.textAlign = "center";
    const leftBankPos = mapPoint(screenRowX(Math.floor(IMAX_LAYOUT.rowCount / 2)), IMAX_LAYOUT.roomHalfWidth * 0.5);
    const rightBankPos = mapPoint(screenRowX(Math.floor(IMAX_LAYOUT.rowCount / 2)), -IMAX_LAYOUT.roomHalfWidth * 0.5);
    context.fillText("VIP RECLINERS (L)", leftBankPos.x, leftBankPos.y);
    context.fillText("VIP RECLINERS (R)", rightBankPos.x, rightBankPos.y);

    // Front Orchestra Floor
    const orchTopLeft = mapPoint(IMAX_LAYOUT.frontRowX, IMAX_LAYOUT.roomHalfWidth - 1);
    const orchBotRight = mapPoint(IMAX_LAYOUT.screenBaseX + 0.2, -IMAX_LAYOUT.roomHalfWidth + 1);
    context.fillStyle = "#0d101c";
    context.fillRect(orchTopLeft.x, orchTopLeft.y, orchBotRight.x - orchTopLeft.x, orchBotRight.y - orchTopLeft.y);

    // 38.8 x 21 m curved large-format screen.
    const pTop = mapPoint(IMAX_LAYOUT.screenBaseX - IMAX_LAYOUT.screenSag, IMAX_LAYOUT.screenWidth / 2);
    const pMid = mapPoint(IMAX_LAYOUT.screenBaseX, 0);
    const pBot = mapPoint(IMAX_LAYOUT.screenBaseX - IMAX_LAYOUT.screenSag, -IMAX_LAYOUT.screenWidth / 2);
    const pCurve = mapPoint(IMAX_LAYOUT.screenBaseX + IMAX_LAYOUT.screenSag, 0);
    context.beginPath();
    context.moveTo(pTop.x, pTop.y);
    context.quadraticCurveTo(pCurve.x, pCurve.y, pBot.x, pBot.y);
    context.strokeStyle = "#00d0ff";
    context.lineWidth = 3.5;
    context.stroke();

    context.fillStyle = "#00e5ff";
    context.font = "700 7px sans-serif";
    context.textAlign = "center";
    context.fillText("IMAX SCREEN", pMid.x - 3, pMid.y);
    context.fillText("38.8 × 21 m", pMid.x - 3, pMid.y + 8);

    // =========================================================================
    // 3. PLAYER POSITION & HEADING ARROW
    // =========================================================================
    const player = mapPoint(position.x, position.z);
    context.save();
    context.translate(player.x, player.y);
    context.rotate(Math.atan2(-direction.z, direction.x) + Math.PI / 2);
    context.beginPath();
    context.moveTo(0, -6);
    context.lineTo(4, 5);
    context.lineTo(0, 3);
    context.lineTo(-4, 5);
    context.closePath();
    context.fillStyle = "#00b4ff";
    context.fill();
    context.strokeStyle = "#ffffff";
    context.lineWidth = 1.5;
    context.stroke();
    context.restore();
  }
}
