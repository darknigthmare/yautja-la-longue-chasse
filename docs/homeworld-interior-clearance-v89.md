# Intérieurs V89 — corrections de circulation

Le contrôle du runtime a reproduit **deux zones de la forge inaccessibles au corps entier** : préparation des parures et manutention des lots fermés. Les quinze points de service/histoire restaient déjà accessibles ; ce lot ne crée donc aucun service et ne revendique pas leur déblocage.

Vingt et un appuis sont déplacés dans huit salles. Quatre repères de traversée sont aussi recalés dans trois salles, dont le marché : le périmètre total touche donc neuf salles. Aucun identifiant, image native, échelle, empreinte, collider, cloison, enveloppe, zone, point de service, table/hôte C’ntlip, seuil de sauvegarde, mission, récompense ou règle de progression n’est remplacé. Les objets environnementaux restent non interactifs. La largeur déclarée des repères de composition n’est pas présentée comme une largeur libre mesurée entre deux murs.

## Poses au sol avant et après

Coordonnées locales du pivot natif, sans déplacement CSS ni réduction d’empreinte.

| Identifiant | Avant (x, y) | Après (x, y) |
| --- | --- | --- |
| `dock-control-v84-control-standard` | 172, 116 | 172, 200 |
| `dock-control-v84-inspection-register` | 442, 116 | 224, 40 |
| `dock-control-v84-inspection-case` | 371, 116 | 220, 82 |
| `deep-forge-v83-preparation-bench` | 126, 194 | 130, 166 |
| `deep-forge-v72-banner-east` | 399, 145 | 338, 132 |
| `deep-forge-v72-east-rear-storage` | 488, 212 | 488, 116 |
| `deep-forge-v76-1` | 512, 142 | 512, 216 |
| `deep-forge-v72-foyer-light-east` | 504, 250 | 336, 296 |
| `training-hall-v82-preparation-containers` | 226, 136 | 226, 224 |
| `memory-vault-v82-west-register-containers` | 224, 76 | 226, 314 |
| `clan-lodge-v72-east-receiving-bench` | 344, 396 | 344, 406 |
| `convoy-workshop-v84-small-containers` | 514, 278 | 482, 170 |
| `convoy-workshop-v76-1` | 62, 220 | 88, 212 |
| `convoy-store-v84-sorting-rack` | 115, 130 | 115, 110 |
| `convoy-store-v84-dispatch-counter` | 428, 134 | 428, 116 |
| `deep-forge-v83-loading-crates` | 400, 216 | 201, 296 |
| `memory-vault-v82-west-record-standard` | 224, 196 | 224, 356 |
| `memory-vault-v76-0` | 48, 48 | 48, 130 |
| `trophy-mausoleum-v82-sealed-maintenance-containers` | 510, 78 | 510, 145 |
| `training-hall-v82-preparation-standard` | 508, 100 | 344, 224 |
| `memory-vault-v82-east-record-containers` | 494, 75 | 486, 220 |

Le lot fermé de la forge rejoint le côté du vestibule, hors du chemin de manutention. L’établi conserve son angle et son support natifs. Dans la loge, le banc reçoit seulement dix unités supplémentaires de recul ; la table et l’hôte C’ntlip restent aux coordonnées existantes.

| Repère d’approche | Avant | Après |
| --- | --- | --- |
| `dock-control-v74-passage-lateral` | 192, 174 | 204, 156 |
| `market-armory-v83-stock-branch` | 402, 196 | 377, 240 |
| `deep-forge-v83-inspection-approach` | 134.5, 144 | 161, 124 |
| `deep-forge-v83-loading-branch` | 402, 236 | 402, 212 |

Les centres anciens étaient recouverts par des appuis. Les centres corrigés sont atteints en marchant avec le vrai volume du personnage ; identifiants, orientations et largeurs déclarées restent inchangés. Ces repères ne constituent pas de nouveaux portails ou planchers.

## Validation bornée

`tests/homeworld-interior-clearance-v89.test.mjs` ajoute 90 contrôles. Il évalue les **43 salles actives** avec le prédicat réel `isHomeworldInteriorWalkableV64`, d’abord pour le corps du jeu (demi-largeur 24, demi-profondeur 14), puis avec quatre unités supplémentaires de chaque côté (28 et 18). Le parcours utilise des arêtes cardinales de quatre unités, chacune contrôlée à chaque unité : aucune diagonale ne traverse un mur entre deux échantillons.

Chaque zone doit contenir le corps entier à un point réellement atteint. Chaque service/histoire conserve son descripteur et sa position et doit être sélectionnable depuis ce parcours ; les sorties et les centres des traversées actuelles doivent également être atteints. Les objets déplacés gardent un appui complet dans l’enveloppe, restent solides et ne croisent ni autre support, ni cloison, ni corps d’un point de service. Les supports obliques V83/V84 sont comparés par leurs vrais polygones, avec séparation sur leurs axes, et leur proximité est mesurée jusqu’au contour. Un rendu SSR du vrai composant de surface contrôle les vingt et un objets indépendants dans les huit salles concernées, sans trophée possédé fictif.

La réserve historique `memory-vault-v72-role-east` conserve son approche antérieure de 74 unités avec le corps du jeu et de 78 avec marge. C’est un décor non interactif, pas une action inaccessible. Cette exception précise préexistante n’est étendue à aucun autre meuble : leurs approches restent strictement inférieures à 60 unités, et celles des décors à 65.

Les quatre suites V72/V74/V76/V81 restent actives. Leurs décomptes obsolètes décrivent maintenant les ajouts explicitement nommés (30 meubles originaux V72, 92 décors originaux V76, 8 meubles V83 et 10 décors V83/V84), sans retirer de contrôle physique ni réduire le corps. Le test V72 utilise désormais le véritable corps avec marge et une vérification continue de chaque arête ; sa marge verticale ancienne de 30 unités n’était pas la profondeur corporelle du runtime.

Pour les seules empreintes historiques, `tests/helpers/homeworld-interior-history-v89.mjs` évalue les producteurs originaux jusqu’à V81, en retirant exactement le suffixe connu des trois couches V82/V83/V84. Le SHA historique des cinq pièces originales reste **`1d20d34589a448688f93318a009dde68faa89841df057848804ee5564e6e3be5`**. Cette projection n’est jamais utilisée pour les collisions, les trajets ni le rendu actuels ; les 43 salles du modèle actif conservent toutes leurs couches et leurs colliders. L’échec est obligatoire si la frontière de couches change.

La commande initiale des cinq suites passe : **192/192**, dont les 90 nouveaux contrôles. En ajoutant les trois suites voisines V84/V85, le lot final passe **212/212**. Le lint ciblé passe et TypeScript ne produit aucun diagnostic pour les trois modules modifiés. La preuve finale est dans le journal local ignoré `work-local/v89/qa/interior-clearance-v89.log`.

La suite V85 de recherche de positions garde sa preuve négative d’île nord des quais sur les trois poses antérieures exactes. Une preuve positive supplémentaire exige que le nord soit maintenant relié au spawn public, avec le corps entier et chaque unité d’arête vérifiée. Le helper partagé de recherche de chemin n’est ni modifié ni remplacé.

La conservation des identifiants, services, spawn et sorties ne garantit pas chaque ancienne coordonnée libre dans une sauvegarde. Si un personnage était précisément à l'emplacement d'un objet maintenant déplacé, le résolveur existant refuse cette position solide et applique son repli au port. Ce lot ne remplace ni n'efface la campagne ; il ne modifie pas cette politique de reprise.

La validation globale du snapshot intérieur passe ensuite à 19:57 UTC : lint des dix fichiers TS/tests, TypeScript sans cache incremental, compilation Next webpack et contrôle du CSS réellement référencé par la route. Les fiches V82/V83/V84 sont actualisées pour distinguer ces tests du modèle et la validation visuelle encore absente.

Ce résultat prouve le modèle et le rendu SSR borné. Il ne constitue ni une validation visuelle interactive, ni une preuve de jouabilité en production. Les champs publics V82/V83/V84 conservent leur qualification prudente `implemented-not-verified` et ne revendiquent pas de revue visuelle.
