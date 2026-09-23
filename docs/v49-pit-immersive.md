# THE PIT V49 — combat immersif

Le combat occupe toute la fenêtre (`100dvh`), avec la scène en fond et le HUD superposé : noms, vie, Traque, manches, chronomètre et états actifs. Les phases internes IDLE/STARTUP/RECOVERY sont réservées à l’entraînement. Les données d’animation, les commandes complètes et le réglage de caméra sont dans le menu de pause. Les gains de Traque passifs restent dans la jauge ; les notifications centrales actives expirent selon les ticks de simulation, donc restent gelées pendant la pause.

Le format 16:9 de l’image n’est ni étiré ni recadré pour remplir artificiellement un téléphone vertical. Les écrans portrait et très larges conservent des bandes libres. Les contrôles tactiles restent dans des zones sûres, avec cibles de 44 pixels au minimum. Le laboratoire se superpose à la scène au lieu d’en réduire la taille ; il peut être fermé, gelé et avancé d’un seul tick comme auparavant.

## Pause et navigation

- Échap et Start ouvrent une vraie pause ; le bouton HUD ouvre le même menu.
- Le temps, le CPU, la lecture replay et les déplacements sont arrêtés pendant cette pause.
- Quitter la fenêtre, masquer l’onglet ou déconnecter une manette provoque une pause de protection. La reprise est explicite.
- Le focus reste dans le menu. A valide, B reprend ; les touches maintenues et axes doivent revenir au neutre pour éviter une action résiduelle.
- Le plein écran natif est déclenché seulement par un bouton. Son refus n’empêche pas le mode occupant toute la fenêtre. Sa fermeture remet le combat en pause.
- Le retour à la campagne restaure exactement les styles de défilement précédents.

## Vérifications

Le deuxième build intégré V49 a passé les **16 contrôles navigateur** le 23 septembre 2026 : 10 immersifs, quatre de caméra et deux de fin de match/replay. Deux manches ont réellement été gagnées au clavier contre un second joueur local immobile. La relecture complète, avec pause/reprise, aboutit exactement à la frame 1984 et aux mêmes quatre jauges (vie 1000/0, Traque 1000/1000) et manches (2/0), sans modifier la sauvegarde ni récompenser une deuxième fois le duel. Les captures finales ont été inspectées : les phases techniques sont absentes du duel et les annonces expirent selon les ticks de simulation. Aucune erreur JavaScript ni réponse HTTP en échec dans ces recettes.

Rapports du build 2 : `outputs/qa-commercial-audit/v49/final-immersive-browser-qa/report.json`, `final-camera-browser-qa/report.json` et `final-results-browser-qa/report.json` dans le même répertoire V49.

Les recettes sont `scripts/verify-pit-immersive-v49.mjs`, `scripts/verify-pit-camera-v46.mjs` et `scripts/verify-pit-results-v49.mjs`. Elles utilisent uniquement l’interface publique et des commandes de jeu. Le profil adulte de campagne et la manette virtuelle sont limités à un contexte Chrome QA isolé. Aucun état du moteur, aucune santé ni horloge de combat ne sont injectés.

Les 54 tests ciblés existants de sélection, Circuit, Descente, changements d’arène, techniques et exercices d’entraînement passent. Le moteur déterministe, les sauvegardes de runs et les récompenses ne sont pas modifiés par cette refonte.

## Caméra fixe et vérification finale du build 3

Les nouveaux atlas Ahab ont révélé un dépassement horizontal dans le cadrage fixe précédent. Le zoom fixe est désormais calculé une seule fois pour les apparences choisies, à partir de l’enveloppe complète des dessins visibles, des deux orientations, des deux murs et d’une réserve de saut de 180 unités. Le plafond 0,9 est conservé pour les apparences historiques ; Ahab masqué utilise 0,8243 dans le Cercle de basalte. Le cadrage reste constant pendant les déplacements, les attaques et les sauts. Les métadonnées alpha excluent seulement le transparent : crops, pivots de rendu, collisions, hitboxes, combat et replays restent inchangés.

Le build 3 final passe **huit contrôles caméra navigateur** supplémentaires : les quatre historiques (éloignement/rapprochement, saut, réglage fixe et préférence système) et quatre vues Ahab masqué aux murs gauche/droit, au sol et en saut. Les captures des deux murs, des deux sauts et des vues rapprochée/éloignée ont été inspectées ; silhouettes et lances restent dans l’image, HUD stable. Aucune erreur JavaScript ni réponse HTTP en échec. Les **15 tests déterministes de caméra** passent aussi, notamment chaque arène, chaque mur, chaque orientation, les hauteurs 0/90/180 et les différentes actions d’Ahab, avec invariance du moteur de combat.

Rapports du build 3 : `outputs/qa-commercial-audit/v49/build3-fixed-ahab-final/report.json` et `outputs/qa-commercial-audit/v49/build3-camera-browser-qa/report.json`. La recette supplémentaire est `scripts/verify-pit-fixed-ahab-v49.mjs`. Elle utilise uniquement de vraies touches pour déplacer les deux joueurs, puis lit les positions et la caméra du canvas. L’enveloppe est calculée séparément en lecture seule depuis les métadonnées exactes de l’atlas ; aucune position ni horloge n’est injectée dans le jeu.

Les deux premières tentatives de cette nouvelle recette sont conservées dans `build3-fixed-ahab-browser-qa` et `build3-fixed-ahab-confirmation`. Elles ont expiré en tentant de faire sauter Ahab par-dessus un rival immobile : le temps passé au-dessus de sa hauteur accroupie est trop court. Le passage final fait avancer J2 accroupi vers la gauche pendant le saut vers la droite d’Ahab. Seuls les gestes de la recette ont changé après ces échecs, pas le runtime.

## Limites

- Le plein écran natif a été exercé dans Chrome automatisé, pas dans tous les navigateurs.
- La manette a été simulée avec la Gamepad API ; aucune certification de matériel physique n’est revendiquée.
- Les vérifications de match/replay ne constituent pas un test d’équilibrage compétitif ni une certification de tous les modes de progression.
- Le laboratoire peut masquer une partie du décor lorsqu’il est ouvert ; il ne change ni le zoom logique ni la surface de combat.
