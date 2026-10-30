# V119 — W3-RTS01 et W3-RTS02, objectifs tactiques réellement jouables

## Provenance

Source : Yautja_V6_Bible_Cumulative_et_Dialogues.xlsx, export app/game/clanWarBibleV6Source.json. Feuille Scénarios RTS : W3-RTS01 « L’angle avant le pont » et W3-RTS02 « Le sommet change de mains ». Carte référencée dans les deux fiches : W3-MAP01 « Les Corniches opposées ».

Ces deux fiches ont une épreuve jouable dans Bible V6 → Opérations jouables → RTS. Le dossier W3/W5 propose aussi un lien direct. Les 22 autres scénarios RTS ne sont pas annoncés comme jouables.

**Portée :** exercice tactique 9 × 6 avec des objectifs propres aux deux fiches ; il ne reproduit pas encore la carte complète W3-MAP01 à son format source de 32 × 24 cases, les scènes cinématiques, les animations natives ni tous les événements environnementaux.

## W3-RTS01 : transporter la charge après reconnaissance du guet

Le départ demande un vrai territoire W3-KR01 accessible par des passages W3-L, une équipe de reconnaissance W3-U01/U02/U05/U06 et un porteur W3-U17/U19. Les unités réellement présentes occupent les PC et paient leurs RAV à la réservation.

Une charge identifiée et unique appartient au détachement, sans création instantanée. Le porteur limite sa progression à une case utile par ordre alterné. Le guet ne devient observé qu’après une approche avec ligne de vue effective. En cas de mise hors combat du porteur, la charge tombe à sa dernière case. Seul un porteur admissible encore vivant peut la reprendre sur place.

Le résultat positif demande les deux conditions conjointes : guet observé et charge portée jusqu’à l'extraction (7,4) par un membre encore apte. La destruction de tous les adversaires, isolément, ne termine pas la mission.

## W3-RTS02 : conserver le sommet jusqu'à la relève

Un vrai W3-U07 doit être affecté. Il doit être présent sur le guet (7,3) et y tenir trois tours consécutifs sans opposition adjacente. Trois tours est une cadence de prototype, non une valeur de cellule inventée. En mode alterné, l’ordre Défendre / laisser passer un tour tactique fait progresser la relève sans abandonner le poste et sans bloquer la riposte ennemie. En temps réel, le temps et les ripostes progressent selon les pas de la simulation. Une occupation contestée réinitialise la tenue.

Éliminer tous les adversaires ne remplace pas l’occupation physique du point de guet.

## Sécurité de la progression

Le moteur app/game/systems/clanWarRtsScenariosV119.ts conserve une provenance W3-RTSxx et les préconditions des équipes. Le moteur V115 relit ces objectifs sur chaque ordre et valide les états lors des reprises. Les rapports gardent le sourceId réel, les participants, les pertes observées et l’expérience attribuée une seule fois.

Les résultats restent des exercices locaux : ni conquête V85, ni propriété d’atelier, ni trophée, ni honneur de campagne ne sont accordés par ce module. Les personnages W3 et les scénarios de la Bible sont des propositions propres au jeu, non des scènes de films requalifiées en canon.

## Validation et suites

Tests ciblés : tests/clan-war-rts-source-scenarios-v119.test.mjs et .github/workflows/clan-war-v115.yml. Pour la livraison, distinguer réussite des tests, vérification TypeScript, rendu navigateur, QA artistique et intégration à la campagne.

Restent ouverts : véritable carte W3-MAP01 (passerelle, tunnel, prises verticales, chutes de pierres), couverture graphique 1:1 des unités, chargement d’objets sur des sprites animés, comportements précis des adversaires, transitions entre vues, et chacune des 22 autres missions RTS avec leurs propres objectifs. Ne jamais cocher une mission comme finie en réutilisant simplement la victoire générique à la balise.
