# AVP Predator mothership — six source-art candidates

## Outcome

Six 1536×1024 RGBA candidates were generated individually with the built-in image generator, using the exact V14 profile and top references. The deeper views also used their corresponding shallow candidate as a continuity reference. Every generated PNG was opened individually. All candidate copies are byte-exact; no pixel edit, resize, crop, padding, alpha normalization or repository change was made.

The original shallow/deep assignment is visually coherent for forward, dorsal and rear pairs. No dorsal permutation is needed. This is a proposal for pod-only integration and native transition qualification, not canonical 1:1 or human art approval.

## Source identity and visible limits

The six views retain the right-hand rounded crescent forebody, inset arches, long narrower neck at left, underslung structures, dark engraved metal and pale seam lights. The top reference establishes two large rear terminal nozzles and a smaller axial nozzle between them; that arrangement remains visible or perspective-occluded in these candidates. No luminous core, flame or new exhaust effect was added.

The forward-deep view shows more frontal lip, the rear-deep view broadens the nozzle faces and shortens the projected neck, and the dorsal-deep view reveals more upper dome and the annular recess. These are relative visual observations, not measurements of the prompt angles. Generated seams, underside detail and window spacing vary. The upper shell is sharper and somewhat brighter than the profile master; this must be assessed during native cross-fades.

## Transparency

All images have alpha from 0 to 254. Every alpha>16 silhouette is fully inside the canvas; the maximum border alpha is 1. All 36 declared off-hull sample points have alpha 0, including points where the raw preview displays grey RGB. This does not establish an opaque halo. Very low alpha residue remains in some originals and has not been modified.

## Registration proposal

The existing V14 profile remains 1774×887 with nose (1645,455), tail (91,546), release (860,721), and full-canvas pivot (887,443.5). Its historical nose is inset from the outermost front lip. To preserve that convention, a visual axis was measured on the original and each candidate: the forward lip extreme at alpha≥128, and the mean center of the two large rear aperture ellipses. The unchanged historical four points were then transported by that axis similarity.

Rear aperture centers are visually measured and approximate (about ±8 px, up to ±12 px for the partly occluded profile lower aperture). The numeric decimals make the transform reproducible; they do not assert subpixel art accuracy. Release coordinates remain derived registration data, not newly discovered bays. All candidate points remain native pixels; runtime aspect compensation is required before rotation/scaling, and no source raster is stretched.

| View | Nose | Tail | Pivot | Release |
|---|---|---|---|---|
| forward-quarter-shallow | (1396.899, 499.129) | (107.977, 562.092) | (768.645, 483.513) | (744.036, 713.331) |
| forward-quarter | (1386.190, 465.790) | (108.996, 521.331) | (763.898, 446.989) | (738.301, 674.526) |
| bank-dorsal-shallow | (1417.597, 500.564) | (81.531, 579.403) | (765.878, 490.969) | (742.771, 729.569) |
| bank-dorsal | (1417.846, 551.665) | (76.808, 567.293) | (765.978, 511.191) | (731.548, 748.917) |
| rear-quarter-shallow | (1419.576, 464.877) | (143.925, 556.197) | (796.752, 463.509) | (777.529, 691.765) |
| rear-quarter | (1346.509, 466.057) | (258.943, 572.267) | (814.499, 478.661) | (803.128, 674.049) |

Every `exhaustVisibility` is 0 and `exhaustReview` is `unreviewed`. The tail placeholder does not approve any of the three nozzle emissions.

## Candidate fingerprints

| View | Original generation | SHA-256 |
|---|---|---|
| forward-quarter-shallow | exec-2ed1286f-8991-4988-85bc-8f1d7f4b264a.png | 717efa8e0f0cf06b3582964ec6609ac6f11198f08957fe7c0eac9c787d7a182d |
| forward-quarter | exec-697c7f9b-d30d-45c8-a4dc-c27def89c57b.png | 9faf74beeb7f2422b12e98050b69f526558dda0cbbe5c4669292384b78ec0481 |
| bank-dorsal-shallow | exec-6f2cd077-998e-4b09-8eab-d2e42bf21193.png | 45b739d7d2ff6810a2953130679e1097eb706807b32f0d1b4b19288be44bedba |
| bank-dorsal | exec-4905a349-263e-4ce1-9683-898d77a3317f.png | 65cb3266b3ee05750885ee427e49e2bdf8f0f2bb7abc5b8febddf6991860c6b0 |
| rear-quarter-shallow | exec-77e63587-1e41-4159-8980-5f83a492d239.png | 1006279a873e93fb3b2c0b02c7aa005554496f5c8c87ab3c83313cf0ed9beff3 |
| rear-quarter | exec-400e0027-2d5a-4192-97bf-0a4a8bf9872c.png | afb80f5b2624bbebd06133e07e74cc6953c8da109bbc3169f21ceeec2d8917da |

## Evidence and remaining qualification

- Exact prompts, reference paths/hashes, original paths, copies and assignments: `avp-mothership-generation-jobs-final-candidates.json`.
- Full landmarks, alpha counts/bounds/samples, equations, original profile offsets and candidate data: `avp-mothership-six-view-calibration.json`.
- Native integration must check profile→shallow→deep cross-fades, double contours, scale and pivot registration, especially the enlarged rear engine assembly.
- No ventral sprites or ship-landing scope were added; this family is for pod insertion.
- No canonical approval follows from generated angles or source-art measurements.
