import { evaluateChronicleAccess, type ClanChronicle } from "./clanChronicle";
import type { ShipId } from "../shipCatalogue";
import type { PhysicalShipStationId } from "./shipLevelLayout";

/** Original campaign rules transcribed from the supplied V3 workbook.
 * A catalogue selection never creates another hull, crew member or cargo item.
 * Capacities are provided by the acquired ship/contract, rather than inferred
 * from franchise artwork or a rank. The mission controller owns all mutations.
 */
export const SHIP_OPERATIONS_SOURCE_V85 = {
  workbook: "Yautja_V3_Guerres_de_Clans_Trois_Modes.xlsx",
  sha256: "3ef3712c9ffa865f918133bee7667155c1bb320f060b4a19cc58ff650ffd0dfa",
  spatialRange: "'Espace et guerre'!A6:I25",
  warpRange: "'Warp et guerre'!A6:H15",
  continuity: "original-project-campaign",
} as const;

export const SHIP_SPATIAL_STOPS_V85 = [
  { id: "SPACE-BASE-01", name: "Couronne des Départs", role: "Embarquement et manutention", sourceId: "SPACE-W01" },
  { id: "SPACE-BASE-02", name: "Halte des Trois Routes", role: "Convois et contrats", sourceId: "SPACE-W02" },
  { id: "SPACE-BASE-03", name: "Chantier des Coques Ouvertes", role: "Réparations lourdes", sourceId: "SPACE-W03" },
  { id: "SPACE-BASE-04", name: "Avant-poste de la Ceinture", role: "Renseignement et secours", sourceId: "SPACE-W04" },
  { id: "SPACE-BASE-05", name: "Maison Errante", role: "Accueil neutre et soins", sourceId: "SPACE-W05" },
  { id: "SPACE-BASE-06", name: "Relais des Mandats", role: "Prêts et arbitrages", sourceId: "SPACE-W06" },
  { id: "SPACE-BASE-07", name: "Annexe des Quarantaines", role: "Inspection et isolement", sourceId: "SPACE-W07" },
  { id: "SPACE-BASE-08", name: "Observatoire des Seuils", role: "Fenêtres Warp et retour", sourceId: "SPACE-W08" },
  { id: "SPACE-BASE-09", name: "Épave de la Dernière Veille", role: "Récupération et restitution", sourceId: "SPACE-W09" },
  { id: "SPACE-BASE-10", name: "Ancrage du joueur", role: "Modules acquis et personnel volontaire", sourceId: "SPACE-W10" },
] as const;

export interface ShipCapacityV85 {
  /** Passenger places include crew and the player. Null means not established. */
  persons: number | null;
  medicalPlaces: number | null;
  cargoUnits: number | null;
}
export interface ShipTravellerV85 {
  id: string;
  name: string;
  role: "hunter" | "crew" | "escort" | "medic" | "guest";
  condition: "fit" | "wounded";
  branchId: string;
}
export interface ShipCargoV85 {
  id: string;
  name: string;
  units: number;
  ownerId: string;
  purpose: "personal-kit" | "delivery" | "loan" | "return";
  branchId: string;
}
export interface ShipManifestV85 {
  id: string;
  ownerSaveCreatedAt: string;
  shipId: ShipId;
  kind: "spatial" | "warp";
  originId: string;
  destinationId: string;
  originBranchId: string;
  destinationBranchId: string;
  travellers: readonly ShipTravellerV85[];
  cargo: readonly ShipCargoV85[];
  outwardFuel: number;
  returnFuelReserve: number;
}
export interface ShipDepartureContextV85 {
  ownerSaveCreatedAt: string;
  chronicle: ClanChronicle;
  /** Acquisition or a limited transport contract supplies this identity. */
  availableShipId: ShipId | null;
  capacity: ShipCapacityV85;
  availablePersonIds: readonly string[];
  availableCargoIds: readonly string[];
  availableFuel: number;
  routeConfirmed: boolean;
  destinationApproved: boolean;
  warpModuleInstalled: boolean;
  /** Allocated before departure; a later lost module cannot remove this anchor. */
  returnAnchorId: string | null;
}
export interface ShipDepartureEvaluationV85 {
  allowed: boolean;
  missing: readonly string[];
  people: number;
  wounded: number;
  cargoUnits: number;
}
const nonNegativeInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
const identity = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= 160 && !/[\x00-\x1f]/.test(value);

/** Each refusal identifies a missing action; no departure consumes resources here. */
export function evaluateShipDepartureV85(manifest: ShipManifestV85, context: ShipDepartureContextV85): ShipDepartureEvaluationV85 {
  const missing: string[] = [];
  const people = manifest.travellers.length;
  const wounded = manifest.travellers.filter(person => person.condition === "wounded").length;
  const cargoUnits = manifest.cargo.reduce((total, item) => total + (nonNegativeInteger(item.units) ? item.units : 0), 0);
  if (manifest.ownerSaveCreatedAt !== context.ownerSaveCreatedAt) missing.push("Ce manifeste appartient à une autre campagne.");
  if (!identity(manifest.id)) missing.push("Identifiant de départ absent.");
  if (context.availableShipId !== manifest.shipId) missing.push("Acquérir ce vaisseau ou confirmer son contrat de transport.");
  const access = evaluateChronicleAccess(context.chronicle, manifest.kind === "warp" ? "warp-universe" : "autonomous-hunt", {
    personalShipAvailable: context.availableShipId === manifest.shipId,
    warpModuleInstalled: context.warpModuleInstalled,
  });
  missing.push(...access.missing.map(requirement => requirement.label));
  if (!identity(manifest.originId) || !identity(manifest.destinationId) || manifest.originId === manifest.destinationId || !context.routeConfirmed) missing.push("Confirmer une route et un point d’arrivée distincts.");
  if (!context.destinationApproved) missing.push("Obtenir l’accord ou le mandat du lieu d’arrivée.");
  if (!identity(manifest.originBranchId) || !identity(manifest.destinationBranchId)) missing.push("Identifier la continuité d’origine et celle de destination.");
  if (manifest.kind === "spatial" && manifest.originBranchId !== manifest.destinationBranchId) missing.push("Un voyage spatial ordinaire conserve sa branche.");
  if (!people) missing.push("Inscrire au moins un voyageur.");
  const seenPeople = new Set<string>();
  for (const person of manifest.travellers) {
    if (!identity(person.id) || seenPeople.has(person.id)) missing.push("Chaque voyageur doit avoir une identité unique.");
    seenPeople.add(person.id);
    if (!context.availablePersonIds.includes(person.id)) missing.push(`${person.name || "Voyageur"} n’est pas disponible pour ce départ.`);
    if (person.branchId !== manifest.originBranchId) missing.push(`${person.name || "Voyageur"} appartient à une autre branche.`);
  }
  const seenCargo = new Set<string>();
  for (const item of manifest.cargo) {
    if (!identity(item.id) || seenCargo.has(item.id)) missing.push("Chaque objet doit avoir une identité unique.");
    seenCargo.add(item.id);
    if (!identity(item.ownerId) || !nonNegativeInteger(item.units) || item.units === 0) missing.push(`${item.name || "Objet"} demande un propriétaire et un encombrement établis.`);
    if (!context.availableCargoIds.includes(item.id)) missing.push(`${item.name || "Objet"} n’est pas disponible au chargement.`);
    if (item.branchId !== manifest.originBranchId) missing.push(`${item.name || "Objet"} appartient à une autre branche.`);
  }
  for (const [limit, value, label] of [
    [context.capacity.persons, people, "places de voyage"],
    [context.capacity.medicalPlaces, wounded, "places de soins"],
    [context.capacity.cargoUnits, cargoUnits, "unités de chargement"],
  ] as const) {
    if (!nonNegativeInteger(limit)) missing.push(`Faire établir les ${label} du vaisseau.`);
    else if (value > limit) missing.push(`Dépassement des ${label} : ${value} pour ${limit}.`);
  }
  if (!nonNegativeInteger(manifest.outwardFuel) || !nonNegativeInteger(manifest.returnFuelReserve) || manifest.returnFuelReserve === 0) missing.push("Réserver le carburant du retour avant le départ.");
  if (!nonNegativeInteger(context.availableFuel) || manifest.outwardFuel + manifest.returnFuelReserve > context.availableFuel) missing.push("Le carburant disponible ne couvre pas l’aller et la réserve de retour.");
  if (manifest.kind === "warp" && !identity(context.returnAnchorId)) missing.push("Attribuer une ancre de retour indépendante du module actif.");
  return { allowed: missing.length === 0, missing: [...new Set(missing)], people, wounded, cargoUnits };
}

export interface ShipCommittedDepartureV85 {
  manifest: ShipManifestV85;
  /** Frozen at departure. New departure gates do not apply to its rescue return. */
  returnAnchorId: string | null;
  returnFuelReserve: number;
}
export function commitShipDepartureV85(manifest: ShipManifestV85, context: ShipDepartureContextV85): ShipCommittedDepartureV85 | null {
  if (!evaluateShipDepartureV85(manifest, context).allowed) return null;
  return {
    manifest: { ...manifest, travellers: manifest.travellers.map(person => ({ ...person })), cargo: manifest.cargo.map(item => ({ ...item })) },
    returnAnchorId: manifest.kind === "warp" ? context.returnAnchorId : null,
    returnFuelReserve: manifest.returnFuelReserve,
  };
}
export interface ShipPersonReturnV85 {
  id: string;
  condition: "fit" | "wounded" | "missing" | "dead";
}
export interface ShipCargoReturnV85 {
  id: string;
  disposition: "retained" | "delivered" | "returned-to-owner" | "abandoned";
}
export interface ShipReturnReceiptV85 {
  operationId: string;
  ownerSaveCreatedAt: string;
  branchId: string;
  people: readonly ShipPersonReturnV85[];
  cargo: readonly ShipCargoReturnV85[];
  witness: string;
}
export interface ShipRoomReturnV85 {
  stationId: PhysicalShipStationId;
  label: string;
  personIds: readonly string[];
  cargoIds: readonly string[];
}

/** Full dispositions prevent a returned traveller or borrowed kit from cloning.
 * A missing person remains missing; no automatic recruitment, healing or revival.
 */
export function shipReturnRoomsV85(departure: ShipCommittedDepartureV85, receipt: ShipReturnReceiptV85): readonly ShipRoomReturnV85[] | null {
  const manifest = departure.manifest;
  if (receipt.operationId !== manifest.id || receipt.ownerSaveCreatedAt !== manifest.ownerSaveCreatedAt ||
    receipt.branchId !== manifest.originBranchId || !identity(receipt.witness)) return null;
  if (receipt.people.length !== manifest.travellers.length || receipt.cargo.length !== manifest.cargo.length) return null;
  if (new Set(receipt.people.map(person => person.id)).size !== receipt.people.length ||
    new Set(receipt.cargo.map(item => item.id)).size !== receipt.cargo.length) return null;
  if (receipt.people.some(person => !manifest.travellers.some(traveller => traveller.id === person.id) ||
    !["fit", "wounded", "missing", "dead"].includes(person.condition)) ||
    receipt.cargo.some(item => !manifest.cargo.some(cargo => cargo.id === item.id) ||
    !["retained", "delivered", "returned-to-owner", "abandoned"].includes(item.disposition))) return null;
  return [
    { stationId: "medical-bay", label: "Blessés revenus · prise en charge à organiser", personIds: receipt.people.filter(person => person.condition === "wounded").map(person => person.id), cargoIds: [] },
    { stationId: "wall-armory", label: "Kit conservé et prêts restitués", personIds: [], cargoIds: receipt.cargo.filter(item => item.disposition === "retained" || item.disposition === "returned-to-owner").map(item => item.id) },
    { stationId: "galaxy-map", label: "Livraisons confirmées · route de retour", personIds: [], cargoIds: receipt.cargo.filter(item => item.disposition === "delivered").map(item => item.id) },
    { stationId: "training-arena", label: "Voyageurs revenus · transmission", personIds: receipt.people.filter(person => person.condition === "fit").map(person => person.id), cargoIds: [] },
    { stationId: "clan-archives", label: "Témoignages, pertes et matériel abandonné", personIds: receipt.people.filter(person => person.condition === "missing" || person.condition === "dead").map(person => person.id), cargoIds: receipt.cargo.filter(item => item.disposition === "abandoned").map(item => item.id) },
  ];
}
