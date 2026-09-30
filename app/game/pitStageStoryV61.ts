import nativeLife from "./data/pitStageLifeV61.json";
import nativeStory from "./data/pitStageStoryV61.json";
import type { PitStageLifeEventV60, PitStageLifeStageV60 } from "./pitStageLifeV60";

export type PitStageStoryCueV61 = "first-incident" | "objective-beacon" | "engineer-preboss" | "chapter-captive";
export type PitStageStoryTriggerV61 = "round-start" | "round-victory" | "round-end" | "match-end" | "narrative-cue";
export interface PitStageStoryEventV61 extends PitStageLifeEventV60 {
  readonly trigger: PitStageStoryTriggerV61;
  readonly cue?: PitStageStoryCueV61;
  /** Only an explicit scenario controller can emit this cue. Ordinary combat never can. */
  readonly encounterId?: string;
  readonly idleVisibility: "hidden" | "rest";
  /** Persistent scenario changes (e.g. an objective beacon switched off) must not return to the old ambient pose. */
  readonly afterPlayback?: "release" | "hold-last";
  readonly replacesAmbientEventId?: string;
  readonly excludedFighterIds?: readonly string[];
}
export interface PitStageStoryStageV61 { readonly stageId: string; readonly events: readonly PitStageStoryEventV61[] }
export interface PitStageLifeEventV61 extends PitStageLifeEventV60 {
  readonly reusedV60EventId?: string;
  readonly excludedFighterIds?: readonly string[];
  readonly idleVisibility?: "rest" | "hidden";
  /** Absolute world anchors; locomotion is additional to the six real native drawings. */
  readonly travelX?: readonly [number, number];
  readonly clipWorld?: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
  readonly opacity?: number;
}
export interface PitStageLifeStageV61 extends PitStageLifeStageV60 {
  /** Explicit correction overlay only; the released V60 JSON remains byte-identical. */
  readonly replacesV60Stage?: boolean;
  readonly events: readonly PitStageLifeEventV61[];
}
export interface PitStageManifestV61<T> { readonly schemaVersion: 1; readonly release: "V61"; readonly stages: readonly T[] }
export type PitStageLifeManifestV61 = PitStageManifestV61<PitStageLifeStageV61>;
export type PitStageStoryManifestV61 = PitStageManifestV61<PitStageStoryStageV61>;
export const PIT_STAGE_LIFE_V61 = nativeLife as unknown as PitStageLifeManifestV61;
export const PIT_STAGE_STORY_V61 = nativeStory as unknown as PitStageStoryManifestV61;

const integer = (value: number, min: number, max: number) => Number.isInteger(value) && value >= min && value <= max;
const finite = (value: number, min: number, max: number) => Number.isFinite(value) && value >= min && value <= max;
const id = (value: string) => typeof value === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
const cues: readonly PitStageStoryCueV61[] = ["first-incident", "objective-beacon", "engineer-preboss", "chapter-captive"];

/** Both registries consume untouched native cells; paths cannot cross stages or releases. */
export function isPitStageNativeEventV61(event: PitStageLifeEventV60, stageId: string, kind: "pit-life" | "pit-story"): boolean {
  if (!event || !id(event.id) || !event.name?.trim()
    || !new RegExp(`^/game/sprites/v61/${kind}/${stageId}/[a-z0-9-]+\\.png$`).test(event.src)
    || !/^[0-9a-f]{64}$/.test(event.sha256) || !integer(event.width, 32, 8192) || !integer(event.height, 32, 8192)
    || !Array.isArray(event.frames) || event.frames.length < 3 || event.frames.length > 32
    || !finite(event.fps, 1, 12) || event.frames.length * 60 / event.fps >= 720
    || !integer(event.restFrame, 0, event.frames.length - 1) || !integer(event.reducedMotionFrame, 0, event.frames.length - 1)) return false;
  const p = event.placement;
  if (!p || !finite(p.x, -960, 1920) || !finite(p.bottom, -540, 1080) || !finite(p.height, 1, 540)
    || !finite(p.parallax, 0, 1) || !["P1", "P2", "P3"].includes(p.renderPass) || !["ground", "world"].includes(p.anchor)) return false;
  const rectangles = new Set<string>();
  return event.frames.every(frame => {
    if (!frame || frame.rect?.length !== 4 || frame.pivot?.length !== 2 || frame.alphaBounds?.length !== 4) return false;
    const [x, y, w, h] = frame.rect, [ax, ay, aw, ah] = frame.alphaBounds;
    const key = frame.rect.join(",");
    if (rectangles.has(key)) return false;
    rectangles.add(key);
    return integer(x, 0, event.width - 1) && integer(y, 0, event.height - 1)
      && integer(w, 1, event.width - x) && integer(h, 1, event.height - y)
      && finite(frame.pivot[0], 0, w) && finite(frame.pivot[1], 0, h)
      && integer(ax, 0, w - 1) && integer(ay, 0, h - 1) && integer(aw, 1, w - ax) && integer(ah, 1, h - ay);
  });
}
function validStage(stage: PitStageLifeStageV60): boolean {
  return Boolean(stage && /^arena-\d{3}-[a-z0-9-]+$/.test(stage.stageId) && Array.isArray(stage.events)
    && new Set(stage.events.map(e => e?.id)).size === stage.events.length
    && new Set(stage.events.map(e => e?.src)).size === stage.events.length);
}
export function isPitStageLifeStageV61(stage: PitStageLifeStageV61): boolean {
  return validStage(stage) && stage.events.length === 3 && (stage.replacesV60Stage === undefined || stage.replacesV60Stage === true)
    && stage.events.every(event => isPitStageNativeEventV61(event, stage.stageId, "pit-life")
      && (event.reusedV60EventId === undefined || stage.replacesV60Stage === true && event.reusedV60EventId === event.id)
      && (event.excludedFighterIds === undefined || Array.isArray(event.excludedFighterIds) && event.excludedFighterIds.every(id))
      && (event.idleVisibility === undefined || ["rest", "hidden"].includes(event.idleVisibility))
      && (event.opacity === undefined || finite(event.opacity, .05, 1))
      && (event.clipWorld === undefined || event.placement.anchor === "world" && finite(event.clipWorld.x, -960, 1920)
        && finite(event.clipWorld.y, -540, 1080) && finite(event.clipWorld.width, 1, 1920) && finite(event.clipWorld.height, 1, 1080))
      && (event.travelX === undefined || Array.isArray(event.travelX) && event.travelX.length === 2
        && event.travelX.every(x => finite(x, -960, 1920)) && event.travelX[0] !== event.travelX[1]
        && event.idleVisibility === "hidden" && event.placement.anchor === "world" && Boolean(event.clipWorld)));
}
/** Hides only the named actor; all three authored events remain in the deterministic bag. */
export function getPitStageLifeExclusionsV61(stage: PitStageLifeStageV61, fighterIds: readonly string[], replacements?: ReadonlySet<string>): ReadonlySet<string> {
  return new Set([...(replacements ?? []), ...stage.events.filter(event => event.excludedFighterIds?.some(id => fighterIds.includes(id))).map(event => event.id)]);
}
/** No renamed copies or accidental double cast. An explicit correction retains the three seeded identities and order. */
export function validatePitStageLifeOverrideV61(stage: PitStageLifeStageV61, base?: PitStageLifeStageV60): void {
  if (!base && !stage.replacesV60Stage) return;
  if (!base || !stage.replacesV60Stage || stage.stageId !== base.stageId
    || stage.events.some((event, index) => event.id !== base.events[index]?.id)) throw new Error(`Invalid V61 correction overlay: ${stage.stageId}`);
  for (const event of stage.events) {
    const original = base.events.find(candidate => candidate.id === event.id)!;
    if (event.reusedV60EventId) {
      if (event.travelX || event.clipWorld || event.idleVisibility || event.opacity !== undefined) throw new Error(`V60 reuse cannot add new movement: ${event.id}`);
      for (const key of ["sha256", "width", "height", "frames", "fps", "restFrame", "reducedMotionFrame", "placement"] as const) {
        if (JSON.stringify(event[key]) !== JSON.stringify(original[key])) throw new Error(`Altered V60 reuse in V61: ${event.id}/${key}`);
      }
    } else if (base.events.some(candidate => candidate.sha256 === event.sha256)) throw new Error(`Undeclared V60 copy in V61: ${event.id}`);
  }
}
export function isPitStageStoryStageV61(stage: PitStageStoryStageV61): boolean {
  if (!validStage(stage) || !stage.events.length || stage.events.length > 8) return false;
  const replacements = stage.events.flatMap(event => event.replacesAmbientEventId ? [event.replacesAmbientEventId] : []);
  if (new Set(replacements).size !== replacements.length) return false;
  return stage.events.every(event => isPitStageNativeEventV61(event, stage.stageId, "pit-story")
    && ["round-start", "round-victory", "round-end", "match-end", "narrative-cue"].includes(event.trigger)
    && ["hidden", "rest"].includes(event.idleVisibility)
    && (event.afterPlayback === undefined || event.afterPlayback === "release" || event.afterPlayback === "hold-last" && event.trigger === "narrative-cue")
    && (event.trigger === "narrative-cue" ? cues.includes(event.cue!) && id(event.encounterId!) && event.idleVisibility === "hidden" : event.cue === undefined && event.encounterId === undefined)
    && (!event.replacesAmbientEventId || id(event.replacesAmbientEventId))
    && (!event.replacesAmbientEventId || event.idleVisibility === "hidden")
    && (event.excludedFighterIds === undefined || Array.isArray(event.excludedFighterIds) && event.excludedFighterIds.every(id)));
}
function select<T extends { readonly stageId: string }>(stageId: string, manifest: PitStageManifestV61<T>, valid: (stage: T) => boolean): T | null {
  if (!manifest || manifest.schemaVersion !== 1 || manifest.release !== "V61" || !Array.isArray(manifest.stages)) throw new Error("Invalid V61 stage manifest");
  const matches = manifest.stages.filter(stage => stage.stageId === stageId);
  if (!matches.length) return null;
  if (matches.length !== 1 || !valid(matches[0])) throw new Error(`Invalid V61 native stage metadata: ${stageId}`);
  return matches[0];
}
export const getPitStageLifeV61Stage = (stageId: string, manifest = PIT_STAGE_LIFE_V61) => select(stageId, manifest, isPitStageLifeStageV61);
export const getPitStageStoryV61Stage = (stageId: string, manifest = PIT_STAGE_STORY_V61) => select(stageId, manifest, isPitStageStoryStageV61);
export function getPitStageV61Paths(stageId: string): readonly string[] {
  return [...(getPitStageLifeV61Stage(stageId)?.events ?? []), ...(getPitStageStoryV61Stage(stageId)?.events ?? [])].map(event => event.src);
}
