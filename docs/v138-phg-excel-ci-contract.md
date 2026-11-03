# V138 — Garde d’intégrité des Excel V137 et régression TypeScript

## Correctif de compilation

Le job « TypeScript and lint on the complete game source » du commit `4fe97231` échouait sur TS2322 dans `hunterChromaticPersistenceV116.ts`, après la protection V137 du biomask. L'objet `candidateAppearance` était inféré avec `presetId: string` au lieu de `HunterPresetId`.

Le correctif `446d415` typait explicitement la sauvegarde candidate avec `SaveGame["appearance"]`, sans changer les données persistées ni autoriser un preset inventé. Les contrôles TypeScript/lint sont revenus au vert sur ce commit.

## Garde de production ajouté

`scripts/verify-phg-production-xlsx-v138.py` contrôle **en lecture seule** les quatre Excel V137, le ZIP complet et `Yautja_PHG_V137_MANIFEST.json` :

- SHA-256 exact et nombre d'octets pour les cinq fichiers ;
- présence du vrai contenu XLSX, absence d'archive interne corrompue et seuil minimal d'onglets ;
- absence de cellules d'erreur `#REF!`, `#DIV/0!`, `#VALUE!`, `#NAME?`, `#N/A`, `#NUM!` mises en cache ;
- 389 tickets distincts dans `Backlog_Master`, les trois IDs techniques clôturés et le compte 386 ouverts ;
- fichiers XLSX du ZIP identiques aux quatre fichiers distribués.

Les tests `tests/test_phg_workbooks_v138.py` et le workflow `phg-production-excel-v138.yml` empêchent une perte silencieuse de fichiers ou de lignes. Une erreur fait échouer la CI ; **aucun faux certificat de fidélité PHG** n'est créé.

### Ce qui reste ouvert

La complétude du fichier Excel est une garantie d'inventaire, pas une validation de chaque texture en jeu. Les 34 dossiers de fidélité restent non certifiés, les six morphologies × trois angles demandent des images de QA, et l'installation des 156 ressources V120 ne peut pas être confondue avec un catalogue jouable. Les tests navigateur doivent être vérifiés séparément avant fusion.
