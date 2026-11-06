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

## Actualisation pour le château Wolf et le mandat royal — 4 novembre 2026

Le relevé courant comprend le Clan Ship fusionné, le château Wolf, le mandat
royal, l’arrivée planétaire et la page de voyage temporaire `/dev` intégrée à
`main`. Il est reconstruit depuis la source qualifiée
`71826ae1d02563c73facced34ec8cfaa827aeb89` et son inventaire de 2 130 entrées,
SHA-256 `9ac1b87a8a280c7b211c1f6b70e2ca13c768852b3787c0b1abb4d3cb98f9b96b`.
Le checkpoint local de préparation est
`a14983dfcc21c31bb5c99d70973cbcdcbf073fd2`. Il reprend le mandat royal
`3aaded18daf303f69f90f51c212f5fe4ab55d72a`, conserve le gantelet choisi au
départ lors du premier montage de la chasse après l’arrivée, et intègre le
`main` `91cf274a88d8e2075fddb0514626ad32d800469f` ainsi que le correctif de
sélecteur `/dev` `9eed892c74d322d2b89296fac52ccce99cc3a62b`.
L’identité de ses entrées avec la publication est contrôlée lors de
l’intégration ; la recette distante identifie son commit effectivement exécuté.

| Mesure du relevé | Valeur |
| --- | --- |
| Entrées | 2 151 |
| Sources applicatives | 1 198 |
| Octets des entrées | 1 092 109 497 |
| Octets du document JSON | 400 041 |
| SHA-256 du document | `06d2bd524bbba6708a78cc45b1da6a68c4360568b8002afb55c2f2289aa0b072` |
| Identité Git du document | `99e1d5106a6f53d0a3b6a97a8e81d96b88c0b0a5` |

Les 2 118 entrées conservées ont chacune le même mode, type et identifiant de
blob Git entre la base et le checkpoint. Les 1 177 blobs applicatifs de la base
ont été relus et comparés à leurs tailles et SHA-256 qualifiés. Les onze sources
applicatives modifiées et les vingt et un ajouts ont été relus ; leur identifiant
Git, leur taille et leur SHA-256 ont été recalculés. Aucun chemin n’est retiré.
La couverture correspond exactement aux 1 198 fichiers applicatifs du checkpoint.
Le blob `3f544116fb68488c8ac22f8192deeb4259f7aead` de `GameClient.tsx` fige
notamment le gantelet du run accepté et refuse un propriétaire ou un identifiant
de départ différent.

Une seule entrée inventoriée hors `app/` change :
`tests/homeworld-geometry-recovery-integration-v112.test.mjs` reçoit
`recoveryStorage:undefined,` dans l’environnement de son contrôleur de test,
soit 26 octets supplémentaires. Cette version exacte provient de `main`
`91cf274a`. Les blobs avant et après, leurs tailles et leurs SHA-256 sont
vérifiés. Les sept imports et les graphes de dépendances V112 et V113 restent
identiques : chacun comporte sept chemins et huit résolutions. Aucun autre
changement hors `app/` n’est accepté par la préparation différentielle.

La portée de construction reste celle du générateur existant : les déclarations,
générateurs, dépendances, banques natives V112 et fixtures parcourues sont
contrôlés, ainsi que les résolutions réelles d’imports avec le parseur TypeScript
verrouillé. Le tri, l’unicité, les nombres et les sommes d’octets sont vérifiés.
Quatorze contrôles de préparation couvrent les reproductions exactes des
inventaires qualifiés et les refus de changement de portée, de variante du test
autorisé, de mode, de suppression ou d’autre entrée hors `app/`. Une revue
indépendante confirme que l’exception de 26 octets ne modifie pas la portée.

### Premier passage complet, conservé sur sa propre source

Le relevé de la publication `a5e41f66f6c3d194afae4f6f446b6c02f213d4c4`
contient 2 144 entrées et 1 092 055 158 octets. Son JSON de 398 945 octets a
le SHA-256 `b05b63ee443eb02bd88326d74ac2543a4f54ae9fc82a1e7b6a0f0306e3de5496`.
Le run V94 `41877760809` a réussi ses cinq jobs. Le job modèles
`126741827533` a accepté la commande stricte et réussi les 75 tests des
17 fichiers V113, sans échec ni test ignoré. Le job agrégateur `126759937769`
a validé les trois preuves sur le même run et la même tentative.
Le checkout synthétique `7e14ce84ad01ee307e7f67a6408c8244cfe4fff8` possède
exactement les mêmes fichiers que la tête `a5e41f66` (comparaison GitHub :
zéro fichier différent). Cette réussite ne qualifie pas les corrections et
les nouveaux fichiers du relevé courant de 2 151 entrées.

### Qualification attendue de la nouvelle publication

La préparation différentielle ne constitue pas une exécution locale du générateur
complet : les 682 fichiers historiques absents du checkout partiel représentent
1 023 219 037 octets. Le contrôle CI suivant conserve son assertion et relit les
fichiers réellement matérialisés sur la nouvelle source publiée :

```sh
node scripts/snapshot-runtime-v113.mjs --check docs/qa/current-integration-20261103/runtime-inputs.json
```

Les résultats de l’intégration sont attachés à leur source dans la
[PR #106](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/106).
Les freezes et certificats historiques ne sont pas modifiés. Les nouvelles
preuves navigateur Wolf épinglent le commit demandé et exigent un checkout
propre ; la recette Clan Ship contrôle également le blocage du départ royal
pendant l’amarrage, sa conservation après reprise et sa levée au désamarrage.

## Accès temporaires au château et aux arrivées — 4 novembre 2026

La page `/dev` passe de 31 à 49 destinations depuis le `main`
`36f765c980acdc207fe89730ab519c6f769b3881` : l’approche et les neuf salles
du château Wolf, puis les huit arrivées planétaires natives. Les états d’arrivée
restent dans la session temporaire ; ils ne débloquent pas les missions du
profil de campagne. Le passage vers la chasse reprend le contexte figé du run.

| Mesure du relevé courant | Valeur |
| --- | --- |
| Entrées | 2 151 |
| Sources applicatives | 1 198 |
| Octets des entrées | 1 092 126 256 |
| Octets du document JSON | 400 042 |
| SHA-256 du document | `97a73b2c2206a28e364dd6b3971abd150e98ce0cffea79508b3233dce681d775` |
| Identité Git du document | `5c658832749ab720821b2d6af67fbc081bade8c3` |

Ce relevé a été produit par `snapshot-runtime-v113.mjs --write`, puis accepté
par sa commande `--check`, avec les sources et les entrées natives réellement
matérialisées. Aucun chemin n’est ajouté ni retiré par rapport à la base ;
seules les entrées `app/dev/client.tsx`, `app/dev/destinations.ts` et
`app/dev/session.tsx` changent. Les documents historiques ci-dessus gardent
leurs octets et leur portée.

La recette navigateur est étendue à 20 parcours, dont les neuf salles Wolf,
les huit cinématiques, la pause, le passage direct et la fin naturelle vers
la chasse. Ses résultats doivent être lus sur le commit effectivement exécuté ;
la génération de cet inventaire ne vaut pas validation de ces interactions.
La PR de livraison conserve les résultats distants et leurs identités de source.

## Opérations du Clan Ship — 5 novembre 2026

Le relevé courant intègre les opérations de campagne, l’équipage et le modèle
tactique spatial de la version applicative 1.4.0, depuis le `main`
`9653e2e287e522ebf8867209a594033f8c1fb89b`. Les sept nouvelles sources
applicatives s’ajoutent aux 2 151 entrées précédentes. Les publications
historiques ci-dessus restent inchangées.

| Mesure du relevé courant | Valeur |
| --- | --- |
| Entrées | 2 158 |
| Sources applicatives | 1 205 |
| Octets des entrées | 1 092 273 567 |
| Octets du document JSON | 401 252 |
| SHA-256 du document | `b6a6e6f603aa1846da741329a183dbf1cc68eb3feff8f788e87f90471b23e612` |

Les 682 entrées historiques absentes du checkout partiel ont été matérialisées
depuis leurs objets Git déjà disponibles, après contrôle individuel de taille et
de SHA-256. Le générateur officiel `--write`, puis sa vérification `--check`,
ont donc relu les fichiers réels. Aucune substitution différentielle du
générateur n’est utilisée pour ce relevé.

La suite locale combinée, sur les sources publiées dans `f38446f4c049e2f0eb1878de881793398f3f4bbb`,
a réussi 296 tests sans échec ni test ignoré. Le seul changement applicatif
suivant corrige le nom du contrat en « Les traces d’Oseris-IV », conformément à
`mission.planetName` ; la CI suivante doit qualifier cette nouvelle tête. Le lint
strict des fichiers touchés et `npm run build:production` ont réussi. Le détail,
les empreintes des sources et les limites sont conservés dans
[`local-verification.json`](../../../production/clan-ship-20261104/qa-operations/local-verification.json).
Ces résultats ne remplacent pas les parcours dans Chromium : la recette
`qa-clan-ship-operations.mjs` prévoit 27 contrôles distincts, et le workflow
continue à exercer les 22 contrôles d’amarrage et d’intérieur existants. Les
preuves finales conservent le commit réellement exécuté et déclarent les
fixtures initiales, dont les deux résultats de chasse synthétiques du contexte
d’équipage complet. Aucune approbation artistique humaine n’est déduite de ces
contrôles.

## Cinématiques, incursions et camouflage d’approche — 5 novembre 2026

Le relevé courant est actualisé pour la version applicative 1.5.0 de la
PR [#114](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/114).
Il comprend les compléments audiovisuels de l’arrivée, les insertions par
capsule ou vaisseau posé, la triade et l’option de camouflage du vaisseau avec
sa réserve auxiliaire persistante. La base locale `57ccc1daf60643c8cc752981d58ae2e6c363992d`
et la publication précédente `34f1387144906696d4977120113a616a5d4d8709`
partagent l’arbre `cbbf116e5a3808ff8402f468f148e966ebede695` ; le présent
relevé inclut les modifications de camouflage qui les suivent.

| Mesure du relevé courant | Valeur |
| --- | --- |
| Entrées | 2 167 |
| Sources applicatives | 1 214 |
| Octets des entrées | 1 092 461 217 |
| Octets du document JSON | 402 812 |
| SHA-256 du document | `b292753aaaab82578d1526aa183711cd22dfb27077bcd4c21f2b441f310877e7` |
| Identité Git du document | `35bbc81036853017e13f14bdeac68b017d27ec4d` |

Le générateur officiel `snapshot-runtime-v113.mjs --write`, puis sa commande
`--check`, ont relu les sources et les entrées natives réellement présentes.
Les freezes, certificats et classeurs historiques conservent leur contenu.
Le script de recette V112 inventorié importe désormais les helpers réels
utilisés par les callbacks du cycle de chasse, sans remplacer les assertions
de conservation ni simuler leur résultat.

Les preuves de ce lot sont conservées dans
[`production/insertion-trio-20261105/`](../../../production/insertion-trio-20261105/README.md).
Le reçu navigateur `browser-34f1387` identifie explicitement le lot précédent,
antérieur au camouflage. Les nouveaux contrôles navigateur doivent qualifier
le commit publié avec le présent relevé ; la génération de cet inventaire
ne vaut pas validation du shader, des interactions ou du mix sonore.

## Consolidation des PR #114 et #117 — 6 novembre 2026

Le candidat **1.6.1** rapproche les cinématiques, la triade, le camouflage, les
capsules et les perspectives de la flotte avec l'intérieur personnel 2,5D de
#115. Il conserve la bible de #116 et les corrections de rig de #118 présentes
sur `main`. Les huit salles et les identifiants existants restent en place.

La résolution du test de gant conserve ensemble le contrôle structurel de
l'effet d'initialisation et les matrices avant-bras/lames de la correction V145.
L'inventaire courant est recalculé avec `snapshot-runtime-v113.mjs`, puis vérifié
avec `--check`. Les inventaires historiques et leurs attestations restent datés.

### Raccords de la bible réalisés

- **ALL-02 / QA-C04 :** recrutement, aptitude, affectation et départ en trio sont
  séparés pour Ka’rhek et Sa’keth. Le recrutement crée une entrée en réserve,
  sans affectation à une coque. Le registre v2 accepte les anciens registres v1
  valides en conservant leurs membres, coques, aptitudes et reçus.
- **QA-C09, portée registre et briefing :** la mise en réserve supprime seulement
  l'affectation. Elle ne guérit pas, ne rembourse pas et ne recrute pas une
  seconde fois. Les quartiers personnels et le réaménagement au chantier restent
  des éléments distincts à produire ; cette correction ne les déclare pas livrés.
- **QA-C21 :** les ordres Suivre/Tenir gardent le silence face à une patrouille,
  une suspicion ou une recherche. Le soutien exige un contact hostile actuel ou
  une attaque dirigée contre le groupe ; perte de contact et retraite le suspendent.
- **Commandes des pods :** une ancienne touche X personnalisée est conservée.
  La nouvelle action reçoit une touche libre, ou reste accessible par son bouton
  sans raccourci si aucune touche n'est disponible. Les conflits explicites
  restent refusés.

Les tests des capsules passent aussi par les writers/loaders de campagne, le
sidecar de chasse et l'archive intégrale : compte à rebours, fermeture/reprise,
écriture refusée, changement de propriétaire de session, destruction unique et
perte réelle de liaison radio pendant le déplacement. Aucun nouveau changement
du moteur de capsules n'a été nécessaire pour ces scénarios.

### Qualification du candidat

Le [relevé local](../../../production/qa/evidence/pr-114-117-integration-20261106/local-validation.json)
conserve les empreintes des sources observées et les journaux : **473/473 tests,
aucun ignoré**, build Next de production et lint ciblé strict réussis. Le lint
global relève **0 erreur et 38 avertissements** déjà présents hors de ces
correctifs ; sa passe optionnelle avec un plafond de zéro avertissement est
consignée en échec, sans la transformer en réussite.

Chromium local est bloqué par l'environnement. La qualification native doit donc
être lue dans les runs GitHub Actions de la tête publiée. Le workflow intérieur
2,5D couvre désormais les PR vers `main` et la branche cinématique, avec checkout
de la tête réellement soumise. Wolf conserve deux nouvelles captures du
recrutement en réserve et de l'affectation, avec observations du vrai stockage.
Les contrôles existants, fenêtres temporelles et rejets d'images restent actifs.

Les générations visuelles et l'égalité des exports ne constituent toujours pas
une validation artistique humaine ou une certification canonique 1:1. Les
quartiers conditionnels, autres compagnons, missions et suites de la bible non
implémentés par ces PR gardent leur statut de production précédent.

### Corrections issues de la première passe Actions

La première tête publiée `5be40efdd6e1b7fae67d5dda7677209820fc9034`
a permis de qualifier l'intérieur personnel, les vues de flotte et le vaisseau
de clan dans Chromium. Elle a aussi révélé des raccords de vérification qui
étaient absents des anciennes branches :

- Les contextes historiques V112/V113 restaurent maintenant leur manifeste
  audio original dans une copie privée et vérifiée. Les nouveaux sons des pods
  restent dans le jeu courant ; aucune capsule ou empreinte historique n'est
  remplacée. Les cinq suites de récupération concernées passent **40/40**.
- Wolf et les visites de développement matérialisent les nouveaux dossiers
  d'arrivée et leurs PNG sources. Les **53 tests** de ces assets passent après
  hydratation, dont les six précédemment rouges dans Wolf.
- Les tests isolés d'exploration et de manette reçoivent la vraie fonction de
  récupération des pods appelée par `stepGame` : **20/20 tests** passent, avec
  les assertions de sauvegarde, d'ordre des événements et de pause conservées.
- Le paramètre d'armure devenu inutilisé après V145 est retiré de son unique
  appel. Le gate V94 de lint strict passe sur **182 fichiers**, et les **13 tests**
  d'armure, de brassard et de gant restent verts.
- La recette de capture finale observe la première formation réellement debout
  et effectue la copie native avant les calculs de recadrage. La fenêtre de
  validité, les contrôles de fraîcheur, les rejets et les trois tentatives
  maximales restent obligatoires. Une ronde de sondage s'arrête au premier coin
  encore ancien ; la ronde admise et la copie complète doivent toujours vérifier
  les quatre coins frais. Trois cas de protocole couvrent les coins retardés et
  les copies refusées. Cette correction nécessite sa propre qualification native
  sur la tête corrigée.

Le [relevé des corrections CI](../../../production/qa/evidence/pr-114-117-integration-20261106/ci-corrections-local-validation.json)
conserve les journaux et les empreintes. Ces sous-suites recouvrent en partie les
473 tests de la première qualification ; leurs nombres ne sont pas additionnés
comme des tests uniques. Le premier relevé de lint global reste daté de cette
première passe. Les résultats natifs définitifs doivent être lus sur la dernière
tête de la PR, et non déduits des seuls succès partiels précédents.

### Deuxième passe native et correction de son instrumentation

La tête `e9287626acb0cc29d250c9cb6d87b36d833f0591` a confirmé les corrections
d'historique, de lint et d'assets. L'intérieur personnel passe 17 contrôles
natifs, les voyages isolés 20, le vaisseau de clan 22 contrôles de navigation
et 27 d'opérations. Les huit destinations de développement livrent chacune un
seul `HuntCanvas`, aussi bien par Skip qu'à la fin naturelle de l'arrivée.
Ces nombres décrivent des suites distinctes et ne constituent pas un total
unique de fonctionnalités ou de tests.

Le [reçu daté de cette passe](../../../production/qa/evidence/pr-114-117-integration-20261106/native-review-e9287626.json)
conserve aussi ses deux échecs :

- Wolf a franchi ses 472 tests et 21 contrôles du château, puis sa recette a
  attendu un ancien sélecteur du pont. Le départ utilise désormais le disclosure
  réel de l'intérieur 2,5D et son bouton accessible. Les vérifications du
  recrutement en réserve, de l'affectation, de l'énergie et des reprises restent
  présentes ; les futures captures 28/29 figurent aussi dans le résumé CI.
- La capture finale du trio en pod est passée au deuxième essai, mais les trois
  photographies du trio en vaisseau sont restées rejetées : la lecture après
  copie atteignait 62 000 ms. La fonction d'observation inchangée est maintenant
  compilée sur la session CDP avant la fenêtre, puis appelée directement avant
  et après la copie. Cela retire une couche de sérialisation du test. La scène,
  son horloge, ses pixels, la fenêtre valide et le nombre d'essais restent les
  mêmes. Une vérification supplémentaire compare les deux transports sur le
  vrai document déjà en pause pendant les préflights.

Les six tests locaux de protocole passent, dont cinq sur la parité des champs,
les quatre marqueurs, l'attente du dernier membre et les erreurs. Ils ne
constituent pas une exécution native. Les 496 assertions antérieures de la
recette spatiale sont conservées. Le correctif demande une nouvelle passe
Actions sur la tête publiée avant fusion ; les captures rejetées conservent
leur statut. La revue React des callbacks et des nouveaux boutons n'a trouvé
aucun autre blocage dans ces changements.
