# Revue visuelle — quatrième passe marché, montures et chenils

**11 nouveaux sprites retenus, 46 au total.** Revue directe des onze sorties sélectionnées et comparaison avec leurs références du dépôt. Les fichiers sont des sorties natives ImageGen copiées sans retouche de pixels. Les 35 PNG de la livraison précédente sont inchangés.

Base et livraison précédente : `c8d37c3c059021a96b071551bf9b19b09340536e`. Cette revue est effectuée par les assistants ; elle ne constitue ni une validation artistique humaine, ni un test dans le Homeworld.

## Sélection

Les dimensions ci-dessous sont celles des fichiers. Les marges décrivent les pixels à alpha > 24 ; des traces natives très faibles peuvent subsister en périphérie.

| ID | Sprite retenu | Dimensions PNG | Marge visible minimale | Vue demandée |
| --- | --- | ---: | ---: | --- |
| HWM162-S11 | [Comptoir marchand — stock retiré](sprites/market/HWM162-S11-empty-merchant-counter.png) | 1536 × 1024 | 34 px | Héritée de la référence |
| HWM162-S12 | [Rack marchand — vide](sprites/market/HWM162-S12-empty-cargo-rack.png) | 1254 × 1254 | 148 px | Héritée de la référence |
| HWM162-S13 | [Rouleau de textile lié autonome](sprites/market/HWM162-S13-bound-cloth-roll.png) | 1536 × 1024 | 121 px | Cible du projet, non mesurée |
| HWM162-S14 | [Volet plein de réserve autonome](sprites/market/HWM162-S14-stock-shutter.png) | 1729 × 910 | 78 px | Cible du projet, non mesurée |
| HWM162-M13 | [Longe d’attache à deux embouts](sprites/mounts/HWM162-M13-double-ended-tether.png) | 1536 × 1024 | 163 px | Cible du projet, non mesurée |
| HWM162-M14 | [Harnais de monture — pose pendante](sprites/mounts/HWM162-M14-hanging-mount-harness-v2.png) | 1024 × 1536 | 102 px | Cible du projet, non mesurée |
| HWM162-M15 | [Berceau textile de soin](sprites/mounts/HWM162-M15-soft-care-cradle-v2.png) | 1536 × 1024 | 113 px | Cible du projet, non mesurée |
| HWM162-K14 | [Abreuvoir alien — état vide](sprites/kennels/HWM162-K14-empty-alien-drinker.png) | 1536 × 1024 | 173 px | Héritée de la référence |
| HWM162-K15 | [Nourrisseur à trémie — bac vide](sprites/kennels/HWM162-K15-empty-hopper-feeder.png) | 1254 × 1254 | 80 px | Héritée de la référence |
| HWM162-K16 | [Râtelier de dressage — vide](sprites/kennels/HWM162-K16-empty-training-rack.png) | 1536 × 1024 | 45 px | Héritée de la référence |
| HWM162-K17 | [Balise de danger — éteinte](sprites/kennels/HWM162-K17-danger-beacon-off.png) | 1254 × 1254 | 33 px | Héritée de la référence |

## Marché

### HWM162-S11 — Comptoir marchand — stock retiré

Trois compartiments de vitrine et tablette latérale vidés. Console fixe, trois tiroirs, pieds et haut montant gauche conservés visuellement. Objet entier ; toile paysage et cadrage différents de la source carrée, donc pas de transition pixel par pixel certifiée.

Références du dépôt :

- [`public/game/homeworld/v83/merchant-counter-left.png`](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/c8d37c3c059021a96b071551bf9b19b09340536e/public/game/homeworld/v83/merchant-counter-left.png) ; SHA-256 `a0bf8a90c46ebd7ed1271a3a84d591856d3bed0d88b1abdde07c6fc76124f8da`.

### HWM162-S12 — Rack marchand — vide

Deux niveaux de tablettes et trois montants conservés, sans les six contenants du modèle chargé. Tous les pieds sont visibles dans la sortie corrigée, avec un cadrage plus ample. Vue cohérente avec la source ; appuis des objets et superposition exacte non validés.

Références du dépôt :

- [`public/game/homeworld/v83/cargo-rack-right.png`](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/c8d37c3c059021a96b071551bf9b19b09340536e/public/game/homeworld/v83/cargo-rack-right.png) ; SHA-256 `c6146c0577b832012a099e87b6008f5315771c72725932ce8eb850e4f9f43eb4`.

### HWM162-S13 — Rouleau de textile lié autonome

Un rouleau de textile rouge et sombre, lié par deux sangles complètes, sans étagère ni contenant fusionné. Matières et motifs cohérents avec les rouleaux du rack V76. Silhouette entière et bout enroulé lisible ; échelle et orientation de placement sur les étagères à régler en scène.

Références du dépôt :

- [`public/game/homeworld/v76/interior/rack-lateral.png`](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/c8d37c3c059021a96b071551bf9b19b09340536e/public/game/homeworld/v76/interior/rack-lateral.png) ; SHA-256 `441642d5ddacad9a03a45f068d0e95d588518ae18a5c02af897b2dd165436308`.

### HWM162-S14 — Volet plein de réserve autonome

Panneau de fermeture large, plein et indépendant, avec bordure propre au volet, sans bâtiment ni sol fusionnés. Palette basaltique et bronze cohérente avec S05. Nouveau composant proposé : aucun mécanisme de fermeture n’est attesté dans la référence ouverte ; guidage, pivot, dimensions de baie et collision restent à valider.

Références du dépôt :

- [`production/homeworld-sectors-20261103/sprites/market/HWM162-S05-stock-shelter.png`](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/c8d37c3c059021a96b071551bf9b19b09340536e/production/homeworld-sectors-20261103/sprites/market/HWM162-S05-stock-shelter.png) ; SHA-256 `a8f69759564a653a6b7488e8fc1a90706a1cdd573592feb2dcfe7a855c40a866`.


## Montures

### HWM162-M13 — Longe d’attache à deux embouts

Chaîne lourde continue en courbe avec deux manilles mécaniques complètes. Aucune poignée de main, borne ou harnais fusionnés. Matières cohérentes avec M02 et le harnais source ; longueur, charge et raccords mécaniques restent proposés.

Références du dépôt :

- [`production/homeworld-sectors-20261103/sprites/mounts/HWM162-M02-tether-station.png`](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/c8d37c3c059021a96b071551bf9b19b09340536e/production/homeworld-sectors-20261103/sprites/mounts/HWM162-M02-tether-station.png) ; SHA-256 `e61634fd7c5ea92792c06586e6b7edb4ed23b570084931177cb32774c80865fa`.
- [`production/native-open-20261102/archives/fauna-energy/gear/target-v81-72-283-mount-harness-native.png`](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/c8d37c3c059021a96b071551bf9b19b09340536e/production/native-open-20261102/archives/fauna-energy/gear/target-v81-72-283-mount-harness-native.png) ; SHA-256 `1dd4cf02adcfc98d04529cf00d9c290016c7bac9678d7d1432bda6db583a6d45`.

### HWM162-M14 — Harnais de monture — pose pendante

Harnais seul en pose pendante, sangles, boucles, plaque frontale et deux anneaux complets. La seconde sortie place l’anneau gauche plus haut dans l’image et montre la profondeur, suivant qualitativement l’axe oblique du support282. Pente exacte, écartement et positionnement sur les crochets restent non validés.

Références du dépôt :

- [`production/native-open-20261102/archives/fauna-energy/gear/target-v81-72-283-mount-harness-native.png`](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/c8d37c3c059021a96b071551bf9b19b09340536e/production/native-open-20261102/archives/fauna-energy/gear/target-v81-72-283-mount-harness-native.png) ; SHA-256 `1dd4cf02adcfc98d04529cf00d9c290016c7bac9678d7d1432bda6db583a6d45`.
- [`production/native-open-20261102/archives/fauna-energy/gear/target-v81-72-282-mount-harness-support-native.png`](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/c8d37c3c059021a96b071551bf9b19b09340536e/production/native-open-20261102/archives/fauna-energy/gear/target-v81-72-282-mount-harness-support-native.png) ; SHA-256 `e32266329f168b89f0318b0ddb666a9044bc90ee9d2677cbd02f580857bc5acc`.

### HWM162-M15 — Berceau textile de soin

Berceau textile indépendant avec quatre contacts rembourrés et quatre attaches complètes. La seconde sortie oriente les deux bords longs vers le haut à droite, suivant qualitativement les longerons du support bas273. Aucun bâti ni suspension haute fusionnés. Écartement exact, raccord aux quatre appuis, charge et adaptation à une espèce non validés.

Références du dépôt :

- [`production/native-open-20261102/archives/fauna-energy/gear/target-v81-71-273-fauna-harness-support-native.png`](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/c8d37c3c059021a96b071551bf9b19b09340536e/production/native-open-20261102/archives/fauna-energy/gear/target-v81-71-273-fauna-harness-support-native.png) ; SHA-256 `92b2d4dfd704ab774f840d56c41132072fdbeb06e204e56ba1d9cf617456ee7a`.
- [`production/native-open-20261102/archives/fauna-energy/gear/target-v81-72-283-mount-harness-native.png`](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/c8d37c3c059021a96b071551bf9b19b09340536e/production/native-open-20261102/archives/fauna-energy/gear/target-v81-72-283-mount-harness-native.png) ; SHA-256 `1dd4cf02adcfc98d04529cf00d9c290016c7bac9678d7d1432bda6db583a6d45`.


## Chenils

### HWM162-K14 — Abreuvoir alien — état vide

Bassin ovale sec, eau et reflets retirés, fond basaltique visible. Cerclage bronze, pieds et vue restent visuellement cohérents avec la source remplie. Toile native devenue paysage ; alignement pixel par pixel avec l’état rempli non certifié.

Références du dépôt :

- [`docs/suivi-production/v113-open-production-20261102/native-candidates/target-v81-71-271-abreuvoir-alien-native-attempt02.png`](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/c8d37c3c059021a96b071551bf9b19b09340536e/docs/suivi-production/v113-open-production-20261102/native-candidates/target-v81-71-271-abreuvoir-alien-native-attempt02.png) ; SHA-256 `644a9652da91d51ddd2e8576f786af3ba262ffc1413cabd2aa3abbd22b4e595a`.

### HWM162-K15 — Nourrisseur à trémie — bac vide

Aliments et gousses retirés du bac visible et de la goulotte ; corps de trémie, renforts et pieds conservés visuellement. Le réservoir supérieur fermé ne permet pas de conclure sur son contenu. Vue et toile carrée cohérentes avec la source. Aucun bac amovible inventé.

Références du dépôt :

- [`docs/suivi-production/v113-open-production-20261102/native-candidates/target-v81-71-272-nourrisseur-native.png`](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/c8d37c3c059021a96b071551bf9b19b09340536e/docs/suivi-production/v113-open-production-20261102/native-candidates/target-v81-71-272-nourrisseur-native.png) ; SHA-256 `214e44126281c66f8d526e57f2cb90527c7c255c7380c516a991a0d3cc3be91b`.

### HWM162-K16 — Râtelier de dressage — vide

Râtelier complet avec cinq crochets vides, sans laisse, collier ni leurre fusionné. Montants inclinés, traverse, socles et vue cohérents avec K03. La zone centrale contrôlée ne contient que des pixels d’alpha 0 ou des traces d’alpha 1/255 ; accroches des accessoires séparés à vérifier en scène.

Références du dépôt :

- [`production/homeworld-sectors-20261103/sprites/kennels/HWM162-K03-training-rack.png`](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/c8d37c3c059021a96b071551bf9b19b09340536e/production/homeworld-sectors-20261103/sprites/kennels/HWM162-K03-training-rack.png) ; SHA-256 `95cef71793ec00c9a9d8ae8842e4e8beb3e83ac9eddf4be57820a2a965637797`.

### HWM162-K17 — Balise de danger — éteinte

Couronne, trois marques en façade et fenêtres latérales sont sombres ; aucune émission orange résiduelle observée. Corps, symbole, pieds, vue et cadrage restent visuellement proches de la source active. Le sens canonique du symbole n’est pas établi.

Références du dépôt :

- [`docs/suivi-production/v113-open-production-20261102/native-candidates/target-v81-71-280-signal-danger-native.png`](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/c8d37c3c059021a96b071551bf9b19b09340536e/docs/suivi-production/v113-open-production-20261102/native-candidates/target-v81-71-280-signal-danger-native.png) ; SHA-256 `ffb1626d43f1b4abff1ebaf568b6e01eff18827283a40afe2bdffe11d4fc14d3`.

## Trois corrections natives conservées dans l’historique

14 appels ImageGen ont produit onze sorties sélectionnées et trois premiers essais archivés. Les trois archives ne comptent pas dans les 46 sprites. Aucun recadrage, miroir, padding ou changement d’alpha par script.

| ID | Défaut du premier essai | Correction retenue |
| --- | --- | --- |
| S12 | Le pied avant atteint le bord bas : marge 0 au seuil alpha > 24. Constat visuel de l’agent de secteur et métriques du reçu. | Nouveau cadrage natif carré, pied entier ; revue directe du résultat corrigé par root. |
| M14 | Anneaux supérieurs presque à la même hauteur, incohérents avec l’axe oblique des crochets de 282. Constat direct de root. | Harnais en profondeur, anneau gauche plus haut et anneau droit plus bas. |
| M15 | Bords longs trop frontaux par rapport aux longerons du support bas 273. Constat direct de root. | Deux bords longs montent vers la droite ; quatre contacts rembourrés et quatre attaches conservés. |

- [HWM162-S12 — première tentative](attempts/market/HWM162-S12-empty-cargo-rack-v1.png) ; SHA-256 `e22805c9acaa013e1e105ccc91cc6f99fb0772249ff6fb263e55ffd1f74d4488`.
- [HWM162-M14 — première tentative](attempts/mounts/HWM162-M14-hanging-mount-harness-v1.png) ; SHA-256 `55ef920fbf2dfa4ad96684823ef36cbee4b0ebf5dd54a1e9aae8cc8c62ce1b5f`.
- [HWM162-M15 — première tentative](attempts/mounts/HWM162-M15-soft-care-cradle-v1.png) ; SHA-256 `3d7ddd8a125816441e057898f25371315a5d749f61461da62bb7459cde3348ee`.

## Mesures et portée

Les onze ajouts sélectionnés représentent **19 422 368 octets**, pour **81 613 076 octets** dans les 46 fichiers sélectionnés. Les trois archives de cette passe sont comptées séparément.

Sur le râtelier K16, la fenêtre centrale contrôlée de 165 000 pixels ne contient que des valeurs alpha 0 ou 1/255 ; la même fenêtre de K03 atteignait 254. Les accessoires opaques ont disparu de cette zone, mais les traces alpha 1 restent dans la sortie native.

Six nouveaux états reprennent la demande de vue de leur référence : S11, S12 et K14–K17. Le lot comporte ainsi treize vues héritées. S13, S14 et M13–M15 ont été demandés selon la cible orthographique 0°/35° du projet ; M14/M15 adaptent en plus l’orientation de l’objet à leur support. Aucun angle réel n’a été mesuré.

Les garde-fous de fichier vérifient les 46 identités, les empreintes, la transparence, les limites de silhouette, la correspondance des huit champs structurels entre le plan et le catalogue, ainsi que les chemins et SHA des 35 anciennes sélections. Ils ne valident pas les raccords en scène.

Les 42 cibles suivies restent les 40 cibles héritées et les deux identités de bâtiment déjà créées dans ce catalogue. Cette passe ne crée aucune nouvelle identité de bâtiment et ne clôture pas le registre global de 354 exigences.

Les créations restent des adaptations originales du jeu. Le volet S14 est une proposition pour la baie ouverte de S05 ; son mécanisme n’est pas attesté dans la référence. Échelles, pivots, emboîtements, accroches, charges, espèces compatibles, collisions, animation et admission runtime restent non validés.

Données de revue : [review-round4.json](review-round4.json). Contrôles mesurés : [technical-report.json](technical-report.json). Audit des équivalents : [modularity-audit-round4.json](modularity-audit-round4.json).
