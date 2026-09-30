# V56 — recette THE PIT avec 198 identités

La recette complète `scripts/verify-pit-stage-selection-v55.mjs` passe sur le build V56 local à `http://127.0.0.1:4175` : **59 contrôles, 198 entrées parcourues dans le roster, 23 nouveaux aperçus, trois aperçus mobiles, six recommandations et huit duels réels** couvrant huit familles de composition. Les 195 associations du plan V55 restent historiques ; les trois identités V56 et leurs expositions originales portent la couverture courante à 198.

Les huit duels utilisent les vrais bitmaps masqués de City Hunter et Scar. La recette observe les deux introductions, le compte 3–2–1, les orientations natives, le contact alpha des pieds, le dézoom après recul par commandes réelles et la pause. Elle n’injecte ni positions, ni caméra, ni état moteur. Les deux banques d’images (aperçu et combat) sont également mises en échec volontairement pour vérifier l’interdiction de démarrer un décor incomplet, puis la reprise par les boutons de l’interface.

Le rapport final ne contient aucune erreur JavaScript, erreur HTTP ou requête d’écriture ; toutes les données localStorage restent identiques, octet pour octet. Les contextes utilisent une sauvegarde synthétique locale, sans profil navigateur ni sauvegarde personnelle.

Une première passe avait échoué au chargement de l’arène 153 après cinq duels réussis, pendant une forte charge de copie et compilation sur l’hôte. Son `failure.json` et sa capture restent dans `work-local/v56/stage-selection-browser-qa/`. La seconde passe complète, dans `work-local/v56/stage-selection-browser-qa-final/`, réussit sans changement de code ni allongement de délai. La charge simultanée est un contexte constaté, pas une cause formellement démontrée.

**50 captures ont été réellement ouvertes et inspectées** : les 23 aperçus et trois vues mobiles de la première passe, puis 16 vues de combat (proche/large), six recommandations et deux vues d’échec volontaire de la passe finale. Les sols terre, glace et métal corrigés restent continus ; les combattants se font face et gardent leur appui. Les rapports conservent chaque nom de fichier, sa passe et son SHA-256, sans attribuer une inspection aux autres captures.

Preuves durables : `docs/v56-stage-browser-qa.json` et `docs/v56-stage-browser-visual-review.json`. Les trois nouveaux profils ont leur recette séparée : `docs/v56-original-fighters-browser-qa.json` et `docs/v56-original-fighters-browser-visual-review.json`.

Ces résultats ne signifient pas que 198 combats complets ont été joués, ni que les 23 stages ont tous une foule animée ou une fidélité géométrique 1:1. L’essai mobile est une émulation Chromium 844 × 390. Certaines miniatures de grille apparaissent encore en cours de chargement dans les captures immédiates de recommandations ; l’aperçu sélectionné est prêt, et l’achèvement des miniatures visibles est contrôlé séparément sur les 23 aperçus desktop. La publication et la recette de production restent des étapes distinctes.
