# Qualification de rendu et ressources — référence cloud V112

Révision source : `e4a6c64a1e77edad8865aa05ca7c2901d62bfa09`. Résultat du harnais : **PASS**, soit 16 exécutions actives, 1 920 trames mesurées, huit comparaisons de digest partiel identiques, 515 images réellement décodées et aucun asset de chasse manquant. **Le budget de 16,67 ms n'est atteint dans aucune des 16 passes de ce runner.** Cette observation ne qualifie aucun matériel physique cible et ne clôt pas cette partie de REM112-05.

## Méthode et environnement

Commande réellement exécutée depuis la racine du dépôt :

```sh
node scripts/qa-hunt-render-reference-v112.mjs --frames 120 --warmup 30
```

Le script utilise les dépendances verrouillées existantes et le Chromium déjà installé. Node v24.19.0, Chromium 154.0.8037.57, Linux 6.18.57, CPU AMD EPYC 9V74 80-Core Processor. Le profil Sites est portable : SITES_MANAGED_LINUX_CONTAINER absent, référence Sites local.md lue. Le serveur écoute un port éphémère, le profil Chromium est isolé et les deux sont fermés en fin de test. Les agents de campagnes ont suspendu leurs boucles CPU pendant ces mesures.

Viewport et bitmap de 1280 × 720, DPR 1, headless. Le pilote annoncé est ANGLE/SwiftShader et Chromium indique Canvas 2D, composition et rasterisation en logiciel. Les paramètres exacts et les capacités observées figurent dans [render-performance.json](render-performance.json).

HuntCanvas est compilé en mémoire avec les options de production et minification. Le harnais appelle makeGameState, stepGame, renderGame et snapshot natifs et reprend textuellement l'initialisation et le chargeur AssetBank de la source. Il n'altère aucun fichier de production. Il emploie le GameAudio réel, les sons du manifeste, les événements natifs et l'ambiance du biome. Le shell React/DOM complet reste en dehors du coût mesuré.

Difficulté hunter, équipement et apparence defaultSave du 2 novembre 2026, gore réduit activé et secousses désactivées. Le mix natif vaut master 1, musique 0,65, effets 1, sans mute. Les huit missions gardent leurs ennemis, géométries, collisions, textures, palettes et rigs. Toutes les vagues authored sont activées à t=0 ; deux ou trois ennemis sont tués par damageEnemy natif pour garder les vrais cadavres et effets. Seul le joueur est placé au sol dans la fenêtre la plus dense parmi les candidats centrés sur les acteurs, sans déplacer ennemis ni props. Son invulnérabilité de fixture évite une scène morte. Les nombres observés de personnages visibles sont indiqués plus bas.

Chaque passe reçoit les mêmes commandes normalisées et une graine isolée de l'aléatoire audio/rendu. Après 30 trames de chauffe, 120 intervalles requestAnimationFrame et coûts CPU sont relevés. Les percentiles suivent le rang supérieur ceil(n × fraction). Chaque callback avance la simulation de 1/60 s, soit 2,5 s simulées par passe, dont 2 s mesurées. Une trame retardée ralentit donc la simulation de fixture ; le rattrapage de l'accumulateur du shell n'est pas reproduit.

Les chargements initiaux de qaPrepare sont hors chronométrage. Le préchargement natif des secteurs reste actif pendant la mesure et peut y ajouter un chargement ou décodage tardif. Les deux passes ont des historiques de cache différents. Le digest compare elapsed/phase, position/santé du joueur, position/santé/activité des ennemis, cadavres et reçus ; il ne représente pas tout le GameState.

## Trames observées

Toutes les durées sont en millisecondes. La colonne mémoire est le tas JavaScript après GC forcé en fin de passe, en MiB.

| Mission | Passe | rAF p50 | rAF p95 | rAF p99 | rAF max | Canvas submit p95 | Tas JS MiB |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| jungle-vey | 1 | 150.0 | 166.7 | 183.3 | 183.3 | 96.8 | 5.42 |
| jungle-vey | 2 | 166.6 | 166.8 | 183.4 | 183.4 | 99.6 | 6.24 |
| ice-cryostalker | 1 | 166.6 | 183.4 | 183.4 | 200.0 | 169.1 | 6.36 |
| ice-cryostalker | 2 | 166.6 | 183.4 | 200.0 | 200.0 | 175.4 | 6.51 |
| volcano-bad-blood | 1 | 150.0 | 166.7 | 166.7 | 183.4 | 49.6 | 6.64 |
| volcano-bad-blood | 2 | 150.0 | 166.7 | 183.3 | 183.4 | 50.0 | 6.73 |
| swamp-hydra | 1 | 150.0 | 183.3 | 183.4 | 183.4 | 61.8 | 6.73 |
| swamp-hydra | 2 | 150.0 | 183.3 | 200.1 | 216.6 | 61.5 | 6.79 |
| desert-sandmaw | 1 | 150.1 | 166.7 | 183.3 | 183.4 | 52.2 | 6.89 |
| desert-sandmaw | 2 | 150.0 | 183.3 | 200.0 | 233.3 | 51.1 | 6.93 |
| ocean-leviathan | 1 | 150.0 | 166.7 | 183.3 | 183.3 | 97.4 | 6.93 |
| ocean-leviathan | 2 | 150.1 | 183.3 | 199.9 | 200.0 | 111.2 | 6.95 |
| fungal-hivemind | 1 | 166.6 | 183.4 | 200.0 | 216.7 | 57.3 | 6.98 |
| fungal-hivemind | 2 | 150.1 | 183.3 | 183.4 | 183.4 | 56.6 | 7.03 |
| ruins-ancient-guardian | 1 | 166.6 | 166.7 | 183.4 | 200.0 | 48.1 | 7.01 |
| ruins-ancient-guardian | 2 | 150.1 | 183.3 | 183.3 | 299.9 | 48.8 | 7.07 |

Les p95 rAF vont de 166,7 à 183,4 ms et le pic atteint 299,9 ms. La simulation CPU a un p95 de 1,5 à 1,9 ms ; les coûts Canvas et navigateur dominent donc cette référence logicielle. Les intervalles incluent la planification du navigateur et ne mesurent pas une latence d'affichage physique. Le temps de soumission Canvas n'est pas un temps GPU.

Le diagnostic séparé de 12 rendus statiques sur les ruines ajoute un chronométrage autour de drawImage. Il relève 48.7 ms de rendu moyen, mais seulement 8.5 ms cumulées dans les wrappers drawImage sur les 12 rendus. Il n'isole donc pas une ressource coûteuse ni une correction de production établie. Il est exclu des 1 920 trames. Aucune optimisation, simplification artistique ou comparaison avant/après n'est revendiquée.

## Mémoire et densité

Les deux échantillons par passe suivent un GC CDP, effectué hors des régions chronométrées. Le tas JS final va de 5.42 à 7.07 MiB. Le harnais conserve une image par URL dans sa Map d'audit au fil des missions ; ces valeurs excluent les bitmaps, allocations GPU/audio et le RSS des processus Chromium. Cette durée et ces échantillons ne démontrent pas l'absence de fuite.

| Mission | Ennemis authored | Cadavres initiaux | Pic vivants visibles | Captures natives |
| --- | ---: | ---: | ---: | --- |
| jungle-vey | 9 | 2 | 3 | [passe 1](jungle-vey-pass1.png) · [passe 2](jungle-vey-pass2.png) |
| ice-cryostalker | 9 | 2 | 3 | [passe 1](ice-cryostalker-pass1.png) · [passe 2](ice-cryostalker-pass2.png) |
| volcano-bad-blood | 12 | 3 | 6 | [passe 1](volcano-bad-blood-pass1.png) · [passe 2](volcano-bad-blood-pass2.png) |
| swamp-hydra | 12 | 3 | 5 | [passe 1](swamp-hydra-pass1.png) · [passe 2](swamp-hydra-pass2.png) |
| desert-sandmaw | 12 | 3 | 5 | [passe 1](desert-sandmaw-pass1.png) · [passe 2](desert-sandmaw-pass2.png) |
| ocean-leviathan | 12 | 3 | 4 | [passe 1](ocean-leviathan-pass1.png) · [passe 2](ocean-leviathan-pass2.png) |
| fungal-hivemind | 12 | 3 | 5 | [passe 1](fungal-hivemind-pass1.png) · [passe 2](fungal-hivemind-pass2.png) |
| ruins-ancient-guardian | 12 | 3 | 7 | [passe 1](ruins-ancient-guardian-pass1.png) · [passe 2](ruins-ancient-guardian-pass2.png) |

## Intégrité, fidélité et audio

[assets-observed.json](assets-observed.json) conserve les dimensions, les pixels visibles/non opaques échantillonnés, l'URL et chaque réponse servie. Les 515 images ont des dimensions positives et des pixels visibles dans leur échantillon réduit. Les 537 ressources servies avec succès correspondent toutes à leur blob Git ; elles représentent 86 163 104 octets uniques (82.17 MiB), sans prétendre mesurer tout le trafic des rechargements. L'unique 404 est favicon.ico, hors ressources de chasse.

Le manifeste et les 21 SFX authored sont chargés ; les 21 effets sont décodés à l'état ready dans chacune des passes, et les événements jump, scan, slash, footstep et objective observés passent par le moteur réel. Les huit ambiances de mission restent procédurales selon leur contrat. Les sept contextes musicaux gardent le silence optionnel prévu, faute de source déclarée. Le fichier ship est vérifié séparément dans l'audit ; il n'est pas présenté comme l'ambiance de ces missions.

[assets-audit.md](assets-audit.md) et [assets-audit.json](assets-audit.json) complètent les captures : 17 bitmaps classic mesurés en pleine définition, tête V62 et pivot examinés, 22 sources audio exactes et distinctions explicites entre adaptations V62, matériaux PHG reconstruits et originaux. Le [smoke immuable](assets-smoke.json) conserve sa propre empreinte. Aucun asset, palette, cadrage, pivot, registre, ancien rapport ou statut artistique n'est modifié. Aucun besoin concret de génération n'a été identifié.

La qualification restante comprend matériel cible et comportement thermique, coût du shell complet, temps GPU, rétention mémoire prolongée, contrôleurs physiques, revue artistique humaine de toutes les poses et écoute sur sortie physique. Les preuves de simulation ou de chargement ne remplacent pas ces validations.
