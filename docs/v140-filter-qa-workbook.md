# V140 — Filtrage propre à chaque couche du chasseur

Ce livrable reprend l'Excel V139 **sans altérer les 1 134 contrôles visuels**, ses 40 sources et les 52 parités géométriques. L'onglet `Filtres_V140` ajoute **18 contrôles de couche** (6 morphologies × anatomie/pigment/decal), tous marqués *« À tester »* pour la capture réelle.

Le code `HomeworldModularHunter.tsx` a retiré le filtre de peau du parent `data-homeworld-layer=body` : il s'applique désormais seulement aux images anatomiques. Les pigments V113 et les decals V133 ont des calques indépendants, suivant le même ordre que l'aperçu animé et la chasse. Aucun fichier WebP ni contenu des sauvegardes n'a été modifié dans cette correction.

Le classeur est contrôlé par `scripts/verify-phg-filter-v140.py` via SHA-256, nombre de lignes, six morphologies, filtres indépendants, conservation de V138/V139 et absence de faux statuts visuels. Cette vérification mathématique et structurelle **n'est pas** une confirmation UV/pixels 1:1 de *Predator: Hunting Grounds*.

- [Excel QA V140](./production/Yautja_PHG_QA_Visual_Morphologies_V140.xlsx)
- [Copie Drive](https://drive.google.com/file/d/14yvBA-4hHBmu9iLbE3JbuwBRl_BiR-Ku/view)
