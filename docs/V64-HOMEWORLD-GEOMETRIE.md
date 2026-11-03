# Homeworld V64 — géométrie, accès et codex

La cité utilise désormais un plan au sol de **6 300 × 5 300 unités**, projeté par une caméra orthographique à 35°, sans mélanger une isométrie à 45° et des façades frontales. La convention de travail est 100 unités pour un adulte d’environ 2,3 m. Les hauteurs verticales ne sont pas comprimées avec le sol ; les images gardent leur rapport de proportions.

## Périmètre livré par ce lot

- Les 19 bâtiments civiques et 14 quartiers gardent leurs identifiants. Les 24 maisons ajoutées utilisent 8 fois chacune des 3 familles résidentielles. Les 43 bâtiments ont une pièce correspondante dans le module d’intérieurs, maintenu séparément.
- Les 26 identifiants d’interaction sont préservés. Quinze interactions, dont les 12 habitants, sont maintenant intérieures. Dix bornes régionales et le terminal orbital restent dehors. Il n’existe plus de double interaction ou de collision des habitants à leurs anciennes positions extérieures.
- Les 26 props extérieurs utilisent les cellules du nouvel atlas ; leurs pivots avant et leurs empreintes au sol déterminent simultanément leur rendu, leur collision et leur fiche. Les 27 anciens props et leurs images restent conservés comme patrimoine, sans collision invisible dans le nouveau rendu.
- Une réservation de pad de 1000 ×760 est séparée de la voie piétonne. La navette logistique originale possède un volume 540 ×380. Le grand vaisseau sélectionné reste en orbite. L’apparition 1280/4480 et le terminal 1280/4400 sont hors du pad et hors de la coque.
- Le codex énumère les quartiers, rues,43 bâtiments,43 seuils extérieurs,43 sorties,43 pièces,26 points d’interaction,12 habitants, les props et les éléments du spatioport. Il indique aussi 8 emplacements muraux dynamiques : ce ne sont pas 8 trophées attribués au joueur.

## Contrat de placement

`homeworldGeometryV64.ts` applique `(x, y×sin 35°−z)`. Les coordonnées de simulation restent des coordonnées au sol. Le même intégrateur sert aux pièces et aux rues, avec un point de récupération propre à l’espace courant. Une donnée de position intérieure invalide ne renvoie pas le personnage au port. La pause à zéro seconde ne déplace pas l’acteur.

Un bâtiment est mis à l’échelle uniformément depuis sa largeur de fondation mesurée. Le seuil peint dans le PNG se superpose au seuil logique. Le dégagement de porte utilise un rectangle inscrit dans l’ouverture, sans compter les jambages ni les biseaux. Les cinq familles ont été inspectées indépendamment ; le rectangle de la maison C a été resserré à 85,52 ×152,71 unités utiles après exclusion du linteau.

Le bâtiment est solide au nord du seuil. Un éventuel retrait entre le seuil et les pieds latéraux autorise seulement le couloir central devant la façade. L’interaction exige un personnage sur le sol praticable, côté sud et dans la largeur utile ; être derrière le bâtiment ou près d’un mur latéral n’ouvre pas une pièce.

Les empreintes des props indépendants commencent à `y−profondeur` et finissent au pivot avant `y`. Les dimensions de collision ne sont jamais déduites de la hauteur peinte, qui contient aussi une part de profondeur projetée. Les stations sans habitant utilisent leur propre volume, distinct du point d’interaction.

## Vérifications

Le rapport exécutable `scripts/audit-homeworld-geometry-v64.mjs` contrôle 43 empreintes sans chevauchement et 54 destinations : 43 portes, 10 approches de borne et 1 approche de terminal. Les chemins calculés utilisent la collision réelle, une grille 32 unités et des segments échantillonnés tous les 4 unités, avec une marge 12 unités hors des extrémités. Les 54 chemins sont ensuite parcourus avec le vrai intégrateur de déplacement digital 60 fps, sans téléportation. Le rapport comporte les empreintes, les routes, les ticks et les SHA des sources, vérifiés identiques avant et après l’audit.

Les 43 tests possédés par ce lot couvrent le modèle, le codex, la navigation, les anciens PNG conservés, les sauvegardes, les conditions narratives et la récupération de position. Les tests de rendu/intérieurs/input/visites et les recettes dans le navigateur sont distincts, maintenus par le lot d’intégration. Leur résultat final ne doit pas être déduit de ce seul document.

## Fidélité et limites

Les formes et matériaux s’appuient sur les références indiquées dans le codex, notamment l’entretien des réalisateurs d’AVPR et les concepts Homestead publiés par Alex Nice. Cela ne rend pas canoniques les plans de cette cité, ses maisons ou ses institutions. Le lot est une adaptation originale et ne revendique pas une reproduction 1:1 de Yautja Prime.

Les 43 intérieurs réutilisent des plans et des éléments communs ; ils ne représentent pas 43 kits d’art uniques. La refonte n’achève pas les régions extérieures ni les actes narratifs encore indiqués à produire. Les positions du personnage n’étaient pas persistées dans `HomeworldProgress` : aucune migration de coordonnées enregistrées n’est nécessaire, mais les identifiants et la progression existants sont conservés.

L’art est natif, mesuré en 2D. Les empreintes physiques et les hauteurs de props sont des estimations explicites de jeu ; ce ne sont pas des maillages 3D ni des dimensions canoniques officielles. Le pad peint 1000 ×719,697 est centré dans sa réservation 1000 ×760 sans étirer son raster.

## Inventaire des éléments architecturaux

Le codex comporte maintenant **723 fiches**, dont **43 sols et 286 panneaux** recensés séparément. Le helper partagé `homeworldInteriorShellV64` produit les mêmes instances pour le rendu et le codex : 134 panneaux civiques et 152 domestiques. Les derniers modules sont masqués à la limite des pièces, sans étirement. Les clips et les pivots des captures déjà relues sont conservés. La bordure logique des pièces garde la collision ; aucun obstacle supplémentaire n’est créé par ce recensement.
