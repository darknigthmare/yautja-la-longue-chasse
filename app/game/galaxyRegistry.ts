import type { BiomeId } from "./types";

export type GalaxyBodyType =
  | "planet"
  | "moon"
  | "gas-giant"
  | "station"
  | "asteroid-belt"
  | "anomaly";

export type GalaxyBodyStatus = "active" | "surveyed" | "charted";

export interface GalaxyRegistryPosition {
  x: number;
  y: number;
}

/**
 * Authored orbital coordinates. `radius` is normalized from the star (0) to
 * the outer edge of the system chart (1); angles are expressed in degrees.
 * Inclination lets the renderer project a visibly different orbital plane
 * without inventing astronomy from a body's array index.
 */
export interface GalaxyBodyOrbit {
  radius: number;
  angleDegrees: number;
  inclinationDegrees: number;
}

export interface GalaxyOrbitRingGeometry {
  widthPercent: number;
  heightPercent: number;
}

/** Renderer-facing traits that make every stellar chart visually distinct. */
export interface GalaxySystemVisualProfile {
  backgroundKey: string;
  orbitScale: number;
  orbitEccentricity: number;
  orbitTiltDegrees: number;
  starGlow: string;
}

/**
 * A mapped body exists independently from a hunt. `missionPlanetName` is the
 * only bridge to mission content; a null value means that the body is safe to
 * inspect but does not yet pretend to host a complete contract.
 */
export interface GalaxyBodyRegistryEntry {
  id: string;
  name: string;
  type: GalaxyBodyType;
  status: GalaxyBodyStatus;
  biome: BiomeId;
  environment: string;
  summary: string;
  population: string;
  signal: string;
  hazard: string;
  position: Readonly<GalaxyRegistryPosition>;
  orbit: Readonly<GalaxyBodyOrbit>;
  accent: string;
  missionPlanetName: string | null;
}

export interface GalaxySystemRegistryEntry {
  id: string;
  name: string;
  starName: string;
  starClass: string;
  summary: string;
  position: Readonly<GalaxyRegistryPosition>;
  accent: string;
  visualProfile: Readonly<GalaxySystemVisualProfile>;
  bodies: readonly GalaxyBodyRegistryEntry[];
}

export interface GalaxySectorSystemPlacement {
  systemId: string;
  /** Position inside the sector chart, expressed as a percentage. */
  position: Readonly<GalaxyRegistryPosition>;
}

export interface GalaxySectorRegistryEntry {
  id: string;
  name: string;
  description: string;
  accent: string;
  /** Position on the full galactic chart, expressed as a percentage. */
  position: Readonly<GalaxyRegistryPosition>;
  /** Explicit, authoritative membership and local placement of each system. */
  systems: readonly GalaxySectorSystemPlacement[];
}

const position = (x: number, y: number): Readonly<GalaxyRegistryPosition> =>
  Object.freeze({ x, y });

const orbit = (
  radius: number,
  angleDegrees: number,
  inclinationDegrees: number,
): Readonly<GalaxyBodyOrbit> =>
  Object.freeze({ radius, angleDegrees, inclinationDegrees });

const visualProfile = (
  backgroundKey: string,
  orbitScale: number,
  orbitEccentricity: number,
  orbitTiltDegrees: number,
  starGlow: string,
): Readonly<GalaxySystemVisualProfile> =>
  Object.freeze({
    backgroundKey,
    orbitScale,
    orbitEccentricity,
    orbitTiltDegrees,
    starGlow,
  });

const roundChartCoordinate = (value: number) => Math.round(value * 100) / 100;

/**
 * Keep the compatibility `position` in lockstep with the authored orbit. The
 * star sits at 40/50 in the current system chart and the projection remains
 * inside its safe navigation bounds even for the outermost belts.
 */
export function projectGalaxyOrbit(
  mappedOrbit: Readonly<GalaxyBodyOrbit>,
): Readonly<GalaxyRegistryPosition> {
  const angle = (mappedOrbit.angleDegrees * Math.PI) / 180;
  const geometry = galaxyOrbitRingGeometry(mappedOrbit);
  return position(
    roundChartCoordinate(40 + Math.cos(angle) * (geometry.widthPercent / 2)),
    roundChartCoordinate(50 + Math.sin(angle) * (geometry.heightPercent / 2)),
  );
}

/** Exact ellipse used by both the authored position and the system renderer. */
export function galaxyOrbitRingGeometry(
  mappedOrbit: Readonly<GalaxyBodyOrbit>,
): Readonly<GalaxyOrbitRingGeometry> {
  const inclination = (mappedOrbit.inclinationDegrees * Math.PI) / 180;
  return Object.freeze({
    widthPercent: 72 * mappedOrbit.radius,
    heightPercent: 62 * mappedOrbit.radius * Math.cos(inclination),
  });
}

type GalaxyBodyRegistryInput = Omit<
  GalaxyBodyRegistryEntry,
  "position"
>;

const body = (
  entry: GalaxyBodyRegistryInput,
): Readonly<GalaxyBodyRegistryEntry> =>
  Object.freeze({
    ...entry,
    orbit: Object.freeze(entry.orbit),
    position: projectGalaxyOrbit(entry.orbit),
  });

/**
 * Explicit V9 stellar registry. The ordering is intentional and controls the
 * keyboard route through the chart; it must not be inferred from missions.
 */
export const GALAXY_SYSTEM_REGISTRY = Object.freeze([
  {
    id: "system-oseris",
    name: "Système Oseris",
    starName: "Oseris",
    starClass: "Naine orange K2V",
    summary: "Une étoile ambrée éclaire une biosphère ancienne et les routes minières de Saal.",
    position: position(14, 14),
    accent: "#7be08d",
    visualProfile: visualProfile("oseris-amber-canopy", 0.94, 0.08, -6, "#f5a95c"),
    bodies: Object.freeze([
      body({
        id: "planet-oseris-iv",
        name: "Oseris-IV",
        type: "planet",
        status: "active",
        biome: "jungle",
        environment: "Jungle équatoriale",
        summary: "Monde-canopée où les ruines coloniales disparaissent sous une végétation prédatrice.",
        population: "Colonies humaines dispersées · mégafaune dense",
        signal: "Contrat de chasse confirmé",
        hazard: "Orages tropicaux et lianes constrictrices",
        orbit: orbit(0.48, 205, 3),
        accent: "#78e26e",
        missionPlanetName: "Oseris-IV",
      }),
      body({
        id: "planet-oseris-ii",
        name: "Oseris-II",
        type: "planet",
        status: "surveyed",
        biome: "jungle",
        environment: "Savane de fougères",
        summary: "Steppes chaudes striées de forêts-galeries et de pistes migratoires gigantesques.",
        population: "Troupeaux xénofauniques · balises de prospecteurs",
        signal: "Hurlements cycliques sous les falaises",
        hazard: "Feux de spores saisonniers",
        orbit: orbit(0.28, 28, -2),
        accent: "#b8d45e",
        missionPlanetName: null,
      }),
      body({
        id: "moon-khepri",
        name: "Lune Khepri",
        type: "moon",
        status: "charted",
        biome: "ruins",
        environment: "Lune-temple basaltique",
        summary: "Un ancien relais de clan est enchâssé dans les parois d’un cratère noir.",
        population: "Aucune présence permanente",
        signal: "Balise yautja fragmentaire",
        hazard: "Micrométéorites rasantes",
        orbit: orbit(0.66, 302, 9),
        accent: "#d5b67b",
        missionPlanetName: null,
      }),
      body({
        id: "belt-saal",
        name: "Ceinture Saal",
        type: "asteroid-belt",
        status: "charted",
        biome: "desert",
        environment: "Champ minéral instable",
        summary: "Des milliers de blocs métalliques masquent des excavations abandonnées.",
        population: "Drones miniers autonomes",
        signal: "Échos radar intermittents",
        hazard: "Collisions orbitales imprévisibles",
        orbit: orbit(0.94, 63, -7),
        accent: "#d69a53",
        missionPlanetName: null,
      }),
    ]),
  },
  {
    id: "system-nivalis",
    name: "Système Nivalis",
    starName: "Nivalis",
    starClass: "Étoile blanche A7V",
    summary: "Un soleil blanc baigne des mondes gelés et la géante Boréal d’une lumière dure.",
    position: position(38, 14),
    accent: "#83d7ff",
    visualProfile: visualProfile("nivalis-crystal-halo", 1.08, 0.14, 8, "#dff8ff"),
    bodies: Object.freeze([
      body({
        id: "planet-nivalis-k",
        name: "Nivalis-K",
        type: "planet",
        status: "active",
        biome: "ice",
        environment: "Banquise cryogénique",
        summary: "Une croûte de glace vive recouvre un océan où chasse le Cryostalker.",
        population: "Avant-postes scientifiques isolés",
        signal: "Contrat de chasse confirmé",
        hazard: "Ruptures de banquise et blizzards blancs",
        orbit: orbit(0.46, 142, 8),
        accent: "#9be9ff",
        missionPlanetName: "Nivalis-K",
      }),
      body({
        id: "planet-nivalis-c",
        name: "Nivalis-C",
        type: "planet",
        status: "surveyed",
        biome: "ice",
        environment: "Toundra saline",
        summary: "Des plaines de sel gelé encerclent des cheminées thermales aux couleurs polaires.",
        population: "Colonies microbiennes · grands fouisseurs",
        signal: "Trajectoires souterraines régulières",
        hazard: "Brumes cryocorrosives",
        orbit: orbit(0.24, 325, -4),
        accent: "#77bfe8",
        missionPlanetName: null,
      }),
      body({
        id: "giant-boreal",
        name: "Géante Boréal",
        type: "gas-giant",
        status: "charted",
        biome: "ocean",
        environment: "Géante gazeuse cyan",
        summary: "Ses aurores couvrent un hémisphère entier et perturbent toute visée plasma.",
        population: "Formes flottantes non confirmées",
        signal: "Impulsions électromagnétiques profondes",
        hazard: "Magnétosphère extrême",
        orbit: orbit(0.78, 18, 12),
        accent: "#61c8dc",
        missionPlanetName: null,
      }),
      body({
        id: "moon-kite",
        name: "Lune Kite",
        type: "moon",
        status: "charted",
        biome: "ice",
        environment: "Satellite fracturé",
        summary: "Une lune légère dont les crevasses expulsent des panaches d’azote.",
        population: "Nulle",
        signal: "Balise de détresse ancienne",
        hazard: "Jets cryovolcaniques",
        orbit: orbit(0.92, 226, -11),
        accent: "#c9edff",
        missionPlanetName: null,
      }),
    ]),
  },
  {
    id: "system-cinder",
    name: "Système Cinder",
    starName: "Cinder",
    starClass: "Naine rouge M1V",
    summary: "Une naine rouge alimente des forges naturelles et des carcasses industrielles.",
    position: position(62, 14),
    accent: "#ff704d",
    visualProfile: visualProfile("cinder-forge-dust", 0.88, 0.22, -12, "#ff5a36"),
    bodies: Object.freeze([
      body({
        id: "planet-cinder-12",
        name: "Cinder-12",
        type: "planet",
        status: "active",
        biome: "volcano",
        environment: "Sanctuaire volcanique",
        summary: "Des temples de basalte dominent des rivières de lave et le rite d’un Bad Blood.",
        population: "Récupérateurs armés · faune ignivore",
        signal: "Contrat de chasse confirmé",
        hazard: "Bombes volcaniques et coulées rapides",
        orbit: orbit(0.35, 171, -6),
        accent: "#ff623f",
        missionPlanetName: "Cinder-12",
      }),
      body({
        id: "planet-ferrum-6",
        name: "Ferrum-6",
        type: "planet",
        status: "surveyed",
        biome: "volcano",
        environment: "Désert ferrique",
        summary: "Un monde rouge hérissé de cheminées métalliques et de ravins magnétisés.",
        population: "Prédateurs lithophages",
        signal: "Traces thermiques mobiles sous la rouille",
        hazard: "Tempêtes de limaille conductrice",
        orbit: orbit(0.58, 340, 7),
        accent: "#d97745",
        missionPlanetName: null,
      }),
      body({
        id: "moon-pyre",
        name: "Lune Pyre",
        type: "moon",
        status: "charted",
        biome: "volcano",
        environment: "Lune magmatique",
        summary: "Sa surface noire s’ouvre périodiquement sur un réseau de poches incandescentes.",
        population: "Extrêmophiles silicatés",
        signal: "Battements sismiques synchronisés",
        hazard: "Marées de lave",
        orbit: orbit(0.74, 274, -13),
        accent: "#ff9b55",
        missionPlanetName: null,
      }),
      body({
        id: "belt-forge-ring",
        name: "Anneau Forge",
        type: "asteroid-belt",
        status: "charted",
        biome: "ruins",
        environment: "Anneau industriel brisé",
        summary: "Des segments de fonderies orbitales tournent encore parmi les astéroïdes.",
        population: "Automates de maintenance hostiles",
        signal: "Cycles de production sans destinataire",
        hazard: "Jets de scories orbitales",
        orbit: orbit(0.95, 54, 15),
        accent: "#e2a067",
        missionPlanetName: null,
      }),
    ]),
  },
  {
    id: "system-naraka",
    name: "Système Naraka",
    starName: "Naraka",
    starClass: "Naine jaune G8V",
    summary: "Un système humide noyé dans les émissions verdâtres de sa nébuleuse locale.",
    position: position(86, 14),
    accent: "#75d39a",
    visualProfile: visualProfile("naraka-toxic-veil", 1, 0.18, 13, "#e4d761"),
    bodies: Object.freeze([
      body({
        id: "planet-naraka-delta",
        name: "Naraka-Delta",
        type: "planet",
        status: "active",
        biome: "swamp",
        environment: "Marais acide",
        summary: "Un delta toxique où ruines, mangroves et prédateurs amphibies s’entremêlent.",
        population: "Mercenaires · faune amphibie abondante",
        signal: "Contrat de chasse confirmé",
        hazard: "Crues acides et vase aspirante",
        orbit: orbit(0.32, 214, 10),
        accent: "#66d58d",
        missionPlanetName: "Naraka-Delta",
      }),
      body({
        id: "planet-naraka-theta",
        name: "Naraka-Theta",
        type: "planet",
        status: "surveyed",
        biome: "swamp",
        environment: "Mangrove nocturne",
        summary: "Une planète verrouillée en marée où des forêts noires ceinturent l’océan.",
        population: "Signatures grégaires dans la mangrove",
        signal: "Chants subsoniques après chaque marée",
        hazard: "Brouillard neurotoxique",
        orbit: orbit(0.56, 41, -8),
        accent: "#4eb49a",
        missionPlanetName: null,
      }),
      body({
        id: "moon-blackwater",
        name: "Lune Blackwater",
        type: "moon",
        status: "charted",
        biome: "swamp",
        environment: "Lune océanique sombre",
        summary: "Une mer noire sans continent renvoie très peu de lumière vers Naraka.",
        population: "Bancs bioluminescents",
        signal: "Masse profonde non classée",
        hazard: "Vagues de méthane liquide",
        orbit: orbit(0.72, 288, 17),
        accent: "#4aa7a0",
        missionPlanetName: null,
      }),
      body({
        id: "belt-ghar-wreck-reef",
        name: "Récif d’épaves Ghar",
        type: "asteroid-belt",
        status: "charted",
        biome: "ruins",
        environment: "Champ d’épaves compact",
        summary: "Des coques de multiples espèces ont fusionné autour d’un petit noyau rocheux.",
        population: "Pillards opportunistes",
        signal: "Transpondeurs imitant des appels civils",
        hazard: "Mines dormantes",
        orbit: orbit(0.93, 111, -15),
        accent: "#9ea879",
        missionPlanetName: null,
      }),
    ]),
  },
  {
    id: "system-serekh",
    name: "Système Serekh",
    starName: "Serekh",
    starClass: "Géante orange K1III",
    summary: "Des mondes minéraux et une route de pèlerinage entourent son soleil couleur cuivre.",
    position: position(14, 50),
    accent: "#e7b35d",
    visualProfile: visualProfile("serekh-copper-pilgrimage", 1.12, 0.1, -4, "#ffbf68"),
    bodies: Object.freeze([
      body({
        id: "planet-serekh-9",
        name: "Serekh-9",
        type: "planet",
        status: "active",
        biome: "desert",
        environment: "Désert de verre",
        summary: "Des dunes vitrifiées masquent les galeries du Sandmaw et des caravanes disparues.",
        population: "Caravanes minières · faune fouisseuse",
        signal: "Contrat de chasse confirmé",
        hazard: "Tempêtes de verre et effondrements",
        orbit: orbit(0.52, 156, -3),
        accent: "#eab65a",
        missionPlanetName: "Serekh-9",
      }),
      body({
        id: "planet-serekh-prime",
        name: "Serekh-Prime",
        type: "planet",
        status: "surveyed",
        biome: "desert",
        environment: "Savane ocre",
        summary: "De hautes herbes minérales relient des mesas occupées par de grands chasseurs sociaux.",
        population: "Mégafaune migratrice · campements nomades",
        signal: "Combats rituels observés à distance",
        hazard: "Foudre sèche et incendies rapides",
        orbit: orbit(0.27, 337, 2),
        accent: "#cfa54e",
        missionPlanetName: null,
      }),
      body({
        id: "moon-ossuary",
        name: "Lune Ossuaire",
        type: "moon",
        status: "charted",
        biome: "ruins",
        environment: "Nécropole lunaire",
        summary: "Des cairns extraterrestres couvrent une plaine sans atmosphère.",
        population: "Aucune vie détectée",
        signal: "Résonances provenant des tombeaux",
        hazard: "Poussière électrostatique abrasive",
        orbit: orbit(0.71, 247, 11),
        accent: "#d8c89b",
        missionPlanetName: null,
      }),
      body({
        id: "station-pilgrim-relay",
        name: "Relais du Pèlerin",
        type: "station",
        status: "charted",
        biome: "ruins",
        environment: "Relais de transit ancien",
        summary: "Une station neutre transmet encore les règles de passage de civilisations disparues.",
        population: "Marchands itinérants",
        signal: "Canal diplomatique automatique",
        hazard: "Systèmes de défense sensibles aux armes",
        orbit: orbit(0.91, 72, -10),
        accent: "#8bd6c8",
        missionPlanetName: null,
      }),
    ]),
  },
  {
    id: "system-pelagos",
    name: "Système Pelagos",
    starName: "Pelagos",
    starClass: "Étoile bleu-blanc B9V",
    summary: "Un système bleu d’océans globaux, de tempêtes géantes et de constructions abyssales.",
    position: position(38, 50),
    accent: "#58cbe8",
    visualProfile: visualProfile("pelagos-abyssal-blue", 1.05, 0.06, 5, "#8bdcff"),
    bodies: Object.freeze([
      body({
        id: "planet-pelagos-m",
        name: "Pelagos-M",
        type: "planet",
        status: "active",
        biome: "ocean",
        environment: "Archipel abyssal",
        summary: "Quelques arches récifales dominent un océan global parcouru par le Léviathan.",
        population: "Faune récifale bioluminescente",
        signal: "Contrat de chasse confirmé",
        hazard: "Vagues scélérates et évents abyssaux",
        orbit: orbit(0.31, 194, 4),
        accent: "#4dd4e9",
        missionPlanetName: "Pelagos-M",
      }),
      body({
        id: "planet-thalassa-8",
        name: "Thalassa-8",
        type: "planet",
        status: "surveyed",
        biome: "ocean",
        environment: "Mer d’îles flottantes",
        summary: "Des radeaux végétaux migrent entre des cyclones quasi permanents.",
        population: "Prédateurs aériens · colonies pélagiques",
        signal: "Vols coordonnés au-dessus de l’équateur",
        hazard: "Cyclones hypercane",
        orbit: orbit(0.54, 9, -6),
        accent: "#66b9da",
        missionPlanetName: null,
      }),
      body({
        id: "giant-tempest",
        name: "Géante Tempest",
        type: "gas-giant",
        status: "charted",
        biome: "ocean",
        environment: "Géante gazeuse cobalt",
        summary: "Ses bandes nuageuses engendrent des éclairs visibles depuis tout le système.",
        population: "Biosignatures atmosphériques possibles",
        signal: "Chœurs radio dans la grande tache",
        hazard: "Décharges ioniques massives",
        orbit: orbit(0.79, 282, 13),
        accent: "#636fe5",
        missionPlanetName: null,
      }),
      body({
        id: "station-watcher-platform",
        name: "Plateforme Watcher",
        type: "station",
        status: "charted",
        biome: "ruins",
        environment: "Observatoire abyssal orbital",
        summary: "Une plateforme humaine surveillait les migrations océaniques avant son évacuation.",
        population: "Équipage absent · drones actifs",
        signal: "Journal scientifique en boucle",
        hazard: "Sections dépressurisées",
        orbit: orbit(0.93, 103, -12),
        accent: "#70f4cf",
        missionPlanetName: null,
      }),
    ]),
  },
  {
    id: "system-mycora",
    name: "Système Mycora",
    starName: "Mycora",
    starClass: "Naine rouge M4V",
    summary: "Poussières organiques et spores réfléchissantes enveloppent ses deux mondes vivants.",
    position: position(62, 50),
    accent: "#c27be8",
    visualProfile: visualProfile("mycora-spore-cloud", 0.82, 0.27, -16, "#d991ff"),
    bodies: Object.freeze([
      body({
        id: "planet-mycora-v",
        name: "Mycora-V",
        type: "planet",
        status: "active",
        biome: "fungal",
        environment: "Réseau fongique planétaire",
        summary: "Une intelligence mycélienne relie les prédateurs à un Cœur-Mère souterrain.",
        population: "Biosphère fongique unifiée",
        signal: "Contrat de chasse confirmé",
        hazard: "Nuages de spores et sols digestifs",
        orbit: orbit(0.29, 225, -9),
        accent: "#d082ef",
        missionPlanetName: "Mycora-V",
      }),
      body({
        id: "planet-mycora-nox",
        name: "Mycora-Nox",
        type: "planet",
        status: "surveyed",
        biome: "fungal",
        environment: "Forêt crépusculaire",
        summary: "Un monde sombre où les arbres parasités communiquent par éclairs bioluminescents.",
        population: "Prédateurs symbiotiques non catalogués",
        signal: "Réseau lumineux répondant aux sondes",
        hazard: "Hallucinations sporales",
        orbit: orbit(0.53, 34, 15),
        accent: "#8e62c9",
        missionPlanetName: null,
      }),
      body({
        id: "moon-quarantine",
        name: "Lune Quarantaine",
        type: "moon",
        status: "charted",
        biome: "fungal",
        environment: "Satellite de confinement",
        summary: "Des modules médicaux scellés encerclent une lune volontairement stérilisée.",
        population: "Aucune signature autorisée",
        signal: "Avertissement biologique multilingue",
        hazard: "Spores dormantes dans les modules",
        orbit: orbit(0.69, 309, -18),
        accent: "#8ed17a",
        missionPlanetName: null,
      }),
      body({
        id: "anomaly-spore-drift",
        name: "Dérive des Spores",
        type: "anomaly",
        status: "charted",
        biome: "fungal",
        environment: "Nuage organique interplanétaire",
        summary: "Une marée de spores gelées suit une orbite impossible entre les deux mondes.",
        population: "Colonies microscopiques en dormance",
        signal: "Motif neural à très basse fréquence",
        hazard: "Contamination des filtres du vaisseau",
        orbit: orbit(0.92, 128, 21),
        accent: "#df83ff",
        missionPlanetName: null,
      }),
    ]),
  },
  {
    id: "system-acheron",
    name: "Système Acheron",
    starName: "Acheron",
    starClass: "Naine jaune G3V",
    summary: "Un monde-cité sans atmosphère, une planète urbaine morte et des infrastructures automatiques tournent autour d’un soleil pâle.",
    position: position(86, 50),
    accent: "#d5a66e",
    visualProfile: visualProfile("acheron-pale-ruins", 0.98, 0.2, 11, "#fff1c7"),
    bodies: Object.freeze([
      body({
        id: "planet-acheron-sigma",
        name: "Acheron-Sigma",
        type: "planet",
        status: "active",
        biome: "ruins",
        environment: "Cité planétaire verticale sous vide",
        summary: "Une cité sans atmosphère est encore défendue par son Gardien et des essaims mécaniques.",
        population: "Constructs autonomes",
        signal: "Contrat de chasse confirmé",
        hazard: "Gravité instable et grilles laser",
        orbit: orbit(0.34, 163, 6),
        accent: "#d8a067",
        missionPlanetName: "Acheron-Sigma",
      }),
      body({
        id: "planet-acheron-tau",
        name: "Acheron-Tau",
        type: "planet",
        status: "surveyed",
        biome: "ruins",
        environment: "Monde urbain enseveli",
        summary: "Des couches successives de villes forment un labyrinthe sous une surface désertée.",
        population: "Mouvements humanoïdes dans les niveaux bas",
        signal: "Réseau ferroviaire réactivé",
        hazard: "Effondrements structurels en cascade",
        orbit: orbit(0.57, 351, -7),
        accent: "#a98874",
        missionPlanetName: null,
      }),
      body({
        id: "station-acheron-orbital-city",
        name: "Cité orbitale Acheron",
        type: "station",
        status: "charted",
        biome: "ruins",
        environment: "Cité-anneau abandonnée",
        summary: "Un habitat monumental continue de corriger seul son orbite depuis des siècles.",
        population: "Robots civils désorientés",
        signal: "Annonces publiques sans habitants",
        hazard: "Rotation artificielle irrégulière",
        orbit: orbit(0.74, 258, 4),
        accent: "#d8bf98",
        missionPlanetName: null,
      }),
      body({
        id: "moon-obsidian",
        name: "Lune Obsidienne",
        type: "moon",
        status: "charted",
        biome: "volcano",
        environment: "Lune de verre noir",
        summary: "Un impact ancien a vitrifié presque toute sa face tournée vers Acheron-Sigma.",
        population: "Nulle",
        signal: "Réflexions thermiques trompeuses",
        hazard: "Lames d’obsidienne en apesanteur",
        orbit: orbit(0.9, 83, -14),
        accent: "#796e7d",
        missionPlanetName: null,
      }),
    ]),
  },
  {
    id: "system-kaail",
    name: "Système Kaail",
    starName: "Kaail",
    starClass: "Étoile jaune F9V",
    summary: "Une réserve de chasse ancienne où savanes, citadelles et rites de harde coexistent.",
    position: position(14, 86),
    accent: "#b8d55c",
    visualProfile: visualProfile("kaail-hunting-preserve", 1.15, 0.12, -9, "#f6e36d"),
    bodies: Object.freeze([
      body({
        id: "planet-kaail-prime",
        name: "Kaail-Prime",
        type: "planet",
        status: "surveyed",
        biome: "jungle",
        environment: "Savane cyclopéenne",
        summary: "Des troupeaux cuirassés suivent des fleuves saisonniers entre des arbres géants.",
        population: "Mégafaune abondante · aucune colonie",
        signal: "Déplacements de meutes tactiques",
        hazard: "Ruées massives et sécheresses brutales",
        orbit: orbit(0.36, 203, -5),
        accent: "#b9d35b",
        missionPlanetName: null,
      }),
      body({
        id: "planet-kaail-rook",
        name: "Kaail-Rook",
        type: "planet",
        status: "surveyed",
        biome: "ruins",
        environment: "Citadelles de steppe",
        summary: "Des forteresses mobiles se déplacent sur des chenilles au milieu d’une prairie métallique.",
        population: "Clans humanoïdes militarisés",
        signal: "Duels diffusés sur bande étroite",
        hazard: "Artillerie itinérante",
        orbit: orbit(0.64, 22, 9),
        accent: "#ae8c61",
        missionPlanetName: null,
      }),
      body({
        id: "station-herd-sanctuary",
        name: "Sanctuaire de Harde",
        type: "station",
        status: "charted",
        biome: "ruins",
        environment: "Arche biologique yautja",
        summary: "Une station de conservation maintient des lignées de proies destinées aux rites futurs.",
        population: "Gardiens automatisés · spécimens en stase",
        signal: "Code de réserve du clan",
        hazard: "Verrouillage létal des enclos",
        orbit: orbit(0.89, 116, -16),
        accent: "#73d79b",
        missionPlanetName: null,
      }),
    ]),
  },
  {
    id: "system-vardos",
    name: "Système Vardos",
    starName: "Vardos",
    starClass: "Binaire orange K4V/K7V",
    summary: "Un corridor industriel fortifié relie un monde-usine à une colonie carcérale.",
    position: position(38, 86),
    accent: "#e0805d",
    visualProfile: visualProfile("vardos-binary-foundries", 0.9, 0.32, 17, "#ff9a5b"),
    bodies: Object.freeze([
      body({
        id: "planet-vardos-iii",
        name: "Vardos-III",
        type: "planet",
        status: "surveyed",
        biome: "ruins",
        environment: "Œcuménopole industrielle",
        summary: "Forges, raffineries et quartiers ouvriers couvrent chaque continent respirable.",
        population: "Population humanoïde dense · sécurité corporatiste",
        signal: "Tournois clandestins lourdement armés",
        hazard: "Pollution thermique et drones de surveillance",
        orbit: orbit(0.33, 188, 12),
        accent: "#dc7858",
        missionPlanetName: null,
      }),
      body({
        id: "planet-carcer-7",
        name: "Carcer-7",
        type: "planet",
        status: "surveyed",
        biome: "desert",
        environment: "Monde-prison rocheux",
        summary: "Des pénitenciers autonomes encerclent des canyons occupés par les évadés.",
        population: "Détenus armés · unités pénitentiaires",
        signal: "Zones entières hors contrôle central",
        hazard: "Tourelles orbitales et mines de périmètre",
        orbit: orbit(0.62, 16, -11),
        accent: "#bb6c52",
        missionPlanetName: null,
      }),
      body({
        id: "station-vardos-shipyard",
        name: "Chantier Vardos",
        type: "station",
        status: "charted",
        biome: "ruins",
        environment: "Chantier naval militarisé",
        summary: "Des coques de guerre inachevées forment un dédale de métal et de réacteurs froids.",
        population: "Équipes de récupération rivales",
        signal: "Réacteur expérimental sous alimentation",
        hazard: "Soudure automatisée et zones sans pression",
        orbit: orbit(0.91, 123, 19),
        accent: "#88a5ad",
        missionPlanetName: null,
      }),
    ]),
  },
  {
    id: "system-umbra",
    name: "Système Umbra",
    starName: "Umbra",
    starClass: "Pulsar milliseconde",
    summary: "Un pulsar éclaire par flashes deux mondes prisonniers d’une nuit presque permanente.",
    position: position(62, 86),
    accent: "#9b79e8",
    visualProfile: visualProfile("umbra-pulsar-lattice", 1.07, 0.25, -18, "#b8a2ff"),
    bodies: Object.freeze([
      body({
        id: "planet-umbra-terminus",
        name: "Umbra-Terminus",
        type: "planet",
        status: "surveyed",
        biome: "fungal",
        environment: "Jungle crépusculaire",
        summary: "Une bande habitable mobile sépare un désert brûlé d’une calotte plongée dans la nuit.",
        population: "Prédateurs thermiques sur la ligne du jour",
        signal: "Chasses coordonnées à chaque pulsation",
        hazard: "Contrastes thermiques extrêmes",
        orbit: orbit(0.39, 219, -17),
        accent: "#9467d7",
        missionPlanetName: null,
      }),
      body({
        id: "planet-noctis-4",
        name: "Noctis-4",
        type: "planet",
        status: "surveyed",
        biome: "ice",
        environment: "Monde nocturne glacé",
        summary: "Des océans sous-glaciaires brillent sous une atmosphère privée de soleil direct.",
        population: "Faune aveugle · habitats scientifiques enfouis",
        signal: "Coupures d’énergie suivant un prédateur inconnu",
        hazard: "Pulsations radiatives du pulsar",
        orbit: orbit(0.67, 43, 18),
        accent: "#667fd4",
        missionPlanetName: null,
      }),
      body({
        id: "station-pulsar-beacon",
        name: "Balise du Pulsar",
        type: "station",
        status: "charted",
        biome: "ruins",
        environment: "Balise gravitationnelle",
        summary: "Un phare ancien synchronise les routes hyperspatiales avec la rotation du pulsar.",
        population: "Aucun équipage",
        signal: "Coordonnées vers une région non cartographiée",
        hazard: "Fenêtres d’approche de quelques secondes",
        orbit: orbit(0.93, 137, -23),
        accent: "#d0bbff",
        missionPlanetName: null,
      }),
    ]),
  },
  {
    id: "system-tempest",
    name: "Système Tempest",
    starName: "Tempest",
    starClass: "Sous-géante blanche F2IV",
    summary: "Des mondes aériens orbitent au bord d’une géante dont les tempêtes emplissent le ciel.",
    position: position(86, 86),
    accent: "#58d4d8",
    visualProfile: visualProfile("tempest-ion-vortex", 0.86, 0.16, 14, "#d8ffff"),
    bodies: Object.freeze([
      body({
        id: "planet-aeris",
        name: "Aeris",
        type: "planet",
        status: "surveyed",
        biome: "ocean",
        environment: "Archipels suspendus",
        summary: "Une atmosphère dense porte des îles minérales au-dessus d’un océan sans fond visible.",
        population: "Faune volante géante · nids migrateurs",
        signal: "Prédateurs suivant les aéronefs en silence",
        hazard: "Cisaillements atmosphériques",
        orbit: orbit(0.3, 197, 14),
        accent: "#6fdde0",
        missionPlanetName: null,
      }),
      body({
        id: "planet-fulmen",
        name: "Fulmen",
        type: "planet",
        status: "surveyed",
        biome: "volcano",
        environment: "Monde d’orages éternels",
        summary: "Des plateaux volcaniques émergent d’une couverture nuageuse chargée d’électricité.",
        population: "Formes conductrices ailées",
        signal: "Décharges dessinant des motifs territoriaux",
        hazard: "Superfoudre continue",
        orbit: orbit(0.55, 11, -13),
        accent: "#e5cd59",
        missionPlanetName: null,
      }),
      body({
        id: "giant-core",
        name: "Cœur de Géante",
        type: "gas-giant",
        status: "charted",
        biome: "ocean",
        environment: "Vortex de géante gazeuse",
        summary: "Une tempête hexagonale révèle périodiquement des couches atmosphériques lumineuses.",
        population: "Biosignatures flottantes non résolues",
        signal: "Impulsion artificielle au centre du vortex",
        hazard: "Gravité et pression létales",
        orbit: orbit(0.88, 101, 20),
        accent: "#75aee8",
        missionPlanetName: null,
      }),
    ]),
  },
] satisfies readonly GalaxySystemRegistryEntry[]);

/**
 * The Long Hunt is split into authored sectors instead of deriving clusters
 * from system names or distances. System positions here are local to their
 * sector and are therefore independent from the legacy registry coordinates.
 */
export const GALAXY_SECTOR_REGISTRY = Object.freeze([
  {
    id: "sector-oseris-crown",
    name: "Couronne d’Oseris",
    description:
      "Une couronne de routes anciennes relie jungles primordiales, glaces aveuglantes et forges rouges.",
    accent: "#78dca1",
    position: position(22, 22),
    systems: Object.freeze([
      { systemId: "system-oseris", position: position(24, 36) },
      { systemId: "system-nivalis", position: position(68, 24) },
      { systemId: "system-cinder", position: position(56, 73) },
    ]),
  },
  {
    id: "sector-naraka-rift",
    name: "Faille de Naraka",
    description:
      "Une fracture nébulaire où marais toxiques et déserts de verre dérivent parmi les épaves.",
    accent: "#8fc66d",
    position: position(76, 23),
    systems: Object.freeze([
      { systemId: "system-naraka", position: position(29, 39) },
      { systemId: "system-serekh", position: position(72, 61) },
    ]),
  },
  {
    id: "sector-pelagos-cluster",
    name: "Amas de Pelagos",
    description:
      "Des soleils noyés dans les poussières organiques abritent océans abyssaux et réseaux fongiques.",
    accent: "#69c9dc",
    position: position(52, 49),
    systems: Object.freeze([
      { systemId: "system-pelagos", position: position(30, 62) },
      { systemId: "system-mycora", position: position(70, 35) },
    ]),
  },
  {
    id: "sector-acheron-marches",
    name: "Marches d’Acheron",
    description:
      "Une frontière disputée de cités mortes, sanctuaires de clan et colonies militarisées.",
    accent: "#db886d",
    position: position(24, 78),
    systems: Object.freeze([
      { systemId: "system-acheron", position: position(21, 42) },
      { systemId: "system-kaail", position: position(52, 72) },
      { systemId: "system-vardos", position: position(79, 29) },
    ]),
  },
  {
    id: "sector-tempest-veil",
    name: "Voile de Tempest",
    description:
      "Un voile d’ombre et d’orages perpétuels masque des mondes errants aux signaux impossibles.",
    accent: "#7898e8",
    position: position(78, 77),
    systems: Object.freeze([
      { systemId: "system-umbra", position: position(30, 34) },
      { systemId: "system-tempest", position: position(70, 66) },
    ]),
  },
] satisfies readonly GalaxySectorRegistryEntry[]);

export const GALAXY_REGISTRY_COUNTS = Object.freeze({
  sectorCount: GALAXY_SECTOR_REGISTRY.length,
  systemCount: GALAXY_SYSTEM_REGISTRY.length,
  bodyCount: GALAXY_SYSTEM_REGISTRY.reduce(
    (total, system) => total + system.bodies.length,
    0,
  ),
  planetCount: GALAXY_SYSTEM_REGISTRY.reduce(
    (total, system) =>
      total + system.bodies.filter(({ type }) => type === "planet").length,
    0,
  ),
  huntWorldCount: GALAXY_SYSTEM_REGISTRY.reduce(
    (total, system) =>
      total +
      system.bodies.filter(
        ({ type, status }) => type === "planet" && status === "active",
      ).length,
    0,
  ),
});
