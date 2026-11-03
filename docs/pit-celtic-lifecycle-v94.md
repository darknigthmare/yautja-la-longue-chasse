# Celtic masqué — cycles natifs V94

Ce lot conserve dix originales OpenAI et importe huit planches, soit 93 dessins distincts dans douze clips. Il concerne uniquement l’apparence fournie `celtic-avec-casque-0764ed4b53`. Les autres costumes et combattants ne sont pas couverts par ce document.

| Famille | Dessins droite | Dessins gauche | Cible par face | Durée | État |
| --- | ---: | ---: | ---: | --- | --- |
| Attente | 8 | 8 | 8 | 120 ticks, boucle | Compte demandé atteint |
| Étourdissement | 8 | 8 | 8 | 120 ticks, boucle | Compte demandé atteint |
| Introduction | 12 | 12 | 12 | 72 ticks / 1 200 ms | Compte demandé atteint |
| Victoire | 6 | 5 | 12 | 120 ticks / 2 000 ms | Séquence partielle |
| Défaite de manche non létale | 6 | 3 | 12 | 120 ticks / 2 000 ms | Séquence partielle |
| Provocation | 8 | 9 | 12 | 90 ticks / 1 500 ms | Séquence partielle |

« Compte demandé atteint » indique des dessins natifs réellement distincts. Cela ne certifie ni une capture des mouvements du film, ni une animation parfaite. Aucun dessin répété, miroir, déplacement artificiel de membre ou interpolation n’ajoute une phase manquante.

## Référence et limites de fidélité

La référence inspectée est `public/game/sprites/v44/user-hunters/0764ed4b539cc40c2c3dc91cfca405f0e01ac7a528a3d3412da18552dbbccb4e.png`, conservée avec son SHA dans le manifeste. Elle fournit le masque argenté Celtic, les raccords cuivrés, les dreadlocks noirs cerclés, les épaulières superposées, le filet corporel, le collier, le tablier métallique, le canon d’épaule et les deux lames du poignet droit. Les mains, les attaches des armes et les orientations ont été revues sur chaque planche utilisée ; aucune omission grossière retenue n’a été justifiée par une occlusion supposée.

Le [contexte officiel NECA de la série AVP](https://store.necaonline.com/blogs/behind-the-scenes/172393927-closer-look-predators-series-14-action-figures-final) identifie Celtic parmi les personnages du film de 2004 et décrit des équipements propres aux personnages. Il ne prouve pas les gestes générés. Les animations sont des adaptations sobres : garde basse, déplacement d’entrée, relâchement après victoire, descente vivante sur un genou, invitation de la main vide. Aucun rite nommé, pouvoir, objet ou PNJ nouveau n’est présenté comme canon. La fidélité 1:1 n’est pas certifiée.

## Admissions et exclusions

Les dix PNG de `art-source/v94/pit/celtic/` sont préservés intégralement. Les fichiers `001-intake.json` à `010-intake.json` gardent les prompts réellement utilisés, la référence, les SHA, l’alpha natif et les décisions. Les prompts renforcés des pages 009/010 sont aussi sauvegardés dans leurs fichiers `*-used-prompt.txt`. Le générateur d’origine reste intact.

`lifecycle-admission.json` distingue 128 dessins demandés/originaux, 93 cellules admises et 35 exclusions :

- 005 : première rangée, quatrième colonne exclue, lames absentes ; les onze autres cellules forment une victoire partielle.
- 006 : les douze cellules restent en archive ; le plastron change trop pour prolonger la victoire 005 sans rupture de costume.
- 007 : les douze cellules restent en archive ; la quatrième colonne a le mauvais sens et des omissions de lames. Le raccord avec 008 repart debout après l’accroupissement.
- 008 : seule cette sous-séquence est utilisée pour la défaite vivante. Les trois cellules de la quatrième colonne, réellement tournées à droite, ne remplacent pas les poses gauches.
- 009 : les quatre cellules de la troisième rangée ne disposent pas de séparations transparentes natives sûres.
- 010 : les deux premières cellules de la première rangée et la dernière cellule de la troisième rangée ne disposent pas de séparations sûres.

Une planche publique partiellement admise conserve ses pixels d’origine, y compris ses cellules exclues. Seuls les rectangles explicitement admis entrent dans les clips. Les deux pages 006/007 ne sont pas importées. Aucun PNG n’est détouré, recadré, redimensionné, retouché, nettoyé ou supprimé.

## Géométrie, horloges et raccords

Les rectangles ne suivent pas une grille 384/512 px présumée : `measure-partial.mjs` cherche les véritables séparations transparentes et refuse les cellules impossibles à isoler. Il ne produit aucun pixel. Les bounds visibles, pivots des pieds, bords alpha, hash de cellule et hash de dessin figurent dans les mesures natives et le manifeste.

La stature est fixe pour toutes les poses d’une même page : 001=353, 002=358, 003=429, 004=411, 005=432, 008=449, 009=401, 010=393 px. Les deux pages d’introduction ont une même définition avec `bodyHeightPx=429` et `pageBodyHeightPx={A:429,B:411}`. La provocation conserve également ses deux références de page. Une pose accroupie n’est jamais agrandie pour atteindre la hauteur d’une pose debout.

L’introduction joue ses douze dessins par face à six ticks chacun, dans les 1 200 ms réels du moteur. Les séquences partielles de résultat occupent leurs 2 000 ms sans inventer les dessins exclus. La provocation garde 1 500 ms sur chaque face malgré leurs comptes différents. Attente et étourdissement seuls bouclent. Les changements de page utilisent les vrais dessins ; la défaite n’enchaîne pas la page A avec B, car ce raccord était incohérent.

## Vérification et intégration

Les définitions sont dans `app/game/data/pitLifecycleCelticV94.json`. Le parent ajoute cet ensemble au registre partagé ; ce chantier ne modifie ni le moteur, ni les sauvegardes, ni les autres catalogues. `tests/pit-celtic-lifecycle-v94.test.mjs` charge les vrais huit PNG à travers le décodeur, le resolver et l’adaptateur de dessin de production, puis vérifie les douze clips, chaque phase/côté, les pivots au sol, la stature fixe, les frontières temporelles entre A/B, les boucles et l’absence de mutation du combat.

Validation ciblée : cinq tests PASS, zéro échec ; lint ciblé PASS. Cette validation déterministe utilise les pixels natifs en mémoire. Elle ne remplace pas une revue du vrai navigateur, du personnage dans son stage et de la publication publique, prises en charge séparément par le parent.

SHA des données : `f000e99af2f9783073adc542150220b3d83e3625cc2161368c632a32d12004db`.

## Travail restant

Les cibles de douze dessins par face restent incomplètes pour la victoire, la défaite et la provocation. Une prochaine production doit garder le même costume et des orientations indépendantes en offrant davantage de largeur aux lames et aux mains. Une grille de deux colonnes avec moins de poses par page est plus fiable que quatre colonnes étroites ; augmenter le nombre de pages serait une modification explicite du lot, pas une complétion fictive de ces dix originales. Aucune génération supplémentaire n’est lancée dans ce lot.
