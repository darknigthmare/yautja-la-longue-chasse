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
