# Homeworld — intégration graphique V85 et contrôles ciblés

Le suivi conserve les assets et identités historiques. Il n’ajoute aucun PNG, combattant, récompense, costume de marche ou animation sociale. Les dix dessins de guetteur déjà importés servent à des cartes de référence pour 40 habitants des dix clans ayant un métier de veille documenté. Ces cartes identifient le clan et le métier de la source, jamais le visage personnel de l’habitant. Les habitants sans correspondance certaine, notamment les artisans, soigneurs, enfants et habitants locaux sans clan documenté, gardent uniquement leur représentation existante.

Le provider recherche le rôle dans les champs de rôle, avec des mots entiers, et non dans le nom du clan ou le titre de l’image. Le clan « Artisans de la Roche Chaude » ne peut donc plus attribuer un chevaucheur à la recherche « artisan ». La consultation des versions historiques est explicite ; elle ne remplace pas automatiquement une identité ou une tenue. La petite bibliothèque de références de village reprend les IDs, URLs et SHA du registre importé, sans dupliquer les PNG ni charger tout le registre dans le composant du village.

Les cartes sont placées à côté du joueur dans le viewport et ne sont pas montées si aucun côté ne permet de garder sa démarche dégagée. Elles n’interceptent pas les commandes. Le renderer conserve les corps modulaires, trajets, vitesses, tenues et cellules natives existants.

## Résultats exécutés

| Commande ciblée | Résultat réel | Portée |
| --- | --- | --- |
| `node --test --test-concurrency=1 tests/homeworld-v84-v85-integration.test.mjs` | 11/11 PASS | Trois intérieurs portuaires, hospitalité clanique V83, collision et rendu serveur des décors V84, routines et marche native, matching de sources, dix clans et 40 références de veille, carte sans masquage du joueur. |
| `node --test --test-concurrency=1 tests/homeworld-village-life-v69.test.mjs tests/homeworld-village-activities-v70.test.mjs` | 35/35 PASS | Dix villages, routines, approches d’activités, portes, destinations et limites jeunesse/contrats préexistantes. |
| `node --test --test-name-pattern="all 98" tests/homeworld-civic-v80.test.mjs` | 1/1 PASS | 98 trajets civils, 14 extras, 43 approches de portes et 14 paliers. |
| `node --test --test-concurrency=1 tests/homeworld-world-navigation-v77.test.mjs` | 2/2 PASS | Sept trajets multi-niveaux depuis le Port, 43 portes et dix retours régionaux avec segments vérifiés pour le corps complet. |
| ESLint ciblé des 12 fichiers source/test concernés | exit 0 | Hub, village, portrait, providers, placements et test d’intégration ; aucun lint global exécuté par cet agent. |

Ces quatre groupes comptent 49 tests réussis. Le journal du groupe nouveau est `work-local/v85/qa/homeworld-v84-v85-integration.log`. Les tests de circulation utilisent le modèle actuel : corps 28 × 18, accès depuis le spawn, obstacles physiques et approches conservés. Les assertions corporelles n’ont pas été réduites. La restauration de l’ascenseur V83 attend un RAF annulable, vérifie le propriétaire de sauvegarde avant hydratation et ne persiste pas une station avant son hydratation correcte.

## Écarts historiques conservés

Le premier groupe mêlant civic V80, natural placements V80 et conversations V75 a donné 11 succès et 4 échecs. Le trajet des forges bloqué par le banc était un défaut réel ; il a été corrigé et son test existant repasse. Les trois autres assertions incompatibles avec les collections actuelles n’ont pas été assouplies :

- Le catalogue naturel actif compte 392 entrées au lieu de l’ancien attendu 394, avec 374 origines conservées et 18 éléments actuels de quai. Les assertions d’origines et de silhouettes hors plateforme/navette réussissent ; aucune trajectoire physique n’a été déclarée valide sur la seule base du compte.
- L’ancien pupitre `civic-v80:trophy-mausoleum:left:0` ne figure plus parmi les candidats de la composition V81 actuelle. Le catalogue civique actuel en compte 19, contre les 113 de l’ancienne génération V80. Ce n’est pas un nouveau refus V84 ; le compte et l’assertion d’origine anciens restent en échec.
- Le point 7340/5075 est actuellement légendé « Quai du retour des chasses » par la cour V81, contre l’ancien attendu « Halte du quai oriental ».

Ces constats ne rendent pas verte la suite historique globale et ne dispensent pas d’examiner ses autres échecs. Aucun défaut physique sérieux connu ne reste dans les trajets et intérieurs couverts par les groupes ci-dessus. Deux placements extérieurs restent volontairement refusés par les réserves de bâtiments : le râtelier des maîtres et le brasero de mémoire. Ils ne sont ni dessinés ni solides.

Les tests ciblés de modèle et de rendu serveur ne constituent pas une certification de pixels, caméra, performances, lore 1:1, gameplay navigateur ou comportement de production. Typecheck, lint et build globaux, contrôle navigateur, commit et publication sont conduits séparément par la racine ; ce rapport ne prétend pas les avoir réalisés.
