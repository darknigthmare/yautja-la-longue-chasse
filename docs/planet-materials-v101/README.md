# Textures modulaires des planètes — Guerre des clans V101

Ce pack habille les **30 théâtres planétaires du registre V96** avec des matières bitmap générées indépendamment et des effets séparés. Les continents, les 36 territoires par monde, les routes et les sauvegardes utilisent toujours les données existantes de la guerre des clans.

Base inspectée : `main` au commit `536ac53335e440747f6eccedd2cd757d1f817a99`, le 21 octobre 2026. Ces planètes sont les créations du projet pour la guerre des clans. Elles sont distinctes des 24 entrées de la carte galactique de chasse ; Nivalis n'est pas Nivalis-K, et Thalassa n'est pas Thalassa-8.

## Contenu du pack

| Élément | Quantité | Format et usage |
|---|---:|---|
| Matières terrestres | 13 | PNG natifs opaques, 1 254 × 1 254 |
| Matières entre les continents | 10 | PNG natifs opaques, 1 254 × 1 254 |
| Calques atmosphériques | 7 | PNG natifs RGBA, 1 254 × 1 254, alpha réel |
| Versions optimisées pour le jeu | 30 | WebP 512 × 512, alpha conservé |
| Recettes planétaires | 30 | Matières, palette, densité nuageuse, aérosols, aurores et émission |
| Exports par planète | 288 PNG | Cartes des couches, masque des continents et vues du globe |

Les 30 PNG natifs occupent **106 544 077 octets**. Les 30 versions utilisées par le jeu occupent **3 558 370 octets**, soit environ 3,39 Mio pour toute la bibliothèque optimisée. Les 288 exports par planète occupent **151 141 595 octets** : neuf couches ou compositions communes aux 30 mondes, plus douze émissions et six aurores. Les exports haute résolution lisent les PNG d'origine. Le jeu charge les WebP à la demande.

Les matières terrestres couvrent : forêts tempérées, jungle, toundra, neige, désert, basalte refroidi, plateaux salins, montagnes, terres littorales, marais, cristaux, réseau fongique et roches irradiées. `land-ocean` désigne la roche des terres littorales ; l'eau est dans `surface-water`.

Les surfaces séparées couvrent : eau, acide, banquise, sable, lave, saumure, nappes radioactives, cristaux, spores et brume. `surface-mist` est volontairement opaque : elle représente le milieu entre les continents. Les brumes atmosphériques sont des calques RGBA distincts.

## Les 30 compositions

| Planète | Terres | Surface |
|---|---|---|
| Korthas | Tempérées | Mers de cobalt |
| Thalassa | Jungle | Lagons turquoise |
| Vitriol | Marais | Acide émeraude |
| Nivalis | Neige | Banquise azurée |
| Serak | Désert | Dunes ocre |
| Pyroclaste | Volcaniques | Lave incandescente |
| Halycon | Salines | Saumure rose |
| Uranth | Irradiées | Nappes radioactives |
| Améthys | Cristaux | Océan de cristaux violets |
| Mycélia | Fongiques | Nappes de spores |
| Nébulis | Montagnes | Brume des vallées |
| Abyssia | Littorales | Fosses indigo |
| Chloris | Marais | Eaux tourbeuses |
| Cryovant | Toundra | Fjords gelés |
| Ochria | Désert | Poussière ocre |
| Obsidra | Volcaniques | Lave bleue |
| Salarka | Salines | Saumure ambrée |
| Radixa | Irradiées | Bassins cyan irradiés |
| Prismara | Cristaux | Cristaux lilas |
| Sporion | Fongiques | Pollen doré |
| Aérune | Tempérées | Brumes forestières |
| Azurielle | Littorales | Eau bleu clair |
| Vénéfra | Marais | Acide magenta |
| Boralis | Neige | Banquise blanche |
| Dunara | Désert | Dunes dorées |
| Ignara | Volcaniques | Lave violette |
| Rosalith | Salines | Saumures corail |
| Viridia | Irradiées | Nappes jaune électrique |
| Iolexia | Cristaux | Prismes bleu clair |
| Nyctéra | Fongiques | Spores violettes |

Les couleurs sont lues après application des profils classiques du registre. Cela conserve notamment les corrections de Chloris, Cryovant, Ochria, Aérune, Boralis et Dunara.

## Parties indépendantes et ordre de composition

1. **Fond de surface** : image pleine sous les continents, utile pour déplacer ou modifier les terres sans laisser de trou.
2. **Terres** : matière terrestre avec alpha issu des contours V97 ; le masque séparé vaut blanc sur terre et noir ailleurs.
3. **Ombre jour/nuit** : obscurcissement indépendant, calculé à partir d'un soleil fixe dans le repère planétaire.
4. **Lueur de surface** : lave, nappes radioactives, spores et cristaux, suivant la recette.
5. **Nuages** : cirrus, systèmes orageux ou nuages bas, distincts du sol.
6. **Aérosols** : poussière, cendres, brumes ou spores ; densité propre à la planète.
7. **Aurores** : texture d'émission indépendante, limitée à des bandes polaires pour les recettes concernées.
8. **Diffusion atmosphérique** : halo de bord, coloration côté éclairé et frange du terminateur.

Le renderer utilise la composition alpha `source-over` pour ces couches artistiques. Les exports RGBA conservent un alpha droit ; les échantillons sont mélangés en alpha prémultiplié pendant le filtrage pour éviter les franges de couleur. Le fond de surface est plein ; la couche terrestre se pose par-dessus. Les modes `albedo` et `composite` sont des assemblages de consultation, tandis que les couches individuelles restent disponibles.

Les fichiers `clouds-cirrus`, `clouds-storm`, `clouds-low`, `haze-dust`, `haze-ash`, `particles-spores` et `aurora` sont les sept images atmosphériques indépendantes. Le premier essai de cendres, opaque, a été rejeté et remplacé par une génération avec transparence vérifiée.

## Intégration dans le jeu

- **Portraits et catalogue** : les 30 mondes utilisent les mêmes recettes et les mêmes contours que l'atlas.
- **Globe et planisphère** : les matières sont ancrées dans le repère de la planète. Tourner le globe ne fait pas glisser les détails sur l'écran.
- **Relief naturel / Contrôle des clans** : l'atlas permet de privilégier les textures ou les couleurs de possession. Les frontières, glyphes, routes et interactions restent au-dessus du rendu décoratif.
- **Atmosphère, nuages, brumes/aurores et éclairage** : modules activables séparément ; aucune modification du moteur stratégique ni de la météo de gameplay.
- **Repli** : les motifs SVG existants restent utilisables si WebGL ou une image ne peut pas être chargé.
- **Chargement** : portraits rendus à proximité de la zone visible, un seul contexte WebGL partagé, caches bornés, déduplication des téléchargements en cours et aucune boucle d'animation permanente.

Les coordonnées et les masques viennent de `clanWarCoastlinesV97.ts`. Les cartes utilisent une projection longitude/latitude, nord en haut. Les PNG de matières sont des carrés de matériaux ; leur échantillonnage sur le globe est triplanaire dans le repère du monde, avec répétition miroir. Cette méthode masque les raccords des images natives et évite un pincement de texture aux pôles. Les contours géographiques restent indépendants des matières.

## Galerie et exports

La route **`/planet-materials-v101`** présente un inspecteur de couches et les 30 planètes. Elle permet de changer de planète, passer du globe au planisphère, tourner le globe, masquer les effets et télécharger un PNG. Cette route de consultation est distincte des menus de campagne.

Les assets résident dans `public/game/planets/v101/` :

- `materials/` : les 30 PNG natifs générés ;
- `runtime/` : les 30 WebP légers ;
- `manifest.json` : inventaire, empreintes et recettes ;
- `planets/<id>/` : compositions et parties exportées pour chaque monde ;
- `exports.json` : inventaire des fichiers exportés ;
- `index.html` : aperçu statique du pack, utilisable avec les fichiers voisins.

Les cartes exportées sont des **1 024 × 512**. Les globes et leurs calques atmosphériques sont des **512 × 512**, cadrés à longitude −25°, latitude 15°, rayon égal à 43 % de la largeur. Les masques de terres sont fournis séparément. L'API de la galerie peut également produire d'autres dimensions jusqu'à 4 096 pixels, sans prétendre ajouter du détail aux images sources.

## Reproduction

```sh
node scripts/build-planet-material-assets-v101.mjs
npm run typecheck
node --test --test-concurrency=1 tests/planet-material-v101.test.mjs tests/planet-material-export-v101.test.mjs tests/clan-war-atlas-ui-v96.test.mjs
```

Avec le serveur Next démarré sur le port 3101 et un navigateur Chromium disponible :

```sh
CHROMIUM_EXECUTABLE_PATH=/chemin/vers/chromium node scripts/qa-planet-material-renderer-v101.mjs
CHROMIUM_EXECUTABLE_PATH=/chemin/vers/chromium node scripts/qa-clan-war-atlas-materials-v101.mjs
CHROMIUM_EXECUTABLE_PATH=/chemin/vers/chromium node scripts/export-planet-materials-v101.mjs
```

Les scripts de rendu et d'export acceptent l'URL du serveur dans `YAUTJA_PLANET_MATERIAL_URL`. Le contrôle de l'atlas crée son propre serveur temporaire avec le composant réel. Le script de construction ne régénère pas les images : il vérifie les originaux, encode les WebP et reconstruit les inventaires. Les prompts complets et observations visuelles sont dans `land-generation.json`, `surface-generation.json` et `atmosphere-generation.json`.

## Suivi de fiabilité — 22 octobre 2026

Le pack initial a été intégré par la [PR #8](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/8). Le suivi part de `main` au commit `017f3bd8d37457ee56d0cfeb78da9835c6388b8f`.

### Compatibilité graphique et indépendance des calques

Le shader conserve la précision `highp` lorsque le GPU la propose et utilise `mediump` sinon. Dans ce second chemin, les coordonnées sont normalisées avant multiplication par les dimensions de sortie et les divisions par alpha emploient un seuil adapté à cette précision. Les longitudes sont également ramenées dans un tour avant leur transmission au shader.

Les calques `surface` et `emissive` chargent seulement leur matière de surface ; `land` charge seulement sa matière terrestre. Une texture étrangère au calque peut donc être indisponible sans empêcher son export. Les assemblages `albedo` et `composite` requièrent toujours les deux matières, et les sources réellement nécessaires restent contrôlées.

Le [rapport du renderer après correction](renderer-followup-qa.json) contient **12 contrôles réussis**, sans erreur JavaScript ou WebGL : compilation et rendu de la branche `mediump`, six effets transparents, désactivation réversible des modules, carte de 4 096 × 64 pixels, rotations sur plusieurs tours, réponses HTTP 404 sur chaque famille de matières, caches bornés et restauration du contexte. Les 13 019 échantillons de masque géographique restent conformes. Les deux captures du renderer ont été inspectées. La branche `mediump` est forcée dans Chromium/SwiftShader pour le test ; les arrondis d'un GPU mobile physique peuvent différer.

### Reprise des exports

Les PNG, `exports.json` et `index.html` sont écrits dans un fichier temporaire du même répertoire, synchronisés puis remplacés par renommage. Un PNG n'est publié qu'après validation de ses dimensions et de son alpha. Une erreur d'écriture ou de renommage préserve le fichier de destination précédent ; une interruption brutale peut laisser un fichier temporaire inutilisé. Cette garantie porte sur chaque fichier, pas sur une transaction unique du pack entier ni sur une coupure matérielle de stockage.

L'option `--resume` vérifie toujours l'empreinte des sources et les empreintes des fichiers réutilisés. Un manifeste JSON invalide donne maintenant une erreur explicite invitant à relancer sans `--resume`. Sans cette option, la régénération n'analyse pas l'ancien manifeste et peut donc réparer cet état. Le marqueur final du manifeste n'est écrit qu'après le remplacement réussi du catalogue HTML.

Les tests de projection, de recettes et de fiabilité des exports sont désormais inclus dans le workflow GitHub existant `V94 regression tests`.

Validation locale de ce suivi : **TypeScript et ESLint ciblé réussis ; 18 tests Node réussis**, dont les huit nouveaux scénarios de publication et de reprise. Les tests couvrent notamment un arrêt réel par `SIGKILL` pendant l'écriture, une erreur après un premier fragment, un échec de renommage, un manifeste tronqué, une empreinte périmée et un PNG invalide qui doit laisser l'image précédente intacte. Le groupe a été exécuté sous Node 24 avec `--test-isolation=none` ; la CI conserve son exécution standard sous Node 22.

Un [export réel de Korthas suivi de sa reprise](export-followup-qa.json) a également réussi : neuf PNG, 4 717 197 octets, manifeste et galerie valides. La reprise a conservé les neuf empreintes SHA256 **et** les dates de modification des PNG ; aucun fichier temporaire ne subsiste. Le statut `complete: false` est attendu pour cette sortie de vérification limitée à une planète sur trente, conservée séparément du pack publié.

### Provenance et taille du pack publié

Les **288 PNG exportés et leur empreinte `sourceFingerprint` conservent la provenance de la génération initiale du 21 octobre**. Ils ne sont pas présentés comme régénérés avec ce correctif. Puisque le renderer a changé, une reprise de cette archive avec `--resume` est refusée normalement ; une nouvelle génération doit commencer sans cette option, de préférence dans un répertoire distinct avec `YAUTJA_PLANET_MATERIAL_EXPORT_OUTPUT`.

Les originaux et les exports restent dans le pack pour permettre les téléchargements indépendants, la galerie statique et les exports haute résolution. Leur présence augmente la taille du dépôt et du déploiement. Le jeu continue à charger à la demande uniquement les WebP de `runtime/` ; les 3,39 Mio indiqués plus haut décrivent cette bibliothèque optimisée, pas la taille totale du pack distribué.

## Vérifications du pack initial — 21 octobre 2026

- TypeScript et ESLint ciblé : succès.
- Tests Node : 10 réussites, dont 5 pour les matières et 5 pour l'atlas existant.
- Renderer dans Chromium avec WebGL logiciel : 9 contrôles réussis, dont la transparence des couches, le chargement à la demande, les caches bornés et la restauration du contexte.
- Comparaison des terres avec les masques géographiques : 13 019 pixels intérieurs/extérieurs échantillonnés, aucune différence.
- Atlas réel à 1 440 pixels et à 390 pixels : 10 contrôles réussis, sélection d'un territoire et d'un voisin, changement globe/planisphère, modes de couleur et absence de débordement horizontal.
- Exports : dimensions, alpha, empreintes SHA256 et unicité des 30 albédos, terres, masques et globes vérifiés. Catalogue inspecté sur fond sombre dans Chromium.

Les rapports JSON et la capture du catalogue sont fournis à côté de ce document. Le build de production complet n'a pas été exécuté dans ce checkout partiel.

## Limites de fidélité et de validation

Le scattering est une **approximation artistique de diffusion au bord de l'atmosphère**, inspirée des comportements Rayleigh/Mie ; ce n'est pas une simulation physique volumétrique ni une carte de diffusion mesurée. Les matières sont des images de couleur artistiques : elles peuvent contenir des ombres locales peintes et ne fournissent pas de normal map, hauteur, métal ou rugosité PBR mesurés.

La fidélité des géographies est celle des contours déjà présents dans ce projet. Aucun ajout ne certifie une cartographie officielle de la franchise. Les 30 mondes partagent des familles de matières, avec leurs propres couleurs, continents et paramètres d'atmosphère ; il ne s'agit pas de 30 nouvelles textures photographiques totalement indépendantes pour chaque couche.

Les tests ciblés couvrent ce rendu et son raccordement à l'atlas. Ils ne constituent pas un audit intégral du jeu, ni une validation sur toutes les cartes graphiques ou tous les téléphones. Le rapport de vérification joint distingue les contrôles automatiques et les vues effectivement inspectées.
