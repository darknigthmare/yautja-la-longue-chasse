# V135 — océan régional préservé sur GPU WebGL1 à 8 samplers

Continuation de la PR #39. Une carte ou un globe peut désormais afficher les choix d'albédo liquide même lorsque le shader PBR V131 ne dispose pas des dix unités de texture nécessaires.

## Stratégie compatible

- **PBR V131** pour au moins 10 samplers et mémoire de texture suffisante ;
- **albédo côtier V135** pour huit samplers : six sources atmosphériques/sols/mers originales, masque catégoriel des régions et atlas des matériaux de côte. Le même masque géographique V131, la même portée en kilomètres, les mêmes dégradés et les mêmes recettes de texture sont utilisés ;
- **albédo terrestre V129** uniquement si même le budget d'albédo côtier manque ;
- **rendu natif** lorsque l'utilisateur n'a pas activé un profil visuel.

Ce mode évite l'écart précédent : le bouton « Albédo » ne doit pas supprimer les choix régionaux liquides, et un GPU mobile à huit samplers ne doit pas perdre leur information alors que leur shader économique est viable.

Le pipeline sélectionné est traçable dans les états de rendu, les captures navigateur et la QA ; aucun niveau de fidélité visuelle officielle 1:1 n'est prétendu. Les textures restent des études originales.
