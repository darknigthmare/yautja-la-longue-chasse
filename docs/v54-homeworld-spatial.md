# V54 — cité et atlas spatial

## Géographie jouable

Le monde passe de 5200 × 2600 à 6300 × 3400 unités, sans redimensionner un panorama. Les coordonnées des 25 points historiques, du départ, des 12 quartiers initiaux et des 13 bâtiments historiques restent inchangées. L’empreinte et les vitesses du chasseur restent identiques.

Deux secteurs originaux s’ajoutent :

- Ateliers des convois, au sud : trois bâtiments extérieurs et deux accès indépendants, depuis les quais et depuis les forges.
- Promenade des remparts, à l’est : trois bâtiments extérieurs et trois accès, depuis la citadelle, le bastion et les galeries basses.

Les quartiers constituent des boucles de promenade et des découvertes persistantes, pas de nouvelles expéditions ni de faux intérieurs visitables. Les portes des six bâtiments sont explicitement des approches extérieures. Au total : 14 quartiers, 14 polygones de liaison, 19 bâtiments et 12 repères directionnels au sol. Tous les seuils sont raccordés au terrain marchable et aux collisions existantes.

Les façades qui couvrent le personnage par l’arrière s’effacent à 32 % selon sa position réelle. Les collisions restent actives ; aucune traversée de mur n’est accordée. Les occlusions de premier plan et les pivots alpha existants sont préservés.

## Atlas concret et réutilisable

`systems/homeworldSpatialCodex.ts` dérive ses 14 lieux de `HOMEWORLD_DISTRICTS` et des seuils réels de `HOMEWORLD_BUILDINGS`. L’onglet implantation réutilise les mêmes calculs que le runtime : pivots, boîtes d’image, profondeur Y, largeur de passage, collision des bâtiments, plans des props et rayons d’effacement. `HOMEWORLD_PLACEMENT_RULES` est partagé entre collision, rendu et codex.

Le trajet utilise A* sur une grille de 64 unités et vérifie chaque segment tous les 4 points avec l’empreinte complète du chasseur et une marge supplémentaire de 12 unités. Cette marge diminue uniquement à l’approche des extrémités pour conserver les seuils de porte ; les nœuds de grille exigent toujours la marge complète. Les extrémités sont reliées à la grille sans traverser de solide. La carte ne déplace jamais le personnage et ne déverrouille aucun service. Le repère indique le prochain point visible, l’arrivée ou le besoin de recalcul après un détour. Il se rafraîchit au maximum toutes les 350 ms sans toucher à l’horloge de simulation.

La recette navigateur initiale a révélé un faux raccourci à la jonction clans/forges : les anciens échantillons espacés de 16 unités sautaient une courte zone non marchable ; le clavier s’arrêtait vers 3589,1608. La correction porte exclusivement sur le routeur. La collision et le terrain n’ont pas été assouplis. Une régression vérifie les segments rejetés, puis le nouveau chemin à chaque unité et avec de vrais appels à la simulation au sol. L’inspection visuelle a aussi révélé que la navette masquait le point de départ historique : seule l’image s’efface désormais quand elle couvre le héros derrière ; départ, service et collisions restent identiques.

Le modal garde le focus clavier, gère Tab/Échap et restitue le focus à la cité. Son ouverture suspend les entrées clavier/tactile/manette par le raccord Hub. L’atlas ne lit ni n’écrit directement le stockage. Seule une entrée réellement jouée dans un quartier déclenche la persistance habituelle des visites. La file de visites refusées, le prologue, le rang, les trophées et les accès adultes demeurent sous leurs garde-fous existants.

## Lore et assets sources

Le plan, les noms de quartiers et les institutions de cette cité sont des adaptations originales du projet. Ils ne constituent pas une carte canon officielle ou une monarchie universelle des Yautja. L’atlas sépare ce statut du seul motif attesté documenté ici : le mur de trophées du vaisseau de *Predator 2*, décrit par [NECA pour sa réplique](https://store.necaonline.com/blogs/news/now-shipping-predator-trophy-wall-diorama). Cette source ne justifie aucune rue ou institution inventée.

L’archive locale `YAUTJA_PLANETES_TRIBUS_V2_119_PNG.zip` a été inspectée en lecture seule. Les entrées `images/homeworld_scenes/HOMEWORLD_*_V2.png` et leurs imports V37 sont des panoramas complets. Les versions lave et sous-cité montrent une ambiance cohérente mais ne sont pas des modules transparents. Elles ne sont donc pas étirées, découpées automatiquement ou transformées en props.

Trois modules OpenAI ont passé l’inspection de vue, alpha, proportions et pivot. La première version du relais a été rejetée : sa porte devenait trop petite. La version compacte est réutilisée six fois à échelle identique dans des boîtes de 520 × 330 unités, avec une ouverture d’environ 171 × 207 unités pour un rig de personnage de 132 × 205. Aucun étirement ni recadrage n’est appliqué. Les 16 bornes obliques utilisent toutes la même boîte peinte de 76 × 128 ; le total atteint 27 props indépendants. Le pavement est un matériau zénithal répété en panneaux carrés de 240 unités avec joints visibles : il n’est pas déclaré seamless. Il remplace les murs latéraux précédemment utilisés comme sols.

Les PNG restent strictement identiques aux sources OpenAI. Le registre `systems/homeworldCityArtV54.ts`, les tests pixels et `docs/art/v54/homeworld-modules-provenance.json` conservent SHA-256, dimensions, bounds alpha et décisions d’acceptation/refus. Les prompts exacts sont dans `docs/v54-openai-prompts.json`.

## Validation

Les tests spatiaux vérifient les 14 trajets depuis le départ, leurs segments avec volume du chasseur, les deux boucles, les destinations bloquées/corrompues, les données d’implantation, la séparation lore/adaptation, l’occlusion et la conservation des données lors d’une nouvelle visite. Les tests historiques des 12 quartiers de service restent appliqués ; seuls les deux quartiers de promenade n’ajoutent pas de service fictif.

`scripts/verify-homeworld-spatial-v54.mjs` exécute 13 contrôles navigateur après compilation commune. Il part de l’archive d’une victoire de pouponnière réellement jouée, utilise le clavier avec le temps réel, sans injection d’acteur, de progression ou d’horloge, et mesure les sauvegardes avant/après. Un contrôle distinct émule les entrées manette par `navigator.getGamepads` ; il ne constitue pas une recette matérielle. Il enregistre des captures desktop/mobile et ferme son navigateur en cas de réussite comme d’échec. Les preuves navigateur restent distinctes des tests de modèle.

La validation locale finale a réussi : 65 tests ciblés et 13 contrôles navigateur, sans erreur JavaScript ni réponse HTTP en échec. Les deux secteurs ont été atteints avec les entrées clavier réelles. Les sauvegardes complètes restent identiques octet pour octet pendant la consultation de l’atlas ; pendant la promenade, seules les découvertes de quartiers attendues évoluent. Le navigateur est fermé.

Les huit captures de `outputs/qa-commercial-audit/v54/homeworld-spatial-browser-qa-run3` ont été inspectées : départ visible derrière la navette, modules et bornes à échelle uniforme, portes proportionnées, façade effacée derrière le héros, parcours est/sud et carte mobile sans débordement horizontal. La mention d’adaptation est visible sur mobile ; le lien de source attestée est plus bas dans la zone défilante et vérifié dans le DOM. Le manifeste local `outputs/qa-commercial-audit/v54/homeworld-spatial-local-manifest.json` consigne les empreintes du rapport, des captures et du journal de tests. Les échecs initiaux sont conservés dans les dossiers `run1` et `run2`. Ce résultat local ne constitue pas encore une validation du déploiement public.
