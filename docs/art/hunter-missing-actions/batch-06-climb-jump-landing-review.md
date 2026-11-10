# Lot 06 — descente, saut A et réception corrigés

**Statut : sources retenues en draft ; pas de validation artistique humaine ni de binding moteur.**

Les trois sources corrigées du registre ont été examinées visuellement en entier et mesurées sans aucune modification de pixels. `batch-06-qa.json` contient leurs SHA et leurs 48 cellules exactes. La grille est `[0, 314, 627, 941, 1254]` dans chaque axe, conformément à `Math.round`.

| Source | Corps au bord, alpha ≥16 | Bord faible, alpha >2 | Marges minimales gauche/haut/droite/bas, alpha ≥16 |
| --- | --- | --- | --- |
| `climb_down` | Aucun | Bas des cellules 13 et 16 | 96 / 9 / 69 / 2 px |
| `jump_a` | Aucun | Aucun | 52 / 4 / 35 / 7 px |
| `landing` | Aucun | Haut de 1 ; bas de 13–16 | 61 / 3 / 57 / 9 px |

Les trois images sont des PNG RGBA 1254 × 1254 avec transparence réelle. Les corrections natives ont rétracté les lames visibles dans les premières tentatives, tout en conservant les grandes étapes des gestes. Ces premières tentatives restent hors sélection, documentées dans `excluded-locomotion-attempts.json` ; leur exclusion ne prouve pas une amputation, car elles n'avaient pas de corps au bord au seuil alpha ≥16.

## Lecture des gestes

- **Descente :** changement de prise et de genou, allongement puis regroupement des jambes, main d'appui libre. Le tronc d'arbre n'est pas soudé au sprite. Les dernières poses préparent une reprise de prise ; la planche représente une descente distincte de la montée, sans employer sa lecture inversée. Les pieds sont entiers mais la marge basse substantielle ne descend qu'à 2 px. Conserver le padding d'import et faire la future mise au point de boucle avec le contact support du moteur. Aucune certification de boucle sans couture n'est donnée.
- **Saut A :** anticipation debout, compression, impulsion, montée et jambes repliées vers le sommet. Dreadlocks et bras accompagnent le mouvement. La silhouette reste entière et les lames rétractées. L'anticipation dessinée est une ressource de présentation : elle ne doit pas retarder l'impulsion déjà immédiate dans `applyPlayerJump`.
- **Réception :** approche du sol, flexion profonde, absorption puis retour debout. Le canon de la première cellule reste à 3 px du haut au seuil alpha ≥16. Son halo possède 45 pixels alpha >2 sur la bordure supérieure ; il faut le consigner, sans le décrire comme un canon réellement coupé. Les dernières poses sont des variations de récupération proches, pas quatre gestes supplémentaires.

Aucune translation de page, remise à l'échelle ou stabilisation par les pieds n'est recommandée pour ces gestes. Le moteur reste propriétaire du déplacement monde. La réception nécessite toujours un futur curseur de présentation interruptible, car le jeu ne possède actuellement pas de pose persistante `landing`.
