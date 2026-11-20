# Esquive et course avant — revue indépendante

Statut : **draft, sans validation artistique humaine ni branchement gameplay**. Toutes les mesures utilisent la grille Math.round : 0, 314, 627, 941, 1254.

## Esquive

Source : `exec-93599687-55f2-40df-88b3-f1676f6ef8fd.png`.

Le Yautja s’abaisse, projette le poids vers l’avant, traverse une pose d’esquive basse puis se redresse. Les genoux, le torse et les dreads évoluent réellement ; aucun maintien artificiel n’est introduit au milieu. L’apparence de petit bond dans certaines cellules est une proposition visuelle, pas un ajout d’impulsion verticale à la mécanique.

Les 16 corps sont entiers. Aucun bord ne porte de pixel alpha ≥16 ; marges minimales gauche/haut/droite/bas : **29 / 28 / 24 / 7 px**. Du bruit alpha >2 touche le bas de la cellule16 seulement. La garde de l’atlas d’import doit entourer la source sans effacer ses pixels.

Ne pas stabiliser cette action sur les pieds : la compression et le déplacement relatifs du corps font partie du geste. Le mouvement monde reste fourni par le moteur. La durée d’invulnérabilité ne dépend pas de la cadence choisie pour l’aperçu.

## Course avant

Source : `exec-efc3ced9-9248-4ac4-a073-e05110bee0d6.png`.

Les 16 poses forment une suite de foulées avec alternance des jambes et des bras. Les dernières cellules restent en course : elles ne reviennent pas à idle et n’introduisent pas une attente finale. Aucune paire de silhouettes successives, y compris16→1, n’est identique au seuil alpha≥128.

Le corps, les pieds et les équipements restent entiers, avec des marges minimales **52 / 15 / 58 / 10 px**. Aucun bord n’est touché au seuil alpha ≥16, ni au seuil alpha >2.

La transition16→1 est plus marquée que la plupart des voisines. Le recouvrement des silhouettes alignées dans la cellule est **0,486**, pour une médiane des transitions internes de **0,683** ; la transition1→2 est elle-même relativement forte à **0,512**. Ces valeurs n’évaluent ni l’anatomie ni la qualité artistique : elles confirment seulement qu’un arrêt sur image n’a pas été glissé à la fin et repèrent un raccord à examiner. Le passage d’une pose plus comprimée à une foulée plus haute reste visible.

**Recommandation : garder cette course comme boucle draft utile, en signalant le raccord à lisser lors de la revue humaine.** Ne pas promettre une boucle parfaitement raccordée et ne pas corriger le bob du corps en normalisant chaque frame.

Rapports : `batch-04-qa.json`, `run-forward-loop-diagnostic.json`.
