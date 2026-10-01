# Villages et liaisons régionales V68

La carte du Homeworld possède dix destinations. Chaque destination dispose maintenant d'une corniche parcourue à pied, d'un village habité, de douze bâtiments à porte réellement accessible et de douze habitants. Les anciennes enquêtes des Marches et du Désert restent des activités distinctes ; les villages ne valident ni leur dossier ni un rang de chasse.

| Région | Communauté | Implantation | Terrain extérieur |
| --- | --- | --- | --- |
| Marches de Cendre | Halte des Porte-Cendres | Cour commune | Pistage, observation et maîtrise non létale d'un brouteur cuirassé |
| Désert de Verre | Village des Citernes | Cour commune | Pistage et maîtrise non létale d'un fouisseur |
| Jungle des Piliers | Terrasses des Hautes Branches | Terrasses irrégulières | Observation et protection de deux balises |
| Marais Luminescents | Veillée des Racines | Terrasses irrégulières | Observation, montée des eaux et deux balises |
| Chaîne des Orages | Refuge des Trois Vents | Deux bandes d'habitations et cour abritée | Observation d'un planeur et protection des balises |
| Côte des Léviathans | Port des Marées Longues | Deux bandes d'habitations et cour abritée | Observation et maîtrise d'une carapace du rivage, sans prétendre affronter un Léviathan |
| Grottes Thermiques | Enclave des Forges Basses | Refuge resserré | Relevés de maintenance, jets de vapeur et récupération d'un instrument |
| Couronne Froide | Halte des Hautes Neiges | Refuge resserré | Observation d'un carnivore, chute de neige et récupération d'une plaque |
| Ruines de la Première Cité | Camp des Archives Scellées | Cour commune | Maintenance, surveillance d'une sentinelle et registre déplacé |
| Réserve Interdite | Poste des Gardiens de Réserve | Terrasses irrégulières | Confinement et journal récupéré sans ouvrir l'enclos |

## Déroulement réel

La route mesure environ 420 mètres selon l'échelle du projet. Elle compte sept bornes, deux ouvrages composés de cinq modules natifs au total, des coudes et un retour par le chemin inverse. Le déplacement appartient au joueur ; aucun transport automatique ne remplace la traversée.

Le village contient une maison commune, un atelier, une maison de soins, une galerie des récits et huit demeures. Toutes les portes utilisent le seuil mesuré de leur image. Les intérieurs possèdent un sol, des murs natifs en coupe, un point de consultation et une sortie revenant au même seuil. La banquette, le couchage et la station de travail utilisent les mêmes positions et empreintes natives pour le rendu et les collisions ; le joueur ne les traverse pas. La petite salle est centrée lorsque le viewport dépasse ses dimensions. Les habitants fixes ont des volumes de pieds ; les porteurs et apprentis circulent sur des parcours locaux.

Le pisteur du clan donne les relevés à comparer. Trois sites physiques sont inspectés dans l'ordre. Sept régions ajoutent une observation à distance de la faune pendant 90 ticks. Trois épreuves demandent au moins deux charges évitées et trois contacts pendant des ouvertures différentes ; l'animal se retire vivant. Trois territoires possèdent deux balises à fixer pendant l'avertissement du danger. Les quatre autres proposent une récupération pendant l'accalmie après une sortie physique de la zone avertie.

Le guide reçoit un rapport après un objectif effectif. Il peut recevoir un nouveau rapport plus tard au cours de la même sortie, pour un contrat dont la preuve a été obtenue après le premier rapport. L'interface ne transforme pas une observation, une réparation ou un outil rendu en trophée de mise à mort.

## Perspective et placement

Le sol utilise des coordonnées physiques, projetées avec un angle vertical de 35 degrés. Un adulte mesure 100 unités dans la convention existante du projet. Les images de bâtiment conservent leurs pixels d'origine et leur échelle uniforme ; leur seuil peint définit leur position, leur empreinte et leur porte. Les accessoires sont découpés dans les cellules déjà mesurées du kit V64 et placés par leur point d'appui.

Le périmètre irrégulier du village et celui du poste extérieur sont partagés par le rendu et la collision. Les cours, fondations et chemins utilisent des matériaux indépendants. Les ponts conservent les dimensions du tablier mesuré en V67. Les grands vaisseaux ne sont pas installés sur les rues des villages.

## Provenance et limites

Le dossier récupéré **Mission jeunesse Yautja**, conversation `6aa9e35a-3288-83eb-a8bf-45d3197113bf`, est enregistré dans `work/v36/new-world-specs/youth-thread-page-1.json`. Il décrit notamment le Peuple des Citernes, Vek’shan, Isha’ren, les Terrasses des Hautes Branches et les traditions locales. Ces idées sont adaptées à la géographie originale des dix régions déjà présente dans le jeu. Les autres noms de village et de clan sont des créations de cette adaptation ; ils ne sont pas présentés comme des communautés officiellement cartographiées par la franchise.

Les architectures réutilisent les images OpenAI originales V64, les ponts V67 et les panoramas déjà livrés ou fournis par l'utilisateur. Les sept animaux réutilisent des planches V8 de six poses réellement existantes. Aucune image nouvelle, aucun alphabet canonique et aucune fidélité 1:1 à une carte officielle inexistante ne sont revendiqués dans cette livraison. Le traqueur des piliers n'est pas présenté comme un hexapode lorsque sa planche montre une autre morphologie.

Le dossier source prévoit aussi vingt-cinq sous-zones ordinaires, quinze zones Élite, des récits tribaux plus longs et leurs grandes proies. Ces sous-zones et boss ne sont pas remplacés par les villages V68 et restent à produire. La cible de dix à seize heures évoquée par ce dossier n'est pas une durée mesurée de cette livraison.

## Sauvegarde et vérification

Le checkpoint `homeworldRegionV68` est normalisé sans remise à zéro d'une version inconnue. Les preuves contiennent le parcours, la sortie, le tick, le lieu, la position et les compteurs effectivement obtenus. Leur écriture et celle des contrats sont une transaction atomique effectuée par `GameClient`. Un refus conserve le même état pour réessayer ; le retour à la cité transmet sa dernière position au même mécanisme atomique.

La suite `tests/homeworld-regions-v68.test.mjs` parcourt les dix routes dans les deux sens, franchit les cent vingt portes par la physique du jeu, atteint leur consultation puis revient au seuil, contrôle les trois meubles solides par intérieur, teste les trois maîtrises de faune, les trois protections de balises, les quatre récupérations et les données malformées. Le navigateur est vérifié séparément, avec des entrées au clavier et des captures ; la réussite des tests de modèle seule ne certifie pas le rendu public.
