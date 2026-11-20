# Raccords des assets — 20 novembre 2026

## Base et continuité

Base de travail : `main` au commit `351208cc9d3a7157e563a0426f9208aecab6c20e`. La PR [#131](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/131) est fusionnée. Les PR #139, #140, #141, #143 et #144 ont livré des études, sources, galeries et dérivations de masques ; elles n’ajoutent aucun binding applicatif. Les PR [#135](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/135) puis [#138](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/138) restent une chaîne ouverte de personnalisation, distincte de ce raccord.

## Changements

Dans `app/game/GameClient.tsx`, l’identité `hunterGauntlet.equippedId` accompagne le joueur vers `HomeworldHub.tsx`, `HomeworldPassageV67.tsx` et `HomeworldRegionV68.tsx`. Ces parents transmettent au joueur personnalisé son gauntlet et son kit, avec les conditions d’armure et de lames déjà utilisées dans la cité. `HomeworldModularHunter` conserve ses ancrages : la correction porte sur les données que ses propriétaires lui fournissent.

Dans `app/game/environmentPropRegistry.ts`, les supports de rôle `climb` prennent leur archétype avant les indices génériques. La résolution legacy distingue biome et type ; la réutilisation d’une famille compatible précède un décor étranger. Les exports existants restent les points d’entrée du jeu. Les gardes des décors ordinaires, du streaming et des éléments volcaniques sont conservées.

Les lianes, cordes et chaînes utilisent déjà le dessin procédural du Canvas. Leur binding ne prouve donc pas un changement de pixels. L’approximation gameplay `ice.ladder` par une colonne cristalline reste explicite. Le legacy `ice.ladder`, sans image exacte, conserve le fallback natif du HuntCanvas ; il en va de même des parois legacy jungle et océan.

Images, identifiants, placements physiques, collisions, sauvegardes, dépendances et statuts artistiques restent préservés. Aucun candidat n’acquiert automatiquement une certification canonique ou le statut `validated`.

## Critères et reproduction

Les contrôles déclarés couvrent treize contrats SSR des parents, les exports réels de sélection des décors et les gardes V19. Les recettes navigateur définissent les allers-retours cité↔passage et cité↔région ; une fixture Canvas distincte borne le contrôle des supports, sans prétendre jouer une campagne complète.

Commandes ciblées :

```sh
node --experimental-strip-types --test --test-reporter=spec --test-concurrency=1 tests/homeworld-player-equipment-raccords-20261120.test.mjs tests/environment-prop-catalogue-v19.test.mjs tests/environment-prop-registry-v19.test.mjs tests/environment-prop-drawing.test.mjs tests/environment-prop-raccords-20261120.test.mjs
node scripts/qa-environment-prop-raccords-20261120.mjs --materialize
```

Le workflow `.github/workflows/assets-raccords-20261120.yml` précise l’installation, les recettes navigateur, leurs captures et les ressources originales nécessaires. L’inventaire courant utilise exclusivement le générateur officiel :

```sh
node scripts/snapshot-runtime-v113.mjs --write docs/qa/current-integration-20261103/runtime-inputs.json
node scripts/snapshot-runtime-v113.mjs --check docs/qa/current-integration-20261103/runtime-inputs.json
```

## Portée des preuves

L’environnement Cloud a échoué avant la mise à disposition du workspace. Aucun test Node, build, lint ou parcours navigateur local n’a été exécuté pour ce lot. Les commandes et scénarios ci-dessus sont des contrôles fournis, pas des résultats. La PR du lot relie le SHA réellement testé aux résultats et artefacts CI.

Ces quatre raccords de scène ne nécessitent pas de nouveau classeur. Les originaux, leurs qualifications datées et leurs preuves restent inchangés ; cette note ne réécrit aucun ancien suivi.
