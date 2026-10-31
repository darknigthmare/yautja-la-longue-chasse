# V131 — Matériaux régionaux PBR et influence côtière physique

Continuation directe dans la **PR #39**, héritière de #33 et #31. Le moteur canonique des planètes et ses sauvegardes V102/V103/V115 ne sont pas réécrits. Les 120 formes paramétriques (40 îles + 40 continents + 40 régions) et les 48 matières complémentaires V125/V130 restent disponibles.

## Ce qui fonctionne

- **Étude PBR/WebGL réellement jouée dans le générateur** : l’albédo territorial V129 reste une source distincte ; les quatre canaux hauteur, normales, rugosité et émission sont encodés dans deux atlases GPU partagés entre les sols et les milieux. L’éclairage emploie un BRDF diélectrique GGX simplifié, les normales locales, la microcavité estimée depuis la hauteur et l’émission de la source.
- **Milieux localisés** : une matière régionale d’eau/acide/glace/lave/saumure est visible uniquement près des côtes et des bassins *déjà existants*. Le masque de terrain du jeu est la source des cellules de départ, les indices de régions n’ont aucune nouvelle frontière politique. Sur le reste des océans, le milieu natif demeure ; aucune nappe d’eau n’est inventée pour les planètes de sable, spores, cristaux, brume ou nappes irradiées.
- **Distance physique** : propagation géodésique approchée en kilomètres par distance de grille avec longitude périodique, limite de 300/900/1 800 km réglable. Les six tailles V115 1 900–21 000 km emploient le vrai rayon du monde. Pour les mondes V102/V103 sans rayon, rayon terrestre **explicitement approximatif** 6 371 km (pas une fausse mesure canonique).
- **Ressources** : un seul contexte WebGL partagé, pas d’animation permanente, atlases CPU en cache limité, pack GPU réutilisable, textures de base et masque original inchangés. Sur GPU avec moins de 10 unités de texture ou trop petites résolutions d’atlas, la comparaison albédo V129 reste disponible ; aucune prétention PBR n’est faite dans ce secours.
- **Comparaison et export** : bouton dans « Kit indépendant par région », choix PBR/albédo, carte/globe, rayon côtier en km, PNG de l’aperçu et ZIP source V128 des cinq canaux.

## Fidélité et limites explicites

Le rendu reprend les mêmes territoires, hydrologie, biomes, masque terrestre et géolocalisation que l’atlas du jeu, pas une géographie inventée. L’influence maritime n’est **pas un océan politique** : elle signifie seulement la portée d’une matière côtière locale. Les frontières de l’influence sont des transitions visuelles expérimentales et peuvent nécessiter un fondu plus progressif.

Le BRDF ne modélise pas encore la vraie réfraction, la géométrie déplacée, un métalness certifié, les vagues hydrodynamiques ou les caustiques, et ne prouve **aucune identité visuelle pixel-à-pixel 1:1 avec une œuvre Predator/AVP**. Toutes les textures V125/V130 sont des études originales et doivent demeurer étiquetées comme telles.

Pour revendiquer le 1:1 : fournir la référence sous licence adéquate, cadrage, point de vue, échelle, palette, comparaison d’alpha/UV et capture de jeu, puis archiver la preuve par matière. Aucune validation artistique de cet ordre ne peut être inventée.

## Tests

- `tests/planet-coastal-regions-v131.test.mjs` : source géographique, antimeridien, distance selon le rayon, absence d’éléments liquides fabriqués, rejet des masques forgés.
- `tests/planet-regional-pbr-v131.test.mjs` : séparation des canaux PBR dans les budgets WebGL1.
- `scripts/qa-planet-region-kit-v128.mjs` : contrôle dans Chromium du shader V131 réel, changement visible des matières de sol et milieu, comparaison albédo, globe et export PNG/ZIP, conservation du code de planète et captures d’écran.
- `.github/workflows/planet-v114.yml` : tests Node, ESLint, navigateur et ZIP.

L'ordre de fusion demeure **#31 → #33 → #39**. Ne pas fusionner #39 directement dans main à la place de ses dépendances.
