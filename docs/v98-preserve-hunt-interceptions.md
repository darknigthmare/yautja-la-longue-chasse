# V98 — Preserve Hunt : rampe, interception et carnet de traque

La sortie solo de Vharuun dispose désormais d’une interception jouable pendant les quinze secondes entre le démarrage des moteurs et le départ. Le terrain reste composé des trois secteurs existants, avec huit combattants et deux appareils. Il s’agit d’une réserve originale du jeu.

## Boucle jouable

Le chasseur doit rejoindre physiquement la rampe, rester au sol à moins de 75 unités et maintenir Interagir pendant 90 ticks de simulation (1,5 seconde). Un mouvement, une blessure ou la perte de proximité interrompt le canal. Un corps à la rampe ne masque plus le sabotage d’un décollage en cours. Les passagers à bord restent protégés du tir extérieur.

Une interception achevée avant le départ coupe les moteurs et retire 2 000 points de réparation, sans effacer les pièces livrées. Les passagers ressortent à leurs coordonnées de rampe, avec leurs identités, blessures et observations conservées. Ils s’écartent ensuite à pied, à 0,7 unité par tick, et défendent l’appareil. Les survivants pourront réparer et réembarquer. Le délai de tir laisse au chasseur le temps de quitter la rampe.

Le départ se résout avant l’interaction du même tick : un canal qui finit au tick `launch + 899` peut réussir, un canal qui finit au tick `launch + 900` arrive trop tard. Les évadés ne reviennent jamais. Une pause ne consomme aucune partie de cette fenêtre. Une coupure simultanée au tout premier tick des moteurs est un événement valide, même sans passager encore embarqué.

## Interface et renseignements

- Le HUD affiche le secteur actuel, les moteurs entendus et le temps avant départ. À portée d’interaction, il affiche l’action possible, la touche configurée et la progression réelle du canal.
- Le bouton **Carnet** suspend et sauvegarde la scène, puis focalise le carnet dans le dialogue. Le carnet reste replié lors d’un briefing ordinaire. Sa lecture ne fait pas avancer les adversaires.
- La carte schématique indique les trois secteurs, les lieux traversés, le chasseur et les appareils connus. Elle ne déplace pas le joueur et ne révèle aucun adversaire sur la carte.
- Les contacts du carnet exigent une proximité de 330 unités et une ligne de vue réelle. Le rôle et le nom restent cachés avant l’observation achevée. Une identité connue n’accorde pas de suivi à travers le monde.
- Les pièces, le circuit et le nombre de passagers d’un appareil ne sont affichés qu’à la rampe, au sol, à moins de 75 unités. Un secteur déjà traversé ou des moteurs entendus au loin ne révèlent pas ces valeurs. Les alertes sonores et les départs sont les événements déjà annoncés par le journal du moteur.
- Un bilan terminé conserve un carnet historique et ne propose pas d’action de terrain.

## Sauvegardes

La version et le format historique de l’expédition restent acceptés. Les champs facultatifs `ships[].interception` et `humans[].disembarkation` ne sont ajoutés qu’à un événement réel. Le premier conserve le tick de coupure, celui des moteurs et la position du chasseur à la rampe ; le second conserve le tick de sortie, l’appareil et le lancement concernés.

Le garde de progression accepte le retour d’un passager à l’état actif ou abattu uniquement avec une nouvelle sortie liée à une interception postérieure au checkpoint, un sabotage supplémentaire et un lancement cohérent. Il refuse les preuves périmées, supprimées ou réécrites, les lancements reculés sans interception, le retour d’un évadé et la guérison. Les checkpoints couvrant plusieurs phases restent valides. Ces validations suivent le modèle de faits structurés des autres sauvegardes du jeu ; elles ne prétendent pas authentifier cryptographiquement un document réécrit manuellement.

Les sauvegardes de campagne, slots manuels, archives intégrales et profil libre conservent ces événements. Aucune récompense, rang, arme ou collection de trophées de campagne n’est accordé par la réserve.

## Validation

La suite pertinente est :

```sh
node --experimental-strip-types --test --test-concurrency=1 \
  tests/game-reserve-v66.test.mjs \
  tests/game-reserve-campaign-slots-v66.test.mjs \
  tests/game-reserve-tactical-v98.test.mjs \
  tests/game-reserve-interception-review-v98.test.mjs
```

Elle couvre la boucle historique, deux lancements/interceptions réellement simulés avec déplacements à pied et checkpoints périodiques, les bornes exactes du départ, les interruptions par un tir ou une pause, la course entre réparation et coupure des moteurs, les événements forgés ou périmés, les archives et le carnet sans renseignement distant.

La recette navigateur V98 est exécutée séparément depuis le véritable menu libre : lancement, commandes, carnet, mobile et persistance ; la fenêtre de départ est aussi contrôlée dans un scénario isolé utilisant un checkpoint explicitement validé. Les preuves se trouvent dans `outputs/qa-three-modes-v98/` lorsqu’elles ont été produites par la recette principale. Ces contrôles locaux ne constituent pas une publication.

L’animation du chasseur reste un dessin natif tenu, les huit humains réutilisent les atlas existants. Les autres réserves, les cinq secteurs restants, les cent portraits et le multijoueur ne sont pas intégrés par cette évolution.
