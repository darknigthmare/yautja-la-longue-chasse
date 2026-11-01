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

## CI d'intégration réellement vérifiée

- [Run 41318747723](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41318747723) : **30/30 tests métier Node**, vérification TypeScript V146, ESLint ciblé, classeur ZIP cinq feuilles, et **trois parcours navigateur réels réussis** :
  1. **Dernier contact PR55** : archive de test produite à partir des blobs source vérifiés, choix de règle, camouflage, diminution du souvenir 2→1, puis recharge.
  2. **Marche forcée PR71** : refus pendant verrou, débit unique de 3 RAV, échéance -8 s, risque conservé, rechargement et rappel.
  3. **Deux onglets V115** : verrou coopératif, refus de remise à zéro obsolète, absence de double dépense, expirations différées et sauvegarde de campagne témoin inchangée.
- **Défaut de QA révélé par la combinaison et corrigé** : le Web Lock effectue une écriture asynchrone ; le script ancien PR72 lisait l'archive immédiatement après le clic camouflage. V150 attend maintenant une preuve effective `clock+1` **et** `guardInvestigation.turns=1` dans l'archive avant de vérifier la reprise. Il n'injecte aucun état fictif.
- **Excel V150 actualisé** : 22 critères suivis validés au périmètre testé, 6 non homologués restent ouverts. Ces 22 contrôles ne correspondent pas à 22 tests Node indépendants : les scénarios de suivi peuvent se recouper.

**Limites** : aucun test ne simule un service de synchronisation distant ou ne certifie des props filmiques. Le jeu complet et l'authentification serveur restent hors périmètre.
