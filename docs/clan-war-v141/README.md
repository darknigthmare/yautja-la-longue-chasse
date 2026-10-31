# V141 — Quatre modes en parallèle : combats, routes, leurres et tactique

**Branche** `feat/v141-four-modes-combat-route-decoy-ai-20261031` ; **base** PR #50 V140. Dépendances : #29 → #34 → #36 → #37 → #38 → #40 → #41 → #43 → #44 → #45 → #46 → #47 → #48 → #50 → V141. **La PR #42 gauntlet ne doit pas être modifiée.**

## Mécaniques implémentées sur le vrai moteur

| Mode | Changement | Invariant vérifiable |
|---|---|---|
| **Assaut latéral** | `warAssaultContactV141` : échange de dégâts simultanés, les combattants vivants au début du tour agissent tous ; déplacement 1D borné et entrées en contact non franchissables | L'ordre des acteurs dans le tableau ne favorise plus un camp. Les unités continuent de provenir des 30 formations V6 et des vagues finies V140. Aucun recrutement ni RAV V85 |
| **Outer Ops** | `warOuterWeightedProgressV141` : chronologie des tronçons basée sur **`passages.movementCost` des vraies fiches V6**, plus progression du tronçon courant et retour uniquement par les passages réellement atteints | Halte de 15 s sans déplacement, rappel cohérent, aucun antagoniste caché ni victoire avant la date, les anciennes missions conservent leurs IDs et sauvegardes |
| **Infiltration / sabotage** | `warStealthDecoyPatrolV141` : leurre **à position X/Y**, marche d'une case maximum par tour vers le point de patrouille atteignable le plus proche du leurre, en contournant tous les murs V116 | `decoyY` est facultatif en sauvegarde V115 ; les archives V135 avec `decoyX` seul continuent à fonctionner. Correction du test de proximité lorsque `guardY` change |
| **RTS multi-escouades** | IA de poursuite évitant, **si une route sûre existe**, les `map.hazards` qui deviendront actifs au tour suivant, exactement comme le planificateur joueur | Aucun déplacement à travers un ennemi ou une porte sans courant ; pas de position cachée révélée, pas d'immunité adverse ; les dégâts de zone V140 s'appliquent toujours symétriquement |

## Code et QA

- Nouveau : `app/game/systems/clanWarAssaultContactV141.ts`, `clanWarOuterWeightedProgressV141.ts` et `clanWarStealthDecoyV141.ts`.
- Modifié : `clanWarOperationsV115.ts`, `clanWarRtsSquadsV133.ts`, les interfaces `ClanWarOperationsV115.tsx` et `ClanWarRtsSquadsV133.tsx`.
- Tests : `tests/clan-war-four-modes-v141.test.mjs` + intégralité des régressions V115 à V140, `tsconfig.clan-war-v141.json`, workflow `.github/workflows/clan-war-v141.yml`. Le statut de la CI sur le **dernier commit** doit être vérifié avant fusion.
- L'Excel V141 conserve toutes les feuilles V140 (52), les **1 200 variantes design-only**, les 24 études RTS W3, les 12 cartes, les 36 dossiers W5 et le tableau de pilotage. Les exigences et contrôles QA V141 sont ajoutés **sans déclarer les anciennes missions terminées**.

## Fidélité : ne pas confondre lore et gameplay

L'assemblage de vagues, les coûts AP/RAV, les durées d'itinéraire, les trajectoires de patrouille et les réactions ennemies sont **des mécaniques originales du projet**, pas des faits attestés dans Predator, AVP Extinction ou PHG. L'architecture reste un mode additionnel au gameplay principal **Dynasty Warriors-like**. Les cités terrestres ne se retrouvent pas sur une planète extraterrestre.

**Reste ouvert :** 1 200 scènes de combat réalisées, IA de guerre totale multi-factions, monde/sauvegarde V85 persistants, serveur multijoueur, assets films/comics/jeux fidèles 1:1, optimisation mobile et validation en session navigateur/manette. La CI du prototype ne vaut pas certification canonique ou QA produit complète.

## Excel et QA ajoutés à cette PR

Le classeur binaire `docs/clan-war-v141/Yautja_Guerres_Clans_Suivi_Production_V141_2026-10-31.xlsx` possède **59 feuilles** : les 52 onglets V140 hérités, quatre nouveaux suivis par mode, `QA_V141`, `CROISEMENTS_V141`, `SUIVI_V141`. Il comprend **68 exigences** (17/mode), **72 procédures QA** (18/mode), **36 contrats inter-modes**. Les statuts de production sont **42 validés en CI ciblée**, **8 prototypes partiels** et **18 à développer**. Parmi les 72 QA : **56 disposent de preuves de CI ciblée**, **16 sont à réaliser manuellement**. Aucun des 1 200 scénarios design-only V120 n'est déclaré finalisé.

Le fichier a été exporté avec `artifact_tool` depuis le classeur V140, en conservant les 1 200 IDs V120, 24 scénarios W3, 12 cartes et 36 W5. Aucun renvoi QA orphelin ni erreur de formule détecté lors du contrôle local. Git blob SHA binaire `f94612c6b782158d9f3d94a50d72648980b9eec2`.

**Contrôles :** le code au commit `62c343d` a passé **118/118 tests, TypeScript et ESLint sans avertissement** ([run 41213949629](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41213949629)). Un test complémentaire `tests/clan-war-production-v141.test.mjs` est inclus dans le workflow V141 : il vérifie sur le **fichier réellement commité** les 59 feuilles, les 68/72/36 IDs et les anciens catalogues, sans utiliser de substitut CSV. Le nouveau commit code + classeur doit repasser la CI avant fusion.
