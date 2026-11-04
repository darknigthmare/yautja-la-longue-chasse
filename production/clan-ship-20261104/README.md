# Clan Ship — intérieur physique et suivi de production

Reprise du **4 novembre 2026, Europe/Paris**, dans la [PR #104](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/104), branche `feat/clan-ship-docking-20261104`. La base initiale est `main` à `d56c0e0`. La PR est **ouverte et prête pour revue** (`draft=false`) ; sa base relevée est `eeb2362`. La fusion et la publication en production restent des étapes distinctes. Le Clan Ship est le vaisseau collectif AVP auquel **le vaisseau personnel du joueur s’amarre** ; la coque personnelle conserve son identité et sa propriété.

## Point repris et réalisation courante

La première livraison contenait l’amarrage, un plan de visite des sept salles, les retours des services et la reprise de campagne. Le travail repris ajoute **l’intérieur parcourable** : un chasseur situé sur le sol, des obstacles, des portes entre salles et des installations utilisables à portée. Les fichiers non publiés de cette deuxième étape ont été récupérés et conservés ; le chantier continue à partir de ces fichiers.

Le parcours suit l’anneau **hangar → armurerie → entraînement → conseil → archives → trophées → soins → hangar**. Choisir une salle lance un trajet par ses portes successives. Le clavier ou la manette reprend la main ; le bouton Arrêter annule le guidage. Le pointeur et les commandes tactiles utilisent la même géométrie que le déplacement manuel.

Les six services existants s’ouvrent depuis leur installation. Le Clan Ship reste monté et suspendu pendant leur consultation, y compris pour le conseil. Fermer le service restitue la même position. La sauvegarde durable conserve l’amarrage et la salle ; une recharge replace le chasseur à l’entrée sûre de cette salle. Le retour au pont personnel et le désamarrage restent deux étapes distinctes.

Le [contrat de l’intérieur](interior-spec.md) documente les métriques, commandes, entrées, transitions, collisions et limites de persistance. L’état exact des fichiers et des preuves courantes est enregistré dans [production-state.json](production-state.json).

## Livrables

| Fichier | Contenu |
|---|---|
| [shiphub-reprise-20261104.xlsx](shiphub-reprise-20261104.xlsx) | Cinq onglets conservés : reprise, Clan Ship, assets, château, arrivée et QA. Les états de production, intégration, test et revue humaine restent séparés. |
| [build-workbook.mjs](build-workbook.mjs) | Générateur du classeur avec `@oai/artifact-tool`, recalcul des compteurs et rendus de contrôle. |
| [production-state.json](production-state.json) | Inventaire des images réellement produites et preuves du plan initial puis de l’intérieur. |
| [verification.json](verification.json) | Résultats de recalcul, contrôle des empreintes d’assets et état de la revue du classeur. |
| [qa-interior/](qa-interior/README.md) | Rapport CI de l’intérieur physique, captures et provenance de l’artefact, distincts de la baseline `qa/`. |
| [interior-spec.md](interior-spec.md) | Contrat du parcours physique des sept salles. |
| [prompts.md](prompts.md) | Trois briefs de conception et provenance du lot artistique du Clan Ship. |
| [castle-spec.md](castle-spec.md) | Château orbital autonome : audience de campagne, hub royal et instance future. |
| [arrival-spec.md](arrival-spec.md) | Huit plans sur 62 secondes, capsule indépendante, pause, reprise et passage unique à la chasse. |
| [individual-asset-prompts.md](individual-asset-prompts.md) | Trente prompts individuels de génération et deux instructions de réemploi pour le château et l’arrivée. |
| [design-data.json](design-data.json) | Identifiants, graphe des neuf lieux du château, assets, états et durées du storyboard. |
| [references.md](references.md) | Sources consultées, limites des références et décisions d’adaptation. |
| [handoff.md](handoff.md) | Point exact de reprise, source qualifiée, limites et suite du travail sans recommencer le lot. |

## Art livré et articulation avec le jeu

Les **sept arrière-plans individuels** mesurent 1 440 × 800 pixels. Ils possèdent un fichier source PNG et une version runtime WebP. Leur manifeste se trouve dans [`public/game/clan-ship/manifest.json`](../../public/game/clan-ship/manifest.json).

Les **huit props du Clan Ship** sont produits **un par fichier transparent** : console d’amarrage, table du conseil, râtelier, forge, établi des trophées, lit médical, terminal d’archives et poste d’entraînement. Leurs dimensions mesurées, limites de pixels visibles, pivots et empreintes SHA-256 sont dans [`public/game/clan-ship/props/manifest.json`](../../public/game/clan-ship/props/manifest.json) et dans la feuille Assets. Les sources et prompts exécutés restent dans `art-source/clan-ship-props-v1/`. Les portes et le rig du chasseur réemploient les ressources appropriées du jeu. La collision utilise une empreinte au sol propre à chaque installation, indépendamment de la taille de son image.

Six installations supplémentaires réemploient trois images du kit : la console secondaire des archives, les terminaux du hangar, du conseil, des trophées et des soins, ainsi que le râtelier d’entraînement. Le bord de sol utilise également l’image existante via le CSS. La feuille Assets distingue ces réemplois effectivement vus des ressources de secours et des simples candidats du catalogue.

Les sept fonds totalisent **1 661 452 octets** et les huit props **1 368 700 octets**. Le générateur vérifie les fichiers, leurs empreintes et ces deux totaux avant d’exporter le classeur.

Un fichier « Généré » est réellement présent et mesuré. « Intégré au code » signifie qu’il est référencé par la scène. Le chargement testé et la revue dans les captures sont des étapes supplémentaires. La colonne « Revue humaine » reste éditable et n’est jamais remplie par déduction d’un contrôle technique. Les salles et images nouvelles constituent une adaptation de gameplay inspirée du brief AVP ; aucune fidélité canonique à l’identique n’est déduite de leur génération.

## Vérification de l’intérieur courant

**La source `22fad968311d252310fe2fde281f71564a401a64` a obtenu 22/22 scénarios navigateur et 201/201 tests automatisés réussis**, dont les 17 tests du contrôleur physique. TypeScript et ESLint strict ont réussi dans le même [run 41818690041](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41818690041). Le [rapport conservé](qa-interior/run-41818690041/report.json) enregistre zéro asset demandé manquant et zéro exception JavaScript, avec un checkout identique à la source et un arbre de travail propre.

Le [run de régression 41818690146](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41818690146) a aussi réussi les étapes TypeScript, build Next.js webpack, smoke HTTP du serveur compilé et des cinq routes protégées, puis lint runtime sur la même source. Ces étapes sont enregistrées séparément ; le workflow poursuivait ses autres recettes au moment du relevé.

La qualification porte sur cette révision finale de présentation : libellé de coque ancré au viewport, disparition naturelle du toast avant capture et deux cadrages mobiles complémentaires. La branche annonce `GAME_RELEASE_VERSION=1.2.0` ; la production précédemment relevée était en `1.1.0`. La réussite de la CI ne constate ni fusion ni déploiement.

Le script [`scripts/qa-clan-ship-browser.mjs`](../../scripts/qa-clan-ship-browser.mjs) définit désormais **22 scénarios** sur le vrai `GameClient`. Ils couvrent :

1. Ancienne campagne, approche, confirmation maintenue et conservation de la coque.
2. Marche au clavier et à la manette, trajet au pointeur, collision et contournement d’installation.
3. Guidage par les portes, changement de destination pendant la marche, interruption manuelle et Arrêter.
4. Accès de proximité, sept salles et retour des six services à la même position.
5. Paramètres, changement d’onglet, touches maintenues et reprise des commandes.
6. Sauvegarde, menu, rechargement, Continuer et restauration du checkpoint manuel.
7. Retour au pont personnel, voyage bloqué pendant l’escale, désamarrage et annulation d’approche.
8. Parcours tactile à 390 et 320 px, caméra, mouvements réduits et chargement des ressources demandées.

Les 22 résultats sont rattachés individuellement à leur scénario et à leur source dans `production-state.json.current`. Les résultats navigateur qualifient le parcours exercé ; l’ouverture et la fermeture des services n’étendent pas cette preuve à tous leurs coûts, récompenses ou effets métier. Les cas de propriété de campagne, d’import et d’échec d’écriture conservent leurs tests d’intégration dédiés.

La CI utilise Chromium `153.0.8010.12` avec fenêtre. Elle mesure la perte native de focus (`true → false → true`) alors que le document reste visible ; elle ne revendique pas un passage observé à `document.hidden=true`. Le pointage tactile à 320 px atteint exactement sa destination après actualisation de la caméra. Les sept fonds sont effectivement décodés et visités. Les onze captures et les empreintes de leurs fichiers sont conservées dans `qa-interior/` ; la baseline `qa/` reste intacte.

Les onze captures ont reçu une revue technique satisfaisante de root et du relecteur indépendant, sans défaut visuel bloquant reproduit ; les réserves précédentes sont levées pour cette preuve. Le détail est conservé dans `production-state.json.current.reviewScreenshots`. Les deux images mobiles représentent des positions complémentaires de la zone à défilement interne. L’approbation artistique humaine des quinze images reste **à examiner**.

### Preuve historique du plan de visite

La source `9d77af88148e8ab5b2d49e64040024c57aeba67d` a obtenu **184/184 tests, 10/10 scénarios navigateur, zéro asset demandé manquant et zéro exception JavaScript** dans le [run 41789974649](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41789974649). TypeScript et ESLint strict ont réussi en CI ; un build Next webpack a abouti localement. Les captures 1440 et 320 px et le rapport restent inchangés dans [`qa/`](qa/README.md).

Cette preuve couvre l’amarrage, les sept salles accessibles par le plan, les six services, la sauvegarde et la reprise. Elle précède le déplacement physique. Le classeur l’identifie par « Validé (plan) » et distingue explicitement les contrôles actuels. Les variantes de propriétaire et d’import étaient couvertes par les 20 tests d’intégration de `tests/clan-ship-save.test.mjs`, sans parcours UI dédié.

## Château et arrivée planétaire

Les dossiers de conception ci-dessous sont conservés dans cette livraison. Le château et l’arrivée sont **hors du périmètre implémenté de la PR #104**. Des travaux existent dans d’autres worktrees ; les états de ces briefs ne prétendent pas décrire leur avancement et cette livraison ne les fusionne pas.

Le château orbital du Predator King / Wolf System reste une **destination de conception distincte**. Son dossier définit neuf lieux, vingt modules individuels, trois usages et les contrats de sauvegarde, d’audience et d’instance. Le premier parcours proposé est une audience de campagne avec retour garanti. Le noyau de vingt images ne couvre pas encore les PNJ, les poses, les dialogues, l’audio ou les missions supplémentaires ; leurs dépendances sont suivies dans la feuille Chateau.

L’arrivée planétaire reste un **storyboard original de 62 secondes et un contrat d’implémentation** : huit plans, dix images à produire, deux réemplois à raccorder et six cues audio. Elle doit conserver la mission, la coque, le preset, la graine et le même identifiant de chasse, aussi bien à la fin naturelle qu’après Passer ou rechargement. Elle ne remplace pas le Clan Ship.

Les références précises du château et le découpage filmique jusqu’à 1:02 restent à confronter aux planches ou au support choisi. Les documents et prompts donnent des propositions exploitables ; leur présence ne qualifie aucune scène ni image de ces deux chantiers dans la PR #104.

## Régénérer et relire le suivi

`production-state.json` porte l’état des fichiers et des preuves ; `design-data.json` porte les demandes des briefs conservés. Le générateur vérifie les empreintes et les poids de chaque image déclarée générée, puis calcule les totaux à partir des lignes détaillées. Une qualification CI exige le rapport correspondant à la source, ses scénarios réussis et ses fichiers de preuve conformes. Le générateur vérifie également les portes réciproques du château et la somme des durées. Aucun pourcentage global n’additionne des chantiers de tailles différentes.

Exécuter `build-workbook.mjs` avec `$CODEX_PRIMARY_RUNTIME_NODE` depuis un dossier temporaire dont `node_modules` pointe vers `$CODEX_PRIMARY_RUNTIME_NODE_MODULES`. `SHIPHUB_OUTPUT` permet de choisir un dossier sous `outputs/`. Le fichier final est ensuite copié dans ce dossier de production. Les modifications faites directement dans Excel doivent être reportées dans les sources JSON avant une régénération pour être conservées.

Les cinq feuilles sont rendues par sections pour vérifier les libellés, retours à la ligne et compteurs. Le contrôle change temporairement un statut d’asset et une durée de plan, vérifie la propagation puis restaure les données. La revue des rendus et les résultats de jeu sont consignés séparément dans `verification.json`.

## Prochain point de reprise

1. Vérifier la publication de ce suivi et de l’Excel avec la preuve finale de `22fad968311d252310fe2fde281f71564a401a64` dans la PR #104, déjà ouverte et prête pour revue, puis suivre sa revue et la conclusion du workflow général.
2. Conserver ce point de reprise : intérieur, quinze images générées, onze captures et cinq feuilles sont déjà réalisés ; mettre à jour leurs sources pour toute évolution.
3. Rapprocher ensuite les chantiers parallèles château et arrivée de leurs dossiers de conception conservés et de leur état propre, sans recommencer le lot Clan Ship.
