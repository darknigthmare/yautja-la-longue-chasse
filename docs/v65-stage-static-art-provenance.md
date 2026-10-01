# THE PIT V65 — six révisions statiques originales

Ce lot remplace les compositions actives de six arènes existantes. **Il n'ajoute aucun stage au catalogue, aucun événement de fond et aucune animation.** La réconciliation du classeur V63 retrouvait déjà une correspondance runtime pour ses 174 dossiers, vers 170 cibles parmi 187 arènes. Les dossiers sans registre récent d'animations ne sont pas des décors absents et ne sont pas déclarés terminés par ce lot statique.

## Livraison native

**12 PNG OpenAI acceptés, 30 dessins statiques** : six fonds P0 et six atlas de quatre objets indépendants destinés à P1, P2, P3 et P5. Les atlas sont découpés au rendu par rectangles source mesurés ; les PNG natifs ne sont pas retouchés, recomposés ou rééchantillonnés hors moteur. P4 réemploie les sols existants, avec cadrage et couverture vérifiés séparément par l'intégration.

Les **14 appels de génération** incluent deux corrections : marges de la plaquette 050, puis finition du sommet du support 069. Les deux images intermédiaires restent conservées aux chemins natifs consignés dans les reçus. Les anciens fonds/modules ne sont ni supprimés ni écrasés. Les IDs des stages restent inchangés pour les sauvegardes et replays.

| Arène | Dossier et cellules de définition | Défaut observé dans l'ancien fond | Nouveau langage visuel |
| --- | --- | --- | --- |
| 012 · Balcon du Roi de la Chasse | ST064 · 09_STAGES!A68:N68 | Tours de forteresse élancées et arcs génériques | Abri de clan sous canopées rocheuses, nervures métalliques, côte aride |
| 020 · Trône Fracturé | ST072 · A76:N76 | Très hauts arcs de cathédrale endommagée | Loge basse fracturée, câbles ancrés, siège de clan physique et brisé |
| 036 · Temple de la Double Lune | ST088 · A92:N92 | Temple à spires, monumentalité fantasy | Poste de clan nocturne, capteur astronomique mécanique, deux lunes conservées comme motif original |
| 050 · Porte de l'Audience | ST102 · A106:N106 | Grands visages/masques monumentaux et escalier de sanctuaire | Sas technique horizontal dans l'escarpement, terminal d'accès et supports câblés |
| 069 · Salle du Porte-Cendres | ST120 · A124:N124 | Brasero suspendu sans technologie explicite | Chambre géothermique, échangeurs fermés, conduites fixées et coffre scellé |
| 076 · Atrium des Médiateurs | ST127 · A131:N131 | Palais monumental à ornements dorés | Atrium bas, roche et renforts pratiques, banc de médiation |

Les noms historiques restent des noms originaux du projet. « Roi », « Temple » ou « Porte-Cendres » ne prouvent pas une organisation politique, une religion ou une technologie canonique de l'ensemble de l'espèce. Le motif à deux lunes de 036 ne décrit pas l'astronomie canonique du monde natal.

## Références consultées

- [Alex Nice : travail de conception Homestead pour Predator: Badlands](https://www.linkedin.com/posts/alexniceartist_predatorbadlands-yautja-predator-activity-7405352080015622144-QEtm). Billet de l'artiste de production relu ; deux captures de ses images examinées dans `work-local/v64/references/alex-nice-linkedin-1.png` et `alex-nice-linkedin-2.png`. La première sert de référence de matériaux et de formes aux six fonds. Les nouveaux plans ne reproduisent pas exactement ce bâtiment.
- [The Yard VFX : Designing Yautja Prime in Predator Badlands, 15 avril 2026](https://theyard-vfx.com/2026/04/15/designing-environments-predator-badlands/). Source primaire de l'équipe VFX, texte consulté pour la géologie et la cohérence de construction des espaces. L'accès direct aux images WebP par l'outil web a renvoyé « cache miss » : celles-ci ne sont pas présentées comme des images effectivement inspectées dans ce lot.

Ce travail constitue une **adaptation originale inspirée par des références de production**, pas six lieux canoniques reproduits 1:1. L'absence d'effigies dans ce lot est un choix de correction des monuments génériques précédents ; elle n'affirme pas que le canon ne contient aucune statue.

## Contrôles et preuves

Les douze images acceptées ont été vues. Le script `scripts/measure-pit-static-art-v65.mjs` vérifie l'identité SHA des copies natives, la présence d'alpha dans chaque atlas, l'affectation unique de tous ses pixels visibles aux quatre cellules et l'absence d'objet touchant le bord de la toile : **30 contrôles natifs réussis**. Aucun découpage arbitraire en quatre carrés : les colonnes inégales des images générées sont mesurées dans les espaces transparents.

Les prompts exacts, chemins d'origine, dimensions, SHA et éventuelles variantes rejetées figurent dans les douze reçus `docs/v65-generation/`. `docs/v65-stage-static-native-qa.json` conserve les crops et le résultat du contrôle natif. La recette du compositeur, les captures avec combattants et les parcours dans le vrai jeu sont des étapes distinctes, pilotées par les rapports d'intégration V65. Un contrôle de pixels seul ne certifie ni le placement final ni une livraison complète des dossiers du classeur.

Le sous-lot 076 a été généré par l'agent principal puis relu et mesuré indépendamment par l'agent stages. Les cinq autres paires ont été produites et examinées par l'agent stages ; l'agent d'intégration apporte une relecture de composition et de cadrage.

La version figée du compositeur réussit **60 contrôles de caméra sur six scènes, avec 66 captures produites**. La relecture indépendante finale porte sur les six vues `actual-camera` et les vues larges de 020 et 036, soit huit captures. Deux défauts repérés ont été corrigés avant cette validation : le socle du trône 020 est raccordé au sol ; les deux PNG techniques de sol 020 remplacent les anciens reliefs génériques dans la composition active de 036, sans supprimer ni retoucher les sources. Le cadrage de 036 conserve ses deux lunes. `docs/v65-stage-static-visual-review.json` consigne les captures et les SHA des sources effectivement contrôlées. `docs/v65-stage-static-art-delivery.json` fige les métriques du lot ; ces deux preuves ne certifient pas encore le parcours de l'application ou la publication.

## Travail restant

Les autres décors originaux n'ont pas tous fait l'objet de cette révision. La Forge 010, le Mausolée 013 et la Cour des Navigateurs 014 ont notamment été repérés comme candidats à un prochain audit de vocabulaire architectural, sans être comptés corrigés ici. Les 181 autres arènes du catalogue ne sont pas certifiées visuellement par ce lot. Une correspondance de fichiers pour les 174 dossiers du classeur ne vaut pas validation artistique de ces 174 dossiers.

Les 18 descriptions d'animation associées aux six dossiers (E194–E196, E218–E220, E266–E268, E308–E310, E362–E364 et E383–E385 de `10_VIE_DES_STAGES`) ne sont pas livrées par cette révision statique. Aucun événement ni condition scénarisée du classeur n'est clôturé par cette livraison, conformément à la demande de ne pas travailler les animations de stages dans ce lot. Le contrôle visuel du compositeur, le parcours dans l'application et la vérification publique restent des preuves distinctes ; le présent document ne remplace pas leurs rapports.
