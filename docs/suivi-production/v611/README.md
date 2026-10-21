# Suivi de production Yautja — V6.11

**36 nouveaux PNG Enforcer : variantes 04 et 05 pour chacun des 18 groupes.** Lot du 21 octobre 2026, produit à partir du suivi récupéré du 20 octobre.

- [Ouvrir la galerie locale avec filtres](index.html)
- [Télécharger le suivi Excel du 21 octobre](Yautja_Suivi_Variantes_2026-10-21.xlsx)
- [Consulter le manifeste des 36 PNG](data/production-manifest.json)
- [Consulter les compteurs du suivi](data/current-counts.json)

## Ce que contient ce lot

Chaque groupe reçoit un **Intercepteur à la lance courte (04)** et un **Pisteur au sceau sombre (05)**. Les fichiers sont des PNG natifs indépendants de **1024 × 1536 pixels, RGBA avec transparence**, copiés à l’identique depuis les sorties retenues. Le manifeste conserve les empreintes SHA256, les références, les prompts, les tentatives et les observations visuelles.

Les 18 groupes sont : Super Predators, Feral, Assassin augmentés, Spiked Tail, Hornhead, Saar-Keth, Ul-Khar, Sha-Rhess, Kaal-Or, Vaal-Tir, City Hunter, Pilot/Cyborg, Oni, Grendel/Jotun, Alpha, Yautja bioniques, Quatre-Bras et humains acceptés.

Les cinq morphotypes endémiques **Saar-Keth, Ul-Khar, Sha-Rhess, Kaal-Or et Vaal-Tir sont des créations du projet**. Les lignées et factions adaptées depuis des personnages ou concepts sont des extrapolations pour le jeu. Les **humains acceptés restent anatomiquement humains**, en armure Yautja adaptée et avec des dreadlocks de cheveux.

## État du suivi

| Statut | Variantes |
|---|---:|
| Présente dans main | 2 089 |
| Produite — à vérifier | 205 |
| Conservée hors main | 36 |
| Pas faite | 2 790 |
| Perdue confirmée | 0 |
| **Total** | **5 120** |

Les 36 nouvelles variantes V6.11 passent de « Pas faite » à « Conservée hors main ». Elles sont reliées à la **galerie et au codex statiques dans la branche de travail**. Le lot n’ajoute ni implantation sur une carte ni animation. Il ne certifie pas une fidélité officielle 1:1 ; les masques et équipements cachent certains détails anatomiques. Les écarts de couleur, de cadrage et les autres limites constatées restent consignés par image.

### Historique V6.10

Les **36 lignes de production V6.10 (variantes 02/03)** ont été retrouvées dans l’Excel du 20 octobre. Leurs PNG n’ont **pas été récupérés à ce stade** : cela ne prouve pas leur disparition définitive. L’historique et les empreintes déclarées sont conservés dans [prior-production-v610.json](data/prior-production-v610.json), avec l’[Excel source intact](references/Yautja_Suivi_Variantes_2026-10-20.xlsx). Ces images historiques ne sont pas présentées comme des PNG disponibles dans la galerie V6.11.

## Les neuf classeurs originaux

Les **neuf fichiers sont préservés sans modification** : sept existaient déjà dans main et deux bibles sont ajoutées à ce lot. Leurs tailles et empreintes figurent dans [other-workbooks.json](data/other-workbooks.json).

| Classeur original | Présence |
|---|---|
| [catalogue_yautja_tous_medias.xlsx](../../../art-source/v6/catalogue/catalogue_yautja_tous_medias.xlsx) | Déjà dans main |
| [THE_PIT_STAGES_V60_SUIVI.xlsx](../../THE_PIT_STAGES_V60_SUIVI.xlsx) | Déjà dans main |
| [THE_PIT_STAGES_V61_SUIVI.xlsx](../../THE_PIT_STAGES_V61_SUIVI.xlsx) | Déjà dans main |
| [THE_PIT_V62_SUIVI.xlsx](../../THE_PIT_V62_SUIVI.xlsx) | Déjà dans main |
| [THE_PIT_V63_SUIVI.xlsx](../../THE_PIT_V63_SUIVI.xlsx) | Déjà dans main |
| [YAUTJA_V100_SUIVI.xlsx](../../YAUTJA_V100_SUIVI.xlsx) | Déjà dans main |
| [YAUTJA_V99_SUIVI.xlsx](../../YAUTJA_V99_SUIVI.xlsx) | Déjà dans main |
| [Yautja_V6_Bible_Cumulative_et_Dialogues.xlsx](../classeurs/Yautja_V6_Bible_Cumulative_et_Dialogues.xlsx) | Ajouté à ce lot |
| [Yautja_V5_Bible_Reconstituee_et_Extensions.xlsx](../classeurs/Yautja_V5_Bible_Reconstituee_et_Extensions.xlsx) | Ajouté à ce lot |

## Ouvrir la galerie hors ligne

Extraire l’archive en conservant l’arborescence du dépôt, puis ouvrir <code>docs/suivi-production/v611/index.html</code>. Les images restent dans <code>public/game/production/enforcers-v611/</code> et les classeurs à leurs chemins d’origine. La galerie utilise uniquement des liens relatifs, des données embarquées et du JavaScript natif : aucun serveur, framework ou chargement de JSON par réseau n’est nécessaire. Les images et liens restent visibles sans JavaScript ; les filtres demandent JavaScript.

## Vérifications et reconstruction

Le [rapport de validation](validation.json) consigne le contrôle TypeScript, les cinq tests du nouveau lot et le test ciblé de conservation des références V89. Les **973 sélections automatiques** relevées avant l’ajout sont préservées.

Le [contrôle du classeur exporté](workbook-preview/openxml-verification.json) vérifie les 5 120 IDs, 72 productions, **559 formules**, **21 règles conditionnelles**, six tables et leurs six filtres, ainsi que les volets figés et les cellules fusionnées. Le [test de recalcul](workbook-preview/recalculation-check.json) modifie réellement un statut, vérifie la réaction des compteurs puis restaure l’état final.

Les [compteurs](workbook-preview/after-summary-counts.png), les [premières variantes](workbook-preview/after-variants-header.png), les [lignes de production](workbook-preview/after-production.png) et les [contrôles](workbook-preview/after-checks.png) ont des aperçus ciblés. Le rendu global avec cellules fusionnées reste partiellement blanc dans ce moteur de prévisualisation ; les données, fusions, polices et couleurs sont contrôlées séparément dans l’OpenXML. Trois dates de production perdent 1 ms par la conversion numérique du format ; les exceptions sont documentées et les horodatages originaux restent intacts dans le manifeste.

Depuis la racine du dépôt, `python scripts/verify-enforcer-workbook-v611.py` relit et vérifie le XLSX sans le modifier. Le script `scripts/build-enforcer-workbook-v611.mjs` reconstruit le classeur à partir des sources versionnées avec le runtime d’édition `@oai/artifact-tool`. Cette dépendance ne fait pas partie de l’application.

Les statuts décrivent le main audité et la branche du lot. La fusion de la PR et un éventuel déploiement se vérifient séparément dans GitHub.
