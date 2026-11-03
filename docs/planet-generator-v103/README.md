# Générateur modulaire de planètes — Guerres de territoire V103

La V103 compose une planète jouable à partir d’une graine et de modules indépendants. Elle étend le format stratégique à **18, 24, 36, 48, 72 ou 96 territoires**, répartis en **3, 4, 6, 8 ou 12 régions**, avec des côtes découpées, des frontières irrégulières, des bassins et des chenaux intérieurs. Les matières des terres, celles des milieux entre les terres et l’atmosphère possèdent leurs propres réglages.

Chaque code retrouve une recette complète, sa géographie, ses voisins, ses régions et ses descriptions. Les 30 mondes historiques et les codes V102 conservent leur interprétation d’origine. Un monde V102 reste un front de 36 territoires et six régions ; sa conversion en variante V103 est une action explicite qui produit un nouveau code.

Le [guide d’intégration stratégique](INTEGRATION.md) détaille les effectifs, les stocks, les objectifs et les archives. Le [guide des matières](MATERIALS.md) présente les textures et les contrôles du rendu.

![Six assemblages du renderer de production, avec matières terrestres et extraterrestres indépendantes](material-gallery-v103.png)

La planche montre six rendus réels avec diffusion atmosphérique ; nuages et brumes sont masqués pour lire les matières. Les [recettes et angles de vue](material-gallery-recipes.json) permettent de les reproduire. Les captures du [générateur](desktop-generator.png), du [planisphère](desktop-atlas.png) et de l’[atlas mobile](mobile-atlas.png) montrent un front de 96 territoires, 12 régions et 32 îles. Leur [fiche de capture](screenshots.json) conserve le code, la recette et les empreintes des images.

## Créer, explorer et ouvrir un monde

Ouvrir **Générer un monde** dans le sélecteur des théâtres planétaires, ou la page **`/planet-generator-v103`**.

1. Saisir une **Graine du monde** : un nombre de `0` à `4 294 967 295`, ou un nom. Le formulaire accepte jusqu’à 64 caractères. Un nom devient une graine numérique reproductible, incluse dans la recette.
2. Choisir le **Nombre de territoires** et le **Nombre de régions**. Chaque région doit contenir au moins trois territoires. L’interface n’accepte que les combinaisons compatibles.
3. Régler la géographie, les biomes, les textures, les milieux intérieurs et l’atmosphère. Les sections du formulaire séparent ces familles de paramètres.
4. Activer **Générer l’aperçu**. Cette action applique le brouillon à la carte, au globe, aux descriptions, au code et aux exports. Une modification supplémentaire reste dans le brouillon jusqu’à la génération suivante.
5. Explorer les territoires et leurs régions. Le dossier décrit les terres, les ressources des sites, les bassins, les chenaux et les particularités du monde appliqué.
6. Choisir **Mémoriser ce monde** pour conserver son raccourci, ou **Ouvrir ce front** pour jouer. Un front déjà archivé sous ce code reprend sa progression ; un nouveau code ouvre une archive distincte.

L’exploration d’un brouillon conserve la guerre active. L’ouverture, le partage et les téléchargements portent sur l’aperçu appliqué. Le message du formulaire signale les réglages encore en attente.

### Tirer des variantes sans perdre les choix importants

Chaque paramètre possède **Conserver** et **Au hasard**. Conserver verrouille ce champ pendant les tirages et les préréglages. Au hasard tire uniquement le champ concerné ; **Mélanger les réglages** tire tous les champs libres. Le tirage traite ensemble les nombres de territoires et de régions afin de respecter la règle de trois territoires par région.

**Base terrestre** et **Base extraterrestre** proposent des points de départ cohérents. Ils respectent les champs verrouillés et préparent le brouillon ; ils ne remplacent pas immédiatement l’aperçu. Les verrous sont des préférences de l’éditeur et ne font pas partie du code de la planète.

Le tirage interne est déterministe pour une recette, une valeur d’entropie et un ensemble de verrous donnés. Le bouton fournit une nouvelle entropie, tandis que le code conserve le résultat exact du tirage.

## Modules disponibles

| Famille | Choix | Effet réel |
|---|---|---|
| Format du front | 18, 24, 36, 48, 72 ou 96 territoires ; 3, 4, 6, 8 ou 12 régions | Modifie les sites conquérables, les régions, le graphe et les objectifs du front. |
| Répartition des terres | Supercontinent, Continents, Archipels, Îles fragmentées | Produit une grande terre, plusieurs continents ou davantage d’îles distinctes. |
| Disposition sur le globe | Terres dispersées, Ceinture équatoriale, Deux hémisphères, Couronnes polaires | Change les zones d’implantation des masses terrestres. Un supercontinent polaire occupe une calotte. |
| Étendue des terres | Terres réduites, Équilibrée, Terres étendues | Change les surfaces terrestres et le pourcentage de terre mesuré. |
| Dessin des côtes | Côtes douces, Caps et baies, Fjords et criques, Péninsules, Baies arrondies | Change les contours, les renfoncements et les avancées côtières. |
| Forme des territoires | Territoires compacts, Frontières irrégulières | Change les cellules et les adjacences à l’intérieur des terres. |
| Taille des régions | Répartition équilibrée, Régions de tailles variées | Affecte le nombre de territoires par région. Avec exactement trois territoires disponibles par région, les tailles restent nécessairement égales. |
| Terres et régions | Treize biomes dominants ; famille uniforme ou régions variées | Affecte les matières régionales et les descriptions de climat, de relief et de particularités. |
| Milieux entre les terres | Eau, acide, glace, sable, lave, saumure, nappes radioactives, cristaux, spores, brume | Affecte la surface extérieure et celle des bassins et chenaux. Ces milieux ne sont pas tous des liquides. |
| Bassins et cours intérieurs | Aucun, Bassins intérieurs, Cours et chenaux, Bassins et cours | Découpe des polygones intérieurs dans le masque terrestre et identifie les traversées correspondantes. |
| Matières des sols | Texture d’origine, terrestre ou extraterrestre ; motifs larges, moyens ou fins ; contraste doux, équilibré ou marqué ; cinq palettes | Change uniquement l’apparence terrestre, avec des matières sélectionnées par région. |
| Matières des mers et milieux | Les mêmes trois familles, trois échelles et trois contrastes ; six palettes indépendantes | Change uniquement l’apparence des milieux entre les terres et des étendues intérieures. |
| Atmosphère | Ciel clair, Brumes et aérosols, Systèmes orageux, Aurores polaires | Affecte les couches atmosphériques, les nuages et les émissions visuelles. |

Les combinaisons stratégiques autorisées sont :

| Territoires | Régions disponibles |
|---|---|
| 18 | 3, 4, 6 |
| 24 | 3, 4, 6, 8 |
| 36, 48, 72, 96 | 3, 4, 6, 8, 12 |

Le nombre de masses terrestres et le nombre de régions sont indépendants. Une région peut occuper plusieurs îles reliées ; une masse terrestre peut accueillir plusieurs régions. Le mode Supercontinent produit une masse, Continents en produit de trois à cinq, et les modes d’îles augmentent ce nombre avec le format, jusqu’à 32 masses en mode Îles fragmentées. La classification descriptive « continent » ou « île » repose sur le nombre de territoires portés par la masse, pas sur un modèle géologique.

## Codes, fiches et anciens mondes

**Copier le code** partage la recette de l’aperçu appliqué. Dans **Explorer un monde partagé**, coller ce code et choisir **Retrouver le monde** reconstruit la planète, même si elle n’a jamais été mémorisée sur l’appareil. Un code invalide laisse l’aperçu précédent disponible.

**Télécharger la fiche** produit un JSON contenant le code, la recette versionnée et les descriptions du monde. Le dossier inclut le résumé des milieux intérieurs. Leurs sommets sont reconstruits à partir de la recette et ne sont pas une deuxième source géographique dans le fichier. **Ou importer une fiche** accepte une fiche jusqu’à 64 Kio et vérifie l’accord exact du code, de la version et de la recette. Des descriptions éditées dans le JSON ne changent pas les règles du monde reconstruit.

Un import V102 conserve son code, ses 36 territoires, ses six régions et sa progression éventuelle. **Préparer une variante** ouvre un brouillon V103. Il faut ensuite générer ce brouillon pour obtenir une nouvelle planète ; l’ancienne demeure accessible par son code d’origine.

Toute modification d’un paramètre produit un autre code, y compris une modification purement visuelle. La géographie peut rester identique, mais le front et son archive ont une identité distincte. Pour reprendre exactement une guerre, conserver son code original.

Le code et la fiche partagent **le monde**, sans transférer les unités, les ordres, les stocks, le tour courant ou les conquêtes. Ces données appartiennent à l’archive locale de la guerre. Retrouver la planète après la perte d’une archive ne restaure pas une progression perdue.

### Recette par défaut

Son code est **`proc-v103-m9bf-331013100011300111100-m6545`** :

```json
{
  "version": 103,
  "seed": 1038507,
  "territoryCount": 48,
  "regionCount": 8,
  "landform": "continents",
  "arrangement": "scattered",
  "landCoverage": "balanced",
  "coast": "peninsulas",
  "territoryStyle": "organic",
  "regionBalance": "balanced",
  "landBiome": "temperate",
  "surface": "water",
  "biomeDiversity": "varied",
  "atmosphere": "haze",
  "hydrology": "mixed",
  "landVariant": "native",
  "surfaceVariant": "native",
  "landScale": "medium",
  "surfaceScale": "medium",
  "landContrast": "balanced",
  "surfaceContrast": "balanced",
  "landPalette": "native",
  "surfacePalette": "native"
}
```

Ce bloc présente la recette seule. Pour un import par fichier, utiliser la fiche complète de l’interface, qui porte également son format et son code.

## Exporter les PNG par calque

Le panneau **Exporter les textures par calque** utilise le monde appliqué. Choisir le calque, sa projection puis **Télécharger le PNG**.

| Projection | Dimensions | Utilisation |
|---|---|---|
| Planisphère | 1 024 × 512 pixels | Carte longitude/latitude, nord en haut. |
| Globe | 512 × 512 pixels | Vue sphérique, transparente hors du globe. |
| Masque des terres | 1 024 × 512 pixels | Terres en blanc, milieux extérieurs et intérieurs en noir. |

Les couches comprennent la planète assemblée, les couleurs, les terres et leurs biomes, la surface entre les terres, les nuages, les brumes et particules, la diffusion atmosphérique, l’ombre et le masque. Les couches d’émission et d’aurores sont disponibles lorsque le profil en contient. Leurs transparences permettent un assemblage séparé.

Les bassins et chenaux sont retirés de la couche terrestre et laissent apparaître la matière de surface. Les huit réglages de matière s’appliquent à leurs couches respectives. Les matières sont des images du projet réutilisées par le renderer ; tirer une nouvelle graine ne lance pas une génération d’images par IA.

## Géographie et règles de guerre

Les identifiants vont de `CON-T01` à `CON-T96` selon le format choisi, et de `CON-REG01` à `CON-REG12` selon le nombre de régions. Ils sont locaux au monde ; le code de la planète identifie leur contexte. Chaque territoire possède un polygone, un marqueur intérieur, des voisins et une définition de site.

Les régions sont connectées dans leur propre sous-graphe : un déplacement régional n’exige pas de traverser une autre région. Le graphe complet est également connecté et chaque liaison est réciproque. Les départs des Haltes et des Forges occupent chacun une poche contiguë de trois à six sites, avec des productions S, M et I. Les autres sites restent sous contrôle neutre au départ. Les bases et le corridor entre elles sont fournis explicitement au moteur dans `procedural.strategy` ; aucune position adverse fixe comme T25 n’est supposée.

Les revenus sont attachés aux rôles réels des sites : Dépôt produit S +2, Atelier M +2, Assemblée I +1 ; les autres rôles n’ont pas de revenu de base. Les ressources du dossier régional correspondent aux rôles présents. Le moteur adapte les effectifs et stocks de départ au format ; les coûts des ordres, les règles de combat et la résolution des tours restent ceux du front. Les paramètres exacts sont décrits dans [INTEGRATION.md](INTEGRATION.md).

Les bassins et chenaux sont des trous visuels dans la terre, sans ajouter de territoires navals. Les marqueurs restent en dehors de leurs polygones. Une liaison dont le chemin traverse un milieu intérieur devient une **traversée autorisée**, avec les identifiants des bassins ou chenaux concernés. La carte et le contrôle d’intersection utilisent le même chemin géodésique. La surface intérieure intercepte les clics pour éviter de sélectionner le territoire terrestre caché sous elle.

Une traversée entre masses est choisie d’après leurs points côtiers les plus proches parmi les échantillons du contour. La distance enregistrée dans ce cas mesure la séparation côtière. Sur les autres liaisons, elle mesure la distance angulaire entre les centres. Ces données documentent le graphe ; elles ne créent pas une nouvelle tarification des ordres.

Les descriptions du climat, de la gravité, de la durée du jour et des atmosphères enrichissent le dossier. **Elles n’ajoutent aucun multiplicateur de combat, de déplacement ou de production.** L’aspect radioactif, corrosif ou orageux n’introduit pas de dommage supplémentaire à lui seul. Les données qui modifient réellement le jeu sont le format, les régions, les sites, leurs revenus, les contrôles initiaux et les liaisons autorisées.

## Architecture déterministe

| Fichier | Responsabilité |
|---|---|
| [`clanWarPlanetGeneratorV103.ts`](../../app/game/systems/clanWarPlanetGeneratorV103.ts) | Recette stricte, codes, tirages avec verrous, descriptions, stratégie, définitions et cache. |
| [`clanWarPlanetGeographyV103.ts`](../../app/game/systems/clanWarPlanetGeographyV103.ts) | Allocation des régions, Voronoï, côtes, hydrologie, routes et mesures de surface. |
| [`planetMaterialProfilesV103.ts`](../../app/game/systems/planetMaterialProfilesV103.ts) | Contrat indépendant des huit réglages de matière. |
| [`clanWarProceduralV103.ts`](../../app/game/systems/clanWarProceduralV103.ts) | Dispatcher versionné V102/V103, résumé léger et résolution. |
| [`clanWarDeploymentV103.ts`](../../app/game/systems/clanWarDeploymentV103.ts) | Raccordement des départs, des effectifs et des stocks au moteur. |
| [`clanWarPlanetDraftV103.ts`](../../app/game/systems/clanWarPlanetDraftV103.ts) | Préréglages et préparation explicite d’une variante V103. |
| [`PlanetGeneratorV103.tsx`](../../app/game/PlanetGeneratorV103.tsx) | Brouillon, verrous, aperçu appliqué, dossiers et partage. |
| [`clanWarGeneratedCatalogV103.ts`](../../app/game/systems/clanWarGeneratedCatalogV103.ts) | Catalogue mixte V102/V103 limité à 24 raccourcis. |

### Partition et conservation des frontières

La géographie alloue d’abord au moins trois territoires à chaque région. L’équilibre choisit des tailles égales à une unité près ou des poids variables déterministes. Des boîtes disjointes placent les masses dans l’arrangement demandé. Leur centre, leur extension et le rayon maximal des côtes gardent chaque masse à l’intérieur de sa boîte.

Une partition de Voronoï découpe une source convexe en régions, puis chaque région en territoires. Les graines locales utilisent un échantillonnage espacé ; les cellules compactes reçoivent une relaxation plus forte que les cellules organiques. Les voisins ne sont donc pas limités à quatre directions d’un quadrillage.

La source est un polygone à 128 sommets. Un éventail de triangles la transforme en une côte étoilée dont les rayons sont strictement positifs et les angles ordonnés. Chaque triangle conserve son orientation. Les fjords utilisent des baies dont le nombre, l’espacement, la largeur et la profondeur varient avec la graine et la masse. Les frontières sont découpées aux rayons de cet éventail avant la transformation : le maillage et le contour suivent ainsi la même application affine par morceaux. Des sommets partagés sont raccordés une seule fois, et les segments communs utilisent une géométrie identique dans les deux sens.

L’éventail et les sommets source emploient la même grille de quantification. Cette règle évite de créer un segment parasite d’un millionième de degré entre une extrémité de cellule et un rayon presque confondu. Les coordonnées de sortie sont arrondies à six décimales. Les tests conservent une graine extrême qui révélait ce défaut, avec les mêmes critères d’intersection.

Les îles d’une même région sont reliées en premier par un arbre couvrant. Un second arbre relie le monde entier ; des passages côtiers proches ajoutent des possibilités locales. Le choix repose sur les côtes produites, et non sur des numéros de territoires prédéfinis.

### Hydrologie et chemins

Les bassins sont dessinés à l’intérieur d’une cellule, à distance de son marqueur. Un chenal utilise un ruban sinueux le long d’une frontière partagée, ou un trajet intérieur à une cellule lorsqu’une telle frontière n’est pas disponible. Les cellules utilisées sont réservées afin que les features d’hydrologie ne se chevauchent pas. La transformation commune les garde à l’intérieur de leur terre.

Les points des routes suivent une interpolation de grand cercle, échantillonnée par pas angulaires bornés. Les longitudes sont déroulées lors du passage de l’antiméridien ; le renderer utilise les copies périodiques nécessaires. L’intersection avec les polygones hydrologiques emploie exactement ces mêmes points, y compris les copies périodiques des bassins.

`hydrology.coveredFraction` additionne la surface sphérique des polygones intérieurs disjoints. `landFraction` soustrait cette fraction de la surface des contours extérieurs. Le pourcentage affiché reflète donc également la terre retirée par l’hydrologie.

### Indépendance des modules et identité

La construction géographique dépend de la graine, des comptes de territoires et de régions, de leur équilibre, de la forme des cellules, de la répartition, de l’arrangement, de la couverture et du profil côtier. L’hydrologie ajoute ses découpes et classe les routes qui les franchissent ; elle conserve la partition et les adjacences sous-jacentes.

Changer **le biome, sa diversité, le milieu de surface, l’un des huit réglages de matière ou l’atmosphère** conserve les coordonnées, les frontières, les routes, les milieux intérieurs et la stratégie. Les noms géographiques utilisent aussi des sous-flux indépendants. Les textes décrivant le milieu et les climats suivent naturellement les matières et biomes choisis.

Le format canonique est `proc-v103-<graine base36>-<21 indices>-<contrôle>`. Chaque champ est encodé ; aucun registre extérieur n’est requis. La validation refuse les clés supplémentaires, les champs absents, les valeurs inconnues, les graines hors uint32 et les comptes incompatibles. Le parseur exige un réencodage identique et limite la longueur à 64 caractères. La somme de contrôle détecte des erreurs de transcription ; elle n’est pas une signature d’authenticité.

`generateWarPlanetV103` produit un monde sans état externe. Les résultats sont gelés récursivement. `generatedWarPlanetV103` ajoute un cache LRU de 24 mondes ; une éviction ne change pas la reconstruction. `describeWarPlanetV103` extrait le nom, le sous-titre, les matières de base et le format sans construire de maillage ni occuper le cache. Le catalogue peut ainsi présenter 24 noms sans générer 24 grands fronts.

### Règle d’évolution après publication

**Un même code V103 doit continuer à retrouver la même géographie, les mêmes sites et le même graphe.** L’ordre des enums, les règles d’allocation, les routes, l’hydrologie et les métadonnées stratégiques font partie du contrat de sauvegarde. Une modification de leur interprétation nécessite une nouvelle version, qui conserve le parseur et le générateur V103 pour les anciens fronts.

Les références SHA256 du test de domaine couvrent trois codes fixes : le défaut, un petit archipel et une grande carte à graine uint32 maximale avec le cas de raccord numérique. Elles incluent les coordonnées, les appartenances, les routes dessinées, l’hydrologie et la stratégie. Les noms éditoriaux sont exclus. Une correction ultérieure ne doit pas remplacer ces empreintes pour masquer une modification d’un monde publié.

Les trois références V102 restent inchangées. Les évolutions du renderer doivent préserver les contrats d’indépendance et la restitution des recettes historiques ; elles ne doivent pas modifier silencieusement les données du front.

## Raccourcis et protection des archives

Le catalogue local retient au plus **24 codes V102 ou V103**. Il reprend les raccourcis V102 existants sans réécrire leur ancien index. La sortie d’un raccourci de la liste ne supprime jamais son archive de guerre. Un code permet toujours de retrouver le front tant que son archive est présente sur l’appareil.

Les sessions et leurs écritures utilisent les protections communes du jeu : validation, confirmation après stockage, réservation contre les écritures concurrentes et refus des écrivains obsolètes. Une session modifiée dont l’archive n’est pas confirmée n’est pas sacrifiée pour ouvrir un autre front. Les messages distinguent un front archivé d’une progression encore en mémoire.

Si seul l’enregistrement du raccourci échoue, **Ouvrir avec ce code sans mémoriser le raccourci** reste une action explicite. Cette action ne prétend pas que la progression a été sauvegardée. Le stockage reste local au navigateur et à l’appareil ; cette version n’ajoute pas de synchronisation distante.

## Vérification

Les [tests de domaine V103](../../tests/planet-generator-v103.test.mjs) contrôlent les codes et les verrous, les 27 formats dans les deux modes de répartition, les graphes régionaux et globaux, les bases et revenus, les polygones, l’hydrologie, les chemins dessinés, l’indépendance des matières et la reconstruction depuis le code. Les vérifications précises de frontières couvrent les deux formes de cellules, les quatre répartitions et les graines par défaut et maximale. Le domaine V102 conserve ses propres références.

Les tests [d’intégration](../../tests/planet-generator-integration-v103.test.mjs), [de brouillon](../../tests/planet-generator-draft-v103.test.mjs) et [de matières](../../tests/planet-material-profiles-v103.test.mjs) complètent le domaine. Les rapports et captures de navigateur dans ce dossier accompagnent la revue. `verification.json` consigne les résultats finaux et les commandes réellement exécutées ; `ui-qa.json` détaille le parcours dans l’interface. Les validations de rendu et leur périmètre sont présentés dans [MATERIALS.md](MATERIALS.md).

Depuis la racine du dépôt :

```sh
node --test --test-isolation=none tests/planet-generator-v103.test.mjs tests/planet-generator-v102.test.mjs
node --test --test-isolation=none tests/planet-generator-integration-v103.test.mjs tests/planet-generator-draft-v103.test.mjs tests/planet-material-profiles-v103.test.mjs
npm run typecheck
```

Pour le parcours navigateur, démarrer le serveur Next puis fournir l’exécutable Chromium :

```sh
CHROMIUM_EXECUTABLE_PATH=/chemin/vers/chromium node scripts/qa-planet-generator-v103.mjs
```

Les résultats Chromium/WebGL logiciel ne constituent pas une validation sur tous les GPU mobiles physiques. Les comptes définitifs figurent dans les rapports, afin de ne pas confondre des tests unitaires, des parcours navigateur et des assertions de pixels.

## Limites actuelles

- Le nombre de combinaisons est très grand mais fini : les graines sont des uint32 et les modules possèdent des choix bornés. Des graines différentes peuvent produire des formes apparentées.
- Les côtes sont des silhouettes étoilées déformées. Les territoires sont une partition stratégique de surface ; ils ne proviennent pas d’une simulation de tectonique, d’érosion ou de relief physique.
- Les bassins et chenaux sont des découpes géométriques localisées. Ils ne constituent pas un réseau fluvial ramifié avec sources, pente, débit, confluences et embouchures simulés. Ils ne créent pas de bataille navale ni de règles physiques de fluide.
- Les régions sont cohérentes dans le graphe, mais une région insulaire peut occuper plusieurs terres. La graine ne garantit pas un équilibrage compétitif identique d’un front à l’autre.
- Le globe ne génère pas de terrain 3D physique, de volumes de roche, de bathymétrie navigable ou de collisions fondées sur une carte de hauteur.
- Les matières sont artistiques. Les PNG séparés ne forment pas un jeu PBR mesuré avec normales, rugosité, métal et hauteur. Leur taille d’export ne crée pas de détail au-delà des images sources.
- Le scattering, la météo et les aurores sont des effets visuels modulaires ; ils ne simulent pas une atmosphère volumétrique physique et ne modifient pas les combats.
