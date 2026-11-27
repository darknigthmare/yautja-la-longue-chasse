# Pipeline artistique — AVP:R Wolf v0.5

Le runtime reste basé sur des assets vectoriels originaux et remplaçables individuellement.

## Sprite-sheets de personnages

- `wolf-sprite-sheet.svg` — 8×5, 128×160.
- `wolf-unmasked-sprite-sheet.svg` — 8×5, 128×160.
- `xeno-sprite-sheet.svg` — 6×4, 128×160.
- `predalien-sprite-sheet.svg` — 6×4, 160×180.
- `facehugger-sprite-sheet.svg` — 6×4, 96×96, ajout v0.5.

Le fichier `assets/atlas-manifest.json` décrit les rangées d'animation. Le standalone embarque les cinq planches sous forme de data URI et reste jouable hors ligne.

## FX runtime

Les mares acides, pulses de tracking, cloak shimmer, flashes plasma, pluie et blackout sont dessinés par le Canvas afin de rester paramétrables. Ils peuvent être remplacés par des sprites dédiés plus tard sans modifier la logique de progression.

## Prévisualisations

`docs/scene_previews_v05/` contient cinq images statiques de contrôle. Elles utilisent les assets du pack et illustrent la composition visuelle, mais ne sont pas présentées comme captures navigateur.
