# Relevés lisibles et carte K-17 — V110

La carte conserve son cadrage local du quai, mais signale désormais au bord une pièce réellement portée ou posée hors de ce cadrage. La liste sous le dessin conserve ses vraies coordonnées et son état. La projection d’un marqueur ne déplace aucun objet, acteur ou repère Atlas.

Les lieux de découverte apparaissent après observation réelle. Leur relevé copié reste une information distincte. Une pièce déplacée montre donc son lieu initial observé et sa position actuelle, au lieu du seul texte « Lieu copié ». Les lieux viennent des positions originales épinglées de la définition K-17 : V109 exige déjà observation et copie avant tout déplacement. Cette lecture ne rajoute aucun fait au reçu sauvegardé.

Le carnet « Voir les pièces et leurs lieux » donne accès à la carte, aux relevés, au dernier point confirmé et à la marche mesurée, y compris après interruption. L’acteur est dessiné dans le même espace extérieur de l’étage 0. Une position d’un autre étage ou d’un intérieur n’est pas projetée sur le quai. Le fragment candidat reste masqué jusqu’à la reprise effective qui le rend disponible.

Le rodage navigateur a montré que le carnet ouvert prenait toute la hauteur du conteneur flex et écrasait le terrain jusqu’à zéro pixel. Sa hauteur est désormais bornée avec défilement propre : ouvrir les relevés ne retire plus la surface jouable. La carte utilise une largeur et un rapport de dimensions adaptés au carnet ou au dialogue ; ses légendes ne sont plus réduites à quelques pixels au centre d’un grand rectangle vide. La recette vérifie aussi la hauteur du terrain et une vraie marche clavier avec le carnet ouvert, sur ordinateur et sur mobile.

Les textes des trois études distinguent les dossiers scellés A/B, le contenant C et les pièces K-17. Les limites anciennes sont reformulées autour des objets réellement concernés, sans annoncer que la plaque et l’empreinte sont absentes du Homeworld entier. Les registres, le contenu des contenants et les résultats restent séparés.

La scène source ROLE03 reste `Scènes de dialogue V6!383`, `Choix et actions V6!788–789` et `Répliques V6!3183–3190`. Elle demande une preuve située et une incertitude conservée ; elle ne promet ni réparation, ni auteur de l’empreinte, ni lignée, ni récompense. Aucun nouveau dessin ou geste BODY n’est produit dans ce lot. La continuation volontaire B→A reste une extension distincte non livrée ici.

Sept tests ciblés vérifient notamment un véritable trajet de portage puis de pose vers 7380,5350, hors de la carte K-17 ; la distinction provenance/emplacement ; l’absence de mutation des reçus ; le fragment non révélé ; les deux branches achevées ; les autres étages ; et les trois interfaces d’archives. Avec les trois suites V106/V107/V109 d’archives : 37 tests passent.

```sh
node --experimental-strip-types --test --test-reporter=spec --test-concurrency=1 \
  tests/homeworld-archive-record-v110.test.mjs \
  tests/homeworld-archive-plaque-v109.test.mjs \
  tests/homeworld-archive-v106.test.mjs \
  tests/homeworld-archive-comparison-v107.test.mjs
```

Ces tests utilisent le vrai modèle de marche/portage et le rendu React serveur. Ils ne constituent pas une inspection visuelle du navigateur ni un certificat de build de production.
