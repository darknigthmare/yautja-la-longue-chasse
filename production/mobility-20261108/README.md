# Mobilité V1 — livraison de gameplay et suivi de production

[Guide du magasin, du garage et de la piste](../../docs/campagne/mobilite/GAMEPLAY_GARAGE_V1.md) · [Classeur Excel](Yautja_Mobilite_Gameplay_20261108.xlsx) · [Empreintes et périmètre du classeur](workbook-manifest.json).

Le code est raccordé au comptoir `forge-service` des Forges `deep-forge`. Deux modèles peuvent être conduits sur l’aire fermée : Grav-Sled de prêt et moto de clan achetable. Deux Trophy Carriers circulent comme convois. Le catalogue de cinquante modèles ne signifie pas cinquante véhicules jouables.

## Vérification historique du code publié

Le commit `9f42efcf1ac171d5c584c3fbcf0fc574ea8af8a8` passe 120 tests ciblés, le TypeScript ciblé et 19 contrôles navigateur natifs. [Run d’origine](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/42482103760) · [Rapport et captures conservés](qa/native-9f42efcf/) · [Reçu courant](qa/verification-20261108.json).

La recette utilise le vrai composant, la simulation, le writer et localStorage avec financement/rang de fixture déclarés. Elle ne couvre pas encore le parcours complet GameClient → Homeworld ni la manette matérielle. Les fichiers de vérification locale antérieurs restent des reçus historiques ; le blocage navigateur local n’est pas effacé.

## Lire le classeur

Les quatre feuilles historiques conservent 2 428 valeurs ou formules non vides. Dix-sept feuilles de détail et une synthèse ajoutent : 50 modèles et acquisitions, statistiques calculées, 408 paliers de modules mécaniques, 48 équipements biologiques, 906 exigences de sprites/couches, 1 671 clips, 400 événements sonores et 350 effets, fonctionnement, maintenance, magasin, PNJ et zones, QA, provenance et 18 chantiers ouverts.

Les nombres de besoins ne désignent pas des fichiers livrés. Quarante sources individuelles HD sont connues dans le dépôt ; leurs autres vues et animations ne sont pas inventées. Trois PNG sont réemployés à l’identique dans le moteur. Aucune génération d’image n’a lieu dans cette reprise. Les dix sujets 41–50, la revue artistique 1:1 et le dressage restent ouverts.

Vérification reproductible sans modifier le classeur : `python3 scripts/verify-mobility-workbook.py` depuis la racine du dépôt. Le document est éditable dans Excel ; le vérificateur contrôle la livraison figée et ses résultats calculés, pas les éditions ultérieures de l’utilisateur.

## Reprise V1.1 — état courant

[Reprise détaillée](REPRISE_V1_1.md) : le XLSX comporte 23 feuilles et 779 formules, dont une feuille de qualification distincte. Code `2fa19db1` : 161 tests ciblés + 6 tests QA, 21 contrôles natifs de conduite/atelier et 12 contrôles tactiles/API manette ; TypeScript complet et build frontend diagnostic réussis. Les captures/rapports sont dans [qa/native-2fa19db1](qa/native-2fa19db1/). Les reçus antérieurs, la base de 50 modèles et les 18 chantiers de clôture restent conservés. La manette physique et le parcours campagne complet ne sont pas qualifiés.


## Extension V1.2 — remise du Grav-Sled

La formation réussie peut désormais produire un reçu de remise pour un Blooded. Le permis ne donne toujours pas de propriété automatique : une confirmation distincte aux Forges remet le châssis avec son usure et sa réserve. Deux machines peuvent être possédées et entretenues indépendamment ; le prêt ne reçoit jamais leurs modules personnels. Les conclusions V1/V1.1 ci-dessus restent historiques. Voir [la reprise V1.2](REPRISE_V1_2.md) et la feuille `Remise_GravSled_V1_2` du classeur (24 feuilles, 780 formules). Aucune image nouvelle ni certification canonique.
