# Fugitive spaceship — independent eight-view review

## Outcome

The two exact V14 reference masters and all eight original candidate PNGs were opened individually. Every staged candidate matches its generated source bytes and manifest SHA-256. The generation manifest and prior numeric review remain unchanged.

All eight views retain two spherical nacelles, curved supports, blue rear mouths and small blue jets already present in the references. The layered central hull, dark round dome, red inset lights and right-facing bow remain recognizable. No clipped hull or blocking identity break was observed.

The supplied shallow/deep ordering is retained for all four pairs. Dorsal deep clearly reveals more top deck; ventral deep reveals more of the lower bowl; front deep exposes the leading lip/bowl and narrows the aft mouth projection; rear deep broadens the aft faces and foreshortens the supports. No permutation is proposed. Prompt angles are not measured camera geometry.

## Visible limits

Independent projections reinterpret seams, scratches, lower-bowl panels and small light placements. Metal highlights are sharper/brighter than the profile. Deep dorsal is strongly top-facing, while front deep also changes elevation. Embedded jet outlines and nacelle spacing vary. These points need native cross-fade review; the source pair does not prove a canonical 1:1 model.

The existing blue jets remain part of the sprite raster. No separate VFX socket or engine emission has been activated; all exhaustVisibility values are 0 and exhaustReview remains unreviewed.

## Alpha and unchanged pixels

All eight candidates are 1536×1024 RGBA with alpha 0..254. Every alpha>16 bounding rectangle is inside the canvas, including the inherited jets. Border alpha is at most 1. All 48 declared off-hull samples have alpha 0. Hidden grey/cyan RGB does not establish an opaque halo; very low alpha residues are preserved. No resizing, padding, crop, recoloring or alpha cleanup was performed.

## Registration proposal

The historical profile remains 1693×929 with nose (1540,405), tail (250,465), release (1080,668), and pivot (846.5,464.5). A visual axis is measured from the leading metal lip to the mean center of the two rear blue apertures. The jets and upper nacelle windows are excluded from the tail landmark. The unchanged four profile coordinates are transported together by this axis similarity, preserving their historical offsets.

Aperture bounds are visual measurements (about ±8 px, up to ±12 px for the narrow front-deep mouths). Decimal values make calculations reproducible, not artistically subpixel-exact. The pivot is not a mass center and release is not a newly discovered bay. Coordinates remain native pixels; the runtime matrix must account for the different profile canvas aspect without stretching the source image.

| View | Nose | Tail | Pivot | Release |
|---|---|---|---|---|
| forward-quarter-shallow | (1468.685, 504.355) | (151.595, 513.858) | (759.531, 537.229) | (989.352, 753.972) |
| forward-quarter | (1399.077, 562.186) | (250.465, 456.679) | (778.237, 529.568) | (959.793, 738.306) |
| bank-dorsal-shallow | (1466.921, 514.811) | (185.331, 542.059) | (777.260, 556.495) | (1003.872, 764.276) |
| bank-dorsal | (1447.883, 518.117) | (180.744, 515.906) | (765.384, 543.630) | (984.607, 754.120) |
| bank-ventral-shallow | (1441.030, 491.624) | (192.505, 505.096) | (768.887, 525.191) | (987.485, 729.877) |
| bank-ventral | (1456.990, 468.887) | (176.866, 513.031) | (768.475, 519.639) | (997.634, 724.250) |
| rear-quarter-shallow | (1467.096, 466.991) | (190.688, 535.348) | (781.092, 530.705) | (1013.623, 730.503) |
| rear-quarter | (1437.975, 398.642) | (262.371, 574.677) | (808.532, 518.225) | (1041.447, 682.648) |

## Candidate fingerprints

| View | SHA-256 |
|---|---|
| forward-quarter-shallow | d345e5f4e77d13b50607d35b682dca3bdee4dc3e4ca182276c4f81c637130f82 |
| forward-quarter | 61a2a3a3ef8ced542c90ed6c8f298158cbf5db6b65745a62f62115ae24740369 |
| bank-dorsal-shallow | 023e9acfd955db295aaf83c8d754f82ce34be22be531ddf7ce38ab4b1fedf48a |
| bank-dorsal | 57ff81e56c7c3e92f3e5e0f6a1aef534d2b4fe6c201be2cb99d056e949b61579 |
| bank-ventral-shallow | e72c4504cd699e069df26ec28a364578b0ce3932d5ca156f59f72838096ffab5 |
| bank-ventral | bb9cd29e41c94e971587116d7378e5f4e39accd513445e8ecf270ebf018f9818 |
| rear-quarter-shallow | 271f70e31718a209a193ef05f79cc4be7d77ecfb6868f2ab4ac30c8458ff9fc6 |
| rear-quarter | 0351029a77616d14c0ada9b5c70e4058d470a4307a4f6ab91974c91eefe15cdd |

## Evidence

- `generation-manifest.json`: exact prompts, continuity references, sources and copies; SHA-256 `6e318dd5ed7802d6fb235866d394220c92ed556b2bd65ede379228deecc1fbc0`, unchanged.
- `candidate-numeric-review.json`: earlier alpha/integrity report; SHA-256 `a8f99c5bb7ab30bc9792030aa466380ccc1016b3ebed95fb3154da927b6e64c5`, unchanged.
- `independent-eight-view-calibration.json`: image observations, reference hashes, manual mouth bounds, alpha samples, equations and proposed points.
- Integration and native transition qualification remain pending parent approval.
