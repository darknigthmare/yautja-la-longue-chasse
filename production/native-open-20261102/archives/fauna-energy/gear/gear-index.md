# Lot gear — six candidats natifs

Six générations `image_gen.imagegen`, six PNG bruts **1254 × 1254 RGBA**, tous copiés byte-identiques depuis `/workspace/generated_images`. Statut de chaque image : **CANDIDAT_NON_ADMIS**. Aucun retry, pixel édité, crop, padding, miroir, fichier du dépôt, ancien lot ou classeur modifié.

Les deux sources portent exactement le même libellé **support harnais** (§71 FAUNE / §72 MONTURES). Portique bas de soin et chevalet vertical de stockage sont deux constructions contextuelles proposées ; leurs usages ne sont pas prouvés et un alias reste possible après revue humaine.

La selle et le harnais V34 existaient déjà : planches de deux profils RGB à magenta opaque. La selle de ce lot est un candidat transparent trois quarts contextuel, jamais une première selle inventée. **Aucune adaptation anatomique du harnais/selle, échelle monture, position cavalier, fixation ou animation n’est prouvée.**

| ID exact | PNG | SHA256 |
|---|---|---|
| target-v81-71-273 | `target-v81-71-273-fauna-harness-support-native.png` | `92b2d4dfd704ab774f840d56c41132072fdbeb06e204e56ba1d9cf617456ee7a` |
| target-v81-72-282 | `target-v81-72-282-mount-harness-support-native.png` | `e32266329f168b89f0318b0ddb666a9044bc90ee9d2677cbd02f580857bc5acc` |
| target-v81-72-283 | `target-v81-72-283-mount-harness-native.png` | `1dd4cf02adcfc98d04529cf00d9c290016c7bac9678d7d1432bda6db583a6d45` |
| target-v81-72-284 | `target-v81-72-284-mount-saddle-native.png` | `01569e77489c2296a019269eb863e7a3f48c16002991ad220b0a67b1719b4615` |
| target-v81-72-285 | `target-v81-72-285-saddle-rack-native.png` | `ea4496e16d3e74bd5beb121445a3b72451b3712ac717277112ab55c615ee834c` |
| target-v81-72-288 | `target-v81-72-288-adapted-mount-feeder-native.png` | `22f2344dc1fb0c67a2ef1c28fa01a4a8998bdac18a7d5c8509c16785f89dd953` |

Chaque entrée du JSON donne l’original exact, prompt et reçu, sources/cellules, mesures alpha complètes, rectangle natif entier et pivot proposé non validé. Aucun pivot, emprise ou hauteur monde n’a été qualifié en jeu.

| ID suffixe | Marges alpha > 2 : G / H / D / B | Pixels de bord alpha 1 ou 2 | Marge substantielle 96 px |
|---|---|---:|---|
| 71-273 | 25 / 165 / 32 / 110 | 13 | **non** |
| 72-282 | 336 / 78 / 337 / 81 | 10 | **non** |
| 72-283 | 118 / 154 / 52 / 193 | 53 | **non** |
| 72-284 | 246 / 210 / 178 / 194 | 26 | oui |
| 72-285 | 199 / 319 / 133 / 309 | 0 | oui |
| 72-288 | 132 / 233 / 74 / 151 | 72 | **non** |

La demande reste **96 px réellement transparents** : les seuils alpha > 0, > 2, > 8 et > 128 sont conservés dans les inspections, sans abaissement silencieux du contrat. Quatre silhouettes ont des marges substantielles inférieures à 96 px ; cinq fichiers ont des points de bord alpha 1/2. Aucun pixel de bord alpha > 2, aucun clipping visible observé. Ces écarts sont consignés sans retouche ni nouvelle génération.

Le portique est vide ; le chevalet est vide ; le harnais est une assemblage connecté sans corps ; la selle est complète sans monture ; le rack est vide ; la mangeoire est surélevée avec rations sèches. Fonction exacte, adaptation, accès, collision, rendu à l’échelle réelle et fidélité artistique restent à qualifier. Aucune activation, cycle, corps, PNJ, admission humaine ou clôture source.
