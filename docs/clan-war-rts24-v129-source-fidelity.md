# V129 : 24 scénarios RTS source, 72 objectifs physiques et extraction

Cette version empilée sur les PR #29, #34, #36, #37 et #38 respecte les **24 lignes RTS du classeur V6** (W3-RTS01 à W3-RTS24). Les données de source sont reprises de l'onglet Scénarios RTS, colonnes C à P : titre, carte, rang, plafond PC, RAV de départ, situation, comportement adverse, choix, preuve de réussite, échec et reprise, récompense théorique et provenance.

## Missions sur leur véritable monde

| Monde W3 | Cartes W3 | Scénarios | Gameplay cible |
| --- | --- | --- | --- |
| Korthas (PLAN19) | MAP01/MAP02 | RTS01–04 | pont, relève, filtres, circuits |
| Vesh-Kar (PLAN20) | MAP03/MAP04 | RTS05–08 | cratères, extraction, boîtier, relais |
| Namarra (PLAN13) | MAP05/MAP06 | RTS09–12 | canopée, gué et voyageurs neutres |
| Oruun (PLAN21) | MAP07/MAP08 | RTS13–16 | quai, marée, phare, signaux |
| Sahr-Keth (PLAN22) | MAP09/MAP10 | RTS17–20 | glacier et galeries chauffées |
| Ilyss (PLAN23) | MAP11/MAP12 | RTS21–24 | paliers et coque orbitale |

L'environnement orbital de MAP12 reste hors de la surface de Ilyss. MAP10 est une installation chauffée sous les glaces de Sahr-Keth. Aucune ville terrestre, dont Gunnison, n'est transportée sur un monde extraterrestre.

## Ce qui fonctionne en V129

- 24 fiches liées sans ambiguïté à la carte de source correspondante, trois interactions physiques par fiche, soit 72 tâches.
- Un ordre hors de portée ne peut pas déclencher un objectif ; le chasseur doit observer les accès puis approcher les sites appropriés.
- Les tâches de garde/relève exigent deux ou trois ticks effectifs et sont réinitialisées si le chasseur quitte le poste.
- Les charges, équipements et balises sont pris en charge à leur emplacement avant d'être portés ; les personnes secourues existent avant le contact et suivent un chemin traversable une case à la fois. Une personne escortée non extraite bloque la victoire.
- Le courant et la pression du sas sont vérifiés pour les objectifs dépendants. Des fenêtres de marée, de rafales, de fissures de glace et de jets thermiques interdisent les actions physiquement impossibles.
- Chaque mission reçoit trois à quatre groupes rivaux Yautja W3-U, choisis en fonction du plan adverse de la fiche ; les positions sont réelles sur la grille, et leurs budgets et effectifs proviennent de la Bible V6. Il s'agit de compositions originales compatibles, non d'une garnison canonique attestée.
- Un reçu de mission unique décrit les tâches réalisées et l'extraction sans modifier un territoire, la sauvegarde V85/V6, l'XP ou l'inventaire.
- Aucun humain neutre ni témoin sauvé n'est converti en combattant rival.

## Interface, export et tests

Le nouvel onglet « 24 missions RTS W3 · objectifs » de la Bible V6 présente toutes les fiches, la carte et les 72 interactions, les témoins/charges, les gardes et les informations du classeur.

Sources techniques : app/game/systems/clanWarRtsSourceMissionsV129.ts ; app/game/ClanWarRtsMissionStudyV129.tsx ; tests/clan-war-rts24-source-v129.test.mjs ; scripts/export-w3-rts24-v129.mjs ; .github/workflows/clan-war-v129.yml.

La CI valide les 24 contrats, les 72 objectifs, les emplacements ennemis, la continuité des mondes, les escortes et les fenêtres d'environnement ; elle exporte CSV, JSON complets et un JSON par mission.

## Limite fondamentale de la fidélité 1:1

Ce lot rend les **séquences d'objectifs des 24 missions jouables dans un exercice single-hunter**, mais il ne remplace pas un véritable RTS à plusieurs escouades. Les six premiers scénarios RTS jouables dans le moteur V115/V119 restent distincts. Les 12 cartes utilisent les dimensions originales des fiches, mais pas encore les décorations filmées/architectures entièrement autorées, les véhicules, les dialogues, l'ensemble des joueurs/PNJ persistants ni la progression de campagne.

La Terre globale WGS84 n'est toujours pas une reproduction locale des rues, bâtiments et plateaux de tournage 1:1. Les personnages et assets de films/comics nécessitent une vérification indépendante par œuvre et continuité.

La PR doit demeurer brouillon tant que le dernier commit n'a pas réussi TypeScript, lint, tests et génération des exports ; même verte, elle devra être fusionnée dans l'ordre des PR avant d'exister dans main.
