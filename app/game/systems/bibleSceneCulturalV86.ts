import source from '../data/bibleSceneCulturalV86.json';
import type { SaveGame } from '../types';
import type { HomeworldActor } from './homeworldCity';
import { homeworldCntlipEligibleV77 } from './homeworldCntlipPhysicalV77';
import { HOMEWORLD_REGIONS_V68, isHomeworldRegionWalkableV68, normalizeHomeworldRegionV68, type HomeworldRegionStateV68 } from './homeworldRegionsV68';
import { BIBLE_SOURCE_SHA_V85, type BibleRowV85 } from './bibleSourceV85';

/** Exact source speaker, newly bound to the compatible existing clan. The
 * village/socket/neutral appearance are explicit local staging adaptations;
 * neither Vhar’ko nor a pre-existing table host is renamed or replaced. */
export const BIBLE_CULTURAL_BINDING_V86 = {
  sceneId: 'D6-W-CULT-25', regionId: 'storm-chain', siteId: 'bible-v86:crests-halt',
  npcId: 'bible-v86:crests-halt-host', npcName: 'Hôte de la halte des Crêtes',
  clanName: 'Veilleurs des Crêtes', villageName: 'Refuge des Trois Vents',
  tableId: 'place-table', table: { x: 1940, y: 2060, artId: 'table' },
  host: { x: 1860, y: 2110 }, approach: { x: 1940, y: 2170 }, radius: 105,
  adaptation: 'Dedicated source speaker; authored village/table socket and neutral appearance, not certified canonical 1:1.',
} as const;
export const BIBLE_CULTURAL_SOURCE_V86 = source;
const cell = (row: BibleRowV85, column: string) => String(row.cells.find(c => c.address === `${column}${row.number}`)?.value ?? '');
const sheet = (name: string) => source.sheets.find(s => s.name === name)!;
const sceneRow = sheet('Scènes de dialogue V6').rows[0];
export const BIBLE_CULTURAL_SCENE_V86 = {
  id: cell(sceneRow, 'A'), title: cell(sceneRow, 'B'), location: cell(sceneRow, 'F'),
  participants: cell(sceneRow, 'G'), conditions: cell(sceneRow, 'H'), knowledge: cell(sceneRow, 'I'),
  repetition: cell(sceneRow, 'J'), loreLimits: cell(sceneRow, 'K'), address: 'Scènes de dialogue V6!A416:Q416',
};
export const BIBLE_CULTURAL_CHOICES_V86 = sheet('Choix et actions V6').rows.map(row => ({
  id: cell(row, 'A'), option: cell(row, 'C'), action: cell(row, 'F'), conditions: cell(row, 'G'),
  consequence: cell(row, 'H'), continuation: cell(row, 'I'), address: `Choix et actions V6!A${row.number}:I${row.number}`,
}));
export const BIBLE_CULTURAL_LINES_V86 = sheet('Répliques V6').rows.map(row => ({
  id: cell(row, 'A'), phase: cell(row, 'C'), option: cell(row, 'D'), speaker: cell(row, 'F'),
  text: cell(row, 'G'), gesture: cell(row, 'H'), condition: cell(row, 'I'), address: `Répliques V6!A${row.number}:K${row.number}`,
}));
const choiceLine = 'D6-W-CULT-25-CHOIX-B-01', replyLine = 'D6-W-CULT-25-REPONSE-B-01', resumeLine = 'D6-W-CULT-25-REPRISE---01';
const permittedLines = [choiceLine, replyLine, resumeLine];
export const BIBLE_CULTURAL_LIMITS_V86 = {
  maxReceipts: 64, playableOptions: ['B'] as const, recordedAudio: false, materialSuccess: false,
  scope: 'source-dialogue-and-narrated-actions' as const,
  silentLines: ['D6-W-CULT-25-OUV---01', 'D6-W-CULT-25-SUCCES---01', 'D6-W-CULT-25-REPONSE-A-01'],
};
export interface BibleCulturalReturnV86 { regionId: 'storm-chain'; runId: string; trailCount: 3; observedTicks: number; reported: true }
export interface BibleSceneReceiptV86 {
  sceneId: 'D6-W-CULT-25'; sourceSha256: string; sourceCorpusSha256: string;
  operationId: string; npcId: string; siteId: string; returnProof: BibleCulturalReturnV86;
  option: 'B' | null; step: number; status: 'active' | 'interrupted' | 'resolved';
  presentedLineIds: string[]; narratedActionIds: ('sit' | 'listen' | 'tidy')[];
  materialSuccess: false; interruptedCount: number; lastSafePosition: { x: number; y: number }; lastSafeTick: number;
}
export interface BibleSceneLedgerV86 { version: 1; ownerSaveCreatedAt: string; revision: number; receipts: BibleSceneReceiptV86[] }
export interface BibleCulturalContextV86 {
  ownerSaveCreatedAt: string; ownerMatches: boolean; operationId: string | null; returnProof: BibleCulturalReturnV86 | null;
  eligible: boolean; denial: string | null; actor: { x: number; y: number }; tick: number;
}
export interface BibleCulturalRuntimeV86 {
  save: Pick<SaveGame, 'createdAt' | 'profile' | 'prologue' | 'homeworld'>;
  ownerSaveCreatedAt: string; region: HomeworldRegionStateV68 | null;
  actor?: HomeworldActor; sceneActive: boolean; focused: boolean; suspended: boolean;
  host: { id: string; present: boolean; alive: boolean; conscious: boolean } | null;
  table: { id: string; artId: string; x: number; y: number } | null;
}
/** Derived on every event from actual save/physical refs. No action payload
 * may assert that a hunt was returned, a person is alive or a table exists. */
export function bibleCulturalContextV86(input: BibleCulturalRuntimeV86): BibleCulturalContextV86 {
  const b = BIBLE_CULTURAL_BINDING_V86, region = normalizeHomeworldRegionV68(input.region);
  const actor = input.actor ?? region?.actor ?? { x: NaN, y: NaN, vx: NaN, vy: NaN, grounded: false };
  const ownerMatches = input.ownerSaveCreatedAt === input.save.createdAt;
  const returnProof: BibleCulturalReturnV86 | null = region?.regionId === b.regionId && region.reported && region.traces.length === 3
    && region.observedTicks >= 90 && region.eventReceipts.includes('track') && region.eventReceipts.includes('report')
    ? { regionId: b.regionId, runId: region.runId, trailCount: 3, observedTicks: region.observedTicks, reported: true } : null;
  let denial: string | null = null;
  if (!ownerMatches) denial = 'Cette interaction appartient à une autre partie.';
  else if (!input.sceneActive || !input.focused || input.suspended) denial = 'Reprenez la halte dans la scène active.';
  else if (!homeworldCntlipEligibleV77(input.save)) denial = 'La halte demande le parcours adulte déjà reconnu ; aucun rang n’est accordé ici.';
  else if (!region || region.regionId !== b.regionId || region.zone !== 'village' || region.status !== 'walking') denial = 'Rejoignez le Refuge des Trois Vents.';
  else if (!returnProof) denial = 'Observez la faune locale et remettez le relevé au guide avant cette halte de retour.';
  else if (!input.host || input.host.id !== b.npcId || !input.host.present || !input.host.alive || !input.host.conscious) denial = 'L’hôte doit être présent, vivant et conscient ; aucune réplique à distance.';
  else if (!input.table || input.table.id !== b.tableId || input.table.artId !== b.table.artId || input.table.x !== b.table.x || input.table.y !== b.table.y
    || !HOMEWORLD_REGIONS_V68[b.regionId].props.some(p => p.id === input.table!.id && p.artId === 'table' && p.x === input.table!.x && p.y === input.table!.y)) denial = 'La table native de cette halte n’est pas disponible.';
  else if (![actor.x, actor.y, actor.vx, actor.vy].every(Number.isFinite) || !actor.grounded || Math.hypot(actor.vx, actor.vy) >= 1
    || Math.hypot(actor.x - b.approach.x, actor.y - b.approach.y) > b.radius || Math.hypot(actor.x - b.host.x, actor.y - b.host.y) > 160
    || !isHomeworldRegionWalkableV68(b.regionId, 'village', actor, region.tick)) denial = 'Arrêtez-vous près de la table sur le sol praticable.';
  return { ownerSaveCreatedAt: input.ownerSaveCreatedAt, ownerMatches, operationId: returnProof ? `${b.sceneId}:${returnProof.runId}` : null,
    returnProof, eligible: denial === null, denial, actor: { x: actor.x, y: actor.y }, tick: region?.tick ?? 0 };
}
export function bibleCulturalNearbyV86(region: HomeworldRegionStateV68 | null) {
  const b = BIBLE_CULTURAL_BINDING_V86;
  return !!region && region.regionId === b.regionId && region.zone === 'village' && region.status === 'walking'
    && Math.hypot(region.actor.x - b.approach.x, region.actor.y - b.approach.y) <= b.radius;
}
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const integer = (v: unknown, min: number, max: number): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= min && v <= max;
const iso = (v: unknown): v is string => typeof v === 'string' && v.length <= 32 && Number.isFinite(Date.parse(v)) && new Date(v).toISOString() === v;
const keys = (value: Record<string, unknown>, permitted: readonly string[]) => Object.keys(value).every(key => permitted.includes(key));
export function defaultBibleSceneLedgerV86(ownerSaveCreatedAt: string): BibleSceneLedgerV86 {
  return { version: 1, ownerSaveCreatedAt, revision: 0, receipts: [] };
}
/** Present malformed/future data must be rejected by save inspection, never
 * silently replaced. Legacy saves omit this optional ledger until first use. */
export function normalizeBibleSceneLedgerV86(value: unknown): BibleSceneLedgerV86 | null {
  if (!record(value) || value.version !== 1 || !iso(value.ownerSaveCreatedAt) || !integer(value.revision, 0, 1_000_000)
    || !keys(value, ['version', 'ownerSaveCreatedAt', 'revision', 'receipts']) || !Array.isArray(value.receipts) || value.receipts.length > BIBLE_CULTURAL_LIMITS_V86.maxReceipts) return null;
  const b = BIBLE_CULTURAL_BINDING_V86, operations = new Set<string>();
  for (const r of value.receipts) {
    if (!record(r) || !keys(r, ['sceneId', 'sourceSha256', 'sourceCorpusSha256', 'operationId', 'npcId', 'siteId', 'returnProof', 'option', 'step', 'status', 'presentedLineIds', 'narratedActionIds', 'materialSuccess', 'interruptedCount', 'lastSafePosition', 'lastSafeTick'])
      || r.sceneId !== b.sceneId || r.sourceSha256 !== BIBLE_SOURCE_SHA_V85 || r.sourceCorpusSha256 !== source.sourceCorpusSha256 || r.npcId !== b.npcId || r.siteId !== b.siteId
      || !integer(r.step, 0, 5) || !['active', 'interrupted', 'resolved'].includes(String(r.status)) || r.materialSuccess !== false || !integer(r.interruptedCount, 0, 10_000)
      || !record(r.returnProof) || !keys(r.returnProof, ['regionId', 'runId', 'trailCount', 'observedTicks', 'reported'])
      || r.returnProof.regionId !== b.regionId || typeof r.returnProof.runId !== 'string' || !/^[\w:-]{1,100}$/.test(r.returnProof.runId)
      || r.returnProof.trailCount !== 3 || r.returnProof.reported !== true || !integer(r.returnProof.observedTicks, 90, 3600)
      || r.operationId !== `${b.sceneId}:${r.returnProof.runId}` || operations.has(r.operationId as string)
      || !record(r.lastSafePosition) || !keys(r.lastSafePosition, ['x', 'y']) || ![r.lastSafePosition.x, r.lastSafePosition.y].every(n => typeof n === 'number' && Number.isFinite(n))
      || !integer(r.lastSafeTick, 0, 5_184_000) || !isHomeworldRegionWalkableV68(b.regionId, 'village', r.lastSafePosition as unknown as { x: number; y: number }, r.lastSafeTick)) return null;
    operations.add(r.operationId as string);
    if ((r.step === 0 ? r.option !== null : r.option !== 'B') || (r.step === 5) !== (r.status === 'resolved') || r.status === 'interrupted' && r.interruptedCount < 1
      || !Array.isArray(r.presentedLineIds) || r.presentedLineIds.length > 3 || new Set(r.presentedLineIds).size !== r.presentedLineIds.length
      || r.presentedLineIds.some(id => !permittedLines.includes(id)) || (r.step >= 1) !== r.presentedLineIds.includes(choiceLine)
      || (r.step >= 2) !== r.presentedLineIds.includes(replyLine) || r.presentedLineIds.includes(resumeLine) && r.interruptedCount < 1
      || !Array.isArray(r.narratedActionIds) || JSON.stringify(r.narratedActionIds) !== JSON.stringify(['sit', 'listen', 'tidy'].slice(0, Math.max(0, r.step - 2)))) return null;
  }
  return structuredClone(value) as unknown as BibleSceneLedgerV86;
}
export type BibleSceneActionV86 = { type: 'open' | 'choose-b' | 'reply' | 'sit' | 'listen' | 'tidy' | 'interrupt' | 'resume' };
export interface BibleSceneResultV86 { ok: boolean; changed: boolean; ledger: BibleSceneLedgerV86; message: string }
export function bibleCulturalReceiptV86(ledger: BibleSceneLedgerV86 | null | undefined, context: BibleCulturalContextV86) {
  return ledger?.ownerSaveCreatedAt === context.ownerSaveCreatedAt ? ledger.receipts.find(r => r.operationId === context.operationId) ?? null : null;
}
/** Only this named conversation and narrated gestures change. No inventory,
 * portions, rank, XP, quest proof or material-success flag is ever returned. */
export function applyBibleSceneActionV86(value: unknown, action: BibleSceneActionV86, context: BibleCulturalContextV86): BibleSceneResultV86 {
  const clean = value === undefined ? defaultBibleSceneLedgerV86(context.ownerSaveCreatedAt) : normalizeBibleSceneLedgerV86(value);
  const ledger = clean ?? defaultBibleSceneLedgerV86(context.ownerSaveCreatedAt);
  const unchanged = structuredClone(ledger);
  const fail = (message: string): BibleSceneResultV86 => ({ ok: false, changed: false, ledger: unchanged, message });
  if (!clean) return fail('Reçu incompatible : aucune ancienne donnée remplacée.');
  if (!context.ownerMatches || ledger.ownerSaveCreatedAt !== context.ownerSaveCreatedAt || !iso(context.ownerSaveCreatedAt)) return fail('Le propriétaire de cette halte ne correspond plus à la partie active.');
  const receipt = bibleCulturalReceiptV86(ledger, context);
  if (action.type === 'interrupt') {
    if (!receipt || receipt.status !== 'active') return { ok: true, changed: false, ledger, message: 'La halte reste conservée.' };
    receipt.status = 'interrupted'; receipt.interruptedCount++; ledger.revision++;
    return normalizeBibleSceneLedgerV86(ledger) ? { ok: true, changed: true, ledger, message: 'Halte interrompue ; choix et répliques restent conservés.' } : fail('Limite du reçu atteinte ; aucune écriture.');
  }
  if (!context.eligible || !context.operationId || !context.returnProof) return fail(context.denial ?? 'La halte n’est pas disponible.');
  if (action.type === 'open') {
    if (receipt) return { ok: true, changed: false, ledger, message: receipt.status === 'resolved' ? 'Cette halte narrative est déjà consignée ; aucun gain supplémentaire.' : 'Le reçu existant est conservé ; reprenez votre choix.' };
    if (ledger.receipts.length >= BIBLE_CULTURAL_LIMITS_V86.maxReceipts) return fail('Le registre des haltes est plein ; aucun ancien reçu effacé.');
    ledger.receipts.push({ sceneId: 'D6-W-CULT-25', sourceSha256: BIBLE_SOURCE_SHA_V85, sourceCorpusSha256: source.sourceCorpusSha256,
      operationId: context.operationId, npcId: BIBLE_CULTURAL_BINDING_V86.npcId, siteId: BIBLE_CULTURAL_BINDING_V86.siteId,
      returnProof: context.returnProof, option: null, step: 0, status: 'active', presentedLineIds: [], narratedActionIds: [],
      materialSuccess: false, interruptedCount: 0, lastSafePosition: { ...context.actor }, lastSafeTick: context.tick });
  } else {
    if (!receipt) return fail('Commencez la halte à sa table.');
    if (receipt.status === 'resolved') return { ok: true, changed: false, ledger, message: 'Ce choix est déjà consigné ; aucun effet ne se répète.' };
    if (action.type === 'resume') {
      if (receipt.status !== 'interrupted') return { ok: true, changed: false, ledger, message: 'La halte est déjà active.' };
      receipt.status = 'active'; receipt.presentedLineIds = [...new Set([...receipt.presentedLineIds, resumeLine])];
    } else {
      if (receipt.status !== 'active') return fail('Reprenez volontairement la halte avant de poursuivre.');
      const expected = ['choose-b', 'reply', 'sit', 'listen', 'tidy'][receipt.step];
      if (action.type !== expected) return fail('Ce geste ne correspond pas à la phase conservée.');
      receipt.step++;
      if (action.type === 'choose-b') { receipt.option = 'B'; receipt.presentedLineIds.push(choiceLine); }
      if (action.type === 'reply') receipt.presentedLineIds.push(replyLine);
      if (['sit', 'listen', 'tidy'].includes(action.type)) receipt.narratedActionIds.push(action.type as 'sit' | 'listen' | 'tidy');
      if (action.type === 'tidy') receipt.status = 'resolved';
    }
    receipt.lastSafePosition = { ...context.actor };
    receipt.lastSafeTick = context.tick;
  }
  ledger.revision++;
  if (!normalizeBibleSceneLedgerV86(ledger)) return fail('Le reçu n’est pas cohérent ; aucune écriture.');
  return { ok: true, changed: true, ledger, message: action.type === 'tidy'
    ? 'Halte narrative sans boisson consignée. Aucun objet, XP, soin, trophée ou résultat matériel attribué.'
    : 'Choix et gestes narrés consignés dans cette partie, sans gain de campagne.' };
}
/** Synchronous durable commit, read from fresh refs on each command. Failed,
 * reentrant or stale-owner writes expose only the previously confirmed ledger. */
export function createBibleSceneTransactionV86(read: () => unknown, getContext: () => BibleCulturalContextV86, commit: (next: BibleSceneLedgerV86) => boolean) {
  let busy = false;
  return (action: BibleSceneActionV86): BibleSceneResultV86 => {
    const context = getContext(), previous = normalizeBibleSceneLedgerV86(read()) ?? defaultBibleSceneLedgerV86(context.ownerSaveCreatedAt);
    if (busy) return { ok: false, changed: false, ledger: previous, message: 'Une écriture de halte est déjà en cours.' };
    busy = true;
    try {
      const result = applyBibleSceneActionV86(read(), action, context);
      if (!result.changed) return result;
      const current = getContext();
      if (!current.ownerMatches || current.ownerSaveCreatedAt !== context.ownerSaveCreatedAt || current.operationId !== context.operationId
        || action.type !== 'interrupt' && !current.eligible) return { ok: false, changed: false, ledger: previous, message: 'La scène ou son propriétaire a changé ; aucune écriture.' };
      try { if (commit(result.ledger)) return result; } catch { /* Preserve the confirmed receipt on storage failure. */ }
      return { ok: false, changed: false, ledger: previous, message: 'Sauvegarde non confirmée. Aucun nouveau geste ou dialogue n’est annoncé.' };
    } finally { busy = false; }
  };
}
