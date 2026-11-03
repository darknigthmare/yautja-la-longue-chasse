# V66 — La marque empruntée

Cette histoire originale adapte une proposition présente dans la discussion Homeworld déjà récupérée : un novice fabrique une preuve par crainte du déshonneur. La source est `tmp/chatgpt-audit-2026-09-08/share-1.conversation.md`, section « Les histoires secondaires », lignes 395–401. Le passage est une proposition de conception de la discussion, pas une nouvelle affirmation de canon ni une citation de dialogues préexistants.

L’enquête du convoi et ses choix restent indépendants. Le novice de ce récit n’est pas un personnage canonique identifié. Sa réponse est un message transmis par l’instructeur ; aucun nouveau modèle de PNJ présent dans la salle n’est prétendu livré. Les pratiques administratives et les heures de registre appartiennent à cette cité fictive du jeu.

## Parcours

Le parcours adulte comprend six rencontres physiques dans les intérieurs existants, avec 11 points de progression acquittés :

1. **Instructeur des terrasses** : accepter l’examen d’une déclaration. La pièce reste confiée à la forge, jamais à l’inventaire du joueur.
2. **Maîtresse des parures** : inspecter trois zones distinctes. Jointure de moulage, numéro de lot recouvert et gravure postérieure sont conservés séparément.
3. **Conservatrice des marques** : consulter les relevés, reconstruire leur chronologie avec des cartes déplaçables, puis choisir une conclusion étayée. Une mauvaise séquence ou une accusation infondée ne valide rien.
4. **Retour à l’instructeur** : recevoir la réponse du novice, distinguée des indices matériels, puis choisir une suite après lecture de ses effets.
5. **Branche choisie** : soit rectifier deux champs de la déclaration devant la gardienne des rites, soit déposer auprès du capitaine un dossier qui conserve les faits sans préjuger d’une sanction.
6. **Retour à l’instructeur** : confirmer la suite donnée. Le reçu de la branche ne clôt pas à lui seul l’histoire.

La rectification conserve le statut d’exercice non authentifié et conduit à une reprise encadrée de l’apprentissage dans les répliques finales. L’autre branche conserve un dossier d’examen avec les relevés et l’aveu. Aucun jugement futur, patrouille, sanction, rang, point d’honneur, objet ou trophée n’est simulé ni accordé. Le choix ne peut pas être réécrit par répétition de la conversation ; les revisites affichent sa conclusion.

## Contrat de raccord

Le module `systems/homeworldSideStoryV66.ts` fournit un état version 1, un normaliseur additif, un validateur strict, un journal et un mutateur pur. Le champ prévu est `HomeworldProgress.sideStoryV66`. Une ancienne sauvegarde sans ce champ reçoit un dossier vide. L’inspecteur général doit refuser une sous-version supérieure à 1 avant normalisation ; le mutateur refuse tout état incohérent et ne demande alors aucune écriture.

Le mutateur reçoit `{pointId,eligible}` et vérifie que l’action correspond exactement à l’étape et au point requis. Le raccord `HomeworldHub` doit en plus vérifier la proximité réelle, le dialogue ouvert, le propriétaire de la partie, la pause et l’éligibilité adulte. Il conserve l’ancien état si le stockage refuse la transition. Le composant ne progresse jamais de façon optimiste : ses seuls états locaux sont des brouillons de puzzle et le dernier retour du callback.

Les manipulations de cartes et les choix utilisent des boutons nommés, accessibles au clavier et à la navigation existante des dialogues. Les brouillons ne sont pas des preuves persistantes. Quitter un puzzle non validé ne marque pas l’étape comme acquise.

## Preuves et limites

`tests/homeworld-side-story-v66.test.mjs` couvre les deux branches, les 11 étapes, tous les mauvais lieux, les restrictions jeunesse, les actions hors ordre, les choix irréversibles, les erreurs de raisonnement, les relectures sans doublon et la reprise JSON. L’énumération de 3072 états candidats confirme que seuls les 19 états réellement atteignables par les actions sont acceptés par le validateur.

Les tests de modèle ne remplacent pas le raccord sauvegarde ni une recette navigateur. Les preuves ci-dessous distinguent ces niveaux. Aucun nouveau PNG, sprite animé, région ou acte de la campagne principale n’appartient à cette livraison.

Le raccord est maintenant couvert par `tests/homeworld-side-story-v66-integration.test.mjs` : le fichier extrait et exécute **le callback réel du Hub**, utilise les points et collisions des véritables intérieurs et écrit avec le module général de sauvegarde. Les sept tests passent : les deux fins, les refus et reprises d’écriture, l’acceptation et les deux débriefs PNJ, les dialogues périmés, les positions distantes, le changement de propriétaire, la pause, la jeunesse et la conservation des sous-versions futures. Les deux rapports d’expédition de ce test sont des fixtures déclarées, pas des sorties prétendument jouées.

Le lot ciblé annexe + PNJ + raccord compte **33 tests réussis** (8 + 12 + 7 + 6). Les six derniers exécutent les vrais callbacks de fin d’expédition extraits de `GameClient.tsx` avec le module de sauvegarde. Leurs rapports sont obtenus en jouant les moteurs des Marches et du Désert par leurs entrées de déplacement, de scan et d’interaction, sans modifier directement le personnage ni les objectifs. Ils vérifient notamment que la mission reçoit le rapport de la nouvelle sortie, pas le cumul historique, que le refus d’écriture reste réessayable et qu’un ancien propriétaire ne peut pas écraser la partie. Ce sont des tests de moteur et de callback, pas des expéditions parcourues dans un navigateur. Preuves : `v66-side-story-targeted-test-proof.json` (27) et `v66-npc-field-integration-proof.json` (6).

Les recettes `verify-homeworld-side-story-v66.mjs` et `verify-homeworld-npc-missions-v66.mjs` emploient des déplacements clavier et les portes réelles ; aucun placement direct de personnage n’est utilisé. Sur la première compilation stable V66, **les deux branches de l’annexe ont été jouées depuis un dossier vide**, avec leurs six rencontres, onze acquittements, erreurs de raisonnement, refus puis reprise d’écriture, rechargement réel et revisite finale. Les huit groupes de contrôles passent ; 18 captures ont été conservées, dont 10 relues visuellement par l’agent. Le puzzle a également été manipulé sur une fenêtre mobile et le bouton de relecture utilisé via confirmation de manette et clavier.

La recette PNJ distincte passe ses **trois trajets de ville et dialogues physiques** : acceptation vide, retour des Marches et retour du Désert. Les deux retours utilisent des **fixtures déclarées de rapports**, et ne constituent donc pas une preuve d’expéditions intégrales jouées dans le navigateur. Les huit captures PNJ ont été relues, notamment les retours mobiles, les déductions refusées et la fin sans récompense. Les rapports `v66-side-story-application-qa.json` et `v66-npc-missions-application-qa.json` conservent les empreintes des rapports bruts et cette limite de périmètre.

Les dialogues restent défilables verticalement sur mobile, sans débordement horizontal observé. Les retours d’erreur peuvent apparaître à la fois dans le panneau et le toast global ; cette répétition visuelle ne bloque pas les actions vérifiées. Les premières tentatives interrompues par Fast Refresh ou par des attentes erronées du harnais sont conservées séparément et ne sont pas comptées comme réussies. Cette recette locale précède les derniers correctifs indépendants de la compilation finale ; la publication et sa répétition publique constituent des preuves distinctes, encore à réaliser au moment de ce rapport.
