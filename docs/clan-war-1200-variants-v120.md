# Guerre des clans — Catalogue V120 : 1 200 variantes de missions

## Livraison effective

Le catalogue source est \`app/game/systems/clanWarVariantsV120.ts\`. L'interface est \`app/game/ClanWarVariantCatalogV120.tsx\` dans **Bible V6 → 1 200 variantes · 4 × 300**. La sortie revue par CI est \`scripts/export-clan-war-v120.mjs\`, avec des exports UTF-8 CSV français (séparateur \`;\`, 40 champs, protection contre l'injection de formules) et JSON versionné. Il n'y a **aucune table distincte à maintenir** : UI, tests et export lisent le même constructeur.

| Gameplay | 100 originales | 100 Yautja compatibles | 100 clins d’œil | Total |
| --- | ---: | ---: | ---: | ---: |
| Assaut latéral (AP / bastions) | 100 | 100 | 100 | 300 |
| Mandats délégués Outer Ops (ordres / rapports) | 100 | 100 | 100 | 300 |
| Infiltration / sabotage | 100 | 100 | 100 | 300 |
| Guerre totale RTS | 100 | 100 | 100 | 300 |
| **Total** | **400** | **400** | **400** | **1 200** |

Chaque fiche possède un identifiant et un \`mapKey\` uniques ; une localisation d'exercice distincte ; un monde, une région, un biome, une géométrie, une matière de sol et une zone liquide ; météo, lumière, atmosphère et palette ; objectif, complication et secondaire ; interaction, type de riposte, seuil de difficulté, conditions de perte et retrait ; effet stratégique **prévisionnel** ; unités, besoins graphiques, durée cible et source d'inspiration. La diversité provient d'un ensemble éditorial de **25 mondes extraterrestres** avec quatre secteurs chacun, **25 motifs de clan** dans quatre sous-secteurs, et **100 ancrages de lieux connus** réinterprétés en secteurs distincts par gameplay. Les objectifs ont **25 fiches de mécanique par gameplay** avec quatre profils opérationnels et événements divers.

### Exemples de diversité (titres et missions générés)

| Famille | Exemple | Traitement |
| --- | --- | --- |
| Original | Atoll cobalt, rempart mobile | Attaque AP sur deux axes au-dessus d'une lagune saline |
| Original | Grotte organique, gaine silencieuse | Traversée à camouflage limité et extraction avant contraction |
| Original | Volcan sous-glaciaire, transit logistique | Outer Ops avec rapports et risque de voie gelée |
| Lore compatible | Réseau de camouflage d'un clan, sas défensif | Défendre les capteurs en limitant les dégâts secondaires |
| Lore compatible | Atelier de masques, couloir aveugle | Preuve d'un lot défectueux et récupération clandestine |
| Lore compatible | Quarantaine xénomorphe (continuité AVP) | Éviter toute dissémination ; pas de cross-canon automatique |
| Clin d’œil | Jungle de Predator 1987 → forêt recréée sur un monde-écho | Silhouettes végétales inspirées, pas de reconstitution prétendument canonique |
| Clin d’œil | Los Angeles de Predator 2 → passerelles de métropole | Lignes de toit et chaleur urbaine dans une mission inédite |
| Clin d’œil | Pyramide antarctique d'AVP → salles sous la glace | Énigmes géométriques évoquées sans recopier la scène de film |
| Clin d’œil | Machu Picchu → terrasses de falaise | Architecture de haute montagne réinterprétée |
| Clin d’œil | Salar de Uyuni → plan miroir | Reflets et aveuglement thermique au service d'un nouveau conflit |
| Clin d’œil | Shadow Moses de Metal Gear → base polaire d'exercice | Clin d’œil architectural, pas de crossover officiel |

Les 100 inspirations se répartissent volontairement entre **20 environnements de cinéma/franchise**, **20 sites historiques/patrimoniaux**, **20 paysages naturels**, **20 zones urbaines/industrielles** et **20 lieux emblématiques de jeux ou de fiction**. Une même inspiration donne lieu à un secteur distinct selon le gameplay (une rampe de bataille, un itinéraire Outer Ops, un conduit furtif ou un front RTS). Les noms des œuvres restent attribués comme inspirations et les missions correspondantes sont entièrement inédites.

## Cohérence Yautja et traçabilité

**Les missions classées "lore-compatible" sont inventées.** Elles se servent de thèmes visibles dans les œuvres — masques, technologie d'occultation, vaisseaux, trophées, rites, alliances, clans — en distinguant le lore attesté, les comics/jeux et les interprétations internes à la Bible V6. Le code de la chasse n'est pas appliqué comme loi canonique universelle : les films, les comics et les jeux peuvent en montrer des interprétations distinctes. Une rivalité fictive ne devient pas un événement daté de la chronologie de 1987 ou de 2025.

Sources officielles utilisées pour ancrer **quelques** inspirations, et non pour légitimer toutes les missions :
- Jungle et camouflage de \`Predator\` : https://www.20thcenturystudios.com/movies/predator/
- Métropole de \`Predator 2\` : https://www.20thcenturystudios.com/movies/predator-2
- Grandes Plaines de \`Prey\` : https://www.20thcenturystudios.com/movies/prey
- Pyramide sous glace de \`Alien vs. Predator\` : https://www.20thcenturystudios.com/movies/alien-vs-predator
- Planète de chasse de \`Predators\` : https://www.20thcenturystudios.com/movies/predators
- Monde reculé de \`Predator: Badlands\` : https://www.20thcenturystudios.com/movies/predator-badlands

Les autres lieux du catalogue ne sont **ni de nouvelles apparitions canoniques ni une preuve qu'un Yautja les aurait visités**. Les crédits sont des aides pour la direction artistique ; ne pas reproduire à l'identique des éléments protégés par une autre franchise.

## Raccordement aux quatre vrais gameplays

Le catalogue de conception **n'exécute pas** les 1 200 missions : il prépare les règles de leur développement. L'assaut latéral V115 possède déjà ses AP, détachements et bastions ; l'Outer Ops V115 connaît l'affectation, les délais et les rapports ; l'infiltration V115/V116 possède le camouflage, l'alarme et une géométrie d'exercice ; le RTS V115/V119 connaît les déplacements, la riposte, les charges et les scénarios W3. Il ne suffit pas de charger le titre V120 pour obtenir tous les objets, personnages, scènes, effets de terrain et scripts d'une nouvelle mission.

Pour faire passer une fiche de **\`design-only\`** à **\`playable\`**, l'implémentation devra vérifier séparément : scène et collisions (coupe ou vue de dessus), variantes d'environnement, unités/rangs/équipements réellement disponibles, route et reprise des sauvegardes, comportement ennemi, déroulé des objectifs et effets réels, identifiant de résultat idempotent, pertes et extraction, performances et tests de fidélité par référence. **Aucun compteur de progression, récompense de campagne ou territoire ne doit être créé à partir du seul catalogue.**

Le futur générateur de planètes devra convertir les descripteurs texte (terrain, liquide, biomes, géométrie) vers des **identifiants d'assets effectivement présents** et des paramètres de surface. Ne pas prétendre que les 25 matières figurent déjà dans des PNG de production. Les mondes-échos, mondes originaux et régions de clan resteront distincts des 30 planètes militaires actuellement simulées tant qu'une migration explicite des identifiants n'aura pas été réalisée.

## Audit et contrôle qualité

Le test \`tests/clan-war-variants-v120.test.mjs\` valide le total 4 × 3 × 100, 1 200 identifiants/titres/sites/objectifs uniques, 100 références de lieux, variété des biomes/géométries/météos, les quatre mécaniques distinctes, le statut non canonique et la stabilité des exports. Le workflow \`.github/workflows/clan-war-v120.yml\` produit une archive de revue contenant JSON, CSV et rapport d'audit, sans écrire dans la sauvegarde principale.

**Statut artistique et produit :** 1 200 variantes spécifiées, générées et navigables ; scènes 1:1, sprites indépendants, animations, IA de campagne, géométries procédurales réelles et tests en navigateur sur 1 200 niveaux : **à développer**. Ne pas les marquer réalisés dans l'Excel de production.
