/** Individually generated pod parts/effects. Coordinates were measured in the
 * complete RGBA sources, including transparent margins. These are game-art
 * calibrations, not canonical spacecraft dimensions or human art approval. */
const point = (x: number, y: number, width: number, height: number) => ({ x: x / width, y: y / height });
const ROOT = '/game/planet-arrival/v3';

export const ARRIVAL_POD_ART = Object.freeze({
  podFlightCore: `${ROOT}/pod-flight-core.webp`,
  podBowShock: `${ROOT}/pod-entry-bow-shock.webp`,
  podPlasmaWake: `${ROOT}/pod-entry-plasma-wake.webp`,
});

export const ARRIVAL_POD_SPRITES = Object.freeze({
  flightCore: { width: 1536, height: 1024 },
  bowShock: { width: 1254, height: 1254, origin: point(850, 610, 1254, 1254) },
  // The luminous head attaches to the nose; the wake extends opposite velocity.
  plasmaWake: { width: 1536, height: 1024, origin: point(1300, 530, 1536, 1024), end: point(220, 530, 1536, 1024) },
});

export const POD_DESTRUCTION_ART = Object.freeze({
  core: `${ROOT}/pod-destruction-core.webp`,
  pressure: `${ROOT}/pod-destruction-pressure-ring.webp`,
  scorch: `${ROOT}/pod-destruction-scorch.webp`,
  fragment: `${ROOT}/pod-destruction-metal-shard.webp`,
  vapor: `${ROOT}/pod-destruction-smoke.webp`,
});

export const POD_DESTRUCTION_SPRITES = Object.freeze({
  core: { width: 1254, height: 1254, origin: point(627, 620, 1254, 1254) },
  pressure: { width: 2172, height: 724, origin: point(1086, 385, 2172, 724) },
  scorch: { width: 2172, height: 724, origin: point(1086, 385, 2172, 724) },
  fragment: {
    width: 1254, height: 1254, origin: point(627, 627, 1254, 1254),
    // Alpha >16 bounds, used to keep a rotating shard above the physical floor.
    bounds: { left: 236 / 1254, top: 190 / 1254, right: 1031 / 1254, bottom: 1073 / 1254 },
  },
  vapor: { width: 1254, height: 1254, origin: point(627, 1080, 1254, 1254) },
});
