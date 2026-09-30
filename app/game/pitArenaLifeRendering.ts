import { getPitArenaLifeCast, getPitArenaLifeFrame, isPitArenaLifeSheetSize, PIT_ARENA_LIFE_SHEETS, type PitArenaLifeSheet } from "./pitArenaLife";
import { getPitArenaLifeEventPose, type PitArenaLifeEventContext } from "./pitArenaLifeEvents";

export interface PitArenaLifeReport {
  readonly actorsDrawn: number;
  readonly nativeFrames: readonly number[];
  readonly missingPaths: readonly string[];
}
interface LayerTransform { readonly scale: number; readonly translateX: number; readonly translateY: number }
/** Called in the P3 pass, before P4 and combatants. Transform comes from the arena renderer. */
export function drawPitArenaLife(context: CanvasRenderingContext2D, input: {
  readonly arenaId: string;
  readonly frame: number;
  readonly groundY: number;
  readonly images: ReadonlyMap<string, HTMLImageElement>;
  readonly transform: (parallax: number) => LayerTransform;
  readonly reducedMotion?: boolean;
  readonly highContrast?: boolean;
  readonly sheets?: readonly PitArenaLifeSheet[];
  readonly eventContext?: PitArenaLifeEventContext;
}): PitArenaLifeReport {
  const nativeFrames: number[] = [], missingPaths = new Set<string>();
  let actorsDrawn = 0;
  for (const actor of getPitArenaLifeCast(input.arenaId)) {
    const sheet = (input.sheets ?? PIT_ARENA_LIFE_SHEETS).find(candidate => candidate.id === actor.sheetId);
    if (!sheet?.reviewed) continue;
    const image = input.images.get(sheet.src);
    if (!image || !isPitArenaLifeSheetSize(image.naturalWidth, image.naturalHeight)) { missingPaths.add(sheet.src); continue; }
    const directed = getPitArenaLifeEventPose(input.arenaId, actor.id, input.eventContext, input.reducedMotion);
    const index = directed?.nativeFrame ?? getPitArenaLifeFrame(input.frame, actor.phaseOffset, input.reducedMotion);
    const cell = image.naturalWidth / sheet.columns;
    const transform = input.transform(actor.parallax), ground = input.transform(1);
    if (![transform.scale, transform.translateX, transform.translateY, ground.scale, ground.translateY].every(Number.isFinite)
      || transform.scale <= 0 || ground.scale <= 0) continue;
    const size = actor.height * transform.scale;
    const pivot = sheet.nativePivots?.[index] ?? [cell / 2, cell * sheet.footRatio];
    // The small background actors share a stable contact horizon, but keep P3 horizontal depth.
    const x = actor.x * transform.scale + transform.translateX;
    const footY = input.groundY * ground.scale + ground.translateY + (actor.bottom - input.groundY) * transform.scale;
    context.save();
    try {
      context.globalAlpha *= input.highContrast ? .32 : .92;
      context.translate(x, footY);
      context.scale(actor.mirror ? -1 : 1, 1);
      context.drawImage(image, index % 3 * cell, Math.floor(index / 3) * cell, cell, cell,
        -size * pivot[0] / cell, -size * pivot[1] / cell, size, size);
      actorsDrawn++; nativeFrames.push(index);
    } finally { context.restore(); }
  }
  return { actorsDrawn, nativeFrames, missingPaths: [...missingPaths] };
}
