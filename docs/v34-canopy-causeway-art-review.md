# Chaussée de Canopée — revue du kit V34

Proposition originale du projet, fondée sur le catalogue local et pitFirstEdition. La conversation détaillée manquante n'est pas présentée comme retrouvée.

Contexte : Root causeway above a stormy alien jungle of huge stone and tree pillars. Ancient Yautja hunting infrastructure, no modern human construction.

Direction visuelle : Deep jade green and charcoal, muted moss, aged bronze clamps, overcast cool rain light from upper left.

Quatorze images OpenAI intégrées à la chaîne de production, chacune générée seule et conservée sans retouche de pixels. Les prompts, originaux et SHA complets sont archivés sous art-source/v34/pit-arenas/canopy-causeway. Les statuts reviewed concernent ici l'inspection des images individuelles et de leurs fenêtres de rendu ; le kit reste désactivé avant sa recette de composition.

| Plan | Image distincte | Dimensions | Transparence | SHA court |
|---|---|---|---|---|
| P0 | p0-a-depth | 1536×1024 | opaque prévu | 2551e9c6d1d2 |
| P1 | p1-a-distant-left | 1536×1024 | alpha réel | 42879508803b |
| P1 | p1-b-distant-right | 1024×1536 | alpha réel | 83217cdfb3e2 |
| P2 | p2-a-support-left | 1536×1024 | alpha réel | 44a2312d2913 |
| P2 | p2-b-support-right | 1536×1024 | alpha réel | 86211d5e1079 |
| P2 | p2-c-central-structure | 2172×724 | alpha réel | 2331f070f225 |
| P3 | p3-a-prop-left | 1536×1024 | alpha réel | d1eadb76934f |
| P3 | p3-b-prop-right | 1536×1024 | alpha réel | 3aaac35619a3 |
| P3 | p3-c-light-left | 1024×1536 | alpha réel | 2d9be3a77097 |
| P3 | p3-d-light-right | 1024×1536 | alpha réel | fe108ff874a4 |
| P4 | p4-a-contact-floor | 2172×724 | alpha réel | 9abe70f78ac3 |
| P4 | p4-b-front-fascia | 2172×724 | alpha réel | b39733123f11 |
| P5 | p5-a-foreground-left | 1536×1024 | alpha réel | 0045878fe20c |
| P5 | p5-b-foreground-right | 1536×1024 | alpha réel | 60ae42baa3ee |

Les ouvertures sont transparentes, les accessoires et luminaires ne sont pas imprimés dans le fond. Les supports proches sont ancrés verticalement au sol réel ; les objets suspendus sont alignés par leur sommet. Le sol de contact est au facteur 1, avec une première ligne opaque mesurée. Les avant-plans s'effacent devant un combattant. Les 14 dessins sont fixes : aucune animation nouvelle n'est annoncée pour ce kit.

## Revue de composition

Les captures centre, rapprochée et coins gauche/droit du renderer réel ont été inspectées après chargement des 14 PNG. Le sol reste droit sous les combattants, les supports restent assis sur leur niveau, les lampes restent suspendues et les ouvertures sont transparentes. La recette docs/v34-canopy-causeway-renderer-qa.json valide six plans, huit scénarios et le cadrage mobile, sans erreur ni changement du combat/caméra. Le kit est activé après cette revue. Les images restent au statut reviewed tant que la recette de l'application complète n'est pas archivée.

## Application complète

La recette docs/v34-canopy-causeway-fullapp-qa.json valide les 14 images dans la sélection, l'entraînement, le combat, les déplacements et le cadrage mobile. Aucune image manquante ou erreur n'est remontée. Les 14 PNG passent au statut integrated sans ajouter de dessin ni de jouabilité conceptuelle au compteur.
