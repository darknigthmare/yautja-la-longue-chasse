# Migration v0.4 → v0.5

La v0.5 utilise `yautja.dlc.the-predator-2018.v5`. Au premier démarrage, si aucune sauvegarde v5 n’existe, le runtime cherche une sauvegarde v4, puis v3, puis v2.

La migration conserve lorsque possible : campagne, scène, micro-zone, santé, records/grades, honneurs, difficultés et progression. Les nouveaux champs reçoivent des valeurs sûres : cohésion 100 par défaut, momentum 0, ordre `follow`, phase de zone initiale et registre miroir migré.

La sauvegarde source n’est pas supprimée automatiquement. Le runtime émet un événement `migration` pour permettre au conteneur hôte de journaliser l’opération.

Les cinq slots natifs de La Longue Chasse ne sont ni lus ni modifiés.
