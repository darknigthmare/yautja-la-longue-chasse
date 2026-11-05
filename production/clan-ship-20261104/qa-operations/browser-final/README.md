# Clan Ship — preuves finales du 5 novembre 2026

Ces preuves qualifient la révision applicative `1137faaf80051b37fa2205af73414bed099024a9`, arbre `48bd6ecf12e3c4ce1429b339adc204caf25b46f7`, intégrée par la [PR 112](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/112). La publication documentaire ultérieure ne modifie pas ce runtime.

Les **15 workflows associés à cette tête sont terminés avec succès**. La prévisualisation Vercel de cette source est `READY` et son statut GitHub est réussi. La PR112 est fusionnée dans `main` au commit `93af9f3f93830387ed0305405e102e7c92cdbd14` ; la comparaison avec la tête qualifiée ne relève aucun fichier différent. La [matrice finale de CI et d'intégration](ci-workflows-final.json) conserve l'heure du constat, les quinze exécutions, la source du déploiement de prévisualisation et la preuve de fusion. Les recettes navigateur décrites ci-dessous ont leurs propres environnements ; elles n'ont pas été exécutées contre l'URL Vercel.

## Résultats et provenance

| Parcours | Source de CI | Résultat | Preuve conservée |
|---|---|---|---|
| Domaine, persistance et intégration du Clan Ship | [Run 41972172619](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41972172619), job `127062712758` | 277 tests réussis, aucun échec, abandon ou test ignoré | [Synthèse](clan-ship-verification.json) et log intégral compressé |
| Amarrage et intérieur historiques | Même run Clan Ship | 22 contrôles navigateur réussis | [Rapport original](clan-ship-report.json) |
| Mandat, équipage et opérations tactiques | Même run Clan Ship | 27 contrôles navigateur réussis | [Rapport original](operations-report.json) |
| Visites temporaires `/dev` | [Run 41972172707](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41972172707) | 20 contrôles navigateur et 72 tests Node réussis | [Rapport original](dev-travel-report.json) |
| Château de Wolf et arrivées | [Run 41972172611](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41972172611) | 32 contrôles navigateur et 284 tests Node réussis | [Rapport original](wolf-arrival-report.json) |

Les suites Node se recoupent ; leurs nombres ne constituent pas un total de tests distincts. Les quatre recettes navigateur correspondent à 101 contrôles au total, dont 49 propres au Clan Ship. Chaque recette est réussie, sans exception de page ni ressource manquante. Le rapport `/dev` relève également zéro erreur console, zéro écriture de stockage et zéro ouverture de base de données. Wolf ne collecte pas une liste distincte d'erreurs console.

Les rapports Clan Ship et Wolf portent `sourceCommit = checkoutCommit = 1137faaf…` et `workingTreeDirty = false`. Pour `/dev`, le rapport porte la source exacte et un arbre propre ; le checkout exact a aussi été vérifié dans le log du job. Le nom de l'artefact Wolf contient le SHA de fusion provisoire `008220ca…`, tandis que le workflow et le runtime qualifiés utilisent bien la tête `1137faaf…`. Voir la [vérification complémentaire](dev-wolf-verification.json).

## Ce que la recette d'opérations a réellement joué

La campagne initiale part d'un adulte à bord, sans mandat, recrue ou contrat d'opération déjà gagné. Elle réalise l'accueil, le mandat, les quatre parcours intérieurs et leurs quatre recrutements, les trois victoires spatiales, un retrait et la défaite par fermeture de la fenêtre au tour 16. Elle exerce aussi le refus d'une écriture, le réessai avec récompense unique et les reprises après recharge.

Le second contexte prépare deux résultats de chasse et six recrutements au moyen des reducers réels. Ces deux chasses ne sont pas jouées dans Chromium. L'escorte et la confirmation du cercle sont ensuite réalisées par des interactions tactiles réelles. La [déclaration des fixtures](fixture-disclosure.json), la [sauvegarde initiale adulte](initial-adult-aboard.json) et la [sauvegarde initiale des six recrues](initial-six-crew-fixture.json) sont conservées sans modification.

Le rapport d'opérations enregistre 49 ordres acceptés — 44 dans la campagne initiale et 5 dans le second contexte —, huit types d'ordres sur neuf, 4 862 échantillons de marche, sept salles, 31 trajets et 23 captures. « Répartir l'énergie » est couvert par les tests de modèle ; cette recette navigateur ne clique pas cet ordre. La défaite jouée est celle du délai tactique, pas une destruction de la formation.

Le bouton de guidage propre au terminal n'est pas cliqué par cette recette ; les déplacements et le guidage de l'intérieur sont exercés. L'isolation des contextes ne remplace pas un scénario de conflit simultané entre deux onglets de la même campagne. L'import/export des opérations est couvert par les tests de domaine et de persistance. Ces limites restent visibles dans le suivi de production.

## Captures originales sélectionnées

| Fichier | Situation observée |
|---|---|
| [Table massive du conseil](captures/02-council-massive-table.png) | Installation physique et projection, avant l'attribution du mandat |
| [Escorte au deuxième tour](captures/04-escort-turn-two.png) | Commandes, coûts et prévisions avec quatre membres recrutés |
| [Garde du Seuil à son poste](captures/crew-threshold-guard-at-post.png) | Première recrue visible au hangar après recrutement gagné |
| [Équipage à 390 px](captures/13-earned-crew-mobile-390.png) | Cartes des membres de la campagne initiale |
| [Commandes à 320 px](captures/15-tactical-controls-mobile-320.png) | Commandes et prévisions du contexte complémentaire déclaré |
| [Cercle confirmé à 320 px](captures/17-fixture-circle-confirmed-mobile-320.png) | Confirmation jouée après l'escorte tactile, avec les six recrues préparées |

Les captures bureau, 390 px et 320 px ont été inspectées. Cette revue porte sur la lisibilité et les interactions présentées ; elle ne constitue pas une approbation artistique humaine « 1:1 », une qualification des performances ni une partie de campagne intégrale.

## Conservation des preuves

Les rapports, fixtures et PNG sélectionnés ont été copiés sans retouche. [copied-artifacts.json](copied-artifacts.json) associe chaque fichier conservé à son origine, sa taille et son SHA-256. Le [manifeste de conservation](clan-ship-evidence-sha256.txt) répertorie les 39 fichiers extraits de l'artefact Clan Ship, ainsi que l'archive ZIP originale, le log complet et la synthèse de qualification, soit 42 fichiers. Ce dossier ne duplique que les rapports, fixtures, synthèses et captures sélectionnés, ainsi que le log compressé.

Le log complet du job est conservé dans [clan-ship-job-127062712758.log.gz](clan-ship-job-127062712758.log.gz). Sa décompression restitue exactement les 180 859 octets d'origine, SHA-256 `41f26d3c93c6963b0352fc8dd6ae00c422baf6f7f657c107a2ac33f609733004`. La compression préserve les lignes originales, y compris les espaces de sortie du runner.

L'archive Clan Ship originale, artefact GitHub `13390568123`, a été vérifiée avec le SHA-256 `ff135d1179628c401439eeef0ed34b4f72f65b8779021b0bff826d0584e122a1`. Les empreintes des archives `/dev` et Wolf sont consignées dans leur synthèse. Les preuves locales précédentes et l'audit technique des 28 images conservent séparément leur date et leur révision d'exécution.
