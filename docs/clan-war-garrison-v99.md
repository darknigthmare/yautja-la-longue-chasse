# Relèves de garnison V99

Chaque front libre dispose d’une relève locale dans le panneau du territoire. « Organiser la garde de Txx » depuis le poste de commandement ouvre ce registre et place le focus sur son titre. Les personnes réellement présentes sur un site du joueur peuvent rejoindre la garde ou redevenir mobiles sans détour par un ordre de déplacement. Les noms, positions, blessures, expérience et effectifs sont conservés.

`warGarrisonIssueV99` et `changeWarGarrisonV99` refusent les sites absents ou passés sous contrôle adverse, les personnes étrangères ou absentes, les blessés, morts, personnes en soins ou formation et celles déjà réservées par un ordre. L’annulation de cet ordre rend la personne disponible. Les boutons indisponibles affichent leur motif et le relient par `aria-describedby`. Les identités importées ne servent jamais à construire un sélecteur CSS.

Le retrait du dernier garde apte ouvre une confirmation sans mutation. « Conserver ce garde » annule ; « Confirmer le retrait de Pxx » revalide la position réelle avant d’appliquer la relève. La confirmation se ferme si la révision du front change. Le site conserve son contrôle, mais sa production et les conditions d’objectif dépendent toujours de sa garnison réelle. Le focus revient sur la ligne de la personne, qui reste disponible pendant l’écriture de l’archive.

Une relève acceptée change uniquement le booléen `garrison` de cette personne, la révision locale et un rapport. Elle ne crée aucune personne, ne paie aucun revenu, ne consomme aucun stock et n’avance aucun tour. La production et l’entretien restent calculés par la résolution existante ; une garnison n’efface ni installation rompue ni rupture de liaison. Les personnes sorties du cycle de soins peuvent désormais réintégrer la garde sur place. La session utilise son état courant au clic et bloque les actions pendant une écriture ou la suspension du mode.

Le schéma version 1, les trente clés planétaires et les sessions V85/V96 restent inchangés. La relève utilise le circuit d’écriture et de relecture existant. Une limite d’archive atteinte refuse la nouvelle relève ; une erreur de quota conserve la position en mémoire et l’ancienne archive, puis le bouton de réessai écrit le dernier état disponible. Les sauvegardes de campagne et du canyon ne sont pas modifiées.

Source : `Yautja_V3_Guerres_de_Clans_Trois_Modes.xlsx`, SHA-256 `3ef3712c9ffa865f918133bee7667155c1bb320f060b4a19cc58ff650ffd0dfa`, feuille « Règles de conquête », dans `docs/war-clans-v3-workbook-source.json` :

- **CON-R08, ligne 13** : effectifs identifiés partagés entre garde, colonne et bataille, sans duplication de vétérans.
- **CON-R12, ligne 17** : production locale des sites contrôlés, reliés et exploitables, sans revenu de capture immédiat.
- **CON-R15, ligne 20** : l’occupation exige une personne apte réellement laissée en garde et une route.

La relève locale, son absence de coût et sa confirmation sont des choix du front libre implémenté. Ces règles sources ne constituent pas une revendication d’implémentation complète du classeur ni de raccordement à la campagne.

Vérifications : `tests/clan-war-garrison-v99.test.mjs` couvre les trente mondes et leurs archives indépendantes, l’immuabilité des refus, les réservations et leur annulation, le dernier garde, le cycle réel de soins, la production au prochain tour, les stocks et l’entretien, les limites d’archive, les échecs de quota et le rendu React avec les motifs des boutons indisponibles. La vérification Chromium depuis le menu est centralisée dans `scripts/qa-three-modes-v99.mjs` ; son résultat est consigné séparément du passage des tests système.
