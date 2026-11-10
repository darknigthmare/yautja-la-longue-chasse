# Yautja — Postures, respirations et célébrations · V2

**Statut de production : draft — revue artistique et intégration au jeu en attente.**

Six actions avec une entrée, un maintien animé et une sortie dédiée. Les dessins proviennent des références fournies et des postures du même héros. Le rugissement utilise sa variante sans masque ; les deux victoires emploient la lance et le trophée demandés.

## Contenu du pack complet

| Action | Entrée | Maintien animé | Sortie dédiée |
| --- | ---: | ---: | ---: |
| Accroupi sur une branche | 16 | 16 | 16 |
| Embuscade contre le tronc | 16 | 16 | 16 |
| Affût ouvert sur le tronc | 16 | 16 | 16 |
| Provocation — rugissement | 16 | 16 | 16 |
| Victoire — lance dressée | 16 | 16 | 16 |
| Victoire — trophée brandi | 16 | 16 | 16 |

**288 dessins source** répartis en **18 planches**, dont les **96 dessins de transition V1 conservés** et **192 nouveaux dessins**. Les copies de posture fixe, la lecture inversée et les répétitions de lecture n’augmentent pas ce total. Les nombres effectivement exportés figurent dans `animations.json`.

- `frames/<action>_<phase>/001.png` à `016.png` : PNG individuels avec leur alpha source.
- `atlases/` : planches originales, copiées sans modification.
- `import_atlases/` et `import_atlases.json` : variantes techniques avec deux pixels transparents autour de chaque cellule, sans retoucher les dessins. Elles ne comptent pas comme de nouveaux sprites.
- `stances/` : copies de la dernière image de chaque entrée.
- `preview.html` : lecteur léger, à garder à côté du dossier `atlases/`.
- `Yautja_Postures_V2_Apercu.mp4` : vidéo de contrôle, trois actions par page ; détails dans `video_preview.json`.
- `animations.json` : dimensions, rectangles source, alpha, pivots et décalages de lecture.
- `playback.json` : ordres et durées de lecture externes, réutilisables dans le moteur.
- `v1_baseline.json` : empreintes des planches V1 et références des PNG conservés.

## Lecture

Les transitions utilisent **16 i/s**, soit une seconde pour 16 dessins. Le maintien utilise **10 i/s**. La lecture de maintien conseillée est **1 → 16 → 2**, puis retour à 1 : elle emploie les mêmes 16 dessins sur 30 positions de lecture, pour un cycle de **3 secondes**. Le lecteur propose également le sens direct 1 → 16, dont le raccord de fin peut être visible.

Le cycle complet peut utiliser une **sortie réversible**, qui relit l’entrée de 16 à 1, ou la **sortie dédiée**, dessinée séparément. Le maintien fixe reste sélectionnable : associé à la sortie réversible, il retrouve les mêmes images aux raccords que la lecture V1. Avec le maintien animé, les liaisons entre atlas peuvent garder des variations de pose ou de proportions. Les pivots corrigent le placement, pas ces différences de dessin.

La sortie réversible est sélectionnée par défaut. La sortie dédiée de la victoire à la lance conserve notamment un déplacement horizontal des appuis à reprendre lors de la revue artistique ; tous ses dessins restent fournis pour cette revue.

Le lecteur offre pause, vitesse, choix de fond, inspection image par image et réglage du nombre de boucles de maintien. Aucun fondu, flou de mouvement, miroir automatique, interpolation ou image calculée n’est ajouté.

La vidéo montre par défaut les **sorties dédiées**, afin de présenter l’ensemble des dessins source. Son conteneur à 80 i/s représente exactement les durées des transitions à 16 i/s et des maintiens à 10 i/s en répétant les images affichées. Ces répétitions ne sont pas de nouveaux sprites. Les PNG transparents restent les fichiers de référence ; la vidéo est un aperçu compressé.

## Dimensions et ancrages

Les cellules sont extraites mécaniquement de chaque grille 4 × 4, aux limites `round(i × taille / 4)`. Pour une planche de **1254×1254**, les limites sont **0,314,627,941,1254**. Les PNG ont alors un canevas de **314×314**, avec au plus **un pixel transparent à droite et/ou en bas**. Aucun pixel du personnage n’est redimensionné, recentré, recoloré ou nettoyé. Les dimensions exactes de chaque atlas figurent dans le JSON.

Les décalages suivent `drawOffset = anchorTarget - pivot` et ne sont appliqués qu’à l’affichage. Les PNG conservent leurs coordonnées d’origine. Les ancrages de main sont approximatifs ; contrôler les contacts avec le tronc, les branches ou le sol dans le moteur cible, ainsi que les accessoires et les masques d’occlusion.

Le contrôle de bord signale les pixels d’alpha **≥16/255**. Les traces d’alpha de 1 à 15 sont conservées et comptées séparément. Ce seuil sert au contrôle visuel ; il ne remplace pas la règle d’import du moteur qui exige des bords d’alpha strictement nul. Le pack reste un brouillon pour revue visuelle et ne revendique aucune validation moteur. L’intégration, les raccords avec les animations existantes et la fluidité dans le moteur cible restent à vérifier.

## Planches préparées pour l’import

Les variantes `import_atlases/` ajoutent uniquement une **garde transparente de deux pixels sur les quatre côtés** de chaque PNG. Pour un PNG de 314 × 314 pixels, la cellule devient **318 × 318**, et la planche 4 × 4 devient **1272 × 1272**. Tous les octets RGBA d’origine, y compris les traces d’alpha, sont recopiés dans l’intérieur de la cellule. Aucun fond n’est nettoyé et aucun dessin n’est redimensionné.

Le pivot d’import vaut `pivotOriginal + (2,2)`. Pour retrouver le même ancrage, le décalage d’import vaut `anchorTargetOriginal - pivotImport`. `import_atlases.json` contient les rectangles complets, les rectangles intérieurs et ces coordonnées. Utiliser ces rectangles de 318 pixels avec les variantes d’import ; garder les rectangles source pour les planches originales.

Après encodage, l’export vérifie les octets RGBA décodés et l’alpha exactement nul sur les limites de chaque cellule. Ce contrôle satisfait la contrainte de bord de ces variantes techniques ; il ne constitue ni une validation artistique humaine ni une intégration vérifiée dans le moteur. Les planches originales et les PNG individuels sont conservés sans changement.

## Réexport

Depuis la racine du dépôt, avec Node.js, `sharp`, `ffmpeg` et `ffprobe` disponibles :

```bash
node art-source/hunter-postures-emotes/v1/export_sprites.cjs --import-guards
node art-source/hunter-postures-emotes/v1/render_preview.cjs
```

Le premier script accepte une liste `clips` organisée en groupes complets `<action>_enter`, `<action>_idle`, `<action>_exit`, chacun pointant vers sa planche PNG. `expectedClipCount:18` peut imposer le pack complet. Le champ `anchorMeasurementsPath` désigne les mesures d’ancrage. Les empreintes V1 empêchent de remplacer accidentellement les anciennes planches ; leurs 96 PNG sont copiés sans réencodage.

Les variantes d’import sont optionnelles dans l’outil : utiliser `--import-guards` ou `buildImportAtlases:true` dans `sources.json` pour les reconstruire.

Le second script compose la vidéo à partir des PNG exportés et de `playback.json`. Ajouter `--reversible` pour une vidéo utilisant les sorties réversibles. Les deux scripts ne régénèrent ni ne retouchent les dessins source.

## Organisation dans le dépôt

Le lecteur est servi à `/game/sprites/hunter-postures-emotes/v1/preview.html`. Les scripts, les consignes, les chemins sources portables et les empreintes SHA-256 se trouvent dans `art-source/hunter-postures-emotes/v1/`. Le chemin de livraison est conservé entre les deux commits de la PR ; les métadonnées décrivent maintenant la révision V2.

Les six manifestes `runtime_atlases/*.draft.json` suivent la structure `HunterSpriteAtlas` du dépôt et référencent les atlas à garde transparente. Tous les statuts restent `draft`. `reference-yautja` et les variantes de revue ne sont pas liés au roster ; `facing: right` est une affectation technique provisoire à confirmer par revue visuelle. La cadence utilise 80 ticks/s : 5 ticks par dessin de transition et 8 par dessin de maintien. Chaque maintien ping-pong contient 30 références aux 16 dessins existants.

Pour régénérer ces manifestes après l’export :

```bash
node art-source/hunter-postures-emotes/v1/build_runtime_manifests.cjs
```
