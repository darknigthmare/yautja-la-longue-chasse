# V145 — Aléatoire du kit des matières régionales V128/V130

Le générateur V144 mélange les **paramètres de création de planète** ; le kit V128 choisit ensuite les matières propres à chaque région d'une planète déjà générée. Jusqu'ici, ce kit n'avait aucun bouton de tirage aléatoire. V145 complète la même PR #39 avec une deuxième échelle de contrôle sans confusion des formats.

## Six actions
- **Tout aléatoire · toutes les régions** : un matériau de sol et, seulement s'il existe, un milieu compatible pour chaque région.
- **Aléatoire · région sélectionnée** : les deux matières de cette seule région.
- **Tous les sols au hasard** : une matière terrestre compatible par région, sans toucher aux mers.
- **Tous les milieux au hasard** : variantes côtières/bassins possibles, sans toucher aux sols.
- **Sol de cette région au hasard** et **Milieu de cette région au hasard** : tirages individuels.

Chaque région possède deux verrous **Conserver** (sol/milieu) qui protègent ses choix des six types de tirage. Les sélecteurs manuels restent modifiables volontairement même si un verrou est coché, comme dans V144. Les verrous sont temporaires et ne modifient pas les fichiers V128/V134.

## Cohérence environnementale garantie

La source reste `compatibleLandMaterialsV128` / `compatibleSurfaceMaterialsV128`, avec les 48 matières V125/V130 originales et les contraintes déjà mises en place pour les biomes. Un tirage du milieu ne transforme **jamais** les océans de sable, spores, cristal, brume ou rayonnement en lacs d'eau inventés : sur ces mondes, aucune matière liquide complémentaire n'est éligible.

Le moteur `randomizeRegionalMaterialKitV145` est pur, stable à entropie donnée, vérifie le kit source et revalide entièrement la sortie en utilisant `validPlanetRegionalMaterialKitV128`. Les graines, biomes, IDs régionaux et code planétaire sont conservés. Si le profil V134 était appliqué visuellement, les vues de la planète peuvent se mettre à jour par le même pipeline V141 ; aucune sauvegarde de conquête n'est écrite.

## Contrôles

`tests/planet-regional-material-random-v145.test.mjs` couvre tous les périmètres, verrous globaux et régionaux, profils étrangers, absence de fluides inventés, sélection des 48 IDs compatibles et sortie V128 strictement valide.

Les matières procédurales ne constituent pas des textures officielles Predator/AVP certifiées 1:1.
