# V137 — Tickets P0 de sauvegarde et géométrie des sept biomasks

Cette révision traite la cause du décentrage visible des **sept coques V133** et empêche les palettes provisoires de sauvegarder un matériau biomask réservé à une autre classe.

Les 7 WebP 256 × 384 ont une silhouette alpha mesurée vers x=118–119, y=57–58, alors que le repère de masque historique est autour de x=147, y=60. Le moteur déplace le calque complet de +28 à +29 px (et +2/+3 px verticalement) **sans modifier l'image**, le masque alpha, les decals ou les couleurs.

La sauvegarde calcule d'abord le propriétaire Alpha/Samurai depuis la campagne durable, puis valide le matériau sur le biomask effectivement sélectionné. Les tests V137 couvrent les sept SHA-256, les quatre cas de droits, l'usurpation, dix familles de valeurs malveillantes et les données legacy remises explicitement à zéro.

**Attention** : la validation géométrique automatique ne suffit pas à fermer les sept P0 biomasks. Les six morphologies × trois angles, collisions face/dreads et poses restent à observer et à documenter dans l'Excel. La fidélité PHG 1:1 n'est pas certifiée.
