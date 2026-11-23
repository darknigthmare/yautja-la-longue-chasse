# The Isles · prototype V1 (étapes 1 à 3)

23 novembre 2026 · réalisation des étapes 1, 2 et 3 de l'ordre de production ([MODE_THE_ISLES, section 15.2](MODE_THE_ISLES_20261121.md)). Choix technique : [ADR-0001](../architecture/adr-0001-isles-threejs-et-salle-reseau.md).

Accès : menu principal → **Modes de jeu** → **The Isles**. Le mode n'écrit rien dans les sauvegardes et n'a aucun effet sur la campagne.

## Ce qui est jouable

| Étape | Contenu | Fichiers |
| --- | --- | --- |
| 1 · Prototype de vue | Île de test de 48 × 48 tuiles (96 m) : plage, prairie, plateau rocheux de 3 et 6 m, bosquet, ruine aux murs de 5 m, cabane, pilier de 10 m, caisses. Course, saut, escalade (falaises, arbres, murs, toits, caisses), nage, camouflage. Caméra isométrique 35°, 4 rotations, 3 zooms (traque, course, repérage), anticipation à la course, découpe du décor devant le chasseur, vue thermique. | `app/game/isles/islesMapV1.ts`, `islesMovementV1.ts`, `islesCameraV1.ts`, `islesSceneV1.ts` |
| 2 · Réseau minimal | Salle de 8 places sur l'île de test. Positions 15 fois par seconde, contrôle de vitesse, de hauteur et des bornes par le serveur, corrections, interpolation des autres chasseurs, sanglier partagé dont la mise à mort est attribuée une seule fois. | `app/game/isles/islesRoomV1.ts`, `islesNetClientV1.ts`, `scripts/serve-isles-room-v1.mjs` |
| 3 · Chasse inversée sur Verdant (solo) | Carte de 96 × 96 tuiles : fleuve, deux gués, chutes, pyramide de l'autel, camp de braconniers, piste cachée, village côtier. Le joueur est le Yautja ; 5 humains IA (4 à 6 possibles) parmi les 6 rôles ; 3 pièces à 3 positions chacune ; radio, hydravion ; reddition, humains à terre, trophée, autodestruction, duel ; jaguars ; jour ou nuit, pluie. | `app/game/isles/islesReverseHuntV1.ts`, `islesPathV1.ts`, `app/game/data/islesReverseHuntV1.json` |

Commandes : <kbd>ZQSD</kbd> ou <kbd>WASD</kbd> (position physique des touches), <kbd>Maj</kbd> courir, <kbd>Espace</kbd> sauter, pousser contre une paroi pour grimper, <kbd>C</kbd> camouflage, <kbd>X</kbd> thermique, <kbd>R</kbd> tourner (<kbd>Maj</kbd>+<kbd>R</kbd> dans l'autre sens), <kbd>V</kbd> ou molette zoom, <kbd>E</kbd> frapper, <kbd>F</kbd> plasma, <kbd>T</kbd> maintenu trophée, <kbd>Entrée</kbd> autodestruction, <kbd>Y</kbd> accepter le duel.

Salle en ligne locale : `node scripts/serve-isles-room-v1.mjs` (écoute `ws://127.0.0.1:8795/isles` ; variables `ISLES_ROOM_PORT`, `ISLES_ROOM_HOST`, `ISLES_ALLOWED_ORIGINS`). Une adresse distante doit être en `wss://`, derrière un proxy qui termine TLS.

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

## Vérifications

- **Sources** : `tsc --noEmit` et ESLint sur les fichiers du mode.
- **Tests de comportement** (32, `node --test tests/isles-*.test.mjs`) : mouvement, escalade, nage, camouflage ; caméra sans joueur caché sur toute l'île de test × 4 rotations (sans la découpe, 835 positions sur 5 540 cacheraient le chasseur) ; partie complète de l'IA jusqu'à la fuite ; trophée, à terre, reddition, faute, autodestruction, tenir, chasse parfaite, déterminisme ; salle de 8 places, corrections, mise à mort contestée attribuée une fois, service WebSocket avec 2 puis 6 clients à 15 instantanés par seconde.
- **Navigateur** (`node scripts/qa-isles-browser-v1.mjs`, Chromium) : menu → The Isles, course, escalade, rotations et zooms, camouflage et nage, découpe derrière le pilier, Chasse inversée jusqu'à son issue avec trophée pris au clavier, 2 puis 6 navigateurs dans la salle. Captures : `production/qa/evidence/isles-v1-20261123/`.
- **Revue artistique** : volumes simples aux couleurs du prototype HTML (`docs/prototypes/ISLES_PROTOTYPE_ISOMETRIQUE_20261122.html`), sans ressource externe, à remplacer par les modèles de production.
- **Performances** : non mesurées sur une machine de joueur. La recette rend en WebGL logiciel (environ 10 images par seconde) ; ce chiffre ne vaut pas mesure.

## Pas encore fait

- Humains jouables (le joueur ne peut être que le Yautja), Chasse inversée en ligne, voix de proximité et radio.
- Cartes de partie des autres îles, carte de 12 × 12 km, streaming de zones, éditeur de tuiles, cycle jour et nuit, météo complète.
- Sauvegarde `profile.islesV1`, réputation, progression des niveaux de chasseur et de survivant.
- Commandes tactiles et manette.
