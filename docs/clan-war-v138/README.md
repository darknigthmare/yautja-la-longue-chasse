# V138 — Guerres des clans : quatre game modes poursuivis simultanément

**Branche :** `feat/v138-four-modes-tactics-intel-medics-20261031` • **Base :** PR #46 V137. Les modes du gauntlet holographique sont conservés dans la PR #42, non modifiés ici.

## Ce que contient réellement le code V138

| Mode | Mécanique intégrée | Garde-fous et origine |
|---|---|---|
| **Assaut latéral** | `commandWarAssaultSurgeV138` : une formation V6 déjà déployée accélère son mouvement latéral de **2 à 5 unités** pour **12 AP**, une fois par détachement. Le trajet stoppe physiquement devant le premier rival et avant la base adverse. | Jamais de traversée des ennemis, de soldats créés, d'attaque gratuite, de RAV ou de conquête. Pas d'ordre pendant tenue défensive, ni après extraction. |
| **Outer Ops** | `requestWarOuterSignalV138` : après la moitié du **trajet initial**, une escouade fournit un bulletin unique indiquant les passages déjà connus, l'exposition générale du terrain V6 et le nombre de membres actuellement aptes. | Ne révèle aucun ennemi/garnison caché, ne calcule pas la victoire, ne supprime ni la route ni l'échéance. Fonctionne même après une halte V137 sans autoriser une demande prématurée. |
| **Infiltration/sabotage** | `commandStealthV115("listen")` : écoute locale depuis une **case de couvert**, batterie **−1**, garde à **cinq cases ou moins**, deux usages max. Retourne seulement **est / ouest / proche** pendant deux tours ; `warStealthGuardVisibleV138` masque l'emplacement de la patrouille hors portée ou derrière un obstacle. | Aucun scan omniscient ni vision thermique définitive n'est inventé ; les gardes réellement à côté restent visibles. L'énergie, le compteur et le bulletin expiré sont contrôlés par l'archive V115. |
| **RTS multi-escouades** | `commandWarRtsMedicV138` : une **vraie formation W3-U18**, définie par les règles de source V6 et déployée, peut relever un allié neutralisé sur une case adjacente en consommant **3 RAV d'exercice** et un tour. Le pion récupère **2–4 PV** ; les noms, IDs et effectifs ne changent pas. | Un seul soin par médecin et patient, aucune résurrection à distance, aucune nouvelle recrue ni XP, aucune mutation de la campagne persistante V85. Le tir adverse peut reprendre au tour du soin. |

Tous les coûts, portées et seuils AP/RAV sont des **règles originales de notre jeu**, et **non des données canoniques** des films, comics ou `Predator: Hunting Grounds`. Les six planètes/source W3 demeurent distinctes des localisations terriennes (Gunnison, Los Angeles, Bouvet) ; aucune ville réelle n'est déplacée dans les cartes extraterrestres.

## Répercussions et scénarios de test

- Moteurs : `app/game/systems/clanWarParallelModesV138.ts`, extensions de `clanWarOperationsV115.ts` et `clanWarRtsSquadsV133.ts`.
- UI : `ClanWarOperationsV115.tsx` (percée, bulletin de mi-parcours, écoute directionnelle et brouillard) et `ClanWarRtsSquadsV133.tsx` (soins physiques W3-U18).
- QA : `tests/clan-war-four-modes-v138.test.mjs` ; régressions V115/V133/V134/V135/V136/V137 avec TypeScript et ESLint dans `.github/workflows/clan-war-v138.yml`.
- Tableur de production : `Yautja_Guerres_Clans_Suivi_Production_V138_2026-10-31.xlsx`, **38 feuilles** avec **56 exigences V138** (14 par mode), **48 contrôles QA** (12 par mode) et **24 interactions documentées** ; les 1 200 fiches V120, les 24 scénarios RTS, les 12 cartes et les 36 dossiers W5 sont conservés.

## Limites et critères de fin

Les preuves testées sont des **tests ciblés de simulation**, pas une homologation de gameplay complet. Les 1 200 variantes sont encore des **fiches de conception**, pas 1 200 scénarios jouables. L'assaut reste 1D latéral expérimental, Outer Ops dépend de l'horloge de l'appareil, l'infiltration utilise un labyrinthe 9 × 6 et le RTS W3 est une escarmouche tactique ; **aucune sauvegarde principale V85** ni serveur multijoueur n'est raccordé par ces ajouts.

Restent les sprites fidèles aux œuvres avec références distinctes par apparition, les architectures locales 1:1, les campagnes multi-mondes, la logistique et les montures/vaisseaux en environnement 2.5D, la QA manette/mobile et l'équilibrage en conditions de grande guerre. **Ne pas fusionner seule cette PR empilée avant #46 et la chaîne précédente.**
