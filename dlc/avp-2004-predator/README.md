# AVP (2004) — Le Rite sous la glace / Predator — archive récupérée

Le dossier [`v0.5.0/`](v0.5.0/) conserve **108 fichiers originaux** du prototype conçu pour **Aliens: Tantalus Frontier**, à octets identiques au ZIP livré dans le projet. Cet import rend ses sources, images, documents, prompts éventuels et rapports accessibles dans le dépôt Yautja.

**État de production : draft.** Les campagnes et leurs sauvegardes historiques restent autonomes. Aucun registre de campagne, menu, moteur, système de sauvegarde ou roster Yautja n'est raccordé par cet archivage. La fidélité visuelle 1:1 et la revue artistique restent ouvertes.

## Examiner le paquet

Entrée autonome conservée : [`AVP_PREDATOR_STANDALONE_V0_5.html`](v0.5.0/AVP_PREDATOR_STANDALONE_V0_5.html). Le README à l'intérieur du paquet décrit sa version historique. Ses résultats de QA et mentions de fidélité restent attribués à cette livraison ; ils ne sont pas de nouveaux résultats de novembre.

Les scripts d'installation/désinstallation ciblent l'ancien hôte Tantalus. Ils sont conservés pour provenance et n'ont pas été exécutés sur Yautja. Aucun script de reconstruction n'a été lancé sur les sources archivées.

## Sources et versions précédentes

- Archive sélectionnée : `ALIENS_TANTALUS_DLC_AVP_PREDATOR_v0.5.0.zip`, **282272 octets**.
- SHA-256 : `c63aca923a08a4db30cc31c36173454de12ca313d5d3d288c7e4bd0095e3f5d4`.
- [Source originale](https://chatgpt.com/library?file_id=libfile_d044f221ed3c819180990a675368aac6&account_id=personal).
- [Inventaire des 108 fichiers avec SHA-256 et empreinte Git](qa/IMPORT_INVENTORY_20261117.json).
- [Index des versions antérieures et correspondances par contenu](qa/SOURCE_ARCHIVES_20261117.json).

| Archive | Fichiers | Octets identiques présents dans la version sélectionnée | Fichiers historiques distincts |
| --- | ---: | ---: | ---: |
| `ALIENS_TANTALUS_DLC_AVP_PREDATOR_v0.1.0.zip` | 52 | 3 | 49 |
| `ALIENS_TANTALUS_DLC_AVP_PREDATOR_v0.2.0.zip` | 72 | 39 | 33 |
| `ALIENS_TANTALUS_DLC_AVP_PREDATOR_v0.3.0.zip` | 94 | 56 | 38 |
| `ALIENS_TANTALUS_DLC_AVP_PREDATOR_v0.4.0.zip` | 101 | 67 | 34 |
| `ALIENS_TANTALUS_DLC_AVP_PREDATOR_v0.5.0.zip` | 108 | 108 | 0 |

La dernière colonne désigne des fichiers qui restent dans leur archive source référencée, pas des fichiers remplacés arbitrairement par une version récente. Les copies internes nécessaires au paquet autonome sont conservées ; elles ne sont pas comptées comme de nouveaux dessins.

## Vérification de cette récupération

Depuis la racine du dépôt, avec Python 3 et Pillow disponibles :

```sh
python3 dlc/tools/verify_archive_recovery_20261117.py
```

Le contrôle est en lecture seule : empreintes, tailles, chemins, JSON, décodage PNG, syntaxe XML des SVG et manifestes historiques d'intégrité. Le rapport daté est dans [`qa/IMPORT_VERIFICATION_20261117.json`](qa/IMPORT_VERIFICATION_20261117.json). Il distingue une erreur historique du paquet d'un défaut de transfert. Aucun build Next, parcours navigateur, essai de combat ou nouveau contrôle de lore n'est revendiqué.
