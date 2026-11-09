# Suite P0/P1 et commandement — brouillon du 9 novembre 2026

Ce nouveau suivi prolonge le lot commité `697bd87a`. Il ne modifie ni ses
qualifications datées ni le classeur historique de treize feuilles. Le fichier
`qualification-courante.json` reste provisoirement à `readyForWorkbook: false` :
aucun classeur final n'est annoncé avant l'intégration des PR et les preuves du
code courant.

Le prochain export utilisera directement le classeur précédent, SHA256
`78e3de92a382bbd9d309cc1b4459a0c8e3216c0a7617efac9935458a918e7feb`,
et le helper d'append XML existant inchangé. Six feuilles sous l'espace de noms
`V202611092` s'ajouteront aux treize existantes ; les anciennes feuilles, tables
et chaînes partagées conserveront leurs octets. Seuls les quatre assemblages
XML et un suffixe des styles seront étendus.

La lecture finale doit inclure les nouveaux classeurs mobilité, reprise de
chasse, dépeçage/canopée et quêtes des PR 127, 131 et 132, ainsi que les avenants
de la bible. Les manifestes compagnons et DLC des PR 119 et 121 restent des
sources de production, sans création automatique de priorités P0/P1.

Le pilote compare les lignes explicitement P0/P1 de tous les XLSX intégrés,
sépare les copies exactes des anciennes lignes et demande une décision explicite
pour chaque nouvelle observation. Une observation peut compléter la source
d'un sujet existant, créer un nouveau critère priorisé, ou rester une déclaration
datée/de référence avec justification. Les nouvelles lignes ne sont jamais
clôturées par leur simple inventaire. Les demandes d'interface non priorisées
restent dans les livraisons, séparées du compte des sujets P0/P1.

Les trente qualifications de la passe précédente seront conservées comme
résultats antérieurs. Des reçus courants, épinglés par SHA256 et portées, sont
nécessaires pour déclarer une nouvelle phase réussie. Les phases logique,
navigateur, manette physique et art humain restent distinctes.

Commandes prévues depuis la racine, après fixation du commit intégré dans le
fichier de qualification :

```bash
python3 production/clan-war-command-20261109/tools/build-followup.py --inventory --source-commit COMMIT_INTEGRE
python3 production/clan-war-command-20261109/tools/build-followup.py --register
python3 production/clan-war-command-20261109/tools/build-followup.py --ready-check
python3 production/clan-war-command-20261109/tools/build-followup.py --build
python3 production/clan-war-command-20261109/tools/verify-followup.py --check
```

Les outils ne font aucun fetch, checkout, commit ou merge. Le vérificateur ne
lance aucun jeu, appareil physique, moteur Excel natif ni revue artistique.
