import { commitShipDepartureV85, shipReturnRoomsV85, type ShipCommittedDepartureV85, type ShipDepartureContextV85,
  type ShipManifestV85, type ShipReturnReceiptV85 } from './shipOperationsV85';
import { createShipFlightV87, normalizeShipFlightV87, stepShipFlightV87, type ShipFlightActionV87, type ShipFlightRouteV87, type ShipFlightStateV87 } from './shipFlightV87';
import { isShipId } from '../shipCatalogue';

/** This controller deliberately has no default hull, fuel, crew or rewards.
 * An authored acquisition/legacy receipt and a real resource store must supply
 * them. Catalogue visibility and simulator examples cannot initialize it. */
export interface ShipCampaignReceiptV87 {
  id: string; departure: ShipCommittedDepartureV85; phase: 'reserved' | 'travelling' | 'returned' | 'cancelled';
  flight: ShipFlightStateV87; reservedFuel: number; fuelReturned: number; returnReceipt: ShipReturnReceiptV85 | null;
  route: ShipFlightRouteV87;
}
export interface ShipCampaignLedgerV87 { version: 1; ownerSaveCreatedAt: string; revision: number; operations: ShipCampaignReceiptV87[] }
export interface ShipCampaignContextV87 {
  ownerSaveCreatedAt: string; active: boolean; focused: boolean; suspended: boolean;
  manifest: ShipManifestV85; departureContext: ShipDepartureContextV85; route: ShipFlightRouteV87;
  /** The external controller derives this proof from the actual acquired hull.
   * Legacy policy preserves old earned hulls, but does not create V6 R2-M021. */
  hullProof: { ownerSaveCreatedAt: string; shipId: string; kind: 'acquisition-receipt' | 'preserved-legacy-unlock'; sourceId: string } | null;
  /** Same-run physical arrival, never supplied by an action/checkbox payload. */
  physicalPost: { operationId: string; stationId: 'galaxy-map'; reachedByWalking: true } | null;
  boardedPersonIds: readonly string[]; consentingPersonIds: readonly string[]; securedCargoIds: readonly string[]; availableFuel: number;
  /** Factual dispositions supplied by the returning authored mission. */
  observedReturn: ShipReturnReceiptV85 | null;
}
export type ShipCampaignActionV87 = { type: 'reserve' } | { type: 'flight'; action: ShipFlightActionV87 } |
  { type: 'cancel-before-movement' } | { type: 'consign-return' };
export interface ShipCampaignMutationV87 {
  ledger: ShipCampaignLedgerV87; expectedRevision: number; operationId: string;
  /** Positive debit reserves existing fuel. Negative credit releases ONLY an
   * untouched reservation, never fabricates additional stock on a played return. */
  fuelDelta: number;
}
export interface ShipCampaignResultV87 { ok: boolean; changed: boolean; ledger: ShipCampaignLedgerV87 | null; message: string }
const record = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const id = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 160 && !/[\x00-\x1f]/.test(v);
const integer = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
function departure(value: unknown, owner: string): ShipCommittedDepartureV85 | null {
  if (!record(value) || !record(value.manifest)) return null;
  const m = value.manifest;
  if (!id(m.id) || m.ownerSaveCreatedAt !== owner || !isShipId(m.shipId) || m.kind !== 'spatial' ||
    !id(m.originId) || !id(m.destinationId) || m.originId === m.destinationId || !id(m.originBranchId) || m.destinationBranchId !== m.originBranchId ||
    !Array.isArray(m.travellers) || m.travellers.length < 1 || m.travellers.length > 32 || !Array.isArray(m.cargo) || m.cargo.length > 128 ||
    !integer(m.outwardFuel) || !integer(m.returnFuelReserve) || m.returnFuelReserve === 0 ||
    !Number.isSafeInteger(m.outwardFuel + m.returnFuelReserve) || value.returnFuelReserve !== m.returnFuelReserve || value.returnAnchorId !== null) return null;
  if (m.travellers.some(p => !record(p) || !id(p.id) || !id(p.name) || !['hunter', 'crew', 'escort', 'medic', 'guest'].includes(String(p.role)) || !['fit', 'wounded'].includes(String(p.condition)) || p.branchId !== m.originBranchId) ||
    new Set(m.travellers.map(p => (p as Record<string, unknown>).id)).size !== m.travellers.length ||
    m.cargo.some(c => !record(c) || !id(c.id) || !id(c.name) || !id(c.ownerId) || !integer(c.units) || c.units === 0 || !['personal-kit', 'delivery', 'loan', 'return'].includes(String(c.purpose)) || c.branchId !== m.originBranchId) ||
    new Set(m.cargo.map(c => (c as Record<string, unknown>).id)).size !== m.cargo.length) return null;
  return structuredClone(value) as unknown as ShipCommittedDepartureV85;
}
/** Absent ledgers are opt-in; present malformed/future/foreign ones return null.
 * A caller must preserve their raw save and refuse writes rather than normalize
 * them to an empty registry. */
export function normalizeShipCampaignLedgerV87(value: unknown, owner?: string): ShipCampaignLedgerV87 | null {
  if (!record(value) || value.version !== 1 || !id(value.ownerSaveCreatedAt) || (owner !== undefined && owner !== value.ownerSaveCreatedAt) ||
    !integer(value.revision) || value.revision > 100000 || !Array.isArray(value.operations) || value.operations.length > 16) return null;
  const operations: ShipCampaignReceiptV87[] = [];
  for (const entry of value.operations) {
    if (!record(entry) || !id(entry.id) || operations.some(o => o.id === entry.id) || !['reserved', 'travelling', 'returned', 'cancelled'].includes(String(entry.phase))) return null;
    const d = departure(entry.departure, value.ownerSaveCreatedAt), f = normalizeShipFlightV87(entry.flight, value.ownerSaveCreatedAt);
    if (!d || !f || f.operationId !== entry.id || d.manifest.id !== entry.id || !integer(entry.reservedFuel) ||
      entry.reservedFuel !== d.manifest.outwardFuel + d.manifest.returnFuelReserve || !integer(entry.fuelReturned)) return null;
    if (!record(entry.route) || entry.route.originId !== d.manifest.originId || entry.route.destinationId !== d.manifest.destinationId ||
      !id(entry.route.relayId) || new Set(Object.values(entry.route)).size !== 3) return null;
    if (f.sourceReceipts.includes('FLIGHT5-11:return') && f.route.join('|') !== [entry.route.destinationId, entry.route.relayId, entry.route.originId].join('|')) return null;
    if (entry.phase === 'returned') {
      if (f.phase !== 'returned' || entry.fuelReturned !== 0 || !record(entry.returnReceipt) || !shipReturnRoomsV85(d, entry.returnReceipt as unknown as ShipReturnReceiptV85)) return null;
    } else if (entry.returnReceipt !== null || (entry.phase === 'cancelled' ? f.revision !== 0 || entry.fuelReturned !== entry.reservedFuel : entry.fuelReturned !== 0)) return null;
    if (entry.phase === 'reserved' && f.revision !== 0 || entry.phase === 'travelling' && f.revision === 0) return null;
    operations.push({ id: entry.id, departure: d, phase: entry.phase as ShipCampaignReceiptV87['phase'], flight: f,
      reservedFuel: entry.reservedFuel, fuelReturned: entry.fuelReturned, returnReceipt: entry.returnReceipt === null ? null : structuredClone(entry.returnReceipt) as unknown as ShipReturnReceiptV85,
      route: { originId: String(entry.route.originId), relayId: entry.route.relayId, destinationId: String(entry.route.destinationId) } });
  }
  if (operations.filter(o => o.phase === 'reserved' || o.phase === 'travelling').length > 1) return null;
  const expectedRevision = operations.reduce((total, o) => total + o.flight.revision + 1 + (o.phase === 'returned' || o.phase === 'cancelled' ? 1 : 0), 0);
  if (value.revision !== expectedRevision) return null;
  return { version: 1, ownerSaveCreatedAt: value.ownerSaveCreatedAt, revision: value.revision, operations };
}

/** Synchronous read/check/atomic-commit contract. commit must persist the ledger
 * AND fuelDelta together under the expected revision. A failed write advances
 * neither the movement nor the reservation. No onPrepared notification is used
 * as a successful durable departure. */
export function createShipCampaignTransactionV87(options: {
  read: () => ShipCampaignLedgerV87 | null | undefined; context: () => ShipCampaignContextV87;
  commit: (mutation: ShipCampaignMutationV87) => { persisted: boolean; message?: string };
}): (action: ShipCampaignActionV87) => ShipCampaignResultV87 {
  let busy = false;
  return action => {
    if (busy) return { ok: false, changed: false, ledger: null, message: 'Une écriture de ce départ est déjà en cours.' };
    busy = true;
    try {
      const context = options.context(), raw = options.read(), owner = context.ownerSaveCreatedAt;
      let ledger = raw === undefined ? { version: 1 as const, ownerSaveCreatedAt: owner, revision: 0, operations: [] } : normalizeShipCampaignLedgerV87(raw, owner);
      const confirmedLedger = ledger;
      const refused = (message: string): ShipCampaignResultV87 => ({ ok: false, changed: false, ledger: confirmedLedger, message });
      if (!ledger || !id(owner)) return refused('Registre spatial invalide, futur ou lié à une autre partie. Ses données sont conservées.');
      if (!context.active || !context.focused || context.suspended) return refused('Reprenez ce poste dans la scène active avant la manœuvre.');
      if (context.manifest.ownerSaveCreatedAt !== owner || context.departureContext.ownerSaveCreatedAt !== owner) return refused('Le manifeste appartient à une autre partie.');
      const operationId = context.manifest.id, existing = ledger.operations.find(o => o.id === operationId);
      if (existing && existing.departure.manifest.shipId !== context.manifest.shipId) return refused('Cette réservation appartient à une autre coque.');
      if (ledger.revision >= 100000) return refused('La limite du registre spatial est atteinte.');
      let fuelDelta = 0, message = '';
      ledger = structuredClone(ledger);
      const operation = ledger.operations.find(o => o.id === operationId);
      if (action.type === 'reserve') {
        if (existing) return { ok: true, changed: false, ledger, message: 'Ce manifeste a déjà une réservation ; aucun second débit.' };
        if (ledger.operations.length >= 16 || ledger.operations.some(o => o.phase === 'reserved' || o.phase === 'travelling')) return refused('Terminez la réservation active avant un nouveau départ.');
        const proof = context.hullProof;
        if (!proof || proof.ownerSaveCreatedAt !== owner || proof.shipId !== context.manifest.shipId || !id(proof.sourceId) || !['acquisition-receipt', 'preserved-legacy-unlock'].includes(proof.kind)) return refused('Une coque acquise ou un droit de transport réel doit être identifié ; le catalogue ne suffit pas.');
        if (context.manifest.kind !== 'spatial') return refused('Cette première opération n’autorise pas le Warp.');
        if (!context.physicalPost?.reachedByWalking || context.physicalPost.operationId !== operationId || context.physicalPost.stationId !== 'galaxy-map') return refused('Rejoignez physiquement le poste de navigation de cette opération.');
        if (context.manifest.travellers.some(p => !context.boardedPersonIds.includes(p.id) || !context.consentingPersonIds.includes(p.id)) || context.manifest.cargo.some(c => !context.securedCargoIds.includes(c.id))) return refused('Les personnes consentantes présentes au sas et les objets arrimés doivent être constatés dans ce trajet.');
        if (context.route.originId !== context.manifest.originId || context.route.destinationId !== context.manifest.destinationId ||
          !id(context.route.relayId) || new Set(Object.values(context.route)).size !== 3) return refused('Le relais et les deux quais doivent appartenir à la même route identifiée.');
        if (context.availableFuel !== context.departureContext.availableFuel) return refused('Le stock carburant a changé ; relisez le manifeste.');
        const d = commitShipDepartureV85(context.manifest, context.departureContext);
        if (!d) return refused('Départ refusé : rang, coque, personnes, capacité, route ou réserve de retour manquants.');
        fuelDelta = d.manifest.outwardFuel + d.manifest.returnFuelReserve;
        ledger.operations.push({ id: operationId, departure: d, phase: 'reserved', flight: createShipFlightV87(owner, operationId),
          reservedFuel: fuelDelta, fuelReturned: 0, returnReceipt: null, route: { ...context.route } });
        message = 'Manifeste réservé avec son aller et son retour ; l’approche reste à jouer.';
      } else if (!operation) return refused('Aucune réservation pour ce trajet.');
      else if (action.type === 'cancel-before-movement') {
        if (operation.phase === 'cancelled') return { ok: true, changed: false, ledger, message: 'Réservation déjà libérée ; aucun second crédit.' };
        if (operation.phase !== 'reserved' || operation.flight.revision !== 0) return refused('Le mouvement a commencé : effectuez le retour avec sa réserve engagée.');
        operation.phase = 'cancelled'; operation.fuelReturned = operation.reservedFuel; fuelDelta = -operation.reservedFuel;
        message = 'Réservation intacte libérée ; aucune charge ni personne recréée.';
      } else if (action.type === 'flight') {
        if (!['reserved', 'travelling'].includes(operation.phase)) return refused('Ce trajet est déjà clos.');
        if (!context.physicalPost?.reachedByWalking || context.physicalPost.operationId !== operationId || context.physicalPost.stationId !== 'galaxy-map') return refused('Rejoignez le poste physique de navigation de ce trajet pour continuer.');
        if (action.action.type === 'return-route' && (!context.observedReturn || !shipReturnRoomsV85(operation.departure, context.observedReturn))) return refused('La route de retour demande l’expédition réellement terminée et ses dispositions observées.');
        const result = stepShipFlightV87(operation.flight, action.action, operation.route);
        if (!result.accepted) return refused(result.message);
        if (!result.changed) return { ok: true, changed: false, ledger, message: result.message };
        operation.flight = result.state; operation.phase = 'travelling'; message = result.message;
      } else if (action.type === 'consign-return') {
        if (operation.phase === 'returned') return { ok: true, changed: false, ledger, message: 'Retour déjà consigné ; aucune récompense ni carburant supplémentaires.' };
        if (operation.flight.phase !== 'returned') return refused('Arrimez réellement la coque au quai d’origine avant le rapport.');
        if (!context.physicalPost?.reachedByWalking || context.physicalPost.operationId !== operationId || context.physicalPost.stationId !== 'galaxy-map') return refused('Consignez ce retour au poste physique de navigation du navire.');
        if (!context.observedReturn || !shipReturnRoomsV85(operation.departure, context.observedReturn)) return refused('Un rapport réel doit identifier chaque personne et objet de ce départ.');
        operation.phase = 'returned'; operation.returnReceipt = structuredClone(context.observedReturn);
        message = 'Retour consigné avec blessures, absences, prêts et livraisons conservés. Aucun soin automatique.';
      } else return refused('Action spatiale inconnue.');
      const expectedRevision = ledger.revision; ledger.revision++;
      if (!normalizeShipCampaignLedgerV87(ledger, owner)) return refused('La transition ne produit pas un registre spatial valide.');
      const saved = options.commit({ ledger, expectedRevision, operationId, fuelDelta });
      if (!saved.persisted) return { ok: false, changed: false, ledger: raw ? normalizeShipCampaignLedgerV87(raw, owner) : null, message: saved.message || 'Écriture refusée : mouvement et carburant restent inchangés.' };
      return { ok: true, changed: true, ledger, message };
    } catch { return { ok: false, changed: false, ledger: null, message: 'Lecture ou écriture impossible ; aucun départ confirmé.' }; }
    finally { busy = false; }
  };
}
