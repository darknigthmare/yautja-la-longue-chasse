# Bestiaire animé V7

Ce lot ajoute **30 ennemis jouables** et 30 planches d’animation distinctes.
Les bitmaps sont des créations originales de fan générées avec l’outil OpenAI
`image_gen` intégré, à partir de références de la franchise. Aucun sprite,
render ou extrait officiel n’est redistribué.

## Répartition

| Lot | Catégories | Ennemis | Cellules |
| --- | --- | ---: | ---: |
| [`fauna`](fauna/README.md) | Faune | 10 | 60 |
| [`flora-other`](flora-other/README.md) | Flore + autres menaces | 10 | 60 |
| [`humanoid-badblood`](humanoid-badblood/README.md) | Humanoïdes + Bad Blood | 10 | 60 |
| **Total** | 5 familles | **30** | **180** |

Chaque strip runtime mesure `1536×192` en PNG RGBA et contient six cellules
de `256×192`, toujours dans cet ordre :

1. repos ;
2. déplacement A ;
3. déplacement B ;
4. attaque ;
5. impact ;
6. mort.

Les masters chroma et alpha sont conservés dans le sous-dossier `masters` de
chaque lot. Les exports servis par le jeu se trouvent sous
`public/game/sprites/v7/enemies`.

## Contrôle qualité

- 30/30 strips présents et 180/180 cellules contenant un sujet visible ;
- dimensions, alpha, coins transparents et remplissage de chaque cellule
  contrôlés automatiquement par `tests/enemy-roster-v7.test.mjs` ;
- 30 hashes uniques ;
- aucune couleur de chroma opaque résiduelle ;
- inspection visuelle en résolution originale des six masters et des 30 strips ;
- défaut de ligne parasite du Kalisk détecté pendant la contre-vérification,
  puis correction par isolation et recentrage des 60 cellules faune ;
- débordements initiaux du filet Bad Blood et de la limite synthétique/gardien
  corrigés avant validation.

## Intégration

Les neuf vagues des trois missions totalisent exactement 30 emplacements.
`app/game/enemyRosterV7.ts` attribue un ennemi unique à chacun. Le moteur charge
seulement les strips nécessaires à la mission, sélectionne la cellule selon
l’état réel de l’IA et conserve brièvement la sixième pose après la mort.

Le codex affiche le même catalogue avec filtres, comportement, menace, trophée,
provenance et deux liens de référence par entrée.
