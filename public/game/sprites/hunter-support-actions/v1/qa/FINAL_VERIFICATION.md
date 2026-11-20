# Vérification indépendante de la livraison finale

## Fichiers et pixels

Le contrôle indépendant lit les PNG source du pack, reconstruit les cellules natives avec leurs limites réelles et les compare aux exports et aux atlas d’import. Il ne réutilise pas les helpers du pipeline de production.

- Les **19 SHA-256 de sources** correspondent à la sélection contrôlée.
- Les **304 PNG individuels** sont égaux, pixel RGBA par pixel RGBA, à leur cellule source avec le seul padding transparent prévu.
- Les **304 cellules d’import** sont exactement ces mêmes images avec deux pixels de garde transparente sur chaque côté.
- **29 973 184 pixels RGBA** des cellules source et de leur padding ont été comparés. Aucun pixel source n’a changé.
- Les **304 empreintes RGBA** restent distinctes, de même que les **304 empreintes visibles normalisées** en ignorant les pixels d’alpha <16.
- Les **304 pivots d’import et de manifestes natifs** ajoutent exactement deux pixels aux pivots des cellules exportées.
- Les manifestes portent le statut `draft`, seize actions et aucun binding au roster ou au rendu actif.

Preuve : [`FINAL_EXPORT_VERIFICATION.json`](FINAL_EXPORT_VERIFICATION.json). Le script [`check_final_exports_independent.py`](check_final_exports_independent.py) s’exécute depuis ce dossier avec le chemin du pack en argument et un chemin `--output` de rapport distinct.

## Recalage au sol

Les **224 pivots Y** des quatorze pages au sol reproduisent indépendamment la dernière rangée alpha ≥128 contenant au moins huit pixels. La convention centre de rangée +0,5 est respectée ; la projection de chaque proxy atteint Y=302,5. Toutes les translations Y sont entières. Le pivot X reste celui de mise en page et l’offset X reste nul.

La différence entre les positions relatives de tous les pixels opaques avant et après translation est exactement nulle. Le recalage conserve donc le mouvement du corps par rapport à son propre appui graphique ; il ne supprime aucun déplacement interne des dessins. Les quatre pages de canopée et l’impulsion aérienne sont exclues de cette règle.

## Recalage des prises

Les **64 pivots** des quatre pages de canopée correspondent au candidat SHA verrouillé. La mesure est recalculée avec un étiquetage indépendant des composantes opaques. Les pages de maintien et de balancement suivent leur milieu de prises par image ; l’accrochage et le lâcher utilisent les constantes de raccord retenues.

Le milieu calculé atteint exactement la cible mathématique `[157,50]`. L’arrondi du rendu hors ligne laisse une dispersion inférieure à un pixel par axe : 0,760×0,434 px pour le maintien et 0,902×0,870 px pour le balancement. Les étendues horizontales des pieds par rapport aux prises restent exactement **17,7129064207 px** et **181,979395219 px** ; erreur de conservation =0.

Preuve : [`FINAL_GRIP_VERIFICATION.json`](FINAL_GRIP_VERIFICATION.json), produite par [`check_grip_independent.py`](check_grip_independent.py). Le candidat de mesure conserve son statut historique ; les reçus d’application sont distincts. Aucune certification anatomique ou IK n’est déduite de ces résultats.

## Aperçus effectivement encodés

La revue visuelle porte sur des images décodées des MP4 finaux, pas sur une nouvelle composition des PNG sources. Les fichiers et empreintes sont identifiés dans [`ENCODED_PREVIEW_QA.json`](ENCODED_PREVIEW_QA.json).

| Vidéo | Dimensions | Cadence de revue | Images vidéo | Durée |
| --- | --- | --- | ---: | ---: |
| Aperçu principal | 1260×562 | 16 images/s | 224 | 14 s |
| Raccords | 840×584 | 16 images/s | 104 | 6,5 s |

Les indices vidéo sont comptés depuis zéro. Les images principales 159/160 montrent A16→B01 du soin et de Second Wind ; 199/200 montrent le raccord de mort ; 215/223 montrent la dernière pose puis son maintien. Dans Raccords, 15/16, 47/48 et 79/80 exposent les passages de visée et de canopée.

Sur ces douze images inspectées, les titres sont lisibles, les silhouettes restent entièrement cadrées et les appuis au sol sont cohérents. Le milieu des prises reste à une hauteur commune. La fin de mort reste couchée et maintenue. Les différences de volume, d’inclinaison et de phase mentionnées dans [les limites artistiques](ART_REVIEW_LIMITATIONS.md) restent visibles ; la vidéo ne les masque pas par une interpolation ou un fondu.

Le pied de page des raccords décrit les « pivots du manifeste » : l’aperçu utilise une seule fois les métadonnées déjà recalées, sans compensation supplémentaire. Une revue de captures ponctuelles et les mesures de fichier ne constituent pas un test du jeu, une validation de toutes les poses humaines ou une preuve de boucle parfaitement fluide.
