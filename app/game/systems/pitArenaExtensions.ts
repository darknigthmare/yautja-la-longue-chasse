import type { PitFirstEditionArenaDefinition, PitFirstEditionArenaId } from "./pitFirstEdition";

/** Explicitly authored neutral-duel extensions. Art review alone never adds an ID here.
 * The first-edition registry and its campaign/chronicle routes remain unchanged.
 */
export const PIT_EXTENSION_ARENA_IDS = [
  "arena-009-quais-du-premier-sang",
  "arena-010-forge-des-lames-muettes",
  "arena-011-reserve-des-crocs",
  "arena-012-balcon-du-roi-de-la-chasse",
  "arena-013-mausolee-des-marques",
  "arena-014-cour-des-navigateurs",
  "arena-015-bastion-des-enforcers",
  "arena-016-terrasse-des-jeunes-sangs",
  "arena-017-puits-des-bannis",
  "arena-018-observatoire-des-lunes",
  "arena-019-porte-des-reserves",
  "arena-020-trone-fracture",
] as const;

export type PitExtensionArenaId = (typeof PIT_EXTENSION_ARENA_IDS)[number];
export type PitRuntimeArenaId = PitFirstEditionArenaId | PitExtensionArenaId;
export interface PitExtensionArenaDefinition extends Omit<PitFirstEditionArenaDefinition, "id"> {
  readonly id: PitExtensionArenaId;
  readonly catalogueNumber: number;
  readonly gameplayProfile: "neutral-duel-v1";
  readonly implementedSectors: 1;
  readonly interactivePropsImplemented: false;
  readonly transitionsImplemented: false;
  readonly sourceInterpretation: "original-project-proposal";
}

const metadata = [
  ["Quais du Premier Sang", "Anneau d'amarrage entre navettes de chasse", "#101924", "#2a3038", "#a7c7cd"],
  ["Forge des Lames Muettes", "Atelier rituel où les marteaux scandent les manches", "#24120e", "#34261f", "#da8e43"],
  ["Réserve des Crocs", "Enclos d'observation sécurisé, sans créature lâchée en classé", "#10221c", "#2a3327", "#a2be76"],
  ["Balcon du Roi de la Chasse", "Esplanade civique dominée par une loge de clan", "#1c1b26", "#352e2e", "#c4ad72"],
  ["Mausolée des Marques", "Crypte d'archives où chaque prise conserve son origine", "#101321", "#292937", "#a1b4ce"],
  ["Cour des Navigateurs", "Place stellaire entourée de balises et cartes holographiques", "#0c1725", "#26303b", "#70c7d8"],
  ["Bastion des Enforcers", "Salle de preuves blindée aux accès symétriques", "#111b26", "#293039", "#c76b59"],
  ["Terrasse des Jeunes Sangs", "Cour d'apprentissage avec obstacles neutralisés", "#282b20", "#403a2b", "#c5b889"],
  ["Puits des Bannis", "Citerne abandonnée devenue cercle clandestin", "#101e1b", "#293a32", "#91b298"],
  ["Observatoire des Lunes", "Dôme ouvert sur trois satellites du monde natal", "#151529", "#2b2e3c", "#a9bfd8"],
  ["Porte des Réserves", "Sas monumental entre cité et terrains de chasse", "#202a21", "#3a3527", "#c7aa68"],
  ["Trône Fracturé", "Salle cérémonielle endommagée par une crise de clan", "#1b141b", "#37242b", "#c29e61"],
] as const;

export const PIT_EXTENSION_ARENAS: Readonly<Record<PitExtensionArenaId, PitExtensionArenaDefinition>> = Object.fromEntries(
  PIT_EXTENSION_ARENA_IDS.map((id, index) => {
    const [name, setting, sky, ground, accent] = metadata[index];
    return [id, {
      id, name, setting, width: 960, height: 540, groundY: 430,
      leftWall: 54, rightWall: 906, spawnX: [300, 660], competitiveHazards: false,
      palette: { sky, ground, accent }, layers: [], catalogueNumber: index + 9,
      gameplayProfile: "neutral-duel-v1", implementedSectors: 1,
      interactivePropsImplemented: false, transitionsImplemented: false,
      sourceInterpretation: "original-project-proposal",
    }];
  }),
) as unknown as Readonly<Record<PitExtensionArenaId, PitExtensionArenaDefinition>>;

export function isPitExtensionArenaId(value: unknown): value is PitExtensionArenaId {
  return typeof value === "string" && Object.hasOwn(PIT_EXTENSION_ARENAS, value);
}

/** Both the immutable catalogue number and exact ID must match the authored extension. */
export function getPitArenaExtension(catalogueId: string, number: number): PitExtensionArenaDefinition | null {
  if (!isPitExtensionArenaId(catalogueId)) return null;
  const arena = PIT_EXTENSION_ARENAS[catalogueId];
  return arena.catalogueNumber === number ? arena : null;
}
