# V55 — Lot complet des raccordements de stages du roster livré

## Périmètre

La demande porte sur les stages encore non raccordés dans l'inventaire local. Le lot ajoute 23 compositions (139–161) aux 138 existantes et produit une décision explicite pour les 195 identités sélectionnables. Les variantes d'apparence ne sont pas comptées comme de nouveaux lieux. Les conversations privées ChatGPT non récupérées ne sont pas supposées lues.

Les associations distinguent huit liens personnage/lieu documentés, 102 cadres d'œuvre et 85 expositions originales. Ces dernières donnent un terrain jouable adapté au portrait fourni ; elles ne prétendent pas résoudre une origine ou une biographie canonique. Le niveau de preuve reste visible dans la sélection. Les liens individuels aux romans, les alias Sister Midnight, Hook et Elder Tartarus sont notamment limités. Les recherches complètes sont conservées dans les deux registres `v55-stage-references-*.json`.

## Décors créés

| Numéros | Cadres |
| --- | --- |
| 139–144 | Gotham, Pine Barrens, toundra de Theta, ruelle Dead End, Nouveau-Mexique, Riverdale |
| 145–147 | LV-1201 AVP2, ruines Primal Hunt, LV-742 Extinction |
| 148–153 | LV-223, New York 1989, métro de Skinner, Canada, Wakanda, Skyliner |
| 154–159 | Tartarus, Mega-City One, raid Sinestro sur Terre, prison vivante Mindhunter, charter spatial, Alaska |
| 160–161 | Habitat UMF12 de Rage War, failles LV-363 de Rift War |

Les notices d'éditeur/licencié et l'entretien de l'auteur attestent les cadres décrits ; ils ne fournissent pas tous des plans visuels complets. Les compositions, géométries et accessoires restent des adaptations originales de jeu. Aucune fidélité 1:1 à une case, une capture ou une architecture canonique n'est certifiée. Dead End est identifié comme fan-film ; les deux romans ont leur filtre propre.

## Modularité réelle

Les 35 PNG natifs OpenAI comprennent 23 fonds P0, six sols P4 et six modules P2/P3 transparents. Le jeu assemble six plans P0–P5 avec une bibliothèque partagée explicitement déclarée. Le nombre d'instances ne doit pas être présenté comme un nombre d'images nouvellement générées.

Trois nouvelles familles évitent les réemplois incohérents : géologie nue pour les terrains minéraux, panneaux/banquettes civils pour les coursives, nervures/conduits organiques pour la prison vivante. Les sols comprennent pavement neutre, terre minérale, terre forestière, glace, métal et chitinisation organique. Les sols correctifs de terre forestière, glace et métal éliminent les bandes noires et encoches transparentes décelées en cadrage large. Les autres familles réutilisent les images déjà contrôlées du projet. Les nouveaux props ont un appui mesuré sur leur alpha, sans altération des PNG et sans modifier les collisions ou les replays. Les branches et câbles suspendus restent raccordés au bord supérieur même lorsque la caméra recule.

Les sorties OpenAI sont copiées octet pour octet. Les prompts exacts sont dans `v55-openai-prompts.json`, les reçus et empreintes dans `art-source/v55/pit-stages/source-records.json`. Les 138 anciennes compositions restent inchangées.

## Qualification

Les 23 scènes sont assemblées puis activées après 184 cadrages renderer contrôlés (huit par scène). Les 69 captures centre, large et limite gauche ont été inspectées : revue et digests exacts figurent dans `v55-stage-composition-visual-review.json`. Les 15 tests du pipeline V55 passent, ainsi que les onze contrats de personnages et scènes V54. Les gardes contrôlent le sol sur toute sa hauteur, sa couverture réelle sous la ligne d’appui et le raccord des éléments suspendus au cadre.

L’audit complet du catalogue après activation est PASS : 161 arènes actives, 472 PNG uniques vérifiés et 1 583 sous-plans spécifiés. Les 138 compositions historiques ont aussi été comparées au manifeste du HEAD Git antérieur et sont identiques. Rapport local complet : `work-local/v55/production-audit.json`.

Cette qualification du renderer a ensuite été complétée par une recette réelle sur V56 : 59 contrôles réussis, les 23 aperçus, trois cadrages mobiles et huit duels couvrant huit profils distincts. Les 198 icônes actuelles sont parcourues (195 historiques et trois ajouts V56), sans prétendre avoir joué chaque identité. Une première exécution s'était arrêtée au chargement du duel 153 ; la reprise complète passe sans modification du code ni allongement du délai. L'échec initial reste conservé. Rapports détaillés : `v56-stage-browser-qa.json`, `v56-stage-browser-visual-review.json` et `v56-stage-browser-delivery.md`. Compilation, paquet PC et publication restent des validations séparées.

La recette de l’application a ensuite été exécutée sur V56 avec ses trois identités supplémentaires : elle passe les 23 aperçus et huit duels représentatifs. Ses preuves sont isolées dans `v56-stage-browser-delivery.md` et `v56-stage-browser-qa.json` ; cette extension ne modifie pas les 195 associations historiques de la phase V55.

## Limites conservées

Ce lot ferme les raccordements jouables du roster local et produit les nouveaux cadres distincts documentés. Il ne ferme pas la recherche canonique des 85 expositions originales ni la certification visuelle 1:1. Il n'ajoute pas 195 décors uniques ni des animations de foule à chacun des 23 nouveaux stages. Les autres chantiers (movesets complets, scènes vivantes supplémentaires, voix/musiques, suite du prologue, intérieurs/campagne adulte Homeworld) restent distincts de cette livraison.
