# V129 — Aperçu géographique des matières par région et échelle physique

Continuation **dans la PR #39**, empilée sur #33. Le catalogue des 120 formes V115 (40 îles, 40 continents, 40 régions) et les 32 matières V125 (16 sols, 16 liquides) restent inchangés et ne sont pas dupliqués.

## Livré

- Rendu WebGL **explicitement activé** dans « Exporter les textures par calque » → « Kit indépendant par région » ; deux projections à vérifier, planisphère et globe.
- Les textures **albédo** réellement sélectionnées dans le kit V128 composent un atlas de région selon la même grille et les mêmes indices que les masques V103/V124 du jeu. Un changement de matériau recalcule uniquement cet aperçu, sans remplacer le générateur canonique V102/V103/V115.
- Densité des motifs liée au rayon enregistré (1 900 à 21 000 km), avec le rayon terrestre 6 371 km comme étalon. Les frontières, hydrologie, graphes de routes et coûts tactiques ne changent pas ; une planète plus grande contient davantage de répétitions visuelles à distance physique comparable.
- Clé de cache incluant l'ensemble des attributions de la planète pour éviter la réutilisation de matières après un changement ; maximum deux atlas CPU en mémoire, textures GPU soumises aux budgets V101.
- Export du PNG de comparaison sans modification du JSON du monde ou de la sauvegarde de guerre.

## Limites

**Étude albédo, pas shader PBR régional complet** : normales, hauteur, rugosité et émission demeurent exportables dans le ZIP V128. Les zones liquides autour des terres n'ont pas de partition par région authentifiée ; elles conservent donc leur surface globale native dans cet aperçu. Les textures V125 sont des études originales, pas des sources UV/films certifiées 1:1. Un mode PBR complet, ainsi que des variantes liquides utilisables sans déplacer arbitrairement les océans, restent à développer.

La taille agit ici sur la **fréquence de texture**, pas sur le nombre de continents ni les anciennes sauvegardes : augmenter le nombre d'îles pour tous les mondes existants serait une modification incompatible de leur topologie. Les six rayons et l'index en km² de V125 sont conservés.

## Vérifications attendues

- Domaine : `tests/planet-regional-shader-v129.test.mjs` (six rayons, clés de cache, refus de mauvais kit).
- Navigateur : `scripts/qa-planet-region-kit-v128.mjs` étendu (rendu carte, édition d'une matière, rendu globe, intégrité du code de monde, captures desktop/mobile).
- Workflow : `.github/workflows/planet-v114.yml`.

Ne qualifier la validation GPU de complète qu'après retour de la CI du dernier commit, et contrôler sur un appareil réel avant toute prétention 1:1.
