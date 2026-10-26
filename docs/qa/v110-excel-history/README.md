# Contexte historique V109 pour V110

La capsule est construite depuis le commit certifié `876a229f43cf01a8135df7ca864e4e11487d8613`. Elle conserve ses 12 fichiers de tests V109 inchangés et son générateur original. Le classeur attendu reste `e80fcea5fdf768d5c9b6fd1874f89bc42badee24fbac9a3cf7cecb447c49ed3f` ; ces vérifications historiques ne certifient pas le jeu V110.

Les 1 531 sources sont privées et en lecture seule. Les 1 073 entrées partagées sont vérifiées par leur taille et SHA256. Parmi elles, 45 petits JSON natifs sont copiés dans le contexte privé pour conserver la découverte originale avec `Dirent.isFile()` ; aucun PNG n’est dupliqué et aucun garde original n’est assoupli. Les capsules V108 et antérieures gardent leurs propres racines et empreintes.

Le premier essai des tests d’isolation a échoué parce que les JSON partagés par symlink disparaissaient de ce scan. Son journal est conservé dans `context-tests-initial-failed.log`. Après matérialisation des JSON, les trois tests d’isolation passent dans `context-tests.log`. La reconstruction exacte de la capsule est contrôlée dans `capsule-rebuild.log`.

```sh
python3 scripts/build-excel-history-snapshot-v110.py --check
node --experimental-strip-types --test --test-concurrency=1 tests/excel-history-v110.test.mjs
node scripts/check-excel-history-v110.mjs --check --tests
```

Le dernier appel exécute les 95 assertions V109 originales puis régénère exactement le classeur publié ; son résultat complet est conservé dans `historical-v109.log`. En CI, les tests V109 du jeu courant continuent à importer les sources actuelles : seul `excel-followup-v109.test.mjs`, qui exige le gel historique exact, passe exclusivement dans la capsule. Aucune redirection d’import du jeu courant n’est installée.
