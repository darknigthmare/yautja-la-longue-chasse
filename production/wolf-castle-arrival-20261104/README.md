# Château orbital et arrivée planétaire

Reprise du 4 novembre 2026. Version suivie : **1.3.0**. Le parcours château et arrivée est qualifié par la [CI finale 41827785792](qa/browser-41827785792/report.json) sur le code `881b66da` (local `132b2f1f`). Branche : `feat/wolf-castle-continuation-20261104`. La visite et l’arrivée 1.2.0 sont conservées, avec leurs 27 PNG individuels. La branche reprend `77fb73a`, la fusion `f002879` de `main` (`eeb2362`) et la mise à jour du Clan Ship `eb7e5c0`. Le [point de reprise](POINT_DE_REPRISE.md) indique la source courante et les correctifs issus de la recette. Le travail Clan Ship de la PR #104 est conservé.

## Château du Roi, système Wolf

La destination `wolf-orbital-castle` possède son propre état de visite. Le bouton du pont personnel ouvre l’approche orbitale, puis la baie royale. La coque personnelle choisie reste liée à la visite. Le retour s’effectue depuis cette baie.

Le lieu comprend neuf salles reliées : baie, sas, vestibule, galerie des trophées, audience, conseil, archives, cour d’épreuve et passage latéral. Le chasseur équipé se déplace dans un espace physique, avec collisions au sol, recherche de chemin au clic, seuil de proximité et ordre de profondeur. Le plan indique les connexions; il ne téléporte pas le joueur.

La première boucle complète est l’audience royale : consulter le protocole, rejoindre le Roi, entendre l’ordre, puis l’accepter ou le différer au conseil. Les archives enregistrent leur lecture. La cour conserve l’épreuve déterministe en trois sceaux, avec tentative et progression sauvegardées.

La reprise 1.3.0 ajoute une épreuve de combat non létale, distincte des sceaux : Sentinelle du Seuil, Gardien du Cercle, puis Maître de la Cour. Le joueur se déplace, attaque, pare les estocs et esquive les balayages. Les annonces et les fenêtres de récupération rendent les attaques lisibles. Les trois rencontres et leurs transitions sont couvertes par les tests comportementaux. La [CI finale](qa/browser-41827785792/report.json) confirme également la victoire sur les trois gardes par les commandes ordinaires, la défaite, la reprise, le focus natif et le mobile. Le dossier de l’épreuve suit les tentatives, victoires, temps et dégâts reçus. Ce dossier ne distribue aucun butin et ne change pas les ressources de campagne. Un donjon scénarisé avec boss, récompenses et quêtes demeure une extension distincte.

Les contrôles suivent les raccourcis remappés du jeu, le clavier, la manette et les commandes tactiles. Les paramètres et la perte de focus suspendent le contrôleur. Les portes et les stations demandent que le chasseur ait atteint leur zone d’interaction.

Le format de visite V2 ajoute les coordonnées au sol, l’orientation, une révision et le point de reprise du combat. Une visite V1 doit migrer vers une entrée sûre en conservant son audience et ses sceaux. Un checkpoint d’une autre campagne, d’une ancienne salle ou d’une ancienne révision doit être refusé. Les tests et la recette de ce raccordement restent séparés des résultats historiques V1.

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

Le lot contient désormais **30 fichiers PNG individuels** : les 19 images du château et les 8 images de l’arrivée déjà livrées, plus 3 poses de combat du garde royal. Les 24 sprites et effets séparés possèdent un vrai canal alpha. Les six fonds restent opaques. Chaque image a été générée séparément avec `image_gen.imagegen`; aucun atlas n’a été découpé.

Le roi, son trône en os et l’estrade sont trois fichiers indépendants. Les portes possèdent un cadre et un battant séparés. La capsule de vol, la capsule ouverte au sol, sa porte, les nuages, le jet, la chaleur et la poussière sont également des éléments distincts. Les planètes, les vaisseaux personnels et le rig équipé existants sont réutilisés.

Le rendu masque les angles noirs des planètes RGB dans un cadre circulaire. L’arrivée en jungle reprend la bande du fond correspondant au point d’apparition, selon le découpage déjà employé dans la chasse ; les sept autres biomes conservent leur fond entier. Ces ajustements de composition réutilisent les images existantes.

Les poses `royal-guard-ready`, `royal-guard-windup` et `royal-guard-lunge` reprennent l’identité du garde existant. Le personnage, son arme entière et ses pieds restent dans un fichier par pose. Leur manifeste est `art-manifest-combat-v2.json` et leurs prompts exacts sont repris dans le classeur.

Les PNG originaux sont conservés intacts. Les dimensions réelles, boîtes visibles, pivots conseillés, empreintes SHA-256 et prompts exacts sont consignés dans les manifestes. Le rendu tient compte des marges transparentes sans modifier les fichiers. Les 30 copies WebP sont produites et contrôlées : **7 312 410 octets** au lieu de **56 851 298 octets**, soit **87,14 % de réduction**. `scripts/build-wolf-runtime-art.mjs` et `runtime-art-v2.json` attestent des dimensions et de chaque pixel alpha identiques sur les 30 paires, ainsi que des empreintes inchangées des PNG. Les trois nouvelles poses n’ont aucun pixel alpha128 sur le bord de l’image. La validité technique et le chargement sont distincts de la validation artistique humaine.

## Sons originaux

La séquence d’arrivée reçoit neuf signaux ponctuels synthétisés : titre de destination, passage du vaisseau, éjection, descente, rentrée, impact, ouverture de la capsule et deux pas. L’impact partage le même instant de contact que l’image. Les ambiances couvrent l’orbite, le vaisseau, la descente, l’atmosphère et la surface selon le biome.

Le château possède six ambiances adaptées à l’approche et aux salles. Le combat reçoit quatorze signaux, dont deux annonces distinctes pour l’estoc et le balayage. Ils suivent les événements réellement simulés : attaque, contact, parade, esquive, dégâts, endurance et résultat. Les pas, portes et sceaux du château ne disposent pas de sons dédiés dans ce lot.

Le moteur commun possède le volume et le cycle de vie des voix. Les 32 tests audio passent dans la [suite finale de 247 tests](qa/browser-41827785792/workflow-job.log) : arrêt à la pause, suspension, changement de salle, checkpoint et résultat unique sont notamment contrôlés. Le run audio local initial et ses commandes restent conservés dans `qa/local-checks-1.3.0.json`. La recette navigateur est réussie ; l’écoute du mixage reste ouverte. Ces sons sont des créations synthétisées pour le jeu, sans piste extraite du film.

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
- `tests/wolf-castle-audio.test.mjs`, `tests/planet-arrival-audio.test.mjs`, `tests/scene-audio.test.mjs` : directeurs audio, événements et durée de vie des voix.
- `scripts/qa-wolf-arrival-browser.mjs` : parcours du vrai `GameClient`, captures et contrôle des assets demandés.
- `.github/workflows/wolf-castle-arrival.yml` : environnement CI dédié, dépendances épinglées, contrôles et preuves navigateur.

Les résultats effectifs sont consignés dans `workbook-evidence.json` et le classeur. La [CI finale 41827785792](qa/browser-41827785792/workflow-result.json), sur `881b66da` (code local `132b2f1f`, arbre `54804a2c`), réussit **247/247 tests**, TypeScript complet, ESLint strict et l’audit des 30 paires PNG/WebP. Aucun échec ni test ignoré. Les 29 tests château/combat, les 42 tests de sauvegarde/intégration et les 32 tests audio sont inclus dans les 247 ; ils ne s’ajoutent pas au total. Les [huit tests world-screens](qa/composition-132b2f1f/world-screens-result.json) et l’[audit géométrique de 24 rectangles](qa/composition-132b2f1f/background-frames-audit.json) restent deux preuves complémentaires distinctes.

Le [build de production](qa/build-132b2f1f/build-result.json) réussit sur la même source locale en **243,649 secondes** : webpack, TypeScript, neuf pages et contrôle CSS PIT. Les contrôles conditionnels native-origin et static-output ne s’exécutent pas hors du chemin de build Vercel prévu. Ce résultat n’est pas un constat de déploiement Vercel.

Le [rapport navigateur final](qa/browser-41827785792/report.json) réussit **24/24 contrôles** : 23 parcours fonctionnels puis le contrôle des exceptions et des ressources. Il comprend les trois gardes vaincus par les commandes ordinaires, la défaite/reprise, les checkpoints, les changements natifs d’onglet, le mobile à 320 et 390 pixels, le menu/reload, le refus d’enregistrement puis sa nouvelle tentative, le relais abrégé unique et les huit plans jusqu’au relais naturel à 62 secondes. Il observe **zéro exception JavaScript** et **zéro ressource visuelle demandée manquante** sur 185 chemins. Parmi les 30 WebP du lot, 29 sont sollicités ; `low-fog.webp` n’est pas demandé par ce parcours.

Les **21 captures** sont conservées avec le rapport et le journal du job. Les dix vues ciblées après les corrections confirment le contour circulaire de la planète, le panorama jungle continu, les annonces finales de victoire et une capture pour chacun des huit plans. Cette revue statique par des assistants ne certifie ni l’écoute ni la fluidité du mouvement et ne remplace pas la revue artistique humaine.

Les rapports successifs conservent les défauts observés et leurs corrections : intentions de déplacement aux checkpoints, sélection réelle de mission, ressources de la fixture, stabilisation du resize et contraintes de largeur de l’arrivée. La première recette complète verte sur `5098adea` reste identifiée comme antérieure aux derniers ajustements de composition. Les 294 tests et le build de 1.2.0 restent des preuves historiques d’un autre périmètre. Le lancement local de Chromium s’était arrêté avant le premier scénario (`socket() failed: Operation not permitted`) ; les succès navigateur proviennent de la CI.

Le classeur est prolongé à partir du fichier existant. Ses six onglets d’origine, les 27 prompts et les champs de revue humaine sont conservés. Les onglets `Combat` et `Audio`, les trois nouvelles poses, les copies WebP et les preuves 1.3.0 complètent le suivi. Le générateur `build-workbook.mjs` importe le classeur, met à jour les dépendances concernées et garde les champs d’approbation humaine éditables. `workbook-verification.json` décrit uniquement les contrôles réellement exécutés sur ce classeur. Son rapport 1.2.0 est conservé dans `history/`.

## Points de production encore ouverts

Le parcours château et arrivée 1.3.0 est qualifié. Les prochaines extensions concernent les sons dédiés aux portes, aux pas d’exploration et aux sceaux du château, puis un donjon scénarisé avec boss, quêtes et récompenses. Les six ambiances royales et les quatorze signaux de combat sont déjà livrés. L’écoute du mixage, la revue artistique humaine des 30 images et le relevé exact de la vidéo de référence restent ouverts. Le suivi distingue contenu présent, contrôles techniques, recette navigateur et approbation artistique.

## Point de reprise

Le [point de reprise](POINT_DE_REPRISE.md) rassemble la PR #106, les sources locale et publiée, les preuves du lot et le prochain périmètre. Conserver les 30 PNG, leurs copies WebP et les 30 prompts. La visite, le combat d’entraînement et les huit plans d’arrivée constituent la base à prolonger.
