# V135 — Guerre des clans, quatre gamemodes poursuivis ensemble

**PR #44**, empilée sur **#43**. La PR #42 (gauntlet holographique) reste parallèle et n'est pas modifiée. Les nouveaux mécanismes restent des **prototypes de gameplay originaux** et sont séparés des assertions de fidélité film/comic/PHG 1:1.

## Implémenté sur la branche V135

| Mode | Mécanique livrée dans le code | Règle de sécurité / effet attendu |
|---|---|---|
| Assaut latéral | `reinforceWarAssaultLineV135` dans `clanWarParallelModesV135.ts` | 18 AP, équipe déployée près de son bastion, une fois par mission, protection limitée à 8 PV ; pas de RAV/XP de campagne |
| Outer Ops | `redirectWarOuterOpsV135` | Reprogrammation recon/interception/escorte une seule fois avant la mi-course, identités et route inchangées, dueAt inchangé, journal final |
| Infiltration/sabotage | `commandStealthV115` : `decoy` + `wait` | Signal sonore émis là où se trouve réellement le joueur, 2 unités d'énergie, patrouille réagissant 3 tours. Attente recharge seulement hors du regard |
| RTS multi-escouades | `commandWarRtsSuppressV135` | 2 RAV d'exercice, adversaire réellement vu et à portée, une seule riposte bloquée, zéro PV de dégâts instantanés et aucune cible cachée |

Deux interfaces ont été étendues : `ClanWarOperationsV115.tsx` (trois modes) et `ClanWarRtsSquadsV133.tsx` (RTS W3). Les profils d'unité W3-U, les contrats de mission et les coûts PC/RAV continuent à utiliser la Bible V6. La sauvegarde libre existante reste version 1 : les nouveaux champs sont **optionnels** et leur intégrité est vérifiée à l'import. Une archive corrompue ou issue d'une source différente ne doit pas écraser les données existantes. Le correctif du typage V119 préserve les six scénarios historiques.

## Excel et tests

`Yautja_Guerres_Clans_Suivi_Production_V135_2026-10-31.xlsx`, dans ce dossier : **20 onglets**, avec les 18 onglets V134 conservés, les 1 200 IDs de variantes CW120, les 24 scénarios RTS W3, 12 cartes et 36 missions W5. Deux nouveaux onglets :

- `MODES_V135_PARALLELE` : **48 exigences** (12 par mode), préconditions, critères d'acceptation, rejet, provenance, statut, lore et manquants.
- `QA_V135` : **24 contrôles** (6 par mode) distinguant tests automatisés et QA manuelle.

Le tableau `00_PILOTAGE` additionne les statuts par formules, sans déclarer 48 fonctionnalités terminées. Le test `tests/clan-war-production-v135.test.mjs` inspecte le véritable XLSX commité : format ZIP, 20 feuilles, 48 tâches, 24 QA et préservation des IDs CW120/W3/W5. Le test `tests/clan-war-four-modes-v135.test.mjs` exécute chaque mode et les garde-fous de sauvegarde, suivi des tests de régression V115/V133/V134, TypeScript et ESLint.

## Travaux non livrés

La guerre des clans V135 n'est **pas** 1 200 scénarios finis. Restent les lieux 1:1 autorés, les vrais sprites/portraits/armes par continuité, le serveur multijoueur, la persistance des garnisons et équipes V85, la logistique, les convois jouables, les grandes armées RTS, les PNJ de sabotage et l'équilibrage avec sauvegarde de campagne. Les résultats du prototype V115/V133 n'annexent aucun territoire V85 ni ne délivrent des trophées inventés.

Avant fusion : CI verte sur dernier commit, tests navigateur desktop/mobile/manette et validation du contrat V6/V85, puis fusion **dans l'ordre** des PR empilées.
