# Registre de références roster Yautja V14

Ce lot corrige une attribution du catalogue V6 et ajoute cinq entrées
append-only sans modifier le classeur archivé ni renuméroter les IDs existants.

Le manifeste sépare strictement :

- les pages officielles ou licenciées utilisées comme références ;
- les ancres visuelles propres à chaque identité ;
- les mélanges de designs interdits ;
- le statut de l'asset original du projet ;
- les chemins runtime, uniquement lorsqu'une plaque propre existe déjà.

Les images des pages NECA, 20th Century Studios, Hulu, Archie Comics,
Dark Horse et ArtStation ne sont pas des assets runtime. Aucun photogramme,
scan, texture ou pixel officiel n'est copié dans le jeu.

`planned-custom` signifie qu'un visuel original propre devra être produit et
validé avant de pouvoir être présenté comme fidèle. Le jeu peut conserver une
reconstruction modulaire explicitement signalée, mais celle-ci ne constitue
jamais une reproduction individuelle exacte.

## Première vague visuelle

Trois plaques individuelles originales ont été générées séparément avec le
générateur d'images OpenAI intégré, en composition 2D plein pied trois-quarts
sur chroma `#00ff00`, puis détourées localement en WebP alpha :

- `Y-258` : Elder de Bouvetøya avec cape à chaîne, staff et biomask cérémoniel ;
- `Y-259` : prisonnier de *Killer of Killers*, sans armure, blessé et entravé ;
- `Y-260` : archétype Arena Guard fondé sur le concept de production Marantz.

Les PNG chroma acceptés sont conservés sous `masters/`. Les seuls fichiers
chargés par le jeu sont sous
`public/game/sprites/v14/yautja-roster/`. Les images de référence téléchargées
pour l'inspection ont séjourné uniquement sous `tmp/`, répertoire ignoré, et ne
font partie ni des masters ni du runtime.

## Continuités

- `canon` : continuité écran Predator principale ;
- `crossover` : films AVP / AVPR ;
- `expanded` : jeux, comics et autres médias licenciés ;
- `fan` : créations non officielles.

## Fichiers liés

- registre runtime : `app/game/catalogueRoster.ts` ;
- résolution visuelle : `app/game/catalogueAppearance.ts` ;
- catalogue responsive : `app/game/CatalogueHunterBrowser.tsx` ;
- masters chroma : `art-source/v14/roster/masters/` ;
- sprites alpha : `public/game/sprites/v14/yautja-roster/` ;
- test de contrat V14 : `tests/catalogue-roster-v14.test.mjs`.
