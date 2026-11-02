# HUD de découverte — cause et réponse demandée

Le minifix de discoverySignalsV112 distingue deux informations : la cause de découverte du corps et la réponse demandée. Les textes de cause, pictogrammes, palette, ancrage et badge132×26 sont conservés. Aucun moteur de perception, IA, physique, scénario, sauvegarde ou ressource artistique n'est modifié.

| Cause, ligne1 | Réponse, ligne2 |
| --- | --- |
| CORPS REPÉRÉ, RADIO · CORPS ou ODEUR · CORPS | Examen demandé, Évitement demandé, Inspection demandée ou Garde demandée |

La cause est désormais explicite pour les animaux aussi. « Demandé » décrit l'ordre transmis : un témoin peut continuer la poursuite quand ses contacts le justifient. Le mode search de recherche du chasseur n'est pas renommé ni rendu équivalent à investigate. L'ancien helper de label unique reste compatible pour l'historique ; le renderer utilise le nouveau helper pur cause/réponse.

## Nouvelles preuves de rendu réel

[Vision dans un nouvel essai frais](native-fresh-visual.png) : CORPS REPÉRÉ puis Examen demandé apparaissent dans le vrai GameClient après rebundle du minifix.

[Reprise native du vrai sidecar joué](native-played-sidecar-resume.png) : CORPS REPÉRÉ / Examen demandé et RADIO · CORPS / Examen demandé sont tous deux visibles, sans chevauchement de leurs deux lignes. Cette preuve est une **compatibilité de reprise et de rendu HUD**, pas un nouveau contrat gagné.

Le sidecar vient du vrai run Glace e4 archivé à21,6 s. Le propriétaire et le numéro de tentative correspondent. Les achats ont été rejoués dans l'UI native :120marques pour le Flaying Tool puis250pour l'amélioration Hunter. L'inventaire, le loadout et l'apparence gagnés correspondent exactement à la configuration du sidecar. L'enveloppe entière est restaurée inchangée, puis le vrai GameClient la charge par ses contrôles de reprise. Aucun acteur, cadavre, réaction, objectif ou temps n'est greffé au runtime.

Le [rapport complet](resume-report.json) et [les contrôles](validation.json) relient les hashes au parent e4 archivé. Après reprise, le temps natif atteint22,9s et la réaction radio reçue auparavant reste active jusqu'à26,4167s. Le destinataire est ice-salvagers-1, le corps ice-runners-2, la source de transmission ice-brutes-0. Le navigateur avance pendant la capture : la lecture JSON ne prétend pas représenter le même tick exact que l'image. Zéro pageerror et zéro asset manquant dans cette reprise.

Commande exécutée :

```sh
node scripts/qa-hunt-campaign-browser-v112.mjs \
  --campaign-source outputs/qa-hunt-campaign-browser-v112/second-run/report.json \
  --resume-hud-source outputs/qa-hunt-campaign-browser-v112/remaining-run-r3/report.json \
  --missions ice-cryostalker \
  --output outputs/qa-hunt-discovery-hud-v112/played-sidecar-resume-r2 \
  --wall-seconds 90 --skip-harvest
```

Les essais frais retardés/interrompus, un essai frais arrivé jusqu'au trophée sans radio capturée et le premier échec de sélecteur de reprise sont conservés dans [l'archive des tentatives](attempts-preserved.tar.gz). Ils ne sont pas remplacés par un faux succès. Les [observations et captures e4](../v112-discovery-observation/README.md), ainsi que les [preuves ROU112-06](../v112-canopy-choice/README.md), restent des baselines antérieures au correctif.

## Tests et bornes du texte

35 tests ciblés passent :20existants de découverte native et15nouveaux HUD, comprenant les12couples de mapping3causes×4réponses. Les combinaisons de mapping sont des tests explicites, pas12rencontres déclarées natives. Le save/restore du contexte Canvas, la géométrie et les anciens labels sont testés.

[layout.json](layout.json) relève les vrais TextMetrics Chrome et six matrices dessinées par la fonction native : largeurs CSS320,768,1280 et DPR1/2, soit72combinaisons. Toutes les lignes restent dans le badge et séparées ; gap logique minimal2px, largeur maximale81,80px sous la limite101px. Les polices logiques restent9px pour la cause et8px pour la réponse. Les matrices sont des fixtures de layout, distinctes des deux captures de jeu réel.

Le gap CSS descend à0,5px à320de large. Les mesures établissent des bornes géométriques sous mise à l'échelle uniforme, pas une validation de lecture sur téléphone ou un écran physique. Aucune étude humaine, compréhension novice, performance ou qualité d'écoute n'est revendiquée.

## Provenance et portée

La base Git du nouveau runner est e0347c7645667c6dd7fabc48527704d4b5f1ca32 avec un overlay HUD non committé au moment de la capture. Le sidecar réellement joué provient du parent e4a6c64a1e77edad8865aa05ca7c2901d62bfa09. Le SHA256 exact du module modifié est `eaac00b22e9976499f2a7ce1e0439ba33eba0d2fd5aa1f40faa9c9887d4b6349` ; sa [copie de preuve](production-overlay-discoverySignalsV112.ts.txt), la lecture source HuntCanvas du rapport, les images, le layout et les fichiers de test figurent dans le manifeste. Il ne faut donc pas attribuer ces nouveaux labels au seul commit e4. Aucun commit ni ref n'est déplacé par ce lot.

Le champ sourceContext.gitCommitIsBaseOnly du rapport brut ne contrôle que HuntCanvas/GameClient et vaut false dans cet enregistrement. Il ne détecte pas leur import HUD modifié. La correction de portée est explicite dans provenance.json : pour le bundle complet, ce commit est seulement une base et le SHA du module HUD fait autorité. Le rapport brut est conservé inchangé.
