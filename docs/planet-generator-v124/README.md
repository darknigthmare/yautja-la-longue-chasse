# V124 — Calques régionaux indépendants pour les guerres de territoire

## Objectif et historique

Cette contribution complète le générateur procédural fusionné V102/V103/V115 sans changer la graine, les codes enregistrés, les territoires ou les routes. La PR V114/V115 livre déjà 120 modèles de formes, 32 matières terrestres et extraterrestres, les composantes atmosphériques et un pack de textures. Cette passe expose les structures internes de l'atlas comme de véritables ressources exportables et identifiables.

## Nouveaux calques PNG

| Calque | Taille | Contenu |
| --- | --- | --- |
| `region-index-map.png` | 1024 × 512 | Identifiant de la région sur chaque pixel de terre émergée, avec alpha nul pour la mer, les lacs et chenaux |
| `regional-atlas-atlas.png` | 2 ou 4 colonnes × 256 px, 1 à 3 lignes × 256 px | Les matières/biomes régionaux réellement chargés par le renderer WebGL, sans rendu alternatif |
| `lake-mask-map.png` | 1024 × 512 | Bassins intérieurs blancs sur fond transparent, uniquement lorsqu'ils existent |
| `river-mask-map.png` | 1024 × 512 | Chenaux blancs sur fond transparent, uniquement lorsqu'ils existent |

Les anciens calques `composite`, `albedo`, `land`, `surface`, `clouds`, `weather`, `atmosphere`, `night`, `aurora`, `emissive` et `mask` restent inchangés. Les nouveaux calques sont accessibles individuellement et dans l'export ZIP. Aucun fichier d'hydrologie fictif n'est ajouté aux planètes V102 sans bassins.

### Décodeur du masque régional

- Projection equirectangulaire, longitude -180° à +180°, latitude +90° au premier rang.
- Rouge R = indice de région (0-based) + 1, vert et bleu = 0, alpha A = 255 dans la région terrestre.
- R = 0, A = 0 hors terre : océans, bassins et chenaux.
- Les régions sont ordonnées comme `planet.regions` ; le manifeste mappe chaque indice à `regionId`, nom, biome, liste de territoires et colonne/ligne dans l'atlas.
- L'atlas conserve les tuiles réelles des biomes, et, sur V115, la texture de détail sélectionnée. Les matières sont déjà échantillonnées dans l'espace du monde par le renderer existant.

### ZIP V124

Le pack exporté contient `manifest.json`, les calques disponibles et `modularMasks` avec encodage, position des tuiles, biomes et hydrologie. La limite ZIP32 actuelle reste **16 fichiers** (15 PNG maximum + manifeste), **64 Mio** et annulation sans publier de fichier incomplet. Le pack ne contient aucune sauvegarde de campagne.

### Fichiers touchés

- `app/game/planetModularExportV124.ts` : codecs, masques et métadonnées.
- `app/game/planetMaterialRendererV101.ts` : export de l'atlas régional original déjà utilisé par le shader.
- `app/game/PlanetLayerExportV102.tsx` : téléchargement PNG et ZIP V124, avec dimensions natives des nouveaux calques.
- `tests/planet-modular-export-v124.test.mjs` et `.github/workflows/planet-v114.yml` : non-régressions ciblées.

## QA et preuves visuelles

Références visuelles avant modification : [éditeur V103](../planet-generator-v103/desktop-generator.png), [planisphère](../planet-generator-v103/desktop-atlas.png), [mobile](../planet-generator-v103/mobile-atlas.png), [galerie des matières](../planet-generator-v103/material-gallery-v103.png).

La modification ne touche pas au rendu visible par défaut, ni aux profils des planètes déjà ouvertes. Les nouveaux PNG doivent néanmoins être vérifiés sur un navigateur réel avec alpha, PNG et ZIP avant fusion. La validation CI et les nouvelles captures « après » doivent être rapportées séparément ; elles ne sont pas présumées acquises par les tests unitaires.

## Limites connues

Il s'agit de calques géographiques et d'albédo 2D, non d'un vrai terrain 3D PBR ou d'une simulation hydrologique. Le dessin des rivières suit les polygones V103/V115, sans courant physique, érosion en temps réel ou surcoût de franchissement. Les régions V115 partagent actuellement le même identifiant global de texture de détail, sur des biomes régionaux distincts. La prochaine étape de modularité profonde doit versionner une recette définissant des textures de détail différentes par région ; elle ne doit pas modifier rétroactivement les rendus des codes V115 existants.

## V125 — Taille du monde, 120 formes et bibliothèque de matières élargie

- **Échelle physique** : les six rayons V115 (1 900 à 21 000 km) restent des paramètres enregistrés dans le code V115. Le dossier calcule désormais l'emprise cartographique (km²) de chaque cellule-territoire, de chaque région et de chaque île/continent, ainsi que les routes physiques. Aucune nouvelle distance de mouvement ou durée de tour n'est imposée.
- **Formes** : les 120 modèles V115 existants restent utilisés (40 îles, 40 continents, 40 régions). Le catalogue intégral identifie chaque forme et ses paramètres de taille, lobes, nervures et excentricité dans le manifeste de reconstruction.
- **Bibliothèque supplémentaire** : 32 matières originales V125 (8 sols terrestres, 8 sols extraterrestres, 8 milieux terrestres, 8 milieux extraterrestres) sont exportables à la demande en PNG 512 × 512 ; chaque matière possède cinq canaux indépendants : albédo, hauteur, normales, rugosité et émission. Cela porte l'inventaire à **64 matières de base** (32 V115 dans le jeu + 32 sources additionnelles V125).
- **Compatibilité** : les 32 matières V125 ne remplacent pas silencieusement celles encodées dans les mondes V115. Leur branchement comme choix persistant par région requerra une nouvelle recette versionnée ; le bouton actuel exporte des sources indépendantes destinées aux futures régions.
- **Description** : chaque source fournit un nom, une famille terrestre/extraterrestre, un motif, un substrat descriptif, une rugosité et une émission. Les liquides extraterrestres sont fictifs et ne modifient pas automatiquement la physique, les dégâts ou le ravitaillement.

### Périmètre des surfaces

Les mesures V125 utilisent les polygones sphériques existants. Le total régional est la somme brute des cellules ; les bassins/chenaux internes sont conservés dans un calque séparé et non retranchés localement du chiffre de région. Les frontières et les revenus restent ceux du moteur stratégique. Sur V102/V103, aucun rayon ni km² fictif n'est assigné.

### QA

Le nouveau test `tests/planet-physical-material-v125.test.mjs` couvre les six tailles, les identités historiques, les 120 formes uniques et les 32 nouvelles textures avec génération de plusieurs canaux. Le navigateur teste le PNG de normales V125 et la présence des index V125 dans le ZIP. Les captures et résultats « après » sont produits par le workflow Chromium ; ils ne sont pas présumés réussis avant l'exécution.
