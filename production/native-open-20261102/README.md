# V114 — nouvelles images natives, suivi toujours ouvert

Édition datée du 2 novembre 2026 : le [classeur V114](../YAUTJA_V114_SUIVI.xlsx) ajoute cinq feuilles au V113 et conserve ses **130 feuilles historiques à l’octet**. Le [manifeste portable](source-manifest.json) distingue images présentes, tentatives générées, sélection, admission, intégration, tests et validation humaine.

## Livraison

- **35 nouvelles cibles Homeworld** : 17 objets industriels/architecturaux et 18 objets de faune, montures, cages et énergie. **36 PNG bruts**, dont un essai de barrière rejeté, restent conservés avec prompts et reçus.
- **3 atlas de victime Xénomorphe pour Scar H7** : deux pages candidates avec 12 dessins de réaction sélectionnés, un premier atlas gauche rejeté pour contact visible avec les limites des cellules. Le NPC spécifique et la scène synchronisée ne sont pas admis ; le BODY Scar existant n’est pas redessiné.
- **39 nouveaux PNG portables** dans `archives/`, byte-identiques aux originaux de `image_gen.imagegen`. Les quatre PNG du premier lot V113 restent à leurs chemins historiques ; leurs trois IDs portent le total Homeworld à **38 cibles générées**.
- Les deux ascenseurs natifs déjà présents restent des faux négatifs historiques. La **Forge** réemploie six images de flamme existantes dans un prototype de développement qualifié : **zéro nouveau PNG Forge**, sans admission finale ni attestation R8.

Une seule variante candidate est retenue par nouvelle cible Homeworld. Ce lot ne livre pas vingt variantes par rôle. Les essais rejetés gardent leur statut exact. Tous les candidats restent **NON ADMIS**, sans intégration des nouvelles images au runtime ni validation artistique humaine. **56 exigences globales et 354 cibles artistiques restent ouvertes.** Le runtime composite R8 est en qualification séparée à la date de cet instantané.

## Intégrité et frontières

Les PNG gardent leurs dimensions natives réelles et tous leurs octets : aucun découpage, nettoyage d’alpha, redimensionnement, reflet ou recompression. Les marges alpha>0 échouées sont maintenues ; les seuils alpha>2/8 servent au diagnostic et n’accordent aucune admission. Les pivots et durées indiqués sont des propositions non testées dans le runtime. Les objets statiques ne livrent ni cycle natif animé, ni portes fonctionnelles, ni passages, ni collision ou gameplay.

Les manifests, prompts, reçus et comptes rendus originaux sont copiés à l’identique dans `archives/`. Leurs anciens chemins absolus et hashes d’application décrivent un **SNAPSHOT_HISTORIQUE** ; ces documents archivés ne sont pas exécutés et leurs chemins ne sont pas des dépendances actuelles. Les chemins opérationnels de `source-manifest.json` sont relatifs au dépôt et épinglés. Le build et la vérification ne lisent aucune source `app/` et ne nécessitent ni historique Git ni dossier `/workspace` externe. Aucun certificat R7, classeur V112/V113 ou coordinateur historique n’est réécrit.

Le guide `create-game-assets` et ses références copiées sont au commit immuable `19d93f97c9c1ea0f8b306e77aa81e0d3e352d3e9`. Leur [licence Apache-2.0](upstream/LICENSE) et [NOTICE](upstream/NOTICE) accompagnent les copies. Les références artistiques effectivement ouvertes sont conservées dans les reçus ; elles ont informé les prompts textuels, sans extraction de leurs pixels.

## Commandes

Depuis la racine du dépôt, avec Python 3 et Pillow déjà utilisé par les outils artistiques du projet :

```sh
python3 production/native-open-20261102/tools/build-native-open-workbook-v114.py --check
python3 production/native-open-20261102/tools/verify-native-open-workbook-v114.py
python3 production/native-open-20261102/tools/test-native-open-workbook-v114.py
```

La construction initiale utilise le premier script sans `--check`. La vérification relit les cellules des cinq nouvelles feuilles, compare toutes les parties historiques, réévalue l’alpha des 40 essais Homeworld et des 18 cellules Pit, et contrôle les empreintes des sources. Les tests de corruption vérifient notamment les changements de cellules/XML, d’identité, de pin et les promotions interdites. Aucun moteur Excel natif n’est exécuté ; la reproductibilité concerne les octets du classeur construit à partir des images conservées, pas une nouvelle génération identique des images.
