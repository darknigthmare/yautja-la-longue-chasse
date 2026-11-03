# Liaisons verticales natives — module V82

Le module conserve les sept identifiants de `HOMEWORLD_CONNECTORS_V77`, leurs points physiques, les étages, les durées, l’accès narratif et les sauvegardes. Le responsable du rendu a branché ses dessins dans `HomeworldWorldSceneV77` avant le cull schématique et ajouté ses sources au préchargement HomeworldHub. Ces changements de source ne modifient ni le propriétaire d’une sauvegarde, ni un palier narratif.

| Liaison | Étages | Durée actuelle | Source artistique de ce module |
| --- | --- | --- | --- |
| Conseil | 0 → +1 | 8 s | Source native V77 conservée |
| Acropole | +1 → +2 | 12 s | Nouveau PNG noir-bronze et deux sockets enregistrés |
| Ascenseur des délégations | 0 → +1 | 5 s | Portique natif final, deux sockets et deux appuis ; cabine native séparée préchargée et liée au trajet |
| Descente des bas-quartiers | 0 → -1A | 11 s | Instance déclarée de la nouvelle rampe industrielle |
| Galeries basses | -1A → -1B | 7 s | Nouveau PNG propre court et large, deux sockets et deux appuis enregistrés |
| Ateliers | -1A → -1C | 10 s | Nouveau PNG de rampe et deux sockets enregistrés |
| Maintenance | -1C → -1B | 6 s | Nouveau PNG final diagonal, deux sockets et deux appuis enregistrés |

## Raccord des deux paliers

`homeworldConnectorArtV82(id)` expose une vraie source disponible ou `null`. `homeworldConnectorPlacementV82(connector)` renvoie une translation et une échelle uniforme positive. Les centres des deux paliers peints sont des sockets pixels explicites. Leurs homologues physiques sont projetés avec la caméra existante et les vraies élévations des étages. Une différence supérieure à 0,75 unité projetée refuse le dessin ; la petite erreur résiduelle reste exposée, sans promesse de géométrie CAD. Ni rotation, ni miroir, ni redimensionnement séparé de la largeur et de la hauteur ne sert à forcer un raccord.

La rampe de maintenance progresse de 450 unités vers la droite et monte de 360 unités sur l’écran. Une rampe frontale ne convient pas à ce vecteur. Les deux paliers physiques restent en place ; sa source finale dessine cette orientation nativement. L’ascenseur conserve lui aussi son fonctionnement propre : un escalier ne devient pas une cabine par changement de nom.

| Nouveau module enregistré | Dimensions pixels | Socket bas | Socket haut |
| --- | --- | --- | --- |
| Acropole | 1024 × 1536 | (512, 1350) | (512, 176) |
| Rampe industrielle / bas-quartiers | 1024 × 1536 | (512, 1290) | (512, 210) |
| Galeries basses | 1254 × 1254 | (627, 1040) | (627, 205) |
| Maintenance diagonale | 1536 × 1024 | (358, 860) | (1188, 196) |
| Portique final des délégations | 1024 × 1536 | (512, 1350) | (512, 400) |

Ces centres ont été choisis sur les paliers plats en affichant les sources pour leur préparation artistique, sans parcourir le jeu. L’enveloppe alpha à 128 provient d’une extraction de métadonnées du dessin ; les SHA sont ceux fournis par le responsable des sources. Les PNG restent inchangés. `HOMEWORLD_CONNECTOR_SCENE_SOURCES_V82` ne précharge que les sources réellement enregistrées. Le Conseil reste disponible via ses données V77. Le statut `NATIVE_SOCKETS_DEFINED` signifie que le dessin dispose de son contrat de placement ; il ne signifie pas que le parcours a été testé ou qu’une revue visuelle du jeu a été faite.

« Bas » et « haut » sont déterminés par les élévations physiques, jamais par les noms `from` et `to`. L’acropole part du palier bas ; les descentes partent du palier haut. La rampe utilise donc le même dessin intact dans les deux sens de parcours, sans miroir. L’escalier des galeries utilise son propre dessin court et large ; il ne rétrécit pas le grand escalier de l’acropole. La diagonale utilise un delta natif `(830, -664)`, exactement proportionnel au vecteur projeté physique inchangé `(450, -360)`. Les deux points restent à l’intérieur des deux paliers plats de ce dessin final ; aucune version trop plate ni image frontale tournée n’est consommée.

Le portique final `clan-lift-gantry-adult.png` possède son vrai palier haut à y400, et non à y610 demandé au générateur. L’échelle reste donc `520 / 950`, sans correction de perspective. Son portail peint d’environ 220 pixels correspond à environ 120 unités face au modèle adulte de 100 unités : ce sont des proportions nominales, sans preuve de parcours ni de dégagement obtenue par QA. La première source `clan-lift-fixed-frame.png` est conservée publiquement comme référence, mais n’est ni préchargée ni dessinée par le registre de raccords. Aucun ancien PNG n’a été supprimé.

La cabine est une autre image native de 1254 × 1254 pixels, `clan-lift-cabin.png`, avec son socket de sol `(627, 1030)`. Le responsable du rendu l’a branchée au préchargement et au renderer. Son échelle uniforme vaut celle du portique multipliée par 0,39. Elle repose à l’étage occupé et suit le vrai temps de trajet ; elle n’est pas peinte dans le portique fixe et ne dépend pas du compteur d’ambiance. Les premiers 8 % du trajet de cinq secondes recentrent doucement l’acteur sur le socket physique pour l’embarquement, puis la montée utilise la fraction partagée par le moteur, la caméra et le rendu. Centres, étages, durée totale, accès narratifs et propriétaire de sauvegarde restent conservés.

## Appuis parcourables et dessinés

`homeworldConnectorSupportsV82.ts` ne dépend que du JSON natif et de la géométrie de caméra. Le caller lui fournit les connecteurs et les élévations physiques. Après la définition des connecteurs, V77 expose `HOMEWORLD_CONNECTOR_PADS_V82` et ajoute ces polygones au même index de terrain que les rues. Le rendu, l’atlas et les faces de fondation consomment cette même liste, jamais un rectangle de collision distinct. Ce découpage évite le cycle entre le monde V77 et son registre de dessin V82.

Chaque source enregistrée définit un contour polygonal du palier bas et du palier haut en pixels. Ces points ont été choisis sur les vraies surfaces plates pavées des dessins. La même échelle uniforme qui place le PNG projette ces contours vers leur étage physique. Les coins biseautés et les épaules inégales de la rampe sont conservés ; la largeur ne vient ni de la boîte transparente, ni des ombres, ni d’un socle rectangulaire arbitraire. Le passage aérien entre étages ne devient pas une nouvelle nappe de terrain. Aucun mur, piédroit ou rail invisible n’est ajouté par ce helper.

Douze nouveaux appuis sont montés : deux pour l’acropole, deux pour chacune des deux instances de rampe, deux pour les galeries, deux pour la maintenance et deux pour le portique final de l’ascenseur. Le Conseil conserve les appuis et rails déjà définis dans V77. Aucun nouveau garde-corps invisible n’est produit par ce helper : les garde-corps visibles des nouveaux dessins restent des éléments natifs de leur source. Leurs contacts latéraux complets ne sont pas annoncés comme de nouvelles collisions physiques.

## Cohérence du décor

L’architecture est une création compatible avec le langage visuel Yautja du jeu : basalte porteur, métal patiné, bronze sobre et repères ambre. Elle n’est pas annoncée comme un ouvrage canonique reproduit 1:1. Les ouvriers, délégations, cages et charges doivent rester sur les terrasses et devantures existantes, hors des deux centres de palier et du passage central. Les structures latérales font partie du dessin ; ce module n’invente aucun rail physique invisible. La descente des bas-quartiers réemploie la source des ateliers : deux PNG couvrent trois instances de raccord, pas trois nouvelles illustrations.

Aucun déplacement de palier n’est demandé. Les appuis natifs apportent leurs terrasses plates et leurs épaules au modèle physique propriétaire, sans décaler les points pour masquer une perspective incompatible.

## État du travail

Cinq nouvelles sources structurelles V82 sont enregistrées et raccordées au renderer/préchargement, plus l’ancienne source Conseil V77 conservée. Elles couvrent les sept liaisons actuelles : la rampe industrielle est réutilisée pour deux raccords. La cabine indépendante est une source supplémentaire ; elle est préchargée et liée au trajet par le module du responsable du rendu. Les douze nouveaux appuis sont montés dans le terrain, le rendu, l’atlas et les fondations.

Ce lot monte les structures natives et leurs raccords de sol. Il ne fournit pas de nouvelles plaquettes natives d’ouverture/fermeture de cabine, d’actions de garde, de foule ou de mécanisme. Déplacer la cabine native suivant le trajet n’est pas une nouvelle plaquette d’animation dessinée. La cohérence de proportions reste une préparation artistique, pas un résultat de QA. Aucun test, audit, compilation, navigateur ni contrôle de publication n’a été effectué dans cette demande, conformément à la consigne explicite ; aucune réussite visuelle ou de parcours n’est revendiquée par ce document.
