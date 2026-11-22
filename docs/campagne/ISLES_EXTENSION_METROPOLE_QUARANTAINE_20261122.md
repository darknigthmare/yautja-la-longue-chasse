# The Isles — Métropole, transports, zone de quarantaine et biomes complétés

Nov 22, 2026 · @darknigthmare

Extension du mode [The Isles](MODE_THE_ISLES_20261121.md), demandée le 22 novembre 2026. Elle ajoute à l'archipel :
- une **métropole** dans l'esprit de New York ;
- un **quartier résidentiel américain typique** ;
- des **villages**, des **fermes**, une **zone industrielle**, une **zone commerciale**, un **port**, un **ponton avec fête foraine** ;
- plusieurs **stades** ;
- un réseau complet de **transports** : autoroutes, routes, tunnels, métro, bus, train ;
- une **zone de quarantaine** sur une île à part, ouverte tard : les ruines laissées par l'**autodestruction d'un Yautja**.

Elle **complète aussi chaque biome** : structures, faune, PNJ qui manquaient.

**Règle de lecture.** Tout est *(proposé)*. Les lieux et les personnages sont fictifs. Les modèles réels (New York, banlieue américaine, Coney Island) inspirent l'ambiance ; aucun bâtiment ni lieu réel n'est copié.

---

## Sommaire

1. Ce qui était déjà prévu, ce qui manquait
2. Nouvelle carte de l'archipel
3. Calder, la métropole
4. Maple Hollow, le quartier américain
5. Eastbank : zone commerciale, zone industrielle, stades, aéroport
6. Gull Pier : le ponton et la fête foraine
7. Les stades
8. Transports
9. Villages et fermes
10. Grayhaven : la zone de quarantaine
11. Biomes complétés, île par île
12. Ce que ça change dans le mode
13. Production à ajouter
14. Questions

---

## 1. Ce qui était déjà prévu, ce qui manquait

| Élément demandé | Avant | Maintenant |
| --- | --- | --- |
| Quartier américain typique | banlieue pavillonnaire de Calder, peu détaillée | **Maple Hollow**, quartier complet (section 4) |
| Métropole type New York | Calder, ville portuaire moyenne | **Calder**, métropole sur deux îles, gratte-ciel, métro, ponts (section 3) |
| Villages | un par île | gardés et complétés (section 9) |
| Fermes | ranch de Tallgrass | **Harvest Flats**, plaine agricole (section 9) |
| Zone industrielle | port, raffinerie, mine | + **zone industrielle d'Eastbank** (section 5) |
| Zone commerciale | évoquée | **Bayview** : centre commercial, grandes surfaces, drive-in (section 5) |
| Port | port de Calder | agrandi : port de conteneurs + port de pêche + marina |
| Ponton avec fête foraine | absent | **Gull Pier** (section 6) |
| Stades | un stade | **7 stades et arènes** (section 7) |
| Autoroutes, routes, tunnels | ponts et routes simples | **Isles Expressway**, tunnels, échangeurs (section 8) |
| Métro, bus, train | bus, train de minerai | **métro à 4 lignes**, bus, **train régional**, fret (section 8) |
| Montagne, forêts, savane | Hollowpine, Verdant, Tallgrass | gardés et complétés (section 11) |
| Zone de quarantaine | absente | **Grayhaven**, ruines de l'autodestruction (section 10) |

---

## 2. Nouvelle carte de l'archipel

La métropole et la zone de quarantaine demandent plus de place. **Décision :** passer de 8 × 8 km à **12 × 12 km** (6 144 × 6 144 tuiles).

```text
                                       N
                          ┌────────────────────────┐
                          │       FROST ISLE       │
                          │ station, port de pêche │
                          └───────────┬────────────┘
                                      ┊ ferry
             ┌────────────────────────┴──────────────────────────┐
             │                    HOLLOWPINE                     │
             │ montagne, Pinecrest, station de ski, barrage      │
             └──────┬───────────────────────────┬────────────────┘
                    ┊ gué            pont + rail │ tunnel
 ┌──────────────────┴──────┐        ┌───────────┴──────────┐  digue ┌───────────┐
 │        TALLGRASS        │──pont──│        EMBER         │────────│ IRONHOOK  │
 │ savane, Harvest Flats   │  rail  │ volcan, géothermie   │        │ base      │
 └──────────┬──────────────┘        └──────────┬───────────┘        └─────┬─────┘
            ┊ gué                    Expressway │ pont suspendu            ┊ mur
 ┌──────────┴──────────────┐        ┌──────────┴───────────┐  tunnel ┌────┴────────────┐
 │    REDMESA / DUSTWATER  │══pont══│    CALDER (île)      │═════════│    EASTBANK     │
 │ désert, mine, speedway  │  rail  │ Downtown, Midtown,   │ métro   │ Maple Hollow,   │
 └──────────┬──────────────┘        │ Uptown, Commons Park │ ponts   │ Bayview, stades,│
            ┊ ferry                 └──────────┬───────────┘         │ aéroport, usines│
 ┌──────────┴──────────────┐                   ┊ ferry               └────┬────────────┘
 │        SALTMARSH        │──bayou──┌─────────┴────────────┐             ┊ Gull Pier
 │ delta, crevettiers      │         │       VERDANT        │        ◦ GRAYHAVEN (quarantaine)
 └─────────────────────────┘         │ jungle, autel        │          ruines d'Ashgrove
                                     └─────────┬────────────┘
                                               ┊ récifs
                                ◦ ◦ ◦ THE SHALLOWS ◦ ◦ ◦       ◦ Blackrock  ◦ Halcyon Cay
                                               S
```

| Île | Part des terres (12 × 12 km) |
| --- | --- |
| Calder (île centrale) | 10 % |
| Eastbank | 12 % |
| Verdant | 9 % |
| The Shallows | 4 % |
| Tallgrass (savane + Harvest Flats) | 11 % |
| Saltmarsh | 7 % |
| Redmesa et Dustwater | 9 % |
| Ember | 7 % |
| Hollowpine | 10 % |
| Frost Isle | 6 % |
| Ironhook | 4 % |
| **Grayhaven** | 8 % |
| Îlots | 3 % |

---

## 3. Calder, la métropole

Inspirée de l'ambiance de New York : une île dense couverte de gratte-ciel, une grille de rues, un grand parc, un métro, des ponts vers les autres quartiers. Calder garde son histoire de port de corsaires.

### 3.1 Quartiers de l'île de Calder
| Quartier | Ambiance | Lieux | Faction | Hauteurs (Yautja) | Dessous |
| --- | --- | --- | --- | --- | --- |
| **Downtown** | quartier financier, rues étroites, gratte-ciel anciens | bourse, tour Hale, mairie, tribunal, Battery Point (pointe sud, vue sur la baie) | sécurité privée, police | toits de gratte-ciel (grappin) | métro, parkings, chambres fortes |
| **Old Harbor** | vieux port de corsaires, pavés, entrepôts de brique | marché aux poissons, quais anciens, pub, musée maritime | les Docks | toits de brique reliés | caves, anciens tunnels de contrebande |
| **Midtown** | tours de verre, places lumineuses, théâtres | **Lumen Square** (écrans géants, foule nuit et jour), gare centrale, grands hôtels | police, sécurité | toits de tours | métro, gare souterraine |
| **Commons Park** | grand parc central rectangulaire | lac, bois, zoo, kiosque, patinoire l'hiver | civils, police montée | arbres (canopée urbaine) | tunnels du parc |
| **Uptown** | immeubles résidentiels chics, musées | musée d'histoire (salle Tahren), musée d'art, université | sécurité, civils | toits | métro |
| **The Heights** | quartier populaire au nord, immeubles de briques, escaliers de secours | terrains de basket, épiceries, église, ligne aérienne du métro | les Hauteurs | toits continus | métro, égouts |
| **Little Harbor** | quartier d'immigrés, marchés de nuit, restaurants | marché de nuit, temples, salons de thé | civils, petit crime | toits, enseignes | caves |
| **Riverside** | berge ouest, autoroute surélevée, entrepôts reconvertis | lofts, galeries, boîtes de nuit | gangs la nuit | autoroute surélevée | sous l'autoroute |

### 3.2 Repères de Calder
- **Tour Hale** (90 étages, Downtown).
- **Lumen Square** et ses écrans géants (Midtown).
- **Pont suspendu Calder–Ember** (deux pylônes, la plus belle vue de l'archipel).
- **Pont de la Baie** et **tunnel du Port** (Calder–Eastbank).
- **Statue du Navigateur** sur un îlot de la baie *(proposé, fictive)*.

### 3.3 Ce que Calder apporte au jeu
- **La verticalité :** chasse de toit en toit, entre des tours de 60 étages.
- **La foule :** Lumen Square et Midtown sont presque impossibles à traverser sans témoin de jour ; la nuit, Midtown reste éclairée.
- **Le dessous :** métro, gare, égouts, anciens tunnels de contrebande : un réseau complet sous la ville.
- **Les factions :** police, deux gangs, sécurité des tours, garde de Hale.

---

## 4. Maple Hollow, le quartier américain

Un quartier résidentiel américain typique, sur Eastbank, à 15 minutes de Midtown en métro aérien.

| Élément | Description |
| --- | --- |
| Rues | allées en arc, impasses en raquette, trottoirs, bouches d'incendie, boîtes aux lettres |
| Maisons | maisons à étage en bois clair, porches, garages doubles, pelouses, clôtures blanches, piscines, cabanes dans les arbres |
| Centre | **Main Street** : diner ouvert 24 h, station-service, quincaillerie, salon de coiffure, banque, cinéma à l'ancienne |
| Écoles | école élémentaire, lycée avec terrain de football américain et gradins |
| Services | caserne de pompiers, poste de police de quartier, église, bibliothèque |
| Parc | parc avec étang, aire de jeux, terrain de baseball de quartier |
| Vie | bus scolaire jaune, arrosage automatique, barbecues, chiens dans les jardins, fêtes de quartier, décorations de saison |

**Gameplay :**
- Quartier presque entièrement **civil** : un terrain de test du code. Les humains armés y sont rares (police, un cambrioleur, un voisin armé chez lui).
- La nuit, les chiens dans les jardins **aboient** au passage du joueur (alerte de niveau 0 → 1 si un voisin appelle la police).
- Activités : la prime « Le Boucher de Calder » peut avoir sa planque ici ; un événement « cambriolage armé » ; une épreuve de toits de maisons.
- **Décorations de saison** : Halloween, fêtes de fin d'année, 4 Juillet (feu d'artifice qui couvre les bruits).

---

## 5. Eastbank : zone commerciale, zone industrielle, stades, aéroport

| Zone | Contenu | Faction | Gameplay |
| --- | --- | --- | --- |
| **Bayview (zone commerciale)** | centre commercial couvert sur 2 étages, grandes surfaces, parkings immenses, restaurants rapides, multiplexe, **drive-in** | sécurité, civils | toits plats immenses ; parkings de nuit ; centre commercial fermé la nuit |
| **Zone industrielle d'Eastbank** | usines, entrepôts logistiques, centrale électrique, station d'épuration, casse auto, cimenterie, voies de fret | Docks (trafics), sécurité privée | cheminées, convoyeurs, wagons ; peu de civils la nuit |
| **Port de conteneurs** | terminaux, portiques, piles de conteneurs, navires | Docks, douane | labyrinthe de conteneurs ; portiques à escalader |
| **Aéroport international** | terminal, pistes, hangars, tour de contrôle | sécurité, police | zone très surveillée ; hangars de nuit |
| **Stades** | section 7 | — | — |
| **Gull Pier** | section 6 | — | — |

---

## 6. Gull Pier : le ponton et la fête foraine

Un long ponton en bois sur pilotis, au bout de la plage d'Eastbank, couvert d'une **fête foraine** permanente. Ambiance de bord de mer américain.

| Élément | Description |
| --- | --- |
| Ponton | 600 m de planches sur pilotis, avec rambardes et lampadaires |
| Grande roue | repère visible de Calder, illuminée la nuit |
| Montagnes russes en bois | « The Gull », vieilles et grinçantes |
| Manèges | carrousel, chaises volantes, autos tamponneuses, train fantôme, maison des miroirs |
| Stands | tir à la carabine (ironie), lancer d'anneaux, barbe à papa, hot-dogs, glaces |
| Fond | aquarium, salle d'arcade, petit théâtre |
| Dessous | pilotis, mer, pêcheurs sous le ponton |
| Plage | promenade en planches (boardwalk), douches, maîtres-nageurs |

**Gameplay :**
- **Le jour :** foule énorme, aucun combat possible sans faute ; on y vient pour observer.
- **La nuit :** parc fermé ; trafiquants qui s'y donnent rendez-vous ; gang qui rackette les forains.
- **Lieux de combat :** structure des montagnes russes (combat sur les rails, wagon en marche), grande roue (en hauteur), maison des miroirs (le camouflage se reflète partout), train fantôme (dans le noir), sous le ponton (dans l'eau).
- **Annexe proposée :** « La grande roue » : un chef de gang tient une réunion au sommet de la grande roue arrêtée ; l'atteindre sans être vu.
- **Chasse inversée :** nouvelle carte « Gull Pier de nuit » (section 12).

---

## 7. Les stades

| Stade | Sport | Où | Capacité | Gameplay |
| --- | --- | --- | --- | --- |
| **Harbor Park** | baseball | Eastbank, au bord de l'eau | 40 000 | soir de match : foule ; nuit : vide, projecteurs |
| **Calder Stadium** | football américain et soccer | Eastbank | 70 000 | toit ouvrant ; coursives ; grand écran |
| **Calder Arena** | basketball et hockey | Midtown, au-dessus de la gare centrale | 20 000 | intérieur ; passerelles techniques |
| **Lycée de Maple Hollow** | football américain | Maple Hollow | 3 000 | match du vendredi soir |
| **Redmesa Speedway** | course automobile | Redmesa | 30 000 | piste, stands, tribunes |
| **Arène de rodéo** | rodéo | Tallgrass | 5 000 | foire agricole de Harvest Flats |
| **Tremplin de saut à ski** | ski | Hollowpine | 8 000 | hiver ; hauteur |

**Règle :** les jours d'événement, la foule rend le stade **interdit au combat** (trop de civils). Les nuits, les stades vides sont des terrains de chasse (une prime peut s'y cacher ; une épreuve de toit de stade).

---

## 8. Transports

### 8.1 Routes
| Réseau | Description |
| --- | --- |
| **Isles Expressway (I-1)** | autoroute en boucle : Calder → pont suspendu → Ember → Tallgrass → Redmesa → pont → Calder ; 2 × 3 voies ; échangeurs en trèfle, aires de repos, péages |
| **I-2** | autoroute surélevée le long de Riverside, puis tunnel du Port vers Eastbank |
| **Routes nationales** | 2 × 1 voies vers chaque île ; ponts et gués |
| **Routes de campagne** | Harvest Flats, Hollowpine, Saltmarsh |
| **Pistes** | Verdant, Redmesa, Frost Isle |

### 8.2 Tunnels
| Tunnel | Relie | Gameplay |
| --- | --- | --- |
| Tunnel du Port | Calder ↔ Eastbank (sous la baie) | trafic dense, galeries de service, ventilation ; barrage à l'alerte 3 |
| Tunnel d'Ember | Ember ↔ Hollowpine, dans le flanc du volcan | chaleur, fissures ; fermé pendant les éruptions |
| Tunnels de Hollowpine | routes de montagne | courts, avalanches l'hiver |
| Anciens tunnels de contrebande | Old Harbor | dessous jouable, non cartographié au départ |

### 8.3 Métro de Calder
| Ligne | Couleur | Parcours | Type |
| --- | --- | --- | --- |
| **Ligne 1** | rouge | Battery Point → Downtown → Midtown → Uptown → The Heights | souterraine |
| **Ligne 2** | bleue | Old Harbor → Midtown → tunnel du Port → Bayview → aéroport | souterraine puis surface |
| **Ligne 3** | verte | Riverside → Little Harbor → pont de la Baie → Maple Hollow | **aérienne** sur Eastbank |
| **Ligne 4** | jaune | Bayview → Harbor Park → Calder Stadium → **Gull Pier** | aérienne, terminus au ponton |

- **26 stations** au total, dont 4 jouables en entier (Midtown Central, Battery Point, The Heights, Gull Pier).
- **Gameplay :** le Yautja peut voyager **sur le toit des rames**, se cacher dans les **tunnels**, couper le courant d'une ligne (rames arrêtées, voyageurs coincés : risque de témoins), chasser dans les **stations fantômes** fermées.
- La nuit, le métro tourne moins ; les gangs s'en servent.

### 8.4 Bus
- **Bus de ville** à Calder et Eastbank (12 lignes), **bus scolaires** à Maple Hollow, **cars** entre les îles.
- Le Yautja peut monter sur le toit d'un bus.

### 8.5 Train
| Ligne | Parcours | Gameplay |
| --- | --- | --- |
| **Isles Rail (régional)** | gare centrale de Calder → Redmesa (Dustwater) → Tallgrass (Harvest Flats) → Ember → Hollowpine (Pinecrest) | trains de voyageurs, toits, gares |
| **Fret de minerai** | mine de Redmesa → port d'Eastbank | train d'armes (annexe I-AN-15) |
| **Fret industriel** | zone industrielle d'Eastbank → port | wagons, triage |
| **Train touristique** | téléphérique et crémaillère de Hollowpine | — |

### 8.6 Mer et air
- **Ferries** : Calder ↔ Verdant, Saltmarsh, Frost Isle, îlots.
- **Bateaux-taxis** dans la baie de Calder.
- **Aéroport international** (Eastbank), **aérodromes de brousse** (Tallgrass, Frost), **héliports** (toits de Downtown, Halcyon Cay, Ironhook).

---

## 9. Villages et fermes

### 9.1 Villages
| Village | Île | Ambiance | Faction | Particularité |
| --- | --- | --- | --- | --- |
| **Port-Tahren** | Verdant | village de pêcheurs sur la côte | civils, braconniers de passage | fête du poisson |
| **Coral Key** | Shallows | hôtel de plage, centre de plongée | civils, trafiquants | touristes |
| **Bayou Cross** | Saltmarsh | village sur pilotis, église, bar de blues | civils, chasseurs d'alligators | bals du samedi |
| **Dustwater** | Redmesa | petite ville western | shérif, milice | gare, saloon |
| **Harvest Flats** | Tallgrass | bourg agricole | civils, fermiers armés | foire et rodéo |
| **Pinecrest** | Hollowpine | village de montagne, chalets | civils, bûcherons | station de ski |
| **Sulfur Springs** | Ember | station thermale | civils, touristes | spa |
| **Northwick** | Frost Isle | port de pêche, maisons sur pilotis | pêcheurs | musée baleinier |

### 9.2 Harvest Flats : la plaine agricole
- **Fermes** : maisons, granges rouges, silos, éoliennes de pompage, tracteurs, champs de maïs (labyrinthe de maïs à l'automne), vergers, élevage laitier, poulaillers.
- **Bourg** : silo à grain géant, coopérative, magasin d'alimentation animale, arène de rodéo, champ de foire.
- **Faune domestique** : vaches, chevaux, cochons, poulets, chiens de ferme.
- **Gameplay** : les **champs de maïs** sont un couvert parfait (mais bruyants) ; les fermiers ont des fusils (proies dignes seulement s'ils menacent) ; les animaux de Hale (lions) attaquent le bétail : les fermiers organisent des **battues armées**.

---

## 10. Grayhaven : la zone de quarantaine

### 10.1 Ce qui s'est passé
| Date | Événement *(proposé)* |
| --- | --- |
| 1997 | Les caméras de Hale filment un Yautja sur Tallgrass (I-SC-03). Ce chasseur s'appelle **Vash'Tar** dans le Registre des Îles |
| 2003, été | Vash'Tar chasse sur Grayhaven, île de 40 000 habitants, autour de la ville d'**Ashgrove**. Les hommes de Hale, informés par ses caméras, le traquent avec des mercenaires |
| 2003, 14 août | Blessé, encerclé dans le centre d'Ashgrove, sans fenêtre d'extraction, Vash'Tar déclenche son **autodestruction**. L'explosion rase le centre-ville et incendie l'île |
| 2003–2004 | Le gouvernement parle d'un **« accident de dépôt de munitions »**. L'île est évacuée et déclarée **zone de quarantaine** (contamination). Un mur et des postes militaires l'entourent ; la garnison d'Ironhook la garde |
| 2004–2026 | Des **charognards** armés entrent pour piller ; des équipes d'ARGOS et de W-Y y font des relevés en secret. Une partie de l'arme de Vash'Tar, trouvée par un pillard, finit chez le trafiquant de Dustwater, puis chez **Hale** (arc Hale) |

**Pour les Yautja :** Vash'Tar a commis une **faute grave** (autodestruction en zone habitée, précédent de Scarface dans la bible). Mais il a été traqué par un Ooman sans honneur. Sœur-de-Pierre veut que ses restes et son masque **rentrent à l'autel**, pour qu'il soit jugé, pas oublié.

### 10.2 Accès
- **Décision :** Grayhaven s'ouvre **après la fin de l'arc Hale** (réputation 9). La raison dans le monde : Hale tombé, ses archives révèlent la vérité sur 2003.
- On y entre par la mer (côte sud, de nuit) ou par un trou dans le mur, jamais par le vaisseau (défenses militaires).
- Alerte particulière : les postes du mur font monter l'alerte au niveau 3 directement.

### 10.3 Zones de Grayhaven
| Zone | Description | Dangers | Qui y est |
| --- | --- | --- | --- |
| **Le mur** | mur de béton, barbelés, miradors, postes de contrôle, panneaux de danger | projecteurs, militaires | garnison |
| **Banlieue figée** | quartier résidentiel abandonné en 2003 : voitures sur les allées, jouets dans les jardins, maisons envahies par la végétation | effondrements, chiens errants | charognards |
| **Forêt brûlée** | troncs noirs, sol de cendres, repousses vertes vingt ans après | branches qui tombent, thermique brouillé par les cendres chaudes | faune revenue |
| **Ashgrove, ville en ruine** | immeubles éventrés, rues encombrées de voitures brûlées, bus renversés, enseignes tombées, panneaux de 2003, ponts effondrés | effondrements, incendies résiduels, zones contaminées | charognards, ARGOS, W-Y |
| **Le métro noyé** | ligne de métro d'Ashgrove, inondée | eau, obscurité | charognards (planque) |
| **Hôpital d'Ashgrove** | centre d'évacuation en 2003, abandonné ; lits, tentes militaires | effondrements | base des charognards |
| **Point zéro** | cratère au centre-ville, sol vitrifié, silence ; au fond, les restes de Vash'Tar | **contamination forte** (jauge), aucun abri | personne, sauf la fin |
| **Base de recherche** | camp ARGOS et W-Y caché dans un parking souterrain | capteurs, synthétiques | ARGOS, W-Y |
| **Port d'Ashgrove** | navires échoués, grues tordues | rouille, eau | charognards |

### 10.4 Système de contamination (décision : zones marquées)
- Une jauge de **contamination** monte dans les zones marquées (point zéro, centre d'Ashgrove, certains sous-sols).
- Elle baisse hors des zones.
- Pleine : le joueur perd de la santé et son camouflage se dérègle (le biomask aussi).
- Les humains en tenue étanche (ARGOS, W-Y) ne craignent rien ; les charognards, si.

### 10.5 Humains de Grayhaven
| Groupe | Description | Statut |
| --- | --- | --- |
| **Charognards** | pilleurs armés, masques à gaz bricolés, véhicules blindés maison ; vivent à l'hôpital | proies dignes |
| **Mara la Grise** | cheffe des charognards (boss) ; vend ce qu'elle trouve, y compris de la technologie yautja | proie désignée |
| **Garnison du mur** | militaires d'Ironhook | proies dignes |
| **ARGOS** | équipe en combinaisons, relevés | équipe spécialisée |
| **W-Y** | synthétiques et sécurité en combinaisons | équipe spécialisée (synthétiques sans honneur) |
| **Les Restés** | une poignée d'anciens habitants qui n'ont jamais voulu partir ; non armés | **non-combattants** |

### 10.6 Faune de Grayhaven
- **Chiens errants** devenus meutes.
- **Lions de Hale** revenus dans les ruines (descendants de la réserve) : apex de la zone.
- Sangliers, cerfs, renards, corbeaux en nombre.
- **Légendaire :** **Cendre**, un lion à crinière grise né dans les ruines.

### 10.7 Missions de Grayhaven
| ID | Mission | Contenu |
| --- | --- | --- |
| I-GH-01 | **Le mur** | entrer dans la zone sans alerte |
| I-GH-02 | **La banlieue figée** | suivre les traces de Vash'Tar en 2003, à travers ses marques encore visibles (lames dans les murs, impacts de plasma) |
| I-GH-03 | **L'hôpital** | déloger les charognards ; Mara la Grise s'enfuit avec un objet yautja |
| I-GH-04 | **Le métro noyé** | poursuite dans les tunnels inondés |
| I-GH-05 | **La base** | voler les relevés d'ARGOS et de W-Y sur 2003 |
| I-GH-06 | **Mara la Grise** | duel sur le toit d'un immeuble en ruine |
| I-GH-07 | **Le point zéro** | descendre dans le cratère contaminé ; retrouver le masque de Vash'Tar |
| I-GH-08 | **Le retour** | rapporter le masque à l'autel ; scène de jugement posthume de Vash'Tar |

**Scène finale (I-SC-GH) :** Sœur-de-Pierre pose le masque sur l'autel. « Il a fauté. Il a été traqué par un lâche. Les deux sont vrais. Qu'il soit jugé, et qu'il ne soit pas oublié. » Le joueur choisit la **sentence** : nom effacé du Registre, ou nom gardé avec la faute inscrite à côté.

### 10.8 Grayhaven dans les autres modes
- **Chasse inversée :** carte **« Ashgrove »** : les humains doivent traverser la ville en ruine jusqu'à un hélicoptère au-delà du mur.
- **Saison proposée :** « **Les cendres** » : un incendie relance la contamination ; Mara la Grise revient ; W-Y envoie une grosse équipe.

---

## 11. Biomes complétés, île par île

Pour chaque île : ce qui **s'ajoute** aux structures, à la faune et aux PNJ déjà prévus.

### Verdant (jungle)
| Ajout | Contenu |
| --- | --- |
| Structures | mission religieuse abandonnée, petite centrale hydroélectrique sous les chutes, éco-lodge pour touristes, pont suspendu de lianes et de cordes, village Port-Tahren |
| Faune | singes hurleurs, tapirs, harpie (grand rapace), caïman, grenouilles, perroquets, fourmilier |
| PNJ | guides d'éco-tourisme, touristes, prêtre de la mission (civil), garde de la centrale |

### The Shallows (mangroves, récifs)
| Ajout | Contenu |
| --- | --- |
| Structures | hôtel de plage de Coral Key, centre de plongée, avion échoué dans le lagon, marché aux poissons, petit aéroport à hydravions |
| Faune | tortues marines, barracudas, murènes, raies, pélicans, frégates, crabes de cocotier |
| PNJ | moniteurs de plongée, touristes, pêcheurs, trafiquants déguisés en loueurs de bateaux |

### Tallgrass (savane) et Harvest Flats (fermes)
| Ajout | Contenu |
| --- | --- |
| Structures | Harvest Flats (section 9.2), arène de rodéo, poste vétérinaire, ancien safari-camp en toile, éoliennes |
| Faune | éléphants, girafes, rhinocéros, zèbres, antilopes, gnous, autruches (tous ex-Halcyon) ; vautours ; bétail de ferme |
| PNJ | fermiers (civils, armés pour la battue), cow-boys, vétérinaire, forains de la foire, chasseurs de Torres |

### Saltmarsh (marais)
| Ajout | Contenu |
| --- | --- |
| Structures | bateaux crevettiers, bateau de croisière de bayou pour touristes, bar de blues Bayou Cross, église sur pilotis, cimetière en surface |
| Faune | hérons, aigrettes, tortues alligators, sangliers, lynx roux, ratons laveurs, moustiques (ambiance) |
| PNJ | pêcheurs de crevettes, guide de croisière, musiciens, chasseurs d'alligators |

### Redmesa et Dustwater (désert)
| Ajout | Contenu |
| --- | --- |
| Structures | **Redmesa Speedway**, relais routier de camions, drive-in du désert, ferme solaire, camp de travail de la mine, cimetière de vieux avions, motel au néon |
| Faune | crotales, scorpions, vautours, chevaux sauvages, coyotes, lièvres, puma |
| PNJ | routiers, pilotes du speedway, mineurs, serveuse du diner, prédicateur de rue |

### Calder et Eastbank (métropole)
| Ajout | Contenu |
| --- | --- |
| Structures | sections 3 à 8 |
| Faune | pigeons, rats, chiens, chats, mouettes, faucon pèlerin sur une tour, ratons laveurs à Maple Hollow, animaux du zoo de Commons Park (dont un lion de Hale capturé) |
| PNJ | employés de bureau, vendeurs de rue, touristes, sans-abri, musiciens de métro, livreurs, étudiants, policiers, pompiers, joueurs et supporters des stades, forains, enfants de Maple Hollow, conducteurs de métro et de bus |

### Ember (volcan)
| Ajout | Contenu |
| --- | --- |
| Structures | centrale géothermique, station thermale Sulfur Springs, tunnels de lave aménagés pour touristes, observatoire, tunnel routier vers Hollowpine |
| Faune | chèvres sauvages, oiseaux marins nichant sur les falaises, chauves-souris dans les tunnels de lave |
| PNJ | ingénieurs de la centrale, curistes, guides de tunnels, volcanologues |

### Hollowpine (montagne, forêts)
| Ajout | Contenu |
| --- | --- |
| Structures | village de Pinecrest, **station de ski** (remontées, chalets, tremplin), camp de vacances d'été, poste des gardes forestiers, tour de guet anti-incendie, cabanes de trappeurs, mine abandonnée, crémaillère |
| Faune | élans, wapitis, ours noirs, pumas, castors, aigles, loups |
| PNJ | skieurs, moniteurs, gardes forestiers armés, campeurs, trappeurs |

### Frost Isle (toundra)
| Ajout | Contenu |
| --- | --- |
| Structures | port de pêche de Northwick, musée baleinier, dôme radar, route de glace, conserverie |
| Faune | phoques, renards arctiques, caribous, orques (au large), harfangs |
| PNJ | pêcheurs, chercheurs, conducteurs de route de glace |

### Ironhook (militaire)
| Ajout | Contenu |
| --- | --- |
| Structures | base de sous-marins (abri bétonné), arsenal, piste et hangars, hôpital militaire, prison militaire, **poste de commandement du mur de Grayhaven** |
| Faune | aucune (chiens militaires) |
| PNJ | marins, pilotes, médecins militaires, police militaire |

---

## 12. Ce que ça change dans le mode

| Sujet | Avant | Proposition |
| --- | --- | --- |
| Taille | 8 × 8 km | **12 × 12 km** (décision) |
| Villes | Calder et Dustwater | **Calder (métropole) + Eastbank (Maple Hollow, Bayview)** + Dustwater + 7 villages |
| Îles | 10 + îlots | **12** + îlots (Eastbank et Grayhaven en plus) |
| Ouverture des îles | 5 étapes | 6 étapes : la dernière ouvre **Grayhaven** après l'arc Hale |
| Cartes de Chasse inversée | 7 | **9** (+ Gull Pier de nuit, + Ashgrove) |
| Marques d'alerte | inchangées | + règle des **stades et fêtes** (combat interdit pendant les événements) |
| Arc Hale | 8 étapes | inchangé ; Grayhaven devient sa **suite** (8 missions I-GH) et explique d'où vient l'arme volée |

---

## 13. Production à ajouter

| Catégorie | Ajouts |
| --- | --- |
| Tuiles | styles métropole (gratte-ciel, brique new-yorkaise, verre), banlieue américaine, foire, ruines (gravats, sol vitrifié, cendres, végétation qui reprend) |
| Bâtiments | gratte-ciel (8 modèles), immeubles de brique (6), maisons de Maple Hollow (10), centre commercial, multiplexe, drive-in, 7 stades, gares, stations de métro (4 jouables), ponton et manèges (8), fermes et silos, station de ski, centrale géothermique, ruines d'Ashgrove (versions détruites de 20 modèles) |
| Véhicules | rames de métro (souterraine, aérienne), train régional, bus scolaire, taxis, camions de pompiers, ambulances, tracteurs, moissonneuses, motoneiges, voitures brûlées (Grayhaven) |
| PNJ | métropole (environ 30 variantes de plus), Maple Hollow (familles, enfants, retraités), forains, supporters, fermiers, skieurs, charognards (4), Mara la Grise, les Restés |
| Faune | animaux de ferme, faune de la métropole, faune de montagne complétée, éléphants, girafes, rhinocéros, lions de Grayhaven, chiens errants, Cendre |
| Son | ambiances métropole (Lumen Square, métro, stade, fête foraine), Maple Hollow (jour, nuit), Grayhaven (vent dans les ruines, compteur de contamination, silence du point zéro) |
| Musique | **MUS-124 Métropole de nuit**, **MUS-125 Gull Pier**, **MUS-126 Maple Hollow**, **MUS-127 Grayhaven**, **MUS-128 Le point zéro** (prompts à rédiger dans le même format) |
| Systèmes | métro (rames, horaires, coupures de courant), autoroute (trafic dense), stades et événements (foule), contamination, ruines (effondrements scriptés) |

---

## 14. Décisions du 22 novembre 2026

| Question | Décision |
| --- | --- |
| Taille | **12 × 12 km** (6 144 × 6 144 tuiles) |
| Accès à Grayhaven | **après l'arc Hale** (réputation 9) |
| Contamination | **oui, dans les zones marquées** (point zéro, centre d'Ashgrove, certains sous-sols) |
| Sentence de Vash'Tar | **le joueur choisit** : nom effacé du Registre, ou gardé avec la faute inscrite |
