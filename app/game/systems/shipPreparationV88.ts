import source from '../data/shipPreparationSourceV88.json';
import { ARMOR_BY_ID, GEAR_BY_ID, MISSION_BY_ID, WEAPON_BY_ID } from '../data';
import { isShipId, shipForId, SHIP_IDS, type ShipId } from '../shipCatalogue';
import type { SaveGame } from '../types';
import { nearestPhysicalShipStation } from './physicalShipMotion';
import { SHIP_PROGRESSION_STORAGE_KEY, validateCanonicalShipProgression, type ShipProgressionState } from './progression';
import { SHIP_LEVEL_STATIONS, type PhysicalShipStationId } from './shipLevelLayout';

export const SHIP_PREPARATION_SOURCE_V88 = source;
export interface ShipPreparationInspectionV88 {
  stationId: PhysicalShipStationId;
  sourceId: string;
  signature: string;
  checkedRevision: number;
}
export interface ShipPreparationHullV88 { shipId: ShipId; inspections: ShipPreparationInspectionV88[] }
/** A record of inspections, not an acquisition, fuel store or R2-M022 reward.
 * Separate hull records prevent a catalogue change from moving objects/checks. */
export interface ShipPreparationStateV88 {
  version: 1;
  ownerSaveCreatedAt: string;
  revision: number;
  hulls: ShipPreparationHullV88[];
}
/** Emitted only by the nearby inspection button using the deck's playerRef.
 * Shortcut/menu navigation does not call this observer. */
export interface ShipPreparationObservationV88 { stationId: PhysicalShipStationId; x: number; y: number }
export interface ShipPreparationContextV88 {
  save: SaveGame;
  shipId: ShipId;
  selectedMissionId: string | null;
  fleet: ShipProgressionState | null;
  active: boolean;
  focused: boolean;
  suspended: boolean;
}
export interface ShipPreparationFactV88 {
  stationId: PhysicalShipStationId;
  sourceId: string;
  label: string;
  gesture: string;
  details: string[];
  missing: string[];
  signature: string;
}
export interface ShipPreparationEvaluationV88 {
  writable: boolean;
  state: ShipPreparationStateV88 | null;
  inspected: number;
  ready: boolean;
  facts: ShipPreparationFactV88[];
  completedStationIds: PhysicalShipStationId[];
  message: string;
}
export interface ShipPreparationResultV88 {
  accepted: boolean;
  changed: boolean;
  state: ShipPreparationStateV88 | null;
  message: string;
}
const record = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const identity = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 160 && !/[\x00-\x1f]/.test(v);
/** Bounded consistency fingerprint, not an authentication/acquisition proof. */
function fingerprint(value: unknown): string {
  let result = BigInt('14695981039346656037');
  for (const character of JSON.stringify(value)) {
    result ^= BigInt(character.codePointAt(0)!);
    result = BigInt.asUintN(64, result * BigInt('1099511628211'));
  }
  return `v88:${result.toString(16).padStart(16, '0')}`;
}
const stations = SHIP_LEVEL_STATIONS.map(station => station.id);
const sourceIds: Record<PhysicalShipStationId, string> = {
  'galaxy-map': 'PSR-01-BASE', 'wall-armory': 'PSR-02-BASE', 'clan-archives': 'PSR-03-BASE',
  'appearance-forge': 'PSR-04-BASE', 'trophy-hall': 'PSR-05-BASE', 'medical-bay': 'PSR-06-BASE',
  'training-arena': 'PSR-07-BASE', 'launch-airlock': 'PSR-08-BASE',
};
/** Read only the existing raw sidecar. Unlike loadShipProgression this helper
 * never initializes defaults, adopts a foreign owner or writes storage. */
export function readShipPreparationFleetV88(save: SaveGame, storage: Pick<Storage, 'getItem'> | null): ShipProgressionState | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(SHIP_PROGRESSION_STORAGE_KEY);
    if (!raw || raw.length > 1000000) return null;
    const fleet = validateCanonicalShipProgression(JSON.parse(raw), save);
    if (!fleet || fleet.ownerSaveCreatedAt !== save.createdAt || !fleet.unlockedShipIds.includes(fleet.selectedShipId)) return null;
    return fleet;
  } catch { return null; }
}
/** Malformed/future/foreign data is refused, never reset to an empty record.
 * The save importer must retain/reject the original blob rather than write null. */
export function normalizeShipPreparationV88(raw: unknown, owner?: string): ShipPreparationStateV88 | null {
  if (!record(raw) || raw.version !== 1 || !identity(raw.ownerSaveCreatedAt) ||
    (owner !== undefined && raw.ownerSaveCreatedAt !== owner) || !Number.isSafeInteger(raw.revision) ||
    Number(raw.revision) < 0 || Number(raw.revision) > 100000 || !Array.isArray(raw.hulls) || raw.hulls.length > SHIP_IDS.length) return null;
  const hulls: ShipPreparationHullV88[] = [];
  for (const hull of raw.hulls) {
    if (!record(hull) || !isShipId(hull.shipId) || !shipForId(hull.shipId).selectable ||
      hulls.some(item => item.shipId === hull.shipId) || !Array.isArray(hull.inspections) || hull.inspections.length > 8) return null;
    const inspections: ShipPreparationInspectionV88[] = [];
    for (const item of hull.inspections) {
      if (!record(item) || !stations.includes(item.stationId as PhysicalShipStationId) ||
        inspections.some(entry => entry.stationId === item.stationId) || item.sourceId !== sourceIds[item.stationId as PhysicalShipStationId] ||
        typeof item.signature !== 'string' || !/^v88:[a-f0-9]{16}$/.test(item.signature) ||
        !Number.isSafeInteger(item.checkedRevision) || Number(item.checkedRevision) < 1 || Number(item.checkedRevision) > Number(raw.revision)) return null;
      inspections.push({ stationId: item.stationId as PhysicalShipStationId, sourceId: String(item.sourceId),
        signature: item.signature, checkedRevision: Number(item.checkedRevision) });
    }
    if (!inspections.length) return null;
    hulls.push({ shipId: hull.shipId, inspections });
  }
  const receipts = hulls.flatMap(hull => hull.inspections);
  if ((receipts.length === 0) !== (raw.revision === 0) || receipts.length > Number(raw.revision) ||
    new Set(receipts.map(item => item.checkedRevision)).size !== receipts.length ||
    (receipts.length && Math.max(...receipts.map(item => item.checkedRevision)) !== raw.revision)) return null;
  return { version: 1, ownerSaveCreatedAt: raw.ownerSaveCreatedAt, revision: Number(raw.revision), hulls };
}

/** Observe the saved kit and actual station records. No quantity, treatment,
 * trophy, training score, capacity, crew member or route approval is granted. */
export function shipPreparationFactsV88(context: ShipPreparationContextV88): ShipPreparationFactV88[] {
  const { save, selectedMissionId } = context;
  const fleet = context.fleet ? validateCanonicalShipProgression(context.fleet, save) : null;
  const mission = selectedMissionId && Object.hasOwn(MISSION_BY_ID, selectedMissionId) ? MISSION_BY_ID[selectedMissionId as keyof typeof MISSION_BY_ID] : null;
  const missionReady = !!mission && ['available', 'completed'].includes(save.missionProgress[mission.id]?.status);
  const kitReady = !!ARMOR_BY_ID[save.loadout.armorId] && save.inventory.unlockedArmorIds.includes(save.loadout.armorId) &&
    save.loadout.weaponIds.every(id => !!WEAPON_BY_ID[id] && save.inventory.unlockedWeaponIds.includes(id)) &&
    save.loadout.gearIds.every(id => !!GEAR_BY_ID[id] && save.inventory.unlockedGearIds.includes(id));
  const kit = [save.loadout.armorId, ...save.loadout.weaponIds, ...save.loadout.gearIds];
  const display = fleet?.displaySlots.map(slot => ({ id: slot.id, claimId: slot.claimId })) ?? [];
  const displayReady = !!fleet && display.every(slot => !slot.claimId || save.trophies.some(trophy => trophy.id === slot.claimId));
  const training = fleet ? Object.entries(fleet.training).map(([id, result]) => [id, result.attempts, result.lastScore]) : [];
  const facts = SHIP_LEVEL_STATIONS.map(station => {
    const missing: string[] = [];
    let gesture = '', details: string[] = [], values: unknown = null;
    switch (station.id) {
      case 'galaxy-map':
        gesture = 'Inspecter les repères de navigation';
        details = [mission ? `Chasse choisie : ${mission.title} · ${mission.planetName}` : 'Aucune destination choisie.'];
        if (!missionReady) missing.push('Choisir une chasse réellement accessible à la carte galactique.');
        values = [selectedMissionId, missionReady]; break;
      case 'wall-armory':
        gesture = 'Inspecter le kit sur les supports';
        details = [ARMOR_BY_ID[save.loadout.armorId]?.name ?? 'Armure inconnue', ...save.loadout.weaponIds.map(id => WEAPON_BY_ID[id]?.name ?? 'Arme inconnue'),
          ...save.loadout.gearIds.map(id => GEAR_BY_ID[id]?.name ?? 'Outil inconnu')];
        if (!kitReady) missing.push('Équiper uniquement des armes, outils et une armure déjà débloqués.');
        values = [kit, kitReady]; break;
      case 'clan-archives':
        gesture = 'Inspecter le dossier du chasseur';
        details = [`${save.profile.hunterName} · ${save.profile.rankId}`, `${save.statistics.missionsCompleted} chasse(s) terminée(s).`];
        values = [save.profile.hunterName, save.profile.rankId, save.statistics.missionsCompleted]; break;
      case 'appearance-forge':
        gesture = 'Inspecter masque et parures au repère';
        details = [`Biomask : ${save.appearance.biomaskId ?? 'visage découvert'}`, `Armure : ${save.appearance.armorStyleId} · ${save.appearance.armorTintId}`];
        values = save.appearance; break;
      case 'trophy-hall':
        gesture = 'Inspecter les originaux et leurs supports';
        details = [`${display.filter(slot => slot.claimId).length} original(aux) exposé(s).`, 'Un support vide reste vide : aucun trophée ajouté.'];
        if (!displayReady) missing.push('Relire les emplacements de cette partie et leurs trophées originaux.');
        values = [display, save.trophies.map(trophy => trophy.id).sort(), displayReady]; break;
      case 'medical-bay':
        gesture = 'Inspecter le poste de soin';
        details = [fleet?.medbay.status === 'treating' ? 'Un traitement est en cours.' : fleet ? 'Poste disponible. Aucun soin automatique.' : 'État du poste non établi.'];
        if (!fleet) missing.push('Relire le registre des installations de cette partie.');
        else if (fleet.medbay.status !== 'ready') missing.push('Terminer le traitement en cours avant de libérer le poste.');
        values = fleet?.medbay ?? null; break;
      case 'training-arena':
        gesture = 'Inspecter les repères et le registre d’entraînement';
        details = [`${training.reduce((sum, item) => sum + Number(item[1]), 0)} exercice(s) consigné(s).`, 'Cette inspection ne réussit aucune épreuve et ne donne aucun score.'];
        if (!fleet) missing.push('Relire le registre d’entraînement de cette partie.');
        values = training; break;
      case 'launch-airlock':
        gesture = 'Inspecter le kit et la destination au sas';
        details = ['Les sept autres postes doivent être contrôlés.', 'La descente en chasse conserve son briefing et ses conditions actuelles.'];
        if (!missionReady) missing.push('Choisir une chasse accessible avant le contrôle du sas.');
        if (!kitReady) missing.push('Le kit courant doit être disponible.');
        values = [selectedMissionId, missionReady, kit, kitReady]; break;
    }
    return { stationId: station.id, sourceId: sourceIds[station.id], label: station.label, gesture, details, missing,
      signature: fingerprint([context.shipId, station.id, values]) };
  });
  const airlock = facts.find(fact => fact.stationId === 'launch-airlock')!;
  airlock.signature = fingerprint([airlock.signature, facts.filter(fact => fact !== airlock).map(fact => fact.signature)]);
  return facts;
}

export function evaluateShipPreparationV88(raw: unknown, context: ShipPreparationContextV88): ShipPreparationEvaluationV88 {
  const absent = raw === undefined || raw === null;
  const state = absent ? null : normalizeShipPreparationV88(raw, context.save.createdAt);
  const facts = shipPreparationFactsV88(context);
  const ownFleet = context.fleet?.ownerSaveCreatedAt === context.save.createdAt && context.fleet.selectedShipId === context.shipId &&
    context.fleet.unlockedShipIds.includes(context.shipId) && !!validateCanonicalShipProgression(context.fleet, context.save);
  const writable = (absent || !!state) && !!ownFleet;
  const hull = state?.hulls.find(entry => entry.shipId === context.shipId);
  const completedStationIds = facts.filter(fact => !fact.missing.length && hull?.inspections.some(receipt =>
    receipt.stationId === fact.stationId && receipt.signature === fact.signature)).map(fact => fact.stationId);
  // An old airlock inspection cannot survive a change in any of the seven posts.
  if (completedStationIds.length < 8) {
    const airlock = completedStationIds.indexOf('launch-airlock');
    if (airlock !== -1) completedStationIds.splice(airlock, 1);
  }
  const ready = writable && completedStationIds.length === 8;
  return { writable, state, inspected: completedStationIds.length, ready, facts, completedStationIds,
    message: !absent && !state ? 'Registre de préparation invalide, futur ou lié à une autre partie : données conservées.' : !ownFleet ?
      'La coque courante doit figurer dans le registre valide de cette partie.' : ready ?
        'Huit postes inspectés pour ce kit et cette destination. Aucun droit de propriété ni voyage ajouté.' :
        `${completedStationIds.length}/8 postes inspectés. Rejoignez chaque salle par les coursives.` };
}

/** Pure reducer: the root must persist the returned checkpoint before rendering
 * it as confirmed. A storage failure must keep both the old save and old UI. */
export function inspectShipPreparationV88(raw: unknown, observation: ShipPreparationObservationV88,
  context: ShipPreparationContextV88): ShipPreparationResultV88 {
  const evaluation = evaluateShipPreparationV88(raw, context);
  const refuse = (message: string): ShipPreparationResultV88 => ({ accepted: false, changed: false, state: evaluation.state, message });
  if (!evaluation.writable) return refuse(evaluation.message);
  if (!context.active || !context.focused || context.suspended) return refuse('Reprenez le pont actif avant cette inspection.');
  if (!Number.isFinite(observation.x) || !Number.isFinite(observation.y) ||
    nearestPhysicalShipStation(observation)?.id !== observation.stationId) return refuse('Rejoignez ce poste à pied : une interface distante ne constitue pas une inspection.');
  const fact = evaluation.facts.find(item => item.stationId === observation.stationId);
  if (!fact) return refuse('Poste inconnu.');
  if (fact.missing.length) return refuse(fact.missing.join(' '));
  if (fact.signature.length > 4096) return refuse('Le relevé de ce poste dépasse les bornes du registre ; aucune donnée remplacée.');
  if (observation.stationId === 'launch-airlock' && evaluation.completedStationIds.filter(id => id !== 'launch-airlock').length !== 7)
    return refuse('Inspectez les sept autres postes avec le kit et la destination actuels avant le sas.');
  if (evaluation.completedStationIds.includes(observation.stationId)) return { accepted: true, changed: false,
    state: evaluation.state, message: `${fact.label} : contrôle déjà consigné, sans deuxième écriture.` };
  const state = evaluation.state ? structuredClone(evaluation.state) : { version: 1 as const,
    ownerSaveCreatedAt: context.save.createdAt, revision: 0, hulls: [] };
  if (state.revision >= 100000) return refuse('La limite du registre de préparation est atteinte.');
  state.revision++;
  let hull = state.hulls.find(item => item.shipId === context.shipId);
  if (!hull) { hull = { shipId: context.shipId, inspections: [] }; state.hulls.push(hull); }
  hull.inspections = hull.inspections.filter(item => item.stationId !== observation.stationId);
  hull.inspections.push({ stationId: observation.stationId, sourceId: fact.sourceId,
    signature: fact.signature, checkedRevision: state.revision });
  if (!normalizeShipPreparationV88(state, context.save.createdAt)) return refuse('Relevé incohérent ; le dernier point confirmé est conservé.');
  return { accepted: true, changed: true, state, message: `${fact.label} inspectée. Ce relevé ne donne ni objet, ni soin, ni droit de propriété.` };
}
