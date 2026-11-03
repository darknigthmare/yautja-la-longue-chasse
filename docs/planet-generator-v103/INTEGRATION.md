# Raccordement stratégique et compatibilité V103

## Un format réellement joué

La recette choisit 18, 24, 36, 48, 72 ou 96 territoires, et 3, 4, 6, 8 ou 12 régions. Une région contient au moins trois territoires : 27 couples sont autorisés. Les régions équilibrées diffèrent d’au plus un territoire ; le réglage de tailles variées produit des régions inégales. Chaque région et le graphe complet restent connexes.

`procedural.strategy` décrit les bases des deux forces, leurs poches de départ et le corridor objectif. Le moteur consomme ces métadonnées au lieu de supposer que la base adverse est T25. Il utilise les définitions, voisins et ressources de la planète active pour les ordres, le ravitaillement, les contre-offensives, les garnisons, la production et les diagnostics du poste de commandement.

Les deux forces commencent chacune avec une garde sur chaque site de leur poche et des groupes mobiles sur les frontières. Chaque poche comporte des productions S, M et I. Le nombre de personnes par force est le maximum de :

- 18 personnes ;
- la plus grande région, plus 10 ;
- le nombre de régions, plus 12 ;
- la longueur du corridor, plus 10.

Ce nombre est borné pour conserver au maximum 300 personnes dans l’archive, acteurs neutres compris. Les groupes mobiles sont répartis par groupes de huit, ce qui correspond au plafond d’un ordre existant. Les stocks initiaux sont répartis entre les positions de départ : S = douze entretiens initiaux + six par position, M = maximum de 16 et de l’effectif, I = maximum de 12 et du tiers arrondi supérieur des territoires. La production locale initiale s’ajoute ensuite selon les règles communes.

Il s’agit d’un réglage de l’exercice V103. Aucun individu n’est ajouté pendant une résolution, aucune recrue n’est prise dans la campagne et les archives historiques conservent leurs effectifs d’origine. Les prix des ordres, plafonds d’XP, réservations, soins et règles de combat restent ceux du moteur partagé.

## Objectifs, accès et milieux intérieurs

La domination exige tous les sites intacts, contrôlés et ravitaillés, avec une garnison apte par région, pendant deux fins de tour à entretien payé. L’objectif régional conserve son exigence d’une garde sur chaque site de la région. Le corridor suit le chemin réel entre les bases et conserve son exigence de transit auprès d’un site neutre. Les tests de V103 exercent réellement la résolution de ces trois objectifs sur les formats 18/3 et 96/12.

Les bassins et chenaux découpent le calque des terres et révèlent le milieu de surface choisi. Leurs polygones ne sont pas des territoires navals. Les marqueurs restent sur terre ; les routes traversant ces milieux sont explicitement déclarées `crossing` et associées à leurs `hydrologyIds`. Les trajets V103 sont dessinés avec les mêmes points géodésiques que ceux utilisés pour détecter les traversées. La distance affichée dans les données est une séparation angulaire : côtière entre masses distinctes, entre centres dans les autres cas. Elle ne remplace pas les coûts d’ordre existants.

Le masque SVG retire aussi les bassins des aplats de faction et des motifs du mode de secours. Un chemin superposé reçoit les clics sur la surface intérieure sans sélectionner le territoire terrestre sous-jacent. Le clavier et la liste complète des territoires restent disponibles. Au-delà de 48 territoires, les repères permanents privilégient la sélection et ses voisins ; le filtre régional, le survol, la prise de focus et l’annuaire permettent d’examiner les autres sites.

## Recettes et sauvegardes

Une recette V103 reçoit son propre code `proc-v103-…`. La version n’est jamais déduite d’un réglage visuel, et aucun code V102 n’est converti au chargement. Le dispatcher valide la syntaxe canonique, les paramètres et la somme de contrôle avant de résoudre un monde. Les trois empreintes publiées V102 restent des tests de régression.

Le générateur V103 peut importer une recette V102 et afficher, exporter ou rouvrir sa planète d’origine. L’action « Préparer une variante V103 » est explicite : elle prépare un brouillon ; générer ce brouillon crée une nouvelle carte et un nouveau code. Une modification de paramètres, un tirage ou un préréglage ne modifie pas l’aperçu appliqué ni le front ouvert.

Les archives des fronts utilisent toujours leur clé individuelle `yautja.clan-war.v96.planet.<code>.free.v1`. Le code suffit à reconstruire leur géographie, même si leur raccourci a été évincé. La validation des archives, la confirmation des écritures, les réservations IndexedDB, le refus d’un écrivain obsolète et la reprise après quota restent communs aux fronts historiques et générés.

Le nouveau catalogue `yautja.clan-war.v103.generated-catalog` conserve au plus 24 codes V102 ou V103. Il lit les raccourcis de l’ancien catalogue V102 sans réécrire sa clé. Il ne supprime jamais une sauvegarde de front. Une liste endommagée ou d’une version future reste intacte ; un échec d’écriture est signalé comme non confirmé. Si seul l’ancien index V102 est illisible, un nouvel index V103 valide peut être enregistré tout en présentant un message précis sur l’ancien index.

Les listes utilisent des descriptions calculées directement depuis le code, sans construire les maillages. Le choix d’un monde déclenche sa résolution. Chaque version conserve un cache borné de 24 géographies ; parcourir les noms du catalogue ne remplit ni n’évince ce cache.

## Exports et limites

Le JSON exporté contient le code, la recette versionnée, les descriptions et les résumés des milieux intérieurs. Les sommets des bassins sont reconstruits depuis la recette ; ils ne gonflent pas le fichier de partage. L’import vérifie l’accord exact entre version, recette et code. Les PNG séparés utilisent la planète appliquée, avec les nouvelles textures et les trous hydrologiques du moteur de rendu partagé.

La gravité, le climat et la durée du jour enrichissent le dossier. Ils n’ajoutent pas de modificateur de combat. Les bassins et chenaux sont des géométries déterministes ; aucun débit physique n’est simulé. Les rendus d’atmosphère sont les effets visuels modulaires du kit, avec export indépendant. La génération propose un très grand ensemble de combinaisons reproductibles, borné par les paramètres et les graines uint32.

Les tests ciblés de ce raccordement sont dans `tests/planet-generator-integration-v103.test.mjs`. Les contrôles complets de géométrie, de matières et de parcours navigateur sont documentés dans les autres fichiers de ce dossier et dans `verification.json`.
