# V126 — Terre réelle, cohérence des 1 200 missions, IA et multijoueur

## Périmètre livré (sans faux statut de niveau fini)

La Terre est un monde fixe, distinct du générateur de planètes extraterrestres. Le module clanWarEarthV126.ts utilise les paramètres de l'ellipsoïde WGS84, le vrai tracé des terres Natural Earth 1:110m (domaine public) et un registre d'emplacements des films. Natural Earth est une **carte mondiale généralisée**, pas une reproduction 1:1 des bâtiments, rues, montagnes ou scènes. Un passage à des tuiles géographiques 1:10m et aux plans 3D de chaque site reste nécessaire pour le niveau de détail local.

Le module clanWarWorldClimateV126.ts classe **1 200 scénarios** suivant leur monde :
- Terre : tous les 400 hommages de lieux réels, et seulement les épisodes dont la référence situe les événements sur Terre ; les combats nouvellement inventés ne sont pas des événements canoniques.
- Planète originale : aucune ville terrestre n'y est placée à partir de son simple nom d'inspiration.
- Planète extraterrestre de la fiction : Predator: Badlands et Predators n'ont aucune coordonnée terrestre, même si la production a eu lieu en Nouvelle-Zélande ou ailleurs.
- Continuité ambiguë : le monde reste indéterminé, sans épingle GPS inventée.

## Placements des films : récit vs tournage

| Œuvre | Où placer le récit | Précision |
| --- | --- | --- |
| Predator (1987) | Jungle d'Amérique centrale ou du nord de l'Amérique du Sud (suivant continuité) | Région, Val Verde fictif, pas de point de ville |
| Predator 2 (1990) | Los Angeles, Californie | Centre de ville WGS84 34.0522 N, 118.2437 O |
| Prey (2022) | Grandes Plaines comanches | Région, pas de point précis publié |
| Alien vs. Predator (2004) | Île Bouvet, Atlantique Sud, **au nord du continent antarctique** | Centre de l'île 54.4167 S, 3.3333 E ; temple fictif |
| AVP: Requiem (2007) | Gunnison, Colorado | Centre-ville 38.5458 N, 106.9253 O ; Vancouver est lieu de tournage |
| The Predator (2018) | Amérique du Nord, lieux forestiers et installations | Région, pas de géocode inventé |
| Predator: Killer of Killers (2025) | Scandinavie viking ; Japon féodal ; ciel de la WWII | Trois zones/époques, pas de villes arbitraires |
| Predators (2010) | Planète de réserve | Hors Terre |
| Predator: Badlands (2025) | Monde extraterrestre hostile | Hors Terre, Nouvelle-Zélande = tournage |

Références : https://www.20thcenturystudios.com/movies/predator-2 ; https://press.hulu.com/shows/prey/ ; https://npolar.no/en/themes/bouvetoya/ ; https://www.allocine.fr/film/fichefilm-120576/secrets-tournage/ ; https://www.20thcenturystudios.com/movies/predator-killer-of-killers ; https://thewaltdisneycompany.com/news/predator-badlands/ ; https://www.naturalearthdata.com/about/terms-of-use/ .

Les 400 hommages ont le bon identifiant de monde Terre, mais **ne disposent pas tous de géocodage** : un lieu non vérifié porte le statut name-only et n'est pas projeté arbitrairement sur la carte.

## Règles climatiques

Sur chaque fiche V120, la couche V126 fournit climat, biome, météo revalidée, sol, liquide, saison, risque et justification :
- Désert chaud : chaleur, vent, sable/roche, rares eaux attestées ; **pas de neige naturelle**.
- Désert polaire : froid et sec ; distinction obligatoire d'un Sahara chaud.
- Climat polaire : gel, neige éventuelle et eaux froides, pas de mousson tropicale.
- Montagne : altitude, gel et neige **conditionnels à la saison**.
- Forêt humide et marais : pluie et végétation ; pas de banquise tropicale.
- Zones côtières : embruns, marées, sel ; neige uniquement si latitude et saison adaptées.
- Terre urbaine : asphalte, pierre et bâti, pas de terrains aliens aléatoires.
- Monde alien : ses liquides et son climat restent de la fiction, sans duplication automatique d'une métropole humaine.

La météo V120 d'origine et sa correction V126 sont conservées côte à côte pour audit. Une classification lexicale approximative n'est jamais assimilée à une mesure météorologique vérifiée.

## 6 000 variantes internes de combattants IA

Pour chaque mission : cinq profils de l'IA (prudente, équilibrée, agressive, défensive, renforts). Les plans utilisent les identifiants de vrais rôles W3-U du projet, une seed stable, budget de PC, phases, nombre de groupes, effectif, camouflage du renseignement, tactique de terrain, comportement des appareils en panne de courant et conditions de progression.

Limites : infiltration avec peu de sentinelles, RTS avec plafonds de détachements, assaut en vagues sans création magique, Outer Ops dont les ennemis ne sont révélés qu'après rapport. W3-U24 réservé au froid et W3-U25 au milieu aquatique. Tous ces ensembles sont actuellement des **plans de rencontres**, pas 6 000 combats créés ni animés.

## Multijoueur préparé — pas encore en ligne

Mode coopératif 2 à 4, PvP clans jusqu'à 4 contre 4, mode guerre asynchrone jusqu'à 12 joueurs ; au plus 4 spectateurs. Une équipe ne peut pas appartenir à deux personnes en même temps. Chaque commande porte ID, acteur, séquence, tick, révision et nonce, avec contrôle de l'identité par l'autorité serveur et refus des replays. La vue ne révèle pas les équipes ennemies cachées.

Le panneau Bible V6 permet une **démonstration locale du contrat de salon** ; les identifiants de démonstration ne sont ni des recrues de campagne ni des clients connectés. Aucun WebSocket, serveur autoritaire, matchmaking, reconnexion ou transaction multijoueur de campagne n'est encore livré. Le mode réseau réel demandera ces services et leurs tests d'intégration.

## Intégration et audit

- Système : app/game/systems/clanWarEarthV126.ts, clanWarWorldClimateV126.ts, clanWarEnemyProfilesV126.ts, clanWarMultiplayerV126.ts.
- UI : EarthPlanetMapV126, ClanWarGeoAiV126, entrée Terre dans PlanetGeneratorV103, nouvel onglet Bible V6.
- Tests : tests/clan-war-geo-ai-multiplayer-v126.test.mjs et workflow .github/workflows/clan-war-geo-ai-v126.yml.
- Export : scripts/export-clan-war-geo-v126.mjs produit Geo_1200.csv, IA_6000.csv, Complet.json et Audit.json.

Le statut honnête reste : monde Terre géoréférencé **au niveau globe**, 1 200 géographies réconciliées, 6 000 profils d'IA préparés, protocole multijoueur conçu ; les scènes 1:1, les placements GPS de tous les lieux, les animations et les matchs réseaux sont encore à développer.
