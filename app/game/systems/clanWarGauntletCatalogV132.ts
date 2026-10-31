import source from "../data/clanWarGauntletCatalogV132.json";

/** V132 equipment registry; provenance describes the character/armour source, not a certified
 * closeup of the *individual* wrist computer. No combat advantage is attached to a style. */
export type GauntletEvidenceV132 =
  | "hero-closeup" | "equipment-known" | "design-studio" | "character-only" | "licensed-class";
export type GauntletReadoutV132 = "intel" | "routes" | "medical" | "command" | "supply";
export type HunterRankV132 = "young-blood" | "blooded" | "elite" | "elder";
export type GauntletUnlockV132 = "starter" | `rank:${HunterRankV132}` | `challenge:${string}`;
export type GauntletThemeV132 = "classic" | "urban" | "elder" | "bronze" | "stealth"
  | "scar" | "wolf" | "brutal" | "feral" | "badlands";
export interface GauntletDefinitionV132 {
  readonly id: string;
  readonly name: string;
  readonly source: string;
  readonly medium: string;
  readonly evidence: GauntletEvidenceV132;
  readonly unlock: GauntletUnlockV132;
  readonly theme: GauntletThemeV132;
  readonly readout: GauntletReadoutV132;
  readonly notes: string;
  readonly artBrief: string;
  readonly sourceUrl: string;
  readonly version: string;
  readonly order: number;
}
export interface GauntletPaletteV132 {
  readonly accent: string;
  readonly secondary: string;
  readonly display: string;
  readonly metal: string;
  readonly bevel: string;
  readonly sound: string;
  readonly motion: string;
  readonly scan: "pulse" | "stagger" | "sweep" | "fracture" | "lattice";
}

export const GAUNTLET_CATALOG_V132 = Object.freeze(source.catalog as GauntletDefinitionV132[]);
export const DEFAULT_GAUNTLET_ID_V132 = "jungle-hunter";
export const GAUNTLET_STORAGE_PREFIX_V132 = "yautja.clan-war.gauntlet.equip.v1.";
export const GAUNTLET_UNLOCK_SOURCE_V132 = "profile-rank";
export const GAUNTLET_PALETTES_V132: Readonly<Record<GauntletThemeV132,GauntletPaletteV132>> = {
  classic: {accent:"#71e4dc",secondary:"#b3fff4",display:"#ec4050",metal:"#303a3d",bevel:"#77837e",sound:"dialecte grave à 4 impulsions",motion:"capot à charnière et faisceau montant",scan:"pulse"},
  urban: {accent:"#a2e0e8",secondary:"#f0b58b",display:"#e84e49",metal:"#323e41",bevel:"#aca38d",sound:"séquence rapide à doubles bips",motion:"déploiement compact latéral",scan:"sweep"},
  elder: {accent:"#e2c99c",secondary:"#fcf0bf",display:"#df6455",metal:"#4d4133",bevel:"#b69f79",sound:"résonance basse et écho lent",motion:"panneaux cérémoniels articulés",scan:"lattice"},
  bronze: {accent:"#d7a778",secondary:"#f3d3a0",display:"#ed6453",metal:"#534033",bevel:"#c79c63",sound:"impacts métalliques brefs",motion:"fermeture de segments",scan:"pulse"},
  stealth: {accent:"#7bb2b0",secondary:"#b9e2e1",display:"#d9595d",metal:"#293a3a",bevel:"#6d9492",sound:"bip discret étouffé",motion:"apparition différée",scan:"stagger"},
  scar: {accent:"#aacfb9",secondary:"#f1e8b8",display:"#e35d50",metal:"#474940",bevel:"#a1ab89",sound:"signal de jeune chasseur",motion:"ouverture robuste",scan:"sweep"},
  wolf: {accent:"#9cdbde",secondary:"#f4e3a3",display:"#df5050",metal:"#41484c",bevel:"#a5b6ae",sound:"triplet diagnostique",motion:"déploiement rapide multi-volets",scan:"lattice"},
  brutal: {accent:"#e08c65",secondary:"#fed4a0",display:"#ef524c",metal:"#4a3431",bevel:"#926553",sound:"grave distordu",motion:"impulsion lourde et brève",scan:"fracture"},
  feral: {accent:"#e1b77c",secondary:"#e9e5c5",display:"#a72e2e",metal:"#574a3e",bevel:"#9b8967",sound:"claquement organique étouffé",motion:"écailles et lentilles exposées",scan:"stagger"},
  badlands: {accent:"#d8ad80",secondary:"#f2e0ba",display:"#c73f45",metal:"#4f3b39",bevel:"#ab8e67",sound:"balayage de reconnaissance cristallin",motion:"filigrane lumineux concentrique",scan:"lattice"},
};
const rankOrder: readonly HunterRankV132[] = ["young-blood","blooded","elite","elder"];
export const GAUNTLET_EVIDENCE_LABELS_V132: Readonly<Record<GauntletEvidenceV132,string>> = {
  "hero-closeup":"Référence rapprochée du poignet",
  "equipment-known":"Équipement montré, détails à contrôler",
  "design-studio":"Concept d'atelier de fabrication",
  "character-only":"Personnage identifié, gauntlet à documenter",
  "licensed-class":"Classe licenciée, gauntlet distinct à confirmer",
};
export const GAUNTLET_READOUT_LABELS_V132: Readonly<Record<GauntletReadoutV132,string>> = {
  intel:"Renseignements visibles",routes:"Passages et itinéraires",medical:"État sanitaire",
  command:"Ordres et commandement",supply:"Approvisionnement et lignes",
};
export function gauntletByIdV132(id: string): GauntletDefinitionV132 | undefined {
  return GAUNTLET_CATALOG_V132.find(item=>item.id===id);
}
export function gauntletUnlockedV132(
  id: string, rank: HunterRankV132, earnedChallenges: readonly string[] = []
): boolean {
  const entry = gauntletByIdV132(id);
  if (!entry) return false;
  if (entry.unlock === "starter") return true;
  if (entry.unlock.startsWith("rank:")) {
    const required = entry.unlock.slice(5) as HunterRankV132;
    return rankOrder.indexOf(rank) >= rankOrder.indexOf(required) && rankOrder.indexOf(required) >= 0;
  }
  // Explicit challenge rewards can be granted only by future authoritative campaign hooks.
  return earnedChallenges.includes(entry.unlock.slice(10));
}
export function gauntletUnlockLabelV132(entry: GauntletDefinitionV132, rank: HunterRankV132, earned: readonly string[] = []): string {
  if (entry.unlock === "starter") return "Modèle initial";
  if (gauntletUnlockedV132(entry.id,rank,earned)) return "Débloqué";
  if (entry.unlock.startsWith("rank:")) return `Atelier de clan · rang ${entry.unlock.slice(5)} requis`;
  return "Défi/quête réservé au scénario · déblocage non encore branché";
}
export function normalizeGauntletV132(id: unknown, rank: HunterRankV132, earned: readonly string[] = []): string {
  return typeof id === "string" && gauntletUnlockedV132(id,rank,earned) ? id : DEFAULT_GAUNTLET_ID_V132;
}
export function gauntletStorageKeyV132(hunterSaveCreatedAt: string): string {
  return GAUNTLET_STORAGE_PREFIX_V132 + encodeURIComponent(hunterSaveCreatedAt).slice(0,256);
}
export function parseGauntletPreferenceV132(raw: string | null, hunterSaveCreatedAt: string, rank: HunterRankV132): string {
  if (raw === null || raw.length > 2048) return DEFAULT_GAUNTLET_ID_V132;
  try {
    const payload: unknown = JSON.parse(raw);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return DEFAULT_GAUNTLET_ID_V132;
    const record = payload as Record<string, unknown>;
    if (record.schema !== 1 || record.hunter !== hunterSaveCreatedAt) return DEFAULT_GAUNTLET_ID_V132;
    return normalizeGauntletV132(record.equipped,rank);
  } catch { return DEFAULT_GAUNTLET_ID_V132; }
}
export function serializeGauntletPreferenceV132(hunter: string,id: string,rank: HunterRankV132): string {
  return JSON.stringify({schema:1,hunter,equipped:normalizeGauntletV132(id,rank)});
}
export function gauntletCatalogIntegrityV132(): string[] {
  const issues: string[] = [], ids = new Set<string>();
  for (const item of GAUNTLET_CATALOG_V132) {
    if (ids.has(item.id)) issues.push("Duplicated: "+item.id);
    if (!GAUNTLET_PALETTES_V132[item.theme]) issues.push("Unknown theme: "+item.id);
    if (!item.sourceUrl.startsWith("https://")) issues.push("Missing source: "+item.id);
    if (!/^(starter|rank:(young-blood|blooded|elite|elder)|challenge:[a-z0-9-]+)$/.test(item.unlock)) issues.push("Unrecognized unlock: "+item.id);
    ids.add(item.id);
  }
  if (GAUNTLET_CATALOG_V132[0]?.id !== DEFAULT_GAUNTLET_ID_V132) issues.push("Starter order changed");
  return issues;
}
