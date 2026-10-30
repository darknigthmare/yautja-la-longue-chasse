# V114 — Guerres de clans : missions multiformes

## Portée de la livraison

Prototype **jouable de quatre modes** dans les exercices de guerre V3. Accès par **Guerres de territoire → Opérations multi-modes V114** ; une même planète, des destinations voisines et les combattants disponibles du front libre V85. Douze mandats rédigés, trois par mode. Les budgets, statistiques, minutages, grilles et comportements sont des hypothèses de prototype, non des caractéristiques canoniques de la licence Predator.

### 1 — Front 2D à déploiement (inspiré de Metal Slug Attack Reloaded)

- Unité RTS-U déjà définie dans le classeur V3, points de déploiement AP, recharge automatique, unités marchant vers une base ennemie, combat en approche, adversaires arrivant par renforts, PV de base, appui à récupération et victoire/défaite.
- La préparation acquise dans d'autres mandats améliore les AP initiaux ; les sabotages validés diminuent les fortifications du poste hostile.
- Les animations, sprites Yautja, classes spécialisées, montures et variantes d'armes ne sont **pas** encore des représentations certifiées fidèles à 1:1 : les marqueurs actuels sont provisoires.

### 2 — Détachements temporisés (inspiré des Outer Ops de Metal Gear Solid: Peace Walker)

- Sélection de 1 à 8 membres identifiés, réellement aptes au départ, détection des ordres V85 déjà réservés et des autres détachements V114 ; missions de 2, 5 ou 10 minutes réelles ; coût RAV d'exercice, risque et résolution stable, reçu de résultat dédupliqué.
- On peut quitter cet onglet : le rapport est produit au retour à l'échéance. Pas de progression fictive de l'horloge si la page est fermée.
- Les pertes sont **des valeurs d'exercice**. Elles ne tuent pas des soldats de la campagne et ne s'appliquent pas à la simulation V85. La réservation des soldats V114 n'est pas encore atomique avec celle du poste V85.

### 3 — Infiltration et sabotage jouables

- Carte tactique, murs, détection ennemie, patrouilles, profil bas, camouflage à énergie, interaction sur un relais militaire et retour vers l'extraction.
- Le renseignement accumulé augmente l'énergie initiale de camouflage ; une réussite apporte du sabotage aux futures batailles de simulation.
- Manquent une scène physique continue, une caméra, vision thermique, sons, fouille et animations véritables. Ce jeu tactique n'est pas un remplacement de la chasse principale.

### 4 — RTS vue de dessus

- Carte quadrillée, sélection de groupes alliés, ordres de destination, IA adverse, échanges de dégâts, renforts, deux points à capturer simultanément et victoire après maintien.
- Les ressources d'entraînement, le renseignement et le sabotage influencent respectivement le budget de commandement et les forces ennemies de cette simulation.
- Manquent les terrains générés physiquement, navigation par obstacles, grands effectifs, unités aériennes, montures, navettes et formations avancées.

## Règle commune, persistance et sauvegardes

Les quatre modes alimentent un registre **autonome par planète** : RAV, renseignement, préparation, sabotage, opération détachée, échéance, rapport. La sauvegarde V114 s'effectue dans un espace indépendant de l'archive de conquête V85, et utilise un format versionné avec lecture prudente. Les archives futures, incomplètes, ou ayant changé entre lecture et écriture sont bloquées et préservées. Les rapports ont des identifiants et ne s'ajoutent pas deux fois. Les combats 2D, infiltration et RTS **en cours** ne sont pas sauvegardés au milieu de la mission.

Une victoire tactique ne donne **pas** instantanément de planète, de revenu, d'unité, de rang, de rituel, de trophée ou de récompense à la campagne. Elle peut mener à l'interface de préparation d'ordre stratégique déjà existante : seule la résolution native attribue les conquêtes. Le monde libre V3 utilise les IDs CON-T et RTS-U, la Bible V6 actuelle utilise W3-K et W3-U ; ne pas assimiler ces systèmes ou leur coût sans correspondance prouvée et migration explicite. Les troupes temporairement en mission V114 ne sont pas encore verrouillées dans le planificateur V85, ce qui limite la simulation en version courante.

## Lore : garde-fous des guerres internes

Les conflits entre clans, les Blood Feuds, l'existence des Bad Blood, les Enforcers et l'autorité des Anciens sont attestés **dans des oeuvres et continuités différentes**. Les droits territoriaux et le conseil d'Anciens apparaissent notamment dans l'univers étendu *Aliens versus Predator: Extinction*. Ils ne justifient pas une guerre universelle contre tout clan voisin.

- Les ordres offensifs et les sabotages du prototype ne sont autorisés que contre des **positions militaires hostiles connues** ; un site neutre ou allié ne peut pas subir d'attaque arbitraire.
- Les civils, jeunes, foyers et adversaires désarmés ne sont ni des cibles ni des sources de trophées.
- La guerre ouverte, un duel d'honneur, une vendetta et un mandat des Anciens seront traités comme des situations **narratives différentes** dans la campagne.
- Les règles d'honneur précises doivent citer l'oeuvre pertinente pour chaque conflit. Les statistiques de simulation actuelles ne sont pas des chiffres canoniques.

Références de cadrage (avec distinction canon / synthèse de fans) :
- https://www.avpcentral.com/predator-civil-war-list-of-yautja-blood-feuds
- https://www.avpcentral.com/yautja-wars-predator-military
- https://www.avpcentral.com/council-of-ancients
- https://avp.fandom.com/wiki/Yautja_Honor_Code
- https://predator.illfonic.com/the-predator/
- Mécanique front : https://www.snk-corp.co.jp/official/metalslug_attack/how_to_play/01.php
- Mécanique Outer Ops : https://www.gamespot.com/articles/metal-gear-solid-peace-walker-extended-hands-on/1100-6260945/

## Vérification et reste à réaliser

Commande ciblée de régression : node --experimental-strip-types --test tests/clan-war-mission-modes-v114.test.mjs. À ajouter aux contrôles complets typecheck, lint, build et QA navigateur desktop/mobile, puis tester la concurrence de deux onglets, les archives futures ou corrompues et le retour de mission après fermeture.

Priorités : (P1) unifier les réservations et les résultats des quatre modes avec un roster, un stock, un site et des blessures uniques ; (P2) intégrer de vrais sprites/animations par rôle depuis la bibliothèque avec une revue 1:1, sans confondre pose statique et animation ; (P3) faire des scènes d'infiltration dans le monde réel avec IA et navigation ; (P4) porter le RTS sur une vraie géographie top-down et ses ouvrages ; (P5) étendre les opérations détachées aux troupes et véhicules de campagne réellement acquis ; (P6) dialogues et conséquences par clan/autorité et oeuvre source.

Cette tranche donne une **base fonctionnelle par mode**, pas une certification du jeu de guerre complet ni des sprites/lore à fidélité 1:1.