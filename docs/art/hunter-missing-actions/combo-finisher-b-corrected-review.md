# Finisher — seconde partie B corrigée

Source : `exec-f241a6ad-de73-481e-b2e2-7ea8e6e2bcdd.png`.

**Décision de revue : source suffisamment améliorée pour le lot draft ; pas de nouvelle régénération recommandée.** Cette décision ne vaut pas approbation artistique humaine ni validation runtime. La première tentative et son rapport restent conservés.

L’image reprend le contact, replie progressivement le bras et remonte vers la garde. Le gabarit de la tête et du torse est visuellement proche de la référence A ; la différence résiduelle se lit principalement comme une modification de pose et un déplacement commun de page.

| Mesure alpha ≥128 | A16 | B01 corrigé |
| --- | ---: | ---: |
| Enveloppe visible | 223 × 223 px | 220 × 229 px |
| Largeur du pied arrière dans les 8 rangées d’appui | 45 px | 46 px |
| Surface de cet appui | 319 px | 310 px |
| Largeur de l’appui avant | 53 px | 66 px |
| Milieu des deux appuis | 156,41 px | 135,55 px |
| Écartement des deux appuis | 120,44 px | 116,09 px |
| Sol | y303 | y299 |

La largeur de l’appui arrière pratiquement inchangée soutient l’absence de grossissement global important. Le pied avant est davantage ouvert, ce qui accroît la largeur de sa silhouette sans autoriser une conclusion automatique de changement d’échelle. Le torse commence à se redresser : la hauteur d’enveloppe augmente de 6 px, et cette variation ne doit pas être aplatie en redimensionnant chaque frame.

## Calibration proposée

Un **décalage de rendu constant de toute la page B de +20,86 px en X et +4 px en Y**, calculé sur les appuis du raccord, rapproche le centre des deux pieds. L’écart résiduel de chaque appui est d’environ ±2,17 px ; il correspond au léger changement d’écartement. Cette proposition ajuste seulement l’origine de page. Elle ne modifie aucun pixel, ne change pas l’échelle, ne recentre pas les images individuellement et conserve le pas de récupération.

Si le pipeline exprime ce déplacement par les pivots, tenir compte du signe : déplacer l’image de `(+dx,+dy)` à ancre fixe revient à soustraire `(dx,dy)` au pivot utilisé pour le rendu. Le schéma et son export doivent garder une seule convention claire ; ce rapport ne modifie aucun manifeste.

La planche entière présente **zéro cellule touchant un bord au seuil alpha ≥16**, et également **zéro bord au seuil alpha >2**. Les pieds, lames et casque restent complets.

Détails : `combo-finisher-b-corrected-qa.json`.
