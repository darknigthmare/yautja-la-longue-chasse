# Historique de production PR15

La capsule `tests/fixtures/production-history-pr15-v107.json(.gz)` capture le commit fixe `d99604e18d4b185b57cc59cfbde0420b95acd0fd` de PR15. Elle utilise la capsule V106 `92e7c824fd80d6b8152855b3d66560448f8c48c0` sans la modifier, puis remplace exactement les deux bibliothèques et ajoute les deux registres statiques V614/V615.

Les31 sources privées incluent les scripts, fixtures et tests originaux. Les287 fichiers partagés ont chacun leurs SHA et tailles, dont les144 PNG cumulatifs V611–V615, les données et preuves de production et17 classeurs historiques. Aucun fichier image n’est réencodé. Le lecteur vérifie les originaux avant et après, reconstruit des sources privées en lecture seule et n’emploie ni Git ni réseau.

Les assertions de PR15 restent intégrales : delta strict de deux sources/deux registres, freeze historique963fichiers, bilans de5120lignes,973sélections et totaux d’assets propres au commit. Elles s’exécutent dans le vrai répertoire historique, sans changement global de répertoire. Les nouveaux fichiers V107 ne sont jamais ajoutés à l’allowlist PR15. Les preuves V106 ne couvrent pas le runtime V107 ; celui-ci doit avoir son gel et ses quatre recettes production.

Auteur reproductible : `python3 scripts/build-production-history-pr15-v107.py --check` (Git local uniquement à l’authoring). Lecteur et tests CI : `node --test tests/production-history-pr15-v107.test.mjs` et adaptateurs des productions historiques.

Archive :206901octets, SHA256 `4524f083f69335aadeab9c647980f4113afc565da29476ef7f2301009ce7e614`. Manifeste :72106octets, SHA256 `e8b408beceeb801baf0dc1b63e9d3597561f1fff218cc19a861c38c1862e6d7b`.
