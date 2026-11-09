# Annexe CI skinning / canopée — 9 novembre 2026

**Nouvelle CI : EN_ATTENTE. Optimisation de latence : NON_PROUVEE.** Cette annexe est livrée avant le prochain push et conserve des observations datées. Les résultats de `3a03ca990` ne qualifient pas les correctifs ultérieurs. Les verdicts de la prochaine tête seront publiés séparément dans la PR.

Le code corrigé est épinglé à [`dab4b7760863a645ca5bcf63934ee2baf820d7f7`](https://github.com/darknigthmare/yautja-la-longue-chasse/commit/dab4b7760863a645ca5bcf63934ee2baf820d7f7), précédé du correctif de manifeste audio [`1f9b009b20fa2e3354d4d511380e900e98e0cd4b`](https://github.com/darknigthmare/yautja-la-longue-chasse/commit/1f9b009b20fa2e3354d4d511380e900e98e0cd4b). Les fichiers de cette nouvelle annexe suivent la branche `codex/reprise-bible-chasse-20261109` ; aucune exécution future n'est attribuée au commit qui l'ajoutera.

## CI observée sur 3a03ca990

Le [snapshot final GitHub](final-ci-snapshot-3a03/commit-3a03ca99-final-workflows.json) recense **19 workflows terminés : 17 succès et 2 échecs**, sans relance. Le [premier snapshot](observed-ci-3a03.json), encore partiellement en cours, est conservé avec sa propre date. Les trois preuves V94 de la même tentative sont archivées dans `final-ci-snapshot-3a03/`.

| Exécution | Observation exacte | Preuves conservées |
| --- | --- | --- |
| [Skinnning, reprise sidecar et canopée — 42592671946](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/42592671946) | Succès ; journal du job : 16 PASS, 17 captures, `failure:null`. Checkout de fusion `51958bfc…`, même arbre Git que la tête `3a03ca990`. | [Reçu](durable-field-3a03/receipt.json), journal et métadonnées GitHub brutes. |
| [Pod — 42592671598](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/42592671598) | Refus du setup : `M public/audio/manifest.json` après build ; 0 contrôle et 0 capture. | [Rapport original](pod-42592671598/report.json), journal, [ZIP original](pod-42592671598/artifact.zip), empreintes des 3 membres. |
| [Spatial — 42592671826](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/42592671826) | 4 contrôles PASS, puis échec du trio : 3 acquisitions finales traversent la fin native à 62 s. Aucune preuve visuelle finale du trio acceptée. | [Rapport original](spatial-42592671826/report.json), journal, [ZIP original](spatial-42592671826/artifact.zip), empreintes des 46 membres. |

Les deux ZIP d'échec sont téléchargés, conservés octet pour octet, contrôlés par SHA-256 contre les métadonnées GitHub, puis par CRC et empreinte de chaque membre. Images, recadrages, vidéo et buffers natifs du ZIP spatial ne sont pas régénérés. Les trois captures rejetées restent rejetées.

Pour le succès skinning/canopée, le ZIP de l'[artefact 13661948968](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/42592671946/artifacts/13661948968) n'a pas pu être téléchargé localement : redirection Azure refusée et référence FileService sans lecteur local disponible. Son digest déclaré concorde avec le journal, mais le ZIP n'est pas rehashé, le rapport complet et les pixels des PNG CI ne sont pas relus. Les 16 PASS / 17 captures sont établis par le journal exact et les métadonnées du job.

## Correctifs et vérifications locales

Le manifeste audio versionné omettait `field-work`, `field-secure`, `canopy-grab` et `canopy-release`. Le correctif ajoute 614 octets et le contrôle teste désormais son égalité exacte avec le résultat du générateur. Le workflow Pod exécute les gardes audio. La [preuve rouge en lecture seule](audio-regression/red-proof.log) conserve le rejet du manifeste de `3a03ca990`, sans remplacement d'un fichier du dépôt. La première passe sans HEAD capturé et la passe explicite de 14 tests sur `1f9b009…` avec overlay sont archivées séparément.

La recette spatiale demande la composition CDP avant la photographie native pour examiner une réduction du délai d'acquisition. Les pixels CDP auxiliaires ne servent pas à qualifier la photographie finale. Horloge native, durée produit, garde Chromium 153, géométrie X11, contrôle des pixels, état debout/au sol et refus de traverser la fin restent applicables. Le [reçu local](spatial-cdp-local/execution-receipt.json) conserve le wrapper initial absent, le Xvfb utilisateur obtenu, le refus de Chromium 154 par la garde 153 puis le téléchargement officiel de 153 refusé par le proxy (403 `Domain forbidden`). **Aucune répétition finale locale n'a été exécutée ; aucun gain de latence n'est mesuré.** Le binaire Xvfb et son paquet ne sont pas livrés comme preuves.

Le pilote historique est archivé sous `spatial-cdp-local/driver.mjs.txt`, avec ses octets inchangés, afin que le lint global ne l'analyse pas comme code actif. Le reçu brut garde son nom original `driver.mjs` ; le vérificateur applique uniquement cette correspondance d'archivage.

La [passe finale locale sur le commit réel dab4b776](final-local-dab4b776/receipt.json) capture HEAD et empreintes avant/après, stables : **20 tests sur 5 fichiers**, lint strict de 3 fichiers, génération audio (44 slots, 22 fichiers fournis), contrôle des sources courantes et contrôle de l'inventaire runtime, tous avec code 0. Le générateur audio ne salit plus les fichiers suivis. Les cinq journaux bruts et commandes exactes sont joints. Cette passe ne remplace pas une exécution navigateur CI des correctifs.

L'index des 289 assets est repinné : 91 781 857 → 91 782 471 octets, unique changement d'asset dans `public/audio/manifest.json`. La [revue du repin](durable-field-3a03/asset-index-repin-review.json) contrôle les 289 fichiers et blobs Git, sans nouvelle exécution navigateur. L'inventaire officiel `runtime-inputs.json` reste identique, SHA-256 `5fd5c2829564ccc5a7498365f4e28ec32b99804957befff1806496a33bb8e83e` : le manifeste audio et la recette d'acquisition ne sont pas dans ses entrées déclarées.

## Conservation du lot Excel et de son contexte

Le [lot skinning/canopée précédent](../skinning-canopy-20261109/README.md), son Excel, son HTML, ses preuves, ses quatre documents de raccord et les 108 classeurs originaux sont inchangés. Les **404 fichiers** de [preserved-baseline.json](preserved-baseline.json) sont vérifiés contre `3a03ca990` et les octets courants, y compris les fichiers sparse lus via Git. Aucun nouveau classeur n'est créé et les huit lignes Restant originales ne sont pas requalifiées.

Le vérificateur gelé de l'ancien lot lie aussi ses entrées de source. Il refuse correctement le nouvel index repinné sur `dab4b776` ; ce refus attendu est [capturé séparément](frozen-context-3a03/newer-checkout-context.json). Les 68 entrées hors BASE correspondent toutes à Git `3a03ca990` ; seule la fixture d'index diffère sur `dab4b776`. Les attentes historiques ne sont pas modifiées.

Le même vérificateur gelé est réellement [réexécuté avec succès](frozen-context-3a03/receipt.json) dans un clone sparse temporaire détaché exactement sur `3a03ca990`, avec objets Git locaux partagés : 9 feuilles, 22 critères, 5 113 cellules, 601 liens, 108 originaux et 8 Restant. Ses 412 fichiers historiques uniques sont son propre périmètre, distinct des 404 fichiers protégés de cette annexe. Excel natif n'a pas été lancé. Cette réussite vérifie la livraison historique dans son contexte ; elle ne qualifie pas le nouveau runtime.

## Vérification de cette annexe

Depuis la racine du dépôt :

```sh
python3 production/skinning-canopy-ci-20261109/verify-integrity.py
```

Le vérificateur lit le manifeste SHA-256 de l'annexe, les ZIP originaux, les reçus, les références Git épinglées et les 404 fichiers protégés. Il n'exécute ni navigateur, ni génération d'assets, ni écriture de document. `status.json` garde explicitement la prochaine CI `EN_ATTENTE` et la latence `NON_PROUVEE`.
