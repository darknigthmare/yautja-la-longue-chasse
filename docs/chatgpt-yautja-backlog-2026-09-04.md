# Backlog croisé du projet ChatGPT Yautja

Date de reprise : 4–5 septembre 2026
Projet ChatGPT : `Yautja The Long Hunt` (`g-p-6a96ebd8ad388191b2f2b48b2107abed`)
Base initialement auditée : `6338b489c29ee0838edb422f8c2faf0a5a5ffafa` ; état fonctionnel mis à jour avec le lot de reprise du 5 septembre.

## Périmètre retrouvé

### Conversations dont l'appartenance au projet est prouvée

Le connecteur du projet ChatGPT expose deux conversations Yautja récentes dont
le champ `projectId` correspond exactement au projet indiqué ci-dessus :

1. [Audit état du jeu](https://chatgpt.com/c/6a9adafd-5738-83ed-83b0-327a9c568a1e) : un tour utilisateur, audit général de la version live. La réponse est tronquée à 20 000 caractères par le connecteur, après le début de la section Personnalisation ; les sections 1 à 8 sont exploitables et ont été recoupées avec le dépôt.
2. [Concevoir le DLC](https://chatgpt.com/c/6a971a23-4280-83ed-afda-3fd8c987f116) : les quatre tours utilisateur sont retrouvés, mais le texte des réponses n'est pas complet. Les réponses sur le concept, les movesets et les plaquettes de finishers sont chacune tronquées à 20 000 caractères. Seule la dernière réponse, récapitulant le pack de 53 Hunters et 424 finishers, est intégralement lisible (7 503 caractères). Les pièces jointes annoncées par ChatGPT ne sont pas récupérables depuis le connecteur ; aucun fichier master issu de ces pièces jointes n'a pu être récupéré. Les volumes annoncés sont vérifiables dans le texte, mais pas le détail exhaustif des catalogues joints.

L'énumération officielle est limitée aux 50 conversations récentes et ne fournit
ni pagination, ni recherche, ni filtre `projectId`. L'archive disponible concerne
les tâches Codex et ne contient aucun chat ChatGPT. Ces deux conversations sont
donc les seules dont l'appartenance au projet peut être prouvée avec l'API
actuellement exposée ; cela ne démontre pas qu'elles constituent tout
l'historique du dossier.

### Conversation Yautja fournie par le lien utilisateur

Le lien partagé par l'utilisateur expose une autre conversation complète :
`Prompt pour Codex jeu vidéo`, conversation source
`6a952ea7-63e8-83ed-a22a-7b6bee8bd489` et partage
`6a953a3a-3580-83eb-b024-13aaa284e2e2`. Elle contient un tour utilisateur et
trois prompts détaillés : vaisseau transformé en niveau jouable, kit graphique
OpenAI modulaire, puis profondeur et finition des huit chasses. Les fichiers
TXT, Markdown et ZIP annoncés sont devenus des références ChatGPT non
récupérables, mais le texte intégral des trois prompts reste lisible.

Le lecteur de conversation n'expose aucun `projectId` pour cette source et elle
n'apparaît pas dans la fenêtre des 50 conversations récentes. Elle est donc une
source Yautja explicitement fournie par l'utilisateur, mais son appartenance au
projet `Yautja The Long Hunt` ne doit pas être affirmée comme un fait.

Son état croisé avec le dépôt est le suivant :

- **Vaisseau jouable** : V21/V22 réalisent l'essentiel du parcours demandé avec
  huit salles, deux ponts, six coursives, deux puits, douze portes, des reliefs
  verticaux et huit stations. Les supports de trophées, le simulacre
  d'entraînement et le pupitre du sas utilisent encore leurs compositions
  antérieures ; le parcours complet doit toujours être validé dans un vrai
  navigateur avec clavier remappé, manette physique et tactile.
- **Kit graphique modulaire** : les contrats de grille, pivots, sockets, couches,
  alpha, provenance et empreintes sont appliqués aux lots du vaisseau V20 à
  V22. Le chantier global reste incomplet avec 336 décors de biome V19 absents,
  puis une validation visuelle en mouvement à effectuer.
- **Huit chasses** : la boucle préparation, chasse, Apex, prélèvement,
  extraction, débrief et retour existe. Les cinq chasses d'extension conservent
  cependant une structure trop proche fondée sur scans, éliminations, prises,
  boss et extraction ; leurs situations et conséquences doivent être davantage
  différenciées.
- **Combat et exploration** : la mêlée de chasse comprend désormais combo
  léger, lourde, aérienne, parade, esquive, brise-garde, projection et exécution,
  avec phases, hitboxes, hitstun, knockback, endurance et sauvegarde compatible.
  Les huit chasses ont une branche Metroidvania persistante ; les six nouvelles
  régions possèdent chacune danger, capacité, verrou, trophée, raccourci et carte
  spécialisée. Les animations synchronisées, visuels propres et playtests sur
  manette physique restent à produire.
- **Version PC indépendante** : aucun exécutable natif, installateur signé,
  mise à jour, fonctionnement hors ligne garanti ou validation Steam Deck
  n'existe. Le runtime reste un jeu React/Canvas publié sur le Web.

Ce fichier suit le code réellement présent. Une promesse écrite dans un chat n'est marquée terminée que si le comportement existe dans le jeu et peut être testé.

## État du jeu principal

| Domaine | État réel | Travail restant | Lot |
| --- | --- | --- | --- |
| Boucle titre, vaisseau, carte, briefing, chasse, débrief | Fait | Playtests de bout en bout et polish | P2 |
| Hub physique modulaire | Fait structurellement en V21/V22 | Supports de trophées, simulacre d'entraînement et pupitre du sas à modulariser davantage ; vie de clan, dialogues, événements post-chasse, réactions aux trophées, évolution par rang et validation interactive | P2 |
| Huit chasses | Fait pour la boucle principale | Objectifs, routes et conséquences plus distincts dans les cinq dernières chasses | P1 |
| Sauvegarde campagne et chasse active | Avancé | Export intégral des sidecars, profils multiples, diagnostic et éventuel cloud | P2 |
| Déplacement | Avancé | Rebord, glissade, descente rapide, chute contrôlée et attaque depuis paroi ; la frappe aérienne avec rebond est livrée | P1 |
| Mêlée de chasse | Avancé | Légère en combo de 3, lourde, aérienne, parade, esquive, brise-garde, projection avec réaction verticale et exécution sont intégrées avec fenêtres déterministes et contrôles clavier, manette et tactiles. Restent animations synchronisées, sons/haptique et playtests matériels. | P1/P2 |
| Combat à distance | Partiel | Chaleur plasma, variantes de flèches, rappel manuel du disque et interactions avec le décor | P1 |
| Furtivité et perception | Partiel avancé | Cadavres, lumières, fausses traces, imitation, panique et adaptation aux habitudes du joueur | P1 |
| Honneur contextuel | Partiel | Statut armé, proie indigne/blessée, avertissement avant violation et interdits de clan | P1 |
| IA | Partiel | Soins, VIP, renforts complexes, familles, conflits inter-espèces, pièges IA et vol de trophée | P1 |
| Boss | Partiel | Structure complète d'étude et de contre-chasse pour chaque Apex, blessures localisées et routes détruites | P1 |
| Metroidvania | Huit régions sur huit | Les six nouvelles branches, capacités, revisites, trophées et cartes spécialisées sont intégrés. Restent les bitmaps propres aux biomes et le playtest physique complet de chaque saut. | P2 |
| Art V19 | Partiel | 336 références de décor encore absentes, puis validation en mouvement | P1/P2 |
| QA commerciale | Non validé | Parcours joués, performances, manettes physiques, Steam Deck, exécutable signé et droits de diffusion | P1 avant diffusion commerciale |
| Version PC indépendante | Absente | Exécutable natif, installation et mise à jour signées, mode hors ligne, sauvegardes adaptées et validation matérielle | P1 si cette distribution est retenue |

## THE PIT

### Contrat du mode

- Combat 2D un contre un, simulation fixe à 60 ticks.
- Deux rounds gagnants et 99 secondes par round dans les modes standard ; la Descente utilise une manche décisive et conserve la santé entre les étages.
- Léger, moyen, lourd et technique ; garde haute/basse, projection et anti-air.
- Startup, actif, récupération, hitboxes, hurtboxes, pushboxes, hitstun, blockstun, knockdown et relevée.
- Échanges simultanés équitables, combo scaling et protections contre les boucles.
- Modes CPU, versus local, entraînement libre, Arcade, Circuit du clan et Descente sur le même cœur déterministe.
- Progression et sauvegarde PIT séparées de la campagne ; récompenses uniquement cosmétiques.
- Accès depuis le vaisseau, antichambre jouable et raccourci direct.

### Livraison par lots

- [x] **PIT-01 — tranche verticale jouable** : moteur déterministe, Jungle Hunter, Berserker, Cercle de basalte, CPU, versus local, entraînement, rounds, revanche et retour au vaisseau.
- [x] **PIT-02 — données isolées** : sidecar PIT et archive replay séparés, versionnés et liés au propriétaire ; gestion des conflits, idempotence, verrou Web Locks avec lease de secours stabilisé, réparation verrouillée des archives corrompues, 23 actions configurables J1/J2/pause et migration des commandes V1 ; enregistrement compact des entrées résolues puis relecture déterministe sans statistiques ni récompense. Parcours navigateur vérifié jusqu’à ARCHIVE RESTITUÉE.
- [x] **PIT-03 — ressources de combat** : Traque, Rupture de chasse, Instinct de survie et camouflage lisible.
- [ ] **PIT-04 — entraînement professionnel, partiel** : frame data, hitboxes affichables, dummy réglable, enregistrement et lecture d'entrées sont livrés. Restent l'avance image de simulation par image de simulation et les leçons guidées de garde basse, anti-air, déchoppe, sortie du coin et utilisation de la Traque.
- [ ] **PIT-05 — première édition jouable, partielle au regard du brief complet** : douze combattants sélectionnables, deux boss Chronique non sélectionnables, huit arènes à quatre plans et douze parcours Arcade de huit combats sont intégrés. Le Circuit actuel comprend cinq chapitres et douze duels linéaires, avec le rival au combat 11 et Warlord au combat 12 ; le chasseur personnel, les Bad Blood originaux de Cinder, les choix de voie et l'enquête restent à réaliser. La Descente comprend huit étages à branches, santé persistante, combats, reliques, récupérations et deux boss finaux possibles. Les douze combattants et les deux boss possèdent chacun une technique dédiée, avec entités, déclencheurs, mouvements, hitboxes, statuts et rendu propres selon l'arme. Les six modificateurs et quatre reliques de la Descente altèrent réellement les duels. Arcade conserve ses statistiques, son meilleur palier, ses complétions et ses cosmétiques ; Circuit et Descente sauvegardent et reprennent leurs runs complets en V5 après acquittement durable. Les récompenses restent uniquement cosmétiques. Restent aussi les movesets complets, dont les postures Contact/Arsenal de Scarface et l'exposition des récompenses dans le vaisseau. Le drone Falconer a depuis été corrigé en reconnaissance sans dégâts directs. Le rendu des combattants repose encore sur des silhouettes vectorielles temporaires ; les sprites, animations synchronisées et finishers relèvent des lots PIT-06 et PIT-08.
- [ ] **PIT-06 — finishers de la première édition** : huit séquences par combattant, variantes de victime et mode gore réduit.
- [ ] **PIT-07 — roster complet** : 53 Hunters et 1 179 actions de movesets.
- [ ] **PIT-08 — production longue** : 154 projections synchronisées, 424 finishers, 3 074 plaquettes, 12 296 clips et 38 054 poses originales.

Les volumes PIT-07 et PIT-08 sont des budgets de production, pas des contenus déjà créés. Toute référence officielle reste privée ; seuls le code, les données et les visuels originaux ou générés pour le projet peuvent être publiés.

Limite P2 connue : les parcours normaux tiennent dans le sidecar V5 de 64 Kio. De nombreux runs simultanés cumulant de longues séries de défaites peuvent atteindre ce plafond ; l'écriture échoue alors explicitement sans annoncer de progression.

## Audit des postulats — 5 septembre 2026

Relecture directe des passages accessibles de [Concevoir le DLC](https://chatgpt.com/c/6a971a23-4280-83ed-afda-3fd8c987f116) et [Audit état du jeu](https://chatgpt.com/c/6a9adafd-5738-83ed-83b0-327a9c568a1e), puis comparaison avec la base publiée `c6cd4b2`. Cette vérification porte sur les textes lisibles et le code, sans nouvelle validation matérielle. Les passages tronqués et pièces jointes ne sont pas supposés connus.

| Postulat ou écart | Constat sur la base auditée | Preuve locale |
| --- | --- | --- |
| Circuit du chasseur personnel et Chroniques distinctes | Le chat réserve les légendes aux Chroniques et prévoit une histoire du chasseur contre des Bad Blood de Cinder. Le Circuit actuel utilise les douze personnages historiques et termine contre Warlord ; aucune apparence personnelle n'est transmise au combat. | `app/game/systems/pitCircuit.ts`, `buildPitCircuit` ; `app/game/PitCanvas.tsx`, `PitCanvasProps` |
| Choix de voie et enquête | Les objectifs du registre promettent une voie de maîtrise et l'identification d'un profanateur. Le moteur ne propose qu'un prochain duel imposé, sans état de route ou de preuve. Les cinq titres de chapitres ne constituent pas encore leurs situations jouables. | `app/game/systems/pitFirstEdition.ts`, `PIT_CLAN_CIRCUIT_CHAPTERS` ; `app/game/systems/pitCircuit.ts`, `getPitCircuitAvailableFights` et `selectPitCircuitFight` |
| Fidélité de Falconer | Le chat exige un drone d'observation et de marquage, sans armement inventé. La technique actuelle est un drone à poursuite avec dégâts (`damageScale: 0.92`) et hitstun ; il faut réserver les dégâts aux attaques du Hunter et conserver la reconnaissance au drone. | `app/game/systems/pitFirstEdition.ts`, `falconer-drone-intercept` ; `app/game/systems/pitCombat.ts`, calcul des dégâts de technique |
| Movesets complets et Scarface | La première édition dispose de quatre attaques dont une technique par combattant. Scarface utilise un contre ; ses postures Contact/Arsenal et leurs transitions demandées dans le chat sont absentes. | `app/game/systems/pitCombat.ts`, `PitAttackKind` et `PitFighterDefinition` ; `app/game/systems/pitFirstEdition.ts`, `scarface` |
| Entraînement guidé | Les instruments de mesure et l'enregistrement sont présents. L'avance d'un seul tick et les leçons de défense, anti-air, déchoppe, sortie du coin et Traque restent absentes. | `app/game/systems/pitTraining.ts`, `PitTrainingSettings` ; `app/game/PitCanvas.tsx`, laboratoire d'entraînement |
| Récompenses visibles dans le vaisseau | Le chat prévoit masques, matières, bannières, titres, poses et alcôves. Les récompenses Circuit restent des identifiants PIT ; l'interface permet uniquement d'équiper la palette Arcade pour la session de combat. L'exposition dans le vaisseau reste à intégrer. | `app/game/systems/pitCircuit.ts`, `PitCircuitCosmeticReward` ; `app/game/PitCanvas.tsx`, `cosmeticControl` ; `app/game/ShipHub.tsx` |
| Identité des arènes | La Terrasse de verre est située sur Serekh-9 avec dunes vitrifiées dans le chat, mais le registre en fait une baie orbitale. Le Cercle de basalte était proposé dans une annexe du système Cinder ; le registre le place dans le vaisseau clanique. Ces prémisses doivent être fixées avant de produire les décors définitifs. | `app/game/systems/pitFirstEdition.ts`, `PIT_FIRST_EDITION_ARENAS` |
| Sprites, animations et finishers | Les personnages et arènes sont encore dessinés en primitives Canvas. Le moteur ne possède pas les séquences synchronisées attaquant/victime pour les deux supers, ultime, exécution honorable, fatalité, brutality, autodestruction interrompable et Dernière Chasse. L'option gore réduit sur les impacts ne termine pas les variantes de finishers. | `app/game/PitCanvas.tsx`, rendu Canvas ; `app/game/systems/pitCombat.ts`, `PitActionState` |

Les manques du jeu principal restent ceux du tableau précédent : modularisation des derniers supports du hub, vie du clan, situations distinctes dans les cinq chasses d'extension, furtivité, IA, honneur, contre-chasse des Apex et 336 décors V19. Les huit branches Metroidvania livrées ne clôturent pas ces autres exigences.

**Images OpenAI V23 : quatre illustrations de sélection livrées.** Le chat recommande de commencer par Jungle Hunter contre Berserker, puis les douze combattants et les boss. L'exigence est une fidélité maximale aux références visuelles disponibles, avec modules et armes cohérents et séparés ; les éléments sans référence attestée doivent rester identifiés comme interprétations. Jungle Hunter, City Hunter, Berserker et Wolf sont générés à partir des présentations V5, intégrés et contrôlés : quatre PNG sources, quatre WebP opaques, personnages entiers et sans miroir. Les deux prises de City Hunter ont été régénérées après le défaut de main signalé par l'utilisateur, puis relues visuellement. Les mains, articulations, attaches et intersections font désormais partie du contrôle obligatoire de chaque image (voir `docs/yautja-visual-fidelity-rule.md`). Ce lot ne livre aucune animation ni module transparent et ne certifie pas une reproduction cinématographique 1:1. Le tableau ci-dessus décrit la base auditée avant corrections ; depuis, Falconer dispose d'un marquage sans dégâts, stun ni recul.

## Ordre de reprise

1. Différencier les cinq chasses d'extension et enrichir furtivité, perception, IA, honneur et contre-chasse des Apex.
2. Compléter le déplacement avancé et le combat à distance.
3. Produire PIT-06 ; traiter PIT-07 et PIT-08 comme des programmes de production distincts et budgétés.
4. Terminer les 336 visuels V19 manquants, les animations, l'équilibrage, les playtests matériels et les performances.
5. Produire la version PC indépendante si cette distribution est retenue.

## Compatibilité après correction Falconer

Le moteur de duel passe en V4. Les replays du moteur V3 sont explicitement incompatibles et ne sont plus rejoués avec les nouvelles règles. Le format compact de replay reste V3. Les archives sont remplacées sous verrou lors du prochain enregistrement ; une archive liée à une autre campagne reste préservée. La campagne et les statistiques Circuit/Descente ne sont pas réinitialisées.

## Atelier modulaire V24 — 5 septembre 2026

La route `/pit-lab` prépare les animations Jungle Hunter/Berserker à partir des quinze segments V3 par corps, avec dix-sept séquences, pause, avance d’une image, zoom et deux orientations. Les fragments parasites des mains et d’une jambière sont exclus du rendu ; Berserker ne reçoit pas de filet dans cet atelier. Les masques et armures restent provisoires : le rendu normal des matchs est inchangé, aucune animation synchronisée ni nouvelle image OpenAI n’est déclarée livrée. Cela ne clôture pas PIT-04, PIT-06 ou PIT-08. Voir [l’audit V24](pit-animation-v24-audit.md).
