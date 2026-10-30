/**
 * Yautja · V120 · 1,200 authored war-contract blueprints.
 *
 * 4 operation formats × 3 editorial families × 100 variants.
 * Every entry has a unique operational site, objective pairing and scene key.
 * This is a DATA CATALOGUE, not 1,200 instantly playable levels.
 * Original and lore-compatible contexts are invented for this game; known
 * locations are deliberately transformed HOMAGES, never canonical encounters.
 * No entry changes V85/V6 simulation, awards trophies, or generates a soldier.
 */
export type ClanWarVariantModeV120 = "assault" | "outer" | "stealth" | "rts";
export type ClanWarVariantFamilyV120 = "original" | "lore" | "homage";
export type ClanWarVariantStatusV120 = "design-only";
export interface ClanWarVariantV120 {
  id:string; schema:120; number:number; mode:ClanWarVariantModeV120;
  family:ClanWarVariantFamilyV120; status:ClanWarVariantStatusV120;
  title:string; world:string; region:string; site:string; mapKey:string;
  biome:string; terrain:string; liquid:string; atmosphere:string;
  weather:string; light:string; palette:string; geometry:string;
  objective:string; secondary:string; interaction:string; enemyBehavior:string;
  complication:string; failure:string; withdrawal:string;
  strategicConsequence:string; primaryMechanic:string;
  routeOrLayout:string; threatLevel:number; suggestedMinutes:number;
  mandatoryRoles:string[]; assetsNeeded:string[];
  inspiration:string; inspirationClass:string; continuity:string;
  canonStatus:string; referenceUrl:string;
  narrativeHook:string; gameplayTags:string[];
}
export const CLAN_WAR_V120_MODES:readonly ClanWarVariantModeV120[] =
  ["assault","outer","stealth","rts"];
export const CLAN_WAR_V120_FAMILIES:readonly ClanWarVariantFamilyV120[] =
  ["original","lore","homage"];

const ORIGINAL_WORLDS = [
 "Vahr-Tel|atoll de basalte cobalt|pierre vitrifiée|lagune saline bleu-noir|bourrasque de cendres|atolls en anneau|indigo et cuivre",
 "Serrak-9|faille d’obsidienne|verre volcanique|lave épaisse|poussière pyrique|ravins superposés|rouge de forge",
 "Myr-Os|récif de verre aérien|silicate strié|brume liquide|averse prismatique|terrasses suspendues|cyan et améthyste",
 "Kel-Dra|mer ammoniacale|argile polaire|ammoniaque liquide|gel corrosif|caps de mer morte|ivoire glacé",
 "Gorann|cimes silicifiées|racines pétrifiées|torrent minéral|orages de racines|colonnes arborescentes|vert d’émeraude",
 "Oth-Phel|canyon de sel rose|plaques de sel|source hypersaline|tempête sèche|gorges effondrées|rose et gris",
 "Yel-Kor|forêt bioluminescente|mousse lumineuse|bassin d’eau noire|pluie de spores|canopée à niveaux|turquoise nocturne",
 "Karth-66|plateau ferromagnétique|scories ferriques|nappes métalliques|orage magnétique|aiguilles conductrices|rouille bleutée",
 "Dhor-Eim|marais méthanique|tourbe soufrée|méthane liquide|brouillard inflammable|îles de tourbe|ocre et pétrole",
 "Nharr|glacier de cendres|neige cendreuse|saumure sous glace|bourrasque blanche|moraines incisées|blanc charbonneux",
 "Rilk-Mah|mangrove carnivore|liane chitineuse|eau saumâtre|marée organique|racines-ponts|vert venin",
 "Phaaros|dunes de magnétite|sable magnétique|oasis ferrugineuse|rafales abrasives|crêtes mouvantes|sépia et anthracite",
 "Ves-Noll|labyrinthe de ponce|pierre poreuse|vapeur souterraine|tremblement creux|tunnels superposés|gris nacré",
 "Oor-Kha|aquifère géothermique|travertin|source sulfurée|geyser instable|vasques étagées|ambre laiteux",
 "Lhask|falaises de gravité faible|roc alvéolaire|mer de brouillard|courants ascendants|arches flottantes|lilas orageux",
 "Nekra-3|permafrost noir|tourbe gelée|huile piégée|nuit polaire|fissures polygonales|bleu ardoise",
 "Eyk-Sha|toundra phosphorescente|lichen ionisé|mare froide|aurore électrique|plateaux ondulés|violet et citron",
 "Haron-Kel|coraux fossiles|calcaire spiralé|eau captive|orage sec|falaises récifales|crème et bleu",
 "Thar-Voss|grottes organiques|membrane calcaire|lymphe souterraine|contraction tectonique|siphons vivants|carmin sombre",
 "Ydr-11|lac d’hydrocarbures|schiste bitumineux|nappe d’huile|émanation toxique|bassins à digues|noir irisé",
 "Irra-Phel|désert de cristaux|quartz tranchant|miroir liquide|grêle de verre|ergs prismatiques|argent orangé",
 "Sah-Quen|forêt d’aiguilles extraterrestres|écorce céramique|résine liquide|vent de sifflement|troncs en spirale|vert cendre",
 "Mok-Khri|volcan sous-glaciaire|basalte crevassé|eau de fonte|panache thermique|cheminées de glace|bleu et lave",
 "Rann-Ist|prairie d’écailles|limon écailleux|canal alluvial|orage d’insectes|prairies creusées|or pâle",
 "Zehr-Ash|steppe ferrique|terre rouge oxydée|rivière minérale|vent ionique|mesa à escarpements|rouge martien"
] as const;

const LORE_CONTEXTS = [
 "conseil des Anciens|jugement d’un mandat contesté|salle des marques de clan|interprétation interne",
 "rite de passage de jeune chasseur|épreuve de discipline et extraction|corridor d’initiation|motif AVP multcontinuité",
 "vaisseau de chasse|défense d’un hangar de navette|pont d’embarquement|motif des films",
 "collection de trophées|inventaire vérifié, sans trophée gratuit|salle de conservation|motif des films",
 "traque d’un renégat|établir des preuves avant l’interception|poste de poursuite|motif comics à attribuer",
 "arbitrage d’Enforcer|apporter un dossier de violation attesté|route d’escorte judiciaire|motif comics à attribuer",
 "contestation de lignage|protéger les témoins d’une rivalité|cour d’allégeance|création originale compatible",
 "fête du retour de chasse|sécuriser les armes sans blesser les invités|place cérémonielle|création originale compatible",
 "route de ravitaillement RAV|préserver un chargement identifié|dépôt de chasse|règle propre à la Bible V6",
 "maison de clan|tenir un seuil de propriété acquise|parvis des résidences|création originale compatible",
 "chenil de chiens de chasse|éviter une panique des bêtes de garde|enclos à doubles portes|motif inspiré de Predators",
 "écurie de montures|préserver les harnais pendant l’alarme|piste d’envol|création originale compatible",
 "atelier de masques|isoler une série de bio-masques défectueux|fonderie d’optique|motif technologique des films",
 "arsenal de lames|récupérer les armes gravées d’une lignée|râtelier de forge|motif technologique des films",
 "réseau de camouflage|protéger un relais d’occultation|galerie de capteurs|motif technologique des films",
 "pont de vaisseau de clan|transmettre un mandat sans changer le capitaine|nef de commandement|création originale compatible",
 "forge de plasma|arrêter un emballement sans tirer sur les civils|chambre de confinement|motif technologique des films",
 "camp de Blooded|évacuer un blessé avant une nouvelle épreuve|périmètre d’entraînement|motif transmedia à vérifier",
 "zone de quarantaine xénomorphe|contenir une brèche sans disséminer d’œufs|sas de biosécurité|continuité AVP distincte",
 "ancien terrain de chasse|restituer les preuves d’un ancien duel|amphithéâtre de traces|création originale compatible",
 "ferme de champignons protéiques|sauver les réserves du clan|serre en roche|création originale compatible",
 "relai d’un clan allié|vérifier un signal avant la rupture d’un pacte|ambassade de frontière|création originale compatible",
 "cachette d’un vétéran|retrouver une balise de mission perdue|refuge rocheux|création originale compatible",
 "cour du souverain local|déjouer une usurpation sans régicide automatique|antichambre de gardes|création originale compatible",
 "observatoire de proies dignes|éviter la chasse d’êtres incapables de se défendre|terrasse d’observation|code non universel selon continuité"
] as const;

const HOMAGE_PLACES = [
 "jungle de Predator 1987|rivière et canopée|film",
 "Los Angeles de Predator 2|toits et métro chaud|film",
 "Grandes Plaines de Prey|hautes herbes et ravines|film",
 "pyramide antarctique d’Alien vs. Predator|salles mobiles sous glace|film",
 "Gunnison d’AVP Requiem|rues nocturnes désertées|film",
 "planète réserve de Predators|forêt de chasse extraterrestre|film",
 "monde reculé de Predator Badlands|faune agressive et roche|film",
 "arène viking de Killer of Killers|fortin de bois et neige|film",
 "jardin clos du Japon féodal|passages shoji et lanternes|film",
 "aérodrome nord-africain de 1942|hangars poussiéreux|film",
 "Nostromo d’Alien|couloirs industriels|fiction",
 "Hadley’s Hope d’Aliens|colonie en tempête|fiction",
 "LV-426 des Aliens|raffinerie sous ciel sombre|fiction",
 "Sevastopol d’Alien Isolation|gare orbitale|fiction",
 "Fiorina 161 d’Alien 3|fonderie carcérale|fiction",
 "USM Auriga d’Alien Resurrection|laboratoire spatial|fiction",
 "LV-223 de Prometheus|structure préhumaine|fiction",
 "USCSS Covenant|arche coloniale|fiction",
 "USS Sulaco d’Aliens|hangar d’assaut|fiction",
 "station Renaissance d’Alien Romulus|laboratoires en orbite|fiction",
 "Machu Picchu|terrasses incas|patrimoine",
 "Angkor Wat|chaussées et douves|patrimoine",
 "Pétra|façades roses et gorges|patrimoine",
 "pyramides de Gizeh|chambres et dunes|patrimoine",
 "Colisée de Rome|gradins et hypogée|patrimoine",
 "Chichén Itzá|terrasses et escaliers|patrimoine",
 "Bagan|plaine de temples|patrimoine",
 "Sigiriya|rocher-palais|patrimoine",
 "Mont-Saint-Michel|remparts soumis aux marées|patrimoine",
 "Alhambra|patios et canaux|patrimoine",
 "Taj Mahal|jardins symétriques|patrimoine",
 "Sainte-Sophie|grandes coupoles|patrimoine",
 "Acropole d’Athènes|esplanade rocheuse|patrimoine",
 "Borobudur|terrasses de stupas|patrimoine",
 "Cité interdite|cours et portails|patrimoine",
 "Teotihuacán|avenue de pyramides|patrimoine",
 "alignements de Carnac|monolithes bretons|patrimoine",
 "Stonehenge|cercle mégalithique|patrimoine",
 "Rapa Nui|statues moai et océan|patrimoine",
 "Nan Madol|îlots et murs de basalte|patrimoine",
 "Grand Canyon|strates rouges et précipices|nature",
 "Salar de Uyuni|miroir de sel|nature",
 "désert d’Atacama|vallées arides|nature",
 "Uluru|monolithe australien|nature",
 "Zhangjiajie|piliers brumeux|nature",
 "forêt amazonienne|fleuves et canopée|nature",
 "delta de l’Okavango|chenaux et îles|nature",
 "Pamukkale|vasques blanches|nature",
 "Yellowstone|geysers et pins|nature",
 "Reykjanes en Islande|failles volcaniques|nature",
 "Torres del Paine|pics et glaciers|nature",
 "fjords norvégiens|parois et bras de mer|nature",
 "Dolomites|aiguilles alpines|nature",
 "désert du Namib|dunes rouges|nature",
 "Socotra|arbres dragonniers|nature",
 "mont Bromo|caldeira fumeuse|nature",
 "Wadi Rum|arches de grès|nature",
 "dépression du Danakil|salines multicolores|nature",
 "lac Baïkal|glace transparente|nature",
 "chutes Victoria|brume et cataractes|nature",
 "Shibuya à Tokyo|carrefours lumineux|ville",
 "Central à Hong Kong|escaliers et tours|ville",
 "Manhattan à New York|gratte-ciel et vapeur|ville",
 "catacombes de Paris|galeries minérales|ville",
 "métro de Londres|tunnels et quais|ville",
 "Burj Khalifa à Dubaï|flèche vitrée|ville",
 "Gardens by the Bay à Singapour|serres arborées|ville",
 "Pudong à Shanghai|passerelles aériennes|ville",
 "viaducs de São Paulo|béton urbain|ville",
 "Vieux-Port de Marseille|bassins et docks|ville",
 "Arsenal de Venise|ateliers navals|ville",
 "Tempelhof à Berlin|pistes et hangars|ville",
 "Pripiat près de Tchernobyl|ville abandonnée|ville",
 "port de Rotterdam|terminaux géants|ville",
 "Bosphore à Istanbul|ponts entre rives|ville",
 "Dongdaemun à Séoul|architecture métallique|ville",
 "gare CST de Mumbai|voûtes et quais|ville",
 "Loop de Chicago|métro surélevé|ville",
 "Opéra de Sydney|voiles blanches|ville",
 "Metrocable de Medellín|cabines sur ravins|ville",
 "Shadow Moses de Metal Gear|base insulaire arctique|jeu",
 "Outer Heaven de Metal Gear|forteresse avancée|jeu",
 "Big Shell de Metal Gear Solid 2|plateforme maritime|jeu",
 "Mother Base de Peace Walker|plateforme océanique|jeu",
 "Raccoon City de Resident Evil|blocs urbains contaminés|jeu",
 "City 17 de Half-Life|ville de surveillance|jeu",
 "Black Mesa de Half-Life|laboratoires sous roche|jeu",
 "Aperture Science de Portal|salles modulaires|jeu",
 "Rapture de BioShock|ville sous-marine|jeu",
 "Columbia de BioShock Infinite|quartiers aériens|jeu",
 "château d’Hyrule de Zelda|remparts de conte|jeu",
 "Midgar de Final Fantasy VII|couronnes industrielles|jeu",
 "Moria du Seigneur des Anneaux|cavernes et piliers|fiction",
 "Minas Tirith du Seigneur des Anneaux|cité à étages|fiction",
 "Arrakis de Dune|désert d’épices|fiction",
 "Tatooine de Star Wars|habitations troglodytes|fiction",
 "Coruscant de Star Wars|planète-ville stratifiée|fiction",
 "Reach de Halo|canyons militaires|jeu",
 "Night City de Cyberpunk|mégapole néon|jeu",
 "Novigrad de The Witcher|canaux médiévaux|jeu"
] as const;

const PER_WORLD_SECTORS = [
 "seuil des quatre vents","bassin terminal","corniche des témoins","enclave des passeurs"
] as const;
const LORE_SECTORS = [
 "paroi des serments","chemin des porteurs","poste des veilleurs","arrière-cour du retour"
] as const;
const MODE_DISTRICTS = {
 assault:["rempart mobile","tunnel frontal","double plate-forme","croisée de rampes","bastion en éventail","éperon exposé","rampe en spirale","sas défensif"],
 outer:["nœud de transit","escale secondaire","chemin de crête","passage de service","débarcadère","corridor logistique","gué reculé","balise de jonction"],
 stealth:["gaine silencieuse","balcon aveugle","couloir d’ombre","alcôve de capteurs","puits de maintenance","toiture de guet","drain souterrain","verrière suspendue"],
 rts:["front tripartite","plateau central","vallée à deux gués","quadrant d’artillerie","ponts fracturés","trois lignes défensives","archipel tactique","cuvette de ravitaillement"],
} as const;
const WEATHER=["brume thermique","averse cendreuse","gel subit","vent latéral","aurore instable","tempête électrostatique","pluie de sel","accalmie trompeuse","nuit sans lune","retour de vapeur","marée de spores","rafales de poussière"];
const LIGHT=["aube cuivrée","crépuscule violet","nuit polaire","plein midi cru","éclipse partielle","éclairage de secours","lueur volcanique","reflets bioluminescents"];
const HAZARDS=[
 "marée corrosive","éboulement de corniche","inversion des flux magnétiques","poussière occultante","jet intermittent de vapeur","présence de faune territoriale",
 "spores altérant les capteurs","pont devenu instable","reflet thermique trompeur","crue de canal","sables qui glissent","gel rapide des articulations",
 "orage ionique","vibrations sismiques","excès de pression","panne de radar","chute d’un échafaudage","visibilité hachée par les lianes",
 "rupture d’un champ de gravité","fuite de gaz dense","ondée de verre fin","panne de relais de navigation","remontée de liquide noir",
 "effondrement d’une voûte","surcharge de projecteurs","nuage de cendres","refoulement d’un conduit","dérive des barges","avalanche de pierres","signal leurre"
];
const GEOMETRIES=[
 "escalier brisé avec ligne de vue partielle","trois niveaux reliés par deux échelles","passage inférieur inondable","deux ponts dont un effondrable",
 "balcons asymétriques","canyon à corniches alternées","plateau circulaire à accès décalés","salles concentriques",
 "dalles instables et fossé central","galeries radiales et puits","archipel à passerelles repliables","remparts échelonnés",
 "tunnel sinueux sous réservoir","tour à rampes hélicoïdales","terrasses descendantes","couloir de service à portes étroites",
 "champ d’arches effondrées","crête centrale à contournement","esplanade avec couverts destructibles","grotte en voûtes communicantes",
 "hautes herbes coupant la vision","mégastructure à sas alternés","goulet sur digue étroite","ruines en damier",
 "récif perforé de cavernes","quai à trois zones","façade à tourelles aveugles","défilé à embranchements",
 "labyrinthe de racines creuses","cité à toitures franchissables"
];
const TWISTS=[
 "une escouade adverse change de flanc au signal","un passage sûr devient praticable seulement après observation",
 "un témoin refuse de suivre une troupe trop visible","un relais doit être tenu sans couper la route de repli",
 "une réserve d’énergie est limitée à la moitié","les liquides montent après la première alarme",
 "le second objectif n’apparaît qu’une fois le premier contrôlé","le couvert le plus solide devient dangereux",
 "des renforts n’arrivent qu’en suivant un chemin encore relié","la mauvaise issue immobilise les porteurs",
 "un sas se ferme quand les sentinelles tournent","une tourelle doit être désactivée sans créer de victimes secondaires",
 "des civils non combattants traversent une zone neutre","une balise trompeuse détourne les unités automatiques",
 "le terrain absorbe le signal du bio-masque","le convoi doit conserver son identifiant de cargaison",
 "un vétéran adverse anticipe les attaques répétitives","un nœud de ravitaillement dépend d’un pont latéral",
 "la zone de rassemblement reste visible à l’ennemi","un adversaire feint le repli pour tendre une embuscade"
];
const FAILURES=[
 "repli après rupture de liaison et perte de l’objectif","évacuation d’un blessé sans appropriation du site",
 "interruption après alarme générale et retour à la frontière","renvoi au conseil faute de preuve suffisante",
 "mission annulée lorsque la charge est abandonnée","détachement retiré si le poste de commandement s’effondre",
 "retour sous couverture sans supprimer les témoins","bataille arrêtée si les réserves RAV sont insuffisantes",
 "repli depuis le dernier gué contrôlé","échec si le chargement est détruit ou falsifié",
 "extraction immédiate si la zone de non-combattants devient menacée","perte du relais après contre-attaque",
 "suspension lors d’un brouillage prolongé","retour sans trophée ni récompense de campagne",
 "sortie du front si le brouillard de guerre masque le passage"
];
const ASSAULT_GOALS=[
 "percer le mur d’écrans|un poste de tir à longue portée|déployer par deux lignes avec AP séparés",
 "tenir une barricade mobile|un train de blindage artisanal|résister jusqu’à la relève du bastion",
 "arracher le pont de flanc|un treuil défensif|placer des porteurs à l’avant sans doubler les effectifs",
 "neutraliser la rampe de plasma|un canon de dissuasion|ouvrir une fenêtre de tir limitée",
 "protéger la porte des guérisseurs|un abri de blessés|interdire les tirs sur les non-combattants",
 "désorganiser un siège à trois vagues|un relais de coordination|retarder les renforts à chaque palier",
 "reprendre un quai sous pression|une batterie côtière|maintenir un détachement sur le quai",
 "franchir un couloir venté|des points de tir alternés|déployer les éclaireurs avant les porteurs",
 "détruire un verrou de service|une porte de combat|garder la voie d’extraction ouverte",
 "couvrir le retrait des chasseurs|un pilier de passage|perdre au plus une position alliée",
 "réparer l’avant-poste en feu|un générateur exposé|défendre l’artisan en travaux",
 "renverser un nid de projecteurs|une vigie blindée|éviter les fenêtres de tir simultanées",
 "isoler une tour de guet|un pont suspendu|couper les renforts avant l’assaut final",
 "escorter un bélier de clan|un portail lourd|protéger l’engin de siège réutilisable",
 "repousser une contre-charge montée|un chenal de cavaliers|réserver un flanc contre la ruée",
 "fermer la brèche d’arcade|une passerelle endommagée|placer les défenseurs au bon étage",
 "détruire une tourelle piégée|une casemate d’observation|attendre la désactivation de son leurre",
 "exfiltrer un convoi pris au piège|un tunnel de sortie|ouvrir la route sans détruire la charge",
 "casser un encerclement vertical|trois passerelles ennemies|conserver une ligne de renfort",
 "sécuriser un drapeau de cessez-le-feu|un poste de signal|limiter les dégâts collatéraux",
 "soutenir une percée de vétérans|un bastion de flanc|combiner AP et manœuvres à usage unique",
 "réduire une batterie de flèches|des catapultes rivales|traverser la zone morte en deux bonds",
 "briser la porte du labyrinthe|une serrure militaire|désigner les bonnes cibles sans tir aveugle",
 "protéger un dépôt d’armes|un magasin fortifié|tenir la ligne jusqu’au retour des porteurs",
 "prendre une corniche à deux accès|une plateforme élevée|éviter l’enlisement des unités lourdes"
] as const;
const OUTER_GOALS=[
 "reconnaître les traces|un gué suspect|rapporter les positions sans dévoiler les alliés",
 "escorter une charge datée|des caisses de RAV identifiées|rapatrier les scellés intacts",
 "récupérer une patrouille|des balises individuelles|localiser tous les membres et signaler les absents",
 "relever des balises|une chaîne de capteurs|établir un itinéraire vérifiable",
 "contrôler une route|une passe à plusieurs embranchements|identifier les péages et embuscades",
 "observer une garnison|un avant-poste rival|remettre des renseignements partiels",
 "protéger des soigneurs|un transport médical|conserver les personnes sous leur identité",
 "rechercher un matériel égaré|une trousse de bio-masque|enregistrer les composants réellement retrouvés",
 "intercepter un message|un relais de bordure|indiquer la fiabilité de la source",
 "rapatrier des blessés|un abri isolé|différencier blessés et porteurs",
 "suivre un ennemi en retrait|une piste thermique|ne pas convertir l’observation en capture",
 "réparer un chemin de ravitaillement|un ouvrage de passage|apporter un devis avant les travaux",
 "approvisionner un poste|des réserves de filtre|déduire la charge transportée des stocks",
 "négocier un droit de passage|des marqueurs de clan|revenir sans engager une annexion",
 "inspecter des trophées volés|un coffre scellé|déterminer la provenance sans fabriquer de trophée",
 "identifier un brouillage|une station de guidage|établir la source des interférences",
 "surveiller un corridor de chasse|des points d’observation|distinguer proies et factions",
 "documenter une trêve|une borne de frontière|rapporter les violations constatées",
 "relier deux garnisons|une piste de crête|assurer la remise du rapport",
 "chercher des pièces de vaisseau|un champ d’épaves|noter les éléments impossibles à extraire",
 "observer une migration dangereuse|un passage de faune|modifier l’itinéraire sans tirer",
 "réparer un émetteur|une antenne de secours|protéger l’artisan pendant le travail",
 "examiner une colonie étrangère|un habitat non combattant|protéger la discrétion des habitants",
 "reconnaître la météo de guerre|un col atmosphérique|prévenir les autres escouades",
 "rapporter un cessez-le-feu rompu|un poste d’arbitrage|conserver les preuves des deux parties"
] as const;
const STEALTH_GOALS=[
 "neutraliser discrètement|un relais de surveillance|atteindre le relais et ressortir sans poursuite",
 "photographier|un plan de garnison|effacer la trace de l’accès",
 "libérer|un éclaireur retenu|retrouver son équipement sans bruit",
 "récupérer|un registre de passage|ne laisser aucune page manquante",
 "désamorcer|une mine de couloir|marquer le trajet redevenu sûr",
 "débrancher|un émetteur de brouillage|laisser le système en apparence fonctionnel",
 "déposer un leurre|une borne de poursuite|choisir une direction de diversion",
 "ouvrir|un sas d’extraction|ne pas réveiller la garde latérale",
 "suivre en ombre|un guide ennemi|identifier son dépôt de destination",
 "reprogrammer|un projecteur thermique|créer un cône d’ombre temporaire",
 "identifier|un faux trophée|scanner les scellés sans le toucher",
 "désactiver|une barrière automatique|contourner les plaques de pression",
 "extraire|un témoin sans armement|garder sa position hors des projecteurs",
 "saboter|un treuil de casemate|empêcher une ouverture sans faire tomber le pont",
 "écouter|un conseil rival|ne pas conclure à une trahison sans preuve",
 "piéger|un registre de fausses pistes|laisser un message vérifiable",
 "couper|une liaison de drones|éviter les capteurs de secours",
 "remplacer|une batterie d’alarme|synchroniser la coupure et la relève",
 "cartographier|un réseau de conduits|révéler l’issue avant de déplacer le héros",
 "récupérer|une clef de coffre|se retirer sans ouvrir le coffre sur place",
 "protéger|un soigneur dissimulé|éviter la mise à nu du refuge",
 "détourner|une patrouille de pisteurs|conserver le camouflage pour l’extraction",
 "isoler|une caisse de preuves|éviter tout prélèvement de trophée",
 "réinitialiser|un signal d’urgence|laisser une copie authentifiée",
 "observer|un duel de deux clans|n’intervenir que si le duel menace des tiers"
] as const;
const RTS_GOALS=[
 "tenir trois objectifs|un triangle de postes|organiser des rotations avec vraies garnisons",
 "escorter une colonne|un régulateur de transport|faire arriver la charge et son porteur",
 "réparer une station|un filtre sous pression|maintenir les artisans sur place",
 "prendre un gué|un pont étroit|protéger le ravitaillement de flanc",
 "défendre un atelier|une forge exposée|poser des couverts sans créer de ressources",
 "sécuriser une hauteur|un relais sur colline|conserver l’observation en brouillard",
 "organiser un repli|deux sorties menacées|évacuer les derniers blessés",
 "couper les renforts|un réseau de passerelles|tenir les nœuds logistiques",
 "conquérir un dépôt temporaire|des stocks authentifiés|garder une équipe sur site après victoire",
 "contrer un débarquement|un quai orbital|repousser trois transports successifs",
 "protéger des réparateurs|une pompe de canal|couper la menace des tireurs",
 "installer un pont mobile|une gorge de transit|gérer un chantier de tour en tour",
 "contrôler une batterie|un poste d’artillerie|conserver les munitions mesurées",
 "briser une manœuvre d’encerclement|des ailes rivales|conserver une sortie ouverte",
 "évacuer une enclave|des habitations non combattantes|interdire les dégâts collatéraux",
 "garder un pont de vaisseau|un quartier de commandement|tenir l’accès sans tuer les témoins",
 "désactiver un radar|un nœud de guidage|envoyer une équipe technicienne",
 "prendre deux refuges|des caves en pente|relier les garnisons avant le résultat",
 "consolider une ligne|une ceinture de murs|placer des équipes selon leur portée",
 "secourir un groupe monté|un col de cavaliers|assurer une voie de retraite",
 "protéger une balise diplomatique|un drapeau de trêve|éviter de briser le traité",
 "contrôler une nappe d’eau|des vannes de barrage|gérer des terrains inondés",
 "survivre à une contre-offensive|trois fronts convergents|récupérer les unités isolées",
 "neutraliser un centre d’alarme|un émetteur défendu|ne pas détruire les archives",
 "tenir l’entrée d’un village|un portail et deux venelles|mettre les unités civiles hors de portée"
] as const;
const GOALS={assault:ASSAULT_GOALS,outer:OUTER_GOALS,stealth:STEALTH_GOALS,rts:RTS_GOALS} as const;
const PRIMARY_MECHANICS={
 assault:["AP limité et renforts différés","deux bastions et couverts destructibles","progression automatique avec sortie unique","manœuvre spéciale une fois par équipe"],
 outer:["délai de mission et rapport à échéance","affectation non doublonnable des membres","itinéraire réel à sens et coût contrôlés","retour avec blessés, XP et preuve horodatée"],
 stealth:["camouflage à énergie finie et patrouilles","lignes de vue et bruit de terrain","interaction physique puis extraction","alarme progressive et diversion observable"],
 rts:["ordres alternés ou temps réel","couvert, hauteur et visibilité locale","charge portée par unité identifiée","contrôle de zone et logistique de garnison"]
} as const;
const EXIT_RULES={
 assault:["tenir une issue derrière le rempart","replier les derniers défenseurs par le tunnel intact","préserver le sas de secours","ramener les unités survivantes au point de déploiement"],
 outer:["retour du rapport sur le même trajet","évacuation vers le dernier poste allié","rendez-vous au gué de secours","rapatriement par la seule escale ouverte"],
 stealth:["retour à l’extraction sans alarme totale","sortie par la galerie latérale","récupération du point d’infiltration initial","évasion après déclenchement d’un leurre"],
 rts:["rassembler les unités au poste arrière","extraire la cargaison par le bon corridor","abandonner le terrain sans créer de victimes absentes","ramener les blessés derrière une garnison"]
} as const;
const PALETTES=["bistre et cyan","vert nocturne","cuivre et ivoire","améthyste et anthracite","ocre mouillé","gris rouille","bleu glacier","rouge argile"];
const FACTIONS=["veilleurs du seuil","porteurs rivaux","guetteurs des pentes","artisans retranchés","pisteurs en dispute","escorte d’un clan étranger","garde de carrefour","défenseurs du relais","patrouilleurs du col","vétérans du bastion"];
const ROLES={
 assault:["1 éclaireur libre","1 détachement de ligne","1 réserve de commandement"],
 outer:["1 équipe W3-U libre","personnes identifiées","passages W3-L vérifiés"],
 stealth:["1 à 2 équipes","camouflage disponible","issue de repli reconnue"],
 rts:["1 équipe W3-U de garde","1 soutien logistique selon le but","capacité PC admise"]
} as const;
const MODE_LABELS={assault:"Assaut latéral",outer:"Mandat délégué",stealth:"Infiltration",rts:"Guerre RTS"} as const;
const REFS={
 predator:"https://www.20thcenturystudios.com/movies/predator/",
 predator2:"https://www.20thcenturystudios.com/movies/predator-2",
 prey:"https://www.20thcenturystudios.com/movies/prey",
 avp:"https://www.20thcenturystudios.com/movies/alien-vs-predator",
 predators:"https://www.20thcenturystudios.com/movies/predators",
 badlands:"https://www.20thcenturystudios.com/movies/predator-badlands"
} as const;
function nmod(x:number,n:number){return ((x % n)+n)%n;}
function split(s:string){return s.split("|");}
function sourceForInspiration(index:number):string{
  return [REFS.predator,REFS.predator2,REFS.prey,REFS.avp,"",REFS.predators,REFS.badlands][index] ?? "";
}
export function buildClanWarVariantsV120():ClanWarVariantV120[]{
  const variants:ClanWarVariantV120[]=[];
  CLAN_WAR_V120_MODES.forEach((mode,mi)=>{
    CLAN_WAR_V120_FAMILIES.forEach((family,fi)=>{
      for(let index=0;index<100;index++){
        const id="GWV120-"+["AS","OP","IN","RT"][mi]+"-"+["OR","LO","HO"][fi]+"-"+String(index+1).padStart(3,"0");
        const ecotype=split(ORIGINAL_WORLDS[nmod(index+fi*7,25)]);
        const [planet,ecosystem,land,liquid,climate,topology,palette]=ecotype;
        const [loreTheme,loreDuty,loreRoom,loreGrade]=split(LORE_CONTEXTS[index%25]);
        const [famous,famousGeometry,inspirationClass]=split(HOMAGE_PLACES[index]);
        const baseSector=family==="original"?PER_WORLD_SECTORS[Math.floor(index/25)]:
          family==="lore"?LORE_SECTORS[Math.floor(index/25)]:"espace de réinterprétation";
        const district=MODE_DISTRICTS[mode][nmod(index*3+mi*2+fi,8)];
        const world=family==="original"?planet:family==="lore"?"Monde-clan de la chasse (fiction du jeu)":"Monde-écho "+String(index+1).padStart(3,"0");
        const region=family==="original"?ecosystem:family==="lore"?loreRoom:"évocation de "+famous;
        const site=family==="original"?baseSector+" / "+district+" de "+planet:
          family==="lore"?loreRoom+" / "+baseSector+" / "+district+" "+String(index+1):
          "écho de "+famous+" / "+district+" de chasse "+String(index+1);
        const biome=family==="original"?ecosystem:
          family==="lore"?ecosystem+" aux abords du "+loreRoom:
          famousGeometry+" transposé en "+ecosystem;
        const pattern=split(GOALS[mode][nmod(index+fi*11+mi*3,25)]);
        const [verb,target,condition]=pattern;
        const danger=HAZARDS[nmod(index*7+fi*13+mi*3,HAZARDS.length)];
        const adversary=FACTIONS[nmod(index+mi*4+fi*2,FACTIONS.length)];
        const geometry=GEOMETRIES[nmod(index*7+mi*9+fi*2,GEOMETRIES.length)];
        const twist=TWISTS[nmod(index*3+fi*5+mi*4,TWISTS.length)];
        const primaryMechanic=PRIMARY_MECHANICS[mode][Math.floor(index/25)];
        const exit=EXIT_RULES[mode][Math.floor(index/25)];
        const config=String(index+1).padStart(3,"0");
        const difficulty=1+nmod(index+fi*2+mi,5);
        const atlasType=mode==="assault"?"coupe latérale multi-lignes":
          mode==="outer"?"graphe de transit multisectoriel":
          mode==="stealth"?"passages à couvert et lignes de vue":"grille vue de dessus à objectifs";
        const tag1=family==="lore"?"code du clan discuté":"non canon";
        const referenceUrl=family==="homage"?sourceForInspiration(index):
          family==="lore"&&index%25===18?REFS.avp:
          family==="lore"&&index%25===10?REFS.predators:
          family==="lore"&&index%25===0?REFS.badlands:"";
        const continuity=family==="original"?"monde inédit du jeu":
          family==="lore"?"interprétation Yautja : "+loreGrade:
          "clin d’œil artistique, aucun voyage inter-franchises déclaré";
        const intro=family==="original"?
          "Un front inédit se forme autour du "+ecosystem+" sur "+planet+".":
          family==="lore"?
            "Une affaire de clan concerne "+loreTheme+" ; le mandat porte sur "+loreDuty+".":
            "Le site évoque "+famous+" par ses volumes et matériaux ; ce n’est pas le lieu canonique.";
        const objective="À "+site+", "+verb+" : "+target+".";
        const secondary="Condition particulière : "+condition+" ; "+twist+".";
        const narrativeHook=intro+" "+objective+" Le champ est perturbé par "+danger+".";
        const title=MODE_LABELS[mode]+" — "+verb+" / "+site;
        const complication="Événement dynamique : "+danger+" ; "+twist+".";
        const enemyBehavior="Adversaire d’exercice : "+adversary+
          ". Il utilise "+(mode==="stealth"?"des cônes de vision et des rondes":
            mode==="outer"?"les traces de passage et des embuscades retardées":
            mode==="assault"?"des vagues conditionnelles et des positions de tir":
            "les couverts, un repli tactique et les voies d’approvisionnement")+
          ", sans vision omnisciente.";
        const failure="Échec si "+FAILURES[nmod(index*2+fi*3+mi*5,FAILURES.length)]+" ; pas d’annexion automatique.";
        const withdrawal="Repli possible : "+exit+".";
        const strategicConsequence="Rapport limité à l’exercice : "+(mode==="outer"?
          "itinéraire vérifié et pertes réellement résolues":mode==="stealth"?
          "renseignement/sabotage daté sans butin":mode==="rts"?
          "pression tactique avec contrôle à confirmer":"bastion neutralisé sans garnison inventée")+
          " ; l’état de campagne n’est pas modifié.";
        const assetNeeds=[land,liquid,geometry,"décors "+district,"silhouettes de "+adversary,
          mode==="assault"?"sprites latéraux, remparts, impacts":""
        ].filter(Boolean);
        variants.push({
          id,schema:120,number:index+1,mode,family,status:"design-only",
          title,world,region,site,mapKey:"MAP-"+id,
          biome,terrain:land,liquid,atmosphere:family==="lore"?"air de chasse filtré":"air "+climate,
          weather:WEATHER[nmod(index+fi*3+mi*5,WEATHER.length)],
          light:LIGHT[nmod(index*3+fi*2+mi,LIGHT.length)],
          palette:family==="original"?palette:PALETTES[nmod(index+fi+mi,PALETTES.length)],
          geometry,
          objective,secondary,
          interaction:mode==="assault"?"déploiement AP, concentration de tir, seuils de front":
            mode==="outer"?"affectation des équipes, départ horodaté, reçu d’opération":
            mode==="stealth"?"couvrir les pas, interagir avec "+target+", puis extraire":
            "placer un détachement réel sur "+target+" et conserver une route",
          enemyBehavior,complication,failure,withdrawal,strategicConsequence,
          primaryMechanic,
          routeOrLayout:atlasType+" ; "+topology+" ; "+district+" ; "+geometry,
          threatLevel:difficulty,
          suggestedMinutes:mode==="outer"?15+difficulty*12+Math.floor(index/25)*8:
            mode==="rts"?11+difficulty*6:
            mode==="stealth"?7+difficulty*4:6+difficulty*3,
          mandatoryRoles:[...ROLES[mode]],assetsNeeded:assetNeeds,
          inspiration:family==="homage"?famous:family==="lore"?loreTheme:"",
          inspirationClass:family==="homage"?inspirationClass:family==="lore"?"motif Yautja du projet":"création d’univers",
          continuity,canonStatus:family==="original"?"création pure":
            family==="lore"?"fiction compatible, acte non attesté":
            "hommage transformé, aucun événement canonique",
          referenceUrl,
          narrativeHook,
          gameplayTags:[mode,family,ecosystem,land,liquid,danger,tag1,primaryMechanic,"variant-"+config],
        });
      }
    });
  });
  return variants;
}
export const CLAN_WAR_VARIANTS_V120:readonly ClanWarVariantV120[]=buildClanWarVariantsV120();
export function countClanWarVariantsV120(){
  const totals:Record<ClanWarVariantModeV120,Record<ClanWarVariantFamilyV120,number>>={
    assault:{original:0,lore:0,homage:0},outer:{original:0,lore:0,homage:0},
    stealth:{original:0,lore:0,homage:0},rts:{original:0,lore:0,homage:0},
  };
  for(const item of CLAN_WAR_VARIANTS_V120)totals[item.mode][item.family]++;
  return totals;
}
export function searchClanWarVariantsV120(
  term:string,mode:ClanWarVariantModeV120|"all"="all",
  family:ClanWarVariantFamilyV120|"all"="all",limit=1200,
):ClanWarVariantV120[]{
  const needle=term.trim().normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().slice(0,150);
  const matches:ClanWarVariantV120[]=[];
  for(const item of CLAN_WAR_VARIANTS_V120){
    if(mode!=="all"&&mode!==item.mode)continue;
    if(family!=="all"&&family!==item.family)continue;
    if(needle){
      const haystack=[item.id,item.title,item.site,item.world,item.region,item.biome,
        item.objective,item.secondary,item.inspiration,item.complication].join(" ")
        .normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
      if(!haystack.includes(needle))continue;
    }
    matches.push(item);
    if(matches.length>=Math.max(1,Math.floor(limit)))break;
  }
  return matches;
}
export function auditClanWarVariantsV120(){
  const items=CLAN_WAR_VARIANTS_V120;
  const unique=(get:(v:ClanWarVariantV120)=>string)=>new Set(items.map(get)).size;
  const stats=countClanWarVariantsV120();
  const problems:string[]=[];
  if(items.length!==1200)problems.push("Nombre de missions inattendu");
  if(unique(x=>x.id)!==1200)problems.push("Identifiants répétés");
  if(unique(x=>x.title)!==1200)problems.push("Titres répétés");
  if(unique(x=>x.site)!==1200)problems.push("Implantations répétées");
  if(unique(x=>x.mapKey)!==1200)problems.push("Clefs de plans répétées");
  for(const mode of CLAN_WAR_V120_MODES)for(const family of CLAN_WAR_V120_FAMILIES)
    if(stats[mode][family]!==100)problems.push(mode+"/"+family+" != 100");
  for(const item of items){
    if(!item.objective||!item.complication||!item.withdrawal||!item.geometry||!item.assetsNeeded.length)
      problems.push("Champs de gameplay manquants : "+item.id);
    if(item.status!=="design-only")problems.push("Statut trompeur : "+item.id);
    if(item.family==="homage"&&item.canonStatus!=="hommage transformé, aucun événement canonique")
      problems.push("Hommage présenté comme canon : "+item.id);
  }
  return {
    version:120,total:items.length,counts:stats,
    uniqueWorlds:unique(x=>x.world),uniqueSites:unique(x=>x.site),
    uniqueTitles:unique(x=>x.title),
    biomes:new Set(items.map(x=>x.biome)).size,
    geometries:new Set(items.map(x=>x.geometry)).size,
    weatherTypes:new Set(items.map(x=>x.weather)).size,
    homageAnchors:new Set(items.filter(x=>x.family==="homage").map(x=>x.inspiration)).size,
    problems
  };
}
