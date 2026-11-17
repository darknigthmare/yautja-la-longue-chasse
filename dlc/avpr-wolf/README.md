# AVP: Requiem — Wolf / Le Nettoyeur — archive récupérée

Le dossier [`v0.7.0-candidate.1/`](v0.7.0-candidate.1/) conserve **139 fichiers originaux** du prototype conçu pour **Aliens: Tantalus Frontier**, à octets identiques au ZIP livré dans le projet. Cet import rend ses sources, images, documents, prompts éventuels et rapports accessibles dans le dépôt Yautja.

**État de production : draft.** Les campagnes et leurs sauvegardes historiques restent autonomes. Aucun registre de campagne, menu, moteur, système de sauvegarde ou roster Yautja n'est raccordé par cet archivage. La fidélité visuelle 1:1 et la revue artistique restent ouvertes.

## Examiner le paquet

Entrée autonome conservée : [`JOUER_AVPR_WOLF_V07.html`](v0.7.0-candidate.1/JOUER_AVPR_WOLF_V07.html). Le README à l'intérieur du paquet décrit sa version historique. Ses résultats de QA et mentions de fidélité restent attribués à cette livraison ; ils ne sont pas de nouveaux résultats de novembre.

Les scripts d'installation/désinstallation ciblent l'ancien hôte Tantalus. Ils sont conservés pour provenance et n'ont pas été exécutés sur Yautja. Aucun script de reconstruction n'a été lancé sur les sources archivées.

## Sources et versions précédentes

- Archive sélectionnée : `ALIENS_TANTALUS_DLC_AVPR_WOLF_v0.7.0-candidate.1.zip`, **1988097 octets**.
- SHA-256 : `1b88ed157c581ebd27437a4d0f346fc7bd96bdc3a25b3ea51ec2a6945f9012bd`.
- [Source originale](https://chatgpt.com/library?file_id=libfile_549456dfe2608191becfeea7c0af7928&account_id=personal).
- [Inventaire des 139 fichiers avec SHA-256 et empreinte Git](qa/IMPORT_INVENTORY_20261117.json).
- [Index des versions antérieures et correspondances par contenu](qa/SOURCE_ARCHIVES_20261117.json).

| Archive | Fichiers | Octets identiques présents dans la version sélectionnée | Fichiers historiques distincts |
| --- | ---: | ---: | ---: |
| `ALIENS_TANTALUS_DLC_AVPR_WOLF_v0.2.0-candidate.1.zip` | 12 | 0 | 12 |
| `ALIENS_TANTALUS_DLC_AVPR_WOLF_v0.3.0-candidate.1.zip` | 48 | 33 | 15 |
| `ALIENS_TANTALUS_DLC_AVPR_WOLF_v0.4.0-candidate.1.zip` | 69 | 53 | 16 |
| `ALIENS_TANTALUS_DLC_AVPR_WOLF_v0.5.0-candidate.1.zip` | 97 | 81 | 16 |
| `ALIENS_TANTALUS_DLC_AVPR_WOLF_v0.6.0-candidate.1.zip` | 119 | 104 | 15 |
| `ALIENS_TANTALUS_DLC_AVPR_WOLF_v0.7.0-candidate.1.zip` | 139 | 139 | 0 |

La dernière colonne désigne des fichiers qui restent dans leur archive source référencée, pas des fichiers remplacés arbitrairement par une version récente. Les copies internes nécessaires au paquet autonome sont conservées ; elles ne sont pas comptées comme de nouveaux dessins.

## Vérification de cette récupération

Depuis la racine du dépôt, avec Python 3 et Pillow disponibles :

```sh
python3 dlc/tools/verify_archive_recovery_20261117.py
```

Le contrôle est en lecture seule : empreintes, tailles, chemins, JSON, décodage PNG, syntaxe XML des SVG et manifestes historiques d'intégrité. Le rapport daté est dans [`qa/IMPORT_VERIFICATION_20261117.json`](qa/IMPORT_VERIFICATION_20261117.json). Il distingue une erreur historique du paquet d'un défaut de transfert. Aucun build Next, parcours navigateur, essai de combat ou nouveau contrôle de lore n'est revendiqué.
