# Suivi Homeworld V111

Le classeur `YAUTJA_V111_SUIVI.xlsx` prolonge les 105 feuilles du classeur V110 certifié, sans réexécuter son générateur contre le nouveau jeu. Huit feuilles V111 sont ajoutées, soit 113 au total. Les cellules, formules, styles et parties ZIP historiques sont contrôlés à l’identique.

Le suivi distingue quatre périmètres Homeworld, les 56 exigences source et neuf actions héritées, et le catalogue de 354 cibles artistiques. Un inventaire de présence ne déclare pas toutes les cibles manquantes ou livrées. Les nouvelles admissions éventuelles demandent un PNG, un reçu et une liaison runtime vérifiables ; elles n’entraînent aucune clôture globale.

Les quatre périmètres sont validés sur le jeu compilé par la recette complète `scripts/qa-homeworld-continuation-v111.mjs` : continuation B vers A, restauration explicite depuis un point conservé, guide mobile avec Worker réel et ancien parcours A. Le rapport publié contient 76 contrôles réussis et 12 captures inspectées. Les 1 430 sources exécutées sont identiques au gel ; 14 réponses HTML portent le Build ID et leur SHA256. Aucune erreur navigateur, console ou Worker n’a été enregistrée.

La production utilise le runtime `402b238f098def39fbdf81ce624e3f841fdebc20` et le Build ID `WNCgNY2MxAHaQy90_a7T5`. Le gel `docs/v111-runtime-freeze.json` compte 264 471 octets, SHA256 `d3e67f9404aea0936b24398c9b16ff75c8c69a4a6748f6c04a80da425ec494bd`. Le rapport `docs/v111-homeworld-validation.json` compte 546 722 octets, SHA256 `902cd2a6c1f05a0685b9573b05d3e7ce4ad4aad24db7aae21a9d96a7c0fd07a0`.

La portée reste bornée aux parcours et fixtures déclarés : aucun achèvement global du Homeworld, réparation du fragment ou lien de lignée n’est déduit de ces contrôles. Les quatre nouveaux dessins de conversation concernent un archiviste et une orientation ; ils ne clôturent aucune des 354 cibles. Les tests historiques V110 utilisent la capsule privée `excel-history-v110-homeworld-v111` ; leurs 56 assertions restent séparées des 51 régressions courantes V110.

```sh
node tests/homeworld-excel-followup-v111.test.mjs
node scripts/check-excel-history-homeworld-v111.mjs --check --tests
node scripts/build-homeworld-followup-v111.mjs
node scripts/build-homeworld-followup-v111.mjs --check
```

Pour les images historiques du recensement, le profil reproductible vérifie leur chemin et objet Git courant. Les octets présents sont contrôlés en plus par SHA256 et identité de blob ; les images absentes d’un checkout réduit ne sont pas assimilées à des absences du projet. Les sources de code et les nouveaux dessins admis demandent toujours les octets. Cette identité Git ne certifie aucun rendu ni aucune qualité artistique.

La vérification structurelle n’exécute pas Excel natif et ne certifie aucun parcours navigateur. Le registre `docs/v111-homeworld-source.json` conserve les besoins et les limites de chaque périmètre.
