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

## Validation distante

Cette branche est validée avec le workflow PR complet avant retour sur sa base empilée #25.

## Dossier des 23 matières existantes

Le module `clanWarPlanetMaterialCodexV114.ts` inventorie les **13 biomes terrestres** et les **10 surfaces** de V103, sans toucher à leurs identifiants. Chaque entrée décrit son substrat, ses formes et une particularité explicite. Les régions du monde affiché sont résolues par leurs vrais `regionId` et leurs biomes publiés ; les informations figurent dans l’interface et l’export JSON sous `materialDossier`. Un bassin de sable, de spores ou de brume n’est pas présenté comme de l’eau liquide.

Les mentions de radioactivité, végétation, lave ou cristaux sont descriptives. Les coûts de déplacement, dégâts, traversées et revenus ne changent pas sans règle de simulation dédiée.

## Atmosphère et exports

Le rendu WebGL permet de découpler les aurores de la brume/météo. Les anciennes interfaces sans réglage d’aurore explicite conservent la composition historique ; les nouveaux contrôles de l’exporteur modifient seulement l’image assemblée. Les calques séparés (terre, mer, nuages, météo, aurore, scattering, nuit, émissif et masque) restent indépendants.

L’export ZIP32 contient les calques PNG disponibles, la recette canonique, le dossier stratégique et son manifeste. Il n’inclut **aucune sauvegarde de guerre**. Le module impose une taille bornée, des noms sûrs, des CRC32 et une annulation sans fichier partiel.

Un kit additionnel de **huit PNG originaux** (sept effets à alpha indépendant et un sol extraterrestre), avec versions WebP 512 et empreintes SHA-256, est archivé en dehors du dépôt et n’est **pas encore branché** comme texture de production. Ne pas supposer sa disponibilité sur le site déployé.

## Vérifications et limites restantes

Au commit `a7e9fb3`, le workflow ciblé V114 a réussi **26 tests**, et les quatre workflows secondaires étaient verts. Le groupe planétaire élargi avait réussi **268 tests** au contrôle précédent. Deux vérifications supplémentaires couvrent maintenant le catalogue des 23 matières et sa correspondance V102/V103 : les résultats des prochains workflows sont à contrôler avant fusion.

La QA mobile physique, les nouvelles captures « après » issues du client compilé et les textures additionnelles non intégrées restent à réaliser. Vercel signale un **quota de déploiements** atteint, et non une preuve de compilation ratée.
