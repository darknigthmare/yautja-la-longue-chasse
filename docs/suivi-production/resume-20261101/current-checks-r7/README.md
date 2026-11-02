# Régressions V112 sur le runtime R7

Une seule exécution de 35 fichiers V112 courants, hors les deux suites de suivi Excel/certificat encore en attente de la publication R7.

Résultat : **375 assertions PASS**, 0 échec, 0 ignoré, 0 annulé, exit code 0. Durée locale totale : 239.304 s.

- Runtime : `bda14a95aa8c9e6cf37039e2d67ea1544a8e8de1`.
- Build ID lié à ce runtime : `wVuSG_xIKNn3geLlIq7Cb` ; cette suite de tests ne remplace pas une recette navigateur du build.
- Gel : SHA256 `c35f8b454ec26d1b05852cabbe4f6ee111d71e7413aef80282582d3ca5ee6a3e`. Le document de gel et les 35 empreintes des fichiers de test restent identiques après exécution.
- Le glob courant est `tests/*-v112.test.mjs`, avec exclusion exacte de `homeworld-excel-followup-v112.test.mjs` et `homeworld-excel-history-v112.test.mjs`. Les commandes, fichiers et empreintes sont consignés dans [inputs.json](inputs.json).

[Le journal complet](current-v112-excluding-two-excel-tests.log) et [result.json](result.json) conservent les résultats sans filtrage. Les capsules historiques déjà réussies aux mêmes onze empreintes ne sont pas relancées. Aucune source gelée n’a été modifiée par ce contrôle. Les modèles, fonctions de production et gardes de source sont des preuves différentes des parcours/captures de l’application compilée.
