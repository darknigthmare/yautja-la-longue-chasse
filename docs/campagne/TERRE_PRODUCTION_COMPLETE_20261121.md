# Terre — Inventaire complet de production

Nov 21, 2026 · @darknigthmare

Liste de **tout ce qu'il faut créer** pour les chasses sur Terre : musique, sons, sprites, textures, props, bâtiments, zones, PNJ, faune, IA, actions, histoires, missions principales et annexes, dialogues, interface.

Documents de référence : [Terre — Le Terrain de Chasse](TERRE_TERRAIN_DE_CHASSE_20261121.md) (avenant, décisions, fiches des sites) et [Terre — Gameplay des missions](TERRE_GAMEPLAY_MISSIONS_20261121.md) (boucle jouable, systèmes).

**Règle de lecture.** Tout ce qui suit est *(proposé)*, sauf ce qui découle des décisions déjà prises. « Réutiliser » signale un élément déjà présent dans le dépôt. Les identifiants suivent les conventions de la bible (MUS-) et ajoutent des préfixes propres à la Terre :

| Préfixe | Contenu |
| --- | --- |
| `MUS-` | musique (suite du catalogue, à partir de MUS-74) |
| `T-AMB-` | ambiances sonores |
| `T-SFX-` | effets sonores |
| `T-VO-` | voix, radios, dialogues |
| `T-SPR-` | sprites de personnages et d'animaux |
| `T-ANI-` | animations du joueur |
| `T-TEX-` | calques de décor et textures |
| `T-PRP-` | props |
| `T-BLD-` | bâtiments et structures |
| `T-VFX-` | effets visuels |
| `T-PNJ-` | personnages nommés |
| `T-IA-` | comportements d'IA |
| `T-SC-` | scènes et histoires |
| `T-CT-` | contrats (missions principales) |
| `T-AN-` | missions annexes |
| `T-UI-` | écrans et éléments d'interface |

---

## Sommaire

1. Ce qui existe déjà et se réutilise
2. Musique
3. Ambiances sonores
4. Effets sonores
5. Voix, radios et dialogues
6. Personnages nommés (PNJ)
7. Humains génériques
8. Faune
9. Xénomorphes, synthétiques et Yautja ennemis
10. Actions et animations du joueur
11. IA
12. Zones : les 20 sites secteur par secteur
13. Bâtiments et structures
14. Props
15. Textures et calques de décor
16. Effets visuels
17. Histoires et scènes
18. Missions principales : contrats
19. Missions annexes
20. Interface
21. Récapitulatif chiffré

---

## 1. Ce qui existe déjà et se réutilise

| Élément du dépôt | Usage sur Terre |
| --- | --- |
| `earthGeoReferenceV147.ts`, `EarthPlanetMapV126.tsx`, `PlanetEarthReferenceV147.tsx` (contours Natural Earth) | globe et planisphère du **Registre terrestre** |
| `worldScreens.ts` (6 secteurs, calques, connexions) | structure des 20 sites |
| `huntInsertion`, `InsertionPlanPanel.tsx` | insertion et écran d'orbite |
| `honorRules.ts`, `HonorTribunalPanelV147.tsx`, `JusticePanel.tsx` | code, infractions, tribunal |
| `enemyRosterV7.ts` : `owlf-commando`, `weyland-synth`, `corporate-heavy`, `xeno-drone`, `xeno-praetorian`, `bad-blood-*` | OWLF, W-Y, ruches terrestres, Bad Blood |
| `TrophyWorkshop.tsx`, `trophyVisualRegistry.ts`, `enemyTrophyGameplayV18.ts` | trophées, provenance, trophées secondaires |
| `HuntingHoundsPanelV147.tsx`, `HoundKennelPanelV147.tsx` | chiens de chasse |
| `GalaxyMapPanel.tsx`, `galaxyRegistry.ts`, `SpaceRoutesPanelV159.tsx` | système Sol, route humaine |
| `WarpEpochsPanelV165.tsx` (échos de la discrétion temporelle) | modèle pour l'Indice de Discrétion |
| `audioFiles.ts` | déclaration des nouveaux fichiers audio |

**Tout le reste est à créer.** Les dossiers `public/audio/music/` sont vides (bible) : toute la musique ci-dessous est neuve.

---

## 2. Musique

Format du catalogue de la bible : identifiant, usage, durée, tempo, tonalité, prompt Flow Music en anglais, sans artiste ni musique de film. Chaque piste reprend un fragment de la **signature commune** (motif du clan de quatre notes descendantes en mineur).

### 2.1 Thèmes de la Terre

**MUS-74 — Registre terrestre** · écran du Registre, ouverture de la Terre (T-SC-01) · 3:00 · 66 BPM · Do mineur · boucle.

```text
Instrumental, no vocals. Contemplative world-map theme for an alien hunter studying Earth, 66 BPM, C minor. Warm analog pad, slow plucked hammered dulcimer and kalimba suggesting many human cultures, soft frame drum heartbeat. The four-note descending clan motif on a low bowed cello at 0:40, answered by distant wordless choir. Feels ancient, curious and respectful, like reading a ledger of past hunts. Seamless loop.
```

**MUS-75 — Orbite et descente** · écran d'orbite, insertion · 1:30 · 80 BPM · Mi mineur.

```text
Instrumental cue for a cloaked ship hovering above Earth before a drop. 80 BPM, E minor. Low sub drone, radio static textures, slow pulsing synth, a rising string swell. At 1:00 the clan motif on muted horn, then a hard cut to silence with a single deep hit. Tense, cold, precise.
```

### 2.2 Traque, par grande famille de biomes

**MUS-76 — Traque, forêts humides** · sites 3, 7, 8, 9 · 3:00 · 92 BPM · Ré mineur · boucle.

```text
Instrumental stealth hunting loop in a dense tropical rainforest. 92 BPM, D minor. Wooden log drums, shakers, slow tribal pulse, low cello ostinato, insect-like synth textures, distant animal calls blended as percussion. The four-note clan motif hidden in a muted marimba. Humid, claustrophobic, patient. Seamless loop.
```

**MUS-77 — Traque, eaux et marais** · sites 1, 2, 5 · 3:00 · 84 BPM · Sol mineur · boucle.

```text
Instrumental stealth loop for hunting in mangroves, deltas and swamps. 84 BPM, G minor. Water drum, slide guitar drones, low clarinet, slow swampy groove, reversed water drips, frogs and birds as rhythmic textures. Clan motif on a bowed bass. Murky, slow, predatory. Seamless loop.
```

**MUS-78 — Traque, déserts et hauts plateaux** · sites 11, 12, 13, 16 · 3:00 · 88 BPM · La phrygien · boucle.

```text
Instrumental stealth loop for hunting in deserts, salt flats and high plateaus. 88 BPM, A Phrygian. Hand drums, low reed flute, dry plucked lute, wind noise, sparse metallic hits, wide open reverb. Clan motif on a distant horn. Heat, emptiness, exposure. Seamless loop.
```

**MUS-79 — Traque, montagnes et froid** · sites 6, 10, 15, 17, 18 · 3:00 · 76 BPM · Fa mineur · boucle.

```text
Instrumental stealth loop for hunting in cold mountains, taiga and volcanic valleys. 76 BPM, F minor. Deep low strings, throat-like drone pad, slow heavy frame drum, icy glass textures, breath sounds. Clan motif on solo low brass. Cold, vast, heavy footsteps in snow. Seamless loop.
```

**MUS-80 — Traque, côtes et gorges** · site 4 · 3:00 · 86 BPM · Mi mineur · boucle.

```text
Instrumental stealth loop for hunting in red sandstone gorges by a tropical coast before a monsoon storm. 86 BPM, E minor. Didgeridoo-like low drone made with synths, clapsticks, humid pads, distant thunder, low strings. Clan motif on muted horn. Oppressive heat building to a storm. Seamless loop.
```

**MUS-81 — Traque, zones industrielles et villes** · sites 14, 19 · 3:00 · 100 BPM · Si mineur · boucle.

```text
Instrumental stealth loop for hunting inside an industrial city and a ship-breaking yard. 100 BPM, B minor. Metallic percussion from scrap metal, grinding machinery textures, pulsing analog bass, sirens far away, tense string staccato. Clan motif on distorted low brass. Urban, dangerous, crowded. Seamless loop.
```

### 2.3 Combats

**MUS-82 — Proie désignée (boss humain)** · phase 8, boss humains · 3:00 · 132 BPM · Ré mineur · boucle avec fin.

```text
Instrumental boss fight against an armed human leader, for an alien hunter game. 132 BPM, D minor. Aggressive taiko and snare, gunfire-like percussion hits, driving low strings, brass stabs. Three sections that grow: entrenched, counter-hunt, last stand. Clan motif on full brass in the last section. Ends on a held chord for the finishing move.
```

**MUS-83 — Grand prédateur (boss animal)** · phase 8, boss animaux · 2:30 · 118 BPM · Do mineur.

```text
Instrumental fight against a legendary wild beast. 118 BPM, C minor. Huge tribal drums, roaring low brass, rhythmic breathing textures, frantic string tremolo during charges, sudden silences. Clan motif in the final charge. Primal and respectful.
```

**MUS-84 — Fenêtre d'extraction** · phase 11 · 1:30 · 120 BPM · La mineur.

```text
Instrumental countdown cue for reaching an extraction point before time runs out. 120 BPM, A minor. Ticking metallic percussion, rising synth arpeggio, pulsing bass, strings climbing in pitch. Ends with a ship engine swell and the clan motif. Urgent.
```

**MUS-85 — Alerte (5 niveaux en pistes séparées)** · Indice de Discrétion pendant la mission · 2:00 · 100 BPM · Mi mineur · boucle par niveau.

```text
Instrumental adaptive tension music in five stackable layers for a stealth game alert system. 100 BPM, E minor. Layer 1 distant police radio and soft pulse. Layer 2 helicopter-like low rotor rhythm. Layer 3 tactical snare and tense strings. Layer 4 military brass and heavy drums. Layer 5 cold electronic pulses and alarm synths for a secret agency. Each layer loops and fits on top of the previous.
```

### 2.4 Antagonistes et personnages

**MUS-86 — ARGOS** · thème de l'agence · 2:00 · 96 BPM · Fa dièse mineur.

```text
Instrumental theme for a secret international agency hunting an alien. 96 BPM, F sharp minor. Cold precise electronic pulses, ticking clocks, piano ostinato, low strings, sonar pings. Methodical and intelligent, not evil. Ends unresolved.
```

**MUS-87 — Ilse Varga** · leitmotif · 1:30 · 72 BPM · Si bémol mineur.

```text
Instrumental 90-second leitmotif for a patient, methodical female special-forces colonel who studies an alien hunter. 72 BPM, B flat minor. Solo cello melody, sparse piano, soft snare brushes, a hint of military trumpet far away. Respectful rival, determined, lonely.
```

**MUS-88 — Norilsk, le piège** · mission finale ARGOS (3 actes) · 4:00 · 108 BPM · Ré mineur · trois sections.

```text
Instrumental final mission against a secret agency in an arctic industrial city under domes. 108 BPM, D minor. Section 1 infiltration: low synth pulse and distant machinery. Section 2 trap: alarm synths, heavy drums, the agency's cold electronic motif clashing with the alien clan motif. Section 3 duel in tunnels: solo cello versus low brass, slow and intense. Ends on a held chord.
```

**MUS-89 — Chasse ultime** · site 20, Patagonie · 4:00 · 70 BPM · Do mineur.

```text
Instrumental grand finale for an ancient alien hunter's ultimate hunt among glaciers and southern beech forests. 70 BPM, C minor. Wind, vast choir pads without words, slow timpani, the full clan motif on horns, then a quiet section with only strings and wind, then a final orchestral swell. Epic, elegiac, a lifetime of hunting.
```

**MUS-90 — Débrief terrestre** · phase 12 · 1:30 · 70 BPM · La mineur.

```text
Instrumental post-hunt reflection music on a spaceship, reviewing an Earth hunt. 70 BPM, A minor. Soft pad, slow kalimba, distant human radio murmur, low cello with the clan motif. Calm, satisfied, thoughtful.
```

**MUS-91 — Don au guerrier** · scène T-SC-14 · 1:00 · 60 BPM · Ré majeur vers Ré mineur.

```text
Instrumental short cue for an alien hunter leaving an ancient gift to a worthy human warrior. 60 BPM, D major turning to D minor. Solo horn with the clan motif played softly, warm strings, a single frame drum hit at the end. Respect, honour, silence.
```

**MUS-92 — Ruche terrestre** · purge de Xénomorphes sur Terre · 3:00 · 110 BPM · atonal · boucle.

```text
Instrumental horror loop for purging an alien hive spreading in a human place on Earth. 110 BPM, atonal. Wet organic textures, hissing, irregular metallic percussion, low brass clusters, frantic strings. The clan motif struggles to emerge. Dread and urgency. Seamless loop.
```

**MUS-93 — Weyland-Yutani** · thème de la compagnie sur Terre (paliers 3 et 4) · 2:00 · 90 BPM · Sol mineur.

```text
Instrumental theme for a cold mega-corporation using synthetic soldiers in the future. 90 BPM, G minor. Clean corporate synths, sterile piano, precise electronic drums, a distorted choir pad. Polished, inhuman, profitable.
```

**MUS-94 — Capture et évasion** · base ARGOS · 3:00 · 104 BPM · Mi mineur · boucle.

```text
Instrumental escape loop for a captured alien hunter breaking out of an underground lab. 104 BPM, E minor. Industrial pulse, alarms, scraping metal, tense strings, heavy breaths, low brass with the clan motif returning stronger each minute. Seamless loop.
```

**Total : 21 pistes (MUS-74 → MUS-94).** Dossier proposé : `public/audio/music/earth/`.

---

## 3. Ambiances sonores

Une ambiance par site, de jour et de nuit, plus les variantes météo du site. Fichiers en boucle de 2 min, stéréo.

| ID | Site | Jour | Nuit | Météo |
| --- | --- | --- | --- | --- |
| T-AMB-01 | Okavango | oiseaux, hippopotames, roseaux | lions au loin, grenouilles | crue |
| T-AMB-02 | Sundarbans | marée, oiseaux, moteurs au loin | insectes, eau qui monte | marée haute / basse |
| T-AMB-03 | Pantanal | perroquets, bétail | caïmans, insectes | incendie (crépitement, vent) |
| T-AMB-04 | Kimberley | cigales, vent dans les gorges | dingos | orage, crue |
| T-AMB-05 | Everglades | hérons, moteur d'hydroglisseur | alligators, grenouilles | orage d'été |
| T-AMB-06 | Carpates | pics, ruisseau, tronçonneuses au loin | chouettes, loups | brouillard (son étouffé) |
| T-AMB-07 | Congo | singes, grands arbres | insectes, tirs lointains | pluie tropicale |
| T-AMB-08 | Bornéo | calaos, gibbons, engins | insectes | fumée des brûlis |
| T-AMB-09 | Nouvelle-Guinée | oiseaux de paradis, pluie | ruissellement | glissement de terrain |
| T-AMB-10 | Kamtchatka | rivière, ours, geysers | vent, volcan | éruption de geyser |
| T-AMB-11 | Namib | vent, ressac | silence, hyènes | brouillard côtier |
| T-AMB-12 | Tibesti | vent, camions lointains | silence | tempête de sable |
| T-AMB-13 | Gobi | vent, chevaux | loups | tempête de sable |
| T-AMB-14 | Alang | découpe de métal, ouvriers, mer | grues, mer | marée |
| T-AMB-15 | Mustang | vent, cloches, chevaux | vent dans les grottes | neige |
| T-AMB-16 | Altiplano | vent, lamas, machines de mine | vent glacé | grêle |
| T-AMB-17 | Brooks Range | rivière, oiseaux | (pas de nuit) vent | pluie froide |
| T-AMB-18 | Iakoutie | moustiques, rivière | vent, glace qui craque | blizzard (épreuve d'hiver) |
| T-AMB-19 | Norilsk | usines, sirènes, haut-parleurs | ventilation des dômes | tempête arctique |
| T-AMB-20 | Patagonie | vent extrême, glacier qui craque | vent, chutes de glace | rafales |
| T-AMB-21 | Base ARGOS | ventilation, alarmes, machines | — | — |
| T-AMB-22 | Ruche terrestre (calque à superposer) | sifflements, résine, gouttes | — | — |

**Total : 22 ambiances, avec environ 50 variantes.**

---

## 4. Effets sonores

| ID | Son | Usage |
| --- | --- | --- |
| T-SFX-01 | `earth-registry-open` | ouverture du Registre |
| T-SFX-02 | `registry-site-select` | choix d'un site |
| T-SFX-03 | `orbit-scan` | scan orbital |
| T-SFX-04 | `drop-ramp` | rampe du vaisseau, saut |
| T-SFX-05 | `analysis-scan` | mode Analyse du biomask |
| T-SFX-06 | `mark-armed` / `mark-primary` / `mark-noncombatant` / `mark-uncertain` / `mark-specialist` / `mark-fauna` / `mark-protected` | 7 sons de marque |
| T-SFX-07 | `track-read` | lecture d'une trace |
| T-SFX-08 | `radio-listen` / `radio-translate` | écoute, traduction |
| T-SFX-09 | `voice-record` / `voice-replay` | imitation de voix |
| T-SFX-10 | `upload-bar-tick` / `upload-complete` | jauge d'envoi d'un téléphone |
| T-SFX-11 | `phone-destroyed`, `camera-destroyed` | appareil détruit |
| T-SFX-12 | `witness-flee` | fuyard qui s'échappe |
| T-SFX-13 | `knockout` | humain assommé |
| T-SFX-14 | `body-drag`, `body-hide-water`, `body-hoist` | cacher un corps |
| T-SFX-15 | `dissolve-hiss` | fiole de dissolvant bleu |
| T-SFX-16 | `trophy-take-human`, `trophy-take-beast` | prélèvement (son hors champ, pas de gore) |
| T-SFX-17 | `spare-glyph-hold` | épargner (glyphe à maintenir) |
| T-SFX-18 | `gift-leave` | don au guerrier |
| T-SFX-19 | `extraction-window-open` / `-closing` / `-missed` | fenêtres |
| T-SFX-20 | `ship-descend-cloaked` | vaisseau qui descend |
| T-SFX-21 | `selfdestruct-countdown` | autodestruction (glyphes) |
| T-SFX-22 | `argos-pulse-jammer` | brouilleur à impulsion |
| T-SFX-23 | `argos-net-launch`, `argos-net-hit` | filet lesté |
| T-SFX-24 | `argos-sensor-lock` | capteur multispectral qui accroche |
| T-SFX-25 | `argos-biotracer-puff` | bio-traceur |
| T-SFX-26 | `thermal-decoy-pulse` | leurre thermique |
| T-SFX-27 | `tide-rise`, `tide-fall` | marée |
| T-SFX-28 | `airboat-pass`, `speedboat-pass` | bateaux |
| T-SFX-29 | `wildfire-roar` | feu de brousse |
| T-SFX-30 | `geyser-burst` | geyser |
| T-SFX-31 | `tree-fall` | arbre abattu (Bornéo) |
| T-SFX-32 | `landslide` | glissement (Nouvelle-Guinée) |
| T-SFX-33 | `sandstorm-gust` | tempête de sable |
| T-SFX-34 | `ship-hull-groan` | coque d'épave (Namib, Alang) |
| T-SFX-35 | `cutting-torch-sparks` | découpe (Alang) |
| T-SFX-36 | `convoy-truck-pass` | convoi (Tibesti) |
| T-SFX-37 | `body-heat-low` | jauge de chaleur (Iakoutie) |
| T-SFX-38 | `dome-alarm` | Norilsk |
| T-SFX-39 | `crevasse-crack` | Patagonie |
| T-SFX-40 | `hunting-trap-snap` | piège à mâchoires |
| T-SFX-41 | `tripwire`, `mine-click` | pièges humains |
| T-SFX-42 | `bird-flock-alarm` | envol d'oiseaux |
| T-SFX-43 | `synth-white-blood`, `synth-voice-glitch` | synthétique W-Y |
| T-SFX-44 | `xeno-hive-nearby` | ruche terrestre |
| T-SFX-45 | `human-weapon-*` | une vingtaine d'armes humaines par époque (fusils de chasse, d'assaut, à lunette, pistolets, fusils à pompe, RPG, armes de 2100) |

**Total : environ 90 fichiers.**

---

## 5. Voix, radios et dialogues

### 5.1 Radios humaines
- Langues : celles parlées sur chaque site (anglais, français, portugais, espagnol, russe, bengali, hindi, swahili, indonésien, tok pisin, mongol, roumain, arabe, népalais, gujarati, aymara, iakoute…). **Décision :** traduites par le biomask après quelques secondes d'écoute.
- Pour chaque site, **4 familles de répliques** : routine, suspicion, recherche, panique. Environ 12 répliques par famille et par site.

| ID | Contenu | Nombre |
| --- | --- | --- |
| T-VO-01 | radios de routine (relève, ravitaillement, plaisanteries) | 20 sites × 12 |
| T-VO-02 | suspicion (« tu as vu ça ? », « qui est là ? ») | 20 × 12 |
| T-VO-03 | recherche (ordres, positions) | 20 × 12 |
| T-VO-04 | panique, appels à l'aide | 20 × 12 |
| T-VO-05 | répliques des boss (provocation, défi, reddition) | 20 boss × 15 |
| T-VO-06 | ARGOS (ordres tactiques, Varga, Mensah, Aiguille) | environ 150 |
| T-VO-07 | W-Y (ton d'entreprise, synthétiques) | environ 60 |
| T-VO-08 | nouvelles humaines à l'écoute (journaux, radios, rumeurs), par niveau d'Indice et par époque | 30 gabarits × 3 variantes |
| T-VO-09 | après-coups des films (radio, journaux) selon la date | environ 12 |

### 5.2 Voix yautja
- Clan, Ancien, archiviste du Registre : répliques en langue yautja sous-titrée (glyphes de `yautjaLanguageV147.ts`).
- Scènes T-SC (section 17) : environ 80 répliques.

---

## 6. Personnages nommés (PNJ)

### 6.1 Yautja
| ID | Nom | Rôle | Apparition |
| --- | --- | --- | --- |
| T-PNJ-01 | Archiviste du Registre | garde le Registre terrestre aux Archives des Lignées | T-SC-01, consultation |
| T-PNJ-02 | Saar | ami de cohorte (existant) | ouverture de la Terre |
| T-PNJ-03 | L'Ancien du clan (existant) | donne les contrats d'épreuve et la chasse ultime | contrats, T-SC-20 |
| T-PNJ-04 | Yena, Tov (existants) | triade | coop, compagnons |
| T-PNJ-05 | **Kerr-Vath** | chasseur d'un autre clan, croisé en route ou sur un site | incidents de route, événement « autre chasseur » |
| T-PNJ-06 | **Thar-Kesh, le renégat** | Bad Blood qui chasse sur Terre sans le code | événement Bad Blood, chasse ultime possible |

### 6.2 ARGOS
| ID | Nom | Rôle | Apparence *(proposé)* |
| --- | --- | --- | --- |
| T-PNJ-10 | **Colonelle Ilse Varga** | directrice des opérations | cinquantaine, cheveux gris courts, cicatrice au cou, tenue de terrain sobre |
| T-PNJ-11 | **Dr Tomás Echeverría** | scientifique en chef | quarantaine, lunettes, carnet, tablette, toujours hors combat |
| T-PNJ-12 | **Sergent Kofi Mensah** | chef d'équipe terrain, pisteur | grand, calme, peintures de camouflage, couteau de pisteur |
| T-PNJ-13 | **« Aiguille »** | tireuse d'élite | masque à capteurs, fusil à lunette multispectrale |
| T-PNJ-14 | **Mira Varga-Echeverría** | directrice vers 2080 | fille de Varga, formée par sa mère et par Echeverría ; prothèse de bras |
| T-PNJ-15 | **Directeur Okonjo** | directeur vers 2120 (ARGOS institution) | figure froide d'administration |

### 6.3 Proies désignées (boss humains)
| ID | Site | Nom | Rôle |
| --- | --- | --- | --- |
| T-PNJ-21 | 1 Okavango | Konrad Lisle | chef d'un syndicat d'ivoire |
| T-PNJ-22 | 2 Sundarbans | Viktor Sahl | trafiquant de peaux |
| T-PNJ-23 | 3 Pantanal | Dalton Rourke | accapareur de terres, incendiaire |
| T-PNJ-24 | 4 Kimberley | Mick Carver | pilote trafiquant |
| T-PNJ-25 | 5 Everglades | Wade Tolliver | contrebandier en hydroglisseur |
| T-PNJ-26 | 6 Carpates | Anton Grell | chef de la garde des bûcherons |
| T-PNJ-27 | 7 Congo | Commandant Ossian Dray | mercenaire à la tête d'une milice |
| T-PNJ-28 | 8 Bornéo | Harlan Vos | chef de la sécurité d'exploitation |
| T-PNJ-29 | 9 Nouvelle-Guinée | Bram Kessler | chef mercenaire |
| T-PNJ-30 | 10 Kamtchatka | Yuri Stavin | chef braconnier |
| T-PNJ-31 | 11 Namib | Lucas Ferreira | contrebandier de diamants |
| T-PNJ-32 | 12 Tibesti | Simon Arkell | chef de convoi |
| T-PNJ-33 | 13 Gobi | Capitaine Teodor Ilić | chef de patrouille |
| T-PNJ-34 | 14 Alang | Dmitri Volkan | trafiquant d'armes |
| T-PNJ-35 | 15 Mustang | Jonas Weller | chef des pilleurs |
| T-PNJ-36 | 16 Altiplano | Inés Valcárcel | chef de la sécurité de la mine |
| T-PNJ-37 | 17 Brooks Range | Abel Strand | guide de chasse légendaire |
| T-PNJ-38 | 18 Iakoutie | Pavel Orlov | chef orpailleur |
| T-PNJ-39 | 19 Norilsk | Varga ou Mira (selon la date) | cheffe d'ARGOS |

Chaque boss a ses **héritiers** possibles (contrats après une ellipse de 20 ans) : 1 héritier écrit par boss, soit 18 PNJ de plus (T-PNJ-41 → T-PNJ-58), même modèle, plus âgé ou plus jeune.

### 6.4 Grands animaux nommés
| ID | Site | Nom | Espèce |
| --- | --- | --- | --- |
| T-PNJ-61 | 1 | Crinière-Noire | lion |
| T-PNJ-62 | 2 | Celle-des-Racines | tigresse (protégée sauf si elle attaque) |
| T-PNJ-63 | 3 | Nuit-Ronde | jaguar mélanique |
| T-PNJ-64 | 4 | le Vieux du Fitzroy | crocodile marin |
| T-PNJ-65 | 5 | la Reine du Canal | python |
| T-PNJ-66 | 6 | Brise-Hêtre | ours brun |
| T-PNJ-67 | 10 | Vieux-Cendre | ours du Kamtchatka |
| T-PNJ-68 | 11 | le Solitaire des Dunes | lion du désert |
| T-PNJ-69 | 16 | Ombre-du-Salar | puma |
| T-PNJ-70 | 17 | Grand-Dos | grizzly |
| T-PNJ-71 | 18 | Dent-de-Fer | glouton |
| T-PNJ-72 | 20 | le Puma du Glacier | puma de Patagonie |

### 6.5 Non-combattants nommés
| ID | Nom | Site | Rôle |
| --- | --- | --- | --- |
| T-PNJ-81 | Amara Diallo | tous dès l'Indice 40 | journaliste qui suit les incidents (événement « journaliste ») |
| T-PNJ-82 | Le vieux pêcheur | 2 Sundarbans | témoin récurrent ; peut devenir « Honoré » s'il aide sans le savoir |
| T-PNJ-83 | L'archéologue Hanne Lund | 15 Mustang | non-combattante dans les grottes ; découvre des gravures yautja anciennes |
| T-PNJ-84 | Le garde forestier Ilie Popa | 6 Carpates | garde armé honnête ; proie digne ou candidat au don |

---

## 7. Humains génériques

Chaque archétype existe en **4 époques** : E1 (1990–2025), E2 (2025–2050), E3 (2050–2100), E4 (2100–2150). Les sprites suivent le format des ennemis existants (`enemyRosterV7.ts`) : silhouette 2,5D, animations repos, marche, course, visée, tir, rechargement, appel radio, lampe, recherche, panique, fuite, à terre, reddition, mort.

| ID | Archétype | Époques | Variantes | Armes |
| --- | --- | --- | --- | --- |
| T-SPR-01 | `poacher-rifle` | E1–E3 | 4 tenues | fusil de chasse, machette |
| T-SPR-02 | `poacher-tracker` + chien | E1–E3 | 2 | fusil, lampe ; chien pisteur |
| T-SPR-03 | `militia-fighter` | E1–E3 | 4 | fusil d'assaut, RPG |
| T-SPR-04 | `private-guard` | E1–E4 | 4 par époque | fusil, lampe, radio, plus tard drone |
| T-SPR-05 | `smuggler` | E1–E3 | 4 | pistolet-mitrailleur, pistolet |
| T-SPR-06 | `hunter-guide` | E1–E3 | 3 | fusil à lunette gros calibre |
| T-SPR-07 | `soldier` | E1–E4 | 3 par époque | équipement militaire de l'époque |
| T-SPR-08 | `police` | E1–E4 | 2 par époque | pistolet, fusil à pompe |
| T-SPR-09 | `argos-operator` | E2–E4 | 3 | capteur, filet, brouilleur, fusil |
| T-SPR-10 | `argos-sniper` | E2–E4 | 1 | fusil multispectral |
| T-SPR-11 | `argos-heavy` *(nouveau)* | E3–E4 | 1 | armure, bouclier, lanceur de filets |
| T-SPR-12 | `owlf-commando` | — | **réutiliser** | — |
| T-SPR-13 | `wy-security` | E3–E4 | 2 | armes W-Y |
| T-SPR-14 | `civilian` | E1–E4 | 8 par époque (âges, métiers) | aucune |
| T-SPR-15 | `worker` (ouvrier, mineur, bûcheron, orpailleur) | E1–E4 | 6 | outils (jamais une arme) |
| T-SPR-16 | `scientist`, `archaeologist` | E1–E4 | 3 | aucune |
| T-SPR-17 | `journalist` | E1–E4 | 1 par époque | caméra |
| T-SPR-18 | `fisherman` | E1–E4 | 2 | aucune |
| T-SPR-19 | `prisoner` (base ARGOS, autres captifs) | E2–E4 | 2 | aucune |

**Règle :** un ouvrier ou un pêcheur tient un outil, jamais un fusil ; la silhouette doit se lire non armée à distance.

**Total : environ 160 variantes de sprites humains.**

---

## 8. Faune

Animations communes : repos, marche, course, attaque, charge, blessé, fuite, mort, carcasse. Comportement selon T-IA-20 → T-IA-25.

| ID | Espèce | Sites | Rôle |
| --- | --- | --- | --- |
| T-SPR-30 | lion (+ lionne) | 1, 11 | apex |
| T-SPR-31 | tigre | 2 | apex protégé (sauf s'il attaque) |
| T-SPR-32 | jaguar (+ variante mélanique) | 3 | apex |
| T-SPR-33 | crocodile du Nil | 1 | secondaire |
| T-SPR-34 | crocodile marin | 2, 4, 8 | apex ou secondaire |
| T-SPR-35 | alligator | 5 | apex |
| T-SPR-36 | caïman | 3 | secondaire |
| T-SPR-37 | python | 5 | signature |
| T-SPR-38 | anaconda | 3 | secondaire |
| T-SPR-39 | hippopotame | 1 | dangereux (digne s'il charge) |
| T-SPR-40 | buffle (Afrique, sauvage d'Australie) | 1, 4 | dangereux |
| T-SPR-41 | éléphant (savane, forêt) | 1, 7 | dangereux ; victime des braconniers |
| T-SPR-42 | ours brun (3 tailles) | 6, 10, 18 | apex |
| T-SPR-43 | grizzly | 17 | apex |
| T-SPR-44 | loup (gris, de l'Himalaya, arctique) | 6, 13, 15, 17, 18 | secondaire |
| T-SPR-45 | lynx | 6 | secondaire |
| T-SPR-46 | léopard | 7 | apex |
| T-SPR-47 | panthère nébuleuse | 8 | apex |
| T-SPR-48 | casoar | 9 | dangereux |
| T-SPR-49 | hyène brune | 11 | secondaire |
| T-SPR-50 | puma (andin, de Patagonie) | 16, 20 | apex |
| T-SPR-51 | léopard des neiges | 15 | protégé |
| T-SPR-52 | ours du Gobi | 13 | protégé |
| T-SPR-53 | panthère de Floride | 5 | protégée |
| T-SPR-54 | glouton | 18 | apex nommé |
| T-SPR-55 | bœuf musqué | 17 | secondaire |
| T-SPR-56 | sanglier barbu | 8 | secondaire |
| T-SPR-57 | gorille | 7 | jamais une cible sauf menace directe |
| T-SPR-58 | oiseaux d'alerte (4 apparences par biome) | tous | envol d'alerte |
| T-SPR-59 | petite faune d'ambiance (singes, perroquets, hérons, lamas, chevaux, rennes, phoques) | selon le site | décor vivant |

**Total : environ 30 espèces jouables + la faune d'ambiance.**

---

## 9. Xénomorphes, synthétiques et Yautja ennemis

| ID | Élément | Base |
| --- | --- | --- |
| T-SPR-70 | Xénomorphe drone, praetorien | **réutiliser** `xeno-drone`, `xeno-praetorian` |
| T-SPR-71 | Xénomorphe né d'un humain (forme terrestre standard) | variante du drone |
| T-SPR-72 | Xénomorphe né d'un lion, d'un ours, d'un crocodile *(proposé)* | 3 formes nouvelles |
| T-SPR-73 | jeune reine terrestre | nouvelle, plus petite que la reine de la pyramide |
| T-SPR-74 | facehugger, chestburster | réutiliser si présents, sinon créer |
| T-SPR-75 | synthétique W-Y | **réutiliser** `weyland-synth`, avec 2 variantes d'époque |
| T-SPR-76 | drone W-Y | nouveau |
| T-SPR-77 | Thar-Kesh, le renégat | variante de `bad-blood-*` |
| T-SPR-78 | Kerr-Vath | Yautja d'un autre clan (nouvelle tenue) |

---

## 10. Actions et animations du joueur

Les actions existantes de la campagne (course, saut, escalade, armes, camouflage, mêlée, soins) restent. **Nouvelles actions pour la Terre :**

| ID | Action | Entrée *(proposé)* | Animation | Règle |
| --- | --- | --- | --- | --- |
| T-ANI-01 | Saut depuis la rampe | automatique | descente, atterrissage accroupi | insertion |
| T-ANI-02 | Scan d'analyse | maintenir le bouton du biomask | tête inclinée, main sur le masque | marque la cible |
| T-ANI-03 | Lire une trace | interagir près d'une trace | accroupi, doigts au sol | objectif `scan` |
| T-ANI-04 | Écouter une radio | mode EM + maintenir | main au masque | traduction progressive |
| T-ANI-05 | Enregistrer une voix | maintenir près d'un humain qui parle | tête tournée | 3 phrases max |
| T-ANI-06 | Rejouer une voix (à voix haute / sur radio) | menu rapide | main à la gorge / sur la radio | attire, fausse relève |
| T-ANI-07 | Détruire un appareil | frappe ou tir ciblé | coup de lame | Indice – 3 |
| T-ANI-08 | Assommer | mêlée sur humain désarmé | coup du revers | pas témoin, pas d'infraction |
| T-ANI-09 | Enlever un garde | attaque furtive par derrière ou par-dessus | hisser dans un arbre, tirer sous l'eau | silencieux |
| T-ANI-10 | Traîner un corps | maintenir | marche lente | — |
| T-ANI-11 | Cacher un corps | interagir (eau, arbre, crevasse, épave) | jet, hissage | 4 s |
| T-ANI-12 | Dissoudre | utiliser la fiole | verser le liquide bleu | 2 s |
| T-ANI-13 | Exposer un trophée (corps pendu) | interagir | hissage rituel | moral – 1, Indice + 2 |
| T-ANI-14 | Prélever un trophée humain / animal | interagir | geste coupé à la caméra | 6–12 s, **camouflage coupé** |
| T-ANI-15 | Porter un trophée | automatique | trophée à la ceinture | perdu en cas de grosse blessure |
| T-ANI-16 | Épargner | maintenir le glyphe | main levée, recul | + 30, témoin |
| T-ANI-17 | Retirer le masque pour le duel | accepter le duel | masque posé au sol, rugissement | duel |
| T-ANI-18 | Don au guerrier | menu, choisir un trophée ancien | objet posé devant l'humain | + 40 |
| T-ANI-19 | Poser un collet | consommable | accroupi | piège |
| T-ANI-20 | Appâter un prédateur | poser du sang ou une carcasse | — | diversion, aucun honneur |
| T-ANI-21 | Couper l'électricité / la radio | interagir | arracher les câbles | isole un camp |
| T-ANI-22 | Monter à bord du vaisseau | atteindre le point | saut dans le faisceau | extraction |
| T-ANI-23 | Autodestruction | menu à moins de 10 % | bracelet ouvert, compte à rebours | évacué de justesse (normal) |
| T-ANI-24 | Se réchauffer | près d'une source de chaleur | accroupi | jauge de chaleur (Iakoutie) |
| T-ANI-25 | Rappel / descente en corde | falaises (Kimberley, Mustang) | — | traversée |
| T-ANI-26 | Nage furtive | eau profonde | — | révèle le camouflage |
| T-ANI-27 | Ordres au pack d'Unblooded | menu rapide | geste de la main | suivre, attendre, encercler, se cacher |
| T-ANI-28 | Se libérer (capture ARGOS) | répéter une touche | lutte contre les câbles | évasion |

---

## 11. IA

### 11.1 Humains
| ID | Comportement | Détail |
| --- | --- | --- |
| T-IA-01 | États Calme → Suspicion → Recherche → Combat → Panique → Fuite | gameplay, section 9.2 |
| T-IA-02 | Routine par archétype | patrouille, garde fixe, camp (feu, repas, sommeil), travail (ouvriers) |
| T-IA-03 | Horaires | relèves, nuit, convois à heure fixe (Tibesti), marées (Sundarbans) |
| T-IA-04 | Escouades | binômes en recherche, couverture mutuelle, appel radio, retraite |
| T-IA-05 | Moral | baisse à chaque perte, trophée exposé, cri ; panique sous un seuil |
| T-IA-06 | Témoins | filmer (jauge d'envoi), fuir vers véhicule ou sortie |
| T-IA-07 | Réaction à la voix imitée | aller voir, répondre à la radio, quitter un poste |
| T-IA-08 | Pisteurs humains | suivent les traces du joueur (eau, sang, branches) ; Brooks Range, poacher-tracker |
| T-IA-09 | Pièges humains | posent et vérifient des pièges |
| T-IA-10 | Non-combattants | fuient, se cachent, ne prennent jamais une arme (sauf prisonniers à Blackrock, mode The Isles) |
| T-IA-11 | Reddition | jeter l'arme sous un seuil de moral (boss phase 3) |
| T-IA-12 | Guerre de milices (Congo) | deux factions qui s'affrontent si on les provoque |

### 11.2 Boss
| ID | Gabarit | Phases |
| --- | --- | --- |
| T-IA-13 | boss humain | Retranché → Chasseur → Dernier carré (défi possible) |
| T-IA-14 | boss animal | Territoire → Furie → Dernière charge |
| T-IA-15 | Varga / Mira | piège (brouilleurs) → équipes → duel dans les tunnels |

Chaque boss a 2 comportements propres à son site (exemple : Tolliver passe en hydroglisseur, Arkell combat sur un camion en marche, Strand piste le joueur, Vos combat dans la canopée).

### 11.3 ARGOS, OWLF, W-Y
| ID | Comportement |
| --- | --- |
| T-IA-16 | ARGOS : capteurs posés en réseau, appâts, leurres thermiques, poudre bio-traceuse, filets, embuscade au point d'extraction |
| T-IA-17 | ARGOS : apprend du registre du joueur (s'il attaque toujours de nuit, ARGOS renforce la nuit) *(proposé)* |
| T-IA-18 | OWLF : efface les preuves (ramasse les appareils, brûle les corps), évite ARGOS ou l'attaque |
| T-IA-19 | W-Y : synthétiques sans peur, qui enregistrent ; drones ; sécurité qui protège les labos |

### 11.4 Faune
| ID | Comportement |
| --- | --- |
| T-IA-20 | territoire, point d'eau, horaires (aube, crépuscule) |
| T-IA-21 | réaction au joueur : fuite, intimidation, charge |
| T-IA-22 | chasse ses propres proies, y compris les humains |
| T-IA-23 | attirance par l'appât (sang, carcasse) |
| T-IA-24 | troupeaux et oiseaux qui alertent |
| T-IA-25 | espèces protégées : n'attaquent que si on les menace |

### 11.5 Xénomorphes, pack, alliés
| ID | Comportement |
| --- | --- |
| T-IA-26 | ruche terrestre : propagation, capture d'hôtes, défense de la jeune reine |
| T-IA-27 | pack d'Unblooded : ordres, jet de discipline face à un humain armé |
| T-IA-28 | compagnons en coop IA (Yena, Tov) : rôles attirer, isoler, guetter |
| T-IA-29 | Bad Blood Thar-Kesh : tue sans le code, vole les mises à mort, attaque le joueur s'il est faible |

---

## 12. Zones : les 20 sites secteur par secteur

Chaque site a 6 secteurs (S1 dépôt → S6 extraction), décrits dans le gameplay (section 20). Pour la production, chaque secteur demande :
- 1 calque de fond et 1 calque de premier plan (`WorldScreenLayerPlan`), plus 1 variante de nuit ;
- ses éléments de terrain (`WorldScreenFeature`) ;
- ses bâtiments et props (sections 13 et 14) ;
- une variante d'époque pour les sites qui changent beaucoup.

| Site | Secteurs à produire | Variantes d'époque |
| --- | --- | --- |
| 1 Okavango | 6 | E3 (delta asséché par endroits, drones) |
| 2 Sundarbans | 6 × 2 marées | E4 (îles englouties) |
| 3 Pantanal | 6 + front de feu animé | E3 (terres brûlées) |
| 4 Kimberley | 6 | E4 (port de fret automatisé) |
| 5 Everglades | 6 | E4 (semi-urbain) |
| 6 Carpates | 6 | E3 (réserve, drones) |
| 7 Congo | 6 | E3 (exploitation minière géante) |
| 8 Bornéo | 6 (vertical) | E3 (plantations) |
| 9 Nouvelle-Guinée | 6 + mine | E3 (mine abandonnée, base ARGOS) |
| 10 Kamtchatka | 6 | E4 (vallée changée par l'éruption) |
| 11 Namib | 6 + intérieur d'épave | E3 (nouvelles épaves) |
| 12 Tibesti | 6 | E3 (camions autonomes) |
| 13 Gobi | 6 | E4 (fermes solaires) |
| 14 Alang | 6 (vertical) | E4 (démolition de vaisseaux spatiaux) |
| 15 Mustang | 6 + grottes | E3 (grottes inondées) |
| 16 Altiplano | 6 + mine | E3 (exploitation de lithium) |
| 17 Brooks Range | 6 | E4 (toundra dégelée) |
| 18 Iakoutie | 6 + mine | E4 (permafrost fondu) |
| 19 Norilsk | 6 sous dômes + tunnels | — (E4 seulement) |
| 20 Patagonie | 6 | E4 (glaciers reculés) |
| Base ARGOS | 6 salles (évasion) | — |

**Total : 120 secteurs + environ 70 secteurs en variante d'époque ou d'état + 6 salles de base.**

---

## 13. Bâtiments et structures

| ID | Bâtiment | Sites | Intérieur jouable |
| --- | --- | --- | --- |
| T-BLD-01 | camp de braconniers (tentes, bâches, feu, séchoir) | 1, 2, 3, 7, 10 | non |
| T-BLD-02 | lodge de chasse | 5, 17 | oui |
| T-BLD-03 | cabane sur pilotis | 2, 5 | oui |
| T-BLD-04 | ferme et ranch | 3 | oui |
| T-BLD-05 | scierie illégale, camp de bûcherons | 6, 8 | partiel |
| T-BLD-06 | village minier, baraquements | 9, 16, 18 | partiel |
| T-BLD-07 | galeries de mine (bois, rails, ascenseur) | 9, 16, 18 | oui |
| T-BLD-08 | camp de milice (sacs de sable, tours de guet) | 7 | non |
| T-BLD-09 | village abandonné | 7 | oui |
| T-BLD-10 | entrepôt sur pilotis | 2 | oui |
| T-BLD-11 | épave de cargo (intérieur) | 11, 14 | oui |
| T-BLD-12 | coques de pétroliers et grues de démolition | 14 | oui |
| T-BLD-13 | poste frontière | 13 | oui |
| T-BLD-14 | village fortifié de pierre, grottes creusées | 15 | grottes |
| T-BLD-15 | oasis et campement de convoi | 12 | non |
| T-BLD-16 | ruine de motel | 5 | oui |
| T-BLD-17 | piste d'atterrissage et hangar de brousse | 17 | hangar |
| T-BLD-18 | ville sous dômes, usines, tunnels | 19 | oui |
| T-BLD-19 | centre ARGOS de Norilsk | 19 | oui |
| T-BLD-20 | base souterraine ARGOS (évasion) | — | 6 salles |
| T-BLD-21 | refuge de montagne | 20 | oui |
| T-BLD-22 | labo W-Y (E3–E4) | 14, 16, 18, 19 | oui |
| T-BLD-23 | antennes radio, mâts, caméras de surveillance | tous | non |
| T-BLD-24 | ponts, pontons, passerelles de canopée | 1, 2, 4, 8 | non |
| T-BLD-25 | baobab mort, île du repaire | 1 | non |

---

## 14. Props

| ID | Prop | Sites | Fonction |
| --- | --- | --- | --- |
| T-PRP-01 | caisses, sacs, bidons | tous | couvert, traces |
| T-PRP-02 | feux de camp (allumé, éteint, braises) | tous | trace, lumière, chaleur |
| T-PRP-03 | tables de camp, chaises, hamacs | tous | décor |
| T-PRP-04 | radios de camp, talkies, antennes | tous | écoute, à couper |
| T-PRP-05 | téléphones, caméras, caméras de chasse | tous | témoins, à détruire |
| T-PRP-06 | générateurs, projecteurs | camps | lumière, à couper |
| T-PRP-07 | pièges à mâchoires, fils de détente, mines | 1, 5, 6, 10, 18 | pièges humains |
| T-PRP-08 | défenses d'ivoire, peaux, carcasses | 1, 2, 10 | traces, preuves |
| T-PRP-09 | sacs de python, cages | 5 | traces |
| T-PRP-10 | bidons d'essence, torches | 3 | feu |
| T-PRP-11 | grumes, tronçonneuses, engins | 6, 8 | décor, traces |
| T-PRP-12 | rails, wagonnets, sacs de minerai, tamis | 9, 11, 16, 18 | traces |
| T-PRP-13 | caisses d'armes | 14, 12 | preuve, trophée |
| T-PRP-14 | objets pillés (statues, manuscrits) | 15 | objectif « rendre » |
| T-PRP-15 | véhicules : 4×4, quad, pick-up, camion, motoneige, hydroglisseur, bateau rapide, pirogue, avion de brousse, hélicoptère | selon les sites | décor, fuite, couvert |
| T-PRP-16 | véhicules E3–E4 : camions autonomes, drones, véhicules W-Y | sites concernés | variantes d'époque |
| T-PRP-17 | brouilleurs ARGOS, capteurs sur trépied, filets, leurres thermiques | dès l'Indice 60 | ARGOS |
| T-PRP-18 | fiole de dissolvant | joueur | nettoyage |
| T-PRP-19 | collets, leurres sonores | joueur | pièges |
| T-PRP-20 | objets de don (pistolet à silex, sabre, plaque, montre, carnet) | joueur | don au guerrier |
| T-PRP-21 | cocons, œufs, résine | ruche terrestre | Xénomorphes |
| T-PRP-22 | sources chaudes, braseros, machines chaudes | 18 | chaleur |
| T-PRP-23 | balises de détresse, fusées éclairantes | tous | humains |
| T-PRP-24 | gravures yautja anciennes | 15 et missions annexes | Registre des Anciens |

---

## 15. Textures et calques de décor

### 15.1 Calques par site
- 20 sites × 6 secteurs × (fond + premier plan) = **240 calques**, plus les variantes nuit (240) et d'époque (environ 140).
- Format et parallaxe : ceux de `WorldScreenLayerPlan` (bandes `surface`, `mid-depth`, `understory`).

### 15.2 Nouveaux éléments de terrain
À ajouter à `WorldScreenFeatureKind` : `mangrove-root`, `papyrus-bank`, `airboat-channel`, `wildfire-front`, `fog-bank`, `geyser`, `ship-hull`, `salt-flat`, `permafrost-mud`, `city-dome`, `glacier-crevasse`, `canopy-bridge`, `mine-rail`, `sandstone-gorge`, `tidal-mudflat`.

### 15.3 Textures communes à créer
| ID | Texture |
| --- | --- |
| T-TEX-01 | eau de delta, de mangrove, de marais (3) |
| T-TEX-02 | boue, vase de marée |
| T-TEX-03 | sable de dune, sable rouge, sel |
| T-TEX-04 | grès rouge, basalte, roche volcanique, granite |
| T-TEX-05 | neige, glace, permafrost |
| T-TEX-06 | herbes hautes, carex, papyrus |
| T-TEX-07 | écorces (hêtre, mélèze, arbres tropicaux) |
| T-TEX-08 | métal rouillé de coque, tôle, béton industriel |
| T-TEX-09 | brûlé (cendres, terres calcinées) |
| T-TEX-10 | résine Xénomorphe sur matériaux humains |
| T-TEX-11 | sang vert (joueur), sang blanc (synthétique) |

---

## 16. Effets visuels

| ID | Effet |
| --- | --- |
| T-VFX-01 | distorsion du camouflage sous la pluie, dans l'eau, dans la poussière |
| T-VFX-02 | reflet du camouflage sur le salar |
| T-VFX-03 | scan d'analyse (balayage) et 7 marques colorées |
| T-VFX-04 | jauge d'envoi au-dessus d'un humain qui filme |
| T-VFX-05 | fumée bleue du dissolvant |
| T-VFX-06 | feu de brousse qui avance |
| T-VFX-07 | geyser, vapeur |
| T-VFX-08 | marée qui monte |
| T-VFX-09 | brouillard qui monte et descend |
| T-VFX-10 | tempête de sable, blizzard |
| T-VFX-11 | étincelles de découpe |
| T-VFX-12 | brouilleur à impulsion (onde qui coupe le camouflage) |
| T-VFX-13 | bio-traceur (poudre qui révèle le sang) |
| T-VFX-14 | faisceau du vaisseau à l'extraction |
| T-VFX-15 | explosion d'autodestruction |
| T-VFX-16 | fusées éclairantes |
| T-VFX-17 | vision thermique brouillée par la chaleur et le feu |

---

## 17. Histoires et scènes

| ID | Scène | Moment | Durée |
| --- | --- | --- | --- |
| T-SC-01 | **Le Registre s'ouvre** : l'archiviste montre la Terre, réserve ouverte | retour de R2-M023 | 1:30 |
| T-SC-02 | Premier pas sur Terre : le vaisseau descend, le joueur regarde le ciel humain | première insertion | 0:30 |
| T-SC-03 | **Rumeurs** : premières nouvelles humaines captées à l'écoute | après l'Indice 20 | 0:20 |
| T-SC-04 | **Naissance d'ARGOS** : réunion secrète, Varga reçoit le dossier | premier niveau 3 | 1:00 |
| T-SC-05 | Echeverría étudie une trace du joueur au labo | phase Équipement | 0:40 |
| T-SC-06 | **Première rencontre avec Mensah** : il retrouve la piste du joueur | première mission avec ARGOS | 0:40 |
| T-SC-07 | « Aiguille » voit le joueur dans sa lunette, et ne tire pas tout de suite | phase Doctrine | 0:30 |
| T-SC-08 | Capture : le joueur se réveille dans la base | capture | 0:40 |
| T-SC-09 | Évasion réussie ou sauvetage du clan | fin de la capture | 0:40 |
| T-SC-10 | **Varga passe la main** à Mira (vers 2080) | ellipse | 1:00 |
| T-SC-11 | **ARGOS devient institution** : le dossier « le Patient » | vers 2120 | 0:40 |
| T-SC-12 | **Weyland-Yutani arrive** : un labo W-Y sur un site | première mission E3 avec W-Y | 0:40 |
| T-SC-13 | **Ruche terrestre** : le joueur trouve le premier cocon | première ruche | 0:30 |
| T-SC-14 | **Don au guerrier** : l'humain reçoit l'objet | chaque don (variantes) | 0:20 |
| T-SC-15 | Retour d'un Honoré (allié, rival, héritier) | contrats de retour | 0:30 |
| T-SC-16 | Tribunal pour une faute sur Terre | infraction | réutiliser la scène du tribunal |
| T-SC-17 | Norilsk acte 1 : la ville sous dômes | site 19 | 0:40 |
| T-SC-18 | Norilsk acte 2 : le piège se referme | site 19 | 0:30 |
| T-SC-19 | Norilsk acte 3 : le duel, puis les 3 fins | site 19 | 1:30 |
| T-SC-20 | **La chasse ultime** : l'Ancien lit le registre et écrit le contrat | site 20 | 1:00 |
| T-SC-21 | Fin de la chasse ultime : le trophée entre au mausolée | site 20 | 1:00 |

### 17.1 Fil narratif de la Terre
1. **Le chasseur qui arrive** (palier 1) : la Terre est un terrain d'épreuve ; les humains ne savent rien.
2. **Les humains qui comprennent** (palier 2) : rumeurs, ARGOS naît, Mensah piste le joueur.
3. **Les humains qui répondent** (palier 3) : contre-chasse, W-Y, ruches, capture possible.
4. **La fin d'une rivalité** (palier 4) : Norilsk, puis la chasse ultime qui résume toute une vie.

---

## 18. Missions principales : contrats

Chaque site a **3 contrats désignés écrits** (le premier, puis deux qui s'ouvrent avec les ellipses et les héritiers) en plus de la chasse libre tirée au hasard. Format : ID, nom, proie, objectifs d'honneur.

### Palier 1
| ID | Site | Contrat | Proie principale | Objectifs d'honneur |
| --- | --- | --- | --- | --- |
| T-CT-01A | 1 | L'ivoire rouge | Konrad Lisle | chef à la lame ; aucun éléphant tué pendant la chasse ; trophée de lion sans plasma |
| T-CT-01B | 1 | Crinière-Noire | lion nommé | mise à mort en mêlée ; sans camouflage |
| T-CT-01C | 1 | L'héritier de Lisle | héritier de Lisle (E3) | aucun drone de surveillance ne voit le joueur |
| T-CT-02A | 2 | Les peaux | Viktor Sahl | ne jamais tirer depuis l'eau ; aucun pêcheur blessé |
| T-CT-02B | 2 | La marée haute | équipe de Sahl en bateaux rapides | couler les bateaux à marée haute |
| T-CT-02C | 2 | Celle-des-Racines | tigresse (si elle attaque) | la laisser vivre si elle ne charge pas |
| T-CT-03A | 3 | Les incendiaires | Dalton Rourke | éteindre un foyer ; chef en mêlée |
| T-CT-03B | 3 | Nuit-Ronde | jaguar mélanique | mise à mort en mêlée |
| T-CT-03C | 3 | Terres brûlées | héritier de Rourke (E3) | aucun nouveau feu allumé |
| T-CT-04A | 4 | Le pilote | Mick Carver | aucun tir pendant l'orage ; pilote désarmé épargné |
| T-CT-04B | 4 | Le Vieux du Fitzroy | crocodile marin | combat dans l'eau |
| T-CT-04C | 4 | Le port automatisé | sécurité du port (E4) | aucune caméra ne garde d'image |
| T-CT-05A | 5 | Le canal | Wade Tolliver | aucun témoin ; panthère non touchée |
| T-CT-05B | 5 | La Reine du Canal | python | sans arme à distance |
| T-CT-05C | 5 | La ville gagne | gang des marais (E4) | bordure urbaine sans témoin |
| T-CT-06A | 6 | La scierie | Anton Grell | loups libérés ; ours au combistick |
| T-CT-06B | 6 | Brise-Hêtre | ours brun | mise à mort en mêlée |
| T-CT-06C | 6 | La réserve | gardes forestiers armés et drones (E3) | Ilie Popa épargné ou honoré |

### Palier 2
| ID | Site | Contrat | Proie principale | Objectifs d'honneur |
| --- | --- | --- | --- | --- |
| T-CT-07A | 7 | Deux milices | Ossian Dray | ne frapper aucun groupe déjà vaincu ; porteurs épargnés |
| T-CT-07B | 7 | Le léopard | léopard | traque sans tir |
| T-CT-07C | 7 | La mine géante | sécurité minière (E3) | aucune image envoyée |
| T-CT-08A | 8 | Le dernier grand arbre | Harlan Vos | ne jamais toucher le sol ; arbre sauvé |
| T-CT-08B | 8 | La panthère nébuleuse | panthère nébuleuse | combat dans la canopée |
| T-CT-08C | 8 | Les plantations | héritier de Vos (E3) | aucune alerte au-dessus de 2 |
| T-CT-09A | 9 | Les mercenaires | Bram Kessler | aucun mineur désarmé blessé ; chef sans arme à distance |
| T-CT-09B | 9 | La mine | équipe de Kessler dans la mine | aucune lumière allumée |
| T-CT-09C | 9 | La base dans la mine | équipe ARGOS (E3) | récupérer un dossier ARGOS |
| T-CT-10A | 10 | La rivière | Yuri Stavin | geysers jamais utilisés contre un humain |
| T-CT-10B | 10 | Vieux-Cendre | ours dominant | lame seulement |
| T-CT-10C | 10 | La vallée nouvelle | braconniers de E4 | trouver le nouveau passage |
| T-CT-11A | 11 | Les diamants | Lucas Ferreira | chasse à l'aube dans le brouillard ; aucun corps sur la plage |
| T-CT-11B | 11 | Le Solitaire des Dunes | lion du désert | mise à mort en mêlée |
| T-CT-11C | 11 | Les épaves nouvelles | trafiquants de E3 | combat dans un cargo automatisé |
| T-CT-12A | 12 | Le convoi | Simon Arkell | passagers désarmés épargnés ; duel du chef |
| T-CT-12B | 12 | La tempête | escorte du convoi | combattre dans la tempête |
| T-CT-12C | 12 | Les camions sans chauffeur | escorte de E3 | arrêter le convoi sans détruire la cargaison |

### Palier 3
| ID | Site | Contrat | Proie principale | Objectifs d'honneur |
| --- | --- | --- | --- | --- |
| T-CT-13A | 13 | La patrouille | Teodor Ilić | à découvert de jour ; ours du Gobi évité |
| T-CT-13B | 13 | Les loups | meute de loups | sans camouflage |
| T-CT-13C | 13 | Les fermes solaires | sécurité de E4 | aucune caméra active à la fin |
| T-CT-14A | 14 | La cale | Dmitri Volkan | aucun ouvrier blessé ; trafiquant dans sa cale |
| T-CT-14B | 14 | La marée des coques | gardes privés | pas un pas sur la plage |
| T-CT-14C | 14 | Les vaisseaux démontés | équipe W-Y (E4) | récupérer un composant |
| T-CT-15A | 15 | Les pilleurs | Jonas Weller | objets rendus intacts ; aucun tir dans les grottes peintes |
| T-CT-15B | 15 | Les gravures | pilleurs qui ont trouvé des gravures yautja | Hanne Lund épargnée |
| T-CT-15C | 15 | Les grottes noyées | pilleurs de E3 | combat sous l'eau |
| T-CT-16A | 16 | Le salar | Inés Valcárcel | traverser le salar sans être vu |
| T-CT-16B | 16 | Ombre-du-Salar | puma | combistick |
| T-CT-16C | 16 | Le lithium | sécurité W-Y (E3) | aucun synthétique n'envoie d'image |
| T-CT-17A | 17 | Le guide | Abel Strand | guide vaincu sans camouflage |
| T-CT-17B | 17 | Grand-Dos | grizzly | lame seulement |
| T-CT-17C | 17 | L'élève de Strand | héritier de Strand | duel accepté |
| T-CT-18A | 18 | L'or | Pavel Orlov | chasse d'hiver complète |
| T-CT-18B | 18 | Dent-de-Fer | glouton | sans arme à distance |
| T-CT-18C | 18 | Les cratères | orpailleurs de E4 | aucun piège déclenché |

### Palier 4
| ID | Site | Contrat | Proie principale | Objectifs d'honneur |
| --- | --- | --- | --- | --- |
| T-CT-19A | 19 | Le piège | cheffe d'ARGOS | aucun civil touché ; combat loyal ou épargner ; rien laisser |
| T-CT-20A → E | 20 | Chasse ultime (5 contrats) | selon le registre | fixés par le contrat |

### Contrats de rang
| ID | Type | Contenu |
| --- | --- | --- |
| T-CT-E1 → E6 | Chasse d'épreuve (Adjutant) | 6 gabarits de conditions (sans plasma, sans camouflage, de jour, une seule arme, sans soin, chrono) |
| T-CT-P1 → P6 | Sortie du pack (Adjutant) | une par site du palier 1 ; faune seulement |
| T-CT-C1 → C8 | Contrat Cleaner (Elite) | 8 scénarios : vaisseau écrasé, chasseur blessé, technologie perdue, corps exposés filmés, ruche naissante, ARGOS sur les lieux, W-Y sur les lieux, journaliste avec des images |

**Total : 54 contrats écrits + 2 contrats de fin + 20 contrats de rang.**

---

## 19. Missions annexes

### 19.1 Annexes par site
Une annexe par site, faisable pendant n'importe quel contrat sur ce site.

| ID | Site | Annexe | Récompense |
| --- | --- | --- | --- |
| T-AN-01 | 1 | **La carcasse** : suivre la piste d'un éléphant blessé et achever ses braconniers | honneur, ivoire rendu à la terre |
| T-AN-02 | 2 | **Le pêcheur** : protéger le vieux pêcheur d'un trafiquant, sans être vu | Honoré possible |
| T-AN-03 | 3 | **La galerie** : sauver la forêt-galerie d'un incendie | Indice – 3 |
| T-AN-04 | 4 | **Les peintures** : trouver un abri sous roche avec des gravures yautja anciennes | entrée au Registre des Anciens |
| T-AN-05 | 5 | **Le roi python** : tuer un python géant sans arme | trophée secondaire |
| T-AN-06 | 6 | **Les loups** : libérer une meute prise aux pièges | honneur |
| T-AN-07 | 7 | **Le gorille** : écarter une milice d'un groupe de gorilles | honneur |
| T-AN-08 | 8 | **La canopée** : traverser tout le site sans toucher le sol | épreuve |
| T-AN-09 | 9 | **Les mineurs** : libérer des mineurs retenus de force | honneur, Indice + 2 (témoins) |
| T-AN-10 | 10 | **Le saumon** : défaire les filets des braconniers | honneur |
| T-AN-11 | 11 | **L'épave** : explorer le cargo et trouver un ancien trophée yautja perdu | trophée ancien (don possible) |
| T-AN-12 | 12 | **L'oasis** : protéger l'oasis d'un convoi armé | honneur |
| T-AN-13 | 13 | **Le cavalier** : un cavalier armé chasse le joueur ; le vaincre loyalement | trophée, don possible |
| T-AN-14 | 14 | **Les ouvriers** : faire sortir des ouvriers d'une coque qui s'effondre | honneur, Indice + 2 |
| T-AN-15 | 15 | **Les objets** : rendre au village 5 objets pillés | honneur |
| T-AN-16 | 16 | **Le reflet** : traverser le salar à midi sans être vu | épreuve |
| T-AN-17 | 17 | **Le lodge** : détruire la salle des trophées d'un chasseur de trophées humains *(proposé)* | trophée |
| T-AN-18 | 18 | **L'hiver** : survivre une nuit d'hiver complète dehors | épreuve, trophée de fourrure |
| T-AN-19 | 19 | **Les caméras** : couper le réseau de caméras d'un quartier | Indice – 5 |
| T-AN-20 | 20 | **Le glacier** : monter au sommet du champ de glace | vue sur toute la Patagonie |

### 19.2 Fils annexes sur toute la Terre
| ID | Fil | Contenu | Récompense |
| --- | --- | --- | --- |
| T-AN-30 | **Le Registre des Anciens** | 20 marques de chasses yautja anciennes, une par site (gravures, crânes, armes enfouies) | à 20 : arme ancienne du clan, entrée au Registre |
| T-AN-31 | **Les Honorés** | retrouver chaque humain honoré (allié, rival, héritier) | contrats de retour |
| T-AN-32 | **Le dossier du Patient** | voler 8 pages du dossier ARGOS sur le joueur, sur 8 sites | ce qu'ARGOS sait ; Indice – 10 |
| T-AN-33 | **La journaliste** | Amara Diallo suit le joueur de site en site ; récupérer ses images ou la laisser publier | fin propre ou Indice + 15 |
| T-AN-34 | **Kerr-Vath** | 3 rencontres avec un chasseur d'un autre clan : rivalité, puis chasse commune | trophée commun |
| T-AN-35 | **Thar-Kesh** | traquer le renégat sur 3 sites | trophée de Bad Blood, honneur au clan |
| T-AN-36 | **Les écoutes** | écouter 50 nouvelles humaines | entrées de codex sur l'histoire humaine |
| T-AN-37 | **Les espèces** | voir sans les chasser les 4 espèces protégées | entrée de codex, gravure de masque |

**Total : 20 annexes de site + 8 fils annexes.**

---

## 20. Interface

| ID | Élément |
| --- | --- |
| T-UI-01 | Registre terrestre (globe, marques, fiche, contrats, histoire) |
| T-UI-02 | Briefing Terre |
| T-UI-03 | Écran d'orbite (zones de dépôt, fenêtres, scan) |
| T-UI-04 | HUD Terre : marques des cibles, jauge d'envoi, minuteur de fenêtre, Indice, chaleur corporelle |
| T-UI-05 | Liste des traces restantes |
| T-UI-06 | Glyphe achever / épargner |
| T-UI-07 | Menu du don au guerrier |
| T-UI-08 | Menu de voix enregistrées |
| T-UI-09 | Ordres au pack |
| T-UI-10 | Débrief Terre |
| T-UI-11 | Écoute des nouvelles humaines |
| T-UI-12 | Registre des Anciens (collection) |
| T-UI-13 | Dossier du Patient |
| T-UI-14 | Jauge de propagation de ruche |

Chaque écran existe dans les deux modes d'interface (biomask et gantelet, ou classique).

---

## 21. Récapitulatif chiffré

| Catégorie | Quantité |
| --- | --- |
| Musique | 21 pistes (MUS-74 → MUS-94) |
| Ambiances | 22, environ 50 variantes |
| Effets sonores | environ 90 |
| Voix et radios | environ 1 500 répliques |
| PNJ nommés | 6 Yautja, 6 ARGOS, 19 boss, 18 héritiers, 12 animaux, 4 non-combattants |
| Humains génériques | 19 archétypes, environ 160 variantes |
| Faune | environ 30 espèces |
| Xénomorphes, synthétiques, Yautja ennemis | 9 éléments (dont 4 réutilisés) |
| Actions du joueur | 28 |
| Comportements d'IA | 29 |
| Secteurs | 120 + environ 70 variantes + 6 salles |
| Bâtiments | 25 types |
| Props | 24 familles |
| Calques de décor | environ 620 |
| Effets visuels | 17 |
| Scènes | 21 |
| Contrats | 54 écrits + 2 de fin + 20 de rang |
| Missions annexes | 20 + 8 fils |
| Écrans | 14 |
