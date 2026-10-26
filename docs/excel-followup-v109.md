# Suivi des chantiers V109

Le classeur courant est `FROZEN` sur le runtime `c97c7d903486ed2c7cb2529ac27f713c0aba8987`, build `pVNPLCZV9ZFtFCd87NSTa`. Ses **97 feuilles conservent les 85 feuilles historiques et les 56 exigences source encore ouvertes**. Les quatre périmètres Pit, Homeworld, Clans et Preserve sont validés pour leurs parcours ciblés ; aucune exigence source globale n’est clôturée.

Le [certificat commun](v109-validation-summary.json) réunit quatre nouvelles recettes complètes après correction de la revue : **208 contrôles et 65 captures effectivement ouvertes**, sans erreur JavaScript ou console. Le gel vérifié contient 1 361 entrées et porte le SHA256 `b4f097daa655b119051675bd7acc2540a90cb4fd466c69955de6c0858519c4c0`. Les résultats bruts complets, images, sources avant/après et réponses HTML sont conservés et vérifiés avant génération du classeur. Les journaux R3 et notes d’inspection sont épinglés dans le registre source.

| Chantier validé | Progrès livré | Portée de la recette courante |
| --- | --- | --- |
| Pit | Deux projections avant liées à Feral et Scar sans costume ; huit admissions natives et 48 dessins BODY indépendants dans 29 pages utilisées. | 65 contrôles, 19 captures ; deux ordres, deux sens natifs, 61 frames peintes par victime, déchoppes, victoire et replay. |
| Homeworld | Trois objets ROLE03 distincts, surfaces séparées, accord, observation, portage, comparaison, échec/reprise et rapport ; Atlas adapté aux charges ROLE19 réellement déplacées. | 55 contrôles, 11 captures ; deux branches ROLE03 et navigation cargo sur le terrain réel. |
| Clans | Tournée physique de deux à six étapes, stocks finis, même groupe/skiff, dépôt, retour et sauvegarde atomique ; séparation continue des montures. | 38 contrôles, 8 captures ; six livraisons jouées après une préparation explicitement déclarée des ouvrages. |
| Preserve | Khar-Duun et Iskhel ajoutent désert et glace : quatre réserves totalisent 32 secteurs et 64 adultes uniques. | 50 contrôles, 27 captures ; entrées saines, un combat/trophée réel par biome, parcours de terrain préparés déclarés, travaux vivants et retours. |

Les corrections de revue sont incluses dans ce troisième build : titre/notice des quatre réserves, deux variables Chromium prises en charge dans cinq lanceurs, contrôle spatial des pixels alpha et constantes CPU nommées aux valeurs inchangées. Les 34 tests Pit ont été rejoués après correction. Six cas Python complémentaires et la revue stricte des 48 poses passent sans ajout ni retrait du cœur opaque ; aucun PNG, UV ou pivot n’a changé. Ces outils Python sont locaux et n’ajoutent pas de dépendance à la CI.

Les 11 contrôles finaux du suivi vérifient les 97 feuilles, les 85 historiques préservées, les 56 besoins ouverts, le gel courant, les preuves complètes et la régénération exacte. La suite V109 initiale de 95 tests et les groupes de régression restent épinglés avec leur portée ; ils se recouvrent et ne sont pas additionnés. Les 75 assertions V108 originales gardent leur capsule privée issue du commit `2d88854b44c7cac14063f4445b8e0855646e7dec` ; aucune importation du jeu courant n’est redirigée.

Le certificat précédent du runtime `63cfb392a72438623f8031257e54497ece390aa8`, build `FJ6IbT6OZx1H51wYnNmex`, reste conservé avec son classeur SHA256 `6ea0056bca676988f0d787ba1d4ab95394770f9acdd5df8ab39e70ef533ce1d2` dans le commit `1252a5909b317d4e0c400683818a3f736b7e6431`. Les [métadonnées exactes](qa/v109-review-corrections/previous-certified-manifest.json) ont été copiées avant correction. Leurs références internes gardent leurs chemins d’origine ; ces documents historiques ne certifient pas le code courant et leurs captures ne sont pas additionnées aux nouvelles preuves. Les essais Pit et Preserve non promus restent conservés avec leurs limites.

Les définitions du jeu restent mesurées séparément des preuves navigateur. `sourceCompletion=false` et neuf actions source restent ouvertes : les prises ne couvrent pas tous les partenaires, costumes et réactions xéno. Kits, variantes, campagnes Pit et acquisitions de campagne Clans ne sont pas clôturés. Les cibles Preserve de 80 secteurs/100 adultes et les illustrations H001–H100 restent ouvertes. ROLE03 et ROLE19 conservent leurs corpus et objets séparés ; réparation, attribution de lignée et récompense ne sont pas revendiquées.

Node22 et Python3 permettent de vérifier le suivi sans lancer de navigateur ni Excel natif :

```sh
node --experimental-strip-types --test --test-reporter=spec --test-concurrency=1 tests/excel-history-v109.test.mjs tests/excel-followup-v109.test.mjs tests/production-publication-v109.test.mjs
node scripts/build-excel-followup-v109.mjs --check
node scripts/snapshot-runtime-v109.mjs --check docs/v109-runtime-freeze.json
```

Les contrôles ZIP/XML, cellules, styles, tableaux, formules et caches ne prétendent pas exécuter le moteur de calcul Excel natif. Les limites détaillées figurent dans [la validation ciblée](v109-validation.md) et les feuilles `ValidationsV109` et `JournalV109`.
