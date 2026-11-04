# Château orbital et arrivée planétaire

Intégration du 4 novembre 2026, version suivie **1.3.0**. La [PR #106](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/106) est **fusionnée dans `main` à 19:17:40 UTC**, au commit [`36f765c980acdc207fe89730ab519c6f769b3881`](https://github.com/darknigthmare/yautja-la-longue-chasse/commit/36f765c980acdc207fe89730ab519c6f769b3881). Les **16 workflows sont réussis** ; le [reçu final](qa/integration-c77c4ea3/final-integration-result.json) conserve leurs liens et la fusion.

La source qualifiée est [`c77c4ea37e3b1b0969a33917971f38496d4ee66a`](https://github.com/darknigthmare/yautja-la-longue-chasse/commit/c77c4ea37e3b1b0969a33917971f38496d4ee66a), équivalent local `c80fddb03ffa3b5e6c134fbb8754f0c2d169a366`. Son arbre `a946e3d8123aaed37b417664a3de1de970232548` est exactement celui de la fusion dans `main`. Les validations ci-dessous ont été exécutées avant la fusion ; aucune nouvelle exécution après fusion n’est revendiquée.

| Périmètre | Tests réussis | Recette ou contrôle | Preuves de cette source |
|---|---:|---|---|
| Wolf, mandat et arrivée | 278/278 | 32/32 contrôles ; 27 captures, 185 ressources visuelles demandées | [Rapport](qa/integration-c77c4ea3/wolf/report.json), [extraits du job](qa/integration-c77c4ea3/wolf/job-result-excerpts.log) |
| Clan Ship et flux communs | 217/217 | 22/22 parcours ; 11 captures recensées | [Rapport](qa/integration-c77c4ea3/clan/report.json), [extraits du job](qa/integration-c77c4ea3/clan/job-result-excerpts.log) |
| /dev, chasse et isolation | 61/61 | 15/15 scénarios ; 8 captures recensées | [Rapport](qa/integration-c77c4ea3/dev/report.json), [extraits du job](qa/integration-c77c4ea3/dev/job-result-excerpts.log) |
| V94 | 75/75 V113 | Strict **2 151 entrées PASS** ; cinq jobs réussis, trois groupes concordants | [Reçu terminal](qa/integration-c77c4ea3/v94-terminal-receipt.json), [manifestes et empreintes](qa/integration-c77c4ea3/v94-evidence-manifest.json) |

Wolf et Clan attestent source = checkout `c77c4ea3`, arbre de travail propre, zéro erreur et zéro ressource demandée manquante. /dev atteste également sa source propre, aucune erreur JavaScript ou console, aucune écriture de stockage et aucune ouverture IndexedDB observées. Les suites restent séparées : leurs totaux ne sont pas additionnés. V94 utilise le checkout synthétique `c915eb34`, dont la [comparaison](qa/integration-c77c4ea3/synthetic-merge-identity.json) avec `c77c4ea3` ne contient aucun fichier différent.

L’[inventaire qualifié et immuable](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/c77c4ea37e3b1b0969a33917971f38496d4ee66a/docs/qa/current-integration-20261103/runtime-inputs.json) compte **2 151 entrées**, **400 041 octets**, SHA-256 `06d2bd524bbba6708a78cc45b1da6a68c4360568b8002afb55c2f2289aa0b072`. Les [trois preuves V94 et les extraits strict/agrégat](qa/integration-c77c4ea3/v94-evidence-manifest.json) conservent le même run `41890840607`, tentative 1, checkout `c915eb34`.

Les **27 PNG déjà archivés sous `9da27c2a`** restent attribués à cette première recette Wolf réussie. Les captures courantes de `c77c4ea3` sont recensées dans leurs rapports et conservées dans les artefacts CI vérifiés, sans duplication ici. Le responsable a inspecté les vues Wolf courantes 06, 26 et 27 : pause à 320 px, refus de récompense et mandat terminé/repris. Cette revue technique limitée ne donne aucune approbation artistique humaine.

Le [point de reprise](POINT_DE_REPRISE.md) donne les sources, les preuves et la suite immédiate. Les passages `9da27c2a`, `3fc1a5bf` et `a5e41f66`, les annulations de `37128ba9` et la qualification historique `881b66da` restent conservés avec leurs résultats propres. Le code Clan Ship de la PR #104 et la clôture de suivi de la [PR #107](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/107) sont fusionnés ; leurs six fichiers sont repris depuis `a5e41f66`.

Les **30 revues artistiques humaines restent À revoir**, avec **0 approbation humaine**. L’écoute du mixage et la comparaison exacte du film restent ouvertes. Le contexte Vercel indique `build-rate-limit` : **aucun nouveau déploiement n’est attesté** par cette intégration.

## Château du Roi, système Wolf

La destination `wolf-orbital-castle` possède son propre état de visite. Le bouton du pont personnel ouvre l’approche orbitale, puis la baie royale. La coque personnelle choisie reste liée à la visite. Le retour s’effectue depuis cette baie.

Le lieu comprend neuf salles reliées : baie, sas, vestibule, galerie des trophées, audience, conseil, archives, cour d’épreuve et passage latéral. Le chasseur équipé se déplace dans un espace physique, avec collisions au sol, recherche de chemin au clic, seuil de proximité et ordre de profondeur. Le plan indique les connexions; il ne téléporte pas le joueur.

La première boucle complète est l’audience royale : consulter le protocole, rejoindre le Roi, entendre l’ordre, puis l’accepter ou le différer au conseil. Les archives enregistrent leur lecture. La cour conserve l’épreuve déterministe en trois sceaux, avec tentative et progression sauvegardées.

La reprise 1.3.0 ajoute une épreuve de combat non létale, distincte des sceaux : Sentinelle du Seuil, Gardien du Cercle, puis Maître de la Cour. Le joueur se déplace, attaque, pare les estocs et esquive les balayages. Les annonces et les fenêtres de récupération rendent les attaques lisibles. Les trois rencontres et leurs transitions sont couvertes par les tests comportementaux de la qualification historique `881b66da`. La [CI historique](qa/browser-41827785792/report.json) confirme également la victoire sur les trois gardes par les commandes ordinaires, la défaite, la reprise, le focus natif et le mobile. Le dossier de l’épreuve suit les tentatives, victoires, temps et dégâts reçus. Ce dossier ne distribue aucun butin et ne change pas les ressources de campagne.

Le mandat royal implémenté dans `3aaded18` ajoute une boucle distincte de cet entraînement : audience, trois repères aux archives, à la galerie et au conseil, puis une sentinelle en trois phases sans soins entre les phases. Le retour à l’audience attribue deux marques de clan une seule fois, avec un reçu lié à la campagne. Le mandat est qualifié par huit contrôles inclus dans la [recette Wolf de 32 contrôles sur `c77c4ea3`](qa/integration-c77c4ea3/wolf/report.json). Ils couvrent notamment la reprise exacte, le refus d’écriture de la récompense, la nouvelle tentative, le reçu unique et le rechargement. La recette précédente `9da27c2a` reste archivée à sa source.

Les contrôles suivent les raccourcis remappés du jeu, le clavier, la manette et les commandes tactiles. Les paramètres et la perte de focus suspendent le contrôleur. Les portes et les stations demandent que le chasseur ait atteint leur zone d’interaction.

Le format de visite V3 conserve les coordonnées, l’orientation, la révision et le combat, puis ajoute l’état du mandat. Les visites V1 et V2 migrent sans créer de mandat ni de récompense. Une visite V1 doit migrer vers une entrée sûre en conservant son audience et ses sceaux. Un checkpoint d’une autre campagne, d’une ancienne salle ou d’une ancienne révision doit être refusé. Les tests et la recette de ce raccordement restent séparés des résultats historiques V1.

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

Le château possède six ambiances adaptées à l’approche et aux salles. Le combat reçoit quatorze signaux, dont deux annonces distinctes pour l’estoc et le balayage. Ils suivent les événements réellement simulés : attaque, contact, parade, esquive, dégâts, endurance et résultat. La source courante ajoute dix identifiants audio dans `wolfCastleAudio` pour l’exploration et le mandat, dont les portes, les pas et les sceaux du château.

Le moteur commun possède le volume et le cycle de vie des voix. Sur la source historique `881b66da`, les 32 tests audio passent dans la [suite de 247 tests](qa/browser-41827785792/workflow-job.log) : arrêt à la pause, suspension, changement de salle, checkpoint et résultat unique sont notamment contrôlés. Le run audio local initial et ses commandes restent conservés dans `qa/local-checks-1.3.0.json`. La suite courante de [278 tests Wolf](qa/integration-c77c4ea3/wolf/job-result-excerpts.log) inclut les tests du directeur audio et réussit sur `c77c4ea3` ; les dix signaux d’exploration et de mandat sont intégrés et testés. La recette navigateur de 32 contrôles et l’écoute du mixage restent deux vérifications distinctes. Aucun nouveau sous-total audio n’est déduit des 32 tests historiques. Ces sons sont des créations synthétisées pour le jeu, sans piste extraite du film.

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

### Première intégration historique — a5e41f66

Le [rapport Clan](qa/integration-a5e41f66/first-clan-run/report.json), run `41877760792` / job `126741826613`, réussit **22/22 parcours** ; le job confirme également **217 tests réussis**. Le [rapport Wolf](qa/integration-a5e41f66/first-wolf-run/report.json), run `41877760754` / job `126742547100`, conserve **18 contrôles réussis sur 19 exécutés, sur 32 prévus**. Les trois phases de la sentinelle passent, puis le retour conseil → audience dépasse le délai d’attente. La [capture d’échec](qa/integration-a5e41f66/first-wolf-run/failure.png) et l’[état de page](qa/integration-a5e41f66/first-wolf-run/failure-page.txt) sont archivés.

Les deux rapports identifient `a5e41f66` comme source et checkout, avec arbre de travail propre, zéro exception JavaScript et zéro ressource demandée manquante dans le parcours observé. La recette Wolf reste incomplète : **32 scénarios et 27 captures** sont le périmètre prévu, pas un résultat acquis. Ces observations ont conduit aux corrections conservées dans le [reçu de source](qa/integration-9da27c2a/source-and-corrections.json). Les qualifications de `9da27c2a` et de `c77c4ea3` possèdent leurs propres runs. Le [rapport de l’ancien instantané du classeur](history/workbook-verification-before-c77-7b1c7686.json) conserve la revue antérieure aux premiers résultats de `a5e41f66`.

Le [premier V94](qa/integration-a5e41f66/first-v94-run/first-v94-model-evidence.json), run `41877760809`, réussit le strict sur **2 144 entrées** et **75/75 tests V113**. Le [journal d’agrégat](qa/integration-a5e41f66/first-v94-run/aggregate-job.log) confirme trois groupes concordants, tentative 1, checkout `7e14ce84ad01ee307e7f67a6408c8244cfe4fff8`, sans différence de fichiers avec `a5e41f66`. Le premier passage compte 12 workflows réussis sur 15 selon le relevé du responsable. Il ne qualifie ni la source courante ni son inventaire de **2 151 entrées**.

### Corrections locales et adoption QA

La [reproduction du gantelet](qa/corrections-20261104/gauntlet-fix-local-result.json) conserve **6/7** avant la correction applicative, avec `feral` observé au lieu de `wolf`, puis **7/7** sur la base `a5e41f66` / `5daa00e1` corrigée localement. Les [tests /dev](qa/corrections-20261104/dev-travel-integration-result.json) et leur [journal](qa/corrections-20261104/dev-travel-integration.log) réussissent **8/8** sur `a14983df`. Le [reçu d’adoption](qa/integration-9da27c2a/source-and-corrections.json) conserve un autre passage local V142 **7/7** sur `7575782a` avec uniquement les lignes de workflow modifiées. Ces exécutions restent séparées, sans addition entre versions ni qualification navigateur implicite.

### Tests locaux historiques — a5e41f66

Les [tests locaux du mandat, du combat, de la sauvegarde et de l’audio](qa/integration-a5e41f66/mandate-model-tests-result.json) réussissent **60/60 tests**, avec **0 échec et 0 test ignoré**, en **10,514 secondes** sur `5daa00e1`. Le [journal](qa/integration-a5e41f66/mandate-model-tests.log) et le [relevé de source](qa/integration-a5e41f66/source.json) rattachent cette preuve locale à l’arbre exact publié dans `a5e41f66`.

Le [second passage local sur les contrats Clan/Wolf](qa/integration-a5e41f66/clan-wolf-contract-tests-result.json) réussit **68/68 tests**, avec **0 échec et 0 test ignoré**, en **26,985 secondes** sur les mêmes sources. Son [journal](qa/integration-a5e41f66/clan-wolf-contract-tests.log) couvre les suites `game-client-ship-flow`, `clan-ship-docking` et `clan-ship-save`.

Les deux passages portent sur **sept fichiers distincts et totalisent 128 tests locaux réussis (60 + 68)**. Ces résultats ciblés restent distincts du premier passage CI Wolf incomplet sur `a5e41f66` et de la recette réussie sur `9da27c2a`.

### Build local historique — a5e41f66

Le [build local historique](qa/integration-a5e41f66/production-build-result.json) réussit sur cette même source en **316,430 secondes**, avec le code de sortie 0 : compilation Next.js webpack, TypeScript et contrôle CSS PIT. Le [journal](qa/integration-a5e41f66/production-build.log) et le résultat consignent la restauration du manifeste audio régénéré ; les sources suivies restent propres. Les contrôles native-origin et static-output sont ignorés avec la raison `not-exact-linux-vercel-build-root`. Cette preuve ne constate ni déploiement, ni smoke test, ni réussite de la CI distante.

### Preuves historiques conservées

Les résultats effectifs sont consignés dans `workbook-evidence.json` et le classeur. La [CI historique 41827785792](qa/browser-41827785792/workflow-result.json), sur `881b66da` (code local `132b2f1f`, arbre `54804a2c`), réussit **247/247 tests**, TypeScript complet, ESLint strict et l’audit des 30 paires PNG/WebP. Aucun échec ni test ignoré. Les 29 tests château/combat, les 42 tests de sauvegarde/intégration et les 32 tests audio sont inclus dans les 247 ; ils ne s’ajoutent pas au total. Les [huit tests world-screens](qa/composition-132b2f1f/world-screens-result.json) et l’[audit géométrique de 24 rectangles](qa/composition-132b2f1f/background-frames-audit.json) restent deux preuves complémentaires distinctes.

Le [build de production historique](qa/build-132b2f1f/build-result.json) réussit sur la source locale `132b2f1f` en **243,649 secondes** : webpack, TypeScript, neuf pages et contrôle CSS PIT. Les contrôles conditionnels native-origin et static-output ne s’exécutent pas hors du chemin de build Vercel prévu. Ce résultat n’est pas un constat de déploiement Vercel.

Le [rapport navigateur historique](qa/browser-41827785792/report.json) réussit **24/24 contrôles** : 23 parcours fonctionnels puis le contrôle des exceptions et des ressources. Il comprend les trois gardes vaincus par les commandes ordinaires, la défaite/reprise, les checkpoints, les changements natifs d’onglet, le mobile à 320 et 390 pixels, le menu/reload, le refus d’enregistrement puis sa nouvelle tentative, le relais abrégé unique et les huit plans jusqu’au relais naturel à 62 secondes. Il observe **zéro exception JavaScript** et **zéro ressource visuelle demandée manquante** sur 185 chemins. Parmi les 30 WebP du lot, 29 sont sollicités ; `low-fog.webp` n’est pas demandé par ce parcours.

Les **21 captures historiques** sont conservées avec le rapport et le journal du job. Les dix vues ciblées après les corrections confirment le contour circulaire de la planète, le panorama jungle continu, les annonces finales de victoire et une capture pour chacun des huit plans. Cette revue statique par des assistants ne certifie ni l’écoute ni la fluidité du mouvement et ne remplace pas la revue artistique humaine.

Les rapports successifs conservent les défauts observés et leurs corrections : intentions de déplacement aux checkpoints, sélection réelle de mission, ressources de la fixture, stabilisation du resize et contraintes de largeur de l’arrivée. La première recette complète verte sur `5098adea` reste identifiée comme antérieure aux derniers ajustements de composition. Les 294 tests et le build de 1.2.0 restent des preuves historiques d’un autre périmètre. Le lancement local de Chromium s’était arrêté avant le premier scénario (`socket() failed: Operation not permitted`) ; les succès navigateur proviennent de la CI.

Le classeur est prolongé à partir du fichier existant. Ses six onglets d’origine, les 27 prompts et les champs de revue humaine sont conservés. Les onglets `Combat` et `Audio`, les trois nouvelles poses, les copies WebP et les preuves 1.3.0 complètent le suivi. Le générateur `build-workbook.mjs` importe le classeur, met à jour les dépendances concernées et garde les champs d’approbation humaine éditables. Le [rapport de vérification](workbook-verification.json) atteste **58 formules recalculées sans erreur**, huit onglets conservés et 30 avis humains inchangés. Les **15 vues modifiées** sont relues ; les 15 autres aperçus sont identiques aux vues déjà relues. Cinematique, Sprites et Prompts sont inchangées au contrôle XML natif. Les rapports 1.2.0 et de l’instantané antérieur à c77 sont conservés dans `history/`.

## Points de production encore ouverts

La PR #106 est fusionnée après les 16 workflows réussis. Le mandat royal et les dix signaux audio d’exploration et de mandat sont qualifiés techniquement sur `c77c4ea3`. L’écoute du mixage et le relevé exact de la vidéo de référence restent ouverts. Les 30 images restent **À revoir**, avec **0 approbation humaine**. Le contexte Vercel `build-rate-limit` ne permet pas d’attester un nouveau déploiement.

## Point de reprise

Le [point de reprise](POINT_DE_REPRISE.md) rassemble la PR #106, les sources locale et publiée, les preuves du lot et le prochain périmètre. Conserver les 30 PNG, leurs copies WebP et les 30 prompts. La visite, le combat d’entraînement, le mandat royal et les huit plans d’arrivée constituent la base à prolonger.
