# Predator: Badlands — sprites V15

**1 nouveaux PNG transparents**, ajoutés le 17 novembre 2026 à la PR #146. Avec les 166 fichiers V14 conservés, la collection documentée compte **167 PNG**.

Ce lot complète les sujets ou états absents de l’inventaire précédent. Chaque fichier reste une image statique indépendante. Il n’inclut pas de cycle d’animation, de rig, de collision ni de validation artistique humaine.

## Nouveaux fichiers

| ID | Sujet / PNG natif | Catégorie | Dimensions | Provenance et contrôle |
|---:|---|---|---:|---|
| 167 | [Ceinture, tablier et tassettes de Njohrr](sprites/yautja/167_njohrr_ceinture_tablier.png) | yautja | 1254 × 1254 | [Détails](metadata/167_njohrr_ceinture_tablier.json) |

## Références et limites

Les photographies de production Ra Vincent et le breakdown d’Important Looking Pirates documentent les éléments WY et ceux du champ de Puffer. Les pièces de Njohrr s’appuient sur les photographies officielles d’une figurine Hot Toys sous licence, identifiée comme source secondaire du costume. Les occultations, revers et adaptations d’angle sont détaillés pour chaque fichier dans [SOURCES_BADLANDS_V15.md](SOURCES_BADLANDS_V15.md).

Les PNG sont les sorties natives de la génération d’images : aucun détourage, redimensionnement, recadrage ou changement de pixels après génération. Le contrôle a porté sur leur décodage, l’alpha réel, le cadrage complet visible, les dimensions et les empreintes SHA-256/Git. Le statut artistique reste **draft** ; aucune fidélité exacte 1:1 ni exhaustivité du film n’est déclarée.

## Utilisation dans le projet

Les sources sont conservées sous `art-source/predator-badlands/v15/`. Elles sont disponibles dans la PR pour sélection et intégration. Les atlas et le chargement du jeu restent à raccorder explicitement ; `installedInProject` vaut `false`. Les pivots, échelles, collisions et points d’attache ne sont pas déduits arbitrairement des dimensions PNG.

- [Manifest avec liens vers les 167 fichiers](MANIFEST_BADLANDS_V15.json)
- [Empreintes des nouveaux PNG](SHA256SUMS.txt)
- [Index des 166 originaux V14](../../project-recovery-20261117/badlands-october/INDEX_SPRITES_CONVERSATION.md)

Les requêtes exactes de génération sont conservées dans `prompts/`. Leurs chemins de référence sont ceux de l’environnement de génération ; les URL publiques et les observations permettant d’identifier ces références sont conservées dans `metadata/`.
