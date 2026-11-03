# V152 — RTS V115 en temps réel, deux onglets, verrou et reprise

**Travail intégré dans [PR #77](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/77)**, brouillon empilé sur la branche des quatre modes. Aucune fusion dans `main`.

## Manquant V151 désormais éprouvé

La V151 avait vérifié la concurrence des actions, du reset et du timer d'assaut, mais pas **les ticks RTS en temps réel depuis deux vrais onglets**. La V152 exécute `ClanWarOperationsV115` et les véritables données `DEFAULT_WAR_RULES_V6` dans Chromium :

1. Deux instances React réelles de la V115 partagent une origine et un `localStorage`, sans remplacement du moteur V115.
2. Le panneau A démarre une mission RTS W3/V6 et active automatiquement le mode temps réel avec un détachement identifié. Le RAV est débité au lancement.
3. L'onglet B prend `navigator.locks.request("yautja.clan-war.v115.operations.free.v1.write")`.
4. **Pendant 2,5 secondes**, A ne peut écrire aucun tick RTS. Les octets de l'archive et l'horloge restent identiques.
5. Lorsque B libère le Web Lock, A reprend réellement ses ticks, avec la **même mission, le même serial et aucun deuxième débit RAV**.
6. A passe en ordres alternés, B détecte son état périmé, bloque la réinitialisation puis recharge l'archive RTS autoritative, sans retour fictif à l'assaut.
7. La sentinelle indépendante de sauvegarde du chasseur reste inchangée, et aucune erreur de page n'est relevée.

## Preuves vérifiées

- [GitHub Actions V152](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41321492577) : **3 tests Node PASS, 0 échec**, typecheck TypeScript V147 PASS, ESLint PASS, contrôle du classeur .xlsx PASS.
- [Captures bureau et rapport JSON d'une vraie simulation RTS en Chromium](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41321492577/artifacts/13089018180) : **6 vérifications Chrome PASS**, aucune erreur de page.
- Code source : `scripts/qa-clan-war-rts-two-tabs-v152.mjs` et `tests/clan-war-rts-web-lock-v152.test.mjs`.
- [Excel V152, 5 feuilles](Yautja_ClanWar_V152_RTS_Deux_Onglets.xlsx) : 18 critères dont **12 clos avec preuve technique**, 6 ouverts ou partiels.

## Précautions et limites

- Le banc utilise **deux onglets coopérants d'un seul navigateur**, pas deux machines, un serveur arbitre ou un réseau PvP. Un ancien client ne prenant pas Web Locks n'est pas contrôlé par ce test.
- La victoire/défaite complète des 24 missions source RTS, les 30 théâtres V85, les cartes W3 à taille réelle et le parcours de menu `GameClient` restent des périmètres distincts. Une mission V115 n'annexe pas automatiquement un territoire V85.
- Les règles V115 emploient un gameplay tactique original de type prototype ; le jeu principal demeure orienté action. Aucun rapprochement automatique avec les règles d'`AVP Extinction`.
- Aucun visuel de gauntlet n'a reçu une validation indépendante sur accessoire film, photogramme, matière, géométrie, glyphe, pose et droits : **0/54 homologués 1:1**. Les PNG/SVG existants sont des études/prototypes et pas des reproductions certifiées.
- Pas de fusion automatique des PR empilées, et ne pas assimiler les succès de TypeScript aux audits cinématographiques.

## Travaux suivants, non clos

1. Campagne `GameClient` de bout en bout avec missions RTS/assaut/infiltration/Outer Ops, bilan, blessés, extraction et sauvegarde des quatre modes.
2. Passage W3/V6 ↔ V85 avec mapping documentaire explicite, sans ville terrestre déplacée arbitrairement sur les mondes fictifs.
3. Tests multi-appareils, reprise après perte réseau et clients historiques.
4. Audit visuel 1:1 des 54 gauntlets et validation des droits avant diffusion.
