# V63 — ancienne tête et attaches modulaires

La section **Tête du chasseur** propose désormais deux choix indépendants du corps : anatomie référencée V62 et **Ancienne tête du clan**. Les six images V3 d'origine restent disponibles, sans modification ni suppression. Ce dernier choix désigne une création du projet ; aucune identité canonique n'est inventée pour le justifier. Le choix est enregistré dans `appearance.headStyleId`, normalisé à l'import et conservé après rechargement. Les anciennes sauvegardes sans ce champ conservent le comportement V62.

Les deux familles sont utilisées par le même sélecteur de ressources dans l'aperçu de forge, le chasseur du Homeworld et le Canvas des chasses. Le filet facial contenant l'ancienne silhouette n'est pas superposé aux nouvelles têtes. Les masques, armures et teintes restent indépendants.

Les dreadlocks ont sept attaches sur l'arrière du crâne. Leurs volumes sont calculés à partir de l'enveloppe alpha mesurée des huit textures d'origine, dont l'empreinte est conservée. Des ressorts amortis bornés contrôlent le mouvement pendant la course, le saut et le freinage ; les sous-pas stabilisent les variations de cadence. Une projection des angles empêche les volumes échantillonnés de pénétrer les ellipses du crâne, du cou et du torse, lesquelles suivent les os animés. L'entrée courte de la mèche est volontairement sous le calque du crâne. Les mèches sont aussi dessinées derrière le corps.

Le Homeworld utilise la même simulation, avec son horloge existante : les angles se figent en pause, pendant un dialogue ou une suspension. L'aperçu de forge utilise le solveur de placement avec la pose présentée, sans horloge d'animation indépendante susceptible de traverser le corps.

## Portée exacte

Il s'agit d'un mouvement secondaire 2D avec volumes approximatifs, pas d'une simulation de cordes ou de maillage 3D. Les bras, armes, mèches voisines et éléments de décor ne disposent pas de collisions physiques individuelles dans ce lot. Les textures ne sont ni étirées pour inventer des dessins intermédiaires ni remplacées par des images synthétiques. Les animations des membres du personnage modulaire restent celles du rig existant.

## Vérifications

- Quatre tests dédiés : sélection et migration des têtes, empreintes des huit textures, amortissement/pause/stabilité et collision des mèches.
- 5 760 configurations (six corps, huit styles de dreadlocks, deux têtes, deux orientations, six poses et cinq phases), soit 40 320 placements de mèches : attaches stables et aucune pénétration des trois volumes testés. Simulation comparée à 30, 60 et 120 images/s.
- 48 compositions des vrais composants React dans Chrome : ressources chargées, têtes correspondantes, aucun ancien filet facial, sept mèches dans chaque rendu. Rapport `v63-rig-composition-qa.json`.
- Vraie forge : trois changements de tête, images effectivement utilisées, persistance après rechargement et passage en apparence personnalisée. `work-local/v63/qa/hunter-choice/report.json`.
- Quatre chasses Canvas (Classic/Feral × référence/ancienne tête) : déplacement et retrait/remise du masque, chemins et dimensions des images observés au moment de leur dessin. `work-local/v63/qa/head-mission/report.json`.
- Les captures de repos Classic et Super et de saut Feral ont été inspectées. La composition existante des membres et de l'équipement n'est pas certifiée parfaite dans toutes les poses par ces essais.

Les essais utilisent des contextes de navigateur isolés. Aucune sauvegarde personnelle de l'utilisateur n'a été lue ni modifiée. Les rapports publics, lorsqu'ils existent, sont conservés séparément dans `work-local/v63/qa/public-*` et reliés dans `v63-release-gates.json`.
