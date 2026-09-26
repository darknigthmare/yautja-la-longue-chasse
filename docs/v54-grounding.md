# V54 — Contact visuel au sol

Le contrôle alpha lit les 410 apparences fournies et les 723 cellules déclarées des animations, sans changer les images. L'écart maximal des planches fixes est de 0,50 unité à une hauteur de personnage de 185 ; l'écart de frange des pas chassés atteint environ 1,59 unité. Les 26 tuiles de sol distinctes commencent toutes par une rangée suffisamment opaque. Il ne serait donc pas justifié de déplacer globalement le sol, les collisions ou tous les combattants.

Le rendu mesure une seule fois par cellule le bord opaque de support, en ignorant les pixels isolés et les franges alpha inférieures à 128. Une marge inférieure ou égale à 2 % de la hauteur de cellule peut être compensée à l'affichage ; un dessin volontairement relevé conserve son pivot. La mesure utilise le bord inférieur du pixel, compatible avec les pivots `bottom + 1` du registre. Une lecture impossible conserve l'origine d'auteur. Aucun pixel source, état du duel, hitbox, replay ou horloge n'est modifié.

L'ombre reprend la largeur et le centre du support du dessin réellement choisi : clip natif, pose tenue ou apparence fixe exacte. Elle reste sur le sol quand le personnage saute, puis se resserre et s'éclaircit avec l'altitude. Une ombre de contact mince lie les pieds au support pendant les phases au sol. La présentation de round garde son ancrage scénique même après un KO aérien. Le marqueur cosmétique du joueur reste distinct.

Contrôles : `tests/sprite-contact-v54.test.mjs`, suites bitmap et spritesheets, audits `scripts/audit-pit-grounding-v54.py` et `scripts/audit-pit-frame-support-v54.mjs`. La recette `scripts/verify-pit-grounding-v54.mjs` observe passivement les véritables dessins Canvas pendant des déplacements clavier : trois rencontres, deux orientations natives, entrée/marche/retour à l'arrêt, contrôle de l'alpha sur le sol et sauvegardes inchangées. Le rapport réel indique si cette recette a réussi ; sa présence seule n'est pas une validation.

Ce correctif ne produit aucun nouveau dessin de combattant et ne clôture pas les movesets manquants. La cohérence des ombres et supports de la jeunesse est documentée séparément dans `v54-youth-visual-audit.md`.
