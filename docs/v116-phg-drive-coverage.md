# V116 — Couverture des textures PHG et travaux non validés

**Objet :** recouper la branche V113/V115 de personnalisation avec le manifeste Drive daté du **7 octobre 2026**. Cette note identifie la portée des données ; elle ne déclare ni import graphique nouveau ni fidélité 1:1 atteinte.

## Bilan vérifié

| Source d'asset | Nombre de PNG | Disponibilité |
| --- | ---: | --- |
| `YAUTJA_PHG_RECONSTRUIT_156` | **156** | Sept ZIP sur Drive, non intégrés directement au registre du moteur |
| Suppléments `AJOUTS / COMPLEMENTS / FINITION / EXTENSION` | **44** | Fichiers individuels dont le registre V85 du dépôt assure la disponibilité ; quelques accessoires ne sont pas des matières à peindre |
| Total documentaire | **200** | **199 actifs**, **1 version archivée**, **6 provisoires** au total (dont 5 actifs) |
| Mode PNG | **198 RGB / 2 RGBA** | Les fichiers RGB sont des matières opaques, pas des silhouettes prêtes à jouer |

**Répartition :** 93 peaux, 17 dreadlocks, 7 ligatures/anneaux et 83 matériaux d'armure/vêtement. Les totaux décrivent des fichiers source, pas une liste exhaustive de toutes les variantes du jeu PHG.

**Sources :** registre `YAUTJA_PHG_INVENTAIRE_ACTUALISE_20261007.json`, inventaire `YAUTJA_PHG_RECONSTRUIT_156_INVENTAIRE.json` et reçu `YAUTJA_PHG_RECU_DRIVE_20261007.json`, déjà conservés dans le dossier Drive « Predator Hunting Grounds - Textures Yautja ». Le lien du dossier privé n'est pas intégré dans cette PR publique ; les archives restent à leurs emplacements source. Les 200 PNG et 25 travaux sont indexés dans le suivi XLSX V116 conservé à part pour ne pas gonfler les ressources binaires du jeu.

## Les sept ZIP distincts pour les 156 assets

| Archive | PNG | Rôle |
| --- | ---: | --- |
| `YAUTJA_PHG_PEAUX_DREADS_PARURES_01_SUR_04.zip` | 12 | Peaux, dreadlocks, parures |
| `YAUTJA_PHG_PEAUX_DREADS_PARURES_02_SUR_04.zip` | 29 | Peaux, dreadlocks, parures |
| `YAUTJA_PHG_PEAUX_DREADS_PARURES_03_SUR_04.zip` | 30 | Peaux, dreadlocks, parures |
| `YAUTJA_PHG_PEAUX_DREADS_PARURES_04_SUR_04.zip` | 30 | Peaux, dreadlocks, parures |
| `YAUTJA_PHG_ARMURES_01_SUR_03.zip` | 18 | Armures et textiles |
| `YAUTJA_PHG_ARMURES_02_SUR_03.zip` | 18 | Armures et textiles |
| `YAUTJA_PHG_ARMURES_03_SUR_03.zip` | 19 | Armures et textiles |

Les sept sommes donnent exactement 156. Ne pas générer de doublons de ces fichiers sur la simple supposition qu'ils sont manquants ; n'importer qu'après vérification de chaque archive, SHA, masque et usage.

## Vingt-cinq vérifications encore ouvertes

| État | Quantité | Décision |
| --- | ---: | --- |
| `missing_visual_reference` | **16** | Chercher une référence officielle nominative ; ne pas inventer une teinte certifiée |
| `visual_reuse_to_confirm` | **3** | Conserver l'alias proposé distinct de l'identité officielle |
| `approximation_available` | **5** | Afficher « approximation » ; les sprites ne sont pas certifiés exacts |
| `change_component_unverified` | **1** | Obtenir une preuve distinguant couleur, composant et forme |

Les deux correspondances de noms de shader documentées dans l'inventaire ne sont pas des UV extraites. Les 25 vérifications ont conservé leur état et ne deviennent pas « terminées » du seul fait d'une revue de tableur.

## Contrats d'intégration pour la prochaine admission artistique

1. Identifier `asset_id`, catégorie (`skin`, `dreads`, `outfit`, `armor` ou accessoire indépendant), SHA-256, archive d'origine et version d'actif. Une ligature ou un biomask ne doit pas être appliqué comme un textile générique.
2. Contrôler PNG et alpha, échelle, contours, répétition, pivots, attaches et six morphologies ; conserver l'atlas/rig original.
3. Pour les 156 PNG Drive-only, séparer extraction et import depuis la source, puis valider le rendu dans `HunterRigPreview`, `HomeworldModularHunter` et le `HuntCanvas`. Refuser un ID PNG absent ou un chemin non enregistré.
4. Conserver la séparation des quatre stations : laboratoire des chromatophores pour la peau, atelier des ligatures pour les dreadlocks, teinturier pour les vêtements et forge pour les plaques ; l'atelier du vaisseau reste une version compacte. Aucun ADN canonique n'est inventé.
5. Conserver les champs `chromaticsV113`, les sauvegardes historiques PR25 et les correctifs V116 d'écriture propriétaire. Aucune teinte n'octroie un rang, une arme ou une récompense.
6. Réaliser une revue visuelle par œuvre/version officielle (vue de face, profil, dos et poses pertinentes) avant de qualifier un travail de **fidèle 1:1**. Les matières 2D « cover » actuelles ne disposent pas d'UV officielles : ce seuil n'est **pas atteint**.

## Dépendances entre PR

- **#24** : branche V112 Homeworld, base de **#27** ; conserver cette relation avant fusion.
- **#25** : guides, imports, sauvegardes et matières, base `main` ; ses neuf fichiers en chevauchement avec #27 nécessitent une revue sémantique après intégration de #24.
- **#26** : planètes V114, base `main`, très grand chevauchement avec #25 ; réconcilier indépendamment avant toute fusion.
- **#27** : atelier V113–V116. Les correctifs V116 disposent de régressions et des jobs CI d'intégrité / types / lint ; ils n'approuvent pas les 200 textures visuellement.

Cette note est un inventaire de provenance et une barrière de QA, pas un ajout de ressources ni une fusion des PR.
