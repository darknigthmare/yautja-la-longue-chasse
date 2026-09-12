# Réserve des Crocs — revue du kit V34

Proposition originale du projet, fondée sur le catalogue local et pitFirstEdition. La conversation détaillée manquante n'est pas présentée comme retrouvée.

Contexte : Enclos d'observation sécurisé, sans créature lâchée en classé

Direction visuelle : Dim olive botanical light, cool wet slate stone, aged bronze reinforced cages, small amber security lamps, moss and condensation.

Quatorze images OpenAI intégrées à la chaîne de production, chacune générée seule et conservée sans retouche de pixels. Les prompts, originaux et SHA complets sont archivés sous art-source/v34/pit-arenas/arena-011-reserve-des-crocs. Les statuts reviewed concernent ici l'inspection des images individuelles et de leurs fenêtres de rendu ; le kit reste désactivé avant sa recette de composition.

| Plan | Image distincte | Dimensions | Transparence | SHA court |
|---|---|---|---|---|
| P0 | p0-a-depth | 1536×1024 | opaque prévu | 63c9ea6c30f4 |
| P1 | p1-a-distant-left | 1774×887 | alpha réel | 5ef83a9707cf |
| P1 | p1-b-distant-right | 1536×1024 | alpha réel | 32f0df7655fb |
| P2 | p2-a-support-left | 1024×1536 | alpha réel | b22cefab85ff |
| P2 | p2-b-support-right | 1145×1374 | alpha réel | 93e6969cde02 |
| P2 | p2-c-central-structure | 1536×1024 | alpha réel | deab5dff19e1 |
| P3 | p3-a-prop-left | 1774×887 | alpha réel | d22f4af92e50 |
| P3 | p3-b-prop-right | 1536×1024 | alpha réel | b31f92048020 |
| P3 | p3-c-light-left | 1024×1536 | alpha réel | 9ad325ce527e |
| P3 | p3-d-light-right | 1024×1536 | alpha réel | 8da854a664db |
| P4 | p4-a-contact-floor | 2172×724 | alpha réel | c9cf63ed7c27 |
| P4 | p4-b-front-fascia | 2172×724 | alpha réel | ea5e5feb2071 |
| P5 | p5-a-foreground-left | 1024×1536 | alpha réel | 7373cc37b7ee |
| P5 | p5-b-foreground-right | 1024×1536 | alpha réel | 5fbd4b7521bd |

Les ouvertures sont transparentes, les accessoires et luminaires ne sont pas imprimés dans le fond. Les supports proches sont ancrés verticalement au sol réel ; les objets suspendus sont alignés par leur sommet. Le sol de contact est au facteur 1, avec une première ligne opaque mesurée. Les avant-plans s'effacent devant un combattant. Les 14 dessins sont fixes : aucune animation nouvelle n'est annoncée pour ce kit.

Kit de production pour une entrée concept du catalogue. Il reste non jouable : aucune attribution de runtimeArenaId, aucune activation runtime. La recette utilise un étalon géométrique séparé du registre du jeu.

## Revue de composition non jouable

Les captures centre, rapprochée et coins gauche/droit ont été inspectées avec les vrais PNG et deux combattants du projet. Sol et appuis sont cohérents, les ouvertures gardent leur transparence et les éléments suspendus conservent leur ancrage. La recette docs/v34-arena-011-reserve-des-crocs-renderer-qa.json valide six plans, huit scénarios et le cadrage mobile, sans erreur ni changement du combat ou de la caméra. Cette prévisualisation utilise uniquement dans le harnais la géométrie de THE PIT comme gabarit de contrôle. Elle ne valide ni le level design final ni un accès dans le jeu : statut concept, aucun identifiant d'arène runtime, runtimeEnabled=false, images reviewed et integration=null sont conservés.
