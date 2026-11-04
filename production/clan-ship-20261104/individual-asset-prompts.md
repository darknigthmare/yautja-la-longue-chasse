# Assets individuels — prompts de production

Ces **32 fiches** décrivent 20 assets du château et 12 assets ou réemplois pour l’arrivée. Elles sont au stade spécifié dans le dossier de conception conservé par la PR #104 ; ces états ne décrivent pas les travaux des worktrees parallèles. Les deux réemplois (transport et chasseur) conservent les ressources de la campagne ; les 30 autres fiches sont des demandes de génération individuelles. Les dimensions sont des cibles, à remplacer par les mesures des fichiers produits.

Une exécution correspond à un seul asset ou à une seule pose. Conserver une source PNG séparée, demander un vrai fond transparent lorsqu’il est indiqué et ne pas assembler les éléments en planche. Les prompts ne déclarent aucune fidélité canonique sans comparaison aux références primaires.

Pour le Clan Ship, les prompts réellement exécutés restent dans `art-source/clan-ship-v1/generation.json` et `art-source/clan-ship-props-v1/generation.json`. Les fonds et props effectifs sont suivis séparément des demandes futures ci-dessous.

## Château orbital

### castle-space

**Fond spatial.** Génération individuelle. Cible : 2048 × 1024 px. Fond opaque. Pivot normalisé : 0.5, 0.5. Plan : arriere-lointain. Collision : aucune.

**Prompt / instruction :** Créer uniquement un champ spatial profond, étoiles fines à densité modérée, grandes zones sombres lisibles derrière une forteresse et une planète ajoutées ensuite. Aucun horizon terrestre ni amas lumineux central. La lumière dominante vient du haut gauche et reste discrète. Image opaque sans objet au premier plan.

**Contrôle avant intégration :** Un asset individuel complet ; Fond opaque sans objet interactif fusionné ; Pivot et dimensions mesurés avant intégration ; Référence et extrapolation distinguées.

### castle-planet

**Planète séparée.** Génération individuelle. Cible : 1024 × 1024 px. Fond transparent. Pivot normalisé : 0.5, 0.5. Plan : arriere-lointain. Collision : aucune.

**Prompt / instruction :** Créer un disque planétaire unique vu depuis l’orbite, sphère entière avec terminateur cohérent éclairé du haut gauche. Garder un bord net compatible avec une atmosphère séparée. Surface de planète proposée pour le décor du Wolf System du brief, sans continent nommé ni revendication de cartographie canonique. Isoler la planète, sans étoiles, lune, forteresse ni texte.

**Contrôle avant intégration :** Un asset individuel complet ; Alpha réel, aucun fond ou damier peint ; Pivot et dimensions mesurés avant intégration ; Référence et extrapolation distinguées.

### castle-exterior

**Forteresse complète.** Génération individuelle. Cible : 2048 × 1536 px. Fond transparent. Pivot normalisé : 0.5, 0.5. Plan : orbite. Collision : aucune.

**Prompt / instruction :** Créer une forteresse orbitale Yautja entière en trois quarts, cœur central massif, contreforts hiérarchisés, baies d’accueil encastrées et axe cérémoniel lisible. Faire lire un palais fortifié autonome. Coque minérale sombre et métal patiné, nervures épaisses, accents bronze retenus. Préserver le volume complet, les extrémités et une marge autour de la silhouette. Isoler la forteresse ; la planète, les étoiles, les véhicules et les VFX seront des calques distincts. Confronter la silhouette aux planches primaires choisies avant de viser une reproduction précise.

**Contrôle avant intégration :** Un asset individuel complet ; Alpha réel, aucun fond ou damier peint ; Pivot et dimensions mesurés avant intégration ; Référence et extrapolation distinguées.

### castle-berth-wall

**Paroi de baie.** Génération individuelle. Cible : 1536 × 1024 px. Fond opaque. Pivot normalisé : 0.5, 1. Plan : arriere. Collision : aucune.

**Prompt / instruction :** Créer la paroi arrière monumentale de la baie d’accueil royale pour une scène latérale à faible profondeur. Grande ouverture de hangar lisible dans le tiers haut, supports structurels et logements d’ancrage, éclairage dirigé vers les accès. Laisser la bande basse de déplacement dégagée. L’image contient seulement le décor arrière ; vaisseau, ancres, porte active, sol jouable et personnages sont ajoutés séparément.

**Contrôle avant intégration :** Un asset individuel complet ; Fond opaque sans objet interactif fusionné ; Pivot et dimensions mesurés avant intégration ; Référence et extrapolation distinguées.

### castle-bay-anchor

**Ancre de baie.** Génération individuelle. Cible : 512 × 512 px. Fond transparent. Pivot normalisé : 0.5, 1. Plan : objet. Collision : empreinte dédiée.

**Prompt / instruction :** Créer une seule ancre mécanique de baie royale, base large et basse, mâchoires de fixation massives, articulations fonctionnelles lisibles et repère lumineux discret. Vue latérale légèrement plongeante, silhouette complète, pied horizontal au centre inférieur. L’objet doit tenir près d’un véhicule sans le fusionner au sprite. Conserver un contour propre sur fond transparent.

**Contrôle avant intégration :** Un asset individuel complet ; Alpha réel, aucun fond ou damier peint ; Pivot et dimensions mesurés avant intégration ; Référence et extrapolation distinguées.

### castle-airlock-frame

**Cadre de sas.** Génération individuelle. Cible : 512 × 768 px. Fond transparent. Pivot normalisé : 0.5, 1. Plan : avant-porte. Collision : ouverture exclue.

**Prompt / instruction :** Créer un seul cadre de sas monumental Yautja en vue frontale légèrement de trois quarts compatible avec une scène latérale. Deux montants et traverse supérieure massifs, profondeur intérieure visible, centre complètement vide et transparent pour recevoir un battant séparé. Pieds alignés sur une même ligne de sol, aucun seuil haut qui bouche le passage. Tout le cadre reste visible avec une marge transparente.

**Contrôle avant intégration :** Un asset individuel complet ; Alpha réel, aucun fond ou damier peint ; Pivot et dimensions mesurés avant intégration ; Référence et extrapolation distinguées.

### castle-airlock-leaf

**Battant de sas.** Génération individuelle. Cible : 512 × 768 px. Fond transparent. Pivot normalisé : 0.5, 1. Plan : porte. Collision : selon état.

**Prompt / instruction :** Créer un battant de sas fermé, isolé, destiné à s’insérer dans le cadre royal correspondant. Panneau métallique sombre articulé par nervures, bord supérieur et pieds complets, aspect frontal cohérent avec le cadre. Ne pas inclure de chambranle, poignée géante, mur, texte ou décor. Garder des bords rectilignes propres pour une translation d’ouverture sans déformation.

**Contrôle avant intégration :** Un asset individuel complet ; Alpha réel, aucun fond ou damier peint ; Pivot et dimensions mesurés avant intégration ; Référence et extrapolation distinguées.

### castle-floor

**Module de sol.** Génération individuelle. Cible : 1024 × 256 px. Fond transparent. Pivot normalisé : 0, 0. Plan : structure. Collision : surface définie en code.

**Prompt / instruction :** Créer un module horizontal de sol de forteresse royale, bande métallique patinée avec reliefs sobres et bord avant identifiable. Vue latérale à faible profondeur identique à celle des pièces. Raccords gauche et droit compatibles avec répétition, rythme de panneaux sans gros emblème central. Aucun accessoire, trou, marche imprévue ou personnage. Bord supérieur stable qui sert de repère visuel au sol défini en code.

**Contrôle avant intégration :** Un asset individuel complet ; Alpha réel, aucun fond ou damier peint ; Pivot et dimensions mesurés avant intégration ; Référence et extrapolation distinguées.

### castle-column

**Pilier monumental.** Génération individuelle. Cible : 512 × 1024 px. Fond transparent. Pivot normalisé : 0.5, 1. Plan : objet. Collision : empreinte étroite.

**Prompt / instruction :** Créer un pilier monumental Yautja isolé, très haut, base étroite et contreforts remontant en nervures. Métal noirci et bronze usé, relief cérémoniel sobre. Vue latérale à faible profondeur, pied entier au centre inférieur, hauteur complète et marge au sommet. La base doit se lire distinctement pour que l’empreinte au sol soit identifiable ; aucun pan de mur joint au pilier.

**Contrôle avant intégration :** Un asset individuel complet ; Alpha réel, aucun fond ou damier peint ; Pivot et dimensions mesurés avant intégration ; Référence et extrapolation distinguées.

### castle-gallery-wall

**Paroi de galerie.** Génération individuelle. Cible : 1536 × 1024 px. Fond opaque. Pivot normalisé : 0.5, 1. Plan : arriere. Collision : aucune.

**Prompt / instruction :** Créer le seul décor arrière d’une galerie royale Yautja : niches hautes et rythmes de parois monumentales, volume longitudinal lisible sans perspective fuyante excessive. Les trophées mobiles, socles, colonnes de premier plan et personnages restent absents. Laisser une bande inférieure claire pour le déplacement et les interactions ; lumière chaude de niche et matière sombre cohérentes avec le château.

**Contrôle avant intégration :** Un asset individuel complet ; Fond opaque sans objet interactif fusionné ; Pivot et dimensions mesurés avant intégration ; Référence et extrapolation distinguées.

### castle-trophy-plinth

**Socle de trophée vide.** Génération individuelle. Cible : 512 × 512 px. Fond transparent. Pivot normalisé : 0.5, 1. Plan : objet. Collision : empreinte dédiée.

**Prompt / instruction :** Créer un socle rituel vide, isolé, conçu pour recevoir séparément un trophée existant du jeu. Base stable, plateau supérieur dégagé et contour lisible à petite échelle. Vue latérale légèrement plongeante, métal patiné avec accents bronze, sans crâne, arme, personnage ou inscription. Pied centré en bas et marge transparente complète.

**Contrôle avant intégration :** Un asset individuel complet ; Alpha réel, aucun fond ou damier peint ; Pivot et dimensions mesurés avant intégration ; Référence et extrapolation distinguées.

### castle-audience-wall

**Fond d’audience.** Génération individuelle. Cible : 1536 × 1024 px. Fond opaque. Pivot normalisé : 0.5, 1. Plan : arriere. Collision : aucune.

**Prompt / instruction :** Créer le décor arrière d’une salle d’audience royale en vue latérale à faible profondeur. Volume majestueux, axe cérémoniel central et alcôves hautes ; retenir la densité de détail derrière le futur siège. Préserver le sol bas dégagé. Ne pas intégrer de roi, de siège, d’estrade ni de garde : ces éléments doivent être des sprites indépendants. Lumière au-dessus du futur point d’audience.

**Contrôle avant intégration :** Un asset individuel complet ; Fond opaque sans objet interactif fusionné ; Pivot et dimensions mesurés avant intégration ; Référence et extrapolation distinguées.

### castle-dais

**Estrade séparée.** Génération individuelle. Cible : 1024 × 512 px. Fond transparent. Pivot normalisé : 0.5, 1. Plan : structure. Collision : périmètre explicite.

**Prompt / instruction :** Créer une estrade royale vide, isolée, avec plateforme haute, marche d’accès lisible et large façade horizontale. Vue latérale à faible profondeur ; ne pas dessiner un escalier qui sort du cadre. Architecture sombre, liserés de bronze patiné et surface supérieure libre pour le siège séparé. Le bas de la structure est complet et plat ; collision et accès seront définis séparément.

**Contrôle avant intégration :** Un asset individuel complet ; Alpha réel, aucun fond ou damier peint ; Pivot et dimensions mesurés avant intégration ; Référence et extrapolation distinguées.

### castle-throne

**Siège du pouvoir vide.** Génération individuelle. Cible : 768 × 1024 px. Fond transparent. Pivot normalisé : 0.5, 1. Plan : objet. Collision : contour dédié.

**Prompt / instruction :** Créer un siège de pouvoir Yautja vide, haut dossier, appuis lourds et silhouette équilibrée. Métal sombre ancien, bronze usé et matières rituelles sobres, sans emblème ou nom inventé. Vue latérale légèrement de trois quarts accordée à l’estrade, siège complet sans sol ni personne. Conserver dossier, accoudoirs et pieds dans le cadre ; ne pas intégrer de roi ou de trophée identifié.

**Contrôle avant intégration :** Un asset individuel complet ; Alpha réel, aucun fond ou damier peint ; Pivot et dimensions mesurés avant intégration ; Référence et extrapolation distinguées.

### castle-council-table

**Table tactique.** Génération individuelle. Cible : 1024 × 768 px. Fond transparent. Pivot normalisé : 0.5, 1. Plan : objet. Collision : contour + aire d’usage.

**Prompt / instruction :** Créer une table tactique royale isolée, surface circulaire ou polygonale légèrement inclinée vers la caméra, piètement massif, petits émetteurs encastrés. Vue latérale à faible profondeur. Une lumière froide discrète indique la fonction ; aucune carte, planète ou interface lisible n’est peinte sur le plateau, car la projection sera un effet séparé. Garder tous les pieds et une empreinte compacte.

**Contrôle avant intégration :** Un asset individuel complet ; Alpha réel, aucun fond ou damier peint ; Pivot et dimensions mesurés avant intégration ; Référence et extrapolation distinguées.

### castle-archive-console

**Terminal d’archives.** Génération individuelle. Cible : 512 × 768 px. Fond transparent. Pivot normalisé : 0.5, 1. Plan : objet. Collision : contour + aire d’usage.

**Prompt / instruction :** Créer un terminal d’archives royal autonome, colonne de lecture étroite, interface inclinée et base stable. Metal noirci, bronze retenu et écran lumineux froid sans texte lisible. Vue latérale légèrement de trois quarts ; silhouette complète et alpha propre. Ne pas ajouter d’utilisateur, câbles sortant du cadre, rangée de terminaux ou grand mur.

**Contrôle avant intégration :** Un asset individuel complet ; Alpha réel, aucun fond ou damier peint ; Pivot et dimensions mesurés avant intégration ; Référence et extrapolation distinguées.

### castle-court-wall

**Fond de cour.** Génération individuelle. Cible : 1536 × 1024 px. Fond opaque. Pivot normalisé : 0.5, 1. Plan : arriere. Collision : aucune.

**Prompt / instruction :** Créer le décor arrière d’une cour intérieure d’épreuve royale, vaste volume fermé, portiques périphériques et éclairage qui met en valeur une aire centrale vide. Vue latérale à faible profondeur compatible avec les salles. Aucun combattant, cible, récompense, fosse mortelle ou dispositif actif ; le sol et les épreuves seront définis par leur mode de jeu.

**Contrôle avant intégration :** Un asset individuel complet ; Fond opaque sans objet interactif fusionné ; Pivot et dimensions mesurés avant intégration ; Référence et extrapolation distinguées.

### castle-service-wall

**Passage latéral.** Génération individuelle. Cible : 1536 × 1024 px. Fond opaque. Pivot normalisé : 0.5, 1. Plan : arriere. Collision : aucune.

**Prompt / instruction :** Créer le décor arrière du passage de service royal : conduits encastrés, contreventements structurels et repères lumineux orientés vers la baie. Vue latérale peu profonde, dimensions cohérentes avec un chasseur Yautja. Laisser libre toute la bande de marche ; aucun obstacle ou porte active peint dans cette bande. Le passage reste visuellement secondaire et facile à lire.

**Contrôle avant intégration :** Un asset individuel complet ; Fond opaque sans objet interactif fusionné ; Pivot et dimensions mesurés avant intégration ; Référence et extrapolation distinguées.

### castle-beacon

**Balise d’accès.** Génération individuelle. Cible : 256 × 256 px. Fond transparent. Pivot normalisé : 0.5, 1. Plan : signal. Collision : aucune.

**Prompt / instruction :** Créer une seule balise d’accès compacte, base métallique sombre, lentille centrale et contour complet. Vue latérale légèrement de trois quarts, alpha propre. Dessiner l’état neutre, sans halo très large ; la couleur et la pulsation d’autorisation seront composées par le jeu. Aucun glyphe de texte ni symbole indiquant une règle de progression inventée.

**Contrôle avant intégration :** Un asset individuel complet ; Alpha réel, aucun fond ou damier peint ; Pivot et dimensions mesurés avant intégration ; Référence et extrapolation distinguées.

### castle-fog

**Brume basse.** Génération individuelle. Cible : 1024 × 512 px. Fond transparent. Pivot normalisé : 0.5, 1. Plan : effet-arriere. Collision : aucune.

**Prompt / instruction :** Créer une unique nappe de brume basse, fine et asymétrique, densité maximale près de sa base, dégradés doux vers la transparence. Palette gris froid neutre légèrement verdâtre, sans poussière lumineuse ni fumée noire opaque. Laisser le centre supérieur largement transparent pour ne pas masquer les pieds ou les accès. Aucun sol, objet ou personnage.

**Contrôle avant intégration :** Un asset individuel complet ; Alpha réel, aucun fond ou damier peint ; Pivot et dimensions mesurés avant intégration ; Référence et extrapolation distinguées.

## Arrivée planétaire

### arrival-space

**Champ d’étoiles.** Génération individuelle. Cible : 2048 × 1024 px. Fond opaque. Pivot normalisé : 0.5, 0.5. Plan : fond-orbital. Collision : aucune.

**Prompt / instruction :** Créer le fond spatial de l’arrivée planétaire : étoiles fines et profondeur discrète sur noir bleuté, espace calme pour un nom de planète rendu ensuite par l’interface. Aucun vaisseau, planète, logo, générique ou texte. Lumière et composition compatibles avec une planète ajoutée au second plan.

**Contrôle avant intégration :** Un asset individuel complet ; Fond opaque sans objet interactif fusionné ; Pivot et dimensions mesurés avant intégration ; Référence et extrapolation distinguées.

### arrival-planet

**Disque planétaire.** Génération individuelle. Cible : 1024 × 1024 px. Fond transparent. Pivot normalisé : 0.5, 0.5. Plan : fond-orbital. Collision : aucune.

**Prompt / instruction :** Créer un seul disque de la planète de destination définie par le catalogue du jeu, entièrement visible sur transparence. Garder son identité de biome, la direction de lumière et la silhouette cohérentes avec le matériau de planète existant. Atmosphère fine uniquement si elle est fournie comme couche distincte ; aucun nom, nuage de premier plan, vaisseau ou fond d’étoiles. Si la destination n’a pas de référence validée, conserver l’étiquette de proposition.

**Contrôle avant intégration :** Un asset individuel complet ; Alpha réel, aucun fond ou damier peint ; Pivot et dimensions mesurés avant intégration ; Référence et extrapolation distinguées.

### arrival-carrier

**Vaisseau de transport.** Réemploi du catalogue/rig existant. Cible : Dimension du catalogue ou rig. Fond transparent. Pivot normalisé : 0.5, 0.5. Plan : vaisseau. Collision : aucune.

**Prompt / instruction :** Réemployer la silhouette du vaisseau personnel réellement sélectionné ou du transport explicitement défini par la mission. Résoudre la ressource par le catalogue du jeu et conserver son identité, son ratio, son orientation et son alpha. Ne pas générer un vaisseau générique qui remplacerait la coque du joueur. Documenter le point de largage et le centre de rotation sur la ressource choisie.

**Contrôle avant intégration :** Identité de campagne conservée ; Ressource issue du catalogue existant ; Pivot et échelle identiques au gameplay ; Aucun effet métier dans le rendu.

### arrival-pod-flight

**Capsule fermée en vol.** Génération individuelle. Cible : 768 × 1024 px. Fond transparent. Pivot normalisé : 0.5, 0.5. Plan : capsule. Collision : aucune.

**Prompt / instruction :** Créer une capsule de descente Yautja fermée unique, silhouette compacte allongée, carapace sombre et dispositif d’ouverture lisible. Montrer une vue de trois quarts compatible avec la trajectoire spatiale ; objet entier, fond transparent, centre de masse identifiable. Conserver exactement le même nombre de panneaux, nervures et charnières que la future version au sol. Aucun transport, flamme, fumée ou chasseur intégré. Utiliser la référence de capsule choisie ; le candidat AVP du catalogue ne doit pas être étiqueté capsule de 1987 sans preuve.

**Contrôle avant intégration :** Un asset individuel complet ; Alpha réel, aucun fond ou damier peint ; Pivot et dimensions mesurés avant intégration ; Référence et extrapolation distinguées.

### arrival-release-fx

**Jet de séparation.** Génération individuelle. Cible : 512 × 512 px. Fond transparent. Pivot normalisé : 0, 0.5. Plan : effet-arriere. Collision : aucune.

**Prompt / instruction :** Créer un seul jet bref de séparation mécanique ou de gaz, émetteur placé au bord gauche médian du sprite et expansion vers la droite. Vapeur claire avec noyau discret, bords transparents, sans explosion énorme ni débris solides. Aucun vaisseau ni capsule. L’image est une couche d’effet attachée au point de largage ; son intensité et sa durée restent animées en code.

**Contrôle avant intégration :** Un asset individuel complet ; Alpha réel, aucun fond ou damier peint ; Pivot et dimensions mesurés avant intégration ; Référence et extrapolation distinguées.

### arrival-clouds

**Couche atmosphérique.** Génération individuelle. Cible : 2048 × 1024 px. Fond transparent. Pivot normalisé : 0.5, 0.5. Plan : atmosphere. Collision : aucune.

**Prompt / instruction :** Créer une couche atmosphérique indépendante en large bande, nuages étirés aux volumes lisibles et grands espaces transparents. Palette neutre recolorable par le biome, direction de lumière stable. Aucun sol, planète ronde, horizon complet ou appareil. Garder les bords doux pour croiser plusieurs plans à vitesse différente.

**Contrôle avant intégration :** Un asset individuel complet ; Alpha réel, aucun fond ou damier peint ; Pivot et dimensions mesurés avant intégration ; Référence et extrapolation distinguées.

### arrival-heat-trail

**Traînée thermique.** Génération individuelle. Cible : 1024 × 512 px. Fond transparent. Pivot normalisé : 0, 0.5. Plan : effet-arriere. Collision : aucune.

**Prompt / instruction :** Créer une traînée thermique de capsule isolée, point d’origine étroit au bord gauche médian et dissipation vers la droite. Noyau chaud orange retenu, turbulence chaude et fumée légère vers transparence. Aucun objet solide ou explosion. La traînée sera tournée à l’opposé de la vitesse et ne doit pas imposer une orientation de capsule dans ses pixels.

**Contrôle avant intégration :** Un asset individuel complet ; Alpha réel, aucun fond ou damier peint ; Pivot et dimensions mesurés avant intégration ; Référence et extrapolation distinguées.

### arrival-ground

**Terrain latéral.** Génération individuelle. Cible : 2048 × 1024 px. Fond opaque. Pivot normalisé : 0.5, 1. Plan : fond-terrain. Collision : aucune.

**Prompt / instruction :** Créer le décor latéral d’arrivée du biome de mission choisi, sol visuel horizontal et profondeur de ciel cohérente. Préserver une aire libre pour la capsule et le chasseur à leur échelle de gameplay. Aucun personnage, capsule, impact, poussière ni obstacle jouable peint dans cette zone. Maintenir les couleurs et l’orientation de lumière de la planète, sans inventer de landmark canonique.

**Contrôle avant intégration :** Un asset individuel complet ; Fond opaque sans objet interactif fusionné ; Pivot et dimensions mesurés avant intégration ; Référence et extrapolation distinguées.

### arrival-pod-ground

**Capsule au sol.** Génération individuelle. Cible : 1024 × 1024 px. Fond transparent. Pivot normalisé : 0.5, 1. Plan : objet. Collision : contour dédié.

**Prompt / instruction :** Créer la même capsule que le modèle de vol, posée en vue latérale à faible profondeur, pieds et base complets sur fond transparent. Prévoir l’ouverture vide du côté de sortie du chasseur ; ne pas intégrer le battant mobile. Conserver nombre de nervures, panneaux, métal et taille relative du modèle fermé. Aucun sol, cratère, poussière, feu ou personnage. La base doit permettre un pivot au centre inférieur.

**Contrôle avant intégration :** Un asset individuel complet ; Alpha réel, aucun fond ou damier peint ; Pivot et dimensions mesurés avant intégration ; Référence et extrapolation distinguées.

### arrival-pod-door

**Battant de capsule.** Génération individuelle. Cible : 512 × 1024 px. Fond transparent. Pivot normalisé : Charnière à mesurer sur asset livré. Plan : porte. Collision : aucune après ouverture.

**Prompt / instruction :** Créer uniquement le battant mobile de la capsule de référence, même matériau, nervures et échelle que sa coque au sol. Objet entier sur transparence, charnière et bords clairement identifiables. Vue latérale compatible avec la capsule, sans cadre, coque, personnage, fumée ou sol. Laisser une marge pour la rotation en code ; enregistrer le pivot de charnière après génération.

**Contrôle avant intégration :** Un asset individuel complet ; Alpha réel, aucun fond ou damier peint ; Pivot et dimensions mesurés avant intégration ; Référence et extrapolation distinguées.

### arrival-dust

**Poussière d’impact.** Génération individuelle. Cible : 1024 × 512 px. Fond transparent. Pivot normalisé : 0.5, 1. Plan : effet-sol. Collision : aucune.

**Prompt / instruction :** Créer un nuage de poussière d’impact bas et large, origine au centre inférieur, lobes latéraux qui laissent une trouée près de la sortie du chasseur. Particules fines sans rochers solides, alpha progressif et palette beige/gris neutre adaptée au biome par le moteur. Aucun sol, capsule ou personnage. L’effet doit rester lisible à faible opacité et pouvoir disparaître sans découpe dure.

**Contrôle avant intégration :** Un asset individuel complet ; Alpha réel, aucun fond ou damier peint ; Pivot et dimensions mesurés avant intégration ; Référence et extrapolation distinguées.

### arrival-hunter-egress

**Sortie du chasseur.** Réemploi du catalogue/rig existant. Cible : Dimension du catalogue ou rig. Fond transparent. Pivot normalisé : 0.5, 1. Plan : acteur. Collision : contrôleur du jeu.

**Prompt / instruction :** Réemployer le rig, le preset et les poses du chasseur de la campagne. Définir la sortie comme une courte séquence à partir des poses existantes, pied d’ancrage et orientation identiques au gameplay. Conserver costume, armes et accessoires réellement équipés. Ne pas générer une silhouette de chasseur générique et ne pas produire une planche de poses fusionnées. Toute nouvelle pose manquante doit devenir une demande séparée avec son identifiant propre.

**Contrôle avant intégration :** Identité de campagne conservée ; Ressource issue du catalogue existant ; Pivot et échelle identiques au gameplay ; Aucun effet métier dans le rendu.
