# Scar BODY : art source V100

Ce lot conserve l’apparence BODY historique de Scar, `runtime-default`. Le texte source exact vient de l’extraction versionnée `docs/v56-excel-priorities.json` et du plan `app/game/data/pitWorkbookAnimationPlanV100.json`. Le classeur privé original n’est pas présent. Les durées proposées à 60 Hz sont des durées, pas un nombre de dessins.

Le manifeste `native-admission.json` livre le lot d’origine produit par `animation_source_v100` : **22 pages natives, 22 séquences directionnelles pour 11 gestes source, 77 dessins d’action distincts et 17 dessins de calibration hors animation**. Ces comptes sont propres aux 33 originaux, 33 fiches d’intake et 33 prompts du dossier `intake` direct. Ils excluent les spéciaux/présentations, le V34 historique et le remplacement 5H produit ensuite par root/release. La préparation gauche 2H partage une seule garde basse déjà dessinée pour 2L ; elle ne gonfle pas le compte de dessins.

Le lecteur utilise désormais pour **5H/F7 deux pages alpha natives externes à ce lot, soit huit nouveaux dessins d’action, quatre par sens**, produits par root/release puis admis par le moteur. Leur provenance, leurs trois tentatives archivées dont une refusée et les revues sont conservées dans `heavy-alpha/intake/handoff.json` ; les mesures finales des deux pages admises et leurs appuis figurent dans `heavy-alpha/intake/reference-and-foot-review.json`. Ces huit dessins ne s’ajoutent pas aux comptes propres du paragraphe précédent. Les douze gestes D:O disposent d’images dans les deux sens ; cette disponibilité artistique ne crée aucune mécanique.

L’ancien recours du lecteur à `scar-heavy-v34.png` reste documenté comme historique. Ses huit dessins préexistants ne sont plus le fallback 5H du lecteur. **La page V34 et les phases lourdes du duel restent intactes** : son SHA-256 demeure `3bd289a8ddcb5dfd483f4e5dc5eaaf028b5dca02c565d1cb85f54bfbf5e498e3`. Le remplacement ne déclare aucun `combatClipIds` et n’établit aucune mécanique pour le coup de duel nommé « Ascension au plasma ».

| Cellule | Geste | Originaux utilisés |
| --- | --- | --- |
| D7 | 5L | 002, deux sens |
| E7 | 5M | 009 droite, 010 gauche |
| F7 | 5H | Lot externe `heavy-alpha` : 001 droite et 003 gauche ; ancien lecteur V34 conservé dans l’historique, duel V34 inchangé |
| G7 | 2L | 005, deux sens |
| H7 | 2M | 011 droite, 012 gauche ; contact ancré sur le pied porteur |
| I7 | 2H | 013 droite ; 005/3 partagé → 014/2 → 014/3 gauche |
| J7 | jL | 015 droite, 025 gauche |
| K7 | jM | 029 droite, 026 gauche |
| L7 | jH | 019 droite ; 032/1 → 027/2 → 027/3 gauche |
| M7 | TH_F | 023 droite ; 030/0–4 → 033/0 gauche |
| N7 | TH_B | 024 droite, 031 gauche |
| O7 | 6M | 022 droite, 028 gauche |

Les projections sont des **études avec mannequin gris dessiné dans les scènes**, sans adversaire réel indépendant synchronisé et avec `combatBindings: []`. Elles montrent six étapes par sens. La prise de lance est occluse à l’étape 023/1 : le trajet de projection est lisible, mais aucune manipulation ou mise au rangement de l’arme n’est certifiée.

Les 33 tentatives et références restent dans `intake`, avec prompts, empreintes et décisions. La référence gauche isolée 021 n’est pas une animation. Les pages partiellement refusées 014, 027 et 030 conservent leurs pixels d’origine ; seuls les rectangles explicitement revus sont admis. Aucune découpe ne masque un bord coupé, aucun miroir ni rotation n’a été appliqué, et aucun pixel n’a été nettoyé ou réécrit. Les 22 copies publiques sont identiques octet pour octet aux originaux.

Chaque page conserve une seule hauteur corporelle mesurée sur une posture debout. Les pivots des poses aériennes viennent du repère de bassin/ceinture et de sa distance aux semelles debout ; le runtime conserve sa trajectoire de saut. Les pivots de projection ne mesurent que les appuis de Scar, sans prendre les pieds du mannequin. Les rectangles et pivots sont des métadonnées ; la peinture reste native.

`source-integrity-review.json` prouve les 33 originaux propres, les 22 copies publiques, les rectangles et l’absence de pixels sur les bords des cellules admises. Sa section `countsScope` conserve les comptes propres ; `external5HReaderReplacement` vérifie séparément la source F7, les SHA, les copies exactes et les huit dessins externes du remplacement. La revue indépendante `qa_v100` approuve les parties livrées. Les admissions de lecture, les raccordements de phases réelles et la QA finale du rendu restent dans le registre central et les preuves du moteur ; les statuts de ce dossier ne remplacent pas une revue après gel du build. Les spéciaux P:U et les présentations C:J appartiennent à un lot parallèle.
