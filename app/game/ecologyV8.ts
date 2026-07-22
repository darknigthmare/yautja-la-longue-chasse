/**
 * V8 planetary ecology catalogue.
 *
 * The catalogue deliberately separates a planet's endemic wildlife from the
 * six travelling threats that can be encountered throughout the campaign.
 * Runtime systems consume stable IDs only; artwork can therefore be replaced
 * without rewriting mission or save data.
 */

export const ECOLOGY_V8_CATEGORIES = [
  "fauna",
  "flora",
  "humanoid",
  "bad-blood",
  "other",
] as const;

export type EcologyV8Category = (typeof ECOLOGY_V8_CATEGORIES)[number];
export type EcologyV8Threat = 1 | 2 | 3 | 4;
export type EcologyV8Distribution = "endemic" | "common";

export const ECOLOGY_V8_PLANET_IDS = [
  "oseris-iv",
  "nivalis-k",
  "cinder-12",
  "naraka-delta",
  "serekh-9",
  "pelagos-m",
  "mycora-v",
  "acheron-sigma",
] as const;

export type EcologyV8PlanetId = (typeof ECOLOGY_V8_PLANET_IDS)[number];

const PLANET_META = [
  {
    id: "oseris-iv",
    missionId: "jungle-vey",
    name: "Oseris-IV",
    biome: "jungle",
    biomeLabel: "Jungle équatoriale",
    description:
      "Canopée noyée de brume, lacs chauds et ruines coloniales envahies par une flore prédatrice.",
  },
  {
    id: "nivalis-k",
    missionId: "ice-cryostalker",
    name: "Nivalis-K",
    biome: "ice",
    biomeLabel: "Banquise cryogénique",
    description:
      "Toundra fracturée, cavernes sous-glaciaires et poches salines où la chaleur devient une faiblesse.",
  },
  {
    id: "cinder-12",
    missionId: "volcano-bad-blood",
    name: "Cinder-12",
    biome: "volcano",
    biomeLabel: "Sanctuaire volcanique",
    description:
      "Caldeira de basalte, forêts vitrifiées et sanctuaire Yautja profané par les Bad Blood.",
  },
  {
    id: "naraka-delta",
    missionId: "swamp-hydra",
    name: "Naraka-Delta",
    biome: "swamp",
    biomeLabel: "Marais acide",
    description:
      "Mangrove noire, tourbières corrosives et chenaux opaques dominés par une hydre amphibie.",
  },
  {
    id: "serekh-9",
    missionId: "desert-sandmaw",
    name: "Serekh-9",
    biome: "desert",
    biomeLabel: "Désert de verre",
    description:
      "Ergs métalliques, canyons fossiles et tempêtes abrasives sous lesquelles chasse le Sandmaw.",
  },
  {
    id: "pelagos-m",
    missionId: "ocean-leviathan",
    name: "Pelagos-M",
    biome: "ocean",
    biomeLabel: "Archipel abyssal",
    description:
      "Atolls mobiles, plateformes battues par les vagues et fosses bioluminescentes du Léviathan.",
  },
  {
    id: "mycora-v",
    missionId: "fungal-hivemind",
    name: "Mycora-V",
    biome: "fungal",
    biomeLabel: "Réseau fongique",
    description:
      "Forêt de sporophores géants reliés par un esprit-réseau qui recycle chaque organisme tombé.",
  },
  {
    id: "acheron-sigma",
    missionId: "ruins-ancient-guardian",
    name: "Acheron-Sigma",
    biome: "ruins",
    biomeLabel: "Mégalopole en ruines",
    description:
      "Nécropole technologique, galeries scellées et gardiens anciens réveillés par les pilleurs de reliques.",
  },
] as const;

export type EcologyV8MissionId = (typeof PLANET_META)[number]["missionId"];
export type EcologyV8BiomeId = (typeof PLANET_META)[number]["biome"];

export const ECOLOGY_V8_BOSS_ENEMY_IDS: Readonly<
  Partial<Record<EcologyV8MissionId, string>>
> = {
  "swamp-hydra": "naraka-delta--delta-hydra-juvenile",
  "desert-sandmaw": "serekh-9--sandmaw-juvenile",
  "ocean-leviathan": "pelagos-m--leviathan-spawn",
  "fungal-hivemind": "mycora-v--hive-avatar",
  "ruins-ancient-guardian": "acheron-sigma--ancient-guardian",
};

export interface EcologyV8EnemyDefinition {
  id: string;
  name: string;
  category: EcologyV8Category;
  role: string;
  behavior: string;
  trophy: string;
  threat: EcologyV8Threat;
  spriteId: string;
  sheetPath: string;
  distribution: EcologyV8Distribution;
  homePlanetId: EcologyV8PlanetId | null;
  planetIds: readonly EcologyV8PlanetId[];
}

export interface EcologyV8PlanetDefinition {
  id: EcologyV8PlanetId;
  missionId: EcologyV8MissionId;
  name: string;
  biome: EcologyV8BiomeId;
  biomeLabel: string;
  description: string;
  endemicEnemyIds: readonly string[];
  commonEnemyIds: readonly string[];
  enemyIds: readonly string[];
}

type EnemySeed = readonly [
  slug: string,
  name: string,
  category: EcologyV8Category,
  role: string,
  behavior: string,
  trophy: string,
  threat: EcologyV8Threat,
];

const seed = (...values: EnemySeed): EnemySeed => values;

const ENDEMIC_SEEDS = {
  "oseris-iv": [
    seed("canopy-razorwing", "Razorwing de canopée", "fauna", "Prédateur aérien", "Se suspend aux branches hautes puis fond en silence sur la nuque de sa proie.", "Serre membraneuse", 2),
    seed("amber-jaw-stalker", "Traqueur à mâchoire d’ambre", "fauna", "Chasseur d’embuscade", "Immobile dans les fougères jaunes, il mord lorsqu’une vibration traverse les racines.", "Double mandibule ambrée", 3),
    seed("vineback-grazer", "Brouteur dos-de-liane", "fauna", "Herbivore territorial", "Tolère l’observation mais charge dès que sa harde ou ses jeunes sont approchés.", "Omoplate végétalisée", 2),
    seed("mist-pouncer", "Bondisseur des brumes", "fauna", "Félin arboricole", "Suit le chasseur d’arbre en arbre et profite des nappes de brume pour bondir.", "Crocs à canal thermique", 3),
    seed("drumcrest-herdling", "Grégaire à crête-tambour", "fauna", "Alerte de troupeau", "Frappe sa crête creuse contre les troncs et attire les prédateurs de toute la zone.", "Crête de résonance", 1),
    seed("mirror-chameleon", "Caméléon miroir", "fauna", "Imitateur optique", "Copie les reflets du camouflage Yautja puis attaque le flanc laissé sans surveillance.", "Peau prismatique", 3),
    seed("root-burrower", "Fouisseur des racines", "fauna", "Prédateur souterrain", "Creuse entre les racines porteuses et surgit sous les plateformes fragilisées.", "Rostre fouisseur", 2),
    seed("thunder-macaque", "Macaque-tonnerre", "fauna", "Harceleur de groupe", "Lance fruits durs et pierres avant que les dominants ne chargent en bande.", "Canines du dominant", 2),
    seed("needle-frog", "Grenouille-aiguille", "fauna", "Menace toxique", "Gonfle ses glandes dorsales et projette une volée d’épines paralysantes.", "Glande à aiguillons", 2),
    seed("coil-serpent", "Serpent à spires", "fauna", "Constricteur vertical", "S’enroule autour des troncs et saisit les cibles qui utilisent les branches basses.", "Vertèbres articulées", 3),
    seed("carnivore-vine", "Liane carnivore d’Oseris", "flora", "Entrave végétale", "Détecte les pas rapides puis fouette et retient la cible au niveau des chevilles.", "Nœud sensoriel", 2),
    seed("spore-bloom", "Floraison révélatrice", "flora", "Détection de zone", "Émet un nuage fluorescent qui colle au camouflage et alerte toute la faune voisine.", "Sac pollinique intact", 2),
    seed("sentinel-orchid", "Orchidée sentinelle", "flora", "Alarme thermique", "Ouvre son iris thermosensible et transmet une impulsion aux prédateurs proches.", "Iris thermosensible", 2),
    seed("strangler-fig", "Figuier étrangleur mobile", "flora", "Contrôle vertical", "Déplace lentement ses racines et referme un étau autour des supports occupés.", "Cœur ligneux spiralé", 3),
    seed("dart-pod", "Cosse à dards", "flora", "Artillerie végétale", "Oriente ses gousses vers les sources chaudes et tire des graines perforantes.", "Chambre de pression", 2),
    seed("walking-mangrove", "Palétuvier marcheur", "flora", "Colosse de terrain", "Avance sur ses racines échasses et renverse plateformes comme combattants.", "Noyau racinaire", 4),
    seed("resin-trap", "Piège à résine", "flora", "Immobilisation", "Projette une sève transparente qui durcit au contact de l’air humide.", "Glande résinière", 2),
    seed("vey-jungle-marine", "Marine de la canopée", "humanoid", "Fusilier colonial", "Progresse en binôme sous les fougères et couvre les angles avec de courtes rafales.", "Plaque d’unité", 2),
    seed("owlf-counterhunter", "Contre-chasseur OWLF", "humanoid", "Chasseur spécialisé", "Déploie brouillage thermique, fusées spectrales et grenades de marquage coordonnées.", "Viseur anti-camouflage", 3),
    seed("canopy-sniper", "Tireuse de canopée", "humanoid", "Tir longue portée", "Change de perchoir après chaque tir et télégraphie une visée perforante précise.", "Optique gyrostabilisée", 3),
    seed("frontier-poacher", "Braconnier de frontière", "humanoid", "Poseur de pièges", "Feint la fuite, place des mines sonores puis revient récupérer la technologie tombée.", "Masque de braconnier", 2),
    seed("corporate-juggernaut", "Lourd corporatiste d’Oseris", "humanoid", "Suppression blindée", "Ancre son arme lourde et force le chasseur à quitter la même hauteur.", "Noyau de servomoteur", 3),
    seed("jungle-smuggler-drone", "Drone contrebandier arboricole", "other", "Tourelle mobile", "Patrouille sous la canopée et marque les cibles pour les équipes de récupération.", "Matrice de ciblage", 2),
    seed("jungle-xeno-scout", "Éclaireur xénomorphe vert-mousse", "other", "Prédateur de plafond", "Se confond avec les lianes, rampe au plafond puis bondit dès que la proie s’isole.", "Dôme crânien moucheté", 4),
  ],
  "nivalis-k": [
    seed("cryostalker-alpha-spawn", "Cryostalker subadulte", "fauna", "Chasseur sous-glaciaire", "Suit les signatures bioélectriques et traverse les congères avant une charge blindée.", "Plaque de gorge cryogène", 3),
    seed("kalisk-juvenile", "Kalisk juvénile des glaces", "fauna", "Apex régénératif", "Encaisse les tirs, se replie dans une cavité froide puis revient régénéré.", "Plaque frontale régénérative", 4),
    seed("lv1201-rimewing", "Vermine rimewing", "fauna", "Harcèlement aérien", "Décrit un arc au-dessus de la banquise puis plonge sur les optiques du biomask.", "Carapace thoracique ailée", 1),
    seed("razorback-grazer", "Brouteur dos-rasoir polaire", "fauna", "Herbivore territorial", "Racle la glace de ses défenses avant de charger sur une longue distance.", "Omoplate dentelée", 2),
    seed("ice-bore", "Foreur de banquise", "fauna", "Fouisseur massif", "Perçoit les impacts en surface et ouvre soudain un puits sous les pas du chasseur.", "Rostre diamanté", 3),
    seed("rime-claw", "Griffe-de-givre", "fauna", "Prédateur de meute", "Encercle avec deux congénères et attaque alternativement depuis les angles morts.", "Griffe translucide", 2),
    seed("frost-manta", "Manta des neiges", "fauna", "Planeur camouflé", "Glisse sous la poudreuse puis jaillit pour envelopper le haut du corps.", "Membrane isolante", 2),
    seed("glacier-ram", "Bélier du glacier", "fauna", "Briseur de couverture", "Percute piliers et barricades, créant des éclats de glace dangereux.", "Corne stratifiée", 3),
    seed("pale-burrower", "Fouisseur blafard", "fauna", "Charognard cavernicole", "Suit le sang sous la glace et mord les proies déjà blessées.", "Mâchoire thermophobe", 1),
    seed("aurora-leech", "Sangsue d’aurore", "fauna", "Parasite énergétique", "S’accroche aux équipements chauds et draine progressivement la réserve d’énergie.", "Vessie électroluminescente", 2),
    seed("snow-prowler", "Rôdeur des poudreries", "fauna", "Traqueur solitaire", "Disparaît dans les rafales et réapparaît derrière la dernière empreinte visible.", "Oreille thermique", 3),
    seed("brine-crawler", "Crabe des saumures", "fauna", "Gardien de fissure", "Projette une saumure surfondue qui ralentit avant de frapper avec ses pinces.", "Pince cryosaline", 2),
    seed("heat-lichen", "Lichen voleur de chaleur", "flora", "Drain thermique", "Étend ses filaments sur l’armure et absorbe la chaleur nécessaire au camouflage.", "Nodule caloriphage", 2),
    seed("thermal-pod", "Cosse thermale", "flora", "Leurre biologique", "Imite une silhouette chaude afin d’attirer tirs guidés et prédateurs affamés.", "Cœur thermogène", 2),
    seed("crystal-reed", "Roseau de cristal", "flora", "Barrière résonnante", "Vibre au passage et projette des éclats en éventail lorsque la glace se fissure.", "Rhizome siliceux", 2),
    seed("snow-bloom", "Floraison des neiges", "flora", "Nuage anesthésiant", "Ouvre sa corolle au bruit et libère une poudre qui ralentit les réflexes.", "Corolle narcotique", 2),
    seed("antifreeze-kelp", "Varech antigel", "flora", "Entrave aquatique", "Se déroule depuis les fissures salines et agrippe les jambes près de l’eau.", "Bulbe antigel", 2),
    seed("ice-salvager", "Récupérateur de Nivalis", "humanoid", "Pillard équipé", "Utilise piolet motorisé et fusil court pour défendre les épaves prises dans la glace.", "Balise de récupération", 2),
    seed("cryo-prospector", "Prospectrice cryogénique", "humanoid", "Poseuse de charges", "Fore des poches fragiles et déclenche des effondrements sur la trajectoire du chasseur.", "Scanner minéral", 2),
    seed("refinery-trooper", "Garde de raffinerie polaire", "humanoid", "Défense de position", "Ferme les sas, pose des tourelles chauffantes et progresse derrière un bouclier.", "Émetteur de bouclier", 3),
    seed("xenobiologist-field", "Exobiologiste de terrain", "humanoid", "Soutien tactique", "Scanne la faune et injecte des stimulants aux créatures capturées voisines.", "Analyseur génétique", 2),
    seed("rime-automaton", "Automate de givre ancien", "other", "Gardien de relique", "S’éveille près des glyphes et alterne rayon froid et frappe de bouclier.", "Cœur glyphique gelé", 4),
    seed("frost-xeno", "Drone xénomorphe cryoadapté", "other", "Prédateur cavernicole", "Rampe sous les arches glacées et crache un acide qui fragilise les plateformes.", "Dôme crânien givré", 4),
    seed("mining-exosuit", "Exosquelette minier autonome", "other", "Machine lourde", "Creuse en ligne droite, ignore les petites attaques et écrase les obstacles.", "Vérin industriel", 3),
  ],
  "cinder-12": [
    seed("hell-hound-stalker", "Traqueur Hell-Hound de Cinder", "fauna", "Pisteur de meute", "Flaire les traces dans la cendre puis bondit en diagonale depuis une coulée refroidie.", "Crâne canin à crête", 2),
    seed("river-ghost-brute", "Brute River Ghost des scories", "fauna", "Prédateur camouflé", "Reste invisible dans les particules chaudes avant une charge courte et brutale.", "Mandibule membraneuse", 3),
    seed("volcanic-ashmaw", "Gueule-cendre volcanique", "fauna", "Fouisseur ignifuge", "Émerge des retombées, mord puis disparaît sous une couche de cendre meuble.", "Crocs vitrifiés", 2),
    seed("ember-crawler", "Rampant des braises", "fauna", "Nuée incandescente", "S’agrège autour des sources d’énergie et explose lorsqu’il est menacé.", "Carapace calorique", 2),
    seed("lava-skimmer", "Écumeur de lave", "fauna", "Prédateur de surface", "Glisse sur les coulées et projette des gouttes brûlantes avant de percuter.", "Nageoire basaltique", 3),
    seed("basalt-ram", "Bélier de basalte", "fauna", "Colosse territorial", "Brise les colonnes fragiles et déclenche des pluies de pierre sur l’arène.", "Corne de basalte", 4),
    seed("magma-tick", "Tique magmatique", "fauna", "Parasite thermique", "S’accroche au générateur de cape et le force à surchauffer par impulsions.", "Poche de magma", 2),
    seed("smoke-wyvern", "Vouivre de fumée", "fauna", "Chasseur aérien", "Masque sa trajectoire dans les panaches puis attaque avec une queue en crochet.", "Vertèbre caudale", 3),
    seed("slag-beetle", "Scarabée des scories", "fauna", "Blindé mineur", "Se roule en boule et ricoche contre les parois avant de déployer ses pinces.", "Élytre métallique", 2),
    seed("razor-reed", "Roseau rasoir de Cinder", "flora", "Barrière mobile", "Se courbe sous le vent chaud puis détend ses feuilles comme des lames.", "Rhizome tranchant", 1),
    seed("grapple-root", "Racine grappin volcanique", "flora", "Prédateur souterrain", "Suit les pas dans la cendre et jaillit pour immobiliser une cheville.", "Bulbe contractile", 2),
    seed("acid-pitcher", "Urne acide de caldeira", "flora", "Artillerie organique", "Compresse sa poche et projette une salve corrosive en cloche.", "Poche catalytique", 3),
    seed("cinder-orchid", "Orchidée sentinelle de lave", "flora", "Détection thermique", "Filtre le rayonnement ambiant et signale les signatures qui se déplacent.", "Iris infrarouge", 2),
    seed("cinder-bulb", "Bulbe de cendres", "flora", "Mine végétale", "Se gonfle sous les retombées et libère une onde de poussière brûlante au contact.", "Graine ignifuge", 2),
    seed("glass-thorn", "Épine de verre", "flora", "Piège perforant", "Pousse rapidement dans les fissures chauffées et empale les trajectoires répétées.", "Aiguille d’obsidienne", 3),
    seed("bad-blood-duelist", "Bad Blood duelliste de Cinder", "bad-blood", "Briseur de code", "Provoque un duel puis rompt volontairement la distance d’honneur.", "Biomask fendu", 3),
    seed("bad-blood-plasma-gunner", "Bad Blood artilleur plasma", "bad-blood", "Surcharge à distance", "Sature les plateformes de plasma sans mesurer la valeur de ses proies.", "Canon dorsal profané", 4),
    seed("bad-blood-netmaster", "Bad Blood maître-filet", "bad-blood", "Capture cruelle", "Immobilise puis frappe avant que la proie puisse tenter de se libérer.", "Projecteur de filet dentelé", 3),
    seed("bad-blood-cloaked-stalker", "Bad Blood traqueur occulté", "bad-blood", "Assassin camouflé", "Maintient sa cape au contact et attaque continuellement depuis l’angle mort.", "Générateur de cape instable", 4),
    seed("bad-blood-trophy-butcher", "Bad Blood boucher de trophées", "bad-blood", "Prédateur sacrilège", "Porte des prises volées comme blindage et combat avec une lame lourde.", "Collier de prises volées", 4),
    seed("bad-blood-initiate", "Initié du clan paria", "bad-blood", "Combattant agressif", "Charge sans observation préalable et couvre sa retraite avec des mines plasma.", "Marque de sang reniée", 3),
    seed("bad-blood-trapper", "Trappeur aux chaînes", "bad-blood", "Contrôle de terrain", "Tend câbles monofilament et pièges explosifs autour des points d’honneur.", "Bobine monofilament", 4),
    seed("ash-recovery-synth", "Synthétique de récupération calciné", "other", "Collecteur insensible", "Traverse les zones brûlantes et verrouille toute technologie Yautja détectée.", "Noyau mnésique vitrifié", 3),
    seed("scorch-xeno", "Drone xénomorphe des cheminées", "other", "Prédateur de conduit", "Utilise les tunnels de lave refroidis et projette un acide surchauffé.", "Dôme crânien carbonisé", 4),
  ],
  "naraka-delta": [
    seed("delta-hydra-juvenile", "Hydre de vase", "fauna", "Apex amphibie", "Alterne ses trois têtes pour mordre, feinter et projeter une bile corrosive.", "Tricrâne cartilagineux", 4),
    seed("bog-stalker", "Traqueur des tourbières", "fauna", "Embuscade amphibie", "Rampe sous la vase puis projette sa mâchoire vers les jambes isolées.", "Double mâchoire fossilisée", 3),
    seed("fen-leaper", "Bondisseur des joncs", "fauna", "Prédateur mobile", "Rebondit entre les roseaux et attaque dès qu’une cible quitte la terre ferme.", "Tendon élastique", 2),
    seed("iron-croc", "Crocodile à plaques ferriques", "fauna", "Gardien de chenal", "Attend sous l’eau opaque et effectue une rotation qui entraîne la proie.", "Plaque nucale ferrique", 4),
    seed("sludge-eel", "Anguille de vase", "fauna", "Décharge aquatique", "Électrifie une mare entière puis serpente vers les appareils neutralisés.", "Organe électrocyte", 3),
    seed("blood-mosquito", "Moustique sanguivore géant", "fauna", "Essaim drainant", "Marque une cible blessée et attire une nuée qui draine son endurance.", "Proboscis barbelé", 2),
    seed("mire-shell", "Tortue des bourbiers", "fauna", "Blindé passif", "Se ferme sous le feu puis libère une vapeur toxique quand on l’approche.", "Carapace filtrante", 2),
    seed("reed-cat", "Fauve des roseaux", "fauna", "Chasseur furtif", "Utilise les herbes flottantes comme couverture et bondit au passage d’un courant.", "Crocs rainurés", 3),
    seed("lantern-toad", "Crapaud-lanterne", "fauna", "Leurre lumineux", "Imite les balises d’extraction et avale les petites proies attirées.", "Sac bioluminescent", 2),
    seed("hook-beak", "Échassier au bec-crochet", "fauna", "Piqueur aérien", "Frappe depuis les branches noyées et arrache les objets portés.", "Bec en crochet", 2),
    seed("mud-crusher-crab", "Crabe broyeur de vase", "fauna", "Briseur de garde", "Saisit armes et membres dans ses pinces puis recule sous sa carapace.", "Pince concasseuse", 3),
    seed("strangler-lotus", "Lotus étrangleur", "flora", "Piège de surface", "Présente un tapis stable puis referme ses pétales autour du poids détecté.", "Pistil contractile", 3),
    seed("gas-bladder", "Vessie des marais", "flora", "Hazard explosif", "Accumule le méthane et dérive vers les sources de chaleur avant d’éclater.", "Membrane gazeuse", 2),
    seed("blood-reed", "Roseau sanguin", "flora", "Barrière hémophage", "Lacère les passages étroits et s’épaissit au contact du sang répandu.", "Rhizome hémophage", 2),
    seed("floating-jaw", "Mâchoire flottante", "flora", "Prédateur dérivant", "Ressemble à une feuille jusqu’à ce que ses lobes dentés se referment.", "Lobe mandibulaire", 2),
    seed("snap-root", "Racine à ressort", "flora", "Projection verticale", "Se tend sous la boue et catapulte les intrus vers les branches épineuses.", "Nœud à ressort", 2),
    seed("corpse-blossom", "Floraison cadavérique", "flora", "Appel de prédateurs", "Diffuse l’odeur d’une proie blessée puis empoisonne ceux qui s’approchent.", "Cœur nécrophage", 3),
    seed("mirror-moss", "Mousse miroir", "flora", "Perturbation optique", "Réfracte les lasers et crée de fausses silhouettes autour des troncs.", "Plaque réflective", 2),
    seed("marsh-poacher", "Braconnier des palétuviers", "humanoid", "Chasseur de trophées", "Pose collets et appâts vivants, puis ouvre le feu depuis une barque blindée.", "Collier de prises illégales", 2),
    seed("delta-surveyor", "Géomètre du delta", "humanoid", "Éclaireur technique", "Déploie sondes flottantes qui cartographient camouflage et mouvements dans l’eau.", "Sonde bathymétrique", 2),
    seed("field-medic-naraka", "Médecin mercenaire de Naraka", "humanoid", "Soutien de groupe", "Réanime les combattants tombés et applique des stimulants anti-toxines.", "Injecteur multidoses", 3),
    seed("mud-sniper", "Tireur de vase", "humanoid", "Tireur camouflé", "Masque sa chaleur sous la tourbe et change de nid après chaque tir.", "Cape isotherme", 3),
    seed("swamp-xeno-spitter", "Cracheur xénomorphe palustre", "other", "Artillerie acide", "Se fixe aux racines hautes et arrose les plateformes d’acide dilué.", "Glande acide palustre", 4),
    seed("drowned-synth", "Synthétique noyé", "other", "Traqueur submersible", "Marche sous les chenaux sans respirer et surgit derrière les embarcations.", "Noyau étanche", 3),
  ],
  "serekh-9": [
    seed("sandmaw-juvenile", "Matriarche Sandmaw", "fauna", "Apex fouisseur", "Suit les vibrations sous les dunes et avale une section entière de terrain.", "Anneau mandibulaire", 4),
    seed("dune-strider", "Marcheur des dunes", "fauna", "Herbivore migrateur", "Traverse le désert en troupeau et piétine toute menace qui bloque sa route.", "Os d’échasse", 2),
    seed("glass-scorpion", "Scorpion de verre", "fauna", "Embuscade minérale", "Se confond avec le sable vitrifié et frappe avec un dard photosensible.", "Dard de silice", 3),
    seed("sun-vulture", "Vautour solaire", "fauna", "Charognard aérien", "Tourne au-dessus des blessés et concentre la lumière avec ses ailes miroitantes.", "Plume miroir", 2),
    seed("dust-jackal", "Chacal de poussière", "fauna", "Prédateur de meute", "Soulève un écran de sable tandis que la meute attaque depuis deux directions.", "Crâne à filtres nasaux", 2),
    seed("burrow-snake", "Serpent des couches profondes", "fauna", "Constricteur souterrain", "Trace un sillon presque invisible puis enroule les jambes depuis le sable.", "Vertèbre segmentée", 3),
    seed("armored-scarab", "Scarabée cuirassé", "fauna", "Blindé roulant", "Se met en boule, descend les pentes à grande vitesse et ricoche sur la roche.", "Élytre blindé", 2),
    seed("mirage-cat", "Fauve mirage", "fauna", "Imitateur thermique", "Projette plusieurs signatures chaudes et attaque depuis la seule silhouette froide.", "Cristal miragène", 3),
    seed("boneback-carrier", "Porteur à dos d’os", "fauna", "Colosse récupérateur", "Collecte des carcasses sur son dos et les projette lorsqu’il est acculé.", "Arche dorsale", 3),
    seed("quill-lizard", "Lézard à piquants", "fauna", "Tireur organique", "Oriente ses écailles au vent et lance une salve de piquants courbes.", "Écaille balistique", 2),
    seed("salt-ram", "Bélier des salines", "fauna", "Territorial rapide", "Prend appui sur les plaques de sel et enchaîne plusieurs charges courtes.", "Cornes de sel noir", 3),
    seed("water-thief-cactus", "Cactus voleur d’eau", "flora", "Drain vital", "Déploie des racines fines qui aspirent humidité et sang à travers les bottes.", "Réservoir hydrique", 2),
    seed("razor-tumbleweed", "Virevoltant rasoir", "flora", "Hazard mobile", "Suit les rafales et déploie ses lames lorsqu’une chaleur est détectée.", "Noyau gyroscopique", 2),
    seed("hook-aloe", "Aloès à crochets", "flora", "Entrave de canyon", "Referme ses feuilles barbelées sur tout mouvement entre les rochers.", "Gel cicatrisant", 2),
    seed("sleeping-bulb", "Bulbe dormant", "flora", "Mine de spores", "Reste enfoui des années puis éclate lorsqu’une ombre le prive de soleil.", "Graine dormante", 2),
    seed("root-mine", "Mine-racine", "flora", "Explosion souterraine", "Accumule une charge statique et explose sous les pas lourds.", "Tubercule capacitif", 3),
    seed("dune-raider", "Pillard des dunes", "humanoid", "Escarmouche motorisée", "Tourne autour de la cible sur un skiff et tire avant de disparaître dans le sable.", "Visière de raid", 2),
    seed("silica-miner", "Mineur de silice", "humanoid", "Outil lourd improvisé", "Utilise foreuse et charges de carrière pour défendre les excavations.", "Foret diamanté", 2),
    seed("caravan-guard", "Garde de caravane", "humanoid", "Protection mobile", "Forme un mur de boucliers autour des transports et riposte en rafales.", "Écu de convoi", 3),
    seed("corporate-desert-ranger", "Ranger corporatiste de Serekh", "humanoid", "Contre-traque", "Déploie drones thermiques et capteurs sismiques le long des crêtes.", "Capteur sismique", 3),
    seed("fossil-archaeologist", "Archéologue armé", "humanoid", "Gardien de site", "Active les défenses antiques et protège les fossiles avec un pistolet à impulsion.", "Tablette fossile", 2),
    seed("desert-temple-guardian", "Gardien du temple de sable", "other", "Automate antique", "Émerge d’une stèle et alterne lance énergétique et bouclier de poussière.", "Cœur de stèle", 4),
    seed("excavation-drone", "Drone d’excavation autonome", "other", "Machine fouisseuse", "Découpe le sol en lignes dangereuses et poursuit les signatures métalliques.", "Laser de forage", 3),
    seed("fossil-parasite", "Parasite fossile réveillé", "other", "Essaim ancestral", "S’extrait des os exposés et cherche une articulation d’armure où se loger.", "Œuf minéralisé", 3),
  ],
  "pelagos-m": [
    seed("leviathan-spawn", "Léviathan abyssal", "fauna", "Apex marin", "Frappe les plateformes depuis dessous et les inonde avant de hisser son corps.", "Vertèbre abyssale", 4),
    seed("reef-stalker", "Traqueur des récifs", "fauna", "Prédateur amphibie", "Change de couleur sur le corail puis bondit entre eau et passerelle.", "Crête chromatophore", 3),
    seed("wavefin", "Nageoire-des-vagues", "fauna", "Harceleur de surface", "Surfe dans l’écume et lacère les jambes avec une nageoire osseuse.", "Nageoire dentelée", 2),
    seed("armor-crab", "Crabe forteresse", "fauna", "Blindé côtier", "Bloque une passerelle avec sa carapace puis frappe des deux pinces.", "Carapace nacrée", 3),
    seed("storm-eel", "Anguille d’orage", "fauna", "Prédateur électrique", "Charge ses organes pendant les tempêtes et électrifie les surfaces mouillées.", "Organe de foudre", 3),
    seed("hunter-manta", "Manta chasseuse", "fauna", "Planeur océanique", "Sort de l’eau, plane au-dessus d’un atoll puis enveloppe une cible.", "Aile hydroplane", 3),
    seed("razor-shark", "Squale-rasoir", "fauna", "Poursuite aquatique", "Suit le sang sur plusieurs écrans et brise les pontons fragilisés.", "Mâchoire en scie", 4),
    seed("tide-octopus", "Poulpe des marées", "fauna", "Imitateur de décor", "Imite coffres et rochers avant de saisir simultanément arme et chasseur.", "Bec caméléon", 3),
    seed("shellback", "Dos-coquille pélagique", "fauna", "Brouteur défensif", "Se rétracte puis expulse un jet d’eau qui repousse les menaces.", "Coquille spiralée", 2),
    seed("skygull", "Goéland du ciel vert", "fauna", "Voleur aérien", "Plonge en groupe pour dérober munitions, leurres et petits trophées.", "Bec irisé", 1),
    seed("deep-lantern", "Lanterne des fosses", "fauna", "Leurre abyssal", "Projette un faux point d’extraction puis ouvre une gueule circulaire.", "Photophore abyssal", 3),
    seed("foam-crawler", "Rampant d’écume", "fauna", "Nuée littorale", "Se dissimule dans la mousse et grimpe en masse sur les jambes immobiles.", "Plaque saline", 1),
    seed("siren-kelp", "Varech sirène", "flora", "Leurre sonore", "Reproduit les appels de détresse et enroule ses frondes autour des sauveteurs.", "Vessie vocale", 3),
    seed("harpoon-coral", "Corail harpon", "flora", "Artillerie fixe", "Détecte les vibrations de ponton et projette un polype barbelé relié par un filament.", "Polype harpon", 3),
    seed("venom-anemone", "Anémone venimeuse", "flora", "Zone toxique", "Étend ses tentacules sur une plateforme mouillée et injecte une toxine lente.", "Nématocyste géant", 2),
    seed("walking-reef", "Récif marcheur", "flora", "Colosse camouflé", "Se soulève comme une île vivante et broie tout ce qui occupe son dos.", "Cœur corallien", 4),
    seed("bladder-vine", "Liane à vessies", "flora", "Entrave flottante", "Gonfle des flotteurs qui encerclent puis immobilisent les embarcations légères.", "Flotteur organique", 2),
    seed("glass-sponge", "Éponge de verre", "flora", "Barrière fragile", "Filtre l’eau puis projette ses spicules quand elle reçoit une onde de choc.", "Squelette siliceux", 2),
    seed("pelagic-diver", "Plongeuse pélagique", "humanoid", "Éclaireuse amphibie", "Alterne fusil sous-marin et propulsion dorsale pour attaquer depuis deux niveaux.", "Propulseur dorsal", 3),
    seed("rig-security", "Sécurité de plateforme", "humanoid", "Défense industrielle", "Verrouille les passerelles et utilise des canons à mousse durcissante.", "Clé de sécurité", 2),
    seed("abyss-harpooner", "Harponneur abyssal", "humanoid", "Tireur à câble", "Harponne le chasseur pour le tirer hors d’une position haute.", "Harpon monofilament", 3),
    seed("tide-smuggler", "Contrebandier des marées", "humanoid", "Escarmouche nautique", "Lance grenades flottantes depuis un skiff et fuit derrière un écran d’écume.", "Compas de contrebande", 2),
    seed("swimmer-xeno", "Xénomorphe nageur", "other", "Prédateur submersible", "S’accroche sous les pontons et utilise sa queue comme gouvernail et fouet.", "Dôme hydrodynamique", 4),
    seed("salvage-synth", "Synthétique de sauvetage", "other", "Récupérateur amphibie", "Marche au fond de l’océan et remonte directement sous les objectifs technologiques.", "Mémoire étanche", 3),
  ],
  "mycora-v": [
    seed("spore-hound", "Molosse à spores", "fauna", "Pisteur infecté", "Suit les particules laissées par le mouvement et expulse un nuage à courte portée.", "Crâne mycélien", 3),
    seed("mycelial-brute", "Brute mycélienne", "fauna", "Colosse symbiotique", "Régénère près des nœuds fongiques et protège leur réseau avec ses bras massifs.", "Noyau symbiotique", 4),
    seed("puff-crawler", "Rampant soufflet", "fauna", "Mine mobile", "Se gonfle en approchant puis éclate en spores aveuglantes.", "Sac sporifère", 2),
    seed("cap-mimic", "Mimique à chapeau", "fauna", "Imitateur immobile", "Ressemble à un sporophore jusqu’à ce qu’une proie lui tourne le dos.", "Plaque mimétique", 3),
    seed("thread-leech", "Sangsue filamenteuse", "fauna", "Parasite neural", "Relie sa victime au réseau et transmet sa position à tous les organismes.", "Ganglion conducteur", 3),
    seed("rot-grazer", "Brouteur de pourriture", "fauna", "Herbivore contaminé", "Paisible seul, il charge en troupeau lorsque le réseau émet une alarme.", "Bois sporulé", 2),
    seed("glow-moth", "Papillon luminescent", "fauna", "Essaim révélateur", "Se colle au camouflage et dessine sa silhouette pour les autres prédateurs.", "Aile phosphorescente", 1),
    seed("mold-ape", "Singe des moisissures", "fauna", "Harceleur vertical", "Arrache des masses fongiques et les lance depuis les chapeaux géants.", "Canine couverte de spores", 2),
    seed("hive-node", "Nœud de l’esprit-réseau", "flora", "Centre de commandement", "Coordonne les ennemis proches et les rend plus agressifs tant qu’il demeure intact.", "Cerveau mycélien", 4),
    seed("spore-turret", "Tourelle sporale", "flora", "Artillerie guidée", "Oriente ses tubes vers les courants d’air et tire des capsules à tête chercheuse.", "Tube sporifère", 3),
    seed("walking-fungus", "Sporophore marcheur", "flora", "Patrouilleur végétal", "Déplace ses racines en silence et libère des spores lorsqu’il est frappé.", "Pied locomoteur", 2),
    seed("neural-liana", "Liane neurale", "flora", "Contrôle mental", "S’accroche au casque et inverse brièvement les commandes de déplacement.", "Synapse végétale", 3),
    seed("acid-puffball", "Vesse-de-loup acide", "flora", "Hazard corrosif", "Roule le long des pentes puis éclate en pluie d’acide au moindre choc.", "Enveloppe catalytique", 2),
    seed("corpse-cap", "Chapeau cadavérique", "flora", "Nécromasse défensive", "Réanime brièvement les carcasses voisines en marionnettes fongiques.", "Lamelle nécrotique", 4),
    seed("web-mold", "Moisissure en toile", "flora", "Entrave de zone", "Tisse des filaments invisibles entre les plateformes et immobilise les sauts.", "Filament porteur", 2),
    seed("echo-mushroom", "Champignon-écho", "flora", "Leurre acoustique", "Répète les bruits d’armes et attire les patrouilles vers de fausses positions.", "Cavité résonnante", 2),
    seed("queen-hypha", "Hyphe reine", "flora", "Génératrice d’essaim", "Produit continuellement de petits parasites jusqu’à destruction de son bulbe.", "Bulbe royal", 4),
    seed("infected-colonist", "Colon infecté de Mycora", "humanoid", "Hôte agressif", "Conserve l’usage d’outils humains mais obéit aux impulsions du réseau.", "Implant fongique", 2),
    seed("spore-cultist", "Cultiste des spores", "humanoid", "Fanatique ritualiste", "Se sacrifie pour nourrir les nœuds et protège les floraisons avec un fusil rouillé.", "Masque respiratoire gravé", 3),
    seed("quarantine-trooper", "Soldat de quarantaine", "humanoid", "Purificateur armé", "Emploie flammes et mousse stérilisante sans distinguer chasseur et organisme contaminé.", "Buse de stérilisation", 3),
    seed("fungal-xeno", "Drone xénomorphe mycélien", "other", "Prédateur assimilé", "Répand spores et acide, puis régénère près des corps colonisés.", "Dôme à fructifications", 4),
    seed("assimilated-synth", "Synthétique assimilé", "other", "Relais mobile", "Diffuse les ordres du réseau par ses radios et continue malgré ses membres détruits.", "Noyau bioélectronique", 3),
    seed("hive-avatar", "Cœur-Mère mycélien", "other", "Élite psionique", "Crée des copies sporales et attaque depuis celle qui reçoit le plus de nutriments.", "Cœur synaptique", 4),
    seed("sterilization-mech", "Mécha de stérilisation perdu", "other", "Machine incendiaire", "Balaye les zones au lance-flammes et déclenche une purge s’il est encerclé.", "Réacteur de purge", 4),
  ],
  "acheron-sigma": [
    seed("ruin-bat", "Chauve-souris des flèches", "fauna", "Essaim aérien", "Se réveille au son des armes et plonge depuis les voûtes effondrées.", "Crâne écholocateur", 1),
    seed("stone-crawler", "Rampant de pierre", "fauna", "Mimique minéral", "Imite un débris sculpté puis déploie six membres pour encercler sa proie.", "Carapace glyphique", 3),
    seed("vault-rat", "Rat des chambres fortes", "fauna", "Charognard technophile", "Vole cellules d’énergie et petits artefacts avant de fuir dans les conduits.", "Incisive métallique", 1),
    seed("glyph-serpent", "Serpent glyphique", "fauna", "Gardien biologique", "Suit les lignes lumineuses des murs et frappe depuis les inscriptions actives.", "Vertèbre gravée", 3),
    seed("dust-lion", "Lion de poussière", "fauna", "Apex des avenues", "Reconstitue son corps depuis les gravats et charge à travers les couvertures.", "Cœur minéralisé", 4),
    seed("bronze-beetle", "Scarabée de bronze", "fauna", "Nuée conductrice", "Forme des ponts vivants entre machines et réactive les défenses dormantes.", "Élytre conducteur", 2),
    seed("relic-mimic", "Mimique reliquaire", "fauna", "Piège de collectionneur", "Prend l’apparence d’un trophée rare puis enferme les mains qui le saisissent.", "Langue adhésive", 3),
    seed("cable-ivy", "Lierre de câbles", "flora", "Parasite technologique", "Croît le long des circuits et fouette avec des faisceaux sous tension.", "Nœud électrovasculaire", 3),
    seed("stone-orchid", "Orchidée de pierre", "flora", "Tourelle minérale", "Ouvre ses pétales cristallins et concentre un rayon de lumière ancienne.", "Prisme floral", 3),
    seed("archive-mold", "Moisissure d’archive", "flora", "Brouillage cognitif", "Libère des spores qui superposent des glyphes fantômes à la vision du masque.", "Spore mémorielle", 2),
    seed("crystal-creeper", "Grimpante cristalline", "flora", "Barrière expansive", "Étend rapidement ses cristaux sur les chemins empruntés plusieurs fois.", "Germe cristallin", 2),
    seed("relic-raider", "Pillard de reliques", "humanoid", "Escarmouche opportuniste", "Dérobe les objectifs, emploie des artefacts instables et fuit vers les ascenseurs.", "Carte de pillage", 2),
    seed("corporate-archaeologist", "Archéologue corporatiste", "humanoid", "Technicien défendu", "Réactive des sentinelles et marque le chasseur pour les gardes sous contrat.", "Décodeur de glyphes", 2),
    seed("mercenary-guardian", "Gardien mercenaire", "humanoid", "Défense blindée", "Tient les corridors avec bouclier balistique et fusil à impulsion.", "Bouclier de contrat", 3),
    seed("ruin-zealot", "Zélote des ruines", "humanoid", "Fanatique antique", "Déclenche des pièges sacrés et refuse de quitter les salles profanées.", "Icône du culte", 3),
    seed("combat-engineer", "Ingénieure de siège", "humanoid", "Contrôle mécanique", "Répare les automates, place des charges et ferme les portes derrière elle.", "Outil de phase", 3),
    seed("relic-thief-bad-blood", "Bad Blood voleur de reliques", "bad-blood", "Pilleur technologique", "Utilise des armes antiques sans rite et abandonne ses alliés dès qu’un artefact tombe.", "Brassard surchargé", 4),
    seed("clan-deserter", "Déserteur du clan des Voûtes", "bad-blood", "Chasseur renégat", "Connaît les passages Yautja et tend des embuscades près des caches rituelles.", "Marque de clan effacée", 4),
    seed("trophy-seeker", "Chercheur de trophées profanes", "bad-blood", "Rival agressif", "Tente d’achever toute proie affaiblie avant le joueur et vole sa récompense.", "Crochet à trophées", 3),
    seed("ancient-guardian", "Gardien d’obsidienne", "other", "Automate de sanctuaire", "S’éveille à proximité des reliques et alterne rayon et frappe de bouclier.", "Cœur de glyphes", 4),
    seed("sentinel-drone", "Sentinelle orbitale déchue", "other", "Drone de défense", "Patrouille les axes verticaux et enferme une zone dans une grille laser.", "Lentille de sentinelle", 3),
    seed("temple-xeno", "Xénomorphe du temple", "other", "Prédateur de conduit", "Utilise les conduits antiques et attaque au moment où une porte se verrouille.", "Dôme incrusté", 4),
    seed("war-construct", "Constructeur de guerre antique", "other", "Colosse mécanique", "Change d’arme à chaque plaque détruite et protège le noyau dans son torse.", "Noyau de guerre", 4),
    seed("nanite-swarm", "Essaim de nanites funéraires", "other", "Nuée technologique", "Désassemble armure et décor, puis reconstruit un corps près d’une borne active.", "Capsule de nanites", 3),
  ],
} as const satisfies Record<EcologyV8PlanetId, readonly EnemySeed[]>;

const COMMON_SEEDS = [
  seed("interplanetary-scavenger", "Charognard interplanétaire", "fauna", "Opportuniste migrateur", "Suit les cargos et se nourrit des corps laissés par toutes les factions.", "Crâne à quatre narines", 2),
  seed("spore-tick", "Tique à spores voyageuse", "fauna", "Parasite de cargaison", "Se cache dans les caisses, s’accroche à l’armure et diffuse une balise odorante.", "Poche parasitaire", 1),
  seed("colonial-patrol", "Patrouilleur colonial itinérant", "humanoid", "Fusilier polyvalent", "Sécurise les installations humaines en binôme et appelle des renforts sous pression.", "Plaque d’affectation", 2),
  seed("weyland-security-synth", "Synthétique de sécurité corporatif", "other", "Unité de récupération", "Ignore la douleur, verrouille la technologie et combat jusqu’à rupture mécanique.", "Noyau mnésique", 3),
  seed("wandering-xeno-drone", "Drone xénomorphe errant", "other", "Prédateur invasif", "Voyage dans les soutes, grimpe aux parois et isole la cible la plus éloignée.", "Dôme crânien intact", 4),
  seed("bad-blood-scout", "Éclaireur Bad Blood nomade", "bad-blood", "Rival sans territoire", "Observe une chasse en cours, pose un piège déloyal puis tente de voler le trophée.", "Balise de clan profanée", 4),
] as const satisfies readonly EnemySeed[];

const sheetPathForSprite = (spriteId: string) =>
  `/game/sprites/v8/ecology/${spriteId.replace(/^v8\//, "")}-sheet.png`;

function createEndemicEnemy(
  planetId: EcologyV8PlanetId,
  enemySeed: EnemySeed,
): EcologyV8EnemyDefinition {
  const [slug, name, category, role, behavior, trophy, threat] = enemySeed;
  const spriteId = `v8/${planetId}/${slug}`;
  return {
    id: `${planetId}--${slug}`,
    name,
    category,
    role,
    behavior,
    trophy,
    threat,
    spriteId,
    sheetPath: sheetPathForSprite(spriteId),
    distribution: "endemic",
    homePlanetId: planetId,
    planetIds: [planetId],
  };
}

function createCommonEnemy(enemySeed: EnemySeed): EcologyV8EnemyDefinition {
  const [slug, name, category, role, behavior, trophy, threat] = enemySeed;
  const spriteId = `v8/common/${slug}`;
  return {
    id: `common--${slug}`,
    name,
    category,
    role,
    behavior,
    trophy,
    threat,
    spriteId,
    sheetPath: sheetPathForSprite(spriteId),
    distribution: "common",
    homePlanetId: null,
    planetIds: ECOLOGY_V8_PLANET_IDS,
  };
}

export const ECOLOGY_V8_ENEMIES: readonly EcologyV8EnemyDefinition[] = [
  ...ECOLOGY_V8_PLANET_IDS.flatMap((planetId) =>
    ENDEMIC_SEEDS[planetId].map((enemySeed) =>
      createEndemicEnemy(planetId, enemySeed),
    ),
  ),
  ...COMMON_SEEDS.map(createCommonEnemy),
];

export const ECOLOGY_V8_ENEMY_BY_ID: Readonly<
  Record<string, EcologyV8EnemyDefinition>
> = Object.fromEntries(ECOLOGY_V8_ENEMIES.map((enemy) => [enemy.id, enemy]));

const COMMON_ENEMY_IDS = ECOLOGY_V8_ENEMIES.filter(
  (enemy) => enemy.distribution === "common",
).map((enemy) => enemy.id);

export const ECOLOGY_V8_PLANETS: readonly EcologyV8PlanetDefinition[] =
  PLANET_META.map((planet) => {
    const endemicEnemyIds = ECOLOGY_V8_ENEMIES.filter(
      (enemy) =>
        enemy.distribution === "endemic" && enemy.homePlanetId === planet.id,
    ).map((enemy) => enemy.id);
    return {
      ...planet,
      endemicEnemyIds,
      commonEnemyIds: COMMON_ENEMY_IDS,
      enemyIds: [...endemicEnemyIds, ...COMMON_ENEMY_IDS],
    };
  });

export const ECOLOGY_V8_PLANET_BY_ID: Readonly<
  Record<EcologyV8PlanetId, EcologyV8PlanetDefinition>
> = Object.fromEntries(
  ECOLOGY_V8_PLANETS.map((planet) => [planet.id, planet]),
) as Record<EcologyV8PlanetId, EcologyV8PlanetDefinition>;

export function ecologyV8EnemyForId(
  enemyId: string,
): EcologyV8EnemyDefinition | null {
  return ECOLOGY_V8_ENEMY_BY_ID[enemyId] ?? null;
}

export function ecologyV8ForPlanet(
  planetId: EcologyV8PlanetId,
): readonly EcologyV8EnemyDefinition[] {
  return ECOLOGY_V8_PLANET_BY_ID[planetId].enemyIds.map(
    (enemyId) => ECOLOGY_V8_ENEMY_BY_ID[enemyId],
  );
}

export function ecologyV8ForMission(
  missionId: EcologyV8MissionId,
): readonly EcologyV8EnemyDefinition[] {
  const planet = ECOLOGY_V8_PLANETS.find(
    (candidate) => candidate.missionId === missionId,
  );
  return planet ? ecologyV8ForPlanet(planet.id) : [];
}
