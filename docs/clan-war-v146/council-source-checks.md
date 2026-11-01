# Conseil V146 : cohérence des reçus W133

Le dossier W133 est produit depuis un état local. Le SHA V6 et la cohérence entre
l'état et son reçu ne constituent ni une signature, ni une preuve que la partie
s'est effectivement déroulée comme décrit. Aucune mutation de campagne V85 n'est
autorisée par ce dossier.

Le contrôle reconstruit la mission et la carte à partir du catalogue V6 fourni :
phase terminale, identifiants de carte et planète, cellules source, ordre des
objectifs et identifiants des formations sont contrôlés avant de produire le
dossier. Une victoire requiert tous les objectifs et, lorsqu'elle existe,
l'extraction de l'escorte. Les noms, unités, positions et actions ne sont pas
certifiés par un serveur ; le contrôle n'est pas un anti-triche complet.

Le test `clan-war-council-v146.test.mjs` essaie notamment des modifications
cohérentes du reçu *et* de l'état, ainsi qu'une victoire prématurée. Le test
`clan-war-rts-squads-v133.test.mjs` vérifie que les 24 scénarios W3 terminés
par parcours d'objectifs isolé restent recevables. Ce parcours désactive les
ennemis et les aléas ; il ne démontre pas une victoire en conditions complètes,
une compatibilité multijoueur, une QA navigateur ou une fidélité artistique 1:1.

Le classeur V146 conserve ses statuts et son historique : les exigences de
jeu complet, de références artistiques, de campagne et de serveur restent
ouvertes. Cette correction améliore les contrôles `CW146-RTS-001/002` et
`QA-CW146-RTS-01/02/03` sans les élever à une validation de partie authentifiée.
