# Rapport source — veille, canopée et survie

## Résultat contrôlé

Le lot retenu contient **19 planches sources, 304 dessins distincts et 16 actions**, soit **4 boucles et 12 séquences ponctuelles**. Les trois actions longues — soin, Second Wind et mort — utilisent chacune deux pages de seize dessins. Les cinq tentatives rejetées ou remplacées sont exclues du compte. Les 592 dessins antérieurs sont conservés, soit 896 dessins sources disponibles dans les trois lots ; ce total ne décrit pas une activation en jeu.

Le contrôle indépendant confirme **304 empreintes RGBA distinctes**, ainsi que **304 empreintes distinctes après neutralisation de tous les pixels d’alpha <16** dans une copie d’analyse. L’unicité ne dépend donc pas uniquement des données presque invisibles. Ce test ne mesure pas la fluidité temporelle ou la cohérence anatomique. Les sources originales n’ont pas été modifiées. [Preuve d’unicité](VISIBLE_FRAME_UNIQUENESS.json).

Les 19 planches ont un véritable fond alpha nul et passent les mesures des bords réels, avant tout padding : aucune cellule n’a de pixel alpha ≥16 au bord, et aucune silhouette alpha ≥128 n’est coupée. Quarante cellules gardent des traces de bord d’alpha >2, avec un maximum de 8. Ces traces restent dans les sources et exports. [QA source complète](FINAL_SOURCE_QA.json).

Chaque PNG mesure 1254×1254. La grille utilise les limites `[0,314,627,941,1254]`, arrondies comme `Math.round`. Les cellules de 313 px reçoivent seulement un padding transparent à droite et/ou en bas vers 314×314 ; l’import ajoute ensuite une garde transparente de deux pixels. Une marge de garde ne remplace pas la vérification du cadrage source.

## Mesures par page

Le pourcentage représente les pixels d’alpha exactement nul dans la planche entière. La marge minimum est mesurée sur le corps alpha ≥128 par rapport à sa cellule source réelle ; une marge de deux pixels est un passage technique, pas une marge artistique généreuse.

| Page | Alpha nul | Plus petite marge opaque | Cellules avec trace de bord alpha >2 |
| --- | ---: | ---: | ---: |
| `idle` | 69.49 % | 11 px | 0/16 |
| `aim_enter` | 65.44 % | 10 px | 1/16 |
| `canopy_attach` | 79.40 % | 31 px | 0/16 |
| `hurt` | 67.11 % | 10 px | 0/16 |
| `aim_hold` | 61.28 % | 6 px | 7/16 |
| `aim_exit` | 47.90 % | 10 px | 4/16 |
| `canopy_hold` | 74.27 % | 21 px | 0/16 |
| `canopy_release` | 61.34 % | 21 px | 0/16 |
| `canopy_swing` | 70.71 % | 19 px | 0/16 |
| `aerial_boost` | 67.57 % | 4 px | 0/16 |
| `scan` | 60.20 % | 10 px | 8/16 |
| `cloak_on` | 69.51 % | 10 px | 2/16 |
| `cloak_off` | 67.78 % | 11 px | 0/16 |
| `heal_a` | 67.63 % | 10 px | 0/16 |
| `second_wind_a` | 67.75 % | 6 px | 3/16 |
| `death_a` | 72.55 % | 2 px | 8/16 |
| `heal_b` | 67.50 % | 8 px | 3/16 |
| `second_wind_b` | 64.68 % | 6 px | 4/16 |
| `death_b` | 65.82 % | 21 px | 0/16 |

## Revue artistique et raccords

L’inspection des sources conserve l’identité du chasseur masqué de référence, les armes de poignet rétractées, les accessoires présents et l’orientation droite. Les gestes d’équipement n’incorporent pas de projectile, de rayon, de camouflage translucide ou d’effet de guérison qui remplacerait le rendu du jeu. Les pages médicales utilisent le petit outil ; la mort reste non graphique et finit couchée.

Le maintien et la sortie de visée ont été remplacés par des versions plus proches de l’entrée. Des différences de largeur et d’appuis restent visibles. Les trois raccords A/B ont été examinés sur fond neutre : volume différent au soin, inclinaison différente à Second Wind et torse plus relevé au début de la deuxième page de mort. La comparaison est conservée dans [AB_VISUAL_REVIEW.md](AB_VISUAL_REVIEW.md), avec ses mesures et sa planche. Aucun raccord parfaitement invisible ni aucune boucle parfaitement fermée n’est revendiqué.

Deux recalages de présentation ont été autorisés après mesure et inspection. Le milieu des prises est suivi pour les pages de maintien et de balancement, avec pivots constants de raccord pour l’accrochage et le lâcher. Sur les quatorze pages au sol, seul Y est recalé, vers 302,5 ; X reste inchangé. Les sources et leurs mouvements internes sont conservés. Ces proxies graphiques ne sont ni des contacts anatomiques validés ni des bindings physiques. Le [reçu indépendant final](FINAL_VERIFICATION.md) confirme leur exécution ; [limites artistiques](ART_REVIEW_LIMITATIONS.md), [recalage du sol](FLOOR_REGISTRATION_REVIEW.md), [candidat de prises](grip-anchor-candidate-review.md).

## Tentatives exclues

- Première attente : fond gris translucide réel, aucun pixel d’alpha nul.
- Premier accrochage : main atteignant et coupant le bord de la cellule 05.
- Premier maintien de visée : torse/casque trop relevés par rapport à l’entrée.
- Correction intermédiaire du maintien : accroupissement trop profond et écarté.
- Première sortie de visée : appuis et silhouette moins proches du dernier dessin d’entrée que la correction retenue.

Les chemins, SHA et raisons exacts des cinq exclusions sont dans [SOURCE_REVIEW_SUMMARY.json](SOURCE_REVIEW_SUMMARY.json). Ces fichiers ne sont pas des sources livrées, et aucune tentative intermédiaire n’est recomptée dans les 304 dessins.

## Contrat du jeu et statut

L’audit porte sur le commit `b97ca20bb72a31ee5e773d9297f446818100c599`. Les actions sont rattachées aux conditions et événements existants dans [next_gap_audit.json](next_gap_audit.json), avec chemins, lignes, citations GitHub immuables et empreintes des fichiers vérifiés. Les IDs d’art ne deviennent pas des enums du moteur. Aucun timing, effet immédiat, inventaire, sauvegarde, collision ou mouvement physique n’est modifié par ce lot.

Tous les assets restent **draft**. La revue de l’assistant et les tests de fichiers ne constituent pas la validation artistique humaine, une séance de combat, un profil de performance ou une preuve de bonne intégration dans le rig actif. [Travaux restants](UPDATED_BACKLOG.md).
