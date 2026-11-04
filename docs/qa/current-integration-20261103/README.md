# Contrôles de l’intégration consolidée du 3 novembre 2026

Ce dossier reçoit les relevés du code consolidé. Les documents V112 et V113 déjà
publiés conservent leurs octets, leur commit de référence et leur portée d’origine.
La réussite d’une capsule historique ne certifie pas le runtime actuellement livré.

## Répartition du workflow

`audit-v94.yml` conserve les contrôles existants dans trois groupes indépendants.
Une défaillance ne doit pas annuler les deux autres groupes.

| Groupe | Contrôles |
| --- | --- |
| `application` | Compilation, lint, HTTP et interactions réelles dans Chromium. |
| `models` | Assertions sur les modèles courants et relevé des entrées du runtime consolidé. |
| `history` | Publications et classeurs immuables, provenance datée et intégrité des sources courantes contre `HEAD`. |

Chaque groupe publie une preuve JSON seulement après la réussite de toutes ses
étapes. Le résultat obligatoire conserve son nom antérieur et exige les trois
preuves, avec le même `run_id`, `run_attempt` et commit. Un résultat matriciel
global `success` ne suffit pas. Un groupe absent, annulé, incomplet ou provenant
d’une tentative précédente fait échouer le contrôle obligatoire.

**Relancer les trois groupes ensemble.** Une relance limitée aux seuls jobs en
échec ne peut pas réutiliser les preuves de la tentative précédente.

## Provenances contrôlées séparément

| Ensemble | Publication ou runtime épinglé | Vérification |
| --- | --- | --- |
| R7 | Publication `03cf51badd450338d748da55599a317a71debd28`, runtime `bda14a95aa8c9e6cf37039e2d67ea1544a8e8de1` | Les neuf assertions et les trois commandes originales, dans leurs fichiers privés ; les tests d’intégrité restent actifs. |
| Inventaire V112 | Publication `ebcb970df10c07a5d2f309411e2f968b13c9aef8`, sources `f67b3996e7f11b86f48fc6e77ef16a39121c504a` | Le contrôleur original vérifie ses 2 500 fichiers dans la publication exacte. |
| Production V113 | Publication `837684333b42ee1a5e3a0be9ce1967e2486a2fd3`, runtime `719fe0d77e65be5349b76f507938309f56a67619` | Le freeze et l’assertion de production d’origine sont exécutés par `tests/v113-production-history.test.mjs` dans la capsule. |
| Coordination du 1er novembre | Source `1e5a8fbc8553e0d68991589f54aa1ef4dcab0a37` | Le générateur et le lecteur d’origine vérifient leurs octets dans la capsule : 33 PR observées et 27 classeurs, sans remplacer cet inventaire par les fichiers plus récents. |
| Sources consolidées | `HEAD` du checkout exécuté | `node scripts/check-hunt-integration-source-v112.mjs --current` compare les fichiers suivis et leurs blobs Git à ce commit, puis émet l’empreinte du nouvel inventaire sans réécrire l’ancien. |
| Entrées du runtime consolidé | Nouveau relevé dans ce dossier | `snapshot-runtime-v113.mjs` conserve la vérification des sources applicatives et des entrées natives ; aucun ancien certificat ne lui est attribué. |

Le commit `f67b3996` est disponible sur GitHub mais n’est pas un ancêtre du commit
de consolidation `71d2eabbe9d700a019a67c05910b456dcdb11a4c`, même avec un historique
complet. Réduire cette erreur à un checkout shallow aurait masqué la différence
entre l’inventaire daté et les sources fusionnées. Les vérifications courantes
utilisent `HEAD` ; le checkout CI peut conserver sa profondeur de trois commits.

Les capsules qui empruntent des objets Git reprennent aussi les limites shallow
dans leur dépôt privé. Emprunter seulement les objets faisait interpréter les
parents absents comme un historique corrompu lors du fetch. Le test
`tests/historical-git.test.mjs` reproduit ce transport avec un véritable dépôt
shallow et vérifie que le dépôt du lanceur reste inchangé.

Le bootstrap R7 regroupe aussi les préimages absentes dans un unique fetch privé.
Il relève d’abord les empreintes courantes et ne demande que les blobs nécessaires
déjà identifiés dans l’arbre historique. Les lectures suivantes désactivent le
lazy fetch ; chaque fichier garde ses contrôles de taille, SHA-256 et SHA-1 Git.
Dans le scénario local sans objets, 65 préimages représentant 2 078 553 octets
sont récupérées en un lot ; le test passe en 45,6 secondes. La limite du test
reste de 240 secondes, celle d’une commande Git de 45 secondes et celle de la
préparation de 480 secondes. Le dépôt source vide conserve ses objets, refs et
HEAD. Les règles sparse de la CI couvrent les 1 895 entrées du manifeste R7.

## Établir le nouveau relevé du runtime

Après intégration de tous les correctifs et matérialisation des sources requises,
créer le relevé distinct suivant, puis le vérifier et l’inclure dans le commit de
livraison :

```sh
node scripts/snapshot-runtime-v113.mjs --write docs/qa/current-integration-20261103/runtime-inputs.json
node scripts/snapshot-runtime-v113.mjs --check docs/qa/current-integration-20261103/runtime-inputs.json
```

Le workflow vérifie ensuite ce fichier avec `--check`. Il n’exécute pas `--write`
pendant la CI. Les sources courantes doivent aussi passer `--current` après leur
commit. Ne pas remplacer `docs/v113-runtime-freeze.json` ni les deux certificats
historiques pour faire correspondre leurs anciennes observations au code actuel.

## Actualisation du relevé pour la page `/dev` — 4 novembre 2026

Le relevé courant inclut désormais les sources de la page de voyage développeur
livrées par la PR #108, fusionnée dans
`91cf274a88d8e2075fddb0514626ad32d800469f`. Les sections suivantes conservent les
observations datées des relevés précédents ; leurs empreintes et leurs preuves
ne sont pas attribuées à cette nouvelle version.

Le run V94 `41879683016`, job modèles `126749379260`, avait correctement refusé
le document antérieur : il décrivait 2 130 fichiers et 396 560 octets JSON, alors
que le générateur calculait le nouveau document de 397 656 octets. L'étape
s'arrêtait à cette comparaison, avant de lancer les modèles V113 courants.

Après matérialisation des 347 entrées manquantes du checkout partiel, les
commandes officielles `snapshot-runtime-v113.mjs --write` puis `--check` ont été
exécutées sur les fichiers réels et ont toutes deux terminé avec le code 0.
Le second passage confirme les mêmes octets et la même empreinte que le premier.

| Mesure du relevé actualisé | Valeur |
| --- | --- |
| Entrées | 2 137 |
| Octets des entrées | 1 091 814 923 |
| Octets du document JSON | 397 656 |
| SHA-256 du document | `357786a578acc8dffbbf261b56cb720eb297662c6da4ba3637954d76b97b2dbb` |

Le delta comporte les sept nouveaux fichiers `app/dev/`, la modification de
`app/game/HomeworldHub.tsx` pour la session éphémère, et l'adaptation de sa fixture
`tests/homeworld-geometry-recovery-integration-v112.test.mjs`. Aucune entrée n'est
retirée. Les déclarations de périmètre et les générateurs restent inchangés.

Les freezes V111/V112/V113, `local-validation.json` et les reçus de production
du Clan Ship restent inchangés. Ces derniers désignent explicitement le relevé
au commit `71826ae1d02563c73facced34ec8cfaa827aeb89` ; leurs anciennes empreintes
restent donc exactes. Cette actualisation ne constitue pas une nouvelle
attestation de ces livraisons. Le contrôle Git `--current` et les résultats
distants sont à lire sur le commit de publication de la correction.

## Actualisation du relevé pour le Clan Ship — 4 novembre 2026

Le fichier courant `runtime-inputs.json` décrit désormais le périmètre du jeu
au commit `22fad968311d252310fe2fde281f71564a401a64`. Le checkpoint local
`83f65cb013831bdebcdc9344fa386e6f2f6be4d7` possède exactement le même arbre Git,
`3e51bbc023720057deb28696bd16bbaa6c8b6d82`. Les captures et les 22 scénarios du
Clan Ship conservent leur source qualifiée `22fad968`.

| Mesure du relevé actualisé | Valeur |
| --- | --- |
| Entrées | 2 130 |
| Octets des entrées | 1 091 761 004 |
| Octets du document JSON | 396 560 |
| SHA-256 du document | `9ac1b87a8a280c7b211c1f6b70e2ca13c768852b3787c0b1abb4d3cb98f9b96b` |

La préparation utilise une reconstruction différentielle contrôlée depuis
`6191e7b4ae7af4472e8c8c1fc242bf3d2e9e6cef`. L'ancien relevé contient 2 124
entrées et son SHA-256 est
`2da02ca09cf92dd4b461b58e06e151d5c5c03f1f61a75b5e5864f00780b35d4e`.
Les 2 116 entrées conservées ont chacune le même mode, le même type et le même
identifiant de blob Git dans cette base et dans la source qualifiée. Aucun de
ces fichiers inventoriés n'avait changé sur `main` avant la PR #104. Les
1 171 sources applicatives de la base ont aussi été relues depuis leurs blobs :
leurs tailles et leurs SHA-256 correspondent tous au relevé précédent.

Les six ajouts applicatifs et les huit sources applicatives modifiées ont été
relus dans le checkout. Leur SHA-1 Git correspond au blob de la source qualifiée ;
leurs tailles et leurs SHA-256 ont été recalculés. La liste résultante couvre
exactement les 1 177 chemins applicatifs de cette source. L'unicité des chemins,
leur tri, le nombre d'entrées et la somme des octets sont vérifiés avant écriture.
Les déclarations d'entrées, les générateurs et leurs dépendances conservées
restent identiques à la base.

Ce checkout partiel manque 699 fichiers du relevé précédent, dont 682 blobs
absents du magasin Git partagé, représentant 1 023 219 037 octets. Aucune
exécution locale complète de `snapshot-runtime-v113.mjs --write` ou `--check`
n'est revendiquée. Le run V94 `41818690146`, job `126536529650`, a atteint la
comparaison finale du générateur après ses contrôles des sources natives ;
il a refusé l'ancien document de 395 554 octets face au relevé courant calculé
de 396 560 octets. Il n'est pas présenté comme une validation réussie.

La commande CI stricte reste inchangée et doit valider tous les octets réellement
matérialisés après publication de cette correction :

```sh
node scripts/snapshot-runtime-v113.mjs --check docs/qa/current-integration-20261103/runtime-inputs.json
```

Les freezes V111, V112 et V113 et les deux certificats de production V113
conservent leurs identités Git. Cette actualisation d'inventaire ne leur attribue
aucune nouvelle observation et ne change pas le code du jeu qualifié.

## Ressources des modèles V113

Les trois suites de ressources utilisent 59 fichiers réels, soit 184 049 750
octets : six flammes originales V33, trois PNG PHG V113, six atlas V125 à V132 et
44 reconstructions PHG V85. Le checkout CI contenait déjà les six flammes ; les
53 autres chemins ont été ajoutés exactement, sans élargir le checkout à tous
les assets. Les chemins déclenchent également le workflow lors d’une modification.

Après matérialisation de ces fichiers, les 15 assertions de
`homeworld-forge-fire-v113`, `hunter-chromatics-v113` et `hunter-materials-v113`
réussissent. Ces résultats vérifient l’existence des matériaux et les contrats
techniques concernés ; ils ne constituent pas une nouvelle revue artistique.

## Interruption du premier audit

Le job original a commencé à 16:23:31 UTC et s’est arrêté sur signal du runner à
17:17:44 UTC, après 54 minutes et 13 secondes. Son arrêt ne démontre ni une
assertion produit échouée à l’étape V113, ni le dépassement de son timeout de
120 minutes. La répartition sur trois runners conserve les contrôles et réduit
la durée cumulée supportée par chaque runner ; le résultat distant doit être
observé sur le commit effectivement publié.

## Relevé et résultats locaux de cette intégration

Le relevé de l’intégration du 3 novembre, conservé au commit
`6191e7b4ae7af4472e8c8c1fc242bf3d2e9e6cef`, contient 2 124 entrées et
1 091 654 943 octets d’entrées. Il a été régénéré puis vérifié après
l’intégration du menu et de la version visible de la PR #102, dont le head est
`7799c81b13e869ef7588014529f26ac0eff0a572`, puis du routage vers les images natives
épinglées par un manifeste Git et de la restauration privée des preuves partagées.
Son SHA-256 est
`2da02ca09cf92dd4b461b58e06e151d5c5c03f1f61a75b5e5864f00780b35d4e`. Il suit le périmètre déclaré par les recettes
Homeworld/Pit et toutes les sources applicatives. Le contrôle `--current` couvre
également les sources suivies de construction, dont le nouveau
`scripts/game-build-identity.ts` et `scripts/native-asset-origin-v1.mjs` ; le relevé Homeworld/Pit seul n’est pas présenté
comme un inventaire exhaustif du packaging de production.

Le relevé intermédiaire après intégration du menu reste attaché au commit
`626cf355a1c11b1d6f2e3fdfc45d77450f1d2d3f` : 2 123 entrées,
1 091 638 676 octets et SHA-256
`77b52110875426e754d2eba27c9a930f4b41662c9e36d594277247ab6a2cb04f`.
Le nouveau relevé inclut les modifications de configuration Next et du contrôleur
nécessaires au mode de livraison allégé ; il ne remplace aucun freeze V112/V113
historique.

Le checkpoint préparatoire `0ab40818fc0d3ff8727d853f8b552db94793c60e`
conserve le relevé intermédiaire du mode natif : 2 123 entrées,
1 091 644 798 octets et SHA-256
`b3f9456b0da69ba8631189ac197b758c3d1960726929a28192da5e1727c6c15b`.
Le relevé final ajoute le helper effectivement importé pour les préimages
partagées et actualise ses dépendances.

Le premier relevé de 2 121 entrées reste disponible dans le checkpoint d’audit
`9e8aed40ba8cebc1382bf67bafff2e29973b21da`, arbre
`952b78062d964b1f253223a52952b1560acc639d`, avec son SHA-256 d’origine
`73156a62b5dd820b653605cacaf1033b6e88b2c4f8c4729d9984fda09d375a9e`.
`local-validation.json` désigne explicitement ce commit pour cet ancien relevé.
Ses résultats gardent leur date et leur portée ; ils ne sont pas attribués à la
révision ultérieure de l’interface.

`local-validation.json` conserve les résultats, les limites de chaque contrôle
et les empreintes inchangées des dix journaux bruts du dossier `logs/` :

| Contrôle local | Résultat |
| --- | --- |
| Persistance, étape 27 complète | 174 tests réussis. |
| Homeworld V110, étape 50 complète | 51 tests réussis. |
| Sélection commune des étapes 52 et 54 | 117 tests réussis. |
| Assertions V110 d’origine dans leur capsule | 9 tests réussis, dont le parcours historique de 1 418 pas. |
| Bootstrap R7 sans objets locaux | Scénario ciblé réussi, 65 blobs en un fetch, délai inchangé. |
| Intégrité R7 | 3 contrôles ciblés réussis. |
| Gardes Git et transport shallow | 4 tests réussis. |
| Provenance V112 | 3 tests réussis. |
| Ressources des trois suites V113 | 15 assertions réussies. |
| TypeScript | Commande terminée avec le code 0. |

Ces groupes se recouvrent ; leurs nombres ne doivent pas être additionnés.
Les journaux des scénarios R7 filtrés conservent les cas écartés par leur filtre ;
la CI exécute la suite complète. Les résultats distants et la livraison sont
identifiés séparément dans la PR et dans les reçus de déploiement.

## Livraison réelle et derniers contrôles

La livraison Vercel `453abb856c867d0c27428119007ca6d43f6c1fda` est observée
`READY` sur l'URL canonique. Son code provient de
`2b0c747652f145b5e0918438e591a034b1f75c2b` ; ses images sont épinglées sur
`26ade5671f518f7befefb77b7d85d1a2a4915b3b`.

Les reçus suivants conservent des portées distinctes :

- `production-453abb85-provenance.json` compare la livraison, sa source et le
  checkpoint local du garde renforcé. Les 1 171 fichiers applicatifs sont
  identiques ; le garde d'exhaustivité supplémentaire n'est pas présenté comme
  déployé. Le build réel satisfait toutefois sa condition, avec 378 sorties
  vérifiées pour 378 fichiers conservés.
- `production-453abb85-http.json` vérifie huit ressources représentatives :
  HTTP 200, types MIME attendus et octets identiques à leurs blobs Git, dont
  une image avec un espace encodé dans le chemin.
- `production-browser-453abb85.json` et `production-menu-453abb85.jpg`
  documentent le menu réellement publié, les quatre rubriques, les retours
  clavier et de focus, l'avertissement de spoilers et les archives visuelles.
  Les 19 éléments image inspectés décodent leurs 18 ressources natives distinctes.
  Ce parcours ne certifie pas une partie complète, une manette physique ni
  l'intégralité des 7 352 images.
- `native-output-completeness-red.log` montre les deux régressions avant le
  correctif d'exhaustivité ; `native-output-completeness-tests.log` conserve
  les 49 tests réussis après correction. Le mode V89 reste également testé.
- `dressing-assets-correction.log` conserve les huit tests réussis après
  matérialisation des deux PNG requis par le test d'occlusion V113. Les assertions
  restent identiques à celles du run distant qui avait détecté le fichier absent.

La procédure de livraison et les identités Git sont détaillées dans
[`deployment-native-assets-v1.md`](../../deployment-native-assets-v1.md).
Les résultats distants de l'intégration finale doivent toujours être lus sur
son propre SHA et sa propre tentative de workflow.

## Retour du premier run de la PR #103

`pr103-run-receipt.json` conserve le résultat terminé du run `41709313665`
sur le head `626cf355` et le checkout de fusion `8da4169e`. Le groupe application
a réussi et fourni sa preuve. Les groupes modèles et historique ont échoué ;
le contrôle obligatoire a donc refusé l'intégration. Les dix workflows annexes
ont réussi. Ce relevé décrit cette exécution antérieure, pas le résultat d'une
révision corrigée.

Les journaux associés isolent trois problèmes : le PNG du dressing absent du
checkout, la négociation Git lors du fetch groupé de blobs R7 promis, et la
lecture du classeur R7 courant par une capsule qui attend le classeur V112
original. Les deux versions du classeur doivent rester distinctes :
9 433 700 octets pour R7 et 9 383 908 pour cette capsule V112. Les corrections
ne doivent pas remplacer les pièces courantes par les anciennes, ni retirer
les assertions qui ont détecté ces écarts.

La régression `r7-promised-blob-regression.json` reproduit le défaut du fetch
sur un véritable alternate shallow filtré. Après correction,
`r7-prefetch-correction.log` conserve la commande CI complète réussie :
11 tests de premier niveau, les neuf assertions R7 et leurs trois commandes
d'origine, ainsi que les six assertions de connecteurs. Le bootstrap depuis
un dépôt vide récupère 75 blobs en un batch, en 28,523 secondes. La commande
complète dure 140,314 secondes ; les limites restent inchangées.
`r7-prefetch-correction.json` précise le commit local et l'environnement de
cette exécution. Ce résultat n'est pas présenté comme une nouvelle CI distante.

Pour la capsule V112 supplémentaire, `v112-shared-preimages-verification.json`
lie les deux empreintes du classeur, les manifestes inchangés et les résultats
locaux. Les journaux `v112-shared-preimages-check-green.log`,
`v112-shared-preimages-original-tests.log` et `v112-shared-preimages-unit.log`
conservent cinq commandes originales réussies, 26 tests enveloppants dont les
22 suites originales, et cinq contrôles du helper. Les 1 507 fichiers partagés
courants restent identiques. La reproduction de l'erreur initiale figure dans
`v112-shared-preimages-red.log`. Ces preuves restent historiques, avec
`currentRuntimeCovered: false`.
