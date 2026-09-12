# Reprise des discussions — V31

La V31 rassemble la reprise du niveau Homeworld, de THE PIT et du pilote Oseris. Elle conserve aussi les ajouts V30 : Désert de Verre, déchoppe et transfert intégral des archives. Ce document décrit le code présent dans les sources et les qualifications locales réellement observées. Le package Windows V31 et la publication publique restent en cours : aucune réussite n’est déclarée ici avant réception de leurs résultats.

## Cité du monde natal

La cité n’est plus traitée comme un grand rectangle latéral. Le terrain de 5 200 × 2 600 pixels utilise douze quartiers irréguliers reliés par neuf rues, corridors ou rampes. Treize bâtiments possèdent leur propre emprise et leur porte ; les accessoires arrière, au sol et au premier plan restent indépendants. Le déplacement suit le plan oblique, avec collision et glissement sur les polygones praticables.

Les services, preuves, habitants et expéditions antérieurs restent accessibles dans cette nouvelle topologie. Le héros et les habitants utilisent des plaques transparentes de personnages entiers. Quinze presets connus disposent d’une plaque Homeworld reliée au même identifiant de personnage. « Exact-ID » décrit cette correspondance de registre, pas une certification officielle ni une fidélité 1:1. Une apparence sans plaque dédiée utilise le corps modulaire générique du projet, sans emprunter l’identité d’un autre chasseur connu. Le héros se retourne selon sa direction de déplacement.

Le kit réemploie des modules et images du projet. Cette livraison ne constitue pas une nouvelle peinture 1:1 de toute la cité, une population complète, une poursuite Enforcer physique ou un cycle de vie de clan.

## THE PIT

La caméra de présentation recadre les deux combattants et leurs volumes de technique. Son centre et son zoom sont bornés, lissés et protégés par des zones mortes ; elle ne change pas les coordonnées du moteur de combat.

Le menu distingue les huit arènes réellement jouables d’un catalogue de cent concepts regroupés en cinq vagues. Les 92 fiches restantes décrivent une cible de production à six plans P0–P5 et des règles de transition équitables ; elles ne sont ni instanciées ni annoncées jouables. Les dix études patrimoniales servent uniquement à analyser la composition et exigent des visuels originaux du projet.

L’aide et le laboratoire sont repliables pour préserver l’aire de combat. Les quatorze combattants sur quatorze disposent d’une plaque bitmap statique dans THE PIT. Le combattant placé à droite regarde son adversaire ; City Hunter possède notamment sa pose gauche dédiée. Le lot V31 contient seize poses statiques et zéro animation. L’audit conserve donc 264 entrées d’animation manquantes : aucune pose fixe n’est comptée comme un clip animé.

## Pilote Oseris

Le premier niveau Oseris passe à une fondation verticale de douze salles reliées par quatorze connexions, réparties entre canopée, ruines hautes, sol et grottes. Des plateformes hautes, lianes conditionnées par la capacité, raccourcis et repères stables complètent le parcours. La caméra verticale suit ces nouvelles hauteurs sans modifier la physique générale des autres missions.

La carte est construite depuis la même topologie et masque les salles inconnues. La cible de 48 salles et huit sous-régions reste explicitement à produire ; cette V31 livre un socle jouable, pas le niveau commercial final ni tous ses décors propres.

## État de qualification

Les résultats locaux observés sur l’état V31 sont :

- `npm.cmd run qa:release` : réussite, 1 103 tests sur 1 103 ;
- projection V19 disponible : 464 paires master/runtime ;
- audit npm : 0 vulnérabilité signalée ;
- QA navigateur locale : PASS.

Ces résultats ne valent pas qualification du package Windows ni preuve de publication publique. Ces deux étapes restent en cours tant que leurs sorties réelles n’ont pas été enregistrées. Les emplacements prévus pour les preuves restantes sont :

- tmp/desktop-qa/v31/verification.json pour l’EXE ;
- tmp/desktop-qa/v31/archive-verification.json pour l’ASAR et le ZIP éventuel ;
- docs/desktop-v31-qa.json, docs/v31-public-browser-qa.json et docs/v31-public-http-qa.json seulement après une réussite réelle.

Aucune réussite du package, empreinte, taille, URL publique ou cadence matérielle V31 n’est enregistrée dans ce document avant son observation.
