# Terrasse des Jeunes Sangs — revue du kit V34

Proposition originale du projet, fondée sur le catalogue local et pitFirstEdition. La conversation détaillée manquante n'est pas présentée comme retrouvée.

Contexte : Cour d'apprentissage avec obstacles neutralisés

Direction visuelle : Dawn sand-colored stone, worn olive bronze, warm tan leather training padding, small amber lamps, pale desaturated green distance.

Quatorze images OpenAI intégrées à la chaîne de production, chacune générée seule et conservée sans retouche de pixels. Les prompts, originaux et SHA complets sont archivés sous art-source/v34/pit-arenas/arena-016-terrasse-des-jeunes-sangs. Les statuts reviewed concernent ici l'inspection des images individuelles et de leurs fenêtres de rendu ; le kit reste désactivé avant sa recette de composition.

| Plan | Image distincte | Dimensions | Transparence | SHA court |
|---|---|---|---|---|
| P0 | p0-a-depth | 1536×1024 | opaque prévu | e7884c371423 |
| P1 | p1-a-distant-left | 2172×724 | alpha réel | 6b2348869297 |
| P1 | p1-b-distant-right | 1536×1024 | alpha réel | a75aacbe740c |
| P2 | p2-a-support-left | 1024×1536 | alpha réel | 53d7ac19e9d0 |
| P2 | p2-b-support-right | 1145×1374 | alpha réel | 66397c793944 |
| P2 | p2-c-central-structure | 1536×1024 | alpha réel | bec2f460fe5a |
| P3 | p3-a-prop-left | 1536×1024 | alpha réel | 1e3357bd2295 |
| P3 | p3-b-prop-right | 1349×1166 | alpha réel | a8c9fe43b325 |
| P3 | p3-c-light-left | 1024×1536 | alpha réel | 43b995e17c30 |
| P3 | p3-d-light-right | 1024×1536 | alpha réel | 0036d183ba94 |
| P4 | p4-a-contact-floor | 2172×724 | alpha réel | 0ac61f5ab945 |
| P4 | p4-b-front-fascia | 2146×733 | alpha réel | 81404f57181f |
| P5 | p5-a-foreground-left | 1024×1536 | alpha réel | 3af444529e0f |
| P5 | p5-b-foreground-right | 1024×1536 | alpha réel | d217154b4112 |

Les ouvertures sont transparentes, les accessoires et luminaires ne sont pas imprimés dans le fond. Les supports proches sont ancrés verticalement au sol réel ; les objets suspendus sont alignés par leur sommet. Le sol de contact est au facteur 1, avec une première ligne opaque mesurée. Les avant-plans s'effacent devant un combattant. Les 14 dessins sont fixes : aucune animation nouvelle n'est annoncée pour ce kit.

Kit de production pour une entrée concept du catalogue. Il reste non jouable : aucune attribution de runtimeArenaId, aucune activation runtime. La recette utilise un étalon géométrique séparé du registre du jeu.

## Revue de composition non jouable

Les captures centre, rapprochée et coins gauche/droit ont été inspectées avec les vrais PNG et deux combattants du projet. Sol et appuis sont cohérents, les ouvertures gardent leur transparence et les éléments suspendus conservent leur ancrage. La recette docs/v34-arena-016-terrasse-des-jeunes-sangs-renderer-qa.json valide six plans, huit scénarios et le cadrage mobile, sans erreur ni changement du combat ou de la caméra. Cette prévisualisation utilise uniquement dans le harnais la géométrie de THE PIT comme gabarit de contrôle. Elle ne valide ni le level design final ni un accès dans le jeu : statut concept, aucun identifiant d'arène runtime, runtimeEnabled=false, images reviewed et integration=null sont conservés.

## Extension de duel neutre

Ce kit reçoit une entrée explicite dans pitArenaExtensions, distincte de la première édition. La surface de duel mesure 960 × 540, son sol est à 430, ses limites à 54/906 et ses apparitions à 300/660. Un seul secteur et aucun danger, accessoire interactif ou transition sont implémentés. Les cibles narratives et multi-secteurs du catalogue restent à produire. La recette isolée précédente contrôle ces mêmes mesures. L’accès dans la sélection complète est en cours de recette ; les images restent reviewed tant que cette preuve supplémentaire n’est pas archivée.

## Application complète

La recette docs/v34-arena-016-terrasse-des-jeunes-sangs-fullapp-qa.json valide les 14 images dans la sélection, l'entraînement, le combat, les déplacements et le cadrage mobile. Aucune image manquante ou erreur n'est remontée. Les 14 PNG passent au statut integrated sans ajouter de dessin. Le secteur de duel est vérifié ; les secteurs supplémentaires, transitions et accessoires interactifs restent hors couverture.
