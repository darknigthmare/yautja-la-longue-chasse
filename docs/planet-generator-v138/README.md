# V138 — Fidélité spatiale entre planisphère et globe

La qualité des textures ne prouve pas que la même position géographique correspond au même point sur deux projections. V138 ajoute un diagnostic basé sur la **transformation inverse du véritable shader V101/V131/V135**.

- `projectPlanetGeographyV138` transforme une longitude/latitude en position écran pour le planisphère et la face visible du globe. Elle refuse de déplacer les points de l'hémisphère caché vers la face avant, conserve l'antiméridien et ne crée pas de géographie secondaire.
- L'éditeur régional permet de choisir un **centre de région existant**, partagé entre carte et globe, et d'afficher le calque brut d'albédo sans météo ni couches de composition pour comparer les matières.
- Les comparaisons d'image sont des contrôles de **correspondance spatiale** : différences subpixel, filtrage GPU et frontières de texture ne constituent pas une certification pixel-à-pixel de l'univers Predator/AVP.
- Les réglages de diagnostic sont temporaires et n'altèrent ni les profils V134 enregistrés, ni les sauvegardes, ni le code canonique V115.

Tests : `tests/planet-projection-parity-v138.test.mjs` round-trip géodésique avec le moteur et cas d'antiméridien, de caméra et d'hémisphère caché ; QA Chromium vérifiant les calques brut/albédo, les positions et le changement de projection.
