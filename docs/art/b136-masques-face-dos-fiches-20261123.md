# B136 · Fiches d'art des vues de face et de dos des masques

Commande d'art du 23 novembre 2026 pour B136-0308 à B136-0314 (sept masques concepts V133) et B136-0234, B136-0251 et B136-0266 (trois décalques de biomask). L'utilisateur fournit les images ; l'intégration et les contrôles pixel suivent leur livraison.

Le critère des sept masques demande « face/profil/dos conformes, pivots mesurés, sans occlusion des yeux, jeu, aperçu et sauvegarde validés ». Celui des décalques demande des captures « 6 morphologies × 3 vues, ID autorisé, aucune fuite sur une autre zone ». Le profil existe déjà ; seules la face et le dos manquent.

## Limite à connaître avant de produire

Le jeu ne dessine aujourd'hui le chasseur qu'**en profil**, gauche et droite. Aucun écran n'affiche une vue de face ou de dos du corps. Les nouvelles images ne pourront donc être contrôlées en jeu qu'après l'ajout d'une surface de présentation face/profil/dos. Elle demande aussi les vues de face et de dos du corps des six morphologies, qui n'existent pas non plus. Cette question est posée séparément ; les fiches ci-dessous restent valables quel que soit le choix.

## Règles communes aux sept masques

| Élément | Règle |
| --- | --- |
| Fichiers à livrer | `face.png` et `dos.png` par masque, PNG RGBA, fond entièrement transparent. Je produis les WebP du jeu. |
| Toile | 256 × 384 px, comme le profil (`public/game/assets/v133/concept-masks/*.webp`). |
| Échelle | Même hauteur de masque que le profil : environ 81 px de haut (alpha de y = 17 à y ≈ 98 dans le profil). |
| Ancrage | Face et dos centrés sur l'axe vertical x = 128. Haut du masque à y = 17, comme le profil. |
| Symétrie | La face reste symétrique sauf détail propre au modèle visible sur le profil (cicatrice, glyphe, tube). Un détail asymétrique est signalé dans la livraison. |
| Yeux | Face : les deux fentes oculaires restent nettes et non recouvertes par un tube, un glyphe ou une pointe. |
| Dos | Il montre l'arrière du masque et ses fixations au casque, sans visage. Ne pas dessiner de tête ni de dreadlocks : ils appartiennent au corps. |
| Style | Mêmes matériaux, palette, usure et éclairage que le profil (lumière venant d'en haut à gauche). Aucun logo, texte ou élément repris d'une œuvre existante. |
| Interdits | Pas d'ombre portée hors du masque, pas de halo, pas de pixels semi-transparents parasites hors de la silhouette. |

## Fiches par masque

Les cadres alpha du profil viennent de `app/game/conceptMaskFitV137.ts`. L'empreinte SHA-256 (préfixe) identifie le profil de référence dans `app/game/data/conceptBiomasksV133.json`.

| Exigence | Masque | Profil de référence | Classe | Cadre alpha du profil (g, h, d, b) | SHA-256 du profil |
| --- | --- | --- | --- | --- | --- |
| B136-0308 | Requiem | `concept-masks/requiem.webp` | alpha ou samurai | 80, 17, 158, 99 | `6cb669139f310541…` |
| B136-0309 | Nova | `concept-masks/nova.webp` | alpha ou samurai | 79, 17, 158, 98 | `6aac14a067f8b9ee…` |
| B136-0310 | Instinct | `concept-masks/instinct.webp` | alpha | 78, 17, 158, 97 | `773c8164146ced14…` |
| B136-0311 | Glypic | `concept-masks/glypic.webp` | alpha | 78, 17, 158, 98 | `41d6458892874225…` |
| B136-0312 | Tyrant | `concept-masks/tyrant.webp` | alpha | 78, 17, 158, 97 | `7f54b0c28b2321fb…` |
| B136-0313 | Warlord | `concept-masks/warlord.webp` | alpha | 80, 17, 156, 97 | `614f778a9399cd8f…` |
| B136-0314 | Paroxysm | `concept-masks/paroxysm.webp` | alpha | 78, 17, 158, 98 | `97212abde1053892…` |

Pour chaque masque, livrer :

1. `face.png` : le masque vu de face, yeux dégagés, silhouette cohérente avec la largeur du profil (le profil mesure environ 78 px de large ; la face sera plus étroite selon la forme).
2. `dos.png` : le revers du même masque, avec ses fixations.
3. Une phrase par vue sur les choix faits là où le profil ne montre rien (forme du front, revers, attaches).

## Fiches des trois décalques

Les décalques viennent de l'atlas `public/game/assets/v133/decals/decal-atlas.webp` (2048 × 1536, grille 8 × 6, cellules de 256 × 256). Ils ne doivent apparaître que dans l'alpha du masque porté (`maskScope: existing-rig-alpha-and-selected-bone`).

| Exigence | Décalque | Cellule de l'atlas (colonne, ligne) |
| --- | --- | --- |
| B136-0234 | `clan-v133-biomask-hunting-glyph` | 0, 0 |
| B136-0251 | `clan-v133-biomask-war-scratch` | 5, 0 |
| B136-0266 | `clan-v133-biomask-scorched-line` | 0, 1 |

Pour chaque décalque, livrer une version `face.png` et une version `dos.png` de 256 × 256 px, PNG RGBA, fond transparent. Le motif doit rester entièrement dans la silhouette du masque Requiem vu de face et de dos (c'est le masque des contrôles du lot 5), sans toucher les yeux.

## Livraison et contrôles qui suivront

Déposer les fichiers sous `art-source/b136-face-dos-20261123/<masque>/face.png` et `dos.png`, et `art-source/b136-face-dos-20261123/decals/<décalque>/face.png` et `dos.png`, avec la source (outil ou dessin) et la licence.

À réception, je vérifierai pour chaque fichier :

- la taille, le mode RGBA et l'absence de pixels opaques hors de la silhouette ;
- le centrage sur x = 128 et le haut à y = 17, avec une tolérance de 2 px ;
- la hauteur à ± 4 px de celle du profil ;
- sur la face, l'absence de pixels opaques sur les zones des yeux ;
- pour les décalques, la présence de tous leurs pixels dans l'alpha du masque Requiem de la même vue.

Les captures 6 morphologies × 3 vues, l'aperçu et la sauvegarde ne seront possibles qu'avec la surface de présentation face/profil/dos décrite plus haut.
