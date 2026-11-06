# Wolf — huit vues inspectées et calibration proposée

**Les huit candidats forment une famille Wolf reconnaissable, avec un moteur terminal unique et des silhouettes entières.** Les points ci-dessous sont destinés au raccord visuel ; ils ne constituent ni une approbation canonique 1:1 ni une activation runtime. Aucun pixel ou fichier source du dépôt n’a été modifié.

## Affectations définitives

La référence est `wolf-generation-jobs-final-candidates.json` (SHA-256 `870dcac4bb7523e689046b01fba14d7cca06a4c8e2d9993f85cfa65fc4a08c15`). Les huit copies dans candidates sont byte-identiques à leurs générations sources. La paire dorsale est permutée selon la revue approuvée : c29c507c devient shallow, c25ba19e devient deep. Les prompts et identifiants de génération originaux restent conservés.

L’ordre relatif des vues ventrales et des deux paires de lacet est cohérent visuellement. Les degrés des prompts ne sont pas des mesures 3D.

## Coordonnées natives 1536×1024

| Vue affectée | Nez | Arrière | Pivot calculé | Release dérivé, inactif |
| --- | --- | --- | --- | --- |
| forward-quarter-shallow | 1452.5, 543.75 | 172, 535 | 761.201, 522.076 | 722.872, 720.163 |
| forward-quarter | 1464.5, 518 | 84.5, 498 | 719.624, 488.935 | 676.68, 702.108 |
| bank-dorsal-shallow | 1471, 481.5 | 181.5, 548.5 | 773.839, 500.609 | 746.983, 702.276 |
| bank-dorsal | 1482, 504 | 181.5, 528 | 779.468, 499.745 | 745.635, 701.875 |
| bank-ventral-shallow | 1470, 501.75 | 209.5, 510.5 | 789.268, 489.79 | 754.228, 685.284 |
| bank-ventral | 1484.5, 505.5 | 205.5, 502.5 | 793.935, 486.951 | 756.54, 684.971 |
| rear-quarter-shallow | 1460.5, 491.5 | 252, 528 | 807.479, 495.212 | 778.238, 683.453 |
| rear-quarter | 1464.5, 494.75 | 298, 538.5 | 834.061, 502.933 | 807.156, 684.878 |

Le nez est le milieu entre les deux pointes extérieures avant retenues dans des bandes documentées. L’arrière est le centre de l’ouverture ambrée visible du moteur, conformément à la convention du profil Wolf ; ce n’est pas le bord extrême gauche de la silhouette. La tolérance sémantique de cette lecture est environ ±6 px au nez et ±8 px à l’arrière, portée à ±12 px pour la vue avant accentuée dont l’ouverture est presque occultée. Les décimales servent au calcul déterministe, sans prétendre à une certitude artistique subpixel.

Le pivot est calculé par similitude du segment arrière→nez, en conservant la position relative du centre (880.5,446.5) du profil 1761×893 à ses ancres existantes (1640,430)/(235,495). Le point release est seulement la transformation du point historique (850,666), pas une soute découverte dans ces images. Les largages et contacts actifs restent sur le profil. Aucune coordonnée n’a été pré-étirée ; la différence de canevas relève de la matrice de rendu étudiée par motion_logic.

## Identité et transparence

Chaque image conserve un seul grand réacteur à gauche, ses petites lampes de pourtour, la coque mécanique bronze/noir et la proue à lames courbes vers la droite. La vue arrière accentuée agrandit clairement la face moteur ; la vue avant accentuée la rend presque de profil. Les panneaux et certaines courbures de lames restent interprétés : cette série n’est pas une preuve de modèle 3D unique.

Les alpha sont contrôlés sur les fichiers entiers. Les silhouettes alpha>16 ne touchent aucun bord ; le maximum résiduel sur le bord est 1/255. Les six points de fond relevés sur chaque vue ont alpha≤1. Les RGB cachés ne sont pas assimilés à un fond opaque. Aucun détourage, recadrage, resize ou padding raster effectué.

**Aucun moteur VFX nouveau n’est approuvé.** Les points lumineux sont conservés dans le reçu pour la lecture géométrique ; les champs proposés restent exhaustVisibility=0 et exhaustReview=unreviewed.

Le JSON contient toutes les empreintes, l’origine réelle des affectations, les bandes de mesure, les composants lumineux, les échantillons RGBA et les limites. Le raccord et les doubles contours à mi-fondu restent à regarder dans le rendu natif après intégration des données.
