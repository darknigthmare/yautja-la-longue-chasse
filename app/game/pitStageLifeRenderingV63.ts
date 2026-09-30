import type { PitArenaLifeEventContext } from "./pitArenaLifeEvents";
import { getPitStageLifePosesV63, getPitStageLifeScheduleV63 } from "./pitStageLifeDirectorV63";
import type { PitStageLifePoseV60 } from "./pitStageLifeDirectorV60";
import { isPitStageLifeV60ImageSize, type PitStageLifePassV60 } from "./pitStageLifeV60";
import type { PitStageLifeDrawV60, PitStageLifeReportV60 } from "./pitStageLifeRenderingV60";
import type { PitStageLifeEventV61 } from "./pitStageStoryV61";
import type { PitStageLifeStageV63 } from "./pitStageLifeV63";

export interface PitStageLifeDrawV63 extends PitStageLifeDrawV60 {
  readonly visible: boolean;
  readonly travelX: number | null;
  readonly clipped: boolean;
}
export interface PitStageLifeReportV63 extends PitStageLifeReportV60 { readonly events: readonly PitStageLifeDrawV63[] }
interface LayerTransform { readonly scale: number; readonly translateX: number; readonly translateY: number }

/** Native cells retain their source pixels. A locomotion clip additionally crosses its authored background opening. */
export function getPitStageLifeTravelXV63(stage: PitStageLifeStageV63, event: PitStageLifeEventV61, pose: PitStageLifePoseV60,
  context?: PitArenaLifeEventContext): number | null {
  if (!event.travelX || !pose.active || !context) return null;
  const schedule = getPitStageLifeScheduleV63(stage.stageId, context.round, pose.cycle, stage.events.length);
  const elapsed = context.roundFrame - schedule.firstDelay - pose.cycle * schedule.cycleFrames - schedule.starts[pose.occurrence];
  const duration = event.frames.length * 60 / event.fps;
  const progress = Math.max(0, Math.min(1, elapsed / Math.max(1, duration - 1)));
  return event.travelX[0] + (event.travelX[1] - event.travelX[0]) * progress;
}

export function drawPitStageLifeV63(context: CanvasRenderingContext2D, input: {
  readonly stage: PitStageLifeStageV63;
  readonly pass: PitStageLifePassV60;
  readonly groundY: number;
  readonly images: ReadonlyMap<string, HTMLImageElement>;
  readonly transform: (parallax: number) => LayerTransform;
  readonly eventContext?: PitArenaLifeEventContext;
  readonly reducedMotion?: boolean;
  readonly highContrast?: boolean;
  readonly excludedEventIds?: ReadonlySet<string>;
}): PitStageLifeReportV63 {
  const poses = getPitStageLifePosesV63(input.stage, input.eventContext, input.reducedMotion);
  const events: PitStageLifeDrawV63[] = [], missing = new Set<string>();
  let actorsDrawn = 0;
  input.stage.events.forEach((event, index) => {
    if (event.placement.renderPass !== input.pass || input.excludedEventIds?.has(event.id)) return;
    const pose = poses[index], visible = event.idleVisibility !== "hidden" || pose.active;
    const travelX = getPitStageLifeTravelXV63(input.stage, event, pose, input.eventContext);
    const report: PitStageLifeDrawV63 = { ...pose, src: event.src, pass: input.pass, drawn: false, attachment: null,
      visible, travelX, clipped: Boolean(event.clipWorld) };
    if (!visible) { events.push(report); return; }
    const image = input.images.get(event.src);
    if (!image || !isPitStageLifeV60ImageSize(event, image.naturalWidth, image.naturalHeight)) { missing.add(event.src); events.push(report); return; }
    const placement = event.placement, frame = event.frames[pose.nativeFrame];
    const transform = input.transform(placement.parallax), ground = input.transform(1);
    if (![transform.scale, transform.translateX, transform.translateY, ground.scale, ground.translateY].every(Number.isFinite)
      || transform.scale <= 0 || ground.scale <= 0) { events.push(report); return; }
    const scale = placement.height / event.frames[0].rect[3] * transform.scale;
    const x = (travelX ?? placement.x) * transform.scale + transform.translateX;
    const y = placement.anchor === "ground"
      ? input.groundY * ground.scale + ground.translateY + (placement.bottom - input.groundY) * transform.scale
      : placement.bottom * transform.scale + transform.translateY;
    context.save();
    try {
      if (event.clipWorld) {
        const clip = event.clipWorld;
        context.beginPath();context.rect(clip.x * transform.scale + transform.translateX, clip.y * transform.scale + transform.translateY,
          clip.width * transform.scale, clip.height * transform.scale);context.clip();
      }
      context.globalAlpha *= (input.highContrast ? .32 : .92) * (event.opacity ?? 1);
      context.drawImage(image, ...frame.rect, x - frame.pivot[0] * scale, y - frame.pivot[1] * scale, frame.rect[2] * scale, frame.rect[3] * scale);
      actorsDrawn++;events.push({ ...report, drawn: true, attachment: [x, y] });
    } finally { context.restore(); }
  });
  return { stageId: input.stage.stageId, actorsDrawn, events, missingPaths: [...missing] };
}
