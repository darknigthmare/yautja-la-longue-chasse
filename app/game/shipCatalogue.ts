import type { MissionId, SaveGame } from "./types";

/** Stable identifiers persisted in the ship-progression sidecar. */
export type ShipId =
  | "classic-predator-spaceship"
  | "lost-tribe-spaceship"
  | "avp-predator-mothership"
  | "avp-predator-drop-pod"
  | "avpr-scout-ship"
  | "wolf-ship"
  | "game-preserve-ship"
  | "fugitive-spaceship"
  | "upgrade-spaceship"
  | "feral-spaceship"
  | "feral-clan-ships"
  | "brute-jotunn-scout"
  | "wwii-cyborg-pilot-ship"
  | "collector-ship"
  | "grendel-king-ship"
  | "kwei-ship"
  | "emergency-escape-pod"
  | "dek-mother-ship"
  | "chicken-ship"
  | "royal-predator-ship"
  | "hunting-grounds-ship"
  | "avp-2010-mothership"
  | "evolution-scout-ship"
  | "huntmaster-ship"
  | "yautja-gunship"
  | "blade-fighter"
  | "fortnite-predator-ship"
  | "big-game-saucer"
  | "cold-war-ship"
  | "bad-blood-ship"
  | "enforcer-ship"
  | "bullet-ship"
  | "safari-ship"
  | "golden-mothership"
  | "predator-dropship"
  | "predator-shuttle"
  | "hook-predator-ship"
  | "gotham-city-ship"
  | "gotham-enforcer-ship"
  | "new-york-enforcer-ship"
  | "dog-ship"
  | "nedtesei"
  | "shell-ship"
  | "lunar-mothership"
  | "cursed-earth-ship"
  | "advanced-predator-ship"
  | "predator-fleet"
  | "project-original-avp-predator-mothership"
  | "project-original-avp-predator-drop-pod"
  | "project-original-avpr-scout-ship"
  | "project-original-wolf-ship"
  | "project-original-fugitive-spaceship"
  | "project-original-upgrade-spaceship"
  | "project-original-feral-spaceship";

export type ShipMedia =
  | "film"
  | "game"
  | "comic"
  | "novel"
  | "collectible"
  | "project";

export type ShipCanonTier =
  | "screen"
  | "licensed-game"
  | "expanded-universe"
  | "crossover"
  | "literary"
  | "project-original";

export type ShipVisualConfidence =
  | "reference-locked"
  | "source-guided-approximation"
  | "silhouette-inferred"
  | "text-inspired"
  | "project-original";

export type ShipRole =
  | "scout"
  | "mothership"
  | "carrier"
  | "recon"
  | "raider"
  | "drop-ship"
  | "escape-pod"
  | "fighter"
  | "shuttle"
  | "glider"
  | "fleet";

export type ShipCatalogueKind =
  | "identity"
  | "class"
  | "variant"
  | "auxiliary";

export interface ShipUnlockRequirements {
  minimumHonor: number;
  minimumCompletedMissions: number;
  requiredMissionIds: readonly MissionId[];
  minimumTrophies: number;
}

export interface ShipReferenceSlot {
  id: string;
  status: "pending" | "verified";
  medium: ShipMedia | "concept-art";
  title: string;
  url: string | null;
  note: string;
}

export type ShipProfileRuntimeAssetPath =
  | `/game/ships/v12/${ShipId}.webp`
  | `/game/ships/v14/${ShipId}.webp`;

export type ShipTopRuntimeAssetPath =
  | `/game/ships/v13/${ShipId}-top.webp`
  | `/game/ships/v14/${ShipId}-top.webp`;

export interface ShipSupplementalVisual {
  id: "v14-non-canonical-approximation";
  label: string;
  status: "approximation";
  profileRuntimeAssetPath: ShipProfileRuntimeAssetPath;
  topRuntimeAssetPath: ShipTopRuntimeAssetPath;
  generationPromptIds: readonly string[];
  generationNotesPath:
    | "art-source/v13/ships-top/README.md"
    | "art-source/v14/ships/README.md";
  note: string;
}

export interface ShipVisualProvenance {
  status: "placeholder" | "references-locked" | "project-original";
  primaryAssetVersion: "V12/V13" | "V14";
  /** Highest-priority profile or three-quarter render used by the hangar. */
  runtimeAssetPath: ShipProfileRuntimeAssetPath;
  /** Highest-priority 90-degree dorsal render used by navigation. */
  topRuntimeAssetPath: ShipTopRuntimeAssetPath;
  generationPromptIds: readonly string[];
  generationNotesPath:
    | "art-source/v13/ships-top/README.md"
    | "art-source/v14/ships/README.md";
  assetManifestPath: "art-source/v14/ships/ship-asset-manifest.json" | null;
  supplementalAssets: readonly ShipSupplementalVisual[];
  referenceSlots: readonly ShipReferenceSlot[];
}

/**
 * Curated screen identities whose V14 pair takes priority over the historical
 * project-original V12/V13 interpretation.
 */
export const V14_CANONICAL_SHIP_IDS = [
  "avp-predator-mothership",
  "avpr-scout-ship",
  "wolf-ship",
  "fugitive-spaceship",
  "upgrade-spaceship",
  "feral-spaceship",
  "avp-predator-drop-pod",
] as const satisfies readonly ShipId[];

/** All generated pairs, including studies rejected as canonical replacements. */
export const V14_GENERATED_SHIP_IDS = [
  ...V14_CANONICAL_SHIP_IDS,
  "game-preserve-ship",
] as const satisfies readonly ShipId[];

export const V14_APPROXIMATION_SHIP_IDS = [
  "game-preserve-ship",
] as const satisfies readonly ShipId[];

/**
 * Historical V12/V13 interpretations promoted to autonomous, explicitly
 * non-canonical project creations. Their runtime files are reused in place.
 */
export const PROJECT_ORIGINAL_SHIP_IDS = [
  "project-original-avp-predator-mothership",
  "project-original-avpr-scout-ship",
  "project-original-wolf-ship",
  "project-original-fugitive-spaceship",
  "project-original-upgrade-spaceship",
  "project-original-feral-spaceship",
  "project-original-avp-predator-drop-pod",
] as const satisfies readonly ShipId[];

export type ProjectOriginalShipId =
  (typeof PROJECT_ORIGINAL_SHIP_IDS)[number];

type V14CanonicalShipId = (typeof V14_CANONICAL_SHIP_IDS)[number];

export const PROJECT_ORIGINAL_ASSET_SOURCE_BY_ID = Object.freeze({
  "project-original-avp-predator-mothership": "avp-predator-mothership",
  "project-original-avpr-scout-ship": "avpr-scout-ship",
  "project-original-wolf-ship": "wolf-ship",
  "project-original-fugitive-spaceship": "fugitive-spaceship",
  "project-original-upgrade-spaceship": "upgrade-spaceship",
  "project-original-feral-spaceship": "feral-spaceship",
  "project-original-avp-predator-drop-pod": "avp-predator-drop-pod",
}) satisfies Readonly<Record<ProjectOriginalShipId, V14CanonicalShipId>>;

const V14_APPROXIMATION_SHIP_ID_SET = new Set<ShipId>(
  V14_APPROXIMATION_SHIP_IDS,
);

const V14_CANONICAL_SHIP_ID_SET = new Set<ShipId>(
  V14_CANONICAL_SHIP_IDS,
);

const PROJECT_ORIGINAL_SHIP_ID_SET = new Set<ShipId>(
  PROJECT_ORIGINAL_SHIP_IDS,
);

export function hasV14CanonicalShipAssets(shipId: ShipId): boolean {
  return V14_CANONICAL_SHIP_ID_SET.has(shipId);
}

/** Resolve the existing master/runtime stem without duplicating V12/V13 files. */
export function shipAssetSourceId(shipId: ShipId): ShipId {
  return PROJECT_ORIGINAL_SHIP_ID_SET.has(shipId)
    ? PROJECT_ORIGINAL_ASSET_SOURCE_BY_ID[shipId as ProjectOriginalShipId]
    : shipId;
}

export function shipProfileAssetPath(
  shipId: ShipId,
): ShipProfileRuntimeAssetPath {
  const assetSourceId = shipAssetSourceId(shipId);
  return hasV14CanonicalShipAssets(shipId)
    ? `/game/ships/v14/${shipId}.webp`
    : `/game/ships/v12/${assetSourceId}.webp`;
}

export function shipTopAssetPath(shipId: ShipId): ShipTopRuntimeAssetPath {
  const assetSourceId = shipAssetSourceId(shipId);
  return hasV14CanonicalShipAssets(shipId)
    ? `/game/ships/v14/${shipId}-top.webp`
    : `/game/ships/v13/${assetSourceId}-top.webp`;
}

export interface ShipCatalogueEntry {
  id: ShipId;
  catalogueOrder: number;
  media: ShipMedia;
  canonTier: ShipCanonTier;
  visualConfidence: ShipVisualConfidence;
  kind: ShipCatalogueKind;
  selectable: boolean;
  projectOriginal: boolean;
  inspirationShipId: ShipId | null;
  aliases: readonly string[];
  name: string;
  shortName: string;
  role: ShipRole;
  originLabel: string;
  description: string;
  deckNote: string;
  unlock: ShipUnlockRequirements;
  provenance: ShipVisualProvenance;
}

export interface ShipRequirementProgress {
  id: "honor" | "missions" | "required-mission" | "trophies";
  label: string;
  current: number;
  target: number;
  met: boolean;
  missionId?: MissionId;
}

export interface ShipAvailability {
  shipId: ShipId;
  selectable: boolean;
  available: boolean;
  permanentlyUnlocked: boolean;
  requirementsMet: boolean;
  requirements: readonly ShipRequirementProgress[];
  unmetLabels: readonly string[];
}

interface ShipRosterSeed {
  id: ShipId;
  media: Exclude<ShipMedia, "project">;
  name: string;
  shortName: string;
  role: ShipRole;
  originLabel: string;
  sourceAnchor: string;
  sourceUrl?: string;
  description: string;
}

export const DEFAULT_SHIP_ID: ShipId = "classic-predator-spaceship";
export const SHIP_CATALOGUE_PAGE_SIZE = 8;
export const SHIP_REFERENCE_INDEX_URL =
  "https://www.avpcentral.com/predator-spaceships";

/**
 * AVP Central's overview was updated on 6 June 2026. Lost Tribe Interior is
 * intentionally absent: it is an environment reference, not a separate hull.
 */
const SHIP_ROSTER = [
  { id: "classic-predator-spaceship", media: "film", name: "Vaisseau Predator classique", shortName: "Classique", role: "scout", originLabel: "Predator", sourceAnchor: "classic-predator-spaceship", description: "Silhouette personnelle classique à coque pisciforme et déploiement orbital." },
  { id: "lost-tribe-spaceship", media: "film", name: "Vaisseau de la Lost Tribe", shortName: "Lost Tribe", role: "carrier", originLabel: "Predator 2", sourceAnchor: "lost-tribe-predator-spaceship", description: "Long bâtiment de clan dissimulé sous Los Angeles pendant la chasse du City Hunter." },
  { id: "avp-predator-mothership", media: "film", name: "Vaisseau-mère AVP", shortName: "Mothership AVP", role: "mothership", originLabel: "Alien vs. Predator", sourceAnchor: "predator-mothership", description: "Vaisseau-mère de plus de quatre cents mètres portant navettes et capsules." },
  { id: "avp-predator-drop-pod", media: "film", name: "Capsule de largage AVP", shortName: "Drop Pod AVP", role: "drop-ship", originLabel: "Alien vs. Predator", sourceAnchor: "predator-drop-pod", description: "Capsule individuelle avec propulsion de précision et logement d’équipement." },
  { id: "avpr-scout-ship", media: "film", name: "Vaisseau éclaireur AVP:R", shortName: "Scout AVP:R", role: "scout", originLabel: "Aliens vs. Predator: Requiem", sourceAnchor: "predator-scout-ship", description: "Éclaireur de clan capable de s’arrimer au vaisseau-mère et d’émettre une détresse." },
  { id: "wolf-ship", media: "film", name: "Vaisseau de Wolf", shortName: "Wolf", role: "recon", originLabel: "Aliens vs. Predator: Requiem", sourceAnchor: "wolfs-ship", description: "Intercepteur militaire rapide utilisé par Wolf pour rejoindre la Terre." },
  { id: "game-preserve-ship", media: "film", name: "Vaisseau de la réserve de chasse", shortName: "Game Preserve", role: "scout", originLabel: "Predators", sourceAnchor: "game-preserve-ship", description: "Appareil à propulseurs verticaux lié au gantelet du Predator captif." },
  { id: "fugitive-spaceship", media: "film", name: "Vaisseau du Fugitive", shortName: "Fugitive", role: "recon", originLabel: "The Predator", sourceAnchor: "fugitive-predators-spaceship", description: "Vaisseau poursuivi ayant traversé un portail avant son crash en Amérique du Nord." },
  { id: "upgrade-spaceship", media: "film", name: "Vaisseau de l’Upgrade", shortName: "Upgrade", role: "raider", originLabel: "The Predator", sourceAnchor: "upgrade-predators-spaceship", description: "Appareil avancé de poursuite doté de camouflage et d’un champ défensif." },
  { id: "feral-spaceship", media: "film", name: "Vaisseau du Feral", shortName: "Feral", role: "drop-ship", originLabel: "Prey", sourceAnchor: "feral-predators-spaceship", description: "Vaisseau ancien qui dépose le Feral sur les Grandes Plaines en 1719." },
  { id: "feral-clan-ships", media: "film", name: "Vaisseaux du clan Feral", shortName: "Clan Feral", role: "fleet", originLabel: "Prey", sourceAnchor: "feral-predators-clan-ships", description: "Formation de trois vaisseaux visible dans le récit animé de fin." },
  { id: "brute-jotunn-scout", media: "film", name: "Scout du Brute Jotunn", shortName: "Jotunn Scout", role: "scout", originLabel: "Predator: Killer of Killers", sourceAnchor: "brute-jotunn-scout", sourceUrl: "https://avp.fandom.com/wiki/Scout_Ship", description: "Vaisseau éclaireur ayant transporté le Brute, aussi appelé Jotunn, en Scandinavie en 841." },
  { id: "wwii-cyborg-pilot-ship", media: "film", name: "Chasseur du pilote cyborg", shortName: "Cyborg WWII", role: "fighter", originLabel: "Predator: Killer of Killers", sourceAnchor: "world-war-2-cyborg-pilots-ship", description: "Chasseur de combat aérien équipé pour affronter les avions de la Seconde Guerre mondiale." },
  { id: "collector-ship", media: "film", name: "Vaisseau collecteur", shortName: "Collector", role: "carrier", originLabel: "Predator: Killer of Killers", sourceAnchor: "collector-ship", description: "Bâtiment massif d’enlèvement et de cryostase pour guerriers dignes." },
  { id: "grendel-king-ship", media: "film", name: "Vaisseau du Grendel King", shortName: "Grendel King", role: "fighter", originLabel: "Predator: Killer of Killers", sourceAnchor: "grendel-kings-ship", description: "Chasseur royal hérissé de pointes et de plaques osseuses." },
  { id: "kwei-ship", media: "film", name: "Vaisseau de Kwei", shortName: "Kwei", role: "scout", originLabel: "Predator: Badlands", sourceAnchor: "kweis-ship", description: "Coque en fer à cheval abritant trophées et projecteur planétaire." },
  { id: "emergency-escape-pod", media: "film", name: "Capsule d’évacuation de Dek", shortName: "Escape Pod", role: "escape-pod", originLabel: "Predator: Badlands", sourceAnchor: "emergency-escape-pod", description: "Sphère d’éjection fragile destinée à sauver un unique pilote." },
  { id: "dek-mother-ship", media: "film", name: "Vaisseau de la mère de Dek", shortName: "Mère de Dek", role: "mothership", originLabel: "Predator: Badlands", sourceAnchor: "dek-mothers-ship", description: "Grande silhouette intimidante associée à une Yautja de très haut rang." },
  { id: "chicken-ship", media: "game", name: "Chicken Ship", shortName: "Chicken", role: "scout", originLabel: "Aliens versus Predator (1999)", sourceAnchor: "chicken-ship", description: "Vaisseau capturé à Area 52, reconnaissable à sa silhouette inhabituelle." },
  { id: "royal-predator-ship", media: "game", name: "Vaisseau royal de Prince", shortName: "Royal", role: "recon", originLabel: "Aliens versus Predator 2", sourceAnchor: "royal-predator-ship", description: "Long vaisseau métallique en forme de lance utilisé par Prince sur LV-1201." },
  { id: "hunting-grounds-ship", media: "game", name: "Vaisseau Hunting Grounds", shortName: "Hunting Grounds", role: "scout", originLabel: "Predator: Hunting Grounds", sourceAnchor: "predator-hunting-grounds-ship", description: "Appareil métallique visible au début de l’entraînement du jeu." },
  { id: "avp-2010-mothership", media: "game", name: "Vaisseau-mère AVP 2010", shortName: "Mothership 2010", role: "mothership", originLabel: "Aliens vs. Predator (2010)", sourceAnchor: "the-mother-ship", sourceUrl: "https://www.avpgalaxy.net/predator/spacecrafts/#the-mother-ship", description: "Variante vidéoludique armée du vaisseau-mère utilisée lors du conflit sur BG-386." },
  { id: "evolution-scout-ship", media: "game", name: "Scout AVP: Evolution", shortName: "Evolution Scout", role: "scout", originLabel: "AVP: Evolution", sourceAnchor: "scout-ship", sourceUrl: "https://www.avpgalaxy.net/games/avp-evolution/", description: "Scout du Young Blood abattu à son arrivée sur LV-412." },
  { id: "huntmaster-ship", media: "game", name: "HuntMaster Ship", shortName: "HuntMaster", role: "carrier", originLabel: "Aliens versus Predator: Extinction", sourceAnchor: "huntmaster-ship", sourceUrl: "https://avp.fandom.com/wiki/HuntMaster_Ship", description: "Vaisseau de commandement orbital déployant les renforts d’une chasse de clan." },
  { id: "yautja-gunship", media: "game", name: "Yautja Gunship", shortName: "Gunship", role: "fighter", originLabel: "Aliens vs. Predator: Unleashed", sourceAnchor: "yautja-gunship", sourceUrl: "https://prodosgames.com/sites/prodosgames.com/files/files/avp_unleashed_1_1.pdf", description: "Canonnière de taille scout, renforcée et plus lourdement armée." },
  { id: "blade-fighter", media: "collectible", name: "Blade Fighter", shortName: "Blade Fighter", role: "fighter", originLabel: "Kenner / NECA Predator", sourceAnchor: "blade-fighter", sourceUrl: "https://necaonline.com/2014/12/closer-look-predator-blade-fighter-vehicle-and-packaging/", description: "Véhicule de combat antigravité du Viper Predator, classé en annexe car non interstellaire." },
  { id: "fortnite-predator-ship", media: "game", name: "Vaisseau Predator Fortnite", shortName: "Fortnite", role: "drop-ship", originLabel: "Fortnite", sourceAnchor: "predator-ship-in-fortnite", description: "Petite coque osseuse mêlant vaisseau classique et capsule individuelle." },
  { id: "big-game-saucer", media: "comic", name: "Soucoupe de Big Game", shortName: "Saucer", role: "scout", originLabel: "Predator: Big Game", sourceAnchor: "saucer", description: "Soucoupe écrasée au Nevada puis récupérée par l’armée américaine." },
  { id: "cold-war-ship", media: "comic", name: "Vaisseau Cold War", shortName: "Cold War", role: "carrier", originLabel: "Predator: Cold War", sourceAnchor: "cold-war-ship", description: "Vaisseau fuselé d’un groupe de chasse opérant en Sibérie." },
  { id: "bad-blood-ship", media: "comic", name: "Vaisseau Bad Blood", shortName: "Bad Blood", role: "raider", originLabel: "Predator: Bad Blood", sourceAnchor: "bad-blood-ship", description: "Coque en forme de crabe volée par un criminel Yautja." },
  { id: "enforcer-ship", media: "comic", name: "Vaisseau Enforcer", shortName: "Enforcer", role: "recon", originLabel: "Predator: Bad Blood", sourceAnchor: "enforcer-ship", description: "Appareil policier lourdement armé envoyé contre les Bad Bloods." },
  { id: "bullet-ship", media: "comic", name: "Bullet Ship", shortName: "Bullet", role: "scout", originLabel: "Predator: Nemesis", sourceAnchor: "bullet", description: "Long vaisseau en forme de projectile dissimulé sous Londres à l’époque victorienne." },
  { id: "safari-ship", media: "comic", name: "Vaisseau Safari", shortName: "Safari", role: "scout", originLabel: "Predator: The Pride at Nghasa", sourceAnchor: "safari-ship", description: "Variante métallique du vaisseau classique camouflée sous la végétation africaine." },
  { id: "golden-mothership", media: "comic", name: "Vaisseau-mère doré", shortName: "Golden Mothership", role: "mothership", originLabel: "Aliens vs. Predator", sourceAnchor: "golden-mothership", description: "Immense bâtiment de clan équipé de quatre moteurs, navettes et capsules." },
  { id: "predator-dropship", media: "comic", name: "Dropship Predator", shortName: "Dropship", role: "drop-ship", originLabel: "Aliens vs. Predator", sourceAnchor: "predator-dropship", description: "Transport non armé détaché d’un vaisseau-mère pour poser un groupe de chasse." },
  { id: "predator-shuttle", media: "comic", name: "Navette Predator", shortName: "Shuttle", role: "shuttle", originLabel: "Aliens vs. Predator: War", sourceAnchor: "predator-shuttle", description: "Navette blanche armée utilisée par Machiko Noguchi pour quitter un clan." },
  { id: "hook-predator-ship", media: "comic", name: "Vaisseau de Hook", shortName: "Hook", role: "raider", originLabel: "Alien vs. Predator: Thicker Than Blood", sourceAnchor: "hook-predators-ship", description: "Vaisseau violet et fuselé d’un ancien déshonoré devenu pirate spatial." },
  { id: "gotham-city-ship", media: "comic", name: "Vaisseau de Gotham", shortName: "Gotham", role: "carrier", originLabel: "Batman vs. Predator", sourceAnchor: "gotham-city-ship", description: "Grand vaisseau métallique à moteurs latéraux et puissant projecteur." },
  { id: "gotham-enforcer-ship", media: "comic", name: "Vaisseau Enforcer de Gotham", shortName: "Gotham Enforcer", role: "recon", originLabel: "Batman vs. Predator II", sourceAnchor: "gotham-city-enforcer-predator-ship", description: "Appareil submergé dans la baie avant une poursuite orbitale de Bad Blood." },
  { id: "new-york-enforcer-ship", media: "comic", name: "Glider Enforcer de New York", shortName: "NY Enforcer", role: "glider", originLabel: "Predator vs. Spider-Man", sourceAnchor: "new-york-enforcer-ship", description: "Petit glider ouvert permettant à trois Enforcers de manœuvrer entre les immeubles." },
  { id: "dog-ship", media: "comic", name: "Dog Ship", shortName: "Dog Ship", role: "scout", originLabel: "Aliens vs. Predator vs. Terminator", sourceAnchor: "dog-ship", description: "Petit appareil monoplace brun dont la proue évoque une tête canine." },
  { id: "nedtesei", media: "novel", name: "Ne’dtesei", shortName: "Ne’dtesei", role: "carrier", originLabel: "Aliens vs. Predator: Prey (roman)", sourceAnchor: "nedtesei", sourceUrl: "https://avp.fandom.com/wiki/Ne%27dtesei", description: "Vaisseau-mère du clan de Dachande, transportant une reine captive et des capsules d’ensemencement." },
  { id: "shell-ship", media: "novel", name: "Shell", shortName: "Shell", role: "scout", originLabel: "Aliens vs. Predator: Hunter’s Planet (roman)", sourceAnchor: "shell", sourceUrl: "https://avp.fandom.com/wiki/Light-Stepper", description: "Vaisseau du clan de Top-Knot dans Hunter’s Planet, sans extérieur canonique intégral publié." },
  { id: "lunar-mothership", media: "comic", name: "Vaisseau-mère lunaire", shortName: "Lunar Mothership", role: "mothership", originLabel: "Predator Kills the Marvel Universe", sourceAnchor: "lunar-mothership", sourceUrl: "https://avp.fandom.com/wiki/Predator_Kills_the_Marvel_Universe", description: "Vaisseau-mère du Predator King opérant depuis la face cachée de la Lune." },
  { id: "cursed-earth-ship", media: "comic", name: "Vaisseau de Cursed Earth", shortName: "Cursed Earth", role: "scout", originLabel: "Predator vs. Judge Dredd", sourceAnchor: "ship-cursed-earth", sourceUrl: "https://avp.fandom.com/wiki/Yautja_technology", description: "Appareil atmosphérique référencé lors de la chasse sur la Terre Maudite." },
  { id: "advanced-predator-ship", media: "comic", name: "Vaisseau Predator avancé", shortName: "Advanced", role: "recon", originLabel: "Predator (Marvel)", sourceAnchor: "advanced-predator-ship", description: "Vaisseau moderne aux lignes technologiques découvert par Theta sur X14432-8." },
  { id: "predator-fleet", media: "comic", name: "Flotte de vaisseaux Predator", shortName: "Fleet", role: "fleet", originLabel: "Aliens vs. Predator: Three World War", sourceAnchor: "fleet-of-predator-ships", description: "Formation militaire Yautja assemblée pour la guerre autour de Bunda." },
] as const satisfies readonly ShipRosterSeed[];

const AUXILIARY_SHIP_IDS = new Set<ShipId>([
  "avp-predator-drop-pod",
  "feral-clan-ships",
  "emergency-escape-pod",
  "blade-fighter",
  "new-york-enforcer-ship",
  "predator-fleet",
]);

const CLASS_SHIP_IDS = new Set<ShipId>([
  "classic-predator-spaceship",
  "avp-predator-mothership",
  "avpr-scout-ship",
  "collector-ship",
  "avp-2010-mothership",
  "huntmaster-ship",
  "yautja-gunship",
  "golden-mothership",
  "predator-dropship",
  "predator-shuttle",
  "lunar-mothership",
]);

const VARIANT_SHIP_IDS = new Set<ShipId>([
  "lost-tribe-spaceship",
  "brute-jotunn-scout",
  "wwii-cyborg-pilot-ship",
  "evolution-scout-ship",
  "hunting-grounds-ship",
  "fortnite-predator-ship",
  "advanced-predator-ship",
]);

const REFERENCE_LOCKED_SHIP_IDS = new Set<ShipId>(
  V14_CANONICAL_SHIP_IDS,
);

const TEXT_INSPIRED_SHIP_IDS = new Set<ShipId>([
  "huntmaster-ship",
  "yautja-gunship",
  "nedtesei",
  "shell-ship",
  "lunar-mothership",
  "cursed-earth-ship",
]);

const CROSSOVER_SHIP_IDS = new Set<ShipId>([
  "fortnite-predator-ship",
  "gotham-city-ship",
  "gotham-enforcer-ship",
  "new-york-enforcer-ship",
  "dog-ship",
  "lunar-mothership",
  "cursed-earth-ship",
]);

const LITERARY_SHIP_IDS = new Set<ShipId>(["nedtesei", "shell-ship"]);

const EDITORIAL_ALIASES: Partial<Record<ShipId, readonly string[]>> = {
  "classic-predator-spaceship": ["Jungle Hunter Ship", "Classic Ship"],
  "lost-tribe-spaceship": ["City Hunter Ship", "Lost Predator Ship"],
  "avp-predator-mothership": ["Mother Ship", "AVP Mothership"],
  "brute-jotunn-scout": ["Brute Scout", "Jotunn Scout", "Viking Scout"],
  "wwii-cyborg-pilot-ship": ["Cyborg Ship", "WWII Fighter"],
  "grendel-king-ship": ["Warlord Ship", "Predator King Ship"],
  "royal-predator-ship": ["Prince’s Ship", "Royal Ship"],
  "avp-2010-mothership": ["BG-386 Mothership"],
  "evolution-scout-ship": ["Young Blood Scout", "Evolution Ship"],
  "big-game-saucer": ["Saucer", "Nakai Saucer"],
  "new-york-enforcer-ship": ["Enforcer Glider", "New York Glider"],
  nedtesei: ["Ne’dtesei"],
  "shell-ship": ["Shell"],
  "predator-fleet": ["Bunda Fleet", "Yautja Fleet"],
};

const PROJECT_ORIGINAL_PRESENTATION_BY_ID = {
  "project-original-avp-predator-mothership": {
    name: "Prototype porte-clan Obsidienne",
    shortName: "Obsidienne",
    aliases: ["Mothership Obsidienne", "Interprétation AVP V12"],
  },
  "project-original-avpr-scout-ship": {
    name: "Prototype éclaireur Aiguille",
    shortName: "Aiguille",
    aliases: ["Scout Aiguille", "Interprétation AVP:R V12"],
  },
  "project-original-wolf-ship": {
    name: "Prototype intercepteur Sombre-lance",
    shortName: "Sombre-lance",
    aliases: ["Sombre-lance", "Interprétation Wolf V12"],
  },
  "project-original-fugitive-spaceship": {
    name: "Prototype courrier de la Faille",
    shortName: "Faille",
    aliases: ["Courrier Faille", "Interprétation Fugitive V12"],
  },
  "project-original-upgrade-spaceship": {
    name: "Prototype chasseur Apex",
    shortName: "Apex",
    aliases: ["Poursuivant Apex", "Interprétation Upgrade V12"],
  },
  "project-original-feral-spaceship": {
    name: "Prototype largueur des Premiers",
    shortName: "Premiers",
    aliases: ["Ancient Lander", "Interprétation Feral V12"],
  },
  "project-original-avp-predator-drop-pod": {
    name: "Prototype capsule Trident",
    shortName: "Trident",
    aliases: ["Pod Trident", "Interprétation Drop Pod V12"],
  },
} as const satisfies Readonly<
  Record<
    ProjectOriginalShipId,
    {
      name: string;
      shortName: string;
      aliases: readonly string[];
    }
  >
>;

function catalogueKind(shipId: ShipId): ShipCatalogueKind {
  if (AUXILIARY_SHIP_IDS.has(shipId)) return "auxiliary";
  if (CLASS_SHIP_IDS.has(shipId)) return "class";
  if (VARIANT_SHIP_IDS.has(shipId)) return "variant";
  return "identity";
}

function canonTierFor(seed: ShipRosterSeed): ShipCanonTier {
  if (LITERARY_SHIP_IDS.has(seed.id)) return "literary";
  if (CROSSOVER_SHIP_IDS.has(seed.id)) return "crossover";
  if (seed.media === "film") return "screen";
  if (seed.media === "game") return "licensed-game";
  return "expanded-universe";
}

function visualConfidenceFor(shipId: ShipId): ShipVisualConfidence {
  if (REFERENCE_LOCKED_SHIP_IDS.has(shipId)) return "reference-locked";
  if (V14_APPROXIMATION_SHIP_ID_SET.has(shipId)) {
    return "source-guided-approximation";
  }
  if (TEXT_INSPIRED_SHIP_IDS.has(shipId)) return "text-inspired";
  return "silhouette-inferred";
}

function referenceProviderFor(url: string | undefined): string {
  if (!url || url.includes("avpcentral.com")) return "AvP Central";
  if (url.includes("avpgalaxy.net")) return "AvP Galaxy";
  if (url.includes("avp.fandom.com")) return "Xenopedia";
  if (url.includes("prodosgames.com")) return "Prodos Games";
  if (url.includes("necaonline.com")) return "NECA";
  return "Référence dédiée";
}

function unlockForOrder(order: number): ShipUnlockRequirements {
  if (order === 1) {
    return {
      minimumHonor: 0,
      minimumCompletedMissions: 0,
      requiredMissionIds: [],
      minimumTrophies: 0,
    };
  }
  const minimumCompletedMissions = order <= 10 ? 1 : order <= 22 ? 2 : 3;
  const requiredMissionIds: MissionId[] = ["jungle-vey"];
  if (minimumCompletedMissions >= 2) requiredMissionIds.push("ice-cryostalker");
  if (minimumCompletedMissions >= 3) requiredMissionIds.push("volcano-bad-blood");
  return {
    minimumHonor: 100 + (order - 2) * 80,
    minimumCompletedMissions,
    requiredMissionIds,
    minimumTrophies: Math.min(8, 1 + Math.floor((order - 2) / 5)),
  };
}

function provenanceFor(seed: ShipRosterSeed): ShipVisualProvenance {
  const hasV14Assets = hasV14CanonicalShipAssets(seed.id);
  const isRejectedV14Approximation =
    V14_APPROXIMATION_SHIP_ID_SET.has(seed.id);
  const approximationNote =
    "Étude non promue : le dessus corrigé montre quatre pods périphériques, deux par côté, mais le profil reste insuffisant avec deux pods externes et une unité centrale au lieu d’établir clairement la géométrie à quatre pods.";
  return {
    status: hasV14Assets ? "references-locked" : "project-original",
    primaryAssetVersion: hasV14Assets ? "V14" : "V12/V13",
    runtimeAssetPath: shipProfileAssetPath(seed.id),
    topRuntimeAssetPath: shipTopAssetPath(seed.id),
    generationPromptIds: hasV14Assets
      ? [`v14-profile-${seed.id}`, `v14-top-${seed.id}`]
      : [`v13-top-${seed.id}`],
    generationNotesPath: hasV14Assets
      ? "art-source/v14/ships/README.md"
      : "art-source/v13/ships-top/README.md",
    assetManifestPath: hasV14Assets
      ? "art-source/v14/ships/ship-asset-manifest.json"
      : null,
    supplementalAssets: isRejectedV14Approximation
      ? [
          {
            id: "v14-non-canonical-approximation",
            label: "Étude V14 non canonique",
            status: "approximation",
            profileRuntimeAssetPath: `/game/ships/v14/${seed.id}.webp`,
            topRuntimeAssetPath: `/game/ships/v14/${seed.id}-top.webp`,
            generationPromptIds: [
              `v14-profile-${seed.id}`,
              `v14-top-${seed.id}`,
            ],
            generationNotesPath: "art-source/v14/ships/README.md",
            note: approximationNote,
          },
        ]
      : [],
    referenceSlots: [
      {
        id: `${seed.id}-primary-reference`,
        status: "verified",
        medium: seed.media,
        title: `${referenceProviderFor(seed.sourceUrl)} · ${seed.name}`,
        url:
          seed.sourceUrl ??
          `${SHIP_REFERENCE_INDEX_URL}#${seed.sourceAnchor}`,
        note: seed.sourceUrl
          ? "Référence dédiée consultée pour la silhouette, les matériaux ou le contexte."
          : "Index de silhouettes mis à jour le 6 juin 2026.",
      },
    ],
  };
}

const BASE_SHIP_CATALOGUE: readonly ShipCatalogueEntry[] = SHIP_ROSTER.map(
  (seed, index) => {
    const kind = catalogueKind(seed.id);
    const visualConfidence = visualConfidenceFor(seed.id);
    return {
      ...seed,
      catalogueOrder: index + 1,
      canonTier: canonTierFor(seed),
      visualConfidence,
      kind,
      selectable: kind !== "auxiliary",
      projectOriginal: false,
      inspirationShipId: null,
      aliases: [...new Set([seed.shortName, ...(EDITORIAL_ALIASES[seed.id] ?? [])])],
      deckNote:
        kind === "auxiliary"
          ? "Entrée annexe consultable : ce pod, glider, véhicule ou groupe n’est pas un vaisseau sélectionnable."
          : visualConfidence === "reference-locked"
            ? "Silhouette et matériaux calés sur des références visuelles exploitables ; les surfaces absentes restent reconstruites."
            : visualConfidence === "source-guided-approximation"
              ? "Étude guidée par les références, conservée sans promotion canonique tant que les deux vues ne restituent pas toute la géométrie attestée."
            : visualConfidence === "silhouette-inferred"
              ? "Coque fidèle à la silhouette publiée ; la vue zénithale complète les angles absents."
              : "Interprétation originale du projet fondée sur les descriptions et fragments disponibles.",
      unlock: unlockForOrder(index + 1),
      provenance: provenanceFor(seed),
    };
  },
);

function projectOriginalEntryFor(
  id: ProjectOriginalShipId,
  index: number,
): ShipCatalogueEntry {
  const inspirationShipId = PROJECT_ORIGINAL_ASSET_SOURCE_BY_ID[id];
  const inspiration = BASE_SHIP_CATALOGUE.find(
    (ship) => ship.id === inspirationShipId,
  );
  if (!inspiration) {
    throw new Error(`Vaisseau source introuvable pour ${id}`);
  }

  const presentation = PROJECT_ORIGINAL_PRESENTATION_BY_ID[id];
  const catalogueOrder = SHIP_ROSTER.length + index + 1;
  const kind: ShipCatalogueKind = inspiration.selectable
    ? "variant"
    : "auxiliary";
  return {
    id,
    catalogueOrder,
    media: "project",
    canonTier: "project-original",
    visualConfidence: "project-original",
    kind,
    selectable: inspiration.selectable,
    projectOriginal: true,
    inspirationShipId,
    aliases: [...new Set([presentation.shortName, ...presentation.aliases])],
    name: presentation.name,
    shortName: presentation.shortName,
    role: inspiration.role,
    originLabel: "Prototype original du clan · projet · non canonique",
    description:
      `Variante de concept autonome issue de l’ancienne interprétation V12/V13 de ${inspiration.name}. ` +
      "Le profil et le dessus historiques ont été créés indépendamment et peuvent différer ; aucune des deux vues ne prétend reproduire le modèle de la franchise vu à l’écran.",
    deckNote:
      kind === "auxiliary"
        ? "Création originale non canonique conservée comme annexe inspectable ; cette capsule n’est pas sélectionnable."
        : "Création originale non canonique conservée comme vaisseau supplémentaire sélectionnable du projet.",
    unlock: unlockForOrder(catalogueOrder),
    provenance: {
      status: "project-original",
      primaryAssetVersion: "V12/V13",
      runtimeAssetPath: shipProfileAssetPath(id),
      topRuntimeAssetPath: shipTopAssetPath(id),
      generationPromptIds: [`v13-top-${inspirationShipId}`],
      generationNotesPath: "art-source/v13/ships-top/README.md",
      assetManifestPath: null,
      supplementalAssets: [],
      referenceSlots: [
        {
          id: `${id}-project-archive`,
          status: "verified",
          medium: "concept-art",
          title: `${presentation.name} · création originale V12/V13`,
          url: null,
          note:
            `Provenance interne vérifiée : réutilise les masters historiques de ${inspirationShipId}, sans copie et sans revendication canonique.`,
        },
      ],
    },
  };
}

export const SHIP_CATALOGUE: readonly ShipCatalogueEntry[] = [
  ...BASE_SHIP_CATALOGUE,
  ...PROJECT_ORIGINAL_SHIP_IDS.map(projectOriginalEntryFor),
];

export const SHIP_IDS: readonly ShipId[] = SHIP_CATALOGUE.map(({ id }) => id);

export const SHIP_BY_ID = Object.freeze(
  Object.fromEntries(SHIP_CATALOGUE.map((ship) => [ship.id, ship])),
) as Readonly<Record<ShipId, ShipCatalogueEntry>>;

export function isShipId(value: unknown): value is ShipId {
  return typeof value === "string" && SHIP_IDS.includes(value as ShipId);
}

export function shipForId(shipId: ShipId): ShipCatalogueEntry {
  return SHIP_BY_ID[shipId];
}

function completedMissionIds(save: SaveGame): MissionId[] {
  return (Object.entries(save.missionProgress) as Array<
    [MissionId, SaveGame["missionProgress"][MissionId]]
  >)
    .filter(([, progress]) => progress.completions > 0)
    .map(([missionId]) => missionId);
}

export function getShipAvailability(
  shipId: ShipId,
  save: SaveGame,
  unlockedShipIds: readonly ShipId[] = [],
): ShipAvailability {
  const ship = shipForId(shipId);
  const completedIds = completedMissionIds(save);
  const permanentlyUnlocked = unlockedShipIds.includes(shipId);
  const requirements: ShipRequirementProgress[] = [
    {
      id: "honor",
      label: `${ship.unlock.minimumHonor} honneur`,
      current: save.profile.honor,
      target: ship.unlock.minimumHonor,
      met: save.profile.honor >= ship.unlock.minimumHonor,
    },
    {
      id: "missions",
      label: `${ship.unlock.minimumCompletedMissions} mission(s) terminée(s)`,
      current: completedIds.length,
      target: ship.unlock.minimumCompletedMissions,
      met: completedIds.length >= ship.unlock.minimumCompletedMissions,
    },
    {
      id: "trophies",
      label: `${ship.unlock.minimumTrophies} trophée(s)`,
      current: save.trophies.length,
      target: ship.unlock.minimumTrophies,
      met: save.trophies.length >= ship.unlock.minimumTrophies,
    },
    ...ship.unlock.requiredMissionIds.map<ShipRequirementProgress>(
      (missionId) => ({
        id: "required-mission",
        missionId,
        label: `Mission ${missionId}`,
        current: completedIds.includes(missionId) ? 1 : 0,
        target: 1,
        met: completedIds.includes(missionId),
      }),
    ),
  ];
  const relevantRequirements = requirements.filter(
    ({ target }) => target > 0,
  );
  const requirementsMet = relevantRequirements.every(({ met }) => met);
  return {
    shipId,
    selectable: ship.selectable,
    available: ship.selectable && (permanentlyUnlocked || requirementsMet),
    permanentlyUnlocked,
    requirementsMet,
    requirements: relevantRequirements,
    unmetLabels: relevantRequirements
      .filter(({ met }) => !met)
      .map(({ label }) => label),
  };
}

/** Preserve explicit unlocks and append newly earned hulls in catalogue order. */
export function availableShipIds(
  save: SaveGame,
  unlockedShipIds: readonly ShipId[] = [],
): ShipId[] {
  const explicit = new Set<ShipId>([
    DEFAULT_SHIP_ID,
    ...unlockedShipIds.filter(
      (shipId): shipId is ShipId =>
        isShipId(shipId) && shipForId(shipId).selectable,
    ),
  ]);
  for (const ship of SHIP_CATALOGUE) {
    if (
      ship.selectable &&
      getShipAvailability(ship.id, save, [...explicit]).available
    ) {
      explicit.add(ship.id);
    }
  }
  return SHIP_IDS.filter(
    (shipId) => shipForId(shipId).selectable && explicit.has(shipId),
  );
}
