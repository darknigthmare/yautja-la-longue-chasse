# Suivi Excel V104

Le suivi V104 ajoute douze feuilles au classeur V100 explicitement épinglé dans `docs/v104-workstreams-source.json`. Les **27 feuilles précédentes** restent historiques, dont les quinze feuilles V99. Le résultat contient 39 feuilles ; `SyntheseV104` est l’onglet actif.

Les nouvelles feuilles sont `SyntheseV104`, `ChantiersV104`, `NormalesV104`, `CartographieV104`, `PreserveV104`, `PlanetesV104`, `VariantesV104`, `ManquantsV104`, `SourcesV104`, `ValidationsV104`, `EntreesV104` et `JournalV104`. Les parties ZIP des anciennes feuilles, tables et chaînes partagées gardent leurs octets, formules et caches. Seules les quatre métadonnées nécessaires à l’assemblage sont étendues ; les styles historiques restent un préfixe intact.

## Sources réellement collectées

- **Feral et Scar** : les dix-huit normales exportées par `pitWorkbookNormalsV104.ts` sont comparées au plan V100 et à l’extraction V56 épinglée. Identités, cellules `D10:L10` et `D7:L7`, texte, préparation/actif/récupération, dégâts de base, hauteur et anti-air doivent correspondre. Les 108 clips de phase du registre V104 sont des raccords d’images BODY déjà admises ; leur disponibilité et leur SHA sont vérifiés. Cette recette explicite ne ferme pas les personnages complets, spéciaux, projections, entités, finishers ou costumes.
- **Cartographe** : les exports de `homeworldCartographyDefinitionV104.ts` fournissent la scène `D6-W-PNJ-ROLE-12`, ses huit répliques, ses cellules source et la route physique. L’option B reste distincte de l’option A du point haut, conservée ouverte. La présence du modèle ne prouve pas le parcours navigateur.
- **Preserve** : les deux factories réelles sont exécutées avec la même graine. La V1 conserve ses trois secteurs et sa largeur de 4 800 unités. La V2 explicite possède quatre secteurs, 6 400 unités et huit combattants. La progression reste **4/80 secteurs et 8/100 combattants** ; le nouveau secteur est une création originale déclarée.
- **Planètes** : les trente mondes historiques sont exportés séparément des 27 couples territoires/régions acceptés par le validateur V103. Les formats ne sont pas comptés comme 27 nouveaux mondes historiques ni comme un nombre infini de planètes.
- **Enforcers** : les trois manifestes et registres V6.11–V6.13 sont confrontés aux **108 fichiers PNG réels**, avec leur SHA. Le master V6.13 de 5 120 identifiants fournit les dix-huit variantes 10 encore « Pas faite ». Les registres historiques sont lus sans réécriture. Une pose disponible, le statut historique du ledger, une animation, un placement et une certification canonique restent des champs distincts.
- **Manquants** : les six dossiers Pit et six ouvrages de guerre ouverts du suivi historique sont conservés, avec les options, secteurs, combattants et variantes qui restent à produire.

La collecte crée aussi deux états de duel et deux replays d’un tick avec les factories réelles : sans règle ajoutée, snapshot et moteur replay restent en version **11** ; avec `workbook-v104`, ils passent explicitement en version **12**. La constante historique seule n’est pas utilisée pour qualifier le nouveau moteur.

La réconciliation des variantes vers `main` est une attestation explicite liée au commit fusionné `d71e995ae886df69c4165a1a153291449e8f22f6` et à la PR 10. Les 36 identifiants V6.13 passent du solde historique « Conservée hors main » au solde cumulatif « Présente dans main », sans réécrire le master V6.13 : 2 197 dans main, 205 produits à vérifier, 2 718 pas faits, zéro hors main. Ces 5 120 statuts de lineage ne certifient pas 2 197 nouvelles images. Les octets effectivement contrôlés restent ceux des 108 PNG V6.11–V6.13. Les 21 reçus finaux V6.13 non récupérés et les 36 traces V6.10 sans PNG restent des manques distincts.

## Validation explicite et gel

Le registre commence avec `baselineFreeze: "PENDING_RUNTIME_FREEZE"` et des chantiers `EN_COURS` ou `OUVERT`. Le SHA de la base est une déclaration à mettre à jour explicitement après le gel des entrées ; le générateur refuse une base différente et ne réécrit aucun ancien classeur. Une régénération V100 éventuellement nécessaire appartient au chantier principal, avant ce gel.

Un chantier ne peut devenir `VALIDE_CIBLE` qu’avec :

1. Une base marquée `FROZEN` et un `validationScope` exactement limité au lot.
2. Des champs `tests` et `browser` commençant explicitement par `PASS`, remplis après exécution réelle.
3. Un tableau `proof` contenant des objets `{ "path": "docs/rapport.json", "sha256": "…" }`. Le fichier doit exister et garder cette empreinte. Un nom de fichier de test ne suffit pas.

Le générateur ne lance pas les tests du jeu et ne déduit jamais un PASS de la présence d’un rapport. Les validations décrivent leur commande, leur périmètre et leur limite. Les dix-huit Enforcers 10 sans PNG ne peuvent pas être promus par un simple statut. Le rapport d’une preuve ne doit pas inclure le SHA du classeur V104 qui dépend de lui, pour éviter une dépendance circulaire ; le SHA du classeur est porté par le produit `v104-excel-followup-qa.json`.

## Générer et contrôler

Avec Node 22, les dépendances verrouillées du dépôt et Python 3.9 ou ultérieur :

```sh
node scripts/build-excel-followup-v104.mjs
node scripts/build-excel-followup-v104.mjs --check
node --test --test-reporter=spec tests/excel-followup-v104.test.mjs
```

`--output-dir /tmp/suivi-v104` génère les trois produits dans un dossier isolé. `--check` compare les octets des trois produits, refuse un produit absent ou périmé et n’écrit pas sur ces fichiers. Les imports transitifs, registres, scripts, extractions et PNG réellement utilisés sont recensés dans `inputs` et `EntreesV104`, avec leur SHA. Une entrée modifiée pendant la collecte impose de recommencer après gel.

Le writer Python importe uniquement les helpers purs du writer V100. Il ne lance pas l’ancien générateur. Il utilise ZIP/XML de la bibliothèque standard, un ordre de parties et des métadonnées ZIP fixes. La vérification relit indépendamment les relations, le préfixe historique, les styles, les noms de feuilles, les filtres, les liens vers la synthèse, les formules et leurs caches. Les textes commençant par `=`, `+`, `-` ou `@` restent des chaînes littérales.

Les dix tests ciblés couvrent les fausses clôtures, preuves modifiées, mauvaise empreinte de base, cellules et valeurs source altérées du Pit et du cartographe V6, compteurs réels, conservation historique, formules et liens, texte littéral, caches falsifiés, reproductibilité et refus des produits périmés. Ils doivent afficher leurs dix sous-tests réels. Les tests et recettes du jeu ont des preuves distinctes ; ce classeur ne certifie ni une application Excel native ni son moteur de calcul.

## Checkout CI partiel

Outre les entrées historiques V100, conserver les nouveaux modules V104 et leurs imports transitifs, le JSON extrait du cartographe, les générateurs V104 JS/Python, le writer V100, le registre et les trois produits V104. Pour les variantes, conserver les trois registres `enforcerProductionV611/612/613.json`, les trois `docs/suivi-production/v61x/data/production-manifest.json`, le master compressé V6.13 et les trois répertoires PNG `public/game/production/enforcers-v611/612/613/`. Les rapports promus comme preuves doivent être inclus. Aucun original privé, fichier de secret ou artefact `outputs/` n’est nécessaire à la génération.

## État final du lot

Les cinq chantiers livrés ont le statut `VALIDE_CIBLE`, avec leurs portées conservées et des preuves globales/spécifiques épinglées par SHA. Les dix-huit Enforcers 10 restent `OUVERT`. La production Pit comporte 312 contrôles et 48 captures inspectées, le Cartographe 18 contrôles et cinq captures, et Preserve 25 contrôles et dix captures. Le générateur et la galerie Enforcers conservent leurs preuves ciblées des PR 11 et 10 fusionnées ; ils ne sont pas présentés comme de nouvelles recettes production V104.

Le classeur final contient **39 feuilles**, **27 feuilles historiques préservées**, **40 parties ZIP historiques inchangées**, 56 parties XML relues et 12 caches de formules vérifiés. Il compte 231 entrées et 140 fichiers natifs dont les octets ont été vérifiés. Sa taille est de **2 410 920 octets** et son SHA-256 est `24b12215808e90fbe3141b2893bf4e96d0561842ebff685d50a3b8020073ab41`.

La génération, `--check` et les **dix sous-tests réels** passent après la promotion finale, sans échec ni cas ignoré. L’attestation indépendante est `docs/v104-excel-final-tests.json`, exclue des entrées de génération pour éviter une dépendance circulaire. Les preuves de jeu gelées sont dans `docs/v104-validation-summary.json` ; l’attestation Excel ne les modifie pas.
