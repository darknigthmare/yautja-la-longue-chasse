# Raccords physiques et mobilier civil V72 — intégration publique V73

Les dix sorties régionales se trouvent désormais au bord de la cité, sous des portiques ouverts reliés aux rues par de vrais chemins. Les anciennes bornes restent aux coordonnées originales comme panneaux d’orientation. Elles ne proposent plus un départ au milieu d’une place. Les retours utilisent le parvis situé 70 unités devant le même seuil.

Les dix territoires, leurs deux types d’actions existantes et leurs permissions sont conservés. Les enquêtes des Cendres et du Verre gardent leurs propres conditions V67 ; les visites régionales utilisent V68. La Réserve ne devient pas accessible par une simple modification du décor. Le grand pont ou la traversée complète appartient au trajet régional existant, au-delà du portique local : aucun ravin artificiel ni pont flottant n’a été ajouté sous les rues de la ville.

## Coordonnées et mesure

Toutes les coordonnées suivantes sont des unités physiques du sol, avant projection. La caméra orthographique regarde vers le nord, à 35° ; seuls les sols sont projetés en Y. Les sprites verticaux gardent une échelle uniforme et leur pivot est le bord avant du contact au sol.

| Région | Seuil physique X / Y | Retour sûr X / Y | Ouverture |
| --- | --- | --- | --- |
| Marches des Cendres | 500 / 2290 | 500 / 2360 | 220 u |
| Désert de Verre | 3850 / 5530 | 3850 / 5600 | 220 u |
| Jungle des Piliers | 2900 / 180 | 2900 / 250 | 200 u |
| Marais Lumineux | 6540 / 2080 | 6540 / 2150 | 220 u |
| Chaîne des Orages | 4140 / 90 | 4140 / 160 | 200 u |
| Côte du Léviathan | 500 / 1030 | 500 / 1100 | 220 u |
| Cavernes Thermiques | 4600 / 4350 | 4600 / 4420 | 180 u |
| Couronne Froide | 5750 / 230 | 5750 / 300 | 220 u |
| Ruines de la Première Cité | 720 / 230 | 720 / 300 | 200 u |
| Réserve Interdite | 6580 / 3370 | 6580 / 3440 | 220 u |

Le modèle pur `homeworldRegionConnectionsV72.ts` ne dépend pas de City à l’exécution. Il exporte le réseau de polygones, les sockets, les deux bases latérales de chaque portique, les meubles et les bornes. City peut donc importer les mêmes coordonnées pour la marche, les collisions et les points d’interaction sans boucle de dépendance. Les modèles de mobilier et de sol ne donnent aucune autorisation.

Le chemin des Ruines contourne la nouvelle aile des archives par l’ouest. Il ne traverse pas la maçonnerie. Une jarre côtière qui étranglait le passage devant le registre a été déplacée sur une épaule à X790 / Y1630 ; les 43 portes sont à nouveau accessibles depuis le point d’arrivée du héros.

## Assets réellement générés et conservés

Deux PNG transparents ont été générés avec l’outil OpenAI natif : un atlas de quatre portiques et un atlas de douze meubles. Les sources complètes, leur alpha et les images antérieures sont conservés. Les cellules sont seulement découpées au rendu par des cadres CSS ; aucune silhouette n’a été redessinée par script. Les rects natifs, pivots, appuis et ouvertures transparents figurent dans les deux JSON de mesure et dans le codex du jeu.

Le mobilier comprend siège cérémoniel, poste de registres, établi de calibration, couche de soins, gong, support de parures, réserves scellées, veilleuse, table commune, caisses, marque de maison et banc. Quarante instances séparées meublent les épaules des raccords ; les ailes intérieures de l’autre chantier utilisent le même kit indépendant suivant leur fonction. Les objets sont solides, ancrés au sol, triés par Y, chargés selon la vue et atténués s’ils masquent le héros.

Architecture, dimensions, meubles civils et ville sont des adaptations originales compatibles avec l’univers, pas la reproduction d’une carte canonique. Les motifs non lisibles ne sont pas présentés comme un alphabet officiel. Les prompts, dimensions et hashes SHA256 exacts sont archivés dans `v72-homeworld-connections-generation.json`.

Le codex intégré ajoute 100 fiches : dix portiques, dix ouvertures de départ, vingt appuis, dix raccords au sol, quarante meubles et dix anciennes bornes directionnelles. Chaque fiche décrit l’asset réel, la position, la taille, l’emprise, les limites de lore et les liens vers ses éléments associés. La boîte d’un raccord est une enveloppe de plusieurs polygones ; toute cette boîte n’est pas un rectangle praticable.

## Références primaires et contrôles

[Tiled, objets et collisions](https://doc.mapeditor.org/en/stable/manual/objects/) guide la distinction entre origine du sprite et empreinte au sol. [Unity, tri individuel des sprites](https://docs.unity.com/en-us/engine/6000.7/manual/unity2d/tilemaps/isometric-tilemap/create-isometric-tilemap) guide la séparation des objets et le tri par ancrage. Ces principes sont adaptés à la projection déjà utilisée ; ils ne fournissent aucune carte ni mesure canonique yautja.

La suite `homeworld-connections-v72.test.mjs` comprend neuf contrôles : dix seuils/retours conservant les identités, tous segments avec le corps entier, vingt bases solides et centres libres, quarante emprises hors routes/maçonneries/props existants, dix parcours depuis les anciens repères, les 43 portes et dix sorties depuis le spawn, les sources PNG et ouvertures natives, les 100 fiches liées et le montage réel du renderer avec culling. Les neuf contrôles passent sur la géométrie finale.

La preuve navigateur séparée est produite par `scripts/verify-homeworld-connections-v72.mjs` sur la version publique V73 : marche clavier vers les dix seuils, deux départs/retours immédiats, interface portrait, codex en lecture seule, hashes des assets servis et erreurs JavaScript. Après le retour immédiat au bon seuil, une recharge vérifie que le trajet durable reste effacé et les preuves, contrats et acquis de campagne sont conservés. Elle replace le héros au Port suivant le contrat existant : la position instantanée d’une visite de la cité n’est pas un checkpoint sauvegardé. Les prérequis antérieurs sont joués par le modèle dans une sauvegarde QA isolée ; cela ne prétend pas rejouer chaque long trajet régional ni l’intégralité de la campagne.
