# Upgrade spaceship — independent final eight-view review

## Outcome

Both exact V14 masters and all eight frozen selections were opened individually. The selected files are 1536×1024 RGBA, byte-exact copies of their recorded imagegen outputs. The original 16-attempt manifest and 8 rejected outputs remain unchanged; no transitory or rejected image was calibrated.

No final pose was clearly inverted and no duplicated principal blue engine was observed. The two corrected front views are low, with far-nacelle and axial-engine occlusion. Dorsal deep shows more upper deck; ventral deep shows a genuine broader underside and one large axial blue engine; rear deep emphasizes the main rear face and shortens the forward body in projection. No new rejection or permutation is proposed.

## Principal engines and source limits

The principal construction remains two outer orange nacelle assemblies and one axial blue engine. Several lit orange surfaces may belong to one housing. Small blue-lit maneuvering units, tiny blue insets and vents must remain distinct from that principal engine count. The main blue assembly is partly hidden in front-shallow and hidden in front-deep; it is not assigned an invented visible socket. All separate exhaustVisibility values remain 0 and exhaustReview remains unreviewed.

The V14 profile is explicitly tagged authored-view-with-perspective. Its large blue focus is projected toward center-right; the top and many variants place the axial unit at aft-left. The images do not prove a single calibrated rigid 3D model. The final front views also have a much thinner silhouette than that profile. These material differences are retained, not hidden by a false calibration or anisotropic scaling. Native cross-fade inspection is required before claiming a satisfactory runtime raccord.

Panels, red lines, highlight levels and exact secondary-unit placement vary. Requested 12/25-degree values remain intent, not measured camera poses.

## Alpha and integrity

Alpha is 0..254; every alpha>16 bounding rectangle is inside the 1536×1024 canvas. Minimum visible margin is 7px, on the ventral-shallow candidate. Border alpha reaches 3/255 on eleven left-edge pixels at x=0, y=343..353 in ventral-shallow; other views remain at most 1. The brighter alpha>16 hull starts at x=7 and is not cropped. This residue is retained for native edge inspection. All 48 declared off-hull samples have alpha 0; no global zero-exterior-alpha claim is made. An initial probe at (768,250) in rear-deep falls on the actual upper maneuvering unit, so it is recorded separately as on-hull and excluded from background sampling. No crop, resize, padding, recoloring or alpha cleanup was performed.

## Registration proposal

The existing profile stays 1672×941, nose(1590,540), tail(220,470), release(1000,580), pivot(836,470.5). A repeatable visual axis uses the needle tip and the equal mean of the visible orange regions of the two main nacelle housings. The unrelated red deck strip in the front-shallow image is explicitly excluded from that rear landmark. All four old points are transported together by the axis similarity, preserving their offsets.

These are projected group anchors, not exact physical nozzle centers. Estimated semantic uncertainty is about 16px, up to 20px for the occluded front groups; numeric fractions only make the chosen transform deterministic. Pivot is not a mass center and release is not a newly observed bay. Native pixels are retained; the runtime matrix must account for the different canvas aspect before uniform scale and rotation.

| View | Nose | Tail | Pivot | Release |
|---|---|---|---|---|
| forward-quarter-shallow | (1478.786, 503.684) | (123.844, 532.707) | (730.858, 489.136) | (900.288, 585.301) |
| forward-quarter | (1442.961, 531.524) | (152.176, 532.508) | (731.049, 502.959) | (890.494, 597.864) |
| bank-dorsal-shallow | (1475.871, 493.559) | (123.781, 514.132) | (729.707, 474.415) | (898.163, 571.414) |
| bank-dorsal | (1466.141, 516.490) | (128.238, 528.812) | (727.986, 493.116) | (894.084, 590.089) |
| bank-ventral-shallow | (1499.957, 488.813) | (91.991, 510.230) | (722.957, 468.875) | (898.374, 569.883) |
| bank-ventral | (1487.686, 540.279) | (104.361, 491.178) | (725.866, 482.004) | (893.050, 589.905) |
| rear-quarter-shallow | (1495.407, 516.397) | (114.312, 535.289) | (733.283, 495.672) | (905.197, 595.014) |
| rear-quarter | (1475.823, 498.103) | (186.555, 534.135) | (763.957, 488.902) | (925.795, 579.367) |

## Selected fingerprints

| View | Attempt | SHA-256 |
|---|---|---|
| forward-quarter-shallow | 4 | d264943c2b0274281b38ee0056896a0f4eb7cfa9ef685054c0fa96d8f9f1dec0 |
| forward-quarter | 4 | 898f77fad5f3d6525d12ef17cd7b2b9e76749a1b46d190fd1e3b233c266fcc4e |
| bank-dorsal-shallow | 2 | 2911059c83742beffe77e02e02c1e4401fd01cf54190669bdd747e2cd15ba379 |
| bank-dorsal | 1 | eed63039ee54b202534b34809b47d7f1aa961f5d386543c5cbb565731c172e29 |
| bank-ventral-shallow | 1 | ed3aabc50f7c1dcef957f9ab6068bdd6edd98497001bf743ac0550f47a424a7b |
| bank-ventral | 2 | 2b091b0ac3a20ba90b27f17a10d1824477f4680d103dac9ae2595215a0b3f264 |
| rear-quarter-shallow | 1 | e5ed40258ed728c63270dc078a06d493e707218be66807b2d352320a852e0ebb |
| rear-quarter | 1 | 3b24f1ba6cd51aa755c56f7145900458a46153643be848622323c65a8abd2d17 |

## Evidence

- `generation-manifest.json`: SHA-256 `d6ee4845b2a97b8bc4ae3faab91b055b41e04d3bcd0495648bae69602efd6109`,177074bytes, unchanged.
- `candidate-review.json`: SHA-256 `0e07c310f988b3b1922ea24b402d4ac733774b9655aadc0c4f05c903e54f17b3`,24155bytes, unchanged.
- `independent-eight-view-calibration.json`: opened-image findings, source paths/hashes, orange component bounds, exclusions, alpha samples and derived points.
- Parent approval and native scene validation remain pending.
