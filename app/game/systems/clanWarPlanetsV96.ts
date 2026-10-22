import type { WarAtlasPointV95, WarAtlasRegionV95, WarAtlasTerritoryV95 } from "./clanWarAtlasV95";
import { WAR_TERRITORIES_V85, type WarTerritoryDefinitionV85 } from "./clanWarV85Data";
import { coastGeographyV97, type WarLandmassV97 } from "./clanWarCoastlinesV97";
import { generatedWarPlanetV102, type WarPlanetProceduralV102 } from "./clanWarPlanetGeneratorV102";

export type WarPlanetSurfaceKindV96 = "water" | "acid" | "ice" | "sand" | "lava" | "brine" | "radioactive" | "crystal" | "spores" | "mist";
export type WarPlanetLandBiomeV96 = "temperate" | "jungle" | "tundra" | "snow" | "desert" | "volcanic" | "salt" | "mountain" | "ocean" | "swamp" | "crystal" | "fungal" | "irradiated";
export interface WarPlanetSurfaceV96 {
  kind: WarPlanetSurfaceKindV96;
  name: string;
  base: string;
  deep: string;
  accent: string;
  detail: string;
}
export interface WarPlanetV96 {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  seed: number;
  style: "classic" | "exotic";
  landBiome: WarPlanetLandBiomeV96;
  surface: WarPlanetSurfaceV96;
  layout: string;
  landFraction: number;
  regions: WarAtlasRegionV95[];
  territories: WarAtlasTerritoryV95[];
  landmasses: WarLandmassV97[];
  definitions: WarTerritoryDefinitionV85[];
  procedural?: WarPlanetProceduralV102;
}

type Layout = "meridians" | "basins" | "plates" | "belts";
interface PlanetDesign {
  id: string; name: string; subtitle: string; description: string;
  surface: WarPlanetSurfaceV96; layout: Layout; columns: number;
  regionNames: string[]; terrain: string[];
}
const surface = (kind: WarPlanetSurfaceKindV96, name: string, base: string, deep: string, accent: string, detail: string): WarPlanetSurfaceV96 => ({ kind, name, base, deep, accent, detail });
const designs: PlanetDesign[] = [
  { id: "korthas", name: "Korthas", subtitle: "Les six dorsales de la chasse", description: "Six terres proches, des détroits courts et les routes historiques de Korthas. Les mers de cobalt restent hors des zones de conquête.", surface: surface("water", "Mers de cobalt", "#164e6d", "#071c35", "#4f9cac", "#b1d9d8"), layout: "meridians", columns: 1, regionNames: [], terrain: [] },
  { id: "thalassa", name: "Thalassa", subtitle: "Archipels aux lagons turquoise", description: "De larges archipels emboîtés entourent des chenaux peu étendus. Les lagons turquoise séparent des côtes faciles à rejoindre.", surface: surface("water", "Lagons turquoise", "#177e8b", "#063957", "#61dfd1", "#cbfff0"), layout: "basins", columns: 3, regionNames: ["Couronne des Marées", "Îles des Nacres", "Caps du Ressac", "Estuaire des Voiles", "Récifs des Veilleurs", "Plateaux de l'Écume"], terrain: ["falaises coralliennes", "terrasses de nacre", "jungle littorale", "caps calcaires", "mangrove haute", "roche battue par les embruns"] },
  { id: "vitriol", name: "Vitriol", subtitle: "Plaques au-dessus de l'acide", description: "Six plateaux crénelés émergent de cuves d'acide vert. Les passages traversent uniquement les détroits balisés entre deux rives proches.", surface: surface("acid", "Acide émeraude", "#628d25", "#173620", "#c6ef43", "#edff9b"), layout: "plates", columns: 2, regionNames: ["Plateaux des Filtres", "Crêtes des Cuves", "Dalles des Soupapes", "Arches du Soufre", "Corniches des Masques", "Remparts des Alambics"], terrain: ["basalte vitrifié", "crêtes sulfurées", "terrasses filtrantes", "dalles étanches", "ravins de soufre", "roche délavée"] },
  { id: "nivalis", name: "Nivalis", subtitle: "Ceintures sous les aurores", description: "Des continents en rubans se suivent entre des banquises crevassées. Les côtes rapprochées forment une chaîne de fronts courts.", surface: surface("ice", "Banquise azurée", "#73aabd", "#204a70", "#bceaf3", "#f1ffff"), layout: "belts", columns: 6, regionNames: ["Ruban des Aurores", "Dorsale des Balises", "Ceinture des Fjords", "Marches du Givre", "Terres des Refuges", "Front des Cristaux"], terrain: ["schiste givré", "toundra pierreuse", "falaise de glace", "moraine compacte", "plateau enneigé", "roche sous les aurores"] },
  { id: "serak", name: "Serak", subtitle: "Dunes aux mers de sable", description: "Six dorsales de pierre coupent les mers de dunes ocre. Les couloirs sableux non jouables restent assez étroits pour relier les régions voisines.", surface: surface("sand", "Mers de dunes ocre", "#ad773f", "#68472e", "#e6b66b", "#ffe0a0"), layout: "meridians", columns: 2, regionNames: ["Dorsale des Ombres", "Éperons de l'Aube", "Falaises du Zénith", "Tables des Caravanes", "Rochers du Couchant", "Crêtes de la Veille"], terrain: ["grès en terrasses", "pierre brûlée", "buttes de quartz", "mesa ocre", "canyon sec", "dalles sablonneuses"] },
  { id: "pyroclaste", name: "Pyroclaste", subtitle: "Bassins de lave et côtes noires", description: "Des blocs volcaniques massifs s'emboîtent autour de fleuves de lave. Les goulets entre les continents rendent chaque front immédiatement accessible.", surface: surface("lava", "Lave incandescente", "#8a3021", "#2b1320", "#ff8d39", "#ffe28d"), layout: "basins", columns: 2, regionNames: ["Couronne des Cendres", "Massif des Fumerolles", "Plateaux du Brasier", "Crêtes du Creuset", "Terres des Scories", "Caps du Magma"], terrain: ["basalte noir", "scories refroidies", "cratères éteints", "cendres compactes", "obsidienne", "coulée solidifiée"] },
  { id: "halycon", name: "Halycon", subtitle: "Salines roses et dalles blanches", description: "De grands plateaux salins se répondent de part et d'autre de saumures roses. Les golfes découpent les côtes sans isoler les fronts.", surface: surface("brine", "Saumure rose", "#a65883", "#4d285f", "#ef9cc1", "#ffe1ef"), layout: "plates", columns: 3, regionNames: ["Tables des Sauniers", "Arches des Salines", "Plaques des Mirages", "Îlots du Cristal Blanc", "Rives des Vasques", "Terrasses de la Rose"], terrain: ["croûte saline", "calcaire blanc", "cristaux de sel", "plateau rose", "roche poreuse", "dalles calcifiées"] },
  { id: "uranth", name: "Uranth", subtitle: "Anneaux de roche et lumière radioactive", description: "Des ceintures rocheuses encerclent des nappes radioactives lumineuses. Des passages courts unissent les terres, tandis que les zones vert acide demeurent impraticables.", surface: surface("radioactive", "Nappes radioactives", "#467b2b", "#132d30", "#a7ff38", "#e8ff9d"), layout: "belts", columns: 6, regionNames: ["Anneau des Dosimètres", "Ceinture des Boucliers", "Terres du Signal Vert", "Marches des Sondes", "Ruban des Blindages", "Dorsale des Réacteurs"], terrain: ["roche plombifère", "béton minéral", "schiste fluorescent", "cuirasse sombre", "crêtes blindées", "quartz irradié"] },
  { id: "amethys", name: "Améthys", subtitle: "Dorsales sur l'océan violet", description: "Des dorsales taillées en aiguilles entourent un océan de cristaux violets. Les détroits sont resserrés et les frontières terrestres très découpées.", surface: surface("crystal", "Océan de cristaux violets", "#6e438d", "#261d50", "#be90ec", "#ecd6ff"), layout: "meridians", columns: 1, regionNames: ["Dorsale des Géodes", "Crêtes des Prismes", "Aiguilles de l'Iris", "Failles des Échos", "Arêtes de l'Améthyste", "Lames du Crépuscule"], terrain: ["quartz violet", "géodes ouvertes", "arêtes cristallines", "schiste irisé", "granit mauve", "prismes émoussés"] },
  { id: "mycelia", name: "Mycélia", subtitle: "Bassins de spores phosphorescentes", description: "Des terres fongiques forment des masses compactes autour de nappes de spores. Les chenaux brillants créent de petits goulets entre les régions.", surface: surface("spores", "Nappes de spores", "#4e6176", "#222847", "#b9d788", "#e2ffbc"), layout: "basins", columns: 3, regionNames: ["Canopée des Sporées", "Plateaux des Hyphes", "Caps des Lanternes", "Forêt des Corolles", "Roches du Mycélium", "Vallées des Veilleuses"], terrain: ["sol fongique ferme", "racines minéralisées", "canopée basse", "roches couvertes de mousses", "terrasses d'hyphes", "corolles géantes"] },
  { id: "nebulis", name: "Nébulis", subtitle: "Terres hautes sur les brumes cyan", description: "Des plateaux étagés émergent d'une brume cyan. Les masses terrestres se font face à courte distance au-dessus des bassins non jouables.", surface: surface("mist", "Brume cyan", "#548398", "#26365e", "#a3dfe6", "#e5ffff"), layout: "plates", columns: 2, regionNames: ["Terrasses des Vigies", "Dalles des Nuées", "Crêtes des Horizons", "Arches des Siffleurs", "Plateaux des Voiles", "Marches de la Brume"], terrain: ["roche humide", "terrasses de schiste", "crêtes balayées", "dalles grises", "mousses bleues", "falaises brumeuses"] },
  { id: "abyssia", name: "Abyssia", subtitle: "Longs continents et fosses indigo", description: "Des continents en ceintures étroites bordent des fosses indigo. Les zones jouables occupent les deux hémisphères et se rejoignent par de courts détroits.", surface: surface("water", "Fosses indigo", "#293f83", "#101a42", "#6a80da", "#b4d7ff"), layout: "belts", columns: 6, regionNames: ["Ceinture des Abysses", "Rives des Profondeurs", "Caps des Balises Bleues", "Marches des Courants", "Ruban des Naufrages", "Terres du Dernier Phare"], terrain: ["falaises sombres", "roches humides", "granit marin", "corail noir", "terrasses d'ardoise", "caps basaltiques"] },
  { id: "chloris", name: "Chloris", subtitle: "Dorsales au-dessus des lacs de chlore", description: "Des dorsales sinueuses découpent des lacs jaune citron. Les côtes voisines gardent des routes courtes au milieu de cette surface corrosive.", surface: surface("acid", "Lacs de chlore citron", "#9d9d30", "#45442d", "#e8ef66", "#ffffbb"), layout: "meridians", columns: 2, regionNames: ["Crêtes des Masques", "Dorsale des Filtres", "Corniches Citron", "Terres des Cuves Jaunes", "Arches du Chlore", "Roches des Purges"], terrain: ["roche soufrée", "grès jauni", "basalte protégé", "calcaire corrodé", "terrasses étanches", "schiste cuivré"] },
  { id: "cryovant", name: "Cryovant", subtitle: "Banquises noires et glace électrique", description: "Six bassins rapprochés entourent de la glace bleue électrique. Le relief forme des péninsules emboîtées, sans continent perdu à l'autre bout du globe.", surface: surface("ice", "Glace électrique", "#3671b5", "#182c57", "#76c8ff", "#dcf6ff"), layout: "basins", columns: 2, regionNames: ["Bassins du Tonnerre", "Caps du Bleu Froid", "Terres des Séracs", "Mâchoires du Glacier", "Plateaux du Givre Noir", "Rives des Aiguilles"], terrain: ["basalte sous glace", "moraine noire", "terrasses gelées", "crêtes de givre", "roche polie", "névé compact"] },
  { id: "ochria", name: "Ochria", subtitle: "Tables de pierre et poussière mauve", description: "Les plateaux rocheux s'imbriquent dans un désert de poussière mauve. De courts couloirs désertiques séparent six régions proches.", surface: surface("sand", "Poussière mauve", "#946485", "#50354f", "#d7a0bc", "#f7cfdd"), layout: "plates", columns: 3, regionNames: ["Tables des Mauves", "Marches des Mirages", "Dalles de l'Ocre", "Crêtes des Poussières", "Arches du Soleil Bas", "Terrasses des Ombres Roses"], terrain: ["grès violacé", "pierre ocre", "mesa pourpre", "dalles striées", "argile durcie", "quartz rose"] },
  { id: "obsidra", name: "Obsidra", subtitle: "Ceintures de basalte et lave bleue", description: "Des ceintures de basalte noir divisent une lave bleue extraterrestre. Les détroits et passages sont rapprochés autour de tout le globe.", surface: surface("lava", "Lave bleue", "#255b9f", "#152344", "#50baff", "#bcf3ff"), layout: "belts", columns: 6, regionNames: ["Ruban de l'Obsidienne", "Ceinture du Brasier Bleu", "Marches des Éclats", "Terres des Fournaises", "Dorsale des Verres", "Caps du Feu Froid"], terrain: ["obsidienne noire", "coulée vitrifiée", "scories bleues", "basalte nervuré", "roche fendue", "cendres compactes"] },
  { id: "salarka", name: "Salarka", subtitle: "Dorsales de sel et saumures ambrées", description: "Six longues terres salines se suivent autour de saumures ambrées. Le relief dessine des éperons et des goulets courts.", surface: surface("brine", "Saumure ambrée", "#9f6d35", "#583426", "#e9b75b", "#ffe8a9"), layout: "meridians", columns: 1, regionNames: ["Dorsale du Sel Noir", "Éperons de l'Ambre", "Crêtes des Dépôts", "Terres des Vasques Sèches", "Arêtes des Sauniers", "Caps des Croûtes"], terrain: ["sel noir", "calcaire ambré", "grès salin", "cristaux brunis", "croûte compacte", "schiste saumâtre"] },
  { id: "radixa", name: "Radixa", subtitle: "Bassins irradiés sous les aurores", description: "Des continents compacts entourent des bassins cyan radioactifs. Les failles et les côtes découpées laissent de nombreux fronts voisins.", surface: surface("radioactive", "Bassins cyan irradiés", "#287e84", "#143d51", "#63ffe1", "#c9fff0"), layout: "basins", columns: 3, regionNames: ["Bassins des Balises", "Caps de l'Aurore Verte", "Crêtes des Écrans", "Terres des Capteurs", "Arches des Blindages", "Plateaux des Éclaireurs"], terrain: ["roche phosphorescente", "granit blindé", "quartz cyan", "schiste irradié", "dalles de plomb", "basalte dense"] },
  { id: "prismara", name: "Prismara", subtitle: "Plaques sur les cristaux lilas", description: "De grandes plaques géométriques bordent un désert de cristaux lilas. Des détroits serrés relient leurs longues façades voisines.", surface: surface("crystal", "Cristaux lilas", "#9a75b0", "#46335c", "#d7b2ef", "#f7e3ff"), layout: "plates", columns: 2, regionNames: ["Plaques des Reflets", "Terrasses des Facettes", "Arches des Prismes", "Marches du Spectre", "Dalles des Géodes", "Crêtes des Iris"], terrain: ["granit nacré", "prismes usés", "roche lilas", "arêtes de quartz", "terrasses irisées", "cristal opaque"] },
  { id: "sporion", name: "Sporion", subtitle: "Ceintures vivantes et pollen doré", description: "Des rubans de terres vivantes coupent un océan de pollen doré. Les régions s'enchaînent par des traversées courtes entre les côtes.", surface: surface("spores", "Pollen doré", "#9a8350", "#4d4a35", "#d9d77b", "#fbf6b4"), layout: "belts", columns: 6, regionNames: ["Ceinture des Corolles", "Ruban des Pollens", "Terres des Racines", "Marches des Ombelles", "Dorsale des Spores", "Rives des Lucioles"], terrain: ["racines épaisses", "humus ferme", "mousses dorées", "écorce minéralisée", "canopée rampante", "sol de mycélium"] },
  { id: "aerune", name: "Aérune", subtitle: "Dorsales au-dessus des brumes roses", description: "Des dorsales de pierre s'étirent dans une brume rose. Le dessin des côtes rapproche les zones de départ et les fronts adverses.", surface: surface("mist", "Brumes roses", "#9d749a", "#4c3c64", "#e0aecf", "#ffe6f5"), layout: "meridians", columns: 2, regionNames: ["Dorsale des Nuages Roses", "Crêtes des Hauts Vents", "Arêtes des Vigies", "Terres du Lever Pourpre", "Éperons des Voiles", "Marches des Alizés"], terrain: ["ardoise mauve", "calcaire aérien", "roche humide", "mousses pâles", "dalles balayées", "crêtes nues"] },
  { id: "azurielle", name: "Azurielle", subtitle: "Archipels aux mers laiteuses", description: "De larges terres dentelées encerclent une eau bleu clair presque laiteuse. Les petites mers intérieures offrent des liaisons courtes.", surface: surface("water", "Eau bleu clair", "#6aaebd", "#316b91", "#a6e9eb", "#efffff"), layout: "basins", columns: 2, regionNames: ["Archipel du Lait Bleu", "Caps des Nacres Claires", "Terres des Lagunes", "Massif du Corail Blanc", "Plateaux des Voiles Pâles", "Rives des Étoiles"], terrain: ["calcaire bleu", "corail pâle", "roche nacrée", "terrasses marines", "granit clair", "caps crayeux"] },
  { id: "venefra", name: "Vénéfra", subtitle: "Plaques minérales et acide magenta", description: "Les plateaux minéraux sont sertis dans des lacs d'acide magenta. Des rives voisines et des frontières serrées dessinent des fronts compacts.", surface: surface("acid", "Acide magenta", "#a14485", "#48244c", "#f28dc7", "#ffd0ed"), layout: "plates", columns: 3, regionNames: ["Plaques des Masques Violets", "Arches des Cuves Roses", "Terres des Filtres Noirs", "Crêtes des Vapeurs", "Dalles des Alambics", "Marches du Vitriol"], terrain: ["roche étanche", "basalte magenta", "quartz délavé", "schiste sulfureux", "terrasses minérales", "granit corrodé"] },
  { id: "boralis", name: "Boralis", subtitle: "Ceintures de roche et givre violet", description: "Des ceintures rocheuses bordent une glace violette craquelée. Les six régions occupent les deux hémisphères et se font face à courte distance.", surface: surface("ice", "Givre violet", "#7a78ba", "#34375d", "#bebff0", "#eeeeff"), layout: "belts", columns: 6, regionNames: ["Ceinture de l'Aurore Violette", "Ruban des Refuges Blancs", "Terres des Séracs Mauves", "Marches du Vent Froid", "Dorsale des Neiges", "Rives des Fjords Noirs"], terrain: ["quartz givré", "granit mauve", "moraine violette", "roche polie", "toundra gelée", "terrasses enneigées"] },
  { id: "dunara", name: "Dunara", subtitle: "Dorsales rouges dans les dunes bleues", description: "Des dorsales de grès rouge coupent des mers de dunes bleues. Les couloirs de sable sont courts et chaque terre conserve plusieurs accès.", surface: surface("sand", "Dunes bleues", "#4c7095", "#2b405a", "#87b5d2", "#d1e5ee"), layout: "meridians", columns: 1, regionNames: ["Dorsale des Grès Rouges", "Crêtes du Sable Bleu", "Éperons des Mirages Froids", "Arêtes des Ombres Longues", "Tables du Couchant", "Caps des Dunes Lentes"], terrain: ["grès rouge", "pierre ferrugineuse", "mesa carmin", "quartz enfoui", "ravins secs", "dalles rouillées"] },
  { id: "ignara", name: "Ignara", subtitle: "Bassins de lave violette", description: "Des masses basaltiques compactes sont séparées par de courts bras de lave violette. Des péninsules se répondent et concentrent les fronts de conquête.", surface: surface("lava", "Lave violette", "#673f91", "#281e43", "#b785ed", "#edd1ff"), layout: "basins", columns: 3, regionNames: ["Bassins du Feu Pourpre", "Caps des Cendres Claires", "Massif des Scories Noires", "Terres des Fournaises Violettes", "Arches du Basalte", "Plateaux des Braises"], terrain: ["basalte veiné", "scories violettes", "cendres froides", "obsidienne fendue", "cratères éteints", "lave solidifiée"] },
  { id: "rosalith", name: "Rosalith", subtitle: "Plaques sombres et saumures corail", description: "Six plaques sombres s'imbriquent autour de saumures corail. Les chenaux resserrés multiplient les rencontres entre régions voisines.", surface: surface("brine", "Saumures corail", "#b2706c", "#613c4b", "#f0b095", "#ffe0ca"), layout: "plates", columns: 2, regionNames: ["Plaques des Marais Salins", "Terrasses du Corail Rouge", "Crêtes des Dépôts Roses", "Arches des Vasques Claires", "Terres des Sauniers Noirs", "Marches des Salines Hautes"], terrain: ["schiste sombre", "croûte corail", "sel rouge", "granit brun", "dalles salines", "quartz rose"] },
  { id: "viridia", name: "Viridia", subtitle: "Anneaux sous la lueur radioactive", description: "Des anneaux de terres vert sombre entourent des nappes radioactives jaune électrique. Les bandes rapprochées offrent de nombreux passages courts.", surface: surface("radioactive", "Nappes jaune électrique", "#8c942b", "#313f30", "#e0ff3d", "#f7ffb6"), layout: "belts", columns: 6, regionNames: ["Anneau des Lumières Jaunes", "Ceinture des Sondes Longues", "Ruban des Écrans Noirs", "Terres des Dalles Vertes", "Marches des Capteurs", "Dorsale des Blindages"], terrain: ["roche plombifère", "schiste vert", "quartz fluorescent", "cuirasse minérale", "dalles blindées", "basalte jaune"] },
  { id: "iolexia", name: "Iolexia", subtitle: "Dorsales au-dessus des prismes azur", description: "Des dorsales sinueuses traversent une étendue de prismes bleu clair. Les continents voisins s'emboîtent sans laisser un hémisphère désert.", surface: surface("crystal", "Prismes bleu clair", "#5186b2", "#263d67", "#9edcf3", "#e7fbff"), layout: "meridians", columns: 2, regionNames: ["Dorsale des Prismes Bleus", "Arêtes des Facettes Claires", "Crêtes du Spectre Froid", "Terres des Géodes Azur", "Éperons des Reflets", "Marches du Cristal Mat"], terrain: ["quartz azur", "cristaux mats", "granit bleu", "prismes usés", "roche nacrée", "schiste irisé"] },
  { id: "nyctera", name: "Nyctéra", subtitle: "Bassins nocturnes aux spores violettes", description: "Des terres nocturnes s'emboîtent autour de nappes de spores violettes. Les goulets resserrés et les côtes imbriquées donnent des fronts proches sur toute la planète.", surface: surface("spores", "Spores violettes", "#68517f", "#24243e", "#b39ed6", "#e3d9ff"), layout: "basins", columns: 2, regionNames: ["Bassins des Lanternes Violettes", "Caps des Corolles Noires", "Terres des Racines Lentes", "Canopée du Crépuscule", "Plateaux des Hyphes Clairs", "Rives des Lucioles Bleues"], terrain: ["racines noires", "humus violet", "roche moussue", "mycélium ferme", "écorce fossile", "terrasses fongiques"] },
];

// Hunting environments already represented by the project's galaxy registry
// (jungle, ocean, ice, desert, swamp and volcano), plus the tundra attested in
// the local Predator (2022) #2 stage reference. These original theater names
// do not identify new canonical planets, settlements, species or technology.
type ClassicProfile = Partial<Pick<PlanetDesign, "subtitle" | "description" | "surface" | "regionNames" | "terrain">> & { landBiome: WarPlanetLandBiomeV96 };
const classicProfiles: Record<string, ClassicProfile> = {
  korthas: { landBiome: "temperate" },
  thalassa: { landBiome: "jungle", subtitle: "Jungles littorales et lagons turquoise", description: "De denses jungles littorales couvrent les archipels emboîtés. Mangroves, falaises et courtes traversées de lagons structurent les fronts de chasse." },
  nivalis: { landBiome: "snow" },
  serak: { landBiome: "desert" },
  pyroclaste: { landBiome: "volcanic" },
  halycon: { landBiome: "salt", subtitle: "Salines naturelles et plateaux blancs" },
  nebulis: { landBiome: "mountain", subtitle: "Hautes terres au-dessus des brumes", description: "Des plateaux rocheux et des forêts d'altitude émergent des nappes de brume. Les vallées voisines restent séparées par des traversées courtes.", surface: surface("mist", "Brume des vallées", "#768991", "#3d505c", "#adbfc1", "#e1ebeb") },
  abyssia: { landBiome: "ocean" },
  chloris: { landBiome: "swamp", subtitle: "Marais forestiers et eaux tourbeuses", description: "Des terres forestières solides dominent des marais tourbeux. Les chenaux d'eau sombre et les berges proches créent des passages courts entre les régions.", surface: surface("water", "Eaux tourbeuses", "#526348", "#253c35", "#8d9c6a", "#bec89d"), regionNames: ["Crêtes des Saules", "Dorsale des Joncs", "Corniches des Racines", "Terres des Tourbières", "Arches des Aulnes", "Roches des Roselières"], terrain: ["forêt humide", "berge rocheuse", "racines compactes", "terre tourbeuse ferme", "bois marécageux", "schiste moussu"] },
  cryovant: { landBiome: "tundra", subtitle: "Toundra rocheuse et fjords gelés", description: "Des péninsules de toundra et de rocailles s'emboîtent entre des fjords gelés. Les lichens, les moraines et les rares bosquets couvrent des fronts proches.", surface: surface("ice", "Fjords gelés", "#7a9fad", "#3d647c", "#b4d0d5", "#e6f1ef"), regionNames: ["Bassins des Lichens", "Caps du Vent Froid", "Terres des Moraines", "Mâchoires du Glacier", "Plateaux des Bouleaux Nains", "Rives des Aiguilles"], terrain: ["toundra pierreuse", "lichens ras", "moraine compacte", "crêtes de givre", "bouleaux nains", "roche gelée"] },
  ochria: { landBiome: "desert", subtitle: "Tables de grès et poussière ocre", description: "De grands plateaux de grès et des canyons secs dominent des mers de poussière ocre. De courts couloirs désertiques séparent les régions.", surface: surface("sand", "Poussière ocre", "#a78155", "#624d38", "#d7b782", "#f3dfb7"), regionNames: ["Tables des Grès", "Marches des Mirages", "Dalles de l'Ocre", "Crêtes des Poussières", "Arches du Soleil Bas", "Terrasses des Ombres"], terrain: ["grès ocre", "pierre sableuse", "mesa brune", "dalles striées", "argile durcie", "quartz pâle"] },
  salarka: { landBiome: "salt" },
  aerune: { landBiome: "temperate", subtitle: "Forêts tempérées et vallées brumeuses", description: "Des forêts tempérées, des crêtes et des clairières occupent de longues terres voisines. Les vallées humides sont des surfaces non jouables traversées par des passages courts.", surface: surface("mist", "Brumes forestières", "#778b81", "#3d5550", "#b2c1ae", "#e2ead9"), regionNames: ["Dorsale des Chênes", "Crêtes des Hauts Vents", "Arêtes des Pins", "Terres des Clairières", "Éperons des Brumes", "Marches des Alizés"], terrain: ["forêt tempérée", "sous-bois rocheux", "clairière humide", "pins de crête", "lande boisée", "granit moussu"] },
  azurielle: { landBiome: "ocean" },
  boralis: { landBiome: "snow", subtitle: "Continents enneigés et banquise blanche", description: "Des continents enneigés et des forêts boréales s'étendent entre des banquises blanches. Les six régions couvrent les deux hémisphères et se font face à courte distance.", surface: surface("ice", "Banquise blanche", "#92adb8", "#52718a", "#cbdfe1", "#f7fbf8"), regionNames: ["Ceinture des Aurores", "Ruban des Refuges Blancs", "Terres des Séracs", "Marches du Vent Froid", "Dorsale des Neiges", "Rives des Fjords Noirs"], terrain: ["quartz givré", "forêt boréale", "moraine blanche", "roche polie", "toundra gelée", "terrasses enneigées"] },
  dunara: { landBiome: "desert", subtitle: "Dorsales rouges et dunes dorées", description: "Des dorsales de grès rouge et des mesas coupent des mers de dunes dorées. Les couloirs de sable sont courts et chaque terre conserve plusieurs accès.", surface: surface("sand", "Dunes dorées", "#ad8550", "#68503a", "#d6b47a", "#f4dfa8"), regionNames: ["Dorsale des Grès Rouges", "Crêtes du Sable Doré", "Éperons des Mirages", "Arêtes des Ombres Longues", "Tables du Couchant", "Caps des Dunes Lentes"] },
};
const exoticBiomes: Record<WarPlanetSurfaceKindV96, WarPlanetLandBiomeV96> = { water: "ocean", acid: "swamp", ice: "snow", sand: "desert", lava: "volcanic", brine: "salt", radioactive: "irradiated", crystal: "crystal", spores: "fungal", mist: "mountain" };
const coastalBiomeDescriptions: Record<WarPlanetLandBiomeV96, string> = {
  temperate: "Des forêts tempérées et des crêtes rocheuses occupent les péninsules et les terres intérieures.",
  jungle: "La jungle dense, les mangroves et les falaises littorales bordent des golfes profonds.",
  tundra: "Les lichens et les rocailles de la toundra descendent vers des fjords aux côtes découpées.",
  snow: "Des étendues enneigées et des moraines épousent les caps et les grandes baies gelées.",
  desert: "Des mesas, des canyons secs et des grès sculptés dominent des côtes irrégulières.",
  volcanic: "Le basalte et les coulées refroidies forment de longues péninsules autour des bassins volcaniques.",
  salt: "Des plateaux salins et des terrasses minérales suivent les caps et les baies des continents.",
  mountain: "Les massifs et les forêts d’altitude alternent avec des vallées encaissées et des caps rocheux.",
  ocean: "Des côtes rocheuses, des baies abritées et des presqu’îles découpent de grandes terres maritimes.",
  swamp: "Des marécages, des racines compactes et des berges rocheuses entourent des golfes sinueux.",
  crystal: "Des crêtes cristallines et des géodes jalonnent les péninsules et les côtes aux reflets changeants.",
  fungal: "Les forêts fongiques et les racines minéralisées couvrent des terres aux baies profondes.",
  irradiated: "Des crêtes minérales et des roches irradiées dominent les caps et les bassins lumineux.",
};

const radians = Math.PI / 180;
const territoryId = (index: number) => `CON-T${String(index + 1).padStart(2, "0")}`;
const round = (value: number) => Number(value.toFixed(6));
const wave = (seed: number, index: number) => Math.sin(seed * 0.0137 + index * 2.399963229728653);

// Bays, tapered capes, twin lobes and saw-tooth shores are generated at shared
// mesh vertices. They change land shape without carving unplayable holes into
// a territory or moving its border independently of the neighboring tile.
function coastInset(position: number, seed: number, opposite: boolean): number {
  const phase = opposite ? 0.71 : 0;
  const style = seed % 5;
  if (style === 0) return 0.018 + 0.11 * Math.abs(2 * position - 1) ** 1.5;
  if (style === 1) return 0.018 + 0.10 * Math.sin(position * Math.PI) ** 2;
  if (style === 2) return 0.02 + 0.075 * (1 + Math.sin(position * Math.PI * 3 + phase)) / 2;
  if (style === 3) return 0.018 + 0.105 * Math.sin(position * Math.PI / 2 + phase) ** 2;
  return 0.022 + 0.085 * Math.abs(Math.sin(position * Math.PI * 2 + phase));
}

function placement(layout: Layout, index: number, seed: number) {
  const variation = wave(seed, index) * 0.025;
  if (layout === "meridians") return { longitude: -150 + index * 60, latitude: 0, width: 48 * (1 + variation), height: 140 * (1 - variation / 2) };
  if (layout === "basins") return { longitude: -120 + index % 3 * 120, latitude: index < 3 ? 37 : -37, width: 110 * (1 + variation), height: 64 * (1 - variation / 2) };
  if (layout === "plates") return { longitude: index % 2 ? 90 : -90, latitude: 49 - Math.floor(index / 2) * 49, width: 166 * (1 + variation), height: 40 * (1 - variation / 2) };
  return { longitude: 0, latitude: 60 - index * 24, width: 348 * (1 + variation / 4), height: 20 * (1 - variation / 2) };
}

/** A smooth invertible deformation preserves the separated, non-overlapping
 * continent meshes, but gives every world a different coast and arrangement. */
function deform(point: WarAtlasPointV95, seed: number): WarAtlasPointV95 {
  const [longitude, latitude] = point;
  const phase = (seed % 997) / 997 * Math.PI * 2;
  const longitudeShift = (4 + seed % 7) * Math.sin(latitude * radians * 1.7 + phase) * Math.cos(longitude * radians / 2);
  const latitudeShift = (2 + seed % 5) * Math.sin(longitude * radians + phase) * Math.cos(latitude * radians);
  return [round(longitude + longitudeShift), round(latitude + latitudeShift)];
}

function edgeBend(a: WarAtlasPointV95, b: WarAtlasPointV95, seed: number, amplitude: number): WarAtlasPointV95 {
  const [first, second] = a[0] < b[0] || a[0] === b[0] && a[1] < b[1] ? [a, b] : [b, a];
  const dx = second[0] - first[0], dy = second[1] - first[1], length = Math.hypot(dx, dy);
  const bend = amplitude * Math.sin((first[0] + second[1]) * 0.117 + seed * 0.0031);
  return [(a[0] + b[0]) / 2 + dy / length * bend, (a[1] + b[1]) / 2 - dx / length * bend];
}

function geography(design: PlanetDesign, seed: number) {
  const regions: WarAtlasRegionV95[] = [], territories: WarAtlasTerritoryV95[] = [];
  const rows = 6 / design.columns;
  for (let regionIndex = 0; regionIndex < 6; regionIndex++) {
    const box = placement(design.layout, regionIndex, seed);
    const mesh: WarAtlasPointV95[][] = [];
    for (let row = 0; row <= rows; row++) {
      mesh[row] = [];
      for (let column = 0; column <= design.columns; column++) {
        const u = column / design.columns, v = row / rows;
        const coastSeed = seed + regionIndex * 131;
        const x = box.longitude + (u - 0.5) * box.width + (column === 0 ? coastInset(v, coastSeed, false) : column === design.columns ? -coastInset(v, coastSeed, true) : wave(seed, regionIndex * 37 + row * 11 + column) * 0.045 / design.columns) * box.width;
        const y = box.latitude + (0.5 - v) * box.height + (row === 0 ? -coastInset(u, coastSeed + 7, false) : row === rows ? coastInset(u, coastSeed + 7, true) : wave(seed + 29, regionIndex * 41 + row * 17 + column) * 0.045 / rows) * box.height;
        mesh[row][column] = [x, y];
      }
    }
    const regionId = `CON-REG${String(regionIndex + 1).padStart(2, "0")}`;
    const ids = Array.from({ length: 6 }, (_, localIndex) => territoryId(regionIndex * 6 + localIndex));
    const regionCenter = deform([box.longitude, box.latitude], seed);
    regions.push({ id: regionId, name: design.id === "korthas" ? WAR_TERRITORIES_V85[regionIndex * 6].region.replace(/^CON-REG\d+\s*/, "") : design.regionNames[regionIndex], longitude: regionCenter[0], latitude: regionCenter[1], territoryIds: ids });
    for (let localIndex = 0; localIndex < 6; localIndex++) {
      const row = Math.floor(localIndex / design.columns), column = localIndex % design.columns;
      const a = mesh[row][column], b = mesh[row][column + 1], c = mesh[row + 1][column + 1], d = mesh[row + 1][column];
      const amplitude = Math.min(box.width / design.columns, box.height / rows) * 0.065;
      const edge = (first: WarAtlasPointV95, second: WarAtlasPointV95) => edgeBend(first, second, seed + regionIndex * 13, amplitude);
      const points = [a, edge(a, b), b, edge(b, c), c, edge(c, d), d, edge(d, a)].map(point => deform(point, seed));
      const center = deform([(a[0] + b[0] + c[0] + d[0]) / 4, (a[1] + b[1] + c[1] + d[1]) / 4], seed);
      territories.push({ id: ids[localIndex], regionId, longitude: center[0], latitude: center[1], points });
    }
  }
  return { regions, territories };
}

function angularDistance(a: WarAtlasPointV95, b: WarAtlasPointV95) {
  const dLatitude = (b[1] - a[1]) * radians, dLongitude = (b[0] - a[0]) * radians;
  const haversine = Math.sin(dLatitude / 2) ** 2 + Math.cos(a[1] * radians) * Math.cos(b[1] * radians) * Math.sin(dLongitude / 2) ** 2;
  return 2 * Math.asin(Math.sqrt(Math.max(0, Math.min(1, haversine)))) / radians;
}
/** Distance across the non-playable surface, rather than between town markers. */
export function warPlanetCoastDistanceV96(a: WarAtlasTerritoryV95, b: WarAtlasTerritoryV95): number {
  let shortest = Infinity;
  for (const first of a.points) for (const second of b.points) shortest = Math.min(shortest, angularDistance(first, second));
  return shortest;
}

function localRoutes(territories: WarAtlasTerritoryV95[], seed: number) {
  const neighbors = new Map(territories.map(territory => [territory.id, new Set<string>()]));
  const connect = (a: WarAtlasTerritoryV95, b: WarAtlasTerritoryV95) => { neighbors.get(a.id)!.add(b.id); neighbors.get(b.id)!.add(a.id); };
  for (let first = 0; first < territories.length; first++) for (let second = first + 1; second < territories.length; second++) {
    const a = territories[first], b = territories[second];
    if (a.regionId === b.regionId && a.points.filter(point => b.points.some(other => point[0] === other[0] && point[1] === other[1])).length >= 3) connect(a, b);
  }
  // Neighboring continents gain one to three short crossings. A different mesh
  // changes their endpoints: these are actual engine routes, not painted lines.
  const regionIds = [...new Set(territories.map(territory => territory.regionId))];
  for (let first = 0; first < regionIds.length; first++) for (let second = first + 1; second < regionIds.length; second++) {
    const candidates = territories.filter(territory => territory.regionId === regionIds[first]).flatMap(a => territories.filter(territory => territory.regionId === regionIds[second]).map(b => ({ a, b, distance: warPlanetCoastDistanceV96(a, b) }))).sort((a, b) => a.distance - b.distance || a.a.id.localeCompare(b.a.id) || a.b.id.localeCompare(b.b.id));
    if (candidates[0].distance > 22) continue;
    const count = 1 + ((seed + first * 11 + second * 7) % 3);
    const usedA = new Set<string>(), usedB = new Set<string>();
    for (const candidate of candidates) {
      if (candidate.distance > 22 || usedA.size >= count) break;
      if (usedA.has(candidate.a.id) || usedB.has(candidate.b.id)) continue;
      connect(candidate.a, candidate.b); usedA.add(candidate.a.id); usedB.add(candidate.b.id);
    }
  }
  return neighbors;
}

/** Spherical area of the illustrated lon/lat coastline, including its bends.
 * The integral is independent of the camera and counts every land tile once. */
export function warPlanetLandFractionV96(territories: readonly WarAtlasTerritoryV95[]): number {
  const area = territories.reduce((sum, territory) => sum + Math.abs(territory.points.reduce((integral, point, index) => {
    const next = territory.points[(index + 1) % territory.points.length];
    return integral + (next[0] - point[0]) * radians * (Math.sin(point[1] * radians) + Math.sin(next[1] * radians)) / 2;
  }, 0)), 0);
  return area / (Math.PI * 4);
}

function buildPlanet(input: PlanetDesign, index: number): WarPlanetV96 {
  const classic = classicProfiles[input.id];
  const design: PlanetDesign = { ...input, ...classic };
  const seed = index === 0 ? 8507 : 96017 + index * 7907;
  const original = geography(design, seed);
  const routes = localRoutes(original.territories, seed);
  const { regions } = original;
  const definitions = WAR_TERRITORIES_V85.map((source, territoryIndex) => {
    if (design.id === "korthas") return { ...source, neighbors: [...source.neighbors], income: { ...source.income } };
    const regionIndex = Math.floor(territoryIndex / 6), localIndex = territoryIndex % 6;
    const places = ["Vigie", "Terrasse", "Relais", "Passage", "Atelier", "Redoute"];
    const terrain = design.terrain[localIndex];
    const neighbors = [...routes.get(source.id)!].sort();
    // The workbook's named routes describe Korthas. Reusing e.g. T21's T22
    // convoy hint on a different mesh can advertise a nonexistent connection.
    const adaptRouteText = (text: string) => /\b(?:CON-)?T\d{2}\b/.test(text)
      ? `Liaisons vers ${neighbors.map(id => id.replace("CON-", "")).join(", ")}. Les convois suivent ces routes affichées sur l’atlas.`
      : text;
    return { ...source, name: `${places[localIndex]} · ${regions[regionIndex].name}`, region: `${regions[regionIndex].id} ${regions[regionIndex].name}`, neighbors, terrain, sites: `${source.kind} sur ${terrain}`, defenses: `Relief de ${terrain} ; ${adaptRouteText(source.defenses)}`, capture: adaptRouteText(source.capture), effect: adaptRouteText(source.effect), risk: `Surface voisine impraticable : ${design.surface.name.toLocaleLowerCase("fr")}. ${adaptRouteText(source.risk)}`, income: { ...source.income } };
  });
  const coast = coastGeographyV97({ id: design.id, seed, layout: design.layout, columns: design.columns, regions, definitions });
  const landBiome = classic?.landBiome ?? exoticBiomes[design.surface.kind];
  const description = `${coastalBiomeDescriptions[landBiome]} ${design.surface.name} : la surface entre les terres reste non jouable. ${coast.landmasses.length} continents accueillent six régions administratives ; les routes affichées relient leurs détroits.`;
  return { id: design.id, name: design.name, subtitle: `${coast.landmasses.length} continents · ${design.surface.name}`, description, seed, style: classic ? "classic" : "exotic", landBiome, surface: { ...design.surface }, layout: `${design.layout}-${design.columns}×${6 / design.columns}`, landFraction: warPlanetLandFractionV96(coast.territories), ...coast, definitions };
}

export const DEFAULT_WAR_PLANET_ID_V96 = "korthas";
/** Additional theaters are original game maps. Only Korthas' rules and names
 * come from the V85 workbook; no new lore is attributed to that source. */
export const WAR_PLANETS_V96: readonly WarPlanetV96[] = designs.map(buildPlanet);
const planetsById = new Map(WAR_PLANETS_V96.map(planet => [planet.id, planet]));
export function warPlanetV96(id?: string): WarPlanetV96 | undefined {
  const key = id === undefined ? DEFAULT_WAR_PLANET_ID_V96 : id;
  return planetsById.get(key) ?? (typeof key === "string" ? generatedWarPlanetV102(key) : undefined);
}
