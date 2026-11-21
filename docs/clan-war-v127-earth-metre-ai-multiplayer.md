# V127 — Terre métrique, 24 000 phases tactiques et PvP local

Version du 30 octobre 2026, PR #37, empilée sur #36 (Terre et climats), #34 (1 200 fiches) et #29 (quatre gameplays).

## Terre en mètres — ce qui est réalisé

Le module clanWarEarthMetricV127.ts utilise la Terre WGS84, a = 6 378 137 m et b = 6 356 752,314245 m. Il convertit latitude, longitude et hauteur vers ECEF et repère local Est/Nord/Haut, et calcule des géodésiques en mètres. Les lieux de film référencés restent Los Angeles, Gunnison et l'île Bouvet (centre de ville/île, pas position de caméra). Predator 1987 et Prey restent des régions sans point GPS unique attesté ; Badlands et planète réserve de Predators ne sont pas sur Terre.

**Pas une copie 1:1 des rues :** les contours Natural Earth 1:110m sont adaptés au globe, non aux infrastructures locales. Les routes, altitudes, intérieurs et décors d'époque doivent être fournis par une source autorisée avant de pouvoir se déclarer au niveau 1:1. Une position réelle de 1 mètre dans le repère mathématique ne prouve pas que la scène visuelle existe.

Sources : https://www.naturalearthdata.com/about/terms-of-use/ ; https://operations.osmfoundation.org/policies/tiles/ ; https://osmfoundation.org/wiki/Attribution_Guidelines.

## Six mille configurations d'IA et quatre phases

Chaque fiche V120 possède cinq profils IA déterministes, approfondis par clanWarEncounterDirectorV127.ts : reconnaissance, engagement, réalisation des objectifs, extraction. Total : 6 000 profils et 24 000 phases. Le modèle conserve les unités W3-U, les limites PC, les accès existants, les contraintes de courant, l'environnement et l'absence de révélation des adversaires cachés des Outer Ops.

Les conditions climatiques sont appliquées avant les équipes : pas de neige naturelle dans un désert chaud ; biome et risques physiques cohérents, avec distinction des déserts polaires. Un groupe IA mentionné dans le catalogue est un **plan de rencontre** : aucun PNJ n'est créé par le seul chargement de son dossier.

## Protocole réseau et démonstration PvP locale

Le protocole V126 prévoit des salons coopératifs, PvP clans et missions asynchrones. La V127 ajoute un match de test local 9×6 pour deux joueurs sur le même appareil : commande propriétaire, mouvement légal d'une case, tir en ligne de vue, couvert, brouillard de guerre, numéro de séquence anti-rejeu et occupation réelle de l'objectif pendant trois ticks.

Le panneau PvP de la Bible reste un entraînement local sur figurants. Le salon HTTP ci-dessous réutilise son terrain et ses règles dans un processus indépendant.

## Livrables et validation

- app/game/systems/clanWarEarthMetricV127.ts : calcul de distance et repères WGS84.
- app/game/systems/clanWarEncounterDirectorV127.ts : 6 000 contrats / 24 000 phases.
- app/game/systems/clanWarMultiplayerPracticeV127.ts : simulation PvP locale déterministe.
- app/game/ClanWarMultiplayerPracticeV127.tsx : panneau interactif depuis la Bible V6.
- tests/clan-war-metric-encounters-v127.test.mjs et tests/clan-war-multiplayer-practice-v127.test.mjs.
- scripts/export-clan-war-v127.mjs : CSV 6 000 profils et JSON complets par gameplay, plus ancrages Terre et audit.

La CI GitHub de la PR #37 exécute les tests, le typage, le lint et publie l'archive. Le niveau 1:1 des bâtiments/films, l'IA générée réellement dans les cartes et le multijoueur de campagne demeurent **à construire**, en respectant la chronologie, les sources géographiques et les droits sur les assets.

## Salon HTTP d’exercice à deux joueurs

Le salon V127 héberge un duel de figurants sur le plateau existant. Le serveur contrôle le plateau, décide des ordres, avance le tick toutes les cinq secondes et transmet à chaque joueur sa vue. La manche dure au plus 60 ticks. Trois ticks consécutifs sur l’objectif donnent la victoire. À l’échéance, le total des ticks de contrôle départage les camps et un total identique donne un nul. Un repli du seul pion d’un camp donne la victoire à l’autre. Les deux joueurs reçoivent le même résultat final. Deux connexions authentifiées peuvent jouer chacune pour son camp dans la même manche. Après une coupure du client, la même clé redonne accès à l’état conservé en mémoire par le processus.

Depuis la racine du dépôt avec Node 22 et les dépendances installées, générez deux clés de session indépendantes et démarrez le salon.

```sh
export YAUTJA_CLAN_PRACTICE_HUNTER_TOKEN=$(node -p 'require("node:crypto").randomBytes(32).toString("base64url")')
export YAUTJA_CLAN_PRACTICE_RIVAL_TOKEN=$(node -p 'require("node:crypto").randomBytes(32).toString("base64url")')
node scripts/serve-clan-war-practice-v127.mjs
```

Transmettez à chaque joueur la clé de son camp par un canal privé. Dans son terminal, le joueur charge sa clé dans `YAUTJA_CLAN_PRACTICE_TOKEN`. Il peut ensuite lire le plateau et déplacer son pion sur une case adjacente.

```sh
node scripts/play-clan-war-practice-v127.mjs state
node scripts/play-clan-war-practice-v127.mjs move 2 1
```

Pour un rival en position initiale, la case adjacente vers le centre est `6 1`. Le client accepte aussi `attack x y`, `hold` et `retreat`. Après un conflit de révision, relisez le plateau avant de confirmer un nouvel ordre.

Le processus écoute sur `127.0.0.1:8787` (`YAUTJA_CLAN_PRACTICE_PORT` pour choisir un autre port). Si l’hébergeur configure un proxy HTTPS, les joueurs peuvent y accéder via `YAUTJA_CLAN_PRACTICE_URL`. `YAUTJA_CLAN_PRACTICE_TURN_LIMIT` permet de choisir une durée de 2 à 20 000 ticks. Le site et le panneau local ne démarrent aucun processus de salon.

La recette est `node --test tests/clan-war-practice-server-v127.test.mjs`. Elle ouvre un socket TCP et vérifie le contrôle de deux identités, le masquage, le refus de requêtes invalides, les séquences, la concurrence, la lecture après réouverture de connexion et le tick serveur.

Le salon V127 applique l’arbitrage de `CW130-NET-013` à son duel d’exercice. Les critères de coopération `CW130-NET-003`, `CW130-NET-004` et `CW130-NET-005` restent ouverts. Le service WebSocket public, les comptes de campagne, la persistance SQL, les reçus et l’horloge signés, ainsi que la recette sur deux appareils restent à réaliser. Le redémarrage du processus ouvre une nouvelle partie d’exercice.
