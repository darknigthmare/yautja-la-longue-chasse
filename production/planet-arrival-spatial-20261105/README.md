# Arrivée planétaire — audit de composition et de mouvement

Demande du 5 novembre 2026 : reprendre les cinématiques existantes et corriger la perspective, la profondeur, le mouvement, l'orientation et les attaches des effets.

Base de reprise : `9653e2e287e522ebf8867209a594033f8c1fb89b` sur `main`, après intégration du château Wolf, de l'arrivée en huit plans et des accès `/dev`. La présente correction conserve les identités du catalogue, les huit plans de 62 secondes et le contrat de sauvegarde/version 1.

## Défauts constatés et corrections

| Domaine | Constat dans les sources et les captures précédentes | Correction intégrée |
| --- | --- | --- |
| Projection | Positions en pourcentages du navigateur, angles de capsule fixes et images contenues dans des boîtes de ratios différents. Le résultat changeait en portrait. | Plateau de 1280 × 720, adapté uniformément à la fenêtre. Les dimensions natives des images et les marges transparentes sont prises en compte. |
| Vaisseau | Le profil classique pointe à gauche mais se déplaçait vers la droite. Le vaisseau disparaissait encore visible au changement de plan. | Axe visuel calibré par profil, miroir horizontal si nécessaire, orientation selon la tangente et sortie complète du cadre. Les profils V12 et V14 restent distincts. |
| Capsule | Cassure d'angle et de vitesse entre largage et descente ; changement de direction écran à l'entrée atmosphérique. | Courbe commune de 18 secondes, tangente calculée, échelle continue. Le plan atmosphérique conserve le sens du mouvement. |
| Effets en vol | Jet placé à côté de la capsule, sans parent commun. Traînée déjà inclinée dans sa source, retournée sans compensation de son axe réel. | Jet fixé à la tuyère. Front de plasma fixé au nez, sillage orienté à l'opposé de la vitesse. Chaque effet hérite de la rotation et de l'échelle de la capsule. |
| Profondeur | Dézoom appliqué aux acteurs uniquement, décor et sol immobiles. | Caméra commune à tout le plan au sol ; couverture du cadre et position du sol conservées. Deux vitesses de nuages distinguent les couches atmosphériques. |
| Contact | Bord de boîte utilisé à la place du pied visible de la capsule. Poussière décentrée et montant pendant sa croissance. | Pivots mesurés dans les pixels des sources. Capsule, poussière, ombres et pieds utilisent le même plan de contact. Chute accélérée jusqu'au signal d'impact existant. |
| Porte et sortie | Rotation autour du coin inférieur alors que la charnière est en haut ; disparition du panneau et apparition du chasseur avant dégagement. | Porte attachée à sa charnière haute et ouverte vers l'extérieur. Panneau conservé ouvert. Sortie du chasseur après dégagement. |
| Planètes | Le recadrage circulaire antérieur conservait une bordure noire autour de plusieurs globes décentrés. | Fenêtre SVG propre à chacun des huit globes existants, sans substitution de planète ni modification de l'image source. |

## Repères et contrats

`app/game/systems/planetArrivalSpatial.ts` porte les trajectoires, la projection des points d'attache et les deux transformations de caméra. `planetArrivalArt.ts` contient les repères normalisés des images, des coques et des globes. Le composant applique ces mêmes repères aux images et aux effets.

Les marqueurs `data-arrival-anchor` sont des éléments non interactifs de dimension nulle placés aux coordonnées source réellement mesurées. La recette relève leurs transformations dans le navigateur ; elle ne déplace pas les éléments ni ne remplace les images. Leur exactitude artistique est confrontée aux sources et aux captures, séparément des tests mathématiques.

La capsule utilise l'identité AVP déjà présente dans le projet. Le point de largage sous chaque coque est un choix de mise en scène cohérent avec son image ; il ne constitue pas la découverte d'une baie canonique documentée. La soucoupe symétrique conserve une direction conventionnelle. La vue Upgrade conserve la perspective de son image existante. Le panneau de porte et l'ouverture ne sont pas des dessins industriels parfaitement superposables : leur correspondance demeure une adaptation graphique.

## Vérifications et preuves

- Tests ciblés : `node --experimental-strip-types --test --test-concurrency=1 tests/planet-arrival*.test.mjs`.
- Analyse statique : TypeScript et ESLint strict des fichiers modifiés.
- Construction de production : `npm run build:production`.
- Recette navigateur dédiée : `scripts/qa-planet-arrival-spatial.mjs`, exécutée par `.github/workflows/planet-arrival-spatial.yml`.
- Régressions existantes : workflow Wolf/arrivée et parcours `/dev` ; aucun résultat historique n'est réattribué à ce correctif.

La recette dédiée couvre les huit plans en formats ordinateur et mobile, les huit destinations, plusieurs profils de coque, les attaches et orientations mesurées, le mode mouvements réduits, la pause et le redimensionnement, puis une arrivée complète sur la route de production `/dev` jusqu'à la vraie chasse. Elle conserve les captures, les mesures, une vidéo et les empreintes des sources.

Les états de départ du harnais sont valides et placés aux frontières des plans. Après le clic natif « Reprendre », l'horloge et les animations fonctionnent normalement. La traversée finale de `/dev` dure réellement 62 secondes actives. Les instants demandés et observés sont distingués dans le rapport.

### Résultats locaux du correctif

Source vérifiée : commit `ed1fce8fc28dbaf54ca742e2defcef6d18fe8123`, branche `fix/cinematic-spatial-audit-20261105`.

| Contrôle | Résultat observé |
| --- | --- |
| Tests `planet-arrival*.test.mjs` | **48 / 48 réussis**, dont 14 tests spatiaux. |
| TypeScript et ESLint des fichiers modifiés | Réussis. La construction finale exécute aussi le contrôle TypeScript. |
| Construction de production du commit exact | **Réussie**, routes générées ; contrôles CSS compilés réussis. |
| Repères dans les sources graphiques | 55 profils inspectés pour les 54 identités du catalogue, 8 globes et les 6 sprites de la séquence. |
| Mesures et captures Chromium du nouveau rendu | **En attente** : aucun résultat navigateur du nouveau commit n'est présenté comme acquis. |
| CI distante et déploiement | **Non exécutés** pour ce correctif local. |

Journaux conservés : [tests](verification/tests.log), [construction](verification/build.log), [résumé et empreintes des sources](verification/local-verification.json).

Le lancement direct de Chromium a échoué sur les restrictions de socket de l'environnement. Le navigateur déjà disponible ne peut pas joindre le serveur Next local depuis son environnement séparé. Ces limitations empêchent ici la recette visuelle ; elles ne sont pas des erreurs de rendu constatées dans le jeu.

Pour exécuter la recette sur un environnement doté de Chromium : construire avec `npm run build:production`, puis lancer `ARRIVAL_SPATIAL_START_SERVER=1 node scripts/qa-planet-arrival-spatial.mjs`, ou utiliser le workflow dédié. Les captures et la vidéo devront ensuite être examinées, en particulier la sortie de capsule, le panneau de porte et les vues de coques en perspective.

**Conclusion de l'audit à ce stade :** corrections de source, repères et invariants géométriques vérifiés ; validation visuelle animée encore ouverte. Aucun statut de validation artistique humaine ni de fidélité film 1:1 n'est modifié par cet audit technique.

## Références de travail

- Captures de la version précédente conservées sous `production/wolf-castle-arrival-20261104/qa/integration-9da27c2a/wolf/`.
- Dimensions, alpha et provenance historiques : manifeste d'arrivée et manifeste runtime du même dossier de production.
- Guides du dépôt : `docs/GAMEDEV_AGENT_GUIDE.md`, références épinglées `custom-engines`, `camera-systems`, `game-feel` ; diagnostic structuré suivant la révision Superpowers référencée par `.ai-tools/sources.json`.
