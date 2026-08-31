/**
 * Shared art contract for the side-view ship interior. All dimensions are SVG
 * world units, independent of the viewport and the current deck's width.
 * Collision and interactions stay in the deck, never in a background bitmap.
 */
export const SHIP_INTERIOR_KIT = {
  id: "yautja-ship-interior-v20",
  grid: 20,
  wall: {
    id: "corridor-wall",
    src: "/game/ship-interior/v20/corridor-wall.webp",
    sourceWidth: 1536,
    sourceHeight: 1024,
    width: 480,
    height: 320,
    pivot: { x: 0, y: 320 },
    repeat: "x",
    // Visible structural posts cover joins; the bitmap is not certified seamless.
    repeatStrategy: "covered-joints",
    jointCoverWidth: 20,
    layer: "background",
    collision: "none",
    sockets: {
      left: { x: 0, y: 320 },
      right: { x: 480, y: 320 },
      ceiling: { x: 240, y: 0 },
      floor: { x: 240, y: 320 },
      fixture: { x: 240, y: 192 },
    },
    // States use overlays; they do not imply additional generated image files.
    states: ["normal", "alert", "unpowered"],
  },
  floor: {
    id: "deck-floor",
    renderer: "geometry",
    width: 240,
    height: 26,
    pivot: { x: 0, y: 0 },
    collision: "top-surface",
    layer: "walkable",
    sockets: {
      left: { x: 0, y: 0 },
      right: { x: 240, y: 0 },
      fixture: { x: 120, y: 0 },
    },
  },
  gantry: {
    id: "upper-gantry",
    renderer: "geometry",
    width: 240,
    height: 18,
    pivot: { x: 0, y: 0 },
    collision: "one-way-top-surface",
    layer: "walkable",
    sockets: {
      left: { x: 0, y: 0 },
      right: { x: 240, y: 0 },
      ladder: { x: 120, y: 0 },
    },
  },
  // Door dimensions/state names are a contract, not a claim of implemented doors.
  door: {
    id: "bulkhead-door",
    renderer: "geometry",
    width: 120,
    height: 160,
    pivot: { x: 60, y: 160 },
    aperture: { x: 20, y: 16, width: 80, height: 144 },
    sockets: {
      threshold: { x: 60, y: 160 },
      control: { x: 116, y: 104 },
    },
    states: ["closed", "opening", "open", "closing", "locked"],
    frameLayer: "foreground",
    panelLayer: "interactive",
  },
} as const;

export type ShipInteriorWallState =
  (typeof SHIP_INTERIOR_KIT.wall.states)[number];
export type ShipInteriorDoorState =
  (typeof SHIP_INTERIOR_KIT.door.states)[number];
