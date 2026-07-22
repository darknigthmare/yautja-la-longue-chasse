# Yautja : La Longue Chasse

Jeu d’action 2D side-scroller original et non commercial inspiré de l’univers
de *Predator*. Le joueur prépare son chasseur dans un vaisseau-hub, choisit ses
contrats et son arsenal, puis traque des proies dignes sur plusieurs planètes.

## Jouer

```powershell
npm.cmd install
npm.cmd run dev
```

Ouvrir ensuite `http://localhost:3000/`.

## Commandes

- `A/D` ou flèches : se déplacer
- `Z/S`, flèches haut/bas : grimper aux arbres, lianes et plateformes
- `Espace` : bondir / quitter une paroi
- `J` / clic : lames de poignet
- `Maj`, clic droit ou gâchette gauche : cadrer la visée plasma
- `1` / `2` : sélectionner l’une des deux armes du loadout
- `R` ou bouton View : passer à l’autre arme
- `K` ou gâchette droite : utiliser l’arme sélectionnée dans l’angle visé
- `M` : porter ou retirer le biomask
- `V` : scanner au biomask
- `C` : camouflage
- `H` : medicomp
- `3` / `4` ou pavé numérique `3` / `4` : utiliser les deux équipements
  tactiques du loadout
- `L3` / `R3` à la manette : utiliser respectivement l’équipement 1 ou 2
- appuyer sur `E` près d’une proie abattue puis rester immobile : extraction
  physique du trophée
- `Échap` : pause

La manette et des commandes tactiles sont également prises en charge. Les
boutons tactiles indiquent les charges et le cooldown restant de chaque
équipement.

Dans le vaisseau, `A/D` ou gauche/droite change de salle, haut/bas sélectionne
une action et `Entrée` la confirme. La croix directionnelle, `A` et `B` assurent
la même navigation à la manette.

## Mise à jour V6 — catalogue, mondes et menus jouables

- Le catalogue fourni est intégré sans perdre de ligne : 255 entrées tous
  médias, dont 210 individus jouables : 49 profils directs chargent leur plaque
  et leur kit documentés ; 161 restent explicitement signalés comme
  reconstructions modulaires guidées par leurs sources, jamais comme des
  reproductions individuelles exactes.
- La carte se parcourt en trois niveaux — galaxie, système, planète — avant
  d'afficher les missions du monde choisi. Le pont est aussi un menu physique
  latéral jouable au clavier, à la manette et au tactile.
- Chaque chasse couvre six secteurs continus et 8 400 pixels de monde, avec
  plateformes, grimpables, couvertures, sols traçables et dangers propres au
  biome. Le panorama jungle OpenAI fournit trois compositions distinctes.
- Les traces identifient joueur et ennemis. La prise d'un trophée est un rite
  de rythme, suivi d'une pose de victoire puis de l'arrivée, du stationnement et
  du départ réels de la navette au-dessus de la balise.
- L'armurerie inspirée d'un râtelier de vaisseau expose 43 cellules OpenAI
  transparentes : vaisseaux, faune, armes, équipements, biomasks, trophées,
  rangs et lasers. Le canon plasma et son bras articulé restent deux objets
  autonomes.
- Nettoyage, préparation, exposition et rite de trophée utilisent des mini-jeux
  à séquences, sans raccourci par un simple bouton de progression.

`npm.cmd run qa` reconstruit et audite aussi les 39 plaques cinéma avant de
valider le build et les tests fonctionnels.

## Mise à jour V4 — sept lots livrés

1. **Vaisseau-hub en six salles** : pont et carte, armurerie, salle des
   trophées, medbay, entraînement et archives. Le hub gère les rites et rangs
   du clan, quatre configurations équipement/apparence, ainsi que le nettoyage,
   le montage et l’exposition des trophées.
2. **Arsenal complet** : deux équipements actifs avec charges, cooldowns et
   effets en mission. Les armes, armures et équipements ont deux niveaux
   d’amélioration achetables avec les marques du clan ; leurs statistiques
   améliorées sont réellement appliquées au runtime.
3. **Chasse systémique** : vent variable, odeur transportée, bruit, traces
   dépendantes du sol, boue et eau, pièges, camouflage thermique et dangers
   environnementaux participent à la détection.
4. **IA coordonnée** : les humains, bêtes et Yautja hostiles enquêtent,
   recherchent, partagent l’alerte, utilisent les couvertures et peuvent
   battre en retraite selon leur état.
5. **Trois mondes à routes multiples** : chaque planète possède trois
   itinéraires, au moins six éléments grimpables, des emplacements de pièges et
   ses propres dangers. Les checkpoints dépendent de la difficulté.
6. **Trois boss spécifiques** : Vey utilise fusées, renforts et duel rapproché ;
   le Cryostalker Alpha perd ses plaques contre les piliers et appelle sa
   meute ; le Bad Blood impose un duel, verrouille l’énergie et déclenche une
   purge à interrompre sur trois consoles.
7. **Audio, accessibilité, visuels et tests V4** : ambiances procédurales par
   lieu, mix séparé musique/effets, secousses désactivables, violence atténuée,
   contraste renforcé, quatre fonds, sept personnages ennemis V4 et six
   éléments de décor jungle modulaires. La commande
  `npm.cmd run qa` valide le build et l’ensemble des tests automatisés.

Le détail du parcours, des routes, des boss et des validations se trouve dans
[docs/MISE-A-JOUR-V4.md](docs/MISE-A-JOUR-V4.md).

## Rig modulaire V3

Tous les éléments du chasseur partagent maintenant un canevas runtime
`256×384`, une ligne de sol commune et le même squelette affine :

- six morphologies de corps découpées en quinze parties anatomiques ;
- filet segmenté avec les mêmes articulations ;
- douze biomasks, huit familles de dreadlocks et cinq familles d’armure ;
- plasmacaster en huit pièces : support, bras supérieur, bras inférieur,
  rotule, canon, tube, bouche et laser ;
- gantelet avec boîtier et couvercle séparés ;
- boîtier de wristblades et lames coulissantes séparés ;
- combistick déployé/replié, smart-disc, arc et flèche attachés aux mains ;
- netgun, capteur de mouvement, leurre audio et piège attachés à la ceinture ;
- crâne, colonne et liens de trophée séparés, transportables à la main ou à la
  ceinture ;
- une origine `muzzle` unique pour le canon, le laser, le réticule et le
  projectile.

Le catalogue propose 53 configurations documentées : 39 plaques cinéma ou
animation regroupées film par film, puis 14 entrées séparées pour les jeux,
comics et romans. Chaque chasseur cinéma possède une plaque OpenAI corps entier,
un prompt individuel et au moins deux références quand elles sont disponibles.
Une fiche indique sa continuité, ses sources et les approximations éventuelles.

L’[audit complet de modularité](docs/AUDIT-MODULARITE-V3.md) décrit les défauts
de la V2, le contrat géométrique V3 et les références utilisées.
La [mise à jour des plaques cinéma V5](docs/MISE-A-JOUR-V5-PLAQUES-CINEMA.md)
documente le nouveau pipeline et l’archive chronologique.

## Contenu jouable

- vaisseau-hub en six salles, carte galactique, armurerie, personnalisation,
  atelier et salle des trophées, medbay, entraînement et codex ;
- trois chasses scénarisées avec biomes, cibles et boss distincts ;
- neuf routes réparties entre jungle lacustre, cryomonde et sanctuaire
  volcanique, avec arbres, lianes, parois, cordes, chaînes et plateformes ;
- cinq armes, quatre équipements, trois armures et quatre difficultés ;
- biomask, scanner, camouflage, medicomp, visée plasma et extraction de
  trophées ;
- systèmes de perception, IA coordonnée, pièges, améliorations, checkpoints,
  honneur, rangs, prises multiples, sauvegarde locale versionnée et rejeu.

## Développement et validation

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd run qa
npm.cmd run film-plates:references
npm.cmd run film-plates:normalize
npm.cmd run film-plates:build
npm.cmd run film-plates:audit
npm.cmd run film-plates:contact-sheets
```

La vérification V4 exécute le lint, le build de production et l’ensemble des
tests automatisés via `npm.cmd run qa`.

Les textures V3 sont des créations pixel-art originales générées avec OpenAI,
puis détourées et normalisées par `scripts/prepare-v3-assets.py`. Les atlas
source sont conservés dans `art-source/v3`.

Les quatre environnements, les sept personnages ennemis V4 et les six
textures de décor jungle modulaires sont également des
créations originales générées avec OpenAI pour ce projet. Les sources, exports
runtime et prompts finaux sont conservés prompt par prompt dans
[`art-source/v4`](art-source/v4/README.md), avec un journal séparé pour les
[`ennemis V4`](art-source/v4/enemies/README.md). Le jeu ne contient pas de
textures, captures ou sprites officiels extraits des films ou des jeux.

Les 39 plaques cinéma V5, leurs références, leurs prompts individuels et leur
manifeste sont documentés dans
[`art-source/v5/film-plates`](art-source/v5/film-plates/README.md).

*Predator* et *Yautja* appartiennent à leurs ayants droit. Ce projet privé de
fan, non commercial, n’est ni officiel, ni affilié à 20th Century Studios ou
Disney.
