# V141 — Gauntlet équipé visible dans la chasse réelle (HuntCanvas)

**Périmètre et branche :** [PR #42](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/42), toujours **draft** et empilée sur #40.

## Bug de cohérence corrigé

Avant V141, les écrans titre, armurerie et personnalisation utilisaient les **54 sprites de rig V139**, et les guerres de clans disposaient de leurs vues par modèle. **Le gameplay de la chasse active rendait encore le même gauntlet V3 générique**, quel que soit le modèle équipé.

V141 passe l'identité réellement équipée de `GameClient.tsx` au véritable `HuntCanvas.tsx`. Ce dernier :

1. Fige l'identité **au montage du niveau**, pour qu'une écriture de préférence depuis un autre onglet ne reconstruise pas la simulation de chasse en cours.
2. Charge `/game/assets/v139/rig-gauntlets/<id>/base.svg` et `lid.svg` avec `gauntletRigSpriteV139`.
3. **N'interrompt pas la chasse si un sprite individuel est manquant** : `loadGauntletRigPartV141` tente alors la source V3 préexistante `gauntlet-base.webp` / `gauntlet-lid.webp`.
4. Réutilise sans changement le squelette `armBackLower`, le pivot `HUNTER_GAUNTLET_HINGE`, l'ouverture progressive et les `wristblades` sur l'autre avant-bras.
5. Précharge uniquement les deux images cosmétiques **à l'initialisation des assets**, sans charge par frame et sans modifier aucune statistique, attaque, récompense, coût, munition, spawn ou IA.

Aucune écriture de guerre, aucun nouveau reçu de trophée ni réinitialisation de mission n'est déclenché par la sélection cosmétique.

## Tests et preuve nécessaire

- `tests/gauntlet-mission-v141.test.mjs` : sélection de chaque pièce pour **54×2=108 chargements simulés**, chemin invalide refusé, ressource absente/rejetée → fallback V3, séparation du bras avant, intégration source au runtime.
- La CI ciblée vérifie aussi la compilation et le lint du helper ; la CI élargie vérifie le TypeScript du vrai `HuntCanvas` et le build complet.
- **À faire pour une preuve navigateur du gameplay intégral :** lancer une véritable mission avec un gauntlet débloqué, vérifier les deux images V139 et les poses, entrer/sortir/reprendre la chasse, tester une source V139 volontairement indisponible et une préférence modifiée dans un autre onglet. Un test unitaire du loader et un build ne suffisent pas à certifier ce parcours.

## Compatibilité des gamemodes

Le gameplay de base de *Yautja : La Longue Chasse* reste celui du projet ; les guerres de clans et leurs quatre modes spéciaux sont séparés de la simulation de chasse. Aucun emprunt aux règles de stratégie d'`AVP Extinction` n'est introduit par l'apparence du gauntlet.

## Statut de la fidélité

- **327 SVG d'illustration** (219 armurerie, 108 rig) restent des créations et blockouts de travail. L'utilisation dans `HuntCanvas` n'est pas une approbation visuelle.
- Pour les cinq modèles informés par des sources, relire les accessoires véritables : gauche/droite, proportions, couleurs, inscriptions, attaches, matériaux et charnières.
- Pour les 49 modèles restants, les visuels sont des concepts **non canoniques** à remplacer si les œuvres fournissent de véritables plans du gauntlet.
- **0/54 gauntlets validés 1:1**, droits de franchise et revue humaine encore ouverts. Pas de merge dans `main` en l'état.

Les onglets du classeur V141 complètent la traçabilité : identité équipée dans le vrai moteur de chasse, chargement sécurisé et QA des 54 variantes.
