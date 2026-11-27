# ADR-0001 · Rendu isométrique et salle de développement de The Isles

Proposition d'origine du 23 novembre 2026, [PR #193](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/193). Les choix de périmètre sont repris dans le [prototype V1](../campagne/ISLES_PROTOTYPE_V1_20261123.md).

## Rendu du mode

Le mode natif emploie `three` 0.186.1 et une caméra orthographique. Il charge ses propres scènes, données de terrain et réducteurs de mouvement à l'ouverture depuis le menu. Les tuiles du terrain sont regroupées en zones de 32 × 32 et les volumes répétés sont instanciés. Les scènes d'essai restent distinctes du Canvas 2D de la campagne et de ses sauvegardes. Les contraintes de caméra, de mouvement et d'occlusion sont vérifiées sur les cartes du prototype.

## Salle locale

`app/game/isles/islesRoomV1.ts` arbitre les places, la distance et la hauteur des déplacements, le délai des frappes et la prise commune. Le transport de recette constitue un script Node facultatif, `scripts/serve-isles-room-v1.mjs`. Son écoute et ses clients sont limités à la boucle locale. Le serveur borne les connexions, les tailles et cadences des messages et vérifie l'origine d'un navigateur. `app/game/isles/islesNetClientV1.ts` reste le client de référence avec interpolation, hors du menu.

Le modèle transporte des propositions de position et ne simule pas entièrement le mouvement dans le relief côté serveur. Un service pour joueurs distants dépend d'une identité de session, d'une autorisation d'accès, d'une validation du déplacement au niveau des collisions, et d'un transport de production exploitable avec ses propres tests.

Les tests du mode solo et de la salle locale sont indépendants. Les résultats Chromium avec SwiftShader servent de recette visuelle et de commandes.
