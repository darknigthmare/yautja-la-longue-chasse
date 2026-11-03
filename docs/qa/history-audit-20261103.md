# Audit historique après consolidation — 3 novembre 2026

Base examinée : `71d2eabbe9d700a019a67c05910b456dcdb11a4c`.

## R7 : frontière Git du checkout shallow

L'étape R7 échouait avant ses assertions historiques, pendant `ensureCommit`, avec
`fetch (exit 1)`. Le checkout CI a une profondeur de trois commits. Le dépôt privé
R7 empruntait ses objets Git via `objects/info/alternates`, sans reprendre sa
frontière `shallow`. Git pouvait alors parcourir les refs du dépôt prêteur en
supposant à tort que leurs parents étaient disponibles.

La reproduction locale utilise un véritable clone shallow, un fetch filtré
`blob:none` et un ancien commit absent du clone. Sans la frontière privée, Git
répond `Could not read`, `bad object` et `remote did not send all necessary
objects`, avec le statut 1. Avec une copie privée de la frontière, le même fetch
réussit. Le test vérifie aussi que HEAD, les refs, la frontière et les packs du
dépôt prêteur restent inchangés.

`scripts/lib/historical-git.mjs` installe désormais les alternates et cette
frontière avant le fetch. Le helper conserve également le diagnostic stderr de
Git en expurgeant les valeurs d'authentification. Les commits, arbres, empreintes,
neuf assertions et trois CLI historiques de R7 restent inchangés. Le correctif ne
nécessite ni nouveau secret ni extension du sparse checkout.

## V112 : une preuve datée doit retrouver sa publication

Les deux premières commandes de l'étape 58, l'audit des chantiers et la livraison
native Pit, avaient réussi. L'échec venait ensuite du contrôle de l'inventaire
`docs/qa/v112-hunt-integration/source-inputs.json` : sa référence source
`f67b3996e7f11b86f48fc6e77ef16a39121c504a` n'est pas un ancêtre du main consolidé.

Cet inventaire a été publié au commit
`ebcb970df10c07a5d2f309411e2f968b13c9aef8`, dont f67b est le parent. Il décrit
2 500 fichiers totalisant 128 194 222 octets. Le document de 436 904 octets garde
son SHA-256 `bcea1165180bfd1b3d84589ef8c51b6638e0051451ae3e8f085b895ff4b32bbc`.

`scripts/check-hunt-integration-source-history-v112.mjs` reconstruit ces entrées
dans des fichiers privés, à partir des fichiers actuels qui correspondent déjà
ou des blobs de la publication épinglée. Il vérifie les identités Git, les
empreintes et l'index exact, puis exécute le script original inchangé avec
`--check`. Il recontrôle ensuite les entrées historiques et les fichiers actuels.
Son résultat annonce explicitement `currentRuntimeCovered=false`.

Le mode `--current` du contrôleur courant vérifie séparément les fichiers suivis
contre les blobs de HEAD et calcule une nouvelle empreinte d'inventaire. Il ne
modifie pas le document daté et n'annonce pas d'exécution du runtime.

## Vérification effectuée

```sh
node --test --test-reporter=spec --test-concurrency=1 \
  tests/historical-git.test.mjs \
  tests/hunt-integration-source-history-v112.test.mjs
```

Résultat : cinq tests réussis, aucun échec ni test ignoré, en 13,3 secondes.
Le contrôle historique V112 original a vérifié l'intégralité de ses 2 500
entrées. Les tests couvrent aussi la corruption d'une entrée, de HEAD et de
l'index privé, la substitution du contexte, le changement d'étiquette source,
la dérive d'un fichier courant et la préservation de l'ancien inventaire.

Commandes de routage pour la CI :

```sh
node scripts/check-hunt-integration-source-history-v112.mjs --check
node scripts/check-hunt-integration-source-v112.mjs --current
```

Les tests OOXML adversariaux V107 à V111 étaient déjà verts dans l'audit initial
et n'ont pas été modifiés. La régression Git ciblée établit le correctif de
transport R7 ; l'exécution complète de ses neuf assertions et trois CLI reste
portée par la suite R7 existante de la CI.

## PR 102 : amorçage R7 sans objets locaux

Le [job historique du run 41703849013](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41703849013/job/126154212581),
sur le head `7799c81b13e869ef7588014529f26ac0eff0a572`, confirme que la frontière
shallow est réparée. Les six premiers tests réussissent, dont les neuf assertions
originales et les trois CLI. Le dernier test, qui fournit volontairement un
dépôt d'objets vide, est annulé avec `test timed out after 240000ms` ; sa durée
observée est de 249 509 ms.

Les lectures `cat-file` autorisaient alors Git à récupérer chaque blob promis
séparément. La reproduction avec le checkout exact de la CI et son graphe
shallow montre des allers-retours de 3,6 à 4,9 secondes pour de petits fichiers
historiques. L'ensemble à restaurer représente seulement 2,23 Mo répartis sur
74 blobs ; le coût venait de la succession des requêtes.

`fetchHistoricalGitBlobs` sonde maintenant les objets avec les téléchargements
implicites désactivés et récupère les blobs absents en une seule requête Git.
R7 vérifie toujours au préalable chaque identité dans l'arbre de publication
épinglé, puis contrôle la taille, le SHA-256 et l'identité Git des octets reçus.
Le dépôt de récupération reste privé. Les refs, HEAD et objets du dépôt prêteur
restent inchangés. Aucun manifeste, certificat, classeur, test original ou délai
limite n'a été modifié.

La régression de transport utilise un vrai clone filtré local avec plusieurs
blobs absents et un blob déjà présent. Elle vérifie qu'une seule requête restaure
les absents, qu'un second appel ne télécharge rien, que les identités de mauvais
type sont rejetées et que les deux dépôts conservent leurs refs. La suite R7
complète est exécutée avec la commande CI :

```sh
node --experimental-strip-types --test --test-reporter=spec --test-concurrency=1 \
  tests/historical-git.test.mjs tests/r7-publication-history-v113.test.mjs
```

Résultat local sur les entrées du merge CI exact : huit tests réussis, aucun
échec, abandon ou test ignoré, en 132,0 secondes. Le test d'amorçage depuis le
dépôt d'objets vide réussit en 28,3 secondes, sous sa limite originale de
240 secondes. Les neuf assertions et trois CLI reproduisent toujours le
classeur R7 de 9 433 700 octets, SHA-256
`723cc894b643d55dcd076cab8b615866c6879ecc481c55616adcdd0508d2eccc`.

## Capsule V112 partagée et copies de test

Le même job a révélé une seconde frontière historique : la capsule V112 attend
son classeur de 9 383 908 octets, tandis que le fichier courant porte une
publication ultérieure de 9 433 700 octets. L'inventaire complet identifie
exactement 81 entrées partagées republiées, pour environ 98,62 Mo. Leurs chemins
et blobs sont désormais épinglés dans
`scripts/historical-shared-inputs-homeworld-v113.mjs`.

La restauration est privée. Un dépôt Git temporaire séparé récupère les blobs
exacts de la publication ; les SHA et tailles du manifeste original restent
exigés. Les 81 préimages deviennent des copies non aliasées en lecture seule,
et les empreintes des 81 fichiers courants sont surveillées avant et après
chaque commande. Les 1 426 autres entrées partagées gardent leurs contrôles
existants. Aucun classeur, manifeste, archive ou certificat publié n'est réécrit.

Une ancienne différence de permissions a également été isolée dans le test de
provenance de l'animation arrière du Pit : il copie un PNG et son receipt dans
une fixture jetable, puis doit altérer ses propres copies. Le contexte avait
imposé 0444 aux deux inputs, ce qui était propagé par `copyFile`. Ces deux seules
copies privées conservent maintenant le mode 0644 de leurs entrées Git 100644,
avec appartenance explicite à `materializedShared`, contrôle de blob, de mode,
de non-alias et d'empreinte avant et après. Les 81 préimages restaurées restent
en lecture seule. Les assertions d'origine ne sont pas modifiées.

Validation locale : cinq CLI originaux réussis ; 21 des 22 suites d'origine
réussies lors de la première exécution, puis les trois assertions du dernier
fichier de provenance réussies après la correction de permissions. Les quatre
nouveaux tests de restauration et d'intégrité passent aussi. La récupération
groupée de 66 blobs absents parmi les 81 demandés a pris 10,074 secondes ; la
préparation complète, 15,654 secondes. Les limites existantes de 300 secondes
par suite et 600 secondes par CLI restent inchangées. La nouvelle opération
réseau est bornée à 120 secondes.

La CI exige désormais le test dédié `tests/historical-shared-inputs.test.mjs`
avant d'exécuter les deux commandes historiques de la capsule.
