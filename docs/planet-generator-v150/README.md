# V150 — atlas d'altitudes RG16 adossé aux vraies terres générées

Avant V150, le générateur V115 avait six rayons physiques, 120 silhouettes d'îles/continents/régions, les terres/milieux, les tests de climat V146 et d'intégrité V149, mais **aucune altitude par point terrestre exploitable**. Les mentions de montagnes, falaises, plaines et plateaux restaient descriptives.

## Ce qui est ajouté

- `clanWarPlanetReliefV150.ts` calcule une **étude d'altitude spatiale** à partir du **masque régional sec V124 déjà utilisé par le globe et les exports**. Les lacs, chenaux, océans et autres surfaces non terrestres n'obtiennent aucun relief inventé.
- La distance aux côtes est dérivée du raster périodique en longitude (antiméridien) et borné en latitude. Les distances tiennent compte du rayon physique V115 en kilomètres et de `cos(latitude)` ; le pôle ne crée pas un continent en miroir.
- Le relief de référence dépend d'une altitude plafond facultative (500–20 000 m), de l'escarpement (0–100 %), d'une graine de crêtes et des **13 vrais biomes**. Le bruit est échantillonné en coordonnées cartésiennes de la sphère : continuité sur la couture du planisphère et au globe.
- Le masque hauteur utilise **R = octet fort, G = octet faible, B = zéro, A = 255 uniquement sur terre**. Lecture en mètres : `round(((R*256+G)/65535)*altitudePlafondMetres)`. Le PNG standard reste à 8 bits par canal mais préserve ainsi un index de hauteur 16 bits dans deux canaux.
- `PlanetReliefV150.tsx` permet de changer les paramètres en temps réel, réorganiser les crêtes, afficher le planisphère coloré et les altitudes moyennes/maximales **par vraie région**, exporter deux PNG et le rapport JSON de décodage.
- Les mondes V102/V103 sans rayon physique continuent d'afficher un message d'indisponibilité au lieu de fabriquer des mesures métriques.
- Les tests de domaine vérifient les côtes, les chenaux et lacs sans hauteur, la couture géographique, le minimum de variation montagne/plat, les six rayons, le codage RG16 et la sortie déterministe.

## Nature de ces reliefs

Il s'agit d'une **couche d'authoring graphique** cohérente avec les côtes réelles du jeu. Ce n'est PAS une résolution de tectonique, de gravité, de formation géologique, d'érosion, de calcul des pentes praticables ou de collision 3D. Les altitudes sont originales et non reconnues comme les altitudes d'une planète filmique Predator/AVP 1:1.

Le système ne change aucun code V102/V103/V115, aucune cellule, bassin, route, ressource, unité ou sauvegarde existante. Pour intégrer un relief jouable, il faudra des lois de collision, des rampes, des modèles de terrain et des tests spécifiques.
