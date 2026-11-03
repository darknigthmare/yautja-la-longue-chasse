# V145 — Premier raccord sécurisé des bilans des quatre modes à la sauvegarde stratégique V85

**Base : PR #54 (V144)** ; chaîne #53 → #52 → #51 → #50 → #48 → #47 → #46 → #45 → #44 → #43 → #41 → #40 → #38 → #37 → #36 → #34 → #29. **Le chantier du gauntlet #42 est indépendant.**

## Évolution réellement jouable des quatre game modes

L'exercice **Guerres des clans V115** produit des rapports d'assaut latéral, d'Outer Ops, d'infiltration et de RTS. Jusqu'à la V144, ils étaient lus uniquement dans un bilan en mémoire. La **V145 les rend consultables puis archivables explicitement, un à un**, dans le journal local de l'exercice territorial **V85 de Korthas**.

| Mode source | Pièce transférée | Ce qui est enregistré | Ce qui n'est PAS transféré |
|---|---|---|---|
| Assaut latéral | Reçu V115 de combat, victoire/défaite/repli, participants, blessés et territoire | **Une ligne de rapport documentaire** dans V85, reliée à un ID V6/V85 exact | Ni conquête, ni mouvement de garnison, ni XP ni stock |
| Outer Ops | Uniquement un vrai rapport après le délai et le rappel ou la résolution | Le résultat final déjà connu, sans inventer le vainqueur | Ni récompense anticipée, ni renfort/route attribué à V85 |
| Infiltration/sabotage | Rapport V115 émis après sortie/abandon | Provenance, équipes, résultat, cible territoriale exacte | Pas de sabotage stratégique V85 automatique ni de vision de patrouille |
| RTS V115 | Rapport libre d'un mandat RTS lié à Korthas | Reçu documentaire unique ; mêmes conditions d'ID V6 | Pas de nouvelle flotte, conquête ou guerre totale persistante |
| RTS tactique W3 V133 | Les preuves de carte existent depuis V144, mais n'ont **pas** de lien territorial V85 | **Aucune écriture V85** pour ce type sans correspondance de planète/territoire | Pas d'attribution abusive d'une mission extraterrestre à Korthas |

La V85 reste elle-même un **exercice stratégique local `context:"free"`**, et non un changement à la sauvegarde de campagne principale.

## Implémentation exacte

- `app/game/systems/clanWarProofSyncV145.ts` : `reviewWarProofSyncV145` et `importWarProofV145`.
- L'archive source doit être lue par **`readWarOperationsV115`** (taille et source SHA V6). Les reçus sont réaudités avec **`auditWarOperationsDebriefsV144`**. Seuls des IDs territoriaux Korthas **exacts** sont acceptés.
- **Limite cartographique vérifiée en V145 :** les territoires du contenu V6 sont identifiés `W3-K01…` et ceux de V85 `CON-T01…`. Leurs lieux et leurs fiches ne sont **pas équivalents**, malgré leur thème Korthas. Les rapports sont donc **archivés en tant que preuves externes sans correspondance territoriale V85**, sauf future passerelle géographique explicite et auditée. Ce n'est jamais une autorisation de capture.

Les reçus importés obtiennent un identifiant stable `clan-proof-v145:V115:<mission>` dans **`appliedResultIds`** et **`reports`** de V85. Réimporter le même reçu, remplacer le territoire ou modifier la source est rejeté **sans nouvelle écriture**.
- Chaque mutation ne concerne que **`revision`**, **`appliedResultIds`** et **`reports`**. Tous les champs de gameplay (contrôle, garnisons, équipes, statuts, stocks, temps, ordres, observations, objectifs, XP, escorte) restent inchangés. La sortie passe par **`readWarSimulationV85`** avant d'être acceptée.
- L'UI `app/game/ClanWarPanelV85.tsx` permet **une inspection manuelle** de l'archive locale existante, puis une **confirmation explicite pour un seul reçu**, seulement à Korthas lorsque la session V85 est writable, sans sauvegarde concurrente, après **contrôle de révision** et relecture des octets source.
- La persistence emprunte **`createWarSessionV85.setSimulation`**, donc les protections transactionnelles existantes (fence d'archive, contrôle de concurrence et gestion des échecs). Le module V145 **n'écrit jamais directement dans le localStorage**.
- Aucune transformation de données de personne entre V6 et V85 : les identités sont différentes et doivent encore être rapprochées explicitement avant toute mécanique stratégique.

## Vérifications et backlog

`tests/clan-war-proof-sync-v145.test.mjs` couvre les quatre modes, l'import documentaire, l'idempotence, les sources illégitimes, les planètes différentes, la compatibilité des archives V85, les limites et une session locale transactionnelle sans modification de la campagne principale. La CI exécute les tests session V85, les régressions V115–V144, TypeScript et ESLint.

**Toujours ouvert pour l'avenir :** liaison de personnages explicite, décision d'autorisation territoriale, transaction de conquête supervisée et idempotente, serveur multijoueur de référence, XP/livraison de ressources et morts vérifiables, QA mobile/manette/navigateur et **1 200 missions complètes avec assets 1:1**. La V145 ne prétend pas achever ces points ; cette limite est indiquée dans le suivi Excel.

L'Excel V144 compagnon de neuf onglets et le registre V143 de 73 onglets sont **conservés** sur les PR parentes. Le suivi V145 complète leurs données de progression, sans renommer ou effacer l'historique.

## Bilan des tests et du classeur V145

- **Preuve du code** : [GitHub Actions 41253489187](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41253489187) valide **171/171 tests Node**, TypeScript et ESLint. Le correctif a explicitement préservé la séparation territoriale **W3-K** contre **CON-T**.
- **Fichier XLSX V145** dans cette PR : `docs/clan-war-v145/Yautja_Guerres_Clans_Preuves_Transfert_V145_2026-11-01.xlsx` (**19 onglets**, les 9 onglets de V144 préservés, 32 nouvelles exigences V145, 24 QA, 14 sécurités, 12 exemples non appariés W3-K/CON-T, 20 chantiers restants et 12 contrats inter-modes).
- **Statuts de production calculés** : 21 exigences validées en CI ciblée, 3 prototypes partiels, 8 à développer. **20 contrôles QA de source** vérifiés en CI et 4 passages navigateur/manette manuels encore à réaliser.
- Le CI final ajoute `tests/clan-war-production-v145.test.mjs`, qui ouvre **les octets du vrai fichier XLSX commité**, vérifie les feuilles/identifiants, les formules et la non-correspondance territoriale. Cette nouvelle exécution, comprenant le fichier binaire, doit être verte avant fusion.
- Les registres V143 (73 feuilles) et V144 (9 feuilles) restent disponibles dans leurs PR parentes, sans conflit ni remplacement.
