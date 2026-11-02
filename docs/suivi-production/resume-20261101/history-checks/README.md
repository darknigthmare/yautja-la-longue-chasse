# Vérifications historiques de la reprise

Les trois commandes demandées passent avec Node v22.23.4. Leurs journaux sont complets et séparés ; aucune assertion originale n’a été retirée, réécrite ou filtrée. Aucun fichier gelé n’a été modifié.

| Commande (avec `--check --tests`) | Résultat propre | Durée locale totale | Journal |
| --- | --- | ---: | --- |
| `node scripts/check-homeworld-history-v112.mjs` | 68 assertions originales dans onze fichiers ; 1 433 entrées ; classeur V111 de 8 150 642 octets reproduit, SHA256 fa5ebf78… | 284 s | [Homeworld historique](check-homeworld-history-v112.log) |
| `node scripts/check-excel-history-homeworld-v112.mjs` | 132 assertions originales dans 17 fichiers (125 V111 + 7 V90) ; classeur V111 identique | 170 s | [Capsule V111/V90](check-excel-history-homeworld-v112.log) |
| `node scripts/check-excel-history-compat-v112.mjs` | Checker original inchangé, 56 assertions dans huit fichiers ; 1 386 entrées ; classeur V110 de 6 260 095 octets reproduit, SHA256 0b7d7890… | 65 s | [Checker indépendant V110](check-excel-history-compat-v112.log) |

Les 68 assertions Homeworld recouvrent une partie de la suite de 132 : ne pas les additionner comme des comportements distincts. Chaque commande exécute ses sources historiques privées ; aucune ne certifie le jeu courant, son rendu, une admission artistique, Excel natif ou un déploiement.

[result.json](result.json) conserve les commandes, exit codes, SHA256 des journaux et résultats finaux originaux. [invocation-inputs.json](invocation-inputs.json) conserve onze empreintes de scripts, capsules, gels et classeurs historiques : elles restent identiques après les trois commandes. Les durées sont des observations locales pendant les recettes parallèles ; elles ne sont pas des mesures de performance gameplay.
