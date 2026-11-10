# Postures arboricoles et emotes du Yautja — livraison en revue

## Portée de la première livraison

Ce lot apporte les sprites demandés pour trois postures : accroupi sur une branche, affût serré au tronc et appui ouvert sur le tronc. Chacune possède 16 dessins d’entrée, 16 dessins de sortie dédiée et une copie de sa posture terminale, soit 96 dessins de transition au total. La cadence proposée est de 16 images par seconde.

Les assets restent **draft**, sans association automatique à une variante existante du roster. Ils sont issus des références fournies par l’utilisateur et constituent une adaptation pour le projet. Les boucles de maintien, la provocation par rugissement et les deux poses de victoire sont prévues dans la suite de la même PR ; elles ne sont pas incluses dans cette première livraison.

## Fichiers et aperçu

- Assets et métadonnées : `public/game/sprites/hunter-postures-emotes/v1/`.
- Provenance, empreintes, consignes et réexport : `art-source/hunter-postures-emotes/v1/`.
- Lecteur : `/game/sprites/hunter-postures-emotes/v1/preview.html` lorsque l’application sert les fichiers publics.
- Vidéo : `Yautja_Postures_Animation.mp4`, aperçu de 7 secondes des trois entrées, du maintien fixe et des sorties réversibles.

Le lecteur charge les PNG voisins ; le dépôt ne contient ni ZIP dupliqué ni copie base64 complète des atlas. Les 96 PNG individuels et les six atlas sont conservés à l’identique. Les trois poses fixes du dossier `stances/` sont des copies, pas des dessins supplémentaires.

## Vérifications techniques

Les six planches RGBA font 1 254 × 1 254 pixels. Une division 4 × 4 uniforme en cellules entières est impossible : les métadonnées donnent les limites réelles `0, 314, 627, 941, 1254`. Les exports font 314 × 314 pixels, avec au maximum un pixel de remplissage transparent à droite ou en bas. Le réexport n’interpole pas les dessins.

Les copies sont vérifiées par SHA-256 contre le lot source. Les 96 fichiers de transition sont distincts et les chemins des métadonnées sont vérifiés. Aucun pixel d’alpha supérieur ou égal à 16 ne touche les bords des cellules inspectées ; des traces de 1 à 7 restent présentes. Le module `app/game/hunterSpriteAtlas.ts` exige des bords d’alpha exactement nul : ces assets ne satisfont donc pas encore ce contrôle de production. Ses règles et ses statuts n’ont pas été modifiés.

## Revue artistique et intégration à poursuivre

Le lecteur propose la sortie dédiée et la lecture de l’entrée en sens inverse. La lecture réversible garantit des images identiques aux raccords en réutilisant les dessins existants. Les sorties dédiées conservent des différences de proportions et de pose entre planches. Les décalages d’ancrage règlent le placement des appuis, sans corriger ces différences.

Il reste à revoir la continuité des silhouettes, des équipements, des pieds et de la main porteuse ; à choisir la variante de personnage et l’orientation cible ; à régler le traitement des traces alpha ; et à vérifier les occlusions, l’échelle et les raccords dans une scène réelle. La transparence et le nombre de frames ne valent pas approbation artistique. Aucun contrôle de jeu, de navigateur, de performance ou de combat n’est revendiqué pour cette livraison.

## Réexport

```bash
node art-source/hunter-postures-emotes/v1/export_sprites.cjs
```

Le script utilise `sharp` déjà déclaré par le projet. Il régénère les PNG, les métadonnées et le lecteur léger à partir des planches conservées ; la vidéo et le manifeste d’intake sont des éléments de la livraison révisée séparément.
