# Enforcers V6.14 — Chefs de poursuite

Les **18 variantes `enforcers-comics-10` auparavant manquantes sont produites**, à raison d’un Chef de poursuite par groupe. Ce lot part du main V106 `92e7c824fd80d6b8152855b3d66560448f8c48c0` et est livré dans la [PR nº 15](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/15).

## Consulter la livraison

- [Galerie cumulative des 126 PNG](index.html), utilisable hors ligne après extraction de la livraison complète.
- [Classeur cumulatif V6.14](Yautja_Suivi_Variantes_V614_2026-10-23.xlsx).
- [Manifeste des 18 sorties finales](data/production-manifest.json), avec empreintes, prompts exacts, références et observations.
- [Plan et fiches historiques](references/production-plan-v614.json).
- [Réconciliation avec main V106](data/main-reconciliation.json) et [inventaire des 16 classeurs préexistants](data/base-workbooks.json).

La galerie regroupe les variantes 4 à 10 : 36 PNG V6.11, 36 V6.12, 36 V6.13 et 18 V6.14. Les 108 précédents sont déjà présents dans main ; les 18 nouveaux restent dans la branche de la PR. Ils sont raccordés à la bibliothèque de sprites et au codex. Les 973 choix automatiques de personnages contrôlés conservent exactement le résultat du main V106.

## État du suivi

Le maître conserve ses **5 120 identifiants**. Le détail est disponible dans [current-counts.json](data/current-counts.json).

| Statut | Nombre |
| --- | ---: |
| Présente dans main | 2 197 |
| Produite — à vérifier | 205 |
| Conservée hors main | 18 |
| Pas faite | 2 700 |
| **Total** | **5 120** |

Seules 54 lignes, soit 468 cellules, changent : les 36 variantes V6.13 sont réconciliées avec leur fusion par la PR nº 10, et les 18 variantes V6.14 passent de « Pas faite » à « Conservée hors main ». Les autres identités, les dates historiques et les informations de placement sont conservées. La comparaison complète figure dans [master-changes.json](validation/master-changes.json).

Les 16 classeurs préexistants, y compris les suivis du jeu V104, V105 et V106, restent inchangés octet par octet. Le nouveau classeur V6.14 s’ajoute à cet ensemble. L’onglet Classeurs distingue l’état historique de récupération des fichiers et leur présence actuelle dans main.

## Production et provenance

Les 18 fichiers sont des **PNG natifs RGBA de 1 024 × 1 536**, avec transparence réelle. Les sorties retenues sont copiées à l’identique, sans rééchantillonnage ni modification de leurs pixels après génération. Les SHA-256 et les tailles sont comparés entre les sorties, les reçus, le manifeste et les fichiers livrés.

Le plan reprend les 18 fiches exactes du catalogue historique de 4 069 identités, retrouvé par son SHA-256 `ba59462ca9cb7dd05a06d8badf0b53683055d05b434daf64fad99633d7345a3b`. Deux références visuelles par groupe relient chaque fiche au rendu et à sa morphologie. Les exigences particulières comprennent le Pilot au visage biologique visible sans implant optique, le seul coude anatomique droit prothétique du Bionic, les quatre bras du Quatre-Bras et le visage humain mûr de l’Humain accepté.

Les 18 sorties finales proviennent de **21 appels de génération**, avec une correction du tissu sous le filet pour Saar-Keth, Bionic et City Hunter. Les reçus conservent les premières tentatives, le motif des corrections, le prompt exact de chaque appel et la sortie finale retenue. Un prompt prévu dans le plan n’est jamais présenté comme une preuve de soumission.

Les dates de production en UTC désignent le retour observé de l’outil ; elles ne prétendent pas être des horodatages serveur certifiés. Les dates historiques du suivi restent distinctes de ces nouvelles observations.

## Vérification et limites

- [Intégration](validation/integration-checks.json) : 23 contrôles ciblés réussis, dont les six tests V6.14 sur les sorties finales, l’intégrité des 126 PNG, les 973 sélections et les 54 seules lignes modifiées. Le diagnostic V89 complet signale séparément deux fichiers historiques absents du checkout partiel ; le contrôle V89 lié à l’intégration passe.
- [Qualité locale](validation/local-quality.json) : TypeScript global et ESLint ciblé. Une étape GitHub Actions vérifie désormais le lot V6.14 avec les fichiers nécessaires dans son checkout partiel ; son résultat d’exécution se consulte dans la PR.
- [Preuves V106](validation/historical-runtime-check.json) : quatre tests réussis avec relecture des 963 fichiers gelés et des preuves portables des trois parcours. Les preuves et le gel historiques sont conservés à l’identique. Le contexte historique reconstruit les deux anciennes sources ; le runtime actuel autorise uniquement les deux insertions de bibliothèque et le registre statique V6.14, avec empreintes et cas négatifs. La [relecture indépendante](validation/historical-runtime-review.json) confirme cette délimitation. Ces vérifications ne présentent pas les parcours V106 comme une QA du nouveau lot.
- [Classeur](workbook-preview/openxml-verification.json) : comparaison OpenXML du suivi et de ses sources ; [contrôle de recalcul](workbook-preview/recalculation-check.json) avec une saisie temporaire restaurée.
- [Galerie](gallery-preview/browser-verification.json) : chargement des 126 images, filtres, recherche sans accents, liens locaux, affichage mobile et consultation sans JavaScript.
- [Données publiques](validation/public-record-final-check.json) : contrôle des chemins privés et données de connexion dans les documents publiés.

Les personnages sont des **poses fixes**. Ce lot n’ajoute aucune animation ni aucun placement en scène et ne certifie pas une fidélité canonique 1:1. Les marges verticales sont souvent très serrées : la cible de 8 % n’est pas atteinte, alors que les contours visibles au seuil alpha > 20 restent entièrement dans le cadre. Les occultations et autres limites observées figurent dans chaque reçu.

## Travail restant

Les 18 variantes Enforcers 10 de ce lot n’apparaissent plus comme manquantes. Le suivi global conserve cependant **2 700 variantes à produire** et **205 productions à vérifier**. Les 36 traces V6.10 restent sans PNG retrouvé ; les 21 prompts finaux V6.13 non récupérés demeurent explicitement manquants. La production de ce lot ne clôture donc pas l’ensemble du catalogue.

Le paquet cumulatif contient les quatre livraisons Enforcers, leurs outils et les 17 classeurs. Pour reconstruire ou exécuter le jeu et ses tests, utiliser le dépôt complet. Pour consulter la galerie, extraire le ZIP complet ou toutes les parties ZIP standard dans le même dossier, puis ouvrir `index.html` ; les parties ne se concatènent pas.
