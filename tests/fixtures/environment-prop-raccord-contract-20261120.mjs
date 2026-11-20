/** Independent expectations for the 2026-11-20 raccord regression tests.
 * These literals state permitted families; tests never ask the production
 * compatibility predicate to manufacture their expected answer.
 * [] explicitly means that the legacy support keeps its existing native draw.
 * Ice room-plan ladders retain their separately authored crystal-column
 * approximation; a legacy ice ladder has no admitted exact V19 ladder.
 */
export const EXPECTED_LEGACY_CLIMB_FAMILIES = {
  "jungle": {
    "tree": [
      "buttress-trunk"
    ],
    "vine": [
      "hanging-vine"
    ],
    "rock-face": [],
    "ice-wall": [],
    "ladder": [
      "field-ladder"
    ],
    "rope": [],
    "chain": [],
    "basalt-column": []
  },
  "ice": {
    "tree": [],
    "vine": [],
    "rock-face": [
      "ice-wall"
    ],
    "ice-wall": [
      "ice-wall"
    ],
    "ladder": [],
    "rope": [
      "maintenance-rope"
    ],
    "chain": [],
    "basalt-column": []
  },
  "volcano": {
    "tree": [],
    "vine": [],
    "rock-face": [
      "basalt-column"
    ],
    "ice-wall": [],
    "ladder": [
      "ritual-ladder"
    ],
    "rope": [],
    "chain": [
      "suspended-chain"
    ],
    "basalt-column": [
      "basalt-column"
    ]
  },
  "swamp": {
    "tree": [
      "mangrove-trunk"
    ],
    "vine": [
      "hanging-root"
    ],
    "rock-face": [],
    "ice-wall": [],
    "ladder": [],
    "rope": [
      "salvage-rope"
    ],
    "chain": [],
    "basalt-column": []
  },
  "desert": {
    "tree": [],
    "vine": [],
    "rock-face": [
      "canyon-rock-face"
    ],
    "ice-wall": [],
    "ladder": [
      "mine-ladder"
    ],
    "rope": [
      "anchor-rope"
    ],
    "chain": [],
    "basalt-column": []
  },
  "ocean": {
    "tree": [],
    "vine": [],
    "rock-face": [],
    "ice-wall": [],
    "ladder": [
      "station-ladder"
    ],
    "rope": [
      "salvage-rope"
    ],
    "chain": [],
    "basalt-column": []
  },
  "fungal": {
    "tree": [
      "tower-gill"
    ],
    "vine": [
      "cord-vine"
    ],
    "rock-face": [],
    "ice-wall": [],
    "ladder": [
      "maintenance-ladder"
    ],
    "rope": [],
    "chain": [],
    "basalt-column": []
  },
  "ruins": {
    "tree": [],
    "vine": [],
    "rock-face": [
      "fractured-spire"
    ],
    "ice-wall": [],
    "ladder": [
      "service-ladder"
    ],
    "rope": [],
    "chain": [],
    "basalt-column": []
  }
};

export const EXPECTED_FEATURE_CLIMB_FAMILIES = {
  "jungle": {
    "tree": [
      "buttress-trunk"
    ],
    "vine": [
      "hanging-vine",
      "buttress-trunk",
      "field-ladder"
    ],
    "ladder": [
      "field-ladder",
      "buttress-trunk",
      "hanging-vine"
    ]
  },
  "ice": {
    "ice-wall": [
      "ice-wall",
      "crystal-column"
    ],
    "ladder": [
      "crystal-column",
      "ice-wall",
      "maintenance-rope"
    ],
    "rope": [
      "maintenance-rope",
      "crystal-column",
      "ice-wall"
    ]
  },
  "volcano": {
    "basalt-column": [
      "basalt-column"
    ],
    "ladder": [
      "ritual-ladder",
      "basalt-column",
      "suspended-chain"
    ],
    "chain": [
      "suspended-chain",
      "ritual-ladder",
      "basalt-column"
    ]
  },
  "swamp": {
    "tree": [
      "mangrove-trunk",
      "hanging-root",
      "salvage-rope"
    ]
  },
  "desert": {
    "rock-face": [
      "canyon-rock-face",
      "mine-ladder",
      "anchor-rope"
    ]
  },
  "ocean": {
    "rope": [
      "salvage-rope",
      "kelp-cable",
      "station-ladder"
    ]
  },
  "fungal": {
    "vine": [
      "cord-vine",
      "tower-gill",
      "maintenance-ladder"
    ]
  },
  "ruins": {
    "ladder": [
      "service-ladder",
      "magnetic-wall-rungs",
      "fractured-spire"
    ]
  }
};

/** A real room-plan kind admitting each produced family, including declared
 * partial-pack fallbacks. This does not force a wrong legacy support to show it. */
export const CLIMB_FAMILY_FEATURE_WITNESSES = {
  "jungle": {
    "buttress-trunk": "tree",
    "hanging-vine": "vine",
    "field-ladder": "ladder"
  },
  "ice": {
    "ice-wall": "ice-wall",
    "crystal-column": "ladder",
    "maintenance-rope": "rope"
  },
  "volcano": {
    "basalt-column": "basalt-column",
    "ritual-ladder": "ladder",
    "suspended-chain": "chain"
  },
  "swamp": {
    "mangrove-trunk": "tree",
    "hanging-root": "tree",
    "salvage-rope": "tree"
  },
  "desert": {
    "canyon-rock-face": "rock-face",
    "mine-ladder": "rock-face",
    "anchor-rope": "rock-face"
  },
  "ocean": {
    "salvage-rope": "rope",
    "kelp-cable": "rope",
    "station-ladder": "rope"
  },
  "fungal": {
    "cord-vine": "vine",
    "tower-gill": "vine",
    "maintenance-ladder": "vine"
  },
  "ruins": {
    "service-ladder": "ladder",
    "magnetic-wall-rungs": "ladder",
    "fractured-spire": "ladder"
  }
};
