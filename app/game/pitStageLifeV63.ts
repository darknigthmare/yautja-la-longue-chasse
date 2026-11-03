import nativeLife from "./data/pitStageLifeV63.json";
import { getPitStageLifeV62Stage } from "./pitStageLifeV62";
import { isPitStageLifeStageV61, type PitStageLifeEventV61, type PitStageLifeStageV61 } from "./pitStageStoryV61";

export interface PitStageLifeEventV63 extends PitStageLifeEventV61 { readonly reusedV62EventId?: string }
export interface PitStageLifeStageV63 extends PitStageLifeStageV61 {
  readonly replacesV62Stage: true;
  readonly events: readonly PitStageLifeEventV63[];
  readonly suppressedV62Events: readonly { readonly id: string; readonly sourceCell: string; readonly reason: string }[];
  readonly continuity: { readonly mode: "exhibition-adaptation"; readonly chapterReconstructionComplete: false;
    readonly sourceCells: readonly string[]; readonly note: string };
}
export interface PitStageLifeManifestV63 { readonly schemaVersion: 1; readonly release: "V63"; readonly stages: readonly PitStageLifeStageV63[] }
export const PIT_STAGE_LIFE_V63 = nativeLife as unknown as PitStageLifeManifestV63;

/** Explicit replacement: retained V62 cells stay byte/metadata-identical, suppressed actors stay in source archives. */
export function isPitStageLifeStageV63(stage: PitStageLifeStageV63): boolean {
  if (!stage || !/^arena-\d{3}-[a-z0-9-]+$/.test(stage.stageId) || stage.replacesV62Stage !== true || stage.replacesV60Stage
    || !Array.isArray(stage.events) || stage.events.length < 3 || stage.events.length > 6 || !Array.isArray(stage.suppressedV62Events)) return false;
  const base = getPitStageLifeV62Stage(stage.stageId);
  if (!base || new Set(stage.events.map(e => e?.id)).size !== stage.events.length || new Set(stage.events.map(e => e?.src)).size !== stage.events.length) return false;
  const c = stage.continuity;
  if (!c || c.mode !== "exhibition-adaptation" || c.chapterReconstructionComplete !== false || !c.note?.trim()
    || !Array.isArray(c.sourceCells) || c.sourceCells.length !== 3 || new Set(c.sourceCells).size !== 3 || c.sourceCells.some(s => !/^10_VIE_DES_STAGES!E\d+$/.test(s))) return false;
  const retained = stage.events.filter(e => e.reusedV62EventId), suppressed = stage.suppressedV62Events;
  if (stage.events.length - retained.length !== 3) return false;
  const accounted = [...retained.map(e => e.id), ...suppressed.map(e => e.id)];
  if (accounted.length !== base.events.length || new Set(accounted).size !== accounted.length || base.events.some(e => !accounted.includes(e.id))
    || suppressed.some(e => !e.reason?.trim() || !/^10_VIE_DES_STAGES!E\d+$/.test(e.sourceCell))) return false;
  return stage.events.every(event => {
    if (event.reusedV60EventId) return false;
    if (event.reusedV62EventId) {
      const original = base.events.find(e => e.id === event.id);
      const { reusedV62EventId, ...unchanged } = event;
      return reusedV62EventId === event.id && JSON.stringify(unchanged) === JSON.stringify(original);
    }
    if (!event.src?.startsWith(`/game/sprites/v63/pit-life/${stage.stageId}/`) || base.events.some(e => e.id === event.id || e.sha256 === event.sha256)) return false;
    if (event.frames?.length !== 6) return false;
    // Existing optional movement validation is reused only for validation, never as a runtime cast.
    return isPitStageLifeStageV61({ stageId: stage.stageId, events: [0, 1, 2].map(index => ({ ...event,
      id: `${event.id}-validation-${index}`, src: event.src.replace(/^\/game\/sprites\/v63\//, "/game/sprites/v61/").replace(/\.png$/, `-validation-${index}.png`) })) });
  });
}
export function getPitStageLifeV63Stage(stageId: string, manifest = PIT_STAGE_LIFE_V63): PitStageLifeStageV63 | null {
  if (!manifest || manifest.schemaVersion !== 1 || manifest.release !== "V63" || !Array.isArray(manifest.stages)) throw new Error("Invalid V63 stage manifest");
  const matches = manifest.stages.filter(s => s.stageId === stageId);
  if (!matches.length) return null;
  if (matches.length !== 1 || !isPitStageLifeStageV63(matches[0])) throw new Error(`Invalid V63 native stage metadata: ${stageId}`);
  return matches[0];
}
export const getPitStageV63Paths = (stageId: string): readonly string[] => getPitStageLifeV63Stage(stageId)?.events.map(e => e.src) ?? [];
