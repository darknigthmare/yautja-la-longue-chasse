# Contrôles du classeur de coordination

Ces journaux portent sur `docs/YAUTJA_REPRISE_CHANTIERS_20261101.xlsx` et ses sources datées.

- `generation.log` : écriture déterministe des cinq feuilles et du manifeste local/distants.
- `reproduction.log` : comparaison binaire intégrale, sans réécriture.
- `independent-verification.log` : relecture ZIP/XML, comparaison des cellules, liens, volets et filtres, absence de formule/macro, événements distincts.

Les contrôles utilisent uniquement la bibliothèque standard Python. Aucun Excel natif, test de gameplay ou appel GitHub n'est exécuté par ces commandes. Les observations distantes sont celles des JSON épinglés, sans nouvelle lecture de ces fichiers sur GitHub.
