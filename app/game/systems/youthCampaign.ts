import { isYouthCagePhase } from "./youthCage";
import type { SaveGame } from "../types";
import { isYouthPatrolPhase } from "./youthPatrol";
import { normalizeNurseryCampaign } from "./nurseryCampaign";
import { recordChronicleEvidence } from "./clanChronicle";
import { createYouthTraining, YOUTH_PHASES, normalizeYouthTraining, normalizeYouthReceipt, getYouthReceipts, type YouthState, type YouthReceipt } from "./youthTraining";

export interface YouthEquipment {
  wristblade: boolean;
  biomask: boolean;
  accent: "ochre" | "ash" | "rust" | null;
}
/** One primary campaign write owns both the playable checkpoint and every earned item. */
export interface YouthCampaignProgress {
  version: 1;
  status: "active" | "completed";
  checkpoint: YouthState;
  receipts: YouthReceipt[];
  equipment: YouthEquipment;
  startedAt: string;
  completedAt: string | null;
}
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const iso = (value: unknown): value is string => typeof value === "string" && value.length < 128 && Number.isFinite(Date.parse(value));
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const earned = (receipts: readonly YouthReceipt[], id: YouthReceipt["id"]) => receipts.some(receipt => receipt.id === id);
function equipmentFor(state: YouthState, receipts: readonly YouthReceipt[]): YouthEquipment {
  return { wristblade: earned(receipts, "youth-first-blade"), biomask: earned(receipts, "youth-first-biomask"), accent: earned(receipts, "youth-first-biomask") ? state.cosmetic : null };
}
export function normalizeYouthCampaign(value: unknown): YouthCampaignProgress | null {
  if (!record(value) || value.version !== 1 || !["active", "completed"].includes(String(value.status)) || !iso(value.startedAt)) return null;
  const checkpoint = normalizeYouthTraining(value.checkpoint);
  if (!checkpoint || !Array.isArray(value.receipts)) return null;
  const receipts = getYouthReceipts(checkpoint);
  if (receipts.length !== value.receipts.length || new Set(value.receipts.map(item => record(item) ? item.id : null)).size !== receipts.length) return null;
  for (const item of value.receipts) {
    const receipt = normalizeYouthReceipt(item, checkpoint);
    if (!receipt || !receipts.some(expected => same(expected, receipt))) return null;
  }
  const equipment = equipmentFor(checkpoint, receipts);
  if (!record(value.equipment) || value.equipment.wristblade !== equipment.wristblade || value.equipment.biomask !== equipment.biomask || value.equipment.accent !== equipment.accent) return null;
  const complete = YOUTH_PHASES.indexOf(checkpoint.phase) >= YOUTH_PHASES.indexOf("morning");
  if ((value.status === "completed") !== complete || (complete ? !iso(value.completedAt) || Date.parse(value.completedAt) < Date.parse(value.startedAt) : value.completedAt !== null)) return null;
  return { version: 1, status: value.status as YouthCampaignProgress["status"], checkpoint, receipts, equipment, startedAt: value.startedAt, completedAt: value.completedAt as string | null };
}
/** Reject mismatched narrative proof instead of falling back to an adult campaign. */
export function youthCampaignMatchesSave(value: unknown): boolean {
  if (!record(value)) return false;
  const prologue = normalizeNurseryCampaign(value.prologue);
  // Current youth chapters cannot import unplayed future hunts to gain ship/rank access.
  // Legacy adult campaigns have no prologue and keep their separate historical recognition.
  if (prologue) {
    if (!record(value.prologue) || !record(value.prologue.chronicle)) return false;
    const raw = value.prologue.chronicle;
    if (!Array.isArray(raw.evidence) || !Array.isArray(raw.rites) || raw.evidence.length !== prologue.chronicle.evidence.length || raw.rites.length !== prologue.chronicle.rites.length) return false;
    if (prologue.chronicle.evidence.some(item => !["intro-begun", "intro-completed", "training-completed"].includes(item.id)) || prologue.chronicle.rites.some(item => item.id !== "nursery-recognition")) return false;
    if (raw.evidence.some(item => !record(item) || !prologue.chronicle.evidence.some(expected => expected.id === item.id && expected.sourceId === item.sourceId)) ||
        raw.rites.some(item => !record(item) || !prologue.chronicle.rites.some(expected => expected.id === item.id && expected.sourceId === item.sourceId))) return false;
  }
  const trainingEvidence = prologue?.chronicle.evidence.some(item => item.id === "training-completed") ?? false;
  if (value.youthTraining === undefined || value.youthTraining === null) return !trainingEvidence;
  const youth = normalizeYouthCampaign(value.youthTraining);
  if (!youth || prologue?.status !== "completed" || !record(value.homeworld) || !Array.isArray(value.homeworld.greetedNpcIds)) return false;
  const greeted = value.homeworld.greetedNpcIds;
  if (!["hunt-king", "terrace-instructor"].every(id => greeted.includes(id))) return false;
  return trainingEvidence === earned(youth.receipts, "youth-camp-duel");
}
export function startYouthCampaign(save: SaveGame, now = new Date().toISOString()): SaveGame | null {
  if (save.prologue?.status !== "completed" || !youthCampaignMatchesSave(save) || !iso(now) || !["hunt-king", "terrace-instructor"].every(id => save.homeworld.greetedNpcIds.includes(id))) return null;
  if (save.youthTraining) return normalizeYouthCampaign(save.youthTraining) && youthCampaignMatchesSave(save) ? save : null;
  const checkpoint = createYouthTraining();
  return { ...save, youthTraining: { version: 1, status: "active", checkpoint, receipts: [], equipment: { wristblade: false, biomask: false, accent: null }, startedAt: now, completedAt: null } };
}
function advance(save: SaveGame, incoming: readonly YouthReceipt[], state: YouthState, now: string): SaveGame | null {
  const progress = normalizeYouthCampaign(save.youthTraining), checkpoint = normalizeYouthTraining(state);
  if (!progress || !checkpoint || !youthCampaignMatchesSave(save) || !iso(now) || checkpoint.tick < progress.checkpoint.tick) return null;
  const previous = progress.checkpoint;
  const retryingDuel = previous.phase === "camp-defeat" && checkpoint.phase === "camp-duel" && checkpoint.progress.duelAttempts > previous.progress.duelAttempts;
  const retryingPatrol = previous.phase === "patrol-defeat" && checkpoint.phase === "patrol-ambush" && checkpoint.patrol?.attempts === (previous.patrol?.attempts ?? 0) + 1;
  const retryingCage = previous.phase === "cage-defeat" && checkpoint.phase === "cage-intro" && checkpoint.cage?.attempts === (previous.cage?.attempts ?? 0) + 1;
  if ((YOUTH_PHASES.indexOf(checkpoint.phase) < YOUTH_PHASES.indexOf(previous.phase) && !retryingDuel && !retryingPatrol && !retryingCage) || checkpoint.phaseStartedAt < previous.phaseStartedAt) return null;
  const counters = ["moveMarkers", "jumps", "dodges", "strikes", "throws", "courseAttempts", "duelAttempts"] as const;
  if (counters.some(key => checkpoint.progress[key] < previous.progress[key])) return null;
  // A failed course may reset its local marks/timer only while increasing its attempt.
  if (checkpoint.progress.courseAttempts === previous.progress.courseAttempts &&
      (checkpoint.progress.courseMarkers < previous.progress.courseMarkers || checkpoint.progress.courseElapsed < previous.progress.courseElapsed)) return null;
  if (progress.equipment.biomask && checkpoint.cosmetic !== previous.cosmetic) return null;
  const receipts = getYouthReceipts(checkpoint);
  // Previously acknowledged proofs keep their original simulation tick forever.
  if (progress.receipts.some(previous => !receipts.some(receipt => same(previous, receipt)))) return null;
  const supplied = incoming.map(item => normalizeYouthReceipt(item, checkpoint));
  if (supplied.some(item => !item || !receipts.some(receipt => same(item, receipt))) || new Set(supplied.map(item => item?.id)).size !== supplied.length) return null;
  const fresh = receipts.filter(receipt => !progress.receipts.some(previous => previous.id === receipt.id));
  if (fresh.some(receipt => !supplied.some(item => same(item, receipt)))) return null;
  if (previous.desert && (!checkpoint.desert || checkpoint.desert.clues < previous.desert.clues || previous.desert.ravineCleared && !checkpoint.desert.ravineCleared)) return null;
  // Existing completed reconnaissance remains a safe stop. Only the explicitly
  // acknowledged patrol briefing can open the new chapter, never a later proof.
  if (previous.phase === "desert-complete" && !same(checkpoint, previous) && checkpoint.phase !== "patrol-briefing") return null;
  if (previous.phase === "patrol-complete" && !same(checkpoint, previous) && checkpoint.phase !== "cage-briefing") return null;
  if (previous.phase === "cage-complete" && !same(checkpoint, previous)) return null;
  if (previous.cage) {
    const old = previous.cage, next = checkpoint.cage;
    if (!next || next.attempts < old.attempts || next.totalDamageTaken < old.totalDamageTaken || old.insignia && !next.insignia ||
        next.attempts > old.attempts && !retryingCage || !retryingCage && (next.damageDealt < old.damageDealt || next.damageTaken < old.damageTaken)) return null;
  }
  if (previous.patrol) {
    const old = previous.patrol, next = checkpoint.patrol;
    if (!next || next.halts < old.halts || next.attempts < old.attempts || next.totalHits < old.totalHits ||
        next.attempts > old.attempts && !retryingPatrol || !retryingPatrol && (next.evaded < old.evaded || next.hits < old.hits)) return null;
  }
  const training = earned(receipts, "youth-camp-duel");
  const chronicle = training ? recordChronicleEvidence(save.prologue!.chronicle, { id: "training-completed", sourceId: "chronicle.training.completed" }) : null;
  if (chronicle && !chronicle.accepted) return null;
  const completedAt = YOUTH_PHASES.indexOf(checkpoint.phase) >= YOUTH_PHASES.indexOf("morning") ? progress.completedAt ?? now : null;
  const youthTraining: YouthCampaignProgress = { ...progress, status: completedAt ? "completed" : "active", checkpoint, receipts, equipment: equipmentFor(checkpoint, receipts), completedAt };
  if (!normalizeYouthCampaign(youthTraining)) return null;
  const playedSeconds = Math.max(0, Math.floor(checkpoint.tick / 60) - Math.floor(progress.checkpoint.tick / 60));
  return { ...save, profile: { ...save.profile, playTimeSeconds: save.profile.playTimeSeconds + playedSeconds },
    prologue: chronicle ? { ...save.prologue!, chronicle: chronicle.state } : save.prologue, youthTraining };
}
/** No new milestone may enter through a routine pause or settings checkpoint. */
export function withYouthCheckpoint(save: SaveGame, state: YouthState): SaveGame | null { return advance(save, [], state, new Date().toISOString()); }
/** Scene receipts and equipment are committed atomically; an identical retry adds nothing. */
export function withYouthProgress(save: SaveGame, receipts: readonly YouthReceipt[], state: YouthState, now = new Date().toISOString()): SaveGame | null { return advance(save, receipts, state, now); }
/** Completed refers to the original formation; later active outings resume their own scene. */
export function youthCampaignNeedsScene(progress: YouthCampaignProgress | null | undefined): boolean {
  if (!progress) return false;
  const phase = progress.checkpoint.phase;
  return progress.status === "active" || phase.startsWith("desert-") && phase !== "desert-complete" || isYouthPatrolPhase(phase) && phase !== "patrol-complete" || isYouthCagePhase(phase) && phase !== "cage-complete";
}
export function youthCampaignObjective(progress: YouthCampaignProgress | null): string {
  if (!progress) return "Le maître t’attend : entre dans le dojo depuis son dialogue pour commencer les exercices.";
  if (progress.checkpoint.phase === "cage-complete") return "Premier duel de la petite Fosse gagné, insigne cosmétique enregistré. Tu restes Unblooded : les rites de chasse autonome et le vaisseau ne sont pas encore acquis.";
  if (isYouthCagePhase(progress.checkpoint.phase)) return "Reprends la petite Fosse à son checkpoint : présentation, duel non létal de novices, récompense cosmétique et retour. Aucun droit adulte ne dépend de cette arène secondaire.";
  if (progress.checkpoint.phase === "patrol-complete") return "Patrouille, rencontre territoriale et évaluation sont enregistrées. Le groupe est revenu au camp sans prélever de trophée ; rejoins le maître pour choisir la petite Fosse de jeunesse. Les rites de chasse autonome restent à venir.";
  if (isYouthPatrolPhase(progress.checkpoint.phase)) return "Rejoins le maître pour reprendre la patrouille à son checkpoint : haltes accompagnées, lecture des charges, évaluation et retour. Une interruption ne supprime pas les étapes déjà acquises.";
  if (progress.checkpoint.phase === "desert-complete") return "La reconnaissance accompagnée du désert est rapportée. Rejoins le maître pour choisir de poursuivre la patrouille ; aucun départ ne se déclenche seul et aucun rite ni rang supplémentaire n’est accordé.";
  if (progress.checkpoint.phase.startsWith("desert-")) return "Rejoins le maître pour reprendre la sortie du désert à son dernier point sûr : observation, passage de basalte et retour accompagné.";
  if (progress.status === "completed") return "Premier réveil accompli. Rejoins le maître pour partir en reconnaissance accompagnée dans le désert. Aucun départ ne se déclenche sans ton choix.";
  const phase = progress.checkpoint.phase;
  if (phase.startsWith("dojo") || phase === "blade-award") return "Reprends les exercices du dojo avec le maître. La première lame attend la réussite de tous les gestes.";
  if (phase === "armory") return "Rejoins l’armurier dans la formation pour recevoir ton premier biomask et choisir la teinte de son lien.";
  if (phase.startsWith("camp")) return "Termine le parcours chronométré et le duel non létal du camp : les deux épreuves sont nécessaires.";
  return "Ta formation est validée. Rejoins ta couche aux baraquements et repose-toi jusqu’au matin.";
}
export function youthEquipmentSummary(progress: YouthCampaignProgress | null): string {
  const gear = progress?.equipment;
  return `Équipement de jeunesse : lame de poignet ${gear?.wristblade ? "acquise au dojo" : "non acquise"} ; biomask ${gear?.biomask ? "reçu — conservé pour la sortie" : "non reçu"}${gear?.accent ? ` ; teinte du lien ${gear.accent === "ochre" ? "ocre" : gear.accent === "ash" ? "cendre" : "rouille"}` : ""}${progress?.checkpoint.cage?.insignia ? " ; insigne de la petite Fosse acquis (cosmétique)" : ""}. Aucun plasma, équipement adulte ou vaisseau accordé.`;
}
