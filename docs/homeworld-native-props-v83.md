# Homeworld V83 — sources natives de mobilier urbain

Ce lot produit cinq fichiers PNG indépendants par la génération d’images OpenAI intégrée. Le moteur de génération ne passe ni par une clé API ni par le CLI. Les sources reçues restent conservées dans le dossier `generated_images` ; leurs copies intactes destinées au jeu se trouvent dans `public/game/homeworld/v83/`.

| Source indépendante | Fonction et limite |
| --- | --- |
| `merchant-counter-left.png` | Comptoir d’échange à tiroirs. Les capsules et le terminal dessinés dessus font partie de cette source ; ils ne sont pas des objets indépendants ou des objets récupérables. |
| `forge-bench-right.png` | Établi de préparation avec foyer et enclume intégrés. Aucun modèle d’arme canonique ou service de forge supplémentaire n’est déduit de ce décor. |
| `cargo-rack-right.png` | Rayonnage logistique avec contenants fixés dans ses niches. Les caisses intégrées ne sont pas comptées comme de nouveaux sprites séparés. |
| `basalt-planter-left.png` | Bac de cultures ornementales compatible avec cette cité originale. Les plantes n’affirment aucune espèce canonique de Yautja Prime. |
| `clan-waymarker-right.png` | Borne locale avec deux entailles décoratives originales. Ce ne sont ni une écriture traduite, ni un emblème officiel de clan. |

Chaque fichier a un cadre complet et reste indépendant du paysage et des bâtiments. L’angle vient du dessin natif ; aucun miroir, rotation, déformation de perspective ou étirement séparé des axes n’est prévu pour fabriquer une autre orientation. Les mots « left » et « right » identifient la demande artistique et les fichiers : ils ne constituent pas une mesure CAD d’angle.

La première stèle générée avait son sommet coupé. Elle est conservée comme référence source et n’est pas branchée au jeu. Une seconde génération corrige son cadrage complet avec des marges transparentes ; c’est uniquement cette source finale qui est copiée sous `clan-waymarker-right.png`.

`app/game/data/homeworldStreetDecorSourcesV83.json` conserve dimensions natives, enveloppe alpha et SHA des fichiers copiés. Cette lecture de pixels sert à l’enregistrement artistique ; elle ne teste ni les collisions, ni les accès, ni le jeu. Les points d’appui, échelles et usages des instances relèvent du fournisseur spatial et de son codex, pas de la boîte alpha entière.

Les arguments exacts, reçus originaux, fichiers de projet et empreintes se trouvent dans `docs/homeworld-native-prompts-v83.json`. Ce sont cinq sources statiques, pas cinq animations complètes. L’architecture et le mobilier sont des créations compatibles avec la direction Yautja du jeu ; aucune fidélité canonique 1:1 à une cité officielle n’est annoncée.

Conformément à la consigne de poursuivre sans vérification, ce document ne déclare aucun test, audit, lint, typecheck, build de validation locale ou parcours navigateur V83. L’intégration et la publication sont décrites séparément, sans présenter une livraison de fichiers comme une ville entièrement achevée.
