import source from '../data/shipAcquisitionSourceV89.json';
import type { SaveGame } from '../types';
import { getChronicleRank } from './clanChronicle';

export const SHIP_ACQUISITION_SOURCE_V89 = source;
/** Dedicated original-project staging. This role does not rename a dock NPC.
 * One physical inspection candidate is present, never an infinite catalogue.
 * Dimensions, worn latch and hand adjustment are staging adaptations, not lore. */
export const SHIP_ACQUISITION_BINDING_V89 = {
  sceneId: 'D6-C-R2-M021', missionId: 'R2-M021', siteId: 'shipyard-v89',
  npcId: 'shipyard-v89:responsible', voiceProfileId: 'D6-V-C-CHANTIER',
  npcName: 'Responsable du chantier', candidateId: 'shipyard-v89:hull-01',
  shipId: 'classic-predator-spaceship', worldWidth: 1680, spawnX: 144,
  stride: 24, minimumX: 72, maximumX: 1632, gateX: 1272, entryX: 1416,
  posts: { responsible: 96, hull: 504, load: 792, sas: 1128 }, radius: 60,
  adaptation: 'Original local hangar and existing-part latch adjustment; no certified canonical dimensions, price, stock, capacity or grant.',
} as const;
const b = SHIP_ACQUISITION_BINDING_V89;
const sourceSha = source.source.sha256;
const sheet = (name: string) => source.sheets.find(item => item.name === name)!;
const cell = (row: {number: number; cells: {address: string; value: unknown}[]}, column: string) =>
  String(row.cells.find(item => item.address === column + row.number)?.value ?? '');
export const SHIP_ACQUISITION_LINES_V89 = sheet('Répliques V6').rows
  .filter(row => cell(row, 'B') === b.sceneId).map(row => ({
    id: cell(row, 'A'), phase: cell(row, 'C'), option: cell(row, 'D'), speaker: cell(row, 'F'),
    text: cell(row, 'G'), gesture: cell(row, 'H'), condition: cell(row, 'I'),
    address: 'Répliques V6!A' + row.number + ':K' + row.number,
  }));
const lineIds = SHIP_ACQUISITION_LINES_V89.map(line => line.id);
const line = (suffix: string) => b.sceneId + '-' + suffix;

/** The real upstream consumer supplies these receipts after its means
 * transaction and agreement are durable. No inspection/UI action constructs
 * this authority. No current provider is assumed: null remains the default. */
export interface ShipAcquisitionAuthorityV89 {
  version: 1; ownerSaveCreatedAt: string; sourceId: 'R2-M021'; sourceSha256: string;
  candidateId: typeof b.candidateId; shipId: typeof b.shipId; issuerId: typeof b.npcId;
  instanceId: string; agreementReceiptId: string; meansReceiptId: string; meansConsumed: true;
}
export type ShipAcquisitionFindingV89 = 'hull' | 'load' | 'sas-fault' | 'sas-repaired' | 'entered';
export interface ShipAcquisitionStateV89 {
  version: 1; ownerSaveCreatedAt: string; sourceSha256: string; revision: number;
  candidateId: typeof b.candidateId; shipId: typeof b.shipId;
  actor: {x: number; facing: -1 | 1; steps: number};
  intent: 'A' | 'B' | null; deferred: boolean; interruptions: number;
  checks: {hull: boolean; load: boolean; hangarCrossed: boolean};
  latch: {alignment: number; seated: boolean; locked: boolean; faultObserved: boolean;
    repaired: boolean; verified: boolean; failedTests: number};
  reportedFindings: ShipAcquisitionFindingV89[];
  /** Historical source permission does not authorize a new handover if the
   * current upstream receipt is absent/replaced. Issued rights remain issued. */
  dialogueAuthority: ShipAcquisitionAuthorityV89 | null;
  authorityReceipt: ShipAcquisitionAuthorityV89 | null; issuedAtRevision: number | null; issuedAtStep: number | null;
  enteredAtStep: number | null; presentedLineIds: string[];
}
export interface ShipAcquisitionHostV89 {
  id: string; x: number; present: boolean; alive: boolean; conscious: boolean;
}
export interface ShipAcquisitionCandidateV89 {
  siteId: string; id: string; shipId: string; present: boolean;
}
export interface ShipAcquisitionContextV89 {
  save: Pick<SaveGame, 'createdAt' | 'profile' | 'prologue'>;
  active: boolean; focused: boolean; suspended: boolean;
  /** Same objects rendered by the new dedicated scene, not another port NPC. */
  host: ShipAcquisitionHostV89 | null; candidate: ShipAcquisitionCandidateV89 | null;
  authority: ShipAcquisitionAuthorityV89 | null;
}
export type ShipAcquisitionActionV89 =
  {kind: 'walk'; direction: -1 | 1} | {kind: 'intent'; option: 'A' | 'B'} |
  {kind: 'inspect-hull' | 'inspect-load' | 'test-sas' | 'seat-latch' | 'lock-latch' |
    'report' | 'request-rights' | 'defer' | 'resume'} |
  {kind: 'align-latch'; direction: -1 | 1};
export interface ShipAcquisitionEvaluationV89 {
  state: ShipAcquisitionStateV89 | null; writable: boolean; paused: boolean;
  near: keyof typeof b.posts | null; hostAvailable: boolean; hostNear: boolean;
  physicalReady: boolean; personalOwned: boolean; canIssueRights: boolean;
  phase: 'inspection' | 'deferred' | 'awaiting-rights' | 'rights-issued' | 'entered';
  missing: string[]; message: string;
}
export interface ShipAcquisitionResultV89 {
  accepted: boolean; changed: boolean; state: ShipAcquisitionStateV89 | null; message: string;
}
const record = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const id = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 160 && !/[\x00-\x1f]/.test(v);
const integer = (v: unknown, max = 100000): v is number =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 && v <= max;
const bool = (v: unknown): v is boolean => typeof v === 'boolean';
const exact = (v: Record<string, unknown>, keys: readonly string[]) =>
  Object.keys(v).length === keys.length && keys.every(key => Object.hasOwn(v, key));
const authorityKeys = ['version','ownerSaveCreatedAt','sourceId','sourceSha256','candidateId','shipId','issuerId',
  'instanceId','agreementReceiptId','meansReceiptId','meansConsumed'];
export function normalizeShipAcquisitionAuthorityV89(raw: unknown, owner: string): ShipAcquisitionAuthorityV89 | null {
  if (!record(raw) || !exact(raw, authorityKeys) || raw.version !== 1 || raw.ownerSaveCreatedAt !== owner ||
    !id(owner) || !Number.isFinite(Date.parse(owner)) || raw.sourceId !== b.missionId ||
    raw.sourceSha256 !== sourceSha || raw.candidateId !== b.candidateId || raw.shipId !== b.shipId || raw.issuerId !== b.npcId ||
    !id(raw.instanceId) || !id(raw.agreementReceiptId) || !id(raw.meansReceiptId) || raw.meansConsumed !== true) return null;
  return {version: 1, ownerSaveCreatedAt: owner, sourceId: b.missionId, sourceSha256: sourceSha,
    candidateId: b.candidateId, shipId: b.shipId, issuerId: b.npcId, instanceId: raw.instanceId,
    agreementReceiptId: raw.agreementReceiptId, meansReceiptId: raw.meansReceiptId, meansConsumed: true};
}
const sameAuthority = (left: ShipAcquisitionAuthorityV89, right: ShipAcquisitionAuthorityV89) =>
  JSON.stringify(left) === JSON.stringify(right);
export function createShipAcquisitionV89(owner: string): ShipAcquisitionStateV89 | null {
  if (!id(owner) || !Number.isFinite(Date.parse(owner))) return null;
  return {version: 1, ownerSaveCreatedAt: owner, sourceSha256: sourceSha, revision: 0,
    candidateId: b.candidateId, shipId: b.shipId, actor: {x: b.spawnX, facing: 1, steps: 0}, intent: null,
    deferred: false, interruptions: 0, checks: {hull: false, load: false, hangarCrossed: false},
    latch: {alignment: -2, seated: false, locked: false, faultObserved: false, repaired: false, verified: false, failedTests: 0},
    reportedFindings: [], dialogueAuthority: null, authorityReceipt: null, issuedAtRevision: null, issuedAtStep: null,
    enteredAtStep: null, presentedLineIds: []};
}
const stateKeys = ['version','ownerSaveCreatedAt','sourceSha256','revision','candidateId','shipId','actor','intent',
  'deferred','interruptions','checks','latch','reportedFindings','dialogueAuthority','authorityReceipt',
  'issuedAtRevision','issuedAtStep','enteredAtStep','presentedLineIds'];
const findings: readonly ShipAcquisitionFindingV89[] = ['hull','load','sas-fault','sas-repaired','entered'];
const ready = (state: ShipAcquisitionStateV89) => state.checks.hull && state.checks.load &&
  state.checks.hangarCrossed && state.latch.verified;
const observedFindings = (state: ShipAcquisitionStateV89): ShipAcquisitionFindingV89[] =>
  findings.filter(finding => finding === 'hull' ? state.checks.hull : finding === 'load' ? state.checks.load :
    finding === 'sas-fault' ? state.latch.faultObserved : finding === 'sas-repaired' ? state.latch.verified :
      state.enteredAtStep !== null);
const reportedReady = (state: ShipAcquisitionStateV89) =>
  ['hull','load','sas-fault','sas-repaired'].every(finding => state.reportedFindings.includes(finding as ShipAcquisitionFindingV89));
/** Future/foreign/unknown/incoherent data is refused, never reset. Importers
 * preserve the original bytes and reject the entire incompatible campaign. */
export function normalizeShipAcquisitionV89(raw: unknown, owner?: string): ShipAcquisitionStateV89 | null {
  if (!record(raw) || !exact(raw, stateKeys) || raw.version !== 1 || !id(raw.ownerSaveCreatedAt) ||
    !Number.isFinite(Date.parse(raw.ownerSaveCreatedAt)) || (owner !== undefined && raw.ownerSaveCreatedAt !== owner) ||
    raw.sourceSha256 !== sourceSha || !integer(raw.revision) || raw.candidateId !== b.candidateId || raw.shipId !== b.shipId ||
    !record(raw.actor) || !exact(raw.actor, ['x','facing','steps']) || !integer(raw.actor.steps) ||
    raw.actor.steps > raw.revision || !integer(raw.actor.x, b.maximumX) || raw.actor.x < b.minimumX ||
    raw.actor.x % b.stride !== 0 || (raw.actor.facing !== -1 && raw.actor.facing !== 1) ||
    Math.abs(raw.actor.x - b.spawnX) > raw.actor.steps * b.stride ||
    (raw.actor.steps - Math.abs(raw.actor.x - b.spawnX) / b.stride) % 2 !== 0 ||
    (raw.intent !== null && raw.intent !== 'A' && raw.intent !== 'B') || !bool(raw.deferred) ||
    !integer(raw.interruptions) || raw.interruptions > raw.revision || !record(raw.checks) ||
    !exact(raw.checks, ['hull','load','hangarCrossed']) ||
    !['hull','load','hangarCrossed'].every(key => bool((raw.checks as Record<string, unknown>)[key])) ||
    !record(raw.latch) || !exact(raw.latch, ['alignment','seated','locked','faultObserved','repaired','verified','failedTests']) ||
    typeof raw.latch.alignment !== 'number' || !Number.isSafeInteger(raw.latch.alignment) || Math.abs(raw.latch.alignment) > 3 ||
    !['seated','locked','faultObserved','repaired','verified'].every(key => bool((raw.latch as Record<string, unknown>)[key])) ||
    !integer(raw.latch.failedTests) || raw.latch.failedTests > raw.revision ||
    !Array.isArray(raw.reportedFindings) || raw.reportedFindings.length > findings.length ||
    raw.reportedFindings.some(value => !findings.includes(value as ShipAcquisitionFindingV89)) ||
    new Set(raw.reportedFindings).size !== raw.reportedFindings.length ||
    !Array.isArray(raw.presentedLineIds) || raw.presentedLineIds.length > lineIds.length ||
    raw.presentedLineIds.some(value => typeof value !== 'string' || !lineIds.includes(value)) ||
    new Set(raw.presentedLineIds).size !== raw.presentedLineIds.length) return null;
  const c = raw.checks, l = raw.latch;
  if ((l.seated && l.alignment !== 0) || (l.locked && !l.seated) ||
    l.faultObserved !== (Number(l.failedTests) > 0) || l.repaired !== l.verified ||
    (l.repaired && (!l.faultObserved || !l.seated || !l.locked || l.alignment !== 0)) ||
    (l.faultObserved && !c.hull) || (c.load && !c.hull) ||
    (c.hangarCrossed && (!c.hull || Number(raw.actor.steps) < Math.ceil((960 - b.spawnX) / b.stride))) ||
    (l.verified && !c.hangarCrossed) || (raw.deferred && Number(raw.interruptions) < 1)) return null;
  // Earliest source-report return is 78 fixed strides (nearest sas 1080 back to responsible 144).
  // Its eleven non-walking gestures are hull/load/fault/two crans/seat/lock/test/intent/report/rights.
  // After issue near responsible, entry at 1416 needs at least another 53 strides.
  const dialogueAuthority = raw.dialogueAuthority === null ? null : normalizeShipAcquisitionAuthorityV89(raw.dialogueAuthority, raw.ownerSaveCreatedAt);
  const authorityReceipt = raw.authorityReceipt === null ? null : normalizeShipAcquisitionAuthorityV89(raw.authorityReceipt, raw.ownerSaveCreatedAt);
  if ((raw.dialogueAuthority !== null && !dialogueAuthority) || (raw.authorityReceipt !== null && !authorityReceipt) ||
    (authorityReceipt && (!dialogueAuthority || !sameAuthority(authorityReceipt, dialogueAuthority))) ||
    (raw.issuedAtRevision !== null && (!integer(raw.issuedAtRevision) || raw.issuedAtRevision < 1 || raw.issuedAtRevision > raw.revision)) ||
    (authorityReceipt !== null) !== (raw.issuedAtRevision !== null) ||
    (raw.issuedAtStep !== null && (!integer(raw.issuedAtStep) || raw.issuedAtStep > raw.actor.steps)) ||
    (authorityReceipt !== null) !== (raw.issuedAtStep !== null) ||
    (authorityReceipt && (Number(raw.issuedAtStep) < 78 || Number(raw.issuedAtRevision) < Number(raw.issuedAtStep) + 11)) ||
    (raw.enteredAtStep !== null && (!integer(raw.enteredAtStep) || raw.enteredAtStep < Math.ceil((b.entryX - b.spawnX) / b.stride) ||
      raw.enteredAtStep > raw.actor.steps)) || (raw.enteredAtStep !== null && (!authorityReceipt || raw.deferred ||
      raw.issuedAtStep === null || Number(raw.enteredAtStep) < Number(raw.issuedAtStep) + 53)) ||
    (authorityReceipt && raw.actor.x >= b.entryX && raw.enteredAtStep === null) ||
    (!authorityReceipt && raw.actor.x > b.gateX) || (authorityReceipt && (raw.intent === null || !c.hull || !c.load || !c.hangarCrossed || !l.verified)) ||
    (raw.presentedLineIds.length > 0 && !dialogueAuthority) ||
    (raw.presentedLineIds.includes(line('SUCCES---01')) && raw.enteredAtStep === null) ||
    (raw.presentedLineIds.includes(line('ECHEC---01')) && !l.faultObserved) ||
    (raw.presentedLineIds.includes(line('REPRISE---01')) && Number(raw.interruptions) < 1) ||
    (raw.presentedLineIds.some(value => /-(CHOIX|REPONSE)-A-/.test(String(value))) && raw.intent !== 'A') ||
    (raw.presentedLineIds.some(value => /-(CHOIX|REPONSE)-B-/.test(String(value))) && raw.intent !== 'B')) return null;
  const state: ShipAcquisitionStateV89 = {
    version: 1, ownerSaveCreatedAt: raw.ownerSaveCreatedAt, sourceSha256: sourceSha, revision: raw.revision,
    candidateId: b.candidateId, shipId: b.shipId,
    actor: {x: raw.actor.x, facing: raw.actor.facing, steps: raw.actor.steps},
    intent: raw.intent, deferred: raw.deferred, interruptions: raw.interruptions,
    checks: {hull: c.hull as boolean, load: c.load as boolean, hangarCrossed: c.hangarCrossed as boolean},
    latch: {alignment: l.alignment as number, seated: l.seated as boolean, locked: l.locked as boolean, faultObserved: l.faultObserved as boolean,
      repaired: l.repaired as boolean, verified: l.verified as boolean, failedTests: l.failedTests as number},
    reportedFindings: raw.reportedFindings as ShipAcquisitionFindingV89[], dialogueAuthority, authorityReceipt,
    issuedAtRevision: raw.issuedAtRevision as number | null, issuedAtStep: raw.issuedAtStep as number | null,
    enteredAtStep: raw.enteredAtStep as number | null,
    presentedLineIds: raw.presentedLineIds as string[],
  };
  const actualFindings = observedFindings(state);
  if (state.reportedFindings.some(finding => !actualFindings.includes(finding)) ||
    (authorityReceipt && !reportedReady(state))) return null;
  const minimumActions = state.actor.steps + Number(state.checks.hull) + Number(state.checks.load) +
    Number(state.latch.faultObserved) + Number(state.latch.seated) + Number(state.latch.locked) +
    Number(state.latch.verified) + Number(state.intent !== null) + Number(!!authorityReceipt) +
    Number(state.reportedFindings.length > 0) + state.interruptions + Math.abs(state.latch.alignment + 2);
  if (state.revision < minimumActions) return null;
  return structuredClone(state);
}
export function shipAcquisitionEligibleV89(save: ShipAcquisitionContextV89['save']): boolean {
  const rank = save.prologue ? getChronicleRank(save.prologue.chronicle) : save.profile.rankId;
  return ['blooded','elite','elder','ancient'].includes(rank ?? '');
}
/** The scene uses these same dedicated actors when it is actually mounted.
 * This helper creates staging facts, not authority or ownership. */
export function shipAcquisitionSceneFactsV89() {
  return {
    host: {id: b.npcId, x: b.posts.responsible, present: true, alive: true, conscious: true},
    candidate: {siteId: b.siteId, id: b.candidateId, shipId: b.shipId, present: true},
  };
}
export function nearestShipAcquisitionPostV89(x: number): keyof typeof b.posts | null {
  return (Object.entries(b.posts) as [keyof typeof b.posts, number][])
    .find(([, target]) => Math.abs(x - target) <= b.radius)?.[0] ?? null;
}
const hostPresent = (context: ShipAcquisitionContextV89) => !!context.host &&
  context.host.id === b.npcId && context.host.x === b.posts.responsible &&
  context.host.present && context.host.alive && context.host.conscious;
const candidatePresent = (context: ShipAcquisitionContextV89) => !!context.candidate &&
  context.candidate.siteId === b.siteId && context.candidate.id === b.candidateId &&
  context.candidate.shipId === b.shipId && context.candidate.present;
const currentAuthority = (state: ShipAcquisitionStateV89, context: ShipAcquisitionContextV89) =>
  state.authorityReceipt ?? normalizeShipAcquisitionAuthorityV89(context.authority, context.save.createdAt);
const authorityMatches = (state: ShipAcquisitionStateV89, authority: ShipAcquisitionAuthorityV89 | null) =>
  !!authority && (!state.dialogueAuthority || sameAuthority(state.dialogueAuthority, authority));
export function evaluateShipAcquisitionV89(raw: unknown, context: ShipAcquisitionContextV89): ShipAcquisitionEvaluationV89 {
  const state = raw === null || raw === undefined ? createShipAcquisitionV89(context.save.createdAt) :
    normalizeShipAcquisitionV89(raw, context.save.createdAt);
  const eligible = shipAcquisitionEligibleV89(context.save);
  const candidateAvailable = candidatePresent(context);
  const writable = !!state && eligible && candidateAvailable;
  const paused = !context.active || !context.focused || context.suspended;
  const physicalReady = !!state && ready(state);
  const hostAvailable = hostPresent(context);
  const hostNear = !!state && hostAvailable && Math.abs(state.actor.x - context.host!.x) <= b.radius;
  const authority = state ? currentAuthority(state, context) : null;
  const missing: string[] = [];
  if (!state) missing.push('Checkpoint de chantier futur, étranger ou incohérent : données conservées.');
  if (!eligible) missing.push('Le rang Blooded doit être réellement acquis ; le chantier ne le donne pas.');
  if (!candidateAvailable) missing.push('La coque candidate de ce chantier doit réellement être présente.');
  if (!hostAvailable) missing.push('Le responsable doit être présent, vivant et conscient ; aucune remise ni parole à distance.');
  if (state && !state.authorityReceipt && !authority) missing.push('Moyens et accord d’acquisition non attestés. Le réglage peut continuer ; aucun droit ne sera remis.');
  if (state && authority && !authorityMatches(state, authority)) missing.push('Le reçu courant diffère de celui du dialogue conservé ; aucune remise par remplacement implicite.');
  if (state && !state.intent) missing.push('Présenter une intention au responsable : mobilité ou autonomie.');
  if (state && !physicalReady) missing.push('Inspecter la coque et les supports, traverser le hangar, constater puis régler et vérifier le sas.');
  if (state && physicalReady && !reportedReady(state)) missing.push('Revenir au responsable pour lui rapporter les contrôles réellement accomplis.');
  const phase = state?.enteredAtStep !== null && state?.enteredAtStep !== undefined ? 'entered' :
    state?.deferred ? 'deferred' : state?.authorityReceipt ? 'rights-issued' : physicalReady ? 'awaiting-rights' : 'inspection';
  const canIssueRights = writable && !paused && !!state && !state.deferred && !state.authorityReceipt &&
    hostNear && physicalReady && !!state.intent && reportedReady(state) && authorityMatches(state, authority);
  return {state, writable, paused, near: state ? nearestShipAcquisitionPostV89(state.actor.x) : null,
    hostAvailable, hostNear, physicalReady, personalOwned: !!state?.authorityReceipt && state.enteredAtStep !== null,
    canIssueRights, phase, missing,
    message: !writable ? missing[0] : paused ? 'Chantier suspendu : reprenez la scène active.' :
      state?.deferred ? 'Démarche différée. Position, diagnostic et travaux restent conservés.' :
      phase === 'entered' ? 'Droits remis et seuil franchi. Le voyage et ses réserves restent à préparer.' :
      phase === 'rights-issued' ? 'Droits remis une seule fois. Traversez maintenant le sas pour constater l’entrée.' :
      physicalReady ? 'Réglage vérifié. Revenez au responsable avec votre relevé.' :
      'Le responsable attend à gauche. Rejoignez la coque et le sas à pied.'};
}
const denied = (state: ShipAcquisitionStateV89 | null, message: string): ShipAcquisitionResultV89 =>
  ({accepted: false, changed: false, state, message});
/** Fixed saved walking increments, not action-asserted coordinates. The root
 * re-derives live context and persists this candidate before acknowledging it. */
export function actShipAcquisitionV89(raw: unknown, action: ShipAcquisitionActionV89, context: ShipAcquisitionContextV89): ShipAcquisitionResultV89 {
  const e = evaluateShipAcquisitionV89(raw, context);
  if (!e.writable || !e.state) return denied(e.state, e.message);
  if (e.paused) return denied(e.state, 'Chantier suspendu : aucune commande appliquée.');
  if (e.state.deferred && action.kind !== 'resume') return denied(e.state, 'Reprenez volontairement la démarche différée.');
  if (e.state.revision >= 100000) return denied(e.state, 'Limite du checkpoint atteinte ; dernier relevé conservé.');
  const s = structuredClone(e.state);
  const refuse = (message: string) => denied(e.state, message);
  const unchanged = (message: string): ShipAcquisitionResultV89 =>
    ({accepted: true, changed: false, state: e.state, message});
  const authority = currentAuthority(s, context);
  const sourceAllowed = e.hostNear && authorityMatches(s, authority);
  const present = (suffix: string) => {
    if (!sourceAllowed || !authority) return;
    s.dialogueAuthority ??= structuredClone(authority);
    const id = line(suffix);
    if (!s.presentedLineIds.includes(id)) s.presentedLineIds.push(id);
  };
  const presentIntention = () => {
    if (!s.intent) return;
    present('CHOIX-' + s.intent + '-01'); present('REPONSE-' + s.intent + '-01');
  };
  let message = '';
  switch (action.kind) {
    case 'walk': {
      if (action.direction !== -1 && action.direction !== 1) return refuse('Direction de marche invalide.');
      const max = s.authorityReceipt ? b.maximumX : b.gateX;
      const next = Math.max(b.minimumX, Math.min(max, s.actor.x + action.direction * b.stride));
      if (next === s.actor.x) return unchanged(s.authorityReceipt ? 'Fin de la coursive.' : 'Le sas reste fermé : les droits ne sont pas remis.');
      s.actor.x = next; s.actor.facing = action.direction; s.actor.steps++;
      if (s.checks.hull && next >= 960) s.checks.hangarCrossed = true;
      if (s.authorityReceipt && next >= b.entryX && s.enteredAtStep === null) {
        s.enteredAtStep = s.actor.steps;
        message = 'Seuil physiquement franchi après remise. Coque et propriétaire consignés ; aucun voyage ni carburant ajouté.';
      } else message = 'Pas accompli dans le hangar.';
      break;
    }
    case 'intent': {
      if (!e.hostNear) return refuse('Rejoignez le responsable présent au repère gauche.');
      if (action.option !== 'A' && action.option !== 'B') return refuse('Intention inconnue.');
      if (s.intent && s.intent !== action.option) return refuse('Cette démarche conserve son intention déjà présentée. Aucun compromis n’est remplacé automatiquement.');
      const before = s.presentedLineIds.length;
      if (s.intent === action.option && !sourceAllowed) return unchanged('Intention déjà inscrite ; aucune coque attribuée.');
      s.intent = action.option; present('OUV---01'); presentIntention();
      if (e.state.intent === action.option && before === s.presentedLineIds.length) return unchanged('Intention et répliques déjà consignées.');
      message = action.option === 'A' ? 'Intention de mobilité inscrite. Examinez la place disponible, sans capacité inventée.' :
        'Intention d’autonomie inscrite. Examinez les supports de réserve, sans plein gratuit.';
      break;
    }
    case 'inspect-hull':
      if (e.near !== 'hull') return refuse('Rejoignez la coque sur son support.');
      if (s.checks.hull) return unchanged('Coque déjà observée ; relevé conservé.');
      s.checks.hull = true; message = 'Coque utilisée et accès au sas repérés. La propriété ne change pas.'; break;
    case 'inspect-load':
      if (e.near !== 'load') return refuse('Rejoignez les supports de charge.');
      if (!s.checks.hull) return refuse('Observer la coque avant ses supports.');
      if (s.checks.load) return unchanged('Supports déjà observés ; aucune réserve ajoutée.');
      s.checks.load = true; message = 'Supports de charge inspectés. Quantités, capacité et réserves restent celles de leurs vrais registres.'; break;
    case 'test-sas':
      if (e.near !== 'sas' || !s.checks.hull || !s.checks.hangarCrossed) return refuse('Inspectez la coque puis traversez le hangar jusqu’au sas.');
      if (s.latch.verified) return unchanged('Sas déjà vérifié ; aucun travail répété.');
      if (s.latch.alignment === 0 && s.latch.seated && s.latch.locked && s.latch.faultObserved) {
        s.latch.repaired = true; s.latch.verified = true;
        message = 'Le verrou réglé tient au test. Aucun composant, coût ou droit n’a été ajouté.';
      } else {
        if (s.latch.faultObserved) return unchanged('Défaut conservé. Alignez le repère, asseyez la pièce puis verrouillez avant le test.');
        s.latch.faultObserved = true; s.latch.failedTests++;
        message = 'Défaut réellement constaté : le verrou n’est pas assis. La remise reste suspendue.';
      }
      break;
    case 'align-latch':
      if (e.near !== 'sas' || !s.latch.faultObserved) return refuse('Constater le défaut au sas avant ce réglage.');
      if (action.direction !== -1 && action.direction !== 1) return refuse('Cran de réglage invalide.');
      if (s.latch.verified || s.latch.locked || s.latch.seated) return refuse('L’attache assise ou verrouillée ne se règle pas à travers son appui.');
      if (Math.abs(s.latch.alignment + action.direction) > 3) return unchanged('Butée du repère atteinte.');
      s.latch.alignment += action.direction;
      message = 'Repère déplacé d’un cran : ' + s.latch.alignment + '. Ce réglage seul ne valide pas le test.'; break;
    case 'seat-latch':
      if (e.near !== 'sas' || !s.latch.faultObserved || s.latch.alignment !== 0) return refuse('Rejoignez le sas et alignez les repères avant d’asseoir la pièce.');
      if (s.latch.seated) return unchanged('Pièce déjà assise.');
      s.latch.seated = true; message = 'Pièce assise sur son appui existant. Verrouillez puis testez.'; break;
    case 'lock-latch':
      if (e.near !== 'sas' || !s.latch.seated) return refuse('Asseoir la pièce au sas avant de verrouiller.');
      if (s.latch.locked) return unchanged('Attache déjà verrouillée.');
      s.latch.locked = true; message = 'Attache verrouillée. Le test reste à accomplir.'; break;
    case 'report': {
      if (!e.hostNear) return refuse('Revenez auprès du responsable présent pour rapporter vos observations.');
      const before = JSON.stringify([s.reportedFindings, s.presentedLineIds]);
      s.reportedFindings = observedFindings(s);
      present('OUV---01'); presentIntention();
      if (s.enteredAtStep !== null) present('SUCCES---01');
      else if (s.latch.faultObserved && !s.latch.verified) present('ECHEC---01');
      if (s.interruptions > 0 && (s.checks.hull || s.latch.faultObserved)) present('REPRISE---01');
      if (before === JSON.stringify([s.reportedFindings, s.presentedLineIds])) return unchanged('Ce rapport est déjà consigné ; aucune remise répétée.');
      message = s.enteredAtStep !== null ? 'Entrée et droits rapportés au responsable. Acquisition constatée une fois, sans récompense ajoutée.' :
        s.latch.verified ? 'Le réglage vérifié est rapporté. Les moyens et l’accord restent nécessaires à la remise.' :
          'Les seuls faits réellement observés sont rapportés ; aucun résultat absent n’est annoncé.';
      break;
    }
    case 'request-rights':
      if (s.authorityReceipt) return unchanged('Droits déjà remis ; aucune deuxième consommation. Rejoignez le seuil du navire.');
      if (!e.hostNear) return refuse('La remise exige le retour auprès du responsable présent.');
      if (!ready(s) || !s.intent || !reportedReady(s)) return refuse('L’intention, les observations, le test et leur rapport doivent être accomplis.');
      if (!authority) return refuse('Moyens et accord non attestés. Travaux conservés ; aucun vaisseau offert ni prix inventé.');
      if (!authorityMatches(s, authority)) return refuse('Le reçu courant ne correspond pas au dialogue conservé. Aucun remplacement implicite.');
      present('OUV---01'); presentIntention();
      s.dialogueAuthority = structuredClone(authority); s.authorityReceipt = structuredClone(authority);
      s.issuedAtRevision = s.revision + 1; s.issuedAtStep = s.actor.steps;
      message = 'Droits constatés à partir des vrais reçus durables. Traversez le sas : la remise seule ne conclut pas l’entrée.'; break;
    case 'defer':
      if (s.enteredAtStep !== null) return unchanged('Acquisition déjà constatée ; l’attente ne la rejoue pas.');
      s.deferred = true; s.interruptions++;
      message = 'Démarche différée. Position, intention, défaut et travaux conservés.'; break;
    case 'resume':
      if (!s.deferred) return unchanged('Chantier déjà actif.');
      s.deferred = false;
      if (e.hostNear && (s.checks.hull || s.latch.faultObserved)) {
        present('OUV---01'); presentIntention(); present('REPRISE---01');
      }
      message = 'Reprise au dernier repère conservé. Aucun travail ni coût rejoué.'; break;
    default: return refuse('Commande de chantier inconnue.');
  }
  s.revision++;
  const normalized = normalizeShipAcquisitionV89(s, context.save.createdAt);
  if (!normalized) return refuse('Checkpoint incohérent ; dernier relevé confirmé conservé.');
  return {accepted: true, changed: true, state: normalized, message};
}
/** Public UI policy, shared with the actual native button/keyboard handler.
 * The reducer still rechecks everything against the root's latest context. */
export function canShipAcquisitionActionV89(e: ShipAcquisitionEvaluationV89, action: ShipAcquisitionActionV89): boolean {
  if (!e.writable || e.paused || !e.state) return false;
  const s = e.state;
  if (s.deferred) return action.kind === 'resume';
  if (action.kind === 'resume') return false;
  if (action.kind === 'walk') return action.direction === -1 ? s.actor.x > b.minimumX :
    action.direction === 1 && s.actor.x < (s.authorityReceipt ? b.maximumX : b.gateX);
  if (action.kind === 'intent') return e.hostNear && (!s.intent || s.intent === action.option);
  if (action.kind === 'report') return e.hostNear;
  if (action.kind === 'request-rights') return e.canIssueRights;
  if (action.kind === 'defer') return s.enteredAtStep === null;
  if (action.kind === 'inspect-hull') return e.near === 'hull' && !s.checks.hull;
  if (action.kind === 'inspect-load') return e.near === 'load' && s.checks.hull && !s.checks.load;
  if (e.near !== 'sas') return false;
  if (action.kind === 'test-sas') return s.checks.hull && s.checks.hangarCrossed && !s.latch.verified;
  if (action.kind === 'align-latch') return (action.direction === -1 || action.direction === 1) &&
    s.latch.faultObserved && !s.latch.seated && !s.latch.locked && Math.abs(s.latch.alignment + action.direction) <= 3;
  if (action.kind === 'seat-latch') return s.latch.faultObserved && s.latch.alignment === 0 && !s.latch.seated;
  if (action.kind === 'lock-latch') return s.latch.seated && !s.latch.locked;
  return false;
}
export function dispatchShipAcquisitionUIActionV89(e: ShipAcquisitionEvaluationV89, action: ShipAcquisitionActionV89,
  commit: (action: ShipAcquisitionActionV89) => ShipAcquisitionResultV89): ShipAcquisitionResultV89 {
  if (!canShipAcquisitionActionV89(e, action)) return denied(e.state, e.paused ? 'Chantier suspendu.' :
    'Ce geste exige le bon poste et ses conditions réelles ; aucun raccourci ne le valide.');
  return commit(action);
}
export function shipAcquisitionOwnedHullV89(raw: unknown, owner: string) {
  const state = normalizeShipAcquisitionV89(raw, owner);
  if (!state?.authorityReceipt || state.enteredAtStep === null) return null;
  return {ownerSaveCreatedAt: owner, shipId: state.shipId, instanceId: state.authorityReceipt.instanceId,
    kind: 'acquisition-receipt' as const, sourceId: b.missionId, candidateId: state.candidateId};
}
export function shipAcquisitionKeyboardActionV89(key: string,
  gate: {active: boolean; focusedInside: boolean; suspended: boolean; controlTarget: boolean; defaultPrevented: boolean}): ShipAcquisitionActionV89 | null {
  if (!gate.active || !gate.focusedInside || gate.suspended || gate.controlTarget || gate.defaultPrevented) return null;
  return key === 'ArrowLeft' ? {kind: 'walk', direction: -1} : key === 'ArrowRight' ? {kind: 'walk', direction: 1} : null;
}
