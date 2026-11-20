# Lot 07 — continuation du saut et raccords de réception

**Statut : `jump_b` retenu en draft ; aucune nouvelle calibration.**

Source : `exec-f08d1fe4-1831-4aaa-96da-cd5af7b70a8f.png`. L'empreinte et les 16 cellules sont consignées dans `batch-07-qa.json`. La source est RGBA 1254 × 1254 avec transparence réelle ; grille exacte `[0, 314, 627, 941, 1254]`.

## Corps et geste

Aucune cellule ne touche une bordure à alpha ≥16. Les marges minimales gauche/haut/droite/bas à ce seuil sont **52 / 18 / 39 / 6 px**. Les cellules 13, 14 et 15 possèdent seulement des pixels de bord faible alpha >2 en bas, respectivement 5, 16 et 16. Lames rétractées, mains et pieds complets. Le passage des jambes repliées à leur déploiement, puis à l'attitude préparant le contact, se lit sur toute la planche. Les dreadlocks poursuivent leur mouvement secondaire et ne doivent pas servir à normaliser la hauteur corporelle.

## Raccords examinés

`jump-endpoint-diagnostic.json` donne les mesures natives sans correction. Les dimensions de silhouettes incluent les bras, les dreadlocks et le déploiement des jambes ; elles ne constituent pas des mesures isolées de tête ou de torse.

| Raccord | Silhouette alpha ≥16 avant → après | Centre de silhouette alpha ≥128 avant → après |
| --- | --- | --- |
| Saut A16 → B01 | 147 × 212 → 199 × 230 px | (158,59 ; 107,57) → (163,10 ; 136,86) |
| Saut B16 → réception 01 | 184 × 280 → 194 × 296 px | (159,99 ; 152,82) → (152,17 ; 136,29) |

La tête, les épaules et le torse gardent une lecture compatible, sans inflation anatomique sévère comparable aux premières parties B de combat exclues. Les silhouettes ne sont toutefois pas identiques : les bras se rouvrent au raccord A/B, l'orientation de la tête et le tombé des dreadlocks varient, puis la première réception présente un corps plus redressé et un canon plus haut. La position verticale varie également entre pages. **Ces raccords restent des raccords draft à affiner ; aucune continuité parfaite n'est revendiquée.**

Une translation fondée sur le sol ou le bas des pieds serait incorrecte pour cette phase aérienne. Aucun alignement automatique, aucune remise à l'échelle et aucune nouvelle translation de page ne sont proposés. La simulation doit garder la trajectoire réelle ; la future sélection doit suivre montée/chute et collision, plutôt que forcer chaque dessin à durer une durée mécanique identique. La première pose de réception doit être choisie en fonction du contact effectif et de son futur curseur interruptible.

Ces contrôles n'ont révélé aucun défaut grave supplémentaire imposant une nouvelle génération pour cette livraison de sources draft.
