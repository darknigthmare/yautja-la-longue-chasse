# V140 — Reprise des points ouverts du classeur des guerres de clans

**Base GitHub : PR #48 (V139)**. PR V140 empilée au-dessus ; gauntlet holographique #42 inchangé. Cette itération choisit quatre entrées réellement **ouvertes** du classeur V139, une par gameplay. Elle ne convertit pas artificiellement les autres lignes « à développer » en fonctionnalités achevées.

## Exigences choisies dans V139 et état de V140

| ID source | Game mode | Réalisation V140 | Périmètre réel / ce qui reste |
|---|---|---|---|
| `CW139-ASS-010` | Assaut latéral | `planWarAssaultWavesV140` : liste déterministe de renforts de simulation, chaque W3-U et coût PC existant dans la Bible V6, budget total limité aux PC de garnison du territoire, tickets persistés dans l'archive V115. Le moteur n'invente plus une unité mondiale tous les huit tours sans plafond | **Partiel tant que les vagues n'ont ni cartes latérales détaillées, ni véritables zones de spawn, ni rôles IA finaux.** Les vagues ne préemptent pas le budget de campagne V85 |
| `CW139-OUT-010` | Outer Ops | `planWarOuterIncidentsV140` : événements déterministes issus des **passages V6 réellement traversés**, au plus trois aléas ; pénalité de difficulté bornée à 4. Leur présence n'est divulguée dans le journal de résolution qu'à l'échéance. La carte de routes est préservée | **Partiel** : météo locale évolutive, incidents jouables et secours différés non faits. Aucun renseignement de garnison cachée ni victoire anticipée |
| `CW139-INF-010` | Infiltration/sabotage | Interrupteur physique au panneau (7,3) des six environnements tactiques W3-KR ; commandes `cut-grid`/`restore-grid` à portée réelle, énergie consommée, deux interventions maximum ; la vraie case de porte motorisée (7,2) est bloquée pendant la panne | **Partiel** : pas encore de réseau complexe de capteurs, éclairages multi-pièces, vaisseaux film 1:1 ; gardes physiques continuent leurs patrouilles |
| `CW139-RTS-012` | RTS tactique multi-escouades | `planWarRtsTrafficV140` et `commandWarRtsTrafficV140` : priorité au groupe leader proche de l'objectif, circulation sur cases libérées, recalcul des itinéraires autour des groupes encore présents, une seule réaction ennemie par ordre collectif. Collision réelle contrôlée à l'exécution sans fuite sur les adversaires invisibles | **Partiel** : gestion d'armées massives, montures grandes tailles, portes en réseau et serveur autoritaire à développer |

## Invariants

- Source : `app/game/clanWarBibleV6Source.json`, 30 formations, 36 territoires, 70 passages ; tous les mondes et biomes restent rattachés à leur planète. Les quatre mécaniques V140 sont des choix de gameplay originaux, non des spécifications canoniques film/comic/PHG.
- Déplacements : une case tactique par escouade et par tour, jamais de swap caché ; aucune traversée de porte fermée, mur, eau profonde, lave ou patrouille réelle.
- Récompenses : aucune progression, annexion, XP, recrutement ou RAV de campagne V85 fictif. La sauvegarde V115 reste `version:1` et accepte les anciennes archives sans états V140.
- Interface : historiques des vagues d'assaut visibles, niveau de risque des passages publics, circuit et porte clairement dessinés, commande de déblocage de circulation RTS séparée de l'ancien ralliement V134.
- Assurance : `tests/clan-war-open-backlog-v140.test.mjs` vérifie les 36 territoires, les scénarios et passages source, les six terrains d'infiltration, les 24 scénarios RTS, les coûts, refus atomiques et archives. Régressions antérieures + TypeScript/ESLint. La QA navigateur/manette reste ouverte.

## Excel et suivi non achevé

Le classeur `Yautja_Guerres_Clans_Suivi_Production_V140_2026-10-31.xlsx` reprend les **45 feuilles V139** sans effacer les 1 200 variantes de conception, 24 scripts RTS W3, 12 cartes, 36 missions W5, ni les travaux du gauntlet. Il comporte des feuilles V140 pour les exigences ouvertes réellement touchées, les contrôles QA, le tableau de bord et les restantes. Le statut « validé CI ciblée » ne sera attribué qu'après réussite du dernier commit ; les quatre points restent au stade **prototype partiel**, car une correction d'IA ou de logique n'est pas une carte finalisée 1:1.

La chaîne de fusion demeure #29 → #34 → #36 → #37 → #38 → #40 → #41 → #43 → #44 → #45 → #46 → #47 → #48 → V140 (avec #42 parallèle). Ne pas fusionner le dernier PR directement dans `main` avant ses parents.

## État vérifié au 31 octobre 2026

- **CI du moteur V140**, commit `994f2d2` : [Actions 41204460402](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41204460402) : **105/105 tests Node verts**, TypeScript/ESLint verts. Tous les nouveaux tests de source V6, circuits, trajectoires W3 et archives ont été réellement exécutés.
- Les formations W3-U des garnisons V6 sont désormais créées comme **détachements proportionnels aux PC de garnison**, et jamais comme une équipe complète gratuite si son coût PC dépasse la garnison. Leurs effectifs et PV sont diminués proportionnellement, les tickets de spawn validés avec la source exacte.
- **Classeur V140 effectif :** `docs/clan-war-v140/Yautja_Guerres_Clans_Suivi_Production_V140_2026-10-31.xlsx` : **49 onglets** (45 hérités + `POINTS_OUVERTS_V140`, `QA_V140`, `PRIORITES_V140`, `SUIVI_V140`). Il recense les **26 points ouverts V139**, dont **4 pilotes traités, 11 partiels au total et 15 encore à développer**. **24 contrôles QA V140** : 19 validés en CI ciblée, un contrôle de fidélité nécessitant vérification de sources et quatre sessions manuelles encore ouvertes. Aucune fonctionnalité complète/canon 1:1 ne doit être déduite de ces chiffres.
- La CI finale ajoute trois contrôles du **vrai binaire XLSX** : 49 feuilles, références QA et codes, formules et intégrité des identifiants historiques. Ces tests doivent passer sur le commit contenant le fichier Excel avant fusion.
- Vercel a historiquement signalé `build-rate-limit`; **aucune prévisualisation publique déployée n'est confirmée** sur cette PR.
