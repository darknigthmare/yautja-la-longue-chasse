# V154 — premier exercice de déplacement jouable sur le terrain de la planète

Les V150–V153 produisent et exportent les altitudes et les classes de pente, mais aucun personnage ne pouvait se déplacer directement sur ces données. Cette version ajoute **un vrai outil interactif d'authoring cartographique** sans changer le moteur des missions ou la sauvegarde de guerre.

## Implantation

- Dans « Étudier les altitudes, côtes et montagnes », une fois les rasters V150/V152 calculés, le volet « Exercice interactif de franchissement des territoires » affiche une grille réelle **19 colonnes × 13 lignes**, issue du **même masque de terres sèches V124 et des mêmes valeurs RG16 V150**.
- Sélectionner l'un des vrais territoires V115 déplace la caméra d'échantillonnage vers ses coordonnées d'origine. Le point de départ est déplacé uniquement jusqu'à une cellule de terre réelle proche si la position géographique du repère est passée dans le pixel voisin du littoral. La longitude passe correctement l'antiméridien ; la latitude ne crée jamais de miroir au pôle.
- Les choix de mobilité s'appuient sur **six identifiants de vraies unités** du workbook V3 : `RTS-U01` binôme de patrouille ; `RTS-U02` pisteur solitaire ; `RTS-U07` chasseur mobile ; `RTS-U21` chariot blindé ; `RTS-U23` cavalier des traverses ; `RTS-U24` bête de portage. Les intitulés et contraintes textuelles viennent du workbook existant, mais les **pourcentages de pente et coûts de mouvement sont des règles de prototype originales** (pas des spécifications 1:1 officielles de Predator/AVP).
- Un clic sur une destination terrestre lance un **Dijkstra pondéré**, avec terrain non terrestre bloqué, pourcentage de pente maximale propre à l'unité et uniquement quatre voisins géographiques (aucun saut diagonal dans la mer). L'exercice mémorise le chemin puis permet de se déplacer **réellement d'une cellule à la fois** ou de franchir l'itinéraire en entier.
- Le changement d'unité ou de territoire réinitialise uniquement cet exercice ; le bouton « Réinitialiser » restaure la position. Un JSON indépendant exporte l'unité, l'effort, les cellules parcourues, la distance sphérique approximative et les limites des données.
- Les données restent sur le client. **Aucune ressource, ordre, territoire, déplacement de PNJ de la campagne, mission RTS V114 ou sauvegarde n'est lu ni écrit par ce laboratoire.**

## Limites honnêtes

Cette carte dérive du **planisphère global V150 de 512 × 256 pixels**. Une case peut donc représenter des dizaines de kilomètres. Le résultat prouve l'existence d'un exercice jouable à cette **échelle cartographique**, pas une collision animée à l'échelle d'un Yautja en vue 2D/3D. La jonction avec les véritables cartes locales et les transports requiert des maillages locaux, des ponts explicites et des tests d'IA/physique spécifiques.

Pas de franchissement d'océan par simple clic ; les véritables routes de traversée du jeu restent un système séparé. Les planètes non V115 sans métrique ne proposent pas cet exercice.

## QA

`tests/planet-traversal-exercise-v154.test.mjs` : parcours contigu, barrières de medium, cols/pentes 22 % qui changent réellement l'accès chariot/pisteur, antiméridien, pôles, identité de monde, refus de faux chemins et déterminisme des pas. `scripts/qa-planet-traversal-v154.mjs` : interface réelle, changement de territoire, selection d'un profil, destination, pas, obstacle, export JSON, reset et affichage mobile.

Le laboratoire n'est pas une certification de fidélité 1:1 ou de physique locale.
