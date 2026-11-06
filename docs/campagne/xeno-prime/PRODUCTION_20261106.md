# Xeno Prime — production du 6 novembre 2026

Les **23 sprites manquants** ont été générés comme **23 PNG individuels**, avec les références visuelles du Berceau enfoui. Le total passe de 85 à **108 sprites**, avec les six fonds existants. Les images, prompts et contrôles sont conservés dans les [archives V2.2](ASSETS.md) et le [journal structuré](PRODUCTION_20261106.json).

## Fidélité et références

La fidélité visée est celle des sprites de référence du projet : mêmes identités, matières, palettes, directions et attaches. Les variantes utilisent l’image de base réelle, y compris lorsqu’elle vient d’être générée. La Matriarche conserve sa couronne ajourée entière, sa tête au sol et son berceau ; 097 complète la huitième pose de tête et 098 un état séparé de son bulbe.

Les retours de contrôle ont entraîné des corrections ciblées par le générateur quand nécessaires. Aucun détourage, redessin par script ou changement de pixels n’a été appliqué après génération. Les valeurs RGB cachées sous alpha zéro sont conservées. Les capsules 056/057 restent des props passifs. Les effets sont des PNG séparés, sans organe ou décor ajouté à leur place.

## Contrôles réalisés

- Présence des 23 nouveaux fichiers, IDs uniques, noms d’origine et couverture finale exacte 001–108.
- Décodage PNG, dimensions, vraie transparence et pixels visibles ; empreinte comparée à la sortie native sélectionnée.
- Inspection des silhouettes, bords, matières, états et orientation par l’assistant sur les sorties et références disponibles.
- Conservation octet pour octet des 85 sprites et six fonds historiques dans le pack complet.
- Empreintes distinctes des 114 PNG du catalogue ; vérification CRC des deux archives.
- Données de livraison, prompts et références archivés ; aucun fichier prévu compté comme livré sans PNG réel.
- Fichiers JSON et 86 renvois documentaires locaux vérifiés ; références des 23/114 images dans les deux catalogues correctes, syntaxe JavaScript contrôlée et `git diff --check` sans erreur. Ce contrôle statique ne remplace pas l’essai des interactions du catalogue.

Le lancement du navigateur local a été refusé par les permissions système et le navigateur géré a refusé l’accès aux URL locales. Cette vérification n’a pas été contournée. Le catalogue HTML propose les fonds de contrôle clair/gris/noir, mais **son rendu dans le navigateur n’est pas déclaré testé**. Les inspections d’images et mesures d’alpha ont bien été réalisées.

Les deux ZIP sont fournis en téléchargement direct dans la conversation. Leur préparation d’enregistrement durable a échoué à deux reprises avant transfert/finalisation ; aucune sauvegarde durable de ces archives n’est déclarée réussie et aucune URL de fichier persistante n’est ajoutée sans résultat réel.

## Portée de la livraison

Ces images fixes ne valident pas les cycles d’animation, pivots moteur, collisions, sauvegardes ou mesures de performance. Les 25 compositions V2.1 conservent leurs 312 placements et ne sont pas recalculées ici. Les 28 critères de jeu restent ouverts. `human_art_validation` et `runtime_integrated` restent `false` ; la revue par l’assistant n’est pas une validation artistique humaine.

Le raccord PLAN08 / XP-Z12 depuis XP-Z11, le vestige inerte XP-Z09, les douze tableaux locaux, la révélation finale, la crête et les conditions d’Élite restent ceux du [secteur](README.md). Cette livraison met à jour le suivi de production de la même PR sans déclarer le niveau déjà jouable.
