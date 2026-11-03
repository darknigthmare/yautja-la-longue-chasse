# Architecture native oblique V76

Six bâtiments civiques secondaires possèdent désormais une vraie vue trois quarts raster : atelier des convois, contrôle des quais, sanctuaire des rites, mausolée, poste des remparts et dépôt des convois. Les six vues alternent côté gauche/côté droit. La caméra du monde reste orthographique, yaw0 et pitch35 ; le dessin et le volume du bâtiment tournent au sol. Aucun miroir, rotation CSS, étirement, recadrage ni transformation des pixels générés n’est utilisé.

Leurs treize PNG historiques V75 restent tous byte exact. Les six principaux V72 et les vingt-quatre logements n’ont pas de remplacement d’image dans ce lot. La cité, ses institutions et ces façades sont une création originale du projet adaptée à son univers ; elles ne constituent pas une ville canonique reproduite1:1.

## Mesures des six images acceptées

Chaque PNG est indépendant,1536×1024 RGBA, transparent hors silhouette et opaque dans le renfoncement de porte. Le sens gauche/droite et la valeur d’angle viennent des véritables points d’appui, non d’une valeur de prompt appliquée artificiellement.

|Bâtiment|Angle mesuré|Largeur utile au seuil|Hauteur verticale utile minimale|
|---|---:|---:|---:|
|Atelier des convois|−21,91°|101,98u|186,02u|
|Contrôle des quais|+23,91°|115,38u|212,03u|
|Sanctuaire des rites|−20,33°|135,11u|208,07u|
|Mausolée|+22,45°|110,59u|160,97u|
|Poste des remparts|−22,08°|131,75u|217,83u|
|Dépôt des convois|+24,28°|148,43u|177,71u|

Les angles demandés étaient±25° ; le résultat accepté est approximatif, environ20–24°. Les modèles utilisent exactement les angles mesurés. Les portes dépassent toutes90u de largeur et128u de hauteur. Le volume conserve570u de largeur et340u de profondeur, orientés suivant le dessin natif.

## Contrat de mesure et physique

Le registre pur `homeworldArchitectureArtV76.ts` exporte `HOMEWORLD_ARCHITECTURE_IDENTITIES_V76` et `homeworldBuildingIdentityV76(id)`. Les identifiants inconnus renvoient `null` ; le module n’importe pas le modèle de cité. Les données complètes, coordonnées de pixels, SHA256 et références V75 sont dans `homeworldArchitectureArtV76.json`.

Les quatre points `groundFrame.frontLeft/frontRight/doorLeft/doorRight` sont locaux à chaque source native. Les appuis avant sont les contacts réels des socles latéraux. Les points de porte délimitent l’ouverture utile entre les pieds des jambages, et non les bords extérieurs de leur cadre. Le seuil est leur milieu. Sa position n’est pas déplacée pour cacher un défaut de dessin.

Le facteur d’échelle est570 / hypot(dx,dy / sin35), calculé sur le segment des appuis avant. La hauteur utile est le minimum des deux hauteurs verticales du passage ; la boîte englobante inclinée n’est pas utilisée comme hauteur. `foundationFront` demeure la boîte historique x/ymoyen pour provenance. Elle ne remplace pas `groundFrame` pour l’échelle orientée.

Les piliers avancent parfois devant le seuil ; cette profondeur native reste visible dans les mesures. Aucun plafond artificiel de recul de11u n’est imposé aux nouveaux dessins. La géométrie partagée transforme les appuis en un rectangle orienté340u derrière le socle, puis calcule une approche de70u suivant sa normale et une ouverture suivant les pieds de jambages. Le terrain vide aux coins du rectangle englobant n’est pas une paroi invisible.

Pour dégager les approches réelles, les routines et le guidage avec son corps complet, le lot partagé V76 déplace cinq implantations, par rapport aux positions V75 :

|Bâtiment|Offset monde x/y|Seuil final monde x/y|Motif|
|---|---:|---:|---|
|Contrôle des quais|−110/+20|540/2965|Couloir occidental entre le quai, le mobilier et les maisons du port.|
|Mausolée|−240/−50|680/1965|Promenade des archives, parcours du porteur et route des Ruines conservés.|
|Sanctuaire des rites|+200/−60|3600/901|Trois routines du temple et patrouilleur des arènes dégagés.|
|Atelier des convois|+120/−40|1880/4191,5|Repère « QUAIS » dégagé avec le corps de guidage36×26, et manutention préservée.|
|Dépôt des convois|−20/−60|2610/4094|Allée de la messagère libre devant le dépôt orienté.|
|Poste des remparts|0/0|5840/2821|Position conservée.|

Les43 identifiants de porte, services,37 intérieurs secondaires et formats de sauvegarde sont conservés ; les positions de toutes les portes ne sont donc pas inchangées. Ces offsets appartiennent au module pur `homeworldBuildingPlacementsV76.ts`, pas au registre d’image. Les six principaux V72 et les24 maisons ne sont pas déplacés. Les volumes et les pixels ne sont pas réduits pour obtenir ces passages.

## Devantures et raccords physiques

`homeworldFrontagePlacementsV76.ts` fournit les positions partagées entre rendu, collisions et codex. Les12 meubles civiques existants des six bâtiments orientés gardent leur identifiant, PNG, échelle et empreinte. Le repère local `u` suit le vrai socle ; `vFront+distance` suit sa normale au sol. Ce ne sont pas des rotations ou décalages CSS.

La règle ordinaire place les meubles à `u=±.36×570`, `vFront+100`. Les exceptions mesurées dégagent les corps entiers et les décors antérieurs :

|Devanture|u|Distance devant le socle|Motif|
|---|---:|---:|---|
|Quai, registre gauche|−.28×570|80|Ouvrir l’échappatoire occidentale vers la ville, sans couper le trajet de Kesh àx265.|
|Quai, colis droits|+.44×570|100|Éviter la maison voisine du port.|
|Rites, veilleuse droite|+.48×570|140|Libérer la vraie approche de l’ancien repère des Trois Vents ; `.44` seul était insuffisant.|
|Atelier, colis droits|+.36×570|160|Séparer leurs bases du coffre historique `life-v68-14-0`, sans supprimer aucun objet.|

Les six balises V64 conservent leur source et leur base entière48×45. `homeworldBeaconPlacementV76` place chacune sur son propre parvis : quais(u270,+145), mausolée(u−100,+150), rites(u110,+145), atelier(u100,+140), dépôt(u160,+80), vigie(u100,+135). Les autres balises historiques gardent leur ancienne formule. La balise du quai reste côté est pour ne pas refermer la sortie occidentale.

Le banc historique du mausolée conserve son PNG et sa base150×40 ; `homeworldBenchPlacementV76` le place dans la baie d’attente orientale (u100,+180), au point(700,45 ;2177,38). Les trois autres bancs civiques gardent leurs positions historiques. Un véritable sol peint et physique relie le parvis à l’ouverture de la chaussée des Cendres : quad(440,2070),(630,2070),(630,2220),(440,2220). Sans cette allée, le seuil du mausolée était libre mais isolé ; déplacer la balise seule ne réparait pas l’accès.

`homeworldForecourtsV76` ajoute six parvis natifs (uMin−45..uMax+45,vFront−12..vFront+220). Le bord occidental du mausolée commence àuMin+30 afin de conserver la plantation historique voisine. La même liste de sept polygones alimente peinture, terrain, masques et codex. Aucun espace public n’autorise à traverser une paroi, un meuble ou un pilier régional.

## Génération et inspections

Treize appels réels au générateur OpenAI intégré ont été nécessaires : six premières vues, six corrections d’angle/sol, puis une correction supplémentaire du sol de l’atelier. Les premières vues avaient des angles trop faibles et une marche de seuil. Le premier correctif de l’atelier présentait encore une face verticale sous le passage ; il a été rejeté et redessiné nativement. Les candidats restent conservés dans `work-local/v76/architecture-candidates` ; les sources générées et les PNG V75 ne sont pas supprimés.

`v76-homeworld-architecture-generation.json` conserve les prompts, références, sources des13 appels et le SHA de chaque image finalement acceptée. Les copies publiques sont les octets générés, sans retouche algorithmique. La présence de la porte sans marche est contrôlée visuellement ; les mesures alpha ne constituent pas une reconstruction automatique de hauteur3D.

## Vérification

Les15 tests ciblés de `tests/homeworld-architecture-v76.test.mjs` passent. Ils couvrent les six sources, dimensions/alpha/SHA,24 points de contact natifs,54 sondes opaques des cavités,30 sondes de terminaison du sol, angle réel, hauteur minimale des jambages, échelle uniforme et projection des seuils/appuis dans la géométrie orientée. Les13 sources V75 sont vérifiées inchangées et les13 appels sont retracés dans la provenance. Le script de métrologie ne modifie aucun fichier image.

La recette `scripts/verify-homeworld-angles-v76.mjs` est prête et sa syntaxe est validée. Elle réalise six approches, entrées et sorties au clavier, vérifie le raccord DOM de l’image/du marqueur/du volume, exclut rotation/miroir/étirement, inspecte le port393×852 et les six fiches d’orientation du codex, puis vérifie HTTP200/SHA des six sources servies. Elle écrit rapport, progression et15 captures dans un dossier dédié.

Commande de recette : définir `V76_QA_URL` à l’URL du serveur final, `V76_ANGLES_QA_OUTPUT` au dossier local ou public voulu et `YAUTJA_QA_EXPECTED_VERSION=V76`, puis exécuter `node scripts/verify-homeworld-angles-v76.mjs`.

La première recette visuelle locale (9 contrôles,15 captures) est conservée dans `work-local/v76/first-candidate/qa/angles-local` ; elle précède les dernières corrections d’implantation et ne représente pas la source finale. Les vérifications physiques finales utilisent tous les décors réellement réintégrés, jamais une liste d’obstacles expurgée. Le diagnostic `work-local/v76/verify-final-placements.mjs` contrôle43 polygones/903 paires,40 mobilier régionaux/1720 comparaisons SAT,12 bases de devanture,6 balises et le banc historique, la navette,43 chemins de porte,10 arrivées régionales,10 anciens repères et98 routes corporelles à pas0,5u. Le contrôle des contacts ne doit plus cacher un habitant dans une marge alpha vide du PNG.

Ce diagnostic final passe avec les70 solides V76 chargés : `work-local/v76/final-placement-short-report.json`. Les20 tests natifs V76 et de vie urbaine V68/V69 passent également, sans skip ni échec (`work-local/v76/native-life-final.log`). Les13 anciennes images V75, les6 nouvelles sources, les empreintes et les trajectoires ne sont pas exemptées pour obtenir ce résultat. Le repère des Trois Vents dispose d’un vrai itinéraire1226,89u vers son arrivée régionale ; le guidage garde sa grille32u et sa marge12u.

État avant nouvelle compilation coordonnée : sources natives et corrections de placement disponibles ; parcours navigateur final et production encore à rejouer sur la nouvelle source. Une publication, son état READY et une vérification publique sont des preuves séparées.
