# V60 — stages du classeur et animations de fond

## Périmètre réel

Le fichier fourni `THE_PIT_BIBLE_COMBATTANTS_STAGES_V54.xlsx` est lu sans être modifié (SHA256 `32f2ee8e4fd801e7ca677a54862f2bd0123a2e78d12c015f64b50ab28184c380`). L’inventaire `v60-workbook-stage-inventory.json` rapproche ses 174 dossiers et leurs propositions des ressources du jeu. Ce lot traite 25 décors absents ou compléments distincts, numérotés 162–186. Il ne certifie pas les 174 dossiers terminés et ne remplace pas toutes les animations des 161 arènes historiques.

25 images de profondeur P0 et 75 feuilles d’animation propres aux scènes ont été produites avec l’outil OpenAI intégré. Chaque feuille contient six dessins natifs : 450 dessins pour 75 animations. Deux sols originaux supplémentaires, pont de bois et basalte sombre, ainsi qu’un poteau maritime et une caisse avec cordage complètent le lot : 104 PNG natifs distincts. Les plans P1–P5 réutilisent aussi des modules existants compatibles, explicitement référencés dans le manifeste ; ils ne sont pas comptés comme de nouvelles images.

Les PNG sont copiés sans retouche de pixels. Les rectangles de lecture, pivots, dimensions, alpha et SHA256 sont mesurés dans les sorties natives. Des cellules inégales sont utilisées lorsque les gouttières natives le demandent, notamment pour garder les ailes et queues entières. Les faibles halos de segmentation ne sont acceptés qu’après revue explicite par ressource et mesure de leur alpha ; aucune silhouette réellement coupée n’est autorisée par cette exception.

## Scènes du lot

| Numéro | Décor | Cadre de référence |
| --- | --- | --- |
| 162 | Vestiges de la chasse à l’Ingénieur | Ahab / Fire and Stone |
| 163 | Laboratoire des cyborgs | Concrete Jungle / Neonopolis |
| 164 | Carrière des premiers chasseurs | Alpha NECA, adaptation originale |
| 165 | Salle du trône | Kenner / NECA, sans confusion avec Kalakta ou le roi Marvel |
| 166 | Atelier des prothèses | Variantes cybernétiques, lieu original |
| 167 | Crête volcanique | Thème Lava Planet, biome original |
| 168 | Front de ruche | AVP, composition originale |
| 169 | Avant-poste d’Extinction | AVP Extinction, adaptation latérale |
| 170 | Quais nocturnes de Gotham | Blood Ties, architecture recomposée |
| 171 | Laboratoire Meta | Cadre de crossover, laboratoire original |
| 172 | Village du Nord | Variante inspirée de Hunting Grounds |
| 173 | Cour japonaise | Variante inspirée de Hunting Grounds |
| 174 | Halte des sables | Variante terrestre originale |
| 175 | Îles et récif | Variante insulaire originale |
| 176 | Pont d’épave | Variante de chasse pirate originale |
| 177 | Jungle amazonienne | Variante originale inspirée de Hunting Grounds |
| 178 | Ring clandestin | Predator: Bloodshed |
| 179 | Réserve de chasse | Predator: The Last Hunt |
| 180 | Intérieur du Sandpiper | Predator 2023 |
| 181 | Laboratoire d’implantation | Aliens versus Predator 2, guide Prima |
| 182 | Hangar du chasseur aérien | Killer of Killers, aéronef d’après image officielle |
| 183 | Homeworld sauvage | Région originale du projet |
| 184 | Seuil Warp | Création du projet, technologie non canonique déclarée |
| 185 | Aire d’entraînement | Création du projet |
| 186 | Piste de chasse glacée | Création du projet |

## Mise en scène et fonctionnement

Les trois motifs d’une scène sont des PNG séparés et exclusifs à cette scène. Ils restent dans leur pose calme puis jouent chacun leur séquence, dans un ordre pseudo-aléatoire déterministe sans répétition immédiate. Le premier événement arrive après 12–25 secondes ; les suivants sont espacés de 12,5–24,5 secondes. Un sac contient les trois motifs. La pause conserve les mêmes poses, le mouvement réduit utilise les poses calmes et les événements de fond ne modifient ni dégâts, ni simulation, ni sauvegardes, ni replays.

Les supports sont placés d’après l’architecture visible : acteurs sur passerelles ou corniches, consoles sur murs, bras mécaniques sur socles, motifs suspendus sur leurs points d’attache. Les trois passes d’animation restent derrière le combat. Les caméras centrée et rapprochées dans les deux coins sont inspectées, en complément du harnais couvrant huit vues et les 18 poses de chaque scène.

Seuls les trois atlas de la scène sélectionnée sont demandés. Un échec de chargement ou des dimensions incorrectes bloque l’introduction et la simulation, avec une nouvelle tentative. Aucun ancien sprite ne masque discrètement un PNG absent.

## Fidélité et demandes restant distinctes

Les sources attestent des cadres narratifs, références de matériaux ou silhouettes ; aucune fidélité absolue 1:1 de ces décors latéraux n’est certifiée. Les reçus `docs/v60-generation/` conservent sources, prompts, limites et sorties acceptées. La référence de l’aéronef 182 est une image officielle du film ; le laboratoire 181 utilise des captures du guide Prima. Les captures et PDF de référence ne sont pas incorporés comme illustrations publiées dans le jeu.

Certaines lignes du classeur sont des événements conditionnels, interdictions ou propositions à documenter. Leur adaptation d’ambiance ne les clôt pas littéralement :

- Ahab : espèce inconnue et silhouette d’Ingénieur avant boss remplacées par végétation et mécanisme architectural. Les acteurs conditionnels restent ouverts.
- Alpha : mécanismes de carrière à la place de travailleurs/sentinelles dont l’espèce n’est pas prouvée.
- Trône : aucune tentacule inventée ; bannière originale. Le salut de victoire conditionnel ne devient pas une annonce de victoire aléatoire pendant le duel.
- Ruche : un garde anonyme ne représente pas une équipe complète ; le drone à dôme lisse n’est pas certifié identique au Warrior de la référence.
- Extinction : machine de maintenance originale, sans prétendre avoir livré la silhouette précise du Hydra.
- Gotham et Meta : figurants anonymes ; partenaire narratif et héros conditionnel du classeur non reproduits comme personnages reconnus.
- Cour japonaise : lanterne passive en ambiance. Le gong réservé au début du round n’est pas frappé aléatoirement.
- Bloodshed : mouvements de l’annonceur et affichage discret ; les coupures liées au premier incident restent des déclenchements narratifs séparés.
- The Last Hunt : diagnostic neutre de la balise, sans simuler un objectif accompli. Sandpiper : équipage anonyme, sans inventer la présence d’un captif d’un chapitre précis.
- Entraînement : ancien observateur ; aucune déclaration aléatoire de vainqueur pendant une manche.

## État de validation

La génération des 104 PNG et les 25 compositions sont terminées. L’audit final compte 186 kits jouables et vérifie 501 chemins uniques ; les 161 anciennes entrées sont strictement identiques au commit de départ. Les 75 captures de composition acceptées sont liées à leurs empreintes exactes dans `v60-stage-pipeline-final-qa.json`.

La suite complète finale passe **1 890/1 890 tests**, sans échec ni test ignoré (`work-local/v60/qa/full-tests-final.log`). TypeScript passe. ESLint ne signale aucune erreur et conserve les trois avertissements préexistants sur les images de ClanChronicle/CompanionCatalogue.

Les builds Vinext et Next passent (`build-vinext.log`, `build-next-final-cache.log`, sous `work-local/v60/qa/`). Les deux premières tentatives Next restent consignées : conflit de types générés lors des compilations simultanées, puis résolution de dépendance absente dans le cache déplacé sur M:. La compilation Next finale est séquentielle, utilise Webpack et retrouve les dépendances déjà installées par une jonction locale ; aucune dépendance n’a été réinstallée et ces réglages locaux ne sont pas déployés.

Un premier pilote exécuté pendant les rechargements du serveur de développement a signalé un abandon du rendu serveur au profit du client. Ce résultat est conservé comme échec dans `work-local/v60/qa/application-pilot170/failure.json` et n’est pas compté comme validation. Le pilote Vinext compilé ci-dessous ne reproduit pas cette erreur ; cela ne prouve pas à lui seul sa cause dans le serveur de développement.

Sur Vinext compilé, le stage 170 passe le parcours roster → stage → duel, les 18 dessins natifs, la pause, l’écartement réel des combattants et le chargement limité à ses trois PNG, sans erreur navigateur/HTTP ni modification des sauvegardes (`v60-vinext-native-stage170-qa.json`). Le replay V9 archivé atteint le tick 360 avec les vies `[960,438]`, checksum `b3244626`, 121 frames où les carreaux sont visibles, sans substitution par le lanceur V59 et sans modification de l’archive (`v60-feral-replay-v9-vinext-qa.json`).

Les **104 PNG** servis par Next final répondent HTTP 200 en `image/png`, avec des SHA256 identiques aux octets natifs acceptés (`work-local/v60/qa/assets-next-final.json`).

Dans l’application Next compilée, les deux partitions du parcours roster → stage → duel couvrent exactement les **25 scènes**, leurs **75 animations** et leurs **450 cellules natives** réellement dessinées. L’agrégat passe **36 groupes de contrôles**, avec **136 captures**, sans erreur JavaScript/console ni réponse HTTP inattendue. La pause, le mouvement réduit, les deux orientations mobiles, le chargement sélectif et une panne 503 volontaire suivie d’une reprise passent aussi. Les sources sont identiques avant/après les parcours et les sauvegardes restent intactes (`work-local/v60/qa/application-next-complete/report.json`). Le portrait mobile conserve une scène 16:9 avec des bandes noires ; il n’est pas présenté comme une refonte optimisée pour le portrait.

Le classeur de suivi séparé `THE_PIT_STAGES_V60_SUIVI.xlsx` récapitule les 25 scènes, les 75 animations, leurs placements et les limites restantes. Le classeur source n’est pas modifié. La publication est encore en attente à ce stade ; elle fait l’objet des contrôles publics ci-dessous une fois confirmée.
