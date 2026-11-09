# Reçus CI distincts de la livraison locale du 9 novembre

Ce dossier conserve la première passe GitHub Actions de la PR #131 sur `1edbf69117949df3d3e1591b79fdcc416928862d`. Il n’altère pas les classeurs, captures et attestations du lot gelé `production/reprise-chasse-bible-20261109/`.

- [Panne Clan Ship — run 42569447583](initial-run-42569447583/receipt.json) : rapport JSON, capture PNG native, texte de page et log décodé natif conservés sans modification. La recette historique échoue sur l’arrivée au service des archives ; le résultat reste un échec, avant exécution de la nouvelle recette d’escorte dans cette commande CI.
- [Chasse — run 42569447665](harvest-run-42569447665/receipt.json) : les deux jobs réussissent. Le rapport brut du nouvel aperçu de prélèvement confirme 18 contrôles et 18 captures, avec ses fixtures et ses limites. Les PNG de cette passe restent dans l’artifact GitHub identifié ; ils ne sont pas dupliqués ici.

Les reçus donnent les IDs de workflow, tentative, job, artifact, commit et empreintes des fichiers copiés. Le navigateur chasse utilise le commit de fusion synthétique `43b5996543d89cdf0405ae684f67557eb8d4d132` ; l’API GitHub confirme son arbre exactement identique à la tête `1edbf691`. Cette équivalence de sources ne transforme pas une recette bornée en campagne complète, ni en validation humaine, matérielle ou artistique.

Les liens de téléchargement temporaires et les URL signées renvoyées par les outils de récupération ne sont pas enregistrés.

Le correctif de `scripts/qa-clan-ship-browser.mjs` attend désormais la bonne salle, l’arrêt et la proximité réelle du service des archives. Le délai maximal de 45 secondes et les trois assertions qui imposent une confirmation séparée sont conservés. Le premier état immobile, publié avant le premier pas du trajet, ne suffit plus. Aucune source produit n’est modifiée par ce correctif.

La [nouvelle recette locale complète](verification.json) passe 22 contrôles dans les sept salles, avec 2 601 observations de marche, 11 captures natives et aucune erreur JavaScript ni ressource manquante. Le [rapport brut](local-browser/report.json), le journal, les captures et la commande sont conservés avec le hash du script superposé à `1edbf691`. Le lancement initial refusé par le bac à sable reste séparé ; il n’est pas présenté comme une exécution du navigateur. Cette passe locale précède la nouvelle exécution GitHub Actions.
