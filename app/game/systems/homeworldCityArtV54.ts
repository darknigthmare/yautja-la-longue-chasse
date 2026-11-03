/** Native OpenAI PNGs; source bytes are retained. Measurements use alpha > 8, as the existing city kit. */
export const HOMEWORLD_CITY_ART_V54 = {
  compactRelay: {
    src: "/game/homeworld/v54/compact-relay.png",
    sourceWidth: 1430, sourceHeight: 1100,
    alphaBounds: { x: 67, y: 149, width: 1297, height: 818 },
    doorway: { x: 504, y: 423, width: 426, height: 516 },
    sha256: "9ad8e5d1624ec54abcfed0ae995f523a9d068c4fd5857e6689925e7874cab143",
    role: "oblique-building-exterior",
  },
  beacon: {
    src: "/game/homeworld/v54/wayfinding-beacon.png",
    sourceWidth: 1054, sourceHeight: 1493,
    alphaBounds: { x: 188, y: 174, width: 687, height: 1158 },
    sha256: "4fb1b835a5d9535d23cb8dbb1a7b1fcdb29625e1d531fbdf03367c82bce1987c",
    role: "oblique-standing-prop",
  },
  pavement: {
    src: "/game/homeworld/v54/basalt-pavement.png",
    sourceWidth: 1254, sourceHeight: 1254,
    alphaBounds: { x: 0, y: 0, width: 1254, height: 1254 },
    sha256: "35083abf20dce87b44f6b7ce79ec1e5ec92f22579aee2a06bc9aa5ce61c31e5f",
    role: "top-down-surface-material-not-seamless",
  },
} as const;
