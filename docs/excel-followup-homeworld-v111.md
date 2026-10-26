# Suivi Homeworld V111

Le classeur `YAUTJA_V111_SUIVI.xlsx` prolonge les 105 feuilles du classeur V110 certifié, sans réexécuter son générateur contre le nouveau jeu. Huit feuilles V111 sont ajoutées, soit 113 au total. Les cellules, formules, styles et parties ZIP historiques sont contrôlés à l’identique.

Le suivi distingue quatre périmètres Homeworld, les 56 exigences source et neuf actions héritées, et le catalogue de 354 cibles artistiques. Un inventaire de présence ne déclare pas toutes les cibles manquantes ou livrées. Les nouvelles admissions éventuelles demandent un PNG, un reçu et une liaison runtime vérifiables ; elles n’entraînent aucune clôture globale.

La production reste `null` et les périmètres non promus tant que la recette complète `scripts/qa-homeworld-continuation-v111.mjs` n’a pas produit un rapport inspecté avec son gel exact. Les tests historiques V110 utilisent la capsule privée `excel-history-v110-homeworld-v111` ; leurs 56 assertions restent séparées des tests courants.

```sh
node tests/homeworld-excel-followup-v111.test.mjs
node scripts/check-excel-history-homeworld-v111.mjs --check --tests
node scripts/build-homeworld-followup-v111.mjs
node scripts/build-homeworld-followup-v111.mjs --check
```

Pour les images historiques du recensement, le profil reproductible vérifie leur chemin et objet Git courant. Les octets présents sont contrôlés en plus par SHA256 et identité de blob ; les images absentes d’un checkout réduit ne sont pas assimilées à des absences du projet. Les sources de code et les nouveaux dessins admis demandent toujours les octets. Cette identité Git ne certifie aucun rendu ni aucune qualité artistique.

La vérification structurelle n’exécute pas Excel natif et ne certifie aucun parcours navigateur. Le registre `docs/v111-homeworld-source.json` conserve les besoins et les limites de chaque périmètre.
