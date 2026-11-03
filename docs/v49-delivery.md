# V49 — combats immersifs, Ahab et première reconnaissance du désert

## Ce qui est livré

THE PIT occupe désormais toute la fenêtre pendant le combat. Les noms, vies, jauges, manches et chronomètre sont superposés au décor. Les commandes détaillées, informations de production et réglage de caméra se trouvent dans un menu de pause ; le laboratoire devient un panneau superposé. Les états techniques des combattants restent réservés à l’entraînement. Les notifications de gains actifs sont brèves et les gains passifs ne répètent plus un message central.

Le plein écran natif reste un choix explicite dans le menu. Échap ouvre la pause au lieu d’abandonner immédiatement le match. Perte de focus, onglet masqué et déconnexion de manette suspendent le combat ; la reprise réarme les entrées. Les styles de défilement précédents sont restaurés à la sortie. Le format des dessins 16:9 est préservé, avec bandes sur les écrans d’un autre rapport, notamment en portrait. Le HUD jeunesse du dojo, du camp et du désert suit le même principe : scène plein viewport, objectif et contrôles superposés, réglages accessibles depuis la pause. Le début reste la nurserie V47, inchangée.

La caméra fixe réserve aussi les limites visibles de l’apparence sélectionnée, aux deux murs et pendant les sauts. Les grandes poses d’Ahab ne sont plus coupées ; ces calculs de présentation ne modifient ni les pixels dessinés ni les collisions.

## Animations de THE PIT

Ahab masqué reçoit douze nouveaux dessins OpenAI : attente/garde gauche et coup léger dans les deux orientations natives. Huit clips supplémentaires décrivent l’attente, la garde et les trois phases de chaque orientation de l’attaque. Les phases d’attaque ne bouclent pas. La préparation des atlas mesure les rectangles et appuis ; aucun retournement horizontal ne fabrique une orientation manquante.

La garde dessinée reste tenue pendant un coup réellement bloqué, lorsque cette garde exacte existe pour le chasseur, son apparence et son orientation. Le chargeur isole aussi deux apparences du même chasseur et leurs échecs de chargement. Cela corrige le contrat de chargement et d’aperçu ; le moteur n’autorise toujours pas les duels entre deux instances du même identifiant de chasseur.

Les trois PNG Ahab conservent leurs octets OpenAI. Le seuil de bruit alpha existant de 2 reste explicite dans la préparation Canvas en mémoire. Deux planches de six poses ont été exclues pour chevauchement ; une première attaque gauche de quatre poses a été exclue pour des fragments au bord. Les contrôles de mains, lance, appuis, costume et orientations ont été faits par revue visuelle et analyse des pixels. Il ne s’agit pas d’une certification de fidélité canonique 1:1. L’envoi de la référence locale au générateur a échoué : les planches sont issues de descriptions rédigées après inspection du visuel existant, pas de retouches conditionnées sur ses pixels.

## Suite du prologue

Après le premier réveil V48, le départ reste volontaire. Le joueur rejoint le maître, observe trois indices après une approche réelle et une interaction maintenue, franchit deux blocs, rend compte puis revient au camp. Les cinq preuves de reconnaissance sont distinctes des six preuves de formation et ne créent ni chasse réussie, ni rite des Premières Pistes, ni rang, ni vaisseau. Les sauvegardes V9 existantes restent compatibles ; `completed` continue à désigner la formation terminée, tandis que le checkpoint conserve la phase de la sortie.

Un fond désert original et un atlas de trois indices indépendants sont intégrés. Les chasseurs lointains sont peints dans le décor : aucune foule de PNJ simulés ni session multijoueur n’est revendiquée. Le biomask acquis reste conservé pour une utilisation ultérieure ; la lecture actuelle des indices est une observation et ne simule pas un masque porté qui n’existe pas dans les sprites.

## Vérification

Les résultats définitifs sont consignés dans `docs/v49-validation.json`, avec les rapports navigateur détaillés et les limites. Les recettes utilisent des entrées réelles et des parties QA isolées ; il ne s’agit pas de testeurs humains ni de certification d’appareils physiques. La publication est vérifiée séparément après le commit, dans `outputs/qa-commercial-audit/v49/publication-verified.json`.

## Limites conservées

Cette sortie est une première reconnaissance guidée, pas encore la mission désert complète avec patrouille à retrouver, embuscade et évaluation. Le PIT jeunesse, la mise en scène complète du couloir/trône, les autres rites, l’ensemble des arènes/parallaxes et les animations de tous les chasseurs restent à produire.

Ahab garde son profil de contact partagé : la longueur graphique de la lance ne définit pas une nouvelle portée mécanique propre au personnage. Les états et apparences non dessinés conservent leurs poses fixes exactes. Aucun moveset complet n’est annoncé. Le décor désert est une peinture entière, pas un pack complet de plans de parallaxe séparés. Les essais manette sont virtuels ; aucun test sur matériel physique ni nouvel exécutable Windows n’est revendiqué ici.

Prompts exacts, sources, SHA-256 et décisions d’acceptation : `docs/v49-openai-prompts.json`. Assets livrés : `public/game/sprites/v49/pit/ahab/` et `public/game/youth/v49/`.
