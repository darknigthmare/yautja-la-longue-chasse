# PR62 — deux corrections chasse, avant le gel composite B2

Ce lot reprend uniquement deux corrections de la tête PR62 `b00b091623b968c2f84e6909deb590ecf70581eb`. Les deux fichiers applicatifs sont **identiques aux octets de cette source**. Il ne reprend ni géométrie, ni capsule, ni classeur, ni téléchargements ou autres pilotes PR62.

- `huntRiteMenuSnapshotV77` garde la carcasse portée comme cible si elle est préparée, non effacée, non suspendue, de masse/position valides et à la portée native de88. Sinon, le corps le plus proche reste le repli. La dépose reste ainsi accessible lorsque deux corps se chevauchent, sans accès distant ni mutation de l’état pendant la sélection.
- Le badge de découverte affiche la **cause** et la **réponse demandée** sur deux lignes dans son rectangle132×26 existant. Les anciens labels publics restent compatibles. Aucun moteur de perception, d’IA, de physique ou de sauvegarde n’est changé par ce rendu.

## Vérifications exécutées

Les [six fichiers ciblés](targeted-tests.tap) passent, sans échec/ignoré : les deux nouveaux tests, `hunt-carcass-runtime-v112`, `corpse-discovery-v112`, `hunt-accessibility-v112` et `hunt-rites-v77`. Le runner avec `--test` rapporte ici six conteneurs de fichiers. Les exécutions directes séparées conservent les décomptes explicites des **20 cas de carcasses** et **15 contrats HUD**, sans les compter deux fois : [TAP carcasses](carcass-direct-tests.tap), [TAP HUD](hud-direct-tests.tap). Le lint des cinq fichiers du lot passe, sans diagnostic ; le [journal lint](targeted-lint.log) est volontairement vide.

Le [rapport carcasses](carried-menu-report.json) contient20cas uniques : dépose via le vrai callback extrait par AST de `HuntCanvas`, vrai menu rendu en SSR, état gelé/ordre conservé, invalidités, masse omise legacy et limites exactes de portée. Il conserve aussi le vrai bundle CommonJS exécuté sous forme gzip. **C’est une fixture d’intégration native construite**, avec deux acteurs et l’outil explicitement admis ; ce n’est ni une mission jouée ni un parcours GameClient monté. Le contre-exemple antérieur reste un lien au commit PR62, sans copie locale réattribuée.

La [matrice Canvas Chromium](hud-layout/layout.json) utilise la vraie fonction de dessin compilée et les vrais `TextMetrics` de Chromium154.0.8037.57. Les12combinaisons cause/réponse passent aux largeurs CSS320/768/1280 et DPR1/2 : **72 mesures, six captures, aucune erreur page/console**, source stable pendant l’exécution. Tous les textes restent dans le badge, sans recouvrement vertical ; le plus petit écart logique est2px. Le bundle navigateur et le HTML exact de la fixture sont conservés.

Les six captures ont été ouvertes par l’assistant. À1280px, les deux lignes et leurs pictogrammes sont visibles dans le badge natif. À320px, cette matrice réduit uniformément un canvas1280 et les caractères sont très petits : **la lecture humaine sur téléphone n’est pas validée**. Cette recette est une matrice de présentation construite, pas12rencontres écologiques réelles ni une qualification artistique humaine.

Le premier lancement Chromium a été refusé par les sockets du sandbox avant toute capture ; son [diagnostic brut](diagnostics/browser-sandbox-launch.log) est conservé. L’exécution locale autorisée ensuite a produit les seules mesures/captures qualifiées. Aucun résultat n’a été fabriqué pour remplacer ce refus.

## Sources et reproduction

Le [manifeste](source-manifest.json) épingle les cinq fichiers exécutés, leurs copies et les cinq sources brutes PR62. Les archives de code portent le suffixe `.source` afin de préserver leurs octets sans les inclure dans le `tsconfig` du produit. Le contexte `HuntCanvas` et son menu sont copiés séparément ; le bundle exécuté fait foi pour la fixture native. Le commit de départ `a83d239…` n’est pas présenté comme le commit exécuté après ces modifications non commitées.

Depuis la racine, avec Node22 et les dépendances verrouillées :

```sh
YAUTJA_CARCASS_MENU_QA_REPORT=/tmp/hunt-menu-new-run/report.json node --experimental-strip-types --test --test-reporter=tap --test-concurrency=1 tests/hunt-carried-corpse-menu-v112.test.mjs tests/discovery-signals-hud-v112.test.mjs tests/hunt-carcass-runtime-v112.test.mjs tests/corpse-discovery-v112.test.mjs tests/hunt-accessibility-v112.test.mjs tests/hunt-rites-v77.test.mjs
node node_modules/eslint/bin/eslint.js app/game/systems/huntRitesRuntimeV77.ts app/game/discoverySignalsV112.ts tests/hunt-carried-corpse-menu-v112.test.mjs tests/discovery-signals-hud-v112.test.mjs scripts/qa-discovery-hud-layout-v112.mjs
YAUTJA_DISCOVERY_HUD_OUTPUT=/tmp/hunt-hud-new-run node scripts/qa-discovery-hud-layout-v112.mjs
```

Les chemins `/tmp` ci-dessus désignent de **nouvelles** sorties de reproduction, jamais des fichiers nécessaires à la preuve archivée. `CHROMIUM_EXECUTABLE_PATH` peut désigner le navigateur local disponible. Le test carcasses n’adapte que la provenance du rapport et la conservation du bundle ; le QA HUD adapte ses sorties, son lancement portable et ses empreintes, sans remplacer sa fonction de dessin.

Les cinq sources du lot sont désormais à la barrière sans écriture pour le gel unique B2. Types complets, build Next et recettes composites restent les contrôles coordonnés de B2 ; cette preuve ciblée ne s’attribue aucune attestation de production R8 et ne ferme aucune exigence globale ou PR entière. Les éditions chasse/imprimables et autres reliquats PR62 demeurent séparés.
