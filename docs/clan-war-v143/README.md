# V143 — Guerres de clans : quatre modes poursuivis en parallèle

**PR empilée sur #52 (V142)** ; chaîne historique #29 → #34 → #36 → #37 → #38 → #40 → #41 → #43 → #44 → #45 → #46 → #47 → #48 → #50 → #51 → #52 → V143. Le **gauntlet holographique #42** reste parallèle et n'est pas modifié.

## Mécaniques réelles du code (prototypes originaux)

| Mode | Ajout V143 | Règles et restrictions |
|---|---|---|
| **Assaut latéral** | `commandWarAssaultBraceV143` : posture de défense **14 AP**, deux vrais échanges, **−1 dégât sur chaque attaque réelle** sans annuler totalement l'attaque | Équipe V6 déjà déployée et vivante, côté ami x≤40, une seule posture/équipe. Bracing immobile, expiration contrôlée en sauvegarde. Pas de guérison ou de nouveau bouclier canonique |
| **Outer Ops** | `warOuterIncidentV143` et `commandWarOuterIncidentV143` : un événement **tiré du vrai texte de passage V6**, au tronçon actuellement traversé ; choix « sécuriser » (**2 RAV réels**, +3 capacité d'exercice) ou « détour » (**+10 s de trajet**, +2 capacité) | Un seul incident par mandat, aucune téléportation, nouvelle échéance réelle, route et personnes inchangées ; compatibilité recon V137, rappel V116, choix d'itinéraires V142 et archives anciennes. Issue toujours inconnue jusqu'au rapport |
| **Infiltration/sabotage** | `commandWarStealthDashV143` : sprint **2 cases / 2 tours** dans une vraie direction sur le terrain W3 | Coût **2 énergie**, non camouflé, une seule fois/mission, les obstacles sont vérifiés sur **chaque case** ; deux réactions de patrouille, arrêt immédiat à l'issue d'une mission ; pas de téléportation |
| **RTS multi-escouades** | `commandWarRtsMarchV143` : jusqu'à **3 ordres de marche V142 consécutifs** vers observation, objectif dévoilé ou extraction | Le moteur prend en compte les portes, la météo, les alliés, les ennemis visibles et les collisions réelles sur **chaque tour** ; stop sur perte/rencontre ou changement d'état. Chaque pas déclenche sa véritable réaction ennemie ; RAV non consommés par la marche |

## Source et fidélité

Les unités, rôles, portées et passages viennent de `WarRulesV6` et les cartes/biomes W3 des sources V116/V128/V129. Le gameplay principal attendu demeure **Dynasty-Warriors-like** ; ces quatre modes sont des extensions, pas une copie d'AVP Extinction. Les mécaniques V143 sont **des règles originales du jeu**, pas du canon films, comics ou PHG.

Les anciens champs de sauvegarde V115 restent facultatifs : `braceUsedIds`/`bracedUntil`, `routeIncident`, `dashUsed` sont validés et leurs versions antérieures restent lisibles. Les quatre modes opèrent dans un environnement d'**exercice libre**, pas dans la campagne V85. Aucune conquête ni recrue persistante silencieuse.

## Tests et suivi

La CI dédiée `.github/workflows/clan-war-v143.yml` inclut `tests/clan-war-four-modes-v143.test.mjs`, les régressions V115–V142, TypeScript et ESLint. L'Excel `Yautja_Guerres_Clans_Suivi_Production_V143_2026-10-31.xlsx` conserve les **66 onglets V142** et ajoutera quatre onglets de modes, les contrôles QA, interactions inter-modes et pilotage avec formules.

**Toujours ouvert :** QA navigateur/manette, performances, scène cinématographique réellement fidèle 1:1, serveur multijoueur, raccord des ressources à V85 et les 1 200 niveaux complets. « Validé CI ciblée » n'est pas un statut de production finale.
