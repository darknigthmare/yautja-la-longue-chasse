# V118 — Réconciliation des PR #24, #25 et #27

## Situation à la fusion

- Les PR **#24** (V112 Homeworld) et **#25** (guides gamedev et V113 expérimental) ont été fusionnées dans `main` le 30 octobre 2026.
- La PR **#27** (V113–V117 chromatiques) avait un parent #24, puis a été retargetée vers `main`. Elle était `dirty` après l'arrivée de #25.
- Les **sept fichiers** applicatifs avec variations incompatibles étaient : `GameClient.tsx`, `HomeworldModularHunter.tsx`, `HuntCanvas.tsx`, `HunterRigPreview.tsx`, `save.ts`, `types.ts` et `app/globals.css`. Les fichiers `hunterMaterialsV113.ts` et `validate-phg-materials-v113.py` étaient byte-identiques dans les deux branches.

## Arbitrage

1. Conserver l'intégralité des avancées non conflictuelles de la #25 en prenant son arbre `main` comme base.
2. Sur les **sept fichiers** concernés, utiliser l'implémentation canonique V117 de la #27 ; les matériaux/transitions V113 expérimentales sont désormais reconnus et **convertis à la lecture** par `migrateLegacyPhgAppearanceV115`. Ne pas écrire deux séries de propriétés matière dans les sauvegardes.
3. Garder le rendu original des morphologies Yautja ; recouvrir chaque calque une seule fois avec `ChromaticSurfaceV113` pour l'aperçu et Homeworld, et avec `chromaticCanvasSourceV113` pour la mission. Éviter une seconde application du matériau ancien `hunterMaterialBitmapV113`.
4. Préserver le chargement paresseux des miniatures de `GameClient.tsx` introduit dans la #25.
5. Actualiser les **quatre anciens tests** `hunter-material-*.test.mjs` qui affirmaient textuellement l'existence de l'ancienne implémentation ; ils vérifient désormais les points de service, la migration du schéma, l'intégrité des 44 PNG, et le rendu unique des quatre canaux.
6. Préserver les workflows V113 et V114 : les deux suites de tests contrôlent la disponibilité des matériaux et la migration, et V114 vérifie les couleurs + PNG simultanés.

## Portée de la QA et de la fidélité

Ce merge corrige les **conflits de code** et ne valide pas visuellement les **156 PNG Drive-only**. Les **25 entrées non certifiées** de l'audit V116 restent ouvertes. Les détails de silhouette, raccords, masque, pivots, quatre canaux et six morphologies nécessitent une revue visuelle avant toute mention « fidélité 1:1 ».

La PR **#26** (générateur et stratégies planétaires) est un chantier distinct ; son statut de fusion doit être contrôlé indépendamment.

## Validation attendue

- `V114 Yautja PHG material integrity and channel contract` : intégrité et compilation TS/lint.
- `V113 native PHG-inspired materials and renderer wiring` : anciens tests modernisés et validation des 44 PNG.
- Contrôles supplémentaires de sauvegarde propriétaire V116, migration null/undefined et absence de régression du rang/chasseur.
