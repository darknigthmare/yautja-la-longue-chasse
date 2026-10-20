# Suivi Excel V100

`YAUTJA_V100_SUIVI.xlsx` conserve les 15 feuilles du V99 et ajoute 12 feuilles de suivi. `SyntheseV100` devient l’onglet actif. Le V99 reste épinglé au SHA-256 `53116e8f0fe10867702cccdb2d7bf2c8bbc5baa7c6a9c528085c12f780392a15` ; le générateur ne réécrit aucun fichier V99.

Les feuilles ajoutées sont `SyntheseV100`, `ChantiersV100`, `AnimationsV100`, `OrientationsV100`, `ContactsV100`, `PlanetesV100`, `OuvragesV100`, `PitOuvertV100`, `SourcesV100`, `ValidationsV100`, `EntreesV100` et `JournalV100`. Les cellules, formules, tables, chaînes partagées et feuilles historiques gardent leurs parties ZIP d’origine. Quatre parties de métadonnées sont étendues pour ajouter les feuilles et leurs styles ; les définitions de styles d’origine restent un préfixe intact.

## Sources et états distincts

Le registre éditable est `docs/v100-workstreams-source.json`. Les 52 gestes proviennent du plan runtime `app/game/data/pitWorkbookAnimationPlanV100.json` : 18 actions et huit présentations pour chacun des deux personnages. Les cellules `05_MOVES_PROPOSES!D10:U10` et `07_PRESENTATIONS!C10:J10` concernent Feral ; les mêmes colonnes à la ligne 7 concernent Scar. Chaque texte, identifiant, cellule et timing proposé est confronté à l’extraction V56 épinglée. L’original privé V54 reste absent.

Les admissions sont lues dans `pitWorkbookAnimationsV100.json` et validées par le helper runtime. Les PNG réellement référencés doivent exister, garder leur SHA d’admission et leurs dimensions. Les dessins sont décodés avec `sharp`, puis la transparence native du runtime est appliquée sans modifier le fichier source. Les pixels visibles de chaque rectangle ont leur propre empreinte. C’est ainsi que les cinq frames de la salve historique Feral peuvent correspondre à quatre dessins distincts par orientation : une tenue répétée n’ajoute pas un dessin.

Les 104 orientations sont admises et consultables. Un geste admis dans les deux sens n’est pas automatiquement raccordé au duel. Un raccordement exige les mêmes atlas et phases dans le véritable registre combat, dans les deux orientations. Les études, les huit nouveaux raccordements visuels et les deux raccordements historiques ont des états distincts. Les chiffres du classeur, accessoires, entités, victimes synchronisées et variantes ne sont pas déclarés terminés par l’admission d’un cycle BODY. La complétude des 52 études BODY est calculée depuis les admissions et orientations réelles. Leur preuve finale est déclarée `PASS_CIBLE_BODY` dans le registre, avec une portée limitée aux études consultables et aux phases existantes.

Un chantier Pit peut devenir `VALIDE_CIBLE` avec `validationScope: "BODY_STUDIES_ONLY"`, des résultats tests/navigateur explicitement PASS et des références de preuve. Le générateur exige alors que toutes les études de cette cible soient effectivement admises dans les deux sens. `bodyStudyFighterId` limite éventuellement cette cible à Feral ou Scar ; sans ce champ, les 52 études doivent être présentes. Cela valide la consultation BODY, sans fermer personnages, mécaniques, entités ou variantes. Le champ JSON `all52GesturesDelivered` a cette portée BODY explicite, identique à `all52BodyStudiesAdmitted` ; `all52BodyStudiesProven` distingue la preuve de l’admission.

Homeworld exporte les 16 habitants déjà présents, leurs niveaux, leurs rôles et leur rayon d’approche. Le chantier d’évacuation exporte le ratio de deux escortes aptes par patient et le coût local S1. Les imports effectifs de ces deux modèles et les composants concernés sont inclus dans le manifeste des entrées. Le suivi conserve également les 30 planètes actuelles, les 18 ouvrages et leurs six dossiers ouverts, ainsi que les six dossiers personnages Pit historiques encore ouverts. `collectFollowupV99` est réutilisé en lecture pour ces exports ; aucun produit V99 n’est régénéré.

Les preuves finales sont conservées dans [`v100-validation-summary.json`](v100-validation-summary.json) : compilation de production et TypeScript, cinq contrôles du serveur normal, 195 tests V100/régressions, puis 2 182 contrôles du lecteur, 191 du duel et 37 des mondes sur le même build. Les 200 captures produites ont été réellement ouvertes et leurs SHA vérifiés ; les 2 671 fichiers de sources et sprites sont restés inchangés. Les groupes de tests se recoupent et ne forment pas un total de tests uniques. Les fixtures, la marche clavier réelle et les limites des captures statiques sont explicités. Les références sous `outputs/` sont citées sans être requises par la génération en CI. Le générateur ne déduit jamais un PASS de la présence d’un fichier de test.

## Génération et vérification

Depuis la racine du dépôt, avec Node 22, les dépendances verrouillées et Python 3.9 ou ultérieur :

```sh
node scripts/build-excel-followup-v100.mjs
node scripts/build-excel-followup-v100.mjs --check
node --test --test-reporter=spec tests/excel-followup-v100.test.mjs
```

`--output-dir /tmp/suivi-v100` permet une génération isolée. Les trois produits sont le JSON `v100-workstreams.json`, le classeur et `v100-excel-followup-qa.json`. Ce dernier rapporte les contrôles structurels réellement exécutés avec l’état `PASS_STRUCTURE` ; il ne prétend pas avoir exécuté les tests du jeu ou ses recettes navigateur.

`--check` recompile les exports et relit les entrées actuelles avant de comparer les trois produits octet par octet. Il refuse une mauvaise cellule, une admission orpheline, un asset admis manquant ou modifié, un raccordement combat déclaré mais absent, une base historique modifiée ou un produit périmé. Les gestes volontairement encore sans art sont recensés comme des manques, sans empêcher la génération d’un suivi partiel. Une modification des admissions pendant la collecte fait échouer la collecte ; régénérer après le gel des sources.

Le script Python utilise uniquement ZIP/XML de la bibliothèque standard. Les entrées ZIP ont un ordre, une date et un mode non compressé fixes pour produire les mêmes octets entre générations. Sa lecture de contrôle vérifie les 15 feuilles historiques, le préfixe des styles, les relations OOXML, les liens vers `SyntheseV100`, les filtres, les lignes figées et les caches des formules d’après les cellules réellement écrites. Les textes source commençant par `=`, `+`, `-` ou `@` restent des textes explicites. Les tests Node couvrent aussi les mauvaises cellules, la fausse clôture, les éditions de formules et les trois produits périmés.

Les tests Node doivent remonter leurs neuf sous-tests réels. Dans cet environnement cloud, l’IPC du runner demande une exécution avec les permissions adaptées ; un unique résultat portant seulement le nom du fichier ne constitue pas la preuve des neuf cas. Excel et LibreOffice natifs ne sont pas exécutés ; le recalcul Excel est demandé à l’ouverture, mais aucun moteur de calcul natif n’est prétendu testé.

## Checkout CI partiel

Le manifeste exhaustif et actuel est `inputs` dans `docs/v100-workstreams.json` et la feuille `EntreesV100`. Il comprend les imports transitifs issus d’esbuild et les PNG réellement utilisés ; il évolue avec les admissions. Il faut conserver au minimum :

- Les fichiers de `app/game/` listés dans le manifeste, dont les modèles Homeworld/Clans, les plans, admissions et registres Pit ; le composant laboratoire V100 sous `app/pit-lab/` y est également épinglé.
- Les générateurs JS/Python V99 et V100, le registre source V99 et le registre source V100.
- `docs/YAUTJA_V99_SUIVI.xlsx`, les quatre suivis historiques `THE_PIT_STAGES_V60_SUIVI.xlsx`, `THE_PIT_STAGES_V61_SUIVI.xlsx`, `THE_PIT_V62_SUIVI.xlsx`, `THE_PIT_V63_SUIVI.xlsx`, les réconciliations V63 et `docs/v56-excel-priorities.json`.
- `art-source/v6/catalogue/catalogue_yautja_tous_medias.xlsx`, les deux corpus JSON `public/game/dialogues/v85/bible-dialogues.json` et `bible-ships.json`, ainsi que l’import transitif `public/game/assets/v15/trophies/manifest.json`.
- Les PNG admis sous `public/game/sprites/v100/pit/` et les pages historiques référencées sous `public/game/sprites/v59/pit/` et `public/game/sprites/v34/pit/`, selon le manifeste courant.
- `tests/excel-followup-v100.test.mjs` pour la recette, et les trois produits V100 pour `--check`.

`esbuild` et `sharp` sont déjà verrouillés dans les dépendances du dépôt. Aucune dépendance Python supplémentaire, aucun original privé et aucun fichier `outputs/` n’est nécessaire. Les changements de package et de CI sont suivis séparément par le chantier principal.
