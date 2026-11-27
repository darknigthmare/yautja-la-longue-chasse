# The Isles · prototype V1 hors ligne

Le prototype du 23 novembre 2026 reprend les étapes 1 et 3 de l'[ordre de production](MODE_THE_ISLES_20261121.md#152-ordre-de-production). Le moteur 3D repose sur `three` 0.186.1, chargé à l'ouverture du mode.

Accès : menu principal → **Modes de jeu** → **The Isles**. Le mode n'écrit rien dans les sauvegardes et n'a aucun effet sur la campagne.

## Ce qui est jouable

| Étape | Contenu | Fichiers |
| --- | --- | --- |
| 1 · Prototype de vue | Île de test de 48 × 48 tuiles (96 m) : plage, prairie, plateau rocheux de 3 et 6 m, bosquet, ruine aux murs de 5 m, cabane, pilier de 10 m, caisses. Course, saut, escalade (falaises, arbres, murs, toits, caisses), nage, camouflage. Caméra isométrique 35°, 4 rotations, 3 zooms (traque, course, repérage), anticipation à la course, découpe du décor devant le chasseur, vue thermique. | `app/game/isles/islesMapV1.ts`, `islesMovementV1.ts`, `islesCameraV1.ts`, `islesSceneV1.ts` |
| 3 · Chasse inversée sur Verdant (solo) | Carte de 96 × 96 tuiles : fleuve, deux gués, chutes, pyramide de l'autel, camp de braconniers, piste cachée, village côtier. Le joueur est le Yautja ; 5 humains IA (4 à 6 possibles) parmi les 6 rôles ; 3 pièces à 3 positions chacune ; radio, hydravion ; reddition, humains à terre, trophée, autodestruction, duel ; jaguars ; jour ou nuit, pluie. | `app/game/isles/islesReverseHuntV1.ts`, `islesPathV1.ts`, `app/game/data/islesReverseHuntV1.json` |

Commandes : <kbd>ZQSD</kbd> ou <kbd>WASD</kbd> (position physique des touches), <kbd>Maj</kbd> courir, <kbd>Espace</kbd> sauter, pousser contre une paroi pour grimper, <kbd>C</kbd> camouflage, <kbd>X</kbd> thermique, <kbd>R</kbd> tourner (<kbd>Maj</kbd>+<kbd>R</kbd> dans l'autre sens), <kbd>V</kbd> ou molette zoom, <kbd>E</kbd> frapper, <kbd>F</kbd> plasma, <kbd>T</kbd> maintenu trophée, <kbd>Entrée</kbd> autodestruction, <kbd>Y</kbd> accepter le duel.


## Règles où le document ne tranchait pas (interprétations à valider)

Ces points sont *(proposé)* au sens du document de mode.

- **Appel de l'extraction** : les trois pièces doivent être portées au **mât radio** du camp (`radioMast`) ; l'appel dure 20 s (10 s pour le rôle Radio), puis l'hydravion arrive en 120 s sur le fleuve. Tuer ou éloigner l'appelant interrompt l'appel.
- **Attaquer l'extraction** : trois tirs de plasma sur l'hydravion posé le font redécoller ; il faut le rappeler.
- **Fin par autodestruction** : s'il reste des humains vivants ou partis, la victoire revient aux humains ; si l'explosion emporte les derniers, au Yautja.
- **Honneur** : 10 par humain armé éliminé, 15 par trophée, 25 pour une chasse parfaite ; rien sur un humain rendu, et le frapper fait perdre la partie sur-le-champ (honneur ramené à 0).
- **Visée** : la frappe et le plasma visent d'abord les combattants ; un humain rendu n'est frappé que s'il est seul à portée.
- **Perception humaine** : cône de vision, 26 m à découvert, 6 m camouflé immobile, 10 m camouflé en mouvement, 32 m dans l'eau ; la nuit réduit la vue à découvert, la pluie trahit le camouflage, les buissons masquent ce qui est plus bas qu'eux.
- **IA des rôles** : le Pisteur lit les traces toutes les 30 s, le Tireur marque une distorsion pour l'équipe, le Démolisseur pose ses 3 pièges près des pièces et du mât, le Médecin relève deux fois plus vite et tire 2 fusées, la Radio brouille le biomask 5 s une fois, le Garde fait fuir les jaguars.
- **Durée** : 15 minutes de jeu réel ; l'IA livrée termine souvent bien avant face à un Yautja passif (environ 4 minutes avec la graine 5).

## Recette

Les suites `tests/isles-view-v1.test.mjs` et `tests/isles-reverse-hunt-v1.test.mjs` exercent le monde, les déplacements, la caméra et les règles de la Chasse inversée. `node scripts/qa-isles-browser-v1.mjs` lance le menu de campagne et les scènes dans Chromium avec WebGL2 logiciel. Le rapport distingue le clavier, les scénarios préparés avec les commandes de recette et le rendu. Le mode utilise des volumes originaux du prototype et ses mesures en rendu logiciel ne représentent pas les performances sur machine joueur.

## Premiers prototypes HTML

- [L'ivoire rouge, Okavango](../prototypes/TERRE_PROTOTYPE_OKAVANGO_20261122.html) illustre la boucle donnée par l'avenant Terre. Il s'ouvre dans un navigateur et conserve sa partie dans la page.
- [Verdant isométrique](../prototypes/ISLES_PROTOTYPE_ISOMETRIQUE_20261122.html) est l'esquisse autonome du mode. Après `npm ci`, ouvrez le fichier via un serveur HTTP local qui sert la racine du dépôt afin de charger le module Three.js installé. Le parcours natif reste accessible par le menu du jeu.

## Salle de test locale

Le module facultatif de la PR [#193](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/193) conserve le serveur de l'île de test et son client de référence, séparés du mode natif. Après `npm ci`, `node scripts/serve-isles-room-v1.mjs` écoute sur `ws://127.0.0.1:8795/isles`. Le port est réglable avec `ISLES_ROOM_PORT`. `ISLES_ALLOWED_ORIGINS` accepte les seules origines navigateur locales explicitement autorisées, séparées par des virgules.

`node --test tests/isles-net-v1.test.mjs` vérifie la salle, les corrections de déplacement, la prise commune et deux puis six clients locaux. [Décision d'architecture](../architecture/adr-0001-isles-threejs-et-salle-reseau.md).

## Reste à produire

- Salon public, identité des membres, transport de session et réconciliation complète des déplacements.
- Humains jouables (le joueur ne peut être que le Yautja), Chasse inversée en ligne, voix de proximité et radio.
- Cartes de partie des autres îles, carte de 12 × 12 km, streaming de zones, éditeur de tuiles, cycle jour et nuit, météo complète.
- Sauvegarde `profile.islesV1`, réputation, progression des niveaux de chasseur et de survivant.
- Commandes tactiles et manette.
