# V75 — Repères pratiques de la cité

Le bouton **Repères** du HUD ouvre un registre des destinations physiques. Il complète l’Atlas des quartiers et son codex : 43 bâtiments, 16 interlocuteurs/postes et les départs régionaux actuellement visibles. Les coordonnées proviennent des modèles de bâtiment, de pièce et de seuil utilisés par le jeu, sans catalogue parallèle.

Les recherches acceptent les accents français, plusieurs mots et les fonctions courantes des services : soins, dojo, armurerie, archives, amarrage. Une catégorie ou une recherche sans résultat ne laisse pas une ancienne destination activable. Les détails expliquent la différence entre une entrée visitable et une activité encore réservée.

## Permissions et cohérence

- Les villages ordinaires suivent `canEnterHomeworldRegionV68`, donc la chaîne réellement validée de formation et de Premières Pistes. Les régions fermées expliquent cette condition sans proposer de départ.
- Le poste de la Réserve interdite est entièrement masqué tant que son autorisation réelle manque : pas d’entrée, de coordonnées ou de panorama divulgués par le registre. `homeworldWayfindingRegionVisibilityV75` partage cette règle avec l’Atlas existant.
- Le jeune peut rejoindre physiquement un maître ou une porte de service. Les cinq stations de chasseur autonome et le vaisseau personnel conservent leurs restrictions. Ce registre ne donne ni arme, vaisseau, soin, preuve, rang ni permission.
- Les institutions et usages locaux décrivent cette cité originale du jeu ; ce ne sont pas des architectures ou gouvernements universels prétendument canoniques.

## Marche et espaces

`homeworldWayfindingPlanV75(save, actor, interiorId, id)` utilise l’A* existant de la cité. Le routage intérieur échantillonne les vraies collisions du mobilier, des partitions et des personnages ; la cible est une approche publique d’interaction, jamais le centre solide d’un PNJ. Le BFS local est borné et ses cellules ont des indices entiers même lorsque le départ du joueur n’est pas sur la grille.

Un changement de bâtiment produit jusqu’à trois étapes : sortie réelle de la pièce, rue jusqu’à la vraie porte, approche intérieure du poste. **Interagir** reste obligatoire pour changer d’espace ou parler. Aucune position du joueur n’est écrite par ce module, et aucun déplacement automatique n’existe.

Le HUD lit l’acteur réel toutes les 350 ms et choisit un prochain point visible autour des obstacles. Il indique la direction selon la projection de la caméra, la distance piétonne et l’instruction au seuil. A*/BFS s’exécutent uniquement sur une demande explicite ou un changement physique d’espace, pas à chaque image ni à chaque rafraîchissement du HUD. Un recalcul volontaire est proposé si le joueur s’écarte du trajet. Le repère reste local à la session et peut être effacé ; aucun schéma de sauvegarde n’est ajouté.

## Contrat d’intégration

Composant par défaut : `HomeworldWayfindingV75.tsx`. Propriétés : `save`, `actor` en coordonnées de sol, `interiorId`, `open`, `disabled`, `suspended`, `onOpenChange`, `targetRequest?: {id, nonce} | null`. `showToggle` vaut `false` par défaut pour conserver un unique bouton dans le HUD du parent. Les conseils des habitants emploient les mêmes IDs `building:…`, `point:…` ou `region:…`.

Le parent détient la pause, l’exclusion des autres fenêtres, l’effacement des touches maintenues et la restitution du focus de la cité. La fenêtre intercepte les touches, piège Tab et prend en charge Échap/B ainsi que la navigation de manette. Le guide suspend ses lectures avec la pause et ne peut pas recalculer en arrière-plan. Le scrim est au-dessus de l’Atlas existant ; le registre ne doit jamais laisser un autre piège de focus actif dessous.

Les propriétés vivantes sont synchronisées après le commit React dans un effet de layout. Les nouveaux conseils et transitions sont traités sur une prochaine image annulable ; une révision de plan donne priorité à la sélection explicite la plus récente. Une permission retirée masque immédiatement le guide dans le rendu, sans attendre ce traitement. Le retour régional qui remet `targetRequest` à `null` autorise ensuite une nouvelle séquence de conseils à partir de son premier nonce.

## Validation

`node --test tests/homeworld-wayfinding-v75.test.mjs` : **10 tests PASS**, comprenant tous les 43 trajets de porte, les neuf approches régionales autorisées, les 16 postes (avec leurs approches intérieures), toutes les sorties de pièce depuis un départ fractionnaire, les murs/PNJ solides, l’aller d’une pièce à une autre, les accès de jeunesse, la Réserve masquée, les recherches et l’absence de mutation de sauvegarde.

ESLint sur le composant et son modèle : **exit 0**, sans désactivation des règles React. Le contrôle court du candidat portrait 393×852 a montré puis corrigé le recouvrement du jeune : guide compact de 117,94 px à y508,06 ; boîte native du jeune y378,74–459,35, sans intersection. La fenêtre conserve une liste de résultats lisible et défilable. Preuves : `work-local/v75/qa/wayfinding-mobile-preview/`.

Recette navigateur : `scripts/verify-homeworld-wayfinding-v75.mjs`. Elle utilise une archive issue d’un vrai parcours du modèle de campagne, puis la marche clavier publique, les portes réelles et une sélection tactile CDP. Elle vérifie le focus, les filtres, la pause, les instructions d’arrivée, la distinction activité/lieu et la fenêtre portrait avec mouvement réduit. La version compilée attend la disponibilité native V74 avant le premier pas, sans décodage artificiel des images.

Sur le serveur de développement uniquement, `V75_QA_NATURAL_HYDRATION=1` laisse l’hydratation naturelle avant d’installer l’horloge de recette. Utiliser `localhost:4193` pour éviter les reconnexions HMR constatées sur l’origine `127.0.0.1`. Les gates finales compilées et publiques doivent employer leur propre dossier de preuves et contrôler la version V75. Les captures du candidat ne constituent pas une preuve de publication.

La **compilation finale locale V75**, comprenant les deux portails civiques corrigés, a passé **10 contrôles navigateur / 14 captures**, sans erreur JS, console ou HTTP (`work-local/v75/qa/wayfinding-local/report.json`, serveur compilé `http://127.0.0.1:4192`). Elle remplace la preuve précédente du candidat compilé. Les 14 captures ont été inspectées : trajet clavier jusqu’à la porte puis à l’officier, sortie de sa pièce, rue jusqu’à l’armurerie puis approche de l’artisane, interaction explicite, pause, recherche et choix tactile portrait. Les cavités des portails des quais et de l’armurerie sont désormais opaques dans les vues extérieures.

Le contrôle portrait final mesure la boîte native du jeune y351,83–432,55, le guide de 300 × 99,94 px à y526,06–626 et le bouton d’interaction y635,5–694 : aucune intersection. Les détails longs et le bouton Suivre exigent de défiler dans le panneau portrait ; la liste et le détail conservent chacun leur surface de lecture. Aucune modification de position ou de sauvegarde n’est provoquée par la sélection tactile ou l’effacement du repère. Cette preuve confirme la version locale compilée ; la publication et son parcours public restent des gates distinctes.

La dernière compilation locale, conservant les balises natives, a rejoué ce parcours avec **10 contrôles / 14 captures PASS** (preuves fraîches du 2 octobre 2026, 17:15–17:16 heure locale). Le parcours complémentaire `work-local/v75/qa/conversations-local/report.json` a passé **3 contrôles / 7 captures**, également relus : rencontre clavier d’un Aspirant réel, ses trois sujets sans mutation de sauvegarde, puis conseil en portrait vers `building:convoy-workshop`, marche jusqu’à sa porte et entrée physique dans l’atelier. Un ancien filtre Sorties et sa recherche ne détournent pas le conseil : le registre revient à Tous, recherche vide, avec le détail exact du bâtiment. Ce contrôle porte sur un habitant rencontré, pas sur 98 conversations jouées manuellement.

Limite de composition constatée dans les captures complémentaires : le sujet « Les lieux proches » est long, et ses boutons Repérer exigent de défiler en portrait. Le détail du bâtiment conseillé est lisible dans le registre, dont la liste conserve sa position de début. Aucun recouvrement du guide avec le jeune ou le bouton d’interaction n’a été constaté sur ces preuves finales.

Limites : la recette n’est pas une rejouabilité navigateur de toute la campagne ; la progression préparatoire vient du modèle joué. Le mobile est une émulation Chrome, pas un téléphone physique. Ce lot ne termine pas tous les autres chantiers du jeu.
