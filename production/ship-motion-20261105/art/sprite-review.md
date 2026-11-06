# Revue des vues et effets du vaisseau classique — 5 novembre 2026

## Périmètre et résultat

Les huit nouvelles vues, leur profil de référence et les deux effets de moteur
ont été inspectés en couleur sur fond opaque, puis mesurés dans leur canevas
source. Les exports WebP des dix nouvelles ressources conservent exactement
l'alpha et les couleurs prémultipliées de leurs PNG. Aucune coque n'est coupée.
Les points fournis dans [sprite-review.json](sprite-review.json) remplacent les
estimations initiales de la table de calibration.

Ce résultat est une inspection technique des images et de leur composition.
La revue des transitions dans le navigateur, ainsi que l'approbation artistique
humaine et la fidélité canonique 1:1, restent des preuves distinctes.

## Référence conservée

Le maître d'identité est
`public/game/ships/v12/classic-predator-spaceship.webp`.
Les vues conservent le double éperon avant, les bandes de coque nervurées,
les épines dorsales, la grande lame ventrale et les matières olive-bronze avec
évents orange. L'ancienne vue de dessus V13 est exclue de cette famille.

Les nouvelles faces révélées sont des interprétations générées à partir de ce
profil. Certains détails de nervures et de chambre motrice varient : ces images
ne proviennent pas d'un modèle 3D commun et ne prouvent pas une correspondance
exacte à un vaisseau filmé. Les angles annoncés par les prompts sont des cibles
de caméra d'auteur, sans prétention à une mesure tridimensionnelle.

## Mesures des huit vues

Toutes les coordonnées ci-dessous sont en pixels du canevas complet de
1536 × 1024, marges transparentes incluses.

| Vue | Nez projeté | Bord arrière | Contact ventral | Pivot de registration | Centre de moteur visible |
| --- | --- | --- | --- | --- | --- |
| Avant léger | 140,5 ; 507 | 1394 ; 493 | 600 ; 670 | 769 ; 526 | Face occultée |
| Avant | 142,5 ; 505,75 | 1402 ; 478 | 650 ; 683 | 774 ; 517 | Face occultée |
| Inclinaison dorsale légère | 121 ; 520,75 | 1426 ; 516,5 | 550 ; 682 | 775 ; 544 | Face occultée |
| Inclinaison dorsale | 117,5 ; 494,5 | 1430 ; 472,5 | 550 ; 669 | 775 ; 509 | Face occultée |
| Inclinaison ventrale légère | 106,5 ; 479,25 | 1430 ; 500 | 550 ; 640 | 770 ; 515 | Face occultée |
| Inclinaison ventrale | 122,5 ; 453 | 1414 ; 504,5 | 550 ; 652 | 770 ; 505 | Face occultée |
| Arrière léger | 164 ; 469 | 1392 ; 481 | 470 ; 652 | 779 ; 501 | 1364 ; 482 |
| Arrière | 132,5 ; 475,25 | 1420 ; 490,5 | 425 ; 652 | 778 ; 509 | 1378 ; 491 |

Le nez est le milieu des deux extrémités de l'éperon : ce point se trouve
volontairement dans l'ouverture entre elles. Le pivot est une registration
composée à partir de l'axe observé, conservant la position relative du pivot du
profil ; il ne représente pas un centre de masse calculé. Le contact ventral
est une couture visuelle de composition, sans invention d'une baie canonique.
Les largages effectifs doivent conserver le profil et son point historique.

## Moteur : visibilité et attaches

Une seule chambre terminale est visible. Les deux vues arrière montrent son
ouverture ou son anneau ; les six autres vues et le profil montrent le flanc du
carter. Leur état peut donc être « inspecté » tout en gardant une visibilité
d'effet de zéro. Déduire automatiquement une visibilité de 1 du statut
d'inspection serait incorrect.

| Vue | Centre | Dimensions apparentes utiles | Axe du jet dans l'image |
| --- | --- | --- | --- |
| Arrière léger | 1364 ; 482 | Ouverture interne, environ 50 × 101 px | Vers la droite, 0° |
| Arrière | 1378 ; 491 | Anneau lumineux, environ 78 × 150 px | Vers la droite, 0° |
| Profil | Bord inspecté à 1405 ; 486 | Face occultée | Effet masqué |

Les limites d'ouverture sont des mesures manuelles de source, avec une
précision d'environ ±6 px. Le centre de face diffère du bord arrière de la
silhouette : attacher le noyau au seul point `tail` décale l'effet dans les
vues arrière.

## Deux effets séparés

| Ressource | Canevas | Origine à utiliser | Zone alpha > 128 |
| --- | --- | --- | --- |
| `classic-engine-core` | 1254 × 1254 | 621 ; 632 | x 439…801, y 306…957 |
| `classic-engine-plume` | 2172 × 724 | 448 ; 363 | x 442…1485, y 267…452 |

Le noyau est une ellipse lumineuse dans un canevas carré. Dimensionner son
ellipse utile sur la chambre visible, tout en conservant les marges source.
Les deux ouvertures ont des rapports d'aspect différents ; une taille unique
du canevas entier ne suffit pas à les couvrir proprement.

La plume part de la pointe lumineuse gauche et se prolonge vers la droite.
Son centre géométrique et son centroïde lumineux ne sont pas des origines
d'émission. Appliquer le miroir, l'orientation et la registration de la coque
à l'attache avant de dessiner l'effet. La modulation lumineuse doit suivre
l'horloge persistée de la cinématique pour rester immobile pendant la pause.

## Transparence et faux artefact de lecture

Une lecture des seules valeurs RGB montre un halo brun dans les PNG et des
stries bleues/brunes dans les WebP autour de la coque. Ces données sont dans
des pixels entièrement transparents ou d'alpha maximal 1/255, très loin de la
silhouette. La composition RGBA sur un fond bleu-gris opaque est propre pour
les dix ressources. Les différences RGB sous alpha nul ne sont donc pas une
fumée ni une corruption visible du rendu.

Les contrôles ont comparé les dimensions, les bornes de silhouette à plusieurs
seuils d'alpha, les bordures, l'égalité de l'alpha source/export et les couleurs
prémultipliées. Les empreintes SHA-256 et les résultats par fichier sont dans
le JSON associé. Les anciennes images source sont conservées.

## Points à vérifier en scène

Le code relu utilise `mix-blend-mode: plus-lighter` dans un groupe isolé pour
éviter la perte d'opacité commune d'un fondu ordinaire. Les effets moteur sont
dans la même couche enregistrée que leur coque, avec la plume derrière celle-ci
et le noyau devant. Coque, éclairage, réfraction et bord utilisent le même
transform et le même pivot. Aucune erreur concrète n'a été relevée dans ce
raccord statique après intégration de la calibration.

Observer néanmoins les transitions à mi-fondu : les silhouettes indépendantes
peuvent encore produire un double contour et leur camouflage doit rester
régulier pendant les 160 ms de transition. Le changement de nom de plan ne
doit pas changer la vue avant la fin de sa transition. Les scènes de largage
et de contact au sol gardent le profil déjà calibré. Une lecture de code ne
remplace pas les captures du navigateur.

La famille de huit vues concerne uniquement `classic-predator-spaceship`.
Tout autre vaisseau sélectionné doit conserver son propre profil ; cette
inspection n'ajoute pas de vues aux autres coques.

## Provenance

- Vues : [generation-jobs.json](generation-jobs.json), sources PNG et exports
  WebP individuels.
- Effets moteur : [engine-generation-jobs.json](engine-generation-jobs.json),
  sources PNG et exports WebP individuels.
- Outil de génération enregistré : `image_gen` intégré.
- Méthode de revue : guide projet `docs/GAMEDEV_AGENT_GUIDE.md` et référence
  [create-game-assets, révision épinglée](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/19d93f97c9c1ea0f8b306e77aa81e0d3e352d3e9/skills/disciplines/create-game-assets/SKILL.md).

Aucune attestation historique, approbation humaine ou preuve de navigateur
n'est réécrite par ce rapport.
