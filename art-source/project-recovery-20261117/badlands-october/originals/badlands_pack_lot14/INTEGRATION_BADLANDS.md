# Intégration des visuels Badlands V14

**Yautja : La Longue Chasse** — lot complémentaire, 7 PNG présents dans cette archive. Préparé le 7 octobre 2026.

## Ce qui est prêt

Les images sont des PNG RGBA indépendants. Le manifeste d’import contient les chemins proposés, les dimensions natives, une boîte visible, les marges, les empreintes SHA-256, un point de placement indicatif et les relations entre fichiers corrigés. Les sources et reconstitutions restent détaillées dans `MANIFEST_BADLANDS.json`.

Ces fichiers sont préparés pour une intégration manuelle. Aucun PNG, registre, consommateur ou catalogue du dépôt du jeu n’a été ajouté ou modifié durant cette passe. `available: true` signifie présent dans le pack ; `installedInProject: false` indique le statut réel. Ce manifeste complémentaire n’est pas un fichier déjà reconnu automatiquement par le jeu.

## Où placer les fichiers

Destination proposée depuis la racine du dépôt : `public/game/assets/badlands/v14/`.

1. Extraire l’archive et garder les noms des PNG.
2. Copier le dossier `sprites/` dans cette destination. Pour une première installation, utiliser le cumul ; le lot 14 seul contient seulement ses 7 ajouts.
3. Copier `BADLANDS_RUNTIME_MANIFEST.json` au même niveau que `sprites/`.
4. Brancher explicitement ce catalogue dans le consommateur de visuels concerné, ou mapper les entrées sélectionnées vers le manifeste de cutouts déjà utilisé par ce consommateur.
5. Vérifier les URL des images, leur taille à l’écran, le fond transparent et leur placement dans une scène de développement avant de publier.

Exemple de chemin proposé : `public/game/assets/badlands/v14/sprites/flore/162_plante_feuilles_coupe_sans_ver.png` devient `/game/assets/badlands/v14/sprites/flore/162_plante_feuilles_coupe_sans_ver.png` côté navigateur.

Le lot complémentaire et le cumul utilisent la même racine proposée. Les relations du lot peuvent viser des IDs historiques absents du lot mais présents dans le cumul. Ne pas additionner les cumuls pour compter des fichiers uniques.

## Correspondance avec le projet inspecté

| Champ fourni | Utilité | Limite |
| --- | --- | --- |
| `runtimePath` / `runtimeUrl` | Destination proposée et URL publique de chaque PNG. | Aucun fichier du dépôt n’a encore été copié à cet endroit. |
| `planned` / `available` | Reprend la distinction présente dans les catalogues de cutouts. | La disponibilité est locale au pack. |
| `sourceTier: approximation` | Permet de conserver une indication prudente sur la fidélité. | Ne pas convertir automatiquement en `exact-override`. |
| `metadata` | Largeur, hauteur, 4 canaux, taille et SHA-256 réels. | Les résolutions natives varient. |
| `validation.bounds` / `padding` | Boîte alpha >16 et marges, comme le seuil du script de cutouts inspecté. | Les limites sont inclusives ; ce n’est pas une hitbox. |
| `frameRect` | Rectangle du PNG complet : x, y, largeur, hauteur. | Une seule image statique par fichier. |
| `pivot` | Centre-bas calculé pour faciliter un premier placement. | Ancrage, pieds, attaches et superposition à régler visuellement. |
| `relations` | Remplacements, corrections morphologiques et compléments. | Les états ne sont pas nécessairement interchangeables. |

Le script `build-cutout-manifests.mjs` inspecté génère le manifeste du kit V14 depuis ses propres sources. Ajouter ce nouveau JSON à `public/` ne l’enregistre pas dans ce script. Les clés de sélection et les consommateurs doivent être décidés dans le code du jeu ; aucune association à un preset existant n’a été inventée ici.

## Alpha, cadrage et coordonnées

`BADLANDS_RUNTIME_MANIFEST.json` mesure la boîte des pixels dont alpha >16 : `[minX, minY, maxX, maxY]`, maximum inclus. Sa largeur visible vaut donc `maxX - minX + 1`. La marge droite vaut `largeurPNG - 1 - maxX`. Les ratios sont arrondis à six décimales. `transparentRatio` compte les pixels alpha =0 ; `partialAlphaPixels` compte ceux avec 0 < alpha <255.

`CONTROLE_PNG.json` et le manifeste documentaire historique conservent leur convention alpha >8 et leurs maxima exclusifs. Les deux relevés sont intentionnellement distincts et nommés ; ne pas mélanger leurs boîtes.

Les pixels et le canal alpha natifs n’ont pas été retouchés. Certaines sorties contiennent des couleurs dans les pixels totalement transparents, invisibles lors d’une composition alpha correcte. Conserver un mélange alpha normal ; vérifier les contours avant de convertir en WebP ou de créer un atlas. Ne pas déduire une collision du bruit alpha ou des étincelles.

Pour un placement Canvas provisoire, le point géométrique peut servir avec `drawImage(image, x - pivotX * scale, y - pivotY * scale, width * scale, height * scale)`. Ici, `pivotX` et `pivotY` sont les valeurs de `pivot.pixels`, et `width` / `height` les dimensions complètes du PNG. Ce calcul suppose un facteur de mise à l’échelle uniforme. Les coordonnées normalisées sont fournies séparément dans `pivot.normalized`.

## Choix conseillés pour les nouveaux visuels

| ID | Visuel | Usage préparé et réglage nécessaire |
| --- | --- | --- |
| 160 | Vulture entier — posé, ailes rabattues | Pose de repos au sol ; régler le contact des deux pieds et la taille. Membranes encore partiellement ouvertes. Pas de transition animée avec les vols 4 et 25. |
| 161 | Vulture entier — attaque quasi frontale | Attaque quasi frontale à utiliser comme état statique ou référence d’animation. Serres et bouche ouvertes, extrémités entières. Ne pas en déduire une trame alignée avec 4, 25 ou 160. |
| 162 | Plante à feuilles en coupe — sans ver | Complément vide de la plante 99. Régler un point de sol et une taille communs avant tout échange d’état ; pas d’alignement pixel à pixel fourni. |
| 163 | Plante antidote — après cueillette | Complément après récolte de la plante 130, à associer à la fleur 124. Tige sectionnée, aucune corolle. Ce n’est pas un bouton fermé. Harmoniser taille et placement des états. |
| 164 | Encadrement de sas Weyland-Yutani LAB-04 — ouvert | Encadrement de sas avec deux passages transparents. Raccorder l’arrière au mur et le seuil au sol ; définir les collisions sur les montants, puis la zone de passage. Pas de porte animée. |
| 165 | Meuble Weyland-Yutani incliné à cinq logements verticaux | Meuble entier à cinq logements, dont trois occupés. Placer les appuis au sol ; fonction des modules non identifiée. Aucun objet encastré n’est fourni séparément. |
| 166 | Ceinture, tablier et pans rouges de Kwei | Ceinture, trois plaques et pans rouges réunis dans un seul PNG. Convient à un aperçu d’équipement ; séparation des couches, attaches, proportions et occlusions nécessaires pour le porter sur un personnage. |

Les nº 162 et 163 complètent les plantes 99 et 130 par des états de ressource reconstitués. Régler une échelle et un point de sol communs avant de permuter leurs images ; les fichiers ne sont pas alignés pixel à pixel. Le nº 163 est un état après cueillette, pas le bouton fermé encore non documenté. Pour les lianes historiques, les relations 26→152 et 27→153 restent valables ; le nº 148 conserve sa propre pose.

## Animation et équipement porté

Le module `hunterSpriteAtlas.ts` inspecté demande des pages, des rectangles de trame, des pivots et des clips explicites, ainsi qu’un état d’approbation. Ses tests distinguent les orientations et comptent les trames différentes. Ces PNG ne sont donc pas fournis comme des cycles locomoteurs validés.

Pour intégrer un personnage animé, il reste à produire les trames nécessaires pour chaque action et chaque orientation, fixer une échelle et des pivots cohérents, composer les pages sans couper la silhouette, régler les durées, puis effectuer la revue artistique et les contrôles du projet. Répéter une pose ne produit pas de nouvelles trames. Aucun miroir gauche/droite n’est déclaré équivalent à une vue dessinée.

Pour porter les armures sur un personnage, il reste à créer les couches ou attaches nécessaires, vérifier le côté anatomique, puis régler translation, rotation, occlusion et proportions. La ceinture et les pans de Kwei sont réunis dans un seul PNG utilisable en vignette d’inventaire. Les anciens plastrons et paires de jambières conservent le même statut ; aucun de ces ensembles ne fournit un rig déjà attaché au personnage.

## Vérifier l’import dans le jeu

- Charger une image de chaque catégorie dans une scène de développement et contrôler l’absence d’erreur réseau.
- Tester sur fonds clair et sombre les contours, les trous du feuillage et les deux passages du sas.
- Définir l’échelle par sujet, les points de sol ou d’attache, la profondeur, les collisions et les zones d’interaction.
- Sélectionner un état par usage et appliquer les relations de correction ; ne pas afficher simultanément les versions historiques et corrigées par défaut.
- Après raccordement du code, exécuter les contrôles adaptés du projet. Les tests de l’application et une vérification en scène restent à faire ; ils n’ont pas été exécutés sur ce pack seul.

## Sources techniques inspectées

Lecture des fichiers suivants sur `main` le 7 octobre 2026. Les identifiants ci-dessous sont des empreintes de fichier Git, pas une assertion de commit unique du dépôt. Les liens sur main peuvent évoluer.

- [scripts/build-cutout-manifests.mjs](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/main/scripts/build-cutout-manifests.mjs) — blob `755af020d0683e968ea5f92512e65b5af9512c06` ; portion lue : [1, 200].
- [art-source/v14/hunter-kit/manifests/equipment.json](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/main/art-source/v14/hunter-kit/manifests/equipment.json) — blob `8d5ad11ced6a287fd29ca8cf9fc22a99764a55ec` ; portion lue : complete.
- [app/game/hunterSpriteAtlas.ts](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/main/app/game/hunterSpriteAtlas.ts) — blob `c0bb6bac7b0e1b17dde7229cd8a88642f6a2544e` ; portion lue : [1, 180].
- [tests/hunterSpriteAtlas.test.ts](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/main/tests/hunterSpriteAtlas.test.ts) — blob `6d56b82a37edc52789f42bee17f5c4625c3470dc` ; portion lue : [1, 180].
- [scripts/build-private-dlc-manifest.mjs](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/main/scripts/build-private-dlc-manifest.mjs) — blob `e52fe54e8f9d9a33a6f7e5f5f88fb921832e215a` ; portion lue : [1, 160].

La fidélité exacte 1:1 et l’inventaire exhaustif du film ne sont pas certifiés. Les documents visuels détaillent séparément les formes attestées et les zones reconstituées.
