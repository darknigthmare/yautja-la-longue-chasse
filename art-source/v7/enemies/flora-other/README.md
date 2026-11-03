# Ennemis V7 — flore et autres

Ce lot contient dix planches d'animation bitmap originales generees le
22 juillet 2026 avec l'outil `image_gen` integre d'OpenAI. Les references ont
servi a cadrer les silhouettes, les matieres et les fonctions biologiques ;
aucune image officielle n'est redistribuee dans ce dossier.

## Livrables

Chaque PNG runtime est en `RGBA`, mesure `1536 x 192` et contient six cellules
de `256 x 192`, dans cet ordre : `idle`, `move A`, `move B`, `attack`, `hit`,
`death`. Tous les sujets regardent vers la droite.

| Categorie | ID | Planche runtime | Ligne source |
| --- | --- | --- | ---: |
| Flore | `carnivore-vine` | `public/game/sprites/v7/enemies/flora-other/carnivore-vine-sheet.png` | master 1, ligne 1 |
| Flore | `spore-bloom` | `public/game/sprites/v7/enemies/flora-other/spore-bloom-sheet.png` | master 1, ligne 2 |
| Flore | `razor-reed` | `public/game/sprites/v7/enemies/flora-other/razor-reed-sheet.png` | master 1, ligne 3 |
| Flore | `grapple-root` | `public/game/sprites/v7/enemies/flora-other/grapple-root-sheet.png` | master 1, ligne 4 |
| Flore | `acid-pitcher` | `public/game/sprites/v7/enemies/flora-other/acid-pitcher-sheet.png` | master 1, ligne 5 |
| Flore | `sentinel-orchid` | `public/game/sprites/v7/enemies/flora-other/sentinel-orchid-sheet.png` | master 2, ligne 1 |
| Autre | `xeno-drone` | `public/game/sprites/v7/enemies/flora-other/xeno-drone-sheet.png` | master 2, ligne 2 |
| Autre | `xeno-praetorian` | `public/game/sprites/v7/enemies/flora-other/xeno-praetorian-sheet.png` | master 2, ligne 3 |
| Autre | `weyland-synth` | `public/game/sprites/v7/enemies/flora-other/weyland-synth-sheet.png` | master 2, ligne 4 |
| Autre | `ancient-guardian` | `public/game/sprites/v7/enemies/flora-other/ancient-guardian-sheet.png` | master 2, ligne 5 |

Les quatre fichiers de production sont conserves sous `masters/` : les deux
sources chroma magenta et leurs equivalents detoures avec alpha.

## Pipeline de transparence et controles

1. Generation sur un fond parfaitement uni magenta `#ff00ff`.
2. Copie des masters depuis le stockage `generated_images` d'OpenAI vers le
   projet.
3. Detourage avec le script officiel du skill ImageGen :

   ```text
   python remove_chroma_key.py --input <master-chroma.png> --out <master-alpha.png> --auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill
   ```

4. Decoupe par ligne puis normalisation en `1536 x 192`.
5. Verification automatique : 10/10 PNG en RGBA, dimensions exactes, quatre
   coins transparents, contenu visible dans chacune des 60 cellules, fichiers
   tous distincts.
6. Verification visuelle des deux masters et des planches
   `carnivore-vine`, `xeno-drone`, `weyland-synth`, `sentinel-orchid` et
   `ancient-guardian`.

Le premier cadrage du synthétique capturait le sommet du gardien situe sur la
ligne suivante. Cette planche a ete rejetee, recadree sur la bande source
correcte puis recontrolee avant validation.

## Prompt final — master 1 (flore)

```text
Use case: stylized-concept
Asset type: production animation master sheet for a high-detail 2D side-scrolling science-fiction hunting game
Primary request: create ONE exact sprite animation master sheet containing FIVE distinct original hostile alien flora species, arranged in a strict 5-row by 6-column matrix. Each row shows the same creature consistently across six animation frames, and every creature faces RIGHT.
Scene/backdrop: perfectly flat, uniform solid magenta #ff00ff chroma-key color across the entire canvas and every gutter; no floor plane, no environment.
Style/medium: ultra-detailed hand-painted HD pixel art, crisp intentional pixel clusters, dark cinematic late-1980s biomechanical science-fiction realism, readable side-view silhouettes, consistent upper-left neutral light, identical scale and anatomical identity within each row.
Composition/framing: landscape canvas. EXACTLY 5 equal horizontal rows and EXACTLY 6 equal columns. No drawn grid, no borders and no labels. One fully isolated pose centered in each cell with generous padding. No limb, vine, root, leaf, projectile, acid, spore or body part may touch or cross any cell boundary. Every subject is fully visible.
Animation columns from LEFT to RIGHT in EVERY row: 1 idle, 2 move A, 3 move B, 4 attack, 5 hit recoil, 6 death.
ROW 1 carnivore-vine: a mobile knot of black-burgundy woody vines with hooked ivory thorns and a three-lobed snapping maw; move frames crawl using coiled root loops; attack is one controlled forward vine lash; hit recoils; death is completely wilted but remains wholly inside its cell.
ROW 2 spore-bloom: squat poisonous flower organism, muscular root legs, layered ochre and bruised-violet petals around a dark pod; move frames take two readable root-steps; attack opens and ejects a compact cluster of solid pale spores that stays close and opaque; hit closes sharply; death collapses and desiccates.
ROW 3 razor-reed: mobile colony of glasslike slate reeds bound by fibrous roots, no ordinary grass; move frames scuttle on four roots; attack fans rigid serrated blades forward; hit bends backward; death is a shattered flattened clump, all shards retained within cell.
ROW 4 grapple-root: dense red-brown root animal with six grasping tendrils and a buried-looking central jaw; move frames alternate root pulls; attack extends exactly one thick crushing root forward; hit knots inward; death slackens into a low inert tangle.
ROW 5 acid-pitcher: walking carnivorous pitcher plant with two heavy lime-veined cups, four bark legs and a thorn lid; move frames alternate legs; attack tilts one cup and spits one small opaque amber acid glob kept within cell; hit lids shut; death cups rupture and wilt without gore.
Color palette: hostile natural colors—black bark, burgundy, ochre, bone thorns, slate crystal, restrained toxic lime accents. Never use magenta or pink in any subject.
Constraints: exact 5x6 layout; exactly 30 poses; facing right; consistent creature design per row; fully visible; no overlapping cells; no crop; no cast shadow; no contact shadow; no reflection; no translucent smoke; no lighting halo; no scenery; no text; no letters; no numbers; no symbols; no UI; no watermark; no logo; no frame; no grid line.
Avoid: concept-art montage, perspective turnarounds, mixed species within a row, extra creatures, human anatomy, weapons, excessive gore, motion blur, anti-aliased painterly blur, gradients or texture in the magenta background.
```

## Prompt final — master 2 (flore, xenomorphes, synthetique, gardien)

```text
Use case: stylized-concept
Asset type: production animation master sheet for a high-detail 2D side-scrolling Alien-versus-Predator-inspired hunting game
Primary request: create ONE exact sprite animation master sheet containing FIVE distinct hostile enemies, arranged in a strict 5-row by 6-column matrix. Each row shows the exact same enemy consistently across six animation frames, and every enemy faces RIGHT.
Scene/backdrop: perfectly flat, uniform solid magenta #ff00ff chroma-key color across the entire canvas and every gutter; no floor plane, no environment.
Style/medium: ultra-detailed hand-painted HD pixel art, crisp intentional pixel clusters, dark cinematic late-1980s biomechanical science-fiction realism, readable side-view gameplay silhouettes, consistent upper-left neutral light, identical scale and identity within each row.
Composition/framing: landscape canvas. EXACTLY 5 equal horizontal rows and EXACTLY 6 equal columns. No drawn grid, no borders and no labels. One fully isolated pose centered in each cell with generous padding. No limb, root, tail, weapon, projectile, acid, body part or accessory may touch or cross any cell boundary. Every subject is fully visible from tip to toe or root.
Animation columns from LEFT to RIGHT in EVERY row: 1 idle, 2 move A, 3 move B, 4 attack, 5 hit recoil, 6 death.
ROW 1 sentinel-orchid: original mobile carnivorous alien orchid, ivory six-petal crown around one dark sensory pistil, black-green plated stem, four articulated root legs and two thorn arms; move frames alternate root steps; attack thrusts the rigid pistil and closes petals; hit recoils; death is fully wilted and flattened.
ROW 2 xeno-drone: recognizable classic adult Xenomorph drone silhouette, glossy black biomechanical exoskeleton, smooth elongated domed head, exposed rib cage, digitigrade legs, dorsal tubes, clawed hands and long segmented tail; move frames are two low stalking steps; attack uses inner jaw while tail stays contained; hit arches backward; death collapses on side. Consistent anatomy in all six frames.
ROW 3 xeno-praetorian: much larger elite Xenomorph Praetorian caste, massive ridged crown-like head shield clearly different from drone, heavy black biomechanical chest, thick limbs, tall dorsal spikes and bladed segmented tail; two ponderous steps; attack is a forward claw-and-head charge; hit braces backward; death slumps with broken stance. Consistent anatomy in all six frames.
ROW 4 weyland-synth: original Weyland-Yutani field synthetic enemy, gender-neutral adult human android with short pale hair and no actor likeness, white-and-gray expedition pressure suit, black joint seams, small amber chest light, exposed ivory polymer and milky fluid at one damaged forearm, compact pulse carbine kept entirely inside cell; two tactical walking steps; attack aims carbine with one small opaque muzzle flash; hit reveals damaged side; death is powered-down kneeling collapse. No readable corporation text or logo.
ROW 5 ancient-guardian: original ancient pyramid guardian automaton blending weathered basalt, dark bronze Predator-like alien technology and restrained turquoise energy seams, tall broad humanoid silhouette, masked faceless head, four heavy arms, asymmetrical ritual blade but no copied franchise character; two mechanical steps; attack swings one blade forward; hit armor panels stagger; death breaks into a compact inert kneeling form, all parts retained.
Color palette: black, graphite, bone, white polymer, weathered bronze, basalt, restrained amber and turquoise accents. Never use magenta or pink in any subject.
Constraints: exact 5x6 layout; exactly 30 poses; facing right; consistent enemy design per row; fully visible; no overlapping cells; no crop; no cast shadow; no contact shadow; no reflection; no translucent smoke or fluid; no gore spray; no lighting halo; no scenery; no text; no letters; no numbers; no symbols; no UI; no watermark; no logo; no frame; no grid line.
Avoid: concept-art montage, perspective turnarounds, mixed designs within a row, extra creatures, duplicated limbs beyond specified anatomy, cropped tails or weapons, excessive gore, motion blur, anti-aliased painterly blur, gradients or texture in the magenta background.
```

## References de conception

- [Predator: Badlands — critique AP](https://apnews.com/article/predator-badlands-movie-review-8ba41d0dec022713a5374fcf22fe5d5e) : spores paralysantes, herbe coupante, racines chasseuses et presence d'un synthetique.
- [Aliens versus Predator 2: Primal Hunt — flore de LV-1201](https://avpunknown.com/games/2000/avp2primalhunt) : plantes fluorescentes, capsules de spores toxiques, canopee alien et predation souterraine.
- [Aliens vs Predator (2010) — galerie de concept art](https://www.avpgalaxy.net/games/aliens-vs-predator-2010/gallery/concept-art/) : langage biomecanique et silhouettes de combat xenomorphes.
- [AvP Central — projections acides des xenomorphes](https://www.avpcentral.com/xenomorph-acid-spitting) : fonctions corrosives et castes specialisees.
- [MPC — Alien vs Predator](https://www.mpcvfx.com/en/filmography/alien-vs-predator/) : pyramide ancienne, architecture numerique et confrontation de castes.
- [Computer Graphics World — technologie de The Predator](https://www.cgw.com/Press-Center/Web-Exclusives/2018/Envisioning-Alien-Technology-for-The-Predator.aspx) : lignes militaires, point cloud, geometrie complexe et refraction minerale.
