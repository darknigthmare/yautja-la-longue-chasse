# V132 — traçabilité de fidélité visuelle des planètes

**Continuation de la PR #39, sans nouvelle PR.**

Le registre machine-readable `app/game/data/planetVisualFidelityV132.json` couvre la totalité des **120 formes V115** et **48 matières complémentaires V125/V130**. Aucun élément n’est faussement certifié « 1:1 ». Les variantes paramétriques sont des créations originales qui servent à enrichir des mondes procéduraux ; la fidélité de leurs contraintes géographiques et écologiques doit être distinguée de la reproduction visuelle exacte d’un plan d’un film.

## Références de production attestées

- 20th Century Studios, *Predator: Badlands* : https://www.20thcenturystudios.com/movies/predator-badlands
- Disney, présentation de la production et du décor planétaire : https://thewaltdisneycompany.com/news/predator-badlands/
- New Zealand Film Commission, environnement des prises de vues (Rotorua, terrains géothermiques, dorsales volcaniques, forêts) : https://www.nzfilm.co.nz/films/predator-badlands
- Disney, description du supplément `Building the Badlands` et de l’exploration du Homeworld : https://press.disney.co.uk/news/be-the-first-to-watch-predator-badlands-at-home-on-digital-jan-6

**Attention :** Rotorua est un lieu réel de **tournage**, pas une localisation du récit sur Terre. Un paysage forestier ou volcanique terrestre peut guider l’aspect de Genna, sans autoriser le placement de Gunnison, Los Angeles ou d’autres lieux narratifs terrestres sur une planète extraterrestre. Aucun de ces communiqués ne publie une carte géoréférencée des continents de Genna ni les UV matériaux officiels.

## Comment fermer un dossier 1:1

1. Identifier l’œuvre, la continuité, la scène et l’instant exact avec une source image autorisée.
2. Extraire une capture de référence par la procédure autorisée par l’ayant droit, sans republier d’images non licenciées dans le dépôt.
3. Reproduire projection, environnement, angle de caméra, emprise physique et lumière.
4. Comparer géométrie, contours, alpha, palette et les cinq canaux de matière dans un outil de différence d’images ; relever les écarts, pas seulement déclarer un rendu « fidèle ».
5. Réviser l’état du registre uniquement lorsque la preuve, sa licence et le rendu du jeu sont disponibles, vérifiés et archivés.

En attendant, le champ `approved1to1` reste `false` partout. Une étude originale peut être cohérente avec le *lore* sans être une reconstitution 1:1. Le test `tests/planet-visual-fidelity-v132.test.mjs` empêche les omissions de références et les affirmations de certification non documentées.
