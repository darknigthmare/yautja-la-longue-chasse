# Ship interior 2.5D: generated art provenance

Date: 2026-11-05.

Seven individual images were generated through image_gen.imagegen: six transparent object cutouts and one opaque square floor material. Each generation call produced one requested asset, not a contact sheet. The PNG sources were retained unchanged. The six prop runtime files are lossless WebP encodings made with Sharp, without resizing, cropping, recoloring or alpha normalization.

## Recovery of the floor

The local environment became unavailable after all seven assets had been generated, inspected and measured. The original floor PNG was recovered directly from the retained image-generation data URL, without regeneration or pixel editing. Its length (2,849,410 bytes) and SHA-256 (414e75e8c33ffda7b31a382163bceeef1cf680324ef27d5a8d75f68ac9e088b4) were verified against the original measurement. Immutable GitHub blob: 7457bed609652d7b6fa81ada3994938eec7e2f9f. The source and runtime both use this exact PNG. The runtime path is now /game/ship-interior/v23/floor-panel.png. The earlier WebP was 1,896,644 bytes with SHA-256 29d3db8b747b582dec8660255ba11ba4edcc116a34caaf3e73b4583ad8243a8a; it is recorded only as provenance and is not the current runtime floor.

The metadata module and this document were reconstructed from retained generation records and measured values shared before the environment became unavailable. The seven exact prompts below and the input reference paths are preserved. The six prop pixels and runtime paths were not changed during recovery.

## Geometry and validation contract

The requested view was orthographic, camera pitch 35 degrees and yaw 0, with top surfaces visible. This is a generation target, not a verified camera solution. Props must retain their native aspect ratio as vertical sprites. The floor is an overhead material, not a preprojected surface; the renderer applies its 35-degree ground projection once.

Alpha bounds were measured using alpha > 8. All six cutouts have zero visible pixels on the source canvas border at that threshold. The recorded pivots are the bottom center of the visible alpha bounds, using the last visible pixel row. These are measured silhouette anchors; physical floor-contact placement requires scene review. The opaque floor has no prop pivot.

humanArtValidation is false for every asset. No canonical 1:1 fidelity, exact perspective match or human art approval is claimed. Browser integration, placement, anthropometric scale and occlusion checks belong to the parent scene QA.

| Asset | Runtime file | Canvas | Alpha bounds x,y,w,h | Pivot x,y |
|---|---|---|---|---|
| navigationConsole | /game/ship-interior/v23/navigation-console.webp | 1536 × 1024 | 40, 131, 1456, 801 | 768, 931 |
| medbayBed | /game/ship-interior/v23/medbay-bed.webp | 1774 × 887 | 111, 35, 1551, 828 | 886.5, 862 |
| armoryRack | /game/ship-interior/v23/armory-rack.webp | 1536 × 1024 | 35, 130, 1465, 776 | 767.5, 905 |
| forgeStation | /game/ship-interior/v23/forge-station.webp | 1024 × 1536 | 33, 66, 959, 1422 | 512.5, 1487 |
| trophyPlinth | /game/ship-interior/v23/trophy-plinth.webp | 1536 × 1024 | 305, 217, 925, 681 | 767.5, 897 |
| trainingEmitter | /game/ship-interior/v23/training-emitter.webp | 1024 × 1536 | 178, 267, 669, 1126 | 512.5, 1392 |
| floorPanel | /game/ship-interior/v23/floor-panel.png | 1254 × 1254 | 0, 0, 1254, 1254 | None (floor material) |

## Observed visual limits

The navigation console and armory rack remain largely frontal. The medical bed has a more legible oblique top. The forge has a tall ribbed spine, clamps and small cyan accents; its footprint and visual height need scene scaling. The trophy plinth and training emitter are inferred objects using the supplied material vocabulary, with no exact canonical blueprint claimed. The training emitter is tall and also requires scene scaling. The floor is an exact overhead material; seamless repetition was requested but edge matching has not been mathematically verified. Mask joins if a repeated floor exposes them.

Some generated props retain blue RGB values in nearly transparent pixels. The parent checked the console and rack and found no visible blue pixels at alpha > 8. No alpha or RGB normalization was applied.

## Individual generation records

### navigationConsole

- Tool: image_gen.imagegen
- Input reference: /workspace/scratch/30b4dd7183ed/yautja-ship-25d/public/game/ship-interior/v21/console-navigation.webp
- Transparent background requested: true
- Generated source path: /workspace/scratch/30b4dd7183ed/generated_images/exec-f10046b6-96b7-496f-b5cc-75619b6511be.png
- Preserved source: production/ship-interior-25d-20261105/art/source/navigation-console.png
- Runtime: /game/ship-interior/v23/navigation-console.webp
- Source bytes: 2537892; SHA-256: ac370fc6b86c6319f9fd9676ccd77f2cad6df12b7e3f7641ea7b1dc91235b916
- Runtime bytes: 1326022; SHA-256: 863ffedfa629e0e9e90538469a858d46fe20249a01a5bce51da7b6ea910ad1af
- Conversion: Lossless WebP via Sharp; no resize, crop, recolor or alpha normalization.

Exact prompt:

```text
Create a single production game prop as an individual transparent RGBA image: the exact personal Yautja navigation console in the supplied reference, re-rendered from a strict orthographic camera at 35 degrees elevation above its floor, yaw 0 degrees, looking straight at its FRONT. Preserve the reference object's proportions, silhouette, symmetrical broad beveled angular desktop, three inset switch strips per side, central engraved plaque, one central sculpted pedestal with two angled ribbed braces and polygonal base, fine etched dark steel and worn dark bronze trim. This is the small personal-ship console, not a large table, no hologram and no freestanding added screens. The top surfaces should now be visibly readable due only to the camera elevation; keep vertical edges vertical, left-right symmetry, parallel lines with no perspective convergence. Restrained amber illumination at its existing inset indicators, tiny subdued cyan accents already visible in reference. Isolated one complete object only; full base and all extremities inside frame with generous transparent margin. No environment, no floor plane, no cast shadow outside the object, no person, no weapons, no added machinery, no labels or readable text, no watermark, no collage. Preserve detailed original AVP-like Yautja metalwork, do not redesign. Front base contact at lower center. High quality sharp production game asset.
```

### medbayBed

- Tool: image_gen.imagegen
- Input reference: /workspace/scratch/30b4dd7183ed/yautja-ship-25d/public/game/ship-interior/v22/medbay-bed.webp
- Transparent background requested: true
- Generated source path: /workspace/scratch/30b4dd7183ed/generated_images/exec-e29c4672-b57b-4d98-93c3-27ca4cd9156e.png
- Preserved source: production/ship-interior-25d-20261105/art/source/medbay-bed.png
- Runtime: /game/ship-interior/v23/medbay-bed.webp
- Source bytes: 1481552; SHA-256: 9d12d2d6bd4857d9b74d9ca75972918bed752ae5e16ae6ab57e7dcfeb7308627
- Runtime bytes: 956502; SHA-256: 36d2acae1f8d0d4eefa91bf334430d6a84ef928a65b74f7e03b22b1cda42ad95
- Conversion: Lossless WebP via Sharp; no resize, crop, recolor or alpha normalization.

Exact prompt:

```text
Create one individual production game prop on fully transparent RGBA background: the SAME personal Yautja medical bed from the supplied reference, re-rendered with strict orthographic camera elevated 35 degrees above the floor, yaw 0, looking straight at its long FRONT side. Preserve exactly the reference construction and silhouette: long low segmented black padded mattress, tapered dark steel and bronze beveled metal perimeter, two squat flared pedestal legs, the single angular cantilever surgical gantry rising at the RIGHT end and leaning over the bed with one downward surgical implement. Keep the mattress empty. Preserve engraved weathered dark bronze and blackened steel, thin amber indicator lights, only tiny cyan inset accents where the reference already has them. Expose the mattress and horizontal ledges from the higher camera without inventing extra parts or redesigning the bed. Vertical lines straight, front and back edges parallel, no perspective convergence. Entire single complete bed and gantry inside frame with generous transparent margins and all feet visible; no room, no ground plane, no background, no cast shadow beyond prop, no patient, no gore, no labels/readable text, no watermark, no surrounding objects, no collage. Sharp, high quality realistic game prop matching the reference materials and form.
```

### armoryRack

- Tool: image_gen.imagegen
- Input reference: /workspace/scratch/30b4dd7183ed/yautja-ship-25d/public/game/ship-interior/v22/armory-rack.webp
- Transparent background requested: true
- Generated source path: /workspace/scratch/30b4dd7183ed/generated_images/exec-314a16a1-6414-47fc-a8c5-2649de1c93d7.png
- Preserved source: production/ship-interior-25d-20261105/art/source/armory-rack.png
- Runtime: /game/ship-interior/v23/armory-rack.webp
- Source bytes: 2416290; SHA-256: c85393b633c964303ac6daf49eb6177b48a21d13100c5342e593fd007f184050
- Runtime bytes: 1472372; SHA-256: 85f09935c6b1264dc3697029e50c7a05f35987aa5b37e54bb6ac0558d8971b1c
- Conversion: Lossless WebP via Sharp; no resize, crop, recolor or alpha normalization.

Exact prompt:

```text
Create a single individual game prop cutout on fully transparent RGBA background, matching the supplied Yautja armory rack reference. Re-render the SAME wide low-depth armored rack from a strict orthographic camera at 35 degrees elevation over its floor, yaw zero, looking directly at its FRONT with vertical lines vertical and left-right symmetry. Preserve the exact empty THREE vertical recessed bays, clipped top corners, broad dark-bronze beveled perimeter, two horizontal retaining bars, simple existing hooks/clamps, slim amber top insets and very restrained tiny cyan strips between bays. The rack must remain EMPTY, add no weapons or collectibles. Keep weathered blackened steel planes, warm dark bronze worn edges and delicate diagonal engraved panel motifs of the reference. Higher viewpoint should reveal its shallow top thickness and supporting base only, not create extra structures. No perspective convergence, not a diagonal isometric view. Entire complete single rack fits comfortably inside image with transparent margins, no cropped tips, base contact at lower center. No environment or floor plane, no cast shadow beyond prop, no people, no labels, readable text, watermark, surrounding props or collage. Detailed production game prop faithful to the reference silhouette and materials.
```

### forgeStation

- Tool: image_gen.imagegen
- Input reference: /workspace/scratch/30b4dd7183ed/yautja-ship-25d/public/game/ship-interior/v22/forge-station.webp
- Transparent background requested: true
- Generated source path: /workspace/scratch/30b4dd7183ed/generated_images/exec-471a78e0-fdba-486b-8c04-b75830e2ebe8.png
- Preserved source: production/ship-interior-25d-20261105/art/source/forge-station.png
- Runtime: /game/ship-interior/v23/forge-station.webp
- Source bytes: 2625880; SHA-256: e6ecb07947042dadf22410079b56c1787ac59eaf63cd6aeb22e27824ae9b5933
- Runtime bytes: 1445088; SHA-256: c8e7046b1203c2d971bf941560bb34f84e8a6b8c20a90c61d194a4411a9a2c48
- Conversion: Lossless WebP via Sharp; no resize, crop, recolor or alpha normalization.

Exact prompt:

```text
Create ONE individual production game prop cutout on fully transparent RGBA background: the SAME personal Yautja forge station shown in the supplied reference, re-rendered by a strict orthographic camera elevated 35 degrees above the floor, yaw ZERO, looking straight at its FRONT. Preserve the exact tall vertical ribbed central spine, three paired small clamp supports along that spine, angular polygon arch at the top, articulated side arms, waist-height polygon work shelf, two spread solid supporting feet, amber lower vents and subdued tiny cyan inset accents. Preserve its silhouette, scale proportions and detailed engraved weathered dark bronze and blackened steel construction. The changed viewpoint only reveals the horizontal top surfaces and shelf depth. Keep vertical edges vertical, left-right symmetry and parallel edges without perspective convergence. Entire single complete station including arch, arms and feet fits with generous clear transparent margins. No floor plane, no room, no external shadow, no person, no loose weapon, no extra machinery, no added props, no text/labels/watermark, no collage. Empty work surface. Detailed realistic game prop, no stylistic redesign. Front floor contact at lower center.
```

### trophyPlinth

- Tool: image_gen.imagegen
- Input reference: /workspace/scratch/30b4dd7183ed/yautja-ship-25d/public/game/ship-interior/v21/console-navigation.webp
- Transparent background requested: true
- Generated source path: /workspace/scratch/30b4dd7183ed/generated_images/exec-7bb8d378-9d42-4a2a-b25c-04c93a15e4ff.png
- Preserved source: production/ship-interior-25d-20261105/art/source/trophy-plinth.png
- Runtime: /game/ship-interior/v23/trophy-plinth.webp
- Source bytes: 1807508; SHA-256: eafae692f2c5c1bf34a53ff3306460069210f967b91ec2d1428dde5062dda542
- Runtime bytes: 766328; SHA-256: a92dc32d62fcea1c0494e3d870cceb35888d676d2966c3790f4790fc77f9f7f4
- Conversion: Lossless WebP via Sharp; no resize, crop, recolor or alpha normalization.

Exact prompt:

```text
Create ONE small individual EMPTY trophy display plinth for a personal Yautja spacecraft, isolated on fully transparent RGBA. Use only the supplied console reference's existing material vocabulary: weathered blackened steel plates, restrained dark bronze beveled trim, the same fine engraved geometric Yautja metalwork and small amber inset indicators. This is a conservative low simple pedestal: squat symmetric polygonal base, short tapering ribbed center support, flat shallow octagonal top plate; no trophy, skull, weapon or collectible on top, no additional technology. Strict ORTHOGRAPHIC camera elevated35 degrees above the floor, yawZERO, looking directly at its FRONT; top plate visibly readable, all verticals straight, equal left/right depth, parallel lines, no perspective convergence. Entire single small object centered with generous clear transparent margin, front base contact lower center. Realistic detailed production game sprite. No room, ground plane, external cast shadow, hologram, text, logo, watermark or collage. Match reference dark bronze/steel/amber colors, avoid redesigning into unrelated sleek or fantasy aesthetics.
```

### trainingEmitter

- Tool: image_gen.imagegen
- Input reference: /workspace/scratch/30b4dd7183ed/yautja-ship-25d/public/game/ship-interior/v22/forge-station.webp
- Transparent background requested: true
- Generated source path: /workspace/scratch/30b4dd7183ed/generated_images/exec-1006f47b-1376-4153-88ff-7a8d60bee2f5.png
- Preserved source: production/ship-interior-25d-20261105/art/source/training-emitter.png
- Runtime: /game/ship-interior/v23/training-emitter.webp
- Source bytes: 1675824; SHA-256: fe0277bb00d643fbe723ad9deb6b31bae4b815056dc07ad3c0b241992544eb6e
- Runtime bytes: 671344; SHA-256: 6fad177f693d9e38c1788b201610b2a0feca51f438a32fda4225febafbb80648
- Conversion: Lossless WebP via Sharp; no resize, crop, recolor or alpha normalization.

Exact prompt:

```text
Create ONE small inactive training emitter prop for a personal Yautja spacecraft on fully transparent RGBA. Take its materials and construction vocabulary strictly from the supplied forge reference: engraved weathered dark bronze edging, blackened steel segmented plates and ribs, tiny amber light insets, very subdued cyan accent only. A compact waist-high symmetric solid machine with a squat chamfered polygon floor base, one short reinforced ribbed column, and a small angular emitter head with one recessed dark amber lens. No floating or projected effect; no hologram, beam, target, person or weapon. Keep the geometry restrained and functional so it belongs beside this forge. Strict orthographic view elevated35 degrees over the floor, yawZERO, looking square at its FRONT. Show top surfaces naturally from this elevation, vertical edges vertical and parallel lines without perspective convergence. Entire single complete prop with base and all edges inside generous clear transparent margins, base contact lower center. Detailed realistic production game sprite, dark worn bronze/steel, no room, floor plane, external cast shadow, extra props, text, watermark or collage.
```

### floorPanel

- Tool: image_gen.imagegen
- Input reference: None; new floor material generation
- Transparent background requested: false
- Generated source path: /workspace/scratch/30b4dd7183ed/generated_images/exec-1f984a86-90c8-4006-a787-6974d5fba183.png
- Preserved source: production/ship-interior-25d-20261105/art/source/floor-panel.png
- Runtime: /game/ship-interior/v23/floor-panel.png
- Source bytes: 2849410; SHA-256: 414e75e8c33ffda7b31a382163bceeef1cf680324ef27d5a8d75f68ac9e088b4
- Runtime bytes: 2849410; SHA-256: 414e75e8c33ffda7b31a382163bceeef1cf680324ef27d5a8d75f68ac9e088b4
- Conversion: Original generated PNG reused byte-for-byte at runtime after local environment recovery; no resize, crop, recolor or alpha normalization.

Exact prompt:

```text
Create ONE individual opaque seamless square metallic floor-material texture for the interior of a personal Yautja spacecraft in the Alien vs Predator visual language. It will cover a separately projected 2.5D floor. EXACT orthographic TOP-DOWN view looking vertically down at the material: zero oblique angle, zero perspective convergence, zero camera tilt, no visible panel thickness or side faces. Fill the entire image edge to edge with the material. Dark blackened steel panel assemblies, warm worn bronze framing strips, restrained engraved alien geometric grooves, industrial brushed metal grain, small consistent rivets and minute recessed amber indicator points. Dense tactile worn metal detail, subtle edge wear, believable utilitarian spacecraft construction, low-contrast charcoal and deep bronze palette with only dim amber accents. Uniform soft neutral overhead illumination across the entire tile, no directional cast shadows, no central spotlight, no vignette. The panel rhythm must continue seamlessly across all four image borders; no distinct center, no outer frame, no margin. Flat physical surface suited to repeated floor tiling at gameplay scale. No props, no console, no furniture, no walls, no room scene, no figures, no floating graphics, no labels, no readable text, no logos. A single square repeatable material image, not a sheet of multiple views or samples.
```

