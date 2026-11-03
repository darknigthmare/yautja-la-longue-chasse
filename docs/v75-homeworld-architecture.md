# Architecture et devantures du monde natal · V75

Le défaut vérifié était concret : treize lieux secondaires reprenaient la même façade de halle malgré des usages différents. Ce lot leur donne treize PNG OpenAI natifs indépendants, puis ajoute62 meubles séparés aux43 devantures. Les6 ailes principales V72 et les trois sources de façade des24 maisons V64 sont conservées. Les37 plans intérieurs V74, leurs passages, services et sauvegardes ne changent pas.

## Références et limites de lore

[RPG Maker · Mapping Towns](https://www.rpgmakerweb.com/blog/mapping-towns) sert de référence de conception pour relier fonction, matériaux et accès lisibles. [Unity · 2D Sorting](https://docs.unity3d.com/2021.1/Documentation/Manual/2DSorting.html) documente le tri au pivot. Ce sont des principes de level design et de rendu, pas des preuves sur les usages domestiques yautja. La projection du projet reste yaw0/pitch35° et la stature conventionnelle adulte100 unités/2,3m.

Cette cité, ses boutiques, refuges et relais sont des adaptations originales cohérentes avec le jeu. Aucune carte canonique1:1 ou coutume universelle de l’espèce n’est annoncée. La bibliothèque de matériaux et de formes reprend les véritables images V64/V72 déjà présentes ; ni armes canoniques ni trophées possédés ne sont peints gratuitement dans ces nouveaux extérieurs. Les meubles scellés sont décoratifs, sans loot ni action de soin, rang ou achat implicite.

## Géométrie source

Chaque façade conserve l’enveloppe570×340 et les coordonnées historiques de son entrée. Son canevas natif1536×1024 est mis à l’échelle uniformément, sans compression verticale. Alpha réellement lue au seuil200, dimensions et SHA256 sont dans `app/game/data/homeworldArchitectureArtV75.json`. `scripts/measure-homeworld-architecture-v75.mjs` inspecte les PNG sans modifier leurs pixels.

Le seuil est le bord avant réel du sol de l’entrée ; la fondation latérale est mesurée séparément. Il n’existe aucun override logique caché. Leur différence produit le petit retrait avant réel1,94–10,70 unités. La collision utilise précisément ces sources via le resolver intégré au modèle de ville. Les43 approches et les98 routines ont été contrôlées sur cette géométrie finale.

La largeur de passage mesure les pieds des jambages au sol, et non le linteau plus étroit des portails trapézoïdaux. Le protagoniste peut passer ; cette cote n’est pas une assertion de rectangle noir constant sur toute la hauteur. Les11 premières corrections ont refait les ouvertures trop basses directement avec imagegen. Une retouche supplémentaire a réellement élargi le marché, dont l’ouverture initiale ne faisait qu’environ70 unités : la correction finale mesure122,94 unités, sans faux pivot ou largeur déclarée pour cacher le problème.

| Lieu | Ouverture utile largeur×hauteur | Retrait avant réel | Identité visuelle |
|---|---:|---:|---|
| Contrôle des quais |100,48×189,24|8,56|Fenêtres de contrôle cyan, ailes basses|
| Halle des échanges |122,94×172,86|4,55|Deux auvents rouges, étals latéraux|
| Refuge des galeries |98,43×208,31|2,00|Voûte compacte, auvent réparé|
| Mausolée des prises |102,45×138,65|5,37|Arc étagé et niches vides|
| Bastion des gardiens |97,43×181,05|10,70|Deux tourelles basses, murs renforcés|
| Porte de la Fosse |121,24×148,31|1,99|Fins courbes et entrée de tribune|
| Sanctuaire des rites |98,78×185,30|1,94|Nervures cérémonielles, alcôves|
| Atelier des convois |91,45×165,46|3,38|Évents, ateliers latéraux ouverts|
| Dépôt des convois |135,10×163,94|2,65|Volumes bas fermés et renforts|
| Abri des convois |102,27×180,47|10,49|Deux auvents de halte|
| Relais des remparts hauts |117,40×243,71|8,47|Petite vigie arrière surélevée|
| Vigie des remparts |105,51×201,47|3,33|Toit polygonal, fentes cyan|
| Relais des remparts bas |111,50×184,80|4,08|Toit bas, auvent asymétrique|

## Meubles indépendants

Les19 lieux civiques reçoivent chacun2 objets adaptés à leur fonction ; les24 maisons reçoivent un banc, un contenant fermé ou des réserves selon leur variante réelle repos/repas/stockage. Ces62 modules réemploient9 cellules du kit transparent natif V72 : banc, registre, établi, gong, porte-parures, jars scellés, veilleuse, caisses de convoi et tenture locale. Le siège du chef et les couches de soins restent à l’intérieur.

Le pivot de chaque meuble repose au bord avant de la fondation du bâtiment. Toute son emprise arrière est dans un volume latéral déjà solide ; aucune largeur de chemin n’est consommée, aucune collision n’est exemptée, aucun obstacle invisible supplémentaire n’est ajouté. Le canal de porte reste libre avec la marge corporelle24 unités. Les tailles uniformes vont de0,32 à0,70 selon le type : un petit banc domestique ne devient pas un établi de plusieurs mètres. Le renderer applique la projection du sol une seule fois, puis trie le meuble à sa véritable profondeur.

Le placement précis, sa cellule/pivot natifs, la SHA et les contraintes physiques sont décrits par75 nouvelles fiches `HOMEWORLD_ARCHITECTURE_CODEX_V75` :13 façades et62 meubles. Le collecteur du codex est branché par l’agent principal. Ces modules n’ajoutent pas d’enseigne HTML qui ferait doublon avec le chantier de navigation V75.

## Intégration

- `systems/homeworldArchitectureArtV75.ts` est un registre pur, sans import du modèle de ville. `homeworldBuildingIdentityV75(id)` renvoie l’identité native de ces13 IDs, sinon null. Priorité : V72, puis V75, puis ancienne source V64.
- `systems/homeworldArchitectureV75.ts` dérive les62 objets de la géométrie réelle et expose les75 fiches du codex.
- `HomeworldArchitectureV75.tsx` rend les vraies cellules indépendantes du kit V72. `HomeworldCityScene.tsx` le monte après les façades avec le même pivot de profondeur.
- Aucun changement de Hub, backend, sauvegarde, récompense, dialogue ou conditions de services n’appartient à ce lot.

## Validation et preuve séparée

Contrôles source :17 tests d’architecture PASS (13 métrologies/SHA/alpha, formes conservées,62 volumes latéraux, codex et JSX natif). Neuf sondes dans chaque intérieur de porte vérifient une alpha≥245 et une cavité sombre : la rue ne peut pas transparaître dans ces ouvertures verticales. Deux corrections OpenAI supplémentaires ont remplacé les fonds involontairement transparents des quais et du sanctuaire ; ce contrat ne s’applique pas aux arches régionales ouvertes. Régression ciblée :60 tests PASS incluant43 portes et10 seuils A*,98 routes/poses contrôlées en continu à pas0,5,37 plans V74 reliés avec corps entier et6 principales ailes inchangées. ESLint ciblé et TypeScript sont PASS.

La recette `scripts/verify-homeworld-architecture-v75.mjs` marche réellement au clavier vers chaque façade, entre par sa porte, vérifie l’ancien plan V74, mesure l’appui des meubles dans le DOM et capture le rendu. Elle couvre aussi3 maisons préservées et le marché mobile393×852, puis vérifie HTTP200/SHA de13 PNG. Les rapports candidat, compilé et public sont distincts. Une compilation, un push ou un déploiement ne sont pas affirmés par ces tests source ; ils appartiennent aux portes de publication de l’agent principal.

La porte approchée a priorité sur les petits textes directionnels régionaux : leur indication « Repère · rejoindre le seuil extérieur » ne doit plus recouvrir le nom de la façade, notamment « Halle des échanges ». Le viewport expose son ID de porte active, tandis que la balise native indépendante reste visible. Les grandes annotations des véritables seuils régionaux, les images et les collisions ne sont pas retirées.

Le contrôle navigateur distingue expressément les textes des balises portant `data-homeworld-prop-id`. La première vérification a révélé qu’un masque générique `> span` cachait aussi ces balises physiques, rendues par `HomeworldNativePropV64` : le masque doit les exclure. La recette renforcée exige désormais porte active exacte, chaque texte monté masqué, chaque balise montée visible avec son image chargée, et des quantités identiques. Au marché, un contrôle non vide sur ordinateur et mobile empêche un succès sans indication réellement montée. Seul le rapport exécuté après la correction du sélecteur peut attester l’ensemble de ce contrat ; les anciens rapports ne prouvent pas la conservation des balises.

Le rapport compilé final du 2 octobre 2026, `work-local/v75/qa/architecture-local/report.json`, atteste 18 contrôles PASS et 17 captures, sans erreur JavaScript ni réponse HTTP en échec. Sur ordinateur 1440×1000 au marché, la porte active est `market-canopy` ; les 3 textes régionaux montés sont masqués et les 3 balises natives sont visibles avec leurs images chargées. En portrait 393×852, le même contrôle porte sur 1 texte et 1 balise réellement montés, conformément au cadrage. Les deux captures `market-canopy-native-frontage.png` et `market-canopy-mobile-native-frontage.png` ont été relues : nom et seuil lisibles, absence du chevauchement, balise physique conservée. Le protagoniste natif reste entièrement dans le viewport mobile, avec une taille affichée 31,94×80,15 pixels.

Les 13 images servies par ce build répondent HTTP200 et correspondent exactement à leurs SHA de source. Les 13 passages vers les plans V74 et 3 maisons préservées restent validés ; la régression globale de cette même source passe 2502/2502 tests. Ces preuves sont locales et compilées, distinctes du déploiement et des futurs contrôles publics. Les captures et rapports antérieurs sont conservés dans `work-local/v75/qa-before-label-fix` et `work-local/v75/qa-before-beacon-selector-fix` ; ils ne remplacent pas ce rapport final.

La ville conserve une représentation orthographique avec façades sud ; ce lot ne crée pas des rotations de maisons ni des vues intérieures multiples. Les clips civils, paysages, navigation et dialogues ont leurs propres validations. Le rapport de génération conserve les chemins d’images originales et les instructions effectives ; les candidats rejetés sont archivés sans destruction dans `work-local/v75/architecture-candidates`, hors paquet public.
