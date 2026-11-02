export const SCREEN_TWO_LAYOUT = {
  // Room Enclosure (Centered at Z = -23.0)
  roomStartX: 2.2,
  roomEndX: 21.8,
  roomLength: 19.6,
  centerZ: -23.0,
  halfWidth: 8.5, // Total width 17.0m: Z from -31.5 to -14.5
  ceilingHeight: 5.4,
  baseFloorY: 0.0,

  // Sunken Conversation Lounge Pit (Tier 1)
  pitStartX: 11.8,
  pitEndX: 17.8,
  pitLength: 6.0,
  pitHalfWidth: 4.5, // Total width 9.0m: Z from -27.5 to -18.5
  pitFloorY: -0.40,
  pitCushionHeight: 0.28,

  // Tier 2 Platform (Mid-Rise Daybeds)
  tierTwoStartX: 6.8,
  tierTwoEndX: 11.0,
  tierTwoFloorY: 0.25,

  // Tier 3 Platform (Rear VIP Horizon Banquette)
  tierThreeStartX: 3.2,
  tierThreeEndX: 6.8,
  tierThreeFloorY: 0.50,

  // Curved Cinemascope Screen (2.40:1 Ultra-Widescreen)
  screenWidth: 11.0,
  screenHeight: 4.5,
  screenRadius: 18.0,
  screenBaseX: 21.2,
  screenCenterY: 2.4,
  get screenCircleCenterX() {
    return this.screenBaseX - this.screenRadius;
  },

  // Portal & Entrance
  portalX: 2.2,
  portalWidth: 3.6,
  portalHeight: 3.2,
};

