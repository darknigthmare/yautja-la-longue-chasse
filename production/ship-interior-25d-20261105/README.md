# Intérieur du vaisseau personnel en 2,5D — état du 5 novembre 2026

## État du lot publié

La version **1.6.0** transforme le vaisseau personnel en huit salles parcourables sur deux ponts. Le code, les sept nouvelles ressources, leurs sources et leur provenance sont publiés dans la [PR 115](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/115), au commit **`86f593bad2c7d00259dc4cf0a7d1ad40eac1d719`**, arbre `21052551ce3b80c57f70a8695a86d601e87e5e20`.

**La qualification de livraison complète est maintenant réussie sur `5f9dd187a52575719cada89bb184c03bcfe14bc1`** : [run 42020235758](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/42020235758), contrôle officiel de l’inventaire, lint strict, **14/14 tests unitaires**, build/TypeScript et **17/17 contrôles navigateur**, sans erreur ni ressource manquante. Le [reçu final de livraison](verification/release-validation.json) et son [extrait de journal](verification/release-ci-excerpt.log) conservent les preuves. Le code applicatif et les images sont strictement identiques à la révision 86f dont les 14 captures ont été inspectées ; les reprises de base suivantes ne changent que les recettes générales et les documents.

**La troisième recette de CI est réussie : 14/14 tests unitaires et 17/17 contrôles navigateur, sans ressource manquante ni erreur de console ou de page. La fidélité artistique et canonique 1:1 reste ouverte.** Les sept images sont générées et reliées à la scène. Le contrôle artistique technique demeure partiel pour les perspectives et les pivots précis. Les 14 captures finales ont été inspectées par les agents après récupération de l’archive ; toutes les ressources conservent `humanArtValidation: false`.

La PR 115 reste proposée en revue sur la base 114. La révision historique `1951e17` a terminé avec **14 workflows réussis sur 17** : Dev, Wolf et Spatial ont échoué dans trois parcours distincts du nouvel intérieur. La base a depuis reçu le suivi QA **`8cee6ec4`**, repris ici : il corrige le périmètre du dialogue de briefing et l’acquisition finale du trio, et observe les clics natifs du retour Wolf. Ses résultats doivent être lus sur la [PR 114](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/114) ; l’ancien bilan 14/17 ne décrit pas cette nouvelle révision. Le suivi supplémentaire `94b5e0f156c8eff9cbbc03bcf2088d3b96db03ea` est également repris : deux recettes et leurs preuves, sans changement applicatif. L’[audit de la base et de sa synchronisation](verification/parent-base-audit.md) précise les causes et les limites. La réussite du nouvel intérieur ne vaut pas approbation de fusion globale.

Le [catalogue JSON](catalogue.json) suit **23 actions, 8 salles, 13 ressources et 17 critères QA**. Il fournit les tailles recalibrées, les positions d’approche, les 16 seuils et les références des preuves déjà observées. Ce README et ce catalogue constituent une mise à jour documentaire séparée du commit de code et d’images indiqué ci-dessus.

## Continuité de la reprise

Le travail a commencé sur la [PR 114](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/114), commit `4a0b8d58cdfadf642d6c897c32980b7a8586f4dd`, arbre `9b64f036ca97247ef7a131566705df7e1c472325`. Sa mise à jour `1951e17f01f1951d7c961b4ed3938741966e3007`, arbre `4f6b3e4a785951286efbf0deafa29b843df40150`, a ensuite été fusionnée dans ce lot.

Le commit publié possède les deux parents `0e374e16976b4634830459c6fc27e9b6c14c9c21` et `1951e17f01f1951d7c961b4ed3938741966e3007`. Les arrivées planétaires, la triade, les reçus de départ et la réserve énergétique du camouflage sont conservés. Le Clan Ship demeure un lieu distinct : sa conversion complète n’est pas revendiquée par ce lot.

La synchronisation suivante reprend `8cee6ec4d7a1334ffd74af6eb9b29b161f561b15`, arbre `4867642315ea924f4c6f1037aa8e253d6e86b776`. Elle ajoute seulement les trois recettes générales et les cinq fichiers de preuves de la base, avec conservation des adaptations du parcours Dev au nouvel intérieur. Les sources applicatives, les sept images et la recette dédiée du vaisseau restent ceux du commit testé `86f593ba`. Les résultats 14/14 et 17/17 demeurent attachés à ce commit précis.

## Huit salles, deux ponts et des passages explicites

Chaque salle utilise un sol de **1 200 × 800 unités physiques**. La projection orthographique à **35 degrés** réutilise les fonctions de Homeworld. Le personnage et les équipements gardent une position au sol ; leur ordre d’affichage suit la profondeur. La limite visible d’une image et son empreinte de collision sont des données distinctes.

| Salle | Identifiant conservé | Pont | Approche X, Y | Salles voisines |
| --- | --- | --- | --- | --- |
| Passerelle de navigation | `galaxy-map` | Supérieur | 600, 395 | Armurerie ; Galerie des trophées (autre pont) |
| Armurerie | `wall-armory` | Supérieur | 590, 355 | Passerelle de navigation ; Archives du chasseur |
| Archives du chasseur | `clan-archives` | Supérieur | 650, 355 | Armurerie ; Forge des parures |
| Forge des parures | `appearance-forge` | Supérieur | 600, 385 | Archives du chasseur ; Sas de chasse (autre pont) |
| Galerie des trophées | `trophy-hall` | Inférieur | 600, 405 | Baie médicale ; Passerelle de navigation (autre pont) |
| Baie médicale | `medical-bay` | Inférieur | 600, 395 | Galerie des trophées ; Cercle d’entraînement |
| Cercle d’entraînement | `training-arena` | Inférieur | 950, 375 | Baie médicale ; Sas de chasse |
| Sas de chasse | `launch-airlock` | Inférieur | 850, 395 | Cercle d’entraînement ; Forge des parures (autre pont) |

Six passages de coursive et deux liaisons entre les ponts produisent **16 seuils directionnels appariés**. La liaison avant relie la passerelle aux trophées ; la liaison arrière relie la forge au sas. Le plan guide réellement le chasseur jusqu’à une porte. Chaque changement de salle exige ensuite une interaction explicite et place le personnage en un point libre, hors du déclencheur de retour.

La marche libre accepte deux axes et des diagonales normalisées. Le personnage occupe une empreinte de **48 × 28 unités** et une vitesse de référence de **260 unités par seconde**. Les segments sont contrôlés pour éviter la traversée d’un meuble ; les reprises après une trame longue restent bornées. Le chemin au clic contourne les solides. Un service demande une vraie proximité de son point d’approche, dans la salle correspondante.

Sources : [géométrie et contrôleur](../../app/game/systems/shipInterior25d.ts), [scène](../../app/game/ShipInterior25D.tsx), [tests de géométrie](../../tests/ship-interior-25d.test.mjs).

## Échelle des meubles et points d’approche

Les dimensions ont été recalibrées par rapport au chasseur. Toutes les répétitions d’un même modèle utilisent la même taille et la même empreinte. Les valeurs « image » ci-dessous sont les dimensions déclarées pour le placement ; elles ne constituent pas une mesure anthropométrique validée humainement.

| Modèle | Image : largeur × hauteur | Empreinte au sol : largeur × profondeur | Occurrences |
| --- | ---: | ---: | ---: |
| `navigationConsole` | 250 × 138 | 220 × 85 | 3 |
| `medbayBed` | 225 × 120 | 205 × 70 | 1 |
| `armoryRack` | 370 × 196 | 340 × 65 | 3 |
| `trophyPlinth` | 190 × 140 | 160 × 80 | 3 |
| `forgeStation` | 225 × 280 | 170 × 95 | 2 |
| `trainingEmitter` | 170 × 210 | 100 × 75 | 1 |
| `archiveTerminal` | 125 × 230 | 80 × 55 | 4 |

La console et le lit ont été réduits, leurs empreintes ajustées et les points de service rapprochés du mobilier. Les anciennes coordonnées d’approche ne doivent pas être réutilisées : celles du tableau des salles et du catalogue correspondent au code publié. Les 14 captures finales ont été inspectées après le rétablissement de l’environnement : les contacts et les superpositions sont plausibles aux positions observées, sans sprite tronqué ni fond opaque parasite. Les perspectives exactes, les pivots et l’équilibre visuel restent à comparer à des références précises.

Les [inspections de préparation](../../app/game/systems/shipPreparationV88.ts) reçoivent une observation discriminée `space: 'ship-ground-v1'`, avec salle, service et position physique. Les coordonnées historiques ne peuvent pas servir de preuve à la place de la vraie position dans cette scène. Le contrat historique et ses reçus restent compatibles. L’interface conserve le personnage équipé et suspend son mouvement pendant la consultation d’un service.

## Sept ressources individuelles livrées

Le [manifeste artistique](art/assets.json) conserve les prompts, références, dimensions, mesures alpha, pivots et empreintes des fichiers. La [provenance](art/PROVENANCE.md) décrit leur production et ses limites.

| Ressource | Fichier sous `public/game/ship-interior/` | Dimensions source | Octets runtime |
| --- | --- | ---: | ---: |
| Console personnelle de navigation | `v23/navigation-console.webp` | 1536 × 1024 | 1 326 022 |
| Table de soin | `v23/medbay-bed.webp` | 1774 × 887 | 956 502 |
| Râtelier d’armurerie | `v23/armory-rack.webp` | 1536 × 1024 | 1 472 372 |
| Atelier de parures | `v23/forge-station.webp` | 1024 × 1536 | 1 445 088 |
| Socle de trophée | `v23/trophy-plinth.webp` | 1536 × 1024 | 766 328 |
| Émetteur d’entraînement | `v23/training-emitter.webp` | 1024 × 1536 | 671 344 |
| Panneau de sol projeté une seule fois | `v23/floor-panel.png` | 1254 × 1254 | 2 849 410 |

Les sept fichiers runtime représentent **9 487 066 octets**. Les six équipements utilisent un WebP sans perte. Le sol emploie directement le **PNG original**, identique octet pour octet à sa source. Il a été récupéré depuis le résultat de génération après l’interruption de l’environnement de travail ; aucune régénération ou altération de l’image n’a été nécessaire.

Ce PNG de sol est opaque et vu du dessus. La scène applique une seule projection au sol. Sa répétition parfaite sur des bords opposés n’a pas été vérifiée mathématiquement. Les six images d’équipements ne comportent aucun pixel visible au bord au seuil alpha > 8. Leurs pivots sont calculés au milieu du bas de la silhouette visible ; le contact physique exact au sol reste à qualifier.

Le terminal d’archives, les encadrements, les trois familles de parois et la bordure de pont V21/V22 sont réemployés. Ces six ressources historiques complètent les sept nouvelles entrées du suivi. Les quatre états restent indépendants :

1. **Génération** : le fichier existe et possède une provenance.
2. **Intégration** : le rendu référence effectivement ce fichier.
3. **Contrôle technique** : alpha, cadrage, pivot, échelle, contact, occlusion et lisibilité sont vérifiés dans leur contexte.
4. **Revue humaine 1:1** : une décision est documentée après comparaison à une référence identifiée.

Les sept nouvelles entrées sont **générées et intégrées**, leur contrôle technique est **partiel**, et leur revue humaine reste **ouverte**. La console et le rack demeurent assez frontaux ; le lit montre une vue plus oblique. Le socle de trophée et l’émetteur sont des adaptations de jeu sans plan canonique exact fourni. Une génération visuellement proche ne clôt pas cette revue.

## Vérifications exécutées et limites des preuves

| Vérification | Résultat connu | Portée |
| --- | --- | --- |
| Ensemble ciblé initial | **150 réussis, 0 échec**, neuf fichiers | Code avant intégration artistique finale |
| Routes et chargement différé | **18 réussis, 0 échec**, deux fichiers | Complète l’ensemble précédent sans doublon |
| Total distinct du checkpoint initial | **168 tests, 11 fichiers** | Les 34 tests ci-dessous sont déjà inclus |
| Géométrie, prévol et sauvegarde après tous les recalibrages | **34/34 réussis**, trois suites | Dernier contrôle local confirmé par l’intégrateur |
| ESLint strict après les derniers réglages | **0 avertissement** | Six sources et recettes contrôlées |
| Constructions de production antérieures | Réussies | Ne qualifient pas seules les sept ressources finales |
| Tests unitaires de CI3 | **14/14 réussis** : 11 géométrie + 3 chargement différé | Commit publié avec les sept ressources |
| Lint, construction et TypeScript de CI3 | **Réussis** | Même commit publié |
| Parcours navigateur de CI3 | **17/17 contrôles réussis**, 0 échec, 0 ressource manquante | Recette native du nouvel intérieur ; aucune erreur console/page |

Les 14 tests unitaires de CI3, les 34 tests locaux rejoués et les 168 tests distincts du socle initial sont des ensembles de portée différente, avec des recouvrements : **ils ne sont pas additionnés**. Les journaux locaux des ensembles 150/18/34 n’ont pas été récupérés après l’interruption et ne sont pas publiés ici. Leur résultat observé reste consigné comme historique. Les preuves durables de la qualification finale sont le [reçu du runtime](verification/final-runtime-validation.json), l’[extrait de CI](verification/final-ci-excerpt.log) et les liens GitHub ci-dessous.

### Première recette navigateur

Le [run 42009181765](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/42009181765), commit `5d50b0a812d579ed1ef27519ae69484de85b6022`, a validé le chargement du vrai vaisseau et la conservation de la campagne. Il s’est ensuite arrêté parce que la recette attendait que le pivot du personnage, volontairement de taille 0 × 0, devienne visible. La marche et l’arrêt avaient pourtant été observés.

L’attente a été corrigée pour vérifier le rig visible et la présence du pivot. Le favicon manquant a été ajouté au checkout sparse. Aucun pageerror n’était signalé. Cette exécution ne constitue pas une recette complète réussie.

### Deuxième recette navigateur

Le [run 42010453420](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/42010453420), commit `0e374e16976b4634830459c6fc27e9b6c14c9c21`, a validé cinq contrôles natifs :

1. Chargement du véritable vaisseau et conservation de la campagne.
2. Marche clavier sur les deux axes, projection de profondeur et arrêt après relâchement.
3. Collision réelle avec la console et atténuation lorsqu’elle masque le chasseur.
4. Clic au sol produisant un chemin autour du mobilier solide.
5. Ouverture du service de navigation et retour à la position exacte.

Il s’est arrêté après le changement d’arme dans l’armurerie, lors du décodage de deux sprites absents du checkout sparse : `equipment/registered/blade-housing.webp` et `equipment/registered/blades.webp`. Les deux fichiers ont été ajoutés au périmètre de checkout. Aucun pageerror n’était signalé.

Cette deuxième preuve reste partielle et précède les sept images finales. Les autres salles, les services médical et entraînement, les liaisons et le mobile ont ensuite été couverts par la troisième recette. La manette matérielle n’a pas été mesurée. La [recette dédiée](../../scripts/qa-ship-interior-25d.mjs) utilise de vraies marches, des seuils atteints et une confirmation d’interaction.

### Troisième recette : réussie sur le lot artistique final

Le [run 42013765672](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/42013765672), job **127199019545**, s’est terminé avec la conclusion **success** sur le commit `86f593bad2c7d00259dc4cf0a7d1ad40eac1d719`, arbre `21052551ce3b80c57f70a8695a86d601e87e5e20`.

Les **14 tests unitaires** sont réussis, ainsi que le lint, la construction de production Next et TypeScript. Les **17 contrôles navigateur** sont réussis. Le parcours couvre les huit salles et leurs huit services, le retour à la position exacte, les deux liaisons entre ponts dans les deux sens, la marche X/Y et la projection, la collision et l’occlusion, le trajet au clic autour d’un meuble, les largeurs mobiles 390 et 320 pixels avec glissement tactile, F8, le rechargement et la protection du stockage de campagne. Le résultat final indique **0 ressource manquante, 0 erreur console et 0 pageerror**.

L’archive **13408631794** contient **18 fichiers**, pour **28 133 732 octets**, avec le SHA256 `79efaea2a7a0fe3f8c2fc8800089eca38ad5f587de0e90b45421498e9a2a09d5`. Les captures finales y sont conservées. Après le rétablissement de l’environnement, l’archive a été récupérée, son SHA256 vérifié et **ses 14 PNG ont été ouverts et inspectés par les agents**. Le rapport JSON natif confirme directement les 17 succès et les listes vides d’erreurs. Le [reçu de revue visuelle](verification/final-visual-review.json) conserve les empreintes des captures et les observations. Cette inspection ne constitue pas une approbation artistique humaine 1:1. La qualification d’une manette physique reste également ouverte.

### Observations de la revue visuelle

La passerelle, la baie médicale, l’armurerie, les cinq autres salles, les vues de collision/occlusion et les deux captures mobiles ont été ouvertes. Les sprites conservent leurs volumes, les pieds et bases rejoignent visuellement le sol, et aucun halo bleu ni rectangle opaque parasite n’a été observé. La vue mobile garde une caméra rapprochée et des commandes accessibles par défilement vertical.

La console et le râtelier restent assez frontaux. Le chasseur masque partiellement le centre des postes lorsqu’il est au point d’usage ; l’émetteur est particulièrement occulté. La forge se lit comme une machine haute. Les trois socles de la galerie sont vides dans cette scène de test. Les passages latéraux gardent des zones translucides et ne constituent pas encore des ouvertures architecturales finies. Ces observations sont des limites de lisibilité et de finition à reprendre, sans défaut bloquant constaté dans les captures examinées.

## Inventaire courant de contrôle V94

Le contrôle de livraison a révélé que l’inventaire courant ne recensait pas encore les quatre nouveaux modules et conservait cinq anciennes empreintes. Le workflow dédié matérialise désormais **toutes les entrées natives** du registre, puis exécute le générateur officiel après installation des dépendances. Il écrit une copie dans les preuves et lance le contrôle strict du fichier canonique.

Le [run 42019629253](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/42019629253), sur `9fc54afe684cd0f404f2a04bd58236640ee072fa`, a produit **2 171 entrées**, contre 2 167 auparavant : quatre ajouts, aucune suppression et cinq empreintes actualisées. La sortie de **403 483 octets**, SHA256 `043ea4a9f7c431df625f826b818efdca73d24e79cbc19a35e87e76ff8974e4c9`, est intégrée **sans modification de ses octets**. Les inventaires historiques gelés restent intacts.

Ce premier passage s’est arrêté au contrôle du canonique obsolète, après production de la copie ; ses étapes de lint, tests, build et navigateur n’ont pas été exécutées. Le [reçu de génération et de vérification](verification/runtime-inventory-refresh.json) et le [delta exact](verification/runtime-inventory-delta.json) distinguent cette extraction de la recette de jeu. **Le passage suivant 42020235758 est entièrement réussi sur 5f9dd18** : vérification du registre canonique, lint, 14 tests unitaires, build/TypeScript et 17 contrôles navigateur. Son [artefact final 13411571937](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/42020235758/artifacts/13411571937) mesure 28 138 263 octets ; le SHA256 annoncé par l’upload et par les métadonnées est `f3bdffd210f60633d69e091f0e2e833605b7ab4707fb1c28648e21464cdd4b96`.

## Travail encore ouvert

| Point | Étape suivante |
| --- | --- |
| Revue artistique du résultat | Confronter les références aux 14 captures désormais inspectées ; la recette automatique 17/17 et l’examen visuel par les agents sont enregistrés |
| Mobilier et sol | Revoir humainement pieds, pivots, perspectives et échelles des sept ressources ; l’occlusion automatique est vérifiée |
| Manette | Mesurer le comportement sur une manette matérielle |
| Clan Ship | Adapter sa projection réelle et ses sept décors au même contrat de sol |
| Persistance de position | Enregistrer durablement salle et position ; le rechargement revient actuellement à la passerelle |
| Liaisons | Ajouter les animations de franchissement et de déplacement entre les ponts |
| Fidélité 1:1 | Retenir des références précises et consigner la revue humaine par ressource |

## Suivi documentaire et état du classeur

Le catalogue JSON constitue le suivi actuel : **23 actions**, **8 salles**, **17 meubles**, **16 seuils**, **13 ressources**, **17 critères QA** et **17 références**. Les états d’implémentation et de validation sont séparés. Les dimensions et liaisons ont été reconstruites à partir des lectures exactes du code, puis comparées aux fichiers effectivement publiés au commit indiqué : **17 meubles, 8 approches, 16 seuils et 7 ensembles de mesures artistiques concordent**. Le code publié, le manifeste artistique et les reçus de CI demeurent les sources de référence.

Le [classeur final V1.6](yautja-interieur-25d-v1.6.0.xlsx) est désormais exporté avec **Suivi, Salles, Ressources et QA**. Il reprend 23 actions, 8 salles, 13 ressources et 17 critères, avec les 16 seuils et les références détaillées. Sa taille est de **25 233 octets** et son SHA256 vaut `3aeda622cdeb39b24c04f925fb32270acdb9f913750e90e99633aa90caf396b4`.

Les **19 formules bornées** ont été recalculées. Quatre variations de statuts donnent les résultats attendus, puis les données ont été restaurées. Aucun défaut de formule n’a été détecté. Le fichier possède huit tableaux filtrables, sept plages de statuts éditables et des volets figés sur les quatre feuilles. Neuf aperçus ont été inspectés, puis la structure XML du XLSX a été relue. Aucun passage dans Excel natif n’est revendiqué.

Le [générateur du classeur](build-workbook.mjs) utilise `@oai/artifact-tool`. Le [rapport de vérification](verification/workbook-verification.json) donne ses empreintes et contrôles. Le [snapshot exact du catalogue utilisé pour l’export](verification/workbook-input.json) permet de retrouver les données d’entrée ; le catalogue courant ajoute ensuite les métadonnées de livraison et les nouveaux reçus de contrôle. L’ancien classeur partiel à trois images n’est pas fourni.

Pour le reconstruire dans le runtime primaire, appeler le générateur avec le chemin absolu du snapshot JSON et un dossier de sortie absolu, en utilisant `CODEX_PRIMARY_RUNTIME_NODE` et le module `@oai/artifact-tool` du runtime. Les quatre onglets conservent séparément les états de génération, intégration, contrôle technique et revue humaine.

La recette automatique du nouvel intérieur est réussie pour cette révision, et les 14 captures finales ont été inspectées par les agents. L’évaluation sur manette matérielle et la comparaison artistique humaine 1:1 restent ouvertes.
