# Mausolée des Marques — revue du kit V34

Proposition originale du projet, fondée sur le catalogue local et pitFirstEdition. La conversation détaillée manquante n'est pas présentée comme retrouvée.

Contexte : Crypte d'archives où chaque prise conserve son origine

Direction visuelle : Cool indigo burial-vault stone, dark nickel alloy, muted ivory ceramic archive marks, pale blue mineral light.

Quatorze images OpenAI intégrées à la chaîne de production, chacune générée seule et conservée sans retouche de pixels. Les prompts, originaux et SHA complets sont archivés sous art-source/v34/pit-arenas/arena-013-mausolee-des-marques. Les statuts reviewed concernent ici l'inspection des images individuelles et de leurs fenêtres de rendu ; le kit reste désactivé avant sa recette de composition.

| Plan | Image distincte | Dimensions | Transparence | SHA court |
|---|---|---|---|---|
| P0 | p0-a-depth | 1536×1024 | opaque prévu | fd820b8efe58 |
| P1 | p1-a-distant-left | 1024×1536 | alpha réel | 7cb17481d8fc |
| P1 | p1-b-distant-right | 1536×1024 | alpha réel | 3b09ae84eb1c |
| P2 | p2-a-support-left | 1024×1536 | alpha réel | 4e53095a133b |
| P2 | p2-b-support-right | 1024×1536 | alpha réel | ec9e7dddc753 |
| P2 | p2-c-central-structure | 1224×1285 | alpha réel | 67d95a38efc8 |
| P3 | p3-a-prop-left | 1224×1285 | alpha réel | 985326f565e9 |
| P3 | p3-b-prop-right | 1214×1295 | alpha réel | df9d36281ef1 |
| P3 | p3-c-light-left | 1024×1536 | alpha réel | 09095958617c |
| P3 | p3-d-light-right | 1024×1536 | alpha réel | 39dcd7f7e6fa |
| P4 | p4-a-contact-floor | 2172×724 | alpha réel | cc4155499c95 |
| P4 | p4-b-front-fascia | 2172×724 | alpha réel | 24e7abfb1593 |
| P5 | p5-a-foreground-left | 1024×1536 | alpha réel | c86254351b9a |
| P5 | p5-b-foreground-right | 1024×1536 | alpha réel | 08a25d11d746 |

Les ouvertures sont transparentes, les accessoires et luminaires ne sont pas imprimés dans le fond. Les supports proches sont ancrés verticalement au sol réel ; les objets suspendus sont alignés par leur sommet. Le sol de contact est au facteur 1, avec une première ligne opaque mesurée. Les avant-plans s'effacent devant un combattant. Les 14 dessins sont fixes : aucune animation nouvelle n'est annoncée pour ce kit.

Kit de production pour une entrée concept du catalogue. Il reste non jouable : aucune attribution de runtimeArenaId, aucune activation runtime. La recette utilise un étalon géométrique séparé du registre du jeu.

## Revue de composition non jouable

Les captures centre, rapprochée et coins gauche/droit ont été inspectées avec les vrais PNG et deux combattants du projet. Sol et appuis sont cohérents, les ouvertures gardent leur transparence et les éléments suspendus conservent leur ancrage. La recette docs/v34-arena-013-mausolee-des-marques-renderer-qa.json valide six plans, huit scénarios et le cadrage mobile, sans erreur ni changement du combat ou de la caméra. Cette prévisualisation utilise uniquement dans le harnais la géométrie de THE PIT comme gabarit de contrôle. Elle ne valide ni le level design final ni un accès dans le jeu : statut concept, aucun identifiant d'arène runtime, runtimeEnabled=false, images reviewed et integration=null sont conservés.

## Extension de duel neutre

Ce kit reçoit une entrée explicite dans pitArenaExtensions, distincte de la première édition. La surface de duel mesure 960 × 540, son sol est à 430, ses limites à 54/906 et ses apparitions à 300/660. Un seul secteur et aucun danger, accessoire interactif ou transition sont implémentés. Les cibles narratives et multi-secteurs du catalogue restent à produire. La recette isolée précédente contrôle ces mêmes mesures. L’accès dans la sélection complète est en cours de recette ; les images restent reviewed tant que cette preuve supplémentaire n’est pas archivée.

## Application complète

La recette docs/v34-arena-013-mausolee-des-marques-fullapp-qa.json valide les 14 images dans la sélection, l'entraînement, le combat, les déplacements et le cadrage mobile. Aucune image manquante ou erreur n'est remontée. Les 14 PNG passent au statut integrated sans ajouter de dessin. Le secteur de duel est vérifié ; les secteurs supplémentaires, transitions et accessoires interactifs restent hors couverture.
