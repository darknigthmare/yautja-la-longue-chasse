import nativeLife from "./data/pitStageLifeV60.json";

export type PitStageLifePassV60 = "P1" | "P2" | "P3";
export interface PitStageLifeFrameV60 {
  /** Source rectangle in the untouched native PNG. */
  readonly rect: readonly [number, number, number, number];
  /** Attachment and alpha bounds are local to the source rectangle. */
  readonly pivot: readonly [number, number];
  readonly alphaBounds: readonly [number, number, number, number];
}
export interface PitStageLifeEventV60 {
  readonly id: string;
  readonly name: string;
  readonly src: string;
  readonly width: number;
  readonly height: number;
  readonly sha256: string;
  readonly frames: readonly PitStageLifeFrameV60[];
  readonly fps: number;
  readonly restFrame: number;
  readonly reducedMotionFrame: number;
  readonly placement: {
    readonly x: number;
    readonly bottom: number;
    /** Height of the first native cell; all other cells keep the same pixel scale. */
    readonly height: number;
    readonly parallax: number;
    readonly renderPass: PitStageLifePassV60;
    /** Ground keeps the attachment on its authored support offset; world follows its own depth. */
    readonly anchor: "ground" | "world";
  };
}
export interface PitStageLifeStageV60 {
  readonly stageId: string;
  readonly events: readonly PitStageLifeEventV60[];
}
export interface PitStageLifeManifestV60 {
  readonly schemaVersion: 1;
  readonly release: "V60";
  readonly stages: readonly PitStageLifeStageV60[];
}

export const PIT_STAGE_LIFE_V60 = nativeLife as unknown as PitStageLifeManifestV60;
const integer = (value: number, min: number, max: number) => Number.isInteger(value) && value >= min && value <= max;
const finite = (value: number, min: number, max: number) => Number.isFinite(value) && value >= min && value <= max;

/** Invalid metadata is never accepted as native art or used to stretch an unrelated image. */
export function isPitStageLifeStageV60(stage: PitStageLifeStageV60): boolean {
  if (!stage || !/^arena-\d{3}-[a-z0-9-]+$/.test(stage.stageId) || !Array.isArray(stage.events) || stage.events.length !== 3) return false;
  if (new Set(stage.events.map(event => event?.id)).size !== 3 || new Set(stage.events.map(event => event?.src)).size !== 3) return false;
  return stage.events.every(event => {
    if (!event || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(event.id) || !event.name?.trim()
      || !new RegExp(`^/game/sprites/v60/pit-life/${stage.stageId}/[a-z0-9-]+\\.png$`).test(event.src)
      || !/^[0-9a-f]{64}$/.test(event.sha256)
      || !integer(event.width, 32, 8192) || !integer(event.height, 32, 8192)
      || !Array.isArray(event.frames) || event.frames.length < 3 || event.frames.length > 32
      || !finite(event.fps, 1, 12) || event.frames.length * 60 / event.fps >= 720
      || !integer(event.restFrame, 0, event.frames.length - 1) || !integer(event.reducedMotionFrame, 0, event.frames.length - 1)) return false;
    const placement = event.placement;
    if (!placement || !finite(placement.x, -960, 1920) || !finite(placement.bottom, -540, 1080)
      || !finite(placement.height, 1, 540) || !finite(placement.parallax, 0, 1)
      || !["P1", "P2", "P3"].includes(placement.renderPass) || !["ground", "world"].includes(placement.anchor)) return false;
    const rectangles = new Set<string>();
    return event.frames.every((frame: PitStageLifeFrameV60) => {
      if (!frame || !Array.isArray(frame.rect) || frame.rect.length !== 4 || !Array.isArray(frame.pivot) || frame.pivot.length !== 2
        || !Array.isArray(frame.alphaBounds) || frame.alphaBounds.length !== 4) return false;
      const [x, y, width, height] = frame.rect;
      const [ax, ay, aw, ah] = frame.alphaBounds;
      const key = frame.rect.join(",");
      if (rectangles.has(key)) return false;
      rectangles.add(key);
      return integer(x, 0, event.width - 1) && integer(y, 0, event.height - 1)
        && integer(width, 1, event.width - x) && integer(height, 1, event.height - y)
        && finite(frame.pivot[0], 0, width) && finite(frame.pivot[1], 0, height)
        && integer(ax, 0, width - 1) && integer(ay, 0, height - 1)
        && integer(aw, 1, width - ax) && integer(ah, 1, height - ay);
    });
  });
}

/** A declared malformed or duplicated stage must block loading, not silently disappear. */
export function getPitStageLifeV60Stage(stageId: string, manifest: PitStageLifeManifestV60 = PIT_STAGE_LIFE_V60): PitStageLifeStageV60 | null {
  if (!manifest || manifest.schemaVersion !== 1 || manifest.release !== "V60" || !Array.isArray(manifest.stages)) throw new Error("Invalid V60 stage-life manifest");
  const matches = manifest.stages.filter(stage => stage.stageId === stageId);
  if (!matches.length) return null;
  if (matches.length !== 1 || !isPitStageLifeStageV60(matches[0])) throw new Error(`Invalid native stage-life metadata: ${stageId}`);
  return matches[0];
}

export function getPitStageLifeV60Paths(stageId: string, manifest: PitStageLifeManifestV60 = PIT_STAGE_LIFE_V60): readonly string[] {
  return getPitStageLifeV60Stage(stageId, manifest)?.events.map(event => event.src) ?? [];
}

export function isPitStageLifeV60ImageSize(event: PitStageLifeEventV60, width: number, height: number): boolean {
  return width === event.width && height === event.height;
}
