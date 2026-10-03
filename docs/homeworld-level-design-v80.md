# Homeworld V80 — cours, appuis et circulation

Passe du 3 octobre 2026, base publiée V79 conservée. Ce lot corrige la composition et monte des objets séparés ; il ne certifie pas une ville commerciale terminée ni un plan canonique de Yautja Prime. Les noms de cours, meubles civils et motifs nouveaux sont des créations locales du jeu.

## Références et méthode

L’entretien d’Acquire sur Octopath Traveler II explique le travail nécessaire pour faire cohabiter personnages 2D, volumes et caméra, notamment la lisibilité des destinations dans une vue fixe. Nous en retenons la nécessité de régler le point de vue et les relations de taille avant de meubler. Notre renderer orthographique de sprites n’est pas le moteur HD-2D d’Octopath. [Entretien officiel des développeurs, Epic](https://www.unrealengine.com/developer-interviews/octopath-traveler-ii-builds-a-bigger-bolder-world-in-its-stunning-hd-2d-style?lang=en-US).

Le guide Epic recommande une circulation lisible, des passages dégagés et des indices environnementaux pour expliquer les lieux. Dans notre ville, cela se traduit par des cours latérales distinctes de la voie publique, des seuils conservés et des objets liés à la fonction réelle du bâtiment. Ces placements et leurs dimensions sont nos décisions, pas des coordonnées empruntées à ce guide. [Guide officiel de level design](https://dev.epicgames.com/documentation/en-us/fortnite/level-design-best-practices-in-fortnite-creative).

L’entretien de Frogwares consacré à son générateur de ville fournit une référence de construction modulaire et de travail sur le tissu urbain. Il ne justifie pas le remplissage automatique de chaque espace libre ni une identité culturelle Yautja. Notre compilation refuse les candidats qui occupent les accès ou disparaissent derrière une façade. [Frogwares — The Sinking City, entretien développeurs](https://www.unrealengine.com/developer-interviews/discover-how-frogwares-city-generator-is-saving-valuable-time-during-development-of-the-sinking-city?lang=en-US).

## Audit et corrections réellement montées

| Défaut antérieur | Correction V80 | Limite |
|---|---|---|
| Sols de plusieurs étages superposés et rectangles de route dessinés séparément | Un seul plan de sol pour l’étage occupé, deux pendant un vrai transit ; même texture opaque alignée, contours internes supprimés, bord extérieur discret | La texture existante reste répétée ; ce lot n’a pas produit six nouveaux sols ou murs de terrasse |
| Devantures et grandes cours peu différenciées | 113 objets supplémentaires séparés, reliés aux usages halte, entretien, consultation, échanges ou fret | 456 candidats examinés, 343 refusés ; ces nombres ne signifient pas 456 objets livrés |
| Appuis de meubles approximatifs et risque de volumes croisés | Mesures des huit PNG, échelle uniforme et enveloppe convexe de tous les points d’appui ; même volume pour collision et codex | Tolérance visuelle déclarée de 12 pixels source ; pas de métrologie canonique ou de modèle 3D |
| Rayonnage d’archives -1A sous une façade translucide sans lien avec le véritable service | Ancien rayonnage conservé intact, déplacé vers le parvis ouest du `memory-vault`, au niveau 0 | La règle générale d’occlusion ancienne n’est pas remplacée ; nouvelle vue à contrôler en navigateur |
| Cours ressemblantes sans lecture de leur rôle | Libellés locaux de place, maintenance, halte, citerne, artisans et desserte orientale, issus de l’étage et de la position réels | Aucun quartier supplémentaire débloqué ou persisté |
| Intérieurs difficiles à relier à l’extérieur | 43 nouvelles fiches de gabarit dans le codex, associant seuil, approche, enveloppe, pièce existante, zones et éléments intérieurs conservés | Aucun agrandissement de pièce ni palais complet produit |
| Sept haltes portuaires composées du même ensemble | Sept recettes donnent sept signatures de sprites différentes ; 22 substitutions natives sur les 28 objets de halte, six refus gardent leur ancien objet visible et solide | Sept des huit nouvelles sources passent dans les haltes ; le mur reste utilisé sur d’autres devantures, sans réduire son volume pour forcer un placement |
| Grand rectangle de terre nue à droite du port transféré | 20 instances naturelles V71 indépendantes sur les épaules du port et de sa desserte, placées par formations | 44 candidats, 24 refus ; décor naturel non praticable, pas de nouveau biome ou fond de ville aplati |

## Gabarit commun et sources

Caméra yaw 0°, pitch 35°, compression du sol `sin(35°)=0.573576436351046`. Un appui au sol se projette une seule fois par `(x, y×compression−élévation)`. Le sprite entier conserve une échelle uniforme : `hauteurProjetée / alphaBounds.height`. La hauteur projetée inclut le volume oblique du meuble ; ce n’est pas sa seule hauteur physique.

L’adulte de référence mesure 100 unités par convention du projet. Corps physique 48×28, porte minimale 80×128, rue principale 160. Les 43 bâtiments réels, 98 routines d’origine, 14 silhouettes supplémentaires décoratives, 7 raccords physiques et 6 niveaux sont conservés. Le format de checkpoint reste version 1 / layoutRevision 1, lié au propriétaire de la partie. Un ancien point désormais couvert par un meuble revient au vrai port sans modifier la progression ou les octets sauvegardés.

| Source indépendante | Hauteur projetée | Usage |
|---|---:|---|
| `bench-left` | 105 | Banc de halte ; assise estimée vers 41 unités, distincte des 105 unités de silhouette |
| `corner-wall-left` | 105 | Bordure basse native, hors passage ; pas une nouvelle enceinte infranchissable |
| `maintenance-rack` | 125 | Matériel d’entretien d’atelier et de chargement ; pas une arme canonique approximative |
| `clan-lectern-right` | 76 | Consultation civique ; aucun service de quête ajouté |
| `mineral-basin-right` | 58 | Végétation basse originale, aucune espèce canonique affirmée |
| `amber-lamp-post` | 70 | Repère bas de devanture et de cour |
| `sealed-cargo-case-left` | 65 | Charge scellée décorative, non collectable |
| `clan-banner-standard` | 120 | Repère original de consultation ou de logistique, pas emblème officiel inventé |

Les huit PNG ont été ouverts individuellement avec `view_image`. Le manifeste `homeworldNativeDecorV80.json` contient dimensions, alpha, pivot, contacts et SHA. Les pixels générés restent intacts, y compris les variantes anciennes. `docs/art/v80/native-decor/` conserve prompts, source originale, copies byte-identical et révisions d’appuis. Les six images V78 retenues restent explicitement non montées ; une maison oblique prometteuse ne devient pas un bâtiment physique sans seuil/lot/intérieur mesurés.

## Compilation du placement

Chaque devanture suit la tangente et la normale du vrai bâtiment. Chaque cour garde son usage. Aucun objet n’est placé au hasard pendant la partie. Les 456 propositions sont filtrées contre les rues, seuils, paliers, pad du port, trajectoires civiles complètes, solides existants, autres nouveaux solides, support de sol complet et obstruction par la peinture d’une façade située devant lui. Tous les refus restent disponibles dans `HOMEWORLD_CIVIC_REFUSALS_V80` ; le volume n’est pas réduit pour faire passer un candidat.

`homeworldCivicDecorV80.ts` partage les données entre renderer, collision et codex. `homeworldCivicWorldV80.ts` enveloppe le moteur existant sans changer vitesse ou corps. Les deux planificateurs statiques existants utilisent ces solides. Les tests de routes sont une analyse physique ; ils ne doivent pas être présentés comme une promenade effectuée dans le navigateur.

`homeworldCourtArtV80.ts` fournit le même sprite, pivot et volume aux 22 substitutions de halte dans les collisions, le renderer et le codex. Les 52 anciens objets V78 et leurs tailles restent dans `HOMEWORLD_URBAN_LEGACY_PROPS_V78`. Les 52 emplacements actifs gardent leurs IDs et ancres ; un refus ne cache pas un ancien solide derrière une illustration différente. Les six refus sont dus au dégagement réservé de la grande voie.

`homeworldPortShouldersV80.ts` utilise les cellules naturelles mesurées V71 : affleurements, arbres et fourrés originaux. Leurs appuis restent hors support public, avec retrait de 80 unités et contrôle pad/navette/réserves/anciens reliefs. Le rendu et le codex montent chaque instance séparément. Ces objets de sol naturel ne changent aucune limite de marche et ne reçoivent pas de collision invisible.

## Vérification et suite du lot

Première validation avant variation des haltes : 30 tests ciblés réussis sur géométrie/pixels, corpus V78 conservé, circulation, moteur, checkpoints, gabarits et SSR. Le modèle final avec haltes et épaules naturelles passe 33/33 tests, zéro échec, skip, cancel ou todo ; brut conservé dans `work-local/v80/qa/homeworld-targeted-v80-port-final.log`. Les tests V80 parcourent les 98 chemins complets et 14 circuits supplémentaires à un pas maximal d’une unité, vérifient les 43 approches et 14 paliers, et cherchent une observation réellement reliée au port pour chaque objet neuf. Le test du moteur avance par l’intégrateur existant, puis s’arrête devant un meuble. Le SSR vérifie les vrais composants, pas une capture ni une simulation de navigateur. Trois tests de composition supplémentaires contrôlent les sept signatures différentes, les fallback visibles et collidables, la vraie projection et les appuis naturels hors réseau. Les rapports bruts antérieurs restent séparés.

Les nouvelles fiches de gabarit sont également contrôlées contre les 43 pièces effectivement montées. Typage global et lint ciblé Homeworld passent. La recette navigateur sur Next compilé 4204 a vraiment marché depuis le port jusqu’à la halte orientale, puis a rejeté le waypoint (3500,5075), situé dans le chariot V78 conservé. Ce FAIL et ses deux captures sont gardés ; ce n’est ni une rupture de route ni une preuve finale. Le nouveau waypoint (3500,5400) est sur l’axe public. Les variations de haltes et épaules naturelles demandent un nouveau build puis de nouvelles captures. Aucune ancienne image V79 ou ancienne capture 4204 ne prouve ce nouveau rendu.

Réserves à conserver : grandes surfaces encore répétées ; huit façades fermées frontales et de nombreuses vues anciennes ; silhouette monumentale du Conseil/palais et six raccords natifs dédiés non produits ; des intérieurs existants modestes ; pas de nouveaux gestes dessinés de population. Les petits props ajoutés et les chemins testés ne suffisent pas à déclarer la totalité de la ville terminée, belle à tous les angles ou fidèle 1:1 à une carte canonique inexistante.

## Relecture réelle et corrections du troisième candidat

Le deuxième build Next a été joué en contexte QA neuf, au clavier et à horloge réelle : arrivée du port, haltes orientale puis occidentale, entrée et sortie de la Maison de la mémoire, raccord continu vers −1A. Huit vues de props et trois vues mobiles supplémentaires utilisent des checkpoints initiaux déclarés ; elles ne sont pas une marche inventée. Le dossier `work-local/v80/qa/homeworld-final-next2-local-run2` contient 18 captures ouvertes avec `view_image`, zéro hardError et les sources avant/après identiques. Le premier run du même build est conservé en FAIL : le guard a examiné les nouvelles images de pièce avant leur décodage. La recette attend maintenant leur vrai `decode()` puis exige toujours zéro image manquante.

Cette relecture a trouvé des défauts que le DOM et les tests de routes ne révélaient pas : vieux végétaux sur le pad transféré, pupitre presque entièrement sous un fourré et arrivée étiquetée « Cité haute ». Le troisième candidat corrige uniquement ces défauts. Sa nouvelle compilation et ses propres pixels restent nécessaires ; les 18 vues du candidat2 ne sont pas une preuve visuelle de ces corrections.

`homeworldNaturalPlacementsV80.ts` conserve les 374 origines V71/V75 et fournit onze révisions d’ancres, avec mêmes IDs, cellules, pivots, tailles et échelles. La scène et le codex consomment les mêmes positions actives après la transformation historique V77. Ces végétaux étaient non solides : aucune collision naturelle existante n’est supprimée et aucun collider nouveau n’est créé. Trois anciennes bases traversaient néanmoins le support du pad et onze silhouettes recoupaient la peinture du pad ou de la navette ; les nouvelles bases sont hors support public avec 80 unités de marge, les silhouettes sont hors des deux peintures.

| ID conservé | Ancienne ancre | Ancre V80 |
|---|---|---|
| `landscape-v75-179` | 6901,4441 | 6399,4576 |
| `landscape-v75-162` | 6717,4068 | 8197,4068 |
| `landscape-v75-189` | 7387,4153 | 8121,4350 |
| `landscape-v75-161` | 6996,4039 | 8116,3739 |
| `landscape-v75-178` | 7316,4352 | 8127,4569 |
| `landscape-v75-160` | 7194,3883 | 8114,3883 |
| `landscape-v75-171` | 7571,3936 | 8091,4236 |
| `landscape-v75-168` | 6629,4292 | 6179,4552 |
| `outskirts-v71-103` | 6700,3870 | 8051,3090 |
| `landscape-v75-158` | 7129,3737 | 8289,3737 |
| `landscape-v75-167` | 7404,3739 | 8062,3359 |

L’unique `civic-v80:trophy-mausoleum:left:0` conserve son pupitre et son volume ; son ancre passe de (276.1137,2012.8747) à (180,2000), hors appui et peinture du fourré `outskirts-v71-071`. Le candidat généré d’origine reste exporté séparément. Le nom « Port des Chasses » suit uniquement la zone de pad/approche réellement supportée du niveau0 ; les haltes conservent leurs propres noms. Les comptes restent 113 objets civiques, 22 substitutions de halte et 20 nouvelles instances naturelles.

La fixture historique d’entrée manette exécute désormais le vrai `stepHomeworldCivicActorV80` sous le même alias que le Hub. Ses assertions de focus, neutralisation, pause et dialogue ne sont pas assouplies. Les cinq nouveaux tests contrôlent conservation des origines, appuis complets hors réseau, silhouettes hors pad/navette, même placement réel en SSR et codex, pupitre dégagé et nom de port sans faux accès. Ce lot et les seize contrôles d’entrée passent21/21 ; typage global et lint ciblé passent également.

## Recette locale finale du 3 octobre, gel3

Sur la troisième compilation Next de production locale (`http://localhost:4204`), le run neuf du 3 octobre 2026, de 20:27:56.306Z à 20:32:10.846Z, passe sans hardError ni image manquante. Les 18 nouvelles JPG ont toutes été ouvertes avec `view_image` ; la dernière relecture de pixels est enregistrée à 20:36:00Z, puis les fichiers, empreintes et 23 sources avant/après ont été revérifiés à 20:37:06.345Z. Le rapport brut et le reçu distinct sont dans `work-local/v80/qa/homeworld-final-next3-local/report.json` et `visual-review-candidate3.json` ; SHA du rapport : `b7986dc43a6440e6ebb73c4b34f92d4362ab991a50a39f22ddaa3b6ad5e97831`.

Les sept premières vues correspondent à une arrivée de session QA isolée, un déplacement réel au clavier vers les deux haltes et le parvis mémoire, l’entrée et la sortie par le même seuil, puis le raccord continu vers −1A. Les huit vues suivantes de meubles et les trois vues mobiles 390×844 sont des observations par checkpoints initiaux déclarés : elles ne constituent pas une marche depuis le port. Aucun acteur n’a été déplacé par setter en cours de partie, aucune victoire ou récompense n’a été injectée et aucune sauvegarde réelle de l’utilisateur n’a été touchée. Chrome a effectivement reçu et décodé les huit PNG natifs ; leurs réponses HTTP200 et SHA sont conservées.

Les trois corrections de pixels sont confirmées sur ce nouveau build : anciens arbres et fourrés dégagés du pad/navette ; intitulé « Port des Chasses » au vrai port sur desktop et mobile ; pupitre natif visible hors du fourré071 à (180,2000), entièrement corroboré dans la vue de l’étendard. Les haltes orientale et occidentale présentent des usages et des objets distincts, sans obstruer le parcours exécuté.

La relecture conserve les limites de qualité : raccords de pavage rectilignes, grandes surfaces répétées, nombreuses façades frontales, recettes de halte encore similaires dans certaines résidences, sous-sols clairsemés et façade translucide devant la Maison de la mémoire. Le bas de l’étendard reste partiellement masqué par un vieux fourré dans une observation. Aucun de ces points n’est présenté comme une ville entièrement finie. Le lot ciblé sur le gel3 passe 54/54 tests, zéro échec/skip/cancel/todo, brut `homeworld-targeted-v80-gel3-escalated.log` ; l’échec antérieur du bootstrap natif esbuild en sandbox reste conservé séparément. La validation locale ne remplace ni le commit exact, ni l’observation provider READY, ni les futures captures publiques neuves.
