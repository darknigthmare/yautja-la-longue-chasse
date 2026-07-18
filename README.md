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
- `K` ou gâchette droite : tirer dans l’angle visé
- `M` : porter ou retirer le biomask
- `V` : scanner au biomask
- `C` : camouflage
- `H` : medicomp
- maintenir `E` près d’une proie abattue : extraction physique du trophée
- `Échap` : pause

La manette et des commandes tactiles sont également prises en charge.

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

Le catalogue propose 36 configurations documentées issues des films,
crossovers, jeux, comics et romans. Une fiche indique sa continuité, ses
sources et les approximations éventuelles. Les chasseurs sans design visuel
officiel, comme une apparition uniquement décrite en prose, restent
explicitement marqués comme interprétations.

L’[audit complet de modularité](docs/AUDIT-MODULARITE-V3.md) décrit les défauts
de la V2, le contrat géométrique V3 et les références utilisées.

## Contenu jouable

- vaisseau-hub, carte galactique, armurerie, personnalisation, mur de trophées
  et codex ;
- trois chasses scénarisées avec biomes, cibles et boss distincts ;
- jungle lacustre multi-plan avec arbres, lianes et plateformes grimpables ;
- cinq armes, quatre équipements, trois armures et quatre difficultés ;
- biomask, scanner, camouflage, medicomp, visée plasma et extraction de
  trophées ;
- système d’honneur, rangs, prises multiples, progression, sauvegarde locale
  versionnée et mode de rejeu.

## Développement et validation

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd run qa
```

Les textures V3 sont des créations pixel-art originales générées avec OpenAI,
puis détourées et normalisées par `scripts/prepare-v3-assets.py`. Les atlas
source sont conservés dans `art-source/v3`; le jeu ne contient pas de fichiers
officiels extraits des films ou des jeux.

*Predator* et *Yautja* appartiennent à leurs ayants droit. Ce projet privé de
fan, non commercial, n’est ni officiel, ni affilié à 20th Century Studios ou
Disney.
