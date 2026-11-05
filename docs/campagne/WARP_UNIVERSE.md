# Warp Universe — complément intégré à la bible de campagne

Réconciliation du 5 novembre 2026, à la demande du créateur du projet. Branche : `claude/bible-de-campagne`, PR #116 ; base documentaire inspectée : `d3a289f738c9f33305a3564adf4141060f76d9d0`.

Ce chapitre complète [la bible de campagne](BIBLE_DE_CAMPAGNE.md), sans créer une seconde campagne ni modifier le jeu. Il rassemble la conception Warp Universe et les cinq lots d'illustrations réalisés dans la conversation. Les règles décidées ici sont des **spécifications**, pas la preuve de leur implémentation. Les 68 fiches historiques de la bible ne deviennent pas 104 missions jouables par l'ajout des 36 propositions ci-dessous.

Lecture associée : [catalogue des ressources et contrôle des archives](WARP_UNIVERSE_ASSETS.md), [reprise de production et critères QA](WARP_UNIVERSE_REPRISE.md).

## 1. Décision et ordre de lecture

**Warp Universe est le module facultatif du vaisseau personnel accessible au rang Adjutant, après une progression effective sur plusieurs planètes.** Il ouvre des branches d'époques terrestres, puis des chroniques de films : personnage du récit d'abord, avatar personnel après achèvement de cette chronique.

L'export `BIBLE_DE_CAMPAGNE.md` reste conservé comme source datée. Pour le seul périmètre Warp, les raccords explicites suivants complètent ou précisent ses passages historiques ; les autres décisions de la bible restent inchangées.

| Sujet | Existant conservé | Raccord retenu |
| --- | --- | --- |
| Rang | Adjutant, Level 4 ; progression narrative ; R2-M029 | Pas de nouveau rang « voyageur » et pas d'ouverture automatique par XP. Distinguer le rang et la fonction acceptée `function.playerAdjutant`. |
| Vaisseau | Personnel acquis à Blooded ; clan ship ultérieur | Le clan ship n'est pas un prérequis. Une future console de clan consulte le même module et les mêmes droits, sans doubler la progression. |
| Campagne | R2-M030 → M034, puis M048 | Réutiliser ces fiches et leurs drapeaux. Les titres « Les coordonnées de l'impossible » et « La première traversée » sont des intitulés d'arc/sous-étape, pas deux nouvelles chaînes concurrentes. |
| Technologie | Arc du prototype, Observatoire des Seuils, Rogue Space Tribe | Conserver les voies Enforcer et Bad Blood déjà écrites ; le Gardien du Seuil est une rencontre originale facultative de cet arc, non un remplacement des personnages existants. |
| Personnages de films | L-10 prévoit des chasses originales sans personnages des films | Cette restriction s'applique aux **expéditions originales**. Les **chroniques cinéma** constituent un mode séparé explicitement demandé, avec les personnages du récit. |
| Chroniques tardives | R2-M058 à Ancient | Conserver M058 comme quête tardive de mémoire/maîtrise ou d'archive avancée, pas comme verrou global empêchant toute chronique au rang Adjutant. |
| Progression libre | M034 autorise la poursuite sans Warp | Le module reste facultatif ; aucune chronique obligatoire pour devenir Elite, Elder ou terminer la campagne. |
| Règles du classeur | WARP-R01 → WARP-R24 | Identifiants préservés. Une vérification règle par règle avec le classeur reste nécessaire avant raccord logiciel ; cet ajout ne prétend pas avoir réaudité les 24 textes. |
| Fidélité | Créations, adaptations et sources distinctes | Ni l'avatar temporel ni une image générée ne deviennent un fait canonique ou une certification visuelle 1:1. |

### Accès après plusieurs planètes, sans blocage artificiel

Le joueur fait ses preuves dans les chasses de plusieurs planètes, puis obtient la fonction Adjutant par l'épreuve et la reconnaissance prévues dans la bible. Les huit chasses existantes restent la base : Oseris-IV (`jungle-vey`), Nivalis-K (`ice-cryostalker`), Cinder-12 (`volcano-bad-blood`), Naraka-Delta (`swamp-hydra`), Serekh-9 (`desert-sandmaw`), Pelagos-M (`ocean-leviathan`), Mycora-V (`fungal-hivemind`) et Acheron-Sigma (`ruins-ancient-guardian`).

La conversation proposait **12 missions distinctes sur au moins 4 planètes, avec une chasse majeure sur chacune**. Ce sont des valeurs d'équilibrage **non arrêtées**, à confronter au nombre de missions effectivement jouables ; elles ne constituent pas un verrou ajouté aujourd'hui. Ne pas exiger douze missions alors que seules huit chasses seraient disponibles. Compter rétroactivement les accomplissements prouvés de la sauvegarde, sans faire recommencer une chasse validée, sans compter les répétitions d'une même mission et sans inventer un historique manquant.

Les six origines gardent les mêmes conditions. Elles peuvent modifier les contacts, les dialogues et la motivation d'une destination, conformément au tableau des départs de la bible.

## 2. Quêtes et états existants

Les noms de drapeaux ci-dessous sont ceux de la **bible** ; leur présence dans ce document ne garantit pas leur lecture/écriture par le runtime. Aucun schéma de sauvegarde n'est modifié par cette PR.

| Fiche | Extension cohérente | État documentaire à conserver |
| --- | --- | --- |
| R2-M028 | Épreuve de coordination, préparation de la responsabilité | Aucun succès Warp accordé par simple ouverture d'un menu. |
| R2-M029 | Reconnaissance Adjutant et acceptation de la fonction | `function.playerAdjutant=true` après acceptation ; différer reste possible. |
| R2-M030 | Anomalies, Observatoire, découverte du prototype et des coordonnées | `warp.commonQuestStarted` ; vaisseau personnel et accès narratif requis. |
| R2-M031 | Stabilisateur, repère de retour, interface ; récupération et essais réels | `warp.componentsVerified` ; pièce défectueuse réparée, pas succès gratuit. |
| R2-M032 | Installation dans une baie, alignement, alimentation et test de retour à vide | `warp.moduleInstalled`, `warp.commonQuestComplete`, `warp.calibrated` ; travaux partiels conservés après échec. |
| R2-M033 | Première traversée courte, pose de balise, retour effectif | `warp.firstRoundTrip` ; aucune promotion de rang. |
| R2-M034 | Choix entre chasses, exploration, service et Warp | `campaign.routeTowardEliteReady` ; chemin de campagne sans Warp préservé. |
| R2-M038 | Préparer, identifier, transporter puis exposer un trophée | Réutiliser la chaîne de provenance et l'atelier existants. |
| R2-M048 | Approfondir une branche que le joueur ne possède pas | Ne pas attribuer automatiquement la propriété de son époque ou de sa population. |
| R2-M058 | Chronique avancée et mémoire au stade Ancient | Complément tardif ; ne révoque pas les chroniques déjà ouvertes. |

### Deux voies déjà prévues

**Enforcer :** mandat, enquête sur le prototype, récupération du module et installation autorisée. L'innocence éventuelle d'Armored Lost demeure un choix de l'arc existant. Un joueur loyal reçoit le mandat approprié dans ce récit, sans nouvelle campagne parallèle inventée pour contourner son accès.

**Bad Blood :** accès clandestin par la Rogue Space Tribe, avec les conditions narratives existantes. Les rangs précédemment reconnus restent enregistrés, mais l'exil n'accorde ni nouveau rang de clan gratuit ni immunité. Une ouverture peut laisser des traces exploitables par des Enforcers ; ce n'est pas une téléportation instantanée d'ennemis omniscients.

La fin de l'arc — prototype rendu, détruit ou gardé — peut suspendre l'accès conformément au récit. Les coordonnées découvertes, chroniques terminées et trophées déjà acquis restent archivés. Un choix narratif ne supprime pas silencieusement la sauvegarde et ne bloque jamais un personnage dans une instance sans solution de retour prévue.

## 3. Modes et avatars

| Mode | Avatar | Contrat |
| --- | --- | --- |
| Expédition d'époque | Yautja personnel | Région et missions originales, exploration, contrats, honneur et conséquences locales. |
| Chronique cinéma | Personnage et équipement propres à l'arc adapté | Événements et conclusion de référence ; sauvegarde d'instance séparée du personnage principal. |
| Réécriture | Yautja personnel | Débloquée **pour cette chronique** après sa conclusion ; équipement personnel autorisé selon le scénario, embranchements et fins alternatives clairement non canoniques. |

L'avatar cinéma n'est pas un simple costume posé sur les statistiques du joueur. Il possède son corps, ses outils, ses restrictions, son rôle et ses animations. Les ressources temporaires de l'instance ne remplacent pas l'inventaire personnel. Le retour restaure le personnage principal ; il n'importe que les récompenses explicitement autorisées.

**Conclusion scénarisée mortelle = chronique accomplie** lorsque le joueur a atteint le point narratif attendu. **Mort de gameplay prématurée = échec/reprise**, sans débloquer la Réécriture. Distinguer ces deux événements dans la future machine d'états et dans les tests. Ne pas imposer la survie d'un personnage dont l'arc se termine par sa mort.

Un achèvement ouvre immédiatement la Réécriture correspondante ; il ne faut pas terminer les neuf chroniques. Une chronique n'accorde pas de rang de campagne. Les chapitres humains supplémentaires sont facultatifs et ne bloquent pas cette première boucle.

### Chroniques terrestres prévues — propositions, non niveaux livrés

Les identifiants `WU-Cxx` ci-dessous sont des **identifiants de catalogue documentaire**, pas des IDs runtime existants. L'année de sortie d'un film n'est jamais utilisée comme année de la scène.

| ID | Référence | Première incarnation | Périmètre à produire |
| --- | --- | --- | --- |
| WU-C01 | Prey | Feral | Traque, observation, affrontements et conclusion de son arc ; chapitres Naru/Taabe optionnels. |
| WU-C02 | Predator | Jungle Hunter | Observation du groupe, jungle, pièges et confrontation ; chapitre Dutch optionnel. |
| WU-C03 | Predator 2 | City Hunter | Chasse urbaine, poursuite, piège industriel ; chapitre Harrigan optionnel. |
| WU-C04 | Alien vs. Predator | Scar | Pyramide mobile, récupération des armes, Xénomorphes et reine ; perspectives Celtic, Chopper ou Lex facultatives. |
| WU-C05 | Aliens vs. Predator: Requiem | Wolf | Nettoyage, récupération des traces, ville contaminée et conclusion ; aucune promesse que le Predalien manquant est produit. |
| WU-C06 | The Predator | Fugitive | Arc propre de Fugitive, **pas** l'intégralité du film présentée à tort comme vécue par lui ; autres perspectives séparées. |
| WU-C07 | Killer of Killers — récit viking | Yautja du segment | Parcours du segment, adversaires et fin à documenter scène par scène. |
| WU-C08 | Killer of Killers — récit japonais | Yautja du segment | Château, toitures et duel ; respecter les différentes phases temporelles du récit. |
| WU-C09 | Killer of Killers — récit de 1942 | Pilote Yautja | Véritable séquence aérienne ; en Réécriture, le joueur pilote un appareil compatible. |

Les sprites humains déjà produits ne signifient pas que leurs chapitres sont jouables. De même, un appareil fixe n'est pas un système de vol.

**Extensions hors Terre :** Predators, Badlands et les scènes extraterrestres de Killer of Killers gardent leurs mondes et leur continuité propres. Royce et Isabelle sont des illustrations anticipées pour cette extension. Ne jamais déplacer la planète-réserve ou Genna sur Terre pour remplir un catalogue terrestre. Leur production ne déverrouille pas ces destinations.

## 4. Univers, branches et géographie

« Changer d'univers » est le nom de navigation du module. La première version vise la Terre à différentes époques ; chaque destination doit distinguer monde, région, période, branche et scénario. L'époque seule ne suffit pas à identifier une mission. Les conséquences d'une Réécriture demeurent dans sa branche, sans effacer les événements de la campagne principale.

Conserver les identifiants historiques **W-01 à W-05**, sans les réassigner à d'autres lieux : W-01 viking, W-02 Japon, W-03 pirates/pistolet, W-04 Grandes Plaines, W-05 théâtre de 1942. Les familles `WU-E01` à `WU-E12` sont un classement supplémentaire ; elles ne remplacent pas les clés des branches.

### Précisions de continuité à appliquer

- La présentation officielle Disney du 6 juin 2025 situe le récit viking de Killer of Killers en **841** et décrit une forteresse près de l'actuelle Saint-Pétersbourg. Le fjord scandinave de notre expédition est donc un **lieu original**, pas une reproduction géographique attestée du film.
- Cette présentation donne le **début de l'époque Edo** et un saut de **vingt ans** pour le récit japonais. Le libellé hérité « 1609 » ne doit pas dater indistinctement toutes ses scènes ; conserver l'identifiant W-02 et vérifier chaque phase avant production 1:1.
- Le récit aérien est situé en **1942**, dans l'Atlantique au large de **Casablanca**. Un bunker européen générique ne remplace pas ce théâtre.
- L'inscription **1715** du pistolet de Predator 2 ne suffit pas, seule, à fixer la date de toutes les scènes d'une chasse de pirates. Choisir et documenter l'œuvre et la continuité utilisées.
- La faune préhistorique se sélectionne par période **et** région. Un catalogue d'espèces n'autorise pas leur cohabitation automatique. Le monde des dinosaures et la préhistoire humaine restent deux destinations distinctes.

Source primaire pour les trois premiers points : [Disney France, présentation des trois segments de Killer of Killers](https://newsroom.disney.fr/actualites/predator-killer-of-killers-pour-feter-son-arrivee-aujourdhui-sur-disney-decouvrez-un-extrait-du-premier-film-danimation-de-la-saga-predator-a42e6-dc71f.html).

### Statut du socle NECA

La bible héritée cite les biographies de l'Armored Lost Predator et de Spiked Tail pour un prototype espace-temps. Cette référence reste le **socle de l'arc déjà choisi**, avec sa continuité sous licence ; elle n'est pas remplacée par l'affirmation générale « aucun voyage temporel n'existe ». La transcription primaire de l'emballage/biographie reste à joindre pour un audit indépendant : la source héritée est une compilation secondaire.

Le portail pédestre, ses limites énergétiques, les branches stables, les avatars, les Réécritures et leur attribution au Level 4 sont des **règles originales du projet**, non des propriétés démontrées par les films ou la biographie. Une chronologie multiverselle unifiée entre toutes les œuvres n'est pas présumée.

## 5. Douze familles d'expéditions et trente-six missions proposées

Objectif de conception par famille : **8 à 12 secteurs reliés**, trois missions principales, puis des contrats et secrets. Ce volume est une cible, non un compte de cartes produites. Les suffixes `.1`, `.2`, `.3` identifient seulement les trois propositions de chaque ligne.

| ID | Famille originale | Missions .1 / .2 / .3 | Routes et besoins distinctifs |
| --- | --- | --- | --- |
| WU-E01 | Crétacé — Le monde avant l'homme | Les empreintes du géant / Le passage des troupeaux / Le souverain du bassin | Ravins, bassin, couloirs de troupeaux, berges ; grande faune et accès différenciés. |
| WU-E02 | Préhistoire humaine — Les feux sous la glace | Les traces dans le givre / La gorge aux échos / Le vieux solitaire | Grottes, campements, neige, gorges ; traces lisibles et mégafaune compatible. |
| WU-E03 | Égypte — L'œil dans le sable | Le convoi disparu / Les toits de la rive / Le gardien de la nécropole | Rive, dunes, portiques, toits, galeries ; mécanismes et voies de service. |
| WU-E04 | Frontière romaine — L'aigle silencieux | La patrouille des bois / Les portes du castrum / Le dernier centurion | Forêt, pont, camp, souterrains ; sentinelles et formations coordonnées. |
| WU-E05 | Vikings — Le fjord des crânes | Une voile dans la brume / La forteresse des marées / Le champion de la falaise | Caverne marine, quais, falaises, village, gorge, fort et tour. |
| WU-E06 | Moyen Âge — La bête du beffroi | La forêt des pendus / Les cloches du siège / Le chevalier sans bannière | Forêt, bourg, échafaudages, remparts, souterrains ; siège et guetteurs. |
| WU-E07 | Japon — L'ombre des cèdres | Les pas sur la pluie / Les portes sans gardes / Le duel du donjon | Cèdres, jardins, fossés, toitures, donjon ; approches et duels. |
| WU-E08 | Caraïbes — Le pavillon sans nom | Le mouillage interdit / Sous les ponts du navire / La chasse du capitaine | Port, ponts, mâts, cales ; abordages et trajets entre navires cohérents. |
| WU-E09 | Far West — Les rails du diable | Les vautours du canyon / Le train de minuit / Le dernier tireur | Canyon, ville, mines, voies ferrées ; train à référentiel mobile. |
| WU-E10 | Première Guerre mondiale — Les ombres du no man's land | Les fils sous la boue / Le poste qui ne répond plus / La chasse du contre-tireur | Tranchées, boyaux, cratères, tunnels ; projecteurs et artillerie annoncée. |
| WU-E11 | Seconde Guerre mondiale — La nuit des radars | Les yeux de la côte / Le convoi sous les sapins / La base avant l'aube | Côte, forêt, convois, dépôts, bunkers ; branche terrestre distincte du récit aérien WU-C09. |
| WU-E12 | Fin du XXe siècle — La ville des signaux | Les chasseurs du toit / La chambre froide / La dernière fréquence | Rues, métro, toits, bâtiments industriels ; contre-chasse et réseaux d'alerte. |

### Exemple de raccord spatial : le fjord

Une caverne marine sert d'ancrage initial. Sa sortie basse rejoint les quais ; une autre remonte aux falaises. Le village domine le port, la gorge conduit au fort, un sentier rejoint la tour. La première mission identifie l'équipage et sa cible ; la deuxième récupère une balise en offrant quai, hauteur ou drainage ; la troisième affronte une contre-chasse autour de la tour.

Les missions réemploient cette géographie et ses raccourcis. Elles modifient les guetteurs, les feux, les patrouilles et les accès après les événements réellement résolus. Une illustration de pont ou d'escalier n'autorise pas un passage tant que ses collisions, débouchés et deux sens de circulation ne sont pas réalisés.

### Exigences communes de level design

Prévoir une arrivée, un objectif, des solutions alternatives lisibles, des lignes de vue, des abris, au moins deux raccourcis lorsque la carte le permet et une extraction. Les raccords surface/intérieur/hauteur ont une position et un sens ; aucune porte flottante ou téléportation masquée. La perspective et l'échelle suivent le moteur de la scène existante, pas celles d'une vignette isolée.

Les adversaires réagissent avec des moyens plausibles pour leur époque : bruit, traces, guetteurs, formation, communications, éclairage et pièges. Ils ne connaissent pas magiquement le camouflage. Ne pas transformer un duel ancien en parade infinie contre n'importe quelle arme ; les restrictions fortes sont des règles de scénario ou des serments annoncés.

## 6. Module à bord, portail et boucle de mission

La baie du vaisseau personnel est un espace accessible, pas seulement un bouton : plateforme, montants blindés, conduites, console, réacteur, balise de retour, supports de trophées. La sélection montre la destination, le monde, la période, la branche, le mode, l'avatar, les restrictions, les risques, les récompenses et le moyen de revenir. Une prévisualisation derrière la membrane n'est ni le niveau chargé ni une certification de sa profondeur.

États à spécifier et tester : non installé → installé non calibré → prêt → ouverture → transit → instance active → retour → débriefing, avec panne/récupération et accès narratif suspendu. Ne pas déclarer ces états implémentés. Le personnage doit franchir un seuil physique ; collision, occlusion avant/arrière, point d'apparition et contrôle de sécurité doivent être cohérents.

Le coût énergétique, la stabilité et les charges de préparation sont des paramètres d'équilibrage. **Réserver le retour avant le départ** ou fournir une procédure d'urgence explicite. Pas de paiement ou de consommable aléatoire qui enferme le joueur ; pas de minuterie universelle inventée. Une fenêtre limitée appartient à un scénario annoncé avec checkpoints adaptés. Les pièces testées et les travaux effectués survivent à un essai raté.

Le vaisseau ne traverse pas automatiquement le portail pédestre. Une arrivée orbitale, un pod ou un atterrissage utilise le système d'insertion concerné, avec les risques de détection et d'énergie déjà prévus, si ce scénario le permet. Le camouflage du navire ne supprime pas la dépense du Warp. Une bascule vers un véhicule aérien doit prévoir entrée, contrôle, mouvement, dégâts, sortie et retour ; un simple sprite d'appareil ne couvre pas ces fonctions.

## 7. Honneur, compagnons et récompenses

**Expédition/Réécriture :** les actes du joueur suivent les preuves, témoins et jugements du système JUST existant. Les conséquences sont liées à la branche et à leur contexte ; ne pas remplacer ce système par une jauge cachée. Les Enforcers exploitent des traces ou un mandat, non une connaissance instantanée de toutes les coordonnées.

**Chronique :** le rôle scénarisé s'évalue dans son instance. Ne pas exiler le personnage personnel pour un acte imposé au personnage du film, ni lui attribuer une victime ou un mérite qu'il n'a pas acquis. Les trophées canoniques montrés à l'écran ne sont pas tous copiés gratuitement dans sa collection.

Les serments facultatifs peuvent imposer chasse sans camouflage, sans plasma, arme déterminée ou duel annoncé. Présenter les contraintes et distinctions avant validation ; aucun bonus ne doit encourager la chasse aux enfants ou aux personnes sans défense. Les populations civiles ont aussi des rôles non combattants.

Récompenses proposées : archives, provenance de chasse, trophées autorisés, gravures, apparences, techniques à équilibrer, décorations et distinctions. Un reçu unique d'achèvement empêche de réclamer plusieurs fois le même gain. Le trophée suit ensuite la chaîne de préparation, transport et exposition de M038 ; le film, la branche et l'avatar d'origine restent traçables.

Un avatar débloqué n'est **pas une recrue**. Recruter un personnage nommé nécessite une mission dédiée, une issue compatible et l'accord prévu dans le récit. Présence à bord, compartiment et emploi dépendent d'une affectation active et des règles du vaisseau ; pas de clone ajouté au clan en terminant un film. Animaux, montures et véhicules ont des acquisitions, capacités et places de stockage distinctes.

## 8. Raccord technique futur, sans nouveau système concurrent

| Existant à réutiliser/revérifier dans la branche d'implémentation | Contrat |
| --- | --- |
| `app/game/save.ts`, `app/game/systems/activeHuntSave.ts` | Propriétaire de la sauvegarde, reprise, migration et échec d'écriture ; pas de stockage parallèle silencieux. |
| `app/game/hunterSpriteAtlas.ts`, `app/game/hunterSpriteMotion.ts` | Identité, poses, atlas, points d'ancrage ; `validated` réservé à la revue artistique humaine. |
| `app/game/HuntCanvas.tsx`, systèmes de chasse | Réutiliser les scènes adaptées ; aucune migration de moteur ni dépendance introduite par cette spécification. |
| Systèmes du vaisseau et du clan ship | Même module, mêmes coordonnées et permissions ; occupation et accès physiques distincts. |
| Géographie et sessions stratégiques existantes | Ne pas confondre une branche terrestre avec une conquête de planète ou une session V85 ; aucun transfert de territoire ou de RAV implicite. |

Le futur contrat d'instance doit identifier sa version, le mode, le scénario, la branche, l'avatar, les règles d'équipement, le checkpoint et l'état de retour. L'accomplissement et son reçu sont séparés de l'état temporaire. Ces champs sont des exigences de conception, **pas des nouvelles clés de sauvegarde déjà actives**.

Sauvegarder avant entrée, distinguer suspension et conclusion, restaurer le personnage personnel après sortie, puis appliquer une seule fois les récompenses autorisées. Tester rechargement, fermeture, ancienne sauvegarde, stockage indisponible et deux onglets concurrents. Ne pas prendre un simple flag chargé depuis un catalogue pour une mission accomplie.

## 9. Art, animation, VFX, SFX et musique

Les cinq lots contiennent **170 illustrations fixes** contrôlées techniquement : **146 PNG avec transparence et 24 fonds opaques**. Le catalogue conserve leurs numéros, chemins d'archive et empreintes de lot. **40 images du périmètre numéroté restent à produire ou à couvrir par une ressource existante vérifiée.** Les animations, cartes, IA, audio et interfaces nécessaires ne sont pas incluses dans ce chiffre de 40.

Les deux portails actif/inactif ont des cadrages et dimensions différents : ce ne sont pas deux frames interchangeables. Avant animation, fixer silhouette commune, pivot, plateforme, aperture, échelle et marges. Séparer si nécessaire pylônes, plateforme, membrane, reflets et effets ; l'activation ne doit pas faire sauter la géométrie. Conserver les PNG sources au lieu de les écraser.

Pour chaque personnage : idle, marche/course, arrêt, accroupissement, saut/grimpe si applicable, interaction, attaque/parade, impact, mort/scène de conclusion et traversée ; directions et capacités selon le personnage. Pour les appareils : angles de vol, virage, roulis/inclinaison, entrée/sortie et propulseurs attachés au bon point. Ni miroir aveugle d'un équipement asymétrique ni étirement d'une pose fixe pour simuler tous les mouvements.

VFX à produire séparément : charge, ouverture/fermeture, ondulation de membrane, distorsion du transit, ancrage, surcharge/panne, décontamination et éclairages réfléchis. Leurs sockets et orientations suivent l'objet ; leur alpha, l'occlusion et la luminosité sont testés dans la scène. Les fonds panoramiques doivent être découpés/reconstruits si une parallaxe est requise ; ils ne sont pas automatiquement raccordables ou jouables.

Réutiliser les propositions audio des M030–M033 : `warp-hum`, `warp-interference`, `instrument-tick`, `part-test-ok`, `part-test-fail`, `module-align`, `power-up`, `warp-collapse`, `warp-enter`, `warp-exit`, plus ambiances d'époque. **MUS-43 et MUS-44** gardent leur rôle ; ne pas créer d'IDs musicaux concurrents. Les prompts musicaux de la bible ne sont pas des pistes enregistrées. Aucun nouveau SFX ou morceau n'est livré ici.

## 10. Production et acceptation

Ordre recommandé : réconcilier WARP-R01–R24 et les clés existantes ; réaliser une seule boucle M030–M033 avec retour sûr ; produire une expédition terrestre pilote ; produire une chronique avec son arc et sa Réécriture ; étendre ensuite les familles et l'aérien. Le contenu hors Terre reste une extension distincte.

Le [registre de reprise](WARP_UNIVERSE_REPRISE.md) conserve les 40 demandes d'images exactes, les tâches non illustratives et les contrôles d'acceptation. Une ligne ne passe à « intégré », « testé en jeu » ou « validé 1:1 » qu'avec la preuve correspondante. Aucun merge, déploiement, changement de sauvegarde ou nouvel accès jouable n'est effectué par cet ajout documentaire.
