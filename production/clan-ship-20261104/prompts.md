# ShipHub — briefs de conception

Ce dossier conserve les trois briefs et le lot d'art réellement produit pour l'intérieur du Clan Ship. **Sept fonds individuels ont été générés avec l'outil image_gen intégré**, puis exportés en WebP 1440 × 800. Le hangar établit la direction commune ; les six autres pièces reprennent son cadrage, son sol et ses matériaux.

Les prompts exacts de chaque génération sont conservés dans [`art-source/clan-ship-v1/generation.json`](../../art-source/clan-ship-v1/generation.json). Le [manifeste runtime](../../public/game/clan-ship/manifest.json) contient dimensions, poids et empreintes des fichiers. Les contrats du château et de l'arrivée sont détaillés dans [castle-spec.md](castle-spec.md) et [arrival-spec.md](arrival-spec.md) ; les références consultées figurent dans [references.md](references.md).

Le [contrat de l’intérieur physique](interior-spec.md) décrit la circulation et la reprise. Les [32 fiches d’assets individuels](individual-asset-prompts.md) préparent la production du château et de l’arrivée. Les **huit props dédiés du Clan Ship** sont suivis dans `production-state.json.individualProps` ; leurs prompts exécutés sont conservés dans [`art-source/clan-ship-props-v1/generation.json`](../../art-source/clan-ship-props-v1/generation.json).

## 1. Clan Ship AVP — vaisseau mère et amarrage personnel

### Lot produit : sept arrière-plans

| Pièce | Direction propre | Fichier runtime |
|---|---|---|
| Hangar | Baie spatiale profonde, nervures monumentales et balises turquoise | `public/game/clan-ship/interiors/hangar-v1.webp` |
| Conseil | Alcôves hautes, relief orbital, bronze et or retenu | `public/game/clan-ship/interiors/conseil-v1.webp` |
| Armurerie | Parois forgées, réserves encastrées et lueurs ambre | `public/game/clan-ship/interiors/armurerie-v1.webp` |
| Trophées | Galerie rituelle, niches hautes et éclairage chaud | `public/game/clan-ship/interiors/trophees-v1.webp` |
| Soins | Chambres vitrées, lignes cliniques et lumière vert pâle | `public/game/clan-ship/interiors/soins-v1.webp` |
| Archives | Niches de mémoire, données turquoise et relief annulaire | `public/game/clan-ship/interiors/archives-v1.webp` |
| Entraînement | Grand volume martial, nervures sombres et lueurs de braise | `public/game/clan-ship/interiors/entrainement-v1.webp` |

Chaque image est une plaque de fond opaque, sans chasseur, vaisseau personnel, porte active ni installation sur la bande de marche. Les portes, équipements et rig du personnage sont composés séparément par le jeu. Le fichier source individuel mesure 1672 × 941 ; `scripts/build-clan-ship-art.mjs` produit la version de jeu en sRGB, qualité WebP 90. Les sept versions runtime totalisent 1 661 452 octets. Le contrôle de chargement et la revue en scène sont consignés dans le suivi de production.

### Lot produit : huit installations indépendantes

| Salle | Prop individuel | Fichier runtime | Dimensions px |
|---|---|---|---:|
| Hangar | Console d’amarrage | `berth-console-v1.webp` | 1 024 × 614 |
| Conseil | Table du conseil | `council-table-v1.webp` | 1 024 × 614 |
| Armurerie | Râtelier | `armory-rack-v1.webp` | 1 024 × 614 |
| Armurerie | Forge | `armory-forge-v1.webp` | 683 × 1 024 |
| Trophées | Établi rituel | `trophy-workbench-v1.webp` | 1 024 × 603 |
| Soins | Lit médical | `medical-bed-v1.webp` | 1 024 × 538 |
| Archives | Terminal | `archive-terminal-v1.webp` | 533 × 1 024 |
| Entraînement | Poste d’entraînement | `training-station-v1.webp` | 683 × 1 024 |

Ces fichiers sont dans `public/game/clan-ship/props/`. Le lot runtime mesure **1 368 700 octets**. Chaque prop possède une transparence mesurée, des pixels visibles, une marge vide sur le bord et un pivot calculé depuis ses pixels visibles. Le manifeste conserve ces mesures et les SHA-256 des sources et exports. Les installations sont reliées à leurs propres fixtures dans `ClanShipInterior.tsx` ; leur collision et leur point d’usage restent définis dans `clanShipInterior.ts`. Les contrôles techniques ne constituent pas une approbation artistique humaine.

### Intention et limites de référence

Concevoir un immense vaisseau de clan Yautja qui reçoit le vaisseau personnel du joueur. La différence d'échelle doit être immédiatement lisible : le vaisseau personnel est un véhicule autonome, reconnaissable avant l'approche, pendant l'amarrage et au retour. Le Clan Ship est une destination collective, dotée d'un hangar et d'espaces de clan. Il ne remplace jamais la coque possédée par le joueur dans la sauvegarde ou dans l'interface de sélection.

Le brief utilisateur demande une inspiration AVP. Le catalogue du projet comporte `avp-predator-mothership` et des images v14, utilisables comme points de départ à examiner. Leur présence dans le dépôt ne prouve pas que leur géométrie est une reproduction fidèle du film. Avant une production visant la fidélité, constituer une planche de références autorisées, avec source, vue et échelle ; signaler les surfaces non documentées. Les salles jouables et les installations décrites ci-dessous sont des adaptations de gameplay, sauf preuve visuelle distincte.

### Prompt concept extérieur

« Concept de production pour Yautja The Long Hunt : immense vaisseau mère de clan Yautja, inspiration visuelle AVP à confronter aux références fournies. Montrer le vaisseau mère dans l'espace avec un vaisseau personnel nettement plus petit, complet et séparé, suivant un corridor d'approche vers une baie identifiable. Composer une vue trois quarts lisible, silhouette d'ensemble prioritaire, espace négatif autour des deux appareils. Coque sombre, matériaux vieillis, nervures structurelles et signalisation lumineuse parcimonieuse. Faire lire la taille par plusieurs niveaux de structures, de minuscules balises et un volume de hangar capable de recevoir plusieurs appareils. Le véhicule personnel ne doit pas devenir une tourelle, une aile ou un fragment fusionné au vaisseau mère. Montrer la voie d'entrée, la limite de baie, les points d'ancrage et une sortie praticable. Garder une lumière de contour qui distingue les volumes noirs sans surexposer l'espace. Aucun texte décoratif illisible, aucune interface, aucun logo, aucune indication de mesures inventées. Fournir une proposition cohérente de zones non documentées et les identifier dans la fiche de production comme extrapolations. »

### Prompt hangar et parcours

« Concept de hangar de clan pour jeu en vue latérale : grand volume collectif, passerelles à plusieurs hauteurs, structures profondes, baie spatiale et vaisseau personnel stationné au premier plan. Le chemin jouable traverse une passerelle de débarquement, un sas puis un axe de circulation. Préserver une bande de marche nette, des portes identifiables et des repères de navigation compréhensibles sans texte. Établir une continuité visuelle entre le vaisseau personnel visible dans le hangar et l'accès de retour. Différencier trois plans : décor arrière non collisionnable, architecture jouable au plan médian, éléments de premier plan parcimonieux qui ne cachent ni portes ni personnage. Proposer des modules séparables : paroi de baie, sol, bord de sol, nervure, porte, battant, console, ancrage, passerelle et balise. Les raccords doivent pouvoir se répéter sans ligne de couture évidente. Les variantes de lumière communiquent l'approche, l'amarrage établi et l'accès autorisé. Les détails visuels ne doivent pas ajouter d'interactions de gameplay non prévues. »

### Pièces, services et cohérence de production

Le parcours courant comporte les identifiants `hangar`, `conseil`, `armurerie`, `trophees`, `soins`, `archives`, `entrainement`. Chaque pièce doit se distinguer par sa fonction, sa lumière et une silhouette centrale ; aucune ne doit dépendre d'une inscription miniature pour être reconnue. Le conseil accueille la présence du clan et les briefs ; l'armurerie montre des racks et un poste de préparation ; les trophées montrent une collection et son socle ; les soins mettent en scène une installation médicale ; les archives présentent un terminal ; l'entraînement prévoit un espace libre. Les effets réels de chaque service sont des décisions de design et doivent être reliés aux systèmes existants avant de les annoncer comme jouables.

Les assets du kit intérieur déjà présents — console de navigation, portes, parois, racks, terminal, lit médical, passerelle — sont des candidats de réemploi. Vérifier les pivots, les masques, les proportions, la palette et les collisions avant intégration. Préparer les nouvelles images comme pièces individuelles avec nom, rôle, plan de profondeur, transparence requise, taille cible, point d'ancrage et référence. Ne pas livrer seulement une grande peinture indécoupable.

### Critères d'acceptation

Le joueur identifie son vaisseau personnel à chaque étape. L'approche peut être annulée ; l'entrée exige l'amarrage ; le départ exige le retour dans le vaisseau personnel. Un changement de salle n'accorde pas de ressource. Une pression sur une touche ou un bouton n'effectue qu'une seule transition. Une recharge, un changement d'emplacement de campagne et un export/import ne changent ni la coque personnelle ni le propriétaire de l'état. Les concepts doivent rester compatibles avec ces contraintes, mais leur qualité visuelle ne remplace pas la recette navigateur.

## 2. Château orbital — chantier séparé

### Périmètre

Le château orbital du Predator King dans le Wolf System est conservé comme destination demandée. Le contrat proposé décrit une audience de campagne, neuf lieux reliés et vingt modules individuels. Les références officielles de la série sont identifiées dans `references.md` ; la géométrie précise reste à confronter aux planches choisies. La forteresse possède sa propre identité et son propre parcours.

### Prompt concept

« Concevoir une forteresse orbitale monumentale de souverain Yautja pour Yautja The Long Hunt, à partir des planches de référence vérifiées qui seront fournies. Construire d'abord une lecture de palais fortifié dans l'espace : cœur central, masses secondaires, zones d'accostage, parcours cérémoniel et salle d'audience. L'architecture exprime autorité et ancienneté par l'échelle, les alignements et les matériaux, sans couvrir toutes les surfaces de motifs. Maintenir une silhouette distincte de celle du vaisseau mère AVP. Une vue extérieure principale indique le rapport entre forteresse, planète et accès ; une vue intérieure secondaire étudie le seuil et le chemin jusqu'au siège de pouvoir. Les éléments non documentés sont des propositions originales signalées comme telles. Préserver des modules exploitables en jeu : fond orbital, coque ou murailles, baie, seuil, piliers, sol, porte monumentale, estrade et siège. Lumière maîtrisée, contrastes lisibles et profondeur suffisante pour une adaptation en vue latérale. Sans texte de lore inventé, sans prétention à reproduire une planche non fournie et sans remplacer l'objectif Clan Ship. »

### Dépendances de réalisation

`castle-spec.md` fixe le premier périmètre proposé : invitation de campagne, baie, sas, chemin d'audience, conseil et retour court. Il détaille les métriques, les pivots, les collisions, les événements, la reprise et la recette à exécuter. Les images `royal-predator-ship` du dépôt restent des véhicules de catalogue ; elles ne remplacent pas l'asset extérieur de la forteresse.

## 3. Arrivée planétaire — référence Predator (1987), jusqu'à 1:02

### Périmètre et rythme

La demande associe la séquence d'ouverture de Predator (1987) à une arrivée jouable : nom de planète à la place du titre du film, vaisseau qui libère une capsule, descente, impact ou atterrissage en vue latérale, puis sortie du chasseur. La limite de 1:02 est un cadrage du brief. Le découpage qui suit est une proposition de montage de 62 secondes ; il ne prétend pas reproduire les plans ni les timecodes du film. Une analyse du support exact reste nécessaire avant de revendiquer une correspondance.

### Prompt de storyboard

« Storyboard de conception en huit vignettes pour une arrivée planétaire Yautja. Séparer clairement les plans : espace et planète, apparition du nom de la destination, silhouette du vaisseau de transport, libération d'une capsule autonome, début de descente, entrée atmosphérique, arrivée au sol en vue latérale, ouverture de la capsule et sortie du chasseur. Le vaisseau et la capsule conservent des silhouettes cohérentes d'un plan à l'autre. La capsule est un véhicule de descente distinct, sans confusion avec le Clan Ship ni substitution silencieuse du vaisseau personnel sauvegardé. Construire une progression de distance et de vitesse qui reste lisible. Dans le dernier plan, préparer le cadrage du jeu : sol horizontal, personnage à une échelle lisible, zone de sortie libre et décor jouable identifiable. Prévoir une version sans titre intégré dans l'image pour que le nom de planète soit rendu par l'interface. Aucun logo de film, aucune typographie copiée comme texture, aucun faux timecode de référence. Les effets de poussière, chaleur et débris sont des calques séparés. »

### Découpage proposé

| Temps proposé | Plan | Dépendance principale |
|---|---|---|
| 0–7 s | Planète et espace | Fond spatial et planète cible |
| 7–13 s | Nom de planète | Texte localisé, contraste, durée de lecture |
| 13–23 s | Passage du vaisseau | Silhouette confirmée et trajectoire |
| 23–31 s | Largage de capsule | Asset capsule et séparation lisible |
| 31–41 s | Descente | Mouvement caméra et transition d'échelle |
| 41–49 s | Entrée atmosphérique | Effets séparés et solution mouvements réduits |
| 49–57 s | Arrivée en vue latérale | Sol, capsule, poussière, caméra de gameplay |
| 57–62 s | Ouverture et sortie | Animation chasseur, état de départ du niveau |

Ces durées sont éditables et leur somme est calculée dans le classeur. `arrival-spec.md` détaille l'horloge active, la pause, le saut, la reprise par plan et le relais unique vers la chasse après confirmation durable. Douze assets ou réemplois sont spécifiés avec leurs ancres et leur plan de rendu. Les fallbacks d'assets, les réglages de mouvement et le propriétaire des entrées sont définis avant le prototype.

## Règle commune de livraison

Pour chaque futur asset : conserver le fichier individuel, sa source de référence, sa fonction, son état d'intégration et la décision humaine de validation artistique. « Présent dans le dépôt », « généré », « intégré », « testé » et « approuvé » sont des étapes différentes. Les trois briefs peuvent partager une palette générale, mais ils conservent des objectifs, des fichiers, des routes et des critères de recette distincts.
