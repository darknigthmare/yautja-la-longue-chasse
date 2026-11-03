# Audit V25 — lore, narration et durée de vie

Date : 5 septembre 2026. Base de travail : `94e93a8`, puis modifications V25 locales. Périmètre de ce rapport : continuité de la campagne, identité narrative de THE PIT, progression, revisites et preuves de contenu. La distribution PC, la géométrie des niveaux et les props sont auditées dans les autres volets V25.

## Conclusion

Le jeu possède une campagne de huit chasses et plusieurs boucles de rejouabilité réelles. Il ne possède pas encore toute l’histoire demandée pour le chasseur personnel de Cinder. Le Circuit réutilise des chasseurs connus dans un parcours linéaire ; ses titres de chapitres ne produisent ni choix de voie ni enquête. L’audit corrige les présentations qui masquaient cette différence et rend les revisites de campagne plus concrètes depuis la carte.

Aucune durée en heures n’est certifiée. Le nombre de missions, de duels, de trophées ou de combinaisons ne mesure pas le temps d’une première partie, la variété des situations ou la qualité du contenu.

## Sources et méthode

- Brief explicitement fourni : [Prompt pour Codex jeu vidéo](https://chatgpt.com/share/6a953a3a-3580-83eb-b024-13aaa284e2e2).
- Textes ChatGPT précédemment récupérés : [Concevoir le DLC](https://chatgpt.com/c/6a971a23-4280-83ed-afda-3fd8c987f116) et [Audit état du jeu](https://chatgpt.com/c/6a9adafd-5738-83ed-83b0-327a9c568a1e).
- Extraction et limites exactes : `docs/chatgpt-yautja-backlog-2026-09-04.md`. Certaines réponses sont tronquées ; les pièces jointes manquent. Ce volet ne prétend pas avoir récupéré l’intégralité du dossier ChatGPT.
- Continuité des huit missions : `docs/campaign-continuity-audit-2026-08-31.md`, recoupée avec `data.ts`, `save.ts`, `honorRules.ts`, `galaxyRegistry.ts`, `missionMastery.ts` et les modules PIT actuels.

Cinder, Serekh et leurs situations sont traités comme le lore original du projet demandé, pas comme des lieux dont le canon officiel Predator aurait été établi. Aucune nouvelle affirmation factuelle sur un film ou une publication officielle n’est introduite dans ce lot. Les movesets adaptés et les images ne sont pas certifiés 1:1 par cet audit de code.

## Écarts et corrections effectuées

| Priorité | Écart constaté | Correction V25 et portée |
| --- | --- | --- |
| P1 | Le Cercle de basalte était présenté comme une salle centrale du vaisseau clanique alors que le brief le situe dans une annexe du système Cinder. | L’arène `the-pit` indique désormais « Système Cinder · annexe orbitale du Cercle ». Identifiant, géométrie, collisions et règles de duel conservés. Le point d’accès depuis le vaisseau reste un accès au mode. |
| P1 | La Terrasse de verre était présentée comme une baie orbitale, pas comme Serekh-9. | L’arène `glass-terrace` indique les dunes vitrifiées et pylônes de Serekh-9. Les noms de ses quatre plans correspondent désormais à cette identité. Aucun décor bitmap définitif n’est prétendu créé. |
| P1 | Les chapitres promettaient de choisir une voie, d’identifier un profanateur et de fermer des voies interdites, sans mécanique correspondante. | Objectifs visibles réécrits pour annoncer les duels réellement jouables. L’interface ne présente plus les formats de conception « route » ou « investigation » comme activités livrées. |
| P1 | Le Circuit historique pouvait être compris comme l’arc personnel demandé. | Le panneau présente explicitement une chronique reconstituée de chasseurs de différentes époques et réserve l’histoire personnelle contre les Bad Blood de Cinder à un futur lot. Rival au combat 11 et reconstitution de Warlord au combat 12 restent inchangés. |
| P2 | Les sceaux étaient visibles mais indiquaient peu quoi faire lors d’une nouvelle visite. | Ajout d’une prochaine cible de maîtrise et d’un objectif secondaire encore non consigné, avec seuil concret, record actuel et rappel de l’extraction. Le bouton devient « Préparer cette revisite » après une réussite. |
| P1 | À 390 × 844, le spectre du scanner recouvrait le bouton du contrat : un vrai clic sur « Sang dans la canopée » était refusé. | Les lignes du dossier mobile utilisent une hauteur intrinsèque, ce qui garde scanner et navigation distincts. Le même clic ouvre maintenant le contrat ; accès au briefing vérifié. |
| P2 | Le libellé « Temps sous le par » ne disait pas que l’égalité est acceptée ; les cinq preuves peuvent provenir de différentes réussites. | Libellé « Temps au par ou mieux » et note explicite sur le cumul de plusieurs chasses. Aucune promesse de performance simultanée fictive. |

Fichiers de ce volet : `app/game/systems/pitFirstEdition.ts`, `app/game/PitCanvas.tsx`, `app/game/missionMastery.ts`, `app/game/GalaxyMapPanel.tsx`, `app/game/MissionReplayGoals.module.css`, tests correspondants ; correctif final limité à `GameClient.tsx` et `app/globals.css` pour le chevauchement des commandes de carte.

## Amélioration jouable de revisite

La carte de mission calcule les cibles depuis `MissionProgress` :

1. Premier sceau non acquis, dans l’ordre déjà publié : première extraction, objectifs requis consignés, score au moins 80, temps au par ou mieux, réussite Elite/Elder.
2. Premier objectif secondaire encore absent du registre, même si les cinq sceaux sont déjà acquis.
3. Record, seuil et consigne de retour sont affichés à côté du bouton de préparation existant.

Les missions verrouillées ne proposent aucune cible de revisite. Le système ne remplit aucun objectif, n’attribue aucune monnaie et ne déverrouille aucune mission par affichage. Il s’actualise à partir des preuves que le flux de réussite/extraction sauvegarde déjà. Les noms inconnus dans `completedObjectiveIds` ne remplacent pas un vrai objectif manquant.

Ce lot rend une boucle existante plus lisible ; il n’ajoute ni quête scénarisée, ni secteur, ni récompense artificielle. Les récompenses de rejouabilité existantes restent plafonnées par `save.ts` : amélioration du score et de la qualité, honneur de revisite borné, multiplicateur réduit des marques de clan. Un nouvel essai ne garantit pas une prise inédite.

## Campagne : cohérence confirmée et limites

| Sujet | État relu | Limite qui demeure |
| --- | --- | --- |
| Chaîne principale | Oseris-IV → Nivalis-K → Cinder-12 → Naraka-Delta → Serekh-9 → Pelagos-M → Mycora-V → Acheron-Sigma. La fin de campagne dépend de la huitième chasse dans `save.ts`. | Pas de preuve de huit parties complètes jouées dans ce volet. |
| Liens narratifs | Transpondeur, balises, fragments, glyphes et graines relient les destinations. Cinder est une étape et non une fin prématurée. | L’essentiel est transmis par briefings, objectifs et débriefs ; la vie de clan et les réactions post-chasse restent à étoffer. |
| Cinder-12 | La campagne possède déjà un Bad Blood original, un duel, une purge et un trophée correspondant. | Ce boss de campagne n’est pas automatiquement l’arc personnel du Circuit : le Circuit reste un autre mode et n’importe pas l’apparence du joueur. |
| Honneur | Les conditions de scan, retenue sur le plasma, récupération, rupture de plaques environnementale, duel, purge et second souffle existent dans `honorRules.ts`. | Pas de modèle universel de proie désarmée, indigne ou blessée, ni d’avertissement contextuel complet avant chaque violation. |
| Variété | Les chasses ont des environnements, Apex, surfaces, dangers et branches distincts. | Les cinq extensions partagent encore `expansionMission` : scans, éliminations, récupérations, Apex, extraction. Des seuils et attaques différents ne constituent pas cinq structures de mission entièrement indépendantes. |
| Revisite | Les acquis d’exploration, objectifs, records, maîtrise et qualité des trophées persistent déjà. V25 donne des objectifs concrets depuis la carte. | Pas de monde narratif entièrement transformé à chaque retour ni de nouvelle chaîne de quêtes post-campagne. |

Les améliorations des régions en cours dans les autres volets V25 sont à lire dans leurs propres rapports ; elles ne doivent pas être attribuées à ce seul correctif.

## Contenu réellement disponible, sans extrapolation horaire

| Boucle | Contenu vérifiable | Ce que cela ne prouve pas |
| --- | --- | --- |
| Campagne | Huit contrats principaux en chaîne, extraction et retour, records persistants. | Huit heures, huit niveaux entièrement originaux ou huit contre-chasses complètes. |
| Maîtrise | Cinq sceaux par contrat, soit quarante emplacements de preuve ; objectifs secondaires consignés. | Quarante missions nouvelles. |
| Exploration | Huit régions et leurs capacités, verrous, trophées et raccourcis persistants, selon les audits de niveau. | Huit mondes d’une durée mesurée ni toutes les routes validées sur matériel physique. |
| Arcade PIT | Douze combattants jouables, parcours de huit rencontres, deux boss Chronique. | Quatre-vingt-seize scènes narratives ou rencontres entièrement uniques. |
| Circuit PIT | Cinq chapitres et douze duels successifs par personnage, statistiques, reprise et cosmétiques PIT. | Des choix de route, une enquête ou le récit du chasseur personnel. |
| Descente PIT | Huit étages à branches, santé persistante, six modificateurs et quatre reliques avec effets réels. | Une durée infinie de contenu inédit ; les combinaisons réutilisent le même cœur de duel. |
| Entraînement | Réglages de dummy, données d’images, boîtes, enregistrement d’entrées ; atelier V24 séparé pour dix-sept séquences de rigs. | Leçons guidées complètes, avance d’un tick en entraînement de match ou prises synchronisées. |

Les budgets de 53 Hunters, 1 179 actions, 154 projections et 424 finishers ne sont pas ajoutés aux contenus livrés. Les illustrations V23 et l’atelier V24 ne livrent pas ces animations.

## Priorités de production restantes

- **P1, récit personnel PIT :** créer des Bad Blood originaux de Cinder, transmettre l’apparence personnelle, écrire et jouer les branches « Trois Voies », enregistrer les preuves de l’enquête et leurs conséquences. La simple substitution de noms dans le roster aurait falsifié le contenu et risqué les saves ; elle n’a pas été faite.
- **P1, campagne :** différencier les objectifs des cinq extensions et leurs conséquences ; donner au scan un renseignement tactique propre à chaque Apex ; définir les contraintes d’honneur avant la première violation possible.
- **P2, vie de clan :** réactions aux prises et au rang, dialogues évolutifs, exposition effective des titres/bannières et cosmétiques PIT. Les identifiants sauvegardés ne constituent pas une exposition dans le vaisseau.
- **P2, fin de campagne :** scènes et défis de retour rédigés, secteurs revisités dont le changement a un effet jouable, récompenses connues avant engagement.
- **QA :** chronométrer de vraies premières parties et revisites, relever abandons, échecs et temps de recherche, jouer tous les objectifs et extractions ; seulement ensuite annoncer une durée ou une valeur commerciale.

## Compatibilité et vérification

- Moteur PIT V4, format replay V3, identifiants des combattants/arènes/chapitres, ordre des duels et formats de sauvegarde inchangés.
- La nouvelle aide à la revisite est calculée depuis le schéma existant. Pas de migration ni de remise à zéro.
- 69/69 tests ciblés passés : `mission-mastery`, `pit-first-edition`, `pit-circuit`, `pit-circuit-ui`, `pit-replay`, `pit-save`. Quatre nouveaux scénarios vérifient succession des objectifs, verrous, cibles secondaires après maîtrise et ancienne progression vide.
- TypeScript passé après ces modifications.
- Contrôle ESLint ciblé passé. Le lot global refait les gates après toutes les modifications parallèles.
- QA navigateur locale réussie : titre → hub → console → carte → secteur/système/planète Oseris → contrat → briefing. Le bouton de contrat mobile initialement couvert est cliquable après correction. Les objectifs de première extraction sont lisibles ; leur évolution sur les records est couverte par les tests, pas par une campagne prétendument jouée.
- Circuit : cinq chapitres, douze duels et cadrage Chronique visibles. Carte et Circuit sans débordement horizontal à 390 × 844 ; carte également vérifiée à 1280 × 800. Aucune erreur JavaScript navigateur relevée.
- Preuves locales : `tmp/v25-circuit-desktop.png`, `tmp/v25-map-mobile-before.png`, `tmp/v25-map-mobile-fixed.png`. Le lecteur d’images sandbox étant bloqué, captures inspectées via prévisualisation JPEG mécanique, sans modification créative.
- Deuxième correctif QA livré après coordination : commandes parentes Retour au pont/Réglages séparées de la zone défilante de la carte. Un attribut de contexte dans `GameClient.tsx` limite les règles de `globals.css` à cet écran. À 390 px, toolbar terminant à126px et titre commençant à138px ; à1280px,153,27px puis165,27px. Boutons mobiles44px de haut et Réglages ouvert puis refermé par vrais clics. Capture finale : `tmp/v25-map-mobile-final.png`.
- Aucun commit ni déploiement réalisé par ce sous-audit.
