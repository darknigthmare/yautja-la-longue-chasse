# Revue de la passe 7 — marché, montures et chenils

**13 nouveaux sprites sélectionnés**, ajoutés aux **70 précédents**, soit **83 PNG indépendants : 25 marché, 26 montures et 32 chenils**.

Base de continuation : `02253bb99a17eebfdfd3b39ecc18adf749bbfc94`. Chaque sélection et chaque essai archivé ont été affichés directement par l’assistant coordinateur. La revue est celle de candidats graphiques sources ; elle ne remplace pas une validation artistique humaine.

## Livrables retenus

| ID | Élément | Dimensions natives | Marge visible minimale¹ | Sélection |
| --- | --- | --- | ---: | --- |
| S22 | Contenant vertical du chariot autonome | 1199 × 1312 | 112 px | v1 |
| S23 | Coffre empilable du chariot autonome | 1536 × 1024 | 154 px | v1 |
| S24 | Réserve — sol, parois et étagères arrière | 1536 × 1024 | 100 px | v1 |
| S25 | Réserve — façade et toiture au premier plan | 1536 × 1024 | 34 px | v1 |
| M24 | Corps de borne d’attache dégagé | 1100 × 1429 | 48 px | v1 |
| M25 | Anneau et courte chaîne de la borne | 1100 × 1429 | 245 px | v1 |
| M26 | Longe à deux embouts — pose suspendue | 1536 × 1024 | 75 px | v1 |
| K27 | Corps de petite cage sans battant | 1254 × 1254 | 73 px | v1 |
| K28 | Battant de petite cage — pose fermée | 1254 × 1254 | 167 px | v2 |
| K29 | Corps de cage lourde sans battant | 1254 × 1254 | 29 px | v1 |
| K30 | Battant de cage lourde — pose fermée | 1199 × 1312 | 112 px | v2 |
| K31 | Battant de petite cage — pose ouverte | 1263 × 1246 | 189 px | v2 |
| K32 | Battant de cage lourde — pose ouverte | 1536 × 1024 | 59 px | v3 |

¹ Marge calculée sur les pixels d’alpha supérieur à 24. Elle ne signifie pas que tous les pixels périphériques ont un alpha strictement nul. Les dimensions sont celles des fichiers natifs, sans redimensionnement par script.

## Corrections effectuées

**18 générations natives ont produit 13 sélections et 5 essais archivés.** Les essais restent disponibles pour comprendre les corrections et ne sont pas comptés parmi les 83 sprites sélectionnés.

- **K28, v1 → v2 :** suppression des deux gros pivots qui faisaient doublon avec ceux du corps K27 ; seules de petites pattes mobiles percées restent sur le battant fermé.
- **K30, v1 → v2 :** restitution des cinq barreaux du battant lourd ; v1 n’en comportait que quatre.
- **K31, v1 → v2 :** même séparation des pivots fixes et des pattes mobiles pour la pose ouverte de la petite porte.
- **K32, v1 → v2 :** suppression du rail sombre supérieur et de l’enveloppe extérieure supplémentaires. Le rail appartient au portique fixe de 278/K29 ; l’ancien K12 ouvert le dupliquait déjà sur sa porte. Une seconde revue indépendante a confirmé cette ambiguïté. K12 et les autres anciens PNG sont conservés.
- **K32, v2 → v3 :** suppression native d’un voile gris dans les ajours. Les deux zones contrôlées dans v2 avaient des alphas de 28–40 et 7–23. Dans v3, les mêmes 5 750 pixels ont tous un alpha de 0. Les douze fenêtres supplémentaires prises dans les six ajours aux lignes 400 et 700 ont aussi un alpha de 0.

Les cinq fichiers utilisés pour ces corrections portent la provenance **CURRENT_PASS_GENERATED_INPUT** et `sourceCommit: null`. Ils ne sont pas présentés comme des fichiers du commit de base.

## Constats par sprite

### HWM162-S22 — Contenant vertical du chariot autonome

Un seul contenant vertical, couvercle anguleux, voyant ambre et motif de façade conservés ; aucun cadre de retenue, traverse ou autre charge. Base auparavant cachée complétée sobrement ; cadrage propre agrandi, taille à régler dans S18.

Fichier : [HWM162-S22-upright-cart-container.png](sprites/market/HWM162-S22-upright-cart-container.png).

### HWM162-S23 — Coffre empilable du chariot autonome

Un seul coffre fermé à fond plat, sans pieds ajoutés ; deux sangles rouge-brun, boucles et garnitures bronze conservées. Ni second coffre ni chariot ni accessoires. Identité du chargement conservée avec un cadrage propre ; empilement et occlusion à régler.

Fichier : [HWM162-S23-stackable-cart-chest.png](sprites/market/HWM162-S23-stackable-cart-chest.png).

### HWM162-S24 — Réserve — sol, parois et étagères arrière

Sol, seuil transversal, parois et étagères vides conservés ; la toiture, les tissus du linteau et les deux contreforts massifs de façade sont retirés. Supports fins de parois et rayonnages maintenus. Les zones cachées sont reconstruites, avec un cadrage propre.

Fichier : [HWM162-S24-stock-shelter-rear-interior.png](sprites/market/HWM162-S24-stock-shelter-rear-interior.png).

### HWM162-S25 — Réserve — façade et toiture au premier plan

Toiture nervurée et emblème, draperie, deux contreforts frontaux et leurs pieds, lampes et équerres conservés ; aucun sol, seuil transversal, mur arrière ou rayonnage. La baie est transparente dans les deux zones mesurées. Marges visibles réduites mais silhouette entière.

Fichier : [HWM162-S25-stock-shelter-front-roof.png](sprites/market/HWM162-S25-stock-shelter-front-roof.png).

### HWM162-M24 — Corps de borne d’attache dégagé

Borne, pied renforcé, marque, voyant, axe horizontal avec ses deux supports fixes et récepteur bas conservés. Gros anneau, manchon mobile et chaîne retirés ; surfaces auparavant cachées reconstruites. Cadrage natif 1100×1429 différent de M02 ; mise à l’échelle et pivot nécessaires à l’assemblage.

Fichier : [HWM162-M24-tether-bollard-body.png](sprites/mounts/HWM162-M24-tether-bollard-body.png).

### HWM162-M25 — Anneau et courte chaîne de la borne

Un seul ensemble mobile relié : anneau bronze, manchon central, courte chaîne et maillon terminal complet. Aucun axe fixe, joue de borne, récepteur bas ni pierre. Trou central transparent. Cadrage propre agrandi/repositionné ; une simple translation sur M24 ne suffit pas à établir le raccord.

Fichier : [HWM162-M25-tether-ring-chain.png](sprites/mounts/HWM162-M25-tether-ring-chain.png).

### HWM162-M26 — Longe à deux embouts — pose suspendue

Chaîne continue et deux ferrures bronze fermées conservées, avec une pose suspendue en U et les deux extrémités élevées. Aucun support ni sol fusionné. Courbe et orientations des maillons réinterprétées, sans certification de longueur déployée, d’animation ou d’attache physique.

Fichier : [HWM162-M26-suspended-double-ended-tether.png](sprites/mounts/HWM162-M26-suspended-double-ended-tether.png).

### HWM162-K27 — Corps de petite cage sans battant

Corps complet de petite cage, poignée de toit, toit et côtés ajourés, plancher et cadre fixe conservés. Aucun battant ni poignée mobile ; deux cylindres fixes à gauche et récepteur ambre à droite demeurent sur la cage. Le sol anciennement masqué et les contacts de charnière sont reconstruits. Les barres du fond restent visibles.

Fichier : [HWM162-K27-small-cage-body.png](sprites/kennels/HWM162-K27-small-cage-body.png).

### HWM162-K28 — Battant de petite cage — pose fermée

Version 2 : cadre mobile chanfreiné, quatre barreaux et prise ajourée droite conservés. Les deux gros pivots de v1 sont supprimés et remplacés par de petites pattes plates percées sur le bord gauche ; aucun récepteur ou voyant ambre. Espace entre barreaux transparent. Attaches et raccords sont une interprétation graphique, non une mécanique validée.

Fichier : [HWM162-K28-small-cage-door-leaf.png](sprites/kennels/HWM162-K28-small-cage-door-leaf.png).

### HWM162-K29 — Corps de cage lourde sans battant

Corps allongé de cage lourde conservant ses trois arceaux, côtés et toit ajourés, patins, plancher, portique frontal et trois fixations de charnière. Aucun battant ni boîtier ambre ; les barreaux du flanc arrière restent visibles à travers l’entrée. Intérieur auparavant masqué reconstruit.

Fichier : [HWM162-K29-heavy-cage-body.png](sprites/kennels/HWM162-K29-heavy-cage-body.png).

### HWM162-K30 — Battant de cage lourde — pose fermée

Version 2 : cinq barreaux verticaux continus présents au-dessus et au-dessous de la traverse médiane, au lieu des quatre de v1. Cadre bronze simple, trois attaches sur le bord articulé gauche et boîtier ambre au bord libre droit conservés. Aucun portique fixe, sol ou cage. Les deux zones mesurées entre barreaux sont transparentes.

Fichier : [HWM162-K30-heavy-cage-door-leaf.png](sprites/kennels/HWM162-K30-heavy-cage-door-leaf.png).

### HWM162-K31 — Battant de petite cage — pose ouverte

Version 2 : pose ouverte héritée de K10, quatre barreaux, prise ajourée à gauche et deux petites pattes plates percées à droite. Les cylindres fixes de v1 sont retirés ; aucun voyant ambre, cage, sol ni montant fixe. Les attaches sont réinterprétées graphiquement ; des résidus chromatiques natifs périphériques demeurent.

Fichier : [HWM162-K31-small-cage-door-leaf-open.png](sprites/kennels/HWM162-K31-small-cage-door-leaf-open.png).

### HWM162-K32 — Battant de cage lourde — pose ouverte

Version 3 : cadre bronze simple à cinq barreaux, traverse médiane, boîtier ambre au bord libre gauche et trois œillets mobiles à droite. Rail sombre supérieur et enveloppe extérieure supplémentaires retirés, à la suite de l’ambiguïté de K12 ; les anciens PNG restent inchangés. Le voile alpha de v2 a disparu des deux zones reprises, toutes alpha0. Pose ouverte conservée ; rattachement des œillets interprété graphiquement.

Fichier : [HWM162-K32-heavy-cage-door-leaf-open.png](sprites/kennels/HWM162-K32-heavy-cage-door-leaf-open.png).

## Transparence et conservation

Les 83 fichiers sont RGBA, possèdent des pixels réellement transparents et une silhouette principale entière. Les 83 SHA-256 sélectionnés sont distincts. **Les 70 PNG antérieurs conservent leurs octets.**

Le total sélectionné est de **135 056 743 octets**, dont **19 914 511 octets** pour les 13 ajouts. Les 5 essais archivés représentent séparément **6 565 819 octets**.

Les mesures donnent 22 fichiers avec une marge strictement transparente et 47 avec une marge visible d’au moins 80 px. Le détail reste disponible dans le [rapport technique](technical-report.json) et les empreintes dans le [manifeste](manifest.json).

Les zones de baie examinées sur S25 ont un alpha de 0 à 1 ; l’intérieur de l’anneau M25 et les fenêtres retenues sur K31/K32 ont un alpha de 0. Les fenêtres contrôlées sur K28 et K30 ont un alpha de 0 à 1. Ces mesures ciblées ne certifient pas l’absence de tout résidu sur toute l’image.

Des couleurs peuvent subsister dans les canaux RGB de pixels presque transparents. Sur K31-v2, les 1 184 pixels rouges détectés ont tous un alpha de 1 à 5. Sur K27, 14 pixels rouges isolés dépassent l’alpha 8 ; ce constat est conservé dans la [revue détaillée](review-round7.json). Aucun nettoyage de pixels par script n’a été appliqué.

## Sources, assemblage et limites

Les **8 références de conception** appartiennent au commit de base ; leurs chemins et empreintes sont enregistrés dans la revue JSON. Les **5 entrées de correction** sont les essais générés puis archivés dans cette passe.

La réserve S05 est séparée en une couche arrière (sol, seuil, parois et rayonnages) et une couche avant (toiture, linteau, deux contreforts et lampes). Les deux charges du chariot reprennent son contenu précis, sans remplacer les caisses génériques déjà présentes. La borne d’attache sépare ses pièces fixes de l’anneau et de sa courte chaîne. Les cages petite et lourde disposent chacune d’un corps et de deux poses de battant.

Les vues des références sont héritées à la demande. Les dimensions de toile et l’échelle de l’objet peuvent varier ; M24/M25 demandent notamment un ajustement de taille et de placement. Aucun raccord exact, pivot fonctionnel, collision, animation, compatibilité d’espèce ou fonctionnement dans le moteur n’est certifié.

La nouvelle pose de longe et les surfaces cachées reconstituées restent des interprétations graphiques du projet. Les références disponibles ne permettent pas une certification canonique **1:1** de ces bâtiments et accessoires. Les indicateurs de validation humaine et d’intégration restent faux.

Le périmètre demeure celui des 40 cibles V81 héritées et des 2 identités de bâtiments du catalogue : aucune cible ni identité de bâtiment supplémentaire n’est introduite. Cette passe termine les 13 éléments de son [plan ciblé](next-targets-round7.json), sans prétendre clore toutes les variantes modulaires imaginables.

## Pièces de contrôle

- [Audit de modularité](modularity-audit-round7.json)
- [Plan de production](next-targets-round7.json)
- [Revue détaillée, mesures et sources](review-round7.json)
- [Reçu marché](receipts/market.json)
- [Reçu montures](receipts/mounts.json)
- [Reçu chenils](receipts/kennels.json)
- [Suivi Excel](YAUTJA_MARCHE_MONTURES_CHENILS_20261103.xlsx)
