# Qualification des PR planètes #33 et #39 — 1er novembre 2026

Les PR [#33](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/33) et [#39](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/39) ont été **fusionnées normalement le 1er novembre, respectivement à 01:04:42 et 01:27:01 UTC**. La vérification complète de #39 avait révélé trois erreurs de compilation, corrigées sous `04d9d4dd` avec une nouvelle barrière de types, sans changement du gameplay. La CI de cette tête a ensuite réussi sur ses trois jobs avant la fusion ; les qualifications initiales restent attribuées à leurs propres commits.

Ce rapport ne fusionne aucune PR. Les événements de rattachement sont effectués par le coordinateur et confirmés par l’API ; les tests ci-dessous ont été exécutés dans des copies isolées des sources aux SHA indiqués. Les travaux Homeworld, les classeurs historiques et les branches actives ne sont pas remplacés.

## Base et rattachement de #33

| Élément | Valeur vérifiée |
| --- | --- |
| Ancienne base, tête fusionnée de #31 | `67fa9fab2e580abb907fa5de0679cd73237c9407` |
| `main` après fusion #31 | `81fc1916fc285ca85d3c434737bc35b1e5f2fb7f` |
| Arbre Git commun à ces deux commits | `a8e412894bfb82df2d2d59e818a728666b975dd8` |
| Tête de #33 | `63c345fc7eaf999225df8f35cab787b8152f0b2c` |
| Merge-base de `main` et #33 | `67fa9fab2e580abb907fa5de0679cd73237c9407` |
| Diff binaire avant/après rattachement | 97 412 octets, SHA256 `83ad705e35055769995cd4c400e5e8736204d3d57501c6f5bdfa2f5f5c6cfe24` |
| Étendue du diff #33 | 15 chemins, identiques avant/après |

`git diff --binary 67fa9fab 81fc1916` est vide. Les deux diffs à trois points `67fa9fab...63c345fc` et `81fc1916...63c345fc` sont strictement identiques. Le changement de base ne réintroduit donc ni #31 ni une modification d’une autre branche dans le contenu de #33.

Le rattachement à `main` est confirmé à **`2026-11-01T00:45:30Z`**, tête inchangée. La [preuve Git](planet-pr33-39/base-proof.json) et l’[événement API](planet-pr33-39/pr33-retarget-event.json) sont conservés. #39 reste sur `feat/planet-v124-modular-region-masks` ; son merge-base avec #33 est exactement la tête `63c345fc`.

À la lecture suivante, l’API ne listait toujours pour cette tête de #33 que le run du 30 octobre. Le rattachement ne doit donc pas être présenté comme une nouvelle exécution de CI. Les workflows `pull_request` ne déclarent pas explicitement le type `edited` ; un déclenchement manuel est possible si une nouvelle exécution est souhaitée. La preuve d’arbres identiques et les nouveaux contrôles locaux restent distincts de cette question de déclenchement.

## Qualification distincte de #33

Le lot V124–V125 ajoute des masques de régions et d’hydrologie, des exports indépendants PNG/ZIP, un index physique V115, le catalogue des 120 formes et 32 matières supplémentaires avec leurs canaux. Les matières sont des sources procédurales originales exportables ; elles ne changent pas silencieusement les recettes historiques ni les résultats de guerre.

| Contrôle réellement effectué | Résultat | Preuve |
| --- | --- | --- |
| Huit fichiers de domaine du workflow, au SHA `63c345fc` | **48/48 réussis**, zéro échec ni test ignoré | [Journal Node](planet-pr33-39/pr33-domain.log) |
| Types complets, après `next typegen`, avec les vrais imports de configuration | **Réussi, exit 0** | [Résultat et commande](planet-pr33-39/pr33-typecheck-result.json) |
| Liste ESLint du workflow | **0 erreur, 18 avertissements** | [Journal lint](planet-pr33-39/pr33-lint.log) |
| Métadonnées du run [41097854075](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41097854075) | Jobs domaine et navigateur **success**, SHA exact de #33 | [Run](planet-pr33-39/pr33-ci-run.json), [étapes des jobs](planet-pr33-39/pr33-ci-jobs.json) |

Les tests locaux couvrent notamment indices de régions, exclusion des liquides, masques indépendants, limites ZIP, codes V102/V103, index physique V115, contours distincts et canaux déterministes. Le workflow navigateur existant utilise la vraie page en développement, télécharge des PNG/ZIP et contrôle leurs pixels et métadonnées, les aperçus de formes et deux variations régionales. Il ne constitue pas un build de production ou une qualification de combat.

Aucun nouveau défaut bloquant n’a été relevé dans ce périmètre de #33. Les contrôles locaux et la CI spécialisée au SHA exact ont permis la qualification de ce lot borné ; ils ne qualifient pas les fonctionnalités supplémentaires de #39. L’intégration doit conserver les gardes de version de #31 et réexaminer les chevauchements avec la personnalisation #27.

### Fusion confirmée après cette qualification

Le commit de fusion est [`c5fc51dc42d8e04a4a8f0ca79273c44e4921f7e1`](https://github.com/darknigthmare/yautja-la-longue-chasse/commit/c5fc51dc42d8e04a4a8f0ca79273c44e4921f7e1), à `2026-11-01T01:04:42Z`. Ses parents sont `81fc1916` et la tête examinée `63c345fc`. L’arbre Git `d23f5d6328b1971fc4e620c6e167da2dcccc07f8` est exactement celui de `63c345fc` : la fusion conserve les octets qualifiés. Voir l’[événement API](planet-pr33-39/pr33-final-state.json) et la [preuve d’arbre](planet-pr33-39/pr33-merge-tree.json).

Au relevé suivant la fusion, #39 visait encore la branche désormais fusionnée de #33. Le nouveau `main` et cette ancienne base ayant le même arbre, le coordinateur a ensuite rattaché #39 à `main`, sans rebase ni changement de contenu. L’[API confirme le rattachement](planet-pr33-39/pr39-retarget-main-event.json) à `2026-11-01T01:07:22Z`, base `c5fc51dc`, tête `04d9d4dd` inchangée. L’agent de revue ne modifie pas cette base.

## Défaut de compilation de #39 et correctif préparé

Tête examinée : **`f54dd68ce1a8708409d0075f0dcc7a76f2be647b`**, 117 chemins modifiés par rapport à #33. Le [run 41253623698](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41253623698) est bien terminé avec deux jobs `success` sur ce même SHA. Ces jobs exécutent les domaines et ESLint, puis les recettes Chromium ; ils ne lancent pas `tsc`.

| Emplacement dans la tête examinée | Erreur confirmée | Correction de types isolée |
| --- | --- | --- |
| `PlanetGeneratorV103.tsx:431` | Le résultat de la recommandation V139 fournit `territoryCount: number` au state `WarPlanetRecipeV103`, qui attend l’union des comptes autorisés. | Le helper privé `nearest` conserve le type littéral de son catalogue : `<T extends number>(options: readonly T[], target: number): T`. |
| `PlanetReliefV150.tsx:197` | `useState` infère le littéral `8000` depuis la constante de défaut, puis refuse une valeur numérique du curseur d’altitude. | Déclarer `useState<number>` pour l’altitude. |
| `PlanetReliefV150.tsx:202` | Même problème avec le littéral `0.55` pour le relief escarpé. | Déclarer `useState<number>` pour la rugosité. |

Le [journal avant correction](planet-pr33-39/pr39-typecheck.log) contient exactement ces trois erreurs `TS2345`, sans source ou manifeste manquant. Le [résultat avant correction](planet-pr33-39/pr39-typecheck-result.json) conserve le code de sortie **2**. Les omissions de `build/` et `.openai/` d’une toute première copie de travail ont été réparées avec les vrais blobs avant cette mesure ; elles ne sont pas comptées comme des défauts de la PR.

Le correctif touche **deux modules** : le helper de topologie et les deux déclarations de state. Le JavaScript émis par esbuild pour chacun de ces modules est **strictement identique avant/après** ; les annotations n’ajoutent aucun comportement, coût, déplacement, terrain ou règle de sauvegarde. La [comparaison des émissions](planet-pr33-39/pr39-candidate-emission.json) conserve tailles et SHA256.

| Contrôle | Résultat et portée |
| --- | --- |
| Domaine original #39, 34 fichiers exacts du workflow | **164/164 réussis**, zéro échec ni test ignoré : [journal](planet-pr33-39/pr39-domain.log), [commande](planet-pr33-39/pr39-domain-command.json). |
| ESLint original #39 | **0 erreur, 18 avertissements** : [journal](planet-pr33-39/pr39-lint.log). |
| Types complets du candidat corrigé | **Réussi, exit 0** : [résultat](planet-pr33-39/pr39-candidate-typecheck-result.json). |
| Topologie V139, relief V150, traversée V154 et profil V155 sur le candidat | **20/20 réussis**, zéro échec ni test ignoré : [journal](planet-pr33-39/pr39-candidate-targeted-tests.log). Ces tests recouvrent une partie des 164 précédents ; ne pas les additionner comme des comportements distincts. |

## Barrière CI proposée pour #39

Le [patch préparé](planet-pr33-39/pr39-types-and-ci.patch) ajoute aussi un job `types` dédié dans `.github/workflows/planet-v114.yml`. Il utilise Node 22, les dépendances verrouillées sans scripts d’installation, `next typegen`, puis **`npm run typecheck` complet**. Il ne remplace pas les tests de domaine et n’ajoute pas de build long. Le navigateur dépend des deux jobs : `needs: [domain, types]`.

Sa sélection sparse prend les fichiers de racine, `app`, `desktop`, `scripts`, `tests`, `db`, `worker`, `drizzle`, `build`, le vrai `.openai/hosting.json` et les vrais manifestes publics. Elle couvre les **803 fichiers TypeScript suivis et scannés par le tsconfig inchangé**, sans en retirer aucun ; les exclusions existantes du projet sont conservées. Les deux copies source d’audit comprennent 17 manifestes réels ; celle de #39 contient aussi le GeoJSON Natural Earth utilisé par les tests de géographie. Aucun stub de manifeste ou d’image n’a été créé. Les actions nouvelles sont épinglées aux mêmes SHA que la CI applicative du projet.

Le YAML du job et la dépendance ont été parsés. **La sélection a ensuite été validée dans un vrai worktree Git sparse**, créé par le coordinateur sur la tête `f54dd68c` : les 12 patterns correspondent exactement à ceux du job, les 17 manifestes et les vrais imports de configuration sont présents. `next typegen` puis `npm run typecheck` ont réussi, tout comme les 20 tests ciblés ; le lint des deux modules modifiés ne produit ni erreur ni avertissement. Le [résultat des commandes de types](planet-pr33-39/pr39-real-sparse-type-results.json), les [entrées du sparse](planet-pr33-39/pr39-real-sparse-inputs.json) et le [journal des tests](planet-pr33-39/pr39-real-sparse-targeted-tests.log) sont conservés. Ces 20 tests répètent le même sous-ensemble ; ils ne sont pas 20 comportements supplémentaires.

La copie locale réutilise l’installation verrouillée du dépôt par symlink ; le `package-lock.json` est strictement identique. L’installation `npm ci` prévue dans le nouveau job n’a pas été relancée dans ce worktree. Le workflow a été écrit dans celui-ci après la validation sparse, puisqu’il n’appartient pas aux entrées du typecheck. Les [métadonnées du patch](planet-pr33-39/pr39-patch.json) et le [handoff](planet-pr33-39/pr39-handoff.json) fixent les trois fichiers prêts pour le coordinateur. Aucun commit ou push n’est effectué par l’agent de revue.

## Correctif poussé après la qualification initiale

Le coordinateur a ajouté le commit [`04d9d4dd306cc4e27d4c44c6a1eca01be9328b26`](https://github.com/darknigthmare/yautja-la-longue-chasse/commit/04d9d4dd306cc4e27d4c44c6a1eca01be9328b26) à la branche existante de #39. À **`2026-11-01T01:01:18Z`**, l’API donne cette tête, confirmée séparément par `git ls-remote`. Son parent direct est `f54dd68c` : un seul commit est ajouté, sans réécriture de l’historique. Les trois fichiers du commit correspondent octet pour octet au candidat testé dans le vrai sparse checkout.

La [preuve de propagation](planet-pr33-39/pr39-pushed-event.json), le [relevé ls-remote](planet-pr33-39/pr39-ls-remote.txt) et l’[identité des fichiers commités](planet-pr33-39/pr39-pushed-source-identity.json) conservent cet événement. Les résultats originaux `48/48` et `164/164`, les anciens jobs verts et le typecheck en échec de `f54dd68c` ne sont pas réattribués à ce nouveau commit.

La nouvelle exécution [41259282388](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41259282388) est créée à `2026-11-01T01:01:16Z` pour **`04d9d4dd`**. Le nouveau job **« Full application TypeScript (planet PR) »** apparaît effectivement avec le job de domaine. Après leur première attente, les deux jobs réussissent, puis **le navigateur Chromium réussit lui aussi : les trois jobs de cette nouvelle tête sont verts**, exécution conclue `success` à la mise à jour API de **`01:19:01 UTC`**. La tête distante est revérifiée après cette conclusion et reste `04d9d4dd`, base `main`.

La [preuve intermédiaire des types verts](planet-pr33-39/pr39-new-head-types-green.json) et la [preuve finale des trois jobs](planet-pr33-39/pr39-new-head-final.json) conservent leurs propres dates. Aucun ancien run vert n’est réattribué au correctif. Ce résultat clôt le contrôle de cette barrière de compilation et de cette CI spécialisée ; il ne constitue pas une validation générale du jeu, des animations ou de la fidélité artistique de toutes les versions couvertes par la grande PR.

### Fusion #39 et intégration au runtime de travail

La fusion normale de #39 est confirmée par l’API à **`2026-11-01T01:27:01Z`**, commit [`f3a1acec8c2603b3442da774457dfe75947d97d8`](https://github.com/darknigthmare/yautja-la-longue-chasse/commit/f3a1acec8c2603b3442da774457dfe75947d97d8). Son arbre `4d66f050b9f37e9ff2ddcb900824c4b6951ccfab` est exactement celui de la tête revue et testée `04d9d4dd`. L’[événement de fusion](planet-pr33-39/pr39-merged-event.json) et la [preuve de l’arbre](planet-pr33-39/pr39-merge-tree.json) sont ajoutés après les observations initiales, sans les réécrire.

Le coordinateur a intégré ce `main` au runtime de travail sous `035880eac699b8be77b757421933876dd4d6a234`. La résolution du conflit `clanWarPlanetPhysicalIndexV125.ts` conserve exactement le blob de `main` `81a3ef52bdfd07fdba1c66dce8502025537cc148` : `netShares` et son usage des pourcentages V136 sont présents, l’ancienne variable morte `regionOf` n’est pas réintroduite. Natural Earth est explicitement ajouté à la liste des entrées runtime et au sparse de l’application. Voir la [preuve d’intégration](planet-pr33-39/pr39-root-integration.json). Le prochain gel/build et les recettes du runtime intégré gardent leur propre protocole ; la CI spécialisée de #39 reste une preuve de son commit, pas une attestation anticipée de ce nouveau build.

## Revue finale bornée de fusion #39

**Verdict favorable à une fusion logicielle normale de `04d9d4dd` sur le `main` revu `c5fc51dc`. Aucun blocage logiciel supplémentaire n’a été trouvé.** Ce verdict s’appuie sur les 164 tests locaux du domaine, le correctif de types vérifié dans le vrai sparse et les trois jobs verts de la nouvelle tête. La [revue structurée](planet-pr33-39/pr39-final-software-review.json) épingle les blobs des 19 fichiers inspectés et les huit contrats centraux comparés.

| Contrat examiné | Constat concret |
| --- | --- |
| Codes et anciennes parties | Les générateurs V102/V103/V115, catalogue V96, `save.ts`, `types.ts`, session et règles V85 sont des **blobs Git inchangés** par rapport à la base #33. Les apports visuels ne constituent pas une migration silencieuse du monde ou de la progression. |
| Imports | Limite de 64 Kio, validation recette/version/code et garde d’intention asynchrone. Les paramètres de génération restent un brouillon avant action explicite. Les kits/profils refusent les clés en trop, un autre monde, une région ou graine différente et une matière incompatible. |
| Persistance visuelle | Clés locales séparées, profil V134 de même `worldCode`, échecs de stockage renvoyés à l’interface. Le chargement dans l’atlas de bataille est explicite ; ces champs ne modifient ni contrôleur territorial ni stock ou combattant. |
| Cycle de vie des interfaces | RAF annulés, fetch/rendus sous `AbortController`, observers et listeners retirés ; le composant d’export est remonté par `planet.id`. Le panneau relief utilise une clé comprenant ses paramètres pour réinitialiser la traversée. Aucun nouveau Worker n’est introduit par ces fonctions. |
| Relief et déplacement | État privé de l’exercice, voisins contigus, contrôle du monde et des pentes, refus des cellules immergées. Les valeurs et messages décrivent des pixels du globe, pas une collision de personnage ou un ordre de campagne. |
| Fichiers et mémoire | ZIP V114 historique limité à 16 entrées, extension V151 séparée à 24, plafond commun de 64 Mio, noms/CRC/doublons vérifiés. Caches des études bornés ; URLs de téléchargement révoquées. |
| Données et provenance | Seul nouveau fichier public : Natural Earth de **138 160 octets**, blob `04811d72fff2701ec67587e30ad8942675b511e3`, identique à la provenance déclarée ; il est inclus par le packaging. Ses limites cartographiques et son domaine public sont explicités. Les 120 formes et 48 matières du registre ont toutes `approved1to1: false`. |

Risques concrets conservés au suivi, sans constituer des blocages inventés de cette fusion : le calcul des rasters/PBR et des exports est synchrone et peut coûter du temps ou de la mémoire sur une machine modeste ; le GPU peut utiliser le repli d’albédo annoncé ; les préférences visuelles locales n’ont pas de transaction multi-onglets ; la traversée reste un exercice cartographique à faible résolution. Le périmètre et ces limites sont déclarés par les interfaces et les README, et aucune clôture artistique globale n’en est déduite.

Les changements de #39 ne livrent aucun nouveau classeur XLSX prétendument complet : la traçabilité passe ici par les README, le registre de fidélité et les preuves de CI. Les autres classeurs et les 354 cibles artistiques Homeworld gardent leurs propres exigences. Une absence de validation exhaustive du produit ne doit pas être transformée en obstacle à l’intégration de ce lot logiciel borné et décrit honnêtement.

## Revues, portée et suite

Au relevé initial de cette tâche, aucune revue formelle ni commentaire technique inline n’était présent pour #33 ou #39. Les commentaires Codex décrivaient une revue non aboutie sur d’anciennes têtes, avec quota atteint. CodeRabbit expliquait que la revue automatique était ignorée hors branche par défaut ; son indicateur de check ne doit pas être pris pour une approbation du code courant. Aucun robot n’a été sollicité par commentaire dans cette tâche.

Les statuts Vercel pointant vers `build-rate-limit` sont des limites de déploiement distinctes de la compilation. Le build de production n’a pas été relancé localement pour ces PR pendant les recettes Homeworld. Les captures des anciens jobs navigateur n’ont pas été ouvertes par cet audit : aucune nouvelle admission artistique ou fidélité Predator/AVP 1:1 n’est attribuée.

Pour #39, la portée V154–V155 reste un **exercice cartographique** sur des pixels du raster global : les unités suivent des cases terrestres, leur profil et une coupe d’altitude. Une case peut représenter plusieurs kilomètres. Cela ne livre pas les collisions d’un personnage, les véhicules en mission, la conquête persistante ou les quatre modes de guerre sur un terrain métrique. Les 164 tests de domaine et les contrôles Chromium annoncés dans la PR ne changent pas cette limite.

État à la fin de ce lot : **#33 et #39 fusionnées**, correctif #39 vérifié et CI spécialisée verte conservée sur `04d9d4dd`. Les fusions, le correctif poussé et les changements de base sont ceux du coordinateur, consignés après leur exécution. Les qualifications initiales et leurs limites restent conservées ; les 354 cibles artistiques ne sont pas clôturées par ces intégrations logicielles.

Les métadonnées de cet agent sont désormais **stables pour la régénération du classeur de coordination** : neuf événements postérieurs au snapshot, 33 lignes originales et 29 dépendances préservées. Aucun autre changement documentaire n’est effectué après cette barrière sans nouvelle demande racine.

Les commandes, résultats, empreintes et limites sont indexés dans [evidence.json](planet-pr33-39/evidence.json). Les journaux ne constituent pas une attestation générale des versions V126–V155 ou une clôture de tous leurs travaux Excel.
