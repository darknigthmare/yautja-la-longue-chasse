# Pipeline artistique v0.4

## Sprite-sheets
- `wolf-sprite-sheet.svg` — 8×5 frames, 128×160 par frame.
- `wolf-unmasked-sprite-sheet.svg` — 8×5 frames, 128×160 par frame.
- `xeno-sprite-sheet.svg` — 6×4 frames, 128×160 par frame.
- `predalien-sprite-sheet.svg` — 6×4 frames, 160×180 par frame.

Le runtime charge ces fichiers séparément. Le standalone les embarque en data URI au build afin de rester monofichier.

## Remplacement futur
Chaque feuille peut être remplacée par une version artistique plus poussée en conservant la grille et la taille de frame. Le code ne dépend pas de l’apparence interne du SVG.

## Effets runtime
Les tirs, impacts acides, cleaner fluid, soin, mines, shuriken et camouflage sont générés par Canvas afin de rester indépendants des sprites et facilement ajustables.
