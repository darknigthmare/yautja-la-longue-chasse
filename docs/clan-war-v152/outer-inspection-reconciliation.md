# Outer Ops : bulletin, rappel et inspection de passage

Base : PR #78 à `29b5dd20d206d2ddc82aeef4cbfe546561d68d7a`, qui
contient la marche forcée #70 et les Web Locks V151. Dans cette version, une
transmission V138 valide suivie d'un rappel tardif pouvait rendre l'archive
illisible : le lecteur comparait le bulletin à la moitié de la nouvelle
échéance de retour. Il utilise désormais l'échéance aller consignée et refuse
un bulletin postérieur au rappel. La progression et les durées ne changent pas.

La PR parallèle #55 `fa0322800d5c51e16a4dd56ef6d0fc80d8020394` avait une
inspection du passage public V6, absente de #78 : 1 RAV, une seule fois,
préparation +2 au seul rapport final, sans révélation ennemie. Cette action
est raccordée au même `commit` V115 et à son Web Lock. Elle ne s'exécute
pas pendant une halte, un détour ou une manœuvre de changement de route ;
après inspection on ne peut plus réorienter le parcours.

Trois sauvegardes sous `tests/fixtures/outer-inspection-pr55` proviennent de
commandes réelles du moteur #55 : inspection, inspection puis rappel, et
inspection pendant une halte. L'ancien moteur acceptait ce dernier cas :
le lecteur actuel le conserve, même si les nouvelles inspections pendant
une pause sont refusées. Les empreintes de sources et d'archives figurent
dans `provenance.json`. **Aucune n'est une archive historique de joueur.**

L'avenant `Yautja_OuterOps_Inspection_V153.xlsx` distingue les lignes #55
CW144-OUT-001 / QA144-OUT-01 et QA144-OUT-06 des lignes #78 CW152-OUT-002 /
QA152-OUT-05 : les identifiants communs d'autres branches ne sont pas
fusionnés par leur nom. Les classeurs antérieurs restent inchangés.

Les règles de RAV, le bonus d'exercice et les déplacements sont des créations
du jeu, pas des spécifications canoniques 1:1. La fixture Chromium isole le
composant avec Vite et ne valide ni le serveur Next de production, ni le
contrôleur physique, ni les sauvegardes utilisateur, ni le multijoueur.
Le réseau autoritaire, les véhicules et cargo physiques, la campagne complète
et les références visuelles restent ouverts.
