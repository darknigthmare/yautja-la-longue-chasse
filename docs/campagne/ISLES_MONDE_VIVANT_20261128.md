# The Isles — Le monde vivant : routes, bâtiments, transports, faune, flore, météo et relief

28 novembre 2026 · @darknigthmare

Cette fiche dit **tout ce que le monde doit contenir**, île par île et zone par zone : les routes, les bâtiments, les objets du décor (props), les moyens de transport, la faune, la flore, la météo, le relief et la verticalité. Elle complète [L'archipel, île par île](ISLES_ARCHIPEL_ZONES_20261128.md), qui décrit les lieux et ce qu'on y joue, et le [mode The Isles](MODE_THE_ISLES_20261121.md), qui fixe les règles.

**Source chiffrée.** Tous les nombres de cette fiche viennent de `app/game/data/islesLivingWorldV1.json`. Les zones (« id nom ») viennent de `app/game/data/islesArchipelagoV1.json`. Si un nombre de la fiche et un nombre des données diffèrent, ce sont les données qui ont raison et la fiche qu'il faut corriger.

**Les quatre décisions du propriétaire du 28 novembre 2026**

| N° | Décision | Ce que cela veut dire |
| --- | --- | --- |
| 1 | Les transports sont utilisables par le Predator | il ne conduit pas : il **monte dessus** (toit, pont, benne, remorque, patin) et se laisse porter |
| 2 | Le relief est à la vraie échelle | les altitudes sont en mètres réels : le mont Hollow fait 1 850 m, pas une centaine de mètres |
| 3 | La météo a des effets de jeu | chaque temps change le camouflage, la vue des humains, la vision thermique, le bruit et la vitesse |
| 4 | Des volumes simples partout, puis des modèles 3D pour l'essentiel | tout existe d'abord en volumes ; les modèles viennent ensuite pour ce qui compte le plus |

**Règle de lecture.** Ce qui est chiffré vient des données. Ce qui répartit les éléments d'une île entre ses zones est **proposé** par cette fiche : les données rangent routes, bâtiments, props, faune et flore par île, pas encore par zone. La section 11 liste tout ce qui reste à valider.

---

## 1. Ce que la fiche couvre

| Sujet | Section | Clé des données |
| --- | --- | --- |
| Règles de cohérence | 2 | `coherence` |
| Routes | 3 | `roadTypes`, `islands.*.roads` |
| Relief et verticalité | 4 | `relief` |
| Météo | 5 | `weatherTypes`, `weatherRules` |
| Transports et lignes | 6 | `transports`, `lines` |
| Faune | 7 | `species`, `islands.*.fauna` |
| Flore | 8 | `flora`, `islands.*.flora` |
| Île par île, zone par zone | 9 | `islands` et les zones de l'archipel |
| État d'application | 10 | — |
| Points à valider | 11 | — |

---

## 2. Règles de cohérence

Le monde doit rester logique. Un joueur doit pouvoir deviner où il est rien qu'en regardant la route, les arbres et les bêtes. Les huit règles ci-dessous sont celles de la liste `coherence` des données.

| N° | Règle des données | Explication |
| --- | --- | --- |
| 1 | pas de métro hors de Calder et de la Jumelle est | un métro demande une grande ville. Il n'y en a pas dans la savane, ni dans le marais, ni sur le glacier. La ligne des stades finit à l'entrée d'Eastbank, juste après le pont de la Jumelle est |
| 2 | pas de voie ferrée sur les îles sans ville ni industrie (Frost Isle, Highland Isle, Tallgrass, Verdant, Halcyon Cay, The Shallows, Saltmarsh, Ember) | le rail sert à porter des voyageurs ou des marchandises. Sans ville ni usine, personne ne le construit |
| 3 | pas de voie rapide hors de Calder, d'Eastbank et de Steelwater | la voie rapide relie la métropole, les commerces et le port. Ailleurs, la route simple suffit |
| 4 | avions de ligne seulement entre de vraies pistes ; avions de brousse sur les pistes en terre | un avion de ligne ne se pose pas dans l'herbe. Les pistes en terre de Tallgrass, de Verdant et de la station polaire reçoivent l'avion de brousse |
| 5 | pas de palmier au nord, pas de pin dans la jungle, pas de cactus hors de Redmesa | chaque arbre a son climat. Le cactus est la signature du désert |
| 6 | un apex par climat : ours polaire, ours brun, jaguar, lion, alligator, requin ; aucun grand prédateur en liberté dans les villes | chaque milieu a un seul roi. En ville, le danger vient des humains, pas des bêtes |
| 7 | neige seulement au-dessus de la limite des neiges, sauf sur Frost Isle | la neige suit l'altitude. Seule Frost Isle est sous la neige jusqu'à la mer |
| 8 | les transports de mer et d'air s'arrêtent pendant une tempête tropicale | personne ne sort par ce temps. Les îles du sud peuvent se retrouver coupées du monde |

Ces règles sont vérifiées par le test `tests/isles-living-world-v1.test.mjs`.

---

## 3. Routes

Une tuile vaut 2 m. La demi-largeur des données est en tuiles. La largeur réelle est donc : demi-largeur × 2 × 2 m, soit demi-largeur × 4.

### 3.1 Les dix types de routes

| Id | Nom | Demi-largeur (tuiles) | Largeur réelle | Surface | Vitesse limite | Où on le trouve |
| --- | --- | --- | --- | --- | --- | --- |
| `highway` | voie rapide | 7 | 28 m | `road` (bitume) | 110 | métropole, industrie, commerces |
| `road` | route | 3,5 | 14 m | `road` (bitume) | 70 | partout où il y a une ville ou un village |
| `street` | rue | 2,5 | 10 m | `road` (bitume) | 30 | grilles de ville, lotissements, zones bâties |
| `track` | piste | 2 | 8 m | `mud` (terre) | 40 | jungle, savane, désert, marais, toundra, lande |
| `trail` | sentier | 1 | 4 m | `mud` (terre) | 0 | montagne, falaises, jungle profonde ; à pied seulement |
| `rail` | voie ferrée | 2 | 8 m | `rail` | 90 | Calder, Eastbank, Steelwater, Hollowpine sud, mine de Redmesa |
| `metro` | métro (aérien dans The Heights, souterrain ailleurs) | 2 | 8 m | `rail` | 60 | Calder et la Jumelle est seulement |
| `boardwalk` | ponton et passerelle | 1,5 | 6 m | `road` (planches) | 0 | marais, mangroves, marinas, jetées |
| `bridge` | pont ou digue | 3,5 | 14 m | `road` (bitume) | 70 | liaisons entre îles |
| `ford` | gué | 3,5 | 14 m | `ford` (eau peu profonde) | 10 | Redmesa–Tallgrass, Tallgrass–Saltmarsh, Verdant–The Shallows |

Une vitesse limite de 0 veut dire : aucun véhicule, on y va à pied. Les sentiers et les pontons sont donc des chemins sans trafic, bons pour approcher sans témoin.

### 3.2 Les routes de chaque île

| Île | Types de routes |
| --- | --- |
| Frost Isle | piste, sentier, ponton et passerelle |
| Highland Isle | piste, sentier |
| Hollowpine | route, rue, piste, sentier, voie ferrée, pont ou digue |
| Calder | voie rapide, route, rue, voie ferrée, métro, sentier, pont ou digue |
| Solana | route, rue, piste, sentier |
| Grayhaven | route, rue, piste, pont ou digue |
| Saltmarsh | route, piste, ponton et passerelle, gué |
| Ember | route, piste, sentier |
| Eastbank | voie rapide, route, rue, voie ferrée, ponton et passerelle, pont ou digue |
| Redmesa | route, piste, sentier, voie ferrée, gué |
| Tallgrass | piste, sentier, gué |
| Halcyon Cay | piste, sentier, ponton et passerelle |
| Steelwater | voie rapide, route, rue, voie ferrée, pont ou digue |
| Verdant | piste, sentier, ponton et passerelle, gué |
| The Shallows | ponton et passerelle, gué, sentier |

### 3.3 Ce que les routes changent pour la chasse

- **Une route est un lieu de passage, donc un lieu de témoins.** Plus elle est large, plus il y a de monde et de phares.
- **La surface compte.** La terre des pistes garde les traces. Le bitume n'en garde pas. Le gué mouille le Predator : l'eau trahit le camouflage.
- **Les ponts sont des goulots.** Selon l'alerte, ils sont gardés ou fermés (voir le mode, section 12).
- **Le rail et le métro se suivent à pied.** Un tunnel de métro traverse la ville sans témoin entre deux rames.

---

## 4. Relief et verticalité

Les altitudes sont en mètres au-dessus de la mer, à la vraie échelle. Le terrain monte par **terrasses de 3 m** : c'est la hauteur d'une marche de relief dans le monde en tuiles.

### 4.1 Le sommet de chaque île

Les îles sont rangées de la plus haute à la plus basse.

| Île | Sommet | Altitude | Limite des neiges | Limite des arbres | Formes du relief |
| --- | --- | --- | --- | --- | --- |
| Hollowpine | mont Hollow | 1 850 m | 1 300 m | 1 000 m | chaîne au nord, lac d'altitude, vallées glaciaires, piémont et plaine agricole au sud |
| Ember | l'Ember | 1 480 m | aucune | 500 m | stratovolcan, cratère et lac de lave, coulées, fumerolles, côte de basalte |
| Calder | mont Calder | 920 m | aucune | 800 m | montagne au nord autour du lac de retenue, collines de l'est (jusqu'à 400 m), plaine urbaine au sud |
| Solana | monte Solana | 760 m | aucune | 650 m | crête calcaire, terrasses de culture, calanques |
| Frost Isle | dôme du glacier | 680 m | 0 m (la neige descend jusqu'à la mer) | 0 m (aucun arbre) | calotte, crevasses, moraines, grève basse |
| Grayhaven | les Hauts | 540 m | aucune | 500 m | plateau boisé au nord, cuvette de l'incident, plaine d'Ashgrove |
| Redmesa | la Table rouge | 420 m | aucune | 0 m (aucun arbre) | mesas à sommet plat, canyons de 80 à 150 m, dunes, lit de rivière à sec |
| Verdant | la Sœur de pierre | 380 m | aucune | 380 m (jungle jusqu'au sommet) | piton rocheux, gorge du fleuve, chutes, collines couvertes de jungle |
| Highland Isle | le Ben | 310 m | aucune | 150 m | plateau de lande, falaises de 80 à 120 m, aiguilles en mer |
| Eastbank | les hauteurs | 180 m | aucune | 180 m (boisé jusqu'en haut) | crêtes au nord et à l'est, cuvette commerciale |
| Tallgrass | kopje du lodge | 140 m | aucune | 140 m | plaine d'herbes, kopjes de granit, lit du point d'eau |
| Halcyon Cay | la butte du manoir | 90 m | aucune | 90 m | butte centrale, plages, récif |
| Steelwater | terril de la carrière | 25 m | aucune | 25 m | terre-pleins plats, quais, carrière en creux |
| Saltmarsh | levée de Bayou Cross | 6 m | aucune | 6 m | levées, chenaux, bancs de vase |
| The Shallows | dune de Coral Key | 4 m | aucune | 4 m | cayes plates, lagons, récif |

### 4.2 Les hauteurs bâties

| Élément | Hauteur |
| --- | --- |
| Plus haute tour de Calder | 310 m |
| Tours courantes de Calder | de 40 à 180 m |
| Cheminée de Steelwater | 120 m |
| Phare | 33 m |

Les tours restent sous les sommets : 310 m contre 920 m pour le mont Calder. Vue de la mer, la ville est donc dominée par sa montagne, et non l'inverse.

### 4.3 Ce que la verticalité change pour le Predator

| Élément | Ce qu'il apporte |
| --- | --- |
| Escalade | murs, falaises, troncs, pylônes et façades se grimpent. Monter prend du temps : plus c'est haut, plus il faut choisir sa voie |
| Points de vue | chaque île a au moins un point haut d'où l'on repère les proies : sommet, phare, tour, antenne, mirador |
| Chutes | une chute de falaise, de tour ou de crevasse blesse ou tue. C'est vrai aussi pour les proies : une poussée au bord du vide est une mise à mort |
| Toits | en ville, les toits forment une seconde carte au-dessus de la rue. On y échappe aux passants, pas aux pigeons, qui s'envolent |
| Canopée | dans la jungle, les géants de 28 à 45 m portent un niveau praticable : on traverse Verdant sans toucher le sol |
| Falaises | sur Highland Isle, Solana et Redmesa, la falaise sépare deux mondes : le plateau et la mer, la mesa et le canyon |
| Dessous | métro, égouts, galeries de mine, tunnels de lave, grottes : la verticalité descend aussi sous le sol |
| Froid d'altitude | au-dessus de 1 300 m, la pluie devient neige (section 5.3) : les traces de pas restent |

---

## 5. Météo

### 5.1 Les dix types de temps

Lecture des colonnes :
- **Camouflage** : multiplicateur de la dépense du camouflage. À × 2, il s'épuise deux fois plus vite.
- **Scintille** : le camouflage clignote et peut être aperçu.
- **Vue des humains** : multiplicateur de la distance à laquelle les humains voient. À × 0,5, ils voient moitié moins loin.
- **Contraste thermique** : multiplicateur de la netteté des corps en vision thermique. Au-dessus de 1, les corps ressortent mieux. En dessous, ils se fondent dans le décor.
- **Bruit couvert** : part des bruits du Predator que le temps couvre.
- **Vitesse** : multiplicateur de la vitesse de déplacement.
- **Brume** : épaisseur de la brume à l'écran, de 0 à 1.

| Id | Temps | Camouflage | Scintille | Vue des humains | Contraste thermique | Bruit couvert | Vitesse | Brume | Particularité |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `clair` | temps clair | × 1 | non | × 1 | × 1 | 0 % | × 1 | 0 | temps de référence |
| `pluie` | pluie | × 1,6 | oui | × 0,8 | × 1,15 | 30 % | × 1 | 0,25 | l'eau dessine la silhouette |
| `orage` | orage | × 2,2 | oui | × 0,65 | × 1,2 | 70 % | × 0,95 | 0,4 | éclairs |
| `brouillard` | brouillard | × 1 | non | × 0,45 | × 1,1 | 10 % | × 1 | 0,8 | le meilleur temps pour approcher |
| `neige` | neige | × 1,2 | non | × 0,75 | × 1,5 | 20 % | × 0,9 | 0,35 | les traces de pas restent |
| `blizzard` | blizzard | × 1,5 | non | × 0,35 | × 1,6 | 80 % | × 0,75 | 0,9 | les traces de pas restent |
| `tempete-de-sable` | tempête de sable | × 1,8 | oui | × 0,3 | × 0,7 | 80 % | × 0,8 | 0,85 | la poussière se dépose sur le camouflage |
| `canicule` | canicule | × 1 | non | × 0,9 | × 0,45 | 0 % | × 1 | 0,1 | le sol chaud cache les corps à la vision thermique |
| `cendres` | pluie de cendres | × 1,7 | oui | × 0,6 | × 0,6 | 20 % | × 0,95 | 0,6 | la cendre se dépose sur le camouflage |
| `tempete` | tempête tropicale | × 2,4 | oui | × 0,5 | × 1,2 | 90 % | × 0,85 | 0,55 | éclairs ; arrête le ferry, le bateau, l'avion et l'hélicoptère |

**Ce qu'il faut retenir.**
- Le froid aide la vision thermique : un corps chaud ressort sur la neige (× 1,5 et × 1,6).
- La chaleur la gêne : canicule (× 0,45), cendres (× 0,6), tempête de sable (× 0,7).
- Tout ce qui mouille ou salit coûte cher au camouflage : pluie, orage, sable, cendres, tempête.
- Le brouillard ne coûte rien au camouflage et réduit la vue des humains de plus de moitié.

### 5.2 Le temps de chaque climat

Les nombres sont des probabilités en pour cent. Chaque ligne fait 100.

| Climat | Îles | temps clair | pluie | orage | brouillard | neige | blizzard | tempête de sable | canicule | pluie de cendres | tempête tropicale | Total |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| polaire | Frost Isle | 30 | — | — | 10 | 40 | 20 | — | — | — | — | 100 |
| tempéré froid | Hollowpine | 40 | 30 | 6 | 18 | 6 | — | — | — | — | — | 100 |
| océanique frais | Highland Isle | 28 | 34 | 8 | 30 | — | — | — | — | — | — | 100 |
| tempéré | Grayhaven, Calder | 50 | 28 | 10 | 12 | — | — | — | — | — | — | 100 |
| tempéré chaud | Eastbank | 58 | 22 | 12 | 8 | — | — | — | — | — | — | 100 |
| méditerranéen | Solana | 70 | 10 | 6 | — | — | — | — | 14 | — | — | 100 |
| aride | Redmesa | 52 | — | 3 | — | — | — | 15 | 30 | — | — | 100 |
| tropical sec | Tallgrass | 55 | 8 | 12 | — | — | — | — | 25 | — | — | 100 |
| subtropical | Steelwater | 48 | 26 | 14 | 8 | — | — | — | — | — | 4 | 100 |
| subtropical humide | Saltmarsh | 34 | 30 | 12 | 20 | — | — | — | — | — | 4 | 100 |
| tropical humide | Halcyon Cay, Verdant | 36 | 34 | 18 | 6 | — | — | — | — | — | 6 | 100 |
| tropical d'altitude | Ember | 38 | 24 | 12 | 8 | — | — | — | — | 18 | — | 100 |

The Shallows n'a pas encore de climat dans les données. La fiche propose le climat **tropical humide**, comme Verdant, sa voisine (section 11).

### 5.3 Les règles du temps

| Règle | Contenu |
| --- | --- |
| Blocs de 3 heures | le temps change par blocs de trois heures de jeu. Il ne change pas au milieu d'un bloc |
| Pas de hasard de la machine | le temps dépend du climat de l'île, de l'heure et de la graine du monde. La même graine donne toujours le même temps à la même heure : deux joueurs voient la même pluie |
| Altitude | au-dessus de 1 300 m, la pluie devient neige et l'orage devient blizzard. C'est le cas du haut du mont Hollow. L'Ember dépasse aussi 1 300 m, mais n'a pas de limite des neiges : point à trancher (section 11.2) |
| Neige | seulement au-dessus de la limite des neiges, sauf sur Frost Isle où elle descend jusqu'à la mer |
| Tempête tropicale | elle arrête le ferry, le bateau de pêche ou de plaisance, l'avion de ligne et l'hélicoptère. Ils restent à quai ou au sol jusqu'à la fin du bloc |

### 5.4 La note de météo de chaque île

| Île | Note des données |
| --- | --- |
| Frost Isle | froid permanent : jauge de chaleur ; les traces de pas restent dans la neige |
| Highland Isle | brouillard une fois sur trois ; le vent couvre les bruits au bord des falaises |
| Hollowpine | neige au-dessus de 1 300 m ; brouillard de vallée à l'aube |
| Calder | le brouillard monte du port la nuit ; la pluie fait briller le camouflage sous les néons |
| Solana | canicule l'été : la vue thermique distingue mal les corps du sol chaud |
| Grayhaven | cendres en suspension près du site de l'incident : la vue thermique y porte moins loin |
| Saltmarsh | brouillard à l'aube ; l'eau partout trahit le camouflage |
| Ember | pluie de cendres : elle se dépose sur le camouflage et la chaleur du sol brouille la vue thermique |
| Eastbank | orages d'été en fin de journée : les parcs se vident |
| Redmesa | tempête de sable : personne ne voit à plus de quelques mètres, le camouflage se couvre de poussière |
| Tallgrass | saison sèche : feux de brousse possibles après un tir de plasma |
| Halcyon Cay | tempête tropicale : bateaux et hélicoptère restent à quai, l'île est coupée du monde |
| Steelwater | fumées et vapeur : des écrans naturels contre la vue des gardes |
| Verdant | pluie un tiers du temps : elle couvre les bruits mais fait scintiller le camouflage |
| The Shallows | marée : à marée basse les gués relient les cayes |

---

## 6. Transports

**Décision du propriétaire :** les transports sont utilisables. Le Predator ne conduit jamais. Il monte sur le véhicule et se laisse porter.

### 6.1 Les quinze véhicules

| Id | Véhicule | Classe | Vitesse | Longueur × largeur × hauteur | Où l'on monte | Arrêt | Modèle 3D |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `metro` | métro | rail | 16 m/s (57,6 km/h) | 60 × 3 × 3,6 m | toit | 20 s | `metro` |
| `train` | train de voyageurs | rail | 24 m/s (86,4 km/h) | 90 × 3,2 × 4 m | toit | 40 s | `train` |
| `train-fret` | train de marchandises | rail | 14 m/s (50,4 km/h) | 160 × 3,2 × 4,2 m | toit et wagons plats | 90 s | `train-fret` |
| `bus` | bus | route | 11 m/s (39,6 km/h) | 12 × 2,6 × 3,2 m | toit | 15 s | `bus` |
| `camion` | camion | route | 13 m/s (46,8 km/h) | 16 × 2,6 × 4 m | remorque | 60 s | `camion` |
| `pickup` | pick-up de piste | route | 10 m/s (36 km/h) | 5,5 × 2 × 1,9 m | benne | 45 s | `pickup` |
| `ferry` | ferry | mer | 8 m/s (28,8 km/h) | 60 × 14 × 9 m | pont | 90 s | `ferry` |
| `bateau` | bateau de pêche ou de plaisance | mer | 7 m/s (25,2 km/h) | 14 × 4,5 × 3 m | pont | 60 s | `bateau` |
| `cargo` | porte-conteneurs | mer | 6 m/s (21,6 km/h) | 180 × 28 × 22 m | conteneurs | 240 s | `cargo` |
| `barge` | barge de bayou et hydroglisseur | mer | 9 m/s (32,4 km/h) | 8 × 3 × 2 m | pont | 30 s | `bateau` |
| `avion` | avion de ligne | air | 70 m/s (252 km/h) | 38 × 34 × 11 m | train d'atterrissage ou soute, au sol seulement | 180 s | `avion` |
| `avion-brousse` | avion de brousse | air | 45 m/s (162 km/h) | 11 × 14 × 3,6 m | flotteur ou aile, au sol seulement | 120 s | `avion-brousse` |
| `helicoptere` | hélicoptère | air | 40 m/s (144 km/h) | 13 × 3 × 4 m | patin | 60 s | `helicoptere` |
| `telepherique` | téléphérique | câble | 6 m/s (21,6 km/h) | 5 × 3 × 3 m | toit de la cabine | 30 s | `telepherique` |
| `motoneige` | motoneige et traîneau | route | 12 m/s (43,2 km/h) | 3 × 1,2 × 1,4 m | traîneau | 60 s | `pickup` |

Altitude de croisière des engins volants : 2 600 m pour l'avion de ligne, 1 900 m pour l'avion de brousse, 400 m pour l'hélicoptère. L'avion de ligne passe donc au-dessus du mont Hollow (1 850 m). L'hélicoptère, lui, doit contourner les montagnes.

Pour comparer : le Predator marche à 4,4 m/s et court à 8,6 m/s. Seul le téléphérique, le porte-conteneurs, le bateau et le ferry vont moins vite que sa course. Tous les autres le font gagner du temps.

### 6.2 Les trente-trois lignes

Une **boucle** revient à son départ en continuant dans le même sens. Un **aller-retour** fait demi-tour au terminus.

| Id | Ligne | Véhicule | Arrêts, dans l'ordre | Fréquence | Trajet |
| --- | --- | --- | --- | --- | --- |
| M1 | métro de Calder, ligne 1 | métro | 4.1 Downtown, le centre d'affaires → 4.3 Midtown → 4.5 Uptown → 4.7 Little Harbor → 4.8 Riverside → 4.2 Old Harbor → 4.6 The Heights | toutes les 6 min | boucle |
| M2 | métro, ligne des stades | métro | 4.3 Midtown → 4.8 Riverside → 4.17 Complexe sportif des Jumelles (Jumelle est) → 6.6 Parking aérien et rue commerçante | toutes les 10 min | aller-retour |
| T1 | train côtier Calder – Eastbank – Steelwater | train de voyageurs | 4.2 Old Harbor → 4.17 Complexe sportif des Jumelles (Jumelle est) → 6.6 Parking aérien et rue commerçante → 6.1 Bayview, le grand centre commercial → 5.1 Zone des entrepôts → 5.3 Usine de viande et quartier des usines | toutes les 20 min | aller-retour |
| T2 | fret du port | train de marchandises | 5.7 Zone des conteneurs → 5.2 Le port → 5.4 Entrepôts sud et zone d'usine → 5.8 Raffinerie lourde → 5.3 Usine de viande et quartier des usines → 5.1 Zone des entrepôts | toutes les 30 min | boucle |
| T3 | train de Maple Hollow | train de voyageurs | 2.4 Petite ville de Maple Hollow → 2.5 Zone du lycée → 2.7 Harvest Flats, zone agricole | toutes les 30 min | aller-retour |
| T4 | train de la mine | train de marchandises | 1S.4 Mine et Speedway → 1S.3 Dustwater | toutes les 40 min | aller-retour |
| B1 | bus du centre de Calder | bus | 4.1 Downtown, le centre d'affaires → 4.11 Richou, quartier résidentiel → 4.13 Calder Beach → 4.7 Little Harbor → 4.5 Uptown → 4.3 Midtown | toutes les 8 min | boucle |
| B2 | bus des collines et du circuit | bus | 4.1 Downtown, le centre d'affaires → 4.15 Le chantier et la vieille ville → 4.9 Les collines du nord, le lac et le barrage → 4.14 Le Big Ball et le circuit | toutes les 20 min | aller-retour |
| B3 | navette d'Eastbank | bus | 6.4 Gull Pier et les boutiques du front de mer → 6.6 Parking aérien et rue commerçante → 6.1 Bayview, le grand centre commercial → 6.3 Parc d'attractions → 6.5 Parc aquatique → 6.2 Le zoo et le grand parc | toutes les 10 min | boucle |
| B4 | bus de Maple Hollow | bus | 2.4 Petite ville de Maple Hollow → 2.3 Maple Hollow, zone résidentielle → 2.5 Zone du lycée → 2.6 Parc de Maple Hollow → 2.7 Harvest Flats, zone agricole | toutes les 15 min | boucle |
| B5 | car de Solana | bus | 11.1 Porto Solana → 11.5 Les calanques → 11.2 Les terrasses → 11.3 La garrigue → 11.4 Les ruines antiques | toutes les 30 min | aller-retour |
| B6 | car de la Route 9 | bus | 1S.3 Dustwater → 1S.2 La Route 9 → 1S.4 Mine et Speedway | toutes les 45 min | aller-retour |
| C1 | camions de Steelwater | camion | 5.1 Zone des entrepôts → 5.7 Zone des conteneurs → 5.2 Le port → 5.4 Entrepôts sud et zone d'usine → 5.8 Raffinerie lourde → 5.3 Usine de viande et quartier des usines | toutes les 12 min | boucle |
| C2 | camions de la raffinerie de Saltmarsh | camion | 12.3 La raffinerie → 12.2 Bayou Cross | toutes les 40 min | aller-retour |
| P1 | pick-up des braconniers | pick-up de piste | 9.4 Camp des braconniers → 9.6 Piste cachée → 9.7 Port-Tahren | toutes les 25 min | aller-retour |
| P2 | 4×4 de safari | pick-up de piste | 14.3 Le ranch et le safari-camp → 14.4 Le point d'eau → 14.1 La savane → 14.2 Le lodge Halcyon → 14.5 L'aérodrome de brousse | toutes les 20 min | boucle |
| P3 | patrouille de la quarantaine | pick-up de piste | 1N.2 Le mur → 1N.1 Les Hauts → 1N.6 Port d'Ashgrove → 1N.4 Ashgrove, ville abandonnée | toutes les 15 min | boucle |
| P4 | motoneiges de la station | motoneige et traîneau | 13.1 Northwick → 13.2 La station polaire → 13.3 Le glacier | toutes les 30 min | aller-retour |
| F1 | ferry du nord | ferry | 2.4 Petite ville de Maple Hollow → 13.1 Northwick | toutes les 40 min | aller-retour |
| F2 | ferry de Highland | ferry | 4.2 Old Harbor → 7.4 Le phare → 13.1 Northwick | toutes les 40 min | aller-retour |
| F3 | ferry d'Ember | ferry | 12.2 Bayou Cross → 3.3 Le Vieux Port | toutes les 30 min | aller-retour |
| F4 | ferry de Solana | ferry | 11.1 Porto Solana → 4.12 Marina de Richou | toutes les 30 min | aller-retour |
| S1 | bateau privé de Halcyon | bateau de pêche ou de plaisance | 8.4 L'embarcadère → 9.7 Port-Tahren | toutes les 60 min | aller-retour |
| S2 | vedette des trafiquants | bateau de pêche ou de plaisance | 10.4 Le ponton des trafiquants → 9.7 Port-Tahren → 5.6 Îles-barrières | toutes les 45 min | aller-retour |
| S3 | bateaux de pêche de Northwick | bateau de pêche ou de plaisance | 13.1 Northwick → 7.4 Le phare | toutes les 50 min | boucle |
| S4 | hydroglisseur des bayous | barge de bayou et hydroglisseur | 12.2 Bayou Cross → 12.1 Les bayous → 12.4 Le delta | toutes les 20 min | boucle |
| S5 | porte-conteneurs du large | porte-conteneurs | 5.2 Le port → plateforme Sable-7 (zone de mer) | toutes les 120 min | aller-retour |
| A1 | ligne des notes : Calder ⇒ Steelwater ⇒ Eastbank ⇒ Maple Hollow ⇒ Ashgrove ⇒ Redmesa | avion de ligne | 4.16 Aéroport de Calder (Jumelle ouest) → 5.5 Aéroport de fret → 6.7 Petit aéroport d'Eastbank → 2.7 Harvest Flats, zone agricole → 1N.6 Port d'Ashgrove → 1S.5 Zone militaire cachée | toutes les 60 min | boucle |
| A2 | avion de brousse | avion de brousse | 14.5 L'aérodrome de brousse → 9.6 Piste cachée → 13.2 La station polaire → 6.7 Petit aéroport d'Eastbank | toutes les 45 min | boucle |
| H1 | navette des plateformes | hélicoptère | 5.3 Usine de viande et quartier des usines → plateforme Sable-7 → plateforme Sable-9 → plateforme Sable-4 (zone de mer) | toutes les 30 min | boucle |
| H2 | hélicoptère d'ARGOS | hélicoptère | îlot Ironhook → 4.1 Downtown, le centre d'affaires → 1N.3 Site de l'incident | toutes les 40 min | boucle |
| K1 | téléphérique du mont Hollow | téléphérique | 2.6 Parc de Maple Hollow → 2.2 Montagne et lac | toutes les 10 min | aller-retour |
| K2 | téléphérique du mont Calder | téléphérique | 4.15 Le chantier et la vieille ville → 4.9 Les collines du nord, le lac et le barrage | toutes les 10 min | aller-retour |

**Trafic sans ligne.** Certaines îles ont un véhicule dans leur liste mais aucune ligne pour lui : les camions et les bateaux de Calder, les bateaux d'Eastbank, de Solana et de Saltmarsh, les pick-up de Hollowpine, de Redmesa et d'Ember, les camions et l'hélicoptère de Redmesa, l'hélicoptère et les bateaux d'Ember, l'hélicoptère de Halcyon Cay. C'est du **trafic libre** : il circule sans horaire. Le Predator peut y monter de la même façon.

### 6.3 Comment le Predator s'en sert

Ces règles décrivent ce qui se passe dans le monde. Les valeurs de jeu (fenêtres de saut, dégâts, montée d'alerte) restent à définir avec le game-designer (section 11).

| Moment | Règle |
| --- | --- |
| Monter à l'arrêt | pendant le temps d'arrêt du véhicule (de 15 s pour le bus à 240 s pour le porte-conteneurs). C'est le moyen le plus sûr |
| Monter en marche | en sautant d'un point plus haut : toit, pont, passerelle, branche, falaise, pylône. Plus le véhicule est rapide, plus le saut est difficile |
| Où l'on se tient | à l'endroit indiqué par les données : toit, pont, benne, remorque, conteneurs, patin, traîneau. Jamais dans la cabine ni parmi les passagers |
| Avions | on ne monte qu'au sol, pendant l'arrêt : train d'atterrissage ou soute pour l'avion de ligne, flotteur ou aile pour l'avion de brousse |
| Pendant le trajet | le Predator reste camouflé. La météo s'applique : sous la pluie, le camouflage scintille sur le toit d'un bus comme ailleurs |
| Descendre | à l'arrêt, ou en sautant en marche vers un toit, un talus ou l'eau. Sauter d'un véhicule rapide ou d'une grande hauteur blesse |
| Tunnels et obstacles | sur le toit du métro ou d'un train, les tunnels bas et les portiques obligent à se coucher |
| S'il est vu | les passagers et les conducteurs sont des témoins. Le véhicule s'arrête ou accélère, l'alerte monte selon les marques du mode (section 12 du mode). Une image envoyée compte comme ailleurs |
| Tempête tropicale | le ferry, le bateau, l'avion de ligne et l'hélicoptère ne partent pas |

**Code d'honneur.** Les passagers et les conducteurs civils sont **interdits de chasse**, comme tous les non-combattants et les désarmés. Un chauffeur de bus, un pilote de ligne, un marin de ferry ne sont pas des proies. Faire dérailler, couler ou brûler un véhicule plein de civils est une faute. Seuls les occupants **armés** sont des proies dignes : les braconniers du pick-up, la patrouille de la quarantaine, l'équipage de la vedette des trafiquants, l'équipe de l'hélicoptère d'ARGOS, les gardes du bateau privé de Halcyon.

---

## 7. Faune

### 7.1 Les quarante-trois espèces

Lecture des colonnes :
- **Honneur** : ce que la mise à mort rapporte. À 0, la tuer n'apporte rien.
- **Comportement** : chasseur (traque le Predator), meute (attaque en groupe), embuscade (attend et frappe), charge s'il est blessé, fuit, pisteur (suit une piste pour ses maîtres).
- **Groupe** : nombre d'animaux ensemble.

| Espèce | Classe | Honneur | Vie | Dégâts | Vitesse (m/s) | Comportement | Groupe | Activité | Îles | Note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ours polaire | apex | 30 | 220 | 28 | 6 | chasseur | 1 | jour et nuit | Frost Isle | — |
| loup arctique | prédateur | 12 | 70 | 12 | 7 | meute | 3 à 5 | nuit | Frost Isle | — |
| morse | gros gibier | 10 | 180 | 18 | 2 | charge s'il est blessé | 3 à 8 | jour | Frost Isle | — |
| phoque | petit gibier | 0 | 40 | 0 | 3 | fuit | 2 à 6 | jour | Frost Isle | — |
| ours brun | apex | 25 | 200 | 24 | 6,5 | chasseur | 1 | aube et crépuscule | Hollowpine | — |
| loup | prédateur | 12 | 65 | 11 | 7,2 | meute | 3 à 6 | nuit | Hollowpine | — |
| cerf | gros gibier | 5 | 70 | 6 | 8 | fuit | 2 à 5 | aube et crépuscule | Hollowpine, Grayhaven, Calder | — |
| puma | prédateur | 18 | 95 | 15 | 7,5 | embuscade | 1 | nuit | Hollowpine, Calder | — |
| aigle | oiseau | 0 | 20 | 0 | 12 | fuit | 1 à 2 | jour | Hollowpine, Highland Isle, Solana | — |
| cerf des landes | gros gibier | 6 | 80 | 8 | 8 | fuit | 3 à 8 | jour | Highland Isle | — |
| mouton | bétail | 0 | 35 | 0 | 4 | fuit | 5 à 12 | jour | Highland Isle | — |
| oiseaux de mer | oiseau | 0 | 10 | 0 | 10 | fuit | 6 à 20 | jour | Frost Isle, Highland Isle, Ember, The Shallows | — |
| meute de chiens errants | prédateur | 6 | 45 | 8 | 6,5 | meute | 3 à 6 | nuit | Grayhaven | — |
| corbeaux | oiseau | 0 | 8 | 0 | 9 | fuit | 4 à 12 | jour | Grayhaven | s'envolent et trahissent une présence |
| bête de la quarantaine | apex | 35 | 240 | 26 | 6,8 | chasseur | 1 à 2 | nuit | Grayhaven | animal altéré par l'incident ; proposé |
| coyote | prédateur | 6 | 45 | 8 | 7,5 | meute | 2 à 4 | nuit | Redmesa | — |
| serpent à sonnette | venimeux | 4 | 15 | 14 | 2 | embuscade | 1 | jour | Redmesa | venin : dégâts dans la durée |
| vautours | oiseau | 0 | 15 | 0 | 9 | fuit | 3 à 7 | jour | Redmesa, Tallgrass | tournent au-dessus des cadavres : ils signalent une chasse |
| mouflon | gros gibier | 6 | 70 | 9 | 7,5 | charge s'il est blessé | 2 à 6 | jour | Redmesa | — |
| sanglier | gros gibier | 5 | 70 | 10 | 4,6 | charge s'il est blessé | 1 à 4 | aube et crépuscule | Hollowpine, Solana, Saltmarsh, Verdant | — |
| jaguar | apex | 20 | 110 | 16 | 6,2 | chasseur | 1 | nuit | Verdant | — |
| crocodile | prédateur | 10 | 140 | 22 | 2,4 | embuscade | 1 à 3 | jour et nuit | Verdant, The Shallows | — |
| singes hurleurs | petit gibier | 0 | 20 | 0 | 6 | fuit | 4 à 10 | jour | Halcyon Cay, Verdant | donnent l'alerte par leurs cris |
| perroquets | oiseau | 0 | 8 | 0 | 10 | fuit | 4 à 12 | jour | Halcyon Cay, Verdant | — |
| anaconda | prédateur | 15 | 120 | 18 | 2,2 | embuscade | 1 | nuit | Saltmarsh, Verdant | — |
| alligator | apex | 18 | 160 | 24 | 2,6 | embuscade | 1 à 3 | jour et nuit | Saltmarsh | — |
| hérons et aigrettes | oiseau | 0 | 10 | 0 | 9 | fuit | 2 à 8 | jour | Saltmarsh, The Shallows | — |
| lion | apex | 28 | 170 | 22 | 7,5 | meute | 2 à 5 | nuit | Tallgrass | — |
| hyène | prédateur | 10 | 75 | 13 | 7 | meute | 3 à 6 | nuit | Tallgrass | — |
| buffle | gros gibier | 14 | 210 | 22 | 6,5 | charge s'il est blessé | 6 à 14 | jour | Tallgrass | — |
| antilope | gros gibier | 4 | 55 | 0 | 9,5 | fuit | 5 à 15 | jour | Tallgrass | — |
| rhinocéros | apex | 30 | 320 | 30 | 6 | charge s'il est blessé | 1 à 2 | jour | Tallgrass | — |
| requin de récif | apex | 22 | 150 | 24 | 6 | chasseur | 1 à 2 | jour et nuit | Halcyon Cay, The Shallows | dans l'eau seulement |
| tortue marine | petit gibier | 0 | 60 | 0 | 2 | fuit | 1 à 3 | nuit | Halcyon Cay, The Shallows | espèce protégée : la tuer n'apporte rien |
| chèvres | bétail | 0 | 30 | 0 | 5 | fuit | 4 à 10 | jour | Solana | — |
| vipère | venimeux | 3 | 12 | 10 | 2 | embuscade | 1 | jour | Solana | — |
| rats | nuisible | 0 | 5 | 0 | 5 | fuit | 3 à 10 | nuit | Grayhaven, Calder, Eastbank, Steelwater | — |
| pigeons | oiseau | 0 | 5 | 0 | 9 | fuit | 5 à 20 | jour | Calder, Eastbank | s'envolent quand on les approche : attention aux toits |
| chien de garde | dressé | 0 | 50 | 9 | 6,5 | pisteur | 1 à 2 | nuit | Calder, Eastbank, Steelwater, Halcyon Cay | — |
| mouettes | oiseau | 0 | 6 | 0 | 10 | fuit | 5 à 20 | jour | Solana, Calder, Eastbank, Steelwater | — |
| fauve échappé du zoo | apex | 25 | 160 | 22 | 7,5 | chasseur | 1 | nuit | Eastbank | seulement si un enclos a été ouvert |
| lézard des laves | petit gibier | 2 | 25 | 4 | 5 | fuit | 1 à 4 | jour | Ember | — |
| chèvre sauvage | gros gibier | 4 | 45 | 6 | 7,5 | fuit | 3 à 7 | jour | Ember | — |

### 7.2 Un apex par climat

La règle de cohérence donne six rois, un par milieu.

| Milieu | Climat | Île | Apex | Honneur |
| --- | --- | --- | --- | --- |
| Glace | polaire | Frost Isle | ours polaire | 30 |
| Forêt de montagne | tempéré froid | Hollowpine | ours brun | 25 |
| Jungle | tropical humide | Verdant | jaguar | 20 |
| Savane | tropical sec | Tallgrass | lion | 28 |
| Marais | subtropical humide | Saltmarsh | alligator | 18 |
| Récif | eaux du sud | The Shallows, Halcyon Cay | requin de récif | 22 |

Trois autres animaux ont la classe « apex » dans les données sans être dans cette liste. Ce sont des cas à part :
- la **bête de la quarantaine** (Grayhaven) : un animal altéré par l'incident, proposé ;
- le **rhinocéros** (Tallgrass) : il ne chasse pas, il charge s'il est blessé. C'est le plus gros trophée de la savane, pas son roi ;
- le **fauve échappé du zoo** (Eastbank) : il n'existe que si un enclos a été ouvert.

Les autres îles n'ont pas d'apex : Highland Isle, Solana, Redmesa, Ember, Calder, Steelwater. Sur Calder, le puma et le cerf restent dans les collines du nord (zone 4.9) : aucun grand prédateur n'entre dans la ville.

### 7.3 Les animaux qui trahissent

Certaines bêtes ne rapportent rien mais changent la chasse : elles donnent l'alerte.

| Animal | Ce qu'il fait |
| --- | --- |
| corbeaux | s'envolent et trahissent une présence |
| pigeons | s'envolent quand on les approche : attention aux toits |
| singes hurleurs | donnent l'alerte par leurs cris |
| vautours | tournent au-dessus des cadavres : ils signalent une chasse |
| chien de garde | piste le Predator pour ses maîtres, surtout la nuit |

---

## 8. Flore

### 8.1 Les seize entrées

| Id | Plante | Tuile | Hauteur | Couvert | Îles |
| --- | --- | --- | --- | --- | --- |
| `pine` | pin et sapin | `pine` | de 9 à 24 m | tronc | Hollowpine, Highland Isle, Solana, Calder |
| `tree` | feuillu (chêne, érable, hêtre) | `tree` | de 7 à 18 m | tronc et canopée | Hollowpine, Grayhaven, Calder, Eastbank, Halcyon Cay, Verdant |
| `palm` | palmier et cocotier | `palm` | de 6 à 14 m | tronc | Calder, Eastbank, Ember, Steelwater, Halcyon Cay, Verdant, The Shallows |
| `jungle-giant` | géant de la canopée (fromager) | `tree` | de 28 à 45 m | canopée praticable | Verdant |
| `mangrove` | palétuvier | `tree` | de 4 à 8 m | racines dans l'eau | The Shallows |
| `cypress` | cyprès chauve et mousse espagnole | `tree` | de 10 à 22 m | tronc dans l'eau | Saltmarsh |
| `olive` | olivier, chêne vert, cyprès de Provence | `tree` | de 4 à 12 m | tronc | Solana |
| `acacia` | acacia parasol et baobab | `tree` | de 6 à 16 m | ombre large | Tallgrass |
| `dead-tree` | arbre brûlé | `deadtree` | de 5 à 14 m | tronc nu | Grayhaven, Ember |
| `cactus` | cactus saguaro et yucca | `cactus` | de 2 à 7 m | faible ; blesse au contact | Redmesa |
| `bush` | buisson, fougère, bruyère | `bush` | de 1 à 1,6 m | cache un corps accroupi | toutes sauf The Shallows |
| `tall-grass` | hautes herbes | `bush` | de 1,2 à 1,8 m | cache un corps debout immobile | Tallgrass |
| `reed` | roseaux | `reed` | de 1,5 à 2,5 m | cache un corps dans l'eau | Saltmarsh |
| `crop` | cultures (maïs, blé, vigne) | `crop` | de 1 à 2,4 m | cache un corps debout ; rangs droits | Hollowpine, Solana |
| `lichen` | lichen et mousse de toundra | `snow` | 0 m | aucune | Frost Isle |
| `kelp` | corail et herbier | `ford` | 0 m | aucune ; eau peu profonde | The Shallows |

### 8.2 Ce que la flore apporte au jeu

| Couvert | Plantes | Effet |
| --- | --- | --- |
| Tronc | pin, palmier, olivier, arbre brûlé | on se cache derrière, on y grimpe. L'arbre brûlé n'a plus de feuilles : il cache mal d'en haut |
| Tronc et canopée | feuillu | on se cache derrière et dedans : la couronne masque le Predator vu du sol |
| Canopée praticable | géant de la canopée | un niveau de jeu entier, à 28 m et plus, relié par les lianes et les ponts de corde |
| Racines et troncs dans l'eau | palétuvier, cyprès chauve | couvert au ras de l'eau. Mais l'eau trahit le camouflage |
| Ombre large | acacia, baobab | le seul abri de la savane. Les bêtes s'y reposent aux heures chaudes |
| Corps accroupi | buisson, fougère, bruyère | il faut se baisser pour être caché |
| Corps debout immobile | hautes herbes | on y disparaît debout, à condition de ne pas bouger : les herbes plient au passage |
| Corps dans l'eau | roseaux | on s'y cache à la nage ou les pieds dans l'eau |
| Rangs droits | cultures | on y disparaît debout, mais un garde placé dans l'axe d'un rang voit tout le rang |
| Aucun | lichen, corail et herbier | terrain nu. Sur la toundra et le récif, seul le relief cache |
| Danger | cactus | couvert faible, et il blesse au contact |

La flore suit aussi l'altitude : au-dessus de la limite des arbres d'une île (section 4.1), il ne reste que des buissons, puis la roche nue.

---

## 9. Île par île, zone par zone

Les îles sont rangées du nord au sud. Chaque tableau a une ligne par zone. Les lignes de transport sont citées par leur identifiant (section 6.2). « Trafic libre » veut dire : véhicules de l'île sans ligne ni horaire.

### 9.1 Île 13 — Frost Isle

Climat polaire. Une île longue et basse, blanche jusqu'à la mer. Le vent ne s'arrête jamais et le blizzard efface tout en quelques minutes. Il n'y a pas un arbre : seul le relief cache. Le froid est permanent (jauge de chaleur) et les traces de pas restent dans la neige. On y vient en ferry ou en avion de brousse, on s'y déplace en motoneige.

| Zone | Routes | Bâtiments | Props | Transports et arrêts de ligne | Faune | Flore | Relief et verticalité |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 13.1 Northwick | piste dans le village ; ponton et passerelle sur le port | maisons sur pilotis, conserverie, musée baleinier | casiers à crabes, séchoirs à poisson, fûts de carburant, épave de baleinière | P4 (départ), F1 et F2 (terminus des ferries), S3 (bateaux de pêche) | phoques et morses sur la grève, oiseaux de mer | lichen, buissons bas | grève basse ; toits pentus, pilotis, coque de la baleinière |
| 13.2 La station polaire | piste balisée | modules de la station polaire, dôme radar, garage à motoneiges | antennes, balises de piste, fûts de carburant, traîneaux | P4 (arrêt), A2 (avion de brousse sur la piste de neige) | loups arctiques la nuit autour des modules | lichen | moraines ; dôme radar et antennes à escalader |
| 13.3 Le glacier | sentier | cabane de trappeur | traîneaux, balises de piste | P4 (terminus) | ours polaire, loups arctiques ; morses et phoques au pied du front de glace | lichen sur les moraines, rien sur la glace | calotte jusqu'au dôme du glacier (680 m), crevasses, front de glace ; une chute en crevasse tue |

### 9.2 Île 7 — Highland Isle

Climat océanique frais. Un plateau de lande posé sur des falaises. Le brouillard vient une fois sur trois et le vent couvre les bruits au bord du vide. Pas de route, pas de village : des pistes, des murets, des moutons. On y arrive par la mer, au pied du phare.

| Zone | Routes | Bâtiments | Props | Transports et arrêts de ligne | Faune | Flore | Relief et verticalité |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 7.1 La lande | piste | bergerie, cottage de pierre | murets de pierre sèche, enclos à moutons, tas de tourbe | aucun | cerfs des landes, moutons | bruyère ; quelques pins sous 150 m | plateau de lande jusqu'au Ben (310 m) ; murets comme seul couvert |
| 7.2 Les falaises | sentier | tour de guet ancienne | canot retourné au pied des falaises | aucun | oiseaux de mer, aigle | bruyère rase | falaises de 80 à 120 m, corniches, aiguilles en mer ; chute mortelle |
| 7.3 L'église et le cimetière | piste, sentier | église en ruine | croix celtiques, murets de pierre sèche | aucun | moutons entre les tombes | pins, bruyère | clocher et murs sans toit à escalader ; crypte dessous |
| 7.4 Le phare | piste | phare, cottage de pierre du gardien | casiers à homards, canot retourné | F2 (escale), S3 (bateaux de pêche) | oiseaux de mer | bruyère | phare de 33 m : le point de vue de l'île |

### 9.3 Île 2 — Hollowpine

Climat tempéré froid. La plus grande île. Au nord, une vraie chaîne de montagnes, des pins à perte de vue et de la neige au-dessus de 1 300 m. Au sud, une plaine tranquille : la petite ville de Maple Hollow, ses pavillons, son lycée, puis les champs de Harvest Flats. Le brouillard remplit les vallées à l'aube. Le train et le bus desservent le sud ; le téléphérique monte vers le lac.

| Zone | Routes | Bâtiments | Props | Transports et arrêts de ligne | Faune | Flore | Relief et verticalité |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2.1 Forêt de pins | route forestière, piste, sentier | scierie, tour de guet incendie, chalets | piles de grumes, panneaux de randonnée | trafic libre : pick-up des bûcherons | ours brun, loups, cerfs, sangliers | pins et sapins, fougères | piémont et vallées ; tour de guet et grands pins à grimper |
| 2.2 Montagne et lac | route en lacets, sentier | refuge d'altitude, gare du téléphérique (haute), chalets | barques sur le lac, pylônes du téléphérique, panneaux de randonnée | K1 (arrivée) | puma, aigle ; ours brun et cerfs sous la limite des arbres | pins jusqu'à 1 000 m, puis buissons, puis roche | mont Hollow (1 850 m), neige au-dessus de 1 300 m, lac d'altitude, vallées glaciaires |
| 2.3 Maple Hollow, zone résidentielle | rue, route | maisons de banlieue | boîtes aux lettres, bus scolaires | B4 | cerfs dans les jardins au crépuscule | feuillus, haies de buissons | plaine ; toits de maisons, arbres de jardin |
| 2.4 Petite ville de Maple Hollow | rue, route, voie ferrée, pont vers Solana | gare de Maple Hollow, église, diner, station-service | boîtes aux lettres | T3 (départ), B4, F1 (départ du ferry du nord) | aucune faune sauvage | feuillus d'alignement | plaine ; toits de deux étages, clocher |
| 2.5 Zone du lycée | rue, voie ferrée | lycée | bus scolaires | T3, B4 | aucune faune sauvage | feuillus, buissons | toit du lycée, mâts d'éclairage du stade |
| 2.6 Parc de Maple Hollow | rue, sentier | gare du téléphérique (basse) | panneaux de randonnée, pylônes du téléphérique | B4, K1 (départ) | cerfs à l'aube | feuillus, buissons | plaine ; pylônes et câble qui montent vers le nord |
| 2.7 Harvest Flats, zone agricole | route, piste, voie ferrée, pont gardé vers Grayhaven | fermes, silos, granges | bottes de foin, tracteurs | T3 (terminus), B4, A1 (escale) | sangliers dans les cultures, cerfs en lisière | cultures (maïs, blé), feuillus | plaine agricole ; silos et granges à escalader |

### 9.4 Île 4 — Calder

Climat tempéré. La grande ville. Une montagne boisée et son lac de retenue au nord, une ligne de collines à l'est, puis la plaine urbaine : le centre d'affaires et, plus au sud, la grille de rues. Les tours montent jusqu'à 310 m mais restent sous le mont Calder (920 m). Le brouillard monte du port la nuit et la pluie fait briller le camouflage sous les néons. C'est la seule île où tout roule : métro, train, bus, camions, ferries, avions, hélicoptère, téléphérique. La faune sauvage reste dans les collines.

| Zone | Routes | Bâtiments | Props | Transports et arrêts de ligne | Faune | Flore | Relief et verticalité |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 4.1 Downtown, le centre d'affaires | voie rapide vers la grille, rue, métro souterrain | gratte-ciel, banque, gare routière, station de métro, commissariat | feux et lampadaires, abribus, bouches de métro, enseignes, voitures garées | M1, B1 (départ), B2 (départ), H2 (héliport de toit) | pigeons, rats ; chiens de garde dans les halls la nuit | feuillus d'alignement | plaine urbaine ; tours de 40 à 180 m, la plus haute à 310 m ; chasse de toit en toit |
| 4.2 Old Harbor | rue, route, voie ferrée, métro souterrain | immeubles de brique, station de métro, commissariat | grues, bennes, kiosques | M1, T1 (départ), F2 (départ du ferry de Highland) | mouettes, rats | quelques feuillus | quais ; toits de brique, grues ; caves dessous |
| 4.3 Midtown | rue, voie ferrée, métro souterrain | gare centrale, immeubles de brique, station de métro, commissariat | feux et lampadaires, abribus, bouches de métro, enseignes, kiosques | M1, M2 (départ), B1 | pigeons, rats | feuillus du square | tours de 40 à 180 m ; passerelles au-dessus de la gare |
| 4.4 Commons Park | rue (allées du parc) | aucun grand bâtiment | kiosques, lampadaires | aucun arrêt ; le métro passe dessous | pigeons | feuillus, pins, buissons | terrain plat ; canopée urbaine |
| 4.5 Uptown | rue, métro souterrain | musées, université, hôpital, immeubles de brique, station de métro, commissariat | escaliers de secours, citernes de toit, voitures garées | M1, B1 | pigeons ; chiens de garde au musée la nuit | feuillus d'alignement | toits résidentiels ; escaliers de secours |
| 4.6 The Heights | rue, métro aérien | immeubles de brique, station de métro aérienne, commissariat | escaliers de secours, citernes de toit, bennes, enseignes | M1 | pigeons, rats | rare | toits continus ; viaduc du métro aérien au-dessus de la rue |
| 4.7 Little Harbor | rue, métro souterrain | immeubles de brique, station de métro, commissariat | enseignes, kiosques, échafaudages | M1, B1 | rats, pigeons, mouettes | rare | enseignes à escalader, toits serrés |
| 4.8 Riverside | voie rapide surélevée, rue, métro souterrain | immeubles de brique, station de métro, commissariat | bennes, échafaudages, grues, escaliers de secours | M1, M2 ; trafic libre : camions sur la voie rapide | rats ; chiens de garde sur le chantier la nuit | rare | voie rapide surélevée : un passage dessous sans témoin ; poutres du chantier |
| 4.9 Les collines du nord, le lac et le barrage | route en lacets, sentier | barrage et centrale | voitures garées au belvédère | B2, K2 (arrivée) | cerfs, puma | pins, feuillus, buissons | mont Calder (920 m), arbres jusqu'à 800 m, lac de retenue, crête du barrage ; vue sur toute l'île |
| 4.10 Le dessous de Calder | métro souterrain (tunnels) | stations de métro vues du dessous : quais, dépôt | bouches de métro | aucun arrêt propre ; M1 et M2 y roulent | rats | aucune | sous la ville : tunnels, égouts, parkings |
| 4.11 Richou, quartier résidentiel | route, rue | villas de Richou | voitures garées, feux et lampadaires | B1 | chiens de garde | feuillus, pins, haies de buissons, palmiers de jardin | presqu'île basse ; toits de villas, murs de jardin |
| 4.12 Marina de Richou | rue le long des quais | capitainerie | yachts, lampadaires | F4 (terminus du ferry de Solana) ; trafic libre : bateaux de plaisance | mouettes | palmiers | niveau de la mer ; mâts et ponts des yachts |
| 4.13 Calder Beach | route, rue | hôtels du front de mer | kiosques, enseignes, lampadaires | B1 | mouettes, pigeons | palmiers | plage plate ; toits des hôtels |
| 4.14 Le Big Ball et le circuit | route | Big Ball | enseignes, voitures garées | B2 (terminus) | pigeons | pins, buissons | piémont du mont Calder ; dôme du Big Ball, tribunes du circuit |
| 4.15 Le chantier et la vieille ville | route, rue | immeubles de brique murés, musées | échafaudages, grues, bennes | B2, K2 (départ) | rats, pigeons ; chiens de garde sur le chantier la nuit | buissons | collines de l'est (jusqu'à 400 m) ; grues et ossatures à escalader |
| 4.16 Aéroport de Calder (Jumelle ouest) | route, pont vers la grille | terminal de l'aéroport | feux et lampadaires, voitures garées | A1 (départ) | mouettes | buissons | île plate ; tour de contrôle, toits des hangars |
| 4.17 Complexe sportif des Jumelles (Jumelle est) | route, voie ferrée, métro, pont vers la grille et pont vers Eastbank | stades, station de métro | voitures garées, enseignes, feux et lampadaires | M2, T1 | pigeons, mouettes | feuillus | île plate ; gradins et mâts d'éclairage des stades |

### 9.5 Île 11 — Solana

Climat méditerranéen. Une île sèche et claire : un village blanc en gradins au-dessus du port, des vignes en terrasses, une crête calcaire, des calanques. Il fait beau sept fois sur dix. L'été, la canicule chauffe le sol et la vue thermique distingue mal les corps. Un seul car fait le tour de l'île ; le ferry rejoint Calder.

| Zone | Routes | Bâtiments | Props | Transports et arrêts de ligne | Faune | Flore | Relief et verticalité |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 11.1 Porto Solana | route, rue | maisons blanches à toit de tuile, église et campanile, villas | terrasses de café, barques de pêche, filets qui sèchent, scooters | B5 (départ), F4 (départ du ferry de Solana) ; trafic libre : bateaux | mouettes | oliviers, cyprès de Provence | village en gradins ; toits-terrasses reliés, campanile |
| 11.2 Les terrasses | route, piste | caves viticoles, moulin | treilles de vigne, amphores | B5 | chèvres ; vipères dans les murets | vigne, oliviers | terrasses de culture ; murets comme couvert |
| 11.3 La garrigue | piste, sentier | aucun | aucun | B5 | sangliers, chèvres, vipères, aigle | maquis de buissons, pins, chênes verts | crête calcaire jusqu'au monte Solana (760 m), arbres jusqu'à 650 m |
| 11.4 Les ruines antiques | route, sentier | temple en ruine, théâtre antique | colonnes tombées, amphores | B5 (terminus) | chèvres, vipères | oliviers, buissons | gradins et colonnes à escalader ; citerne dessous |
| 11.5 Les calanques | piste, sentier | cabanons des calanques | barques de pêche, filets qui sèchent | B5 ; trafic libre : bateaux | mouettes, aigle | pins, buissons | calanques : falaises blanches, grottes marines |

### 9.6 Île 1 nord — Grayhaven

Climat tempéré. La zone de quarantaine. Une île figée en 2003 : des maisons vides, des voitures abandonnées, des arbres brûlés autour de la cuvette de l'incident. Près du site, des cendres restent en suspension et la vue thermique porte moins loin. Seule l'armée circule : une patrouille en pick-up, l'hélicoptère d'ARGOS, et l'avion qui se pose à l'aérodrome d'Ashgrove.

| Zone | Routes | Bâtiments | Props | Transports et arrêts de ligne | Faune | Flore | Relief et verticalité |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1N.1 Les Hauts | piste | maisons abandonnées (ferme d'altitude) | panneaux d'évacuation | P3 | cerfs, corbeaux | feuillus, buissons | plateau boisé jusqu'aux Hauts (540 m), arbres jusqu'à 500 m ; vue sur la cuvette |
| 1N.2 Le mur | route, piste, pont gardé vers Hollowpine | mur de quarantaine et miradors, poste militaire | barrières et barbelés, projecteurs, tentes de décontamination | P3 (départ) | corbeaux ; chiens errants la nuit | buissons, arbres brûlés | chemin de ronde, miradors ; conduite d'eau sous le mur |
| 1N.3 Site de l'incident | piste | laboratoire d'ARGOS | fûts marqués, tentes de décontamination, projecteurs | H2 | bête de la quarantaine la nuit, chiens errants, corbeaux | arbres brûlés | cuvette de l'incident ; aucun couvert au fond ; parking souterrain |
| 1N.4 Ashgrove, ville abandonnée | route, rue | maisons abandonnées, hôpital de campagne | voitures abandonnées, panneaux d'évacuation | P3 (dernier arrêt) | chiens errants, rats, corbeaux | feuillus et buissons qui envahissent les rues | plaine d'Ashgrove ; façades et toits troués, planchers qui cèdent |
| 1N.5 Banlieue figée | route, rue | maisons abandonnées, école vide | voitures abandonnées | aucun | chiens errants, cerfs, rats | feuillus, buissons | toits de maisons ; caves |
| 1N.6 Port d'Ashgrove | route, rue | port désaffecté, aérodrome d'Ashgrove | épaves de bateaux, fûts marqués | P3, A1 (escale) | rats, corbeaux | buissons | quais ; grues tordues, coques échouées |

### 9.7 Île 12 — Saltmarsh

Climat subtropical humide. Un delta plat, presque sans terre ferme : des chenaux d'eau noire, des cyprès, des bancs de vase. Le point le plus haut est une levée de 6 m. Le brouillard se lève à l'aube et l'eau, partout, trahit le camouflage. On se déplace en hydroglisseur ; la seule vraie route va de la raffinerie au village.

| Zone | Routes | Bâtiments | Props | Transports et arrêts de ligne | Faune | Flore | Relief et verticalité |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 12.1 Les bayous | piste, ponton et passerelle, gué vers Tallgrass | cabane de trappeur, cabanes sur pilotis | pièges à écrevisses, barques, lampes-tempête | S4 | alligators, anaconda, hérons et aigrettes | cyprès chauves, roseaux | chenaux et bancs de vase ; cyprès de 10 à 22 m à grimper |
| 12.2 Bayou Cross | route, ponton et passerelle | cabanes sur pilotis, église en bois, bar de Bayou Cross, pontons | hydroglisseurs, barques, lampes-tempête | F3 (départ du ferry d'Ember), S4 (départ), C2 (terminus) | hérons et aigrettes | cyprès, buissons | levée de Bayou Cross (6 m) : le point haut de l'île ; pilotis et passerelles |
| 12.3 La raffinerie | route, piste | raffinerie | fûts, conduites de la raffinerie | C2 (départ) | sangliers aux abords ; pas d'alligator sur le terre-plein | buissons, roseaux en bordure | terre-plein sec ; colonnes et torchère à escalader |
| 12.4 Le delta | piste, ponton et passerelle | pontons | barques, pièges à écrevisses | S4 ; trafic libre : bateaux de pêche | alligators, hérons et aigrettes, sangliers sur les bancs | roseaux | bancs de vase au ras de l'eau ; aucun point haut |

### 9.8 Île 3 — Ember

Climat tropical d'altitude. Le volcan, visible de tout l'archipel. Un cône de 1 480 m, un lac de lave dans le cratère, des coulées noires jusqu'à la mer. La végétation s'arrête à 500 m. Près d'une fois sur cinq il pleut des cendres : elles se déposent sur le camouflage, et la chaleur du sol brouille la vue thermique. Le ferry arrive au Vieux Port.

| Zone | Routes | Bâtiments | Props | Transports et arrêts de ligne | Faune | Flore | Relief et verticalité |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 3.1 Le volcan | piste, sentier | observatoire du volcan | capteurs sismiques, panneaux de danger, blocs de lave, fumerolles | trafic libre : hélicoptère de l'observatoire, pick-up | chèvres sauvages, lézards des laves | buissons jusqu'à 500 m, arbres brûlés sur les coulées | l'Ember (1 480 m) : stratovolcan, cratère et lac de lave, coulées ; tunnels de lave dessous |
| 3.2 Sulfur Springs et la géothermie | route | bains de Sulfur Springs, centrale géothermique | conduites de vapeur, panneaux de danger, fumerolles | trafic libre : pick-up | lézards des laves | palmiers, buissons | pied du cône ; tours de vapeur et conduites à escalader |
| 3.3 Le Vieux Port | route | entrepôts du Vieux Port, phare de basalte | barques, blocs de lave | F3 (terminus) ; trafic libre : bateaux | oiseaux de mer | palmiers | côte de basalte ; phare, toits des entrepôts |

### 9.9 Île 6 — Eastbank

Climat tempéré chaud. L'île des commerces et des loisirs : un centre commercial géant, un zoo, deux parcs, une jetée et sa grande roue. Des crêtes boisées de 180 m au nord et à l'est, une cuvette pleine de parkings au milieu. Les orages d'été éclatent en fin de journée et vident les parcs. Le train et le métro arrivent de Calder par la Jumelle est ; une navette fait le tour de l'île.

| Zone | Routes | Bâtiments | Props | Transports et arrêts de ligne | Faune | Flore | Relief et verticalité |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 6.1 Bayview, le grand centre commercial | voie rapide de ceinture, route, voie ferrée | centre commercial, grands magasins | chariots, panneaux publicitaires, voitures garées | T1, B3 | pigeons ; chiens de garde la nuit | palmiers de parking, buissons | cuvette commerciale ; toits plats immenses |
| 6.2 Le zoo et le grand parc | route, rue (allées) | enclos du zoo | cages et fossés | B3 | fauve échappé du zoo (seulement si un enclos a été ouvert), pigeons | feuillus, buissons | murs et fossés des enclos ; arbres du parc |
| 6.3 Parc d'attractions | route | manèges | stands forains, bornes d'arcade | B3 | pigeons, rats | feuillus | rails des manèges sur pylônes |
| 6.4 Gull Pier et les boutiques du front de mer | rue, ponton et passerelle (la jetée) | boutiques, grande roue | stands forains, bornes d'arcade, panneaux publicitaires | B3 (départ) ; trafic libre : bateaux | mouettes | palmiers | jetée au-dessus de l'eau ; grande roue ; le dessous de la jetée |
| 6.5 Parc aquatique | route, pont et voie ferrée vers Steelwater | bassins et toboggans | bouées et transats | B3 | mouettes | palmiers | tour des toboggans ; l'eau trahit le camouflage |
| 6.6 Parking aérien et rue commerçante | rue, voie ferrée, pont vers la Jumelle est | parking à étages, boutiques, cinéma, gare d'Eastbank | voitures garées, panneaux publicitaires, chariots | M2 (terminus), T1, B3 | pigeons, rats | feuillus | parking à étages ouverts ; toits bas continus |
| 6.7 Petit aéroport d'Eastbank | route, second pont vers Steelwater | hangars de l'aérodrome | voitures garées | A1 (escale), A2 | mouettes | buissons | terrain plat ; toits des hangars |
| 6.8 Les hauteurs | route | aucun | panneaux publicitaires au bord de la route | aucun | pigeons ; refuge du fauve s'il s'est échappé | feuillus, buissons | crêtes jusqu'aux hauteurs (180 m), boisées jusqu'en haut ; vue sur toute l'île |
| 6.9 Bouche d'égout et collecteurs | aucune en surface | aucun | aucun | aucun | rats | aucune | sous terre : collecteur central, sorties vers la mer |

### 9.10 Île 1 sud — Redmesa

Climat aride. Le désert : des mesas rouges à sommet plat, des canyons de 80 à 150 m, des dunes, un lit de rivière à sec. Aucun arbre, seulement des cactus et des buissons secs. La canicule gêne la vue thermique près d'un jour sur trois. La tempête de sable fait pire : personne ne voit à plus de quelques mètres et le camouflage se couvre de poussière. Une route, la Route 9, et le train de la mine.

| Zone | Routes | Bâtiments | Props | Transports et arrêts de ligne | Faune | Flore | Relief et verticalité |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1S.1 Désert ouvert et canyons | piste, sentier | casse automobile | carcasses de voitures, éoliennes de pompage | trafic libre : pick-up | coyotes la nuit, serpents à sonnette, vautours ; mouflons sur les mesas | cactus, buissons secs | la Table rouge (420 m), mesas à sommet plat, canyons de 80 à 150 m, dunes ; embuscades d'en haut |
| 1S.2 La Route 9 | route, gué vers Tallgrass | motel, diner, station-service | panneaux de la Route 9, carcasses de voitures | B6 ; trafic libre : camions | coyotes la nuit, vautours | cactus | lit de rivière à sec ; auvents, toits, enseigne du motel |
| 1S.3 Dustwater | route, voie ferrée | saloon de Dustwater, château d'eau | wagonnets, éoliennes de pompage | T4 (terminus), B6 (départ) | serpents à sonnette aux abords, vautours | cactus, buissons | toits plats reliés, balcons, château d'eau |
| 1S.4 Mine et Speedway | route, voie ferrée, piste | chevalements de la mine, tribunes du Speedway | wagonnets, pneus du circuit | T4 (départ), B6 (terminus) ; trafic libre : camions de la mine | vautours | buissons | mine en gradins creusés ; chevalements, tribunes |
| 1S.5 Zone militaire cachée | piste | hangars militaires enterrés | clôtures électrifiées, antennes paraboliques | A1 (escale) ; trafic libre : hélicoptère militaire, pick-up | coyotes, serpents à sonnette | cactus, buissons | tour de guet, antennes ; hangars sous le sol |
| 1S.6 Sous-sols du désert | sentier jusqu'aux entrées | aucun en surface | aucun | aucun | serpents à sonnette aux entrées | aucune sous terre | puits d'accès, galeries, cheminée naturelle de la grotte |

### 9.11 Île 14 — Tallgrass

Climat tropical sec. La savane : une plaine de hautes herbes, des acacias, des amas de granit (les kopjes). Le plus haut, celui du lodge, fait 140 m. C'est l'île qui porte le plus de gros gibier. En saison sèche, un tir de plasma peut allumer un feu de brousse. Pas de route : des pistes, un 4×4 de safari et un avion de brousse.

| Zone | Routes | Bâtiments | Props | Transports et arrêts de ligne | Faune | Flore | Relief et verticalité |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 14.1 La savane | piste, gué vers Saltmarsh | mirador d'observation | termitières, carcasses | P2 | lions et hyènes la nuit ; buffles, antilopes, rhinocéros, vautours le jour | hautes herbes, acacias et baobabs | plaine d'herbes, kopjes de granit ; le mirador et les kopjes comme points de vue |
| 14.2 Le lodge Halcyon | piste, sentier | lodge abandonné | carcasses | P2 | hyènes la nuit | acacias, buissons | kopje du lodge (140 m) : le point haut de l'île ; cave dessous |
| 14.3 Le ranch et le safari-camp | piste | ranch, tentes du safari-camp | 4×4 de safari, clôtures du ranch, abreuvoirs | P2 (départ) | antilopes le jour ; lions qui rôdent la nuit | hautes herbes, acacias | plaine ; toits du ranch |
| 14.4 Le point d'eau | piste, sentier, gué vers Redmesa | aucun | abreuvoirs, carcasses | P2 | buffles, antilopes et rhinocéros le jour ; lions et hyènes la nuit | hautes herbes, buissons | lit du point d'eau, en creux ; aucun point haut |
| 14.5 L'aérodrome de brousse | piste | hangar de l'aérodrome de brousse | manche à air, 4×4 de safari | P2, A2 (départ) | antilopes, vautours | hautes herbes rases autour de la piste | terrain plat ; toit du hangar |

### 9.12 Île 8 — Halcyon Cay

Climat tropical humide. L'île privée : un manoir blanc sur sa butte de 90 m, des jardins, une plage, un bout de jungle gardé. Tout est surveillé par des caméras. Quand la tempête tropicale arrive, le bateau et l'hélicoptère restent à quai et l'île est coupée du monde : personne n'entre, personne ne sort.

| Zone | Routes | Bâtiments | Props | Transports et arrêts de ligne | Faune | Flore | Relief et verticalité |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 8.1 Le manoir | piste | manoir, pavillons d'invités, héliport | statues, fontaines, caméras, voiturettes | trafic libre : hélicoptère privé | chiens de garde | palmiers, feuillus | la butte du manoir (90 m) ; toits et terrasses du manoir |
| 8.2 Les jardins et la plage | piste, ponton et passerelle | serre | statues, fontaines, transats, caméras | aucun | tortues marines la nuit sur la plage ; requin de récif dans l'eau ; perroquets | palmiers, buissons | plages et récif ; arrivée à la nage |
| 8.3 La jungle privée | sentier | aucun | caméras | aucun | singes hurleurs, perroquets ; chiens de garde en patrouille | feuillus, palmiers, buissons | pentes de la butte ; canopée des feuillus |
| 8.4 L'embarcadère | piste, ponton et passerelle | hangar à bateaux | yacht à quai, voiturettes | S1 (départ) | requin de récif au large | palmiers | niveau de la mer ; toit du hangar, pont du yacht |

### 9.13 Île 5 — Steelwater

Climat subtropical. L'île de l'industrie : des terre-pleins plats, des quais, des usines. Le point naturel le plus haut est le terril de la carrière, 25 m. Ce sont les constructions qui font la hauteur : une cheminée de 120 m, les portiques, le phare. Fumées et vapeur font des écrans naturels contre la vue des gardes. Tout y circule pour le travail : trains de fret, camions, porte-conteneurs, hélicoptère des plateformes.

| Zone | Routes | Bâtiments | Props | Transports et arrêts de ligne | Faune | Flore | Relief et verticalité |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 5.1 Zone des entrepôts | voie rapide, rue, voie ferrée, pont vers Eastbank | entrepôts, gare de triage | palettes, chariots élévateurs, wagons | T1, T2, C1 (départ) | rats ; chiens de garde la nuit | buissons | terre-plein plat ; toits d'entrepôts, rayonnages |
| 5.2 Le port | route, voie ferrée | portiques, capitainerie et douane | conteneurs, grues | T2, C1, S5 (départ) | mouettes, rats | aucune | quais ; portiques, grues, pont du porte-conteneurs (22 m) |
| 5.3 Usine de viande et quartier des usines | voie rapide, rue, voie ferrée | usine de viande, chaîne automobile, usine de camions, centrale | cheminées, citernes, chariots élévateurs | T1 (terminus), T2, C1, H1 (départ) | rats ; chiens de garde la nuit | buissons | cheminée de 120 m ; convoyeurs, ponts roulants |
| 5.4 Entrepôts sud et zone d'usine | route, rue, voie ferrée | entrepôts | palettes, citernes, chariots élévateurs | T2, C1 | rats ; chiens de garde la nuit | buissons | toits d'entrepôts, passerelles |
| 5.5 Aéroport de fret | route, pont vers le port | hangars d'avions | citernes | A1 (escale) | mouettes | buissons, palmiers | île-barrière plate ; toits des hangars |
| 5.6 Îles-barrières | aucune | aucun | épaves de barges | S2 (terminus) | mouettes | palmiers, buissons | langue de sable au ras de l'eau |
| 5.7 Zone des conteneurs | route, voie ferrée | portiques | conteneurs, wagons, grues | T2 (départ), C1 | rats, mouettes | aucune | piles de conteneurs : un labyrinthe à étages |
| 5.8 Raffinerie lourde | route, voie ferrée | raffinerie | conduites, citernes, cheminées | T2, C1 | rats ; chiens de garde la nuit | buissons | colonnes et passerelles ; carrière en creux et terril de la carrière (25 m) |
| 5.9 Le phare | route | phare | aucun | aucun | mouettes | buissons, palmiers | phare de 33 m sur sa pointe : le point de vue de l'île |
| 5.10 L'île du hangar caché | route, pont vers l'île principale | entrepôts | palettes, conteneurs | aucun | chiens de garde, mouettes | buissons | île plate ; charpente du hangar |

### 9.14 Île 9 — Verdant

Climat tropical humide. La jungle, point de départ du mode. Des collines couvertes d'arbres jusqu'au sommet, un fleuve dans sa gorge, des chutes, un piton rocheux de 380 m. Les géants de la canopée portent un niveau de jeu à 28 m et plus. Il pleut un tiers du temps : la pluie couvre les bruits mais fait scintiller le camouflage. Pas de route : des pistes de braconniers, des sentiers, des pontons.

| Zone | Routes | Bâtiments | Props | Transports et arrêts de ligne | Faune | Flore | Relief et verticalité |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 9.1 L'autel yautja | sentier | autel yautja | statues couvertes de mousse | aucun | singes hurleurs ; jaguar la nuit | géants de la canopée, feuillus, fougères | degrés de l'autel ; collines couvertes de jungle |
| 9.2 Les chutes et le repaire | sentier | aucun (la grotte du repaire) | lianes | aucun | sangliers, perroquets | feuillus, fougères | piton de la Sœur de pierre (380 m), chutes, falaise ; grotte derrière l'eau |
| 9.3 Le fleuve | piste, ponton et passerelle, gués du fleuve | aucun | pirogues, ponts de corde | trafic libre : pirogues et bateaux | crocodiles ; anaconda la nuit | palmiers, buissons | gorge du fleuve ; l'eau trahit le camouflage |
| 9.4 Camp des braconniers | piste, gué vers The Shallows (marée basse) | camp des braconniers | cages à animaux, caisses, générateurs | P1 (départ) | sangliers ; jaguar qui rôde la nuit | feuillus, buissons | clairière ; arbres de lisière pour l'approche |
| 9.5 Fouilles archéologiques | piste, sentier | tentes des fouilles | générateurs, caisses, statues couvertes de mousse | aucun | singes hurleurs, perroquets | feuillus, géants de la canopée | tranchées en creux ; branches au-dessus du chantier |
| 9.6 Piste cachée | piste | hangar de la piste cachée | caisses, générateurs | P1, A2 | sangliers | buissons, palmiers | piste en herbe, plate ; toit du hangar |
| 9.7 Port-Tahren | piste, ponton et passerelle | cases de Port-Tahren | pirogues, caisses | P1 (terminus), S1 (terminus), S2 (escale) | perroquets ; crocodiles à l'embouchure | palmiers et cocotiers | niveau de la mer ; toits des cases, pontons |
| 9.8 La canopée | sentier au sol | plateformes dans la canopée | lianes, ponts de corde | aucun | singes hurleurs, perroquets, jaguar | géants de la canopée de 28 à 45 m | trois niveaux : sol, sous-bois, canopée praticable |

### 9.15 Île 10 — The Shallows

Climat proposé : tropical humide. Le chapelet : six cayes plates en arc, des lagons, un récif. Le point le plus haut est une dune de 4 m. Ici le relief ne cache rien : ce sont les palétuviers, les épaves et la nuit qui cachent. La marée commande tout : à marée basse, les gués relient les cayes. Le requin tient les passes.

| Zone | Routes | Bâtiments | Props | Transports et arrêts de ligne | Faune | Flore | Relief et verticalité |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 10.1 Coral Key | sentier, ponton et passerelle | cabanes de pêcheurs | casiers, filets, canots | trafic libre : bateaux | tortues marines la nuit, oiseaux de mer | palmiers | dune de Coral Key (4 m) : le point haut du chapelet |
| 10.2 Les mangroves et les passes | gué, ponton et passerelle | aucun | bouées | aucun | crocodiles, hérons et aigrettes ; requin de récif dans les passes | palétuviers ; corail et herbier | terrain plat ; racines des palétuviers au ras de l'eau |
| 10.3 L'épave du Meridian | gué | épave du Meridian | caisses étanches, bouées | aucun | requin de récif autour de la coque, oiseaux de mer | corail et herbier | pont incliné, cales, salle des machines : la seule vraie hauteur bâtie du récif |
| 10.4 Le ponton des trafiquants | ponton et passerelle | ponton des trafiquants | caisses étanches, canots, bouées | S2 (départ) | hérons et aigrettes ; requin de récif | palétuviers | pilotis ; le dessous du ponton |
| 10.5 Le phare des Shallows | sentier, gué vers Verdant (marée basse) | phare des Shallows | casiers, filets | aucun | oiseaux de mer, tortues marines | palmiers | phare de 33 m : le point de vue du chapelet |

### 9.16 Îlots et zone de mer

Les îlots n'ont pas encore d'entrée dans les données du monde vivant. Deux lignes y passent déjà.

| Lieu | Ce qui y passe | Remarque |
| --- | --- | --- |
| Ironhook | H2 (départ de l'hélicoptère d'ARGOS) | îlot fortifié ; digue fermée vers Calder |
| Blackrock (zone B.1 Prison fédérale de Blackrock) | aucune ligne | à décrire |
| Plateforme Sable-7 | S5 (terminus), H1 | plateforme en service |
| Plateforme Sable-9 | H1 | « la Pieuvre » |
| Plateforme Sable-4 | H1 | plateforme désaffectée |
| Îlot du Navigateur, Les Brisants, Rocher aux Mouettes, Les Cendres, Petite Ember | aucune ligne | à décrire |

---

## 10. État d'application

| Sujet | Écrit dans la Bible | Dans les données | Dans le code |
| --- | --- | --- | --- |
| Règles de cohérence | oui, section 2 | oui, `coherence` | vérifiées par les tests (`tests/isles-living-world-v1.test.mjs`, `tests/isles-archipelago-world-v1.test.mjs`) : pas de rail hors des îles prévues, cactus et palmiers à leur place |
| Types de routes | oui, section 3 | oui, `roadTypes` et `islands.*.roads` | **fait en partie** : voie rapide, route, piste, voie ferrée, pont et gué sont tracés et typés par île ; rue, sentier et ponton n'ont pas encore de tracé propre |
| Relief à la vraie échelle | oui, section 4 | oui, `relief.islands` | **fait** : chaque île atteint son sommet (mont Hollow 1 848 m, l'Ember 1 474 m, mont Calder 918 m), neige au-dessus de la limite, roche au-dessus de la limite des arbres ; les zones sont en terrasse à l'altitude de leur ancre, les routes montent en rampe |
| Hauteurs bâties | oui, section 4.2 | oui, `relief.built` | **fait en partie** : tours de Calder jusqu'à 309 m ; pas encore de cheminées de 120 m à Steelwater |
| Types de temps et effets de jeu | oui, section 5.1 | oui, `weatherTypes` | **fait en partie** (`islesWeatherV1.ts`) : le temps use le camouflage et ralentit la marche, réduit la perception des animaux, voile l'écran ; le scintillement du camouflage sous la pluie et le contraste thermique ne sont pas encore appliqués |
| Temps par climat, blocs de 3 heures, altitude | oui, sections 5.2 et 5.3 | oui, `weatherRules` | **fait** : tirage par climat, blocs de 3 heures, transition de 20 minutes, neige en altitude, horloge jour et nuit |
| Véhicules | oui, section 6.1 | oui, `transports` | **fait** : 71 véhicules circulent sur 33 lignes ; volumes simples, et modèles 3D pour douze d'entre eux |
| Lignes et arrêts | oui, section 6.2 | oui, `lines` | **fait** (`islesTransportV1.ts`) : horaires sans état, arrêts, prochain passage affiché ; trains, métros, bus et camions suivent leur voie réelle ; bateaux et avions vont encore en ligne droite d'arrêt en arrêt, et leurs arrêts sont à terre faute de quais |
| Monter sur un véhicule, descendre, être vu | oui, section 6.3 (proposé) | non | **fait en partie** : touche G pour monter sur le toit ou le pont et pour descendre, le chasseur est porté par le véhicule ; on ne marche pas encore sur le toit, et personne à bord ne réagit |
| Espèces | oui, section 7 | oui, `species` et `islands.*.fauna` | **fait** (`islesFaunaV1.ts`) : 43 espèces réparties par île et par habitat, activité selon l'heure, fuite, charge, traque, meute, embuscade ; lames et plasma, honneur par espèce. Pas encore de trophée ni de sauvegarde dans ce mode |
| Flore et couvert | oui, section 8 | oui, `flora` et `islands.*.flora` | **fait en partie** : pins, feuillus, palmiers, cactus, arbres brûlés, roseaux, cultures, hautes herbes, géants de la canopée ; palétuviers, cyprès, oliviers et acacias n'ont pas encore de forme propre |
| Bâtiments et props par île | oui, section 9 | oui, `islands.*.buildings` et `islands.*.props` | **à faire** hors de Calder, d'Eastbank, de Steelwater et de Blackrock : les autres îles gardent des gabarits par type de zone ; les props ne sont pas posés |
| Répartition par zone | oui, section 9 (proposé) | non : les données sont par île | **à faire** : le code place la faune par île et par habitat, pas par zone |
| Îlots et plateformes | en partie, section 9.16 | non | **fait en partie** : plateformes sur pilotis, prison de Blackrock, hélicoptères qui s'y posent |
| Modèles 3D pour l'essentiel | oui, ci-contre | oui, champ `model` des véhicules, `speciesModels` et `app/game/data/islesModelsV1.json` | **fait** : 18 modèles (12 véhicules, 6 animaux) dans `art-source/isles-meshy-20261128b/`, 600 crédits ; les autres espèces empruntent le modèle le plus proche (`speciesModels`), le reste est en volumes |

**Humains.** Civils, factions, police et alerte ne sont pas encore dans l'archipel entier : ils n'existent que dans la chasse libre de Verdant (carte à part). C'est la prochaine étape.

**Preuves.** Recette navigateur `scripts/qa-isles-archipelago-browser-v1.mjs` (sommet de l'Ember, horloge et météo, voyage sur le toit d'un métro, proie abattue à Tallgrass), captures 21 à 27 dans `production/qa/evidence/isles-archipel-v1-20261128/`. Les performances n'ont pas été mesurées sur une vraie carte graphique.

---

## 11. Points à valider par le propriétaire

### 11.1 Ce qui est proposé et ne vient pas des notes

| N° | Point | Ce qui est proposé |
| --- | --- | --- |
| 1 | Bête de la quarantaine | une espèce nouvelle sur Grayhaven : animal altéré par l'incident, apex, 35 d'honneur. Les données la marquent « proposé » |
| 2 | Téléphériques | deux lignes : mont Hollow (2.6 → 2.2) et mont Calder (4.15 → 4.9). Le mode citait seulement un téléphérique sur Hollowpine. Celui du mont Hollow part du parc de la ville : c'est un très long câble, à confirmer |
| 3 | Altitudes exactes | les quinze sommets, leurs noms, les limites des neiges et des arbres, les hauteurs des tours (310 m, de 40 à 180 m), de la cheminée (120 m) et du phare (33 m) |
| 4 | Noms des sommets | mont Hollow, l'Ember, mont Calder, monte Solana, dôme du glacier, les Hauts, la Table rouge, la Sœur de pierre, le Ben, les hauteurs, kopje du lodge, la butte du manoir, terril de la carrière, levée de Bayou Cross, dune de Coral Key. Attention : « la Sœur de pierre » ressemble au nom de Sœur-de-Pierre, à l'autel de Verdant. Lien voulu ou autre nom ? |
| 5 | Valeurs de la météo | tous les multiplicateurs de la section 5.1 et toutes les probabilités de la section 5.2 |
| 6 | Lignes de transport | les trente-trois lignes, leurs arrêts et leurs fréquences. Seule la ligne d'avion A1 vient des notes |
| 7 | Vitesses et tailles des véhicules | toutes les valeurs de la section 6.1 |
| 8 | Règles pour monter et descendre | la section 6.3 décrit le principe. Les valeurs de jeu sont à définir par le game-designer avant d'être codées |
| 9 | Espèces et leurs valeurs | honneur, vie, dégâts, vitesse, groupes et heures des quarante-trois espèces |
| 10 | Répartition par zone | toute la section 9 : quel bâtiment, quel prop, quelle bête dans quelle zone. Les données ne le disent que par île |
| 11 | Climat de The Shallows | les données n'en donnent pas. Proposé : tropical humide, comme Verdant |
| 12 | Emplacement des ponts et des gués | proposé d'après la carte : pont de Solana à 2.4, pont gardé de Grayhaven à 2.7 et 1N.2, gués à 1S.2 et 14.4, à 14.1 et 12.1, à 9.4 et 10.5 |
| 13 | Unité des vitesses limites des routes | les données donnent 110, 70, 30… sans unité. La fiche les laisse sans unité ; à lire sans doute en km/h |

### 11.2 Écarts à trancher

Ces points opposent les nouvelles données à ce qui était déjà écrit, ou deux parties des données entre elles. Rien n'a été corrigé en silence : la fiche suit les données et signale l'écart. Pour chacun, trois sorties possibles : corriger les données, changer la Bible, ou garder les deux avec une explication dans le monde.

| N° | Écart | Ce qui était écrit | Ce que disent les données du monde vivant |
| --- | --- | --- | --- |
| 1 | Apex de Redmesa | le mode (section 9.2) et la fiche des zones donnent le **puma** à Redmesa, dans les canyons et dans la grotte du repaire | pas de puma sur Redmesa. Le puma est sur Hollowpine et sur Calder. Redmesa n'a pas d'apex |
| 2 | Faune secondaire | le mode et la fiche des zones citent aussi : guépard (Tallgrass), python et panthère (Saltmarsh), élan (Hollowpine), crocodile marin, raie et barracuda (The Shallows), loup (Solana), ours et renard (Grayhaven), harpie (Verdant), chevaux sauvages (Redmesa) | ces espèces n'existent pas dans les données. L'anaconda remplace le python ; le requin de récif est l'apex de The Shallows |
| 3 | Trois « apex » de plus | la règle de cohérence cite six apex | la bête de la quarantaine, le rhinocéros et le fauve échappé du zoo ont aussi la classe « apex ». Tallgrass en a donc deux |
| 4 | Puma à Calder | « aucun grand prédateur en liberté dans les villes » | le puma est dans la liste de Calder. La fiche le garde dans les collines du nord (4.9), hors de la ville |
| 5 | Métro noyé d'Ashgrove | la fiche des zones décrit une ligne de métro inondée sous Ashgrove (1N.4) | « pas de métro hors de Calder et de la Jumelle est ». Proposition : c'est une ruine de 2003, pas un transport ; la règle ne vise que les métros en service |
| 6 | Terminus du métro à Eastbank | le type de route « métro » existe « à Calder et sur la Jumelle est seulement » | la ligne M2 finit à 6.6, sur Eastbank, et Eastbank a le métro dans ses transports mais pas dans ses routes. La fiche fait arriver la rame par le pont de la Jumelle est |
| 7 | Avion de ligne à Eastbank | la ligne A1 fait escale à 6.7 | la liste des transports d'Eastbank a l'avion de brousse, pas l'avion de ligne |
| 8 | Pistes de la ligne A1 | « avions de ligne seulement entre de vraies pistes » | A1 se pose à 2.7 Harvest Flats (aucune piste décrite), à 1N.6 Port d'Ashgrove (l'aérodrome d'Ashgrove) et à 1S.5 Zone militaire cachée (une piste en terre dans la fiche des zones). Faut-il trois vraies pistes ? |
| 9 | Ce que la tempête arrête | « les transports de mer et d'air s'arrêtent » | la liste d'arrêt ne contient que ferry, bateau, avion et hélicoptère. Le porte-conteneurs, la barge et l'avion de brousse continuent |
| 10 | Neige sur Hollowpine | « neige seulement au-dessus de la limite des neiges » | le climat tempéré froid donne 6 % de neige à toute l'île. Lecture proposée : sous 1 300 m, ce tirage donne de la pluie |
| 11 | Ponts de Solana | deux ponts relient Solana à Hollowpine et à Calder | Solana n'a pas le type « pont ou digue » dans ses routes |
| 12 | Pontons de Calder | la marina de Richou a des pontons | Calder n'a pas le type « ponton et passerelle » dans ses routes |
| 13 | Gare centrale | la fiche des zones place la gare centrale à Midtown (4.3) | le train côtier T1 part d'Old Harbor (4.2) et ne s'arrête pas à Midtown |
| 14 | Départ du ferry du nord | la carte place la petite ville de Maple Hollow (2.4) au sud de Hollowpine | le ferry du nord F1 part de 2.4 pour Frost Isle, tout au nord : il doit contourner l'île |
| 15 | Ferries du Vieux Port | la fiche des zones y fait arriver les ferries de Saltmarsh et de Frost Isle | seul le ferry d'Ember (F3, depuis Saltmarsh) y arrive |
| 16 | Hauteurs déjà générées | la fiche des zones décrit le monde actuel : tours jusqu'à 130 m, relief de Calder d'une centaine de mètres, cône d'Ember de 60 m | 310 m, 920 m et 1 480 m. C'est la décision « vraie échelle » : le code actuel est à mettre à niveau |
| 17 | Neige sur l'Ember | l'Ember n'a pas de limite des neiges : c'est un volcan tropical | la règle d'altitude change la pluie en neige au-dessus de 1 300 m, sans exception, et l'Ember monte à 1 480 m. Lecture proposée : la règle ne joue que sur les îles qui ont une limite des neiges |

### 11.3 À transmettre

- **Au game-designer :** les effets de la météo (section 5.1), les règles pour monter sur un véhicule (section 6.3), les chutes (section 4.3) et le feu de brousse de Tallgrass ont des conséquences de jeu. La fiche décrit le monde ; les mécaniques restent à définir par lui.
- **Au narrative-director :** les écarts 1, 2 et 5 touchent ce qui était déjà écrit. Ils demandent son accord avant tout changement.
- **Au level-designer et à l'art-director :** la répartition par zone (section 9) et la liste des modèles 3D « pour l'essentiel » restent à établir ensemble.
