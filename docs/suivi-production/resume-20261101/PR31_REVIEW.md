# PR31 — compatibilité V103/V115

Tête revue : `67fa9fab2e580abb907fa5de0679cd73237c9407`.
Fusion distante confirmée par le coordinateur le 1er novembre à 00:37:33 UTC :
`81fc1916fc285ca85d3c434737bc35b1e5f2fb7f`.

Les trois modifications produit résolvent les onze erreurs TypeScript de la base main sans modifier une recette ou une stratégie : garde des champs physiques V115 dans l’éditeur, union V103/V115 dans l’analyse stratégique, contrat minimal de déploiement commun. Aucun commentaire inline de revue ne demandait une correction lors de la lecture API.

- Quinze tests de compatibilité, génération et stratégie passent sur la tête isolée exacte.
- `next typegen` puis `npm run typecheck` passent sur toutes ses sources et les six vrais manifestes importés.
- Le lint des trois fichiers produit donne zéro erreur et huit avertissements déjà présents. Le job application ancien était annulé ; il n’est pas présenté comme une validation globale.
- Le nettoyage transverse des dix-sept avertissements des planètes n’abaisse aucun seuil : copie fraîche de la recette, suppression explicite des champs V115, conservation de l’ordre exact de l’ancien rest, réutilisation du même contrat. Les 192 recettes comparées et six mondes sérialisés restent identiques avant/après ; les quinze contrats passent aussi sur la branche courante nettoyée.

Preuves : [index](preuves-pr/INDEX.json), [15 tests initiaux](preuves-pr/pr31-domain-15.log), [types complets](preuves-pr/pr31-typecheck-complete.log), [parité](preuves-pr/planet-recipe-parity-192.json), [15 tests courants après nettoyage](preuves-pr/planet-current-cleanup-15.log).

Ces vérifications ne constituent pas une qualification de toutes les fonctions du jeu, des appareils physiques ou de la fidélité artistique.
