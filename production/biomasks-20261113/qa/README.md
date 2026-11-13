# Vérifications des masques documentés

Le rapport navigateur porte sur le manifeste SHA256
`b254593a8990797045cf6863fecca798aa6be94159f661fad47dc5e52d709109`.

Huit contrôles passent dans Chromium : les treize PNG sont rendus, l'inventaire
contient 110 entrées, les filtres de type/priorité et la recherche fonctionnent,
les sources sont consultables au clavier, les fonds/pivots/bornes alpha sont
affichés et les écrans 320/390 px ne débordent pas. Aucun fichier image ne manque,
aucune exception de page ni écriture de stockage de jeu n'est observée.

Les trois têtes sans masque sont exclues de la génération ; elles ne sont pas
présentées comme des masques à inventer. Emissary reste sans candidat 3D, car sa
référence disponible est un pictogramme. La réussite technique de ces contrôles
ne certifie pas les couleurs originales PHG, les autres angles, les UV ou la
fidélité canonique 1:1.

Le vérificateur Python compare 3 863 cellules dans six feuilles et reconstruit
les sorties à l'identique. Il protège 284 fichiers antérieurs, dont 122 classeurs.
Le contrôle CI a été exercé dans un autre répertoire, avec les fichiers ImageGen
privés absents et les accès hors sélection interdits : 322 fichiers sélectionnés,
313 pins, moins de 512 MiB. La garde de l'arbre Git vérifie aussi qu'un fichier
public inattendu ne peut pas être masqué par la sélection sparse.

Pour reproduire la recette navigateur, démarrer un serveur statique depuis la
racine du dépôt :

```sh
python3 -m http.server 8783 --bind 127.0.0.1 --directory public
```

Puis, avec Node 22 et Chromium :

```sh
node production/biomasks-20261113/tools/qa-browser.mjs
```

`CHROMIUM_PATH` et `BIOMASK_QA_ORIGIN` permettent de préciser leurs emplacements.
Les captures sont des rendus de navigateur, pas de nouveaux sprites. Les revues
de formes et leurs réserves sont conservées séparément des validations humaines.
