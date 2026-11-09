# Première tentative native — observation audio à corriger

Le jeu de production `TDA_a9vb2sdq4pe9FwXuE` a exécuté 24 contrôles réussis.
Le contrôle du mute a ensuite expiré : la recette cherchait le gain maître
relié directement à la sortie, alors que `GameAudio` le raccorde au limiteur
natif avant la sortie. Le tableau d’observation était donc vide.

Cet échec de recette ne qualifie pas le mute et ne démontre pas une panne du jeu.
Le correctif concerne uniquement l’observateur du script ; aucun fichier de jeu
ni build n’a été modifié pour la reprise. Les résultats, captures et octets du
rapport de cette tentative restent conservés. La tentative 2 rejoue tout le
parcours sur le même build avec le détecteur du limiteur corrigé.

Aucun parcours de chasse terrain, manette physique ou revue artistique humaine
n’est validé par cette tentative.
