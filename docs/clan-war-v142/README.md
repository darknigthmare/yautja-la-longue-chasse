# V142 — Guerres des clans : quatre modes avancés ensemble

**PR empilée sur #51 V141** ; cette branche ne fusionne et ne modifie ni la PR #42 des gauntlets ni la campagne principale. Mode stratégique et RTS sont des **modes additionnels** : le cœur du jeu reste prévu en **Dynasty-Warriors-like**.

## Nouveautés réellement codées

| Mode | Fonction | Contrainte physique / budget / lore |
|---|---|---|
| Assaut latéral | `issueWarAssaultFocusV142` et échange V141 étendu : chaque détachement réel peut acheter **un ordre de tir prioritaire** pour **12 AP**, +1 dégât **sur une seule salve valide**, avec expiration à deux tours | La cible est une formation rivale vivante et visible dans la **portée W3-U V6**, sans adversaire intermédiaire. Une seule utilisation par groupe de combat. Pas de création de soldats, RAV, expérience ou arme de film |
| Outer Ops | `warOuterRouteChoicesV142` : jusqu'à **trois itinéraires réellement praticables** calculés sur `planWarRouteV6` (orientation, capacité PC, coûts de passage, conditions source). L'ordre de mission peut enregistrer la sélection exacte | Un passage inventé, une capacité insuffisante ou un chemin non proposé bloque le départ sans immobiliser de membre ou dépenser des RAV. Le délai supplémentaire dépend du coût V6 ; une route source verrouillée est vérifiée à l'import |
| Infiltration/sabotage | `planWarStealthStepV142` et `commandWarStealthStepV142` : **un seul déplacement orthogonal par commande** sur un itinéraire vers le relais ou l'extraction | Détection et réaction de la patrouille normales. Calcul sur le **terrain public** seulement, jamais les coordonnées cachées du garde. Aucune téléportation, aucun sabotage ni succès automatique |
| RTS multi-escouades | `planWarRtsWaypointV142` et `commandWarRtsWaypointV142` : guider **une seule escouade et une seule case** vers reconnaissance, étape observée ou extraction | Collisions, obstacles, portes sans courant, cases occupées, risques de météo au prochain tour, ennemis **visibles seulement** dans le plan. Objectifs masqués restent masqués avant reconnaissance. Une seule réaction adverse/tour, RAV inchangés si simple déplacement |

## Fichiers / compatibilité

Nouveaux moteurs `app/game/systems/clanWarOuterChoicesV142.ts`, `clanWarFocusV142.ts`, `clanWarStealthPathV142.ts`, `clanWarRtsWaypointV142.ts`. Moteurs V115/V141 et écrans `ClanWarOperationsV115.tsx` / `ClanWarRtsSquadsV133.tsx` mis à jour. La sauvegarde libre `V115 version:1` reste lisible : les champs V142 (`routeChoiceId`, `focusOrders`, `focusUsedIds`) sont **optionnels** et validés pour empêcher les faux coûts ou ordres.

La CI `.github/workflows/clan-war-v142.yml` lance `tests/clan-war-four-modes-v142.test.mjs` en plus de toutes les régressions V115–V141, TypeScript et ESLint.

## Suivi Excel et étapes non terminées

Le fichier `docs/clan-war-v142/Yautja_Guerres_Clans_Suivi_Production_V142_2026-10-31.xlsx` prolonge les **59 onglets V141**, les **1 200 variantes design-only**, les 24 missions RTS W3, 12 cartes et 36 dossiers W5. Les nouveaux états CI et vérifications manuelles sont distincts. Il doit être testé sur ses **octets réels dans GitHub** avant fusion.

**Non livré :** 1 200 niveaux réels, guerre totale multi-clans, sauvegarde/garnisons V85 persistantes, serveur coop/PvP, sprites et armes cinématographiques attestés 1:1, QA manette/navigateur et déploiement Vercel. Les ordres et coûts AP/RAV supplémentaires sont des règles **originales du jeu**, pas une assertion de continuité Predator, comics ou PHG.

## Suivi V142 effectivement versionné et statut GitHub Actions

Le fichier `docs/clan-war-v142/Yautja_Guerres_Clans_Suivi_Production_V142_2026-10-31.xlsx` prolonge **les 59 feuilles V141 par sept nouveaux onglets**, soit **66 feuilles**. Il contient **72 exigences** (18 par mode), **80 contrôles QA** (20 par mode), **40 contrats inter-modes**, toutes les références QA résolues et un dashboard calculé par formules.

Le commit `45dc5c6` a validé **129/129 tests Node**, TypeScript et ESLint, [GitHub Actions 41217778517](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41217778517). La synthèse indique **46 exigences en CI ciblée**, **8 prototypes partiels**, **18 à développer**, **64 contrôles QA en CI ciblée** et **16 procédures manuelles ouvertes**.

Le nouveau test `tests/clan-war-production-v142.test.mjs` vérifie les octets du **véritable classeur GitHub** : 66 feuilles, 72 IDs de production, 80 QA, 40 croisements, préservation des 1 200 missions V120 design-only, 24 missions W3 RTS, 12 cartes et 36 missions W5, ainsi que l'absence d'erreurs de formule.

**Important :** validation du code ≠ validation de la version Excel committée tant que la CI de son dernier commit n'a pas réussi.
