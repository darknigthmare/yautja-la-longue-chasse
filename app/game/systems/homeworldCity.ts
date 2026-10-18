/**
 * Authored 2.5D ground plan for the Homeworld city.
 *
 * The simulation uses one continuous oblique street network. No platform,
 * ladder or lift is needed to reach a public service. Render modules, props
 * and character plates are independent so scenery can overlap by depth.
 */

import type { HunterPresetId, HunterBodyMorphId, DreadStyleId, TrophyRecord } from "../types";
import { trophyWallVisualForDefinitionId } from "../trophyVisualRegistry";
import { SHIP_LEVEL_ART } from "../shipInteriorKit";
import { SHIP_LEVEL_ART_V22 } from "../shipInteriorV22";
import { HOMEWORLD_CITY_ART_V54 } from "./homeworldCityArtV54";
import residencesV64 from "../data/homeworldResidencesV64.json";
import lifeV68 from "../data/homeworldLifeV68.json";
import lifeV69 from "../data/homeworldLifeV69.json";
import { HOMEWORLD_BUILDING_ART_V64, HOMEWORLD_PROP_ART_V64, HOMEWORLD_TRANSPORT_ART_V64 } from "./homeworldArtV64";
import { HOMEWORLD_INTERIOR_POINT_IDS_V64,HOMEWORLD_INTERIORS_V64 } from "./homeworldInteriorsV64";
import { homeworldBuildingIdentityV72 } from "./homeworldIdentityV72";
import { homeworldBuildingIdentityV75 } from "./homeworldArchitectureArtV75";
import {homeworldBuildingIdentityV76} from './homeworldArchitectureArtV76';
import {homeworldBuildingIdentityV81} from './homeworldNativeArchitectureV81';
import {HOMEWORLD_BUILDING_PLACEMENT_OFFSETS_V76} from './homeworldBuildingPlacementsV76';
import {homeworldFrontageRecipeV76,homeworldFrontagePlacementV76,homeworldBeaconPlacementV76,homeworldBenchPlacementV76} from './homeworldFrontagePlacementsV76';
import {homeworldFurnitureFootprintV72} from './homeworldFurnitureV72';
import {homeworldExteriorCollisionV76} from './homeworldExteriorDecorV76';
import {homeworldForecourtsV76,HOMEWORLD_FORECOURT_LINKS_V76} from './homeworldForecourtsV76';
import { HOMEWORLD_CONNECTION_WORLD_V72, HOMEWORLD_CONNECTION_STREETS_V72, homeworldConnectionThresholdV72, homeworldConnectionCollisionV72 } from "./homeworldRegionConnectionsV72";
import { HOMEWORLD_GEOMETRY_V64, homeworldProjectGroundV64, homeworldBuildingSpritePlacementV64, homeworldBuildingSpriteScaleV64, homeworldBuildingDoorwayV64, homeworldBuildingFootprintV64, homeworldBuildingGroundFrameV76, homeworldBuildingTouchesV76, homeworldBuildingCoversPaintV76, type HomeworldNativeBuildingArtV64 } from "./homeworldGeometryV64";
export { HOMEWORLD_GEOMETRY_V64, homeworldProjectGroundV64, homeworldUnprojectGroundV64, homeworldBuildingDoorwayV64, homeworldBuildingFootprintV64, homeworldBuildingSpritePlacementV64 } from "./homeworldGeometryV64";

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
  readonly footprint: { readonly width: number; readonly depth: number };
  readonly wallHeight: number;
  readonly entranceKind: "civic" | "domestic";
  readonly artId: keyof typeof HOMEWORLD_BUILDING_ART_V64;
  readonly art: HomeworldNativeBuildingArtV64;
}

/** Relative sprite rectangle for callers with a projected building container. */
export function homeworldBuildingArtPlacement(building: HomeworldBuildingModule) {
  const image = homeworldBuildingSpritePlacementV64(building), anchor = homeworldProjectGroundV64(building);
  return { ...image, left: image.left - (anchor.x - building.width / 2), top: image.top - (anchor.y - building.height) };
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
  readonly artId?: "bench" | "chest" | "locker" | "console" | "workshop" | "cot" | "table" | "rock-plant" | "beacon" | "brazier-v69";
  readonly footprint?: { readonly halfWidth: number; readonly halfDepth: number };
}

const HOMEWORLD_PROP_ART = [
  SHIP_LEVEL_ART.navigationConsole,
  SHIP_LEVEL_ART.foregroundRib,
  ...Object.values(SHIP_LEVEL_ART_V22),
  HOMEWORLD_CITY_ART_V54.beacon,
];

/**
 * The authored box contains the painted silhouette; x/y is its bottom center.
 * Transparent margins stay intact in the source image. Ground collisions and
 * depth sorting continue to use the unchanged authored coordinates and sizes.
 */
export function homeworldPropArtPlacement(prop: HomeworldDecorProp): {
  left: number; top: number; width: number; height: number;
} {
  if (prop.artId) {
    const art = HOMEWORLD_PROP_ART_V64[prop.artId], scale = prop.width / art.alphaBounds.width;
    const p = homeworldProjectGroundV64(prop);
    return { left: p.x - art.pivot.x * scale, top: p.y - art.pivot.y * scale,
      width: art.sourceRect.width * scale, height: art.sourceRect.height * scale };
  }
  const art = HOMEWORLD_PROP_ART.find(candidate => candidate.src === prop.asset);
  if (!art) return { left: prop.x - prop.width / 2, top: prop.y - prop.height, width: prop.width, height: prop.height };
  const bounds = art.alphaBounds;
  const scale = Math.min(prop.width / bounds.width, prop.height / bounds.height);
  return {
    left: prop.x - (bounds.x + bounds.width / 2) * scale,
    top: prop.y - (bounds.y + bounds.height) * scale,
    width: art.sourceWidth * scale,
    height: art.sourceHeight * scale,
  };
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

/** One shared placement contract drives collisions, occlusion and the spatial codex. */
export const HOMEWORLD_PLACEMENT_RULES = {
  projection: "orthographic-south-35",
  anchor: "measured-ground-socket",
  scale: "uniform-native-foundation",
  depth: "ground-y",
  propHalfWidthRatio: .22,
  propMinimumHalfWidth: 18,
  propHalfDepthRatio: .14,
  propMinimumHalfDepth: 10,
  propMaximumHalfDepth: 24,
  buildingFadeOpacity: .32,
  routeGrid: 32,
  routeSample: 4,
  routeClearance: 12,
} as const;
export const HOMEWORLD_WORLD = { width: HOMEWORLD_CONNECTION_WORLD_V72.width, height: HOMEWORLD_CONNECTION_WORLD_V72.height } as const;
export const HOMEWORLD_ACTOR = {
  halfWidth: 24,
  halfDepth: 14,
  height: 100,
  walkSpeed: 330,
  depthSpeed: 260,
  tickSeconds: 1 / 60,
} as const;

export const HOMEWORLD_DISTRICTS_V54: readonly HomeworldDistrict[] = [
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
  district("convoy-works", "Ateliers des convois", "Une cour logistique relie les quais et les forges par le sud. Ce secteur et ses ateliers sont une création originale du projet ; aucun voyage ne se lance ici.", polygon([1_180, 2_460], [1_680, 2_310], [2_850, 2_320], [3_460, 2_610], [3_290, 3_190], [1_560, 3_250], [1_070, 2_950]), "#dca574", "machinery"),
  district("rampart-walk", "Promenade des remparts", "Une voie extérieure relie la citadelle, le bastion et la galerie basse. Architecture et fonction civique sont des adaptations originales, pas une carte officielle de la planète.", polygon([5_290, 910], [5_820, 790], [6_150, 1_230], [6_090, 2_230], [5_700, 2_590], [5_270, 2_390], [5_130, 1_590]), "#91c5bb", "observatory"),
] as const;

const expandGroundV64 = (point: HomeworldVec2): HomeworldVec2 => ({ x: point.x, y: point.y * HOMEWORLD_GEOMETRY_V64.planDepthExpansion });
export const HOMEWORLD_DISTRICTS: readonly HomeworldDistrict[] = HOMEWORLD_DISTRICTS_V54.map(value => district(value.id, value.name, value.description, value.polygon.map(expandGroundV64), value.accent, value.texture));

/** Authored overlaps connect every district without ladders or forced jumps. */
export const HOMEWORLD_STREETS_V54: readonly HomeworldStreet[] = [
  { id: "quay-court", label: "Cour des quais", polygon: polygon([230, 2_090], [390, 1_700], [1_270, 1_760], [1_180, 2_310]), accent: "#d6a66c", kind: "court" },
  { id: "artisan-bend", label: "Route des artisans", polygon: polygon([1_000, 1_790], [1_450, 1_480], [2_650, 1_590], [2_560, 2_150], [1_280, 2_160]), accent: "#86b9a9", kind: "passage" },
  { id: "forge-run", label: "Voie des forges", polygon: polygon([2_360, 1_690], [2_880, 1_510], [3_850, 1_780], [3_720, 2_220], [2_650, 2_180]), accent: "#d97949", kind: "passage" },
  { id: "gallery-descent", label: "Galerie basse", polygon: polygon([3_570, 1_900], [4_210, 1_720], [5_000, 2_000], [4_820, 2_330], [3_720, 2_220]), accent: "#8775ad", kind: "undercity" },
  { id: "trophy-ascent", label: "Rampe des prises", polygon: polygon([760, 1_820], [1_060, 1_520], [1_300, 1_220], [1_020, 1_090], [700, 1_500]), accent: "#c9ae78", kind: "ramp" },
  { id: "memory-ascent", label: "Passage des archives", polygon: polygon([750, 1_250], [1_010, 1_020], [1_350, 690], [1_130, 500], [820, 790]), accent: "#83bbc1", kind: "ramp" },
  { id: "arena-ramp", label: "Rampe du cercle", polygon: polygon([1_450, 1_250], [1_790, 1_020], [2_130, 760], [1_930, 570], [1_570, 850]), accent: "#be8178", kind: "ramp" },
  { id: "central-arc", label: "Arc des clans", polygon: polygon([2_600, 1_600], [2_930, 1_390], [3_420, 1_050], [3_220, 850], [2_720, 1_160]), accent: "#80aab9", kind: "ramp" },
  { id: "citadel-ascent", label: "Voie de l'audience", polygon: polygon([3_750, 1_300], [4_050, 1_080], [4_440, 760], [4_230, 550], [3_820, 850]), accent: "#d6b958", kind: "ramp" },
  { id: "south-quay-link", label: "Quai secondaire · ateliers", polygon: polygon([780, 2_180], [1_040, 2_090], [1_650, 2_620], [1_310, 2_850], [1_010, 2_480]), accent: "#dca574", kind: "passage" },
  { id: "south-forge-link", label: "Retour vers les forges", polygon: polygon([2_890, 2_090], [3_180, 2_050], [3_480, 2_680], [3_100, 2_840]), accent: "#dca574", kind: "passage" },
  { id: "rampart-north-link", label: "Passage haut des remparts", polygon: polygon([4_860, 780], [5_040, 650], [5_720, 1_050], [5_510, 1_320]), accent: "#91c5bb", kind: "ramp" },
  { id: "rampart-middle-link", label: "Traverse du bastion", polygon: polygon([4_850, 1_420], [4_890, 1_180], [5_650, 1_480], [5_560, 1_760]), accent: "#91c5bb", kind: "passage" },
  { id: "rampart-south-link", label: "Retour des galeries", polygon: polygon([4_730, 2_120], [4_870, 1_890], [5_640, 2_220], [5_490, 2_500]), accent: "#91c5bb", kind: "undercity" },
] as const;

export const HOMEWORLD_SPACEPORT_V64 = {
  pad: { id: "clan-landing-pad", x: 660, y: 4560, width: 1000, depth: 760, height: 0 },
  shuttle: { id: "clan-local-shuttle", x: 660, y: 4300, ...HOMEWORLD_TRANSPORT_ART_V64["clan-shuttle"].footprintWorld,
    height: HOMEWORLD_TRANSPORT_ART_V64["clan-shuttle"].heightWorld - HOMEWORLD_TRANSPORT_ART_V64["clan-shuttle"].footprintWorld.depth * HOMEWORLD_GEOMETRY_V64.depthScale },
  terminal: { id: "personal-ship", x: 1280, y: 4400 },
  spawn: { x: 1280, y: 4480 },
  pedestrian: { left: 1200, right: 1400, top: 3450, bottom: 4700 },
  lore: "original-adaptation" as const,
} as const;
const extraStreetsV64: readonly HomeworldStreet[] = [
  { id: "landing-apron", label: "Aire d’atterrissage de la navette", polygon: polygon([160,3800],[1160,3800],[1160,4560],[160,4560]), kind: "court", accent: "#b99b67" },
  { id: "dock-pedestrian-lane", label: "Voie piétonne hors du pad", polygon: polygon([1200,3450],[1400,3450],[1400,4700],[1200,4700]), kind: "passage", accent: "#d6bd8e" },
  { id: "quay-connection", label: "Raccord des quais au spatioport", polygon: polygon([680,3460],[1400,3460],[1400,3700],[680,3700]), kind: "passage", accent: "#d6bd8e" },
  { id: "shuttle-access", label: "Passage du sas de transfert", polygon: polygon([1120,4220],[1260,4220],[1260,4440],[1120,4440]), kind: "passage", accent: "#d6bd8e" },
];

const BUILDING_ASSET_ROOT = "/game/ship-interior/";

export const HOMEWORLD_BUILDINGS_V54 = [
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
  { id: "convoy-workshop", districtId: "convoy-works", label: "Atelier des convois · extérieur", x: 1_760, y: 2_730, width: 520, height: 330, variant: "forge", doorSide: "center", art: HOMEWORLD_CITY_ART_V54.compactRelay },
  { id: "convoy-store", districtId: "convoy-works", label: "Dépôt · extérieur", x: 2_630, y: 2_680, width: 520, height: 330, variant: "hall", doorSide: "center", art: HOMEWORLD_CITY_ART_V54.compactRelay },
  { id: "convoy-south-shelter", districtId: "convoy-works", label: "Abri de cour · extérieur", x: 2_390, y: 3_020, width: 520, height: 330, variant: "hall", doorSide: "center", art: HOMEWORLD_CITY_ART_V54.compactRelay },
  { id: "rampart-north-lodge", districtId: "rampart-walk", label: "Relais haut · extérieur", x: 5_650, y: 1_180, width: 520, height: 330, variant: "hall", doorSide: "center", art: HOMEWORLD_CITY_ART_V54.compactRelay },
  { id: "rampart-watch", districtId: "rampart-walk", label: "Poste des remparts · extérieur", x: 5_840, y: 1_820, width: 520, height: 330, variant: "hall", doorSide: "center", art: HOMEWORLD_CITY_ART_V54.compactRelay },
  { id: "rampart-south-lodge", districtId: "rampart-walk", label: "Relais bas · extérieur", x: 5_610, y: 2_300, width: 520, height: 330, variant: "hall", doorSide: "center", art: HOMEWORLD_CITY_ART_V54.compactRelay },
] as const;

function nativeBuildingV64(seed: { id: string; districtId: string; label: string; x: number; y: number; width: number; depth: number; variant: HomeworldBuildingModule["variant"]; entranceKind: "civic" | "domestic"; artId: keyof typeof HOMEWORLD_BUILDING_ART_V64 }): HomeworldBuildingModule {
  const offset=HOMEWORLD_BUILDING_PLACEMENT_OFFSETS_V76[seed.id];
  if(offset)seed={...seed,x:seed.x+offset.x,y:seed.y+offset.y};
  const nativeV81 = homeworldBuildingIdentityV81(seed.id);
  if(nativeV81) seed={...seed,width:nativeV81.width,depth:nativeV81.depth};
  const identity = nativeV81 ?? homeworldBuildingIdentityV76(seed.id) ?? homeworldBuildingIdentityV72(seed.id) ?? homeworldBuildingIdentityV75(seed.id);
  const art = identity?.art ?? HOMEWORLD_BUILDING_ART_V64[seed.artId], scale = homeworldBuildingSpriteScaleV64({...seed,height:0,art});
  return { ...seed, label: identity?.title ?? seed.label, doorSide: "center", art, height: (art.threshold.y - art.alphaBounds.y) * scale,
    wallHeight: art.wallHeightWorld * seed.width / art.footprintWorld.width, footprint: { width: seed.width, depth: identity?.depth ?? seed.depth } };
}
export const HOMEWORLD_BUILDINGS: readonly HomeworldBuildingModule[] = [
  ...HOMEWORLD_BUILDINGS_V54.map(b => nativeBuildingV64({ ...b, label: b.label.replace(" · extérieur", ""), y: b.y * HOMEWORLD_GEOMETRY_V64.planDepthExpansion,
    width: Math.max(570, b.width), depth: 340, entranceKind: "civic", artId: b.variant === "forge" ? "civic-forge" : "civic-hall" })),
  ...residencesV64.map((b, index) => nativeBuildingV64({ ...b, label: "Maison du clan · " + String(index + 1).padStart(2, "0"),
    variant: "hall", entranceKind: "domestic", artId: b.artId as keyof typeof HOMEWORLD_BUILDING_ART_V64 })),
];
/** Civic and domestic oblique fixtures own the same real volume as their
 * rendered recipe. Front-facing historical bays remain unchanged. */
export const HOMEWORLD_FORECOURTS_V76=homeworldForecourtsV76(HOMEWORLD_BUILDINGS);
export const HOMEWORLD_STREETS: readonly HomeworldStreet[] = [...HOMEWORLD_STREETS_V54.map(street => ({ ...street, polygon: street.polygon.map(expandGroundV64) })), ...extraStreetsV64, ...HOMEWORLD_CONNECTION_STREETS_V72, ...HOMEWORLD_FORECOURTS_V76, ...HOMEWORLD_FORECOURT_LINKS_V76];

export const HOMEWORLD_ANGLED_FRONTAGE_ITEMS_V76=HOMEWORLD_BUILDINGS.flatMap(building=>building.art.groundFrame
  ? homeworldFrontageRecipeV76(building.id,HOMEWORLD_INTERIORS_V64.find(room=>room.buildingId===building.id)!.variant).map((arrangement,index)=>({
    id:`v75-frontage:${building.id}:${index+1}`,artId:arrangement.artId,scale:arrangement.scale,
    ...homeworldFrontagePlacementV76(building,arrangement)})) : []);
const angledFrontageCollidersV76=HOMEWORLD_ANGLED_FRONTAGE_ITEMS_V76.map(item=>({id:item.id,...homeworldFurnitureFootprintV72(item)}));

/** Historical props/data remain available for provenance; V64 renders new native instances only. */
export const HOMEWORLD_LEGACY_PROPS_V54: readonly HomeworldDecorProp[] = [
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
  ...[
    ["port", 860, 1930], ["market", 1240, 1950], ["forges", 2820, 2060], ["undercity", 4730, 2280],
    ["esplanade", 1390, 1500], ["terraces", 1970, 1380], ["clans", 3180, 1490], ["enforcers", 4880, 1520],
    ["memory", 1540, 890], ["arenas", 2030, 860], ["temple", 3650, 800], ["citadel", 4760, 1000],
    ["convoy-works", 1510, 2910], ["convoy-works", 3060, 2920], ["rampart-walk", 5490, 1360], ["rampart-walk", 5770, 2050],
  ].map(([districtId, x, y], index): HomeworldDecorProp => ({
    id: `wayfinding-beacon-${index + 1}`, districtId: String(districtId), x: Number(x), y: Number(y),
    width: 76, height: 128, asset: HOMEWORLD_CITY_ART_V54.beacon.src, plane: "ground",
  })),
] as const;

export const HOMEWORLD_POINT_POSITIONS_V54 = {
  "personal-ship": { x: 400, y: 2_220 },
  "dock-officer-point": { x: 690, y: 2_080 },
  "suspect-trophy-point": { x: 1_040, y: 1_970 },
  "market-service": { x: 1_600, y: 1_970 },
  "forge-service": { x: 3_060, y: 2_020 },
  "witness-point": { x: 4_520, y: 2_190 },
  "trophy-service": { x: 910, y: 1_430 },
  "mausoleum-service": { x: 1_130, y: 1_360 },
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

const relocatedRegionsV64: Readonly<Record<string, HomeworldVec2>> = {
  "region-storm-chain": { x: 3840, y: 800 }, "region-cold-crown": { x: 4940, y: 820 }, "region-forbidden-reserve": { x: 4920, y: 1880 },
};
export const HOMEWORLD_POINT_POSITIONS = Object.fromEntries(Object.entries(HOMEWORLD_POINT_POSITIONS_V54).map(([id, p]) => [id,
  id === "personal-ship" ? HOMEWORLD_SPACEPORT_V64.terminal : (id.startsWith("region-") ? homeworldConnectionThresholdV72(id.slice(7)) : null) ?? relocatedRegionsV64[id] ?? expandGroundV64(p)])) as Record<keyof typeof HOMEWORLD_POINT_POSITIONS_V54, HomeworldVec2>;
/** Populated with measured V64 atlas instances after the native art registry is frozen. */
function nativePropV64(id: string, districtId: string, artId: keyof typeof HOMEWORLD_PROP_ART_V64, x: number, y: number): HomeworldDecorProp {
  const art = HOMEWORLD_PROP_ART_V64[artId];
  return { id, districtId, artId, x, y, width: art.alphaBounds.width * art.scaleWorldPerPixel,
    height: art.heightWorld, asset: art.src, plane: "ground",
    footprint: { halfWidth: art.footprintWorld.width / 2, halfDepth: art.footprintWorld.depth / 2 } };
}
/** Ground-front pivots, not decorative screen rectangles. All legacy props remain archived above. */
export const HOMEWORLD_PROPS: readonly HomeworldDecorProp[] = [
  // The historical citadel brazier's north-west support was 11.77 units beyond
  // the real district edge. A twelve-unit inward shift seats its whole 96×50
  // base; the original data, native PNG, scale, identity and collider stay intact.
  ...(lifeV69.decorations ?? []).map(prop => prop.id === "life-v69-brazier-citadel" ? { ...prop, y: prop.y + 12 } : prop) as HomeworldDecorProp[],
  ...lifeV68.decorations as HomeworldDecorProp[],
  ...HOMEWORLD_BUILDINGS.filter(building => building.entranceKind === "civic").map(building => {
    const position=homeworldBeaconPlacementV76(building);
    return nativePropV64(`beacon-v64-${building.id}`, building.districtId, "beacon", position.x, position.y);
  }),
  ...["market-armory", "trophy-mausoleum", "training-hall", "rampart-north-lodge"].map(id => {
    const building = HOMEWORLD_BUILDINGS.find(candidate => candidate.id === id)!;
    const position=homeworldBenchPlacementV76(building);
    return nativePropV64(`bench-v64-${id}`, building.districtId, "bench", position.x, position.y);
  }),
  nativePropV64("port-cargo-v64", "port", "chest", 1080, 4500),
  ...["rite-sanctum", "clan-lodge"].map(id => {
    const building = HOMEWORLD_BUILDINGS.find(candidate => candidate.id === id)!;
    return nativePropV64(`garden-v64-${id}`, building.districtId, "rock-plant", building.x + (id === "rite-sanctum" ? 350 : -175), building.y + (id === "rite-sanctum" ? 9 : 150));
  }),
];

const GENERIC_BODY_ROOT = "/game/assets/v3/actors/yautja/hunter/body/";

/** Original city inhabitants use neutral modular bodies, never another named hunter's plate. */
export const HOMEWORLD_NPC_PLATES: Readonly<Record<string, string>> = {
  "dock-officer": GENERIC_BODY_ROOT + "classic/full.webp",
  "market-artisan": GENERIC_BODY_ROOT + "huntress/full.webp",
  "forge-artisan": GENERIC_BODY_ROOT + "huntress/full.webp",
  "undercity-witness": GENERIC_BODY_ROOT + "young/full.webp",
  "trophy-herald": GENERIC_BODY_ROOT + "elder/full.webp",
  "terrace-instructor": GENERIC_BODY_ROOT + "classic/full.webp",
  "clan-healer": GENERIC_BODY_ROOT + "huntress/full.webp",
  "enforcer-captain": GENERIC_BODY_ROOT + "super/full.webp",
  "memory-keeper": GENERIC_BODY_ROOT + "elder/full.webp",
  "arena-steward": GENERIC_BODY_ROOT + "classic/full.webp",
  "rite-keeper": GENERIC_BODY_ROOT + "huntress/full.webp",
  "hunt-king": GENERIC_BODY_ROOT + "elder/full.webp",
} as const;

export const HOMEWORLD_GENERIC_HUNTER_PLATES = {
  hunter: GENERIC_BODY_ROOT + "young/full.webp",
  huntress: GENERIC_BODY_ROOT + "huntress/full.webp",
} as const;

/** Existing V3 clothing is a transparent overlay, never a substitute for a body. */
export function homeworldNpcModules(npcId: string): { morphId: HunterBodyMorphId; dreadStyleId: DreadStyleId } {
  const body = HOMEWORLD_NPC_PLATES[npcId] ?? HOMEWORLD_GENERIC_HUNTER_PLATES.hunter;
  const morphId = body.slice(GENERIC_BODY_ROOT.length).split("/")[0] as HunterBodyMorphId;
  return { morphId, dreadStyleId: morphId === "elder" ? "elder" : morphId === "huntress" ? "huntress" : morphId === "super" ? "veteran" : "classic" };
}

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

export const HOMEWORLD_NPC_COLLIDERS = NPC_POINT_IDS.filter(id => !HOMEWORLD_INTERIOR_POINT_IDS_V64.has(id)).map((id) => ({
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
export const HOMEWORLD_LEGACY_POINT_PROP_COLLIDERS_V54 = POINT_PROP_COLLIDER_BLUEPRINTS.map((entry) => {
  const position = HOMEWORLD_POINT_POSITIONS[entry.id as keyof typeof HOMEWORLD_POINT_POSITIONS];
  return {
    id: entry.id,
    x: position.x + entry.offsetX,
    y: position.y,
    radiusX: entry.radiusX,
    radiusY: entry.radiusY,
  };
});
/** Station artwork and solid volume share their native forward ground pivot. */
export const HOMEWORLD_OUTDOOR_POINT_ART_V64 = Object.entries(HOMEWORLD_POINT_POSITIONS)
  .filter(([id]) => id === "personal-ship")
  .map(([id, point]) => {
    const artId = id === "personal-ship" ? "console" as const : "beacon" as const;
    const art = HOMEWORLD_PROP_ART_V64[artId];
    return { id, ...point, artId, asset: art.src, height: art.heightWorld, width: art.alphaBounds.width * art.scaleWorldPerPixel,
      footprint: { halfWidth: art.footprintWorld.width / 2, halfDepth: art.footprintWorld.depth / 2 } };
  });
export const HOMEWORLD_POINT_PROP_COLLIDERS = HOMEWORLD_OUTDOOR_POINT_ART_V64.map(point => ({
  id: point.id, x: point.x, y: point.y - point.footprint.halfDepth,
  radiusX: point.footprint.halfWidth, radiusY: point.footprint.halfDepth,
}));

export const HOMEWORLD_TROPHY_SLOTS_V54 = [
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

export const HOMEWORLD_TROPHY_SLOTS = HOMEWORLD_TROPHY_SLOTS_V54.map(slot => ({ ...slot, y: slot.y * HOMEWORLD_GEOMETRY_V64.planDepthExpansion }));

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
    [-halfWidth, -halfDepth], [halfWidth, -halfDepth],
    [-halfWidth, halfDepth], [halfWidth, halfDepth],
  ];
  return samples.every(([x, y]) => isTerrainPoint({ x: point.x + x, y: point.y + y }));
}

/** Route target is the accessible approach, not the painted opening inside a solid wall. */
export function homeworldBuildingDoorPosition(building: HomeworldBuildingModule): HomeworldVec2 {
  return homeworldBuildingDoorwayV64(building).approach;
}
export function homeworldBuildingCollision(building: HomeworldBuildingModule) {
  const footprint = homeworldBuildingFootprintV64(building);
  return { ...footprint, thresholdTop: building.y } as const;
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
    if(building.art.groundFrame){
      if(!homeworldBuildingTouchesV76(building,point,safeFootprint))continue;
      const frame=homeworldBuildingGroundFrameV76(building),local=frame.local(point),door=homeworldBuildingDoorwayV64(building);
      const along=Math.abs(frame.tangent.x)*safeFootprint.halfWidth+Math.abs(frame.tangent.y)*safeFootprint.halfDepth;
      const across=Math.abs(frame.normal.x)*safeFootprint.halfWidth+Math.abs(frame.normal.y)*safeFootprint.halfDepth;
      if(Math.abs(local.u)+along<=door.clearWidth/2&&local.v-across>=0)continue;
      return {kind:'building',id:building.id};
    }
    const entirelyInDoor = point.x - safeFootprint.halfWidth >= collision.doorLeft
      && point.x + safeFootprint.halfWidth <= collision.doorRight;
    const insideThreshold = point.y - safeFootprint.halfDepth >= collision.thresholdTop;
    if (!(entirelyInDoor && insideThreshold)) return { kind: "building", id: building.id };
  }
  const shuttle = HOMEWORLD_SPACEPORT_V64.shuttle;
  for(const item of angledFrontageCollidersV76){
    if(rectangleTouchesFootprint(point,safeFootprint,item.left,item.right,item.top,item.bottom))return {kind:'prop',id:item.id};
  }
  if (rectangleTouchesFootprint(point, safeFootprint, shuttle.x - shuttle.width / 2, shuttle.x + shuttle.width / 2, shuttle.y - shuttle.depth, shuttle.y)) return { kind: "prop", id: shuttle.id };
  for (const prop of HOMEWORLD_PROPS) {
    if (prop.plane !== "ground") continue;
    const halfPropWidth = prop.footprint?.halfWidth ?? Math.max(HOMEWORLD_PLACEMENT_RULES.propMinimumHalfWidth, prop.width * HOMEWORLD_PLACEMENT_RULES.propHalfWidthRatio);
    const halfPropDepth = prop.footprint?.halfDepth ?? Math.max(HOMEWORLD_PLACEMENT_RULES.propMinimumHalfDepth, Math.min(HOMEWORLD_PLACEMENT_RULES.propMaximumHalfDepth, prop.height * HOMEWORLD_PLACEMENT_RULES.propHalfDepthRatio));
    if (rectangleTouchesFootprint(
      point,
      safeFootprint,
      prop.x - halfPropWidth,
      prop.x + halfPropWidth,
      prop.y - halfPropDepth * (prop.artId ? 2 : 1),
      prop.y + (prop.artId ? 0 : halfPropDepth),
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
  const exteriorDecorId=homeworldExteriorCollisionV76(point,safeFootprint);
  return exteriorDecorId ? {kind:'prop',id:exteriorDecorId} : homeworldConnectionCollisionV72(point, safeFootprint);
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
    const opening = homeworldBuildingDoorwayV64(building), door = opening.approach;
    if(building.art.groundFrame){
      const frame=homeworldBuildingGroundFrameV76(building),local=frame.local(point);
      const along=Math.abs(frame.tangent.x)*HOMEWORLD_ACTOR.halfWidth+Math.abs(frame.tangent.y)*HOMEWORLD_ACTOR.halfDepth;
      const across=Math.abs(frame.normal.x)*HOMEWORLD_ACTOR.halfWidth+Math.abs(frame.normal.y)*HOMEWORLD_ACTOR.halfDepth;
      if(Math.abs(local.u)>opening.clearWidth/2-along||local.v<across
        ||local.v>HOMEWORLD_GEOMETRY_V64.doorApproachDistance+35||!isHomeworldWalkable(point))continue;
      const candidate=Math.hypot(point.x-door.x,point.y-door.y);
      if(candidate<distance){distance=candidate;nearest=building;}continue;
    }
    // The interaction uses the same traversable south opening as the collider.
    // Merely standing near the back or a side wall never opens an interior.
    if (Math.abs(point.x - opening.threshold.x) > Math.max(0, opening.clearWidth / 2 - HOMEWORLD_ACTOR.halfWidth)
      || point.y < opening.threshold.y + HOMEWORLD_ACTOR.halfDepth
      || point.y > door.y + 35 || !isHomeworldWalkable(point)) continue;
    const candidate = Math.hypot(point.x - door.x, point.y - door.y);
    if (candidate < distance) { distance = candidate; nearest = building; }
  }
  return nearest;
}

/** Painted bounds exclude transparent atlas padding; they never alter the physical footprint. */
export function homeworldBuildingVisibleBoundsV72(building: HomeworldBuildingModule) {
  const image = homeworldBuildingSpritePlacementV64(building), art = building.art;
  if (!art) return image;
  const scale = image.width / (art.sourceRect?.width ?? art.sourceWidth);
  return { left: image.left + art.alphaBounds.x * scale, top: image.top + art.alphaBounds.y * scale,
    width: art.alphaBounds.width * scale, height: art.alphaBounds.height * scale };
}

/** Fade the painted facade only while it covers the hunter on the rear ground plane. */
export function homeworldBuildingRenderDepthV76(building:HomeworldBuildingModule,actor?:HomeworldVec2):number {
  if(!building.art.groundFrame)return building.y;
  const frame=homeworldBuildingGroundFrameV76(building),x=Math.min(frame.frontRight.x,Math.max(frame.frontLeft.x,actor?.x??building.x));
  return frame.frontLeft.y+(x-frame.frontLeft.x)*(frame.frontRight.y-frame.frontLeft.y)/(frame.frontRight.x-frame.frontLeft.x);
}
export function shouldFadeHomeworldBuilding(building: HomeworldBuildingModule, actor: HomeworldVec2): boolean {
  const p = homeworldProjectGroundV64(actor), image = homeworldBuildingVisibleBoundsV72(building);
  return actor.y < homeworldBuildingRenderDepthV76(building,actor) && p.x + HOMEWORLD_ACTOR.halfWidth > image.left && p.x - HOMEWORLD_ACTOR.halfWidth < image.left + image.width
    && p.y > image.top && p.y - HOMEWORLD_ACTOR.height < image.top + image.height
    && (!building.art.opaqueRowsV76||homeworldBuildingCoversPaintV76(building,actor,HOMEWORLD_ACTOR));
}

/** Ship art is a foreground occluder at its ground pivot; fading never changes its service or collider. */
export function shouldFadeHomeworldShip(ship: HomeworldVec2, actor: HomeworldVec2): boolean {
  return Math.abs(actor.x - ship.x) < 210 + HOMEWORLD_ACTOR.halfWidth
    && actor.y <= ship.y + HOMEWORLD_ACTOR.halfDepth
    && actor.y > ship.y - 255;
}

/** Road paint belongs to the ground plane, not to scenery depth or physical collision. */
export const HOMEWORLD_WAYMARKS_V54 = [
  { id: "port-south", x: 1_080, y: 2_380, angle: 35, label: "ATELIERS ↓" },
  { id: "works-west", x: 1_470, y: 2_630, angle: -145, label: "QUAIS ↖" },
  { id: "works-east", x: 3_230, y: 2_560, angle: -110, label: "FORGES ↑" },
  { id: "forge-south", x: 3_140, y: 2_230, angle: 65, label: "ATELIERS ↓" },
  { id: "rampart-north", x: 5_260, y: 1_010, angle: 25, label: "REMPARTS ↘" },
  { id: "rampart-middle", x: 5_270, y: 1_550, angle: 20, label: "REMPARTS →" },
  { id: "rampart-south", x: 5_260, y: 2_220, angle: 20, label: "REMPARTS ↗" },
  { id: "rampart-return", x: 5_540, y: 1_560, angle: -160, label: "BASTION ←" },
  { id: "rampart-return-south", x: 5_490, y: 2_360, angle: -150, label: "GALERIES ↖" },
  { id: "memory-lane", x: 1_140, y: 1_040, angle: -55, label: "MÉMOIRE ↑" },
  { id: "arena-lane", x: 1_810, y: 930, angle: -38, label: "ARÈNES ↗" },
  { id: "clan-lane", x: 3_000, y: 1_320, angle: -36, label: "CLANS ↗" },
] as const;

export const HOMEWORLD_WAYMARKS = HOMEWORLD_WAYMARKS_V54.map(mark => ({ ...mark,
  x: mark.id === "works-west" ? 1450 : mark.x, y: mark.y * HOMEWORLD_GEOMETRY_V64.planDepthExpansion }));

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
  /** Hold-to-run. Optional so historical routes and checkpoint callers keep walking. */
  sprinting?: boolean;
}

export const HOMEWORLD_RUN_MULTIPLIER_V81 = 1.8;

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.max(minimum, Math.min(maximum, value));
const finite = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

export function createHomeworldActor(): HomeworldActor {
  return { ...HOMEWORLD_SPACEPORT_V64.spawn, vx: 0, vy: 0, grounded: true, facing: 1 };
}

/** The caller owns its floor, spawn and bounds. Interiors never fall back to a
 * port position, and projected screen coordinates never enter this integrator. */
export function stepHomeworldActorOnFloor(
  actor: HomeworldActor,
  input: HomeworldInput,
  elapsedSeconds: number,
  isWalkable: (point: HomeworldVec2) => boolean,
  fallback: () => HomeworldActor = createHomeworldActor,
): HomeworldActor {
  let remaining = clamp(finite(elapsedSeconds), 0, 1 / 30);
  if (remaining === 0) return actor;
  let next: HomeworldActor = {
    x: finite(actor.x, NaN), y: finite(actor.y, NaN),
    vx: finite(actor.vx), vy: finite(actor.vy), grounded: true,
    facing: actor.facing === -1 ? -1 : 1,
  };
  if (!isWalkable(next)) next = fallback();
  if (!isWalkable(next)) return { ...next, vx: 0, vy: 0 };
  let axisX = clamp(finite(input.moveX), -1, 1), axisY = clamp(finite(input.climb), -1, 1);
  const magnitude = Math.hypot(axisX, axisY);
  if (magnitude > 1) { axisX /= magnitude; axisY /= magnitude; }
  const pace = input.sprinting === true ? HOMEWORLD_RUN_MULTIPLIER_V81 : 1;
  // A running step must sample at least as often along the floor as walking.
  // Thin walls, closed doors and unsupported edges cannot be skipped at speed.
  const motionTick = HOMEWORLD_ACTOR.tickSeconds / pace;
  while (remaining > .000001) {
    const dt = Math.min(remaining, motionTick), before = next;
    const intended = { x: before.x + axisX * HOMEWORLD_ACTOR.walkSpeed * pace * dt, y: before.y + axisY * HOMEWORLD_ACTOR.depthSpeed * pace * dt };
    let x = before.x, y = before.y;
    if (isWalkable(intended)) { x = intended.x; y = intended.y; }
    else {
      if (isWalkable({ x: intended.x, y })) x = intended.x;
      if (isWalkable({ x, y: intended.y })) y = intended.y;
    }
    next = { x, y, vx: (x - before.x) / dt, vy: (y - before.y) / dt,
      facing: axisX === 0 ? before.facing : axisX < 0 ? -1 : 1, grounded: true };
    remaining -= dt;
  }
  return next;
}

/** Whole-body ground collision remains the single authority for world bounds. */
export function stepHomeworldActor(actor: HomeworldActor, input: HomeworldInput, elapsedSeconds: number): HomeworldActor {
  return stepHomeworldActorOnFloor(actor, input, elapsedSeconds, isHomeworldWalkable, createHomeworldActor);
}

export function districtAtHomeworldPosition(point: HomeworldVec2): HomeworldDistrict | null {
  // The apron and the pedestrian approach are connected parts of the port.
  // Their explicit ground polygons also own terrain collision and rendering.
  if (extraStreetsV64.some(street => pointInHomeworldPolygon(point, street.polygon))) return HOMEWORLD_DISTRICTS.find(district => district.id === "port")!;
  const candidates = HOMEWORLD_DISTRICTS.filter(({ polygon: points }) => pointInHomeworldPolygon(point, points));
  return candidates.sort((left, right) => {
    const leftDistance = Math.hypot(point.x - (left.x + left.width / 2), point.y - (left.y + left.height / 2));
    const rightDistance = Math.hypot(point.x - (right.x + right.width / 2), point.y - (right.y + right.height / 2));
    return leftDistance - rightDistance;
  })[0] ?? null;
}
