# V143 — invalidation des images périmées du globe et du planisphère

Le canvas de la V101 effaçait son ancien rendu seulement lorsque l'identifiant de la **planète** changeait. Avec les V134/V135/V141/V142, le même monde peut modifier indépendamment la qualité PBR, l'albédo régional, l'eau, les côtes, la caméra, la projection et la météo. Pendant le recalcul WebGL, l'ancienne image pouvait rester présente et même porter le statut « ready ».

Le mécanisme V143 établit une **identité de rendu** à partir du vrai code du monde, de la caméra/projection, du calque, des paramètres de composition, de l'indice de révision du renderer et des matières/semences de chaque région. Lorsque cette identité change :
- le canvas efface immédiatement l'ancien rendu lors du prochain frame de dessin et appelle `onReady(false)` pour réafficher le SVG de secours de l'atlas ;
- le statut `data-render-status` n'est « ready » que si la signature **terminée** correspond à la requête courante, pas seulement au dernier appel réussi sur le même monde ;
- un rendu annulé ne publie jamais « ready ». Une erreur de chargement ou de shader vide le canvas et restaure le fallback sans rejet asynchrone non géré ;
- l'identité ne dépend pas de l'adresse mémoire des objets React, uniquement de la configuration effective. Le même profil importé deux fois n'oblige pas une autre identité de contenu.

La mesure ne change aucun modèle de biome ni la géographie. Tests du domaine V143 sur les transitions de qualité, projection, caméra et materiaux. QA Chromium vérifie la signature avant/après application V134 et après restauration native.

Ce patch ne constitue pas une certification artistique officielle 1:1 et ne prétend pas à l'essai physique de chaque GPU mobile.
