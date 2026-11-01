# V112 — chaîne de chasse et canopée

Cette livraison reprend les douze extensions FUT-01 à FUT-12 du classeur de chasse V111. Elle complète les gestes de terrain, l'emport et la conservation, les traversées de canopée, les options d'accessibilité et les réactions locales à une carcasse. Le suivi Homeworld de la PR22 conserve son périmètre et ses classeurs.

Le [classeur V112](./YAUTJA_V112_MECANIQUES_CHASSE.xlsx) est repris sur la base V114 `f1856f6670fd959ed012c38f84e6d90d6f86a361`. Il contient désormais **21 onglets et 606 lignes**, dont les **362 identités originales conservées**. Sa [source JSON](./hunt-mechanics-v112.json) conserve le commit et le blob de référence ainsi que les statuts initiaux. La feuille **Cloture** relie chacun des **219 points initialement ouverts** à son critère original, sa preuve, sa portée et son éventuel reste.

Après les exécutions consignées dans [le rapport de reprise](./qa/v112-hunt-closure/README.md), **201 points reçoivent une qualification automatique bornée** et **9 constats de provenance sont documentés**. Les contrôles automatiques incluent les contrats de données des espèces et des paramètres ; ils ne constituent pas 201 parties jouées. **9 exigences originales restent partiellement ou non qualifiées**, avec leurs critères humains, matériels ou de campagne dans **Restant**. Les 86 lignes `BASE_V111` gardent leur statut historique. Les 359 autres contrats de cellules restent inchangés hors statut ; seules les acceptations périmées QA112-41/PRF112-03/04 reçoivent leur résultat daté, avec le texte original intégral archivé. Des empreintes SHA256 contrôlées par JavaScript, Node et Python protègent ces invariants.

`VALIDE_AUTOMATISE` exige une exécution, une commande et un commit ; `DOCUMENTE` décrit un constat relu sans prétendre à un comportement essayé ; `PARTIELLEMENT_QUALIFIE` conserve une limite explicitement ouverte. La validation du livre vérifie ces liens et refuse de supprimer un identifiant initial, d'inventer une preuve ou de cacher un contrôle humain. Les anciens `A_EXECUTER` QA112-41/PRF112-03/04 sont corrigés avec le résultat réellement publié sur `252c4680f90e1003d4d914d5867bf411bb277017`. Les nouveaux scripts schéma2 et octets de la présente reprise ont leurs contrôles distincts dans la CI de la PR, sans boucle de commit de preuve.

## Mécaniques et commandes

Les arbres conservent le bond direction+saut V111. Sur une liane, une corde ou une chaîne, une direction seule enclenche le pendule ; direction pompe, Haut/Bas change la longueur et Saut lâche avec la vitesse tangentielle. L'angle, la longueur, l'énergie, la collision et l'endurance sont bornés. Une prise perdue ou obstruée ne peut retenir le chasseur. L'épuisement impose une vraie réception avant une nouvelle prise.

Les routes de canopée sont optionnelles et géométriques : jusqu'à trois séquences selon l'espace libre, six branches de repos par séquence et des entrées/sorties reliées au terrain. Elles sont réappliquées au monde final après les transformations d'exploration. Une vérification de géométrie ne suffit pas à qualifier un parcours ; la recette native doit toucher réellement les repos.

Le corps réel peut être préparé, porté puis suspendu sur un socket authoré compatible. Masse, capacité, portée et volume libre sont contrôlés pendant le geste. Rendu, point de prélèvement et témoins suivent le même acteur ; la disparition du support libère ce même corps dans la collision.

Le catalogue de 39 espèces détaille chaque partie, sa masse, son volume, sa durée et sa fragilité dans le classeur. Les prises anatomiques dépendent de l'espèce et d'un stock fini. Préparation et prélèvement sont des gestes distincts. L'interface présente masse, durée, prérequis et intégrité avant confirmation. Cette intégrité découle des dommages de la chasse et de l'analyse, sans nouveau tirage aléatoire à la reprise. Une interruption ou un emport plein laisse la partie sur la proie.

Le sac de pause permet de déposer puis reprendre les nouvelles parties anatomiques sur un appui réel, à portée et sans obstacle. Les pièces déposées chutent avec la collision et restent dans le registre canonique ; une extraction n'emporte que les pièces encore portées. La charge concerne ces nouveaux prélèvements et le corps porté. Les `TrophyClaim` principaux et secondaires historiques conservent leur contrat de collection existant et ne reçoivent pas de poids supplémentaire dans ce lot.

L'armure scout autorise 24 kg et 18 volumes, hunter 36/24, berserker 52/30. À pleine charge, vitesse ×0,68, saut ×0,84, coût de grimpe ×1,6 et bruit ×1,8. Les stocks et leur capacité sont recomptés depuis les objets réels. Les remises de campagne suivent une extraction réussie et les identités monotones de rencontre empêchent les répétitions.

Chaque dépeçage ou prélèvement anatomique achevé use l'outil de 5 points, y compris si la mission échoue ou est abandonnée ensuite. Démarrer ou interrompre le geste use de 0 point. L'analyse, la marque, la suspension et les gestes d'atelier ne sont pas ce coût. Un outil à zéro reste utilisable avec une durée augmentée, et l'affûtage au poste est gratuit. L'atelier conserve l'identité et la qualité de la pièce dans les étapes suivantes :

| Étape | Marques | Gestes manuels |
| --- | ---: | ---: |
| Nettoyer | 2 | 3 |
| Traiter | 4 | 4 |
| Sécher | 3 | 5 |
| Monter | 5 | 3 |

Le travail ne progresse pas hors jeu. Jusqu'à 16 travaux sont actifs en parallèle. Le dépôt détaillé accepte 256 prises ; l'action explicite « Ranger en réserve » conserve possession, compte et qualité moyenne des pièces montées tout en libérant un emplacement. Coût, inventaire et progression doivent être enregistrés avant le message de réussite. « Suspendre » conserve la pièce, les unités déjà confirmées et le coût engagé, annoncé sans remboursement. « Reprendre » réactive le même travail sans repayer. Une écriture refusée ou un rechargement ne doit ni perdre ce travail ni dupliquer le débit. L'atelier possède aussi son bouton natif « Quitter l'atelier », utilisable au clavier et sur petit écran ; confirmer et revenir suivent les boutons Saut/Interagir affectés à la manette.

Les options de chasse ajoutent fenêtres normale, large et sans limite, confirmation par pression, maintien ou bascule, grands glyphes, prise et visée en bascule, remappage de manette par permutation et guide contextuel en onze étapes. L'aide contextualise maintenant la vraie possession et condition du Flaying Tool, la durée de travail et les deux limites de l'emport, et donne priorité à la récupération après épuisement ou en vol. Aucun coefficient de score supplémentaire n'est ajouté ; les dangers et le temps de chasse continuent, ce qui peut affecter le score chronométré et la qualité Apex. Le guide distingue corps, trophée et extraction, et reprend les commandes affectées. Près d'un corps, **Bas + Interagir** à la manette ouvre le menu ; Haut/Bas déplace la sélection, le Saut affecté confirme et Interagir affecté ferme. Le cadre reste visible et la simulation continue pendant la navigation, même après remappage.

La découverte d'un corps est locale. Vue, odeur animale, radio et investigation ont des identités distinctes. La radio ne propage qu'un saut à des alliés dans sa portée et avec un nombre de destinataires borné. Les herbivores, charognards et gardiens ont des comportements propres. La peur décroît près du corps réel et n'invente pas la position du chasseur.

Les valeurs de ce système sont des choix de gameplay du fan game ; elles ne sont pas présentées comme des données canoniques de la franchise. La discussion ChatGPT historique n'a pas été lue.

## Génération et vérification

```sh
node scripts/build-hunt-mechanics-workbook-v112.mjs
node scripts/build-hunt-mechanics-workbook-v112.mjs --check
python3 scripts/verify-hunt-mechanics-workbook-v112.py
node --experimental-strip-types --test --test-concurrency=1 tests/*-v112.test.mjs
node scripts/qa-hunt-mechanics-browser-v112.mjs
node scripts/qa-hunt-lifecycle-browser-v112.mjs
node scripts/qa-hunt-native-performance-v112.mjs --report outputs/qa-v112-followup/native-performance.json
```

Le générateur Excel ne dépend d'aucune bibliothèque externe. Les dates ZIP, l'ordre des membres, les styles, les liens et les cellules inline sont déterministes. Le vérificateur Python utilise uniquement ZIP/XML de la bibliothèque standard ; il contrôle CRC, noms, relations, cellules, filtres, en-têtes gelés et statut explicite des scénarios. Aucun moteur Excel ni recalcul natif n'est exécuté.

Les ressources visuelles sont liées aux gestes qui les utilisent. L'atlas SVG des prises anatomiques et les glyphes vectoriels de l'atelier sont originaux et consommés par les interfaces. Les signaux de découverte utilisent texte et formes en plus de la couleur. Une icône ne constitue pas une animation corporelle complète.

## Qualification et limites

La matrice initiale de locomotion garde ses 72 traversées isolées (8 missions × 3 armures × 3 sources d'entrée normalisées), avec ennemis retirés pour isoler les repos. Les nouvelles recettes de catalogue parcourent les 39 espèces et leurs 56 parties avec les vrais moteurs de rites : prérequis, stock fini, refus au dernier tick, acteurs de reprise et livraison. Les 33 paramètres du classeur sont comparés aux constantes ou aux frontières du moteur. Un autre scénario couvre 24 allers-retours **locaux de 900 px** au sol, sous la première route de canopée, avec ennemis et dangers conservés, puis une vraie décharge et un saut. Ces vérifications ne démontrent pas toutes les routes principales jusqu'à l'extraction.

Deux suites navigateur ont des portées distinctes. La suite initiale monte des composants et fonctions de production avec ses adaptateurs de fixture ; elle conserve sa preuve historique, puis ajoute des états du guide et sa lecture avec zoom. Le nouveau [parcours logiciel de chasse](../scripts/qa-hunt-lifecycle-browser-v112.mjs) monte le **vrai HuntCanvas**, sa boucle rAF et ses listeners clavier/pointeur, plus un contrôleur émulé passant par le vrai polling. Les événements de perte de focus et d'annulation sont injectés dans les handlers réels.

Dans ce nouveau parcours, l'insertion et le monde sont préparés. Une carcasse provient de `damageEnemy`, puis analyse, dépeçage et prélèvement utilisent le menu natif et la simulation. Les prérequis Apex/objectifs sont amorcés avant l'extraction ; l'approche de la navette et l'embarquement utilisent ensuite la simulation et les entrées réelles. Les callbacks GameClient de fin de mission, progression sociale et atelier sont extraits par AST sans réécriture, avec une admission de session fournie par la fixture. Le stockage de campagne, sa réconciliation, un refus de lecture et le rechargement dans un nouveau document sont réels. **Les checkpoints de chasse sont seulement captés en mémoire** : cette recette ne prouve pas leur rechargement depuis le sidecar actif et ne monte pas tout GameClient. L'atelier teste le vrai hook manette par défaut puis remappé, et le bouton de sortie natif au clavier dans un viewport de 390 px.

Le [benchmark natif](../scripts/qa-hunt-native-performance-v112.mjs) mesure `stepGame` sur huit mondes réels, avec graines et deux profils de peuplement : initial, puis vagues authorées avancées à t=0 avec jusqu'à trois acteurs vaincus par `damageEnemy`. Le chasseur est rendu invulnérable pour maintenir la mesure ; l'IA, la géométrie, les collisions et les autres ennemis restent actifs. Sur le runner AMD EPYC 7763 à 4 CPU logiques, Node 22.23.4, les 32 cas et leurs 16 paires déterministes passent : 57 600 pas mesurés, 7 680 d'échauffement, plus grand p95 de 1,790060 ms et moyenne maximale de 1,482552 ms. Les prélèvements de heap sont informatifs, sans profil de mémoire retenue. **Aucun rendu/GPU, FPS du produit, son, appareil ou comportement thermique n'est mesuré.**

Les résultats et commandes exacts sont conservés dans [le rapport de reprise](./qa/v112-hunt-closure/README.md), ses JSON, ses captures et la feuille Preuves. Les anciens [rapport et cinq PNG V112](./qa/v112-hunt/README.md) restent inchangés. Le [protocole débutant](./qa/v112-hunt/beginner-protocol.md) prépare neuf tâches pour cinq nouveaux joueurs ; **aucune session humaine n'est réalisée**. FUT-11/FUT-12 restent partiels pour compréhension débutant, campagne interactive complète, téléphones/manettes physiques et performances matérielles. L'absence de session Excel native est également indiquée. Une capture et un PASS de compilation ne remplacent aucune de ces qualifications.

## Historique inchangé

```sh
node scripts/check-excel-history-v112.mjs --check --tests
node scripts/check-homeworld-history-v112.mjs --check --tests
```

Les anciens classeurs et preuves restent inchangés. Les wrappers construisent une copie privée de sources ; seuls les fichiers dont la version courante diffère du freeze sont restaurés depuis le commit Git épinglé, après vérification du SHA256 publié. Les assets, captures et classeurs sont des entrées partagées en lecture et restent soumis à leurs empreintes. Les sources de l'application ne sont jamais redirigées vers cet historique.

Le contrôle V110 vérifie ses 1 386 entrées gelées. Le contrôle Homeworld V111 vérifie ses 1 433 entrées, conserve les identités Git des illustrations historiques et régénère son classeur original. Le wrapper restaure également les préimages exactes de tous les tests originaux avant d'en vérifier l'identité. `node scripts/test-current-v111-v112.mjs` exécute les régressions V111 sur le runtime actuel. Seul `homeworld-excel-followup-v111.test.mjs`, qui vérifie l'état de publication gelé, s'exécute sans modification dans le contexte historique Homeworld. Une réussite historique ne remplace pas les tests du runtime actuel.
