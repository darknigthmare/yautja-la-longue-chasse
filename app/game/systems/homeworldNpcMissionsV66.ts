import { normalizeHomeworldExpeditionProof, type HomeworldExpeditionProof } from './homeworldExpedition';
import { normalizeGlassDesertProof, type GlassDesertProof } from './glassDesert';
import { homeworldInteriorForBuildingV64, isHomeworldInteriorWalkableV64, nearestHomeworldInteriorTargetV64 } from './homeworldInteriorsV64';

/** Original errands for this game's city, not a canonical Yautja medical order.
 * Existing expeditions are replayed; no new region, treatment or rite is granted. */
export type NpcMissionIdV66 = 'return-paths-ash' | 'return-paths-glass';
export interface NpcMissionStepV66<T> { accepted: boolean; report: T | null; delivered: boolean }
export interface NpcMissionsV66 {
  version: 1;
  ash: NpcMissionStepV66<HomeworldExpeditionProof>;
  glass: NpcMissionStepV66<GlassDesertProof>;
}
export type NpcMissionActionV66 =
  | { kind: 'accept'; missionId: NpcMissionIdV66 }
  | { kind: 'debrief'; missionId: NpcMissionIdV66; answer: string };
export interface NpcMissionContextV66 {
  autonomousHunter: boolean;
  interiorId: string | null;
  pointId: string | null;
  npcId: string | null;
  actor: { x: number; y: number };
  suspended?: boolean;
}
export interface NpcMissionResultV66 { state: NpcMissionsV66; ok: boolean; changed: boolean; message: string }
export interface NpcMissionOptionV66 { label: string; action: NpcMissionActionV66 }
export const NPC_MISSION_LOCATION_V66 = {
  npcId: 'clan-healer', pointId: 'medbay-service', buildingId: 'clan-lodge',
  npcName: 'Soigneuse des délégations', buildingName: 'Maison des délégations',
} as const;
export const NPC_MISSIONS_V66 = [
  { id: 'return-paths-ash', title: 'Un retour praticable', regionId: 'ash-marches',
    brief: 'Les chasseurs qui reviennent doivent pouvoir rejoindre les quais. Après avoir accepté, repars dans les Marches de Cendre, accomplis le relevé et ouvre le raccourci. Reviens ensuite me dire ce qui est réellement praticable.',
    fieldObjective: 'Nouvelle sortie dans les Marches : relever les deux pistes, récupérer le rapport et ouvrir le raccourci avant de rejoindre la navette.' },
  { id: 'return-paths-glass', title: 'Le verre sous les pas', regionId: 'glass-desert',
    brief: 'Le verre transmet les impacts. Après cette nouvelle demande, parcours le Désert de Verre et ouvre son pont de retour. Rapporte la méthode de traversée que tu as réellement utilisée ; je ne te demande ni prise ni traitement improvisé.',
    fieldObjective: 'Nouvelle sortie dans le Désert : accomplir la traversée choisie, relever le journal et la balise, puis ouvrir le pont et revenir à la navette.' },
] as const;
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const emptyStep = <T>(): NpcMissionStepV66<T> => ({ accepted: false, report: null, delivered: false });
export function defaultNpcMissionsV66(): NpcMissionsV66 {
  return { version: 1, ash: emptyStep<HomeworldExpeditionProof>(), glass: emptyStep<GlassDesertProof>() };
}
const ashReport = (value: unknown) => {
  const proof = normalizeHomeworldExpeditionProof(value);
  return proof && proof.ticks <= 5_184_000 ? proof : null;
};
function validStep(value: unknown, normalize: (raw: unknown) => unknown): boolean {
  if (!record(value) || typeof value.accepted !== 'boolean' || typeof value.delivered !== 'boolean') return false;
  if (value.report !== null && !normalize(value.report)) return false;
  return value.accepted ? !value.delivered || value.report !== null : value.report === null && !value.delivered;
}
/** Callers must protect future subversions during load/import, before normalization. */
export function isNpcMissionsV66(value: unknown): value is NpcMissionsV66 {
  if (!record(value) || value.version !== 1 || !validStep(value.ash, ashReport)
    || !validStep(value.glass, normalizeGlassDesertProof)) return false;
  const ash = value.ash as NpcMissionStepV66<HomeworldExpeditionProof>;
  const glass = value.glass as NpcMissionStepV66<GlassDesertProof>;
  return !glass.accepted || ash.delivered;
}
/** Missing legacy data starts empty. Malformed later steps never create completion. */
export function normalizeNpcMissionsV66(value: unknown): NpcMissionsV66 {
  const clean = defaultNpcMissionsV66();
  if (!record(value) || value.version !== 1) return clean;
  if (record(value.ash) && value.ash.accepted === true) {
    clean.ash.accepted = true;
    clean.ash.report = ashReport(value.ash.report);
    clean.ash.delivered = !!clean.ash.report && value.ash.delivered === true;
  }
  if (clean.ash.delivered && record(value.glass) && value.glass.accepted === true) {
    clean.glass.accepted = true;
    clean.glass.report = normalizeGlassDesertProof(value.glass.report);
    clean.glass.delivered = !!clean.glass.report && value.glass.delivered === true;
  }
  return clean;
}
export function canMeetNpcMissionGiverV66(context: NpcMissionContextV66): boolean {
  if (!context.autonomousHunter || context.suspended || context.interiorId !== NPC_MISSION_LOCATION_V66.buildingId
    || context.pointId !== NPC_MISSION_LOCATION_V66.pointId || context.npcId !== NPC_MISSION_LOCATION_V66.npcId) return false;
  const room = homeworldInteriorForBuildingV64(context.interiorId);
  if (!room || !isHomeworldInteriorWalkableV64(room, context.actor)) return false;
  const target = nearestHomeworldInteriorTargetV64(room, context.actor);
  return target?.kind === 'point' && target.pointId === NPC_MISSION_LOCATION_V66.pointId;
}
export function npcMissionsJournalV66(value: unknown) {
  const state = normalizeNpcMissionsV66(value);
  const mission = state.ash.delivered ? NPC_MISSIONS_V66[1] : NPC_MISSIONS_V66[0];
  const step = state.ash.delivered ? state.glass : state.ash;
  const phase = state.glass.delivered ? 'complete' as const : !step.accepted ? 'offer' as const
    : step.report ? 'return' as const : 'field' as const;
  return { title: 'Les passages de retour', missionId: mission.id, missionTitle: mission.title, phase,
    completed: Number(state.ash.delivered) + Number(state.glass.delivered), total: 2,
    pointId: phase === 'field' ? `region-${mission.regionId}` : NPC_MISSION_LOCATION_V66.pointId,
    objective: phase === 'complete' ? 'Les deux relevés ont été remis à la soigneuse. Aucun soin, rang ni équipement n’a été attribué.'
      : phase === 'offer' ? `Rencontre la Soigneuse des délégations à l’intérieur de la Maison des délégations : ${mission.title}.`
      : phase === 'field' ? `${mission.fieldObjective} Un rapport antérieur à l’acceptation ne compte pas.`
      : 'Rapport conservé. Reviens à pied auprès de la soigneuse, dans la Maison des délégations, pour le débrief.' };
}
function glassRouteAnswer(proof: GlassDesertProof) {
  return proof.crossingRoute === 'stepping-stones' ? 'rock-cornices' : 'decoy-corridor';
}
export function npcMissionsDialogueV66(value: unknown, npcId: string | null | undefined, autonomousHunter = true):
  { title: string; text: string; objective: string; options: NpcMissionOptionV66[] } | null {
  if (npcId !== NPC_MISSION_LOCATION_V66.npcId) return null;
  const state = normalizeNpcMissionsV66(value), journal = npcMissionsJournalV66(state);
  const response = (text: string, options: NpcMissionOptionV66[] = []) => ({ title: journal.title, text, objective: journal.objective, options });
  if (!autonomousHunter) return response('Ces relevés sont destinés aux chasseurs autonomes. Termine d’abord le parcours de jeunesse avec ton maître ; cette demande ne contourne ni la formation ni le rite.');
  if (value !== undefined && !isNpcMissionsV66(value)) return response('Le registre de ces missions est incompatible ou endommagé. Aucune demande ni remise ne sera écrite depuis cet état.');
  if (journal.phase === 'complete') return response('Les deux voies de retour figurent au carnet de cette maison. Merci pour les observations vérifiées. Elles ne désignent aucun coupable et ne changent pas les décisions de ton enquête.');
  if (journal.phase === 'offer') {
    const mission = NPC_MISSIONS_V66.find(item => item.id === journal.missionId)!;
    return response(mission.brief, [{ label: `Accepter · ${mission.title}`, action: { kind: 'accept', missionId: mission.id } }]);
  }
  if (journal.phase === 'field') return response('Le carnet attend une nouvelle sortie complète depuis l’acceptation. Ouvrir un ancien rapport ou quitter une expédition ne remplit pas la demande. Les accès aux régions gardent leurs prérequis habituels.');
  if (journal.missionId === 'return-paths-ash') return response('Tu as ouvert le raccourci des Marches. Quel fait peux-tu me garantir pour les retours ?', [
    { label: 'Un raccourci vers la navette a été ouvert et le retour effectué.', action: { kind: 'debrief', missionId: journal.missionId, answer: 'shortcut-confirmed' } },
    { label: 'Toutes les Marches sont désormais sans danger.', action: { kind: 'debrief', missionId: journal.missionId, answer: 'region-harmless' } },
  ]);
  const proof = state.glass.report!;
  const beacon = proof.beaconDisposition === 'disable' ? 'Tu as coupé le canal de la balise ; je ne le note pas comme encore actif.' : 'Tu as conservé le canal de la balise pour l’enquête.';
  return response(`Le pont de service est ouvert. ${beacon} Quelle traversée as-tu vérifiée sur cette sortie ?`, [
    { label: 'Les corniches rocheuses, en relevant le cairn.', action: { kind: 'debrief', missionId: journal.missionId, answer: 'rock-cornices' } },
    { label: 'Le corridor parcouru pendant que le leurre détourne le fouisseur.', action: { kind: 'debrief', missionId: journal.missionId, answer: 'decoy-corridor' } },
    { label: 'Le verre est devenu sans danger pour tous les voyageurs.', action: { kind: 'debrief', missionId: journal.missionId, answer: 'region-harmless' } },
  ]);
}
/** Only a physically reached giver accepts or closes a mission. The host persists
 * this proposed state atomically before updating its ref/UI or announcing success. */
export function applyNpcMissionsV66(value: unknown, action: NpcMissionActionV66, context: NpcMissionContextV66): NpcMissionResultV66 {
  const state = normalizeNpcMissionsV66(value);
  const reply = (ok: boolean, changed: boolean, message: string) => ({ state, ok, changed, message });
  if (value !== undefined && !isNpcMissionsV66(value)) return reply(false, false, 'Registre incompatible : aucune mission modifiée.');
  if (!canMeetNpcMissionGiverV66(context)) return reply(false, false, 'Rejoins la soigneuse dans la Maison des délégations. Cette conversation n’autorise aucune action à distance.');
  if (!record(action) || !['return-paths-ash', 'return-paths-glass'].includes(action.missionId)) return reply(false, false, 'Demande inconnue.');
  const step = action.missionId === 'return-paths-ash' ? state.ash : state.glass;
  if (action.missionId === 'return-paths-glass' && !state.ash.delivered) return reply(false, false, 'Remets d’abord le relevé des Marches à la soigneuse.');
  if (action.kind === 'accept') {
    if (step.accepted) return reply(true, false, 'Cette demande est déjà acceptée ; son rapport ne sera pas effacé.');
    step.accepted = true;
    return reply(true, true, 'Demande acceptée. Effectue maintenant la sortie complète puis reviens à cette même interlocutrice.');
  }
  if (action.kind !== 'debrief' || !step.accepted || !step.report) return reply(false, false, 'Il manque un rapport complet obtenu après l’acceptation.');
  if (step.delivered) return reply(true, false, 'Ce relevé est déjà remis. Aucune récompense ni conséquence ne se répète.');
  const expected = action.missionId === 'return-paths-ash' ? 'shortcut-confirmed' : glassRouteAnswer(state.glass.report!);
  if (action.answer !== expected) return reply(false, false, 'Ce n’est pas ce que prouve ton rapport. Décris le passage réellement emprunté ; une voie ouverte ne rend pas toute la région sûre.');
  step.delivered = true;
  return reply(true, true, action.missionId === 'return-paths-ash'
    ? 'Premier relevé remis. La soigneuse propose maintenant une vérification du Désert de Verre.'
    : 'Chaîne des passages de retour terminée. Les deux rapports sont consignés, sans soin, équipement, trophée ni promotion accordés.');
}
/** Call ONLY from the successful live expedition completion path, in the same
 * durable transaction as the region report. Never call while loading old saves.
 * This is local save validation, not cryptographic proof or an anti-cheat system. */
export function recordNpcMissionReportV66(value: unknown, rawProof: unknown): NpcMissionResultV66 {
  const state = normalizeNpcMissionsV66(value);
  const reply = (ok: boolean, changed: boolean, message: string) => ({ state, ok, changed, message });
  if (value !== undefined && !isNpcMissionsV66(value)) return reply(false, false, 'Registre des missions incompatible.');
  const ash = ashReport(rawProof), glass = normalizeGlassDesertProof(rawProof);
  if (!ash && !glass) return reply(false, false, 'Rapport incomplet : aucune demande de PNJ avancée.');
  const step = ash ? state.ash : state.glass;
  if (!step.accepted || (glass && !state.ash.delivered)) return reply(true, false, 'Aucune demande acceptée ne concerne cette sortie.');
  if (step.report) return reply(true, false, 'Le premier rapport de cette demande est déjà conservé.');
  if (ash) state.ash.report = ash;
  else state.glass.report = glass;
  return reply(true, true, 'Rapport de mission conservé. La remise attend ton retour auprès de la soigneuse.');
}
