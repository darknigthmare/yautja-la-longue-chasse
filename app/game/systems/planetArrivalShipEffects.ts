import { ARRIVAL_SHIP_MOTION_HULL, type ArrivalShipViewId } from './planetArrivalShipMotion';
import type { ShipId } from '../shipCatalogue';
import type { PlanetInsertionPlan } from './planetInsertion';

const point = (x: number, y: number, width: number, height: number) => ({ x: x / width, y: y / height });
const root = '/game/planet-arrival/ship-motion-v1';

/** Individually generated optical layers. Landmarks are measured in the full
 * source canvas; alpha margins must not be mistaken for the emitter origin. */
export const ARRIVAL_SHIP_ENGINE_ART = Object.freeze({
  core: { path: `${root}/classic-engine-core.webp`, width: 1254, height: 1254,
    origin: point(621, 632, 1254, 1254), visibleWidth: 362, visibleHeight: 651 },
  plume: { path: `${root}/classic-engine-plume.webp`, width: 2172, height: 724,
    origin: point(448, 363, 2172, 724), end: point(1805, 363, 2172, 724) },
});

/** Visible inner aperture, in the corresponding 1536×1024 source view. The
 * other views hide this opening behind its casing and must not paint a flare
 * through the hull. This is an art measurement, not a new spacecraft system. */
export function arrivalShipEngineAperture(view: ArrivalShipViewId): { width: number; height: number } | null {
  if (view === 'rear-quarter-shallow') return { width: 50, height: 101 };
  if (view === 'rear-quarter') return { width: 78, height: 150 };
  return null;
}

export function arrivalShipEffectAssetPaths(shipId: ShipId): readonly string[] {
  return shipId === ARRIVAL_SHIP_MOTION_HULL ? Object.values(ARRIVAL_SHIP_ENGINE_ART).map(art => art.path) : [];
}

const clamp = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
const smooth = (value: number) => { const p = clamp(value); return p * p * (3 - 2 * p); };

/** Presentation envelope driven exclusively by the saved cinematic clock.
 * It never spends ship energy or changes insertion/noise/gameplay decisions.
 * Reduced motion removes the pulse; a paused time reproduces identical paint. */
export function arrivalShipEngineFrame(elapsedMs: number, method: PlanetInsertionPlan['method'],
  reducedMotion = false, cloakStrength = 0) {
  const time = Number.isFinite(elapsedMs) ? elapsedMs : 0;
  const active = time >= 13_000 && time < 50_000;
  const departure = smooth((time - 23_800) / 3_400);
  const approach = method === 'ship' ? 1 - .38 * smooth((time - 36_000) / 12_000) : 1;
  const pulse = reducedMotion ? 0 : .018 * Math.sin(time / 290) + .01 * Math.sin(time / 173);
  const power = active ? clamp(reducedMotion ? .48 : (.38 + .42 * departure) * approach + pulse) : 0;
  const emission = 1 - .88 * clamp(cloakStrength);
  return {
    power,
    coreOpacity: active ? (.28 + .42 * power) * emission : 0,
    plumeOpacity: active ? (.16 + .32 * power) * emission : 0,
    plumeWidth: 86 + 80 * power,
  };
}
