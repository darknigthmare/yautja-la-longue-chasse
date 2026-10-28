# Qualification V112 conservée dans la PR

Ce dossier conserve les cinq PNG et le rapport Chromium natif du run [40667918140](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/40667918140), afin que les captures restent consultables après l'expiration de l'artefact temporaire.

Les captures et le passage complet historique portent sur le code de branche `ab47a9c2d2bf4b0a866c109efa2c96f68d526de8`. Le correctif borné des longues lianes est qualifié séparément au commit `e407979502d1cd4986e2e1810a4ed013f8abac8a`, sans modifier les interfaces des cinq scènes conservées. Le commit de fusion synthétique réellement exécuté, l'égalité des arbres Git, les commandes, résultats et identités de blobs sont dans [provenance.json](./provenance.json). [browser-report.json](./browser-report.json) est le rapport de sortie conservé sans modification.

## Résultats et périmètre

- 237 tests V112 réussis au commit e407, dont quatre nouveaux contrôles des longues lianes Oseris et 72 traversées natives : huit missions × trois armures × trois états normalisés d'entrée. Les ennemis sont retirés pour isoler la locomotion ; le parcours touche réellement les six repos entre le sol d'entrée et le sol de sortie.
- 18 groupes Chromium réussis et aucune exception `pageerror`. Les deux groupes manette traversent le vrai polling, `stepGame` et la navigation/activation DOM, avec commandes par défaut puis remappées.
- Les quatre workflows complets sont verts sur ab47 : TypeScript, ESLint, compilation Next et cinq contrôles HTTP réussis. Sur e407, TypeScript, les 237 tests natifs, la compilation Next, le smoke HTTP et ESLint passent également ; le passage historique complet final appartient à la CI du lot documentaire. Les règles V111 courantes et les publications historiques sont vérifiées séparément.
- Le générateur du classeur V112 et sa version avant consignation reproduisent exactement 427 476 octets ; 2 264 cellules et 327 liens ont passé le vérificateur ZIP/XML indépendant. Cette preuve porte sur le générateur et la version avant consignation ; le lot documentaire et ses octets mis à jour sont contrôlés à nouveau par les checks de PR.

Les panneaux React et les réducteurs de conservation sont réels. Le parent du panneau confirme dans localStorage ; le parcours complet du GameClient n'est pas reproduit par cette scène. Les entrées clavier/pointeur de la canopée sont des adaptateurs de fixture ; la manette est émulée. La scène utilise les images de repli natives du renderer. Ces résultats ne qualifient ni une banque d'illustrations complète, ni une campagne interactive de combat complète, ni les performances, ni la compréhension d'un débutant, ni un téléphone ou une manette physiques.

## Captures inspectées

Les cinq images ont été inspectées visuellement. Une relecture indépendante a également inspecté les quatre scènes initiales et le menu manette correspondant au même code produit ; la provenance distingue les runs.

| Capture | Observation |
| --- | --- |
| [Réglages à 390 px](./accessibility-phone.png) | Formulaire lisible, défilement normal et absence de débordement horizontal. |
| [Conservation](./workshop-cleaned.png) | Coût et étape du travail manuel cohérents ; confirmation et progression visibles. |
| [Rites corporels](./corpse-rites.png) | Menu à défilement interne ; les parties situées plus bas restent atteignables. |
| [Lâcher de canopée](./canopy-native-release.png) | Renderer de repli et état de lâcher visibles. |
| [Rites à la manette](./corpse-rites-gamepad.png) | Aide des commandes et cadre de sélection visibles ; 4,4 s correspond à l'outil usé. |

## Historique et reproductibilité

`node scripts/test-current-v111-v112.mjs` exécute les régressions V111 sur le runtime actuel. Le seul test de publication gelée `homeworld-excel-followup-v111.test.mjs` reste exécuté sans changement dans le wrapper historique Homeworld. Les wrappers restaurent leurs sources et les préimages exactes des tests depuis Git épinglé avant contrôle des empreintes ; ils ne redirigent pas les sources du jeu actuel.

Le runtime V111 courant passe 119 assertions ; la chasse/outil V111 passe séparément 54 assertions. Les suites se recouvrent et ne sont pas additionnées. La suite campagne donne 159 réussites et un cas ignoré explicitement parce que sa source V6 privée n'est pas distribuée dans Git.

Les anciens classeurs restent inchangés. Les compteurs historiques et leurs SHA256 figurent dans la provenance ; leur réussite ne constitue pas une qualification du runtime V112.
