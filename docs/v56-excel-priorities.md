# Bible The Pit V54 : priorités et rapprochement V55

Lecture du 30 septembre 2026. Source utilisateur conservée intacte : `THE_PIT_BIBLE_COMBATTANTS_STAGES_V54.xlsx` (SHA-256 dans le JSON associé). Les données sont des propositions de production, pas la preuve d’assets ou de fonctionnalités livrés. Aucun lien de conversation ChatGPT ni média embarqué n’est présent.

## Périmètre vérifié

19 feuilles, 205 dossiers : 195 présents, 4 manquants identifiés, 2 candidats, 4 variantes. Priorités exactes : 18 P0, 2 P1, 185 P2. Les 4 variantes ne doivent pas créer automatiquement de nouvelles identités.

Le classeur décrit 174 dossiers de stages dont 36 propositions, 522 événements de fond, 3 690 actions proposées (18 par dossier), 322 armes/accessoires, 161 entités et 3 571 kits regroupant 12 399 définitions. Budget brut : 201 943 dessins, pas un nombre de PNG manquants.

Ordre explicite (`01_TABLEAU!E18:E21`) : identité/incarnation/armes → corps/actions/entités/variantes → récit/stage vivant/contre-jeu → personnage complet testé avant publication.

## Audit initial avant les corrections V56

Le tableau suivant conserve les écarts relevés au début de l’audit, avant les correctifs. Il ne représente pas l’état final du code. Les réalisations et limites après correction figurent dans « Correctifs runtime appliqués après l’audit ».

| Priorité | Écart constaté | Action | Source Excel |
|---|---|---|---|
|P0|pitFirstEdition.ts:403–408 : combistick et technique disque de retour encore présents.|Remplacer par actions lames/plasma adaptées, conserver les variantes de jeu seulement si clairement étiquetées.|02_PERSONNAGES!S5, 16_REGLES!D22|
|P0|pitFirstEdition.ts:554–568 : épithète Spear, longue lance, givre, ailée, device spear.|Corriger lexique et technique de frappe lourde ; dessins marteau natifs à produire/valider séparément.|02_PERSONNAGES!J14, 02_PERSONNAGES!S14, 16_REGLES!C20|
|P0|pitFirstEdition.ts:501–505 : shockwave mobile, speed 6, lifetime 24.|Percussion attachée au corps à portée courte, sans projectile onde.|02_PERSONNAGES!S11|
|P0|pitRosterExpansion.ts:35–36 : contre au gantelet ; texte indique chiens non implémentés.|Entité quadrupède propre, annonce, un seul chien, attaque/rappel, arrêt au KO ; ne pas remplacer par le drone.|02_PERSONNAGES!S17, 16_REGLES!C18, 16_REGLES!D18|
|P0|pitFirstEdition.ts:526–533 : contactEffect mark, damageScale/chipScale 0.|Préserver le comportement déjà non offensif ; vérifier pose mécanique et rappel, pas déclarer une nouvelle correction.|16_REGLES!C19, 16_REGLES!D19|
|P0|Toit Wolf déjà stage 126 mais variante narrative absente ; laboratoire Scarface/Stone Heart, scène nordique Valkyrie et Sandpiper Theta absents du lot V55.|Réutiliser 126 et créer/référencer les trois lieux réellement distincts après QA V55.|02_PERSONNAGES!O9, 02_PERSONNAGES!O13, 02_PERSONNAGES!O14, 02_PERSONNAGES!O19, 02_PERSONNAGES!O22|

Les 18 P0 sont Jungle Hunter, City Hunter, Scar, Celtic, Wolf, Feral, Berserker, Falconer, Scarface, Valkyrie, Witch, Enforcer, Tracker, Greyback, Theta, Machiko, Warlord et Stone Heart (`02_PERSONNAGES!B5:E22`). Le JSON préserve leurs 18 actions, présentations, campagnes et variantes avec chaque cellule. Les 2 P1 sont Bloodshed et Super Predator The Last Hunt (`03_MANQUANTS!B5:I6`).

## Stages : ne pas générer des doublons

Snapshot local au début de l’audit : 23 stages V55 (139–161) préparés, 195 associations, 161 compositions dont 138 activées. Ce rapprochement conserve l’état de départ ; l’activation et la QA postérieures appartiennent au rapport de stages V56. Leurs nouveaux fonds ne comptent pas comme 23 stages jouables avant validation.

Sur les 36 propositions Excel : 7 correspondent à des scènes V55 en attente de QA ; 3 sont partiellement couvertes par V55 ; 4 demandent un autre lieu que le cadre déjà associé ; 4 sont des variantes narratives autour de scènes existantes ; 18 ne figurent pas dans le plan V55.

| Proposition Excel | État / rapprochement | Travail restant |
|---|---|---|
|`new-gunnison-rooftop` (A24:N24)|existing-stage-scenario-pending ; arena-126-avpr-2007-hospital-roof|Le toit existe ; produire la variante narrative et la continuité d’équipement de Wolf.|
|`new-ahab-engineer` (A25:N25)|partial-v55 ; arena-148-ahab-lv223|LV-223 existe en préparation ; ruines et armes de la rencontre Ingénieur non validées visuellement 1:1.|
|`new-neonopolis-lab` (A26:N26)|different-setting-needed ; arena-137-concrete-jungle-neonopolis|Coursive industrielle existante, pas laboratoire des cyborgs, caissons et bras robotisés.|
|`new-bad-blood-forest` (A27:N27)|v55-awaiting-qa ; arena-140-bad-blood-pine-barrens|Valider composition/activation, puis vie de fond. Ne pas y rattacher Skinner sur la seule feuille Excel.|
|`new-alpha-revolt` (A28:N28)|not-in-v55 ; aucun correspondant V55|Créer la carrière comme chronique originale liée à Alpha, après référence identité/équipement.|
|`new-kenner-throne` (A29:N29)|not-in-v55 ; aucun correspondant V55|Créer hommage au trône NECA ; ne pas y fusionner King/Prince Marvel ni Kalakta.|
|`new-forge-cyborg` (A30:N30)|not-in-v55 ; aucun correspondant V55|Atelier original avec prothèses/modules propres. La forge 010 peut fournir des modules, pas une livraison de cette proposition.|
|`new-lava-ridge` (A31:N31)|not-in-v55 ; aucun correspondant V55|Corniche basaltique originale. Une couleur de figurine ne prouve pas une origine planétaire.|
|`new-hive-front` (A32:N32)|not-in-v55 ; aucun correspondant V55|Front original à références distinctes. Préserver les associations primaires spécifiques de Big Mama et Hashori.|
|`new-extinction-front` (A33:N33)|partial-v55 ; arena-147-extinction-lv742|LV-742 préparé ; installation de guerre et cycles de machines non livrés par cette seule scène.|
|`new-gotham-roof` (A34:N34)|v55-awaiting-qa ; arena-139-batman-gotham-rooftops|Composition à valider/activer ; faisceaux/acteurs chrono-compatibles restent à vérifier.|
|`new-gotham-bloodties` (A35:N35)|different-setting-needed ; arena-139-batman-gotham-rooftops|Toits communs ne sont pas l’entrepôt portuaire proposé. Confirmer père/fils et planches avant ajout.|
|`new-megacity` (A36:N36)|v55-awaiting-qa ; arena-155-judge-dredd-megacity|Valider composition et vie propre à Mega-City, aucun figurant Gotham.|
|`new-riverdale` (A37:N37)|v55-awaiting-qa ; arena-144-archie-riverdale|Valider composition et lisibilité ; les facades sont une recomposition originale.|
|`new-meta-lab` (A38:N38)|not-in-v55 ; aucun correspondant V55|Centre d’essai JLA à documenter ; ne pas dériver silencieusement un laboratoire de la scène Sinestro.|
|`new-sinestro` (A39:N39)|v55-awaiting-qa ; arena-156-sinestro-earth|Terrasse originale sur Terre attestée comme cadre général, pas planète inventée.|
|`new-dead-end` (A40:N40)|v55-awaiting-qa ; arena-142-dead-end-alley|Valider composition ; garder l’étiquette fan-film.|
|`new-phg-north` (A41:N41)|not-in-v55 ; aucun correspondant V55|Lisière nordique originale PHG ; ne pas compter la scène The Shield 116 comme cette biographie.|
|`new-phg-japan` (A42:N42)|not-in-v55 ; aucun correspondant V55|Cour PHG distincte des toits d’Oni, d’après biographie Samurai sourcée.|
|`new-phg-sands` (A43:N43)|not-in-v55 ; aucun correspondant V55|Ruines désertiques originales PHG, sans pouvoirs surnaturels ni culture inventée comme canon.|
|`new-phg-islands` (A44:N44)|not-in-v55 ; aucun correspondant V55|Récif proposé d’après Exiled ; référence biographique avant détail culturel.|
|`new-phg-pirate` (A45:N45)|not-in-v55 ; aucun correspondant V55|Pont d’épave original, aucun navire nommé sans source.|
|`new-phg-amazon` (A46:N46)|different-setting-needed ; arena-134-predator-hunting-grounds-overgrowth|Décor commun PHG existe ; rive brésilienne dédiée et faune cohérente non produites.|
|`new-bloodshed-ring` (A47:N47)|not-in-v55 ; aucun correspondant V55|P1 : identifier Predator de Bloodshed et géométrie du tournoi depuis source primaire.|
|`new-last-hunt-preserve` (A48:N48)|not-in-v55 ; aucun correspondant V55|P1 : réserve et captifs propres à The Last Hunt, ne pas copier Predators 2010.|
|`new-sandpiper` (A49:N49)|different-setting-needed ; arena-141-theta-tundra-outpost|P0 Theta : V55 prépare la toundra, pas la soute du Sandpiper demandée ici.|
|`new-jaguar-golgotha` (A50:N50)|existing-stage-scenario-pending ; arena-051-golgotha-etude-jaguar|Rapprocher précisément l’étude Jaguar et le scénario avant nouvel identifiant.|
|`new-classic-station` (A51:N51)|existing-stage-scenario-pending ; arena-130-avp-classic-2000-space-station|Station existante ; profil héros et route nécessaires, pas nouveau monde à compter.|
|`new-primal-temple` (A52:N52)|v55-awaiting-qa ; arena-146-primal-hunt-pilot-ruins|Valider composition ; mécanisme animé proposé encore distinct du fond.|
|`new-avp2` (A53:N53)|partial-v55 ; arena-145-avp2-lv1201-forest|Forêt/ruines LV-1201 préparées ; complexe colonial précis et mécanismes non couverts intégralement.|
|`new-badlands-forest` (A54:N54)|existing-stage-scenario-pending ; arena-119-badlands-2025-hostile-forest|Variante de cadrage/scénario de Dek autour d’un monde existant.|
|`new-bullet-hangar` (A55:N55)|not-in-v55 ; aucun correspondant V55|Plateforme originale de pilote après références ; ne pas ajouter bombardement au duel neutre.|
|`new-homeworld-wilds` (A56:N56)|not-in-v55 ; aucun correspondant V55|Lisière originale pour dossiers non vérifiés ; les lieux propres désormais attestés V55 restent prioritaires.|
|`new-warp-threshold` (A57:N57)|not-in-v55 ; aucun correspondant V55|Salle du seuil originale au projet, sans téléportation de personnage déduite.|
|`new-training` (A58:N58)|not-in-v55 ; aucun correspondant V55|Dojo non létal et mannequin séparé, sans biographie canonique inventée.|
|`new-snow-hunt` (A59:N59)|not-in-v55 ; aucun correspondant V55|Piste froide originale ; couleur blanche du sprite ne prouve pas habitat froid.|

## Ce que le classeur ne valide pas

- Aucun des 205 dossiers n’est marqué prêt à intégrer (`01_TABLEAU!B21`). Ce taux concerne cette prochaine production, pas le pourcentage actuel du jeu.
- Les 177 imports `user-*` conservent un profil partagé dans `pitUserRoster.ts` ; les 18 actions proposées ne sont pas implémentées par l’existence de la feuille.
- `docs/art/v52/animation-coverage-audit.json` est un contrôle historique : 9 variantes fournies animées sur 410. Un recomptage actuel du registre est nécessaire avant toute annonce.
- Le classeur ne contient aucun PNG et aucun son. Les 522 événements de décor exigent un rapprochement ID par ID, pas l’annonce sans preuve de 522 animations.
- Les groupes Skinner/Bad Blood, Serpent Hunter/Concrete Jungle et King-Prince Marvel/Kenner doivent être revus : les références primaires V55 priment sur ces regroupements proposés.

## Mausolée DLC

Aucune spécification du mausolée DLC dans ce classeur. Les seules mentions de mausolée sont la référence à l’arène existante 013 (`09_STAGES!B69:C69`) et ses 3 idées de vie. La règle DLC (`16_REGLES!C37:D37`) impose un manifeste des dépendances (corps, variantes, armes, entités, cinématiques, stage, PNJ) et interdit d’annoncer un pack prêt si l’une des dépendances essentielles manque. Après cet audit, la conversation « Audit GitHub de The Pit » a été retrouvée et lue séparément par l’agent principal (id `6aba9f72-876c-83eb-9805-6abcd5f0bec1`, copie complète locale `work-local/chatgpt-v56/the-pit-audit.json`, non versionnée). Elle confirme la priorité à terminer les combattants existants. Son contenu n’a pas été confondu avec une feuille du classeur.

## Correctifs runtime appliqués après l’audit

- Jungle Hunter : disque de retour remplacé par un projectile plasma linéaire à hauteur d’épaule, sans double retour. Le coup moyen utilise les lames, pas un combistick (`02_PERSONNAGES!S5`, `16_REGLES!D22`).
- Berserker : onde mobile remplacée par un heurt d’épaule attaché au corps et limité au contact (`02_PERSONNAGES!S11`). L’effet de contact ne dessine plus une boule de plasma.
- Valkyrie : marteau nordique, sans vocabulaire de givre, d’ailes ou de lance. Sa technique a une préparation de 28 ticks, 7 ticks actifs, 36 de récupération, une portée limitée et une garde possible (`05_MOVES_PROPOSES!P14`). Le dispositif est confirmé par les [notes officielles IllFonic 2.14](https://forum.predator.illfonic.com/t/patch-notes-2-14/18974). La pose procédurale n’est pas une nouvelle planche bitmap validée.
- Exercice de garde basse : le mannequin est désormais choisi parmi les profils qui possèdent réellement une technique basse. Jungle Hunter n’est plus choisi par défaut pour cet exercice après le changement de son équipement.
- Tracker : le chantier parallèle V56 a depuis livré une vraie entité chien au sol, avec entrée annoncée, attaque, rappel, une seule instance, et arrêt au KO du maître. Deux visuels distincts sont gérés par le registre dédié ; les dix compagnons originaux du nouveau pack ne sont pas renommés en chiens cinéma. La translation du bitmap n’est pas un cycle natif de course/morsure. Falconer reste un dispositif de marquage non offensif, sans nouvelle correction revendiquée.

Validation : 81 tests ciblés de combat/présentation/projections réussis, puis 103 tests ciblés de combat, entraînement, progression et replays réussis (lots partiellement recouvrants). Les tests simulent les deux orientations, les coups proches et manqués, la garde, l’interruption du marteau, la disparition des volumes de frappe, la sérialisation et des relectures déterministes. L’exercice garde basse est terminé par les 195 identités existantes dans le test de couverture.

Le premier contrôle ESLint combat était réussi. Le premier TypeScript global avait détecté une erreur du chantier mausolée (`GameClient.tsx:2128`, type `StationScreen`) : elle a été corrigée depuis. Le contrôle global `tsc --noEmit --incremental false` effectué après le catalogue a réussi ; le build V56 reconstruit est également confirmé par l’agent principal. Ce premier échec n’est donc plus un blocage actuel. Après l’intégration du chien Tracker et du catalogue compagnon, 25 tests de contrat/équipement passent ; ESLint des deux panneaux et du test passe sans erreur, avec trois avertissements `no-img-element` (rendu statique des PNG natifs conservé).

Compatibilité : la fixture V2 conserve son checksum historique `bf4337d5` et sa vérification avant migration. La résimulation après migration utilise les recettes corrigées. Les anciennes archives affectées par les recettes V54 ne sont pas déclarées compatibles : une fixture capturée depuis le commit publié V54 (`4d7dd050`) est refusée sans mutation de ses octets. Les anciennes fixtures de projection continuent de passer. Aucun ancien fichier de l’utilisateur n’a été réécrit.

Le classeur reste en lecture seule. Aucun nouvel art bitmap, certification 1:1, test navigateur ou déploiement n’est revendiqué par ces correctifs.

Limites encore ouvertes : animations natives de marteau/plasma et séparation arme/corps non produites dans cette passe ; retrait du canon selon variante démasquée de Jungle Hunter non implémenté ; le kit reste à quatre attaques moteur, pas aux 18 actions du classeur.
