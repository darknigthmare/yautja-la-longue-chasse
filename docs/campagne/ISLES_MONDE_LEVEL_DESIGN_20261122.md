# The Isles — Lore, monde, level design et modularité

Nov 22, 2026 · @darknigthmare

Quatrième document de la série The Isles, après le [mode](MODE_THE_ISLES_20261121.md), l'[inventaire](ISLES_PRODUCTION_COMPLETE_20261121.md) et les [fiches de mission](ISLES_FICHES_MISSIONS_20261122.md). Il approfondit l'**histoire de l'archipel**, le **monde**, le **level design** du monde ouvert isométrique et la **modularité** (tuiles, bâtiments, quartiers, PNJ, météo, peuplement).

> **Révision du 22 novembre :** carte à 12 × 12 km, métropole de Calder, Eastbank et Grayhaven. Les métriques ci-dessous restent valables ; les nouveaux quartiers, transports et la quarantaine sont dans [Métropole, transports, zone de quarantaine](ISLES_EXTENSION_METROPOLE_QUARANTAINE_20261122.md).

**Règle de lecture.** Tout est *(proposé)*. L'archipel, ses peuples, ses villes et ses personnages sont fictifs.

---

## Sommaire

1. Histoire de l'archipel
2. Les Îles aujourd'hui : politique, économie, vie
3. Les factions humaines
4. Les Yautja et l'archipel
5. Les îles, histoire par histoire
6. Level design : principes du monde ouvert isométrique
7. Level design : métriques
8. Level design : les gabarits de quartiers
9. Level design : réseau de déplacement
10. Level design : densité des points d'intérêt
11. Modularité : tuiles et blocs
12. Modularité : bâtiments par modules
13. Modularité : quartiers préfabriqués
14. Modularité : PNJ composables
15. Modularité : peuplement et horaires
16. Modularité : météo et événements de monde
17. Données à créer

---

## 1. Histoire de l'archipel

| Époque | Événement |
| --- | --- |
| Il y a 2 000 ans | Un peuple de marins, les **Tahren** (fictif), habite les îles du sud. Il voit descendre des chasseurs et élève l'**autel** de Verdant. Ses guerriers demandent à être chassés |
| Il y a 1 500 ans | Deux clans yautja se disputent l'archipel ; une gardienne impose la paix : **terrain commun** (fragments 31–40) |
| Il y a 800 ans | Les Tahren disparaissent (maladie, exil : les fragments ne disent pas tout). Il reste des ruines à Verdant, des gravures à Ember et dans les grottes de Hollowpine |
| XVIIᵉ siècle | Des navigateurs européens fictifs nomment l'archipel « les Îles » ; escale de baleiniers au nord (Frost Isle) |
| XVIIIᵉ siècle | Les îles deviennent un repaire de corsaires ; le port de **Calder** est fondé sur leur ancien mouillage |
| XIXᵉ siècle | Mines de cuivre à Redmesa (naissance de **Dustwater**) ; forêts exploitées à Hollowpine ; prison de **Blackrock** |
| 1914–1945 | **Ironhook** devient une base navale ; la digue est construite |
| 1960 | Indépendance en territoire autonome, sous protection lointaine ; Calder grandit grâce au port franc |
| 1990 | Augustin Hale rachète Tallgrass et Halcyon Cay ; fondation de la réserve **Halcyon** |
| 2003 | **Autodestruction de Vash'Tar** à Ashgrove (Grayhaven), traqué par les mercenaires de Hale ; « accident de dépôt de munitions » ; île en quarantaine |
| 2009 | Faillite d'Halcyon ; les animaux sont relâchés |
| 2015 | Une société minière privée reprend la mine de Redmesa avec sa propre milice |
| 2020 | ARGOS installe discrètement une station sur Ironhook, sous couverture militaire |
| 2026 | Présent du mode |

---

## 2. Les Îles aujourd'hui : politique, économie, vie

- **Statut :** territoire autonome ; un gouverneur à Calder, peu de pouvoir hors de la ville.
- **Économie :** port franc (trafic légal et illégal), mine de cuivre de Redmesa, bois de Hollowpine, tourisme (plages de Calder, Shallows), pêche, recherche (Ember, Frost).
- **Population :** environ 300 000 habitants, dont les deux tiers à Calder.
- **Langues :** anglais et un créole des Îles ; espagnol à Dustwater ; quelques langues de travailleurs venus d'ailleurs.
- **Ce qui ne marche pas :** la police ne tient que Calder ; les autres îles sont aux mains des factions ; la corruption est partout ; la base d'Ironhook fait ce qu'elle veut.
- **Ce que racontent les habitants :** « les gens disparaissent », « les bêtes de Hale », « l'ombre sur les toits ». Des légendes de pêcheurs parlent des **Marcheurs de chaleur** qui reviennent les étés brûlants.

---

## 3. Les factions humaines

| Faction | Où | Chef | But | Relation au joueur |
| --- | --- | --- | --- | --- |
| **Police de Calder** | Calder | Commissaire Barnes | l'ordre en ville | proie digne ; répond aux alertes |
| **Bureau du shérif** | Dustwater | Shérif Lena Ortiz | l'ordre à Dustwater, souvent seule | proie digne, Honorée possible |
| **Les Docks** | Calder (port) | Rook | contrôle du port et des trafics | proie digne |
| **Les Hauteurs** | Calder (quartiers hauts) | Vale | contrôle de la drogue et des quartiers | proie digne |
| **Braconniers du Prédicateur** | Verdant | « le Prédicateur » | animaux de Hale vendus à l'étranger | proie digne |
| **Trafiquants des Passes** | Shallows, Saltmarsh | la Veuve, les Frères Kade | armes et drogue | proie digne |
| **Milice de la mine** | Redmesa | Lourd (prime) | garder la mine, terroriser les mineurs | proie digne |
| **Chasseurs de Tallgrass** | Tallgrass, Hollowpine | Torres, Vance | chasse au gros gibier pour clients riches | proie digne |
| **Bûcherons armés** | Hollowpine | Skov | coupe illégale | proie digne |
| **Garde de Hale** | Halcyon Cay | Rhea Kost | protéger Hale | proie digne |
| **Charognards de Grayhaven** | Grayhaven | Mara la Grise | piller les ruines, vendre la technologie | proie digne |
| **Garnison du mur** | Grayhaven | sous les ordres d'Ironhook | garder la quarantaine | proie digne |
| **Les Restés** | Grayhaven | — | survivre dans les ruines | **interdits** |
| **Garnison d'Ironhook** | Ironhook | Major Petrov | la base ; obéit à des ordres de loin | proie digne |
| **ARGOS (station des Îles)** | Ironhook | Dr Haddad | étudier le terrain commun | équipe spécialisée |
| **Civils** | partout | — | vivre | **interdits** |

**Relations entre factions** :

| | Police | Docks | Hauteurs | Milice | Trafiquants | Garde de Hale | Garnison | ARGOS |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Police | — | hostile | hostile | neutre (corrompue) | hostile | neutre | soumise | ignorée |
| Docks | hostile | — | **guerre** | neutre | alliés | neutre | neutre | ignorée |
| Hauteurs | hostile | **guerre** | — | neutre | neutre | neutre | neutre | ignorée |
| Trafiquants | hostile | alliés | neutre | clients | — | payés par Hale | payent la garnison | ignorée |
| Garnison | — | — | — | — | corrompue | — | — | couverture |

Le joueur peut **utiliser ces relations** : frapper un gang sous l'apparence de l'autre (voix imitée), déclencher une guerre, laisser les factions s'user.

---

## 4. Les Yautja et l'archipel

- **Terrain commun** : aucun clan ne le possède ; tous peuvent y chasser selon le code. C'est la loi de la gardienne, il y a 1 500 ans.
- **Sœur-de-Pierre** : la gardienne actuelle de l'autel, très âgée ; elle ne chasse plus ; elle grave les contrats, juge les fautes des Îles, déclare les Bad Blood des Îles.
- **Les clans présents** : en solo, 2 ou 3 chasseurs en IA d'autres clans chassent en même temps ; en ligne, les autres joueurs.
- **Ce que les Yautja pensent de Hale** : un Ooman qui a vu un chasseur et n'a jamais compris le code. Pour Sœur-de-Pierre, il est une **honte pour le terrain commun** : il a acheté une arme yautja à des voleurs.
- **Les armes perdues** : des chasseurs sont tombés sur l'archipel au fil des siècles ; certaines de leurs armes ont été trouvées par des Oomans (Hale, ARGOS). Les rendre à l'autel est un devoir (arc Hale, siège d'Ironhook).

---

## 5. Les îles, histoire par histoire

| Île | Histoire | Ce qu'on y trouve de cette histoire |
| --- | --- | --- |
| **Verdant** | cœur des Tahren ; ruines et autel ; aujourd'hui braconniers et archéologues | pyramide, fresques, fouilles, fragments 1–5 |
| **The Shallows** | repaire de corsaires ; épave du *Meridian* (cargo échoué en 1994, plein d'armes) | phare, épaves, ponton |
| **Tallgrass** | ranchs du XIXᵉ siècle ; réserve Halcyon de 1990 à 2009 | lodge, enclos, troupeaux, archives de Hale |
| **Saltmarsh** | delta pauvre ; raffinerie construite en 1970, fermée en 2003 | torchère, village sur pilotis |
| **Redmesa et Dustwater** | ville minière du XIXᵉ siècle ; ville fantôme abandonnée en 1930 ; mine reprise en 2015 | rue western, gare, mine, ville fantôme |
| **Calder** | port de corsaires, puis port franc ; tours des années 1990–2020 ; Hale y a construit sa tour | vieille ville, docks, tour Hale, Hauteurs |
| **Ember** | volcan sacré des Tahren ; observatoire construit en 1985 | grottes gravées, observatoire, radar |
| **Hollowpine** | forêts exploitées depuis 1850 ; barrage de 1962 ; téléphérique touristique de 1980 | scierie, barrage, chalets |
| **Frost Isle** | escale de baleiniers ; station de recherche depuis 1974 | baleinière échouée, station, glacier |
| **Ironhook** | base navale de 1914 ; station secrète d'ARGOS depuis 2020 | digue, base, chantier, labo |
| **Blackrock** | prison depuis 1870 | cour, cellules |
| **Halcyon Cay** | île privée de Hale | manoir, salle des trophées |

---

## 6. Level design : principes du monde ouvert isométrique

1. **Lire la carte d'en haut.** Comme dans *Race'n'Chase* : les routes, les côtes et les rivières dessinent la carte ; les toits et la végétation ont des couleurs franches par biome.
2. **Un repère par île, un repère central.** Le volcan se voit de partout ; chaque île a son repère (pyramide, phare, lodge, torchère, mesa, tour Hale, barrage, glacier, radars).
3. **Gradient de densité.** Du centre de Calder vers la nature : la densité humaine baisse par paliers lisibles (section 8).
4. **Trois couches verticales.** Sol, hauteurs (toits, canopée, falaises), dessous (égouts, grottes, galeries, cales). Le Yautja vit surtout en hauteur.
5. **Chaque lieu a 3 entrées.** Sol, hauteur, dessous (ou eau).
6. **Les liaisons sont des lieux.** Ponts, gués et ferries ont des gardes, des barrages et des embuscades.
7. **La caméra ne cache jamais le joueur.** Les bâtiments hauts sont espacés ou découpés ; les arbres de premier plan deviennent transparents.
8. **Des boucles d'activité.** Chaque île propose une boucle : un repaire → 3 ou 4 activités → retour au repaire en 10 à 15 minutes.

---

## 7. Level design : métriques

| Mesure | Valeur |
| --- | --- |
| Tuile | 2 m × 2 m ; hauteur d'un bloc 1 m |
| Rue de Calder | 6 à 10 tuiles (avec trottoirs) |
| Ruelle | 2 à 3 tuiles |
| Pâté de maisons de Calder | 24 × 24 à 40 × 40 tuiles |
| Hauteur des immeubles | 4 à 12 blocs (Hauteurs), 20 à 60 blocs (tours) ; tour Hale : 90 blocs |
| Espacement entre toits franchissables | 2 à 4 tuiles (saut), 5 à 10 tuiles (grappin) |
| Rue de Dustwater | 10 tuiles, bâtiments de 2 à 3 étages, toits plats reliés |
| Chemin en nature | 2 à 4 tuiles ; piste 4 à 6 |
| Distance entre deux points d'intérêt (nature) | 120 à 250 tuiles |
| Distance entre deux points d'intérêt (ville) | 20 à 60 tuiles |
| Vue d'un garde | 12 tuiles de jour, 6 de nuit, 20 avec optique |
| Rayon d'un projecteur d'hélicoptère | 8 tuiles |
| Zone de recherche d'alerte | rayon 40 tuiles (niveau 1) à 150 tuiles (niveau 5) |
| Temps pour traverser une île à pied | 4 à 8 minutes |
| Temps pour traverser l'archipel à pied et en ferry | 35 à 45 minutes |

---

## 8. Level design : les gabarits de quartiers

| Gabarit | Densité | Bâtiments | Humains | Hauteurs | Dessous | Où |
| --- | --- | --- | --- | --- | --- | --- |
| **Centre d'affaires** | très forte | tours, places, parkings | 40–80 par pâté | toits de tours (grappin) | parkings souterrains | Calder |
| **Vieille ville** | forte | immeubles bas, marché, ruelles | 30–60 | toits reliés | caves, égouts | Calder |
| **Port** | forte | entrepôts, grues, conteneurs | 20–40 (dockers, gang) | grues, conteneurs | cales de navires | Calder |
| **Quartier populaire** | forte | immeubles de 4–8 étages, cours | 30–50 (gang la nuit) | toits, escaliers de secours | égouts | Calder (Hauteurs) |
| **Banlieue** | moyenne | pavillons, jardins, centres commerciaux | 10–20 | toits bas | caniveaux | Calder |
| **Petite ville** | moyenne | rue principale, saloon, gare | 15–30 | toits plats reliés | caves, mine | Dustwater |
| **Village** | faible | 6–15 maisons, quai ou place | 5–15 | toits | — | une par île |
| **Camp** | faible | tentes, véhicules | 5–12 armés | arbres, rochers | — | nature |
| **Industriel isolé** | moyenne | raffinerie, mine, scierie, barrage | 10–25 | structures | galeries, tuyaux | Saltmarsh, Redmesa, Hollowpine |
| **Militaire** | forte, armée | casernes, hangars, tours | 30–60 armés | tours, hangars | bunkers | Ironhook |
| **Nature** | très faible | — | 0–3 | arbres, falaises | grottes | partout |
| **Sacré** | nulle | ruines | 0–4 (archéologues) | pyramide | salles de l'autel | Verdant, Ember |

---

## 9. Level design : réseau de déplacement

### 9.1 Liaisons entre îles
| Liaison | Type | Gardée à l'alerte | Particularité |
| --- | --- | --- | --- |
| Calder ↔ Ember | pont routier | 2 | barrage de police |
| Calder ↔ Redmesa | pont routier et voie ferrée | 2 | train de minerai |
| Calder ↔ Verdant | ferry | 3 | horaires fixes |
| Verdant ↔ Saltmarsh | bayou navigable | — | hydroglisseurs |
| Verdant ↔ Shallows | récifs, gué à marée basse | — | marée |
| Redmesa ↔ Tallgrass | gué | — | saison sèche |
| Redmesa ↔ Saltmarsh | ferry | 3 | — |
| Tallgrass ↔ Ember | pont | 2 | — |
| Tallgrass ↔ Hollowpine | gué | — | — |
| Ember ↔ Hollowpine | pont | 2 | — |
| Hollowpine ↔ Frost Isle | ferry | 3 | glace en hiver |
| Ember ↔ Ironhook | digue | toujours (3) | entrée unique |
| Calder ↔ îlots | bateaux | — | Blackrock et Halcyon Cay par la mer |
| Calder ↔ Eastbank | tunnel du Port, pont de la Baie, métro (lignes 2 et 3) | 2 | trafic dense |
| Eastbank ↔ Grayhaven | aucune liaison officielle ; nage ou bateau de nuit | toujours (3) au mur | quarantaine |
| Ironhook ↔ Grayhaven | route militaire du mur | toujours (3) | entrée des militaires |

### 9.2 Le réseau vertical
- **Calder :** un **réseau de toits** continu sur la vieille ville et les Hauteurs (saut) ; grappin pour le centre d'affaires.
- **Verdant :** un réseau de **canopée** continu.
- **Redmesa :** falaises et mesas, reliées par des corniches.
- **Hollowpine :** câbles du téléphérique (le Yautja peut s'y suspendre).

---

## 10. Level design : densité des points d'intérêt

| Type de point | Par île (moyenne) |
| --- | --- |
| Repaire | 1 |
| Lieux principaux (camp, village, industrie) | 4 à 7 |
| Activités annexes | 3 (missions) + 1 à 2 épreuves |
| Fragments de l'autel | 4 à 6 |
| Légendaire | 1 |
| Spots de primes | 1 à 2 |
| Événements aléatoires possibles | 6 à 10 emplacements |
| Points de vue (révèlent la carte) | 1 à 2 |

**Règle :** en nature, le joueur doit voir **un point d'intérêt toutes les 60 secondes** de déplacement (fumée, lumière, bâtiment, animal, bruit).

---

## 11. Modularité : tuiles et blocs

### 11.1 Grille
- Tuile de sol 2 × 2 m ; bloc de hauteur 1 m.
- Chaque tuile a : **biome**, **sol** (texture), **hauteur**, **eau** (profondeur), **marchable**, **bruit** (pas du joueur), **couvert** (0, 1, 2).

### 11.2 Familles de tuiles (par biome)
| Famille | Exemples | Nombre par biome |
| --- | --- | --- |
| Sol | herbe, sable, asphalte, neige… | 6 |
| Transition | herbe → sable, trottoir → rue… | 8 |
| Pente | rampe douce, raide, escalier | 4 |
| Falaise | mur de roche, surplomb, corniche | 6 |
| Eau | peu profonde, profonde, rive, chute | 5 |
| Chemin | piste, sentier, route, voie ferrée | 4 |
| Végétation au sol | herbe haute, buissons, roseaux | 4 |
| Détail | pierres, flaques, débris | 3 |

### 11.3 Règles automatiques (auto-tuile)
- Les transitions se placent seules selon les voisins (règle des 8 voisins).
- Les falaises se calculent à partir de la différence de hauteur (≥ 3 blocs = falaise).
- L'eau suit le niveau de la mer et la marée (Shallows, Saltmarsh).

---

## 12. Modularité : bâtiments par modules

Un bâtiment isométrique = **socle + étages + toit + détails**, sur la grille.

| Module | Tailles | Variantes |
| --- | --- | --- |
| Socle | 2×2 à 12×12 tuiles | fondations, pilotis, quai |
| Mur | 1 tuile × 1 étage (3 blocs) | plein, fenêtre, porte, vitrine, garage, abîmé |
| Angle | intérieur, extérieur | — |
| Étage | répétition des murs | — |
| Toit | plat, pente, verrière, tôle, chaume | avec ou sans détails |
| Détails de toit | climatiseur, antenne, château d'eau, panneau solaire | — |
| Façade | escalier de secours, balcon, enseigne, auvent | — |
| Intérieur | sol, cloisons, mobilier | par style |

### 12.1 Styles
| Style | Où | Matériaux |
| --- | --- | --- |
| Affaires | centre de Calder | verre, acier, béton clair |
| Colonial | vieille ville | pierre, volets, tuiles |
| Populaire | Hauteurs | béton, briques, linge aux fenêtres |
| Pavillon | banlieue | crépi, bois, toits en pente |
| Western | Dustwater | bois, enseignes peintes |
| Industriel | port, raffinerie, mine | tôle, rouille, tuyaux |
| Pilotis | Saltmarsh, Shallows | bois, tôle |
| Lodge | Tallgrass, Hollowpine | rondins, pierre |
| Militaire | Ironhook | béton, camouflage, barbelés |
| Polaire | Frost Isle | modules métalliques, isolants |
| Manoir | Halcyon Cay | pierre blanche, marbre, verrières |
| Ruine ancienne | Verdant, Ember | pierre gravée, végétation |

### 12.2 Règles
- Les bâtiments de plus de 8 étages sont **découpés** quand le joueur est derrière (coupe horizontale au-dessus de lui).
- Chaque bâtiment jouable a une **entrée par le toit** (le Yautja entre par le haut).
- Un bâtiment = **une fiche de données** (style, taille, étages, intérieur oui/non, faction, peuplement).

---

## 13. Modularité : quartiers préfabriqués

Des **préfabriqués** (assemblages de bâtiments, routes et props) accélèrent la construction de l'archipel.

| Préfabriqué | Contenu | Taille (tuiles) | Utilisé |
| --- | --- | --- | --- |
| Pâté d'affaires | 2–4 tours, place, parking | 40 × 40 | 8 fois |
| Pâté colonial | 6–10 immeubles bas, cour, marché | 32 × 32 | 12 fois |
| Pâté populaire | 4–6 immeubles, cour, terrain de basket | 32 × 32 | 10 fois |
| Rue pavillonnaire | 8–12 maisons, jardins | 60 × 20 | 15 fois |
| Quai portuaire | entrepôt, grue, conteneurs, navire | 60 × 30 | 6 fois |
| Rue de Dustwater | 8–10 bâtiments western | 80 × 20 | 2 fois |
| Village de pêcheurs | 8 maisons, quai, bateaux | 40 × 40 | 4 fois |
| Village sur pilotis | 10 cabanes, passerelles | 40 × 40 | 2 fois |
| Camp armé | tentes, feu, véhicules, tour de guet | 20 × 20 | 12 fois (variantes de faction) |
| Ranch | maison, grange, enclos | 40 × 40 | 2 fois |
| Petite mine | entrée, baraquement, convoyeur | 30 × 30 | 3 fois |

Chaque préfabriqué a **3 variantes** (orientation, détails, état) pour éviter la répétition visible.

---

## 14. Modularité : PNJ composables

Même système que la Terre (couches corps, tête, tenue, équipement, arme, signe de faction), en isométrique 8 directions.

| Faction | Signe | Couleur dominante *(proposée)* |
| --- | --- | --- |
| Police de Calder | uniforme, casquette | bleu marine |
| Shérif de Dustwater | étoile, chapeau | brun |
| Les Docks | gilets de travail, bonnets | orange sécurité |
| Les Hauteurs | vêtements de sport, foulards | vert bouteille |
| Braconniers | treillis usés | kaki |
| Trafiquants | chemises légères, lunettes | blanc et noir |
| Milice de la mine | casques de chantier, gilets pare-balles | jaune et gris |
| Chasseurs | gilets de chasse | orange chasse et brun |
| Garde de Hale | costumes sombres, puis équipement tactique | noir |
| Garnison | uniforme militaire | vert olive |
| ARGOS | tenues grises, capteurs | gris et blanc |
| Civils | variés | aucune couleur de faction |

**Règle de lecture :** sur une vue isométrique éloignée, la **couleur de faction** doit dire au joueur qui est qui ; les civils n'ont jamais de couleur de faction.

---

## 15. Modularité : peuplement et horaires

### 15.1 Tables de peuplement
Chaque gabarit de quartier a une table **par tranche horaire** (6 tranches de 4 heures de jeu).

| Gabarit | 0–4 h | 4–8 h | 8–12 h | 12–16 h | 16–20 h | 20–24 h |
| --- | --- | --- | --- | --- | --- | --- |
| Centre d'affaires | sécurité | civils (peu) | civils (beaucoup) | civils (beaucoup) | civils | sécurité, quelques civils |
| Vieille ville | gang, police | marché | civils, marché | civils | civils, bars | bars, gang |
| Port | gang | dockers | dockers | dockers | dockers | gang, trafiquants |
| Hauteurs | gang | civils | civils | civils | civils, gang | gang |
| Banlieue | rien | civils | peu | peu | civils | civils |
| Dustwater | saloon | mineurs | civils | civils | mineurs | saloon, shérif |
| Camp en nature | sentinelles | réveil | chasse | repos | chasse | feu, sentinelles |
| Militaire | rondes | relève | exercice | exercice | relève | rondes, projecteurs |

### 15.2 Routines civiles
Un civil a une **maison**, un **travail** et 1 ou 2 **lieux de loisir**. Il se déplace entre eux selon l'heure. Effrayé, il rentre chez lui ou fuit vers le commissariat.

### 15.3 Peuplement dynamique
- Les humains apparaissent **hors champ** (au-delà de 40 tuiles) et disparaissent au-delà de 80.
- Les PNJ **importants** (chefs, primes, légendaires, PNJ nommés) sont persistants.
- Les **corps** restent 10 minutes de jeu, puis sont retirés (sauf s'ils sont trouvés : alors la police les enlève).

---

## 16. Modularité : météo et événements de monde

### 16.1 Météo par île (poids)
| Île | Clair | Chaleur | Pluie | Orage | Brouillard | Sable | Neige / blizzard |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Verdant | 30 | 20 | 30 | 20 | — | — | — |
| Shallows | 50 | 30 | 10 | 10 | — | — | — |
| Tallgrass | 50 | 40 | — | 10 | — | — | — |
| Saltmarsh | 30 | 20 | 20 | — | 30 | — | — |
| Redmesa | 50 | 30 | — | — | — | 20 | — |
| Calder | 50 | 20 | 20 | 10 | — | — | — |
| Ember | 40 | 30 | — | — | 30 (cendres) | — | — |
| Hollowpine | 40 | — | 30 | — | 30 | — | — |
| Frost Isle | 30 | — | — | — | 20 | — | 50 |
| Ironhook | 50 | — | 30 | — | 20 | — | — |
| Eastbank | 50 | 20 | 20 | 10 | — | — | — |
| Grayhaven | 30 | — | 20 (pluie de cendres) | — | 50 (cendres, fumée) | — | — |

- La météo est **par île** : il peut pleuvoir sur Hollowpine et faire grand soleil sur Tallgrass.
- Elle change toutes les 20 à 40 minutes de jeu, avec un temps de transition de 2 minutes.

### 16.2 Événements de monde
| Type | Exemples | Effet |
| --- | --- | --- |
| Petit (aléatoire) | orage local, incendie, petite éruption | une zone change pour quelques minutes |
| Moyen (aléatoire, rare) | tempête sur une île, grève au port, couvre-feu | une île change pour une heure de jeu |
| Grand (saison) | ouragan, éruption, mutinerie, invasion | l'archipel change pour la saison |

### 16.3 Effets sur le monde
| Effet | Ce qui change |
| --- | --- |
| Pont coupé | liaison fermée ; ferry ou nage |
| Zone évacuée | plus de civils ; pillards armés |
| Couvre-feu | rues vides la nuit ; police nombreuse |
| Inondation | rues de Calder et de Saltmarsh praticables en bateau seulement |
| Cendres | thermique brouillé ; visibilité réduite |

---

## 17. Données à créer

| Fichier proposé | Contenu |
| --- | --- |
| `islesHistory.ts` | chronologie, fragments de l'autel (textes) |
| `islesFactions.ts` | 13 factions, chefs, buts, relations |
| `islesTiles.ts` | familles de tuiles par biome, règles d'auto-tuile |
| `islesBuildingModules.ts` | modules, styles, règles de découpe |
| `islesPrefabs.ts` | 11 préfabriqués et leurs 3 variantes |
| `islesDistricts.ts` | gabarits de quartiers, métriques |
| `islesNpcComposer.ts` | couches, couleurs de faction |
| `islesPopulation.ts` | tables horaires, routines, règles d'apparition |
| `islesWeather.ts` | tables par île, transitions, événements de monde |
| `islesTravelGraph.ts` | liaisons, horaires des ferries, état des ponts |
