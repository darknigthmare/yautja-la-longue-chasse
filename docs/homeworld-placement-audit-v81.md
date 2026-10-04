# Homeworld V81 — audit des placements réellement montés

Résultat local : **PASS_LOCAL_CONSTRAINTS_WITH_RECORDED_GAPS**. 13 266 contraintes évaluées, 20 familles sémantiques, 0 erreur dure, 29 avertissements conservés. Ce nombre désigne les couples objet/usage/seuil/circuit évalués, pas autant de règles indépendantes.

Inventaire : 43 bâtiments visitables conservés, 15 lots réimplantés, 14 cours composées individuellement, 45 solides recompilés utilisant 17 sources différentes, 176 solides historiques inventoriés. 8 façades non interactives restent classées placeholders ; elles ne comptent pas comme nouvelles maisons visitables.

## Corrections intégrées au moteur et au rendu

- Le Palais 1100×700 et le Conseil 850×500 utilisent leur coque native mesurée. Les maisons de clan et industrielles activées occupent des lots réimplantés ; seuils, intérieurs, interactions, IDs et sauvegardes sont conservés.
- Le port possède sept cours aux polygones, fonctions, compositions et nombres de props différents. Les poches méridionales et sept cours basses suivent des rues/activités différentes ; aucun gabarit de quatre props universel.
- Les compilateurs réels V78/V80 distinguent contact physique, face de travail, approche de banc et espace social. Un meuble inutilisable est refusé sans réduire sa taille ni tourner son PNG en CSS.
- Les 16 circuits touchés suivent les galeries, parvis et voies de livraison autour des volumes natifs. Les terrasses corporelles sont dessinées par le même terrain V77.
- Deux socles polygonaux soutiennent les contacts des maisons du port et des clans. Le banc historique obstruant le nouveau seuil de l’esplanade est déplacé, avec source/ID/taille conservés.
- Le routage garde plusieurs ancres vérifiées autour d’un seuil : une ancre proche enfermée dans l’alcôve ne condamne plus une porte accessible. Grille32, marge12, segments4 et collision corporelle restent inchangés.

## Vérifications et limites

Les tests ciblés vérifient le corps entier sur les 98 circuits conservés et 14 supplémentaires, les 43 approches de porte, 14 paliers, les départs régionaux, les polygones de collision/rendu et les sources alpha. Le test de navigation parcourt réellement depuis le port les 43 portes, sept raccords et dix départs. Les visites visuelles, jeu clavier/manette/mobile et captures ne sont pas remplacés par ces tests. Les 42 vues demandées (14 zones × large/jeu/détail) restent une recette de QA visuelle à fournir séparément ; ce document ne les prétend pas exécutées.

Les limites conservées sont des tâches, pas un PASS global : les usages de meubles historiques signalés, les clôtures complètes, ascenseurs/tunnels natifs, variantes très fréquentes4–8, scènes royales, animation sociale et toutes les suites privées ne sont pas achevés. La carte locale et les créations architecturales sont compatibles avec le lore ; elles ne sont pas une carte canonique1:1.

## Tous les bâtiments visitables

| ID stable | Étage / îlot | Classe | Vue native / coque | Seuil / approche | Voisins les plus proches | Intérieur réel |
|---|---|---|---|---|---|---|
| dock-control | 0 / port | KEEP | NATIVE_OBLIQUE 23.9° ; /game/homeworld/v76/architecture/dock-control.png | 7040,2965 → 7011.6,3029 | residence-port-1:0u ; residence-port-2:0u ; rampart-watch:702.9u | Quais · bureau et contrôle du convoi 538×308 ; 2 zones |
| market-armory | 0 / market | NEW_ART_VARIANT | NATIVE_FRONTAL 0° ; /game/homeworld/v72/civic-identity-atlas.png | 1610,2805.5 → 1610,2875.5 | market-canopy:0u ; residence-terraces-1:104.4u ; residence-market-1:149.2u | Échoppe d’équipement 538×368 ; 3 zones |
| market-canopy | 0 / market | NEW_ART_VARIANT | NATIVE_FRONTAL 0° ; /game/homeworld/v75/architecture/market-canopy.png | 2180,2666 → 2180,2736 | market-armory:0u ; residence-terraces-1:22.3u ; residence-forges-1:54.9u | Marché · halle des délégations 538×308 ; 3 zones |
| deep-forge | 0 / forges | NEW_ART_VARIANT | NATIVE_FRONTAL 0° ; /game/homeworld/v72/civic-identity-atlas.png | 3080,2898.5 → 3080,2968.5 | residence-forges-1:57.5u ; residence-forges-2:86.7u ; residence-market-2:134u | Atelier des parures 538×308 ; 3 zones |
| undercity-refuge | -1B / undercity | NEW_ART_VARIANT | NATIVE_FRONTAL 0° ; /game/homeworld/v75/architecture/undercity-refuge.png | 4520,3208.5 → 4520,3278.5 | residence-undercity-2:56.2u ; residence-undercity-1:174.5u | Galeries · refuge du témoin 538×308 ; 2 zones |
| trophy-mausoleum | 0 / esplanade | KEEP | NATIVE_OBLIQUE 22.4° ; /game/homeworld/v76/architecture/trophy-mausoleum.png | 680,1965 → 653.3,2029.7 | residence-esplanade-1:33.4u ; residence-memory-1:137.9u ; residence-esplanade-2:226.2u | Mausolée · galerie des prises 538×308 ; 3 zones |
| training-hall | 0 / terraces | NEW_ART_VARIANT | NATIVE_FRONTAL 0° ; /game/homeworld/v72/civic-identity-atlas.png | 2230,1798 → 2230,1868 | residence-terraces-2:86.2u ; residence-esplanade-2:94u ; residence-arenas-1:94.1u | Salle des maîtres 538×328 ; 3 zones |
| clan-lodge | 0 / clans | NEW_ART_VARIANT | NATIVE_FRONTAL 0° ; /game/homeworld/v72/civic-identity-atlas.png | 3430,1906.5 → 3430,1976.5 | residence-clans-1:192.8u ; residence-arenas-1:225.1u ; residence-forges-1:267.4u | Maison des délégations 538×428 ; 3 zones |
| enforcer-bastion | +1 / enforcers | NEW_ART_VARIANT | NATIVE_FRONTAL 0° ; /game/homeworld/v75/architecture/enforcer-bastion.png | 4520,1968.5 → 4520,2038.5 | residence-enforcers-1:115.8u ; residence-temple-2:382.8u ; rite-sanctum:619.3u | Veilleurs · preuves et dépositions 538×308 ; 2 zones |
| memory-vault | 0 / memory | NEW_ART_VARIANT | NATIVE_FRONTAL 0° ; /game/homeworld/v72/civic-identity-atlas.png | 1160,1038.5 → 1160,1108.5 | residence-memory-1:121.8u ; residence-terraces-4:195.1u ; residence-esplanade-2:471.6u | Registre des marques 538×448 ; 3 zones |
| pit-gate | 0 / arenas | NEW_ART_VARIANT | NATIVE_FRONTAL 0° ; /game/homeworld/v75/architecture/pit-gate.png | 2300,992 → 2300,1062 | residence-terraces-4:106.8u ; residence-terraces-2:126u ; residence-arenas-1:126u | THE PIT · admission et préparation 538×308 ; 2 zones |
| rite-sanctum | +1 / temple | MOVE | NATIVE_OBLIQUE -19.2° ; /game/homeworld/v81/council-hall-left.png | 3730,770 → 3753,836.1 | residence-temple-1:69.7u ; residence-temple-2:69.7u ; enforcer-bastion:619.3u | Conseil des Anciens · complexe public 818×468 ; 4 zones |
| throne-audience | +2 / citadel | NEW_ART_VARIANT | NATIVE_FRONTAL 0° ; /game/homeworld/v81/royal-pyramid-front.png | 4510,976.5 → 4510,1046.5 | residence-citadel-1:170.9u | Palais des clans · complexe public 1068×668 ; 5 zones |
| convoy-workshop | -1C / convoy-works | KEEP | NATIVE_OBLIQUE -21.9° ; /game/homeworld/v76/architecture/convoy-workshop.png | 1880,4191.5 → 1906.1,4256.4 | convoy-south-shelter:19.7u ; convoy-store:232.2u ; residence-convoy-works-1:353u | Convois · atelier traversant 538×308 ; 2 zones |
| convoy-store | -1C / convoy-works | KEEP | NATIVE_OBLIQUE 24.3° ; /game/homeworld/v76/architecture/convoy-store.png | 2610,4094 → 2581.2,4157.8 | residence-convoy-works-2:48.3u ; convoy-south-shelter:105.8u ; convoy-workshop:232.2u | Convois · dépôt à trois travées 538×308 ; 4 zones |
| convoy-south-shelter | -1C / convoy-works | NEW_ART_VARIANT | NATIVE_FRONTAL 0° ; /game/homeworld/v75/architecture/convoy-south-shelter.png | 2390,4681 → 2390,4751 | convoy-workshop:19.7u ; residence-convoy-works-1:36.2u ; convoy-store:105.8u | Convois · halte de la cour sud 538×308 ; 2 zones |
| rampart-north-lodge | 0 / rampart-walk | NEW_ART_VARIANT | NATIVE_FRONTAL 0° ; /game/homeworld/v75/architecture/rampart-north-lodge.png | 5650,1829 → 5650,1899 | residence-rampart-walk-1:302.5u ; rampart-watch:597u ; dock-control:1113.3u | Remparts · relais de la patrouille haute 538×308 ; 2 zones |
| rampart-watch | 0 / rampart-walk | KEEP | NATIVE_OBLIQUE -22.1° ; /game/homeworld/v76/architecture/rampart-watch.png | 5840,2821 → 5866.3,2885.9 | residence-rampart-walk-1:49u ; rampart-south-lodge:261.2u ; rampart-north-lodge:597u | Remparts · salle d’observation 538×308 ; 2 zones |
| rampart-south-lodge | 0 / rampart-walk | NEW_ART_VARIANT | NATIVE_FRONTAL 0° ; /game/homeworld/v75/architecture/rampart-south-lodge.png | 5610,3565 → 5610,3635 | rampart-watch:261.2u ; residence-rampart-walk-1:839.5u ; dock-control:903.7u | Remparts · relais de la galerie basse 538×308 ; 2 zones |
| residence-port-1 | 0 / port | NEW_ART_VARIANT | NATIVE_FRONTAL 0° ; /game/homeworld/v64/house-a-basalt.png | 7010,3300 → 7010,3370 | dock-control:0u ; residence-port-2:160u ; rampart-watch:749.9u | Quais · maison du relais 328×208 ; 2 zones |
| residence-port-2 | 0 / port | NEW_ART_VARIANT | NATIVE_FRONTAL 0° ; /game/homeworld/v64/house-b-basalt.png | 7570,3340 → 7570,3410 | dock-control:0u ; residence-port-1:160u ; rampart-watch:1269.1u | Quais · maison commune des convoyeurs 408×228 ; 2 zones |
| residence-market-1 | 0 / market | MOVE | NATIVE_FRONTAL 0° ; /game/homeworld/v64/house-c-ribbed.png | 1830,3195 → 1830,3265 | residence-market-2:138.1u ; market-armory:149.2u ; market-canopy:304.5u | Marché · maison des réserves 268×188 ; 2 zones |
| residence-market-2 | 0 / market | MOVE | NATIVE_OBLIQUE -22.6° ; /game/homeworld/v81/clan-residence-left.png | 2470,3045 → 2496.9,3109.6 | deep-forge:134u ; residence-market-1:138.1u ; market-canopy:234.2u | Marché · maison des échanges 328×208 ; 2 zones |
| residence-forges-1 | 0 / forges | MOVE | NATIVE_OBLIQUE 20.6° ; /game/homeworld/v81/industrial-residence-right.png | 2740,2380 → 2715.3,2445.5 | market-canopy:54.9u ; deep-forge:57.5u ; residence-terraces-1:58.8u | Forges · foyer de l’artisan 408×228 ; 2 zones |
| residence-forges-2 | 0 / forges | NEW_ART_VARIANT | NATIVE_FRONTAL 0° ; /game/homeworld/v64/house-c-ribbed.png | 3430,2460 → 3430,2530 | deep-forge:86.7u ; residence-forges-1:111.2u ; residence-clans-1:128.1u | Forges · réserve de l’artisan 268×188 ; 2 zones |
| residence-undercity-1 | -1B / undercity | MOVE | NATIVE_FRONTAL 0° ; /game/homeworld/v64/house-a-basalt.png | 4550,3625 → 4550,3695 | undercity-refuge:174.5u ; residence-undercity-2:227.9u | Galeries · foyer abrité 328×208 ; 2 zones |
| residence-undercity-2 | -1B / undercity | MOVE | NATIVE_OBLIQUE 20.6° ; /game/homeworld/v81/industrial-residence-right.png | 3750,3140 → 3725.3,3205.5 | undercity-refuge:56.2u ; residence-undercity-1:227.9u | Galeries · salle commune du refuge 408×228 ; 2 zones |
| residence-esplanade-1 | 0 / esplanade | NEW_ART_VARIANT | NATIVE_FRONTAL 0° ; /game/homeworld/v64/house-c-ribbed.png | 1030,2340 → 1030,2410 | trophy-mausoleum:33.4u ; market-armory:154.6u ; residence-terraces-3:270u | Esplanade · petite maison des hôtes 268×188 ; 2 zones |
| residence-esplanade-2 | 0 / esplanade | MOVE | NATIVE_OBLIQUE -22.6° ; /game/homeworld/v81/clan-residence-left.png | 1660,1675 → 1686.9,1739.6 | training-hall:94u ; residence-memory-1:118u ; residence-terraces-3:121.3u | Esplanade · foyer des hôtes 328×208 ; 2 zones |
| residence-terraces-1 | 0 / terraces | KEEP | NATIVE_OBLIQUE -22.6° ; /game/homeworld/v81/clan-residence-left.png | 2270,2180 → 2296.9,2244.6 | market-canopy:22.3u ; residence-terraces-3:28.1u ; residence-forges-1:58.8u | Terrasses · maison de la promenade 408×228 ; 2 zones |
| residence-terraces-2 | 0 / terraces | NEW_ART_VARIANT | NATIVE_FRONTAL 0° ; /game/homeworld/v64/house-c-ribbed.png | 2270,1340 → 2270,1410 | training-hall:86.2u ; pit-gate:126u ; residence-arenas-1:155u | Terrasses · réserve de la promenade 268×188 ; 2 zones |
| residence-clans-1 | 0 / clans | MOVE | NATIVE_OBLIQUE -22.6° ; /game/homeworld/v81/clan-residence-left.png | 4060,2260 → 4086.9,2324.6 | residence-forges-2:128.1u ; clan-lodge:192.8u ; deep-forge:385.1u | Clans · maison des visiteurs 328×208 ; 2 zones |
| residence-enforcers-1 | +1 / enforcers | MOVE | NATIVE_FRONTAL 0° ; /game/homeworld/v64/house-b-basalt.png | 4530,2355 → 4530,2425 | enforcer-bastion:115.8u ; residence-temple-2:835.1u ; residence-temple-1:1034.4u | Veilleurs · maison de la déposition 408×228 ; 2 zones |
| residence-memory-1 | 0 / memory | MOVE | NATIVE_FRONTAL 0° ; /game/homeworld/v64/house-c-ribbed.png | 1210,1405 → 1210,1475 | residence-esplanade-2:118u ; memory-vault:121.8u ; trophy-mausoleum:137.9u | Mémoire · foyer des registres 268×188 ; 2 zones |
| residence-arenas-1 | 0 / arenas | MOVE | NATIVE_FRONTAL 0° ; /game/homeworld/v64/house-a-basalt.png | 2755,1360 → 2755,1430 | training-hall:94.1u ; pit-gate:126u ; residence-terraces-2:155u | Arènes · foyer de l’aspirant 328×208 ; 2 zones |
| residence-temple-1 | +1 / temple | NEW_ART_VARIANT | NATIVE_FRONTAL 0° ; /game/homeworld/v64/house-b-basalt.png | 3350,1340 → 3350,1410 | rite-sanctum:69.7u ; residence-temple-2:150u ; enforcer-bastion:712.7u | Rites · maison de l’accueil 408×228 ; 2 zones |
| residence-temple-2 | +1 / temple | NEW_ART_VARIANT | NATIVE_FRONTAL 0° ; /game/homeworld/v64/house-c-ribbed.png | 3870,1300 → 3870,1370 | rite-sanctum:69.7u ; residence-temple-1:150u ; enforcer-bastion:382.8u | Rites · foyer des tentures 268×188 ; 2 zones |
| residence-citadel-1 | +2 / citadel | MOVE | NATIVE_FRONTAL 0° ; /game/homeworld/v64/house-a-basalt.png | 4420,1405 → 4420,1475 | throne-audience:170.9u | Citadelle · logement de l’intendance 328×208 ; 2 zones |
| residence-convoy-works-1 | -1C / convoy-works | MOVE | NATIVE_OBLIQUE 20.6° ; /game/homeworld/v81/industrial-residence-right.png | 1640,4860 → 1615.3,4925.5 | convoy-south-shelter:36.2u ; convoy-workshop:353u ; convoy-store:531.1u | Convois · maison de la maintenance 408×228 ; 2 zones |
| residence-convoy-works-2 | -1C / convoy-works | MOVE | NATIVE_FRONTAL 0° ; /game/homeworld/v64/house-c-ribbed.png | 3225,4265 → 3225,4335 | convoy-store:48.3u ; convoy-south-shelter:405.1u ; convoy-workshop:939.9u | Convois · petit dépôt du foyer 268×188 ; 3 zones |
| residence-rampart-walk-1 | 0 / rampart-walk | NEW_ART_VARIANT | NATIVE_FRONTAL 0° ; /game/homeworld/v64/house-a-basalt.png | 5750,2380 → 5750,2450 | rampart-watch:49u ; rampart-north-lodge:302.5u ; rampart-south-lodge:839.5u | Remparts · foyer de la relève 328×208 ; 2 zones |
| residence-terraces-3 | 0 / terraces | NEW_ART_VARIANT | NATIVE_FRONTAL 0° ; /game/homeworld/v64/house-b-basalt.png | 1670,2180 → 1670,2250 | residence-terraces-1:28.1u ; market-canopy:113.9u ; training-hall:115.5u | Terrasses · maison de la grande table 408×228 ; 3 zones |
| residence-terraces-4 | 0 / terraces | MOVE | NATIVE_FRONTAL 0° ; /game/homeworld/v64/house-c-ribbed.png | 1790,1290 → 1790,1360 | pit-gate:106.8u ; training-hall:136.3u ; residence-terraces-2:180u | Terrasses · foyer du banc de pierre 268×188 ; 2 zones |

## Composition des quatorze cours

| Cour | Fonction / densité0–5 | Composition | Focus | Props retenus / candidats |
|---|---|---|---|---|
| port-0 | freight / 4 | LOADING_BAY | lot de cargaison au revers du quai | 3 / 3 |
| port-1 | work / 3 | SERVICE_BAY | poste de réglage en retrait | 0 / 2 |
| port-2 | rest / 2 | REST_POCKET | panorama du canyon sous la chaussée | 1 / 2 |
| port-3 | clan / 2 | SINGLE_ANCHOR | marque de délégation ; centre pour le rassemblement | 1 / 1 |
| port-4 | archive / 2 | EDGE_STAGGER | pupitre des traversées | 2 / 2 |
| port-5 | rest / 1 | TERRACE_EDGE | halte hors du flux des équipages | 0 / 2 |
| port-6 | freight / 3 | EDGE_CLUSTER | tri des retours avant accès au sas | 1 / 2 |
| lower-market | exchange / 4 | MARKET_BAY | étal et rue des clients | 3 / 3 |
| lower-maintenance | work / 4 | WORK_POCKET | outils et pièces contre le soutènement | 2 / 2 |
| lower-west-rest | rest / 2 | REST_POCKET | assise au revers du refuge | 2 / 2 |
| lower-east-cistern | work / 3 | SERVICE_BAY | réserve minérale civique | 2 / 2 |
| lower-middle-rest | rest / 1 | SINGLE_ANCHOR | respiration avant le carrefour | 0 / 1 |
| lower-forge | work / 4 | WORK_POCKET | réglage et refroidissement séparés | 2 / 2 |
| lower-common | clan / 3 | SOCIAL_CLUSTER | table sociale et circulation extérieure | 1 / 2 |

## Chaque solide recompilé : contact, usage et social

| ID | Source / fonction | Étage / quartier | Centre | Contact réel | Usage distinct |
|---|---|---|---|---|
| civic-v81:dock-control:0 | maintenance-rack / maintenance | 0 / port | 6521.5,2962.5 | 84.3×40.5 | 6477.2,2985.1 → 6573.2,3081.1 |
| civic-v81:market-armory:1 | amber-lamp-post / light | 0 / market | 1220,2955.8 | 30.2×18.8 | Non requis |
| civic-v81:deep-forge:1 | maintenance-rack / maintenance | 0 / forges | 3490,3163.9 | 84.3×40.5 | 3445.7,3186.4 → 3541.7,3282.4 |
| civic-v81:undercity-refuge:0 | bench-left / rest | -1B / undercity | 4920,3455.5 | 135.1×108.4 | 4753.9,3409.1 → 4849.9,3505.1 |
| civic-v81:undercity-refuge:1 | amber-lamp-post / light | -1B / undercity | 4090,3535.5 | 30.2×18.8 | Non requis |
| civic-v81:trophy-mausoleum:0 | clan-lectern-right / consultation | 0 / esplanade | 189.9,1998.9 | 40.7×24.1 | 210.2,1945.6 → 306.2,2057.6 |
| civic-v81:trophy-mausoleum:1 | clan-banner-standard / clan | 0 / esplanade | 275.7,1882.9 | 30.8×25.6 | Non requis |
| civic-v81:enforcer-bastion:0 | clan-lectern-right / consultation | +1 / enforcers | 4110,2404.2 | 40.7×24.1 | 4130.3,2350.9 → 4226.3,2462.9 |
| civic-v81:rite-sanctum:0 | mineral-basin-right / rest | +1 / temple | 4345.9,988.3 | 58×19.3 | Non requis |
| civic-v81:throne-audience:0 | clan-banner-standard / clan | +2 / citadel | 4010,1249.1 | 30.8×25.6 | Non requis |
| civic-v81:convoy-south-shelter:1 | amber-lamp-post / light | -1C / convoy-works | 2795,4901.5 | 30.2×18.8 | Non requis |
| civic-v81:rampart-watch:0 | amber-lamp-post / light | 0 / rampart-walk | 6290.9,2828.5 | 30.2×18.8 | Non requis |
| civic-v81:residence-port-2:0 | mineral-basin-right / rest | 0 / port | 7870,3757.2 | 58×19.3 | Non requis |
| civic-v81:residence-undercity-1:0 | bench-left / rest | -1B / undercity | 4200,3920.5 | 135.1×108.4 | 4033.9,3874.1 → 4129.9,3970.1 |
| civic-v81:residence-esplanade-1:0 | amber-lamp-post / light | 0 / esplanade | 740,2511.8 | 30.2×18.8 | Non requis |
| civic-v81:residence-citadel-1:0 | amber-lamp-post / light | +2 / citadel | 4080,1645.5 | 30.2×18.8 | Non requis |
| civic-v81:residence-convoy-works-1:0 | maintenance-rack / maintenance | -1C / convoy-works | 1143.1,5129.8 | 84.3×40.5 | 1098.8,5152.4 → 1194.8,5248.4 |
| civic-v81:court:lower-common:table | clan-common-table-left / clan | -1A / undercity | 4380,4960 | 114.4×60.9 | 4204.8,4901.6 → 4332.8,5013.6 |
| civic-v81:court:lower-west-rest:wall | corner-wall-left / structure | -1A / undercity | 2810,4545 | 166.1×108.6 | Non requis |
| urban-v81:port-0:cargo | court-native-v80:sealed-cargo-case-left / storage | 0 / port | 3280,5070 | 96×45.7 | 3117.2,5008.3 → 3229.2,5136.3 |
| urban-v81:port-0:tools | court-native-v80:maintenance-rack / maintenance | 0 / port | 3640,4955 | 84.3×40.5 | 3595.7,4977.6 → 3691.7,5073.6 |
| urban-v81:port-0:beacon | court-native-v80:amber-lamp-post / light | 0 / port | 3785,5210 | 30.2×18.8 | Non requis |
| urban-v81:port-2:basin | court-native-v80:mineral-basin-right / rest | 0 / port | 4965,5030 | 58×19.3 | Non requis |
| urban-v81:port-3:standard | court-native-v80:clan-banner-standard / clan | 0 / port | 5590,5670 | 30.8×25.6 | Non requis |
| urban-v81:port-4:register | court-native-v80:clan-lectern-right / consultation | 0 / port | 5890,5080 | 40.7×24.1 | 5910.3,5026.7 → 6006.3,5138.7 |
| urban-v81:port-4:light | court-native-v80:amber-lamp-post / light | 0 / port | 6280,5180 | 30.2×18.8 | Non requis |
| urban-v81:port-6:lamp | court-native-v80:amber-lamp-post / light | 0 / port | 7560,5220 | 30.2×18.8 | Non requis |
| urban-v81:lower-market:canopy | merchant-canopy-diagonal / exchange | -1A / undercity | 3290,2950 | 144.4×98.2 | 3226,2950 → 3354,3078 |
| urban-v81:lower-market:stock | logistics-container-rack / storage | -1A / undercity | 2870,2995 | 101.7×16.4 | 2814,2995 → 2926,3123 |
| urban-v81:lower-market:light | court-native-v80:amber-lamp-post / light | -1A / undercity | 2845,3255 | 30.2×18.8 | Non requis |
| urban-v81:lower-maintenance:rack | court-native-v80:maintenance-rack / maintenance | -1A / undercity | 3920,2920 | 84.3×40.5 | 3875.7,2942.6 → 3971.7,3038.6 |
| urban-v81:lower-maintenance:case | court-native-v80:sealed-cargo-case-left / storage | -1A / undercity | 4400,2980 | 96×45.7 | 4237.2,2918.3 → 4349.2,3046.3 |
| urban-v81:lower-west-rest:bench | terrace-bench-right / rest | -1A / undercity | 2880,4210 | 107.8×72.2 | 2933.9,4125.9 → 3029.9,4221.9 |
| urban-v81:lower-west-rest:basin | court-native-v80:mineral-basin-right / rest | -1A / undercity | 2810,4410 | 58×19.3 | Non requis |
| urban-v81:lower-east-cistern:basin | court-native-v80:mineral-basin-right / rest | -1A / undercity | 4615,4790 | 58×19.3 | Non requis |
| urban-v81:lower-east-cistern:lamp | court-native-v80:amber-lamp-post / light | -1A / undercity | 4935,5010 | 30.2×18.8 | Non requis |
| urban-v81:lower-forge:rack | court-native-v80:maintenance-rack / maintenance | -1A / undercity | 3435,4760 | 84.3×40.5 | 3390.7,4782.6 → 3486.7,4878.6 |
| urban-v81:lower-forge:case | court-native-v80:sealed-cargo-case-left / storage | -1A / undercity | 3835,4970 | 96×45.7 | 3672.2,4908.3 → 3784.2,5036.3 |
| urban-v81:lower-common:light | court-native-v80:amber-lamp-post / light | -1A / undercity | 4050,5100 | 30.2×18.8 | Non requis |
| city-native-v78:market-stall-right | market-stall-right / exchange | -1A / undercity | 3050,3340 | 253.5×79.8 | 3200.1,3263.7 → 3328.1,3391.7 |
| city-native-v78:forge-workstation-left | forge-workstation-left / work | -1A / undercity | 3600,4630 | 204.3×74.2 | 3355,4563.2 → 3499,4707.2 |
| city-native-v78:terrace-retaining-front | terrace-retaining-front / structure | -1A / undercity | 2990,4025 | 434.1×15.6 | Non requis |
| city-native-v78:port-cargo-sorting-cart | port-cargo-sorting-cart / storage | 0 / port | 3500,5050 | 130×56.5 | 3455.8,5083.1 → 3567.8,5211.1 |
| city-native-v78:clan-common-table-left | clan-common-table-left / clan | -1A / undercity | 4210,4715 | 114.4×60.9 | 4034.8,4656.6 → 4162.8,4768.6 |
| city-native-v78:civic-water-cistern-right | civic-water-cistern-right / rest | -1A / undercity | 4840,4370 | 153.6×73.1 | 4901.5,4328.6 → 4997.5,4424.6 |

## Chaque solide historique conservé et audité

| ID | Famille | Étage | Centre | Contact conservé | Avertissements |
|---|---|---|---|---|
| v75-frontage:dock-control:1 | register-desk | 0 | 6858.5,2980.7 | 79.8×39.6 | Aucun détecté ; métrologie historique conservée |
| v75-frontage:dock-control:2 | convoy-crates | 0 | 7225.5,3165.3 | 60.5×35.8 | USAGE_SUPPORTED / beacon-v64-dock-control |
| v75-frontage:market-armory:1 | clothing-rack | 0 | 1404.8,2825.8 | 82.5×34.1 | USAGE_SUPPORTED / bench-v64-market-armory |
| v75-frontage:market-armory:2 | convoy-crates | 0 | 1815.2,2825.8 | 66×39 | USAGE_SUPPORTED / beacon-v64-market-armory |
| v75-frontage:market-canopy:1 | sealed-jars | 0 | 1974.8,2670.5 | 66.5×35 | Aucun détecté ; métrologie historique conservée |
| v75-frontage:market-canopy:2 | clothing-rack | 0 | 2385.2,2670.5 | 90×37.2 | USAGE_SUPPORTED / beacon-v64-market-canopy |
| v75-frontage:deep-forge:1 | artisan-bench | 0 | 2874.8,2918.9 | 90.8×45.1 | Aucun détecté ; métrologie historique conservée |
| v75-frontage:deep-forge:2 | sealed-jars | 0 | 3285.2,2918.9 | 57×30 | Aucun détecté ; métrologie historique conservée |
| v75-frontage:undercity-refuge:1 | stone-bench | -1B | 4314.8,3210.5 | 85×29 | Aucun détecté ; métrologie historique conservée |
| v75-frontage:undercity-refuge:2 | resin-lantern | -1B | 4725.2,3210.5 | 30×25.2 | Aucun détecté ; métrologie historique conservée |
| v75-frontage:trophy-mausoleum:1 | resin-lantern | 0 | 448.9,1986.9 | 32.5×27.3 | Aucun détecté ; métrologie historique conservée |
| v75-frontage:trophy-mausoleum:2 | stone-bench | 0 | 828.2,2143.6 | 85×29 | Aucun détecté ; métrologie historique conservée |
| v75-frontage:training-hall:1 | training-gong | 0 | 2024.8,1818.4 | 79.8×26.4 | Aucun détecté ; métrologie historique conservée |
| v75-frontage:training-hall:2 | clothing-rack | 0 | 2435.2,1818.4 | 75×31 | USAGE_SUPPORTED / beacon-v64-training-hall |
| v75-frontage:clan-lodge:1 | stone-bench | 0 | 3224.8,1926.9 | 85×29 | BENCH_USE_ZONE_CLEAR / garden-v64-clan-lodge |
| v75-frontage:clan-lodge:2 | resin-lantern | 0 | 3635.2,1926.9 | 35×29.4 | Aucun détecté ; métrologie historique conservée |
| v75-frontage:enforcer-bastion:1 | clan-banner | +1 | 4314.8,1979.2 | 63×30 | Aucun détecté ; métrologie historique conservée |
| v75-frontage:enforcer-bastion:2 | convoy-crates | +1 | 4725.2,1979.2 | 60.5×35.8 | USAGE_SUPPORTED / beacon-v64-enforcer-bastion |
| v75-frontage:memory-vault:1 | register-desk | 0 | 954.8,1063.2 | 72.5×36 | Aucun détecté ; métrologie historique conservée |
| v75-frontage:memory-vault:2 | stone-bench | 0 | 1365.2,1063.2 | 85×29 | BENCH_USE_ZONE_CLEAR / beacon-v64-memory-vault |
| v75-frontage:pit-gate:1 | training-gong | 0 | 2094.8,994 | 87×28.8 | Aucun détecté ; métrologie historique conservée |
| v75-frontage:pit-gate:2 | stone-bench | 0 | 2505.2,994 | 93.5×31.9 | BENCH_USE_ZONE_CLEAR / beacon-v64-pit-gate |
| v75-frontage:rite-sanctum:1 | clan-banner | +1 | 3493.1,1020.3 | 63×30 | Aucun détecté ; métrologie historique conservée |
| v75-frontage:rite-sanctum:2 | resin-lantern | +1 | 4180.6,823.5 | 35×29.4 | Aucun détecté ; métrologie historique conservée |
| v75-frontage:throne-audience:1 | clan-banner | +2 | 4114,994.1 | 63×30 | Aucun détecté ; métrologie historique conservée |
| v75-frontage:throne-audience:2 | stone-bench | +2 | 4906,994.1 | 93.5×31.9 | Aucun détecté ; métrologie historique conservée |
| v75-frontage:convoy-workshop:1 | artisan-bench | -1C | 1733.8,4377.8 | 99×49.2 | Aucun détecté ; métrologie historique conservée |
| v75-frontage:convoy-workshop:2 | convoy-crates | -1C | 2136.9,4280.3 | 66×39 | Aucun détecté ; métrologie historique conservée |
| v75-frontage:convoy-store:1 | convoy-crates | -1C | 2375.7,4114.3 | 71.5×42.3 | Aucun détecté ; métrologie historique conservée |
| v75-frontage:convoy-store:2 | sealed-jars | -1C | 2749.9,4283 | 66.5×35 | Aucun détecté ; métrologie historique conservée |
| v75-frontage:convoy-south-shelter:1 | stone-bench | -1C | 2184.8,4691.5 | 93.5×31.9 | Aucun détecté ; métrologie historique conservée |
| v75-frontage:convoy-south-shelter:2 | resin-lantern | -1C | 2595.2,4691.5 | 35×29.4 | Aucun détecté ; métrologie historique conservée |
| v75-frontage:rampart-north-lodge:1 | register-desk | 0 | 5444.8,1837.5 | 72.5×36 | Aucun détecté ; métrologie historique conservée |
| v75-frontage:rampart-north-lodge:2 | stone-bench | 0 | 5855.2,1837.5 | 93.5×31.9 | BENCH_USE_ZONE_CLEAR / beacon-v64-rampart-north-lodge |
| v75-frontage:rampart-watch:1 | clan-banner | 0 | 5697.4,3015.3 | 63×30 | Aucun détecté ; métrologie historique conservée |
| v75-frontage:rampart-watch:2 | sealed-jars | 0 | 6077.7,2861 | 57×30 | Aucun détecté ; métrologie historique conservée |
| v75-frontage:rampart-south-lodge:1 | stone-bench | 0 | 5404.8,3569.1 | 93.5×31.9 | Aucun détecté ; métrologie historique conservée |
| v75-frontage:rampart-south-lodge:2 | resin-lantern | 0 | 5815.2,3569.1 | 35×29.4 | Aucun détecté ; métrologie historique conservée |
| v75-frontage:residence-port-1:1 | stone-bench | 0 | 7139.6,3305.5 | 54.4×18.6 | Aucun détecté ; métrologie historique conservée |
| v75-frontage:residence-port-2:1 | sealed-jars | 0 | 7411.6,3372.2 | 42.8×22.5 | Aucun détecté ; métrologie historique conservée |
| v75-frontage:residence-market-1:1 | convoy-crates | 0 | 1938,3206.8 | 41.8×24.7 | Aucun détecté ; métrologie historique conservée |
| v75-frontage:residence-market-2:1 | stone-bench | 0 | 2658.9,3124.4 | 54.4×18.6 | Aucun détecté ; métrologie historique conservée |
| v75-frontage:residence-forges-1:1 | sealed-jars | 0 | 2531.6,2443.2 | 42.8×22.5 | Aucun détecté ; métrologie historique conservée |
| v75-frontage:residence-forges-2:1 | convoy-crates | 0 | 3538,2471.8 | 41.8×24.7 | USAGE_SUPPORTED / exterior-v76-009 |
| v75-frontage:residence-undercity-1:1 | stone-bench | -1B | 4679.6,3630.5 | 54.4×18.6 | Aucun détecté ; métrologie historique conservée |
| v75-frontage:residence-undercity-2:1 | sealed-jars | -1B | 3541.6,3203.2 | 42.8×22.5 | Aucun détecté ; métrologie historique conservée |
| v75-frontage:residence-esplanade-1:1 | convoy-crates | 0 | 1138,2351.8 | 41.8×24.7 | Aucun détecté ; métrologie historique conservée |
| v75-frontage:residence-esplanade-2:1 | stone-bench | 0 | 1848.9,1754.4 | 54.4×18.6 | Aucun détecté ; métrologie historique conservée |
| v75-frontage:residence-terraces-1:1 | sealed-jars | 0 | 2193,2369.9 | 42.8×22.5 | Aucun détecté ; métrologie historique conservée |
| v75-frontage:residence-terraces-2:1 | convoy-crates | 0 | 2378,1351.8 | 41.8×24.7 | Aucun détecté ; métrologie historique conservée |
| v75-frontage:residence-clans-1:1 | stone-bench | 0 | 4248.9,2339.4 | 54.4×18.6 | Aucun détecté ; métrologie historique conservée |
| v75-frontage:residence-enforcers-1:1 | sealed-jars | +1 | 4371.6,2387.2 | 42.8×22.5 | Aucun détecté ; métrologie historique conservée |
| v75-frontage:residence-memory-1:1 | convoy-crates | 0 | 1318,1416.8 | 41.8×24.7 | USAGE_SUPPORTED / life-v68-33-1 |
| v75-frontage:residence-arenas-1:1 | stone-bench | 0 | 2884.6,1365.5 | 54.4×18.6 | Aucun détecté ; métrologie historique conservée |
| v75-frontage:residence-temple-1:1 | sealed-jars | +1 | 3191.6,1372.2 | 42.8×22.5 | Aucun détecté ; métrologie historique conservée |
| v75-frontage:residence-temple-2:1 | convoy-crates | +1 | 3978,1311.8 | 41.8×24.7 | Aucun détecté ; métrologie historique conservée |
| v75-frontage:residence-citadel-1:1 | stone-bench | +2 | 4549.6,1410.5 | 54.4×18.6 | Aucun détecté ; métrologie historique conservée |
| v75-frontage:residence-convoy-works-1:1 | sealed-jars | -1C | 1431.6,4923.2 | 42.8×22.5 | Aucun détecté ; métrologie historique conservée |
| v75-frontage:residence-convoy-works-2:1 | convoy-crates | -1C | 3333,4276.8 | 41.8×24.7 | Aucun détecté ; métrologie historique conservée |
| v75-frontage:residence-rampart-walk-1:1 | stone-bench | 0 | 5879.6,2385.5 | 54.4×18.6 | Aucun détecté ; métrologie historique conservée |
| v75-frontage:residence-terraces-3:1 | sealed-jars | 0 | 1511.6,2212.2 | 42.8×22.5 | Aucun détecté ; métrologie historique conservée |
| v75-frontage:residence-terraces-4:1 | convoy-crates | 0 | 1898,1301.8 | 41.8×24.7 | Aucun détecté ; métrologie historique conservée |
| exterior-v76-001 | logistics-container-rack | 0 | 6870,3580 | 122.1×19.7 | Aucun détecté ; métrologie historique conservée |
| exterior-v76-002 | convoy-crates | 0 | 7570,3020 | 99×58.5 | Aucun détecté ; métrologie historique conservée |
| exterior-v76-003 | resin-lantern | 0 | 7128,3566 | 40×33.6 | Aucun détecté ; métrologie historique conservée |
| exterior-v76-004 | merchant-canopy-diagonal | 0 | 2150,3469 | 185.7×126.3 | Aucun détecté ; métrologie historique conservée |
| exterior-v76-005 | clothing-rack | 0 | 1512,3352 | 135×55.8 | Aucun détecté ; métrologie historique conservée |
| exterior-v76-006 | sealed-jars | 0 | 1660,3316 | 95×50 | Aucun détecté ; métrologie historique conservée |
| exterior-v76-007 | logistics-container-rack | 0 | 2325,3281 | 122.1×19.7 | Aucun détecté ; métrologie historique conservée |
| exterior-v76-008 | artisan-bench | 0 | 3641,2735 | 132×65.6 | BENCH_USE_ZONE_CLEAR / exterior-v76-010 |
| exterior-v76-009 | logistics-container-rack | 0 | 3547,2594 | 135.7×21.9 | DOOR_APPROACH_CLEAR / residence-forges-2; USAGE_SUPPORTED / exterior-v76-008 |
| exterior-v76-010 | sealed-jars | 0 | 3625,2822 | 95×50 | Aucun détecté ; métrologie historique conservée |
| exterior-v76-011 | convoy-crates | 0 | 3590,3067 | 88×52 | USAGE_SUPPORTED / civic-v81:deep-forge:1 |
| exterior-v76-012 | resin-lantern | 0 | 3590,2892 | 45×37.8 | Aucun détecté ; métrologie historique conservée |
| exterior-v76-013 | terrace-bench-right | -1B | 4189,3503 | 129.4×86.7 | Aucun détecté ; métrologie historique conservée |
| exterior-v76-014 | sealed-jars | -1B | 4192,2822 | 85.5×45 | Aucun détecté ; métrologie historique conservée |
| exterior-v76-015 | resin-lantern | -1B | 3772,2792 | 50×42 | Aucun détecté ; métrologie historique conservée |
| exterior-v76-016 | meal-table | -1B | 4312,2722 | 120×65.6 | Aucun détecté ; métrologie historique conservée |
| exterior-v76-017 | mineral-planter-left | -1B | 4525,2813 | 193.3×107.8 | Aucun détecté ; métrologie historique conservée |
| exterior-v76-018 | resin-lantern | 0 | 1395,2187 | 50×42 | Aucun détecté ; métrologie historique conservée |
| exterior-v76-019 | terrace-bench-right | 0 | 2845,2056 | 129.4×86.7 | Aucun détecté ; métrologie historique conservée |
| exterior-v76-020 | training-gong | 0 | 1795,2301 | 145×48 | DOOR_APPROACH_CLEAR / residence-terraces-3 |
| exterior-v76-021 | sealed-jars | 0 | 1795,1741 | 76×40 | DOOR_APPROACH_CLEAR / residence-esplanade-2 |
| exterior-v76-022 | resin-lantern | 0 | 2775,1846 | 45×37.8 | Aucun détecté ; métrologie historique conservée |
| exterior-v76-023 | sealed-jars | 0 | 3670,2476 | 76×40 | Aucun détecté ; métrologie historique conservée |
| exterior-v76-024 | logistics-container-rack | +1 | 4702,2499 | 122.1×19.7 | Aucun détecté ; métrologie historique conservée |
| exterior-v76-025 | stone-bench | +1 | 4882,2519 | 153×52.2 | Aucun détecté ; métrologie historique conservée |
| exterior-v76-026 | sealed-jars | +1 | 4880,1779 | 95×50 | Aucun détecté ; métrologie historique conservée |
| exterior-v76-027 | resin-lantern | +1 | 5020,1891 | 40×33.6 | Aucun détecté ; métrologie historique conservée |
| exterior-v76-028 | convoy-crates | +1 | 4670,1499 | 99×58.5 | Aucun détecté ; métrologie historique conservée |
| exterior-v76-029 | mineral-planter-left | 0 | 1500,1266 | 174×97.1 | Aucun détecté ; métrologie historique conservée |
| exterior-v76-030 | terrace-bench-right | 0 | 1675,951 | 143.8×96.3 | Aucun détecté ; métrologie historique conservée |
| exterior-v76-031 | stone-bench | 0 | 730,846 | 170×58 | Aucun détecté ; métrologie historique conservée |
| exterior-v76-032 | resin-lantern | 0 | 870,1126 | 40×33.6 | Aucun détecté ; métrologie historique conservée |
| exterior-v76-033 | sealed-jars | 0 | 1675,1441 | 85.5×45 | Aucun détecté ; métrologie historique conservée |
| exterior-v76-034 | terrace-bench-right | 0 | 1915,1064 | 129.4×86.7 | BENCH_USE_ZONE_CLEAR / v75-frontage:pit-gate:1 |
| exterior-v76-035 | sealed-jars | 0 | 1897,791 | 85.5×45 | Aucun détecté ; métrologie historique conservée |
| exterior-v76-036 | resin-lantern | 0 | 2533,582 | 50×42 | Aucun détecté ; métrologie historique conservée |
| exterior-v76-037 | training-gong | 0 | 1915,924 | 116×38.4 | Aucun détecté ; métrologie historique conservée |
| exterior-v76-038 | mineral-planter-left | 0 | 2440,504 | 193.3×107.8 | Aucun détecté ; métrologie historique conservée |
| exterior-v76-039 | resin-lantern | +1 | 3090,504 | 45×37.8 | Aucun détecté ; métrologie historique conservée |
| exterior-v76-040 | sealed-jars | +1 | 3090,609 | 85.5×45 | Aucun détecté ; métrologie historique conservée |
| exterior-v76-041 | terrace-bench-right | +2 | 4995,1348 | 129.4×86.7 | Aucun détecté ; métrologie historique conservée |
| exterior-v76-042 | resin-lantern | +2 | 4890,578 | 50×42 | Aucun détecté ; métrologie historique conservée |
| exterior-v76-043 | logistics-container-rack | -1C | 2804,4408 | 122.1×19.7 | USAGE_SUPPORTED / exterior-v76-044 |
| exterior-v76-044 | convoy-crates | -1C | 2835,4521 | 99×58.5 | Aucun détecté ; métrologie historique conservée |
| exterior-v76-045 | artisan-bench | -1C | 2940,4836 | 165×82 | Aucun détecté ; métrologie historique conservée |
| exterior-v76-046 | sealed-jars | -1C | 2031,3643 | 76×40 | Aucun détecté ; métrologie historique conservée |
| exterior-v76-047 | terrace-bench-right | 0 | 5810,2060 | 129.4×86.7 | Aucun détecté ; métrologie historique conservée |
| exterior-v76-048 | mineral-planter-left | 0 | 5425,3180 | 193.3×107.8 | Aucun détecté ; métrologie historique conservée |
| exterior-v76-049 | resin-lantern | 0 | 5195,2100 | 50×42 | Aucun détecté ; métrologie historique conservée |
| exterior-v76-050 | stone-bench | 0 | 5460,3775 | 136×46.4 | Aucun détecté ; métrologie historique conservée |
| exterior-v76-051 | sealed-jars | 0 | 5390,1430 | 85.5×45 | Aucun détecté ; métrologie historique conservée |
| exterior-v76-052 | resin-lantern | 0 | 6800,3510 | 40×33.6 | Aucun détecté ; métrologie historique conservée |
| exterior-v76-053 | resin-lantern | 0 | 1660,3386 | 45×37.8 | Aucun détecté ; métrologie historique conservée |
| exterior-v76-054 | resin-lantern | 0 | 3625,2962 | 50×42 | Aucun détecté ; métrologie historique conservée |
| exterior-v76-055 | resin-lantern | -1B | 4035,2848 | 50×42 | Aucun détecté ; métrologie historique conservée |
| exterior-v76-056 | resin-lantern | 0 | 1395,2117 | 45×37.8 | Aucun détecté ; métrologie historique conservée |
| exterior-v76-057 | resin-lantern | 0 | 2810,1916 | 45×37.8 | Aucun détecté ; métrologie historique conservée |
| exterior-v76-058 | resin-lantern | +1 | 4775,2339 | 50×42 | Aucun détecté ; métrologie historique conservée |
| exterior-v76-059 | resin-lantern | 0 | 905,531 | 50×42 | Aucun détecté ; métrologie historique conservée |
| exterior-v76-060 | resin-lantern | 0 | 2698,727 | 50×42 | Aucun détecté ; métrologie historique conservée |
| exterior-v76-061 | resin-lantern | +1 | 2845,889 | 50×42 | Aucun détecté ; métrologie historique conservée |
| exterior-v76-062 | resin-lantern | +2 | 4890,648 | 50×42 | Aucun détecté ; métrologie historique conservée |
| exterior-v76-063 | resin-lantern | -1C | 2964,4692 | 45×37.8 | Aucun détecté ; métrologie historique conservée |
| exterior-v76-064 | resin-lantern | 0 | 5250,1955 | 50×42 | Aucun détecté ; métrologie historique conservée |
| exterior-v76-065 | sealed-jars | 0 | 7010,3615 | 85.5×45 | Aucun détecté ; métrologie historique conservée |
| exterior-v76-066 | sealed-jars | 0 | 1485,3246 | 95×50 | Aucun détecté ; métrologie historique conservée |
| exterior-v76-067 | sealed-jars | 0 | 2575,2857 | 76×40 | Aucun détecté ; métrologie historique conservée |
| exterior-v76-068 | sealed-jars | -1B | 4875,3198 | 76×40 | Aucun détecté ; métrologie historique conservée |
| exterior-v76-069 | sealed-jars | 0 | 1795,1636 | 95×50 | Aucun détecté ; métrologie historique conservée |
| exterior-v76-070 | sealed-jars | +1 | 4565,2514 | 76×40 | DOOR_APPROACH_CLEAR / residence-enforcers-1 |
| life-v69-brazier-temple | brazier-v69 | +1 | 2970,583.5 | 96×50 | Aucun détecté ; métrologie historique conservée |
| life-v69-brazier-memory | brazier-v69 | 0 | 790,700.5 | 96×50 | Aucun détecté ; métrologie historique conservée |
| life-v69-brazier-citadel | brazier-v69 | +2 | 4110,454.5 | 96×50 | Aucun détecté ; métrologie historique conservée |
| life-v68-2-1 | bench | 0 | 2575,2741 | 150×40 | BENCH_USE_ZONE_CLEAR / exterior-v76-067 |
| life-v68-3-0 | workshop | 0 | 2585,2973.5 | 130×75 | Aucun détecté ; métrologie historique conservée |
| life-v68-4-1 | bench | -1B | 4875,3283.5 | 150×40 | Aucun détecté ; métrologie historique conservée |
| life-v68-9-0 | rock-plant | 0 | 715,1113.5 | 130×85 | Aucun détecté ; métrologie historique conservée |
| life-v68-9-1 | bench | 0 | 1515,1113.5 | 150×40 | BENCH_USE_ZONE_CLEAR / exterior-v76-029 |
| life-v68-14-0 | chest | -1C | 2135,4229 | 80×44 | Aucun détecté ; métrologie historique conservée |
| life-v68-16-1 | bench | 0 | 6005,1904 | 150×40 | Aucun détecté ; métrologie historique conservée |
| life-v68-26-0 | rock-plant | -1B | 3580,3215 | 130×85 | DOOR_APPROACH_CLEAR / residence-undercity-2 |
| life-v68-28-1 | bench | 0 | 1400,1915 | 150×40 | Aucun détecté ; métrologie historique conservée |
| life-v68-33-1 | bench | 0 | 1370,1455 | 150×40 | Aucun détecté ; métrologie historique conservée |
| life-v68-35-1 | bench | +1 | 3680,1415 | 150×40 | Aucun détecté ; métrologie historique conservée |
| life-v68-37-1 | bench | +2 | 4860,1415 | 150×40 | Aucun détecté ; métrologie historique conservée |
| life-v68-38-1 | locker | -1C | 2080,4935 | 70×45 | Aucun détecté ; métrologie historique conservée |
| life-v68-39-0 | chest | -1C | 2970,4375 | 80×44 | Aucun détecté ; métrologie historique conservée |
| life-v68-42-0 | rock-plant | 0 | 1530,1415 | 130×85 | Aucun détecté ; métrologie historique conservée |
| beacon-v64-dock-control | beacon | 0 | 7224.9,3214.2 | 48×45 | Aucun détecté ; métrologie historique conservée |
| beacon-v64-market-armory | beacon | 0 | 1765,2915.5 | 48×45 | Aucun détecté ; métrologie historique conservée |
| beacon-v64-market-canopy | beacon | 0 | 2335,2776 | 48×45 | Aucun détecté ; métrologie historique conservée |
| beacon-v64-deep-forge | beacon | 0 | 3235,3008.5 | 48×45 | Aucun détecté ; métrologie historique conservée |
| beacon-v64-undercity-refuge | beacon | -1B | 4675,3318.5 | 48×45 | Aucun détecté ; métrologie historique conservée |
| beacon-v64-trophy-mausoleum | beacon | 0 | 527.1,2073.3 | 48×45 | Aucun détecté ; métrologie historique conservée |
| beacon-v64-training-hall | beacon | 0 | 2385,1908 | 48×45 | Aucun détecté ; métrologie historique conservée |
| beacon-v64-clan-lodge | beacon | 0 | 3585,2016.5 | 48×45 | Aucun détecté ; métrologie historique conservée |
| beacon-v64-enforcer-bastion | beacon | +1 | 4675,2078.5 | 48×45 | Aucun détecté ; métrologie historique conservée |
| beacon-v64-memory-vault | beacon | 0 | 1315,1148.5 | 48×45 | Aucun détecté ; métrologie historique conservée |
| beacon-v64-pit-gate | beacon | 0 | 2455,1102 | 48×45 | Aucun détecté ; métrologie historique conservée |
| beacon-v64-rite-sanctum | beacon | +1 | 3900.8,926.1 | 48×45 | Aucun détecté ; métrologie historique conservée |
| beacon-v64-throne-audience | beacon | +2 | 4665,1086.5 | 48×45 | Aucun détecté ; métrologie historique conservée |
| beacon-v64-convoy-workshop | beacon | -1C | 2031.8,4301 | 48×45 | Aucun détecté ; métrologie historique conservée |
| beacon-v64-convoy-store | beacon | -1C | 2716.9,4246.2 | 48×45 | Aucun détecté ; métrologie historique conservée |
| beacon-v64-convoy-south-shelter | beacon | -1C | 2545,4791 | 48×45 | Aucun détecté ; métrologie historique conservée |
| beacon-v64-rampart-north-lodge | beacon | 0 | 5805,1939 | 48×45 | Aucun détecté ; métrologie historique conservée |
| beacon-v64-rampart-watch | beacon | 0 | 5993.3,2933 | 48×45 | DOOR_APPROACH_CLEAR / rampart-watch |
| beacon-v64-rampart-south-lodge | beacon | 0 | 5765,3675 | 48×45 | Aucun détecté ; métrologie historique conservée |
| bench-v64-market-armory | bench | 0 | 1425,2955.5 | 150×40 | Aucun détecté ; métrologie historique conservée |
| bench-v64-trophy-mausoleum | bench | 0 | 700.5,2177.4 | 150×40 | DOOR_APPROACH_CLEAR / trophy-mausoleum |
| bench-v64-training-hall | bench | 0 | 2590,1900 | 150×40 | Aucun détecté ; métrologie historique conservée |
| bench-v64-rampart-north-lodge | bench | 0 | 5465,1979 | 150×40 | Aucun détecté ; métrologie historique conservée |
| port-cargo-v64 | chest | 0 | 7580,4500 | 80×44 | Aucun détecté ; métrologie historique conservée |
| garden-v64-rite-sanctum | rock-plant | +1 | 4080,779 | 130×85 | Aucun détecté ; métrologie historique conservée |
| garden-v64-clan-lodge | rock-plant | 0 | 3255,2056.5 | 130×85 | Aucun détecté ; métrologie historique conservée |

## Violations restantes

| Sévérité / règle | Objet / conflit | Position | Action suggérée |
|---|---|---|---|
| warning / BUILDING_REPETITION_LIMIT | residence-terraces-2 / residence-terraces-4 | 0 2270,1340 | Produire une variante native adaptée à cet îlot. |
| warning / BARRIER_CONTINUITY | civic-v81:court:lower-west-rest:wall / — | -1A 2810,4545 | Recomposer la parcelle ou refuser cet objet ; ne pas réduire son contact. |
| warning / BARRIER_CONTINUITY | city-native-v78:terrace-retaining-front / — | -1A 2990,4025 | Recomposer la parcelle ou refuser cet objet ; ne pas réduire son contact. |
| warning / USAGE_SUPPORTED | v75-frontage:dock-control:2 / beacon-v64-dock-control | 0 7225.5,3165.3 | Recomposer la parcelle ou refuser cet objet ; ne pas réduire son contact. |
| warning / USAGE_SUPPORTED | v75-frontage:market-armory:1 / bench-v64-market-armory | 0 1404.8,2825.8 | Recomposer la parcelle ou refuser cet objet ; ne pas réduire son contact. |
| warning / USAGE_SUPPORTED | v75-frontage:market-armory:2 / beacon-v64-market-armory | 0 1815.2,2825.8 | Recomposer la parcelle ou refuser cet objet ; ne pas réduire son contact. |
| warning / USAGE_SUPPORTED | v75-frontage:market-canopy:2 / beacon-v64-market-canopy | 0 2385.2,2670.5 | Recomposer la parcelle ou refuser cet objet ; ne pas réduire son contact. |
| warning / USAGE_SUPPORTED | v75-frontage:training-hall:2 / beacon-v64-training-hall | 0 2435.2,1818.4 | Recomposer la parcelle ou refuser cet objet ; ne pas réduire son contact. |
| warning / BENCH_USE_ZONE_CLEAR | v75-frontage:clan-lodge:1 / garden-v64-clan-lodge | 0 3224.8,1926.9 | Recomposer la parcelle ou refuser cet objet ; ne pas réduire son contact. |
| warning / USAGE_SUPPORTED | v75-frontage:enforcer-bastion:2 / beacon-v64-enforcer-bastion | +1 4725.2,1979.2 | Recomposer la parcelle ou refuser cet objet ; ne pas réduire son contact. |
| warning / BENCH_USE_ZONE_CLEAR | v75-frontage:memory-vault:2 / beacon-v64-memory-vault | 0 1365.2,1063.2 | Recomposer la parcelle ou refuser cet objet ; ne pas réduire son contact. |
| warning / BENCH_USE_ZONE_CLEAR | v75-frontage:pit-gate:2 / beacon-v64-pit-gate | 0 2505.2,994 | Recomposer la parcelle ou refuser cet objet ; ne pas réduire son contact. |
| warning / BENCH_USE_ZONE_CLEAR | v75-frontage:rampart-north-lodge:2 / beacon-v64-rampart-north-lodge | 0 5855.2,1837.5 | Recomposer la parcelle ou refuser cet objet ; ne pas réduire son contact. |
| warning / USAGE_SUPPORTED | v75-frontage:residence-forges-2:1 / exterior-v76-009 | 0 3538,2471.8 | Recomposer la parcelle ou refuser cet objet ; ne pas réduire son contact. |
| warning / USAGE_SUPPORTED | v75-frontage:residence-memory-1:1 / life-v68-33-1 | 0 1318,1416.8 | Recomposer la parcelle ou refuser cet objet ; ne pas réduire son contact. |
| warning / BENCH_USE_ZONE_CLEAR | exterior-v76-008 / exterior-v76-010 | 0 3641,2735 | Recomposer la parcelle ou refuser cet objet ; ne pas réduire son contact. |
| warning / DOOR_APPROACH_CLEAR | exterior-v76-009 / residence-forges-2 | 0 3547,2594 | Recomposer la parcelle ou refuser cet objet ; ne pas réduire son contact. |
| warning / USAGE_SUPPORTED | exterior-v76-009 / exterior-v76-008 | 0 3547,2594 | Recomposer la parcelle ou refuser cet objet ; ne pas réduire son contact. |
| warning / USAGE_SUPPORTED | exterior-v76-011 / civic-v81:deep-forge:1 | 0 3590,3067 | Recomposer la parcelle ou refuser cet objet ; ne pas réduire son contact. |
| warning / DOOR_APPROACH_CLEAR | exterior-v76-020 / residence-terraces-3 | 0 1795,2301 | Recomposer la parcelle ou refuser cet objet ; ne pas réduire son contact. |
| warning / DOOR_APPROACH_CLEAR | exterior-v76-021 / residence-esplanade-2 | 0 1795,1741 | Recomposer la parcelle ou refuser cet objet ; ne pas réduire son contact. |
| warning / BENCH_USE_ZONE_CLEAR | exterior-v76-034 / v75-frontage:pit-gate:1 | 0 1915,1064 | Recomposer la parcelle ou refuser cet objet ; ne pas réduire son contact. |
| warning / USAGE_SUPPORTED | exterior-v76-043 / exterior-v76-044 | -1C 2804,4408 | Recomposer la parcelle ou refuser cet objet ; ne pas réduire son contact. |
| warning / DOOR_APPROACH_CLEAR | exterior-v76-070 / residence-enforcers-1 | +1 4565,2514 | Recomposer la parcelle ou refuser cet objet ; ne pas réduire son contact. |
| warning / BENCH_USE_ZONE_CLEAR | life-v68-2-1 / exterior-v76-067 | 0 2575,2741 | Recomposer la parcelle ou refuser cet objet ; ne pas réduire son contact. |
| warning / BENCH_USE_ZONE_CLEAR | life-v68-9-1 / exterior-v76-029 | 0 1515,1113.5 | Recomposer la parcelle ou refuser cet objet ; ne pas réduire son contact. |
| warning / DOOR_APPROACH_CLEAR | life-v68-26-0 / residence-undercity-2 | -1B 3580,3215 | Recomposer la parcelle ou refuser cet objet ; ne pas réduire son contact. |
| warning / DOOR_APPROACH_CLEAR | beacon-v64-rampart-watch / rampart-watch | 0 5993.3,2933 | Recomposer la parcelle ou refuser cet objet ; ne pas réduire son contact. |
| warning / DOOR_APPROACH_CLEAR | bench-v64-trophy-mausoleum / trophy-mausoleum | 0 700.5,2177.4 | Recomposer la parcelle ou refuser cet objet ; ne pas réduire son contact. |

Les assertions détaillées, objets, parcelles, sources et refus sont reproductibles dans `work-local/v81/homeworld-spatial-audit.json` avec `node scripts/audit-homeworld-placement-v81.mjs --write-docs`. Aucun fichier de jeu ni sauvegarde n’est modifié par cet audit.
