# Homeworld — audit GitHub / Excel et production ciblée

**3 novembre 2026.** Ce dossier part des fichiers réels, pas des planches générées ou des anciennes réponses.

## Livraison réelle

- Dans cette PR : le présent bilan, `delivery.json`, le générateur Blender `tools/build_utility_props.py`, l’audit reproductible `tools/reconcile_targets.py` et ses six tests.
- [Classeur Excel — audit des 354 cibles](https://docs.google.com/spreadsheets/d/1yPkA2DWSfF1dYQhAXuNcMEzaOH-eAQ-j/edit?usp=drivesdk&ouid=102406458049746863092&rtpof=true&sd=true) : fichier XLSX conservé, 69 125 octets ; SHA-256 `cae56976396924a76178150de7b192595b5e7d45cbaee61f07c2f57504d2313e`.
- [Compagnon natif — dix props, vingt PNG séparés et dix sources Blender](https://d2ol7oe51mr4n9.cloudfront.net/user_3JHwJlNzgmcxQy32tjF7NiVZPuH/51ce61d5-d39f-41a8-bae6-0978dcdf1311.zip) : 21 702 086 octets ; SHA-256 `30c0a3fbcfd0d1af351a66026c998e52f4bbfe9c22632aa14433f9dbecc43a26`.

**Les nouveaux PNG, .blend et XLSX sont liés depuis la PR, mais leurs binaires ne sont pas committés dans cette livraison.** Le générateur, les preuves et le suivi sont committés. Aucun import au runtime ni fusion dans main. L’Excel est un fichier privé du propriétaire, sans modification de partage.

## Versions examinées

| Source | Commit |
|---|---|
| main | `f322e0cb42f2b1b7e06c3be1dcfbb23cb24f02c8` |
| PR #99, y compris les 17 sprites marché / montures / chenils | `d4c43dce5286fbb64e41ae5fa22cb82854572a7e` |
| PR #97, placements / occlusions | `79cc2c537c89a17174471f3d9f3b954a6a1d5ac1` |
| PR #98, preuves / enveloppes d’usage | `c62f09f6d5f5ff9a0613c0facd584b60de3af98a` |

Les arbres Git sont complets, non tronqués. Le registre V81, les deux briefs originaux de cité-monde et de grammaire spatiale, les feuilles ArtCatalogueV113 / CandidatsHWV114 du cumulatif V114, le classeur V162 et le classeur des trois secteurs ont été lus. Les PR #97 et #98 n’apportaient pas de nouveaux PNG. main est resté au même commit à la vérification de fin de production.

## Rapprochement des 354 exigences

| État au relevé | Nombre | Conséquence |
|---|---:|---|
| Sources publiques nommées explicitement reliées | 3 | Réutiliser, vérifier états et variantes |
| Candidats déjà reliés à une cible exacte | 61 | Examiner leur qualité avant de recréer |
| Pièces indépendantes non repérées, sélectionnées pour ce lot | 10 | Sources natives produites ci-dessous |
| Cycle animé restant à établir | 1 | Ne pas confondre image statique et animation |
| Famille apparentée, correspondance précise non résolue | 279 | Comparaison visuelle cible par cible encore nécessaire |
| **Total** | **354** | **Aucune portée globale automatiquement close** |

Les **40 anciens MISSING** disposent d’une source exacte à examiner : 38 cibles avec candidats V113/V114 et deux cibles d’ascenseur avec fichiers V82. Cela ne les rend ni artistiquement validées ni jouables. Les 279 rapprochements de famille ne sont **pas** présentés comme 279 objets absents.

La recherche préliminaire avait trouvé huit pièces, puis deux faux positifs ont été éliminés : une illustration rejetée de conversation PNJ contenant « gutter » dans son nom, et des échelles d’un autre biome. Ce ne sont pas des livraisons Homeworld. L’audit corrigé et les tests retiennent dix pièces. La table de `delivery.json` est la référence finale des IDs de ce lot.

Les 117 sources des lots V160–V162 et les 17 sprites des secteurs restent **134 fichiers historiques suivis**, pas 134 props uniques validés. Le nouveau lot contient dix objets fonctionnels et vingt vues, pas vingt nouveaux types de props.

## Dix props indépendants produits

| ID | Cible source | Pièce |
|---|---|---|
| HWP163-01 | target-v81-63-151 | Conduit de chaleur de forge |
| HWP163-02 | target-v81-67-211 | Conduit d’énergie du spatioport |
| HWP163-03 | target-v81-67-212 | Câble d’énergie au sol |
| HWP163-04 | target-v81-67-215 | Échelle de maintenance |
| HWP163-05 | target-v81-68-233 | Grille de drainage de rue |
| HWP163-06 | target-v81-68-235 | Caniveau de desserte |
| HWP163-07 | target-v81-68-239 | Ventilation de sol |
| HWP163-08 | target-v81-73-294 | Câble suspendu des bas-quartiers |
| HWP163-09 | target-v81-74-324 | Treuil de manutention |
| HWP163-10 | target-v81-74-326 | Rail de manutention |

Un objet fonctionnel par PNG. Deux rendus par modèle : avant et arrière, orientations natives de 25° et 205°, **pas des miroirs**. La symétrie de certaines pièces explique leurs vues proches ; elles ne sont pas comptées comme deux fonctions. Sources 3D éditables incluses. Aucun personnage, cadre ou texte fusionné dans ces sprites.

Le rendu procédural demeure un **candidat artistique**, à comparer à la patine et aux silhouettes des ressources du jeu. Ces utilitaires sont des **adaptations originales du projet**, pas des objets déclarés canoniques 1:1. Le concept de base sert de grammaire visuelle et spatiale ; il ne prouve ni les faces cachées, ni des dimensions officielles, ni l’appartenance à une tribu.

## Perspective, échelle et vérifications

Caméra orthographique construite à 35° de plongée, yaw global 0°. Dimensions et pixels par mètre consignés par rendu dans le compagnon. Les dimensions sont des choix de conception, non des mesures de la franchise. Aucun écrasement de bâtiment, agrandissement artificiel, recadrage de planche ou padding correctif n’a été utilisé pour les vingt rendus.

Vérifications exécutées :

- Six tests de rapprochement réussis, dont exclusion du faux caniveau, exclusion de l’échelle hors périmètre et conservation des ascenseurs existants.
- Rapprochement reproductible des 354 IDs : 3 / 61 / 279 / 1 / 10, identique au classeur.
- Vingt PNG RGBA non vides ; marges transparentes natives contrôlées, minimum **117 px** pour un seuil demandé de 48 px.
- SHA-256, dimensions et octets des vingt fichiers consignés dans `delivery.json` ; dix fichiers `.blend` produits.
- Classeur réimporté après export : 354 IDs conservés, 117 lignes de métadonnées historiques inchangées, 17 entrées de secteurs, vingt vues comptabilisées, aucune cellule d’erreur enregistrée.

```sh
python3 production/homeworld-reconciled-20261103/tools/test_reconcile_targets.py -v
python3 production/homeworld-reconciled-20261103/tools/reconcile_targets.py --repo .
blender --background --python production/homeworld-reconciled-20261103/tools/build_utility_props.py
```

Le générateur reproduit les modèles et le cadrage ; les octets d’un nouveau rendu peuvent varier selon la version de Blender. Les empreintes décrivent les fichiers effectivement livrés.

## Ce qui reste ouvert

Les 279 rapprochements de famille demandent encore une vraie comparaison de silhouette et de fonction ; les 61 candidats exacts conservent leurs propres défauts à traiter. Le cycle animé de forge reste séparé. Le nouveau lot demande encore finition artistique, raccords, taille dans la scène, collision, interaction et import binaire dans le dépôt.

Une tentative de génération a produit une planche non conforme. Elle est **rejetée**, non importée et non comptée ; ses mentions dessinées de « pack complet » ou de livraison PR n’ont aucune valeur de preuve. Son empreinte est consignée dans `delivery.json`.

**Aucune certification canonique 1:1, validation humaine, clôture globale ou admission runtime nouvelle.** Les anciens classeurs, sauvegardes et preuves restent préservés.
