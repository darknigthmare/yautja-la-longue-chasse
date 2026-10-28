# Contexte historique Homeworld V110 pour V111

La capsule provient du commit certifié `59bcc32929b1d3f6ee6e967da8cab8c561ca6f1d`. Ses huit fichiers de tests V110 restent inchangés. Les 56 assertions originales passent, puis le générateur d’origine reconstruit exactement le classeur `0b7d7890c8d235a9cda0f6d61c62001efe150f2c4022924c20d88196afcdbd7c` (105 feuilles, 6 260 095 octets, 1 440 entrées). Ces vérifications historiques ne certifient pas le jeu V111.

Les 1 543 sources privées incluent 892 fichiers app et proviennent des octets Git d’origine. Les 1 123 fichiers partagés sont vérifiés par taille et SHA256. Quarante-cinq JSON de revue sont copiés en lecture seule afin de conserver les découvertes `Dirent.isFile()` des contextes imbriqués ; aucun PNG n’est dupliqué. Les imports du jeu courant restent courants, sans hook ni redirection globale.

L’adaptateur Python V111 prend en charge le certificat Homeworld unique de V110. Le constructeur historique multi-domaines précédent reste inchangé. Les noms des scripts et fixtures Homeworld sont distincts des outils du chantier de mécaniques de chasse V111.

```sh
python3 scripts/build-excel-history-snapshot-homeworld-v111.py --check
node tests/homeworld-excel-history-v111.test.mjs
node scripts/check-excel-history-homeworld-v111.mjs --check --tests
```

Les journaux conservés sont `context-tests.log` (trois tests d’isolation), `historical-v110.log` (56 assertions et régénération originale) et `capsule-rebuild.log` (reconstruction exacte). Aucune modification d’un classeur, générateur ou assertion publiée n’est nécessaire.
