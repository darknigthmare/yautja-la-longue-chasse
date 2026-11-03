# Cour de Cendre — revue du kit V34

Proposition originale du projet, fondée sur le catalogue local et pitFirstEdition. La conversation détaillée manquante n'est pas présentée comme retrouvée.

Contexte : An ancient Yautja ritual courtyard damaged by volcanic fire, shielded by engineered thermal screens. Volcanic horizon outdoors, no lava on the safe fighting platform.

Direction visuelle : Charcoal basalt, ashen grey, scorched bronze, restrained ember orange, smoky dusk light from upper left.

Quatorze images OpenAI intégrées à la chaîne de production, chacune générée seule et conservée sans retouche de pixels. Les prompts, originaux et SHA complets sont archivés sous art-source/v34/pit-arenas/ash-courtyard. Les statuts reviewed concernent ici l'inspection des images individuelles et de leurs fenêtres de rendu ; le kit reste désactivé avant sa recette de composition.

| Plan | Image distincte | Dimensions | Transparence | SHA court |
|---|---|---|---|---|
| P0 | p0-a-depth | 1536×1024 | opaque prévu | e9d10991f6af |
| P1 | p1-a-distant-left | 1024×1536 | alpha réel | c59ca97a6bb5 |
| P1 | p1-b-distant-right | 1024×1536 | alpha réel | 3b670364b5c6 |
| P2 | p2-a-support-left | 1024×1536 | alpha réel | 2944ae56bb0c |
| P2 | p2-b-support-right | 1024×1536 | alpha réel | 7732cc36c9b7 |
| P2 | p2-c-central-structure | 1536×1024 | alpha réel | 52644c9f050c |
| P3 | p3-a-prop-left | 1536×1024 | alpha réel | d752e9b7aec2 |
| P3 | p3-b-prop-right | 1536×1024 | alpha réel | 996c417a348e |
| P3 | p3-c-light-left | 1024×1536 | alpha réel | 7b83e025c679 |
| P3 | p3-d-light-right | 1024×1536 | alpha réel | 0eb21abe4129 |
| P4 | p4-a-contact-floor | 2172×724 | alpha réel | da3c92e4722e |
| P4 | p4-b-front-fascia | 2172×724 | alpha réel | 5114494088f1 |
| P5 | p5-a-foreground-left | 1024×1536 | alpha réel | da36a65c9694 |
| P5 | p5-b-foreground-right | 1536×1024 | alpha réel | 18aa88955362 |

Les ouvertures sont transparentes, les accessoires et luminaires ne sont pas imprimés dans le fond. Les supports proches sont ancrés verticalement au sol réel ; les objets suspendus sont alignés par leur sommet. Le sol de contact est au facteur 1, avec une première ligne opaque mesurée. Les avant-plans s'effacent devant un combattant. Les 14 dessins sont fixes : aucune animation nouvelle n'est annoncée pour ce kit.

## Revue de composition

Les captures centre, rapprochée et coins gauche/droit du renderer réel ont été inspectées après chargement des 14 PNG. Le sol reste droit sous les combattants, les supports restent assis sur leur niveau, les lampes restent suspendues et les ouvertures sont transparentes. La recette docs/v34-ash-courtyard-renderer-qa.json valide six plans, huit scénarios et le cadrage mobile, sans erreur ni changement du combat/caméra. Le kit est activé après cette revue. Les images restent au statut reviewed tant que la recette de l'application complète n'est pas archivée.

## Application complète

La recette docs/v34-ash-courtyard-fullapp-qa.json valide les 14 images dans la sélection, l'entraînement, le combat, les déplacements et le cadrage mobile. Aucune image manquante ou erreur n'est remontée. Les 14 PNG passent au statut integrated sans ajouter de dessin ni de jouabilité conceptuelle au compteur.
