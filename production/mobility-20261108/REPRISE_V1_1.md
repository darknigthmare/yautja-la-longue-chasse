# Reprise mobilité V1.1 — 8 novembre 2026

## Code publié et qualifié

Tête de code : `2fa19db1c3f600323350c8256dd7a1d6e6c0ee71`, dans la PR #127. Cette reprise ne génère aucune image et ne fusionne pas la PR.

Les commandes multi-entrées et l'aperçu des améliorations ont été publiés dans `d79fb427`, puis les recettes tactiles ajustées dans `2929045e` et `5e2adb75` : deux doigts indépendants, opposition neutralisée, retour au neutre obligatoire de la manette, pause après sa déconnexion et comparaison des sept statistiques avant achat. Les scénarios tactiles utilisent les événements natifs Chromium ; la manette reste une fixture API déclarée, pas du matériel physique.

Le contrôle global a ensuite révélé deux raccords manquants que les tests ciblés ne couvraient pas : le service `mobility` n'était pas accepté par le type `DevService`, et le code importait la bible depuis un dossier absent des checkouts de build. Ils sont corrigés sans modifier le solde, les prix, les règles d'acquisition ou la progression.

- `/dev` reconnaît le service mais affiche seulement un avis de campagne, sans garage, prêt, achat ni écriture.
- Les cinq JSON sous `app/game/systems/mobility/catalogue-source/` sont des projections **identiques octet pour octet** à la bible. Les identifiants, textes et ordre des cinquante modèles sont inchangés.
- `node scripts/sync-mobility-catalogue.mjs --check` vérifie cette égalité ; `--write` régénère la projection après une modification intentionnelle de la bible.
- Huit tests de frontière ajoutés couvrent notamment le chargement dans un contexte sans `docs/` et l'absence d'achat dans `/dev`.

## Preuves vérifiées

[CI mobilité 42498294170](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/42498294170) : **161 tests de règles/intégration + 6 tests de guidage QA**, aucun ignoré, TypeScript ciblé, **21 contrôles natifs de conduite/atelier** et **12 contrôles tactiles/API manette** réussis. Les rapports et captures originales sont conservés dans `qa/native-2fa19db1/` ; leurs commits de source correspondent à la tête ci-dessus. Le code de jeu et les assets ne sont pas réécrits par ces tests.

[CI d'intégration 42498298048](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/42498298048) : le **graphe TypeScript complet et le build frontend diagnostic** passent, ainsi que les étapes de cette recette. Le run est déclenché par la PR et utilise son merge de test. Il ne prouve pas que toutes les autres recettes de la PR, l'équilibrage ou le parcours Homeworld complet sont qualifiés.

Les échecs précédents ne sont pas supprimés : guidage au bord de l'aire, injection tactile de la recette, puis raccords du build complet. Les reçus `native-9f42efcf/` et la feuille `QA` restent historiques.

## Excel et portée

Le vrai XLSX compte maintenant **23 feuilles et 779 formules calculées**. `Reprise_V1_1` ajoute vingt lignes de qualification et de périmètre. La synthèse sépare les 167 tests, les 21 contrôles de conduite et les 12 contrôles tactiles/API. Les 2 428 cellules historiques sont préservées ; aucun besoin d'image, d'animation ou de son n'est artificiellement clôturé.

Le périmètre jouable reste : Grav-Sled de prêt et moto de clan sur l'aire, une moto achetable, douze paliers d'amélioration, réparation/recharge distinctes, remorquage et deux convois autonomes. Les quarante HD restent des sources de revue, pas quarante véhicules complets. Les quêtes d'acquisition restantes, montures/BOND/écuries, conduite hors aire, combat embarqué, PNJ régionaux, HD 41–50, vues et animations restent ouverts. La recette complète campagne → Forges et les périphériques physiques ne sont pas annoncés terminés.
