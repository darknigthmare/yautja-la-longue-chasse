# Yautja Homeworld — Lot urbain V158 : admission prudente

Ce dossier suit le lot **HW1031 à HW1040**. La source des PNG est l'archive utilisateur `YAUTJA_HOMEWORLD_LOT_URBAIN_10_V158.zip`, livrée dans la conversation. **Les PNG ne sont pas stockés dans cette PR** : seul le manifeste vérifié, le contrôle reproductible, la liste du lot suivant et les tests d'intégrité sont versionnés.

## État réel

- 10 références de sprites indépendants dans l'archive ; **1 rendu source grand format (HW1031)** et **9 découpes de planches conceptuelles** de petite résolution.
- Métadonnées de chaque PNG : nom, dimensions, octets, SHA-256 et orientation proposée, observées sur l'archive locale.
- Les bordures transparentes ont été vérifiées localement à la création de l'archive. Le script contrôle les SHA et les en-têtes PNG en mode strict, **sans prétendre vérifier visuellement la fidélité**.
- Aucun candidat n'est chargé dans le moteur, placé, animé, ni approuvé 1:1. Les prérequis `groundFrame`, alpha réel, coordonnées au sol, collision, portes et accès PNJ restent ouverts.
- Le style reprend **l'adaptation visuelle du jeu** ; les objets ne sont **pas des reconstructions officielles 1:1** des films ou comics.

## Perspective verrouillée

Le moteur utilise une projection orthographique **yaw global = 0°, pitch = 35°** et une échelle de profondeur `sin(35°)`. Les façades biaisées doivent être **dessinées nativement** ; pas de rotation ni de miroir CSS au runtime. Les surfaces de sol projetées et les hauteurs verticales ne doivent pas être mises à la même échelle arbitrairement.

## Contrôle du paquet local

Extraire `YAUTJA_HOMEWORLD_LOT_URBAIN_10_V158.zip` dans un dossier comportant `sprites_png/`, puis lancer :

```bash
node scripts/verify-homeworld-v158.mjs
node scripts/verify-homeworld-v158.mjs --assets-dir /chemin/vers/lot-extrait
node --test tests/homeworld-v158-intake.test.mjs
```

Sans `--assets-dir`, le script vérifie **uniquement le manifeste et la compatibilité déclarée**. Le mode avec `--assets-dir` exige exactement les fichiers et hashes attendus. L'échec ou l'absence de PNG **ne doit jamais être converti en statut admis**.

## Étapes avant intégration jouable

1. Importer les dix PNG originaux dans le dépôt, avec métadonnées identiques.
2. Redessiner à résolution native les neuf cellules insuffisantes, dans les orientations réelles demandées, sans agrandissement artificiel.
3. Mesurer l'enveloppe alpha (seuils >= 24, 128), les appuis, les points de pivot, le `groundFrame`, les ouvertures et les socles.
4. Tester le moteur avec de **vraies routes PNJ**, une traversée des portes et des collisions ; comparer la taille à `adultHeight: 100`.
5. Fournir captures du vrai Homeworld et revue du lore, puis demander l'admission humaine. Aucun changement automatique de statut par un script.

## Travail suivant

`next-targets-v159.json` contient **10 besoins à produire**, pas 10 images nouvelles : drainage, ventilation, conduits, barrière volcanique, maintenance, passerelles basses et garde-corps. Ne pas confondre ces besoins avec les 35 PNG V114 déjà archivés et non admis.

La PR V158 est **séparée de la PR #97** de repositionnement des props : aucune modification de collision, placement, sauvegarde, freeze ni certificat de production.
