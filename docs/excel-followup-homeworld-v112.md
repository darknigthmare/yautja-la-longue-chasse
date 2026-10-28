# Suivi V112 : placements, vides et exigences ouvertes

Le classeur `YAUTJA_V112_SUIVI.xlsx` prolonge le classeur V111 certifié : ses **113 feuilles historiques restent identiques à l’octet près**, et neuf feuilles V112 portent le suivi courant, soit 122 feuilles. Les parties ZIP historiques, les styles, les cellules et les formules sont vérifiés séparément de l’exécution du jeu.

Les 56 exigences héritées comprennent déjà les neuf actions Feral / Scar. Les campagnes, variantes, ouvrages de clans, besoins Preserve et traces de provenance restent suivis par leur identifiant et leur source exacte dans `v112-open-workstreams-audit.json`. Les besoins de placement, d’accès et de densité du Homeworld proviennent du brief V81 ; ils ne sont pas assimilés à une clôture des autres domaines. Les 354 cibles artistiques gardent leur inventaire V111 historique sans admission déduite d’un réemploi ou d’un placement.

Le registre `v112-homeworld-source.json` sépare les travaux en cours, les livraisons partielles et les validations ciblées. Les empreintes de chaque implémentation et des preuves exécutées rejoignent le classeur. Une validation navigateur exige un vrai rapport V112, le brut compressé complet, des sources identiques avant/après et au gel, des réponses HTML liées au Build ID, des captures toutes inspectées et aucune erreur de page, console, Worker ou requête. Une preuve de modèle ne devient pas une preuve de rendu.

Le générateur V111 n’est jamais exécuté contre le jeu V112. La capsule `excel-history-v111-homeworld-v112` conserve les seize fichiers V111 et leurs 125 assertions, ainsi que le fichier original V90 et ses sept assertions : 17 fichiers, 132 assertions au total. Le renderer V112 remplace explicitement le provider d’écotones actif ; le petit wrapper V90 ne fait qu’exécuter ses sept assertions inchangées contre leur application privée, tandis que le nouveau test V112 vérifie les sept critères sur le provider courant. Le générateur original et ses données restent privés. La capsule contient les vrais objets Git commit/arbre de `def899ad` pour que le recensement artistique historique lise son propre arbre en lecture seule ; elle ne pointe pas le `HEAD` courant. Aucun hook d’import ne redirige les modules actuels vers l’historique. Les deux capsules plus anciennes et leurs assertions restent intactes.

```sh
python3 scripts/audit-open-workstreams-v112.py --check
node scripts/check-excel-history-homeworld-v112.mjs --check --tests
node scripts/build-homeworld-followup-v112.mjs
node scripts/build-homeworld-followup-v112.mjs --check
node --test tests/homeworld-excel-followup-v112.test.mjs tests/homeworld-excel-history-v112.test.mjs
```

La vérification historique ne certifie pas le runtime courant. Les états de livraison et les preuves courantes se lisent dans les feuilles V112 et le registre, jamais dans les anciennes captures. Excel natif et son moteur de calcul ne sont pas exécutés.
