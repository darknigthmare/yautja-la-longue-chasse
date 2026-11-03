import { createWarTeamV6, DEFAULT_WAR_RULES_V6, type WarRulesV6, type WarTeamStateV6 } from "./clanWarBibleV6";

/** A separate, replayable exercise: never a campaign acquisition or a V87–V106 migration. */
export const SPECIALIZED_IDS_V107 = ["W3-S09", "W3-S10", "W3-S13", "W3-S14", "W3-S15", "W3-S18"] as const;
export type SpecializedIdV107 = typeof SPECIALIZED_IDS_V107[number];
export interface PointV107 { x: number; y: number }
export interface SpecializedDefinitionV107 { id: SpecializedIdV107; name: string; cost: number; upkeep: number; turns: number; operator: string; effect: string; limit: string; cells: string }
export function specializedDefinitionsV107(rules: WarRulesV6 = DEFAULT_WAR_RULES_V6): SpecializedDefinitionV107[] {
  return SPECIALIZED_IDS_V107.flatMap(id => {
    const entry = rules.entries.find(item => item.sheet === "Structures de guerre" && item.id === id);
    if (!entry) return [];
    const cell = (column: string) => entry.fields.find(item => item.column === column)?.value;
    const cost = Number(cell("D")), upkeep = Number(cell("E")), turns = Number(cell("F")), operator = String(cell("G"));
    if (![cost, upkeep, turns].every(value => Number.isInteger(value) && value >= 0 && value <= 120) || turns < 2 || !rules.units.some(unit => unit.id === operator)) return [];
    return [{ id, name: String(entry.title), cost, upkeep, turns, operator, effect: String(cell("H")), limit: String(cell("I")), cells: `C${entry.row}:K${entry.row}` }];
  });
}
export const SPECIALIZED_CONTRACT_V107 = {
  workbook: "Yautja_V6_Bible_Cumulative_et_Dialogues.xlsx", sheet: "Structures de guerre",
  sourceSha: "87ad5d1a6eaf49f2908a4457ef3f97b8f34db481a24bbc121d2e924559b19183",
  rules: ["W3-R07", "W3-R08", "W3-R09", "W3-R19", "W3-R24", "W3-R28", "W3-R29"],
  hypotheses: "Exercice indépendant à K01 : 120 RAV finis, deux appuis, géométrie et vitesses locales ; portage 20 RAV pour U19, 6 pour un opérateur ; montures, eau, cellules, pilote, embarcations et navette prêtés dès le départ. Aucun gain de campagne. Courant, places, carburant, portée acoustique et règles de touche sont des paramètres d’exercice, absents du classeur.",
  limits: "Pas de destruction/réparation générique chiffrée sans source ; pas d’ennemis révélés, de revenu automatique, d’achat de navire de campagne, de faune/météo audio inventée ni de certification canonique 1:1.",
} as const;
export const SPECIALIZED_AUDIO_V107 = [
  { id: "ship", name: "Machinerie de bord", src: "/audio/ambience/ship/v54.wav", sha256: "b2ed760f17352aca514eb2a7aa6f6295127188bf2e7b02390a25ec12295d3371", x: 500, y: 100 },
  { id: "scan", name: "Impulsion du scanner", src: "/audio/sfx/scan/v54.wav", sha256: "86e2562187736d346c8fac42eeeeb87ff3e77fd75fb8ede2ee562f2a8632907d", x: 500, y: 330 },
] as const;
export const SPECIALIZED_ASSETS_V107 = {
  boat: "/game/homeworld/v77/lava-transit-skiff.png", mount: "/game/homeworld/v77/fauna/yautja-horse-corrected.png", ship: "/game/homeworld/v64/clan-shuttle.png",
} as const;
export interface SpecializedActorV107 extends PointV107 { id: string; team: WarTeamStateV6; readyAt: number; rav: number; supplied: boolean; aboard: boolean; layer: "surface" | "transit" | "orbit" }
export interface SpecializedStateV107 {
  version: 1; context: "free-specialized-works-v107"; sourceSha: string; rulesKey: string; scenario: SpecializedIdV107;
  turn: number; revision: number; depot: number; bin: number; spent: number; recruitment: number; lastNeed: number; lastPaid: number;
  actors: SpecializedActorV107[];
  work: { position: PointV107 | null; phase: "unplaced" | "planned" | "reserved" | "carried" | "delivered" | "building" | "ready"; supports: number[]; worked: number; staffed: boolean; supplied: boolean };
  kit: { id: string; holder: "depot" | "carrier" | "site" };
  boat: PointV107 & { id: string; pilotId: string; phase: "home" | "outbound" | "away" | "inbound"; progress: number; cargo: number; passengers: string[]; trip: number };
  mounts: (PointV107 & { id: string; fatigue: number; leadBy: string | null; watered: number })[]; waterContainerId: string; water: number; waterSite: number; waterCarried: number;
  battery: { id: string; holder: "depot" | "carrier" | "site"; charge: number }; screenOn: boolean;
  probe: PointV107 & { id: string; blocked: number; crossings: number; route: "north" | "south" | null; progress: number };
  duel: { signatures: string[]; phase: "unsigned" | "accepted" | "active" | "won" | "lost" | "interrupted"; player: number; rival: number; round: number; result: string | null; winnerId: string | null; objective: { id: string; holder: string } };
  recordings: { id: string; sourceId: string; sha256: string; x: number; y: number; turn: number; seconds: number }[]; compared: boolean;
  ship: PointV107 & { id: string; pilotId: string; phase: "surface" | "outbound" | "orbit" | "inbound"; progress: number; fuel: number; passengers: string[]; cargo: number; trip: number; recon: boolean; authorized: boolean };
  receipts: string[]; history: SpecializedActionV107[]; log: string[];
}
type SpecializedActionBodyV107 =
  | { type: "move"; actor: string; dx: number; dy: number }
  | { type: "place"; plot: number }
  | { type: "support"; index: number }
  | { type: "rav"; actor: string; direction: "load" | "unload"; amount: number }
  | { type: "record"; sourceId: string; seconds: number }
  | { type: "operate"; operation: string; target?: string }
  | { type: "reserve" | "load-kit" | "deliver-kit" | "work" | "staff" | "wait" };
export type SpecializedActionV107 = SpecializedActionBodyV107 & { operationId?: string };
/** Stamp once at the point of intent; retries must reuse that same command. */
export function specializedCommandV107(state: SpecializedStateV107, action: SpecializedActionV107): SpecializedActionV107 {
  return { ...action, operationId: action.operationId ?? `v107:${state.scenario}:${state.revision + 1}` };
}
export interface SpecializedResultV107 { state: SpecializedStateV107; accepted: boolean; message: string }
export const SPECIALIZED_DEPOT_V107 = { x: 100, y: 350 };
export const specializedPlotsV107 = (id: SpecializedIdV107): PointV107[] => id === "W3-S09" ? [{ x: 300, y: 270 }] : id === "W3-S13" ? [{ x: 395, y: 100 }] : [{ x: 280, y: 280 }, { x: 320, y: 350 }, { x: 500, y: 350 }];
const near = (a: PointV107, b: PointV107, radius = 40) => Math.hypot(a.x - b.x, a.y - b.y) <= radius;
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const key = (rules: WarRulesV6) => JSON.stringify({ protocol: "specialized-v107-r1", hypotheses: SPECIALIZED_CONTRACT_V107.hypotheses, audio: SPECIALIZED_AUDIO_V107, assets: SPECIALIZED_ASSETS_V107, definitions: specializedDefinitionsV107(rules), entries: rules.entries.filter(entry => [...SPECIALIZED_IDS_V107, ...SPECIALIZED_CONTRACT_V107.rules, "W3-K01", "W3-OBJ02", "W3-OBJ05", "W3-OBJ17", "W3-METH02", "W3-METH03", "W3-METH08", "W3-U05", "W3-U08", "W3-U19", "W3-U21", "W3-U25", "W3-U26", "W3-U27"].includes(entry.id)), units: rules.units.filter(unit => ["W3-U05", "W3-U08", "W3-U19", "W3-U21", "W3-U25", "W3-U26", "W3-U27"].includes(unit.id)), cap: rules.parameters.pc_cap_1 });
const trusted = new WeakSet<object>();
function seal(state: SpecializedStateV107) {
  const freeze = (value: unknown) => { if (value && typeof value === "object" && !Object.isFrozen(value)) { for (const child of Object.values(value)) freeze(child); Object.freeze(value); } };
  freeze(state); trusted.add(state); return state;
}
export function createSpecializedV107(scenario: SpecializedIdV107, rules: WarRulesV6 = DEFAULT_WAR_RULES_V6): SpecializedStateV107 | null {
  const definition = specializedDefinitionsV107(rules).find(item => item.id === scenario); if (!definition) return null;
  const unitIds = [definition.operator, "W3-U19", ...(scenario === "W3-S14" ? ["W3-U08"] : [])];
  const units = unitIds.map(id => rules.units.find(unit => unit.id === id)); if (units.some(unit => !unit)) return null;
  const recruitment = units.reduce((sum, unit) => sum + unit!.recruitmentRav, 0);
  if (units.reduce((sum, unit) => sum + unit!.commandPoints, 0) > rules.parameters.pc_cap_1 || recruitment + definition.cost > 120) return null;
  const actors: SpecializedActorV107[] = unitIds.map((unitId, index) => ({ id: ["operator", "carrier", "rival"][index], team: createWarTeamV6(unitId, `v107-${scenario}-${["operator", "carrier", "rival"][index]}`, rules)!, x: 100 + index * 22, y: 350, readyAt: units[index]!.delayTurns, rav: 0, supplied: true, aboard: false, layer: "surface" }));
  return seal({ version: 1, context: "free-specialized-works-v107", sourceSha: rules.metadata.sha256, rulesKey: key(rules), scenario, turn: 0, revision: 0, depot: 120 - recruitment, bin: 0, spent: 0, recruitment, lastNeed: 0, lastPaid: 0, actors,
    work: { position: null, phase: "unplaced", supports: [], worked: 0, staffed: false, supplied: false }, kit: { id: `${scenario}-kit-1`, holder: "depot" },
    boat: { id: "skiff-prête-01", pilotId: "passeur-civil-01", x: 300, y: 270, phase: "home", progress: 0, cargo: 0, passengers: [], trip: 0 },
    mounts: [{ id: "monture-prêtée-01", x: 190, y: 100, fatigue: 60, leadBy: null, watered: 0 }, { id: "monture-prêtée-02", x: 255, y: 100, fatigue: 45, leadBy: null, watered: 0 }], waterContainerId: "bidon-eau-01", water: 6, waterSite: 0, waterCarried: 0,
    battery: { id: "cellule-01", holder: "depot", charge: 4 }, screenOn: false, probe: { id: "sonde-inerte-01", x: 350, y: 100, blocked: 0, crossings: 0, route: null, progress: 0 },
    duel: { signatures: [], phase: "unsigned", player: 3, rival: 3, round: 0, result: null, winnerId: null, objective: { id: "coffre-exercice-01", holder: "site" } }, recordings: [], compared: false,
    ship: { id: "navette-prêtée-01", pilotId: "pilote-civil-01", x: 320, y: 280, phase: "surface", progress: 0, fuel: 4, passengers: [], cargo: 0, trip: 0, recon: false, authorized: false },
    receipts: [], history: [], log: [`Mandat indépendant : recrutement payé ${recruitment} RAV, équipes attendues au dépôt après leur délai source. Les véhicules, animaux et consommables d’exercice sont déjà identifiés ; aucun bâtiment ne les crée.`] });
}
export function specializedObstaclesV107(state: SpecializedStateV107) {
  if (state.scenario === "W3-S09") return [{ x: 350, y: 0, width: 80, height: 440 }];
  if (state.scenario === "W3-S10") return [{ x: 390, y: 0, width: 30, height: 210 }, { x: 390, y: 245, width: 30, height: 100 }];
  if (state.scenario === "W3-S18") return [{ x: 420, y: 140, width: 30, height: 140 }, { x: 575, y: 0, width: 145, height: 135 }];
  return [{ x: 420, y: 140, width: 30, height: 140 }];
}
export function specializedCanStandV107(state: SpecializedStateV107, point: PointV107, radius = 9) {
  return point.x >= radius && point.y >= radius && point.x <= 720 - radius && point.y <= 440 - radius && !specializedObstaclesV107(state).some(rect => point.x + radius > rect.x && point.x - radius < rect.x + rect.width && point.y + radius > rect.y && point.y - radius < rect.y + rect.height);
}
const rounded = (number: number) => Math.round(number * 1000) / 1000;
function clearSegment(state: SpecializedStateV107, from: PointV107, to: PointV107, radius: number) {
  const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / 2));
  for (let step = 0; step <= steps; step++) if (!specializedCanStandV107(state, { x: from.x + (to.x - from.x) * step / steps, y: from.y + (to.y - from.y) * step / steps }, radius)) return false;
  return true;
}
export function specializedHearingV107(state: SpecializedStateV107, sourceId: string) {
  const actor = state.actors.find(item => item.id === "operator")!, source = SPECIALIZED_AUDIO_V107.find(item => item.id === sourceId);
  if (!source || state.scenario !== "W3-S15" || actor.readyAt > state.turn || actor.aboard) return { audible: false, reason: "Aucune prise accessible." };
  if (!near(actor, source, 150)) return { audible: false, reason: "Hors portée locale de 150 unités." };
  for (let step = 1; step < 60; step++) {
    const point = { x: actor.x + (source.x - actor.x) * step / 60, y: actor.y + (source.y - actor.y) * step / 60 };
    if (!specializedCanStandV107(state, point, 0)) return { audible: false, reason: "Paroi opaque entre la source et le micro." };
  }
  return { audible: true, reason: "Signal mécanique accessible ; aucun effectif ennemi déduit." };
}
function turn(state: SpecializedStateV107, definition: SpecializedDefinitionV107, rules: WarRulesV6) {
  state.turn++; let need = 0, paid = 0;
  const withdraw = (amount: number, actor?: SpecializedActorV107) => {
    let remaining = amount;
    if (actor?.aboard) {
      const transport = state.scenario === "W3-S09" ? state.boat : state.ship;
      const aboard = Math.min(transport.cargo, remaining); transport.cargo -= aboard; remaining -= aboard;
      paid += amount - remaining; return remaining === 0;
    }
    if (actor) { const own = Math.min(actor.rav, remaining); actor.rav -= own; remaining -= own; }
    if (actor && near(actor, SPECIALIZED_DEPOT_V107, 55)) { const part = Math.min(state.depot, remaining); state.depot -= part; remaining -= part; }
    else if (state.work.position && (!actor || near(actor, state.work.position, 65))) { const part = Math.min(state.bin, remaining); state.bin -= part; remaining -= part; }
    paid += amount - remaining; return remaining === 0;
  };
  for (const actor of state.actors) if (actor.readyAt <= state.turn) {
    const amount = rules.units.find(unit => unit.id === actor.team.unitId)!.upkeepRav; need += amount; actor.supplied = withdraw(amount, actor);
  }
  if (state.work.phase === "ready") { need += definition.upkeep; state.work.supplied = withdraw(definition.upkeep); }
  state.lastNeed = need; state.lastPaid = paid; state.spent += paid;
  if (!state.work.supplied || !state.actors.find(actor => actor.id === "operator")!.supplied) state.screenOn = false;
}
const actionKeys: Record<string, string[]> = { move: ["type", "actor", "dx", "dy"], place: ["type", "plot"], support: ["type", "index"], rav: ["type", "actor", "direction", "amount"], record: ["type", "sourceId", "seconds"], operate: ["type", "operation", "target"], reserve: ["type"], "load-kit": ["type"], "deliver-kit": ["type"], work: ["type"], staff: ["type"], wait: ["type"] };
function validAction(value: unknown): value is SpecializedActionV107 {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const action = value as Record<string, unknown>, allowed = actionKeys[String(action.type)];
  if (!allowed || typeof action.operationId !== "string" || !/^v107:W3-S(?:09|10|13|14|15|18):[1-9][0-9]{0,6}$/.test(action.operationId) || Object.keys(action).some(key => key !== "operationId" && !allowed.includes(key))) return false;
  if (action.type === "move") return typeof action.actor === "string" && [action.dx, action.dy].every(item => typeof item === "number" && Number.isFinite(item)) && Math.hypot(action.dx as number, action.dy as number) > 0 && Math.hypot(action.dx as number, action.dy as number) <= 24.001;
  if (action.type === "place" || action.type === "support") return Number.isInteger(action[action.type === "place" ? "plot" : "index"]);
  if (action.type === "rav") return typeof action.actor === "string" && ["load", "unload"].includes(String(action.direction)) && Number.isInteger(action.amount) && Number(action.amount) > 0 && Number(action.amount) <= 20;
  if (action.type === "record") return typeof action.sourceId === "string" && typeof action.seconds === "number" && Number.isFinite(action.seconds) && action.seconds >= .25 && action.seconds <= 30;
  if (action.type === "operate") return typeof action.operation === "string" && action.operation.length <= 50 && (action.target === undefined || typeof action.target === "string" && action.target.length <= 80);
  return true;
}
export function applySpecializedV107(current: SpecializedStateV107, action: SpecializedActionV107, rules: WarRulesV6 = DEFAULT_WAR_RULES_V6): SpecializedResultV107 {
  const reject = (message: string): SpecializedResultV107 => ({ state: current, accepted: false, message });
  if (!trusted.has(current) || current.rulesKey !== key(rules) || !validAction(action) || current.history.length >= 5000) return reject("Carnet, règles ou commande invalides.");
  const previous = current.history.find(item => item.operationId === action.operationId);
  if (previous) {
    if (JSON.stringify(previous) !== JSON.stringify(action)) return reject("Identifiant de transaction déjà utilisé pour une autre intention ; commande refusée.");
    return { state: current, accepted: true, message: "Transaction déjà traitée ; aucun objet, déplacement, débit ni résultat répété." };
  }
  if (action.operationId !== `v107:${current.scenario}:${current.revision + 1}`) return reject("Commande périmée ou d’un autre mandat ; préparer une nouvelle intention depuis l’état courant.");
  const definition = specializedDefinitionsV107(rules).find(item => item.id === current.scenario)!;
  const state = clone(current), operator = state.actors.find(actor => actor.id === "operator")!, carrier = state.actors.find(actor => actor.id === "carrier")!;
  const ready = (actor: SpecializedActorV107) => actor.readyAt <= state.turn && actor.team.members.every(member => member.status === "fit") && !actor.aboard;
  const atWork = (actor: SpecializedActorV107) => ready(actor) && actor.layer === "surface" && !!state.work.position && near(actor, state.work.position, 58);
  const functional = () => state.work.phase === "ready" && state.work.staffed && state.work.supplied && operator.supplied && atWork(operator);
  let message = "", advance = false;
  if (action.type === "wait") { advance = true; message = "Un tour écoulé ; entretien prélevé seulement dans les stocks réellement accessibles."; }
  else if (action.type === "place") {
    if (state.work.phase !== "unplaced" || !specializedPlotsV107(state.scenario)[action.plot]) return reject("Choisissez un terrain libre avant de réserver les pièces.");
    state.work.position = specializedPlotsV107(state.scenario)[action.plot]; state.work.phase = "planned";
    if (state.scenario === "W3-S18") { state.ship.x = state.work.position.x; state.ship.y = state.work.position.y; }
    message = "Implantation locale choisie ; aucun ouvrage créé.";
  } else if (action.type === "reserve") {
    if (state.work.phase !== "planned" || state.depot < definition.cost) return reject("Terrain ou stock du dépôt insuffisant.");
    state.depot -= definition.cost; state.spent += definition.cost; state.work.phase = "reserved"; message = `${definition.cost} RAV réservés une seule fois dans le kit ${state.kit.id}.`;
  } else if (action.type === "load-kit") {
    if (state.work.phase !== "reserved" || !ready(carrier) || !near(carrier, SPECIALIZED_DEPOT_V107)) return reject("Les récupérateurs U19 doivent être arrivés auprès du kit au dépôt.");
    state.kit.holder = "carrier"; state.work.phase = "carried"; message = "Le kit identifié suit maintenant les récupérateurs.";
  } else if (action.type === "deliver-kit") {
    if (state.work.phase !== "carried" || !atWork(carrier)) return reject("Acheminer réellement le kit au chantier avant de le décharger.");
    state.kit.holder = "site"; state.work.phase = "delivered"; message = "Kit déchargé au chantier ; la réservation ne vaut pas construction.";
  } else if (action.type === "support") {
    if (!["delivered", "building"].includes(state.work.phase) || ![0, 1].includes(action.index) || state.work.supports.includes(action.index) || !ready(operator) || !state.work.position || !near(operator, { x: state.work.position.x + (action.index === 0 ? -28 : 28), y: state.work.position.y }, 24)) return reject("L’opérateur requis doit atteindre cet appui non posé.");
    state.work.supports.push(action.index); message = `Appui ${action.index + 1} posé sur place.`;
  } else if (action.type === "work") {
    if (!["delivered", "building"].includes(state.work.phase) || state.work.supports.length !== 2 || !atWork(operator) || !operator.supplied) return reject("Kit, deux appuis et opérateur ravitaillé présents requis.");
    advance = true; state.work.worked++; state.work.phase = state.work.worked >= definition.turns ? "ready" : "building"; message = `Travail effectif ${state.work.worked}/${definition.turns} tours source ; la simple attente ne construit rien.`;
  } else if (action.type === "staff") {
    if (state.work.phase !== "ready" || !atWork(operator) || !operator.supplied) return reject("Ouvrage terminé et opérateur source présent requis.");
    state.work.staffed = !state.work.staffed; message = state.work.staffed ? "Service pris par la même équipe opératrice." : "Service quitté ; l’ouvrage ne produit plus son effet.";
  } else if (action.type === "rav") {
    const actor = state.actors.find(item => item.id === action.actor); if (!actor || !ready(actor)) return reject("Équipe indisponible pour ce transfert.");
    const cap = actor.id === "carrier" ? 20 : 6;
    if (action.direction === "load") {
      if (!near(actor, SPECIALIZED_DEPOT_V107) || actor.rav + action.amount > cap || state.depot < action.amount) return reject("Chargement refusé : dépôt, quantité ou capacité de portage.");
      state.depot -= action.amount; actor.rav += action.amount;
    } else {
      if (!atWork(actor) || actor.rav < action.amount || state.bin + action.amount > 40) return reject("Déchargement refusé : chantier éloigné, lot absent ou casier plein (40, hypothèse locale).");
      actor.rav -= action.amount; state.bin += action.amount;
    }
    message = `Transfert physique de ${action.amount} RAV par ${actor.team.id}.`;
  } else if (action.type === "move") {
    const actor = state.actors.find(item => item.id === action.actor); if (!actor || !ready(actor)) return reject("Cette équipe est en intégration ou embarquée.");
    const point = { x: rounded(actor.x + action.dx), y: rounded(actor.y + action.dy) }, mount = state.mounts.find(item => item.leadBy === actor.id);
    if (actor.layer === "orbit") {
      if (!near(point, { x: 650, y: 60 }, 45)) return reject("L’équipe débarquée reste dans l’escale orbitale ; revenir par la navette pour rejoindre le sol.");
    } else if (!clearSegment(state, actor, point, mount ? 23 : 9)) return reject(mount ? "Le gabarit de la monture ne passe pas ; rejoindre le passage large au sud." : "La rive, la paroi, l’emprise orbitale distincte ou la limite bloque ce pas.");
    actor.x = point.x; actor.y = point.y;
    if (mount) { mount.x = point.x; mount.y = point.y; mount.fatigue = Math.min(100, mount.fatigue + 1); }
    if (actor.id === "operator" && state.work.staffed && !atWork(actor) && state.scenario !== "W3-S15") { state.work.staffed = false; state.screenOn = false; }
    if (state.duel.phase === "active" && actor.id === "carrier" && state.work.position && near(actor, state.work.position, 65)) { state.duel.phase = "interrupted"; state.duel.result = "Tiers entré dans l’aire : accord suspendu, aucun objectif attribué."; }
    if (state.duel.phase === "active" && ["operator", "rival"].includes(actor.id) && state.work.position && !near(actor, state.work.position, 65)) { state.duel.phase = "interrupted"; state.duel.result = "Signataire sorti de l’aire : duel interrompu, aucun objectif attribué."; }
    message = "Déplacement physique effectué ; aucune ressource ni personne dupliquée.";
  } else if (action.type === "record") {
    if (!specializedHearingV107(state, action.sourceId).audible || state.recordings.length >= 12) return reject("Prise refusée : portée, occlusion ou carnet plein.");
    const source = SPECIALIZED_AUDIO_V107.find(item => item.id === action.sourceId)!;
    state.recordings.push({ id: `prise-${state.recordings.length + 1}`, sourceId: source.id, sha256: source.sha256, x: operator.x, y: operator.y, turn: state.turn, seconds: Math.round(action.seconds * 1000) / 1000 });
    message = "Prise située mémorisée après lecture audio ; son fichier source réel reste référencé, aucun ennemi identifié.";
  } else if (action.type === "operate") {
    const op = action.operation;
    if (state.scenario === "W3-S09") {
      const boat = state.boat;
      if (op === "board") {
        if (!functional() || !["home", "away"].includes(boat.phase) || !ready(carrier) || !near(carrier, boat) || boat.passengers.length || state.kit.holder === "carrier" || carrier.team.members.length > 3) return reject("Quai actif, bateau à quai et récupérateurs sans kit à proximité requis (3 places d’exercice). Les nageurs restent au quai.");
        carrier.aboard = true; carrier.x = boat.x; carrier.y = boat.y; boat.passengers = carrier.team.members.map(member => member.id); boat.cargo = carrier.rav; carrier.rav = 0; message = "Les trois récupérateurs identifiés et leur lot embarquent avec le passeur civil.";
      } else if (op === "depart") {
        if (!functional() || !["home", "away"].includes(boat.phase) || boat.passengers.length === 0 || state.turn % 4 > 1) return reject("Départ refusé : quai non tenu, manifeste vide ou fenêtre de courant fermée (tours modulo 4 : 0–1, hypothèse).");
        boat.phase = boat.phase === "home" ? "outbound" : "inbound"; boat.progress = 0; boat.trip++; advance = true; message = "Départ engagé sur la même coque ; courant contrôlé avant le départ.";
      } else if (op === "advance") {
        if (!["outbound", "inbound"].includes(boat.phase)) return reject("Aucune traversée engagée.");
        const outbound = boat.phase === "outbound"; boat.progress++; const t = boat.progress / 12;
        boat.x = rounded(outbound ? 300 + 180 * t : 480 - 180 * t); boat.y = rounded(270 - 35 * Math.sin(Math.PI * t)); carrier.x = boat.x; carrier.y = boat.y;
        if (boat.progress === 12) { boat.phase = outbound ? "away" : "home"; state.receipts.push(`bateau-${boat.trip}-${boat.phase}`); advance = true; }
        message = `Traversée ${boat.progress}/12 ; positions du bateau et des occupants communes.`;
      } else if (op === "disembark") {
        if (!["home", "away"].includes(boat.phase) || !carrier.aboard) return reject("Débarquement réservé à l’arrivée effective.");
        carrier.aboard = false; carrier.rav = boat.cargo; boat.cargo = 0; boat.passengers = []; carrier.x = boat.x + (boat.phase === "home" ? -22 : 22); carrier.y = boat.y; message = "Même manifeste débarqué, lot rendu une seule fois aux porteurs.";
      } else return reject("Commande de quai inconnue.");
    } else if (state.scenario === "W3-S10") {
      if (op === "load-water") {
        if (!ready(carrier) || !near(carrier, SPECIALIZED_DEPOT_V107) || state.water === 0 || state.waterCarried > 0 || state.kit.holder === "carrier") return reject("Bidon fini au dépôt et récupérateurs libres requis.");
        state.waterCarried = state.water; state.water = 0; message = "Bidon identifié de six unités chargé au dépôt, aucun réapprovisionnement automatique.";
      } else if (op === "deliver-water") {
        if (!atWork(carrier) || state.waterCarried === 0) return reject("Le bidon doit atteindre réellement l’aire de montures.");
        state.waterSite += state.waterCarried; state.waterCarried = 0; message = "Même bidon livré à l’aire ; l’eau devient accessible aux soins.";
      } else {
      const mount = state.mounts.find(item => item.id === action.target);
      if (!mount) return reject("Monture identifiée requise.");
      if (op === "lead") {
        if (!ready(operator) || !near(operator, mount) || mount.leadBy || state.mounts.some(item => item.leadBy === operator.id)) return reject("Les guides U21 doivent rejoindre une monture libre, une seule conduite à la fois.");
        if (!clearSegment(state, mount, operator, 23)) return reject("Reprendre la longe ne déplace pas une monture à travers une paroi ou une fente trop étroite ; rejoindre son côté par le passage large.");
        mount.leadBy = operator.id; mount.x = operator.x; mount.y = operator.y; message = "Monture préexistante prise en longe ; son large gabarit suit les guides.";
      } else if (op === "release") {
        if (mount.leadBy !== operator.id) return reject("Cette monture n’est pas conduite.");
        mount.leadBy = null; message = "Monture laissée à sa position réelle.";
      } else if (op === "care") {
        if (!functional() || !state.work.position || !near(mount, state.work.position, 50) || state.waterSite < 2 || mount.fatigue === 0) return reject("Aire tenue, monture réellement présente et 2 unités d’eau réellement livrées requises.");
        if (state.mounts.filter(item => near(item, state.work.position!, 50)).length > 2) return reject("Capacité des deux places dépassée.");
        state.waterSite -= 2; mount.watered += 2; mount.fatigue = Math.max(0, mount.fatigue - 40); advance = true; state.receipts.push(`soin-${mount.id}-${mount.watered}`); message = "Repos et abreuvement réellement consommés, sans créer une troisième monture.";
      } else return reject("Commande de monture inconnue.");
      }
    } else if (state.scenario === "W3-S13") {
      if (op === "load-cell") {
        if (!ready(carrier) || !near(carrier, SPECIALIZED_DEPOT_V107) || state.battery.holder !== "depot" || state.kit.holder === "carrier") return reject("Cellule unique au dépôt et porteur libre requis.");
        state.battery.holder = "carrier"; message = "Cellule finie chargée par les récupérateurs.";
      } else if (op === "install-cell") {
        if (!atWork(carrier) || state.battery.holder !== "carrier" || state.work.phase !== "ready") return reject("Acheminer la cellule au vrai écran terminé.");
        state.battery.holder = "site"; message = "Cellule branchée au chantier ; quatre charges d’exercice disponibles.";
      } else if (op === "power") {
        if (!functional() || state.battery.holder !== "site" || state.battery.charge < 1) return reject("Opérateurs, ravitaillement et cellule chargée nécessaires.");
        state.screenOn = !state.screenOn; message = state.screenOn ? "Seul le couloir nord est fermé ; la voie sud reste libre." : "Écran coupé.";
      } else if (op === "probe-north" || op === "probe-south") {
        if (state.probe.route) return reject("Terminer le trajet engagé de la même sonde avant de changer de couloir.");
        state.probe.route = op === "probe-north" ? "north" : "south"; state.probe.progress = 0; state.probe.x = 350; state.probe.y = op === "probe-north" ? 100 : 360;
        message = "Sonde replacée au départ connu de son rail d’exercice ; avancer pour éprouver le passage.";
      } else if (op === "probe-step") {
        if (!state.probe.route) return reject("Choisir d’abord le couloir de la sonde.");
        state.probe.progress++; state.probe.x += 15;
        if (state.probe.route === "north" && state.probe.x >= 395 && state.probe.x <= 410 && functional() && state.screenOn && state.battery.charge > 0) {
          state.battery.charge--; state.probe.blocked++; state.probe.route = null; if (!state.battery.charge) state.screenOn = false; message = "Sonde arrêtée à la barrière réelle du seul couloir couvert ; une charge consommée."; advance = true;
        } else if (state.probe.progress === 10) { state.probe.crossings++; state.probe.route = null; advance = true; message = "Sonde arrivée de l’autre côté : le rail adjacent ou l’écran inactif laisse passer."; }
        else message = `Sonde avancée physiquement : étape ${state.probe.progress}/10.`;
        if (advance) state.receipts.push(`sonde-${state.probe.blocked + state.probe.crossings}`);
      } else return reject("Commande de confinement inconnue.");
    } else if (state.scenario === "W3-S14") {
      const rival = state.actors.find(actor => actor.id === "rival")!;
      if (op === "sign") {
        const signer = state.actors.find(actor => actor.id === action.target);
        if (!signer || !["operator", "rival"].includes(signer.id) || !atWork(signer) || !["unsigned", "accepted"].includes(state.duel.phase) || state.duel.signatures.includes(signer.team.members[0].id)) return reject("Chaque duelliste présent signe lui-même une seule fois, avant le combat.");
        state.duel.signatures.push(signer.team.members[0].id); state.duel.phase = state.duel.signatures.length === 2 ? "accepted" : "unsigned"; message = "Signature enregistrée : droit de retirer le coffre d’exercice identifié ; aucun clan ni tiers engagé.";
      } else if (op === "start") {
        if (!functional() || state.duel.phase !== "accepted" || !atWork(rival) || near(carrier, state.work.position!, 65)) return reject("Les deux signataires dans l’aire et le tiers hors de l’aire sont requis.");
        state.duel.phase = "active"; message = "Duel d’exercice engagé : trois touches, esquive physique entre les échanges, aucune récompense de campagne.";
      } else if (op === "strike" || op === "reply") {
        if (state.duel.phase !== "active" || !atWork(operator) || !atWork(rival)) return reject("Les deux signataires doivent rester dans l’aire active.");
        if (op === "strike") {
          if (state.duel.round % 2 !== 0 || !near(operator, rival, 32)) return reject("Votre échange exige le contact à 32 unités ; ensuite laisser répondre le rival.");
          state.duel.rival--; state.duel.round++; message = "Touche portée au signataire présent ; le rival doit répondre.";
        } else {
          if (state.duel.round % 2 !== 1) return reject("Le rival n’a pas de réponse engagée.");
          if (near(operator, rival, 32)) { state.duel.player--; message = "Réponse au contact : une touche reçue."; } else { message = "Réponse esquivée par votre déplacement réel dans l’aire."; }
          state.duel.round++; advance = true;
        }
        if (state.duel.rival === 0 || state.duel.player === 0) {
          state.duel.phase = state.duel.rival === 0 ? "won" : "lost"; state.duel.winnerId = state.duel.phase === "won" ? operator.team.members[0].id : rival.team.members[0].id; state.duel.result = `${state.duel.winnerId} obtient le droit de retirer ${state.duel.objective.id}. Aucun tiers engagé.`; state.receipts.push("duel-result-1");
        }
      } else if (op === "claim") {
        const winner = state.actors.find(actor => actor.team.members.some(member => member.id === state.duel.winnerId));
        if (!winner || !["won", "lost"].includes(state.duel.phase) || !atWork(winner) || state.duel.objective.holder !== "site") return reject("Seul le vainqueur présent peut retirer une fois le coffre identifié.");
        state.duel.objective.holder = state.duel.winnerId!; state.receipts.push("duel-coffre-remis-1"); message = "Coffre réellement remis au membre vainqueur ; le même objet suit désormais sa position, sans ressource ni gain de campagne.";
      } else return reject("Commande de duel inconnue.");
    } else if (state.scenario === "W3-S15") {
      if (op !== "compare" || !functional() || state.recordings.length < 2 || new Set(state.recordings.map(item => item.sourceId)).size < 2 || state.compared) return reject("Deux prises de sources distinctes puis retour auprès de la station tenue requis ; comparaison unique.");
      state.compared = true; state.receipts.push("comparaison-1"); advance = true; message = "Comparaison : machinerie continue et impulsion mécanique distinctes. Faune, météo, distance réelle et identité adverse non établies ; aucun ennemi ajouté à l’atlas.";
    } else if (state.scenario === "W3-S18") {
      const ship = state.ship;
      if (op === "recon") {
        if (!atWork(operator) || state.work.phase !== "ready" || ship.recon) return reject("Reconnaître sur place l’aire d’escale terminée avant l’autorisation.");
        ship.recon = true; message = "Aire parcourue et reconnue par les briseurs U26 ; pas de sécurité adverse présumée.";
      } else if (op === "authorize") {
        if (!functional() || !ship.recon || ship.authorized) return reject("Escorte en service et reconnaissance effective requises.");
        ship.authorized = true; message = `Autorisation limitée à ${ship.id}, son pilote et la route d’exercice surface–orbite.`;
      } else if (op === "board") {
        if (ship.phase === "surface" && !functional() || !ship.authorized || !["surface", "orbit"].includes(ship.phase) || !ready(carrier) || !near(carrier, ship) || ship.passengers.length || carrier.team.members.length > 3 || state.kit.holder === "carrier") return reject("Navette à l’escale, autorisée et manifeste disponible à trois places requis ; l’embarquement au sol exige l’escorte en service.");
        ship.passengers = carrier.team.members.map(member => member.id); ship.cargo = carrier.rav; carrier.rav = 0; carrier.aboard = true; carrier.x = ship.x; carrier.y = ship.y; message = "Manifeste fermé : trois personnes U19, leur charge finie et un pilote civil distinct.";
      } else if (op === "depart") {
        if (!["surface", "orbit"].includes(ship.phase) || !ship.authorized || ship.fuel < 1 || ship.passengers.length === 0 || ship.phase === "surface" && !functional()) return reject("Départ refusé : route autorisée, occupants, carburant ou quai tenu manquants.");
        ship.phase = ship.phase === "surface" ? "outbound" : "inbound"; carrier.layer = "transit"; ship.progress = 0; ship.fuel--; ship.trip++; advance = true; message = "Voyage engagé, une unité de carburant consommée une seule fois ; l’escorte reste au sol.";
      } else if (op === "advance") {
        if (!["outbound", "inbound"].includes(ship.phase)) return reject("Aucun trajet orbital engagé.");
        if (ship.phase === "inbound" && ship.progress === 15 && !functional()) return reject("Approche suspendue : l’escale au sol doit être de nouveau tenue et ravitaillée avant l’atterrissage.");
        const outbound = ship.phase === "outbound", base = state.work.position!; ship.progress++; const t = ship.progress / 16;
        ship.x = rounded(outbound ? base.x + (650 - base.x) * t : 650 + (base.x - 650) * t); ship.y = rounded(outbound ? base.y + (60 - base.y) * t : 60 + (base.y - 60) * t); carrier.x = ship.x; carrier.y = ship.y;
        if (ship.progress === 16) { ship.phase = outbound ? "orbit" : "surface"; carrier.layer = outbound ? "orbit" : "surface"; state.receipts.push(`orbite-${ship.trip}-${ship.phase}`); advance = true; }
        message = `Trajet orbital ${ship.progress}/16 ; coque, équipage et charge restent identifiés.`;
      } else if (op === "disembark") {
        if (!["surface", "orbit"].includes(ship.phase) || !carrier.aboard) return reject("La coque doit réellement arriver avant le débarquement.");
        carrier.aboard = false; carrier.rav = ship.cargo; ship.cargo = 0; ship.passengers = []; carrier.x = ship.x - 25; carrier.y = ship.y; message = ship.phase === "orbit" ? "Même équipe débarquée dans l’escale orbitale de l’exercice ; aucune planète ni possession créée." : "Même équipe et lot revenus à la plateforme de départ.";
      } else return reject("Commande orbitale inconnue.");
    }
  }
  if (!message) return reject("Commande sans effet.");
  if (advance) turn(state, definition, rules);
  state.revision++; state.history.push(clone(action)); state.log = [...state.log, `T${state.turn} · ${message}`].slice(-80);
  return { state: seal(state), accepted: true, message };
}
function replay(scenario: SpecializedIdV107, history: unknown[], rules: WarRulesV6) {
  let state = createSpecializedV107(scenario, rules); if (!state || history.length > 5000) return null;
  for (const action of history) { if (!validAction(action)) return null; const result = applySpecializedV107(state, action, rules); if (!result.accepted) return null; state = result.state; }
  return state;
}
export function exportSpecializedV107(state: SpecializedStateV107, rules: WarRulesV6 = DEFAULT_WAR_RULES_V6): string | null {
  const rebuilt = replay(state.scenario, state.history, rules);
  return trusted.has(state) && rebuilt && JSON.stringify(rebuilt) === JSON.stringify(state) ? JSON.stringify(state, null, 2) : null;
}
export function importSpecializedV107(text: string, rules: WarRulesV6 = DEFAULT_WAR_RULES_V6): { state: SpecializedStateV107 | null; error: string | null } {
  try {
    if (new TextEncoder().encode(text).length > 4 * 1024 * 1024) throw new Error("Carnet supérieur à 4 Mo.");
    const value = JSON.parse(text) as SpecializedStateV107;
    if (!value || value.version !== 1 || value.context !== "free-specialized-works-v107" || !SPECIALIZED_IDS_V107.includes(value.scenario) || value.sourceSha !== rules.metadata.sha256 || value.rulesKey !== key(rules) || !Array.isArray(value.history)) throw new Error("Version, contexte ou source incompatible ; carnet actuel conservé.");
    const state = replay(value.scenario, value.history, rules);
    if (!state || JSON.stringify(state) !== JSON.stringify(value)) throw new Error("Checkpoint incohérent avec ses actions physiques ; import refusé sans modifier le carnet courant.");
    return { state, error: null };
  } catch (error) { return { state: null, error: error instanceof Error ? error.message : "Carnet illisible." }; }
}
