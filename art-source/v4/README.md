# Pack visuel V4 — mondes et vaisseau

Ces quatre sources bitmap sont des créations originales générées avec l’outil
ImageGen intégré d’OpenAI le 19 juillet 2026. Elles servent de nouveaux fonds
de production au jeu ; aucun fichier extrait d’un film, d’une figurine ou d’un
jeu officiel n’est inclus.

## Sources et exports runtime

| Source de production | Export WebP consommé par le jeu | Usage |
| --- | --- | --- |
| `environments/openai-osiris-jungle-depth.png` | `public/game/backgrounds/jungle-depth-v4.webp` | Jungle lacustre, ruines et routes verticales |
| `environments/openai-nivalis-ice-depth.png` | `public/game/backgrounds/ice-depth-v4.webp` | Canyon glaciaire, colonnes et tunnels |
| `environments/openai-cinder-volcanic-depth.png` | `public/game/backgrounds/volcanic-depth-v4.webp` | Tribunal volcanique, consoles et arène |
| `environments/openai-yautja-ship-hub.png` | `public/game/backgrounds/ship-hub-v4.webp` | Vaisseau explorable en six salles |
| `environments/openai-jungle-props-atlas-chroma.png` | `public/game/props/v4/*.png` | Tronc, quatre plateformes et végétation modulaires |

Les sources mesurent `1672×941`. Les WebP sont encodés en RGB, qualité 88,
sans redimensionnement afin de préserver les clusters de pixels.

## Prompts finaux

### Osiris — jungle lacustre

```text
Use case: stylized-concept
Asset type: production background for a 2D side-scrolling Yautja hunting game
Primary request: an original ultra-detailed jungle hunting ground with a broad
misty lake, built for parallax gameplay and inspired by the humid South-American
menace and vertical jungle traversal associated with classic Predator hunting
environments, without copying any film frame or game asset
Scene/backdrop: distant storm mountains and pale alien moon; huge lake winding
across the far plane; middle-plane flooded ruins, abandoned paramilitary docks,
rope bridges, enormous buttress roots and climbable trees; no characters
Style/medium: high-end hand-painted pixel art, dark cinematic realism, crisp
intentional pixel clusters, 32-bit era detail upgraded for modern HD
Composition/framing: very wide 16:9 side view, horizon in upper third,
uninterrupted traversable silhouette along lower quarter, distinct far/mid/near
planes
Constraints: environment only; no character, text, HUD, logo or watermark;
original composition; readable gameplay lane
```

### Nivalis — cryomonde

```text
Use case: stylized-concept
Asset type: production background for a 2D side-scrolling Yautja hunting game
Primary request: an original cryogenic alien hunting world with traversal
routes, frozen caves and an apex-beast territory, not a recolored jungle
Scene/backdrop: glacier canyon under a dim gas giant; aurora, research wreckage,
ice bridges, climbable crystal columns, tunnels, waterfalls and fractured
pillars
Style/medium: high-end hand-painted pixel art, dark cinematic realism, crisp
intentional pixel clusters
Composition/framing: wide 16:9 orthographic side view, readable lower route,
three depth planes and multiple vertical routes
Constraints: environment only; no character, text, HUD, logo or watermark;
original composition; foreground must not hide gameplay
```

### Cinder — monde volcanique

```text
Use case: stylized-concept
Asset type: production background for a 2D side-scrolling Yautja hunting game
Primary request: an original volcanic Bad Blood hunting world with a ruined
Yautja tribunal, lava systems and multiple routes for a final hunt
Scene/backdrop: caldera beneath ash clouds and twin moons; obsidian ruins,
alien pylons, chain bridges, ritual arenas, three technological consoles and
cooling lava tunnels
Style/medium: high-end hand-painted pixel art, dark cinematic realism, crisp
deliberate pixel clusters
Composition/framing: wide 16:9 side view, continuous lower gameplay band,
vertical perches, tunnels and a readable boss arena
Constraints: no character, text, HUD, logo or watermark; original composition;
foreground must frame rather than obstruct
```

### Vaisseau de chasse

```text
Use case: stylized-concept
Asset type: interactive 2D game hub background
Primary request: an original highly detailed Yautja hunting ship interior with
six connected rooms: command bridge, armory, trophy hall, medbay, training
chamber and biomask archives
Scene/backdrop: ancient vessel with ribbed bronze-black architecture, chains,
red navigation displays, trophy alcoves and ritual technology
Style/medium: high-end hand-painted pixel art with dark cinematic realism and
crisp deliberate pixels
Composition/framing: ultra-wide 16:9 cutaway side view, continuous walkable
decks, distinct rooms, connected doorways and clear interactive stations
Constraints: environment only; no character, text, readable glyph, HUD, logo
or watermark; original layout
```

### Accessoires jungle modulaires

Le dernier atlas est découpé puis détouré en six textures RGBA indépendantes :
`tree-trunk.png`, `root-platform.png`, `ruin-platform.png`,
`crown-platform.png`, `expedition-platform.png` et
`foreground-ferns.png`. Le moteur peut ainsi placer, mettre à l’échelle et
faire défiler chaque élément sans rectangle de fond ni raccord coloré.

```text
Use case: stylized-game-asset
Asset type: high-resolution 2D pixel-art production sprite atlas
Primary request: six completely separate original jungle gameplay props in an
exact 3-column by 2-row grid: an ancient climbable tree trunk, a root-and-branch
platform, a mossy alien-ruin platform, a tree-crown platform, a weathered
expedition platform and a dense foreground fern/reed cluster
Subject details: humid moss, mud, knotted roots, readable handholds, oxidized
metal, timber, cables, restrained red utility lights and carved ruin geometry
Style/medium: richly detailed cinematic late-1980s science-fiction jungle,
crisp authored pixel art, limited earthy palette, consistent upper-left light
Composition/framing: every prop fully visible and centered in its own equal
cell, generous empty padding, no object touching or crossing a cell boundary
Background: uniform perfectly flat chroma-key green RGB #00ff00 across canvas
and gutters
Constraints: no shadows, floor, frame, grid line, label, text, logo, character,
weapon, extra scenery, blur or green halo
```

## Références d’ambiance

Les références servent à contrôler la logique de chasse, la verticalité et les
matériaux. Elles ne sont pas redistribuées :

- page officielle du film *Predator* (20th Century Studios) ;
- page officielle de *Predator: Hunting Grounds* (PlayStation) ;
- article officiel PlayStation/IllFonic sur la carte verticale Excavation.
