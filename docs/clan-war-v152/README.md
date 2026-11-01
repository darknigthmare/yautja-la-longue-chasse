# V152 — Réconciliation sûre des sources des quatre modes et de Korthas

**Base vérifiée le 1er novembre 2026 :** PR [#77](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/77), commit `d29c9e4865aedff855c9a2f174569bc4c45385d6`, issue de PR #76 puis #61. **La branche plus ancienne [#75](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/75) est parallèle** à #77 ; ses modifications ne doivent pas être considérées comme automatiquement présentes ici. Le chantier des vues de gauntlet #42 reste distinct.

## Ce qui est intégré

- `app/game/systems/clanWarProvenanceGateV152.ts` : **contrôle en lecture seule** des comptes rendus `V115` et, si fourni, d'un reçu `W133`, validés par le lecteur V115 et le Conseil `buildWarCouncilAuditV146` réellement inclus dans la PR #77.
- La comparaison s'appuie sur les **véritables** territoires `rules.territories` de la Bible V6 et les territoires `warTerritoriesForSimulationV96` de l'exercice V85. `W3-Kxx` et `CON-Txx` **ne sont jamais réunis par suffixe, ordre de tableau, planète supposée ou nom ressemblant**.
- Les membres de V115 et les combattants de V85 demeurent deux catalogues d'identités ; toute collision d'ID est signalée, **pas homologuée comme identité**.
- Pour les **quatre modes** (assaut latéral, Outer Ops, infiltration/sabotage, RTS V115), le tableau remonte un `receiptId`, le résultat déjà consigné, l'ID de lieu source, les types d'unité, les pertes d'exercice et les éléments non prouvés. Le RTS W133 reste associé à sa **vraie planète** et à son étude source, sans transfert sur Korthas.
- `app/game/ClanWarPanelV85.tsx` : nouvelle section **Conseil V152**, qui inspecte la sauvegarde V115 uniquement après un clic explicite. L'onglet Korthas peut examiner la liste des lieux, les dossiers par mode et les risques. **Aucun bouton d'import militaire ou d'écriture** n'est ajouté.
- Aucun changement au moteur `clanWarOperationsV115.ts` ni aux protections Web Locks de la **V151**. La CI V152 rejoue leurs tests et leurs scénarios Chromium à deux onglets.

## Garanties et tests

`tests/clan-war-provenance-gate-v152.test.mjs` ajoute **10 contrôles** basés sur les véritables sources V6/V85 : résultats des quatre modes, terrain et planète, collisions d'identifiants, archives corrompues, faux SHA, source inconnue, carte RTS altérée, et conservation des **24 études W3 / 72 tâches**. Le runner conserve les suites V151 : moteur, Conseil, patrouille, trajet Outer Ops, intégrité de l'archive, verrou Web Locks et tests Chromium.

Tous les rapports locaux restent **des données contrôlables par le client**, non des événements signés par un serveur. Par construction :
`canConquer:false`, `canTransferTroops:false`, `canAwardXp:false`, `canUpdateWounds:false`, `serverAuthenticated:false`.

## Fidélité au lore — ne pas confondre référence et mécanique

Le mode principal de **Yautja — La Longue Chasse** reste *Dynasty Warriors-like* ; le RTS, les opérations déléguées, la furtivité et l'assaut latéral sont des modes complémentaires originaux. Les valeurs AP/RAV, statistiques et algorithmes n'établissent **aucun nouveau canon Predator/AVP/PHG**. Un rapprochement 1:1 des skins, masques, wrist gauntlets, bâtiments, planètes et armes nécessite références précises (œuvre, scène, angle, version, capture autorisée) et une **QA visuelle réelle**. Les 1 200 variantes V120 restent des **fiches de conception**, pas 1 200 niveaux jouables.

## Branches parallèles encore ouvertes

- **#75/#60/#58** : bilans documentaires de provenance, transfert à V85 libre et audit W3-K/CON-T dans une *autre lignée*. Cette PR **n'affirme pas avoir fusionné ces développements**.
- **#74/#71/#69/#72** : évolution du verrou multi-onglets, mémoire des patrouilles et marche forcée. Les mécanismes disponibles dans la base #77 sont conservés. Les PR distinctes ne doivent pas être comptées comme fusionnées.
- **#42/#66** : interface holographique gauntlet, autre lignée non modifiée.

## Encore ouvert

**Liaison géographique V6→V85 attestée**, correspondance vérifiable des personnages, signature d'événements par un serveur autoritaire, conséquences militaires transactionnelles, vraie guerre multi-clans persistante, coop/PvP réseau, scène/sprites 1:1 des œuvres et QA Next.js/manette. **Pas de déploiement V152 confirmé.** Les rapports et tableaux de bord sont des outils de suivi, pas un certificat de jeu achevé.

**Excel :** `docs/clan-war-v152/Yautja_ClanWar_V152_Provenance_QA.xlsx` complète sans effacer le classeur V151 de 5 feuilles. Il contient le registre des quatre modes, les garanties géographiques/identitaires, les tests et la feuille des chantiers 1:1, avec statuts calculés par formules.
