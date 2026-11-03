# Revue de la sixième passe — marché, montures et chenils

**14 nouveaux sprites indépendants sont retenus**, après 16 générations natives et deux corrections. Ils complètent les 56 sélections précédentes : **70 PNG au total**, soit 21 marché, 23 montures et 26 chenils. Les premiers essais corrigés sont archivés séparément et ne comptent pas parmi les sélections.

Base inspectée : [`1223042`](https://github.com/darknigthmare/yautja-la-longue-chasse/commit/1223042c249fab900e7fba9f49d7c78d105bd645), tête de la PR #99 après la cinquième passe. La branche principale contrôlée reste `f322e0cb42f2b1b7e06c3be1dcfbb23cb24f02c8`.

Cette revue porte sur les sources graphiques. Les sorties et leurs références ont été affichées séparément par l’assistant coordinateur. Elle ne constitue pas une revue artistique humaine, une certification canonique ou une validation en jeu.

## Livraison et références

Chaque ligne ouvre un PNG autonome. Les dimensions sont celles des sorties natives. La marge visible utilise les pixels d’alpha strictement supérieur à 24 ; elle ne prouve pas que la périphérie entière est parfaitement transparente.

| ID | Sprite retenu | Dimensions natives | Marge visible minimale | Références visuelles |
| --- | --- | --- | ---: | --- |
| HWM162-S18 | [Chariot de manutention — sans chargement](sprites/market/HWM162-S18-empty-cargo-sorting-cart.png) | 1536 × 1024 | 27 px | [port-cargo-sorting-cart.png](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/1223042c249fab900e7fba9f49d7c78d105bd645/public/game/homeworld/v78/port-cargo-sorting-cart.png) |
| HWM162-S19 | [Sac marchand suspendu en filet autonome](sprites/market/HWM162-S19-hanging-net-bag.png) | 1024 × 1536 | 74 px | [market-stall-right.png](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/1223042c249fab900e7fba9f49d7c78d105bd645/public/game/homeworld/v78/market-stall-right.png) |
| HWM162-S20 | [Halle — sol et structure arrière](sprites/market/HWM162-S20-market-hall-rear-interior.png) | 1774 × 887 | 98 px | [HWM162-S01-market-hall-v2.png](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/1223042c249fab900e7fba9f49d7c78d105bd645/production/homeworld-sectors-20261103/sprites/market/HWM162-S01-market-hall-v2.png) |
| HWM162-S21 | [Halle — façade et toiture au premier plan](sprites/market/HWM162-S21-market-hall-front-roof.png) | 1774 × 887 | 83 px | [HWM162-S01-market-hall-v2.png](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/1223042c249fab900e7fba9f49d7c78d105bd645/production/homeworld-sectors-20261103/sprites/market/HWM162-S01-market-hall-v2.png) |
| HWM162-M19 | [Meuble du poste de soin dégagé](sprites/mounts/HWM162-M19-cleared-care-workstation.png) | 1536 × 1024 | 207 px | [HWM162-M06-fauna-care-workstation.png](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/1223042c249fab900e7fba9f49d7c78d105bd645/production/homeworld-sectors-20261103/sprites/mounts/HWM162-M06-fauna-care-workstation.png) |
| HWM162-M20 | [Coussin segmenté du poste de soin](sprites/mounts/HWM162-M20-care-support-cushion.png) | 1536 × 1024 | 403 px | [HWM162-M06-fauna-care-workstation.png](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/1223042c249fab900e7fba9f49d7c78d105bd645/production/homeworld-sectors-20261103/sprites/mounts/HWM162-M06-fauna-care-workstation.png) |
| HWM162-M21 | [Module d’éclairage et de commande du poste de soin](sprites/mounts/HWM162-M21-care-light-control-module.png) | 1536 × 1024 | 242 px | [HWM162-M06-fauna-care-workstation.png](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/1223042c249fab900e7fba9f49d7c78d105bd645/production/homeworld-sectors-20261103/sprites/mounts/HWM162-M06-fauna-care-workstation.png) |
| HWM162-M22 | [Abri des montures — sol et structure arrière](sprites/mounts/HWM162-M22-stable-floor-rear-structure.png) | 1536 × 1024 | 88 px | [HWM162-M01-open-stable.png](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/1223042c249fab900e7fba9f49d7c78d105bd645/production/homeworld-sectors-20261103/sprites/mounts/HWM162-M01-open-stable.png) |
| HWM162-M23 | [Abri des montures — façade et toiture](sprites/mounts/HWM162-M23-stable-front-roof-structure.png) | 1536 × 1024 | 97 px | [HWM162-M01-open-stable.png](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/1223042c249fab900e7fba9f49d7c78d105bd645/production/homeworld-sectors-20261103/sprites/mounts/HWM162-M01-open-stable.png) |
| HWM162-K22 | [Intérieur des loges du chenil](sprites/kennels/HWM162-K22-kennel-interior.png) | 1536 × 1024 | 155 px | [HWM162-K01-kennel-building.png](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/1223042c249fab900e7fba9f49d7c78d105bd645/production/homeworld-sectors-20261103/sprites/kennels/HWM162-K01-kennel-building.png) |
| HWM162-K23 | [Façade et toiture des chenils](sprites/kennels/HWM162-K23-kennel-facade-roof.png) | 1536 × 1024 | 69 px | [HWM162-K01-kennel-building.png](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/1223042c249fab900e7fba9f49d7c78d105bd645/production/homeworld-sectors-20261103/sprites/kennels/HWM162-K01-kennel-building.png) |
| HWM162-K24 | [Grille autonome de loge](sprites/kennels/HWM162-K24-kennel-bay-grille.png) | 1536 × 1024 | 144 px | [HWM162-K01-kennel-building.png](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/1223042c249fab900e7fba9f49d7c78d105bd645/production/homeworld-sectors-20261103/sprites/kennels/HWM162-K01-kennel-building.png) ; [HWM162-K23-kennel-facade-roof.png](sprites/kennels/HWM162-K23-kennel-facade-roof.png) — passe courante |
| HWM162-K25 | [Corps de cage moyenne sans trappe mobile](sprites/kennels/HWM162-K25-medium-cage-body.png) | 1536 × 1024 | 32 px | [target-v81-71-277-cage-moyenne-native.png](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/1223042c249fab900e7fba9f49d7c78d105bd645/production/native-open-20261102/archives/fauna-energy/cages/target-v81-71-277-cage-moyenne-native.png) ; [HWM162-K11-medium-cage-open.png](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/1223042c249fab900e7fba9f49d7c78d105bd645/production/homeworld-sectors-20261103/sprites/kennels/HWM162-K11-medium-cage-open.png) |
| HWM162-K26 | [Trappe coulissante de cage moyenne autonome](sprites/kennels/HWM162-K26-medium-cage-sliding-panel.png) | 1536 × 1024 | 88 px | [target-v81-71-277-cage-moyenne-native.png](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/1223042c249fab900e7fba9f49d7c78d105bd645/production/native-open-20261102/archives/fauna-energy/cages/target-v81-71-277-cage-moyenne-native.png) ; [HWM162-K11-medium-cage-open.png](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/1223042c249fab900e7fba9f49d7c78d105bd645/production/homeworld-sectors-20261103/sprites/kennels/HWM162-K11-medium-cage-open.png) |

Les quatorze demandes héritent de la vue de leurs références ; le lot compte désormais **36 vues héritées**. Aucun angle réel n’a été mesuré. Les huit fichiers de référence historiques sont liés à la base immuable. K23, utilisé pour corriger le contour de K24, est une sortie de cette passe : il est lié au fichier courant, avec `sourceCommit: null` dans la revue JSON. Les entrées exactes de chaque tentative, notamment les références supplémentaires des corrections, restent dans les reçus.

## Répartition des bâtiments

Les trois identités de bâtiment existantes sont conservées. Six nouveaux fichiers proposent leurs couches de composition :

| Bâtiment existant | Couche arrière | Couche avant | Répartition |
| --- | --- | --- | --- |
| Halle S01 | S20 | S21 | Sol, seuils, maçonneries et supports arrière dans S20 ; toit, quatre piliers avant, socles, arches et draperies dans S21. |
| Abri des montures M01 | M22 | M23 | Plancher, seuils et murs dans M22 ; toit, linteaux et quatre piliers avant complets dans M23. |
| Chenil K01 | K22 | K23 | Sols, drains, parois et séparations des trois loges dans K22 ; façade, toiture et quatre piliers avant dans K23. |

Cette partition prépare un ordre de dessin arrière → occupants/équipements → façade. Les fichiers n’ont pas été recalés ou assemblés dans le moteur : les contacts, l’échelle, la profondeur, les entrées et les collisions restent à vérifier. Les surfaces auparavant masquées sont des reconstructions sobres du projet.

## Objets et états complémentaires

Le chariot S18 conserve son équipement fixe et libère le plateau ainsi que le cadre de retenue des charges. Le sac S19 reprend un objet auparavant incorporé au stand V78, sans lui attribuer un contenu canonique. La cible V81 « chariot vide » 207, citée dans l’audit comme besoin apparenté, reste hors des 40 cibles héritées de ce catalogue.

M19 conserve le meuble de soin, son bassin, ses tiroirs, sa porte et les rails du coussin. M20 fournit seulement le coussin compact. M21 conserve la console, l’embase étroite, le bras, le câble et la lampe. Aucun effet diagnostique ou clinique n’est établi.

K24 est une **nouvelle grille proposée pour le projet**, fondée sur le profil d’une baie K01/K23 : aucune grille de ce type n’est observée dans K01 et aucun mécanisme officiel n’est revendiqué. K25 retire la trappe mobile de la cage 277 tout en conservant sa demi-façade droite fixe. K26 fournit cette trappe et son loquet ambre ; les états 277 et K11 confirment que le loquet se déplace avec elle. La cage reste une identité de faune générale, sans certification de compatibilité avec les Hounds de 2010 ou 2018.

## Corrections retenues

| ID | Premier essai archivé | Motif de correction native |
| --- | --- | --- |
| HWM162-M21 | [HWM162-M21-care-light-control-module-v1.png](attempts/mounts/HWM162-M21-care-light-control-module-v1.png) | Le bas du module inclut le plateau horizontal à trois marques et le large chant bronze déjà conservés dans M19. Correction native demandée pour retirer cette duplication tout en conservant console, bras et lampe. |
| HWM162-K24 | [HWM162-K24-kennel-bay-grille-v1.png](attempts/kennels/HWM162-K24-kennel-bay-grille-v1.png) | La grille est trop large par rapport à sa hauteur et son contour trop évasé comparé à la baie centrale de K01/K23. Correction native demandée pour rapprocher les proportions de la référence, en conservant matériaux et barreaux sans ajouter de mécanisme. |

Les deux archives représentent **2 816 806 octets**. Elles restent inchangées dans `attempts/`. Les sélections finales conservent les octets des sorties du générateur : aucune retouche de pixels, découpe, mise à l’échelle ou symétrie par script n’a été appliquée.

## Vérifications effectuées

- **70 PNG RGBA, 70 empreintes distinctes**, avec de vrais pixels transparents et des silhouettes entières au seuil alpha > 24.
- **56 images précédentes inchangées**, ainsi que les 17, 18 et 21 anciennes entrées des reçus marché, montures et chenils.
- **21 210 971 octets nouveaux sélectionnés**, pour **115 142 232 octets sélectionnés au total**.
- **17 sources avec une marge strictement transparente** au seuil alpha > 0 ; **40 avec au moins 80 px de marge visible** au seuil alpha > 24. Pour cette passe, S18, S19, K23 et K25 ont une marge visible inférieure à 80 px, sans silhouette substantielle coupée.
- Les fenêtres échantillonnées des façades M23 et K23 contiennent seulement de l’alpha 0 ou 1. Sur K24 corrigé, les fenêtres documentées contiennent de l’alpha 2 à 8 : traces faibles conservées, sans prétendre une transparence strictement nulle. Les coordonnées, seuils et comptes sont disponibles dans les reçus et la revue JSON.
- Les 14 sélections et les deux premiers essais ont fait l’objet d’un examen visuel direct. Les neuf références de conception sont identifiées par leur empreinte ; huit sont historiques, une appartient à cette passe.

Commande de contrôle :

```sh
python3 production/homeworld-sectors-20261103/tools/verify-assets.py
```

Les contrôles de fichiers ne prouvent ni raccord de composants, ni animation, ni placement d’acteurs, ni fonctionnement du jeu. Les cadrages natifs sont propres à chaque sortie : le sac S19, la grille K24 et les pièces de cage notamment demandent un réglage d’échelle et de position. Les 42 cibles suivies restent les 40 identités V81 héritées et les deux bâtiments propres au catalogue ; aucune clôture du registre global de 354 cibles n’est prononcée.

## Observations par sprite

### HWM162-S18 — Chariot de manutention — sans chargement

Plateau et cadre de retenue vidés : deux coffres, trois modules et textile retirés. Châssis, roues visibles, poignée, treuil, cordage fixe et taquet conservés. Surface auparavant couverte reconstruite, identité et vue du chariot V78 cohérentes ; aucun chargement résiduel.

SHA-256 : `71e3db9d93191e3107c760fa93de76a916ddabcec59fed67af7b8b5aee46cbab`.

### HWM162-S19 — Sac marchand suspendu en filet autonome

Un seul sac fermé en filet, enveloppe sombre neutre et boucle entière. Aucun poteau, lampe ou second sac. Aucun contenu identifiable. Détails du petit sac de référence interprétés en vue rapprochée ; cadrage et échelle du nouvel objet ne valent pas correspondance de pixels avec le stand.

SHA-256 : `d5d1c1fffb8872641c285c23a8902db63c98122dc1a91bb67783a5a1d642aa3c`.

### HWM162-S20 — Halle — sol et structure arrière

Sol continu des trois travées, seuils, maçonneries latérales/arrière et trois ouvertures arrière conservés. Toit, draperies et quatre grands piliers de façade absents. Les supports intérieurs et les surfaces auparavant masquées sont complétés dans cette couche. Aucun mobilier ajouté ; contacts avec la façade à régler.

SHA-256 : `68c25fb9fd8bfb13a3e0391bd8478dabef0423684319867dcc2699901fb27daf`.

### HWM162-S21 — Halle — façade et toiture au premier plan

Toiture entière avec pointes et corniches, quatre piliers avant avec leurs socles, arches, lumières et draperies conservés. Trois baies dégagées ; aucun sol ni maçonnerie arrière. Aucun des supports arrière de S20 n’est repris dans cette couche. Raccord exact et occlusion en moteur non établis.

SHA-256 : `f9cdcbc832a09c0cc3dc356adc4bb712fdbcc9db5247437cafeb41b2de0a2de8`.

### HWM162-M19 — Meuble du poste de soin dégagé

Meuble entier conservé avec bassin gauche, quatre tiroirs fermés, porte centrale, pieds et rails du logement central. Coussin rouge et ensemble console/bras/lampe retirés. Surfaces dégagées reconstruites sobrement ; vue et identité du meuble visuellement cohérentes avec M06. Halo natif diffus conservé ; assemblage et échelle non certifiés.

SHA-256 : `ee14f72f993218dc05b8ff63dd3910633331f9a477d2bedb2b2af4bac5d3c380`.

### HWM162-M20 — Coussin segmenté du poste de soin

Coussin rouge compact complet, segmentation et coutures conservées visuellement, sans rails ni meuble. Reste placé à petite échelle dans son grand canevas natif, proche du cadrage de M06. Dessous reconstruit ; appui physique et contact avec M19 non validés.

SHA-256 : `187cbd9058b9d2365570e8900a2c06d3a1436bcc4e0b24dba107086c664d5a4a`.

### HWM162-M21 — Module d’éclairage et de commande du poste de soin

Correction native retenue : le plateau horizontal aux trois marques et son large chant bronze ont disparu. Console, indicateurs, étroite embase, câble, articulations et lampe restent connectés dans un seul objet. Aucun meuble ni coussin ; fonction limitée à l’éclairage et à la commande du projet, sans diagnostic attesté.

SHA-256 : `92b22307ea34aeadc1ba92c0cf1c9f8b8fbb3fcd6e81ee6a28a88d956bf19079`.

### HWM162-M22 — Abri des montures — sol et structure arrière

Plancher continu avec trois seuils, murs arrière et latéraux, nervures, lumières et panneaux rouges conservés. Aucun toit ni grand pilier de façade. Les raccords jusque-là masqués sont reconstruits ; couche arrière cohérente avec M01, sans validation du raccord à la façade.

SHA-256 : `58a5d3581825510ed15508cf338df96565c6d8bfdce89e3a8ddf0214ce60e6b3`.

### HWM162-M23 — Abri des montures — façade et toiture

Toiture complète avec linteaux, quatre piliers avant et leurs pieds. Trois baies débarrassées du sol, des seuils et des parois arrière. Les éléments retirés restent dans M22. L’échantillonnage des baies dans le reçu n’observe que de l’alpha 0 ou 1 ; aucun raccord ou comportement en scène certifié.

SHA-256 : `a04d905551ca9dfe4e318ff6928bf9fb24386a49c93b1b8a54d91e68f27f917e`.

### HWM162-K22 — Intérieur des loges du chenil

Trois loges avec sols, drains avant, parois arrière et séparations longitudinales. Toiture et quatre piliers épais de façade retirés ; les chants minces des parois restent dans la couche intérieure. Surfaces cachées reconstruites et cadrage natif propre, sans garantie de raccord au pixel.

SHA-256 : `f8eba50ccd25e3898deba896f2e2a282938489a2c4ebb3e56825b3d00175f85b`.

### HWM162-K23 — Façade et toiture des chenils

Façade, toiture et quatre piliers épais avec leurs pieds conservés. Trois baies sans sol, drain ou paroi arrière ; les sols et cloisons restent K22. Silhouette entière malgré les marges latérales natives de 70 et 69 px ; traces d’alpha faible dans les ouvertures distinguées de leur structure.

SHA-256 : `193e14f23bb198efe33ecb814d80e6adbe0d1932a010342d0fb853c106450c60`.

### HWM162-K24 — Grille autonome de loge

Correction native retenue : grille plus haute et nettement moins évasée, rapprochant son contour de la baie centrale K01/K23. Cadre, barreaux et deux traverses restent un objet unique ; aucun mécanisme d’ouverture ou fixation ajouté. La grille est une création du projet absente de K01. Le cadrage propre demande encore un réglage de taille et placement. Les fenêtres échantillonnées contiennent des traces alpha 2 à 8, sans transparence strictement nulle revendiquée.

SHA-256 : `3e5eac4f7a3f16f9666de8bfdc4a0b258ab7d0eb20252f95ceba9f1805b3fd3a`.

### HWM162-K25 — Corps de cage moyenne sans trappe mobile

Corps de cage entier avec toit à longs barreaux, côtés, arrière, plancher, pieds et demi-façade droite fixe. Accès gauche sans panneau ni loquet, aucun panneau rétracté. Le montant boulonné bordant la partie droite est une reconstruction de raccord, pas une pièce indépendante attestée sous la trappe source. Nouveau cadrage paysage natif, marge basse visible de 32 px.

SHA-256 : `6c67ef40e5cca6a84515a5c33cb0a4007fd53bd697cff4d791baed02c8e1cc68`.

### HWM162-K26 — Trappe coulissante de cage moyenne autonome

Panneau mobile unique dans une vue diagonale cohérente avec 277, quatre coins boulonnés, barreaux verticaux, traverse centrale et loquet ambre à gauche. Aucun corps de cage, rail fixe, pilier ou plancher. Les états 277/K11 montrent que le loquet suit le panneau. Cadrage et échelle propres ; les guidages, contacts et translations restent à régler.

SHA-256 : `cbab78e4e8df0ed7e89f3692399f6f93d54254277238649da96f7d3d86afeeea`.

## Traçabilité

- [Revue mesurée JSON](review-round6.json)
- [Audit de la passe 6](modularity-audit-round6.json)
- [Plan et identités](next-targets-round6.json)
- [Manifeste](manifest.json)
- [Rapport technique](technical-report.json)
- [Reçu marché : prompts et références](receipts/market.json)
- [Reçu montures : prompts et références](receipts/mounts.json)
- [Reçu chenils : prompts et références](receipts/kennels.json)
- [Classeur de suivi](YAUTJA_MARCHE_MONTURES_CHENILS_20261103.xlsx)

Génération : `image_gen.imagegen`, outil intégré, une sortie indépendante par objet ou état. Les adaptations originales sont distinguées des références de lore ; aucune fidélité canonique 1:1, dimension physique officielle ou validation humaine n’est attribuée à cette livraison.
