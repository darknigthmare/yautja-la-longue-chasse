# V128 — kits de matières indépendants par région

## Objet

Cette extension se greffe sur la PR #33 (V124–V125). Elle transforme la bibliothèque supplémentaire de 32 matières en un pipeline d'assets **attribués par région**. Chaque région reçoit une proposition cohérente avec son biome, une graine stable et ses propres choix manuels.

Le format est un **sidecar visuel V128**, jamais une migration implicite des codes de mondes V102/V103/V115. Les terres, côtes, routes, objectifs, sauvegardes et coûts de guerre ne sont pas modifiés.

## Fidélité des environnements

- Les 13 biomes terrestres possèdent une liste curatée de matériaux cohérents avec leurs sols, dont les matières terrestres et les propositions extraterrestres originales.
- Une région désertique ne reçoit pas de pergélisol, tandis qu'une région gelée peut recevoir des fractures glaciaires et de la banquise lorsqu'une eau est présente.
- Dix catégories de surface sont conservées. Aucun liquide supplémentaire n'est proposé pour les champs de sable, de cristaux, de spores, de brume ou pour les nappes irradiées sans définition pertinente.
- Une palette/texture n'est pas présentée comme une nouvelle physique ni un effet de gameplay.

## Contrat du kit

Le module `app/game/systems/clanWarRegionalMaterialKitV128.ts` fournit :

- attribution déterministe par `worldCode`, `regionId`, `biome` et `seed` ;
- listes de compatibilité pour les matières de sol et de surface ;
- édition indépendante d'une région sans altérer les autres ;
- validation stricte contre les codes étrangers, entrées forgées et mélanges incohérents ;
- dossier de provenance exploitable pour les futurs éditeurs de planète.

Le module `app/game/planetRegionKitRasterV128.ts` utilise exactement le masque catégoriel V124 de la planète et extrait le masque de la région active, au format planisphère RGBA blanc/transparent.

## Export

Dans « Exporter les textures par calque » → « Kit indépendant par région » : choisir une région, une matière terrestre et, si compatible, une matière de surface. Le bouton ZIP exporte :

- cinq canaux **256×256 PNG** pour le sol (albédo, hauteur, normales, rugosité, émission) ;
- cinq canaux supplémentaires pour une surface compatible, sinon aucun liquide inventé ;
- le masque régional transparent **512×256 PNG** ;
- un `manifest.json` contenant `worldCode`, `regionId`, biome, graine, matériaux, chemins et attribution de toutes les régions.

Le ZIP contient 7 ou 12 fichiers, dans la limite du codec ZIP32 V114 (16 entrées, 64 Mio). Les changements de région dans l'éditeur n'affectent ni le rendu historique, ni les sauvegardes de guerre. Il s'agit d'un **kit d'assets exportable**, pas encore d'un shader PBR régional utilisé automatiquement en jeu.

## QA

- `tests/planet-region-material-kit-v128.test.mjs` : variations 18/96 territoires, compatibilité de 13 biomes et 10 surfaces, monde historique V102, édition indépendante, rejets stricts.
- `scripts/qa-planet-region-kit-v128.mjs` : navigateur réel V115, sélection de deux régions, PNG normaux, masques indépendants, ZIP, manifeste, code du monde conservé, capture desktop et mobile.
- Workflow : `.github/workflows/planet-v114.yml` (suite V114/V124/V125 + V128).

## Restant à réaliser

- Liaison au renderer PBR régional de production par une **recette V129** explicitement versionnée (aucune réécriture du format V115).
- Réglages physiques complets de surface, débit et interactions spécifiques au biome : non simulés par ce kit.
- Vérification visuelle sur GPU mobile physique et validation des huit PNG sources additionnels non encore présents dans le dépôt.

## Documentation et avant/après

Avant : [galerie V103](../planet-generator-v103/material-gallery-v103.png) et [éditeur V125 de la PR #33](../planet-generator-v124/README.md).

Après : les captures `after-v128-regional-kit-desktop.png` et `after-v128-regional-kit-mobile.png` sont produites par le workflow navigateur et conservées comme artifacts GitHub Actions ; ne pas les présenter comme validées avant la réussite du workflow.
