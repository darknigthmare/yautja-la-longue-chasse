# Revue des trois séquences A/B

Les six pages retenues ont été inspectées, puis leurs poses A16 et B01 comparées sur fond gris neutre, à l’échelle native et avec le seul recalage vertical proposé. Les sources restent intégralement inchangées. Les mesures et les planches sont liées au candidat de sol et aux SHA des sources.

| Séquence | Appui A16 → B01, centres de rangée | IoU natif → après recalage Y | Observation visuelle et limite |
| --- | --- | --- | --- |
| Soin | 301,5 → 302,5 px | 0,809 → 0,806 | Le geste du petit outil sur la jambe et la position accroupie se poursuivent. B01 est plus volumineux et son casque/torse remonte par rapport à A16. Le raccord demande une reprise artistique ; aligner le sol ne corrige pas le volume. |
| Second Wind | 301,5 → 286,5 px | 0,690 → 0,727 | B poursuit le relèvement jusqu’à la position debout. L’appui initial de B est environ 15 px trop haut dans sa cellule et la posture se penche davantage vers l’avant. Le recalage corrige la ligne de sol, pas ce changement d’inclinaison ni la pose des bras. |
| Mort | 300,5 → 278,5 px | 0,503 → 0,670 | B poursuit vers une chute de côté complète et non graphique, sans reprise. Le premier torse B reste plus relevé après alignement du sol ; le raccord ne peut donc pas être déclaré continu. Les dernières poses restent couchées et la lecture doit tenir la dernière image. |

**IoU** signifie intersection sur union des silhouettes alpha ≥128. Ce diagnostic est calculé sur des masques, pas sur l’anatomie ou la vitesse des membres. L’augmentation du score de mort ne suffit pas à valider son raccord ; la légère baisse du soin ne constitue pas une dégradation des pixels, qui sont conservés.

Les trois pages B passent les contrôles de fond transparent et de bord réel : aucun pixel alpha ≥16 au bord des cellules et aucune silhouette alpha ≥128 coupée. Chaque page contient seize images distinctes après neutralisation analytique des pixels alpha <16. Les poses ont une progression visible ; la production reste `draft` et les différences de volume, d’appui horizontal et de pose mentionnées ici restent à traiter dans la revue artistique.

Preuves : [`FINAL_SOURCE_QA.json`](FINAL_SOURCE_QA.json), [`VISIBLE_FRAME_UNIQUENESS.json`](VISIBLE_FRAME_UNIQUENESS.json), [`ab-seam-measurements.json`](ab-seam-measurements.json), [comparatif A/B](ab-seams-floor-review.png), [contacts au sol](floor-contact-samples.png).
