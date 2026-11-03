# Revue visuelle — cinquième passe marché, montures et chenils

**10 nouveaux sprites retenus, 56 au total.** Les dix sorties sélectionnées ont été affichées et comparées à leurs références par les assistants. Les 46 PNG précédents sont inchangés. Chaque sortie est conservée nativement, sans retouche de pixels, miroir, recadrage ou padding par script.

Base et livraison précédente : `7299b0fc2bd06dd53a45e3caab630bc75207d0ce`. Cette revue n’est ni une validation artistique humaine, ni un test dans le Homeworld.

## Sélection

Les dimensions indiquées sont celles des fichiers. Les marges au seuil alpha > 24 décrivent la silhouette principale ; des traces natives très faibles restent en périphérie. Les fichiers ne partagent pas nécessairement une échelle de pixels commune.

| ID | Sprite retenu | Dimensions PNG | Marge visible minimale | Vue demandée |
| --- | --- | ---: | ---: | --- |
| HWM162-S15 | [Étal couvert diagonal droit — sans stock](sprites/market/HWM162-S15-empty-market-stall-right.png) | 1536 × 1024 | 4 px | Héritée de la référence |
| HWM162-S16 | [Kiosque marchand compact — sans stock](sprites/market/HWM162-S16-empty-compact-merchant-kiosk.png) | 1254 × 1254 | 66 px | Héritée de la référence |
| HWM162-S17 | [Petit pot de stockage fermé autonome](sprites/market/HWM162-S17-small-sealed-storage-jar.png) | 1312 × 1199 | 188 px | Cible du projet, non mesurée |
| HWM162-M16 | [Montant gauche de l’obstacle d’entraînement](sprites/mounts/HWM162-M16-hurdle-left-upright-v2.png) | 1536 × 1024 | 166 px | Héritée de la référence |
| HWM162-M17 | [Montant droit de l’obstacle d’entraînement](sprites/mounts/HWM162-M17-hurdle-right-upright.png) | 1536 × 1024 | 169 px | Héritée de la référence |
| HWM162-M18 | [Barre rembourrée d’entraînement autonome](sprites/mounts/HWM162-M18-padded-training-rail.png) | 1536 × 1024 | 348 px | Héritée de la référence |
| HWM162-K18 | [Arc arrière de l’enclos octogonal](sprites/kennels/HWM162-K18-enclosure-rear-arc.png) | 1254 × 1254 | 79 px | Héritée de la référence |
| HWM162-K19 | [Arc avant fixe de l’enclos](sprites/kennels/HWM162-K19-enclosure-front-arc.png) | 1254 × 1254 | 75 px | Héritée de la référence |
| HWM162-K20 | [Battant d’enclos indépendant — pose fermée](sprites/kennels/HWM162-K20-enclosure-gate-leaf.png) | 1536 × 1024 | 96 px | Héritée de la référence |
| HWM162-K21 | [Battant d’enclos indépendant — pose ouverte](sprites/kennels/HWM162-K21-enclosure-gate-leaf-open.png) | 1536 × 1024 | 41 px | Héritée de la référence |

## Marché

### HWM162-S15 — Étal couvert diagonal droit — sans stock

Comptoir et espace sous table dégagés, pots, lots, rouleaux, peaux exposées et caisses retirés. Auvent, montants, lanternes et textiles fixes suspendus conservés. Silhouette entière ; pointe haute à seulement 4 px du bord au seuil alpha > 24, cadrage natif serré documenté. Les surfaces précédemment cachées sont reconstruites.

Sources du plan :

- [`public/game/homeworld/v78/market-stall-right.png`](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/7299b0fc2bd06dd53a45e3caab630bc75207d0ce/public/game/homeworld/v78/market-stall-right.png) ; SHA-256 `c98a90d777cf85e921681feb36c738216d8a99a945669e670234c65b65897796`.

Entrées exactes et prompts de chaque tentative : [market.json](receipts/market.json).

### HWM162-S16 — Kiosque marchand compact — sans stock

Comptoir vide et trois accroches libres. Coffre, pots, couteaux, trophées mobiles et nappe retirés ; deux défenses du toit, couverture, emblèmes, lanternes et soubassement conservés. Vue et proportions visuellement proches de la référence compacte ; échelle physique et superposition exacte non certifiées.

Sources du plan :

- [`production/homeworld-v160/originals/HWA160-023_kiosque-marchand-yautja-en-basalte-et-bronze.png`](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/7299b0fc2bd06dd53a45e3caab630bc75207d0ce/production/homeworld-v160/originals/HWA160-023_kiosque-marchand-yautja-en-basalte-et-bronze.png) ; SHA-256 `cff21dfa18b8d2bcaa74f8690b7a7ff1d4fc83f902f38af21c7ebc00b1dec3b3`.

Entrées exactes et prompts de chaque tentative : [market.json](receipts/market.json).

### HWM162-S17 — Petit pot de stockage fermé autonome

Un pot fermé autonome, corps sombre, couvercle et cerclages bronze, motif angulaire cohérent avec les petits pots du rack V76. Aucun rack ni autre contenant fusionné. Contenu, contenance, dimensions physiques et sens canonique du motif non attribués.

Sources du plan :

- [`public/game/homeworld/v76/interior/rack-lateral.png`](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/7299b0fc2bd06dd53a45e3caab630bc75207d0ce/public/game/homeworld/v76/interior/rack-lateral.png) ; SHA-256 `441642d5ddacad9a03a45f068d0e95d588518ae18a5c02af897b2dd165436308`.

Entrées exactes et prompts de chaque tentative : [market.json](receipts/market.json).


## Montures

### HWM162-M16 — Montant gauche de l’obstacle d’entraînement

Montant gauche entier, récepteur vide à droite, base, voyant et logements conservés. La correction native rapproche la hauteur visible de celle de M17 : 435 px contre 436 px, au lieu de 474 px. Le raccord exact, la hauteur de la barre et la charge restent non validés.

Sources du plan :

- [`production/homeworld-sectors-20261103/sprites/mounts/HWM162-M05-training-hurdle.png`](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/7299b0fc2bd06dd53a45e3caab630bc75207d0ce/production/homeworld-sectors-20261103/sprites/mounts/HWM162-M05-training-hurdle.png) ; SHA-256 `3c5525569fdffe27192b92297476d23692f32e959c9404a91e8f64a75e9e81a2`.

Entrées exactes et prompts de chaque tentative : [mounts.json](receipts/mounts.json).

### HWM162-M17 — Montant droit de l’obstacle d’entraînement

Montant droit entier avec récepteur vide orienté à gauche, base, logements et voyant conservés. Aucun montant opposé ni barre fusionné. Vue cohérente avec M05 ; points de contact, charge et réglage non validés. La comparaison à M16 a motivé une correction native du gabarit du montant gauche.

Sources du plan :

- [`production/homeworld-sectors-20261103/sprites/mounts/HWM162-M05-training-hurdle.png`](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/7299b0fc2bd06dd53a45e3caab630bc75207d0ce/production/homeworld-sectors-20261103/sprites/mounts/HWM162-M05-training-hurdle.png) ; SHA-256 `3c5525569fdffe27192b92297476d23692f32e959c9404a91e8f64a75e9e81a2`.

Entrées exactes et prompts de chaque tentative : [mounts.json](receipts/mounts.json).

### HWM162-M18 — Barre rembourrée d’entraînement autonome

Barre seule, textile rouge, cerclages et deux embouts complets. Aucun récepteur, poteau ou socle fusionné. Position horizontale cohérente avec M05 ; longueur de raccord et diamètre aux récepteurs restent à ajuster en scène.

Sources du plan :

- [`production/homeworld-sectors-20261103/sprites/mounts/HWM162-M05-training-hurdle.png`](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/7299b0fc2bd06dd53a45e3caab630bc75207d0ce/production/homeworld-sectors-20261103/sprites/mounts/HWM162-M05-training-hurdle.png) ; SHA-256 `3c5525569fdffe27192b92297476d23692f32e959c9404a91e8f64a75e9e81a2`.

Entrées exactes et prompts de chaque tentative : [mounts.json](receipts/mounts.json).


## Chenils

### HWM162-K18 — Arc arrière de l’enclos octogonal

Arc arrière et retours conservés avec six poteaux complets. Deux poteaux et trois travées avant retirés ; passage libre, charnière fixe portée par le poteau gauche. Identité, matière et vue cohérentes avec 266. Raccords aux pièces de premier plan et occultation en jeu restent à valider.

Sources du plan :

- [`production/native-open-20261102/archives/fauna-energy/target-v81-71-266-enclosure-native.png`](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/7299b0fc2bd06dd53a45e3caab630bc75207d0ce/production/native-open-20261102/archives/fauna-energy/target-v81-71-266-enclosure-native.png) ; SHA-256 `b1ccdfd1407964e21498d54c3f8b9984b78e4b448cc415fdd02577762c65cdcb`.

Entrées exactes et prompts de chaque tentative : [kennels.json](receipts/kennels.json).

### HWM162-K19 — Arc avant fixe de l’enclos

Deux travées fixes et deux poteaux avant complets, récepteur de serrure à gauche. Trois extrémités de rails libres à droite, sans duplication du poteau porté par K18. Vue et directions cohérentes avec 266. Le rendu est agrandi/recentré par rapport à la zone source : il faut régler échelle et placement avant assemblage, aucune superposition directe n’est certifiée.

Sources du plan :

- [`production/native-open-20261102/archives/fauna-energy/target-v81-71-266-enclosure-native.png`](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/7299b0fc2bd06dd53a45e3caab630bc75207d0ce/production/native-open-20261102/archives/fauna-energy/target-v81-71-266-enclosure-native.png) ; SHA-256 `b1ccdfd1407964e21498d54c3f8b9984b78e4b448cc415fdd02577762c65cdcb`.

Entrées exactes et prompts de chaque tentative : [kennels.json](receipts/kennels.json).

### HWM162-K20 — Battant d’enclos indépendant — pose fermée

Battant indépendant à trois traverses avec deux ouvertures, paumelles mobiles à gauche et loquet à droite, sans poteau en basalte. Pose fermée diagonale cohérente avec 266. La correction retire l’insert lumineux repris du poteau fixe ; le voyant reste attribué à K19. Échelle de composition et raccord des ferrures non validés.

Sources du plan :

- [`production/native-open-20261102/archives/fauna-energy/target-v81-71-266-enclosure-native.png`](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/7299b0fc2bd06dd53a45e3caab630bc75207d0ce/production/native-open-20261102/archives/fauna-energy/target-v81-71-266-enclosure-native.png) ; SHA-256 `b1ccdfd1407964e21498d54c3f8b9984b78e4b448cc415fdd02577762c65cdcb`.

Entrées exactes et prompts de chaque tentative : [kennels.json](receipts/kennels.json).

### HWM162-K21 — Battant d’enclos indépendant — pose ouverte

Battant entier à trois traverses et deux vides, sans poteau ni insert lumineux. Pose ouverte proposée : axe de charnière en haut à droite, bord libre et loquet en bas à gauche. Géométrie et ferrures cohérentes avec K20 corrigé ; nouvelle sortie native, aucun miroir de pixels. Les faces auparavant cachées restent reconstruites ; angle d’ouverture, axe exact et dégagement non validés.

Sources du plan :

- [`production/native-open-20261102/archives/fauna-energy/target-v81-71-266-enclosure-native.png`](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/7299b0fc2bd06dd53a45e3caab630bc75207d0ce/production/native-open-20261102/archives/fauna-energy/target-v81-71-266-enclosure-native.png) ; SHA-256 `b1ccdfd1407964e21498d54c3f8b9984b78e4b448cc415fdd02577762c65cdcb`.
- [`production/homeworld-sectors-20261103/sprites/kennels/HWM162-K20-enclosure-gate-leaf.png`](sprites/kennels/HWM162-K20-enclosure-gate-leaf.png) ; SHA-256 `b121828ca30e8dc84249666783ccbc8a23a769d74e4586bbad160279c141a290`. Source générée et corrigée dans cette passe.

Entrées exactes et prompts de chaque tentative : [kennels.json](receipts/kennels.json).

## Deux corrections natives

12 appels ImageGen ont produit dix sélections et deux premiers essais archivés. Les archives ne comptent pas dans les 56 sprites. Les deux défauts ont été constatés lors de la comparaison directe par root.

| ID | Premier essai | Résultat retenu |
| --- | --- | --- |
| M16 | Hauteur visible de 474 px contre 436 px pour le montant droit M17, sur la même toile. | Nouvelle génération avec silhouette de 435 px. Ce rapprochement ne certifie pas le raccord des récepteurs ni une échelle physique. |
| K20 | Insert lumineux ambre repris du poteau récepteur fixe de 266. | Insert supprimé nativement, loquet mobile et trois traverses conservés. K21 utilise cette version corrigée comme référence. |

- [HWM162-M16 — première tentative](attempts/mounts/HWM162-M16-hurdle-left-upright-v1.png) ; SHA-256 `daa4d1e54bcfce7ef90d85e5908729d4850f06025ccd4aa07baec4189a7f91e8`.
- [HWM162-K20 — première tentative](attempts/kennels/HWM162-K20-enclosure-gate-leaf-v1.png) ; SHA-256 `b03b138646808b34cffa635b806ad56c7efef17d1bf516f1960851fa105599ad`.

## Mesures et composition

Les dix ajouts sélectionnés représentent **12 318 185 octets**, pour **93 931 261 octets** dans les 56 fichiers. Les deux nouvelles archives représentent séparément **2 922 165 octets**.

Les échantillons des ouvertures de S15 et S16 sont à alpha 0. Dans K18, la fenêtre centrale/avant de 245 000 pixels contient 244 853 pixels à alpha 0 et 147 à alpha 1/255 ; aucun pixel n’y dépasse alpha 8. Pour chacun des battants K20 et K21, deux fenêtres de 800 pixels dans les vides entre traverses sont entièrement à alpha 0. Ces mesures de secteur sont conservées avec leurs coordonnées dans les reçus.

S15 conserve un cadrage très serré avec 4 px de marge visible en haut. La silhouette reste entière ; aucune marge de 80 px n’est revendiquée pour ce fichier. Le contrôle technique distingue cette marge visible de la marge strictement transparente.

Neuf nouvelles demandes reprennent la vue de leurs références : S15/S16, M16–M18 et K18–K21. Le lot comporte ainsi 22 vues héritées. S17 demande la cible orthographique 0°/35° du projet. Aucun angle réel n’a été mesuré. La pose ouverte de K21 tourne l’objet en conservant la demande de caméra de 266 ; elle n’est pas un miroir de pixels ni une animation validée.

Les couches proposées sont K18 en arrière-plan, puis les créatures, puis K19 et le battant choisi. K19 et les battants ont leurs propres cadrages natifs : taille de dessin et translation restent à régler pour les faire correspondre à K18. Le pivot, le débattement, les contacts de serrure/charnière et les collisions restent non vérifiés en scène. La séparation des PNG ne prouve pas que ces couches sont déjà utilisées par le runtime.

Les 42 cibles suivies restent les 40 cibles héritées et les deux identités de bâtiment déjà présentes. S02/S03/S04 et le support de selle 285 étaient déjà vides ; ils ne sont pas régénérés. La présence de candidats ne clôture pas le registre global de 354 exigences.

Ces créations sont des adaptations originales du projet. Contenu du pot, dimensions physiques, capacité, charge, espèces compatibles, réglage d’entraînement, interaction, navigation, animation et fidélité canonique 1:1 restent non certifiés.

Données de revue : [review-round5.json](review-round5.json). Mesures complètes : [technical-report.json](technical-report.json). Audit des équivalents : [modularity-audit-round5.json](modularity-audit-round5.json).
