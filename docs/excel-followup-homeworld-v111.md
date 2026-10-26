# Suivi Homeworld V111

Le classeur `YAUTJA_V111_SUIVI.xlsx` prolonge les 105 feuilles du classeur V110 certifié, sans réexécuter son générateur contre le nouveau jeu. Huit feuilles V111 sont ajoutées, soit 113 au total. Les cellules, formules, styles et parties ZIP historiques sont contrôlés à l’identique.

Le suivi distingue quatre périmètres Homeworld, les 56 exigences source et neuf actions héritées, et le catalogue de 354 cibles artistiques. Un inventaire de présence ne déclare pas toutes les cibles manquantes ou livrées. Les nouvelles admissions éventuelles demandent un PNG, un reçu et une liaison runtime vérifiables ; elles n’entraînent aucune clôture globale.

Les quatre périmètres sont validés après intégration de la PR21 et corrections de revue par la recette complète `scripts/qa-homeworld-continuation-v111.mjs` : continuation B vers A, restauration explicite, guide et carnet mobiles avec vrai Worker, ancien parcours A. Les 87 contrôles passent ; 14 captures sont inspectées, 1 433 sources sont identiques au gel et 14 réponses HTML portent le Build ID et leur SHA256. Aucune erreur navigateur, console ou Worker ni requête échouée n’est enregistrée.

La production utilise le runtime `4202c8a003c342d86f4749933a2a3c65cff2e613`, Build ID `tj39nnduLIdi202JSGX7p`. Son gel compte 264 999 octets, SHA256 `8eee8a5f5a043f2a67477bc6bcff97fffb1ee1666864bd7aed60c7a6c21ca138`. Le rapport publié compte 549 822 octets, SHA256 `808c4d76e512207c9a0b757cb517624e836ac696c08614638e81e122bcd478b0`. Le brut décodé compte 701 298 octets, SHA256 `666ff5cf17708a20d3a7b088ddf0597c7bc427a5e5c058a13ffb2938bbe530d0`.

La première livraison r1 est conservée à l’octet près dans `docs/qa/v111-homeworld-before-pr21`. Elle concerne exclusivement le runtime `402b238f098def39fbdf81ce624e3f841fdebc20`, Build ID `WNCgNY2MxAHaQy90_a7T5` : 76 contrôles, 12 captures et 1 430 sources. Son classeur, son rapport et son gel restent historiques et ne certifient pas le code intégré ultérieur.

Les preuves intégrées distinguent onze tests Save/Hub de continuation, dont le refus de porte pendant le portage du fragment et la coexistence du Flaying Tool ; 177 scénarios de sauvegarde dans 18 fichiers ; et deux tests React statiques du carnet avec zone de défilement unique. Les deux derniers tests ne certifient ni pixels ni défilement natif ; le nouveau parcours navigateur contrôle séparément le défilement réel et les commandes clavier visibles. Les fixtures de production possèdent explicitement leur outil : sa conservation n’est pas un achat simulé dans le navigateur. La passe préparatoire de 119 succès sur 122 reste enregistrée comme échec : les trois erreurs du suivi concernaient un pin documentaire périmé, rafraîchi ensuite.

La portée reste bornée aux parcours et fixtures déclarés : aucun achèvement global du Homeworld, réparation du fragment ou lien de lignée n’est déduit de ces contrôles. Les quatre nouveaux dessins de conversation concernent un archiviste et une orientation ; ils ne clôturent aucune des 354 cibles. Les tests historiques V110 utilisent la capsule privée `excel-history-v110-homeworld-v111` ; leurs 56 assertions restent distinctes des journaux de régression et de production r1.

```sh
node tests/homeworld-excel-followup-v111.test.mjs
node scripts/check-excel-history-homeworld-v111.mjs --check --tests
node scripts/build-homeworld-followup-v111.mjs
node scripts/build-homeworld-followup-v111.mjs --check
```

Pour les images historiques du recensement, le profil reproductible vérifie leur chemin et objet Git courant. Les octets présents sont contrôlés en plus par SHA256 et identité de blob ; les images absentes d’un checkout réduit ne sont pas assimilées à des absences du projet. Les sources de code et les nouveaux dessins admis demandent toujours les octets. Cette identité Git ne certifie aucun rendu ni aucune qualité artistique.

La vérification structurelle n’exécute pas Excel natif et ne certifie aucun parcours navigateur. Le registre `docs/v111-homeworld-source.json` conserve les besoins et les limites de chaque périmètre.
