# Yautja : animations dessinées V27

Périmètre strict : Yautja connus, planches de sprites, recalage, transparence de lecture et horloges d'animation du PIT. Aucun décor, hub, niveau, système de dégâts ou replay modifié.

## Livraison réelle

Trois nouvelles sources PNG générées avec l'outil OpenAI intégré, soit dix-huit cellules : Wolf réagissant à un coup, Chopper en attente, Greyback démasqué en attente. Les prompts exacts sont conservés. Deux essais supplémentaires de contact de marche Jungle ont été écartés : l'alternance des jambes n'était pas respectée et le second perdait le canon. Leurs prompts sont archivés, pas leurs pixels dans le pack livré.

Deux sources V26 (Wolf garde haute et Feral bouclier) sont réutilisées sans modification. L'atelier V27 présente donc cinq séquences et trente cellules, dont douze déjà existantes. Ce n'est pas trente animations nouvelles. Aucun personnage n'est complet et aucun de ces cinq clips n'est validé pour le gameplay.

Les trente rectangles libres évitent les coupes arbitraires d'une grille. Le canon de Wolf, troisième pose de réaction, dépasse la cellule théorique mais pas la figure voisine : son rectangle contient toute l'arme. Les pivots correspondent aux appuis mesurés ; une seule échelle s'applique à toutes les poses d'une séquence, sans étirement ou ajustement automatique à la hauteur de chaque dessin.

Les PNG originaux sont RGB opaques à fond magenta, et non des fichiers à alpha réel. Le lecteur les masque dans un Canvas privé. L'option explicite connected-magenta réduit le liseré relié au fond sur deux pixels, sans diminuer l'opacité des pixels non clés. Elle conserve volontairement les couleurs violettes intérieures et les dreads fins ; elle ne répare pas l'anatomie. Le fichier source reste identique au SHA256 annoncé.

## Lecture et intégration

La page /game/assets/v27/sprite-review/index.html est accessible depuis /pit-lab. C'est une surface de revue explicitement marquée brouillon. Elle propose lecture ponctuelle, répétition, choix de pose, trois vitesses, comparaison avant/après recalage, superposition de la pose précédente, fonds clair/sombre/noir et source/clé simple/clé avec réduction du liseré. Elle n'inscrit aucun essai dans le registre de sprites validés du combat.

Le lecteur autonome outputs/known-yautja-v27/preview.html embarque les cinq sources pour une consultation hors ligne. La version publique utilise les mêmes PNG, vérifiés par empreinte, et un JavaScript séparé.

L'adaptateur pur app/game/hunterSpriteMotion.ts décrit les clips demandés par le vrai PIT : posture, orientation, phase, technique propre au combattant, projection réussie/ratée, gardes, réactions, sauts, marche relative à l'orientation, camouflage et effets concurrents. Les attaques utilisent action.frame et les durées réelles ; le léger Jungle garde ses phases 5/3/10 ticks, la projection 7/2/21. Le rendu n'allonge pas la phase active et ne modifie pas hitboxes ou dégâts.

Pour une intégration future, appeler describePitHunterSpriteMotion(fighter, state.frame, cursor), conserver son cursor à chaque observation même lorsque le dessin manque, puis resolvePitHunterSpriteFrame(atlas, motion). Réinitialiser ou rejouer le curseur lors d'un seek/recommencement. Les mouvements sans instant d'entrée dans le PIT utilisent ce curseur de présentation explicite, pas une horloge cachée. Une orientation, une phase ou un clip absent/non validé renvoie null ; aucun miroir ou rig n'est ajouté en secret. prepareHunterSpriteAtlasPage reste obligatoire avant dessin du clip validé.

## Contrôles réalisés

- Build vinext du jeu terminé.
- Typecheck global et ESLint ciblé réussis.
- 884 tests de régression réussis, dont 32 tests du lecteur et de l'adaptateur.
- Chrome réel : cinq séquences, trente cellules non vides, six empreintes de rendu distinctes par séquence, zéro pixel opaque au bord de chaque rectangle, échelle constante 0.95 dans l'atelier.
- Lecture ponctuelle, répétition, commandes de revue et largeur mobile 390 px vérifiées sans erreur JavaScript ni débordement horizontal.
- SHA des sources préservés et identiques aux copies de la page publique.

Une empreinte distincte n'est pas une preuve de fluidité. La respiration de Chopper et Greyback reste très discrète ; les canons de Wolf et la segmentation du bouclier de Feral demandent une revue à vitesse réelle avant validation. L'occultation normale d'un bras par un bouclier opaque n'est pas un membre absent. Les réserves figurent dans les fichiers de revue, sans prétention à une fidélité 1:1 certifiée.

La page doit encore être contrôlée sur l'URL effective après chaque déploiement ; les preuves de cette vérification sont produites dans outputs, sans assimiler un build local à une publication.

## Commandes

- npm run sprites:preview : reconstruit manifestes, page portable et page publique V27.
- npm run sprites:qa : vérifie inventaire V26, sources V26/V27, cadres et copies publiques, puis les 32 tests d'animation.
- npm run sprites:preview:v26 : conserve l'accès au lecteur des essais précédents.

## Références

Les sources primaires sous licence pour Chopper (Prime 1 Studio) et Greyback (NECA et Hot Toys) sont conservées dans art-source/v27/known-yautja/review.json. Le pistolet de Greyback est associé à Raphael Adolini 1715 ; aucun nouveau texte n'est dessiné. Les portraits du projet servent de référence de style et ne deviennent pas, par eux-mêmes, des preuves de fidélité canonique.

## Stockage local

C: s'étant rempli pendant cette passe, les dossiers outputs, art-source et public de cette seule tâche ont été déplacés sans perte sur D: et leurs chemins conservés par jonctions Windows. Les 159 fichiers d'exports, 1 199 fichiers source et 1 815 fichiers publics présents lors de chaque déplacement ont été comparés par SHA256 avant/après. Ces jonctions ne sont pas des modifications de contenu Git. Ne pas supprimer leurs cibles physiques en pensant retirer un simple cache.
