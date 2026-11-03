# V121 — Reconciliation de V120 avec la fusion des PR #26 et #28

La #26 a centralisé les palettes de peau, dreadlocks et armures dans `hunterPaletteFiltersV114.ts`. Le rendu V117/V120 de la #27 avait encore des valeurs locales héritées (dont certains nouveaux tons absents) et un moteur de matière parallèle de la #25. Les deux fichiers de rendu modifiés simultanément ont été réconciliés :

- `HomeworldModularHunter.tsx` : seule source de filtres `HUNTER_*_FILTERS_V114`, sans perte des quatre calques chromatiques V117.
- `HunterRigPreview.tsx` : même source V114 pour toutes les morphologies Yautja, et masque V117 pour peau, dreads, outfit et armure.
- `tests/hunter-palette-filters-v114.test.mjs` : garde les contrats de couleurs déclarées, remplace le test textuel de l'ancien `phgMaterialForV113` par un contrôle du vrai moteur V117 sans double calque.

Tout nouveau contenu de `main` apporté par #26 (générateur planète) et #28 (guerres de clans) est préservé en partant de cet arbre Git. Le programme V120 conserve son catalogue de 156 matières issues des archives utilisateur et son installateur ; aucun WebP absent n'est annoncé comme présent. Les 25+ questions artistiques ouvertes ne deviennent pas certifiées 1:1.

Le merge conserve les deux historiques de commits (PR #27 et main) et est rejeté si leurs têtes ne correspondent plus aux SHAs examinés.
