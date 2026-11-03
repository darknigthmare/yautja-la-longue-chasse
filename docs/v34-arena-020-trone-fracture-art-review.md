# Trône Fracturé — revue du kit V34

Proposition originale du projet, fondée sur le catalogue local et pitFirstEdition. La conversation détaillée manquante n'est pas présentée comme retrouvée.

Contexte : Salle cérémonielle endommagée par une crise de clan

Direction visuelle : Storm-dark burgundy ceremonial stone, broken aged gold, cold charcoal shadows, restrained amber mourning lamps.

Quatorze images OpenAI intégrées à la chaîne de production, chacune générée seule et conservée sans retouche de pixels. Les prompts, originaux et SHA complets sont archivés sous art-source/v34/pit-arenas/arena-020-trone-fracture. Les statuts reviewed concernent ici l'inspection des images individuelles et de leurs fenêtres de rendu ; le kit reste désactivé avant sa recette de composition.

| Plan | Image distincte | Dimensions | Transparence | SHA court |
|---|---|---|---|---|
| P0 | p0-a-depth | 1536×1024 | opaque prévu | b67ad96acd18 |
| P1 | p1-a-distant-left | 1536×1024 | alpha réel | 2d53305c89e6 |
| P1 | p1-b-distant-right | 1024×1536 | alpha réel | 43b5468b3954 |
| P2 | p2-a-support-left | 1024×1536 | alpha réel | 2b5b1ae795e2 |
| P2 | p2-b-support-right | 1024×1536 | alpha réel | 5b4e3aa0f926 |
| P2 | p2-c-central-structure | 1536×1024 | alpha réel | 025f466dc356 |
| P3 | p3-a-prop-left | 1536×1024 | alpha réel | a3f254aa96f9 |
| P3 | p3-b-prop-right | 1024×1536 | alpha réel | fa06756223b5 |
| P3 | p3-c-light-left | 1024×1536 | alpha réel | 89496b661997 |
| P3 | p3-d-light-right | 1024×1536 | alpha réel | df78ed7c4421 |
| P4 | p4-a-contact-floor | 2172×724 | alpha réel | eddf92ce5e45 |
| P4 | p4-b-front-fascia | 2172×724 | alpha réel | c554643b719d |
| P5 | p5-a-foreground-left | 1024×1536 | alpha réel | 9b4daa7d2e80 |
| P5 | p5-b-foreground-right | 1024×1536 | alpha réel | 80e712672bb1 |

Les ouvertures sont transparentes, les accessoires et luminaires ne sont pas imprimés dans le fond. Les supports proches sont ancrés verticalement au sol réel ; les objets suspendus sont alignés par leur sommet. Le sol de contact est au facteur 1, avec une première ligne opaque mesurée. Les avant-plans s'effacent devant un combattant. Les 14 dessins sont fixes : aucune animation nouvelle n'est annoncée pour ce kit.

Kit de production pour une entrée concept du catalogue. Il reste non jouable : aucune attribution de runtimeArenaId, aucune activation runtime. La recette utilise un étalon géométrique séparé du registre du jeu.

## Revue de composition non jouable

Les captures centre, rapprochée et coins gauche/droit ont été inspectées avec les vrais PNG et deux combattants du projet. Sol et appuis sont cohérents, les ouvertures gardent leur transparence et les éléments suspendus conservent leur ancrage. La recette docs/v34-arena-020-trone-fracture-renderer-qa.json valide six plans, huit scénarios et le cadrage mobile, sans erreur ni changement du combat ou de la caméra. Cette prévisualisation utilise uniquement dans le harnais la géométrie de THE PIT comme gabarit de contrôle. Elle ne valide ni le level design final ni un accès dans le jeu : statut concept, aucun identifiant d'arène runtime, runtimeEnabled=false, images reviewed et integration=null sont conservés.

## Extension de duel neutre

Ce kit reçoit une entrée explicite dans pitArenaExtensions, distincte de la première édition. La surface de duel mesure 960 × 540, son sol est à 430, ses limites à 54/906 et ses apparitions à 300/660. Un seul secteur et aucun danger, accessoire interactif ou transition sont implémentés. Les cibles narratives et multi-secteurs du catalogue restent à produire. La recette isolée précédente contrôle ces mêmes mesures. L’accès dans la sélection complète est en cours de recette ; les images restent reviewed tant que cette preuve supplémentaire n’est pas archivée.

## Application complète

La recette docs/v34-arena-020-trone-fracture-fullapp-qa.json valide les 14 images dans la sélection, l'entraînement, le combat, les déplacements et le cadrage mobile. Aucune image manquante ou erreur n'est remontée. Les 14 PNG passent au statut integrated sans ajouter de dessin. Le secteur de duel est vérifié ; les secteurs supplémentaires, transitions et accessoires interactifs restent hors couverture.
