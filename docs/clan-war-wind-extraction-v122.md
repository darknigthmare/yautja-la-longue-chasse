# V122 — W3-RTS06, Les chasseurs derrière le vent

**Source de vérité :** Bible V6 → feuille Scénarios RTS → W3-RTS06, reliée à la carte W3-MAP03 « Les Trois Cratères » (format du dossier original : 36 × 28 cases). Le présent pilote utilise encore le théâtre d'exercice W3-KR03 en **9 × 6**, pas une copie visuelle 1:1 des trois cratères.

## Parcours jouable

Un véritable **W3-U02 éclaireur de crête** et une **W3-U17 équipe d'extraction** doivent être recrutés, aptes et présents. La réservation paie leurs RAV et respecte la limite de commandement du système W3. Aucune escorte artificielle, véhicule inventé ou renfort gratuit n'est généré.

L'extraction n'est pas autorisée au seul motif que le joueur a choisi la mission. L'éclaireur W3-U02 doit effectivement atteindre une position offrant une ligne de vue valide sur l'arête de retour (7,1). Cette reconnaissance est mémorisée dans la mission, sans rendre les garnisons V85 visibles de manière omnisciente.

Les équipes choisies au départ gardent leurs vrais teamId dans une liste de participants. Chacune doit **atteindre physiquement la coque (1,4)**. Au tour de sa propre arrivée, elle est enregistrée comme évacuée et retirée de la grille : elle n'est ni dupliquée ni téléportée. Les groupes encore dehors continuent à subir le temps et les attaques. Les pertes sont distinguées des évacués ; une victoire requiert au moins un survivant effectivement embarqué et la résolution vérifiée du sort de toutes les équipes désignées.

Les rafales suivent une période de trois phases lisibles. Pendant une phase, les tirs dépassant deux cases perdent leur ligne de visée, dans les deux camps ; le terrain et les itinéraires physiques ne deviennent pas des murs. Cette cadence est un équilibre de prototype, pas une donnée de tournage. Une IA locale cible plus volontiers un détachement isolé **qu'elle peut voir**. Les adversaires ne disposent pas de positions secrètes de la carte stratégique.

## Garanties et limites

Les équipes évacuées ne peuvent plus attaquer, attirer une riposte ou occuper une case. Les engagements déjà terminés ne peuvent être récompensés une deuxième fois ; les rapports conservent W3-RTS06 et les équipes réellement impliquées. Le champ sauvegardé contient les états de reconnaissance, de vent, les IDs évacués et perdus. Le chargeur refuse une liste inventée, un acteur extrait encore vivant sur la carte ou des coordonnées de coque falsifiées.

Cette épreuve ne déploie pas encore la vraie coque de clan, les animations 1:1, le vent volumétrique, les couvertures de tir, les charges matérielles conservées sur la carte principale, ni toutes les interactions de la carte 36 × 28. Une éventuelle caisse abandonnée n'est **pas** inventée comme bien possédé ou stock récupéré ; cet embranchement reste à écrire et jouer à partir de la cellule K de W3-RTS06.

Tests : tests/clan-war-wind-extraction-v122.test.mjs. Statut de validation à confirmer par GitHub Actions V115, et non par l'existence seule de ce fichier.
