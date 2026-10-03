# Homeworld V78 — relecture des nouveaux modules générés

Treize PNG sélectionnés et deux variantes anciennes ont été effectivement ouverts. Leurs dimensions, les valeurs alpha et les SHA ont été lues sur les octets originaux, sans recadrage, rotation, nettoyage, recompression ou copie de ces images. Ce reçu atteste la lecture des **sources**, pas leur intégration au jeu. Au moment de la relecture, la copie runtime reste bloquée selon le parent par l'accès filesystem/initialisation d'auto-review sur C: plein ; aucun refus n'a été contourné. Les écritures de ce document et des deux manifestes ont, elles, réussi par l'outil normal autorisé.

Le [plan de douze familles](../app/game/data/homeworldCityArtManifestV78.json) et le [corpus généré de treize sélectionnés](../app/game/data/homeworldCityGeneratedProvenanceV78.json) sont distincts. Quatre sources correspondent aux quatre premiers modules du plan. Le retaining-wall frontal et le palais complet offrent des alternatives partielles à une variante gauche et au porche demandé ; cinq autres fichiers — chariot, table commune, escalier, rampe, citerne — et deux poses civiles sont des ajouts. Ils ne justifient aucun compte de modules jouables. Les originaux se trouvent dans la collection globale de génération de ce chat, identifiée dans le manifeste ; chaque nom exact y est lié à sa SHA.

## Mesures sur les treize sélectionnés

Le tableau donne les marges **gauche/haut/droite/bas** du rectangle des pixels dont alpha >128. Les pixels faibles de lissage/lueur peuvent aller plus loin : toutes les bornes aux seuils >0, >128 et >250, les nombres de pixels aux bords et les RGBA des quatre coins sont conservés dans le JSON. Aucun alpha >128 des treize sélectionnés ne touche le bord du canevas. Seules la maison safe et la façade safe ont au moins 48 pixels sur les quatre côtés à ce seuil ; cela ne prouve ni leur pivot physique ni leur perspective après placement.

| Source sélectionné | Pixels | Marges L/T/R/B à alpha >128 | Pixels alpha=0 | Relecture source | SHA courte, complète dans JSON |
| --- | --- | --- | --- | --- | --- |
| `market-stall-right` | 1536 × 1024 | 47/6/18/58 | 728,404 | SOURCE_REVIEW_WITH_LIMITS | `c98a90d777cf…` |
| `merchant-home-right-safe` | 1327 × 1186 | 124/87/50/66 | 791,336 | SOURCE_REVIEW_WITH_LIMITS | `ac86d081e0e0…` |
| `forge-workstation-left` | 1536 × 1024 | 31/3/15/27 | 724,027 | SOURCE_REVIEW_WITH_LIMITS | `495980e1053b…` |
| `archive-shelf-right` | 1024 × 1536 | 11/10/8/11 | 542,211 | SOURCE_REVIEW_WITH_LIMITS | `bbd5cea8c927…` |
| `terrace-retaining-front` | 1774 × 887 | 26/84/26/83 | 438,338 | SOURCE_REVIEW_WITH_LIMITS | `00b1323bac81…` |
| `port-cargo-sorting-cart` | 1536 × 1024 | 39/9/51/29 | 715,252 | SOURCE_REVIEW_WITH_LIMITS | `0354f5848f6a…` |
| `clan-common-table-left` | 1536 × 1024 | 22/11/18/20 | 969,896 | SOURCE_REVIEW_WITH_LIMITS | `b6a25d7e1763…` |
| `palace-frontage-safe` | 1536 × 1024 | 56/55/56/65 | 707,314 | SOURCE_REVIEW_WITH_LIMITS | `9847e7e87d0e…` |
| `acropolis-stair-front` | 1024 × 1536 | 120/18/120/35 | 808,575 | SOURCE_REVIEW_WITH_LIMITS | `201500b10387…` |
| `lower-quarter-ramp-front` | 1024 × 1536 | 152/26/153/38 | 924,051 | SOURCE_REVIEW_WITH_LIMITS | `41ce9f8311df…` |
| `civilian-forge-artisan` | 1024 × 1536 | 219/20/243/22 | 1,006,436 | ANATOMY_REVIEW_REQUIRED | `b5ba874c9cdf…` |
| `civilian-archive-keeper` | 1024 × 1536 | 230/9/233/33 | 1,014,167 | ANATOMY_REVIEW_REQUIRED | `8c58d432f02e…` |
| `civic-water-cistern-right` | 1350 × 1165 | 59/18/54/33 | 628,616 | SOURCE_REVIEW_WITH_LIMITS | `8417c094e895…` |

Chaque fichier a quatre canaux, un minimum alpha de 0 et des pixels entièrement transparents utiles. Plusieurs ont un maximum alpha de 254 et **zéro** pixel à255 : il s'agit de sujets presque opaques, pas d'une image sans fond transparent. Ce reçu n'autorise pas à normaliser tous les alpha ou à effacer des lueurs. Le compositing réel sur sol clair/sombre, les contours à l'échelle du jeu et la lisibilité après native scaling restent à vérifier dans le consommateur.

## Relecture par fichier

### market-stall-right

Source : `exec-60512172-4939-44fa-a515-8007cb2ef9fd.png`. Orientation observée/déclarée : native-right-diagonal (parent identity; exact ground yaw not measured). Relecture réellement effectuée avec `view_image`, détail original, horodatage du lot 2026-10-03T06:23:35Z.

- Complete four support composition and continuous counter; basalt/bronze/dark fabric coherent with local palette.
- Top spear margin6/right18 at alpha>128; faint low-alpha material reaches three canvas edges.
- Stock vessels, minerals and fabric are original adaptations, not certified franchise items.

### merchant-home-right-safe

Source : `exec-bb220842-e5a7-4bc0-881e-14574eaa7d18.png`. Orientation observée/déclarée : native-right-diagonal; side face visible. Relecture réellement effectuée avec `view_image`, détail original, horodatage du lot 2026-10-03T06:23:35Z.

- All crown points, side water cylinder, front steps and bases now contained.
- Front doorway visually open; actual threshold/clearance and matching interior envelope require native landmark metrology.
- Props fused into this architectural source are not individual modular assets.

### forge-workstation-left

Source : `exec-823ac936-74e2-4b5d-a538-8e83f395622f.png`. Orientation observée/déclarée : native-left-diagonal (parent identity; exact ground yaw not measured). Relecture réellement effectuée avec `view_image`, détail original, horodatage du lot 2026-10-03T06:23:35Z.

- Bench, anvil, small hearth, exhaust and hanging tools have distinct local workshop function.
- Chimney top margin3/right15 at alpha>128; no substantial silhouette reaches edge at that threshold.
- Hammer/tongs/anvil are original local tools; do not label them canonical Yautja weapons.

### archive-shelf-right

Source : `exec-1a0274dd-cb68-427e-8b63-8eb0273ba94a.png`. Orientation observée/déclarée : native-right-diagonal. Relecture réellement effectuée avec `view_image`, détail original, horodatage du lot 2026-10-03T06:23:55Z.

- Whole shelving volume with four support feet and stored slabs/cases; wall-side placement advisable.
- Margins left11/top10/right8/bottom11 at alpha>128 are tight.
- Glyphs/records/trophy-like small skull are original visual decoration, not readable canonical documents or earned rewards.

### terrace-retaining-front

Source : `exec-6c47a90d-976f-4d86-ad08-e71062947cf8.png`. Orientation observée/déclarée : native-front. Relecture réellement effectuée avec `view_image`, détail original, horodatage du lot 2026-10-03T06:23:55Z.

- Horizontal top ledge, paired buttresses and continuous rock base communicate terrace retaining mass.
- Front orientation differs from planned left diagonal wall.
- Transparent PNG provides no physical top ground by itself; real terrain/floor required.

### port-cargo-sorting-cart

Source : `exec-3da7ed3f-0443-4c8a-915b-4e398edc7cf3.png`. Orientation observée/déclarée : native-left-diagonal. Relecture réellement effectuée avec `view_image`, détail original, horodatage du lot 2026-10-03T06:23:55Z.

- Cargo strapped to cart, wheels and winding drum read as loading equipment.
- Top margin9 at alpha>128 is tight; large footprint must stay in real side pocket.
- Manual wheels/cargo handling are original local transport adaptation; no canonical vehicle fidelity claimed.

### clan-common-table-left

Source : `exec-6cf92f90-7e1f-42ea-8dab-11b52edc1d3d.png`. Orientation observée/déclarée : native-left-diagonal. Relecture réellement effectuée avec `view_image`, détail original, horodatage du lot 2026-10-03T06:24:07Z.

- Tabletop, visible legs, shared food/drink composition fit a social furnishing.
- Top11/right18/bottom20 margins at alpha>128 are tight.
- Food, containers and drinks baked into this table are not independent animated props or a canon recipe; do not replace transactional service tables without preserving real host/approach.

### palace-frontage-safe

Source : `exec-9c91d46f-5633-4dbe-b613-dcb1a3e6872d.png`. Orientation observée/déclarée : native-front. Relecture réellement effectuée avec `view_image`, détail original, horodatage du lot 2026-10-03T06:24:07Z.

- Central complete crown, side towers, entrance stairs and supporting base contained with alpha>128 margins56/55/56/65.
- Facade is a wider complete complex than planned audience porch; footprint/door/interior correspondence still requires integration choices.
- Stylized central face/glyphs/royal-looking banners are original clan imagery, not a known canonical monarch or universal palace.

### acropolis-stair-front

Source : `exec-87c48447-a34c-42e4-813d-32398eb87ca5.png`. Orientation observée/déclarée : native-front; climb along image vertical axis. Relecture réellement effectuée avec `view_image`, détail original, horodatage du lot 2026-10-03T06:24:07Z.

- Four flights and intermediate landings have physically legible entry/exit arrangement.
- Top18/bottom35 margins at alpha>128 are below target.
- Painted flights cannot drive physical elevation or teleport; must bind to the existing continuous real transit and landing coordinates.

### lower-quarter-ramp-front

Source : `exec-ec60f2cc-5f46-48ae-86b7-c09e6faa80c3.png`. Orientation observée/déclarée : native-front; climb along image vertical axis. Relecture réellement effectuée avec `view_image`, détail original, horodatage du lot 2026-10-03T06:24:07Z.

- Whole ramp and parapets have clear bottom approach and top landing.
- Top26/bottom38 margins at alpha>128 are below target.
- Real movement support and elevation must follow geometry; do not render ramp as a walkable flat decoration without physical connector.

### civilian-forge-artisan

Source : `exec-5f279167-e37a-4592-8ce3-c0c27557d755.png`. Orientation observée/déclarée : static upright three-quarter pose facing left. Relecture réellement effectuée avec `view_image`, détail original, horodatage du lot 2026-10-03T06:27:24Z.

- Work apron, covered torso/legs, wrapped feet, mandibles and dread silhouette distinguish civilian trade role.
- Both clawed hands contain overlapping fingers; four-mandible anatomy/count and hands need reference and close acceptance review.
- Static single pose; no native walking, hand action, facial or dread animation in this file.
- Top20/bottom22 margins at alpha>128 are below target.

### civilian-archive-keeper

Source : `exec-83f0b97f-32b6-4525-893b-9ae1664d5596.png`. Orientation observée/déclarée : static upright three-quarter pose facing right. Relecture réellement effectuée avec `view_image`, détail original, horodatage du lot 2026-10-03T06:27:24Z.

- Full robe, reddish shoulder textile, document slab and pouch distinguish archival role from fighter.
- Slab-holding hand and relaxed claw hand require finger anatomy/reference review; mandible count is partly occluded.
- Static single pose; no native walking, document handling or speech animation in this file.
- Top9/bottom33 margins at alpha>128 are below target.

### civic-water-cistern-right

Source : `exec-00a056c7-5e3e-4e7f-8f75-f971d86cb10e.png`. Orientation observée/déclarée : native-right-diagonal. Relecture réellement effectuée avec `view_image`, détail original, horodatage du lot 2026-10-03T06:27:24Z.

- Reservoir, valve, empty basin and shared footing provide a distinct civil service context.
- Small vessels and vegetation are fused into this service module; they are not independent modular PNGs.
- No water-flow animation or potable-water/canonical-appliance claim; local original engineering.
- Top18/bottom33 margins at alpha>128 are below target.

## Deux variantes anciennes préservées

- Maison ancienne `exec-af7e8ebc-d869-40ed-9897-2d0edeb8c0d6.png`, SHA `a063ad67ab75e77fe378c41ec17fa45372f14c9f96ca872e31a0f165ec948335` : relecture 2026-10-03T06:26:02Z. Fondation droite au bord, sept pixels alpha >128 au bord droit. Conservée, non sélectionnée. Remplacement safe : `merchant-home-right-safe`.
- Palais ancien `exec-fb456a37-f30c-46af-9ed6-b2ffaf09cd7d.png`, SHA `b028b75792e2ccbbb1a50465ec338eb7e2e8e75cf05def18ece892443daea2eb` : relecture 2026-10-03T06:27:24Z. Couronne et ailes presque au bord, marge d'un pixel à gauche/haut/droite au seuil128 ; cadre trop serré. Conservé, non sélectionné. Remplacement safe : `palace-frontage-safe`.

Les versions anciennes ne sont pas supprimées, renommées ou réécrites par cet audit. Les variantes safe sont des octets distincts identifiés par leurs propres SHA ; aucune ancienne SHA n'est attribuée au nouveau fichier.

## Limites lors de la revue initiale des sources

Les bornes alpha sont des mesures d'image, **pas** un groundFrame, une porte, une collision ou un pivot validé. Il reste à mesurer les vrais appuis et seuils dans chaque volume, puis l'échelle native dans la caméra du projet. Le stockage de treize fichiers ne signifie pas treize façades/PNJ réellement montés. Aucun `runtimeSrc`, `runtimeSha256` ou `nativeLandmarks` n'est inventé : ils restent nuls.

Le niveau -1A, les poches du port et les volumes civiques doivent disposer de sol, d'accès, de services/intérieurs correspondants et de chemins de corps entier. Les escaliers/rampes peints doivent être liés à un transit physique réel et continu ; les PNG ne créent aucune élévation. Les hôtes C’ntlip transactionnels restent distincts du nouveau décor de table ; ne pas supprimer table, hôte, proximité ou sauvegarde vérifiées pour les remplacer par un meuble visuel.

Les deux PNJ nouveaux ont des vêtements civils adaptés à leur rôle, mais **ANATOMY_REVIEW_REQUIRED** demeure : contrôle détaillé des doigts/griffes, mandibules, attachés des dreads, appuis et rapport d'échelle avant acceptation finale. Chaque PNG ne contient qu'une pose ; aucune marche, prise d'objet, bouche animée ou simulation de dreads n'a été livrée dans ces fichiers. Les glyphes, aliments, tenues, bâtiments et outils sont des créations locales originales, pas une preuve de fidélité canonique 1:1.

Réception finale requise : copie autorisée et SHA recoupées ; vrais landmarks/pivots/collisions ; montage par un consommateur visible ; comportement clavier/tactile/pause/reprise ; capture réellement ouverte avec floor-culling/occlusion/contours et lisibilité des seuils ; conservation des 43 intérieurs/services et absence de gain de mission/rang artificiel. Les gates publics V77 encore manquants sont un sujet séparé de cette livraison de sources.

Mesure source finale enregistrée à 2026-10-03T06:30:09Z. Ce document ne publie aucun contenu et ne certifie aucune nouvelle version de production.

## Montage partiel des sept modules — 2026-10-03

Les treize originaux ont ensuite été copiés avec autorisation par le responsable du projet, via l’installateur sans écrasement. Les treize fichiers publics sont vérifiés par SHA256, longueur, dimensions natives et présence alpha. Les sources et les deux variantes anciennes restent intactes. Le répertoire résolu est `D:/CodexTemp/yautja-la-longue-build-space/v27-public/game/homeworld/v78` ; aucune ACL n’a été changée par cet agent.

Sept modules sont maintenant consommés par le vrai `HomeworldWorldSceneV77`, préchargés par le Hub avec leurs dimensions exactes, ajoutés aux collisions et décrits dans le codex. Ils sont des décors originaux solides, sans nouveau service ni porte interactive :

| Module | Niveau | Pivot monde X/Y | Hauteur de silhouette |
| --- | --- | --- | --- |
| market-stall-right | −1A | 3150 / 2960 | 180 |
| forge-workstation-left | −1A | 3600 / 4630 | 155 |
| archive-shelf-right | −1A | 4150 / 2850 | 180 |
| terrace-retaining-front | −1A | 2990 / 4025 | 190 |
| port-cargo-sorting-cart | 0 | 3500 / 5050 | 115 |
| clan-common-table-left | −1A | 4210 / 4715 | 85 |
| civic-water-cistern-right | −1A | 4840 / 4370 | 145 |

Chaque PNG entier garde son orientation native et une seule échelle uniforme. Les centres d’appui ont été relus sur les vrais pixels, contrôlés au seuil alpha >128 et inscrits dans une enveloppe convexe. La tolérance de relevé déclarée est de 12 pixels : ce n’est pas une calibration 3D, ni une fidélité canonique 1:1. Le solide déprojette cette enveloppe une seule fois avec le `depthScale` réel de 35°, et le rendu reprend exactement le même pivot. Ni les collisions anciennes ni les tailles natives ne sont réduites pour faire passer un placement.

Le compilateur conserve 11 candidats rejetés et accepte 7 modules, aucun non placé. Il protège les réservations, les 52 décors précédents, les huit façades et les quatorze circuits décoratifs. Les tests réels confirment encore les 98 circuits d’origine, les 43 approches de portes et les sept raccords. Le tableau commun est uniquement décoratif ; la table et l’hôte C’ntlip transactionnels restent inchangés.

Six fichiers copiés demeurent volontairement non montés et non préchargés. La maison marchande exige un nouveau lot mesuré compatible avec sa vraie porte adulte et sa fondation ; les huit façades réservées ne sont pas remplacées silencieusement. Le palais doit correspondre à sa véritable entrée et à son intérieur. L’escalier et la rampe ont besoin de paliers peints reliés à un trajet physique continu. Les deux civils ont encore des doutes d’anatomie aux mains/mandibules et aucune planche de marche. Leurs `runtimeIntegration` restent faux, `runtimeSrc` et `nativeLandmarks` restent nuls, malgré une `publicCopySrc` existante.

Validation ciblée : `node --test tests/homeworld-city-native-v78.test.mjs tests/homeworld-urban-v78.test.mjs tests/homeworld-scene-v78.test.mjs` : **18/18 PASS**. Elle décode les vrais PNG avec Sharp, exécute le vrai composant React en SSR et calcule de vrais itinéraires de corps entier depuis le point d’arrivée du port jusqu’à une approche observable des sept modules, sans téléportation. Les requêtes de collision ponctuelles sont aussi contrôlées : une empreinte de taille nulle ne doit pas traverser le solide par dégénérescence SAT.

Ces tests ne certifient ni hydratation, ni pixels finaux, ni occlusion dans le navigateur. Le montage nécessite encore le build global et de nouvelles captures réellement relues au niveau −1A et au port, avec contrôles clavier/tactile, pause/reprise, contours, profondeur et lisibilité. Aucun build, publication ou passage navigateur V78 n’est revendiqué ici. La provenance distingue maintenant exactement les sept consommateurs montés des six fichiers retenus ; elle ne transforme pas une copie réussie en réception visuelle.
