# V139 — Progression simultanée des quatre modes de guerre des clans

**Branche:** `feat/v139-clan-war-four-modes-20261031`. **PR:** #48, empilée sur #47 (V138), elle-même sur #46, #45, #44 et #43. **PR #42 (gauntlet) inchangée.**

## Mécaniques nouvellement implémentées

| Mode | Changement réel | Conditions et refus |
|---|---|---|
| Assaut latéral | `fallbackWarAssaultV139`: retour contrôlé du même groupe vers son bastion, pas borné par mobilité de la véritable formation V6, coût 8 AP, couloir réellement occupé bloquant | Groupe vivant déjà engagé x>5; max 20 ordres. Ennemi derrière, tenue active, manque AP, groupe extrait = refus sans mutation. Rend enfin possible le retour physique suivi d'une extraction V137 |
| Outer Ops | `departureContext` sauvegardé au lancement, lu par `simulateWarOuterMissionV115`: fixe à T0 intel, relai affaibli, escorte et pression réellement connus | Réussite/sabotage d'autres modes après départ ne bonifie plus rétroactivement une mission en cours. Anciens mandats V115 sans snapshot relus en mode legacy; falsifications de type/plafond de pression refusées. Résolution et rapport restent différés |
| Infiltration/sabotage | `quiet-sabotage`: relais désactivé à distance physique <=1 contre 2 points d'énergie sans alarme **automatique** | Garde trop proche, personnage camouflé, batterie insuffisante, relais déjà coupé ou action à distance: rejet. La patrouille réagit à son tour et peut toujours repérer l'action. Extraction physique encore obligatoire |
| RTS multi-escouades | `evacuateWarRtsSquadV139`: une unité survivante revenue à la sortie W3 quitte la carte, son statut devient `evacuated` et le reçu final garde son ID | Au moins un autre groupe reste au front; pas d'évacuation du porteur d'une personne/charge non transférée, d'un chef tenant un poste ou d'un groupe distant. Aucune recrue, RAV, victoire ou XP automatique |

Tous ces ordres sont **des règles originales du jeu** et non des capacités authentifiées comme canoniques par un film, comic ou jeu Predator. Le gameplay principal prévu reste Dynasty-Warriors-like, non une copie d'AVP Extinction.

## Code, interface et tests

- `app/game/systems/clanWarParallelModesV139.ts` : repli latéral.
- `app/game/systems/clanWarOperationsV115.ts` : briefing d'Outer Ops immuable, commande de sabotage discret et validations d'archives.
- `app/game/systems/clanWarRtsSquadsV133.ts` : extraction individuelle physique et reçus de missions.
- `app/game/ClanWarOperationsV115.tsx` et `app/game/ClanWarRtsSquadsV133.tsx` : commandes visibles au joueur dans les quatre modes.
- `tests/clan-war-four-modes-v139.test.mjs` : dix contrôles d'acceptation scénarisés, erreurs et garde-fous. CI conserve les régressions V115 à V138, tsc et ESLint.
- `docs/clan-war-v139/Yautja_Guerres_Clans_Suivi_Production_V139_2026-10-31.xlsx` : 45 feuilles prévues; 38 feuilles historiques et 7 nouveaux onglets (4 modes × 15 exigences, QA 56, croisements 28, pilotage). Les 1 200 variantes V120 sont toujours **design-only**, les 24 scénarios W3 et 36 dossiers W5 ne sont pas des campagnes complètes.

## Acceptation et limites

La V139 n'est pas une guerre totale RTS finalisée. Elle ne crée pas le serveur multijoueur, les grandes armées persistantes, la conquête V85, les scènes de film 1:1, les animations/armes/trophées certifiés ou les 1 200 niveaux physiques. La CI ne couvre pas les performances sur navigateur réel et téléphone/manette. Les mêmes localisations extraterrestres sont maintenues, sans transporter les villes terrestres sur d'autres planètes.

**Statut initial :** code à valider en CI; PR brouillon jusqu'au dernier test et QA manuelle. L'Excel intégrera les statuts effectivement vérifiés, pas des promesses.
