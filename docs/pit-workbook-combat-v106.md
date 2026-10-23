# Combat Feral / Scar V106

La recette explicite `workbook-v106` utilise le snapshot et moteur de replay 14. Elle s'applique aux BODY par défaut admis de Feral et Scar. Les variantes conservent leur recette. Les recettes historiques 11, `workbook-v104` (12) et `workbook-v105` (13) restent disponibles.

| Action | Commande source / bouton accessible | Startup / actif / récupération | Coût | Budget de dégâts de base |
| --- | --- | --- | --- | --- |
| Feral S1 | 236+S / `projectile` | 23 / 6 / 30 | 30 % | 115 : 39 + 38 + 38 |
| Feral S2 | 214+S / `shield` | 9 / 18 / 25 | 15 % | 70 |
| Scar S3 | 623+S / `projectile` | 20 / 3 / 28 | 25 % | 105 |
| Feral SUPER | 236236+S / `super` | 24 / 8 / 48 | 100 % | 280 : 40 + 3 × 80 |
| Scar SUPER | 236236+S / `super` | 24 / 8 / 48 | 100 % | 280 : 80 + 200 |

Ces budgets précèdent les modificateurs existants de puissance, combo et instinct. La jauge est débitée une seule fois au lancement de l'action. Les délais restent ceux des cellules Excel originales ; les répartitions de dégâts et volumes de collision sont des adaptations Pit déclarées.

Les commandes 236/623 livrées pour les contacts existants, le 22+S du contre Scar et les raccourcis équipement/contact/contre restent accessibles. Les motions utilisent les directions relatives au regard, une fenêtre de 24 ticks et au plus 6 ticks entre le dernier mouvement et S. Un changement de regard, l'air, la garde, une action ou un bouton consomme l'historique. Maintenir bas ne fabrique pas un second bas. La double séquence 236236 a priorité sur 236. S seul ne déclenche aucun tir hérité dans cette recette.

## Entités et contact réel

Feral S1 libère les trois carreaux aux frames d'action 23, 25 et 27. Le premier départ réserve trois IDs et acquiert un seul point immuable, commun aux trois tirs. Aucun suivi ultérieur de la victime n'est effectué. Une interruption annule les départs restants ; les projectiles déjà partis continuent leur vol physique. Le masque détermine le guidage selon les règles existantes. L'origine native possède sa propre calibration gauche/droite ; le réemploi exact d'art admis est détaillé dans les preuves source V106.

Scar S3 émet un seul plasma à la frame 20 depuis son canon natif. Son halo de rendu reste de 40 × 40 ; le cœur physique mesure 24 × 12. Le tir est haut, passe au-dessus de la posture accroupie admise et accepte la garde haute sans chip ni renversement implicite de l'ancienne technique.

Feral S2 protège uniquement la surface avant réellement dessinée durant les 9 premiers ticks actifs (frames 9–17). Elle peut absorber un coup ou un projectile frontal qui traverse ce rectangle. Les projections, le dos et les volumes hors du bouclier restent vulnérables. Les 9 ticks actifs suivants (18–26) exposent une seule frappe du bord court, sans garde simultanée. Les deux poses sont les vrais BODY V100, calibrés séparément.

## SUPER avec confirmation

L'ouverture physique bloquable est disponible aux frames 24–31. Une ouverture manquée ou gardée conserve les 48 ticks de récupération sans suite ni caméra. Seul un impact initial non gardé crée `action.workbookSuperV106`. La victime reste un acteur autonome : pas de téléportation, de remplacement par une image, de guérison ou d'invulnérabilité de scène.

Après confirmation, Feral tire aux frames 48/50/52 depuis la pose de tir native de son SUPER ; les trois carreaux acquièrent le même point au premier départ. Scar expose le volume réel du combistick aux frames 40–47 et ne frappe qu'une fois avec cette extension. Les contacts restent physiques : une suite peut être évitée ou interrompue. La durée totale de chaque action reste de 80 ticks.

`getPitSuperCameraV106(state)` expose un focus dérivé des acteurs, avec zoom plafonné à 1,08 et centre borné par l'arène. Il expire au plus 48 ticks après confirmation et disparaît immédiatement si l'action est interrompue, un acteur est KO ou la manche se termine. Aucun état caméra caché n'est requis pour restaurer un snapshot.

## Archives et preuves

Le replay 14 utilise 12 bits par acteur, dont le bit ressource 11 et les codes d'action source 8/9/10 pour projectile/bouclier/SUPER. Les encodages historiques gardent leurs 11 bits. L'enregistrement de mannequin passe au format `dummy-input-rle-v3` uniquement lorsqu'une de ces nouvelles commandes est utilisée, en réencodant les segments précédents sans perdre leur bit ressource.

`tests/pit-workbook-combat-v106.test.mjs` vérifie les coûts, délais, collisions dans les deux sens, esquive, gardes, interruption, motions, snapshots invalides, restauration au milieu d'une salve ou d'un SUPER et replay déterministe avec une jauge réellement gagnée. La fixture `tests/fixtures/pit-workbook-legacy-v106.json` a été produite depuis le moteur du commit `28e9b6360ae30530525d55e307380d46d0eef8e1` : six traces de 720 ticks comparent chaque JSON sérialisé au moteur actuel, au byte près.

Les deux spéciaux à entités manquantes (mine Feral et shuriken Scar), les projections et fins de scène à partenaires, ainsi que l'inventaire persistant d'équipement restent hors de cette livraison. Leurs lignes source ne sont pas déclarées terminées par la présence d'un BODY.
