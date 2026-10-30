# Homeworld — coût de préparation des trajets

## Objectif et base

**Résultat mesuré :** la médiane de la première réponse du Worker passe de
**9 468,7 ms à 4 207,2 ms**, soit **55,6 % de temps en moins** sur ce retour
audience → port. Chaque variante utilise trois Workers Chromium neufs, la même
fixture, les mêmes outils et le même environnement. Les contrôles natifs du
trajet et du traitement des demandes restent réussis.

Cette continuation de la [PR #25](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/25)
part du commit `a185398b24ffe458c6a6f7e622e5d7283de3d701`. Le
[parcours précédent](gamedev-homeworld-legacy-20261029.md) avait établi que le
guide pouvait atteindre l'audience puis revenir au port en contournant une caisse
déposée sur l'escalier du Conseil. Il avait aussi mesuré un calcul initial de
retour particulièrement lent.

Le chantier applique la référence `performance-optimization` du
[guide du projet](GAMEDEV_AGENT_GUIDE.md) : reproduire le coût, profiler les
fonctions responsables, réduire le travail nécessaire, puis comparer la même
demande. Il porte sur la latence de préparation d'un itinéraire, distincte du
temps de rendu et des FPS.

## 1. Une demande issue du parcours réel

La fixture [homeworld-return-route-v113.json](../tests/fixtures/homeworld-return-route-v113.json)
est produite avec les fonctions du test de trajet V113, sur la base `a185398` :

- Prise et transport de la caisse large : 1 421 pas du moteur, 7 140,37 unités
  de monde, puis interruption et dépôt sur le palier du Conseil.
- Aller guidé par l'ascenseur des délégations et l'escalier de l'acropole :
  854 consultations du guide et 172 pas de transition natifs.
- Export du contexte atteint dans `throne-audience`, niveau `+2`, avant toute
  demande de retour au responsable portuaire `cargo-steward-v108`.

Le checkpoint conserve l'entrée réellement utilisée et le chargement confirmé.
Le [générateur de cette fixture](qa/gamedev-navigation-performance-20261029/fixture-build-run.mjs)
et sa [trace](qa/gamedev-navigation-performance-20261029/fixture-build.log) sont
conservés tels qu'exécutés, avec leurs chemins d'environnement. La sauvegarde
préparée reste une fixture ; elle n'est pas une partie utilisateur.

## 2. Diagnostic avant modification

### Profil CPU sur modules neufs

Le [profil Node](qa/gamedev-navigation-performance-20261029/node-before.json)
démarre après le chargement des modules, avec leurs caches de trajets neufs.
Le profiler V8 échantillonne le CPU à une milliseconde. Les fonctions de
navigation sont enveloppées pour relever les durées sans remplacer leur résultat.
La trace brute [node-before.cpuprofile](qa/gamedev-navigation-performance-20261029/node-before.cpuprofile)
est disponible pour une analyse dans les outils de profilage Chromium.

| Partie de la demande | Durée observée |
| --- | ---: |
| Plan complet du retour | 10 678,66 ms |
| Marche au sol entre ascenseur et port, V109 | 10 333,82 ms |
| Calcul de cette marche par V99 | 10 179,34 ms |
| Repli sur la grille fine V77 | 9 146,41 ms |

Ces durées sont inclusives et ne s'additionnent pas. Le trajet de base compte
16 points après simplification ; la réparation autour du chargement ne produit
pas un autre chemin dans ce cas. La dépense principale vient de l'échantillonnage
des segments et des collisions pendant la recherche fine, avec environ 0,30 s
de temps propre attribué au ramasse-miettes dans le profil.

### Première réponse dans Chromium

Le nouveau script [qa-homeworld-route-worker-v113.mjs](../scripts/qa-homeworld-route-worker-v113.mjs)
bundle l'entrée Worker V111 réelle et ses imports, avec esbuild en mode minifié
ES2022. Il sert ce module sur une adresse locale et crée un vrai Worker Chromium.
Chaque échantillon commence avec un Worker neuf. La mesure couvre le chargement
du Worker, le calcul et la réception de sa réponse ; elle est distincte de la
durée de la fonction Node ci-dessus.

| Échantillon avant correction | Première réponse | Répétition dans le même Worker |
| --- | ---: | ---: |
| 1 | 9 468,7 ms | 25,3 ms |
| 2 | 9 519,8 ms | 27,0 ms |
| 3 | 8 894,1 ms | 25,7 ms |
| Médiane | **9 468,7 ms** | **25,7 ms** |

Les trois plans sont strictement identiques. Les dix contrôles de ce passage
réussissent, notamment le rejet d'une clé de géométrie périmée et la récupération
sur une demande valide. Le [rapport avant](qa/gamedev-navigation-performance-20261029/browser-before.json)
et la [trace](qa/gamedev-navigation-performance-20261029/browser-before.log)
conservent les durées et les plans complets. Une réponse rapide après répétition
ne résout donc pas le coût de la première demande.

## 3. Choix de la recherche locale

Le départ dispose de sept ancrages directs sur la grille de 96 unités et la
destination de dix-huit. Pourtant, le composant accessible du départ ne contient
que 115 nœuds et ne rejoint pas celui du port. La sortie coudée du palier exige
quelques virages que les segments droits vers les ancrages proches ne capturent
pas. Les points de départ et d'arrivée sont praticables.

Un essai à 64 unités a également échoué à relier les composants, tout en ajoutant
environ 1,62 s de calcul. Cette variante est écartée. Les sondes
[96 unités](qa/gamedev-navigation-performance-20261029/probe-grid96.json) et
[64 unités](qa/gamedev-navigation-performance-20261029/probe-grid64.json) sont
conservées pour expliquer ce choix.

La sonde de [raccord local](qa/gamedev-navigation-performance-20261029/probe-local-connection.json)
trouve au contraire deux ancrages atteignables par une courte marche fine autour
du palier. Elle rejoint ensuite la grille principale pour la longue traversée.
Ce premier essai produit la portion au sol en environ 3,17 s, contre environ
10,18 s pour V99 auparavant. Son chemin fait 7 101,07 unités, contre 6 836,32 :
le compromis mesuré est un trajet praticable environ 3,9 % plus long sur cette
portion. La recherche de navigation ne garantit pas un optimum global.

## 4. Correction de V99

Le changement reste dans `homeworldNavigationV99.ts`. Lorsque la recherche sur
la grille principale échoue malgré la présence d'ancrages aux deux extrémités,
elle conserve le composant épuisé. Pour une demande de plus de 1 536 unités,
un repli cherche alors un raccord fin autour du départ :

1. Une zone de 576 × 576 unités, centrée sur le point de grille principal
   proche du départ, borne la recherche à 361 nœuds explorés.
2. Le pas local est de 32 unités. Chaque nœud et chaque arête gardent les mêmes
   tests du corps entier, les mêmes marges et le même échantillonnage V77.
3. Au plus huit nouvelles ancres sont retenues, toutes hors du composant
   principal déjà épuisé. Les caches de cette recherche sont locaux à la demande.
4. Le préfixe fin conserve ses virages jusqu'à l'ancre choisie. Il est concaténé
   à la continuation principale avant la simplification déjà existante.

Les demandes courtes et les départs sans ancrage principal gardent leur repli
historique. Si le raccord ne trouve pas de continuation, la recherche fine
complète V77 reste le dernier recours. Les caches existants, leur invalidation
sur changement de géométrie et les copies de points retournées sont conservés.
Le contrôle du chargement par V109 intervient toujours après le trajet statique.

La nouvelle suite `tests/homeworld-navigation-cost-v113.test.mjs` vérifie le
travail évité sans imposer un seuil de durée dépendant de la machine. Elle
compte les appels au calcul fin global, exige un trajet atteignable, contrôle
chaque arête reconstruite avec l'échantillonneur natif, puis vérifie les
extrémités, la distance et l'indépendance des copies du cache.

## 5. Résultats après correction

### Worker Chromium : comparaison sur la même demande

| Échantillon | Première réponse avant | Première réponse après |
| --- | ---: | ---: |
| 1 | 9 468,7 ms | 4 207,2 ms |
| 2 | 9 519,8 ms | 4 242,1 ms |
| 3 | 8 894,1 ms | 3 892,1 ms |
| **Médiane** | **9 468,7 ms** | **4 207,2 ms** |

La réduction est de **55,6 %**, ou un rapport de **2,25** entre les médianes.
Les trois répétitions dans le même Worker corrigé valent 21,7 / 29,2 / 26,8 ms.
Leur médiane passe de 25,7 à 26,8 ms : aucun gain n'est revendiqué pour ces
demandes déjà préparées.
Les [rapports avant](qa/gamedev-navigation-performance-20261029/browser-before.json)
et [après](qa/gamedev-navigation-performance-20261029/browser-after.json)
partagent la même empreinte de fixture et les mêmes versions d'outils. Parmi
les quatre modules de navigation identifiés, seul V99 change.

Le passage final réussit **10/10 contrôles** : trois fois le trajet réel du Worker,
sa répétition avec un plan complet identique, le rejet d'un snapshot périmé
suivi d'une demande valide, puis l'absence d'erreurs navigateur/console/HTTP.
Le script conserve une garde d'arrêt à 60 secondes par réponse ; elle sert à
borner un test bloqué et ne prétend pas garantir un budget de performance.

```bash
AUDIT_CHROME_EXECUTABLE=/tmp/chromium \
YAUTJA_ROUTE_WORKER_SAMPLES=3 \
node scripts/qa-homeworld-route-worker-v113.mjs
```

Le chemin du navigateur dépend de l'environnement. La CI utilise
`AUDIT_CHROME_CHANNEL=chrome` et le verrouillage du projet. L'option
`YAUTJA_ROUTE_WORKER_BASELINE_DIR` sert à une comparaison explicite avec les
préimages V77/V99/V109/V111 de `a185398` ; elle n'est pas définie dans la CI.
Chaque passage écrit un nouveau répertoire `run-*`.

### Profil Node et marche guidée

Le [profil après](qa/gamedev-navigation-performance-20261029/node-after.json)
observe 7 958,07 ms, contre 10 678,66 ms avant. Le temps CPU utilisateur+système
passe de 12 037,62 à 6 393,91 ms. L'absence d'appel au calcul fin global confirme
le travail réduit. Ces profils ponctuels instrumentés sont conservés
tels quels ; ils ne sont pas remplacés par la médiane Chromium non instrumentée.

La nouvelle [régression avant](qa/gamedev-navigation-performance-20261029/cost-regression-red.log)
échoue avec un appel au calcul fin global. Après correction, elle
[réussit](qa/gamedev-navigation-performance-20261029/cost-regression-green.log)
avec zéro appel, toutes les arêtes natives valides et les copies indépendantes.

Le [parcours guidé V113](qa/gamedev-navigation-performance-20261029/guided-roundtrip.log)
reste à **6/6**, avec son fichier de test inchangé. L'aller conserve ses
854 consultations et 4 315,93 unités de monde. Le retour passe de
1 910 à 1 940 consultations, soit de 1 906 à 1 936 déplacements moteur après
retrait des quatre constats d'arrivée. La distance réellement parcourue passe
de 9 455,89 à 9 609,76 unités : **+1,63 %**. Le dialogue portuaire reste admis
par `cargoPostReachedV108`.

Le calcul du retour vaut 1 722,20 ms dans ce parcours où une partie des caches
est déjà préparée par l'aller. Il est présenté séparément des mesures sur
Workers neufs. La latence initiale reste perceptible : ce correctif la réduit
sur le scénario reproduit et ne qualifie pas tous les trajets de la ville.

## 6. Compatibilité, CI et publication

| Suite finale | Cas réussis |
| --- | ---: |
| Nouveau contrôle du coût V113 | 1/1 |
| Parcours guidé et détours V113 | 6/6 |
| Navigation V99 | 4/4 |
| Revue des régressions V99 | 3/3 |
| Navigation dynamique V109 | 8/8 |
| Objectifs et guidage V111 | 11/11 |
| **Total, suites exécutées séquentiellement** | **33/33** |

Les traces [V99](qa/gamedev-navigation-performance-20261029/navigation-v99.log),
[revue V99](qa/gamedev-navigation-performance-20261029/navigation-review-v99.log),
[V109](qa/gamedev-navigation-performance-20261029/navigation-v109.log) et
[V111](qa/gamedev-navigation-performance-20261029/navigation-v111.log) complètent
les preuves du coût et du parcours. Les tests historiques sont inchangés. Le
contrôle TypeScript strict ciblé réussit également, ainsi que la revue
indépendante, le contrôle du workflow et `git diff --check`.

Le workflow `.github/workflows/audit-v94.yml` ajoute le nouveau test au groupe
gamedev et lance le Worker Chromium avec une fixture déterministe. Le JSON de
ce contrôle est conservé pendant sept jours, y compris lorsqu'un scénario
échoue. L'absence de rapport n'en crée aucun. La CI utilise un seul Worker neuf
par passage, puis vérifie répétition, refus d'un snapshot périmé et récupération.
Les suites V99 historiques sont déjà présentes dans son groupe de compatibilité.

Sur le commit parent `a185398`, le [relevé CI](qa/gamedev-navigation-performance-20261029/parent-ci.json)
du 29 octobre à 15 h 53, heure de Paris, confirme le job application et ses
57 étapes réussis, ainsi que les jobs V94, gameplay, persistance et entraînement.
Il comprend les corrections précédentes et la conservation effective du rapport
d'import planétaire. Ces résultats qualifient le parent ; le nouveau commit
publié dispose de sa propre exécution. Le statut Vercel du parent reste bloqué
par le quota de déploiements du service.

Les [empreintes et commandes](qa/gamedev-navigation-performance-20261029/evidence.json)
identifient le code et les preuves de cette continuation. Le SHA de publication
et son état CI effectivement relu sont consignés dans la PR #25, qui reste
ouverte jusqu'à son intégration.

## Environnement et portée

Les mesures proviennent du même environnement partagé, avec Node 24.22.1,
Chromium 153.0.8010.0, Playwright 1.62.1 et esbuild 0.25.12. Le
[relevé d'environnement](qa/gamedev-navigation-performance-20261029/environment.json)
et le profil Node précisent le processeur, le quota CPU et la mémoire. L'équipe
a exécuté les calculs lourds séquentiellement.

Le test navigateur utilise le Worker et les fonctions d'admission réels avec un
checkpoint préparé. Il ne charge pas la page Next complète, ne mesure pas le
rendu et ne constitue pas une validation artistique ou un parcours au clavier.
Les résultats de compilation et de tests distants restent rattachés au commit
qui les a effectivement exécutés.
