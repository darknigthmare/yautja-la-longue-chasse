# Sucklings V6.15 — Veilleurs du tissu

Le lot V6.15 porte sur les **18 variantes `sucklings-02` — « Veilleur du tissu »**, à raison d’un personnage par groupe. Ce sont les prochaines fiches manquantes retenues dans l’ordre du maître V6.14, après les Enforcers. Le [plan de production](references/production-plan-v615.json) conserve les identifiants, les fiches historiques, les consignes de stade infantile et les références de chaque personnage.

La livraison cumulative réunit **144 PNG natifs : 126 Enforcers et 18 enfants**, ainsi que **18 classeurs XLSX, dont les 17 précédents préservés**. Les comptes ci-dessous sont vérifiés dans le maître et dans le classeur exporté ; les preuves détaillées sont liées dans la section validation.

## Continuité de la PR et des sources

La production continue dans la [PR nº 15](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/15), sur la branche `codex/enforcers-v614-20261023`.

- **Main V106** : `92e7c824fd80d6b8152855b3d66560448f8c48c0`.
- **Source V6.14 de la reprise** : `4a1b437eb60fa9d511722bf4930fd49ff7fb8f86`, conservée dans cette même PR et **non fusionnée dans main**.
- **Classeur de départ** : [suivi V6.14 publié](../v614/Yautja_Suivi_Variantes_V614_2026-10-23.xlsx). La [livraison V6.14](../v614/README.md) demeure une preuve historique distincte.

La [réconciliation Git](data/main-reconciliation.json) distingue les 108 PNG V6.11 à V6.13 présents dans main des 18 PNG V6.14 conservés dans la branche. V6.15 ajoute 18 productions à cette branche. Aucune ligne historique n’est promue vers « Présente dans main » par cette reprise : V6.14 et V6.15 représentent ensemble **36 productions conservées hors main**.

| Lot | Famille et variantes | PNG | Situation dans cette reprise |
| --- | --- | ---: | --- |
| V6.11 | Enforcers 04 et 05 | 36 | Présents dans main V106 |
| V6.12 | Enforcers 06 et 07 | 36 | Présents dans main V106 |
| V6.13 | Enforcers 08 et 09 | 36 | Présents dans main V106 |
| V6.14 | Enforcers 10 | 18 | Conservés dans la PR nº 15 |
| V6.15 | Sucklings 02 | 18 | Nouveau lot de la PR nº 15 |
| **Total cumulatif** | **126 Enforcers et 18 enfants** | **144** | **108 dans main et 36 dans la PR** |

## Consulter la livraison

Les livrables sont :

- [Galerie cumulative des 144 PNG](index.html).
- [Classeur cumulatif V6.15](Yautja_Suivi_Variantes_V615_2026-10-23.xlsx).
- [Manifeste des 18 sorties finales](data/production-manifest.json), avec empreintes, références, prompts et observations.
- [Comptes du suivi](data/current-counts.json), [maître cumulatif compressé](data/current-master.json.gz) et [détail des cellules modifiées](validation/master-changes.json).
- [Inventaire des 17 classeurs précédents](data/base-workbooks.json) et [point de reprise des fichiers natifs](recovery/native-checkpoint.json).
- [Répertoire des reçus individuels](receipts/) et [répertoire des nouveaux PNG](../../../public/game/production/sucklings-v615/).

L’inventaire des classeurs distingue **16 fichiers déjà dans main et le suivi V6.14 encore dans la PR**. Ces 17 sources restent identiques octet par octet ; le suivi V6.15 s’y ajoute pour constituer l’ensemble de 18 XLSX. Les états historiques de récupération, les dates anciennes et leurs provenances restent conservés dans le suivi.

## État du suivi

Le maître conserve ses **5 120 identifiants**. Le passage des 18 Sucklings 02 de « Pas faite » à « Conservée hors main » donne les comptes suivants :

| Statut | Nombre |
| --- | ---: |
| Présente dans main | 2 197 |
| Produite — à vérifier | 205 |
| Conservée hors main | 36 |
| Pas faite | 2 682 |
| **Total** | **5 120** |

Le changement par rapport au maître V6.14 est limité à **18 lignes et 144 cellules**, dans les colonnes `E`, `G`, `AA`, `AB`, `AC`, `AE`, `AH` et `AI`. Les autres identifiants, les données de placement et les états du lot V6.14 sont préservés. L’onglet Production PR conserve ses **162 enregistrements historiques** et reçoit les 18 nouvelles lignes, soit **180 enregistrements** au total.

Ces 180 traces comprennent les **36 productions V6.10 dont les PNG restent non retrouvés**. Elles ne s’ajoutent pas aux 144 fichiers natifs disponibles dans les lots V6.11 à V6.15.

## Personnages et portée artistique

Les 18 fiches sont féminines et relèvent du stade `infant` : **17 tout-petits de lignées fictives et une petite fille humaine de 2 ans**. Les proportions suivent le stade ou l’âge de la fiche : tête relativement grande, membres courts ou fins selon la lignée et musculature immature. La morphologie adulte sert à reconnaître les caractères du groupe, sans imposer un corps adulte réduit.

Les personnages sont assis calmement, portent une tunique ample à manches longues et un pantalon opaques, et tiennent une grande bande textile bleu terne. Les vêtements couvrent le torse, l’abdomen et le bassin. Les fiches prévoient des enfants civils protégés, sans armement, armure adulte ni prothèse. Le Pilot conserve son dôme chauve et un visage biologique sans optique ; la lignée Quatre-Bras conserve sa topologie propre. La fiche humaine garde une anatomie entièrement humaine et l’âge de **2 ans** ; son affiliation Yautja est culturelle.

Ces adaptations infantiles sont des **créations fictives du projet**, sans certification canonique 1:1. Les personnages sont des **poses fixes** destinées à la bibliothèque de sprites et au codex. Ce lot ne prévoit aucune nouvelle animation ni aucun nouveau placement en scène.

## Références, fichiers natifs et reçus

Le plan associe **deux références par personnage, soit 36 références** : l’ancien `sucklings-01` du même groupe pour le stade et le rendu, puis un adulte du groupe pour la topologie et les caractères anatomiques. Les références sont identifiées par leur chemin relatif, leur SHA-256, leur taille et leur empreinte de blob Git depuis main V106. Leur inspection visuelle précède la génération ; la fiche exacte du nouvel individu garde la priorité sur les proportions ou les équipements des références.

Les 18 sorties sont des **PNG natifs transparents RGBA de 1 024 × 1 536**, un par identifiant. Les sorties retenues sont copiées à l’identique, sans rééchantillonnage ni modification des pixels. Le fichier final suit le chemin `public/game/production/sucklings-v615/<groupe>/sucklings-02.png`, et son reçu porte le nom `<groupe>--sucklings-02.json`.

Chaque reçu documente le prompt réellement soumis, les références utilisées, les tentatives, la sortie retenue, son SHA-256, sa taille, ses dimensions, les mesures alpha et la revue visuelle. Le champ `acceptedOutputPromptExact` désigne le prompt de la sortie finale acceptée. Le prompt prévu dans le plan décrit la préparation ; la preuve de soumission se trouve dans le reçu. Les **23 tentatives documentées** conservent les prompts des corrections et identifient les **18 sorties finales acceptées**.

Les dates de production en UTC désignent **l’observation du retour de l’outil**, et non une heure de génération certifiée par le serveur. Elles restent distinctes des dates historiques et des dates de vérification. Aucun horodatage historique absent n’est reconstitué artificiellement.

La cible de cadrage est une marge transparente d’au moins **8 % sur chacun des quatre côtés**. Les reçus indiquent les marges obtenues et les limites observées : **8 PNG atteignent cette cible sur les quatre côtés ; 10 restent en dessous sur au moins un côté**, sans débordement visible du personnage. Les bornes visibles au seuil alpha > 20, les occultations par le textile, les variations de teinte et les autres particularités pertinentes sont consignées sans retoucher les PNG pour les masquer.

## Validation réalisée

Les contrôles locaux portent sur les fichiers V6.15 livrés et sur leur continuité avec les lots précédents. **Les 33 tests ciblés réussissent** : 22 tests des productions V6.11 à V6.14, 6 tests V6.15, 1 contrôle ciblé V89 et 4 contrôles des preuves historiques V106. Les rapports V6.14 restent des preuves de leur propre lot.

| Périmètre | Rapport ou preuve à consulter | Résultat vérifié |
| --- | --- | --- |
| Maître et continuité | [Réconciliation Git](data/main-reconciliation.json), [changements du maître](validation/master-changes.json) | V6.14 non fusionnée ; 5 120 IDs stables ; seulement 18 lignes et 144 cellules modifiées |
| PNG et provenance | [Contrôle des fichiers natifs](validation/native-provenance.json), [manifeste](data/production-manifest.json), [reçus](receipts/) | 18 nouvelles sorties, 23 tentatives documentées, 42 600 264 octets natifs ; empreintes et prompts finaux concordants |
| Intégration du lot | [Contrôles d’intégration](validation/runtime-integration.json) | 33 tests réussis ; 973 sélections automatiques inchangées ; bibliothèque de 2 021 empreintes uniques |
| Qualité du code | [Contrôles locaux](validation/local-quality.json) | TypeScript sans erreur ; ESLint sans avertissement sur les 16 fichiers concernés ; syntaxe des 3 scripts Python et espaces Git validés |
| Revue indépendante | [Revue du code et des preuves](validation/independent-review.json) | 15 fichiers de code et 10 preuves relus ; empreintes vérifiées après intégration ; aucun blocage relevé |
| Classeur | [Comparaison OpenXML](workbook-preview/openxml-verification.json), [recalcul](workbook-preview/recalculation-check.json), [revue visuelle](workbook-preview/visual-review.json) | 17 XLSX sources préservés ; 162 lignes historiques exactes et 18 ajoutées ; 667 formules sans erreur, 6 tables et 21 règles de formatage conditionnel ; 4 plages rendues inspectées |
| Galerie | [Vérification navigateur](gallery-preview/browser-verification.json), [revue visuelle](gallery-preview/visual-review.json) | 144 images chargées et 154 liens locaux valides ; filtres et consultation sans JavaScript vérifiés ; mobile de 390 px sans débordement ; aucune erreur JavaScript ni requête externe |
| Documents publics | [Audit des enregistrements publics](validation/public-record-final-check.json) | Les documents contrôlés ne contiennent aucun chemin privé ni donnée de connexion détectée par les règles du contrôle |

Les preuves V106 utilisent leur contexte historique séparé ; elles ne constituent pas une nouvelle campagne complète de QA du jeu V6.15. La galerie V6.15 dispose de sa propre vérification navigateur. Le classeur a été exporté et recalculé avec Artifact Tool, puis comparé en lecture seule via OpenXML ; aucune session Excel native interactive n’est revendiquée. Un nouvel horodatage présente une quantification de −1 milliseconde lors de sa conversion en numéro de série Excel, documentée dans le rapport ; toutes les dates historiques sont préservées.

Les exécutions GitHub Actions correspondant au commit final se consultent dans la [PR nº 15](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/15). Le paquet de distribution dispose de son propre rapport `pack-verification.json` et de ses index SHA-256, produits lors de l’emballage du commit publié.

## Outils de reconstruction et de contrôle

Les scripts sont exécutés depuis le dépôt complet, avec leurs dépendances :

| Étape | Outils |
| --- | --- |
| Retrouver les sources et préparer les fiches | [Réconciliation avec main](../../../scripts/reconcile-npc-main-v615.mjs), [préparation du plan](../../../scripts/prepare-npc-plan-v615.mjs) |
| Construire le manifeste, le maître et le registre | [Construction de la production](../../../scripts/build-npc-production-v615.mjs) |
| Produire et contrôler le suivi Excel | [Construction du classeur](../../../scripts/build-npc-workbook-v615.mjs), [vérification OpenXML](../../../scripts/verify-npc-workbook-v615.py) |
| Préparer et vérifier la galerie | [Construction de la galerie](../../../scripts/build-npc-gallery-v615.mjs), [vérification navigateur](../../../scripts/verify-npc-gallery-v615.mjs) |
| Vérifier les documents publics | [Audit des enregistrements](../../../scripts/audit-npc-public-records-v615.py) |
| Emballer un commit publié | [Paquet cumulatif V6.15](../../../scripts/package-npc-production-v615.py) |

Le paquet vise les cinq livraisons V6.11 à V6.15, leurs 144 PNG, leurs preuves et leurs 18 classeurs. Pour consulter la galerie hors ligne, extraire le ZIP complet ou toutes les parties ZIP standard dans le même dossier, puis ouvrir `index.html`. Chaque partie est une archive indépendante ; leurs octets ne se concatènent pas. Le dépôt complet reste nécessaire pour reconstruire ou exécuter le jeu et ses tests.

## Travail restant

Après l’ajout des 18 Sucklings 02 au suivi, **2 682 variantes restent à produire** et **205 productions restent à vérifier**. Les 18 Enforcers 10 V6.14 demeurent conservés dans la PR. Les **36 traces V6.10 sans PNG retrouvé** et les **21 prompts finaux V6.13 non récupérés** restent explicitement signalés. V6.15 complète ce lot de 18 fiches et laisse ces autres travaux visibles dans le suivi.
