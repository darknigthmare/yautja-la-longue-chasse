# V33 — décors indépendants et nouvelles animations OpenAI

Ce lot avance la demande de100 arènes, dix plaquettes par chasseur connu et véhicules animés. Il ne termine pas cet ensemble. Les fichiers sont réellement générés avec l’outil OpenAI intégré ; les originaux, prompts, empreintes et décisions de revue sont conservés. Aucun catalogue ou brouillon n’est compté comme contenu jouable terminé.

## Contenu intégré

| Surface | Résultat de ce lot | Limite |
| --- | --- | --- |
| THE PIT |22 PNG,17 sous-plans,6 plans ; braseros et six dessins de flamme indépendants, portes et trophée séparés | Une arène existante reçoit son kit ; le décor de porte ne simule pas une ouverture jouable |
| Hall des Trophées |14 PNG,14 sous-plans,6 plans ; vitrines, trophées, lumières, sol et premiers plans séparés | L’ancrage vertical suit le sol ; la profondeur horizontale reste indépendante |
| Berserker |7 pages acceptées,54 dessins,26 clips de moteur pour14 séquences orientées | Neutre, accroupissement, garde haute, recul, trois attaques debout ; les autres actions restent manquantes |
| Atelier OpenAI V33 |60 images indexées avec SHA, état de revue, contrôle clair/sombre, orientation et lecture des dessins | Les corrections rejetées restent consultables, mais leur lecture animée est désactivée |
| Moto antigrav originale |4 planches de revue publique : identité, deux propositions de stabilisateurs, propulsion séparée | Aucun véhicule pilotable ni clip de conduite accepté ; ce n’est pas une réplique1:1 de Badlands |

Les31 sous-plans des deux décors produisent36 images, car la flamme en comporte six. Les20 planches Berserker produites incluent les dix corrections :7 sont acceptées,5 restent en revue et8 sont rejetées. Les26 clips séparent notamment les phases des attaques ; ils ne représentent pas26 longues animations indépendantes.

La moto compte6 sources réelles, dont2 brouillons rejetés hors du lecteur. La seconde proposition de stabilisateurs contient4 dessins par orientation avec rectangles explicites. La propulsion possède8 dessins sur alpha natif, avec points d’émission alignés pour la revue. Les originaux ne sont ni découpés ni recolorés sur disque.

## Sources récupérées et manques

La discussion « Ajout des véhicules Yautja » fournit50 entrées :24 utilitaires de clan,10 Bad Blood/Enforcer,16 montures biologiques. Ses fichiers ZIP annoncés ne sont pas disponibles ; leur contenu n’a pas été inventé. La discussion « Concevoir le DLC » couvre36 familles corporelles, techniques, projections, victimes, effets et finishers : dix familles initiales ne peuvent pas remplacer cet ensemble.

Le catalogue local contient100 fiches d’arène, dont8 jouables et92 concepts. Seuls2 kits reçoivent les nouveaux sous-plans V33. Le lien exact de la discussion des100 arènes reste nécessaire pour confirmer chaque nom, chaque plan et chaque sous-plan. Les deux kits présents sont des propositions originales documentées à partir du projet, pas une transcription certifiée de cette discussion absente.

Le roster conserve215 designs individuels,49 autres lignes de production/recherche et3 variantes humaines demandées. Il ne certifie pas267 personnages canoniques distincts. Aucun chasseur n’est déclaré entièrement animé. Pour Berserker, les priorités restantes sont la marche avant, les sauts/réceptions, les impacts et réactions de garde, la garde basse, les sorties de posture, les attaques basses/aériennes, les techniques, saisies synchronisées, victimes et finishers. Une pose tenue ne compte pas comme animation de ces actions.

## Vérifications reproductibles

Les recettes complètes des deux décors passent dans le parcours réel Jouer → THE PIT → Entraînement, sur ordinateur et mobile :36 fichiers chargés,6 plans par décor, aucune image manquante, aucune erreur JavaScript/HTTP. La recette du Hall vérifie aussi l’appui des structures sur le sol lorsque la caméra se déplace et zoome.

Le lecteur charge et vérifie les60 empreintes, parcourt8 dessins de stabilisateurs et8 dessins de propulsion, puis provoque une image manquante pour contrôler l’effacement de l’état périmé et la récupération. Le navigateur de jeu vérifie les trois phases des attaques de Berserker, l’accroupissement, la garde et le recul dans les deux orientations. Des points magenta isolés restent visibles sur certains détails du personnage et sont documentés ; aucune transparence fictive ni aplat magenta n’est accepté.

Commandes :

- `node scripts/build-hunter-production-v33.mjs` puis `--check` pour le rapprochement du roster et des clips.
- `node scripts/build-production-review-v33.mjs` pour reconstruire le lecteur à partir des sources contrôlées.
- `node scripts/verify-pit-arena-production-v33.mjs` pour vérifier empreintes, alpha, découpes et preuves d’intégration.
- `node scripts/verify-pit-v33.mjs`, avec `V33_QA_ARENA=the-pit` puis `trophy-hall`, pour le parcours de jeu.
- `node scripts/verify-production-review-v33.mjs` pour le lecteur.

Les preuves des décors sont dans `v33-the-pit-fullapp-qa.json` et `v33-trophy-hall-fullapp-qa.json`. Le manifeste Berserker distingue chaque source acceptée ou rejetée. Les recettes visuelles brutes et les conversations récupérées restent dans le répertoire privé et ignoré `work/`.

Cette livraison concerne le moteur commun et sa publication web V33. Le paquet Windows existant conserve son numéro V32 tant qu’un nouveau paquet n’a pas été construit et testé séparément ; aucun exécutable V33 n’est annoncé ici.
