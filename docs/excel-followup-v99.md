# Suivi Excel V99

`YAUTJA_V99_SUIVI.xlsx` relie les sources disponibles aux comportements implémentés, à leurs preuves et au travail encore ouvert. Il ajoute dix onglets aux cinq onglets du suivi V63. Les cinq anciens onglets, leurs cellules, formules, tables et chaînes partagées sont conservés ; aucun ancien classeur n'est écrasé.

Le registre éditable est `docs/v99-workstreams-source.json`. Les compteurs de cartes, d'ouvrages et de corpus proviennent des exports TypeScript et JSON réellement consommés par le projet. Les validations sont des déclarations explicites avec leur périmètre : l'existence d'un test ou d'une image ne suffit jamais à les faire passer.

## Ce que le suivi distingue

- 30 cartes actuelles, dont 16 à biomes classiques et 14 exotiques, avec continents physiques, six régions administratives, 36 territoires et un graphe de routes connecté par monde. Les cartes supplémentaires sont des créations du projet ; la direction de biome classique ne certifie pas une planète canonique 1:1.
- 12 des 18 ouvrages V6 acceptés par l'export runtime en contexte libre. Le suivi V88 à 8/18 garde son statut historique. Quai, montures, confinement, duel, écoute et escale restent ouverts avec leurs prérequis matériels dans `OuvragesV6`.
- V3 : 679 fiches dans 32 feuilles contenant des entrées runtime, pour un original documenté à 39 feuilles. V6 guerre : 975 fiches de 33 feuilles. Les monnaies et identifiants des deux modèles restent distincts.
- 730 scènes, 6 059 répliques, 1 494 choix, 150 variantes et 400 réactions documentaires ; 210 directions de voix textuelles, 202 noms distincts et huit noms ambigus. Ces lignes ne sont ni autant de missions incarnées ni des enregistrements audio.
- 201 identifiants de combattants actuellement sélectionnables et 187 arènes runtime, séparés des 205 dossiers historiques V54. Les six dossiers personnages laissés ouverts et les 522 descriptions de vie des stages V63 gardent leurs cellules et leurs limites de certification.
- Les nouvelles garnisons, le sabotage des dépôts et la récupération Preserve ont des tests ciblés et une recette Chromium production de 26 contrôles chacun pour Clans et Preserve. Homeworld dispose aussi de 23 contrôles Chromium et de ses 18 tests modèle/SSR. La marche clavier, l’Escalier du Conseil vers +1 et la reprise par sauvegarde/Continuer sont vérifiés depuis une fixture déclarée, avec horloge contrôlée pendant la marche ; ce n’est pas une progression de campagne jouée. La recette totale compte 76 contrôles : 26 Clans, 26 Preserve, 23 Homeworld et un contrôle global d’absence d’erreurs.

Les cinq classeurs locaux sont inventoriés avec leur SHA-256 dans `SourcesV99`. Les trois originaux privés V3, V6 et V54 ne sont pas dans le dépôt ; leurs extractions et leurs empreintes sont identifiées sans recréer de faux originaux ni reproduire de chemin personnel.

## Régénération et vérification

Depuis la racine du dépôt, avec Node 22, les dépendances verrouillées installées et Python 3.9 ou ultérieur :

```sh
node scripts/build-excel-followup-v99.mjs
node scripts/build-excel-followup-v99.mjs --check
node --test --test-reporter=spec tests/excel-followup-v99.test.mjs
```

`--output-dir /tmp/suivi-v99` permet une génération isolée. `--check` ne réécrit pas les produits : il échoue si le registre JSON ou le classeur ne correspond plus aux entrées actuelles. Le manifeste exhaustif des 49 fichiers lus et de leurs empreintes est `inputs` dans `docs/v99-workstreams.json` ; les corpus et classeurs historiques doivent être inclus dans un checkout CI partiel. Les fichiers de preuves cités restent des références et ne sont pas chargés par ce générateur.

`esbuild`, déjà verrouillé par le dépôt, compile les exports de données. Le script Python utilise uniquement ZIP/XML et la bibliothèque standard ; aucune dépendance Python supplémentaire n'est nécessaire en CI. Les archives utilisent des entrées ZIP non compressées avec un ordre et des dates fixes pour rester identiques entre générations et versions de zlib. Les styles existants sont conservés en préfixe, puis les styles V99 sont ajoutés.

Les douze formules de `SyntheseV99` comptent les lignes et les statuts des nouveaux onglets. Leurs valeurs mises en cache sont vérifiées contre les cellules de l'archive ; le recalcul est demandé à l'ouverture. Les textes de source, y compris ceux commençant par `=`, sont enregistrés comme textes explicites. Le test d'édition recompute indépendamment la formule après changement simulé d'un statut ; il ne prétend pas exécuter le moteur de calcul d'Excel.

Les six tests vérifient les populations source/runtime, la préservation des anciennes parties ZIP et des styles, les relations et caches OOXML, les textes littéraux, les validations explicites et la détection d'un produit périmé. Une revue indépendante a également recompté les douze formules et contrôlé les 32 parties XML. La lecture locale avec openpyxl est une vérification supplémentaire ; elle n'est pas requise par le générateur. **Excel et LibreOffice natifs n'ont pas été exécutés.** Les résultats et empreintes sont consignés dans `docs/v99-excel-followup-qa.json`.
