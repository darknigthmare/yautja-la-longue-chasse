# V119 — W3-RTS01, W3-RTS02 et W3-RTS03, trois objectifs tactiques jouables

## Provenance

Source : Yautja_V6_Bible_Cumulative_et_Dialogues.xlsx, export app/game/clanWarBibleV6Source.json. Feuille Scénarios RTS : W3-RTS01 « L’angle avant le pont », W3-RTS02 « Le sommet change de mains » et W3-RTS03 « La conduite sous les lances ». W3-RTS01/02 référencent W3-MAP01 « Les Corniches opposées » ; W3-RTS03 référence W3-MAP02 « Les Conduites de Verre Noir ».

Ces trois fiches ont une épreuve jouable dans Bible V6 → Opérations jouables → RTS. Le dossier W3/W5 propose aussi un lien direct. Les 21 autres scénarios RTS ne sont pas annoncés comme jouables.

**Portée :** exercice tactique 9 × 6 avec des objectifs propres aux deux fiches ; il ne reproduit pas encore les cartes complètes W3-MAP01 (32 × 24 cases) et W3-MAP02 (30 × 26 cases), les scènes cinématiques, les animations natives ni tous les événements environnementaux.

## W3-RTS01 : transporter la charge après reconnaissance du guet

Le départ demande un vrai territoire W3-KR01 accessible par des passages W3-L, une équipe de reconnaissance W3-U01/U02/U05/U06 et un porteur W3-U17/U19. Les unités réellement présentes occupent les PC et paient leurs RAV à la réservation.

Une charge identifiée et unique appartient au détachement, sans création instantanée. Le porteur limite sa progression à une case utile par ordre alterné. Le guet ne devient observé qu’après une approche avec ligne de vue effective. En cas de mise hors combat du porteur, la charge tombe à sa dernière case. Seul un porteur admissible encore vivant peut la reprendre sur place.

Le résultat positif demande les deux conditions conjointes : guet observé et charge portée jusqu’à l'extraction (7,4) par un membre encore apte. La destruction de tous les adversaires, isolément, ne termine pas la mission.

## W3-RTS02 : conserver le sommet jusqu'à la relève

Un vrai W3-U07 doit être affecté. Il doit être présent sur le guet (7,3) et y tenir trois tours consécutifs sans opposition adjacente. Trois tours est une cadence de prototype, non une valeur de cellule inventée. En mode alterné, l’ordre Défendre / laisser passer un tour tactique fait progresser la relève sans abandonner le poste et sans bloquer la riposte ennemie. En temps réel, le temps et les ripostes progressent selon les pas de la simulation. Une occupation contestée réinitialise la tenue.

Éliminer tous les adversaires ne remplace pas l’occupation physique du point de guet.

## W3-RTS03 : régulateur matériel et réparation de filtre

Sur un territoire W3-KR02 accessible par les passages réellement autorisés, une équipe de récupérateurs de charges **W3-U19** apporte un seul régulateur identifié. Une équipe d'artisans d'ancrage **W3-U20**, recrutée et présente, doit atteindre le filtre situé en (7,3). Les équipes coûtent leurs vrais PC et RAV de la Bible, sans apparition instantanée.

Le porteur chargé progresse d'une case par ordre alterné. Une mise hors combat laisse le régulateur à sa dernière position ; un autre W3-U19 vivant doit le récupérer. La livraison place la charge sur le site, mais **n'achève pas automatiquement** la réparation. Deux tours distincts d'exercice sont nécessaires avec un artisan à portée du filtre et aucun ennemi adjacent. Une interruption arrête le travail, sans effacer arbitrairement les étapes déjà effectuées. Éliminer les ennemis ne suffit pas à réparer le filtre.

La cadence de deux tours, la grille 9 × 6 et les coordonnées du poste sont des abstractions de gameplay ; les descriptions d'origine de W3-MAP02 concernent un niveau plus vaste, avec vapeur, balcons et conduites qui restent à modéliser en intégralité. Le moteur enregistre le résultat sous W3-RTS03, sans générer de vrai équipement ou de poste de soin en campagne.

## Sécurité de la progression

Le moteur app/game/systems/clanWarRtsScenariosV119.ts conserve une provenance W3-RTSxx et les préconditions des équipes. Le moteur V115 relit ces objectifs sur chaque ordre et valide les états lors des reprises. Les rapports gardent le sourceId réel, les participants, les pertes observées et l’expérience attribuée une seule fois.

Les résultats restent des exercices locaux : ni conquête V85, ni propriété d’atelier, ni trophée, ni honneur de campagne ne sont accordés par ce module. Les personnages W3 et les scénarios de la Bible sont des propositions propres au jeu, non des scènes de films requalifiées en canon.

## Validation et suites

Tests ciblés : tests/clan-war-rts-source-scenarios-v119.test.mjs et .github/workflows/clan-war-v115.yml. Pour la livraison, distinguer réussite des tests, vérification TypeScript, rendu navigateur, QA artistique et intégration à la campagne.

Restent ouverts : véritables cartes W3-MAP01 (passerelle, tunnel, prises verticales, chutes de pierres) et W3-MAP02 (bassins, conduites, pression, pontons), couverture graphique 1:1 des unités, chargement d’objets sur des sprites animés, comportements précis des adversaires, transitions entre vues, et chacune des 21 autres missions RTS avec leurs propres objectifs. Ne jamais cocher une mission comme finie en réutilisant simplement la victoire générique à la balise.
