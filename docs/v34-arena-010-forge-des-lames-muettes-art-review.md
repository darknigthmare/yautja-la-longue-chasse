# Forge des Lames Muettes — revue du kit V34

Proposition originale du projet, fondée sur le catalogue local et pitFirstEdition. La conversation détaillée manquante n'est pas présentée comme retrouvée.

Contexte : Atelier rituel où les marteaux scandent les manches

Direction visuelle : Interior charcoal iron, hammered black metal, worn copper, restrained orange furnace glow against soot grey; warm light upper left.

Quatorze images OpenAI intégrées à la chaîne de production, chacune générée seule et conservée sans retouche de pixels. Les prompts, originaux et SHA complets sont archivés sous art-source/v34/pit-arenas/arena-010-forge-des-lames-muettes. Les statuts reviewed concernent ici l'inspection des images individuelles et de leurs fenêtres de rendu ; le kit reste désactivé avant sa recette de composition.

| Plan | Image distincte | Dimensions | Transparence | SHA court |
|---|---|---|---|---|
| P0 | p0-a-depth | 1536×1024 | opaque prévu | 4dac076ce31a |
| P1 | p1-a-distant-left | 1774×887 | alpha réel | c740d7fc610c |
| P1 | p1-b-distant-right | 1024×1536 | alpha réel | 35f529e4f453 |
| P2 | p2-a-support-left | 1024×1536 | alpha réel | 6bd5a73cb853 |
| P2 | p2-b-support-right | 1024×1536 | alpha réel | 6c7dcca562f3 |
| P2 | p2-c-central-structure | 1206×1305 | alpha réel | 07be0deca2d5 |
| P3 | p3-a-prop-left | 1536×1024 | alpha réel | 592933853ef2 |
| P3 | p3-b-prop-right | 1536×1024 | alpha réel | 7c9025649ded |
| P3 | p3-c-light-left | 1024×1536 | alpha réel | a15718bb787c |
| P3 | p3-d-light-right | 1024×1536 | alpha réel | cb6fc5df48a1 |
| P4 | p4-a-contact-floor | 2172×724 | alpha réel | 19a0601389a0 |
| P4 | p4-b-front-fascia | 2172×724 | alpha réel | 02af530ec224 |
| P5 | p5-a-foreground-left | 1024×1536 | alpha réel | 8274595f8e27 |
| P5 | p5-b-foreground-right | 1024×1536 | alpha réel | 60e9baccc6e5 |

Les ouvertures sont transparentes, les accessoires et luminaires ne sont pas imprimés dans le fond. Les supports proches sont ancrés verticalement au sol réel ; les objets suspendus sont alignés par leur sommet. Le sol de contact est au facteur 1, avec une première ligne opaque mesurée. Les avant-plans s'effacent devant un combattant. Les 14 dessins sont fixes : aucune animation nouvelle n'est annoncée pour ce kit.

Kit de production pour une entrée concept du catalogue. Il reste non jouable : aucune attribution de runtimeArenaId, aucune activation runtime. La recette utilise un étalon géométrique séparé du registre du jeu.

## Revue de composition non jouable

Les captures centre, rapprochée et coins gauche/droit ont été inspectées avec les vrais PNG et deux combattants du projet. Sol et appuis sont cohérents, les ouvertures gardent leur transparence et les éléments suspendus conservent leur ancrage. La recette docs/v34-arena-010-forge-des-lames-muettes-renderer-qa.json valide six plans, huit scénarios et le cadrage mobile, sans erreur ni changement du combat ou de la caméra. Cette prévisualisation utilise uniquement dans le harnais la géométrie de THE PIT comme gabarit de contrôle. Elle ne valide ni le level design final ni un accès dans le jeu : statut concept, aucun identifiant d'arène runtime, runtimeEnabled=false, images reviewed et integration=null sont conservés.

## Extension de duel neutre

Ce kit reçoit une entrée explicite dans pitArenaExtensions, distincte de la première édition. La surface de duel mesure 960 × 540, son sol est à 430, ses limites à 54/906 et ses apparitions à 300/660. Un seul secteur et aucun danger, accessoire interactif ou transition sont implémentés. Les cibles narratives et multi-secteurs du catalogue restent à produire. La recette isolée précédente contrôle ces mêmes mesures. L’accès dans la sélection complète est en cours de recette ; les images restent reviewed tant que cette preuve supplémentaire n’est pas archivée.

## Application complète

La recette docs/v34-arena-010-forge-des-lames-muettes-fullapp-qa.json valide les 14 images dans la sélection, l'entraînement, le combat, les déplacements et le cadrage mobile. Aucune image manquante ou erreur n'est remontée. Les 14 PNG passent au statut integrated sans ajouter de dessin. Le secteur de duel est vérifié ; les secteurs supplémentaires, transitions et accessoires interactifs restent hors couverture.
