# DLC conservés — sources et provenance

Les sous-dossiers conservent les prototypes et livraisons historiques retrouvés dans les discussions du projet. La présence d'un paquet dans Git ne l'active pas dans la campagne Yautja.

| Dossier | Version conservée | État de cette récupération |
| --- | --- | --- |
| [`predator-1987/`](predator-1987/) | V0.3 et archives V0.1–V0.3 | Import antérieur conservé. |
| [`prey-2022/`](prey-2022/) | V0.6 | Import antérieur conservé, avec ses limites documentées. |
| [`predator-badlands/`](predator-badlands/RECOVERY_20261117.md) | V0.1 et V0.2 reconstruite | 28 compléments restaurés ; 79 fichiers de la livraison source conservés, dont son ancien statut archivé à un chemin historique. |
| [`avp-2004-predator/`](avp-2004-predator/) | V0.5 | 108 originaux inchangés, provenant du prototype Tantalus. |
| [`avpr-wolf/`](avpr-wolf/) | V0.7.0-candidate.1 | 139 originaux inchangés, provenant du prototype Tantalus. |

La récupération du 17 novembre 2026 ajoute **275 fichiers de contenu auparavant absents** : 28 Badlands, 108 AVP et 139 AVP:R. Le statut d'origine du paquet Badlands est conservé en complément ; il n'est pas compté comme un nouveau dessin ou une nouvelle fonctionnalité. Les inventaires et rapports d'import sont séparés des documents historiques.

## Vérifier les fichiers récupérés

Depuis la racine du dépôt, avec Python 3 et Pillow :

```sh
python3 dlc/tools/verify_archive_recovery_20261117.py
```

Cette commande lit les trois inventaires, compare tailles/SHA-256/empreintes Git, décode les PNG, analyse les JSON/SVG, vérifie les CRC des ZIP/XLSX et les sommes de contrôle historiques. Elle n'exécute aucun installateur, reconstruction ou test de gameplay et n'écrit pas dans le dépôt.

Les sources AVP et AVP:R restent au statut artistique **draft**. Les SVG, captures, sprite sheets et rapports ne constituent pas une certification de fidélité 1:1 ni une recette du moteur Yautja. Les scripts d'installation visent Tantalus et restent archivés. Les versions précédentes sont référencées avec leurs empreintes et correspondances par contenu ; les fichiers historiques distincts restent explicitement attribués à leurs archives sources.

## The Predator (2018)

[`the-predator-2018/`](the-predator-2018/RECOVERY_20261117.md) : v0.5 complète (51 fichiers), ZIP originaux v0.2/v0.3/v0.5 et six fichiers v0.4 récupérés séparément. Import de sources uniquement ; pas de fusion HuntCanvas ni d’activation automatique. Les inventaires propres à ce DLC sont séparés des totaux de récupération précédents.
