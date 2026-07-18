# Audit complet — modularité Yautja V3

Date : 18 juillet 2026  
Périmètre : assets V2, aperçu DOM, rendu Canvas, animation, personnalisation,
fidélité visuelle et couverture transmédia.

## Verdict

La V2 est un compositeur d’images, pas un rig articulé. Le corps, l’armure et
le plasmacaster utilisent des canevas différents puis sont forcés dans des
rectangles arbitraires. Les pièces ne peuvent donc ni s’emboîter exactement,
ni suivre une articulation commune entre les menus et la mission.

La migration V3 adopte un référentiel unique, un squelette partagé et des
textures atomiques. Une configuration de chasseur devient une combinaison de
morphologie, peau, filet, dreads, masque, plaques, technologies et armes, et
non une nouvelle image fusionnée.

## Défauts bloquants constatés

### P0 — géométrie et rendu

- Le corps V2 mesure `295×405`, les armures `512×1024`. Canvas étire pourtant
  les deux dans le même rectangle `84×122`, soit environ 38 % de déformation
  horizontale de l’armure.
- 23 des 31 WebP inspectés ont été recadrés indépendamment avec une marge de
  8 px. Le manifeste ne conserve ni l’origine du crop, ni le rectangle source.
- `body/base.webp` fusionne peau, tête, mandibules, dreads, filet, membres,
  ceinture et pagne. Les dreads V2 sont donc affichées une seconde fois.
- Les trois armures sont des planches de pièces espacées, superposées comme si
  elles étaient une silhouette complète.
- Le plasmacaster fusionne support d’épaule, bras mécanique, rotule, corps du
  canon et tube. Tout pivote comme une plaque rigide.
- Le canon affiché n’emploie pas l’angle réel du projectile. Le laser, le
  projectile et le sprite partent de trois origines différentes ; l’écart
  relevé atteint environ 17 px horizontalement et 13 px verticalement.
- DOM et Canvas possèdent chacun leurs propres tailles, insets, pivots et
  découpes. Une même apparence n’a donc pas le même montage selon l’écran.

### P1 — animation et interactions

- Les dreads sont des bandes verticales du même bouquet : des mèches sont
  coupées et des coutures apparaissent. Canvas en dessine cinq, le DOM quatre.
- Les états ouvert/fermé du gantelet utilisent deux images et deux rectangles
  différents ; le boîtier change visuellement de taille pendant le fondu.
- Les textures de lames contiennent leur propre boîtier et doublonnent le
  gantelet. La sortie des lames est un morphing, pas une translation.
- Le trophée ne possède ni `corpseNeck`, ni `handGrip`, ni `beltHook` : il
  flotte entre la dépouille et le joueur.
- La course, le saut, la chute, la grimpe et l’extraction ne déplacent pas les
  membres. Seuls l’opacité du gantelet/des lames et les dreads réagissent.
- Les arbres sont écrasés de 40 à 45 % horizontalement. Les plateformes
  couronne et expédition sont fortement déformées et partagent une hauteur de
  collision générique malgré des surfaces praticables différentes.

### P2 — dette et contenu orphelin

- Les trois previews UI d’armure et `dreads/reference.webp` ne sont pas
  utilisées.
- `masks/hunter.webp` existe dans le registre V2 mais ne correspondait à aucun
  choix sauvegardable.
- Plusieurs silhouettes touchent le bord de leur fichier : pied du corps,
  haut du caster, côtés de certaines armures et bas des previews.

## Contrat V3

### Référentiel

- master auteur : `1024×1536`, zone sûre de 64 px, sol à `y=1472` ;
- export runtime : `256×384`, sol à `y=366` ;
- pose neutre orientée vers la droite, genoux fléchis, bras décollés du torse ;
- corps de base sans masque, dread, filet, pagne, plaque, arme ni trophée ;
- un asset runtime trimé conserve obligatoirement `sourceSize`, `sourceRect`,
  `pivot`, `attachTo` et son ordre Z ;
- le miroir gauche est appliqué uniquement à la racine du rig.

### Squelette

```text
root
└─ pelvis
   ├─ torso
   │  ├─ head → mask
   │  ├─ arm-front-upper → arm-front-lower → hand-front
   │  ├─ arm-back-upper → arm-back-lower → hand-back
   │  └─ caster-mount
   │     └─ caster-arm-upper
   │        └─ caster-arm-lower
   │           └─ yoke
   │              └─ cannon
   │                 └─ barrel → muzzle
   ├─ thigh-front → shin-front → foot-front
   └─ thigh-back → shin-back → foot-back
```

Le même solveur affine produit les matrices de l’aperçu et du Canvas. L’anchor
`muzzle` devient l’unique origine du canon, du recul, des trois lasers et du
projectile.

### Modules atomiques minimum

- anatomie : tête, torse, bassin, deux bras en trois parties, deux jambes en
  trois parties ;
- vêtement : filet et pagne segmentés comme les membres ;
- dreads : huit mèches ou petits groupes possédant chacun leur propre pivot ;
- armure : plastron, épaules, brassards, ceinture, cuisses, genoux, tibias ;
- biomask : coque indépendante de la tête ;
- plasmacaster : plaque dorsale, bras supérieur, bras inférieur, rotule,
  receiver, tube, bouche et émetteur laser ;
- gantelet : coque et couvercle ; le couvercle pivote autour de sa charnière ;
- wristblades : boîtier et deux lames ; les mêmes lames coulissent ;
- trophée : crâne, colonne et liens, attachables à la main ou à la ceinture.

## Bibliothèque de chasseurs

La V3 couvre 36 configurations visuellement distinctes. Les variations qui
partagent une morphologie deviennent des overlays de masque, plaques, trophées
ou armes ; elles ne dupliquent pas le squelette.

### Films et crossovers

Jungle Hunter, City Hunter, Greyback, Shaman, Lost/Borg, Snake, Warrior, Scar,
Celtic, Chopper, Antarctica Elder, Wolf, Berserker, Falconer, Tracker,
Fugitive, Assassin/Upgrade, Feral, Jotun, Oni, Warlord et Dek.

### Jeux vidéo

Scarface, Stone Heart, Alpha/Kaail, Samurai, Valkyrie, Cleopatra, Bionic et
Witch.

### Comics et romans

Broken Tusk/Dachande, Ahab, Big Mama, Bad Blood, Enforcer et Hashori.

Les continuités restent explicitement séparées :

- `canon` : branche cinéma *Predator* ;
- `crossover` : films *Alien vs. Predator* ;
- `expanded` : jeux, comics et romans licenciés ;
- `textInterpretation` : apparence non fixée visuellement dans le texte. C’est
  notamment le cas de Hashori ; la fiche ne doit pas prétendre qu’une couleur
  ou un masque inventé est canonique.

Les armes ou tenues provenant d’une figurine licenciée mais absentes du plan
de film sont signalées comme extensions, jamais comme observations à l’écran.

## Sources de référence principales

- 20th Century Studios :
  [Predator](https://www.20thcenturystudios.com/movies/predator),
  [Predator 2](https://www.20thcenturystudios.com/movies/predator-2),
  [Predators](https://www.20thcenturystudios.com/movies/predators),
  [The Predator](https://www.20thcenturystudios.com/movies/the-predator),
  [Killer of Killers](https://www.20thcenturystudios.com/movies/predator-killer-of-killers),
  [Badlands](https://www.20thcenturystudios.com/movies/predator-badlands).
- Production de *Prey* :
  [notes officielles](https://lumiere-a.akamaihd.net/v1/documents/prey_final_production_notes_bios_59_82be4e25.pdf).
- Accessoires et pièces séparées :
  [Jungle Hunter](https://store.necaonline.com/products/predator-ultimate-jungle-hunter-7-scale-action-figure),
  [Feral](https://necaonline.com/2023/05/prey-7-scale-action-figure-ultimate-feral-predator/),
  [Scar/Celtic/Chopper](https://necaonline.com/2015/07/closer-look-predator-series-14-alien-vs-predator-action-figures/),
  [Fugitive](https://necaonline.com/2018/06/predator-2018-7-scale-action-figure-ultimate-predator/),
  [Enforcer](https://necaonline.com/2014/08/closer-look-enforcer-predator-action-figure-from-series-12/),
  [Ahab](https://necaonline.com/2017/05/predator-7-scale-action-figure-ultimate-ahab-predator/).
- Jeux :
  [Hunting Grounds — Samurai](https://blog.playstation.com/2020/06/30/the-samurai-predator-arrives-in-predator-hunting-grounds/),
  [Valkyrie](https://blog.playstation.com/2021/02/16/new-year-new-mode-new-content-for-predator-hunting-grounds/),
  [Cleopatra](https://blog.playstation.com/2021/08/31/become-the-fearsome-cleopatra-with-this-months-new-additions-to-predator-hunting-grounds/).
- Comics/romans :
  [AVP original — Dark Horse](https://digital.darkhorse.com/books/47483ce0aec5466783599e38c9d0ac47/aliens-vs-predator-the-original-comics-series-30th-anniversary-edition),
  [Rage War — Titan Books](https://titanbooks.com/8140-predator-incursion-the-rage-war-1/).

## QA de sortie

- présence et poids réel de chaque asset ;
- canvas et rectangle source valides, aucun alpha interdit sur les bords ;
- pivots dans les limites de leur module ;
- montage identique DOM/Canvas à ±2 px ;
- visée testée à `-55°`, `0°` et `+40°` ;
- égalité stricte `projectile origin === laser origin === muzzle` ;
- états masque, gantelet, lames et trophée ;
- captures idle, course, saut, chute, grimpe et extraction ;
- validation des deux orientations et du changement de morphologie ;
- mesure du nombre de draw calls, mémoire décodée et 60 FPS mobile.

## État livré après correction

- `293` textures WebP V3 et `237` descripteurs géométriques sont générés sans
  asset orphelin ;
- les six corps utilisent chacun quinze parties anatomiques enregistrées sur
  un même canevas `256×384` ;
- les douze biomasks, huit familles de dreads, douze plaques d’armure, douze
  pièces technologiques, cinq textures d’armes, quatre outils et trois
  éléments de trophée possèdent un pivot et un point d’attache explicites ;
- le support d’épaule, les deux bras mécaniques, la rotule, le canon et le tube
  du plasmacaster suivent une chaîne articulée ; le canon, le laser et le tir
  partagent réellement l’ancre `muzzle` ;
- le gantelet conserve sa coque pendant l’ouverture du couvercle, et les deux
  lames sortent par translation depuis leur boîtier ;
- l’aperçu DOM et la mission Canvas consomment le même solveur et les mêmes
  matrices affines ;
- les arbres, lianes et plateformes conservent désormais le ratio natif de
  leur texture, tandis que leur surface de collision reste alignée au niveau
  praticable ;
- la sauvegarde V2 migre automatiquement vers le schéma V3.

Les 36 chasseurs sont des configurations documentées obtenues par combinaison
des modules V3. Il ne s’agit pas de 36 scans ou costumes officiels copiés :
les textures sont des créations originales pour ce projet de fan, et les
apparences dépourvues de référence visuelle canonique restent identifiées
comme interprétations.
