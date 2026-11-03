# Revue de la troisième passe — dix ajouts

Les dix nouveaux PNG ont été affichés et comparés à leurs références par le coordinateur, après leur génération par trois collaborateurs. Cette revue porte sur les sources graphiques ; elle ne constitue pas une validation humaine ni un essai dans le jeu. Le lot contient désormais **35 sprites sélectionnés**.

Base examinée : `454bbc558abc9bb06141b2b77642bff1894d8cf2`. Livraison précédente de 25 PNG : `a6e16334589ee8c4724bcc04da539007e669c883`. Les 25 PNG précédents sont inchangés octet par octet.

## Résultats par sprite

| ID | Résultat observé | Marges visibles G/H/D/B (px, alpha > 24) |
| --- | --- | --- |
| HWM162-S08 | Caisse ouverte unique, intérieur vide et couvercle complet sur charnières. Face avant, poignée latérale, pieds, matières et motifs visuellement cohérents avec la caisse fermée V80. Le cadrage a évolué avec l’ouverture ; transition parfaitement alignée en jeu non certifiée. | 67, 59, 48, 80 |
| HWM162-S09 | Un seul cylindre autonome, sans rack, outil ni deuxième contenant. Couvercle, sangle et face bronze reprennent le cylindre central supérieur du rack V76. Vue native nouvelle ; sa taille et son alignement avec le rack restent à calibrer en scène. | 201, 106, 202, 93 |
| HWM162-S10 | Auvent complet à quatre poteaux et toile rouge sombre, sans comptoir, marchandises ni sol. Les intervalles sous la toile sont dégagés ; les échantillons du voile RGB visible dans l’aperçu sont transparents (alpha 0). Marge visible supérieure de 11 px : silhouette entière, mais la marge demandée de 12 % n’est pas atteinte. | 191, 11, 125, 31 |
| HWM162-M10 | Bassin vide et plancher visible. Piliers, cerclages bronze, poignées, orientation et cadrage restent visuellement proches de la source remplie. Aucune ration résiduelle. Concordance pixel par pixel et transition d’état en jeu non revendiquées. | 134, 234, 76, 153 |
| HWM162-M11 | Deuxième tentative retenue après correction ciblée : deux poteaux facettés avec un voyant horizontal ambré chacun, fines bandes bronze et pieds segmentés, cohérents visuellement avec M07. Axe haut-gauche vers bas-droite et traverses conservés. Raccords, tailles projetées et angle exact non certifiés en scène. | 201, 48, 218, 52 |
| HWM162-M12 | Section droite autonome dans l’orientation bas-gauche vers haut-droite, avec deux poteaux facettés, voyants horizontaux ambrés, traverses et renforts complets. Famille visuelle cohérente avec M07. Vue générée séparément, sans miroir de pixels ; raccords à M07/M11 à vérifier en scène. | 307, 219, 307, 164 |
| HWM162-K10 | Construction compacte facettée, poignée et renforts reconnaissables. Porte entière ouverte à gauche sur charnières ; passage libre et cage vide. Le cadrage s’est adapté au débattement de la porte ; l’interchangeabilité parfaite avec l’état fermé n’est pas certifiée. | 89, 157, 56, 130 |
| HWM162-K11 | Cage basse allongée, patins et longues barres de toit préservés visuellement. Trappe garée à droite ; ouverture latérale et plancher dégagés. Aucun animal. Les barreaux arrière visibles au travers du passage font partie de la cage. | 43, 209, 32, 207 |
| HWM162-K12 | Cage lourde à trois arceaux et deux patins, porte ouverte sur le côté gauche, entrée dégagée et intérieur vide. Les espaces testés entre les barreaux de la porte ouverte sont transparents ou à alpha résiduel 1. Cadrage élargi pour la porte ; superposition parfaite avec l’état fermé non certifiée. | 150, 93, 141, 71 |
| HWM162-K13 | Deux supports et leur rail conservés visuellement, émetteurs éteints et champ énergétique retiré. La fenêtre centrale de contrôle contient 12 100 pixels tous à alpha 0, contre des valeurs de 166 à 251 dans la source active. | 273, 473, 263, 351 |

## Correction de M11

La première version de la clôture diagonale gauche avait des voyants verticaux et des détails de poteaux éloignés de M07/M12. Une correction ciblée a rétabli les voyants horizontaux ambrés, les capuchons facettés et les bandes bronze. La version `HWM162-M11-corral-diagonal-left-v2.png` a été revue et retenue. La première version native reste dans `attempts/mounts/` avec son reçu et son motif de remplacement ; elle ne compte pas parmi les 35 sprites sélectionnés.

## Contrôles ciblés

- **Barrière désactivée K13 :** la fenêtre `[520, 635, 740, 690]` contient 12 100 pixels entièrement transparents. La source active avait un alpha compris entre 166 et 251 au même emplacement.
- **Auvent S10 :** les neuf échantillons de fond listés dans le JSON ont un alpha nul. Le voile coloré visible dans certains aperçus du canal RGB ne forme pas un fond opaque à ces emplacements. La silhouette reste complète avec une marge haute de 11 px ; la marge demandée de 12 % n’est pas atteinte.
- **Cage lourde K12 :** les espaces examinés entre les barreaux de la porte ouverte sont transparents ou contiennent un alpha résiduel de 1 ; aucun panneau opaque n’a été observé dans ces espaces.

## Vues, fidélité et intégration

Sept éditions conservent la vue de leur référence : S08, S10, M10 et K10–K13. Les vues historiques des cages et de la barrière avaient un brief trois-quarts vers 32° ; aucun angle réel n’a été mesuré. Les trois nouvelles vues S09/M11/M12 ont été demandées selon la cible Homeworld orthographique 0°/35°, sans certification géométrique du résultat.

Les dix ajouts sont des adaptations originales du projet. Leur cohérence visuelle avec les sources a été examinée ; aucune fidélité canonique 1:1, dimension physique canonique ni compatibilité cage/espèce n’est revendiquée. Les raccords de clôture, pivots, échelles, superpositions des états ouverts/fermés, collisions et passages restent à valider dans une scène de jeu. Les sources PNG n’ont subi ni redimensionnement, ni miroir, ni correction de pixels par script.

Les SHA exacts, références et décisions figurent dans [review-round3.json](review-round3.json). Les mesures techniques de tous les PNG sont dans [technical-report.json](technical-report.json).
