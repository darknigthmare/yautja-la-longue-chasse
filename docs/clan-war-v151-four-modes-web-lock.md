# V151 — Conseil des clans / quatre modes et Web Lock partagé

**Branche d’intégration basée sur [PR #76](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/76)**, avec reprise ciblée des gardes d'écriture de la [PR #74](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/74) et des premiers travaux [PR #66](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/66). Les PR parentes restent **draft**, aucune fusion dans `main`.

## Défaut constaté et correction

La branche #76 agrège les quatre modes, le Conseil/RTS W3, l’Outer Ops à marche forcée et la mémoire réaliste des gardes, mais son composant `ClanWarOperationsV115.tsx` persistait encore les modifications en `localStorage` après une comparaison d'octets non atomique. Son reset pouvait écraser une archive plus récente, et les timers d'assaut, de RTS et de rapports différés avaient le même risque.

Le V151 transplante, dans **le composant #76 le plus récent**, le verrou exclusif Web Locks V115 déjà validé dans #74 :
- Un **seul verrou local coopératif** pour toutes les opérations V115, le reset et les minuteries. Une action durant une écriture signale qu'il faut réessayer ; elle n'est pas mise en file pour être appliquée aveuglément plus tard.
- Un Web Lock manquant rend l'archive **lecture seule** : pas de repli silencieux vers `getItem` → `setItem`.
- La version de l'archive est comparée avant l'opération et **sous le verrou** ; le reset contrôle avant et après confirmation, puis une dernière fois dans le verrou.
- L'obsolescence est signalée par `storage`, `focus` et `visibilitychange`. Les archives V115 dont la version est incompatible conservent leurs octets.
- La reprise d'un `active.mode` ou d'un mandat Outer Ops rétablit **le bon panneau, territoire et détachement RTS**.
- **Les règles métiers de #76 sont préservées** : Conseil, vérification des reçus W3 source, protection des dommages d'assaut, durées/risques Outer Ops, 2 patrouilles et dernier contact.

## Preuves à générer

- `tests/clan-war-v115-multitab-v151.test.mjs` vérifie la protection d'une réinitialisation, le contrôle du focus et le contrat du vrai navigateur.
- `scripts/qa-clan-war-v115-multitab-v151.mjs` instancie **deux vrais composants V115** avec la Bible V6 dans Chromium : demande concurrente, refus sans verrou, double clic, minuterie d'assaut, fin simultanée d'une mission Outer Ops et d'un recrutement, reset périmé et rechargement. Aucun état de mission n'est falsifié pour faire passer l'essai ; seuls des temps de navigateur de QA sont avancés.
- Le typecheck V147 et les tests historiques source, patrouilles, Outs Ops et Conseil doivent également réussir.
- Le [classeur V151](Yautja_ClanWar_V151_Quatre_Modes_Verrou.xlsx) conserve **26 critères**, y compris les tests de jeu complet, matériel, réseau et art restant ouverts.

## Limites non closes

Un Web Lock ne protège que des onglets **coopérants de la même origine**. Il ne valide ni un client ancien qui écrit sans verrou, ni le cloud/PvP et deux machines distinctes. Le banc Chrome utilise les vrais composants en fixture, mais **ne traverse pas toute l'interface GameClient**. Les fiches CW120 de 1 200 missions ne sont pas des niveaux terminés. Aucune carte W3-K n'est artificiellement déclarée identique à un monde V85 CON-T.

**Fidélité visuelle : 0/54 gauntlets certifiés 1:1.** Les sprites disponibles sont des prototypes originaux, pas une validation des accessoires des films. Les photogrammes, proportions, glyphes, patine, animations, essais humains et droits restent à fournir avant toute homologation.

Le workflow GitHub du dernier commit doit être lu **avant** d'attribuer le statut PASS. Ne pas fusionner cette PR sans revue.


## Validation réelle sur la branche d'intégration

[GitHub Actions V151 : run 41320212943](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41320212943) : **41 tests métier réussis sur 41**, TypeScript et ESLint verts, **14 étapes Chromium réussies**, vérification ZIP XLSX cinq feuilles réussie. [Captures + rapport navigateur](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41320212943/artifacts/13089605205).

Tests navigateurs réels : deux panneaux V115, verrou détenu, démarrage concurrent avec un seul mandat accepté, absence de Web Locks bloquant l'écriture, double clic, minuterie d'assaut suspendue puis reprise, fin simultanée Outer Ops + recrutement sans perte, reset périmé bloqué et rechargement. **Cela n'homologue pas un scénario entier de campagne ou une performance sur mobile.**

**Excel révisé :** 18/26 critères techniques validés avec preuve, 8 ouverts/partiels. Le statut 0/54 des gauntlets 1:1 reste inchangé.

Premier lancement CI : deux erreurs du banc de contrôle, pas des règles V115. Correction du checkout de `tests/fixtures/outer-pace-pr57/` et du nom conservé de la fonction `verifyOwnV115ArchiveV148`. Run ci-dessus : vert après correctifs.
