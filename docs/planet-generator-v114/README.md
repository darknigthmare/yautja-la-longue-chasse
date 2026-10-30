# Planètes V114 — lecture stratégique et profils modulaires

## Reprise

Cette passe repart du générateur V103 fusionné et conserve strictement son format de code. Les profils V114 sont des raccourcis d’édition : ils ne changent jamais l’identité d’un monde existant tant que le joueur ne génère pas un nouveau brouillon.

### État visuel de référence

- [Générateur V103 desktop](../planet-generator-v103/desktop-generator.png)
- [Atlas V103 desktop](../planet-generator-v103/desktop-atlas.png)
- [Atlas V103 mobile](../planet-generator-v103/mobile-atlas.png)
- [Galerie des matières terrestres / extraterrestres](../planet-generator-v103/material-gallery-v103.png)

Ces captures restent le avant de cette passe. Les zones modifiées sont le panneau de composition (profils), la fiche d’identité (distance/étranglements) et le dossier sous l’atlas (lecture stratégique par région).

## Nouveaux profils

### 6 formats stratégiques

1. Escarmouche — 18 territoires / 3 régions.
2. Frontière — 24 / 4.
3. Campagne — 36 / 6.
4. Archipel — 48 / 8.
5. Continental — 72 / 12.
6. Grande guerre — 96 / 12.

Les verrous existants restent prioritaires. Le moteur conserve la règle minimale de trois territoires par région.

### 8 ambiances

Terrestre océanique, jungle humide, désert minéral, monde cryogénique, volcanique, toxique irradié, cristallin alien et fongique alien. Elles ne changent pas le nombre de territoires, les régions ni les formes terrestres : elles ne pilotent que les biomes, mers, textures, palettes et atmosphères existantes.

## Dossier stratégique dérivé

Le nouveau module clanWarPlanetStrategyV114.ts analyse uniquement la carte publique :

- distance entre les deux bases ;
- chemin public le plus court ;
- points d’articulation du graphe ;
- traversées issues des routes V103 ;
- voisins de chaque région ;
- accès interrégion ;
- revenus de base S/M/I ;
- bases présentes par région.

Aucun stock, roster ou renseignement ennemi caché n’est consulté.

## Compatibilité

- codes V102 et V103 inchangés ;
- V102 reçoit aussi un dossier stratégique dérivé ;
- correctifs d’ordre d’import de la PR #25 conservés, car cette PR est empilée sur sa branche ;
- aucune modification des textures V103 : les sources terrestres et extraterrestres déjà fusionnées restent réutilisées.

## QA ajoutée

tests/planet-strategy-v114.test.mjs couvre les 6 profils, les 8 ambiances, la validité des recettes, la conservation des verrous de matière, les revenus par région, les points d’étranglement et un monde V102 historique.

Le test est ajouté au groupe planétaire du workflow audit-v94.yml.
