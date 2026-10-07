# Logistique et ouvrages V6 — exercice V86

Le nouvel onglet « Logistique et ouvrages » utilise le contexte V6 courant de la
table des mandats, y compris un JSON local validé. Il complète la reconnaissance
existante par une boucle jouable en mémoire : reconnaissance du site, réservation
de pièces identifiées, transport, livraison, tours de travail et occupation.
Le classeur et son JSON runtime restent inchangés. Les exercices V3 ne sont pas
modifiés et leurs identifiants ne sont pas employés ici.

## Trois fiches réellement raccordées

| Source | Ouvrage | Kit RAV | Entretien RAV/tour | Travail | Équipe opératrice |
| --- | --- | ---: | ---: | ---: | --- |
| W3-S02 | Abri de relève | 8 | 1 | 2 tours | W3-U17, équipe d’extraction |
| W3-S05 | Balise de route | 4 | 1 | 2 tours | W3-U06, marqueurs de route |
| W3-S07 | Seuil renforcé | 12 | 1 | 2 tours | W3-U07, lanciers de seuil |

Ces valeurs, les descriptions, opérateurs, lignes et cellules proviennent de
« Structures de guerre » dans `clanWarBibleV6Source.json`. Une fiche absente ou
une formule à la place d’un prix numérique désactive cet exercice ; elle ne
reçoit pas des valeurs de secours de la V3. La source XLSX déclarée est
`Yautja_V6_Bible_Cumulative_et_Dialogues.xlsx`, SHA256
`87ad5d1a6eaf49f2908a4457ef3f97b8f34db481a24bbc121d2e924559b19183`.

W3-R19 et W3-OBJ07 imposent une livraison puis du temps de travail réel. W3-R09
interdit le kit sur un passage sans RAV. W3-R01, W3-R02 et W3-OBJ05 imposent
l’identité du porteur et de la charge. W3-R07 inclut les formations en attente
dans le plafond de 12 PC. W3-R18 fournit le coût et le délai des volontaires.

## Parcours proposé

Avec les valeurs initiales d’exercice, une équipe W3-U17 équipée et 80 RAV :

1. Préparer W3-K02 et exécuter le passage W3-L01 ; l’ordre seul ne déplace rien.
2. Reconnaître le site. Les trois membres présents reçoivent chacun 4 XP une
   fois ; aucune autre équipe ne peut répéter le renseignement du même front.
3. Réserver W3-S02 à W3-K02. Ses 8 RAV deviennent un kit identifié au départ.
4. Revenir à W3-K01, charger ce kit et préparer un trajet compatible RAV.
5. Exécuter le passage jusqu’à W3-K02 et livrer avec le vrai porteur.
6. Accomplir les deux tours de chantier. Le premier immobilise l’opérateur et
   laisse un ouvrage incomplet ; une simple attente ne travaille pas à sa place.
7. L’abri est occupé au tour 7, avec 60 RAV restants, 30 de fatigue et les mêmes
   membres à 4 XP. Reposer l’équipe ici pendant un tour réduit sa fatigue à 10,
   laisse 57 RAV et ne soigne aucune blessure.

Les coûts PC/RAV/délais des nouvelles équipes viennent de « Unités de guerre ».
Le matériel réservé ne donne aucune personne instantanée. Au tour d’arrivée,
l’équipe novice apparaît au départ avec un teamId et des memberId propres ; les
vétérans, blessures et inventaires d’une autre équipe ne sont pas copiés.

## Effets et présence

L’abri permet le repos sur son site après mise en service, tant que son équipe
d’extraction complète reste affectée. La balise affiche un repère occupé sur le
site reconnu, avec l’âge du renseignement ; elle ne révèle pas les ennemis.
Le seuil vise un passage adjacent précis. W3-S07 indique en prose « quinze pour
cent de défense estimée » : le comparateur montre donc la défense de terrain
calculée par W3-R12, puis `ENT(défense estimée × 1,15)` pour ce passage occupé.
Ce bonus structurel ne change ni l’attaque, ni le plafond de terrain de 30 %, ni
les chemins, et ne valide pas un résultat de combat.

Libérer les opérateurs conserve l’ouvrage et les tours de travail déjà accomplis,
mais enlève les effets qui demandent une occupation. Le chantier peut reprendre
avec une équipe appropriée sur place. Un opérateur ne peut occuper deux postes,
porter deux kits ou marcher tout en travaillant. Une fermeture relue au moment
du passage bloque le déplacement préparé sans déplacer le kit ni débiter un tour.

L’entretien global compte chaque équipe arrivée et chaque structure installée
une fois. L’opérateur ne reçoit pas un second entretien comme garnison. Les
arrivées et ouvrages achevés en fin de tour commencent l’entretien au tour suivant.
Le compte conserve exactement : budget initial = RAV disponibles + matériel de
formation engagé + kits engagés + entretien consommé. La pénurie utilise le
facteur source 0,70 ; elle ne crée ni mort, ressource ou revenu automatique.

## Choix de prototype et limites

Le site et le budget initial sont des hypothèses du joueur. Le départ équipé
est déclaré ; il ne signifie pas qu’un PNJ de campagne ou son logement a été
obtenu. Un passage, une observation, un tour travaillé, une attente ou un repos
avance un tour global. Préparation, réservation, chargement, livraison et
affectation sont des actions distinctes sans tour additionnel. Cette cadence ne
prétend pas convertir le mouvement en cases du classeur en une bataille RTS.

L’exercice autorise un kit par équipe, une équipe reposée par ordre et exige
l’équipe opératrice complète. Ce sont des limites explicites du prototype,
pas des capacités de tonnage ou de logements inventées. L’entretien est un
compte de front, sans simuler le voyage de chaque ration. Aucun revenu de zone,
annexion, soin majeur, combat, maison, navire ou des quinze autres structures
n’est activé. Il n’y a pas d’XP attribuée pour une construction faute de résultat
militaire sourcé correspondant ; seule la reconnaissance valide ses 4 XP.

L’état reste en mémoire et survit au changement d’onglet. Changer la source ou
confirmer un nouveau départ le remplace ; fermer le panneau le supprime. Aucune
écriture de stockage navigateur, sauvegarde principale, requête réseau ou
allocation de progression de campagne. Les fonctions pures pourront être
validées par un hôte futur, mais ce lot n’implémente pas le multijoueur.

## Vérification

`tests/clan-war-works-v6.test.mjs` exerce les chiffres des trois fiches, les délais
de recrutement, le plafond PC incluant l’attente, l’identité des kits et porteurs,
les fermetures et passages sans RAV, l’absence de construction instantanée,
l’entretien unique, les opérateurs absents/blessés, le repos sans guérison,
les effets occupés, le non-farming et l’isolation des règles importées.

Les contextes alternatifs sont comparés sur leurs paramètres, unités, territoires,
passages et trois fiches : un état créé sous une source ne s’applique pas à un
autre contexte, même si celui-ci déclare le même hash de classeur. Ce contrôle
de contexte n’est pas une signature cryptographique d’un fichier utilisateur.

Les journaux de cette livraison sont ignorés sous `work-local/v86/qa/`. Les tests
de modèles ne sont ni une preuve navigateur, ni une régression globale, ni une
preuve de publication.

Le 7 octobre 2026, le groupe ciblé des quatre fichiers de tests de guerre compte
46 tests réussis, aucun échec ni test ignoré, dont 18 pour ce nouvel exercice.
Le parcours documenté de 80 RAV vérifie explicitement les tours 7/8, les stocks
60/57, la fatigue 30/10, les trois identités conservées et leurs 4 XP. ESLint
sur le système, les deux panneaux concernés et le nouveau test ne signale rien.
Les fichiers runtime ont été gelés avant la compilation globale conduite par
l’agent principal ; ce relevé n’en présume pas le résultat.
