# Jungle Hunter — complément V34 et correction accroupie

9 nouvelles sources OpenAI conservées, dont 3 retenues : réaction aux coups, marche réparée dans la seule vue gauche et correction ciblée du squat. Cela ajoute 18 dessins et 5 clips orientés. Avec les 8 clips V32 conservés, Jungle Hunter possède maintenant 13 clips moteur ; ce nombre ne signifie pas 13 familles complètes.

Les anciennes pages idle/light, leurs rectangles, pivots, durées et réglages restent exactement identiques. Leur empreinte de données est vérifiée par `tests/pit-jungle-v34.test.mjs`. Les styles de dessin varient entre les vagues V32 et V34 ; les références V5 du projet ne sont pas une certification cinéma 1:1.

La réaction aux coups contient impact, recul accentué, reprise et retour neutre, dans les deux orientations. La marche gauche possède deux contacts opposés et deux passages ; les pieds de la vue droite gardent le même appui, cette vue est donc rejetée sans miroir moteur. L’accroupissement initial plaçait un genou au sol : la correction de la colonne3 remet deux pieds plantés et des tibias verticaux. Les trois premiers dessins servent à l’entrée puis à la pose basse tenue. Le quatrième dessin de relevé n’est pas intégré. Échelle uniforme, aucune déformation.

36 captures du vrai loader/renderer sur fonds clair et sombre : frames et cadences exactes, aucune frontière coupée ni erreur. Clé magenta64 déclarée ; son écart avec64 contre48 ne supprime que des pixels proches du fond. Au maximum11 pixels de frange résiduels dans une capture native, sans halo opaque large constaté.

6 contrôles dans PitCanvas ont passé : squat droite/gauche, réaction aux coups infligés par l’adversaire réel droite/gauche, marche gauche avec quatre dessins et pose idle tenue pour la marche droite absente. Aucun changement des mécaniques ou noms hérités des attaques medium/heavy/technique.

Restent explicitement manquants : marche droite et recul, garde, medium, heavy aligné sur la mécanique existante, saut/réception, technique, relevé dédié et autres états. La feuille heavy reste en revue : son heurt d’épaule ne correspond pas à l’attaque verticale actuelle. Saut/réception et réparation de garde ont été refusés par le fournisseur, sans image produite ni relance.

Provenance et contrôles : `art-source/v34/pit/jungle-hunter/jungle-hunter-production-provenance-v34.json` et `jungle-hunter-runtime-qa-v34.json`. Cette correction est postérieure à la première compilation V35 ; une compilation finale doit l’inclure avant publication.
