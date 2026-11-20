# ART PIPELINE — AVP:R WOLF v0.6

## Corpus runtime

Six sprite-sheets séparées sont utilisées par le runtime :

1. Wolf masqué — 8×5, 128×160.
2. Wolf démasqué — 8×5, 128×160.
3. Xénomorphe — 6×4, 128×160.
4. Predalien — 6×4, 160×180.
5. Facehugger — 6×4, 96×96.
6. Human looter — 6×4, 96×128.

La sheet `human-looter-sprite-sheet.svg` est une interprétation vectorielle originale destinée à la lisibilité de gameplay ; elle ne reprend ni visage ni costume photographique d'un acteur.

## Remplacement futur

Chaque sheet est référencée par clé dans `game.js` et par fichier dans `assets/atlas-manifest.json`. Un futur sprite définitif peut donc remplacer une sheet sans modifier les règles de combat.

## Standalone

`tools/build-standalone.mjs` encode les six SVG en data URI puis les injecte dans `JOUER_AVPR_WOLF_V06.html`. Le standalone ne dépend d'aucune ressource distante.
