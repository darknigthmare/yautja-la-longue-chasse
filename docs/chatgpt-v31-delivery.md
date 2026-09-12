# Reprise des discussions — V31

La V31 rassemble la reprise du niveau Homeworld, de THE PIT et du pilote Oseris. Elle conserve aussi les ajouts V30 : Désert de Verre, déchoppe et transfert intégral des archives. La source et le runtime qualifiés correspondent au commit `c3f39e080197e639e10e68672101ad12ee394bd9`. Le package Windows 1.0.31/V31 et la publication Web de production ont réussi ; leurs preuves suivies sont listées ci-dessous.

## Cité du monde natal

La cité n’est plus traitée comme un grand rectangle latéral. Le terrain de 5 200 × 2 600 pixels utilise douze quartiers irréguliers reliés par neuf rues, corridors ou rampes. Treize bâtiments possèdent leur propre emprise et leur porte ; les accessoires arrière, au sol et au premier plan restent indépendants. Le déplacement suit le plan oblique, avec collision et glissement sur les polygones praticables.

Les services, preuves, habitants et expéditions antérieurs restent accessibles dans cette nouvelle topologie. Le héros et les habitants utilisent des plaques transparentes de personnages entiers. Quinze presets connus disposent d’une plaque Homeworld reliée au même identifiant de personnage. « Exact-ID » décrit cette correspondance de registre, pas une certification officielle ni une fidélité 1:1. Une apparence sans plaque dédiée utilise le corps modulaire générique du projet, sans emprunter l’identité d’un autre chasseur connu. Le héros se retourne selon sa direction de déplacement.

La recette publique Homeworld a réussi le 2026-09-12 à 16:24:10.796Z : douze quartiers, treize bâtiments, onze accessoires, treize plaques de héros observées, changement d’orientation, interactions avec le PNJ, la preuve et la porte, sans erreur JavaScript ni ressource en échec.

Le kit réemploie des modules et images du projet. Cette livraison ne constitue pas une nouvelle peinture 1:1 de toute la cité, une population complète, une poursuite Enforcer physique ou un cycle de vie de clan.

## THE PIT

La caméra de présentation recadre les deux combattants et leurs volumes de technique. Son centre et son zoom sont bornés, lissés et protégés par des zones mortes ; elle ne change pas les coordonnées du moteur de combat.

Le menu distingue les huit arènes réellement jouables d’un catalogue de cent concepts regroupés en cinq vagues. Les 92 fiches restantes décrivent une cible de production à six plans P0–P5 et des règles de transition équitables ; elles ne sont ni instanciées ni annoncées jouables. Les dix études patrimoniales servent uniquement à analyser la composition et exigent des visuels originaux du projet.

L’aide et le laboratoire sont repliables pour préserver l’aire de combat. Les quatorze combattants sur quatorze disposent d’une plaque bitmap statique dans THE PIT. Le combattant placé à droite regarde son adversaire ; City Hunter possède notamment sa pose gauche dédiée. Le lot V31 contient seize poses statiques et zéro animation. L’audit conserve donc 264 entrées d’animation manquantes : aucune pose fixe n’est comptée comme un clip animé.

## Pilote Oseris

Le premier niveau Oseris passe à une fondation verticale de douze salles reliées par quatorze connexions, réparties entre canopée, ruines hautes, sol et grottes. Des plateformes hautes, lianes conditionnées par la capacité, raccourcis et repères stables complètent le parcours. La caméra verticale suit ces nouvelles hauteurs sans modifier la physique générale des autres missions.

La carte est construite depuis la même topologie et masque les salles inconnues. La cible de 48 salles et huit sous-régions reste explicitement à produire ; cette V31 livre un socle jouable, pas le niveau commercial final ni tous ses décors propres.

## État de qualification

Les résultats observés sur le commit qualifié sont :

- `npm.cmd run qa:release` : réussite, 1 103 tests sur 1 103 ;
- projection V19 disponible : 464 paires master/runtime ;
- audit npm : 0 vulnérabilité signalée ;
- QA navigateur locale : PASS ;
- package Windows 1.0.31 / contenu V31 : PASS ;
- publication Vercel `dpl_CLqvEZyH37nCWxLSnqMW5HmUNtjK` : `READY`, cible `production`, [yautja-la-longue-chasse.vercel.app](https://yautja-la-longue-chasse.vercel.app), SHA Git `c3f39e0`.

La recette desktop a réussi à `2026-09-12T16:15:46.160Z`. Son digest source est `ab468a19b161c3909cd45b259399b0bd4959c9ea9bcdcfd9698545d7340aa71c`. L’EXE porte le SHA-256 `6459cd47f201c11965123cce7a7580f54f6199662fae3d421a3f04d946547c62` ; `app.asar` porte `fe31fc3ff906114583cc40647da5c14fffac173eee50774636d1fdf70a6333b6` et contient 2 132 entrées. Le ZIP `tmp/desktop-release/v31/Yautja-La-Longue-Chasse-PC-V31.zip` contient 77 entrées, mesure 465 811 593 octets et porte le SHA-256 `c3c222f1a61cada9e04d0e812e72abfdbbb19198edc4a951bbbb3b0cfac97e1d` ; sa recette date de `2026-09-12T16:16:48.992Z`.

La recette publique de l’archive intégrale a réussi à `2026-09-12T16:23:55.242Z` : réglages et preset, match et replay THE PIT, chasse Oseris suspendue, export sans écriture, import avec rechargement exact, conflits et concurrence, ainsi que l’affichage mobile. Elle a relevé zéro erreur JavaScript et zéro requête en échec. Les contrôles HTTP publics ont renvoyé 200 pour la racine et les quatre ressources V31 échantillonnées.

Preuves suivies :

- [desktop-v31-qa.json](desktop-v31-qa.json) ;
- [v31-public-browser-qa.json](v31-public-browser-qa.json) ;
- [v31-public-http-qa.json](v31-public-http-qa.json).

Ces recettes ne certifient pas une manette physique, la cadence sur matériel cible, une campagne commerciale complète, un installateur signé, Steam Deck ou les droits de commercialisation. Les 264 entrées d’animation restent à produire.
