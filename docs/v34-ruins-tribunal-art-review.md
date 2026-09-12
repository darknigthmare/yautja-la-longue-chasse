# Tribunal des Ruines — revue du kit V34

Proposition originale du projet, fondée sur le catalogue local et pitFirstEdition. La conversation détaillée manquante n'est pas présentée comme retrouvée.

Contexte : A ruined ancient Yautja city repurposed as an open-air tribunal of judgment. Original ceremonial architecture and anonymous elder effigies, not any named canonical character.

Direction visuelle : Muted sandstone ochre, deep slate brown, patinated gold accents, dark olive weathering, soft cloudy afternoon light from upper left.

Quatorze images OpenAI intégrées à la chaîne de production, chacune générée seule et conservée sans retouche de pixels. Les prompts, originaux et SHA complets sont archivés sous art-source/v34/pit-arenas/ruins-tribunal. Les statuts reviewed concernent ici l'inspection des images individuelles et de leurs fenêtres de rendu ; le kit reste désactivé avant sa recette de composition.

| Plan | Image distincte | Dimensions | Transparence | SHA court |
|---|---|---|---|---|
| P0 | p0-a-depth | 1536×1024 | opaque prévu | 68c66d17a554 |
| P1 | p1-a-distant-left | 1774×887 | alpha réel | fba369e2c02b |
| P1 | p1-b-distant-right | 1536×1024 | alpha réel | cb568daf9e91 |
| P2 | p2-a-support-left | 1024×1536 | alpha réel | a27a6dabca2d |
| P2 | p2-b-support-right | 1024×1536 | alpha réel | 73e00657c487 |
| P2 | p2-c-central-structure | 1536×1024 | alpha réel | 36d0b9a37b35 |
| P3 | p3-a-prop-left | 1536×1024 | alpha réel | b50f4b30051c |
| P3 | p3-b-prop-right | 1536×1024 | alpha réel | 9f24b520569b |
| P3 | p3-c-light-left | 1024×1536 | alpha réel | 6521c05291f4 |
| P3 | p3-d-light-right | 1024×1536 | alpha réel | 1f2c3541a2fa |
| P4 | p4-a-contact-floor | 2048×768 | alpha réel | 789d1488cfb3 |
| P4 | p4-b-front-fascia | 2172×724 | alpha réel | ffedbeb2d761 |
| P5 | p5-a-foreground-left | 1024×1536 | alpha réel | 8ef63ca28a57 |
| P5 | p5-b-foreground-right | 1024×1536 | alpha réel | 570df832fdc0 |

Les ouvertures sont transparentes, les accessoires et luminaires ne sont pas imprimés dans le fond. Les supports proches sont ancrés verticalement au sol réel ; les objets suspendus sont alignés par leur sommet. Le sol de contact est au facteur 1, avec une première ligne opaque mesurée. Les avant-plans s'effacent devant un combattant. Les 14 dessins sont fixes : aucune animation nouvelle n'est annoncée pour ce kit.

## Revue de composition

Les captures centre, rapprochée et coins gauche/droit du renderer réel ont été inspectées après chargement des 14 PNG. Le sol reste droit sous les combattants, les supports restent assis sur leur niveau, les lampes restent suspendues et les ouvertures sont transparentes. La recette docs/v34-ruins-tribunal-renderer-qa.json valide six plans, huit scénarios et le cadrage mobile, sans erreur ni changement du combat/caméra. Le kit est activé après cette revue. Les images restent au statut reviewed tant que la recette de l'application complète n'est pas archivée.

## Application complète

La recette docs/v34-ruins-tribunal-fullapp-qa.json valide les 14 images dans la sélection, l'entraînement, le combat, les déplacements et le cadrage mobile. Aucune image manquante ou erreur n'est remontée. Les 14 PNG passent au statut integrated sans ajouter de dessin ni de jouabilité conceptuelle au compteur.
