# Machiko Noguchi · V28

Machiko reste **humaine adulte**. Deux variantes visuelles distinctes sont conservées : **Ryushi** et **armure de clan**. Elles ne se remplacent pas dans la couverture d'animations.

- **Ryushi — garde au fusil** : 6 poses, référence Prime 1 UPMAVP-01 inspirée de la couverture AVP #4. La séquence se lit surtout comme lever/viser/encaisser/abaisser ; elle n'est pas approuvée comme parade haute de mêlée.
- **Armure de clan — coup reçu/récupération** : 6 poses, tenue NECA Series 18 dérivée des comics et dessin Dark Horse de son emballage. Visage humain visible ; lames rétractées dans le résultat corrigé.
- **Essai clan rejeté** : lames inversées, conservé uniquement pour la provenance. Il ne compte pas dans les 12 poses candidates.

Les trois PNG sont les octets réels retournés par OpenAI intégré. Les deux feuilles retenues sont destinées à la revue, **aucun clip validé en jeu**. Aucun runtime ni manifeste partagé modifié.

Le fond magenta est opaque et légèrement variable : détourage et recalage requis. Les silhouettes sont plus grandes que demandé, mais les cadres proposés incluent tous les pixels mesurés aux trois seuils. Aucun redimensionnement pose par pose. Les timings, raccords, appuis, mains fines et fidélité exacte restent à vérifier en lecture.

Les sources et limites de fidélité figurent dans `references.json`. La chaîne complète des trois générations, les défauts et la seconde lecture indépendante figurent dans `production-notes.json`. Les **12 cadres et pivots** sont dans `registration.json`.

Mesures reproductibles depuis la racine du dépôt :

```powershell
node art-source/v28/known-hunters/characters/machiko/measure-registration.mjs
```

Cette commande lit les PNG, vérifie leurs empreintes avant/après et écrit seulement `registration.json` dans ce dossier. Les seuils servent à mesurer ; aucun pixel source n'est retouché.

Références : [trilogie de l'éditeur Dark Horse](https://digital.darkhorse.com/books/9bb496a44e944fcda26662b44db247be/aliens-vs-predator-the-essential-comics-volume-1), [variante Ryushi Prime 1](https://www.prime1studio.com/avpc-machiko-and-broken-tusk-predator/UPMAVP-01.html), [Machiko de clan NECA Series 18](https://necaonline.com/2017/06/predator-7-scale-action-figures-series-18-assortment/). Les figurines sont des interprétations licenciées, pas une certification de chaque détail d'une case intérieure. Aucun mélange avec Hot Toys She-Predator.
