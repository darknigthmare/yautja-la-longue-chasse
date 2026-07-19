# Pack ennemi V4 — variantes de chasse

Ces sept silhouettes sont des créations bitmap originales générées avec l’outil
ImageGen intégré d’OpenAI le 19 juillet 2026. Les sprites existants du projet
ont servi de références de style et d’angle afin de conserver la même échelle,
la même vue latérale et la même direction artistique. Aucun sprite officiel
extrait d’un film ou d’un jeu n’est inclus.

## Pipeline

Chaque source a été générée sur un aplat chromatique, puis détourée avec le
script officiel `remove_chroma_key.py` fourni avec le skill ImageGen. Les PNG
runtime gardent leur canal alpha et sont chargés selon l’archétype de chaque
vague.

| Source chroma | Sprite runtime | Archétype |
| --- | --- | --- |
| `sources/rifle-soldier-chroma.png` | `public/game/sprites/v4/rifle-soldier.png` | Fantassin de Vey |
| `sources/scout-chroma.png` | `public/game/sprites/v4/scout.png` | Éclaireur de Vey |
| `sources/heavy-chroma.png` | `public/game/sprites/v4/heavy.png` | Artilleur lourd |
| `sources/cryostalker-runner-chroma.png` | `public/game/sprites/v4/cryostalker-runner.png` | Prédateur cryogénique rapide |
| `sources/cryostalker-brute-chroma.png` | `public/game/sprites/v4/cryostalker-brute.png` | Prédateur cryogénique cuirassé |
| `sources/bad-blood-initiate-chroma.png` | `public/game/sprites/v4/bad-blood-initiate.png` | Disciple du Bad Blood |
| `sources/commandante-vey-chroma.png` | `public/game/sprites/v4/commandante-vey.png` | Commandante Vey, cible Apex complète |

## Prompts finaux, un par archétype

### Fantassin de Vey

```text
Use case: stylized-game-asset
Asset type: full-body enemy sprite for a 2D side-scrolling hunting game
Primary request: create an original veteran jungle rifle soldier serving a
ruthless expedition commander, distinct from the supplied project mercenary
while matching its scale, side-view silhouette and pixel-art rendering
Subject details: practical olive and charcoal tropical combat uniform, plate
carrier, compact assault rifle shouldered forward, radio, pouches, wet boots,
alert cautious posture; human proportions; no insignia or readable text
Style/medium: ultra-detailed hand-painted HD pixel art, crisp intentional pixel
clusters, dark cinematic science-fiction realism, coherent with the supplied
project sprite
Composition/framing: isolated full body, strict 3/4 side view facing right,
feet fully visible, neutral combat-ready stance, centered with generous margin
Background: perfectly flat solid #ff00ff chroma key, no floor, shadow or glow
Constraints: one character only; no Predator/Yautja character; no UI, logo,
caption, watermark, scenery or cropped equipment
```

### Éclaireur de Vey

```text
Use case: stylized-game-asset
Asset type: full-body enemy sprite for a 2D side-scrolling hunting game
Primary request: create an original fast jungle reconnaissance scout matching
the supplied project mercenary’s angle, scale and visual language
Subject details: lightweight mottled poncho, suppressed carbine held low,
binocular sensor, compact backpack, climbing rope, lean silhouette, vigilant
forward step, wet mud and leaf wear; no insignia or readable text
Style/medium: ultra-detailed hand-painted HD pixel art, crisp intentional pixel
clusters, dark cinematic science-fiction realism
Composition/framing: isolated full body, strict 3/4 side view facing right,
feet fully visible, centered, readable silhouette at small gameplay scale
Background: perfectly flat solid #ff00ff chroma key, no floor, shadow or glow
Constraints: one character only; no UI, logo, caption, watermark or scenery
```

### Artilleur lourd

```text
Use case: stylized-game-asset
Asset type: full-body heavy enemy sprite for a 2D side-scrolling hunting game
Primary request: create an original armored expedition heavy gunner matching
the supplied project mercenary’s angle, scale and detailed pixel-art language
Subject details: bulky composite body armor, reinforced helmet and amber visor,
belt-fed support weapon, ammunition pack and visible feed, braced grounded
stance, jungle grime and chipped plates; human anatomy under equipment
Style/medium: ultra-detailed hand-painted HD pixel art, crisp deliberate pixel
clusters, dark cinematic science-fiction realism
Composition/framing: isolated full body, strict 3/4 side view facing right,
feet and complete weapon visible, centered with generous margin
Background: perfectly flat saturated magenta chroma key, no floor or shadow
Constraints: one character only; no Yautja design language, text, UI, logo,
watermark, scenery or cropped parts
```

### Cryostalker runner

```text
Use case: stylized-game-asset
Asset type: full-body alien beast sprite for a 2D side-scrolling hunting game
Primary request: create an original juvenile cryogenic apex predator derived
from the supplied project Cryostalker’s species language, but visibly faster,
leaner and less armored
Subject details: quadrupedal runner, long forelimbs, translucent ice-blue hide,
frosted dorsal quills, narrow predatory skull, pale bioluminescent seams,
clawed feet and condensed breath, anatomical weight and readable joints
Style/medium: ultra-detailed hand-painted HD pixel art, crisp intentional pixel
clusters, dark cinematic creature realism coherent with the supplied sprite
Composition/framing: isolated complete creature, strict side view facing right,
low stalking run pose, every limb visible, centered with generous margin
Background: perfectly flat solid #00ff66 chroma key, no ground, shadow or glow
Constraints: one creature only; no text, HUD, logo, watermark or scenery
```

### Cryostalker brute

```text
Use case: stylized-game-asset
Asset type: full-body alien beast sprite for a 2D side-scrolling hunting game
Primary request: create an original mature armored Cryostalker brute using the
supplied project creature as a species reference while making this variant
broader, heavier and plated
Subject details: massive quadruped, three readable ice armor plate groups,
crystalline shoulder and spine growths, thick forelimbs, broad skull, damaged
frost carapace, pale blue bioluminescent tissue and believable weight
Style/medium: ultra-detailed hand-painted HD pixel art, crisp intentional pixel
clusters, dark cinematic creature realism coherent with the supplied sprite
Composition/framing: isolated complete creature, strict side view facing right,
heavy braced pose, all limbs and tail visible, centered with generous margin
Background: perfectly flat solid #00ff66 chroma key, no ground, shadow or glow
Constraints: one creature only; no text, HUD, logo, watermark or scenery
```

### Disciple du Bad Blood

```text
Use case: stylized-game-asset
Asset type: full-body hostile alien hunter sprite for a 2D side-scrolling game
Primary request: create an original exiled alien-hunter initiate who belongs to
the same visual faction as the supplied project Bad Blood sprite, but remains a
smaller subordinate rather than a copy of the boss
Subject details: athletic humanoid hunter, blackened segmented armor, scarred
organic skin, compact biomask with asymmetrical red optics, short wrist blades,
ritual cords and damaged netting, aggressive stalking posture; original armor
shapes and markings
Style/medium: ultra-detailed hand-painted HD pixel art, crisp intentional pixel
clusters, dark cinematic science-fiction realism coherent with the supplied
project sprite
Composition/framing: isolated full body, strict 3/4 side view facing right,
feet and equipment fully visible, centered with generous margin
Background: perfectly flat solid #00ff66 chroma key, no floor, shadow or glow
Constraints: one character only; no copied film costume, no readable glyph,
text, HUD, logo, watermark, scenery or cropped equipment
```

### Commandante Vey

```text
Use case: stylized-game-asset
Asset type: unique full-body Apex target and briefing cutout for a 2D
side-scrolling hunting game
Primary request: create an original veteran female expedition commander whose
silhouette, equipment and authority remain immediately distinct from her
riflemen, while preserving the project’s detailed tactical pixel-art language
Subject details: olive and charcoal expedition armor, long braided dark hair,
command headset and radio, worn red unit markings, heavy coil rifle held across
the torso, utility transponder, reinforced boots, weathered jungle equipment;
human anatomy and believable military load
Style/medium: ultra-detailed hand-painted HD pixel art, crisp authored pixel
clusters, dark cinematic science-fiction realism
Composition/framing: one complete character in a strict 3/4 side view facing
left, head, rifle and both boots entirely visible, standing pose, centered with
generous safety margin for responsive object-fit contain
Background: uniform perfectly flat chroma-key green #00ff00, no floor, shadow
or scenery
Constraints: no cropped body part or weapon, no Predator/Yautja design, no
readable text, UI, logo, caption or watermark
```
