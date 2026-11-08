# Mobilité V1 — comptoir des convois et garage des Forges

## Périmètre effectif du code

Base de reprise : `254b4b972af3c32cb078da3744241b2c0ea2f46c`. Les PR artistiques 116 et 120 sont fusionnées ; cette suite se développe sur `feat/mobility-garage-gameplay-20261108`. Aucune image n’est générée dans cette passe.

Les **50 identités, descriptions, capacités de conception, dimensions et acquisitions de la bible** sont relues depuis les cinq JSON existants, sans duplication ni renumérotation. La V1 ajoute une boucle limitée mais raccordée au jeu : **Forges → prêt → circuit / chargement → permis local → achat d’une moto → conduite → usure → réparation / recharge / amélioration**.

**Deux engins sont conduisibles dans l’aire fermée des convois**, pas dans les huit chasses : le Grav-Sled prêté et la moto antigrav de clan possédée. Deux Trophy Carriers y circulent comme convois autonomes. Les autres acquisitions et usages restent planifiés ; une présence au catalogue ne les rend pas jouables.

## Accès au magasin et au garage

Rejoindre physiquement le point `forge-service` dans l’intérieur `deep-forge` du Homeworld, puis ouvrir **Comptoir des convois · magasin et garage**. Le bouton réemploie le lieu existant au lieu d’ajouter un bâtiment superposé. La position est enregistrée avant l’ouverture. Le propriétaire, l’intérieur, la proximité du comptoir et l’autonomie du chasseur sont vérifiés de nouveau à chaque commande.

La règle existante du rite Blooded est réutilisée ; les anciennes campagnes adultes sans prologue conservent leur accès existant. Le permis de circulation n’accorde aucun rang, honneur, équipement de chasse, recrutement ou vaisseau. La boutique ne vend ni les engins Enforcer ni les montures de quête par défaut.

## Circuit de formation

Le Grav-Sled est prêté, jamais possédé. Suivre trois balises dans l’ordre, s’arrêter à la borne de chargement, prendre le colis de 25 kg puis le déposer au sas. Le permis exige le retour immobile, les trois balises, le colis effectivement livré, au moins dix secondes simulées et un état d’au moins 50 %. Un retour de sécurité ne valide jamais le permis.

La piste possède accélération, marche arrière, freinage, direction, boost, inertie, obstacles solides, zone de terrain lent, collisions avec dommages, réserve d’énergie, chaleur et arrêt de surchauffe. Les deux convois utilisent une route logistique bornée et cèdent le passage à proximité du joueur ; aucune patrouille n’apparaît arbitrairement dans toutes les régions.

Clavier : commandes existantes déplacement ; Saut = frein, Visée = boost, Interagir = charger/décharger, Pause = pause. Les boutons tactiles et une lecture standard des axes / boutons de manette sont codés, mais leur recette native reste à qualifier. Les fenêtres de réglages, la perte de focus et le changement de visibilité suspendent la simulation.

## Achat et interventions

La moto antigrav de clan coûte **420 marques de clan**, après permis et rang Blooded. Le prix est une règle originale de jeu, non une valeur canonique. Une seule propriété par identité ; pas de vente répétée ni de véhicule attribué à l’import d’une ancienne sauvegarde.

| Intervention | Effet / coût de base |
|---|---|
| Noyau antigrav, 3 paliers | +8 % vitesse et +10 % accélération par palier, consommation accrue ; 80 / 160 / 320 marques |
| Plaques de protection, 3 paliers | +10 points de résistance aux chocs par palier, -4 % vitesse ; 70 / 140 / 280 marques |
| Attaches de transport, 3 paliers | +25 % capacité par palier ; 60 / 120 / 240 marques |
| Échangeur thermique, 3 paliers | +25 % refroidissement par palier ; 65 / 130 / 260 marques |
| Réparation machine | Plafond de `(100 − état) × (1 + palier × 0,25)` ; ne recharge pas |
| Recharge machine | Plafond de `(100 − réserve) × 0,4` ; ne répare pas |
| Soin / repos biologique | Règle distincte préparée, sans acquisition biologique jouable ni BOND offert |

Les statistiques dépendent de l’usure, de la charge et des modules. L’interface utilise des **unités de piste**, pas de prétendues vitesses physiques canoniques. Aucun saut de portail, chargement orbital ou réduction artificielle du gabarit n’est ajouté.

## Sauvegarde et protections

`mobilityV1` est un registre versionné rattaché à `createdAt`, dans la même transaction de campagne que le solde de marques. Absence dans les anciennes parties = aucune possession. Versions futures, propriétaire différent, nombres non finis, modules hors limites, incohérences de réserve / état ou ordres périmés sont refusés.

Chaque devis porte une révision attendue. Le moteur recalcule le coût ; il n’accepte pas une dépense arbitraire fournie par l’interface. La conduite rejoue des entrées bornées, pas des coordonnées ou dégâts choisis par le client. Les lots de trente pas sont persistés par le writer existant ; en cas de quota ou de confirmation incertaine, la conduite se bloque et garde le lot exact pour la réconciliation. Une réussite de rendu ne vaut pas une confirmation d’écriture.

Le retour normal exige le sas et l’arrêt. La récupération de sécurité n’efface ni dégâts ni consommation et ne donne pas le permis. Une chasse ne peut pas partir avec une sortie de mobilité active ; reprendre la sortie au comptoir pour la remiser. Le mode autonome /dev n’accorde aucune progression de mobilité.

## Sources graphiques et suivi

Trois PNG existants (moto, Grav-Sled, Trophy Carrier) sont copiés sans retouche sous `public/game/mobility/v1/`. Ce sont des poses statiques de revue, pas de nouvelles animations, directions ni assets validés 1:1. Les glyphes de direction et la traînée procédurale indiquent le mouvement réel. Les sons de sélection, impact et objectif sont des réemplois du système existant ; aucun son dédié n’est annoncé livré.

[Classeur Excel complet](../../../production/mobility-20261108/Yautja_Mobilite_Gameplay_20261108.xlsx) : **22 feuilles**, dont les quatre feuilles historiques du classeur Marché / montures / chenils conservées, une synthèse et dix-sept feuilles de détail. Le registre couvre 50 modèles, 450 vues/pièces indépendantes, 500 clips d’animation, 408 paliers de modules mécaniques, 48 équipements biologiques, 300 besoins de sons et 350 effets. Ces nombres désignent des besoins de production, pas des fichiers déjà produits. Les formules de coûts et statistiques s’appuient sur la feuille de paramètres.

[Manifeste du classeur](../../../production/mobility-20261108/workbook-manifest.json) · [Sources réemployées](../../../production/mobility-20261108/runtime-sprite-manifest.json) · [Vérification locale](../../../production/mobility-20261108/qa/local-verification.json).

## Vérification et limites

**106 tests ciblés locaux réussis, aucun ignoré** : 79 règles / données / simulation, 16 intégrations utilisant les vrais writers/loaders et le rendu serveur, 11 régressions de sauvegarde du Clan Ship. Le TypeScript strict des nouveaux modules, UI et sauvegardes réussit. La relecture des quatre feuilles historiques ne trouve aucune modification de valeur existante ; seule la première ligne antérieurement vide reçoit un lien de lecture.

Le navigateur local refuse l’URL de test avec `ERR_BLOCKED_BY_ADMINISTRATOR` : [échec conservé](../../../production/mobility-20261108/qa/browser-local-blocked.json). Aucun parcours natif réussi, capture en jeu ou test manette réel n’est déduit du SSR. Le contrôle global de GameClient a dépassé le budget local sans résultat ; aucun build global réussi n’est revendiqué. Une CI séparée doit qualifier la tête publiée.

Restent ouverts : quêtes des autres véhicules, dressage / BOND / écuries, chasses montées des huit planètes, chargement et gabarit orbital, PNJ montés dans les régions, armes de véhicule, vues et cycles fluides, sons/VFX dédiés, assets HD 41–50 et écarts artistiques antérieurs, QA navigateur/manette complète. Aucune fusion ni mise en production n’est comprise dans cette livraison.
