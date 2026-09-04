# Backlog croisé du projet ChatGPT Yautja

Date de reprise : 4 septembre 2026
Projet ChatGPT : `Yautja The Long Hunt` (`g-p-6a96ebd8ad388191b2f2b48b2107abed`)
Base de code auditée : `6338b489c29ee0838edb422f8c2faf0a5a5ffafa`

## Périmètre retrouvé

### Conversations dont l'appartenance au projet est prouvée

Le connecteur du projet ChatGPT expose deux conversations Yautja récentes dont
le champ `projectId` correspond exactement au projet indiqué ci-dessus :

1. `Audit état du jeu` : un tour utilisateur, audit général de la version live. La réponse dépasse la limite de lecture du connecteur après le début de la section Personnalisation ; les sections 1 à 8 sont exploitables et ont été recoupées avec le dépôt.
2. `Concevoir le DLC` : quatre demandes utilisateur, spécification de THE PIT, des movesets de 53 Hunters et de 424 finishers. La conversation est complète. Les pièces jointes annoncées par ChatGPT ne sont pas récupérables depuis le connecteur et aucun master THE PIT n'existe dans ce dépôt.

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
- **Combat et exploration** : une tranche de mêlée légère déterministe est
  intégrée à la campagne avec phases, combo de trois coups, hitboxes, hitstun et
  knockback. Les attaques lourdes et aériennes, la parade, l'esquive, le
  brise-garde, la projection et l'exécution restent à produire. Seules les
  régions jungle et glace disposent d'une branche Metroidvania persistante ;
  les six autres régions restent à produire.
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
| Déplacement | Avancé | Rebord, glissade, descente rapide, chute contrôlée, attaque aérienne et attaque depuis paroi | P1 |
| Mêlée de chasse | Partiel | Tranche légère déterministe livrée : startup/actif/récupération, combo de 3 coups, hitboxes directionnelles, hitstun et knockback sur ennemis et boss, interruptions. Restent les attaques lourde et aérienne, la parade, l’esquive, le brise-garde, la projection et l’exécution. | P0/P1 |
| Combat à distance | Partiel | Chaleur plasma, variantes de flèches, rappel manuel du disque et interactions avec le décor | P1 |
| Furtivité et perception | Partiel avancé | Cadavres, lumières, fausses traces, imitation, panique et adaptation aux habitudes du joueur | P1 |
| Honneur contextuel | Partiel | Statut armé, proie indigne/blessée, avertissement avant violation et interdits de clan | P1 |
| IA | Partiel | Soins, VIP, renforts complexes, familles, conflits inter-espèces, pièges IA et vol de trophée | P1 |
| Boss | Partiel | Structure complète d'étude et de contre-chasse pour chaque Apex, blessures localisées et routes détruites | P1 |
| Metroidvania | Deux régions sur huit | Six branches régionales, capacités permanentes et cartes spécialisées | P1 |
| Art V19 | Partiel | 336 références de décor encore absentes, puis validation en mouvement | P1/P2 |
| QA commerciale | Non validé | Parcours joués, performances, manettes physiques, Steam Deck, exécutable signé et droits de diffusion | P1 avant diffusion commerciale |
| Version PC indépendante | Absente | Exécutable natif, installation et mise à jour signées, mode hors ligne, sauvegardes adaptées et validation matérielle | P1 si cette distribution est retenue |

## THE PIT

### Contrat du mode

- Combat 2D un contre un, simulation fixe à 60 ticks.
- Deux rounds gagnants, 99 secondes par round.
- Léger, moyen, lourd et technique ; garde haute/basse, projection et anti-air.
- Startup, actif, récupération, hitboxes, hurtboxes, pushboxes, hitstun, blockstun, knockdown et relevée.
- Échanges simultanés équitables, combo scaling et protections contre les boucles.
- Modes CPU, versus local et entraînement libre sur une simulation déterministe.
- Progression et sauvegarde PIT séparées de la campagne ; récompenses uniquement cosmétiques.
- Accès depuis le vaisseau, antichambre jouable et raccourci direct.

### Livraison par lots

- [x] **PIT-01 — tranche verticale jouable** : moteur déterministe, Jungle Hunter, Berserker, Cercle de basalte, CPU, versus local, entraînement, rounds, revanche et retour au vaisseau.
- [x] **PIT-02 — données isolées** : sidecar PIT et archive replay séparés, versionnés et liés au propriétaire ; gestion des conflits, idempotence, verrou Web Locks avec lease de secours stabilisé, réparation verrouillée des archives corrompues, 23 actions configurables J1/J2/pause et migration des commandes V1 ; enregistrement compact des entrées résolues puis relecture déterministe sans statistiques ni récompense. Parcours navigateur vérifié jusqu’à ARCHIVE RESTITUÉE.
- [x] **PIT-03 — ressources de combat** : Traque, Rupture de chasse, Instinct de survie et camouflage lisible.
- [x] **PIT-04 — entraînement professionnel** : frame data, hitboxes affichables, dummy réglable, enregistrement et lecture d'entrées.
- [ ] **PIT-05 — première édition** : douze combattants, huit arènes, arcade individuel, histoire en cinq chapitres et Descente des fosses.
- [ ] **PIT-06 — finishers de la première édition** : huit séquences par combattant, variantes de victime et mode gore réduit.
- [ ] **PIT-07 — roster complet** : 53 Hunters et 1 179 actions de movesets.
- [ ] **PIT-08 — production longue** : 154 projections synchronisées, 424 finishers, 3 074 plaquettes, 12 296 clips et 38 054 poses originales.

Les volumes PIT-07 et PIT-08 sont des budgets de production, pas des contenus déjà créés. Toute référence officielle reste privée ; seuls le code, les données et les visuels originaux ou générés pour le projet peuvent être publiés.

## Ordre de reprise

1. Étendre la mêlée des chasses avec lourde, aérienne, parade, esquive, brise-garde, projection et exécution.
2. Étendre les six régions Metroidvania et leurs cartes.
3. Enrichir furtivité, IA, honneur et structure des Apex.
4. Terminer l'art, l'équilibrage, les playtests, les performances et la distribution native.
