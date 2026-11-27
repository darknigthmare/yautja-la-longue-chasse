# Greyback sans masque — candidats de présentation

Ce dossier contient **cinq PNG générés réellement reçus** : quatre poses initiales et une correction distincte de la première pose. `reference-original.png` est une copie intacte du PNG fourni déjà présent dans le dépôt ; ce n’est pas une sixième génération.

**Aucun dessin ni clip n’est admis dans le jeu. Aucun statut de fidélité 1:1 n’est accordé.** Le laboratoire permet de comparer les images une à une, sans constituer une validation artistique.

## Référence exacte

- Combattant : `greyback`.
- Variante : `elder-greyback-sans-casque-7955bb66ac`.
- Source : `public/game/sprites/v44/user-hunters/7955bb66ac7c438237fe99e58f1be69c506cbaa475c60e220b9291358148ea04.png`.
- Provenance : manifeste `pitUserHuntersV44.json`, apparence fournie et étiquetée Elder Greyback / Lost Tribe. La page NECA citée dans ce manifeste a renvoyé HTTP 403 pendant cette session ; aucune nouvelle certification canon n’en est déduite.

## Revue artistique

Les quatre premières poses conservent les grandes catégories d’équipement, mais les lames de poignet du côté de l’épée sont plus courtes et moins déployées que sur la source. Le prompt demandait leur conservation : ce défaut ne peut donc pas être présenté comme une rétraction volontaire approuvée. Les proportions du pistolet au holster, les petits crânes, les anneaux, les contours du visage et les motifs d’armure restent à comparer précisément.

`preview-calm-01-right-equipment-v2.png` améliore visiblement les longues lames courbes et la longueur du pistolet. Cette révision est séparée ; la première image reste intacte. La correction ne constitue pas une validation des contours exacts ou des petits détails.

Le deuxième candidat abaisse la main davantage que le petit déplacement demandé. La quatrième pose présente aussi des variations de chaleur des reflets et de microdétails. Les sorties sont des dessins indépendants, pas une inversion de l’entrée.

## Mesures techniques

Les cinq images sont des PNG RGBA de 1024 × 1536. Toutes contiennent des pixels entièrement transparents, et l’alpha maximal sur leur bord extérieur vaut 1/255 : aucun pixel opaque n’y est coupé. Aucun recadrage, redimensionnement, recolorisation, miroir, réécriture d’alpha ou retouche Python n’a été appliqué.

Les mesures des pieds utilisent les pixels d’alpha supérieur à 127 dans la bande verticale 1380–1535. Elles constituent un repère d’affichage, pas un pivot anatomique validé.

| Image | Centre horizontal mesuré | Pixel opaque le plus bas | Largeur occupée de la bande des pieds |
|---|---:|---:|---:|
| Référence | 516 | 1507 | 1002 px |
| Aperçu 01 | 511 | 1509 | 820 px |
| Sélection 02 | 511 | 1510 | 820 px |
| Sortie 01 | 511 | 1510 | 820 px |
| Sortie 02 | 510,5 | 1511 | 823 px |
| Aperçu 01 corrigé | 511 | 1510 | 820 px |

Les boîtes des pieds des candidats diffèrent de trois pixels au maximum de celles du premier candidat. En revanche, leur empattement est environ 18 % plus étroit que sur la source. L’alignement entre candidats ne prouve donc pas une reproduction des proportions ou de la posture source.

## Refus consigné

La tentative de correction de la deuxième pose a été refusée par ImageGen : HTTP 400, `moderation_blocked`, stade `output`, catégorie `other`, identifiant `e1aeabc0-a62a-4ae5-940c-a39de21d5878`.

Aucun PNG de cette tentative n’a été reçu. Les corrections des deux sorties n’ont pas été tentées après ce refus. Aucun changement de formulation, modèle, outil ou route CLI n’a servi à le contourner.

Les prompts exacts, provenance, SHA-256, mesures et états de chaque tentative figurent dans `manifest.json` et `measurements.json`. `measure_readonly.py` recalcule les mesures sans modifier les PNG.
