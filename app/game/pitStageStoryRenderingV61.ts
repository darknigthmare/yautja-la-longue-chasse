import { isPitStageLifeV60ImageSize, type PitStageLifePassV60 } from "./pitStageLifeV60";
import { getPitStageStoryPosesV61, type PitStageStoryContextV61, type PitStageStoryPoseV61 } from "./pitStageStoryDirectorV61";
import type { PitStageStoryStageV61 } from "./pitStageStoryV61";

interface LayerTransform { readonly scale: number; readonly translateX: number; readonly translateY: number }
export interface PitStageStoryDrawV61 extends PitStageStoryPoseV61 {
  readonly src: string;
  readonly pass: PitStageLifePassV60;
  readonly drawn: boolean;
  readonly attachment: readonly [number, number] | null;
  readonly replacesAmbientEventId?: string;
}
export interface PitStageStoryReportV61 {
  readonly stageId: string;
  readonly actorsDrawn: number;
  readonly events: readonly PitStageStoryDrawV61[];
  readonly missingPaths: readonly string[];
  readonly replacedAmbientEventIds: readonly string[];
}
interface StoryDrawInput {
  readonly stage: PitStageStoryStageV61;
  readonly groundY: number;
  readonly images: ReadonlyMap<string, HTMLImageElement>;
  readonly transform: (parallax: number) => LayerTransform;
  readonly eventContext?: PitStageStoryContextV61;
  readonly reducedMotion?: boolean;
  readonly highContrast?: boolean;
}
/** Resolve before rendering any pass: replacing across depths must never draw two bodies. */
export function planPitStageStoryV61(input: StoryDrawInput) {
  const poses = getPitStageStoryPosesV61(input.stage, input.eventContext, input.reducedMotion);
  return input.stage.events.map((event, index) => {
    const pose = poses[index], image = input.images.get(event.src), placement = event.placement;
    const transform = input.transform(placement.parallax), ground = input.transform(1);
    const validImage = image && isPitStageLifeV60ImageSize(event, image.naturalWidth, image.naturalHeight);
    const validTransform = [transform.scale, transform.translateX, transform.translateY, ground.scale, ground.translateY].every(Number.isFinite)
      && transform.scale > 0 && ground.scale > 0;
    const drawable = Boolean(pose.visible && validImage && validTransform);
    return { event, pose, image, transform, ground, drawable, missing: pose.visible && !validImage };
  });
}
export function getPitStageStoryReplacementsV61(input: StoryDrawInput): ReadonlySet<string> {
  return new Set(planPitStageStoryV61(input).flatMap(item => item.drawable && (item.pose.active || item.pose.held) && item.event.replacesAmbientEventId ? [item.event.replacesAmbientEventId] : []));
}

export function drawPitStageStoryV61(context: CanvasRenderingContext2D, input: StoryDrawInput & { readonly pass: PitStageLifePassV60 }): PitStageStoryReportV61 {
  const events: PitStageStoryDrawV61[] = [], missing = new Set<string>(), replaced = new Set<string>();
  let actorsDrawn = 0;
  for (const item of planPitStageStoryV61(input)) {
    const { event, pose, image, transform, ground } = item;
    if (event.placement.renderPass !== input.pass) continue;
    const report: PitStageStoryDrawV61 = { ...pose, src: event.src, pass: input.pass, drawn: false, attachment: null, replacesAmbientEventId: event.replacesAmbientEventId };
    if (item.missing) missing.add(event.src);
    if (!item.drawable || !image) { events.push(report); continue; }
    const frame = event.frames[pose.nativeFrame], placement = event.placement;
    const scale = placement.height / event.frames[0].rect[3] * transform.scale;
    const x = placement.x * transform.scale + transform.translateX;
    const y = placement.anchor === "ground"
      ? input.groundY * ground.scale + ground.translateY + (placement.bottom - input.groundY) * transform.scale
      : placement.bottom * transform.scale + transform.translateY;
    context.save();
    try {
      context.globalAlpha *= input.highContrast ? .32 : .92;
      context.drawImage(image, ...frame.rect, x - frame.pivot[0] * scale, y - frame.pivot[1] * scale, frame.rect[2] * scale, frame.rect[3] * scale);
      actorsDrawn++;
      if ((pose.active || pose.held) && event.replacesAmbientEventId) replaced.add(event.replacesAmbientEventId);
      events.push({ ...report, drawn: true, attachment: [x, y] });
    } finally { context.restore(); }
  }
  return { stageId: input.stage.stageId, actorsDrawn, events, missingPaths: [...missing], replacedAmbientEventIds: [...replaced] };
}
