# Enemy Trophy Gameplay V18

V18 transforme mécaniquement les 203 cutouts transparents validés du bestiaire
V17 en exports légers utilisables par le Canvas, le mur des trophées et
l’atelier.

## Autorité et séparation

- L’unique autorité visuelle est le manifeste runtime
  `public/game/assets/v17/enemy-trophies/manifest.json`.
- Les 203 identités de trophées et les 228 `enemyIds` restent inchangés.
- Aucun asset V16 de l’archive franchise n’est admis dans ce pipeline.
- V18 ne lance aucune génération d’image et ne modifie aucun fichier V17.
- Le manifeste public ne contient ni prompt, ni chemin `art-source`.

## Transformation déterministe

Le script `scripts/build-enemy-trophy-gameplay-v18.mjs` vérifie le hash V17,
recadre selon les bornes déjà auditées, conserve une marge source de quatre
pixels, réduit le contenu à 224 pixels au plus avec un noyau nearest-neighbor,
puis le centre sur un canevas transparent de 256 × 256 pixels. L’export est un
WebP lossless avec alpha. Six transformations peuvent s’exécuter en parallèle ;
l’ordre du manifeste et le contenu produit restent déterministes.

Le `partId` reste compatible avec le contrat de claim existant :

- biomask ou masque : `mask` ;
- anatomie dure : `skull`, ou `skull-and-spine` lorsque la prise inclut
  explicitement une colonne ;
- anatomie souple, botanique, équipement et relique : `insignia`.

L’entrée V7 `enemy-trophy-optique-balistique` reçoit explicitement `insignia` :
il s’agit d’une optique récupérée, jamais d’un crâne.

`objectKind` demeure l’autorité sémantique précise ; `partId` sert seulement à
la compatibilité avec les animations et sauvegardes existantes.

## Validation

Exécuter :

```text
node scripts/build-enemy-trophy-gameplay-v18.mjs
node scripts/audit-enemy-trophy-gameplay-v18.mjs
node --test tests/enemy-trophy-gameplay-v18.test.mjs
```

L’audit vérifie la couverture 203/228, l’unicité, les hashes, l’alpha, les
coins transparents, la marge de sécurité, l’absence de frange chroma visible,
la provenance V17 et l’exclusion stricte de V16.
