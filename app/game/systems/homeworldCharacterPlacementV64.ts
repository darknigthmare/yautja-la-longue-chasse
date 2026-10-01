import measurements from '../data/homeworldCharacterGroundV64.json';

interface CharacterMeasurementV64 {
  width: number;
  height: number;
  alpha: { x: number; y: number; width: number; height: number };
  support: { x: number; y: number };
}

/** A single uniform scale preserves the native raster aspect. The measured
 * support point, not the canvas edge or weapon's bounding centre, lands at0,0.
 * Dreads may extend beyond the body-height envelope without changing stature. */
function atGround(measured: CharacterMeasurementV64, paintedHeight: number) {
  const scale = paintedHeight / measured.alpha.height;
  return {
    left: -measured.support.x * scale,
    top: -measured.support.y * scale,
    width: measured.width * scale,
    height: measured.height * scale,
  };
}

export function homeworldPortraitPlacementV64(plateId: string, source: string, paintedHeight = 100) {
  const measured = measurements.portraits[plateId as keyof typeof measurements.portraits];
  // A future source replacement needs a fresh measurement, not stale anchors.
  return measured?.src === source ? atGround(measured, paintedHeight) : null;
}

export function homeworldModularPlacementV64(morphId: string, headStyleId = 'reference', paintedHeight = 100) {
  const measured = measurements.modular[`${morphId}:${headStyleId}` as keyof typeof measurements.modular];
  return measured ? atGround(measured, paintedHeight) : null;
}
