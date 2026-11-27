# CODEX WOLF — Gameplay v0.7

## Philosophie

Le joueur doit se comporter comme le « cleaner » montré dans AVP:R : trouver, isoler, détruire les preuves, employer les outils adéquats et survivre sans pouvoir réécrire l'issue du film. La difficulté modifie les valeurs de combat, jamais les événements obligatoires.

## Protocole de chasse

Les actions compatibles avec la chaîne sont : scan confirmé, Cleaner Fluid, kill Xénomorphe, kill furtif, neutralisation des deux humains hostiles du magasin, parade, esquive de pounce, Power Punch, lecture d'une attaque spéciale du Predalien, arrachement de la mâchoire interne et résolution de la lutte finale.

La fenêtre de chaîne est de 6,5 secondes. Chaque action supplémentaire augmente le multiplicateur de score de 6 %, jusqu'à +75 %. Un coup reçu réinitialise immédiatement la chaîne. La meilleure chaîne de la partie est conservée dans le bilan.

## Blessures

`injury.trauma` représente l'accumulation physique. Les coups ordinaires ajoutent du trauma ; l'acide ajoute en plus `injury.acid`. À trauma élevé, Wolf perd une petite partie de sa vitesse horizontale. La blessure de la centrale pose un état canonique important. Le Medicomp est la seule étape de scénario qui réinitialise cette blessure avant la suite de la chasse.

Ce système ne crée pas de mort scénaristique alternative : à zéro intégrité, Wolf reprend au checkpoint de pièce.

## Cloak et mémoire d'alerte

Le cloak réduit fortement la portée de détection. Une cible frappée, une cible qui frappe Wolf ou une cible contrée conserve toutefois une mémoire d'alerte pendant plusieurs secondes. Se recamoufler après avoir ouvert le feu ne remet donc pas artificiellement l'ennemi en état passif.

## Meute Xénomorphe

Quand au moins deux Xénomorphes sont actifs, certains prennent un rôle de flanking. Ils utilisent les plans supérieur/inférieur pour contraindre Wolf à changer de profondeur au lieu de former une seule file horizontale. Le rôle `hunter` reste sur le plan d'engagement principal.

## Predalien

Le boss final conserve la progression du film :

1. duel armé ;
2. gauntlet endommagé ;
3. retrait volontaire du masque et de l'équipement ;
4. arrachement de la mâchoire interne ;
5. grapple final puis blessures mortelles réciproques.

La v0.7 ajoute des télégraphes de gameplay. Avant le retrait de l'équipement, le Predalien prépare une charge. Ensuite, il peut télégraphier un mouvement de dard caudal. Une esquive ou une invulnérabilité correctement timée compte comme lecture réussie. Ces attaques ne remplacent jamais le dard fatal du verrou scénaristique final.

## Hôpital

La première mêlée est limitée à trois Xénomorphes au total : deux cibles au Plasma Pistol puis une cible destinée au Cleaner Fluid. Une séquence distincte utilise ensuite deux Xénomorphes pour l'accident du shuriken. Cette séparation évite la quatrième cible artificielle présente avant v0.7.

## Checkpoints

Le checkpoint de pièce conserve : intégrité, énergie, arme, vision, inventaire, preuves, flags, trauma, statistiques de combat et protocole de chasse. Une reprise applique toujours la pénalité d'honneur prévue.
