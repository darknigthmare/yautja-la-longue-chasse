# V145 — Trois onglets, deux planètes, archives de guerre isolées

**PR :** [#42](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/42), brouillon empilé sur la PR #40. **Aucune fusion sur main.**

## Défaillance identifiée et corrigée

Le test multi-onglet V144 échouait après trois vérifications réussies et un délai de 15 secondes. Son lecteur de preuve IndexedDB ouvrait correctement la base, mais rappelait `resolve(...)` dans le navigateur alors que l'exécuteur avait nommé son callback `resolveFence`. Cet appel incorrect laissait la promesse du test non résolue. Le moteur de sauvegarde n'était pas démontré défaillant par cette erreur de la QA.

Correctif : `scripts/qa-clan-war-multitab-v144.mjs` appelle `resolveFence(read.result ?? null)`. [CI V144 réussie sur ce correctif](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41250914021).

## Extension réelle V145

`tests/browser/clan-war-v143.fixture.tsx` accepte désormais **uniquement** `?planet=thalassa` en plus de sa valeur Korthas par défaut, dans le banc de tests. Cela ne modifie aucun sélecteur public de la campagne.

Le banc `scripts/qa-clan-war-multitab-v144.mjs` ouvre maintenant trois vrais `ClanWarPanelV85` dans un même contexte Chromium, partageant localStorage et IndexedDB :

1. Onglets A et B : Korthas, chacun au tour 1 ; onglet C : Thalassa, tour 1.
2. A passe Korthas au tour 2 ; B devient obsolète et verrouillé.
3. C reste autorisé et avance Thalassa au tour 2 ; il ne débloque pas le front périmé de B.
4. B refuse toujours une réinitialisation destructive et la confirmation d'un tour.
5. Après rechargement, B relit Korthas au tour 2 puis confirme le tour 3.
6. L'onglet A devient à son tour obsolète ; Thalassa demeure au tour 2.
7. Le banc lit **deux clôtures IndexedDB indépendantes**, phase `confirmed`, ID de planète correspondant et jetons distincts. L'archive de Korthas reste à son tour 3.
8. A recharge Korthas au tour 3 sans bannière périmée. La sentinelle d'une sauvegarde de campagne étrangère au front n'a pas changé.

Les **huit vérifications Chrome ont réussi**, avec **zéro erreur de page** dans le rapport du workflow [41251186421](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41251186421). Le test source `tests/clan-war-multitab-v144.test.mjs` empêche la réintroduction de l'ancien callback IndexedDB et exige les branchements spécifiques à Thalassa.

## Classeur de production V145

[Yautja_ClanWar_V145_Multiplanetes.xlsx](Yautja_ClanWar_V145_Multiplanetes.xlsx) contient cinq onglets :

- **00_Synthese** : KPI calculés, 8/8 contrôles et 28 planètes non vérifiées par ce banc.
- **01_Chrome_V145** : huit étapes, résultats et liens de preuve.
- **02_30_Planetes** : trente planètes effectivement enregistrées dans V96, avec statut individualisé ; seules Korthas et Thalassa sont couvertes par ce test.
- **03_Restes_A_Faire** : travaux ouverts de multijoueur, cloud, quatre sous-modes, navigation intégrale et art.
- **04_Sources** : documents de référence et URL de la PR et de GitHub Actions.

Le classeur est un suivi **complémentaire** aux 48 onglets V142 et à l'annexe V144 ; il ne déclare aucune tâche 1:1 terminée.

## Critères encore ouverts

- **28 autres planètes** : vérifier la séparation IndexedDB en jeu, les sous-régions, les générateurs et la stabilité après rechargement.
- **Quatre sous-modes V115** : vérifier les effets d'un conflit entre onglets dans l'assaut, l'infiltration/sabotage, le RTS et les opérations déléguées, sans fausse attribution de succès.
- **Appareils distincts, cloud, mode PvP** : pas démontrés par trois onglets Chromium d'un même navigateur.
- **Parcours GameClient entier** : le banc emploie le véritable panneau de guerre et la simulation, mais une fixture de campagne, pas les menus de l'utilisateur.
- **Fidélité cinématographique et droits** : aucun des 54 gauntlets n'a reçu de validation artistique indépendante 1:1 et les droits Predator/AVP restent à revoir.

Cette étape ne change pas les règles de guerre, les ordres, les objets de chasse, le nombre de personnes ou les récompenses. Elle renforce la vérification de l'isolation et de l'intégrité des archives stratégiques.

## Complément V145 — 30 clés indépendantes testées en Node

Le test `tests/clan-war-multitab-v144.test.mjs` déroule maintenant les **30 planètes réellement enregistrées dans `WAR_PLANETS_V96`** : il hydrate 30 sessions distinctes sur un stockage partagé, vérifie l'unicité des clés, enregistre un tour 2 pour chaque monde et transmet les notifications de changement aux **29 autres sessions**. Aucun monde étranger ne doit être déclaré périmé, et chaque archive doit conserver son identifiant de planète et son tour. Les tests ciblés ont été réussis dans le [workflow GitHub V145](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41251571595).

**Deux niveaux de preuve distincts :** isolation logique **30/30 en tests Node**, et navigations avec vrai Chromium **2/30 mondes (Korthas et Thalassa)**. Les **28 autres planètes restent à ouvrir et tester en navigateur**, en particulier lorsqu'un front est suspendu, rétabli ou qu'un sous-mode V115 est actif.

Le [classeur V145](Yautja_ClanWar_V145_Multiplanetes.xlsx) indique séparément ces niveaux de validation. Il conserve le bilan **0/54 gauntlets approuvés 1:1**.
