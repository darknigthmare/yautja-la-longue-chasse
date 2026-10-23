# Reproduire les suivis Excel historiques avec V105

Les collecteurs V100 et V104 compilent leur graphe d’imports pour mesurer le runtime. Continuer le jeu modifie ce graphe et ses empreintes ; régénérer un ancien produit depuis le runtime courant réécrirait son histoire. Les anciens fichiers restent inchangés, dont `YAUTJA_V104_SUIVI.xlsx` à 39 feuilles, SHA-256 `ce78bac96ae57cbee732bc868acecd46b0dc57e5ade49f669fb15c8b12ea03aa`.

Le contexte historique V105 contient les **239 fichiers source originaux** de la fermeture bornée V99/V100/V104 au commit fusionné `8eaae97b8511ed6b93183729f201af7eb844f830`. L’archive déterministe `tests/fixtures/excel-history-v104-v105.json.gz` pèse 3,47 Mo ; son manifeste lisible conserve chaque chemin, longueur et SHA-256. Aucun historique Git ni téléchargement n’est nécessaire à l’exécution.

`scripts/historical-excel-context-v105.mjs` vérifie les empreintes épinglées du manifeste et de l’archive, puis écrit ces sources dans un répertoire temporaire privé avec des permissions sans écriture. Le petit manifeste JSON importé par esbuild est copié afin de conserver son chemin relatif dans les empreintes de compilation. Les **235 fichiers partagés** — images, corpus publics, classeurs et produits historiques — conservent leurs emplacements et sont liés dans le contexte après contrôle de leurs empreintes. Les tests ne les écrivent pas : tous leurs produits expérimentaux vont dans leurs propres répertoires temporaires. Une nouvelle vérification des fichiers, liens et sources clôt chaque parcours. Les dépendances installées sont partagées via `node_modules`.

Les deux tests Excel V100/V104 utilisent ce contexte uniquement pour charger leurs collecteurs et leur `ROOT`. Toutes leurs assertions historiques, tests négatifs, lectures ZIP/XML, comparaisons de formules et régénérations restent exécutés. Leurs contrôles finaux vérifient en plus que le contexte n’a pas changé. Les autres tests et les imports normaux du jeu continuent d’utiliser le runtime courant.

Vérifier réellement les anciens produits sans les écrire :

```sh
node scripts/check-excel-history-v105.mjs --check --release V100
node scripts/check-excel-history-v105.mjs --check --release V104
node scripts/check-excel-history-v105.mjs --check
```

Cette commande appelle les générateurs **originaux** dans le contexte gelé et leur option `check:true`. Elle recompile les modules d’origine, vérifie les PNG et reconstruit les classeurs en mémoire avant la comparaison des trois produits de chaque version. Elle ne retourne pas simplement le contenu d’un ancien rapport PASS. L’appel direct des anciens générateurs depuis le dépôt courant conserve sa sémantique d’audit du runtime courant ; il n’est pas utilisé pour certifier les produits historiques.

Le constructeur d’auteur `python3 scripts/build-excel-history-snapshot-v105.py --check` permet de comparer l’archive au commit Git épinglé quand cet objet est disponible. Il n’est pas requis en CI. Il n’inclut aucune copie des centaines de Mo d’images ou d’anciens classeurs et ne modifie aucun produit historique.

`tests/excel-history-v105.test.mjs` vérifie l’isolation des sources, les liens des assets, le maintien des imports courants et le rejet d’une altération temporaire. Les tests Excel originaux restent les preuves de régénération et de structure des classeurs.
