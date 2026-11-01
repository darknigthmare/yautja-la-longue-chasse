# V153 — carte des pentes et réseau de routes dans le ZIP complet

Les études des pentes V152 sont issues de l'altitude V150 calculée sur le **masque réel V124**. La version V153 complète le **ZIP V151 déjà existant** sans modifier le format de sauvegarde, l'identité de la planète ou les données de guerre.

- Nouveau calque indépendant `terrain-slope-v152-map.png` (512×256), accessible aussi par le sélecteur de calques ; les milieux entre les continents et les bassins intérieurs conservent alpha 0.
- Nouveau `terrain-routes-v152.json` : chaque liaison de guerre possède sa distance en km, échantillons terrestres/non terrestres, pente moyenne/maximale, dénivelé, et classification indicative. Le rapport indique les vraies routes balisées de franchissement de milieu au lieu de les déclarer artificiellement impraticables.
- `supplementaryStudiesV151.terrainV153` décrit ces deux nouveaux fichiers tout en laissant le manifeste principal en `version:124` et son auteur V151 intact.
- Le cache LRU est limité à deux mondes pour réutiliser l'altitude RG16 entre les deux cartes et les rapports. Le code ZIP32 V151 reste borné à 24 fichiers et 64 Mio.
- V102 et V103 sans rayon ne produisent toujours **aucune** altitude ou pente en mètres inventée.

**Attention :** les classes de pente sont une analyse de level design **à l'échelle cartographique de 512 px**, pas un contrôle exact de pente d'une rue. Les règles de progression militaire, collisions locales, pénalités des montures, hydrologie et route finder du jeu demeurent inchangés.

QA Chromium : ouvre l'archive produite par le vrai bouton « Télécharger tous les calques », vérifie la présence du PNG et du JSON, l'identité du monde et la cohérence des échantillons avec les routes réelles. Les unités locales sont expliquées dans `docs/planet-generator-v152/README.md`.
