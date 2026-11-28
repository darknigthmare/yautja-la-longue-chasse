# Provenance historique des Enforcers

Le classeur [de reprise](../../YAUTJA_REPRISE_CHANTIERS_20261101.xlsx) classe la
famille Enforcers en P3 dans la feuille `OuvertsSource`, aux lignes 5, 27 et 28.
La ligne de famille couvre deux exigences.

| Exigence | Dernier état établi |
| --- | --- |
| `ENFORCERS-V610-TRACES` | 36 traces nominatives V6.10 conservées avec chemin, taille et SHA‑256. Aucun des 36 PNG originaux n’a été retrouvé dans les références Git examinées. |
| `ENFORCERS-V613-RECEIPTS` | 15 reçus concordent avec le PNG final sur 36. Parmi les 21 enregistrements du checkpoint, six concernent une sortie remplacée. Il manque toujours 21 reçus des sorties finales. |

Les [traces V6.10](../v611/data/prior-production-v610.json), le
[manifeste final V6.13](../v613/data/production-manifest.json) et son
[checkpoint](../v613/recovery/native-checkpoint.json) fournissent les identités
et les empreintes. La résolution s’appuie sur le merge historique
`d71e995ae886df69c4165a1a153291449e8f22f6` de la PR #10.

## Rapprocher des références Git

Depuis un dépôt disposant des objets historiques, exécuter le contrôle en
lecture seule. Le rapport JSON contient les références examinées, les
empreintes attendues et les identifiants encore en attente.

```sh
node scripts/audit-enforcer-historical-recovery.mjs \
  5417bafe9b2fe3ed064693d9e0f12d9d591217d3 \
  09c42b77932f05160b956f731e2087c71a15dfdc \
  6e2a5546bd75e95901235af8d503621d0bc2201d \
  2d1d006628e7e657cda66470ed06f5055f4919c5 \
  4ef1eb48e45278db4606d8ee9999647c62c80a21 \
  d71e995ae886df69c4165a1a153291449e8f22f6
```

Le contrôle inclut `HEAD` et compare chaque PNG éventuellement présent à son
chemin historique, à sa taille et à son empreinte. Pour un reçu V6.13, seul
l’essai accepté du checkpoint qui correspond aux octets finaux est retenu.
Un nouveau résultat concordant exige un rapprochement avec son archive de
production avant clôture. Les deux exigences sources du classeur restent ouvertes.

### Rechercher un original renommé

L’option `--scan-git-tree` parcourt les chemins de chaque référence fournie et ouvre seulement les blobs dont la taille correspond à un PNG recherché. Le rapport `gitTreeCandidates` donne le commit, le chemin retrouvé et le SHA‑256. Les objets Git nécessaires doivent déjà être présents localement.

```sh
node scripts/audit-enforcer-historical-recovery.mjs --scan-git-tree d71e995ae886df69c4165a1a153291449e8f22f6
```

Un checkpoint V6.13 doit correspondre au chemin, à la taille et à l’empreinte du PNG. Quand le manifeste contient le prompt exact accepté, le checkpoint doit restituer ce texte. Quand le manifeste est muet, le rapport indique `requires-independent-source` et laisse le reçu candidat en attente d’une source de provenance indépendante.

## Vérifier une archive de production disponible localement

Une archive extraite peut contenir un original V6.10 à un autre emplacement.
Le contrôle parcourt les fichiers ordinaires du dossier fourni et identifie les
PNG attendus par leur taille et leur SHA‑256, indépendamment du nom du fichier.
Un checkpoint V6.13 peut également être présenté à part pour comparer son essai
accepté à la taille et au SHA‑256 du PNG final.

```sh
node scripts/audit-enforcer-historical-recovery.mjs \
  --archive /chemin/vers/une-archive-extraite \
  --checkpoint /chemin/vers/native-checkpoint.json
```

Les options acceptent plusieurs dossiers ou checkpoints. `archiveCandidates`
indique le chemin relatif de chaque original V6.10 retrouvé dans les dossiers
locaux. `checkpointCandidates` identifie les reçus V6.13 candidats et consigne le
SHA‑256 de leur checkpoint. La revue de provenance décide leur admission. Les
reçus actuellement publiés et les candidats restent comptés séparément.

La recherche de reprise a inspecté 21 références Git liées aux Enforcers et 54 265 entrées de fichiers dans huit arborescences historiques complètes, sans candidat de la taille d’un visuel V6.10. Les 20 exécutions Actions historiques consultées n’avaient aucun artefact listé. Le dossier Drive V6.10 était vide dans les résultats accessibles, y compris pour les fichiers supprimés. Les recherches par noms des sorties V6.13 déjà documentées n’ont fourni aucun reçu supplémentaire. Le suivi conserve ses deux lignes ouvertes.

## Contrôle après la PR #175

Au commit `62b3658cc04b3404a0e302163230995d47d83d66`, la comparaison avec le dernier audit ne révèle aucun PNG ni reçu V6.13 ajouté. L’artefact Actions de la PR contient les rapports du contrôle et du test avec un fichier synthétique. Le checkpoint publié reste à 15 reçus concordants. [PR #175](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/175) · [Artefact Actions](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/44825425300/artifacts/14673143484)

Les deux ZIP V6.12 référencés par la PR #9 déclarent 72 PNG des lots V6.11 et V6.12. Ce périmètre a été vérifié dans le script de publication et les métadonnées disponibles. L’inventaire publié n’atteste aucun PNG V6.10. Les octets des ZIP Drive n’ont pas été inspectés pendant cette reprise. Les checkpoints V6.12 et V6.14 et les registres Drive V87 à V89 ne partagent aucun identifiant ni SHA‑256 avec les cibles recherchées. [PR #9](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/9) · [Script de publication](../../../scripts/package-enforcer-production-v612.py)

Les 31 commentaires et avis des PR #7, #9, #10, #15, #174 et #175 ne contiennent aucune pièce jointe ni archive supplémentaire. Les arbres `main` complets des deux dépôts liés, l’archive DLC et la base Yautja, totalisent respectivement 46 et 63 fichiers Git. Aucun chemin de production ni aucune taille de fichier n’y correspond aux preuves recherchées.

Le classeur Drive V6.12 possède sept révisions listées. Le téléchargement de l’avant-dernière révision a renvoyé HTTP 403. Une archive locale demeure nécessaire pour rapprocher les 36 PNG V6.10 ou les 21 reçus finaux V6.13 encore absents.

## Lire directement un ZIP

Le mode `--zip` utilise Python 3 pour parcourir un ZIP local en lecture seule,
sans décompression sur disque. Chaque PNG cible est reconnu par sa taille et
son SHA‑256. L'audit regarde aussi les fichiers JSON dont le schéma correspond
à celui des checkpoints V6.13.

```sh
node scripts/audit-enforcer-historical-recovery.mjs \
  --zip /chemin/vers/partie-1.zip \
  --zip /chemin/vers/partie-2.zip
```


Le rapport affiche les chemins internes des correspondances et l'empreinte
des checkpoints candidats. Les fichiers JSON de plus de 8 Mio sont signalés
dans `oversizedJson`. Ils peuvent être fournis à part via `--checkpoint`.
La métadonnée Drive de la partie 1 confirme une archive de 99 314 336 octets
réservée à son propriétaire. Ses octets restent à examiner depuis un espace
de travail capable de lire le fichier.

Le dossier de publication contient deux archives privées et le classeur
V6.12. Les deux ZIP ont chacun une seule révision listée. [PR #9](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/9)

Les répertoires ZIP internes de cinq des douze classeurs associés à la
publication ont aussi été examinés au commit
`842bc7e69ab5aed086d0fbbfcafd1d86a14e9f38`. Le catalogue des médias et les
suivis Pit V60, V61, V62 et V63 réunissent 107 entrées. Aucun de ces cinq
classeurs ne contient d'image intégrée, de fichier JSON ou d'entrée ayant la
taille d'un PNG V6.10 recherché. Les sept autres classeurs ont été vérifiés
par le même audit ZIP à partir de leurs octets Git. Les sept résultats
contiennent zéro PNG original et zéro checkpoint V6.13.
[Rapport de vérification des sept classeurs](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/44887329571/artifacts/14700561366)
[Inventaire des fichiers publiés](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/842bc7e69ab5aed086d0fbbfcafd1d86a14e9f38/scripts/package-enforcer-production-v612.py)

## Six sorties intermédiaires du checkpoint V6.13

Le checkpoint du 22 octobre conserve les six PNG intermédiaires sous les
mêmes chemins que les sorties livrées. Le contrôle lit les blobs aux deux
commits, vérifie les signatures PNG, puis recalcule la taille et le SHA‑256
de chaque exemplaire. Le reçu de l’essai accepté est rapproché du PNG
intermédiaire par son empreinte, sa taille et son nom natif.
[Checkpoint et PNG intermédiaires](https://github.com/darknigthmare/yautja-la-longue-chasse/tree/2d1d006628e7e657cda66470ed06f5055f4919c5/public/game/production/enforcers-v613) · [Livraison finale](https://github.com/darknigthmare/yautja-la-longue-chasse/tree/d71e995ae886df69c4165a1a153291449e8f22f6/public/game/production/enforcers-v613)

| Identifiant | Essai accepté du PNG intermédiaire | Essai cité par le champ `promptExact` du checkpoint |
| --- | ---: | ---: |
| `super-predators--enforcers-comics-08` | 2 | 1 |
| `super-predators--enforcers-comics-09` | 2 | 1 |
| `feral--enforcers-comics-09` | 1 | 1 |
| `augmentes-assassin--enforcers-comics-08` | 1 | 1 |
| `augmentes-assassin--enforcers-comics-09` | 1 | 1 |
| `sha-rhess--enforcers-comics-08` | 2 | 2 |

Pour les deux Super Predators, le champ de synthèse reprend le prompt de
l’essai rejeté. Le rapport identifie l’essai 2 accepté dans `attempts` et
conserve les empreintes des deux PNG, l’intermédiaire et celui livré.
Le manifeste final décompte toujours 21 reçus à retrouver.
[Recette et rapport JSON](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/46127452728)

```sh
node scripts/audit-enforcer-replaced-v613.mjs
```
