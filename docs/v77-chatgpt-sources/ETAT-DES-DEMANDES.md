# État des demandes des conversations — V77

État documentaire du **3 octobre 2026**, après montage dans les vrais consommateurs du jeu. « Intégré » signifie que le code ou la source visuelle est consommé dans le candidat V77. Cela ne signifie pas que tout le brief est terminé, que chaque image est canonique, que le parcours GameClient final est validé ou que la version est publiée. Les résultats du navigateur et de livraison doivent être joints séparément.

Les résultats locaux explicitement cités ci-dessous restent liés à leur candidat et à leur URL. Le PASS C’ntlip `navigation4` concernait 4196 ; quatre nouvelles recettes indépendantes ont depuis validé leur périmètre sur `v77-candidate4-local`, servi en 4198 : monde 27 contrôles/24 captures, faune 5/12, C’ntlip 11/9, baseline GameClient 5/22. Les 67 images ont leurs reçus propres de relecture et leurs SHA exacts, assemblés dans `work-local/v77/final-review-register-candidate4.json`. Le dernier enregistrement réel est daté du 3 octobre à 05:22:30.822 UTC ; pour la baseline il s'agit d'une vérification SHA supplémentaire des images déjà ouvertes, dont les heures d'ouverture exactes n'ont pas été conservées et ne sont pas reconstruites. Le montage, les recettes et les relectures demeurent distincts du résultat de suite complète et des gates de livraison. Aucune preuve 4196 n'est automatiquement transférée sur 4197, 4198 ou l'alias public. Les rites contrôlés peuvent rester séparément réutilisables si leur exact SHA HuntCanvas est inchangé, avec leur date historique conservée ; cela ne réutilise pas un parcours GameClient final ancien.

Le [bilan final local](../v77-local-delivery-qa.md), exécuté à 05:25:28.787 UTC, recoupe les archives fraîches du candidat 4 : deux builds réussis, typage/lint/CSS compilé réussis, suite complète **2 642 tests/2 642 PASS, zéro échec, annulation, skip ou todo**, quatre recettes et relectures liées, 19 PNG conformes par HTTP/SHA. État `PASS_LOCAL_GATES`, aucune condition manquante. Le commit/push, READY et les recettes sur le runtime public restent des gates distincts ; la réussite locale ne termine pas les éléments artistiques/narratifs listés ci-dessous.

## Sprites corrigés et faune

Source : [15 demandes utilisateur et 30 tours complets](01-sprites.md). Les 12 PNG sont conservés, liés au tour source et intégrés au registre réel du bestiaire/codex. Les deux versions antérieures du crustacé restent disponibles. Aucun original n'a été supprimé ni modifié. Les planches multisujects restent des références entières ; elles ne sont pas découpées artificiellement en faux clips.

| Demande source | État | Portée et reste |
|---|---|---|
| Tour 1 — sprite 2D fidèle à la référence publique | Partiel | Source publique et résultat conservés ; original importé non accessible, comparaison 1:1 non certifiée |
| Tours 3/5 — référence chargée puis monstre seul sans décor | Intégré comme source statique | Scène de caverne conservée en référence ; monstre isolé du tour 6 conservé dans ses variantes |
| Tours 7/9 — restaurer les deux défenses, y compris la pointe manquante | Intégré comme source corrigée | Tour 10 `crustacean-restored-tusks-final` retenu comme dernier résultat ; tours 6 et 8 explicitement remplacés, préservés |
| Tours 11/13 — créatures isolées réalistes sans décor | Intégré comme source statique | Créature ailée turquoise et créature volcanique ambrée ; pas de clip natif dessiné |
| Tour 15 — créature isolée suivante | Partiel | Le résultat est enregistré honnêtement comme rhinocéros cuirassé ; la formulation utilisateur « insecte » n'est pas réécrite pour prétendre une concordance exacte |
| Tours 17/19/21 — monture seule, six vues de référence, validation du lancement | Partiel | Dernier cheval au tour 22 conservé ; référence de collection, pas de monture jouable ni d'animation de cavalier |
| Tours 23/25 — nouvelles montures originales cohérentes | Références intégrées, gameplay manquant | Deux planches entières consultables ; espèces originales non certifiées canoniques, pas de recrutement ni de locomotion native |
| Tours 27/29 — faune nouvelle adaptée aux biomes | Partiel | Deux planches de bestiaire supplémentaires consultables ; quatre poses fixes placées dans des régions existantes sur des appuis séparés ; cages, comportements et atlases d'action manquants |

Consommateurs : [registre de faune](../../app/game/data/homeworldFaunaArtV77.json), [modèle de faune](../../app/game/systems/homeworldFaunaV77.ts), [références de ville](../../app/game/data/homeworldConceptRefsV77.json). La galerie emploie une échelle uniforme et identifie poses fixes, références et variantes. Une image placée dans un biome ne donne ni découverte gratuite, ni monture, ni nouveau combat. La recette faune finale du candidat 4198 est PASS ; ses 12 captures ont été ouvertes avec `view_image` par le responsable du lot et liées aux empreintes exactes dans `work-local/v77/qa/fauna-final-candidate4-local/visual-fauna.fragment.json` (relecture du 3 octobre à 05:15:51.975 UTC). Cela couvre galerie, erreur PNG explicite et réessai de la même source, puis marche réelle/pose/faune/pause dans quatre régions aux préconditions déclarées. Le plateau rocheux natif commun aux quatre biomes, les anciens panoramas et grandes bandes de chemin restent artistiquement partiels ; les écrans de pause sont volontairement floutés et leurs appuis relus sur les vues non pausées. Aucune animation anatomique, monte jouable ou fidélité 1:1 aux références originales inaccessibles n'est certifiée.

## Rites de chasse

Source : [conversation complète](02-rites.md). Le nouveau lot utilise le vrai `HuntCanvas`, son snapshot de rencontre et de vrais acteurs morts/vivants. Il préserve les autres prélèvements et le QTE du boss. Les chiffres d'honneur, de terreur et les identités d'exemple proposés dans la conversation ne sont pas des faits de lore ni des récompenses déjà montées.

| Demande / groupe de propositions | État | Portée et reste |
|---|---|---|
| Dépouille persistante et examen contextuel | Intégré dans la chasse active | Identité, acteur mort, source, propriétaire et point recoupés à la reprise ; pas de cadavre inventé pour une ancienne sauvegarde |
| Menu d'opérations, durée et sécurité | Partiel | Analyser, marquer, laisser, effacer ; menu nonmodal, gestes temporisés, interruption par dégâts/distance et pause ; pas de nouveau trophée accordé |
| Flaying Tool, dépecer et suspendre à un vrai appui | Manquant et verrouillé | Aucun outil réellement acquis ni point de suspension authoré dans ce lot ; pas d'action fictive disponible |
| Porter, déplacer et mettre en scène la dépouille | Manquant | Transport corporel, sockets et gestes natifs à produire |
| Conservation longue, météo, sang séché, charognards, récupération ennemie | Manquant | Persistance après clôture de mission et vieillissement du monde non livrés |
| Témoin, peur et investigation | Partiel | Vrais témoins selon visibilité, orientation, distance, couverture/murs ; suspicion/morale et recherche vers la dépouille ; aucune position du héros accordée gratuitement |
| Apprentissage de faction et contre-mesures successives | Manquant | Détecteurs, équipes, pièges, renforts et progression historique par faction non livrés par ce lot |
| Qualité de proie et Code de la Chasse | Partiel | Les vérifications du contexte ne sont pas remplacées par une récompense automatique ; évaluation complète et biographies nommées à produire |
| Honneur, infractions, Enforcer, variante Bad Blood | Manquant pour cette chaîne | Pas de nouveau gain de rang, réputation, infamie ou progression Bad Blood par une action du menu |
| Différents gestes / outils / trophées par espèce | Manquant | Atlases dédiés humains/Xénomorphes/Amengi/géants/Yautja non produits |
| Trophée avec biographie, provenance et classification | Manquant pour les nouveaux rites | Pas de fiche inventée à partir du seul texte d'exemple |
| Atelier et placement physique dans le vaisseau | Manquant pour cette chaîne | Préparer/nettoyer/graver/exposer/offrir et placement réel ne sont pas achevés par le lot |
| PNJ Homeworld reconnaissant les nouveaux trophées | Manquant | Réactions, prix, clans, quêtes et PIT fondés sur ces nouveaux reçus à brancher |
| Événements de découverte, surnom et style observé | Partiel / manquant | Découverte locale par témoins réelle ; surnom historique, style durable et chaîne de conséquences non achevés |
| Trentaine de rites, Blooding et Trophy Wall communs | Manquant comme ensemble exhaustif | Une proposition de trente rites n'est ni trente actions jouables, ni trente nouvelles planches |

Preuve disponible : [11 scénarios du vrai Canvas contrôlé](../v77-rites-qa-2026-10-03.md), avec captures desktop/mobile relues et absence d'erreur dans ce périmètre. Ce banc déclare ses fixtures ; il ne démontre pas une mission complète jouée depuis GameClient, une manette, une synchronisation de compte ou une publication.

## C’ntlip : intégration, sauvegarde et limites

Source : [conversation complète](03-cntlip.md). Le nom et la description intoxicante/ardente sont corroborés par des références secondaires ; la page primaire du roman n'a pas été lue. Les réceptions, hôtes civils, récipients, stocks, doses et durées du jeu sont des **adaptations originales explicites**, pas une recette canonique. Dachande et Nei’hman-de ne sont pas clonés comme hôtes de ces tables.

| Demande | État | Ce qui fonctionne / reste |
|---|---|---|
| Culture de table du Homeworld | Intégré, art partiel | Quatre tables réelles dans les vrais intérieurs, hôtes civils originaux présents, approche physique et collisions normales ; posture native debout, aucune planche assis/verser/boire encore produite |
| Clan, marché, halte du PIT et cour | Intégré | `clan-lodge`, `market-canopy`, `pit-gate`, `throne-audience` ; rang adulte et accueil réel requis, cour sur +2 avec audience réelle ; aucun service existant déplacé |
| Participation Youngling/Unblooded suggérée dans la réponse | Non montée | Par décision de portée, l'UI de consommation demeure absente de la nurserie, du duel et du prologue ; banquet/écoute de récits sans alcool restent à écrire |
| Plusieurs doses facultatives sans buff de combat | Intégré, sensations partielles | Portion unique et geste de 3 s ; dose 2/3 : vignette faible, dose 3 : déplacement .94 en contexte sûr actif ; mouvement réduit neutralise la vignette ; aucun bonus d'attaque, soin, rang ou combat |
| Respiration, bruit audio, Bio-Mask, corps relâché | Manquant / modèle partiel | Paramètres audio du modèle non branchés au mixer ; sons dédiés et clips natifs retirer/remettre le masque/boire/assis non livrés |
| Invitation et disponibilité de boisson réelles | Intégré comme hospitalité originale | Quatre portions par lieu, invitation unique par campagne ; pas d'achat ou de monnaie fictifs, pas de stock infini |
| Conversations, récits et souvenirs | Intégré localement, chaîne longue partielle | Récit de l'hôte et souvenir local unique ; pas de relation globale ou quête terminée par une coupe |
| Ellipse après repos/excès | Intégré | Deux heures narratives locales, même lieu de réveil ; temps de jeu réel, frais, santé, missions, inventaire, preuves et rang inchangés |
| Sauvegarde, reprise et consommation unique | Intégré, QA GameClient locale PASS | Réservation durable, fermeture/pause/focus/suspension figent ; reprise de la même portion ; refus de quota explicite et réessai manuel ; verrou contre double clic et commit réentrant |
| Sauvegardes anciennes / futures / corrompues | Intégré | Champ additif `cntlipV77`, anciennes campagnes sans ledger compatibles ; état présent futur/invalide refusé, pas silencieusement remis à zéro ; checkpoint physique de ville préservé |
| Compagnons recrutés, alliances humaines, souvenirs et nouvelles chasses | Manquant | Dialogues propres aux recrutements et reçus de relation nécessaires ; aucune réussite déduite d'une proposition |
| Banquets après chasse, rang, Quatza-rij et deuil | Manquant comme scènes | Enchaînements facultatifs, réception multiple, trophées et décès permanents doivent dépendre des événements réellement enregistrés |
| Mess du vaisseau après acquisition réelle | Modèle partiel, non monté | Contrat prévu ; aucun mess disponible ni boisson accordée dans le vaisseau par ce lot |
| Tavernes Bad Blood et recettes locales originales | Manquant | Recettes non canoniques, fermentation et tavernes à produire |
| Codex : faits connus / observations du joueur | Partiel | Séparation lore/adaptation et souvenirs locaux réelle ; âge, producteurs, variantes et observations étendues non achevés |
| Le récipient vide | Manquant, idée conservée | Pas de quête complète jouable ni de décès ou chasse rétroactivement accordés |
| La dernière coupe | Manquant, idée conservée | Mort permanente, clan, siège vide et réception propre à brancher |
| Le banquet des trois clans | Manquant, idée conservée | Rencontre multi-clans et tensions/décisions à écrire |
| Une récolte inhabituelle | Manquant, idée conservée | Ingrédients du clan original, parcours et objectif réel à produire |

Montage : [modèle](../../app/game/systems/cntlipV77.ts), [ledger](../../app/game/systems/cntlipLedgerV77.ts), [droits physiques](../../app/game/systems/homeworldCntlipPhysicalV77.ts), [widget](../../app/game/HomeworldCntlipV77.tsx), [hôtes](../../app/game/HomeworldCntlipHostsV77.tsx), [hook runtime](../../app/game/useHomeworldCntlipV77.ts), [Hub réel](../../app/game/HomeworldHub.tsx), [sauvegarde](../../app/game/save.ts).

Les quatre hôtes originaux sont la Soigneuse de relève, l'Artisane des délégations, le Préposé à la halte des Chroniques et le Porte-parole de la cour locale. Ils utilisent les sources civiles natives de leur rôle, avec un vrai rectangle de collision et une occlusion normale. Les deux tables ajoutées n'altèrent pas les anciens murs, cloisons, meubles ou services des 43 pièces. Le préposé du PIT réutilise la tenue du civil ancien : leur variété graphique reste limitée malgré leurs identités distinctes.

La QA ciblée du modèle/sauvegarde/input et un banc navigateur isolé du vrai Hub apportent des preuves distinctes. Ce premier banc démarre une campagne adulte déclarée près d'une table : il ne prouve pas le jeu complet. Le [runner GameClient](../../scripts/verify-homeworld-cntlip-v77.mjs) a ensuite passé **11 contrôles dans les quatre lieux sur le candidat final 4198**, avec marche réelle corps entier, récit, quota, double clic, fermeture/reprise, pause, suspension et viewport mobile. Les **neuf nouvelles captures ont toutes été ouvertes et relues**, sans reprendre celles de 4196 : voir la [revue bornée](../v77-cntlip-gameclient-review.md), passage `cntlip-final-candidate4-local`, et le reçu SHA `work-local/v77/final-review-cntlip-v77-candidate4-local.json` (05:13:32 UTC). Le rapport lié au SHA256 `8029db9c8f3b313db53481aae3fee7d6c4c5d10e33daf64861c557f310797190` enregistre des canaux `errors` et `network` vides ; il ne collecte pas le canal console. La notification mobile chevauche transitoirement le bas du panneau ; l'absence de débordement horizontal ne supprime pas cette réserve visuelle. Les préconditions de campagne adulte/audience restent déclarées avant chargement, pas prétendues gagnées pendant ce run. Les premiers échecs de banc restent historiques et ne sont pas convertis en PASS. Le test local ne démontre ni trajet depuis le port, ni prologue, ni cloud, ni déploiement.

## Homeworld : les 28 sections

Source : [six tours complets](04-homeworld.md), [prompt exact](homeworld-prompt-codex.txt) et deux cartes préservées. Le plan précédent et le dernier plan accepté restent consultables séparément. Ils guident une adaptation originale ; ils ne servent ni d'unique fond remplaçant la ville, ni de carte officielle de la franchise.

| Section | État intégré dans V77 | Travail partiel ou manquant |
|---:|---|---|
| 1 — Objectif global | Vrai Hub étendu 10400 × 6400, sans prototype parallèle | Ville entière dense et refonte artistique exhaustive |
| 2 — Direction artistique | Sources natives préservées et concepts séparés des faits de lore | Références canoniques primaires et architecture spécialisée supplémentaires |
| 3 — Architecture | 43 bâtiments/services et vrais intérieurs réutilisés | Palais/Conseil spécifiques, pyramides et tissu urbain plus dense |
| 4 — Verticalité | Six niveaux physiques et sept raccords intégrés au déplacement | Six raccords sans image native finale |
| 5 — Bas-quartiers | -1A/-1B/-1C, sols, routes, collisions et reprise | Décors et populations particuliers plus denses |
| 6 — Faune et cages | Registre/galerie et quatre poses fixes natives dans les régions | Cages, comportements, réactions et clips d'animation dessinés |
| 7 — Montures | Références statiques préservées | Monture jouable, cavalier, appuis, équipement et actions natives |
| 8 — Spatioport | Groupe déplacé de +6500 X avec navette, portes, civils, services et props | Architecture monumentale, trafic et actions supplémentaires |
| 9 — Passage lave | Quai réel, deux statues, skiff et passeur ; permissions et trajet de 12 s | Bateau fixe déplacé, civil existant ; pas d'actions natives dédiées, QA finale séparée |
| 10 — Côte | Sentier occidental lié à la région existante | Habillage côtier plus riche |
| 11 — Autres régions | Dix régions et accès existants conservés, deux docks liés | Tous les nouveaux décors de biome ambitieux |
| 12 — Densité | Props/routines existants, sols continus et nouveaux modules indépendants | Centaines de structures/groupes urbains demandés |
| 13 — Parallaxe | Projection/décors indépendants et six plans physiques | Les huit couches artistiques à vitesses distinctes ne sont pas terminées |
| 14 — Intérieurs | 43 plans locaux, proportions, portes, reprise ; tables sociales réellement ajoutées | Pièces privées et multitude de props spécialisés supplémentaires |
| 15 — Population | 98 itinéraires civils associés aux vrais étages ; quatre hôtes originaux ajoutés | Toutes les catégories, tenues et actions natives distinctes |
| 16 — Vie ambiante | Marche civile, flux décoratif de lave et C’ntlip temporisé | Décollages, interactions dessinées, cages et montures |
| 17 — Caméra | Projection commune et zoom interpolé avec l'élévation ; angles représentatifs desktop/mobile relus sur candidat 4 | Tous les plans lointains et une finition artistique exhaustive |
| 18 — Level design | Routes corps entier, portes, retours et raccords physiques | Complétion artistique et narrative de chaque quartier |
| 19 — Lisibilité | Étage, palier, porte et carte explicites ; Atlas consultable dans le HUD sur desktop/mobile du candidat 4 | Variété architecturale ; proximité des façades et marqueurs qui couvrent partiellement le joueur sur deux vues |
| 20 — Carte | Six étages et raccords ; consultation sans téléportation | Habillage complet et cartes de biome |
| 21 — Performance | Culling, broadphase conservative et routes mises en cache | Charge de la future ville dense, pooling/streaming intégral non démontrés |
| 22 — Assets | 14 sources partagées identiques aux originaux ; adaptations OpenAI séparées | Animations, façades et raccords manquants listés ; aucun faux clip de pose fixe |
| 23 — Collisions | Corps entier, niveaux, rails, socles, supports et pont du skiff ; sept raccords réellement parcourus sur candidat 4 | Futurs assets et toutes les couches non parcourues ; les captures pausées floutées ne certifient pas les appuis |
| 24 — Audio | Système existant conservé | Nouveau lot de quartiers, coupes et respirations non livré |
| 25 — Pas de faux contenu | Verrous et limites explicites ; aucune progression cadeau | Fonctionnalités futures ne deviennent pas vraies par leur texte ou bouton |
| 26 — QA obligatoire | 2 642 tests source PASS ; rites Canvas séparés ; quatre recettes GameClient locales du candidat 4 et 67 images relues avec leurs réserves | Cloud, appareil physique, campagne entière et publication non validés par ce lot local |
| 27 — Livraison | Code monté, sources publiques, scripts, contrats, deux builds et collecteur final local PASS | Commit/push, READY et contrôle production séparés |
| 28 — Priorités | Audit, topologie, niveaux, spatioport, raccords et sources récupérées | Faune jouable, huit couches et finition artistique exhaustive |

Contrat de topologie détaillé : [homeworld-world-v77.md](../homeworld-world-v77.md). La localisation additive est liée au propriétaire de partie et validée physiquement ; entrer dans un intérieur puis reprendre conserve le niveau extérieur et le point local praticable. Les anciens saves sans checkpoint restent compatibles. La carte seule n'écrit pas de visite ou de gain, et aucun acteur n'est téléporté pour faire réussir un parcours QA.

## Hors portée de ces quatre conversations

Ces sources et ce premier lot ne terminent pas les cent arènes, toutes les animations des chasseurs, toute la campagne, tous les props, ni la synchronisation de comptes réelle sur plusieurs appareils. Une compatibilité de normalisation du nouveau champ C’ntlip avec le mécanisme de sauvegarde existant ne remplace pas une preuve de compte connecté et de reprise mobile/navigateur.

Les tests consolidés, deux builds et parcours/relectures du périmètre local sont désormais attestés par le bilan lié au début du document. Les étapes de livraison à établir séparément restent : commit/push, statut de déploiement READY et vérification des recettes/captures sur le runtime publié. Aucun gate de publication n'est déduit de la seule présence de ce dossier documentaire ni d'un PASS localhost.
