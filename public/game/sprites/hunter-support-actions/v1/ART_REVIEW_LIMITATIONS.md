# Limites artistiques et d’intégration — veille, canopée et survie

## Statut de la livraison

Les planches, images et manifestes de ce lot restent **draft**. Le contrôle technique et la revue visuelle de l’assistant ne donnent pas le statut `validated`, réservé par le projet à la revue artistique humaine. Le lot retenu contient 19 planches, 304 dessins sources distincts et 16 actions : 4 boucles et 12 séquences ponctuelles. Cinq tentatives rejetées ou remplacées sont exclues ; les répétitions vidéo et les lectures inversées ne constituent pas de nouveaux dessins. Les 304 dessins restent distincts après neutralisation analytique des pixels d’alpha <16, sans modification des sources. Voir le [rapport consolidé](qa/SOURCE_REVIEW.md).

Les 592 dessins précédemment publiés dans la PR restent des sources disponibles et inchangées. Leur présence, comme celle du présent lot, ne signifie pas que Hunt les utilise à la place du rig actif. Aucun binding au roster, activation en jeu, changement de timing ou modification de sauvegarde n’est établi par ces assets.

## Identité, équipement et orientations

Le lot représente le même chasseur de référence masqué, équipé et orienté vers la droite. Son corps et son équipement sont réunis dans les dessins. Il ne satisfait donc pas à lui seul le contrat d’anatomie complète et de familles d’équipements personnalisables séparées. Le côté gauche, les autres armes, les variantes d’armure et les changements de masque demandent des sources ou des adaptations spécifiques. Une symétrie automatique ne préserve pas nécessairement l’équipement asymétrique.

Les séquences de visée concernent le canon d’épaule à hauteur horizontale. Elles ne couvrent pas les autres angles, l’arc, les armes lancées, leurs charges, leur recul ou la propriété des objets entre main, rangement et monde.

## Fluidité et raccords

Le maintien et la sortie de visée ont fait l’objet de corrections ciblées pour se rapprocher de l’entrée. Le maintien produit depuis la pose finale d’entrée améliore le recouvrement de silhouette de 0,663 à 0,793 pour sa première image. Une variation de largeur, de volume et d’appui reste visible. La sortie corrigée améliore également les trois premiers raccords de silhouette, mais son pied droit reste plus éloigné que dans l’entrée.

Ces mesures utilisent des silhouettes alpha ≥128 et ne sont pas des scores de fluidité ou une validation anatomique. Des images distinctes ne garantissent pas à elles seules une animation parfaite. Les boucles de respiration, de maintien et de balancement conservent des variations de pose ; une boucle strictement sans raccord perceptible n’est pas revendiquée.

Les trois raccords A/B ont été inspectés : le soin poursuit le geste mais change de volume ; Second Wind change d’inclinaison et de position des bras ; le début de mort B relève davantage le torse que la fin de A, même après recalage du sol. Ces différences restent artistiques. Les mesures et comparatifs figurent dans la [revue A/B](qa/AB_VISUAL_REVIEW.md). La mort finit couchée et doit tenir sa dernière pose, sans boucler vers une reprise ou une résurrection.

## Recalage des prises

Les poings du maintien et du balancement sont mesurés avec un proxy graphique : moyenne non pondérée des centroïdes des deux composantes alpha ≥128 dans les douze premières rangées opaques. Les valeurs sont liées aux SHA des sources. Un pivot par image est utilisé pour le maintien et le balancement ; les transitions utilisent respectivement le pivot constant de la dernière image d’accrochage et de la première image de lâcher.

Ce recalage aligne le milieu des deux prises vers un point commun de revue sans modifier les pixels ni normaliser les pieds. Les amplitudes horizontales des pieds par rapport au milieu des prises restent de 17,71 px pour le maintien et de 181,98 px pour le balancement. Les erreurs après arrondi au pixel restent inférieures à un pixel sur chaque axe dans le contrôle indépendant.

Le proxy n’est ni un contact anatomique certifié ni un binding IK. L’écartement des deux poings reste différent : environ 46–48 px dans le maintien et 33–36 px dans le balancement. Une translation du milieu ne peut pas aligner simultanément chaque main ni corriger une variation de volume. Le passage du balancement 16 au lâcher 01 revient d’une inclinaison latérale à une suspension verticale ; sa continuité dépend de la phase réelle du pendule au moment du lâcher.

## Recalage vertical au sol

Les 224 images des quatorze pages au sol utilisent un proxy de contact : centre de la dernière rangée alpha ≥128 contenant au moins huit pixels. Le pivot X reste inchangé et le pivot Y est lié au SHA de chaque source ; la cible de revue est Y=302,5. Les quatre pages de canopée et l’impulsion aérienne sont exclues. Le responsable a autorisé l’application aux métadonnées de présentation ; le [reçu final](qa/FINAL_VERIFICATION.md) confirme séparément son exécution.

La [revue des contacts](qa/FLOOR_REGISTRATION_REVIEW.md) décrit les douze échantillons inspectés et la sensibilité d’au plus un pixel aux seuils testés. Ce proxy graphique suit les pieds, mains, genoux ou côté du corps selon la pose ; il ne certifie pas un contact anatomique, une collision ou un binding physique. Il conserve chaque dessin et les mouvements internes, mais ne corrige pas les différences de volume ou d’inclinaison entre les pages. Les amplitudes de déplacement horizontal des appuis restent celles des dessins sources et ne sont pas effacées.

## Horloges et effets du jeu

La cadence de revue n’impose aucune durée à la simulation. Le scan, le camouflage, le soin et Second Wind appliquent déjà leurs effets immédiatement après acceptation de la commande ou de l’événement. Les gestes ne doivent pas retarder ces effets ni créer un verrou de contrôle.

- `cloak_off` représente une désactivation volontaire. Un dégât, un soin ou une réserve épuisée peuvent aussi forcer la disparition du camouflage sans ce geste.
- Les PNG du camouflage restent des corps opaques ; la transparence de camouflage appartient au rendu.
- La réaction à l’impact ne transforme pas les 0,55 seconde d’invulnérabilité en un étourdissement.
- La mort fixe immédiatement `phase = dead` et `paused = true`. Sa future lecture nécessite une horloge de présentation indépendante de la simulation et doit conserver l’état mort.
- Le balancement et le lâcher doivent suivre le support, la phase et les vitesses physiques existantes. Le déplacement dans le monde n’est pas à ajouter une seconde fois depuis le sprite.

## Transparence et marges

Les contrôles portent sur les bords réels des cellules source avant padding, et non uniquement sur les PNG exportés. Les 19 planches passent ce contrôle : aucun bord de cellule ne contient d’alpha ≥16, et aucun corps alpha ≥128 n’est coupé. Quarante cellules contiennent néanmoins une trace de bord d’alpha >2, avec un maximum de 8 ; ces données faibles sont conservées et documentées. La plus petite marge opaque est de 2 px dans mort A, ce qui ne constitue pas une marge artistique généreuse. Les premières tentatives comportant un fond gris parasite ou des mains coupées ont été écartées ; aucune suppression automatique d’alpha ou retouche peinte par script n’a été utilisée.

L’affichage brut de certains PNG donne une forte couleur rouge à des RGB dont l’alpha est voisin de zéro. Des composites sur fond neutre ont permis de distinguer ces données quasi transparentes des accents opaques des yeux. Les sources restent inchangées. Les gardes transparentes d’import ne prouvent pas à elles seules une silhouette correctement cadrée ; les deux points sont vérifiés séparément.

## Portée des vérifications

Les rapports distinguent les contrôles des sources, la conservation des pixels, le contrat des manifestes, le comportement du lecteur et l’inspection des aperçus. Ils ne constituent pas une session de combat dans le navigateur, une mesure de performance, une validation des collisions ou une revue artistique humaine. Le backlog conserve les autres familles de sources et tous les travaux d’intégration restant nécessaires.
