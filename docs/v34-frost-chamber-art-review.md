# Chambre de Givre — revue du kit V34

Proposition originale du projet, fondée sur le catalogue local et pitFirstEdition. La conversation détaillée manquante n'est pas présentée comme retrouvée.

Contexte : A Yautja polar cryogenic sanctuary carved into an ice reserve, frozen ancient machinery integrated into ice, cold interior not an outdoor mountain.

Direction visuelle : Deep navy, desaturated glacier blue, pale frost and brushed dark titanium; cool overhead light with tiny cyan instrument glows.

Quatorze images OpenAI intégrées à la chaîne de production, chacune générée seule et conservée sans retouche de pixels. Les prompts, originaux et SHA complets sont archivés sous art-source/v34/pit-arenas/frost-chamber. Les statuts reviewed concernent ici l'inspection des images individuelles et de leurs fenêtres de rendu ; le kit reste désactivé avant sa recette de composition.

| Plan | Image distincte | Dimensions | Transparence | SHA court |
|---|---|---|---|---|
| P0 | p0-a-depth | 1536×1024 | opaque prévu | 4372291c4048 |
| P1 | p1-a-distant-left | 1774×887 | alpha réel | 3e6652e77d2f |
| P1 | p1-b-distant-right | 1536×1024 | alpha réel | 41e1247dbe83 |
| P2 | p2-a-support-left | 1024×1536 | alpha réel | a246de5c1afb |
| P2 | p2-b-support-right | 1536×1024 | alpha réel | 921ba85ec2f3 |
| P2 | p2-c-central-structure | 1536×1024 | alpha réel | 06e3cae2066c |
| P3 | p3-a-prop-left | 1536×1024 | alpha réel | 952365286d42 |
| P3 | p3-b-prop-right | 1536×1024 | alpha réel | 735471e6d508 |
| P3 | p3-c-light-left | 1024×1536 | alpha réel | 49896a5f4ea1 |
| P3 | p3-d-light-right | 1024×1536 | alpha réel | e493c3317180 |
| P4 | p4-a-contact-floor | 2172×724 | alpha réel | 08fe02b3baef |
| P4 | p4-b-front-fascia | 2172×724 | alpha réel | 065620f51519 |
| P5 | p5-a-foreground-left | 1536×1024 | alpha réel | ba6bd513491a |
| P5 | p5-b-foreground-right | 1536×1024 | alpha réel | 549662a82f21 |

Les ouvertures sont transparentes, les accessoires et luminaires ne sont pas imprimés dans le fond. Les supports proches sont ancrés verticalement au sol réel ; les objets suspendus sont alignés par leur sommet. Le sol de contact est au facteur 1, avec une première ligne opaque mesurée. Les avant-plans s'effacent devant un combattant. Les 14 dessins sont fixes : aucune animation nouvelle n'est annoncée pour ce kit.

## Revue de composition

Les captures centre, rapprochée et coins gauche/droit du renderer réel ont été inspectées après chargement des 14 PNG. Le sol reste droit sous les combattants, les supports restent assis sur leur niveau, les lampes restent suspendues et les ouvertures sont transparentes. La recette docs/v34-frost-chamber-renderer-qa.json valide six plans, huit scénarios et le cadrage mobile, sans erreur ni changement du combat/caméra. Le kit est activé après cette revue. Les images restent au statut reviewed tant que la recette de l'application complète n'est pas archivée.

## Application complète

La recette docs/v34-frost-chamber-fullapp-qa.json valide les 14 images dans la sélection, l'entraînement, le combat, les déplacements et le cadrage mobile. Aucune image manquante ou erreur n'est remontée. Les 14 PNG passent au statut integrated sans ajouter de dessin ni de jouabilité conceptuelle au compteur.
