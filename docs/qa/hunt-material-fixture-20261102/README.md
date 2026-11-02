# Recette chasse : banque de matériaux de la fixture

Le renderer courant lit `hunterMaterialsV113.skin`. La banque d’images de repli de la fixture ne déclarait pas `hunterMaterialsV113` : le premier rendu de chasse levait une exception, puis les contrôles suivants ne trouvaient plus leur interface. Une reproduction locale sur le produit R7 a retrouvé cette erreur exacte. Ses sélecteurs, assertions et produit sont conservés ; seules la sélection du Chromium local, des attentes bornées et la journalisation diagnostique étaient instrumentées dans un clone jetable. Cela ne prétend pas remplacer le journal distant inaccessible de l’ancien échec CI.

La fixture déclare maintenant les trois matériaux à `null`, conformément à son rôle de banque de repli. Le pilote accepte un exécutable Chromium et un répertoire de sortie explicites et écrit son rapport avant d’appliquer le même refus d’erreurs. Aucune assertion n’est supprimée, aucune erreur n’est filtrée et aucun code produit n’est modifié.

Le parcours réellement exécuté passe **18 groupes**, avec **zéro erreur de page et cinq captures toutes ouvertes**. Son code source est le commit `0a797f5e54074f5d3564bca29142527ef615d7ab`. Les captures gardent la compression existante du pilote et montrent les composants de contrôle et images de repli déclarées. Elles ne qualifient ni une campagne complète, ni la banque artistique finale, ni un nouveau build de production. Le gel R7 de 1 649 fichiers reste exactement identique.

```sh
CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium \
YAUTJA_HUNT_CONTROLS_OUTPUT=/tmp/hunt-material-fixture-new-run \
node scripts/qa-hunt-mechanics-browser-v112.mjs
```

Le journal de diagnostic avant correction reste séparé du rapport réussi. Les empreintes des pièces et les limites se trouvent dans `entry.json`.
