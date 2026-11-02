# V144 — Guerre des clans : quatre modes en parallèle

**Base : PR #53 V143**, précédée des PR #52, #51, #50, #48, #47, #46, #45, #44, #43 et des fondations W3. **Le gauntlet de la PR #42 reste indépendant et inchangé.**

## Intégration réelle dans le jeu

| Mode | Commande et règle nouvelle | Sécurité |
|---|---|---|
| Assaut latéral | `commandWarAssaultRegroupV144` : **deux véritables formations V6** se replient simultanément sur la même voie contre **16 AP** ; une fois par équipe | À distance de leur bastion, vivantes, sans posture empêchant le repli, sans passage au travers d'une ligne adverse et sans ajouter soldats, RAV ou soins. L'ordre est un achat AP comme le repli V139 ; le tick adverse suivant reste normal |
| Outer Ops | `commandWarOuterRerouteV144` : choisir **une vraie route alternative source V6** dans les toutes premières secondes d'un mandat, sans réassigner les membres | **1 RAV réel, +5 s**, routeChoiceId et reçu d'origine archivés, passage non franchi et limite physique. Aucun ennemi caché ni victoire anticipée ; les détours tardifs ou forgés sont rejetés |
| Infiltration | `commandWarStealthAlertReinforcementV144` : activer une patrouille de sécurité supplémentaire dans la variante difficile d'une mission W3 après une première alerte | Second garde généré à une **entrée traversable de la carte**, marche d'une case par tour, deux positions réelles vérifiées pour la visibilité, le camouflage et l'écoute ; anciens fichiers sans second garde toujours lisibles |
| RTS multi-escouades | `commandWarRtsCrossfireV144` : deux tireurs V6 visibles et chacun à portée exécutent une salve simultanée sur le **même ennemi**, coût **2 RAV** | Un seul tour d'IA et de météo, pas de tir hors LOS ou sur cible invisible, pas de doublon d'unité ni d'XP/campagne V85 |

### Livrables et assurance qualité

Code des quatre moteurs dans `app/game/systems/`, ajustements des moteurs V115/V133 et de leurs interfaces React, `tests/clan-war-four-modes-v144.test.mjs`, `tsconfig.clan-war-v144.json` et workflow de régression `.github/workflows/clan-war-v144.yml`. Les vérifications historiques V115–V143 demeurent dans cette CI ; une validation navigateur/manette reste séparée.

**L'Excel V144 de suivi de production** documente le même lot, les critères de qualité, les dépendances et les limites. L'archive originale de suivi V143 reste **référencée sans suppression**. Si le fichier historique ne peut pas être exporté brut depuis GitHub, l'Excel de cette PR sera un **avenant V144 explicite** et non une prétendue copie intégrale des 73 onglets précédents.

### Frontières de fidélité 1:1

Les tactiques V144 sont des **mécaniques originales de jeu**, pas des faits de canon Predator. Les unités W3, le terrain des planètes, le roster et les règles de ressources viennent des sources V6 existantes. Les 1 200 variantes CW120 restent des **fiches de conception**. **Non livrés** : scènes complètes 1:1 des films/comics/jeux, guerre totale persistante V85, serveur PvP/coop, version mobile/manette certifiée, QA de longue durée et véritable déploiement.

**Ne pas fusionner** tant que le dernier commit n'a pas obtenu une CI ciblée verte et que l'ordre des PR parentes n'a pas été respecté.

## V144 — workbook source-bounded and final code CI

**Code CI sur le commit `83c6058` : 154/154 tests Node, TypeScript et ESLint réussis**, [GitHub Actions 41248679556](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41248679556).

L'avenant `Yautja_Guerres_Clans_Avenant_Production_V144_2026-10-31.xlsx` contient **8 nouvelles feuilles** (quatre modes, 32 contrôles QA, 12 interactions, index des sources et tableau de bord) et **48 exigences**. Il **référence** explicitement le vrai classeur V143 de 73 feuilles dans la PR #53 ; il ne prétend pas en inclure une copie. Les anciens classeurs, 1 200 dossiers design CW120, 24 scénarios W3, 12 cartes et 36 dossiers W5 restent dans leurs PR d'origine.

Les **16 exigences ciblées en CI** sont séparées des **9 prototypes partiels et 23 à développer**. Parmi les QA V144, **8 tests ciblés** sont couverts et **24 sessions manuelles restent ouvertes**. Les tests `clan-war-production-v144.test.mjs` inspectent le véritable XLSX binaire commité (noms de feuilles, IDs, provenance, formules).
