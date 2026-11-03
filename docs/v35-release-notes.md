# V35 — arènes modulaires, extension de duel et lecteur d’animations

Cette livraison porte THE PIT à 20 arènes jouables et 14 chasseurs sélectionnables. Elle ne termine pas la demande des 100 arènes ni tous les movesets du catalogue. Les fichiers artistiques conservent leur dossier de production V34 pour garder leurs chemins et leur provenance stables ; le jeu et l’édition Windows portent la version V35 / 1.0.35.

## Décors et cadrage

Les arènes 09 à 20 rejoignent les huit premières avec, pour chacune, 14 PNG indépendants répartis sur six plans de parallaxe. Les huit nouveaux kits 13 à 20 apportent 112 images sélectionnées. Le total des 20 kits est de 288 sources sélectionnées. Aucun décor historique n’est emprunté silencieusement lorsqu’un PNG d’extension est absent : un avis visible le signale et le duel peut continuer.

Le Canvas et ses surimpressions partagent désormais une boîte 16:9. Sur grand écran, le laboratoire d’entraînement occupe une colonne latérale ; sur mobile, il défile sous le combat et les commandes tactiles. Le sol, les pieds et les proportions du décor restent dans le cadre.

Chaque nouvelle arène livre un seul secteur de duel neutre. Les transitions entre secteurs, ruptures et accessoires interactifs restent non implémentés. Les lieux sont des propositions originales du catalogue local, sans prétendre restituer une conversation détaillée des cent arènes qui n’a pas été retrouvée.

## Chasseurs et animations

Tracker et Greyback sont disponibles en Duel CPU, Versus local et Entraînement, avec leurs propres profils de combat. Chacun possède 28 clips orientés validés. Les portraits de sélection utilisent leurs sprites et une orientation native vers l’adversaire. Les chroniques Arcade, Circuit et Descente de ces deux chasseurs ne sont pas produites : elles restent désactivées et la navigation manette les saute dans les deux sens. Les douze identités de progression historiques sont préservées.

Greyback est l’ancien démasqué de Predator 2, distinct du jeune Golden Angel et de l’Elder d’AVP. Son silex reste dans la main gauche et demeure inactif dans cette livraison. Les chiens de Tracker ne sont pas implémentés. Les attaques du duel sont des adaptations de jeu déclarées.

Jungle Hunter conserve ses huit clips antérieurs et gagne cinq clips : blessures droite/gauche, accroupissement droite/gauche et marche vers la gauche. Le nouvel accroupissement conserve des pieds plantés. La marche droite et les autres planches rejetées ne sont pas remplacées par un miroir ou déclarées terminées.

Le registre contient au total 204 clips validés pour neuf chasseurs disposant de clips. Une phase d’attaque et son orientation comptent comme un clip ; ce chiffre ne signifie pas 204 animations complètes. Aucun moveset complet n’est déclaré. Les états manquants du jeu gardent leur secours explicite.

`/pit-lab` et le laboratoire embarqué dans l’édition PC lisent maintenant le registre réel : choix du chasseur, atlas, phase, orientation, dessin, lecture à la durée du moteur et export JSON. Une image ou une orientation absente est signalée. L’ancien laboratoire de rigs V3 reste accessible comme archive séparée.

## Véhicules et revue artistique

Le montage du Bone Bison permet de comparer corps nu, selle et garde de flanc dans les deux orientations. Deux planches de marche de six poses chacune restent en revue : le suivi des accessoires pendant la marche n’est pas validé.

Le montage du Razorwing compose corps, aile arrière et aile proche, avec six phases dans les deux orientations et deux commandes d’ailes indépendantes. Le corps conserve des franges magenta résiduelles ; cinq tentatives de correction sont archivées comme rejetées. Le montage reste un outil de revue, sans collision ni locomotion jouable.

Les 50 entrées de véhicules possèdent une source et un brouillon non rejeté. Aucun clip de véhicule n’est accepté pour le jeu et aucun véhicule n’est conduisible. L’atelier contient 548 entrées au total : 288 décors, 146 sources de chasseurs et 114 sources de véhicules. Les variantes rejetées restent identifiables ; leur présence n’augmente pas la couverture runtime.

## Sauvegarde et limites de livraison

Les identifiants des nouvelles arènes sont acceptés par les duels sauvegardés et les replays déterministes. Ils sont refusés pour les routes Arcade et Circuit historiques. Les duels Tracker/Greyback permettent la relecture en session et l’export JSON, sans attribuer de progression à une autre identité.

Le projet reste un jeu de fan non commercial et non affilié. Les références du projet ne sont pas des répliques officielles certifiées 1:1. L’édition PC reste non signée ; les recettes automatisées ne certifient ni les performances sur tout matériel, ni une manette physique, ni une campagne complète. La validation du déploiement et du paquet final est consignée séparément dans le rapport de livraison.
