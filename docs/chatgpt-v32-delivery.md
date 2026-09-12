# Reprise des discussions — V32

Cette livraison poursuit THE PIT à partir des discussions disponibles localement. Elle ne clôture pas toutes les conversations du projet et ne prétend pas avoir relu un dossier ChatGPT privé inaccessible. Le rapprochement détaillé est conservé dans [le backlog V32](pit-v32-animation-backlog.md).

## Animations réellement livrées

Jungle Hunter et City Hunter disposent chacun de l'attente et de l'attaque légère debout, dessinées dans les deux orientations. Quatre nouvelles planches OpenAI contiennent 32 dessins distincts : huit séquences orientées, décomposées en 16 clips de phase. Les phases de l'attaque suivent les ticks du moteur. Les rectangles et pivots sont individuels, sans grille forcée, miroir ou déformation.

Les sources sont préservées octet pour octet dans `art-source/v32/pit-animations`. La clé magenta explicitement déclarée est retirée seulement dans le Canvas privé du runtime. Le rapport [de couverture](pit-v32-animation-coverage.json) vérifie les pixels des vrais fichiers, les bords, l'alpha obtenu, les dessins distincts et la résolution par le moteur.

Une première sortie avec damier peint et une version City portant des disques surnuméraires ont été écartées. City a été corrigé avec OpenAI puis revu. Le brouillon de marche Jungle reste exclu : l'alternance des jambes n'est pas suffisamment convaincante. L'examen numérique ne certifie ni une anatomie parfaite ni une fidélité officielle 1:1.

Quand l'action manque encore, ces deux chasseurs tiennent le premier dessin d'attente de la bonne orientation (`sprite-sheet-hold`). Cette pose évite un changement brusque d'apparence mais ne compte jamais comme animation. Les douze autres combattants conservent leurs illustrations bitmap antérieures.

## Arènes et parallaxe

Les huit arènes jouables emploient maintenant six plans bitmap P0–P5. Les arrière-plans, accessoires, trophées, sols et premiers plans sont indépendants et réemploient les images existantes du projet. Le sol suit exactement les coordonnées du combat ; les autres plans ont leurs propres facteurs de parallaxe. Le premier plan s'atténue près des deux combattants. Aucun de ces accessoires ne modifie les collisions ou les règles de combat.

La caméra inclut les armes et toutes les cellules validées avant même leur chargement. Le chargement par arène et par combattant est annulable. Les états de chargement et d'animation sont observables dans l'interface et les attributs de recette.

Les 92 autres arènes restent des concepts, avec leurs kits spécifiques et transitions à produire. Le présent lot ne crée pas cent niveaux jouables. Les 264 lignes historiques représentent un inventaire de production/recherche, et non 264 clips ni 264 individus canoniques distincts.

## Qualification locale

- Compilation web : réussie.
- Suite complète : 1 124 tests réussis, zéro échec, zéro test ignoré.
- ESLint et TypeScript globaux : réussis.
- Audit des dépendances de production : zéro vulnérabilité signalée.
- Recette Chrome du véritable `PitCanvas` : huit arènes, nouveaux sprites, caméra, contraste renforcé et mobile sans débordement ; zéro erreur JavaScript et zéro ressource manquante.
- Recette de composition : huit arènes à cinq cadrages, six plans présents pour chaque scène.

Le runtime qualifié est le commit `db6a1d4bffbdbc1a75a31ad42313d280b7715a4d`. La publication et le paquet Windows ont maintenant réussi. Ces contrôles ne certifient pas les performances sur tout matériel, une manette physique, un jeu commercial achevé ou les droits d'exploitation de la franchise.


## Publication et portable Windows

Vercel a publié le commit qualifié en production avec le déploiement `dpl_8Gz81knwfZSwQbCaRJj4rkpZHNVu`, état `READY`. La recette du [site public](https://yautja-la-longue-chasse.vercel.app) a réussi le 12 septembre 2026 à 17:58:12 UTC : Jungle et City animés simultanément au repos, salle des trophées en six plans, mobile sans débordement, quatre PNG servis en HTTP 200, zéro erreur JavaScript et zéro requête en échec. Le mannequin doit être explicitement réglé sur Immobile pour contrôler son attente ; la garde alternée par défaut utilise correctement une pose tenue. La recette est reproductible avec `node scripts/verify-pit-v32.mjs` tant que la production porte V32.

Le portable Windows 1.0.32/V32 a été construit sur C: après un manque d'espace dans l'ancienne sortie D:. Aucun ancien paquet ni source n'a été supprimé. Le ZIP se trouve dans `work/v32-pc/tmp/desktop-release/v32/Yautja-La-Longue-Chasse-PC-V32.zip` : 473 220 007 octets, 77 entrées, SHA-256 `4d6fd2e29b0d413168a0c4663487cffa01129889501259e1ff2170611cda79ce`.

La recette de l'EXE a réussi à 17:59:56 UTC : démarrage hors ligne avec isolation du renderer, export natif, interactions Homeworld/Justice, THE PIT avec Jungle animé et six plans, chasse Oseris suspendue, sauvegarde et restauration après redémarrage. Le contrôle ASAR vérifie les 2 138 entrées, les quatre nouveaux PNG et l'absence des sources privées. Le digest des sources de ce checkout est `3784feb40fea5a38cbb7d1eb5c87090f3987817efcf0c8b7bb231f18854fdd2b` ; les différences de fins de ligne entre checkouts expliquent un digest local distinct à commit identique.

La fenêtre Electron de recette est masquée et utilise une horloge contrôlée. Sa capture de compositeur peut garder l'écran précédent ; elle n'est pas utilisée comme preuve graphique du combat. Les captures Chrome du véritable PitCanvas et des 32 dessins complètent les assertions fonctionnelles PC. Quelques pixels de frange magenta subsistent sur certains contours fins ; ce détourage reste perfectible et la revue ne certifie pas une fidélité 1:1.

Preuves suivies : [publication](v32-public-release.json), [recette publique](v32-public-browser-qa.json), [poses Canvas](pit-v32-poses-browser-qa.json), [recette PC](desktop-v32-qa.json), [archive PC](desktop-v32-package-qa.json).

La recette des commandes réelles a également réussi : quatre attaques légères au clavier, Jungle et City chacun dans les deux sens, avec anticipation/contact/récupération ; quatre déplacements avec une pose tenue et le bon statut. Voir [la preuve de jeu](pit-v32-live-animation-qa.json). La comparaison des deux empreintes de checkout trouve 87 fichiers texte avec des fins de ligne différentes, et aucune différence au-delà de CRLF/LF.
