# V147 — Les quatre gameplays V115 lancés et repris en vrai navigateur

**PR de travail :** [#42](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/42), brouillon empilé sur #40. Aucune fusion dans `main`.

## Défaut corrigé

Avant V147, l'archive `WAR_OPERATIONS_STORAGE_V115` conservait bien la vraie mission mais, lors d'un rechargement, le sélecteur revenait par défaut à **Assaut** (`mode="assault"`) même lorsque le front V115 archivé était `stealth`, `rts` ou `outer`. L'écran pouvait également afficher un autre territoire que celui de la mission sauvegardée.

`app/game/ClanWarOperationsV115.tsx` restaure désormais :
- le mode depuis `current.active?.mode`, sinon `outer` lorsque des mandats sont en vol, sinon le mode initial du scénario ;
- le territoire depuis `current.active?.targetId`, sinon la première opération déléguée ;
- le détachement RTS sélectionné depuis `current.active.teamIds[0]` lors d'une reprise RTS ;
- **sans réinitialiser** les effectifs, coûts, blessures, délais, rapports ou ressources, et sans écrire la campagne.

## Test Chromium réel V147 — quatre missions

Le banc `scripts/qa-clan-war-four-modes-v147.mjs` utilise les vrais composants `ClanWarOperationsV115`, `createWarOperationsV115`, `DEFAULT_WAR_RULES_V6` et `warMissionEligibleV115`, dans **quatre contextes de navigateur isolés**. Le mode est commandé en UI, les équipes sont choisies depuis le véritable roster V6 et le bouton **Lancer** dépense les RAV réels d'exercice.

[Exécution du vrai navigateur et capture des épreuves](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41253427917) : tests métier Node **19 réussis, 0 échec**, et preuves Chrome :

| Mode | Ouverture | Reprise après actualisation | Conservation du territoire |
| --- | --- | --- | --- |
| Assaut latéral | PASS | PASS | PASS |
| Outer Ops / opérations déléguées | PASS | PASS | PASS |
| Infiltration/sabotage | PASS | PASS | PASS |
| RTS | PASS | PASS | PASS |

Deux scénarios additionnels ont réussi : un mouvement réel d'infiltration après reprise incrémente l'horloge de la même archive, et le changement cosmétique du gauntlet pour Wolf **n'altère pas un seul octet JSON de l'exercice**. Une sentinelle `SaveGame` externe reste inchangée.

Le premier run V147 ci-dessus affichait un échec de workflow **uniquement parce que l'Excel V147 n'avait pas encore été commité au moment de son checkout** : le log confirme que les épreuves du moteur et Chromium ont abouti avant l'étape ZIP. Les run(s) postérieurs comportant l'Excel sont à relire séparément pour la validation intégrale du workflow. Ne pas confondre un test Chrome vert avec une CI complète verte.

### Suivi Excel

[Classeur V147 mis à jour](Yautja_ClanWar_V147_Quatre_Modes.xlsx) : cinq onglets, quatre modes marqués PASS Chrome V147, 8 lancements/reprises et preuves détaillées, formules recalculées, toutes les restrictions de lore et de campagne préservées.

## Séparation stricte des simulations

**V115 = exercice V6 distinct**. Ses territoires W3-K, ses formations W3-U, son temps de mission, son RAV et ses rapports ne sont ni la conquête `WarSimulationV85` ni des scènes de la chasse de `GameClient`. Aucun mode n'annexe automatiquement un site V85, ne donne un trophée de campagne, et **aucun gauntlet ne modifie les dégâts ou la puissance du clan**.

La V146 a séparément prouvé [30/30 mondes V85 en navigateur](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41253064227) avec tours 2 et sceaux IndexedDB. V147 teste les **quatre types de gameplay V115**, pas leur implantation sur chacun de ces 30 mondes.

## Travaux non fermés

- Réelles missions V115 complètes, rapport final, blessures, IA et enchaînement de temps prolongé : le test V147 vérifie le **lancement, la sauvegarde, la reprise et la neutralité cosmétique**, pas une campagne terminée.
- Deux onglets V115 simultanés face à l'archive d'opérations, avec minuteurs et récupération de conflit ; les barrières V85 testées en V144 ne s'appliquent pas automatiquement au V115.
- Raccordements par planète / biome / routes, sans attribuer un lieu terrestre à une planète extraterrestre ni remplacer la Bible V6 par des règles non documentées.
- Parcours complet `GameClient` titre → armurerie → guerre → chasse et appareils/cloud.
- Fidélité 1:1 **0/54** : prototypes SVG/PNG de travail, références de film et approbation artistique manquantes ; droits Predator/AVP à revoir.

La PR reste en **draft** : ne pas fusionner sur `main` ni prétendre que toutes les animations, les 30 théâtres V115 et tous les accessoires sont terminés.
