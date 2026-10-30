import originalPlaces from "../data/clanWarOriginalPlacesV120.json";
import loreFrames from "../data/clanWarLoreFramesV120.json";
import homageAssault from "../data/clanWarHomageAssaultV120.json";
import homageOuter from "../data/clanWarHomageOuterV120.json";
import homageStealth from "../data/clanWarHomageStealthV120.json";
import homageRts from "../data/clanWarHomageRtsV120.json";

/**
 * V120 is a STORYBOARD/LEVEL-DESIGN catalogue, not a 1200-level runtime
 * implementation and not a canonical source of Yautja chronology.
 * The game owns these original scenarios. Work references only establish a
 * genre-continuity inspiration; every encounter/settlement remains fictional.
 * Place homages are stylised ALIEN reconstructions, not real-world events.
 */
export type ClanWarVariantModeV120 = "assault" | "outer" | "stealth" | "rts";
export type ClanWarVariantFamilyV120 = "original" | "lore" | "homage";
export type ClanWarVariantStatusV120 = "design-only";
export interface ClanWarVariantV120 {
  id: string; version: 120; mode: ClanWarVariantModeV120;
  family: ClanWarVariantFamilyV120; status: ClanWarVariantStatusV120;
  title: string; settingName: string; zoneName: string;
  referenceName: string | null; referenceWork: string | null;
  referenceContinuity: string | null; referenceKind: "none" | "fiction-inspired" | "real-place-homage";
  canonClaim: false; inspirationNote: string;
  environment: {
    biome: string; terrain: string; liquid: string; sky: string;
    altitude: string; layout: string; scene: string; weather: string;
    timeOfDay: string; cover: string; entrances: string[];
    environmentalHazard: string; hazardsReaction: string; powerFailure: string;
    mapScaleHint: string; territoryShapeRequest: string; islandShapeRequest: string;
    worldSize: "small" | "medium" | "large" | "huge"; climateZone: string;
  };
  operation: {
    missionType: string; setup: string; primaryObjective: string;
    secondaryObjective: string; gameplayHook: string; twist: string;
    failure: string; victoryProof: string; fallback: string;
    extraction: string; recommendedUnitIds: string[];
    lengthClass: "short" | "medium" | "long" | "epic";
    threat: 1 | 2 | 3 | 4 | 5; dynamicPhases: string[];
    resultReceipt: string; neverAutoAnnex: true;
  };
  production: {
    neededSprites: string[]; neededTiles: string[];
    missingSystems: string[]; gameplayBackend: string;
    authoredGeneratorTags: string[]; uniquenessSignature: string;
  };
}
type MissionScheme = readonly [string,string,string,string,string,string];
type BiomeScheme = readonly [string,string,string,string];
const BIOMES: readonly BiomeScheme[] = [
 ["marais de silice","silt blanc irisé","marée visqueuse laiteuse","voile d'ambre"],
 ["canopée inversée","écorce noircie","eau à bioluminescence froide","voûte vert fauve"],
 ["désert ferrique","limon rouillé","nappe de mercure artificielle","orage cuivre"],
 ["toundra vitreuse","glace fumée","liquide sombre sous croûte","aurores cassées"],
 ["falaises coralliennes","calcite ciselée","lagune opalescente","soleil en halo"],
 ["gorge basaltique","roche nervurée","ruisseaux sulfurés","ciel de cendre"],
 ["archipel flottant","pierre en apesanteur","mer de brume liquide","constellations inversées"],
 ["mangrove au phosphore","boue à spores","chenaux fluorescents","nuages turquoise"],
 ["plateau de sel","croûte cristalline","mares saumâtres","midi violet"],
 ["volcan de neige","pierre givrée","lave froide bleutée fictive","ciel blanc d'étain"],
 ["savane fongique","terre fibrée","bassins d'encre végétale","crépuscule jaune"],
 ["cavernes lumineuses","schiste veiné","gouttes minérales","plafond scintillant"],
 ["mer asséchée","argile en écailles","poches de saumure","brume mauve"],
 ["récif de lave","pierre poreuse","courants thermiques","nuages violets"],
 ["fjords à particules","granit sombre","étendue turquoise glacée","ciel cyan froid"],
 ["forêt de cristaux","aiguilles de quartz","étangs prismatiques","aube rose"],
 ["terrasses géothermiques","terre frittée","eau bouillonnante fictive","brouillard ocre"],
 ["dunes magnétiques","sable noir métallique","nappes huileuses","vent rouge"],
 ["delta à roseaux géants","tourbe détrempée","rivière à spores","nuages indigo"],
 ["plaines d'ossements minéraux","calcaire pâle","flaques d'eau claire","soleil bleu"],
 ["cratères de glace saline","neige granuleuse","rivières saumâtres","lumière turquoise"],
 ["cordillère à fumées","éboulis de scories","lacs acides fictifs","ciel gris nacré"],
 ["atolls de brouillard","roche sableuse","eau noire irisée","halo de lune"],
 ["littoral d'algues métalliques","galets ferreux","marée d'algues souples","orage lointain"],
 ["vallée luminescente","terre fibreuse","cascades minérales","ciel mauve semé d'éclats"]
];
const LAYOUTS = [
 "anneau à trois accès avec passerelle brisée","terrasses concentriques aux rampes décalées",
 "couloir torsadé sous canopée effondrée","double amphithéâtre séparé par un lac",
 "col étroit et plateau de flanc","labyrinthe de champignons géants",
 "rampe suspendue reliant deux éperons","grotte à puits central et deux sorties",
 "baie peu profonde coupée par des récifs","pente en lacets à couvert variable",
 "entonnoir de dunes et déversoir secondaire","rivage en dents de scie",
 "tunnels rivaux connectés par chambres d'air","cirque de basalte avec poches de vent",
 "chemin de crête et contrebas boueux","estuaire ramifié en six voies",
 "forêt à clairières interdites","balcons rocheux et fosse centrale",
 "ruines à cours superposées","toits reliés par câbles asymétriques",
 "dômes de cristal à portes thermiques","bras de rivière traversés par gués",
 "marais à îlots mobiles","pontons modulaires au-dessus d'un gouffre",
 "bassin de pompage et salle des filtres","falaise à échelles naturelles",
 "cratère traversé par un tunnel annulaire","plaine à méandres secs",
 "dédale de conduites vitrifiées","îles de sel entre chenaux alternés",
 "carrière à gradins et plateformes","réseau de grottes à ventilation naturelle"
];
const HAZARDS = [
 "rafales électrostatiques","brouillard corrosif fictif","chutes de neige minérale",
 "éboulements lents","faune territoriale migratrice","marée montante",
 "lianes qui se contractent","mousse qui masque les pistes","panne de projecteurs",
 "pluie de cendres","vagues de chaleur","sables mouvants",
 "glissement de dalles","orage magnétique","souffle d'un geyser",
 "pression dans des tuyaux","racines qui déplacent les couverts",
 "interférences de masque","courant transversal","nuage de spores",
 "oscillation d'une plateforme","vapeur dense","gel des passerelles",
 "éclats de quartz","bascule des pontons","tremblement bref",
 "débris d'orbite","visibilité ultrabasse","dilatation des grilles",
 "marée de feuilles tranchantes","retour de faune nocturne","pluie d'eau salée",
 "tourbillon de poussière","coupure des signaux","crue dans une faille",
 "brume de refracteurs naturels"
];
const WEATHER = [
 "bruine chromatique","vent latéral","nuit sans lune","aurore striée",
 "soleil triple fictif","averse tropicale","blizzard d'aiguilles","rosée électrisée",
 "matin clair","orage lointain","pluie de quartz très fin","brouillard à ras du sol",
 "reflets de marée","pénombre volcanique","pleine lune verdâtre","aube saumon",
 "crépuscule cuivre","ciel en convection","chaleur sèche","brume de glacier",
 "pluie intermittente","cendre en suspension","éclaircies brutales","halo astronomique",
 "poussière lourde","nuit bioluminescente","neige fondante","grêle de glace saline",
 "reflets rouges de nuages"
];
const COVER = [
 "stalagmites évasées","murets de basalte","racines géantes","piliers fendus",
 "coques de nacelle","roches creuses","futaies basses","colonnes d'argile",
 "plaques de verre opaque","carcasses de pompes","hauts-fonds pierreux",
 "dômes de sel","coraux secs","cuvettes d'éboulis","tuyères abandonnées",
 "boucliers rocheux","souches pétrifiées","écrans de roseaux","haies de cristaux",
 "balcons effondrés","galeries latérales","caissons de transport","dunes en croissant",
 "arches de calcaire","mosaïques de blocs"
];
const SECTIONS:Record<ClanWarVariantModeV120,readonly string[]> = {
 assault:["bastion aval","rampe d'assaut","contre-crête","porte fortifiée","façade de défense","tranchée suspendue","redoute du guet","flanc des remparts"],
 outer:["relais du convoi","passage du messager","dépôt de soutien","gare de pisteurs","halte de ravitaillement","station de balisage","route de retour","entrepôt des éclaireurs"],
 stealth:["voûte de silence","aile des transmetteurs","galerie noire","puits des traces","antichambre du guet","réseau d'accès","conduit inférieur","toit de surveillance"],
 rts:["plateau tactique","carrefour des fronts","berge contestée","ligne des courants","carrière de garnison","col de commandement","bassin de réparation","nœud logistique"]
};
const LORE_SECTORS = [
 "cour extérieure","couronne d'observation","chemin de restitution","foyer de transmission",
 "gué d'évacuation","galerie annexe","bassin de pistage","porte basse"
];
const EXIT:Record<ClanWarVariantModeV120,readonly string[]> = {
 assault:["retour à la brèche alliée","récupération dans le goulet","évacuation par les balcons","repli vers le poste extérieur"],
 outer:["rapport au conseil après échéance","remise du registre au port","retour avec détachement identifié","compte rendu au relais de départ"],
 stealth:["retour discret au sas initial","sortie par galerie secondaire","rappel via fenêtre de camouflage","exfiltration à l'étage des pompes"],
 rts:["repli du poste de commandement","point d'extraction logistique","dégagement des véhicules","rassemblement dans la zone arrière"]
};
const MISSION:Record<ClanWarVariantModeV120,readonly MissionScheme[]> = {
 assault: [
 ["Briser le rempart","neutraliser la batterie de défense sans toucher au secteur de vie","tenir un couloir de sortie jusqu'au retour de l'avant-garde","la batterie riposte derrière un couvert destructible","le rempart du joueur tombe avant ouverture de la brèche","les éclaireurs renseignent la portée avant le premier renfort"],
 ["Conserver le portage","faire progresser deux porteurs derrière une ligne de combattants identifiés","ramener la charge au bastion allié","les pontons laissent passer un seul groupe lourd","une équipe porteuse est éliminée avec sa charge","le joueur peut céder du terrain pour préserver les porteurs"],
 ["Rompre la batterie haute","occuper une crête avant la sortie des unités lourdes","détruire le relais de tir de la crête","le vent perturbe l'orientation des appuis","la crête demeure occupée lorsque la réserve manque","deux petits détachements coordonnent une attaque latérale"],
 ["Couper le renfort adverse","intercepter la réserve hostile après sa sortie visible","conserver un passage au lieu d'anéantir l'ennemi","une seconde porte change le front à mi-combat","la sortie secondaire reste ouverte à la fin de la fenêtre","le soutien est affecté en priorité au blocage de la porte"],
 ["Récupérer les blessés","protéger les soins et sécuriser une évacuation contrôlée","rapatrier chaque membre marqué blessé","l'infirmerie locale perd ses signaux","le dernier blessé reste au-delà du point de repli","une escouade de couverture peut battre en retraite en premier"],
 ["Maintenir la porte","conserver le bastion principal jusqu'à l'arrivée du soutien","repousser trois assauts identifiés","les réserves adverses arrivent par une passerelle en pente","l'intégrité du bastion descend à zéro","les gardes utilisent les couverts sans se téléporter"],
 ["Détourner les éclaireurs","attirer un groupe adverse hors de sa position sans sacrifier d'équipe","mettre hors jeu le poste de guet après le leurre","la patrouille découvre des empreintes artificielles","le leurre déclenche l'alerte avant le déplacement","les soldats ne réapparaissent pas après leur perte"],
 ["Réparer sous le feu","défendre les artisans jusqu'à la restauration d'une porte","faire achever deux étapes de réparation","la porte tombe en panne électrique durant le siège","les artisans quittent la plateforme avant la dernière étape","un circuit mécanique reste disponible sans courant"],
 ["Sécuriser la seconde berge","prendre le passage supérieur sans détruire la passerelle","tenir la tête de pont avec la garnison disponible","la berge basse est temporairement inondée","la passerelle est détruite avant passage du porteur","choisir l'échelon de réserve avec le plus petit coût PC"],
 ["Ouvrir le double verrou","neutraliser deux postes en ordre distinct","laisser intact le poste de vie civile","les deux postes communiquent par balises relais","un poste n'a plus de sortie lorsque l'autre tombe","les renforts prennent le risque d'une percée lente"],
 ["Poursuite à contretemps","empêcher une extraction adverse avec les unités déjà engagées","bloquer l'accès au transport de retraite","les adversaires lancent un faux convoi","un véhicule militaire quitte l'écran de combat","le tireur garde ses charges limitées"],
 ["Tenir la barrière","déployer les réserves par vagues finies","défendre les trois accès à hauteur différente","l'accès élevé devient glissant à la tombée du soir","la base alliée perd toute intégrité","éviter de gaspiller les AP en groupes inadaptés"],
 ["Étouffer le guet","brouiller un guet ennemi au moment choisi","garder le chemin arrière praticable","le poste garde un secours local d'énergie","l'alarme atteint le port de guerre avant la fin du siège","les unités doivent réellement approcher la balise"],
 ["Protéger les montures","mettre en sûreté une escorte animale non combattante","déplacer les montures derrière le rempart","une rafale sépare la piste en deux","une monture traverse le couloir de tir principal","le tir concentré est interdit dans la zone de chenil"],
 ["Isoler le commandant","détacher les gardes sans éliminer les témoins de clan","rendre le poste de commandement inopérant","les gardes se replient en escalier","tous les témoins sont touchés","le commandant peut choisir la retraite si sa garde disparaît"],
 ["Ouvrir la voie de sortie","forcer le blocage militaire d'une galerie","laisser libre un chemin de retour","la galerie secondaire s'effondre progressivement","l'accès d'extraction n'est plus franchissable","le front recule pour sécuriser les blessés"],
 ["Brèche des deux plateaux","capturer temporairement deux positions contiguës","ramener l'unité porteuse vivante au second palier","un brouillard sépare les groupes à mi-parcours","un seul plateau est tenu à l'échéance","deux formations se répartissent leurs coûts PC"],
 ["Sauvetage du poste isolé","joindre une garnison encerclée","rétablir une liaison de guet","la garnison n'est pas automatiquement recrutée","aucune équipe libre ne rejoint le guet","l'attaque indirecte vise les barrières militaires"],
 ["Raid de diversion","immobiliser la ligne ennemie pendant une extraction","tenir au moins une diversion sans perdre le porteur","un capteur détecte les faux projectiles","la réserve ennemie frappe la sortie principale","retrait précoce possible au prix de la mission"],
 ["Contrôle de l'arsenal","mettre sous surveillance un dépôt militaire","empêcher la distribution d'armes aux renforts","des armes non identifiées restent inutilisables","l'arsenal explose et bloque le chemin de vie","une équipe a le droit de couper seulement la distribution"],
 ["Escorte de caravane","faire franchir des unités de soutien à travers le front","garder les porteurs vivants jusqu'au seuil","la route change au franchissement du premier verrou","le dernier porteur n'atteint pas le seuil","la réserve reste en arrière en cas d'attaque aérienne"],
 ["Combat de la passerelle","tenir un passage étroit en rotation d'équipes","arrêter les trois charges adverses","la passerelle vibre sous une escouade lourde","la barrière tombe sous les tirs concentrés","une équipe rapide traverse et informe la seconde"],
 ["Défense du ravin","conserver un ravin pendant la remontée des réserves","refuser l'accès aux renforts adverses","une crue fait apparaître un détour","les unités lourdes restent coincées au niveau bas","choisir le repli organisé avant le point de non-retour"],
 ["Duel des avant-postes","mettre hors d'usage la batterie de l'autre avant-poste","protéger la zone de dépôt commune","les tirs croisés altèrent la visibilité","l'avant-poste allié se retrouve isolé","un passage de maintenance peut éviter la ligne de feu"],
 ["Dernière traversée","dégager une seule fenêtre pour les survivants","faire sortir les membres déclarés aptes","la fenêtre se referme après un compte à rebours","l'équipe d'arrière-garde reste sans sortie","la survie des membres prime sur la destruction du poste ennemi"]
 ],
 outer: [
 ["Reconnaissance muette","cartographier trois passages sans révéler la base","recevoir un rapport daté des sentinelles","une route s'avère en sens unique","le détachement manque son rendez-vous de retour","une relève peut reprendre une piste prouvée"],
 ["Convoi de ravitaillement","escorter un chargement RAV clairement identifié","ramener le reçu de livraison","une passerelle interdit les unités trop lourdes","le lot est déclaré livré sans porteur présent","le mandat reste sans gain si le registre est perdu"],
 ["Retrouver les disparus","chercher une patrouille dont le dernier signal est ancien","confirmer le sort de chaque membre","le signal provient d'un autre guet","le rapport invente une position non observée","en cas de doute, classer la piste comme non confirmée"],
 ["Inventaire d'arsenal","auditer les caisses militaires avant un départ","rapprocher inventaire et équipe responsable","des étiquettes ont été volontairement échangées","une caisse non identifiée est créditée comme récupérée","suspendre l'envoi d'un armement douteux"],
 ["Transport du régulateur","acheminer une pièce réparatrice réelle","documenter l'état d'arrivée","le détroit exige un détour non prévu","le technicien est déclaré présent sans avoir voyagé","reporter la réparation jusqu'à présence de l'artisan"],
 ["Enquête de sang","recueillir des traces d'attaque sans supposer le coupable","soumettre la preuve au conseil fictif local","deux clans revendiquent le même emblème","la source est faussement attribuée à un clan canonique","le rapport peut conclure à une origine indéterminée"],
 ["Contrôle des balises","tester des relais successifs avec des équipes de guet","distinguer panne et brouillage","un relais secondaire fonctionne sans énergie centrale","une fausse carte de contrôle déclenche un départ","garder la dernière lecture datée"],
 ["Évacuation médicale","rapatrier un membre blessé identifié","confirmer son arrivée au poste de soin","la voie rapide est réservée au transport léger","le malade est soigné automatiquement pendant le voyage","l'arrivée ouvre un soin séparé avec coût de source"],
 ["Cartographie liquide","relever un chenal changeant","livrer une route ouverte et sa marée","le chenal se scinde après le relevé","un fleuve non testé devient franchissable","un itinéraire alternatif reste dans le rapport"],
 ["Épreuve des montures","retrouver une monture égarée et ses soigneurs","ramener l'équipe et l'animal en vie","la bête suit une piste biologique trompeuse","une monture est clonée pour combler une perte","le chenil constate la fatigue à l'arrivée"],
 ["Veille de l'orbite","observer des trajectoires sans aborder de vaisseau","identifier seulement les objets vus","l'éclipse cache une partie du passage","un navire inconnu est classé hostile sans preuve","le registre garde une position incertaine"],
 ["Négociation des passages","vérifier un droit de traversée avant convoi","ramener la réponse écrite des deux parties","la voix d'un ancien ne vaut pas accord universel","le convoi passe malgré un refus connu","retour sans combat possible"],
 ["Pistage de spores","identifier les pistes de faune au sol","prévenir le prochain détachement","une odeur masque les traces récentes","un faux danger est marqué sûr","une escorte biologique reste non déployée"],
 ["Récupération des masques","ramener des équipements personnels attribués","éviter tout trophée sans propriétaire","des dépôts portent des marques identiques","un masque fantôme est ajouté à l'inventaire","demander la confirmation de l'identité"],
 ["Étude de la pression","contrôler la stabilité d'une galerie","autoriser une route seulement si sûre","les niveaux changent après l'orage","les ingénieurs sont représentés comme présents sans affectation","maintenir la traversée fermée sans preuve"],
 ["Relève des guets","faire passer une équipe de surveillance au poste isolé","prouver que le poste fut occupé","l'ennemi lance un faux appel de détresse","la relève ne rejoint pas son point","une équipe de réserve reste disponible au départ"],
 ["Surveillance d'un exil","suivre une piste de départ sans forcer l'affrontement","consigner un trajet plutôt qu'une exécution","un écho de masque masque la direction","un supposé exilé est automatiquement déclaré coupable","l'incident demeure sous enquête"],
 ["Trafic de pièces","suivre des caissons techniques jusqu'au dépôt","découvrir une perte de cargaison","un rail de secours bifurque","le transport est déclaré revenu sans caisson","l'équipe repart seulement avec charge retrouvée"],
 ["Recensement des avant-postes","obtenir les nouvelles de postes alliés","distinguer silence et destruction","une station reste alimentée localement","une garnison inconnue apparaît dans l'archive","mentionner le silence comme non évalué"],
 ["Neutralité du sanctuaire","observer un conflit hors d'un lieu de rite","vérifier le respect d'une limite établie localement","deux témoins ne s'accordent pas sur la frontière","une loi imaginaire est attribuée à tous les Yautja","consigner les versions et se retirer"],
 ["Transport de remèdes","livrer des fournitures médicales non magiques","obtenir la réception signée de l'infirmerie","le contenant demande un transport stable","une blessure est guérie sans praticien","les pertes de stock restent calculées"],
 ["Analyse des pontons","détecter les ancrages dangereux avant une charge","identifier la capacité réelle de chaque travée","un sabot flotte et masque une faille","une troupe lourde emprunte une travée interdite","un passage alternatif est proposé"],
 ["Messagers en miroir","livrer deux ordres qui ne doivent pas être inversés","recevoir deux accusés de réception","un relais échange les identifiants","le second message est compté malgré l'absence du porteur","le premier messager attend l'autre"],
 ["Récupération de journaux","réunir des archives de guet datées","exclure toute entrée non authentifiée","une archive est doublée sur deux supports","deux journaux créent un même bonus d'expérience","les doublons sont signalés sans points supplémentaires"],
 ["Retour de la dernière colonne","retrouver la route du groupe d'arrière-garde","ramener le groupe au centre de commandement","la météo inverse le chemin principal","un retour est compté avant l'arrivée effective","l'opération se conclut par un rapport unique"]
 ],
 stealth: [
 ["Silence du relais","désactiver un transmetteur sans alerter ses gardes","rejoindre la sortie par sa propre route","une patrouille change d'étage","l'alarme dépasse le seuil de mission","panne électrique : utiliser une dérivation mécanique fictive"],
 ["Masque égaré","récupérer un masque attribué à son porteur","sortir sans réclamer un trophée indu","le masque est derrière une porte à double commande","un masque sans identification est attribué au joueur","abandon documenté si le propriétaire reste incertain"],
 ["Journal du guet","copier un relevé de passage sans détruire sa source","revenir avec une preuve datée","le guet utilise une sauvegarde hors réseau","une archive vide valide un sabotage","panne : relever un registre gravé de secours"],
 ["Prisonnier du couloir","libérer un membre identifié sans attaquer les non-combattants","escorter le prisonnier au sas","le captif refuse une sortie non sécurisée","le captif reste au poste lorsque le joueur s'enfuit","ouvrir une issue latérale"],
 ["Lanterne inversée","éteindre une balise d'observation","obtenir une zone aveugle limitée dans le temps","un capteur secondaire suit les vibrations","la balise principale seule est désactivée","éliminer les traces sur le sol à la sortie"],
 ["Marqueur du faux passage","placer une balise de piste non létale","vérifier une observation ensuite","un guetteur découvre le traceur","une fausse observation est marquée certaine","renoncer plutôt que provoquer un piège"],
 ["Conduit inférieur","atteindre une vanne sans utiliser la porte haute","sortir par le réseau de maintenance","le conduit se remplit de vapeur","l'exfiltration se fait au mauvais étage","fermer le flux mécanique avant passage"],
 ["Voie des blessés","ouvrir une échappée pour un membre blessé","escorter ce membre hors du champ de détection","la patrouille suit les traces au sol","le blessé est oublié en quittant l'aire","choisir un détour à couvert"],
 ["Reflet des deux guetteurs","décaler deux patrouilles sans les tuer","désactiver le relais entre deux rotations","leurs rondes ne se synchronisent pas toujours","un guardien devient invisible sans cause","observer les rythmes avant entrée"],
 ["Filtre silencieux","neutraliser un détecteur de spores","réduire le champ d'alerte local","un capteur de secours fonctionne par air","la suppression du courant règle tous les détecteurs","fermer un volet mécanique"],
 ["Salle des cartes","récupérer une carte sans la déformer","consigner les secteurs non visibles","une table contient une piste trompeuse","une carte falsifiée devient une route validée","laisser la carte en place si l'accès compromet la sortie"],
 ["Écluse sans lumière","ouvrir une écluse par un mécanisme de secours","ne pas noyer la route arrière","l'eau monte après la première commande","la sortie se referme derrière un équipier","reculer avant le second verrou"],
 ["Signal à retardement","installer un retardateur de leurre fictif","quitter le lieu avant sa détection","le relais dispose d'un cycle irrégulier","le personnage se téléporte en zone sûre","prévoir une deuxième fenêtre de fuite"],
 ["Aucun trophée","constater un crime sans effacer les indices","ramener une preuve au conseil local","un emblème est réutilisé par un imposteur","un suspect est déclaré coupable sans confrontation","conserver l'incertitude sur le coupable"],
 ["Mouvement des caisses","déplacer une caisse vide pour débloquer une trappe","conserver le chargement officiel intact","le sol bascule sous le poids","un objet apparaît de l'autre côté sans transport","utiliser une rampe de l'étage inférieur"],
 ["Camouflage déchiré","traverser une cour avec énergie limitée","recharger uniquement sur une station physique","une pluie révèle la silhouette camouflée","le camouflage reste permanent sans batterie","attendre le moment de plus faible patrouille"],
 ["Balise de secours","désamorcer un faux message d'alerte","conserver les vrais canaux de détresse","le système bascule sur une fréquence de réserve","la vraie alerte est détruite avec le faux message","couper le seul émetteur incriminé"],
 ["Trace des jeunes","retrouver un passage sans exposer une nursery","ne pas franchir le périmètre familial","une patrouille s'approche du périmètre","un dialogue attribue une pratique universelle inventée","contourner le lieu sensible"],
 ["Vanne du refuge","fermer une fuite fictive qui menace des caches","ouvrir le drainage local","la pression change de sens","la manette règle toute la station sans contrôle","accéder au cadran de secours"],
 ["Fenêtre dans la brume","suivre une silhouette jusqu'à un poste avancé","identifier un emblème à distance","le brouillard déforme les volumes","un inconnu est automatiquement identifié","rapporter une silhouette non confirmée"],
 ["Câble de retour","fixer une voie d'extraction sans bloquer la poursuite","rentrer avec les équipements effectivement tenus","un câble se détend avec la chaleur","un masque se sauve seul","sécuriser la descente avec un point d'appui"],
 ["L'archive sous l'eau","retirer un support protégé par une bulle","réduire l'eau sans toucher au sas de vie","une valve se ferme après temporisation","une archive flottante devient exploitable sans récupération","renoncer si l'eau atteint la marque rouge"],
 ["Porte à deux mémoires","ouvrir une serrure à deux états observables","conserver la possibilité de sortie","une commande ancienne persiste sans courant","l'accès se déverrouille sans interaction","utiliser l'orientation manuelle"],
 ["Voile de champignons","traverser des spores qui perturbent le masque","préserver la discrétion des alliés","une poussée fongique change le couvert","la vision thermique distingue automatiquement tout","avancer uniquement dans les trous de spores"],
 ["Dernier témoin","ramener un enregistrement de surveillance daté","sortir avant la prochaine relève","un témoin change de position","un succès est accordé avec alarme maximale","préférer une fuite sans preuve à une perte de vie"]
 ],
 rts: [
 ["Défense en profondeur","tenir deux passages avec les équipes disponibles","conserver le point de ravitaillement","les couverts basculent après l'orage","les deux passages sont pris simultanément","ordre de repli conserve une équipe survivante"],
 ["Convoi sous escorte","amener une charge identifiée au bon dépôt","conserver son vrai porteur en état de marcher","une passerelle devient impraticable","le dépôt valide une cargaison déposée ailleurs","ramassage du lot à sa dernière case"],
 ["Relève des postes","garder trois tours un point de guet","faire venir une équipe de relève réellement disponible","la route de relève se ferme temporairement","le poste est déclaré tenu sans garde","ordre de défense explicite sans déplacement"],
 ["Réparation du filtre","livrer une pièce puis employer l'artisan présent","maintenir la pression en zone autorisée","le filtre se ferme lorsque la crue revient","l'installation est réparée à la seule livraison","deux tours d'intervention après dépôt"],
 ["Double traversée","ouvrir deux routes sans franchir le lieu de vie","tenir le passage principal et celui de secours","une marée inverse le rôle des gués","une seule route est sécurisée","retour au point de départ avec les porteurs"],
 ["Sauvetage de garnison","rejoindre un guet isolé avec une colonne autorisée","évacuer les blessés recensés","le guet n'a plus d'électricité locale","les blessés sont remplacés automatiquement","équipe de secours suit un itinéraire matériel"],
 ["Bataille des crêtes","prendre la hauteur avant la relève ennemie","tenir les deux promontoires successivement","un brouillard rend la ligne de vue partielle","le titre de victoire est accordé sur le premier poste","les tireurs progressent derrière leurs couverts"],
 ["Interception d'atelier","isoler un atelier militaire sans le détruire","conserver les machines en état récupérable","un artisan adverse bloque la porte","la destruction remplace abusivement l'interception","interrompre le combat en sécurisant l'entrée"],
 ["Route de ravitaillement","protéger les convoyeurs jusqu'à la jonction","conserver la cohérence du stock réellement transporté","un gué perd sa capacité après une pluie","des RAV apparaissent par simple occupation","un véhicule revient prendre le lot perdu"],
 ["Trois balises","tenir trois points à des moments successifs","garder l'avant-poste central encore occupé","des balises secondaires perdent le signal","les trois points sont validés sur une seule présence","les ingénieurs rétablissent une connexion réelle"],
 ["Marais des gardiens","préserver une zone de soins derrière le front","repousser les unités hostiles de deux accès","les eaux séparent les troupes en deux sous-fronts","un adversaire pénètre la zone médicale","une unité de garde protège les blessés"],
 ["Retrait sous couverture","replier les groupes encerclés vers une sortie","emporter les caissons qui existent encore","une colonne ennemie coupe la descente","les équipes blessées sont abandonnées","itinéraire arrière réservé aux unités légères"],
 ["Front de la dernière pompe","faire fonctionner une pompe par équipe technique","garder sa ligne d'alimentation","la pression fait disparaître un pont temporaire","la pompe est maintenue sans technicien","poste de maintenance nécessite un opérateur"],
 ["Brèche contrôlée","neutraliser une fortification sans envahir une zone neutre","installer un point de guet temporaire","une sortie de secours rejoint la zone neutre","la zone neutre devient un butin","détourner les batteries vers l'extérieur"],
 ["Hauts-fonds mouvants","amener des forces par chemins accessibles à marée basse","tenir la tête de pont jusqu'au flot","le chenal principal change de largeur","les troupes lourdes traversent un gué interdit","utiliser des unités légères sur chaque rive"],
 ["Puits de commandement","défendre l'accès à une salle des cartes","assurer la relève du commandement","l'ascenseur de charge s'arrête","un chef absent continue d'ordonner","un messager transmet les ordres sans radio"],
 ["Deux ailes opposées","disperser les ennemis avant qu'ils se rejoignent","tenir l'aile gauche et le repli de droite","un tunnel les relie après l'ouverture du premier sas","une aile abandonnée est déclarée capturée","activer des objectifs partiels"],
 ["Bataille des porteurs","protéger une cargaison pendant un siège","rendre la cargaison au dépôt arrière","les porteurs avancent plus lentement sous charge","une cargaison détruite est réapparue","les gardes se replient pour laisser une voie"],
 ["Colline de relais","tenir un relais sans divulguer la position du conseil","garder une seule liaison opérationnelle","une impulsion électromagnétique coupe l'étage haut","la coupure révèle automatiquement toutes les troupes","une ligne matérielle de secours peut être installée"],
 ["Enclavement du pont","maintenir ouvert un accès logistique","faire sortir la dernière escorte","un support de pont demande une réparation","le joueur gagne en fermant son propre accès","priorité à la sortie plutôt qu'aux pertes adverses"],
 ["Cercle des trois clans","arbitrer un front local sans violer un accord enregistré","tenir les frontières établies par les témoins","une unité adversaire traverse la zone tampon","une règle inventée est déclarée universelle","demander la confirmation de la frontière"],
 ["Assaut aux plateformes","prendre des gradins en hauteur","rétablir l'accès au ravitaillement","les plateformes ont une portance limitée","un groupe lourd occupe un étage impossible","diviser le groupe selon ses PC"],
 ["Cratère de repli","organiser une retraite tactique avant fermeture d'accès","faire sortir un artisan porteur","la pluie scelle un tunnel secondaire","la victoire est comptée malgré un porteur abandonné","marquer le chemin de repli dans le rapport"],
 ["Bataille des données","défendre un poste de repérage et sa mémoire locale","conserver le support physique intact","l'enregistrement se coupe sans courant","les données apparaissent dans la carte sans récupération","un technicien rétablit un journal hors réseau"],
 ["Front final des crêtes","tenir un axe de trois bastions jusqu'à la fin du cycle","conserver un groupe de commandement vivant","le relief s'effondre en deux étapes","l'état de victoire apparaît sans garnison physique","ordonner un dernier repli si la jonction devient impossible"]
 ]
};
const MODE_TITLES:Record<ClanWarVariantModeV120,string>={assault:"Assaut latéral",outer:"Mandat Outer Ops",stealth:"Infiltration",rts:"Guerre RTS"};
const MODE_CODES:Record<ClanWarVariantModeV120,string>={assault:"A",outer:"O",stealth:"S",rts:"R"};
const FAMILY_CODES:Record<ClanWarVariantFamilyV120,string>={original:"OR",lore:"LO",homage:"HO"};
const HOMAGES:Record<ClanWarVariantModeV120,readonly string[]> = {
 assault:homageAssault.places,outer:homageOuter.places,
 stealth:homageStealth.places,rts:homageRts.places,
};
/** The 400 architectural allusions are interpreted by their physical type:
 * a railway isn't treated as a castle and a fjord isn't a museum corridor. */
function homagePlaceFeature(mode:ClanWarVariantModeV120,place:string):string {
 const p=place.toLowerCase();
 if(mode==="assault"){
  if(/grande muraille|remparts|intramuros/.test(p))return "enceinte continue à secteurs et portes de flanc";
  if(/citadelle|fort|forteresse|krak|massada/.test(p))return "bastions échelonnés, glacis et chemins de ronde";
  if(/château|castel|alcázar|alhambra|palais/.test(p))return "cours internes, remparts à hauteur variable et tours de garde";
  if(/acropole|sacsayhuamán|ollantaytambo/.test(p))return "escaliers rocheux, terrasses et lignes de défense naturelle";
  return "cité perchée, portes resserrées et parapets de protection";
 }
 if(mode==="outer"){
  if(/port de |port du |port d'/.test(p))return "bassin portuaire, caissons de fret et quais contrôlés";
  if(/canal|détroit|passage de|passage du/.test(p))return "chenal navigable, verrou de traversée et courant de retour";
  if(/pont|viaduc|ponte|bridge/.test(p))return "tablier exposé, travées étroites et appuis de rive";
  if(/tunnel/.test(p))return "galeries ventilées, sorties de secours et charge limitée";
  if(/col |pass$|highway|route/.test(p))return "lacets en relief, aire de repos et détour de crête";
  return "voie ferrée, relais de fret et signalisation de ligne";
 }
 if(mode==="stealth"){
  if(/musée|museum|galerie|gallery|guggenheim|louvre|moma/.test(p))
   return "galeries d'exposition fictives, mezzanines et vitrines occultantes";
  if(/bibliothèque|library|archives/.test(p))
   return "rayonnages labyrinthiques et lieux d'archives séparés";
  if(/palais|palace|château|abbaye|mosquée|temple|cathédrale/.test(p))
   return "enfilades de salles, voûtes et cours intérieures";
  if(/observ|c e r n|cern|skytree|tower|tours|burj|taipei/.test(p))
   return "étages techniques, gaines et terrasses d'observation";
  if(/gare|terminal|changi|station/.test(p))
   return "coursives de service, halle et tunnels de maintenance";
  return "atrium, couloirs de surveillance et circulations annexes";
 }
 if(/glacier|glace|banquise|vatnajökull|ilulissat|neige/.test(p))
   return "rives de glace, crevasses et franchissements porteurs";
 if(/désert|erg |dunes|wadi |sahara|kalahari|sossusvlei|sonora|gobi/.test(p))
   return "dunes à plusieurs hauteurs, oueds secs et pistes vulnérables";
 if(/gorges|canyon|falaises|cliffs|mont |everest|kilimandjaro|tre cime/.test(p))
   return "escarpements, replis de montagne et corridors verticaux";
 if(/lac|delta|marais|pantanal|okavango|rivi|chutes|mer /i.test(p))
   return "chenaux d'eau, points hauts, gués temporaires et couverts riverains";
 if(/volcan|etna|vésuve|fagradalsfjall|cotopaxi|teide/.test(p))
   return "sommets volcaniques, pentes de scories et ravines";
 if(/forêt|jungle|woods|serengeti|mara|baobabs|socotra/.test(p))
   return "couvert végétal et pâturages traversés de ravins";
 return "terrasses naturelles asymétriques, points de commandement et relief mobile";
}

export const WAR_V120_FAMILIES:readonly ClanWarVariantFamilyV120[]=["original","lore","homage"];
export const WAR_V120_MODES:readonly ClanWarVariantModeV120[]=["assault","outer","stealth","rts"];
const FALLBACK_POWER:Record<ClanWarVariantModeV120,string>={
 assault:"Le rempart perd ses tourelles actives ; tenir les voies manuelles avec les équipes réellement déployées et les guetteurs locaux.",
 outer:"La transmission radio ne déclenche aucun succès : la patrouille doit revenir avec un registre physique à l'échéance.",
 stealth:"Les portes motorisées se figent ; utiliser un verrou mécanique fictionnel sans supprimer le risque des patrouilles autonomes.",
 rts:"Les radars et ascenseurs cessent ; déplacer les équipes par les routes ouvertes et exiger une présence réelle sur les objectifs.",
};
function makeVariant(mode:ClanWarVariantModeV120,family:ClanWarVariantFamilyV120,index:number):ClanWarVariantV120 {
 const modeIndex=WAR_V120_MODES.indexOf(mode);
 const familyIndex=WAR_V120_FAMILIES.indexOf(family);
 const mix=index+modeIndex*101+familyIndex*107;
 const biome=BIOMES[(index*7+familyIndex*9+modeIndex*5)%BIOMES.length];
 const scenario=MISSION[mode][(index*3+familyIndex*7)%MISSION[mode].length];
 const cover=COVER[(index*13+modeIndex*7+familyIndex*3)%COVER.length];
 const layout=LAYOUTS[(index*11+modeIndex*5+familyIndex*7)%LAYOUTS.length];
 const weather=WEATHER[(index*13+modeIndex*5+familyIndex*11)%WEATHER.length];
 const hazard=HAZARDS[(index*17+familyIndex*5+modeIndex*3)%HAZARDS.length];
 const section=SECTIONS[mode][(index+familyIndex*3)%SECTIONS[mode].length];
 const power=FALLBACK_POWER[mode];
 const lore=loreFrames.anchors[Math.floor(index/4)];
 const origin=originalPlaces.sites[index];
 const known=HOMAGES[mode][index];
 const homageFeature=family==="homage"?homagePlaceFeature(mode,known):null;
 const part=LORE_SECTORS[(index%4+modeIndex*2)%LORE_SECTORS.length];
 const settingName=family==="original"?
   origin+" — "+section:
   family==="lore"?
     "Frange de "+lore.anchor+" — "+part+" / "+section:
     "Reconstruction d'écho "+known+" — "+section;
 const zoneName=family==="original"?"Secteur inédit "+(index+1):
   family==="lore"?"Continuité "+lore.continuity+" · zone hypothétique "+(index%4+1):
     "Hommage géographique fictif · "+known;
 const referenceName=family==="original"?null:family==="lore"?lore.anchor:known;
 const referenceWork=family==="lore"?lore.work:null;
 const referenceContinuity=family==="lore"?lore.continuity:null;
 const inspirationNote=family==="original"?
   "Lieu inventé, biomes et formes modulaires à réaliser pour le générateur de planète.":
   family==="lore"?
     "Extrapolation NON CANONIQUE de "+lore.work+" : "+lore.narrative+
     ". Ne pas confondre les continuités ou prétendre que ce conflit y est survenu.":
     "Clin d'œil à "+known+" : volumes/reliefs réinterprétés sur un monde fictif. Aucune guerre Yautja historique revendiquée.";
 const id="CW120-"+MODE_CODES[mode]+"-"+FAMILY_CODES[family]+"-"+String(index+1).padStart(3,"0");
 const story=scenario[1]+" dans "+section+" sur "+settingName+".";
 const twist=scenario[3]+" ; "+hazard+" transforme l'approche lors de la phase "+(1+(index%3))+".";
 const biomeName=biome[0];
 const recommended=mode==="assault"?["W3-U07","W3-U01"]:
   mode==="outer"?["W3-U01","W3-U19"]:
   mode==="stealth"?["W3-U02","W3-U05"]:["W3-U07","W3-U19","W3-U20"];
 const primary=mode==="outer"?scenario[1]+" puis déposer un compte rendu daté":
   mode==="stealth"?scenario[1]+" puis gagner le point d'exfiltration":
   mode==="assault"?scenario[1]+" par des déploiements AP limités":
   scenario[1]+" grâce à des positions et des unités réellement présentes";
 const distinctObjective=scenario[2]+" ; adapter le rythme aux "+biomeName+".";
 const hazardReaction=mode==="assault"?
   "À l'annonce de "+hazard+", les unités présentes recalculent leurs passages ; aucune troupe ne surgit hors du bord de carte.":
   mode==="outer"?
   "À l'échéance, l'équipe signale "+hazard+" et la route empruntée ; aucun rapport n'est dévoilé avant la confirmation du retour.":
   mode==="stealth"?
   "Après "+hazard+", la patrouille réévalue sa ligne de vue, pas la position omnisciente du joueur.":
   "La case sous "+hazard+" devient impraticable temporairement, obligeant le cheminement d'unités existantes.";
 const phases=mode==="assault"?
    ["Observer "+section,"Déployer les équipes identifiées sous AP limité","Exécuter "+scenario[0].toLowerCase()+" face à "+hazard,"Tenir ou revenir par "+EXIT[mode][index%4]]:
   mode==="outer"?
    ["Réserver les membres et les RAV","Suivre la route déclarée avec "+weather,"Attendre le rapport, sans résoudre hors échéance","Recevoir un seul reçu, vérifier "+scenario[2]]:
   mode==="stealth"?
    ["Repérer les patrouilles dans "+biomeName,"Approcher depuis "+layout,"Interagir pour "+scenario[0].toLowerCase(),"Quitter l'aire avec l'alerte limitée"]:
    ["Choisir les forces selon les PC réels","Occuper les accès de "+layout,"Réaliser "+scenario[0].toLowerCase(),"Conserver présence et route d'évacuation"];
 const proof=mode==="outer"?
    "rapport unique "+id+" avec nom des membres, trajet daté, état de la charge et preuve de "+scenario[2]:
    mode==="stealth"?
    "interaction réellement déclenchée, état de "+scenario[2]+", puis extraction avec garde et alerte évalués":
    mode==="assault"?
    "position militaire réellement prise ou neutralisée, équipe vivante, bastion du joueur conservé et "+scenario[2]:
    "occupation physique des cases visées, transport/tenue effectifs, résultat unique et "+scenario[2];
 const title=MODE_TITLES[mode]+" : "+scenario[0]+" — "+settingName;
 const shapeName="forme-region-V120-"+String(1+((index*23+modeIndex*11+familyIndex*5)%100)).padStart(3,"0");
 return {
  id,version:120,mode,family,status:"design-only",
  title,settingName,zoneName,
  referenceName,referenceWork,referenceContinuity,
  referenceKind:family==="original"?"none":family==="lore"?"fiction-inspired":"real-place-homage",
  canonClaim:false,inspirationNote,
  environment:{
   biome:biomeName,terrain:biome[1],liquid:biome[2],sky:biome[3],
   altitude:["fonds inondables","rez-de-dalle","niveau des arches","terrasses hautes","orbite basse fictive"][mix%5],
   layout:homageFeature?layout+" ; "+homageFeature:layout,
   scene:family==="homage"?"Écho de "+known+" : "+homageFeature+" dans "+biomeName:
     (family==="lore"?lore.narrative+" — "+biomeName:"Topographie inédite de "+biomeName),
   weather,timeOfDay:["aube","matin","midi","crépuscule","nuit","éclipse brève"][mix%6],
   cover,entrances:[SECTIONS[mode][(index+1)%SECTIONS[mode].length],
      SECTIONS[mode][(index+4)%SECTIONS[mode].length]],
   environmentalHazard:hazard,hazardsReaction:hazardReaction,powerFailure:power,
   mapScaleHint:["16×9 scènes compactes","32×24 scènes composites","48×32 terrain multizone","64×40 théâtre stratégique"][mix%4],
   territoryShapeRequest:shapeName,
   islandShapeRequest:"forme-île-proposée-"+String(1+((index*19+modeIndex*13+familyIndex*7)%100)).padStart(3,"0"),
   worldSize:(["small","medium","large","huge"] as const)[(index+modeIndex+familyIndex)%4],
   climateZone:["tempérée rocheuse","aride","subpolaire","tropicale humide","souterraine","volcanique","marine","orbitale fictive"][mix%8]
  },
  operation:{
   missionType:scenario[0],setup:story,primaryObjective:primary,
   secondaryObjective:distinctObjective,gameplayHook:scenario[5],
   twist,failure:scenario[4]+" ; ou absence des unités nécessaires au retour.",
   victoryProof:proof,fallback:scenario[5]+" ; en absence de courant : "+power,
   extraction:EXIT[mode][(index+modeIndex+familyIndex)%4],
   recommendedUnitIds:recommended,
   lengthClass:(["short","medium","long","epic"] as const)[mix%4],
   threat:(1+(mix%5)) as 1|2|3|4|5,dynamicPhases:phases,
   resultReceipt:id+"-receipt-v1",neverAutoAnnex:true
  },
  production:{
   neededSprites:["combattants-identifiés-"+mode,"décor-"+biomeName,"objet-"+scenario[0],
     "vfx-"+hazard,"surface-"+biome[1]],
   neededTiles:["sol-"+biome[1],"liquide-"+biome[2],"couverts-"+cover,"geom-"+layout],
   missingSystems:["géométrie jouable du terrain","déclencheurs physiques de mission","IA adaptée à l'objectif",
     "assets animés et synchronisés","audit sauvegarde/rapport unique"],
   gameplayBackend:mode==="assault"?"clanWarOperationsV115.assault":
     mode==="outer"?"clanWarOperationsV115.outer":
     mode==="stealth"?"clanWarOperationsV115.stealth":"clanWarOperationsV115.rts",
   authoredGeneratorTags:[shapeName,biomeName,biome[1],biome[2],hazard,weather],
   uniquenessSignature:mode+"|"+family+"|"+settingName+"|"+scenario[0]+"|"+layout+"|"+hazard
  }
 };
}
export function createClanWarVariantAtlasV120():ClanWarVariantV120[] {
 const variants:ClanWarVariantV120[]=[];
 for(const mode of WAR_V120_MODES)for(const family of WAR_V120_FAMILIES)
  for(let index=0;index<100;index++)variants.push(makeVariant(mode,family,index));
 return variants;
}
export const CLAN_WAR_VARIANT_ATLAS_V120:readonly ClanWarVariantV120[]=createClanWarVariantAtlasV120();
export function searchClanWarVariantsV120(
 term:string,mode:ClanWarVariantModeV120|"all"="all",
 family:ClanWarVariantFamilyV120|"all"="all",
):ClanWarVariantV120[] {
 const q=term.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
 return CLAN_WAR_VARIANT_ATLAS_V120.filter(entry=>
   (mode==="all"||entry.mode===mode) && (family==="all"||entry.family===family) &&
   (!q||[entry.id,entry.title,entry.zoneName,entry.referenceWork??"",
     entry.environment.biome,entry.operation.primaryObjective,entry.environment.environmentalHazard]
     .join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().includes(q)));
}
export function clanWarVariantCountsV120():Record<string,number> {
 const result:Record<string,number>={total:CLAN_WAR_VARIANT_ATLAS_V120.length};
 for(const mode of WAR_V120_MODES)for(const family of WAR_V120_FAMILIES)
  result[mode+":"+family]=CLAN_WAR_VARIANT_ATLAS_V120.filter(v=>v.mode===mode&&v.family===family).length;
 return result;
}
