# V131.1 — lacs/chenaux V115 et transitions côtières

Correctifs dans la PR #39, sans nouveau format de sauvegarde.

Le masque de terres du moteur prend maintenant en compte les *hydrology.features* de V115 comme celles de V103. Les lacs et chenaux ne peuvent plus apparaître solides sur le globe alors que le PNG indépendant les désigne comme fluides.

Le masque côtier dédié conserve le canal rouge pour les identifiants de régions et la valeur sentinelle « milieu natif ». Son canal bleu encode la contribution visuelle d'une matière côtière : fondu progressif sur les derniers 35 % de la distance réelle autorisée (300, 900 ou 1 800 km). Le shader applique la même contribution à l'albédo et au calcul d'éclairage GGX du milieu.

Un bouton du panneau V131 exporte séparément le masque 512×256 PNG (R=indice, B=fondu, A=255) sans changer le ZIP V128 rétrocompatible.

QA : tests de pure fonction sur les dégradés ; contrôle navigateur de l'absence de chevauchement de pixels opaques entre masques de lacs/chenaux et terres V115 ; nouveau téléchargement du masque et vérification des valeurs de canal.
