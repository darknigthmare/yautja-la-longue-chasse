# Consolidation des PR du 3 novembre 2026

Les **60 têtes de PR** recensées sont réunies dans la branche locale
`codex/consolidate-open-prs-20261103`. La consolidation conserve les travaux
Homeworld, les quatre modes des guerres de clans, les gauntlets, les planètes,
la chasse, les textures PHG et le bestiaire Alien Base.

## État observé avant publication

- Dépôt : https://github.com/darknigthmare/yautja-la-longue-chasse
- Base `main` : `f322e0cb42f2b1b7e06c3be1dcfbb23cb24f02c8`.
- Commit local testé : `d5d2e16a2f0b6d4dd98802af018fff99bc63a941`.
- Arbre Git de ce commit, avant finalisation des documents et des workflows :
  `cd2b5b8410b9231994630a68501453bee11792d7`.
- [Inventaire des 60 PR](pr-inventory.json), [59 PR initiales](pr-baseline.json)
  et [ajout de PR100](pr-additions.json).
- [Couverture par ascendance Git](coverage.json) : 60 présentes, aucune absente.

Le commit local testé n’est pas présenté comme un commit déjà publié.
Le classeur conserve séparément la présence dans la branche, la présence dans
`main` et l’état de chaque PR sur GitHub. À cet instantané, `main` ne contient
aucune des 60 têtes et les 60 PR sont encore ouvertes. La publication et sa
fusion distante doivent être vérifiées sur leur propre commit.

## Corrections d’intégration

| Ensemble | Résultat |
| --- | --- |
| Homeworld | Récupération des anciennes positions bloquées par les volumes V113, avec conservation de l’étage. Ressources et historiques graphiques conservés. |
| Planètes et sauvegardes | Fixtures historiques préservées, données V156 séparées, convoyage et dispositions de chasse réconciliés. |
| Quatre modes et gauntlets | Variantes V144 conservées, dossiers et classeurs distincts, rapports et rappels Outer Ops sans double effet. Raccord du format des matériaux PHG corrigé. |
| PR100 | 12 props tactiques indépendants, commandes clavier infiltration/RTS et zoom intégrés. Ancienne règle CSS neutralisant le zoom corrigée. Verrous de sauvegarde conservés. |
| React et CI | Raccords React corrigés et entrées de checkout CI adaptées aux dépendances du code combiné. |

## Résultats de validation

Les preuves enregistrées dans `logs/` et les rapports des sous-systèmes sont
référencés individuellement dans le classeur. Les suites qui se recoupent ne
sont pas additionnées en un total artificiel.

| Contrôle | Résultat observé | Preuve |
| --- | --- | --- |
| Clans et gauntlets après PR100 | **456/456**, aucun échec ni test ignoré | [TAP final](logs/pr100-clan-regressions.tap) |
| Régression ciblée PR100 et intégrations | **47/47**, avec recoupement de la suite précédente | [TAP ciblé](logs/pr100-targeted.tap) |
| Homeworld, convoyage et planètes combinés | **83/83** | [Journal](logs/combined-regressions.log) |
| Raccord gauntlet/PHG | **13/13** | [Journal](logs/gauntlet-integration-tests.log) |
| Réserves et animations historiques | **20/20** | [Journal](logs/reserve-pit-regression.log) |
| TypeScript après PR100 | Réussi, ainsi que le contrôle TypeScript du build final | [Journal](logs/pr100-typecheck.log) |
| Lint final | **0 erreur, 51 avertissements** | [Journal](logs/final-lint.log) |
| Build Next de production final | Compilation, types, 9 pages statiques et audit CSS réussis | [Journal](logs/final-production-build.log) |
| Serveur Next compilé final | **7 contrôles HTTP réussis**, build `mhqPByJWRopAqAxumzJKT` | [Journal](logs/final-next-smoke.log) |
| 83 sprites de secteurs | 83 SHA uniques et transparences réelles contrôlés | [Journal](logs/sector-assets.log) |
| 10 props utilitaires | 20 PNG et 10 sources Blender vérifiés | [Journal](logs/utility-assets.log) |

La compilation et les contrôles HTTP ne constituent pas une partie complète
jouée dans un navigateur. Le parcours navigateur du bestiaire n’a pas pu être
exécuté localement faute de Chromium Playwright. Les étapes de build réservées
à la racine Vercel exacte sont signalées comme ignorées dans le journal local.

La consolidation ne change pas les statuts artistiques : les études originales
restent distinctes des références attestées. Les 10 props utilitaires gardent
`runtimeAdmission: false` et `canonicalCertification: false`. Aucun certificat
de fidélité artistique 1:1 n’est déduit des tests techniques.

## Suivi Excel et reproduction

[Classeur de consolidation](YAUTJA_CONSOLIDATION_PR_20261103.xlsx) :
trois feuilles, **Synthèse**, **PR** et **Vérifications**. Les 60 lignes de PR
contiennent les SHA complets, les domaines, les liens et les trois états
distincts. Les compteurs et la répartition par domaine utilisent des formules.
Les vérifications portent leur périmètre, leur commande reproductible et leur
preuve, en conservant les résultats des étapes précédentes.

Le [constructeur](build-consolidation-workbook-20261103.mjs) utilise
`@oai/artifact-tool` du runtime primaire avec
[consolidation-input.json](consolidation-input.json). L’exécuter depuis un
dossier temporaire propre contenant un lien `node_modules` vers les dépendances
du runtime, en fournissant `--input`, `--repo` et `--output-dir` absolus.
Le constructeur ne modifie aucun dépôt distant ni état Git.

Avant export, les compteurs sont comparés à l’inventaire et les formules sont
recalculées avec des états temporairement modifiés, puis restaurés. Les trois
feuilles sont rendues pour contrôle visuel. Le dossier `workbook-preview/`
conserve les vues, l’inspection des formules et l’instantané utilisé.
