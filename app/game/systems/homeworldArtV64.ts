import type { HomeworldNativeBuildingArtV64 } from "./homeworldGeometryV64";
import brazierV69 from '../data/homeworldBrazierV69.json';

/** Original V64 architecture. Native PNGs remain unchanged; all sockets use source pixels.
 * These are game adaptations, not canonical 1:1 descriptions of Yautja dwellings. */
export const HOMEWORLD_BUILDING_ART_V64 = {
  "house-a": {
    "src": "/game/homeworld/v64/house-a-basalt.png",
    "sourceWidth": 1164,
    "sourceHeight": 1351,
    "alphaBounds": {
      "x": 5,
      "y": 63,
      "width": 1155,
      "height": 1207
    },
    "foundationFront": {
      "left": 12,
      "right": 1152,
      "y": 1260
    },
    "threshold": {
      "x": 584,
      "y": 1250
    },
    "doorway": {
      "x": 444,
      "y": 839,
      "width": 275,
      "height": 409
    },
    "footprintWorld": {
      "width": 360,
      "depth": 240
    },
    "wallHeightWorld": 258,
    "sha256": "04d5cc33ec9b42548de1b3d352cc56d4182b921e694faf6fd9946e13ee407e84",
    "measurementStatus": "painted-support-and-inscribed-passage-visually-measured-native-pixels"
  },
  "house-b": {
    "src": "/game/homeworld/v64/house-b-basalt.png",
    "sourceWidth": 1161,
    "sourceHeight": 1355,
    "alphaBounds": {
      "x": 15,
      "y": 72,
      "width": 1133,
      "height": 1195
    },
    "foundationFront": {
      "left": 20,
      "right": 1140,
      "y": 1260
    },
    "threshold": {
      "x": 580,
      "y": 1213
    },
    "doorway": {
      "x": 480,
      "y": 850,
      "width": 205,
      "height": 363
    },
    "footprintWorld": {
      "width": 440,
      "depth": 260
    },
    "wallHeightWorld": 298,
    "sha256": "a5354df52b86c6994d4c0ade9db91822a9501b352af6b9b9b5d8c41c4645d746",
    "measurementStatus": "painted-support-and-inscribed-passage-visually-measured-native-pixels"
  },
  "house-c": {
    "src": "/game/homeworld/v64/house-c-ribbed.png",
    "sourceWidth": 1024,
    "sourceHeight": 1536,
    "alphaBounds": {
      "x": 69,
      "y": 99,
      "width": 887,
      "height": 1274
    },
    "foundationFront": {
      "left": 70,
      "right": 954,
      "y": 1370
    },
    "threshold": {
      "x": 512,
      "y": 1350
    },
    "doorway": {
      "x": 384,
      "y": 884,
      "width": 252,
      "height": 450
    },
    "footprintWorld": {
      "width": 300,
      "depth": 220
    },
    "wallHeightWorld": 204,
    "sha256": "d25853dc12b4bb598e33ef1fb3736cce1ea23b0eec2559aa076a941c94c65996",
    "measurementStatus": "painted-support-and-inscribed-passage-visually-measured-native-pixels"
  },
  "civic-hall": {
    "src": "/game/homeworld/v64/civic-hall.png",
    "sourceWidth": 1536,
    "sourceHeight": 1024,
    "alphaBounds": {
      "x": 18,
      "y": 7,
      "width": 1500,
      "height": 997
    },
    "sha256": "b6421a0a01379ce6fcb869dc0ff4530a1282b9a076f88b8bd19e26cca5bbb29e",
    "foundationFront": {
      "left": 44,
      "right": 1491,
      "y": 997
    },
    "threshold": {
      "x": 768,
      "y": 985
    },
    "doorway": {
      "x": 650,
      "y": 650,
      "width": 236,
      "height": 335
    },
    "footprintWorld": {
      "width": 570,
      "depth": 340
    },
    "wallHeightWorld": 242,
    "measurementStatus": "painted-support-and-inscribed-passage-visually-measured-native-pixels"
  },
  "civic-forge": {
    "src": "/game/homeworld/v64/civic-forge.png",
    "sourceWidth": 1254,
    "sourceHeight": 1254,
    "alphaBounds": {
      "x": 15,
      "y": 23,
      "width": 1225,
      "height": 1167
    },
    "sha256": "2120df8219447ea111dc7ea6fe4a738d8bc299210105f7f352057a483a043778",
    "foundationFront": {
      "left": 18,
      "right": 1238,
      "y": 1184
    },
    "threshold": {
      "x": 627,
      "y": 1125
    },
    "doorway": {
      "x": 515,
      "y": 828,
      "width": 222,
      "height": 297
    },
    "footprintWorld": {
      "width": 570,
      "depth": 340
    },
    "wallHeightWorld": 268,
    "measurementStatus": "painted-support-and-inscribed-passage-visually-measured-native-pixels"
  }
} as const satisfies Readonly<Record<string, HomeworldNativeBuildingArtV64>>;

/** heightWorld means PAINTED height including projected depth; cell pivots are LOCAL pixels. */
export const HOMEWORLD_PROP_ART_V64 = {
  'brazier-v69': { ...brazierV69, physicalHeightWorldEstimate: 70 },
  "bench": {
    "src": "/game/homeworld/v64/props-atlas.png",
    "sourceWidth": 1254,
    "sourceHeight": 1254,
    "alphaBounds": {
      "x": 11,
      "y": 268,
      "width": 420,
      "height": 140
    },
    "sha256": "65cab4e4edb9b0e393751b20d4b8a8790f46e9206b53f2a52a58e175b03974c4",
    "sourceRect": {
      "x": 0,
      "y": 0,
      "width": 445,
      "height": 430
    },
    "pivot": {
      "x": 220,
      "y": 404
    },
    "footprintWorld": {
      "width": 150,
      "depth": 40
    },
    "heightWorld": 50,
    "scaleWorldPerPixel": 0.35714285714285715,
    "physicalHeightWorldEstimate": 27.057,
    "measurementStatus": "native-cell-alpha-exact-support-pixel-visually-measured"
  },
  "chest": {
    "src": "/game/homeworld/v64/props-atlas.png",
    "sourceWidth": 1254,
    "sourceHeight": 1254,
    "alphaBounds": {
      "x": 25,
      "y": 211,
      "width": 324,
      "height": 197
    },
    "sha256": "65cab4e4edb9b0e393751b20d4b8a8790f46e9206b53f2a52a58e175b03974c4",
    "sourceRect": {
      "x": 445,
      "y": 0,
      "width": 380,
      "height": 430
    },
    "pivot": {
      "x": 186,
      "y": 405
    },
    "footprintWorld": {
      "width": 80,
      "depth": 44
    },
    "heightWorld": 48.641975,
    "scaleWorldPerPixel": 0.24691358024691357,
    "physicalHeightWorldEstimate": 23.405,
    "measurementStatus": "native-cell-alpha-exact-support-pixel-visually-measured"
  },
  "locker": {
    "src": "/game/homeworld/v64/props-atlas.png",
    "sourceWidth": 1254,
    "sourceHeight": 1254,
    "alphaBounds": {
      "x": 110,
      "y": 12,
      "width": 236,
      "height": 395
    },
    "sha256": "65cab4e4edb9b0e393751b20d4b8a8790f46e9206b53f2a52a58e175b03974c4",
    "sourceRect": {
      "x": 825,
      "y": 0,
      "width": 429,
      "height": 430
    },
    "pivot": {
      "x": 227,
      "y": 403
    },
    "footprintWorld": {
      "width": 70,
      "depth": 45
    },
    "heightWorld": 117.161017,
    "scaleWorldPerPixel": 0.2966101694915254,
    "physicalHeightWorldEstimate": 91.35,
    "measurementStatus": "native-cell-alpha-exact-support-pixel-visually-measured"
  },
  "console": {
    "src": "/game/homeworld/v64/props-atlas.png",
    "sourceWidth": 1254,
    "sourceHeight": 1254,
    "alphaBounds": {
      "x": 54,
      "y": 62,
      "width": 297,
      "height": 293
    },
    "sha256": "65cab4e4edb9b0e393751b20d4b8a8790f46e9206b53f2a52a58e175b03974c4",
    "sourceRect": {
      "x": 0,
      "y": 450,
      "width": 425,
      "height": 375
    },
    "pivot": {
      "x": 204,
      "y": 350
    },
    "footprintWorld": {
      "width": 100,
      "depth": 55
    },
    "heightWorld": 98.653199,
    "scaleWorldPerPixel": 0.3367003367003367,
    "physicalHeightWorldEstimate": 67.106,
    "measurementStatus": "native-cell-alpha-exact-support-pixel-visually-measured"
  },
  "workshop": {
    "src": "/game/homeworld/v64/props-atlas.png",
    "sourceWidth": 1254,
    "sourceHeight": 1254,
    "alphaBounds": {
      "x": 19,
      "y": 47,
      "width": 356,
      "height": 294
    },
    "sha256": "65cab4e4edb9b0e393751b20d4b8a8790f46e9206b53f2a52a58e175b03974c4",
    "sourceRect": {
      "x": 430,
      "y": 450,
      "width": 390,
      "height": 375
    },
    "pivot": {
      "x": 195,
      "y": 338
    },
    "footprintWorld": {
      "width": 130,
      "depth": 75
    },
    "heightWorld": 107.359551,
    "scaleWorldPerPixel": 0.3651685393258427,
    "physicalHeightWorldEstimate": 64.341,
    "measurementStatus": "native-cell-alpha-exact-support-pixel-visually-measured"
  },
  "cot": {
    "src": "/game/homeworld/v64/props-atlas.png",
    "sourceWidth": 1254,
    "sourceHeight": 1254,
    "alphaBounds": {
      "x": 5,
      "y": 166,
      "width": 419,
      "height": 177
    },
    "sha256": "65cab4e4edb9b0e393751b20d4b8a8790f46e9206b53f2a52a58e175b03974c4",
    "sourceRect": {
      "x": 820,
      "y": 450,
      "width": 434,
      "height": 375
    },
    "pivot": {
      "x": 215,
      "y": 340
    },
    "footprintWorld": {
      "width": 160,
      "depth": 70
    },
    "heightWorld": 67.589499,
    "scaleWorldPerPixel": 0.3818615751789976,
    "physicalHeightWorldEstimate": 27.439,
    "measurementStatus": "native-cell-alpha-exact-support-pixel-visually-measured"
  },
  "table": {
    "src": "/game/homeworld/v64/props-atlas.png",
    "sourceWidth": 1254,
    "sourceHeight": 1254,
    "alphaBounds": {
      "x": 17,
      "y": 123,
      "width": 404,
      "height": 228
    },
    "sha256": "65cab4e4edb9b0e393751b20d4b8a8790f46e9206b53f2a52a58e175b03974c4",
    "sourceRect": {
      "x": 0,
      "y": 850,
      "width": 440,
      "height": 404
    },
    "pivot": {
      "x": 220,
      "y": 347
    },
    "footprintWorld": {
      "width": 150,
      "depth": 100
    },
    "heightWorld": 84.653465,
    "scaleWorldPerPixel": 0.3712871287128713,
    "physicalHeightWorldEstimate": 27.296,
    "measurementStatus": "native-cell-alpha-exact-support-pixel-visually-measured"
  },
  "rock-plant": {
    "src": "/game/homeworld/v64/props-atlas.png",
    "sourceWidth": 1254,
    "sourceHeight": 1254,
    "alphaBounds": {
      "x": 5,
      "y": 25,
      "width": 373,
      "height": 340
    },
    "sha256": "65cab4e4edb9b0e393751b20d4b8a8790f46e9206b53f2a52a58e175b03974c4",
    "sourceRect": {
      "x": 440,
      "y": 850,
      "width": 395,
      "height": 404
    },
    "pivot": {
      "x": 197,
      "y": 361
    },
    "footprintWorld": {
      "width": 130,
      "depth": 85
    },
    "heightWorld": 118.49866,
    "scaleWorldPerPixel": 0.3485254691689008,
    "physicalHeightWorldEstimate": 69.745,
    "measurementStatus": "native-cell-alpha-exact-support-pixel-visually-measured"
  },
  "beacon": {
    "src": "/game/homeworld/v64/props-atlas.png",
    "sourceWidth": 1254,
    "sourceHeight": 1254,
    "alphaBounds": {
      "x": 108,
      "y": 46,
      "width": 213,
      "height": 310
    },
    "sha256": "65cab4e4edb9b0e393751b20d4b8a8790f46e9206b53f2a52a58e175b03974c4",
    "sourceRect": {
      "x": 835,
      "y": 850,
      "width": 419,
      "height": 404
    },
    "pivot": {
      "x": 213,
      "y": 355
    },
    "footprintWorld": {
      "width": 48,
      "depth": 45
    },
    "heightWorld": 69.859155,
    "scaleWorldPerPixel": 0.22535211267605634,
    "physicalHeightWorldEstimate": 44.048,
    "measurementStatus": "native-cell-alpha-exact-support-pixel-visually-measured"
  }
} as const;

export const HOMEWORLD_GROUND_ART_V64 = {
  "src": "/game/homeworld/v64/pavement.png",
  "sourceWidth": 1254,
  "sourceHeight": 1254,
  "alphaBounds": {
    "x": 0,
    "y": 0,
    "width": 1254,
    "height": 1254
  },
  "sha256": "414a369373962988a17e292fba5f0b970efd7d2be606d1a76c9eccc2e43f9674",
  "projection": "top-down-material-project-ground-at-runtime",
  "tileWorldSize": 180,
  "seamlessStatus": "requested-native-not-yet-repeat-verified"
} as const;

/** Modular cutaway panels: never stretch their vertical dimension to resize a room. */
export const HOMEWORLD_INTERIOR_ART_V64 = {
  "north": {
    "src": "/game/homeworld/v64/interior-panels.png",
    "sourceWidth": 1536,
    "sourceHeight": 1024,
    "alphaBounds": {
      "x": 37,
      "y": 38,
      "width": 805,
      "height": 673
    },
    "sha256": "cfa204f776d84849b38ea25bcd19d879aa469406bf0ab4c384baabd179de4a21",
    "sourceRect": {
      "x": 20,
      "y": 120,
      "width": 870,
      "height": 740
    },
    "pivot": {
      "x": 440,
      "y": 709
    },
    "heightWorld": 150.48447204968946,
    "scaleWorldPerPixel": 0.2236024844720497,
    "footprintWorld": {
      "width": 180,
      "depth": 16
    },
    "moduleLengthWorld": 180,
    "cutawayWallHeightWorld": 150,
    "measurementStatus": "native-cell-alpha-exact-support-pixel-visually-measured"
  },
  "west": {
    "src": "/game/homeworld/v64/interior-panels.png",
    "sourceWidth": 1536,
    "sourceHeight": 1024,
    "alphaBounds": {
      "x": 24,
      "y": 32,
      "width": 109,
      "height": 681
    },
    "sha256": "cfa204f776d84849b38ea25bcd19d879aa469406bf0ab4c384baabd179de4a21",
    "sourceRect": {
      "x": 1000,
      "y": 120,
      "width": 160,
      "height": 740
    },
    "pivot": {
      "x": 78,
      "y": 709
    },
    "heightWorld": 152.27329192546586,
    "scaleWorldPerPixel": 0.2236024844720497,
    "footprintWorld": {
      "width": 24.372670807453417,
      "depth": 180
    },
    "moduleLengthWorld": 180,
    "cutawayWallHeightWorld": 49.02953338227756,
    "measurementStatus": "native-cell-alpha-exact-support-pixel-visually-measured"
  },
  "east": {
    "src": "/game/homeworld/v64/interior-panels.png",
    "sourceWidth": 1536,
    "sourceHeight": 1024,
    "alphaBounds": {
      "x": 21,
      "y": 32,
      "width": 109,
      "height": 680
    },
    "sha256": "cfa204f776d84849b38ea25bcd19d879aa469406bf0ab4c384baabd179de4a21",
    "sourceRect": {
      "x": 1290,
      "y": 120,
      "width": 160,
      "height": 740
    },
    "pivot": {
      "x": 79,
      "y": 709
    },
    "heightWorld": 152.0496894409938,
    "scaleWorldPerPixel": 0.2236024844720497,
    "footprintWorld": {
      "width": 24.372670807453417,
      "depth": 180
    },
    "moduleLengthWorld": 180,
    "cutawayWallHeightWorld": 48.80593089780551,
    "measurementStatus": "native-cell-alpha-exact-support-pixel-visually-measured"
  },
  "floor": {
    "src": "/game/homeworld/v64/pavement.png",
    "sourceWidth": 1254,
    "sourceHeight": 1254,
    "alphaBounds": {
      "x": 0,
      "y": 0,
      "width": 1254,
      "height": 1254
    },
    "sha256": "414a369373962988a17e292fba5f0b970efd7d2be606d1a76c9eccc2e43f9674",
    "projection": "top-down-material-project-ground-at-runtime",
    "tileWorldSize": 180,
    "seamlessStatus": "requested-native-not-yet-repeat-verified"
  }
} as const;

/** Pad is top-down ground material. Shuttle is already projected and must not be flattened. */
export const HOMEWORLD_TRANSPORT_ART_V64 = {
  "clan-shuttle": {
    "src": "/game/homeworld/v64/clan-shuttle.png",
    "sourceWidth": 1536,
    "sourceHeight": 1024,
    "alphaBounds": {
      "x": 51,
      "y": 55,
      "width": 1435,
      "height": 882
    },
    "sha256": "c9868a99fc4af4716150cdecbdeda502e662fd8bcc6334acfa3f0055c59deedd",
    "sourceRect": {
      "x": 0,
      "y": 0,
      "width": 1536,
      "height": 1024
    },
    "pivot": {
      "x": 768,
      "y": 930
    },
    "heightWorld": 331.9024390243903,
    "scaleWorldPerPixel": 0.37630662020905925,
    "footprintWorld": {
      "width": 540,
      "depth": 380
    },
    "projection": "preprojected-orthographic-yaw0-pitch35",
    "loreStatus": "original-logistics-craft-not-selected-flagship"
  },
  "landing-pad": {
    "src": "/game/homeworld/v64/landing-pad.png",
    "sourceWidth": 1415,
    "sourceHeight": 1111,
    "alphaBounds": {
      "x": 48,
      "y": 75,
      "width": 1320,
      "height": 950
    },
    "sha256": "19c7e9b1775c847800716b364ce92e217d9ffb009c99e014ca831de9316336f2",
    "sourceRect": {
      "x": 0,
      "y": 0,
      "width": 1415,
      "height": 1111
    },
    "pivot": {
      "x": 708,
      "y": 550
    },
    "scaleWorldPerPixel": 0.7575757575757576,
    "footprintWorld": {
      "width": 1000,
      "depth": 719.6969696969697
    },
    "reservedFootprintWorld": {
      "width": 1000,
      "depth": 760
    },
    "renderWidthWorld": 1071.969696969697,
    "renderDepthWorld": 841.6666666666666,
    "southThreshold": {
      "x": 708,
      "y": 1021
    },
    "projection": "top-down-ground-project-y-by-sin35",
    "loreStatus": "original-logistics-ground-module"
  }
} as const;
