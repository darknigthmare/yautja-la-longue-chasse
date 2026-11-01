# V142 — Gauntlet de chasse : identité restaurée après suspension

**PR de travail :** https://github.com/darknigthmare/yautja-la-longue-chasse/pull/42 · branche `feat/v131-gauntlet-hologram-dual-view-20261030` · statut **draft**, empilée sur la PR #40. **Aucune fusion dans main.**

**Suivi source :** [Yautja_Gauntlets_V142_Arsenal_Clans.xlsx](Yautja_Gauntlets_V142_Arsenal_Clans.xlsx), **48 onglets** conservant les anciennes étapes et les tâches ouvertes. Nouveaux onglets `45_V142_Resume54`, `46_V142_QA`, `47_V142_Bilan`.

## Défaut corrigé en V142

La V141 raccordait les modèles individuels V139 à la **vraie scène de chasse** `HuntCanvas.tsx` : les 54 identités disposent chacune d'une coque et d'un capot, et les modèles manquants sont remplacés par les anciens modules V3. Mais le fichier temporaire `ActiveHuntSaveV1` ne mémorisait pas l'ordinateur de poignet choisi **au départ** de la chasse. Un changement cosmétique dans la campagne après suspension pouvait donc réapparaître sur la chasse reprise, malgré la sauvegarde du gameplay.

La V142 enregistre `configuration.gauntletVariantId` dans le **sidecar V1 existant**, sans version supplémentaire ni nouvelle propriété dans le schéma principal SaveGame V13. L'identité est capturée au lancement par `huntConfiguration(save,gauntletId)`; le même champ est conservé par les autosaves et la suspension. Lors de la reprise, `GameClient` restaure l'identité originale sous réserve d'autorisation, puis transmet la valeur figée à `HuntCanvas`.

**Règles de cohérence et sécurité :**
- Seul un gauntlet **réellement débloqué** par le propriétaire de la campagne (rang, études déjà réclamées) est accepté. Une modification frauduleuse de l'archive temporaire n'est pas une preuve de trophée.
- Une étude jamais réclamée, un identifiant inconnu, ou un gauntlet qui n'est plus autorisé entraîne un repli sûr sur le Jungle Hunter. Les droits de rang ne sont jamais tirés du seul sidecar.
- Les anciennes reprises **V141 sans ce champ** restent lisibles et utilisent le gauntlet actuel, comme auparavant.
- Le chargement normal des deux SVG spécifiques et le repli WebP V3 (si un SVG manque) continuent à fonctionner.
- L'identité cosmétique ne touche ni les statistiques, ni le comportement IA, ni la progression, ni la physique de `HuntCanvas`, ni les quatre modes Guerre des clans.

## Scénarios effectivement exécutés et prouvés

Les tests `tests/gauntlet-mission-resume-v142.test.mjs` vérifient les **54** identités autorisées, le passage SaveGame/sidecar existant, les anciens formats, les droits de rang, la défense contre la falsification et le raccordement au runtime. Exécution ciblée réussie : https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41217560568.

Le banc `tests/browser/gauntlet-real-hunt-v142.fixture.tsx` monte le **véritable composant de chasse** `HuntCanvas` sur une **mission jungle de test initialisée avec une sauvegarde isolée**. Il ne remplace pas ce runtime par un rendu fixe.

Le script Chrome `scripts/qa-gauntlet-real-hunt-v142.mjs` vérifie :
1. Les deux vrais SVG Wolf sont dessinés sur le Canvas de la mission, via la fonction `drawImage`.
2. Le bouton réel de mise en pause puis **Suspendre et sauvegarder** produit un vrai `ActiveHuntSaveV1` avec checkpoint et gauntlet Wolf.
3. Une deuxième page choisit Feral pour la prochaine chasse ; après rechargement, la reprise réclame un nouveau `runId`, conserve **Wolf** et redessine les deux SVG.
4. Un HTTP 404 contrôlé sur `wolf/base.svg` active le sprite générique **V3 de secours**, alors que le capot Wolf spécifique reste dessiné.

**Test Chrome et build complet réussis :** https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41217560554. Les captures sont disponibles dans l'artefact `yautja-v142-real-hunt-suspend-resume-chrome` de ce run.

## Limites ouvertes — ne pas déclarer jeu fini

- Ce test Chrome réalise une **vraie mission de jungle avec le moteur HuntCanvas**, mais dans une **fixture de sauvegarde d'essai**. Il ne traverse **pas** toute la navigation et tous les déblocages de `GameClient` (titre, armurerie, voyage, lancement, retour).
- Un test sur **deux onglets d'un même navigateur** n'est pas une validation de la synchronisation entre appareils ; aucune infrastructure cloud n'a été ajoutée.
- La révision visuelle de chaque film, prop, matériau, glyphes et animation doit être faite séparément. Les **327 sources SVG** restent des études/prototypes ; **0 des 54 gauntlets** sont certifiés identiques aux films en fidélité 1:1.
- Les **3 888 configurations de rig** du tableau V140 restent à examiner artistiquement : le calcul des 360 états et le test des deux os ne valent pas validation de costumes.
- Les **droits de diffusion et de propriété intellectuelle** restent à évaluer, en particulier avant tout projet de distribution.

## Suivi Excel V142

Le classeur fournit **54 lignes de droits et de conservation de modèle**, **22 scénarios QA** et un tableau de bord. La CI valide également sa structure **48 feuilles** et son archive ZIP. **4 critères V142 restent ouverts ou partiels** après les tests de code/navigation de mission : navigation complète GameClient, multi-appareils, fidélité cinéma, pose/texture.

Le nombre de critères QA techniquement verts ne signifie pas que le contenu artistique est fini. Ne fusionner le travail ni sur `main` ni sur les branches de base avant revue et tests indépendants.
