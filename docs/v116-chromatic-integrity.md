# V116 — Correctifs de persistance des couleurs Yautja

Point de départ : PR #27, commit `e893bc9320eef202d26cb88dc9e0f097d650d000`, empilée sur la PR #24.

## Correctifs intégrés à cette révision
- Le commit des couleurs n'utilise plus le chemin générique `persist()` qui publiait la couleur dans la mémoire de React malgré l'échec d'une écriture. `writeSaveWithStatus` et `reconcileSaveWrite` sont utilisés avant tout changement du personnage affiché.
- Une tentative ambiguë ne peut être confirmée qu'à travers le reçu exact du propriétaire de la campagne. Aucun rang, trophée, inventaire ou autre champ n'est accordé par le poste.
- `chromaticsV113: null` signifie remise à zéro volontaire : les champs hérités de l'ancienne PR #25 ne réintroduisent plus les anciens pigments. `undefined` et les champs manquants conservent leur migration.
- Les brouillons de couleurs sont séparés par propriétaire, installation et apparence enregistrée.
- Les matériaux PHG existants, reconstructions 2D sans UV certifiées, ne sont ni renommés ni remplacés.

## Vérification
`node --experimental-strip-types --test tests/hunter-chromatic-persistence-v116.test.mjs`, puis suites V113–V115, TypeScript et ESLint via la CI `hunter-chromatics-v114.yml`.

## Restant à valider
Inspections visuelles du rig, du Homeworld, de la chasse Canvas et des six morphologies, aux échelles et poses réelles ; tests de bout en bout des interfaces et réévaluation des sources PHG. Les captures et UV ne sont pas déclarées fidèles 1:1 par ces tests de sauvegarde.

## Branches
PR #27 cible PR #24 ; PR #25 est indépendante sur main et touche des modules de sauvegarde et de rendu en commun. La fusion contrôlée ne doit pas écraser un schéma chromatique récent par les champs historiques PR #25. Aucune PR n'est fusionnée par ce lot.
