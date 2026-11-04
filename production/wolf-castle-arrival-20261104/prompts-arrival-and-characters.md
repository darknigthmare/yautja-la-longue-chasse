# Prompts exacts — château et arrivée

Date : 4 novembre 2026. Chaque fichier est une génération individuelle. Les sprites de personnage et d’objet ont un canal alpha; aucun atlas n’a été découpé. Validation artistique humaine encore à effectuer.

## castle_exterior — Château orbital · extérieur

Fichier : `public/game/wolf-castle/v1/castle-exterior.png`

Base : Architecture pyramidale de la planche citée; volume et éclairage adaptés au jeu.

```text
Use case: stylized-concept. Production game asset, ONE standalone transparent PNG sprite. Reference image is visual reference for the Predator King's orbital castle from Predator vs Black Panther, Wolf System. Generate the entire monumental orbital fortress as a coherent single object, zoomed out to show ALL edges with 8% transparent margin, 3/4 overhead view corresponding to reference. Match the very distinctive geometry: huge central broad silver-gray faceted pyramid, many smaller stepped pyramids and geometric tower blocks stacked around its corners, black recessed structural bands and many narrow orange illuminated grille slits. Angular ancient alien architecture, heavy grey bronze-black armor, straight triangular planes. This is the same castle silhouette, not a conventional spaceship or medieval Earth castle. Detailed hand-painted cinematic game art, crisp strong silhouette at 700px wide, realistic scale with enormous reinforced recessed docking bay, no miniature toys. No planet, no stars, no text, no panels, no captions, no people, no other ships, no ground shadow. True transparent background. Single complete independent sprite only, never an atlas. Preserve visual source geometry and warm orange illumination; unseen backside extrapolated conservatively. Landscape 1536x1024 framing.
```

## arrival_space — Champ stellaire

Fichier : `public/game/planet-arrival/v1/space.png`

Base : Fond original; aucun titre ni planète incrustés.

```text
Use case: stylized-concept. Production background plate for a 2D science-fiction game's orbital arrival cinematic inspired by the restrained opening space shot of Predator 1987. ONE clean standalone wide image, cinematic 16:9 black deep space starfield, fine sparse varied stars, extremely subtle dark blue dust haze at edges, dark clear central and upper central negative space for dynamically rendered planet title. NO text, no logos, no planets, no spacecraft, no bright nebula, no sun, no lens flare. Detailed film-like atmosphere, dark yet readable, refined and restrained. Full bleed opaque space background, no border, no multi-panel sheet.
```

## arrival_pod_flight — Capsule · vol

Fichier : `public/game/planet-arrival/v1/pod-flight.png`

Base : Identité de capsule AVP existante du catalogue. Ne constitue pas une reconstitution certifiée de la capsule de 1987.

```text
Use case: stylized-concept. ONE individual production sprite for a Yautja / Predator game orbital drop capsule. The reference is the game's existing drop pod design, preserve this exact craft identity: elongated blunt armored nose to the RIGHT, dark gunmetal oval capsule, layered biomechanical ribs, three rear swept petal fins on LEFT and three compact orange thruster lights. Depict closed flight configuration in SIDE VIEW, no top-down. Full single craft centered, complete silhouette including every fin with 10% empty margins, horizontal long axis. Retain the proportions and material details of reference but convert to clean detailed painted game sprite with clear midtone readability, warm subtle edges. No characters, no environment, no attached flame, no trails, no text, no extra views or panels. Actual transparent background. This is an adaptation using existing game capsule, not a new carrier ship. Aim wide 1536x1024.
```

## arrival_heat_trail — Traînée de rentrée

Fichier : `public/game/planet-arrival/v1/heat-trail.png`

Base : Effet original séparable; origine à gauche, traînée à droite.

```text
Use case: stylized-concept. ONE isolated independent re-entry heat VFX sprite for a 2D alien drop pod cinematic. A long aerodynamic amber-orange and white-hot plasma wake, compact bright origin on the LEFT flowing and tapering away toward RIGHT, diffuse ember orange tail, fine streaks and tiny glowing particles, broad 3:1 landscape composition, generous transparent margin all around. Semi-realistic hand-painted game art. NO physical spacecraft, no capsule, no terrain, no clouds, no smoke rectangle, no text, no UI, no atlas or animation frames. True transparent background and soft natural alpha edges. Designed as separate overlay rotated by code to the capsule velocity.
```

## arrival_release_jet — Jet d’éjection

Fichier : `public/game/planet-arrival/v1/release-jet.png`

Base : Effet original séparable; origine à gauche.

```text
Use case: stylized-concept. ONE isolated standalone VFX sprite for a 2D science fiction orbital capsule ejection. Compact pale icy blue compressed-gas thruster burst beginning at a small bright emission point on the LEFT edge of the plume and spreading softly toward the RIGHT. Short tapered translucent jet with a few faint particles, subtle white-blue core, wide aspect 2:1, whole effect contained with transparent margins. Painted realistic game effect. No ship, no pod, no fireball, no background, no ground, no text, no extra frames, no atlas. True alpha transparency with feathered edges, restrained bloom.
```

## arrival_clouds — Couche de nuages

Fichier : `public/game/planet-arrival/v1/atmosphere-clouds.png`

Base : Parallaxe atmosphérique originale; trou central pour lisibilité.

```text
Use case: stylized-concept. ONE independent transparent atmospheric cloud layer sprite for a 2D alien planetary descent cinematic. Wide horizontal sweep of sparse soft silver-blue high altitude wisps, cloud clusters concentrated at side edges with a thin drifting band lower center, plenty of true transparent air between them. Cinematic realistic painted sky vapor, subtle shadowed blue grey bottom and lit white upper edges, fine feathered translucent alpha. NO sky fill, no planet, no spacecraft, no characters, no sun, no stars, no text, no collage or atlas. Single full layer with all wisps contained inside canvas; landscape 2:1. Must composite over any dynamically chosen planet or biome.
```

## arrival_dust — Poussière d’impact

Fichier : `public/game/planet-arrival/v1/impact-dust.png`

Base : Effet d’impact original; teinté par biome au rendu.

```text
Use case: stylized-concept. ONE isolated impact dust VFX sprite, a grounded low wide expanding dust cloud from an alien landing capsule, viewed from SIDE at character height. Horizontal baseline near bottom, dense compact pale beige grey central impact plume rising a little, two outward billowing wings with fine airborne specks and thin curling wisps, no rock larger than a pebble. Central lower gap hints where pod stands but no pod is drawn. Painted cinematic game particle effect, subtle warm reflected amber lighting. Full cloud contained, 10% transparent margins. TRUE transparent background, feathered alpha, no scenery, no terrain, no object, no flames, no border, no text, no animation sheet. Aspect2:1, one independent sprite.
```

## arrival_pod_ground — Capsule · sol ouverte

Fichier : `public/game/planet-arrival/v1/pod-ground.png`

Base : Déclinaison verticale de la capsule de vol, porte séparée.

```text
Use case: precise-object-edit. Create ONE separate ground-state sprite of this EXACT Yautja drop capsule; preserve metal ribbing, bronze gunmetal material, three rear fins and orange reactor cluster, same craft identity. Rotate the capsule upright nose DOWN, rear three orange nozzles at TOP, seen almost FRONT with only a slight 3/4 revealing right depth. The central long curved armored front door has been REMOVED (not included anywhere) to expose an empty dark vertical doorway/cockpit recess through which a tall Yautja can step out to the right. Bottom rounded armored nose forms grounded base; do not add human airplane gear. Rear fins folded closely toward body to frame it without blocking doorway. Full silhouette, tall portrait canvas, 10% transparent margin all around. Empty capsule only, NO character, no ground, no scenery, no detached door, no dust, no text, no sheet. Detailed painted 2.5D game sprite, warm highlights, true transparent background. Grounded open-cavity configuration is a gameplay adaptation using the exact referenced hull.
```

## arrival_pod_door — Porte de capsule

Fichier : `public/game/planet-arrival/v1/pod-door.png`

Base : Panneau séparé animé autour de sa charnière haute.

```text
Use case: stylized-concept. From the referenced alien drop capsule, produce ONE independent removable front hatch/door plate sprite and nothing else, on true transparent background. The door is a long narrow dark gunmetal curved leaf-shaped panel from the rounded front capsule shell, with the same longitudinal raised metal ribs and thin engraved bronze edge details. Upright vertical orientation, rounded tip DOWN, hinge attachment at TOP, almost frontal slight 3/4 matching upright capsule entry. A single solid door leaf, no hole or glass, no frame, no capsule body, no thrusters, no ground, no other objects, no text. Complete silhouette with 12% alpha margin. Portrait aspect. Detailed realistic painted game art identical material family to reference. Designed to slide/rotate independently to reveal the landing pod doorway; just ONE plate.
```

## castle_guard — Garde royal

Fichier : `public/game/wolf-castle/v1/royal-guard.png`

Base : Garde de cour original, non identifié à un personnage canonique.

```text
Use case: stylized-concept. ONE full-body independent Yautja royal palace guard CHARACTER SPRITE for a Predator game, original royal court adaptation consistent with Predator vs Black Panther royal armor. A tall anatomically authentic Yautja with thick black dreadlocks, closed angular bone-bronze biomask, powerful muscular mottled grey-green skin visible between segmented dark bronze armor, restrained amber eye slit, ribbed armored gauntlets and greaves, compact ceremonial shoulder plates. Standing alert facing slightly LEFT toward player, one straight long combistick held VERTICALLY beside body, no motion or combat attack. No human face, no knight helmet, no cape bigger than body. Full head, every dreadlock, both feet and entire spear visible, generous 10% transparent margins, feet same ground baseline. Detailed painted 2.5D game art, lighting warm upper left, strong readable silhouette. Transparent background, NO scenery, NO platform, no extra character, no text, no labels, no atlas.
```

## castle_fog — Brume de sol

Fichier : `public/game/wolf-castle/v1/low-fog.png`

Base : Brume discrète originale indépendante du décor.

```text
Use case: stylized-concept. ONE transparent low floor mist overlay for a dark alien orbital castle interior, very thin horizontal silver grey vapor wisps hugging ground. Wide 3:1 aspect, sparse soft translucent curling strands near lower quarter, nearly transparent middle with only a few drifting curls, slight warm bronze reflected light and very faint cool edge. No ground or room, no columns, no characters, no text, no object, no frame, no atlas. True transparent background with subtle feathered alpha, complete effect fits inside generous transparent margin. Cinematic painted game VFX, low density so feet and interactive objects remain readable.
```

## castle_king_v2 — Roi Predator · assis

Fichier : `public/game/wolf-castle/v1/predator-king-seated.png`

Base : Masque osseux, silhouette et drapé inspirés du Roi de Predator vs. Black Panther. Sprite sans trône, cadrage révisé.

```text
Use case: precise-object-edit. This image is a standalone seated Predator King character sprite. Fix FRAMING ONLY: zoom out the entire same character to 78% of canvas, keeping every existing visible detail, the exact bone mask, dreadlocks, armor, seated posture, red cloth, and weapon silhouette unchanged. Reconstruct the tiny clipped tip of the sheathed sword at the top if needed so the ENTIRE sword tip is visible. Add generous genuine transparent empty space on ALL FOUR SIDES, minimum10% around the full character and sword. Feet, cape tips, fingers, every horn, every weapon edge must fit well inside the canvas. Do not add any throne, shadow, background, text, scenery, platform, other object or other character. Transparent PNG single asset, clean alpha edges. Preserve colors, perspective, pose and all identity features.
```

### Première version — remplacée pour cadrage

Lame et pieds proches des bords; nouveau cadrage complet.

```text
Use case: stylized-concept. ONE standalone production CHARACTER SPRITE of the Predator King from Predator vs Black Panther based directly on supplied comic visual identity. Preserve his huge ornate ivory bone-mask with large hooked cheek horns, ridged brow and central mechanical breathing ports; black thick dreadlocks, dark ribbed neck armor, asymmetric heavy bone-gold pauldrons, massive ornate alien blade SHEATHED vertically diagonally behind shoulder, muscular Yautja body, aged bronze black armor. Full-body SEATED POSE, empty hands resting near knees, knees bent and feet on same level, red ceremonial cloth around legs. Character alone with NO chair/throne/platform behind or beneath him; pose intended for compositing onto separate throne. Face at slight 3/4 toward viewer LEFT, fit entire body, feet, sword and all dreadlocks with generous alpha margin. Detailed hand-painted 2.5D game art consistent with dark bronze alien royal interiors. No text, no comic panel, no background, no other characters, no weapon in hand, no atlas. True transparent background, single character. Unseen seated lower-body details conservative adaptation preserving source identity.
```
