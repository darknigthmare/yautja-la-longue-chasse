# Château orbital et arrivée planétaire

Livraison du 4 novembre 2026. Version jouable annoncée : **1.2.0**. Branche : `feat/wolf-castle-arrival-20261104`, construite sur le travail Clan Ship de la PR #104.

## Château du Roi, système Wolf

La destination `wolf-orbital-castle` possède son propre état de visite. Le bouton du pont personnel ouvre l’approche orbitale, puis la baie royale. La coque personnelle choisie reste liée à la visite. Le retour s’effectue depuis cette baie.

Le lieu comprend neuf salles reliées : baie, sas, vestibule, galerie des trophées, audience, conseil, archives, cour d’épreuve et passage latéral. Le chasseur équipé se déplace dans un espace physique, avec collisions au sol, recherche de chemin au clic, seuil de proximité et ordre de profondeur. Le plan indique les connexions; il ne téléporte pas le joueur.

La première boucle complète est l’audience royale : consulter le protocole, rejoindre le Roi, entendre l’ordre, puis l’accepter ou le différer au conseil. Les archives enregistrent leur lecture. La cour propose une épreuve déterministe en trois sceaux, avec tentative et progression sauvegardées. L’épreuve ne distribue pas de récompense de campagne inventée. Un futur donjon de combat, ses adversaires et son économie restent un chantier distinct.

Les contrôles suivent les raccourcis remappés du jeu, le clavier, la manette et les commandes tactiles. Les paramètres et la perte de focus suspendent le contrôleur. Les portes et les stations demandent que le chasseur ait atteint leur zone d’interaction.

## Arrivée avant la chasse

Le lancement d’une mission crée un départ persistant avant de monter `HuntCanvas`. Le nom de planète, la destination, le biome, la coque personnelle, l’apparence, l’équipement, le gauntlet, la difficulté, le numéro de rencontre et l’identifiant du run sont figés ensemble. Le vaisseau et le chasseur proviennent des catalogues et du rig déjà employés par le jeu.

| Plan | Début (s) | Fin (s) | Action |
|---|---:|---:|---|
| Orbite | 0 | 7 | Espace et planète de destination |
| Titre | 7 | 13 | Nom dynamique de la planète |
| Vaisseau | 13 | 23 | Passage de la coque équipée |
| Éjection | 23 | 31 | Libération de la capsule et jet séparé |
| Descente | 31 | 41 | Trajectoire et rapprochement |
| Atmosphère | 41 | 49 | Nuages et rentrée atmosphérique |
| Impact | 49 | 57 | Capsule au sol et poussière dans le biome |
| Sortie | 57 | 62 | Porte séparée, sortie du chasseur, relais au jeu |

Cette durée de 62 secondes est un montage conçu pour le jeu. Elle n’est pas présentée comme un relevé exact des timecodes du film.

La pause, la reprise, le retour au menu et l’action Passer utilisent la même machine d’état. Les grands sauts d’horloge sont suspendus. Le relais naturel et le relais abrégé conservent le même run et le même point d’apparition. La cinématique ne fabrique aucun snapshot de chasse.

L’état `complete` protège la courte interruption possible entre la confirmation du départ et la première sauvegarde réelle de la chasse. Lors d’une mort, d’un rejet de reprise ou d’un résultat terminal, ce point de récupération est retiré durablement avant la suppression du snapshot correspondant. Une ancienne session ne peut ni effacer une nouvelle chasse, ni attribuer deux fois son résultat.

## Images individuelles

Le lot contient **27 fichiers PNG individuels** : 19 pour le château et 8 pour l’arrivée. Les 21 sprites et effets séparés possèdent un vrai canal alpha. Les six fonds restent opaques. Chaque image a été générée séparément avec `image_gen.imagegen`; aucun atlas n’a été découpé.

Le roi, son trône en os et l’estrade sont trois fichiers indépendants. Les portes possèdent un cadre et un battant séparés. La capsule de vol, la capsule ouverte au sol, sa porte, les nuages, le jet, la chaleur et la poussière sont également des éléments distincts. Les planètes, les vaisseaux personnels et le rig équipé existants sont réutilisés.

Les PNG originaux sont conservés intacts. Les dimensions réelles, boîtes visibles, pivots conseillés, empreintes SHA-256 et prompts exacts sont consignés dans les deux manifestes. Le rendu tient compte des marges transparentes sans modifier les fichiers. La correspondance des chemins dans le code et la validité technique des PNG sont contrôlées séparément de la validation artistique humaine.

## Références et adaptations

- [Architecture yautja, château du Roi](https://www.avpcentral.com/yautja-architecture-predator-structures-and-statues) : silhouette pyramidale, motifs orange, fenêtre circulaire et description du trône osseux. Source secondaire avec illustration reproduite du comic.
- [Guide du Predator King](https://www.avpcentral.com/predator-king-guide) : identification du souverain de *Predator vs. Black Panther* et distinction des autres figures royales.
- [Marvel, Predator vs. Black Panther (2024), numéro 1](https://www.marvel.com/comics/issue/120985/predator_vs_black_panther_2024_1_variant/variant) : référence éditoriale officielle de la série.
- [Ouverture vidéo demandée](https://www.youtube.com/watch?v=43SCLM6cGTc) : inspiration narrative pour le départ, la séparation de la capsule et l’arrivée. La vidéo n’a pas pu être visionnée intégralement dans cette session; l’exactitude plan par plan n’est pas certifiée.

L’organisation des neuf salles, les dialogues, les gardes, les contrôles d’accès et l’épreuve des sceaux sont des adaptations de gameplay. Le château est une destination distincte du vaisseau mère de clan. La nouvelle capsule décline l’identité AVP déjà présente au catalogue; elle n’est pas annoncée comme une reconstitution certifiée de la capsule du film de 1987.

## Contrôles reproductibles

- `tests/wolf-castle.test.mjs` : transitions, salles, audience, épreuve, cheminement et collisions.
- `tests/planet-arrival.test.mjs` : séquençage, pause, reprise, identité figée et relais unique.
- `tests/wolf-arrival-save.test.mjs` : vrais modules de sauvegarde, slots et archives, refus d’états incompatibles et d’écritures non confirmées.
- `tests/game-client-ship-flow.test.mjs` : handlers réels de lancement, persistance et résultats terminaux.
- `scripts/qa-wolf-arrival-browser.mjs` : parcours du vrai `GameClient`, captures et contrôle des assets demandés.
- `.github/workflows/wolf-castle-arrival.yml` : environnement CI dédié, dépendances épinglées, contrôles et preuves navigateur.

Les résultats effectifs sont consignés dans `verification.json` et dans le classeur de production. Le lancement local de Chromium a été refusé par la politique d’exécution; aucun succès navigateur local n’en est déduit. La CI doit qualifier ces parcours sur son propre environnement.

## Points de production encore ouverts

La validation artistique humaine du Roi, du trône et des intérieurs reste à faire. Le mixage sonore propre à cette séquence n’est pas livré dans ce lot. Le donjon de combat du château, ses rencontres et ses récompenses demandent une conception et une recette supplémentaires. Les fichiers et les systèmes livrés constituent la visite jouable et la séquence d’arrivée intégrée.
