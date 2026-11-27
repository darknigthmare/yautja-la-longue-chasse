# Mode The Isles — Chasse en monde ouvert

Nov 21, 2026 · @darknigthmare

Mode de jeu dédié, à côté de The Pit, de la Guerre des clans et de Queen Hunt (voir « Modes multijoueur dédiés » dans la [Bible de campagne](BIBLE_DE_CAMPAGNE.md)).

Tout ce qu'il faut produire est listé dans [The Isles — Inventaire complet de production](ISLES_PRODUCTION_COMPLETE_20261121.md).

**Règle de lecture.** Tout est *(proposé)* sauf les lignes **Décision**. Les règles de la campagne (code d'honneur, barème, IA humaine, chiens) s'appliquent quand ce document ne dit rien d'autre.

### Décisions du 21 novembre 2026

| Sujet | Décision |
| --- | --- |
| Lien avec la campagne | **aucun effet** : trophées et cosmétiques propres au mode |
| Époque | **présent fixe, années 2020** |
| Chasse inversée | **gardée et prioritaire** : mode phare dès le lancement (section 13.3) |
| Victoire des humains en Chasse inversée | **fuir l'île ou tenir** jusqu'à la fin du temps |
| Taille et moteur | **12 × 12 km** (révisé le 22 novembre, au lieu de 8 × 8), **three.js** |
| Villes | **révisé le 22 novembre** : Calder devient une **métropole** type New York, avec Eastbank (quartier américain Maple Hollow, zone commerciale, stades, Gull Pier) ; Dustwater ; 7 villages ; et **Grayhaven**, île en quarantaine ouverte après l'arc Hale. Détail : [extension](ISLES_EXTENSION_METROPOLE_QUARANTAINE_20261122.md) |
| Joueurs par session | **8** |
| Humain qui se rend (Chasse inversée) | **règle proposée validée** : intouchable, désarmé 90 s, ni pièce ni radio ; compte à moitié à l'extraction ; le Yautja qui le tue perd la partie |
| Rôles humains | **les 6** : Pisteur, Tireur, Démolisseur, Médecin, Radio, Garde de la réserve |
| Autodestruction en Chasse inversée | **gardée** : 10 s pour sortir du rayon |
| Voyage rapide du vaisseau | **entre repaires, sauf Calder et Ironhook** |
| Ouverture des îles | **cordon naval d'ARGOS** à saboter |
| Histoire | **arc Hale en 8 étapes** (section 17) |
| Vie en ligne | **saisons de 8 semaines** (section 18) |
| Mort en chasse libre | **trophées non rapportés perdus** ; réapparition au dernier repaire (section 11.4) |
| Voix en Chasse inversée | **voix de proximité + radio**, que le Yautja peut écouter (section 13.3) |

---

## Sommaire

1. Le concept
2. Place dans le jeu
3. Lore de The Isles
4. Vue et rendu
5. Ce qu'on retient des cartes GTA
6. La carte de l'archipel
7. Les îles une par une
8. Répartition des zones
9. Peuplement
10. Se déplacer
11. Boucle de jeu en monde ouvert
12. Marques d'alerte
13. En ligne
14. Progression du mode
15. Production
16. Questions ouvertes
17. Arc Hale
18. Saisons

---

## 1. Le concept

**The Isles** est un archipel fictif de la Terre, au présent (**décision :** années 2020). Chaque île a son biome. Le joueur y chasse librement, seul ou en ligne avec d'autres Yautja, dans un **monde ouvert en 3D isométrique**.

- **Vue :** caméra isométrique haute qui suit le joueur et anticipe ses mouvements, dans l'esprit du prototype *Race'n'Chase* (l'ancêtre de GTA), mais en 3D.
- **Rendu :** monde en tuiles extrudées en volumes (voxels), éclairé, avec jour et nuit, dans l'esprit des recompilations 3D de Pokémon Rouge et Bleu.
- **Carte :** répartition des zones, de la densité et du peuplement pensée à partir des cartes de la série GTA.

Les décisions de la boucle Terre (code, témoins, nettoyage, ARGOS…) sont reprises et adaptées au monde ouvert.

---

## 2. Place dans le jeu

| Sujet | Proposition |
| --- | --- |
| Accès | Mode à part, dans le menu principal, comme The Pit et Queen Hunt |
| Personnage | le Yautja de la campagne, avec son apparence et son équipement |
| Effet sur la campagne | **Décision : aucun** : ni honneur, ni rang, ni âge. Même règle que la Guerre des clans en multijoueur |
| Ce que le joueur garde | trophées et cosmétiques du mode, dans une salle des trophées des Îles |
| Solo | jouable hors ligne, avec d'autres Yautja en IA |
| En ligne | **Décision :** sessions de 1 à 8 joueurs (section 13) |
| Continuité | séparée de la campagne, comme le DLC Badlands |

---

## 3. Lore de The Isles

### 3.1 L'archipel
- Archipel fictif, posé dans un océan au large d'aucun pays précis. Il s'étire du nord au sud sur un très long chapelet : tropical au sud, subpolaire au nord, volcanique au centre.
- Comme dans GTA, **la carte compresse les distances** : quelques minutes de marche séparent des climats que des centaines de kilomètres sépareraient en vrai.
- Statut : territoire autonome, peu contrôlé, avec une ville portuaire, des ranchs, des mines, une base militaire, une prison sur un îlot.

### 3.2 Pourquoi tant de grands prédateurs
- Dans les années 1990, un magnat, **Augustin Hale**, a racheté une partie de l'archipel. Il y a créé **Halcyon**, une réserve de chasse privée pour clients fortunés, avec des animaux importés du monde entier : lions, tigres, ours, jaguars, crocodiles.
- Après sa faillite, les animaux ont été relâchés ou se sont échappés. Ils se sont adaptés chacun à l'île qui leur convient.
- L'archipel attire depuis des chasseurs, des braconniers, des trafiquants et des milices privées.

### 3.3 Pourquoi les Yautja y viennent
- Proies armées, grands prédateurs, climats variés, faible présence de l'État : pour les Yautja, c'est une **réserve idéale**.
- Les clans s'accordent pour en faire un **terrain commun** : plusieurs clans y chassent en même temps, sans guerre entre eux. Cela justifie la présence de plusieurs joueurs.
- Sur **Verdant**, des ruines très anciennes montrent un **autel de chasse yautja** gravé par un peuple oublié qui vénérait les chasseurs (le lore montre déjà des peuples anciens qui vénéraient les Yautja). C'est le point de ralliement des joueurs.

### 3.4 Ce que savent les humains
- Pour les habitants, les Îles sont un endroit où « les gens disparaissent ».
- **ARGOS** a une base sur **Ironhook**, l'île militaire. Ici, ARGOS sait déjà : c'est son terrain d'étude.

---

## 4. Vue et rendu

### 4.1 Caméra
| Élément | Proposition |
| --- | --- |
| Angle | isométrique, environ 35° de plongée |
| Rotation | 4 positions, par quarts de tour |
| Zoom | 3 niveaux : traque (proche), course (moyen), repérage (loin) |
| Anticipation | à la course et pendant une poursuite, la caméra se décale dans la direction du mouvement pour montrer ce qui arrive, à la manière de *Race'n'Chase* |
| Occlusion | bâtiments, arbres et falaises devant le joueur deviennent transparents ou se coupent en hauteur |
| Intérieurs | toits retirés à l'entrée, vue en coupe |
| Hauteur | les toits, la canopée et les falaises sont des niveaux jouables ; la caméra monte et descend avec le joueur |

### 4.2 Le monde en tuiles et en volumes
- Le monde est une grille de **tuiles**. Chaque tuile est extrudée en volume : sol, eau, falaise, mur, toit, arbre.
- **Une tuile = 2 m.** Les objets (véhicules, caisses, animaux, humains) sont des modèles ou des sprites à 8 directions posés sur la grille.
- Lumière dynamique : cycle jour et nuit de 24 min, ombres, lumières de la ville, phares, lampes torches.
- Météo : pluie, orage, brouillard, tempête de sable (Redmesa), blizzard (Frost Isle).

### 4.3 Le camouflage en isométrique
- La distorsion reste visible pour le joueur (silhouette réfractée), invisible au loin pour l'IA.
- En vue isométrique, le joueur camouflé garde un **contour fin** à l'écran pour rester lisible.
- Eau, pluie et boue révèlent comme dans la campagne.

### 4.4 Modes du biomask
Thermique, électromagnétique, mouvement et analyse fonctionnent comme sur Terre ([Terre — Gameplay des missions](TERRE_GAMEPLAY_MISSIONS_20261121.md), section 8). En isométrique, ils recolorent toute la scène.

---

## 5. Ce qu'on retient des cartes GTA

| Jeu | Organisation de la carte | Leçon pour The Isles |
| --- | --- | --- |
| *Race'n'Chase* / GTA (1997) | vue de dessus, plusieurs villes séparées | lisibilité vue d'en haut ; routes et côtes servent de repères |
| GTA 2 | une ville en quartiers tenus chacun par un gang | chaque zone a une **faction** qui la peuple et réagit au joueur |
| GTA III | trois îles ouvertes une à une, par les ponts | **ouvrir l'archipel par étapes** ; apprendre une île avant la suivante |
| Vice City | deux grandes îles et des îlots ; plage d'un côté, port de l'autre | chaque **rive** a une identité ; les îlots sont des lieux spéciaux |
| San Andreas | trois villes reliées par campagne, désert, forêt et montagne | **variété de biomes** ; la nature occupe la plus grande part ; les trajets racontent |
| GTA IV | îles denses et verticales, ponts fermés au début | une petite zone **dense et verticale** vaut mieux qu'une grande zone vide |
| GTA V | une île : ville au sud, campagne et désert au nord, montagne au centre, base militaire interdite | **gradient de densité** ville → banlieue → campagne → nature ; un **repère visible de partout** ; une **zone interdite** pour la fin |
| GTA VI (Leonida) | État en régions très différentes, dont un chapelet d'îles et des marais | chaque région est un **écosystème** distinct avec sa faune, ses humains, sa lumière |

**Principes retenus pour The Isles :**
1. **Une grande ville** dense (Calder) et **une petite ville** (Dustwater) ; tout le reste est un gradient vers la nature.
2. Un **volcan central** visible de toutes les îles, qui sert de boussole.
3. Les îles s'ouvrent **par groupes**, avec une raison dans le monde (section 14).
4. Chaque île a **un biome, une faction humaine dominante, une proie apex**.
5. Une **zone interdite** de fin : Ironhook.
6. Les **îlots** sont des lieux à histoire : prison, phare, épave, île privée.
7. Les **liaisons** entre îles (ponts, gués, ferries) sont des lieux de jeu, pas des couloirs.

---

## 6. La carte de l'archipel

> **Révision du 22 novembre :** la carte passe à 12 × 12 km avec Eastbank et Grayhaven. La carte à jour est dans [Métropole, transports, zone de quarantaine](ISLES_EXTENSION_METROPOLE_QUARANTAINE_20261122.md), section 2. Le schéma ci-dessous est la première version.

```text
                                  N
                       ┌───────────────────┐
                       │    FROST ISLE     │   toundra, glacier
                       │  (station polaire)│
                       └─────────┬─────────┘
                                 ┊ ferry
            ┌────────────────────┴───────────────┐
            │            HOLLOWPINE              │  forêt de montagne, lac
            └──────┬─────────────────────┬───────┘
                   ┊ gué                  ┊ pont
  ┌────────────────┴──┐          ┌───────┴──────────────┐      ┌─────────────┐
  │     TALLGRASS     │──pont────│        EMBER         │──────│  IRONHOOK   │
  │ savane, Halcyon   │          │ volcan (repère)      │ digue│ base, ARGOS │
  └────────┬──────────┘          └───────┬──────────────┘      └─────────────┘
           ┊ gué                         │ pont
  ┌────────┴──────────┐          ┌───────┴──────────────┐      ◦ Blackrock (prison)
  │     REDMESA       │──pont────│       CALDER         │
  │ désert, canyons   │          │ ville portuaire      │      ◦ Halcyon Cay (île privée)
  └────────┬──────────┘          └───────┬──────────────┘
           ┊ ferry                       ┊ ferry
  ┌────────┴──────────┐          ┌───────┴──────────────┐
  │     SALTMARSH     │──bayou───│       VERDANT        │
  │ delta, marais     │          │ jungle, autel        │
  └───────────────────┘          └───────┬──────────────┘
                                         ┊ récifs
                              ◦ ◦ THE SHALLOWS ◦ ◦ ◦       mangroves, îlots
                                  ◦ Épave du Meridian
                                  S
```

**Taille (décision) :** 4 096 × 4 096 tuiles (8 × 8 km), dont un peu plus de la moitié en terres. C'est l'ordre de grandeur des grands mondes ouverts récents, à l'échelle compressée habituelle.

---

## 7. Les îles une par une

Format : **biome**, **part de la surface des terres**, **densité humaine**, **faction dominante**, **proie apex**, **repère**, **lieux**, **ce qui rend l'île unique à jouer**.

### 7.1 Verdant — jungle tropicale *(point de départ)*
- **Surface :** 14 % · **Densité :** faible
- **Faction :** braconniers ; une expédition archéologique (non-combattants) avec ses gardes
- **Proie apex :** jaguar ; secondaire : crocodile, anaconda, sanglier
- **Repère :** la pyramide en ruine de l'autel yautja, au-dessus de la canopée
- **Lieux :** autel (hub des joueurs), fleuve, chutes, camp de braconniers, village sur la côte, piste d'atterrissage cachée
- **Unique :** **trois niveaux de hauteur** (sol, sous-bois, canopée) ; la caméra s'y déplace

### 7.2 The Shallows — chapelet de mangroves et de récifs
- **Surface :** 6 % · **Densité :** faible
- **Faction :** trafiquants en bateaux rapides
- **Proie apex :** crocodile marin ; requin dans les passes
- **Repère :** l'épave du cargo *Meridian*, échouée sur le récif
- **Lieux :** îlots de mangrove, passes, ponton des trafiquants, phare
- **Unique :** **marée** qui ouvre et ferme des passages entre îlots

### 7.3 Tallgrass — savane et prairies
- **Surface :** 10 % · **Densité :** faible à moyenne
- **Faction :** chasseurs de gros gibier, guides, gardes de la réserve Halcyon (en ruine)
- **Proie apex :** lion ; secondaire : buffle, hyène, guépard
- **Repère :** le lodge abandonné de Halcyon, sur une colline
- **Lieux :** lodge, enclos détruits, ranch, point d'eau, aérodrome de brousse
- **Unique :** **chasse à découvert**, herbes hautes comme seul couvert ; les troupeaux en fuite trahissent le joueur

### 7.4 Saltmarsh — delta et marais
- **Surface :** 10 % · **Densité :** faible
- **Faction :** contrebandiers, chasseurs d'alligators
- **Proie apex :** alligator ; secondaire : python, panthère
- **Repère :** la raffinerie abandonnée, avec sa torchère encore allumée
- **Lieux :** bayous, village sur pilotis, cabane de chasse, raffinerie
- **Unique :** **hydroglisseurs** bruyants ; brouillard du matin

### 7.5 Redmesa — désert et canyons, avec Dustwater
- **Surface :** 12 % · **Densité :** faible, moyenne à Dustwater
- **Faction :** milice d'une mine privée, trafiquants ; à Dustwater, shérif et adjoints
- **Proie apex :** puma ; secondaire : coyote, serpent
- **Repère :** la mesa du Chef, avec son antenne
- **Lieux :** canyons, mine à ciel ouvert, **Dustwater** (petite ville minière : rue principale, saloon, bureau du shérif, gare de minerai, cité ouvrière), ville fantôme, ranch, motel sur la route
- **Unique :** **chaleur** qui brouille le thermique le jour ; **tempêtes de sable** ; Dustwater est le **deuxième terrain urbain**, bas et horizontal (toits plats, voie ferrée), à l'opposé de Calder, dense et vertical

**Décision :** deux villes sur l'archipel : Calder et Dustwater.

### 7.6 Calder — ville portuaire *(grande ville)*
- **Surface :** 15 % · **Densité :** très forte au centre, moyenne en banlieue
- **Factions :** police, deux gangs rivaux (les Docks contre les Hauteurs), sécurité privée des tours
- **Proie apex :** aucune ; humains seulement
- **Repère :** la tour Hale, la plus haute de l'archipel
- **Lieux :** centre d'affaires, port et docks, marché, quartiers populaires, banlieue pavillonnaire, aéroport, stade, plage
- **Unique :** **toits** comme terrain de chasse ; **nombreux non-combattants** ; caméras ; la police répond vite
- **Gradient :** tours au centre → immeubles → pavillons → zones commerciales → friches → nature

### 7.7 Ember — île volcanique *(centre)*
- **Surface :** 10 % · **Densité :** très faible
- **Faction :** scientifiques (non-combattants) avec gardes, pilleurs d'obsidienne
- **Proie apex :** aucune grande ; dangers naturels
- **Repère :** **le volcan**, visible de toutes les îles, panache de fumée de jour, lueur de nuit
- **Lieux :** cratère, coulées, sources chaudes, observatoire sismique, grottes de lave
- **Unique :** **éruptions** qui changent la carte pendant une session ; le sommet offre la meilleure vue de l'archipel (révèle les lieux)

### 7.8 Hollowpine — forêt de montagne
- **Surface :** 10 % · **Densité :** faible
- **Faction :** bûcherons et leurs gardes, chasseurs
- **Proie apex :** ours brun ; secondaire : loup, élan
- **Repère :** le barrage du lac
- **Lieux :** lac, barrage, scierie, chalets, téléphérique, grottes
- **Unique :** **brouillard** et **dénivelé** ; le téléphérique traverse l'île

### 7.9 Frost Isle — toundra et glacier
- **Surface :** 8 % · **Densité :** très faible
- **Faction :** station de recherche polaire avec sa sécurité, chasseurs de fourrure
- **Proie apex :** ours polaire ; secondaire : loup arctique, morse
- **Repère :** le front du glacier
- **Lieux :** station, glacier, crevasses, baleinière échouée
- **Unique :** **froid** : jauge de chaleur corporelle ; nuits longues ; blizzard

### 7.10 Ironhook — île militaire *(zone interdite de fin)*
- **Surface :** 5 % · **Densité :** forte et armée
- **Faction :** garnison militaire, **ARGOS**
- **Proie apex :** aucune ; les humains les mieux armés de l'archipel
- **Repère :** les radars et la grande digue
- **Lieux :** base, chantier naval, laboratoire ARGOS, piste d'aviation
- **Unique :** entrer déclenche directement 3 marques d'alerte (section 12) ; c'est le **sommet du mode**

### 7.11 Îlots
| Îlot | Contenu |
| --- | --- |
| **Blackrock** | prison ; mutinerie possible ; gardiens armés, prisonniers désarmés (non-combattants sauf s'ils prennent des armes) |
| **Halcyon Cay** | l'île privée de Hale : manoir, salle des trophées humains de Hale (un écho du Yautja), gardes d'élite |
| **Le phare** | point de vue ; rendez-vous des trafiquants |
| **Épave du *Meridian*** | intérieur de cargo, trafic d'armes |
| **Plateforme Sable-7** | plateforme pétrolière au large ; tempêtes |

---

## 8. Répartition des zones

### 8.1 Par type de zone (part des terres)

| Type | Part | Où |
| --- | --- | --- |
| Urbain dense | 6 % | centre de Calder |
| Urbain et banlieue | 9 % | Calder |
| Petite ville | 2 % | Dustwater (Redmesa) |
| Villages, hameaux, ranchs | 6 % | une par île sauf Ember |
| Industriel, militaire, mines | 10 % | Ironhook, docks, Redmesa, Saltmarsh, Hollowpine |
| Agricole, prairie | 10 % | Tallgrass, abords de Calder |
| Nature sauvage | 52 % | toutes les îles |
| Îlots spéciaux | 5 % | Blackrock, Halcyon Cay, phare, épave, plateforme |

Comme dans les GTA récents, la nature occupe **plus de la moitié** : c'est le terrain de chasse. Calder est petite, dense et verticale ; Dustwater est basse et étirée le long de la route et de la voie ferrée.

### 8.2 Gradient de densité
```text
  densité humaine
  ████████  centre de Calder
  ██████    port, banlieue, Ironhook, Dustwater
  ████      villages, ranchs, mines, station polaire
  ██        camps de braconniers, de bûcherons, de trafiquants
  ░         nature
```

### 8.3 Règles de placement
- Chaque île a **un village ou un camp principal** (la faction), **2 ou 3 camps secondaires** et **un repère**.
- Les **routes** relient les lieux humains ; la nature n'a que des pistes et des passages d'animaux.
- Les **zones sauvages** ont toujours une **source d'eau** (point de chasse naturel) et un **repaire de l'apex**.
- Entre deux lieux humains, il y a toujours au moins un passage **sans témoin** possible (forêt, ravin, toit, égout).

---

## 9. Peuplement

### 9.1 Humains

| Catégorie | Armé | Statut au code | Où | Quand |
| --- | --- | --- | --- | --- |
| Civils | non | **interdit** | Calder, villages | jour surtout |
| Ouvriers, scientifiques, archéologues | non | **interdit** | mines, Ember, Verdant, Frost | jour |
| Police | oui | proie digne | Calder, Dustwater (shérif), routes | toujours ; plus la nuit après une alerte |
| Gangs | oui | proie digne | Calder (Docks, Hauteurs) | nuit surtout |
| Braconniers, chasseurs | oui | proie digne | Verdant, Tallgrass, Saltmarsh, Hollowpine, Frost | aube et crépuscule |
| Trafiquants, contrebandiers | oui | proie digne | Shallows, Saltmarsh, Redmesa, épave, phare | nuit |
| Sécurité privée | oui | proie digne | tours, mines, Halcyon Cay, station polaire | toujours |
| Militaires | oui | proie digne | Ironhook, puis partout à l'alerte 4 | toujours |
| ARGOS | oui | équipe spécialisée | Ironhook, puis partout à l'alerte 5 | toujours |

**Densité selon l'heure :** Calder est pleine de civils le jour (chasser y est difficile) et plus armée la nuit (gangs, police). La nature est plus active à l'aube et au crépuscule.

### 9.2 Faune

| Île | Apex | Secondaire |
| --- | --- | --- |
| Verdant | jaguar | crocodile, anaconda, sanglier |
| Shallows | crocodile marin | requin, raie |
| Tallgrass | lion | buffle, hyène, guépard |
| Saltmarsh | alligator | python, panthère |
| Redmesa | puma | coyote, serpent |
| Hollowpine | ours brun | loup, élan |
| Frost Isle | ours polaire | loup arctique, morse |
| Ember, Calder, Ironhook | aucun | oiseaux, chiens errants |

- **Grands individus nommés** : un par île apparaît après une condition (heure, saison, alerte basse). Ce sont les **trophées légendaires** du mode.
- La faune a ses propres habitudes : point d'eau, territoire, déplacements selon l'heure.

### 9.3 Véhicules et trafic
- Calder : voitures, bus, camions, scooters ; ferries vers les îles voisines.
- Îles : 4×4, quads, camions de mine, hydroglisseurs, bateaux rapides, motoneiges (Frost), avions de brousse (Tallgrass).
- Le Yautja ne conduit pas, mais il peut **monter sur un véhicule** en marche (toit d'un camion, pont d'un ferry), camouflé.

---

## 10. Se déplacer

| Moyen | Usage |
| --- | --- |
| Course, saut, escalade | base ; murs, falaises, arbres, toits |
| Grappin *(proposé)* | traverser une rue, un ravin, monter à un toit |
| Nage | courtes passes, chenaux ; la nage révèle le camouflage |
| Ponts | relient les îles proches ; gardés selon l'alerte |
| Gués | à marée basse seulement (Verdant–Shallows, Tallgrass–Redmesa) |
| Ferries humains | monter à bord camouflé ; trajet rapide, risque d'être vu |
| Vaisseau personnel | **Décision :** voyage rapide vers un **repaire** découvert ; jamais à Calder ni à Ironhook |
| Téléphérique | Hollowpine |

**Repaires :** comme les planques de GTA. Un par île, à découvrir (grotte, toit, épave). On y sauvegarde, change d'équipement, expose ses trophées, et le vaisseau peut y venir.

---

## 11. Boucle de jeu en monde ouvert

### 11.1 Ce que le joueur fait
1. Il arrive au **repaire** de son choix (ou à l'autel de Verdant en ligne).
2. Il **explore** : biomask, traces, écoute des radios.
3. Il trouve des **activités** sur la carte (section 11.2) ou chasse librement.
4. Il **chasse** : repérage, traque, mise à mort, trophée, nettoyage (boucle Terre, sans phase de vaisseau).
5. Il **perd l'alerte** s'il en a une (section 12).
6. Il **rapporte** ses trophées à un repaire pour les garder.

Un trophée **non rapporté** est perdu si le joueur meurt.

### 11.2 Activités

| Activité | Contenu | Lien GTA |
| --- | --- | --- |
| **Contrats de l'autel** | proies désignées, gravées sur l'autel de Verdant ; renouvelés chaque jour de jeu | missions données par un lieu fixe |
| **Prime** | un humain dangereux nommé (chef de gang, braconnier célèbre) ; se déplace sur la carte | cibles mobiles |
| **Légendaire** | grand animal nommé d'une île, avec ses conditions d'apparition | quêtes de chasse rares |
| **Événement aléatoire** | trafic interrompu, braconniers en action, fusillade de gangs, animal échappé en ville, accident | événements aléatoires |
| **Épreuve** | parcours chronométré dans un lieu (canopée, toits, canyon) | défis |
| **Repaire** | découvrir et ouvrir le repaire d'une île | planques |
| **Collection** | fragments gravés de l'autel cachés sur toutes les îles : ils racontent la chasse ancienne | objets cachés |
| **Siège d'Ironhook** | raid de fin, en coop | braquage final |

### 11.4 Mort en chasse libre (décision)
- Le joueur réapparaît au **dernier repaire** visité.
- Les **trophées portés** (non rapportés) tombent sur place. Ils y restent **10 minutes de jeu** : le joueur peut revenir les chercher ; en ligne, un autre joueur peut les prendre (il les rapporte comme « trophée repris », honneur réduit de moitié).
- Les marques d'alerte retombent à 0. **Exception :** si le joueur était au niveau 5, il réapparaît au **niveau 3** (ARGOS se souvient pendant la session) ; réapparaître au repaire ne compte pas comme y être rentré vivant.
- Aucune perte de réputation ni d'équipement.

### 11.3 Code d'honneur dans le mode
- Les mêmes interdits que sur Terre : non-combattants, désarmés, technologie laissée.
- Une faute fait baisser la **réputation des Îles** (section 14) et peut faire de toi un **Bad Blood des Îles** : les autres joueurs voient ta marque et gagnent une prime en te chassant (section 13).

---

## 12. Marques d'alerte

C'est l'équivalent des étoiles de recherche de GTA, en glyphes yautja. Elles sont **propres à la session** et séparées de l'Indice de Discrétion de la campagne.

| Marques | Réponse | Ce qui arrive |
| --- | --- | --- |
| 0 | rien | monde normal |
| 1 | police locale, gardes | patrouilles qui fouillent la zone, lampes |
| 2 | police renforcée | barrages sur les ponts, hélicoptère avec projecteur |
| 3 | unité tactique | équipes casquées, capteurs thermiques, chiens |
| 4 | armée (garnison d'Ironhook) | ponts fermés, drones, véhicules blindés |
| 5 | **ARGOS** | équipes spécialisées, brouilleurs, filets ; chasse au joueur sur tout l'archipel |

**Ce qui les fait monter :** être vu en train de tuer, une image envoyée, une fusillade prolongée, un non-combattant tué, entrer à Ironhook (3 directement).

**Ce qui les fait tomber :**
- sortir de la **zone de recherche** (cercle sur la carte) et y rester caché un moment ;
- rester camouflé et immobile hors de vue ;
- détruire les appareils qui ont filmé ;
- rentrer **vivant** à un repaire : efface toutes les marques, **y compris le niveau 5**. C'est la seule façon de perdre le niveau 5 (révision du 22 novembre, après revue).

---

## 13. En ligne

### 13.1 Sessions
- **Décision : 8 joueurs** au plus par session, plus les Yautja en IA en solo.
- Les joueurs peuvent former des **groupes de chasse** (jusqu'à 4) qui partagent marques, objectifs et trophées de groupe.
- **Règle de l'archipel :** pas de combat entre joueurs, sauf dans les modes qui le prévoient et contre un Bad Blood des Îles.

### 13.2 Modes en ligne

| Mode | Joueurs | Durée | Règle |
| --- | --- | --- | --- |
| **Chasse libre** | 1–8 | libre | monde ouvert, activités, coop par groupes |
| **Contrat de groupe** | 2–4 | 15–25 min | un contrat de l'autel plus difficile, pour un groupe |
| **Course aux trophées** | 2–8 | 20 min | le plus d'honneur en trophées rapportés ; les vols de mise à mort sont permis |
| **Grand gibier** | 2–8 | 30 min | un légendaire apparaît, le premier qui le tue proprement gagne |
| **Siège d'Ironhook** | 4 | 40 min | raid de fin, en plusieurs étapes |
| **Chasse au Bad Blood** | 1 contre 1–3 | libre | décision de la bible (invasion Enforcer ↔ Bad Blood), adaptée au monde ouvert |
| **Chasse inversée** (**décision : prioritaire**) | 1 Yautja contre 4–6 humains joués | 15 min | les humains gagnent en **fuyant l'île ou en tenant** jusqu'à la fin ; le Yautja chasse selon le code (section 13.3) |

### 13.3 Chasse inversée — mode phare

**Décisions :** gardée et prioritaire ; les humains gagnent en fuyant l'île ou en tenant jusqu'à la fin du temps.

#### Le principe
Un joueur incarne le Yautja. Quatre à six joueurs incarnent une **équipe humaine** lâchée sur une île des Îles. Le Yautja chasse ; les humains doivent **sortir de l'île** ou **tenir 15 minutes**. La vue isométrique sert le mode : chaque humain ne voit que ce que son personnage voit (cône de vision et brouillard), alors que le Yautja voit à travers son biomask.

#### Déroulé d'une partie (15 min)
| Moment | Humains | Yautja |
| --- | --- | --- |
| 0:00 – 0:30 | arrivée en groupe (bateau, 4×4 ou hélicoptère selon l'île) ; choix du chemin | descente du vaisseau, loin d'eux ; il ne sait pas où ils sont |
| 0:30 – 5:00 | trouver les **3 pièces** de la sortie (section suivante), poser des pièges | repérage, traces, isoler un premier humain |
| 5:00 – 12:00 | appeler l'**extraction** à la radio ; se regrouper | chasse ; il peut attaquer la radio ou le point d'extraction |
| 12:00 – 15:00 | rejoindre l'extraction, ou tenir jusqu'à la fin | tout faire pour qu'aucun ne parte |

#### Conditions de victoire
| Camp | Victoire | Score |
| --- | --- | --- |
| Humains | **fuite** : au moins un humain monte dans l'extraction | victoire nette ; points par humain sorti |
| Humains | **tenir** : au moins deux humains en vie à 15:00 | victoire de survie ; moins de points que la fuite |
| Humains | **abattre le Yautja** | victoire, mais le Yautja peut déclencher son autodestruction (plus bas) |
| Yautja | aucun humain ne fuit et moins de deux en vie à 15:00 | victoire ; honneur selon la manière |
| Yautja | tous les humains tués et leurs trophées pris | victoire parfaite |

#### Les pièces de la sortie (selon l'île)
| Île | Pièce 1 | Pièce 2 | Pièce 3 | Extraction |
| --- | --- | --- | --- | --- |
| Verdant | radio du camp de braconniers | batterie du générateur | fusées éclairantes | hydravion sur le fleuve |
| Tallgrass | clés de l'avion de brousse | carburant | carte du terrain | aérodrome de brousse |
| Saltmarsh | hélice de l'hydroglisseur | carburant | radio | bayou vers la mer |
| Redmesa (Dustwater) | aiguillage de la voie ferrée | clé de la locomotive | radio du shérif | train de minerai |
| Hollowpine | courant du téléphérique | clé de la cabine | radio | téléphérique vers le col |
| Calder (docks, nuit) | badge du port | clé de vedette | radio | vedette dans le port |
| Frost Isle | carburant de motoneige | balise de détresse | carte | avion de la station |
| Gull Pier (nuit) | jeton de la salle des machines | fusible de la grande roue | radio du gardien | bateau sous le ponton |
| Ashgrove (Grayhaven) | code du mur | batterie de l'hôpital | fusées | hélicoptère au-delà du mur |

L'emplacement des pièces change à chaque partie (3 positions possibles pour chacune).

#### Les rôles humains (décision : les 6, originaux)
| Rôle | Arme | Capacité | Faiblesse |
| --- | --- | --- | --- |
| **Pisteur** | fusil de chasse | lit les traces du Yautja (eau, sang, branches) pendant 8 s | arme lente |
| **Tireur** | fusil à lunette | marque une distorsion repérée pour toute l'équipe | faible au corps à corps |
| **Démolisseur** | fusil à pompe | 3 pièges (mine, fil, filet) | lent |
| **Médecin** | pistolet | relève un équipier à terre deux fois plus vite ; 2 fusées éclairantes | peu de dégâts |
| **Radio** | fusil d'assaut | appelle l'extraction plus vite ; brouille le biomask 5 s une fois | bruyant |
| **Garde de la réserve** | carabine | voit les animaux et les fait fuir | aucune protection |

Chaque équipe a au plus un rôle de chaque type. Les rôles se débloquent avec le niveau du joueur côté humain (cosmétiques et variantes, jamais d'arme plus forte).

#### Le code d'honneur en jeu
- Le Yautja ne gagne de l'honneur que sur les **humains armés**.
- **Se rendre :** un humain peut **jeter son arme**. Il devient non-combattant : le Yautja ne peut plus le tuer sans faute grave. En échange, il ne peut ni reprendre d'arme pendant 90 s, ni porter une pièce, ni utiliser la radio. S'il atteint l'extraction désarmé, il compte à moitié. Un Yautja qui tue un humain rendu **perd la partie** sur-le-champ.
- **Duel :** quand il ne reste qu'un humain armé, il peut défier le Yautja ; si le Yautja accepte (masque et armes à distance retirés), un duel au corps à corps décide de la partie. Le vainqueur humain fuit automatiquement.

#### Humains à terre
- Un humain blessé tombe **à terre** : ses équipiers ont 30 s pour le relever.
- Le Yautja peut prendre son **trophée** (6 à 12 s, camouflage coupé, comme sur Terre) : l'humain est éliminé.
- Un humain à terre peut tirer au pistolet.

#### Le Yautja
- Le Yautja de la campagne du joueur, avec apparence et équipement ; **statistiques ramenées à l'équilibre du mode** (même règle que The Pit en classé).
- Équipement : lames, combistick, disque, plasma (surchauffe), filet, camouflage, biomask, imitation de voix (3 phrases).
- **Autodestruction :** si le Yautja tombe à 0, il peut la déclencher : les humains ont 10 s pour sortir du rayon. S'ils en sortent tous, victoire humaine parfaite ; sinon, ceux restés dedans sont éliminés.

#### Faune et monde
- La faune de l'île est présente et hostile à tous. Elle sert le Yautja (diversion) comme les humains (le Garde la fait fuir).
- Météo et heure tirées au début : la nuit favorise le Yautja ; la pluie révèle son camouflage.
- Les civils sont absents de ce mode (zones évacuées) : pas de non-combattant hors des humains rendus.

#### Voix (décision)
- **Voix de proximité** : les humains s'entendent à environ 20 m ; à travers un mur, la voix est étouffée.
- **Radio** : le rôle Radio porte un poste qui relie toute l'équipe, quelle que soit la distance. Les autres rôles peuvent ramasser des talkies sur la carte (portée limitée, piles).
- **Le Yautja entend** la voix de proximité des humains proches (comme un animal entend) et peut **écouter la radio** en mode électromagnétique du biomask. Il peut **enregistrer 3 phrases** et les rejouer sur la radio ou à voix haute (imitation de voix, règle de la campagne).
- Les humains peuvent couper leur radio pour ne pas être écoutés, mais perdent alors le lien d'équipe.
- Le Yautja n'a pas de voix : il communique par ses clics, entendus de près.

#### Matchmaking et progression
- 5 humains par défaut ; 4 ou 6 en partie privée.
- File séparée pour le Yautja (rôle demandé) et les humains.
- Deux progressions distinctes : **niveau de chasseur** (cosmétiques du Yautja, gravures) et **niveau de survivant** (tenues, variantes de rôle).

#### Ce qu'il faut créer pour ce mode
- Vision par joueur : cône de vision humain, brouillard ; vue biomask du Yautja.
- 6 rôles humains jouables : animations isométriques 8 directions, armes, capacités.
- 7 cartes de partie (une par île citée), avec 3 positions par pièce et une extraction.
- Interface humaine : santé, munitions, pièces trouvées, chrono, statut d'équipe, alerte « distorsion repérée ».
- Interface Yautja : honneur de la partie, humains repérés, chrono.
- Règles serveur : rendre les armes, duel, autodestruction, victoire.
- Sons : respiration et cœur des humains quand le Yautja est proche, clics du Yautja, radio, extraction qui arrive.

### 13.4 Réseau *(proposé)*
- Le dépôt utilise déjà Cloudflare (Wrangler) : une session serait un **Durable Object** qui tient l'état de l'archipel (joueurs, alertes, proies importantes).
- Les humains et la faune ordinaires sont simulés **près des joueurs seulement**, par zones de 32 × 32 tuiles.
- Positions envoyées 15 fois par seconde ; actions importantes (mise à mort, trophée, image envoyée) validées par le serveur.

---

## 14. Progression du mode

### 14.1 Ouverture des îles
Comme les ponts de GTA III, les îles s'ouvrent par groupes. **Décision :** la raison dans le monde est un **cordon naval d'ARGOS** (bouées sonar, patrouilles) isole des groupes d'îles. Le joueur le lève par des actions de sabotage.

| Étape | Îles ouvertes | Ce qui ouvre l'étape suivante |
| --- | --- | --- |
| 1 | Verdant, The Shallows, Tallgrass | réputation 3 + sabotage des **bouées du sud** (sur les Shallows) |
| 2 | + Saltmarsh, Redmesa, Hollowpine | réputation 5 + sabotage du **relais du barrage** (sur Hollowpine) |
| 3 | + Ember, Calder, Eastbank, îlots | réputation 7 + sabotage du **radar d'Ember** (mission I-MP-06, sur Ember) |
| 4 | + Frost Isle | réputation 9 + fin de l'arc Hale (I-MP-08, sur Frost Isle) |
| 5 | + **Grayhaven** (révision du 22 novembre) | réputation 10 |
| 6 | + Ironhook | — (siège d'Ironhook) |

**Règle (révision du 22 novembre, après revue) :** chaque sabotage se trouve sur une île **déjà ouverte** à l'étape où il est demandé. Les trois points du cordon sont, dans l'ordre : les bouées du sud, le relais du barrage, le radar d'Ember.

En ligne, une session prend l'ouverture de l'**hôte** ; les invités gardent leur propre progression.

### 14.2 Réputation des Îles
- Niveaux 1 à 10, gagnés par l'honneur dans le mode.
- Chaque niveau donne : une teinte de camouflage, une gravure de masque, un emplacement de trophée, un repaire plus grand.
- Une faute grave fait perdre un niveau ; trois fautes font de toi un Bad Blood des Îles jusqu'à une **chasse de rachat**.

### 14.3 Salle des trophées des Îles
Un repaire principal (au choix du joueur) expose les trophées du mode, avec leur provenance. Elle est visible par les autres joueurs qui le visitent en ligne.

---

## 15. Production

### 15.1 Ce qu'il faut créer

**Technique**
- **Moteur isométrique 3D** : le dépôt n'a pas encore de bibliothèque 3D. **Décision : three.js** (WebGL2). Grille de tuiles, volumes par blocs regroupés (meshing par zones de 32 × 32 tuiles), instanciation des objets répétés.
- **Streaming de la carte** : chargement des zones autour du joueur.
- **Caméra** : 4 rotations, 3 zooms, anticipation, transparence des obstacles.
- **Éditeur de tuiles** : outil interne pour peindre les îles (sol, hauteur, biome, objets, zones de peuplement).
- **Simulation** : peuplement par zone et par heure, trafic, faune, factions.
- **Alerte** : marques, zone de recherche, escalade.
- **Réseau** : sessions, synchronisation, validation serveur.

**Données**
- `islesMap` : grille, hauteurs, biomes, zones de peuplement, routes, repaires.
- `islesIslands` : 10 îles + 5 îlots (faction, apex, repère, lieux).
- `islesPopulation` : tables de peuplement par type de zone et par heure.
- `islesActivities` : contrats, primes, légendaires, événements, épreuves.
- Sauvegarde du mode : `profile.islesV1` (réputation, îles ouvertes, repaires, trophées, statut Bad Blood).

**Art**
- **Tuiles** par biome (environ 40 par biome × 9 biomes, plus la ville).
- **Bâtiments** : ville (tours, immeubles, pavillons, port), villages, camps, base militaire, station polaire, ruines.
- **Personnages** à 8 directions : civils, police, gangs, braconniers, trafiquants, militaires, ARGOS, scientifiques.
- **Faune** : 7 apex et environ 15 espèces secondaires.
- **Véhicules** : une quinzaine.
- **Le Yautja** en isométrique : course, saut, escalade, nage, mêlée, armes, camouflage, prélèvement de trophée.

**Son**
- Ambiance par île, ville de jour et de nuit, radios de police et de gangs, sirènes par niveau d'alerte.
- Musique : thème des Îles, thème d'alerte qui monte avec les marques, thème du siège d'Ironhook.

### 15.2 Ordre de production
1. **Prototype de vue** (three.js) : une petite île de test, caméra, Yautja qui court, saute, grimpe, se camoufle.
2. **Réseau minimal** : 2 puis 6 joueurs sur l'île de test.
3. **Chasse inversée sur Verdant** (mode phare) : 1 Yautja contre 5 humains, 6 rôles, pièces, extraction, règles du code.
4. **Tranche verticale du monde ouvert : Verdant** en chasse libre (faune, braconniers, autel, contrats, trophées, alerte 1 à 3).
5. **Chasse inversée** sur Tallgrass, Saltmarsh et Hollowpine.
6. **Calder** et **Dustwater** : villes, densité, police, gangs, toits, alerte 1 à 4 ; Chasse inversée sur les docks et à Dustwater.
7. **Îles restantes**, une par une ; Frost Isle et sa carte de Chasse inversée.
8. **Ironhook**, ARGOS, siège.
9. **Autres modes en ligne** (course aux trophées, grand gibier).

**Avancement du prototype intégré :** étapes 1 et 3 jouables hors ligne, avec l'île de test et la Chasse inversée en solo contre l'IA. L'étape 2 (salle réseau) reste séparée. [Prototype V1](ISLES_PROTOTYPE_V1_20261123.md).

### 15.3 Tests
- Caméra : aucun moment où le joueur est caché derrière un décor sans transparence.
- Code : un non-combattant n'est jamais une cible valide ; une faute fait baisser la réputation.
- Alerte : les niveaux 1 à 4 tombent hors de la zone de recherche ; le niveau 5 ne tombe qu'en **rentrant vivant** à un repaire ; après une mort au niveau 5, le joueur réapparaît au niveau 3.
- Ouverture : une île fermée est inaccessible même à la nage (cordon).
- Réseau : une mise à mort contestée par deux joueurs est attribuée une seule fois.
- Sauvegarde : migration sans `islesV1`, aller-retour JSON.

---

## 16. Questions ouvertes

Aucune : toutes les questions du mode sont tranchées (décisions en tête du document).

---

## 17. Arc Hale

**Décision :** un fil narratif en 8 étapes dans le monde ouvert. Il se joue en solo ou en groupe (progression de l'hôte).

### 17.1 Augustin Hale
- Le magnat qui a fondé Halcyon dans les années 1990. On le croit mort ou ruiné.
- En réalité, il vit **reclus sur Halcyon Cay**, très âgé, avec une garde d'élite.
- Hale a toujours su : enfant, il a vu une chasse yautja. Toute sa vie, il a imité les chasseurs : sa réserve, sa **salle des trophées humains** (les braconniers qu'il a fait abattre), son code à lui, perverti.
- Son but final : **prendre un crâne de Yautja**, pour devenir à ses yeux leur égal.

### 17.2 Les 8 étapes *(proposé)*
| Étape | Île | Contenu | Ouverture |
| --- | --- | --- | --- |
| 1. L'appât | Verdant | des braconniers chassent avec des armes trop modernes ; le joueur découvre qu'ils sont payés pour attirer un Yautja | réputation 1 |
| 2. Les enclos | Tallgrass | au lodge abandonné, des archives de Halcyon : Hale avait des caméras partout, et des images d'un Yautja en 1997 | réputation 2 |
| 3. Le guide | Hollowpine | un chasseur légendaire engagé par Hale piste le joueur ; duel ou mise à mort | réputation 4 |
| 4. L'argent | Calder | la tour Hale : remonter la piste de l'argent par les toits, sans civil touché | étape 3 + île ouverte |
| 5. Le marché | Dustwater | Hale achète une arme yautja volée à un trafiquant ; la reprendre (technologie laissée = faute) | réputation 6 |
| 6. Le cordon | Ember | Hale paie ARGOS en secret pour garder le cordon fermé ; saboter le radar du volcan | étape 5 |
| 7. La salle | Halcyon Cay | infiltration du manoir ; la salle des trophées de Hale ; il s'enfuit | réputation 8 |
| 8. La chasse de Hale | Frost Isle | Hale, armé d'une arme yautja montée sur armure, chasse le joueur sur le glacier | étape 7 |

### 17.3 La fin
- **Combat final** en 3 phases : Hale chasse le joueur (il voit le camouflage grâce à un masque volé) ; Hale perd l'arme yautja ; Hale, vieil homme, sans arme.
- **Choix final :**
  - **l'achever** quand il est désarmé : faute grave, la réputation tombe et le joueur devient Bad Blood des Îles ;
  - **le laisser mourir dans le froid** : neutre ;
  - **le laisser à ARGOS** (qui arrive) : ARGOS découvre la salle des trophées et l'arme yautja ; le cordon tombe pour de bon.
- Récompense : l'**arme yautja récupérée** rendue à l'autel (honneur et un emplacement de trophée légendaire), le masque volé de Hale en trophée.

### 17.4 À créer
- Hale (3 âges en archives : 1990, 1997, aujourd'hui), sa garde d'élite, le guide légendaire.
- Halcyon Cay : manoir, salle des trophées, quai.
- 8 missions scriptées dans le monde ouvert, avec scènes courtes en vue isométrique.

---

## 18. Saisons

**Décision :** des **saisons de 8 semaines**.

### 18.1 Contenu d'une saison *(proposé)*
| Élément | Contenu |
| --- | --- |
| Événement de monde | un changement de la carte pendant toute la saison |
| Légendaires | 2 nouveaux grands animaux ou humains nommés |
| Contrats de saison | 10 contrats de l'autel, propres à la saison |
| Chasse inversée | une nouvelle carte ou une variante de règle |
| Cosmétiques | gravures, teintes, ornements, tenues humaines ; gagnés en jouant |
| Classement | honneur de saison et victoires en Chasse inversée |

### 18.2 Exemples de saisons
| Saison | Événement de monde |
| --- | --- |
| 1. L'ouragan | un ouragan traverse l'archipel ; inondations à Saltmarsh, ponts coupés, ferries arrêtés |
| 2. L'éruption | Ember entre en éruption ; nouvelles coulées, villages évacués, cendres qui brouillent le thermique |
| 3. Le marché noir | une grande vente d'armes à Dustwater attire des trafiquants du monde entier |
| 4. L'été polaire | la glace de Frost Isle fond ; passages nouveaux, ours polaires affamés |
| 5. La mutinerie | Blackrock se soulève ; prisonniers armés sur Calder |
| 6. L'invasion | une ruche Xénomorphe sur Ironhook, échappée d'un labo ; purge en coop |

### 18.3 Règles
- L'arc Hale et l'ouverture des îles restent les mêmes d'une saison à l'autre.
- Les cosmétiques de saison restent acquis après la saison.
- Rien ne s'achète avec de l'argent réel dans ce document (à décider à part).

### 18.4 À créer
- Système de saisons (calendrier, événements de monde activables, contrats, classement).
- Une variante de carte par événement de monde.
