# Biomasks V62 — remplacement et conservation

Quatorze nouveaux PNG transparents natifs OpenAI remplacent les dessins génériques dans les emplacements Jungle Hunter, City Hunter, Scar, Celtic, Chopper, Wolf, Feral, Boar, Snake, Falconer, Berserker, Fugitive, Dek et Enforcer. Les identifiants de sauvegarde de ces emplacements restent inchangés. La vignette, l’armurerie, le mausolée et le personnage utilisent les mêmes fichiers V62 ; Boar et Snake ne retombent plus sur City Hunter et Falconer ne retombe plus sur Berserker.

Les images sont copiées sans redimensionnement, détourage algorithmique ni modification des pixels générés. Les mesures alpha définissent uniquement le placement de l’image entière dans le rendu 256 × 384. Feral conserve un bas ouvert pour les mandibules du personnage ; la haute crête d’Enforcer reçoit un placement distinct. La première proposition Scar regardait à gauche : elle est conservée en QA, et une seconde génération corrige l’orientation.

## Audit des quinze anciens emplacements

| Emplacement | Écart constaté dans l’ancien dessin | Traitement V62 |
| --- | --- | --- |
| Jungle Hunter | Coque allongée générique, bijou rouge central inventé | Coque argent simple, cerclage ovale et trois capteurs guidés par Sideshow/NECA |
| City Hunter | Coque géométrique trop allongée | Bronze/cuivre martelé, front ovale et museau court guidés par NECA |
| Celtic | Entrelacs celtiques inventés | Dôme uni, joues circulaires et respirateur nervuré guidés par Hot Toys |
| Scar | Variante générique avec marque rouge | Coque simple et marque gravée guidées par la réplique Sideshow |
| Chopper | Coque pointue générique | Trois nervures latérales et front structuré de la réplique Sideshow |
| Wolf | Coque bronze abîmée générique | Bord crénelé et gravures du modèle Sideshow/Hot Toys |
| Feral | Crâne générique ; étude V14 dotée d’une mâchoire vivante inventée | Masque osseux supérieur, sans mâchoire vivante intégrée, guidé par NECA |
| Boar | Museau étiré et matériau imprécis | Front à arches superposées et museau court guidés par NECA |
| Snake | Ornement fantaisiste sans contrôle des détails | Ornement et nervures de la tête masquée de la figurine officielle NECA |
| Falconer | Coin facial générique avec appareil cervical ajouté | Dôme ovale, contours oculaires argentés et longues rainures de Hot Toys |
| Berserker | Coque nervurée rougeâtre sans trophée de mâchoire | Coque sombre et mâchoire-trophée osseuse guidées par Prime 1/Sideshow |
| Fugitive | Segments hexagonaux génériques | Coque noire, encoche supérieure et incrustations dorées guidées par NECA |
| Dek | Coque verte générique | Biomask de l’armure d’entraînement, bande centrale dorée, guidé par NECA |
| Enforcer | Coque ivoire/stries noires sans grande crête | Haute lame centrale et joues de l’interprétation NECA du comic |
| Elder | Ornement de haut rang inventé, sans attribution précise | Conservé et nommé « Couronne des Ancêtres » ; création originale explicitement non attribuée à Greyback |

## Anciens dessins, jamais supprimés

Les douze coques V3 et leurs douze versions enregistrées pour le rig, ainsi que les quatre cutouts V14, restent byte-identiques : 28 fichiers et leurs SHA-256 sont recensés dans `biomask-generation-receipts.json`. Les fichiers historiques ne sont pas physiquement renommés, afin de préserver les liens existants ; les noms visibles et identifiants d’équipement des créations originales sont distincts.

Onze originaux V3 sont équipables sous les nouveaux identifiants `clan-*` : Voile d’argent, Cuivre des Remparts, Entrelacs de la Forge, Os gravé, Cendre balafrée, Arête d’acier, Veilleur des Cendres, Carapace sombre, Filigrane de cuivre, Patine des Dunes et Gardien d’ivoire. Couronne des Ancêtres conserve l’identifiant `elder`. Les quatre anciennes études V14 sont conservées dans la galerie comme Crâne du Ravin, Front des Remparts, Insigne du Guetteur et Aile de Forge. Ces noms sont des créations françaises du projet, pas des noms canoniques ni des traductions prétendues de langue yautja.

## Fidélité et limites

Il s’agit de recréations guidées par des photographies officielles de produits licenciés, pas d’une certification 1:1. Les volumes principaux ont été comparés visuellement, mais les microgravures, l’usure, les reflets, les joints et le nombre exact de petites dents ou stries peuvent différer. La rotation en trois quarts est une adaptation au personnage modulaire. Certains clichés ne montrent qu’un côté ; les détails cachés sont donc interprétés. Le haut de Falconer est partiellement recadré dans le cliché Hot Toys et a dû être complété. Le relief crénelé de Wolf et l’usure de plusieurs masques restent plus marqués que certains plans des films. Le symbole de Scar est une approximation de la marque visible, pas un relevé graphique exact.

Boar, Snake, Dek (armure d’entraînement) et Enforcer sont explicitement rattachés à la version officielle NECA consultée ; cela n’affirme pas que chaque détail de cette figurine apparaisse dans tous les plans du film ou dans chaque planche du comic. Aucun biomask arbitraire n’est attribué à un personnage dont la référence consultée ne le fournit pas. Les droits de publication commerciale de Predator/AVP et des designs licenciés ne sont pas accordés par cette génération.

## Sources primaires

- [Jungle Hunter — NECA](https://store.necaonline.com/products/predator-ultimate-jungle-hunter-7-scale-action-figure) et [réplique Sideshow](https://www.sideshow.com/collectibles/predator-predator-mask-sideshow-collectibles-400151/).
- [City Hunter — NECA](https://store.necaonline.com/products/predator-7-scale-action-figure-ultimate-city-hunter).
- [Celtic — Hot Toys/Sideshow](https://www.sideshow.com/collectibles/alien-vs-predator-celtic-predator-hot-toys-902117).
- [Chopper, Celtic, Wolf et Scar — photographie officielle Sideshow des répliques](https://www.flickr.com/photos/sideshowcollectibles/3287611145).
- [Wolf — Hot Toys/Sideshow](https://www.sideshow.com/collectibles/aliens-vs-predator-requiem-wolf-predator-heavy-weaponry-hot-toys-903149).
- [Feral — NECA](https://necaonline.com/2023/05/prey-7-scale-action-figure-ultimate-feral-predator/).
- [Boar — NECA](https://necaonline.com/2022/05/predator-2-7-scale-action-figure-ultimate-boar-predator/) et [Snake — NECA](https://necaonline.com/2022/07/predator-2-7-scale-action-figure-ultimate-snake/).
- [Falconer — Hot Toys Japon](https://www.hottoys.jp/item/view/100001625).
- [Berserker — Prime 1/Sideshow](https://www.sideshow.com/collectibles/predator-berserker-predator-prime-1-studio-912621).
- [Fugitive — NECA](https://necaonline.com/2018/06/predator-2018-7-scale-action-figure-ultimate-predator/).
- [Dek — NECA](https://store.necaonline.com/products/predator-badlands-ultimate-dek-training-armor-7-inch-scale-action-figure).
- [Enforcer — NECA](https://store.necaonline.com/blogs/behind-the-scenes/closer-look-enforcer-predator-action-figure-from-series-12).

## Vérification

Les tests ciblés `biomasks-v62`, `hunter-kit-v14`, `hunter-lore` et `save-v2` passent : 46 tests. Ils contrôlent notamment les 14 PNG uniques, leurs empreintes, leur alpha natif, les placements sans étirement, les 28 anciens fichiers inchangés et l’aller-retour de sauvegarde des 26 choix de masque. L’audit `scripts/audit-hunter-kit-assets.mjs` et ESLint sur les fichiers du chantier passent.

La suite `v6-visuals` passe également : 7 tests, dont l’inventaire des 26 clés et les 11 correspondances explicites des créations conservées. Les masques de la forge privilégient leur image propre ; ces correspondances V6 restent disponibles pour la compatibilité des consommateurs historiques.

La recette Chrome réelle sur `http://127.0.0.1:4182` passe : 26 masques sélectionnés dans la forge, 14 images natives équipées sans atlas V6 substitué, 14 retraits/remises, persistance après rechargement de Jungle Hunter et de Voile d’argent, 14 nouveaux modèles et 4 anciennes études présents dans les galeries d’armurerie. Aucune erreur JavaScript ni requête d’asset en échec. Rapport : `docs/v62-biomask-browser-qa.json`. Captures : `work-local/v62/qa/masks/browser`. Le contrôle visuel séparé du chantier principal comporte 68 compositions de têtes/masques/poses, recensées dans `docs/v62-head-composition-qa.json` ; la mission Canvas fait l’objet de sa propre recette.

Les prompts complets, les références exactes, les sorties natives, les empreintes et la transparence mesurée sont dans `biomask-generation-receipts.json`.
