import nativeLife from "./data/pitStageLifeV62.json";
import { isPitStageLifeStageV61, type PitStageLifeStageV61 } from "./pitStageStoryV61";

/** V62 adds original background adaptations, not implicit comic/film chapter state. */
export interface PitStageLifeStageV62 extends PitStageLifeStageV61 {
  readonly continuity: {
    readonly mode: "exhibition-adaptation";
    readonly sourceCells: readonly string[];
    readonly chapterReconstructionComplete: false;
    readonly note: string;
  };
}
export interface PitStageLifeManifestV62 {
  readonly schemaVersion: 1;
  readonly release: "V62";
  readonly stages: readonly PitStageLifeStageV62[];
}
export const PIT_STAGE_LIFE_V62 = nativeLife as unknown as PitStageLifeManifestV62;

/** Reuse the native-cell contract without changing runtime URLs or source pixels. */
export function isPitStageLifeStageV62(stage: PitStageLifeStageV62): boolean {
  if (!stage || !Array.isArray(stage.events) || stage.replacesV60Stage || stage.events.some(event =>
    !event || typeof event.src !== "string" || !event.src.startsWith(`/game/sprites/v62/pit-life/${stage.stageId}/`)
    || event.reusedV60EventId)) return false;
  const c = stage.continuity;
  if (!c || c.mode !== "exhibition-adaptation" || c.chapterReconstructionComplete !== false || !c.note?.trim()
    || !Array.isArray(c.sourceCells) || c.sourceCells.length !== 3 || new Set(c.sourceCells).size !== 3
    || c.sourceCells.some(cell => !/^10_VIE_DES_STAGES!E\d+$/.test(cell))) return false;
  // Validation-only projection. The returned stage retains V62 paths and the measured native data.
  return isPitStageLifeStageV61({ ...stage, events: stage.events.map(event => ({ ...event,
    src: event.src.replace(/^\/game\/sprites\/v62\//, "/game/sprites/v61/") })) });
}

export function getPitStageLifeV62Stage(stageId: string, manifest = PIT_STAGE_LIFE_V62): PitStageLifeStageV62 | null {
  if (!manifest || manifest.schemaVersion !== 1 || manifest.release !== "V62" || !Array.isArray(manifest.stages)) {
    throw new Error("Invalid V62 stage manifest");
  }
  const matches = manifest.stages.filter(stage => stage.stageId === stageId);
  if (!matches.length) return null;
  if (matches.length !== 1 || !isPitStageLifeStageV62(matches[0])) throw new Error(`Invalid V62 native stage metadata: ${stageId}`);
  return matches[0];
}

export const getPitStageV62Paths = (stageId: string): readonly string[] =>
  getPitStageLifeV62Stage(stageId)?.events.map(event => event.src) ?? [];
