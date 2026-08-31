# Kit modulaire : intérieur du vaisseau Yautja

Ce contrat concerne le jeu web **Yautja : La Longue Chasse** et sa coupe latérale jouable. Il ne concerne pas le projet Unreal SNL. Les pièces sont une interprétation originale destinée au jeu, pas une reconstitution officielle d'un intérieur unique de la franchise.

## Point de départ vérifié dans le code

`app/game/PhysicalShipDeck.tsx` utilisait un espace de 1 000 × 520 unités, un sol à `y=440`, une passerelle à `y=300` et deux échelles. Le sol et la passerelle étaient déjà indépendants du fond : ce découpage doit être conservé même si le pont s'élargit. Ces valeurs décrivent le point de départ de cette passe, pas une contrainte sur la largeur finale.

Le fond présent dans ce composant est `public/game/backgrounds/armory-war-room-v6.png`. `ShipHub.tsx` utilise `public/game/backgrounds/ship-hub-v4.webp`, dont le master disponible est `art-source/v4/environments/openai-yautja-ship-hub.png`. Ce sont les deux références locales pertinentes à consulter pour le métal, les nervures, les lumières et la palette. Leur usage antérieur ne les qualifie pas comme textures raccordables : une salle avec perspective ne doit pas être étirée pour devenir un couloir.

La recherche des fichiers existants n'a pas trouvé de bitmap autonome de sol, porte ou échelle d'intérieur. Les nombreux vaisseaux extérieurs, décors de biomes et trophées ne remplacent pas ces éléments. Réutiliser la géométrie du sol, de la passerelle et des échelles est donc possible immédiatement ; découper arbitrairement un sol ou une porte depuis une illustration de salle ne fournit pas un asset modulaire fiable.

## Premier composant bitmap

Chemin consommateur : `/game/ship-interior/v20/corridor-wall.webp`.

| Propriété | Contrat |
| --- | --- |
| Sujet | Une travée de cloison métallique intérieure, vue strictement de face |
| Source et export vérifiés | 1 536 × 1 024 pixels, ratio 3:2 conservé |
| Taille nominale dans le monde | 480 × 320 unités |
| Pivot | Bas gauche : `(0, 320)` dans la pièce |
| Répétition | Horizontale uniquement, à taille constante |
| Jonction | Montant séparé de 20 unités centré sur chaque raccord |
| Collision | Aucune ; fond entièrement derrière le joueur |
| Contenu exclu | Sol jouable, porte fonctionnelle, personnage, arme, trophée, texte, UI, logo |
| États | Normal, alerte, hors tension via calques lumineux indépendants |

Une cloison autonome doit garder un rythme vertical sobre, des panneaux suffisamment neutres pour recevoir consoles et trophées, et des bords de valeurs proches. Pas de point de fuite, de cadrage panoramique d'une salle entière ni de grand objet central qui rende la répétition évidente. Les consoles, objets et portes seront placés ensuite.

Le premier mur a été généré avec l'outil intégré OpenAI `image_gen`. Le master est conservé dans `art-source/v20/ship-interior/corridor-wall.png` ; l'export WebP est présent au chemin consommateur ci-dessus. La référence effectivement envoyée était une miniature en conversation de `armory-war-room-v6.png` : la tentative d'envoi par chemin local complet avait échoué sur une erreur ACL. Le modèle exact n'a pas été retourné par l'outil et n'est donc pas inventé.

Le master a été inspecté visuellement par l'agent coordinateur : paroi frontale en métal sombre et bronze, deux lampes ambre, sans texte ni élément jouable intégré. La conversion Sharp en WebP (qualité 95, effort 6) conserve la définition et le ratio, sans découpe ni modification de composition. Dimensions, formats, tailles et empreintes SHA-256 sont consignés dans `art-source/v20/ship-interior/corridor-wall.provenance.json`.

Le fichier est généré et ses propriétés techniques ont été contrôlées. Son raccord en répétition et son intégration jouable nécessitent encore le contrôle dans le jeu. La stratégie retenue masque les joints par une structure visible ; elle ne promet pas une texture mathématiquement « seamless ».

## Repères, sockets et composition

Le manifeste `app/game/shipInteriorKit.ts` fournit `SHIP_INTERIOR_KIT`. Les consommateurs utilisent notamment `.wall.src`, `.wall.width`, `.wall.height`, `.wall.pivot` et `.grid`. Le manifeste ne fixe ni largeur du monde, ni coordonnées de stations, ni positions de caméra.

Les nouvelles pièces utilisent une grille de **20 unités** et des coordonnées locales avec `x` vers la droite et `y` vers le bas. Les anciennes positions de gameplay peuvent rester telles quelles pendant la migration. Les dimensions visuelles ne doivent pas imposer un déplacement silencieux des collisions.

| Pièce | Pivot | Sockets nommés | Traitement |
| --- | --- | --- | --- |
| Cloison 480 × 320 | Bas gauche | `left`, `right`, `ceiling`, `floor`, `fixture` | Fond, joints recouverts, aucun obstacle |
| Sol 240 × 26 | Haut gauche | `left`, `right`, `fixture` | Géométrie indépendante, contact sur l'arête supérieure |
| Passerelle 240 × 18 | Haut gauche | `left`, `right`, `ladder` | Surface supérieure traversable depuis dessous |
| Porte 120 × 160 | Bas centre | `threshold`, `control` | Cadre, panneau, commande et collision distincts |

Par exemple, le mur du pont actuel, posé sur la ligne `y=480`, commence à `y=160`. Pour une autre hauteur, appliquer une échelle uniforme à toute la pièce et ses sockets ; ne pas étirer indépendamment la largeur pour remplir le pont. Positionner les murs successifs avec un pas égal à la largeur rendue, puis centrer les montants sur leurs joints. Un fond sombre ou une corniche indépendante peut compléter le volume au-dessus.

Ordre de dessin : espace lointain → cloisons → équipements muraux → surfaces et éléments interactifs → joueur → bordures proches et cadres → indications d'interaction. Le cadre avant d'une porte ne masque que ses montants et son linteau ; il ne doit pas recouvrir arbitrairement toute son ouverture.

## Sols, portes et états

Le bitmap de cloison ne décide jamais où le joueur marche. Les surfaces de sol et de passerelle restent des données de gameplay, avec un rendu dérivé des mêmes coordonnées. La grille facilite l'ajout de travées sans donner un rôle physique à une fissure peinte.

La porte est pour l'instant un contrat de pièce, pas un système annoncé comme terminé. Ses états réservés sont `closed`, `opening`, `open`, `closing`, `locked`. Une future implémentation doit synchroniser la collision avec l'ouverture réelle et garder sa commande accessible. Les états de lumière `normal`, `alert`, `unpowered` ne créent pas de nouveaux fichiers bitmap et ne modifient pas les collisions.

Une console utilise un socket `fixture`, mais conserve son propre identifiant de station, son interaction clavier/manette/tactile et son libellé accessible. Les interactions existantes ne doivent pas disparaître lors du remplacement artistique.

## Vérification avant déclaration de livraison

- Conserver le master généré, le prompt et la provenance, puis vérifier le chemin exporté et ses dimensions réelles.
- Afficher au moins trois cloisons côte à côte avec leurs montants ; vérifier raccords, rythme répétitif, perspective et cohérence des lumières.
- Vérifier les plateformes et les pieds du joueur à leur vraie échelle, les huit stations, les deux niveaux et les accès par échelle.
- Vérifier que la caméra suit le joueur si le monde dépasse le viewport, sans étirer le mur pour remplir l'écran.
- Vérifier que les calques de premier plan ne cachent pas le joueur ni l'indication d'interaction ; contrôler aussi le mode contraste élevé.
- Distinguer explicitement le premier mur bitmap intégré, la géométrie réutilisée et les futurs modules encore à produire.
