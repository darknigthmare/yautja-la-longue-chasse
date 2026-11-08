# Incidents physiques du Clan Ship — OPS-B01 et OPS-B02

## Périmètre livré

Ce lot réalise les deux premières situations du §12 de `production/clan-ship-20261104/operations-spec.md`. Les lignes sources sont **58 et 59**, onglet **Opérations**, dans `clan-ship-operations-20261105.xlsx`. Le fichier historique reste intact ; `coverage.json` fournit les statuts pour le suivi courant.

Les situations utilisent les sept salles, les véritables déplacements et les personnages déjà établis. Elles possèdent des objets en scène, des observations de terrain, des erreurs qui changent leur état et une reprise conservée par la sauvegarde. La présence d’un panneau ou la visite d’une salle ne résout pas un incident.

## OPS-B01 — Le scellé qui ment

L’offre apparaît après le dossier `ship-seal-check`. Garde du Seuil doit être disponible à son poste : un membre recruté mais mis en réserve ou affecté ailleurs ne parle pas depuis le hangar.

| Étape | Objet et salle | Résultat enregistré |
| --- | --- | --- |
| Accepter | Poste du hangar | Intervention ouverte, lot sous restriction |
| Relever | Boîtier du lot au hangar | Identifiant du lot et contradiction « témoin fermé / retour ouvert » |
| Identifier | Registre des lots aux archives | Correspondance explicite entre le lot et sa conduite A ou B |
| Isoler | Boîtier à deux commandes au hangar | Branche choisie, bonne isolation ou erreur visible |
| Mesurer | Terminal de pression aux soins | Pression résiduelle contrôlée à zéro |
| Fermer | Poste du hangar | Restriction levée, reçu final et 25 marques |

Les deux isolateurs restent distinguables. Une supposition avant collecte du témoin et de sa référence est refusée. Choisir l’isolateur de l’autre lot garde le lot sous restriction, conserve les indices déjà obtenus et demande un retour explicite aux archives pour revalider le diagnostic. Le contrôle de pression ne peut pas être effectué depuis le hangar et la fermeture ne peut pas être confirmée depuis les soins.

La coursive et les portes du joueur restent praticables dans chaque état. Aucun organisme, combat ou invasion n’est ajouté par la contradiction du témoin.

## OPS-B02 — Une lumière dans le relais

L’offre apparaît après `ship-armory-audit`, auprès de Griffe de Fer disponible à l’armurerie. L’avarie concerne la projection locale du conseil ; les services historiques restent accessibles.

1. Relever au relais du conseil les deux cycles lisibles : l’un possède deux impulsions avant la pause, l’autre une seule. Les indications sont des valeurs stables à lire, sans défi de réflexe ni clignotement rapide.
2. Consulter le cycle de référence à la console des archives. Il indique explicitement la branche à isoler et l’ordre de reprise : circuit témoin stable, puis circuit réparé.
3. Isoler la branche identifiée au relais. Une mauvaise branche remet le test à zéro en conservant les mesures et la référence.
4. Prélever le composant **R-2** dans le casier identifié près de la forge de l’armurerie. Le composant passe de `absent` à `carried`, puis `installed` au relais.
5. Installer R-2 puis rétablir les circuits un par un. Les voyants et la projection passent par les états **0, 1, puis 2 circuits stables**.
6. Contrôler la projection à la table du conseil, distincte du boîtier du relais. Le reçu final attribue 30 marques une seule fois.

Une mauvaise permutation réinitialise uniquement le test. La pièce installée reste installée ; quitter la salle, sauvegarder et reprendre ne délivre ni ne consomme une seconde pièce. La référence reste consultable pour recommencer dans le bon ordre.

Les identifiants de lot et la correspondance A/B sont déterminés de manière stable par le propriétaire de campagne. Une reprise retrouve exactement les mêmes indices ; elle ne relance pas un tirage susceptible de rendre l’ancienne observation fausse.

## Interaction et navigation

Le panneau **Incidents du bord · Confinement et circuits** se trouve sous la scène du Clan Ship. Il présente les indices, l’état du composant et les prochaines interventions. Ses commandes sont soumises aux mêmes contrôles physiques que les objets de la scène.

Le guidage vers une autre salle emprunte le contrôleur et les portes existants. Une fois dans la salle, **Approcher l’objet** conduit jusqu’au point précis de l’appareil. Le joueur confirme ensuite l’intervention. Les étiquettes interactives de l’objet offrent la même commande lorsque le chasseur est à portée. Un trajet ou l’arrivée au point n’exécute jamais automatiquement le choix A/B.

Neuf points physiques sont définis dans `CLAN_SHIP_INCIDENT_TARGETS`. Le modèle vérifie la salle réellement occupée dans `clanShipDocking`, l’espace de circulation autorisé et une distance maximale de 64 unités. Les scènes transmettent les coordonnées instantanées du contrôleur, et non la destination choisie dans le journal.

Le focus d’un panneau suspend l’entrée de déplacement de la scène. Les commandes de préparation et d’incident restent disponibles à la position effectivement conservée. L’état des incidents ne se dégrade pas hors écran et la fermeture du journal ne réinitialise aucun test.

## Objets et modification du lieu

Deux dessins originaux transparents sont intégrés par `app/game/clanShipIncidentArt.ts` :

- `sealedIsolator` remplace seulement l’instance `berth-terminal` au hangar, au même point et avec la même empreinte de collision.
- `twinCircuitRelay` remplace seulement `council-terminal` dans la salle du conseil, avec son empreinte existante.

Les lampes, les étiquettes A/B, les valeurs de pression, l’état du casier et les circuits sont rendus par le code. Aucun état de victoire n’est peint dans les PNG. La projection du conseil est atténuée localement pendant l’avarie, devient partiellement stable avec un circuit puis retrouve son état réparé. Aucun couloir n’est fermé par une illustration.

Les sources, prompts, empreintes, dimensions et mesures sont conservés dans `production/excel-bible-20261108/art/incidents/`. Les pivots mesurés et l’adaptation de taille restent à apprécier dans le navigateur. `humanArtValidation:false` s’applique aux deux images.

## Sauvegarde, erreurs et reçus

`SaveGame.clanShipIncidents` est un champ optionnel indépendant en version 1. Les anciennes campagnes absentes ou explicitement nulles restent telles quelles.

Le registre conserve les événements ordonnés, leur révision et leurs observations physiques. `inspectClanShipIncidents` rejoue le protocole pour reconstruire les indices, le choix des isolateurs, le composant, les tests et la fermeture. Il refuse un événement impossible, une étape sautée, une position inaccessible, un numéro répété ou manquant, une autre campagne et une version future. Le rapprochement avec les contrats préalables intervient aussi à l’import.

Le parent `GameClient` ajoute atomiquement le nouvel état et l’éventuelle gratification à l’écriture normale de campagne. Une double confirmation, une révision périmée et une reprise après rechargement ne donnent pas une seconde récompense. Un refus d’écriture n’est pas présenté comme une confirmation. La garde de réconciliation existante traite les écritures incertaines ; l’interface invite à relire le dossier avant de réessayer.

Chaque journal est borné à 96 événements. À partir de 88 événements, une nouvelle erreur est refusée sans mutation afin de réserver assez de place au parcours correct de sortie. Les acquis ne sont pas effacés. Un test réalise une longue suite de mauvaises permutations puis démontre la fin du relais après ce seuil. Un second vérifie que l’import refuse une 89e erreur fabriquée, impossible à produire par le système, puis accepte la fin correcte issue du même point de reprise.

Les montants **25 / 30 marques** constituent le choix d’équilibrage initial de cette tranche et sont affichés avant acceptation. Ils restent à évaluer en jeu. Aucune variante d’extraction ni aucun avantage d’interception spatiale ne découle actuellement de ces reçus.

## Vérifications et limites

`tests/clan-ship-incidents.test.mjs` contient **14 tests nouveaux**. Ils exercent les prérequis, la présence des interlocuteurs, les coordonnées, les indices, les mauvais isolateurs, les permutations, le composant unique, les deux récompenses, les imports corrompus/futurs, la panne d’écriture, les rechargements et la limite de journal.

Un scénario utilise réellement les fonctions de planification, de déplacement, de passage de seuil et d’apparition de salle pour parcourir les quinze actions des deux incidents et revenir au hangar. Chaque objet possède aussi un chemin vers les deux portes de sa salle. Le rendu SSR vérifie les deux images et les états séparés des deux circuits.

La commande et le résultat combinés sont conservés dans `verification.json` et `tests-run.txt` : **98 tests réussis**, dont 38 nouveaux pour compagnons/incidents et 60 régressions ciblées des opérations, sauvegardes et déplacements du clan. Le lint ciblé des nouveaux systèmes et scènes a passé sans erreur. Le chantier racine réalise les vérifications globales et le build final.

La recette de navigateur n’a pas été exécutée : le lancement Chromium a été bloqué par la politique AF_UNIX, puis la revue automatique a refusé l’escalade demandée par le chantier racine. Les tests de mouvement et de SSR ne certifient pas les pixels, l’hydratation, l’ergonomie mobile/manette ou les contacts artistiques. Les dialogues enrichis et effets d’extraction/interception proposés restent ouverts.

**OPS-Q26 reste partielle** : ce lot couvre B01 et B02, pas les missions B03 « Trophée contesté » et B04 « Retour d’expédition ». La revue artistique humaine reste à faire.
