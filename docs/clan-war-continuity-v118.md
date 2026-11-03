# V118 — Continuité des mandats de clan : rappel différé et navigation tactique

## Périmètre exact

Source de vérité : \`Yautja_V6_Bible_Cumulative_et_Dialogues.xlsx\`, déjà extraite et vérifiée sous \`app/game/clanWarBibleV6Source.json\`. Les troupes W3-U, passages W3-L, lieux W3-K, coûts PC et RAV sont les définitions du projet. Les anciens identifiants CON-T/RTS-U ne sont jamais convertis silencieusement. Les créatures, villes et factions hors de ces entrées ne deviennent pas « canon » par déduction.

Modules livrés sur la PR #29 :
- \`app/game/systems/clanWarOperationsV115.ts\` : missions et résultats uniques, rappels Outer Ops, XP conservée par membre, blessure attribuée uniquement aux membres réellement exposés, réservations de ressources et de personnes.
- \`app/game/ClanWarOperationsV115.tsx\` : commande de rappel et suivi du voyage en cours, tableau des détachements et rapport de retour.
- \`app/game/systems/clanWarTacticalNavigationV118.ts\` : choix déterministe d'une case sûre et admissible pour contourner une paroi.
- \`app/game/systems/clanWarMissionTerrainV116.ts\` : six profils de régions, tous leurs obstacles et leurs chemins disponibles pour les deux RTS.
- \`tests/clan-war-outer-recall-v116.test.mjs\` : rappel, temps de retour, libération, absence de récompense immédiate, archive frauduleuse.
- \`tests/clan-war-tactical-nav-v118.test.mjs\` : chemins vérifiés sur 36 sites, contournement d'une paroi au tour par tour et en temps réel, pas de téléportation.

## Outer Ops : repli ordonné sans récompense gratuite

1. Le joueur décide de rappeler un ordre identifié **avant** son échéance.
2. La phase de retour est ajoutée à **la même mission**, sans inventer une seconde équipe ou payer/rembourser une nouvelle dotation.
3. Les membres restent \`assigned\` à ce mandat, donc non réutilisables pour une autre mission ou un traitement, tant que le retour n'est pas accompli.
4. Le temps de retour dépend du temps déjà passé en mission et du nombre de passages connus, avec un minimum de dix secondes. C'est une règle visible de l'**exercice**, pas une vitesse canonique de vaisseau, de monture ou de transmission.
5. À l'échéance réelle, un seul résultat \`retreat\` est consigné ; les membres redeviennent disponibles. Ni XP de rappel sans engagement, ni blessure automatique, ni argent rendu, ni renseignement ou drapeau conquis.
6. Un second rappel, un accusé déjà clôturé, un horodatage incohérent ou des champs \`recall\` fabriqués sont refusés. Les archives historiques dépourvues du champ optionnel restent compatibles.

Limite : ce délai est réconcilié au retour dans l'interface et repose sur l'horloge de l'appareil. Il n'y a pas de serveur autoritaire, de livraison en arrière-plan ni de réception physique déjà raccordée au vaisseau de la campagne.

## RTS : marche autour des reliefs, pas au travers

Chaque décision de mouvement ennemie vérifie les cellules de mur/sol réellement produites pour le théâtre choisi, la présence des autres acteurs et un chemin atteignable. Elle ne se rabat plus sur une marche horizontale infiniment bloquée au pied d'un obstacle. Le même auxiliaire est appelé depuis les ordres alternés et depuis les ticks du RTS autonome.

Le pathfinder reste une grille d'exercice 9 × 6. Il **ne** simule **pas** la guerre complète : front de plusieurs centaines d'unités, décor 3D, brouillard de guerre, transport orbital, art 1:1, animation et multijoueur attendent des chantiers séparés. Les unités visibles sont les représentants des équipes W3 qui ont été préparées, non des soldats créés gratuitement à chaque déplacement.

## Garde-fous lore et sauvegardes

- Les ordres et nombres de guerre sont des propositions du classeur V6 du jeu, non des unités canoniques affirmées pour chaque film, comic ou jeu officiel.
- L'exercice V115 ne modifie ni \`SaveGame\` ni \`WarSimulationV85\` ; une pression tactique n'attribue ni contrôle territorial ni honneur.
- L'expérience est calculée par personne apte. Un départ immédiatement annulé ne doit pas créer un cycle d'XP gratuit.
- En cas de défaite, seuls les détachements explicitement tombés reçoivent la blessure d'exercice ; tous les survivants ne sont pas automatiquement marqués blessés.
- Une équipe rappelée, une équipe blessée, un soigneur engagé et une unité recrutée mais pas encore arrivée gardent des identifiants et disponibilités distincts.

## Vérification

La CI ciblée \`.github/workflows/clan-war-v115.yml\` inclut les tests des quatre modes, du terrain, des archives, du traitement médical, des renforts, des dossiers source, des gestes d'assaut et les nouvelles suites de rappel/navigation. Le détail est consultable dans la PR #29. Les vérifications globales, navigateur, compatibilité des sauvegardes transférées et performance mesurée doivent être suivies indépendamment.

Un résultat de compilation, lint ou test pur ne constitue pas une validation visuelle de sprites, de collisions au niveau réel ou d'un système de guerre de clan pleinement fidèle à toutes les continuités officielles.
