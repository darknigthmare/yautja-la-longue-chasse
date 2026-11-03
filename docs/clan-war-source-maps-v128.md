# Guerre des clans V128 — cartes W3 de source, vrais déplacements et extraction

## Ce qui a été construit

Cette PR continue la lignée #29 → #34 → #36 → #37. La Bible W3 du jeu comporte douze cartes d'escarmouche W3-MAP01 à W3-MAP12, non des géographies canoniques extraites des films. Le module app/game/systems/clanWarSourceMapsV128.ts lit les dimensions et les textes directement dans les cellules du classeur V6, sans mapper arbitrairement les identifiants W3 sur CON-T ou les territoires géographiques terrestres.

Le constructeur préserve les tailles de chaque carte, ses lieux de départ et d'objectif, ses voies de secours décrites, ses dangers et couverts. Il prépare trois routes de marche distinctes sur un quadrillage intégral. Les murs, eaux profondes et laves sont physiques ; des passages par pont et escalade sont matérialisés. Le raycast interdit de tirer à travers une paroi opaque. L'observation nécessite un point d'accès proche ou une vue directe, et le camouflage consomme son énergie.

La simulation de reconnaissance reçoit un compte rendu **uniquement** après interaction sur le véritable objectif et retour à une extraction physique. Les pertes sont tracées dans la manche d'exercice ; la sauvegarde V85/V6, les trophées et les stocks restent intacts. Le système n'ajoute pas de village terrestre à un globe alien.

## Cartes et descriptions reprises de la Bible V6

| ID | Taille source | Thématique | Particularité dynamique |
| --- | --- | --- | --- |
| W3-MAP01 | 32 × 24 | Corniches opposées | chute de pierres |
| W3-MAP02 | 30 × 26 | Conduites de verre noir | vapeur et réseau de portes |
| W3-MAP03 | 36 × 28 | Trois cratères | vent chargé de cendres et lave |
| W3-MAP04 | 28 × 28 | Relais sous les cendres | accès instables |
| W3-MAP05 | 34 × 30 | Canopée coupée | bruit attirant les patrouilles |
| W3-MAP06 | 32 × 24 | Gué des deux pistes | courant et eau infranchissable sans voie |
| W3-MAP07 | 36 × 24 | Quais de la marée haute | montée d'eau annoncée |
| W3-MAP08 | 30 × 30 | Île aux deux feux | rafales réduisant la visée |
| W3-MAP09 | 32 × 28 | Faille aux reflets | fissure de glace |
| W3-MAP10 | 28 × 26 | Galeries de chaleur | jets thermiques et réseau électrique |
| W3-MAP11 | 34 × 32 | Portes superposées | porte motorisée et dérivation |
| W3-MAP12 | 38 × 22 | Anneau des coques | pression du sas à stabiliser |

Les noms, dimensions, descriptions complètes des événements et règles de repli viennent de l'export du classeur `Yautja_V6_Bible_Cumulative_et_Dialogues.xlsx`. La disposition exacte des tuiles est **une interprétation générée**, non une maquette approuvée de la scène narrative 1:1. Les portes de la démonstration ne simulent pas encore l'intégralité des leviers, ascenseurs et systèmes de pression du livre.

## Gameplay techniquement traversable

Depuis **Bible V6 → 12 cartes W3 · exploration**, le joueur choisit une carte, déplace son pion, observe les accès, approche le dispositif, engage un adversaire W3-U à portée et se retire à la sortie. Le moteur refuse une traversée de mur, d'eau profonde, de lave, de case occupée ou de porte hors tension. Une panne électrique ferme les accès motorisés mais laisse un itinéraire de contournement.

Les dangers ne téléportent pas le joueur ni ne créent automatiquement une unité rivale. Les adversaires utilisent la même grille de pathfinding et de visibilité que le chasseur. La tempête de cendres réduit la visibilité, les rafales réduisent la portée et le sas W3-MAP12 exige une stabilisation réelle avant l'interaction d'objectif. Les rapports d'exercice sont uniques et ne débloquent pas des terres de campagne.

## Qualité

- tests/clan-war-source-maps-v128.test.mjs : 12 cartes / dimensions d'origine, références de cellules, parcours alternatifs, murs, phases de pression et météo, ordre à distance refusé, extraction complète, aucune modification des archives de campagne ;
- tsconfig.clan-war-v128.json : compilation ciblée sans déranger les gros sprites/assets ;
- .github/workflows/clan-war-v128.yml : Node, tests, TypeScript, ESLint, compilation React et archivage de douze fichiers JSON de grille ;
- scripts/export-clan-war-source-maps-v128.mjs : export pour les outils de level design.

## Fidelity 1:1 restant à réaliser

1. Terrain et altitude/occlusion d'origine de chaque carte : la forme des quatre niveaux de galeries, des tunnels, des ponts, des sas, des conduites et de leurs voies physiques est décrite, mais pas reconstruite manuellement tile par tile.
2. Asset individuel de chaque arme, masque, mécanisme, porte, personnage, intérieur, objet manipulable et équipement provenant d'une œuvre, avec provenance et dimensions/alpha/animations vérifiés.
3. Missions W3-RTS01..24 : relier leurs objectifs spécifiques, dialogues, interactions, conditions d'échec et conséquence aux cartes physiques V128. Le prototype V128 sert ici une mission commune de reconnaissance et extraction.
4. IA W3-U pleinement persistante : déployer les 6 000 plans de rencontre V127 sur leurs mondes compatibles, en respectant rôles, effectifs, positionnement, latence, lignes de vue et accès logistiques.
5. Carte Terre : importer des données d'élévation/voirie locales précises et licenciées à l'intérieur des scènes terrestres, jamais se servir de cette grille W3 comme fausse ville de Gunnison ou de Los Angeles.
6. Vrai serveur multijoueur, sauvegardes inter-clans et transactions économiques atomiques encore absents.

**Ne pas marquer ces douze cartes comme scènes 1:1 terminées.** Elles constituent un moteur de déplacement, de collision, de perception et de validation pouvant désormais accueillir des plans de niveau autorisés et détaillés.
