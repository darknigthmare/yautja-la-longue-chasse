# Homeworld V78 — audit urbain et premier lot intégré

Audit QA3, urbanisme et level design. Ce document distingue les images V77 réellement relues, les changements du modèle V78 et les validations visuelles encore manquantes. Les cartes fournies décrivent une création du projet ; elles ne prouvent pas une topographie canonique de Yautja Prime à l’échelle 1:1.

## Preuves visuelles et six priorités

Les deux concepts ont été ouverts avec `view_image` :

- `public/game/homeworld/v77/reference/homeworld-city-world-first.png`
- `public/game/homeworld/v77/reference/homeworld-macro-layout-latest.png`

Les six captures ci-dessous ont également été réellement ouvertes, depuis `work-local/v77/qa/world-final-candidate4-local/`. Ce sont des preuves du candidat V77, pas des captures du nouveau lot V78.

| Priorité | Preuve V77 et implication | Correction et statut |
| --- | --- | --- |
| 1. Peupler les bas-quartiers | `level-slum-slope.jpg` montre une terrasse presque entièrement vide. Le modèle V77 possède bien un sol −1A de 3700×2450, mais zéro bâtiment, prop extérieur ou habitant sur ce niveau. | V78 ajoute trois rues dégagées, huit façades natives de remplacement, 24 props et sept figurants sur −1A. Modèle testé ; aspect V78 dans le navigateur encore non vérifié. |
| 2. Habiller la liaison du spatioport | `01-port-east-native.jpg` montre le quai fonctionnel mais une grande surface uniforme. Le port est correctement à l’est ; la liaison physique en U reste très longue et peu habillée. | Sept cours latérales réelles, 28 props natifs et sept figurants. L’axe principal et le départ restent libres ; aucun vaisseau ajouté dans une rue. La composition paysagère des falaises reste à développer. |
| 3. Éviter les silhouettes d’étages fantômes | `palace-existing-audience-frontage.jpg` et `council-upper-existing-frontage.jpg` montrent des façades atténuées d’autres niveaux derrière les lieux courants. | Correction du rendu des niveaux et de la profondeur possédée par l’agent principal. Ce lot géométrique ne prétend pas réparer à lui seul l’occlusion 3D. Une relecture du rendu reste nécessaire. |
| 4. Donner une forme architecturale aux raccords | `level-industrial-ramp.jpg` et `level-slum-slope.jpg` montrent des bandes de liaison simples. L’escalier Conseil possède un vrai PNG mesuré ; six autres raccords restent sans illustration native finale. | Navigation réelle conservée, paliers réservés et corps complet testé. Les nouveaux escaliers/rampes générés hors du répertoire public ne sont pas certifiés intégrés par cet audit. |
| 5. Renforcer les angles et la hiérarchie des lieux | Le palais du concept est un grand repère, tandis que `palace-existing-audience-frontage.jpg` montre surtout l’aile publique existante. 37 des 43 bâtiments V77 restent frontaux ; six ont déjà une vraie source orientée. | Huit façades V78 réemploient trois PNG originaux à échelle uniforme, avec ouvertures peintes ≥128×80. Elles sont explicitement frontales et décoratives. Les illustrations obliques dédiées, le palais complet et le Conseil spécifique restent partiels. Aucune rotation CSS pour simuler une vue native. |
| 6. Densifier selon la fonction des intérieurs | `memory-vault-real-interior-save.jpg` montre un intérieur fonctionnel à trois zones et 13 objets ; il n’est pas vide. Cependant, le kit mural et les silhouettes des espaces restent génériques par rapport aux concepts. | Aucun ancien meuble, service ou seuil déplacé. Les intérieurs V72 possèdent déjà des zones fonctionnelles et les secondaires des plans variables. L’ajout d’étagères, de postes de travail et de mobilier orienté selon chaque rôle est un chantier distinct ; les fichiers générés mais non copiés ne constituent pas une intégration terminée. |

Références de méthode consultées : l’[entretien des développeurs d’Octopath Traveler II](https://www.unrealengine.com/developer-interviews/octopath-traveler-ii-builds-a-bigger-bolder-world-in-its-stunning-hd-2d-style?lang=en-US) décrit les contraintes d’une caméra fixe, la lisibilité des destinations et l’accord entre personnages 2D et décors 3D. Les [principes de level design d’Epic](https://dev.epicgames.com/documentation/en-us/fortnite/level-design-best-practices-in-fortnite-creative) aident à vérifier la circulation, les repères et l’équilibre de densité. Ces principes sont transposés au RPG du projet ; ils ne servent pas de source du lore Predator.

## Résultat du premier lot

Les mesures réelles sont conservées dans `work-local/v77/qa/urban-v78-model-measures-final.json`, horodaté `2026-10-03T06:45:09.898Z` :

- 43 anciens bâtiments interactifs et 98 anciens habitants conservés.
- 8 nouvelles façades décoratives visibles et solides, avec trois sources PNG originales conservées.
- 52 props acceptés sur 56 candidats : 24 en bas-quartiers, 28 autour du port.
- 14 figurants non solides, sans dialogue ni visite sauvegardée ; sept par secteur. Les bas-quartiers utilisent cinq rôles civils : témoin/habitant, artisan, maître de forge, messager et soigneur. Chaque costume provient d’une persona native existante.
- 19 polygones de support additifs : 12 segments des trois rues et sept cours de desserte.
- 101 fiches de codex : 8 façades, 52 props, 19 sols, 14 figurants et 8 réserves pour l’art oblique dédié encore manquant.

Les façades gardent des ouvertures peintes de largeur 80.1696–91.1842 et hauteur 128.4403–145.2. Leurs fondations natives entières tiennent dans leurs parcelles et restent hors des rues réservées. Les dimensions ne sont pas obtenues en étirant séparément les axes du PNG.

Les quatre refus de placement restent publiés dans le modèle ; aucune empreinte n’a été réduite pour les accepter :

| Candidat rejeté | Réserve protégée |
| --- | --- |
| `urban-v78:lower-halt-west:covered-work` | `urban-v78:lower-loop:clear:0` |
| `urban-v78:lower-halt-west:mineral-bed` | `urban-v78:lower-main:clear:2` |
| `urban-v78:lower-middle-halt:covered-work` | `connector:slum-slope:1` |
| `urban-v78:lower-middle-halt:mineral-bed` | `urban-v78:lower-main:clear:3` |

## Interface et montage

Fichiers possédés par QA3 :

- `app/game/systems/homeworldUrbanLayoutV78.ts` : rues, parcelles, polygones convexes, supports additifs.
- `app/game/systems/homeworldUrbanFacadesV78.ts` : huit sources de façades, placement uniforme et collision SAT native.
- `app/game/systems/homeworldStreetModulesV78.ts` : placements acceptés/refusés, collision, terrain et moteur V78.
- `app/game/systems/homeworldUrbanPopulationV78.ts` : figurants, provenance des personas et rôle natif explicite.
- `app/game/systems/homeworldUrbanNavigationV78.ts` : même grille32/marge12/contrôle des segments4 que V77, avec les nouveaux solides et supports.
- `app/game/systems/homeworldUrbanCodexV78.ts` : mêmes positions, dimensions, empreintes et sources que le modèle vivant.
- `tests/homeworld-urban-v78.test.mjs` : contrôles directs du vrai modèle TypeScript.

Montage coordonné par l’agent principal dans `HomeworldWorldSceneV77.tsx` et `HomeworldHub.tsx` :

1. Dessiner `HOMEWORLD_URBAN_GROUND_V78` au même niveau physique que les anciennes surfaces.
2. Ajouter `HOMEWORLD_URBAN_FACADES_V78` à la collection des façades peintes, jamais à la liste des 43 portes interactives. `homeworldUrbanFacadePlacementV78` expose `src`, dimensions source, position écran, dimensions rendues, échelle uniforme, élévation et fondation. Son `top` inclut déjà l’élévation ; ne pas la soustraire une seconde fois.
3. Dessiner `HOMEWORLD_URBAN_PROPS_V78` avec les cellules natives et pivots existants. `homeworldUrbanNativePlacementV78` expose la source, le SHA, les dimensions, la silhouette et le polygone natif utilisés par la physique.
4. Dessiner `HOMEWORLD_URBAN_EXTRAS_V78` avec `homeworldResidentPoseV77` et la véritable horloge suspendue du monde. `homeworldUrbanExtraRoleV78` accepte un ancien résident ou un figurant ; les anciens gardent exactement leur rôle et les extras gardent le costume de leur persona d’origine. Ne pas les ajouter aux services, enquêtes, contrats ou visites sauvegardées.
5. Monter ensemble `homeworldUrbanWalkableV78`, `stepHomeworldUrbanActorV78` et `homeworldUrbanWorldRouteV78`. Garder l’ancien moteur ou navigateur tout en dessinant des obstacles nouveaux donnerait un contrat incohérent.
6. L’agent principal fait lire le même terrain au garde de checkpoint et agrège les 101 fiches du codex. Les champs versionnés et leur propriétaire de sauvegarde restent inchangés.

Le modèle des façades décoratives ne crée pas d’intérieur : une porte peinte n’est pas un accès fictif. Si une ancienne position sauvegardée se retrouve dans un nouveau volume décoratif, le résolveur doit choisir un appui légal existant sans perdre progression, équipement ou missions. Aucun ID de quête, service ou bâtiment existant n’est supprimé.

## Vérifications et limites de preuve

`node --test tests/homeworld-urban-v78.test.mjs` : **7/7 PASS**, résultat final conservé dans `work-local/v77/qa/urban-v78-model-third.log`. Le chargeur lit/transpile les vrais modules TypeScript ; il ne remplace pas leurs fonctions par des mocks.

Les contrôles portent sur les refus de props, les empreintes natives, les 98 trajets complets échantillonnés à1unité, les 43 approches réelles, les sept raccords, le déplacement continu dans une nouvelle cour avec le même moteur, les poses et costumes des figurants, l’échelle des façades, la SAT contre les réserves, les 101 fiches et les itinéraires A* depuis le vrai départ du port vers chaque porte, raccord et retour régional.

Premières preuves préservées : `urban-v78-model-first.log` contenait 5/6 PASS, avec un témoin de nouveau terrain incorrectement choisi sur un sol déjà présent en V77. La preuve suivante choisit un point réellement hors du vieux terrain (`x4140`), sans supprimer l’assertion de support ajouté. `urban-v78-model-second.log` contenait 6/6 PASS avant l’ajout des façades ; ce résultat n’est pas utilisé comme validation du lot final. Le troisième log teste bien les huit façades et les rôles diversifiés.

Aucun navigateur V78, build complet, publication, test HTTPS ni validation esthétique de ce nouveau lot n’a été exécuté par QA3. C: reste à0octet libre lors du dernier contrôle ; aucun contournement de l’échec d’initialisation de l’auto-review ni suppression des données de l’utilisateur n’a été effectué. L’agent principal possède les vérifications SSR, typecheck et intégration ; elles constituent des preuves séparées.

Ce lot rend un premier quartier plus dense et praticable. Il ne termine pas la ville entière, les six arts natifs de raccord restants, tous les intérieurs spécifiques, les palais complets, les huit couches paysagères, les animations civiles inédites dans toutes les directions ou les illustrations obliques dédiées. Les sources V78 générées mais encore hors du répertoire public restent explicitement en attente d’intégration et de relecture.
