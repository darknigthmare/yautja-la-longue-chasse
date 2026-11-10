# Postures, rugissement et victoires du Yautja — livraison V2

## Contenu livré

La deuxième livraison complète les postures arboricoles avec leurs maintiens animés, la provocation par rugissement et deux poses de victoire. Chaque action comporte 16 dessins d’entrée, 16 de maintien et 16 de sortie dédiée : **288 dessins source dans 18 atlas**, dont les 96 transitions V1 conservées à l’identique.

| Action | Entrée | Maintien | Sortie dédiée |
| --- | ---: | ---: | ---: |
| Accroupi sur une branche | 16 | 16 | 16 |
| Embuscade contre le tronc | 16 | 16 | 16 |
| Affût ouvert sur le tronc | 16 | 16 | 16 |
| Provocation — rugissement | 16 | 16 | 16 |
| Victoire — lance dressée | 16 | 16 | 16 |
| Victoire — trophée brandi | 16 | 16 | 16 |

Le rugissement montre la variante sans masque ; les victoires utilisent la lance dressée et le trophée brandi. Ces interprétations des références fournies restent **draft**, sans association automatique à une variante existante du roster.

## Fichiers et aperçu

- Assets, métadonnées, séquences et vidéo : `public/game/sprites/hunter-postures-emotes/v1/`.
- Provenance, empreintes, consignes et réexport : `art-source/hunter-postures-emotes/v1/`.
- Lecteur : `/game/sprites/hunter-postures-emotes/v1/preview.html` lorsque l’application sert les fichiers publics.
- Vidéo : `Yautja_Postures_V2_Apercu.mp4`, 11 secondes et deux pages de trois actions, avec toutes les entrées, les maintiens et les sorties dédiées.

Le chemin de livraison reste stable dans cette PR ; les métadonnées portent la révision V2. Le lecteur charge les PNG voisins. Les six copies de pose fixe ne sont pas des dessins supplémentaires.

## Cadence et continuité

Les transitions jouent à 16 i/s ; les maintiens à 10 i/s. Le maintien conseillé suit 1 → 16 → 2 puis reprend à 1 : 16 dessins sur 30 positions de lecture, soit 3 secondes. Le lecteur offre aussi le maintien fixe, le sens direct et la sortie réversible par relecture de l’entrée. `playback.json` contient les références et durées des séquences.

La vidéo montre les sorties dédiées pour présenter les 288 dessins source. Son conteneur à 80 i/s représente exactement les deux cadences en répétant les images, sans interpolation. Elle contient 880 images encodées ; cela ne change pas le nombre de sprites source.

## Vérifications techniques

Les 288 PNG individuels sont distincts. Chaque image est vérifiée pixel par pixel contre sa cellule source, avec uniquement le remplissage transparent prévu. Les six atlas V1 et leurs 96 PNG n’ont pas changé. Les chemins, les empreintes et les pivots des 288 frames sont contrôlés.

Les rectangles utilisent `round(i × taille / 4)`. Pour 1 254 pixels, les limites sont `0, 314, 627, 941, 1254` ; les cellules de 313 pixels reçoivent un pixel transparent à droite ou en bas pour produire des canevas de 314 pixels, sans redimensionnement.

Le maximum d’alpha observé aux bords des sources est 7/255 ; 277 cellules gardent des traces non nulles et aucune n’atteint le seuil visuel 16. Les 18 variantes `import_atlases/` ajoutent une garde transparente de 2 pixels autour de chaque PNG. Elles font 1 272 × 1 272 pixels avec des cellules de 318 × 318. Le contenu RGBA intérieur reste exactement identique, les pivots gagnent 2 pixels sur chaque axe et les bords des cellules ont un alpha strictement nul. Les sources originales sont conservées.

## Métadonnées natives du moteur

Les six fichiers `runtime_atlases/*.draft.json` suivent la structure `HunterSpriteAtlas` et référencent les variantes à garde transparente. Ils emploient 80 ticks/s : 5 ticks par dessin de transition et 8 par dessin de maintien. Les maintiens utilisent 30 références ping-pong pour leurs 16 dessins source. Le fichier `runtime_atlases/index.json` liste ces six manifestes.

Le personnage `reference-yautja` et les variantes de revue ne sont pas liés au roster. L’affectation `facing: right` sert uniquement au champ d’orientation exigé par le schéma et doit être confirmée par revue artistique. Tous les statuts d’atlas, de page et de clip restent `draft`. Aucune règle du renderer n’est changée et ces manifestes ne sont pas chargés automatiquement par le jeu.

## Revue artistique et intégration à poursuivre

La génération séparée des atlas peut modifier la pose, les proportions et les équipements aux raccords. Les décalages d’ancrage règlent le placement, sans corriger le dessin. Le maintien fixe avec sortie réversible garantit les mêmes images aux raccords entrée/sortie ; les liaisons avec un maintien animé séparé restent à examiner.

La sortie dédiée de la victoire à la lance conserve environ 8 à 10 pixels de dérive horizontale des appuis après leur correction verticale par les pivots. Elle reste une alternative en revue ; la sortie réversible est proposée par défaut.

Il reste à revoir les silhouettes, les appuis, les accessoires, la variante et l’orientation cible, le traitement des traces alpha, les occlusions et l’échelle dans une scène réelle. La transparence et le nombre de frames ne valent pas approbation artistique. Aucun contrôle de jeu, de navigateur, de performance ou de combat n’est revendiqué.

## Réexport

```bash
node art-source/hunter-postures-emotes/v1/export_sprites.cjs
node art-source/hunter-postures-emotes/v1/build_runtime_manifests.cjs
node art-source/hunter-postures-emotes/v1/render_preview.cjs
```

Le premier script utilise `sharp`, préserve les PNG V1 et reconstruit les exports, les séquences, les variantes avec garde et le lecteur léger. Le deuxième reconstruit les six manifestes natifs en statut `draft`. Le troisième utilise aussi `ffmpeg` et `ffprobe` pour recomposer la vidéo. Les scripts ne régénèrent ni ne retouchent les dessins. Le manifeste d’intake reste un enregistrement de la livraison révisé séparément.
