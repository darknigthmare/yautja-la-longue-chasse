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

Le relevé `runtime-inputs.json` contient 2 121 entrées et a été généré puis
revérifié après le correctif de récupération groupée R7. Son SHA-256 est
`73156a62b5dd820b653605cacaf1033b6e88b2c4f8c4729d9984fda09d375a9e`.
Il suit le périmètre déclaré par les recettes Homeworld/Pit et leurs sources.

`local-validation.json` conserve les résultats, les limites de chaque contrôle
et les empreintes des dix journaux bruts du dossier `logs/` :

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
