# V140 — Contrôle de poses du gauntlet sur le VRAI personnage

**PR :** [#42](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/42), empilée sur #40 et toujours conservée en brouillon.

## Progrès réel

La V139 avait produit 108 SVG plein cadre (base/couvercle) qui se montent sur `armBackLower` dans le composant `HunterRigPreview`. L'inspecteur V139 affichait jusqu'à présent un **schéma de poignet statique**, pas le squelette animé de l'acteur.

La V140 ajoute :
- `app/game/GauntletPoseInspectionV140.tsx` : véritable `HunterRigPreview` (même source que l'armurerie) avec commandes de poses `idle/run/jump/fall/climb/extract`, six morphologies `classic/young/elder/super/feral/huntress`, phase d'animation, orientation droite/gauche, ouverture du couvercle, extension des wristblades sur l'autre bras et repères d'os.
- Le laboratoire reste derrière la page locale protégée `/gauntlet-qa-v136`. Son accordéon charge le rig **uniquement lorsqu'il est ouvert** : pas de rendu caché ni de téléchargement inutile d'assets V3 lors de l'inspection des grandes vues V134–V136.
- `tests/gauntlet-poses-v140.test.mjs` : contrôle des matrices réelles du moteur sur 360 combinaisons de pose, morphologie, orientation et phase, ainsi que 720 comparaisons d'axes de charnière du capot.
- `tests/browser/gauntlet-pose-v140.fixture.tsx` et `scripts/qa-gauntlet-pose-v140.mjs` : un banc Chrome du vrai rig, avec éléments du corps/armures V3 réellement chargés, changements des **54 modèles**, contrôle des deux sprites de chaque identité, ouverture du capot, wristblades, six poses/morphologies et les deux directions, captures bureau/mobile.
- La CI de build utilise un **checkout épars explicite des vrais sprites V3**, sans télécharger le reste du dépôt de plusieurs gigaoctets. Les captations et le manifeste des tests sont conservés sous l'artefact `yautja-actor-rig-pose-qa-v140`.

## Limites et conditions pour les 54 fiches Excel

| Sujet | Avancée contrôlable | Reste ouvert |
| --- | --- | --- |
| Sources d'équipement individuel | 54 × 2 sprites V139 | Exactitude cinéma 1:1 par personnage |
| Vues d'armurerie | 219 calques V134–V136 | Parité du volume, attache et texture du prop original |
| Anatomie/poses | 6 poses, 6 morphs, 2 directions et capot | Acceptation humaine pour toutes les poses/angles/armes |
| Capot | Pivot mathématique cohérent si test vert | Charnière/angle réel du film, occlusions, matériaux |
| Poignet gauche / droit | Gauntlet et wristblades attachés à deux os distincts | Validation visuelle des volumes sur les deux bras |
| Vie du joueur | Aucune transaction, coût ou sauvegarde modifiée | QA campagne réelle multi-appareil séparée |
| Fidélité et droits | État non certifié inchangé | 54 revues artistiques et droits de distribution |

**Important :** la réussite des tests source/Chrome prouve seulement des invariants techniques précis. Elle ne certifie ni la fidélité aux films, ni les 54 animations entièrement approuvées dans la campagne, ni les performances de tous les modes.

## Validation avant fermeture du P0 de rig

1. Tests géométriques sans `NaN`, charnière fixe à l'axe enregistré dans toute la matrice de cas.
2. Chrome charge bien les sources de boîtiers/couvercles V139 et les vrais éléments corporels V3, sans 404 ni erreur React.
3. Vérifications physiques indépendantes à compléter avec capture écran par morphologie, pose et taille d'affichage ; les collisions visuelles ne sont **pas déduites** de la seule géométrie mathématique.
4. Ne modifier aucune propriété de combat, d'IA, des coûts, des archives de guerre ou des sauvegardes.
5. Restituer les résultats et les limites dans l'Excel V140 ; conserver la PR en draft sans fusion.

**Moteur principal inchangé :** les vues classique et holographique restent des présentations de la guerre de clans, et non une copie des règles d'AVP Extinction.
