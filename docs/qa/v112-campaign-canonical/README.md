# Huit chasses natives depuis le départ de campagne historique

Le 2 novembre 2026, le pilote automatique a terminé les huit contrats successifs dans la vraie simulation `HuntCanvas`, depuis `defaultSave` et ses seuls droits initiaux. La commande avec `--require-complete` a fini avec le code **0**. Il s'agit de **huit succès de simulation native**, pas d'une campagne navigateur, d'une validation humaine ou d'une fermeture de REM112-06.

Code applicatif : `e4a6c64a1e77edad8865aa05ca7c2901d62bfa09`. Le [rapport brut](native-report.json) conserve les empreintes du runtime, du contrôleur et du verrou de dépendances, les décisions, les pertes réelles de santé, les résultats natifs et les critères restants. La [provenance](provenance.json) porte les SHA256 des livrables. L'[archive des données brutes](native-raw.tar.gz) contient le rapport original, les huit journaux d'entrées, les huit séries d'états et les huit sauvegardes de campagne gagnées ; aucune capture de gameplay n'a été fabriquée pour cette preuve sans rendu.

| Contrat | Temps simulé | PV à l'extraction | Résultat natif |
| --- | ---: | ---: | --- |
| jungle-vey | 62,000 s | 138,350 | succès |
| ice-cryostalker | 59,983 s | 112,020 | succès |
| volcano-bad-blood | 85,783 s | 104,333 | succès |
| swamp-hydra | 90,700 s | 97,880 | succès |
| desert-sandmaw | 107,817 s | 126,567 | succès |
| ocean-leviathan | 106,817 s | 101,600 | succès |
| fungal-hivemind | 97,550 s | 118,330 | succès |
| ruins-ancient-guardian | 105,883 s | 127,617 | succès |

Le départ conserve l'armure Hunter, le combistick, le plasmacaster, le capteur et le leurre par défaut, sans amélioration, outil de dépeçage, marque donnée ou armure déverrouillée artificiellement. Chaque mission suivante est admise seulement après son déverrouillage par `applyMissionResult` et un résultat réellement émis par la simulation. Les soins utilisent les charges finies du Medicomp via l'entrée native. La génération conserve le numéro de tentative natif `0` et le générateur aléatoire de QA est documenté dans le rapport.

Le chargement du moteur ajoute uniquement des exports à la source de production. Le contrôleur lit l'état et renseigne `InputHub` ; `stepGame` possède ensuite la physique, les ennemis, les dégâts, les objectifs, l'Apex, le rite, la navette et son résultat. Aucun ennemi n'est ajouté ou supprimé, aucune géométrie ni position n'est remplacée, aucun objectif n'est amorcé et aucun résultat n'est forcé. La descente d'un appui passe par son bord réel. Le pilote traverse réellement hors du champ de cendres avant le duel du Gardien.

```sh
node scripts/qa-hunt-campaign-canonical-v112.mjs \
  --limit-seconds 240 --require-complete \
  --report outputs/qa-hunt-campaign-canonical-v112/final-native-r3/report.json
```

Des essais précédents ont échoué : transpondeur trop bas sous un appui, dépouille hors portée verticale, exposition à la lave ou au champ de cendres, puis sept succès et un décès au Gardien. Le [registre d'essais non clôturants](failed-attempts/manifest.json) conserve cinq rapports bruts représentatifs compressés et leurs empreintes, dont l'expiration Volcano après deux reprises natives et une revisite gagnée sans atteindre son objectif anatomique. Ces constats ont corrigé les décisions du pilote ; aucun bug de production n'a été établi dans ce lot et aucun code applicatif n'a été modifié par son auteur. Le succès final n'efface pas ces tentatives.

REM112-06 reste ouverte. Cette preuve ne monte pas GameClient, ne déclenche pas ses événements navigateur, ne recharge pas son sidecar actif, ne rapporte aucune prise anatomique dans l'inventaire et n'effectue aucun travail de conservation. Le départ historique de chasse ne prétend pas rejouer la nurserie ou la formation Unblooded. Le pilote navigateur séparé exerce le vrai GameClient et ses contrôles ; seuls ses résultats réellement terminés peuvent compléter ces limites.

## Un premier contrat réellement terminé dans le navigateur

Le [rapport navigateur jungle](browser-jungle/browser-report.json) conserve un contrat réel, depuis le même départ historique et le GameClient entier : migration de la sauvegarde, carte et ses trois trajets d'autopilote, briefing, neuf ennemis vaincus, quatre scans, récupération du transpondeur, Vey vaincue, rite Apex, navette et débrief. Une suspension à vingt secondes simulées, le rechargement du document et la reprise du sidecar passent par les vrais boutons du produit. Les commandes de chasse utilisent `page.keyboard` et `page.mouse` ; le seul ajout à HuntCanvas est une fonction de copie d'état en lecture seule.

Le [débrief réellement capturé](browser-jungle/04-attempt-terminal.png) affiche un score de 99 ; la sauvegarde durable lue après la mission contient `completed`, `attempts: 1`, `completions: 1` et les quatre objectifs. Le temps simulé réellement joué est de 64,2 secondes, les compteurs natifs indiquent neuf morts et quatre scans. La [capture de suspension](browser-jungle/suspended-to-deck.png) présente la reprise Oseris-IV à 0:20. Les neuf captures originales ont été ouvertes ; elles sont conservées sans retouche avec les états et les entrées dans [l'archive brute](browser-jungle/browser-raw.tar.gz). La [provenance](browser-jungle/provenance.json) distingue cette version historique du pilote des vérifications renforcées ajoutées ensuite.

Ce parcours a enregistré treize erreurs de console liées à onze ressources absentes du checkout sparse. Elles restent intégralement dans le rapport ; il ne certifie ni le rendu artistique, ni le build de production. L'image de carte est une capture transitoire de chargement, pas une preuve visuelle de la carte complète. Aucune prise anatomique n'a été rapportée lors de cette première chasse et aucun atelier n'y a été exercé.

## Deuxième contrat navigateur : Glace et reprise exacte

Le [rapport Glace](browser-ice/browser-report.json) continue le véritable `finalSave` du premier contrat, dont l'empreinte est reliée au [reçu parent](browser-ice/provenance.json). Le Flaying Tool est acheté pour 120 marques, puis l'armure Hunter est améliorée au niveau 1 pour 250 marques depuis les 378 marques réellement gagnées. Ces achats passent par les boutons de l'armurerie ; aucune monnaie ou amélioration n'est amorcée dans le runtime.

La chasse se termine après **98,65 secondes simulées**, **12 morts** et **5 scans**, avec un [débrief S99](browser-ice/ice-cryostalker-04-attempt-terminal.png). La reprise lit le vrai sidecar : **21,6 secondes avant et après rechargement**. Le pilote vérifie ensuite la progression durable : `attempts` et `completions` passent tous deux de 0 à 1 et le total de missions terminées augmente de 1. Le parcours ne comporte aucune erreur de page ou de console et aucune ressource manquante. Les corps et menaces restent réels ; aucun spécimen anatomique n'est attribué aux tentatives de menu restées sans collecte.

Les quatorze PNG ont été ouverts lors d'une revue indépendante. Les captures de découverte montrent les labels natifs `CORPS REPÉRÉ` et `RADIO · CORPS`, accompagnés de reçus visuels/radio et de réactions `investigate` dans les états bruts ; cela n'atteste aucune compréhension humaine. La capture de carte reste transitoire. `earned-flaying-tool.png` montre surtout le toast d'amélioration Hunter ; l'achat de l'outil est établi par la transaction distincte du rapport. Les trois fichiers `phase-finished`, `attempt-terminal` et `failure.png` sont identiques et montrent la victoire : le batch a échoué après la remise durable sur un sélecteur de retour ambigu du pilote, corrigé ensuite. Cet échec est conservé. La version du navigateur n'avait pas encore été inscrite au moment de cette exception ; la provenance signale ce manque sans lui attribuer une valeur inventée.

L'[archive brute Glace](browser-ice/browser-raw.tar.gz) conserve tous les noms et octets ; les fichiers identiques utilisent des liens durs tar standards. La reprise et la remise de ces **deux contrats uniques** sont ainsi distinctes de la preuve native huit sur huit. **Les six autres contrats navigateur restent ouverts**, ainsi que toutes les exigences humaines, artistiques et matérielles qui ne relèvent pas de ces essais.

## Une revisite réelle avec prélèvement, extraction et atelier durable

Le [rapport d'atelier](browser-workshop/browser-report.json) continue le véritable `finalSave` Glace, avec le même propriétaire et son empreinte parent vérifiée. La sélection native « Préparer cette revisite » lance **Glace run1**, sans acteur ajouté ni objectif amorcé. Le pilote rejoint au sol une proie réellement vaincue, `ice-runners-1`, espèce `nivalis-k--frost-xeno`. Les boutons natifs activés au clavier produisent l'analyse, le dépeçage puis `harvest-bone` : **un segment caudal de xénomorphe, 1,2 kg, 2 volumes, qualité 82**. La [capture du menu](browser-workshop/ice-cryostalker-actual-anatomical-harvest.png) provient du vrai rendu ; l'identité `ice-cryostalker:1:ice-runners-1:bone` se retrouve ensuite dans le sac et le dépôt de campagne.

La chasse reprend son propre sidecar à **21,5 → 21,5 secondes**, puis gagne normalement l'Apex, le rite et l'extraction en **137,65 secondes simulées**, sans retry. La remise durable est vérifiée : les tentatives et complétions Glace passent de **1 à 2**. Ce parcours est une revisite et ne compte pas comme troisième contrat unique.

L'atelier réel effectue les quatre étapes : **Nettoyer, Traiter, Sécher, Monter**, avec les quinze gestes manuels requis. Une [suspension à 1/3 gestes](browser-workshop/workshop-paused.png), après paiement des deux marques de nettoyage, est suivie d'un rechargement du document et de « Continuer ». Le registre complet des prises et le solde sont comparés avant/après ; ils sont strictement égaux. « Reprendre sans frais » poursuit ensuite le travail. Le coût total est **14 marques**, de **594 à 580**, et l'outil finit à **90/100** après ses deux usages de terrain. L'[archivage final](browser-workshop/workshop-mounted-archive.png) augmente exactement la réserve de la partie et de l'espèce ciblées de **0 à 1**, sans spécimen actif ni travail restant.

La [provenance](browser-workshop/provenance.json) et l'[archive brute unique](browser-workshop/browser-raw.tar.gz) conservent ce parcours, son état de stockage et ses quatorze captures, toutes ouvertes et vérifiées indépendamment. **Aucune erreur de page/console ni ressource manquante** n'a été enregistrée. Les deux entrées HuntCanvas et GameClient correspondent à la base `e4a6c64a1e77edad8865aa05ca7c2901d62bfa09`, mais leur dépendance `discoverySignalsV112.ts` portait déjà le nouveau texte HUD non commité lors du bundle à 05:54 UTC. Le manifeste complet des dépendances n'avait pas été enregistré : **ce parcours ne certifie donc pas un arbre applicatif exact e4**, ni le build publié. Le champ historique `gitCommitIsBaseOnly:false` ne contrôlait alors que les deux entrées ; la provenance corrige explicitement sa portée sans modifier le brut. Le correctif ultérieur du menu de carcasse portée, daté 06:00 UTC, est postérieur à ce bundle. Les prochains bundles enregistrent chaque source applicative effectivement compilée et l'empreinte du JavaScript/CSS produit.

L'image de carte reste un chargement transitoire ; la vue d'armurerie montre un outil déjà acquis dans cette admission. Ce résultat qualifie **cette pièce et cette revisite end-to-end**, sans étendre le résultat aux autres espèces, aux six contrats navigateur manquants, à la compréhension humaine ou aux appareils physiques. **REM112-06 reste ouverte.**
