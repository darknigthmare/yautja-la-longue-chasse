# Ascenseur des délégations — état local V83

La cabine possède désormais sa position dans le puits : `0` correspond au socket `from`, `1` au socket `to`. L’étage du joueur n’est plus utilisé pour décider où elle attend. Une première arrivée sans état local commence au palier physique `0`, même si le checkpoint du joueur est au niveau `+1`.

## Utilisation montée dans le code

- Au palier où la cabine attend, l’interaction embarque le joueur. Le trajet existant reste de **5 secondes**, dont la phase d’embarquement V82, avec les mêmes coordonnées, sockets, élévations et PNG.
- Depuis l’autre palier, l’interaction appelle la cabine **à vide**. Le joueur reste libre de marcher ; la cabine parcourt visiblement le puits. Son arrivée ne déclenche ni embarquement automatique ni changement de niveau du joueur. Une nouvelle interaction au seuil est nécessaire.
- Une course à vide déjà commencée termine son appel ; une interaction à l’autre palier ne la téléporte pas et ne modifie pas sa destination en cours.
- La même horloge active du Hub avance appels et passagers. Pause, dialogue, carte/repères, écran suspendu, chargement des assets, onglet caché et perte de focus ne produisent aucun rattrapage par le temps réel.
- Une arrivée de région, un escalier, une porte ou un changement d’étage du joueur ne repositionne pas la cabine.
- Si un palier refuse exceptionnellement une arrivée, le retour de sécurité du joueur n’efface pas la course de la cabine : elle repart à vide vers le palier de départ.

## Isolation et durée de conservation

`homeworldLiftStationV83.ts` conserve l’état par `save.createdAt`, en mémoire de session et dans une clé dédiée `sessionStorage` : `yautja.homeworld.lift.v83.<identité encodée>`. Aucun champ, callback de progression, clé de sauvegarde de campagne, gain ou déblocage n’est créé pour un appel à vide. Le checkpoint du joueur continue d’employer le mécanisme V77 existant à la fin d’un trajet passager.

L’identité est restaurée au montage/changement de partie ; une mise à jour ordinaire de progression ne restaure pas la cabine. Chaque identité garde son état séparé. Un stockage indisponible, illisible ou d’une version inconnue conserve ses données existantes et utilise uniquement la mémoire de session.

Le stockage de la cabine en mouvement est limité à quatre instantanés par seconde, avec une écriture forcée au démontage. Après un rechargement interrompant un trajet passager, le joueur reprend son **checkpoint campagne déjà enregistré** ; la cabine repart depuis sa position locale retenue et termine la course à vide dans le Homeworld actif. Aucun checkpoint passager n’est inventé. Une fermeture brutale peut perdre jusqu’à environ un quart de seconde de mouvement.

Cette position est **locale à la session de l’onglet** : elle n’est pas synchronisée sur un compte, entre navigateurs/appareils ou entre onglets. La fermeture de la session peut réinitialiser la cabine au socket `from`. Le modèle concerne l’unique `clan-lift` actuel, pas un réseau d’ascenseurs à plusieurs joueurs.

## Rendu et portée

`HomeworldHub` fournit `liftStateV83` à `HomeworldWorldSceneV77`. Le placement V82 utilise cette position canonique pour traduire le PNG cabine séparé, à échelle uniforme, sans rotation ni étirement. Un état explicitement `null` masque la cabine pendant la restauration initiale plutôt que d’afficher brièvement une fausse station. Les garde-corps/paliers V82 et les autres connecteurs restent inchangés.

Il s’agit toujours du déplacement d’une image native statique : aucune plaquette d’animation mécanique, porte ouvrante, commande PNJ ou ambiance sonore supplémentaire n’a été créée dans ce lot.

## État de livraison

Implémentation de sources et intégration Hub/helper/renderer livrées pour le lot V83 : `HomeworldWorldSceneV77` reçoit l’état de station et fournit cet état au helper de placement de cabine. **Aucun test, audit, typecheck, build, contrôle navigateur ou contrôle public n’a été lancé**, conformément à la demande de poursuivre et publier sans vérification. Cette documentation ne constitue pas une validation du comportement en jeu ni de la publication.
