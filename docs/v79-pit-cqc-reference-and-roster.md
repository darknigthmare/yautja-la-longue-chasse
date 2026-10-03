# The Pit — reprise CQC, roster et chroniques

État source du 3 octobre 2026 : placement CQC adapté, quatre chroniques montées et deux chasseurs ajoutés. La recette du vrai GameClient a commencé ; ce document ne certifie pas un kit animé complet ou une publication. Les preuves finales sont consignées séparément.

## Référence réellement lue

`C:/Users/chuck/Downloads/CQC_Versus_Legacy_v0.56_BACKLOG_SPLIT/cqc-versus-v056/modules/rival-files-v041.html`, fonctions `drawStage` (ligne 122) et `drawHuman` (123) : Canvas 1280×720, surface y535..720 et appui y596. Les pieds sont à61px du bord arrière et124px du bord avant. La capture `tests/06-stage-black-arts-v041.png` a été inspectée. Les dessins CQC sont procéduraux, pas des atlas natifs à reprendre.

Les PNG Yautja, pivots natifs, sol physique430, collisions et replays sont conservés. Le zoom pivote autour du sol ; le matériau arrière est dessiné avant P1/P2/P3 et leurs acteurs. Les six sols V65 concernés sont maintenant rendus avec leur hauteur déclarée35 ; les autres compositions conservent leurs dimensions historiques. Les tests vérifient le vrai ordre des appels du renderer, l'échelle et le cadrage des 201 silhouettes.

## Roster actuel et absences

201 cases, dont180 `user-*`, quatre expansions, douze personnages de première édition, deux boss et trois originaux/invités. Présence dans le registre ne certifie pas la fidélité1:1 ni les animations. Les deux nouvelles cases sont à la fin, sans changement d'IDs historiques.

Sur les six dossiers V54 ouverts après V63, Super Predator de The Last Hunt et incarnation Classic2000 possèdent maintenant chacun une pose native OpenAI transparente et une icône intégrée. Leurs stages sont des compositions existantes de la même œuvre. Voir [provenance et limites](v79-reference-hunters-art.md). Bloodshed, Jaguar, père et fils de Blood Ties restent ouverts. Dek, Kwei, Njohrr, Ahab et Broken Tusk étaient déjà présents.

Sources primaires confirmées pour la prochaine vérification visuelle :

- https://www.marvel.com/comics/collection/110461/ (The Last Hunt)
- https://www.marvel.com/comics/issue/110330/predator_the_last_hunt_2024_4
- https://store.steampowered.com/app/3730/?cc=fr&l=english (Classic2000)

## Chroniques

Les vrais modules `chronicles-core-v056.js`, `chronicles-data-v056.js` et `chronicles-cinema-v056.js` du paquet CQC ont servi de référence. Quatre parcours originaux hors canon concernent Greyback, Tracker, Machiko et Theta : 16 tableaux composés avec les portraits/plans existants et12duels. Lecture et combat ne partagent pas deux contrôleurs actifs ; introductions, compte à rebours, résultats réels, reprise locale et confirmation de remplacement sont montés. Aucun déblocage canonique ou gain de campagne inventé ; l'ancien Arcade/Circuit/Descente n'est pas ouvert aux extensions. Une galerie déverrouillable et les chroniques des autres chasseurs restent à produire.

## Vérifications et limites

C: avait bloqué le lot précédent. La mesure actuelle après libération est environ12,7GiB : les copies ont été autorisées normalement, sources inchangées et aucun fichier personnel supprimé. Les contrôles ciblés Pit passent36/36, le lot Homeworld/chasse49/49 ; compilation et régression globale à consigner dans le reçu de livraison final. Le vrai GameClient a déjà validé création/prologue, intro3/2/1, pause, un vrai résultat CPU et reprise du reçu ; les tests de reducer déroulent les quatre fins mais ne sont pas quatre campagnes gagnées au navigateur. Les poses nouvelles restent fixes, et la synchronisation de compte ne couvre pas ces checkpoints locaux de chronique.
