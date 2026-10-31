import * as THREE from "three";

export interface DoubleDoorConfig {
  portalX: number; // Doorway plane X (2.2m)
  doorWidth: number; // Single leaf width (1.45m)
  doorHeight: number; // Door leaf height (2.8m)
  doorThickness: number; // 0.10m
  maxAngleDeg?: number; // Max swing angle in degrees (default 80)
}

export class PhysicsDoubleDoor {
  readonly group: THREE.Group;

  // Left & Right Door Pivot Groups (hinges on outer jambs)
  private readonly leftPivot: THREE.Group;
  private readonly rightPivot: THREE.Group;

  // Physical State Variables
  private angleLeft = 0; // radians
  private velocityLeft = 0; // rad/s
  private angleRight = 0; // radians
  private velocityRight = 0; // rad/s

  // Mechanical Constants
  private readonly maxAngle: number;
  private readonly springK = 18.0; // Torsional spring restoring torque
  private readonly dampingC = 8.5; // Viscous door-closer damping
  private readonly inertia = 1.25; // Moment of inertia
  private readonly portalX: number;
  private readonly leafW: number;
  private readonly leafH: number;
  private readonly hingeLeftZ: number;
  private readonly hingeRightZ: number;

  private prevPlayerPos = new THREE.Vector3();
  private hasPrevPlayerPos = false;

  constructor(config: DoubleDoorConfig) {
    this.portalX = config.portalX;
    this.leafW = config.doorWidth;
    this.leafH = config.doorHeight;
    this.maxAngle = THREE.MathUtils.degToRad(config.maxAngleDeg ?? 80);

    this.group = new THREE.Group();
    this.group.name = "physics-double-door-system";

    // Hinges are located at ±leafW from center axis Z=0
    this.hingeLeftZ = -this.leafW;
    this.hingeRightZ = this.leafW;

    // 1. Materials
    const doorPanelMat = new THREE.MeshStandardMaterial({
      color: "#1a1d26",
      roughness: 0.65,
      metalness: 0.15,
    });
    const brassTrimMat = new THREE.MeshStandardMaterial({
      color: "#d4af37",
      metalness: 0.85,
      roughness: 0.25,
    });
    const visionGlassMat = new THREE.MeshStandardMaterial({
      color: "#a2d2ff",
      metalness: 0.3,
      roughness: 0.1,
      transparent: true,
      opacity: 0.65,
      emissive: "#0077b6",
      emissiveIntensity: 0.3,
    });
    const frameDarkMat = new THREE.MeshStandardMaterial({
      color: "#12141c",
      roughness: 0.8,
      metalness: 0.2,
    });
    const signGlowMat = new THREE.MeshStandardMaterial({
      color: "#ffffff",
      emissive: "#ffeaa7",
      emissiveIntensity: 2.2,
    });
    const badgeGlowMat = new THREE.MeshStandardMaterial({
      color: "#00f0ff",
      emissive: "#00d0ff",
      emissiveIntensity: 2.0,
    });

    // 2. Door Frame Arch & Transom Signage
    const frameDepth = 0.35;
    const totalDoorSpan = this.leafW * 2 + 0.1; // ~3.0m
    const frameTopY = this.leafH + 1.4; // 4.2m

    // Left & Right Architrave Jamb Posts
    const leftJamb = new THREE.Mesh(
      new THREE.BoxGeometry(frameDepth, frameTopY, 0.25),
      frameDarkMat,
    );
    leftJamb.position.set(this.portalX, frameTopY / 2, this.hingeLeftZ - 0.125);
    this.group.add(leftJamb);

    const rightJamb = new THREE.Mesh(
      new THREE.BoxGeometry(frameDepth, frameTopY, 0.25),
      frameDarkMat,
    );
    rightJamb.position.set(this.portalX, frameTopY / 2, this.hingeRightZ + 0.125);
    this.group.add(rightJamb);

    // Decorative Fluted Brass Pilasters on Jambs
    for (const side of [-1, 1]) {
      const pz = side * (this.leafW + 0.2);
      const pilaster = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, frameTopY, 0.12),
        brassTrimMat,
      );
      pilaster.position.set(this.portalX - 0.18, frameTopY / 2, pz);
      this.group.add(pilaster);
    }

    // Transom Lintel Beam above Door Leaves (Y = 2.8m to 4.2m)
    const transomH = frameTopY - this.leafH;
    const transom = new THREE.Mesh(
      new THREE.BoxGeometry(frameDepth - 0.05, transomH, totalDoorSpan + 0.4),
      frameDarkMat,
    );
    transom.position.set(this.portalX, this.leafH + transomH / 2, 0);
    this.group.add(transom);

    // Illuminated Transom Header Sign: "★ AUDITORIUM 1 · IMAX ★"
    const signBoard = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.45, 2.4),
      signGlowMat,
    );
    signBoard.position.set(this.portalX - 0.2, this.leafH + 0.8, 0);
    this.group.add(signBoard);

    // "NOW SHOWING" Glowing Status Badge
    const badge = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.22, 1.2),
      badgeGlowMat,
    );
    badge.position.set(this.portalX - 0.2, this.leafH + 0.35, 0);
    this.group.add(badge);

    // Downlight Spotlight illuminating the entrance threshold
    const doorSpot = new THREE.PointLight("#fff5db", 35, 8, 2);
    doorSpot.position.set(this.portalX - 0.4, this.leafH + 0.5, 0);
    this.group.add(doorSpot);

    // 3. Helper to create a single physical door leaf
    const createDoorLeaf = (isLeft: boolean) => {
      const leafGroup = new THREE.Group();
      const zSign = isLeft ? 1 : -1; // Vector from hinge to center
      const centerZ = (this.leafW / 2) * zSign;

      // Main Acoustic Door Body
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(config.doorThickness, this.leafH, this.leafW - 0.03),
        doorPanelMat,
      );
      body.position.set(0, this.leafH / 2, centerZ);
      body.castShadow = true;
      body.receiveShadow = true;
      leafGroup.add(body);

      // Gold Brass Perimeter Framing
      const trimTop = new THREE.Mesh(
        new THREE.BoxGeometry(config.doorThickness + 0.02, 0.06, this.leafW - 0.02),
        brassTrimMat,
      );
      trimTop.position.set(0, this.leafH - 0.03, centerZ);
      leafGroup.add(trimTop);

      const trimBot = new THREE.Mesh(
        new THREE.BoxGeometry(config.doorThickness + 0.02, 0.06, this.leafW - 0.02),
        brassTrimMat,
      );
      trimBot.position.set(0, 0.03, centerZ);
      leafGroup.add(trimBot);

      // Brushed Brass Heavy-Duty Kick Plate (Bottom 0.3m)
      const kickPlate = new THREE.Mesh(
        new THREE.BoxGeometry(config.doorThickness + 0.025, 0.32, this.leafW - 0.04),
        brassTrimMat,
      );
      kickPlate.position.set(0, 0.16, centerZ);
      leafGroup.add(kickPlate);

      // Acoustic Narrow Vision Glass Window
      const windowH = 1.35;
      const windowW = 0.22;
      const windowZ = centerZ + 0.15 * zSign;
      const visionWindow = new THREE.Mesh(
        new THREE.BoxGeometry(config.doorThickness + 0.03, windowH, windowW),
        visionGlassMat,
      );
      visionWindow.position.set(0, 1.65, windowZ);
      leafGroup.add(visionWindow);

      // Commercial Push Crash Bar (Panic Bar) at Y = 1.05m (Both Front & Back)
      for (const faceSide of [-1, 1]) {
        const barX = faceSide * (config.doorThickness / 2 + 0.04);
        // Horizontal Crash Bar Tube
        const pushBar = new THREE.Mesh(
          new THREE.BoxGeometry(0.04, 0.06, this.leafW * 0.75),
          brassTrimMat,
        );
        pushBar.position.set(barX, 1.05, centerZ);
        leafGroup.add(pushBar);

        // Mounting Stems
        for (const stemT of [-0.3, 0.3]) {
          const stem = new THREE.Mesh(
            new THREE.BoxGeometry(0.06, 0.04, 0.04),
            brassTrimMat,
          );
          stem.position.set(faceSide * (config.doorThickness / 2 + 0.02), 1.05, centerZ + stemT * this.leafW);
          leafGroup.add(stem);
        }
      }

      // Top Hydraulic Door Closer Cylinder
      const closer = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.08, 0.12),
        brassTrimMat,
      );
      closer.position.set(0, this.leafH - 0.06, 0.15 * zSign);
      leafGroup.add(closer);

      return leafGroup;
    };

    // 4. Instantiate Pivot Groups at Hinges
    this.leftPivot = createDoorLeaf(true);
    this.leftPivot.position.set(this.portalX, 0, this.hingeLeftZ);
    this.group.add(this.leftPivot);

    this.rightPivot = createDoorLeaf(false);
    this.rightPivot.position.set(this.portalX, 0, this.hingeRightZ);
    this.group.add(this.rightPivot);
  }

  /**
   * Applies an interactive nudge/push impulse (e.g. when pressing E).
   */
  push(forceDirection = 1) {
    this.velocityLeft += forceDirection * 4.5;
    this.velocityRight += forceDirection * 4.5;
  }

  /**
   * Updates physical spring-damper dynamics and continuous player contact.
   */
  update(playerPos: THREE.Vector3, delta: number) {
    const dt = Math.min(delta, 0.04); // Clamp timestep for stability

    // Calculate player velocity
    let playerVx = 0;
    if (this.hasPrevPlayerPos && dt > 0) {
      playerVx = (playerPos.x - this.prevPlayerPos.x) / dt;
    }
    this.prevPlayerPos.copy(playerPos);
    this.hasPrevPlayerPos = true;

    // Contact interaction zone around the doorway (X = 2.2, Z within door opening)
    const inContactZone =
      Math.abs(playerPos.x - this.portalX) < 2.4 &&
      playerPos.z >= this.hingeLeftZ - 0.4 &&
      playerPos.z <= this.hingeRightZ + 0.4 &&
      playerPos.y >= -0.5 &&
      playerPos.y <= this.leafH + 1.0;

    let torqueLeft = 0;
    let torqueRight = 0;

    if (inContactZone) {
      const playerRadius = 0.48; // Effective body capsule radius

      // --- Left Door Contact Physics ---
      // Left door leaf vector from hinge (-this.leafW) towards tip
      const tipLx = this.portalX + this.leafW * Math.sin(this.angleLeft);
      const tipLz = this.hingeLeftZ + this.leafW * Math.cos(this.angleLeft);

      // Distance from player to door leaf line segment
      const dxL = tipLx - this.portalX;
      const dzL = tipLz - this.hingeLeftZ;
      const lenSqL = dxL * dxL + dzL * dzL;

      const pxL = playerPos.x - this.portalX;
      const pzL = playerPos.z - this.hingeLeftZ;
      const tL = Math.max(0.1, Math.min(0.95, (pxL * dxL + pzL * dzL) / lenSqL));

      const closestLx = this.portalX + tL * dxL;
      const closestLz = this.hingeLeftZ + tL * dzL;
      const distL = Math.hypot(playerPos.x - closestLx, playerPos.z - closestLz);

      if (distL < playerRadius + 0.08) {
        const penetration = playerRadius + 0.08 - distL;
        // Direction of push: if player is West (X < 2.2) moving East, push forward (+1)
        // If player is East (X > 2.2) moving West, push backward (-1)
        const pushDir = playerPos.x <= closestLx ? 1 : -1;
        const speedBoost = Math.max(0, playerVx * pushDir);
        torqueLeft += pushDir * (penetration * 65.0 + speedBoost * 30.0 + 8.0);
      }

      // --- Right Door Contact Physics ---
      // Right door leaf vector from hinge (+this.leafW) towards tip
      const tipRx = this.portalX + this.leafW * Math.sin(this.angleRight);
      const tipRz = this.hingeRightZ - this.leafW * Math.cos(this.angleRight);

      const dxR = tipRx - this.portalX;
      const dzR = tipRz - this.hingeRightZ;
      const lenSqR = dxR * dxR + dzR * dzR;

      const pxR = playerPos.x - this.portalX;
      const pzR = playerPos.z - this.hingeRightZ;
      const tR = Math.max(0.1, Math.min(0.95, (pxR * dxR + pzR * dzR) / lenSqR));

      const closestRx = this.portalX + tR * dxR;
      const closestRz = this.hingeRightZ + tR * dzR;
      const distR = Math.hypot(playerPos.x - closestRx, playerPos.z - closestRz);

      if (distR < playerRadius + 0.08) {
        const penetration = playerRadius + 0.08 - distR;
        const pushDir = playerPos.x <= closestRx ? 1 : -1;
        const speedBoost = Math.max(0, playerVx * pushDir);
        torqueRight += pushDir * (penetration * 65.0 + speedBoost * 30.0 + 8.0);
      }
    }

    // --- Dynamic Spring-Damper Integration: Left Door ---
    const springTorqueL = -this.springK * this.angleLeft;
    const dampingTorqueL = -this.dampingC * this.velocityLeft;
    const accelL = (springTorqueL + dampingTorqueL + torqueLeft) / this.inertia;

    this.velocityLeft += accelL * dt;
    this.angleLeft += this.velocityLeft * dt;

    // Angle limits with soft bumper bounce
    if (this.angleLeft > this.maxAngle) {
      this.angleLeft = this.maxAngle;
      if (this.velocityLeft > 0) this.velocityLeft = -this.velocityLeft * 0.2;
    } else if (this.angleLeft < -this.maxAngle) {
      this.angleLeft = -this.maxAngle;
      if (this.velocityLeft < 0) this.velocityLeft = -this.velocityLeft * 0.2;
    }

    // Apply rotation to Left Pivot (swings around Y)
    this.leftPivot.rotation.y = this.angleLeft;

    // --- Dynamic Spring-Damper Integration: Right Door ---
    const springTorqueR = -this.springK * this.angleRight;
    const dampingTorqueR = -this.dampingC * this.velocityRight;
    const accelR = (springTorqueR + dampingTorqueR + torqueRight) / this.inertia;

    this.velocityRight += accelR * dt;
    this.angleRight += this.velocityRight * dt;

    // Angle limits with soft bumper bounce
    if (this.angleRight > this.maxAngle) {
      this.angleRight = this.maxAngle;
      if (this.velocityRight > 0) this.velocityRight = -this.velocityRight * 0.2;
    } else if (this.angleRight < -this.maxAngle) {
      this.angleRight = -this.maxAngle;
      if (this.velocityRight < 0) this.velocityRight = -this.velocityRight * 0.2;
    }

    // Apply rotation to Right Pivot (swings around Y, opposite sign for symmetrical outward push)
    this.rightPivot.rotation.y = -this.angleRight;
  }
}
