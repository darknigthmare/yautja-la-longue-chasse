# V143 — Double vue, confirmation atomique et archive de guerre réelle

**PR de travail :** https://github.com/darknigthmare/yautja-la-longue-chasse/pull/42 (empilée sur #40, volontairement en brouillon).

La V142 a déjà confirmé le chargement du vrai moteur **HuntCanvas**, la suspension/réactivation d'une mission et la conservation de l'identité cosmétique Wolf malgré le choix ultérieur de Feral. La V143 ne reconstruit pas ce système : elle reprend un manquant différent, le **vrai panneau Guerre des clans**.

## Défaut détecté

Le bouton « Confirmer et résoudre le tour » exécutait directement `advanceWarTurnV85(simulation)` à partir du rendu React courant. Il ne revérifiait ni les écritures en cours, ni la révision du front, ni l'activité de la fenêtre. Le bouton « Retirer » d'un ordre avait la même absence de contrôle. Ces chemins pouvaient calculer depuis des données d'interface devenues obsolètes, même si le système d'archives possédait ensuite ses propres protections de verrouillage.

## Correctif appliqué

- `app/game/systems/clanWarTurnGateV143.ts` : garde pure de validation, avec états `ready`, `inactive`, `loading`, `writing` et `stale`.
- `app/game/ClanWarPanelV85.tsx` : une révision est mémorisée lorsqu'un joueur commence la relecture du tour. Avant la résolution, le composant relit le **snapshot de `createWarSessionV85`**, compare la révision et refuse si l'écran est inactif, le front suspendu ou une écriture en cours.
- L'archive est mise à jour par `setSimulation(result.state)` uniquement si la résolution a réussi. Une seconde activation immédiate ne peut pas valider à nouveau le même tour parce que le snapshot de session est déjà passé en écriture ou a changé de révision.
- Les réservations annulées sont lues dans le snapshot réel, avec refus pendant les écritures. Les interactions de retrait sont désactivées lors d'une écriture ou d'une suspension.
- La vue holographique, la vue classique, la carte V95, les autres planètes, les calculs de combat et la progression de chasse restent **strictement identiques**. Aucune capacité de gauntlet ne modifie la balance des unités.

## Preuves techniques

Le test Node `tests/clan-war-turn-gate-v143.test.mjs` examine les différents états du garde, l'absence de sauvegarde ou de règle de combat dans ce module, et son branchement au véritable panneau. La [CI ciblée du correctif](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41248184799) était réussie au commit `4224253`.

Le nouveau banc `tests/browser/clan-war-v143.fixture.tsx` monte le **vrai `ClanWarPanelV85`**, avec la vraie session V85, l'atlas V95 et un `SaveGame` d'essai local. `scripts/qa-real-clan-war-v143.mjs` doit vérifier en Chrome :
1. La présence d'un atlas V95 unique ; la bascule holographique/classique conserve exactement le même élément DOM.
2. Deux activations synchrones du bouton de confirmation ne passent le front qu'au **tour 2, révision 1**.
3. L'archive du front Korthas persiste et recharge ce même tour.
4. Une autre planète ouvre son propre front (tour 1), puis le retour à Korthas restaure le tour 2.
5. La préférence de vue reste indépendante de la campagne, sans toucher une clé d'archive témoin.

**Périmètre :** ce navigateur monte le vrai panneau et la vraie simulation stratégique ; il remplace seulement l'élément `next/image` décoratif dans cette fixture isolée. Il ne remplace pas une traversée de l'intégralité du menu, ni un essai multijoueur réel, ni la validation 1:1 des bracelets de films.

## Limites ouvertes

- Tests de réservation d'assaut/logistique et véritables conflits de deux onglets actifs ; le stockage contient déjà des transactions, mais les interactions concurrentes doivent être reproduites.
- Les quatre types de missions V115 sur un environnement de guerre complet.
- La comparaison cinématographique de chaque accessoire, la production de textures/animations/gestes réellement certifiés et la revue des droits.
- Les **54 variantes de gauntlets** sont des créations ou études techniques non homologuées ; aucun dessin SVG ou test de navigateur ne garantit la fidélité photographique 1:1.

## Excel

La feuille source cumulative reste `docs/Yautja_Gauntlets_V142_Arsenal_Clans.xlsx`. Une **annexe V143** accompagne ce changement et répertorie les tests V143, la garde d'écriture, leurs preuves GitHub et les écarts restants ; elle ne remplace pas artificiellement le classeur cumulatif de 48 onglets.
