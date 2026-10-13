# Compositions civiles du Homeworld — V92

13 octobre 2026. Ce lot monte **23 instances natives**, réparties dans **16
compositions sur les six étages existants**. Il réutilise sept PNG individuels
V83/V84 dont les octets, dimensions, pivots, contact au sol et faces de travail
ont été inspectés et conservés. Il ne représente pas 23 images nouvelles ni
une refonte achevée de toute la ville. Le mobilier et les lieux restent des
adaptations originales compatibles avec le lore ; aucune carte canonique 1:1
de Yautja Prime n'est affirmée.

## Implantations montées

Le fichier `app/game/data/homeworldStreetCompositionsV92.json` fixe les
coordonnées. Aucun placement aléatoire, recherche de place, réduction d'échelle
ou rotation d'un sprite n'est effectué pendant le jeu.

| Composition | Étage | Instances | Rôle visuel |
| --- | --- | ---: | --- |
| Poche de repos des archives | 0 | 1 | Bac cultivé en rive du passage |
| Cour du mémorial | 0 | 1 | Culture contenue ; prises conservées dans le mausolée |
| Travée de relève du rempart | 0 | 2 | Poste de réglage et réserve scellée, hors de la vigie |
| Galerie des traversées | 0 | 1 | Rive plantée du quai, sans masquer le pupitre |
| Retour des chasses | 0 | 1 | Lots fermés hors du sas et du pad |
| Cour des échanges bas | -1A | 2 | Comptoir avec face client et repère de la branche marchande |
| Poche des artisans bas | -1A | 1 | Établi de finition près des matières |
| Cour des réserves minérales | -1A | 1 | Poste de réglage distinct de la citerne |
| Cour commune des clans bas | -1A | 1 | Fournitures scellées hors de la table sociale |
| Poche du refuge bas | -1B | 2 | Réserve et bac sur deux rives distinctes |
| Revers technique des galeries | -1B | 2 | Réglage et pièces en retrait du logement |
| Cour du retour des convoyeurs | -1C | 1 | Lots au revers de l'atelier |
| Contrôle des lots du magasin | -1C | 1 | Poste technique hors du seuil |
| Halte des convoyeurs | -1C | 2 | Réserve de relève et bac cultivé séparés du fret |
| Galerie des preuves | +1 | 2 | Repère et réserve hors des trajets des gardiens |
| Galerie publique d'audience | +2 | 2 | Rives de l'attente, axe cérémoniel conservé |

Les sources réutilisées sont `merchant-counter-left`, `forge-bench-right`,
`cargo-rack-right`, `basalt-planter-left`, `clan-waymarker-right` (V83), puis
`maintenance-console-right` et `care-cabinet-left` (V84). Un casier de soins
fermé est un **décor non interactif** : il ne donne ni soins, ni consommables,
ni déblocage. Les mots « registre », « réserve » ou « contrôle » décrivent
une fonction spatiale, pas une nouvelle commande du jeu.

## Géométrie et vrais consommateurs

`homeworldStreetCompositionV92.ts` conserve les métrologies natives V83/V84.
Le compileur V84 accepte maintenant un catalogue explicite ; ses propres
sources, douze candidats, dix admissions et deux refus restent inchangés.
Le montage V92 intervient après V84 et réserve les anciens meubles, leurs
faces d'utilisation, les chemins PNJ, rues, seuils, paliers, pad et navette.
Il conserve aussi les boîtes de contact et la marge de 12 unités utilisées
par les admissions historiques V80. La seule réserve V92 du refuge a été
replacée de `(4980,3500)` à `(5020,3540)` pour respecter cette marge ; aucun
meuble ancien, appui natif, seuil ou parcours PNJ n'a été déplacé.

Les hulls convexes de contact partagent une unique déprojection avec le
codex et les collisions. Chaque bord est supporté par le terrain existant.
Les espaces de travail sont des réserves, pas des murs invisibles. Un meuble
masqué à plus de 20 % par une façade peinte devant lui est refusé. La règle
utilise le cadrage alpha et la profondeur réels du renderer. La collision
est limitée à l'étage de l'objet, avec un cache de hulls et de boîtes pour ne
pas reconstruire les contacts à chaque déplacement.

`HomeworldWorldSceneV77` appelle son peintre natif existant avec la taille,
le pivot, la caméra et la profondeur véritables. Le meuble s'estompe à 0,28
quand l'acteur est derrière lui sur le même étage. Ce fondu ne change ni sa
taille ni sa collision. Les préchargements du Hub possédaient déjà les sept
sources ; aucun nouveau téléchargement ou doublon de PNG n'est requis.

Le codex actif reçoit **39 fiches liées** : 23 objets physiques et 16 groupes
documentaires. Un groupe n'introduit aucune aire rectangulaire fictive,
arrivée joueur, collision ou droit de voyage. Le HUD conserve les identifiants
et libellés des quartiers, du port et des parvis historiques. Quand l'acteur
est près d'une instance admise, sa composition complète le détail du lieu ;
son propre titre ne sert que dans une poche sans nom historique applicable.
Le HUD monte explicitement les compositions comme le renderer et le codex.
Les trois ordres d'entrée réellement utilisés conservent ainsi 23 objets et
16 groupes, sans catalogue vide dû au chargement du fournisseur pur seul.
Ce dernier reste volontairement indépendant de World pour ses collisions.

La revue navigateur de la cour marchande a montré un contact visuel ambigu
avec l'ancien `market-stall-right` V78. Le témoin natif
`urban-v78:extra:lower-0`, pas un joueur placé sur la fixture QA, a son pied
réel en `(3127.6478,3132.3522)` à `t=0`. Il est déjà dessiné derrière le stand
(profondeurs 3760 et 3968), mais son pied se projette au bord du toit fusionné
dans le PNG, vers le pixel source `(1073,224)`. Aucun décalage de pivot n'a
été constaté. Le mobilier natif s'estompe donc à 0,28 quand le contact au sol
d'un occupant arrière de son propre étage rencontre sa boîte alpha peinte.
Le PNJ porte aussi l'ombre de contact existante, au même pivot physique. Cette
détection conservatrice n'est pas une métrologie pixel par pixel du toit.
PNG, échelle, profondeur, collision, trajectoire et ancre QA restent inchangés.

## Refus conservés et limites

18 intentions d'auteur ne sont pas montées. Dix-sept n'ont trouvé aucun
appui disponible dans leur poche sans violer une ancienne réservation.
Le repère d'archives `street-v92:memory-rest:clan-waymarker-right`, proposé
en `(1480,1190)`, passait le contrôle local mais sa face de travail était
isolée dans le **vrai routage complet**. Il a été retiré du catalogue publié,
et sa proposition reste dans `work-local/v92/qa/street-authoring-proposals.json`
avec le motif `ISOLATED_WORKING_FACE_IN_ACTUAL_V77_ROUTING`. Aucun ancien sol,
corps, passage ou objet n'a été réduit pour le forcer.

Les 110 routines conservent leur corps réel `24×14` et aucun objet V92 ne
coupe leur marge supplémentaire `28×18`, contrôlée à chaque unité de trajet.
Trois parcours historiques frôlent une façade si l'on impose cette marge à
**tout l'ancien monde** : `resident-port-1` près de `dock-control`,
`resident-arenas-4` près de `residence-terraces-4`, et
`resident-rampart-walk-4` près de `rampart-watch`. Leurs corps réels passent ;
ce lot ne prétend pas corriger cette marge historique et ne réécrit pas leurs
trajectoires. Les 43 intérieurs, les sept liaisons verticales, les dix régions,
spawns, sauvegardes et permissions ne sont pas modifiés. Les 216 anciens
enregistrements de sol restent présents ; le détour des Trois Vents décrit
ci-dessous ajoute trois segments physiques issus du fournisseur V72 et trois
bandes de desserte du Conseil sur +1, pour 222 enregistrements physiques.
Les trois épaules naturelles supérieures refusées par V90 restent refusées.

## Passage physique des Trois Vents

La comparaison avec `1bee8ac` a confirmé une panne historique du départ
`storm-chain` : ses deux premiers segments traversaient réellement le
sanctuaire puis le palais. Le JSON de raccord V72 passe désormais par la
corniche nord, avec sept nœuds entre `(2900,250)` et `(4140,160)`. Le seuil
`(4140,90)`, l'arrivée et l'identité régionale restent les mêmes. La largeur
de 180 unités garde le banc du départ des Piliers hors du passage ; le PNG
de l'arche conserve sa projection et une échelle uniforme liée à l'ouverture.
Le fournisseur génère les vrais sols, le rendu et le codex à partir des nœuds.
Il n'existe ni collision exemptée, ni téléportation, ni nouveau droit de voyage.
Le corps réel augmenté de 12 unités parcourt chaque segment sur City et sur
son vrai étage dans World. L'ancien sanctuaire et le palais restent solides.

L'ancien départ des Piliers se trouve à l'étage 0, alors que la corniche des
Trois Vents appartient à +1. Une desserte du Conseil suit donc réellement la
rive est `(4600,500) → (4600,120) → (4200,120) → (4140,160)` sur +1. Les trois
bandes de sol sont rendues et codexées par le monde existant ; elles évitent
le sanctuaire, les meubles de seuil et les montants natifs de l'arche. Un
chemin localement supporté ne suffit pas : le test vérifie aussi la route
complète depuis le port, par les raccords verticaux publics conservés. Le
masque de rues de l'ancienne City garde également sa connexion au spawn.

## Vérification et vue locale

Onze tests V92 vérifient les octets des sept PNG, les contacts supportés,
faces de travail, collisions, liens du codex, noms du HUD et le JSX réellement
monté. Le routage complet conserve 60 destinations : 43 portes, dix arrivées
régionales et sept raccords verticaux, ainsi que le contact réel du témoin
derrière l'auvent. Toutes les nouvelles faces de travail
sont atteignables depuis le port avec le consommateur de routage du jeu.

La vue locale existante `/visual-qa-v90` propose aussi **Seize compositions
civiles V92**, sans autre route ou accès public. Son drapeau serveur local
et son refus systématique sur Vercel restent inchangés. Chaque fixture
observe le vrai meuble ; le point d'observation est sa face de travail native,
une approche de bâtiment existante ou le spawn existant du port. Ce n'est
pas une nouvelle arrivée de voyage. Les anciennes onze fixtures V90 sont
conservées exactement. Les contrôles QA gardent le vrai renderer et la vraie
projection, sans stockage navigateur, campagne ni personnage pilotable.

Les preuves des modèles et du rendu SSR ne remplacent pas une visite visuelle
sur écran : la revue esthétique dans le navigateur et la validation publique
restent distinctes, sous la responsabilité du lot de release.

Résultats historiques avant la revue visuelle : **57 tests passent** (huit V92, onze de la vue QA,
38 régressions ciblées V77/V78/V80/V84/V85/V90), ESLint passe et TypeScript
strict ciblé passe avec les vrais imports et les déclarations Next. Ce premier
résultat ne couvre pas les trois tests ajoutés après la revue de l'auvent.

Après gel du raccord final, **24 tests passent** en 122,5 secondes : les
**onze V92**, les onze de la vue QA et les deux Atlas V70 historiques inchangés.
Ils incluent les 60 destinations du vrai réseau World, les 110 routines,
les 23 instances sur six étages, les trois ordres d'entrée HUD/renderer/codex,
les identités et admissions anciennes, le témoin derrière l'auvent, et les
deux corridors physiques des Trois Vents. Les deux assertions historiques
V80 d'admission et de noms ont aussi été rejouées seules et passent. Le test
historique du masque de rues City passe sur le même gel, soit **27 tests
distincts** au total. ESLint et TypeScript strict sur onze entrées Homeworld
et leurs vrais imports passent. Les preuves finales se trouvent dans
`homeworld-v92-frozen-final.txt`, `homeworld-v80-contracts-final.txt` et
`homeworld-storm-network-final-east.txt`, dans le répertoire QA privé.

Une comparaison isolée a rejoué les 36 échecs historiques observés dans le
premier audit global avec les sources épinglées à `1bee8ac`, sans réécrire les
assertions : **33 échouaient déjà** et trois passaient. Ces trois contrats
(admissions V80, identités du HUD et masque de rues City) ont été restaurés
et repassent dans les sources finales. Le nouveau test V92 du HUD conserve
désormais les noms historiques et vérifie l'ajout documentaire. Les 33 autres
échecs ne sont pas déclarés corrigés par ce lot. Le rapport privé
`homeworld-baseline-differential-v92.json` contient leurs noms exacts et les
limites de la comparaison ; le rejeu intermédiaire courant effectué pendant
le travail de raccord n'est pas une preuve du gel final. La suite globale
et le vrai bundle Next ESM restent des contrôles séparés du lot de release.

Aucun
build global, publication, modification de dépendance ou génération d'image
n'a été effectué par ce chantier. La suite QA esbuild a dû être relancée avec
une autorisation d'exécution locale après un refus Windows de lecture des
répertoires parents ; sa relance complète passe. Les rapports restent dans
`work-local/v92/qa/` et ne sont pas servis par le jeu.
