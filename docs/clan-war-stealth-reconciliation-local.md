# Réconciliation de la deuxième patrouille V144

Base : PR #61, commit `dfa21d9d6a65d484e61792b201185fd5ea98f288`, avec les correctifs de #59. La PR #57, commit `f25cd7a33e04f789e7c6df231ccad9116a50b38c`, est une branche parallèle ; elle n'est ni fusionnée ni entièrement intégrée par ce lot.

L'infiltration garde par défaut le renfort manuel de #56/#59. Avant la première alerte ou diversion, un sélecteur permet à la place d'activer une règle expérimentale : déclencher une patrouille après alerte et diversion préalablement utilisée, comme dans #57. Cette règle est conservée dans la sauvegarde d'exercice V115 ; elle n'altère pas la campagne V85. Une seule patrouille supplémentaire peut être produite. Sa case est praticable, différente de celle du premier garde et à au moins trois cases du joueur lors de l'apparition.

La lecture de l'archive convertit `secondGuard` de #57 vers `supportGuard` et `reinforcementIssued` du moteur #59. Elle refuse les deux représentations si elles sont contradictoires, sans réécrire l'archive source. Les anciennes archives sans renfort restent lisibles. Une archive #57 sans `secondGuard` ne contient pas de marque permettant de distinguer sa politique automatique d'une archive #56. Le jeu demande donc explicitement au joueur de choisir une règle avant de reprendre l'infiltration, y compris si une diversion ou une alerte a déjà eu lieu. Le choix ne modifie ni positions, ni alerte, ni équipement, ni horloge ; il ajoute uniquement la règle choisie. Le moteur refuse les actions de l'infiltration tant que ce choix est absent. Les nouvelles missions commencent explicitement en mode manuel.

Le premier garde ne se déplace plus sur l'ancienne case occupée du second. La logique d'écoute et de sabotage tenant compte des deux gardes est conservée depuis #59. Les états et mouvements restent ceux d'un exercice 2D original ; ils ne certifient ni la fidélité 1:1, ni les capacités réseau, ni le parcours navigateur.

Les tests `tests/clan-war-stealth-reconciliation.test.mjs` utilisent des sauvegardes construites à partir de l'état V115 avec les champs de #57 : conversion, relecture, conflit, refus des coordonnées invalides, placement, politique et non-duplication. Les classeurs #56 et #57 n'ont pas été écrasés ou marqués clos.

## Recette navigateur et provenance des archives de test

`node scripts/qa-stealth-reconciliation-browser.mjs` compile le moteur #57 au commit `f25cd7a33e04f789e7c6df231ccad9116a50b38c`, contrôle l'identité Git de chaque blob chargé, puis cherche un trajet uniquement par ses commandes publiques. Deux archives produites par ce runtime sont exercées dans le vrai composant V115, via une page de test Vite : une après diversion et avant apparition du garde, l'autre après apparition du garde au tour 4. L'algorithme a parcouru 63 états avant de trouver ce cas.

Avec Chromium 154.0.8037.57, les deux choix de la première archive ont conservé les champs et l'horloge, sans écriture au chargement et avec relecture après choix. L'autre archive s'est chargée sans écriture, a présenté le garde, puis une action a sauvegardé sa forme migrée avec un déplacement d'au plus une case ; la reprise après rechargement est passée. Aucune erreur `pageerror` n'a été observée.

Ces archives ont été **produites pour le test par le runtime original**, et ne sont pas des sauvegardes historiques d'un joueur. Aucun export authentique d'utilisateur provenant de #57 n'a été trouvé dans les fixtures inspectées. La recette vérifie un composant et non le parcours complet dans GameClient ; elle ne couvre ni manette ni simultanéité multi-onglets. Elle nécessite Chromium, les dépendances du projet, l'objet Git du commit #57 et l'accès aux blobs manquants de ce commit ; un blob récupéré est refusé si son empreinte Git ne correspond pas.
