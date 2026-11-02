# Forge active : natifs existants et raccord candidat

`target-v81-63-141` ne manque pas de toute image animable : six vraies flammes natives Pit V33 existent, sont référencées dans le registre Pit et bouclent déjà à 8 images/s. Aucun consommateur Homeworld ni animation CSS de forge n’a été trouvé dans le renderer actif. Réemployer ces six bruts est prioritaire avant toute nouvelle génération ; aucune image Forge n’a été générée.

Le vrai bâtiment `deep-forge` à `(3080,2898.5)`, niveau `0`, utilise la cellule V72 `(0,512,520,512)`. Le PNG V64 est historique. Le poste V78 est présent mais non monté (parcelle de façade réservée). Les deux placements V83 sont refusés, tandis que le même établi V83 est monté par V92 en bas-quartiers. Ces distinctions viennent des vrais providers évalués en mémoire, pas d’un parcours navigateur.

Le composant candidat dans l’arbre isolé place les six images entières, sans retouche et à échelle uniforme, sous le masque du foyer avant-gauche de la cellule V72. Les coordonnées et les pivots sont dans le JSON. Il hérite du parent sa projection, sa profondeur et son opacité, utilise les secondes déjà suspendues de la ville, garde la première image en mouvement réduit et exige aussi le décodage de la façade, puis conserve le foyer statique sur échec d’une flamme. Le propriétaire Homeworld garde seul le hook dans le renderer partagé.

Cinq tests ciblés, ESLint et le typecheck complet passent. Sept contrôles de contexte sur le port 3105 et onze captures ouvertes qualifient le réemploi en développement ; les limites et sources exactes sont dans `forge-context-review.json`. Les six PNG ont été matérialisés dans l’arbre isolé avec SHA256 source/destination identiques ; le manifeste adjacent les liste. Tous les statuts restent candidats non admis, sans clôture artistique humaine ni clôture source globale.

Deux nouveaux atlas natifs de quatre images (flamme de foyer, puis fumée de cheminée) ne seraient utiles qu’après refus visuel du réemploi. Leurs grilles, états et contrats proposés figurent dans le JSON ; aucun lancement n’est demandé ou effectué à ce stade.
