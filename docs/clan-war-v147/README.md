# V147 — Réconciliation du Conseil des clans, des sources W3 et des comptes rendus V85

**Branche :** `feat/v147-clan-war-council-source-reconcile-20261101` ; **parent :** PR #60, `feat/v146-clan-war-provenance-audit-20261101`.

## Constat réel sur GitHub

Plusieurs branches V146 ont avancé en parallèle et ne sont pas fusionnées. La PR #60 documente la provenance **W3-K / CON-T** et les identités V115/V85 ; la PR #61 crée le Conseil commun ; les PR #65 et #68 renforcent les reçus RTS W3, tandis que #67, #69, #70, #71, #72 réconcilient séparément les patrouilles, la marche Outer Ops et les verrous multi-onglets. **Aucune de ces dernières PR n'est considérée fusionnée avec #60 ou V147**. La PR #42 du gauntlet reste indépendante.

La V147 réutilise spécifiquement les **contrôles de cohérence source du Conseil de la PR #68** en les plaçant dans `clanWarCouncilReviewV147.ts` : il ne s'agit **pas** d'un merge aveugle des moteurs des branches concurrentes. Un nom de module distinct évite la collision avec `clanWarCouncilAuditV146.ts` de la PR #61.

## Quatre modes couverts

| Mode | Faits vérifiables dans le Conseil V147 | Limites |
|---|---|---|
| Assaut latéral V115 | Mission et secteur source V6, issue, membres blessés, équipes réellement présentes au compte rendu | Trajectoires exactes des touches, personnages V85, carte filmique et prise de territoire **non prouvés** |
| Outer Ops V115 | Dernier rapport différé, équipes, mandat, cible source et issue déclarée | Trajet complet du convoi et déroulement de chaque engagement **non authentifiés** |
| Infiltration/sabotage V115 | Archive de sortie, issue et blessures d'origine | Positions exactes des gardes, équipement filmique et conséquences persistantes non certifiés |
| RTS libre V115 et tactique W3 V133 | Reçu de mission, unités W3 réelles, ordre d'objectifs, carte complète reconstruite du catalogue V6, PC, RAV, extraction, escorte et groupes hors combat | Un fichier client « source-cohérent » n'est **pas** une preuve d'exécution authentifiée ; aucune mutation V85 autorisée |

## Correction de sécurité importante

Avant V147, `auditWarRtsDebriefV144` comparait quelques IDs du reçu avec la **carte modifiable contenue dans la même archive**. Une archive pouvant modifier la carte et conserver ces IDs pouvait donc apparaître valide.

La V147 réutilise `buildWarCouncilAuditV147` et `isWarRtsSourceConsistentV147` avant l'émission d'un débrief RTS V144. La vérification reconstruit la mission W3 depuis `createWarRtsMissionStateV129` puis compare géométrie, carte, planète, tâches, cellule source, unités, stats V6, budget PC et RAV, et résultats terminal/escorte. Les reçus incohérents sont rejetés et signalés, non convertis en trophées.

**Attention :** même ces contraintes ne démontrent pas l'historique d'une partie ; il faudra un serveur autoritaire et une identité persistante pour cela. Aucun droit de conquête, XP ou blessure de campagne n'est accordé.

## Interfaces et QA

- `ClanWarOperationsV115.tsx` affiche, dans ses rapports de mission, le dossier V147 et les preuves encore manquantes de chacun des **quatre modes V115**.
- `ClanWarRtsSquadsV133.tsx` affiche la cohérence de la mission W3, ou le refus motivé d'un reçu invalidé.
- `tests/clan-war-council-v147.test.mjs` et `tests/clan-war-council-v147-victories.test.mjs` sont adaptés des tests des PR #68/#65 ; cette provenance est conservée. Les 24 victoires de fixture neutralisent ennemis/risques et **ne valent pas des parties complètes en conditions réelles**.
- `tests/clan-war-source-reconciliation-v147.test.mjs` couvre les cartes modifiées, faux objectifs, stats de roster gonflées, conquêtes anticipées et la coexistence des audits des quatre modes.
- `.github/workflows/clan-war-v147.yml` exécute ces suites et les régressions historiques, TypeScript et ESLint.

## Manquants et fidélité 1:1

Le classeur compagnon V147 conserve les **26 feuilles V146** (qui elles-mêmes héritent des neuf V144 et 19 V145) et ajoute des registres des quatre modes, des **24 scénarios W3** et des PR non réconciliées. Les catalogues historiques des **1 200 variantes de mission design-only**, des 12 cartes et 36 dossiers W5 restent dans les PR parentes : **ne pas les compter comme 1 200 niveaux terminés**.

Les modèles du Conseil, les coûts AP/RAV, les tactiques et les routes sont des créations du jeu. Les apparences exactes des Yautja, armures/gauntlets, armes, vaisseaux, biomes, espèces et lieux connus demandent des **références média/scène et une vérification visuelle 1:1 distincte** avant de passer au statut « validé ». Ne jamais placer une ville terrestre sur une planète extraterrestre sans source attestée.

**À venir** : intégration contrôlée des PR #67/#69/#70/#71/#72, compatibilité des verrous multi-onglets, QA navigateur et manette, autorité réseau et liaison géographique/personnelle V6→V85. La PR V147 reste en brouillon, avec ses dépendances.

## Classement Excel V147 réellement livré

Le classeur `docs/clan-war-v147/Yautja_Guerres_Clans_Source_Conseil_V147_2026-11-01.xlsx` est un **vrai XLSX binaire** de **33 onglets**. Il conserve **les 26 onglets V146** et ajoute sept feuilles :

- `26_CONSEIL_V147` : 20 exigences pour les quatre modes, avec statut.
- `27_SOURCE_W3_V147` : 16 garde-fous issus du contrôle des sources W3 (#68), dont 14 validés en CI ciblée et deux toujours à développer (serveur/fidélité artistique).
- `28_RTS_W3_24_V147` : 24 scénarios source, essais de victoires **isolés** ; ne pas afficher « partie complète ».
- `29_PR_V147` : 11 PR ouvertes/parallèles à réconcilier. L'algorithme #68 est adapté, pas la totalité des branches #61/#67–#72.
- `30_QA_V147` : 24 scénarios QA sur provenance, refus des falsifications, géographie et liens V85 ; QA navigateur/manette/serveur non validées.
- `31_FIDELITE_1TO1` : 24 éléments visuels/géographiques proposés par films, jeu, comics ou création originale, **tous à documenter et vérifier**. Pas de reproduction certifiée 1:1.
- `32_PILOTAGE_V147` : bilan avec `COUNTIF`/`COUNTIFS`/`COUNTA` sur les véritables statuts.

**CI source :** [GitHub Actions 41318859615](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41318859615) valide **207/207 tests du code, TypeScript et ESLint**. La nouvelle CI `tests/clan-war-production-v147.test.mjs` ouvre le véritable binaire de cette PR et vérifie les 33 feuilles, les IDs et les formules. Aucune ancienne feuille n'est écrasée.

**Attention aux branches concurrentes et aux versions** : la PR #42 mentionne sa propre V147/V148 gauntlet. La V147 ici est uniquement **Guerre des clans / Conseil / provenance**, basée sur PR #60 ; ne pas confondre ni fusionner les PR automatiquement.
