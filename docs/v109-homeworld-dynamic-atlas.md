# Atlas et passages dynamiques du Homeworld — V109

Les lots ROLE19 restent des obstacles à leur emplacement confirmé. Le nouveau planificateur conserve le terrain, les portes, les emprises natives et les raccords V77/V99, puis vérifie aussi les deux charges du registre cargo. Une charge portée quitte les obstacles au sol ; une charge posée redevient un obstacle à ses coordonnées réelles. Le guide ne déplace ni le joueur, ni une charge, ni un propriétaire.

Les trajets V109 utilisent les mêmes empreintes indépendantes que le moteur cargo. Chaque arête conserve le contrôle V77 avec sa marge complète et ajoute des échantillons cargo espacés d’au plus trois unités. Un chemin statique obstrué est réparé par une recherche bornée autour des empreintes réelles et de ses virages existants. Chaque nouvel intervalle est contrôlé à nouveau. Si aucun passage vérifié n’est trouvé, le calcul refuse le trajet ; il ne réduit pas les collisions et ne garantit pas un plus court chemin universel.

L’empreinte d’un calcul dépend des positions et états des charges au sol. La distance parcourue, le numéro de révision et les coordonnées d’une charge encore portée ne déclenchent pas de recalcul. Le Worker et son hôte vérifient le même propriétaire, le même étage/intérieur, la position de départ encore proche, le même repère et les mêmes placements. Une réponse tardive après changement de partie, de lieu, de cible ou de lot reste sans effet. Annulation, suspension et démontage terminent le Worker.

Un trajet déjà affiché devient « Recalculer » quand le terrain cargo ou la destination change. Son ancien trait disparaît de la carte. Le joueur choisit le nouveau calcul ; aucun trajet ni action n’est exécuté automatiquement. Les objets K-17 plats ne créent pas de nouvel obstacle, mais leur déplacement change leur repère : un trajet vers leur ancienne place est également invalidé.

Dans le quai déjà visité, l’Atlas montre les empreintes exactes des deux lots, du chariot et des racks. Le registre indique la charge portée ou la place conservée et propose un accès au repère du lot posé. « Agrandir le trajet à pied » cadre ses véritables points ; la taille des marqueurs s’adapte pour laisser voir les emprises. Les lots ne sont pas révélés dans le registre avant la visite du port.

Les huit tests `tests/homeworld-dynamic-navigation-v109.test.mjs` vérifient notamment la marche du vrai moteur autour des lots initiaux puis d’un lot réellement porté et posé, la continuité du guidage, les caches, les raccords entre étages, un objet K-17 déplacé par ses actions réelles, et la reprise précise de son étude interrompue avec une arrivée à trois unités. Les quatre tests UI V98 restent exécutés sans modification.

`scripts/qa-homeworld-atlas-browser-v109.mjs` vérifie neuf contrôles dans le véritable composant React Atlas et son module Worker. Ses changements de parent et sa livraison différée de messages sont des fixtures déclarées ; le checkpoint cargo a été préparé par les actions du modèle. Ses deux captures concernent cette intégration isolée. Ce contrôle ne constitue pas un parcours de campagne ni une admission d’art ou de build de production.

Les modules historiques V98/V99, classeurs, gels et preuves V108/V107 restent conservés. Les nouveaux modules V109 et l’intégration de la carte portent la fonctionnalité courante.
