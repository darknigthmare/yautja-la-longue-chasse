# Frontière de récupération du whiff · diagnostic R6

Identité de l’application : `0f79d3d8eac494cec4c418ac5b2f867929850bb7`, build `vxOXqmuKalwQbkLqTZnwN`, gel de 1 608 entrées SHA256 `c53ebc858df672268d6c59ae37cb5ddae67cd39fe73ba86682c6cd8c7a586cfe`. Aucun fichier app ou artistique n’est modifié par cette analyse.

## Tentative canonique conservée

`failed-complete/` conserve le brut original compressé, le log et la capture d’échec réellement ouverte. Résultat **FAIL**, cinq contrôles produits dont un refus et aucune capture canonique de parcours. Le premier appui démarre correctement TH_B en frame 4. Le polling voit encore la récupération en frame 48/action44, puis le corps idle en frame51. L’observateur refuse donc son propre dépassement de la borne de lecture≤46 ; ce résultat n’est ni promu ni réécrit. Les 1 608 entrées observées restent identiques et les quatre tableaux d’erreurs sont vides.

## Candidat testé hors recette canonique

Le candidat avance la clock par 1 ms uniquement sur les trois dernières frames source, au lieu de 17 ms. Il conserve 180 lectures maximum, la récupération observée≤46, le démarrage réel, la cohérence des phases/actionFrames, le refus de capture ou dégâts et toutes les vérifications de trajectoires et dessins. Aucun état de combat, frame manquante ou second appui n’est fabriqué.

`two-whiffs-diagnostic/` contient une passe ciblée des deux pairings : 13 contrôles, zéro capture, récupération à45frames dans les deux cas. `complete-cadence-diagnostic/` contient ensuite les deux rencontres entièrement exercées : 127 contrôles, 39 PNG candidats, quatre projections/tech/mur par rencontre, 48 dessins natifs observés dans chaque rencontre, et une vraie victoire/export/relecture pour FeralScar. Les deux whiffs sont observés à45frames, avec 77 et68lectures. Les quatre tableaux d’erreurs sont vides et toutes les entrées gelées restent identiques.

Ces deux résultats sont explicitement `PASS_DIAGNOSTIC_NOT_PUBLISHABLE`, domaines distincts du domaine canonique `Pit`, avec `completeRecipe: false`. Les outils candidats hors commit sont archivés avec leurs vrais imports absolus d’exécution ; leur présence ici constitue une archive de source, pas une commande portable garantie. Les 39 PNG restent des candidats diagnostiques, sans nouvelle affirmation de revue visuelle complète ou d’admission artistique. Aucun partenaire, variante, finisher ou kit complet n’est clôturé.

`diagnostic-sources/` garde les deux copies exécutées, les sept tests de la véritable routine avec une clock de modèle accumulée à60Hz, leur log, les sources canoniques R6 utilisées et le patch proposé. Les six scénarios de refus/réussite historiques restent vérifiés ; le septième impose le pas plus fin uniquement sur les trois dernières frames. Un nouveau gel/build et de nouvelles recettes complètes sont nécessaires après intégration canonique.

L’index `entry.json` décrit les empreintes de chaque fichier. Tous les bruts et PNG conservent leurs octets d’origine.
