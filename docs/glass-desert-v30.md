# Désert de Verre — lot V30

Source : [conversation Homeworld intégrale](https://chatgpt.com/share/6a9f6ce6-2548-83eb-a8ee-152b84e89fe5), copie locale share-1.conversation.md. Le désert reprend les plaques vitrifiées, le prédateur fouisseur sensible aux vibrations, les rochers, les pas mesurés, les leurres et les sites d’expéditions abandonnées du brief. L’enquête locale sur des transports de proies détournés développe son fil général de preuves falsifiées ; elle ne résout ni l’identité du responsable ni un acte de la campagne.

## Périmètre livré dans les sources

Deuxième expédition physique après un rapport des Marches durable. Aucun résultat THE PIT requis. Terrain de 3 600 × 1 120, rochers et corniches à plusieurs hauteurs, bassins résonnants, relais, site de transit et passage à rétablir avant la navette. La course et les réceptions sur le verre éveillent le fouisseur ; sa cible est annoncée avant l’émergence. Le déplacement prudent, le refuge sur roche et trois leurres prêtés pour la sortie permettent de gérer la traversée.

Le joueur choisit les corniches et leur cairn supérieur ou une diversion par leurre. Il relève le terrain, récupère un journal de transit et confronte celui-ci à une balise de rabattage. Garder son signal vivant pour l’enquête ou couper l’attraction locale est un second choix expliqué avant confirmation. Le secret documente un composant ancien ; aucun objet d’inventaire fictif ni bonus d’honneur n’est accordé.

Le rapport n’est annoncé livré qu’après acquittement de la sauvegarde. En cas d’échec, la scène reste ouverte et propose de réessayer. Les deux choix sont conservés aux revisites ; le secret est cumulatif et la meilleure durée est gardée. La normalisation des anciennes sauvegardes V7 conserve les Marches et ajoute une entrée Désert nulle. Un rapport Désert isolé sans rapport Marches est rejeté. Les huit autres régions et les cinq actes complets restent explicitement à produire.

## Art et commandes

Les plans utilisent les bitmaps originaux du projet : desert-depth-v8, modules de roche/verre et accessoires v19, terminal v22 et apparence personnelle HunterRigPreview. Aucune illustration officielle externe n’a été copiée. Le fouisseur emploie provisoirement une pose du sandmaw-juvenile-sheet du projet : bande de 1 536 × 192, six cellules de 256 × 192, quatrième pose d’émergence. Ce recyclage et l’animation finale manquante sont indiqués dans l’interface.

Clavier remappé : déplacement, saut, scanner, interaction, visée maintenue pour les pas mesurés et premier équipement pour le leurre. Manette : stick/croix, A saut, X scanner, Y interaction, B leurre, LT pas mesurés et Start pause ; les décisions et dialogues sont navigables. Boutons tactiles, capture/libération de pointeur, pause de perte de focus et dialogues accessibles sont présents.

## Vérifications effectuées

- 33 tests passent : glass-desert, homeworld et save-homeworld-v7. Les deux traversées sont réalisées par simulation des entrées, avec détour secret pour les corniches ; validation stricte, idempotence, conservation des autres rapports, choix irréversibles, télégraphie, recharge et reprise locale sont couverts.
- TypeScript global et ESLint ciblé passent.
- Fixture Chrome : parcours réel au clavier, décisions via manette émulée, pause stable, refus d’acquittement sans faux retour ni rapport, puis nouvelle tentative réussie. Aucun échec de requête ni erreur JavaScript. À 390 × 844, déplacement par bouton maintenu et absence de débordement horizontal.
- Preuve détaillée : glass-desert-v30-fixture-qa.json. La fixture possède volontairement un rapport Marches de test ; elle ne constitue pas la recette intégrée. L’horloge navigateur est contrôlée et ne certifie pas la cadence matérielle.

La recette du vrai GameClient, depuis un profil neuf avec les Marches obtenues en jouant, est préparée et attend le build final V30. Aucun paquet PC V30 ni déploiement n’est certifié par cette note.
