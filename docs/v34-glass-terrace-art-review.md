# Terrasse de Verre — revue du kit V34

Proposition originale du projet, fondée sur le catalogue local et pitFirstEdition. La conversation détaillée manquante n'est pas présentée comme retrouvée.

Contexte : Serekh-9 vitrified dunes and an ancient suspended glass terrace with structural pylons. Desert glass architecture, not a futuristic human city.

Direction visuelle : Deep teal shadows, dark turquoise desert glass, pale sand haze, oxidized brass; soft desaturated golden light from upper left.

Quatorze images OpenAI intégrées à la chaîne de production, chacune générée seule et conservée sans retouche de pixels. Les prompts, originaux et SHA complets sont archivés sous art-source/v34/pit-arenas/glass-terrace. Les statuts reviewed concernent ici l'inspection des images individuelles et de leurs fenêtres de rendu ; le kit reste désactivé avant sa recette de composition.

| Plan | Image distincte | Dimensions | Transparence | SHA court |
|---|---|---|---|---|
| P0 | p0-a-depth | 1536×1024 | opaque prévu | 44d085817ccb |
| P1 | p1-a-distant-left | 1024×1536 | alpha réel | 6533fcb7f418 |
| P1 | p1-b-distant-right | 1536×1024 | alpha réel | a55f3d6b282a |
| P2 | p2-a-support-left | 1145×1374 | alpha réel | 76dbe5316d31 |
| P2 | p2-b-support-right | 1024×1536 | alpha réel | b5ffd18e3fef |
| P2 | p2-c-central-structure | 1024×1536 | alpha réel | 74fa8ee16b3b |
| P3 | p3-a-prop-left | 1536×1024 | alpha réel | 64ff81959c05 |
| P3 | p3-b-prop-right | 1536×1024 | alpha réel | 8090f64b292b |
| P3 | p3-c-light-left | 1024×1536 | alpha réel | 5eeb425f2b99 |
| P3 | p3-d-light-right | 1024×1536 | alpha réel | 1f86abe309f0 |
| P4 | p4-a-contact-floor | 2172×724 | alpha réel | 2143ecbced77 |
| P4 | p4-b-front-fascia | 2172×724 | alpha réel | 141f81f50596 |
| P5 | p5-a-foreground-left | 1024×1536 | alpha réel | da4430392b52 |
| P5 | p5-b-foreground-right | 1536×1024 | alpha réel | 6c7bd2eecf72 |

Les ouvertures sont transparentes, les accessoires et luminaires ne sont pas imprimés dans le fond. Les supports proches sont ancrés verticalement au sol réel ; les objets suspendus sont alignés par leur sommet. Le sol de contact est au facteur 1, avec une première ligne opaque mesurée. Les avant-plans s'effacent devant un combattant. Les 14 dessins sont fixes : aucune animation nouvelle n'est annoncée pour ce kit.

## Revue de composition

Les captures centre, rapprochée et coins gauche/droit du renderer réel ont été inspectées après chargement des 14 PNG. Le sol reste droit sous les combattants, les supports restent assis sur leur niveau, les lampes restent suspendues et les ouvertures sont transparentes. La recette docs/v34-glass-terrace-renderer-qa.json valide six plans, huit scénarios et le cadrage mobile, sans erreur ni changement du combat/caméra. Le kit est activé après cette revue. Les images restent au statut reviewed tant que la recette de l'application complète n'est pas archivée.

## Application complète

La recette docs/v34-glass-terrace-fullapp-qa.json valide les 14 images dans la sélection, l'entraînement, le combat, les déplacements et le cadrage mobile. Aucune image manquante ou erreur n'est remontée. Les 14 PNG passent au statut integrated sans ajouter de dessin ni de jouabilité conceptuelle au compteur.
