# Suivi V112 : placements, vides et exigences ouvertes

Le classeur `YAUTJA_V112_SUIVI.xlsx` prolonge le classeur V111 certifié : ses **113 feuilles historiques restent identiques à l’octet près**, et neuf feuilles V112 portent le suivi courant, soit 122 feuilles. Les parties ZIP historiques, les styles, les cellules et les formules sont vérifiés séparément de l’exécution du jeu.

Les 56 exigences héritées comprennent déjà les neuf actions Feral / Scar. Les campagnes, variantes, ouvrages de clans, besoins Preserve et traces de provenance restent suivis par leur identifiant et leur source exacte dans `v112-open-workstreams-audit.json`. Les besoins de placement, d’accès et de densité du Homeworld proviennent du brief V81 ; ils ne sont pas assimilés à une clôture des autres domaines. Les 354 cibles artistiques gardent leur inventaire V111 historique sans admission déduite d’un réemploi ou d’un placement.

Le registre `v112-homeworld-source.json` sépare les travaux en cours, les livraisons partielles et les validations ciblées. Les empreintes de chaque implémentation et des preuves exécutées rejoignent le classeur. Une validation navigateur exige un vrai rapport V112, le brut compressé complet, des sources identiques avant/après et au gel, des réponses HTML liées au Build ID, des captures toutes inspectées et aucune erreur de page, console, Worker ou requête. Une preuve de modèle ne devient pas une preuve de rendu.

La livraison R4 utilise le runtime `aa891dfff9bc022d1b7363d4b7085aca19b4d1e3`, le Build ID `WZwxZDYUZhpepqlaPWKpe` et les **1 563 entrées** du même gel. La recette Homeworld passe **248 contrôles / 39 captures inspectées** ; la recette Pit passe **127 contrôles / 39 captures inspectées**. Le registre valide cinq périmètres bornés : cohérence spatiale, accès, sept circuits de citoyens passifs, restauration des anciens points bloqués et prises arrière Feral / Scar. Le suivi Excel reste partiel, car son moteur natif n’est pas exécuté. Les 56 exigences source, dont les deux actions TH_B, restent ouvertes dans leur portée complète.

Les corrections spatiales portent sur six socles, deux raccords exacts du mausolée et six meubles admis sur dix propositions. Les 392 instances naturelles d’origine donnent 315 instances admises et 77 refus explicites ; les onze écotones et les trois atlas de citoyens sont réutilisés. Aucun nouveau dessin Homeworld ne clôture le catalogue artistique. Le lot Pit fournit **48 dessins natifs effectifs sur 22 PNG publics** pour le duo d’origine, ses deux rôles et ses deux orientations initiales. Une victoire Feral–Scar est réellement jouée, exportée et relue publiquement ; le parcours inverse vérifie les prises, orientations, déchoppes et murs. Les autres partenaires, costumes, variantes et kits complets restent à produire.

La première tentative Pit R4 a échoué après 92 contrôles / 29 captures sur l’attente d’une prise J2, avec une cause non attribuée. Sa seule reprise complète, avec les mêmes octets et critères, passe 127 / 39 ; l’échec et cette limite sont archivés. Les passes Homeworld R1/R3 et Pit antérieures restent des diagnostics ou échecs historiques. La compatibilité de l’interface Legacy R4 est suivie séparément : 87 contrôles / 14 captures, avec 1 458 sources observées présentes dans le gel complet ; elle ne remplace aucun certificat de domaine.

Le guidage suit désormais la position courante et son Worker réel. La mesure Chromium d’environ 5 ms par calcul de chemin exclut React, layout et peinture ; le viewport mobile de 390 px est une émulation sur le même processeur. Elle ne mesure donc pas la fluidité d’un téléphone physique. Les sept citoyens restent passifs, sans service ni quête, et leur admission spatiale fixe ne constitue pas un évitement autonome d’un cargo déplacé.

Le générateur V111 n’est jamais exécuté contre le jeu V112. La capsule `excel-history-v111-homeworld-v112` conserve les seize fichiers V111 et leurs 125 assertions, ainsi que le fichier original V90 et ses sept assertions : 17 fichiers, 132 assertions au total. Le renderer V112 remplace explicitement le provider d’écotones actif ; le petit wrapper V90 ne fait qu’exécuter ses sept assertions inchangées contre leur application privée, tandis que le nouveau test V112 vérifie les sept critères sur le provider courant. Le générateur original et ses données restent privés. La capsule contient les vrais objets Git commit/arbre de `def899ad` pour que le recensement artistique historique lise son propre arbre en lecture seule ; elle ne pointe pas le `HEAD` courant. Aucun hook d’import ne redirige les modules actuels vers l’historique. Les deux capsules plus anciennes et leurs assertions restent intactes.

```sh
python3 scripts/audit-open-workstreams-v112.py --check
node scripts/check-excel-history-homeworld-v112.mjs --check --tests
node scripts/check-excel-history-compat-v112.mjs --check --tests
node scripts/build-homeworld-followup-v112.mjs
node scripts/build-homeworld-followup-v112.mjs --check
node --experimental-strip-types --test --test-concurrency=1 tests/homeworld-excel-followup-v112.test.mjs tests/homeworld-excel-history-v112.test.mjs tests/homeworld-ecotones-v90.test.mjs
```

La vérification historique ne certifie pas le runtime courant. Les états de livraison et les preuves courantes se lisent dans les feuilles V112 et le registre, jamais dans les anciennes captures. Excel natif et son moteur de calcul ne sont pas exécutés.

La commande de tests du suivi comprend 14 contrôles de premier niveau : neuf sur les données et le classeur V112, quatre sur la capsule historique et un wrapper des sept assertions V90 originales. Les onze assertions historiques de porte et les sept d’écotones exécutées à l’intérieur de ces contrôles recouvrent la suite historique de 132 assertions ; elles ne s’additionnent pas à un total de comportements distincts.

Les certificats Homeworld et Pit courants doivent partager le même commit et le même Build ID. Chaque domaine reste relié à sa propre recette complète et à son brut, sans attribuer une validation Pit à un chantier Homeworld. Une tentative interrompue, partielle ou échouée ne devient pas un certificat par renommage.
