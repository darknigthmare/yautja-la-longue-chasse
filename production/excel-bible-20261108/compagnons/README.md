# Compagnons : accords, affectation et présence

## Livraison du 8 novembre 2026

Le registre `app/game/systems/companionResidence.ts` ajoute un parcours réellement raccordé à la campagne pour les quartiers, la réserve et les transferts. Il réutilise les identités de **Ka’rhek, Sa’keth et des six membres du cercle du clan**. Leurs recrutements historiques restent la responsabilité des systèmes existants ; aucune copie du personnage ni seconde campagne n’est créée.

Quatre contacts originaux disposent d’un accord secondaire jouable : **Brèche (`ORG-01`), Éclisse (`ORG-10`), Lance-Fendue (`ORG-16`) et Opale (`ORG-13`)**. Les huit chasses principales et leurs identifiants ne changent pas. Ces accords sont des adaptations de production des intentions du catalogue : ils ne réalisent pas encore toutes les scènes, animations, interactions animales et capacités de terrain décrites dans les fiches.

Sources : `docs/campagne/COMPAGNONS_ET_ALLIES_PREMIUM.md` et `docs/campagne/CATALOGUE_COMPAGNONS.md`. La matrice `coverage.json` garde séparés le périmètre réalisé, les tests de comportement, la présence dans les composants et les vérifications restant ouvertes.

## Parcours accessible dans le jeu

Le panneau **Compagnons · Accords et quartiers** se trouve sous les commandes de déplacement du vaisseau personnel et du Clan Ship. Sa consultation ne modifie rien. Les boutons de guidage conduisent aux véritables postes ; les actions relisent les coordonnées du contrôleur de mouvement au moment du clic.

1. Aux archives, **Consulter les appels** révèle seulement les routes déjà terminées dans cette campagne. Aucun nom de quartier ni objet personnel n’apparaît à bord à cette étape.
2. Accepter un appel fige une nouvelle reconnaissance. Une ancienne victoire ne vaut pas preuve : le départ doit lier la tentative courante au contact et le résultat doit être accepté par la progression normale de la chasse.
3. Après le retour, deux préparations se font aux postes indiqués. Les réponses incompatibles sont refusées sans avancer l’accord. Les étapes restent consultables et peuvent être reprises.
4. La proposition finale aux archives crée le recrutement **en réserve**, sans installation ni avatar embarqué.
5. Depuis un poste, programmer une affectation vers une coque personnelle possédée ou vers le Clan Ship. Cela conserve la précédente affectation.
6. Au hangar du clan, ou au sas du vaisseau personnel effectivement amarré, réserver les fournitures puis confirmer les travaux. Le débit, l’emplacement, le nouveau lieu et l’affectation de la triade sont enregistrés dans la même transaction de campagne.
7. Une annulation restitue l’escrow une seule fois. Le transfert retire l’ancien module au moment où le nouveau devient actif. La réserve, la suspension et la reprise passent aussi par le quai.

| Contact | Route réelle | Preuve minimale | Préparations physiques |
| --- | --- | --- | --- |
| Brèche | Oseris-IV / `jungle-vey` | Nouvelle réussite, 1 scan, score 40 | Soins calmes, protocole de rappel et d’arrêt sans sacrifice |
| Éclisse | Acheron-Sigma / `ruins-ancient-guardian` | Nouvelle réussite, 2 scans, score 40 | Isolation du bus, droits locaux de maintenance |
| Lance-Fendue | Oseris-IV / `jungle-vey` | Nouvelle réussite, 2 scans, score 50 | Priorité au retour, respect des rites personnels |
| Opale | Naraka-Delta / `swamp-hydra` | Nouvelle réussite, 2 scans, score 40 | Rapport d’expédition conservé, autonomie de la synthétique |

Les préparations sont des décisions d’accueil au poste. Elles ne prétendent pas simuler une sortie de dressage, une récupération physique d’Éclisse dans un atelier ou une enquête dialoguée complète. Ces scènes et les capacités de terrain des quatre pilotes restent à produire. `fieldReady:false` les empêche d’occuper frauduleusement une place de la triade ou de prêter un bonus de combat.

## Navires, présence et capacités

Un hôte distingue explicitement `kind:'personal'` et `kind:'clan'`. Le Clan Ship AVP collectif n’est pas transformé en vaisseau personnel par une affectation.

Les huit salles personnelles et les sept salles du clan restent présentes. Les nouveaux modules occupent des galeries arrière hors du sol traversable existant. **Aucune nouvelle chambre intérieure traversable n’est déclarée livrée.** Les sockets évitent les passages latéraux et les ascenseurs et conservent les empreintes de collision existantes.

Le budget de disposition adopté pour cette tranche est de quatre résidents sur les coques personnelles compatibles, zéro sur les capsules de secours/chasseurs monoplaces/planeurs/flottes. Le clan commence à sept personnes joueur compris, puis treize et dix-neuf après les accords du conseil et les travaux de palier. Il s’agit de règles de jeu, pas de mesures canoniques des appareils. Les emplacements ne se remplissent jamais seuls.

L’habitat blindé exige le sas ou le hangar. Les baies synthétiques demandent les salles de maintenance/archives. Les alcôves ordinaires utilisent d’abord les pièces générales pour préserver les emplacements spécialisés. Un emplacement financé est verrouillé contre une seconde réservation.

Pour la triade réellement déployée, le quartier reste en place et l’avatar de bord disparaît. Le bail de mission est rapproché de son propriétaire, de la mission, du compteur de tentative, de la coque et de l’affectation source. Il reste valide lorsque la cinématique d’arrivée a déjà été retirée. Au retour, l’état médical vient du règlement de la triade existant : un blessé a une incarnation dans la baie médicale, un disparu conserve son quartier sans occupant ni service, et un accord suspendu ferme l’ensemble de sa présence.

Les six membres du clan déjà recrutés avant ce registre conservent leur poste historique pendant le premier projet de transfert. **Tout nouveau recrutement clan passe désormais en réserve**, grâce au hook atomique `registerCompanionResidenceRecruitment`. Après un transfert, une mise en réserve ou une suspension, le membre cesse de prêter sa compétence à un nouvel engagement spatial. Un engagement déjà actif interdit la modification du poste qui a constitué son équipage.

## Sauvegarde et raccords

Le DTO optionnel `SaveGame.companionResidence` est versionné indépendamment en version 1. L’absence et la valeur `null` restent distinguables des campagnes contenant un registre. Les nouvelles parties n’en fabriquent pas à partir du catalogue.

`inspectCompanionResidence` refuse les propriétaires étrangers, versions futures, champs inconnus, doublons, modules incompatibles, emplacements réservés deux fois, réservations mal chiffrées et déploiements impossibles. `evaluateCompanionResidenceCampaign` vérifie les accords historiques, les preuves de chasse et les paliers du conseil. Les imports incompatibles sont refusés avant normalisation.

L’interface fournit un propriétaire, une révision attendue et une observation physique. Le parent effectue l’écriture habituelle de campagne et ne confirme le message qu’après persistance. Un refus de quota conserve les octets confirmés précédents.

Principaux raccords :

- `CompanionResidencePanel.tsx` : UI contrôlée, guidage, préparations, fournitures, aperçu des modules installés.
- `CompanionQuartersScene.tsx` : couches séparées pour module et occupant, hôte courant, santé et absence.
- `ShipInterior25D.tsx`, `ClanShipInterior.tsx`, `ClanShipHub.tsx` : observation du mouvement réel et rendu conditionnel.
- `GameClient.tsx` : validation des écrans/pauses/baux, écrivain de campagne, recrutement clan en réserve, départ/retour/retrait de reprise.
- `save.ts`, `types.ts` : inspection, normalisation et conservation du champ optionnel.
- `clanShipOperations.ts` : instantané des compétences réellement disponibles pour le prochain engagement.

Les services de soin existants restent propriétaires des blessures et des secours. Aucun nouveau système de monnaie, de commerce ou de récompense répétable n’a été ajouté.

## Dessins et qualité déclarée

`companionQuarterArt.ts` contient les dix modules générés par le chantier art. Cette tranche utilise trois familles : alcôve de chasseur, baie synthétique et habitat blindé. Les sept autres n’autorisent pas de nouveaux recrutements et ne sont pas présentés comme occupés.

`companionPilotArt.ts` contient quatre dessins individuels au repos. Éclisse est une copie octet pour octet du PNG de la PR #119, commit `494935245c30bf409fae52e5c40534a62d6d90a8`; `eclisse-import.json` donne chemin, empreinte et limites. Les trois autres dessins ont été générés séparément. Les images ne sont ni découpées d’un collage, ni redimensionnées dans le fichier, ni recolorées, ni retournées pour simuler une autre vue.

Les sources et mesures sont conservées dans `production/excel-bible-20261108/art/`. Les acteurs sont **statiques**, les pivots sont mesurés selon le bas visible et restent à contrôler en scène. `humanArtValidation:false`, `motionStatus:'static-draft'` et `fidelity1to1Certified:false` s’appliquent. Aucun cycle de marche, validation des silhouettes ou fidélité 1:1 n’est certifié.

## Vérification

`tests/companion-residence.test.mjs` contient 24 scénarios : quatre accords, refus des anciennes preuves, reprise après échec, stages de travaux, escrow, transfert, réserve, maintien des postes historiques, nouveaux recrutements en réserve, capacités 7/13/19, compatibilité de coque, départ/retour, blessure/disparition/suspension, sauvegardes corrompues/futures, quota, rendu SSR et sources des quatre acteurs.

La commande enregistrée dans `verification.json` exécute aussi les régressions des opérations, sauvegardes et déplacements du Clan Ship : **84 tests, 84 réussites**. Le journal brut est `tests-run.txt`. Le lint ciblé a passé sans erreur; le typecheck global est pris en charge par le chantier racine.

Le SSR exécute les vrais composants et vérifie les enregistrements conditionnels ; il ne constitue pas une vérification des pixels, de l’hydratation, de la mise à l’échelle mobile ou des interactions de navigateur. Le chantier racine a rencontré une interdiction de socket AF_UNIX pour Chromium ; la revue automatique a refusé l’escalade. Aucun résultat de navigateur n’est annoncé ici.

Restent ouverts : navigation physique et contacts précis des acteurs sur les nouvelles galeries à inspecter en navigateur, rendu aux tailles mobile/manette, animations, dialogues/audio, fonctions de terrain C2, 40 autres originaux, Premium/Héritages, aliases Keth/Serekh, conflits de cohabitation, décès/capture, furtivité, traversées et environnements des compagnons. Les cases correspondantes ne sont pas fermées par ce lot.
