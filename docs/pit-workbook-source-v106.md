# Feral et Scar — sources et ancrages V106

Le lot vise cinq lignes encore ouvertes en V105 : `M_F006_S1`, `M_F006_S2`, `M_F003_S3` et les deux `SUPER`. Le contrat spatial des trois spéciaux est conservé dans `app/game/data/pitWorkbookEntityAnchorsV106.json` ; celui des supers dans `app/game/data/pitWorkbookSuperAnchorsV106.json`. Leurs accès purs sont dans les modules `pitWorkbookProjectileSourceV106.ts` et `pitWorkbookSuperSourceV106.ts`. Ils ne ferment à eux seuls ni le moteur, ni le rendu, ni l’ensemble des personnages. Les sources historiques restent inchangées.

| Action | Cellule V54 | Préparation / actif / récupération | Dégâts / coût | Réemploi visuel |
| --- | --- | --- | --- | --- |
| Carreaux guidés de Feral | `05_MOVES_PROPOSES!P10` | 23 / 6 / 30 | 115 / 30 % | Cycle historique V59 déjà admis sous cette action, quatre dessins indépendants par sens ; retiming explicite. |
| Bouclier de Feral | `05_MOVES_PROPOSES!Q10` | 9 / 18 / 25 | 70 / 15 % | Six dessins V100 par sens : déploiement, garde, bord, recul, repli, retour. |
| Plasma de Scar | `05_MOVES_PROPOSES!R7` | 20 / 3 / 28 | 105 / 25 % | Six dessins V100 par sens ; références fixes de page 300 px à droite et 261 px à gauche. |
| Super de Feral | `05_MOVES_PROPOSES!T10` | 24 / 8 / 48 | 280 / 100 % | Six dessins V100 par sens sur quatre pages ; vrai lanceur de l’avant-bras gauche. |
| Super de Scar | `05_MOVES_PROPOSES!T7` | 24 / 8 / 48 | 280 / 100 % | Six dessins V100 par sens sur une page ; amorce courte puis extension du combistick. |

Le classeur privé original n’est pas disponible. Les textes et cellules proviennent de l’extraction V56 épinglée (`fc8e1c6c81de62d8966e04746ed0751b0eeefc62f0458728c818896ad79972f4`). Les SHA des onze PNG inchangés et du registre d’admissions V100 sont inclus dans les contrats. Aucun nouveau dessin, miroir, rotation de BODY, recoloration, masque de découpe ou page réécrite n’est produit.

## Feral : réemploi du lanceur et du bouclier

L’admission `M_F006_S1` renvoie déjà à l’atlas `feral-actions-v59`. Elle ne contient pas une nouvelle définition BODY V100 sous `F006_ACT_S1`. V106 réemploie honnêtement ce cycle historique : ses références de préparation deviennent 10 + 13 ticks, l’actif six, la récupération 10 + 20. Les temps V59 9 / 5 / 18 restent inchangés pour les recettes historiques. L’actif et le début de récupération partagent le même dessin natif ; ce partage ne crée pas un cinquième dessin.

Les ancrages existants de `pitFeralMuzzleV59.ts` restent inchangés. Dans la cellule active droite, pivot `(365,463)`, émission `(848,174)`, référence corporelle 470 px ; à gauche, pivot `(559,471)`, émission `(33,156)`, même référence. Le point droit tombe dans le vide ouvert entre les rails : alpha 2 à `(848,694)` dans la page, à deux pixels d’un rail opaque. Le décaler vers la silhouette alpha pour satisfaire un test détruirait le centre d’émission déjà mesuré. Les trois carreaux conservent leur identité physique ; ils ne deviennent pas un canon plasma.

Le bouclier utilise **l’admission V100 `feral-workbook-s2-v100`**, et non les anciens gestes V59. Les deux pages V100 ont été ouvertes. Les dessins admis suivent exactement 9 / 9 / 9 / 8 / 8 / 9 ticks. Le choix conservateur de moteur sépare les 18 ticks actifs en neuf ticks de garde directionnelle puis neuf ticks de coup de bord. Cette séparation est une adaptation déclarée des deux poses natives ; Excel n’ajoute pas une cellule de fenêtre supplémentaire. Le bouclier est peint sur l’avant-bras gauche dans le BODY. `E_F006_shield` peut donc être une géométrie attachée à ce corps, sans extraction arbitraire d’un sprite autonome. Les rectangles du contrat englobent le bouclier visible, avec une incertitude maximale de quatre pixels source ; ils ne certifient pas une invulnérabilité de toute la silhouette.

## Scar : bouche avant, charge et occlusion

Les deux pages `scar-special-s3-right.png` et `scar-special-s3-left.png` ont été ouvertes, ainsi que des agrandissements de diagnostic des vraies cellules. Les grands disques rouges à l’arrière du canon ne sont pas ses ouvertures avant. Le tube se prolonge vers les dreads ; à droite, sa petite ouverture avant est partiellement occultée, à gauche elle apparaît sombre. L’examen indépendant du responsable du rendu confirme cette lecture et l’ordre existant des couches : entités d’abord, BODY ensuite.

| Pose native | Point absolu droite | Point absolu gauche |
| --- | --- | --- |
| Deuxième préparation | `(1107,109)` | `(1107,126)` |
| Libération, premier actif | `(448,420)` | `(425,432)` |
| Recul, deuxième actif | `(1059,422)` | `(1183,432)` |

Les pivots, rectangles et références de page sont ceux de l’admission V100, jamais des ajustements calculés pour égaliser les deux postures. Les points du contrat sont locaux à leur cellule ; la projection dans le monde conserve la hauteur de page et l’axe vertical ascendant de The Pit. Les deux directions restent indépendantes. Le rendu de production applique aussi une correction de pied `measureSpriteContact` sur l’alpha natif : `contactOffsetPx` est mesuré par cellule et soustrait par les projecteurs, afin que le point physique reste exactement sur le point peint. Les tests appellent cette fonction de production sur les vrais pixels.

Un effet de charge pendant les six derniers ticks de préparation, puis un flash au départ, sont des effets de jeu adaptés ; ils ne sont pas déjà peints dans le BODY. Ils doivent être dessinés avant lui pour conserver l’occultation réelle par les dreads et le masque. Aucun effet n’est fixé sur le gros disque rouge arrière. La charge n’est ni un projectile ni un contact anticipé. Les tirs, dégâts, coûts, collisions et fenêtres exactes demandent leurs tests de moteur et leur recette de production séparés.

## Deux supers sans partenaire peint

Les cinq pages des deux supers ont été ouvertes : les quatre originaux de Feral A/B droite/gauche et la page de douze poses de Scar. Leurs BODY ne contiennent aucun partenaire peint. Leurs six dessins admis, leurs pivots et les références de taille restent inchangés ; la distribution entre phases est une adaptation déclarée permettant la véritable amorce bloquable avant la suite.

| Acteur | Préparation 0–23 | Ouverture 24–31 | Récupération confirmée 32–79 | Échec ou garde |
| --- | --- | --- | --- | --- |
| Feral | Dessin 0 tenu 24 ticks | Dessin 0, bash au bouclier, 8 ticks | Dessins 1/2/3/4/5 en 8/8/8/12/12 ticks : saisie, visée, tir, recul, retour | Dessin 0 tenu 48 ticks, puis retour à l’état normal ; aucun lanceur tiré. |
| Scar | Dessin 0 tenu 24 ticks | Dessin 1, culasse courte, 8 ticks | Dessins 2/3/4/5 en 8/8/16/16 ticks : extension, estoc, retrait, garde | Dessin 5 de retour tenu 48 ticks ; aucun estoc prolongé. |

Les totaux source 24/8/48 restent exacts. Les répartitions internes n’étaient pas spécifiées par le texte Excel. Aucun dessin de calibration exclu n’est réintroduit comme nouvelle action. Les dommages 280 se distribuent en amorce 40 puis trois carreaux de 80 pour Feral, et amorce 80 puis un estoc de 200 pour Scar : cette répartition est une adaptation explicite. Les départs Feral sont aux ticks absolus 48/50/52, dans son vrai dessin de tir ; l’estoc Scar se situe aux ticks 40–47, dans son vrai dessin d’extension complète. La suite exige la confirmation d’un contact non gardé, le coût de 100 % est unique, et les blessures ne sont jamais effacées.

Les ancrages de tir Feral sont indépendants de S1 : cellule B droite, point local `(517,93)`, pivot `(238,341)`, référence 372 px ; cellule B gauche, point `(181,77)`, pivot `(502,236)`, référence 234 px. Les points absolus `(517,507)` et `(181,591)` tombent dans l’ouverture entre les vrais rails (alpha 1 et 3), à proximité immédiate de rails opaques. Les corrections de pied natives sont respectivement 2 et 3 px. Les deux émissions ne sont fixées ni sur le récepteur rouge ni sur une coordonnée de S1 réemployée.

Les géométries d’amorce sont limitées au bouclier visible de Feral et au bout court doré du bâton de Scar. Celle de l’estoc Scar suit le segment natif main–pointe : à droite `(397,111)`–`(614,93)`, à gauche `(227,100)`–`(32,78)` dans la cellule complète de poussée. Ce sont des enveloppes visuelles conservatrices à quatre pixels source, pas des boîtes de collision prétendument écrites dans le classeur. Le moteur, la caméra bornée, les vrais acteurs victimes et leur recette de production gardent leurs preuves séparées.

## Les douze autres actions restent ouvertes

Si les cinq liaisons de gameplay sont validées, le total passe de 35 à 40 sur 52, avec douze actions encore ouvertes :

- Quatre projections : les BODY `TH_F/TH_B` incluent un partenaire d’étude peint. Le corps de la victime, son échappée et sa réaction doivent rester autonomes ; coller ces images sur un adversaire arbitraire produirait un deuxième partenaire.
- Mine de Feral : l’étude montre le dispositif dans plusieurs poses, mais ne fournit pas encore une entité autonome admise avec placement, armement, proximité, destruction et expiration. La variation native de taille entre ses pages (environ 19–21 %) est acceptée pour l’étude BODY, pas comme certification d’un objet physique stable. Découper le dispositif sans séparer ses duplications peintes dans le BODY ne ferme pas ce problème.
- Shuriken de Scar : le BODY corrigé montre un seul dispositif, des straps vides après son prélèvement et le geste de lancer. Il ne livre pas une admission autonome de l’étoile en vol. Le disque circulaire historique ne peut pas lui être substitué.
- Six conclusions : fatalités et clémences contiennent un partenaire peint et demandent leur contexte de fin, deux corps indépendants, la synchronisation et les conséquences de campagne autorisées.

Les seize étapes de campagne et quatorze contraintes de variantes restent suivies à part. Le BODY masqué de base n’admet pas automatiquement une tenue précise, une arme perdue ou cassée, un camouflage ou une séquence de récit.

## Contrôles de provenance

`tests/pit-workbook-source-v106.test.mjs` et `tests/pit-workbook-super-source-v106.test.mjs` vérifient les cinq sources et leurs valeurs contre les cellules immuables, les SHA de pages, le véritable réemploi V59, les rectangles/pivots V100, les ouvertures peintes ou le vide des rails, les deux directions indépendantes, le contact au sol de production, les branches de supers et leurs totaux, la projection et le rejet des entrées inconnues. Ils vérifient les coordonnées et leur origine, pas la livraison des mécaniques ou une fidélité canonique intégrale. Les douze sous-tests passent ; la preuve portable est `docs/v106-pit-source-anchor-review.json`.
