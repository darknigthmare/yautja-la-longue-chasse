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
