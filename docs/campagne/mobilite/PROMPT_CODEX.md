# Prompt de production — mobilité raccordée à la bible

Ce prompt décrit un chantier futur. **Son inclusion dans la PR #116 n'autorise ni fusion ni déploiement et n'implémente aucun véhicule.** Lire d'abord [le contrat d'intégration](README.md), la campagne révisée et les consignes locales `AGENTS.md`, `docs/GAMEDEV_AGENT_GUIDE.md`, puis les références IA du dépôt uniquement si nécessaires. Maintenir un seul plan ; ne pas prétendre lancer des agents ou skills indisponibles.

## 1. Inspecter avant de modifier

Relever branche/SHA, changements concurrents et inventaire réel des véhicules, pods, montures, sprites, IDs et services. Les chemins ci-dessous sont des points d'entrée vérifiés dans la base de cette annexe, pas une garantie sur une future branche :

- `app/game/HuntCanvas.tsx`, `systems/huntSystems.ts`, `systems/huntMeleeCombat.ts` : simulation de chasse et rendu 2D.
- `HomeworldCityScene.tsx`, `HomeworldWorldSceneV77.tsx`, `systems/homeworld.ts`, `homeworldUsageEnvelopesV81.ts`, `homeworldNavigationV109.ts` : projection, services, gabarits, parcours et obstacles.
- `ClanShipHub.tsx`, `systems/clanShipDocking.ts`, `clanShipInterior.ts`, `clanShipOperations.ts`, `shipCatalogue.ts` : hangar, coques, contrats, équipage et amarrage.
- `save.ts`, `systems/activeHuntSave.ts`, `clanWarSessionV85.ts`, `homeworldCargoLedgerV108.ts` : propriétaires d'état et transactions.
- `hunterSpriteAtlas.ts`, `hunterSpriteMotion.ts`, `public/game/`, `public/audio/` : assets et contrats visuels.

Ne pas migrer le moteur, les dépendances verrouillées ou toutes les scènes vers un rendu unique. Ne pas ajouter un nouveau menu de cartes comme substitut à une boucle jouable.

## 2. Données : catalogue éditorial, adaptateur strict

Assembler les cinq fichiers JSON de `catalogue/` avec `metadata.json`. Conserver les 50 `id` et tous leurs champs ; une correspondance avec un ancien ID doit être explicitement auditée. Les stats sont des indices de catégorie, pas des mètres/seconde ou points de dégâts ; 0 est admis uniquement pour `offense` sans armement. Les tiers ne deviennent jamais des rangs.

Créer un schéma runtime distinct, strict et testé : définition, type véhicule/monture/drone/véhicule de mission, empreinte numérique calibrée, équipage, locomotion, contrôles, capteurs, capacités, ressources, animations, sons, VFX, sockets, restrictions et acquisition. Le catalogue n'a pas encore ces champs runtime ; ne pas le caster aveuglément. Extraire et examiner **tous** ses tags de terrain plutôt que recopier une union TypeScript incomplète. Tags inconnus refusés sans ouvrir un passage interdit.

Pour la possession : `instanceId`, `definitionId`, propriétaire de sauvegarde, emplacement monde/sous-zone/garage, conducteur, PV, énergie/endurance, chaleur/peur, BOND, blessures, améliorations, skin, trophées attachés, traces de combat, nom, quêtes et records. Distinguer exemplaires personnels, prêts, prises saisies, engins de mission et acteurs non pilotables. Un numéro de schéma ne remplace pas une migration compatible et idempotente.

## 3. Trois boucles complètes avant extension

Implémenter séparément puis tester `hunter_hoverbike`, `blade_fighter_k93`, `kha_rha`. Les scènes de validation restent isolées du profil réel ; aucun bouton de debug ne valide un rite. Brancher ensuite les familles en conservant propriété, budgets et critères de mission.

États minimum : stored, called, arriving, idle, mounting, controlled, airborne, attacking, braking, dismounting, abandoned, returning, recovering ; machines overheated/stunned/disabled/repaired/destroyed/wreck ; bêtes afraid/wounded/calmed/healed/down ; missions scriptedExit. Définir transitions, interruption, durée et nettoyage pour chaque état. Ne pas déclarer des états dans le diagramme sans les inclure dans les types et tests.

Contrôles via l'abstraction existante : direction, accélération, frein/recul, saut, visée, attaques, capacité, montée/descente, appel, stabilisation, abandon cargo, vue arrière contextuelle. Reset lors de pause/blur/changement de scène. Mesurer le delta de simulation et ne pas utiliser un délai mural pour les blessures hors ligne.

Collisions et navigation : empreinte au sol distincte de l'enveloppe d'usage, point de selle, pieds/mains, roues ou patins selon modèle, conducteur/cargo/hitboxes, pentes et réception. Respecter altitude, eau, toxicité et gabarit réel ; seuls les sols explicitement autorisés sont fouissables/destructibles. Projectiles et effets suivent position/orientation du socket. Interdire auto-impact incohérent sur le pilote.

## 4. Hubs, systèmes et sauvegarde

Étendre le hangar existant et ses services ; pas de deuxième Clan Ship ni de nouveau catalogue de coques. Dans les petites coques, refuser l'embarquement incompatible et proposer stockage de clan/récupération. Pour Homeworld, ajouter les services proposés seulement après implantation accessible et aller-retour testé ; conserver la navette locale.

Énergie, boost, camouflage, chaleur, pannes localisées, réparation, épave récupérable. Pour les bêtes : BOND, endurance, peur, blessure, alimentation, soins et capture progressive. KO récupérable par défaut ; retour à pied toujours possible. Personnalisation cohérente, skins finaux complets et trophées réellement possédés.

IA de poursuite avec perception, route, doublage, filet, barrage, perte de piste et juridiction. Les sanctions requièrent des faits ; aucun skin ne condamne le joueur. Convois, courses, duel monté et cargo n'accordent aucune récompense sans résultat validé et idempotent. Trophées physiques visibles jusqu'à l'extraction, sans second registre concurrent.

Ajouter un bloc de sauvegarde versionné via le propriétaire existant, lié à `ownerCreatedAt` lorsque requis. Ancien bloc absent = valeur sûre, pas remplacement de la sauvegarde. Préserver données inconnues récupérables et distinguer chargement invalide/absent. Tester au moins trois fixtures anciennes pertinentes, échec d'écriture, révision périmée, deux onglets et reprise après crash. Pas de pont V115/W3/V85 implicite. Ne pas créer de réseau multijoueur sous couvert d'un tag `co-op`.

## 5. Assets, caméra et robustesse

Utiliser chemins/manifestes du dépôt, ressources locales uniquement. Aucun chargement obligatoire sur Internet. Charger seulement les formats audio réellement supportés et référencés ; `.txt` n'est pas un son. Absence d'un son = silence propre ; placeholder visuel explicitement non final, sans fausse validation. Toutes les vues et animations de PRODUCTION_VISUELLE.md demandent encore une production.

Caméra adaptée à chaque rendu, anticipation bornée, dézoom doux, horizon fixe par défaut, options shake/roll, orientation non inversée par simple miroir d'un modèle asymétrique. Synchroniser VFX/SFX aux événements, gérer suspension et nettoyage. Performance cible 60 FPS desktop à **mesurer**, avec culling, pooling pertinent et aucune allocation massive par frame.

## 6. Validation et livraison

Parcours : initiation encadrée Grav-Sled, course Homeworld, Blood Runner/Enforcers, premier lien Kha'Rha, extraction lourde/colossale, duel monté, canopée, glacier, siège/skiff, évacuation en sphère. Ces scénarios restent à produire ; ils ne s'ajoutent pas aux 68 missions par simple intitulé.

Exécuter les contrôles MOB-QA-01 à 12 du contrat, les tests ciblés et les scripts actuels du dépôt. Distinguer tests de données, comportement, navigateur/manette, build, revue artistique et performance. `validated` de l'atlas exige la revue humaine. Le catalogue interne de production peut présenter une fiche « prévu » ; le codex joueur respecte les états de découverte des annexes compagnons, sans dévoiler cinquante inconnus.

Livrer fichiers, données, migrations, tests, captures réellement obtenues, mesures et limites. Ne pas clore les 50 lignes ni la cible « 20 pilotables » parce que les trois prototypes fonctionnent. Aucune fusion de PR ni publication sans demande correspondante.
