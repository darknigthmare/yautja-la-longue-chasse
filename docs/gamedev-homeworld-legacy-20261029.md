# Application suivante — Homeworld et générateur historique

## Résultat et périmètre

Cette continuation de la [PR #25](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/25)
part du commit `177a31d670f2d729ec39da8783f4f233348e27a6`, le 29 octobre 2026.
Elle applique le [guide gamedev du projet](GAMEDEV_AGENT_GUIDE.md) à deux chemins
encore actifs : le guidage Homeworld V111 et la page `/planet-generator-v102`.

Le guidage trouve désormais un autre passage lorsqu'un chargement déposé ferme
un escalier, puis suit ce trajet jusqu'au point d'audience et au retour au port.
Le générateur historique conserve la dernière action de l'utilisateur lorsqu'une
lecture de fiche plus ancienne se termine tardivement.

Les [preuves de cette continuation](qa/gamedev-homeworld-legacy-20261029/evidence.json)
conservent les régressions, leurs traces et les empreintes du code vérifié. Les
comptes rendus précédents restent disponibles : [archives et sprites](gamedev-application-20261029.md),
puis [imports V103 et parcours navigateur](gamedev-followup-20261029.md).

## 1. Homeworld : un itinéraire utilisable dans les deux sens

Les références `level-design` et `game-ai` conduisent ici à vérifier un parcours
avec les obstacles dynamiques, les arrivées aux changements d'étage et le
déplacement réellement accepté par le moteur.

### Défaut de sélection du passage

La fixture utilise les actions existantes de prise, de transport, d'interruption
et de dépôt d'une caisse large. Le transport comprend **1 421 déplacements
moteur**, acceptés par l'échantillonneur durable, sur plus de 7 100 unités de
monde. La caisse ferme le palier inférieur de l'escalier du Conseil, à
`(4500, 2900)`, tandis que son palier supérieur reste libre.

Le planificateur annonçait le point d'audience inaccessible. Un autre trajet
physique existait pourtant : **ascenseur des délégations → escalier de l'acropole
→ salle d'audience**. Son repli ne réparait que le premier itinéraire statique,
sans chercher une autre chaîne de connecteurs avec la caisse présente.

Dans le sens du retour, un départ libre à l'étage ne suffisait pas : le palier
d'arrivée au rez-de-chaussée était occupé et devait être écarté.

Le repli de `homeworldWayfindingV111.ts` explore maintenant les connecteurs
publics, avec les trajets pédestres V109 et l'admission d'arrivée V110 tenant
compte du chargement. La recherche est bornée à 128 états et évite les états déjà
visités. L'itinéraire direct reste prioritaire quand il est praticable. Cette
recherche vise un trajet valide ; elle ne promet pas le trajet le plus court.

La [trace avant correction](qa/gamedev-homeworld-legacy-20261029/homeworld-route-red.log)
montre deux échecs `unavailable` au lieu de `reachable`, avec deux contrôles
positifs déjà réussis.

### Deux arrêts du guide révélés par le parcours complet

Suivre le vrai guide jusqu'au bout a révélé deux autres situations dans le même
trajet :

- À environ 1,15 unité d'un virage, tous les candidats éloignés coupaient un
  obstacle. Le point de virage proche était sûr, mais le seuil minimal de cinq
  unités l'écartait. Le guide annonçait alors une sortie d'itinéraire.
- Après un raccourci permis, le personnage restait environ 14,5 unités à côté
  du segment suivant. Le regard lointain était obstrué, alors que rejoindre la
  projection du personnage sur ce segment était praticable.

Le guide conserve sa préférence pour une avance éloignée. Si elle échoue, il
peut terminer un virage proche, puis rejoindre sa projection sur le chemin.
Ces deux replis exigent une distance strictement supérieure à `0,001` et le
même contrôle de collision que les autres candidats. La borne existante de
180 unités demeure applicable. La projection réutilise le scan des segments ;
aucune recherche A* n'est ajoutée à la consultation du guide.

Les traces [virage proche](qa/gamedev-homeworld-legacy-20261029/homeworld-close-corner-red.log)
et [retour sur le segment](qa/gamedev-homeworld-legacy-20261029/homeworld-rejoin-red.log)
conservent chacune un échec reproduit avant le repli correspondant. Les cas
finaux exigent un déplacement effectif et la reprise d'une avance sûre.

### Parcours final avec les fonctions de production

La nouvelle suite `tests/homeworld-connector-detour-v113.test.mjs` réussit ses
**six cas**. Le trajet complet consulte `homeworldRouteGuidanceV111` à chaque
pas et utilise le moteur extérieur/intérieur, l'appel et la présence de la
cabine, l'embarquement, les transitions et les admissions natives. L'arrivée
à l'audience est vérifiée par sa cible intérieure réelle. Au retour,
`cargoPostReachedV108` confirme que l'interaction du responsable portuaire est
disponible.

| Mesure du passage final | Aller vers l'audience | Retour au port |
| --- | ---: | ---: |
| Consultations du guide, arrivées comprises | 854 | 1 910 |
| Déplacements du moteur | 850 | 1 906 |
| Distance parcourue, en unités de monde | 4 315,93 | 9 455,89 |
| Pas de transition natifs à 0,1 seconde | 172 | 172 |
| Durée du calcul de l'itinéraire dans ce passage | 775,74 ms | 13 761,01 ms |

La [trace finale](qa/gamedev-homeworld-legacy-20261029/homeworld-route-green.log)
contient les mesures brutes. Le calcul du retour à froid reste lent. Dans
l'application, la planification s'effectue dans le worker existant ; ce test
appelle directement le module. Ces durées sont une observation de cet
environnement partagé, pas une mesure de FPS ni une qualification de tous les
parcours possibles.

Un contrôle isolé, dans deux processus successifs préparant la même manutention,
mesure également le départ vers l'audience. La version de départ refuse le
trajet en 2 203,42 ms ; la correction le trouve en 2 979,16 ms. Sur vingt appels
suivants par variante, les médianes sont respectivement de 0,48 ms et 10,02 ms.
Ces valeurs décrivent le coût de la recherche supplémentaire après préparation
de cette fixture ; elles ne sont pas un gain de performance. Les rapports
[avant](qa/gamedev-homeworld-legacy-20261029/homeworld-plan-cost-before.json),
[après](qa/gamedev-homeworld-legacy-20261029/homeworld-plan-cost-after.json) et le
[script ponctuel](qa/gamedev-homeworld-legacy-20261029/homeworld-plan-cost-run.mjs)
sont conservés. Le script garde les chemins de son environnement ; sa variante
`baseline` lit `/tmp/yautja-homeworld-wayfinding-baseline.ts`, extrait de
`177a31d:app/game/systems/homeworldWayfindingV111.ts`.

La fixture prépare un contexte de sauvegarde et les quartiers visités ; la
caisse est transportée puis déposée par les opérations natives. Le suivi utilise
des entrées analogiques calculées vers le point proposé par le guide. Il ne
constitue pas un parcours au clavier dans le navigateur, une campagne jouée
depuis une sauvegarde vierge ou une revue visuelle de Homeworld.

## 2. Le générateur V102 protège aussi les actions récentes

La page historique utilise son propre composant `PlanetGeneratorV102.tsx`.
La correction précédemment appliquée à V103 ne couvrait donc pas cette route.
Une lecture ancienne pouvait encore remplacer une graine, l'un des sept
réglages, un code saisi ensuite, ou l'erreur d'une génération/importation refusée.

Le jeton d'import est désormais invalidé au début de la génération et de
l'import par code, avant leur validation, ainsi qu'à chaque modification de la
graine, des sept réglages et du code. Les sélecteurs passent par un petit helper
conservant la mise à jour fonctionnelle du brouillon.

La nouvelle suite `tests/planet-generator-import-race-v102.test.mjs` exécutait
**11 échecs et 3 réussites** avant correction ; ses **14 cas réussissent** après
correction. Elle utilise les callbacks JSX et le moteur réels avec des hooks
et des lectures contrôlés. Les [traces avant](qa/gamedev-homeworld-legacy-20261029/v102-import-red.log)
et [après](qa/gamedev-homeworld-legacy-20261029/v102-import-green.log) sont conservées.

### Vérification sur la vraie page Next : 6/6

Les mondes de graines `201` et `202` sont générés et exportés par l'interface,
avec les six régions du générateur V102. Le contrôle utilise les octets des
fiches exportées et la méthode native `File.text()` ; seule la livraison de son
résultat est retardée.

Les six scénarios vérifient la modification de la graine, la modification de
l'atmosphère, une génération refusée, un code refusé, une nouvelle saisie de
code incomplète, puis une importation normale réussie. Après la libération de la
lecture ancienne, deux frames natives précèdent la comparaison de l'aperçu,
de l'atlas, du message, du code et des contrôles du formulaire.

Résultat : **6/6**, aucune erreur JavaScript, console ou HTTP. Le prototype de
`File.text()` est restauré et le contexte neuf reste sans archive de partie.
Le [rapport](qa/gamedev-homeworld-legacy-20261029/v102-browser.json), la
[trace](qa/gamedev-homeworld-legacy-20261029/v102-browser.log) et le
[script tel qu'exécuté](qa/gamedev-homeworld-legacy-20261029/v102-browser-run.mjs)
permettent de contrôler cette preuve.

Environnement : Next 16.3.5 en développement, Node 24.22.1, Chromium
153.0.8010.0, Playwright 1.62.1 fourni par l'environnement. Les textures runtime
originales sont chargées. Ce passage porte sur l'ordre des actions et l'état de
l'interface ; il ne remplace pas une revue artistique.

## 3. Protection dans la CI

L'étape gamedev de `.github/workflows/audit-v94.yml` comprend désormais les
régressions V102 et Homeworld, en plus des trois suites précédentes :

```bash
node --test --test-reporter=spec --test-concurrency=1 \
  tests/planet-archive-validation-v103.test.mjs \
  tests/homeworld-motion-source-contracts-v113.test.mjs \
  tests/planet-generator-import-race-v102.test.mjs \
  tests/planet-generator-import-race-v103.test.mjs \
  tests/homeworld-connector-detour-v113.test.mjs
```

Une étape `always()` conserve pendant sept jours le rapport navigateur des
imports V103 déjà exécutés par la CI. Elle réutilise l'action d'upload épinglée
du workflow. L'absence de rapport n'en invente aucun et un échec du scénario
reste un échec. La CI conserve Node 22 et les dépendances verrouillées du projet.

## 4. Vérification finale des modifications

Les quatre suites ci-dessous ont été exécutées séparément et séquentiellement,
avec **39 cas réussis**, aucun échec ni cas ignoré :

| Suite | Résultat | Portée |
| --- | ---: | --- |
| Imports V102 | 14/14 | Actions concurrentes, erreurs conservées et nouveaux imports valides |
| Détour Homeworld et guidage V113 | 6/6 | Obstruction transportée, aller-retour natif et deux replis locaux |
| Navigation dynamique V109 | 8/8 | Charges, collisions, étages et rejet des réponses worker périmées |
| Objectifs et guidage V111 | 11/11 | Compatibilité, sorties réelles, checkpoints et progression du guide |

Les traces voisines [V109](qa/gamedev-homeworld-legacy-20261029/homeworld-v109.log)
et [V111](qa/gamedev-homeworld-legacy-20261029/homeworld-v111.log) complètent les
deux nouvelles régressions. Les six scénarios navigateur V102 sont comptés
séparément de ces 39 tests de modules.

```bash
node --experimental-strip-types --test --test-isolation=none \
  --test-reporter=spec tests/planet-generator-import-race-v102.test.mjs
node --test-reporter=tap tests/homeworld-connector-detour-v113.test.mjs
node --test-reporter=tap tests/homeworld-dynamic-navigation-v109.test.mjs
node --test-reporter=tap tests/homeworld-objectives-v111.test.mjs
```

Le contrôle TypeScript strict de chacun des deux modules corrigés et de ses
imports a réussi. Les commandes, sorties et empreintes sont consignées dans le
[manifeste](qa/gamedev-homeworld-legacy-20261029/evidence.json). La commande
Homeworld utilise `--lib es2023,dom` pour l'usage préexistant de `toSorted` dans
les imports ; aucune dépendance ni configuration du projet n'a été modifiée.
Le workflow a été parsé et comparé structurellement à sa base. La revue
indépendante n'a trouvé aucun point bloquant et `git diff --check` réussit.

Sur le commit de départ `177a31d`, le [relevé CI](qa/gamedev-homeworld-legacy-20261029/baseline-ci.json)
du 29 octobre à 15 h 10, heure de Paris, confirme le job application réussi,
avec ses 56 étapes terminées, et les jobs ciblés V94, gameplay, persistance et
entraînement réussis. La compilation Next, TypeScript, le lint et les scénarios de planètes
font partie de ces réussites. Ce relevé ne porte pas sur le nouveau commit.
Le statut Vercel associé à cette base indique une limite de déploiements du
service, `Deployment rate limited — retry in 24 hours.`

## 5. Limites de publication

La PR reste le support de revue de ces changements. Les preuves CI d'un commit
précédent et les tests locaux ne qualifient pas automatiquement un nouveau
commit publié. Le compte rendu final de la PR indique le SHA et le statut
distants effectivement relus.

Le build local complet précédent avait rencontré `ENOSPC` lors de l'écriture
du cache Webpack ; cette limite reste documentée dans le
[compte rendu précédent](gamedev-followup-20261029.md). Aucun nouveau build
complet n'est revendiqué ici. Le navigateur local vérifie le serveur Next en
développement ; la preuve Homeworld est une simulation des modules de
production, avec une portée distincte.
