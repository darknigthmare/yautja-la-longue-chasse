# The Isles — Catalogue de prompts d'image

Nov 22, 2026 · @darknigthmare

Prompts de génération d'images pour le mode [The Isles](MODE_THE_ISLES_20261121.md) en **3D isométrique**. Le jeu final utilise des modèles three.js ; ces images servent de **planches de référence** (concepts, feuilles de rotation, textures, tuiles) pour les modeleurs et pour les sprites isométriques à 8 directions.

**Règle de vérité.** Tout est **interprétation** *(proposée)*. Aucune personne réelle, aucun bâtiment réel copié, aucun logo réel. Les modèles (New York, banlieue américaine, fête foraine de bord de mer) n'inspirent que l'ambiance.

---

## Sommaire

1. Gabarits communs
2. Le Yautja en isométrique
3. Personnages nommés
4. Humains génériques
5. Faune
6. Îles : vues de référence
7. Quartiers et lieux
8. Bâtiments modulaires
9. Tuiles et textures
10. Véhicules
11. Grayhaven
12. Images clés

---

## 1. Gabarits communs

### GI-ROT — Feuille de rotation isométrique (personnage ou animal)
```text
Produce ONE PNG, 2048x1024, transparent background, no text. A turnaround sheet of the SAME character in 8 directions (N, NE, E, SE, S, SW, W, NW) seen from a fixed isometric game camera (about 35 degrees from above), evenly spaced in two rows of four, identical scale, neutral walking pose, stylised-realistic 3D look with clean readable shapes, soft key light from upper left, slight rim light, readable at 64 px tall. Describe only the character below.
```

### GI-VUE — Vue isométrique de lieu
```text
Produce ONE PNG, 1920x1080, isometric 3D game environment view, camera at about 35 degrees from above, orthographic, clean readable volumes built from a 2 m grid, stylised-realistic materials, soft daylight from upper left unless stated, no characters unless stated, no text, no real logos. Describe only the place below.
```

### GI-MOD — Planche de modules de bâtiment
```text
Produce ONE PNG, 2048x2048, transparent background, a modular building kit laid out on a grid for an isometric 3D game: separate modules (wall, wall with window, wall with door, corner, floor, roof pieces, details) at the same scale, isometric view, consistent materials and palette, no text, no logos. Describe the kit below.
```

### GI-TEX — Texture de tuile
```text
Produce ONE seamless square texture, 1024x1024, top-down, tileable on all edges, stylised-realistic, no text, no objects that break the tiling. Describe the ground below.
```

### GI-CLE — Image clé
```text
Produce ONE PNG, 1920x1080, cinematic concept art for an open-world isometric hunting game set on a fictional present-day archipelago, painterly, moody lighting, strong composition, no text, no real logos, no real people, no characters from existing films.
```

---

## 2. Le Yautja en isométrique

| ID | Planche | Gabarit | Prompt |
| --- | --- | --- | --- |
| I-ANI-REF-01 | Rotation du chasseur | GI-ROT | `A tall alien hunter (Yautja) in segmented armour, bio-mask, long dreadlocks, wrist gauntlet with blades, shoulder plasma caster folded, net at the belt.` (joindre les planches V3 du chasseur de la campagne) |
| I-ANI-REF-02 | Camouflé | GI-ROT | `The same hunter cloaked: a refractive heat-haze silhouette with a thin readable outline, faint electric flicker.` |
| I-ANI-REF-03 | Actions clés | GI-VUE (fond transparent) | `Eight key poses of the same hunter in isometric view: crouch, leap, climb, grapple shot, swim, trophy kneel, roar, holding a stolen weapon back to an altar.` |

---

## 3. Personnages nommés

Gabarit : **GI-ROT**.

| ID | Personnage | Prompt |
| --- | --- | --- |
| I-PNJ-01 | Augustin Hale (2026) | `A frail but upright billionaire in his seventies, pale linen suit, cane with a silver head, thin white hair combed back, sharp cold eyes.` |
| I-PNJ-01b | Hale en armure | `The same old man in a bulky powered armour suit, a stolen alien hunter mask on his face, an alien plasma weapon mounted on the shoulder.` |
| I-PNJ-02 | Hale jeune (1990, 1997) | `The same man at 39 and at 46 in safari clothes, rifle, confident smile (two variants).` |
| I-PNJ-03 | Capitaine Rhea Kost | `A female head of an elite private guard, forties, black tactical suit, thermal goggles on the forehead, knife and compact rifle.` |
| I-PNJ-04 | Garrett Vance | `A rugged mountain hunting guide, fifties, waxed jacket, wool hat, bolt-action rifle, rope and snare kit.` |
| I-PNJ-05 | Shérif Lena Ortiz | `A small-town desert sheriff, forties, brown uniform shirt, star badge, wide-brim hat, revolver and lever-action rifle.` |
| I-PNJ-06 | Silas Moreau, « le Comptable » | `A neat arms dealer in a dusty three-piece suit, round spectacles, ledger under the arm, pistol in a shoulder holster.` |
| I-PNJ-07 | Dre Naledi Mokoena | `An archaeologist, fifties, field hat, notebook and brush, khaki shirt, no weapon.` |
| I-PNJ-08 | Rook | `A dockside gang leader, thirties, orange work vest over a hoodie, beanie, scarred knuckles, pistol.` |
| I-PNJ-09 | Vale | `A gang leader from a working-class high-rise district, thirties, bottle-green tracksuit, braided hair, gold rings, submachine gun.` |
| I-PNJ-10 | Commissaire Barnes | `A city police commissioner, sixties, navy uniform with generic insignia, moustache, tired eyes.` |
| I-PNJ-11 | Major Iwan Petrov | `A military base commander, fifties, olive uniform, beret, sidearm, stern.` |
| I-PNJ-12 | Dr Yusuf Haddad | `A secret lab director, fifties, grey lab coat over a sweater, sensor badge, no weapon.` |
| I-PNJ-13 | Old Tom | `A lighthouse keeper, seventies, white beard, oilskin coat, camera with old film, no weapon.` |
| I-PNJ-14 | Directrice Amalia Reyes | `A prison director, fifties, dark suit, keycards, radio.` |
| I-PNJ-15 | Kaz Lenk | `A prison riot leader, forties, orange jumpsuit tied at the waist, tattoos, makeshift weapon then a guard's rifle.` |
| I-PNJ-16 | Sœur-de-Pierre | `A very old female alien hunter, grey mottled skin, long white dreadlocks with stone beads, ceremonial robes over ancient armour, carved staff, no mask.` (joindre les planches V3) |
| I-PNJ-17 | Vash'Tar (archives, 1997) | `An alien hunter with sand-coloured armour and red clan markings, filmed on grainy 1997 video in a savanna, seen from a distance.` |
| I-PNJ-18 | Mara la Grise | `A scavenger queen of a quarantined ruined city, early thirties, patched gas mask pushed up, grey ash on her clothes, armoured coat made of road signs, shotgun, a necklace of scavenged objects.` |

### Légendaires
| ID | Nom | Prompt (GI-ROT) |
| --- | --- | --- |
| I-PNJ-21 | Roi-de-Verdant | `A gigantic jaguar with very dark rosettes and a scarred face.` |
| I-PNJ-22 | La Faucheuse des Passes | `A huge saltwater crocodile with barnacles on its back.` |
| I-PNJ-23 | Hale's Pride | `A massive lion with a dark mane and an old faded ear tag from a private reserve.` |
| I-PNJ-24 | Mère-Bayou | `A huge female alligator with a pale scarred head.` |
| I-PNJ-25 | Le Fantôme rouge | `An albino puma with pink eyes, red desert dust on its coat.` |
| I-PNJ-26 | Le Gardien du barrage | `An enormous brown bear with a grey muzzle.` |
| I-PNJ-27 | Blanc-Silence | `A giant polar bear, yellowish fur, scars.` |
| I-PNJ-28 | Le Boucher de Calder | `A tall masked killer in a long coat, butcher's apron underneath, hatchet and pistol (no real-world reference).` |
| I-PNJ-29 | Le Caporal | `A decorated elite soldier, helmet with night vision, heavy rifle.` |
| I-PNJ-30 | Cendre | `A lion born in burnt ruins, grey ash-coloured mane, lean and scarred.` |

---

## 4. Humains génériques

Gabarit : **GI-ROT**. Une rotation par archétype ; 4 tenues par planche quand c'est indiqué.

| ID | Archétype | Prompt |
| --- | --- | --- |
| I-CHR-01 | Civils de la métropole | `Four city civilians: office worker with briefcase, street vendor, tourist with camera, student with backpack. No weapons.` |
| I-CHR-01b | Habitants de Maple Hollow | `Four suburban residents: parent with stroller, retiree watering lawn, teenager on bike, mail carrier. No weapons.` |
| I-CHR-03 | Ouvriers | `Four workers: dock worker, miner, logger, factory worker, each with a tool, no firearms.` |
| I-CHR-05 | Policier de Calder | `A city police officer, navy uniform, cap, pistol, radio, generic badge.` |
| I-CHR-06 | Unité tactique | `A tactical police officer, helmet, visor, shield, carbine.` |
| I-CHR-07 | Adjoint du shérif | `A desert deputy, brown shirt, hat, shotgun.` |
| I-CHR-08 | Gang des Docks | `Four dock gang members in orange work vests and beanies, pistols and bats.` |
| I-CHR-09 | Gang des Hauteurs | `Four high-rise gang members in bottle-green sportswear, scarves, submachine guns.` |
| I-CHR-10 | Braconniers | `Three poachers in khaki, rifles, machetes.` |
| I-CHR-11 | Chasseurs | `Three big-game hunters in hunting orange and brown, scoped rifles.` |
| I-CHR-12 | Trafiquants | `Four smugglers in light shirts and sunglasses, submachine guns.` |
| I-CHR-13 | Milice de la mine | `Three mine militia in yellow hard hats and grey body armour, rifles.` |
| I-CHR-15 | Garde de Hale | `Two elite guards in black suits, then in black tactical armour.` |
| I-CHR-16 | Soldat | `An island garrison soldier, olive uniform, helmet, rifle.` |
| I-CHR-17 | ARGOS | `Three agency members in grey and white: operator with sensor, sniper, heavy with net cannon.` |
| I-CHR-18 | Prison | `A prison guard in dark uniform and a prisoner in an orange jumpsuit.` |
| I-CHR-19 | Rôles de Chasse inversée | `Six survivors: Tracker (shotgun, tracking gear), Marksman (scoped rifle), Demolitionist (pump shotgun, mines), Medic (pistol, med bag, flares), Radio operator (assault rifle, large radio pack), Reserve ranger (carbine, binoculars, animal deterrent).` |
| I-CHR-20 | Forains et supporters | `Four people: carnival worker, cotton candy seller, baseball fan with cap and foam hand, football fan in team colours (fictional team).` |
| I-CHR-21 | Fermiers | `Three farmers: overalls and cap, rancher with hat, farm teenager; one holds an old shotgun for the predator hunt.` |
| I-CHR-22 | Charognards | `Four scavengers of a ruined quarantined city: patched gas masks, road-sign armour, improvised weapons and old rifles.` |
| I-CHR-23 | Les Restés | `Three elderly residents who never left a ruined city, worn clothes, no weapons, tired dignity.` |

---

## 5. Faune

Gabarit : **GI-ROT** (« wild animal, accurate anatomy »).

| ID | Animaux |
| --- | --- |
| I-CHR-30 | jaguar, tapir, singe hurleur, harpie |
| I-CHR-31 | crocodile, anaconda, sanglier, caïman |
| I-CHR-32 | crocodile marin, requin, raie, tortue marine, barracuda |
| I-CHR-33 | lion, lionne, buffle, hyène, guépard, éléphant, girafe, rhinocéros, zèbre, antilope, autruche |
| I-CHR-34 | alligator, python, panthère, héron, tortue alligator, lynx roux |
| I-CHR-35 | puma, coyote, crotale, vautour, cheval sauvage |
| I-CHR-36 | ours brun, ours noir, loup, élan, wapiti, castor, aigle |
| I-CHR-37 | ours polaire, loup arctique, morse, phoque, renard arctique, caribou |
| I-CHR-38 | pigeons, mouettes, rats, chiens, chats, ratons laveurs, faucon pèlerin |
| I-CHR-39 | vaches, chevaux, cochons, poulets, chiens de ferme |
| I-CHR-40 | chiens de police, chiens de garde, chiens errants de Grayhaven |

Prompt type : `A [animal], [pose], [coat detail].` Une planche par animal.

---

## 6. Îles : vues de référence

Gabarit : **GI-VUE**, vue large de l'île.

| Île | Prompt |
| --- | --- |
| Verdant | `A jungle island with a ruined stepped pyramid above the canopy, a river and waterfall, a fishing village on the coast, morning mist.` |
| The Shallows | `A chain of mangrove islets and coral reefs in turquoise water, a lighthouse, a rusting cargo ship stranded on the reef.` |
| Tallgrass | `Savanna with tall golden grass, acacias, an abandoned safari lodge on a hill, farmland with red barns and silos to the south.` |
| Saltmarsh | `Foggy bayous and a delta, a village on stilts, an abandoned refinery with a burning flare stack.` |
| Redmesa | `Red desert canyons and mesas, a western mining town with a railway station, an open-pit mine, a racing speedway.` |
| Calder | `A dense coastal metropolis on an island: skyscraper downtown at the southern tip, a grid of avenues, a large rectangular central park, brick high-rises in the north, an old harbour, a suspension bridge to the east.` |
| Eastbank | `A suburban and industrial borough across a bay: rows of family houses with lawns, a shopping mall with huge parking lots, a container port, stadiums, an airport, a long wooden pier with a Ferris wheel.` |
| Ember | `A volcanic island with a smoking cone, black lava flows, a geothermal power plant, a hot spring spa town, a radar on the flank.` |
| Hollowpine | `A forested mountain island with a lake and a concrete dam, a ski resort with lifts, a cable car, a sawmill, a small alpine village.` |
| Frost Isle | `A tundra island with a glacier front, a research station, a fishing harbour on stilts, a beached old whaling ship.` |
| Ironhook | `A fortified military island: a long causeway, radar domes, barracks, a submarine pen, an airstrip, a sealed laboratory entrance.` |
| Grayhaven | `A quarantined island behind a concrete wall with watchtowers: a ruined city around a glassy crater, a burnt forest, a frozen suburb overgrown with vegetation.` |

---

## 7. Quartiers et lieux

Gabarit : **GI-VUE**, vue rapprochée.

| ID | Lieu | Prompt |
| --- | --- | --- |
| I-VUE-01 | Downtown | `Narrow canyon-like streets between old and glass skyscrapers, financial district, yellow taxis of a fictional company, steam from street vents.` |
| I-VUE-02 | Lumen Square | `A crowded plaza at night surrounded by giant glowing advertising screens with abstract imagery (no readable text), crowds, police cars.` |
| I-VUE-03 | Commons Park | `A large rectangular city park with a lake, bridges, trees, a carousel, skyscrapers around the edges.` |
| I-VUE-04 | The Heights | `Brick tenement buildings with zig-zag fire escapes, a basketball court, an elevated subway line on steel pillars.` |
| I-VUE-05 | Old Harbor | `A cobbled old port with brick warehouses, a fish market, wooden piers, old ships.` |
| I-VUE-06 | Little Harbor | `A dense neighbourhood with night market stalls, lanterns, small restaurants and temples.` |
| I-VUE-07 | Maple Hollow | `An American suburb: curving streets and cul-de-sacs, two-storey wooden houses with porches, white picket fences, green lawns, a school bus, a main street with a diner and a gas station.` |
| I-VUE-08 | Bayview | `A large shopping mall with an enormous parking lot, big-box stores, fast food drive-throughs, an old drive-in cinema screen.` |
| I-VUE-09 | Zone industrielle | `Factories with chimneys, logistic warehouses, a power plant, a scrapyard, freight rail tracks.` |
| I-VUE-10 | Port de conteneurs | `Stacks of shipping containers, gantry cranes, a container ship, trucks.` |
| I-VUE-11 | Gull Pier (jour) | `A long wooden pier on pilings over the sea with a seaside amusement park: Ferris wheel, wooden roller coaster, carousel, game stalls, crowds, boardwalk beach.` |
| I-VUE-12 | Gull Pier (nuit) | `The same pier at night, closed, lights partly on, empty rides, fog from the sea, eerie.` |
| I-VUE-13 | Stade de baseball | `A waterfront baseball stadium with light towers, at night after a game.` |
| I-VUE-14 | Stade de football | `A large football stadium with an opening roof, parking around it.` |
| I-VUE-15 | Gare centrale | `A grand central railway station hall with a vaulted ceiling and subway entrances.` |
| I-VUE-16 | Station de métro | `An underground subway station with tiled walls, two platforms, a train arriving.` |
| I-VUE-17 | Autoroute | `An elevated highway with interchanges along a river, traffic at dusk.` |
| I-VUE-18 | Tunnel du Port | `The entrance of a road tunnel under a bay, ventilation building, toll booths.` |
| I-VUE-19 | Dustwater | `A western mining town main street: saloon, sheriff's office, bank, general store, wooden sidewalks, railway station.` |
| I-VUE-20 | Harvest Flats | `Farmland with red barns, silos, cornfields, a grain elevator, a rodeo arena, a county fair.` |
| I-VUE-21 | Pinecrest et la station de ski | `A small alpine village with chalets, a ski resort with chairlifts, a ski jump.` |
| I-VUE-22 | Bayou Cross | `A village on stilts over a bayou, a small church on stilts, a blues bar, shrimp boats.` |
| I-VUE-23 | Halcyon Cay | `A private island mansion of white stone with glass verandas, formal gardens, a private dock, a helipad.` |
| I-VUE-24 | Autel de Verdant | `An ancient stepped stone pyramid in the jungle covered in carved hunting scenes, an altar at the top with alien trophies.` |

---

## 8. Bâtiments modulaires

Gabarit : **GI-MOD**.

| ID | Kit | Prompt |
| --- | --- | --- |
| I-BLD-K01 | Gratte-ciel de verre | `Modern glass and steel skyscraper modules: curtain wall, corner, lobby base, mechanical floor, roof with antennas and helipad.` |
| I-BLD-K02 | Gratte-ciel ancien | `Early 20th-century stone skyscraper modules: ornate base, window bays, setback terraces, spire top.` |
| I-BLD-K03 | Brique new-yorkaise | `Brick tenement modules: wall with sash windows, fire escape segments, shop front, flat roof with water tower.` |
| I-BLD-K04 | Maison américaine | `Two-storey wooden suburban house modules: siding walls, porch, garage door, gabled roof, chimney, picket fence, mailbox.` |
| I-BLD-K05 | Western | `Western town modules: false-front facades, wooden sidewalks, saloon doors, balconies, painted signs without readable text.` |
| I-BLD-K06 | Industriel | `Industrial modules: corrugated metal walls, rolling doors, pipes, chimneys, catwalks, tanks.` |
| I-BLD-K07 | Pilotis | `Stilt house modules: pilings, plank floors, tin roofs, ladders, walkways.` |
| I-BLD-K08 | Ferme | `Farm modules: red barn walls, silo segments, hayloft doors, fences, windmill.` |
| I-BLD-K09 | Militaire | `Military modules: concrete bunker walls, blast doors, watchtowers, fences with barbed wire, radar dome.` |
| I-BLD-K10 | Fête foraine | `Amusement park modules: pier planks and pilings, roller coaster track segments, Ferris wheel parts, stalls, carousel.` |
| I-BLD-K11 | Stade | `Stadium modules: stands, light towers, concourse walls, scoreboard frame without text.` |
| I-BLD-K12 | Métro | `Subway modules: tunnel segments, platform edge, tiled wall, stairs, elevated steel track and pillars.` |
| I-BLD-K13 | Ruines | `Ruined versions of city modules: collapsed walls, broken floors, burnt facades, rebar, rubble piles, vegetation growing through.` |
| I-BLD-K14 | Ancien Tahren | `Ancient stone modules: carved blocks, stepped pyramid tiers, broken columns, vines.` |

---

## 9. Tuiles et textures

Gabarit : **GI-TEX**.

| ID | Texture |
| --- | --- |
| I-TIL-01 | sol de jungle, racines, boue |
| I-TIL-02 | vase de mangrove, sable de récif, eau peu profonde turquoise |
| I-TIL-03 | herbe haute dorée, terre rouge |
| I-TIL-04 | eau de bayou, carex |
| I-TIL-05 | sable rouge, roche du désert |
| I-TIL-06 | terre battue, planches western |
| I-TIL-07 | asphalte, trottoir, pavés, toit plat, pelouse, sable de plage |
| I-TIL-08 | basalte, lave (animée), cendres |
| I-TIL-09 | sol d'aiguilles de pin, neige légère |
| I-TIL-10 | neige, glace, crevasse |
| I-TIL-11 | béton militaire, piste |
| I-TIL-12 | eau profonde, écume |
| I-TIL-13 | **sol vitrifié** du point zéro (verre noir craquelé) |
| I-TIL-14 | **cendres et gravats** de Grayhaven, végétation qui reprend |

---

## 10. Véhicules

Gabarit : **GI-ROT** (8 directions).

| ID | Véhicule |
| --- | --- |
| I-VEH-01 | voitures civiles (berline, break, petite citadine, pick-up), taxi d'une compagnie fictive |
| I-VEH-02 | voiture de police, fourgon tactique, camion de pompiers, ambulance |
| I-VEH-03 | bus de ville, bus scolaire jaune, camion |
| I-VEH-05 | 4×4, quad |
| I-VEH-07 | locomotive et wagons de minerai, train régional, rame de métro (souterraine et aérienne) |
| I-VEH-08 | hydroglisseur, bateau rapide, ferry, bateau-taxi, crevettier |
| I-VEH-11 | hydravion, avion de brousse, hélicoptère (police, militaire, privé de Hale) |
| I-VEH-13 | blindé militaire, blindé bricolé des charognards |
| I-VEH-14 | motoneige, tracteur, moissonneuse |
| I-VEH-16 | voitures et bus brûlés (Grayhaven) |

---

## 11. Grayhaven

Gabarit : **GI-VUE**.

| ID | Lieu | Prompt |
| --- | --- | --- |
| I-GH-V01 | Le mur | `A tall concrete quarantine wall with watchtowers, searchlights, barbed wire, warning signs without readable text, military checkpoint.` |
| I-GH-V02 | Banlieue figée | `An abandoned suburb frozen in 2003: cars in driveways, faded toys on lawns, houses overgrown with vines, eerie quiet.` |
| I-GH-V03 | Forêt brûlée | `A burnt forest of black trunks on grey ash, green regrowth twenty years later, thin fog.` |
| I-GH-V04 | Ashgrove en ruine | `A ruined small city: gutted buildings, burnt cars and an overturned bus, collapsed bridge, shop signs fallen, weeds in the streets.` |
| I-GH-V05 | Métro noyé | `A flooded subway tunnel and station, dark water, floating debris, a flashlight beam.` |
| I-GH-V06 | Hôpital | `An abandoned hospital used as an evacuation centre in 2003, military tents in the parking lot, scavenger fortifications.` |
| I-GH-V07 | Point zéro | `A crater at the centre of a destroyed city, glassy black ground, shattered buildings bent outward around it, dead silence, a faint glint at the bottom.` |
| I-GH-V08 | Base de recherche | `A hidden research camp in an underground parking garage, sealed tents, sensors, hazmat suits.` |

---

## 12. Images clés

Gabarit : **GI-CLE**.

| ID | Image | Prompt |
| --- | --- | --- |
| I-KEY-01 | L'archipel | `Aerial dawn view of a fictional archipelago: a smoking volcano in the centre, a skyscraper metropolis, jungle islands to the south, snowy islands to the north.` |
| I-KEY-02 | Sur les toits | `A cloaked alien hunter crouched on a skyscraper ledge above a neon plaza at night, a distortion in the rain.` |
| I-KEY-03 | Gull Pier | `A closed seaside pier at night, the Ferris wheel half lit, a heat-haze silhouette at the top of the wheel.` |
| I-KEY-04 | Chasse inversée | `Five armed survivors with flashlights in a jungle at night, one of them looking up at a faint distortion in the trees.` |
| I-KEY-05 | Hale | `An old man in powered armour wearing a stolen alien mask on a glacier in a blizzard.` |
| I-KEY-06 | Le point zéro | `An alien hunter kneeling at the bottom of a glassy crater, holding an old broken mask, ruins all around.` |
| I-KEY-07 | Maple Hollow | `An American suburb at night, porch lights, a dog barking at an invisible shape crossing the lawn.` |
