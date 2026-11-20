# Migration v0.3 → v0.4

Clé source : `yautja.dlc.the-predator-2018.v3`  
Clé cible : `yautja.dlc.the-predator-2018.v4`

La migration est exécutée seulement si la clé v4 est absente.

Sont conservés :
- campagne et séquence déverrouillées ;
- scène / micro-zone du checkpoint ;
- PV, énergie et munitions ;
- honneurs ;
- indices ;
- records de scène déjà présents.

Nouveau champ de checkpoint :
- `armor` pour l’Upgrade Predator.

Compatibilité supplémentaire : si aucune v3 n’existe mais qu’une v2 est encore présente, le runtime peut toujours migrer directement vers v4.

La clé source n’est pas supprimée automatiquement.
