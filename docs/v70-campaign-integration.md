# Temple des Trois Ombres — Acte I : L’Ouverture

Chapitre original du clan du jeu, après la cohorte V68 et Les Seuils du Premier Sang V69. Il ne reproduit pas une pyramide d’AVP à l’identique. Il ne prétend pas terminer le rite Blooded.

## Sources et portée

Sources locales lues comme messages structurés : `work/v36/new-world-specs/youth-thread-page-1.json`, tour 9, et `work/v36/progression-art-specs/progression-thread.json`, tour 0. La conversation prévoit une triade, des outils physiques temporaires, des salles à configurations changeantes, des sorties de service, la distinction humains/xénomorphes, puis des chasses individuelles, une reine et une purge finie avant Blooding. Ce premier acte livre les neuf salles hautes/intermédiaires suivantes, réellement séparées par des portes : Marches des Trois, Vestibule des Serments, Tribune des Signes, Arsenal des Épreuves, Belvédère Fracturé, Puits des Contrepoids, Camp des Intrus, Nef des Anneaux, Vanne de Quarantaine. Saar et Vek sont les camarades déjà établis, sans remplacement arbitraire par la distribution proposée dans l’ancienne conversation.

Les configurations I Ouverture, II Reconnexion et III Isolement local désignent ce lot jouable. Elles ne valent pas réalisation des profondeurs Descente/Confinement de la conversation. Les six salles profondes, reine, œufs, purge et chasses qualifiantes de chaque camarade restent non réalisées. Aucun Blooded, plasma, vaisseau personnel ou kill global n’est accordé. Un véritable drone à cinq points de vie est combattu dans la vanne locale, avec télégraphe, charge, retrait vulnérable, lame physique et zone acide. Les preuves antérieures et le rang Young Blood sont conservés.

## Contrat d’intégration

- Modèle : `createSoloV70State`, `normalizeSoloV70State`, `stepSoloV70`, `soloV70Receipts`, `soloV70NeedsImmediateCheckpoint`, `soloV70Objective`; types `SoloV70State`, `SoloV70Receipt`.
- Campagne : `normalizeSoloV70Campaign`, `soloV70MatchesSave`, `canStartSoloV70`, `startSoloV70Campaign`, `withSoloV70Checkpoint`, `withSoloV70Progress`, `soloV70NeedsScene`; type `SoloV70Campaign`.
- Composant : `FirstHuntSoloV70`, props `checkpoint`, `bindings`, `externallyPaused?`, `reducedMotion?`, `persistenceError?: string | null`, `soundEnabled?`, `masterVolume?`, `effectsVolume?`, `onCheckpoint(state): boolean`, `onProgress(receipts,state): Promise<boolean>`, `onExit(): void | Promise<void>`, `onReturnToCity(): Promise<boolean>`, `onOpenSettings?()`.
- Helper réel : `tests/helpers/solo-v70-played-route.mjs`, exports `thresholdsTemple`, `templeEnvironment`, `templeInput`, `playTemple`, `templeCampaignRoute`, `stamp`. Le chapitre courant n’injecte aucune position, phase, compteur ou reçu : tout passe par commandes, collision, portes et combat.

Le parent intègre le champ `soloV70` et la migration globale V11, la navigation, les slots et l’écriture possédée. Toutes les anciennes conditions de chapitre restent nécessaires. Un chapitre V70 actif ne coexiste pas avec région, passage ou réserve actifs. Le retour à la cité exige le chapitre complété et une confirmation durable. Un V70 complété peut accompagner un trajet ultérieur, sans l’écraser.

## Persistance et contrôles

Quinze reçus strictement ordonnés, source `solo.temple-opening.v70`. Entrées/sorties de salle, lecture d’un signe, signal des plaques, lancement du contrepoids, ouverture de vanne, coups effectivement portés et vitalité perdue sont checkpointés immédiatement avant toute nouvelle frame. Les déplacements ordinaires gardent la cadence 120 ticks. Une écriture refusée bloque commandes et horloges, conserve le même argument pour réessai et ne simule pas la frame suivante. Les contrôles doivent être relâchés après reprise. Les versions futures, visites déconnectées, transitions sans porte, preuves hors endpoint, recul des reçus, téléportation de compagnons ou soin hors retry réel sont refusés. Une défaite garde les preuves déjà obtenues ; Interaction après au moins 90 ticks reprend la chambre et incrémente les tentatives.

Clavier configurable, tactile avec vrais événements de pointeur et manette standard utilisent le contrôleur existant. Pause, réglages, onglet caché, images absentes et confirmation en attente figent les compagnons, lift, fenêtres temporelles, acide et adversaire. L’audio réemploie `GameAudio` : jump/slash/hit/scan/ui/enemyAlert/defeat. Aucun effet n’est mis en file pendant pause ; objectif/victoire uniquement après reçu confirmé. Les trois réglages de volume sont raccordables au parent ; le contexte est libéré au démontage.

## Rendu honnête

Six modules OpenAI natifs originaux du clan, fournis et inspectés par le parent : `public/game/homeworld/v70/temple-modules.png`, via `templeModularArtV70.ts`. Arches/piliers monumentaux composent les façades et plans de fond ; portes, console et contrepoids suivent les coordinates du modèle. Les marches du bitmap distant ne prétendent pas être un collider : les vraies terrasses possèdent leurs surfaces et côtés minces mesurés dans le modèle, avec passage sous les galeries lors du retour de service.

Héros/camarades utilisent les atlases jeunesse natifs dans les deux directions, pas un personnage CSS. Drone : bitmap six poses existant `game/sprites/v7/enemies/flora-other/xeno-drone-sheet.png`, inspecté, sans miroir artificiel ni annonce d’une nouvelle animation bitmap. Garde humain : bitmap statique existant `game/sprites/v4/rifle-soldier.png`, protection des survivants et trêve, aucun humain assimilé à une cible du rite. Sols et panoramas existants sont réemployés et assombris dans les intérieurs ; les nouveaux modules architecturaux établissent l’identité du temple. Contacts alpha des sprites et ombres utilisent `getSpriteContact`.

## Vérifications

`tests/first-hunt-solo-v70.test.mjs` : chemin complet, portes réversibles et galeries réelles, reprise toutes les 83 frames, pause/assets/onglet, combat réellement perdu et retry, état falsifié.

`tests/campaign-solo-v70.test.mjs` : prérequis, conflit de trajets, conservation du rang et anciens champs, reçus exacts/idempotence, faux endpoints/téléportations, cadence 120 ticks avec refus sur six frontières physiques distinctes.

`tests/solo-save-v70.test.mjs` (parent) : parseur réel à chaque étape, quota/drop/retry des quinze reçus, readback incertain et ownership remplacé, slots manuels, migration 10→11.

`tests/temple-static-guard-v70.test.mjs` : le vrai renderer `drawImage` et les pixels PNG natifs vérifient le support des bottes au sol. Le garde a 237 lignes transparentes sous son pied ; son pivot alpha est 1299 dans la source 1024×1536. Sa hauteur peinte vaut 103,54 unités, contre 112 pour le jeune et 102 pour ses camarades. Le bitmap n'est pas retouché et le lit reste à côté, séparé du pied.

Au gel runtime : ces 15 tests passent, TSC et ESLint passent. Le parcours modèle de référence compte 7047 ticks (~117 secondes de simulation idéale sans pause), 19046 unités parcourues, 16 passages de portes et cinq coups de combat. Cela ne mesure pas une durée de jeu d’un joueur. La recette `scripts/verify-solo-v70.mjs` est préparée pour serveur de production, fixture initiale après V69 seulement ; une preuve navigateur et une publication sont des vérifications distinctes, non déclarées avant exécution.
