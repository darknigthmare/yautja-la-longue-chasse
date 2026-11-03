# Homeworld — rapprochement des sources, 3 novembre 2026

## Base réellement relue

- main : `f322e0cb42f2b1b7e06c3be1dcfbb23cb24f02c8`.
- PR #99 : `d4c43dce5286fbb64e41ae5fa22cb82854572a7e`, incluant les 17 nouveaux sprites marché / montures / chenils.
- PR #97 : `79cc2c537c89a17174471f3d9f3b954a6a1d5ac1` ; PR #98 : `c62f09f6d5f5ff9a0613c0facd584b60de3af98a`. Ces deux branches modifient placements et habillage, sans ajouter de PNG.

Registre V81, brief macro de cité-monde, grammaire spatiale, feuilles ArtCatalogueV113/CandidatsHWV114 du classeur cumulatif V114, classeur V162 et classeur des trois secteurs examinés. Les arbres Git complets ne sont pas tronqués. Les sources historiques ne sont pas réécrites.

## Résultat du rapprochement documentaire

| État de présence | Cibles |
|---|---:|
| Sources publiques nommées explicitement reliées | 3 |
| Candidats reliés à une cible exacte dans les manifestes | 61 |
| Composant indépendant non repéré dans la recherche ciblée | 8 |
| Cycle animé restant à établir | 1 |
| Famille apparentée, correspondance visuelle précise à réconcilier | 281 |
| Total | 354 |

Les **40 anciens MISSING** du suivi V111/V113 disposent maintenant d'au moins un fichier candidat exact ou d'une source native nommée. Cela ne transforme aucun candidat en asset artistiquement accepté : les défauts de résolution, alpha, proportions ou fonction restent ouverts. Les deux cibles d'ascenseur possédaient déjà leurs fichiers V82.

Les **281 rapprochements de famille** ne sont pas annoncés comme 281 objets absents. Une source de pavage ne prouve pas une grille de drainage ; un portique n'est pas un treuil autonome. Le relevé distingue donc existence d'un fichier, correspondance à la fonction et admission dans le jeu.

Les 117 fichiers des lots V160–V162 et les 17 sprites des secteurs forment **134 fichiers suivis**, pas 134 props uniques terminés. Les candidats V113/V114 déjà présents dans main sont conservés séparément.

## Huit besoins indépendants retenus

| ID | Cible héritée | Pièce indépendante |
|---|---|---|
| HWP163-01 | target-v81-63-151 | Conduit de chaleur de forge |
| HWP163-02 | target-v81-67-211 | Conduit d'énergie du spatioport |
| HWP163-03 | target-v81-67-212 | Câble d'énergie au sol |
| HWP163-04 | target-v81-68-233 | Grille de drainage de rue |
| HWP163-05 | target-v81-68-239 | Ventilation de sol |
| HWP163-06 | target-v81-73-294 | Câble suspendu des bas-quartiers |
| HWP163-07 | target-v81-74-324 | Treuil de manutention |
| HWP163-08 | target-v81-74-326 | Rail de manutention |

Cette sélection vient d'une recherche ciblée dans 2 612 noms de ressources et des rapprochements des manifestes. Elle n'est ni la totalité des variantes demandées ni une certification d'absence dans toute illustration composite. Les huit lignes restent **à produire** tant qu'un fichier individuel contrôlé n'est pas livré.

## Contrat conservé

Orthographique, plongée 35°, yaw global 0°. Proportions non condensées ; dimensions physiques seulement proposées pour le jeu ; aucun symbole ou fonction nouvelle présenté comme canon. Un objet par fichier, pas de catalogue illustré, pas de validation dessinée dans une image. Pour les utilitaires : pierre sombre, métal usé, bronze discret, éclairage rouge parcimonieux ; aucune lave ajoutée par défaut.

Les pièces utilitaires sont des **adaptations originales du projet**, pas des reproductions attestées 1:1. Le concept fourni sert de grammaire visuelle et spatiale. Les faces cachées, les intérieurs et les espèces du premier plan ne sont pas inventés comme faits du lore.

## Traçabilité de l'audit

[Archive des entrées et du rapprochement](https://d2ol7oe51mr4n9.cloudfront.net/user_3JHwJlNzgmcxQy32tjF7NiVZPuH/a9bebd48-e6e2-4f69-95c1-8a40012d30a1.zip)

Archive : 10 608 102 octets ; SHA-256 `3506d1b47d33a0f4e05ed8e3ae17bc8df5bbf33cbbc5d987924fcc78150c4bcc`. Elle contient l'instantané de lecture, les tables extraites, `build_audit.py`, le rapprochement des 354 cibles et les huit briefs. Une archive de travail ne constitue pas l'intégration des images dans le runtime.

**Aucune nouvelle admission artistique, canonique ou runtime ; aucune fusion dans main.**
