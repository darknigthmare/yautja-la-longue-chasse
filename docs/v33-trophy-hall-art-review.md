# Hall des Trophées — kit original V33

Cette composition est une proposition originale du projet, fondée sur la fiche locale « Galerie cérémonielle dont les vitrines restent hors collision » et le lieu runtime « Vaisseau clanique · galerie des prises ». La conversation détaillée des cent arènes n'a pas été retrouvée : aucun sous-plan ci-dessous ne lui est attribué.

Les quatorze images sont nouvelles et produites avec l'outil intégré OpenAI image_gen. Aucun bitmap THE PIT n'est compté dans ce second kit. Les prompts exacts, dimensions, SHA-256, bornes alpha et originaux sont conservés sous `art-source/v33/pit-arenas/trophy-hall/` ; les PNG publics sont sous `/game/sprites/v33/pit-arenas/trophy-hall/`. Aucun pixel n'a été retouché par un script.

| Plan | Images indépendantes | Contrôle visuel et fonction |
|---|---|---|
| P0 | `p0-a-archive-depth` | Profondeur intérieure de vaisseau, bas de scène sombre, aucun sol ou trophée imprimé dans le panorama. Seule image volontairement opaque. |
| P1 | `p1-a-vault-rib-left`, `p1-b-vault-rib-right` | Supports spatiaux opposés, formes et joints différents, branches orientées vers le centre, pas de duplication par miroir. |
| P2 | `p2-a-central-archive-arch` | Arche autonome et réellement ajourée, proportions conservées, aucune porte ou pièce arbitraire imprimée dans l'ouverture. |
| P2 | `p2-b-display-case-left`, `p2-c-display-case-right` | Deux vitrines vides indépendantes, basse plateforme et mince verre transparent ; attaches latérales distinctes, espaces d'exposition lisibles. |
| P3 | `p3-a-trophy-crowned-skull`, `p3-b-trophy-armored-jaw` | Deux trophées fossilisés originaux, sans attribution à une espèce canonique. Os secs, trous transparents et silhouettes complètes. Aucun fond ni vitrine peints avec le trophée. |
| P3 | `p3-c-archive-lamp-left`, `p3-d-archive-lamp-right` | Lampes spatiales différentes de même famille, protections métalliques latérales cohérentes, lumière ambrée sobre, contours alpha. |
| P4 | `p4-a-gallery-floor-tile`, `p4-b-gallery-front-fascia` | Élévations frontales horizontales ; aucun dessus en perspective. Le contact du sol utilise une fenêtre x42,y303,w2089,h121, avec première ligne totalement opaque au seuil alpha 250. |
| P5 | `p5-a-hanging-token-left`, `p5-b-hanging-token-right` | Décorations suspendues autonomes, cordes et médaillons réellement ajourés, formes gauche/droite différentes. Placement aux bords et fondu devant un combattant. |

Les objets ont été inspectés individuellement lors de la génération puis mesurés dans les fichiers PNG. Les trophées et leurs vitrines emploient le même facteur 0,24 : leurs fichiers restent indépendants, mais le mouvement ne les désolidarise pas. Les deux luminaires sont au facteur 0,43. Le sol de contact suit exactement la caméra des combattants au facteur 1.

Les apparentes franges rouges/jaunes de l'aperçu de génération des deux trophées ont été contrôlées sur les pixels visibles du PNG : zéro pixel rouge saturé ou jaune saturé aux seuils documentés (alpha>32). Elles ne sont pas reprises comme une correction de pixels ou une fausse régénération.

La réception de quatorze images fixes n'est pas une animation de décor. Aucun clip animé n'est annoncé pour le Hall. La recette de composition, cadrages, coins, lumière réduite et mouvement réduit est consignée séparément après exécution du harnais Chromium.

## Revue de composition dans Chromium

La capture 960×540 a été examinée : vitrines entières, trophées inscrits dans leurs ouvertures, transparence effective du verre et des trous, arche centrale dégagée, sol droit sous les pieds, éclairage cohérent et objets proches aux bords. Leurs positions verticales ont été abaissées de 4 unités pour asseoir les trophées sur la tablette de présentation. Le kit est activé après cette revue. Les statuts sont passés de `reviewed` à `integrated` après la recette complète de l'application, archivée dans `docs/v33-trophy-hall-fullapp-qa.json`.

Le harnais rapporte 14 images réellement chargées, six plans dessinés, deux chasseurs présents, huit cadrages/options et un contrôle mobile, sans échec réseau/JavaScript ni mutation du combat. Ce contrôle isolé ne certifie pas le ratio CSS/canvas de la vue complète du jeu ; le letterbox signalé par la revue full app reste un sujet distinct.

## Correction après inspection des gros plans

La première composition passait les assertions de chargement, mais présentait des vitrines visuellement suspendues au-dessus du sol à zoom fort. Un ancrage vertical a donc été ajouté aux supports, à l'arche, aux vitrines et aux trophées associés. Leur base suit la projection réelle du sol ; leurs largeurs et déplacements horizontaux conservent le facteur de profondeur prévu. Les collisions ne sont pas modifiées. La recette Chromium a été réexécutée après cette correction le 12 septembre 2026 à 19:14 UTC : 14 images, six plans, huit scénarios et zéro erreur. Les nouvelles captures rapprochées, coins gauche/droit et larges ont été examinées : les vitrines reposent sur le sol. Le test de projection compare aussi leur base au véritable dessin du sol sur 54 combinaisons de caméra et de mouvement réduit. Les anciennes captures ne servent pas de preuve de cette correction.

## Intégration dans l'application

La recette de l'application complète du 12 septembre 2026 à 19:18 UTC valide le choix du Hall en entraînement, les 14 chemins d'images propres à cette arène, 14 sous-plans, six plans dessinés et zéro image manquante, erreur JavaScript ou échec réseau. Le contrôle mobile ne déborde pas horizontalement. Cette preuve est conservée dans `docs/v33-trophy-hall-fullapp-qa.json`. Les quatorze images passent au statut `integrated` ; aucun dessin supplémentaire ni animation n'est ajouté au compteur.
