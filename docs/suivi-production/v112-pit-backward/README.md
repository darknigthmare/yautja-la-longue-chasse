# Projections arrière natives V112

Le duo Feral/Scar sans variante dispose de deux orientations initiales et de deux rôles indépendants, attaquant et cible. Les huit admissions sélectionnent **48 dessins effectifs** : 34 cases des huit feuilles initiales et 14 dessins isolés qui remplacent les cases dont les bordures ne pouvaient pas être isolées proprement. Le runtime utilise donc 22 PNG publics inchangés. Les 14 cases remplacées ne sont pas comptées une seconde fois.

ImageGen a produit huit feuilles et quinze tentatives isolées. Une tentative de vol de Feral présentait deux boucliers ; elle est refusée, conservée dans `art-source/v112-pit-backward/rejected/` et remplacée par une nouvelle pose r2. L’agent chargé du moteur a également ouvert la pose refusée, la correction et deux autres poses isolées. Les reçus enregistrent les prompts, références conservées, tailles et SHA256. Aucun PNG n’a été recadré, retourné, filtré ou retouché après sa génération. Les rectangles UV sélectionnent directement les pixels des originaux.

`native-frame-delivery.json` contient les sélections, appuis, références anatomiques par page et durées. `visual-review.json` décrit la revue des silhouettes et ses limites. `native-uv-border-review.json` est recalculé sur les vrais PNG et contrôle leurs identités, références, transparence, quatre bordures UV exactement alpha0 et appuis au sol. Un corps couché n’est jamais ajusté à une hauteur de boîte debout ; les poses isolées ont une calibration anatomique uniforme par source. Les poses chargées et aériennes conservent leur origine de sol dessinée, en plus de la hauteur physique du moteur.

Les étiquettes gauche/droite désignent la position initiale du combattant. Le masque peut changer de direction pendant le pivot ou la roulade ; elles ne certifient pas deux profils opposés à chaque image. Cette adaptation originale ne prétend ni reproduire exactement un plan de film ni terminer les exigences Excel `M_F006_TH_B` et `M_F003_TH_B`, leurs autres partenaires, leurs costumes ou les kits complets.

La recette `workbook-v112` attend les huit rôles arrière **et** tous les rôles avant V109 réellement décodés. Un PNG de cible absent interdit le lancement ; aucune pose debout de secours n’est admise. Les tests rejouent capture, vol, reprise à mi-parcours, échec, déchoppe et KO avec les dessins réels. La recette navigateur publique vérifie séparément les commandes et le rendu du jeu compilé ; la revue d’illustration seule ne la remplace pas.

```sh
node scripts/build-pit-backward-art-v112.mjs --check
node tests/pit-backward-art-provenance-v112.test.mjs
node tests/pit-backward-throw-art-v112.test.mjs
node tests/pit-forward-throw-art-v109.test.mjs
```
