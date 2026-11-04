# Point de reprise — château Wolf et arrivée planétaire

**Lot 1.3.0 qualifié le 4 novembre 2026.** Reprendre la [PR #106](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/106), branche `feat/wolf-castle-continuation-20261104`. Le [README](README.md) décrit le parcours ; le [classeur](wolf-castle-arrival-20261104.xlsx) conserve la production existante.

## Source qualifiée

- Code local : `132b2f1fa4f0fdf0de096566cc1e1e33a6286d34`.
- Code publié : [`881b66dafc94ac007b7de907bc625b00af71dff8`](https://github.com/darknigthmare/yautja-la-longue-chasse/commit/881b66dafc94ac007b7de907bc625b00af71dff8).
- Arbre identique : `54804a2c3d3762f3ca3b0d621ff8401c50ab2c42`.

## Preuves à relire

| Contrôle | Résultat et preuve |
|---|---|
| CI finale | [41827785792](qa/browser-41827785792/workflow-result.json), job `126567570188` ; types, lint et art réussis |
| Navigateur | [24/24 contrôles](qa/browser-41827785792/report.json), zéro exception et zéro ressource visuelle sollicitée manquante ; 21 captures conservées |
| Régressions | [247/247](qa/browser-41827785792/workflow-job.log) ; les 32 audio, 29 château/combat et 42 sauvegarde/intégration sont inclus |
| Compléments | [8 tests world-screens](qa/composition-132b2f1f/world-screens-result.json) séparés ; [24/24 rectangles de fond](qa/composition-132b2f1f/background-frames-audit.json) valides |
| Production | [Build réussi](qa/build-132b2f1f/build-result.json), code 0, 243,649 secondes sur le code local qualifié |
| Classeur | [Vérification](workbook-verification.json), huit onglets, 30 prompts, champs humains conservés |
| SHA-256 du classeur | `94ffe9166afbdbdf70fa38d799e431dac53587c0fdd96310d89c56538a284c47` |

Les [preuves détaillées](workbook-evidence.json) gardent les huit exécutions navigateur et leurs sources. Les premiers contrôles locaux restent rattachés à `3a03a9449895c95a78606f951b762e9b087686a6`, publié avec le même sous-système dans `530c6512c5c172cd577e0278b3fcd2457c2e3d80` après la fusion de deux fichiers Clan Ship. L’[historique du classeur 1.2.0](history/workbook-verification-1.2.0.json) reste distinct.

## Acquis et suite directe

Conserver les neuf salles, l’audience, les sceaux, les trois duels non létaux, les checkpoints, les huit plans d’arrivée de 62 secondes et les 30 PNG avec leurs copies WebP. Réutiliser les images et les prompts existants. La planète est cadrée en cercle, la jungle suit la bande du spawn et les annonces de victoire/défaite sont corrigées. Le Clan Ship AVP et le vaisseau personnel restent distincts.

Les six ambiances du château et les quatorze signaux de combat sont livrés. Le prochain complément sonore concerne les portes, les pas d’exploration et les sceaux. Poursuivre ensuite les lignes ouvertes : donjon scénarisé avec boss, quêtes et récompenses ; comparaison exacte du film ; écoute du mixage ; revue artistique humaine des 30 images, encore sans approbation humaine. L’entraînement conserve son dossier propre, sans butin de campagne.

La recette navigateur de référence est celle de la CI ci-dessus. Le Chromium local s’était arrêté avant tout scénario (`socket() failed: Operation not permitted`).
