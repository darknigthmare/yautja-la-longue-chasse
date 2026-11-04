# Reprise ShipHub — 4 novembre 2026

## Point repris

La conversation retrouvée s'arrêtait sur la séparation entre **le vaisseau personnel du joueur** et **l'immense Clan Ship dans lequel il vient s'amarrer**. L'ancien brouillon n'avait pas été publié ; ses fichiers, son ancien classeur et l'annonce de 27 vérifications ne sont pas disponibles comme preuves. Ce dossier est un nouveau point de reprise fondé sur les exigences connues et le dépôt courant.

Base de travail : `main` à `d56c0e0`. Branche de reprise : `feat/clan-ship-docking-20261104`.

PR de reprise : [#104 — brouillon](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/104). Première tête publiée : `3f5c90b2f3710b838f68c24d2a498bf34694ec5e` ; ce dossier doit être ajouté au commit suivant.

## Livrables

- `shiphub-reprise-20261104.xlsx` : cinq onglets — reprise, pièces et services du Clan Ship, assets, château orbital, arrivée et recette.
- `prompts.md` : trois briefs de conception réutilisables, avec séparation explicite entre références demandées, adaptation de gameplay et extrapolation.
- `build-workbook.mjs` : source reproductible du classeur, générée avec `@oai/artifact-tool`.
- `verification.json` : contrôle des formules et manifeste des rendus, lorsqu'il est produit par le script.

## Travail courant et limites

La reprise du code porte sur l'approche, l'amarrage, l'entrée, la circulation dans les salles, le retour au vaisseau personnel et le désamarrage. Elle couvre aussi la persistance par campagne, les emplacements de sauvegarde, l'import/export et l'attribution des entrées à une seule interface active. L'identité du vaisseau personnel doit rester celle de la flotte du joueur, y compris après rechargement à bord du Clan Ship.

**État QA final local communiqué par l'agent principal : suite combinée de 184/184 tests réussis, ESLint strict sans avertissement ni erreur, `npm run typecheck` réussi. Recette navigateur CI en attente au moment de la rédaction.** Ce chiffre décrit la suite automatisée ; il ne représente ni un pourcentage de complétion du projet ni une validation visuelle. Le navigateur Chromium local n'a pas pu démarrer (`socket(): Operation not permitted`) ; l'escalade a été refusée par la politique d'exécution. Le workflow CI isolé de la PR est en cours pour la recette. Le classeur conserve les statuts fonctionnels « En cours » ou « À vérifier ». La PR doit ajouter les résultats navigateur réellement obtenus et les liens de preuve avant de présenter cette recette comme validée.

Le **château orbital Predator King / Wolf System, associé dans le brief à Black Panther vs Predator**, et la **cinématique d'arrivée inspirée de Predator (1987) jusqu'à 1:02** ne sont pas implémentés dans cette passe. Leurs lignes sont des éléments de planification. Les associations de lore et le découpage exact du film demandent encore une vérification sur les références choisies ; les prompts et les timings proposés ne constituent pas des preuves de canon.

## Sources et lecture du classeur

Les sources sont indiquées par ligne : brief de reprise, chemins de code et assets présents dans l'arbre Git. Un asset « Existant » signifie que le fichier est référencé dans le dépôt ; cela ne certifie ni son intégration dans le Clan Ship, ni sa fidélité canonique, ni son approbation artistique. Les nouveaux assets restent « À produire ». Les propositions de salles et d'effets métier restent des adaptations de gameplay lorsqu'aucune référence vérifiée ne les établit.

Références principales : `app/game/systems/clanShipDocking.ts`, `app/game/ShipHub.tsx`, `app/game/shipCatalogue.ts`, `app/game/shipInteriorKit.ts`, `app/game/shipInteriorV22.ts`, `app/game/systems/campaignSlots.ts`, `app/game/systems/activeHuntSave.ts`, `tests/clan-ship-docking.test.mjs`, `tests/clan-ship-save.test.mjs`, `docs/ship-modular-art-contract.md`.

La feuille Reprise compte automatiquement les éléments des feuilles de détail. Aucun taux global de réalisation n'est calculé : les chantiers n'ont pas la même taille et plusieurs éléments ne sont pas encore exécutés.

## Vérification du livrable

Les cinq onglets ont été rendus et examinés. Les six formules de synthèse ont été recalculées : 24 exigences Clan Ship, 20 assets existants candidats, 6 lots à produire, 12 éléments château, 8 plans d'arrivée et 6 contrôles navigateur. Un changement temporaire de statut d'asset a vérifié la propagation des compteurs, puis la donnée d'origine a été restaurée. Ces vérifications concernent le classeur, pas le rendu du jeu.
