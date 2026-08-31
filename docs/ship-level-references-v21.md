# Vaisseau V21 — références de niveau 2D et objets réutilisables

Date de vérification : 31 août 2026. Ce document prépare un hub latéral composé de salles, couloirs et seuils traversables. Il ne certifie pas encore le rendu V21 ou ses collisions. Aucun code, registre ou bitmap n'a été modifié pour cet inventaire.

## Trois références primaires

### 1. Dead Cells — Sébastien Bénard, concepteur principal chez Motion Twin

[The Level Design of Dead Cells, billet de l'auteur, 15 février 2020](https://deepnight.net/tutorial/the-level-design-of-dead-cells-a-hybrid-approach/).

**Ce que la source établit :** le réseau général reste conçu à la main ; les salles ont des fonctions et des entrées/sorties définies ; un graphe organise leur assemblage. Les contraintes précèdent la génération. L'auteur explique aussi que l'identité du lieu dépend de ses espaces praticables, pas seulement de son habillage. Il s'agit du témoignage direct du concepteur, pas d'une analyse de joueur ni d'un compte rendu GDC supposé.

**Transposition proposée, donc inférence :** garder un graphe fixe pour ce vaisseau. Définir d'abord les pièces de service, leurs portes et leurs passages verticaux. Le kit graphique peut varier les panneaux et accessoires sans déplacer les stations à chaque visite. Aucune génération procédurale n'est nécessaire pour obtenir un niveau modulaire.

### 2. Hollow Knight — documents de production Team Cherry présentés par ACMI

[Development map of Hallownest, document fourni par Team Cherry](https://www.acmi.net.au/works/100545--hollow-knight-a3-map/).

**Ce que la source établit :** ACMI identifie un plan original de développement, fourni par Team Cherry, sous forme d'impression d'un dessin de carte. La fiche ne décrit pas une formule de caméra ni des distances de saut. La reproduction de l'image utilise un lien signé qui n'a pas pu être chargé pendant cette recherche : aucun détail géométrique de cette carte n'est présenté ici comme observé.

**Transposition proposée, donc inférence :** garder un plan de production lisible du vaisseau, indépendant de la peinture des murs : noms des salles, connexions, sens de passage et retour au sas. Le plan doit pouvoir être revu avant l'art final. Nous ne reprenons ni la carte de Hallownest, ni ses silhouettes de salles, ni ses illustrations.

### 3. Metroid Dread — rapport officiel Nintendo et équipe de développement

[Rapports Metroid Dread, vol. 3, section « L'exploration », 15 juillet 2021](https://www.nintendo.com/fr-fr/News/2021/Juillet/Rapports-Metroid-Dread-Vol-3-7-points-qui-definissent-la-saga-en-2D-2007780.html).

**Ce que la source établit :** l'exploration et les nouveaux chemins sont centraux ; la carte distingue les terrains, permet de retrouver des catégories d'icônes et accueille des marqueurs. L'équipe décrit explicitement la carte comme un outil important pour rendre l'exploration fluide.

**Transposition proposée, donc inférence :** le hub peut afficher le nom de la salle actuelle et une orientation stable vers les services. Une porte verrouillée doit annoncer sa destination et sa condition, et une porte ouverte doit avoir le même sens sur le plan et dans la scène. Une carte complète n'est pas indispensable si les repères du petit hub suffisent.

Ces références servent à raisonner sur la construction du niveau. Aucune image, texture, carte ou sprite de ces jeux ne doit être importé dans les assets du projet. Les règles chiffrées ci-dessous sont des propositions pour ce projet, pas des prescriptions attribuées aux studios.

## Plan de qualité proposé pour le hub

| Sujet | Exigence concrète | Vérification attendue |
| --- | --- | --- |
| Salles identifiables | Chaque salle possède une fonction, une silhouette d'espace et un objet repère propres : armes, trophées, navigation, sas. Un titre seul ne suffit pas. | Identifier la fonction depuis une capture sans lire le texte de station. |
| Seuils | Les portes relient deux volumes par un passage réel. Le dormant, le linteau, le sol et l'ouverture appartiennent à des couches séparées. | Traverser de gauche à droite puis revenir ; vérifier qu'aucune image de porte ne masque un mur invisible. |
| Couloirs | Un couloir possède une destination et une transition de volume. Il ne sert pas seulement à éloigner des boutons sur une longue plateforme uniforme. | Voir la direction de la prochaine salle, avec un repère ou un embranchement lisible avant de s'y engager. |
| Boucle | Prévoir une boucle entre la préparation et le retour au sas, avec un deuxième chemin visiblement distinct si la géométrie le permet. | Parcourir le cycle dans les deux sens sans devoir sauter hors caméra ni réinitialiser la position. |
| Repères | Conserver l'emplacement et la silhouette des gros équipements. Varier lumière, plafond et accessoires par salle sans perdre la cohérence du vaisseau. | Revenir d'une station et reconnaître immédiatement sa position. |
| Caméra | Borner la caméra par volume praticable ; garder une avance modérée dans le sens de déplacement et montrer le point d'arrivée d'une montée. | Tester entrée, retour, sommet et pied des passages verticaux ; aucun vide extérieur au niveau visible. |
| Plans de profondeur | Distinguer fond, architecture, objets derrière le joueur, joueur, montants d'avant-plan et interfaces. La parallaxe reste décorative. | Les pieds restent lisibles ; aucun premier plan ne masque une porte, un accès vertical ou le signal d'interaction. |
| Continuité | Une station suspend la simulation sans recréer le niveau ; fermer, annuler ou revenir restitue la position et le contrôle. | Ouvrir chaque station au clavier, à la manette et au tactile, puis repartir dans les deux directions. |

Graphe de discussion, sans obligation de reproduire cette disposition : un espace de préparation relie armurerie, galerie et navigation ; un couloir distinct mène au sas ; un passage de service peut fermer une boucle vers la préparation. Le sas est une vraie destination spatiale. Les stations indispensables doivent rester accessibles sans compétence de chasse ni achat préalable.

### Contrat de géométrie à revoir avec les propriétaires du renderer et de la physique

- Grille d'assemblage proposée : 20 unités de monde. Les dimensions finales doivent utiliser le collider réel du chasseur fourni par le moteur de mouvement, pas le rectangle transparent de son sprite.
- Un socket de porte nomme sa salle, son voisin, son plan de sol, son sens et son ouverture libre. Les deux côtés doivent partager la même coordonnée de seuil ; une différence de hauteur exige une transition explicitement jouable.
- Chaque ouverture doit dépasser la largeur et la hauteur du collider avec une marge. Proposition initiale : au moins 20 unités libres de chaque côté et 20 au-dessus, à valider par simulation.
- Les obstacles solides, plateformes traversables et accès verticaux restent des données physiques indépendantes. Ne pas convertir automatiquement l'alpha d'un meuble en collision.
- Aucun sol ne doit exister uniquement dans le dessin d'un panneau de fond. Une porte fermée doit correspondre à un obstacle physique ; ouverte, elle doit laisser exactement son passage annoncé.
- Une interaction se situe du côté accessible de la station, hors du dormant. Une seule station gagne à proximité ; aucune interaction à travers une cloison ou depuis l'autre étage.
- Les limites de caméra ne constituent pas les limites de collision. Toutes les salles, connecteurs et entrées doivent rester dans les bornes physiques du niveau.

### Ordre des plans proposé

1. Fond sombre et lumière distante : aucune collision, mouvement de parallaxe faible ou nul.
2. Paroi et structure arrière : modules de mur, joints couverts, plafond ; aucune porte peinte utilisée comme ouverture réelle.
3. Objets de salle derrière le joueur : casier, établi, trophées et écrans ; silhouette complète, éclairage cohérent, sans boutons intégrés au bitmap.
4. Sols, plateformes et accès : art aligné aux surfaces jouables définies par la physique.
5. Joueur et interactions de proximité.
6. Montants ou câbles d'avant-plan : fragments limités, jamais une grande plaque opaque devant un seuil.
7. Interfaces de station et fenêtres modales : espace écran, focus et suspension explicites.

## Inventaire des bitmaps existants

Mesures effectuées sur les vrais fichiers avec Sharp : taille encodée, présence d'alpha et boîte englobante des pixels d'alpha supérieur à 8. Les noms viennent des registres du projet. L'ouverture visuelle locale avec `view_image` a échoué à cause du helper ACL Windows ; **cet inventaire certifie l'existence et la géométrie technique, pas l'accord esthétique dans le nouveau décor**. Aucun fichier n'a été recadré ou réencodé.

### Armes V3 : vrais fichiers indépendants, utiles pour de petits supports

Racine URL : `/game/assets/v3/actors/yautja/hunter/weapons/`. Métadonnées : `public/game/assets/v3/manifest.json`, objet `hunter.weapons`.

| Fichier | Taille / ratio largeur-hauteur | Pivot existant, pixels locaux | Boîte alpha locale x,y,l,h | Usage proposé |
| --- | --- | --- | --- | --- |
| `combistick.webp` | 213 × 27 / 7,889 | 175,13 | 4,4,205,19 | Arme horizontale sur un râtelier. |
| `combistick-folded.webp` | 82 × 36 / 2,278 | 45,18 | 4,4,74,28 | Petit objet sur un établi ou support. |
| `smart-disc.webp` | 43 × 84 / 0,512 | 23,42 | 4,4,35,76 | Disque vu de profil, à garder petit. |
| `yautja-bow.webp` | 66 × 162 / 0,407 | 38,80 | 4,4,58,154 | Arc sur un support vertical. |
| `arrow.webp` | 133 × 28 / 4,750 | 101,14 | 4,4,125,20 | Flèche sur un support horizontal. |

Les cinq fichiers pèsent ensemble 26 578 octets. Les pivots ci-dessus sont des pivots d'attache au personnage, pas des points de pose au sol. Pour un support mural fixe, employer par exemple le centre de la boîte alpha comme pivot de présentation, en le déclarant dans les données de placement. Préserver le ratio et éviter un agrandissement important de ces petites images.

**Ne pas prendre les variantes `weapons/registered/*.webp` comme équivalents :** elles sont enregistrées sur le canevas 256 × 384 du rig. `sourceSize` décrit ce canevas, alors que les fichiers indépendants possèdent les dimensions mesurées ci-dessus. Confondre ces deux espaces produit des offsets et une taille erronés.

Deux pièces V3 existent aussi sous `/game/assets/v3/actors/yautja/hunter/equipment/` : `cannon.webp`, 61 × 36, pivot 8,18 ; `gauntlet-base.webp`, 48 × 38, pivot 24,18. Ce sont des pièces de rig, pas un meuble ni une console complète. Elles peuvent décorer un banc de maintenance à petite échelle, sous réserve de validation visuelle.

### Atlas V6 : objets isolés par rectangles, pas des fichiers individuels

Fichier réel : `public/game/sprites/v6/equipment-atlas.png`, URL `/game/sprites/v6/equipment-atlas.png`, 1448 × 1086, alpha présent, 1 011 246 octets. Contrat de découpe existant : `app/game/v6Visuals.ts`, `V6_VISUAL_CELLS`. Il contient douze accessoires d'armurerie ; ce n'est pas un atlas de sols, portes, casiers et établis.

| ID du registre | Crop atlas x,y,l,h | Ratio du crop | Boîte alpha relative au crop x,y,l,h | Pivot de pose proposé, relatif au crop |
| --- | --- | --- | --- | --- |
| `equipment-audio-decoy` | 20,0,310,346 | 0,896 | 29,88,241,210 | 149,5 ; 298 |
| `weapon-combistick` | 330,0,410,346 | 1,185 | 26,43,367,281 | 209,5 ; 324 |
| `weapon-smart-disc` | 740,0,315,346 | 0,910 | 16,82,256,205 | 144 ; 287 |
| `gear-netgun` | 1055,0,393,346 | 1,136 | 19,94,345,206 | 191,5 ; 300 |
| `equipment-wrist-computer` | 20,690,345,396 | 0,871 | 24,17,271,285 | 159,5 ; 302 |
| `equipment-plasma-caster` | 365,690,380,396 | 0,960 | 30,23,291,280 | 175,5 ; 303 |
| `gear-proximity-mine` | 1075,690,373,396 | 0,942 | 45,122,252,168 | 171 ; 290 |

Les pivots de la dernière colonne sont des **propositions dérivées des boîtes alpha**, pas des données déjà inscrites au registre. Ils utilisent le centre horizontal et le bas visible. Pour Canvas : conserver le rectangle source du registre et appliquer une échelle uniforme. Pour un objet accroché au mur, préférer le centre visible. Ne pas afficher l'atlas entier comme un décor et ne pas rebaptiser un ordinateur de poignet en console de navigation.

### V19 : quelques objets techniques existent, mais leur biome reste visible

Racine URL : `/game/assets/v19/biome-decor/`. Ces trois fichiers ont été vérifiés individuellement ; ils ne remplacent pas la nouvelle direction artistique intérieure.

| Fichier relatif | Taille / ratio | Boîte alpha x,y,l,h | Pivot de pose proposé | Limite |
| --- | --- | --- | --- | --- |
| `ruins/clm/clm-service-ladder-01-straight.webp` | 182 × 768 / 0,237 | 24,24,134,720 | 91,744 | Échelle de ruines ; candidat pour service arrière, pas collision automatique. |
| `ruins/plt/plt-sentinel-gantry-01-low-wide.webp` | 768 × 207 / 3,710 | 24,24,720,159 | 384,183 | Passerelle de sentinelles ; décoration ou support à ajuster explicitement à la surface jouable. |
| `ice/orn/orn-emergency-beacon-01-single.webp` | 514 × 768 / 0,669 | 24,24,466,720 | 257,744 | Balise d'urgence de biome glace ; acceptable seulement si son traitement visuel convient. |

Piège d'inventaire constaté : les noms `volcano/orn/orn-stolen-clan-beacon-01-single.webp`, `swamp/orn/orn-flooded-survey-beacon-01-single.webp`, `desert/orn/orn-buried-mining-beacon-01-single.webp` et `ruins/cov/cov-prism-console-plinth-01-narrow.webp` figurent dans les données lues mais leurs fichiers sont absents. Ils sont donc **exclus** de la proposition. Toujours vérifier le fichier réel et la politique de disponibilité, sans déduire sa présence du seul nom d'une entrée.

### Trophées V15 et paroi V20

- `public/game/assets/v15/trophies/trophy-ruins-ancient-guardian.webp` : 1254 × 1254, alpha présent ; boîte visible 267,33,705,1165. Objet indépendant utilisable dans la galerie selon `trophyVisualRegistry.ts`, les droits du joueur et le contrat `trophy-wall`. Ne pas afficher comme acquis un trophée non débloqué, ni substituer une récompense voisine. Les autres trophées suivent leur propre entrée du manifest.
- `public/game/ship-interior/v20/corridor-wall.webp` : paroi de fond existante 1536 × 1024. Son contrat V20 prévoit une répétition avec joints couverts, pas une continuité de texture prouvée. Elle ne contient aucune géométrie de sol ou de porte exploitable comme collision.
- `public/game/backgrounds/armory-war-room-v6.png` et `ship-hub-v4.webp` sont des illustrations de salle complètes. Elles peuvent guider l'ambiance ; elles ne constituent pas des meubles autonomes et ne doivent pas être découpées au hasard pour fabriquer le kit.

## Sélection conseillée et portes de validation

**À intégrer d'abord, si le rendu les confirme :** armes V3 sur les supports des nouvelles salles ; quelques appareils V6 dans leurs crops certifiés ; trophées exacts déjà gagnés. **À garder comme options :** échelle/passerelle V19 et balise, car leur matière et leur perspective doivent être confrontées aux nouveaux bitmaps. **Toujours nécessaires séparément :** structure de salle, sol, vraie porte et gros mobilier propres au kit intérieur ; aucun inventaire ci-dessus ne prouve qu'ils existent déjà.

La validation V21 doit joindre : un graphe de connexions et sockets ; une capture par salle à l'échelle de jeu ; le parcours complet de chaque porte et accès vertical dans les deux sens ; un essai de retour de chaque station ; une vérification des limites caméra/collision ; un contrôle des pieds, silhouettes et signaux d'interaction devant les objets de premier plan. L'inspection visuelle et les essais de jeu restent à effectuer dans l'environnement qui peut réellement les exécuter.
