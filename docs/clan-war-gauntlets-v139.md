# V139 — 54 gauntlets sur le rig du personnage (PR #42)

**Branche :** `feat/v131-gauntlet-hologram-dual-view-20261030` ; toujours une PR en brouillon empilée sur #40.
**Classeur de référence :** [Yautja_Gauntlets_V139_Arsenal_Clans.xlsx](Yautja_Gauntlets_V139_Arsenal_Clans.xlsx), 39 onglets.

## Objet et portée réelle du lot

Avant la V139, l'ordinateur de poignet du personnage `HunterRigPreview.tsx` appliquait seulement une teinte à **une coque de base commune**, même si l'armurerie et la vue Guerre des clans disposaient de 54 études visuelles plus détaillées.

La V139 introduit **108 fichiers SVG de rig indépendants** sous `public/game/assets/v139/rig-gauntlets/<id>/{base,lid}.svg` : un boîtier et un capot par chacune des 54 identités. Ils possèdent tous les mêmes dimensions de registration, mais leur habillage, volume de coque, formes de commandes, reliefs et écrans sont individualisés. Le boîtier est attaché à `armBackLower`, avec le capot sur la même articulation et l'axe (51, 202). Les wristblades du bras opposé ne sont pas remplacées.

**Important :** ces 108 SVG sont des **créations vectorielles provisoires**, souvent générées de manière déterministe à partir de l'identité et de la famille visuelle. Elles ne sont pas une reconstitution certifiée des accessoires du film ou des jeux. Leur présence clôt les tâches techniques « sprite individuel + raccordement au rig », mais PAS les tâches artistiques « fidèle 1:1 ».

Les 219 calques précédents (grande vue armurerie) sont conservés, ce qui porte le nombre à **327 sources SVG** : 219 de présentation + 108 d'animation sur le chasseur.

## Runtime et générateur

- `app/game/systems/gauntletRigSpritesV139.ts` : chemin normalisé vérifiant la présence de l'identité dans le catalogue. Une identité inconnue ou un chemin hostile revient au Jungle Hunter.
- `app/game/HunterRigPreview.tsx` : `registeredLayer(gauntletRigSpriteV139(id,"base"),gauntletMatrix,64,`gauntlet-base`)` et `registeredLayer(gauntletRigSpriteV139(id,"lid"),lidMatrix,65,`gauntlet-lid`)`. Un nouveau `data-gauntlet-visual-validation` évite d'affirmer une certification inexistante.
- `scripts/build-gauntlet-rig-v139.mjs --check` : reconstruction déterministe du code source et contrôle des **108 SVG**. `--png outputs/gauntlet-v139-rig` produit les 108 PNG alpha et un manifeste SHA.
- `app/game/GauntletRigInspectionV139.tsx` : outil d'inspection local, dans la galerie V136, des calques réellement affichés au poignet (modèle, base, couvercle et pivot). Il représente le bras comme **schéma**, pas comme pose certifiée du vrai personnage.
- `tests/gauntlet-actor-rig-v139.test.mjs` : contrat de 54 coques différentes, 54 capots différents, dimensions 256×384, sécurité du registre, séparation de l'autre bras et parsing du composant.
- `scripts/qa-gauntlet-browser-v137.mjs` étendu : vérification HTTP en vrai Chrome des deux SVG du Lost Shaman et de l'outil d'inspection du poignet.

## Preuves et QA

Le workflow `.github/workflows/clan-war-v131.yml` inspecte tous les modèles et publie les **108 PNG alpha** de rig comme artefact de revue. Le workflow de build élargi contrôle les imports du personnage et du laboratoire ; il ne doit pas régresser la persistance V13 ni le nombre d'atlas montés.

Voir [les exécutions de GitHub Actions de la PR #42](https://github.com/darknigthmare/yautja-la-longue-chasse/actions).

Le classeur V139 ajoute :
- `36_V139_Rig54` — 54 lignes avec identifiants, fichiers base/lid, palette, os, pivot, source et statut individuel ;
- `37_V139_QA_Rig` — 18 contrôles avec statut et preuve exigée ;
- `38_V139_Bilan` — indicateurs calculés 54 / 54 / 108 / 219 / 327 / 0 et rappel des **324 tâches artistiques**.

## Critères qui restent à satisfaire avant « 1:1 »

1. Mesurer chaque accessoire sur plusieurs vues vérifiées du film, du costume ou du jeu et préciser les variantes « jamais montrées ».
2. Refaire la géométrie, les fixations et les textures quand les prototypes ne correspondent pas à la source ; ne pas inventer la graphie canonique des glyphes.
3. Contrôler les poses `idle`, marche, course, tir, visée, extraction, accroupissement et changement d'armes avec le vrai rig, sur les différentes morphologies.
4. Vérifier l'ouverture anatomique, les collisions visuelles, les plaques et le matériel de chaque bras (ordinateur gauche / lames droites).
5. Tester réellement le jeu entier sur PC, manette et tactile ; les tests d'images et de présence de fichiers ne remplacent pas ces parcours.
6. Démontrer la persistance de l'équipement entre appareils et des résultats de quête en conditions réelles (au-delà des tests unitaires).
7. Revue humaine indépendante et droits de propriété intellectuelle pour une distribution.

**Statut :** prototype technique jouable/visualisable, aucune validation artistique 1:1 attribuée. La PR reste en brouillon et aucune fusion dans `main` n'est autorisée par ce seul lot.
