# Réconciliation PR #26 sur PR #25 — 30 octobre 2026

## Motivation

La V114 de génération de planètes était issue d'une version antérieure du guidage gamedev. La comparaison avec la branche #25 à jour montre **25 fichiers spécifiques**, contre **177** par rapport à `main`. La PR #26 doit rester **empilée sur #25** avant sa fusion, plutôt que dupliquer des dizaines de fichiers du socle.

## Résolution sémantique des trois points communs

- `.github/workflows/audit-v94.yml` : fusion des étapes historiques V112, de l'audit gamedev et des validations planètes/palettes, sans segments de lignes recouvrants.
- `app/game/HomeworldModularHunter.tsx` : conserve les masques et matériaux PHG de #25 pour peau, mèches et textile ; remplace seulement les trois filtres historiques par les tables exhaustives `hunterPaletteFiltersV114.ts`.
- `app/game/HunterRigPreview.tsx` : garde les couches transparentes PHG et le rig d'origine ; utilise les mêmes tables de palette V114 pour la peau, les dreadlocks et les armures.

Les autres fichiers de #25 sont repris intacts. Les 25 changements particuliers à la #26 sont réappliqués par identités de blobs existantes, sans perte d'archives binaires. Le commit de résolution a **deux parents** et ne fusionne pas la PR dans `main`.

## Régression

Le test `tests/hunter-palette-filters-v114.test.mjs` contrôle aussi la présence simultanée des filtres partagés et des calques de matières PHG sur le chasseur Homeworld et dans son aperçu. Les validations CI doivent encore confirmer ce montage après commit.

## Limites

Le maintien des PNG reconstitués n'est pas une admission artistique 1:1 des UV de PHG. La PR #27 possède une nouvelle couche chromatique V113–V117 qui devra être rapprochée des filtres V114 lors de l'intégration de la #26 après fusion de #25 ; éviter les deux moteurs de teinte parallèles à long terme.
