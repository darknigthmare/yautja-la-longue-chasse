# V60 — animations natives de fond

Ce document décrit le contrat du moteur de présentation. La présence de ce moteur ne prouve pas la production des images ni la validation des scènes. Le registre `app/game/data/pitStageLifeV60.json` est la liste exacte des ressources réellement raccordées ; son contenu et les recettes visuelles doivent être contrôlés séparément.

## Contrat des images

Le manifeste contient `schemaVersion: 1`, `release: "V60"` et une liste `stages`. Chaque entrée a un `stageId` et exactement trois `events`.

Chaque événement contient :

- `id` : identifiant en minuscules et tirets ; `name` : nom lisible.
- `src` : `/game/sprites/v60/pit-life/<stageId>/<nom>.png`, propre à cet événement et cette scène.
- `width`, `height`, `sha256` : dimensions et empreinte du PNG natif, sans retouche.
- `frames` : de trois à trente-deux dessins, chacun avec `rect: [x, y, width, height]` dans le PNG, `pivot: [x, y]` local à cette cellule et `alphaBounds: [x, y, width, height]` local à cette cellule. Les bornes sont mesurées avec alpha supérieur à 2.
- `fps` : cadence de 1 à 12 dessins par seconde. La durée de lecture doit rester inférieure à 720 ticks, donc 12 secondes.
- `restFrame`, `reducedMotionFrame` : véritables cellules calmes. Aucun dessin de substitution n'est fabriqué.
- `placement: {x, bottom, height, parallax, renderPass, anchor}`. Le plan est `P1`, `P2` ou `P3`. `height` représente la hauteur de la première cellule à l'échelle du jeu ; les autres cellules gardent le même rapport de pixels. L'ancrage `ground` conserve le décalage mesuré par rapport au sol de combat ; `world` utilise la transformation de profondeur de son propre plan, pour un motif suspendu ou distant.

Les trois motifs existent ensemble dans leur pose calme. Un seul joue son animation à chaque événement. Il faut donc trois motifs ou acteurs placés séparément ; trois variantes superposées d'un même personnage ne conviennent pas à ce contrat.

Le renderer ne retourne pas les PNG en miroir, ne recolore pas les dessins, n'étire pas leurs proportions et ne fait pas passer le déplacement d'une pose fixe pour une animation. Les pivots stabilisent le point d'appui pendant le changement de cellule. Les animations restent derrière le plan de combat P4 et les combattants.

## Direction des événements

`pitStageLifeDirectorV60.ts` projette les poses depuis l'identifiant de scène, la manche et son temps de simulation. Aucun générateur aléatoire du combat, horloge système, impact, identité de combattant ou état persistant n'entre dans ce calcul.

Le premier événement arrive après 12 à 25 secondes. Chaque bloc de 3 330 ticks, soit 55,5 secondes, tire un sac contenant les trois événements dans un ordre déterministe. La première entrée est permutée si elle répète la dernière du sac précédent. Tous les gestes sont donc proposés une fois par sac, sans répétition immédiate. Les intervalles internes et entre les sacs sont compris entre 12,5 et 24,5 secondes. Les identifiants de scène et les manches décalent les schedules.

Chaque dessin est lu dans l'ordre natif, puis le motif reprend sa pose de repos jusqu'au prochain événement. Les autres motifs restent calmes. Le calcul a un coût constant, même après un long entraînement ou un saut temporel dans un replay. Pendant la pause, les ticks restent identiques. Les écrans de résultat et le mouvement réduit tiennent la pose calme, sans animation automatique supplémentaire.

Les anciennes distributions V54 et V57, leurs timings de résultat et leurs tests restent inchangés. Aucun numéro de version de simulation, sauvegarde ou replay n'est modifié.

## Chargement et vérification

`loadPitArenaArt` ne charge que les trois PNG de la scène sélectionnée, avec ses plans existants. Les trois dimensions doivent correspondre exactement au registre. Un fichier manquant ou malformé garde la banque en échec et interdit le lancement ; un aperçu réussi ne répare pas implicitement une autre banque en échec. Une nouvelle tentative recharge une nouvelle banque. Les annulations conservent les protections historiques contre les chargements tardifs.

La télémétrie Canvas expose `data-pit-stage-life-v60-stage`, `data-pit-stage-life-v60-actors`, `data-pit-stage-life-v60-events` et `data-pit-stage-life-v60-missing`. Chaque événement indique son identifiant, son PNG, sa cellule, son état actif, sa passe, son point d'attache et s'il a réellement été dessiné.

`tests/pit-stage-life-v60.test.mjs` vérifie les sacs, intervalles, pauses, seeking, mouvement réduit, appuis, sources distinctes, changements de cellules, absence de mutation du combat et reprise après erreur de PNG. Pour chaque entrée réelle du registre, il lit aussi les fichiers : empreinte, dimensions, alpha, cellules distinctes, bornes alpha et absence de recyclage des mêmes octets sous plusieurs noms.

Ces tests ne certifient pas à eux seuls le lore, la qualité anatomique, la composition, l'absence de personnage dupliqué, ni la lisibilité en duel. Les captures aux différentes échelles et les contrôles dans l'application restent nécessaires avant de déclarer un stage terminé.

## Assemblage et qualification d’une composition

`docs/v60-stage-plan.json` définit les25 identifiants162–186. Les reçus `docs/v60-generation/<stageId>.json` conservent les fichiers natifs OpenAI, leurs empreintes, les références et les limites de lore. Les placements, pivots particuliers et supports inspectés sont séparés dans `docs/v60-stage-layout.json`, pour éviter de modifier les reçus de production.

`node scripts/assemble-pit-stages-v60.mjs all` prépare le catalogue, les plans P0–P5 et les trois animations de chaque lieu. Il conserve octet pour octet les161 anciennes entrées. P0 est propre au nouveau lieu ; les modules réutilisés désignent une entrée explicite de bibliothèque et leur source exacte. Les limites narratives restent dans les métadonnées : un motif anonyme d’ambiance ne devient pas une réaction conditionnée à la victoire ou à un incident.

La commande refuse les images non acceptées, les empreintes divergentes, les cellules dupliquées et les silhouettes coupées. Une exception locale peut accepter un résidu de bord au plus alpha16 uniquement avec maximum mesuré et revue explicite de silhouette ; elle ne modifie ni les pixels ni les bornes alpha>2. Un bord plus fort exige une frontière de cellule vide réellement mesurée ou une nouvelle génération native.

`node scripts/verify-pit-stage-composition-v60.mjs all` dessine les scènes avec le véritable renderer dans Chrome, mais ne modifie pas leur disponibilité dans le jeu. Il vérifie six plans,18 dessins natifs, appuis, surfaces de sol, caméras, mouvement réduit, contraste et mobile. Les captures sont dans `work-local/v60/qa/renderer/<stageId>/` ; les rapports versionnables sont `docs/v60-<stageId>-renderer-qa.json`.

Après examen réel des captures centrale, gauche et droite, la revue de la composition exacte est enregistrée dans `docs/v60-stage-composition-visual-review.json`. `node scripts/enable-pit-stages-v60.mjs reviewed` contrôle le digest des placements, les18 poses, les empreintes des PNG et des captures avant d’autoriser le lieu. Une modification après acceptation exige une invalidation explicitement documentée et une nouvelle revue. Le lancement dans l’application complète, la publication et la vérification publique sont des étapes distinctes de cette promotion locale.

Les sorties PNG V60 utilisent uniquement la jonction `public/game/sprites/v60` vers `work-local/v60/public-sprites` du workspace. Le pipeline vérifie sa destination physique ; il ne copie pas les nouveaux packs sur le volume D presque plein.
