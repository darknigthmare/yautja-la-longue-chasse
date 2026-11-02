# Production native Homeworld — industrie, architecture et accessoires

Lot daté du 2 novembre 2026 : **17 cibles, 17 PNG originaux, une variante candidate par ID, aucun retry**. Les 17 objets ont été examinés visuellement. Les deux tunnels ont été produits par le sous-agent et ouverts par le coordinateur ; les quinze autres ont aussi été ouverts par ce sous-agent en contre-lecture. Cela ne constitue aucune validation artistique humaine.

Tous les fichiers sont **CANDIDAT_NON_ADMIS**. Aucun montage dans le jeu, aucun test de placement ou de gameplay, aucune clôture du catalogue. Les 56 exigences globales et les 354 cibles artistiques restent ouvertes. Ce lot ne livre ni vingt variantes, ni animations, ni cycle de portes/énergie.

Le [manifeste](industrial-architecture-production-manifest.json) relie chaque ID aux cellules Excel et aux sources historiques exactes, au reçu complet, au prompt réellement envoyé, au PNG et à leurs empreintes SHA256. Les [reçus](receipts/) contiennent les limites propres à chaque objet et les pivots d'image proposés, non testés dans le runtime. Le [guide épinglé](guides/create-game-assets-SKILL.md) et la [copie exacte de l'audit de départ](sources/art-gap-manifest.json) sont conservés.

## Fichiers et marges

Marges dans l'ordre gauche/haut/droite/bas, en pixels natifs. Le seuil alpha>8 décrit le corps visible ; il ne remplace jamais la mesure stricte alpha>0. **17/17 échouent à la marge stricte48px**. Parmi eux, 13 ont quelques pixels alpha1/2 au bord. Aucun n'a de pixel alpha>2 au bord. Les halos ténus des pompe/valve/scrap restent présents et non retouchés. Au seuil diagnostic alpha>8, seuls le hangar, le totem et le générateur échouent encore à48px.

| Cible exacte | Objet | Dimensions natives | Marges alpha>0 | Marges alpha>8 |
| --- | --- | --- | --- | --- |
| target-v81-55-26 | balcon | 1388×1133 | 0/52/6/24 | 116/214/92/166 |
| target-v81-55-42 | tunnel | 1254×1254 | 0/25/30/24 | 85/245/53/222 |
| target-v81-55-43 | entrée tunnel | 1254×1254 | 0/17/24/0 | 91/149/59/129 |
| target-v81-56-56 | sas hangar | 1254×1254 | 0/23/3/26 | 88/260/83/243 |
| target-v81-59-105 | hangar | 1254×1254 | 0/52/14/0 | 45/364/26/276 |
| target-v81-65-175 | totem | 1254×1254 | 33/18/32/17 | 384/21/374/21 |
| target-v81-66-192 | crochet à trophées | 1254×1254 | 0/36/110/40 | 268/225/148/286 |
| target-v81-68-236 | trappe | 1254×1254 | 0/37/38/0 | 135/330/121/236 |
| target-v81-73-295 | tuyau apparent | 1312×1199 | 39/39/20/0 | 189/97/135/146 |
| target-v81-73-301 | pile scrap | 1536×1024 | 0/9/14/0 | 258/178/260/192 |
| target-v81-73-308 | échafaudage | 1218×1291 | 35/21/30/24 | 292/143/240/134 |
| target-v81-74-310 | générateur | 1254×1254 | 0/19/30/0 | 50/221/41/231 |
| target-v81-74-311 | transformateur | 1254×1254 | 0/0/14/0 | 279/180/253/151 |
| target-v81-74-315 | radiateur | 1254×1254 | 0/31/22/0 | 122/262/78/234 |
| target-v81-74-316 | pompe | 1536×1024 | 2/79/142/24 | 398/208/356/203 |
| target-v81-74-319 | valve | 1536×1024 | 55/75/88/18 | 449/177/463/205 |
| target-v81-76-354 | alcôves | 1133×1388 | 0/8/3/0 | 122/89/83/95 |

## Portée et limites

Les PNG sont des objets entiers, RGBA, aux dimensions réellement livrées par `image_gen.imagegen`, avec palette basaltique sombre/bronze/ambre et vue trois quarts. Les références PNG existantes ont été ouvertes puis décrites textuellement ; aucune image n'a été transmise au générateur comme conditionnement. Aucun pixel n'a été découpé, redimensionné, réfléchi, recompressé, nettoyé ou corrigé. Les copies locales sont identiques aux originaux laissés dans `/workspace/generated_images/`.

Le balcon et le crochet ont besoin d'un pivot d'attache au mur ; le centre bas de la boîte alpha proposé dans les reçus n'est pas ce pivot. Le tunnel possède un corps couvert et une ouverture latérale, mais son passage continu avant/arrière n'est pas établi. L'entrée est une arche distincte et vide. Le sas représente une seule pose avant ouvert/arrière fermé, la trappe un seul état fermé. Le hangar ne prouve pas un intérieur parcourable. « Alcôves » livre ici une seule niche candidate. Le totem et les reliefs sont des créations originales compatibles avec la direction du projet, sans revendication d'objet canonique. Les natifs scrap/pompe/valve ont un alpha maximal254 ; cette transparence résiduelle est conservée, sans forcer l'opacité à255.

Les anciennes images de pompe/valve du Pit et le crochet portatif V17 existent déjà dans d'autres contextes ; le lot ne les qualifie pas d'absents partout. Les deux ascenseurs V82 déjà identifiés ne sont pas régénérés. Les locateurs V111/V112 et les références sont un **SNAPSHOT_HISTORIQUE** daté, jamais un engagement sur les octets d'un runtime futur.

## Vérification

`python3 /workspace/native-homeworld-open-20261102/industrial-architecture/verify-production.py` vérifie sans écriture les17 copies contre les17 originaux, les empreintes du manifeste/inventaire, les mesures alpha0/2/8, les dimensions et les drapeaux d'état. C'est une vérification d'intégrité des fichiers présents dans cet espace de travail, pas une régénération déterministe des images ni une admission artistique. Les variations futures des références historiques sont rapportées sans modifier silencieusement leurs empreintes.

`copy-native-and-measure.py` et `finalize-production.py` sont les utilitaires de production conservés pour provenance ; ils écrivent des sorties et ne doivent plus être exécutés sur ce lot une fois figé. Aucun fichier de l'application, classeur, certificat R7/V112/V113 historique ou Git n'a été modifié par ce lot.
