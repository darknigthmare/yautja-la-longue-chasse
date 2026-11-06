# Warp Universe — lot 06 : 13 PNG originaux pour revue

Complément de [Warp Universe](../../WARP_UNIVERSE.md) et du [suivi de reprise](../../WARP_UNIVERSE_REPRISE.md), dans la PR #116.

Ces fichiers proviennent des deux dernières générations de la conversation. Ils sont conservés **sans retouche, recadrage, normalisation alpha ou réduction**. Les noms de personnages sont les **cibles demandées dans les prompts**, pas une identification visuelle ni une validation de ressemblance.

**Statut : candidats générés, à reprendre/valider artistiquement. `validated=false`. Aucun raccord runtime.** Le module et les personnages originaux du projet ne sont pas des reproductions canoniques certifiées.

## Inventaire des originaux

12 PNG RGBA comportent des pixels transparents ; le fond 199 est RGB opaque. Onze détourages ont un alpha maximal de 254 : l'original est préservé. Il ne faut pas déduire la qualité des contours ou la fidélité 1:1 de la seule présence du canal alpha.

| ID | Cible du brief | Fichier | Dimensions |
| --- | --- | --- | --- |
| 165 | Hanzo | [PNG](cinema/165_predators_hanzo.png) | 1024 × 1536 |
| 166 | Nikolai | [PNG](cinema/166_predators_nikolai.png) | 1024 × 1536 |
| 167 | Mombasa | [PNG](cinema/167_predators_mombasa.png) | 1024 × 1536 |
| 168 | Stans | [PNG](cinema/168_predators_stans.png) | 1024 × 1536 |
| 169 | Noland | [PNG](cinema/169_predators_noland.png) | 1024 × 1536 |
| 170 | Edwin | [PNG](cinema/170_predators_edwin.png) | 1024 × 1536 |
| 171 | Berserker | [PNG](cinema/171_predators_berserker.png) | 1024 × 1536 |
| 172 | Falconer | [PNG](cinema/172_predators_falconer.png) | 1024 × 1536 |
| 173 | Tracker | [PNG](cinema/173_predators_tracker.png) | 1024 × 1536 |
| 174 | Classic | [PNG](cinema/174_predators_classic.png) | 1024 × 1536 |
| 199 | Baie Warp | [PNG](module/199_module_baie_warp_fond.png) | 1672 × 941 |
| 201 | Archiviste Yautja | [PNG](module/201_module_archiviste_yautja.png) | 1024 × 1536 |
| 203 | Mémoire d'avatar | [PNG](module/203_module_memoire_avatar.png) | 1086 × 1448 |

## Fidélité et travail restant

Les dix candidats destinés à *Predators* n'ont pas reçu de dossier de référence primaire scène/costume/équipement lors de la génération. Ils ne sont pas approuvés en fidélité 1:1. Comparer notamment le visage et les vêtements des six humains, ainsi que les biomasks, silhouettes et armes des quatre Yautja, avant tout usage final. Ne pas écraser un asset déjà validé avec ces propositions.

Le fond 199 comporte déjà des pylônes, une plateforme et des consoles : **la demande de baie modulaire vide n'est pas validée**. Ces éléments peuvent faire doublon avec les props indépendants. Les objets 201 et 203 sont des créations originales du projet.

Sur les 40 demandes de reprise, **13 disposent maintenant de candidats** ; **27 n'ont toujours pas d'image dans ce nouveau lot**. La validation des 40 exigences reste ouverte. Les 170 illustrations historiques restent un inventaire distinct : ce lot ne les réimporte pas.

IDs sans candidat : 097, 098, 178, 179, 180, 184, 185, 186, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198, 200, 202, 204, 205, 206, 207, 208, 209, 210.

## Vérifications et provenance

[IMPORT_SOURCES.json](IMPORT_SOURCES.json) fixe les dimensions, octets, SHA-256 et Git SHA-1 des treize originaux. Les URL de transfert servent uniquement à leur transport depuis les pièces jointes générées ; aucun nouveau rendu n'est demandé au service de transfert. Le contrôle de l'empreinte garantit que le fichier versionné est celui de la conversation.

La réussite de l'import Git est attestée séparément par `IMPORT_RECU.json` lorsqu'il est présent ; la présence de cette documentation seule ne prouve pas celle des binaires. L'import ne concerne que ce dossier, sans remplacement des autres annexes, sans écriture sous `public/`, sans fusion ni déploiement.

Galerie : ouvrir `GALERIE.html` depuis une copie locale de ce dossier. Les images demeurent des poses fixes, pas des cycles animés.
