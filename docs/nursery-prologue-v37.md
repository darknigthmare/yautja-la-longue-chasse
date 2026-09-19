# Nurserie — moteur de la première séquence

Source : instruction utilisateur de « Mission jeunesse Yautja », tour `7efc0ab0-c5af-4bea-a1ba-c62bc14676e2`, conversation `6aa9e35a-3288-83eb-a8bf-45d3197113bf`. Le titre conservé est **Yautja: The Long Hunt**. Les réglages de combat et durées de caméra sont une adaptation 2D du jeu.

## Périmètre réel

`nurseryPrologue.ts` fournit une simulation pure à 60 Hz, un adversaire CPU, un réalisateur de caméra et un adaptateur pour `requestAnimationFrame`. Ce lot ne raccorde pas encore la scène à GameClient, ne fournit pas de nouveaux dessins et ne change aucune sauvegarde.

La scène nécessite de vrais assets de Youngling. Un rig adulte réduit, une silhouette CSS/SVG ou un PNG statique présenté comme un moveset complet ne sont pas des solutions de remplacement. `assetsReady` doit rester faux jusqu'à validation de la couverture réellement employée.

## Séquence

1. Chargement : aucune simulation tant que les ressources requises sont indisponibles.
2. Écran noir et confirmation ; une touche déjà tenue ne saute pas l'invite.
3. Arrivée : cris de foule à déclencher par l'événement de phase, puis défloutage vers l'arène.
4. Prêt : maintien continu de 120 ticks (2 secondes) ; relâcher annule. L'option `readyMode: "press"` permet une simple pression explicite.
5. Duel sans HUD : déplacement, poings, ramassage d'une petite lame détachée puis attaque, esquive et projection balistique. Les actions de combat utilisent les fronts de pression, pas la répétition d'une touche tenue.
6. KO non létal : le perdant tombe réellement ; le joueur perd le contrôle de l'acteur. En cas de défaite du joueur, l'action `retry` relance la préparation sans preuve ni récompense.
7. Révélation du village construit autour d'un squelette de scolopendre ancien, sec et évidé ; caméra ensuite vers la lune rouge et le titre.
8. Fin du titre ET disponibilité du prochain chapitre : émission unique de la preuve `intro-completed`.

Les piques bordent le dispositif de l'arène pour les spectateurs : le moteur n'invente pas de piège mortel dans ce combat d'enfance. La jauge interne de résistance sert au KO ; elle n'est pas fournie dans le modèle de présentation.

## API de raccordement

- `createNurseryPrologue({ readyMode? })` : état initial, aucune progression acquise.
- `stepNurseryPrologue(state, actions, environment)` : un tick, retourne `{ state, events, completion }`.
- `createNurseryFrameAdapter(state?)` puis `advanceNurseryFrame(adapter, actions, environment, timestampMs)` : adaptateur à accumulateur pour une boucle Canvas.
- `getNurseryPresentation(state)` : plans caméra, défloutage, progression du geste Prêt, poses/encombrement des deux Younglings, lame au sol, titre ; `hud:false` et vision naturelle rouge/orange/jaune.
- `normalizeNurseryCheckpoint(raw)` : état copié et validé ou `null`. La reprise remet les touches au neutre et annule un maintien partiel.

Les actions abstraites sont `move` (-1/0/1), `confirm`, `ready`, `light`, `blade`, `dodge`, `throw`, `pickup`, `retry`. Le clavier et la manette ne sont pas lus par ce module. L'adaptateur de commandes doit gérer ces correspondances sans détourner les réglages du joueur.

L'environnement fournit quatre booléens explicites : `assetsReady`, `pageVisible`, `paused`, `nextChapterReady`. Un onglet masqué, une pause ou une perte de ressources fige acteurs, IA, animations de combat et caméra. Le maintien Prêt est annulé et une frame neutre est nécessaire à la reprise. L'adaptateur efface son horloge à la pause ; il rejette les écarts supérieurs à 250 ms et limite le rattrapage visible à six ticks. Ne jamais rejouer le temps passé en arrière-plan.

Le seul événement autorisant le raccordement ultérieur à la chronique est `result.completion`, produit lors de la transition finale. Il contient `id: intro-completed`, `sourceId: chronicle.intro.completed`, l'identifiant de scène et le numéro de tentative. Un checkpoint restauré déjà terminé n'émet pas à nouveau cette preuve. La validation du checkpoint est structurelle, pas une protection cryptographique contre la modification volontaire d'une sauvegarde locale.

Le raccordement futur doit appliquer durablement preuve + reconnaissance de fin de nurserie, sans convertir les acquis de la campagne adulte V35 et sans octroyer de récompense via un bouton d'essai. La validation durable du prochain chapitre appartient à GameClient : le moteur pur n'écrit rien.

## Besoins de présentation

Les deux acteurs exigent des poses de Youngling cohérentes : attente, marche, geste Prêt, poing, lame, prise/projection et réaction de la cible, esquive, impact, chute/KO. Les prises doivent partager contact et chronologie. Le modèle expose leurs orientations natives, ne reflète aucun équipement asymétrique et ne sélectionne aucun fichier adulte.

Le Canvas doit dessiner la lame soit au sol, soit dans la main indiquée, jamais aux deux endroits. Les dessins ne déterminent ni les collisions ni l'instant des impacts. Le modèle ne présente aucune barre de vie/XP pendant ce niveau.

## Vérification

21 tests ciblés passent : chargement, touches tenues, 2 secondes de Prêt, accessibilité, pause/onglet, coups/range/rythme, ramassage, esquive, projection, frontières, KO, défaite/retry, caméra/titre, émission unique, checkpoints, déterminisme et horloge Canvas. Une séquence complète depuis l'écran noir bat le CPU uniquement avec les commandes abstraites, sans modifier les caractéristiques des acteurs.

Commande : `node --experimental-strip-types --test tests/nurseryPrologue.test.ts`.

Types et lint ciblés validés. Aucun contrôle visuel ni raccordement manette matériel n'est déclaré dans ce lot ; la scène n'est pas encore affichée par le jeu.
