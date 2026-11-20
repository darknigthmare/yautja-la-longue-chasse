# Revue indépendante — lot de six feuilles

Statut : **draft, revue artistique humaine requise**. Inspection visuelle des originaux et mesure en lecture seule ; aucune retouche, aucun nouveau statut runtime et aucun test de gameplay revendiqué.

## Grille et détourage

Les six originaux sont des PNG RGBA de **1254 × 1254**, avec un fond transparent réel. La grille d’export suit `Math.round` : bornes **0, 314, 627, 941, 1254** sur les deux axes. Les cellules mesurent donc successivement **314, 313, 314 et 313 pixels**. Une division entière uniforme de la planche serait incorrecte.

Les **96 cellules** conservent une marge au seuil **alpha ≥ 16** ; aucune silhouette de corps, casque, pied ou lame ne rejoint un bord. Le seuil runtime plus strict `alpha > 2` détecte du bruit dans quelques cellules ; ces constats restent distincts de la coupure d’un corps.

| Feuille | Marge visible minimale gauche / haut / droite / bas, alpha ≥ 16 | Contact de bord alpha > 2 |
| --- | --- | --- |
| `light_1` | 57 / 14 / 25 / 8 px | Bas des cellules 13–16 |
| `light_2` | 69 / 15 / 32 / 15 px | Aucun |
| `parry` | 79 / 19 / 47 / 14 px | Aucun |
| `combo_finisher_a` | 41 / 34 / 13 / 8 px | Bas des cellules 13 et 16 |
| `heavy_strike_a` | 63 / 6 / 67 / 19 px | Aucun |
| `air_strike_a` | 46 / 8 / 37 / 21 px | Aucun |

La garde transparente de l’atlas d’import peut entourer les originaux sans effacer leurs pixels. Elle ne transforme pas ces images en art validé, et ne doit pas masquer la présence du bruit de faible alpha dans les rapports.

## Lisibilité des actions

- **Light 1** : une frappe compacte vers l’avant est lisible, avec armé, extension puis retour. Les bras restent rattachés et les pointes ne quittent pas la cellule. La pose finale reste légèrement différente du départ : ne pas la présenter comme un raccord parfaitement certifié.
- **Light 2** : trajectoire ascendante distincte, depuis l’avant-bras bas vers une extension haute. Les dernières cellules 13–16 sont des variations de retour en garde très proches ; elles comptent comme dessins source reçus, pas comme quatre nouveaux gestes.
- **Parry** : les avant-bras se lèvent devant la tête, la silhouette se comprime à l’impact et revient en garde. La pose se lit comme une défense et ne crée pas d’arme tenue supplémentaire. Le timing visuel ne doit pas retarder l’activation immédiate de la parade mécanique.
- **Combo finisher A** : armé large puis rotation du torse et extension vers la droite. La cellule 16 termine bien en contact/follow-through, avec les deux pieds au sol. La future partie B devra reprendre cette pose et retrouver la garde ; A seule n’est pas l’action complète.
- **Heavy strike A** : la montée du gantelet au-dessus du casque, le sommet de l’armé puis la descente de la lame sont lisibles. La marge supérieure minimale de 6 px reste réelle, mais les futurs cadrages doivent conserver ce dégagement. La fin est basse et engagée ; la récupération doit venir de B.
- **Air strike A** : jambes repliées et pieds sans appui dans toutes les cellules, dreads vers le haut/arrière, armé puis frappe descendante. Aucun départ du sol ou contact au sol n’a été ajouté. Conserver son référentiel de bassin ; une stabilisation par les pieds serait incorrecte.

L’inspection vérifie une continuité lisible à la résolution de la planche ; elle ne remplace pas une approbation anatomique humaine ni une lecture animée en situation réelle.

## Appuis et conseil de placement

La mesure candidate utilise le seuil **alpha ≥ 128** et les **8 dernières rangées** visibles pour repérer deux silhouettes d’appui. Les chiffres sont des repères de lecture, pas des pivots à appliquer aveuglément.

| Feuille au sol | Variation du milieu des appuis | Variation d’écartement | Variation du sol |
| --- | ---: | ---: | ---: |
| `light_1` | 1,526 px | 6,341 px | 0 px |
| `light_2` | 2,435 px | 5,472 px | 1 px |
| `parry` | 1,393 px | 1,355 px | 1 px |
| `combo_finisher_a` | 7,105 px | 36,195 px | 1 px |
| `heavy_strike_a` | 11,011 px | 20,516 px | 2 px |

Aucune translation corrective par frame n’est nécessaire pour les deux légères ou la parade : le déplacement mesuré est inférieur à 2,5 px et ne présente pas le glissement commun important du vieux pack.

Pour le finisher, le pied arrière passe approximativement de x120 à x96 tandis que le pied avant passe de x205 à x217. Pour la lourde, le pied arrière passe de x101 à x80 et le pied avant reste vers x209. Le changement du milieu vient donc principalement de **l’élargissement de la stance**, pas d’un déplacement commun des deux appuis. Recentrer chaque frame sur ce milieu déplacerait artificiellement le pied avant. Recommandation : garder le root fixé par la source et préserver ce pas/changement d’appui ; revoir les raccords A/B lorsque leurs parties B seront disponibles.

Pour les actions aériennes, esquives et locomotions, aucune stabilisation automatique par le bas de la silhouette n’est recommandée. Le déplacement et la compression dessinés doivent rester visibles.

## Mesure reproductible

`batch-01-qa.json` contient les dimensions, SHA source, rectangles, bornes alpha, marges, contacts de bord et candidats d’appui par frame. La clé `thresholds.15` correspond exactement à **alpha ≥16** ; `thresholds.16` conserve aussi l’ancienne mesure **alpha >16** pour comparaison. `measure_batch.py` relit le registre de génération sans modifier les images.
