# ECO112-11 — baseline native e4, causes et réponses

Cette preuve reste une **observation technique partielle** ; aucun statut du classeur n'est changé. Les captures d'origine montrent désormais les causes visuelle et radio dans un vrai parcours de glace terminé. Elles ne constituent pas une étude de compréhension humaine et ne prouvent pas que l'ordre d'investigation supplante la poursuite.

Source applicative e4a6c64a1e77edad8865aa05ca7c2901d62bfa09, avant modification du HUD. Les anciennes observations sans réception radio sont conservées intégralement dans [la capsule initiale](initial-partial-evidence.tar.gz), avec son ancien script, rapports, captures et manifeste. Le nouveau contexte de glace réussi s'ajoute aux deux parcours précédents ; l'échec de glace n'est pas effacé.

[Observations brutes](observations.json), archives byte-exactes browser-samples-0/1/2.json.gz et rapports parents browser-report-0/1/2.json.gz. Le script qa-hunt-discovery-observations-v112.mjs lit les journaux terminés, sans simulation, placement d'acteur, replay ni capture fabriquée. Le manifeste conserve toutes les empreintes.

| Contexte | États | Reçus visuels | Reçus radio | Files différées observées |
| --- | ---: | ---: | ---: | ---: |
| 0 · jungle-vey | 65 | 4 | 0 | 1 |
| 1 · ice-cryostalker | 66 | 7 | 0 | 2 |
| 2 · ice-cryostalker | 98 | 10 | 1 | 2 |

Soit229 états,21 reçus visuels et1 reçu radio. Les deux premiers contextes n'avaient aucun reçu radio : ce constat demeure exact pour eux.

## Nouvelles captures réellement inspectées

[Vision](run-2-ice-cryostalker-body-discovery-visual-canvas.png) : œil et « CORPS REPÉRÉ » lisibles, réaction investigate de ice-runners-3 liée au corps ice-runners-0. Reçu natif à4,6167 s ; observation à4,70 s.

[Vision et radio ensemble](run-2-ice-cryostalker-body-discovery-radio-canvas.png) : « CORPS REPÉRÉ » et « RADIO · CORPS » sont distincts et lisibles avec leurs pictogrammes. Le corps ice-runners-2 est vu par ice-brutes-0 à18,5167 s, puis reçu par radio chez ice-salvagers-1 à19,4167 s : délai mesuré0,9 s pour un minimum réglé0,8 s. Les deux acteurs sont humains, vivants, actifs et de faction coordination:human au premier état commun19,450 s. Leurs centres sont distants de234,41 unités, sous le rayon480. Le destinataire est alors à606,15 unités du corps, hors rayon visuel480, et n'a que le reçu radio. Son propre reçu visuel apparaît plus tard à22,8167 s.

Ces images sont les PNG natifs fournis par le parcours navigateur, copiés sans édition. Le navigateur continue d'avancer pendant la capture : les positions pixels ne sont pas celles exactes de la lecture JSON précédente. Le rapprochement repose sur les identités, le reçu et la réaction persistants, pas une prétendue capture du même tick. Les dimensions sont1278×720.

## Ce que le HUD distingue actuellement

| Nature | État moteur | Texte ou limite dans la baseline |
| --- | --- | --- |
| Cause visuelle humaine | channel=visual, response=investigate | Œil + CORPS REPÉRÉ. |
| Cause radio humaine | channel=radio, sourceActorId, response=investigate | Antenne + RADIO · CORPS. |
| Cause olfactive animale | channel=scent, response=avoid/inspect/guard | Le dictionnaire contient ODEUR · CORPS, mais le label animal choisit la réponse à sa place ; la cause est masquée. Aucun reçu scent n'est observé ici. |
| Réponse humaine demandée | response=investigate, riteInvestigate | Aucun mot ne nomme cet ordre dans le badge actuel ; seule sa cause est affichée. |
| Réponse animale demandée | avoid/inspect/guard | Patte + ÉVITEMENT, EXAMEN ou GARDE ; le même mot peut venir de visual ou scent. |
| Recherche du chasseur | aiBrains.mode=search | Aucun libellé de badge propre. search peut venir d'une perte, d'une suspicion ou d'une alerte. Le son enemy-alert est partagé. |

Les composants natifs HuntFieldGuideV112 et FirstHuntGuide inspectés n'expliquent pas cette séparation cause/réponse. La réponse investigate est un ordre local d'examen du corps, distinct du mode search de recherche du chasseur. Dans le nouvel état radio, le destinataire passe ensuite en engage alors que le badge radio persiste : « Examen en cours » serait donc une affirmation excessive.

Les journaux contiennent38 ordres riteInvestigate actifs échantillonnés, mais les contacts sensoriels locaux décidant de leur priorité ne sont pas sérialisés. Aucun couple adjacent ne prouve engage→search avec lostContactSeconds≥1,4 au second relevé. Les candidats de badge dans le bitmap ne remplacent pas les captures effectivement inspectées. La [capture animale antérieure](native-ice-animal-avoidance.png) reste une réponse ÉVITEMENT, pas une preuve de cause radio.

## Minifix HUD proposé depuis ce défaut capturé

Conserver palette, pictogrammes et textes de cause existants. Dans le même badge, afficher cause sur la première ligne et réponse demandée sur la seconde : Examen demandé, Évitement demandé, Inspection demandée ou Garde demandée. Pour les animaux, la première ligne doit donc aussi montrer CORPS REPÉRÉ ou ODEUR · CORPS. « Demandé » décrit l'ordre, sans promettre que la poursuite du chasseur est interrompue.

Cette baseline est figée avant le minifix. Les nouveaux labels, leur mesure de texte, les tests de mappings et les captures d'un nouveau bundle devront être consignés séparément. Aucun succès d'étude humaine ne découle de ces labels. La priorité effective de l'investigation et la recherche après perte restent distinctes de la preuve de cause reçue.
