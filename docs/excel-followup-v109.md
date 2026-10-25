# Suivi des chantiers V109 — corrections de revue

Le suivi courant repasse `PENDING_RUNTIME_FREEZE` après trois corrections de revue. Les quatre périmètres Pit/Homeworld/Clans/Preserve sont « à valider » jusqu’à un nouveau gel, un build commun et quatre nouveaux parcours complets. **97 feuilles, 85 historiques préservées et 56 exigences source ouvertes** restent les objectifs du classeur intermédiaire.

Le certificat précédent du runtime `63cfb392a72438623f8031257e54497ece390aa8`, build `FJ6IbT6OZx1H51wYnNmex`, reste conservé : 208 contrôles, 65 captures inspectées et classeur SHA256 `6ea0056bca676988f0d787ba1d4ab95394770f9acdd5df8ab39e70ef533ce1d2`. Il ne valide pas les fichiers corrigés. Les [métadonnées exactes](qa/v109-review-corrections/previous-certified-manifest.json) sont copiées avant changement ; le classeur et la fermeture originale des preuves restent disponibles dans le contexte Git revu «1252». Les références internes des JSON archivés gardent leurs chemins d’origine et ne sont pas redirigées vers le code courant.

Les corrections préparées portent sur :

- le titre et la notice Preserve, qui doivent afficher les quatre réserves réellement disponibles ;
- les cinq lanceurs QA, qui acceptent les deux variables d’environnement Chromium ;
- le calcul de bord alpha, qui compte les pixels spatialement ajoutés sans les compenser par des retraits ailleurs, et les constantes CPU nommées aux valeurs16/19 inchangées.

Le calcul Python `scripts/review-pit-native-borders-v109.py` est ajouté aux documents du prochain gel. Sa nouvelle revue native sera incluse par la découverte du dossier de production. Les anciennes revues et les PNG ne sont pas réécrits ; la preuve de différence spatiale doit rester distincte des anciens compteurs.

Les définitions du jeu restent mesurées séparément des preuves navigateur : huit admissions natives, 48 dessins BODY dans 29 pages, deux projections limitées au duo Feral/Scar sans costume ; `sourceCompletion=false` et neuf actions source encore ouvertes. Le catalogue Preserve contient 32 secteurs et 64 adultes uniques dans quatre réserves ; les cibles80/100 et les fiches H001–H100 restent ouvertes. ROLE03 et ROLE19 conservent leurs corpus et objets distincts. Les acquisitions de campagne Clans, kits, variantes et campagnes Pit ne sont pas clôturés.

Le générateur intermédiaire ne lit pas l’ancien master comme certificat du nouveau code. Les 75 assertions V108 gardent leur capsule privée issue du commit `2d88854b44c7cac14063f4445b8e0855646e7dec` ; aucune importation du jeu courant n’est redirigée. Les anciens essais Pit et Preserve non promus restent conservés avec leurs limites.

Après stabilisation des sources, Node22 et Python3 permettent de vérifier le classeur intermédiaire :

```sh
node --experimental-strip-types --test --test-concurrency=1 tests/excel-history-v109.test.mjs tests/excel-followup-v109.test.mjs tests/production-publication-v109.test.mjs
node scripts/build-excel-followup-v109.mjs --check
```

Le responsable écrit ensuite le nouveau gel et construit le prochain build. Le classeur ne repassera `FROZEN` qu’après les quatre nouvelles preuves portables et leurs captures inspectées. Les contrôles ZIP/XML et caches de formules ne prétendent pas exécuter Excel natif.
