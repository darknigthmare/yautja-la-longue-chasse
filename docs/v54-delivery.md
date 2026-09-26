# V54 — Audio, cité, scènes vivantes et cohérence

## Audio réellement fourni

La conversation audio récupérée localement prévoit un dossier par son et un secours quand le fichier manque. Les 37 emplacements existent ; V54 en remplit 22 avec 21 effets et une boucle de vaisseau. Dix-neuf fichiers adaptés viennent de trois packs Kenney CC0, trois motifs de résultat sont des synthèses originales. Les licences, sources, traitements et empreintes sont livrés avec les WAV. Aucun son n'est extrait d'un film ou d'un jeu Predator/AVP.

Les réglages et la mise en arrière-plan suspendent le transport sans modifier le volume sauvegardé. Aucun premier démarrage n'est autorisé sans interaction. La boucle moteur ne joue qu'au pont et dans les installations du pont. Musiques, voix et huit ambiances restent à produire. Voir `audio-v54.md`.

## Homeworld

La cité passe à 6300 × 3400 unités avec 14 quartiers, 19 bâtiments et 27 props indépendants. Deux nouveaux secteurs originaux et cinq liaisons complètent les parcours existants. Six relais compacts et seize bornes utilisent des PNG transparents indépendants, à échelle uniforme. Un pavement vu du dessus remplace les murs qui servaient de sol. La première image du relais a été rejetée pour sa porte trop petite ; la version retenue a une ouverture compatible avec le héros.

L'atlas affiche les lieux, les accès et les règles d'implantation issues des données du jeu : pivot, profondeur, collisions, dimensions et provenance. Il peut tracer un trajet à pied sans téléportation, récompense, rang ni accès accordé par la carte. Les deux quartiers nouveaux ajoutent des extérieurs explorables, pas de faux intérieurs ou de nouvelle campagne adulte. Voir `v54-homeworld-spatial.md`.

## THE PIT

Deux nouveaux stages sont jouables : Neonopolis pour Scarface et Ryushi/Prosperity Wells pour Machiko et Broken Tusk. Chaque scène a son fond OpenAI propre ; les plans P1–P5 réutilisent explicitement des modules contrôlés. Ils ne sont pas présentés comme douze nouvelles illustrations indépendantes. Les sources d'éditeur attestent les lieux ; les compositions latérales demeurent des adaptations originales.

La sélection propose le décor associé au personnage lorsque ce lien est établi, avec un filtre comics/romans. Le registre de couverture suit les 195 identités et conserve les lacunes au lieu d'attribuer un lieu arbitraire à chacun. Le lot ne clôture donc pas tous les stages personnels demandés.

Deux feuilles de figurants apportent six poses natives chacune : colons à Ryushi, Yautjas anonymes dans la Terrasse des Jeunes Sangs et la Fosse des Cent Masques. Placés derrière les combattants, ils suivent l'horloge du duel ; la pause les fige et le mouvement réduit conserve une pose. Aucun personnage de film ou témoin canonique supplémentaire n'est inventé. Les PNG sont inchangés ; seuls les rectangles et pivots mesurés sont utilisés.

Les ombres et les marges alpha sont recalées sur le support du dessin réel, sans déplacement des collisions ni modification des replays. Les douze contrôles d'orientation/arrêt des trois rencontres City/Scar/Jungle mesurent le vrai contact opaque sur le sol. Voir `v54-grounding.md`.

## Prologue

La passe couvre nurserie, arène, village-squelette, titre, dojo, camp, quartiers, désert, patrouille et petite Fosse. Les appuis et ombres suivent le support réel ; un personnage posé sur une plateforme retrouve sa pose debout. L'aide indique les actions réellement permises, notamment l'interdiction de lame dans la Fosse et l'évitement sans attaque de l'animal en patrouille. Le récit utilisateur, les identités, le duel non létal et les limites de progression restent conservés. Voir `v54-youth-visual-audit.md`.

## Qualification et limites

Les résultats et chemins exacts des preuves finales sont consignés dans `v54-validation.json`. La qualification sépare tests unitaires, composition isolée, parcours réellement joués, entrées virtuelles, contrôle des fichiers servis et publication. Un build du renderer PC ne remplace pas une qualification d'exécutable Windows ; l'archive V52 existante est conservée.

Avant publication : 1740 tests réussis, typage et builds web/renderer PC réussis, lint sans erreur (un avertissement historique). Les recettes applicatives totalisent 57 contrôles ; le harnais audio séparé en valide neuf. Les 29 nouveaux fichiers servis sont identiques aux sources validées. L'audit des arènes couvre 138 compositions et 437 PNG uniques, et non 1470 images nouvelles : ce dernier nombre compte les instances de modules partagés.

Les sept PNG acceptés restent identiques aux sorties OpenAI ; le candidat de bâtiment rejeté n'est pas chargé. Prompts exacts, mode génération/édition et références : `v54-openai-prompts.json`. Restent ouverts les stages personnels sans source vérifiée, les movesets complets des apparences statiques, les autres scènes vivantes, les musiques/voix/ambiances, les rites suivants, les intérieurs et la campagne adulte Homeworld. Aucun accès aux nouvelles conversations ChatGPT privées non récupérées n'est supposé acquis.
