# V146 — Les 30 fronts planétaires vérifiés dans le véritable panneau de guerre

**PR de travail :** [#42](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/42) · brouillon empilé sur #40 ; aucune fusion dans `main`.

## Écart V145 → V146 effectivement fermé

La V145 démontrait l'isolation de 30/30 planètes en tests de modèle Node, mais ne montait en Chrome que **Korthas et Thalassa**. L'absence de navigation réelle sur les 28 autres planètes et le seuil de **24 sessions non-Korthas en mémoire** restaient ouverts.

La V146 monte le **vrai `ClanWarPanelV85`**, le **`ClanWarPlanetsV96`** et l'unique **`ClanWarAtlasV95`** dans Chromium, en utilisant la fixture de campagne isolée V143 (pas de simulation contrefaite). La sélection se fait par le **menu natif** « Planète active ».

## Preuves V146 vérifiées

[Workflow GitHub Actions V146 réussi](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41253064227) :

- Les **30 IDs officiels** du registre `WAR_PLANETS_V96` sont réellement sélectionnés et affichés dans l'interface.
- Chacun des **30 tours 2** est commandé au moyen des **deux vrais boutons** de relecture/confirmation, et non écrit artificiellement depuis le test.
- Les 30 archives localStorage possèdent une **clé unique**, un identifiant planétaire cohérent et un tour 2.
- Les **30 sceaux IndexedDB** correspondants sont retrouvés en phase `confirmed`, avec identifiant et tour vérifiés.
- Après la 30e sauvegarde (au-delà de la limite des **24 sessions**), les 30 mondes sont **rouverts en ordre inverse** : tour 2 toujours conservé, un seul atlas par front, aucune fausse alerte de conflit entre onglets.
- La sentinelle représentant une autre sauvegarde de campagne reste inchangée.
- **Zéro erreur de page** dans ce contrôle.

Le rapport structuré, les sept captures d'échantillons et les preuves IDB sont joints à [l'artefact V146 de GitHub Actions](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41253064227/artifacts/13062216554).

**Classeur :** [Yautja_ClanWar_V146_30Planetes_Chrome.xlsx](Yautja_ClanWar_V146_30Planetes_Chrome.xlsx), cinq feuilles, 30/30 planètes « PASS Chrome V146 » et 0 planète sans preuve *pour ce scénario précisément*.

## Ce que ces résultats ne démontrent pas

- La fixture de test monte le vrai panneau V85 mais pas la navigation complète depuis `GameClient` ni une véritable planète parcourue à pied.
- Le test ne vérifie **pas** les quatre modes spécialisés V115 (assaut latéral, infiltration/sabotage, RTS, Outer Ops) : ces missions sont un exercice V6 distinct, qui possède sa propre archive. Leurs rapports, unités et missions ne doivent pas être attribués au tour d'une planète V85 sans raccordement explicite.
- Aucune synchronisation **entre appareils** ou **cloud** n'a été ajoutée. Les tests multi-onglets V145 utilisent un seul contexte navigateur.
- Les mondes procéduraux générés après la création de la campagne, la Terre avec une géographie terrestre réelle et toutes les scènes jouables restent un autre périmètre.
- Aucun des **54 gauntlets** n'a reçu une validation artistique 1:1 ni une validation des licences de distribution.

## Prochaines priorités

1. Vérifier en **véritable Chrome** les quatre formats V115, en préservant l'archive indépendante, le matériel et les états entre modes.
2. Associer les théâtres de mission spéciaux aux mondes sans inventer des lieux canoniques sur les mauvaises planètes.
3. Conserver les preuves de sauvegardes entre appareils distinctes, tests de stress et vrais scénarios multi-utilisateurs comme travaux **ouverts**.
4. Poursuivre les références visuelles film/jeu sur chaque gauntlet ; le 1:1 requiert une revue humaine de l'accessoire authentique.

Le moteur principal de la chasse et la résolution des guerres restent inchangés par cette démarche de QA.
