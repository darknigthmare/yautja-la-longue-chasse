# Mesure candidate des prises de canopée

**Compte rendu historique de la mesure candidate : elle n’a modifié aucun pivot, PNG ou lecteur.** Le reçu `grip_anchor_candidates.json` lie chaque tableau de valeurs au SHA-256 exact de sa planche source.

## Méthode

Les poings constituent les deux éléments opaques les plus hauts pendant le maintien et le balancement. Pour chaque cellule source réelle, le contrôle prend les pixels alpha ≥128 dans les douze premières rangées occupées. Il extrait les composantes connexes à huit voisins d’au moins huit pixels. Les deux composantes sont séparées, puis leurs centroïdes sont moyennés sans pondération par l’aire. Les coordonnées utilisent le centre des pixels (`indice + 0,5`).

Ce point est un **proxy graphique du milieu des deux dessus de poings**, pas une mesure anatomique certifiée, ni le contact réel avec un objet. La méthode ne tente pas de suivre l’accrochage avant la pose finale ou le lâcher après la pose initiale : le casque ou les doigts ouverts deviendraient les régions les plus hautes et invalideraient l’hypothèse.

L’algorithme trouve deux composantes distinctes pour les seize images du maintien, les seize du balancement, l’accrochage 16 et le lâcher 01. Des bandes de dix et quatorze pixels, puis des seuils alpha de 96 et 160, conservent deux composantes et déplacent le milieu de moins de 1,17 px par rapport au candidat. Une bande de seize pixels fusionne ponctuellement les poings du balancement ; elle n’est pas retenue.

Les quatre échantillons superposés ont été inspectés dans `grip-candidate-samples.png` : maintien 01 et 08, balancement 04 et 11. Les rectangles cyan couvrent les dessus des deux poings, la croix jaune leur milieu. Les cadres et croix sont seulement des annotations du composite de revue.

## Valeurs observées

| Page | Variation X du milieu | Variation Y du milieu | Écart horizontal entre poings |
| --- | ---: | ---: | ---: |
| Maintien, 16 images | 3,75 px | 5,98 px | 46,07–48,41 px |
| Balancement, 16 images | 29,74 px | 3,87 px | 33,43–36,19 px |

Le reçu propose un pivot par image pour le maintien et le balancement, un pivot constant provenant de l’image 16 pour l’accrochage, et un pivot constant provenant de l’image 01 pour le lâcher. Une telle translation conserve les pixels et le mouvement relatif des jambes ; l’étendue horizontale du proxy des pieds par rapport à la prise reste de 17,71 px dans le maintien et de 181,98 px dans le balancement.

## Ce que le candidat ne corrige pas

Les poings sont moins espacés dans le balancement que dans le maintien. Aligner leur milieu ne peut pas faire coïncider simultanément les deux mains, ni réparer des variations de volume, d’échelle ou de pose. Une future implémentation doit encore adapter la phase au pendule réel et choisir les contacts selon le support. Le candidat ne constitue aucun binding au gameplay et ne supprime pas la réserve sur les raccords entre gestes.

Le script `measure_grip_candidates.py` lit seulement les images et écrit ce reçu ; il ne touche pas aux assets. Toute application ultérieure doit contrôler les SHA, définir un point de présentation commun, ajouter les gardes d’import aux pivots et vérifier le rendu obtenu séparément.

## Application ultérieure vérifiée

Après cette mesure, le responsable de la tâche a autorisé le recalage dans les métadonnées de présentation. Le [contrôle indépendant final](FINAL_VERIFICATION.md) confirme les 64 pivots, les sources et exports inchangés, les gardes d’import et la conservation exacte du mouvement relatif des pieds. Le candidat initial reste immuable et conserve son statut historique ; il ne doit pas être confondu avec le reçu d’application.
