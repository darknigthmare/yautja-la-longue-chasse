# V98 — Itinéraires physiques du Homeworld

Le bouton **Repères** ouvre l’atlas actuel à six étages. Choisir un lieu puis **Suivre ce repère à pied** calcule un trajet dans les rues, les vrais raccords d’étages et les pièces. Après fermeture, un panneau donne le prochain virage, la distance de marche restante et l’action à effectuer aux paliers ou aux portes. **Objectif actuel** retrouve le chef, le maître ou le prochain interlocuteur du dossier selon la progression réelle.

Le trajet peut être revu sur la carte : le trait turquoise suit les rues praticables de l’étage consulté. Le joueur conserve son étage et sa position quand il consulte les onglets ou choisit une destination. Il doit marcher et interagir pour emprunter un passage, appeler ou prendre l’ascenseur, entrer dans un bâtiment, en sortir ou parler. Le calcul ne donne aucune visite, preuve, prime, rang ou autorisation ; il ne lance aucune activité.

## Modèle physique et restrictions

`homeworldRoutePlanV98(save, {actor, levelId, interiorId}, destinationId)` associe les permissions et descriptions existantes aux coordonnées actuelles de `homeworldAtlasLandmarksV83`. Chaque jambe extérieure réutilise `homeworldWalkRouteV77` avec les collisions civiques et l’empreinte du chasseur. La chaîne d’étages directe est vérifiée en premier ; si une de ses jambes est bloquée, la recherche complète `homeworldWorldRouteV77` essaie les autres raccords. Il ne s’agit pas d’une garantie de trajet le plus court.

Les intérieurs réutilisent le BFS V75 dans le vrai mobilier, les cloisons et les personnages. Les départs dans une mauvaise pièce, au mauvais étage, hors du passage ou à une position non finie sont refusés. Un changement de bâtiment comprend sa sortie réelle, les rues jusqu’à la porte actuelle et l’approche du poste dans la nouvelle salle. Le port utilise ses coordonnées translatées V77, jamais l’ancienne carte à un seul étage.

Les neuf départs ordinaires conservent leurs conditions. La Réserve interdite reste masquée avant son autorisation. Une station de chasseur autonome peut être physiquement visitable par un jeune tout en gardant son activité réservée. Une permission retirée masque immédiatement le guide et invalide aussi un résultat de calcul en attente.

## Calcul et durée de vie

La recherche de collisions est coûteuse sur la cité actuelle. Elle s’exécute dans un unique Web Worker afin que l’atlas, le bouton d’annulation et la fermeture restent réactifs. Le calcul à froid peut durer plusieurs secondes ; l’interface annonce son activité et permet de l’annuler. Le worker conserve ses caches après une réponse et est terminé à l’annulation, à la suspension réelle, au changement de campagne et au démontage. Un résultat vérifie l’identité de la sauvegarde, l’étage, la pièce et la permission encore actuelle avant affichage.

La lecture du guidage a lieu toutes les 350 ms. Elle n’exécute ni A* ni BFS et ne cherche qu’un prochain point local dont le segment est encore praticable. Un écart au chemin invite à recalculer. Un changement physique d’étage ou de pièce recalcule depuis le véritable palier ou la position intérieure. La carte garde le guide pendant ces transitions ; sa consultation seule ne le remplace pas.

Ce repère reste en mémoire pour la session du Homeworld. Il n’ajoute aucune clé de stockage ni aucun champ de sauvegarde. Pause, dialogue, perte d’activité et transit suspendent le panneau et ses actions. Le composant appartient au Homeworld de la campagne courante et ne traverse pas les identités de sauvegarde.

## Vérification

- `tests/homeworld-wayfinding-adversarial-v98.test.mjs` : destinations réelles, collisions et continuité de chaque jambe, approches d’interaction, raccords dans les deux sens, intérieurs, mauvais espaces, positions solides et non finies, absence de mutation, guidage sur les segments courts et longs.
- `tests/homeworld-wayfinding-ui-v98.test.mjs` : rendu réel de l’atlas, service visitable mais activité réservée, départ fermé, Réserve masquée, position intérieure sur la carte, instructions et raccourci configuré, pause des boutons.
- Le navigateur doit compléter ces contrôles avec le worker réel : début et annulation du calcul, carte réactive, absence de déplacement automatique, panneau après fermeture, tracé lors de la réouverture, marche et interactions physiques, retour de focus et contrôle portrait.

Les quatre tests de rendu et les sept contrôles indépendants du modèle ont passé sans exclusion. La revue indépendante confronte chaque jambe aux collisions civiles V84/V92 et compare aussi le montage isolé du modèle aux collections de la scène. Sur ce poste cloud, l’import isolé prend environ 3,6 s, le premier calcul complet port → audience environ 20,8 s et le même calcul avec ses caches environ 35 ms ; ces chiffres ne sont pas un benchmark de téléphone. Le worker conserve la réactivité de l’interface pendant la recherche.

Les institutions et l’architecture de cette cité sont une adaptation originale du jeu dans son univers ; ce parcours ne prétend pas fournir une carte officielle de Yautja Prime.
