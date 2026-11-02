import type { VenueBuilder } from "./venue-types";

/**
 * Builds the enclosed luxury entertainment mall ("The Cine-Mall Grand Atrium").
 * A soaring 2-story indoor complex featuring:
 * - 15m high vaulted ceiling with glass skylights & steel spaceframes
 * - High-gloss polished ivory & sandstone marble terrazzo floors
 * - 2-story mezzanine galleries & overlook sky-bridges with glass balustrades
 * - Twin architectural escalators with glowing step runners
 * - Central Atrium with tiered illuminated fountain & 4-sided Media Cube
 * - North Concourse: "Popcorn & Co." gourmet bar, "Crema Gelato & Boba", cafe seating
 * - South Concourse: "Pixel Palace" neon arcade with glowing cabinets, "Cine-Vault" boutique
 * - East Concourse: Monumental IMAX Cinema anchor facade, red carpet avenue, gold stanchions
 */
export function buildEntertainmentMall(builder: VenueBuilder) {
  const { addBox, addLight } = builder;

  // =========================================================================
  // 1. PALETTE & MATERIALS (Luxury, Warm, Vibrant Modern Enclosed Mall)
  // =========================================================================
  const marbleIvory = "#fbf9f5";
  const marbleSandstone = "#ede4d4";
  const graniteDark = "#2b2622";
  const wallTravertine = "#f2ede4";
  const wallStucco = "#e8e1d5";
  const architecturalDark = "#181b24";
  const brassGold = "#d4af37";
  const warmOak = "#a87853";
  const steelFrame = "#2d323f";
  const glassRail = "#c2e7f8";
  const waterPool = "#00b4d8";
  const neonPink = "#ff007f";
  const neonCyan = "#00f0ff";
  const neonAmber = "#ffb703";
  const imaxBlue = "#0077b6";
  const redCarpet = "#8b0015";
  const foliageGreen = "#38b000";

  // Mall Boundaries:
  // X: from -65.0 to 2.2 (Length: 67.2m)
  // Z: from -32.0 to 32.0 (Width: 64.0m)
  // Y: from 0.0 to 15.0 (Clear Height: 15.0m)
  const mallLength = 67.2;
  const mallWidth = 64.0;
  const mallCenterX = (-65.0 + 2.2) / 2; // -31.4m
  const mallHeight = 15.0;

  // =========================================================================
  // 2. ENCLOSURE SHELL (Floor, Exterior Walls, Vaulted Skylight Roof)
  // =========================================================================

  // A. Solid Foundation & Marble Floors
  addBox("mall-foundation", [mallLength + 4, 0.4, mallWidth + 4], [mallCenterX, -0.2, 0], "#1a1a1a", { solid: true });

  // Main Ivory Marble Floor Field
  addBox("mall-floor-main", [mallLength, 0.02, mallWidth], [mallCenterX, 0.01, 0], marbleIvory, {
    roughness: 0.18,
    metalness: 0.08,
  });

  // Sandstone Promenade Borders & Concourse Lanes
  // Central East-West Concourse
  addBox("mall-floor-central-lane", [mallLength - 2, 0.025, 16.0], [mallCenterX, 0.015, 0], marbleSandstone, {
    roughness: 0.22,
  });
  // North & South Shopping Promenade Lanes
  addBox("mall-floor-north-lane", [mallLength - 4, 0.025, 10.0], [mallCenterX, 0.015, 23.0], marbleSandstone);
  addBox("mall-floor-south-lane", [mallLength - 4, 0.025, 10.0], [mallCenterX, 0.015, -23.0], marbleSandstone);

  // Inlaid Charcoal Granite Geometric Accents
  for (const x of [-50, -35, -20, -5]) {
    addBox(`mall-floor-granite-band-${x}`, [1.2, 0.03, mallWidth - 4], [x, 0.018, 0], graniteDark);
  }

  // B. Enclosure Perimeter Walls (Light Travertine with Architectural Pilasters)
  // North Wall (Z = +32.0)
  addBox("mall-north-wall", [mallLength + 0.6, mallHeight, 0.8], [mallCenterX, mallHeight / 2, 32.0], wallTravertine, { solid: true });
  // South Wall (Z = -32.0)
  addBox("mall-south-wall", [mallLength + 0.6, mallHeight, 0.8], [mallCenterX, mallHeight / 2, -32.0], wallTravertine, { solid: true });

  // West Wall (Grand Entrance Facade at X = -65.0)
  // North and South flanking solid panels
  addBox("mall-west-wall-n", [0.8, mallHeight, 22.0], [-65.0, mallHeight / 2, 21.0], wallTravertine, { solid: true });
  addBox("mall-west-wall-s", [0.8, mallHeight, 22.0], [-65.0, mallHeight / 2, -21.0], wallTravertine, { solid: true });
  // Double-height Glass Curtain Wall in Center (Z in [-10, 10])
  addBox("mall-west-glass-frame-top", [1.0, 5.0, 20.0], [-65.0, 12.5, 0], steelFrame, { solid: true });
  addBox("mall-west-glass", [0.2, 7.5, 19.6], [-65.0, 6.25, 0], glassRail, {
    roughness: 0.1,
    metalness: 0.2,
    emissive: "#204060",
    emissiveIntensity: 0.3,
  });
  // Grand Entrance Revolving/Sliding Portal at Ground Level
  addBox("mall-west-portal-frame", [1.2, 3.6, 12.0], [-65.0, 1.8, 0], architecturalDark, { solid: true });
  addBox("mall-west-portal-canopy", [3.2, 0.3, 13.0], [-64.0, 3.7, 0], brassGold, { solid: true });
  addBox("mall-west-portal-glow", [0.1, 0.15, 12.0], [-63.5, 3.6, 0], neonAmber, {
    emissive: neonAmber,
    emissiveIntensity: 1.5,
  });

  // East Wall (Screen 1 IMAX & Screen 2 Velvet Lounge Portals at X = 2.2)
  // North theater shell wall
  addBox("mall-east-wall-n", [0.8, mallHeight, 29.4], [2.2, mallHeight / 2, 17.3], architecturalDark, { solid: true });
  // South theater shell wall split to provide open portal for Screen 2 at Z = -23.0 (width 3.6m)
  addBox("mall-east-wall-s-between", [0.8, mallHeight, 18.6], [2.2, mallHeight / 2, -11.9], architecturalDark, { solid: true });
  addBox("mall-east-wall-s-south", [0.8, mallHeight, 7.2], [2.2, mallHeight / 2, -28.4], architecturalDark, { solid: true });
  addBox("mall-east-wall-s2-header", [0.8, mallHeight - 3.2, 3.6], [2.2, 3.2 + (mallHeight - 3.2) / 2, -23.0], architecturalDark, { solid: true });
  // Screen 1 Cinema Entrance Opening Header above portal (Y = 4.2 to 15.0)
  addBox("mall-east-wall-header", [0.8, mallHeight - 4.2, 5.4], [2.2, 4.2 + (mallHeight - 4.2) / 2, 0], architecturalDark, { solid: true });

  // C. Soaring Vaulted Skylight Roof (Y = 15.0m)
  // Perimeter Solid Coffered Ceilings
  addBox("mall-roof-north-solid", [mallLength, 0.5, 18.0], [mallCenterX, 15.0, 23.0], wallStucco, { solid: true });
  addBox("mall-roof-south-solid", [mallLength, 0.5, 18.0], [mallCenterX, 15.0, -23.0], wallStucco, { solid: true });
  addBox("mall-roof-west-solid", [7.0, 0.5, 28.0], [-61.5, 15.0, 0], wallStucco, { solid: true });
  addBox("mall-roof-east-solid", [7.0, 0.5, 28.0], [-1.3, 15.0, 0], wallStucco, { solid: true });

  // Central Grand Glass Skylight (X from -58 to -4, Z from -14 to 14)
  const skylightLength = 54.0;
  const skylightCenterX = (-58.0 + -4.0) / 2; // -31.0m
  addBox("mall-skylight-glass", [skylightLength, 0.1, 28.0], [skylightCenterX, 15.2, 0], "#dff1fc", {
    roughness: 0.1,
    metalness: 0.1,
    emissive: "#b8e2fb",
    emissiveIntensity: 0.65, // Soft, glowing diffuse daylight streaming into atrium
  });

  // Architectural Spaceframe Truss Ribs across the Skylight
  for (let x = -56; x <= -6; x += 6) {
    // Transverse steel truss arch
    addBox(`skylight-truss-${x}`, [0.5, 0.8, 28.0], [x, 14.8, 0], steelFrame);
    // Suspended LED cove strip on underside of each truss
    addBox(`skylight-led-strip-${x}`, [0.2, 0.08, 26.0], [x, 14.35, 0], "#fff9e6", {
      emissive: "#fff3cc",
      emissiveIntensity: 1.2,
    });
  }
  // Longitudinal Truss Keels
  addBox("skylight-keel-center", [skylightLength, 0.6, 0.5], [skylightCenterX, 14.9, 0], steelFrame);
  addBox("skylight-keel-n", [skylightLength, 0.6, 0.5], [skylightCenterX, 14.9, 13.8], steelFrame);
  addBox("skylight-keel-s", [skylightLength, 0.6, 0.5], [skylightCenterX, 14.9, -13.8], steelFrame);

  // =========================================================================
  // 3. LEVEL 2 MEZZANINE GALLERIES & OVERLOOK BRIDGES (Y = 5.0m)
  // =========================================================================
  const mezzY = 5.0;
  const mezzThick = 0.35;
  const mezzWidth = 14.0; // from Z = 18 to 32 (North) and Z = -18 to -32 (South)

  // North Mezzanine Gallery Floor
  addBox("mezz-north-floor", [mallLength - 8, mezzThick, mezzWidth], [mallCenterX, mezzY - mezzThick / 2, 25.0], marbleIvory, {
    solid: true,
  });
  // North Mezzanine Fascia Trim
  addBox("mezz-north-fascia", [mallLength - 8, 0.7, 0.3], [mallCenterX, mezzY - 0.2, 17.9], architecturalDark);
  addBox("mezz-north-fascia-glow", [mallLength - 8, 0.08, 0.05], [mallCenterX, mezzY - 0.5, 17.7], neonAmber, {
    emissive: neonAmber,
    emissiveIntensity: 1.0,
  });

  // South Mezzanine Gallery Floor
  addBox("mezz-south-floor", [mallLength - 8, mezzThick, mezzWidth], [mallCenterX, mezzY - mezzThick / 2, -25.0], marbleIvory, {
    solid: true,
  });
  // South Mezzanine Fascia Trim
  addBox("mezz-south-fascia", [mallLength - 8, 0.7, 0.3], [mallCenterX, mezzY - 0.2, -17.9], architecturalDark);
  addBox("mezz-south-fascia-glow", [mallLength - 8, 0.08, 0.05], [mallCenterX, mezzY - 0.5, -17.7], neonCyan, {
    emissive: neonCyan,
    emissiveIntensity: 1.0,
  });

  // Connecting Overlook Sky-Bridges across Central Atrium
  // East Cinema Overlook Bridge (at X = -8.0)
  addBox("mezz-bridge-east-floor", [5.0, mezzThick, 36.0], [-8.0, mezzY - mezzThick / 2, 0], marbleIvory, { solid: true });
  addBox("mezz-bridge-east-fascia-w", [0.3, 0.7, 36.0], [-10.6, mezzY - 0.2, 0], architecturalDark);
  addBox("mezz-bridge-east-fascia-e", [0.3, 0.7, 36.0], [-5.4, mezzY - 0.2, 0], architecturalDark);

  // West Entrance Overlook Bridge (at X = -56.0)
  addBox("mezz-bridge-west-floor", [5.0, mezzThick, 36.0], [-56.0, mezzY - mezzThick / 2, 0], marbleIvory, { solid: true });
  addBox("mezz-bridge-west-fascia-w", [0.3, 0.7, 36.0], [-58.6, mezzY - 0.2, 0], architecturalDark);
  addBox("mezz-bridge-west-fascia-e", [0.3, 0.7, 36.0], [-53.4, mezzY - 0.2, 0], architecturalDark);

  // Mezzanine Glass Balustrades (1.1m high with chrome cap rail)
  // North Mezzanine inner glass edge at Z = 18.0
  addBox("mezz-glass-north", [mallLength - 8, 1.0, 0.1], [mallCenterX, mezzY + 0.5, 18.0], glassRail, { solid: true });
  addBox("mezz-rail-north", [mallLength - 8, 0.1, 0.15], [mallCenterX, mezzY + 1.05, 18.0], brassGold);

  // South Mezzanine inner glass edge at Z = -18.0
  addBox("mezz-glass-south", [mallLength - 8, 1.0, 0.1], [mallCenterX, mezzY + 0.5, -18.0], glassRail, { solid: true });
  addBox("mezz-rail-south", [mallLength - 8, 0.1, 0.15], [mallCenterX, mezzY + 1.05, -18.0], brassGold);

  // Bridge Balustrades
  // East Bridge West Edge
  addBox("bridge-east-glass-w", [0.1, 1.0, 35.8], [-10.5, mezzY + 0.5, 0], glassRail, { solid: true });
  addBox("bridge-east-rail-w", [0.15, 0.1, 35.8], [-10.5, mezzY + 1.05, 0], brassGold);
  // East Bridge East Edge
  addBox("bridge-east-glass-e", [0.1, 1.0, 35.8], [-5.5, mezzY + 0.5, 0], glassRail, { solid: true });
  addBox("bridge-east-rail-e", [0.15, 0.1, 35.8], [-5.5, mezzY + 1.05, 0], brassGold);

  // West Bridge West Edge
  addBox("bridge-west-glass-w", [0.1, 1.0, 35.8], [-58.5, mezzY + 0.5, 0], glassRail, { solid: true });
  addBox("bridge-west-rail-w", [0.15, 0.1, 35.8], [-58.5, mezzY + 1.05, 0], brassGold);
  // West Bridge East Edge
  addBox("bridge-west-glass-e", [0.1, 1.0, 35.8], [-53.5, mezzY + 0.5, 0], glassRail, { solid: true });
  addBox("bridge-west-rail-e", [0.15, 0.1, 35.8], [-53.5, mezzY + 1.05, 0], brassGold);

  // Supporting Structural Columns for Mezzanines
  const colPositions = [
    [-52, 17.8], [-40, 17.8], [-28, 17.8], [-16, 17.8],
    [-52, -17.8], [-40, -17.8], [-28, -17.8], [-16, -17.8],
  ];
  for (let i = 0; i < colPositions.length; i++) {
    const [cx, cz] = colPositions[i];
    addBox(`mezz-col-${i}`, [1.2, 5.0, 1.2], [cx, 2.5, cz], wallTravertine, { solid: true });
    // Brass Capital & Base
    addBox(`mezz-col-base-${i}`, [1.4, 0.3, 1.4], [cx, 0.15, cz], brassGold);
    addBox(`mezz-col-cap-${i}`, [1.4, 0.3, 1.4], [cx, 4.85, cz], brassGold);
  }

  // =========================================================================
  // 4. TWIN ARCHITECTURAL ESCALATORS & GRAND STAIRS
  // =========================================================================
  // Left Escalator (North: rising from X = -38, Z = 14 to X = -24, Z = 18 at Y = 5.0)
  const escaLen = 15.0;
  const escaHeight = 5.0;
  const escaAngle = Math.atan2(escaHeight, escaLen);

  for (const side of [1, -1]) {
    const ez = side * 14.5;
    const namePrefix = side > 0 ? "esca-north" : "esca-south";

    // Inclined Truss Body
    addBox(`${namePrefix}-truss`, [escaLen + 2, 0.6, 2.2], [-31.0, 2.5, ez], steelFrame, {
      solid: true,
      rotation: [0, 0, escaAngle],
    });

    // Glass Balustrades on Escalator Sides
    addBox(`${namePrefix}-glass-inner`, [escaLen + 1.8, 1.0, 0.08], [-31.0, 3.2, ez - side * 1.0], glassRail, {
      rotation: [0, 0, escaAngle],
    });
    addBox(`${namePrefix}-glass-outer`, [escaLen + 1.8, 1.0, 0.08], [-31.0, 3.2, ez + side * 1.0], glassRail, {
      rotation: [0, 0, escaAngle],
    });

    // Moving Handrail
    addBox(`${namePrefix}-handrail-inner`, [escaLen + 2.0, 0.12, 0.15], [-31.0, 3.75, ez - side * 1.0], "#111111", {
      rotation: [0, 0, escaAngle],
    });
    addBox(`${namePrefix}-handrail-outer`, [escaLen + 2.0, 0.12, 0.15], [-31.0, 3.75, ez + side * 1.0], "#111111", {
      rotation: [0, 0, escaAngle],
    });

    // Glowing Steps LED Underrunner
    addBox(`${namePrefix}-steps-glow`, [escaLen, 0.08, 1.6], [-31.0, 2.85, ez], neonAmber, {
      emissive: neonAmber,
      emissiveIntensity: 1.4,
      rotation: [0, 0, escaAngle],
    });

    // Ground & Upper Landing Podiums
    addBox(`${namePrefix}-landing-bottom`, [3.0, 0.25, 2.6], [-39.5, 0.125, ez], architecturalDark, { solid: true });
    addBox(`${namePrefix}-landing-top`, [3.0, 0.25, 2.6], [-22.5, 4.875, ez], architecturalDark, { solid: true });
  }

  // =========================================================================
  // 5. ZONE 1: CENTRAL GRAND ATRIUM & HUB (X = -44 to -26, Z = -14 to 14)
  // =========================================================================
  const atriumX = -35.0;
  const atriumZ = 0.0;

  // A. Tiered Grand Indoor Water Fountain
  // Outer Marble Basin (8m x 8m)
  addBox("fountain-basin-base", [8.4, 0.45, 8.4], [atriumX, 0.225, atriumZ], marbleIvory, { solid: true });
  addBox("fountain-basin-rim-n", [8.4, 0.35, 0.5], [atriumX, 0.55, atriumZ + 4.0], marbleSandstone, { solid: true });
  addBox("fountain-basin-rim-s", [8.4, 0.35, 0.5], [atriumX, 0.55, atriumZ - 4.0], marbleSandstone, { solid: true });
  addBox("fountain-basin-rim-e", [0.5, 0.35, 8.4], [atriumX + 4.0, 0.55, atriumZ], marbleSandstone, { solid: true });
  addBox("fountain-basin-rim-w", [0.5, 0.35, 8.4], [atriumX - 4.0, 0.55, atriumZ], marbleSandstone, { solid: true });

  // Illuminated Water Sheet
  addBox("fountain-water-sheet", [7.6, 0.15, 7.6], [atriumX, 0.45, atriumZ], waterPool, {
    roughness: 0.1,
    metalness: 0.2,
    emissive: "#0088cc",
    emissiveIntensity: 0.8,
  });

  // Second Tier Pedestal & Overflow Basin
  addBox("fountain-tier2-pedestal", [4.2, 0.8, 4.2], [atriumX, 0.8, atriumZ], marbleIvory, { solid: true });
  addBox("fountain-tier2-water", [3.8, 0.1, 3.8], [atriumX, 1.25, atriumZ], neonCyan, {
    emissive: "#00b4d8",
    emissiveIntensity: 1.0,
  });

  // Central Golden Water Jet Sculpture Spire
  addBox("fountain-spire", [0.8, 3.0, 0.8], [atriumX, 2.7, atriumZ], brassGold, {
    metalness: 0.85,
    roughness: 0.2,
  });
  // Crown Water Jet Glow Orb
  addBox("fountain-jet-orb", [0.6, 0.6, 0.6], [atriumX, 4.3, atriumZ], neonCyan, {
    emissive: neonCyan,
    emissiveIntensity: 2.2,
  });

  // B. Circular Atrium Luxury Lounge Banquettes
  const banquetteOffsets = [
    [atriumX - 7.5, atriumZ - 3.5],
    [atriumX - 7.5, atriumZ + 3.5],
    [atriumX + 7.5, atriumZ - 3.5],
    [atriumX + 7.5, atriumZ + 3.5],
  ];
  for (let i = 0; i < banquetteOffsets.length; i++) {
    const [bx, bz] = banquetteOffsets[i];
    // Cognac Leather Cushion Seat
    addBox(`atrium-lounge-seat-${i}`, [2.6, 0.45, 2.6], [bx, 0.25, bz], "#a06237", { solid: true });
    // Oak Backrest
    addBox(`atrium-lounge-back-${i}`, [2.6, 0.45, 0.4], [bx, 0.65, bz + (bz > 0 ? 1.1 : -1.1)], warmOak, { solid: true });
    // Low Marble Cocktail Table
    addBox(`atrium-lounge-table-${i}`, [1.2, 0.4, 1.2], [bx + (bx > atriumX ? 2.2 : -2.2), 0.2, bz], marbleIvory, { solid: true });
  }

  // C. Indoor Architectural Planters & Palms
  const planterCoords = [
    [atriumX - 9.0, atriumZ + 9.0],
    [atriumX - 9.0, atriumZ - 9.0],
    [atriumX + 9.0, atriumZ + 9.0],
    [atriumX + 9.0, atriumZ - 9.0],
    [-52.0, 8.0],
    [-52.0, -8.0],
    [-18.0, 8.0],
    [-18.0, -8.0],
  ];
  for (let i = 0; i < planterCoords.length; i++) {
    const [px, pz] = planterCoords[i];
    // White Ceramic Planter Pot
    addBox(`mall-planter-pot-${i}`, [1.6, 1.2, 1.6], [px, 0.6, pz], marbleIvory, { solid: true });
    addBox(`mall-planter-rim-${i}`, [1.8, 0.15, 1.8], [px, 1.2, pz], brassGold);
    // Green Foliage Core
    addBox(`mall-planter-foliage-${i}`, [1.4, 1.8, 1.4], [px, 2.0, pz], foliageGreen);
    // Tropical Palm Fronds
    addBox(`mall-planter-frond-x-${i}`, [2.4, 0.15, 0.8], [px, 2.8, pz], "#40916c");
    addBox(`mall-planter-frond-z-${i}`, [0.8, 0.15, 2.4], [px, 2.8, pz], "#2d6a4f");
  }

  // D. Towering Suspended 4-Sided Media Cube (Jumbotron / Digital Chandelier)
  // Suspended high in the atrium skylight void at Y = 9.5m
  const cubeY = 9.5;
  const cubeW = 6.0;
  const cubeH = 3.6;
  const cubeD = 6.0;

  // Structural Chassis
  addBox("media-cube-chassis", [cubeW + 0.4, cubeH + 0.4, cubeD + 0.4], [atriumX, cubeY, atriumZ], architecturalDark);
  // Gold Trim Bevels
  addBox("media-cube-trim-top", [cubeW + 0.6, 0.2, cubeD + 0.6], [atriumX, cubeY + cubeH / 2 + 0.1, atriumZ], brassGold);
  addBox("media-cube-trim-bot", [cubeW + 0.6, 0.2, cubeD + 0.6], [atriumX, cubeY - cubeH / 2 - 0.1, atriumZ], brassGold);

  // 4 Digital Display Screens (East, West, North, South faces)
  // East Face (Facing Screen 1 Cinema Concourse)
  addBox("media-screen-east", [0.1, cubeH - 0.4, cubeD - 0.6], [atriumX + cubeW / 2 + 0.05, cubeY, atriumZ], imaxBlue, {
    emissive: "#0096c7",
    emissiveIntensity: 1.4,
  });
  // West Face (Facing Main Entrance)
  addBox("media-screen-west", [0.1, cubeH - 0.4, cubeD - 0.6], [atriumX - cubeW / 2 - 0.05, cubeY, atriumZ], neonPink, {
    emissive: "#d90429",
    emissiveIntensity: 1.4,
  });
  // North Face (Facing Food Court)
  addBox("media-screen-north", [cubeW - 0.6, cubeH - 0.4, 0.1], [atriumX, cubeY, atriumZ + cubeD / 2 + 0.05], neonAmber, {
    emissive: "#f77f00",
    emissiveIntensity: 1.4,
  });
  // South Face (Facing Arcade & Boutique)
  addBox("media-screen-south", [cubeW - 0.6, cubeH - 0.4, 0.1], [atriumX, cubeY, atriumZ - cubeD / 2 - 0.05], neonCyan, {
    emissive: "#06d6a0",
    emissiveIntensity: 1.4,
  });

  // Steel Suspension Cables Rising to Skylight Trusses
  for (const cx of [-cubeW / 2 + 0.4, cubeW / 2 - 0.4]) {
    for (const cz of [-cubeD / 2 + 0.4, cubeD / 2 - 0.4]) {
      addBox(`media-cube-cable-${cx}-${cz}`, [0.08, 15.0 - (cubeY + cubeH / 2), 0.08], [atriumX + cx, (cubeY + cubeH / 2 + 15.0) / 2, atriumZ + cz], "#aaaaaa");
    }
  }

  // =========================================================================
  // 6. ZONE 2: NORTH CONCOURSE - GOURMET FOOD COURT & CAFES (Z = 18 to 32)
  // =========================================================================

  // A. "Popcorn & Co." Artisan Cinema Kiosk (X in [-54, -42], Z in [21, 30])
  const popX = -48.0;
  const popZ = 25.5;
  // Main Fluted Oak Counter
  addBox("popcorn-counter-base", [10.0, 1.1, 4.0], [popX, 0.55, popZ], warmOak, { solid: true });
  addBox("popcorn-counter-top", [10.4, 0.1, 4.4], [popX, 1.15, popZ], marbleIvory, { solid: true });

  // Popcorn Warmer Vitrines with glowing butter-corn display
  for (let i = -1; i <= 1; i++) {
    const vx = popX + i * 2.8;
    addBox(`popcorn-warmer-case-${i}`, [1.8, 1.0, 1.4], [vx, 1.7, popZ + 0.6], glassRail);
    // Glowing Popcorn Mound inside
    addBox(`popcorn-warmer-mound-${i}`, [1.6, 0.7, 1.2], [vx, 1.5, popZ + 0.6], "#ffd166", {
      emissive: "#e5a700",
      emissiveIntensity: 1.5,
    });
  }

  // Overhead Canopy & Illuminated 3D Neon Sign
  addBox("popcorn-canopy-beam", [11.0, 0.4, 4.6], [popX, 3.8, popZ], architecturalDark);
  addBox("popcorn-neon-sign", [8.0, 0.8, 0.15], [popX, 4.3, popZ - 2.2], "#ffffff", {
    emissive: neonAmber,
    emissiveIntensity: 2.0,
  });
  // Hanging Brass Pendant Lamps
  for (let i = -2; i <= 2; i++) {
    const lx = popX + i * 2.2;
    addBox(`popcorn-pendant-wire-${i}`, [0.04, 1.2, 0.04], [lx, 3.2, popZ - 1.2], "#333333");
    addBox(`popcorn-pendant-shade-${i}`, [0.4, 0.3, 0.4], [lx, 2.5, popZ - 1.2], brassGold);
    addBox(`popcorn-pendant-bulb-${i}`, [0.2, 0.2, 0.2], [lx, 2.35, popZ - 1.2], "#fff3cc", {
      emissive: "#fff0aa",
      emissiveIntensity: 2.5,
    });
  }

  // B. "Crema Gelato & Boba" Cafe Kiosk (X in [-38, -26], Z in [21, 30])
  const gelX = -32.0;
  const gelZ = 25.5;
  // Pastel Mint & Terracotta Counter
  addBox("gelato-counter-base", [9.0, 1.1, 4.0], [gelX, 0.55, gelZ], "#70c1b3", { solid: true });
  addBox("gelato-counter-top", [9.4, 0.1, 4.4], [gelX, 1.15, gelZ], marbleIvory, { solid: true });

  // Gelato Display Showcase with Colorful Flavor Tubs
  addBox("gelato-showcase-glass", [7.6, 0.8, 1.6], [gelX, 1.6, gelZ - 0.6], glassRail);
  const gelatoColors = ["#f3c68f", "#70c1b3", "#e29578", "#d62828", "#8338ec", "#ffb703"];
  for (let t = 0; t < gelatoColors.length; t++) {
    const tx = gelX - 2.8 + t * 1.1;
    addBox(`gelato-tub-${t}`, [0.8, 0.4, 0.9], [tx, 1.4, gelZ - 0.6], gelatoColors[t], {
      emissive: gelatoColors[t],
      emissiveIntensity: 0.6,
    });
  }
  // Overhead Neon Sign: "CREMA GELATO"
  addBox("gelato-canopy-beam", [9.6, 0.4, 4.6], [gelX, 3.8, gelZ], architecturalDark);
  addBox("gelato-neon-sign", [7.0, 0.8, 0.15], [gelX, 4.3, gelZ - 2.2], "#ffffff", {
    emissive: "#70c1b3",
    emissiveIntensity: 2.0,
  });

  // C. Cafe Lounge Tables & Chairs (X in [-52, -26], Z in [13, 17])
  const cafeTableXs = [-50, -44, -38, -32, -26];
  for (let i = 0; i < cafeTableXs.length; i++) {
    const tx = cafeTableXs[i];
    const tz = 15.0;
    // Round Light Oak Cafe Table
    addBox(`cafe-table-leg-${i}`, [0.2, 0.8, 0.2], [tx, 0.4, tz], architecturalDark);
    addBox(`cafe-table-top-${i}`, [1.6, 0.08, 1.6], [tx, 0.8, tz], warmOak, { solid: true });
    // 2 Dining Chairs (Turquoise & Mustard)
    addBox(`cafe-chair-n-${i}`, [0.6, 0.5, 0.6], [tx, 0.25, tz + 1.1], "#2a9d8f", { solid: true });
    addBox(`cafe-chair-back-n-${i}`, [0.6, 0.5, 0.1], [tx, 0.7, tz + 1.35], "#2a9d8f", { solid: true });
    addBox(`cafe-chair-s-${i}`, [0.6, 0.5, 0.6], [tx, 0.25, tz - 1.1], "#e76f51", { solid: true });
    addBox(`cafe-chair-back-s-${i}`, [0.6, 0.5, 0.1], [tx, 0.7, tz - 1.35], "#e76f51", { solid: true });
  }

  // =========================================================================
  // 7. ZONE 3: SOUTH CONCOURSE - ARCADE & CINE-BOUTIQUE (Z = -32 to -18)
  // =========================================================================

  // A. "Pixel Palace" Neon Arcade (X in [-54, -38], Z in [-30, -20])
  const arcX = -46.0;
  const arcZ = -25.5;
  // Dark Titanium Arcade Enclosure Structure
  addBox("arcade-enclosure-wall-e", [0.4, 4.5, 9.6], [arcX + 7.0, 2.25, arcZ], architecturalDark, { solid: true });
  addBox("arcade-enclosure-wall-w", [0.4, 4.5, 9.6], [arcX - 7.0, 2.25, arcZ], architecturalDark, { solid: true });
  addBox("arcade-portal-header", [14.4, 1.2, 0.6], [arcX, 4.0, arcZ + 4.8], architecturalDark, { solid: true });
  // Glowing Neon Entrance Portal
  addBox("arcade-neon-portal-frame", [14.0, 0.15, 0.1], [arcX, 4.5, arcZ + 5.1], neonPink, {
    emissive: neonPink,
    emissiveIntensity: 2.2,
  });
  // Arcade Signboard: "PIXEL PALACE ARCADE"
  addBox("arcade-signboard", [9.6, 0.9, 0.2], [arcX, 3.9, arcZ + 5.2], "#000000");
  addBox("arcade-sign-neon", [9.0, 0.7, 0.05], [arcX, 3.9, arcZ + 5.32], neonCyan, {
    emissive: neonCyan,
    emissiveIntensity: 2.5,
  });

  // Authentic Glowing Arcade Cabinets (4 Cabinets in a row)
  const cabColors = [neonPink, neonCyan, neonAmber, "#9d4edd"];
  for (let c = 0; c < 4; c++) {
    const cx = arcX - 4.5 + c * 3.0;
    const cz = arcZ + 1.2;
    // Cabinet Body
    addBox(`arcade-cab-body-${c}`, [1.4, 2.2, 1.4], [cx, 1.1, cz], architecturalDark, { solid: true });
    // Screen (Angled illuminated display)
    addBox(`arcade-cab-screen-${c}`, [1.2, 0.8, 0.1], [cx, 1.4, cz - 0.6], cabColors[c], {
      emissive: cabColors[c],
      emissiveIntensity: 2.0,
    });
    // Control Deck
    addBox(`arcade-cab-deck-${c}`, [1.3, 0.15, 0.6], [cx, 0.9, cz - 0.8], "#222222");
    // Joystick & Buttons Glow
    addBox(`arcade-cab-controls-${c}`, [0.9, 0.08, 0.3], [cx, 1.0, cz - 0.8], neonPink, {
      emissive: neonPink,
      emissiveIntensity: 1.8,
    });
    // Lighted Top Marquee
    addBox(`arcade-cab-marquee-${c}`, [1.3, 0.35, 0.2], [cx, 2.1, cz - 0.6], cabColors[c], {
      emissive: cabColors[c],
      emissiveIntensity: 1.8,
    });
  }

  // Neon Claw Machine (Centerpiece of arcade)
  addBox("arcade-claw-body", [2.2, 2.6, 2.0], [arcX, 1.3, arcZ - 3.2], architecturalDark, { solid: true });
  addBox("arcade-claw-glass", [2.0, 1.4, 1.8], [arcX, 1.8, arcZ - 3.2], glassRail);
  // Interior Glowing Showcase
  addBox("arcade-claw-glow", [1.8, 0.1, 1.6], [arcX, 1.15, arcZ - 3.2], neonAmber, {
    emissive: neonAmber,
    emissiveIntensity: 2.0,
  });

  // Glowing Air Hockey Table
  addBox("arcade-hockey-body", [3.2, 0.8, 1.8], [arcX + 4.5, 0.4, arcZ - 2.8], architecturalDark, { solid: true });
  addBox("arcade-hockey-surface", [3.0, 0.05, 1.6], [arcX + 4.5, 0.82, arcZ - 2.8], "#ffffff");
  addBox("arcade-hockey-glow-rim", [3.1, 0.1, 1.7], [arcX + 4.5, 0.85, arcZ - 2.8], neonCyan, {
    emissive: neonCyan,
    emissiveIntensity: 1.8,
  });

  // B. "Cine-Vault" Movie Memorabilia Boutique (X in [-36, -22], Z in [-30, -20])
  const boutX = -29.0;
  const boutZ = -25.5;
  // Glass Boutique Storefront Walls
  addBox("boutique-wall-e", [0.4, 4.5, 9.6], [boutX + 6.5, 2.25, boutZ], architecturalDark, { solid: true });
  addBox("boutique-portal-header", [13.4, 1.2, 0.6], [boutX, 4.0, boutZ + 4.8], architecturalDark, { solid: true });
  // Signboard: "CINE-VAULT COLLECTIBLES"
  addBox("boutique-sign-frame", [10.0, 0.8, 0.2], [boutX, 4.0, boutZ + 5.1], brassGold);
  addBox("boutique-sign-text", [9.4, 0.6, 0.05], [boutX, 4.0, boutZ + 5.22], "#ffffff", {
    emissive: "#ffe3a8",
    emissiveIntensity: 1.8,
  });

  // Display Vitrines & Prop Pedestals with Spotlights
  const vitrineXs = [boutX - 3.8, boutX, boutX + 3.8];
  const vitrineProps = ["#d90429", "#00b4d8", "#e6b800"]; // Red Iron Man, Blue Sci-Fi, Gold Oscar/Trophy
  for (let v = 0; v < vitrineXs.length; v++) {
    const vx = vitrineXs[v];
    // Marble Pedestal
    addBox(`boutique-pedestal-${v}`, [1.2, 1.1, 1.2], [vx, 0.55, boutZ + 0.8], marbleIvory, { solid: true });
    // Glass Showcase Box
    addBox(`boutique-glass-case-${v}`, [1.1, 1.1, 1.1], [vx, 1.65, boutZ + 0.8], glassRail);
    // Glowing Trophy / Prop inside
    addBox(`boutique-prop-${v}`, [0.5, 0.7, 0.5], [vx, 1.5, boutZ + 0.8], vitrineProps[v], {
      emissive: vitrineProps[v],
      emissiveIntensity: 1.5,
      metalness: 0.8,
    });
  }

  // Backlit Movie Poster Lightboxes inside boutique
  for (let p = -1; p <= 1; p++) {
    addBox(`boutique-poster-${p}`, [2.4, 3.2, 0.15], [boutX + p * 3.6, 2.2, boutZ - 4.2], "#111111");
    addBox(`boutique-poster-art-${p}`, [2.2, 3.0, 0.05], [boutX + p * 3.6, 2.2, boutZ - 4.1], p === 0 ? neonCyan : neonPink, {
      emissive: p === 0 ? "#0096c7" : "#c1121f",
      emissiveIntensity: 1.2,
    });
  }

  // =========================================================================
  // 8. ZONE 4: EAST CONCOURSE - MONUMENTAL CINEMA ANCHOR & SCREEN 1
  // =========================================================================
  // A. Monumental Cinema Anchor Facade (Spans X = -4.0 to 2.2, Z in [-22, 22], Height 12m)
  const facadeX = -1.0;
  // Massive Architectural Dark Titanium Framing
  addBox("cinema-facade-main-n", [2.6, 12.0, 18.0], [facadeX, 6.0, 12.5], architecturalDark, { solid: true });
  addBox("cinema-facade-main-s", [2.6, 12.0, 18.0], [facadeX, 6.0, -12.5], architecturalDark, { solid: true });
  // Bridge Header above Entrance Portal
  addBox("cinema-facade-bridge", [2.6, 7.8, 7.0], [facadeX, 8.1, 0], architecturalDark, { solid: true });

  // Vertical Gold Brass Architectural Flutes across facade
  for (let z = -20; z <= 20; z += 4) {
    if (Math.abs(z) > 4) {
      addBox(`cinema-facade-flute-w-${z}`, [0.3, 12.0, 0.6], [facadeX - 1.4, 6.0, z], brassGold);
    }
  }

  // Monumental Illuminated Marquee: "★ CINE-WORLD IMAX CINEMAS ★"
  addBox("cinema-marquee-backing", [0.4, 1.8, 22.0], [facadeX - 1.5, 9.8, 0], "#0b0c10");
  addBox("cinema-marquee-gold-trim", [0.5, 2.0, 22.4], [facadeX - 1.45, 9.8, 0], brassGold);
  addBox("cinema-marquee-letters", [0.15, 1.2, 21.0], [facadeX - 1.75, 9.8, 0], "#ffffff", {
    emissive: "#ffeaa7",
    emissiveIntensity: 2.6, // Brilliant warm gold illumination
  });

  // Secondary Subtitle Sign: "SCREEN 1 · THE ULTIMATE IMAX EXPERIENCE"
  addBox("cinema-marquee-sub-backing", [0.3, 0.7, 18.0], [facadeX - 1.48, 8.2, 0], "#050608");
  addBox("cinema-marquee-sub-letters", [0.12, 0.45, 17.2], [facadeX - 1.66, 8.2, 0], imaxBlue, {
    emissive: "#00b4d8",
    emissiveIntensity: 2.2,
  });

  // Screen 1 Grand Entrance Portal Arch (X = 2.2, Z in [-2.6, 2.6], Y in [0, 4.2])
  // Glowing Double Neon Runner Arches
  addBox("cinema-portal-arch-top", [1.0, 0.25, 5.8], [facadeX - 1.2, 4.2, 0], imaxBlue, {
    emissive: "#00d0ff",
    emissiveIntensity: 2.0,
  });
  addBox("cinema-portal-arch-left", [1.0, 4.2, 0.25], [facadeX - 1.2, 2.1, 2.8], imaxBlue, {
    emissive: "#00d0ff",
    emissiveIntensity: 2.0,
  });
  addBox("cinema-portal-arch-right", [1.0, 4.2, 0.25], [facadeX - 1.2, 2.1, -2.8], imaxBlue, {
    emissive: "#00d0ff",
    emissiveIntensity: 2.0,
  });

  // B. Grand Red Carpet Avenue (from Central Atrium X = -28.0 straight into Screen 1 X = 2.2)
  const carpetLen = 30.2;
  const carpetCenterX = (-28.0 + 2.2) / 2; // -12.9m
  const carpetWidth = 5.2;

  // Plush Scarlet Red Carpet Runner
  addBox("cinema-red-carpet", [carpetLen, 0.03, carpetWidth], [carpetCenterX, 0.02, 0], redCarpet, {
    roughness: 0.85,
  });
  // Golden Brass Edging Borders along Red Carpet
  addBox("cinema-carpet-gold-n", [carpetLen, 0.035, 0.15], [carpetCenterX, 0.022, carpetWidth / 2], brassGold);
  addBox("cinema-carpet-gold-s", [carpetLen, 0.035, 0.15], [carpetCenterX, 0.022, -carpetWidth / 2], brassGold);

  // Polished Gold Stanchions & Velvet Ropes flanking Red Carpet
  for (let x = -26; x <= 0; x += 3.5) {
    for (const side of [1, -1]) {
      const sz = side * (carpetWidth / 2 + 0.35);
      // Stanchion Base & Pole
      addBox(`stanchion-base-${x}-${side}`, [0.4, 0.1, 0.4], [x, 0.05, sz], brassGold, { solid: true });
      addBox(`stanchion-pole-${x}-${side}`, [0.1, 1.0, 0.1], [x, 0.55, sz], brassGold, {
        metalness: 0.9,
        roughness: 0.15,
      });
      addBox(`stanchion-sphere-${x}-${side}`, [0.2, 0.2, 0.2], [x, 1.1, sz], brassGold, {
        metalness: 0.9,
        roughness: 0.15,
      });
      // Velvet Rope Segment
      if (x < 0) {
        addBox(`stanchion-rope-${x}-${side}`, [3.5, 0.08, 0.08], [x + 1.75, 0.95, sz], redCarpet);
      }
    }
  }

  // C. Digital Touchscreen Ticket Totems flanking Cinema Entrance
  const totemCoords = [
    [-5.0, 4.8],
    [-7.5, 5.8],
    [-5.0, -4.8],
    [-7.5, -5.8],
  ];
  for (let t = 0; t < totemCoords.length; t++) {
    const [tx, tz] = totemCoords[t];
    // Sleek Gloss Black Totem Body
    addBox(`ticket-totem-body-${t}`, [0.6, 2.0, 0.8], [tx, 1.0, tz], architecturalDark, { solid: true });
    // Angled Glowing Screen
    addBox(`ticket-totem-screen-${t}`, [0.1, 1.1, 0.65], [tx - 0.28, 1.25, tz], imaxBlue, {
      emissive: "#00b4d8",
      emissiveIntensity: 2.2,
    });
    // Base Plinth
    addBox(`ticket-totem-plinth-${t}`, [0.8, 0.1, 1.0], [tx, 0.05, tz], brassGold);
  }

  // D. Blockbuster Movie Poster Lightboxes on Cinema Columns
  const posterZList = [7.5, 11.5, 15.5, -7.5, -11.5, -15.5];
  for (let p = 0; p < posterZList.length; p++) {
    const pz = posterZList[p];
    addBox(`cinema-poster-frame-${p}`, [0.2, 3.2, 2.2], [facadeX - 1.4, 4.2, pz], architecturalDark);
    addBox(`cinema-poster-art-${p}`, [0.1, 3.0, 2.0], [facadeX - 1.52, 4.2, pz], p % 2 === 0 ? imaxBlue : neonPink, {
      emissive: p % 2 === 0 ? "#0077b6" : "#c1121f",
      emissiveIntensity: 1.5,
    });
  }

  // =========================================================================
  // 9. ZONE 5: WEST ENTRANCE WAYFINDING & INFORMATION TOTEM
  // =========================================================================
  // Grand Interactive Mall Directory Totem at West Entrance
  const dirX = -58.0;
  const dirZ = 0.0;
  addBox("mall-dir-plinth", [1.2, 0.2, 2.6], [dirX, 0.1, dirZ], brassGold, { solid: true });
  addBox("mall-dir-monolith", [0.8, 2.4, 2.2], [dirX, 1.3, dirZ], architecturalDark, { solid: true });
  // Glowing Touchscreen Directory Map
  addBox("mall-dir-screen", [0.1, 1.6, 1.8], [dirX + 0.38, 1.4, dirZ], neonCyan, {
    emissive: "#00b4d8",
    emissiveIntensity: 1.8,
  });

  // =========================================================================
  // 10. ARCHITECTURAL LIGHTS (High-End Interior Mall Illumination)
  // =========================================================================
  // Central Atrium Skylight Chandelier Glow
  addLight([atriumX, 11.0, atriumZ], "#fff5db", 45, 35);

  // Red Carpet Avenue Lighting
  addLight([-18.0, 6.0, 0.0], "#ffe8c2", 30, 25);
  addLight([-5.0, 5.5, 0.0], "#00d0ff", 35, 20); // Cinema portal blue entrance glow

  // Food Court & Cafe Lighting (North Wing)
  addLight([popX, 5.0, popZ], "#fff0cc", 35, 25);
  addLight([gelX, 5.0, gelZ], "#e0fbfc", 35, 25);

  // Arcade & Boutique Lighting (South Wing)
  addLight([arcX, 5.0, arcZ], "#ff007f", 40, 25);
  addLight([boutX, 5.0, boutZ], "#ffe8c2", 35, 25);

  // Mezzanine Upper Floor Spotlights
  addLight([mallCenterX, 8.0, 24.0], "#fff9e6", 30, 25);
  addLight([mallCenterX, 8.0, -24.0], "#fff9e6", 30, 25);

  // West Entrance Lobby Light
  addLight([-60.0, 6.0, 0.0], "#fff5db", 30, 25);
}
