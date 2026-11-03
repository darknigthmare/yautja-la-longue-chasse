# V54 — audit visuel et cohérence du prologue et de la jeunesse

## Périmètre et source

Cet audit couvre toutes les familles de scènes du début actuellement livrées : nurserie, révélation du village, lune/titre, dojo, quartier d'équipement/baraquements, camp, reconnaissance désert, patrouille et petite Fosse. Il ne certifie pas l'univers entier du jeu ni la campagne complète. Les audits Homeworld et PIT adulte sont des travaux parallèles distincts.

Source auteur relue : `work/v36/new-world-specs/youth-thread-page-1.json`, conversation « Mission jeunesse Yautja ». Le tour `7efc0ab0-c5af-4bea-a1ba-c62bc14676e2` décrit la progression ; `328e7d74-8f59-4381-b0d4-6e92e345ba0a` exige explicitement un **squelette**, pas un scolopendre vivant. Le tour `1b26a092-3975-4e4c-9443-092965d0fd67` demande de conserver l'ancien titre pour le moment ; le moteur conserve donc son intitulé établi `Yautja: The Long Hunt`, sans reprendre le changement envisagé dans le premier passage. Les dialogues et règles ajoutés pour rendre cette progression jouable restent des adaptations originales. Une demande de l'auteur du jeu n'est pas présentée comme un fait canonique d'un film ou comic.

## Couverture des scènes

| Scène | Livré et contrôlé | Limite persistante |
| --- | --- | --- |
| Noir / attente de chargement | Pas de personnage de remplacement ni HUD de vie ; entrée volontaire. | Pas de mode VR livré. |
| Nurserie | Deux Younglings distincts, deux orientations natives, lame détachée, duel non létal, sol du cercle. Ombres de contact ajoutées sous les acteurs, y compris projetés. | Les 40 clips courts ne sont pas 40 longues animations finales. |
| Village | PNG V47 réellement inspecté : gigantesque squelette creux, segments/ribs et occupations du village, lune rouge cohérente avec l'arène. | Peinture d'ensemble avec révélation caméra, pas village complet exploré ni pack de parallaxe séparé. |
| Lune / titre | Même continuité V47, transition après KO gagné et intitulé du projet conservé. | Cette version n'ajoute pas de nouvelle cinématique. |
| Dojo | Unblooded dédié, maître distinct, mannequin et accessoires indépendants ; démonstrations sans progression gratuite. Contact sur le sol et sur le dessus réel des plateformes. | Formation courte ; densité d'intervalles d'animation limitée. |
| Première lame / armurerie | Attribution jeunesse inchangée, poste et râtelier bitmap séparés ; l'aide ne présente plus la lame comme disponible avant sa remise. | Tous les états portés du biomask ne sont pas dessinés. |
| Camp / baraquements | Fond camp et quartier inspectés : sol horizontal lisible, portes/couche/brasero rendus séparément. Ombres du joueur et du maître. | Pas de simulation complète des occupants des baraquements. |
| Désert | Fond V49 réellement inspecté et calibré, indices distincts et obstacles ; l'aide désactive les attaques et l'esquive conformément au moteur existant. | Les chasseurs éloignés sont peints : pas 15–40 partenaires autonomes ou multijoueur. |
| Patrouille | Brouteur original avec dessins natifs ; empreinte au sol sous la charge. Ombres posées sur les plateformes lors des trajets. Aide sans attaque, esquive réservée à l'embuscade. | Même fond V49, sans nouvelle famille de plans de parallaxe. |
| Petite Fosse | Novice distinct, trois plans de cage, lame interdite, récompense cosmétique unique. Contact du novice/joueur au sol et maintien des poses aériennes/KO. | 16 dessins natifs, pas 16 cycles d'animation complets ni un rite adulte. |

## Défauts corrigés

1. Absence d'ombres : ajout de `drawActorContactShadow` et lecture alpha cachée de `getSpriteContact`. Les sprites source ne changent pas, ne sont pas retournés, recolorés ou remplacés. Seule une petite marge transparente admissible (au plus 2 % de cellule) corrige la position de rendu ; les poses volontairement relevées conservent leur ancrage.
2. Ombre/pose sur plateforme : `youthActorSupport` utilise les obstacles solides existants et la même portée horizontale d'atterrissage que la simulation. Une ombre reste sur le support sous les pieds pendant le saut. Un personnage posé à y=380 utilise désormais idle/walk, au lieu de jump au seul motif que le sol général est à y=430. Aucune coordonnée de physique, collision ou sauvegarde n'est corrigée artificiellement.
3. Aide trompeuse : le panneau affichait toujours « Y lame », y compris avant acquisition, en patrouille et dans la cage qui l'interdit. `youthTrainingHelp.ts` fournit maintenant raisons et consignes contextuelles. Les huit boutons tactiles gardent leur place ; les commandes interdites restent visibles mais désactivées avec une explication. Les touches remappées continuent d'être utilisées pour les commandes actives.
4. Reconnaissance : le moteur refusait déjà les attaques et l'esquive dans le désert, ainsi que l'esquive hors embuscade pendant la patrouille. L'affichage correspond maintenant à ces règles au lieu d'annoncer des actions sans effet.

Les ombres couvrent aussi le mannequin et les démonstrations, avec un dessin séparé avant le personnage. Le contact au sol ne devient ni une hitbox ni une preuve de progression. Aucun rang adulte, trophée, crédit de chasse, vaisseau ou équipement supplémentaire n'est créé.

## Vérification

**38 tests ciblés PASS**, dont cinq nouveaux : support des plateformes, pose après atterrissage, support de l'ombre pendant le saut et absence de mutation de l'état, lecture alpha de 80 cellules natives minimum, aide des commandes autorisées/interdites. Les tests art V47/V48/V52/V53 conservent leurs contrôles de directions, provenance et dessins distincts. Seuls leurs doubles Canvas reçoivent la primitive `ellipse` désormais utilisée.

Lint des quatre modules modifiés : PASS. Typage ciblé avec `dom,dom.iterable,esnext` conformément au projet : PASS. Un premier appel de typage avait omis la bibliothèque esnext et signalait `Object.hasOwn` dans des dépendances PIT ; ce n'était pas une erreur de ces modifications.

Recettes exécutées sur le build V54 à `http://127.0.0.1:4174` : **14 contrôles navigateur PASS**, zéro erreur collectée et deux navigateurs successifs fermés. Aucun changement du runtime jeunesse après ces contrôles ; les corrections ultérieures de THE PIT et du routeur Homeworld sont qualifiées séparément.

- `scripts/verify-youth-contact-help-v54.mjs` : **7 PASS**. Archive réellement jouée importée avant gameplay, trajet clavier dojo, saut/atterrissage sur plateforme à y=380, pose idle au repos, saut depuis celle-ci avec support conservé à y=380, aides Fosse/patrouille en 390×844 et 640×360, huit boutons conservés, focus et pause. Aucun état de combat, coordonnée, équipement ou reçu injecté en cours de jeu. Rapport : `outputs/qa-commercial-audit/v54/youth/final-contact-help-browser-qa/report.json`.
- `scripts/verify-nursery-scene-v47.mjs`, sortie V54 distincte : **7 PASS**. Nouvelle partie, maintien Prêt, duel gagné par mouvement/frappes réels (137 itérations), KO non létal, village, lune/titre, contrôles tactiles/manette simulée. Une panne volontaire d'écriture du checkpoint gagné vérifie aussi l'absence de fausse complétion et la reprise sans rejouer le duel. Rapport : `outputs/qa-commercial-audit/v54/youth/final-nursery-browser-qa/report.json`.

La recette contact/aide utilise une horloge navigateur contrôlée pour échantillonner précisément sauts et pauses ; elle n'injecte pas l'état du personnage. Cette mesure se distingue d'un parcours en temps réel.

Les 19 captures finales ont été réellement inspectées : pieds posés sur la traverse, pose aérienne distincte, aides lisibles et accessibles par défilement en petit paysage, commandes interdites grisées sans déplacement des boutons, continuité nurserie/village/lune et titre exact. La petite Fosse et la patrouille conservent une scène horizontale avec bandes en portrait ; ce contrôle ne les transforme pas en compositions verticales. Preuve de cette revue : `outputs/qa-commercial-audit/v54/youth/final-visual-review.json`. Aucune manette physique, aucun testeur humain externe, écoute audio subjective, test Safari/iOS ou certification commerciale ne sont revendiqués.

## Restes explicitement ouverts

Le corridor scénarisé, l'appel du nom devant les flammes, la salle du trône complète, la première chasse collective de 15–40 participants, ses suites de quêtes et l'intégralité des rites ne sont pas déclarés terminés. Le prologue actuel couvre une introduction jouable et une première formation accompagnée, prolongée par un duel secondaire. Les dialogues attestés ne sont pas réécrits. Les peintures existantes demeurent des fonds complets hors cage modulaire ; les subdiviser en véritables plans nécessitera une production dédiée, pas un simple renommage d'assets.
