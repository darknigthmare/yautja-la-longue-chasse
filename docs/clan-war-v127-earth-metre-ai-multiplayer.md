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

Le local PvP est un entraînement sur figurants de simulation : pas de serveur public, de matchmaking, de 4 contre 4 complet, d'authentification distante, de synchronisation multi-appareils, ni de gains de la campagne. Le vrai multijoueur devra avoir un hôte autoritaire, des comptes, un canal WebSocket, la validation serveur des mouvements et des inventaires, la reprise des déconnexions et des reçus persistants.

## Livrables et validation

- app/game/systems/clanWarEarthMetricV127.ts : calcul de distance et repères WGS84.
- app/game/systems/clanWarEncounterDirectorV127.ts : 6 000 contrats / 24 000 phases.
- app/game/systems/clanWarMultiplayerPracticeV127.ts : simulation PvP locale déterministe.
- app/game/ClanWarMultiplayerPracticeV127.tsx : panneau interactif depuis la Bible V6.
- tests/clan-war-metric-encounters-v127.test.mjs et tests/clan-war-multiplayer-practice-v127.test.mjs.
- scripts/export-clan-war-v127.mjs : CSV 6 000 profils et JSON complets par gameplay, plus ancrages Terre et audit.

La CI GitHub de la PR #37 exécute les tests, le typage, le lint et publie l'archive. Le niveau 1:1 des bâtiments/films, l'IA générée réellement dans les cartes et le serveur multijoueur distant demeurent **à construire**, en respectant la chronologie, les sources géographiques et les droits sur les assets.
