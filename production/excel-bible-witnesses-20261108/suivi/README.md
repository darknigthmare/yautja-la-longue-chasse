# Suivi complémentaire de l'audience C-37

[Yautja_Audience_C37_20261108.xlsx](Yautja_Audience_C37_20261108.xlsx) contient deux feuilles.

- **Audience** : 12 critères dérivés d'OPS-B03 et d'OPS-Q26, six phases de qualification, preuves et vérification restante. Les colonnes jaunes sont les entrées modifiables ; la qualification et les compteurs sont calculés.
- **Sources** : 13 références de critères, suivis précédents et preuves courantes, puis l'index des 108 classeurs d'origine, avec chemin, taille et SHA-256.

Les résultats de logique et de structure React SSR restent distincts de l'exécution du jeu. Le rapport runtime figé indique **448 tests réussis, zéro échec, build et lint réussis**. Le classeur comporte **10 critères avec logique testée**, **6 avec rendu SSR attesté**, **3 avec rendu SSR partiel**, **zéro recette navigateur validée** et **zéro clôture complète**. Les autres phases SSR sont sans objet.

La création locale de Chromium a échoué avant page. La recette native est préparée dans le dépôt ; elle n'est pas présentée comme exécutée. La manette physique et la revue artistique humaine restent à vérifier.

## Références et conservation

Le critère original OPS-B03 est conservé dans `production/clan-ship-20261104/clan-ship-operations-20261105.xlsx`, feuille `Opérations`, ligne 60. OPS-Q26 vient de la feuille `Recette`, ligne 35. Le complément ne modifie pas leurs déclarations historiques.

Le builder compare les 108 sources avec l'inventaire historique. Il vérifie également les **124 fichiers des deux lots précédents** contre leurs blobs Git du commit `5d0c8d9`. Les empreintes et tailles contrôlées figurent dans [historique-preserve.json](historique-preserve.json). Aucun de ces fichiers n'est réécrit.

## Contrôles du livrable

[verification-classeur.json](verification-classeur.json) relie le classeur, les sources, les résultats attendus et les contrôles. Les formules ont été recalculées avec `@oai/artifact-tool`, puis exercées sur cinq scénarios : attesté, partiel, à vérifier, ouvert et bloqué. Les entrées d'origine ont été rétablies avant l'export.

Le vérificateur indépendant `scripts/verify-excel-bible-witnesses-20261108.py` lit l'archive XLSX avec les bibliothèques standard ZIP/XML : 866 cellules comparées, 12 qualifications et leurs caches, six formules de synthèse, 72 phases avec fond jaune et validation de liste, deux tables avec filtres et volets figés, aucune erreur Excel. Il contrôle aussi les empreintes des sources et la conservation des lots. Il ne réécrit jamais le classeur.

Les cinq aperçus ont été inspectés :

- [01-audience.png](apercus/01-audience.png)
- [02-suite-criteres.png](apercus/02-suite-criteres.png)
- [03-phases.png](apercus/03-phases.png)
- [04-sources.png](apercus/04-sources.png)
- [05-fin-index.png](apercus/05-fin-index.png)

Cette inspection concerne la lisibilité du classeur. Elle ne valide pas les pixels du jeu ni une revue artistique humaine.

## Reproduction

La source de qualification est [qualification-audience.json](qualification-audience.json). Les modifications manuelles des phases dans Excel doivent y être reportées avant régénération. Le rapport runtime `../verification.json` reste figé ; les résultats ultérieurs sont consignés séparément.

Le builder est `scripts/build-excel-bible-witnesses-20261108.mjs`. Exécuter une copie de ce script dans un dossier temporaire, avec le Node du runtime primaire et un lien `node_modules` vers les dépendances du runtime primaire. Le builder exige `--repo-root` et un `--output-dir` absolu sous `outputs/`, puis copie le livrable dans le présent dossier. Il refuse une qualification non prête ou un rapport de tests, build ou lint en échec. Le marqueur de création de la compétence Spreadsheets doit être exécuté avant l'opération d'authoring.

La vérification indépendante peut être relancée en lecture seule avec `--check` ; la syntaxe exacte figure dans le script. Les reçus du classeur restent séparés de ceux du gameplay.
