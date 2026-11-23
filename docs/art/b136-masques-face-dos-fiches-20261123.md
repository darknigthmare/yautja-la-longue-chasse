# B136 · Fiches d'art des vues de profil et de dos des masques

Commande d'art du 23 novembre 2026 pour B136-0308 à B136-0314 (sept masques concepts V133) et B136-0234, B136-0251 et B136-0266 (trois décalques de biomask). L'utilisateur fournit les images ; l'intégration et les contrôles pixel suivent leur livraison.

Le critère des sept masques demande « face/profil/dos conformes, pivots mesurés, sans occlusion des yeux, jeu, aperçu et sauvegarde validés ». Celui des décalques demande des captures « 6 morphologies × 3 vues, ID autorisé, aucune fuite sur une autre zone ». **Décision du 23 novembre 2026 :** le sprite V133 publié montre le masque de face (les deux fentes des yeux sont visibles). Il devient la **vue de face**. Il manque donc le **profil** et le **dos**.

## Limite à connaître avant de produire

L'armurerie présente désormais le masque concept porté en trois vues (`app/game/MaskTurnaroundV136.tsx`) : la face publiée, puis le profil et le dos, signalés « à livrer » jusqu'à la livraison. Le corps du chasseur n'existe pas de face ni de dos ; les captures « 6 morphologies × 3 vues » du critère demandent encore ces vues de corps.

## Règles communes aux sept masques

| Élément | Règle |
| --- | --- |
| Fichiers à livrer | `profil.png` et `dos.png` par masque, PNG RGBA, fond entièrement transparent. Je produis les WebP du jeu. |
| Toile | 256 × 384 px, comme la vue de face publiée (`public/game/assets/v133/concept-masks/*.webp`). |
| Échelle | Même hauteur de masque que la face : environ 81 px (alpha de y = 17 à y ≈ 98). |
| Ancrage | Haut du masque à y = 17. Centre horizontal sur celui de la face du même masque (milieu du cadre alpha du tableau ci-dessous, x ≈ 118). |
| Profil | Vue latérale droite (le masque regarde vers la droite), cohérente avec les volumes de la face : front, arêtes, tubes. |
| Yeux | Profil : la fente oculaire visible reste nette, non recouverte par un tube, un glyphe ou une pointe. |
| Dos | Il montre l'arrière du masque et ses fixations au casque, sans visage. Ne pas dessiner de tête ni de dreadlocks : ils appartiennent au corps. |
| Style | Mêmes matériaux, palette, usure et éclairage que la face (lumière venant d'en haut à gauche). Aucun logo, texte ou élément repris d'une œuvre existante. |
| Interdits | Pas d'ombre portée hors du masque, pas de halo, pas de pixels semi-transparents parasites hors de la silhouette. |

## Fiches par masque

Les cadres alpha de la face viennent de `app/game/conceptMaskFitV137.ts`. L'empreinte SHA-256 (préfixe) identifie la face de référence dans `app/game/data/conceptBiomasksV133.json`.

| Exigence | Masque | Face de référence | Classe | Cadre alpha de la face (g, h, d, b) | SHA-256 de la face |
| --- | --- | --- | --- | --- | --- |
| B136-0308 | Requiem | `concept-masks/requiem.webp` | alpha ou samurai | 80, 17, 158, 99 | `6cb669139f310541…` |
| B136-0309 | Nova | `concept-masks/nova.webp` | alpha ou samurai | 79, 17, 158, 98 | `6aac14a067f8b9ee…` |
| B136-0310 | Instinct | `concept-masks/instinct.webp` | alpha | 78, 17, 158, 97 | `773c8164146ced14…` |
| B136-0311 | Glypic | `concept-masks/glypic.webp` | alpha | 78, 17, 158, 98 | `41d6458892874225…` |
| B136-0312 | Tyrant | `concept-masks/tyrant.webp` | alpha | 78, 17, 158, 97 | `7f54b0c28b2321fb…` |
| B136-0313 | Warlord | `concept-masks/warlord.webp` | alpha | 80, 17, 156, 97 | `614f778a9399cd8f…` |
| B136-0314 | Paroxysm | `concept-masks/paroxysm.webp` | alpha | 78, 17, 158, 98 | `97212abde1053892…` |

Pour chaque masque, livrer :

1. `profil.png` : le masque vu de côté, tourné vers la droite, fente oculaire dégagée.
2. `dos.png` : le revers du même masque, avec ses fixations.
3. Une phrase par vue sur les choix faits là où la face ne montre rien (profondeur, revers, attaches).

## Fiches des trois décalques

Les décalques viennent de l'atlas `public/game/assets/v133/decals/decal-atlas.webp` (2048 × 1536, grille 8 × 6, cellules de 256 × 256). Ils ne doivent apparaître que dans l'alpha du masque porté (`maskScope: existing-rig-alpha-and-selected-bone`).

| Exigence | Décalque | Cellule de l'atlas (colonne, ligne) |
| --- | --- | --- |
| B136-0234 | `clan-v133-biomask-hunting-glyph` | 0, 0 |
| B136-0251 | `clan-v133-biomask-war-scratch` | 5, 0 |
| B136-0266 | `clan-v133-biomask-scorched-line` | 0, 1 |

Pour chaque décalque, livrer une version `profil.png` et une version `dos.png` de 256 × 256 px, PNG RGBA, fond transparent. Le motif doit rester entièrement dans la silhouette du masque Requiem de la même vue (c'est le masque des contrôles du lot 5), sans toucher les yeux.

## Livraison et contrôles qui suivront

Déposer les fichiers sous `art-source/b136-profil-dos-20261123/<masque>/profil.png` et `dos.png`, et `art-source/b136-profil-dos-20261123/decals/<décalque>/profil.png` et `dos.png`, avec la source (outil ou dessin) et la licence.

À réception, je vérifierai pour chaque fichier :

- la taille, le mode RGBA et l'absence de pixels opaques hors de la silhouette ;
- le haut à y = 17 et le centre horizontal sur celui de la face, avec une tolérance de 2 px ;
- la hauteur à ± 4 px de celle de la face ;
- sur le profil, l'absence de pixels opaques sur la fente oculaire ;
- pour les décalques, la présence de tous leurs pixels dans l'alpha du masque Requiem de la même vue.

À l'intégration, j'ajoute les chemins dans `app/game/data/maskViewsV136.json` et l'armurerie affiche les trois vues. Les captures 6 morphologies × 3 vues demandent encore les vues de corps de face et de dos.
