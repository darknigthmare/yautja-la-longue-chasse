/**
 * Authored 2.5D ground plan for the Homeworld city.
 *
 * The simulation uses one continuous oblique street network. No platform,
 * ladder or lift is needed to reach a public service. Render modules, props
 * and character plates are independent so scenery can overlap by depth.
 */

import type { HunterPresetId, TrophyRecord } from "../types";
import { trophyWallVisualForDefinitionId } from "../trophyVisualRegistry";

export interface HomeworldVec2 {
  readonly x: number;
  readonly y: number;
}

export interface HomeworldDistrict {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /** Kept for old minimap consumers; this is the lower bound, not a platform. */
  readonly floorY: number;
  readonly accent: string;
  readonly polygon: readonly HomeworldVec2[];
  readonly texture: "sanctum" | "machinery" | "observatory";
}

export interface HomeworldStreet {
  readonly id: string;
  readonly label: string;
  readonly polygon: readonly HomeworldVec2[];
  readonly accent: string;
  readonly kind: "court" | "passage" | "ramp" | "undercity";
}

export interface HomeworldBuildingModule {
  readonly id: string;
  readonly districtId: string;
  readonly label: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly variant: "hall" | "stall" | "forge" | "archive" | "gate" | "tower";
  readonly doorSide: "left" | "center" | "right";
}

export interface HomeworldDecorProp {
  readonly id: string;
  readonly districtId: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly asset: string;
  readonly plane: "rear" | "ground" | "front";
  readonly fadeRadius?: number;
}

export interface HomeworldCollision {
  readonly kind: "building" | "prop" | "npc";
  readonly id: string;
}

export interface HomeworldFootprint {
  readonly halfWidth: number;
  readonly halfDepth: number;
}

export interface HomeworldTrophyDisplay {
  readonly claimId: string;
  readonly label: string;
  readonly asset: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly plane: "rear" | "ground";
}

const polygon = (...points: readonly [number, number][]): readonly HomeworldVec2[] =>
  points.map(([x, y]) => ({ x, y }));

function bounds(points: readonly HomeworldVec2[]) {
  const xs = points.map(({ x }) => x);
  const ys = points.map(({ y }) => y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  const right = Math.max(...xs);
  const bottom = Math.max(...ys);
  return { x, y, width: right - x, height: bottom - y, floorY: bottom };
}

function district(
  id: string,
  name: string,
  description: string,
  points: readonly HomeworldVec2[],
  accent: string,
  texture: HomeworldDistrict["texture"],
): HomeworldDistrict {
  return { id, name, description, ...bounds(points), polygon: points, accent, texture };
}

export const HOMEWORLD_WORLD = { width: 5_200, height: 2_600 } as const;
export const HOMEWORLD_ACTOR = {
  halfWidth: 24,
  halfDepth: 14,
  height: 100,
  walkSpeed: 330,
  depthSpeed: 260,
  tickSeconds: 1 / 60,
} as const;

export const HOMEWORLD_DISTRICTS: readonly HomeworldDistrict[] = [
  district("port", "Port des Chasses", "Ton vaisseau reste ton refuge. Les convois et les navettes animent les quais.", polygon([180, 1_980], [360, 1_590], [1_130, 1_650], [1_280, 2_180], [300, 2_400]), "#dfb078", "observatory"),
  district("market", "Marché des Clans", "Des échoppes spécialisées bordent une route d'artisans ouverte et lisible.", polygon([1_050, 1_670], [1_410, 1_420], [2_430, 1_490], [2_650, 2_030], [2_230, 2_250], [1_250, 2_170]), "#9ec9bd", "sanctum"),
  district("forges", "Forges Profondes", "Les ateliers préparent armes et parures sans supprimer la forge du vaisseau.", polygon([2_350, 1_570], [2_850, 1_440], [3_700, 1_640], [3_870, 2_120], [2_800, 2_270]), "#ef925b", "machinery"),
  district("undercity", "Sous-Cité", "Des refuges et galeries de maintenance relient les quartiers loin des regards.", polygon([3_600, 1_780], [4_280, 1_660], [5_030, 1_930], [4_850, 2_410], [3_850, 2_300]), "#a494ce", "machinery"),
  district("esplanade", "Esplanade des Trophées", "Les prises possédées sont présentées publiquement ; une collection achetée ne prouve aucune chasse.", polygon([470, 1_140], [1_050, 940], [1_720, 1_190], [1_590, 1_630], [750, 1_660]), "#d9c28a", "sanctum"),
  district("terraces", "Terrasses des Chasseurs", "Les instructeurs proposent mobilité, visée et camouflage dans une cour étagée sans parcours obligatoire.", polygon([1_500, 950], [2_170, 720], [3_060, 950], [2_900, 1_510], [1_780, 1_520]), "#a8c98a", "observatory"),
  district("clans", "Domaine des Clans", "Délégations, repos et soins gardent les services ordinaires accessibles.", polygon([2_780, 990], [3_440, 810], [4_120, 1_070], [3_980, 1_600], [3_030, 1_630]), "#8bbaca", "sanctum"),
  district("enforcers", "Bastion des Enforcers", "Les preuves précèdent les accusations. Un témoignage compte davantage qu'une rumeur.", polygon([3_850, 1_010], [4_480, 880], [5_070, 1_110], [4_990, 1_650], [4_090, 1_610]), "#c3b8b0", "machinery"),
  district("memory", "Maison de la Mémoire", "Les registres permettent de comparer l'origine des prises et leurs marques.", polygon([470, 410], [1_170, 210], [1_820, 510], [1_660, 1_020], [780, 1_090]), "#99cbd1", "sanctum"),
  district("arenas", "Grandes Arènes", "THE PIT conserve son entrée propre ; il ne verrouille aucune étape de l'enquête.", polygon([1_550, 420], [2_300, 170], [3_060, 420], [2_920, 920], [1_810, 1_000]), "#d59b8e", "machinery"),
  district("temple", "Temple des Rites", "Les rites et rangs déjà acquis sont reconnus sans rétrograder le chasseur.", polygon([2_760, 390], [3_430, 170], [4_100, 410], [3_960, 960], [3_010, 970]), "#c5b6db", "sanctum"),
  district("citadel", "Citadelle du Trône", "Le Roi de la Chasse représente cette cité et ses clans alliés, dans la continuité originale du jeu.", polygon([3_790, 350], [4_400, 150], [5_120, 410], [5_060, 1_030], [4_090, 1_030]), "#e2c56a", "observatory"),
] as const;

/** Authored overlaps connect every district without ladders or forced jumps. */
export const HOMEWORLD_STREETS: readonly HomeworldStreet[] = [
  { id: "quay-court", label: "Cour des quais", polygon: polygon([230, 2_090], [390, 1_700], [1_270, 1_760], [1_180, 2_310]), accent: "#d6a66c", kind: "court" },
  { id: "artisan-bend", label: "Route des artisans", polygon: polygon([1_000, 1_790], [1_450, 1_480], [2_650, 1_590], [2_560, 2_150], [1_280, 2_160]), accent: "#86b9a9", kind: "passage" },
  { id: "forge-run", label: "Voie des forges", polygon: polygon([2_360, 1_690], [2_880, 1_510], [3_850, 1_780], [3_720, 2_220], [2_650, 2_180]), accent: "#d97949", kind: "passage" },
  { id: "gallery-descent", label: "Galerie basse", polygon: polygon([3_570, 1_900], [4_210, 1_720], [5_000, 2_000], [4_820, 2_330], [3_720, 2_220]), accent: "#8775ad", kind: "undercity" },
  { id: "trophy-ascent", label: "Rampe des prises", polygon: polygon([760, 1_820], [1_060, 1_520], [1_300, 1_220], [1_020, 1_090], [700, 1_500]), accent: "#c9ae78", kind: "ramp" },
  { id: "memory-ascent", label: "Passage des archives", polygon: polygon([750, 1_250], [1_010, 1_020], [1_350, 690], [1_130, 500], [820, 790]), accent: "#83bbc1", kind: "ramp" },
  { id: "arena-ramp", label: "Rampe du cercle", polygon: polygon([1_450, 1_250], [1_790, 1_020], [2_130, 760], [1_930, 570], [1_570, 850]), accent: "#be8178", kind: "ramp" },
  { id: "central-arc", label: "Arc des clans", polygon: polygon([2_600, 1_600], [2_930, 1_390], [3_420, 1_050], [3_220, 850], [2_720, 1_160]), accent: "#80aab9", kind: "ramp" },
  { id: "citadel-ascent", label: "Voie de l'audience", polygon: polygon([3_750, 1_300], [4_050, 1_080], [4_440, 760], [4_230, 550], [3_820, 850]), accent: "#d6b958", kind: "ramp" },
] as const;

const BUILDING_ASSET_ROOT = "/game/ship-interior/";

export const HOMEWORLD_BUILDINGS: readonly HomeworldBuildingModule[] = [
  { id: "dock-control", districtId: "port", label: "Contrôle d'amarrage", x: 650, y: 1_900, width: 360, height: 280, variant: "tower", doorSide: "right" },
  { id: "market-armory", districtId: "market", label: "Échoppe d'équipement", x: 1_610, y: 1_810, width: 390, height: 250, variant: "stall", doorSide: "center" },
  { id: "market-canopy", districtId: "market", label: "Halle des échanges", x: 2_180, y: 1_720, width: 430, height: 300, variant: "hall", doorSide: "left" },
  { id: "deep-forge", districtId: "forges", label: "Atelier des parures", x: 3_080, y: 1_870, width: 470, height: 330, variant: "forge", doorSide: "center" },
  { id: "undercity-refuge", districtId: "undercity", label: "Refuge des galeries", x: 4_520, y: 2_070, width: 480, height: 300, variant: "gate", doorSide: "left" },
  { id: "trophy-mausoleum", districtId: "esplanade", label: "Mausolée public", x: 920, y: 1_300, width: 460, height: 320, variant: "hall", doorSide: "right" },
  { id: "training-hall", districtId: "terraces", label: "Salle des maîtres", x: 2_230, y: 1_160, width: 440, height: 290, variant: "hall", doorSide: "center" },
  { id: "clan-lodge", districtId: "clans", label: "Maison des délégations", x: 3_430, y: 1_230, width: 470, height: 310, variant: "hall", doorSide: "left" },
  { id: "enforcer-bastion", districtId: "enforcers", label: "Salle des preuves", x: 4_520, y: 1_270, width: 500, height: 340, variant: "gate", doorSide: "center" },
  { id: "memory-vault", districtId: "memory", label: "Registre des marques", x: 1_160, y: 670, width: 520, height: 370, variant: "archive", doorSide: "center" },
  { id: "pit-gate", districtId: "arenas", label: "Entrée THE PIT", x: 2_300, y: 640, width: 500, height: 360, variant: "gate", doorSide: "center" },
  { id: "rite-sanctum", districtId: "temple", label: "Sanctuaire des rites", x: 3_400, y: 620, width: 500, height: 390, variant: "hall", doorSide: "right" },
  { id: "throne-audience", districtId: "citadel", label: "Salle d'audience", x: 4_510, y: 630, width: 600, height: 460, variant: "tower", doorSide: "center" },
] as const;

export const HOMEWORLD_PROPS: readonly HomeworldDecorProp[] = [
  { id: "dock-console", districtId: "port", x: 760, y: 2_110, width: 120, height: 125, asset: BUILDING_ASSET_ROOT + "v21/console-navigation.webp", plane: "ground" },
  { id: "market-rack-a", districtId: "market", x: 1_430, y: 2_050, width: 150, height: 135, asset: BUILDING_ASSET_ROOT + "v22/armory-rack.webp", plane: "ground" },
  { id: "market-rack-b", districtId: "market", x: 1_850, y: 1_650, width: 130, height: 120, asset: BUILDING_ASSET_ROOT + "v22/armory-rack.webp", plane: "rear" },
  { id: "forge-station", districtId: "forges", x: 3_270, y: 2_080, width: 170, height: 145, asset: BUILDING_ASSET_ROOT + "v22/forge-station.webp", plane: "ground" },
  { id: "undercity-rib-a", districtId: "undercity", x: 4_050, y: 2_230, width: 170, height: 330, asset: BUILDING_ASSET_ROOT + "v21/foreground-rib.webp", plane: "front", fadeRadius: 150 },
  { id: "trophy-terminal", districtId: "esplanade", x: 1_260, y: 1_450, width: 120, height: 125, asset: BUILDING_ASSET_ROOT + "v22/archive-terminal.webp", plane: "ground" },
  { id: "training-gantry", districtId: "terraces", x: 2_650, y: 1_300, width: 220, height: 170, asset: BUILDING_ASSET_ROOT + "v22/gantry.webp", plane: "ground" },
  { id: "clan-medbay", districtId: "clans", x: 3_650, y: 1_480, width: 180, height: 125, asset: BUILDING_ASSET_ROOT + "v22/medbay-bed.webp", plane: "ground" },
  { id: "memory-terminal", districtId: "memory", x: 1_420, y: 820, width: 130, height: 135, asset: BUILDING_ASSET_ROOT + "v22/archive-terminal.webp", plane: "ground" },
  { id: "arena-rib", districtId: "arenas", x: 2_750, y: 850, width: 170, height: 320, asset: BUILDING_ASSET_ROOT + "v21/foreground-rib.webp", plane: "front", fadeRadius: 140 },
  { id: "citadel-rib", districtId: "citadel", x: 4_900, y: 880, width: 190, height: 360, asset: BUILDING_ASSET_ROOT + "v21/foreground-rib.webp", plane: "front", fadeRadius: 160 },
] as const;

export const HOMEWORLD_POINT_POSITIONS = {
  "personal-ship": { x: 400, y: 2_220 },
  "dock-officer-point": { x: 690, y: 2_080 },
  "suspect-trophy-point": { x: 1_040, y: 1_970 },
  "market-service": { x: 1_600, y: 1_970 },
  "forge-service": { x: 3_060, y: 2_020 },
  "witness-point": { x: 4_520, y: 2_190 },
  "trophy-service": { x: 910, y: 1_430 },
  "training-service": { x: 2_220, y: 1_330 },
  "medbay-service": { x: 3_430, y: 1_420 },
  "enforcer-point": { x: 4_520, y: 1_410 },
  "memory-register-point": { x: 820, y: 790 },
  "memory-service": { x: 1_390, y: 780 },
  "pit-service": { x: 2_300, y: 780 },
  "temple-point": { x: 3_390, y: 760 },
  "audience-point": { x: 4_520, y: 790 },
  "region-ash-marches": { x: 970, y: 1_770 },
  "region-glass-desert": { x: 2_250, y: 1_710 },
  "region-pillar-jungle": { x: 2_660, y: 1_070 },
  "region-luminous-marshes": { x: 3_760, y: 1_170 },
  "region-storm-chain": { x: 3_670, y: 520 },
  "region-leviathan-coast": { x: 1_350, y: 1_220 },
  "region-thermal-caves": { x: 3_520, y: 1_780 },
  "region-cold-crown": { x: 4_830, y: 490 },
  "region-first-city-ruins": { x: 2_730, y: 520 },
  "region-forbidden-reserve": { x: 4_800, y: 1_170 },
} as const;

const GENERIC_BODY_ROOT = "/game/assets/v3/actors/yautja/hunter/body/";

/** Original city inhabitants use neutral modular bodies, never another named hunter's plate. */
export const HOMEWORLD_NPC_PLATES: Readonly<Record<string, string>> = {
  "dock-officer": GENERIC_BODY_ROOT + "classic/net/full.webp",
  "market-artisan": GENERIC_BODY_ROOT + "huntress/net/full.webp",
  "forge-artisan": GENERIC_BODY_ROOT + "huntress/full.webp",
  "undercity-witness": GENERIC_BODY_ROOT + "young/net/full.webp",
  "trophy-herald": GENERIC_BODY_ROOT + "elder/net/full.webp",
  "terrace-instructor": GENERIC_BODY_ROOT + "classic/full.webp",
  "clan-healer": GENERIC_BODY_ROOT + "huntress/full.webp",
  "enforcer-captain": GENERIC_BODY_ROOT + "super/net/full.webp",
  "memory-keeper": GENERIC_BODY_ROOT + "elder/full.webp",
  "arena-steward": GENERIC_BODY_ROOT + "classic/net/full.webp",
  "rite-keeper": GENERIC_BODY_ROOT + "huntress/net/full.webp",
  "hunt-king": GENERIC_BODY_ROOT + "elder/net/full.webp",
} as const;

export const HOMEWORLD_GENERIC_HUNTER_PLATES = {
  hunter: GENERIC_BODY_ROOT + "young/net/full.webp",
  huntress: GENERIC_BODY_ROOT + "huntress/net/full.webp",
} as const;

const FILM_PLATE_PRESETS = new Set<HunterPresetId>([
  "jungle-hunter", "city-hunter", "greyback", "boar", "shaman", "lost-borg",
  "snake", "warrior", "guardian", "lost-scout", "lost-stalker", "scar", "celtic",
  "chopper", "avp-elder", "ancient-warrior", "temple-guard", "youngblood", "wolf",
  "bull", "bonegrill", "classic-captive", "berserker", "falconer", "tracker",
  "fugitive", "assassin", "emissary-one", "emissary-two", "feral-hunter", "kok-jotun",
  "kok-oni", "kok-pilot", "kok-warlord", "kok-captive", "kok-arena-guard", "dek",
  "kwei", "dek-father", "scarface", "stone-heart", "valkyrie", "witch", "enforcer",
  "alpha", "samurai", "cleopatra", "bionic", "broken-tusk", "ahab", "big-mama",
  "bad-blood-comic", "hashori",
]);

const V31_FILM_PLATE_PRESETS = new Set<HunterPresetId>([
  "city-hunter", "scarface", "stone-heart", "valkyrie", "witch", "enforcer",
  "alpha", "samurai", "cleopatra", "bionic", "broken-tusk", "ahab", "big-mama",
  "bad-blood-comic", "hashori",
]);

export interface HomeworldHeroPlate {
  readonly src: string;
  /** The bitmap belongs to this preset ID; this is not a canon-fidelity certification. */
  readonly exactPreset: boolean;
  readonly plateId: string;
  readonly status: "exact-plate" | "custom-modular-body";
  readonly provenanceStatus: "source-anchored-fan-plate" | "noncanonical-project-interpretation" | "custom-modular-body";
}

export function homeworldHeroPlate(presetId: HunterPresetId): HomeworldHeroPlate {
  if (FILM_PLATE_PRESETS.has(presetId)) {
    return {
      src: V31_FILM_PLATE_PRESETS.has(presetId)
        ? `/game/sprites/v31/film-plates/${presetId}.png`
        : `/game/sprites/v5/film-plates/${presetId}.png`,
      exactPreset: true,
      plateId: presetId,
      status: "exact-plate",
      provenanceStatus: presetId === "hashori"
        ? "noncanonical-project-interpretation"
        : "source-anchored-fan-plate",
    };
  }
  return {
    src: HOMEWORLD_GENERIC_HUNTER_PLATES.hunter,
    exactPreset: false,
    plateId: "custom",
    status: "custom-modular-body",
    provenanceStatus: "custom-modular-body",
  };
}

export function homeworldNpcPlate(npcId: string): string {
  return HOMEWORLD_NPC_PLATES[npcId] ?? HOMEWORLD_GENERIC_HUNTER_PLATES.hunter;
}

export function polygonCss(points: readonly HomeworldVec2[], origin: Pick<HomeworldDistrict, "x" | "y" | "width" | "height">): string {
  return `polygon(${points.map((point) => `${((point.x - origin.x) / origin.width) * 100}% ${((point.y - origin.y) / origin.height) * 100}%`).join(",")})`;
}

export function pointInHomeworldPolygon(point: HomeworldVec2, points: readonly HomeworldVec2[]): boolean {
  let inside = false;
  for (let i = 0, previous = points.length - 1; i < points.length; previous = i++) {
    const a = points[i];
    const b = points[previous];
    const crosses = (a.y > point.y) !== (b.y > point.y)
      && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

const NPC_POINT_IDS = [
  "dock-officer-point", "market-service", "forge-service", "witness-point",
  "trophy-service", "training-service", "medbay-service", "enforcer-point",
  "memory-register-point", "pit-service", "temple-point",
  "audience-point",
] as const;

export const HOMEWORLD_NPC_COLLIDERS = NPC_POINT_IDS.map((id) => ({
  id,
  ...HOMEWORLD_POINT_POSITIONS[id],
  radiusX: 28,
  radiusY: 17,
})) as readonly { readonly id: string; readonly x: number; readonly y: number; readonly radiusX: number; readonly radiusY: number }[];

const POINT_PROP_COLLIDER_BLUEPRINTS = [
  { id: "suspect-trophy-point", offsetX: 0, radiusX: 30, radiusY: 12 },
  { id: "market-service", offsetX: -54, radiusX: 34, radiusY: 13 },
  { id: "forge-service", offsetX: -54, radiusX: 34, radiusY: 13 },
  { id: "witness-point", offsetX: -54, radiusX: 30, radiusY: 12 },
  { id: "trophy-service", offsetX: -54, radiusX: 34, radiusY: 13 },
  { id: "training-service", offsetX: -54, radiusX: 34, radiusY: 13 },
  { id: "medbay-service", offsetX: -54, radiusX: 34, radiusY: 13 },
  { id: "enforcer-point", offsetX: -54, radiusX: 34, radiusY: 13 },
  { id: "memory-register-point", offsetX: -54, radiusX: 30, radiusY: 12 },
  { id: "memory-service", offsetX: -54, radiusX: 34, radiusY: 13 },
  { id: "pit-service", offsetX: -54, radiusX: 34, radiusY: 13 },
  ...Object.keys(HOMEWORLD_POINT_POSITIONS)
    .filter((id) => id.startsWith("region-"))
    .map((id) => ({ id, offsetX: 0, radiusX: 38, radiusY: 13 })),
] as const;

/** Stations and portal props have their own footprint, separate from their NPC. */
export const HOMEWORLD_POINT_PROP_COLLIDERS = POINT_PROP_COLLIDER_BLUEPRINTS.map((entry) => {
  const position = HOMEWORLD_POINT_POSITIONS[entry.id as keyof typeof HOMEWORLD_POINT_POSITIONS];
  return {
    id: entry.id,
    x: position.x + entry.offsetX,
    y: position.y,
    radiusX: entry.radiusX,
    radiusY: entry.radiusY,
  };
});

export const HOMEWORLD_TROPHY_SLOTS = [
  { x: 650, y: 1_470, width: 76, height: 92, plane: "rear" },
  { x: 745, y: 1_525, width: 82, height: 96, plane: "ground" },
  { x: 1_040, y: 1_535, width: 84, height: 100, plane: "ground" },
  { x: 1_140, y: 1_475, width: 76, height: 92, plane: "rear" },
  { x: 1_240, y: 1_555, width: 86, height: 102, plane: "ground" },
  { x: 1_335, y: 1_490, width: 78, height: 94, plane: "rear" },
  { x: 1_425, y: 1_555, width: 84, height: 100, plane: "ground" },
  { x: 1_505, y: 1_490, width: 76, height: 92, plane: "rear" },
  { x: 730, y: 1_390, width: 70, height: 86, plane: "rear" },
  { x: 820, y: 1_355, width: 68, height: 84, plane: "rear" },
  { x: 1_095, y: 1_355, width: 68, height: 84, plane: "rear" },
  { x: 1_185, y: 1_395, width: 70, height: 86, plane: "rear" },
] as const;

const TROPHY_PART_FALLBACK: Readonly<Record<TrophyRecord["partId"], string>> = {
  skull: "/game/assets/v3/actors/yautja/hunter/trophies/trophy-skull.webp",
  "skull-and-spine": "/game/assets/v3/actors/yautja/hunter/trophies/trophy-spine.webp",
  mask: "/game/assets/v3/actors/yautja/hunter/trophies/trophy-bindings.webp",
  insignia: "/game/assets/v3/actors/yautja/hunter/trophies/trophy-bindings.webp",
};

/** Every owned claim is a separate scene object; unknown definitions stay visibly generic. */
export function homeworldTrophyDisplays(
  trophies: readonly Pick<TrophyRecord, "id" | "definitionId" | "targetName" | "partId">[],
): readonly HomeworldTrophyDisplay[] {
  const unique = [...new Map(trophies.map((trophy) => [trophy.id, trophy])).values()]
    .slice(-HOMEWORLD_TROPHY_SLOTS.length);
  return unique.map((trophy, index) => {
    const visual = trophyWallVisualForDefinitionId(trophy.definitionId);
    return {
      claimId: trophy.id,
      label: visual?.name ?? `Prise de ${trophy.targetName}`,
      asset: visual?.runtimeUrl ?? TROPHY_PART_FALLBACK[trophy.partId],
      ...HOMEWORLD_TROPHY_SLOTS[index],
    };
  });
}

function isTerrainPoint(point: HomeworldVec2): boolean {
  return HOMEWORLD_DISTRICTS.some(({ polygon: points }) => pointInHomeworldPolygon(point, points))
    || HOMEWORLD_STREETS.some(({ polygon: points }) => pointInHomeworldPolygon(point, points));
}

export function isHomeworldTerrainWalkable(
  point: HomeworldVec2,
  footprint: HomeworldFootprint = HOMEWORLD_ACTOR,
): boolean {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return false;
  const halfWidth = Math.max(0, finite(footprint.halfWidth));
  const halfDepth = Math.max(0, finite(footprint.halfDepth));
  const samples: readonly [number, number][] = [
    [0, 0], [-halfWidth, 0], [halfWidth, 0], [0, -halfDepth], [0, halfDepth],
    [-halfWidth * .7, -halfDepth * .7], [halfWidth * .7, -halfDepth * .7],
    [-halfWidth * .7, halfDepth * .7], [halfWidth * .7, halfDepth * .7],
  ];
  return samples.every(([x, y]) => isTerrainPoint({ x: point.x + x, y: point.y + y }));
}

export function homeworldBuildingDoorPosition(building: HomeworldBuildingModule): HomeworldVec2 {
  const offset = building.doorSide === "left" ? -.19 : building.doorSide === "right" ? .19 : 0;
  return { x: building.x + building.width * offset, y: building.y + 54 };
}

export function homeworldBuildingCollision(building: HomeworldBuildingModule) {
  const door = homeworldBuildingDoorPosition(building);
  const doorWidth = Math.max(108, Math.min(148, building.width * .3));
  return {
    left: building.x - building.width * .46,
    right: building.x + building.width * .46,
    top: building.y - Math.min(112, building.height * .3),
    bottom: building.y + 18,
    doorLeft: door.x - doorWidth / 2,
    doorRight: door.x + doorWidth / 2,
    thresholdTop: building.y - 56,
  } as const;
}

function rectangleTouchesFootprint(
  point: HomeworldVec2,
  footprint: HomeworldFootprint,
  left: number,
  right: number,
  top: number,
  bottom: number,
): boolean {
  return point.x + footprint.halfWidth > left
    && point.x - footprint.halfWidth < right
    && point.y + footprint.halfDepth > top
    && point.y - footprint.halfDepth < bottom;
}

export function homeworldCollisionAt(
  point: HomeworldVec2,
  footprint: HomeworldFootprint = HOMEWORLD_ACTOR,
): HomeworldCollision | null {
  const safeFootprint = {
    halfWidth: Math.max(0, finite(footprint.halfWidth)),
    halfDepth: Math.max(0, finite(footprint.halfDepth)),
  };
  for (const building of HOMEWORLD_BUILDINGS) {
    const collision = homeworldBuildingCollision(building);
    if (!rectangleTouchesFootprint(point, safeFootprint, collision.left, collision.right, collision.top, collision.bottom)) continue;
    const entirelyInDoor = point.x - safeFootprint.halfWidth >= collision.doorLeft
      && point.x + safeFootprint.halfWidth <= collision.doorRight;
    const insideThreshold = point.y - safeFootprint.halfDepth >= collision.thresholdTop;
    if (!(entirelyInDoor && insideThreshold)) return { kind: "building", id: building.id };
  }
  for (const prop of HOMEWORLD_PROPS) {
    if (prop.plane !== "ground") continue;
    const halfPropWidth = Math.max(18, prop.width * .22);
    const halfPropDepth = Math.max(10, Math.min(24, prop.height * .14));
    if (rectangleTouchesFootprint(
      point,
      safeFootprint,
      prop.x - halfPropWidth,
      prop.x + halfPropWidth,
      prop.y - halfPropDepth,
      prop.y + 10,
    )) return { kind: "prop", id: prop.id };
  }
  for (const npc of HOMEWORLD_NPC_COLLIDERS) {
    const dx = (point.x - npc.x) / (npc.radiusX + safeFootprint.halfWidth);
    const dy = (point.y - npc.y) / (npc.radiusY + safeFootprint.halfDepth);
    if (dx * dx + dy * dy < 1) return { kind: "npc", id: npc.id };
  }
  for (const prop of HOMEWORLD_POINT_PROP_COLLIDERS) {
    if (rectangleTouchesFootprint(
      point,
      safeFootprint,
      prop.x - prop.radiusX,
      prop.x + prop.radiusX,
      prop.y - prop.radiusY,
      prop.y + prop.radiusY,
    )) return { kind: "prop", id: prop.id };
  }
  return null;
}

export function isHomeworldWalkable(
  point: HomeworldVec2,
  footprint: HomeworldFootprint = HOMEWORLD_ACTOR,
): boolean {
  return isHomeworldTerrainWalkable(point, footprint) && homeworldCollisionAt(point, footprint) === null;
}

export function nearestHomeworldDoor(
  point: HomeworldVec2,
  maximumDistance = 175,
): HomeworldBuildingModule | null {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || !Number.isFinite(maximumDistance) || maximumDistance < 0) return null;
  let nearest: HomeworldBuildingModule | null = null;
  let distance = maximumDistance;
  for (const building of HOMEWORLD_BUILDINGS) {
    const door = homeworldBuildingDoorPosition(building);
    const candidate = Math.hypot(point.x - door.x, (point.y - door.y) * .82);
    if (candidate < distance) { distance = candidate; nearest = building; }
  }
  return nearest;
}

export function shouldFadeHomeworldForeground(
  prop: HomeworldDecorProp,
  actor: HomeworldVec2,
): boolean {
  if (prop.plane !== "front" || !prop.fadeRadius) return false;
  const overlapsInDepth = actor.y <= prop.y + HOMEWORLD_ACTOR.halfDepth * 2;
  return overlapsInDepth && Math.hypot(actor.x - prop.x, (actor.y - prop.y) * .82) < prop.fadeRadius;
}

export interface HomeworldActor {
  x: number;
  y: number;
  vx: number;
  vy: number;
  grounded: boolean;
  facing: -1 | 1;
}

export interface HomeworldInput {
  moveX: number;
  /** Existing input name retained for save/runtime compatibility; it moves in depth. */
  climb: number;
  /** Reserved for a future authored evade. It never changes collision or elevation. */
  jumpPressed: boolean;
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.max(minimum, Math.min(maximum, value));
const finite = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

export function createHomeworldActor(): HomeworldActor {
  return { x: 430, y: 2_210, vx: 0, vy: 0, grounded: true, facing: 1 };
}

function advanceHomeworldActor(current: HomeworldActor, input: HomeworldInput, dt: number): HomeworldActor {
  let axisX = clamp(finite(input.moveX), -1, 1);
  let axisY = clamp(finite(input.climb), -1, 1);
  const magnitude = Math.hypot(axisX, axisY);
  if (magnitude > 1) {
    axisX /= magnitude;
    axisY /= magnitude;
  }
  const intendedX = clamp(current.x + axisX * HOMEWORLD_ACTOR.walkSpeed * dt, 80, HOMEWORLD_WORLD.width - 80);
  const intendedY = clamp(current.y + axisY * HOMEWORLD_ACTOR.depthSpeed * dt, 100, HOMEWORLD_WORLD.height - 100);
  const intended = { x: intendedX, y: intendedY };
  const xOnly = { x: intendedX, y: current.y };
  const yOnly = { x: current.x, y: intendedY };
  let x = current.x;
  let y = current.y;
  if (isHomeworldWalkable(intended)) {
    x = intended.x;
    y = intended.y;
  } else {
    // Axis separation lets the hunter slide along authored walls and corners.
    if (isHomeworldWalkable(xOnly)) x = xOnly.x;
    if (isHomeworldWalkable({ x, y: yOnly.y })) y = yOnly.y;
  }
  return {
    x,
    y,
    vx: (x - current.x) / dt,
    vy: (y - current.y) / dt,
    grounded: true,
    facing: axisX === 0 ? current.facing : axisX < 0 ? -1 : 1,
  };
}

/** Bounded substeps prevent tunnelling through the irregular street outline. */
export function stepHomeworldActor(actor: HomeworldActor, input: HomeworldInput, elapsedSeconds: number): HomeworldActor {
  let remaining = clamp(finite(elapsedSeconds), 0, 1 / 30);
  if (remaining === 0) return actor;
  let next: HomeworldActor = {
    x: clamp(finite(actor.x, 430), 80, HOMEWORLD_WORLD.width - 80),
    y: clamp(finite(actor.y, 2_210), 100, HOMEWORLD_WORLD.height - 100),
    vx: finite(actor.vx),
    vy: finite(actor.vy),
    grounded: true,
    facing: actor.facing === -1 ? -1 : 1,
  };
  if (!isHomeworldWalkable(next)) next = createHomeworldActor();
  while (remaining > 0.000001) {
    const dt = Math.min(remaining, HOMEWORLD_ACTOR.tickSeconds);
    next = advanceHomeworldActor(next, input, dt);
    remaining -= dt;
  }
  return next;
}

export function districtAtHomeworldPosition(point: HomeworldVec2): HomeworldDistrict | null {
  const candidates = HOMEWORLD_DISTRICTS.filter(({ polygon: points }) => pointInHomeworldPolygon(point, points));
  return candidates.sort((left, right) => {
    const leftDistance = Math.hypot(point.x - (left.x + left.width / 2), point.y - (left.y + left.height / 2));
    const rightDistance = Math.hypot(point.x - (right.x + right.width / 2), point.y - (right.y + right.height / 2));
    return leftDistance - rightDistance;
  })[0] ?? null;
}
