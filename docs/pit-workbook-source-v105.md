# Feral et Scar : périmètre source V105

Le plan des deux personnages dépasse les 52 lignes de moves et présentations. L’inventaire conserve séparément les **36 moves, 16 présentations, 16 étapes de campagne et 14 contraintes de variantes** extraits du classeur V54. Ces nombres décrivent des exigences de nature différente : ils ne s’additionnent pas en un nombre de dessins ou de clips livrés.

## Sources et lecture des états

- Source publique conservée : `docs/v56-excel-priorities.json`, SHA-256 `fc8e1c6c81de62d8966e04746ed0751b0eeefc62f0458728c818896ad79972f4`.
- Classeur original déclaré : `THE_PIT_BIBLE_COMBATTANTS_STAGES_V54.xlsx`, SHA-256 `32f2ee8e4fd801e7ca677a54862f2bd0123a2e78d12c015f64b50ab28184c380`. Le fichier privé n’est pas disponible ; aucune récupération de ses lignes absentes n’est annoncée.
- Plan d’actions : `app/game/data/pitWorkbookAnimationPlanV100.json`. Les cellules et textes restent inchangés, y compris leurs mentions historiques « non implémentée ».
- Admissions natives : `app/game/data/pitWorkbookAnimationsV100.json`. Les 52 admissions concernent le BODY `runtime-default` et les deux orientations dessinées. Elles ne certifient ni toutes les variantes, ni les entités, ni la campagne, ni toutes les règles de combat.
- Inventaire global : `app/game/data/pitWorkbookScopeV105.json`. `baselineV104` décrit expressément le départ de V105. Le suivi de livraison V105 doit mesurer le moteur et le rendu, indépendamment de cette photographie.
- Adaptateur source : `app/game/systems/pitWorkbookMovesV105.ts`, sans import du moteur ou du registre. Il expose les 36 cibles de moves et les 16 briefs de présentation avec leurs références exactes.

Reproduction de l’inventaire : `node scripts/build-pit-workbook-scope-v105.mjs`. Le mode `--check` vérifie une reproduction exacte et le SHA de l’extraction avant toute comparaison. Les valeurs de combat sont des cibles à 60 Hz ; les coûts sont exprimés en **pourcentage de jauge**, sans conversion implicite vers les unités historiques du moteur.

## Moves et présentations

| Périmètre par personnage | Feral | Scar | Ce que la source prouve |
| --- | --- | --- | --- |
| 18 moves | `05_MOVES_PROPOSES!D10:U10` | `05_MOVES_PROPOSES!D7:U7` | Commandes, timings, dégâts, coût %, BODY et entités requises |
| 8 présentations | `07_PRESENTATIONS!C10:J10` | `07_PRESENTATIONS!C7:J7` | Geste, contexte de déclenchement et limites de récit |
| 8 étapes de campagne | `08_CAMPAGNES!D10:K10` | `08_CAMPAGNES!D7:K7` | Ordre, adversaire, scène, objectif et kit cité |
| 7 contraintes de variantes | `14_VARIANTES!C10:I10` | `14_VARIANTES!C7:I7` | Exigences de tenue, masque, visage, inventaire, dégâts, orientations et camouflage |

Les 18 moves sont `5L/5M/5H`, `2L/2M/2H`, `jL/jM/jH`, `TH_F`, `TH_B`, `6M`, `S1/S2/S3/S4`, `SUPER`, `EQUIP`. V104 raccordait les neuf normales de chaque BODY au contrat source. Le S1 de Feral avait déjà un lanceur et des carreaux jouables sous un contrat historique ; ce fait ne prouve pas l’intégration de tous les timings, coûts et conditions du S1 proposé.

`EQUIP` a une phase active de **zéro** et ne cause aucun dégât. La source impose que les armes perdues ne réapparaissent pas et que les attaques restent interdites pendant la transition. Un changement de pose seul ne ferme pas cette exigence d’inventaire.

Les spéciaux ne sont pas tous de simples coups au contact. Les carreaux, le bouclier et la mine de Feral ainsi que le shuriken et le plasma de Scar requièrent leurs entités et leurs règles propres. La source des spéciaux porte la hauteur « Selon trajectoire / prototype » : l’adaptateur la conserve, sans lui substituer arbitrairement une garde « milieu ». Les supers demandent une confirmation et un contexte de scène ; monter leur clip n’implémente pas cette mécanique.

Les feuilles natives de `TH_F`, `TH_B`, `FATALITE_1`, `FATALITE_2` et `CLEMENCE` comprennent un partenaire d’étude. Ces images ne représentent pas à elles seules deux acteurs autonomes. Elles ne peuvent pas remplacer automatiquement une victime arbitraire en duel ni être découpées sans une nouvelle admission. Les entrées, victoires, défaites et taunts n’ont pas ce même blocage de partenaire ; leur raccord exige toujours le bon déclenchement et la continuité des états.

## Campagnes : dix références visuelles supplémentaires, six réemplois possibles

Chaque campagne cite trois kits déjà présents dans le plan de moves : `ACT_S1` à l’étape 2, `ACT_S3` à l’étape 3 et `ACT_SUPER` à l’étape 7. Réutiliser un BODY ne livre ni la rencontre, ni le PNJ, ni la progression ou l’objectif associé.

Les dix références ci-dessous n’ont pas d’admission V100 de campagne sous ces identifiants. Cette constatation ne signifie pas qu’aucun dessin de garde ou geste approchant existe dans le dépôt. **L’extraction ne chiffre ni leur nombre de dessins, ni leurs durées** : `sourceFrameCount` reste `null`.

| Référence Feral / Scar | Cellules | Besoin visuel exact et contexte restant |
| --- | --- | --- |
| `F006_STORY_01` / `F003_STORY_01` | D10 / D7 | Feral observe les traces d’une proie qui apprend ses habitudes. Scar découvre l’indice du temple alors que l’initiation est interrompue et que l’équipement doit être récupéré. Objets et passage doivent rester séparés du BODY. |
| `F006_STORY_04` / `F003_STORY_04` | G10 / G7 | Indice visuel séparé désignant Naru ou Grid, à adapter après référence de scène ; le chasseur vérifie son équipement. Ce rapprochement est une proposition narrative, pas un événement canonique certifié. |
| `F006_STORY_05` / `F003_STORY_05` | H10 / H7 | Feral déploie le bouclier, fixe un point au masque puis sépare la lance. Scar inspecte la gravure et sort de l’ombre ; sa marque dépend de la version déjà initiée. Chacun requiert un contrechamp de garde propre au rival, avec deux corps et portraits indépendants. |
| `F006_GUARD_H` / `F003_GUARD_H` | I10 / I7 | Kit de garde cité, puis trois contres, esquives ou désarmements, signal en fond et ouverture du passage en cinématique. Le décor ne change jamais les hitboxes du duel classé. Aucun dessin ou nombre de frames ne peut être déduit du seul identifiant. |
| `F006_STORY_08` / `F003_STORY_08` | K10 / K7 | Feral reprend le masque hors de la boue, puis un autre plan rappelle la ligne de tir. Scar et Lex rouvrent une sortie ensemble ; un épilogue distinct rappelle l’issue connue. Les deux fins sont annoncées comme alternatives. |

## Variantes et autres mouvements

Les quatorze contraintes conservent textuellement l’état « disponibilité de cette variante précise non mesurée ». Les deux directions natives admises pour le BODY ne valident pas automatiquement toutes les tenues démasquées, endommagées ou désarmées. Les emplacements et mains vides doivent correspondre à l’inventaire ; les pièces cassées doivent rester cassées dans les scènes ; le camouflage reste un effet d’équipement et ne modifie pas l’anatomie.

Les lignes détaillées de `12_SPRITES`, `06_ARMES` et `11_ENTITES_COMBAT` ne sont pas intégralement présentes dans l’extraction. Les cycles de locomotion, de garde, de réaction et de transition déjà enregistrés doivent être rapprochés avec leurs lignes source avant toute clôture exhaustive. L’inventaire ne transforme pas ces informations manquantes en nouveaux clips inventés. Le budget global de 201943 dessins du classeur ne mesure pas les PNG manquants de Feral et Scar.

## Vérification

`tests/pit-workbook-source-v105.test.mjs` compare directement l’extraction épinglée aux 36 moves, 16 présentations, 16 étapes et 14 contraintes. Les cibles chiffrées sont vérifiées indépendamment de l’adaptateur ; les entités requises, le coût en %, l’absence de phase active pour EQUIP et le contexte des présentations sont conservés. Ces tests vérifient le contrat source et ne déclarent pas les mécaniques livrées.
