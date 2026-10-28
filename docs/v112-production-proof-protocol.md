# Preuves de production V112

Les certificats V111 restent historiques. V112 conserve son propre gel, ses recettes, ses résultats bruts et son classeur. Le gel couvre toutes les sources applicatives, les outils et dépendances locales des deux recettes, les entrées natives historiques, les nouveaux originaux et reçus V112 ainsi que les images réutilisées explicitement recensées. Les rapports, captures et classeurs générés V112 en sont exclus.

Le responsable stabilise le code, les admissions artistiques et les recettes avant de créer le gel et le commit runtime. Le build de production est exécuté depuis ces mêmes octets. Chaque réponse HTML utilisée en recette doit porter le vrai Build ID et conserver son SHA256. Chaque recette observe l'intégralité du gel avant et après son exécution.

La recette Homeworld couvre six familles : `Foundations`, `PublicPlaces`, `PublicLife`, `InteriorArrival`, `Mobile` et `UpgradeRecovery`. Les checkpoints initiaux et les états de campagne préparés par les modèles sont des fixtures déclarées. Les déplacements, interactions, confirmations, refus de capacité d'enregistrement, pause et commandes de guidage comptés comme contrôles passent par l'interface réelle. Une restauration locale après modification du mobilier n'est pas de la marche : elle conserve une copie exacte du point et des registres d'origine et demande une confirmation explicite.

La recette Pit couvre `FeralScar` puis `ScarFeral`. Les huit admissions représentent 48 dessins sélectionnés dans 22 PNG originaux : 34 régions des huit feuilles et 14 dessins isolés remplaçant les cases refusées. Les régions remplacées ne sont pas des dessins supplémentaires livrés. Les contrôles suivent les entrées réelles, les partenaires, orientations, saisies, réactions, refus, déchoppes et relectures ; la fixture initiale du menu n'est pas un combat joué.

Les erreurs de page, `console.error`, Workers et requêtes échouées restent enregistrées sans filtrage. Un parcours partiel, une source modifiée, un inventaire incomplet, un résultat exploratoire ou une image non inspectée interdit toute publication. Toutes les captures finales sont ouvertes avant leur copie, sans retouche, dans les preuves portables. Les captures diagnostiques avec éléments temporairement masqués ne certifient aucun rendu final.

```sh
node scripts/build-runtime-public-inputs-v112.mjs --check
node scripts/snapshot-runtime-v112.mjs --write docs/v112-runtime-freeze.json
node scripts/publish-validation-v112.mjs --domain Homeworld \
  --input REPERTOIRE_EXECUTE/result.json --opened REPERTOIRE_EXECUTE/opened.json \
  --runtimeCommit COMMIT_RUNTIME_EXACT --buildId BUILD_ID_REEL
```

La commande de publication Pit utilise le même outil avec `--domain Pit` et le résultat de sa propre recette. Le suivi Excel ne peut promouvoir un chantier qu'avec son rapport V112 vérifié, le brut complet, ses captures inspectées et le gel courant. Les anciennes assertions V111 et les assertions du renderer V90 tournent dans leur application privée épinglée ; elles ne certifient pas le renderer V112. Les exigences source, leurs neuf actions incluses et les 354 cibles Homeworld restent distinctes des périmètres effectivement validés.
