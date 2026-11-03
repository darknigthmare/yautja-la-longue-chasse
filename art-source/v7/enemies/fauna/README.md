# Lot V7 — faune ennemie animée

Ce lot contient dix ennemis de faune originaux, chacun livré sous forme de
planche d'animation PNG RGBA `1536×192`. Une planche contient six cellules
égales de `256×192`, dans l'ordre immuable : `idle`, `walk-a`, `walk-b`,
`attack`, `hit`, `death`. Tous les sujets vivants regardent vers la droite.

Les images ont été générées avec l'outil `image_gen` intégré d'OpenAI, puis le
fond uni magenta a été retiré avec le helper officiel du skill `imagegen` :

```text
remove_chroma_key.py --auto-key border --soft-matte \
  --transparent-threshold 12 --opaque-threshold 220 --despill
```

Le découpage runtime ne repose pas sur cinq bandes horizontales arbitraires.
Les deux masters RGBA contiennent chacun exactement trente composantes alpha
significatives. Chaque silhouette est isolée avec sa frange anti-crénelée,
redimensionnée avec une échelle commune aux six poses de son espèce, puis
centrée dans une cellule transparente `256×192`. Cette méthode empêche qu'un
morceau de la ligne précédente ou suivante apparaisse dans une planche.

Les pages et images liées ci-dessous ont servi à comprendre les silhouettes,
les matériaux et l'écologie de chasse. Elles ne sont pas incluses dans le
projet. Les bitmaps livrés sont des créations de fan originales et non des
extractions de films ou de jeux.

## Dix entrées et leurs prompts

| ID | Prompt de créature | Références consultées |
| --- | --- | --- |
| `hell-hound-stalker` | Traqueur quadrupède extraterrestre original, très bas et nerveux, peau reptilienne noire segmentée, quilles dorsales, gueule fendue à défenses, membres antérieurs puissants et yeux ambrés ; six poses de gameplay cohérentes vers la droite. | [*Predators* — 20th Century Studios](https://www.20thcenturystudios.com/movies/predators), [Game Preserve Planet — AvP Central](https://www.avpcentral.com/predator-game-preserve-planet) |
| `river-ghost-brute` | Grand bipède insectoïde aveugle original, carapace externe ivoire segmentée sur tissus rouge rouille, épaules voûtées et avant-bras repliés en côtes qui s'ouvrent en longues griffes ; silhouette distincte d'un Yautja ; six poses. | [*Predators* — 20th Century Studios](https://www.20thcenturystudios.com/movies/predators), [River Ghost — AvP Galaxy](https://www.avpgalaxy.net/predator-movies/predators/river-ghost/) |
| `kalisk-juvenile` | Jeune monstre apex original, trapu, à six membres, plaques minérales noires, épines irrégulières, large gueule dentée, courts filaments sensoriels et fissures rouges bioluminescentes discrètes ; proportions juvéniles ; six poses. | [*Predator: Badlands* — 20th Century Studios](https://www.20thcenturystudios.com/movies/predator-badlands), [Kalisk — AvP Central](https://www.avpcentral.com/kalisk-giant-badlands-creature) |
| `cryostalker-alpha` | Prédateur des neiges quadrupède original, blanc bleuté, anatomie féline-reptilienne compacte, plaques dorsales cristallines, sacs thermiques cobalt, longues griffes et épaules d'alpha ; six poses. | [*Predator: Badlands* — 20th Century Studios](https://www.20thcenturystudios.com/movies/predator-badlands), [VFX de *Badlands* — SDFX](https://www.sdfxstudios.com/press/predator-badlands) |
| `lv1201-winged-vermin` | Vermine cornue extraterrestre de taille canine dans le langage écologique de LV-1201 : quatre ailes, plaques de chitine, abdomen courbe, pattes crochues, mandibules, ambre maladif et bleu-vert sombre ; six poses. | [*AvP2: Primal Hunt* — AvP Unknown](https://avpunknown.com/games/2000/avp2primalhunt), [LV-1201 — StrategyWiki](https://strategywiki.org/wiki/Aliens_versus_Predator_2/Gameplay) |
| `razorback-grazer` | Grande proie quadrupède originale aux proportions d'élan et de sanglier, longue crête frontale osseuse, plaques d'ardoise, cuir rouille, sabots-griffes et épines courtes ; attaque par coup de tête ; six poses. | [*Predators* — 20th Century Studios](https://www.20thcenturystudios.com/movies/predators), [Game Preserve Planet — AvP Central](https://www.avpcentral.com/predator-game-preserve-planet) |
| `amber-mire-lurker` | Prédateur amphibie original très bas, corps de salamandre à six pattes, lobes de carapace ambrés opaques, peau gris vase, bouche circulaire et queue-pagaie ; attaque embusquée ; six poses. | [*Predator: Badlands* — 20th Century Studios](https://www.20thcenturystudios.com/movies/predator-badlands), [VFX de *Badlands* — SDFX](https://www.sdfxstudios.com/press/predator-badlands) |
| `bonecrest-ravager` | Bipède extraterrestre rapide de type théropode, haute crête crânienne ivoire, écailles gris cendre, gorge bleu-vert, petits bras préhensiles, jambes digitigrades et queue crochue ; attaque de morsure ; six poses. | [*Predator: Badlands* — 20th Century Studios](https://www.20thcenturystudios.com/movies/predator-badlands), [VFX de *Badlands* — SDFX](https://www.sdfxstudios.com/press/predator-badlands) |
| `canopy-razorwing` | Animal aérien prédateur original à silhouette de raie-chauve-souris, quatre ailes articulées, torse blindé étroit, longue queue-lame, mâchoire crochue et palette vert forêt/os ; attaque plongeante ; six poses. | [*Predator: Badlands* — 20th Century Studios](https://www.20thcenturystudios.com/movies/predator-badlands), [VFX de *Badlands* — SDFX](https://www.sdfxstudios.com/press/predator-badlands) |
| `volcanic-ashmaw` | Reptile volcanique original massif et bas, six pattes, armure d'obsidienne fissurée d'orange, crâne en pelle cornu, gueule-fournaise, pattes fouisseuses et queue blindée ; morsure explosive sans particule ; six poses. | [*Predators* — 20th Century Studios](https://www.20thcenturystudios.com/movies/predators), [Game Preserve Planet — AvP Central](https://www.avpcentral.com/predator-game-preserve-planet) |

## Prompts complets des deux masters

Les deux générations ont partagé la même structure de production :

```text
Use case: stylized-concept
Asset type: production-ready 2D side-scrolling game enemy animation master sprite sheet
Primary request: exact 5-row by 6-column master sheet. Every row is one consistent alien fauna enemy. Columns, from left to right: idle, walk A, walk B, attack, hit recoil, death/collapse. All living creatures face right.
Scene/backdrop: perfectly flat, absolutely uniform solid #ff00ff chroma-key background.
Style/medium: high-detail hand-painted 2D game sprites with crisp pixel-art-informed edges, dark science-fiction realism, sharp readable silhouettes, muscular anatomy, layered organic armor and subtle specular highlights.
Composition/framing: invisible regular 5 x 6 grid, exactly 30 isolated full-body sprites; six equal-width cells per row and five equal-height rows; same design, scale, palette and anatomy across a row; no overlap, crop or contact with canvas edges.
Action clarity: idle alert; two alternating locomotion poses; attack toward the right; hit recoil backward; death fully collapsed or tumbling.
Lighting/mood: neutral upper-left sprite lighting, consistent in every cell.
Constraints: perfectly uniform #ff00ff with no shadow, gradient, texture, floor, reflection or lighting variation; no magenta in subjects; no text, labels, numbers, grid lines, borders, UI, logo or watermark.
```

Le **master A** ajoutait, dans l'ordre des lignes, les briefs complets de
`hell-hound-stalker`, `river-ghost-brute`, `kalisk-juvenile`,
`cryostalker-alpha` et `lv1201-winged-vermin` reproduits dans le tableau.

Le **master B** ajoutait, dans l'ordre des lignes, les briefs complets de
`razorback-grazer`, `amber-mire-lurker`, `bonecrest-ravager`,
`canopy-razorwing` et `volcanic-ashmaw` reproduits dans le tableau.

## Fichiers

- sources chroma : `masters/fauna-master-a-chroma.png` et
  `masters/fauna-master-b-chroma.png` ;
- sources RGBA détournées : `masters/fauna-master-a-alpha.png` et
  `masters/fauna-master-b-alpha.png` ;
- exports runtime : `public/game/sprites/v7/enemies/fauna/*-sheet.png` ;
- métadonnées d'intégration : `manifest.fragment.json`.
