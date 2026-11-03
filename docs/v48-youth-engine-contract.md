# V48 — contrat moteur de formation Unblooded

Source : séquence utilisateur déjà récupérée, résumée dans `work/v47/spec-qa/prologue-source-and-qa.md`. Cette tranche commence après le véritable prologue et l’accueil chef → mentor. Elle s’arrête au matin dans les baraquements : aucune quête du désert, aucun transport personnel ni rang Blooded ne sont inventés.

## Surface pure

`app/game/systems/youthTraining.ts` n’importe ni React, ni stockage, ni image, ni horloge réelle.

- `createYouthTraining()` : état version 1, premier exercice, commandes désarmées.
- `stepYouthTraining(state, input, environment)` : exactement un pas à 60 Hz ; retourne `{ state, events, receipts }` et ne modifie jamais son argument.
- `normalizeYouthTraining(unknown)` : état cohérent ou `null`. Champs physiques bornés, phases/compteurs/prérequis et dates contrôlés ; les commandes restaurées sont toujours désarmées.
- `getYouthObjective(state)` : instruction française, cible physique, compteur utile, temps restant du parcours.
- `getYouthObstacles(state)` : rectangles solides en coordonnées 960 × 540, sol à y = 430, positions d’acteur au niveau des pieds.
- `getYouthReceipts(state)` / `normalizeYouthReceipt(value, state)` : lecture et contrôle des six preuves acquises. Lire un checkpoint n’émet pas de nouvelle récompense.

`YouthInput` : move -1/0/1, jump, light, blade, dodge, throw, interact, confirm, retry ; choice ochre/ash/rust uniquement pour la teinte choisie à l’armurerie. Les actions sont déclenchées sur front de pression, jamais répétées par maintien. Marche/contrôle horizontal en vol acceptent le maintien.

`YouthEnvironment` : assetsReady, pageVisible, paused. Une valeur bloquante fige les acteurs, l’IA, la gravité, les animations et tous les compteurs ; elle désarme les commandes. Tous les axes et boutons doivent être relâchés avant la reprise. Aucun rattrapage d’horloge réelle n’appartient au moteur ; la scène doit plafonner son accumulateur et le vider à pause/blur.

## Progression obtenue par actions

1. Dojo : deux balises de déplacement ; traverse solide à franchir par saut ; esquive au moment d’une attaque annoncée du mentor ; trois coups distincts à portée et orientés vers la cible ; projection physique du mannequin puis atterrissage.
2. Première lame : preuve dojo préalable, déplacement jusqu’au râtelier puis interaction. Aucun simple texte ne termine le dojo.
3. Armurerie : choix explicite de teinte de lien, proximité du râtelier et interaction pour le premier biomask.
4. Camp : trois traversées successives avec deux traverses solides, dans une limite de 35 secondes de simulation. Un échec recommence seulement le parcours ; une pause n’écoule pas ce temps.
5. Duel contre le mentor : coups, lame d’entraînement, esquive et projection, portée et impact à leur frame. Défaite non létale ; réessai frais, preuve de parcours conservée. Succès après KO réel et retour au sol.
6. Baraquements : rejoindre la couche et interagir, nuit de trois secondes actives, arrivée au matin.

Les chiffres de physique et de difficulté sont une adaptation originale pour le jeu, pas des affirmations canoniques. Les preuves n’ajoutent ni XP, ni rang, ni équipement au système adulte ; la couche campagne décide de la persistance et de l’équipement jeunesse distinct.

## Preuves ordonnées et idempotentes

`youth-dojo-completed`, `youth-first-blade`, `youth-first-biomask`, `youth-camp-run`, `youth-camp-duel`, `youth-first-rest`.

Chaque `YouthReceipt` contient `{ id, sourceId: 'youth.training.v48', sceneId: 'unblooded-training', tick }`. L’état contient les mêmes dates dans `milestones`. Une transition réelle émet sa preuve une seule fois. Un checkpoint ne remplace pas une transaction durable : l’interface doit rester bloquée si son écriture échoue, puis réessayer le même état et les mêmes identifiants. La validation structurelle locale ne prétend pas rendre des sauvegardes utilisateur impossibles à modifier.

## Présentation

Poses physiques : idle, jab, blade, throw, dodge, hurt, thrown, ko. Marche et saut se déduisent de la vitesse et de la hauteur. Mentor jab : anticipation jusqu’à la frame 31, impact frame 32, fin frame 50. Joueur : jab impact 8/durée 26 ; lame 12/33 ; projection 14/42 ; esquive durée 23, fenêtre protégée 2–17. Le mannequin remplace le mentor pour dojo-strike et dojo-throw. Les décors, corps Unblooded et mentor Élite doivent être des assets distincts, jamais des Younglings redimensionnés.

## Validation

`node --experimental-strip-types --test tests/youth-training.test.ts` : quinze tests passent, dont une route entièrement jouée par commandes abstraites, chaque checkpoint intermédiaire validé, reprise toutes les 37 frames, perte d’assets/pause, saut avec collision, attaque tenue et hors portée, projection, remise de matériel, chrono, défaite, six preuves uniques et corruption rejetée. Aucun test navigateur ou testeur humain n’est revendiqué par ce seul rapport moteur.
