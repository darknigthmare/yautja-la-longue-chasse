# The Isles — Inventaire complet de production

Nov 21, 2026 · @darknigthmare

Liste de **tout ce qu'il faut créer** pour le mode [The Isles](MODE_THE_ISLES_20261121.md) : musique, sons, sprites isométriques, tuiles et textures, props, bâtiments, zones, PNJ, faune, IA, actions, histoire, missions principales et annexes, Chasse inversée, saisons, interface.

Les missions, les cartes de Chasse inversée et les scènes sont écrites en entier dans [The Isles — Fiches de mission et scènes écrites](ISLES_FICHES_MISSIONS_20261122.md).

> **Révision du 22 novembre :** la métropole de Calder, Eastbank, Gull Pier, les stades, les transports et Grayhaven ajoutent du contenu listé dans [Métropole, transports, zone de quarantaine](ISLES_EXTENSION_METROPOLE_QUARANTAINE_20261122.md), section 13. Les quantités ci-dessous ne le comptent pas.

**Règle de lecture.** Tout ce qui suit est *(proposé)*, sauf ce qui découle des décisions du mode. Le mode est en **3D isométrique sous three.js** : les personnages sont des modèles ou des sprites à **8 directions**, le monde est fait de **tuiles de 2 m** extrudées en volumes.

| Préfixe | Contenu |
| --- | --- |
| `MUS-` | musique (suite du catalogue, à partir de MUS-95) |
| `I-AMB-`, `I-SFX-`, `I-VO-` | ambiances, effets, voix |
| `I-CHR-` | personnages et animaux isométriques |
| `I-ANI-` | animations du joueur |
| `I-TIL-` | tuiles et textures |
| `I-PRP-` | props |
| `I-BLD-` | bâtiments |
| `I-VEH-` | véhicules |
| `I-VFX-` | effets visuels |
| `I-PNJ-` | personnages nommés |
| `I-IA-` | comportements d'IA |
| `I-SC-` | scènes |
| `I-MP-` | missions principales (arc Hale) |
| `I-AN-` | missions et activités annexes |
| `I-INV-` | Chasse inversée |
| `I-SAI-` | saisons |
| `I-UI-` | interface |

---

## Sommaire

1. Technique à créer
2. Musique
3. Ambiances sonores
4. Effets sonores
5. Voix
6. Personnages nommés
7. Humains génériques
8. Faune
9. Le Yautja en isométrique : actions et animations
10. IA
11. Zones : les îles, quartier par quartier
12. Bâtiments
13. Véhicules
14. Props
15. Tuiles et textures
16. Effets visuels
17. Histoire et scènes
18. Missions principales : arc Hale
19. Missions et activités annexes
20. Chasse inversée : tout ce qu'il faut créer
21. Saisons
22. Interface
23. Récapitulatif chiffré

---

## 1. Technique à créer

| Bloc | Contenu |
| --- | --- |
| Rendu | three.js, caméra orthographique isométrique (4 rotations, 3 zooms, anticipation), lumière jour et nuit, ombres, brouillard |
| Monde | grille 4 096 × 4 096 tuiles en zones de 32 × 32, regroupement des volumes par zone, instanciation des objets répétés, chargement autour du joueur |
| Occlusion | transparence ou coupe des volumes entre la caméra et le joueur ; toits retirés en intérieur |
| Éditeur | outil interne : peindre le sol, la hauteur, le biome, les zones de peuplement, les routes, poser les objets |
| Simulation | peuplement par zone et par heure, trafic, faune, factions, alertes |
| Réseau | session (Cloudflare Durable Object), 8 joueurs, 15 envois par seconde, validation serveur des actions importantes, voix de proximité et radio |
| Sauvegarde | `profile.islesV1` |
| Outils de test | caméra libre, téléportation, réglage de l'heure, de la météo, du niveau d'alerte |

---

## 2. Musique

Même format que le catalogue de la bible. **Signature commune** : le motif du clan de quatre notes, plus un **motif des Îles** propre au mode (trois notes montantes, à la marimba).

### 2.1 Thèmes du mode
**MUS-95 — The Isles, menu** · menu du mode · 3:00 · 92 BPM · Sol mineur · boucle.

```text
Instrumental, no vocals. Main menu theme for an open-world island hunting game. 92 BPM, G minor. Warm marimba playing a three-note rising island motif, steel-string guitar, deep tribal drums, ocean waves, low brass answering with a four-note descending clan motif. Sunny but dangerous, adventurous. Seamless loop.
```

**MUS-96 — L'autel de Verdant** · hub des joueurs · 3:00 · 64 BPM · Ré mineur · boucle.

```text
Instrumental ambient loop for an ancient overgrown jungle altar where alien hunters gather. 64 BPM, D minor. Stone percussion, slow frame drum, wordless low choir, jungle insects, bamboo flute, the clan motif on a soft horn. Sacred, ancient, calm. Seamless loop.
```

### 2.2 Musique d'exploration par île (adaptative : calme / traque)
| ID | Île | Tempo · ton | Prompt |
| --- | --- | --- | --- |
| MUS-97 | Verdant | 90 · Ré mineur | `Instrumental open-world exploration loop for a tropical jungle island. 90 BPM, D minor. Log drums, marimba island motif, humid pads, birds and insects as texture, low cello. Two layers: calm and stalking. Seamless loop.` |
| MUS-98 | The Shallows | 84 · Si bémol majeur vers mineur | `Instrumental loop for mangrove islets and coral reefs. 84 BPM, B flat. Steel drums played softly, slide guitar, water textures, reverb. Calm layer bright, stalking layer darker with bass pulse. Seamless loop.` |
| MUS-99 | Tallgrass | 96 · La dorien | `Instrumental loop for open savanna with an abandoned safari lodge. 96 BPM, A Dorian. Hand drums, plucked strings, wind in tall grass, distant lion roars blended as texture, low horn. Two layers. Seamless loop.` |
| MUS-100 | Saltmarsh | 78 · Mi mineur | `Instrumental loop for a foggy bayou delta with an old refinery flare. 78 BPM, E minor. Resonator guitar, washboard, low clarinet, swamp frogs, industrial hum. Two layers. Seamless loop.` |
| MUS-101 | Redmesa et Dustwater | 88 · Ré phrygien | `Instrumental loop for red desert canyons and a small mining town with a railway. 88 BPM, D Phrygian. Twangy baritone guitar, dry hand percussion, harmonica-like synth, train rhythm, wind. Two layers. Seamless loop.` |
| MUS-102 | Calder, jour | 104 · Fa mineur | `Instrumental loop for a crowded port city by day, seen from the rooftops by a cloaked hunter. 104 BPM, F minor. Urban drums, bass guitar, city noise textures, harbour horns, tense synth arpeggio. Two layers. Seamless loop.` |
| MUS-103 | Calder, nuit | 96 · Do mineur | `Instrumental loop for a port city at night with gangs and police sirens. 96 BPM, C minor. Dark synth bass, slow hip-hop influenced drums without vocals, neon pads, distant sirens. Two layers. Seamless loop.` |
| MUS-104 | Ember | 70 · Do mineur | `Instrumental loop for an active volcano island. 70 BPM, C minor. Deep rumbling drones, slow heavy drums, crackling lava textures, choir pad, low brass. Two layers. Seamless loop.` |
| MUS-105 | Hollowpine | 80 · Mi mineur | `Instrumental loop for a foggy mountain pine forest with a dam and a cable car. 80 BPM, E minor. Acoustic guitar, low strings, woodblocks, wind, distant chainsaws. Two layers. Seamless loop.` |
| MUS-106 | Frost Isle | 66 · Fa dièse mineur | `Instrumental loop for a frozen tundra island with a glacier and a research station. 66 BPM, F sharp minor. Glassy synths, throat-like drones, slow timpani, ice cracking. Two layers. Seamless loop.` |
| MUS-107 | Ironhook | 112 · Si mineur | `Instrumental loop for a fortified military island with radars and a secret lab. 112 BPM, B minor. Military snare, metallic percussion, cold electronic pulses, low brass. Two layers. Seamless loop.` |

### 2.3 Systèmes et histoire
| ID | Titre | Usage | Prompt |
| --- | --- | --- | --- |
| MUS-108 | Alerte des Îles (5 couches) | marques d'alerte 1 à 5 | `Instrumental adaptive pursuit music in five stackable layers for an open-world alert system: police pulse, helicopter rhythm, tactical drums, military brass, cold agency electronics. 118 BPM, E minor. Each layer loops on top of the previous.` |
| MUS-109 | Alerte perdue | sortie de la zone de recherche | `Instrumental 20-second cue: tension released, drums fade, a soft marimba island motif returns. 90 BPM, G minor.` |
| MUS-110 | Augustin Hale | leitmotif | `Instrumental 90-second leitmotif for an old reclusive billionaire who imitates alien hunters. 60 BPM, B flat minor. Out-of-tune grand piano, music-box melody, slow strings, a twisted version of a four-note hunting motif. Obsessed, elegant, sick.` |
| MUS-111 | Halcyon Cay | infiltration du manoir | `Instrumental stealth loop inside a decaying luxury mansion full of hunting trophies. 84 BPM, C minor. Harpsichord, low strings, ticking clocks, muffled jazz record far away. Seamless loop.` |
| MUS-112 | La chasse de Hale | combat final sur le glacier | `Instrumental final boss fight on a glacier against an old man in powered armour wielding a stolen alien weapon. 126 BPM, D minor. Three sections: hunter, armour broken, old man alone. Heavy drums, brass, piano leitmotif, wind.` |
| MUS-113 | Siège d'Ironhook | raid en coop | `Instrumental four-player raid on a military island lab. 130 BPM, B minor. Driving drums, brass, electronic agency motif, clan motif on full orchestra at the climax. Four sections.` |

### 2.4 Chasse inversée
| ID | Titre | Usage | Prompt |
| --- | --- | --- | --- |
| MUS-114 | Chasse inversée, humains | côté humains | `Instrumental survival horror loop for armed humans hunted by an invisible alien on an island. 100 BPM, A minor. Heartbeat bass, nervous strings, metallic clicks getting closer, breathing textures. Seamless loop.` |
| MUS-115 | Chasse inversée, Yautja | côté Yautja | `Instrumental predator loop for an alien hunter stalking a team of armed humans. 92 BPM, D minor. Slow tribal drums, deep brass, clicking percussion, clan motif. Patient, dominant. Seamless loop.` |
| MUS-116 | L'extraction arrive | 3 dernières minutes | `Instrumental countdown cue for humans racing to an escape vehicle. 128 BPM, E minor. Rising strings, engine roar, ticking percussion, brass hits.` |
| MUS-117 | Victoire / défaite | fin de partie (4 versions : humains gagnent ou perdent, Yautja gagne ou perd) | `Instrumental 15-second stingers, four versions: human escape, human defeat, hunter victory, hunter defeat. Built on the island motif and the clan motif.` |

### 2.5 Saisons
| ID | Saison | Prompt |
| --- | --- | --- |
| MUS-118 | L'ouragan | `Instrumental loop for an island hit by a hurricane: storm wind, rain, heavy drums, frantic strings, island motif in minor. 110 BPM.` |
| MUS-119 | L'éruption | `Instrumental loop for a volcanic eruption over an archipelago: rumbling drones, falling ash textures, choir, brass. 74 BPM.` |
| MUS-120 | Le marché noir | `Instrumental loop for an illegal arms fair in a desert mining town: twangy guitar, bass, tense percussion, crowd murmur. 98 BPM.` |
| MUS-121 | L'été polaire | `Instrumental loop for melting ice and hungry polar bears: dripping water, glassy synths, low strings, slow drums. 72 BPM.` |
| MUS-122 | La mutinerie | `Instrumental loop for a prison riot spilling into a port city: alarms, urban drums, distorted bass, sirens. 112 BPM.` |
| MUS-123 | L'invasion | `Instrumental horror loop for an alien hive escaping a military lab on an island: organic textures, metallic percussion, brass clusters. 108 BPM.` |

**Total : 29 pistes (MUS-95 → MUS-123)**, plus 5 pistes de l'extension (MUS-124 → MUS-128, prompts dans [Métropole, transports, zone de quarantaine](ISLES_EXTENSION_METROPOLE_QUARANTAINE_20261122.md), section 13.1). Dossier proposé : `public/audio/music/isles/`.

---

## 3. Ambiances sonores

| ID | Lieu | Jour | Nuit |
| --- | --- | --- | --- |
| I-AMB-01 | Verdant | jungle, rivière, chutes | insectes, jaguar |
| I-AMB-02 | Autel | vent dans les pierres, oiseaux | feu rituel |
| I-AMB-03 | The Shallows | ressac, mangrove, mouettes | eau, moteurs au loin |
| I-AMB-04 | Tallgrass | vent, troupeaux, oiseaux | lions, hyènes |
| I-AMB-05 | Saltmarsh | grenouilles, hydroglisseurs | insectes, torchère |
| I-AMB-06 | Redmesa | vent sec, coyotes | silence, train |
| I-AMB-07 | Dustwater | rue, saloon, train de minerai | musique du saloon, chiens |
| I-AMB-08 | Calder, centre | foule, circulation, klaxons | sirènes, musique des clubs |
| I-AMB-09 | Calder, port | grues, mouettes, cornes | moteurs, gangs |
| I-AMB-10 | Calder, banlieue | tondeuses, enfants, chiens | télévisions, voitures |
| I-AMB-11 | Calder, toits | vent, climatiseurs | vent, ville en dessous |
| I-AMB-12 | Ember | grondement, vapeur | lave, grondement |
| I-AMB-13 | Hollowpine | forêt, lac, téléphérique | chouettes, loups |
| I-AMB-14 | Frost Isle | vent, glace | blizzard, station |
| I-AMB-15 | Ironhook | sirènes, avions, radars | projecteurs, patrouilles |
| I-AMB-16 | Blackrock | cour de prison, haut-parleurs | cellules, gardes |
| I-AMB-17 | Halcyon Cay | mer, fontaines, gramophone | silence, horloges |
| I-AMB-18 | Épave du *Meridian* | coque qui grince | eau qui goutte |
| I-AMB-19 | Plateforme Sable-7 | machines, vagues | tempête |
| I-AMB-20 | Intérieur d'un repaire | calme, eau, clics | calme |

Variantes météo : pluie, orage, brouillard, tempête de sable, blizzard, ouragan (saison).

---

## 4. Effets sonores

| ID | Son |
| --- | --- |
| I-SFX-01 | pas du Yautja par sol (herbe, boue, sable, roche, métal, toit, neige, eau) |
| I-SFX-02 | saut, atterrissage, escalade, grappin (tir, accroche, enroulement) |
| I-SFX-03 | monter sur un véhicule en marche |
| I-SFX-04 | marques d'alerte (gain, perte, zone de recherche), une par niveau |
| I-SFX-05 | sirènes de police par niveau, hélicoptère, barrage |
| I-SFX-06 | cordon ARGOS (bouée sonar, ping), sabotage |
| I-SFX-07 | repaire (ouverture, sauvegarde, vaisseau qui arrive) |
| I-SFX-08 | autel (contrat gravé, contrat accepté) |
| I-SFX-09 | trophée tombé, trophée repris |
| I-SFX-10 | humains : voix de foule, cris, klaxons, portes, chiens |
| I-SFX-11 | véhicules : 15 moteurs (section 13) |
| I-SFX-12 | armes humaines : environ 15 |
| I-SFX-13 | Chasse inversée : pièce trouvée, radio d'extraction, extraction qui arrive, humain à terre, relève, reddition (arme jetée), duel accepté |
| I-SFX-14 | Chasse inversée : cœur et respiration des humains quand le Yautja est proche |
| I-SFX-15 | éruption, coulée, chute de cendres |
| I-SFX-16 | ouragan, inondation, pont qui cède |
| I-SFX-17 | téléphérique, train, ferry |
| I-SFX-18 | mutinerie, alarme de prison |

Les effets de la boucle Terre (scan, marques, dissolvant, témoins, voix enregistrée…) se **réutilisent** (T-SFX).

---

## 5. Voix

| ID | Contenu | Nombre *(proposé)* |
| --- | --- | --- |
| I-VO-01 | civils de Calder et Dustwater (bavardage, peur, appel à la police) | 200 |
| I-VO-02 | police (radio, ordres, par niveau d'alerte) | 120 |
| I-VO-03 | gangs (Docks, Hauteurs) | 120 |
| I-VO-04 | braconniers, chasseurs, trafiquants, milice, sécurité privée | 200 |
| I-VO-05 | militaires et ARGOS d'Ironhook | 120 |
| I-VO-06 | radio publique de l'archipel (infos, météo, faits divers selon les actions du joueur) | 60 |
| I-VO-07 | arc Hale (Hale, sa garde, le guide, le shérif, l'archéologue) | 250 |
| I-VO-08 | Chasse inversée : répliques des 6 rôles humains (pièce trouvée, Yautja repéré, à terre, relève, reddition, victoire) | 6 × 40 |
| I-VO-09 | annonces de saison | 6 × 10 |

---

## 6. Personnages nommés

| ID | Nom | Île | Rôle |
| --- | --- | --- | --- |
| I-PNJ-01 | **Augustin Hale** | Halcyon Cay | antagoniste de l'arc ; vieil homme, costume clair, canne, puis armure motorisée |
| I-PNJ-02 | Hale jeune (1990) et Hale à 50 ans (1997) | archives | images et enregistrements |
| I-PNJ-03 | **Capitaine Rhea Kost** | Halcyon Cay | cheffe de la garde d'élite de Hale |
| I-PNJ-04 | **Garrett Vance** | Hollowpine | guide légendaire engagé par Hale (étape 3) |
| I-PNJ-05 | **Shérif Lena Ortiz** | Dustwater | honnête, armée ; proie digne ou candidate au don |
| I-PNJ-06 | **« Le Comptable » (Silas Moreau)** | Dustwater | trafiquant qui vend l'arme yautja à Hale (étape 5) |
| I-PNJ-07 | **Dre Naledi Mokoena** | Verdant | archéologue de l'autel (non-combattante) ; ses notes racontent la chasse ancienne |
| I-PNJ-08 | **Rook** | Calder (Docks) | chef de gang des Docks |
| I-PNJ-09 | **Vale** | Calder (Hauteurs) | cheffe de gang des Hauteurs |
| I-PNJ-10 | **Commissaire Barnes** | Calder | chef de la police ; son attitude change avec les alertes |
| I-PNJ-11 | **Major Iwan Petrov** | Ironhook | commandant de la base |
| I-PNJ-12 | **Dr Yusuf Haddad** | Ironhook | chef du labo ARGOS des Îles |
| I-PNJ-13 | **Old Tom** | le phare | gardien du phare ; témoin récurrent, non-combattant |
| I-PNJ-14 | **Directrice Amalia Reyes** | Blackrock | directrice de la prison |
| I-PNJ-15 | **Kazimir « Kaz » Lenk** | Blackrock | meneur de la mutinerie (saison 5) |
| I-PNJ-16 | **Thar-Kesh** | partout | Yautja renégat ; Bad Blood en IA |
| I-PNJ-17 | **Sœur-de-Pierre** | autel | vieille Yautja gardienne de l'autel, donne les contrats (non combattante) |

### 6.1 Légendaires
| ID | Nom | Île | Espèce ou humain | Condition d'apparition |
| --- | --- | --- | --- | --- |
| I-PNJ-21 | Roi-de-Verdant | Verdant | jaguar géant | nuit sans lune, alerte 0 |
| I-PNJ-22 | La Faucheuse des Passes | Shallows | crocodile marin | marée haute de nuit |
| I-PNJ-23 | Hale's Pride | Tallgrass | lion né dans les enclos de Hale | près du lodge, au crépuscule |
| I-PNJ-24 | Mère-Bayou | Saltmarsh | alligatrice géante | brouillard du matin |
| I-PNJ-25 | Le Fantôme rouge | Redmesa | puma albinos | tempête de sable |
| I-PNJ-26 | Le Gardien du barrage | Hollowpine | ours brun | après la pluie |
| I-PNJ-27 | Blanc-Silence | Frost Isle | ours polaire | blizzard |
| I-PNJ-28 | Le Boucher de Calder | Calder | tueur en série armé, recherché par la police *(proposé)* | nuit, après 3 crimes signalés à la radio |
| I-PNJ-29 | Le Caporal | Ironhook | soldat d'élite décoré | après le siège |

---

## 7. Humains génériques

Modèles isométriques à 8 directions. Animations : repos, marche, course, visée, tir, rechargement, appel radio, lampe, conduite, panique, fuite, à terre, reddition, mort.

| ID | Archétype | Où | Variantes |
| --- | --- | --- | --- |
| I-CHR-01 | civil | Calder, Dustwater, villages | 16 (âges, tenues, métiers) |
| I-CHR-02 | touriste | plage de Calder, Shallows | 4 |
| I-CHR-03 | ouvrier, docker, mineur, bûcheron | port, mines, Hollowpine | 6 |
| I-CHR-04 | scientifique, archéologue | Ember, Verdant, Frost | 3 |
| I-CHR-05 | policier | Calder, routes | 3 |
| I-CHR-06 | unité tactique | alerte 3 | 2 |
| I-CHR-07 | shérif, adjoint | Dustwater | 2 |
| I-CHR-08 | gang des Docks | Calder | 4 |
| I-CHR-09 | gang des Hauteurs | Calder | 4 |
| I-CHR-10 | braconnier | Verdant, Tallgrass | 3 |
| I-CHR-11 | chasseur, guide | Tallgrass, Hollowpine, Frost | 3 |
| I-CHR-12 | trafiquant, contrebandier | Shallows, Saltmarsh, Redmesa | 4 |
| I-CHR-13 | milice de la mine | Redmesa | 3 |
| I-CHR-14 | sécurité privée | tours, Halcyon Cay, station polaire | 3 |
| I-CHR-15 | garde d'élite de Hale | Halcyon Cay | 2 |
| I-CHR-16 | soldat | Ironhook | 3 |
| I-CHR-17 | ARGOS (opérateur, tireur, lourd) | Ironhook, alerte 5 | 3 |
| I-CHR-18 | gardien de prison, prisonnier | Blackrock | 2 + 3 |
| I-CHR-19 | rôles de Chasse inversée | — | 6 rôles × 4 tenues (section 20) |

---

## 8. Faune

| ID | Espèce | Île |
| --- | --- | --- |
| I-CHR-30 | jaguar | Verdant |
| I-CHR-31 | crocodile, anaconda, sanglier | Verdant |
| I-CHR-32 | crocodile marin, requin, raie | Shallows |
| I-CHR-33 | lion (+ lionne), buffle, hyène, guépard | Tallgrass |
| I-CHR-34 | alligator, python, panthère | Saltmarsh |
| I-CHR-35 | puma, coyote, serpent | Redmesa |
| I-CHR-36 | ours brun, loup, élan | Hollowpine |
| I-CHR-37 | ours polaire, loup arctique, morse | Frost Isle |
| I-CHR-38 | oiseaux (par île), chiens errants, chats | partout |
| I-CHR-39 | zèbres, antilopes, girafes (ex-Halcyon) | Tallgrass (troupeaux d'alerte) |
| I-CHR-40 | chiens de police, chiens de garde | Calder, Ironhook, Halcyon Cay |

Animations : repos, marche, course, attaque, charge, nage (selon l'espèce), fuite, mort, carcasse. 8 directions.

---

## 9. Le Yautja en isométrique : actions et animations

Tout le personnage est à refaire en isométrique (8 directions), à partir de l'apparence de la campagne (pièces, couleurs, masque).

| ID | Action | Détail |
| --- | --- | --- |
| I-ANI-01 | repos, marche, course, sprint | 8 directions |
| I-ANI-02 | saut, double appui sur mur, atterrissage | traversée des toits |
| I-ANI-03 | escalade (mur, falaise, arbre) | — |
| I-ANI-04 | grappin | traverser une rue, monter à un toit |
| I-ANI-05 | nage, plongée | révèle le camouflage |
| I-ANI-06 | monter sur un véhicule en marche, s'accroupir dessus | camouflé |
| I-ANI-07 | camouflage (activer, couper, étincelles) | — |
| I-ANI-08 | armes : lames, combistick, disque, plasma, filet, lance | — |
| I-ANI-09 | mêlée, enchaînements, mise à mort | — |
| I-ANI-10 | attaque furtive par derrière, du dessus | — |
| I-ANI-11 | actions de la boucle Terre : scan, lire une trace, écouter, voix, détruire un appareil, assommer, traîner, cacher, dissoudre, trophée, épargner, don | reprises de T-ANI, en isométrique |
| I-ANI-12 | soins (medicomp) | — |
| I-ANI-13 | autodestruction | Chasse inversée |
| I-ANI-14 | rugissement, clics, gestes (salut, défi) | émotes en ligne |
| I-ANI-15 | duel sans masque | Chasse inversée et arc Hale |
| I-ANI-16 | sabotage (bouée, radar, relais) | ouverture des îles |
| I-ANI-17 | dépôt de trophée au repaire | — |

---

## 10. IA

| ID | Comportement | Détail |
| --- | --- | --- |
| I-IA-01 | **peuplement** | densité par type de zone et par heure (section 9 du mode) ; apparition hors champ, disparition loin du joueur |
| I-IA-02 | **trafic** | voitures et camions sur les routes, ferries à heure fixe, train de minerai, téléphérique |
| I-IA-03 | **routines civiles** | aller au travail, faire les courses, rentrer, dormir ; fuir et appeler la police |
| I-IA-04 | **police** | patrouilles ; réponse par niveau d'alerte ; barrages ; hélicoptère ; zone de recherche |
| I-IA-05 | **unité tactique, armée, ARGOS** | escalade de l'alerte 3 à 5 |
| I-IA-06 | **gangs** | territoires ; guerre Docks / Hauteurs ; réagissent aux attaques du joueur contre l'autre gang |
| I-IA-07 | **braconniers, chasseurs, trafiquants** | camps, convois, horaires, pistage du joueur |
| I-IA-08 | **sécurité privée** | rondes, caméras, alarme |
| I-IA-09 | **garde de Hale** | élite, coordonnée, connaît le camouflage |
| I-IA-10 | **faune** | territoires, points d'eau, troupeaux, chasse, horaires |
| I-IA-11 | **légendaires** | conditions d'apparition, comportement propre |
| I-IA-12 | **Yautja IA** (solo) | d'autres chasseurs du terrain commun : chassent, ne gênent pas le joueur, peuvent voler une proie |
| I-IA-13 | **Bad Blood IA** (Thar-Kesh) | tue sans le code ; attaque le joueur |
| I-IA-14 | **humains de Chasse inversée en IA** | remplacent les joueurs absents : chercher les pièces, se regrouper, relever |
| I-IA-15 | **Yautja de Chasse inversée en IA** | mode entraînement côté humain |
| I-IA-16 | **événements de monde** | ouragan, éruption, mutinerie : évacuations, routes coupées |

---

## 11. Zones : les îles, quartier par quartier

Chaque **lieu** est une zone de peuplement (type, densité, faction, horaires). Taille indicative en tuiles.

### Verdant
| Lieu | Type | Contenu |
| --- | --- | --- |
| Autel yautja | sacré | pyramide en ruine, hub des joueurs, Sœur-de-Pierre |
| Le fleuve et les chutes | nature | hydravion (Chasse inversée), crocodiles |
| Camp des braconniers | camp | radio, cages, véhicules |
| Fouilles archéologiques | camp civil | Dre Mokoena, gardes |
| Village côtier | village | pêcheurs, quai |
| Piste cachée | trafic | avion, caisses |
| Canopée | nature | 3 niveaux de hauteur |
| Repaire | grotte derrière les chutes | — |

### The Shallows
| Lieu | Type | Contenu |
| --- | --- | --- |
| Îlots de mangrove | nature | passages à marée basse |
| Ponton des trafiquants | camp | bateaux rapides |
| Épave du *Meridian* | îlot | intérieur, armes |
| Phare | îlot | Old Tom |
| Passes à requins | nature | — |
| Repaire | cale du *Meridian* | — |

### Tallgrass
| Lieu | Type | Contenu |
| --- | --- | --- |
| Lodge de Halcyon | ruine | archives de Hale |
| Enclos détruits | ruine | traces de la réserve |
| Ranch | village | chasseurs |
| Point d'eau | nature | troupeaux, lions |
| Aérodrome de brousse | trafic | avion (Chasse inversée) |
| Repaire | château d'eau du lodge | — |

### Saltmarsh
| Lieu | Type | Contenu |
| --- | --- | --- |
| Bayous | nature | alligators, hydroglisseurs |
| Village sur pilotis | village | chasseurs d'alligators |
| Cabane de chasse | camp | — |
| Raffinerie abandonnée | industriel | torchère, contrebandiers |
| Repaire | réservoir de la raffinerie | — |

### Redmesa et Dustwater
| Lieu | Type | Contenu |
| --- | --- | --- |
| **Dustwater** : rue principale | petite ville | saloon, bureau du shérif, banque, magasin |
| Dustwater : cité ouvrière | petite ville | maisons de mineurs |
| Dustwater : gare de minerai | industriel | train (Chasse inversée) |
| Mine à ciel ouvert | industriel | milice |
| Canyons, mesa du Chef | nature | antenne, pumas |
| Ville fantôme | ruine | trafiquants |
| Motel de la route | village | — |
| Repaire | grotte de la mesa | — |

### Calder
| Lieu | Type | Densité |
| --- | --- | --- |
| Centre d'affaires, tour Hale | urbain dense | très forte |
| Marché, vieille ville | urbain | forte |
| Port et docks (gang des Docks) | industriel | forte |
| Les Hauteurs (gang des Hauteurs) | urbain populaire | forte |
| Banlieue pavillonnaire | banlieue | moyenne |
| Zones commerciales | banlieue | moyenne |
| Aéroport | trafic | forte, sécurité |
| Stade | urbain | forte les jours de match |
| Plage | loisir | forte le jour |
| Friches | friche | faible |
| Toits | — | aucun humain sauf événements |
| Repaire | toit d'un château d'eau des Hauteurs (pas de vaisseau) | — |

### Ember
| Lieu | Type | Contenu |
| --- | --- | --- |
| Cratère | nature | sommet, vue de l'archipel |
| Coulées et grottes de lave | nature | — |
| Sources chaudes | nature | — |
| Observatoire sismique, radar | civil, ARGOS | sabotage (étape 6) |
| Repaire | grotte de lave | — |

### Hollowpine
| Lieu | Type | Contenu |
| --- | --- | --- |
| Lac et barrage | industriel | — |
| Scierie | industriel | bûcherons armés |
| Chalets | village | chasseurs |
| Téléphérique (deux gares) | trafic | Chasse inversée |
| Grottes | nature | ours |
| Repaire | salle des machines du barrage | — |

### Frost Isle
| Lieu | Type | Contenu |
| --- | --- | --- |
| Station polaire | civil, sécurité | avion (Chasse inversée) |
| Glacier et crevasses | nature | combat final de Hale |
| Baleinière échouée | ruine | — |
| Repaire | sous la baleinière | — |

### Ironhook
| Lieu | Type | Contenu |
| --- | --- | --- |
| Digue | militaire | entrée unique à pied |
| Base, casernes | militaire | — |
| Chantier naval | industriel | — |
| Piste d'aviation | militaire | — |
| Laboratoire ARGOS | ARGOS | siège |
| (pas de repaire) | — | — |

### Îlots
| Îlot | Lieux |
| --- | --- |
| Blackrock | cour, cellules, mirador, quai |
| Halcyon Cay | quai, jardins, manoir (3 étages), salle des trophées de Hale, sous-sol |
| Plateforme Sable-7 | pont, torchère, logements |

---

## 12. Bâtiments

En volumes de tuiles, avec intérieurs en coupe quand ils sont jouables.

| ID | Bâtiment | Où | Intérieur |
| --- | --- | --- | --- |
| I-BLD-01 | tours de bureaux (3 modèles), tour Hale | Calder | hall et toit |
| I-BLD-02 | immeubles (4 modèles) | Calder | quelques-uns |
| I-BLD-03 | maisons pavillonnaires (6 modèles) | Calder | quelques-unes |
| I-BLD-04 | commerces, marché, stade | Calder | partiel |
| I-BLD-05 | entrepôts, grues, conteneurs | port | entrepôts |
| I-BLD-06 | commissariat | Calder | oui |
| I-BLD-07 | aéroport (terminal, hangar) | Calder | hangar |
| I-BLD-08 | bâtiments de Dustwater : saloon, shérif, banque, gare, maisons | Redmesa | oui |
| I-BLD-09 | mine (bâtiments, convoyeurs) | Redmesa | partiel |
| I-BLD-10 | motel, ville fantôme | Redmesa | oui |
| I-BLD-11 | lodge de Halcyon, enclos | Tallgrass | oui |
| I-BLD-12 | ranch | Tallgrass | oui |
| I-BLD-13 | village sur pilotis, cabane | Saltmarsh | oui |
| I-BLD-14 | raffinerie | Saltmarsh | partiel |
| I-BLD-15 | pyramide de l'autel, ruines | Verdant | oui |
| I-BLD-16 | camp de fouilles, camp de braconniers | Verdant | non |
| I-BLD-17 | village côtier | Verdant | partiel |
| I-BLD-18 | scierie, chalets, barrage, gares du téléphérique | Hollowpine | oui |
| I-BLD-19 | observatoire sismique | Ember | oui |
| I-BLD-20 | station polaire | Frost Isle | oui |
| I-BLD-21 | base militaire, casernes, labo ARGOS | Ironhook | oui |
| I-BLD-22 | prison | Blackrock | oui |
| I-BLD-23 | manoir de Hale | Halcyon Cay | 3 étages et sous-sol |
| I-BLD-24 | phare | îlot | oui |
| I-BLD-25 | plateforme pétrolière | Sable-7 | oui |
| I-BLD-26 | ponts (4 modèles), digue | liaisons | non |
| I-BLD-27 | repaires (10, un par île sauf Ironhook) | îles | oui |

---

## 13. Véhicules

| ID | Véhicule | Où |
| --- | --- | --- |
| I-VEH-01 | voitures (4 modèles) | Calder, routes |
| I-VEH-02 | voiture de police, fourgon tactique | Calder |
| I-VEH-03 | bus, camion | Calder, routes |
| I-VEH-04 | scooter | Calder |
| I-VEH-05 | 4×4, pick-up | îles |
| I-VEH-06 | quad | Tallgrass, Redmesa |
| I-VEH-07 | camion de mine, train de minerai | Redmesa |
| I-VEH-08 | hydroglisseur | Saltmarsh |
| I-VEH-09 | bateau rapide, vedette | Shallows, port |
| I-VEH-10 | ferry | liaisons |
| I-VEH-11 | hydravion, avion de brousse | Verdant, Tallgrass, Frost |
| I-VEH-12 | hélicoptère de police, militaire | alertes 2 et 4 |
| I-VEH-13 | blindé | Ironhook, alerte 4 |
| I-VEH-14 | motoneige | Frost Isle |
| I-VEH-15 | cabine de téléphérique | Hollowpine |

Le Yautja ne conduit pas : il monte dessus, les arrête, les détruit.

---

## 14. Props

| ID | Prop | Où |
| --- | --- | --- |
| I-PRP-01 | mobilier urbain (lampadaires, bancs, feux, poubelles, panneaux) | Calder, Dustwater |
| I-PRP-02 | toits (climatiseurs, antennes, châteaux d'eau, verrières) | Calder |
| I-PRP-03 | caméras de surveillance | Calder, Ironhook, Halcyon Cay |
| I-PRP-04 | conteneurs, palettes, grues | port |
| I-PRP-05 | camps (tentes, feux, caisses, radios, générateurs) | îles |
| I-PRP-06 | pièges humains | camps |
| I-PRP-07 | bouées sonar du cordon, relais, radar | liaisons, Ember, Calder |
| I-PRP-08 | pièces de sortie de Chasse inversée (radio, batterie, fusées, clés, carburant, carte, hélice, aiguillage, badge, balise) | 7 cartes |
| I-PRP-09 | fragments gravés de l'autel (collection) | toutes les îles |
| I-PRP-10 | trophées exposés dans les repaires | repaires |
| I-PRP-11 | objets de Hale (trophées humains, armes anciennes, archives, gramophone, portrait) | Halcyon Cay, lodge |
| I-PRP-12 | arme yautja volée (montée sur l'armure de Hale) | arc Hale |
| I-PRP-13 | équipement ARGOS | Ironhook, alerte 5 |
| I-PRP-14 | végétation : palmiers, fougères, mangroves, herbes hautes, cactus, pins, mélèzes, buissons (par biome) | îles |
| I-PRP-15 | rochers, falaises, troncs, souches | îles |
| I-PRP-16 | objets de plage (parasols, cabanes, bateaux échoués) | Calder, Shallows |
| I-PRP-17 | objets de saison (sacs de sable, débris d'ouragan, cendres, stands du marché noir) | saisons |

---

## 15. Tuiles et textures

Environ **40 tuiles par biome**, avec variantes de bordure et de hauteur.

| ID | Biome | Tuiles principales |
| --- | --- | --- |
| I-TIL-01 | jungle | sol de forêt, racines, boue, rivière, chutes, pierre de l'autel |
| I-TIL-02 | mangrove et récif | vase, racines, sable, récif, eau peu profonde |
| I-TIL-03 | savane | herbe haute, herbe rase, terre rouge, point d'eau |
| I-TIL-04 | marais | eau de bayou, boue, carex, planches |
| I-TIL-05 | désert | sable rouge, roche, falaise, piste |
| I-TIL-06 | petite ville | terre battue, trottoir de bois, voie ferrée |
| I-TIL-07 | ville | asphalte, trottoir, pavés, quai, toit plat, toit en pente, herbe de parc, sable de plage |
| I-TIL-08 | volcan | basalte, lave (animée), cendres, soufre |
| I-TIL-09 | forêt de montagne | sol d'aiguilles, roche, neige légère, lac |
| I-TIL-10 | toundra | neige, glace, crevasse, permafrost, roche gelée |
| I-TIL-11 | militaire | béton, piste, clôture, sable de digue |
| I-TIL-12 | océan | eau profonde, vagues, écume (animée) |

Textures des volumes : façades par style (affaires, populaire, pavillon, western, industriel, militaire, ruine ancienne, manoir), toits, roches, écorces.

---

## 16. Effets visuels

| ID | Effet |
| --- | --- |
| I-VFX-01 | camouflage en isométrique, avec contour fin pour le joueur |
| I-VFX-02 | modes du biomask (recoloration de toute la scène) |
| I-VFX-03 | cycle jour et nuit, lumières de la ville, phares, lampes |
| I-VFX-04 | pluie, orage, brouillard, tempête de sable, blizzard, ouragan |
| I-VFX-05 | lave, panache du volcan, éruption |
| I-VFX-06 | marée qui monte |
| I-VFX-07 | zone de recherche (cercle sur la carte et au sol) |
| I-VFX-08 | projecteur d'hélicoptère |
| I-VFX-09 | transparence et coupe des obstacles |
| I-VFX-10 | faisceau du vaisseau aux repaires |
| I-VFX-11 | cône de vision et brouillard (Chasse inversée, côté humain) |
| I-VFX-12 | fusées éclairantes, explosions, autodestruction |

---

## 17. Histoire et scènes

| ID | Scène | Moment | Durée |
| --- | --- | --- | --- |
| I-SC-01 | **Arrivée aux Îles** : le vaisseau survole l'archipel, le volcan, puis se pose à l'autel ; Sœur-de-Pierre accueille le joueur | première partie | 1:30 |
| I-SC-02 | Le cordon : une bouée sonar repère le vaisseau, qui fait demi-tour | première tentative vers une île fermée | 0:20 |
| I-SC-03 | Les archives du lodge : images de Hale en 1997, avec un Yautja à l'écran | étape 2 | 0:40 |
| I-SC-04 | Le guide Vance accepte le contrat de Hale | étape 3 | 0:30 |
| I-SC-05 | La tour Hale : l'appartement vide, la vitrine d'armes anciennes | étape 4 | 0:30 |
| I-SC-06 | Le marché de Dustwater : Hale achète l'arme | étape 5 | 0:40 |
| I-SC-07 | Le radar tombe ; un émissaire de Hale paie ARGOS | étape 6 | 0:30 |
| I-SC-08 | **La salle des trophées de Hale** : il parle au joueur par haut-parleur, puis fuit | étape 7 | 1:00 |
| I-SC-09 | **La chasse de Hale** : Hale en armure sur le glacier | étape 8 | 0:40 |
| I-SC-10 | Les 3 fins (achever, froid, ARGOS) | fin de l'arc | 3 × 0:40 |
| I-SC-11 | L'arme rendue à l'autel | après la fin | 0:30 |
| I-SC-12 | Le siège d'Ironhook : briefing des 4 Yautja | siège | 0:30 |
| I-SC-13 | Ouverture de chaque saison (6) | début de saison | 6 × 0:30 |

**Fil narratif :** l'archipel est un terrain commun des clans ; un humain, Hale, a passé sa vie à les imiter. En remontant sa piste, le joueur découvre qu'il a acheté le cordon, volé une arme yautja et préparé une chasse au Yautja. La fin dit ce que le joueur pense du code : achever un vieil homme désarmé, le laisser au froid, ou le livrer aux siens.

---

## 18. Missions principales : arc Hale

| ID | Étape | Île | Objectifs | Récompense |
| --- | --- | --- | --- | --- |
| I-MP-01 | L'appât | Verdant | repérer les braconniers aux armes trop modernes ; lire 3 traces ; tuer leur chef ; trouver le contrat de Hale | réputation, entrée de codex |
| I-MP-02 | Les enclos | Tallgrass | entrer au lodge ; lire les archives ; éviter les chasseurs ; Hale's Pride en option | archives de Hale |
| I-MP-03 | Le guide | Hollowpine | Vance piste le joueur ; le vaincre (duel possible) ou l'épargner (don possible) | trophée ou Honoré |
| I-MP-04 | L'argent | Calder | monter la tour Hale par les toits ; aucun civil touché ; trouver les comptes | ouvre Dustwater |
| I-MP-05 | Le marché | Dustwater | infiltrer la vente ; tuer Silas Moreau ; l'arme est déjà partie | piste de l'arme |
| I-MP-06 | Le cordon | Ember | saboter le radar ; écouter la radio (Hale paie ARGOS) | ouverture de Frost Isle |
| I-MP-07 | La salle | Halcyon Cay | infiltrer le manoir ; vaincre la garde de Kost ; voir la salle des trophées | Kost en trophée |
| I-MP-08 | La chasse de Hale | Frost Isle | combat en 3 phases ; choix final | arme yautja, masque de Hale |

---

## 19. Missions et activités annexes

### 19.1 Annexes par île (3 par île)
| ID | Île | Annexe |
| --- | --- | --- |
| I-AN-01 | Verdant | **Les cages** : libérer les animaux d'un camp de braconniers |
| I-AN-02 | Verdant | **L'archéologue** : protéger Dre Mokoena d'un pilleur armé sans qu'elle voie le joueur |
| I-AN-03 | Verdant | **La piste** : détruire l'avion des trafiquants avant le décollage |
| I-AN-04 | Shallows | **Le *Meridian*** : nettoyer l'épave d'un gang |
| I-AN-05 | Shallows | **Les requins** : traverser les passes de nuit |
| I-AN-06 | Shallows | **Le gardien** : Old Tom a vu quelque chose ; détruire sa photo sans le blesser |
| I-AN-07 | Tallgrass | **Les zèbres** : arrêter une chasse illégale de troupeaux |
| I-AN-08 | Tallgrass | **Le ranch** : défier les chasseurs du ranch un par un |
| I-AN-09 | Tallgrass | **L'aérodrome** : intercepter une livraison d'armes |
| I-AN-10 | Saltmarsh | **La torchère** : déloger les contrebandiers de la raffinerie |
| I-AN-11 | Saltmarsh | **L'hydroglisseur** : poursuivre un hydroglisseur dans les bayous |
| I-AN-12 | Saltmarsh | **Le village** : protéger le village sur pilotis d'un gang |
| I-AN-13 | Redmesa | **La milice** : vider la mine de sa milice |
| I-AN-14 | Dustwater | **Le shérif** : Lena Ortiz enquête ; l'épargner, l'honorer ou l'affronter |
| I-AN-15 | Redmesa | **Le train** : arrêter le train de minerai qui transporte des armes |
| I-AN-16 | Calder | **La guerre des gangs** : choisir un camp, ou décapiter les deux (Rook et Vale) |
| I-AN-17 | Calder | **Le Boucher** : traquer le tueur que la police ne trouve pas |
| I-AN-18 | Calder | **Le port** : un conteneur de trophées humains de Hale |
| I-AN-19 | Ember | **Les pilleurs d'obsidienne** : chasser pendant une petite éruption |
| I-AN-20 | Ember | **Le sommet** : monter au cratère (révèle les lieux de l'archipel) |
| I-AN-21 | Ember | **Les grottes** : réseau de lave et cache de pilleurs |
| I-AN-22 | Hollowpine | **La scierie** : déloger les bûcherons armés |
| I-AN-23 | Hollowpine | **Le téléphérique** : combat dans une cabine en marche |
| I-AN-24 | Hollowpine | **Le barrage** : déjouer une attaque de trafiquants |
| I-AN-25 | Frost Isle | **La station** : un chercheur a des images du joueur |
| I-AN-26 | Frost Isle | **Le blizzard** : survivre et chasser pendant un blizzard |
| I-AN-27 | Frost Isle | **La baleinière** : chasseurs de fourrure |
| I-AN-28 | Blackrock | **La prison** : entrer et sortir sans alerte ; le meneur Lenk |
| I-AN-29 | Sable-7 | **La plateforme** : trafic d'armes en pleine tempête |
| I-AN-30 | Ironhook | **Le siège** : raid en coop à 4 (5 étapes : digue, base, chantier, piste, labo) |

### 19.2 Activités répétables
| ID | Activité | Contenu |
| --- | --- | --- |
| I-AN-40 | Contrats de l'autel | 3 par jour de jeu, tirés par île et par réputation |
| I-AN-41 | Primes | 12 cibles humaines mobiles, qui reviennent avec une nouvelle tête |
| I-AN-42 | Légendaires | 9 (section 6.1) |
| I-AN-43 | Événements aléatoires | 20 : trafic attaqué, fusillade, animal en ville, accident, braconniers en action, contrôle de police, livraison de drogue, évasion de prison, incendie, noyade, chasseur en danger, convoi, poursuite, hold-up, etc. |
| I-AN-44 | Épreuves | 12 parcours chronométrés (canopée, toits de Calder, canyons, téléphérique, glacier…) |
| I-AN-45 | Fragments de l'autel | 50 fragments gravés, cachés sur toutes les îles ; à 50, la chasse ancienne est racontée entièrement |
| I-AN-46 | Repaires | 10 à découvrir et ouvrir |
| I-AN-47 | Sabotages du cordon | 3 (bouées du sud, radar d'Ember, relais de Calder) |
| I-AN-48 | Chasse de rachat | pour sortir du statut de Bad Blood des Îles |

---

## 20. Chasse inversée : tout ce qu'il faut créer

| Élément | Contenu |
| --- | --- |
| I-INV-01 Cartes | 7 cartes (Verdant, Tallgrass, Saltmarsh, Dustwater, Hollowpine, docks de Calder, Frost Isle) : zone jouable réduite d'une île, 3 positions par pièce, 1 extraction, 2 entrées humaines |
| I-INV-02 Rôles | 6 rôles × modèle, arme, capacité, 4 tenues : Pisteur, Tireur, Démolisseur, Médecin, Radio, Garde de la réserve |
| I-INV-03 Armes humaines | fusil de chasse, fusil à lunette, fusil à pompe, pistolet, fusil d'assaut, carabine ; pièges (mine, fil, filet) ; fusées |
| I-INV-04 Vision | cône de vision et brouillard par joueur humain |
| I-INV-05 Voix | voix de proximité (20 m, étouffée par les murs), radio du rôle Radio, talkies ramassables, écoute du Yautja |
| I-INV-06 Règles | reddition, à terre et relève, trophée, duel final, autodestruction, victoires |
| I-INV-07 Interface humaine | santé, munitions, pièces, chrono, équipe, alerte « distorsion repérée », radio |
| I-INV-08 Interface Yautja | humains repérés, honneur de la partie, chrono |
| I-INV-09 Matchmaking | files séparées, 5 humains par défaut, parties privées 4 à 6 |
| I-INV-10 Progression | niveau de chasseur, niveau de survivant, cosmétiques |
| I-INV-11 Entraînement | contre IA (I-IA-14, I-IA-15) |
| I-INV-12 Musique et sons | MUS-114 → MUS-117, I-SFX-13 et 14, I-VO-08 |

---

## 21. Saisons

| ID | Saison | Carte changée | Nouveaux légendaires | Contrats | Variante de Chasse inversée |
| --- | --- | --- | --- | --- | --- |
| I-SAI-01 | L'ouragan | inondations à Saltmarsh, ponts coupés, ferries arrêtés | Mère-Bayou enragée ; un requin dans les rues inondées | 10 | Saltmarsh inondé |
| I-SAI-02 | L'éruption | nouvelles coulées, villages d'Ember évacués, cendres | une bête des cendres (puma noirci) ; un pilleur de l'éruption | 10 | carte d'Ember sous la cendre |
| I-SAI-03 | Le marché noir | foire aux armes à Dustwater | 2 marchands d'armes du monde entier | 10 | Dustwater de nuit |
| I-SAI-04 | L'été polaire | glace fondue, passages nouveaux à Frost Isle | ours polaire affamé ; un chasseur de trophées polaires | 10 | Frost Isle en été |
| I-SAI-05 | La mutinerie | Blackrock soulevée, prisonniers armés sur Calder | Kaz Lenk ; le chef des gardiens corrompu | 10 | Blackrock |
| I-SAI-06 | L'invasion | ruche Xénomorphe sur Ironhook | jeune reine ; Xénomorphe né d'un lion de Hale | 10 | humains contre Yautja **et** Xénomorphes |

Chaque saison : 1 thème musical (MUS-118 → MUS-123), 1 scène d'ouverture (I-SC-13), cosmétiques, classement.

---

## 22. Interface

| ID | Élément |
| --- | --- |
| I-UI-01 | carte de l'archipel (îles, lieux découverts, repaires, activités, zone de recherche) |
| I-UI-02 | mini-carte isométrique |
| I-UI-03 | marques d'alerte (5 glyphes) |
| I-UI-04 | autel : contrats du jour, primes, légendaires |
| I-UI-05 | repaire : sauvegarde, équipement, salle des trophées, voyage rapide |
| I-UI-06 | réputation des Îles (1 à 10) et récompenses |
| I-UI-07 | groupe de chasse (jusqu'à 4) |
| I-UI-08 | session en ligne (joueurs, invitations, modes) |
| I-UI-09 | Chasse inversée (sélection du camp, rôles, fin de partie) |
| I-UI-10 | saison (calendrier, défis, classement) |
| I-UI-11 | journal de l'arc Hale |
| I-UI-12 | collection des fragments de l'autel |
| I-UI-13 | menu photo *(proposé)* |

---

## 23. Récapitulatif chiffré

| Catégorie | Quantité |
| --- | --- |
| Musique | 34 pistes (MUS-95 → MUS-128, avec l'extension) |
| Ambiances | 20, avec variantes jour, nuit et météo |
| Effets sonores | environ 120 (plus ceux de la Terre réutilisés) |
| Voix | environ 1 400 répliques |
| PNJ nommés | 17 + 9 légendaires |
| Humains génériques | 19 archétypes, environ 90 variantes |
| Faune | environ 30 espèces |
| Yautja isométrique | 17 familles d'actions, 8 directions |
| Comportements d'IA | 16 |
| Lieux | environ 70 lieux sur 10 îles et 3 îlots |
| Bâtiments | 27 types |
| Véhicules | 15 |
| Props | 17 familles |
| Tuiles | environ 480 (12 biomes) |
| Effets visuels | 12 |
| Scènes | 13 types (environ 25 scènes) |
| Missions principales | 8 (arc Hale) |
| Annexes | 30 + 9 activités répétables |
| Chasse inversée | 7 cartes, 6 rôles |
| Saisons | 6 |
| Écrans | 13 |
