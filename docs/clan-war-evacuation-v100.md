# Évacuer les blessés sur les fronts libres — V100

Un blessé restait sur le territoire de sa bataille : les déplacements exigeaient
des aptes et le seul ordre médical proposait des soins sur place. Le nouvel
ordre **Évacuer les blessés** transporte les mêmes personnes vers un territoire
ami voisin, avant un éventuel ordre de soins à l’arrivée.

## Parcours et choix de l’exercice

Depuis le poste de commandement, « Préparer l’évacuation » ouvre le site qui
possède des blessés. Le sélecteur d’ordre et la liste individuelle distinguent
les escortes aptes des patients. Le manifeste montre leurs identités, la
capacité et le lieu d’accueil ; le trajet réservé apparaît dans l’atlas.

Une évacuation emploie **deux escortes aptes par blessé**, huit personnes au
maximum, et **S1 du stock local**. Elle réserve le créneau logistique, partagé
avec les convois et soins. Ces capacités et ce tarif sont des choix annoncés
du front libre, pas des chiffres attribués au classeur. La suggestion
« Préparer une évacuation sans dégarnir » utilise les mobiles non réservés et
laisse les gardes en place. Elle propose jusqu’à deux patients et quatre
escortes ; la sélection manuelle reste possible dans la limite de huit.

Si l’ensemble des départs réservés engage le dernier garde apte du site,
réserver cette évacuation demande une confirmation explicite. L’annulation
conserve toute la simulation ; confirmer ne fait que réserver. Le focus rejoint
la confirmation puis revient sur le bouton de réservation, ou sur le sélecteur
d’ordre si ce bouton est devenu indisponible. Une révision, un changement de
monde ou de manifeste rend l’ancienne confirmation inutilisable.

La réservation ne dépense rien, ne déplace personne, ne soigne personne et
n’avance pas l’horloge. Les patients et escortes deviennent indisponibles pour
un autre ordre. Retirer l’ordre libère la même réservation sans payer ni rendre
un stock qui n’avait pas été prélevé.

Au tour résolu, les deux extrémités doivent rester amies et voisines ; chaque
personne doit toujours être présente, vivante, hors soins/formation et apte à
son rôle. Un mort, une personne étrangère ou distante, un manque d’escortes,
un stock insuffisant ou du fret caché sont refusés. Une destination perdue ou
une escorte rendue indisponible avant application annule l’évacuation avant
dépense. L’entretien, les actions adverses et les revenus ordinaires du tour
continuent ensuite selon leurs règles.

Après l’arrivée, les escortes sont mobiles et les patients **restent blessés**.
Personne n’est affecté automatiquement à une nouvelle garde. L’identité, l’XP,
les autres positions et les morts du registre sont conservés. Les soins légers
existants exigent un autre créneau, S1 sur le site d’accueil et le passage du
temps stratégique ; une évacuation ne les remplace pas.

## Sources et persistance

Source V3 : `Yautja_V3_Guerres_de_Clans_Trois_Modes.xlsx`, empreinte
`3ef3712c9ffa865f918133bee7667155c1bb320f060b4a19cc58ff650ffd0dfa`, extraction
`app/game/clanWarV85Source.json` :

- **CON-R08**, « Règles de conquête », ligne **13**, C/G : une seule personne
  entre garde, colonne et bataille ; blessés et places de transport distincts.
- **CON-R10**, même feuille, ligne **15**, D/F : affecter les escortes et
  vérifier le trajet ; une arête par tour et stock local.
- **EVOL-R14**, « Règles de progression », ligne **19**, C/E : les soins ne
  remplacent pas l’évacuation ; aptitude, réaffectation et transport distincts.
- **EVOL-R15**, même feuille, ligne **20**, C/F : soins et formation avancent
  avec le temps stratégique, les autres factions et l’entretien.

Les trente clés locales et les champs du schéma V1 sont conservés. Les
archives V1 antérieures restent lisibles. Une évacuation réservée emploie une
nouvelle valeur d’ordre : un ancien lecteur V99 la refuse conservativement et
son circuit d’archive conserve les octets sans écriture implicite. Une fois
l’ordre résolu, il ne reste aucun nouveau champ de transport à interpréter.
La campagne, les ouvrages V6 et les monnaies de leurs exercices ne sont pas
raccordés par cette action.

Une nouvelle évacuation conserve une marge de révision pour pouvoir être
résolue ou annulée. Aux limites communes d’archive, la résolution refuse le
snapshot entier si son résultat ne serait plus lisible (journal, XP ou stocks),
sans tronquer les rapports ni publier une dépense partielle.

## Vérifications

`tests/clan-war-evacuation-v100.test.mjs` couvre les trente graphes, la
conservation des personnes et du budget, réservations et annulations, les
manifeste invalides, les deux groupes médicaux, les destinations perdues,
le cycle **vraie bataille → blessé → évacuation → soins séparés**, la reprise
native et le rendu React du manifeste. La revue indépendante
`tests/clan-war-evacuation-review-v100.test.mjs` ajoute notamment les bornes de
révision et le journal à 99 999 rapports, la reprise via deux sessions et
l’intégrité d’un autre monde.

Le passage ciblé de ces deux fichiers avec les régressions V99/V98/V96 et les
sessions/persistances V85/V94 exécute **114 tests réussis, aucun ignoré**.
Les preuves navigateur sont produites séparément par la recette V100 : elles
doivent vérifier la confirmation clavier, le déplacement au vrai tour, les
patients encore blessés, la reprise et l’interface mobile avant de déclarer
ce parcours visuel validé.
