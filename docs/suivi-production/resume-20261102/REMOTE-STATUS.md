# État distant et diagnostic PR27 — 2 novembre 2026

`main` reste au commit `f3a1acec8c2603b3442da774457dfe75947d97d8` (fusion de PR39). Aucune nouvelle intégration distante depuis la fin de la session précédente n'est à réconcilier. La branche `codex/homeworld-access-followup-20261101` existe au commit `bda14a95aa8c9e6cf37039e2d67ea1544a8e8de1` et n'a aucune PR, ouverte ou fermée, au moment de cette lecture.

La [PR27](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/27) a avancé indépendamment : sa tête actuelle est `8113d729009071d9fbf516d3dbf6733fbb054422`, sur `feat/v113-chromatic-hunter-phg-20261030`. La tête historique `9ad29df77e8a11ca36bf1b37f6b4c6f08db3d05d` n'est donc plus son état courant. Elle est ouverte, non brouillon, fusionnable sans conflit selon GitHub, mais `UNSTABLE`. Aucun changement n'a été poussé sur cette branche pendant cet audit.

## Contrôles distants courants

Les contrôles spécialisés de PR27 sont verts : TypeScript complet, lint, intégrité des PNG/PHG, compatibilité V103/V115, préservation des sources V123, classeurs V137/V138, parité V139 des 1 134 cas visuels et 52 placements, gameplay, persistance, domaines planétaires, entraînement et export PNG/ZIP V124. Leur portée reste celle indiquée par chacun de ces contrôles.

Le [job application courant](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41319588455/job/124886844738) est `CANCELLED` après la limite de 75 minutes. Les métadonnées permettent de distinguer les étapes déjà en échec avant l'annulation :

| Étape | Tête historique 9ad | Tête courante 8113 |
| --- | --- | --- |
| 7 — mécaniques de chasse et invariants V112 | échec, 01:19:33–01:22:16 UTC | échec, 15:09:32–15:12:13 UTC |
| 17 — archives, assets, imports et routes gamedev | succès | échec, 15:15:34–15:16:13 UTC |
| 35 — générateurs, couches bitmap et fronts sauvegardés | échec, 01:31:07–01:35:12 UTC | échec, 15:21:30–15:22:28 UTC |
| 40 — normales V104, cartographie, frontières Preserve et classeur | échec, 01:41:04–01:41:26 UTC | échec, 15:28:27–15:28:50 UTC |
| 52 — régressions parallèles V111 | commencée, sans conclusion avant annulation | commencée, sans conclusion avant annulation |
| 53–64 — suites suivantes | non exécutées | non exécutées |

Les seules annotations accessibles de ces deux jobs décrivent le dépassement de durée. Elles ne donnent pas l'assertion exacte de l'étape 35. Les téléchargements des journaux/archives à URL redirigée ne sont pas lisibles dans cet environnement ; l'archive courante `13088827648` a été identifiée mais n'a pas pu être téléchargée. Les durées des étapes ne suffisent pas à attribuer une assertion distante. Le refus Vercel renvoie à la limite du nombre de builds ; CodeRabbit est ignoré.

## Étape 35 : reproduction locale ciblée

Le workflow lance quatre scripts dans cet ordre, sur `next dev` (Turbopack par défaut) : import concurrent V103, matériaux régionaux V102, parcours générateur V102, parcours générateur V103.

Les quatre scripts sont identiques entre PR27 courante, `main39` et le runtime local `bda`. Cinq composants/routes directement liés ont été comparés par identifiant de blob : ils correspondent tous entre PR27 courante et le runtime local. Sur `main39`, seule l'extraction d'une recette V115 dans `PlanetGeneratorV103.tsx` diffère ; le bouton global renommé y existe déjà. Cette comparaison justifie une reproduction ciblée, sans établir l'équivalence du reste de l'application.

La reproduction utilise le build de production conservé `wVuSG_xIKNn3geLlIq7Cb`, servi sur `http://127.0.0.1:3104`, Node 22.23.4 et Chromium 154.0.8037.57. Toutes les sorties et tous les rapports des scripts sont redirigés sous `/tmp/yautja-pr27-stage35-compiled-20261102`. Aucun asset d'origine, code applicatif, recette gelée ou ancien rapport n'a été modifié.

Les deux scripts V103 inchangés refusent le nom accessible devenu obsolète `Mélanger les réglages` (timeout de 30 secondes). Le contrôle réel s'appelle désormais `Tout mélanger au hasard` et appelle toujours `randomize("all")`. Les trois premiers cas d'import passent avant ce refus. Après remplacement de ce seul nom dans les deux scripts, l'import concurrent passe **7/7** cas ; les lectures obsolètes sont toujours réellement livrées au composant puis refusées, et le dernier import natif reste accepté.

Le parcours V103 avance ensuite jusqu'à **24 assertions réussies**, sans erreur runtime ni console, puis refuse un scroll ambigu : le sélecteur générique `canvas` trouve maintenant le globe et les deux prévisualisations de texture V125/V128. Le scroll cible désormais explicitement `planet-material-v101`. L'attente suivante `ready/fallback`, toutes les actions et toutes les assertions restent identiques. Les deux refus avant correction et ce refus intermédiaire sont conservés dans des rapports séparés.

Les quatre parcours sont maintenant complets et verts sur ce même build :

| Parcours | Résultat final | Correction du harness |
| --- | --- | --- |
| Import concurrent V103 | **7/7** | nom accessible du bouton global |
| Matériaux régionaux V102 | **10/10** | aucune |
| Générateur V102 | **35/35** | aucune |
| Générateur V103 | **36/36** | nom du bouton global et scroll ciblé du globe legacy |

Ces **88 vérifications** couvrent les exports PNG, la modification visible des palettes, les fronts réels de 18 et 96 territoires, l'ordre de reconnaissance, les sauvegardes et reprises indépendantes, le monde legacy V102 sans conversion implicite, les 30 mondes historiques, le clavier, le mobile et les refus de stockage. Les rapports complets sont conservés avec les tentatives précédentes ; la liste précise des assertions est celle des scripts, inchangée.

Le [diff limité](stage35-harness.diff) contient uniquement les trois remplacements de localisation. Les composants applicatifs comparés par blob restent inchangés ; la comparaison des scripts a été capturée avant ces corrections explicites du harness.

Ces trois corrections de localisation concernent seulement deux scripts hors du gel d'exécution. Aucune assertion, aucun cas ni aucune attente n'a été retiré ; le code produit et les canvas de l'interface sont inchangés. Le résultat de ce serveur compilé reste distinct d'un résultat sur le serveur de développement utilisé par CI.

## Portée de la reprise

Le [diagnostic du 1er novembre](../resume-20261101/PR27_DIAGNOSTIC.md) reste un instantané historique intact. PR27 intègre depuis cette session la compatibilité avec `main39` et de nouveaux contenus PHG/classeurs ; aucun ancien correctif ne doit y être repoussé à partir de la tête 9ad sans revue de sa tête courante.

Cet audit ne ferme ni le job application global, ni les suites non exécutées après son timeout, ni les travaux artistiques/PHG dont les preuves restent ouvertes. Il n'a créé ni fusionné de PR, et n'a envoyé aucun commentaire externe.

Les réponses JSON GitHub brutes, la comparaison des blobs et leur inventaire SHA-256 se trouvent à côté de ce rapport dans `REMOTE-STATUS.json`.
