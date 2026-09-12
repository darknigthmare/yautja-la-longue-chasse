# V33 — véhicules et destriers : spécification de production

État au 12 septembre 2026 : **50 entrées demandées ; 49 planifiées et une moto originale en revue artistique. Aucun véhicule montable ni clip runtime nouveau livré.** Cette spécification ne remplace pas les fiches détaillées annoncées dans ChatGPT, qui restent indisponibles.

## Source, intégrité et limites

La discussion **« Ajout des véhicules Yautja »**, identifiant `6aa47c2d-c088-83eb-b65e-c82b918ee68d`, a été lue avec `read_thread`. Les deux tours accessibles sont complets ; la pagination retourne `hasMore=false` et `nextCursor=null`. Aucune réponse n'a été envoyée à cette discussion.

Le premier message propose le système ; le second suit l'accord utilisateur et fixe une liste de 50 entrées. L'archive privée, sur le disque C physique, est `work/v33-sources/vehicles-conversation.md` ; `vehicles-read-thread.json` conserve la réponse structurée sans le doublon d'aperçu. Ces fichiers sont exclus de Git par `/work/`. Les repères **S:ligne** ci-dessous renvoient à cette archive.

Le texte annonce un ZIP, un JSON, des prompts et des fiches comprenant dimensions, statistiques, animations et obtention. L'outil retourne **zéro pièce jointe** ; les sept marqueurs internes `chatgpt-content-reference` ne donnent pas de fichiers récupérables dans cette réponse. Le hash annoncé est conservé au manifeste, sans prétendre avoir vérifié ce ZIP. **Ni les dimensions complètes, ni une grille de sprites, ni les durées des animations ne sont connues.** Sources : S:1161–1179 et S:1336–1350.

Le manifeste public associé est [v33-vehicles-production-manifest.json](./v33-vehicles-production-manifest.json). Il distingue 30 entrées avec un peu de description ou une référence, et **20 entrées dont seul le nom est accessible**. Leurs statistiques et actions spécifiques restent vides ; un nom comme Thunder Fang n'autorise pas à inventer son armement.

## Inventaire exact adopté

Les intitulés ci-dessous reproduisent les 50 noms finaux, sans les remplacer par leurs anciens alias. Les 24 premiers sont des véhicules de clan/utilitaires, les numéros 25–34 couvrent Bad Blood/Enforcer et les numéros 35–50 des destriers biologiques.

| N° | Intitulé demandé | Détail récupéré | Source |
| --- | --- | --- | --- |
| 1 | Blade Fighter K-93 | Description partielle | S:1102 |
| 2 | Blade Fighter Viper | Référence seulement | S:1103 |
| 3 | Moto antigrav de clan | Description partielle | S:1104 |
| 4 | Moto antigrav de chasse | Description partielle | S:1105 |
| 5 | Grav-Sled éclaireur | Description partielle | S:1106 |
| 6 | Hunter Speeder | Description partielle | S:1107 |
| 7 | Thunder Fang | Nom seul | S:1108 |
| 8 | Skimmer des dunes | Description partielle | S:1109 |
| 9 | Skimmer des marais | Nom seul | S:1110 |
| 10 | Skimmer cryo | Nom seul | S:1111 |
| 11 | Jungle Strider | Description partielle | S:1112 |
| 12 | Cliff Crawler | Description partielle | S:1113 |
| 13 | Burrower Rig | Nom seul | S:1114 |
| 14 | River Manta | Nom seul | S:1115 |
| 15 | Canopy Glider | Nom seul | S:1116 |
| 16 | Skiff de déploiement | Description partielle | S:1117 |
| 17 | War Skiff | Description partielle | S:1118 |
| 18 | Crawler de siège | Nom seul | S:1119 |
| 19 | Trophy Carrier | Description partielle | S:1120 |
| 20 | Grand Trophy Hauler | Description partielle | S:1121 |
| 21 | Forge mobile de clan | Nom seul | S:1122 |
| 22 | Medivac Scarab | Nom seul | S:1123 |
| 23 | Capsule Drop Spear | Nom seul | S:1124 |
| 24 | Sphère d’éjection atmosphérique | Nom seul | S:1125 |
| 25 | Blood Runner | Description partielle | S:1129 |
| 26 | Bone Grinder | Nom seul | S:1130 |
| 27 | Scavenger Raider | Nom seul | S:1131 |
| 28 | Sled du voleur de trophées | Nom seul | S:1132 |
| 29 | Moto de poursuite Enforcer | Description partielle | S:1133 |
| 30 | Interceptor Enforcer | Description partielle | S:1134 |
| 31 | Skiff-prison Enforcer | Description partielle | S:1135 |
| 32 | Chariot de l’Arbitre | Description partielle | S:1136 |
| 33 | Sled-drone pisteur | Description partielle | S:1137 |
| 34 | Porte-barricade Enforcer | Description partielle | S:1138 |
| 35 | Kha’Rha | Description partielle | S:1142 |
| 36 | Kha’Rha de guerre | Description partielle | S:1143 |
| 37 | Forest Stalker | Description partielle | S:1144 |
| 38 | Sand Mauler | Description partielle | S:1145 |
| 39 | Stoneback | Description partielle | S:1146 |
| 40 | Ice Fang | Description partielle | S:1147 |
| 41 | Swamp Strider | Description partielle | S:1148 |
| 42 | Night Stalker | Description partielle | S:1149 |
| 43 | Blood Beast | Description partielle | S:1150 |
| 44 | Grande Bête des Elders | Description partielle | S:1151 |
| 45 | Bone-Bison de guerre | Nom seul | S:1152 |
| 46 | Razorwing | Nom seul | S:1153 |
| 47 | Cliff Leaper | Nom seul | S:1154 |
| 48 | Burrow Wyrm | Nom seul | S:1155 |
| 49 | Ash Horn | Nom seul | S:1156 |
| 50 | Storm Runner | Nom seul | S:1157 |

Le brouillon initial contient aussi **Hover Bike « Clan Lord »**, **Kenner Legacy Skin** et **Cargo Sled**. Ne pas perdre ces demandes : Clan Lord est une variante lourde à relier explicitement à la Moto antigrav de clan ; Kenner Legacy est une silhouette/proportion/couleur spécifique, pas un recoloriage ; Cargo Sled reste un alias ou un besoin non résolu, pas un 51e véhicule confirmé. Sources : S:106–188, S:1046–1076.

## Références établies et inventions à signaler

- **Blade Fighter K-93 / Viper : références de produits sous licence.** NECA décrit son Blade Fighter comme un hommage au modèle Kenner de 1993 et confirme cockpit articulé, canons, projectile, lames et stockage. NECA associe aussi son personnage original Viper au véhicule. Cela ne transforme pas les jouets en véhicules du canon cinématographique, et les dimensions des figurines ne sont pas des mètres diégétiques. Les noms K-93/Viper, l'équilibrage, les quêtes, la capture et la destruction du jeu restent des adaptations. [NECA Blade Fighter](https://necaonline.com/2014/12/closer-look-predator-blade-fighter-vehicle-and-packaging/), [NECA Viper](https://necaonline.com/2014/09/closer-look-viper-predator-action-figure-series-12/).
- **Motos et éjection Badlands : références primaires identifiées, fidélité visuelle à verrouiller.** Le portfolio du concept artist Mat Hunkin contient des planches intitulées Hoverbikes Concept, Hoverbikes Views, EjectorSeat et EjectSequence, sous sa rubrique du film. Ce sont des documents WIP : comparer leurs détails à la version finale avant de qualifier un modèle de fidèle 1:1. Leur contenu image n'a pas encore pu être inspecté dans cette extraction. La forme exacte de la « sphère », les deux classes de moto et leurs pouvoirs de jeu ne sont pas validés par la simple présence de ces intitulés. [Mat Hunkin](https://www.mathunkin.com/), [page officielle et bandes-annonces](https://www.20thcenturystudios.com/movies/predator-badlands).
- **Bone-Bison de guerre : référence biologique à séparer de l'usage inventé.** Un design de production Bone Bison est publié sous le nom du concepteur Jerad S. Marantz. Cela ne prouve pas un dressage, une selle ni un emploi militaire Yautja ; ces éléments restent une création du jeu. [Design Bone Bison](https://jsmarantz.artstation.com/projects/NqOo21).
- **Kha’Rha, autres destriers et variantes supplémentaires : créations de jeu jusqu'à preuve précise.** Le chat demande explicitement des concepts originaux inspirés de l'imagerie de fans, sans reprise exacte d'un dessin/artiste ni prétention de canon. Les comportements culturels proposés, montures cérémonielles, BOND et Feral Gauge sont des règles de La Longue Chasse. Ne pas les présenter comme des faits établis de la franchise. Sources : S:20–23, S:472–714, S:1159.
- Un canon de référence n'autorise pas à recycler une image officielle comme sprite distribué. Générer les bitmaps du projet avec leur provenance OpenAI, puis contrôler la fidélité aux références sélectionnées.

## Animations et vues réellement demandées

Le chat n'impose **aucun nombre de planches par véhicule**, aucune résolution et aucune grille. La règle des dix planches mentionnée pour les chasseurs ne doit pas devenir silencieusement un engagement de 500 planches véhicules. Les actions suivantes sont présentes dans la source ; elles n'ont pas toutes un découpage d'animation livré.

| Famille ou véhicule | Actions explicitement attendues | Source |
| --- | --- | --- |
| Moto de chasse | Accélération, boost, freinage, dérapage, saut/Grav Leap, maintien bref en l'air, camouflage court, rappel autonome, tir monté, demi-tour 180°, saut-démontage offensif | S:47–104, S:1198–1211 |
| Attaques montées moto | Plasma Caster, Smart Disc, lance, arc énergétique, pistolet plasma, filet, projectiles de poignet ; restrictions sur certaines armes à deux mains ; Predator Drive-By et Trophy Pass | S:78–104 |
| Blade Fighter K-93 | Déplacement antigravité/latéral, dash/esquive, canons, missile, verrouillage, mâchoire de capture, éperonnage de VEHICLE_BREAK_2, vol stationnaire court | S:133–188, S:1181–1196 |
| Skimmer des dunes | Traversée rapide sur 10–20 écrans, poussières en plusieurs couches de parallaxe | S:411–433 |
| Jungle Strider / Cliff Crawler | Marche mécanique, saut/franchissement ; six pattes et déplacement sur murs/plafonds pour Cliff Crawler | S:435–470 |
| Transports | Déploiement/débarquement du Skiff ; arrivée, fixation visible de la charge et départ du Trophy Hauler ; transport de proies/cages | S:289–392, S:1314–1324 |
| Kha’Rha | Course, saut/bond long, charge montée à la lance, griffes/morsure, escalade légère, rugissement, pistage, rappel, protection du cavalier | S:484–525, S:1213–1225 |
| Montures spécialisées | Course sur branches/bonds/grimpe/suspension ; course sur sable et détection souterraine ; charge brisant des portes ; course sur glace/neige/escalade ; marche amphibie | S:527–657 |
| Montures et soin | Chromatophores imparfaits, agressivité/attaque du maître, arrivée cérémonielle, boiterie, fatigue, peur/stress et soins Medicomp | S:659–786 |

Le terrain est explicitement **2D**, avec déplacements horizontaux et séquences verticales. Aucune vue isométrique, arrière, cockpit jouable ou rotation 3D n'est prescrite. Le catalogue spatial historique dispose d'autres contraintes de vues : ne pas les copier automatiquement ici.

Contrat proposé pour l'intégration, distinct d'une citation du chat :

1. Fixer une vue latérale de jeu avec gauche et droite dessinées séparément, une échelle comparée au Yautja et des points d'appui stables. Une planche de présentation sert à vérifier l'identité ; elle ne compte jamais comme animation.
2. Séparer châssis/créature, cavalier, selles/armes, trophées, ombre de contact et effets. Prévoir les points d'ancrage et l'ordre d'occlusion des membres pour éviter un pilote flottant, une main au mauvais endroit ou un membre traversant la selle.
3. Pour chaque action acceptée, livrer vrais dessins distincts, rectangles, pivots et durées en ticks. Aucune interpolation CSS, déformation de dessin ou simple translation ne doit être comptée comme une nouvelle animation.
4. Conserver l'alpha réel ou déclarer explicitement le color-key. Contrôler fond, halos, mains, membres, pièces mécaniques, orientation des armes, taille et continuité des appuis à chaque génération.
5. Maintenir séparément l'état de production et l'état runtime. Un catalogue, prompt, concept, PNG ou clip partiel ne valide pas à lui seul un véhicule complet.

## Interfaces et systèmes à construire

**Accès et persistance.** Appel de certaines montures, découverte sur les cartes, embarquement dans le vaisseau, location/achat, fabrication/amélioration, vol temporaire, capture/dressage, dommage/perte, combat monté, saut en marche, abandon et récupération ultérieure sont demandés. Le véhicule reste stationné, suit par une route accessible, retourne au vaisseau ou devient géographiquement inaccessible : aucune disparition arbitraire. Sources : S:25–45, S:1261.

**Hunter Vehicle Bay physique.** Emplacement petite/moyenne machine, place de monture, zone médicale, établi de réparation, râtelier, crochets à trophées, terminal de rappel, rampe. Les machines géantes restent dans un hangar de clan. Le hub doit réellement représenter ce qui est embarqué. Sources : S:788–815, S:1263–1276.

**Yautja Prime.** Forge District Garage : machines, noyaux antigrav, armes/blindages, réparation, courses et convoyage. Beastmaster Quarter : élevage, nourriture, soins, selles/lignées, BOND, tournois, quêtes de montures. Sources : S:817–850, S:1280–1286.

**Personnalisation modulaire.** Châssis, moteur, armure, armes, supports de trophées, gravures de clan, dégâts de bataille, marques de victoire, os/crânes, filets, cuir et ornements. Les trophées ont des attaches visibles sur guidon, garde-boue, selle, flanc et arrière. Sources : S:852–913.

**HUD monture.** Endurance, fatigue, peur, stress, blessures, BOND 0–100 ; Kha’Rha débloque rappel fiable à 25, esquive assistée à 50, protection à 75, compétence combinée à 100. Blood Beast utilise une Feral Gauge ; Sand Mauler signale vibrations/danger souterrain. La source ne fournit pas de maquette d'interface ni de barèmes complets. Sources : S:575–595, S:677–698, S:742–786, S:1225.

**Capture et dressage.** Espèce TAMABLE : découverte, observation, appât, affaiblissement non létal, immobilisation, mini-jeu de domination, retour et entraînement. Certaines espèces restent indomesticables. Sources : S:716–740.

**Level design et carte.** Le dernier message fixe cinq chemins : FOOT, MOUNT, VEHICLE, HEAVY, SPECIAL. Le brouillon à trois chemins est donc dépassé. Les véhicules ouvrent une couche d'exploration sans contourner tunnels, conduits, portes et capacités Metroidvania. La carte annonce VEHICLE RECOMMENDED / MOUNT RECOMMENDED ; les tailles comme « 18 km » restent des exemples de design, pas une durée ou distance livrée. Sources : S:915–986, S:1227–1261.

**Poursuite et alignement.** Paliers : drone pisteur, motos, barrages/filets, Interceptor, Skiff-prison, Chariot de l'Arbitre. Dépassement, coupure de route, blocage de boost, barricades et renfort lourd ; Bad Blood avec mines, fausses cargaisons, brouillage, vol et autodestruction de diversion. Sources : S:222–287, S:1288–1312.

**Transport de trophées.** Petit porté, moyen Carrier, lourd Stoneback/carrier amélioré, colossal Hauler, vivant cage spécialisée. Charge visible, poids/maniabilité modifiés, transfert matériel au Trophy Hall. Sources : S:289–349, S:1314–1324.

**Boss, contrats et progression.** Bad Blood Rider, Clan Champion, Beastmaster, Enforcer Captain, Ancient Rider. Contrats THE LONG ROAD, NO GROUND BENEATH US, THE FIRST RIDE, BLOOD ON THE SADDLE, CLAN CIRCUIT, BAD BLOOD HIGHWAY, THE GREAT HERD, TROPHY TOO LARGE. Quatre branches : TECHNOLOGICAL, TRADITIONAL, UTILITY, OUTLAW. Sources : S:988–1076.

## Premier véhicule à produire avec OpenAI

**Priorité 1 : Moto antigrav de chasse**, conformément à l'ordre explicite final, puis Blade Fighter K-93 et Kha’Rha. Le but de la première tranche jouable est vitesse, saut, caméra et poursuite. Les deux suivantes éprouvent respectivement capture/destruction/armes puis endurance/peur/BOND/soin. Les 47 autres réemploient ensuite ces systèmes de données. Source : S:1326–1334.

Premier livrable d'art proposé : **fiche d'identité latérale gauche/droite de la moto vide**, à échelle Yautja constante, suivie du pilote modulaire. Avant génération, choisir avec root les références Badlands, comparer concepts WIP et film, puis fixer la variante visuelle. Première animation ensuite : vol stationnaire distinct, accélération/roulage, freinage ; le découpage et le nombre de dessins seront explicites après référence, pas inventés ici.

Repères de référence disponibles sur le portfolio [Mat Hunkin](https://www.mathunkin.com/) :

- `000_Art_Hoverbikes_EXT_Concept2_WIP_07_240418.jpg`
- `000_Art_Hoverbikes_EXT_Views_WIP_08_240423.jpg`
- `000_Art_EjectorSeat_EXT_v11LocationConceptAngle2_WIP_240429.jpg`
- `000_Art_KwesInterior_INT_CockpitConcept_v2c_EjectSequence_240503.jpg`

Un lot concret de moto originale a été généré : 6 PNG sources, dont 4 versions de revue publique (identité deux vues et deux propositions de stabilisateurs) et 2 brouillons rejetés. La seconde proposition de stabilisateurs contient huit dessins découpés individuellement : quatre vers la droite, quatre vers la gauche, avec pivots et durées de revue. Le lecteur V33 les affiche sans modifier les PNG originaux. Les pages primaires NECA retournant 403, le repli autorisé a été utilisé sans revendication 1:1. Les références de film restent à verrouiller pour un futur modèle fidèle. Les huit poses restent authored-review : mécanisme avant/repose-pied et marges à reprendre ; zéro clip runtime accepté. Voir art-source/v33/vehicles/moto-antigrav-chasse-provenance-v33.json.

## État du dépôt observé

`app/game/shipCatalogue.ts:334` contient déjà Blade Fighter en annexe de produits dérivés, non interstellaire ; `tests/ship-catalogue.test.mjs:304` contrôle notamment que les auxiliaires ne deviennent pas des coques sélectionnables. Cette entrée **ne prouve pas** un véhicule montable, son garage ou ses animations.

La recherche ciblée dans `app/game`, `tests` et `docs` n'a pas révélé un système existant dédié aux 50 véhicules. Ne pas supprimer ni convertir l'annexe spatiale : le futur système de conduite pourra la relier via un identifiant explicite. Le présent lot ajoute ce document, le manifeste de production, l'archive privée et les sources réelles de la moto en revue artistique ; aucun véhicule montable n'est déclaré terminé.

## Contrôles avant de compter une entrée terminée

- Référence ou création originale clairement indiquée ; silhouette/échelle/équipement validés.
- Vrais fichiers générés disponibles avec provenance ; transparence, pivots, timings et orientations testés.
- Monter, conduire, descendre, stationner et rappeler sans téléportation incohérente.
- Largeurs/obstacles/biomes et caméra compatibles ; aucun contournement des portes Metroidvania.
- Dommages, sauvegarde, charge visible, garage/écurie et interfaces connectés.
- Actions promises présentes, ou couverture partielle nommée précisément.
- Recette visuelle et gameplay dans le vrai moteur, pas seulement validation d'un JSON.


### Contrôle complémentaire de la moto

Le second dessin des stabilisateurs améliore les supports visibles et le repli mécanique. Les huit rectangles sont explicites, car la grille théorique ne suffit pas. Le détourage en mémoire laisse encore 81 pixels de frange magenta ; la continuité mécanique doit être validée avant utilisation en jeu. Cette planche reste `authored-review`, avec zéro clip de conduite accepté. Le lecteur est disponible dans l’Atelier OpenAI V33 du laboratoire THE PIT.

### Propulsion indépendante

Une planche supplémentaire de huit dessins OpenAI isole la propulsion verte de la moto : quatre émissions de chaque côté. Son alpha natif est contrôlé, avec un maximum de2/255 sur les bords des cellules. Le lecteur aligne les cœurs lumineux pour examiner la continuité sans déplacer artificiellement un dessin unique. Ce sont des dessins de VFX en revue, pas une conduite ou une accélération jouable. Source : `art-source/v33/vehicles/moto-propulsion-fx-provenance-v33.json`.
