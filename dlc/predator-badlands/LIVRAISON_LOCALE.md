# Paquet complet local

Ce paquet contient toutes les ressources récupérées et reconstruites. Il n’est pas une copie exacte du contenu actuellement poussé dans la PR : `IMPORT_STATUS.json` liste les 16 fichiers encore absents de GitHub.

Le rapport HTML de la v0.2 incorpore les 6 captures. `ASSET_INVENTORY.json` couvre les 31 images. Les preuves brutes du navigateur et du moteur sont dans `v0.2.0/qa/`.

Le patch `BADLANDS_PR121_FICHIERS_MANQUANTS.patch`, livré séparément, ajoute uniquement les 16 chemins manquants : les 13 PNG, le ZIP original et les deux standalone. Son application et les 16 contenus ont été vérifiés dans un dépôt local temporaire. Il n’a pas été appliqué ni poussé sur GitHub. Depuis un checkout propre de la branche de la PR, `git apply --check` permet de contrôler son application avant toute écriture.

Le dossier `historical/` conserve les anciens métadonnées/outils d’import v0.1 : ils ne décrivent pas la reconstruction et ne doivent pas être utilisés comme lanceurs d’installation. Le restaurateur actuel est `tools/restore_v01.py`.
