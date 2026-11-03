# V76 — opacité native des façades

Les six PNG orientés restent byte-identiques : ni retouche, ni recadrage exporté,
ni redimensionnement. `scripts/measure-homeworld-opacity-v76.mjs --write` ajoute
uniquement `art.opaqueRowsV76` et `measurement.opaqueAlphaThresholdV76=24` au
manifeste. Sans option, ou avec `--check`, le script vérifie les données sans les
réécrire. Le seuil historique `measurement.alphaThreshold=200`, les SHA256,
les fondations, jambages, pivots et volumes physiques restent inchangés.

Chaque rangée conserve toutes les plages réellement peintes : paires de pixels
`[début inclus, fin exclue]`, trous transparents compris. Les coordonnées sont
locales à `sourceRect` quand une cellule existe. Les six sources comportent
6 144 rangées et 7 925 plages ; la comparaison directe couvre 9 437 184 pixels.
Le seuil 24 inclut les pixels visibles et les ombres contrastées ; il ne sert
pas à mesurer une fondation ou à modifier une collision.

`homeworldBuildingCoversPaintV76(building, worldPoint, body?)` applique la
projection au sol une seule fois, puis l'échelle uniforme du bitmap. Par défaut
il teste le pixel aux pieds ; avec `{halfWidth,height}`, il teste le rectangle
vertical du corps, la hauteur restant non comprimée. Les pixels hors de la
cellule sont ignorés. Sans plages natives, le rectangle `alphaBounds` historique
reste disponible. Le helper ne lit aucun canvas ou DOM, ne conserve aucun
bitmap décodé et n'agit sur aucune sauvegarde ni autorisation.

L'intégration root utilise les pixels du corps pour atténuer une façade devant
le héros et les pixels aux pieds pour filtrer un habitant réellement caché.
La ligne avant oblique fournit toujours le classement en profondeur.

Régression réelle : `resident-v69-convoy-works-1` est sélectionnable aux secondes
0 et 60. Ses pieds ne touchent aucun pixel de l'atelier ; le faux masquage venait
de son grand rectangle transparent. Un point sous la peinture opaque de la même
façade reste masqué. Le test vérifie aussi le corps complet dans le coin source
`(1477.5,179.5)`, les limites d'une cellule provenant du vrai PNG, tous les pixels
des six sources, et les comportements historiques sans masque.

Vérifications ciblées : 32/32 tests (opacité, architecture V76, géométrie oblique,
vie V69), ESLint des quatre fichiers source/test concernés exit 0,
`tsc --noEmit --incremental false` exit 0, contrôle de métrologie `--check` exit 0.
Ces preuves sont des tests modèle/pixels ; elles ne remplacent pas les captures
du build final ni le parcours public, gérés séparément par root.
