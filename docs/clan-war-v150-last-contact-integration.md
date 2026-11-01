# V150 — Réconciliation des deux branches d'infiltration et Outer Ops

Base : [PR #71](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/71) (marche forcée + verrou V115 + migration), source : [PR #72](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/72) (dernier contact de patrouille), pile #42 → #67 → #69 → #71 → **nouvelle intégration**.

## Modifications effectives
- Réintégration dans la branche #71 de la mémoire des **deux dernières décisions** du premier garde après un contact réellement vu : le leurre sonore garde priorité, et le deuxième garde ne connaît pas le souvenir du premier.
- Champ `guardInvestigation` facultatif, contrôles stricts à la lecture sans écrire les anciennes archives au chargement ; les anciennes sauvegardes restent acceptées.
- Indication UI uniquement lorsque le garde principal est visible du joueur, sans divulguer la position cachée du chasseur.
- Conservation des apports #71 : Web Lock V115, reprise des patrouilles ambiguës, marche forcée Outer Ops et rappel. Aucune nouvelle récompense ni appropriation de territoire.
- Tests Node source PR72 + test d'intégration V150 ; fixture Chromium créée depuis le moteur authentifié #55, avec vérification du choix de règle et du rechargement.

## Distinctions obligatoires
La fidélité au gameplay de l'exercice ne signifie pas 1:1 cinématographique : patrouille, décoy et carte tactique restent originaux. Aucune synchronisation entre appareils, serveur de production, preuve PvP ni homologation des 54 gauntlets. Les données de test ne sont pas des sauvegardes historiques réelles. Les PR parentes restent en brouillon et ne sont pas fusionnées à `main`.

## Preuves
Compléter uniquement avec les résultats réels de la CI du SHA final. Les tests PR #71 et PR #72 étaient verts séparément ; ce n'est pas une preuve automatique de leur compatibilité combinée. Le fichier `docs/Yautja_ClanWar_V150_Reconciliation_Patrouilles.xlsx` conserve les exigences non clos.
