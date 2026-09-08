/** Homeworld model. Authored fan-game city; no universal Yautja monarchy is asserted. */
import type { RankId } from "../types";
import { normalizeHomeworldExpeditionProof, type HomeworldExpeditionProof } from "./homeworldExpedition";

export type HomeworldService = "armory" | "customization" | "trophies" | "codex" | "medbay" | "training" | "pit" | "justice";
export type HomeworldWitnessChoice = "protect" | "restitution" | "investigate";
export type HomeworldEvidenceId = "suspect-trophy" | "memory-register" | "undercity-testimony";
export type HomeworldAudienceOutcome = "protected-witness" | "ordered-restitution" | "continued-investigation";

export const HOMEWORLD_WORLD = { width: 4_800, height: 1_700 } as const;
export const HOMEWORLD_ACTOR = { halfWidth: 24, height: 100, walkSpeed: 300, liftSpeed: 250, jumpSpeed: 420, gravity: 1_000, tickSeconds: 1 / 60 } as const;
export interface HomeworldDistrict { id: string; name: string; description: string; x: number; y: number; width: number; height: number; floorY: number; accent: string }
const district = (id: string, name: string, description: string, column: number, floorY: number, accent: string): HomeworldDistrict => ({ id, name, description, x: 120 + column * 1_200, y: floorY - 360, width: 960, height: 360, floorY, accent });
export const HOMEWORLD_DISTRICTS: readonly HomeworldDistrict[] = [
  district("port", "Port des Chasses", "Ton vaisseau reste ton refuge. Les convois et les navettes animent les quais.", 0, 1_500, "#dfb078"),
  district("market", "Marché des Clans", "Des échoppes spécialisées se partagent la grande route des artisans.", 1, 1_500, "#9ec9bd"),
  district("forges", "Forges Profondes", "Les plateformes industrielles préparent armes et parures sans supprimer la forge du vaisseau.", 2, 1_500, "#ef925b"),
  district("undercity", "Sous-Cité", "Des refuges et des galeries de maintenance relient les quartiers loin des regards.", 3, 1_500, "#a494ce"),
  district("esplanade", "Esplanade des Trophées", "Les prises possédées sont présentées publiquement ; aucune collection achetée ne prouve une chasse.", 0, 1_000, "#d9c28a"),
  district("terraces", "Terrasses des Chasseurs", "Les instructeurs proposent les exercices de mobilité, de visée et de camouflage.", 1, 1_000, "#a8c98a"),
  district("clans", "Domaine des Clans", "Délégations, repos et soins gardent les services ordinaires accessibles.", 2, 1_000, "#8bbaca"),
  district("enforcers", "Bastion des Enforcers", "Les preuves précèdent les accusations. Un témoignage compte davantage qu'une rumeur.", 3, 1_000, "#c3b8b0"),
  district("memory", "Maison de la Mémoire", "Les registres permettent de comparer l'origine des prises et leurs marques.", 0, 500, "#99cbd1"),
  district("arenas", "Grandes Arènes", "THE PIT conserve son entrée propre ; il ne verrouille aucune étape de l'enquête.", 1, 500, "#d59b8e"),
  district("temple", "Temple des Rites", "Les rites et rangs déjà acquis sont reconnus sans rétrograder le chasseur.", 2, 500, "#c5b6db"),
  district("citadel", "Citadelle du Trône", "Le Roi de la Chasse représente cette cité et ses clans alliés, dans la continuité originale du jeu.", 3, 500, "#e2c56a"),
];
/** Three continuous public lanes and three shafts create two independent circulation loops. */
export const HOMEWORLD_PLATFORMS = [500, 1_000, 1_500].map((y) => ({ id: `public-lane-${y}`, x: 100, y, width: 4_600, height: 28 }));
export const HOMEWORLD_LIFTS = [
  { id: "port-memory-lift", label: "Ascenseur des archives", x: 700, top: 500, bottom: 1_500, halfWidth: 56 },
  { id: "central-lift", label: "Liaison des artisans", x: 2_400, top: 500, bottom: 1_500, halfWidth: 56 },
  { id: "maintenance-lift", label: "Raccourci de maintenance", x: 4_100, top: 500, bottom: 1_500, halfWidth: 56 },
] as const;

export const HOMEWORLD_ORGANIZATIONS = [
  { id: "first-blood-houses", name: "Maisons du Premier Sang", description: "Des maisons attachées aux traditions, sans parler pour tous les Yautja." },
  { id: "forge-circle", name: "Cercle des Forges", description: "Une institution d'artisans et de savoir-faire." },
  { id: "reserve-keepers", name: "Gardiens des Réserves", description: "Des gardiens préoccupés par les terrains de chasse." },
  { id: "star-navigators", name: "Navigateurs des Étoiles", description: "Des explorateurs et les équipes des quais." },
  { id: "throne-court", name: "Cour du Trône", description: "La cour de cette cité recherche la stabilité." },
  { id: "exile-network", name: "Réseau des Bannis", description: "Un réseau partagé entre entraide et opportunisme, sans affiliation imposée." },
] as const;
export const HOMEWORLD_NPCS = [
  { id: "dock-officer", name: "Officier des quais", role: "Amarrage", organizationId: "star-navigators", greeting: "Ton sas reste libre. Un convoi a rapporté une prise dont la marque devrait être scellée à la Maison de la Mémoire." },
  { id: "market-artisan", name: "Artisane du marché", role: "Équipement", organizationId: "forge-circle", greeting: "Les marques de clan règlent une commande ; l'honneur ne se dépense pas. Prépare tes armes ici ou à bord." },
  { id: "forge-artisan", name: "Maîtresse des parures", role: "Forge", organizationId: "forge-circle", greeting: "Une parure montre tes choix. Les grandes commandes de matériaux ne sont pas encore ouvertes." },
  { id: "undercity-witness", name: "Témoin des galeries", role: "Témoin", organizationId: "exile-network", greeting: "Les bannis ne racontent pas tous la même histoire. Compare le registre avant d'accuser quelqu'un." },
  { id: "trophy-herald", name: "Héraut des prises", role: "Reconnaissance", organizationId: "first-blood-houses", greeting: "Montre ce que tu as réellement rapporté. Une prise étrangère ne deviendra pas ton exploit." },
  { id: "terrace-instructor", name: "Instructeur des terrasses", role: "Entraînement", organizationId: "reserve-keepers", greeting: "La maîtrise précède le rang. Les exercices de ton vaisseau restent accessibles ici." },
  { id: "clan-healer", name: "Soigneuse des délégations", role: "Soins", organizationId: "reserve-keepers", greeting: "Les soins ne demandent aucune allégeance. Tes rites antérieurs restent reconnus." },
  { id: "enforcer-captain", name: "Capitaine des Enforcers", role: "Preuves", organizationId: "throne-court", greeting: "Nous recevons des preuves, pas un coupable choisi à l'avance. Le roi peut entendre un dossier étayé." },
  { id: "memory-keeper", name: "Conservatrice des marques", role: "Archives", organizationId: "first-blood-houses", greeting: "Chaque marque possède un registre. Observe d'abord le trophée arrivé aux quais." },
  { id: "arena-steward", name: "Intendant des arènes", role: "THE PIT", organizationId: "first-blood-houses", greeting: "Les Chroniques sont des reconstitutions. Aucun duel n'est exigé pour rencontrer le roi." },
  { id: "rite-keeper", name: "Gardienne des rites", role: "Rites", organizationId: "first-blood-houses", greeting: "Un rang mérité ne s'efface pas quand tu changes de monde. Les anciens rites demeurent dans tes archives." },
  { id: "hunt-king", name: "Roi de la Chasse", role: "Souverain de la cité", organizationId: "throne-court", greeting: "Apporte la marque, le registre et le témoignage. Nous jugerons les preuves sans confondre cette cité avec tous les clans." },
] as const;
export const HOMEWORLD_EVIDENCE: readonly { id: HomeworldEvidenceId; label: string; description: string }[] = [
  { id: "suspect-trophy", label: "Marque du trophée suspect", description: "La prise arrivée aux quais porte une marque de conservation. Tu en fais un relevé sans t'attribuer ce trophée." },
  { id: "memory-register", label: "Registre du mausolée", description: "Le registre associe cette marque à une prise conservée dans un mausolée scellé. Cette contradiction demande un témoignage." },
  { id: "undercity-testimony", label: "Témoignage des galeries", description: "Le témoin confirme un transfert par les quais secondaires. Son récit complète le dossier, sans établir seul la culpabilité de quelqu'un." },
];
export const HOMEWORLD_REGIONS = [
  { id: "ash-marches", name: "Marches de Cendre", description: "Cendres, pistes de convois et brouteur cuirassé territorial.", sourceCompleteness: "complete-description" },
  { id: "glass-desert", name: "Désert de Verre", description: "Plaques vitrifiées et prédateur fouisseur sensible aux vibrations.", sourceCompleteness: "complete-description" },
  { id: "pillar-jungle", name: "Jungle des Piliers", description: "Itinéraires élevés et traqueur hexapode utilisant les mêmes perchoirs.", sourceCompleteness: "complete-description" },
  { id: "luminous-marshes", name: "Marais Luminescents", description: "Pistage par les rides de l'eau, racines et disparitions.", sourceCompleteness: "complete-description" },
  { id: "storm-chain", name: "Chaîne des Orages", description: "Ravins, fenêtres de vent et planeur cuirassé.", sourceCompleteness: "complete-description" },
  { id: "leviathan-coast", name: "Côte des Léviathans", description: "Marées, grottes côtières et combat depuis le rivage.", sourceCompleteness: "complete-description" },
  { id: "thermal-caves", name: "Grottes Thermiques", description: "Vapeurs, signatures brouillées et indices visuels des vibrations.", sourceCompleteness: "complete-description" },
  { id: "cold-crown", name: "Couronne Froide", description: "Très hauts massifs, glace et vestiges d'expéditions. Un carnivore isolé thermiquement laisse des indices physiques ; la préparation remplace une jauge de température punitive.", sourceCompleteness: "complete-description" },
  { id: "first-city-ruins", name: "Ruines de la Première Cité", description: "Site patrimonial, installations récentes suspectes, mécanismes de chasse, archives scellées, sentinelles et pièges.", sourceCompleteness: "complete-description" },
  { id: "forbidden-reserve", name: "Réserve Interdite", description: "Stations d'observation et confinement de créatures rapportées d'expédition. Les éventuels xénomorphes ne sont pas la faune ordinaire du monde natal.", sourceCompleteness: "complete-description" },
].map((region) => ({ ...region, status: region.id === "ash-marches" ? "playable-introduction" as const : "not-playable" as const }));

/** Complete recovered outline, explicitly separate from the playable introductory dossier. */
export const HOMEWORLD_CAMPAIGN_ACTS = [
  { id: "impossible-trophy", title: "Le Trophée impossible", description: "Examiner la cargaison, interroger les habitants et chercher le transport d'origine dans les Marches de Cendre." },
  { id: "silent-reserves", title: "Les Réserves silencieuses", description: "Enquêter sur les disparitions, les proies détournées et la traçabilité clandestine pour obtenir une audience personnelle." },
  { id: "forged-blood", title: "Le Sang falsifié", description: "Défendre un dossier contre une accusation falsifiée ; être accusé ne rend pas automatiquement Bad Blood." },
  { id: "fractured-throne", title: "Le Trône fracturé", description: "Le Porte-Cendres provoque une crise. Les alliances déterminent les soutiens et la priorité de protection d'un quartier." },
  { id: "last-hunt", title: "La Dernière Chasse", description: "Déjouer une chasse royale piégée, conserver les preuves et choisir affrontement, capture ou exposition publique. Aucun couronnement universel automatique." },
].map((act) => ({ ...act, status: "not-playable" as const }));

export interface HomeworldPoint { id: string; label: string; kind: "ship" | "service" | "npc" | "evidence" | "audience" | "region"; districtId: string; x: number; y: number; description: string; service?: HomeworldService; npcId?: string; evidenceId?: HomeworldEvidenceId; regionId?: string }
const servicePoint = (id: string, label: string, districtId: string, x: number, y: number, service: HomeworldService, npcId: string): HomeworldPoint => ({ id, label, districtId, x, y, service, npcId, kind: "service", description: "Service partagé avec ton vaisseau : ton équipement et ta progression sont conservés." });
const regionDoors = [
  { districtId: "port", x: 1080, y: 1500 },
  { districtId: "market", x: 2180, y: 1500 },
  { districtId: "terraces", x: 2180, y: 1000 },
  { districtId: "clans", x: 3380, y: 1000 },
  { districtId: "temple", x: 3380, y: 500 },
  { districtId: "esplanade", x: 980, y: 1000 },
  { districtId: "forges", x: 3380, y: 1500 },
  { districtId: "citadel", x: 4660, y: 500 },
  { districtId: "arenas", x: 2180, y: 500 },
  { districtId: "enforcers", x: 4660, y: 1000 },
];
export const HOMEWORLD_POINTS: readonly HomeworldPoint[] = [
  { id: "personal-ship", label: "Sas de ton vaisseau", kind: "ship", districtId: "port", x: 240, y: 1_500, description: "Rentrer à bord sans quitter ta campagne ni perdre ton dossier." },
  { id: "dock-officer-point", label: "Officier des quais", kind: "npc", districtId: "port", x: 440, y: 1_500, npcId: "dock-officer", description: "Écouter les nouvelles du convoi." },
  { id: "suspect-trophy-point", label: "Trophée du convoi", kind: "evidence", districtId: "port", x: 960, y: 1_500, evidenceId: "suspect-trophy", description: "Inspecter la marque sans prendre possession du trophée." },
  servicePoint("market-service", "Échoppe d'équipement", "market", 1_700, 1_500, "armory", "market-artisan"),
  servicePoint("forge-service", "Atelier des parures", "forges", 3_000, 1_500, "customization", "forge-artisan"),
  { id: "witness-point", label: "Témoin des galeries", kind: "evidence", districtId: "undercity", x: 4_400, y: 1_500, evidenceId: "undercity-testimony", npcId: "undercity-witness", description: "Comparer le registre et recueillir le témoignage avant de choisir la suite." },
  servicePoint("trophy-service", "Présentation des prises", "esplanade", 450, 1_000, "trophies", "trophy-herald"),
  servicePoint("training-service", "Parcours d'entraînement", "terraces", 1_700, 1_000, "training", "terrace-instructor"),
  servicePoint("medbay-service", "Maison des soins", "clans", 3_000, 1_000, "medbay", "clan-healer"),
  { id: "enforcer-point", label: "Capitaine des Enforcers", kind: "service", service: "justice", districtId: "enforcers", x: 4_400, y: 1_000, npcId: "enforcer-captain", description: "Comprendre pourquoi une audience requiert plusieurs preuves." },
  { id: "memory-register-point", label: "Registre du mausolée", kind: "evidence", districtId: "memory", x: 450, y: 500, evidenceId: "memory-register", npcId: "memory-keeper", description: "Comparer la marque relevée aux quais avec les archives." },
  servicePoint("memory-service", "Archives de chasse", "memory", 950, 500, "codex", "memory-keeper"),
  servicePoint("pit-service", "Entrée THE PIT", "arenas", 1_700, 500, "pit", "arena-steward"),
  { id: "temple-point", label: "Gardienne des rites", kind: "npc", districtId: "temple", x: 3_000, y: 500, npcId: "rite-keeper", description: "Faire reconnaître ton rang actuel, sans rite ni serment obligatoire." },
  { id: "audience-point", label: "Audience du Roi de la Chasse", kind: "audience", districtId: "citadel", x: 4_400, y: 500, npcId: "hunt-king", description: "Présenter le dossier et la décision expliquée au témoin." },
  ...HOMEWORLD_REGIONS.map((region, index): HomeworldPoint => ({ id: `region-${region.id}`, label: region.name, kind: "region", ...regionDoors[index], regionId: region.id, description: region.id === "ash-marches" ? "Suivre le convoi dans les cendres, écarter la fausse piste et rapporter une preuve au port." : `${region.description} Région à produire : aucune chasse accessible ici.` })),
];

export interface HomeworldProgress { version: 1; expeditions: { "ash-marches": HomeworldExpeditionProof | null }; visitedDistrictIds: string[]; evidenceIds: HomeworldEvidenceId[]; greetedNpcIds: string[]; witnessChoice: HomeworldWitnessChoice | null; audienceOutcome: HomeworldAudienceOutcome | null; relations: Record<string, number> }
const record = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const finite = (value: unknown, fallback = 0) => typeof value === "number" && Number.isFinite(value) ? value : fallback;
const choices: readonly HomeworldWitnessChoice[] = ["protect", "restitution", "investigate"];
const outcomes: Record<HomeworldWitnessChoice, HomeworldAudienceOutcome> = { protect: "protected-witness", restitution: "ordered-restitution", investigate: "continued-investigation" };
export function defaultHomeworldProgress(): HomeworldProgress { return { version: 1, expeditions: { "ash-marches": null }, visitedDistrictIds: [], evidenceIds: [], greetedNpcIds: [], witnessChoice: null, audienceOutcome: null, relations: Object.fromEntries(HOMEWORLD_ORGANIZATIONS.map(({ id }) => [id, 0])) }; }
export function normalizeHomeworldProgress(value: unknown): HomeworldProgress {
  const clean = defaultHomeworldProgress();
  if (!record(value) || value.version !== 1) return clean;
  if (record(value.expeditions)) clean.expeditions["ash-marches"] = normalizeHomeworldExpeditionProof(value.expeditions["ash-marches"]);
  const ids = (candidate: unknown, allowed: readonly string[]) => Array.isArray(candidate) ? allowed.filter((id) => candidate.includes(id)) : [];
  clean.visitedDistrictIds = ids(value.visitedDistrictIds, HOMEWORLD_DISTRICTS.map(({ id }) => id));
  clean.greetedNpcIds = ids(value.greetedNpcIds, HOMEWORLD_NPCS.map(({ id }) => id));
  // Later evidence never survives without its prerequisites, including malformed imports.
  const evidence = ids(value.evidenceIds, HOMEWORLD_EVIDENCE.map(({ id }) => id));
  for (const item of HOMEWORLD_EVIDENCE) { if (!evidence.includes(item.id)) break; clean.evidenceIds.push(item.id); }
  if (clean.evidenceIds.length === 3 && choices.includes(value.witnessChoice as HomeworldWitnessChoice)) clean.witnessChoice = value.witnessChoice as HomeworldWitnessChoice;
  if (clean.witnessChoice && value.audienceOutcome === outcomes[clean.witnessChoice]) clean.audienceOutcome = outcomes[clean.witnessChoice];
  if (record(value.relations)) for (const { id } of HOMEWORLD_ORGANIZATIONS) clean.relations[id] = clamp(Math.trunc(finite(value.relations[id])), -100, 100);
  return clean;
}
export type HomeworldAction = { type: "visit"; districtId: string } | { type: "greet"; npcId: string } | { type: "inspect"; evidenceId: HomeworldEvidenceId } | { type: "choose-witness"; choice: HomeworldWitnessChoice } | { type: "audience" };
export interface HomeworldActionResult { progress: HomeworldProgress; changed: boolean; ok: boolean; message: string }
export const HOMEWORLD_WITNESS_CHOICES: readonly { id: HomeworldWitnessChoice; label: string; description: string }[] = [
  { id: "protect", label: "Protéger le témoin", description: "Demander sa protection sans révéler son refuge. Réseau des Bannis +3 ; Cour du Trône -1. Ce choix engage la première audience." },
  { id: "restitution", label: "Demander la restitution", description: "Présenter le transfert et demander la restitution de la prise au mausolée. Maisons du Premier Sang +3 ; Réseau des Bannis -1. Ce choix engage la première audience." },
  { id: "investigate", label: "Poursuivre l'enquête", description: "Maintenir le doute et demander une vérification sans désigner de coupable. Cour du Trône +2 ; Navigateurs des Étoiles +1. Ce choix engage la première audience." },
];
export function applyHomeworldAction(value: HomeworldProgress, action: HomeworldAction, context: { rankId: RankId; ownedTrophyCount: number }): HomeworldActionResult {
  const progress = normalizeHomeworldProgress(value);
  const reply = (ok: boolean, changed: boolean, message: string): HomeworldActionResult => ({ progress, ok, changed, message });
  switch (action.type) {
    case "visit": {
      const destination = HOMEWORLD_DISTRICTS.find(({ id }) => id === action.districtId);
      if (!destination) return reply(false, false, "Quartier inconnu.");
      if (progress.visitedDistrictIds.includes(destination.id)) return reply(true, false, destination.name);
      progress.visitedDistrictIds.push(destination.id); return reply(true, true, `Quartier découvert : ${destination.name}.`);
    }
    case "greet": {
      const npc = HOMEWORLD_NPCS.find(({ id }) => id === action.npcId);
      if (!npc) return reply(false, false, "Interlocuteur inconnu.");
      const first = !progress.greetedNpcIds.includes(npc.id);
      if (first) { progress.greetedNpcIds.push(npc.id); progress.relations[npc.organizationId] = clamp(progress.relations[npc.organizationId] + 1, -100, 100); }
      const rank = context.rankId === "elder" ? " Ton rang Elder est reconnu." : context.rankId === "elite" ? " Ton rang Elite est reconnu." : "";
      const trophies = npc.id === "trophy-herald" ? ` Tes archives contiennent ${Math.max(0, Math.trunc(finite(context.ownedTrophyCount)))} prise(s) personnelle(s).` : "";
      return reply(true, first, npc.greeting + rank + trophies);
    }
    case "inspect": {
      const index = HOMEWORLD_EVIDENCE.findIndex(({ id }) => id === action.evidenceId);
      if (index < 0) return reply(false, false, "Preuve inconnue.");
      if (progress.evidenceIds.includes(action.evidenceId)) return reply(true, false, "Cette preuve figure déjà dans ton dossier.");
      if (progress.evidenceIds.length !== index) return reply(false, false, index === 1 ? "Relève d'abord la marque du trophée arrivé au Port des Chasses." : "Compare d'abord la marque au registre de la Maison de la Mémoire.");
      progress.evidenceIds.push(action.evidenceId); return reply(true, true, HOMEWORLD_EVIDENCE[index].description);
    }
    case "choose-witness": {
      if (!choices.includes(action.choice)) return reply(false, false, "Décision inconnue.");
      if (progress.evidenceIds.length < 3) return reply(false, false, "Recueille la marque, le registre et le témoignage avant de décider.");
      if (progress.witnessChoice) return reply(progress.witnessChoice === action.choice, false, "Ta décision est déjà inscrite au dossier ; les conséquences ne sont pas appliquées une seconde fois.");
      progress.witnessChoice = action.choice;
      const changes: Record<HomeworldWitnessChoice, [string, number][]> = { protect: [["exile-network", 3], ["throne-court", -1]], restitution: [["first-blood-houses", 3], ["exile-network", -1]], investigate: [["throne-court", 2], ["star-navigators", 1]] };
      for (const [id, delta] of changes[action.choice]) progress.relations[id] = clamp(progress.relations[id] + delta, -100, 100);
      return reply(true, true, "Ta décision et ses conséquences sont inscrites. Présente maintenant le dossier au Roi de la Chasse.");
    }
    case "audience": {
      if (progress.audienceOutcome) return reply(true, false, "Cette première audience a déjà eu lieu. La suite de La Couronne de Cendres reste à produire.");
      if (progress.evidenceIds.length < 3 || !progress.witnessChoice) return reply(false, false, `${context.rankId === "elder" ? "Ton rang Elder est reconnu, mais le" : "Le"} roi demande un dossier : marque, registre, témoignage et décision expliquée.`);
      progress.audienceOutcome = outcomes[progress.witnessChoice];
      const text = { protect: "Le roi reçoit le dossier sans révéler le refuge et ordonne la protection du témoin.", restitution: "Le roi ordonne que la prise soit restituée au mausolée après vérification, sans condamner le témoin sur sa seule parole.", investigate: "Le roi demande une vérification des transferts et réserve son jugement. Aucun coupable n'est désigné." };
      return reply(true, true, `${text[progress.witnessChoice]} Première audience accomplie ; l'enquête générale n'est pas résolue.`);
    }
    default: return reply(false, false, "Action inconnue.");
  }
}

export interface HomeworldActor { x: number; y: number; vx: number; vy: number; grounded: boolean; facing: -1 | 1 }
export interface HomeworldInput { moveX: number; climb: number; jumpPressed: boolean }
export function createHomeworldActor(): HomeworldActor { return { x: 300, y: 1_500, vx: 0, vy: 0, grounded: true, facing: 1 }; }
const landingAt = (x: number, y: number) => HOMEWORLD_PLATFORMS.find((platform) => x >= platform.x && x <= platform.x + platform.width && Math.abs(y - platform.y) < 0.01);
function advanceActor(current: HomeworldActor, input: HomeworldInput, dt: number): HomeworldActor {
  const horizontal = clamp(finite(input.moveX), -1, 1);
  const vertical = clamp(finite(input.climb), -1, 1);
  let x = clamp(current.x + horizontal * HOMEWORLD_ACTOR.walkSpeed * dt, 124, 4_676);
  let y = current.y;
  let vy = current.vy;
  let grounded = false;
  const lift = HOMEWORLD_LIFTS.find((item) => Math.abs(current.x - item.x) <= item.halfWidth && current.y >= item.top && current.y <= item.bottom);
  const onLanding = Boolean(landingAt(current.x, current.y));
  // Horizontal input exits a landing. Up/down alone starts a ride; releasing controls holds the cabin.
  const riding = lift && !input.jumpPressed && !(horizontal !== 0 && onLanding) && (vertical !== 0 || (!onLanding && horizontal === 0 && current.vy === 0));
  if (riding) {
    x = lift.x;
    y = clamp(current.y + vertical * HOMEWORLD_ACTOR.liftSpeed * dt, lift.top, lift.bottom);
    vy = 0; grounded = Boolean(landingAt(x, y));
  } else {
    if (input.jumpPressed && (onLanding || (lift && current.vy === 0))) vy = -HOMEWORLD_ACTOR.jumpSpeed;
    vy += HOMEWORLD_ACTOR.gravity * dt;
    const intendedY = current.y + vy * dt;
    y = intendedY;
    if (vy >= 0) for (const platform of HOMEWORLD_PLATFORMS) {
      if (x + HOMEWORLD_ACTOR.halfWidth > platform.x && x - HOMEWORLD_ACTOR.halfWidth < platform.x + platform.width && current.y <= platform.y + 0.01 && intendedY >= platform.y) { y = Math.min(y, platform.y); grounded = true; }
    }
    if (grounded) vy = 0;
    y = clamp(y, HOMEWORLD_ACTOR.height, 1_500);
  }
  return { x, y, vx: (x - current.x) / dt, vy, grounded, facing: horizontal === 0 ? current.facing : horizontal < 0 ? -1 : 1 };
}
/** Bounded substeps prevent long-frame falls and preserve all authored one-way landings. */
export function stepHomeworldActor(actor: HomeworldActor, input: HomeworldInput, elapsedSeconds: number): HomeworldActor {
  let remaining = clamp(finite(elapsedSeconds), 0, 1 / 30);
  if (remaining === 0) return actor;
  let next: HomeworldActor = { x: clamp(finite(actor.x, 300), 124, 4_676), y: clamp(finite(actor.y, 1_500), HOMEWORLD_ACTOR.height, 1_500), vx: finite(actor.vx), vy: clamp(finite(actor.vy), -600, 1_400), grounded: actor.grounded === true, facing: actor.facing === -1 ? -1 : 1 };
  let jumpPressed = input.jumpPressed;
  while (remaining > 0.000001) { const dt = Math.min(remaining, HOMEWORLD_ACTOR.tickSeconds); next = advanceActor(next, { ...input, jumpPressed }, dt); jumpPressed = false; remaining -= dt; }
  return next;
}
export function nearestHomeworldPoint(actor: Pick<HomeworldActor, "x" | "y">): HomeworldPoint | null {
  if (!Number.isFinite(actor.x) || !Number.isFinite(actor.y)) return null;
  let nearest: HomeworldPoint | null = null;
  let distance = 110;
  for (const point of HOMEWORLD_POINTS) { const candidate = Math.hypot(actor.x - point.x, (actor.y - point.y) * 1.5); if (candidate < distance) { distance = candidate; nearest = point; } }
  return nearest;
}
export function districtAtHomeworldActor(actor: Pick<HomeworldActor, "x" | "y">): HomeworldDistrict | null {
  return HOMEWORLD_DISTRICTS.find((item) => actor.x >= item.x && actor.x <= item.x + item.width && actor.y >= item.y && actor.y <= item.floorY + 1) ?? null;
}
