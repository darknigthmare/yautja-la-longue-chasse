# Migration v0.2 → v0.3

La v0.3 utilise la clé `yautja.dlc.the-predator-2018.v3`. Au premier lancement, si aucune sauvegarde v3 n'est disponible mais qu'une progression v0.2 est trouvée, le runtime copie la campagne/scène/déblocages et positionne le checkpoint sur la première micro-zone de la scène correspondante.

La sauvegarde v0.2 source n'est pas supprimée. La migration est donc non destructive et permet de revenir à la candidate précédente si nécessaire.
