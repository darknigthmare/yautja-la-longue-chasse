# Admission PHG — rapprochement source du 9 novembre 2026

Les **1 806 sujets historiques et les 5 compléments du registre courant** ont un diagnostic : **1 811 / 1 811 rapprochés**, aucun laissé sans correspondance. Il s'agit d'un audit de sources et de bytes locaux sur `39b601ce1873a1f400d2f545f0fab97691b779e3` avec les modifications de travail décrites par les SHA de `summary.json`. Aucun fichier applicatif ni classeur source n'a été modifié par cette mission.

| Diagnostic actuel | Sujets |
| --- | ---: |
| Actif admis par les fonctions de production, revue individuelle ouverte | 1 464 |
| V120 : source locale/admission encore bloquée | 149 |
| Accessoire distinct : sprite/attache/raccord à qualifier | 20 |
| Référence nommée, objet ou pixels non qualifiés | 36 |
| Référence PHG / attribution des UV encore manquante | 30 |
| Contrat de famille identifié, critère de recette ouvert | 112 |

Ces sujets ne sont pas des actifs uniques : les **1 134 cas VIS138** portent sur **63 actifs × 6 morphologies × 3 vues**. Un résultat source commun n'exécute pas ces 1 134 observations. Les 5 compléments sont `PHG-PLAN-6`, `PHG-PLAN-10`, `PHG-PLAN-8`, `T13` et `T15`. Les cinq `V144-Q10…Q14` sont conservés sous la famille Gauntlets/campagne, hors admission cosmétique PHG.

## Preuves techniques actuelles

Le script `audit-runtime.mjs` bundle les modules TypeScript de production avec esbuild, puis appelle réellement les registres, getters, normaliseurs, filtres de droits et fonctions de chemin. Il ne simule aucun DOM. Sharp décode les images locales, mesure les pixels visibles, alpha, dimensions et bornes ; les tuiles d'atlas sont contrôlées individuellement.

- **77 matières** sont admises par `getChromaticMaterialV113`, dont 42 historiques V113/V114 et 35 études V125–V132. Tous leurs fichiers existent.
- **149 matières candidates V120** restent `drive-only`, `src: null`, et sont rejetées par le getter réel. `phgDriveV120Installed.json` est vide. Les **312 fichiers runtime/preview catalogués ne sont pas présents localement**. Le catalogue prouve les identités et empreintes attendues ; il ne prouve pas la disponibilité actuelle du bundle original. L'installateur et le contrôle d'admission existent.
- **7 accessoires V120** restent exclus des canaux de peinture : six anneaux et une matière de masque Feral. Leur exclusion ne prouve pas l'absence du code générique de coiffure ou de masque.
- **33 masques sélectionnables** ont un fichier réel : 26 existants V62/V3 et 7 concepts V133. Les 9 identifiants de géométries PHG candidates ne figurent ni dans l'union `BiomaskId` ni dans les options sélectionnables. Les concepts ne leur sont pas substitués.
- **48 decals originaux** sont admis par leur getter réel. Les **83 tuiles** mesurées (35 matières d'atlas et 48 decals) contiennent des pixels visibles.
- **99 fichiers locaux** sont décodés ; 49 ont un canal alpha, 50 n'en ont pas. L'alpha transparent est requis selon le rôle du fichier : une matière plane opaque peut être découpée par le masque réel du rig. Les données alpha et pixels visibles sont conservées par fichier ; aucun label de qualité visuelle n'en découle.
- **101 comparaisons d'empreintes attendues** concordent : 44 git-blob SHA-1 des PNG natifs, 44 SHA-256 de leurs sources Drive, 13 SHA-256 d'atlas/coques épinglés. Les autres images ont une empreinte calculée sans prétendre posséder une attestation indépendante.
- Les **144 combinaisons masque × origine × teinte** exécutées avec les filtres de production donnent **63 autorisées et 81 bloquées**. Le masque conceptuel inconnu est rejeté. Les teintes biomask Requiem/Nova ne deviennent pas des teintes d'armure.

Les 12 fichiers de tests ciblés passent (`source-tests.tap`). Les vérificateurs historiques V139/V140/V141 et `install-phg-runtime-v120.py --verify-installed` passent également ; leurs résultats sont conservés dans `validation-source.json`. Ils attestent des contrats techniques et documentaires bornés.

## Critères qui restent ouverts

`rows.json` conserve pour chaque sujet ses sources et critères exacts, les valeurs originales de ligne Excel, la morphologie/vue des cas VIS138, les identifiants rapprochés et les fonctions réellement concernées. `entities.json` sépare les phases : identité source, bytes locaux, hash épinglé, alpha/pixels, admission runtime, observation navigateur, revue humaine et UV officiels.

La revue humaine et la fidélité PHG **1:1 restent non attestées**. Les noms officiels, matières originales, recolorations et concepts conservent chacun leur nature. Les captures de menu PHG attribuées à la variante, UV/couleurs/motifs, six morphologies, trois vues et poses doivent être documentés selon le critère de chaque ligne. Les parcours actuels et le soak de 60 minutes sont des preuves séparées à rapprocher, pas des résultats de cet audit.

Quatre écarts documentaires sont identifiés dans `View_Coverage` : `phg-armor_classe_alpha_ceinture_ivoire_cannelee`, `phg-armor_classe_valkyrie_entrelacs_cuivres`, `phg-armor_epic_promo_2020` et `phg-armor_playstation_promo_2019` sont déclarés `armor` par l'Excel alors que leur registre courant les admet comme `outfit`. Ce constat demande une correction/qualification du suivi ; il ne démontre pas une mauvaise application runtime.

**Aucun nouveau bug P0 de runtime n'est démontré par cet audit.** Les contrôles de source et d'admission passent. Les objets manquants, le bundle V120 non local, les références UV et les recettes artistiques restent des travaux explicitement ouverts.

## Fichiers et reproduction

- `summary.json` : comptes, familles et SHA des sources/code/classeurs inspectés.
- `rows.json` : 1 811 diagnostics avec critères exacts ; `source-xlsx-rows.json` : snapshots de toutes les lignes sources.
- `entities.json` : 392 identités et contrats, groupés en 44 familles, avec phases et preuves.
- `runtime-assets.json` : sorties des vraies fonctions, 411 chemins, 99 images présentes, hashes, tuiles et portées.
- `registre-updates.json` : propositions à appliquer au registre partagé par son propriétaire ; aucune clôture artistique.
- `source-tests.tap`, `runtime-check.log`, `validation-source.json`, `verification.json` : résultats bornés.

Depuis la racine du dépôt :

```sh
/workspace/.cloud-tools/node22/node_modules/node/bin/node production/p0p1-20261109/qa/phg-admission/audit-runtime.mjs
python production/p0p1-20261109/qa/phg-admission/reconcile.py
```

Les scripts n'écrivent que dans ce dossier QA. Aucun téléchargement, activation de bundle, génération d'art ou changement de source de gameplay n'est effectué.
