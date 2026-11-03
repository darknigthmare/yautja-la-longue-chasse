# The Pit — bilan de validation V94

État du lot au 13 octobre 2026 : raccord natif et validations locales terminés, **déploiement V94 encore en attente**. Ce document décrit un lot borné, pas l’animation complète des 201 combattants ni une certification de fidélité 1:1 ou de fluidité.

## Production réellement admise

Les **36 tentatives de génération** ont produit **35 PNG originaux archivés** : six pour Wolf, dix pour Greyback, dix pour Celtic et neuf pour Berserker. La tentative Berserker 008 a été refusée par l’outil et n’a produit aucune image ; son échec est conservé explicitement. Une tentative, une archive et une page admise ne sont pas des comptes interchangeables.

Le registre de combat importe les quatre fichiers `pitLifecycleWolfV94.json`, `pitLifecycleGreybackV94.json`, `pitLifecycleCelticV94.json` et `pitLifecycleBerserkerV94.json`. Leur bilan est **19 PNG publics, 13 définitions, 21 clips orientés et 144 dessins natifs uniques**, sur quatre costumes masqués exacts.

| Combattant et variante exacte | PNG publics | Définitions | Clips orientés | Dessins uniques | Admission V94 |
| --- | ---: | ---: | ---: | ---: | --- |
| Wolf · `wolf-avec-casque-4261aca172` | 2 | 2 | 4 | 12 | Intro et défaite, trois dessins par face et par famille |
| Greyback · `elder-greyback-avec-casque-eda4af4a7d` | 1 | 1 | 1 | 6 | Victoire uniquement vers la droite |
| Celtic · `celtic-avec-casque-0764ed4b53` | 8 | 6 | 12 | 93 | Six familles dans les deux orientations, avec des comptes partiels pour victoire, défaite et provocation |
| Berserker · `berserker-avec-casque-ba1f7a7b1e` | 8 | 4 | 4 | 33 | Intro, victoire, défaite et provocation uniquement vers la droite |
| **Total** | **19** | **13** | **21** | **144** | **Quatre costumes exacts** |

Seulement **six orientations atteignent leur cible de dessins** : Celtic idle et dizzy à huit dessins par face, puis intro à douze dessins par face. Les quinze autres clips orientés restent partiels. Celtic victoire compte 6 droite / 5 gauche, défaite 6 / 3 et provocation 8 / 9. Berserker compte respectivement 8, 5, 10 et 10 dessins dans ses quatre familles droite ; aucun nouvel idle, dizzy ou clip gauche n’est admis pour lui. Greyback n’acquiert pas de victoire gauche ou d’autre famille par ce lot.

Les PNG publics sont des copies natives byte-identiques des originaux admis. Une page peut encore contenir des cellules refusées : seuls les rectangles explicitement retenus sont consommés. Les 35 cellules exclues de Celtic, les six vues gauche exclues de la page Greyback et les exclusions de Berserker ne sont pas réintroduites dans les clips. Les orientations sont dessinées séparément ; aucun miroir, changement d’alpha, recoloration ou reconstruction de pixels ne complète les manques.

## Raccord et contre-vérification indépendante

Une contre-vérification en lecture seule a comparé les 13 définitions présentes dans `pitSpriteSheetRegistry.ts` aux quatre JSON et au catalogue des apparences. Les identités, variantes, orientations, pages, rectangles, pivots et durées concordent. `pitLifecycleReviewV94` retourne une preuve seulement pour le clip et le costume correspondants ; le costume par défaut et les orientations V94 absentes de Greyback/Berserker ne récupèrent pas cette preuve.

Le contrôle indépendant a décodé les 19 vrais PNG, vérifié leurs SHA-256 contre `pitLifecycleReviewV94.json`, les limites transparentes natives au seuil alpha 2 et les hashes des 144 dessins distincts. Le vrai loader du registre V94 prépare les 21 clips ; les vrais resolvers consomment chacune des 144 poses aux frontières des durées prévues, sans modifier l’état sérialisé du combat. Le contrôle précédent de Wolf et les tests natifs spécifiques vérifient également l’échelle commune par page, le contact au sol et l’absence de transformation des dessins.

Les intros restent dans 72 ticks / 1 200 ms, victoire et défaite dans 120 ticks / 2 000 ms, provocations dans 90 ticks / 1 500 ms. Les gardes et vertiges Celtic bouclent sur 120 ticks. Les cérémonies non bouclées tiennent leur dernier dessin. Ces comptes ne prouvent ni la qualité de chaque raccord visuel, ni une gestuelle canonique, ni une fluidité suffisante pour tous les personnages.

La preuve V94 expose `oneToOneCertified: false` et `fluidityCertified: false`, y compris quand la cible numérique est atteinte. Le bilan global conserve `completeRosterAnimations: false`. L’atelier distingue « cible de dessins atteinte », « séquence partielle » et absence de clip, sans convertir un nombre de cellules en certification visuelle.

## Direction du roster, distincte des images produites

`pitTribalDirectionV94` fournit **2 622 plans détaillés**, soit six familles pour **201 combattants / 437 apparences**, et **5 244 requêtes orientées** si chaque plan est décliné à gauche et à droite. Cette file décrit le travail prévu ; elle ne signifie pas que ces images existent ou sont admises.

Les règles conservent l’équipement et les côtés anatomiques de la référence exacte, une stature commune par page et les contacts au sol. Aucun retrait de masque, arme offerte, figurant, compagnon ou rituel n’est ajouté sans preuve propre au personnage et admission des sprites nécessaires. Les gestes restent des adaptations pour le jeu.

La contre-vérification couvre les 2 622 plans : l’attribution tribale Yautja dépend strictement de l’espèce renseignée. Theta et Machiko gardent l’anatomie humaine, sans mandibules, griffes, sang vert ni rugissement biologique Yautja. L’Amengi conserve une direction neutre fondée sur la posture fournie ; aucune arme, puissance ou anatomie cachée n’est déduite de son nom. Les identités non vérifiées restent neutres et à vérifier. Aucun plan ne certifie un geste documenté, une fidélité 1:1 ou un cycle natif complet.

## Preuves locales du build final

Les traces privées sont conservées dans `work-local/v94/qa/` ; elles ne constituent pas des validations du déploiement public.

| Preuve | Résultat | Portée |
| --- | --- | --- |
| `tests-final.log` | 159 PASS, 0 FAIL | Sélection finale de tests du lot ; pas une revendication de couverture exhaustive du jeu |
| `next-build-final.log` | PASS, TypeScript terminé | Build de production local et compilation des routes |
| `lint-final.log` | Exit 0 | Lint final ciblé, sans nouveau diagnostic |
| `compiled-css-final.json` | Quatre contrôles PASS | Déclarations CSS compilées concernant le toast et les HUD ; pas toute la cascade ni le rendu tactile réel |
| `browser-final-checks.json` | 23 contrôles DOM réels | Atelier desktop dans Edge, build final servi localement sur le port 3177 |

Les 23 contrôles navigateur donnent **21 états `ready`**, couvrant chacun des clips orientés admis, et **deux états `missing-clip` attendus** : victoire Greyback gauche et provocation Berserker gauche. Les apparences et les indices de dessin proviennent du DOM réel de l’atelier. Les captures `celtic-intro-browser.png` et `wolf-defeat-browser.png` ont été regardées : elles montrent respectivement la dernière pose d’introduction Celtic et la pose de défaite Wolf, avec leurs libellés de couverture et la ligne de sol.

Un second contrôle desktop a traversé le menu principal, son avertissement de spoilers, la sélection de Celtic masqué contre Wolf masqué et le stage Chambre sacrificielle. Le DOM réel a montré les deux entrées avec commandes bloquées, puis le compte à rebours et le début jouable. Le canvas a déclaré l’introduction Wolf `dedicated-animation` pendant la phase `intro-right`. La capture `celtic-wolf-match-browser.png` a été regardée après le début du duel : les deux chasseurs se font face sur le sol du stage. Le profil libre local ne débloque aucune campagne. Les traces de compte à rebours et de combat sont dans `match-final-checks.json`.

**Aucune nouvelle manche entière, validation mobile ou partie publique V94 n’est certifiée ici.** Les contrôles DOM, ce début de duel et les captures fixes ne prouvent pas à eux seuls tous les raccords en lecture continue, les performances de chaque combattant ou l’ergonomie tactile. Le déploiement et les vérifications publiques V94 restent à effectuer ; aucun succès Vercel n’est annoncé dans ce bilan.
