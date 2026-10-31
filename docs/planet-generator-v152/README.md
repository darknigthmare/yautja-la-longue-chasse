# V152 — carte de pentes et premières fiches de passages stratégiques

V150 produit une altitude RG16 sur chaque pixel réellement émergé du monde V115. V152 transforme cette source en **pentes de terrain en pourcentage**, physiquement calculées avec le rayon du globe : distance horizontale et verticale sphérique, correction du cosinus de latitude, longitude périodique, aucun faux voisinage au-delà des pôles.

## Sources et périmètres

- **Une seule altitude** V150 : aucun nouveau continent ni bassin créé. Les pixels non terrestres sont transparents sur la carte des pentes et exclus de tous les calculs de pente.
- Mesures robustes aux côtes : lorsqu'un pixel voisin est marin, la différence est calculée sur le côté encore terrestre, pour éviter une fausse falaise due au zéro de la mer.
- Quatre classes visuelles : plat (moins de 1 %), ondulé (1–3 %), pente forte (3–8 %) et relief extrême (8 % ou plus). Statistiques par **véritable région** et maximum de pente du globe ; données en dixièmes de pour cent pour les 512×256 ou autres résolutions V150.
- Les lignes de liaison de **la vraie carte de guerre V115** sont échantillonnées sur le même raster. Les rapports calculent le nombre d'échantillons terrestres/non terrestres, le maximum/moyenne des pentes et les dénivelés montants/descendants. Les liens de `kind:crossing` gardent systématiquement la classification « traversée de milieu ». Les échantillons marins à faible résolution ne requalifient **pas** une route légale en obstacle.
- Le panneau V150 possède un sélecteur « Altitudes / Pentes et passages » ; le calcul n'est pas répété lors du simple changement d'affichage. Exports séparés **PNG** des pentes et **JSON** des lignes stratégiques, et liste d'échantillons de routes.
- Le moteur n'est **pas** encore un calcul de collision par acteur, un système de marche sur pente locale, une limite de conduite des montures ou une réécriture des traversées. Rien n'altère les sauvegardes des guerres de clans.

## Validation
`tests/planet-terrain-slope-v152.test.mjs` couvre quatre classes et deux régions, le rayon en mètres, la couture antimeridienne, l'absence de pente sur l'eau et les liens réels V115 sans réécriture. `scripts/qa-planet-relief-v150.mjs` couvre désormais la carte de pente PNG et le rapport de route réel en Chrome, en plus du relief V150 précédent.

Ces mesures restent des **études spatiales de level design** ; elles ne prétendent pas constituer des altitudes canoniques 1:1 de Predator/AVP.
