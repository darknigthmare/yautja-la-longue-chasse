# Lot V7 — humanoïdes et Bad Blood animés

Ce lot contient dix ennemis originaux : cinq humains armés et cinq chasseurs
Bad Blood. Chaque export runtime est une planche PNG RGBA de `1536×192`,
divisée en six cellules fixes de `256×192` dans l'ordre `idle`, `walk-a`,
`walk-b`, `attack`, `hit`, `death`. Tous les sujets vivants regardent vers la
droite.

Les bitmaps ont été créés avec l'outil intégré OpenAI `image_gen`. Les pages
consultées ont servi à comprendre les silhouettes, les fonctions des armes et
les matériaux de l'univers ; aucun bitmap officiel n'est inclus ni recopié.
Les dix designs sont des créations de fan originales destinées au projet.

## Chaîne de production

Les deux masters ont été demandés comme grilles invisibles de cinq rangées et
six colonnes sur un fond parfaitement uni `#ff00ff`, sans sol, ombre, texte,
logo, bordure ou effet atmosphérique. Le fond a ensuite été retiré avec le
helper officiel du skill `imagegen` :

```text
remove_chroma_key.py --auto-key border --soft-matte \
  --transparent-threshold 12 --opaque-threshold 220 --despill
```

Chaque pose a enfin été isolée puis recentrée dans sa propre cellule. Une même
échelle est appliquée aux six poses d'un ennemi ; aucune arme, lame ou portion
de filet ne déborde dans la cellule voisine.

## Références consultées

- [*Predators* — 20th Century Studios](https://www.20thcenturystudios.com/movies/predators)
- [Manuel *Aliens Versus Predator Classic 2000*](https://cdn.akamai.steamstatic.com/steam/apps/3730/manuals/Aliens%20Versus%20Predator%20Classic%202000%20Manual.pdf?t=1415299874)
- [Manuel *Alien vs Predator* Jaguar](https://www.digitpress.com/library/manuals/jaguar/alien%20vs%20predator.pdf)
- [Site officiel *Predator: Hunting Grounds* — IllFonic](https://predator.illfonic.com/)
- [Mise à jour OWLF de *Hunting Grounds* — PlayStation Blog](https://blog.playstation.com/2020/08/19/predator-hunting-grounds-august-update/)
- [Équipement de chasse Yautja — AvP Central](https://www.avpcentral.com/predator-equipment-and-hunting-gear)
- [Armes Yautja conçues par Wētā Workshop](https://wetaworkshopdesignstudio.artstation.com/projects/rlxRPa)
- [Index de la série *Predator: Bad Blood* — Grand Comics Database](https://www.comics.org/series/42029/)

## Dix entrées et prompts

| ID | Catégorie | Prompt spécifique | Références principales |
| --- | --- | --- | --- |
| `colonial-marine` | humanoïde | Infanterie humaine originale en armure segmentée olive, casque ouvert, radio dorsale et fusil caseless rétrofuturiste compact avec lanceur inférieur ; six poses latérales cohérentes vers la droite. | [Manuel AvP Classic](https://cdn.akamai.steamstatic.com/steam/apps/3730/manuals/Aliens%20Versus%20Predator%20Classic%202000%20Manual.pdf?t=1415299874), [manuel Jaguar](https://www.digitpress.com/library/manuals/jaguar/alien%20vs%20predator.pdf) |
| `owlf-commando` | humanoïde | Opérateur anti-extraterrestre original en combinaison anthracite résistante à la chaleur, harnais de capteurs, casque scellé à oculaire bleu, carabine lourde silencieuse et scanner d'épaule ; six poses. | [IllFonic](https://predator.illfonic.com/), [PlayStation Blog](https://blog.playstation.com/2020/08/19/predator-hunting-grounds-august-update/) |
| `colonial-sniper` | humanoïde | Tireur humain original en armure légère sable/olive, capuche, visière étroite, long fusil magnétique de précision, bipied replié et sac minimal ; six poses. | [Manuel AvP Classic](https://cdn.akamai.steamstatic.com/steam/apps/3730/manuals/Aliens%20Versus%20Predator%20Classic%202000%20Manual.pdf?t=1415299874), [IllFonic](https://predator.illfonic.com/) |
| `frontier-raider` | humanoïde | Récupérateur humain original en armure pressurisée rapiécée rouille/brune, plaques asymétriques, foulard respiratoire, fusil à tambour court et couperet utilitaire ; six poses. | [*Predators*](https://www.20thcenturystudios.com/movies/predators), [IllFonic](https://predator.illfonic.com/) |
| `corporate-heavy` | humanoïde | Gunner humain original très large en armure industrielle motorisée blanc cassé/graphite, accents rouges sans logo, harnais de munitions et canon rotatif intelligent ; six poses. | [Manuel Jaguar](https://www.digitpress.com/library/manuals/jaguar/alien%20vs%20predator.pdf), [manuel AvP Classic](https://cdn.akamai.steamstatic.com/steam/apps/3730/manuals/Aliens%20Versus%20Predator%20Classic%202000%20Manual.pdf?t=1415299874) |
| `bad-blood-duelist` | Bad Blood | Rogue extraterrestre original fin et rapide, peau ocre, armure bronze/noire asymétrique, biomask étroit, aucun canon et deux lames courbes ; double entaille ; six poses. | [*Bad Blood*](https://www.comics.org/series/42029/), [équipement Yautja](https://www.avpcentral.com/predator-equipment-and-hunting-gear) |
| `bad-blood-plasma-gunner` | Bad Blood | Rogue massif sous lourde armure noire/gunmetal, biomask renforcé, canon plasma d'épaule surdimensionné et répétiteur plasma à deux mains ; six poses. | [Wētā Workshop](https://wetaworkshopdesignstudio.artstation.com/projects/rlxRPa), [manuel AvP Classic](https://cdn.akamai.steamstatic.com/steam/apps/3730/manuals/Aliens%20Versus%20Predator%20Classic%202000%20Manual.pdf?t=1415299874) |
| `bad-blood-netmaster` | Bad Blood | Trappeur rogue original, peau olive, armure de cuivre hérissée, demi-masque, bobine dorsale, projecteur de filet et lance de récupération ; filet contenu dans la cellule d'attaque ; six poses. | [Équipement Yautja](https://www.avpcentral.com/predator-equipment-and-hunting-gear), [Wētā Workshop](https://wetaworkshopdesignstudio.artstation.com/projects/rlxRPa) |
| `bad-blood-cloaked-stalker` | Bad Blood | Rogue furtif très mince montré décloqué et opaque, peau grise, plaques argent/anthracite, biomask lisse, nœuds de cape et longues wristblades ; six poses. | [Équipement Yautja](https://www.avpcentral.com/predator-equipment-and-hunting-gear), [manuel AvP Classic](https://cdn.akamai.steamstatic.com/steam/apps/3730/manuals/Aliens%20Versus%20Predator%20Classic%202000%20Manual.pdf?t=1415299874) |
| `bad-blood-trophy-butcher` | Bad Blood | Rogue énorme, peau brun rouille, lourde armure rouge sanglée d'os secs, biomask large fissuré, trophées sans gore et gigantesque hache-couperet ; six poses. | [*Bad Blood*](https://www.comics.org/series/42029/), [équipement Yautja](https://www.avpcentral.com/predator-equipment-and-hunting-gear) |

## Prompt commun des masters

```text
Use case: stylized-concept
Asset type: production-ready 2D side-scroller enemy animation master sprite sheet
Primary request: ONE 1536x1024 master containing exactly five original enemies, arranged as five fixed horizontal rows and six fixed animation columns.
Scene/backdrop: perfectly flat and uniform solid #ff00ff chroma-key background; no floor.
Style/medium: richly detailed hand-painted pixel-art game sprites, dark retro-futurist science fiction, crisp silhouette, sharp outline, weathered hard-surface and fabric/skin texture; original fan-made artwork only.
Composition/framing: precise invisible 6 x 5 grid; one identity per row; columns are idle, walk contact A, walk passing B, signature attack, hit recoil, defeated pose; full body, strict orthographic side view facing right, consistent baseline and scale, generous empty padding.
Lighting/mood: neutral upper-left sprite lighting, ominous but readable, no cast shadow.
Constraints: exactly 30 sprites; no overlap or crop; same identity and equipment across a row; no labels, text, visible grid, frame, border, watermark or logo; background without shadow, gradient, texture, reflection, atmosphere or variation; no magenta in subjects.
```

Le master humanoïde ajoutait, dans l'ordre des rangées, les briefs de
`colonial-marine`, `owlf-commando`, `colonial-sniper`, `frontier-raider` et
`corporate-heavy`. Le master Bad Blood ajoutait `bad-blood-duelist`,
`bad-blood-plasma-gunner`, `bad-blood-netmaster`,
`bad-blood-cloaked-stalker` et `bad-blood-trophy-butcher`.

## Fichiers

- masters chroma : `masters/openai-humanoids-chroma-master.png` et
  `masters/openai-bad-bloods-chroma-master.png` ;
- masters RGBA détourés : `masters/openai-humanoids-alpha-master.png` et
  `masters/openai-bad-bloods-alpha-master.png` ;
- exports runtime :
  `public/game/sprites/v7/enemies/humanoid-badblood/*-sheet.png` ;
- métadonnées d'intégration : `manifest.fragment.json`.
