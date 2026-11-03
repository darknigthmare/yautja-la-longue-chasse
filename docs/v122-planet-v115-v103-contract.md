# V122 — Contrat partagé V103/V115 pour les guerres planétaires

Le job TypeScript de la PR #27 échouait sur dix erreurs V103/V115 introduites par les générateurs planétaires fusionnés. Les recettes V103 et V115 restent indépendantes et versionnées. Il ne faut ni réécrire les fichiers de campagne anciens ni convertir silencieusement une recette V103 en V115.

- Dans `PlanetGeneratorV103.tsx`, les propriétés de taille, forme et textures sont lues uniquement après vérification de la présence de `physical`, `shapes` et `materialDiversity` sur le modèle V115.
- Le dossier stratégique V114 accepte les deux types de planètes ; les kilomètres sont calculés **uniquement** sur les recettes ayant le rayon V115.
- Le déploiement `warDeploymentV103` est devenu un contrat structural limité aux positions et au plan stratégique communs, sans imposer `recipe.version=103`. Aucun équilibrage ou effectif n'est modifié.
- Test de régression V122 : un monde V103 et un monde V115 générés sont inspectés sans convertir l'un vers l'autre.
- Cette correction concerne la compilation des planètes ; elle ne certifie ni les textures PHG reconstituées ni leurs UV.
