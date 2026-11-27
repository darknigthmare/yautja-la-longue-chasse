# Repli terrestre V112 — moteur natif

Le moteur termine les huit missions avec les trois armures, sans récolte optionnelle : **24/24 extractions**. Une seconde matrice en mode collecte termine aussi **24/24** ; quinze cas portent réellement une pièce. Douze replays supplémentaires depuis une sauvegarde de campagne réellement gagnée donnent dix succès et deux échecs, tous conservés. Au total, **18/24 couples mission/armure** disposent d’une extraction avec une charge non vide. La charge maximale réussie observée représente **38,89 %** du budget ; aucune mission ne finit à charge pleine.

Les 60 parcours ont été rejoués à partir de leurs entrées enregistrées. Le snapshot terminal observé `brief()` et l’outcome sont identiques. Aucun frame de grimpe, balancement ou contact avec un repos authored `v112-canopy-*` n’est observé. Les durées ci-dessous sont du temps de simulation à 1/60 s, comme la boucle réelle `HuntCanvas`, et ne mesurent pas les performances de rendu.

## Matrice sans récolte optionnelle

| Mission | Scout (s) | Hunter (s) | Berserker (s) |
| --- | ---: | ---: | ---: |
| jungle-vey | 56.43 | 66.57 | 69.33 |
| ice-cryostalker | 54.10 | 52.88 | 55.42 |
| volcano-bad-blood | 82.23 | 89.82 | 111.68 |
| swamp-hydra | 71.58 | 64.88 | 88.87 |
| desert-sandmaw | 54.37 | 67.18 | 65.97 |
| ocean-leviathan | 116.73 | 123.62 | 135.73 |
| fungal-hivemind | 87.88 | 78.90 | 69.35 |
| ruins-ancient-guardian | 59.37 | 58.97 | 60.42 |

## Meilleure charge réellement extraite par couple

Chaque case indique masse / volume et ratio de charge. `0` signifie qu’aucune pièce n’a été obtenue dans un parcours réussi de ce couple, malgré les tentatives de collecte. La charge est acquise pendant le parcours ; le spawn initial reste vide.

| Mission | Scout | Hunter | Berserker |
| --- | --- | --- | --- |
| jungle-vey | [0.4 kg / 1 u · 5.56 %](qualified-harvested/jungle-vey-scout.json) | [0.4 kg / 1 u · 4.17 %](qualified-harvested/jungle-vey-hunter.json) | [0.4 kg / 1 u · 3.33 %](qualified-harvested/jungle-vey-berserker.json) |
| ice-cryostalker | [1.2 kg / 2 u · 11.11 %](qualified-harvested/ice-cryostalker-scout.json) | [1.2 kg / 2 u · 8.33 %](qualified-harvested/ice-cryostalker-hunter.json) | [1.2 kg / 2 u · 6.67 %](qualified-harvested/ice-cryostalker-berserker.json) |
| volcano-bad-blood | [4.0 kg / 6 u · 33.33 %](qualified-harvested/volcano-bad-blood-scout.json) | [4.0 kg / 6 u · 25.00 %](qualified-harvested/volcano-bad-blood-hunter.json) | [4.0 kg / 6 u · 20.00 %](qualified-harvested/volcano-bad-blood-berserker.json) |
| swamp-hydra | [0](qualified-harvested/swamp-hydra-scout.json) | [7.8 kg / 9 u · 37.50 %](qualified-harvested-replays/swamp-hydra-hunter.json) | [1.5 kg / 3 u · 10.00 %](qualified-harvested/swamp-hydra-berserker.json) |
| desert-sandmaw | [4.2 kg / 7 u · 38.89 %](qualified-harvested/desert-sandmaw-scout.json) | [1.2 kg / 2 u · 8.33 %](qualified-harvested/desert-sandmaw-hunter.json) | [4.2 kg / 7 u · 23.33 %](qualified-harvested/desert-sandmaw-berserker.json) |
| ocean-leviathan | [1.2 kg / 2 u · 11.11 %](qualified-harvested-replays/ocean-leviathan-scout.json) | [1.2 kg / 2 u · 8.33 %](qualified-harvested-replays/ocean-leviathan-hunter.json) | [1.2 kg / 2 u · 6.67 %](qualified-harvested-replays/ocean-leviathan-berserker.json) |
| fungal-hivemind | [0](qualified-harvested/fungal-hivemind-scout.json) | [0](qualified-harvested/fungal-hivemind-hunter.json) | [0](qualified-harvested/fungal-hivemind-berserker.json) |
| ruins-ancient-guardian | [1.2 kg / 2 u · 11.11 %](qualified-harvested-replays/ruins-ancient-guardian-scout.json) | [0](qualified-harvested/ruins-ancient-guardian-hunter.json) | [0](qualified-harvested/ruins-ancient-guardian-berserker.json) |

## Contrat de preuve

Le runner [`qa-hunt-ground-campaign-v112.mjs`](../../../scripts/qa-hunt-ground-campaign-v112.mjs) bundle la source de production entière et ajoute des exports privés ainsi qu’une copie verbatim, extraite par AST, du callback UI `riteMenuActionRef.current`. Ses seuls sinks supplémentaires neutralisent le rendu React et l’émission de persistance de ce callback. La politique de Volcano et de l’Océan provient de la politique partagée de campagnes, copiée dans [`qa-hunt-ground-policy-v112.mjs`](../../../scripts/lib/qa-hunt-ground-policy-v112.mjs). Aucun fichier de production n’est modifié.

Après `makeGameState`, le déplacement et le combat passent par `InputHub` et `stepGame`, avec ennemis, dangers et objectifs natifs. Les originaux restent dans la simulation. Les assertions exigent toutes les étapes de mission, une vraie défaite de l’Apex, un trophée canonique, une arrivée à `finished` par le transport et des PV positifs. Le script ne remplit pas les objectifs, ne déplace pas les acteurs, ne retire pas les ennemis, ne force pas de soin, d’invulnérabilité ou de résultat. Le Medicomp utilise ses charges normales. Le contrôleur lit les états internes et produit des entrées automatisées ; il ne qualifie pas l’apprentissage d’un joueur.

Les trois armures sont admises explicitement comme replays physiques. Scout porte Wristblades/Plasma et les deux équipements par défaut (5/6 de capacité) ; Hunter et Berserker portent Combistick/Plasma avec les mêmes équipements (7/8 et 7/10). Les améliorations restent à zéro. La seed d’écologie est le compteur numérique réel de tentative : 0 à vide, puis 1 pour Jungle/Glace de la première collecte et 0 pour ses autres missions ; les replays de la sauvegarde complète utilisent 1 partout. Un xorshift32 de seed `0x1122026` fournit les tirages légaux de `Math.random` pour une reproduction déterministe.

Le Flaying Tool est acheté par `purchaseFieldToolV111` pour 120 marques : la première collecte réconcilie les deux résultats natifs authentiques conservés dans [tool-origin.json](tool-origin.json). Les replays suivants partent du vrai [campaign-origin-save.json](campaign-origin-save.json), avec [provenance](campaign-origin-provenance.json) et [archive brute R2](campaign-origin-raw.tar.gz). Cette sauvegarde R2 est antérieure à la campagne canonique portable R3, documentée séparément dans [native-report.json](../v112-campaign-canonical/native-report.json). Aucun résultat R2 n’a été remplacé par un résultat R3. Toutes les pièces proviennent de corps originaux tués pendant le run, des actions de menu natives et de l’horloge de préparation réelle. Leur identifiant source, anatomie, qualité, masse et volume figurent dans les rapports.

## Exécution et fichiers

Les deux passes de 24 se trouvent dans [qualified-unladen/report.json](qualified-unladen/report.json) et [qualified-harvested/report.json](qualified-harvested/report.json). Les douze replays supplémentaires sont dans [qualified-harvested-replays/report.json](qualified-harvested-replays/report.json). Chaque fichier de mission conserve admission, transitions, résultat natif et origines des prélèvements. Les 60 versions complètes, avec positions observées et entrées clairsemées à rejouer, sont préservées sans perte dans [native-runs-raw.tar.gz](native-runs-raw.tar.gz) ; `rawData` indique le membre et son SHA-256. Leur identité avec les fichiers avant compression a été vérifiée octet par octet. Les empreintes de la source, du bundle, du runner et de la politique sont enregistrées. Les snapshots des runners de ces passes sont conservés : [R2](controller-qualified-r2.mjs.txt), [R3](controller-qualified-r3.mjs.txt). Les [résultats de développement](development-outcomes.json) restent séparés de la preuve finale.

Commandes exécutées avec Node 24.19.0, toutes terminées avec code 0 :

```sh
node scripts/qa-hunt-ground-campaign-v112.mjs --seconds=240 --replay=true --requireComplete=true --output=docs/qa/v112-ground-campaign/qualified-unladen
node scripts/qa-hunt-ground-campaign-v112.mjs --harvest=true --seconds=300 --replay=true --output=docs/qa/v112-ground-campaign/qualified-harvested
node scripts/qa-hunt-ground-campaign-v112.mjs --mission=swamp-hydra,ocean-leviathan,fungal-hivemind,ruins-ancient-guardian --baseSave=docs/qa/v112-ground-campaign/campaign-origin-save.json --harvest=true --seconds=300 --replay=true --output=docs/qa/v112-ground-campaign/qualified-harvested-replays
node_modules/.bin/eslint scripts/qa-hunt-ground-campaign-v112.mjs scripts/lib/qa-hunt-ground-policy-v112.mjs
```

Le code 0 de la troisième commande signifie que les assertions de fidélité et de replay ont passé ; cette commande ne demande pas `--requireComplete=true` et conserve explicitement ses deux morts. Le runner est opt-in et n’ajoute pas ces parcours au glob des tests CI.

## Limites de qualification

Le critère moteur natif de CHA112-02 — route principale sans récolte optionnelle — est couvert pour les huit missions et les trois armures. Les charges pleines, tous les tirages et toutes les difficultés ne sont pas couverts. ROU112-05, CHA112-05 et REM112-08 restent donc partiels sur leur quantification des charges. Les deux morts en replays palustres chargés ne démontrent pas un blocage physique du jeu ; elles démontrent l’échec de ces entrées et restent publiées. Cette preuve ne qualifie ni le navigateur, ni un appareil réel, ni la progression d’une chaîne montée dans GameClient. Aucun statut Excel/JSON historique n’est réécrit par ce dossier.

## Relance des routes moteur du 21 novembre 2026

La recette recherche le point de prise réel du trophée. Après une interruption du rite par dégâts, elle permet une courte riposte contre un garde accessible. Elle réserve chaque pièce anatomique et ne dépece que lorsque cette pièce le demande.

Les **24 essais terrestres** terminent l’extraction, dont **20 avec des prises**. Le meilleur remplissage conservé atteint **50 %**. Les trois variantes Océan terminent. Aucun essai n’atteint le seuil de pleine charge de `REM112-08`. [Matrice et traces moteur](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/44896017906/artifacts/14704375813)

Le scénario de canopée commence au pied d’un arbre avec six peaux récoltées par les opérations natives, soit 18 unités sur 18 avec l’armure Scout. Les six pièces restent dans le sac après la grimpe, le transfert de branche et les deux lianes. Ce scénario s’arrête à la seconde liane. [Recette de canopée](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/44896017906/job/136821720281)

## Extractions à plein volume sur routes terrestres

Trois recettes strictes atteignent les 18 unités du sac Scout. Le sac est vide à l’insertion. Les mêmes identifiants de prises restent présents depuis le seuil de charge jusqu’à l’embarquement et au résultat. Chaque prise possède un reçu de prélèvement. Le rejeu des entrées reproduit le résultat, l’état terminal ainsi que la charge et l’instant d’embarquement. Aucun parcours ne grimpe, ne se balance ou ne touche une plateforme de repos de canopée.

| Parcours Scout en vaisseau visible | Tentative | Prises | Masse et volume conservés | Extraction | Preuve |
| --- | ---: | ---: | --- | ---: | --- |
| Jungle, pilote terrestre | 6 | 9 | 13,8 kg · 18/18 u | 118,45 s | [Trace et sauvegardes](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/44901828529/artifacts/14705404441) |
| Jungle, poursuite précoce des proies | 6 | 9 | 13,8 kg · 18/18 u | 134,35 s | [Trace et sauvegardes](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/44901828529/artifacts/14705429325) |
| Volcan, distance de 200 px et tendon laissé sur le corps | 3 | 8 | 14 kg · 18/18 u | 155,25 s | [Trace et sauvegardes](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/44902069827/artifacts/14706203062) |

À partir de `campaign-origin-save.json`, cinq victoires terrestres Hunter amènent la Jungle à la tentative 6 et deux victoires Hunter amènent le Volcan à la tentative 3. Chaque résultat émis par le moteur passe par `applyMissionResult`. Le numéro de tentative de la partie Scout provient de la sauvegarde gagnée. La recette ne remplace ni la géométrie, ni les ennemis, ni les objectifs. L’insertion en vaisseau ajoute ses propres patrouilles par la règle du jeu.

`--harvestSweep=true` permet de chercher les proies encore en vie avant l’Apex et de composer le sac avec les parties connues. Au Volcan, la capacité devient accessible lorsqu’un tendon d’une unité reste sur sa proie et laisse assez de place pour la peau de bélier de trois unités. La recette ne dépose aucune prise après le seuil. L’option `--leaveSpecimens=harvest-tissue:volcano-hounds-2` désigne ce tendon.

Pour reproduire la première ligne, exécuter cette chaîne depuis le dépôt. Pour le Volcan, utiliser `mission=volcano-bad-blood`, `wins=2` et ajouter `--sweepDistance=200 --leaveSpecimens=harvest-tissue:volcano-hounds-2` à la seconde commande.

```bash
mission=jungle-vey
wins=5
origin=docs/qa/v112-ground-campaign/campaign-origin-save.json
for ((attempt=1; attempt<=wins; attempt++)); do
  out="outputs/qa-full-native/$mission/earned-$attempt"
  node scripts/qa-hunt-ground-campaign-v112.mjs --mission="$mission" --armor=hunter --baseSave="$origin" --replay=true --seconds=240 --output="$out" --successSave="$out/after-win.json" || exit 1
  origin="$out/after-win.json"
done
node scripts/qa-hunt-ground-campaign-v112.mjs --mission="$mission" --armor=scout --baseSave="$origin" --insertion=visible-ship --harvest=true --harvestSweep=true --minimumRetainedLoad=1 --replay=true --seconds=360 --output="outputs/qa-full-native/$mission/full"
```

La [variante Jungle avec le pilote partagé](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/44901828529/artifacts/14706326962) extrait 17 unités. Le [Marais Scout en vaisseau visible](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/44901304750/job/136837587201) extrait 16 unités et les relevés des variantes mesurent 16 unités engendrées avant l’Apex dans la configuration de tentative 1 essayée. La [Glace Scout visible, tentative 2](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/44900938592/job/136836488058) extrait 7 unités. Les autres configurations terrestres à pleine charge restent ouvertes. `REM112-08` reste ouvert à l’échelle demandée des huit missions et des armures.

## Passage chargé continu de la Jungle à l’extraction

La même campagne Jungle Scout à la tentative 6 donne également une traversée continue de la canopée vers la navette. Le chasseur emporte les neuf prises réelles à 18/18, monte l’arbre de la séquence 0, touche deux branches, se balance sur la première liane, relâche et rattrape la deuxième. Il revient ensuite au sol, termine ses objectifs, vainc l’Apex, collecte son trophée et embarque avec les mêmes neuf prises. Le résultat est réussi en **143,68 s**, avec **102,18 PV**, **263 images de grimpe** et **118 images de balancement**. Le rejeu vérifie les mêmes entrées et la charge réellement embarquée. [Résultat, sauvegardes gagnées et trace](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/44902826842/artifacts/14706502930)

Après les cinq victoires Hunter de la commande précédente, ajouter `--fullCanopy=true --canopySequence=0` à la commande Scout. Le pilote reprend les plateformes et supports de la géométrie finale. Les ennemis, collisions, dégâts et objectifs restent actifs. Dans cette admission, les indices 1 et 2 ne désignent aucun parcours engendré. Les deux essais correspondants publient `route-missing` et une extraction terrestre à 18/18, sans qualifier de traversée. [Indice 1](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/44902826842/artifacts/14706507937) · [Indice 2](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/44902826842/artifacts/14705774844)

## Repli chargé sur la source du 21 novembre 2026

Le moteur de `0c6708999e393b7e7af8f6c8c8753ab7ec5d9437` a effectué **79 extractions sur 80 essais** sur dix couples mission–armure. Les 80 traces reproduisent exactement l’état terminal. La sauvegarde de départ est celle de la campagne gagnée, et chaque nouvelle tentative provient d’un résultat de mission réel appliqué à cette sauvegarde. L’insertion en vaisseau visible laisse les patrouilles, ennemis et objectifs actifs. Toutes les prises viennent des corps de l’essai. Le meilleur sac est mesuré à l’embarquement et à la sortie. [Run de la matrice](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/44916265800)

| Mission | Armure | Extractions | Tentative du meilleur sac | Volume conservé | Preuve |
| --- | --- | ---: | ---: | ---: | --- |
| Désert | Scout | 8/8 | 2 | 15/18 | [Rapport et trace](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/44916265800/artifacts/14712027393) |
| Fongique | Scout | 8/8 | 1 | 1/18 | [Rapport et trace](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/44916265800/artifacts/14711288476) |
| Glace | Scout | 8/8 | 6 | 16/18 | [Rapport et trace](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/44916265800/artifacts/14712380655) |
| Jungle | Berserker | 8/8 | 6 | 17/30 | [Rapport et trace](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/44916265800/artifacts/14711203812) |
| Jungle | Hunter | 8/8 | 3 | 14/24 | [Rapport et trace](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/44916265800/artifacts/14711957720) |
| Océan | Scout | 7/8 | 2 | 11/18 | [Rapport et trace](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/44916265800/artifacts/14712216905) |
| Ruines | Scout | 8/8 | 5 | 6/18 | [Rapport et trace](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/44916265800/artifacts/14711812830) |
| Marais | Scout | 8/8 | 8 | 14/18 | [Rapport et trace](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/44916265800/artifacts/14711997513) |
| Volcan | Berserker | 8/8 | 3 | 19/30 | [Rapport et trace](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/44916265800/artifacts/14711313369) |
| Volcan | Hunter | 8/8 | 3 | 19/24 | [Rapport et trace](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/44916265800/artifacts/14711368254) |

Aucun des 80 essais n’atteint le seuil plein demandé au pilote. Les résultats à 18/18 déjà obtenus dans la Jungle et le Volcan restent documentés plus haut. `REM112-08` reste partiel pour la couverture des huit missions et des différentes armures. Les essais moteur reproduisent une charge déclarée et les interactions réelles du modèle. Les preuves de navigateur relèvent de `REM112-06`.

Le dépôt de terrain utilise désormais l’appui sous les pieds même si le centre du chasseur est au-delà du bord. Une prise posée sur une branche reste accessible sur cette branche. Le jeu refuse le dépôt si l’appui manque. Les 54 tests de dépôt, de cycle dans le moteur et de repli passent. [Contrôle de régression](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/44916625804/job/136883527714)

## Variante de collecte et disponibilité des prises

La recherche a rejoué quatre admissions documentées avec 14 variantes de distance et de déclenchement de collecte par admission. **53 extractions sur 56** et **56 états terminaux reproduits**. Les valeurs ci-dessous sont celles effectivement gardées à la sortie. [Run des variantes](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/44916768090)

| Configuration | Tentative | Extractions | Meilleur sac conservé | Preuve |
| --- | ---: | ---: | ---: | --- |
| Volcan Hunter | 3 | 11/14 | 19/24 | [Rapport et trace](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/44916768090/artifacts/14711787946) |
| Désert Scout | 2 | 14/14 | 15/18 | [Rapport et trace](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/44916768090/artifacts/14711629709) |
| Glace Scout | 6 | 14/14 | 16/18 | [Rapport et trace](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/44916768090/artifacts/14712148397) |
| Marais Scout | 1 | 14/14 | 12/18 | [Rapport et trace](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/44916768090/artifacts/14712381833) |

Dans la meilleure variante Désert, le relevé à l’activation de l’Apex montre deux unités encore disponibles sur une proie déjà vaincue. Dans la variante Glace, il reste trois unités sur la patrouille d’insertion n°1. Ces comptages décrivent ces parties et le moment observé.

Le rangement alternatif Glace Scout a laissé la pièce d’une unité du Brute pour essayer la patrouille d’insertion à la place. Ses huit variantes extraient et se rejouent exactement. La meilleure garde **15/18 unités** et trois unités restent sur la patrouille. Le meilleur résultat Glace du lot est **16/18**. Total de la matrice et des variantes du lot : **140 extractions sur 144 essais**, avec **144 rejeux terminaux identiques** et aucune extraction supplémentaire au seuil plein. [Rapports et traces du rangement Glace](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/44917611354/artifacts/14712605891)

## Reprise navigateur du Volcan

Le navigateur ouvre le vrai GameClient depuis la sauvegarde Glace et atelier déjà documentée. Le bouton de pause ouvre le dialogue natif, puis « Suspendre et sauvegarder » ferme le terrain de chasse. Après rechargement et reprise, le Volcan repart à **21,500 s** pour la même tentative `0`. Le sidecar observé porte le SHA‑256 `fcc5d98d3f6525d50399bff25ea2ff90a62ab04b255f882af64838f8c1aa8146`. [Rapport navigateur, entrées et captures](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/44916265800/artifacts/14711934633)

Le Volcan reste en phase cible après 806,829 s murales. Le dernier point publié au journal indique 120,850 s simulées et 178,74 PV. L’essai ne donne ni extraction ni règlement durable. Les deux ouvertures de menu anatomique ne produisent aucune pièce et la recette ne passe pas par l’atelier dans cette chasse. Le rapport recense zéro ressource manquante et deux requêtes audio annulées. `REM112-06` gagne une reprise effectivement observée. Les victoires navigateur précédentes dans la Jungle et la Glace ainsi que la conservation déjà documentée restent les résultats positifs pour ces étapes. [Historique de la campagne navigateur](../v112-campaign-canonical/README.md) · [Journal de l’essai Volcan](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/44916265800/job/136882419575)

### Départ depuis la sauvegarde neuve

La chaîne des huit contrats est lancée depuis le `defaultSave` historique sur le GameClient actuel. La Jungle a repris sa tentative `0` à **21,600 s**, puis a terminé ses objectifs, le rite Apex et l’extraction. Le règlement durable confirme les compteurs de tentative et de réussite. [Rapport de chaîne, traces et captures](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/44916265800/artifacts/14711789372)

La Glace a repris sa tentative `0` à **20,450 s**. Elle est restée en phase de pistage à `x = 2018` jusqu’au dernier point journalisé à **190 s** simulées. La tentative s’est arrêtée au budget mural sans extraction. La chaîne s’arrête là. Elle consigne l’achat du Flaying Tool pour 120 marques et l’amélioration Hunter pour 250 marques. Le rapport conserve les deux reprises distinctes du règlement, et recense zéro ressource manquante et deux requêtes audio annulées. [Journal de chaîne](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/44916265800/job/136882419372)

## Détour cryothermique et nouvelles preuves du lot 3

Le relevé navigateur du lot 2 plaçait le chasseur à `x = 2018`, avec une largeur de 72 px et des pieds à `y = 430`. La grille commence à `x = 2090` et se termine à `y = 328`. Le HUD de la Glace indique désormais le bord du gradin par lequel redescendre. Le texte d’orientation s’affiche sans raccourci. Les indications du relais, de la réserve et de la trappe gardent leur commande lorsqu’un geste est proposé. Les **115 tests** du HUD, du terrain et du harnais de commandes ainsi que le lint strict passent. [Traces à la grille et sur les prises](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/44924625428/job/136907889626) · [Tests et lint](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/44925859087/job/136911669859)

### Reprise, passage et règlement par le vrai GameClient

- **Glace, passage inférieur.** Le chasseur reprend sa tentative `0` à **20,650 s**. Le franchissement est observé à **24,600 s**, après le bord droit de la grille toujours fermée, avec le chasseur à `x = 2129,99`, `y = 404`. La recette courte atteint la phase cible au lieu de rester au pied de la grille. [Rapport, captures et entrées](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/44925274493/artifacts/14715318947)
- **Volcan, contrat réglé.** Au départ de la sauvegarde Glace et atelier documentée, la tentative `0` reprend exactement à **21,550 s**, puis se termine et incrémente les compteurs durables de tentative et de réussite. L’extraction termine à **133,950 s simulées**, avec **74,34 PV**. Cette variante teste le combat, le rite et l’extraction sans collecte anatomique. Le rapport indique zéro ressource manquante et trois requêtes audio annulées. [Rapport, captures et entrées](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/44925274493/artifacts/14715503587)

- **Glace, essai de contrat.** Le même détour passe sous la grille lors d’une seconde session, à **28,050 s**, après une reprise exacte à **21,300 s**. L’essai atteint `x = 6231,54`, en phase cible à **91,300 s** simulées avec **145,58 PV**. Le budget mural s’arrête avant le règlement. Les six tentatives anatomiques ne rapportent aucune pièce. Le rapport recense zéro ressource manquante et deux requêtes audio annulées. [Rapport, captures et entrées](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/44925274493/artifacts/14715792279)

Le Volcan rejoint la Jungle et la Glace historiques parmi les trois contrats distincts terminés avec reprise. La preuve d’atelier de la Glace relève toujours de la revisite documentée. `REM112-06` demeure partiel pour les huit chasses et leurs parcours anatomiques, d’extraction et d’atelier. [Historique navigateur](../v112-campaign-canonical/README.md)

### Charges naturellement récoltées

Les essais repartent de la sauvegarde gagnée. Chaque tentative supplémentaire provient d’une vraie extraction appliquée à cette sauvegarde. Le moteur, les adversaires et les corps proviennent du code de `3d1138af7b22a2d2f02da080ef05706af3170ba7`. La modification de priorité dirige uniquement les actions vers des pièces anatomiques admissibles. Les variantes de repli produisent **42 extractions sur 44 essais moteur**, avec **44 rejeux terminaux exacts**. Le chargement est mesuré à l’embarquement et au retour en campagne.

| Mission | Armure et difficulté | Variante | Extractions | Meilleur volume conservé | Preuve |
| --- | --- | --- | ---: | ---: | --- |
| Glace | Scout, Hunter | Peau de patrouille prioritaire | 8/8 | 16/18 | [Trace](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/44925274493/artifacts/14715039627) |
| Glace | Scout, Jeune Sang | Peau de patrouille prioritaire | 8/8 | 14/18 | [Trace](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/44925274493/artifacts/14715880136) |
| Désert | Scout, Jeune Sang | Distances de collecte | 6/6 | 8/18 | [Trace](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/44925274493/artifacts/14715054355) |
| Volcan | Hunter, Jeune Sang | Distances de collecte | 4/6 | 19/24 | [Trace](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/44925274493/artifacts/14715094170) |
| Glace | Scout, Hunter | Stabilisation au poste | 8/8 | 16/18 | [Trace](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/44925744096/artifacts/14715413943) |
| Glace | Scout, Jeune Sang | Stabilisation au poste | 8/8 | 14/18 | [Trace](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/44925744096/artifacts/14715478932) |

Sur la meilleure admission Glace, la peau de trois unités est toujours sur le bélier à la suite d’une interruption du travail. Les nouvelles variantes n’atteignent pas un seuil de pleine charge supplémentaire. `REM112-08` demeure partiel. [Décision et gestes de collecte constatés](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/44924625428/job/136907889626)

## Recette ciblée de prélèvement et reprise de l’atelier

La recette Chromium permet de choisir une espèce (`--harvest-species`) et une partie (`--harvest-action`). Elle passe par le menu de la proie effectivement vaincue et attend le reçu natif du geste sur ce cadavre. Le mode `--require-harvest-workshop` vérifie que la même pièce entre dans la sauvegarde de campagne après extraction, puis que l’atelier la met en réserve. Le premier travail est repris après rechargement du document. Le contrôle suit l’identifiant de la pièce, le paiement de chaque étape et chaque geste confirmé.

### Résultats des sorties Chromium

- **Volcan, tendon de Molosse de cendre.** La tentative 0 reprend exactement à **22,00 s simulées**. Les commandes natives `analyze` et `harvest-tissue` produisent le tendon `volcano-bad-blood:0:volcano-initiates-1:tissue`. Il pèse **0,4 kg**, occupe **1 volume** et sa qualité vaut **65**. Après le retour au relais, un second prélèvement réel donne une qualité de **56**. La pièce se trouve dans le sac de terrain dans les deux cas. Le second tendon est aussi présent dans le vrai sidecar à **114,917 s**, à la même qualité 56. Le fichier Playwright de stockage et le rapport enregistrent le même contenu, d’empreinte `496609d2401572703892fd6d33f1385357ace12e9885d9bb2af9f16ef54382ef`. Le règlement puis l’atelier restent à établir dans le même parcours. [Rapport, entrées et captures](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/44942225541/artifacts/14722563612) · [Contrôle de sauvegarde de la pièce](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/44944294672/job/136968074545)
- **Volcan, os de Xénomorphe.** La tentative 0 reprend exactement à **22,65 s**. Le bouton « Examiner la proie vaincue » s’active, puis Playwright attend une navigation et atteint son délai avant le geste. Le dernier point du journal reste en phase cible. [Rapport, entrées et captures](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/44942225541/artifacts/14723066473)
- **Glace, revisite.** Le passage sous la grille fermée est observé à **9,50 s** puis la tentative 1 reprend exactement à **21,85 s**. L’essai rencontre le même délai Playwright lors de l’examen de la proie. Il atteint **109,90 s** simulées en phase trophée, sur une plateforme à `y = 430` alors que la dépouille de l’Apex repose au sol à `y = 624`. La preuve historique de conservation de la Glace demeure celle de la revisite déjà documentée. [Rapport, entrées et captures](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/44942307737/artifacts/14722193481)

La revisite Glace suivante valide le parcours complet avec le mode strict. Elle passe sous la grille fermée à **9,70 s**, prélève par `analyze` puis `harvest-bone` le spécimen `ice-cryostalker:1:ice-runners-1:bone` (**1,2 kg**, **2 volumes**, qualité **82**), puis reprend exactement à **24,55 s** après rechargement. La chasse est réglée à **123,10 s** avec **119,49 PV** et la sauvegarde de campagne reçoit la même pièce. L’atelier est suspendu à **1/3 geste** de nettoyage, puis reprend ce même travail après rechargement. Les **15 gestes** coûtent **14 marques** au total (de **592** à **578**) et la réserve passe de **0 à 1**. Le rapport recense zéro ressource manquante et deux requêtes audio annulées. [Rapport, entrées et captures](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/44942723145/artifacts/14722643260) · [Reçus du règlement et de l’atelier](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/44942723145/job/136963246286)

Le pilote utilise désormais le focus et Entrée pour activer les boutons du terrain et de l’atelier. Une relance après mort doit produire sa propre reprise avant d’être comptée comme une extraction après rechargement. `REM112-06` reste partiel. [Recette Chromium](../../../scripts/qa-hunt-campaign-browser-v112.mjs)

### Replis avec des prises naturelles sur de nouvelles tentatives

Depuis la sauvegarde de campagne gagnée, des victoires appliquées par le moteur ouvrent les tentatives 9, 10 et 12. Les scénarios utilisent l’insertion en vaisseau visible et trois distances de collecte. Chaque charge est relevée à l’embarquement puis à l’extraction, avec les mêmes pièces. Le lot enregistre **33/33 extractions**, dont **29 avec des prises**, et **33/33 rejeux terminaux exacts**. La Glace s’arrête aux tentatives 9 et 10 dans cette matrice, après la mort du Hunter pendant le rite de la partie jouée pour ouvrir la tentative suivante.

| Mission | Armure | Extractions | Plus grand volume extrait | Preuve |
| --- | --- | ---: | ---: | --- |
| Glace | Scout | 6/6 | 15/18 | [Rapports et traces](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/44942587435/artifacts/14722258076) |
| Désert | Scout | 9/9 | 9/18 | [Rapports et traces](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/44942587435/artifacts/14722870237) |
| Marais | Scout | 9/9 | 5/18 | [Rapports et traces](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/44942587435/artifacts/14721798376) |
| Volcan | Hunter | 9/9 | 12/24 | [Rapports et traces](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/44942587435/artifacts/14722401792) |

La matrice n’atteint aucun nouveau seuil de pleine charge. Les preuves Scout à 18/18 de la Jungle et du Volcan demeurent celles des essais précédents de ce dossier. `REM112-08` reste partiel. [Journal des quatre scénarios](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/44942587435)

Une reprise de la sauvegarde obtenue après la tentative 9 ouvre ensuite les tentatives 11 et 12 avec des victoires Berserker en Jeune Sang. Les douze replays Scout de ce contrôle extraient et se rejouent exactement, dont huit avec des prises. Le meilleur sac reste à 15/18. Le lot totalise **45 extractions et 45 rejeux exacts**, dont **37 avec prises**. La variante Glace 10 à 360 px a été jouée dans les deux séries. [Rapports et traces de la relance Glace](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/44943046524/artifacts/14722517508)

## Désert au lot 7

Le premier essai archivé maintenait le chasseur sur un gradin de 512 px à 145,00 s. La nouvelle recette Chromium lit le point de prise fourni par la chasse et son contrôle de portée, puis reprend les gestes de descente déjà utilisés par la recette au sol. Sur le même relevé, le crâne se prend à `x = 6249,17` et `y = 572` avec une portée de 125 px. Le pilote choisit le bord à `x = 6280,5` et avance à droite. Il attend une position admise par la chasse avant d’envoyer la commande de prise. [Contrôle de régression](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/44957203591/job/137007837266) · [Recette Chromium](../../../scripts/qa-hunt-campaign-browser-v112.mjs)

Les deux essais suivants utilisent le vrai GameClient à la révision `2823202`. Ils prélèvent l’os `desert-sandmaw:0:desert-sandmaw-foragers-4:bone` après `analyze` et `harvest-bone`. Il pèse **1,2 kg**, occupe **2 volumes** et sa qualité vaut **68**.

| Sauvegarde d’admission | Reprises exactes | Prélèvement | Dernier résultat | Preuve |
| --- | --- | --- | --- | --- |
| Marais réglé sous Chromium, peau archivée à l’atelier | 20,450 s et 46,433 s | 27,850 s | Mort en phase cible à 145,417 s, reprise au relais confirmée, seconde mort à 116,233 s | [Rapport, captures et entrées](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/44957203591/artifacts/14729095208) · [Journal](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/44957203591/job/137007837561) |
| Marais terminé dans l’archive de simulation native | 22,000 s | 29,700 s | Mort en phase cible à 131,600 s | [Rapport, captures et entrées](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/44957203591/artifacts/14728473543) · [Journal](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/44957203591/job/137007837432) |

Les journaux indiquent zéro ressource manquante et deux requêtes audio interrompues après admission Chromium et trois après admission moteur. Le crâne, l’extraction du même os et l’atelier du Désert restent à qualifier. `REM112-06` demeure partiel. [Campagne navigateur et simulation des huit contrats](../v112-campaign-canonical/README.md)

Les sauvegardes exportées contiennent encore l’os de qualité 68. Le dernier point de reprise admissible du trajet Chromium se situe à **105,583 s** en combat, avec **192 PV** et un Apex à **836,32 PV**. Le trajet d’admission moteur conserve un point de reprise à **115,050 s** avec **109,40 PV** et un Apex à **715 PV**. Le contrôle des rapports et des archives de stockage n’a trouvé aucun point enregistré en phase trophée ou extraction. [Contrôle des sauvegardes](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/44959156155/job/137013878240)
