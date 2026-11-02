# CI V113/V114 — modification bornée et rejeu dans un vrai clone partiel

Le seul fichier du dépôt modifié par cette tâche est `.github/workflows/open-production-v113.yml`, SHA256 **`24b4a9913cd4f1287e20a12b5bfa4ba43480eb857d41bd07d185ca34ad7a8e62`**. Ses contrôles V113, déclencheurs, checkout, permissions et profondeur3 sont conservés. Les noms du workflow/job indiquent désormais V113/V114.

L’ajout crée une venv temporaire isolée, installe **Pillow==12.3.0** avec `--only-binary=:all:`, puis exécute `verify-native-open-workbook-v114.py`, `build-native-open-workbook-v114.py --check` et `test-native-open-workbook-v114.py`. Aucun helper, manifeste, PNG ou classeur V114 strict n’est modifié.

## Couverture et syntaxe

Les **198 motifs existants**, dont196uniques, couvrent déjà les **208pins V113 et152pins V114**. Aucun chemin n’a été ajouté : `/production/` contient les trois tools V114, son classeur et toutes ses archives ; les autres entrées couvrent les anciens produits et helpers. Les152sources V114 activent également les déclencheurs PR/push. YAML est parsé ; les **huit blocs `run`** passent `bash -n`. La comparaison avec le workflow d’origine confirme que ses quatre anciens blocs sont identiques et gardent leur ordre.

La [revue indépendante](independent-workflow-review.json) confirme ces points et ne revendique aucun clone ou test produit qu’elle n’a pas exécuté.

## Exécution réelle indépendante

Le dépôt a été cloné depuis **`https://github.com/darknigthmare/yautja-la-longue-chasse.git`**, branche **`codex/runtime-v113-r8-20261102`**, avec `--filter=blob:none --no-checkout --depth=3 --single-branch`. Il possède son propre `.git`, sans lien ni partage avec le Git de travail. Le HEAD fixé est **`837684333b42ee1a5e3a0be9ce1967e2486a2fd3`**.

Les198motifs exacts du candidat ont été transmis à `git sparse-checkout set --no-cone --stdin`, puis matérialisés ; les octets du fichier sparse sont identiques. Le vrai commit historique `03cf51badd450338d748da55599a317a71debd28` est ensuite fetché dans ce seul clone, conformément à l’étape existante. Son HEAD reste8376843. Les contrôles lisent les sources clonées ; aucun lien vers le workspace partagé ne les remplace.

Les huit blocs de commandes du **workflow candidat** ont été exécutés dans ce clone, dans leur ordre exact, avec Bash `-e -o pipefail`. La transition `$GITHUB_PATH` est reproduite après l’installation dans `$RUNNER_TEMP/v114-python`. Le candidat CI n’est pas prétendu déjà contenu dans le commit produit8376843 ; sa version exacte est conservée séparément dans `workflow-candidate.yml` et `workflow-run-blocks.json`.

| Étape | Résultat réellement observé | Journal brut |
| --- | --- | --- |
| Fetch historique sans déplacement du checkout | PASS | `actual-step-01.log` |
| V113 construction `--check` | PASS,130feuilles, SHA`082ccfdd…` | `actual-step-02.log` |
| V113 vérification autonome | PASS,122historiques et5637cellules | `actual-step-03.log` |
| V113 tests de corruption/source | **5/5 PASS** | `actual-step-04.log` |
| Venv et Pillow12.3.0 | PASS, package chargé depuis la venv | `actual-step-05.log` |
| V114 vérification autonome | PASS,135feuilles/130historiques,1301cellules,43PNG dont39nouveaux,174mesures alpha | `actual-step-06.log` |
| V114 construction `--check` | PASS, SHA`1367ac28…` | `actual-step-07.log` |
| V114 tests de corruption/protection | **10/10 PASS** | `actual-step-08.log` |

Le [résultat machine du clone](real-clone-verification.json) confirme208/208 et152/152chemins réellement matérialisés. Quatre sources applicatives historiques V113 diffèrent des octets courants : leurs vraies préimages03cf sont résolues par le mécanisme Git épinglé existant. Aucun pin historique n’a été actualisé silencieusement. Les152pins V114 correspondent tous aux octets actuels clonés. Le checkout produit est propre après les commandes et son HEAD est inchangé.

Le wheel **`pillow-12.3.0-cp312-cp312-manylinux_2_27_x86_64.manylinux_2_28_x86_64.whl`**,6940830octets, a été réellement téléchargé depuis l’index public ; SHA256 `78cb2c6865a35ab8ff8b75fd122f6033b92a62c82801110e48ddd6c936a45d91`. L’étape pip de la venv a ensuite été réellement exécutée ; il ne s’agit pas de se reposer sur le Pillow ambiant du workspace.

## Barrière et limites

Le workflow est à la barrière sans nouvelle écriture. Aucun Git partagé, aucune source gelée ni aucun des146produits V114 stricts n’a été modifié. Aucun PR ou commentaire externe n’a été créé. Root prépare le commit CI séparé et gère l’autre ajustement de fetch runtime.

Ce sont des contrôles locaux sur un **vrai clone réseau**, avec les commandes exactes du candidat ; ce n’est pas une exécution observée de GitHub Actions sur Ubuntu24.04. Ils ne qualifient aucun gameplay, validation artistique humaine ou nouveau certificat runtime. Les journaux, motifs, versions et empreintes sont conservés dans ce dossier hors dépôt.
