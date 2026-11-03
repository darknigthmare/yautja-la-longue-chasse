# V46 — QA compétitif THE PIT

Profil : joueur de versus local attentif à la distance, aux coins, aux sauts et à la lisibilité des techniques. Ce profil est distinct des audits ouverture, accessibilité et fiabilité.

## Problème trouvé et corrigé

`PitCanvas` associait `!screenShake` à la réduction des mouvements : désactiver la seule option « Secousse d’écran » désactivait aussi le suivi, le zoom et les différences de parallaxe. Le zoom dynamique existait dans le moteur mais pouvait rester invisible pour ce réglage.

Les secousses et le cadrage sont désormais séparés. Le mode dynamique reste actif quand les secousses sont désactivées. Un bouton local « Caméra dynamique / fixe » permet de choisir explicitement le cadre fixe ; la préférence système de réduction des mouvements reste prioritaire. Le bouton rend ensuite le focus au combat pour ne pas bloquer les commandes clavier. Aucun changement de sauvegarde ou de replay.

Le recul du zoom réagit plus vite que le retour vers les combattants. L’interpolation conserve les marges, les zones mortes et la protection immédiate contre une arme ou un saut coupé. Le plan du sol utilise toujours le même déplacement et la même échelle que les combattants ; les autres plans conservent leur profondeur. Le HUD reste hors transformation.

## Vérifications exécutées

- `node --test --test-concurrency=1 tests/pit-camera.test.mjs tests/pit-arena-rendering.test.mjs` : **21 tests réussis**.
- Un combattant recule, l’autre reste immobile : zoom mesuré de **1,576 à 1,198**, centre horizontal de **477 à 373**. En revenant au contact : zoom **1,915**.
- Pas de saut de zoom pendant marche normale ; cadrage conservé à chaque tick.
- Croisement aérien : pas de téléportation du centre, les identités des emplacements joueurs ne verrouillent pas le cadre.
- Techniques éloignées, armes, accroupissement, sauts, coins : tests de contenance conservés sur tout le roster et toutes les arènes.
- Tous les décors sont rendus en six passes ; sol jointif aux limites de caméra et aligné au plan de contact.
- Préférence système de réduction des mouvements : cadre constant. Retour de replay en arrière : caméra réinitialisée. Observer la caméra ne change pas les octets du combat/replay.
- ESLint ciblé et `node --check scripts/verify-pit-camera-v46.mjs` réussis.

## Recette navigateur exécutée sur le build final

`node scripts/verify-pit-camera-v46.mjs` cible par défaut `http://127.0.0.1:4174` ; variables `V46_CAMERA_QA_URL` et `V46_CAMERA_QA_OUTPUT` disponibles. Sortie : `work/v46/camera-browser-qa/report.json` et captures initiale / éloignée / rapprochée.

Le parcours a réussi le 23 septembre 2026 sur le build local compilé : **4 scénarios réussis**, aucune erreur navigateur ni réponse HTTP en erreur. Rapport conservé dans `docs/v46-camera-browser-qa.json`.

- Recul / rapprochement réels, Versus local, secousses désactivées : zoom **1,5887 → 1,1983 → 1,9174**. L’adversaire reste à x=660 ; le centre de caméra suit le déplacement du seul joueur.
- Les plans réagissent à des profondeurs différentes : au recul, fond **1,0099**, sol **1,1983**, identique aux combattants. Les trois captures ont été inspectées : les pieds restent sur le sol et les corps entiers restent visibles.
- Saut réellement déclenché au clavier : hauteur maximale observée **100,64**, zoom minimal **1,722** ; rectangle du HUD identique avant/après.
- Bouton caméra fixe : zoom **0,9** et centre **480 / 270** conservés pendant le déplacement. Retour dynamique réussi et focus clavier automatiquement restitué.
- Préférence système de réduction des mouvements appliquée en direct : cadre fixe, bouton désactivé et absence de parallaxe relative.

Deux ajustements de la recette, sans changement runtime, ont été nécessaires : maintenir le saut jusqu’au tick qui le reçoit, et attendre la restitution du focus à la frame suivante avant d’envoyer un déplacement après le bouton caméra. Cela évite des faux échecs causés par des entrées automatisées plus rapides que le cycle du jeu.

## Limites

Le choix fixe/dynamique est local à la session THE PIT. Le mode réduit réserve les hauteurs normales du jeu ; aucune promesse de cadrage d’un état arbitrairement corrompu. Le test navigateur ne certifie pas une manette physique ni toutes les combinaisons d’images à l’écran. Les variantes dépourvues d’animations restent affichées selon leur couverture réelle.
