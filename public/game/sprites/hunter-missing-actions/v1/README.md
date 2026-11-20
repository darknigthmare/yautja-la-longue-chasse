# Yautja — animations manquantes, lot 1

**14 actions · 304 dessins source · 19 planches de 16 images.** Les coups, défenses et mouvements ci-dessous complètent le lot de postures V2.1, dont les 288 dessins et 330 PNG restent inchangés.

| Mouvement | Lecture | Dessins retenus |
|---|---|---:|
| Frappe légère I | Action ponctuelle | 16 |
| Frappe légère II | Action ponctuelle | 16 |
| Fin de combo | Action ponctuelle | 32 |
| Frappe lourde | Action ponctuelle | 32 |
| Frappe aérienne | Action ponctuelle | 32 |
| Brise-garde | Action ponctuelle | 32 |
| Parade | Action ponctuelle | 16 |
| Esquive | Action ponctuelle | 16 |
| Course avant | Boucle | 16 |
| Course arrière | Boucle | 16 |
| Ascension | Boucle | 16 |
| Descente | Boucle | 16 |
| Saut | Action ponctuelle | 32 |
| Réception | Action ponctuelle | 16 |
| **Total** | **10 actions ponctuelles, 4 boucles** | **304** |

## Voir et utiliser le lot

- Le lecteur autonome complet, avec toutes les images intégrées, est fourni dans le ZIP téléchargeable. Pour le régénérer depuis la racine du dépôt : `node art-source/hunter-missing-actions/v1/build_standalone.cjs public/game/sprites/hunter-missing-actions/v1`.
- [Lecteur relatif](preview.html) — conserver les sous-dossiers de PNG à côté du fichier.
- [Vidéo des 14 actions](Yautja_Animations_Manquantes_V1.mp4)
- [Planche de contact](Yautja_Animations_Manquantes_V1_Contact.png)
- [Réserves artistiques et limites de couverture](ART_REVIEW_LIMITATIONS.md)
- [Revue consolidée des sources](qa/CONSOLIDATED_REVIEW.md)
- [Rapport de vérification du pack](verification_report.json) et [inventaire du pack téléchargeable](package_file_index.json)

L’[inventaire du dépôt](repository_file_index.json) recense les chemins réels de cette livraison dans `public/`, `art-source/` et `docs/`, avec leur taille et leur SHA-256. L’inventaire du pack téléchargeable conserve sa disposition autonome d’origine.

Archive livrée : `YAUTJA_Chasse_Combat_Locomotion_304_Sprites_V1.zip` — **108 971 322 octets**, **425 fichiers**. SHA-256 : `ed3bf7ea38e0b16d8f4deec7c3f1de2dd1cb0f33922b53d925efd4b7db5ec7ac`. Le HTML autonome de 36 003 985 octets reste dans cette archive ; le connecteur GitHub rejette les requêtes dépassant 16 Mio. Le lecteur relatif, tous les atlas et le générateur du lecteur autonome sont présents dans le dépôt.

Les **342 PNG d’art** comprennent 304 sprites individuels, 19 planches sources et 19 atlas d’import protégés. La planche de contact est un PNG de revue supplémentaire, compté séparément. Les six tentatives remplacées restent documentées dans les prompts et les preuves de revue ; leurs images ne font pas partie du lot.

Les fichiers sont en **draft**, orientés à droite, pour une identité de référence. Les 16 images/s du lecteur servent à examiner les dessins. Les timings de Hunt en secondes sont conservés dans le mapping ; ce lot ne remplace pas le rig actif et ne modifie aucune fenêtre de combat. Les raccords de certaines pages et des courses restent à affiner, comme indiqué dans la revue.

## Vérifications du lot livré

Les 304 PNG individuels ont **304 hashes RGBA décodés distincts**. Les comparaisons couvrent 29 973 184 pixels RGBA et 768 512 pixels de garde transparents. L’examen des rectangles source réels, avant padding, trouve zéro cellule au bord alpha ≥16 ; 24 cellules dans 8 planches conservent de faibles traces alpha >2, documentées dans la revue.

Les 14 manifestes passent le contrat réel du jeu et restent bloqués par son statut artistique draft. Le JavaScript effectif des deux lecteurs a été exécuté dans un environnement DOM simulé : 10 actions ponctuelles, 4 boucles et 5 actions à deux pages. Les positions sont contrôlées dans des panneaux de 420 × 420 ; les 324 PNG déjà exportés avant la dernière page sont restés identiques octet pour octet.

La vidéo couvre les 304 dessins en 12,5 secondes : 200 images vidéo à 16 images/s, 1260 × 562. La planche de contact de 1782 × 2170 présente une image par action. Le lecteur autonome intègre les 19 atlas (36 003 985 octets) et ne demande aucune ressource externe. Ces contrôles ne remplacent pas la revue artistique ni un essai en jeu.

## Registre d’actions

`sources.json` décrit les fichiers réellement générés : chaque `clip` contient une planche 4 × 4, soit 16 dessins. Le nombre de fichiers source est contrôlé avant l’export. Aucune image de remplacement n’est créée si une planche manque.

`ingest_sources.cjs` accepte un registre explicite des générations retenues, copie uniquement ces fichiers sans changer leurs octets et enregistre le nom de génération, le SHA-256 et le prompt exact. Il conserve le nombre total de clips prévu lorsque certaines générations sont encore en attente. Un fichier simplement présent dans le dossier des générations n’est jamais choisi automatiquement. Le mapping d’audit facultatif ajoute les prédicats moteur, les timings en secondes et leurs sources aux actions du registre.

Une action référence explicitement ses phases et leurs clips :

- `one-shot` : une phase `action`, par exemple 16 dessins ou deux planches de 16 dessins consécutifs. La lecture s’arrête sur la dernière image.
- `loop` : une phase `loop`. L’ordre est avant par défaut ; un éventuel ping-pong doit être demandé explicitement.
- `sustained` : phases `enter`, `loop` et `exit`. Une sortie inversée doit être déclarée explicitement avec `order: "reverse"` ; aucune phase n’est inventée.

Les identifiants des clips sont libres ; le programme ne déduit pas les phases depuis leurs suffixes. Une action à 32 dessins reste un clip natif unique, dont les références passent de la première à la seconde page.

## Cadence et jeu

Les 16 images par seconde de ce lot servent à examiner les dessins. Les paramètres du combat Hunt, exprimés en secondes, sont conservés séparément dans `gameplayTiming`. Les manifestes natifs portent le statut `draft` ; leur index indique `unretimed-review`, `rosterBinding: null` et l’absence de modification du rythme de jeu. Le lot ne remplace aucun branchement de combat.

L’orientation est droite uniquement. Le mirroring d’un équipement asymétrique nécessite sa propre revue. Le lot combat représente la variante aux lames de poignet. L’atterrissage est une proposition de présentation non bloquante associable à l’évènement de contact ; ce n’est pas un nouvel état de simulation.

## Pixels et racines

Le programme lit les pixels RGBA de chaque planche puis découpe les 16 cellules selon les limites arrondies de la grille. Une planche de 1254 × 1254 donne des cellules de 314 × 314 avec au plus un pixel de padding transparent à droite ou en bas. Chaque PNG décodé est comparé aux pixels prévus. Les atlas d’import ajoutent deux pixels entièrement transparents de chaque côté et conservent les mêmes pixels au centre de chaque cellule : cellules de 318 × 318, atlas de 1272 × 1272 pour ce format source.

Le mode `fixed-root` garde la racine à une position fixe de la cellule et conserve les déplacements dessinés. Il s’agit d’une hypothèse de cadrage, sans mesure automatique du pied ou du bassin. Les mouvements aériens peuvent employer une racine de cadrage au niveau du bassin. Le mode `measured` exige 16 pivots documentés et le SHA-256 exact de la planche correspondante dans `anchorMeasurementsPath` ; une source différente invalide ces données.

Une calibration de page, identifiée par `constant-page-calibration`, utilise 16 pivots identiques pour translater une partie B à son raccord avec A. `apply_page_calibrations.cjs` applique uniquement des reçus QA explicitement retenus et vérifie le SHA source. Cette correction concerne l’origine de la page : elle conserve les pas, le mouvement interne et l’échelle dessinée. Le manifeste conserve le reçu, le décalage et le SHA de la page de référence. Le lecteur et le manifeste natif utilisent la même donnée ; la vidéo arrondit uniquement la position de composition au pixel le plus proche.

Les contrôles distinguent les pixels réellement transparents, les pixels visibles au seuil alpha 16 et les traces d’alpha très faible sur les bords. Les traces sont conservées. Les avertissements signalent les cellules à examiner sans accorder d’approbation artistique.

## Exécution

Node.js, `sharp` et, pour la vidéo, `ffmpeg` / `ffprobe` sont nécessaires. `sharp` peut être résolu via `CODEX_PRIMARY_RUNTIME_NODE_MODULES`. Les scripts n’installent rien et n’utilisent aucun accès réseau.

```sh
node ingest_sources.cjs /chemin/registre_final.json . /chemin/hunt_animation_state_map.json
node apply_page_calibrations.cjs /chemin/page-calibrations.json .
node export_sprites.cjs sources.json .
node build_runtime_manifests.cjs .
node check_pack.cjs .
node check_preview_behavior.cjs .
node render_preview.cjs .
node build_standalone.cjs .
node check_preview_behavior.cjs . Yautja_Animations_Manquantes_V1_Apercu.html
node render_contact_sheet.cjs .
```

Depuis la racine du dépôt, donner explicitement les chemins des sources et de la sortie :

```sh
node art-source/hunter-missing-actions/v1/export_sprites.cjs art-source/hunter-missing-actions/v1/sources.json public/game/sprites/hunter-missing-actions/v1
node --experimental-strip-types art-source/hunter-missing-actions/v1/check_runtime_manifests.mjs public/game/sprites/hunter-missing-actions/v1
```

Les chemins des PNG dans le registre sont relatifs au fichier `sources.json`. Dans le dossier livré autonome, ils commencent par `atlases/` ; dans le registre du dépôt, ils pointent vers `../../../public/game/sprites/hunter-missing-actions/v1/atlases/`. Le `publicBase` natif est `/game/sprites/hunter-missing-actions/v1`.

`extract_endpoint_refs.cjs` peut extraire mécaniquement les première et dernière cellules d’une planche vers un dossier de référence séparé, avec rectangles et SHA documentés. Ces crops servent aux raccords de génération ou à leur examen ; ils ne remplacent jamais les cellules complètes du pack.

`preview.html` utilise uniquement des fichiers relatifs. Il propose le choix du mouvement, les phases effectivement disponibles, la lecture/pause, le retour au début et la sélection d’une image. Les actions ponctuelles s’arrêtent à leur dernière cellule ; les boucles reviennent au début. La vidéo compose les fichiers source en dehors d’un navigateur, présente trois mouvements à la fois et conserve la dernière cellule lorsqu’une action est plus courte que ses voisines.

`build_standalone.cjs` exige que toutes les sources prévues soient présentes dans le manifeste. Il produit un second lecteur autonome en intégrant les atlas PNG d’origine sous forme de data URL, avec tout le JavaScript, les styles et les métadonnées dans le même HTML. Son rendu extrait chaque cellule à sa taille native et conserve les mêmes offsets que le lecteur relatif. Le contrôle comportemental vérifie les SHA des images intégrées, les rectangles, l’absence de redimensionnement et l’absence de requête d’image externe.

La planche de contact contient une image représentative par action, avec son identifiant de source. Elle permet de parcourir le lot ; les séquences complètes restent dans les lecteurs et le MP4. Les réserves artistiques documentées sont regroupées dans `ART_REVIEW_LIMITATIONS.md`.

`check_pack.cjs` vérifie le contenu réel des PNG, les gardes transparentes, les SHA-256 et les références. `check_preview_behavior.cjs` exécute le JavaScript effectif du lecteur dans un environnement DOM simulé : ce contrôle ne remplace pas un essai dans un navigateur. `check_pipeline.cjs` utilise des fixtures temporaires, supprimées après le contrôle, pour vérifier les cas généraux du pipeline sans produire d’art de remplacement dans le lot livré.

Les exports, les contrôles de schéma et la vidéo ne constituent pas une validation de la continuité anatomique, des contacts, de l’identité du personnage ou du résultat en jeu. Les sources, les coordonnées et l’index restent en revue.
