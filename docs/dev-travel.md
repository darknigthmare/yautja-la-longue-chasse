# Accès direct aux lieux de test

## Utilisation

Ouvrir **`/dev`** sur le domaine du jeu. Cette page n’est pas liée au menu principal
et demande aux moteurs de recherche de ne pas l’indexer. Elle reste une page de
test accessible par son adresse ; elle ne donne aucun accès administratif.

Choisir un lieu, ou ouvrir directement un favori :

- `/dev?lieu=ship` : intérieur du vaisseau personnel.
- `/dev?lieu=clan-docking` : approche et amarrage au vaisseau-mère AVP.
- `/dev?lieu=clan-hangar` : apparition à bord du Clan Ship.
- `/dev?lieu=clan-conseil` : salle du conseil.
- `/dev?lieu=homeworld-port` : Port des Chasses.
- `/dev?lieu=homeworld-market` : Marché des Clans.
- `/dev?lieu=homeworld-citadel` : seuil de la Citadelle du Trône.
- `/dev?lieu=homeworld-slums` : Sous-Cité.
- `/dev?lieu=mission-jungle-vey` : chasse de la jungle de Vey.

La barre supérieure permet de choisir un autre point, de recommencer, de copier
le lien ou de revenir au jeu. Le changement de lieu et le rechargement démarrent
un nouvel essai. Les commandes de déplacement restent celles des scènes du jeu.
La touche **F8** ramène au catalogue, même quand une scène ouvre sa pause ou son
panneau de préparation. La page fonctionne également sans campagne existante.

## Périmètre

Le catalogue compte 31 points à son introduction :

| Groupe | Points d’accès |
| --- | --- |
| Vaisseau personnel | Intérieur parcourable, deux ponts et huit stations |
| Clan Ship | Approche/amarrage et sept salles : hangar, armurerie, entraînement, conseil, archives, trophées, soins |
| Cité Homeworld | Port, marché, poste extérieur du personnel du chenil, citadelle, Sous-Cité |
| Régions Homeworld | Neuf villages ordinaires, avec leurs terrains et chemins du retour |
| Chasses | Les huit missions du catalogue courant |

Le poste du personnel du chenil désigne le lieu extérieur existant ; il ne
prétend pas ouvrir un bâtiment supplémentaire. La Réserve Interdite conserve
ses conditions de campagne. Les lieux d’une autre branche ou seulement prévus
dans les classeurs ne deviennent pas des destinations jouables par ce catalogue.

Les scènes utilisent les véritables `PhysicalShipDeck`, `ClanShipHub`,
`HomeworldHub`, `HomeworldRegionV68` et `HuntCanvas`. Les panneaux autonomes de
soins et d’entraînement réutilisent `ShipHub` avec son état contrôlé. Les
paramètres, l’armurerie, l’apparence et le choix de mission disposent de commandes
de test. Les services qui conservent une progression de campagne propre
(guerre des clans, THE PIT, justice et mausolée) sont explicitement présentés
comme hors de cette visite temporaire.

## Isolation de la campagne

`app/dev/destinations.ts` construit un nouvel état synthétique avec une identité
distincte et des objets profondément copiés. Le rang et l’équipement servent aux
essais ; aucune mission terminée ni collection réelle n’est chargée ou fabriquée.
`app/dev/session.tsx` possède cet état en mémoire et remonte le véritable résultat
des transitions. Aucun gestionnaire `GameClient`, emplacement de campagne,
import/export ou service de sauvegarde cloud n’est monté par la page.

Les sauvegardes de récupération de `HomeworldHub` utilisent le stockage mémoire
passé dans `recoveryStorage`. La campagne habituelle garde son stockage existant
quand cette option est absente. Les services `ShipHub` reçoivent leur progression
contrôlée et n’annoncent aucune écriture durable. Le bouton Recommencer remonte
le propriétaire de scène entier, ce qui libère ses entrées et ses boucles.
Le mode temporaire garde également les ascenseurs dans la scène : il ne recharge
ni n’enregistre leur cache intersession du Homeworld.

Une chasse suspendue peut reprendre dans le même essai tant que l’onglet n’est
pas rechargé et que la destination ne change pas. Ses résultats ne sont jamais
attribués à une partie de campagne.

## Vérification

```bash
node --experimental-strip-types --test tests/dev-travel-destinations.test.mjs
node node_modules/eslint/bin/eslint.js --max-warnings=0 app/dev/*.tsx app/dev/destinations.ts app/game/HomeworldHub.tsx tests/dev-travel-destinations.test.mjs scripts/qa-dev-travel-browser.mjs
npm run typecheck
npm run build:production
DEV_TRAVEL_QA_START_SERVER=1 node scripts/qa-dev-travel-browser.mjs
```

Le script navigateur utilise la véritable route Next `/dev`, les véritables
scènes et leurs entrées. Il crée une campagne témoin et un emplacement de
sauvegarde avant les essais, compare leurs octets, et observe sans les bloquer
les écritures de stockage pendant les visites. Les rapports et captures vont
dans `outputs/qa-dev-travel` (non versionné). Pour vérifier le serveur construit,
utiliser `DEV_TRAVEL_QA_SERVER_MODE=production` après le build réussi.

Les tests de modèle vérifient les 31 états via le parseur réel de sauvegarde,
les points d’arrivée praticables, la restauration du bon étage, les états
d’amarrage, les entrées des villages et l’absence de données partagées entre
essais. Ces vérifications ne constituent pas une validation de tout le contenu
de chaque campagne ou de chaque mission.
