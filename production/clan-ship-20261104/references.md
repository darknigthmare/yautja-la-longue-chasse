# Références et décisions de production

Consultation : **4 novembre 2026, Europe/Paris**. Les références servent à identifier les œuvres et leurs éléments documentés. Elles ne transforment ni une génération d'image ni une proposition de gameplay en description canonique.

| ID | Source | Ce qui est établi | Ce qui reste hors de cette preuve |
|---|---|---|---|
| `REF-MARVEL-01` | [Marvel, Predator vs. Black Panther (2024) #1, fiche officielle](https://www.marvel.com/comics/issue/120985/predator_vs_black_panther_2024_1_variant/variant) | Série de 2024, auteurs cités, confrontation entre rois et arrivée d'un jeune Predator à Wakanda | Plan du château, emplacement orbital, dimensions et salles |
| `REF-MARVEL-02` | [Marvel, guide de lecture Predator vs. the Marvel Universe](https://www.marvel.com/comics/guides/2516/predator_vs_the_marvel_universe) | La série comporte les numéros 1 à 4 dans le guide de lecture | Continuité avec chaque film et détail d'une architecture |
| `REF-PRH-01` | [Penguin Random House, édition Marvel, ISBN 9781302960346](https://www.penguinrandomhouse.com/books/769516/predator-vs-black-panther-by-benjamin-percy/) | Recueil des numéros 1 à 4 ; rivalité fraternelle dans le résumé ; édition publiée par Marvel Universe | Géométrie et fonction précise du château du brief |
| `REF-FILM-01` | [20th Century Studios, Predator](https://www.20thcenturystudios.com/movies/predator) | Film de 1987, réalisé par John McTiernan ; page officielle et bande-annonce liée | Analyse de l'ouverture jusqu'à 1:02, type de capsule et timecodes de plans |
| `REF-BRIEF-01` | Conversation ShipHub et demande de reprise | Clan Ship AVP collectif, distinct de la coque personnelle qui s'y amarre | Fidélité visuelle exacte de chaque asset actuel |
| `REF-BRIEF-02` | Conversation ShipHub | Château du Predator King dans le Wolf System ; arrivée inspirée de l'ouverture de Predator1987 | Référence primaire du château et copie précise de l'ouverture à annoter |
| `REF-CODE-01` | `app/game/shipCatalogue.ts`, `shipInteriorKit.ts`, `shipInteriorV22.ts` | Identifiants et ressources disponibles dans le projet | Une présence dans le catalogue ne prouve pas l'identité canonique d'un autre lieu |

La fiche Marvel du numéro 1 a été accessible dans l'index de recherche officiel ; son ouverture directe a renvoyé HTTP 403 lors de cette consultation. La fiche du distributeur et la page de 20th Century Studios ont été ouvertes. Aucune connexion à un compte ni extraction de publication payante n'a été utilisée.

## Décisions prises pour le jeu

- L'intérieur du Clan Ship comprend sept salles de service reliées par un parcours physique. Leur composition et leur implantation sont une adaptation de gameplay.
- Les nouveaux arrière-plans sont des décors originaux inspirés du brief AVP. Les objets interactifs, portes et pieds du personnage conservent leur géométrie propre.
- Le château est une destination distincte. Le premier périmètre proposé est une audience de campagne avec visite et retour au vaisseau, décrit dans `castle-spec.md`.
- Le montage d'arrivée comprend huit plans dont les durées totalisent 62 secondes. Il est décrit dans `arrival-spec.md` et ne reproduit pas des timecodes de film analysés.
- Les systèmes futurs n'ajoutent pas de récompense, coût, rang ou code de progression sans raccordement aux règles de campagne existantes.

## Revue de fidélité à poursuivre

Pour revendiquer une reproduction d'un lieu ou d'un plan : identifier l'édition ou la copie précise, le numéro de page ou le timecode, la vue observée, la partie visible et la partie extrapolée. Conserver les références dans un dossier distinct des assets générés. La validation artistique humaine utilise le sens du statut `validated` déjà défini par le projet ; les contrôles de chargement et d'alpha ne remplacent pas cette revue.
