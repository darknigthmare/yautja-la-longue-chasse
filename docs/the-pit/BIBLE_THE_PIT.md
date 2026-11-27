# THE PIT — Bible de combat et de production

**Révision documentaire : 27 novembre 2026.**

The PIT est le jeu de combat latéral de **Yautja : La Longue Chasse**. Il réunit des duels, des parcours de combat, des reconstitutions narratives et le chasseur personnel du joueur. Son identité repose sur la lecture des gestes, l’équipement propre à chaque incarnation et la culture de chasse. Les créations du projet et les rencontres hypothétiques restent identifiées comme telles.

Cette bible rattache le **guide général et ses deux extensions** au code existant. Les trois textes sont importés intégralement dans [les sources communes](combat-guide/README.md), soit 68 rubriques. La [matrice de traçabilité](TRACEABILITE_GUIDES_20261127.md) décrit pour chacune son application, son point d’entrée et le travail restant. Une rubrique documentée ne devient pas automatiquement jouable.

## 1. Périmètre, sources et statuts

### Base vérifiée

L’[inventaire du code](INVENTAIRE_CODE_20261127.json) provient des exports réellement évalués sur la base `2769b094862aea97f10fc0e5c4f1154489a8a8bc`. Il conserve les identifiants exacts, les noms, les modes compatibles, les 18 distinctions et les empreintes des modules inspectés. Il constitue un inventaire de déclarations et de règles, pas une nouvelle revue visuelle de tous les PNG ni une partie complète de tous les parcours.

Le [point de reprise du lot](CONTINUATION_20261127.md) distingue ce qui existait, les ajouts de cette branche et les validations obtenues. Les rapports V80, V93, V108 ou V112 restent des preuves historiques attachées à leurs propres révisions ; ils ne sont pas réécrits comme preuves du présent lot.

### Signification des statuts

| Statut | Sens dans cette bible |
| --- | --- |
| Présent dans le code | Module ou donnée réellement retrouvé et contrat inspecté. Une limite de portée peut subsister. |
| Partiel | Une partie du besoin existe ; les éléments restants sont nommés. |
| Conçu | Décision ou fiche exploitable, sans réalisation runtime annoncée. |
| Différé | Fonction retenue dans le périmètre, dépendance ou ordre de production précisé. |
| À confirmer | Source, identité, règle ou compatibilité insuffisamment établie. |
| Testé | Contrôle exécuté sur une révision et un périmètre identifiés ; le reçu doit être cité. |
| Validé visuellement | Revue artistique explicite de la bonne ressource, variante et orientation ; jamais déduite d’un build. |

Le champ historique `validated` des atlas ne constitue pas une certification cinématographique générale. Le [guide de développement](../GAMEDEV_AGENT_GUIDE.md) réserve la validation artistique à la revue prévue par le projet. Un candidat généré reste candidat jusqu’à son admission explicite.

### Mesures et unités

| Catalogue inspecté | Quantité | Interprétation exacte |
| --- | ---: | --- |
| Identités runtime et versus | 201 | IDs distincts enregistrés ; humains, originaux et invité compris. |
| Première édition avec progression historique | 12 | Arcade, Circuit et Descente, en plus du duel. |
| Extensions historiques | 4 | Tracker, Greyback, Theta, Machiko Noguchi. |
| Boss du registre | 2 | `kok-warlord`, `stone-heart`. |
| Originaux et invité V56 | 3 | Identités distinctes, statut propre conservé. |
| Identités fournies | 180 | Profils de duel partagés ; ce ne sont pas 180 movesets individualisés. |
| Adaptations de combat individuelles | 21 | Différentes du profil commun, sans certification 1:1. |
| Variantes explicites | 416 | Apparences enregistrées, avec leurs dépendances. |
| Arènes runtime enregistrées | 187 | Déclarations utilisables par le moteur ; chargement et qualité artistique restent à vérifier par lot. |
| Catalogue historique d’arènes | 100 | Fiches qui recoupent le runtime ; ne pas additionner aux 187 arènes. |
| Chroniques V80 | 201 | Huit rencontres par identité, soit 1 608 rencontres déclarées ; reconstitutions originales. |
| Registre d’animation | 97 atlas, 478 clips, 177 chemins PNG uniques | Quantités de registre, sans déduction de fluidité ni de présence des pixels à partir de ce seul comptage. |
| Distinctions persistantes | 18 | Douze Arcade, cinq Circuit, une Descente. |
| Identités certifiées 1:1 par l’audit | 0 | L’objectif de fidélité reste à vérifier contre les sources. |

La file de présentation V93 courante contient **5 244 unités** « apparence × famille × orientation » : 5 141 manquantes, 78 partiellement dessinées, quatre poses tenues et 21 nécessitant une revue de pixels. Elle ne déclare aucune animation détaillée complète. Ce périmètre couvre ses six familles historiques, pas tous les nouveaux états de sélection de l’extension 01.

## 2. Architecture et contrats à préserver

Le jeu reste un moteur TypeScript personnalisé dans React/Next, avec rendu Canvas 2D et interface DOM/CSS. Les guides externes ne demandent aucun changement de moteur ou de dépendance.

| Responsabilité | Modules de référence | Contrat |
| --- | --- | --- |
| Duel et simulation | [`pitCombat.ts`](../../app/game/systems/pitCombat.ts), [`PitCanvas.tsx`](../../app/game/PitCanvas.tsx) | État, contacts, ressources et événements appartiennent au moteur. |
| Identité et roster | [`pitFirstEdition.ts`](../../app/game/systems/pitFirstEdition.ts), [`pitRosterExpansion.ts`](../../app/game/systems/pitRosterExpansion.ts), [`pitUserRoster.ts`](../../app/game/systems/pitUserRoster.ts) | Garder les IDs et la distinction entre progression historique et duel élargi. |
| Sélection | [`PitSelectionFlow.tsx`](../../app/game/PitSelectionFlow.tsx), [`pitSelectionFlow.ts`](../../app/game/systems/pitSelectionFlow.ts), [`pitSelectionPresentationV1.ts`](../../app/game/systems/pitSelectionPresentationV1.ts) | La présentation du choix ne modifie pas les sauvegardes, les recettes de combat ou les replays. |
| Présentation corporelle | [`pitFighterPresentation.ts`](../../app/game/pitFighterPresentation.ts), [`pitRoundPresentation.ts`](../../app/game/systems/pitRoundPresentation.ts), [`pitPresentationPlansV93.ts`](../../app/game/systems/pitPresentationPlansV93.ts) | Horloges et poses de présentation restent séparées des dégâts et résultats. |
| Art et animations | [`pitSpriteSheetRegistry.ts`](../../app/game/pitSpriteSheetRegistry.ts), [`pitFighterAnimation.ts`](../../app/game/pitFighterAnimation.ts) | Propriétaire, variante, orientation, pivots et preuves d’admission exacts. |
| Arènes | [`pitArenaProduction.ts`](../../app/game/pitArenaProduction.ts), [`pitArenaExtensions.ts`](../../app/game/systems/pitArenaExtensions.ts), [`pitStageJourney.ts`](../../app/game/systems/pitStageJourney.ts) | Une fiche d’arène, un kit chargé et une transition jouable sont des objets distincts. |
| Progression | [`pitSave.ts`](../../app/game/systems/pitSave.ts), [`pitHonors.ts`](../../app/game/systems/pitHonors.ts) | Sidecar V5 lié au propriétaire exact ; résultats uniques et erreurs de stockage conservés. |
| États d’accès | [`pitContentAccessV1.ts`](../../app/game/systems/pitContentAccessV1.ts) | Projection des 18 distinctions ; quatre axes, conditions ET/OU et aucune attribution externe commerciale. |
| Parcours narratifs | [`pitCharacterChroniclesV79.ts`](../../app/game/systems/pitCharacterChroniclesV79.ts), [`pitWorkbookCampaignV108.ts`](../../app/game/systems/pitWorkbookCampaignV108.ts) | Chroniques, exercices source et campagne principale ont des portées séparées. |
| Replays | [`pitReplay.ts`](../../app/game/systems/pitReplay.ts) | Recettes historiques versionnées ; pas de nouvelle mécanique injectée dans un ancien replay. |
| Yautja personnel | [`pitPersonalFighterV147.ts`](../../app/game/systems/pitPersonalFighterV147.ts) | Apparence du joueur en J1 dans CPU/local/entraînement, base de duel Jungle Hunter ; aucune nouvelle identité mécanique. |

Les règles générales courantes utilisent **60 ticks/s**, **99 secondes par manche**, une limite de **six impacts de combo**, une remise à zéro de combo après **45 ticks** et une Traque plafonnée à **1 000**. Ce sont des paramètres de jeu, pas des propriétés du lore. Les recettes Workbook V104–V112 peuvent ajouter leurs actions explicites ; leur activation ne remplace pas silencieusement les recettes historiques.

## 3. Fidélité, continuités et références

Chaque fiche conserve œuvre, version, période, apparence, équipement, source et portée de la preuve. Le [référentiel de fidélité](../../app/game/systems/pitFidelityV91.ts) distingue déjà ce qu’une source établit et ce qu’elle n’établit pas. Une figurine sous licence peut documenter un casque ou une arme ; elle ne prouve pas à elle seule une trajectoire, un combo, un événement narratif ou le fonctionnement de tous les costumes.

Les cinq statuts des guides sont obligatoires : **canon attesté**, **adaptation jouable**, **original compatible**, **alternatif/crossover**, **à confirmer**. Un champ historique `continuity: canon` identifie une incarnation ; il ne certifie pas les timings, dessins ou scènes inventés pour le duel.

### Contraintes déjà documentées dans The PIT

- **Jungle Hunter, duel final 1987** : canon et harnais retirés, tir de plasma indisponible pour cette variante explicite. Un visage démasqué seul ne déclenche pas ce changement d’équipement. Référence : [`pitEquipmentV57.ts`](../../app/game/systems/pitEquipmentV57.ts).
- **Feral** : bouclier, lanceur et carreaux restent rattachés à sa propre version. Les règles du masque et les recettes de tir viennent de [`pitFeralBoltsV58.ts`](../../app/game/systems/pitFeralBoltsV58.ts) et [`pitFeralMuzzleV59.ts`](../../app/game/systems/pitFeralMuzzleV59.ts), pas d’un canon générique ajouté à son épaule.
- **Falconer** : le drone de reconnaissance ne devient pas une arme offensive par commodité. **Tracker** conserve son chien de chasse comme entité native du kit, sans le transformer en partenaire de tag.
- **Greyback** : l’ancien de *Predator 2* reste distinct de Golden Angel jeune et de l’Elder d’*AVP*. Le silex de trophée ne devient pas automatiquement un tir actif.
- **Valkyrie, Witch, Shaman et Enforcer** : leurs noms n’accordent aucun pouvoir magique. Toute mécanique non attestée reste une adaptation explicitement nommée.
- **Theta et Machiko** restent humaines. Les réserves de l’audit sur leur équipement et le camouflage historique ne sont pas effacées par la présence d’un portrait.
- **Big Red, Viper, créations personnelles et invités** conservent leur provenance propre ; une source de figurine, un fan film et un long métrage ne deviennent pas la même continuité.

Les dialogues emploient l’intention et les connaissances de l’incarnation choisie : défi, patience, respect, hostilité, récupération de preuve ou reconnaissance. Une rencontre versus peut être hypothétique. Une campagne doit expliquer pourquoi les protagonistes sont présents et vivants au moment retenu. Une chorégraphie inventée n’est jamais présentée comme une scène manquante d’un film.

### Fiche minimale d’un combattant

Conserver l’ID, l’œuvre/version, les sources visuelles, les asymétries, le statut de fidélité, le rôle de combat, les ressources, les actions réellement actives, les variantes, les restrictions par mode, la route narrative, les assets attendus et les preuves. Les 180 profils fournis doivent être individualisés par lots cohérents ; leur présence dans la sélection ne ferme pas cette tâche.

## 4. Modes, narration, stages et boss

### Modes actuellement distingués

| Parcours | Portée inspectée | Travail à maintenir visible |
| --- | --- | --- |
| CPU, versus local, entraînement | Roster étendu ; choix et restrictions du code courant. | Pas de qualification artistique globale du roster. |
| Arcade | Douze combattants historiques, huit rencontres par parcours. | Décliner les histoires individuelles sans annoncer le même parcours pour tous les nouveaux IDs. |
| Circuit | Cinq chapitres, douze duels par parcours historique. | Garder le même chasseur pour les conditions de chapitre ; aucune somme de fragments provenant de plusieurs chasseurs. |
| Descente | Huit étages et une distinction finale. | Les reliques de run restent temporaires ; elles ne sont pas des distinctions permanentes supplémentaires. |
| Chroniques V80 | 201 dossiers avec huit rencontres, trois pages d’introduction et trois de conclusion. | Compositions utilisant décors/portraits existants ; elles ne constituent pas des cinématiques natives 1:1. |
| Exercices Workbook V108 | Feral et Scar, continuité de santé, Traque et dispositif entre rencontres. | PNJ source, BODY narratifs et autres écarts du [bilan V108](../pit-campaign-continuity-v108.md) restent ouverts. |
| Chasseur personnel | Apparence J1 en CPU, local, entraînement, avec recette de base déclarée. | L’équipement affiché n’accorde pas encore un moveset complet correspondant à chaque arme de campagne. |

La campagne globale distincte reste celle décrite dans la [bible de campagne](../campagne/BIBLE_DE_CAMPAGNE.md). Les duels sanctionnés, accès de rang et tournois en ligne qu’elle propose sont des objectifs de raccordement ; ce document ne les transforme pas en services disponibles. Une victoire de chronique ne tue pas automatiquement un PNJ de campagne, ne change pas le rang et ne livre pas un trophée anatomique.

Les boss Warlord et Stone Heart présents dans le registre ne prouvent pas l’existence d’un Boss Rush complet ni de toutes les rencontres avec véhicules ou géants. Ces rencontres demandent phases, télégraphes, contre-jeu, morphologies compatibles et leur propre admission.

### Arènes et liaisons

Les 187 IDs runtime sont listés dans l’inventaire, sans mélange avec les 100 concepts historiques. Un kit de plans doit préciser sol, limites, échelle, plans de parallaxe et sources. Les options **vivant / réduit / statique** relèvent de la présentation ; danger, interaction et transition relèvent des règles du match.

Le catalogue historique indique explicitement `interactivePropsImplemented: false` et `transitionsImplemented: false` pour ses fiches. Les [parcours de stage](../../app/game/systems/pitStageJourney.ts) possèdent leur propre contrat : leur présence ne valide pas des transitions à chaque entrée du catalogue. Une liaison future doit donner une origine physique, une destination chargée, des positions d’arrivée, une règle de retour et le traitement de KO, combo, caméra et objets persistants.

Les portes, plateformes et passages doivent correspondre aux espaces visibles. Un stage spécial ne peut pas renvoyer vers une destination absente sous prétexte que le joueur ne l’a pas débloquée. Le terrain nécessaire est préparé avant le duel, ou une configuration compatible est proposée.

## 5. Extension 01 — personnalité et sélection

### Taunts

**Présent partiellement.** Les taunts volontaires existent dans la présentation de combat V93. La simulation ne s’arrête pas, une action ou un changement réel interrompt la provocation et les clips manquants restent signalés. Les six familles historiques sont garde, introduction, victoire de manche, défaite de manche, attente de conclusion et taunt.

Pour chaque nouvelle provocation : intention, version, commande, entrée/pose/sortie, vulnérabilité, interruption, reprise du contrôle, voix/VFX et répétition. Le geste de défi ne crée aucun gain de Traque sauf décision explicite de kit, avec un coût et un risque testables. Les gestes de respect non létaux et les réactions à un rival sont priorisés sur une collection de phrases interchangeables.

### Sélection et désélection

**Cycle d’interface ajouté ; animations natives de sélection/désélection absentes.** Le choix de personnage possède une machine de sélection distincte du duel. [`pitSelectionPresentationV1.ts`](../../app/game/systems/pitSelectionPresentationV1.ts) ajoute huit phases : survol, aperçu, confirmation, attente, changement de costume, désélection, validation de la rencontre et départ vers le combat. Le raccordement actuel fait évoluer les états, libellés et cadres de l’interface ; les portraits restent les images existantes.

Les temporisations de présentation sont indépendantes de la simulation. Leurs générations empêchent une ancienne fin de phase de modifier une sélection plus récente ; les changements d’identité, de variante et de personnage personnel sont pris en compte. Les temporisations sont nettoyées et les effets de cadre respectent le mouvement réduit. Le réducteur de sélection conserve l’autorité sur le choix et le lancement. La vérification navigateur de ces raccordements est séparée des tests de logique et figure au [point de reprise](CONTINUATION_20261127.md).

**Exigences artistiques encore ouvertes :** produire entrées, attente et désélections distinctes, puis raccorder le transport du personnage, ses voix, particules, compagnons et éclairages avec nettoyage et sortie abrégée. Ces éléments ne sont pas fournis par le cycle de cadre actuel. Une désélection complète doit rester observable sans obliger la navigation rapide à attendre une scène.

La tentative de production vise **quatre PNG de Jungle Hunter masqué, orientation droite**, deux poses de sélection et deux de désélection. La première sortie a été refusée par le générateur, HTTP 400 `moderation_blocked` ; les trois autres n’ont pas été tentées. Le [manifeste artistique](../../art-source/the-pit/selection-20261127/jungle-hunter/manifest.json) constate **zéro PNG reçu, zéro admis et zéro intégré**. Aucun nouveau clip ni statut 1:1 n’en découle. Même si deux poses étaient reçues ultérieurement, elles ne suffiraient pas à certifier une animation détaillée fluide ou les deux orientations ; aucun miroir automatique ne doit changer le côté de l’équipement.

Le lot distinct **Greyback / Elder sans casque** a ensuite produit **cinq PNG individuels** : quatre poses orientées à droite et une correction d’équipement de la première pose. Les [sources, prompts et mesures](../../art-source/the-pit/continuation-20261127/greyback-unmasked/manifest.json) sont conservés, ainsi que la [revue des écarts](../../art-source/the-pit/continuation-20261127/greyback-unmasked/REVIEW.md). La correction suivante a été refusée ; les deux autres n’ont pas été tentées. La page `/pit-lab/selection` compare la référence, les quatre poses et la révision reçue, avec fond clair et superposition manuelle. **Cinq sorties réelles, zéro clip admis, aucune certification 1:1** : les lames de poignet des trois poses non corrigées, l’empattement et les petits détails restent notamment ouverts. Les copies publiques servent uniquement à cette revue et ne remplacent aucun sprite du combat.

Les futurs groupes affichent actif, réserve et soutien, leur disponibilité et les raisons d’incompatibilité. La présentation d’un groupe n’active pas le tag dans le moteur.

## 6. Extension 01 — équipes, conclusions et clashes

### Profils retenus pour la conception

**Le duel courant reste à deux combattants.** Les profils suivants sont documentés et à implémenter dans un mode explicite, avec une recette versionnée indépendante des replays historiques :

| Profil | Règle retenue | Dépendance avant activation |
| --- | --- | --- |
| Assistance | Un actif ; une intervention de partenaire à la fois par équipe. L’aide repart après son action. | État du soutien, arrivée/action/sortie, vulnérabilité et HUD. |
| Tag à deux | Un actif et une réserve, deux vies propres ; élimination de l’équipe après les deux KO. | Transfert réel des commandes, sauvegarde du kit de chaque membre, caméra et condition de victoire. |
| Hybride à deux | La réserve peut intervenir ou remplacer l’actif, mais jamais faire les deux simultanément. | Réservation exclusive du partenaire et dépenses atomiques. |

Le relais après KO est gratuit pour qu’un survivant entre toujours. Le relais volontaire, le relais de combo et le secours défensif sont des commandes et règles distinctes. Un changement d’actif conserve l’historique des dégâts réduits, captures et rebonds du combo.

Les commandes logiques sont `TAUNT`, `ASSISTANCE`, `RELAIS`, `SUPER_DUO`, `FINISHER_EQUIPE` et `ORDRE_ENTITE`. Leur remappage précède le choix d’une touche physique. L’emploi d’un bouton commun appui court/maintien reste différé tant que la priorité et le seuil n’ont pas passé les essais d’ambiguïté.

Une **jauge d’équipe distincte de la Traque personnelle** est retenue en conception. Sa capacité, ses gains, les coûts et récupérations doivent être fixés dans la recette du prototype, puis mesurés ; aucun nombre non testé n’est activé par cette bible. Un refus avant engagement ne dépense rien. Le partenaire en sortie, touché ou KO reste indisponible même avec une barre pleine. Pause, hitstop et cinématique doivent suivre la même horloge de simulation déclarée.

### Paires prioritaires et narration

Les premières paires à étudier sont **Tracker/Falconer** et **Scar/Celtic**, dans des reconstitutions compatibles avec leur époque et leur présence. Les chorégraphies seront des créations de jeu ; leur appartenance au même contexte ne prouve pas une attaque combinée filmée. Un parcours Scar/Celtic doit se situer avant l’événement qui rendrait Celtic indisponible ou annoncer sa branche alternative.

Chaque fiche de duo nomme meneur, versions, relation, lieu, capacités propres, cible compatible et état de sortie. Le chien de Tracker et le drone de Falconer restent leurs entités natives ; ils ne remplissent pas un troisième slot. Aucune scène exclusive pour les 20 100 paires non ordonnées du roster de 201 identités n’est promise.

### Supers, finishers et fins dramatiques

Le super d’équipe appartient au combat : ouverture, coût, garde, échec, confirmation, dégâts et reprise du contrôle. Une longue chorégraphie ne démarre qu’après confirmation valide ; sinon, une résolution courte laisse ses conséquences normales.

Le finisher d’équipe intervient après sa condition de conclusion. La fin dramatique dépend en plus des versions, de la relation, du lieu et des événements concernés. Priorité retenue : fin dramatique spécifique compatible, finisher d’équipe compatible, finisher individuel, victoire normale. Le résultat acquis n’est pas modifié par la présentation.

Les [conclusions V80](../pit-finishers-v80.md) fournissent déjà quatre variantes de présentation par identité, soit 804 combinaisons. Elles utilisent les ressources existantes et ne sont pas 804 clips natifs dessinés. Leur horloge indépendante ne modifie ni PV, ni résultat, ni récompense. Les chroniques et le mode gore réduit imposent leur conclusion non létale. Les nouvelles scènes collectives restent à produire et à brancher ; aucun partenaire KO n’est ressuscité pour une pose.

### Clashes et QTE

**Conçus, non activés par cette livraison.** Trois résolutions sont séparées : échange normal, clash mécanique et clash cinématique. Le premier prototype doit prendre une paire de techniques aux contacts définis, par exemple des lames compatibles, sans ajouter une collision de rayons à une arme qui ne produit pas de rayon continu.

L’éligibilité relève des ticks et hitboxes réels : même fenêtre active autorisée, contact, orientation, distance, ressources et absence de cooldown. Un engagement ne produit qu’un clash. Les arrivées simultanées d’un projectile, d’un piège ou d’un soutien suivent une priorité reproductible.

Histoire et versus spectacle peuvent proposer un QTE court avec remappage et aide déclarée. Le profil compétition reçoit une résolution commune sans QTE dans la première conception. Il faut fixer réussite, échec, égalité, absence d’entrée, double réussite, durée maximale, déconnexion et état final. Le chrono et les tiers ne continuent pas selon un hasard de rendu. Les options locales de confort n’accordent aucun avantage caché.

## 7. Extension 01 — entités, bonus et exploration

### Entités existantes et règles communes

**Présent partiellement.** The PIT dispose déjà du [chien de Tracker](../../app/game/systems/pitCompanion.ts), du [drone Falconer](../../app/game/systems/pitFalconerDrone.ts), des carreaux Feral et de dispositifs Workbook, dont la mine de Feral et l’étoile de Scar. Le module courant connaît leur propriétaire, leur position, leur phase et leur fin de vie. Ces systèmes ne prouvent pas l’existence d’un moteur générique de marionnette ni de compagnons pour tout le roster.

Pour chaque entité retenue, la fiche étend le contrat avec : apparition, placement, armement, actions simultanées du maître, limite, activation, rappel, destruction, interruption et contre-jeu. La propriété ne change pas lors d’un tag. Les cas maître touché/projeté/en réserve/KO, changement de stage, manche, super et replay sont écrits avant l’activation du profil équipe.

La réflexion d’un projectile doit réattribuer correctement dégâts, ressource et condition de conclusion. Actif, soutien, piège et entité partagent l’historique du combo. Les limites d’effets graphiques peuvent réduire des particules, jamais supprimer une menace réelle selon la machine du joueur.

### Bonus à produire par lots

**Premier bonus de riposte ajouté et joué dans le moteur.** [L’épreuve V1](BONUS_RIPOSTE_V1.md) se lance depuis Entraînement : quatre gardes basses reconnues, chacune suivie d’une frappe normale en contact. Elle possède préparation, chrono de simulation, deux niveaux d’aide, score/rang, réussite/échec, pause, abandon, reprise et conservation volontaire d’un meilleur record local. Ce record est séparé des résultats de duel et de la progression, et n’est pas inclus dans les exports de campagne. L’épreuve est une création de jeu ; elle ne remplace pas les familles de précision ou destruction ci-dessous.

Les exercices narratifs existants sont des bases utiles ; ils ne sont pas renommés en dix familles de bonus terminées. Les premiers ajouts proposés sont :

| Bonus | Rôle et adaptation au lore | Résultat et dépendances |
| --- | --- | --- |
| Épreuve de lame | Détruire des cibles d’entraînement ou une épave désarmée ; création compatible, sans faux événement de film. | Parties destructibles, chrono, score, reprise et états visuels. |
| Épreuve de précision Feral | Toucher des cibles compatibles avec la version de son lanceur et les règles du masque. | Ressource bornée, conditions de visée explicites et solution pour variante incompatible. |
| Tenir le passage | Repousser des cibles fragiles dont le contexte justifie la faible résistance. | Limite d’acteurs, apparitions annoncées, performance et issue accessible ; aucun xénomorphe prestigieux banalisé sans adaptation déclarée. |
| Retour de la balise | Épreuve de mobilité et remise d’objet fondée sur les parcours Workbook. | Conserver le checkpoint et l’identité de l’objet ; ne pas compter les PNJ source absents comme produits. |
| Chasse coordonnée | Couverture et relais pour une paire réellement disponible. | Différé jusqu’au tag/assistance ; ne pas simuler la coopération par une cinématique seule. |

Chaque bonus précise caractère facultatif ou obligatoire, héros, version, lieu, justification, état d’entrée, objectif mesurable, échec, score, récompense et état transmis au récit. Une épreuve facultative ratée peut laisser continuer ; une mission indispensable possède sa reprise. Les cadeaux et records utilisent un identifiant de résultat unique.

### Galerie des distinctions

**Galerie de menu consultable ajoutée ; pièce exploratoire encore conçue.** Le [registre détaillé des distinctions V1](GALERIE_DISTINCTIONS_V1.md) prolonge le panneau existant : 18 fiches acquises ou verrouillées, filtres Arcade/Circuit/Descente, conditions par chasseur, préparation du parcours et retour du focus, sans écriture. La galerie physique reste un concept original compatible. Ses futures vitrines ou consoles consulteront le même catalogue ; elles ne dupliqueront pas les récompenses.

La progression ne dépend pas d’une clé enfermée derrière sa propre récompense. Les accès permanents, conditions et ouvertures sont sauvegardés. L’intégration physique éventuelle au mausolée utilisera la topologie et les règles de [`mausoleum.ts`](../../app/game/systems/mausoleum.ts) ; aucun passage n’est ajouté au monde par cette fiche documentaire.

Les marques gravées, masques et terminaux sont des propositions de présentation. Le sceau d’interface indique un état lisible ; il ne crée pas une magie canonique. La géométrie, les objets d’usage et le parcours aller/retour devront être testés si la galerie devient exploratoire.

## 8. Extension 02 — catalogue et déblocages

### Périmètre effectif initial

Le raccordement initial concerne les **18 distinctions déjà prévues par `pitSave` et `pitHonors`**. Il ne verrouille aucun des 201 combattants, des 187 arènes ou des modes qui étaient disponibles. Les nouveaux états décrivent les acquisitions et leurs dépendances ; un asset absent reçoit « installation nécessaire » ou « indisponible », pas une fausse condition de progression.

| Origine | Contenu | Condition canonique du jeu |
| --- | --- | --- |
| Arcade | 12 palettes « Armure du Jugement » | Terminer les huit rencontres avec le combattant correspondant. |
| Circuit | `pit-emblem-circle-call` | Terminer « L’Appel du cercle » avec un même chasseur. |
| Circuit | `pit-banner-three-paths` | Terminer « Les Trois Voies » avec un même chasseur. |
| Circuit | `pit-title-trophy-keeper` | Terminer « Les Trophées volés » avec un même chasseur. |
| Circuit | `pit-palette-ashen-circle` | Terminer « La Fosse profanée » avec un même chasseur. |
| Circuit | `pit-intro-elder-verdict` | Terminer « Le Jugement » avec un même chasseur. |
| Descente | `pit-banner-descent-survivor` | Terminer les huit étages, boss final compris, avec un même chasseur. |

« Canonique » désigne ici la validation de la sauvegarde du jeu, pas un statut dans les films. Les libellés et les 18 IDs complets sont dans l’inventaire. Posséder l’ID d’une distinction ne prouve pas que son costume, sa bannière ou son intro dispose déjà de tous ses assets exploitables.

### Quatre axes indépendants

| Axe | États requis | Présentation |
| --- | --- | --- |
| Découverte | Secret, indice/silhouette, identifié | Emblème neutre tant que la silhouette, le nom ou la voix révéleraient trop. |
| Droit | Aucun, conditions remplies à récupérer, permanent, temporaire confirmé, vérification, expiré/retiré | Le droit réel et son origine sont distingués de l’aperçu. |
| Technique | Installé/compatible, à installer/mettre à jour, indisponible/erreur | Message d’installation ou de problème, sans accusation d’absence d’abonnement. |
| Partie | Autorisé ou incompatible avec mode, composition, version | Motif précis et solution de remplacement. |

Le module d’accès du lot reste une projection explicite des données autorisées ; il ne crée pas une deuxième sauvegarde concurrente. Les états de service externe peuvent être représentés, mais aucun accès temporaire d’abonné n’est octroyé par un booléen client. La portée réellement testée est consignée au point de reprise.

Dans `buildPitRewardSlotsV1`, la disponibilité par défaut concerne la carte de distinction et ses données de palette existantes. Elle ne déclare pas que le costume complet, la bannière animée ou la scène suggérée par un intitulé sont produits. Pour un nouveau contenu exigeant des fichiers, le consommateur doit fournir sa disponibilité réelle et revérifier celle-ci avant le lancement.

### Langage visuel et interactions

**Raccordement actuel :** [`PitHonorsPanel.tsx`](../../app/game/PitHonorsPanel.tsx) affiche les 18 distinctions par défaut, avec sceaux SVG originaux, états d’accès, conditions et progression. Les couleurs des palettes restent masquées avant acquisition. Ces sceaux constituent une création d’interface ; ils ne reproduisent pas un glyphe canonique et ne remplacent aucun sprite de personnage. Le filtre « seulement les distinctions obtenues » reste disponible.

Un slot verrouillé utilise un portrait assombri ou une silhouette noire **avec contour, symbole de fermeture, texte et focus visible**. La direction Yautja retenue emploie un cadre de trophée ou un panneau de scan ; elle reste une métaphore d’interface propre au projet.

Le slot peut recevoir le focus pour expliquer sa condition. La confirmation ouvre l’information utile ; elle n’ajoute pas un membre interdit à l’équipe et ne déclenche pas une boucle d’erreurs. La sélection aléatoire ne choisit que des contenus utilisables. Secret, verrou, récompense prête, acquis, vérification, installation et incompatibilité ne partagent pas le même libellé.

Une présentation abrégée ou à mouvements réduits donne exactement les mêmes informations. Le déblocage s’enregistre avant la scène. Le personnage ou costume devient sélectionnable lorsque droit, dépendances et installation sont prêts ; la cinématique ne retarde pas ce fait.

### Conditions, sources et sauvegarde

Les conditions sont des arbres **ET/OU** avec événements et compteurs stables. Exemples de conception : accomplissement de chapitre ET interaction avec une archive ; défi OU découverte ciblée ; droit permanent OU accès temporaire confirmé. L’interface montre réellement les alternatives.

Les attributions passent par l’autorité du mode. Pour la progression locale actuelle, conserver le sidecar validé, son propriétaire exact, ses révisions et `appliedResultIds`. Ne pas additionner le progrès de plusieurs chasseurs pour satisfaire une condition qui exige un parcours unique. Un résultat répété, un rechargement ou un retour après interruption ne redonne pas la récompense et ne facture pas deux fois un coût.

Un costume obtenu avant son personnage reste acquis. Un costume cosmétique conserve timing, collision, ressources et commandes ; une apparence qui change le kit devient une variante documentée. La récompense d’un personnage ne retire pas une partie native indispensable de son moveset derrière un second verrou.

## 9. Extension 02 — soutiens, stages spéciaux et compatibilité

### Offre de soutien : conception différée

La possibilité de contenus dédiés aux soutiens est conservée dans la bible. **Aucune offre Patreon, aucun paiement, aucun compte lié et aucun droit serveur actif ne sont établis par ce lot.** Le projet actuel reste présenté comme non commercial dans son README ; la conception d’une option future n’en change pas silencieusement le statut.

Le premier périmètre envisagé privilégie apparences, palettes, présentations ou ambiances. Pour chaque avantage, la fiche choisit explicitement : récompense permanente, catalogue temporaire ou livraison par période. Elle donne identifiant, contenus, dépendances, admissibilité, règle de récupération, lots passés, voies alternatives, durée et version des conditions. Une acquisition permanente reste permanente après une fin normale d’abonnement.

L’activation requiert un adaptateur de confiance : autorisation officielle du fournisseur, secrets hors client, vérification des événements, idempotence, réconciliation et liaison au bon profil. Une capture d’écran, une adresse identique ou `abonne = true` en local ne donne aucun droit. Les références des sections 60 et 67 du guide doivent être revérifiées au moment du développement de cet adaptateur.

### Expiration, hors ligne et panne

Une annulation, une baisse de niveau, une panne et une expiration confirmée sont des événements différents. Une panne signifie « vérification indisponible », pas « abonnement terminé ». L’expiration retire uniquement la source temporaire concernée ; toute autre source permanente valide conserve l’accès.

La politique future de justificatif hors ligne fixera une validité et une tolérance bornées. Elle ne créera aucun nouveau droit sur un échec réseau. Le match autorisé conserve sa configuration jusqu’au résultat, puis une apparence devenue inaccessible reçoit un remplacement annoncé avant la partie suivante. Préférences, historique, découvertes et progression sont conservés.

### Stages et contextes de jeu

Pour chaque stage spécial, séparer quatre autorisations : consulter, sélectionner, participer et s’entraîner. Le choix recommandé est qu’un adversaire puisse participer sur le stage choisi par son partenaire de match sans recevoir le droit de le sélectionner ensuite. Ce comportement exige que les deux clients possèdent les bons assets ; il n’est pas un service réseau déjà fourni.

En compétition, un habillage de soutien conserve géométrie, collisions, limites et signaux de jeu. Les versions statique/réduite utiles au confort ne nécessitent pas une acquisition supplémentaire. Une transition prépare toutes ses destinations ; à défaut, utiliser une configuration commune avant le lancement.

Les invités locaux, équipes sauvegardées, doublons et costumes incompatibles doivent donner un remplacement sans effacer tout le profil. La lecture d’un replay ne dépend pas seulement de l’abonnement actuel de son auteur ; versions et ressources requises sont identifiées, avec message clair si elles manquent.

## 10. Production artistique, audio et UX

Les sprites sources gardent **un sujet exploitable par fichier**, corps entier et membres/armes dans le cadre, alpha réel, ligne de sol, pivot et marges. Un storyboard peut comporter plusieurs acteurs ; un atlas d’intégration peut regrouper des sources conservées séparément. Une pose n’est pas une animation, une recoloration n’est pas un nouveau mouvement et une présentation de menu ne valide pas un mouvement de combat.

Les étapes sont distinctes : fiche/source, candidat, contrôle technique, revue visuelle, admission, intégration, test, publication. Le contrôle technique mesure dimensions, alpha, pixels visibles, bords, empreinte et propriétaire. La revue visuelle compare proportions, masque, visage, dreadlocks, attaches, emplacement des armes, asymétries et silhouette à l’échelle de jeu.

Chaque séquence possède un début et une sortie : sélection, taunt, assistance, tag, super, entité, bonus, déblocage. Prévoir points d’émission, contacts, réactions, voix/SFX, VFX et caméra. Les sons et effets suivent l’événement réel et s’arrêtent avec la scène. Les options de confort préservent les annonces nécessaires.

L’atelier [`/pit-lab`](../../app/pit-lab/PitAnimationLab.tsx) et les inventaires existants restent les points de revue des variantes/orientations. Le volume global des manquants ne se réduit pas en déclarant les poses de secours comme une couverture terminée.

## 11. Validation et critères de livraison

Le [guide gamedev](../GAMEDEV_AGENT_GUIDE.md) impose de distinguer source, comportement, navigateur, art et performance. Pour un changement documentaire, contrôler empreintes et liens suffit ; pour les nouveaux systèmes de cette branche, exécuter les tests qui touchent réellement leur contrat et inspecter l’interface.

| Domaine | Preuve attendue |
| --- | --- |
| Sources importées | Trois tailles et SHA-256, 68 sections présentes, aucune modification des originaux. |
| Accès et distinctions | Vraies victoires/résultats → sauvegarde → chargement ; doublon sans nouvelle attribution ; propriétaire invalide rejeté ; quatre axes indépendants. |
| Présentation de sélection | Navigation rapide, retrait, remplacement, changement de costume, mouvement réduit, focus et aucun effet résiduel. |
| Candidats graphiques | Revue par fichier, variante, orientation ; aucun statut de clip fluide ou 1:1 déduit de deux poses. |
| Tag/assistance futurs | Partenaire réservé une fois, coût atomique, KO en entrée/sortie, contrôle transféré et combo conservé. |
| Super/clash futurs | Garde/échec/interruption, tiers simultanés, égalité/absence et même état final après scène abrégée. |
| Bonus/exploration futurs | Réussite/échec, reprise, sortie, récompense unique et absence de cycle de prérequis. |
| Droits externes futurs | Événements vérifiés et désordonnés, expiration partielle, panne, accès permanent conservé, compte correct. |

Les 18 cas d’acceptation de l’extension 01 et les 22 de l’extension 02 sont conservés dans la [checklist](combat-guide/combat_extensions_requirements.json). Les tests de données de l’accès ne valident pas les 22 parcours de bout en bout, et aucun test de module ne constitue une vérification d’un service de paiement inexistant.

Les suites existantes à réutiliser selon le changement comprennent `pitHonors.test.ts`, `pit-save.test.mjs`, `pit-round-presentation.test.mjs`, `pit-presentation-plans-v93.test.mjs`, `pit-fidelity-v91.test.mjs`, `pit-character-chronicles-v80.test.mjs`, `pit-workbook-campaign-v108.test.mjs` et `pit-replay.test.mjs`. Les noms des nouvelles suites et leurs résultats appartiennent au point de reprise, avec leurs limites réelles.

## 12. Backlog priorisé et prochain lot

| Priorité | Travail | Condition de clôture |
| --- | --- | --- |
| P0 | Conserver les trois guides complets et la traçabilité des 68 rubriques. | Empreintes, index, liens bible/campagne et liste des écarts vérifiés. |
| P0 | Présenter les 18 distinctions avec états explicites et projection d’accès. | Sauvegarde existante préservée, contenu réellement acquis distingué d’un asset prêt, navigation accessible testée. |
| P0 | Obtenir un premier lot artistique admis après le cycle d’interface déjà vérifié. | Corriger les écarts des cinq candidats Greyback reçus, produire les orientations et intervalles requis, puis revue artistique ; aucun clip natif déclaré sur la seule réception des PNG. |
| P1 | Compléter les dessins de sélection et les taunts prioritaires des douze combattants historiques. | Variantes et deux orientations contrôlées ; un clip complet exige des poses distinctes et des transitions relues. |
| P1 | Individualiser les kits fournis par source et incarnation. | Action, arme, limites, visuels et source propres ; ne plus emprunter automatiquement le profil partagé. |
| P1 | Prototyper un profil hybride avec une paire cohérente et une entité native. | Transfert de contrôle, coûts, KO, combo, état des objets et sauvegarde/replay versionnés. |
| P1 | Une super duo, une fin dramatique et un clash représentatifs. | Règles complètes, cibles compatibles, échec court, interruption et sortie jouable. |
| P1 | Un bonus de précision et un bonus de destruction. | Entrée, objectifs, réussite/échec, score, reprise et attribution unique. |
| P2 | Galerie des distinctions explorable reliée à la topologie existante. | Accès logique, même catalogue, aller/retour et sauvegarde sans impasse. |
| P2 | Étendre arènes vivantes, objets et transitions par kit réellement admis. | Destination jouable, collisions, confort, combo et ressources testés sur chaque liaison. |
| P2 | Compléter Boss Rush, géants, machines et campagnes spécifiques. | Parcours complet et réponses vérifiées pour les familles de combattants. |
| P2 | Règles et adaptateur éventuel de soutien. | Offre explicite, fournisseur branché et vérifié, identité de compte et sources d’accès correctes. |
| P2 | Tournois en ligne, matchmaking et compatibilité réseau. | Services réels, synchronisation, déconnexion et replays testés ; un menu seul ne suffit pas. |

La reprise suivante doit lire le [dernier point de continuation](CONTINUATION_20261127_LOT2.md), vérifier la branche et poursuivre les éléments encore ouverts. Les dénominateurs demeurent nommés : identités, variantes, clips, poses, scènes et règles d’accès ne sont pas additionnés dans un pourcentage artificiel.
