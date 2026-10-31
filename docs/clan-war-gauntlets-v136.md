# V136 — 54 études individuelles, validation visuelle et intégration réelle

**Chantier :** Yautja – La Longue Chasse · PR #42 (empilée sur #40, donc pas fusionnée dans `main`).
**État d'art exact :** **54 gauntlets distincts comme source de travail, aucun 1:1 validé**. Les modèles du cinéma sont de la propriété intellectuelle de leurs ayants droit ; ces images sont des études pour le fan game, pas des originaux de tournage.

## 1. Couverture réelle du catalogue

| Catégorie de données | Études distinctes | Calques source | Validation de reproduction |
|---|---:|---:|---|
| Jungle Hunter, 1987 | 1 | 7 SVG V134 | **Non validée** |
| City Hunter, Wolf, Feral, Dek | 4 | 16 SVG V135 | **Non validée** |
| Toutes les autres variantes (54 − 5) | 49 | 196 SVG V136 | **Concepts originaux non canoniques** |
| **Total** | **54** | **219 SVG** | **0/54 film-verified** |

Le nouveau répertoire `public/game/assets/v136/gauntlets/<id>/` contient **quatre calques indépendants par variante**, avec les mêmes coordonnées sources `540×290` : `01-arm.svg`, `02-shell.svg`, `03-interface.svg`, `04-lid.svg`.

Les formes ne sont pas de simples changements de couleur de l'ancien gauntlet : les boîtiers, points de fixation, proportions, éléments d'écran et capots sont générés depuis une graine stable différente par personnage. **Mais aucun de ces 49 designs n'est présenté comme fidèle à un film, jeu ou comic**, car les plans rapprochés du poignet individuel ne sont pas suffisamment connus. Il faut remplacer chaque concept par une reconstruction documentée et approuvée ; la structure de calques le permet sans réécrire la simulation.

Le pipeline `scripts/build-gauntlet-studies-v136.mjs` est déterministe et contrôle que les 196 fichiers committés correspondent exactement au générateur :
```sh
node scripts/build-gauntlet-studies-v136.mjs --check
node scripts/build-gauntlet-studies-v136.mjs outputs/gauntlet-v136
```
La seconde commande exporte **196 PNG alpha de 1080×580 et 49 PNG composites**, avec un manifeste par modèle et des SHA256 de composite. Le fichier `app/game/GauntletArchiveStudiesV136.tsx` les présente en jeu à partir des sources SVG individuelles ; `ClanWarGauntletV131` et `ClanWarGauntletLockerV132` emploient le même composant. Le script d'audit V134 a été étendu pour vérifier 54 sources réellement indépendantes, en distinguant 5 *source-informed* et 49 *original concepts*.

## 2. Sources de cinéma : ne pas inventer de détails

- **Jungle Hunter (1987)** : photo rapprochée des cinq zones de glyphes rouges, ouverture de capot et coque [AvP Central](https://www.avpcentral.com/images/predator-technology/predator-wrist-gauntlet.jpg). L'emplacement des symboles et les proportions restent à mesurer sur le film original. La figurine NECA n'est qu'une source secondaire et un modèle d'exposition utilisant des moules de Stan Winston peut avoir des gauntlets ajoutés/non conformes.
- **City Hunter (Predator 2, 1990)** : [Propstore lot 193088](https://propstoreauction.com/lot-details/index/catalog/496/lot/193088/) documente un **vrai gauntlet de cascade gauche**, statique et moulé en mousse, avec finition cuivrée. Ne pas déduire le nombre de cellules lumineuses du modèle cascade.
- **Wolf (AVP–R, 2007)** : [Propstore lot 112704](https://propstoreauction.com/lot-details/index/catalog/347/lot/112704) documente un **costume original ADI** : gauntlet gauche à inscriptions Yautja lumineuses, poignet droit avec deux lames. Le nombre exact des bandes de glyphes de notre maquette V135 n'est **pas** prouvé par cette fiche.
- **Feral (Prey, 2022)** : [spot et captures AvPGalaxy](https://www.avpgalaxy.net/2022/07/31/new-prey-tv-spot-shows-feral-predators-cloak-vision-modes-and-gadgets/) montrent des gadgets dont le gauntlet ; ils ne certifient pas les gravures fictives actuellement tracées sur notre modèle.
- **Dek (Badlands, 2025)** : [Wētā Workshop](https://www.wetaworkshop.com/projects/predator-badlands) confirme sa contribution aux armes, costumes et créatures ; la fiche générale ne démontre pas le scanner rond inventé dans notre prototype.

Les URLs vérifiées sont copiées dans le catalogue runtime JSON, son CSV et l'Excel V136. Les modèles n'ayant qu'une preuve du personnage/classe ne montent pas artificiellement au grade d'accessoire source certifié.

## 3. Interactions dans le jeu

Le modèle équipé demeure **unique par personnage** et représente :
- l'armurerie du vaisseau et le changement de gauntlet ;
- l'aperçu du rig de chasse (actuellement une finition de matière sur le sprite de poignet générique, pas un rig 1:1 distinct pour 54 modèles) ;
- le panneau « Guerres de territoire » : **vue classique et vue gauntlet holographique** partageant le seul `ClanWarAtlasV95` et le même état de conquête ;
- les quatre formes de mission V115 : assaut, Outer Ops, infiltration/sabotage, RTS.

Le répertoire de 49 SVG ne donne **aucun bonus caché** : les lectures, couleurs et sons originaux ne modifient jamais l'IA, les unités, les coûts, l'expérience, les résultats PvP ou la progression des autres mondes. Le système de 44 études V134 exige des missions, trophées, rangs, scans et éventuellement un rite réellement enregistrés, puis un clic de validation idempotent.

## 4. Sauvegarde et cohérence — correctif concret

Un défaut V134 a été détecté lors de l'audit de la chaîne de sauvegarde : `persistSocialProgress` acceptait et enregistrait le champ `gauntletV134` dans le JSON, mais sa signature TypeScript et son empreinte de réconciliation **omettaient** ce champ. Le correctif V136 ajoute `gauntletV134` aux deux emplacements. Cela protège les comparaisons de requêtes pendantes et évite une erreur de type masquée par la première CI limitée à certains fichiers.

Une erreur préexistante dans l'enregistrement des six scénarios RTS V119 a aussi été corrigée par un garde `isWarSourceRtsScenarioIdV119`, sans modifier les scénarios jouables.

La CI V136 prend désormais **tout le graphe de code TypeScript** via sparse checkout (le dépôt complet dépassant 13 Go), ajoute les petits manifestes JSON dont les modules dépendent et tente le build réel. Les contrôles V131 vérifient les sept + seize + cent quatre-vingt-seize calques, les tests de domaine, l'export PNG et les classeurs.

## 5. QA visuelle avec photogramme utilisateur

Route : `/gauntlet-qa-v136` :
- recherche, filtres et sélection des **54 modèles** ;
- deux modèles côte à côte, ouverture/fermeture des capots et zoom ;
- ajout **local uniquement** d'une image PNG/JPEG/WebP (moins de 12 Mo) appartenant au testeur ;
- superposition à opacité réglable pour comparer la silhouette de l'asset et un photogramme ;
- `URL.createObjectURL` local révoqué au remplacement, à la suppression ou au démontage ; **aucun transfert du fichier au serveur** ;
- affichage clair des références, insuffisances visuelles et niveaux de preuve.

Cette page facilite les comparaisons, mais **ne réalise pas automatiquement une homologation 1:1**. Le résultat doit être inspecté et approuvé par un artiste/QA humain pour chaque modèle.

## 6. Classeur et backlog restant

Le fichier `docs/Yautja_Gauntlets_V136_Arsenal_Clans.xlsx` poursuit l'historique des versions V132–V135 et comprend **26 onglets** : les 54 gauntlets, 219 calques physiquement présents, 324 tâches de fidélité individuelles, 28 scénarios QA supplémentaires, tableau de bord avec formules, provenance des sources et leurs limites. **0 modèle certifié 1:1** dans les calculs ; les statuts CI ne remplacent pas les preuves visuelles.

Les manquants de production qui restent réellement ouverts et doivent encore être menés avant la validation :
1. Mesurer de façon documentée chaque modèle sur des captures film/jeu/comic vérifiées (sous plusieurs angles) ; différencier les types de bras, charnières, câbles et commandes.
2. Produire les textures PNG / matériaux / décalages UV fidèles et non des motifs imaginés ; vérifier le rendu du rig dans les animations du personnage.
3. Qualifier en navigateur l'accessibilité, les poses, les animations des capots, l'audio, les performances des 54 assets, les variations tactiques, les deux vues et quatre missions.
4. Tester une vraie exportation/importation V13 entre appareils/profils, l'échec d'écriture et le conflit inter-onglets, ainsi que chaque récompense.
5. Revoir les droits sur les designs de franchise avant toute diffusion commerciale.

**Règle de livraison :** conserver la PR #42 en **draft**, ne pas faire de merge de la pile #29 → #34 → #36 → #37 → #38 → #40 → #42 et ne pas annoncer « fidèle 1:1 terminé » tant que ces vérifications ne sont pas prouvées.


## V136.1 — Raffinement des glyphes et contrôle de chaque calque

Le film original reste la référence, complétée par un [gros plan du gauntlet de 1987](https://www.avpcentral.com/images/predator-technology/predator-wrist-gauntlet.jpg) (AvP Central). La géométrie de travail du Jungle Hunter a été revue : cinq rangées d'émissions rouges avec signes différenciés plutôt que cinq checkmarks identiques, davantage de rails, vis, reliefs et rayures sur la coque et le capot. Ce travail **ne constitue pas une retranscription exacte des glyphes** et ne permet pas encore d'écrire « fidèle 1:1 ».

La galerie `/gauntlet-qa-v136` dispose désormais d'un **inspecteur de calques** permettant de cacher et réafficher séparément l'avant-bras, la coque, le panneau de commandes, le capot et, sur le Jungle Hunter, la charnière, l'émetteur et le faisceau. Ces contrôles ne sont disponibles que dans l'outil de QA, sans conséquences sur le jeu ni sur la sauvegarde du personnage.

Le scénario Chromium `scripts/qa-gauntlet-browser-v136.mjs` vérifie maintenant l'isolation des sept calques Jungle Hunter et la disparition/restauration d'un des quatre calques d'un concept Yautja, avec capture d'écran de la galerie. Il faut **consulter la conclusion du run exact** après chaque modification ; une capture prouve le rendu d'un navigateur sur un appareil, pas la cohérence de tous les GPU ni la fidélité cinématographique.

Les principales étapes restent : vues film face/côté/dessus, proportions et textures à mesurer, animations 1:1 des capots sur rig, homologation artistique par personnage, et revue des droits d'utilisation.
