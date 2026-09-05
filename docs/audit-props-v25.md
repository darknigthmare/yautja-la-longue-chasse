# Audit props et modularité V25 — 5 septembre 2026

Périmètre : hub physique, couches de rendu, mobilier V20–V22 et catalogue de props V19. Vérification du dépôt à partir de 94e93a8, puis corrections de composition. Ce document ne certifie ni un jeu commercial complet, ni la fidélité 1:1 des anciennes illustrations. Le lore, les parcours de mission et le livrable PC sont audités séparément.

## État constaté

Le hub contient réellement huit salles, six segments de coursive, deux puits, douze portes et quatre échelles. Ses huit stations sont atteignables par les collisions existantes. Surfaces, panneaux de portes et solides proviennent de shipLevelLayout.ts ; une texture n'ajoute pas d'obstacle. Mobilier et trophées restent en couches distinctes. Les armes exposées proviennent des deux emplacements du chargement, les outils des deux emplacements d'équipement, et les trophées des prises possédées : aucune fausse prise ne remplit une galerie vide.

Ordre vérifié : fond → mobilier → structure → panneaux de portes → stations → chasseur → cadres et nervures proches. Le premier plan ignore les événements pointeur. Les huit stations et le plan conservent activation clavier et suspension.

Les sept modules V21 et les sept modules V22 passent leurs audits techniques : dimensions, empreintes source/master/runtime, pivots, contours alpha et conservation du RGB source. Les WebP totalisent respectivement 1 173 124 et 715 648 octets. La cloison V20 est également réutilisée ; ce total de quatorze n'inclut pas cette cloison.

## Défauts corrigés

| Priorité | Défaut prouvé | Correction |
| --- | --- | --- |
| P1 | Les plateformes et modules d'escalade V19 étaient dimensionnés sur leur image complète avec 24 pixels transparents par bord. La matière visible commençait après la collision ; une échelle dessinée s'arrêtait avant ses extrémités physiques. | environmentPropDrawing.ts exclut seulement cette marge garantie au moment du dessin. Échelle uniforme et collisions inchangées. Bitmaps intacts. |
| P1 | Dans la chasse réelle, le prop vertical mossy-ruin-slab-02 affiché comme plateforme de 450 × 24 devenait une image de 477 × 998 unités : son adaptation à la largeur produisait des colonnes descendant sous le sol. | Hauteur bornée par la collision (96 unités pour cette plateforme, maximum 144), échelle uniforme, répétition horizontale et masque limité à la portée. Une pièce conserve son aspect ; aucun bitmap redessiné. |
| P2 | Chaque coursive ou puits utilisait une seule cloison V20 en slice, recadrée à l'aspect du volume. Dans un puits de 200 × 840, le rythme des panneaux et éclairages différait fortement des coursives. | ShipLevelScene.tsx répète des modules de 480 × 320 ancrés au pont, avec montants/traverses indépendants de 20 unités aux raccords. Le masque du volume limite la dernière pièce. Aucune déformation ni nouvelle collision. |
| P2 | Le chasseur du hub conservait sa pose de saut pendant une chute. | Sélection distincte de jump et fall selon la vitesse verticale ; moteur physique intact. |
| P2 | Un commentaire qualifiait une cellule d'atlas de « certified », alors que le registre prouve seulement son cadrage. | Qualification corrigée en cellule enregistrée, sans certification cinéma. |

Exemple du premier défaut : une plateforme source de 768 pixels affichée sur 1 000 unités de collision recevait environ 29 unités d'air après l'ancien décalage de -4. La correction replace le bord du rectangle peint à -4 unités du contact, sans retirer de matière. Les reliefs irréguliers des racines ou roches demandent toujours un contrôle par placement : un contour alpha rectangulaire n'est pas une collision pixel par pixel.

## Couverture V19 vérifiée

Commande exécutée : node scripts/audit-biome-decor-v19-available.mjs --report tmp/audit-props-v25-v19.json.

464 paires master/runtime inspectées, 464 empreintes uniques de chaque côté, aucune erreur de registre, dimension, marge ou alpha. Runtimes : 41 668 712 octets. Il s'agit d'un contrôle technique de tous les fichiers présents, pas d'une inspection artistique humaine de 464 images.

| Biome | Paires disponibles | Budget restant |
| --- | ---: | ---: |
| Jungle | 100 | 0 |
| Glace | 100 | 0 |
| Volcan | 54 | 46 |
| Marais | 51 | 49 |
| Désert | 42 | 58 |
| Océan | 39 | 61 |
| Fongique | 38 | 62 |
| Ruines | 40 | 60 |
| **Total** | **464** | **336** |

Le catalogue de 800 ressources reste incomplet. Le registre choisit des fichiers disponibles et des familles compatibles, ou conserve un rendu procédural déclaré. Aucune image absente n'est présentée comme terminée.

## Preuves automatisées exécutées

- node --test tests/environment-prop-drawing.test.mjs tests/ship-level-renderer.test.mjs : **22/22 tests**.
- node --test --test-concurrency=1 tests/physical-ship-motion.test.mjs tests/ship-level-integration.test.mjs tests/environment-prop-registry-v19.test.mjs : **45/45 tests**.
- node scripts/audit-ship-interior-v21.mjs : sept modules conformes techniquement.
- node scripts/audit-ship-interior-v22.mjs : sept modules conformes techniquement.
- Audit disponible V19 : **464/464 paires conformes**, catalogue global **464/800**.

Les nouvelles régressions lisent trois vrais WebP V19 : pont d'expédition, échelle de terrain et dalle verticale étroite. Elles vérifient qu'aucun pixel visible n'est retiré par l'exclusion des marges, que le rectangle peint rejoint les repères physiques et que la dalle étroite couvre le rebord avec une profondeur bornée, sans étirement. Le rendu serveur du vrai composant de hub contrôle taille nominale des panneaux, raccords, trophées indépendants et poses montée/descente. Les trajets automatisés conservent les douze portes anti-écrasement à 30, 60 et 144 Hz.

Le lint direct ciblé a réussi après rétablissement de la jonction des dépendances : node node_modules/eslint/bin/eslint.js app/game/ShipLevelScene.tsx app/game/environmentPropDrawing.ts tests/ship-level-renderer.test.mjs tests/environment-prop-drawing.test.mjs. Les quinze ressources du hub (V20 + sept V21 + sept V22) ont également été inspectées visuellement en planches sur fond sombre : pièces indépendantes, sans nouvelle fusion de mobilier et de fond. Le lint et git diff --check ont été réexécutés après le correctif de plateforme et réussissent. Les résultats de compilation globale et de publication sont suivis par l'audit principal, pas revendiqués par ce volet.

## QA navigateur exécutée

Serveur local http://localhost:4318, navigateur Chromium isolé agent-browser, session v25-props, viewport 1280 × 800. Profil utilisateur et sauvegardes personnelles non utilisés. Déplacements effectués par les événements clavier normaux ; aucune téléportation ni modification de santé, collision ou progression.

- Hub : depuis x3500/y1360, marche dans la coursive basse jusqu'au puits est ; ascension réelle jusqu'à y700 ; sortie vers la forge à x3310/y700. Portes, bord du pont et échelle restent raccordés. Les panneaux DOM conservent 480 × 320 ; aucun débordement horizontal de page. Captures inspectées : tmp/v25-props-east-shaft-bottom.png et tmp/v25-props-east-shaft-top.png.
- Chasse : navigation par la console puis la carte jusqu'à Sang dans la canopée, départ rapide. Le module Metroidvania pilote remplace les plateformes de début de la géométrie de base ; le test a donc poursuivi jusqu'au prop V19 réellement présent feature-j-canopy-vine.
- Escalade : accrochage à ce prop depuis le sol y508, puis montée jusqu'à x2311.5000/y161.92, climbZoneId feature-j-canopy-vine, climbing true. La capture tmp/v25-props-jungle-v19-climb.png montre le HUD GRIMPE, l'ancrage sur le tronc et les plateformes corrigées.
- La chasse continue à infliger des dégâts pendant une inspection non mise en pause : une tentative a été perdue ainsi, puis recommencée via Réessayer. Ce n'était pas un blocage de collision ni une altération de la sauvegarde utilisateur.
- Mesure native temporaire de drawImage, restaurée aussitôt : source [24,24,344,720], un module destination [2942.6667,378,45.8667,96] pour mossy-ruin-slab-02. Avant correction, le même prop entier était dessiné en 477 × 998.3721. La capture après correction montre bien la répétition et une silhouette limitée sous le rebord. Relevé conservé dans tmp/v25-props-browser-evidence.json.
- agent-browser errors : aucune erreur JavaScript rapportée à la fin de ce parcours.

Limite précise : une sortie horizontale de la liane a ramené le joueur au sol y624 ; elle n'est pas comptée comme une réception sur la plateforme haute. Le dernier essai du seuil de grotte a retrouvé une nouvelle insertion x225/y508 pendant que les sources étaient encore modifiées en parallèle ; sa cause n'a pas été établie et ce passage n'est pas certifié. Les tests de dessin prouvent l'alignement des rectangles et le parcours joué prouve l'escalade, mais ils ne remplacent pas une validation complète des réceptions de chaque plateforme. Les captures nommées jungle-platform ou jungle-landing lors des premiers essais montrent le sol et ne constituent pas une preuve de réception.

## Travail artistique et produit restant

- Support de trophée dédié, mannequin d'entraînement autonome et console propre au sas restent à produire. Le simulacre actuel associe un prop d'atlas à des indications holographiques ; une nervure structurelle réutilisée ne constitue pas un mannequin modulaire.
- V21/V22 sont des créations de projet. Les audits techniques ne certifient pas leur correspondance 1:1 avec un intérieur cinéma unique, ni la qualité artistique de chaque raccord.
- Les 336 props absents doivent être générés et inspectés individuellement avant disponibilité runtime : silhouette, attaches, matériau, orientation, perspective, marges et lisibilité devant le joueur.
- Les fonds restent des panneaux arrière ; mobilier, trophées et objets interactifs ne doivent pas être fusionnés dans ces illustrations.
- Les conversations ChatGPT et pièces jointes accessibles ne sont pas exhaustives ; aucun comblement intégral du postulat n'est certifié à partir d'extraits tronqués.
- Évaluation commerciale PC, sauvegardes hors ligne, budgets mémoire, manettes et durée de vie relèvent des autres volets. Ce contrôle de props ne constitue pas un label commercial.

## Règle de production

L'utilisateur autorise uniquement le générateur d'images intégré à son forfait. Aucune API d'images, clé API ou génération payante séparée utilisée dans cette passe. Aucune retouche créative de bitmap par script : seules les compositions natives du moteur changent. Sources, jonctions dist/tmp et fichiers graphiques restent inchangés.
