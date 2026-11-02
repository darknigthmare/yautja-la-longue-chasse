# Joints réels du passage des marais — V113

Le parvis conservait de minces fentes entre des pavements du même étage. Treize joints dérivés de leurs arêtes ajoutent 38 008,178 unités² de sol réel, avec une largeur bornée à 64 unités. Les 164 surfaces publiques d’entrée restent intactes. Le même tableau de polygones sert au pavement, au support de l’acteur, aux contours exposés et à l’exclusion des décors naturels. Aucun PNG ni ancien objet n’est déplacé ou retouché.

Le modèle pur est `app/game/systems/homeworldMarshGroundJointsV113.ts`, monté une seule fois par `homeworldWorldV77.ts`. La restauration V112 exclut explicitement ces nouveaux IDs de son ancien sol. Le passage graphique indépendant tenté auparavant a été refusé : ses bandes ressemblaient à des tuyaux. Il n’est pas conservé dans le produit.

La comparaison ciblée contient [le brut avant](before/result.json), [le brut après](after/result.json), leurs listes de captures ouvertes, [la revue](review.json) et [les données géométriques](geometry.json). Les 36 captures originales ont toutes été réellement ouvertes. Chaque phase réussit 57 contrôles ; les six caméras fixes et acteurs initiaux correspondent exactement. Le nouvel après est exécuté dans Next en développement : ces résultats ne remplacent aucun certificat complet V112/R7 ni un futur gel de production.

Les trois traversées physiques échouent sur l’ancien build, aux abscisses 6164, 6164 et 6621. Avec les joints, les mêmes entrées atteignent respectivement 6085, 6054 et 6748, puis reviennent. La voie du guetteur est parcourue aller-retour ; le guide Worker et les vraies touches E permettent l’entrée et la sortie du contrôle des quais. Les checkpoints initiaux de chaque scène restent des fixtures déclarées.

Le lecteur du pilote n’extrait pas le Build ID du HTML R7. [La mesure indépendante](before/baseline-identity.json) retrouve cependant `wVuSG_xIKNn3geLlIq7Cb` et vérifie que ses octets HTML correspondent aux 22 réponses réellement utilisées pour l’avant. Aucun champ du brut n’a été réécrit.

Les dix fichiers de tests ciblés couvrent les nouveaux joints, les anciens joints, les faces naturelles, la restauration, la navigation, les 64 contacts et 30 segments d’accès, la mobilité et le guidage, les places publiques et les placements naturels. Les empreintes des objets, les portes et les solides sont comparés à un modèle privé sans les joints V113. TypeScript et ESLint ciblé réussissent ; leurs journaux sont conservés dans `checks/`.

**Limite ouverte :** le point oriental `(6653,2800)`, dans un vide plus large que ce traitement, reste sans support et non traversable. Le trajet réussi à y2700 ne le déclare pas corrigé. Les grands vides de composition, les silhouettes anguleuses et la répétition des reliefs restent également ouverts. Le diagnostic historique R7 et ses limites ne sont pas modifiés.

[Le relevé des ressources publiques](materialized-public-inputs.json) constate 536 originaux existants identiques entre le dépôt racine et l’arbre isolé ; 88 sont supplémentaires au gel R7. Ce relevé sert à matérialiser les ressources réellement requises par les essais et n’est pas, à lui seul, un inventaire complet de production V113. Aucune de ces copies ne constitue une nouvelle création artistique.
