# Historique V111 exécuté pendant V112

La capsule est épinglée au commit final V111 `def899ad07fea582053c5c204e4e578d8e0d7f9b`. Elle conserve seize fichiers V111 et leurs 125 assertions, plus le fichier original V90 et ses sept assertions d’écotones : 17 fichiers, 132 assertions au total. Le classeur reproduit compte 113 feuilles et son SHA256 reste `fa5ebf78a08c36b4a567246dfae41de535a8e36c7294ba33190e3e1e2ec9ad05`.

`original-v111-assertions-and-workbook.log` conserve la première passe complète V111 : 125 succès, aucun échec et aucune assertion sautée, puis reproduction du classeur. `capsule-reproduction.log` conserve sa reproduction initiale avec 3 200 sources privées et 1 218 fichiers partagés. Ces deux journaux restent à l’identique après l’ajout du fichier V90. La capsule étendue compte 3 201 sources et 1 219 fichiers partagés, dont l’atlas natif V75 contenant les six fenêtres matérielles V90. Ses groupes sont nommés séparément dans le manifeste et le résultat courant. Les 45 documents matérialisés et les 1 608 objets Git privés restent conservés en lecture seule : le recensement V111 lit le véritable arbre historique, indépendamment du `HEAD` courant.

Le fichier original `tests/homeworld-ecotones-v90.test.mjs` a le SHA256 `95b3f0da59550328dad9c4aab926de9462d2eb74b654f84791b7d7c617079c81`. Le wrapper courant n’exécute que ce fichier précis, vérifie ses sept résultats et ne certifie pas le nouveau renderer. `tests/homeworld-ecotones-v112.test.mjs` garde les sept critères actuels sur le provider V112 ; aucun échec V90 n’est effacé en retirant une assertion.

Les 790 images anciennes du recensement restent optionnelles selon la règle originale V111 : leurs identités de blobs sont comparées à cet arbre. Les pixels présents sont contrôlés en plus. Les quatre nouveaux dessins V111 et les autres entrées natives du gel restent obligatoires à l’octet près. Cette distinction évite de transformer la CI réduite en téléchargement de toutes les images historiques et ne certifie aucune qualité visuelle.

Le premier essai est conservé dans `initial-missing-hunt-manifest.log` : un JSON public de trophées n’était pas partagé, si bien que le bundle HuntCanvas n’atteignait pas ses 34 assertions. Le partage a été complété avec les 23 JSON publics originaux ; aucune assertion n’a été retirée, remplacée ou assouplie.

Cette recette certifie l’historique V111, **pas le runtime V112**. Les preuves du jeu courant sont publiées séparément.
