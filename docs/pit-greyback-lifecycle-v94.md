# Greyback — intake natif V94

Ce lot conserve dix générations OpenAI en archives. **Aucune planche complète ni aucun cycle complet n’est admis**. Une revue ciblée retient seulement les six cellules regardant à droite de la première planche de victoire : `pitLifecycleGreybackV94.json` prépare ce clip partiel. Ce clip est raccordé au registre de combat ; sa victoire droite et l’absence de victoire gauche ont été vérifiées dans l’atelier desktop du build final local, sans validation d’une nouvelle manche entière, du mobile ou du déploiement public V94. Les sprites, clips et variantes historiques ne sont ni remplacés ni supprimés.

## Apparence et limites de fidélité

L’apparence de travail est la variante fournie `elder-greyback-avec-casque-eda4af4a7d`, dont le PNG est conservé sous `/game/sprites/v44/user-hunters/eda4af4a7d6b975b26301ca7cd00a1b0e8c913de6f22d012e0434caed46d5763.png`. Elle montre un masque doré aux lentilles rouges, des dreadlocks grises, des trophées, une épée tenue dans la main droite anatomique, une manchette brune au bras droit et un pistolet au ceinturon. La référence fournie ne constitue pas une certification du costume masqué dans le film.

[NECA distingue l’ancien de Predator 2 de Golden Angel plus jeune](https://necaonline.com/2018/02/predator-2-7-scale-action-figure-ultimate-elder-the-golden-angel/) et décrit le don du pistolet dans le film. Aucun don, tir, retrait de masque, changement d’âge, rang royal ou geste rituel prétendument canonique n’est ajouté ici. Les gestes demandés restent des adaptations de jeu. Aucune fidélité 1:1 n’est certifiée.

## Dix premières générations conservées

| Archive | Cible visuelle | Décision |
| --- | --- | --- |
| 01-idle-original.png | 16 dessins, 8 par orientation | Refus : séparation transparente native insuffisante |
| 02-dizzy-original.png | 16 dessins, 8 par orientation | Refus : séparation transparente native insuffisante |
| 03-intro-a-original.png | 12 dessins, 6 par orientation | Refus : épée disparaissant sur quatre poses gauche ; géométrie non isolante |
| 04-intro-b-original.png | 12 dessins, 6 par orientation | Refus : dernière cellule droite regardant à droite ; géométrie non isolante |
| 05-victory-a-original.png | 12 dessins, 6 par orientation | Admission partielle : six poses droite ; toutes les poses gauche exclues, épée absente sur une pose gauche et manchette incohérente |
| 06-victory-b-original.png | 12 dessins, 6 par orientation | Refus : séparation transparente native insuffisante |
| 07-defeat-a-original.png | 12 dessins, 6 par orientation | Refus : séparation transparente native insuffisante |
| 08-defeat-b-original.png | 12 dessins, 6 par orientation | Refus : épée absente sur les poses gauche ; géométrie non isolante |
| 09-taunt-a-original.png | 12 dessins, 6 par orientation | Refus : séparation transparente native insuffisante |
| 10-taunt-b-original.png | 12 dessins, 6 par orientation | Refus : séparation transparente native insuffisante |

La cible était 128 dessins répartis sur six familles ; ce nombre décrit le lot demandé et observé en contact sheet, **pas une couverture runtime**. Les formats sortis font 1024 × 1536 pixels. Les exigences de taille des miniatures et de gouttières n’ont pas été suivies suffisamment : passer de quatre colonnes à deux ne rend pas automatiquement les poses isolables. Un hash distinct prouve des pixels différents, pas une anatomie correcte ou une animation fluide.

Les fichiers originaux sont copiés byte-identiques dans `art-source/v94/pit/greyback/`. Le manifeste `intake.json` contient les dix SHA-256, la provenance, les décisions et les mesures. `prompts.json` conserve les dix prompts et les invariants. Les mesures lisent les canaux natifs sans crop, modification d’alpha, miroir, recoloration, nettoyage ou reconstitution d’arme. L’alternative `columns-first` autorise des hauteurs de fenêtres différentes entre orientations, mais n’accepte pas une limite contenant un dessin voisin. Aucun refus n’est contourné par un ajustement artificiel de grille.

La seule copie publique, `05-greyback-masked-victory-right-partial-v94.png`, conserve elle aussi tous les octets de l’original. Elle contient donc les six dessins gauche **exclus**, mais aucun frame du clip ne les référence : seules les colonnes source 0 et 1 sont admises. Les six poses droite conservent l’épée dans la main au bras brun, le pistolet au ceinturon, le masque, les trophées et la main gauche de salut. Les vraies fenêtres ont une alpha maximale de 0 ou 1 sur leurs limites, sous le seuil de bruit 2 du lecteur existant. L’échelle reste 478 pixels de corps pour cette page, sans ajustement par pose.

Le clip partiel de victoire à droite contient six dessins natifs × 20 ticks = 120 ticks / 2 000 ms. Il tient le dernier dessin et ne boucle pas. Ce salut ne prétend pas livrer les douze poses souhaitées, l’orientation gauche, la suite du geste ou les autres familles. Aucun miroir logiciel ni emprunt au costume historique par défaut ou à la variante sans masque ne complète ses manques.

## Temps prévus, non intégrés

- Idle et dizzy : 8 poses par orientation × 15 ticks = 120 ticks.
- Introduction : 12 poses par orientation × 6 ticks = 72 ticks, dans les 1 200 ms existantes.
- Victoire et défaite : 12 poses par orientation × 10 ticks = 120 ticks, dans les 2 000 ms de manche existantes ; la cérémonie de match garde le dernier dessin.
- Provocation : 12 poses par orientation alternant 7 et 8 ticks = 90 ticks ; le vrai runtime interrogera la durée d’un clip admis.

Il n’existe ici ni nouveau moteur, ni état de combat, ni récompense, ni modification de sauvegarde. Aucun cycle complet n’est annoncé. Trois tests spécifiques vérifient les dix fichiers PNG originaux, leurs SHA et canaux alpha, les mesures, les refus et la seule admission partielle. Ils décodent le vrai PNG avec le lecteur de production, résolvent et dessinent les six cellules successives, vérifient leur contact au sol et l’échelle constante, l’absence de miroir et d’écriture dans le combat, le maintien final et le mouvement réduit. Le lecteur ne trouve aucun clip gauche ni de provocation pour cette admission ; la preuve automatisée ne remplace pas une revue anatomique ni une partie réelle en navigateur.
