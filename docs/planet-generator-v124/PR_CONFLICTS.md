# Réconciliation des branches planétaires — 30 octobre 2026

## Réparation effectuée

- PR #32 était fermée sans fusion. La PR #33 y était encore empilée : base fragile et CI navigateur non concluante.
- Le contenu V124 a été reconstitué sans perdre aucun des sept fichiers d'origine, sur la tête de #31 (`fix/v122-planet-v103-v115-types-20261030`). Le nouvel historique propre est en avance directe de cette base.
- La PR #33 vise désormais #31 : ses changements de générateur V124–V125 restent distincts du correctif de compatibilité TypeScript V122.
- Le checkout partiel du job Chromium charge maintenant explicitement `public/game/assets/v15/trophies/manifest.json`, requis par l'application réelle.

## Ordre conseillé

1. Examiner et fusionner #31 (compatibilité V103/V115).
2. Retargeter #33 sur `main`, vérifier les contrôles GitHub et fusionner après validation navigateur et absence de conflit.
3. Réconcilier séparément #27 (personnalisation chromatique) : ses branches contiennent des variantes concurrentes de `PlanetGeneratorV103.tsx`, `clanWarDeploymentV103.ts` et `clanWarPlanetStrategyV114.ts`. Ne pas remplacer aveuglément la garde de version de #31.
4. #29, qui traite quatre types de missions de clans, n'a pas de fichier directement commun avec #33 dans le relevé actuel, mais doit conserver ses propres validations gameplay.

## Périmètre

La remise en ligne de #33 ne fusionne, ne ferme ni ne réécrit #27, #29 ou #31. Le conflit historique de base #32 → #33 est réparé ; les chevauchements potentiels des autres branches restent documentés et doivent être vérifiés à la fusion.