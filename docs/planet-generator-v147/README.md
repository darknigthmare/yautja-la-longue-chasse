# V147 — Terre réelle de référence, séparée des mondes extraterrestres

Source originale : **Natural Earth**, `ne_110m_land.geojson` du dépôt public https://github.com/nvkelso/natural-earth-vector, SHA blob Git `04811d72fff2701ec67587e30ad8942675b511e3`, statut **public domain**, édition à l'échelle **1:110 000 000**. Les 127 polygones (128 anneaux, 5 143 sommets) sont conservés comme source de carte entière, sans coordonnées fictives ou places ajoutées.

## Pourquoi un atlas séparé ?

La V115 génère d'excellentes formes de planètes fictives, mais ce n'est pas une carte terrestre canonique : leur maillage procédural ne doit jamais être renommé « Los Angeles », « Great Plains » ou « Groenland » au seul motif qu'une latitude se ressemble. V147 ajoute donc une **référence Terre distincte**, contrôlable en planisphère et en globe, dont les mêmes points géographiques suivent l'inversion du vrai moteur V101.

La référence ne crée aucun nouveau front et ne modifie aucune sauvegarde, ressource, code V102/V103/V115, frontière procédurale, biome ou région militaire.

## La limite essentielle de fidélité

**Natural Earth 110m est une simplification cartographique : ce n'est pas une Terre 1:1 aux routes, bâtiments, lacs, altitudes et lignes de côte fines exacts**. C'est une première couche mondiale géographiquement correcte à l'échelle du globe. Pour le 1:1 réel demandé à terme, il faudra une source 10m détaillée, des données topographiques/urbaines/licences compatibles et, séparément, des coordonnées de lieux de fiction vérifiées par film/scène. Les lieux de tournage terrestres ne doivent jamais être confondus avec les lieux fictifs de l'histoire.

Le mode Terre est un **modèle de consultation**, pas un biome Predator/AVP officiellement certifié. Les tests couvrent des coordonnées terrestres réelles et des points océaniques vides, ainsi que le nombre exact de géométries de la source.

Sources de droits :
- https://www.naturalearthdata.com/about/terms-of-use/
- https://www.naturalearthdata.com/downloads/
- https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_land.geojson
