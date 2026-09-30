import type { PitArenaLifeEventContext } from "./pitArenaLifeEvents";
import { getPitStageLifePosesV60, type PitStageLifePoseV60 } from "./pitStageLifeDirectorV60";
import { isPitStageLifeV60ImageSize, type PitStageLifePassV60, type PitStageLifeStageV60 } from "./pitStageLifeV60";

export interface PitStageLifeDrawV60 extends PitStageLifePoseV60 {
  readonly src: string;
  readonly pass: PitStageLifePassV60;
  readonly drawn: boolean;
  readonly attachment: readonly [number, number] | null;
}
export interface PitStageLifeReportV60 {
  readonly stageId: string;
  readonly actorsDrawn: number;
  readonly events: readonly PitStageLifeDrawV60[];
  readonly missingPaths: readonly string[];
}
interface LayerTransform { readonly scale: number; readonly translateX: number; readonly translateY: number }

/** The caller invokes each authored pass once, behind the fighters. No mirroring, tint or bitmap deformation. */
export function drawPitStageLifeV60(context: CanvasRenderingContext2D, input: {
  readonly stage: PitStageLifeStageV60;
  readonly pass: PitStageLifePassV60;
  readonly groundY: number;
  readonly images: ReadonlyMap<string, HTMLImageElement>;
  readonly transform: (parallax: number) => LayerTransform;
  readonly eventContext?: PitArenaLifeEventContext;
  readonly reducedMotion?: boolean;
  readonly highContrast?: boolean;
}): PitStageLifeReportV60 {
  const events: PitStageLifeDrawV60[] = [], missingPaths = new Set<string>();
  const poses = getPitStageLifePosesV60(input.stage, input.eventContext, input.reducedMotion);
  let actorsDrawn = 0;
  input.stage.events.forEach((event, index) => {
    if (event.placement.renderPass !== input.pass) return;
    const pose = poses[index];
    const report = { ...pose, src: event.src, pass: input.pass, drawn: false, attachment: null } satisfies PitStageLifeDrawV60;
    const image = input.images.get(event.src);
    if (!image || !isPitStageLifeV60ImageSize(event, image.naturalWidth, image.naturalHeight)) {
      missingPaths.add(event.src); events.push(report); return;
    }
    const frame = event.frames[pose.nativeFrame], placement = event.placement;
    const transform = input.transform(placement.parallax), ground = input.transform(1);
    if (![transform.scale, transform.translateX, transform.translateY, ground.scale, ground.translateY].every(Number.isFinite)
      || transform.scale <= 0 || ground.scale <= 0) { events.push(report); return; }
    const scale = placement.height / event.frames[0].rect[3] * transform.scale;
    const x = placement.x * transform.scale + transform.translateX;
    const y = placement.anchor === "ground"
      ? input.groundY * ground.scale + ground.translateY + (placement.bottom - input.groundY) * transform.scale
      : placement.bottom * transform.scale + transform.translateY;
    context.save();
    try {
      context.globalAlpha *= input.highContrast ? .32 : .92;
      context.drawImage(image, ...frame.rect,
        x - frame.pivot[0] * scale, y - frame.pivot[1] * scale, frame.rect[2] * scale, frame.rect[3] * scale);
      actorsDrawn++;
      events.push({ ...report, drawn: true, attachment: [x, y] });
    } finally { context.restore(); }
  });
  return { stageId: input.stage.stageId, actorsDrawn, events, missingPaths: [...missingPaths] };
}
