# Rejouer un assaut V115 en ligne de commande

Le replay de `CW130-ASSAULT-020` utilise les mêmes réducteurs que le panneau d’assaut. Le V115 latéral tire ses décisions de la source V6 et de l’état initial. Le fichier conserve l’empreinte de la source et du départ, la graine régionale, les coordonnées source des vagues, l’identifiant de l’opération, les ordres et leurs refus, les positions, la santé, les AP, les PC, les RAV, les échanges et les équipes tombées ou extraites, jusqu’au rapport final.

Depuis la racine avec Node 22 et les dépendances installées. Voici les trois commandes.

```sh
node scripts/replay-clan-war-assault-v115.mjs example > recette-assaut.json
node scripts/replay-clan-war-assault-v115.mjs record recette-assaut.json > replay-assaut.json
node scripts/replay-clan-war-assault-v115.mjs verify replay-assaut.json
```

Dans la recette, `initial: null` crée un exercice neuf. Pour partir d’une partie existante, utilisez l’objet de sauvegarde V115 lu par le panneau. Il doit correspondre à la même Bible V6 et ne contenir aucune mission active. L’épuisement des ordres entraîne la cadence normale jusqu’au rapport si `finish` vaut `true`.

Les ordres ont la forme `["tick"]`, `["deploy", "W115-TEAM-01"]` ou `["retreat"]`. Les autres ordres possibles sont `upgrade-ap`, `cloak`, `special`, `reinforce`, `hold`, `withdraw`, `surge`, `fallback`, `focus`, `brace`, `regroup-pair`, `interpose`, `regroup-support` et `base-screen`. Ajoutez l’identifiant de chaque équipe concernée dans l’ordre demandé par la commande. Pour `focus`, le deuxième identifiant est celui du rival visé.

La vérification relance l’assaut et compare son empreinte SHA-256 au fichier. Une position ou un rapport modifié, une autre sauvegarde initiale ou un changement du moteur font échouer la vérification. Le fichier conserve une copie de la sauvegarde de départ si vous en avez fourni une. L’outil lit les ordres de la recette JSON.
