# V139 — Parité des decals entre le rendu CSS et le Canvas de chasse

Le bug provenait de `DecalSurfaceV133` : `mask-position` en pourcentage ne déplace **pas** une image quand sa taille est 100 % de l'élément. Les sept biomasks concepts V133 sont pourtant décalés horizontalement par le positionnement V137 (bitmap de 256×384 translaté), et les têtes V62 disposent de sources **compactes** à positionner dans le rig.

- Nouveau contrat pur `decalProjectionV139(zone,placement)` dans `yautjaDecalsV133.ts` : **on positionne le rectangle propriétaire**, puis la case de decal relativement à celui-ci. Les deux recomposent exactement les mêmes coordonnées globales (x/y/w/h) que le Canvas 256×384.
- CSS : `DecalSurfaceV133` utilise désormais un `span` propriétaire avec `mask-size:100% 100%`, et une tuile indépendante calculée par projection. Son ordre de rendu (source alpha et opacité 0,82) reproduit le `source-atop` du Canvas au lieu du mélange `screen` divergent.
- Rendu image : aucune couleur, aucun identifiant ni atlas binaire modifié. Les anciennes sauvegardes V113–V138 sont compatibles.
- `tests/decal-placement-parity-v139.test.mjs` couvre **6 morphologies × tête compacte**, **7 biomasks V137 translatés** et **4 canaux** sous coordonnées compactes/complètes/translation ; teste également la cohérence entre CSS et Canvas.
- Source artistique : les 48 decals restent des créations originales **non certifiées PHG 1:1**. Cette correction garantit l'alignement mathématique, pas la fidélité visuelle officielle.
