# Revue de montage modulaire des véhicules V34

## Portée

La page statique `public/game/assets/v34/vehicle-assembly-review/` compose les PNG V34 existants dans un Canvas. Elle passe chaque source par `processHunterSpriteTransparency`, contrôle son SHA-256 et conserve les bitmaps d’origine sans réécriture.

Tous les montages gardent le statut `authored-review` et `playable: false`. Cette surface sert à vérifier les raccords, les orientations, le détourage et le cadrage ; elle ne certifie ni collisions, ni animation interpolée, ni véhicule utilisable dans le jeu.

## Sphère d’éjection atmosphérique

- Le siège reste fixe et le bras de commande peut être masqué.
- Quatre poses indépendantes sont lues sur leur vraie cellule source : `stowed`, `opening`, `extended`, `control-position`.
- Chaque pose a son propre pivot source pour compenser le déplacement du dessin dans la planche. Les quatre pivots convergent sur la douille supérieure arrière du siège.
- Seule la vue droite du bras existe. La page masque donc le sélecteur d’orientation pour ce montage et ne fabrique pas de miroir gauche.
- Le calage est une revue statique de pivot. Les intervalles, la coque sphérique, le pilote, les collisions et l’état jouable restent à produire.

## Bone Bison de guerre

- Le corps, la selle et la garde de flanc peuvent être activés séparément.
- Les vues droite et gauche utilisent leurs dessins respectifs, jamais un miroir logiciel.
- Le premier diagnostic `common-origin-unregistered` a montré que les trois planches ne partageaient ni origine brute ni échelle. Il ne constituait pas un défaut de forme des accessoires.
- Une transformation propre est désormais enregistrée pour chaque module et pour chaque orientation. Le statut de l’assemblage devient `static-module-fit-review`.
- La selle est placée sur le dos descendant derrière la bosse. La garde reste courte sur le flanc, sous la selle, sans recouvrir les articulations ni les pieds.
- Les modules sont visibles par défaut et restent commutables pour comparer le corps nu, chaque pièce et le montage complet.
- Cette validation est statique. Elle ne prouve pas encore les attaches pendant la marche et ne crée aucun clip jouable.

### Transformations inspectées

Les positions sont les origines de dessin dans le Canvas 1 200 × 800. Chaque cellule source conserve sa géométrie et son dessin dédié.

| Vue | Corps | Selle r1 | Garde r1 |
| --- | --- | --- | --- |
| Droite | `x129.985 y123.05 · ×0.91` | `x224.7 y203.4 · ×0.36` | `x300.75 y338.5 · ×0.25` |
| Gauche | `x129.985 y123.05 · ×0.91` | `x602.9 y203.4 · ×0.36` | `x640.75 y338.5 · ×0.25` |

Après détourage et transformation :

| Vue | Corps | Selle | Garde |
| --- | --- | --- | --- |
| Droite | `x157 y211 · 877×499` | `x260 y225 · 291×212` | `x335 y350 · 202×163` |
| Gauche | `x169 y210 · 876×500` | `x649 y225 · 291×212` | `x663 y350 · 202×163` |

La selle recoupe le corps sur 15 970 pixels à droite et 16 026 à gauche : ses sangles et ses appuis rejoignent donc bien le dos au lieu de flotter. La garde recouvre 13 804/13 801 pixels du flanc et reste dans la silhouette extérieure ; elle ne crée pas de pointe sous le ventre et laisse les membres lisibles. Le montage complet reste dans la marge de sûreté du Canvas.

### Planches de marche

Quatre sources OpenAI sont conservées avec leur verdict réel dans la provenance du Bone Bison :

- `walk-right-r1` est `rejected` : quatre cellules touchent leur bord, 14 pixels cumulés ;
- `walk-left-r1` est `rejected` : cinq cellules touchent leur bord, 43 pixels cumulés ;
- `walk-right-r2` et `walk-left-r2` sont `authored-review` : six poses distinctes chacune et aucune collision de bord ;
- aucune des douze cellules r2 n’est déclarée `runtimeFrameAccepted`, et aucun `runtimeClip` n’est créé.

Les r2 corrigent donc le cadrage, mais la continuité des appuis, la séparation des membres éloignés, le raccord pose 6 vers pose 1 et le suivi des modules doivent encore être validés en mouvement. Les accessoires statiques ne sont pas automatiquement projetés sur ces poses.

## Razorwing modulaire

Le montage Razorwing assemble cinq ressources actives : un corps en vol sans ailes, deux planches d’aile proche et deux planches d’aile arrière. Les 26 dessins utiles sont lus dans leurs rectangles libres mesurés, car plusieurs dessins ne respectent pas la grille 3 × 2 demandée. Aucun crop ne vient donc des cellules théoriques qui se chevauchent.

- L’aile arrière est dessinée derrière le corps, puis le corps, puis l’aile proche.
- Les vues droite et gauche utilisent cinq dessins source adaptés à leur orientation ; aucune ressource n’est retournée par Canvas.
- Les deux ailes sont activées par défaut et disposent chacune d’un bouton indépendant.
- Le lecteur avance six phases. Il reste disponible si une seule aile est visible et s’arrête lorsque les deux ailes sont masquées.
- Le statut reste `estimated-flight-rig-review`, `authored-review` et `playable: false`. Il ne crée aucun `runtimeClip`.

### Pivots et calage de revue

| Vue | Ancre Canvas | Corps r1 | Aile arrière | Aile proche |
| --- | --- | --- | --- | --- |
| Droite | `850,440` | crop `21,309,733,338` · pivot `497,146` · ×0,85 | décalage `-8,-5` · ×1 | décalage `0,0` · ×1,15 |
| Gauche | `550,440` | crop `782,309,733,338` · pivot `236,146` · ×0,85 | décalage `8,-5` · ×1 | décalage `0,0` · ×1,15 |

Les douze compositions (six phases × deux orientations) restent entièrement dans la marge de sûreté 18 px du Canvas 1 200 × 800. Les douze captures sont distinctes. Les quatre états « corps seul », « aile arrière », « aile proche » et « deux ailes » ont aussi quatre hashes distincts. La continuité mécanique des épaules et la topologie des ailes restent toutefois à approuver image par image ; ce calage visuel n’est pas une validation d’animation.

### Limite de détourage du corps r1

Le corps r1 garde des liserés magenta visibles dans certaines cavités fermées des griffes et derrière la crête. Le réglage local de l’atelier passe de la provenance `tolérance 48 / frange 2` au maximum autorisé `tolérance 64 / frange 3`, sans modifier le processeur global ni le PNG.

La comparaison pixel à pixel donne :

- 749 pixels supplémentaires deviennent transparents ;
- les bornes alpha16 des deux corps restent `[2,2,729,334]` dans leurs crops ;
- les pixels visibles diminuent de 387 à droite et 362 à gauche, sans érosion anatomique visible dans les crops ;
- il reste néanmoins 61 et 60 pixels répondant encore au seuil magenta strict, ainsi que 158 et 151 pixels à excès magenta. Le défaut est donc réduit mais toujours visible.

Cinq corrections OpenAI ont été conservées avec leur vrai verdict. Aucune ne remplace r1 :

| Asset | UUID ImageGen | SHA-256 | Verdict |
| --- | --- | --- | --- |
| `flight-body-layer-r2` | `exec-13dece84-fb18-4bfb-8712-f36fb8babe37.png` | `4cde5ebd7b7485ba071b41a56d078c91206e0a7d000bfb7c6438f3940af9500d` | rejeté : franges griffes/crêtes |
| `flight-body-layer-r2-attempt2` | `exec-7d9fa3d7-da67-4fd0-a474-a14761169b99.png` | `98bc492e2fbf2a1aed3b6ec8d11e7f9e05df393f26cd84949b8b5d71b6a27d95` | rejeté : franges persistantes |
| `flight-body-layer-r2-attempt3` | `exec-a4304621-0f20-44e2-8df0-89571708567b.png` | `6bbf3a1731ffeb137c9a4de2fa2277767d99e07f20fa6eb669c8518830049323` | rejeté : amélioration insuffisante |
| `flight-body-layer-r2-attempt4` | `exec-84cbbdd9-7926-418b-a047-eb608c5fe711.png` | `645eb6e7b7171c49da8dc7c5439e068c914b0d8da59824e71c07b0638eb46fc4` | rejeté : cavités encore roses |
| `flight-body-layer-alpha-attempt1` | `exec-3010deeb-93e2-477b-9a67-531229ebc999.png` | `37c3728d81a1253d33c617c4bc491cdb0a1d888025e2cfdf70659ebc182c665e` | rejeté : PNG RGB opaque, damier peint, aucun alpha |

La tentative alpha contient exactement 0 pixel transparent, 0 pixel partiel et 1 572 864 pixels opaques. Le recorder exige un motif pour tout statut `rejected`, conserve les octets de chaque tentative et n’en crée aucun clip de jeu.

## Vérification attendue

Le builder `scripts/build-vehicle-assembly-review-v34.mjs` refuse les sources absentes, les SHA-256 modifiés, les statuts actifs autres que `authored-review`, les orientations incomplètes, les rectangles ou pivots libres hors image, les ressources par orientation inconnues et les transformations nulles. La QA navigateur confirme :

1. les dix PNG actifs de l’atelier sont chargés, hachés et détourés avec le pipeline du jeu ;
2. les quatre poses du bras produisent quatre compositions distinctes ;
3. aucune composition active ne pénètre la marge de sécurité du Canvas ;
4. le siège ne propose pas une vue gauche fictive ;
5. les deux orientations du Bone Bison utilisent des transformations indépendantes ;
6. les boutons Bone Bison retirent puis restaurent effectivement les deux modules ;
7. les compositions équipées diffèrent du corps nu dans les deux orientations ;
8. les cinq ressources actives Razorwing gardent leurs SHA, leurs crops libres et aucun `runtimeClip` ;
9. les cinq corrections Razorwing sont `rejected`, portent un motif non vide et gardent leurs octets source/public identiques ;
10. les six phases droite et les six phases gauche donnent douze compositions sûres et distinctes ;
11. les deux boutons d’aile produisent quatre compositions distinctes dans l’ordre arrière/corps/avant ;
12. l’étiquette « revue de montage · non jouable » et `playable: false` restent visibles.

La recette passée est enregistrée dans `work/v34/vehicle-assembly-review-qa/browser-qa.json` : 10 ressources vérifiées, 12 compositions Razorwing, 5 corrections rejetées, 0 erreur navigateur et aucun débordement mobile.
