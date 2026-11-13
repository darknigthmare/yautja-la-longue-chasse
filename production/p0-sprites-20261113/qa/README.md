# Contrôles du lot figé

Les rapports portent sur le manifeste SHA256
`f11cb10dae09c43d939ba4711ae08cc2ab6cde5d0f7e98dac40793e57e712a59`.

- `pack/verification.json` : 110 entrées, 45 PNG, 0 erreur. Les 89 avertissements
  de marge sont conservés pour revue ; aucune silhouette au seuil alpha 16 ne
  touche le bord de sa cellule. Le seul fond opaque est WARP-199.
- `browser/verification.json` : 8 contrôles passants dans Chromium
  154.0.8037.57, avec décodage des 110 entrées, filtres, fonds de composition,
  détails au clavier, restitution du focus, essais à 128/256 px et écrans
  320/390 px. Aucune erreur de page ou de chargement, aucun stockage du jeu écrit.
- `../suivi/verification.json` : 18 759 cellules, formules, liens et XML du nouveau
  classeur contrôlés ; reconstruction identique ; 126 sources antérieures
  protégées, soit 120 classeurs et 6 Markdown.

Les captures sont des rendus de navigateur ; elles ne remplacent pas les PNG
natifs et ne sont pas de nouveaux sprites. Ces contrôles ne prouvent pas une
animation, une intégration en jeu, une échelle physique ou une fidélité canonique
1:1. Les points d'ancrage, marges serrées, détails reconstruits et projections
restent à examiner dans leur contexte artistique.

Les commandes de reproduction figurent dans le README du lot et dans
`../suivi/README.md`.
