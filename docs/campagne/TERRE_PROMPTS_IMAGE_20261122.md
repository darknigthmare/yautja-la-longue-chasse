# Terre — Catalogue de prompts d'image

Nov 22, 2026 · @darknigthmare

Prompts de génération d'images pour tout ce qui est listé dans l'[inventaire Terre](TERRE_PRODUCTION_COMPLETE_20261121.md) : personnages nommés, humains génériques, faune, Xénomorphes et synthétiques, calques de décor des 20 sites, props, et images clés. Même méthode que le « Catalogue des variantes d'équipement » de la bible : un **gabarit commun** en anglais à coller avant chaque prompt, puis le prompt propre à l'élément.

**Règle de vérité.** Tous les éléments ci-dessous sont des **interprétations** *(proposées)* : aucun n'a de référence officielle. Aucun prompt ne cite de film, d'acteur ni de personne réelle. Les visages sont inventés.

**Règles de rendu (communes au dépôt).** Style painterly réaliste des planches V3, lumière clé en haut à gauche, contour sombre de 1 à 2 px, silhouette lisible à 25 %. Joindre les planches V3 de référence quand elles existent.

---

## Sommaire

1. Gabarits communs
2. Personnages nommés
3. Humains génériques
4. Faune
5. Xénomorphes, synthétiques, Yautja
6. Calques de décor des 20 sites
7. Props
8. Images clés et écrans

---

## 1. Gabarits communs

### G-PERS — Personnage ou animal (planche de sprite 2,5D)
```text
Produce ONE native RGBA PNG, 1024x1536 portrait, fully transparent background (alpha 0 outside the figure: no floor, no cast shadow, no glow, no text, no border). Full-body character plate for a 2.5D side-view stealth hunting game, standing in three-quarter view facing RIGHT, neutral idle pose, whole figure visible with a 6 % margin. Painterly realistic sprite art: key light from upper left, warm bounce light, crisp 1-2 px dark outline, readable silhouette at 25 % size. Grounded, believable clothing and gear, no logos of real brands, no text. Draw ONLY the character described below.
```

### G-DECOR — Calque de décor (parallaxe)
```text
Produce ONE PNG, 3840x1080 landscape, for a 2.5D side-scrolling stealth game background layer. Painterly realistic environment art, readable shapes, strong silhouettes, atmospheric depth, key light consistent with the time of day described. The layer must tile or end cleanly at the left and right edges. No characters, no text, no UI. For FOREGROUND layers, transparent background (alpha 0) above the drawn elements. Describe only the layer below.
```

### G-PROP — Prop isolé
```text
Produce ONE native RGBA PNG, 1024x1024, fully transparent background, no shadow, no text. A single game prop seen from a slight three-quarter side view facing RIGHT, painterly realistic, key light upper left, 1-2 px dark outline, readable at 25 % size. Draw ONLY the object described below.
```

### G-CLE — Image clé (concept, non utilisée en jeu)
```text
Produce ONE PNG, 1920x1080, cinematic concept art for a dark sci-fi hunting video game about an alien hunter on present-day and future Earth. Painterly, moody lighting, strong composition, no text, no logos, no real people, no characters from existing films.
```

---

## 2. Personnages nommés

Gabarit : **G-PERS**.

### 2.1 ARGOS
| ID | Personnage | Prompt |
| --- | --- | --- |
| T-PNJ-10 | Colonelle Ilse Varga | `A woman in her early fifties, special-forces colonel of a secret international agency, short grey hair, a thin scar on the side of her neck, calm piercing eyes, plain dark grey field uniform without insignia, tactical vest with few pouches, compact rifle slung, holding a rugged tablet. Patient, methodical, respected.` |
| T-PNJ-11 | Dr Tomás Echeverría | `A man in his forties, field biologist, round glasses, short beard, light grey lab jacket over outdoor clothes, sample case and notebook, never armed, gentle curious expression, a pen behind the ear.` |
| T-PNJ-12 | Sergent Kofi Mensah | `A tall calm man in his late thirties, expert tracker and team leader, face camouflage paint in grey and green, short cropped hair, grey tactical outfit with a pale armband, tracker's knife on the chest, rifle held low, crouched slightly as if reading the ground.` |
| T-PNJ-13 | « Aiguille » | `A lean sniper of unknown age, face hidden by a smooth sensor mask with three lenses, grey ghillie strips over a fitted suit, long multispectral sniper rifle with a bulky optical scope, very still posture.` |
| T-PNJ-14 | Mira Varga-Echeverría | `A woman in her thirties in the year 2080, director of a secret agency, dark hair tied back, sharp features, matte grey armoured jacket with subtle light panels, a sleek prosthetic left arm in dark metal, holding a compact energy rifle. Determined.` |
| T-PNJ-15 | Directeur Okonjo | `A man in his sixties in the year 2120, cold administrator of a powerful agency, shaved head, high-collared charcoal coat, minimal augmented-reality monocle, hands behind his back. Calm and bureaucratic.` |

### 2.2 Proies désignées (boss humains)
| ID | Personnage | Prompt |
| --- | --- | --- |
| T-PNJ-21 | Konrad Lisle | `A heavy-set man in his fifties, leader of an ivory poaching syndicate, sunburnt face, safari hat, khaki shirt with sleeves rolled, ammunition belt, heavy hunting rifle with a wooden stock, gold ring, arrogant stance.` |
| T-PNJ-22 | Viktor Sahl | `A thin man in his forties, animal-skin trafficker on river boats, slick dark hair, linen shirt stained with sweat, rubber boots, submachine gun on a strap, a tiger-claw pendant, sly smile.` |
| T-PNJ-23 | Dalton Rourke | `A broad man in his fifties, land grabber who burns grasslands, wide cowboy hat, soot on his face and jeans, red bandana, holding a pump shotgun and a road flare, pick-up keys on his belt.` |
| T-PNJ-24 | Mick Carver | `A wiry bush pilot in his forties, weapons smuggler, aviator sunglasses pushed up, worn leather flight jacket, cargo shorts, revolver on the hip, oil-stained hands.` |
| T-PNJ-25 | Wade Tolliver | `A tanned swamp smuggler in his forties, airboat captain, sleeveless shirt, ear protection around the neck, tattoos of alligators, lever-action rifle, large hunting knife.` |
| T-PNJ-26 | Anton Grell | `A massive man in his fifties, chief guard of illegal loggers, thick beard, wool cap, heavy flannel jacket, chainsaw on the back, double-barrelled shotgun.` |
| T-PNJ-27 | Commandant Ossian Dray | `A grizzled foreign mercenary in his fifties leading a militia, shaved head, scarred jaw, mixed military gear from several armies, unit patches, heavy machine gun belt over shoulder, combat knife, cold confident look.` |
| T-PNJ-28 | Harlan Vos | `A security chief for an illegal logging company, in his forties, climbing harness over a dark polo shirt, helmet with headlamp, pump shotgun, rope coils, tense alert face.` |
| T-PNJ-29 | Bram Kessler | `A mercenary leader in his forties guarding an illegal mine, rain poncho over tactical gear, mud-spattered boots, assault rifle, dynamite sticks on his vest, hard pale eyes.` |
| T-PNJ-30 | Yuri Stavin | `A rugged poacher in his fifties in volcanic wilderness, fur-trimmed parka open, waders, bear-hunting rifle with a large scope, salmon net over the shoulder, weathered face.` |
| T-PNJ-31 | Lucas Ferreira | `A diamond smuggler in his forties on a foggy desert coast, light desert scarf, sand goggles on the forehead, linen jacket, pistol and sieve tools, cunning expression.` |
| T-PNJ-32 | Simon Arkell | `A convoy boss in his fifties crossing the Sahara, long desert coat, head wrap around the neck, assault rifle, binoculars, standing proud as if on a truck, sun-creased face.` |
| T-PNJ-33 | Capitaine Teodor Ilić | `A border patrol captain in his forties on the steppe, faded military uniform, fur hat, thermal binoculars on the chest, rifle, riding gloves, stern disciplined face.` |
| T-PNJ-34 | Dmitri Volkan | `An arms trafficker in his fifties hiding in a ship-breaking yard, expensive but dirty white shirt, gold watch, hard hat, pistol, surrounded by an aura of control, cold smile.` |
| T-PNJ-35 | Jonas Weller | `A looter of ancient artefacts in his forties in high mountain caves, climbing gear, headlamp, rope, pickaxe, explosives pouch, carbine, dusty outdoor jacket.` |
| T-PNJ-36 | Inés Valcárcel | `A female mine security chief in her forties on a high salt plateau, mirrored sunglasses, wide-brim hat, padded jacket, electronic tracking tablet, rifle, calm commanding stance.` |
| T-PNJ-37 | Abel Strand | `A legendary hunting guide in his sixties in arctic mountains, long white beard, weathered face, waxed canvas jacket, big-game rifle with a polished wooden stock, a necklace of bear claws, wise and dangerous.` |
| T-PNJ-38 | Pavel Orlov | `A gold-prospector boss in his fifties in the taiga, heated orange coverall with fur collar, ice beard, flamethrower-like thawing tool on his back, rifle, heavy gloves.` |

### 2.3 Grands animaux nommés
Gabarit : **G-PERS**, avec la ligne « Wild animal, full body, three-quarter view facing RIGHT ».

| ID | Nom | Prompt |
| --- | --- | --- |
| T-PNJ-61 | Crinière-Noire | `An old male African lion with a huge black mane, scarred muzzle, one torn ear, powerful and heavy, standing in a slow stalk.` |
| T-PNJ-62 | Celle-des-Racines | `A large Bengal tigress, wet coat, mud on her legs, lean and muscular, standing in shallow water among mangrove roots.` |
| T-PNJ-63 | Nuit-Ronde | `A melanistic jaguar, glossy black coat with faint rosettes visible in the light, green eyes, crouched to pounce.` |
| T-PNJ-64 | le Vieux du Fitzroy | `A gigantic old saltwater crocodile, side view, scarred armoured back, missing teeth, half-emerged mouth slightly open.` |
| T-PNJ-65 | la Reine du Canal | `A huge Burmese python, thick coils partly raised, glossy patterned skin, head lifted toward the right.` |
| T-PNJ-66 | Brise-Hêtre | `A massive European brown bear standing on its hind legs, dark thick fur, old scars on the chest, roaring.` |
| T-PNJ-67 | Vieux-Cendre | `A huge Kamchatka brown bear with grey ash on its fur, wet from a river, salmon in its jaws.` |
| T-PNJ-68 | le Solitaire des Dunes | `A lean desert-adapted lion, pale coat, thin mane, scars, standing on sand in a proud alert pose.` |
| T-PNJ-69 | Ombre-du-Salar | `A large Andean puma, pale grey-tan coat, long tail, crouched low as if on a white salt flat.` |
| T-PNJ-70 | Grand-Dos | `A gigantic grizzly bear with a pronounced shoulder hump, silver-tipped fur, standing on all fours, menacing.` |
| T-PNJ-71 | Dent-de-Fer | `A fierce wolverine, dark brown with a pale band on its flanks, snarling, one broken tooth replaced by a rusted metal-looking stain.` |
| T-PNJ-72 | le Puma du Glacier | `A very large Patagonian puma, thick tawny coat, snow on its back, calm and majestic stance.` |

### 2.4 Non-combattants nommés
| ID | Personnage | Prompt |
| --- | --- | --- |
| T-PNJ-81 | Amara Diallo | `A determined investigative journalist in her thirties, practical outdoor clothes, camera with a long lens around the neck, press badge without readable text, backpack, notebook. No weapon.` |
| T-PNJ-82 | Le vieux pêcheur | `An elderly river fisherman with a thin white beard, simple shirt and sarong, carrying a small net and a woven basket, barefoot. No weapon. Kind wary eyes.` |
| T-PNJ-83 | Hanne Lund | `An archaeologist in her fifties in mountain caves, headlamp, sturdy jacket, brush and sketchbook, reading glasses on a cord. No weapon.` |
| T-PNJ-84 | Ilie Popa | `A forest ranger in his sixties, green uniform jacket, wool hat, old bolt-action rifle on the shoulder, honest weathered face.` |

---

## 3. Humains génériques

Gabarit : **G-PERS**. Chaque archétype se génère en **4 époques** : ajouter à la fin `Era: 1990-2025` / `2025-2050` / `2050-2100` / `2100-2150`, avec les mots-clés d'époque ci-dessous.

**Mots-clés d'époque**
- E1 1990–2025 : `90s-2020s gear, wooden stocks, analog radios, simple flashlights.`
- E2 2025–2050 : `modern gear, thermal optics, compact drones, smartphones.`
- E3 2050–2100 : `near-future gear, light exoskeleton braces, smart scopes, armed drones.`
- E4 2100–2150 : `future gear, sealed armour, energy weapons, augmented visors.`

| ID | Archétype | Prompt |
| --- | --- | --- |
| T-SPR-01 | Braconnier au fusil | `A poacher in worn khaki and a cap, hunting rifle, machete, cheap boots, nervous stance.` |
| T-SPR-02 | Pisteur et chien | `A poacher tracker with a flashlight and rifle, holding a tracking dog on a leash, crouched to read tracks.` |
| T-SPR-03 | Milicien | `A militia fighter in mismatched camouflage, assault rifle, red headband, sandals or boots, rocket launcher on the back for the heavy variant.` |
| T-SPR-04 | Garde privé | `A private security guard, dark polo with a generic shield patch, cap, rifle, radio on the shoulder, flashlight.` |
| T-SPR-05 | Contrebandier | `A smuggler in a light open shirt, sunglasses, submachine gun, cargo pants, gold chain.` |
| T-SPR-06 | Guide de chasse | `A professional hunting guide, khaki vest with cartridges, big-game rifle with scope, wide hat.` |
| T-SPR-07 | Soldat | `A regular army soldier in a helmet and plate carrier, assault rifle, era-appropriate uniform, generic flag patch without real nation.` |
| T-SPR-08 | Policier | `A police officer in a generic dark blue uniform, cap, pistol drawn, radio, no real department logo.` |
| T-SPR-09 | Opérateur ARGOS | `An agency operator in a grey tactical suit with white piping, sensor tripod on the back, net launcher, rifle, face visor.` |
| T-SPR-10 | Tireur ARGOS | `An agency sniper in grey camouflage with a multispectral scope rifle, lying-ready posture.` |
| T-SPR-11 | Lourd ARGOS | `A heavy agency trooper in grey armour, large riot shield with sensor array, net cannon.` |
| T-SPR-13 | Sécurité W-Y | `A corporate security trooper in clean white and dark grey armour, sleek helmet, energy rifle, no readable logo.` |
| T-SPR-14 | Civil | `An ordinary civilian, everyday clothes appropriate to the region, carrying a bag or tool, NO weapon, frightened expression.` |
| T-SPR-15 | Ouvrier | `A worker (miner, logger, dock worker or gold prospector), hard hat, work clothes, holding a tool (shovel, saw, wrench), NO firearm.` |
| T-SPR-16 | Scientifique | `A field scientist in a jacket with sample cases, tablet, NO weapon.` |
| T-SPR-17 | Journaliste | `A reporter with a camera and microphone, NO weapon.` |
| T-SPR-18 | Pêcheur | `A fisherman with a net and a basket, simple clothes, NO weapon.` |
| T-SPR-19 | Captif | `A captive in a plain grey jumpsuit, hands bound, NO weapon.` |

> Règle de lecture : pour tous les non-combattants (T-SPR-14 → 19), ajouter **« Clearly unarmed, empty hands or holding a tool, no tactical vest »**.

---

## 4. Faune

Gabarit : **G-PERS** + « Wild animal, full body, three-quarter view facing RIGHT, natural colours, anatomically accurate ».

| ID | Espèce | Prompt court |
| --- | --- | --- |
| T-SPR-30 | Lion, lionne | `African lion male and, as a separate plate, a lioness, alert stance.` |
| T-SPR-31 | Tigre | `Bengal tiger walking.` |
| T-SPR-32 | Jaguar | `Spotted jaguar crouching.` |
| T-SPR-33 | Crocodile du Nil | `Nile crocodile on a muddy bank.` |
| T-SPR-34 | Crocodile marin | `Saltwater crocodile, side view.` |
| T-SPR-35 | Alligator | `American alligator, mouth slightly open.` |
| T-SPR-36 | Caïman | `Yacare caiman half in water.` |
| T-SPR-37 | Python | `Burmese python coiled.` |
| T-SPR-38 | Anaconda | `Green anaconda, thick body, head raised.` |
| T-SPR-39 | Hippopotame | `Hippopotamus charging, mouth open.` |
| T-SPR-40 | Buffle | `Cape buffalo, head lowered.` |
| T-SPR-41 | Éléphant | `African savanna elephant, and a forest elephant variant.` |
| T-SPR-42 | Ours brun | `Brown bear in three sizes (young, adult, old male).` |
| T-SPR-43 | Grizzly | `Grizzly bear on all fours.` |
| T-SPR-44 | Loup | `Grey wolf, Himalayan wolf and arctic wolf variants.` |
| T-SPR-45 | Lynx | `Eurasian lynx stalking.` |
| T-SPR-46 | Léopard | `African leopard on a branch.` |
| T-SPR-47 | Panthère nébuleuse | `Clouded leopard on a tree trunk.` |
| T-SPR-48 | Casoar | `Southern cassowary, blue neck, casque.` |
| T-SPR-49 | Hyène brune | `Brown hyena on sand.` |
| T-SPR-50 | Puma | `Puma, Andean and Patagonian coat variants.` |
| T-SPR-51 | Léopard des neiges | `Snow leopard on rocks, long tail.` |
| T-SPR-52 | Ours du Gobi | `Small pale Gobi bear in desert scrub.` |
| T-SPR-53 | Panthère de Floride | `Florida panther, tawny, lean.` |
| T-SPR-54 | Glouton | `Wolverine snarling.` |
| T-SPR-55 | Bœuf musqué | `Muskox, shaggy coat, horns.` |
| T-SPR-56 | Sanglier barbu | `Bornean bearded pig.` |
| T-SPR-57 | Gorille | `Western lowland gorilla sitting calmly (never a target).` |
| T-SPR-58 | Oiseaux d'alerte | `A flock of birds taking off, four biome variants (egrets, parrots, crows, ptarmigans), as a sprite strip.` |

---

## 5. Xénomorphes, synthétiques, Yautja

| ID | Élément | Gabarit | Prompt |
| --- | --- | --- | --- |
| T-SPR-71 | Xénomorphe né d'un humain | G-PERS | `A biomechanical black alien drone born from a human host, elongated smooth head, exoskeleton, long segmented tail, crouched to leap, glistening, horror sci-fi.` |
| T-SPR-72a | Xénomorphe né d'un lion | G-PERS | `A biomechanical black alien creature born from a lion host, quadruped, powerful shoulders, faint mane-like ridges of exoskeleton, long tail.` |
| T-SPR-72b | Xénomorphe né d'un ours | G-PERS | `A massive biomechanical black alien creature born from a bear host, heavy armoured body, short thick limbs, long tail.` |
| T-SPR-72c | Xénomorphe né d'un crocodile | G-PERS | `A low biomechanical black alien creature born from a crocodile host, flat armoured body, long jaw-like head, swimmer's tail.` |
| T-SPR-73 | Jeune reine terrestre | G-PERS | `A young biomechanical alien queen, smaller than a full queen, crest still forming, inner jaws visible, standing among resin-covered human machinery.` |
| T-SPR-75 | Synthétique W-Y (E3, E4) | G-PERS | `A corporate synthetic human in a clean grey uniform, perfectly neutral face, slight milky-white fluid at a cut on the cheek, holding a tablet; a second plate shows a damaged version leaking white fluid.` |
| T-SPR-76 | Drone W-Y | G-PROP | `A sleek corporate surveillance drone with four rotors, white and dark grey, single camera eye, no readable logo.` |
| T-SPR-77 | Thar-Kesh | G-PERS | `A tall alien hunter outcast, scarred mottled skin, crude mismatched armour decorated with trophies of his own kind, cracked bio-mask, long dreadlocks, cruel stance.` (joindre les planches V3 du chasseur) |
| T-SPR-78 | Kerr-Vath | G-PERS | `An alien hunter from a different clan, sand-coloured armour with blue-green clan markings, net weapon, calm respectful stance.` (joindre les planches V3) |

---

## 6. Calques de décor des 20 sites

Gabarit : **G-DECOR**. Pour chaque site : un prompt de **fond** (lointain) et un de **premier plan** (transparent). Les variantes de nuit ajoutent « at night, moonlight, cold blue tones, artificial lights where humans are ». Les variantes d'époque ajoutent la ligne « Évolution » de l'avenant.

| Site | Fond | Premier plan |
| --- | --- | --- |
| 1 Okavango | `Inland delta at dusk, flat channels of water, papyrus islands, distant acacias, a dead baobab island on the horizon, golden haze.` | `Tall papyrus and reeds, half-submerged branches, silhouettes in foreground, transparent above.` |
| 2 Sundarbans | `Mangrove forest at low tide, muddy channels, stilt roots, a wooden watchtower far away, humid grey-green light.` | `Twisted mangrove roots and pneumatophores in mud, transparent above.` |
| 3 Pantanal | `Wet grassland with a gallery forest, a distant ranch, a wall of grass fire smoke on the horizon, orange sky.` | `Tall wet grass and palm fronds, embers floating, transparent above.` |
| 4 Kimberley | `Red sandstone gorge with layered cliffs, a river pool below, monsoon storm clouds building.` | `Spinifex grass, boab tree trunk, red rocks, transparent above.` |
| 5 Everglades | `Sawgrass marsh with cypress domes, an airboat channel, a ruined roadside motel on the edge, summer storm clouds.` | `Sawgrass blades, cypress knees, hanging moss, transparent above.` |
| 6 Carpates | `Old beech and fir forest in a misty gorge, a logging camp with smoke far away, mountains in fog.` | `Mossy beech trunks, ferns, fallen logs, fog wisps, transparent above.` |
| 7 Congo | `Dense rainforest along a wide brown river, huge trees, mist, a smoke column from a militia camp.` | `Giant buttress roots, lianas, broad leaves, transparent above.` |
| 8 Bornéo | `Very tall rainforest canopy seen from above the trees, a cleared logging area with bulldozers, smoke haze.` | `Canopy branches and epiphytes at height, transparent above and below.` |
| 9 Nouvelle-Guinée | `Cloud-covered mountain ridges, rainforest, a muddy mining village with tin roofs in a valley.` | `Wet ferns, moss, rain streaks, transparent above.` |
| 10 Kamtchatka | `Volcanic valley with a smoking cone, a salmon river, geysers steaming, green tundra.` | `Tall grass, river stones, steam vents, transparent above.` |
| 11 Namib | `Coastal desert at dawn, red dunes meeting a cold ocean, fog bank, a rusting shipwreck on the beach.` | `Sand ridges, whale bones, dry shrubs, transparent above.` |
| 12 Tibesti | `Volcanic mountains in the Sahara, dark rock and pale sand, a dusty track with a distant truck convoy.` | `Dark boulders, desert scrub, wind-blown sand, transparent above.` |
| 13 Gobi | `Endless steppe and stone desert, red flaming cliffs far away, a lonely border post, vast sky.` | `Short grass tufts, stones, transparent above.` |
| 14 Alang | `Ship-breaking beach with huge beached tankers cut open, cranes, smoke, hazy sun over the sea.` | `Rusted steel plates, cables, scrap piles, transparent above.` |
| 15 Mustang | `High-altitude ochre canyon with cliff faces full of carved caves, a fortified stone village, snowy peaks.` | `Eroded rock pillars, frayed climbing ropes, scree, transparent above.` |
| 16 Altiplano | `Vast white salt flat reflecting the sky, a volcano, a mining camp with conveyor belts on the edge.` | `Salt crust polygons, small rocks, transparent above.` |
| 17 Brooks Range | `Arctic mountains under a midnight sun, a braided river, a hunting lodge with a bush airstrip.` | `Willow shrubs, tundra moss, river gravel, transparent above.` |
| 18 Iakoutie | `Larch taiga, frozen river, a gold prospectors' camp with smoke, low pale sun, snow.` | `Snow-covered larch trunks, frozen grass, transparent above.` |
| 19 Norilsk (E4) | `Arctic industrial city in 2120 under transparent domes, chimneys, ventilation towers, aurora in a polluted sky.` | `Pipes, railings, ventilation grilles, snow, transparent above.` |
| 20 Patagonie | `Huge glacier front, ice fields, southern beech forest, fjord, jagged granite peaks, strong wind clouds.` | `Wind-bent beech trees, ice blocks, transparent above.` |
| Base ARGOS | `Underground secret laboratory corridors, white panels, containment cells, cold lights, alarm lights.` | `Lab equipment silhouettes, cables, glass, transparent above.` |

---

## 7. Props

Gabarit : **G-PROP**.

| ID | Prop | Prompt |
| --- | --- | --- |
| T-PRP-02 | Feu de camp | `A campfire with three states as separate plates: burning, smouldering embers, cold ashes with stones.` |
| T-PRP-04 | Radio de camp | `A rugged field radio with a long antenna on a crate.` |
| T-PRP-05 | Caméra de chasse | `A camouflaged trail camera strapped to a tree trunk segment, small red light.` |
| T-PRP-07 | Piège à mâchoires | `A heavy steel leg-hold trap, open, with chain.` |
| T-PRP-08 | Défenses saisies | `A pile of seized elephant tusks under a tarp (evidence, not glorified).` |
| T-PRP-15a | Hydroglisseur | `A swamp airboat with a large rear fan cage, flat hull.` |
| T-PRP-15b | Bateau rapide | `A river speedboat with outboard engine.` |
| T-PRP-15c | Pick-up | `A dusty pick-up truck, generic design, no brand.` |
| T-PRP-15d | Motoneige | `A snowmobile with cargo sled.` |
| T-PRP-16 | Drone d'époque | `A surveillance drone: 2030 quadcopter, 2080 armed drone, 2120 sleek corporate drone, three plates.` |
| T-PRP-17a | Brouilleur ARGOS | `A pulse jammer on a tripod, grey casing, glowing white ring.` |
| T-PRP-17b | Capteur multispectral | `A sensor mast with three lenses on a tripod, grey and white.` |
| T-PRP-17c | Lanceur de filets | `A shoulder net launcher with weighted net canisters.` |
| T-PRP-18 | Fiole de dissolvant | `A small alien vial of glowing blue liquid in a biomechanical metal holder.` (joindre les planches V3) |
| T-PRP-20 | Objets de don | `Five separate plates: an old flintlock pistol, an old curved sabre, a military dog tag from an old war, a pocket watch, a worn leather notebook.` |
| T-PRP-21 | Cocons et œufs | `Alien resin cocoons on a wall and leathery alien eggs, black and glossy.` |
| T-PRP-24 | Gravure yautja ancienne | `An ancient carved rock surface with alien hunter glyphs and hunting scenes, weathered.` |

---

## 8. Images clés et écrans

Gabarit : **G-CLE**.

| ID | Image | Prompt |
| --- | --- | --- |
| T-KEY-01 | Le Registre | `An alien archive hall with a floating holographic globe of Earth covered with glowing hunting marks, an old alien archivist in robes, a young hunter watching.` |
| T-KEY-02 | Premier pas | `A cloaked alien hunter, almost invisible as a heat-haze silhouette, standing on an island in an African delta at night, an airliner crossing the starry sky.` |
| T-KEY-03 | ARGOS | `A secret agency situation room, walls of blurry photos of a distortion in jungles and deserts, a grey-haired female colonel studying them.` |
| T-KEY-04 | La traque | `Through a multispectral sniper scope: the outline of a cloaked hunter in a forest, overlaid targeting data, tension.` |
| T-KEY-05 | Norilsk | `An arctic industrial city under glass domes in 2120 at night, aurora, an alien hunter silhouetted on a chimney.` |
| T-KEY-06 | La chasse ultime | `An old alien hunter facing a giant puma on a glacier ridge in Patagonia, wind, epic scale.` |
| T-KEY-07 | Écran de chargement (×20) | `Wide atmospheric view of [SITE], no characters, painterly, matching the site background prompt.` |
