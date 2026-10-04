# Homeworld V82 — usages historiques et soutènements

Lot de corrections demandé après le commit V81 `ba96b77`. **Ce lot n’a pas été validé** : aucun test, audit, lint, compilation, navigateur ou contrôle de production n’a été exécuté après ces modifications, conformément à la consigne de publier et continuer sans vérification. Ce document décrit les modifications de données et leurs intentions ; il ne certifie pas leurs résultats en jeu.

Le rapport `work-local/v81/homeworld-spatial-audit.json` et les documents V81 restent un **instantané antérieur** : 13 266 contraintes évaluées, zéro erreur dure et 29 avertissements à cet instant. Ils ne prouvent ni le nombre d’avertissements restant en V82, ni l’accessibilité après l’ajout de nouveaux solides. Aucun nouveau PASS n’est annoncé.

## Relocalisations ciblées

Les 24 accessoires ci-dessous quittent les enveloppes d’usage ou seuils signalés dans le rapport V81. Leurs identifiants, PNG, dimensions, orientations natives et formes de collision sont conservés. Les coordonnées sont absolues dans le monde de leur étage ; le port ne reçoit pas une seconde translation de +6500 après application de ces coordonnées. Le banc `life-v68-28-1` déjà déplacé en V81 conserve son implantation et ne compte pas comme une 25e correction.

| ID conservé | Étage | Position du rapport V81 | Position authored V82 | Fonction du nouvel emplacement |
|---|---|---|---|---|
| beacon-v64-dock-control | 0 | 7224,9 ; 3214,2 | 7215 ; 3395 | Traverse des équipages après la face de chargement du stock. |
| beacon-v64-market-armory | 0 | 1765 ; 2915,5 | 1910 ; 2900 | Angle oriental de la halte, hors coffre et présentoir. |
| beacon-v64-market-canopy | 0 | 2335 ; 2776 | 2475 ; 2825 | Sortie de ruelle, hors face clients et banc voisin. |
| beacon-v64-training-hall | 0 | 2385 ; 1908 | 2600 ; 1940 | Voie latérale d’entraînement hors rack du maître. |
| beacon-v64-enforcer-bastion | +1 | 4675 ; 2078,5 | 5030 ; 2105 | Rive orientale de galerie, hors fret et patrouille connue. |
| beacon-v64-memory-vault | 0 | 1315 ; 1148,5 | 1515 ; 1015 | Revers latéral du registre hors approche de l’assise. |
| beacon-v64-pit-gate | 0 | 2455 ; 1102 | 1990 ; 1180 | Raccord occidental du cercle hors deux poches d’assise. |
| beacon-v64-rampart-north-lodge | 0 | 5805 ; 1939 | 6105 ; 2070 | Retour vers la chaussée du rempart hors assise. |
| beacon-v64-rampart-watch | 0 | 5993,3 ; 2933 | 6120 ; 2930 | Bord droit du parvis, hors dégagement de porte. |
| bench-v64-market-armory | 0 | 1425 ; 2955,5 | 1300 ; 3085 | Halte sud-ouest hors présentoir d’équipement. |
| bench-v64-trophy-mausoleum | 0 | 700,5 ; 2177,4 | 530 ; 2260 | Promenade côtière après le seuil cérémoniel. |
| garden-v64-clan-lodge | 0 | 3255 ; 2056,5 | 3770 ; 2050 | Revers oriental du quartier hors face du banc. |
| life-v68-26-0 | -1B | 3580 ; 3215 | 3590 ; 3500 | Rive occidentale des galeries hors maison artisan. |
| life-v68-33-1 | 0 | 1370 ; 1455 | 1490 ; 1350 | Halte inter-îlots du scribe hors coffre domestique. |
| exterior-v76-009 | 0 | 3547 ; 2594 | 3735 ; 2495 | Rack dans la poche de service orientale, hors porte et banc. |
| exterior-v76-010 | 0 | 3625 ; 2822 | 3840 ; 2860 | Jarres de refroidissement hors face du banc artisan. |
| exterior-v76-011 | 0 | 3590 ; 3067 | 3750 ; 3120 | Travée de fret distincte du rack de finition. |
| exterior-v76-020 | 0 | 1795 ; 2301 | 1915 ; 2395 | Gong dans la halte après le seuil des terrasses. |
| exterior-v76-021 | 0 | 1795 ; 1741 | 1660 ; 1435 | Alcôve entre îlots, hors deux entrées voisines. |
| exterior-v76-029 | 0 | 1500 ; 1266 | 1970 ; 1400 | Rive du raccord des terrasses hors assise des archives. |
| exterior-v76-044 | -1C | 2835 ; 4521 | 2970 ; 4485 | Travée orientale hors face de chargement du rack. |
| exterior-v76-067 | 0 | 2575 ; 2857 | 2690 ; 2815 | Angle du foyer après l’espace d’usage du banc. |
| exterior-v76-070 | +1 | 4565 ; 2514 | 4660 ; 2600 | Revers de terrasse après le seuil de la relève. |
| v75-frontage:pit-gate:1 | 0 | 2094,8 ; 994 | 2680 ; 1050 | Gong à l’aile orientale hors face de l’assise oblique. |

Ces implantations ne sont ni une grille uniforme, ni une multiplication de meubles par un offset commun. Elles répondent à des usages différents. Elles restent à parcourir et examiner visuellement en jeu lorsque la vérification sera de nouveau demandée.

## Deux assemblages de soutènement

`homeworldRetainingAssembliesV82.ts` associe quatre piédroits maçonnés à deux murs natifs déjà présents. Le contact et l’orientation des deux PNG de mur sont inchangés. Les nouveaux piédroits sont des volumes géométriques originaux `LORE_COMPATIBLE_ORIGINAL` / `AUTHORED_GEOMETRY_NOT_NEW_RASTER`, pas quatre sprites livrés, ni un système complet de barrière énergétique.

| Assemblage | Mur existant | Piédroits solides ajoutés | Contacts terminaux conservés |
|---|---|---|---|
| retaining-v82:halt-north | city-native-v78:terrace-retaining-front | west-bearing, east-bearing | 2772,3 ; 4017,9 et 3206,4 ; 4016,9 |
| retaining-v82:halt-south | civic-v81:court:lower-west-rest:wall | rear-bearing, front-bearing | 2717,1 ; 4495,9 et 2771,8 ; 4604,5 |

Chaque piédroit possède un polygone convexe à six contacts et une hauteur propre de 92 à 116 unités. Le terrain existant de l’étage `-1A` reste utilisé ; aucun rectangle de terrain invisible n’est ajouté pour contourner les collisions. Le moteur bloque le corps sur le même polygone. La seule exception de joint structurel autorise le mur désigné à rencontrer son propre piédroit ; les meubles voisins ne bénéficient pas de cette exception, et le joueur reste bloqué par l’union complète.

Le renderer utilise `homeworldRetainingRenderV82(support, depthScale, elevation)` pour dessiner les faces, le dessus et l’ordre de profondeur issus de ce même volume. **Le montage de ces quatre formes dans le renderer appartient au lot coordonné par l’agent principal et est nécessaire avant publication pour ne pas laisser de solides invisibles.** Les mesures, l’ordre visuel et les parcours restent non validés dans ce lot.

L’inventaire spatial distingue désormais `HOMEWORLD_NATIVE_RASTER_USAGE_OBJECTS_V81` des quatre `HOMEWORLD_STRUCTURAL_USAGE_OBJECTS_V82`. Les volumes sans image ne gonflent pas le nombre de sources PNG. Les futurs contrôles de continuité évalueront les contacts réels du mur, leur présence dans sa coque et dans le piédroit désigné ; la proximité d’une maison ne tient plus lieu de preuve. Ce code de contrôle est préparé mais n’a pas été exécuté.

## Palais et codex

Le palais `throne-audience` est classé `KEEP` avec une **vue axiale frontale intentionnelle** : son axe d’audience, sa hiérarchie cérémonielle et ses dimensions natives ne réclament pas automatiquement un angle gauche/droite. Cela ne résout pas les variantes de silhouettes encore répétées dans les îlots résidentiels. Les fiches agrégées du codex reprennent les positions exactes des accessoires déplacés et les quatre volumes maçonnés avec leurs propriétaires, étage, dimensions et provenance.

## Limites maintenues

- Le décompte restant de conflits, les 43 portes, les routines PNJ et les supports corporels n’ont pas été contrôlés après ce lot.
- Les 42 vues visuelles demandées, les parcours clavier/manette/mobile et l’esthétique à distance de jeu ne sont pas remplacés par cette note.
- La carte locale, les piédroits et les implantations sont des adaptations originales compatibles avec le lore ; aucune carte canonique ou fidélité 1:1 n’est revendiquée.
- Les variantes artistiques répétées, l’alcôve de `archive-shelf-right`, les barrières complètes, les animations sociales et les suites privées/cinématiques du palais restent des travaux distincts.
- Les paliers natifs des connecteurs et le mobilier intérieur V82 sont développés par les agents parallèles ; cette note ne certifie pas leur achèvement ou leur publication.
