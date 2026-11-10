# Revue du recalage vertical au sol

## Mesure et décision

Le candidat [`floor_anchor_candidates.json`](floor_anchor_candidates.json) couvre 224 images sur 14 pages : attente, trois phases de visée, impact, scan, deux gestes de camouflage, soin A/B, Second Wind A/B et mort A/B. Les quatre pages de canopée et l’impulsion aérienne sont exclues.

Pour chaque cellule source réelle, la mesure choisit la dernière rangée qui contient au moins huit pixels d’alpha ≥128. `floorY` est le **centre de cette rangée**, soit son indice entier +0,5 ; ce n’est pas son bord inférieur. Le pivot X d’origine est conservé. La cible de revue commune Y=302,5 implique uniquement des translations verticales entières. Aucun pixel, redimensionnement, appui horizontal, déplacement dans le monde ou timing du jeu n’est modifié.

SHA-256 du candidat immuable : `39c7dcf81223892f0df6cd91cd6cf7d0c54929ee2897d3ca7e759a50284bbf70`.

Le responsable de la tâche a autorisé l’application de ce candidat aux métadonnées de présentation après la revue des contacts. Le candidat conserve intentionnellement son statut historique « non appliqué ici ». Le reçu d’application et le [contrôle indépendant final](FINAL_VERIFICATION.md), qui confirme les 224 pivots et la conservation exacte des pixels, sont distincts de ce document de mesure.

## Contacts examinés

La [planche des contacts](floor-contact-samples.png) présente douze échantillons entiers : attente 01, visée maintenue 01, soin A16/B01, Second Wind A16/B01/B16 et mort A01/A16/B01/B08/B16. La ligne bleue matérialise la rangée retenue ; les images sources ne sont pas modifiées.

L’inspection visuelle de l’assistant retrouve les orteils ou appuis bas dans les poses debout et accroupies, les appuis main/genou dans les poses de reprise, puis le bas du corps et l’avant-bras dans les poses couchées. Cette classification ne transforme pas le calcul en contact anatomique certifié : le proxy suit la silhouette basse visible, selon la pose.

La variation des seuils d’alpha à 96/160 ou du nombre minimum de pixels à 6/10 déplace la mesure d’au plus une rangée sur les 224 images. La règle ignore au maximum une rangée opaque plus basse contenant moins de huit pixels. Après la translation proposée, toutes les boîtes visibles alpha ≥16 restent entre Y=2 et Y=305 sur les cellules exportées de 314 px ; il n’y a donc pas de coupe visible induite par ce recalage dans ces cellules.

## Résultat et limites

Les dérives importantes de sol proviennent surtout de Second Wind B, dont les centres d’appui vont de 285,5 à 306,5, et de mort B, de 278,5 à 291,5. Le recalage les ramène à une ligne commune, en conservant la position de chaque membre par rapport aux autres pixels de son dessin.

Le [comparatif A/B](ab-seams-floor-review.png) montre également ce qu’une translation ne répare pas : changement de volume entre les deux pages de soin, inclinaison différente au raccord de Second Wind, torse plus relevé au début de mort B. Le recalage ne remplace ni la correction de ces dessins ni le choix des phases lors d’une future intégration. Les chiffres de recouvrement des silhouettes sont documentés dans [`ab-seam-measurements.json`](ab-seam-measurements.json) ; ils ne mesurent pas la fluidité temporelle.
