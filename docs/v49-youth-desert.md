# V49 — première reconnaissance accompagnée du désert

## Source et périmètre

Source utilisateur : conversation `6aa9e35a-3288-83eb-a8bf-45d3197113bf`, tour `7efc0ab0-c5af-4bea-a1ba-c62bc14676e2`, conservé dans `work/v36/new-world-specs/youth-thread-page-1.json`. Après dojo, première lame, premier biomask, entraînements et baraquements, le lendemain ouvre une quête désert parmi 15 à 40 autres chasseurs. La petite cage PIT apparaît comme activité secondaire de cette jeunesse. Le vaisseau personnel attend Blooded.

Cette livraison est une **première reconnaissance accompagnée**, adaptation originale bornée. Elle ne prétend pas livrer toute la première mission de chasse, les compagnons à rôles échangeables, le sauvetage, les patrouilles ou le PIT jeunesse. Les chasseurs éloignés peints dans le décor de camp constituent un rassemblement d’ambiance ; aucun multijoueur ni simulation de 15–40 PNJ n’est revendiqué.

## Parcours jouable

Une ancienne sauvegarde V48 au premier matin conserve son étape et ses six preuves. Le départ exige un choix explicite « Partir vers le désert avec le maître ». Depuis la cité, le joueur rejoint physiquement l’instructeur pour retrouver ce point de départ ou reprendre la sortie.

1. Traverser le camp et parler au maître à portée.
2. Rejoindre trois indices distincts : empreintes, branche rompue, pierre striée. Maintenir Interaction 48 ticks actifs sans bouger à portée de chaque indice. Une simple visite, une pression trop courte ou une interaction à distance n’accorde rien.
3. Franchir deux blocs solides et atterrir au-delà du second.
4. Rejoindre le maître et rapporter les observations.
5. Retraverser les blocs, revenir à la balise du camp et interagir pour clôturer la sortie.

Les cinq preuves `youth.desert.v49` restent séparées des six preuves de formation V48 et de la chronique des rites. Elles n’accordent ni honneur, nouveau rang, inventaire adulte, vaisseau, rite des Premières Pistes ou chasse autonome. Le biomask acquis reste conservé : la lecture actuelle est une observation du terrain, pas une animation de port du masque prétendument complète.

## Sauvegarde et contrôles

Le statut `youthTraining.completed` signifie toujours que la formation dojo/camp est achevée, afin de préserver le contrat V48. Les phases `desert-*` déterminent la reprise de la reconnaissance ; une sortie en cours revient à son checkpoint propre, puis `desert-complete` permet le retour à la cité. Le sous-état optionnel `desert` absent d’un ancien V9 se normalise à `null` sans départ automatique.

Les indices, le franchissement et les dates des preuves déjà reconnues ne peuvent régresser dans une écriture ultérieure. Les nouvelles preuves n’entrent que par la progression atomique, jamais par un simple checkpoint. Quota et concurrence conservent les octets de la sauvegarde durable. Le même arrêt sur pause, focus perdu, page cachée, images manquantes et relâchement des entrées reste actif.

## Images

Deux PNG OpenAI natifs conservés sans retouche des pixels : `public/game/youth/v49/desert.png` et `desert-clues.png`. Le fond est calibré sur sa ligne de sol source à y=727 pour la ligne physique y=430. Les trois indices sont découpés par rectangles indépendants ; le bloc de basalte réutilise la pierre pour les collisions. Les personnages conservent leurs atlas V48 avec deux orientations natives. Ce fond est une peinture complète, pas un pack complet de plans de parallaxe séparés.

## Vérification

`tests/youth-campaign.test.mjs` ajoute huit cas : migration V48/départ volontaire, parcours physique complet, observation insuffisante/pause, collisions et sauts, reprise régulière en cours d’action, preuves séparées et idempotence, sauvegardes incohérentes et régressions, quota/concurrence. Avec les suites moteur, campagne, art et présentation V48 : **52 tests réussis** dans `work/v49/youth-hud-tests.tap`.

Recette navigateur : `scripts/verify-youth-desert-v49.mjs`, basée sur `work/v48/public-scene-browser-qa/morning-played-storage.json`, une vraie archive exportée après jeu. Aucune position ou réussite n’est injectée pour la sortie. Le rapport navigateur est écrit séparément après exécution ; ce document ne revendique pas un résultat avant cette exécution.


## HUD jeunesse plein fenêtre

La formation et la sortie désert occupent maintenant la fenêtre entière. Le canvas garde ses proportions 16:9 sans étirement ; le portrait conserve des bandes de cadrage. Objectif, indicateur d’étape, deux jauges du duel uniquement, carnet d’observation et commandes tactiles sont superposés à la scène. Les réglages et les sauvegardes sont accessibles dans la pause, sans barre de page extérieure. Le panneau de pause reprend les instructions complètes lorsque l’espace du HUD est réduit.

Le clavier, la manette virtuelle, les commandes tactiles et les contrôles de sauvegarde conservent leurs protections. Les réglages globaux sont au-dessus de la scène et arrêtent sa simulation ; fermer ces réglages revient à la pause. La nurserie V47 ne reçoit aucun HUD de combat et n’est pas modifiée.

La première recette navigateur désert a réussi ses **5 contrôles** sur le build 1 (`work/v49/desert-browser-qa/report.json`). Les **52 tests ciblés** et le typage passent aussi après le changement HUD (`work/v49/youth-hud-tests.tap`, `work/v49/youth-hud-typecheck.log`). Les captures et rapports du contrôle final HUD seront sous `outputs/qa-commercial-audit/v49/` pour éviter le disque système saturé.


## Résultat final sur le build 2

**28 contrôles navigateur réussis**, sans erreur JavaScript ni réponse HTTP inattendue : 5 sortie désert, 9 accessibilité/HUD, 5 fiabilité et 9 régression complète V48. Le 404 de l’essai d’image manquante est volontaire et sa récupération a été vérifiée. Rapports : `outputs/qa-commercial-audit/v49/final-desert-browser-qa/report.json`, `final-youth-accessibility-qa/report.json`, `final-youth-reliability-qa/report.json` et `final-youth-fullscene-qa/report.json` dans ce même dossier parent.

Revue visuelle effectuée sur les captures bureau, portrait390×844, paysage640×280, retour désert et impact de lame au camp. Les personnages sont séparés aux tableaux de rendez-vous/retour, le HUD n’obstrue pas le combat, les proportions sont conservées et les commandes tactiles restent d’au moins44px. La recette a vérifié le panneau de réglages au-dessus de la scène, le gel des horloges et le retour à la pause. Ces vérifications sont simulées ; aucune manette physique ni quatre testeurs humains ne sont revendiqués. Synthèse structurée : `docs/v49-youth-validation.json`.
