# THE PIT V91 — audit du roster et des coups réellement consommés

Audit du 11 octobre 2026. Il couvre les registries en exécution, pas une certification visuelle ou canon de 201 personnages. Les références primaires et sous licence ont été consultées ; aucune wiki communautaire n’est employée comme preuve dans le nouveau module. Les références NECA servent à identifier une incarnation et des accessoires, jamais à inventer un combo.

## Effectif mesuré

`PIT_VERSUS_FIGHTER_IDS` et `PIT_FIGHTERS` contiennent les mêmes **201 identités**, sans doublon de clé : 12 de première édition, 4 extensions, 2 boss, 3 originaux/invités et 180 fournies. Warlord et Stone Heart sont bien accessibles au duel libre malgré `selectable:false` dans leur contrat de première édition ; cela ne les ajoute pas aux douze progressions originales.

**180/201 profils** copient intégralement les quatre attaques et le contre `user-balanced-contact-counter`. Les images, variantes et dossiers propres aux chasseurs ne constituent donc pas 180 movesets individuels. Les 21 autres disposent de recettes de duel définies séparément ; ce sont aussi des adaptations de jeu, pas des combos 1:1 certifiés. Il existe quatre slots d’attaque, une projection et les ressources communes, pas les grands kits d’animations/coups demandés à terme.

Theta et Machiko Noguchi sont des humaines. `guest-amengi-female` est un invité non-Yautja au design fourni non certifié. Les deux originaux V56 sont des créations du projet. Les 174 autres profils fournis sans dossier spécifique V91 gardent une espèce et une identité **non vérifiées par cet audit** ; ceci ne signifie pas qu’ils sont tous inconnus dans la franchise. L’audit refuse simplement de convertir le nom du pack en preuve canon.

24 dossiers possèdent des sources à portée explicitement limitée, parmi 26 références. Cette couverture n’est ni « 24 kits attestés », ni « 201 Yautja officiels ». Le nombre d’apparences ou movesets certifiés 1:1 est **zéro**.

## Ce qui est corrigé dans le module de présentation

Les recipes, dégâts, physiques, IDs, replays, sauvegardes et pixels restent inchangés. Les consommateurs doivent utiliser `pitMoveLabelV91` pour afficher les corrections :

| Personnage et slot | Ancien texte | Comportement actuel vérifié | Texte proposé |
| --- | --- | --- | --- |
| Celtic, moyen | Fracas au filet | Hitbox de contact, aucun filet créé | Fracas rapproché · adaptation de contact |
| Scar, lourd | Ascension au plasma | Hitbox de contact ; le projectile est la technique séparée | Frappe ascendante · adaptation de contact |
| Wolf, lourd | Interception au canon | Hitbox de contact, aucun tir créé | Interception rapprochée · adaptation de contact |
| Witch, lourd | Tir plongeant | Hitbox de contact, aucun tir créé | Frappe plongeante · adaptation de contact |
| Witch, technique | Piège à collet | Projectile `bow-snare`, état pinned, saut et camouflage bloqués | Collet du duel · adaptation non attestée |
| Warlord, technique | Décret de la Chronique | Projectile bas `warlord-wave` | Projectile de Chronique · adaptation non attestée |
| Stone Heart, technique | Onde du cœur blindé | Volume attaché et déplacement du propriétaire | Charge du colosse · adaptation de contact |

Le module signale aussi le profil partagé, les créations du projet, les humaines et les références propres à leur incarnation. Il ne retire aucun chasseur et n’efface pas les anciennes images. Un raccordement d’interface séparé est nécessaire : ajouter le module seul ne change pas les écrans existants.

## Attestation, accessoires et adaptations

- **Valkyrie :** le développeur décrit un marteau nordique à deux mains, une attaque rapprochée et une frappe verticale lourde. La recette actuelle de contact sans onde magique est compatible avec cette description. Ses valeurs numériques restent des choix de balance. [IllFonic / PlayStation](https://blog.playstation.com/2021/02/16/new-year-new-mode-new-content-for-predator-hunting-grounds/)
- **Witch :** sa propre description officielle expose des drones jetables de reconnaissance. L’arc appartient à l’arsenal général de PHG ; cela ne démontre pas que Witch dispose d’un collet tiré par arc, ni d’un pouvoir privant la cible de saut ou de camouflage. Ces effets actuels doivent rester annoncés comme adaptations. [Fiche Witch](https://store.playstation.com/en-us/product/UP3095-PPSA24179_00-PHGDLCWITCH00001), [arsenal général PHG](https://www.playstation.com/en-gb/games/predator-hunting-grounds/)
- **Falconer :** l’oiseau et les lames ont une référence de figurine sous licence. Le drone actuel inflige zéro dégât ; ses cycles de rappel et le blocage du camouflage après marquage restent des règles de duel. [NECA Falconer](https://store.necaonline.com/blogs/news/closer-look-predators-series-7-camo-cloaked-falconer-predator-action-figure)
- **City Hunter / Celtic :** les figurines présentent respectivement un lance-filet et un filet de reconstitution. Cela soutient leur représentation, pas les timings ou hitboxes de THE PIT. Le coup moyen de Celtic ne doit pas prétendre déployer le filet. [NECA City Hunter](https://store.necaonline.com/blogs/news/shipping-this-week-predator-2-ultimate-city-hunter-action-figure), [NECA Celtic](https://store.necaonline.com/blogs/tru-exclusives/complete-details-on-neca-s-fall-2016-toys-r-us-exclusive-action-figures)
- **Ahab :** lance, gantelet et Engineer Gun sont des accessoires d’Ultimate Ahab. Son profil actuel ne les emploie pas : il reste partagé. [NECA Ahab](https://store.necaonline.com/blogs/news/shipping-this-week-ultimate-ahab-ultimate-dream-sequence-jason-and-chucky-thanos-groot-head-knockers-1)
- **Scarface :** Maul et Spear Gun sont référencés dans la figurine de Concrete Jungle. Le contre actuel n’est pas démontré comme technique personnelle par cette source. [NECA Scarface](https://store.necaonline.com/blogs/behind-the-scenes/closer-look-video-game-appearance-ultimate-scarface-predator)
- **Enforcer :** personnage de Bad Blood identifié sous licence ; la page consultée ne nomme pas précisément ses accessoires. Ne pas inventer une arme ou une capacité parce qu’il « applique le Code ». [NECA Enforcer](https://store.necaonline.com/blogs/behind-the-scenes/closer-look-enforcer-predator-action-figure-from-series-12)
- **Greyback :** Golden Angel est la version du comic 1718, plus jeune que l’Elder de Predator 2. Possession d’un silex et disponibilité d’un tir sont différentes. Le kit courant garde ce silex et le canon inactifs. [NECA Elder / Golden Angel](https://store.necaonline.com/blogs/toy-fair/toy-fair-2018-day-2-reveals-action-figures-from-aliens-series-13-alien-vs-predator-arcade-more)
- **Warlord / Stone Heart :** la page officielle de Killer of Killers ne prouve pas la vague au sol du projet. La figurine Stone Heart décrit le cyborg et ses lames, pas une onde magique. Les recettes actuelles demeurent des adaptations de Chronique. [20th Century Studios](https://www.20thcenturystudios.com/movies/predator-killer-of-killers), [NECA Stone Heart](https://store.necaonline.com/products/predator-7-scale-action-figure-concrete-jungle-stone-heart-predator)
- **Samurai :** PHG lui associe explicitement le katana. Il ne doit pas être confondu avec Oni de Killer of Killers ; son profil importé reste partagé. [IllFonic / PlayStation](https://blog.playstation.com/?p=332767)
- **AVP Classic 2000 :** un vrai manuel décrit son arsenal et les contraintes de camouflage. Le kit n’est pas encore porté : le chasseur conserve le profil de contact partagé. La règle de ce jeu n’est pas transférable à tous les autres chasseurs. [Manuel Rebellion, pages imprimées 9–10](https://store.steampowered.com/manual/3730)
- **Big Red / Viper :** NECA décrit le premier comme issu du fan film Dead End et le second comme une création NECA. La présence de figurines sous licence ne les transforme pas en personnages des longs métrages/comics principaux. [Big Red](https://store.necaonline.com/blogs/news/closer-look-predators-series-7-big-red-predator-action-figure), [Viper](https://store.necaonline.com/blogs/news/174238279-action-figure-update-predators-series-12-line-up-is-changing)

Toutes les autres citations sont consultables dans `PIT_FIDELITY_SOURCES_V91`, avec une description distincte de ce qu’elles établissent et n’établissent pas. Les synopsis officiels confirment une œuvre/contexte ; ils ne remplacent pas une inspection film par film des gestes, armes et variantes.

## Camouflage : constat, pas suppression arbitraire

Theta et Machiko n’ont pas de `canCloak` explicite dans `pitRosterExpansion`. Le moteur leur autorise donc actuellement la ressource commune. Les sources confirment leur identité humaine, mais les descriptions consultées ne prouvent ni ne réfutent le matériel de camouflage propre aux images V28. L’interface doit indiquer que cette autorisation relève du gameplay et reste non certifiée, sans prétendre que ces humaines ne pourraient jamais utiliser cette technologie. [Marvel](https://www.marvel.com/comics/collection/110461/predator_the_last_hunt_trade_paperback), [Dark Horse](https://digital.darkhorse.com/books/9bb496a44e944fcda26662b44db247be/aliens-vs-predator-the-essential-comics-volume-1)

L’Amengi et les deux originaux ont déjà `canCloak:false`. Le démarrage est bloqué et le normalizer refuse les états camouflés pour ces profiles. Aucune nouvelle capacité n’est ajoutée.

Un simple ajout `canCloak:false` aux humaines ou aux 180 profiles fournis ne serait pas neutre : `validFighterState` rejette les vieux états actifs et les steppers historiques de replay relisent `PIT_FIGHTERS`. Une correction future d’équipement devra être versionnée, préserver les recipes historiques et expliciter ce qui arrive aux checkpoints actifs. Aucune migration destructrice n’est effectuée ici.

## Petit lot mécanique possible ensuite

Ces propositions sont **non intégrées** et ne sont pas des movesets attestés 1:1. Il faut un changement de moteur versionné, des règles par incarnation, une admission de sprites/armes animés et des tests de replay avant raccord.

| Candidat | Base démontrée | Adaptation limitée possible | À ne pas ajouter sans nouvelle preuve |
| --- | --- | --- | --- |
| Ahab | Lance de la figurine Ultimate | Estoc de contact à allonge supérieure, wind-up et recovery propres, aucune onde | Tir Engineer Gun / pouvoir de lance déduits du simple accessoire |
| Scarface | Maul de la figurine du jeu | Taille lourde physique et retour mesuré ; contre explicitement original | Explosion, magie ou retour autonome du Maul |
| Samurai PHG | Katana associé par le développeur | Trois tailles rapprochées et contre physique, sans projectile | Techniques d’Oni ou téléportation empruntées à une autre incarnation |
| Witch PHG | Drone jetable de repérage décrit par le développeur | Entité de reconnaissance à zéro dégât, durée/zone/rappel de duel signalés comme adaptations | Son collet actuel promu en capacité source, drone offensif ou anti-camouflage automatique non sourcés |
| Enforcer | Identité Bad Blood seulement dans le texte inspecté | Conserver le contre de contact explicitement adapté, en attendant les planches du comic | Nouvelle arme attribuée d’après son rôle de justicier |

Aucune portée chiffrée d’une source ne se convertit directement en pixels de ce duel. Les valeurs proposées devront être des choix de design, avec volumes de contact cohérents et aucune preuve canon fabriquée. Les avatars fournis d’Ahab et Samurai conservent aujourd’hui les gestes du profil partagé ; sans clips acceptés, un nouveau nom de coup ne suffirait pas.

## API et vérification

`getPitFidelityV91(id)` renvoie un dossier ou `null` pour un ID inconnu/hérité. `pitMoveLabelV91(id, slot, fallback)` fournit un libellé de présentation. `auditPitFidelityV91()` couvre le roster exact et déclare les limites. Ces fonctions n’écrivent rien dans les registries, états ou archives.

Les dix tests dédiés vérifient l’inventaire, les 180 profils identiques, les humaines/Amengi, l’entrée réelle de camouflage désactivée pour les trois originaux/invités et la reprise des états humains existants, les contacts réels près/loin sans projectile, le collet de Witch inchangé, les comportements réels de Stone Heart/Warlord, les scopes des sources, les origines fan film/NECA et la non-mutation des recipes/états sérialisés. Lint ciblé passé. Aucune validation de sprites ou QA navigateur n’est revendiquée.

Commande de reproduction : `node --test tests/pit-fidelity-v91.test.mjs`.

Inventaire privé, avec les 201 recipes et hashes des registries : `node scripts/audit-pit-fidelity-v91.mjs` produit `work-local/v91/qa/pit-fidelity-runtime.json`. Cette sortie ne rejoint pas la sélection, une sauvegarde, les images ou le manifeste de production.
