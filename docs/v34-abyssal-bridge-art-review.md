# Pont Abyssal — revue du kit V34

Proposition originale du projet, fondée sur le catalogue local et pitFirstEdition. La conversation détaillée manquante n'est pas présentée comme retrouvée.

Contexte : Pelagos-M coastal bridge with an exposed ancient starship hull, facing an ocean abyss with distant bioluminescence. Exterior over ocean, not an underwater room.

Direction visuelle : Deep ocean navy and petrol teal, cold sea haze, salt-worn dark steel and aged copper, restrained blue bioluminescence; soft storm light from upper left.

Quatorze images OpenAI intégrées à la chaîne de production, chacune générée seule et conservée sans retouche de pixels. Les prompts, originaux et SHA complets sont archivés sous art-source/v34/pit-arenas/abyssal-bridge. Les statuts reviewed concernent ici l'inspection des images individuelles et de leurs fenêtres de rendu ; le kit reste désactivé avant sa recette de composition.

| Plan | Image distincte | Dimensions | Transparence | SHA court |
|---|---|---|---|---|
| P0 | p0-a-depth | 1536×1024 | opaque prévu | 916bba9f2eed |
| P1 | p1-a-distant-left | 1536×1024 | alpha réel | a6db2c63481a |
| P1 | p1-b-distant-right | 1536×1024 | alpha réel | 001f030878cb |
| P2 | p2-a-support-left | 1536×1024 | alpha réel | 9e0110f88549 |
| P2 | p2-b-support-right | 1536×1024 | alpha réel | 5064b99b97d3 |
| P2 | p2-c-central-structure | 1774×887 | alpha réel | 482ad6683808 |
| P3 | p3-a-prop-left | 1536×1024 | alpha réel | 7c4c2d3cda13 |
| P3 | p3-b-prop-right | 1536×1024 | alpha réel | caf71b1d22d5 |
| P3 | p3-c-light-left | 1024×1536 | alpha réel | 7a05fe26952a |
| P3 | p3-d-light-right | 1024×1536 | alpha réel | 7b16c0ef03a7 |
| P4 | p4-a-contact-floor | 2161×728 | alpha réel | a05a3bb2c959 |
| P4 | p4-b-front-fascia | 2172×724 | alpha réel | 5f2366110198 |
| P5 | p5-a-foreground-left | 1536×1024 | alpha réel | 7812eaa5e931 |
| P5 | p5-b-foreground-right | 1536×1024 | alpha réel | a9a24244c044 |

Les ouvertures sont transparentes, les accessoires et luminaires ne sont pas imprimés dans le fond. Les supports proches sont ancrés verticalement au sol réel ; les objets suspendus sont alignés par leur sommet. Le sol de contact est au facteur 1, avec une première ligne opaque mesurée. Les avant-plans s'effacent devant un combattant. Les 14 dessins sont fixes : aucune animation nouvelle n'est annoncée pour ce kit.

## Revue de composition

Les captures centre, rapprochée et coins gauche/droit du renderer réel ont été inspectées après chargement des 14 PNG. Le sol reste droit sous les combattants, les supports restent assis sur leur niveau, les lampes restent suspendues et les ouvertures sont transparentes. La recette docs/v34-abyssal-bridge-renderer-qa.json valide six plans, huit scénarios et le cadrage mobile, sans erreur ni changement du combat/caméra. Le kit est activé après cette revue. Les images restent au statut reviewed tant que la recette de l'application complète n'est pas archivée.

## Application complète

La recette docs/v34-abyssal-bridge-fullapp-qa.json valide les 14 images dans la sélection, l'entraînement, le combat, les déplacements et le cadrage mobile. Aucune image manquante ou erreur n'est remontée. Les 14 PNG passent au statut integrated sans ajouter de dessin ni de jouabilité conceptuelle au compteur.
