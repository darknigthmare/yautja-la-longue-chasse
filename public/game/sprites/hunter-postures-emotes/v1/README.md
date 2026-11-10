# Yautja — The Long Hunt : postures arboricoles

**Statut : draft — revue artistique et intégration au jeu en attente.**

Pack de sprites créé à partir des trois références fournies. Les trois postures sont l’accroupissement sur une branche, l’affût resserré contre le tronc et l’appui ouvert avec une jambe dépliée.

## Contenu livré

| Posture | Entrée | Sortie dédiée | Posture fixe |
| --- | ---: | ---: | ---: |
| Accroupi sur branche | 16 dessins | 16 dessins | Copie du dernier dessin d’entrée |
| Affût serré contre le tronc | 16 dessins | 16 dessins | Copie du dernier dessin d’entrée |
| Appui ouvert sur le tronc | 16 dessins | 16 dessins | Copie du dernier dessin d’entrée |

- **96 PNG individuels de transition**, dans `frames/`, répartis en six séquences de 16 images.
- **6 planches source** dans `atlases/`, de 1 254 × 1 254 pixels, en grille 4 × 4.
- **3 PNG de posture fixe** dans `stances/`. Ce sont des copies des dernières entrées, pas trois dessins supplémentaires.
- **Yautja_Postures_Animation.mp4** : aperçu de 7 secondes des trois entrées, du maintien et des sorties réversibles. La même boucle est montrée deux fois. Les sprites y sont simplement composés sur un fond de présentation ; les PNG conservent leur transparence.
- **preview.html** : lecteur léger qui charge les six planches PNG voisines. Choix de posture, entrée, maintien, sortie, cadence, fond et inspection image par image.
- **animations.json** : rectangles source, durées, pivots mesurés, décalages de lecture, propriétés alpha et chemins des PNG.
- **anchor_measurements.json** : détail des mesures d’appui. Les consignes et la provenance se trouvent dans `art-source/hunter-postures-emotes/v1/` à la racine du dépôt.
- Le script et les fichiers de réexport se trouvent dans `art-source/hunter-postures-emotes/v1/`. Le lecteur est accessible via `/game/sprites/hunter-postures-emotes/v1/preview.html` lorsque le projet est servi.

## Animation et fluidité

Cadence de départ : **16 images par seconde**, soit une seconde pour une transition de 16 dessins. Les images sont ordonnées de gauche à droite, puis de haut en bas sur les planches ; les PNG individuels sont numérotés `001.png` à `016.png`.

Le mode conseillé pour les raccords est **Sortie réversible** : l’entrée est jouée de 1 à 16, la dernière image est tenue, puis les mêmes dessins sont relus de 16 à 1. Les images de raccord sont donc exactement identiques. Cette lecture réutilise les dessins existants ; elle ne produit pas d’images supplémentaires.

Le mode **Sortie dédiée** utilise les 16 dessins de sortie générés séparément pour chaque posture. Ces dessins sont tous livrés, mais leurs raccords conservent des variations de proportions et de pose. Les décalages corrigent le placement, pas ces différences anatomiques. La vidéo utilise la sortie réversible ; les sorties dédiées sont accessibles dans le lecteur et dans les dossiers de PNG.

Le maintien est une pose fixe. Il n’y a pas de boucle de respiration séparée, d’interpolation artificielle, de fondu ou de flou de mouvement.

## Taille, alpha et découpe

Chaque PNG individuel possède un canevas **314 × 314 pixels**, avec un canal alpha réel. Le tronc, la branche et le décor ne sont pas dessinés dans les sprites : ils doivent être placés sur des couches de décor indépendantes.

Les planches natives font 1 254 pixels de côté. Les limites de découpe sont `0, 314, 627, 941, 1254` ; les cellules sources font donc 313 ou 314 pixels. Les petites cellules reçoivent seulement un pixel transparent à droite et/ou en bas pour uniformiser les canevas. Les pixels des personnages ne sont ni redimensionnés, ni recentrés, ni retouchés par l’export.

Les planches sources originales sont conservées. Pour un import simple, utiliser les PNG individuels ; pour exploiter les planches, utiliser les rectangles réels de `animations.json` plutôt qu’une grille entière de 314 pixels.

## Ancrages

La règle de placement est `drawOffset = anchorTarget - pivot`. Ces décalages sont appliqués pendant la lecture et ne sont pas inscrits dans les PNG.

- Sur la branche : cible `(157, 308)`, position horizontale fixe et correction verticale selon la ligne d’appui des pieds.
- Sur le tronc : cible `(100, 80)` sur la main porteuse à gauche de l’image. Ces mesures sont approximatives et doivent être adaptées à la géométrie du tronc.

Le lecteur utilise un espace logique de 420 × 420 pixels et une marge de 50 pixels afin de conserver la place nécessaire aux décalages. Vérifier les appuis, les masques d’occlusion du tronc et les raccords avec les animations existantes dans le moteur cible. L’armure est asymétrique : un miroir automatique inverse aussi les équipements.

## Vérifications réalisées

Les six planches contiennent 96 cellules non vides. Les 96 images possèdent leur transparence et leurs mesures d’ancrage. Aucun pixel d’alpha supérieur ou égal à 16/255 ne touche une limite de cellule dans la mesure effectuée. Des traces d’alpha de 1 à 7/255 subsistent aux limites des sources et sont conservées. Le rendu du jeu exige des limites entièrement transparentes : ce contrôle ne constitue donc pas une validation du contrat de rendu.

La vidéo a été encodée en H.264, 1 260 × 590 pixels, 16 images par seconde, 112 images, et ses images de début et de maintien ont été contrôlées visuellement. Le fichier HTML et ses scripts ont été contrôlés statiquement ; sa lecture interactive n’a pas pu être validée ici, la politique du navigateur bloquant l’ouverture des fichiers locaux. Ces assets ne sont pas encore intégrés ni validés dans le jeu.

## Réexport

Depuis la racine du dépôt, avec les dépendances Node.js et `sharp` du projet disponibles :

```bash
node art-source/hunter-postures-emotes/v1/export_sprites.cjs
```

Les chemins de `sources.json` sont relatifs à ce fichier. Le script découpe les PNG, met à jour les métadonnées et reconstruit `preview.html` sans embarquer une seconde copie base64 des atlas. Il ne régénère pas la vidéo et ne modifie pas les dessins. Les empreintes SHA-256 de la livraison sont enregistrées dans `intake-manifest.json`.
