# Point de reprise — château Wolf et arrivée planétaire

## Reprendre ici — intégration achevée

- **PR #106 fusionnée :** [36f765c980acdc207fe89730ab519c6f769b3881](https://github.com/darknigthmare/yautja-la-longue-chasse/commit/36f765c980acdc207fe89730ab519c6f769b3881), dans `main` le 4 novembre 2026 à **19:17:40 UTC**.
- **Source qualifiée :** `c77c4ea37e3b1b0969a33917971f38496d4ee66a` ; équivalent local `c80fddb03ffa3b5e6c134fbb8754f0c2d169a366`.
- **Arbre commun à la source et à la fusion :** `a946e3d8123aaed37b417664a3de1de970232548`. V94 utilise le merge synthétique `c915eb34`, avec zéro fichier différent de `c77c4ea3`.
- **Acquis :** Wolf **278 tests / 32 contrôles**, Clan **217 / 22**, /dev **61 / 15** ; V94 strict **2 151 entrées PASS**, **75/75 V113**, cinq jobs et trois groupes concordants. Aucun total entre suites.
- **CI :** **16 workflows réussis sur 16** ; aucun run actif restant dans cette qualification. [Reçu final et liens](qa/integration-c77c4ea3/final-integration-result.json).
- **Suite :** écouter le mixage, comparer le film plan par plan et poursuivre les **30 revues artistiques humaines ouvertes**. Vercel signale `build-rate-limit` ; aucun déploiement attesté.

Le [README](README.md), le [classeur](wolf-castle-arrival-20261104.xlsx) et les [preuves détaillées](workbook-evidence.json) permettent de reprendre sans reconstruire les briefs. Le mandat, les sons de portes/pas/sceaux et l’intégration Clan sont suivis sur leurs preuves finales. Les validations sont antérieures à la fusion ; l’identité de l’arbre confirme leur intégration à `main` sans prétendre à un nouveau test après fusion.

## Runs qualifiés — c77c4ea3

| Périmètre | Run | Résultat terminal |
|---|---|---|
| Wolf | [41890840615](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41890840615) | Réussi : 278 tests, 32/32 contrôles, 27 captures |
| /dev | [41890840578](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41890840578) | Réussi : 61 tests et 15/15 scénarios |
| Clan | [41890840746](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41890840746) | Réussi : 217 tests et 22/22 parcours |
| V94 | [41890840607](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41890840607) | Réussi : strict 2 151, 75/75 V113, cinq jobs et agrégat |

Le [rapport Wolf](qa/integration-c77c4ea3/wolf/report.json) et les [extraits du job](qa/integration-c77c4ea3/wolf/job-result-excerpts.log) attestent source = checkout `c77c4ea3`, arbre propre, 185 ressources visuelles sollicitées, aucune erreur ni ressource manquante. Les huit contrôles du mandat sont inclus dans les 32. Les 27 captures sont dans l’artefact vérifié `13354368053`, SHA-256 `0078e4fc4c2108278057593b9f820854459608e52b8211a398275559dbff4d42` ; elles ne remplacent pas les 27 PNG de `9da27c2a` conservés plus bas. Le responsable a relu les vues courantes 06, 26 et 27 : textes et commandes lisibles, états cohérents. Cette inspection technique ne constitue pas une approbation artistique humaine.

Le [rapport Clan](qa/integration-c77c4ea3/clan/report.json), les [extraits du job](qa/integration-c77c4ea3/clan/job-result-excerpts.log), les [métadonnées](qa/integration-c77c4ea3/clan/artifact-metadata.json) et la [liste des membres de l’artefact](qa/integration-c77c4ea3/clan/artifact-members.json) conservent les 217 tests, les 22 parcours et les 11 captures recensées. Source = checkout `c77c4ea3`, arbre propre, zéro erreur et ressource manquante. Les 11 PNG ne sont pas dupliqués ici.

Le [reçu V94 terminal](qa/integration-c77c4ea3/v94-terminal-receipt.json), son [manifeste](qa/integration-c77c4ea3/v94-evidence-manifest.json), les trois petits ZIP et leurs `proof.json` exacts conservent les groupes application, models et history. L’[agrégat](qa/integration-c77c4ea3/v94-aggregate-excerpt.log) valide le même run `41890840607`, tentative 1, checkout `c915eb34fae6819526e4e4abe36949244a0b21ab`. La [comparaison de contenu](qa/integration-c77c4ea3/synthetic-merge-identity.json) ne trouve aucun fichier différent avec `c77c4ea3`.

Depuis `3fc1a5bf`, seuls les deux scripts QA changent : attente du focus natif sur Pause avant Escape et marche /dev bornée à quarante impulsions, avec les assertions conservées. Le [reçu de source initial](qa/integration-c77c4ea3/source.json) garde son état d’attente au moment de la publication ; les rapports terminaux et le reçu final ci-dessus constituent la clôture.

## /dev qualifié sur c77c4ea3

Le [rapport](qa/integration-c77c4ea3/dev/report.json) et les [extraits du job](qa/integration-c77c4ea3/dev/job-result-excerpts.log) conservent **61/61 tests et 15/15 scénarios**, sur `c77c4ea3` avec arbre de travail propre. Aucune erreur JavaScript ou console, aucune ressource manquante, aucune écriture de stockage et aucune ouverture IndexedDB ne sont observées. Les huit captures sont recensées dans le rapport et ne sont pas dupliquées ici.

La vraie chasse passe de **x = 225 à x = 799,845** et découvre `jungle-pilot-underpass` en **16 impulsions sur les 40 autorisées**. La génération reste à **0** ; position et horloge continuent après la découverte sans reset implicite. Le reset explicite ramène x à **225** et l’horloge à **0**. Les preuves Wolf, Clan et V94 ci-dessus proviennent de leurs propres exécutions ; aucun succès d’un lot n’est déduit de ce seul passage /dev.

## Passage 3fc1a5bf — deux rapports d’échec conservés

Le [rapport /dev](qa/integration-3fc1a5bf/dev/report.json) conserve **8 contrôles réussis sur 9 exécutés**, sans erreur JavaScript ni ressource manquante observée. Le parcours clavier borné restait trop court sur ce runner pour atteindre les 300 pixels attendus ; le responsable ne constate ni reset ni erreur. Le correctif prolonge la borne de marche sans retirer les assertions.

Le [rapport Wolf](qa/integration-3fc1a5bf/wolf/report.json) conserve **23 contrôles réussis sur 24 exécutés, pour 32 prévus**, avec source = checkout `3fc1a5bf`, arbre de travail propre, zéro erreur et zéro ressource demandée manquante. Les **huit contrôles du mandat et de sa récompense réussissent** ; l’échec intervient ensuite lors de la pause d’arrivée, Escape ayant précédé le transfert natif de focus après Resume. Les captures supplémentaires ne sont pas dupliquées.

V94 `3fc1a5bf` est annulé avant le contrôle strict, selon le responsable. Ce passage ne qualifie donc pas le strict de 2 151 entrées ; la nouvelle source possède son propre run V94.

## Résultats historiques reçus sur 9da27c2a

| Périmètre | Run | État au relevé |
|---|---|---|
| Wolf | [41886852346](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41886852346) | Réussi : 278 tests, 32/32 contrôles, 27 captures |
| Clan | [41886852455](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41886852455) | Réussi : 217 tests et 22/22 parcours |
| /dev | [41886852485](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41886852485) | Échec : 7 réussites sur 8 contrôles exécutés |
| V94 | [41886852457](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41886852457) | Preuve terminale non reçue dans ce relevé |
| V136 | [41886852297](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41886852297) | Preuve terminale non reçue dans ce relevé |
| V131 | [41886852405](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41886852405) | Réussi selon le relevé du responsable |

Le [rapport Wolf](qa/integration-9da27c2a/wolf/report.json), ses [extraits de job](qa/integration-9da27c2a/wolf/job-result-excerpts.log) et ses [27 captures](qa/integration-9da27c2a/wolf/) sont archivés à l’identique. Les 278 tests passent sans échec ni test ignoré. Les 32 contrôles sollicitent 185 ressources visuelles, sans exception ni ressource manquante. Le responsable a relu les vues **22, 24, 26, 27 et 18** : journal, reprise avec 82 PV et 18 dégâts, refus de récompense, mandat terminé après reprise et modal à 320 px. Aucune coupure ni incohérence n’a été relevée dans ces cinq vues ; les textes sont lisibles. Cette revue ciblée ne vaut pas approbation artistique humaine.

Le [rapport Clan](qa/integration-9da27c2a/clan/report.json) et son [reçu](qa/integration-9da27c2a/clan/clan-result.json) conservent 217 tests, 22 parcours et 11 captures recensées ; les 11 PNG ne sont pas dupliqués ici. Les rapports Wolf et Clan attestent `9da27c2a` comme source et checkout, avec arbre de travail propre.

Le [rapport d’échec /dev](qa/integration-9da27c2a/dev/report.json) conserve 7 réussites sur 8 contrôles exécutés. Le test attendait la visibilité de l’ancre `[data-region-player]`, volontairement de 0 × 0 ; `3fc1a5bf` attend l’image visible de cette ancre et son décodage. Cette correction de recette ne changeait aucun fichier applicatif ni l’inventaire. Son passage CI atteint ensuite le contrôle de trajet conservé dans le rapport `3fc1a5bf` ci-dessus.

## Adoption des corrections et annulations

Le [reçu](qa/integration-9da27c2a/source-and-corrections.json) garde les trois raccords adoptés dans `fcd77668` : import du vrai `resumeHuntGauntletV142` dans le test GameClient, helper TypeScript existant pour V142, puis attente de l’arrêt réel avant l’action de porte Wolf. Le run V131 `41886345401` / job `126771719639` échoue alors faute de `homeworld-scene-ssr-v78.mjs` dans le checkout ; `9da27c2a` matérialise ce helper. Le reçu conserve aussi le journal local V142 **7/7** sur `7575782a` avec patch de workflow seulement.

L’application et l’inventaire restent identiques à `37128ba9`. Les runs de `37128ba9` ont été annulés ; **aucune validation Wolf, /dev ou V94 stricte ne leur est attribuée**. L’inventaire préparé compte **2 151 entrées**, **400 041 octets**, SHA-256 `06d2bd524bbba6708a78cc45b1da6a68c4360568b8002afb55c2f2289aa0b072` ; le [nouveau strict CI](qa/integration-c77c4ea3/v94-terminal-receipt.json) est réussi sur `c77c4ea3` / checkout synthétique `c915eb34`.

Le Clan Ship est intégré depuis la PR #104, fusionnée à `b18c79b`. Son suivi est clôturé par la [PR #107](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/107), fusionnée à `c171050646c5593b0b5bf154ff9b2bbfb7a4e4ac` ; ses six fichiers sont repris depuis `a5e41f66`.

## Première intégration historique — a5e41f66

Ce passage réussit **217 tests et 22/22 parcours Clan**. Wolf conserve **18 contrôles réussis sur 19 exécutés, sur 32 prévus**.

Les [preuves Clan](qa/integration-a5e41f66/first-clan-run/report.json) et [Wolf](qa/integration-a5e41f66/first-wolf-run/report.json) restent rattachées à `a5e41f66` : source et checkout identiques, arbre de travail propre, zéro exception et zéro ressource demandée manquante dans les parcours observés. Wolf atteint les trois phases de la sentinelle, puis s’arrête au retour conseil → audience. La [capture](qa/integration-a5e41f66/first-wolf-run/failure.png) et la [page d’échec](qa/integration-a5e41f66/first-wolf-run/failure-page.txt) sont conservées. Cette recette reste incomplète ; ne pas convertir les 18 contrôles réussis en 32/32 ni attribuer ces résultats à la source courante.

Le [premier V94](qa/integration-a5e41f66/first-v94-run/first-v94-model-evidence.json) conserve **2 144 entrées strict PASS** et **75/75 V113**. Son [agrégat](qa/integration-a5e41f66/first-v94-run/aggregate-job.log), run `41877760809` / tentative 1 / checkout `7e14ce84ad01ee307e7f67a6408c8244cfe4fff8`, confirme les trois groupes. L’équivalence avec `a5e41f66` est consignée dans le reçu. Ce premier passage compte **12/15 workflows réussis** ; il ne qualifie pas l’inventaire courant de 2 151 entrées.

Les corrections locales ont leurs preuves séparées : [gantelet, 6/7 puis 7/7](qa/corrections-20261104/gauntlet-fix-local-result.json) sur la base `a5e41f66` corrigée, puis [/dev, 8/8](qa/corrections-20261104/dev-travel-integration-result.json) sur `a14983df`, avec son [journal](qa/corrections-20261104/dev-travel-integration.log). Le nouveau passage local V142 7/7 du reçu d’adoption reste distinct. Aucun de ces comptes n’est additionné entre versions.

## Tests locaux historiques — a5e41f66

Les [tests du mandat, du combat, de la sauvegarde et de l’audio](qa/integration-a5e41f66/mandate-model-tests-result.json) réussissent **60/60**, avec **0 échec et 0 test ignoré**, en **10,514 secondes**, sur `5daa00e1`. Le [journal](qa/integration-a5e41f66/mandate-model-tests.log) et le [relevé de source](qa/integration-a5e41f66/source.json) conservent la preuve locale et son lien avec l’arbre publié dans `a5e41f66`.

Le [second passage local des contrats Clan/Wolf](qa/integration-a5e41f66/clan-wolf-contract-tests-result.json) réussit **68/68**, avec **0 échec et 0 test ignoré**, en **26,985 secondes**, sur les mêmes sources. Le [journal](qa/integration-a5e41f66/clan-wolf-contract-tests.log) couvre `game-client-ship-flow`, `clan-ship-docking` et `clan-ship-save`. Les deux passages totalisent **128 tests locaux réussis (60 + 68), sur sept fichiers distincts**. Le premier passage CI Wolf sur `a5e41f66` reste une preuve historique incomplète.

## Build local historique — a5e41f66

Le [build local historique](qa/integration-a5e41f66/production-build-result.json) réussit sur cette même source en **316,430 secondes**, avec le code de sortie 0 : compilation Next.js webpack, TypeScript et contrôle CSS PIT. Le [journal](qa/integration-a5e41f66/production-build.log) et le résultat consignent la restauration du manifeste audio régénéré ; les sources suivies restent propres. Les contrôles native-origin et static-output sont ignorés avec la raison `not-exact-linux-vercel-build-root`. Cette preuve ne constate ni déploiement, ni smoke test, ni réussite de la CI distante.

## Classeur et contrôles de conservation

Le classeur final suit la qualification `c77c4ea3`, la fusion #106 et les preuves historiques attribuées à leurs sources. Les huit onglets, les 30 prompts et les 30 champs humains restent conservés. Le [rapport de vérification](workbook-verification.json) porte le recalcul, la conservation native et la revue des vues modifiées. Cinematique, Sprites et Prompts sont contrôlées sans reconstruction ; les 14 premières lignes de preuves gardent leur version 1.2.0.

L’[ancien rapport d’instantané](history/workbook-verification-before-c77-7b1c7686.json) conserve la revue du XLSX `7b1c7686…`, antérieur aux premiers résultats de `a5e41f66`. Le classeur final contient **58 formules recalculées, zéro erreur**, 30 avis humains ouverts et zéro approbation. Ses 15 vues modifiées ont été relues ; les 15 autres aperçus sont identiques aux vues déjà relues. SHA-256 : `0eec2649633d36be6ed5753f1b3c6336e1772c250e51d04584e91f4b940324f9` (**60 621 octets**).

## Source historique qualifiée

- Code local : `132b2f1fa4f0fdf0de096566cc1e1e33a6286d34`.
- Code publié : [`881b66dafc94ac007b7de907bc625b00af71dff8`](https://github.com/darknigthmare/yautja-la-longue-chasse/commit/881b66dafc94ac007b7de907bc625b00af71dff8).
- Arbre identique : `54804a2c3d3762f3ca3b0d621ff8401c50ab2c42`.

## Preuves historiques à relire

| Contrôle | Résultat et preuve |
|---|---|
| CI historique | [41827785792](qa/browser-41827785792/workflow-result.json), job `126567570188` ; types, lint et art réussis sur `881b66da` |
| Navigateur | [24/24 contrôles](qa/browser-41827785792/report.json), zéro exception et zéro ressource visuelle sollicitée manquante ; 21 captures conservées |
| Régressions | [247/247](qa/browser-41827785792/workflow-job.log) ; les 32 audio, 29 château/combat et 42 sauvegarde/intégration sont inclus |
| Compléments | [8 tests world-screens](qa/composition-132b2f1f/world-screens-result.json) séparés ; [24/24 rectangles de fond](qa/composition-132b2f1f/background-frames-audit.json) valides |
| Production | [Build réussi](qa/build-132b2f1f/build-result.json), code 0, 243,649 secondes sur le code local qualifié |

Les [preuves détaillées](workbook-evidence.json) gardent les huit exécutions navigateur historiques et leurs sources. Les premiers contrôles locaux restent rattachés à `3a03a9449895c95a78606f951b762e9b087686a6`, publié avec le même sous-système dans `530c6512c5c172cd577e0278b3fcd2457c2e3d80` après la fusion de deux fichiers Clan Ship. L’[historique du classeur 1.2.0](history/workbook-verification-1.2.0.json) reste distinct.

## Acquis et suite directe

Conserver les neuf salles, l’audience, les sceaux, les trois duels non létaux, les checkpoints, les huit plans d’arrivée de 62 secondes et les 30 PNG avec leurs copies WebP. Réutiliser les images et les prompts existants. La planète est cadrée en cercle, la jungle suit la bande du spawn et les annonces de victoire/défaite sont corrigées. Le Clan Ship AVP et le vaisseau personnel restent distincts.

Le mandat royal de `3aaded18` est implémenté : audience, trois repères aux archives, à la galerie et au conseil, sentinelle en trois phases sans soins entre les phases, puis retour à l’audience. Deux marques de clan sont attribuées une seule fois, avec un reçu lié à la campagne. L’entraînement conserve son dossier propre, sans butin de campagne.

Les six ambiances du château et les quatorze signaux de combat sont conservés. Dix nouveaux identifiants audio dans `wolfCastleAudio` couvrent l’exploration et le mandat, dont les portes, les pas et les sceaux. La comparaison exacte du film et l’écoute du mixage restent ouvertes. La revue artistique humaine des 30 images reste **À revoir**, avec **0 approbation humaine**.

La référence qualifiée de 247 tests, 24 contrôles et 21 captures reste celle de `881b66da`. La recette Wolf de `9da27c2a` réussit 32 contrôles et produit 27 captures. La qualification complète de `c77c4ea3` et la fusion #106 sont acquises ; elles conservent leurs propres reçus et ne réattribuent aucune preuve historique. Le Chromium local s’était arrêté avant tout scénario dans le relevé historique (`socket() failed: Operation not permitted`).
