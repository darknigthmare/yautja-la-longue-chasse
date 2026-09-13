# Puits des Bannis — revue du kit V34

Proposition originale du projet, fondée sur le catalogue local et pitFirstEdition. La conversation détaillée manquante n'est pas présentée comme retrouvée.

Contexte : Citerne abandonnée devenue cercle clandestin

Direction visuelle : Deep petroleum green, wet black stone, corroded copper, scarce improvised amber light, desaturated underground mist.

Quatorze images OpenAI intégrées à la chaîne de production, chacune générée seule et conservée sans retouche de pixels. Les prompts, originaux et SHA complets sont archivés sous art-source/v34/pit-arenas/arena-017-puits-des-bannis. Les statuts reviewed concernent ici l'inspection des images individuelles et de leurs fenêtres de rendu ; le kit reste désactivé avant sa recette de composition.

| Plan | Image distincte | Dimensions | Transparence | SHA court |
|---|---|---|---|---|
| P0 | p0-a-depth | 1536×1024 | opaque prévu | 730168225cbc |
| P1 | p1-a-distant-left | 1536×1024 | alpha réel | 7dc4921c4107 |
| P1 | p1-b-distant-right | 1024×1536 | alpha réel | 15c98b8d25c1 |
| P2 | p2-a-support-left | 1024×1536 | alpha réel | 23c7bb5dbdd8 |
| P2 | p2-b-support-right | 1222×1287 | alpha réel | c7913118b21b |
| P2 | p2-c-central-structure | 1536×1024 | alpha réel | 1a49eff5bac5 |
| P3 | p3-a-prop-left | 1774×887 | alpha réel | 198b577fa1b8 |
| P3 | p3-b-prop-right | 1536×1024 | alpha réel | d708a5035707 |
| P3 | p3-c-light-left | 1024×1536 | alpha réel | 959237a9eab2 |
| P3 | p3-d-light-right | 1024×1536 | alpha réel | 2db48122af45 |
| P4 | p4-a-contact-floor | 2172×724 | alpha réel | 910256e30d19 |
| P4 | p4-b-front-fascia | 2172×724 | alpha réel | b3cda3a61280 |
| P5 | p5-a-foreground-left | 1024×1536 | alpha réel | 0ccd48048366 |
| P5 | p5-b-foreground-right | 1024×1536 | alpha réel | f99c7ae057b8 |

Les ouvertures sont transparentes, les accessoires et luminaires ne sont pas imprimés dans le fond. Les supports proches sont ancrés verticalement au sol réel ; les objets suspendus sont alignés par leur sommet. Le sol de contact est au facteur 1, avec une première ligne opaque mesurée. Les avant-plans s'effacent devant un combattant. Les 14 dessins sont fixes : aucune animation nouvelle n'est annoncée pour ce kit.

Kit de production pour une entrée concept du catalogue. Il reste non jouable : aucune attribution de runtimeArenaId, aucune activation runtime. La recette utilise un étalon géométrique séparé du registre du jeu.

## Revue de composition non jouable

Les captures centre, rapprochée et coins gauche/droit ont été inspectées avec les vrais PNG et deux combattants du projet. Sol et appuis sont cohérents, les ouvertures gardent leur transparence et les éléments suspendus conservent leur ancrage. La recette docs/v34-arena-017-puits-des-bannis-renderer-qa.json valide six plans, huit scénarios et le cadrage mobile, sans erreur ni changement du combat ou de la caméra. Cette prévisualisation utilise uniquement dans le harnais la géométrie de THE PIT comme gabarit de contrôle. Elle ne valide ni le level design final ni un accès dans le jeu : statut concept, aucun identifiant d'arène runtime, runtimeEnabled=false, images reviewed et integration=null sont conservés.

## Extension de duel neutre

Ce kit reçoit une entrée explicite dans pitArenaExtensions, distincte de la première édition. La surface de duel mesure 960 × 540, son sol est à 430, ses limites à 54/906 et ses apparitions à 300/660. Un seul secteur et aucun danger, accessoire interactif ou transition sont implémentés. Les cibles narratives et multi-secteurs du catalogue restent à produire. La recette isolée précédente contrôle ces mêmes mesures. L’accès dans la sélection complète est en cours de recette ; les images restent reviewed tant que cette preuve supplémentaire n’est pas archivée.

## Application complète

La recette docs/v34-arena-017-puits-des-bannis-fullapp-qa.json valide les 14 images dans la sélection, l'entraînement, le combat, les déplacements et le cadrage mobile. Aucune image manquante ou erreur n'est remontée. Les 14 PNG passent au statut integrated sans ajouter de dessin. Le secteur de duel est vérifié ; les secteurs supplémentaires, transitions et accessoires interactifs restent hors couverture.
