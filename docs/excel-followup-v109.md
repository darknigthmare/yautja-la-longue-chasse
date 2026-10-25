# Suivi des chantiers V109

Le classeur V109 ajoute douze feuilles aux 85 feuilles publiées dans V108. Il conserve chaque cellule, formule, table et partie de feuille historique. Les 56 exigences source restent visibles ; les progrès et leurs limites sont ajoutés dans de nouvelles colonnes, sans effacer les anciens constats.

Les quatre chantiers sont implémentés et restent « à valider » dans le classeur. Aucune recette V109 n’est déclarée réussie en production à ce stade.

| Chantier | Progrès du code courant | Portée encore ouverte |
| --- | --- | --- |
| Pit | Deux projections avant liées au duo Feral/Scar sans costume ; huit admissions natives et 48 dessins distincts, répartis également entre les deux héros et les deux rôles. | Calibration finale, contact/sol et preuve du build ; autres partenaires, costumes, projections arrière, conclusions et campagnes source. |
| Homeworld | ROLE03 avec plaque, empreinte et fragment séparés, trois surfaces, accord, provenance, portage, comparaison, échec/reprise et rapport. L’Atlas suit les lots cargo et les cibles réellement déplacés. | Preuve du build ; nouveaux gestes BODY du PNJ, réparation effective du bord, attribution de l’empreinte et lignée. |
| Clans | Tournée de deux à six ouvrages, mêmes U19/skiff, stocks finis réservés, vivres, livraisons, retour, archive V108 conservée atomiquement et séparation continue des deux montures. | Preuve du build ; autorité et acquisitions de campagne, coque gagnée, récompenses et correspondance des territoires. |
| Preserve | Deux réserves V5 désert/glace avec postes hauts, caches, objectifs dérivés et décisions humaines adaptées. | Preuve du build ; cible 80 secteurs/100 adultes et fiches graphiques H001–H100. |

Les deux projections exposent toujours `sourceCompletion=false`. Les neuf actions source restent ouvertes : un support limité à ce duo ne termine pas les exigences de tous les partenaires et costumes. Les 48 dessins proviennent des rectangles natifs effectivement admis ; ils ne comptent pas les répétitions de phases, le miroir d’une orientation ou des dessins du partenaire inclus dans l’attaquant.

Les véritables exports Preserve V5 mesurent déjà deux nouvelles réserves : Khar-Duun et Iskhel, chacune avec huit secteurs et seize adultes. L’ensemble V107/V108/V109 contient 32 secteurs et 64 adultes aux identifiants uniques ; V1 et V2 ne sont pas additionnées aux versions qui les recouvrent. Ce sont des mesures de définition ; les parcours du build V109 restent à valider. Les trois atlas humains sont réutilisés et ne livrent pas les fiches H001–H100.

Le registre reste `PENDING_RUNTIME_FREEZE`. Les exports Preserve, Pit, ROLE03 et Clans sont mesurés dans le code courant ; leur admission artistique et leurs preuves de jeu gardent des portes distinctes. Les quatre recettes devront ensuite s’exécuter sur le même build ; leurs rapports complets, sources et captures inspectées seront vérifiés avant promotion des périmètres bornés. Les anciens 175 contrôles et 47 captures V108 ne sont pas comptés comme V109.

L’historique V108 s’exécute dans une capsule construite depuis le commit `2d88854b44c7cac14063f4445b8e0855646e7dec`. Ses 1 486 fichiers source privés contiennent les dix fichiers de tests originaux. Les 835 fichiers partagés restent protégés par leurs empreintes. Parmi eux, les 36 PNG et 36 reçus de provenance sont matérialisés dans le package privé en copies exactes et non modifiables : le refus original des chemins et des symlinks hors package reste actif. Les autres éléments sont partagés par des liens vérifiés ; aucune importation du jeu courant n’est redirigée vers l’histoire.

Les 75 assertions originales et la régénération du classeur V108 passent sans modification ; le fichier reste à 4 757 180 octets et son SHA reste `2a9490d4e37ff63405039f4f7e7b8c473373f15f83414ca5ff46e142ca5cdaba`. Le journal est conservé dans `docs/qa/v109-excel-followup/historical-v108.log`.

Commandes avec Node 22 et Python 3 :

```sh
node scripts/check-excel-history-v109.mjs --check --tests
node --experimental-strip-types --test --test-concurrency=1 tests/*-v109.test.mjs
node scripts/build-excel-followup-v109.mjs --check
```

Le générateur vérifie les parties ZIP/XML, les valeurs, les caches et les formules. Il ne lance ni le navigateur ni Excel natif. La production d’images et les reçus externes ont leur propre contrôle ; une présence dans le registre ne prouve pas leur admission visuelle ou leur usage dans le jeu.

La scène courante Homeworld est ROLE03 : scène383, choix788/789, répliques3183–3190. L’ancienne ROLE19 (scène398, choix818/819, répliques3303–3310) conserve ses propres sources et lots. Les campagnes Pit sans nouvelle livraison V109 sont signalées comme héritage, sans promotion par les projections.

Le paquet d’exécution contient les 39 nouveaux fichiers publics (30 pages Pit, un atlas Homeworld et huit entrées Preserve), les quatre sorties Pit conservées seulement comme références, les 35 reçus Pit et le reçu Homeworld. Les pages sont conservées intactes. Une page publique Pit est désormais une référence inutilisée ; les 48 poses admises utilisent les 29 autres pages. Toutes les revues natives, livraisons et réceptions des deux dossiers V109 sont intégrées au futur gel. L’inventaire ne transforme aucune réception en admission.

Les journaux complets de cinq groupes Node22 sont épinglés dans le registre : 135 régressions d’entrées, 46 V104, 126 V105/V106, 50 tests courants Clans/Preserve/Homeworld et 81 tests d’archives, soit 438 assertions sans échec ni test ignoré. Ces vérifications locales sont distinctes des 75 assertions historiques V108 et des contrôles navigateur à venir. Les tests de terrain et de stockage déclarent leurs états préparés ; ils ne valent pas une victoire de campagne jouée.

Après stabilisation, le responsable produit le gel puis le build commun. Les commandes de publication refusent le mode développement, les résultats exploratoires, les erreurs de console, un HTML sans SHA, les sources modifiées et une capture non inspectée :

```sh
node scripts/snapshot-runtime-v109.mjs --write docs/v109-runtime-freeze.json
node scripts/snapshot-runtime-v109.mjs --check docs/v109-runtime-freeze.json
node scripts/publish-validation-domain-v109.mjs --domain Pit --input /chemin/result.json --driver scripts/qa-pit-forward-throws-v109.mjs --opened /chemin/captures-ouvertes.json --runtimeCommit COMMIT --buildId BUILD_ID
node scripts/build-validation-summary-v109.mjs --entry docs/qa/v109-pit/entry.json --entry docs/qa/v109-homeworld/entry.json --entry docs/qa/v109-clans/entry.json --entry docs/qa/v109-preserve/entry.json --runtime-commit COMMIT --build-id BUILD_ID
```

La liste `--opened` contient les noms exacts des captures réellement ouvertes du résultat brut. Chaque publication garde ce JSON intégral en gzip, sans réécriture des observations ou fixtures, avec une correspondance bijective de ses PNG. Le rapport portable normalise seulement le nom `buildId` de l’HTML Pit vers `expectedBuildId` ; les deux identités doivent concorder si elles sont toutes deux présentes.
