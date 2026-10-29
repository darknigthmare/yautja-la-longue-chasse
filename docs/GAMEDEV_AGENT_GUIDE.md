# Guide de développement — Yautja : La Longue Chasse

## Objectif et portée

Utiliser les méthodes de [awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
pour mieux cadrer les modifications de notre jeu : comprendre le système existant,
choisir une méthode adaptée, définir ce qui doit fonctionner et produire des preuves
à la hauteur du résultat annoncé.

Ce document est une adaptation au projet. Les huit guides retenus sont des références
externes consultées selon la tâche ; cette intégration ne constitue pas une installation
native de skills dans ChatGPT, Codex ou un éditeur. Les consignes locales restent
lisibles hors ligne. Si un guide externe est inaccessible, signaler la lecture manquante
et poursuivre ce que les sources du projet permettent de vérifier.

**Base inspectée :** `3943522296dff8cdb2d183dd7f9b7132b2a912c6` sur `main`, le 29 octobre 2026.
**Source retenue :** `19d93f97c9c1ea0f8b306e77aa81e0d3e352d3e9`.
Les liens complets sont enregistrés dans [gamedev-skill-sources.json](gamedev-skill-sources.json).
Ces références décrivent une base datée : relire la branche de travail avant chaque modification.
Une PR encore ouverte ne doit pas être décrite comme intégrée à `main`.

Première application aux sauvegardes et au chargement des sprites :
[corrections et vérification du 29 octobre 2026](gamedev-application-20261029.md).
Suite : [imports concurrents, CI et parcours navigateur](gamedev-followup-20261029.md).
Application suivante : [guidage Homeworld et générateur historique V102](gamedev-homeworld-legacy-20261029.md).
Suite performance : [profilage et préparation des trajets Homeworld](gamedev-navigation-performance-20261029.md).
Suite runtime : [collisions réutilisées, annulation des trajets et preuves comparées](gamedev-homeworld-runtime-20261029.md).

## Démarrer une tâche

1. Relever la branche et le commit de départ, lire les consignes applicables et trouver
   un exemple fonctionnel voisin du changement demandé.
2. Identifier le rendu, le propriétaire de l'état, les unités de temps et d'espace,
   les entrées, les données sauvegardées et le cycle de chargement concernés.
3. Sélectionner le minimum de guides dans le tableau ci-dessous. Pour le raccordement,
   consulter la [référence moteurs personnalisés][custom-engines]. Ouvrir les
   références secondaires seulement si elles servent à la tâche.
4. Définir quelques critères observables adaptés au problème, puis réaliser une
   modification cohérente de bout en bout : données, logique, rendu/interaction,
   sauvegarde quand elle est concernée.
5. Vérifier le résultat avec les contrôles appropriés et mettre à jour le suivi existant
   du chantier. Donner le chemin des fichiers, la commande réellement exécutée et
   les limites qui restent pertinentes.

Les exemples Godot, Unity ou Unreal des guides servent à comprendre une méthode.
Pour ce projet, leur traduction passe par les modules TypeScript déjà présents.
Conserver les versions du `package-lock.json` ; une version conseillée par le
catalogue ne demande aucune migration. Les références externes n'ajoutent pas d'outils
à la session et leurs commandes d'installation ne s'exécutent pas automatiquement.

## Sélection des guides

| Chantier | Guide principal | Complément conditionnel | Résultat à rechercher dans notre jeu |
| --- | --- | --- | --- |
| Sprites, variantes, textures, décors | [create-game-assets][assets] | level-design si placement en scène | Ressource identifiable, visible à l'échelle réelle, compatible avec son rôle et son animation. |
| Homeworld, bâtiments, passages, implantation | [level-design][levels] | game-ai si navigation modifiée | Parcours praticable et objets réellement utilisables dans les espaces prévus. |
| Planètes, régions, territoires, scattering | [procedural-gen][procgen] | save-systems ; performance si nécessaire | Génération reproductible, règles géographiques vérifiables et compatibilité des parties. |
| PNJ, chasse, poursuite, évitement | [game-ai][ai] | [ai-behavior-trees-utility-ai][advanced-ai] pour décisions complexes | Décisions, déplacements et cheminement cohérents avec le rôle du PNJ. |
| Sauvegardes, reprise, progression | [save-systems][saves] | procedural-gen pour identité du monde | État conservé après fermeture/rechargement et migration compatible. |
| Impacts, lisibilité des coups, retours visuels/sonores | [game-feel][feel] | performance si effets coûteux | Action perceptible, commandes et simulation toujours correctes. |
| Saccades, scènes chargées, mémoire | [performance-optimization][performance] | guide du système mesuré | Cause identifiée puis amélioration mesurée sur un scénario reproductible. |

Pour un autre chantier, utiliser le [routeur][router] afin de choisir le guide pertinent,
puis contrôler sa compatibilité. Cette sélection ne prétend pas couvrir chaque problème
de développement, chaque règle de lore ou tous les besoins de QA.

## Carte d'intégration vérifiée

Les chemins ci-dessous sont relatifs à la racine. Ils servent de points d'entrée ;
chercher leurs appels dans la branche courante avant d'en déduire le contrat complet.

| Domaine | Points d'entrée existants | Contrat à préserver |
| --- | --- | --- |
| Chasse en Canvas 2D | `app/game/HuntCanvas.tsx`, `app/game/systems/huntSystems.ts`, `app/game/systems/huntMeleeCombat.ts` | Boucle de simulation/rendu, nettoyage de la boucle et séparation des règles de combat. |
| Homeworld en DOM/CSS | `app/game/HomeworldCityScene.tsx`, `app/game/HomeworldWorldSceneV77.tsx` | Projection du sol, sprites verticaux et profondeur fondée sur les coordonnées au sol. |
| Implantation et usages | `app/game/systems/homeworldUsageEnvelopesV81.ts`, `app/game/systems/homeworldUrbanLayoutV78.ts`, `app/game/systems/homeworldStreetCompositionV92.ts` | Empreinte de collision distincte de l'espace nécessaire pour utiliser un objet. |
| Navigation | `app/game/systems/homeworldNavigationV109.ts`, `app/game/systems/homeworldWayfindingV111.ts`, `app/game/homeworldRouteWorkerV111.ts` | Obstacles dynamiques, invalidation des trajets et résultats de calcul devenus périmés. |
| Génération stratégique | `app/game/systems/clanWarPlanetGeneratorV103.ts`, `app/game/systems/clanWarPlanetGeographyV103.ts`, `app/game/systems/clanWarPlanetsV96.ts` | Identité versionnée du monde, régions/territoires configurables et règles de géographie. |
| Matériaux planétaires | `app/game/planetMaterialRendererV101.ts`, `app/game/PlanetMaterialCanvasV101.tsx` | WebGL pour les matériaux ; conserver l'interaction, les libellés et le clavier dans leur couche SVG. |
| Sprites et PNJ | `app/game/hunterSpriteAtlas.ts`, `app/game/hunterSpriteMotion.ts`, `app/game/systems/homeworldNpcVariantsV84.ts`, `app/game/HomeworldNpcSpriteV84.tsx` | Identifiants, atlas/mouvements et objectif existant de vingt variantes par rôle. |
| Persistance | `app/game/save.ts`, `app/game/systems/activeHuntSave.ts`, `app/game/systems/clanWarSessionV85.ts` | Propriétaire de la sauvegarde, contenu sérialisé, indépendance des sessions et reprise. |

React/Next constitue l'enveloppe applicative ; chaque scène garde son chemin de rendu.
La présence d'un canvas décoratif ne justifie pas de déplacer les zones interactives
dans WebGL. Ne pas appliquer une recette de batching de sprites Canvas à un problème
de composition DOM sans mesure du coût réel.

## Critères propres au jeu

Ces critères guident les prochaines modifications ; ils ne déclarent pas tous les
systèmes déjà conformes. Reprendre les contrats existants avant d'ajouter une règle.

### Homeworld et level design

- Utiliser les dimensions de l'acteur et les enveloppes d'usage déjà définies pour
  décider des dégagements de porte, passages, bancs, ateliers et points de service.
  Garder une source de vérité commune à l'implantation et aux vérifications.
- Donner une orientation et un usage à chaque groupe de props ; conserver une
  approche libre, un accès à l'interaction et une sortie. Vérifier les deux sens du trajet.
- Réserver les façades, pieds de bâtiments, croisements et zones d'attente nécessaires.
  Examiner les recouvrements visuels avec la projection et le tri en profondeur réels.
- Respecter les parcelles de planification marquées `interactive: false` ; leur présence
  dans un plan ne suffit pas à en faire une pièce visitable ou un obstacle.
- Vérifier un parcours concret depuis une arrivée jusqu'au service concerné,
  puis le retour, y compris lorsqu'un obstacle mobile ou un chargement change le chemin.

### Sprites, PNJ et fidélité visuelle

- Relier une ressource à son personnage/rôle, à sa variante, à sa référence visuelle
  et à son état de production. Conserver les anciens fichiers utiles et leurs identifiants.
- Vérifier silhouette entière, proportions, visage Yautja, dreadlocks, équipement,
  palette, cadrage, pivot, échelle et visibilité dans la scène et les poses concernées.
- Pour les PNG, contrôler les dimensions et l'alpha, mais aussi l'existence de pixels
  visibles et les bords occupés : posséder un canal alpha ne suffit pas.
- Distinguer variation visuelle, animation et comportement. Une recoloration seule
  ne doit pas être comptée comme une nouvelle animation ou une nouvelle IA.
- Le contrat de `hunterSpriteAtlas.ts` réserve `validated` à la revue artistique humaine.
  Une génération, un chargement réussi ou un contrôle technique ne change pas ce sens.
- Appuyer la fidélité canonique sur les références du projet. Documenter séparément
  une création originale, une adaptation et un élément confirmé ; le catalogue gamedev
  ne fournit aucune preuve de lore Yautja.

### Planètes, territoires et matières

- Conserver graine, paramètres et version du générateur ensemble. Vérifier le même
  résultat après rechargement avec le même contrat, et la compatibilité V102/V103 concernée.
- Séparer les règles géographiques, les données stratégiques et leur présentation.
  Les réglages d'atmosphère ou de matière doivent respecter l'indépendance prévue
  des données de territoire.
- Pour une modification des régions, tester voisinage, accès et traversées selon les
  règles voulues : une île peut être séparée par la mer, mais son accès doit être défini.
- Essayer plusieurs graines déterminées à l'avance et les cas limites touchés :
  couverture liquide, fragmentation, nombres de régions/territoires et positions de départ.
- Contrôler raccords, répétitions et zones polaires si le rendu concerné les utilise ;
  le guide générique ne fournit pas à lui seul une projection planétaire complète.

### IA, combat et performances

- Identifier séparément la décision, la sélection de cible, le déplacement et le
  calcul de chemin. Ajouter une complexité d'arbre de comportement seulement si
  les décisions à gérer la nécessitent.
- Vérifier perception, perte de cible, blocage, reprise, cooldowns et interactions
  avec les changements de scène. Respecter les capacités de la caste ou du rôle.
- Relier les effets d'impact à l'événement de combat approprié. Vérifier que pause,
  ralenti, changement d'onglet et reprise conservent des commandes et horloges correctes.
- Mesurer les performances dans une scène identifiée : matériel, navigateur, résolution,
  nombre d'acteurs, effets et durée. Comparer temps de trame, pics et mémoire avant/après.
  Un objectif de FPS est un objectif jusqu'à sa mesure.

### Sauvegardes et suivi de production

- Tester aller-retour sérialisation/chargement, fermeture puis reprise, anciens formats
  concernés, données invalides et échec d'écriture. Préserver la progression récupérable.
- Adapter les principes du guide au stockage navigateur déjà utilisé ; une recette
  de renommage atomique de fichier ne s'applique pas directement au navigateur.
- Reporter les changements dans le classeur/manifeste réellement utilisé par le
  chantier. Un guide ajouté ne fait pas passer une ligne de suivi à « terminé ».
- Garder distincts contenu prévu, généré, intégré, testé et validé visuellement.
  Préserver les preuves historiques, leurs empreintes et leur contexte d'exécution.

## Vérification proportionnée au changement

Lire d'abord `package.json` et le contenu des scripts de la branche courante.

| Contrôle existant | Usage et limite |
| --- | --- |
| `npm run lint` ; `npm run typecheck` | Analyse statique ; ne prouve pas le comportement ou l'apparence en jeu. |
| `node --experimental-strip-types --test --test-concurrency=1 tests/<fichier-ciblé>` | Exécuter les fichiers adaptés à la modification ; identifier ce qu'ils vérifient réellement. |
| `npm run build` | Construction via vinext dans la base inspectée. |
| `npm run build:production` | Chemin de production Next, via `scripts/build-production-v94.mjs` et `next build --webpack`. |
| `npm run qa:next-production` | Vérifications HTTP du serveur construit et de ses ressources ; aucun parcours utilisateur automatique n'est établi par ce seul contrôle. |
| `npm run build:desktop` ; `npm run qa:desktop` | Cible desktop distincte ; sélectionner ces contrôles lorsque cette cible est concernée. |

Points de départ ciblés existants :

| Modification | Tests à examiner |
| --- | --- |
| Navigation Homeworld | `tests/homeworld-dynamic-navigation-v109.test.mjs` : simulation de trajets et obstacles avec le déplacement réel de l'acteur. |
| Générateur et sauvegarde de territoires | `tests/planet-generator-integration-v103.test.mjs` : modules de production, compatibilité, stratégie et rechargement avec stockage de test. |
| IA et combat de chasse | `tests/hunt-systems.test.mjs`, `tests/hunt-melee-combat.test.mjs`, `tests/corpse-discovery-v112.test.mjs`. |
| Atlas et mouvements | `tests/hunterSpriteAtlas.test.ts`, `tests/hunterSpriteMotion.test.ts` : compléter par l'inspection du rendu. |
| Échecs de persistance | `tests/save-storage-status.test.mjs` : comportements de stockage et assertions de source mêlés. |

Pour les modifications de rendu ou d'interaction, compléter les tests pertinents par
un parcours navigateur, avec résolution, point de départ, actions et captures inspectées.
Une assertion de texte source ou de HTML rendu côté serveur ne prouve pas un clic,
une collision, une animation ou une fidélité artistique.

Pour les chantiers Homeworld/chasse, consulter également les protocoles existants :
[v111-homeworld-proof-protocol.md](v111-homeworld-proof-protocol.md),
[hunt-mechanics-v112.md](hunt-mechanics-v112.md) et
[production-evidence-v108.md](production-evidence-v108.md).
La validité d'une preuve reste liée à son code et à ses ressources ; ne pas réécrire
une attestation historique pour lui attribuer un résultat nouveau.

**Changement documentaire seulement :** contrôler les liens, chemins, scripts cités,
cohérence du manifeste et conservation des consignes précédentes. Aucun nouveau test
de gameplay ni build complet n'est nécessaire pour cette seule intégration documentaire.

## Exemple de résultat attendu pour une prochaine tâche

« Corriger le placement des bancs et l'accès à un atelier » :

1. Relever les objets concernés et leurs enveloppes d'usage.
2. Consulter `level-design`, puis les modules de placement et de navigation existants.
3. Définir les accès attendus, modifier la composition et vérifier les trajets concernés.
4. Parcourir l'approche, l'interaction et le départ dans la scène ; inspecter l'échelle
   et les recouvrements.
5. Mettre à jour le suivi avec les preuves produites et les éventuels points encore ouverts.

Pour les planètes, appliquer la même démarche à une graine et des paramètres donnés.
Pour les PNJ, l'appliquer à un rôle, une référence, ses variantes et leur rendu effectif.

## Provenance et maintenance

Les guides source sont publiés sous [Apache-2.0](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/19d93f97c9c1ea0f8b306e77aa81e0d3e352d3e9/LICENSE), avec un
[NOTICE](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/19d93f97c9c1ea0f8b306e77aa81e0d3e352d3e9/NOTICE). Cette intégration conserve des liens vers un commit
immuable et écrit des consignes propres au jeu ; elle ne copie aucun dossier de skill.

Mettre à jour la sélection lorsqu'un besoin concret le justifie et relire les changements
du dépôt source. En cas de copie ultérieure, conserver la licence et le NOTICE applicables,
les ressources nécessaires et la provenance de la version. Les guides complètent
l'inspection du code, les références visuelles et les tests propres au projet.

[router]: https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/19d93f97c9c1ea0f8b306e77aa81e0d3e352d3e9/router/SKILL.md
[custom-engines]: https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/19d93f97c9c1ea0f8b306e77aa81e0d3e352d3e9/router/references/custom-engines.md
[assets]: https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/19d93f97c9c1ea0f8b306e77aa81e0d3e352d3e9/skills/disciplines/create-game-assets/SKILL.md
[levels]: https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/19d93f97c9c1ea0f8b306e77aa81e0d3e352d3e9/skills/disciplines/level-design/SKILL.md
[procgen]: https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/19d93f97c9c1ea0f8b306e77aa81e0d3e352d3e9/skills/disciplines/procedural-gen/SKILL.md
[ai]: https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/19d93f97c9c1ea0f8b306e77aa81e0d3e352d3e9/skills/disciplines/game-ai/SKILL.md
[advanced-ai]: https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/19d93f97c9c1ea0f8b306e77aa81e0d3e352d3e9/skills/disciplines/ai-behavior-trees-utility-ai/SKILL.md
[saves]: https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/19d93f97c9c1ea0f8b306e77aa81e0d3e352d3e9/skills/disciplines/save-systems/SKILL.md
[feel]: https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/19d93f97c9c1ea0f8b306e77aa81e0d3e352d3e9/skills/disciplines/game-feel/SKILL.md
[performance]: https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/19d93f97c9c1ea0f8b306e77aa81e0d3e352d3e9/skills/disciplines/performance-optimization/SKILL.md
