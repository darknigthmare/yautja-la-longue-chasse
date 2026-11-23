# ADR-0001: The Isles — three.js pour la vue isométrique et salle réseau WebSocket sans dépendance

## Status

Accepted

## Date

2026-11-23

## Last Verified

2026-11-23 — `tsc --noEmit`, 32 tests `tests/isles-*.test.mjs`, recette `scripts/qa-isles-browser-v1.mjs` dans Chromium.

## Decision Makers

Darknigthmare (décisions du 21 novembre 2026 dans `docs/campagne/MODE_THE_ISLES_20261121.md`, et choix du 23 novembre 2026 : étapes 1 à 3, three.js en version figée, branche et PR séparées, volumes simples).

## Summary

Le mode The Isles est rendu avec three.js 0.186.1 (WebGL2), chargé seulement quand le joueur ouvre le mode. Le réseau minimal de l'étape 2 est une salle autoritaire en TypeScript pur, servie par un service WebSocket Node sans dépendance.

## Engine Compatibility

| Élément | Valeur |
| --- | --- |
| Moteur | Jeu TypeScript maison dans React 19 / Next 16 (vinext) |
| Nouvelle dépendance | `three` 0.186.1 (publiée le 24 septembre 2026), `@types/three` 0.186.0 en développement |
| Chargement | `React.lazy(() => import("./IslesModeV1"))` dans `CampaignFrontEnd` : three.js n'entre pas dans le paquet initial |
| Serveur | Node ≥ 22.13 (`node:http`, `node:crypto`), esbuild déjà présent en développement |

## ADR Dependencies

Aucune.

## Context

### Problem Statement

Le document du mode impose three.js (« Taille et moteur : 12 × 12 km, three.js ») alors que le dépôt n'avait aucune bibliothèque 3D, et l'ordre de production demande un réseau minimal pour 2 puis 6 joueurs avant la Chasse inversée.

### Current State

Le jeu rend en Canvas 2D, DOM/CSS et WebGL brut. Les services temps réel existants (Outer Ops V115/V130) sont des services HTTP Node.

### Constraints

- Garder l'architecture et les dépendances figées du projet ; une dépendance ajoutée l'est en version exacte.
- Aucun effet sur la campagne ni sur les sauvegardes.
- Le module de règles doit être testable sans navigateur ni réseau.

### Requirements

- Vue isométrique 35°, 4 rotations, 3 zooms, anticipation, transparence du décor devant le joueur (section 4.1).
- Tuiles de 2 m regroupées par zones de 32 × 32, objets répétés instanciés (section 15.1).
- Positions envoyées 15 fois par seconde, actions importantes validées par le serveur ; 8 joueurs par session ; mise à mort contestée attribuée une fois (sections 13.1, 13.4, 15.3).

## Decision

1. **Rendu** : `app/game/isles/islesSceneV1.ts` construit une géométrie fusionnée par zone de 32 × 32 tuiles, des `InstancedMesh` pour les arbres, buissons et caisses, et une caméra orthographique. La découpe du décor est un test GLSL injecté dans les matériaux (`onBeforeCompile`) qui reproduit exactement `cutawayHidesV1` de `islesCameraV1.ts` ; les personnages ne sont jamais découpés.
2. **Règles** : carte, mouvement, caméra, chemin, Chasse inversée et salle réseau sont des modules TypeScript purs et déterministes, sans three.js, testés sous Node.
3. **Réseau** : `islesRoomV1.ts` est la salle autoritaire (sièges, contrôle de vitesse et de hauteur, frappe validée, proie). `scripts/serve-isles-room-v1.mjs` l'expose en WebSocket (RFC 6455, trames texte masquées, 4 Kio au plus, 60 messages par seconde au plus) sur `node:http`. Le client prédit son mouvement et applique les corrections du serveur ; les autres joueurs sont interpolés 120 ms en arrière.

### Key Interfaces

- `createIslesSceneV1(canvas, map, cameraTuning)` → `render(view)`, `resize`, `project`, `stats`, `setCutaway`, `dispose`.
- `stepIslesActorV1(actor, input, map, movement, cloak, dt)`.
- `createReverseHuntV1(map, rules, tuning, seed, teamSize)` / `stepReverseHuntV1(state, input, map, rules, tuning, dt)`.
- `createIslesRoomV1({map, net, runSpeed})` → `join`, `leave`, `input`, `strike`, `tick`.

### Implementation Guidelines

Les valeurs de jeu sont dans `app/game/data/islesTuningV1.json` et `islesReverseHuntV1.json` ; les cartes sont générées par `scripts/build-isles-maps-v1.mjs` (`--check` détecte une carte à régénérer).

## Alternatives Considered

### Alternative 1: WebGL brut

- **Description** : réécrire caméra, éclairage, ombres et instanciation sur l'API WebGL comme les écrans existants.
- **Pros** : aucune dépendance.
- **Cons** : beaucoup plus long ; contraire à la décision écrite du mode.
- **Rejection Reason** : l'utilisateur a choisi three.js en version figée le 23 novembre 2026.

### Alternative 2: Durable Object Cloudflare (proposé en section 13.4)

- **Description** : une session = un Durable Object, via Wrangler déjà présent.
- **Pros** : hébergement géré, proche de la proposition du document.
- **Cons** : demande un compte et un déploiement pour la moindre partie de test.
- **Rejection Reason** : la salle reste indépendante du transport ; un adaptateur Durable Object pourra appeler les mêmes fonctions plus tard.

### Alternative 3: paquet `ws`

- **Description** : serveur WebSocket du paquet `ws`.
- **Pros** : robuste et complet.
- **Cons** : `ws` n'est qu'une dépendance transitive de développement ; l'ajouter serait une deuxième dépendance.
- **Rejection Reason** : le sous-ensemble nécessaire (trames texte non fragmentées) tient en une centaine de lignes testées.

## Consequences

### Positive

- Les règles sont vérifiées par 32 tests Node sans navigateur.
- three.js ne pèse que sur le mode The Isles.

### Negative

- Une dépendance d'exécution de plus (`three`), à suivre lors des montées de version.
- Le service WebSocket maison ne gère ni la fragmentation ni la compression.

### Neutral

- La recette navigateur rend en WebGL logiciel (SwiftShader) : ses images par seconde ne mesurent pas une machine de joueur.

## Risks

- **Montée de three.js** : API WebGLRenderer modifiée. Atténuation : version exacte, recette navigateur.
- **Triche côté client** : le mouvement est prédit par le client. Atténuation : contrôle de vitesse, de hauteur et des bornes ; frappe vérifiée par le serveur.

## GDD Requirements Addressed

| Document | Exigence | Comment |
| --- | --- | --- |
| MODE_THE_ISLES §4.1 | caméra 35°, 4 rotations, 3 zooms, anticipation, occlusion | `islesCameraV1.ts`, shader de découpe |
| MODE_THE_ISLES §4.2, §15.1 | tuiles de 2 m, zones de 32 × 32, instanciation | `islesSceneV1.ts` |
| MODE_THE_ISLES §13.1, §13.4 | 8 joueurs, 15 Hz, validation serveur | `islesRoomV1.ts`, `serve-isles-room-v1.mjs` |
| MODE_THE_ISLES §15.3 | caméra sans joueur caché ; mise à mort contestée attribuée une fois | `tests/isles-view-v1.test.mjs`, `tests/isles-net-v1.test.mjs` |

## Performance Implications

- **CPU** : simulation à pas fixe de 60 Hz ; recherche de chemin A* seulement au changement d'objectif.
- **Mémoire** : Verdant (96 × 96 tuiles) : 9 zones, 20 246 triangles de terrain, 2 165 objets instanciés.
- **Chargement** : three.js chargé à l'ouverture du mode.
- **Réseau** : un instantané d'environ 1,5 Kio pour 8 joueurs, 15 fois par seconde.

## Migration Plan

Aucune donnée existante à migrer ; le mode n'écrit aucune sauvegarde dans cette version.

**Rollback plan** : retirer le bouton « The Isles » du menu et la dépendance `three` ; aucun autre écran n'en dépend.

## Validation Criteria

- `node --test tests/isles-view-v1.test.mjs tests/isles-reverse-hunt-v1.test.mjs tests/isles-net-v1.test.mjs` : 32 tests réussis.
- `node scripts/qa-isles-browser-v1.mjs` : 11 étapes réussies, 18 captures dans `production/qa/evidence/isles-v1-20261123/`.
