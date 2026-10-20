# Homeworld V99 — calcul du guidage

Le trajet vers un autre étage se calcule dans le worker V98, puis reste utilisable après fermeture de la carte. V99 réduit le coût du premier calcul et le nombre de points dans les rues. Le joueur continue à marcher, ouvrir les portes et emprunter les vrais passages publics.

## Navigation

`homeworldNavigationV99.ts` cherche d’abord sur une grille de 96 unités, contre 32 dans V77. Chaque nœud garde le corps de 24 × 14 demi-unités et la marge de 12 unités. Chaque arête et chaque raccord à une position fractionnaire utilisent directement `homeworldRouteSegmentV77` : échantillons espacés au maximum de quatre unités, collision et terrain complets V80/V84/V92, sans changement de géométrie.

Un passage étroit, une porte ou un palier peuvent ne rejoindre aucun nœud de cette grille. L’échec déclenche le calcul V77 à 32 unités. La recherche générale des vrais connecteurs reste également disponible si une jambe de la chaîne d’étages directe échoue. Un refus du modèle reste un refus ; aucun point supposé franchissable n’est ajouté.

La consolidation tente ensuite des cordes dans une fenêtre maximale de 768 unités du trajet initial. Chaque corde est vérifiée par le même échantillonneur V77. Les seuils, les coordonnées des connecteurs et les départs restent exacts. La distance affichée est recalculée à partir du trajet effectivement rendu. Cette grille ne garantit pas le plus court trajet : elle peut choisir un détour différent.

Les 256 derniers trajets V99 sont conservés dans le worker ; chaque appel reçoit une copie de ses points. Les collections de collision V83, V84 et V92 sont remplacées lors de leur configuration. `homeworldNavigationRevisionV77` détecte ces remplacements et invalide les réponses positives et négatives des grilles, arêtes et trajets V77/V99. Le worker monte toujours les mêmes collections tardives que la scène.

## Guidage pendant la marche

Le guidage recherche la projection la plus proche sur tous les segments. Il reste ainsi utilisable au milieu d’une longue rue, même si un sommet d’une autre portion du trajet est plus proche que ses extrémités. Le regard en avant reste limité à 240 unités du trajet, avec une avance de 160 unités par segment ; chaque direction proposée passe le contrôle de collision depuis la position réelle. Cette interrogation ne relance aucun A*, n’écrit aucune sauvegarde et ne déplace pas le chasseur.

## Mesures du modèle

Mesure locale Node 22, processus distincts, même sauvegarde neuve et trajet du spatioport vers `point:audience-point`, avec toutes les collisions tardives montées. Le chargement des modules est exclu du temps de calcul. Les résultats antérieurs V98 restent dans `homeworld-wayfinding-v98.md` ; ils proviennent d’une autre mesure et ne servent pas de dénominateur ici.

| Mesure | V98 avant modification | V99 |
| --- | ---: | ---: |
| Premier calcul | 11 297 ms | 3 190 ms |
| Calcul répété dans le même graphe | 12,7 ms | 12,4 ms |
| Points du premier palier | 183 | 18 |
| Distance physique totale | 8 517 unités | 9 167 unités |

Le calcul froid est 3,54 fois plus rapide sur cette mesure ; le trajet choisi est 7,6 % plus long. Les durées dépendent de la machine et de la charge. Ce tableau décrit le modèle local, pas encore une mesure du worker compilé dans le navigateur ni une publication.

## Vérifications ciblées

`tests/homeworld-navigation-v99.test.mjs` vérifie les départs fractionnaires sur les deux côtés des sept connecteurs, les marges complètes sur les segments consolidés, les copies des caches, le guidage au milieu des longues rues et l’invalidation après remplacement réel d’un registre de collision. L’oracle indépendant V98 continue de vérifier toutes les destinations accessibles, les portes et interlocuteurs réellement résolus par le runtime, les transitions d’étages et les origines refusées. Son contrôle du guidage parcourt désormais tous les segments, puisque les points redondants sont consolidés.

Exécution Node 22 avec le canal IPC local autorisé : **15 sous-tests exécutés, 15 réussis, aucun échec ni test ignoré** (4 navigation V99, 7 oracle V98, 4 rendus SSR V98). Le lint des modules et tests modifiés passe également. Le lancement sandbox qui ne rapportait que des noms de fichiers a été arrêté et ne compte pas comme validation.

Une revue indépendante ajoute **3 tests réussis** dans `tests/homeworld-navigation-review-v99.test.mjs` : vraie approche de `dock-control` sans aucun ancrage sûr à 96 unités, repli V77 vérifié dans les deux sens, contrôle indépendant du corps et des marges à chaque quatre unités, conservation du coin solide malgré des points doublés, puis guidage sur une chaussée réelle dont un sommet ultérieur est plus proche que les extrémités du segment courant.

Commande ciblée :

```sh
node --experimental-strip-types --test --test-reporter=spec --test-concurrency=1 \
  tests/homeworld-navigation-v99.test.mjs \
  tests/homeworld-wayfinding-adversarial-v98.test.mjs \
  tests/homeworld-wayfinding-ui-v98.test.mjs
```

La cité et ses itinéraires restent des créations originales compatibles avec l’univers du jeu ; ils ne constituent pas une carte officielle du monde yautja. Aucun droit d’accès, rang, sauvegarde, déplacement ou scénario n’est accordé par le calcul d’un itinéraire.
