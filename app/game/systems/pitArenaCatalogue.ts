import { PIT_ARENAS, type PitArenaId } from "./pitCombat";
import { getPitArenaExtension } from "./pitArenaExtensions";

export type PitArenaCatalogueWave =
  | "lore-foundation"
  | "expanded-original"
  | "heritage-study"
  | "long-hunt-original"
  | "pure-duel";

export interface PitArenaCatalogueLayer {
  readonly id: "P0" | "P1" | "P2" | "P3" | "P4" | "P5";
  readonly role: string;
  readonly parallax: number;
}

export interface PitArenaCatalogueEntry {
  readonly number: number;
  readonly id: string;
  readonly name: string;
  readonly setting: string;
  readonly wave: PitArenaCatalogueWave;
  readonly runtimeStatus: "playable" | "concept";
  readonly runtimeArenaId: PitArenaId | null;
  readonly authoredTargetPlanes: 6;
  readonly runtimeVisualPlanes: 0 | 6;
  readonly layers: readonly PitArenaCatalogueLayer[];
  /** Authored target, not shipped sector coverage. */
  readonly sectors: 1 | 2 | 3;
  readonly implementedSectors: 0 | 1;
  readonly interactivePropsImplemented: false;
  readonly transitionsImplemented: false;
  readonly interactiveProps: readonly string[];
  readonly transitionPolicy: {
    readonly carriesBothFighters: true;
    readonly trigger: "confirmed-rupture-or-throw";
    readonly blockedHitCanTrigger: false;
  };
  readonly hazardPolicy: {
    readonly competitive: "neutral";
    readonly arcadeCampaign: "authored-opt-in";
  };
  readonly referenceStudy: string | null;
  readonly rightsNote: "original-project-art" | "composition-study-original-art-required";
}

export const PIT_ARENA_CATALOGUE_LAYERS: readonly PitArenaCatalogueLayer[] = [
  { id: "P0", role: "ciel ou profondeur atmosphérique", parallax: 0.05 },
  { id: "P1", role: "silhouettes et repères lointains", parallax: 0.12 },
  { id: "P2", role: "architecture de fond", parallax: 0.24 },
  { id: "P3", role: "activité médiane et public", parallax: 0.43 },
  { id: "P4", role: "sol de combat, ruptures et props actifs", parallax: 1 },
  { id: "P5", role: "avant-plan occultant avec fondu de lisibilité", parallax: 1.08 },
] as const;

const CONCEPTS = [
  [PIT_ARENAS["the-pit"].name, PIT_ARENAS["the-pit"].setting],
  ["Hall des Trophées", "Galerie cérémonielle dont les vitrines restent hors collision"],
  ["Chaussée de Canopée", "Pont de racines au-dessus d'une jungle de piliers"],
  ["Chambre de Givre", "Sanctuaire froid taillé dans une réserve polaire"],
  ["Cour de Cendre", "Cour volcanique protégée par des écrans thermiques"],
  ["Terrasse de Verre", "Plaques vitrifiées suspendues au-dessus des dunes"],
  ["Pont Abyssal", "Passerelle côtière face à une fosse bioluminescente"],
  ["Tribunal des Ruines", "Place d'une cité ancienne réaffectée au jugement"],
  ["Quais du Premier Sang", "Anneau d'amarrage entre navettes de chasse"],
  ["Forge des Lames Muettes", "Atelier rituel où les marteaux scandent les manches"],
  ["Réserve des Crocs", "Enclos d'observation sécurisé, sans créature lâchée en classé"],
  ["Balcon du Roi de la Chasse", "Esplanade civique dominée par une loge de clan"],
  ["Mausolée des Marques", "Crypte d'archives où chaque prise conserve son origine"],
  ["Cour des Navigateurs", "Place stellaire entourée de balises et cartes holographiques"],
  ["Bastion des Enforcers", "Salle de preuves blindée aux accès symétriques"],
  ["Terrasse des Jeunes Sangs", "Cour d'apprentissage avec obstacles neutralisés"],
  ["Puits des Bannis", "Citerne abandonnée devenue cercle clandestin"],
  ["Observatoire des Lunes", "Dôme ouvert sur trois satellites du monde natal"],
  ["Porte des Réserves", "Sas monumental entre cité et terrains de chasse"],
  ["Trône Fracturé", "Salle cérémonielle endommagée par une crise de clan"],

  ["Marche du Convoi", "Route de cendre bordée de carcasses de transport"],
  ["Lac des Signatures", "Rive où les reflets thermiques brouillent les silhouettes"],
  ["Ravin des Planeurs", "Ponts courts dans un couloir de vents violents"],
  ["Caverne des Vapeurs", "Grottes thermiques aux soupapes lisibles avant activation"],
  ["Corniche du Léviathan", "Rivage cyclopéen battu par une marée de fond"],
  ["Nid des Razorwings", "Plateforme haute parmi des nids désertés"],
  ["Station des Braconniers", "Avant-poste humain saisi puis sécurisé"],
  ["Mât du Vaisseau-Temple", "Pont extérieur d'un croiseur cérémoniel"],
  ["Crypte du Disciple", "Salle de rite étroite aux niches symétriques"],
  ["Jardin des Spores", "Conservatoire fongique sous cloches de quarantaine"],
  ["Cœur de Mangrove", "Racines géantes et eau peu profonde sans ralentissement classé"],
  ["Dorsale du Sandmaw", "Crête désertique ponctuée de vibrations télégraphiées"],
  ["Chantier des Motherships", "Docks verticaux devant des coques en assemblage"],
  ["Archive Interdite", "Dépôt de données ouvert par deux sas opposés"],
  ["Fosse des Cent Masques", "Arène profonde entourée de biomasks votifs"],
  ["Temple de la Double Lune", "Sanctuaire nocturne aux ombres jumelles"],
  ["Écluse des Marais", "Plateforme de pompage dans des roseaux luminescents"],
  ["Cicatrice du Monde", "Faille rocheuse traversée par un ancien pont"],
  ["Nécropole des Chasseurs", "Allée funéraire où aucun trophée n'est attribué au joueur"],
  ["Fonderie Zéro", "Ligne industrielle arrêtée pour le duel"],
  ["Promontoire de Vey", "Ruines militaires au-dessus d'une jungle en guerre"],
  ["Couronne de Glace", "Crête polaire sous une aurore basse"],
  ["Réacteur de Basalte", "Chambre énergétique creusée dans la roche volcanique"],
  ["Pont des Exilés", "Passage suspendu entre deux refuges clandestins"],
  ["Galerie des Serments", "Couloir monumental qui s'ouvre en place de combat"],
  ["Station du Dernier Signal", "Relais spatial où pulse une balise perdue"],
  ["Bassin des Chasses", "Amphithéâtre naturel entouré de pistes anciennes"],
  ["Cale du Vaisseau Perdu", "Soute inclinée avec cargaison arrimée"],
  ["Aiguille des Orages", "Sommet métallique sous des éclairs lointains"],
  ["Porte de l'Audience", "Avant-cour du trône configurée pour un duel officiel"],

  ["Golgotha — étude Jaguar", "Étude de composition pixel art d'un stage AVP Jaguar"],
  ["City in Despair — étude Capcom", "Étude d'une rue urbaine en ruine à lecture arcade"],
  ["Réacteur Aliens — étude Konami", "Étude d'une salle industrielle à plans parallèles"],
  ["Égouts AVP — étude SNES", "Étude de tunnels bas et répétition de voûtes"],
  ["Furnace Alien 3 — étude SNES", "Étude de fournaise à silhouettes orange et noires"],
  ["Entrance Alien Trilogy — étude PS1", "Étude d'un accès militaire en profondeur limitée"],
  ["Temple AVP — étude PC", "Étude d'un temple massif et d'un horizon froid"],
  ["Engineering Alien Resurrection — étude PS1", "Étude d'une ingénierie sombre à balises rouges"],
  ["Sulaco Infestation — étude portable", "Étude d'un couloir militaire lisible en petits pixels"],
  ["Nostromo Mess — étude Isolation", "Étude d'un espace civil rétrofuturiste sous tension"],

  ["Chambre des Échos", "Crypte acoustique où les impacts réveillent des glyphes"],
  ["Serre du Prédateur Blanc", "Jardin froid sous verrière fissurée"],
  ["Porte-Mémoire", "Archive rotative autour d'un anneau de combat"],
  ["Sanctuaire du Fouisseur", "Caverne vitrifiée avec ondulations sous le sol"],
  ["Cimetière des Drones", "Atelier jonché de machines de pistage désactivées"],
  ["Balise de Rabattage", "Site désertique dominé par une antenne clandestine"],
  ["Terrasses de la Première Cité", "Étagement patrimonial aux raccourcis fermés pour le duel"],
  ["Aqueduc des Clans", "Canal surélevé traversant les quartiers bas"],
  ["Salle du Porte-Cendres", "Quartier général d'un prétendant de la campagne"],
  ["Nef des Serpents", "Vaisseau ancien dont les conduites forment des arcs"],
  ["Observatoire du Chasseur Mort", "Dôme abandonné face à une géante gazeuse"],
  ["Réserve de Quarantaine", "Station d'observation sans présenter les xénomorphes comme faune locale"],
  ["Cascade de Résine", "Paroi de jungle prise dans une sève ambrée"],
  ["Pont des Trois Soleils", "Chaussée minérale sous des ombres divergentes"],
  ["Dépôt des Prises Contestées", "Entrepôt scellé lié à l'enquête du Homeworld"],
  ["Atrium des Médiateurs", "Place neutre réservée aux conflits entre maisons"],
  ["Fosse du Tonnerre", "Cratère où des membranes amplifient chaque choc"],
  ["Récif Suspendu", "Arène côtière taillée dans un organisme minéral mort"],
  ["Salle des Routes Stellaires", "Carte galactique projetée derrière un sol sobre"],
  ["Dernier Quai", "Embarcadère d'extraction sous alarme"],

  ["Cercle Obsidienne", "Sol noir mat, deux piliers et aucune interaction compétitive"],
  ["Cercle Ivoire", "Dalle claire à limites très contrastées"],
  ["Cercle Bronze", "Anneau métallique chaud pour lecture de tournoi"],
  ["Cercle Jade", "Pierre verte sombre et lumière latérale stable"],
  ["Cercle Sang", "Dalle rouge désaturée, sans gore ni obstacle"],
  ["Cercle Cobalt", "Plateau froid sous une voûte bleue"],
  ["Cercle Ambre", "Sol translucide et silhouettes lointaines fixes"],
  ["Cercle Cendre", "Pierre grise avec repères de distance gravés"],
  ["Cercle Éclipse", "Arène sombre à liserés lumineux accessibles"],
  ["Cercle Aurore", "Plateforme claire sous voiles atmosphériques"],
  ["Duel des Lames", "Salle symétrique marquée pour le corps à corps"],
  ["Duel des Disques", "Cour large avec repères de retour des projectiles"],
  ["Duel des Filets", "Anneau neutre à grande lisibilité au sol"],
  ["Duel du Plasma", "Plateforme longue avec contraste de trajectoires"],
  ["Duel des Anciens", "Salle sobre entourée de sièges vides"],
  ["Duel des Jeunes Sangs", "Cour d'entraînement sans dégâts environnementaux"],
  ["Duel du Premier Point", "Petit stade pour manches rapides"],
  ["Duel de l'Honneur", "Place officielle sans récompense de campagne"],
  ["Duel du Jugement", "Tribunal symétrique réservé aux finales"],
  ["Le Dernier Cercle", "Arène pure, limites nettes et aucun avantage de côté"],
] as const;

const RUNTIME_ARENAS: readonly PitArenaId[] = [
  "the-pit",
  "trophy-hall",
  "canopy-causeway",
  "frost-chamber",
  "ash-courtyard",
  "glass-terrace",
  "abyssal-bridge",
  "ruins-tribunal",
];

const HERITAGE_REFERENCES = [
  "Alien vs Predator (Atari Jaguar)",
  "Alien vs. Predator (Capcom arcade)",
  "Aliens (Konami arcade)",
  "Alien vs. Predator (SNES)",
  "Alien 3 (SNES)",
  "Alien Trilogy (PlayStation)",
  "Aliens versus Predator (PC)",
  "Alien Resurrection (PlayStation)",
  "Aliens: Infestation (Nintendo DS)",
  "Alien: Isolation",
] as const;

const WAVE_BY_NUMBER = (number: number): PitArenaCatalogueWave => {
  if (number <= 20) return "lore-foundation";
  if (number <= 50) return "expanded-original";
  if (number <= 60) return "heritage-study";
  if (number <= 80) return "long-hunt-original";
  return "pure-duel";
};

const slug = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/(^-|-$)/g, "");

export const PIT_ARENA_CATALOGUE: readonly PitArenaCatalogueEntry[] = CONCEPTS.map(
  ([name, setting], index): PitArenaCatalogueEntry => {
    const number = index + 1;
    const wave = WAVE_BY_NUMBER(number);
    const id = `arena-${String(number).padStart(3, "0")}-${slug(name)}`;
    const extension = getPitArenaExtension(id, number);
    const runtimeArenaId = RUNTIME_ARENAS[index] ?? (extension && Object.hasOwn(PIT_ARENAS, extension.id) ? extension.id : null);
    const playable = runtimeArenaId !== null;
    const referenceIndex = number - 51;
    return {
      number,
      id,
      name,
      setting,
      wave,
      runtimeStatus: playable ? "playable" : "concept",
      runtimeArenaId,
      authoredTargetPlanes: 6,
      runtimeVisualPlanes: playable ? 6 : 0,
      layers: PIT_ARENA_CATALOGUE_LAYERS,
      sectors: wave === "pure-duel" ? 1 : number % 5 === 0 ? 3 : 2,
      implementedSectors: playable ? 1 : 0,
      interactivePropsImplemented: false,
      transitionsImplemented: false,
      interactiveProps: wave === "pure-duel"
        ? []
        : number % 3 === 0
          ? ["rupture de décor confirmée", "prop contextuel télégraphié"]
          : ["prop contextuel télégraphié"],
      transitionPolicy: {
        carriesBothFighters: true,
        trigger: "confirmed-rupture-or-throw",
        blockedHitCanTrigger: false,
      },
      hazardPolicy: {
        competitive: "neutral",
        arcadeCampaign: "authored-opt-in",
      },
      referenceStudy: wave === "heritage-study" ? HERITAGE_REFERENCES[referenceIndex] : null,
      rightsNote: wave === "heritage-study"
        ? "composition-study-original-art-required"
        : "original-project-art",
    };
  },
);

export const PIT_ARENA_CATALOGUE_WAVES = [
  { id: "lore-foundation", label: "Fondations lore", first: 1, last: 20, count: 20 },
  { id: "expanded-original", label: "Extensions originales", first: 21, last: 50, count: 30 },
  { id: "heritage-study", label: "Études héritage", first: 51, last: 60, count: 10 },
  { id: "long-hunt-original", label: "La Longue Chasse", first: 61, last: 80, count: 20 },
  { id: "pure-duel", label: "Arènes de duel pur", first: 81, last: 100, count: 20 },
] as const satisfies readonly {
  id: PitArenaCatalogueWave;
  label: string;
  first: number;
  last: number;
  count: number;
}[];

export const PIT_ARENA_CATALOGUE_SUMMARY = {
  total: PIT_ARENA_CATALOGUE.length,
  playable: PIT_ARENA_CATALOGUE.filter(({ runtimeStatus }) => runtimeStatus === "playable").length,
  concept: PIT_ARENA_CATALOGUE.filter(({ runtimeStatus }) => runtimeStatus === "concept").length,
  targetPlanes: PIT_ARENA_CATALOGUE_LAYERS.length,
} as const;

export function getPitArenaCatalogueEntry(number: number): PitArenaCatalogueEntry | null {
  if (!Number.isInteger(number) || number < 1 || number > PIT_ARENA_CATALOGUE.length) return null;
  return PIT_ARENA_CATALOGUE[number - 1];
}
