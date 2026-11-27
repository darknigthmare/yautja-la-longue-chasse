# THE PIT — reprise du 27 novembre 2026, lot 2

Ce point prolonge le [premier lot des guides et extensions](CONTINUATION_20261127.md). Il décrit les ajouts effectivement écrits et leurs preuves, sans attribuer une certification 1:1 à l’ensemble du jeu.

## Publication et base

- Dépôt : `darknigthmare/yautja-la-longue-chasse`.
- Branche : `codex/the-pit-combat-bible-extensions-20261127`.
- PR : [#195](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/195), ouverte, sans fusion demandée par ce lot.
- Base applicative du premier lot : `5c68b1354d5af0d66ee7834cd4592c35fe622721`.
- Lot artistique publié : [`5cee05b27672af763f3a8dfaea9c8c64e6878633`](https://github.com/darknigthmare/yautja-la-longue-chasse/commit/5cee05b27672af763f3a8dfaea9c8c64e6878633), arbre `e8fa05bc6c9993526f8f1678786527f63a5b4660`, identique aux fichiers contrôlés.
- Les trois guides originaux du premier lot restent intacts. La Bible et les lignes correspondantes de la matrice distinguent désormais l’implémentation de menu, le bonus jouable et les dessins candidats.

La publication applicative et les contrôles CI de son commit sont consignés en fin de document dès leur observation. Une PR ouverte n’est pas une mise en production.

## 1. Épreuve de riposte : un bonus complet dans le moteur

L’entrée se trouve dans **THE PIT → Entraînement → Épreuve de riposte**, après confirmation des personnages et du stage. L’épreuve utilise le kit PIT standard ; les recettes Workbook et les parcours de scène ont une raison d’indisponibilité explicite.

| Élément | Comportement livré |
| --- | --- |
| Contexte | Simulation d’entraînement originale de THE PIT. Aucun événement de film ou rite canonique nouveau n’est affirmé. |
| Objectif | Quatre séquences : bloquer un véritable assaut bas, puis toucher le partenaire avec une frappe normale dans l’ouverture. |
| Reconnaissance | Événements de contact du moteur à 60 ticks/s. Une frappe trop tôt, une technique ou une projection ne valide pas la riposte. |
| Standard | 40 secondes de simulation, arrêt à la troisième erreur. |
| Timing accompagné | 60 secondes, arrêt à la cinquième erreur ; classement et record séparés. |
| Cycle | Préparation sans chrono, départ explicite après disponibilité des visuels, signaux de garde/riposte, replacement, réussite ou échec, recommencer et abandonner. |
| Pause et perte de focus | Simulation et chrono suspendus ; nettoyage des entrées pour éviter une reprise sur une touche restée active. |
| Score | 1 000 par séquence, −200 par erreur, bonus de temps seulement en cas de réussite. |
| Résultat | Rang et score propres à l’épreuve ; aucun résultat de duel, chapitre, honneur, trophée ou distinction de campagne attribué. |
| Conservation | Meilleur record choisi explicitement, par propriétaire et niveau d’aide, dans ce navigateur uniquement. Il ne fait pas partie de l’export/import de campagne. |

Le stockage refuse les archives corrompues, d’un autre propriétaire ou de version future, ainsi que les écritures pendant un transfert d’archives. Le test de la limite de 8 192 caractères a trouvé une écriture qui pouvait rendre un record illisible ; la taille sérialisée est désormais contrôlée **avant l’écriture**, avec une régression qui conserve les 8 190 caractères initiaux sans aucune écriture.

Le bonus réutilise les visuels et gestes du kit standard. Il ne certifie pas les attaques individuelles de tout le roster ni une adaptation 1:1 de chaque incarnation. Il ne se reprend pas après fermeture et n’est pas exporté comme un replay de duel.

Références : [règles du bonus](../../app/game/systems/pitBonusTrialV1.ts), [records](../../app/game/systems/pitBonusRecordsV1.ts), [raccordement au combat](../../app/game/PitCanvas.tsx), [tests](../../tests/pit-bonus-trial-v1.test.mjs), [runner navigateur](../../scripts/qa-pit-bonus-trial-v1.mjs).

## 2. Dix-huit fiches de distinctions et parcours réels

La [galerie détaillée](GALERIE_DISTINCTIONS_V1.md) permet d’ouvrir les 18 distinctions existantes, acquises ou verrouillées. Les filtres séparent les 12 récompenses Arcade, les cinq du Circuit et celle de Descente. Les conditions et compteurs sont dérivés des vraies archives, sans additionner la progression de chasseurs différents.

Les commandes **Préparer l’Arcade / le Circuit / la Descente** passent par un normaliseur commun puis par `GameClient`, `PitExperienceV79` et `PitCanvas`. Elles présélectionnent le mode et un chasseur autorisé. Un chapitre est un objectif affiché : il ne saute aucun combat ni checkpoint. L’entrée générique efface une précédente demande et le passage vers une chronique ne réapplique pas une ancienne route.

Les fiches gardent le focus dans leur dialogue, reviennent à la carte d’origine et gèrent Tab/Maj+Tab, Échap et le hook de manette existant. Un B maintenu ferme la fiche seule ; il faut relâcher puis appuyer à nouveau pour revenir au parent. Le changement de propriétaire ferme la consultation privée. Un profil corrompu ne présente pas de faux acquis.

Cette galerie reste une consultation de menu : aucune pièce explorable, coffre, monnaie, abonnement ou nouvelle récompense n’est annoncée. Elle n’écrit rien dans les sauvegardes.

## 3. Greyback sans casque : sorties produites, écarts conservés

La variante exacte est `elder-greyback-sans-casque-7955bb66ac`. La référence est le PNG fourni du dossier NECA/Lost Tribe, conservé octet pour octet. La tentative de consultation de sa page primaire a reçu HTTP 403 ; l’identité reste qualifiée par sa source de projet, sans nouvelle certification indépendante.

| Production | Compte réel |
| --- | --- |
| Poses visées dans ce lot distinct | 4, orientées à droite |
| Premières sorties reçues | 4 PNG séparés |
| Révision d’équipement reçue | 1 PNG séparé, pour la première pose |
| Total de nouveaux PNG | **5**, soit 12 121 309 octets |
| Copie de référence | 1 PNG distinct du compte de production |
| Correction suivante | Refusée par le générateur ; aucun PNG reçu |
| Deux autres corrections | Non tentées après le refus |
| Clips admis / certification 1:1 | **0 / aucune** |

Chaque sortie est un PNG RGBA de 1024 × 1536. Les mesures constatent une transparence réelle et aucun pixel opaque sur le bord extérieur. Aucun recadrage, miroir, recoloriage ou réécriture de pixels n’a été appliqué. Ces propriétés techniques ne prouvent pas une continuité artistique exacte.

La revue a identifié les lames de poignet trop compactes dans les premières sorties. La révision reçue améliore leur déploiement et l’arme au côté. L’empattement reste environ 18 % plus étroit que la référence ; visage, petits ornements, contours et raccords demandent encore une revue. L’orientation gauche et les intervalles d’animation restent absents.

La page **`/pit-lab/selection`**, accessible depuis l’atelier, compare source et candidat, parcourt les quatre poses et permet de basculer la révision de la première. Fond clair et superposition sont des aides de comparaison ; les PNG conservent leurs proportions. En cas d’image manquante, un message explicite remplace l’image. La référence superposée ne peut pas prendre la place d’un candidat absent.

Références : [manifeste artistique complet](../../art-source/the-pit/continuation-20261127/greyback-unmasked/manifest.json), [revue](../../art-source/the-pit/continuation-20261127/greyback-unmasked/REVIEW.md), [manifeste des copies publiques](../../public/game/review/the-pit/greyback-unmasked-20261127/manifest.json), [QA de la page de revue](QA_REVUE_SELECTION_20261127.md).

## 4. Vérification du lot

Le regroupement suivant a terminé avec **78/78 tests réussis**, aucune annulation ni test ignoré :

```sh
node --experimental-strip-types --test --test-concurrency=1 \
  tests/pit-content-access-v1.test.mjs tests/pit-selection-presentation-v1.test.mjs \
  tests/pitSelectionFlow.test.ts tests/pit-save.test.mjs tests/pitHonors.test.ts \
  tests/pit-honor-gallery-v1.test.mjs tests/pit-honor-route-game-client.test.mjs \
  tests/pit-bonus-trial-v1.test.mjs
```

Les six tests du callback réel `openPit` couvrent normalisation, propriétaire, archive corrompue, verrou de transaction, effacement de l’ancienne route et conservation du retour vers le hub. Les suites du bonus, de l’horloge et du briefing totalisent également **31/31 réussites** dans leur regroupement ciblé ; ces comptes recouvrent une partie des 78 tests et ne doivent pas être additionnés.

| Contrôle navigateur | Résultat et portée |
| --- | --- |
| [Galerie](qa/honor-gallery-20261127/report.json) | **13/13** scénarios dans les vrais composants : 18 ouvertures, filtres, routes, progression, focus, clavier, manette émulée, mobile et aucune écriture. |
| [Revue Greyback](qa/selection-review-20261127/report.json) | **9/9** : PNG et empreintes, vrais composants Next Image/Link, poses et révision, proportions, superposition, mobile, clavier et deux pannes d’image injectées. |
| [Bonus](qa/bonus-trial-20261127/report.json) | **8/8** : vrai `PitCanvas`, sélection et stage, gardes et ripostes au clavier, réussite, enregistrement explicite, reprise/abandon, pause/focus, mobile et manette émulée. |

Les récompenses de la galerie sont des fixtures déclarées ; elles ne sont pas présentées comme des victoires jouées. Le bonus, lui, a été réussi par des entrées clavier dans le moteur, sans injection de réussite ni de progression. Aucun callback de duel ou de parcours n’a été émis par cette réussite. Les parcours mobiles utilisent des fenêtres Chromium, pas des appareils physiques ; les manettes sont émulées et aucun lecteur d’écran réel n’est certifié.

Les rapports contiennent les empreintes des sources ; le [relevé consolidé](qa/lot2-20261127/verification.json) fixe également les octets des douze captures et des trois rapports. Le nouveau [workflow ciblé](../../.github/workflows/the-pit-guide-extensions.yml) exécute le regroupement de tests, le lint et les trois runners navigateur avec les dépendances existantes. Le runner du premier lot utilise désormais `playwright-core`, présent dans le lockfile, au lieu de dépendre du paquet global de l’environnement de préparation.

## 5. Inventaire courant et CI

Le relevé courant est actualisé séparément des publications historiques, selon le protocole du [dossier d’intégration](../qa/current-integration-20261103/README.md). Sa [preuve différentielle](RUNTIME_INVENTAIRE_20261127.json) nomme la base, les octets relus, les chemins applicatifs exacts, les fichiers conservés par identité Git et les entrées absentes de ce checkout. Le contrôle strict CI n’est ni retiré ni assoupli. Les freezes V111, V112 et V113 conservent leurs identités.

Sur le commit du premier lot `5c68b135`, le [job frontend](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/45947891125/job/140336692767) a réussi le typage global et le build de production. Ce constat complète la limite mémoire locale documentée au premier lot ; il ne valide pas par avance le code ajouté ensuite.

Plusieurs audits globaux de ce même commit ont échoué : inventaire courant périmé, import inutilisé du module de sauvegarde, fixtures de menus/campagnes, contrôles historiques et scénario de mobilité native. Ce lot corrige l’import inutilisé et actualise l’inventaire courant. Les anciennes preuves historiques ne sont pas réécrites pour faire disparaître leurs écarts. Le statut du nouveau commit doit être lu séparément.

## 6. Manquants conservés pour la suite

1. Terminer et faire revoir les dessins de sélection/désélection, leurs deux orientations et les détails d’équipement. Les cinq sorties de ce lot restent candidates.
2. Prototyper puis jouer un premier profil équipe cohérent : transfert de contrôle, ressources, KO, combos et propriété des entités. Tag et assistance de roster restent conçus.
3. Réaliser un super duo, une conclusion collective et un clash représentatifs avec leur véritable résolution de combat.
4. Étendre les bonus de précision/destruction et leur insertion narrative ; le bonus de riposte livré ne représente pas toutes les familles du guide.
5. Passer éventuellement de la galerie de menu à un lieu exploratoire avec topologie, objets et aller/retour réels.
6. Poursuivre les kits individuels, les arènes, Boss Rush et parcours dédiés sur leurs sources exactes. Les 201 identités ne sont pas 201 kits certifiés.

Ces manquants sont détaillés dans la [Bible](BIBLE_THE_PIT.md) et la [matrice des 68 rubriques](TRACEABILITE_GUIDES_20261127.md). Aucun pourcentage global de fidélité n’est déduit du nombre de fichiers, de tests ou de poses reçues.
