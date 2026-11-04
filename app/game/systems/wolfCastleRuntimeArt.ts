/**
 * Deterministic WebP encoding of the original individual PNG assets.
 * Dimensions and every alpha pixel are unchanged; generated PNGs stay intact.
 * Rebuild/audit: node scripts/build-wolf-runtime-art.mjs [--check]
 */
export const WOLF_CASTLE_RUNTIME_ART: Readonly<Record<string, string>> = Object.freeze({
  "/game/wolf-castle/v1/berth-wall.png": "/game/wolf-castle/v1/berth-wall.webp",
  "/game/wolf-castle/v1/gallery-wall.png": "/game/wolf-castle/v1/gallery-wall.webp",
  "/game/wolf-castle/v1/court-wall.png": "/game/wolf-castle/v1/court-wall.webp",
  "/game/wolf-castle/v1/service-wall.png": "/game/wolf-castle/v1/service-wall.webp",
  "/game/wolf-castle/v1/audience-wall.png": "/game/wolf-castle/v1/audience-wall.webp",
  "/game/wolf-castle/v1/throne.png": "/game/wolf-castle/v1/throne.webp",
  "/game/wolf-castle/v1/column.png": "/game/wolf-castle/v1/column.webp",
  "/game/wolf-castle/v1/dais.png": "/game/wolf-castle/v1/dais.webp",
  "/game/wolf-castle/v1/airlock-frame.png": "/game/wolf-castle/v1/airlock-frame.webp",
  "/game/wolf-castle/v1/airlock-leaf.png": "/game/wolf-castle/v1/airlock-leaf.webp",
  "/game/wolf-castle/v1/trophy-plinth.png": "/game/wolf-castle/v1/trophy-plinth.webp",
  "/game/wolf-castle/v1/council-table.png": "/game/wolf-castle/v1/council-table.webp",
  "/game/wolf-castle/v1/archive-console.png": "/game/wolf-castle/v1/archive-console.webp",
  "/game/wolf-castle/v1/bay-anchor.png": "/game/wolf-castle/v1/bay-anchor.webp",
  "/game/wolf-castle/v1/access-beacon.png": "/game/wolf-castle/v1/access-beacon.webp",
  "/game/wolf-castle/v1/castle-exterior.png": "/game/wolf-castle/v1/castle-exterior.webp",
  "/game/planet-arrival/v1/space.png": "/game/planet-arrival/v1/space.webp",
  "/game/planet-arrival/v1/pod-flight.png": "/game/planet-arrival/v1/pod-flight.webp",
  "/game/planet-arrival/v1/heat-trail.png": "/game/planet-arrival/v1/heat-trail.webp",
  "/game/planet-arrival/v1/release-jet.png": "/game/planet-arrival/v1/release-jet.webp",
  "/game/planet-arrival/v1/atmosphere-clouds.png": "/game/planet-arrival/v1/atmosphere-clouds.webp",
  "/game/planet-arrival/v1/impact-dust.png": "/game/planet-arrival/v1/impact-dust.webp",
  "/game/planet-arrival/v1/pod-ground.png": "/game/planet-arrival/v1/pod-ground.webp",
  "/game/planet-arrival/v1/pod-door.png": "/game/planet-arrival/v1/pod-door.webp",
  "/game/wolf-castle/v1/royal-guard.png": "/game/wolf-castle/v1/royal-guard.webp",
  "/game/wolf-castle/v1/low-fog.png": "/game/wolf-castle/v1/low-fog.webp",
  "/game/wolf-castle/v1/predator-king-seated.png": "/game/wolf-castle/v1/predator-king-seated.webp",
  "/game/wolf-castle/v2/royal-guard-ready.png": "/game/wolf-castle/v2/royal-guard-ready.webp",
  "/game/wolf-castle/v2/royal-guard-windup.png": "/game/wolf-castle/v2/royal-guard-windup.webp",
  "/game/wolf-castle/v2/royal-guard-lunge.png": "/game/wolf-castle/v2/royal-guard-lunge.webp"
});

export function wolfCastleRuntimeAsset(source: string): string {
  return WOLF_CASTLE_RUNTIME_ART[source] ?? source;
}

export type WolfCastleCombatPose = 'ready' | 'windup' | 'lunge';
const COMBAT_FRAMES = {
  "ready": {
    "asset": "/game/wolf-castle/v2/royal-guard-ready.webp",
    "width": 1448,
    "height": 1086,
    "footX": 694.5,
    "footY": 1058,
    "referenceStandingHeight": 1027
  },
  "windup": {
    "asset": "/game/wolf-castle/v2/royal-guard-windup.webp",
    "width": 1448,
    "height": 1086,
    "footX": 725,
    "footY": 1062,
    "referenceStandingHeight": 1027
  },
  "lunge": {
    "asset": "/game/wolf-castle/v2/royal-guard-lunge.webp",
    "width": 1774,
    "height": 887,
    "footX": 1027.5,
    "footY": 860,
    "referenceStandingHeight": 1027
  }
} as const;

/** One image per pose. The horizontal anchor follows the feet, not the spear. */
export function wolfCastleCombatSpriteFrame(pose: WolfCastleCombatPose, x: number, footY: number, standingHeight = 214) {
  const frame = COMBAT_FRAMES[pose];
  const scale = standingHeight / frame.referenceStandingHeight;
  return { asset: frame.asset, x: x - frame.footX * scale, y: footY - frame.footY * scale,
    width: frame.width * scale, height: frame.height * scale };
}
