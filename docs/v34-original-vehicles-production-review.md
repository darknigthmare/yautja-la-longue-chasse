# Revue de production V34 — véhicules originaux et reprises anatomiques

## Périmètre et vérité de production

- Source privée du lot : `work/v34/original-vehicle-generation-queue.json`, indices 3 à 17 inclus.
- Reçus privés : `work/v34/*-job.json`, fichiers `agent-output-batch-*.json` et scripts de consignation sous `work/v34/`.
- Sources maîtres : `art-source/v34/vehicles/<vehicleId>/<assetId>.png`.
- Copies de revue : `public/game/vehicles/v34/<vehicleId>/<assetId>.png`.
- Chaque PNG source et public a été écrit par `scripts/record-vehicle-art-v34.mjs` sans réencodage. Le script refuse un remplacement si les octets diffèrent.
- `authored-review` signifie seulement que la plaque OpenAI est inspectable et que son alpha réel ou son fond magenta est accepté par `processHunterSpriteTransparency`. Cela ne valide ni pivot, ni cadence, ni animation, ni intégration gameplay.
- Tous les assets de ce rapport conservent `runtimeFrameAccepted: false`, `runtimeClips: []` et `gameplayImplemented: false`.
- Les propositions issues d’un nom ou d’un brief partiel restent des créations originales non canoniques ; aucune statistique de jeu n’est déduite de l’image.

## Lot principal — quinze identités

| Véhicule | Asset et origine privée | Statut exact | Verdict visuel | Limite avant animation/runtime |
|---|---|---|---|---|
| Crawler de siège | `identity-r1` · `exec-4f8d289b-6715-4d32-a9bc-7bc5bfdf193f.png` | `authored-review` | Deux profils latéraux complets ; chenilles, rampe fermée et anneau de tourelle vide lisibles ; aucun canon. | Séparer chenilles, rampe, suspension et tourelle ; aucun mouvement ni pivot validé. |
| Forge mobile de clan | `identity-r1` · `exec-f85f40ad-4c03-488e-93bc-d468fb455b4e.png` | `authored-review` | Deux profils cohérents ; four fermé, établi et grue repliés ; pas de feu, outil ou fumée. | Les panneaux décoratifs proches de glyphes restent à approuver ; four, grue, volets et établi doivent devenir des modules animés. |
| Medivac Scarab | `identity-r1` · `exec-bb36993c-3380-4d6c-b97d-a61dc3f02ba1.png` | `authored-review` | Pod médical scellé ivoire/bronze, baie vide, aucun patient ni symbole terrestre. | Portes pétales, rampe, pod détachable et éclairage médical n’existent pas encore en couches séparées. |
| Capsule Drop Spear | `identity-r1` · `exec-89be687e-a61e-4fa8-940b-5302db0f1690.png` | `authored-review` | Deux côtés verticaux, nez vers le bas, capsule opaque complète. | Marge haute/basse d’environ 16 px seulement ; pivot vertical, vanes, freinage, impact et descente doivent être testés sur une feuille dédiée. |
| Bone Grinder | `identity-r1` · `exec-1788e9ad-b2e3-4a3e-9379-88360066026b.png` | `authored-review` | Base chenillée et joug frontal vide ; aucun broyeur, os, chair ou sang intégré. | Broyeur, chaînes et trophées doivent rester des modules ; chenilles et suspension ne sont pas animées. |
| Scavenger Raider | `identity-r1` · `exec-8e825ba5-30f2-441c-9003-acda7b12d5a1.png` | `authored-review` | Flatbed vide, grue repliée, pods réparés et panneaux asymétriques lisibles. | La silhouette reste proche d’un hover-truck terrestre et demande une validation de direction artistique ; grue, chargement et propulsion sont absents. |
| Sled du voleur de trophées | `identity-r1` · `exec-9fed45f4-b1cd-4118-9a5a-560fbe7d2bc7.png` | `authored-review` | Profils opposés propres, selle et plateau vides, antenne et propulseurs anciens lisibles. | Trois supports en U sont clairement visibles par côté au lieu des quatre demandés ; nombre de hardpoints à corriger ou approuver avant modularisation. |
| Chariot de l’Arbitre | `identity-r1` · `exec-729b3a3b-a145-4272-9796-cde8eb5dddfb.png` | `authored-review` | Vrai canal alpha ; siège protégé et hardpoints vides ; aucun opérateur, arme, bannière, crâne ou couronne. | Le canopy, le siège, la crête, les émetteurs et les hardpoints doivent être découpés ; aucun roulis ou mouvement de commandement validé. |
| Sled-drone pisteur | `identity-r1` · `exec-1adc1296-1372-44b3-8c7e-ac6174004aaa.png` | `authored-review` | Drone réellement non piloté : capteurs, antenne, deux pods et batterie lisibles ; aucun cockpit ou selle. | Balayage des capteurs, statut lumineux, inclinaison et propulsion restent à produire séparément. |
| Blood Beast | `identity-r1` · `exec-aec9d540-c5c3-4d94-82dc-d1c39672609f.png` | `authored-review` | Quatre jambes anatomiquement raccordées et quatre pieds complets dans les deux sens ; cicatrices anciennes seulement. | Rig quadrupède, démarche et charge absents ; implants, chaînes, plaques et harnais doivent rester des couches optionnelles. |
| Razorwing | `identity-r1` · `exec-9508386d-d7d2-4afe-b6ee-6daaed886983.png` | `authored-review` | Deux pattes arrière et deux membres-ailes repliés, sans paire de pattes avant supplémentaire, perchoir ou selle. | Les deux ailes se chevauchent densément en pose fermée ; leurs racines, membranes et pivots doivent être redessinés en modules avant vol ou battement. |
| Cliff Leaper | `identity-r1` · `exec-ee63904b-a204-439b-ad86-48d69a74ab70.png` | `authored-review` | Quatre membres et quatre pieds complets séparément lisibles dans les deux orientations. | Aucun cycle marche/course, compression, saut, réception ou retournement n’est fourni. |
| Burrow Wyrm | `identity-r1` · `exec-5246aaba-4088-44b1-b705-2422d3ddfde5.png` | `authored-review` | Corps continu tête-queue, sans patte, pied, bras ou aile ; mâchoire circulaire fermée. | Ondulation segmentée, fouissage, sortie et poussière doivent être des animations/effets indépendants. |
| Ash Horn | `identity-r1` · `exec-15d9b1f5-eeee-480d-9b50-8e36a1a720e2.png` | `authored-review` | Quatre jambes, quatre pieds et un seul grand corne frontale dans chaque sens. | Deux défenses mandibulaires non demandées ont été ajoutées ; validation de silhouette nécessaire avant rig, marche et charge. |
| Storm Runner | `identity-r1` · `exec-b839c5b8-b5d9-4c03-b8b2-57c529b62eb1.png` | `authored-review` | Quatre longues jambes digitigrades, quatre pieds complets, queue et crête en cadre ; aucun effet électrique. | Aucun cycle d’accélération, course, freinage ou retournement ; les membres opposés restent à isoler pour le rig. |

## Reprises — anatomie et angle

| Véhicule | Asset et origine privée | Statut exact | Motif ou validation |
|---|---|---|---|
| Sand Mauler | `identity-r1` · `exec-ef8cdf7e-c543-4106-ba8e-b22cf3bdce6c.png` | `rejected` | Cinq pieds seulement par vue ; patte médiane opposée absente. |
| Sand Mauler | `identity-right-r2` · `exec-b3b483c9-c5cf-47e9-9581-453bf7d806e3.png` | `rejected` | La reprise mono-orientation conserve seulement cinq pieds. |
| Sand Mauler | `identity-right-r3` · `exec-1d8c0621-691a-4149-b663-63744b9cd04b.png` | `authored-review` | Six racines, six membres et six pieds séparément lisibles, orientation droite. |
| Sand Mauler | `identity-left-r3` · `exec-74b639d8-db40-4502-b4c7-6f966b5dbbc0.png` | `authored-review` | Même construction avec six membres complets, orientation gauche indépendamment dessinée. |
| Ice Fang | `identity-r1` · `exec-92daff38-a142-4533-a9c1-fee9fda3612f.png` | `rejected` | Trois appuis porteurs et un stabilisateur lisibles par vue, au lieu de quatre plus deux. |
| Ice Fang | `identity-right-r2` · `exec-348f8aec-a1be-49a1-87b0-0ce093ef1de2.png` | `authored-review` | Quatre pattes porteuses, quatre pieds et deux petits stabilisateurs complets, orientation droite. |
| Ice Fang | `identity-left-r2` · `exec-cfff9243-935e-40c2-8f94-67a120529852.png` | `authored-review` | Même compte de six membres et extrémités, orientation gauche indépendamment dessinée. |
| Jungle Strider | `identity-r1` · `exec-bbd80604-1dc9-4648-bcfa-59a27cad50a1.png` | `rejected` | Trois pieds mécaniques détachés seulement ; quatrième chaîne insuffisamment exposée. |
| Jungle Strider | `identity-right-r2` · `exec-7b11c845-17c7-4078-935b-85ccd83a78b9.png` | `authored-review` | Quatre racines, quatre chaînes articulées et quatre pieds, orientation droite. |
| Jungle Strider | `identity-left-r2` · `exec-5480b82a-0ff0-40b4-b126-59a7023be811.png` | `authored-review` | Quatre chaînes et quatre pieds complets, orientation gauche indépendamment dessinée. |
| Cliff Crawler | `identity-r1` · `exec-f0b82969-9244-4c33-a16c-5c604e00aef6.png` | `rejected` | Cinq pieds par vue au lieu de six. |
| Cliff Crawler | `identity-r2` · `exec-1b69cc78-f184-494c-b45a-31d8443c2ee0.png` | `rejected` | La première correction à deux vues conserve cinq pieds. |
| Cliff Crawler | `identity-right-r3` · `exec-e817e5ce-1b8e-49ad-a3e5-cdbf04aca958.png` | `rejected` | La première correction mono-orientation conserve cinq chaînes et cinq pieds. |
| Cliff Crawler | `identity-right-r4` · `exec-6c6687a8-27f7-40b6-b22b-9d118e26a09d.png` | `authored-review` | Trois jambes proches, trois opposées et six pieds d’adhérence complets, orientation droite. |
| Cliff Crawler | `identity-left-r4` · `exec-30623bab-1f8c-491a-a187-7f18c34bb19e.png` | `authored-review` | Six chaînes et six pieds, orientation gauche indépendamment dessinée. |
| Thunder Fang | `identity-r1` · `exec-4194cfcd-e446-4879-b80a-b59f7d50c5eb.png` | `rejected` | Deux vues trois-quarts dominées par la proue et le plan supérieur ; lecture latérale 2D insuffisante. |
| Thunder Fang | `identity-r2` · `exec-e86d4b6f-5c06-40da-8ffc-b37ba81c061a.png` | `authored-review` | Deux élévations opposées nettement plus latérales, silhouettes et hardpoints complets ; une légère lecture du plan supérieur subsiste et interdit encore l’acceptation runtime. |

## Planches de mouvement — Grav-Sled et Hunter Speeder

Chaque planche est une source 4 × 2 : quatre phases orientées à droite sur la rangée haute et quatre phases orientées à gauche sur la rangée basse. Les côtés opposés ont été demandés comme dessins indépendants et non comme copies miroir. Les quatre assets restent `authored-review`, avec huit cellules `runtimeFrameAccepted: false` chacun.

| Véhicule | Asset et origine privée | Statut exact | Contrôle rendu et limite |
|---|---|---|---|
| Grav-Sled éclaireur | `antigrav-activation-r1` · `exec-7798b598-bed8-45ab-be6a-2751b0647508.png` | `authored-review` | Huit silhouettes, deux rangées opposées, quatre états `power-off → ignition → stable-hover → shutdown`. Les huit cellules ont `gridBorderPixels: 0`. Hauteur au sol, pivot et cadence restent à mesurer. |
| Grav-Sled éclaireur | `drive-tilt-r1` · `exec-d7160d7e-970a-43e2-8273-aff6f1bf97dc.png` | `authored-review` | Huit poses `brake-nose-down → level → acceleration-nose-up → rebound`. La cellule 0 conserve 5 pixels visibles sur sa frontière ; les sept autres sont à 0. Recadrage et pivot obligatoires avant découpe runtime. |
| Hunter Speeder | `antigrav-activation-r1` · `exec-c9464dd2-1ebf-4225-94ff-b0d277194993.png` | `authored-review` | Huit silhouettes complètes, selle/grips/fin/nœuds cohérents, quatre états lumineux par côté. Toutes les cellules ont `gridBorderPixels: 0`; cadence et déplacement vertical non validés. |
| Hunter Speeder | `drive-tilt-r1` · `exec-0ee90d4c-38df-4f37-957d-9a2ae7ac5e0d.png` | `authored-review` | Huit inclinaisons complètes sans pilote ni effet de vitesse. Toutes les cellules ont `gridBorderPixels: 0`; axe de masse, raccord exact des panneaux et cadence restent à normaliser. |

Le reçu machine `work/v34/agent-vehicle-verification.json` confirme 36 assets ciblés, l’égalité octet pour octet des copies source/public et la reproduction des mesures de cellules après passage réel dans `processHunterSpriteTransparency`.

## Décision de production

Les identités `authored-review` peuvent servir de références pour les feuilles modulaires suivantes, jamais comme sprites finaux prêts à jouer. Les pivots, hauteurs au sol, volumes de collision, continuité entre orientations et correspondance exacte des pièces doivent être vérifiés après découpe. Pour les créatures et walkers, les plaques mono-orientation corrigées sont la source anatomique prioritaire ; les anciennes feuilles rejetées restent archivées pour tracer le défaut et ne doivent pas être choisies par le runtime.
