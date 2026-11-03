# THE PIT V42 — premier parcours de scène optionnel

Le lot ajoute un seul parcours d'exposition : le sas de la Porte des Réserves (arène019) puis la cour de la Réserve des Crocs (arène011). Il réutilise leurs deux kits bitmap existants. Il ne produit aucune nouvelle image et ne termine pas les secteurs/interactions des79 autres premières arènes.

## Activation et comportement

Choisir Duel CPU, Versus local ou Entraînement libre, puis la Porte des Réserves et cocher « Parcours optionnel · Sas → cour des Réserves ». La case est décochée initialement. Les modes Arcade, Circuit et Descente gardent leurs rencontres et règles imposées. Les exercices guidés restent réservés au duel neutre.

Les deux kits sont préchargés avant le départ. Une image manquante bloque le lancement et propose de réessayer. La seule condition de transfert est une projection qui a réellement infligé ses dégâts, dont la victime atteint la zone de sortie gauche(x≤110) ou droite(x≥850), alors que la manche continue et que les deux combattants sont vivants et au sol. Une simple saisie, une déchoppe, un blocage, une attaque manquée ou la rupture Traque ne déclenchent rien. KO et timeout ont priorité.

Le même tick déplace les deux combattants aux positions300/660 dans la cour, conserve leur ordre gauche/droite, santé, Traque, stun et knockdown résolus par la projection. Aucun dégât ni bonus de transition n'est ajouté. Les effets techniques en vol sont terminés. La manche continue sans pause cinématique et sans animation de porte inventée. La porte du dessin existant est déjà ouverte. Un transfert au maximum par manche ; manche suivante, revanche et reset de l'entraînement repartent dans le sas.

L'identité du match reste019, le rendu reçoit explicitement le kit011. Le renderer ne modifie ni la simulation ni sa caméra. Le parcours n'écrit aucune statistique, distinction ou récompense ; un replay réussi reste disponible dans la session.

## Déterminisme et compatibilité

Le moteur de combat passe à6. L'enveloppe replay resteversion3 et conserve son encodage RLE/input. Les règles du parcours sont enregistrées explicitement. Les replays publiés moteur4 et5 gardent leur moteur/checksum historiques ; l'ancienne fixture V5 « pit-replay-v5-reserve-throw.json » conserve le checksumfe79febd et reste dans le sas neutre. Les archives de campagne et leurs propriétaires ne changent pas.

Le moteur teste les deux bords, la simultanéité des deux transferts, l'absence de mutation de l'état entrant, les cas interdits, KO/timeout, reset/manche/revanche, sérialisation, rejeu exact et le rendu non-mutant. Le vrai callback React de résultat teste recorder réussi, en échec et absent : aucune fausse annonce de replay conservé.

## Preuves de ce lot

- `work/v42/stage-engine-tests.log` :84 tests PASS, couvrant moteur/replays/déchoppe/sélection.
- `work/v42/journey-regression-tests.log` :43 tests PASS, stockage replays, GameClient, training, Circuit/Descente.
- `work/v42/journey-final-tests.log` :9 tests du parcours PASS ; comprend le test de notice ajouté après revue indépendante.
- `scripts/verify-pit-stage-journey-v42.mjs` : vrai duel clavier, deux kits préchargés, panne de P0cour et retry, replays V6 mobile et V5 neutre, stockage inchangé, erreurs JS/HTTP vérifiées, navigateur fermé.
- `work/v42/stage-journey-qa/report.json` et captures `sas.png`, `court.png`, `v6-route-mobile-scene.png` : recette du serveur local du responsable de livraison. Cette preuve ne constitue pas à elle seule une recette production.

Les tests de84 et9 se recouvrent : le total distinct de ces trois commandes est128 tests, et non136. La recette clavier utilise un appui assez long pour couvrir un tick de simulation ; une première pression instantanée du harnais a été corrigée, sans injecter l'état du duel.
