import nativeLife from './data/pitStageLifeV66.json';
import { isPitStageLifeStageV60, type PitStageLifeStageV60 } from './pitStageLifeV60';
export interface PitStageLifeManifestV66 { readonly schemaVersion: 1; readonly release: 'V66'; readonly stages: readonly PitStageLifeStageV60[] }
export const PIT_STAGE_LIFE_V66 = nativeLife as unknown as PitStageLifeManifestV66;
/** The proven three-event cell contract is reused, with original V66 pixels and paths. */
export function isPitStageLifeStageV66(stage: PitStageLifeStageV60): boolean {
  if (!stage || !Array.isArray(stage.events) || stage.events.some(event => !event?.src?.startsWith(`/game/sprites/v66/pit-life/${stage.stageId}/`))) return false;
  return isPitStageLifeStageV60({...stage,events:stage.events.map(event=>({...event,src:event.src.replace('/sprites/v66/','/sprites/v60/')}))});
}
export function getPitStageLifeV66Stage(stageId: string, manifest = PIT_STAGE_LIFE_V66): PitStageLifeStageV60 | null {
  if (!manifest || manifest.schemaVersion !== 1 || manifest.release !== 'V66' || !Array.isArray(manifest.stages)) throw new Error('Invalid V66 stage-life manifest');
  const matches = manifest.stages.filter(stage=>stage.stageId === stageId);
  if (!matches.length) return null;
  if (matches.length !== 1 || !isPitStageLifeStageV66(matches[0])) throw new Error(`Invalid V66 native stage metadata: ${stageId}`);
  return matches[0];
}
export const getPitStageLifeV66Paths = (stageId: string) => getPitStageLifeV66Stage(stageId)?.events.map(event=>event.src) ?? [];
