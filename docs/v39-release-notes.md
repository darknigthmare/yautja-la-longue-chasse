# V39 — deux chasseuses jouables et préparation des contrôles

Theta et Machiko Noguchi rejoignent les extensions de duel de THE PIT : Duel CPU, Versus local et Entraînement. Leurs profils, statistiques et attaques sont distincts. Les douze routes historiques Arcade/Circuit/Descente ne changent pas ; aucune chronique personnelle ou récompense n’est inventée pour ces deux personnages. Leurs duels se rejouent avec le codec déterministe existant.

Les identités de référence sont respectivement les comics Predator de [Marvel](https://www.marvel.com/comics/issue/89618/) et la trilogie Machiko d’[Aliens vs. Predator chez Dark Horse](https://digital.darkhorse.com/books/9bb496a44e944fcda26662b44db247be/aliens-vs-predator-the-essential-comics-volume-1). Les présentations V28 du projet guident les dessins V34 réutilisés ; leurs costumes et techniques restent des adaptations de jeu, sans certification officielle de fidélité 1:1.

## Animations réellement raccordées

| Combattant | Ajout | Dessins existants utilisés |
|---|---|---:|
| Theta | 26 clips orientés : attente, accroupissement, garde haute, coups reçus, trois attaques debout en phases | 54 |
| Machiko Noguchi | 24 clips orientés : attente, accroupissement, coups reçus, trois attaques debout en phases | 44 |
| Jungle Hunter | Un recul gauche par lecture inverse des quatre dessins de marche gauche existants | 4, déjà utilisés auparavant |

Les 13 pages humaines existaient déjà dans l’atelier V34. Aucune génération supplémentaire ou retouche de PNG n’est comptée. Les rectangles, pivots, transparences et hauteurs de corps sont déclarés par source ; les orientations restent dessinées séparément. Le cadrage de combat inclut désormais les silhouettes des combattants utilisant uniquement des atlas. Le laboratoire déduplique les dessins par chemin source et rectangle, même lorsqu’un deuxième atlas réutilise une page.

La garde Machiko reste exclue : le fusil de sa planche réparée est trop court par rapport aux autres poses. Les marches humaines rejetées, les phases de saut incomplètes, les techniques, projections et finishers restent absents. Un état sans clip conserve une pose orientée explicitement signalée. Une image humaine manquante affiche un état d’indisponibilité, jamais un corps géométrique de Yautja. Fusil et canon de Machiko ne tirent pas dans ce lot.

Total après ce lot : **16 combattants sélectionnables, 11 avec des clips animés, 259 clips orientés, 20 arènes jouables et zéro moveset complet déclaré**. Les 550 sources de l’atelier restent 550 sources : la qualification d’une image existante n’en crée pas une nouvelle.

## Préparation et reprise

- Une leçon guidée commence par une consigne avec les touches du profil actif. Simulation, mannequin et chronomètre restent arrêtés jusqu’à « Commencer l’exercice ». Clavier, manette et tactile sont pris en charge ; les entrées maintenues sont purgées. Le chargement des visuels est borné et les échecs sont annoncés explicitement.
- Homeworld exige le relâchement de la manette après changement de contexte, perte de focus, retour de service ou reconnexion. Une touche A maintenue ne traverse plus un dialogue pour embarquer automatiquement. Start reprend la pause/inactivité intentionnellement et Haut/Bas parcourent correctement les choix.

La campagne de jeunesse, le Berceau, les 80 arènes supplémentaires, les véhicules pilotables et les animations complètes restent des chantiers distincts. Le portable Windows livré reste V35 ; cette livraison ne certifie ni manette physique, ni Steam Deck, ni commercialisation. Les accès privés ChatGPT restent différés au choix du propriétaire.

Les résultats de compilation, tests, recettes navigateur et déploiement exact sont consignés séparément dans les preuves de livraison V39.
