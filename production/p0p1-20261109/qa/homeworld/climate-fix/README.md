# Correction du climat lexical — 9 novembre 2026

La recette native de l’Atlas sur le build `TDA_a9vb2sdq4pe9FwXuE` a montré le Pont de Normandie classé comme milieu alpin. Le sélecteur trouvait le fragment `and` dans `Normandie` ou `Grand`. Il recherche maintenant `andes` ; le terme `col ` conserve l’interprétation alpine des vrais cols de montagne.

Deux nouveaux tests couvrent les noms Normandie, Grand Central et Grand Palais, puis les cols réels et les Andes. Ils conservent les coordonnées inconnues et les fiches historiques. Les deux tests, les cinq tests d’export et les sept tests géographiques réussissent sur le code corrigé : **14 réussites, zéro échec**. Les douze tests rejoués ne s’ajoutent pas une seconde fois au total précédent.

Les neuf contrôles navigateur précédents et leurs quatre captures restent conservés dans `native-exports/attempt-2` avec leur build et leurs sources d’origine. Une nouvelle recette doit qualifier le build qui contient cette correction ; aucun résultat du précédent essai n’est attribué rétroactivement au nouveau build. Cette correction lexicale ne certifie pas une météo, une altitude ou un lieu dont la position reste à vérifier.
