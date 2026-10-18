# PR 4 — fiabilité des exercices de guerre de clans

Cette passe prolonge la branche V94 au-delà du commit 3ecd798, sans fusion dans main et sans ajout fictif d'une campagne de guerre de clans. Les corrections précédentes, y compris les chargements régionaux de la reprise interrompue, sont conservées.

## Corrections

Le magasin des exercices utilise un verrou natif partagé pour comparer les octets observés, écrire puis confirmer par relecture. Une écriture perdue, une lecture refusée ou un verrou indisponible laissent l'exercice en mémoire et affichent son statut non confirmé. Le bouton de réessai ne réinitialise pas l'exercice. Une autre session ayant changé les octets provoque un refus conservateur : les données concurrentes ne sont pas écrasées. Les archives incompatibles et les domaines jamais lus ne sont pas débloqués par un simple réessai. Sans Web Locks, les exercices restent utilisables en mémoire, avec avertissement ; aucun remplacement non verrouillé n'est tenté. Les anciennes versions qui écrivent sans ce verrou ne deviennent pas transactionnelles rétroactivement.

Le canyon s'arrête lors de la suspension du parent, d'une perte de focus, d'un changement de panneau, d'une superposition inert/masquée ou du démontage. Le callback de minuterie revérifie l'activité au moment de son exécution. Une formation déjà extraite n'est plus retenue comme sélection de secours lorsque d'autres restent sur le terrain.

Les sorties des mutateurs du canyon conservent au maximum 100 messages : repli et archivage ne produisent plus un journal que le lecteur du jeu refuse ensuite. Les durées et destinations non finies sont rejetées avant mutation. Un résultat en mémoire ne porte plus l'étiquette « déjà archivé » tant que son écriture n'a pas été confirmée.

Aucun format de sauvegarde, aucun fichier artistique et aucune donnée de campagne principale n'est changé par les exercices.

## Vérifications locales

52/52 tests Node ciblés passent, sans échec ni test ignoré : 6 cas de session existants adaptés aux écritures asynchrones et 46 cas nouveaux (22 durabilité, 13 cycle de vie/sélection, 11 validité du canyon). Les essais avant correction ont reproduit les défauts de confirmation, de concurrence, de pause, de sélection et de journal. Les compteurs de tests ne représentent pas autant de bugs distincts.

Commande :

```sh
node --test --test-concurrency=1 tests/clan-war-session-v85.test.mjs tests/clan-war-durability-v94.test.mjs tests/clan-war-lifecycle-v94.test.mjs tests/clan-war-canyon-validity-v94.test.mjs
```

Le navigateur local bloque les requêtes localhost par sa politique d'administration. Il n'a donc pas validé les parcours navigateur. Le workflow de PR exécute désormais `node scripts/qa-clan-war-browser-v94.mjs` dans son environnement Chrome, en plus de la compilation Next, de TypeScript, du lint et des suites antérieures. Les résultats de cette exécution doivent être lus dans GitHub Actions, et non déduits des tests locaux.

Le montage navigateur utilise le vrai panneau et les véritables localStorage/Web Locks sur une origine isolée, avec profil de test et images de substitution. Certains scénarios préremplissent les données pour atteindre l'état à vérifier. Cela ne certifie ni la campagne complète, ni la fidélité des images, ni les appareils physiques, ni le cloud.

L'essai local de toutes les anciennes suites clan-war comporte une assertion de ressource native absente du checkout partiel et deux scénarios de livraison non disponibles. Cette passe ne retire pas ces contrôles et ne présente pas cet essai comme un succès intégral.
