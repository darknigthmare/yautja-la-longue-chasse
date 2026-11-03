# Sources historiques V105 pendant V106

Le suivi V105, ses 49 feuilles et ses preuves de production restent ceux du commit fusionné `28e9b6360ae30530525d55e307380d46d0eef8e1`. Une modification du jeu courant ne doit ni réécrire ces archives, ni transformer leur statut en validation du nouveau runtime.

`historical-excel-context-v106.mjs` prépare un répertoire temporaire avec **816 fichiers source privés** et **163 fichiers partagés vérifiés**. Les 791 fichiers `app/` de V105 sont privés : le test original peut donc vérifier les **918 entrées** de son gel complet, y compris lorsqu’un nouveau module V106 existe dans le dépôt courant. Les images publiques, les classeurs et les preuves publiées restent partagés après vérification SHA256 et taille, puis sont revérifiés après les collecteurs. Les sources privées sont écrites en lecture seule et sont aussi contrôlées après exécution. Les JSON publics importables sont privés pour conserver les chemins qu’esbuild enregistre.

L’archive gzip est bornée à 80 Mio décompressés ; son contenu réel est de 54,43 Mo. Le manifeste, l’archive et chaque fichier ont des empreintes imposées. L’extraction n’utilise ni Git ni réseau. Le répertoire est supprimé à la sortie. Seuls les tests historiques `excel-followup-v105` et `production-proofs-v105` optent pour ce contexte ; les tests du jeu continuent d’importer V106 directement. Les assertions V105 restent inchangées : sources, commandes exécutées par le collecteur, 35 raccords, 17 actions ouvertes, 49 feuilles, formules, caches, gels et preuves portables.

```sh
node scripts/check-excel-history-v106.mjs --check
node scripts/check-excel-history-v106.mjs --check --release all
```

La première commande régénère réellement les trois produits V105 dans le contexte historique puis compare leurs octets, avec vérification d’intégrité finale. La seconde ajoute la vérification historique V100/V104 d’origine ; leurs capsules et scripts restent inchangés.

Le constructeur `build-excel-history-snapshot-v106.py` est un outil d’auteur : lui seul lit Git, au commit fixe, pour produire une archive déterministe. Il n’est pas exécuté par le jeu ni par la CI. Son option `--check` compare la capsule à cette source lorsqu’un historique Git complet est disponible.
