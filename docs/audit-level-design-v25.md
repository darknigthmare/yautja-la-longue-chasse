# Audit level design V25 — huit chasses

Base inspectée : 94e93a8. Ce lot corrige le terrain réellement utilisé par HuntCanvas, les appareils d'exploration et la carte locale. Il ne certifie pas un metroidvania commercial terminé, une durée de campagne ni un parcours humain intégral. Le hub, la distribution PC, le combat THE PIT et les objectifs de maîtrise sont traités par les autres lots coordonnés.

## Défauts reproduits et corrigés

| Priorité | Défaut prouvé sur la base | Correction jouable |
| --- | --- | --- |
| P1 | Les six coffres de biome possédaient un vide sous le pont, créé uniquement après l'ouverture de la porte. Un saut suivi d'une impulsion depuis le chemin inférieur permettait d'atterrir sur le socle du trophée derrière la porte fermée. La récompense était encore refusée par le garde-fou logique, mais la porte physique et la découverte de salle pouvaient être contournées. | Soubassement solide entre porte et coffre. Les six trajectoires de contournement rencontrent désormais le plafond ; le sol principal demeure libre. Pont supérieur, porte et raccourci conservent leurs états distincts. |
| P1 | Marais : dénivelé de 78 px depuis le gradin ; océan : 134 px. Tous deux restaient inférieurs au saut normal d'environ 139 px, alors que l'installation exigeait l'impulsion de jungle et que le texte annonçait un accès hors d'atteinte. | Palier du marais relevé de 454 à 350 ; palier océanique de 360 à 320. Module, pont, danger et paroi du marais suivent ces coordonnées. Les dénivelés deviennent 182 et 174 px : saut simple refusé, impulsion suffisante. Les objectifs de chasse au sol ne bougent pas. |
| P1 | Les six modules et trophées régionaux n'avaient aucun appel de rendu d'appareils dans HuntCanvas, contrairement à la jungle et à la glace. Le joueur pouvait rencontrer le bon socle uniquement grâce à l'indice textuel. | Lecteur d'installation et attaches rituelles V3 existants chargés dans la file normale. Les appareils occupent leurs vraies coordonnées ; les états installé/ouvert/récupéré viennent de la progression persistante. Le pickup séparé disparaît après collecte, avec supports conservés et indications en cas d'échec d'image. |
| P2 | La carte affectait la porte du biome à la montée initiale et la fermeture du raccourci au trajet inférieur pourtant toujours ouvert. | Connexions distinctes : impulsion de jungle, porte du biome, raccourci futur, chemin principal libre. L'accès requis est également lisible en texte. |
| P2 | Une branche complètement fouillée demandait encore d'ouvrir son raccourci ; le danger neutralisé restait décrit comme actif. Certains indices proposaient de prendre un objet avant l'ouverture requise. | Objectif final explicite, rappel de revisite facultative si la capacité future manque, danger marqué neutralisé, indices alignés sur les vrais prérequis. Le retour par le passage ouvert est indiqué. |

La reproduction initiale utilisait le corps 72 × 116, le saut −720, la gravité 1 850 et resolvePlatformMotion à 120 étapes/s. Depuis x = début du coffre −76, la séquence saut puis impulsion à l'étape 46 arrivait sur les six socles, aux pieds coffre −12. Les tests de régression vérifient désormais qu'aucune de ces trajectoires ne pénètre ni ne révèle le coffre fermé.

## Couverture réelle des huit chasses

Les huit chasses restent des mondes latéraux de 8 400 px avec un chemin principal au sol. Les branches facultatives ajoutent 35 salles persistantes, sept capacités, huit secrets et seize portes/raccourcis persistants ; la route thermique supplémentaire de glace dépend directement de la capacité thermique. Les capacités ne sont pas enfermées derrière leur propre serrure.

| Chasse | Boucle facultative effectivement présente | Acquisition et retour |
| --- | --- | --- |
| Jungle / Vey | Six salles ; module au sol après la galerie, retour en arrière, galerie à 392, sceau, cache, trappe et corde. | Impulsion aérienne ; cache +15 énergie. Le module est accessible avant son verrou. |
| Glace / Cryostalker | Cinq salles ; gradin 512, relais 304, pont, coffre 392, trappe et échelle. | Impulsion de jungle requise ; cache +15. La résistance thermique du volcan ouvre un autre passage supérieur lors d'une revisite. |
| Volcan / Bad Blood | Quatre salles ; gradin 508, module 326, coffre 410, danger calorique. | Résistance thermique ; trophée +5 ; retour accéléré avec la protection acide du marais. |
| Marais / Hydre | Quatre salles ; gradin 532, module 350, coffre 476, bassin caustique. | Protection acide ; trophée +5 ; raccourci avec la lame de coupe du désert. |
| Désert / Sandmaw | Quatre salles ; gradin 510, module 300, coffre 390, effondrement cyclique. | Lame de coupe ; trophée +5 ; raccourci avec le respirateur océanique. |
| Océan / Léviathan | Quatre salles ; gradin 494, module 320, coffre 470, décompression. | Respirateur ; trophée +5 ; raccourci avec la vision des spores. Le retour haut peut utiliser l'impulsion déjà possédée. |
| Monde fongique / Hivemind | Quatre salles ; gradin 500, module 280, coffre 380, nuage de spores. | Vision des spores ; trophée +5 ; raccourci avec la détection antique. |
| Ruines / Gardien | Quatre salles ; gradin 500, module 320, coffre 410, champ ancien. | Détection antique ; trophée +5 ; propre raccourci final, sans dépendance à une neuvième chasse inexistante. |

Les tests vérifient, pour les six régions récentes, la montée avec capacité, l'ouverture, l'arrivée physique au trophée et le retour au chemin principal avant de posséder la capacité du raccourci futur. Ils parcourent aussi le sol des huit mondes jusqu'à l'extraction, avec progression vide puis portes ouvertes. Ils ne simulent pas une victoire contre l'Apex : ce contrôle isole la topologie des ennemis, dangers et objectifs.

## Conservation de la progression et des sauvegardes

Aucun identifiant de capacité, porte, trophée ou salle n'a changé. Le cumul reste idempotent, chaque mission ne produit que ses propres acquisitions et les secrets rapportent au maximum +60 énergie au total. Aucun changement de schéma de sauvegarde ni du moteur/replay THE PIT.

La géométrie est reconstruite depuis la progression à chaque reprise. Un ancien checkpoint qui se trouve désormais dans une dalle est explicitement replacé à l'insertion par le garde-fou existant de HuntCanvas ; objectifs et inventaire sont conservés. Les tests de reprise existants exécutent cette protection. Cela n'annonce pas une migration invisible de la position dans tous les anciens replays.

## Visuels de cette correction

Le nouveau module expansionExplorationRendering réutilise seulement deux images alpha V3, inspectées : motion-sensor.webp pour le lecteur d'installation et trophy-bindings.webp pour le support rituel de collecte. Les couleurs et textes signalent les états ; les noms détaillés restent proches du joueur et le trophée n'est annoncé qu'après la visite de son coffre.

Ces supports ne représentent pas six nouveaux bitmaps fidèles de glandes, respirateur, lentille, perle, croc ou spore. Les illustrations exactes de ces pièces restent à produire avec l'outil d'images intégré. Aucun appel API, retouche générative externe ni génération nouvelle n'a été réalisé pour ce lot.

## Vérifications exécutées

- 53/53 tests réussis sur le périmètre level-design-v25, expansion-exploration-regions, metroidvania-pilot-physics, ice-exploration-region, exploration-regions, hunt-exploration-save-runtime et objective-placement.
- 5/5 tests supplémentaires réussis sur expansion-exploration-rendering : fichiers alpha disponibles, coordonnées partagées, secret non révélé, disparition après collecte, ratio conservé, état de raccourci, échec d'image et branchement runtime.
- Exécution finale groupée : **58/58 tests réussis**, aucun échec ni test ignoré ; preuve locale dans tmp/level-design-v25-tests.txt.
- ESLint sur les six fichiers de code/tests du lot : réussi. TypeScript global sans cache incrémental : réussi après correction du type mutable de la banque d'images.
- Un premier test SSR a échoué à cause de deux instances React après le déplacement des dépendances. Le diagnostic de résolution a été confirmé ; la jonction a été corrigée par le responsable du lot PC, puis les mêmes tests ont réussi sans affaiblir leurs assertions.

Commandes reproductibles :

    node --test --test-concurrency=1 tests/level-design-v25.test.mjs tests/expansion-exploration-regions.test.mjs tests/metroidvania-pilot-physics.test.mjs tests/ice-exploration-region.test.mjs tests/exploration-regions.test.mjs tests/hunt-exploration-save-runtime.test.mjs tests/objective-placement.test.mjs tests/expansion-exploration-rendering.test.mjs

    npm exec -- eslint app/game/systems/expansionExplorationRegions.ts app/game/ExpansionExplorationMap.tsx app/game/expansionExplorationRendering.ts app/game/HuntCanvas.tsx tests/level-design-v25.test.mjs tests/expansion-exploration-rendering.test.mjs

## Limites et prochaine validation de terrain

Les six branches partagent encore une même structure montée/module/porte/coffre/retour malgré des hauteurs, dangers, matières et revisites différents. Les huit chasses ne constituent pas encore un monde interconnecté à plusieurs longues boucles ; les cinq dernières doivent gagner des objectifs, rencontres et conséquences propres. Ajouter des compteurs de salles ne résoudrait pas cette limite.

Le chevauchement de certains anciens supports de glace avec la nouvelle route thermique a été inspecté. Aucun blocage n'a été reproduit ; ces supports n'ont donc pas été supprimés sur la seule suspicion.

À effectuer dans de vraies parties : chaque acquisition depuis une campagne neuve, combats et danger pendant les sauts, aller-retour avec endurance basse, lisibilité du lecteur sur le biome, collecte proche du socle, retour au hub après extraction, mort/suspension au milieu d'une revisite et caméra aux deux bords de la branche. Ajouter essais clavier, manette, petit écran et version PC hors ligne sur le matériel visé. Ce lot ne revendique pas ces playtests humains, une fréquence d'images mesurée, un équilibrage final ni une certification commerciale.
