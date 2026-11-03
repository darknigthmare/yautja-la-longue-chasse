# V48 — QA simulée novice et mécanique



Périmètre de cette passe : moteur pur, règles de réussite, lecture du modèle de sauvegarde, recette navigateur du parcours réel. Les essais restent des profils automatisés simulés, pas des testeurs humains. Le premier build intégré a été parcouru dans Chrome sans erreur de console ni échec de ressource.



## Défauts reproduits et corrigés



- L’esquive de la leçon se validait après une fuite hors de portée : le coup avait été annoncé à proximité, mais l’esquive finale pouvait ne rien éviter. La preuve exige désormais que l’esquive commence à portée réelle du coup annoncé et reste active à sa frame d’impact.

- Le premier signal visuel pouvait inciter à esquiver trop tôt. Le moteur rend la seule leçon du dojo plus indulgente (30 frames, protection 2–26) ; la scène sépare préparation puis signal d’esquive à la frame 12. Les réponses immédiate et 250 ms après ce signal sont testées ; une esquive dès la première frame du geste n’est pas créditée. Le duel conserve ses fenêtres normales.

- Le validateur acceptait un rival à zéro de composure encore debout, état susceptible de bloquer la fin du duel. Il exige maintenant la correspondance KO ↔ composure nulle.

- Un checkpoint plaçant les pieds de l’acteur à l’intérieur d’une traverse solide est refusé.

- Le parcours pouvait échouer à reconnaître un franchissement correct avec atterrissage sur le dessus de la traverse. La preuve tient maintenant compte du passage du bord droit puis du retour réel au sol, sans autoriser le passage à travers le solide.

- Une preuve dont le tick était absent pouvait correspondre à un milestone absent. Le reçu requiert maintenant une date entière présente, acquise et identique au checkpoint.



La relecture indépendante de `youthCampaign.ts` a également conduit son propriétaire à ajouter des gardes de progression monotone (sauf vrai réessai), de conservation des compteurs, et d’interdiction de changer une teinte déjà reçue. Aucun fichier campagne n’a été modifié par cette QA.



## Vérification pure



15 tests moteur passent. Ils couvrent la route complète aux commandes physiques, les six preuves uniques, un checkpoint normalisé à chaque tick, une réimportation réelle toutes les 37 frames, les attaques tenues, la portée, la projection et l’atterrissage, la pause, les assets absents, la défaite et le réessai, les matériaux non gagnés trop tôt, le chrono et les corruptions.



Une boucle de 25 000 pas d’entrées déterministes variées vérifie les limites physiques, les collisions solides et la possibilité de normaliser les checkpoints dans cinq phases. Elle ne prétend pas prouver que toute stratégie aléatoire gagne.



Commande : `node --experimental-strip-types --test tests/youth-training.test.ts`. Lint ciblé moteur, tests et recette navigateur sans erreur ; `node --check scripts/verify-youth-scene-v48.mjs` passe.



## Recette navigateur préparée



`V48_QA_URL=http://127.0.0.1:4174` puis `node scripts/verify-youth-scene-v48.mjs`.



La recette reprend uniquement une archive sortie d’une vraie victoire clavier V47. Elle rejoint physiquement le chef puis le mentor dans la cité, teste l’interdiction du vaisseau, entre dans le dojo, exporte `dojo-start-storage.json` pour la QA de fiabilité, exécute tous les exercices et le duel par clavier, puis le repos et le matin. Les coordonnées et télémétries sont lues via les attributs DOM publics du canvas principal ; aucun état de jeu n’est injecté pendant le parcours.



La recette capture chaque phase, ses preuves et son équipement. Au matin : six identifiants attendus, dates uniques, biomask/lame jeunesse acquis, teinte choisie, aucune mutation de rang, d’honneur ou d’inventaire adulte, preuve de formation unique et retour durable dans la cité. Dossier par défaut : `work/v48/youth-scene-browser-qa`.



## Résultat navigateur local



Premier build intégré testé sur `http://127.0.0.1:4174` : **8 contrôles réussis**, zéro erreur de console et zéro réponse HTTP en échec. Le parcours complet utilise 656 itérations de contrôle clavier et traverse douze phases jusqu’au matin, sans injecter de positions, de victoires ou de preuves. L’horloge contrôlée du navigateur avance la vraie boucle du jeu ; le point de départ est l’archive authentique `work/v47/final-scene-browser-qa/played-campaign-storage.json`.



Preuves : `work/v48/youth-scene-browser-qa/report.json`, `dojo-start-storage.json`, `morning-played-storage.json` et captures de chaque phase. L’archive d’entrée a été transmise aux profils accessibilité et fiabilité pour leurs essais indépendants.



Les captures dojo-esquive, duel du camp et matin ont été inspectées : terrain latéral, positions au sol, distinction du jeune et du maître, cible physique et action de retour à la cité lisibles. Limite d’art explicite : le premier biomask est acquis dans le dossier mais le héros reste représenté visage découvert dans ce lot ; aucune animation de biomask porté n’est revendiquée.



Ce rapport local ne remplace pas la validation de publication. Le dernier fichier `report.json` issu de la recette demeure l’autorité pour son contexte d’exécution.





## Confirmation sur le build final



La recette a été rejouée sur le build final local : **9 contrôles réussis**, zéro erreur console et zéro réponse HTTP en échec. Le neuvième contrôle utilise effectivement la première lame acquise (touche K), attend son impact et confirme la baisse de composure adverse, puis poursuit le duel aux poings. Capture `work/v48/final-youth-scene-qa/camp-earned-blade-impact.png` inspectée : lame rattachée à la pose d’attaque et contact visible, avec recouvrement normal des acteurs à courte portée.



Le dojo corrigé a été inspecté dans `dojo-start.png` du même dossier. L’archive du matin et le rapport final sont dans `work/v48/final-youth-scene-qa`. Aucun changement du moteur n’a été requis par ce deuxième passage. Publication encore à vérifier séparément.



## Build ultime 4

Nouveau passage complet : 9 controles reussis, zero erreur console/HTTP. Deux jauges non letales au camp seulement : joueur 100, maitre 84 puis 64 apres la lame ; aucune jauge au dojo. Capture finale inspectee et valeurs confirmees. Preuves : `work/v48/final4-youth-scene-qa/report.json`. Une attente de recette comportant un libelle mal encode sous Windows a ete corrigee par echappements Unicode avant ce passage ; le runtime du jeu etait correct. Aucun changement logique du moteur apres build.
