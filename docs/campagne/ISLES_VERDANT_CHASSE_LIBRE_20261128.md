# The Isles · Verdant en chasse libre (étape 4)

28 novembre 2026. Ce document décrit l'étape 4 de l'ordre de production ([MODE_THE_ISLES, section 15.2](MODE_THE_ISLES_20261121.md)) : la tranche verticale du monde ouvert sur Verdant. Les étapes 1 à 3 sont décrites dans le [prototype V1](ISLES_PROTOTYPE_V1_20261123.md).

**Accès** : menu principal → **Modes de jeu** → **The Isles** → **Verdant · chasse libre**. La progression du mode est gardée sous sa propre clé locale (`yautja.isles.profile.v1`). Elle ne touche jamais les emplacements de campagne.

## Choix du propriétaire (28 novembre 2026)

| Sujet | Décision |
| --- | --- |
| Taille de Verdant | 1000 × 1000 tuiles, soit 2 km de côté, extensible au double par les données |
| Sauvegarde | profil `islesV1` séparé, versionné et migrable |
| Contenu | base de l'étape 4, plus le légendaire et la prime, la mission I-MP-01, le cycle de 24 min, l'épreuve et les fragments |
| Art | modèles Meshy (provenance : `art-source/isles-meshy-20261128/README.md`) |

## L'île

Verdant est générée de façon déterministe à partir de `app/game/data/islesVerdantWorldV1.json` (graine 20261128) par `app/game/isles/islesWorldGenV1.ts`, en 0,45 s. Le fichier de données décrit :
- le rivage ;
- trois hauteurs à falaises (6 m et 3 m) ;
- le fleuve, avec ses deux gués et ses bassins ;
- la végétation ;
- la bande de canopée de l'épreuve ;
- les huit chemins ;
- les sites et les points nommés.

| Lieu | Contenu |
| --- | --- |
| Autel yautja | pyramide à quatre degrés au-dessus de la canopée, autel (modèle Meshy), Sœur-de-Pierre ; contrats et mission |
| Chutes et repaire | grotte au pied des falaises du nord-ouest ; trophées rapportés, alerte effacée, réapparition |
| Camp des braconniers | quatre braconniers, radio, traces de la mission |
| Fouilles archéologiques | archéologues (non-combattants) et gardes armés le jour |
| Piste cachée | vallée dans le plateau du nord-est, braconniers |
| Village côtier | villageois (non-combattants), refuge des témoins |
| Bassin du fleuve | crocodiles sur les rives |
| Bande de canopée | épreuve chronométrée en neuf anneaux |

Les grands lieux sont espacés de 120 tuiles au moins (`ISLES_MONDE_LEVEL_DESIGN` §7). On traverse l'île en environ 3 min 30 en courant, et en 6 à 7 min en marchant.

**Rendu.** Le terrain et les objets sont chargés par zones de 32 × 32 tuiles, dans un rayon de 3 zones autour de la caméra, au plus 4 zones par image, et déchargés au-delà. Au sol, la canopée s'ouvre dans un cercle de 14 m autour du chasseur ; elle reste entière quand il marche dessus.

## Boucle de jeu

Les règles sont dans `app/game/data/islesFreeHuntV1.json` et le moteur dans `app/game/isles/islesFreeHuntV1.ts`.

- **Heure** : une minute réelle vaut une heure ; le jour dure 24 minutes. La nuit va de 20 h à 5 h. Les braconniers sortent à l'aube et au crépuscule. Une nuit sur trois est sans lune.
- **Peuplement** : il se fait par cellules de 64 tuiles autour du joueur, renouvelé toutes les 6 heures de jeu. Les sites ont leurs propres tables. Ailleurs, la jungle porte sangliers, jaguars et patrouilles de braconniers, et les rives des crocodiles. Une proie tuée ne réapparaît pas dans le même créneau.
- **Code d'honneur** : seuls les humains armés et les animaux sont des proies. Tuer un archéologue ou un villageois est une faute grave : honneur − 100, réputation − 1 niveau et alerte immédiate. La visée de la frappe et du plasma va d'abord aux proies autorisées.
- **Honneur** :
  - humain armé : 15 ; unité tactique : 30 ; sanglier : 5 ; crocodile : 10 ; jaguar : 20 ;
  - × 1,25 à la lame, × 1,2 si personne ne voit la mise à mort ;
  - trophée rapporté au repaire : + 20 % ;
  - contrats : 50 à 200 ; prime : 300 ; légendaire : 500 ; épreuve : 50 à 150 ; mission : 400.
- **Réputation** : 1 à 10, d'après les seuils de l'économie du mode.
- **Trophées** : on maintient T 4 secondes près d'un corps (le camouflage se coupe). Les trophées portés sont gardés en les rapportant au repaire. En cas de mort, ils tombent sur place pendant 10 minutes et le chasseur se relève au repaire.
- **Alerte (marques 1 à 3)** :
  - qui la déclenche : un humain armé qui voit le chasseur pendant 3 s, un témoin qui atteint le village, ou une faute ;
  - les renforts selon le niveau : 3 gardes forestiers au niveau 1 ; 4 gardes et un hélicoptère à projecteur au niveau 2 ; 4 unités tactiques à vision thermique et 2 chiens de pistage au niveau 3 ;
  - zone de recherche : 80, 140 puis 200 m ;
  - l'alerte baisse d'un niveau après 25 s hors de la zone et hors de vue, deux fois plus vite si le chasseur reste immobile et camouflé ;
  - rentrer vivant au repaire efface toutes les marques.

## Activités

- **Contrats de l'autel** : trois par jour de jeu, tirés parmi sept modèles (jaguar à la lame, de nuit, crocodile, sanglier sans être vu, braconniers…). On les lit à l'autel avec G.
- **Prime** : Le Prédicateur fait sa ronde entre le camp, les gués, les fouilles et la piste, avec deux hommes d'escorte et des messages radio. Sa prime est réclamée une seule fois.
- **Légendaire** : le Roi-de-Verdant, un jaguar 1,6 fois plus grand, apparaît dans son territoire une nuit sans lune si l'alerte est à 0. Il est pris une seule fois.
- **Mission I-MP-01 « L'appât »** :
  - acceptée auprès de Sœur-de-Pierre ;
  - étapes : rejoindre le camp, lire trois traces, écouter la radio sans être vu, tuer le chef, fouiller son corps ;
  - bonus si les quatre carcasses sont éloignées de l'autel ; le chef tué à la lame est noté ;
  - récompense : réputation + 1 et l'entrée de codex « Le contrat de H. ».
- **Épreuve de la canopée** : neuf anneaux à plus de 6 m, sans toucher le sol. Médailles d'or (40 s), d'argent (55 s) et de bronze (75 s). Le meilleur temps est gardé.
- **Fragments de l'autel** : 5 sur Verdant (fragments 1 à 5 de la chasse ancienne), ajoutés au codex.

**Commandes ajoutées** : G pour interagir, M pour la carte de l'île. Les autres sont celles des étapes 1 à 3.

## Vérifications

- **Sources** : `tsc --noEmit` et ESLint sur les fichiers du mode. Contrôles `--check` des cartes et des modèles.
- **Tests de comportement** : 55 tests `tests/isles-*.test.mjs` réussis, dont 21 pour cette étape. Ils couvrent :
  - le monde : déterministe, tous les points nommés atteignables à pied, espacement des lieux, canopée continue de l'épreuve ;
  - la sauvegarde : migration, profil endommagé, aller-retour JSON, aucune autre clé écrite ;
  - la réputation, l'horloge, le peuplement déterministe ;
  - les contrats, la faute grave, le trophée rapporté avec + 20 %, la mort et la reprise des trophées ;
  - l'alerte et sa retombée, le repaire ;
  - la mission I-MP-01 complète, les fragments, l'épreuve réussie puis manquée, la prime, le légendaire et le déterminisme.
- **Navigateur** (`node scripts/qa-isles-verdant-browser-v1.mjs --public <public du dépôt complet>`, Chromium) : 9 étapes réussies et 10 captures dans `production/qa/evidence/isles-verdant-v1-20261128/`. La recette des étapes 1 à 3 repasse aussi (13 étapes).
- **Revue artistique** : modèles Meshy dans la scène (braconniers animés, corps couché, jaguar légendaire de nuit), canopée ouverte au sol, carte de l'île. Les tentes restent des volumes et la pyramide des degrés de tuiles.
- **Performances** : non mesurées sur une machine de joueur. La recette rend sans GPU (SwiftShader, 2 à 4 images par seconde) avec 49 zones chargées, environ 100 000 triangles et 25 000 objets instanciés.

## Pas encore fait

- Événements aléatoires et autres activités annexes (cages, archéologue à protéger, avion des trafiquants).
- Alertes 4 et 5, ARGOS, ponts et ferries ; les autres îles.
- Véhicules, nage longue, grappin.
- Voix, sons et musiques du mode (MUS-96, MUS-97).
- Salle des trophées visitable et cosmétiques de réputation.
- Commandes tactiles et manette.
