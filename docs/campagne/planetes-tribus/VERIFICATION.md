# Vérification du raccord V2–V5

Vérification documentaire et technique du **5 novembre 2026**. Base examinée :
`claude/bible-de-campagne`, commit `04a14cce268a1572092269fb281304ac10294725`,
PR [#116](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/116).
Le périmètre de publication est `docs/campagne/` : ajout de ce complément et
raccord de l'index, sans modification de l'export principal ni du jeu.

## Sources réellement récupérées

Les quatre ZIP ont été récupérés et ouverts. L'audit porte sur leurs octets,
sur leurs manifestes et sur les PNG contenus dans les archives. Les liens de
récupération et les SHA-256 complets sont dans [ASSETS.md](ASSETS.md) et
[VERIFICATION_ARCHIVES.json](VERIFICATION_ARCHIVES.json).

| Archive | Octets ZIP | PNG | Transparence effective | Opaques |
| --- | ---: | ---: | ---: | ---: |
| V2 — 119 PNG | 325 670 728 | 119 | 68 | 51 |
| V3 — 45 nouveaux PNG | 93 053 810 | 45 | 45 | 0 |
| V4 — 40 nouvelles images | 100 353 957 | 40 | 30 | 10 |
| V5 — préparation de 40 sujets | 154 075 | 0 | 0 | 0 |
| **Total livré** | — | **204** | **143** | **61** |

Résultats de la lecture des archives et du décodage des images :

- CRC des quatre ZIP valides ; aucun chemin PNG supplémentaire ou manquant par
  rapport à l'inventaire de sa livraison.
- 204 PNG décodables, 204 SHA-256 distincts, 508 496 994 octets de PNG au total.
  Les empreintes, dimensions, modes, tailles et extrema alpha présents dans les
  manifestes correspondent aux fichiers.
- 143 PNG comportent des pixels complètement transparents et des pixels visibles.
  Les 61 opaques comprennent 41 scènes et 20 illustrations de matière.
- Les manifestes récupérés séparément sont identiques à ceux des archives V2–V4
  et à leurs copies conservées dans la préparation V5.
- V5 contient 53 fichiers, dont 40 prompts individuels et aucun PNG. Les chemins
  d'image de son plan sont des destinations attendues.
- Les quinze prompts absents des originaux V1 restent nuls. Les 204 enregistrements
  de sources livrées et les 40 jobs préparés sont conservés sans réécriture de
  leurs champs d'origine.

La conservation exacte des guides est vérifiable dans
[TEXTES_SOURCE.json](TEXTES_SOURCE.json) : six documents avec leurs contenus,
tailles et SHA-256. Les 20 situations V4, cinq enchaînements V4 et cinq boucles
V5 sont repris dans [SCENARIOS_CIVILS.md](SCENARIOS_CIVILS.md), sans compter
ces propositions comme des missions jouables supplémentaires.

## Rapprochement au dépôt existant

Le contrôle joint les 204 sources à `app/game/tribeArtV37.json` et au reçu
`docs/tribe-art-import-v37.json`. Les correspondances sont exactes pour les
empreintes complètes, les noms, les dimensions et les tailles de source.
L'arbre Git contient les 204 WebP principaux et 204 vignettes référencés.
Les mesures de conversion WebP et les empreintes de pixels demeurent celles
du reçu historique : les 408 dérivés n'ont pas été décodés de nouveau ici.

Le code confirme un catalogue de consultation, cinq illustrations dans le
dossier des familles, trois panoramas régionaux et dix références de PNJ
utilisées par les dix rôles tribaux V84. Les 200 variantes de ces rôles sont
un autre lot ; elles ne sont pas ajoutées au compte des 204 sources.
Le détail des chemins, preuves et limites est dans
[RACCORD_EXISTANT.md](RACCORD_EXISTANT.md) et son JSON.

Le classeur V6 a été lu depuis son blob Git : 2 101 543 octets,
SHA-256 `87ad5d1a6eaf49f2908a4457ef3f97b8f34db481a24bbc121d2e924559b19183`.
Ses 24 `PLANxx`, les six origines, les six régions cibles et les dix régions V68
sont conservés. Les quinze directions sont rapprochées en cinq chasses,
six corps sans mission, trois directions seulement artistiques et Xeno Prime.

## Revue visuelle ponctuelle

Sept sources V2 ont été extraites sans modification puis examinées sur une
planche de contact : les deux citernes, deux versions du refuge souterrain,
la cité forestière, la Caldeira et les Forges Basses. Cette inspection sert à
détecter des écarts précis ; elle ne vaut pas revue native complète des 204
images, ni validation humaine dans le rendu du jeu.

| IDs source | Observation | Conséquence |
| --- | --- | --- |
| `original_citerne_desert_v1`, `prop_desert_origine_v2` | Bassin de distribution ouvert ; écoulement visible dans l'original V1 | **PT-ART-01 ouvert** : produire une variante avec distribution protégée pour respecter la contrainte V5 ; conserver les fichiers sources |
| `homeworld_darkjungle_v2`, `original_refuge_darkjungle_v1` | Voûte rocheuse et milieu végétal lumineux perceptibles sur la planche | Direction souterraine à maintenir ; implantation dans la Réserve non déduite de cette image |
| `homeworld_forest_v2` | Maçonnerie monumentale, ponts et aqueducs perceptibles | Préserver la cité de pierre ; aucune collision ou accessibilité prouvée |
| `homeworld_lava_v2` | Routes sur structures portantes au-dessus des coulées | Vérifier distance au danger, usage et échelle lors du raccord au niveau |
| `homeworld_slums_v2` | Quartier construit, ateliers et passerelles perceptibles | Garder les fonctions civiles ; ne pas confondre Cour et Enclave des Forges Basses |

Aucun PNG n'a été retouché, régénéré ou promu `validated` pendant ce raccord.
PT-ART-01 est une correction connue à produire ; les 24 contrôles PT-QA de
[REPRISE.md](REPRISE.md) restent ouverts pour la future intégration.

## Contrôles documentaires

Les contrôles portent sur le parsing des JSON, les comptes et identifiants,
la conservation des enregistrements source et des textes historiques, les
correspondances V37, les références R01–R07 et les liens locaux. Les chemins
vers le dépôt sont contrôlés contre l'arbre du commit examiné ; les chemins
internes aux ZIP sont explicitement présentés comme tels.

Le [rapport documentaire](VERIFICATION_DOCUMENTAIRE.json) consigne les résultats
des comparaisons et des liens ; le [manifeste de livraison](MANIFEST.json)
enregistre les empreintes des documents publiés. Le contrôle de portée du diff
est effectué avant la mise à jour de la branche : seuls l'index et les fichiers
de cette annexe sont autorisés dans ce commit.

Le contrôle de sources NECA distingue quatre pages lues, deux descriptions
officielles indexées et une fiche au titre seul confirmé. Les limites d'accès,
de continuité et d'attribution sont conservées dans [SOURCES_LORE.md](SOURCES_LORE.md).
Il ne constitue pas une relecture exhaustive des œuvres de la franchise.

L'index central est enrichi sans retirer les compléments compagnons, Warp,
mobilité ou Xeno Prime. La bible exportée est conservée à l'identique. Les
nouveaux documents ne changent pas les 68 fiches, les huit chasses, les jalons
L-01 à L-10, les règles ALL-01 à ALL-10 ou le raccord XP-Z11 → XP-Z12.

## Limites de cette livraison

Conformément au [guide du projet](../../GAMEDEV_AGENT_GUIDE.md), les contrôles
d'un changement documentaire sont proportionnés à ce périmètre. Aucun build,
test de gameplay, parcours navigateur, mesure de performance ou nouvelle revue
artistique humaine n'est revendiqué. La lecture d'un usage dans le code est
distincte d'un parcours exécuté et observé.

Les nouveaux services, les contrats civils, le raccord précis des lieux, les
verrous de régions cibles, les états animés et les 40 images V5 restent à
réaliser selon leur statut. L'intégration à la bible documente ces dépendances
et réutilise les ressources déjà présentes ; elle ne les fait pas passer
silencieusement à « jouable » ou « conforme au canon ».
