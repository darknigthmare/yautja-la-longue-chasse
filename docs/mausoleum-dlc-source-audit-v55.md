# Mausolée DLC — raccords et sources

Vérification locale et intégration V56 du 30 septembre 2026. Ce document sépare les éléments déjà présents de la spécification nouvelle demandée par l’utilisateur ; il ne déclare aucun DLC supplémentaire terminé.

## Source à réconcilier

La conversation retrouvée dans le projet ChatGPT est **« Idée mausolée DLC »**, identifiant `6abc3138-4254-83eb-aff2-19352afcb596`. Son tour utilisateur et sa réponse complète ont été récupérés le 30 septembre 2026 dans une capture privée exclue de Git, `work-local/chatgpt-v56/mausoleum-dlc.json`. L’utilisateur demande explicitement des piédestaux et masques dans le Homeworld, une animation de port pour lancer le DLC et de retrait au retour, ainsi que le maintien de l’accès par menu. Les détails de galeries, rangs et musée interactif proviennent de la proposition associée ; ils sont des choix de ce projet, pas une source canonique.

L’ancienne conversation **« Concevoir le DLC »**, identifiant `6a971a23-4280-83ed-afda-3fd8c987f116`, est documentée dans `docs/chatgpt-yautja-backlog-2026-09-04.md`. Elle concerne notamment THE PIT et ses budgets de combattants, movesets et finishers. Elle ne constitue pas une preuve du fonctionnement demandé pour ce nouveau mausolée.

## Éléments déjà présents

| Élément | Source locale | Fonction réelle |
| --- | --- | --- |
| Mausolée public | `app/game/systems/homeworldCity.ts`, bâtiment `trophy-mausoleum` | Bâtiment de l’Esplanade des Trophées ; pas d’intérieur ni de sélection de DLC actuellement. |
| Présentation des prises | `app/game/systems/homeworld.ts`, point `trophy-service` | Ouvre le service de trophées existant ; les trophées du joueur doivent rester accessibles. |
| Registre du mausolée | `app/game/systems/homeworld.ts`, preuve `memory-register` et point `memory-register-point` | Indice de l’enquête du Trophée impossible ; ne pas détourner cet indice en sélection de DLC. |
| Archives de chasse | `app/game/systems/homeworld.ts`, point `memory-service` | Ouvre le codex existant, dans la Maison de la Mémoire. |
| Mausolée des Marques | `app/game/systems/pitArenaExtensions.ts`, arène `arena-013-mausolee-des-marques` | Décor latéral de duel THE PIT. Ce décor ne prouve pas l’existence d’un hub DLC jouable. |
| Registre privé DLC | `docs/DLC-PRIVE-CATALOGUE.md`, `scripts/build-private-dlc-manifest.mjs` | Inventaire de références et d’états visuels. Le dossier `private-dlc/` est exclu de Git et ne doit pas être publié. |

Le passage capturé du monde natal (`work/v37/public-share-check/6a9f6ce6-2548-83eb-a8ee-152b84e89fe5/message-1.txt`, lignes 47–55 et 327–331) parle d’un trophée censé se trouver dans un mausolée scellé. Ce passage est un ressort d’enquête, pas une description d’accès aux DLC. La capture privée reste hors dépôt public.

## Raccords techniques disponibles

- Les points d’interaction physiques sont définis dans `HOMEWORLD_POINT_POSITIONS`, puis projetés dans `HOMEWORLD_POINTS`. Toute nouvelle entrée doit posséder sa position ; le registre refuse les points sans position.
- Le bâtiment du mausolée se situe à `(920, 1300)` avec sa porte à droite. Le point `trophy-service` se trouve à `(910, 1430)` ; il faut préserver sa portée d’interaction et sa circulation.
- `HomeworldHub` n’ouvre un service qu’après interaction à proximité. Son acteur est conservé lorsque le hub reste monté derrière une installation.
- `GameClient.openHomeworldService` centralise les accès et protège les services de chasse des Unblooded. La spécification nouvelle doit déterminer si une consultation d’archives reste libre et à quel moment une mission est accessible.
- `StationScreen`, `shipStationOpen` et `homeworldMounted` déterminent l’écran superposé, la suspension des contrôles et le retour à la cité. Un écran indépendant peut utiliser ce raccord sans téléporter le joueur ni réinitialiser la cité.
- Toute progression nouvelle doit être liée à la sauvegarde du joueur et validée avant annonce de succès. Une simple visite de catalogue ne doit pas modifier rang, preuves, trophées ou complétion de campagne.

## Vérifications requises après intégration

1. Depuis une sauvegarde existante et depuis le prologue terminé, vérifier l’accès autorisé et le message des accès verrouillés.
2. Parcourir physiquement jusqu’à l’entrée ; vérifier collisions, portée, clavier, tactile et retour au même endroit.
3. Ouvrir puis fermer l’écran au clavier ; vérifier focus, Échap, suspension des déplacements et absence de fuite d’entrées.
4. Conserver la distinction entre consultation, contenu jouable, contenu encore à produire et progression réellement enregistrée.
5. Rejouer les tests Homeworld, sauvegardes sociales et archives complètes si un champ persistant est ajouté.

## Livraison V56 et limites

- **Deux entrées réelles** : bouton « DLC / Chroniques de chasse » du menu principal (sans activation de partie), et point d’interaction « Mausolée des Grandes Chasses » dans l’Esplanade. Le musée ne détourne ni les trophées ni la preuve du registre.
- **Visite physique** : déplacement latéral clavier, approche au toucher, commande d’examen à proximité, pagination des alcôves et navigation des menus à la manette. Le Homeworld reste monté, caché et suspendu pendant la visite.
- **Neuf dossiers extensibles** : Prey, Predator, Predator 2, AVP, AVP Requiem, The Predator, Predators, Badlands et Jim Hopper. Ils sont tous marqués campagne non produite/non installée. Aucun duel THE PIT ne sert de substitut.
- **Architecture originale** : fond du hall et piédestal OpenAI séparés, inchangés après génération ; reçus sous `art-source/v56/mausoleum/source-records.json`. L’alpha du piédestal et le support du masque sont pris en compte dans l’ancrage. Les masques V3/V14 existants sont réutilisés, sans inventer une forme pour Tracker, Upgrade ou le chasseur de Hopper. Jungle, City, Wolf et Feral ont été inspectés visuellement ; aucune certification générale 1:1 n’est déclarée.
- **Accès** : consultation des premières galeries à partir d’Unblooded, étude à partir de Young Blood, Grandes Chasses à Blooded, galerie interdite à Elite, archives temporelles à la fonction Adjutant réellement enregistrée. Le catalogue du menu peut être prévisualisé sans partie, mais ne permet aucune étude ni progression.
- **Étude rituelle fonctionnelle** : visualisation 2D d’une reproduction d’étude, amorçage audio du masque, lecture du dossier, retrait et repose. Les dossiers examinés/étudiés sont enregistrés dans `homeworld.mausoleum`, sans modifier rang, trophées, preuves, honneur ou complétion de DLC. Une écriture refusée laisse un message et permet de réessayer ou de quitter explicitement sans enregistrer.
- **Contrat de lancement futur** : adaptateur exécutable par campagne ; le lancement exige contenu installé, droit d’accès, galerie/rang autorisés et sauvegarde durable du ticket de retour. Le registre runtime d’adaptateurs reste vide. Des fixtures de test valident l’ordre sauvegarder puis lancer, mais aucun vrai DLC n’a été lancé.
- **Migrations** : les anciennes parties reçoivent une étude vide ; identifiants inconnus et doublons sont filtrés ; une version de progression plus récente est protégée contre un chargement destructeur.

**Encore absent** : campagnes DLC jouables, cinématique corporelle complète de prise/port/retrait, examen 3D, statues indépendantes animées, trophées/inscriptions accordés par la fin de chaque DLC, vraie reprise de campagne avec retour après crédits, et catalogue au-delà des neuf exemples de la source. Les états terminé/honorifique existent dans le contrat de futurs adaptateurs, pas dans une progression fictive du musée. Le Mur des Chasses est actuellement une frise textuelle par galerie ; une chronologie illustrée ramifiée reste à produire.

## Validation locale

Les 41 tests ciblés `mausoleum.test.mjs`, `homeworld.test.mjs` et `homeworld-spatial-v54.test.mjs` ont réussi. Ils vérifient notamment les neuf dossiers, les rangs, l’absence de DLC installé, la normalisation additive, le point physique atteignable, la conservation des services précédents et le refus de lancer sans sauvegarde de retour. Le typecheck TypeScript et le lint ciblé ont réussi. Les tests d’adaptateur utilisent uniquement une fonction factice et ne prouvent pas une campagne installée.

La recette navigateur et la validation de publication sont réalisées séparément par le coordinateur ; ce document ne les anticipe pas.
