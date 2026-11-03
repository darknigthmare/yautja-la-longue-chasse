# Relecture visuelle des intérieurs V76

Les **neuf captures ci-dessous ont été effectivement ouvertes et inspectées**, le 2 octobre 2026, après le parcours navigateur local compilé. Rapport : `work-local/v76/qa/interior-decor-local/report.json`, version attendue V76, URL réellement enregistrée `http://127.0.0.1:4194`. Il indique **14 contrôles réussis, 9 captures et aucune erreur, défaillance ou erreur de console**. Ce document décrit une validation locale ; il ne confirme pas encore le déploiement public.

## Captures vues

Toutes se trouvent dans `work-local/v76/qa/interior-decor-local/`.

| Capture | Observation visuelle |
| --- | --- |
| `dock-shelf-real-keyboard-collision.png` | Le jeune fait face au rayonnage latéral droit. Les pieds du rayonnage reposent sur le dallage ; le jeune reste devant son bord gauche et ne pénètre pas dans les étagères. Le rapport confirme un déplacement réel de X438 à X454, arrêté devant le support commençant à X478,229 avec la demi-largeur du corps de 24 unités. Le même endroit était praticable sans ce nouveau meuble. |
| `dock-control-native-oriented-decor.png` | Quatre ajouts lisibles : banc incliné à l’arrière, table de travail en orientation opposée, coffre diagonal à droite et rayonnage latéral. Les deux fonctions du bureau de convoi restent distinctes ; l’officier et l’objet de preuve historiques sont conservés. Le passage au centre et le seuil sud ne sont pas occupés par les nouveaux meubles. |
| `convoy-workshop-native-oriented-decor.png` | Les deux établis historiques identifient la maintenance ; le nouveau coffre diagonal et le rangement droit complètent la préparation du convoi. La zone centrale reste libre et ne reçoit pas un troisième établi redondant. Les caisses et le porte-parures existants restent présents. |
| `residence-port-1-native-oriented-decor.png` | Petite maison : un seul nouveau rayonnage, à gauche, s’ajoute au repos, aux parures et aux contenants existants. La pièce n’est pas surchargée ; la cloison, son passage et la sortie restent lisibles. L’échelle réduite du rayonnage correspond au logement. |
| `residence-port-2-native-oriented-decor.png` | Maison commune : le banc diagonal et le rayonnage différencient le repos et le rangement, sans outils d’atelier ajoutés au repas. Les supports peints sont visibles sur le sol et l’allée devant le jeune reste dégagée. |
| `market-armory-native-oriented-decor.png` | L’artisane, son comptoir et les modules historiques distinguent l’équipement. Le banc d’attente, le rangement latéral et la nouvelle table de travail droite occupent des emplacements indépendants. Le passage central vers le comptoir, la halle et la sortie ne sont pas couverts par un nouveau volume. |
| `memory-vault-native-oriented-decor.png` | Les archives conservent l’archiviste et la console. Deux rayonnages latéraux, un coffre fermé et un banc diagonal densifient le rangement et la consultation. Aucun établi à étau n’est ajouté aux archives. Les matières bronze sombre et basalte s’accordent au kit antérieur. |
| `memory-vault-portrait-native-oriented-decor.png` | À393×852, la caméra recadre les bords de la pièce ; ce n’est pas un débordement horizontal de la page. Le jeune, le banc central, l’ouverture intérieure et le seuil « Vers la cité » restent visibles. Les commandes tactiles et le journal restent séparés du joueur. Les meubles périphériques ne sont pas tous simultanément dans le cadre. |
| `portrait-pause-oriented-decor.png` | L’overlay de pause couvre et atténue correctement la scène, avec un bouton de reprise lisible. Les commandes de déplacement sont séparées de l’overlay. Le rapport vérifie le gel, le retour du focus et la sortie physique après reprise ; une image seule ne démontrerait pas ces comportements. |

## Résultat et portée

Aucun défaut visuel bloquant des nouveaux meubles n’a été constaté sur ces captures. Le banc, la table, le rayonnage et le coffre ont des orientations peintes distinctes, conservées sans rotation ou miroir CSS. Leurs appuis restent au sol et leurs dimensions sont plausibles autour du jeune et des adultes : bancs bas, table de maintenance et rayonnages plus hauts. Les cloisons et les grands murs restent ceux du kit existant ; leur hauteur n’est pas écrasée avec le dallage.

La densité distingue la préparation du convoi, la maintenance, le logement, le comptoir et les archives, tout en gardant des allées. Le parcours au clavier a réellement visité les six lieux montrés, leurs espaces, leurs passages et leurs interactions existantes. Les 43 intérieurs sont vérifiés séparément par le modèle avec quatre unités de marge corporelle ; **ce document ne prétend pas avoir inspecté visuellement les 43 pièces**.

Les quatre nouveaux accessoires sont du mobilier civil original du clan du jeu. Ils n’accordent ni arme, trophée, rang, soin ou récompense. Leurs matières et leur fonction sont compatibles avec les décors existants, mais ne constituent pas la reproduction 1:1 d’un meuble ou d’une architecture officielle. Les objets et armes historiques visibles ne sont pas requalifiés par cette relecture.

## Limites visuelles restantes

- Les petites pièces sont centrées avec de larges marges sombres dans le viewport desktop. Ce cadrage préserve l’échelle du personnage et la géométrie, mais laisse une partie notable de l’écran peu habillée.
- En portrait, les instructions de lieu recouvrent le haut du mur. Elles restent lisibles dans cette capture, mais un habillage ou un placement plus réservé pourrait améliorer leur contraste selon le fond.
- Le même kit de panneaux et de sol se répète entre les bâtiments. Le mobilier et les fonctions différencient les pièces ; ce lot ne fournit pas 43 décors architecturaux entièrement uniques ni un éclairage propre à chaque bâtiment.
- Une capture fixe ne valide pas toutes les orientations animées, tous les angles d’occlusion, toutes les positions du joueur ou les performances d’un téléphone réel. Le portrait est une émulation Chrome avec mouvement réduit, non un essai sur appareil physique.
- Les pixels alpha générés restent intacts. Les volumes de support conservateurs sont des mesures 2D, pas une reconstruction 3D calibrée.

Aucun runtime n’a été modifié à l’issue de cette relecture. La publication et les parcours publics doivent être confirmés séparément.

Après cette relecture, la régression complète a révélé un ancien meuble isolé dans **The Pit**, pièce absente des neuf captures ci-dessus. Seul le nouveau rayonnage de cette pièce a été réimplanté ; les six lieux photographiés gardent leurs placements. Les tests d’approche ancienne sont renforcés et les trois suites d’intérieurs passent132/132. Les captures de ce document restent une preuve de la première passe locale, non la preuve d’un nouveau build. Le prochain parcours doit également jouer et photographier The Pit corrigé. Le meuble d’archive `memory-vault-v72-role-east` reste à sa distance préexistante de78unités, recalculée sansV76et strictement conservée ; aucune fausse approche<60n’est revendiquée pour lui.
