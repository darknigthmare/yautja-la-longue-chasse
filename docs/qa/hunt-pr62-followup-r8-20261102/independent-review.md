# Revue indépendante PR62 : deux correctifs chasse

Aucun défaut concret ni blocage trouvé dans les cinq fichiers. Revue en lecture seule : aucun Git, aucune édition du dépôt, aucun test ni navigateur relancé.

Le menu donne la priorité à la carcasse portée valide, avec la portée native de 88 conservée et le repli habituel pour une identité absente ou invalide. Le HUD distingue cause et réponse demandée sans changer les réactions de l’écosystème. Les deux fichiers produit sont identiques aux copies amont épinglées.

Les empreintes des sources courantes, du HuntCanvas, des bundles exécutés, de la fixture et des six captures correspondent aux preuves. Les six images ont été ouvertes. Les résultats enregistrés comptent 20 cas carcasse et 72 mesures Canvas, sans erreur console/page HUD. Ils n’ont pas été réexécutés pour cette revue.

Limites correctement déclarées, sans demande de correction :

- `tests/hunt-carried-corpse-menu-v112.test.mjs:26` observe la persistance avec un compteur et une référence de stockage nulle. Le vrai callback et le menu SSR sont exercés, sans qualification d’une campagne montée ni du stockage réel.
- `tests/discovery-signals-hud-v112.test.mjs:31` couvre les axes publics de présentation ; les douze couples ne constituent pas douze rencontres réellement émises.
- `scripts/qa-discovery-hud-layout-v112.mjs:16` réduit un Canvas de 1280 px à 320 px : les caractères de 9/8 px deviennent 2,25/2 px CSS. Le texte observé est très petit ; la séparation géométrique est prouvée, la lecture humaine sur téléphone ne l’est pas. Cette limite figure explicitement à la ligne 59.

Aucun changement bloquant demandé. Les cinq empreintes et les six captures ouvertes figurent dans le JSON adjacent.
