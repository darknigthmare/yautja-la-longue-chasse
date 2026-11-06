# Audit indépendant des 46 paires de sprites de la flotte

**Résultat : PASS — 2026-11-06T05:12:57.601958+00:00**.

Cet audit contrôle les vrais fichiers du dépôt, leurs sélections et leurs origines. Il ne modifie aucun fichier du dépôt, ne retouche aucun pixel et ne lance aucun navigateur. Les six revues de source artistique précédentes restent distinctes de ce contrôle binaire.

## Résultat

Les **46 PNG et 46 WebP** couvrent exactement **6 familles et 46 vues**, soit **92 fichiers**. Aucun chemin attendu ne manque ; aucun PNG/WebP supplémentaire ne figure dans les deux répertoires contrôlés.

Chaque PNG est égal byte à byte au candidat retenu et à son original généré. Les empreintes et tailles correspondent aux calibrations, aux manifestes de sélection et aux export-reviews. Les six manifestes de génération copiés dans le dépôt sont également exacts.

Les **289,406,976 octets RGBA par côté** ont été comparés après décodage intégral : **0 pixel, 0 canal différent**. L’égalité comprend les RGB sous alpha nul, sans prémultiplication, tolérance, correction d’alpha, recadrage ni rééchantillonnage. Tous les fichiers sont RGBA **1536 × 1024**, avec une seule image. Les conteneurs WebP portent un flux **VP8L lossless**, sans flux VP8 avec perte ni animation.

| Famille | Vues | PNG sources, octets | WebP runtime, octets | RGBA |
| --- | ---: | ---: | ---: | --- |
| wolf-ship | 8 | 16,427,120 | 10,883,188 | Exact |
| avp-predator-mothership | 6 | 9,868,959 | 6,212,280 | Exact |
| avpr-scout-ship | 8 | 13,202,185 | 8,500,250 | Exact |
| feral-spaceship | 8 | 14,556,818 | 9,367,538 | Exact |
| fugitive-spaceship | 8 | 15,050,319 | 9,546,160 | Exact |
| upgrade-spaceship | 8 | 12,502,687 | 8,117,376 | Exact |

Total : **81,608,088 octets PNG**, **52,626,792 octets WebP**. Les 1779 vérifications du script n’ont relevé aucune discordance. Les fichiers lus ont été revérifiés identiques à la fin de l’audit.

## Affectations et rejets

- **Wolf** : `bank-dorsal-shallow` provient bien de `exec-c29c507c-c73d-46f3-b6f9-361ddb2e4b66.png`, initialement nommé deep ; `bank-dorsal` provient de `exec-c25ba19e-1c87-4420-b9ee-3aa9a4096872.png`, initialement nommé shallow. Les noms de génération, affectations et notes de permutation sont conservés. Les angles demandés ne sont pas présentés comme des mesures 3D.
- **Feral** : la dorsale retenue porte l’empreinte `083e7f4bd2bdcb646dd00a662ae9e5dfabfb77537a9aa9fc35c62741ac423f1c`. L’ancienne dorsale `0bf112a2ae81cbfa00ad62d57b526cada8f240d5fa900d14ca09d9d347bfdafe` reste exclue.
- **Scout, Feral et Upgrade** : les **11 tentatives explicitement cataloguées comme non sélectionnées** (2 + 1 + 8) ont été rehachées et comparées à la liste fermée des 46 sources : aucune n’est promue. Pour toutes les familles, l’égalité exacte avec la sélection finale exclut toute substitution par un autre essai.

## Alpha et portée

Les plages alpha constatées sont [(0, 254)] ; le maximum sur les bords est **3**. Les silhouettes à alpha > 16 restent à l’intérieur de chaque canevas. Les résidus faibles déjà présents sont transférés sans nettoyage, notamment le bord gauche de la ventrale légère Upgrade. Leur conservation fait partie de l’égalité intégrale.

Cette preuve établit la fidélité 1:1 du **transfert et de l’encodage des pixels sélectionnés**. Elle n’établit pas une fidélité canonique 1:1, une reconstruction 3D exacte, une validation artistique humaine ou la qualité des transitions natives. Les limites de pose, panneaux, éclairement et ancres décrites dans les six revues restent applicables.

Les fichiers applicatifs, la correction SVG et le manifeste final de flotte ne sont pas qualifiés par ce reçu. Aucune publication ni nouvelle exécution Pods n’a été effectuée. Le HEAD du checkout local est enregistré comme contexte technique uniquement, et non comme identité de publication distante.

## Preuves reproductibles

- Rapport détaillé : `/workspace/scratch/0c1fa1359efb/qa/cinematic-sprite-expansion-20261106/fleet-binary-audit/independent-fleet-binary-audit.json` — 133506 octets, SHA-256 `4430e26cc0eb394a876886aa68c8f079ff932ca7784a68dc47524dc551b1b076`.
- Script de lecture : `/workspace/scratch/0c1fa1359efb/qa/cinematic-sprite-expansion-20261106/fleet-binary-audit/verify_exports.py` — SHA-256 `ec80f19a8f5bfc15e708bbbeb3840384251cd157ca9cfc3236742e802980ecae`.
- Commande exécutée : `python /workspace/scratch/0c1fa1359efb/qa/cinematic-sprite-expansion-20261106/fleet-binary-audit/verify_exports.py`.
- Décodage : Pillow 13.0.0, libwebp 1.6.0, NumPy 2.3.5. Le rapport conserve les SHA-256 de chaque original, candidat, PNG, WebP et tampon RGBA, ainsi que les six calibrations et export-reviews.
