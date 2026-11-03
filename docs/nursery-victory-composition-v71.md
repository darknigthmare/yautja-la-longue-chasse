# Victoire du jeune — composition V71

Le duel reste celui du prologue existant : entraînement non létal entre deux Younglings, remporté réellement avant la révélation du village. La caméra dévoile l’arène au premier plan de `village.png` puis passe au ciel de `red-moon.png`. Cette composition est une adaptation originale du jeu, pas une carte officielle présentée comme canonique.

## Plans et éléments

| Élément | Source native conservée | Rôle et placement |
| --- | --- | --- |
| Village, squelette ancien et lune distante | `/game/prologue/v47/village.png`, 1672 × 941 | Décor original, caméra de 1,45 à 1 avec centre vertical de 0,61 à 0,50. |
| Jeune victorieux | `/game/prologue/v47/youngling-player-right.png`, clip `ready` | Sprite indépendant : pied à `(0,458 × largeur, 0,850 × hauteur)` dans le sable de l’arène. Les deux dessins natifs passent du geste initial au bras levé, puis maintiennent la pose. Main vide. |
| Rival vaincu | `/game/prologue/v47/youngling-rival-left.png`, dessin final du clip `ko` | Sprite indépendant couché, à `(0,544 × largeur, 0,862 × hauteur)` ; aucun mouvement de cadavre ni blessure létale ajoutés. |
| Ombres de contact | Rendu sous chaque sprite | Ancrage sur le même plan de sable, largeur tirée des pixels opaques de chaque cellule ; marge résiduelle inférieure à un pixel écran. |
| Titre devant la lune | `/game/prologue/v47/red-moon.png` | Ce plan ne montre plus l’arène : les deux sprites disparaissent avec le changement de plan. Aucun personnage suspendu dans le ciel. |

La hauteur debout de référence vaut 6,2 % de la hauteur du panorama. Toutes les coordonnées, dimensions et ombres passent par le même transform que le décor. Le personnage conserve donc ses pieds dans le sable pendant l’élargissement de la caméra ; il n’est pas une vignette fixe plaquée sur l’écran.

Le geste attend 36 ticks de scène pour rester lisible après le fondu, puis utilise les durées natives du clip : premier dessin 20 ticks, second maintenu. La défaite du joueur, le duel et le KO rapproché n’utilisent jamais cette composition. Le rival doit réellement être dans sa pose KO ; la normalisation existante interdit les checkpoints de victoire inventés.

## Persistance, pause et accessibilité

Cette modification ne change ni le simulateur du duel, ni ses dégâts, ni les reçus de campagne, ni les sauvegardes. Le rendu suit le temps de la scène sauvegardée. La pause gèle caméra et geste ; avec mouvements réduits, le plan large et la pose bras levé sont statiques, sans fondu. Aucun rang Blooded, vaisseau personnel ou objet de récompense n’est attribué.

Les huit images originales et les quarante clips V47 sont conservés. L’animation ajoutée à cette composition réemploie deux vrais dessins existants ; elle ne représente pas une nouvelle plaquette de nombreuses images.

## Vérification

45 tests ciblés sont passés : les 39 contrôles existants du prologue et de ses PNG, plus six nouveaux tests du rendu réel, des ancrages projetés, des dessins distincts, du KO, du gel de pause et des pieds alpha.

La recette `scripts/verify-nursery-victory-v71.mjs` est passée sur le build Next V71 local, le 2 octobre 2026 : campagne neuve, duel remporté au clavier, deux dessins de victoire capturés, pause vérifiée puis ouverture du checkpoint vraiment remporté sur mobile avec mouvements réduits. Les huit captures finales ont été inspectées, dont l’arène avec les deux combattants et la lune dans le même cadre. Aucun échec HTTP ni erreur JavaScript n’a été observé. Le rapport est conservé dans `docs/v71-nursery-local-qa.json`.

La première prise mobile avait capturé la toile de chargement avant le décodage des PNG. Ce diagnostic reste dans `work-local/v71/qa/nursery-before-mobile-ready`, avec statut `INCOMPLETE`. La recette finale attend explicitement les images décodées et vérifie des pixels de décor rendus avant de valider une capture. Cette correction concerne uniquement la QA, pas le simulateur ni les sauvegardes.

La même recette est passée en production le 2 octobre 2026 sur `https://yautja-la-longue-chasse.vercel.app`, au commit `e409775173407a2cb21f42bb57eebc947a7003a8` (déploiement `dpl_2hLyn51LArJ8tmJ1Tk9MfX34JuEa`). Les huit nouvelles captures publiques ont été inspectées : duel neuf gagné au clavier, premier dessin réellement figé au tick de victoire 9 sous le fondu du décor, bras levé, rival couché, pause, mobile avec mouvements réduits, plan arène et lune puis titre sans personnages flottants. Zéro erreur JavaScript et zéro réponse HTTP en échec. Le rapport signé par le SHA est `docs/v71-nursery-public-qa.json`.

La première tentative publique avait dépassé la courte fenêtre du premier dessin avant de mettre en pause ; son échec de timing QA est conservé dans `work-local/v71/qa/nursery-public-first-frame-window-diagnostic`. La recette corrigée observe les attributs réels du canvas puis active immédiatement le bouton visible « Pause et commandes ». Elle ne modifie ni horloge, ni état de combat, ni checkpoint et capture les vrais pixels publics figés.
