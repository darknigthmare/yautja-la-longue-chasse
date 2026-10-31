# PHG/Yautja V136 — Quatre Excel opérationnels et traçabilité

L'export V136 du 31 octobre 2026 conserve les **15 feuilles** du classeur V135 et fournit quatre Excel distincts, avec données individualisées, indicateurs calculés, statuts éditables et sources.

| Fichier | Feuilles | Portée |
|---|---:|---|
| [Yautja_PHG_Personnalisation_Audit_Production_V136.xlsx](./Yautja_PHG_Personnalisation_Audit_Production_V136.xlsx) | 20 | 42 biomasks + 48 decals + 77 matériaux runtime + 156 sources V120 + 46 écarts |
| [Yautja_PHG_Fidelite_1to1_V136.xlsx](./Yautja_PHG_Fidelite_1to1_V136.xlsx) | 7 | 87 références et 323 actifs ; aucun 1:1 certifié sans preuve |
| [Yautja_PHG_Implementation_Status_V136.xlsx](./Yautja_PHG_Implementation_Status_V136.xlsx) | 8 | 323 actifs sur six morphologies, 18 contrats save, 16 parcours QA |
| [Yautja_PHG_Backlog_Production_V136.xlsx](./Yautja_PHG_Backlog_Production_V136.xlsx) | 7 | 383 tâches individualisées (29 P0, 205 P1, 149 P2), toutes ouvertes |

## Constat et refus des faux positifs
- **77** matériaux déjà enregistrés dans le moteur chromatique ; **156** sources V120, dont **149** matières candidates et **7** accessoires, ne sont pas intégrées automatiquement.
- **42** biomasks au suivi : **26** existants, **7** coques conceptuelles jouables et **9** candidats de modèles à confirmer. Un concept n'est pas un masque PHG exact.
- **48** decals originaux V133 répartis en 4 surfaces. Leurs IDs sont whitelistés, mais aucun n'a encore une validation artistique sur les 6 morphologies × 3 angles.
- **34** dossiers de fidélité préexistants restent non certifiés. La matrice V136 compte **323 actifs** (233 sources/matières + 42 biomasks + 48 decals) sans UV/pixel-match final prouvé.
- **383** tâches du backlog sont ouvertes (29 P0, 205 P1, 149 P2) ; un statut « intégré non validé » n'est **pas** « terminé 1:1 ».
- Le travail V136 ne modifie pas le jeu ; les correctifs V135 restent en PR. Au dernier contrôle, les tests ciblés étaient verts et la validation navigateur complète encore en cours. Ne pas fusionner automatiquement.

## Intégrité
Les quatre fichiers sont des XLSX valides, sans erreur de formule détectée. Les SHA-256 intégraux et identifiants Drive sont conservés dans [Yautja_PHG_V136_MANIFEST.json](./Yautja_PHG_V136_MANIFEST.json).

## Sources et périmètre
GitHub : https://github.com/darknigthmare/yautja-la-longue-chasse/pull/27

Noms officiels des masques/warpaints : https://forum.predator.illfonic.com/t/patch-notes-2-19/20975

La présence de noms dans un patch, ou d'une texture reconstituée, ne prouve ni carte UV/PBR officielle ni fidélité 1:1.
