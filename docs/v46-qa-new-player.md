# V46 — QA 2 : première découverte de la campagne

Profil : joueur ne lisant ni README ni documentation, au clavier, avec contrôle de la reprise et de la lisibilité à 390 px. Le contrôle navigateur réel a été exécuté sur le jeu compilé à `http://127.0.0.1:4174` par `scripts/verify-first-hunt-v46.mjs` ; aucune manette physique n’est certifiée.

## Constats corrigés

- L’ouverture proposait la personnalisation puis une longue liste complète d’objectifs et de règles. Le premier briefing propose désormais un départ immédiatement visible et garde le texte complet dans une section dépliable. Le bouton historique « Déployer le chasseur » est conservé.
- Une fois dans la clairière, le joueur voyait l’objectif global des trois traces, sans apprentissage progressif. Le guide observe maintenant le déplacement réellement effectué, un départ de saut ascendant et les traces effectivement analysées. Marcher dans le vide, attendre, tomber ou appuyer pendant la pause ne valide pas les premiers pas.
- Les indications s’adaptent ensuite à la proximité réelle des traces en deux dimensions, au coût du scan, au transpondeur restant à récupérer, au combat, au rite de l’insigne et à l’extraction. Un ennemi scanné n’est pas compté comme une trace. Une menace prend la priorité sur les exercices.
- L’aide clavier suit les touches reconfigurées ; les indications de manette reprennent la table réelle du moteur (A saut, LB scan, X mêlée, B interaction). Les boutons tactiles existants restent utilisables. Le guide peut être réduit et rend alors le focus au Canvas, sans empêcher le combat. Le choix réduit/développé survit à Pause/Reprendre ; la relecture QA accessibilité avait identifié et fait corriger sa perte initiale.
- À la reprise d’une chasse suspendue, le guide repart de l’état du monde restauré et ne redemande pas les exercices initiaux. Après une mort, il repart du checkpoint réel (ou des premiers pas si la chasse recommence entièrement). Le guide reste masqué pendant la pause, la défaite et la fin de chasse.
- Sur petit écran le guide occupe une zone distincte au-dessus du Canvas : il ne couvre pas la scène de jeu.

## Intégrité

Le guide n’écrit aucune sauvegarde, aucun trophée, aucun score, aucune preuve de chronique et ne change ni collisions ni dégâts. Il lit une copie des observations du moteur. La progression durable et les recompenses restent sous le contrôle des systèmes existants. Il est limité à Oseris-IV tant que cette mission n’est pas accomplie ; les autres chasses ne reçoivent pas ce guide.

## Périmètre narratif honnête

Le document `docs/nursery-prologue-v37.md` décrit le moteur pur de la nurserie et référence l’instruction utilisateur « Mission jeunesse Yautja », conversation `6aa9e35a-3288-83eb-a8bf-45d3197113bf`, tour `7efc0ab0-c5af-4bea-a1ba-c62bc14676e2`. Cette scène requiert des Younglings et les prises/projections assorties. L’inventaire ciblé ne fournit pas ces animations validées : `youngblood.png` est une planche de chasseur, pas un moveset d’enfant autorisant la scène. Aucun adulte réduit, faux rite ou événement `intro-completed` n’est ajouté.

Le lot avance donc l’ouverture adulte effectivement jouable : personnalisation, préparation abrégée, apprentissage en situation dans la véritable jungle, poursuite du contrat. Ce n’est pas la livraison du prologue de jeunesse ni un nouveau chapitre narratif.

## Vérifications locales

- TypeScript : `npm run typecheck` réussi.
- Lint des six fichiers TS/TSX/JS touchés : réussi.
- `node --test tests/first-hunt-guide-v46.test.mjs tests/hunt-campaign-runtime.test.mjs tests/jump-assist.test.mjs` : **30 tests passés, aucun échec/skip**.
- Huit nouveaux tests couvrent mouvement/saut réels, pause et téléportation, pulsation vide, reprise, portée verticale, énergie, récupération, danger, phase trophée/extraction, immutabilité et la fonction réelle de raccordement du Canvas.
- Recette navigateur du jeu compilé : **5 groupes de contrôles passés**, **zéro erreur console/HTTP**. Nouvelle partie sans injection de sauvegarde, images du briefing réellement décodées, marche puis saut au clavier, premier scan accepté avec **1/3 traces analysées**, réduction/focus, suspension/reprise et contrôle à 390 px.
- Captures desktop, première trace, briefing et mobile inspectées : le bouton de départ guidé est visible, Vey et le décor sont chargés, le guide est lisible et ne recouvre pas le Canvas mobile. Son bouton mesure au moins 44 × 44 px.
- Résultat reproductible et cinq captures : `work/v46/new-player-browser-qa/report.json`, `briefing.png`, `first-steps.png`, `first-trace.png`, `resume.png`, `mobile.png`. La recette peut aussi viser une URL publiée avec `V46_QA_URL` et un autre dossier via `V46_OPENING_QA_OUTPUT`.
- Build, tests complets et publication sont réalisés par le lot commun. Ce scénario n’atteste pas une complétion intégrale des huit chasses.
