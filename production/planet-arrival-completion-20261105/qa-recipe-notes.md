# Reprise de la recette des cinématiques — 5 novembre 2026

## Point de départ réellement observé

La première recette Chromium de la PR #114 porte sur
`cd586a976a2efa5480bc89ea92c97231f85ae9d4`. Elle a enregistré **125 captures**,
**20 mesures de déplacement** et **44 contrôles réussis sur les 45 entrepris**.
Elle s'est arrêtée au contrôle `Native Reset and Skip retain the same destination
and mount one real hunt`. Ce résultat est historique ; il ne valide pas les
ressources V2 ni les modifications suivantes.

Deux causes distinctes ont été constatées dans son `report.json` :

1. Après l'arrivée naturelle, le vrai briefing de mission recouvrait le bouton
   « Recommencer ». La recette tentait d'utiliser ce bouton avant de terminer le
   briefing. Le clic normal était donc bloqué par la fenêtre modale.
2. Le navigateur demandait **16 ressources absentes du checkout CI** : quinze
   variantes de décor V19 jungle, plus `public/game/sprites/hunter.webp`.
   Le registre de la mission de test utilise `encounterRun = 1` ; la liste de
   fichiers partagée ne couvrait pas toutes les variantes préchargées de ce cas.
   Les erreurs 404 n'ont été ni filtrées ni transformées en succès.

## Corrections de la recette

Dans `scripts/qa-planet-arrival-spatial.mjs`, le parcours clique désormais sur
**« Commencer la chasse »**, attend la fermeture du briefing puis la progression
de l'horloge. Il vérifie que ce passage conserve le même canvas de chasse et les
stockages de campagne. Le bouton « Recommencer » et l'action « Passer l'arrivée »
sont ensuite exercés normalement, avec les contrôles d'identité de destination,
de durée et d'unicité du canvas déjà présents.

Dans `.github/workflows/planet-arrival-spatial.yml`, les fichiers supplémentaires
sont calculés à partir des données de production :

- `resolveDevDestination`, `createDevSave` et `createDevArrival` donnent la vraie
  session d'arrivée `arrival-jungle-vey` et son index de rencontre.
- `planetArrivalLanding`, `getWorldScreenAtX` et `worldScreensFor` déterminent les
  deux secteurs préchargés autour du point d'arrivée : `jungle-lisiere` et
  `jungle-canopy`.
- `environmentPropRuntimeUrlsForSector` donne leurs fichiers exacts pour cette
  rencontre. `GAME_RESERVE_V66_ART.hunter` donne le fichier supplémentaire observé.
- La liste dédupliquée est matérialisée avant le build, puis chaque chemin est
  vérifié. Le calcul local couvre les **16 ressources absentes du premier run**.
  Il n'ajoute aucun nouveau sprite au jeu et ne copie pas le catalogue V19 entier.

## Contrôles visuels ajoutés

Les mesures suivantes lisent le DOM et les styles calculés du vrai composant :

- Chaque éclairage découpé utilise le même fichier alpha que son sprite, avec un
  masque non répété dont le rectangle reste superposé à celui de l'image.
- Pour la coque et la capsule en vol, l'angle du gradient CSS est projeté par les
  matrices effectivement rendues. La source de lumière doit conserver sa direction
  dans la scène malgré la rotation ou le miroir du sprite.
- Les deux panaches de vapeur doivent rester attachés aux évents pendant leur
  changement d'échelle et leur dissipation. Les deux images sont distinctes et
  partagent une enveloppe d'opacité ; la phase fine est observée lorsqu'elle domine.
- Les pieds du chasseur coïncident avec leur point d'appui projeté. La recette
  doit observer les trois contacts : sur le seuil surélevé, pendant le pas vers le
  bas, puis au sol. La découpe de la silhouette doit référencer une vraie ouverture
  SVG pendant le passage de la porte et disparaître une fois le chasseur sorti.
- Les neuf fragments indépendants sont observés pendant l'impact ; ils ne doivent
  ni apparaître avant le contact, ni traverser le sol commun, ni être animés lorsque
  les mouvements réduits sont activés.
- Les variantes glace et eau doivent être les véritables ressources de la
  destination, décodées par le navigateur. Les captures supplémentaires ciblent
  l'impact, la seconde phase de vapeur, l'appui sur le seuil et le pas descendant
  sur ordinateur et mobile. Les masques des deux faces de la porte sont contrôlés.

La recette conserve ses contrôles de perspective, de direction du mouvement,
d'attaches, de redimensionnement, de pause, de chargement des images et d'absence
d'exceptions. Les nouveaux contrôles ne remplacent pas la comparaison artistique
avec les références cinématographiques.

## Validation à cette étape

Effectué localement : syntaxe JavaScript, ESLint sans avertissement, analyse YAML,
`git diff --check` et exécution en lecture seule du calcul de chemins du workflow.
Ces contrôles sont réussis. La recette navigateur complète sur les nouvelles
sources reste à exécuter en CI.

Le lancement local de Chromium a été tenté une fois et a échoué dans
`ProcessSingleton` avec `socket() failed: Operation not permitted`. Aucun réglage
de sécurité ni contournement n'a été appliqué. Ce diagnostic ne constitue pas un
échec du rendu du jeu et ne permet pas de déclarer les nouveaux contrôles navigateur
réussis. Leur résultat doit être conservé avec le commit exact testé et ses captures.
