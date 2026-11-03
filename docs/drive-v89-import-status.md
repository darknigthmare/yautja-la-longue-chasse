# Drive Yautja — import natif V89

Rapport établi le 8 octobre 2026 à 18:02 UTC. Les nombres ci-dessous concernent ce lot, pas l'achèvement du jeu ni l'ensemble des images qui pourraient exister dans Drive.

## Sources examinées

Le rafraîchissement Drive du 8 octobre 2026, de 14:30:41.279 à 14:30:48.447 UTC, retrouve les 15 dossiers et 239 identifiants de l'instantané précédent. Aucun identifiant nouveau, disparu ou réellement révisé n'a été observé. Les recherches paginées de dossiers « Yautja », « Predator » et « Longue Chasse » n'ont pas trouvé de dossier supplémentaire. Il s'agit d'un constat à cette heure, sans garantie sur les dépôts ultérieurs.

Les 26 archives historiques accessibles ont ensuite été récupérées avec un transfert authentifié et comparées en entier :

| Mesure | Résultat |
| --- | ---: |
| Archives authentifiées, SHA et taille contrôlés | 26 |
| Octets transférés | 1 438 819 571 |
| Entrées PNG source comparées | 599 |
| SHA PNG distincts comparés | 589 |
| Entrées déjà présentes dans les fichiers natifs du jeu | 593 |
| SHA déjà présents, vérifiés sur les octets natifs | 583 |
| PNG réellement absents avant ce lot | 6 |
| Erreurs de lecture restantes | 0 |

Les cinq fichiers de code présents dans les packs ont été ignorés. Aucun script d'archive n'a été exécuté. Les fichiers de métadonnées ont été lus comme des données ; leur SHA et leur archive d'origine restent liés dans la provenance. Les archives et les versions anciennes restent conservées. Les packs Alien trouvés hors du périmètre Yautja n'ont pas été importés.

## Import effectif

Six PNG natifs, totalisant **6 168 549 octets**, sont copiés sans transformation dans `/game/imports/v89/`. Leur SHA, leurs dimensions et leurs octets correspondent aux membres d'origine. Il s'agit exclusivement de planches de référence Badlands :

| Planche | Dimensions | Octets | SHA-256, début |
| --- | --- | ---: | --- |
| APERCU_BADLANDS_LOT8.png | 2400 × 1090 | 827 521 | `4fceb7756f3297a0` |
| APERCU_BADLANDS_LOT9.png | 2400 × 1514 | 1 019 834 | `a89ab41595b99d35` |
| APERCU_BADLANDS_LOT10.png | 2400 × 1456 | 1 123 902 | `d74f3a1cb3fb0c6c` |
| APERCU_BADLANDS_LOT11.png | 2400 × 1456 | 1 106 091 | `c63964f5a9831062` |
| APERCU_BADLANDS_LOT12.png | 2400 × 884 | 549 990 | `deb285c31964668b` |
| APERCU_BADLANDS_LOT13.png | 2400 × 2028 | 1 541 211 | `9d217d0c33ff37a9` |

L'inspection visuelle de chaque image entière confirme des grilles légendées sur fond opaque, avec des objets et poses à des échelles différentes. Elles sont conservées entières, sans découpe. Elles ne sont ni des corps autonomes de PNJ, ni des atlas d'animation utilisables tels quels. Le registre les classe `kind: reference`, `bodyComposition: reference-image`, `fullBody: false`, avec une seule image statique et aucune animation disponible.

**Ce lot ajoute zéro nouveau corps, zéro sprite de gameplay, zéro matériau et zéro cycle d'animation.** Il ne certifie aucune fidélité canonique 1:1. La limite de fidélité déclarée par les sources, les noms historiques et les références aux métadonnées sont conservés. Une légende présentant une correction sur une planche n'est pas transformée en relation de remplacement entre personnages du jeu.

Les sources, SHA complets, membres d'archives, dimensions, liens Drive ordinaires et preuves des PNG déjà présents sont consignés dans [drive-new-deposits-v89-sources.json](drive-new-deposits-v89-sources.json). Le registre consommable est [driveNewDepositsSpritesV89.json](../app/game/data/driveNewDepositsSpritesV89.json). Aucun lien de téléchargement signé, jeton, handle privé ou chemin de téléchargement privé n'est publié dans ces fichiers.

## Limites restantes

Deux archives restent sans nouvelle preuve de leurs octets Drive : le connecteur refuse un fichier dépassant **268 435 456 octets**, avec une réponse HTTP 413. Leurs éventuels fichiers natifs déjà connus ne prouvent pas l'identité des archives distantes.

| Archive | Identifiant Drive | Taille déclarée |
| --- | --- | ---: |
| YAUTJA_V63_A_COURS_ET_CAVALIERS_10_GROUPES.zip | `13cSt6VFktmEI_DyTP-qDyaF5ox6rdErM` | 290 112 621 |
| YAUTJA_V66_V67_PACK_PORTABLE_COMPLET.zip | `1ZloGU8fSkqJD8GURmoXDSPCa-eYN7vSm` | 321 716 622 |

Sur les 28 archives historiques auparavant non réauthentifiées, 26 disposent donc maintenant d'une preuve fraîche ; ces deux fichiers restent ouverts. Aucun contournement de la limite du fournisseur n'a été tenté. Les transferts ont gardé au moins 5 milliards d'octets libres sur C: ; aucun déplacement vers O: ni suppression d'archives n'a été effectué dans ce lot.

Les **640 variantes V84** restent des fiches de métadonnées sans PNG natif retrouvé. Elles ne sont pas comptées comme images importées. Ce lot ne prétend pas avoir achevé toutes les sources Drive, les animations, les PNJ manquants ou les demandes des classeurs.

## Classeurs et raccordement produit

Aucune révision de classeur n'a été observée lors du rafraîchissement de 14:30 UTC. Les sources Excel connues restent notamment V6, identifiant `1kBa26-IY91k3uKughLaanIzUa57ZYAU3`, modifiée le 7 octobre à 07:42:49.812 UTC, et V5, identifiant `13eEqRxEUTiTEGAkKE4RyTcrrw2it9XRz`, modifiée le 7 octobre à 06:47:54.645 UTC. Ce contrôle de sources ne constitue pas une implémentation des guerres de clans, des acquisitions de vaisseaux ou des voix ; ces chantiers sont suivis séparément.

L'importeur, le registre et les originaux sont prêts pour le raccordement par le propriétaire de la bibliothèque et du codex. À la rédaction de ce rapport, ce chantier n'a pas modifié le renderer, les PNJ, les sauvegardes, les compteurs de la bibliothèque ou les informations de version. `productConsumerConnected` reste `false` dans la preuve d'import ; un raccordement ultérieur doit être validé séparément.

## Validation réalisée

Les sept tests de [drive-new-deposits-v89.test.mjs](../tests/drive-new-deposits-v89.test.mjs) passent. Ils contrôlent les vrais octets des six nouveaux PNG et des 583 SHA natifs existants, la déduplication, les dimensions, l'absence de source animée, la classification des planches, leurs liens de provenance, les limites du fournisseur et l'absence de données privées dans les registres. ESLint ciblé, la compilation syntaxique Python et le contrôle de diff ciblé passent également.

L'inspection visuelle porte sur les six originaux importés. Aucun test de navigateur, nouveau déploiement Vercel ou contrôle de production n'est revendiqué par ce rapport.

## Raccordement ultérieur du lot V89

Le consommateur `recentSpriteLibraryV85.ts` inclut désormais ces six références,
avec leur pack et leur provenance. La bibliothèque et le codex présentent
1 877 SHA natifs distincts. Le huitième test vérifie ce raccordement sans rendre
les planches éligibles comme corps de personnage. Le champ
`productConsumerConnected:false` ci-dessus décrit la preuve au stade de l'import,
pas l'état ultérieur du consommateur. Il reste conservé dans cette preuve.

La bibliothèque a été ouverte dans Edge et la planche du lot 13 a été observée
entière et décodée à 2 400 × 2 028. Ce contrôle visuel est séparé des limites de
publication et des autres parcours de jeu décrits dans
[integration-v89.md](integration-v89.md).

## Rafraîchissement du 8 octobre à 19:18 UTC

Les quinze dossiers connus retournent les mêmes 239 identifiants que le relevé
de 14:30 UTC : zéro ajout, disparition ou modification de nom, taille, MIME,
date ou parent. Aucun résultat n'est tronqué au plafond de cent entrées
(maximum observé : 58). Les recherches de dossiers Yautja, Predator et Longue
Chasse ne montrent pas de nouveau dossier accessible. Ce résultat reste borné
aux dossiers et permissions du connecteur, pas à tout Drive.

Les métadonnées des classeurs V6 (2 101 543 octets) et V5 (1 107 914 octets)
restent identiques. Le V6 local conserve le SHA-256
`87ad5d1a6eaf49f2908a4457ef3f97b8f34db481a24bbc121d2e924559b19183`.
Le wrapper ne renvoie pas d'empreinte distante même demandée ; V5 n'est pas
présent localement. Aucune nouvelle certification des octets distants ni aucun
téléchargement supplémentaire n'est donc revendiqué par ce rafraîchissement.
