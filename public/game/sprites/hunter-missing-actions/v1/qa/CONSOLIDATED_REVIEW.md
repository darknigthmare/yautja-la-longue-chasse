# Revue consolidée des animations nouvelles

**Statut : draft ; revue artistique humaine requise.**

19 sources actuellement reliées à leurs SHA et examinées, soit 304 cellules source. Cible du lot : 19 planches, 14 actions et 304 dessins. Sélection complète examinée : oui.

Cette revue porte sur les images et leur correspondance avec les états existants. Elle ne valide aucun clip de gameplay et ne certifie pas une continuité anatomique parfaite.

## Couverture des sources

| Action de production | Dessins examinés |
| --- | ---: |
| `light_1` | 16 |
| `light_2` | 16 |
| `parry` | 16 |
| `combo_finisher` | 32 |
| `heavy_strike` | 32 |
| `air_strike` | 32 |
| `guard_break` | 32 |
| `dodge` | 16 |
| `run_forward` | 16 |
| `run_backward` | 16 |
| `climb_up` | 16 |
| `climb_down` | 16 |
| `jump` | 32 |
| `landing` | 16 |

## Contrôles des planches retenues

| Planche | Corps de bord alpha ≥16 | Bruit de bord alpha >2, cellules | Revue visuelle |
| --- | --- | --- | --- |
| `light_1` | Aucun | 13, 14, 15, 16 | batch-01-visual-review.md |
| `light_2` | Aucun | Aucun | batch-01-visual-review.md |
| `parry` | Aucun | Aucun | batch-01-visual-review.md |
| `combo_finisher_a` | Aucun | 13, 16 | batch-01-visual-review.md |
| `heavy_strike_a` | Aucun | Aucun | batch-01-visual-review.md |
| `air_strike_a` | Aucun | Aucun | batch-01-visual-review.md |
| `guard_break_a` | Aucun | 13, 15, 16 | batch-03-heavy-guard-review.md |
| `combo_finisher_b` | Aucun | Aucun | combo-finisher-b-corrected-review.md |
| `heavy_strike_b` | Aucun | Aucun | batch-03-heavy-guard-review.md |
| `air_strike_b` | Aucun | Aucun | air-strike-b-corrected-review.md |
| `dodge` | Aucun | 16 | batch-04-dodge-run-review.md |
| `run_forward` | Aucun | Aucun | batch-04-dodge-run-review.md |
| `guard_break_b` | Aucun | 13, 14, 15, 16 | batch-05-guard-retreat-climb-review.md |
| `run_backward` | Aucun | Aucun | batch-05-guard-retreat-climb-review.md |
| `climb_up` | Aucun | Aucun | batch-05-guard-retreat-climb-review.md |
| `climb_down` | Aucun | 13, 16 | batch-06-climb-jump-landing-review.md |
| `jump_a` | Aucun | Aucun | batch-06-climb-jump-landing-review.md |
| `landing` | Aucun | 1, 13, 14, 15, 16 | batch-06-climb-jump-landing-review.md |
| `jump_b` | Aucun | 13, 14, 15 | batch-07-jump-review.md |

Les dimensions et rectangles exacts sont dans `CONSOLIDATED_REVIEW.json`. La grille est arrondie comme JavaScript ; les cellules ne sont pas présumées uniformes lorsque la source mesure 1254 px. Les originaux restent identiques et les marges d’import ne les retouchent pas.

## Corrections et limites

6 tentatives inspectées ont été conservées hors sélection : les premières récupérations B ont nécessité une correction de raccord, et certaines locomotions une correction des lames sorties. Les raisons et SHA sont dans le JSON.

Deux calibrations de page seulement sont retenues : finisher B (+20,861091636008922 ; +4 px), lourde B (0 ; −6 px). Aucun redimensionnement, miroir ou recalage par frame n’a été recommandé. Les gestes aériens et de déplacement conservent leur mouvement.

Les courses avant/arrière ont un raccord de boucle à lisser. Les reprises A/B gardent des variations de stance, de pose et de mouvement secondaire. Les versions corrigées sont des sources draft utiles, pas des raccords sans couture certifiés.

Le côté gauche natif, les variantes d’arme/costume, le contrat modulaire Expédition et le binding au moteur restent ouverts. La réception demande un futur curseur de présentation ; la simulation actuelle ne doit pas être retardée pour montrer tous les dessins.

Ce lot traite des priorités et ne termine pas toutes les animations du jeu : 16 autres familles de sources ou d’intégration restent ouvertes. Les réserves complètes sont dans `ART_REVIEW_LIMITATIONS.md`. Les autres familles de sources et d’intégration encore nécessaires sont inventoriées dans `gap_audit_2026-11-10.json` et reprises dans le JSON consolidé.

## Périmètre vérifié

Inspection visuelle des sources sélectionnées ; alpha, marges, rectangles et SHA ; raccords concernés ; lecture des vrais états/timings du Hunt. Aucun test de combat dans le navigateur, mesure de performance ou approbation humaine n’est revendiqué par cette revue.
