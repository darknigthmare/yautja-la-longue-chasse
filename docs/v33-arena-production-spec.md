# THE PIT — production des arènes V33

## Livraison effectivement vérifiée

Le premier kit THE PIT est intégré : **17 sous-plans, 22 PNG OpenAI revus, une boucle de flamme à 6 dessins**. Le harnais Chromium a chargé les 22 images, dessiné les six plans et les deux combattants sur huit cadrages/options puis sur écran étroit, sans erreur réseau/JavaScript ni modification du combat ou de la caméra. La navigation réelle jusqu'à l'entraînement valide également les 22 images dans l'application complète. Preuves : `docs/v33-arena-art-review.md`, `docs/v33-arena-renderer-qa.json` et `docs/v33-the-pit-fullapp-qa.json`.

Le second kit, Hall des Trophées, est intégré avec **14 nouvelles images fixes originales**, vitrines et trophées séparés. Les supports suivent verticalement le sol réel tout en conservant leur profondeur horizontale. La recette complète valide 14 sous-plans et 14 images chargées sans erreur. Preuves : `docs/v33-trophy-hall-art-review.md`, `docs/v33-trophy-hall-renderer-qa.json` et `docs/v33-trophy-hall-fullapp-qa.json`. Le total effectivement produit et intégré est de **31 sous-plans et 36 images pour 2 kits** ; aucune animation de décor n'est annoncée pour le Hall.

Les 98 autres fiches ont chacune leurs six cibles de plans, avec sous-plans détaillés encore non confirmés. Cette structure n'est pas comptée comme 98 décors livrés. Les 8 arènes existantes restent jouables, les 92 autres concepts restent non jouables.

## État de la source

Le catalogue local contient exactement 100 fiches : 20 fondations lore, 30 extensions originales, 10 études de composition patrimoniales, 20 lieux de La Longue Chasse et 20 arènes de duel pur. Les huit premières sont jouables ; les 92 autres restent des concepts. La V32 a livré six passes bitmap sur les huit arènes existantes, à partir d’images du projet réutilisées.

La conversation dédiée aux 100 arènes est en cours de récupération. Les valeurs ci-dessous proviennent du **catalogue local**, pas d’une transcription intégrale certifiée. Aucun détail manquant de sous-plan ou d’animation n’est présenté comme une exigence retrouvée. La proposition détaillée du premier stage reste explicitement provisoire jusqu’au rapprochement de cette conversation.

Sources inspectées : `app/game/systems/pitArenaCatalogue.ts`, `app/game/systems/pitFirstEdition.ts`, `app/game/pitArenaRendering.ts`, `docs/chatgpt-v32-delivery.md`, `docs/chatgpt-yautja-backlog-2026-09-04.md` et les quatre partages archivés dans `tmp/chatgpt-audit-2026-09-08`. Les quatre partages ne fournissent pas la liste détaillée des sous-plans des cent stages.

## Contrat des plans retrouvé dans le catalogue

| Plan | Rôle inscrit | Facteur inscrit | Règle de production/runtime |
|---|---|---:|---|
| P0 | Ciel ou profondeur atmosphérique | 0,05 | Panorama indépendant, aucune silhouette de combattant ni sol de contact peint dedans. |
| P1 | Silhouettes et repères lointains | 0,12 | Repères lointains alpha distincts du panorama. |
| P2 | Architecture de fond | 0,24 | Architecture séparée ; portes et modules démontables ont chacun leur image. |
| P3 | Activité médiane et public | 0,43 | Public, trophées, machines et luminaires exportés séparément ; aucun personnage générique compté comme animation produite. |
| P4 | Sol de combat, ruptures et props actifs | 0,78 | **Le sol de contact suit le facteur 1 dans le runtime** pour garder les pieds et collisions alignés. Le facteur décoratif 0,78 peut concerner un sous-plan arrière du ring. |
| P5 | Avant-plan occultant avec fondu de lisibilité | 1,08 | Accessoires alpha séparés, effacement devant les combattants et les signaux d’attaque. |

Les cinq familles appliquent les règles de transition suivantes : déclenchement après rupture ou projection confirmée, déplacement conjoint des deux combattants, aucune transition provoquée par un coup bloqué. Les dangers sont neutralisés en compétition et ne sont activés en Arcade/campagne que par une règle explicite. Ces règles sont actuellement des **contrats de production**, pas une implémentation des 92 stages.

Les dix études patrimoniales restent des études de composition : une image ou un fichier d’un jeu tiers ne devient pas un asset du projet. Les dessins de la livraison V33 sont à produire avec OpenAI et à contrôler séparément.

## Manifeste de production persistant

Manifeste versionné : `art-source/v33/pit-arenas/production-manifest.json`.

Chaque stage conserve son identifiant stable, son numéro, son nom local, son lieu, sa vague, son éventuel identifiant déjà jouable, la référence exacte de conversation lorsqu’elle aura été retrouvée, six plans et leurs fichiers indépendants. Un fichier de sous-plan ne doit appartenir qu’à un stage/plan/sous-plan.

Une image n’est pas une preuve de jouabilité et une description de clip n’est pas une animation. Les statuts de fichier sont séparés :

| Statut | Preuve minimale |
|---|---|
| `planned` | Emplacement et brief seulement ; aucun fichier livré annoncé. |
| `generated` | Fichier réellement présent, dimensions, SHA-256 et provenance de génération. |
| `reviewed` | Preuves précédentes, inspection visuelle du cadrage, de la perspective, des contours alpha, de l’identité, des raccords et des zones de lecture. |
| `integrated` | Preuves précédentes, branchement runtime explicite, recette de chargement dans l'application complète et contrôle visuel des deux coins et de plusieurs cadrages avec le renderer et les combattants réels. |

Une animation exige en plus ses images distinctes, leur ordre, leurs durées, leur pivot constant et une revue de lecture en mouvement. Les effets lumineux doivent avoir un mode mouvement réduit. Les sections non retrouvées dans la conversation conservent `sourceConfirmation: "pending-dedicated-conversation"` et ne déclenchent pas de génération massive.

Les fichiers nouveaux sont dédiés à leur scène sous `/game/sprites/v33/pit-arenas/<stage-id>/`. Les images V32 réutilisées restent référencées comme héritage ; elles ne font pas avancer la couverture de la nouvelle commande OpenAI.

## Premier brief provisoire : Cercle de basalte (`the-pit`)

Lieu déjà inscrit dans le jeu : **Système Cinder · annexe orbitale du Cercle**. L’arène est donc intérieure : voûte et dispositifs orbitaux, sans volcan extérieur placé arbitrairement derrière le ring. Architecture Yautja originale du projet ; basaltes noirs, bronze patiné, éclairage ambré limité. Vue latérale de jeu de combat, axes verticaux cohérents et aucune perspective plongeante sur le sol.

Cadre de référence : 960 × 540 unités ; contact des pieds à `y = 430` ; murs physiques à `x = 54` et `x = 906`. Les coordonnées suivantes décrivent la composition, sans créer de collision. Le couloir de lecture `x = 90..870, y = 180..450` doit rester contrasté et peu chargé. Les zones de HUD `y = 0..82` ne portent aucun sujet indispensable.

Tous les modules sauf le fond atmosphérique sont livrés avec alpha réel. Un damier peint, un rectangle opaque ou une clé chromatique résiduelle échoue à la revue. Aucun combattant, texte, logo ou interface n’est imprimé dans les décors. Les contours complets et les marges de sécurité sont conservés ; les fichiers ne se superposent pas dans une même planche de génération.

| Sous-plan proposé | Fichier indépendant nominal | Zone nominale 960×540 | Pivot/contact | Contours et raccords |
|---|---|---|---|---|
| P0.a profondeur de voûte | `p0-a-vault-depth.png` | [-160,-100,1280,700] | centre [480,250] | Panorama opaque sans portes, piliers proches, public ou sol ; débord de caméra. |
| P0.b brume orbitale diffuse | `p0-b-vault-haze.png` | [-160,-100,1280,650] | centre [480,225] | Alpha doux, faible contraste ; aucune alternance lumineuse rapide. |
| P1.a galerie lointaine gauche | `p1-a-gallery-left.png` | [0,90,280,330] | base [140,420] | Silhouette autonome, contour alpha ; centre de scène dégagé. |
| P1.b galerie lointaine droite | `p1-b-gallery-right.png` | [680,90,280,330] | base [820,420] | Dessin autonome de l’autre côté, raccord architectural cohérent. |
| P2.a pilier rituel gauche | `p2-a-ritual-pillar-left.png` | [-35,70,170,365] | base [50,435] | Volume complet, sans brasero fusionné ni sol peint autour. |
| P2.b pilier rituel droit | `p2-b-ritual-pillar-right.png` | [825,70,170,365] | base [910,435] | Pièce indépendante, patine et asymétrie intentionnelles. |
| P2.c porte de service fermée | `p2-c-service-door-frame.png` | [385,105,190,320] | base [480,425] | Cadre ouvert au centre ; vantail dans un fichier distinct. |
| P2.d vantail de service | `p2-d-service-door-leaf-v2.png` | [415,160,130,255] | base [480,415] | Contour fermé et complet ; glissière hors passage de combat. |
| P3.a support brasero gauche | `p3-a-brazier-left.png` | [148,352,116,76] | base [206,428] | Support solide séparé de la flamme. |
| P3.b support brasero droit | `p3-b-brazier-right.png` | [696,352,116,76] | base [754,428] | Module autonome ; taille similaire au brasero gauche. |
| P3.c flamme brasero | `p3-c-brazier-flame-f00..f05.png` | [168,324,76,62] et [716,324,76,62] | [38,60] dans chaque cellule | Six dessins reçus et revus ; fenêtre source commune, 8 images/seconde ; un dessin tenu en mouvement réduit. |
| P3.d trophée cérémoniel | `p3-d-ceremonial-trophy.png` | [446,135,68,100] | attache [480,135] | Trophée original propre au stage, sans membre ou accessoire d’un combattant nommé. |
| P4.a arrière du ring | `p4-a-ring-rear-fascia.png` | [-180,411,1320,32] | ligne [0,430] | Sous-plan décoratif autorisé à 0,78, hors surface de contact. |
| P4.b dalle de contact | `p4-b-basalt-floor-tile.png` | répétition horizontale, y=430 | bord haut [0,0] | Bord supérieur plat ; raccord gauche/droite contrôlé ; facteur 1 ; aucune faille modifiant la collision. |
| P4.c façade sous le ring | `p4-c-ring-front-fascia.png` | [-180,447,1320,160] | bord haut [0,447] | Façade indépendante de la dalle, matière et lumière cohérentes. |
| P5.a chaîne et montant gauche | `p5-a-chain-left.png` | [-72,58,120,492] | base [-12,550] | Alpha net, rendu séparé après combattants ; fondu si chevauchement. |
| P5.b chaîne et montant droit | `p5-b-chain-right.png` | [912,58,120,492] | base [972,550] | Autre dessin autonome ; jamais une bande opaque sur le HUD. |

Cette proposition compte **17 sous-plans**, dont une flamme à six dessins, soit **22 fichiers d’image reçus et revus**. Le moteur peut les charger et les dessiner ; le statut final `integrated` attend la recette de l’application complète. Le vantail étroit initial et la première galerie droite opaque sont exclus de cette couverture. L’animation de la porte, du public, des chaînes ou d’autres accessoires attend les exigences exactes de la conversation ; aucun mouvement factice n’est ajouté au budget livré.

## Outils et raccordement

- `node scripts/verify-pit-arena-production-v33.mjs` : nombres, mapping catalogue, statuts, reçus présents, SHA-256, dimensions, alpha réel, bornes, recadrages et ligne opaque du sol.
- `node scripts/record-pit-arena-production-v33.mjs` : importe les reçus immuables de `work/v33`, conserve les progrès et enregistre uniquement les fichiers réellement présents dont le SHA correspond. L'option `--review <identifiants séparés par virgules>` est réservée aux images effectivement examinées et documentées.
- `node scripts/verify-pit-arena-browser-v33.mjs` : recette isolée du renderer avec PNG réels et combattants, captures dans `work/v33/arena-browser-qa`, serveur local éphémère fermé automatiquement.
- `scripts/seed-pit-arena-production-v33.mjs` est un outil de création initiale : il refuse d'écraser un manifeste existant.

Le chargeur ne demande que le kit de l'arène sélectionnée. Si un fichier requis échoue ou présente des dimensions différentes, il recharge le kit bitmap V32 complet. Aucun autre stage n'est substitué. Les images prévues/non revues ne provoquent pas de requêtes HTTP. Les données des stages non jouables ne créent pas de nouveau choix de combat.

Les marges transparentes sont écartées à partir des bornes alpha ≥ 16, puis les proportions et la base sont conservées. Le cadre passe après le vantail et les braseros après leurs flammes. Les bandes du ring répètent leurs pixels à hauteur constante ; le recadrage interne du sol garantit une ligne de contact opaque à y=430. Aucun PNG n'est modifié par ces opérations de lecture.

## Ordre de production proposé après rapprochement des sources

1. Fixer la liste exacte des stages et les éventuels noms plus précis de la conversation.
2. Valider le premier kit complet du Cercle de basalte : six plans, sous-plans et une boucle réelle ; inspection à cadrage proche, coins, mouvement réduit et écran étroit.
3. Produire les autres stages par kits cohérents, avec bilan par fichier et revue des raccords.
4. Intégrer les stages nouveaux seulement quand leur géométrie, leur placement, leurs transitions et leur recette sont réalisés. Conserver la distinction entre concept et jouable jusque-là.

## Liste locale des 100 stages

La liste ci-dessous est générée depuis le catalogue versionné pour éviter les recopies approximatives. Elle sera rapprochée de la conversation dédiée avant validation finale du budget de production.

| Nº | Stage local | Identifiant du catalogue | Lot | Runtime actuel |
|---:|---|---|---|---|
| 1 | Cercle de basalte | `arena-001-cercle-de-basalte` | lore-foundation | jouable : `the-pit` |
| 2 | Hall des Trophées | `arena-002-hall-des-trophees` | lore-foundation | jouable : `trophy-hall` |
| 3 | Chaussée de Canopée | `arena-003-chaussee-de-canopee` | lore-foundation | jouable : `canopy-causeway` |
| 4 | Chambre de Givre | `arena-004-chambre-de-givre` | lore-foundation | jouable : `frost-chamber` |
| 5 | Cour de Cendre | `arena-005-cour-de-cendre` | lore-foundation | jouable : `ash-courtyard` |
| 6 | Terrasse de Verre | `arena-006-terrasse-de-verre` | lore-foundation | jouable : `glass-terrace` |
| 7 | Pont Abyssal | `arena-007-pont-abyssal` | lore-foundation | jouable : `abyssal-bridge` |
| 8 | Tribunal des Ruines | `arena-008-tribunal-des-ruines` | lore-foundation | jouable : `ruins-tribunal` |
| 9 | Quais du Premier Sang | `arena-009-quais-du-premier-sang` | lore-foundation | concept |
| 10 | Forge des Lames Muettes | `arena-010-forge-des-lames-muettes` | lore-foundation | concept |
| 11 | Réserve des Crocs | `arena-011-reserve-des-crocs` | lore-foundation | concept |
| 12 | Balcon du Roi de la Chasse | `arena-012-balcon-du-roi-de-la-chasse` | lore-foundation | concept |
| 13 | Mausolée des Marques | `arena-013-mausolee-des-marques` | lore-foundation | concept |
| 14 | Cour des Navigateurs | `arena-014-cour-des-navigateurs` | lore-foundation | concept |
| 15 | Bastion des Enforcers | `arena-015-bastion-des-enforcers` | lore-foundation | concept |
| 16 | Terrasse des Jeunes Sangs | `arena-016-terrasse-des-jeunes-sangs` | lore-foundation | concept |
| 17 | Puits des Bannis | `arena-017-puits-des-bannis` | lore-foundation | concept |
| 18 | Observatoire des Lunes | `arena-018-observatoire-des-lunes` | lore-foundation | concept |
| 19 | Porte des Réserves | `arena-019-porte-des-reserves` | lore-foundation | concept |
| 20 | Trône Fracturé | `arena-020-trone-fracture` | lore-foundation | concept |
| 21 | Marche du Convoi | `arena-021-marche-du-convoi` | expanded-original | concept |
| 22 | Lac des Signatures | `arena-022-lac-des-signatures` | expanded-original | concept |
| 23 | Ravin des Planeurs | `arena-023-ravin-des-planeurs` | expanded-original | concept |
| 24 | Caverne des Vapeurs | `arena-024-caverne-des-vapeurs` | expanded-original | concept |
| 25 | Corniche du Léviathan | `arena-025-corniche-du-leviathan` | expanded-original | concept |
| 26 | Nid des Razorwings | `arena-026-nid-des-razorwings` | expanded-original | concept |
| 27 | Station des Braconniers | `arena-027-station-des-braconniers` | expanded-original | concept |
| 28 | Mât du Vaisseau-Temple | `arena-028-mat-du-vaisseau-temple` | expanded-original | concept |
| 29 | Crypte du Disciple | `arena-029-crypte-du-disciple` | expanded-original | concept |
| 30 | Jardin des Spores | `arena-030-jardin-des-spores` | expanded-original | concept |
| 31 | Cœur de Mangrove | `arena-031-c-ur-de-mangrove` | expanded-original | concept |
| 32 | Dorsale du Sandmaw | `arena-032-dorsale-du-sandmaw` | expanded-original | concept |
| 33 | Chantier des Motherships | `arena-033-chantier-des-motherships` | expanded-original | concept |
| 34 | Archive Interdite | `arena-034-archive-interdite` | expanded-original | concept |
| 35 | Fosse des Cent Masques | `arena-035-fosse-des-cent-masques` | expanded-original | concept |
| 36 | Temple de la Double Lune | `arena-036-temple-de-la-double-lune` | expanded-original | concept |
| 37 | Écluse des Marais | `arena-037-ecluse-des-marais` | expanded-original | concept |
| 38 | Cicatrice du Monde | `arena-038-cicatrice-du-monde` | expanded-original | concept |
| 39 | Nécropole des Chasseurs | `arena-039-necropole-des-chasseurs` | expanded-original | concept |
| 40 | Fonderie Zéro | `arena-040-fonderie-zero` | expanded-original | concept |
| 41 | Promontoire de Vey | `arena-041-promontoire-de-vey` | expanded-original | concept |
| 42 | Couronne de Glace | `arena-042-couronne-de-glace` | expanded-original | concept |
| 43 | Réacteur de Basalte | `arena-043-reacteur-de-basalte` | expanded-original | concept |
| 44 | Pont des Exilés | `arena-044-pont-des-exiles` | expanded-original | concept |
| 45 | Galerie des Serments | `arena-045-galerie-des-serments` | expanded-original | concept |
| 46 | Station du Dernier Signal | `arena-046-station-du-dernier-signal` | expanded-original | concept |
| 47 | Bassin des Chasses | `arena-047-bassin-des-chasses` | expanded-original | concept |
| 48 | Cale du Vaisseau Perdu | `arena-048-cale-du-vaisseau-perdu` | expanded-original | concept |
| 49 | Aiguille des Orages | `arena-049-aiguille-des-orages` | expanded-original | concept |
| 50 | Porte de l'Audience | `arena-050-porte-de-l-audience` | expanded-original | concept |
| 51 | Golgotha — étude Jaguar | `arena-051-golgotha-etude-jaguar` | heritage-study | concept |
| 52 | City in Despair — étude Capcom | `arena-052-city-in-despair-etude-capcom` | heritage-study | concept |
| 53 | Réacteur Aliens — étude Konami | `arena-053-reacteur-aliens-etude-konami` | heritage-study | concept |
| 54 | Égouts AVP — étude SNES | `arena-054-egouts-avp-etude-snes` | heritage-study | concept |
| 55 | Furnace Alien 3 — étude SNES | `arena-055-furnace-alien-3-etude-snes` | heritage-study | concept |
| 56 | Entrance Alien Trilogy — étude PS1 | `arena-056-entrance-alien-trilogy-etude-ps1` | heritage-study | concept |
| 57 | Temple AVP — étude PC | `arena-057-temple-avp-etude-pc` | heritage-study | concept |
| 58 | Engineering Alien Resurrection — étude PS1 | `arena-058-engineering-alien-resurrection-etude-ps1` | heritage-study | concept |
| 59 | Sulaco Infestation — étude portable | `arena-059-sulaco-infestation-etude-portable` | heritage-study | concept |
| 60 | Nostromo Mess — étude Isolation | `arena-060-nostromo-mess-etude-isolation` | heritage-study | concept |
| 61 | Chambre des Échos | `arena-061-chambre-des-echos` | long-hunt-original | concept |
| 62 | Serre du Prédateur Blanc | `arena-062-serre-du-predateur-blanc` | long-hunt-original | concept |
| 63 | Porte-Mémoire | `arena-063-porte-memoire` | long-hunt-original | concept |
| 64 | Sanctuaire du Fouisseur | `arena-064-sanctuaire-du-fouisseur` | long-hunt-original | concept |
| 65 | Cimetière des Drones | `arena-065-cimetiere-des-drones` | long-hunt-original | concept |
| 66 | Balise de Rabattage | `arena-066-balise-de-rabattage` | long-hunt-original | concept |
| 67 | Terrasses de la Première Cité | `arena-067-terrasses-de-la-premiere-cite` | long-hunt-original | concept |
| 68 | Aqueduc des Clans | `arena-068-aqueduc-des-clans` | long-hunt-original | concept |
| 69 | Salle du Porte-Cendres | `arena-069-salle-du-porte-cendres` | long-hunt-original | concept |
| 70 | Nef des Serpents | `arena-070-nef-des-serpents` | long-hunt-original | concept |
| 71 | Observatoire du Chasseur Mort | `arena-071-observatoire-du-chasseur-mort` | long-hunt-original | concept |
| 72 | Réserve de Quarantaine | `arena-072-reserve-de-quarantaine` | long-hunt-original | concept |
| 73 | Cascade de Résine | `arena-073-cascade-de-resine` | long-hunt-original | concept |
| 74 | Pont des Trois Soleils | `arena-074-pont-des-trois-soleils` | long-hunt-original | concept |
| 75 | Dépôt des Prises Contestées | `arena-075-depot-des-prises-contestees` | long-hunt-original | concept |
| 76 | Atrium des Médiateurs | `arena-076-atrium-des-mediateurs` | long-hunt-original | concept |
| 77 | Fosse du Tonnerre | `arena-077-fosse-du-tonnerre` | long-hunt-original | concept |
| 78 | Récif Suspendu | `arena-078-recif-suspendu` | long-hunt-original | concept |
| 79 | Salle des Routes Stellaires | `arena-079-salle-des-routes-stellaires` | long-hunt-original | concept |
| 80 | Dernier Quai | `arena-080-dernier-quai` | long-hunt-original | concept |
| 81 | Cercle Obsidienne | `arena-081-cercle-obsidienne` | pure-duel | concept |
| 82 | Cercle Ivoire | `arena-082-cercle-ivoire` | pure-duel | concept |
| 83 | Cercle Bronze | `arena-083-cercle-bronze` | pure-duel | concept |
| 84 | Cercle Jade | `arena-084-cercle-jade` | pure-duel | concept |
| 85 | Cercle Sang | `arena-085-cercle-sang` | pure-duel | concept |
| 86 | Cercle Cobalt | `arena-086-cercle-cobalt` | pure-duel | concept |
| 87 | Cercle Ambre | `arena-087-cercle-ambre` | pure-duel | concept |
| 88 | Cercle Cendre | `arena-088-cercle-cendre` | pure-duel | concept |
| 89 | Cercle Éclipse | `arena-089-cercle-eclipse` | pure-duel | concept |
| 90 | Cercle Aurore | `arena-090-cercle-aurore` | pure-duel | concept |
| 91 | Duel des Lames | `arena-091-duel-des-lames` | pure-duel | concept |
| 92 | Duel des Disques | `arena-092-duel-des-disques` | pure-duel | concept |
| 93 | Duel des Filets | `arena-093-duel-des-filets` | pure-duel | concept |
| 94 | Duel du Plasma | `arena-094-duel-du-plasma` | pure-duel | concept |
| 95 | Duel des Anciens | `arena-095-duel-des-anciens` | pure-duel | concept |
| 96 | Duel des Jeunes Sangs | `arena-096-duel-des-jeunes-sangs` | pure-duel | concept |
| 97 | Duel du Premier Point | `arena-097-duel-du-premier-point` | pure-duel | concept |
| 98 | Duel de l'Honneur | `arena-098-duel-de-l-honneur` | pure-duel | concept |
| 99 | Duel du Jugement | `arena-099-duel-du-jugement` | pure-duel | concept |
| 100 | Le Dernier Cercle | `arena-100-le-dernier-cercle` | pure-duel | concept |
