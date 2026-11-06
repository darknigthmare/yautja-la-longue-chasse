// Generated individual sprites. Bounds use alpha > 8; pivots are measured visible-bottom-center heuristics.
// These are technical metadata, not human validation of canonical fidelity or camera angle.
export const SHIP_INTERIOR_25D_ART = {
  "navigationConsole": {
    "src": "/game/ship-interior/v23/navigation-console.webp",
    "sourceWidth": 1536,
    "sourceHeight": 1024,
    "alphaBounds": {
      "x": 40,
      "y": 131,
      "width": 1456,
      "height": 801
    },
    "pivot": {
      "x": 768,
      "y": 931,
      "method": "alpha-bounds-bottom-center"
    },
    "humanArtValidation": false
  },
  "medbayBed": {
    "src": "/game/ship-interior/v23/medbay-bed.webp",
    "sourceWidth": 1774,
    "sourceHeight": 887,
    "alphaBounds": {
      "x": 111,
      "y": 35,
      "width": 1551,
      "height": 828
    },
    "pivot": {
      "x": 886.5,
      "y": 862,
      "method": "alpha-bounds-bottom-center"
    },
    "humanArtValidation": false
  },
  "armoryRack": {
    "src": "/game/ship-interior/v23/armory-rack.webp",
    "sourceWidth": 1536,
    "sourceHeight": 1024,
    "alphaBounds": {
      "x": 35,
      "y": 130,
      "width": 1465,
      "height": 776
    },
    "pivot": {
      "x": 767.5,
      "y": 905,
      "method": "alpha-bounds-bottom-center"
    },
    "humanArtValidation": false
  },
  "forgeStation": {
    "src": "/game/ship-interior/v23/forge-station.webp",
    "sourceWidth": 1024,
    "sourceHeight": 1536,
    "alphaBounds": {
      "x": 33,
      "y": 66,
      "width": 959,
      "height": 1422
    },
    "pivot": {
      "x": 512.5,
      "y": 1487,
      "method": "alpha-bounds-bottom-center"
    },
    "humanArtValidation": false
  },
  "trophyPlinth": {
    "src": "/game/ship-interior/v23/trophy-plinth.webp",
    "sourceWidth": 1536,
    "sourceHeight": 1024,
    "alphaBounds": {
      "x": 305,
      "y": 217,
      "width": 925,
      "height": 681
    },
    "pivot": {
      "x": 767.5,
      "y": 897,
      "method": "alpha-bounds-bottom-center"
    },
    "humanArtValidation": false
  },
  "trainingEmitter": {
    "src": "/game/ship-interior/v23/training-emitter.webp",
    "sourceWidth": 1024,
    "sourceHeight": 1536,
    "alphaBounds": {
      "x": 178,
      "y": 267,
      "width": 669,
      "height": 1126
    },
    "pivot": {
      "x": 512.5,
      "y": 1392,
      "method": "alpha-bounds-bottom-center"
    },
    "humanArtValidation": false
  }
} as const;

// Exact overhead material: the scene renderer applies the floor projection once.
// Source PNG is reused unchanged at runtime after recovery from an unavailable local environment.
export const SHIP_INTERIOR_25D_FLOOR = {
  "src": "/game/ship-interior/v23/floor-panel.png",
  "width": 1254,
  "height": 1254,
  "projection": "top-down",
  "humanArtValidation": false
} as const;
