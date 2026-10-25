# Preserve V109 — Khar-Duun et Iskhel

Deux réserves supplémentaires adaptent des géographies proposées par le catalogue du projet : les canyons désertiques de Khar-Duun et les terrasses glacées d’Iskhel. Ce sont des créations originales compatibles avec le cadre du jeu, sans affirmation de géographie canonique. Chacune possède huit secteurs contigus, seize combattants humains adultes armés, quatre groupes et quatre appareils indépendants. Avec Vharuun et Avar’Kesh, le catalogue jouable définit **32 secteurs et 64 adultes uniques**, sans additionner les versions historiques qui recouvrent Vharuun.

Le nouveau format V5 distingue `khar-duun-canyon-expedition` et `iskhel-ice-expedition`. Choisir une réserve neuve n’actualise aucun ancien checkpoint. Le menu libre et le dossier de campagne proposent les deux terrains ; une reprise conserve l’identité, la graine, les blessures, les stocks, les acteurs, les observations et les événements réels. Les importations et archives refusent les identités croisées, les champs d’autorité inconnus et les créations de matériel. Les formats V6 et supérieurs restent protégés comme futurs.

Les cibles de 80 secteurs et 100 adultes restent ouvertes. Les trois atlas humains existants sont partagés ; ces trente-deux nouvelles identités de simulation n’admettent aucune fiche graphique H001–H100 ni nouveau BODY. Les équipes humaines marchent dans un passage bas continu. Les plateformes constituent les routes hautes du chasseur ; les décors de crevasses et de gorges ne sont pas des trous mortels et les humains n’acquièrent pas de navigation verticale.

## Tracés, art et collisions

Les deux cartes font 12 800 unités, avec une extraction à l’ouest, mais leurs plateformes, hauteurs, couverts, postes, caches et rampes sont définis séparément. Les huit agencements de chaque réserve diffèrent entre eux ; une recoloration de la jungle ne sert pas de nouvelle géographie.

Khar-Duun utilise le fond désertique natif, des corniches de grès, des passerelles minières et des parois d’obsidienne. Iskhel utilise le fond glaciaire natif, des terrasses de glacier, des étais givrés et des piliers de glace. Les huit chemins, tailles et SHA des nouveaux apports sont consignés dans [l’inventaire des sources réutilisées](v109-preserve-public-inputs.json). Le chasseur, les trois atlas humains, les machines et les appareils restent les images déjà utilisées.

Les props V19 conservent leur proportion native : leur bord alpha mesuré, à 24 pixels du cadre, est retiré lors du placement. Les rectangles des couverts et les surfaces des plateformes servent réellement aux vues, aux projectiles et aux atterrissages. Le chargeur vérifie les dimensions des fonds, plateformes, couverts et atlas ; une image incompatible bloque la simulation et propose une nouvelle tentative. Les apices réels des sauts depuis les terrasses hautes sont valides dans les checkpoints V5 ; les anciennes bornes V1–V4 restent identiques.

## Objectifs et décisions humaines

Chaque réserve demande quatre relevés à des postes hauts distincts. Il faut atteindre la bonne plateforme, maintenir Interagir pendant 120 ticks, sans mouvement ni blessure, puis revenir physiquement à l’extraction. Le carnet distingue relevé consigné et relevé rapporté ; un retour avec un bilan partiel reste possible.

Khar-Duun propose de neutraliser au moins un lot dans chacun des dépôts 2, 8 et 14. Chaque lot doit être atteint au sol et neutralisé par le canal réel de deux secondes. Un total obtenu ailleurs ne remplit pas les trois emplacements demandés. Les composants détruits restent dans le bilan des 32 lots conservés et ne retournent ni aux porteurs ni aux appareils. Les gardes-cache se rendent auprès d’un dépôt connu pendant qu’un collègue collecte ; ils reprennent le travail lorsque les pièces sont réunies, le dépôt vidé ou le groupe privé de travailleurs.

Iskhel demande d’identifier deux mécaniciens par observation locale et d’interrompre un véritable départ après démarrage. Une simple réparation sabotée avant les moteurs ne compte pas. Les passagers sortent à leur rampe lors de l’interception ; un appareil parti reste parti. Les couvertures de réparation se placent près d’un mécanicien réellement présent, avec une ligne de vue libre ; elles ne suivent pas un acteur distant ou masqué.

Dans les deux réserves, une menace réellement vue reprend la priorité. Les escortes suivent un porteur proche et visible, les survivants isolés retournent aux travaux et les postes se libèrent pour embarquer. Les objectifs sont calculés à partir des lots neutralisés, rôles effectivement identifiés et interceptions enregistrées : aucun compteur de victoire indépendant n’est sauvegardé. Aucun honneur, équipement, rang ou trophée de campagne n’est accordé.

## Vérifications

Les trois fichiers `tests/game-reserve-biomes-v109.test.mjs`, `tests/game-reserve-biomes-persistence-v109.test.mjs` et `tests/game-reserve-rendering-v109.test.mjs` passent leurs 19 scénarios métier, de persistance et de rendu. Ils vérifient notamment :

- les deux géographies et les comptes uniques ;
- quatre postes par réserve gagnés par les vrais sauts, déplacements et canaux, puis le retour physique ;
- les trois caches différentes de Khar-Duun et les observations de mécaniciens ;
- 12 000 ticks de travail vivant par réserve, avec composants portés, réparations, embarquement et départ des quatre groupes ;
- une interception Iskhel précédée de composants, réparation et embarquement réellement simulés ;
- la monotonie, les champs inconnus, les identités croisées, les importations, slots, archives et refus d’écriture ;
- les bytes initiaux et douze traces V1–V4 de 900 ticks, épinglés avant les modifications V109 dans `tests/fixtures/game-reserve-v108-traces-v109.json`.

Les scénarios de terrain utilisent explicitement seize adultes déjà neutralisés : ils ne prouvent pas une victoire de combat complète. L’interception métier déplace seulement le chasseur à la rampe dans une fixture d’interaction ; toute la préparation de l’appareil et son équipage provient de la simulation vivante. Les fixtures de persistance n’attestent pas des étapes jouées dans le navigateur.

La recette `scripts/qa-preserve-biomes-v109.mjs` vérifie les entrées neuves avec seize adultes sains, un combat et prélèvement réels par réserve, les commandes, les terrains préparés déclarés, les trois caches Khar-Duun, les sauvegardes/reprises/refus, les travaux vivants, les entrées de campagne et les protections historiques/futures. L’itinéraire préparé d’Iskhel laisse ses objectifs secondaires ouverts. Le mode `development` produit seulement `PASS_EXPLORATORY` ; la validation de production exige le build commun, son commit, les rapports bruts complets et les captures inspectées. Aucun résultat V108 n’est réétiqueté comme preuve V109.

Le serveur de rodage partagé peut utiliser `YAUTJA_NEXT_DIST_DIR=.next-dev-v109 node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3102`. Le répertoire par défaut reste `.next` pour les builds habituels ; cette variable sépare les fichiers de rodage du build de production utilisé au port 3101. Ces essais ne valent pas publication ni admission de production.
