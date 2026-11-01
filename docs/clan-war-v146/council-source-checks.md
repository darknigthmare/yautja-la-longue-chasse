# Conseil V146 : cohérence des reçus W133

Le dossier W133 est produit depuis un état local. Le SHA V6 et la cohérence entre
l'état et son reçu ne constituent ni une signature, ni une preuve que la partie
s'est effectivement déroulée comme décrit. Aucune mutation de campagne V85 n'est
autorisée par ce dossier.

Le contrôle reconstruit la mission et la carte à partir du catalogue V6 fourni :
phase terminale, identifiants de carte et planète, cellules source, ordre des
objectifs et existence des types d'unité V6 sont contrôlés avant de produire le
dossier. Un type V6 substitué par un autre ne peut pas être détecté ici. Une victoire requiert tous les objectifs et, lorsqu'elle existe,
l'extraction de l'escorte. Les noms, unités, positions et actions ne sont pas
certifiés par un serveur ; le contrôle n'est pas un anti-triche complet.

Le test `clan-war-council-v146.test.mjs` essaie notamment des modifications
cohérentes du reçu *et* de l'état, ainsi qu'une victoire prématurée. Le test
`clan-war-council-v146-victories.test.mjs` vérifie que les 24 scénarios W3 terminés
par parcours d'objectifs isolé restent recevables. Ce parcours désactive les
ennemis et les aléas ; il ne démontre pas une victoire en conditions complètes,
une compatibilité multijoueur, une QA navigateur ou une fidélité artistique 1:1.

Le classeur V146 conserve ses statuts et son historique : les exigences de
jeu complet, de références artistiques, de campagne et de serveur restent
ouvertes. Cette correction améliore les contrôles `CW146-RTS-001/002` et
`QA-CW146-RTS-01/02/03` sans les élever à une validation de partie authentifiée.

## Complément — mission et sortie source (requalification ciblée)

Le contrôle local compare maintenant la définition complète et immuable de la
mission W3 au catalogue V6 reconstruit, ainsi que les points de départ, objectif
et extraction de la carte. Il refuse les tours et RAV impossibles, une escorte
d'un autre scénario, et une liste de groupes laissés en arrière incompatible
avec les positions reçues. Ce sont des contrôles de cohérence : les données du
client restent modifiables et ne démontrent pas le déroulement réel d'une partie.

Le test `tests/clan-war-council-v146.test.mjs` vérifie les rejets, puis construit
24 retraites avec évacuation et 24 défaites avec pertes via le moteur W133. Les
positions et les blessures de ces tests sont initialisées par fixture. Les 24
victoires du test séparé sont aussi isolées, sans ennemis ni aléas. Ni ces tests
ni la compilation ne valident une partie complète, un serveur, une carte filmique
ou des assets 1:1.

L'addendum `Yautja_Conseil_V146_Controle_Source_Addendum.xlsx` conserve le
classeur V146 historique intact. Il rectifie le terme « authentifié » de
`CW146-RTS-001`, distingue les preuves locales des contrôles encore requis et
ne promeut aucun statut avant une CI effective.

## V147 — cohérence du budget, des détachements et du terrain source

Le contrôle du Conseil vérifie désormais **la totalité de la carte source W3**
(reconstruite à partir du scénario V6, y compris ses tuiles et ses zones de
danger), plutôt que seulement les points de départ, objectif et sortie.
Il refuse les changements concordants de l'état local et de son reçu si le
terrain n'est plus celui du contrat.

Les formations du reçu sont aussi confrontées aux définitions V6 : identifiants
de détachements propres à la mission et sans doublons, effectifs, nom d'unité,
attaque, défense, portée, mobilité, PV maximum, PV courants et entretien RAV.
Le plafond PC doit être celui de la mission et la somme des coûts PC doit être
exactement le montant engagé. Les groupes non déployés ne peuvent pas apparaître
dans un reçu final.

**Limite :** il s'agit d'une validation de cohérence statique d'une archive
locale, ni d'une signature, ni d'une relecture autoritaire des ordres. Un
utilisateur peut encore modifier ses propres états client ; aucune preuve de
conquête V85 n'est créée. Cette extension ne modifie ni les règles de combat
ni les récompenses des quatre modes.

Le suivi Excel-compatible [QA_Conseil_V147_Rosters_Terrain.csv](QA_Conseil_V147_Rosters_Terrain.csv)
contient 20 points de contrôle, dont des prérequis physiques et 1:1 toujours
ouverts. Le classeur binaire V146 et son addendum ne sont pas modifiés dans
ce lot. Les nouveaux cas de falsification sont testés dans
`tests/clan-war-council-v146.test.mjs`. Les parcours manette, navigateur,
multijoueur, assets et fidélité planétaire restent à vérifier manuellement.
