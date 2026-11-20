# Yautja : La Longue Chasse — Bible de production des véhicules et montures

**Version 1.0 — 50 moyens de mobilité, poursuites, garages, écuries et extraction de trophées**

## Positionnement

Le module ne remplace jamais l’exploration Metroidvania à pied. Il superpose des itinéraires de tailles différentes : passages FOOT, sentiers MOUNT, pistes VEHICLE et routes HEAVY. Le joueur descend régulièrement de sa monture ou de sa machine pour ouvrir un raccourci, explorer une caverne, rejoindre une canopée ou activer une porte depuis l’intérieur.

Les références existantes sont séparées des créations du jeu : le Blade Fighter sert d’ancrage Kenner, les motos antigrav et la sphère d’éjection prolongent l’imagerie de Badlands, tandis que les destriers et la majorité des véhicules sont des créations originales cohérentes. Les montures « inspirées des fan-créations » n’en copient aucune précisément : seules l’idée générale et la fonction culturelle sont reprises.

## Échelle des statistiques

Toutes les statistiques vont de 1 à 10. Une valeur de 5 représente la moyenne de la catégorie. Les huit axes sont : vitesse, accélération, maniabilité, armure, puissance offensive, franchissement, furtivité et cargo.

## Socle d’animations

### Machines
- idle_empty 8f
- idle_occupied 8f
- mount_left/right 12f
- dismount_left/right 10f
- start 8f
- accelerate 12f
- cruise 12f
- max_speed 10f
- brake 8f
- reverse 8f
- skid 12f
- turn/flip 12f
- jump 12f
- air_loop 8f
- soft_land 10f
- hard_land 14f
- primary_fire 8f
- secondary_fire 10f
- ability 12f
- hit_front/rear/top 6f chacun
- damage_state_1/2 8f chacun
- EMP 12f
- disabled 14f
- destruction 24f
- wreck_loop 8f
- call_arrival 14f
- retrieval 14f
- repair 16f
- cargo_load/unload 16f

### Montures
- calm_idle 12f
- alert_idle 10f
- sniff 8f
- eat 12f
- sleep 16f
- mount_left/right 14f
- dismount_left/right 12f
- walk 12f
- trot 12f
- run 14f
- sprint 12f
- stop 10f
- turn 12f
- jump 16f
- air_loop 8f
- land 12f
- light_attack 12f
- heavy_attack 16f
- roar 16f
- hit_front/rear/top 6f chacun
- stagger 12f
- down 16f
- recover 16f
- wounded_gait 14f
- bond_interaction 16f
- call_arrival 20f
- KO/death_non_gore 24f

Les animations du pilote/cavalier sont livrées comme silhouettes complètes par famille d’équipement. Les armes et VFX peuvent utiliser des sockets, mais le corps du Yautja ne doit jamais apparaître comme un assemblage de membres.

## Catalogue rapide

| # | Nom | Famille | Tier | VIT | ARM | OFF | FRANCH. | FURT. | CARGO |
|---:|---|---|---:|---:|---:|---:|---:|---:|---:|
| 01 | Blade Fighter K-93 | Héritage technologique | 4 | 7 | 7 | 9 | 6 | 3 | 4 |
| 02 | Blade Fighter Viper | Héritage technologique | 5 | 8 | 7 | 10 | 7 | 5 | 2 |
| 03 | Moto antigrav de clan | Moto Yautja | 3 | 9 | 5 | 5 | 8 | 5 | 2 |
| 04 | Moto antigrav de chasse | Moto Yautja | 3 | 10 | 3 | 4 | 9 | 7 | 1 |
| 05 | Grav-Sled éclaireur | Planche antigrav | 2 | 8 | 1 | 2 | 8 | 8 | 1 |
| 06 | Hunter Speeder | Speeder | 3 | 9 | 4 | 6 | 8 | 8 | 2 |
| 07 | Thunder Fang | Moto de guerre | 4 | 8 | 8 | 8 | 7 | 2 | 2 |
| 08 | Skimmer des dunes | Skimmer environnemental | 3 | 9 | 4 | 5 | 10 | 4 | 4 |
| 09 | Skimmer des marais | Skimmer environnemental | 3 | 7 | 5 | 4 | 10 | 7 | 3 |
| 10 | Skimmer cryo | Skimmer environnemental | 3 | 9 | 5 | 5 | 10 | 6 | 3 |
| 11 | Jungle Strider | Marcheur mécanique | 3 | 6 | 6 | 6 | 10 | 6 | 3 |
| 12 | Cliff Crawler | Marcheur mécanique | 4 | 5 | 7 | 5 | 10 | 5 | 4 |
| 13 | Burrower Rig | Foreuse mobile | 4 | 4 | 9 | 7 | 9 | 1 | 6 |
| 14 | River Manta | Glisseur amphibie | 3 | 8 | 4 | 5 | 10 | 7 | 4 |
| 15 | Canopy Glider | Planeur | 3 | 7 | 2 | 3 | 10 | 9 | 1 |
| 16 | Skiff de déploiement | Transport de chasse | 4 | 6 | 7 | 5 | 8 | 4 | 7 |
| 17 | War Skiff | Transport de combat | 5 | 5 | 9 | 9 | 7 | 2 | 8 |
| 18 | Crawler de siège | Char marcheur | 5 | 3 | 10 | 10 | 7 | 1 | 7 |
| 19 | Trophy Carrier | Transport utilitaire | 2 | 5 | 4 | 1 | 7 | 6 | 9 |
| 20 | Grand Trophy Hauler | Transport utilitaire lourd | 4 | 3 | 8 | 2 | 5 | 1 | 10 |
| 21 | Forge mobile de clan | Véhicule atelier | 4 | 4 | 8 | 3 | 5 | 1 | 9 |
| 22 | Medivac Scarab | Véhicule médical | 4 | 7 | 7 | 2 | 7 | 5 | 7 |
| 23 | Capsule Drop Spear | Capsule d’insertion | 3 | 10 | 8 | 4 | 9 | 3 | 1 |
| 24 | Sphère d’éjection atmosphérique | Capsule de survie | 2 | 4 | 3 | 0 | 6 | 1 | 1 |
| 25 | Blood Runner | Véhicule hors-la-loi | 4 | 10 | 4 | 8 | 8 | 4 | 2 |
| 26 | Bone Grinder | Trike hors-la-loi | 4 | 7 | 8 | 9 | 6 | 1 | 4 |
| 27 | Scavenger Raider | Raider léger | 3 | 9 | 2 | 5 | 8 | 7 | 5 |
| 28 | Sled du voleur de trophées | Sled hors-la-loi | 3 | 8 | 3 | 3 | 7 | 8 | 8 |
| 29 | Moto de poursuite Enforcer | Véhicule Enforcer | 4 | 9 | 6 | 6 | 8 | 6 | 2 |
| 30 | Interceptor Enforcer | Intercepteur Enforcer | 5 | 8 | 8 | 7 | 8 | 5 | 3 |
| 31 | Skiff-prison Enforcer | Transport Enforcer | 5 | 5 | 9 | 5 | 6 | 2 | 9 |
| 32 | Chariot de l’Arbitre | Véhicule Enforcer cérémoniel | 5 | 4 | 9 | 8 | 6 | 1 | 4 |
| 33 | Sled-drone pisteur | Drone Enforcer | 3 | 8 | 2 | 3 | 8 | 8 | 1 |
| 34 | Porte-barricade Enforcer | Véhicule Enforcer utilitaire | 4 | 5 | 9 | 4 | 6 | 1 | 8 |
| 35 | Kha’Rha | Destrier biologique | 3 | 8 | 5 | 7 | 8 | 7 | 3 |
| 36 | Kha’Rha de guerre | Destrier biologique | 4 | 7 | 8 | 9 | 7 | 3 | 4 |
| 37 | Forest Stalker | Destrier arboricole | 3 | 8 | 3 | 6 | 10 | 9 | 1 |
| 38 | Sand Mauler | Destrier désertique | 3 | 9 | 5 | 7 | 10 | 6 | 3 |
| 39 | Stoneback | Bête de trait | 4 | 4 | 10 | 9 | 7 | 1 | 9 |
| 40 | Ice Fang | Destrier polaire | 3 | 8 | 5 | 7 | 10 | 9 | 2 |
| 41 | Swamp Strider | Destrier amphibie | 3 | 6 | 6 | 5 | 10 | 7 | 4 |
| 42 | Night Stalker | Destrier nocturne | 4 | 8 | 3 | 8 | 8 | 10 | 1 |
| 43 | Blood Beast | Destrier Bad Blood | 4 | 8 | 7 | 10 | 7 | 1 | 2 |
| 44 | Grande Bête des Elders | Destrier légendaire | 5 | 7 | 10 | 10 | 9 | 5 | 7 |
| 45 | Bone-Bison de guerre | Destrier domestiqué | 4 | 6 | 9 | 9 | 8 | 2 | 7 |
| 46 | Razorwing | Monture aérienne | 4 | 9 | 3 | 8 | 10 | 7 | 1 |
| 47 | Cliff Leaper | Destrier montagnard | 3 | 7 | 4 | 6 | 10 | 8 | 2 |
| 48 | Burrow Wyrm | Monture fouisseuse | 4 | 6 | 8 | 8 | 10 | 9 | 3 |
| 49 | Ash Horn | Destrier volcanique | 4 | 7 | 9 | 9 | 10 | 3 | 4 |
| 50 | Storm Runner | Destrier de tempête | 4 | 10 | 4 | 7 | 9 | 5 | 2 |

# Fiches détaillées

## 01. Blade Fighter K-93

**Famille :** Héritage technologique  
**Statut créatif :** Héritage Kenner réinterprété sous licence  
**Tier :** 4  
**Équipage :** 1 pilote  
**Dimensions :** 7,5 m long × 4,2 m large × 2,1 m haut

**Silhouette :** Châssis antigrav très bas en pointe de flèche, mâchoire mécanique frontale, deux nacelles latérales orange et grande lame dorsale.

**Rôle :** Intercepteur lourd, capture de proies et assaut de couloir extérieur.

**Statistiques :** Vitesse 7/10 · Accélération 5/10 · Maniabilité 5/10 · Armure 7/10 · Offense 9/10 · Franchissement 6/10 · Furtivité 3/10 · Cargo 4/10.

**Capacités :** Mâchoire de capture verrouillant une grande cible ; Éperonnage gravitationnel brisant les murs VEHICLE-BREAK ; Vol stationnaire court au-dessus des gouffres ; Mode relique Kenner avec VFX rétro optionnels.

**Armement :** Deux canons plasma orientables ; Missile intelligent central ; Lames de proue pour dégâts de collision.

**Biomes :** désert, plaine rocheuse, cité Yautja, ruines monumentales.

**Tags de level design :** `VEHICLE_LARGE`, `GRAV_RAMP`, `VEHICLE_BREAK_2`, `OPEN_ARENA`.

**Obtention :** Suite de quêtes « Héritage de la lame » : retrouver trois composants du modèle ancien, vaincre le gardien du hangar et obtenir l’autorisation d’un Elder.

**Faiblesses :** Gabarit trop large pour les cavernes ; Surchauffe après tirs continus ; Camouflage très limité.

**Animations propres :** Ouverture/fermeture de la mâchoire ; Capture d’une cible ; Missile central ; Éperonnage avec déformation du bouclier ; Transformation visuelle Legacy.

**Brief visuel :** Véhicule Yautja antigrav rétro-futuriste, silhouette fidèle à un jouet de combat des années 1990 mais rematérialisée en métal noir, bronze brûlé et énergie orange, mâchoire mécanique très lisible, aucune roue.

**Accroches de missions :** Boss-course contre un collectionneur Bad Blood ; Extraction d’une créature vivante sans la tuer.

## 02. Blade Fighter Viper

**Famille :** Héritage technologique  
**Statut créatif :** Réinterprétation moderne liée au pilote Viper  
**Tier :** 5  
**Équipage :** 1 pilote  
**Dimensions :** 8,1 m × 4,6 m × 2,2 m

**Silhouette :** Version plus organique et agressive : carapace bronze, ailes-lames noires, cockpit ouvert et proue ressemblant à un masque biomécanique.

**Rôle :** Chasseur terrestre de prestige, duel de véhicules et attaque rapide.

**Statistiques :** Vitesse 8/10 · Accélération 7/10 · Maniabilité 6/10 · Armure 7/10 · Offense 10/10 · Franchissement 7/10 · Furtivité 5/10 · Cargo 2/10.

**Capacités :** Ailes-lames déployables ; Dash latéral invulnérable très court ; Cloak Burst de 2,5 s après esquive parfaite ; Verrouillage simultané de trois cibles.

**Armement :** Canons plasma jumeaux ; Lance-disques de chasse ; Lames d’ailes en mêlée.

**Biomes :** canyon, steppe, mégastructure, zone de guerre.

**Tags de level design :** `VEHICLE_LARGE`, `GRAV_RAMP`, `AERIAL_GAP_2`, `BOSS_TRACK`.

**Obtention :** Récompense de l’Épreuve du Viper : battre son temps sur trois circuits puis survivre à un duel sans assistance de visée.

**Faiblesses :** Coût de réparation très élevé ; Très instable dans les tunnels ; Le Cloak Burst révèle la position à sa sortie.

**Animations propres :** Déploiement des ailes-lames ; Triple lock ; Dash latéral ; Demi-tour aérien ; Exécution de véhicule.

**Brief visuel :** Intercepteur Yautja premium aux lignes prédatrices, bronze vieilli, noir obsidienne et accents rouges, ailes latérales tranchantes, cockpit ouvert laissant voir un pilote Yautja entier et non modulaire.

**Accroches de missions :** Championnat Viper ; Intercepter un War Skiff avant son décollage.

## 03. Moto antigrav de clan

**Famille :** Moto Yautja  
**Statut créatif :** Inspirée des speeders de Predator: Badlands  
**Tier :** 3  
**Équipage :** 1 pilote  
**Dimensions :** 4,2 m × 1,5 m × 1,45 m

**Silhouette :** Longue moto sans roues, nez fourchu, colonne centrale massive et selle très reculée ; posture de conduite basse et menaçante.

**Rôle :** Transport quotidien sur Yautja Prime et poursuite rapide.

**Statistiques :** Vitesse 9/10 · Accélération 9/10 · Maniabilité 7/10 · Armure 5/10 · Offense 5/10 · Franchissement 8/10 · Furtivité 5/10 · Cargo 2/10.

**Capacités :** Boost de clan ; Saut gravitationnel ; Rappel automatique ; Lecture des balises routières Yautja.

**Armement :** Plasma Caster du pilote ; Lance-filet avant optionnel ; Éperon rétractable.

**Biomes :** ville Yautja, désert, savane, route de clan.

**Tags de level design :** `VEHICLE_MEDIUM`, `GRAV_RAMP`, `LOW_HAZARD_HOVER`, `CITY_LANE`.

**Obtention :** Achat auprès du forgeron-mécanicien après rang Blooded et permis de circulation de la cité.

**Faiblesses :** Faible protection arrière ; Sensible aux EMP ; Peu de capacité de transport.

**Animations propres :** Démarrage par impulsion ; Cabrement antigrav ; Dérapage 180° ; Saut long ; Appel autonome depuis l’arrière-plan.

**Brief visuel :** Moto antigrav Yautja longue et fonctionnelle, métal noir, os poli et énergie rouge sombre, technologie ancienne mais raffinée, aucune esthétique humaine de moto conventionnelle.

**Accroches de missions :** Course du Quartier des Forges ; Poursuite d’un voleur de trophée.

## 04. Moto antigrav de chasse

**Famille :** Moto Yautja  
**Statut créatif :** Extension originale de la famille Badlands  
**Tier :** 3  
**Équipage :** 1 pilote  
**Dimensions :** 3,65 m × 1,25 m × 1,25 m

**Silhouette :** Châssis plus court et découvert, deux patins énergétiques, selle haute permettant de sauter immédiatement.

**Rôle :** Reconnaissance, chasse solo et traversée de niveaux ouverts.

**Statistiques :** Vitesse 10/10 · Accélération 10/10 · Maniabilité 9/10 · Armure 3/10 · Offense 4/10 · Franchissement 9/10 · Furtivité 7/10 · Cargo 1/10.

**Capacités :** Dismount Attack instantanée ; Micro-camouflage durant un saut ; Marquage de piste thermique ; Silencieux gravitationnel à vitesse réduite.

**Armement :** Armes personnelles du pilote ; Deux dards plasma légers.

**Biomes :** jungle ouverte, steppe, désert, toundra.

**Tags de level design :** `VEHICLE_SMALL`, `GRAV_RAMP`, `AERIAL_GAP_2`, `HUNT_TRAIL`.

**Obtention :** Fabriquée dans le garage du vaisseau après collecte d’un noyau antigrav et de deux alliages de clan.

**Faiblesses :** Presque aucune armure ; Le boost vide rapidement la charge ; Impossible de porter un grand trophée.

**Animations propres :** Saut-démontage offensif ; Cloak jump ; Pivot sur place ; Réception sur pente ; Glissade sous obstacle haut.

**Brief visuel :** Moto antigrav Yautja légère, profil de rapace, moteur central apparent, petits trophées liés à la selle, silhouette nette et extrêmement rapide.

**Accroches de missions :** Traque sans toucher le sol toxique ; Contre-la-montre de scout.

## 05. Grav-Sled éclaireur

**Famille :** Planche antigrav  
**Statut créatif :** Création originale  
**Tier :** 2  
**Équipage :** 1 pilote  
**Dimensions :** 2,3 m × 0,8 m × 0,35 m

**Silhouette :** Planche épaisse en forme de lame avec étriers, poignée osseuse et stabilisateurs d’énergie latéraux.

**Rôle :** Mobilité précoce, tricks, messagerie et exploration de zones semi-ouvertes.

**Statistiques :** Vitesse 8/10 · Accélération 9/10 · Maniabilité 10/10 · Armure 1/10 · Offense 2/10 · Franchissement 8/10 · Furtivité 8/10 · Cargo 1/10.

**Capacités :** Wall skim sur surfaces marquées ; Grind sur rails Yautja ; Rappel manuel très rapide ; Saut avec rotation donnant une courte esquive.

**Armement :** Armes à une main uniquement ; Mine de poursuite optionnelle.

**Biomes :** cité, ruines, canopée aménagée, vaisseau géant.

**Tags de level design :** `VEHICLE_TINY`, `GRIND_RAIL`, `WALL_SKIM`, `SMALL_RAMP`.

**Obtention :** Récompense du tutoriel de mobilité du Homeworld.

**Faiblesses :** Aucune protection ; Chute immédiate en cas d’EMP ; Ne traverse pas l’eau profonde.

**Animations propres :** Montée en saut ; Grind ; Wall skim ; Rotation aérienne ; Chute et récupération.

**Brief visuel :** Planche antigrav Yautja compacte, métal gravé, lueur ambre discrète, forme d’arme cérémonielle, pilotage debout par un Yautja complet.

**Accroches de missions :** Livraison chronométrée entre quartiers ; Course clandestine sans armes.

## 06. Hunter Speeder

**Famille :** Speeder  
**Statut créatif :** Création originale  
**Tier :** 3  
**Équipage :** 1 pilote  
**Dimensions :** 4,8 m × 1,7 m × 1,0 m

**Silhouette :** Carlingue étroite comme un scarabée, pilote presque couché, pointe centrale et deux bras gravitationnels rabattables.

**Rôle :** Très longue traversée, infiltration et tir en mouvement.

**Statistiques :** Vitesse 9/10 · Accélération 8/10 · Maniabilité 8/10 · Armure 4/10 · Offense 6/10 · Franchissement 8/10 · Furtivité 8/10 · Cargo 2/10.

**Capacités :** Mode rase-sol silencieux ; Scan de proie en cône avant ; Ailes de stabilité déployables ; Autopilot Follow restant dans l’arrière-plan.

**Armement :** Canon plasma axial ; Deux micro-filets ; Armes personnelles légères.

**Biomes :** marais peu profond, désert, plaine, forêt clairsemée.

**Tags de level design :** `VEHICLE_MEDIUM`, `LOW_TUNNEL`, `GRAV_RAMP`, `HUNT_TRAIL`.

**Obtention :** Plan trouvé dans une épave de chasseur ancien puis restauré au vaisseau.

**Faiblesses :** Vulnérable par le dessus ; Virage lent à pleine vitesse ; Canon axial exige l’alignement.

**Animations propres :** Passage en mode rase-sol ; Déploiement des bras ; Scan conique ; Tir axial avec recul ; Autopilot Follow.

**Brief visuel :** Speeder Yautja bas, biomécanique, mélange de scarabée et de lame, pilote allongé, matériaux sombres et capteurs rouges, pas de roues.

**Accroches de missions :** Traverser une zone infestée sans alerter la ruche ; Duel de précision sur piste étroite.

## 07. Thunder Fang

**Famille :** Moto de guerre  
**Statut créatif :** Création originale  
**Tier :** 4  
**Équipage :** 1 pilote  
**Dimensions :** 4,9 m × 1,85 m × 1,6 m

**Silhouette :** Moto antigrav massive avec proue en crocs, blindage segmenté et deux stabilisateurs ressemblant à des mandibules.

**Rôle :** Charge frontale, guerre de clan et bris de barricades.

**Statistiques :** Vitesse 8/10 · Accélération 8/10 · Maniabilité 5/10 · Armure 8/10 · Offense 8/10 · Franchissement 7/10 · Furtivité 2/10 · Cargo 2/10.

**Capacités :** Charge imparable après 2 s d’élan ; Bouclier frontal ; Onde de choc à l’atterrissage ; Rugissement mécanique démoralisant les petites créatures.

**Armement :** Canon plasma lourd ; Lames mandibulaires ; Grenades larguées.

**Biomes :** cité en guerre, canyon, désert, forteresse.

**Tags de level design :** `VEHICLE_MEDIUM`, `VEHICLE_BREAK_2`, `WAR_LANE`, `GRAV_RAMP`.

**Obtention :** Débloquée en choisissant une alliance avec un clan militariste ou capturée durant une guerre de clans.

**Faiblesses :** Très bruyante ; Faible rayon de braquage ; Consommation énergétique élevée.

**Animations propres :** Bouclier frontal ; Charge à pleine vitesse ; Bris de barricade ; Atterrissage onde de choc ; Intimidation sonore.

**Brief visuel :** Moto de guerre Yautja blindée, énorme proue en crocs, bronze noirci et marques de clan, silhouette lourde et animale.

**Accroches de missions :** Percer une ligne de défense ; Boss mounted contre un chef de guerre.

## 08. Skimmer des dunes

**Famille :** Skimmer environnemental  
**Statut créatif :** Création originale  
**Tier :** 3  
**Équipage :** 1 pilote + 1 passager compact  
**Dimensions :** 5,4 m × 2,4 m × 1,1 m

**Silhouette :** Large coque plate en raie, étrave relevée et voiles énergétiques latérales qui repoussent le sable.

**Rôle :** Traversée de mers de dunes, tempêtes et chasse de créatures fouisseuses.

**Statistiques :** Vitesse 9/10 · Accélération 7/10 · Maniabilité 7/10 · Armure 4/10 · Offense 5/10 · Franchissement 10/10 · Furtivité 4/10 · Cargo 4/10.

**Capacités :** Surf de dune gagnant de la vitesse en descente ; Sonde sismique ; Ancre gravitationnelle anti-tempête ; Rampe de lancement du passager.

**Armement :** Harpon sismique ; Tourelle plasma légère.

**Biomes :** désert, mer de cendres, salines.

**Tags de level design :** `SAND_ONLY`, `DUNE_RAMP`, `BURROW_SENSOR`, `VEHICLE_MEDIUM`.

**Obtention :** Récompense d’une chasse au ver des dunes ; améliorable chez les Nomades de Verre.

**Faiblesses :** Très lent sur roche dure ; Voiles vulnérables ; Dérive forte par vent latéral.

**Animations propres :** Surf ascendant/descendant ; Ancre de tempête ; Sonde sismique ; Enlisement et dégagement ; Lancement du passager.

**Brief visuel :** Skimmer Yautja en forme de raie, patine de sable, voiles énergétiques translucides, grande silhouette horizontale et fonctionnelle.

**Accroches de missions :** Chasse sous la tempête ; Escorte d’une caravane de trophées.

## 09. Skimmer des marais

**Famille :** Skimmer environnemental  
**Statut créatif :** Création originale  
**Tier :** 3  
**Équipage :** 1 pilote  
**Dimensions :** 4,7 m × 2,0 m × 1,35 m

**Silhouette :** Coque relevée, patins étroits, filtres organiques et déflecteurs anti-boue autour d’un moteur central protégé.

**Rôle :** Traversée des eaux toxiques et reconnaissance des mangroves.

**Statistiques :** Vitesse 7/10 · Accélération 6/10 · Maniabilité 8/10 · Armure 5/10 · Offense 4/10 · Franchissement 10/10 · Furtivité 7/10 · Cargo 3/10.

**Capacités :** Flottabilité toxique ; Purification temporaire d’un corridor d’eau ; Camouflage de vapeur ; Coupe-lianes frontal.

**Armement :** Dards thermiques ; Lance-acide neutralisant la flore hostile.

**Biomes :** marais, mangrove, égout alien, delta toxique.

**Tags de level design :** `WATER_SHALLOW`, `TOXIC_SURFACE`, `VINE_GATE`, `VEHICLE_MEDIUM`.

**Obtention :** Construit après étude de trois toxines planétaires au laboratoire du vaisseau.

**Faiblesses :** Surchauffe en biome sec ; Faible vitesse en eau profonde ; Filtres à entretenir.

**Animations propres :** Flottaison variable ; Coupe-lianes ; Purge des filtres ; Camouflage vapeur ; Immersion partielle.

**Brief visuel :** Skimmer Yautja amphibie, coque noire et verte, filtres en carapace, vapeur froide et patins effilés, silhouette de prédateur de marais.

**Accroches de missions :** Cartographier un delta toxique ; Secourir une équipe isolée.

## 10. Skimmer cryo

**Famille :** Skimmer environnemental  
**Statut créatif :** Création originale  
**Tier :** 3  
**Équipage :** 1 pilote  
**Dimensions :** 5,0 m × 1,9 m × 1,2 m

**Silhouette :** Patins antigrav en faucille, carénage blanc minéral et noyau thermique rouge au centre.

**Rôle :** Traversée de glaciers, poursuite sur glace et bris de plaques gelées.

**Statistiques :** Vitesse 9/10 · Accélération 8/10 · Maniabilité 6/10 · Armure 5/10 · Offense 5/10 · Franchissement 10/10 · Furtivité 6/10 · Cargo 3/10.

**Capacités :** Adhérence cryo active ; Frappe thermique ouvrant la glace mince ; Stabilisation en avalanche ; Trace chaude empêchant le gel derrière le joueur.

**Armement :** Canon thermique court ; Mines cryo.

**Biomes :** glacier, toundra, océan gelé.

**Tags de level design :** `ICE_ONLY`, `AVALANCHE_TRACK`, `THIN_ICE_BREAK`, `VEHICLE_MEDIUM`.

**Obtention :** Gagné lors du Rite de la Banquise après avoir vaincu une proie sans vision thermique.

**Faiblesses :** Dérapage sévère si module endommagé ; Noyau visible ; Médiocre hors du froid.

**Animations propres :** Carve sur glace ; Stabilisation avalanche ; Bris de glace ; Dégel du moteur ; Spin contrôlé.

**Brief visuel :** Skimmer Yautja polaire, patins en faucille, givre réel, noyau rouge incandescent, armure minérale claire non humaine.

**Accroches de missions :** Course sur glacier en rupture ; Traque sous aurore magnétique.

## 11. Jungle Strider

**Famille :** Marcheur mécanique  
**Statut créatif :** Création originale  
**Tier :** 3  
**Équipage :** 1 pilote  
**Dimensions :** 3,8 m long × 2,8 m haut

**Silhouette :** Cabine-selle centrale sur quatre pattes insectoïdes et queue stabilisatrice, profil de mante religieuse.

**Rôle :** Franchissement de racines, pentes et jungle verticale basse.

**Statistiques :** Vitesse 6/10 · Accélération 6/10 · Maniabilité 9/10 · Armure 6/10 · Offense 6/10 · Franchissement 10/10 · Furtivité 6/10 · Cargo 3/10.

**Capacités :** Pas silencieux ; Accroche sur pente à 70° ; Saut assisté entre racines ; Mode sentinelle sans pilote.

**Armement :** Lame de patte ; Plasma Caster dorsal ; Filet automatique.

**Biomes :** jungle, forêt fongique, ruines envahies.

**Tags de level design :** `MOUNT_TRAIL`, `STEEP_SLOPE`, `ROOT_STEP`, `SENTRY_PAD`.

**Obtention :** Plan offert par les Beastmasters technophiles après une quête comparant machine et monture.

**Faiblesses :** Vulnérable aux mines ; Ne passe pas les tunnels bas ; Pattes réparées séparément.

**Animations propres :** Cycle quadrupède ; Accroche de pente ; Saut entre racines ; Coup de patte ; Mode sentinelle.

**Brief visuel :** Marcheur Yautja insectoïde à quatre pattes, cabine ouverte, plaques sombres et tendons mécaniques, silhouette élégante et inquiétante.

**Accroches de missions :** Escorte dans une jungle minée ; Défendre un camp en mode sentinelle.

## 12. Cliff Crawler

**Famille :** Marcheur mécanique  
**Statut créatif :** Création originale  
**Tier :** 4  
**Équipage :** 1 pilote  
**Dimensions :** 4,2 m × 3,0 m × 2,2 m

**Silhouette :** Six pattes griffues autour d’un noyau ovale, cockpit suspendu qui reste horizontal quand l’engin marche sur un mur.

**Rôle :** Escalade de falaises, plafonds et mégastructures.

**Statistiques :** Vitesse 5/10 · Accélération 5/10 · Maniabilité 8/10 · Armure 7/10 · Offense 5/10 · Franchissement 10/10 · Furtivité 5/10 · Cargo 4/10.

**Capacités :** Adhésion mur/plafond ; Rotation gravitationnelle de la caméra ; Ancrage anti-chute ; Treuil de sauvetage.

**Armement :** Plasma de précision ; Foreuse de patte ; Charges d’ancrage.

**Biomes :** montagne, caverne géante, coque de vaisseau.

**Tags de level design :** `WALL_VEHICLE`, `CEILING_VEHICLE`, `ANCHOR_POINT`, `HEAVY_MOUNT_TRAIL`.

**Obtention :** Récompense d’une opération de sauvetage sur la Faille des Ancêtres.

**Faiblesses :** Très lent au sol plat ; Transitions mur-sol exposées ; Aucune furtivité lors du forage.

**Animations propres :** Transition sol-mur ; Marche plafond ; Ancrage ; Treuil ; Chute contrôlée.

**Brief visuel :** Marcheur Yautja à six pattes, cockpit gyrostabilisé, griffes luminescentes et métal basaltique, conçu pour des surfaces verticales.

**Accroches de missions :** Ascension verticale sous tirs ; Récupérer un trophée accroché à une falaise.

## 13. Burrower Rig

**Famille :** Foreuse mobile  
**Statut créatif :** Création originale  
**Tier :** 4  
**Équipage :** 1 pilote + 1 opérateur  
**Dimensions :** 6,8 m × 2,6 m × 2,4 m

**Silhouette :** Foreuse segmentée comme un ver métallique, tête trilobée et cabine blindée arrière.

**Rôle :** Création de raccourcis permanents, pénétration de nids et extraction minérale.

**Statistiques :** Vitesse 4/10 · Accélération 3/10 · Maniabilité 4/10 · Armure 9/10 · Offense 7/10 · Franchissement 9/10 · Furtivité 1/10 · Cargo 6/10.

**Capacités :** Forage de murs TUNNEL_BREAK ; Pose d’un raccourci persistant sur la carte ; Détection de cavités ; Mode siège ancré.

**Armement :** Foreuse ; Charge plasma souterraine ; Tourelle arrière.

**Biomes :** souterrain, mine, ruche fossile.

**Tags de level design :** `TUNNEL_BREAK_1`, `TUNNEL_BREAK_2`, `CAVITY_SCAN`, `HEAVY_VEHICLE`.

**Obtention :** Construite en fin de chapitre après avoir récupéré un cœur de foreuse Weyland-Yutani et l’avoir purifié de ses sécurités.

**Faiblesses :** Bruit attirant les hordes ; Inutilisable en roche sacrée ; Virage extrêmement lent.

**Animations propres :** Foreuse active ; Entrée en paroi ; Sortie de tunnel ; Ancrage siège ; Éboulement évité.

**Brief visuel :** Foreuse Yautja massive en forme de ver segmenté, proue triple, métal noir et énergie orange, aucune cabine humaine conventionnelle.

**Accroches de missions :** Percée dans une ruche ; Créer un passage avant l’effondrement.

## 14. River Manta

**Famille :** Glisseur amphibie  
**Statut créatif :** Création originale  
**Tier :** 3  
**Équipage :** 1 pilote + 1 passager  
**Dimensions :** 5,7 m × 3,0 m × 0,9 m

**Silhouette :** Large véhicule plat en forme de manta, ailes souples énergétiques et nageoire arrière directionnelle.

**Rôle :** Navigation de fleuves, sauts de cascades et chasse aquatique de surface.

**Statistiques :** Vitesse 8/10 · Accélération 7/10 · Maniabilité 9/10 · Armure 4/10 · Offense 5/10 · Franchissement 10/10 · Furtivité 7/10 · Cargo 4/10.

**Capacités :** Passage eau/terre sans arrêt ; Plongée de 3 s sous obstacles ; Saut de cascade ; Sonar de proie.

**Armement :** Harpon plasma ; Mines flottantes.

**Biomes :** fleuve, mangrove, côte, caverne inondée.

**Tags de level design :** `WATER_DEEP`, `AMPHIBIOUS_EXIT`, `WATERFALL_RAMP`, `SONAR_GATE`.

**Obtention :** Capturée à des pirates puis légitimée par un rite de propriété.

**Faiblesses :** Très fragile hors de l’eau ; Plongée courte ; Ailes exposées.

**Animations propres :** Nage de surface ; Plongée ; Sortie d’eau ; Saut cascade ; Sonar pulse.

**Brief visuel :** Glisseur Yautja amphibie inspiré d’une manta extraterrestre, ailes énergétiques flexibles, châssis bronze sombre, profil très bas.

**Accroches de missions :** Poursuite fluviale ; Chasse d’une bête sous la surface.

## 15. Canopy Glider

**Famille :** Planeur  
**Statut créatif :** Création originale  
**Tier :** 3  
**Équipage :** 1 pilote  
**Dimensions :** Envergure 7,2 m × longueur 3,2 m

**Silhouette :** Deux ailes membraneuses artificielles autour d’un harnais central ; silhouette de chauve-souris et de smart disc.

**Rôle :** Vol plané entre canopées, infiltration et accès aux hauteurs.

**Statistiques :** Vitesse 7/10 · Accélération 4/10 · Maniabilité 9/10 · Armure 2/10 · Offense 3/10 · Franchissement 10/10 · Furtivité 9/10 · Cargo 1/10.

**Capacités :** Plané sans énergie ; Courants ascendants ; Repli instantané en sac dorsal ; Camouflage passif dans les feuillages.

**Armement :** Dards silencieux ; Armes légères du pilote.

**Biomes :** canopée, canyon, cité verticale.

**Tags de level design :** `AERIAL_CURRENT`, `CANOPY_LAUNCH`, `AERIAL_GAP_3`, `GLIDER_LANDING`.

**Obtention :** Offert après la première grande chasse de canopée et l’apprentissage des courants ascendants.

**Faiblesses :** Pas de décollage sans hauteur ; Aucune armure ; Sensible aux projectiles perforants.

**Animations propres :** Déploiement des ailes ; Plané ; Virage serré ; Stall ; Atterrissage branche ; Repli dorsal.

**Brief visuel :** Planeur Yautja organo-technologique, ailes sombres veinées d’énergie, harnais minimal, silhouette de chauve-souris prédatrice.

**Accroches de missions :** Infiltrer un temple par les hauteurs ; Course de planeurs dans la canopée.

## 16. Skiff de déploiement

**Famille :** Transport de chasse  
**Statut créatif :** Création originale  
**Tier :** 4  
**Équipage :** 1 pilote + 6 chasseurs  
**Dimensions :** 10,5 m × 4,2 m × 2,8 m

**Silhouette :** Plateforme antigrav ouverte, proue cérémonielle, six emplacements latéraux et rampe arrière.

**Rôle :** Introduction de mission, transport d’escouade et extraction rapide.

**Statistiques :** Vitesse 6/10 · Accélération 5/10 · Maniabilité 5/10 · Armure 7/10 · Offense 5/10 · Franchissement 8/10 · Furtivité 4/10 · Cargo 7/10.

**Capacités :** Déploiement simultané de six Hunters ; Point de respawn temporaire ; Extraction de blessés ; Pilote IA suivant un itinéraire cinématique.

**Armement :** Tourelle plasma légère ; Leurres thermiques.

**Biomes :** tous biomes ouverts, ville, zone de guerre.

**Tags de level design :** `SKIFF_ROUTE`, `DROP_ZONE`, `EXTRACTION_PAD`, `OPEN_ARENA`.

**Obtention :** Débloqué comme service de clan ; le joueur peut plus tard en posséder un modèle réduit dans son hangar.

**Faiblesses :** Itinéraires prédéfinis ; Grande cible ; Ne pénètre pas les intérieurs.

**Animations propres :** Arrivée arrière-plan ; Rampe ouverte ; Déploiement escouade ; Extraction sous feu ; Crash contrôlé.

**Brief visuel :** Skiff Yautja ouvert, plateforme sombre et osseuse, six chasseurs visibles en silhouettes complètes, proue rituelle et moteurs antigrav.

**Accroches de missions :** Assaut de clan en coopération ; Extraction finale avec choix des survivants.

## 17. War Skiff

**Famille :** Transport de combat  
**Statut créatif :** Création originale  
**Tier :** 5  
**Équipage :** 2 pilotes + 8 combattants  
**Dimensions :** 13,0 m × 5,8 m × 3,6 m

**Silhouette :** Skiff blindé à trois niveaux, bouclier de proue, tourelles latérales et plate-forme d’abordage.

**Rôle :** Guerre de clans, défense du Homeworld et combats multi-phases.

**Statistiques :** Vitesse 5/10 · Accélération 4/10 · Maniabilité 4/10 · Armure 9/10 · Offense 9/10 · Franchissement 7/10 · Furtivité 2/10 · Cargo 8/10.

**Capacités :** Bouclier orientable ; Abordage d’un véhicule ennemi ; Largage de mines ; Plateforme de combat jouable pendant le déplacement.

**Armement :** Canon plasma lourd ; Tourelles latérales ; Mines gravitatives.

**Biomes :** désert, ville, mégastructure, plaine.

**Tags de level design :** `WAR_ROUTE`, `BOARDING_POINT`, `HEAVY_VEHICLE`, `BOSS_TRACK`.

**Obtention :** Récompense de campagne de guerre ; utilisable seulement dans missions dédiées et défense planétaire.

**Faiblesses :** Lent ; Impossible à camoufler longtemps ; Nécessite équipage.

**Animations propres :** Bouclier directionnel ; Abordage ; Tourelles en rafale ; Largage de mines ; Destruction en trois étapes.

**Brief visuel :** Grand skiff de guerre Yautja à étages, silhouettes d’équipage complètes, canons plasma et plaques de trophées, présence imposante de boss mobile.

**Accroches de missions :** Bataille de la Porte du Roi ; Aborder le commandement Bad Blood.

## 18. Crawler de siège

**Famille :** Char marcheur  
**Statut créatif :** Création originale  
**Tier :** 5  
**Équipage :** 2 pilotes + 2 artilleurs  
**Dimensions :** 11,8 m × 5,2 m × 4,6 m

**Silhouette :** Corps de scarabée blindé sur huit pattes courtes, canon dorsal annulaire et bélier sous la tête.

**Rôle :** Destruction de forteresses, boss allié et défense de cité.

**Statistiques :** Vitesse 3/10 · Accélération 2/10 · Maniabilité 3/10 · Armure 10/10 · Offense 10/10 · Franchissement 7/10 · Furtivité 1/10 · Cargo 7/10.

**Capacités :** Mode forteresse déployée ; Bélier de siège ; Bouclier de dôme ; Point de réarmement mobile.

**Armement :** Canon plasma annulaire ; Mortiers thermiques ; Bélier.

**Biomes :** forteresse, plaine de guerre, mégastructure.

**Tags de level design :** `SIEGE_ROUTE`, `FORTRESS_BREAK`, `HEAVY_VEHICLE`, `DEFENSE_NODE`.

**Obtention :** Jamais possédé librement : obtenu comme ressource de clan lors des grandes opérations.

**Faiblesses :** Extrêmement lent ; Articulations ciblables ; Demande des zones dédiées.

**Animations propres :** Marche à huit pattes ; Déploiement forteresse ; Canon annulaire ; Bélier ; Destruction segmentée.

**Brief visuel :** Char Yautja scarabée à huit pattes, métal basaltique, canon plasma circulaire et bouclier rouge, colossal mais lisible en 2D.

**Accroches de missions :** Siège d’une citadelle ; Défendre le Crawler pendant sa recharge.

## 19. Trophy Carrier

**Famille :** Transport utilitaire  
**Statut créatif :** Création originale  
**Tier :** 2  
**Équipage :** Autonome ou 1 pilote  
**Dimensions :** 3,4 m × 1,8 m × 0,9 m

**Silhouette :** Plateforme antigrav basse, quatre pinces, crochets et cages de contention repliables.

**Rôle :** Transport de trophées moyens, corps, équipements et ressources.

**Statistiques :** Vitesse 5/10 · Accélération 5/10 · Maniabilité 8/10 · Armure 4/10 · Offense 1/10 · Franchissement 7/10 · Furtivité 6/10 · Cargo 9/10.

**Capacités :** Follow automatique ; Conservation thermique du trophée ; Cage de contention ; Balise de récupération après abandon.

**Armement :** Décharge incapacitante uniquement.

**Biomes :** tous biomes praticables, vaisseau, ville.

**Tags de level design :** `UTILITY_ROUTE`, `TROPHY_LOAD`, `MOUNT_TRAIL`, `EXTRACTION_PAD`.

**Obtention :** Fourni avec l’amélioration initiale du Trophy Hall.

**Faiblesses :** Fuit le combat lourd ; Capacité limitée aux gros trophées ; Peut être piraté.

**Animations propres :** Pinces de chargement ; Follow ; Cage ouverte/fermée ; Trophée oscillant ; Décharge défensive.

**Brief visuel :** Plateforme cargo Yautja compacte, pinces en os-métal, trophée physiquement visible et attaché, lumière ambre discrète.

**Accroches de missions :** Ramener une tête intacte ; Protéger le carrier d’une meute.

## 20. Grand Trophy Hauler

**Famille :** Transport utilitaire lourd  
**Statut créatif :** Création originale  
**Tier :** 4  
**Équipage :** 1 pilote + 2 opérateurs  
**Dimensions :** 14 m × 6 m × 3,5 m hors chargement

**Silhouette :** Immense plateforme antigrav cérémonielle avec arches de fixation, treuils et bannières de clan.

**Rôle :** Extraction de trophées géants et procession de prestige.

**Statistiques :** Vitesse 3/10 · Accélération 2/10 · Maniabilité 3/10 · Armure 8/10 · Offense 2/10 · Franchissement 5/10 · Furtivité 1/10 · Cargo 10/10.

**Capacités :** Treuil multi-point ; Stabilisation de masse ; Procession automatique vers le vaisseau ; Défense de zone par bouclier court.

**Armement :** Deux tourelles défensives légères.

**Biomes :** plaine, désert, grande cité, site de boss.

**Tags de level design :** `HEAVY_UTILITY_ROUTE`, `COLOSSAL_TROPHY`, `EXTRACTION_PAD`, `PROCESSION_ROUTE`.

**Obtention :** Service débloqué après le premier trophée de classe Colossus.

**Faiblesses :** Exige un itinéraire sécurisé ; Très lent ; Attire les voleurs et rivaux.

**Animations propres :** Déploiement des treuils ; Levage en plusieurs phases ; Oscillation du trophée ; Bouclier court ; Procession.

**Brief visuel :** Plateforme trophée Yautja monumentale, arches noires, bannières rouges, énorme crâne ou tête de monstre suspendue sans être recadrée.

**Accroches de missions :** Défendre l’extraction d’un boss ; Parade de retour sur Yautja Prime.

## 21. Forge mobile de clan

**Famille :** Véhicule atelier  
**Statut créatif :** Création originale  
**Tier :** 4  
**Équipage :** 1 conducteur + 2 artisans  
**Dimensions :** 9,2 m × 4,3 m × 3,2 m

**Silhouette :** Atelier antigrav couvert, bras de forge, creuset plasma et panneaux qui s’ouvrent comme une carapace.

**Rôle :** Réparation en campagne, fabrication de munitions et amélioration temporaire.

**Statistiques :** Vitesse 4/10 · Accélération 3/10 · Maniabilité 4/10 · Armure 8/10 · Offense 3/10 · Franchissement 5/10 · Furtivité 1/10 · Cargo 9/10.

**Capacités :** Réparation de véhicules ; Recharge de Plasma Caster ; Forge d’un buff de mission ; Déploiement en mini-hub physique.

**Armement :** Tourelle défensive ; Jet de plasma industriel.

**Biomes :** camp de guerre, désert, ville, plaine.

**Tags de level design :** `FORGE_PAD`, `HEAVY_UTILITY_ROUTE`, `CAMP_NODE`, `DEFENSE_NODE`.

**Obtention :** Débloquée par le maître-forgeron du Homeworld après avoir restauré son atelier ancestral.

**Faiblesses :** Immobile pendant la forge ; Ressource rare ; Explosive si le creuset est détruit.

**Animations propres :** Ouverture carapace ; Déploiement bras ; Forge plasma ; Réparation véhicule ; Repli d’urgence.

**Brief visuel :** Atelier mobile Yautja en carapace, creuset orange, bras industriels rituels et surfaces couvertes de glyphes, mini-hub lisible.

**Accroches de missions :** Tenir une position autour de la forge ; Réparer un War Skiff sous attaque.

## 22. Medivac Scarab

**Famille :** Véhicule médical  
**Statut créatif :** Création originale  
**Tier :** 4  
**Équipage :** 1 pilote + 3 patients  
**Dimensions :** 6,4 m × 2,8 m × 2,0 m

**Silhouette :** Capsule protégée sur quatre patins antigrav, coque scarabée blanche/bronze et trois alcôves médicales latérales.

**Rôle :** Sauvetage, extraction de Hunters blessés et réanimation limitée.

**Statistiques :** Vitesse 7/10 · Accélération 7/10 · Maniabilité 7/10 · Armure 7/10 · Offense 2/10 · Franchissement 7/10 · Furtivité 5/10 · Cargo 7/10.

**Capacités :** Champ Medicomp de zone ; Stase de trois blessés ; Fumée de camouflage ; Rappel prioritaire vers le vaisseau.

**Armement :** Impulsion neutralisante ; Leurres.

**Biomes :** tous biomes ouverts, zone de guerre.

**Tags de level design :** `MEDICAL_ROUTE`, `EXTRACTION_PAD`, `VEHICLE_MEDIUM`, `RESCUE_NODE`.

**Obtention :** Débloqué après avoir sauvé un médecin de clan sans laisser mourir aucun allié.

**Faiblesses :** Armement faible ; Soins interrompus par dégâts lourds ; Capacité limitée.

**Animations propres :** Ouverture alcôves ; Chargement blessé ; Champ médical ; Fumée de camouflage ; Extraction d’urgence.

**Brief visuel :** Ambulance Yautja antigrav en forme de scarabée, coque ivoire minérale et bronze, alcôves médicales lumineuses, aucune esthétique humaine.

**Accroches de missions :** Évacuer trois Hunters ; Course contre une infection.

## 23. Capsule Drop Spear

**Famille :** Capsule d’insertion  
**Statut créatif :** Création originale  
**Tier :** 3  
**Équipage :** 1 chasseur  
**Dimensions :** 3,1 m haut × 1,1 m diamètre

**Silhouette :** Capsule verticale en forme de pointe de lance, trois pétales blindés s’ouvrant à l’impact.

**Rôle :** Insertion orbitale, raccourci de mission et entrée spectaculaire.

**Statistiques :** Vitesse 10/10 · Accélération 10/10 · Maniabilité 1/10 · Armure 8/10 · Offense 4/10 · Franchissement 9/10 · Furtivité 3/10 · Cargo 1/10.

**Capacités :** Sélection d’une zone d’impact ; Onde de choc d’atterrissage ; Balise de retour à usage unique ; Pétales servant de couverture.

**Armement :** Impact cinétique ; Micro-plasma de descente.

**Biomes :** tous biomes à ciel ouvert.

**Tags de level design :** `ORBITAL_DROP`, `SKY_ACCESS`, `DROP_ZONE`, `ONE_WAY_ROUTE`.

**Obtention :** Débloquée avec le module orbital du vaisseau.

**Faiblesses :** Trajectoire quasi fixe ; Usage unique par mission ; Très visible.

**Animations propres :** Largage orbital ; Chauffe atmosphérique ; Impact ; Ouverture en trois pétales ; Sortie du Hunter.

**Brief visuel :** Capsule d’insertion Yautja en pointe de lance, métal noir chauffé au rouge, trois pétales, proportions conçues pour un seul Yautja entier.

**Accroches de missions :** Assaut surprise ; Atterrir sur un boss mobile.

## 24. Sphère d’éjection atmosphérique

**Famille :** Capsule de survie  
**Statut créatif :** Inspirée de la sphère d’éjection de Predator: Badlands  
**Tier :** 2  
**Équipage :** 1 occupant  
**Dimensions :** 2,4 m diamètre

**Silhouette :** Orbe transparente renforcée par trois arcs métalliques, siège central et micro-propulseurs instables.

**Rôle :** Séquence d’urgence, chute contrôlée et survie après destruction du vaisseau.

**Statistiques :** Vitesse 4/10 · Accélération 3/10 · Maniabilité 3/10 · Armure 3/10 · Offense 0/10 · Franchissement 6/10 · Furtivité 1/10 · Cargo 1/10.

**Capacités :** Roulage après impact ; Micro-corrections de trajectoire ; Balise de détresse ; Oxygène limité.

**Armement :** Aucune.

**Biomes :** atmosphère, montagne, forêt, désert.

**Tags de level design :** `ESCAPE_SEQUENCE`, `CRASH_ROUTE`, `ROLLING_SLOPE`, `SURVIVAL_START`.

**Obtention :** Objet narratif ; utilisable dans des missions de catastrophe et un mode défi.

**Faiblesses :** Très fragile ; Aucun armement ; Contrôle volontairement limité.

**Animations propres :** Éjection ; Rotation atmosphérique ; Fissures progressives ; Impact/rebond ; Roulage ; Ouverture d’urgence.

**Brief visuel :** Sphère d’éjection Yautja transparente, arcs osseux métalliques, siège alien au centre, verre fissurable en couches, aucune arme.

**Accroches de missions :** Survivre à une rentrée ratée ; Atterrissage de précision sans propulseur.

## 25. Blood Runner

**Famille :** Véhicule hors-la-loi  
**Statut créatif :** Création originale Bad Blood  
**Tier :** 4  
**Équipage :** 1 pilote  
**Dimensions :** 4,6 m × 1,6 m × 1,5 m

**Silhouette :** Moto antigrav asymétrique, pièces volées, chaînes, plaques xénomorphes et moteur nu crachant des étincelles.

**Rôle :** Fuite, embuscade et poursuite criminelle.

**Statistiques :** Vitesse 10/10 · Accélération 10/10 · Maniabilité 7/10 · Armure 4/10 · Offense 8/10 · Franchissement 8/10 · Furtivité 4/10 · Cargo 2/10.

**Capacités :** Overdrive instable ; Brouilleur d’identité de clan ; Lames latérales ; Explose volontairement comme diversion.

**Armement :** Caster plasma illégal ; Lames ; Mines à fragmentation.

**Biomes :** désert, ville basse, décharge, canyon.

**Tags de level design :** `OUTLAW_ROUTE`, `GRAV_RAMP`, `ENFORCER_CHASE`, `VEHICLE_MEDIUM`.

**Obtention :** Volée à un gang Bad Blood ou construite si l’alignement Outlaw est suffisamment élevé.

**Faiblesses :** Risque de panne ; Signature sonore unique ; Augmente le niveau de recherche.

**Animations propres :** Overdrive ; Étincelles moteur ; Lames latérales ; Autodestruction/éjection ; Panne et redémarrage brutal.

**Brief visuel :** Moto Bad Blood brutale et asymétrique, moteur exposé, chaînes, os et plaques xénomorphes, énergie rouge instable, silhouette dangereuse.

**Accroches de missions :** Bad Blood Highway ; Échapper à trois vagues d’Enforcers.

## 26. Bone Grinder

**Famille :** Trike hors-la-loi  
**Statut créatif :** Création originale Bad Blood  
**Tier :** 4  
**Équipage :** 1 pilote + 1 artilleur  
**Dimensions :** 5,8 m × 2,7 m × 1,9 m

**Silhouette :** Trike antigrav à trois noyaux, énorme broyeur frontal entouré de crocs et plate-forme d’artilleur arrière.

**Rôle :** Raid, destruction de barricades et terreur de population.

**Statistiques :** Vitesse 7/10 · Accélération 6/10 · Maniabilité 4/10 · Armure 8/10 · Offense 9/10 · Franchissement 6/10 · Furtivité 1/10 · Cargo 4/10.

**Capacités :** Broyeur frontal ; Collecte automatique de petits trophées ; Mode tourelle arrière ; Rage du pilote après collision réussie.

**Armement :** Broyeur ; Tourelle plasma ; Harpons.

**Biomes :** décharge, route de clan, désert, zone industrielle.

**Tags de level design :** `OUTLAW_ROUTE`, `VEHICLE_BREAK_2`, `WAR_LANE`, `VEHICLE_LARGE`.

**Obtention :** Boss capturable : il faut vaincre l’équipage sans détruire le châssis.

**Faiblesses :** Très bruyant ; Virage lent ; Impossible à camoufler.

**Animations propres :** Rotation broyeur ; Capture de petits trophées ; Tourelle arrière ; Collision lourde ; Éjection équipage.

**Brief visuel :** Trike Yautja hors-la-loi massif, broyeur en crocs, trois noyaux antigrav, plaques volées et trophées mal fixés.

**Accroches de missions :** Raid sur caravane ; Capturer le véhicule intact.

## 27. Scavenger Raider

**Famille :** Raider léger  
**Statut créatif :** Création originale Bad Blood  
**Tier :** 3  
**Équipage :** 1 pilote  
**Dimensions :** 3,9 m × 1,45 m × 1,2 m

**Silhouette :** Châssis fin assemblé de deux motos, voile thermique déchirée et grappin arrière.

**Rôle :** Vol de cargaison, harcèlement et récupération rapide.

**Statistiques :** Vitesse 9/10 · Accélération 9/10 · Maniabilité 9/10 · Armure 2/10 · Offense 5/10 · Franchissement 8/10 · Furtivité 7/10 · Cargo 5/10.

**Capacités :** Grappin de vol ; Détachement de fausse cargaison ; Camouflage bricolé ; Saut de convoi à convoi.

**Armement :** Dards plasma ; Grappin.

**Biomes :** route, désert, canyon, ruines.

**Tags de level design :** `OUTLAW_ROUTE`, `CONVOY_JUMP`, `CARGO_HOOK`, `GRAV_RAMP`.

**Obtention :** Récupéré durant une mission de chasse aux pillards.

**Faiblesses :** Très fragile ; Grappin peut accrocher un danger ; Cargaison réduit la maniabilité.

**Animations propres :** Grappin lancé ; Cargaison arrachée ; Saut latéral ; Camouflage défectueux ; Abandon de leurre.

**Brief visuel :** Raider Bad Blood léger, châssis bricolé, voile thermique déchirée, grappin et petits sacs de trophées, profil nerveux.

**Accroches de missions :** Protéger une caravane ; Voler en retour une pièce sacrée.

## 28. Sled du voleur de trophées

**Famille :** Sled hors-la-loi  
**Statut créatif :** Création originale Bad Blood  
**Tier :** 3  
**Équipage :** 1 pilote  
**Dimensions :** 4,3 m × 1,8 m × 0,8 m

**Silhouette :** Plateforme rapide avec cage magnétique dorsale, pinces télescopiques et capteurs brouillés.

**Rôle :** Vol de trophées rares et fuite dans des passages utilitaires.

**Statistiques :** Vitesse 8/10 · Accélération 8/10 · Maniabilité 8/10 · Armure 3/10 · Offense 3/10 · Franchissement 7/10 · Furtivité 8/10 · Cargo 8/10.

**Capacités :** Vol à distance d’un trophée non sécurisé ; Leurre de signature ; Passage sous certaines portes ; Dépôt de cargaison piégée.

**Armement :** Impulsion EMP ; Pièges de cargaison.

**Biomes :** ville, hangar, ruines, camp.

**Tags de level design :** `OUTLAW_ROUTE`, `UTILITY_TUNNEL`, `TROPHY_LOAD`, `CHASE_ROUTE`.

**Obtention :** Saisi après la quête « La honte du Hall vide ».

**Faiblesses :** Faible en combat direct ; Perd sa vitesse chargé ; Cage très visible.

**Animations propres :** Pince télescopique ; Chargement volé ; Leurre ; Cargaison piégée ; Crash sous porte.

**Brief visuel :** Sled Yautja de voleur, plateforme basse et rapide, cage à trophées visible, pinces longues, métal sombre et brouilleurs violets.

**Accroches de missions :** Récupérer un trophée avant la frontière ; Infiltrer un hangar criminel.

## 29. Moto de poursuite Enforcer

**Famille :** Véhicule Enforcer  
**Statut créatif :** Création originale liée au système Enforcer  
**Tier :** 4  
**Équipage :** 1 Enforcer  
**Dimensions :** 4,5 m × 1,55 m × 1,45 m

**Silhouette :** Moto antigrav symétrique, blindage noir mat, glyphes blancs et fourche de neutralisation en U.

**Rôle :** Arrestation de Bad Blood, contrôle de route et poursuite urbaine.

**Statistiques :** Vitesse 9/10 · Accélération 9/10 · Maniabilité 8/10 · Armure 6/10 · Offense 6/10 · Franchissement 8/10 · Furtivité 6/10 · Cargo 2/10.

**Capacités :** Scan de mandat ; Verrou gravitationnel ralentissant la cible ; Appel de renfort ; Filet d’arrestation non létal.

**Armement :** Filet renforcé ; EMP directionnel ; Plasma de précision.

**Biomes :** ville, route de clan, désert.

**Tags de level design :** `ENFORCER_ROUTE`, `CHASE_ROUTE`, `ROADBLOCK_NODE`, `VEHICLE_MEDIUM`.

**Obtention :** Utilisable par le joueur après carrière Enforcer ou volée temporairement si Bad Blood.

**Faiblesses :** Armement réglementé ; Verrou nécessite ligne de vue ; Balise impossible à désactiver légalement.

**Animations propres :** Scan mandat ; Verrou gravitationnel ; Lancer de filet ; Appel renfort ; Arrestation montée.

**Brief visuel :** Moto Enforcer propre, symétrique, noire avec glyphes ivoire, fourche U de neutralisation et capteurs rouges disciplinés.

**Accroches de missions :** Poursuite judiciaire ; Escorter un prisonnier de haut rang.

## 30. Interceptor Enforcer

**Famille :** Intercepteur Enforcer  
**Statut créatif :** Création originale liée au système Enforcer  
**Tier :** 5  
**Équipage :** 1 pilote + 1 opérateur  
**Dimensions :** 7,2 m × 3,3 m × 1,8 m

**Silhouette :** Intercepteur fermé en forme de masque, ailes courtes et anneau de suppression gravitationnelle.

**Rôle :** Blocage de route, neutralisation de véhicules et combat anti-raider.

**Statistiques :** Vitesse 8/10 · Accélération 8/10 · Maniabilité 7/10 · Armure 8/10 · Offense 7/10 · Franchissement 8/10 · Furtivité 5/10 · Cargo 3/10.

**Capacités :** Champ de suppression stoppant les boosts ; Drone d’identification ; Bouclier latéral ; Ancre de poursuite.

**Armement :** Canon EMP ; Filet de véhicule ; Plasma réglementaire.

**Biomes :** ville, désert, canyon, mégastructure.

**Tags de level design :** `ENFORCER_ROUTE`, `VEHICLE_LARGE`, `CHASE_ROUTE`, `ROADBLOCK_NODE`.

**Obtention :** Récompense de rang Capitaine Enforcer ; jamais vendu.

**Faiblesses :** Champ de suppression affecte aussi les alliés ; Lourd ; Coûteux à déployer.

**Animations propres :** Anneau de suppression ; Drone lancé ; Filet véhicule ; Ancre de poursuite ; Blocage latéral.

**Brief visuel :** Intercepteur Enforcer fermé, silhouette de masque Yautja, anneau énergétique blanc, blindage noir uniforme, design autoritaire.

**Accroches de missions :** Stopper un convoi Bad Blood ; Duel contre le Blood Runner du joueur recherché.

## 31. Skiff-prison Enforcer

**Famille :** Transport Enforcer  
**Statut créatif :** Création originale liée au système Enforcer  
**Tier :** 5  
**Équipage :** 2 gardes + 6 prisonniers  
**Dimensions :** 10,8 m × 4,4 m × 3,1 m

**Silhouette :** Skiff fermé avec six capsules de contention, proue blindée et sas inférieur.

**Rôle :** Transport de criminels, missions d’évasion et événements de convoi.

**Statistiques :** Vitesse 5/10 · Accélération 4/10 · Maniabilité 5/10 · Armure 9/10 · Offense 5/10 · Franchissement 6/10 · Furtivité 2/10 · Cargo 9/10.

**Capacités :** Capsules anti-autodestruction ; Sas d’arrestation ; Balise de tribunal ; Compartiments séparés.

**Armement :** Tourelle neutralisante ; Bouclier arrière.

**Biomes :** ville, désert, orbite basse via cinématique.

**Tags de level design :** `PRISON_ROUTE`, `CONVOY_ROUTE`, `BOARDING_POINT`, `HEAVY_VEHICLE`.

**Obtention :** Véhicule de faction non possédé ; accessible comme scène et objectif de mission.

**Faiblesses :** Trajet prévisible ; Faible attaque frontale ; Capsules ciblables par les assaillants.

**Animations propres :** Chargement prisonnier ; Capsules verrouillées ; Tentative d’évasion ; Abordage ; Crash de convoi.

**Brief visuel :** Skiff-prison Yautja fermé, six capsules visibles, blindage noir et glyphes judiciaires blancs, silhouette intimidante.

**Accroches de missions :** Libérer un innocent ; Empêcher l’évasion d’un chef Bad Blood.

## 32. Chariot de l’Arbitre

**Famille :** Véhicule Enforcer cérémoniel  
**Statut créatif :** Création originale  
**Tier :** 5  
**Équipage :** 1 Arbitre + 2 gardes  
**Dimensions :** 8,6 m × 3,6 m × 3,9 m

**Silhouette :** Plateforme verticale majestueuse, trône suspendu, deux gardes debout et boucliers en demi-lune.

**Rôle :** Présence d’autorité, boss de faction et tribunal mobile.

**Statistiques :** Vitesse 4/10 · Accélération 3/10 · Maniabilité 4/10 · Armure 9/10 · Offense 8/10 · Franchissement 6/10 · Furtivité 1/10 · Cargo 4/10.

**Capacités :** Aura de commandement renforçant les Enforcers ; Sentence mark sur une cible ; Boucliers rotatifs ; Plateforme de duel après immobilisation.

**Armement :** Lance plasma judiciaire ; Tourelles de garde ; Onde de sentence.

**Biomes :** cité Yautja, plaine rituelle, forteresse.

**Tags de level design :** `CEREMONIAL_ROUTE`, `BOSS_TRACK`, `DUEL_PLATFORM`, `HEAVY_VEHICLE`.

**Obtention :** Non possédable ; vaincu ou escorté selon l’alignement.

**Faiblesses :** Lent ; Très visible ; Vulnérable lorsque le duel commence.

**Animations propres :** Arrivée processionnelle ; Boucliers rotatifs ; Sentence mark ; Transformation en arène ; Défaite de l’Arbitre.

**Brief visuel :** Chariot antigrav Yautja cérémoniel, trône haut, deux gardes complets, boucliers en croissant et glyphes de loi, boss mobile imposant.

**Accroches de missions :** Audience qui tourne au duel ; Escorter l’Arbitre pendant une guerre civile.

## 33. Sled-drone pisteur

**Famille :** Drone Enforcer  
**Statut créatif :** Création originale  
**Tier :** 3  
**Équipage :** Autonome  
**Dimensions :** 2,7 m × 1,2 m × 0,65 m

**Silhouette :** Petit sled sans pilote, nez capteur, quatre pattes-pinces repliées et projecteur de piste.

**Rôle :** Traque persistante du joueur recherché et balisage de cibles.

**Statistiques :** Vitesse 8/10 · Accélération 8/10 · Maniabilité 10/10 · Armure 2/10 · Offense 3/10 · Franchissement 8/10 · Furtivité 8/10 · Cargo 1/10.

**Capacités :** Suit une signature sur plusieurs sous-zones ; Pose une balise visible par les Enforcers ; Passe dans les tunnels de service ; Auto-effacement si capturé.

**Armement :** Dard de marquage ; Micro-EMP.

**Biomes :** tous biomes, ville, intérieurs larges.

**Tags de level design :** `DRONE_ROUTE`, `UTILITY_TUNNEL`, `CHASE_ROUTE`, `TRACKING_NODE`.

**Obtention :** Capturable pour fabriquer un contre-brouilleur, mais non pilotable.

**Faiblesses :** Très fragile ; Aucun dégât réel ; Auto-effacement rapide.

**Animations propres :** Scan de sol ; Déploiement des pinces ; Dard de marquage ; Passage en tunnel ; Auto-effacement.

**Brief visuel :** Drone sled Yautja compact, capteurs rouges, pinces repliables, projecteur de glyphes au sol, aucun pilote.

**Accroches de missions :** Détruire les trackers avant le raid ; Retourner un tracker contre son maître.

## 34. Porte-barricade Enforcer

**Famille :** Véhicule Enforcer utilitaire  
**Statut créatif :** Création originale  
**Tier :** 4  
**Équipage :** 1 pilote + 2 agents  
**Dimensions :** 6,9 m × 3,1 m × 2,4 m

**Silhouette :** Transport blindé portant trois arches de barrage repliées sur le dos.

**Rôle :** Création dynamique de roadblocks et contrôle de zones.

**Statistiques :** Vitesse 5/10 · Accélération 4/10 · Maniabilité 5/10 · Armure 9/10 · Offense 4/10 · Franchissement 6/10 · Furtivité 1/10 · Cargo 8/10.

**Capacités :** Déploie trois barrières physiques ; Champ anti-camouflage ; Point de renfort Enforcer ; Ramassage et repositionnement des barrages.

**Armement :** Tourelle EMP ; Projecteur anti-cloak.

**Biomes :** ville, route, désert, port spatial.

**Tags de level design :** `ROADBLOCK_NODE`, `ENFORCER_ROUTE`, `HEAVY_VEHICLE`, `ANTI_CLOAK_ZONE`.

**Obtention :** Véhicule de faction ; peut être détourné durant une mission Bad Blood.

**Faiblesses :** Très lent pendant le déploiement ; Arrière exposé ; Aucune mobilité verticale.

**Animations propres :** Déploiement barrière ; Champ anti-cloak ; Ramassage barrière ; Ouverture arrière ; Détournement.

**Brief visuel :** Transport Enforcer blindé, trois arches de barrage repliées, projecteur anti-camouflage blanc et silhouettes d’agents complètes.

**Accroches de missions :** Briser un encerclement ; Installer un cordon avant une émeute.

## 35. Kha’Rha

**Famille :** Destrier biologique  
**Statut créatif :** Création originale inspirée de l’imagerie de fan-créations, sans copie directe  
**Tier :** 3  
**Équipage :** 1 cavalier  
**Dimensions :** 2,8 m au garrot × 5,1 m long

**Silhouette :** Quadrupède félin-reptilien, épaules hautes, crinière de filaments, mâchoire large et plaques naturelles sur le dos.

**Rôle :** Monture polyvalente, chasse traditionnelle et combat à la lance.

**Statistiques :** Vitesse 8/10 · Accélération 8/10 · Maniabilité 8/10 · Armure 5/10 · Offense 7/10 · Franchissement 8/10 · Furtivité 7/10 · Cargo 3/10.

**Capacités :** Bond long ; Charge à la lance ; Odorat de piste ; Appel à distance selon le lien BOND.

**Armement :** Morsure ; Griffes ; Armes du cavalier.

**Biomes :** jungle, savane, désert rocheux, forêt.

**Tags de level design :** `MOUNT_TRAIL`, `MOUNT_JUMP`, `SCENT_TRACK`, `BEAST_STABLE`.

**Obtention :** Capturer un jeune adulte durant la quête « Premier lien », puis réussir trois exercices de confiance.

**Faiblesses :** Peur du feu au faible BOND ; Fatigue réelle ; Refuse les environnements toxiques sans équipement.

**Animations propres :** Bond de chasse ; Charge montée ; Piste olfactive ; Rugissement de rappel ; Interaction de lien.

**Brief visuel :** Grand destrier Yautja original, quadrupède félin-reptilien, plaques naturelles, crinière de filaments, selle rituelle minimale et cavalier Yautja complet.

**Accroches de missions :** Première chevauchée ; Traque traditionnelle sans technologie.

## 36. Kha’Rha de guerre

**Famille :** Destrier biologique  
**Statut créatif :** Variante originale de clan  
**Tier :** 4  
**Équipage :** 1 cavalier  
**Dimensions :** 3,2 m au garrot × 5,8 m long

**Silhouette :** Kha’Rha plus massif, cornes frontales, armure de cou et plaques cérémonielles de flanc.

**Rôle :** Guerre de clans, bris de lignes et duel monté.

**Statistiques :** Vitesse 7/10 · Accélération 8/10 · Maniabilité 6/10 · Armure 8/10 · Offense 9/10 · Franchissement 7/10 · Furtivité 3/10 · Cargo 4/10.

**Capacités :** Charge blindée ; Piétinement de zone ; Protection du cavalier ; Rage contrôlée sous 30 % de santé.

**Armement :** Cornes ; Morsure ; Piétinement ; Armes du cavalier.

**Biomes :** plaine, désert, cité en guerre.

**Tags de level design :** `HEAVY_MOUNT_TRAIL`, `MOUNT_BREAK_2`, `WAR_LANE`, `BEAST_STABLE_LARGE`.

**Obtention :** Élevé à partir d’un Kha’Rha avec BOND 80 et remporté lors du Tournoi des Bêtes.

**Faiblesses :** Peu discret ; Demande beaucoup de nourriture ; Virages lents.

**Animations propres :** Charge cornes baissées ; Piétinement ; Rage contrôlée ; Blocage protecteur ; Salut de guerre.

**Brief visuel :** Kha’Rha colossal en armure Yautja cérémonielle, cornes, plaques bronze/noir, cavalier complet à la lance, silhouette de cavalerie lourde.

**Accroches de missions :** Tournoi des Bêtes ; Percer la garde d’un Clan Lord.

## 37. Forest Stalker

**Famille :** Destrier arboricole  
**Statut créatif :** Création originale inspirée des montures de fan arts  
**Tier :** 3  
**Équipage :** 1 cavalier  
**Dimensions :** 2,1 m au garrot × 4,7 m avec queue

**Silhouette :** Corps mince de félin arboricole, six membres, longue queue préhensile et griffes recourbées.

**Rôle :** Canopée, branches, lianes et infiltration verticale.

**Statistiques :** Vitesse 8/10 · Accélération 9/10 · Maniabilité 10/10 · Armure 3/10 · Offense 6/10 · Franchissement 10/10 · Furtivité 9/10 · Cargo 1/10.

**Capacités :** Course sur branches ; Saut de liane à liane ; Accroche murale brève ; Camouflage naturel du pelage.

**Armement :** Griffes ; Morsure en chute ; Armes légères du cavalier.

**Biomes :** canopée, forêt tropicale, ruines envahies.

**Tags de level design :** `CANOPY_MOUNT`, `BRANCH_ROUTE`, `MOUNT_WALL_GRIP`, `VINE_TRANSFER`.

**Obtention :** Dresser une femelle dominante sans utiliser de filet ni de plasma.

**Faiblesses :** Très fragile au sol ouvert ; Ne porte aucun gros trophée ; Panique face aux explosions répétées.

**Animations propres :** Course six membres ; Queue d’équilibre ; Accroche murale ; Saut de liane ; Attaque plongeante.

**Brief visuel :** Monture arboricole extraterrestre à six membres, longue queue, peau sombre tachetée, selle Yautja légère, cavalier complet et silhouette acrobatique.

**Accroches de missions :** Chasse dans la canopée ; Sauver un œuf au sommet d’un arbre-monde.

## 38. Sand Mauler

**Famille :** Destrier désertique  
**Statut créatif :** Création originale  
**Tier :** 3  
**Équipage :** 1 cavalier  
**Dimensions :** 2,4 m au garrot × 5,5 m long

**Silhouette :** Six pattes, torse bas, tête en pelle et voiles latérales capables de sentir les vibrations.

**Rôle :** Course sur sable, détection des proies enfouies et endurance.

**Statistiques :** Vitesse 9/10 · Accélération 8/10 · Maniabilité 8/10 · Armure 5/10 · Offense 7/10 · Franchissement 10/10 · Furtivité 6/10 · Cargo 3/10.

**Capacités :** Lecture sismique ; Sprint sans fatigue sur dune ; Plongée partielle sous le sable ; Évitement instinctif des vers.

**Armement :** Mâchoire-pelle ; Griffes de fouissage ; Lance du cavalier.

**Biomes :** désert, mer de cendres, salines.

**Tags de level design :** `SAND_MOUNT`, `BURROW_SENSOR`, `DUNE_RAMP`, `SAND_SHORTCUT`.

**Obtention :** Gagner la confiance d’une meute en lui apportant une proie fouisseuse vivante.

**Faiblesses :** Mauvais sur roche ; Voiles sensibles aux tirs ; Supporte mal le froid.

**Animations propres :** Course six pattes ; Plongée sable ; Lecture sismique ; Émergence ; Esquive de ver.

**Brief visuel :** Destrier désertique à six pattes, tête de pelle, voiles sensorielles, peau ocre sombre et selle légère, silhouette faite pour les dunes.

**Accroches de missions :** Migration sous la tempête ; Chasse au ver enfoui.

## 39. Stoneback

**Famille :** Bête de trait  
**Statut créatif :** Création originale  
**Tier :** 4  
**Équipage :** 1 cavalier + charge lourde  
**Dimensions :** 3,5 m au garrot × 6,4 m long

**Silhouette :** Quadrupède massif proche d’un rhinocéros alien, dos en roche stratifiée et corne plate comme un bélier.

**Rôle :** Transport lourd, destruction de portes et survie aux tirs.

**Statistiques :** Vitesse 4/10 · Accélération 5/10 · Maniabilité 4/10 · Armure 10/10 · Offense 9/10 · Franchissement 7/10 · Furtivité 1/10 · Cargo 9/10.

**Capacités :** Charge de bélier ; Carapace couvrant le cavalier ; Transport d’un trophée lourd ; Résistance aux tempêtes.

**Armement :** Corne-bélier ; Piétinement.

**Biomes :** montagne, désert rocheux, plaine volcanique.

**Tags de level design :** `HEAVY_MOUNT_TRAIL`, `MOUNT_BREAK_3`, `HEAVY_TROPHY`, `STORM_ROUTE`.

**Obtention :** Sauver un troupeau d’une chasse illégale puis recevoir un individu du Beastmaster.

**Faiblesses :** Très lent ; Impossible dans les passages étroits ; Attire les prédateurs géants.

**Animations propres :** Charge lourde ; Carapace qui se ferme ; Chargement trophée ; Piétinement ; Repos au sol.

**Brief visuel :** Monture de trait Yautja gigantesque, rhinocéros alien avec dos de pierre, corne plate, harnais rituel et cavalier complet paraissant petit.

**Accroches de missions :** Convoyer un trophée colossal ; Briser une porte de forteresse.

## 40. Ice Fang

**Famille :** Destrier polaire  
**Statut créatif :** Création originale  
**Tier :** 3  
**Équipage :** 1 cavalier  
**Dimensions :** 2,5 m au garrot × 5,0 m long

**Silhouette :** Prédateur blanc bleuté à quatre membres principaux et deux stabilisateurs, longues griffes d’adhérence et crocs translucides.

**Rôle :** Glacier, neige profonde et chasse silencieuse par grand froid.

**Statistiques :** Vitesse 8/10 · Accélération 8/10 · Maniabilité 9/10 · Armure 5/10 · Offense 7/10 · Franchissement 10/10 · Furtivité 9/10 · Cargo 2/10.

**Capacités :** Adhérence sur glace ; Bond dans la neige profonde ; Souffle masqué thermiquement ; Hurlement révélant les cavités.

**Armement :** Crocs ; Griffes ; Armes du cavalier.

**Biomes :** glacier, toundra, grotte de glace.

**Tags de level design :** `ICE_MOUNT`, `SNOW_DEPTH`, `ICE_WALL_GRIP`, `CAVITY_REVEAL`.

**Obtention :** Pister l’alpha durant une nuit polaire complète sans vision thermique.

**Faiblesses :** Faible résistance à la chaleur ; Crocs fragiles contre armure ; Capacité cargo réduite.

**Animations propres :** Course sur glace ; Bond neige ; Griffes d’adhérence ; Hurlement sonar ; Secouage de givre.

**Brief visuel :** Monture polaire alien blanc bleuté, six appuis, griffes longues, crocs translucides, selle sombre et vapeur de souffle discrète.

**Accroches de missions :** Nuit sans soleil ; Course sur glacier qui s’effondre.

## 41. Swamp Strider

**Famille :** Destrier amphibie  
**Statut créatif :** Création originale  
**Tier :** 3  
**Équipage :** 1 cavalier  
**Dimensions :** 3,1 m au garrot × 5,2 m long

**Silhouette :** Longues pattes d’échassier, corps cuirassé, cou court et sacs respiratoires latéraux.

**Rôle :** Traversée de boue, eau toxique et marais profond.

**Statistiques :** Vitesse 6/10 · Accélération 5/10 · Maniabilité 8/10 · Armure 6/10 · Offense 5/10 · Franchissement 10/10 · Furtivité 7/10 · Cargo 4/10.

**Capacités :** Marche en eau profonde ; Filtration de toxines ; Détection de sol instable ; Immobilité camouflage parmi les roseaux.

**Armement :** Coup de patte ; Bec mandibulaire ; Harpon du cavalier.

**Biomes :** marais, mangrove, delta toxique.

**Tags de level design :** `SWAMP_MOUNT`, `WATER_DEEP_WADE`, `TOXIC_SURFACE`, `MUD_ROUTE`.

**Obtention :** Faire éclore un œuf sauvé d’un nid contaminé puis l’élever au vaisseau.

**Faiblesses :** Maladroit sur roche sèche ; Sacs respiratoires ciblables ; Vitesse moyenne.

**Animations propres :** Marche haute ; Enfoncement boue ; Filtration ; Camouflage roseaux ; Nage paniquée.

**Brief visuel :** Destrier amphibie Yautja à longues pattes, cuirasse sombre, sacs respiratoires, silhouette d’échassier prédateur et selle haute.

**Accroches de missions :** Sauver le nid contaminé ; Traversée silencieuse des roseaux.

## 42. Night Stalker

**Famille :** Destrier nocturne  
**Statut créatif :** Création originale  
**Tier :** 4  
**Équipage :** 1 cavalier  
**Dimensions :** 2,3 m au garrot × 4,8 m long

**Silhouette :** Félin alien noir aux plaques minces, quatre yeux et peau chromatophore changeant lentement de motif.

**Rôle :** Infiltration nocturne, chasse sans technologie et assassinat de proies isolées.

**Statistiques :** Vitesse 8/10 · Accélération 9/10 · Maniabilité 9/10 · Armure 3/10 · Offense 8/10 · Franchissement 8/10 · Furtivité 10/10 · Cargo 1/10.

**Capacités :** Camouflage biologique immobile ; Vision nocturne partagée ; Pas silencieux ; Bond d’exécution sur cible marquée.

**Armement :** Griffes ; Morsure de gorge.

**Biomes :** forêt nocturne, caverne, ville basse.

**Tags de level design :** `NIGHT_MOUNT`, `STEALTH_ROUTE`, `MOUNT_JUMP`, `SHADOW_NODE`.

**Obtention :** Chaîne de chasse Traditionalist ; aucune arme énergétique autorisée pendant la capture.

**Faiblesses :** Camouflage se rompt en sprint ; Très fragile ; Déteste les lumières intenses.

**Animations propres :** Chromatophores ; Marche furtive ; Bond d’exécution ; Réaction lumière ; Vision partagée.

**Brief visuel :** Monture nocturne féline noire à quatre yeux, motifs chromatophores subtils, selle minimale, présence élégante et terrifiante.

**Accroches de missions :** La chasse sans lumière ; Infiltrer un camp sans déclencher d’alarme.

## 43. Blood Beast

**Famille :** Destrier Bad Blood  
**Statut créatif :** Création originale Bad Blood inspirée de fan arts  
**Tier :** 4  
**Équipage :** 1 cavalier  
**Dimensions :** 3,0 m au garrot × 5,6 m long

**Silhouette :** Bête musculeuse couverte de cicatrices, chaînes rompues, implants volés et mâchoire partiellement blindée.

**Rôle :** Monture brutale à très hauts dégâts mais difficile à contrôler.

**Statistiques :** Vitesse 8/10 · Accélération 10/10 · Maniabilité 4/10 · Armure 7/10 · Offense 10/10 · Franchissement 7/10 · Furtivité 1/10 · Cargo 2/10.

**Capacités :** Jauge FERAL ; Frénésie après blessure ; Dévore les petites proies pour se soigner ; Peut désarçonner son maître.

**Armement :** Mâchoire blindée ; Griffes ; Piétinement.

**Biomes :** arène, décharge, désert, camp Bad Blood.

**Tags de level design :** `OUTLAW_MOUNT`, `FERAL_ROUTE`, `WAR_LANE`, `BEAST_STABLE_SECURE`.

**Obtention :** Volée à un Beastmaster Bad Blood ; le joueur peut la réhabiliter ou exploiter sa rage.

**Faiblesses :** Contrôle instable ; Impossible en ville légale ; Augmente la recherche Enforcer.

**Animations propres :** Frénésie ; Désarçonnement ; Dévoration ; Chaînes qui cassent ; Apaisement BOND.

**Brief visuel :** Monture Bad Blood énorme, cicatrices, implants asymétriques, chaînes et mâchoire blindée, violence visuelle sans gore excessif.

**Accroches de missions :** Dominer ou libérer la bête ; Évasion du Pit clandestin.

## 44. Grande Bête des Elders

**Famille :** Destrier légendaire  
**Statut créatif :** Création originale cérémonielle  
**Tier :** 5  
**Équipage :** 1 Elder ou joueur prestigieux  
**Dimensions :** 4,5 m au garrot × 8,0 m long

**Silhouette :** Créature majestueuse à six membres, crête osseuse en couronne, longues mandibules et carapace gravée naturellement.

**Rôle :** Symbole de prestige, combat de fin de jeu et voyage cérémoniel.

**Statistiques :** Vitesse 7/10 · Accélération 6/10 · Maniabilité 6/10 · Armure 10/10 · Offense 10/10 · Franchissement 9/10 · Furtivité 5/10 · Cargo 7/10.

**Capacités :** Rugissement d’autorité ; Franchissement de gouffres par bond colossal ; Protection instinctive du cavalier ; Présence faisant fuir les petites créatures.

**Armement :** Mandibules ; Griffes antérieures ; Onde de rugissement.

**Biomes :** Homeworld extérieur, montagne sacrée, plaine rituelle.

**Tags de level design :** `LEGENDARY_MOUNT`, `COLOSSAL_MOUNT_TRAIL`, `MOUNT_JUMP_3`, `CEREMONIAL_ROUTE`.

**Obtention :** Prestige maximal, approbation de trois Elders et quête sans mort « Le poids des siècles ».

**Faiblesses :** Ne peut être appelée dans une mission indigne ; Très grande silhouette ; Coût de soin élevé.

**Animations propres :** Arrivée processionnelle ; Bond colossal ; Rugissement d’autorité ; Protection du cavalier ; Salut aux Elders.

**Brief visuel :** Destrier Yautja légendaire à six membres, crête-couronne, carapace naturelle gravée, immense échelle et selle cérémonielle d’Elder.

**Accroches de missions :** Le poids des siècles ; Duel final de prestige.

## 45. Bone-Bison de guerre

**Famille :** Destrier domestiqué  
**Statut créatif :** Extrapolation de jeu à partir d’une créature de Badlands ; domestication originale  
**Tier :** 4  
**Équipage :** 1 cavalier ou 2 passagers légers  
**Dimensions :** 3,4 m au garrot × 6,2 m long

**Silhouette :** Bison extraterrestre cuirassé, large crâne osseux, deux cornes latérales et épaules puissantes.

**Rôle :** Charge, transport de clan et traversée de plaines hostiles.

**Statistiques :** Vitesse 6/10 · Accélération 7/10 · Maniabilité 5/10 · Armure 9/10 · Offense 9/10 · Franchissement 8/10 · Furtivité 2/10 · Cargo 7/10.

**Capacités :** Charge en troupeau ; Protection frontale osseuse ; Transport de deux Hunters ; Brise la flore agressive basse.

**Armement :** Cornes ; Crâne-bélier ; Armes des cavaliers.

**Biomes :** plaine de Genna-like, savane, forêt ouverte.

**Tags de level design :** `HEAVY_MOUNT_TRAIL`, `MOUNT_BREAK_2`, `HERD_ROUTE`, `FLORA_BREAK`.

**Obtention :** Débloqué après une mission d’observation et de sauvetage d’un troupeau ; la domestication reste propre au jeu.

**Faiblesses :** Peu agile ; Très visible ; Panique si isolé du troupeau à faible BOND.

**Animations propres :** Charge de troupeau ; Coup de crâne ; Secouage des cornes ; Protection du cavalier ; Ralliement au troupeau.

**Brief visuel :** Bison alien cuirassé à crâne osseux massif, selle Yautja renforcée, proportions monumentales, cavalier complet et silhouette de charge.

**Accroches de missions :** La grande migration ; Défendre le troupeau contre un Kalisk juvénile.

## 46. Razorwing

**Famille :** Monture aérienne  
**Statut créatif :** Création originale inspirée de fan arts  
**Tier :** 4  
**Équipage :** 1 cavalier  
**Dimensions :** Envergure 11 m × corps 4,8 m

**Silhouette :** Prédateur volant à quatre ailes en faucille, longue queue et tête blindée étroite.

**Rôle :** Vol court contrôlé, plongée d’attaque et accès aux îles suspendues.

**Statistiques :** Vitesse 9/10 · Accélération 8/10 · Maniabilité 8/10 · Armure 3/10 · Offense 8/10 · Franchissement 10/10 · Furtivité 7/10 · Cargo 1/10.

**Capacités :** Décollage depuis falaise ou courant ; Plongée prédatrice ; Accrochage sous corniche ; Cri détectant les cibles aériennes.

**Armement :** Serres ; Bec-lame ; Lance du cavalier.

**Biomes :** canyon, canopée, îles flottantes, montagne.

**Tags de level design :** `AERIAL_MOUNT`, `CLIFF_LAUNCH`, `AERIAL_CURRENT`, `ROOST_NODE`.

**Obtention :** Voler avec un juvénile blessé jusqu’à son nid, puis recevoir son acceptation après maturation.

**Faiblesses :** Pas de stationnaire ; Très vulnérable aux tirs ; Capacité cargo minimale.

**Animations propres :** Décollage falaise ; Battement quatre ailes ; Plané ; Plongée ; Accrochage corniche ; Atterrissage nid.

**Brief visuel :** Monture volante Yautja à quatre ailes-faucilles, corps sombre, queue longue, selle de chasse légère et cavalier complet.

**Accroches de missions :** Chasse dans les îles suspendues ; Duel aérien contre un glider.

## 47. Cliff Leaper

**Famille :** Destrier montagnard  
**Statut créatif :** Création originale  
**Tier :** 3  
**Équipage :** 1 cavalier  
**Dimensions :** 2,0 m au garrot × 4,2 m long

**Silhouette :** Mélange de bouquetin extraterrestre et félin, quatre pattes très longues, deux bras d’accroche et cornes arrière.

**Rôle :** Sauts verticaux, falaises et raccourcis de montagne.

**Statistiques :** Vitesse 7/10 · Accélération 9/10 · Maniabilité 10/10 · Armure 4/10 · Offense 6/10 · Franchissement 10/10 · Furtivité 8/10 · Cargo 2/10.

**Capacités :** Triple bond mural ; Accroche à une corniche ; Chute contrôlée ; Détection des pierres instables.

**Armement :** Cornes arrière ; Coup de patte ; Armes légères du cavalier.

**Biomes :** montagne, canyon, ruine verticale.

**Tags de level design :** `CLIFF_MOUNT`, `MOUNT_WALL_JUMP`, `LEDGE_GRAB`, `ROCKFALL_SENSOR`.

**Obtention :** Capturé au sommet d’une zone accessible uniquement après obtention du grappin.

**Faiblesses :** Faible au combat de plaine ; Armure réduite ; Refuse les espaces clos.

**Animations propres :** Triple bond ; Accroche corniche ; Chute contrôlée ; Avertissement éboulement ; Coup de cornes arrière.

**Brief visuel :** Monture montagnarde alien, longues pattes, bras d’accroche et cornes arrière, selle très compacte, silhouette de saut vertical.

**Accroches de missions :** Ascension sans toucher le fond du canyon ; Course contre un éboulement.

## 48. Burrow Wyrm

**Famille :** Monture fouisseuse  
**Statut créatif :** Création originale  
**Tier :** 4  
**Équipage :** 1 cavalier dans harnais dorsal  
**Dimensions :** 1,6 m diamètre × 9 m long

**Silhouette :** Créature serpentiforme blindée, six petites pattes de traction et tête foreuse naturelle à trois mandibules.

**Rôle :** Déplacement souterrain, embuscade et ouverture de tunnels organiques.

**Statistiques :** Vitesse 6/10 · Accélération 6/10 · Maniabilité 5/10 · Armure 8/10 · Offense 8/10 · Franchissement 10/10 · Furtivité 9/10 · Cargo 3/10.

**Capacités :** Fouissage dans sols marqués ; Émergence offensive ; Détection de cavités ; Tunnel temporaire pour alliés.

**Armement :** Mandibules foreuses ; Jet de gravier ; Armes du cavalier à l’émergence.

**Biomes :** désert, sol meuble, ruche fossile.

**Tags de level design :** `BURROW_MOUNT`, `SOFT_GROUND`, `CAVITY_SCAN`, `TEMP_TUNNEL`.

**Obtention :** Faire éclore une larve provenant d’un boss sans tuer la mère ; entraînement long au Beastmaster Quarter.

**Faiblesses :** Impossible dans la roche dure ; Contrôle limité sous terre ; Vulnérable à l’émergence.

**Animations propres :** Plongée sol ; Fouissage ; Virage souterrain ; Émergence ; Tunnel laissé derrière.

**Brief visuel :** Monture serpentiforme Yautja blindée, tête à trois mandibules, harnais dorsal sécurisé, longues proportions entièrement visibles.

**Accroches de missions :** Infiltration sous une forteresse ; Course souterraine contre un effondrement.

## 49. Ash Horn

**Famille :** Destrier volcanique  
**Statut créatif :** Création originale  
**Tier :** 4  
**Équipage :** 1 cavalier  
**Dimensions :** 2,9 m au garrot × 5,3 m long

**Silhouette :** Quadrupède basaltique, corne creuse rougeoyante, sabots fendus et plaques respirant de la vapeur.

**Rôle :** Lave peu profonde, cendres, bris de roche chauffée.

**Statistiques :** Vitesse 7/10 · Accélération 7/10 · Maniabilité 7/10 · Armure 9/10 · Offense 9/10 · Franchissement 10/10 · Furtivité 3/10 · Cargo 4/10.

**Capacités :** Marche sur lave peu profonde ; Charge thermique ; Absorption de chaleur ; Souffle de cendre masquant la fuite.

**Armement :** Corne incandescente ; Coup de sabot ; Nuage de cendre.

**Biomes :** volcan, mer de cendres, forge naturelle.

**Tags de level design :** `LAVA_SHALLOW`, `HEAT_ROUTE`, `MOUNT_BREAK_2`, `ASH_CLOUD`.

**Obtention :** Épreuve de la Caldeira : calmer un individu en utilisant la température plutôt que la violence.

**Faiblesses :** Se refroidit et ralentit en biome glacial ; Très visible thermiquement ; Nuage gênant aussi les alliés.

**Animations propres :** Sabots sur lave ; Corne qui chauffe ; Charge thermique ; Nuage de cendre ; Refroidissement.

**Brief visuel :** Monture volcanique basaltique, fissures rouges, corne creuse incandescente, vapeur et selle résistante à la chaleur.

**Accroches de missions :** Traversée de la caldeira ; Duel au bord d’une coulée de lave.

## 50. Storm Runner

**Famille :** Destrier de tempête  
**Statut créatif :** Création originale  
**Tier :** 4  
**Équipage :** 1 cavalier  
**Dimensions :** 2,5 m au garrot × 5,0 m long

**Silhouette :** Quadrupède nerveux aux longues antennes, plaques conductrices et crinière produisant des arcs électriques.

**Rôle :** Course dans les tempêtes, recharge d’équipement et chasse sur plaines électromagnétiques.

**Statistiques :** Vitesse 10/10 · Accélération 10/10 · Maniabilité 8/10 · Armure 4/10 · Offense 7/10 · Franchissement 9/10 · Furtivité 5/10 · Cargo 2/10.

**Capacités :** Canalise la foudre ; Recharge le Plasma Caster en courant ; Dash éclair après impact de foudre ; Détecte les fronts de tempête.

**Armement :** Décharge corporelle ; Coup de corne conductrice ; Armes du cavalier.

**Biomes :** plaine orageuse, désert magnétique, plateau.

**Tags de level design :** `STORM_MOUNT`, `LIGHTNING_NODE`, `ELECTRIC_ROUTE`, `MOUNT_JUMP`.

**Obtention :** Suivre la meute durant trois orages et survivre sans isolant technologique.

**Faiblesses :** Surcharge possible ; Faible armure ; Dangereux près des alliés mouillés.

**Animations propres :** Crinière électrique ; Impact de foudre ; Dash éclair ; Décharge ; Surcharge et apaisement.

**Brief visuel :** Monture Yautja de tempête, quadrupède élancé, longues antennes, plaques conductrices et crinière d’arcs électriques, selle isolée.

**Accroches de missions :** Chevaucher l’orage ; Relancer un générateur en pleine chasse.

# Systèmes transversaux

## 1. Possession, appel et stockage

Chaque moyen de mobilité possède un état persistant : stocké, appelé, en approche, disponible, monté, abandonné, endommagé, détruit/KO, en récupération. L’appel n’est autorisé que si un itinéraire d’arrivée crédible existe. Une machine n’apparaît jamais par téléportation devant le joueur : elle arrive depuis l’arrière-plan, une porte, une piste, un nid ou une zone de largage.

## 2. Garage du vaisseau

Le vaisseau reçoit une baie physique avec un emplacement machine et un emplacement monture, un établi, un râtelier, des crochets à trophées, un terminal de rappel et une zone de soin. Les changements sont visibles directement dans la pièce. Les grands modèles restent dans un hangar externe et sont appelés comme service.

## 3. Homeworld

Le **Forge District Garage** gère machines, noyaux, armures, armes et courses. Le **Beastmaster Quarter** gère capture, élevage, soins, BOND, selles, lignées et tournois. Les deux quartiers sont de vrais niveaux avec ateliers, pistes, écuries, PNJ et accès aux biomes extérieurs.

## 4. BOND et comportement animal

BOND va de 0 à 100. Il augmente par soins, nourriture, chasse, retour sans abandon et réussite de commandes. Aux seuils 25/50/75/100, la monture apprend respectivement rappel fiable, esquive assistée, protection du cavalier et compétence combinée. Peur, blessures et fatigue peuvent temporairement désactiver ces avantages.

## 5. Énergie, chaleur et réparation

Les véhicules consomment une charge pour boost, camouflage et capacités. Les armes lourdes produisent de la chaleur. Trois états visuels minimum sont requis : intact, endommagé, critique. Les pannes locales touchent moteur, stabilisateur, arme ou cargo. Une réparation de terrain est limitée ; la Forge mobile et le garage restaurent complètement.

## 6. Trophées physiques

Petits trophées sur le Yautja ; moyens sur Trophy Carrier ; lourds sur Stoneback ou carrier amélioré ; colossaux via Grand Trophy Hauler. Le trophée est visible pendant le trajet, influence masse/maniabilité et apparaît ensuite dans le Trophy Hall. Les captures vivantes utilisent cages, oxygène et risques d’évasion.

## 7. Poursuites

Une poursuite traverse des sous-zones reliées. Les Enforcers doublent, coupent la route, posent un filet, demandent un barrage et cessent la poursuite selon juridiction. Les Bad Blood minent, détournent, lâchent leur cargaison ou déclenchent un faux signal. La caméra dézoome selon l’écart entre protagonistes et garde le prochain obstacle lisible.

## 8. Types de chemins

- **FOOT** : tunnels, conduits, branches fines, intérieurs.
- **MOUNT** : sentiers, canopées, grandes grottes, pentes.
- **VEHICLE** : plaines, avenues, canyons, fleuves.
- **HEAVY** : siège, extraction colossale, convois.
- **AERIAL/BURROW/WALL** : routes spécialisées rarement parallèles au chemin principal, toujours avec sortie et retour lisibles.

## 9. Progression

Le joueur commence avec le Grav-Sled, obtient ensuite une Moto de chasse ou un Kha’Rha selon son orientation, puis ouvre les familles environnementales. Les modèles Enforcer/Bad Blood dépendent de l’alignement. Les engins de siège et transports colossaux restent des ressources de mission. Le Blade Fighter et la Grande Bête des Elders sont des objectifs de prestige de fin de jeu.

## 10. Vertical slices de production

1. Moto antigrav de chasse : vitesse, saut, caméra et poursuite.  
2. Blade Fighter K-93 : lourdeur, armes, capture et destruction.  
3. Kha’Rha : BOND, fatigue, peur, charge et écurie.  
Après validation, toutes les autres entrées réutilisent les mêmes systèmes data-driven au lieu de dupliquer du code.
