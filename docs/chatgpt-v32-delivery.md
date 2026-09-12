# Reprise des discussions — V32

Cette livraison poursuit THE PIT à partir des discussions disponibles localement. Elle ne clôture pas toutes les conversations du projet et ne prétend pas avoir relu un dossier ChatGPT privé inaccessible. Le rapprochement détaillé est conservé dans [le backlog V32](pit-v32-animation-backlog.md).

## Animations réellement livrées

Jungle Hunter et City Hunter disposent chacun de l'attente et de l'attaque légère debout, dessinées dans les deux orientations. Quatre nouvelles planches OpenAI contiennent 32 dessins distincts : huit séquences orientées, décomposées en 16 clips de phase. Les phases de l'attaque suivent les ticks du moteur. Les rectangles et pivots sont individuels, sans grille forcée, miroir ou déformation.

Les sources sont préservées octet pour octet dans `art-source/v32/pit-animations`. La clé magenta explicitement déclarée est retirée seulement dans le Canvas privé du runtime. Le rapport [de couverture](pit-v32-animation-coverage.json) vérifie les pixels des vrais fichiers, les bords, l'alpha obtenu, les dessins distincts et la résolution par le moteur.

Une première sortie avec damier peint et une version City portant des disques surnuméraires ont été écartées. City a été corrigé avec OpenAI puis revu. Le brouillon de marche Jungle reste exclu : l'alternance des jambes n'est pas suffisamment convaincante. L'examen numérique ne certifie ni une anatomie parfaite ni une fidélité officielle 1:1.

Quand l'action manque encore, ces deux chasseurs tiennent le premier dessin d'attente de la bonne orientation (`sprite-sheet-hold`). Cette pose évite un changement brusque d'apparence mais ne compte jamais comme animation. Les douze autres combattants conservent leurs illustrations bitmap antérieures.

## Arènes et parallaxe

Les huit arènes jouables emploient maintenant six plans bitmap P0–P5. Les arrière-plans, accessoires, trophées, sols et premiers plans sont indépendants et réemploient les images existantes du projet. Le sol suit exactement les coordonnées du combat ; les autres plans ont leurs propres facteurs de parallaxe. Le premier plan s'atténue près des deux combattants. Aucun de ces accessoires ne modifie les collisions ou les règles de combat.

La caméra inclut les armes et toutes les cellules validées avant même leur chargement. Le chargement par arène et par combattant est annulable. Les états de chargement et d'animation sont observables dans l'interface et les attributs de recette.

Les 92 autres arènes restent des concepts, avec leurs kits spécifiques et transitions à produire. Le présent lot ne crée pas cent niveaux jouables. Les 264 lignes historiques représentent un inventaire de production/recherche, et non 264 clips ni 264 individus canoniques distincts.

## Qualification locale

- Compilation web : réussie.
- Suite complète : 1 124 tests réussis, zéro échec, zéro test ignoré.
- ESLint et TypeScript globaux : réussis.
- Audit des dépendances de production : zéro vulnérabilité signalée.
- Recette Chrome du véritable `PitCanvas` : huit arènes, nouveaux sprites, caméra, contraste renforcé et mobile sans débordement ; zéro erreur JavaScript et zéro ressource manquante.
- Recette de composition : huit arènes à cinq cadrages, six plans présents pour chaque scène.

Les résultats de publication et du paquet Windows sont ajoutés après leur exécution. Ces contrôles ne certifient pas les performances sur tout matériel, une manette physique, un jeu commercial achevé ou les droits d'exploitation de la franchise.
