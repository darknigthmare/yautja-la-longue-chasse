# Objectif actuel dans l’Atlas — V110

Le bouton « Objectif actuel » rejoint désormais la prochaine étape du travail en cours. Auparavant, même une plaque K‑17 portée ou une manutention interrompue renvoyait vers le parcours introductif.

Le fournisseur lit les reçus stricts du propriétaire affiché : étude K‑17, lots du quai, comparaison C, dossiers A/B et relevés cartographiques local ou depuis le viaduc. Il distingue observation, copie de provenance, prise, support compatible, accord, comparaison, traverse et retour. Une interruption ordinaire indique le dernier point confirmé et son véritable étage ; la reprise documentaire K‑17 après échec indique le poste de l’archiviste.

Les opérations en travail ou en retour précèdent les interruptions, puis les dialogues acceptés et l’offre non acceptée. Cet ordre reste déterministe même pour une entrée contradictoire ; les imports de partie conservent leurs propres refus d’opérations simultanées. Les registres étrangers, futurs, malformés ou relatifs à un quai non visité ne produisent aucun objectif d’opération. La comparaison C requiert toujours le dépôt A/B terminé. Sans travail en cours, l’objectif et les repères historiques sont conservés.

L’Atlas montre l’instruction avant même de sélectionner le repère. Le nouveau worker et le planificateur V110 utilisent les mêmes sols, emprises de cargaison, portes et raccords que V109, avec le registre des étapes V110. Un changement d’étape, d’emplacement, de propriétaire ou de géométrie invalide la proposition précédente. Les reprises ordinaires exigent une arrivée à trois unités du dernier point ; consulter ou suivre le repère ne reprend jamais le travail et ne donne aucun accord ni résultat.

Les reçus et les moteurs V104–V109 restent inchangés. Aucune exigence artistique, BODY professionnel ou progression globale n’est déclarée terminée par ce guidage.

## Vérification

`node tests/homeworld-objectives-v110.test.mjs` couvre les actions réelles K‑17, les deux accords de la manutention B et la traverse, le transport de C et les deux observations, les objectifs cartographiques, les refus de données étrangères et la péremption d’une réponse du worker. Le rendu SSR vérifie le bouton, l’instruction et le repère sélectionnable ; il ne certifie pas le rendu visuel ni le comportement navigateur. La recette navigateur V110 est publiée séparément avec son build et ses captures.
