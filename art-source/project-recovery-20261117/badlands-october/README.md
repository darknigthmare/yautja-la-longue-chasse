# Badlands — sources d’octobre récupérées

Ce dossier réunit les documents de génération et les correspondances de contenu des deux packs Badlands du 7 octobre 2026. Il prolonge la récupération du projet sans régénérer ni retoucher les images.

## Contenu vérifié

| Source | Membres | PNG | Contrôle SHA256 des membres |
| --- | ---: | ---: | ---: |
| `PREDATOR_BADLANDS_V14_166_ASSETS.rar` | 178 | 167, dont un aperçu | 177/177 entrées vérifiées |
| `PREDATOR_BADLANDS_LOT14_7_AJOUTS.rar` | 19 | 8, dont un aperçu | 18/18 entrées vérifiées |

Les 166 assets du cumul et les sept occurrences du lot complémentaire correspondent exactement aux octets déjà présents dans `main`. L’aperçu du cumul y est également présent. Le manifeste pointe vers leurs chemins existants et vers le commit de comparaison `351208cc9d3a7157e563a0426f9208aecab6c20e`. Aucun de ces PNG n’est recopié.

Les deux packs représentent 197 occurrences et 189 contenus uniques. Trois documents autonomes rattachés aux mêmes packs sont également recensés : le manifeste et le guide d’intégration, identiques à leurs versions du cumul, et la liste originale des packs. L’ensemble suivi compte 200 occurrences et 190 contenus uniques.

La récupération ajoute 23 fichiers sources uniques (3 385 883 octets), principalement les prompts, les inventaires, les audits, les guides et les manifestes historiques, ainsi que l’aperçu du lot 14. Les noms et les octets originaux sont conservés sous `originals/` et `supporting_documents/`.

## Lire la correspondance

[RECOVERY_MANIFEST.json](RECOVERY_MANIFEST.json) associe chaque membre d’archive à une `destination` nouvelle ou à une `reusedReference`. Chaque ligne contient taille, SHA256 et identifiant de blob Git. Les références à `main` sont liées à un commit immuable. La comparaison couvre également les six PR ouvertes, avec leurs numéros et commits ; aucune de ces sources n’a été trouvée uniquement dans une PR.

Les doublons internes aux packs et les copies autonomes identiques sont référencés une seule fois. Les archives RAR ne sont pas dupliquées dans le dépôt : leurs identifiants de source, tailles et empreintes sont conservés dans le manifeste, et tous leurs membres sont couverts par une destination ou une référence. Les galeries et fichiers SHA256 historiques gardent leur contenu d’origine. Pour consulter une galerie avec ses images relatives, il faut reconstituer son arborescence d’archive à partir des correspondances du manifeste ; ce dossier de sources ne réécrit pas les galeries.

## Statut artistique et intégration

Les sources déclarent `approximation`, `installedInProject: false` et l’absence de validation en jeu. Ces déclarations historiques restent intactes. La présence de leurs octets dans le dépôt établit leur conservation, pas leur emploi par un écran ou une animation. Cette récupération ne certifie aucune fidélité 1:1 ni validation artistique humaine, et ne raccorde aucun élément au moteur.

Ce chantier concerne des sources d’images Badlands d’octobre, distinctes des archives des campagnes Tantalus. Il ne modifie aucun module de jeu.

## Vérification de récupération

[RECOVERY_VERIFICATION.json](RECOVERY_VERIFICATION.json) consigne la comparaison des empreintes, les références réutilisées et le contrôle des copies locales. Les contrôles des archives portent sur les octets, les tailles et les dimensions déclarées. Aucune nouvelle revue artistique ou session de jeu n’a été réalisée pour cet archivage.
