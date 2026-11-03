# Guerres territoriales : 30 mondes V96

**Guerres des clans** propose 30 théâtres jouables : 16 mondes classiques et
14 mondes exotiques. Chaque monde possède six régions et 36 territoires,
avec son relief, ses côtes, ses noms et ses surfaces non jouables. Les terres
occupent environ la moitié à trois quarts du globe ; les régions voisines et
les détroits courts évitent de laisser deux continents isolés dans un immense océan.

Les 29 nouveaux théâtres ont chacun leur graphe de déplacement par frontières
communes et détroits courts. Korthas conserve ses définitions et ses routes
historiques. La refonte V97 des côtes conserve tous les graphes V96 et les
archives déjà commencées. Les routes affichées sont celles que le moteur
autorise ; une mer, une coulée de lave ou une banquise de fond ne devient pas
un territoire à conquérir. Les textures distinguent ces milieux des terres
contrôlées, dont les couleurs et les motifs suivent les factions.

## Formes des continents V97

Les six régions sont des divisions administratives. Elles se répartissent
sur deux à six continents physiques, avec des tailles différentes ; une
région peut partager un continent avec ses voisines ou franchir un détroit.
Les anciennes bandes et plaques répétées sont remplacées par des masses
asymétriques, des golfes, des caps et des péninsules. Leurs contours utilisent
12 études radiales de côtes terrestres issues de Natural Earth, adaptées au
globe et aux liaisons du jeu. Les matières et les couleurs de faction gardent
leurs rôles respectifs.

Voir [les références terrestres et de mondes fictifs](planet-coastline-references-v97.md)
pour leur provenance, leurs licences et les limites de ces inspirations.
L'atlas et le catalogue affichent le nombre de continents réels, séparément
du nombre de régions. Les nouvelles côtes ne changent ni les identités ni
les routes, les effectifs ou les conditions de victoire.

## Biomes et surfaces

Le biome décrit les terres ; le milieu de surface décrit les espaces qui les
séparent. Une planète enneigée peut ainsi avoir des côtes rocheuses jouables
et des fjords gelés non jouables. Exemples issus du catalogue :

| Biome des terres | Monde | Milieu non jouable voisin |
| --- | --- | --- |
| Tempéré | Aérune | Brumes forestières |
| Jungle | Thalassa | Lagons turquoise |
| Toundra | Cryovant | Fjords gelés |
| Neige | Boralis | Banquise blanche |
| Désert | Serak | Mers de dunes ocre |
| Volcanique classique | Pyroclaste | Lave incandescente |
| Salin classique | Salarka | Saumure ambrée |
| Montagne | Nébulis | Brume des vallées |
| Océanique | Abyssia | Fosses indigo |
| Marécageux classique | Chloris | Eaux tourbeuses |
| Marécageux exotique | Vitriol | Acide émeraude |
| Cristallin | Améthys | Océan de cristaux violets |
| Fongique | Mycélia | Nappes de spores |
| Irradié | Radixa | Bassins cyan irradiés |

Les dix familles de surfaces sont l'eau, l'acide, la glace, le sable, la lave,
la saumure, les radiations, les cristaux, les spores et la brume. Les variantes
exotiques comprennent aussi l'acide magenta de Vénéfra, la lave bleue
d'Obsidra, les cristaux lilas de Prismara et les spores violettes de Nyctéra.
Ces identités visuelles ne promettent pas un nouveau système de dégâts ou de
météo : les ordres utilisent les règles stratégiques de l'exercice existant.

## Utiliser le sélecteur

Depuis le menu, ouvrir **Guerres des clans**, puis le front planétaire. Le
sélecteur **Planète active**, les flèches précédente/suivante et **Explorer les
30 planètes** permettent de choisir un monde. Le catalogue propose une
recherche textuelle, un filtre classique/exotique et un filtre par milieu de
surface. Le choix attend la confirmation des écritures en cours.

Le globe orientable et le planisphère donnent accès aux mêmes territoires.
Choisir un départ, une destination reliée, les personnes et leur ordre, puis
confirmer le tour pour résoudre les actions. La reconnaissance, les prises et
les changements de contrôle restent propres au monde sélectionné.
Sur les 30 théâtres, la domination demande de tenir les 36 sites intacts
et ravitaillés avec une garnison apte dans chaque région, pendant deux fins
de tour avec entretien payé. Le panneau précise aussi les conditions de région
et les sites du corridor correspondant aux routes du monde actif. Voir
[les conditions des objectifs](v96-planetary-objectives.md).

## Archives locales et provenance

Chaque monde conserve une partie locale indépendante. Korthas garde son
ancienne archive ; les 29 autres mondes possèdent chacun leur propre clé.
Changer de planète conserve les fronts déjà ouverts. **Nouvel exercice**
demande confirmation et remplace seulement le front sélectionné. Le canyon
et les formations restent des exercices communs séparés.

Ces archives libres restent sur cet appareil, hors des exports de campagne
et des archives de compte cloud. Un import ou un remplacement de campagne
ne les transfère pas et ne les efface pas. Aucun matériel, territoire,
combattant ou gain d'expérience de ces exercices n'est versé dans la chasse
principale. L'interface distingue une archive locale confirmée d'un front
encore en mémoire ou en cours d'enregistrement.

Les mondes et leurs cartes sont des créations du projet, conçues pour rester
compatibles avec l'univers Yautja ; ils ne sont pas présentés comme des
planètes officielles ni comme des reproductions canoniques à l'échelle 1:1.
Les biomes classiques prolongent le vocabulaire du
[registre galactique](../app/game/galaxyRegistry.ts). Les nouvelles géographies
ne remplacent pas celles de la Bible ou de la campagne : le théâtre Nivalis
n'est pas identifié à Nivalis-K ou Nivalis-C, et Thalassa n'est pas assimilée
aux îles végétales mobiles de Thalassa-8. Voir aussi
[la distinction entre création du projet et canon](audit-lore-longevity-v25.md).

## Vérifier

```sh
node --test tests/clan-war-coastlines-v97.test.mjs tests/clan-war-planets-v96.test.mjs tests/clan-war-planets-engine-v96.test.mjs tests/clan-war-atlas-ui-v96.test.mjs tests/clan-war-planet-archive-boundaries-v96.test.mjs
npm run typecheck
npm run lint
npm run build
```

Les tests couvrent le catalogue et les biomes, la densité et les connexions,
les ordres et archives isolés, le rendu de l'atlas et la conservation des
30 archives pendant les opérations de campagne et de cloud.

Avec le jeu démarré, le parcours navigateur ouvre le menu réel, visite les
30 mondes, vérifie les filtres, joue une reconnaissance, recharge les archives
et contrôle le clavier ainsi que le format mobile :

```sh
node scripts/qa-clan-war-planets-v96.mjs
```

`YAUTJA_QA_BASE_URL` choisit le serveur (par défaut `http://127.0.0.1:3000`),
`CHROMIUM_EXECUTABLE_PATH` le navigateur (par défaut `/usr/bin/chromium`) et
`YAUTJA_PLANETS_QA_OUTPUT` le dossier des preuves (par défaut
`outputs/qa-clan-war-planets-v96/`). La régression d'hydratation utilise
séparément une archive préparée par le vrai moteur ; elle ne constitue pas
une campagne complète jouée.

Le contrôle natif de persistance tourne sur une origine locale isolée, avec
des états synthétiques et les vrais IndexedDB, localStorage et Web Locks :

```sh
AUDIT_CHROME_EXECUTABLE=/usr/bin/chromium node scripts/qa-clan-fence-browser-v94.mjs
```

Il conserve les 100 courses historiques de chacun des trois domaines et
ajoute la confirmation/relecture des 30 archives, une course entre deux
onglets de Thalassa avec Vitriol indépendant et la réparation d'une écriture
interrompue sur Vitriol. Le rapport se trouve dans
`outputs/qa-audit-v94/clan-fence-browser.json`.

Dans le cloud, les processus Node, Chromium et le serveur local doivent être
autorisés par le sandbox. Le lanceur Node doit réellement exécuter les
sous-tests ; un résultat qui ne compte que les fichiers ne suffit pas à
confirmer leur réussite.

Pour comparer les silhouettes et reprendre les captures du même parcours :

```sh
node scripts/render-war-coast-atlas-v97.mjs
node scripts/qa-clan-war-coasts-v97.mjs --phase=after
```

Le premier produit un SVG des trente silhouettes à partir des polygones du
jeu, en une seule couleur pour juger leurs formes. Le second capture les
huit mondes de l'audit, leurs globes et planisphères, ainsi que les vues
mobiles. Les preuves sont enregistrées dans `outputs/qa-planet-coasts-v97/`.
Le parcours V96 des trente mondes reste applicable aux nouvelles côtes.
