# Vérifications de l'addendum

La recette porte sur le manifeste SHA256
`d9a2e23591c948e08e484a82965e74868f9a473fedffc2176509e8bbc4572dcf`.

`browser/verification.json` consigne six contrôles réussis dans Chromium
154.0.8037.57 : quatre composants et trois comparaisons rendus, libellés des
sources, visibilité/opacité/placement des couches, réinitialisation au clavier,
filtres et métadonnées, écrans de 320/390 pixels, absence d'erreurs et de stockage
de jeu écrit. Les captures proviennent uniquement du navigateur et ne sont pas
de nouveaux sprites.

Depuis la racine du dépôt, démarrer un serveur statique dans un terminal :

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory public
```

Puis, avec Node 22 et Chromium disponibles :

```sh
node production/p0-fidelity-20261113/tools/qa-browser.mjs
```

`CHROMIUM_PATH` peut fournir le chemin du navigateur ;
`P0_SPRITE_QA_ORIGIN` peut changer l'origine du serveur local.

Les trois vérificateurs Python des deux lots passent séparément : pixels natifs,
SHA, politiques alpha distinctes, sorties déterministes et cellules des classeurs.
L'addendum comporte cinq feuilles et 1 286 cellules ; 216 fichiers antérieurs
restent inchangés. Le workflow ciblé vérifie ces fichiers sans prétendre effectuer
la recette navigateur ou une revue artistique.

La réussite technique du lot de revue ne termine pas les cibles source. Les
effets d'eau, brume et rayon de HWA160-010 restent rejetés/non livrés ; la source
est tronquée et partiellement occultée. L'émission052 reste plus dense que la
source, et les détails internes d'une optique éteinte ne sont pas connus. Les
images restent candidates, sans certification 1:1 ni intégration en jeu.
