# C’ntlip V77 — relecture bornée du vrai GameClient

Revue du **3 octobre 2026**, candidat V77 servi par le jeu complet local. Aucun profil utilisateur ni sauvegarde du joueur n'est utilisé : le runner démarre des contextes jetables avec une campagne adulte explicitement déclarée et un checkpoint intérieur valide avant chargement. Cette fixture ne prétend pas avoir joué le prologue ou gagné le rang.

## Passage final `cntlip-final-candidate4-local` — 4198

**PASS dans le périmètre contrôlé : 11 contrôles et neuf nouvelles captures, toutes ouvertes individuellement avec `view_image`.** Ce run concerne le candidat `v77-candidate4-local`, figé le **3 octobre 2026 à 05:08:11.178 UTC** et servi sur `http://127.0.0.1:4198`. La relecture a été achevée à **05:13:32 UTC**. Les preuves de 4196 ci-dessous restent historiques ; elles n'ont pas été transférées au candidat final.

Preuves : `work-local/v77/qa/cntlip-final-candidate4-local/report.json`, log `work-local/v77/cntlip-final-candidate4-local.log` et reçu séparé `work-local/v77/final-review-cntlip-v77-candidate4-local.json`. Le rapport est lié au SHA256 **`8029db9c8f3b313db53481aae3fee7d6c4c5d10e33daf64861c557f310797190`** ; le reçu lie aussi chacune des neuf images à son empreinte exacte, sa taille, la méthode de relecture et le verdict `PASS_WITH_LIMITS`. Le champ brut `visualReview: pending` du rapport n'est pas réécrit après son empreinte : la relecture réelle est attestée par ce reçu. Les canaux effectivement présents `errors` et `network` sont vides ; aucun canal `consoleErrors` n'est enregistré par ce runner.

Les quatre tables sont atteintes en marchant depuis de vrais spawns intérieurs, avec collisions du corps entier. Le parcours contrôle l'invitation finie, la réservation unique malgré double clic, l'horloge figée après fermeture, la reprise de la même portion après reload, le récit temporisé et son souvenir unique. Au clan, il contrôle en plus la vraie pause du Hub, la suspension via `Navigation` → `Réglages`, le refus de quota sans consommation, le réessai et l'ellipse de deux heures narratives sans récompense ni modification du temps de jeu réel. Les préconditions adulte/rang/audience sont déclarées avant chargement ; aucun rang, prologue, escalier ou mission n'est prétendu gagné dans ce run. Le viewport 390 × 844 passe l'interaction tactile et l'absence de débordement horizontal.

| Nouvelle capture | Observation réellement relue |
|---|---|
| `1-clan-common-native-table.png` | 1440 × 1000 ; table et récipients à droite, hôte habillé distinct du chasseur, pieds sur le même sol, prompt de halte lisible ; légendes au sol peu contrastées |
| `clan-cntlip-mobile-dialog.png` | 390 × 844 ; récit original, réserve de trois portions, souvenir déjà écouté et limites des animations lisibles ; toast transitoire superposé au bas du panneau |
| `1-clan-common-shared-memory.png` | Aussi 390 × 844 ; réouverture après halte, invitation à reprendre place ; défilement nécessaire et recouvrement inférieur, pas une nouvelle vue desktop |
| `2-market-halt-native-table.png` | 1440 × 1000 ; table ronde, récipients et hôte artisan habillé ; joueur sur le carrelage devant la table, rack/coffre/bancs distincts conservés |
| `2-market-halt-shared-memory.png` | 1440 × 1000 ; récit de l'artisane, réserve et état déjà écouté lisibles, boutons contenus dans le panneau |
| `3-pit-rest-native-table.png` | 1440 × 1000 ; petite table sociale, hôte et joueur ancrés sur le sol, gong et mobilier conservés ; les deux préposés réutilisent la même tenue native de rôle |
| `3-pit-rest-shared-memory.png` | 1440 × 1000 ; récit original distinguant les Chroniques des vraies chasses, souvenir et absence de gain gratuit explicites |
| `4-council-gathering-native-table.png` | 1440 × 1000 ; HUD +2, hôte cérémoniel blanc à table, chef distinct dans la zone du trône ; props et cloisons conservés |
| `4-council-gathering-shared-memory.png` | 1440 × 1000 ; porte-parole original et récit local, sans parole attribuée à tous les Yautja ; réserve et souvenir lisibles |

**Réserves conservées :** le toast mobile recouvre transitoirement la fin du panneau et demande un défilement. Sa règle `pointer-events: none` conserve les commandes, mais ne supprime pas ce recouvrement visuel. La variété des deux tenues du PIT et la spécialisation architecturale des quatre salles restent limitées. Les poses natives sont debout : aucune animation dessinée assis/verser/boire, aucun son dédié ni fidélité canonique 1:1 n'est certifié. Sur ces quatre angles, aucun flottement manifeste des pieds ou props n'a été observé ; cela ne certifie pas tous les pivots et animations.

Le bouton Atlas est visible à droite sur les vues de ce lot ; **ces captures ne démontrent pas son parcours fonctionnel**, suivi par la recette monde séparée. Ce PASS n'est pas une preuve de ville entière terminée, campagne réellement jouée depuis le port, handset physique, compte synchronisé, tests consolidés, déploiement ou runtime public. Aucun fichier applicatif n'a été modifié pendant cette revue.

Le [collecteur final local](v77-local-delivery-qa.md) a ensuite recoupé les quatre recettes, leurs 67 relectures, les deux builds, les contrôles statiques, 2 642 tests réussis et les 19 PNG HTTP/SHA du candidat 4 : `PASS_LOCAL_GATES` le 3 octobre à 05:25:28.787 UTC, aucune condition manquante. Cette preuve agrégée est séparée du présent parcours C’ntlip ; elle conserve toutes ses réserves et ne constitue toujours pas une validation de l'alias publié.

## Passage `cntlip-final-local-navigation4` — candidat antérieur 4196

**PASS du GameClient local dans le périmètre contrôlé : 11 contrôles, neuf captures ouvertes et relues, zéro erreur de page ni requête HTTP échouée dans le rapport.** Le runner utilise le parcours public `Navigation` → `Réglages`, sans clic forcé derrière une modale. Les premiers échecs de banc restent archivés ci-dessous ; ils ne sont pas renommés en PASS. Le schéma de ce runner n'enregistre pas de canal `consoleErrors` : son absence n'est pas une preuve de zéro erreur console.

Ce run concernait uniquement le candidat servi en **4196**. Le candidat final 4198 a depuis sa propre recette et ses neuf nouvelles relectures, consignées au-dessus ; aucun PASS ancien n'est copié dans le registre de relecture finale ni dans les gates du déploiement.

Le rapport valide les quatre tables, la marche réelle depuis chaque spawn intérieur, l'invitation finie, la réservation unique malgré double clic, la préparation figée après fermeture, le reload avec la même portion puis le récit achevé en trois secondes et le souvenir unique de l'hôte. Les gardes de la cour sont des préconditions déclarées de fixture : ce run ne prétend pas avoir gagné une audience ou monté au palais par les escaliers.

Au clan, les contrôles supplémentaires couvrent une portion fermée pendant la vraie pause du Hub puis la suspension par réglages du GameClient ; ils ne représentent pas un clic à travers une table restée modale. Le quota bloque le récit et le repos sans modifier leur ledger. Le repos ensuite accepté ajoute exactement deux heures narratives locales, garde le même lieu et ne change ni le temps de jeu réellement compté, ni rang, honneur, marques, inventaire, trophées, missions, relations globales ou preuves. Un vrai viewport 390 × 844 passe l'interaction tactile et l'absence de débordement horizontal.

Preuves : `work-local/v77/qa/cntlip-final-local-navigation4/report.json` et `work-local/v77/cntlip-final-local-navigation4.log`. Les neuf captures du nouveau run ont toutes été chargées par `view_image` :

| Capture | Vue et résultat de la relecture |
|---|---|
| `1-clan-common-native-table.png` | Desktop 1440 × 1000 ; table native à droite, hôte habillé distinct du chasseur, ancrage commun au sol et prompt de halte lisible |
| `clan-cntlip-mobile-dialog.png` | Mobile 390 × 844 ; texte de réception originale, stock de trois portions, récit « déjà écouté », repos devenu indisponible après halte et limites d'animation explicites ; notification temporaire superposée en bas |
| `1-clan-common-shared-memory.png` | Aussi mobile 390 × 844, car le viewport reste celui du test tactile ; réouverture après halte avec le bouton de prise de place, pas un nouvel écran desktop ni une animation assise |
| `2-market-halt-native-table.png` | Desktop ; table ronde, récipients, hôte en tenue d'artisan, bancs/rack/coffres préservés ; joueur placé sur le carrelage avant la table |
| `2-market-halt-shared-memory.png` | Desktop ; récit original de l'artisane, réserve de trois portions et « déjà écouté » lisibles, boutons contenus dans le panneau |
| `3-pit-rest-native-table.png` | Desktop ; petite table sociale et préposé habillé près du joueur, gong et mobilier de préparation préservés ; l'autre préposé ancien reste à sa place |
| `3-pit-rest-shared-memory.png` | Desktop ; récit des Chroniques distinguées des vraies chasses, souvenir déjà écouté, absence de faux gain et d'animation annoncée |
| `4-council-gathering-native-table.png` | Desktop ; intérieur et HUD sur +2, hôte cérémoniel blanc à table, chef original dans sa zone du trône, props et cloisons conservés ; distinction hôte/chef lisible |
| `4-council-gathering-shared-memory.png` | Desktop ; porte-parole présenté comme original et ne parlant pas au nom du chef ou de tous les Yautja ; stock et récit unique visibles |

Les tables et les silhouettes ne présentent pas de flottement manifeste sur ces quatre angles. Les poses debout des hôtes restent lisibles auprès de leurs appuis et la projection des props est commune au sol. Cela ne certifie pas tous les pivots, toutes les animations ou chaque point du plan. Le préposé ajouté du PIT réutilise la même tenue native de rôle que le civil ancien : les deux habitants ont des identités distinctes, mais leur variété graphique reste limitée. Les quatre salles reprennent une architecture commune ; cette QA sociale ne prétend pas finir leur spécialisation artistique.

**Réserve mobile :** le panneau tient dans la largeur et ses boutons se replient, mais le message narratif global au bas de l'écran chevauche la fin du panneau et son bouton de départ au moment de ces captures. Le texte principal est lisible ; un défilement du panneau reste nécessaire et cette notification transitoire gêne sa fin. La règle existante `.toast { pointer-events: none; }` ne laisse pas cette notification intercepter les commandes : la réserve porte sur le recouvrement visuel, pas sur un blocage de clic prouvé. Le contrôle d'absence de débordement horizontal ne signifie donc pas « aucun recouvrement visuel ». Aucune modification runtime n'est réalisée par cette revue.

Ce PASS ne couvre pas la montée physique vers +2, les raccords/skiff, l'Atlas de la cité, le prologue complet, une campagne jouée sans fixture, le cloud multi-appareils ou une publication. Le défaut de l'Atlas est suivi séparément dans le candidat monde suivant ; le présent résultat C’ntlip n'en démontre ni la correction, ni l'absence.

## Passage `cntlip-final-local-clock2`

**État du run : FAIL de banc, parcours incomplet.** Le rapport et le log indiquent un timeout du bouton exact `Réglages et sauvegardes`, attendu après la reprise. Ce libellé appartient au deck. Dans le Homeworld, les réglages sont accessibles par le bouton public `Navigation`, puis `Réglages`. Le bon parcours doit être utilisé par le banc sans forcer de clic sous une modale ni ajouter de réglage à l'application pour satisfaire le test.

Le rapport a réellement validé l'approche de la table du clan par clavier, l'invitation finie, le double clic et la réservation dont l'horloge reste figée après fermeture. La route part de `(269,356)` et atteint `(396,131)` dans `clan-lodge`, étage 0, avec les collisions du corps entier. Le rapport indique `errors: []` et `network: []` ; il ne confirme pas les autres lieux, le récit terminé, le repos ou la vue mobile. Le script a dépassé son ancienne erreur d'horloge après reload, puis a atteint l'attente de réglages. Cela ne transforme pas ce passage en PASS global.

Preuves de ce passage : `work-local/v77/qa/cntlip-final-local-clock2/report.json`, `work-local/v77/cntlip-final-local-clock2.log`, deux captures énumérées ci-dessous. Le run précédent et ses erreurs d'horloge restent historiques, pas remplacés par ce résultat.

## Captures réellement ouvertes et relues

Les **deux** fichiers PNG du run ont été ouverts avec `view_image`, indépendamment des assertions du script.

| Capture | Ce qu'elle montre | Portée / réserve |
|---|---|---|
| `1-clan-common-native-table.png` | Maison des délégations, table et récipients natifs à droite, hôte civil voisin, chasseur masqué sur le même carrelage, autres meubles et civil préservés, prompt `Halte · Soigneuse de relève` | Table et présence de rôle lisibles ; proportions plausibles. Le pied du chasseur semble ancré au sol, sans flottement manifeste sur cette vue. Une capture seule ne prouve pas tous les pivots ou la collision |
| `failure.png` | Même intérieur après reprise et échec de recherche du bouton de réglages, aucun panneau C’ntlip ouvert | Confirme une vraie reprise de la pièce, pas un retour imposé au deck. Ne prouve ni le dialogue ni le mobile ; pas d'écran de crash visible |

Les surfaces conservent leur perspective commune : murs verticaux, devanture de la table sur le sol, banques/meubles en orientation distincte, alcôves matérialisées par leurs cloisons. Le chasseur se trouve près du bord avant de la table et son hôte est visible à côté. Les tenues des civils sont habillées ; aucun nouveau civil nu de combat générique n'est visible. La petite indication cyan au-dessus de la zone du chasseur et le prompt d'interaction ne masquent ni la tête, ni la table. Ces observations concernent cet angle et ce lieu uniquement.

Le cadrage laisse une grande marge sombre autour de la pièce. Les légendes de sol sont assez peu contrastées à cette échelle ; le HUD et le prompt principal sont lisibles. Les images ne démontrent pas une animation de consommation : les personnages sont des poses natives debout et le lot annonce explicitement l'absence de clips assis/verser/boire. Aucun flotement apparent n'autorise à déclarer toutes les scènes visuelles terminées.

## Ce que ce passage ne valide pas

Le dialogue C’ntlip, le récit achevé, son souvenir durable, le quota/refus du repos, l'ellipse de deux heures, les trois autres tables, les préconditions de cour, l'ouverture des réglages, la suspension et le viewport mobile **ne sont pas attestés par les captures de ce run**. Certaines validations de modèle ou du banc isolé du Hub existent séparément ; elles ne remplacent pas ces étapes du vrai GameClient.

Cette limite concernait le passage historique `clock2`. La relance `navigation4` et sa relecture sont consignées au début du document avec leur portée propre. Aucun fichier runtime n'a été modifié pendant ces relectures, et aucun compte synchronisé, déploiement ou fidélité canonique 1:1 n'est revendiqué.
