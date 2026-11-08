import type { DifficultyId, SaveGame } from '../types';
import { MISSIONS } from '../data';
import { isShipId, type ShipId } from '../shipCatalogue';
import { getChronicleRank, recordChronicleEvidence } from './clanChronicle';
import { createBuriedCradleProgress, parseBuriedCradleProgress, type BuriedCradleProgress } from './buriedCradle';
import { inspectBuriedCradleSnapshot, type BuriedCradleSnapshot } from './buriedCradleSnapshot';

/** PLAN08 / XP-Z11 -> XP-Z12. XP-Z09 is never a victory source. */
export const CRADLE_CAMPAIGN_SOURCE = { planetId: 'PLAN08', entryZoneId: 'XP-Z11', zoneId: 'XP-Z12',
  missions: ['R2-M025', 'R2-M026', 'R2-M027'], crownId: 'xeno-prime-first-crown' } as const;
export const CRADLE_CHECKPOINT_BUDGET: Readonly<Record<DifficultyId, 0 | 1 | 2>> = {
  'young-blood': 2, hunter: 1, elite: 0, elder: 0,
};
export interface BuriedCradleCampaign {
  version: 1;
  ownerCreatedAt: string;
  personalShipId: ShipId;
  difficultyId: DifficultyId;
  status: 'prepared' | 'active' | 'suspended' | 'extracted' | 'reported';
  progress: BuriedCradleProgress;
  outcome: 'unresolved' | 'retreated' | 'victory-without-crown' | 'crown-returned';
  crownDelivered: boolean;
  snapshot?: BuriedCradleSnapshot | null;
}
export interface CradleCampaignInspection {
  status: 'absent' | 'valid' | 'future-version' | 'invalid-save';
  state: BuriedCradleCampaign | null;
}
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const clone = (state: BuriedCradleCampaign): BuriedCradleCampaign => ({ ...state,
  progress: { ...state.progress, visitedRoomIds: [...state.progress.visitedRoomIds], shortcutIds: [...state.progress.shortcutIds] } });

export function inspectBuriedCradleCampaign(value: unknown, owner: string): CradleCampaignInspection {
  if (value == null) return { status: 'absent', state: null };
  if (record(value) && (typeof value.version === 'number' && value.version > 1 ||
      record(value.progress) && typeof value.progress.version === 'number' && value.progress.version > 1)) return { status: 'future-version', state: null };
  const invalid = (): CradleCampaignInspection => ({ status: 'invalid-save', state: null });
  if (!record(value) || Object.keys(value).sort().join('|') !==
      ['version', 'ownerCreatedAt', 'personalShipId', 'difficultyId', 'status', 'progress', 'outcome', 'crownDelivered',
        ...(Object.hasOwn(value, 'snapshot') ? ['snapshot'] : [])].sort().join('|') ||
      value.version !== 1 || !owner || value.ownerCreatedAt !== owner || !isShipId(value.personalShipId) ||
      typeof value.difficultyId !== 'string' || !Object.hasOwn(CRADLE_CHECKPOINT_BUDGET, value.difficultyId) ||
      typeof value.status !== 'string' || !['prepared', 'active', 'suspended', 'extracted', 'reported'].includes(value.status) ||
      typeof value.outcome !== 'string' || !['unresolved', 'retreated', 'victory-without-crown', 'crown-returned'].includes(value.outcome) ||
      typeof value.crownDelivered !== 'boolean') return invalid();
  const progress = parseBuriedCradleProgress(value.progress);
  if (!progress) return invalid();
  const budget = CRADLE_CHECKPOINT_BUDGET[value.difficultyId as DifficultyId];
  if ((progress.checkpointId === '07' && budget < 1) || (progress.checkpointId === '11' && budget < 2)) return invalid();
  const snapshot = inspectBuriedCradleSnapshot(value.snapshot, progress, budget);
  if (snapshot.status === 'future-version') return { status: 'future-version', state: null };
  if (snapshot.status === 'invalid-save') return invalid();
  const terminal = value.status === 'extracted' || value.status === 'reported';
  const outcome = progress.crownClaimed ? 'crown-returned' : progress.bossDefeated ? 'victory-without-crown' : 'retreated';
  if ((terminal ? value.outcome !== outcome : value.outcome !== 'unresolved') ||
      (value.crownDelivered && (value.status !== 'reported' || !progress.crownClaimed)) ||
      (value.status === 'reported' && progress.crownClaimed !== value.crownDelivered) ||
      (value.status === 'prepared' && (snapshot.state || JSON.stringify(progress) !== JSON.stringify(createBuriedCradleProgress()))) ||
      (snapshot.state && snapshot.state.run.extracted !== terminal)) return invalid();
  return { status: 'valid', state: { version: 1, ownerCreatedAt: owner, personalShipId: value.personalShipId,
    difficultyId: value.difficultyId as DifficultyId, status: value.status as BuriedCradleCampaign['status'],
    progress, outcome: value.outcome as BuriedCradleCampaign['outcome'], crownDelivered: value.crownDelivered,
    ...(Object.hasOwn(value, 'snapshot') ? { snapshot: snapshot.state } : {}) } };
}

export function evaluateBuriedCradleAccess(save: Pick<SaveGame, 'prologue' | 'missionProgress' | 'clanShipDocking' | 'planetArrival' | 'wolfCastle'>,
  personalShipId: ShipId, ownedShipIds: readonly string[]) {
  const missing: string[] = [];
  if (save.prologue && !['blooded', 'elite', 'elder', 'ancient'].includes(getChronicleRank(save.prologue.chronicle) ?? ''))
    missing.push('Le rite Blooded doit être reconnu.');
  const remaining = MISSIONS.filter(m => save.missionProgress[m.id]?.status !== 'completed');
  if (remaining.length) missing.push(`Terminer les huit chasses : ${remaining.length} restante${remaining.length > 1 ? 's' : ''}.`);
  if (!isShipId(personalShipId) || !ownedShipIds.includes(personalShipId)) missing.push('Un vaisseau personnel disponible est requis.');
  if (save.clanShipDocking && save.clanShipDocking.status !== 'free-flight') missing.push('Désamarrer du Clan Ship avant le départ.');
  if (save.planetArrival) missing.push('Terminer l’insertion planétaire en cours.');
  if (save.wolfCastle && save.wolfCastle.status !== 'departed') missing.push('Revenir du château Wolf avec son vaisseau.');
  return { allowed: missing.length === 0, missing };
}

export type CradleCampaignAction = { type: 'prepare' | 'depart' | 'suspend' | 'report' }
  | { type: 'checkpoint' | 'extract'; progress: BuriedCradleProgress; snapshot?: BuriedCradleSnapshot };
export interface CradleCampaignContext { personalShipId: ShipId; ownedShipIds: readonly string[] }
export interface CradleCampaignResult {
  accepted: boolean; changed: boolean; state: BuriedCradleCampaign | null;
  prologue: SaveGame['prologue']; message: string;
}
function advances(previous: BuriedCradleProgress, next: BuriedCradleProgress) {
  return previous.visitedRoomIds.every(id => next.visitedRoomIds.includes(id)) &&
    previous.shortcutIds.every(id => next.shortcutIds.includes(id)) &&
    (!previous.drainageOpened || next.drainageOpened) && (!previous.rootRingCut || next.rootRingCut) &&
    (!previous.bossDefeated || next.bossDefeated) && (!previous.crownClaimed || next.crownClaimed) &&
    Number(next.checkpointId) >= Number(previous.checkpointId);
}

/** All changes are returned to the campaign's acknowledged writer. No sidecar or rank grant. */
export function actBuriedCradleCampaign(save: SaveGame, action: CradleCampaignAction, context: CradleCampaignContext): CradleCampaignResult {
  const inspection = inspectBuriedCradleCampaign(save.buriedCradle, save.createdAt);
  let state = inspection.state;
  const original = state;
  let prologue = save.prologue;
  const refuse = (message: string): CradleCampaignResult => ({ accepted: false, changed: false, state: original, prologue: save.prologue, message });
  if (inspection.status === 'invalid-save' || inspection.status === 'future-version') return refuse('Dossier d’expédition incompatible. Les données sont conservées.');
  if (!record(action) || typeof action.type !== 'string' || !['prepare', 'depart', 'suspend', 'report', 'checkpoint', 'extract'].includes(action.type) ||
      Object.keys(action).sort().join('|') !== (action.type === 'checkpoint' || action.type === 'extract'
        ? Object.hasOwn(action, 'snapshot') ? 'progress|snapshot|type' : 'progress|type' : 'type'))
    return refuse('Commande d’expédition inconnue.');
  const before = JSON.stringify(state);
  if (action.type === 'prepare' || action.type === 'depart') {
    const access = evaluateBuriedCradleAccess(save, context.personalShipId, context.ownedShipIds);
    if (!access.allowed) return refuse(access.missing.join(' '));
    if (state && state.personalShipId !== context.personalShipId) return refuse('Reprendre la coque affectée à cette expédition.');
    if (action.type === 'prepare') {
      if (state) return refuse('Les préparatifs sont déjà consignés.');
      state = { version: 1, ownerCreatedAt: save.createdAt, personalShipId: context.personalShipId,
        difficultyId: save.settings.difficultyId, status: 'prepared', progress: createBuriedCradleProgress(),
        outcome: 'unresolved', crownDelivered: false, snapshot: null };
      if (prologue) {
        const evidence = recordChronicleEvidence(prologue.chronicle,
          { id: 'queen-mission-briefing', sourceId: 'chronicle.queen-briefing.completed' });
        if (evidence.accepted) prologue = { ...prologue, chronicle: evidence.state };
      }
    } else {
      if (!state || (!['prepared', 'suspended', 'active'].includes(state.status) && !(state.status === 'reported' && !state.crownDelivered))) return refuse('Préparer l’itinéraire et l’extraction avant de repartir.');
      state = { ...clone(state), status: 'active', outcome: 'unresolved',
        ...(state.status === 'reported' ? { snapshot: null } : {}) };
    }
  } else {
    if (!state) return refuse('Aucune expédition préparée.');
    state = clone(state);
    if (action.type === 'checkpoint' || action.type === 'extract') {
      if (state.status !== 'active') return refuse('Cette expédition n’est pas sur le terrain.');
      const progress = parseBuriedCradleProgress(action.progress);
      if (!progress || !advances(state.progress, progress)) return refuse('Relevé de terrain incompatible ou périmé.');
      const snapshot = inspectBuriedCradleSnapshot(action.snapshot, progress, CRADLE_CHECKPOINT_BUDGET[state.difficultyId]);
      if (snapshot.status === 'future-version' || snapshot.status === 'invalid-save' ||
          Object.hasOwn(action, 'snapshot') && !snapshot.state || state.snapshot && !snapshot.state ||
          snapshot.state && (snapshot.state.run.extracted !== (action.type === 'extract') ||
            snapshot.state.run.clockSeconds < (state.snapshot?.run.clockSeconds ?? 0)))
        return refuse('Le relevé de position et de combat est incompatible ou périmé.');
      state.progress = progress;
      if (snapshot.state) state.snapshot = snapshot.state;
      if (action.type === 'extract') {
        state.status = 'extracted';
        state.outcome = progress.crownClaimed ? 'crown-returned' : progress.bossDefeated ? 'victory-without-crown' : 'retreated';
      }
    } else if (action.type === 'suspend') {
      if (state.status !== 'active') return refuse('Aucune exploration à suspendre.');
      state.status = 'suspended';
    } else if (action.type === 'report') {
      if (state.status === 'reported') return { accepted: true, changed: false, state, prologue, message: 'Débrief déjà consigné.' };
      if (state.status !== 'extracted') return refuse('Rejoindre une extraction physique avant le débrief.');
      state.status = 'reported'; state.crownDelivered = state.progress.crownClaimed;
      if (state.crownDelivered && prologue) {
        const evidence = recordChronicleEvidence(prologue.chronicle,
          { id: 'first-queen-hunt', sourceId: 'chronicle.first-queen.completed' });
        if (evidence.accepted) prologue = { ...prologue, chronicle: evidence.state };
      }
    }
  }
  const checked = inspectBuriedCradleCampaign(state, save.createdAt);
  if (!checked.state) return refuse('La progression ne respecte pas le contrat de reprise.');
  return { accepted: true, changed: before !== JSON.stringify(checked.state), state: checked.state, prologue,
    message: action.type === 'prepare' ? 'Itinéraire XP-Z11 vers le Berceau et extraction préparés.' :
      action.type === 'report' ? checked.state.crownDelivered ? 'Crête rapportée et preuve de chasse inscrite. La reconnaissance d’Élite conserve ses autres rites.'
        : 'Observations rapportées. Aucune crête ni promotion attribuée.' :
      action.type === 'extract' ? 'Extraction confirmée. Le débrief t’attend à bord.' :
      action.type === 'suspend' ? state.snapshot ? 'Exploration suspendue. Position et combat enregistrés.'
        : 'Exploration suspendue. Reprise à la dernière balise autorisée.' : 'Progression du Berceau enregistrée.' };
}
