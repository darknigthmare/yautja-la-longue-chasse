# Tableau des chasses et demandes personnelles V68

Le tableau mural se consulte auprès de l’Artisane du marché, au point `market-service` de l’intérieur `market-armory`. Le joueur doit rejoindre réellement cet interlocuteur. Les missions personnelles se prennent auprès de la Soigneuse des délégations, de l’Officier des quais, de la Conservatrice des marques et de la Maîtresse des parures, dans leurs intérieurs existants.

Les vingt demandes du tableau couvrent les dix régions : sept observations de faune, trois relevés de terrain, quatre récupérations de balises, trois protections de passage et trois confrontations non létales. Les quatre demandes personnelles ajoutent chacune deux objectifs dans deux régions différentes. Les objectifs ne créditent aucun crâne, rite, rang, arme, vaisseau ou culpabilité dans l’enquête principale.

## Actions de terrain et retour

| Action | Preuve demandée dans une nouvelle sortie liée au contrat |
| --- | --- |
| Relevé | Trois traces physiques lues dans l’ordre. |
| Observation de proie | Trois traces et au moins 90 ticks d’observation calme à portée. |
| Récupération | Trois traces, un danger effectivement évité et la caisse de balises récupérée pendant une accalmie. |
| Protection | Trois traces, un danger évité et deux balises physiquement protégées au moment prévu. |
| Confrontation | Trois traces, deux charges évitées et trois touches pendant la reprise de la proie. Elle se retire vivante. |

Chaque observation doit ensuite être confirmée auprès du guide du village, plus tard dans la même sortie. Le guide peut confirmer une nouvelle observation après un premier rapport : un défi joué plus tard n’est pas crédité par un retour antérieur. Seul le retour physique au donneur initial permet la remise et l’attribution de marques de clan. Répéter la remise ne paie pas de nouveau. Une demande abandonnée reste dans le registre ; la reprise efface les observations de cette tentative et requiert un nouveau départ.

## Intégration et persistance

- Ajouter `contractsV68: HomeworldContractsV68` au progrès Homeworld, avec `defaultHomeworldContractsV68()` pour les sauvegardes anciennes. Les versions futures ou registres invalides doivent être refusés par les gardes d’import et de chargement, sans remplacer silencieusement leurs données.
- Dans le Hub, `applyHomeworldContractV68(value, action, context)` revalide `eligible`, `interiorId`, `pointId`, `npcId`, la position réelle sur le sol de l’intérieur et l’absence de suspension. Persister `result.state` avant d’annoncer un succès ou de rendre la remise terminée.
- Lors de la création d’une nouvelle sortie de village, appeler `bindContractsVillageRunV68(value, regionId, runId)` dans la même transaction que le nouveau checkpoint. Un rechargement reprend le `runId` sauvegardé ; il ne re-lie pas les contrats.
- Sur le callback d’une interaction de terrain réellement réussie, appeler `recordContractsFieldEventV68(value, event, {regionId, runId, suspended})`, puis persister avant l’acquittement de l’interface. Un ancien rapport, une action distante, un autre `runId`, un relevé incomplet ou une scène suspendue ne fait pas progresser une demande.
- `result.rewardMarks` vaut zéro hors d’une première remise réussie. `contractMarksV68(value)` calcule la somme cumulée des demandes déjà remises. Le vrai callback `persistHomeworldProgress` crédite `profile.clanMarks` du delta strict entre le nouveau registre et celui de la sauvegarde courante, dans la même transaction durable que le rapport remis. Le portefeuille peut être dépensé dans les équipements existants ; son solde figure dans le HUD et le journal Homeworld. Dépenser ces marques ne réduit pas le cumul du tableau et ne permet pas de rejouer une récompense. Le portefeuille fait partie du payload de réconciliation pour confirmer exactement une écriture interrompue, sans double paiement.

Le modèle valide des reçus de sauvegarde locale. La validation des événements réutilise `normalizeRegionFieldEventV68`, qui contrôle la position sur le véritable sol du village, la portée du lieu et la distance maximale parcourable au tick fourni. Il ne constitue pas une preuve cryptographique ni un système anticheat réseau. Le callback hôte doit être relié au reducer physique de la scène, jamais au simple affichage d’un ancien rapport.

## Références et limites de fidélité

Les noms et descriptions des dix régions proviennent de `HOMEWORLD_REGIONS`, déjà récupérés dans le projet. L’accès des jeunes chasseurs aux départs garde les conditions de la campagne jouable ; le tableau ne les contourne pas. La progression locale documentée dans `work/v36/progression-art-specs/progression-thread.json` distingue les faits observés, le retour au mentor et la reconnaissance effective.

La demande utilisateur cite *Predator: Badlands* comme inspiration pour le tableau. La [page officielle 20th Century Studios](https://www.20thcenturystudios.com/movies/predator-badlands) et sa [bande-annonce officielle](https://www.youtube.com/watch?v=43R9l7EkJwE) servent de références de franchise ; elles ne documentent pas une économie canonique identique de primes payées en marques. Le tableau OpenAI natif `public/game/homeworld/v68/hunt-board.png`, les clauses, les marques de clan utilisables dans l’économie du jeu et les noms de proies locales sont des créations de ce jeu. Aucun menu ne présente ce tableau comme une copie 1:1 d’un accessoire de film ou une institution commune à tous les clans.

## Validation réalisée avant intégration

`tests/homeworld-contracts-v68.test.mjs` : 12 tests réussis. Ils couvrent les véritables intérieurs des cinq donneurs, les anciennes sauvegardes, la distance, les scènes suspendues, les nouvelles sorties, les différentes exigences de gameplay, le retour au guide, les remises idempotentes, l’abandon/reprise, les demandes multisites, les versions futures et le rendu du tableau natif.

`tests/homeworld-contracts-v68-integration.test.mjs` : 7 tests réussis. Ils exécutent les callbacks réels du Hub et de GameClient, extraits par AST sans les réécrire, avec les fonctions de sauvegarde et de réconciliation du jeu. Ils vérifient le refus de quota et sa reprise, la transaction atomique scène/reçu, l’ancienne session ou position refusée, la confirmation d’un `setItem` effectivement réussi malgré un premier échec de lecture, les versements réellement dépensables dans le portefeuille et leur idempotence, ainsi que les versions futures protégées. Un registre invalide peut être récupéré depuis une copie valide, sans importer les données invalides ni réécrire les fichiers lors de la seule lecture.

`scripts/verify-homeworld-contracts-v68.mjs` parcourt le tableau, deux demandes des Cendres, la corniche, les trois traces, l’observation et le défi de faune, le guide puis le retour physique avant la remise. Il utilise le navigateur isolé et les contrôles clavier publics. Son rapport reste la source d’autorité pour le statut de cette QA ; la présence du script ne signifie pas qu’elle a réussi.

## Recette navigateur intégrée locale

Le parcours réel sur le serveur de production local `http://127.0.0.1:4186` a réussi ; le rapport est `work-local/v68/qa/contracts/report.json`. La sauvegarde isolée est déclarée comme ancien adulte autonome, sans contrat ni rapport préinjecté. Après l’entrée, toutes les interactions et tous les déplacements utilisent les commandes publiques. Cette recette ne prétend pas faire partir un nouveau joueur sans sa formation.

Le joueur accepte les deux demandes des Cendres au marché, parcourt la corniche entière, rencontre le guide, lit les trois traces, observe la faune pendant 186 ticks et joue les trois contacts du défi après trois charges réellement évitées. Il retourne au guide puis parcourt entièrement la corniche inverse avant de remettre les rapports au marché. Le terrain enregistre 36 441 unités de marche et 10 336 ticks. Le cumul des demandes et le portefeuille augmentent tous deux de 48 marques, sans changement de rang, d’honneur, d’inventaire, de trophées ni d’enquête. Les refus de stockage à l’acceptation et à la remise, leur reprise et le rechargement ne doublent aucune récompense. Aucune erreur JavaScript ni requête HTTP en échec n’est remontée.

Sept des huit captures ont été inspectées : tableau natif, village, proie avant puis après retrait vivant, guide, reçus et mobile. Les cartes et contrôles mobiles tiennent sur 393 × 852 sans débordement horizontal. Le dialogue possède un défilement vertical ; les captures de remise conservent la position laissée par le clic. La recette suivante recadre explicitement son début et vérifie les bornes du titre, ainsi que les filtres et le carnet sur mobile.

Les quatre demandes personnelles et les vingt demandes du tableau sont couvertes par le modèle et les callbacks d’intégration ; seules les deux demandes des Cendres ont été jouées jusqu’à la remise dans cette recette navigateur. Les intérieurs des dix villages et la publication publique restent vérifiés séparément par l’intégrateur.
