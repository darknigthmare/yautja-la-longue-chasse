# PHG T15 — endurance native de soixante minutes

Source exacte : `docs/production/Yautja_PHG_Implementation_Status_V137.xlsx`,
`Tests_Parcours!A19:F19` : **P1 · Longue session · « 60min, alternance 77 matières » · « Pas de fuite mémoire GPU »**.

Le passage `attempt-1` utilise le vrai Next/GameClient optimisé du build
`RYl37_8hN58IOB8jDpRj1`. Il a démarré le 9 novembre 2026 à 05:59:09.908 UTC.
Le passage a terminé avec **3 600,0029 secondes monotones et 3 600,0039 secondes
visibles**, 300 validations natives et 77 matières exercées au moins trois fois.
Aucune durée accélérée ni horloge du jeu substituée n’a été utilisée.
Les 16 conditions du plan d’analyse sont réussies : **qualification bornée de T15
sur ce backend logiciel**, sans certification de VRAM physique.

Treize dumps GPU réels ont été conservés. Après le premier cycle complet,
l’allocateur GPU passe de **60,40625 Mio à 50,109375 Mio** (−10,296875 Mio),
et la RSS hôte du processus GPU diminue de 8,9921875 Mio. Aucune croissance non
bornée n’est observée au-delà des tolérances annoncées sur ce parcours.
Les neuf PNG originaux et la courbe finale ont été ouverts et inspectés.
Zéro erreur JavaScript, console, requête ou HTTP observée.

La copie conserve 1 268 sources, 336 fichiers compilés et 48 fichiers de textures
identiques avant/après. Le dépôt principal a évolué pendant l’heure sur cinq
fichiers de guerre des clans, explicitement listés dans l’analyse ; aucun n’est
une source PHG ciblée. Ce test ne qualifie pas rétrospectivement ces nouveaux
changements de guerre des clans.

## Contexte et actions

La copie de runtime sur le port 3130 préserve les octets du build final tout en
laissant les autres agents travailler. `runtime-copy-manifest.json` vérifie
1 638 fichiers / 91 505 301 octets : application, serveur Next et ressources
compilées. Le cache de compilation est exclu ; les dépendances et le dossier
public d'origine sont liés sans les modifier. Ce n'est pas un composant simulé
ou une page réécrite pour le test.

Une seule campagne adulte Alpha initiale est déclarée dans `initial-fixture.json`.
Les 77 options sont réellement proposées à cette classe : 32 peaux, quatre matières
de dreads, 27 tenues, six armures et huit biomasks. La recette alterne les cinq
canaux et toutes les matières par leurs sélecteurs natifs, puis clique la vraie
validation toutes les douze secondes. Elle vérifie chaque écriture, le retour
à l'état non modifié de l'atelier, l'admissibilité de la sauvegarde et la
conservation du profil, des statistiques, missions et trophées. Après la fixture
initiale, aucun résultat, rang, récompense, HP ou état du jeu n'est injecté.

## Mesures et limites

L'observation utilise un compteur RAF propre et borné, les long tasks, le heap et
les métriques DOM/CPU Chrome, ainsi que la mémoire des processus. Le GPU exposé
par cet environnement est **SwiftShader / SwANGLE logiciel**. Les dumps
`memory-infra` fournissent réellement la taille de l'allocateur `gpu` et de son
enfant `gpu/shared_images`. Les scalaires Chrome sont lus en hexadécimal ; le
parent et l'enfant ne sont pas additionnés. La RSS du processus GPU est de la
mémoire hôte, **pas une mesure de VRAM physique**.

Le plan d'analyse a été enregistré avant le premier cycle complet des 77 matières.
Après ce réchauffement, il compare les compteurs observés aux bornes annoncées :
16 Mio de croissance de l'allocateur GPU et 64 Mio de RSS hôte. La stabilité du
processus GPU, les identités des sources, textures et JS/CSS compilés, la durée
réelle et la couverture des 77 sélections sont des conditions distinctes.
Aucun GC n'est forcé. Les dumps détaillés et la charge cloud partagée peuvent
influer sur les temps de trame : les courbes ne sont pas une garantie de FPS
sur un matériel dédié.

Ces observations ne constituent ni une certification de toutes les cartes
physiques, ni une absence universelle de fuite au-delà de ce parcours, ni une
validation artistique/UV PHG 1:1. Les probes de 30 secondes restent explicitement
non qualifiants pour T15.

## Reproduction

Après création de la copie exacte du build et lancement de Next sur le port 3130 :

```sh
PHG_ENDURANCE_URL=http://127.0.0.1:3130 \
PHG_ENDURANCE_RUNTIME_ROOT=/workspace/p0p1-phg-soak-runtime-20261109 \
PHG_ENDURANCE_OUTPUT=production/p0p1-20261109/qa/phg-endurance/nouvel-essai \
/workspace/.cloud-tools/node22/node_modules/node/bin/node scripts/qa-phg-endurance-p0p1-20261109.mjs
```

Chaque sortie est neuve et verrouillée contre l'écrasement. Le rapport navigateur
brut et sa copie exacte de recette sont conservés. `analyze.py --input <essai>`
produit l'analyse de mémoire, les CSV et les courbes à partir des compteurs réels.

## Preuves finales et compression

[Le rapport final](attempt-1/report.json) garde le rapport navigateur brut et
[son analyse](attempt-1/memory-analysis.json) séparés. Les courbes
[PNG](attempt-1/memory-and-frame-time.png) et [SVG](attempt-1/memory-and-frame-time.svg)
proviennent uniquement des compteurs enregistrés ; les CSV restent disponibles.

La trace native originale fait 94 729 362 octets, SHA-256
`0331c6fe4556ff79e99aeea72ee3b5f9730655ee3d2cc51db57addf535412cb0`.
Elle est livrée en[gzip sans perte](attempt-1/memory-trace.json.gz), 5 775 502 octets.
Le rapport brut conserve l’empreinte et le chemin de sortie originaux ;
l’analyse lit directement le gzip et vérifie que les octets décompressés
correspondent exactement à ce reçu. Le JSON brut reste dans le workspace,
ignoré uniquement pour la livraison Git de ce nouveau dossier ; il n’est ni
réécrit ni supprimé.

`verify.py --input <essai>` vérifie les empreintes, la décompression, les
conditions de mesure et les PNG originaux sans relancer le jeu ni le test d’une
heure. Le reçu final est[final-receipt.json](attempt-1/final-receipt.json).
