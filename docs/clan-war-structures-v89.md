# Ouvrages et terrain local V89

## Statut

Lot appliqué après libération du disque et restauration exacte du modèle historique depuis HEAD. Les contrôles ciblés du modèle, des handlers du panneau et de compatibilité sont exécutés localement. Une partie réelle dans le navigateur, le build global et la publication restent des vérifications distinctes ; ce document ne les atteste pas.

Le périmètre est l’atelier d’ouvrages indépendant. Ses budgets, équipes équipées et droits de passage sont des hypothèses d’exercice. Aucun résultat de ce lot ne crédite une armée, une maison, un territoire, un stock, une bataille ou une sauvegarde de campagne.

## Source réellement lue

Classeur : `work-local/drive-import-20261007/downloads/Yautja_V6_Bible_Cumulative_et_Dialogues.xlsx`, SHA256 `87ad5d1a6eaf49f2908a4457ef3f97b8f34db481a24bbc121d2e924559b19183`.

Les lignes ont été lues directement dans les XML XLSX, sans exécuter de formule ou macro ni modifier le classeur. Les tables elles-mêmes sont des propositions de conception reconstituées ; leurs valeurs ne sont pas des statistiques canoniques de la franchise.

| Fiche | Cellules | Données utilisées |
| --- | --- | --- |
| Poste de veille S01 | Structures de guerre D6:J6 | Kit 6 RAV, entretien 1, deux tours, U02 ; position haute occupée, obstacle opaque, aucune vue à travers la roche. |
| Éclaireur de crête U02 | Unités de guerre D7:H7 et K7 | Un membre, 2 PC, recrutement 9, entretien 1, deux tours ; portée cinq cases. |
| Plateforme de tir S06 | Structures de guerre D11:J11 | Kit 10 RAV, entretien 1, deux tours, U13 ; angle et couvert directionnels, angle mort dessous, aucun tireur créé. |
| Tireurs au speargun U13 | Unités de guerre D18:H18 et K18 | Deux membres, 3 PC, recrutement 13, entretien 2, deux tours ; portée cinq cases. Les tirs, munitions et dommages restent hors de ce lot. |
| Pont de cordes S08 | Structures de guerre D13:J13 | Kit 14 RAV, entretien 2, trois tours, U12 ; trois ancrages physiques, deux rives repérées, pas de passage simultané du groupe entier. |
| Grimpeurs de piliers U12 | Unités de guerre D17:H17 | Deux membres, 3 PC, recrutement 12, entretien 2, deux tours. |
| Cache S03 et récupérateurs U19 | Structures de guerre D8:J8 ; Unités de guerre D24:H24 | Cache finie de vingt RAV, portage historique exclusivement U19, dépôt et consommation de lots physiquement acheminés. Aucune ration nouvelle. |
| Traverse L61 | Passages de Korthas C66:K66 | K01–K08, traverse préparée, capacité 8 PC, bidirectionnelle, aucun transport RAV. Inspection des deux extrémités et pose d’une ligne ou d’un pont adapté. |
| R05 et R19 | Règles de guerre C10:D10 et C24:D24 | Renseignement daté et incertain, kit livré, supports posés, vrais opérateurs ; un poste vide n’observe pas. |

La source embarquée existe déjà. Aucune ligne source n’est réécrite pour rendre le lot plus facile.

## Veille et couvert : un terrain visible, avec des limites mesurables

Le panneau utilise un terrain local fixe, avec un point au sol, un poste haut, une plateforme, quatre repères géométriques et un obstacle rectangulaire. Le même rectangle intervient dans le calcul d’intersection et dans le SVG. Toucher un bord opaque coupe également le rayon.

Trois hypothèses sont proposées : écran bas, roche opaque, approche dégagée. Ces paramètres changent un terrain de simulation ; ils ne prétendent pas déplacer un rocher du monde réel. L’échelle de dessin de 100 unités par case, l’angle de plateforme de 60°, la hauteur et les dimensions de décor sont des conventions visibles du prototype. Le classeur ne fournit pas ces mesures.

S01 peut lire au-dessus de l’écran bas depuis sa position élevée. La même cible reste invisible depuis le point au sol. Une roche haute coupe les deux rayons. Le poste exige son vrai éclaireur, installé et présent, ainsi que son entretien accessible localement.

S06 oriente son secteur vers l’est ou l’ouest. Le repère derrière le poste sort du secteur ; le repère placé sous la plateforme reste dans l’angle mort, quelle que soit l’orientation. Le couvert directionnel est un résultat qualitatif de cette géométrie. Aucun pourcentage de défense, tir, munition, dommage ou ennemi absent du modèle n’est inventé.

Le bouton de relevé conserve le repère, l’équipe, les identifiants d’opérateur, le profil, l’orientation et le tour. Il coûte un tour global et l’entretien existant. Le même relevé géométrique ne peut pas être rejoué pour rafraîchir gratuitement sa date. Les changements de profil ne changent pas un ancien reçu. L’âge affiché continue à augmenter ; la situation cachée depuis est inconnue. Ces repères restent locaux à l’exercice et ne reconnaissent aucun territoire distant ni ennemi de campagne. Ils n’accordent aucune XP.

Les props du jeu déjà présents servent au décor : `rampart-watch.png`, `ruin-platform.png`, `tree-trunk.png`, `root-platform.png` et `foreground-ferns.png`. Leur adaptation graphique n’est pas une preuve de nouvelle architecture canonique.

## Pont : un kit, trois pièces, deux rives et les mêmes personnes

S08 cible seulement une traverse préparée déjà documentée dans le graphe. Ses deux rives doivent être reconnues avant réservation. Réserver engage les 14 RAV une seule fois au dépôt ; le kit garde son identité et doit être réellement chargé, acheminé et livré à sa rive de chantier.

Le kit contient exactement trois composants identifiés par `kit:…:anchor:1/2/3`. Les deux premiers se posent à la rive de chantier, le troisième à la rive opposée. Un chargement retire une seule pièce du kit disponible et l’attribue à une seule équipe U12 complète. Aucun quatrième ancrage, duplication de pièce, second kit ou patient simultané n’est accepté.

U12 ne porte jamais un lot RAV : la restriction historique du portage à U19 reste intacte. Pour travailler à la rive éloignée, une vraie cache S03 doit y être construite et alimentée par des récupérateurs présents, avec les rations survivant à leur trajet. La pièce emprunte seulement les routes compatibles RAV ; le pont encore inachevé ne la transporte pas à sa propre extrémité. Une largeur ou un tonnage supplémentaire n’est pas inventé.

Chaque pose prend un tour de travaux réel, conserve son emplacement, ses deux opérateurs et la date de chargement, et consomme le ravitaillement local. Le troisième appui ne peut pas être posé depuis la première rive ou sans ration disponible sur place. Les trois poses constituent les trois tours du chantier source. Une attente et le bouton de travaux générique ne peuvent pas remplacer ces gestes.

Après la troisième pose, le pont est installé mais sans opérateurs à sa rive de chantier : les grimpeurs sont encore sur l’autre rive. Ils doivent revenir par un vrai chemin, puis être affectés au pont. La mise en service ne rouvre aucun lien fermé et ne remplace pas un chantier de réparation.

## Franchissement individuel et ravitaillement

Une autre équipe complète et libre peut préparer un passage. Le pont garde ses deux opérateurs sur place et son entretien local. La capacité PC provient du lien. Ce lot ne transporte par le pont ni kit, ni lot RAV, ni patient.

Chaque membre franchit par un bouton individuel. Les positions sont enregistrées séparément. Tant que tout le groupe n’est pas arrivé, son point de rassemblement reste la rive de départ, et le panneau affiche explicitement les personnes présentes sur chacune des deux rives.

Ces gestes sont les sous-étapes d’un seul passage global. Le front est verrouillé aux autres ordres pendant ces sous-étapes ; seul le changement d’hypothèse de fermeture et les gestes individuels de ce même passage restent permis. Le temps global, la fatigue de marche et l’entretien sont appliqués une seule fois à l’arrivée de tous les membres ou à la fin d’un retour. Cela conserve la cadence antérieure d’un passage égal à un tour et évite d’inventer des ratios de ravitaillement par personne absents du classeur.

Fermer le lien pendant le passage garde chaque personne sur sa rive et bloque le geste suivant. Réouvrir ne termine rien automatiquement. Un repli exige le retour individuel de chaque personne déjà passée. Dès le premier retour, les nouveaux départs sont bloqués jusqu’à la fin du repli. Annuler sans geste n’avance aucun tour ; annuler après un premier geste ne remplace pas les retours.

À l’arrivée finale, le ravitaillement normal relit la vraie destination. Une équipe arrivée à K08 sans cache reste rationnée ; elle ne consomme pas le dépôt K01 à travers L61, qui interdit les RAV. L’équipe d’opérateurs et le pont continuent à payer leur entretien à leur propre rive. Les personnes, leurs identifiants et leur XP ne sont jamais remplacés.

## Reprises V87/V88

La clé historique `rulesKey` conserve exactement ses cinq définitions d’origine. L’extension facultative `terrain` version 1 apparaît seulement à la première réservation S01/S06/S08. Elle lie les lignes sources supplémentaires et la version de géométrie, avec configurations, trajets, composants, ancrages, relevés et passages individuels.

Les anciens fichiers ne reçoivent ni nouvelle extension ni état supposé à l’import ou à l’export. La validation additionnelle ne s’exécute que lorsque l’extension existe. Une source qui manque les trois nouvelles structures reste compatible avec un ancien carnet valide ; un carnet V89 dépendant de ces données est refusé.

La validation refuse les champs étrangers de propriété/campagne, composants copiés, slots invalides, rives incohérentes, repères occultés déclarés visibles, trajets ne correspondant pas aux positions, opérateurs incomplets et passages simultanés inventés. Elle vérifie une cohérence d’exercice ; elle n’authentifie pas cryptographiquement un fichier modifiable par son utilisateur.

Les trois vrais carnets de jeu V88 sont comparés intégralement, en lecture seule :

- `relay-played-checkpoint.json` : 109 976 octets, tour 11.
- `hoist-played-checkpoint.json` : 106 715 octets, tour 9.
- `hoist-delivered-checkpoint.json` : 112 453 octets, tour 14.

Ils sont dans `work-local/v88/qa/`. Aucun autre JSON de QA ou cloud n’est lu par le test de compatibilité et aucun fichier de reprise n’est réécrit.

## Vérification locale

Le nouveau fichier de test comprend douze contrôles de source/modèle/reprises et deux parcours des vrais handlers du panneau avec un ordonnanceur de hooks transparent. Les assertions portent sur provenance, prix, conservation des comptes/identités/XP, géométrie, présence, pannes locales, cache réellement alimentée, composants réellement déplacés, cadence, fermetures, repli et checkpoints historiques. Un carnet vide ne peut pas recevoir artificiellement l’extension ; deux traversées ne peuvent pas consommer le même tour global ; un passage actif ne peut pas précéder un passage ultérieur dans l’historique.

Ces tests ne prouvent pas la mise en page, le téléchargement navigateur, une partie réelle ou une publication. Les contrôles ciblés couvrent V89 et les lots historiques d’ouvrages, logistique, extraction, infrastructure et reprise UI. Les assertions historiques de nombre sont adaptées à onze définitions, ou retirent explicitement les trois nouvelles fiches pour conserver leur contexte antérieur.

Les preuves qui lisent le XLSX et les trois carnets joués sont explicitement ignorées sur un clone où les fichiers privés `work-local` sont absents. En audit local, définir `YAUTJA_REQUIRE_LOCAL_CLAN_PROOFS=1` rend leur présence obligatoire et interdit ce report. Aucun des trois carnets réels n’est copié dans Git.

Résultat local du 8 octobre 2026 : 71 tests passent sur sept lots, dont 14 V89, sans échec ni test ignoré en mode preuves obligatoires. Le typecheck strict ciblé de `clanWarWorksV6.ts` et `ClanWarWorksV6.tsx`, ainsi que le lint des fichiers modifiés, passent. `git diff --check` sur les fichiers suivis du lot passe également.

L’API additive est figée : `terrain?`, les types `WarTerrainV89` / `WarBridgeTransitV89`, le terrain `WAR_TERRAIN_GEOMETRY_V89`, les lecteurs `evaluateWarTerrainV89`, `warBridgeActiveV89`, `warBridgeMemberSiteV89` et le test de rayon `warTerrainRayBlockedV89`. Les nouveaux ordres sont `terrain-hypothesis`, `orient-platform`, `scan-terrain`, `load-anchor`, `place-anchor`, `begin-bridge`, `cross-bridge`, `return-bridge` et `cancel-bridge`. Le format et la version du carnet V87 sont inchangés ; aucun champ de campagne n’est ajouté.

Parcours navigateur restant à effectuer : démarrer avec U19 et 120 RAV locaux ; reconnaître K01, aller à K08 via K02 et reconnaître la seconde rive ; réserver S03 à K08, acheminer son kit depuis K01 via K02 et accomplir ses deux tours ; libérer U19, ramener vingt RAV depuis K01, les déposer dans cette cache et revenir à K01 via K02. Former U12 en deux tours, livrer S08 à K01 sur L61, poser deux appuis à K01 puis acheminer le troisième via K02 jusqu’à K08. Revenir avec U12 à K01, l’affecter au pont et faire traverser les membres U19 individuellement. Exporter, fermer L61 et reprendre à mi-franchissement avant de finir. Pour S01/S06, contrôler le rayon derrière l’écran bas, la roche opaque, le secteur orienté et l’angle mort sous la plateforme sur desktop et mobile.

Les sept autres structures restent hors de ce lot : S09/S18 faute de vrai transport, S10 faute de montures identifiées, S11 faute de consommables, S13 faute d’énergie/exposition, S14 faute de duel avec signataires, S15 faute d’enregistrements sonores situés. S04 conserve aussi sa limite historique : l’atelier installé ne répare pas un passage sans un vrai chantier de pièces et de réparation.
