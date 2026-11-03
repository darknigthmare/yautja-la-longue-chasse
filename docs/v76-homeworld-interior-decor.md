# V76 — Mobilier intérieur orienté

Quatre PNG natifs indépendants ajoutent un banc long orienté vers la gauche, un établi orienté vers la droite, un rayonnage avec face latérale et un coffre en diagonale. Ils ont été générés avec **OpenAI image_gen intégré**, à partir du kit civique V72 inspecté. Aucun CLI payant, clé API, dessin CSS, rotation de bitmap, miroir ou nettoyage d’alpha n’a été utilisé.

Les sources finales sont dans `public/game/homeworld/v76/interior/`. Les images et cellules V72/V74, les listes de meubles existants, les partitions, les zones, les points et les services sont conservés. Le banc a eu deux essais supplémentaires de génération/détourage ; les sources générées non retenues restent dans le dossier de génération, et ne sont pas des décors actifs. La source finale choisie est celle du manifeste V76.

## Pivots, perspective et volumes

La consigne des images est la caméra orthographique du jeu, yaw 0° / pitch 35°. L’orientation du meuble est dessinée dans ses pixels : seuls l’ancrage au sol `x,y` et une échelle uniforme sont appliqués. Ces images 2D ne constituent pas une reconstruction 3D dont tous les angles seraient calibrés numériquement.

`homeworldInteriorDecorArtV76.json` contient dimensions, rectangle source complet, silhouette alpha >=128, SHA256, pivot du support avant, rectangle conservateur des supports dans les pixels, conversion en volume au sol, orientation et provenance. Le seuil alpha est uniquement une mesure de silhouette opaque ; les PNG gardent leur alpha original, y compris la frange faiblement opaque. Aucun pixel n’est filtré ou réorienté.

Les volumes sont asymétriques par rapport au pied avant : un objet diagonal n’est pas artificiellement centré sur son rectangle d’image. La profondeur des supports est obtenue en déprojetant leur différence de y avec `sin(35°)`. `homeworldInteriorDecorBoundsV76` emploie exactement les mêmes données que le renderer. Les AABB conservatrices empêchent de traverser les meubles ; une transparence temporaire lorsque le jeune est derrière ne supprime jamais le collider.

| Source | Orientation native | Échelle pixels → monde | Silhouette peinte à échelle 1 |
|---|---|---:|---:|
| bench-left.png | Avant gauche, axe diagonal | 0,11 | 81,95 unités de hauteur totale projetée |
| worktable-right.png | Avant droit, axe diagonal | 0,105 | 93,555 unités |
| rack-lateral.png | Face ouverte latérale gauche | 0,082 | 93,48 unités |
| chest-diagonal.png | Avant gauche, coffre diagonal | 0,095 | 84,265 unités |

La hauteur totale peinte comprend la projection du volume de profondeur, et ne signifie pas une hauteur de siège. Chaque instance utilise son échelle de pièce dans le codex.

## Placement fonctionnel et accès

Le nouveau champ `room.orientedDecorV76` est distinct des IDs V72. Les **92 objets solides** sont répartis dans les **43 pièces** : 1–2 ajouts dans les maisons, et 1–4 dans les bâtiments publics suivant l’espace disponible. Le banc sert à la halte, l’établi à la maintenance, le rayonnage aux rouleaux/contenants et le coffre au stockage scellé. Ce sont des usages et meubles originaux de cette cité ; aucune arme, prise, coutume domestique ou relique canonique n’est prétendue.

Les coordonnées sont publiées dans `homeworldInteriorDecorPlacementsV76.json`. Aucun objet n’est tiré au hasard ni placé dynamiquement au chargement. L’auteur hors runtime a réservé les chemins existants vers points, sorties, zones, passages et meubles accessibles. Chaque candidat a ensuite été contrôlé avec les collisions réelles, y compris celles des nouveaux objets. Huit candidats initiaux trop isolés ont été rejetés plutôt que conservés pour augmenter le compte.

Le renderer est `HomeworldInteriorDecorV76.tsx`, intégré à `HomeworldInteriorSurface.tsx`. `homeworldInteriorsV64.ts` applique `homeworldDecoratedInteriorV76` après les modèles V72/V74 et la normalisation des anciens props, puis ajoute les volumes à `isHomeworldInteriorWalkableV64`. Les repères V75 et les déplacements existants consomment donc les vrais nouveaux obstacles.

`homeworldInteriorDecorCodexV76(room)` expose une fiche par objet : fonction locale, bâtiment, orientation, pivot, volume, échelle, SHA, source et solidité. Le parent peut l’intégrer à son codex agrégé sans élargir le catalogue d’IDs V72.

Entrer dans une pièce ou visiter le décor ne donne aucun objet, contrat, soin, arme, rang, marque ou permission. Les huit emplacements de prises du mausolée restent liés exclusivement aux prises possédées par la sauvegarde.

## Contrôles effectués

- `node --test tests/homeworld-interior-decor-v76.test.mjs` : **47/47 PASS**. Les 43 floods parcourent les vrais segments de collision à pas de 1 unité, sur une grille de 4, avec le corps entier augmenté de 4 unités (28 ×18 demi-dimensions). Ils vérifient sortie, toutes les zones, chaque service, chaque passage, les supports dans les murs et l’approche des nouveaux meubles, ainsi que l’approche individuelle de chaque ancien meuble selon la règle documentée ci-dessous.
- Les anciens champs des six grandes salles gardent leur SHA historique exact. Les points existants restent au nombre de 15 ; aucune action n’est remplacée.
- `node --test tests/homeworld-wayfinding-v75.test.mjs` : **10/10 PASS**, dont les routes des 43 portes, des postes, les changements de pièce et les accès de jeunesse.
- ESLint sur modèle, renderer, surface et intérieur V64 : **exit 0**.
- Métrologie PNG : les quatre fichiers ont leur SHA correspondant au manifeste, vraie transparence, silhouette et support mesurés. Renderer SSR vérifié : support au sol aligné, échelle uniforme et aucun transform de rotation/mirroir.

Recette navigateur prête : `scripts/verify-homeworld-interior-decor-v76.mjs`, variables `V76_QA_URL`, `V76_INTERIOR_QA_OUTPUT`, `YAUTJA_QA_EXPECTED_VERSION=V76`. Elle suit désormais **sept vraies portes**, dont The Pit, et toutes leurs zones/passages/services au clavier, mesure les supports dans le DOM, vérifie les quatre PNG HTTP/SHA et teste portrait, pause/reprise/focus et sortie réelle. Elle joue aussi une approche des anciennes parures de The Pit par le passage rétabli. Elle ne modifie aucun acteur ou checkpoint privé. La campagne préparatoire vient d’une sauvegarde produite par le modèle joué ; le portrait est une émulation Chrome.

Une première passe locale compilée a réussi 14 contrôles avec neuf captures effectivement relues ; voir `v76-interior-visual-review.md`. Le correctif ci-dessous et la nouvelle recette à sept salles exigent un nouveau build et une nouvelle passe. La recette publique V76 reste une vérification distincte, à consigner après son exécution.

## Correctif de la régression d’approche ancienne

La régression complète a détecté un accès isolé aux anciennes parures de The Pit. Le rayonnage nouveau `pit-gate-v76-1`, initialement X512 / Y240, ne chevauchait aucun meuble ou mur, mais fermait la voie corporelle du côté droit. La distance minimale depuis le sol accessible vers `pit-gate-v74-parures` passait de 18,016 à 66,057 unités. Les anciens tests V74 l’ont détecté ; le premier test V76 n’exigeait pas encore une approche individuelle de **chaque ancien meuble**, seulement les sorties, zones, passages, services, l’absence de chevauchement et les nouveaux meubles. Cette lacune est maintenant corrigée dans les 43 floods V76.

Seul le nouveau rayonnage est réimplanté à **X176 / Y296** dans l’aire de préparation. Aucun meuble, mur, zone, point ou service historique ne change. Les parures retrouvent leur approche à 18,016 unités ; le nouveau rayonnage a une approche à 18,435 unités. Ses appuis restent bornés et ne chevauchent pas les autres éléments. Les 92 objets sont conservés.

Tous les autres anciens meubles doivent garder une approche strictement inférieure à 60 unités avec les demi-dimensions 28 × 18. Une seule exception préexistante est explicite : `memory-vault-v72-role-east`, déjà à 78 unités **sans aucun décor V76**. Le test recalcule ce véritable état initial avec `orientedDecorV76: []`, exige qu’il reste à 78, puis exige une distance actuelle ne dépassant pas cette baseline (tolérance 1e-8). Il ne présente pas ce meuble comme accessible à 60 et ne réduit aucune autre exigence. L’ancien meuble n’est pas déplacé.

Commande après le correctif : `node --test tests/homeworld-interior-decor-v76.test.mjs tests/homeworld-secondary-interiors-v74.test.mjs tests/homeworld-interiors-v64.test.mjs` — **132/132 PASS** : 47 cas V76, 40 cas de la suite V74 comprenant les 37 plans secondaires, et 45 cas d’intérieurs V64. Lint ciblé du test, du modèle, du renderer et de la recette : code de sortie 0. Les quatre PNG et leurs SHA ne changent pas. Le build et les parcours navigateur finaux doivent être relancés pour ce placement corrigé.

La grille hors runtime à huit unités manquait cet ancien passage étroit : même sans le meuble bloquant, elle n’offrait qu’une approche à 66,75 unités, alors que la grille à quatre unités atteint 18,016. Le navigateur emploie maintenant la grille à quatre unités dans The Pit, vérifie chaque unité des segments et marche réellement vers les parures ; aucune téléportation ne compense une route manquée.
