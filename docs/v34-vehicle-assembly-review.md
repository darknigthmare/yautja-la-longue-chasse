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
- Le test naïf avec une origine et une échelle communes fait recouvrir presque entièrement la créature par les accessoires ; il démontre l’absence d’enregistrement commun, sans prouver que leurs formes sont impossibles à caler.
- Le statut est donc `source-geometry-blocked`. Les deux modules sont désactivés par défaut et leur activation sert seulement à voir l’échec de calage ; aucun assemblage Bone Bison n’est déclaré validé.
- La prochaine passe devra d’abord rechercher une transformation propre à chaque module et la valider visuellement. Une régénération ne sera nécessaire que si la courbure ou les attaches restent incohérentes après ce calage.

### Diagnostic géométrique chiffré

Les coordonnées ci-dessous sont locales à chaque cellule de 1 033/1 034 × 761 pixels. Elles décrivent des boîtes alpha à tolérance 16 ; elles quantifient l’encombrement, pas la surface opaque exacte.

| Vue | Corps | Selle | Garde de flanc |
| --- | --- | --- | --- |
| Droite | `x30 y97 · 963×548` | `x98 y60 · 809×589` | `x137 y46 · 806×653` |
| Gauche | `x43 y96 · 962×549` | `x128 y60 · 809×589` | `x91 y46 · 805×653` |

La selle occupe environ 84 % de la largeur du corps et 108 % de sa hauteur. La garde occupe environ 84 % de sa largeur et 119 % de sa hauteur. À droite, la selle commence 37 pixels au-dessus du corps et finit 4 pixels sous lui ; la garde commence 51 pixels au-dessus et finit 54 pixels sous lui. La situation est quasi identique à gauche. À origine commune, les boîtes des accessoires recouvrent donc plus de 80 % de la boîte du corps au lieu de rester localisées derrière la bosse et au-dessus des membres.

Le test établit seulement que ces planches indépendantes n’ont pas de transformation commune enregistrée. Un prop indépendant peut légitimement avoir sa propre origine brute et sa propre échelle en pixels par mètre ; partager la même résolution ne lui impose pas le repère du corps. Le montage actuel conserve volontairement l’échec de la transformation identité comme diagnostic.

La correction conservera les `r1` intacts et procédera dans cet ordre :

- calibrer séparément échelle, translation et pivot de la selle, puis de la garde, pour chaque orientation ;
- placer la selle sur le dos descendant derrière la bosse avec une proportion plausible pour un Yautja ;
- garder la protection courte au-dessus des articulations et de la ligne des membres ;
- comparer les deux côtés sans miroir et vérifier les attaches dans Canvas ;
- ne régénérer un module que si sa courbure ou ses attaches restent incohérentes après cette transformation inspectée ;
- n’accepter aucun état animé avant une passe corps + module sans occultation anatomique.

## Vérification attendue

Le builder `scripts/build-vehicle-assembly-review-v34.mjs` refuse les sources absentes, les SHA-256 modifiés, les statuts autres que `authored-review`, les cellules qui touchent leur bord de grille et les orientations incomplètes. La QA navigateur doit ensuite confirmer :

1. les cinq PNG sont chargés et détourés avec le pipeline du jeu ;
2. les quatre poses du bras produisent quatre compositions distinctes ;
3. aucune composition active ne pénètre la marge de sécurité du Canvas ;
4. le siège ne propose pas une vue gauche fictive ;
5. les deux orientations du Bone Bison et les boutons de ses modules restent accessibles ;
6. l’étiquette « revue de montage · non jouable » reste visible.
