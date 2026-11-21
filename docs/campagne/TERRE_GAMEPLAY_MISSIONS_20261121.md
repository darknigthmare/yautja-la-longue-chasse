# Terre — Gameplay des missions

Nov 21, 2026 · @darknigthmare

Suite de l'avenant [Terre — Le Terrain de Chasse](TERRE_TERRAIN_DE_CHASSE_20261121.md). Ce document décrit **comment se joue une mission sur Terre**, du choix du contrat au retour au clan, et **tout ce qu'il faut créer** pour la produire : écrans, systèmes, données, ennemis, décors, sons, tests.

**Règle de lecture.** Tout est *(proposé)* sauf ce qui renvoie à une décision déjà prise dans la bible ou dans l'avenant Terre. Les noms de champs reprennent les types existants du dépôt (`MissionDefinition`, `MissionObjectiveDefinition`, `HonorRuleDefinition`, `EnemyWaveDefinition`, `BossDefinition`, `TrophyDefinition`, `WorldScreenSector`, `huntInsertion`). Les valeurs chiffrées sont des points de départ à équilibrer en test.

---

## Sommaire

1. La boucle en un coup d'œil
2. Phase 0 — Ouverture de la Terre
3. Phase 1 — Le Registre terrestre
4. Phase 2 — Préparation au vaisseau
5. Phase 3 — Trajet vers Sol
6. Phase 4 — Orbite et scan
7. Phase 5 — Insertion
8. Phase 6 — Repérage
9. Phase 7 — Traque
10. Phase 8 — Affrontement
11. Phase 9 — Trophée
12. Phase 10 — Nettoyage
13. Phase 11 — Extraction
14. Phase 12 — Retour et débrief
15. Phase 13 — Tribunal, ellipse et monde qui change
16. Mort, échec et reprise
17. Variantes par type de contrat
18. Missions spéciales ARGOS
19. Structure d'un site : les 6 secteurs
20. Les 20 sites, secteur par secteur
21. Systèmes à créer
22. Écrans et interface à créer
23. Ennemis, faune et personnages à créer
24. Décors, props et effets à créer
25. Son et musique à créer
26. Équilibrage : tableaux de départ
27. Ordre de production
28. Tests
29. Questions ouvertes

---

## 1. La boucle en un coup d'œil

```text
 VAISSEAU / CITÉ                    TRAJET              SUR TERRE (mission jouée)                              RETOUR
┌──────────────┐  ┌────────────┐  ┌────────┐  ┌───────┐  ┌──────────┐  ┌─────────┐  ┌────────┐  ┌─────────────┐
│ 1 Registre   │→ │ 2 Prépa-   │→ │3 Route │→ │4 Orbite│→│5 Insertion│→ │6 Repé-  │→ │7 Traque│→ │8 Affron-    │
│   terrestre  │  │   ration   │  │  Sol   │  │  scan │  │          │  │  rage   │  │        │  │   tement    │
└──────────────┘  └────────────┘  └────────┘  └───────┘  └──────────┘  └─────────┘  └────────┘  └──────┬──────┘
                                                                                                         ↓
┌──────────────┐  ┌────────────┐  ┌────────┐  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  ┌──────────┐
│13 Tribunal,  │← │12 Débrief  │← │3' Route│← │11 Extraction│← │10 Nettoyage  │← │ 9 Trophée   │← ┘
│ ellipse,     │  │            │  │ retour │  │             │  │              │  │             │
│ monde change │  └────────────┘  └────────┘  └─────────────┘  └──────────────┘  └─────────────┘
└──────────────┘
```

| Phase | Où | Durée de jeu | Ce qui se décide |
| --- | --- | --- | --- |
| 1 Registre | vaisseau | 1–3 min | site, contrat, objectifs d'honneur |
| 2 Préparation | vaisseau | 1–3 min | équipement, compagnons, chiens |
| 3 Trajet | carte galactique | 30 s – 2 min | incidents de route, temps écoulé |
| 4 Orbite | vaisseau | 1 min | zone de dépôt, moment de descente |
| 5 Insertion | site, secteur 1 | 1–2 min | discrétion de l'arrivée |
| 6 Repérage | secteurs 1–3 | 5–10 min | qui est digne, où est la proie |
| 7 Traque | secteurs 2–5 | 10–20 min | isoler, piéger, éviter les témoins |
| 8 Affrontement | secteur 5 | 3–8 min | manière de tuer, duel, épargner |
| 9 Trophée | secteur 5 | 30 s – 1 min | qualité du trophée |
| 10 Nettoyage | secteurs 2–5 | 1–3 min | traces laissées |
| 11 Extraction | secteur 6 | 2–5 min | fenêtre tenue ou non |
| 12 Débrief | vaisseau | 1 min | bilan honneur, Indice, matériaux |
| 13 Tribunal / ellipse | cité | 0–10 min | peine éventuelle, date, monde |

**Durée totale visée :** 30 à 45 minutes pour une mission complète.

---

## 2. Phase 0 — Ouverture de la Terre

**Moment :** au retour de R2-M023 (décision du 21 novembre).

### Ce que le joueur vit
1. Au retour du premier trajet, une transmission du clan l'appelle aux **Archives des Lignées** (CITY-13), ou sur le pont du vaisseau s'il est en route.
2. **Scène courte (1 min 30) :** Saar, ou l'archiviste du clan, ouvre le **Registre terrestre**. Un globe s'allume, avec des marques de chasses anciennes sur tous les continents. Il raconte en trois répliques : la Terre est ouverte à tous les clans ; ses proies sont armées et rusées ; ce qu'on y laisse, les Oomans s'en souviennent.
3. Six sites s'allument (palier 1). Les autres restent visibles mais grisés, avec le rang requis.
4. Le système **Sol** apparaît sur la carte galactique.

### À créer
- Scène `earth-registry-opening` (dialogue de 6 à 8 répliques, sous-titres).
- Drapeau de sauvegarde `earthUnlocked` (posé à la fin de R2-M023).
- Entrée de codex : « La Terre, réserve ouverte ».

---

## 3. Phase 1 — Le Registre terrestre

C'est le **hub de la Terre** : un écran consultable au vaisseau (console du pont) et aux Archives des Lignées.

### 3.1 L'écran

```text
┌──────────────────────────────────────────────────────────────────────────┐
│  REGISTRE TERRESTRE                    Date du joueur : 2009   Âge : 61  │
│  Indice de Discrétion : ███████░░░░░ 34  (Incident)                      │
├──────────────────────────────────────────────┬───────────────────────────┤
│                                              │  3 · PANTANAL, BRÉSIL     │
│        [ globe ou planisphère ]              │  Palier 1 · Blooded       │
│   ● 1  ● 2  ● 3  ● 4  ● 5  ● 6               │  Saison : juillet–octobre │
│   ○ 7…12 (Adjutant)  ○ 13…18 (Elite)         │  Sensibilité : faible     │
│   ○ 19, 20 (Elder)                           │  Dernière chasse : 2003   │
│                                              │  Trophées pris : 2        │
│                                              │  ─────────────────────    │
│                                              │  CONTRATS                 │
│                                              │  ▸ Chasse désignée        │
│                                              │    « Les incendiaires »   │
│                                              │  ▸ Chasse libre           │
│                                              │  ─────────────────────    │
│                                              │  [Consulter l'histoire]   │
│                                              │  [Préparer la chasse]     │
└──────────────────────────────────────────────┴───────────────────────────┘
```

### 3.2 États d'un site

| État | Affichage | Règle |
| --- | --- | --- |
| Verrouillé | gris, rang requis affiché | palier non ouvert |
| Disponible | marque pleine | rang acquis |
| Hors saison | marque pâle, mois de la saison | chassable, mais sans bonus de chaleur (section 26) |
| Sous surveillance | marque cerclée de rouge | ARGOS a une base ou une équipe permanente sur le site (Indice ≥ 60) |
| Chasse ultime | marque dorée | site 20, une seule fois |

### 3.3 Contrats proposés
- Chaque site disponible propose **2 contrats** tirés à chaque ellipse : un **désigné** et un **libre**, plus les contrats de rang (épreuve, pack, Cleaner) quand le rang les ouvre (section 17).
- Un contrat désigné a un **nom**, une **proie principale** nommée et **2 ou 3 objectifs d'honneur facultatifs** (comme les 8 chasses).
- Les contrats tiennent compte de la date : une proie humaine née en 1990 n'est plus là en 2080 ; son héritier peut l'être.

### 3.4 Histoire du site
Le bouton « Consulter l'histoire » montre le **registre du site** : chasses du joueur (date, proie, manière, fautes), chasses d'autres Yautja (texte), et l'état actuel du site (ligne « Évolution » de l'avenant).

### 3.5 À créer
- Écran `EarthRegistryScreen` (globe 2D en projection simple, 20 marques, panneau de fiche).
- Données `earthSites.ts` et `earthContracts.ts` (gabarits de contrats par site).
- Tirage des contrats à chaque ellipse : `rollEarthContracts(date, rank, discretion)`.
- Sons : ouverture du registre, sélection d'un site, glyphes.

---

## 4. Phase 2 — Préparation au vaisseau

### 4.1 Choix du joueur
| Choix | Détail | Règle |
| --- | --- | --- |
| Armes | parmi celles débloquées par le rang | rappel au briefing : le plasma sur proie faible annule le gain (bible) |
| Armure | pièces séparées, camouflage par biome | un camouflage adapté au biome réduit la distorsion de 20 % |
| Consommables | medicomp, filets, mines, **fiole de dissolvant** (section 12) | nombre limité par emplacement |
| Compagnons | triade (Yena, Tov) en IA ou en coop | mort définitive |
| Chien de chasse | un seul sur Terre | non camouflable (avenant, section 11) |
| Brouilleur du vaisseau | charges pour l'arrivée et le départ | 2 charges par mission |
| Objectifs d'honneur | les accepter ou non | accepter = bonus si réussi, rien si raté (pas de pénalité) |

### 4.2 Briefing
- Texte court du contrat, image du site, proie principale (silhouette seulement si non repérée).
- Rappel des **interdits** du site : non-combattants présents, espèces protégées.
- Si l'épreuve de rang est engagée (V168), elle s'affiche ici.

### 4.3 À créer
- Panneau `EarthHuntBriefing` (réutilise le modèle de `RankTrialBriefingV168`).
- Consommable **fiole de dissolvant** (nouvel objet).
- Camouflages par biome terrestre (mangrove, savane, taïga, désert, roche rouge, ville).

---

## 5. Phase 3 — Trajet vers Sol

### 5.1 Ce qui se passe
- Départ du Spatioport Oriental ou de la position du vaisseau.
- Route vers Sol : **route humaine** (risque moyen, bible).
- **Incident de route** possible : tiré parmi les 36 du V6 selon le type de route. Ajouts propres à Sol *(proposé)* :

| Incident | Effet |
| --- | --- |
| Patrouille orbitale humaine | éviter (camouflage du vaisseau) ou attendre ; attendre coûte du temps |
| Satellite de surveillance | une charge du brouilleur est dépensée, sinon Indice + 2 |
| Cargo Weyland-Yutani (après 2050) | suivre sans être vu : récompense en composants |
| Yautja d'un autre clan en retour de chasse | échange d'informations sur un site (révèle la proie d'un contrat) |
| Équipe OWLF en orbite (selon l'arc OWLF) | rencontre de l'arc OWLF |

### 5.2 Temps
- 1 à 3 ans aller, selon la route (avenant). L'écran de date s'affiche à l'arrivée.
- Le temps écoulé peut faire **expirer** un contrat désigné si la proie meurt de vieillesse : le contrat est alors remplacé par son héritier ou par une chasse libre.

### 5.3 À créer
- Système Sol dans `galaxyRegistry.ts` : étoile, Terre, Lune (vide, sans mission au lancement).
- 5 incidents de route Sol (données).
- Règle d'expiration de contrat.

---

## 6. Phase 4 — Orbite et scan

Avant de descendre, le joueur voit le site depuis l'orbite.

### 6.1 L'écran
- Vue du site avec **2 ou 3 zones de dépôt** possibles.
- Pour chaque zone : distance à la proie principale, couvert, risque d'être vu, météo prévue.
- **Fenêtres de descente** sur une frise : nuit, mauvais temps, passage de satellite.
- **Scan orbital :** révèle le nombre approximatif d'humains armés, de non-combattants, la zone probable de la proie principale, et la présence d'ARGOS si l'Indice est ≥ 60.

### 6.2 Choix
| Zone de dépôt | Avantage | Inconvénient |
| --- | --- | --- |
| Proche | traque courte | risque d'être vu à l'arrivée × 2 |
| Lointaine | arrivée sûre | traque longue, fenêtre d'extraction plus serrée |
| Dangereuse (marais, falaise, épave) | personne n'y regarde | danger d'environnement à l'arrivée |

| Moment | Effet |
| --- | --- |
| Nuit | les humains voient moins ; les capteurs thermiques ARGOS voient mieux |
| Mauvais temps | arrivée presque invisible ; pluie qui rend le camouflage visible |
| Jour | aucun bonus ; seule option sur le site 17 (pas de nuit) |

### 6.3 À créer
- Écran `EarthOrbitScreen` : carte du site vue de dessus, zones de dépôt, frise de fenêtres.
- Données par site : `dropZones[]` (secteur d'arrivée, couvert, risque) et `weatherTable`.

---

## 7. Phase 5 — Insertion

### 7.1 Ce que le joueur vit
1. Courte descente en 2,5D : le vaisseau camouflé descend, la rampe s'ouvre, le joueur saute.
2. Le joueur arrive en **secteur 1** (zone de dépôt choisie), camouflage actif.
3. Le vaisseau remonte. Sur le biomask : compte à rebours de la **première fenêtre d'extraction**.

### 7.2 Règles
- **Risque d'être vu à l'arrivée** : `risque de la zone × moment × présence humaine`. Un témoin à l'arrivée = Indice + 3 et une **alerte locale** (les humains du secteur passent en Recherche).
- Le brouilleur du vaisseau (1 charge) annule ce risque.
- Si le joueur arrive avec un compagnon ou un chien, il arrive dans le même secteur.

### 7.3 À créer
- Séquence d'insertion Terre (réutilise `huntInsertion` et les scènes d'arrivée des planètes).
- Effet visuel : distorsion du camouflage dans la pluie, la poussière, l'eau.

---

## 8. Phase 6 — Repérage

Objectif : savoir **qui est digne**, **où est la proie principale**, **par où passer**.

### 8.1 Les modes du biomask
| Mode | Ce qu'il montre | Usage sur Terre |
| --- | --- | --- |
| Thermique | corps chauds | humains et faune ; brouillé par le feu, les geysers, la chaleur du désert |
| Électromagnétique | appareils actifs | téléphones, radios, caméras, drones : **les sources de témoins** |
| Mouvement | ce qui bouge | traque en forêt dense |
| Analyse *(nouveau sur Terre)* | état de la cible | **armée / désarmée / blessée / enfant**, distance de l'arme |

### 8.2 Le marquage
Un scan en mode Analyse **marque** la cible. Couleurs proposées :

| Marque | Sens | Conséquence |
| --- | --- | --- |
| Rouge | proie armée et digne | chassable |
| Or | proie principale du contrat | chassable, boss |
| Blanc | non-combattant | **interdit** |
| Jaune | incertain (arme cachée, distance) | tirer avant de scanner = risque d'infraction |
| Bleu | ARGOS ou OWLF | équipe spécialisée (30 d'honneur) |
| Vert | faune apex | chassable si digne |
| Gris barré | espèce protégée | interdite sauf si elle attaque |

Règle reprise du code existant : la règle d'honneur `scan-target` (« cible scannée avant de frapper ») vaut aussi sur Terre.

### 8.3 Les traces
- Empreintes, douilles, feux de camp, véhicules, pièges humains, sang.
- **Lire 3 traces** liées à la proie principale révèle son secteur (objectif `scan`, requis).
- Chaque site a ses traces propres (section 20).

### 8.4 Écoute
- Les radios humaines sont **écoutées** (mode EM) : elles annoncent relèves, renforts, déplacements de convois.
- *(proposé)* Le joueur peut enregistrer une phrase humaine et la **rejouer** pour attirer quelqu'un (imitation de voix, canon). Usage limité : 3 phrases en mémoire.

### 8.5 À créer
- Mode biomask **Analyse** (nouvel état visuel, marques colorées).
- Système `earthTracks` : traces posées dans les secteurs, liées aux cibles.
- Système `voiceMimicry` : enregistrer, rejouer, attirer.
- Icônes de marque (7) et sons de scan.

---

## 9. Phase 7 — Traque

Le cœur de la mission : **approcher, isoler, éviter les témoins**.

### 9.1 Ce qui rend le joueur visible
| Facteur | Effet sur le camouflage |
| --- | --- |
| Immobile | quasi invisible |
| Marche | distorsion légère |
| Course, saut | distorsion forte |
| Eau, pluie, boue | silhouette révélée (bible : eau, boue et fusées révèlent) |
| Blessure | étincelles, camouflage instable |
| Tir de plasma | position révélée 3 s |
| Fusée éclairante humaine | révèle dans son rayon |

### 9.2 L'IA humaine : états
| État | Comportement | Passage |
| --- | --- | --- |
| Calme | routine, patrouilles, conversations | bruit, corps trouvé, distorsion vue → Suspicion |
| Suspicion | s'arrête, regarde, appelle « tu as vu ? » | 3 s sans confirmation → Calme ; confirmation → Recherche |
| Recherche | fouille en binôme, lampes, chiens | joueur repéré → Combat |
| Combat | tir de couverture, appel radio, grenades | moral bas → Panique |
| Panique | tir au hasard, cris | → Fuite |
| Fuite | court vers un véhicule ou une sortie | sort du site → **témoin** |

Règles reprises de la bible : escouades réalistes, moral, appels radio, retraites et pièges.

### 9.3 Les témoins
Un humain devient **témoin** s'il voit le joueur clairement et quitte le site vivant, ou si une **image** sort du site.

- **Téléphone ou caméra :** quand un humain filme, une jauge **« Envoi »** se remplit (6 à 10 s selon l'époque ; instantané après 2080 avec les réseaux). Pleine, l'image est partie : Indice + 8. Détruire l'appareil avant : Indice – 3.
- **Radio :** un appel radio sur le joueur déclenche des renforts (vague `trigger: "objective"`) mais ne fait pas monter l'Indice.
- **Fuite :** un fuyard qui atteint la limite du site = Indice + 4. Il peut être rattrapé ; s'il est désarmé, il ne peut pas être tué (il doit être laissé partir ou assommé *(proposé)*).

### 9.4 Isoler la proie
Moyens d'isoler la proie principale de son groupe :
- Imitation de voix (section 8.4).
- Couper l'électricité ou la radio du camp.
- Enlever un garde en silence (le hisser dans un arbre, l'emporter dans l'eau).
- Laisser un signe (un trophée exposé) : moral de tout le groupe – 1 ; mais Indice + 2 (corps exposé).
- Mécanique du site (marée, feu, orage, convoi…).

### 9.5 Pièges
- **Du joueur :** filet, mine, collet *(proposé)*, leurre sonore.
- **Des humains :** pièges à mâchoires (braconniers), fils de détente, mines, caméras de chasse (une caméra de chasse qui voit le joueur = image en attente d'envoi, à détruire).

### 9.6 Faune
- La faune réagit à la traque : oiseaux qui s'envolent (alertent les humains en Calme → Suspicion), prédateurs qui chassent les humains aussi.
- Un grand prédateur peut être **attiré** vers un camp (sang, appât) : il fait le travail ou crée la diversion. Tuer des humains par un animal attiré ne rapporte pas d'honneur au joueur *(proposé)*.

### 9.7 À créer
- États d'IA Terre : extension du comportement d'escouade existant avec Suspicion, Recherche, Panique, Fuite.
- Système `earthWitnesses` : vue claire, jauge d'envoi, fuite, comptage.
- Pièges humains (3) et collet du joueur.
- Réactions de la faune (envol d'oiseaux, appât).

---

## 10. Phase 8 — Affrontement

La proie principale est un **boss** (`BossDefinition`, `threatLevel: 4`).

### 10.1 Gabarit d'un boss humain *(proposé)*
| Phase | Seuil de santé | Comportement | Lecture pour le joueur |
| --- | --- | --- | --- |
| 1. Retranché | 100 % | tire depuis un abri, ses hommes autour | vider l'abri, abattre les gardes |
| 2. Chasseur | 60 % | il traque le joueur à son tour : pièges, fusées, chien | ne pas tomber dans ses pièges |
| 3. Dernier carré | 25 % | désespéré : grenades, explosifs, cris ; peut **jeter son arme et défier** le joueur | accepter le duel ou non |

- **Duel :** si le boss jette son arme et défie, le joueur peut **retirer son masque et ses armes** et se battre à mains nues ou à la lame (règle existante `accept-duel`). Bonus d'honneur ; danger réel.
- **Fuite :** à 10 %, certains boss fuient. Les rattraper est requis.

### 10.2 Gabarit d'un boss animal *(proposé)*
| Phase | Comportement |
| --- | --- |
| 1. Territoire | rôde, teste, charge si le joueur entre dans son territoire |
| 2. Furie | blessé, charges répétées, utilise le terrain (eau, arbres) |
| 3. Dernière charge | une attaque finale lisible : le contre au bon moment donne la mise à mort en mêlée (× 1,5) |

### 10.3 Épargner : le salut au guerrier
- Quand une proie digne est vaincue (boss humain à 0 % de combat, à genoux), un choix s'affiche : **achever** ou **épargner** (maintenir une touche).
- Épargner : honneur + 30 *(proposé)* ; la proie survit, **témoin** (Indice + 3) ; elle peut revenir plus tard (chasse ultime, contrats d'héritier).
- Achever : honneur normal, trophée possible.

### 10.4 Interruptions
- Une **équipe ARGOS** peut intervenir pendant le combat si l'Indice ≥ 60 (vague `trigger: "boss-phase"`).
- Un **Bad Blood** peut voler la mise à mort (événement dynamique).

### 10.5 À créer
- 20 boss : 14 humains, 6 animaux nommés (liste en section 23), en suivant les gabarits.
- Animation de duel sans masque (réutilise la séquence de duel du Pit si possible).
- Choix « achever / épargner » (interface et règle).

---

## 11. Phase 9 — Trophée

### 11.1 Ce que le joueur fait
- Il s'approche du corps et **prélève** le trophée (le crâne, une arme, un objet personnel selon la proie). Le code existant gère déjà le trophée comme un **objet physique porté jusqu'à l'extraction** (`TrophyDefinition.partId`).
- Le prélèvement prend **6 à 12 s** pendant lesquelles le joueur est exposé (camouflage coupé *(proposé)*).

### 11.2 Qualité du trophée
| Facteur | Effet |
| --- | --- |
| Mise à mort en mêlée | qualité + 1 |
| Plasma au visage | crâne abîmé : qualité – 1 |
| Explosion, chute | qualité – 2 |
| Trophée porté sans dégât jusqu'à l'extraction | qualité conservée |
| Blessure du joueur pendant le portage | risque de perte du trophée |

### 11.3 Trophées secondaires
- Sur les proies rouges (humains armés) et vertes (faune) : trophées secondaires (V18), plus petits.
- Sur ARGOS : plaques, masques à capteurs, armes spéciales.

### 11.4 À créer
- 20 trophées signature (modèles 2D) et une provenance « Terre » (site, date, proie, manière).
- Variante d'animation de prélèvement pour les humains (sans gore excessif : coupe sur le geste, la caméra s'écarte *(proposé)*).

---

## 12. Phase 10 — Nettoyage

Nouveau sur Terre : avant de partir, **effacer ce qu'on laisse**.

### 12.1 La liste des traces
Le biomask affiche une **liste des traces restantes**, mise à jour en direct :

```text
TRACES RESTANTES
  ▸ Corps exposés : 3      (secteurs 3, 4, 5)
  ▸ Appareils actifs : 1   (caméra de chasse, secteur 4)
  ▸ Technologie : 0
  ▸ Sang du chasseur : 2 flaques (secteur 5)
```

### 12.2 Moyens
| Trace | Comment l'effacer | Temps |
| --- | --- | --- |
| Corps | le cacher (eau, arbre, crevasse) ou le dissoudre avec la **fiole de dissolvant** (le liquide bleu des Cleaners, canon de *AVP: Requiem*) | 4 s / 2 s |
| Appareil | le détruire (lame, tir) | 1 s |
| Technologie | la récupérer (disque, lance, filets tirés) | 1 s |
| Sang du joueur | le dissoudre | 2 s |

- Les corps **exposés en trophée** (pendus, rituel) sont un choix : ils effraient les proies restantes, mais ils comptent dans l'Indice.
- Le nettoyage n'est pas obligatoire ; il fait la différence dans le débrief.

### 12.3 À créer
- Système `earthTraces` (inventaire des traces par secteur, mise à jour, compte au débrief).
- Consommable fiole de dissolvant (effet visuel bleu, fumée).
- Actions « cacher le corps » selon le terrain.

---

## 13. Phase 11 — Extraction

### 13.1 Ce que le joueur vit
- Le joueur rejoint le **point d'extraction** (secteur 6) avant la fin de la fenêtre.
- Le vaisseau descend, camouflé. Le joueur monte avec son trophée.

### 13.2 Fenêtres
| Fenêtre | Durée | Ouverture |
| --- | --- | --- |
| 1ʳᵉ | 3 min | 20 à 30 min après l'insertion selon la zone de dépôt |
| 2ᵉ | 3 min | 10 min après la 1ʳᵉ ; Indice + 2 pour l'attente |
| 3ᵉ | 3 min | 10 min après la 2ᵉ ; Indice + 4 |
| Extraction d'urgence | immédiate | toujours possible ; honneur – 50, + 1 an de dérive, 1 charge de brouilleur perdue |

### 13.3 Danger à l'extraction
- **Niveau 4 de l'Indice** : ARGOS peut tendre une embuscade au point d'extraction (combat de défense, 90 s, avant que le vaisseau puisse descendre).
- **Poursuite** : si des humains sont en Combat au moment de l'extraction, ils tirent sur le vaisseau ; le vaisseau peut être touché (réparation au retour, coût en matériaux).

### 13.4 Autodestruction
- Possible si le joueur est à moins de 10 % de santé, sans fenêtre et encerclé (canon).
- Effet : mort honorable, mission perdue, site **réinitialisé** (nouvelles proies, Indice + 25), et en zone habitée : **jugement** (bible).
- En mode normal, la partie reprend au retour du vaisseau sans le joueur… *(à trancher, section 29)*.

### 13.5 À créer
- Séquence d'extraction (réutilise celle des 8 chasses).
- Combat de défense de point d'extraction (vague ARGOS).
- Animation d'autodestruction (canon, avec compte à rebours en glyphes).

---

## 14. Phase 12 — Retour et débrief

### 14.1 L'écran de débrief

```text
┌──────────────────────────────────────────────────────────────────────┐
│  PANTANAL · 2009 · « Les incendiaires »               RÉUSSITE       │
├──────────────────────────────────────────────────────────────────────┤
│  HONNEUR                                                             │
│   Chef incendiaire (désigné, mêlée, non repéré)  60 × 1,875 = 113    │
│   4 humains armés                                 15 × 4    =  60    │
│   Jaguar mélanique (signature)                              = 120    │
│   Trophée rapporté                                      + 20 %       │
│   Objectif : feu éteint avant la forêt-galerie             + 40      │
│   ──────────────────────────────────────────────────────────         │
│   Total                                                    = 393     │
│                                                                      │
│  CODE           Aucune infraction                                    │
│  INDICE         34 → 31   (chasse propre – 5, 1 image envoyée + 8,   │
│                            1 image détruite – 3, 1 témoin + 3…)      │
│  TROPHÉES       Crâne du chef incendiaire (qualité 4)                │
│                 Crâne de jaguar mélanique (qualité 5)                │
│  MATÉRIAUX      Os et cuir 3 · Composants 2                          │
│  REGISTRE       « En 2009, au Pantanal, le chasseur… » [lire]        │
└──────────────────────────────────────────────────────────────────────┘
```

### 14.2 Registre écrit automatiquement
Le jeu écrit une **entrée de registre** à partir des faits : site, date, proie, manière, fautes, épargnés. Elle sert :
- au procès (preuves),
- aux contrats d'héritier et à la chasse ultime,
- au mausolée et à l'héritage.

### 14.3 Écoute des Oomans *(proposé)*
Une à deux chasses plus tard, la console d'écoute du vaisseau capte des **nouvelles humaines** sur la chasse : article de journal, émission radio, rumeur. Le ton dépend de l'Indice (fait divers, mystère, puis enquête officielle). C'est la façon de **montrer** l'Indice au joueur sans jauge abstraite.

### 14.4 À créer
- Écran `EarthDebrief` (extension du débrief existant avec Indice et traces).
- Générateur d'entrée de registre (gabarits de phrases).
- 30 gabarits de nouvelles humaines, par niveau d'Indice et par époque.

---

## 15. Phase 13 — Tribunal, ellipse et monde qui change

### 15.1 Tribunal
- S'il y a une infraction, une convocation arrive au retour (bible : JUST-06).
- Preuves terrestres : enregistrements du masque, registre, et **images humaines** récupérées.

### 15.2 Ellipse
- Le temps avance (trajet + chasse + trajet). L'écran de date l'affiche.
- Effets sur la Terre :
  - les **contrats** sont tirés à nouveau ;
  - les sites passent à l'état de leur époque ;
  - l'Indice baisse de 5 par tranche de 10 ans sans chasse sur Terre (plancher respecté) ;
  - les **proies épargnées** vieillissent ; certaines reviennent, d'autres laissent un héritier ;
  - ARGOS avance d'une phase si ses conditions sont remplies.

### 15.3 À créer
- Fonction `advanceEarthOnEllipse(fromYear, toYear)`.
- Table des époques par site (`siteEras`).

---

## 16. Mort, échec et reprise

| Situation | Mode normal | Réalisme | Hardcore |
| --- | --- | --- | --- |
| Mort pendant la traque | reprise au dernier point de contrôle (début de secteur) ; Indice et témoins conservés | idem | mort définitive (bible) |
| Mort contre le boss | reprise au début du secteur 5 | idem | mort définitive |
| Fenêtre ratée 3 fois | extraction d'urgence forcée | idem | idem |
| Abandon | mission perdue, honneur 0, Indice gardé | idem | idem |
| Capture par ARGOS | mission d'évasion (section 18.2) | idem | idem |
| Autodestruction | mission perdue | mission perdue | mort définitive |

**Points de contrôle :** début de chaque secteur. L'Indice et les témoins **ne reviennent pas en arrière** au point de contrôle (la Terre se souvient).

---

## 17. Variantes par type de contrat

### 17.1 Chasse désignée (Blooded)
- Boucle complète, proie principale **nommée**.
- Objectifs : `scan` (3 traces), `hunt` (proie), `extract` (avec trophée) ; 2–3 objectifs d'honneur facultatifs.

### 17.2 Chasse libre (Blooded)
- Pas de proie désignée. Le joueur **choisit** sa proie principale parmi les dignes du site.
- Au débrief, l'Ancien juge le choix : la proie la plus dangereuse du site donne + 25 % ; une proie facile, rien de plus.

### 17.3 Chasse d'épreuve (Adjutant)
- Conditions imposées, tirées parmi : sans plasma ; sans camouflage ; de jour ; une seule arme ; sans soin ; en moins de 20 min.
- Réussite : honneur × 1,5 sur toute la mission. Échec d'une condition : mission continue, bonus perdu.

### 17.4 Sortie du pack (Adjutant)
- Le joueur mène **4 à 6 Unblooded** (IA) sur un site du palier 1.
- **Faune seulement.** Les humains sont des dangers à éviter, ou à traiter par le joueur seul.
- Ordres au pack : suivre, attendre, encercler, se cacher.
- Mécanique : un Unblooded **désobéit** si une proie humaine l'attaque (jet de discipline) ; le joueur doit intervenir avant qu'il tue.
- Réussite : tout le pack ramené, chaque Unblooded avec un trophée de faune.
- *(à valider)* compte pour l'épreuve d'Adjutant.

### 17.5 Contrat Cleaner (Elite)
- Un autre Yautja a raté une chasse : corps, technologie et témoins sont sur le site.
- Boucle modifiée : **pas de proie principale**. Les objectifs sont `recover` (technologie), traces à effacer, **témoins à faire taire sans les tuer** (détruire leurs images, les effrayer).
- Parfois le Yautja est encore vivant, blessé : le ramener (récupérer un frère tombé, canon).
- Réussite : Indice – 12.

### 17.6 Chasse ultime (Elder, site 20)
- Contrat écrit selon le registre du joueur (avenant, section 13.1).
- Pas de zone de dépôt au choix : l'Ancien la fixe.
- Pas d'extraction d'urgence.
- Le trophée va directement au mausolée *(proposé)*.

---

## 18. Missions spéciales ARGOS

### 18.1 Contre-chasse (Indice niveau 4)
- Au moins une mission sur trois : ARGOS sait que le joueur va venir.
- Fausses proies (leurres thermiques), pièges sur les traces, équipe d'ARGOS en embuscade au secteur 5 ou 6.

### 18.2 Capture et évasion
- Déclencheur : vaincu par ARGOS (santé à 0 contre une équipe ARGOS, en mode normal ou réalisme).
- Le joueur se réveille dans une **base ARGOS** (laboratoire souterrain, désarmé).
- Boucle : récupérer son équipement (3 casiers), libérer ou non d'autres captifs (faune, un autre Yautja), sortir.
- Pendant ce temps, le clan prépare un sauvetage : au bout de 15 min, une équipe du clan attaque la base (le joueur perd de l'honneur pour avoir été sauvé).
- Technologie restée chez ARGOS : honneur – 50 par objet (bible) ; une mission de récupération apparaît plus tard.

### 18.3 Confrontation finale (Norilsk, site 19)
- Mission en **3 actes** :
  1. **Infiltration :** entrer dans la ville sous dômes ; aucun civil touché.
  2. **Le piège :** ARGOS coupe le camouflage dans tout un quartier (brouilleurs à impulsion géants) ; combat contre les équipes ARGOS.
  3. **Le duel :** la cheffe d'ARGOS seule, dans les tunnels ; fin de l'arc (avenant, section 8.5).

### 18.4 À créer
- Base ARGOS (décor intérieur, 6 salles).
- Comportement « contre-chasse » (leurres, pièges sur traces).
- Mission Norilsk en 3 actes.

---

## 19. Structure d'un site : les 6 secteurs

Chaque site suit le modèle des chasses existantes (`worldScreens.ts`, 6 secteurs) :

| Secteur | Rôle | Contenu type |
| --- | --- | --- |
| S1 Dépôt | arrivée | zone de dépôt, premières traces, couvert |
| S2 Approche | apprentissage du site | mécanique spéciale du site, faune, premières patrouilles |
| S3 Territoire humain | repérage | camp, convoi ou base ; radios ; non-combattants |
| S4 Territoire de l'apex | danger naturel | proie apex, pièges humains, traces de la proie principale |
| S5 Repaire | affrontement | arène du boss, sous-zones, objectif d'honneur |
| S6 Extraction | départ | point de récupération, couvert, embuscade possible |

**Règles :**
- Il y a 2 ou 3 **zones de dépôt**, qui peuvent être dans S1, S2 ou S4. S6 reste fixe.
- Les secteurs sont reliés par les modes existants (`walk`, `climb`, `jump`, `wade`, `hazard-gate`).
- Chaque site a une **forme** propre (sous-zones, profondeur, vertical, metroidvania) : jamais une ligne droite (bible).

---

## 20. Les 20 sites, secteur par secteur

Notation : S1 → S6, puis **Mécanique** (ce qui change pendant la mission), **Traces** (ce que le joueur lit), **Boss** (gabarit utilisé).

### Palier 1 — Blooded

**1. Okavango** — sous-zones par chenaux
- S1 Îlot de papyrus · S2 Chenaux (gué, hippopotames) · S3 Camp des braconniers (radios, porteurs désarmés) · S4 Plaine de la troupe de lions · S5 Île du baobab mort (repaire du chef) · S6 Banc de sable au crépuscule
- **Mécanique :** l'eau monte pendant la mission ; S2 se ferme au milieu, S4 devient une île.
- **Traces :** traces de 4×4, carcasse d'éléphant, douilles.
- **Boss :** chef braconnier (humain) ; Crinière-Noire en apex optionnel (animal).

**2. Sundarbans** — sous-zones transformées par la marée
- S1 Racines de palétuviers · S2 Chenal du village (pêcheurs, non-combattants) · S3 Ponton des trafiquants · S4 Île de la tigresse · S5 Entrepôt de peaux sur pilotis · S6 Bouche du fleuve
- **Mécanique :** marée toutes les 4 min ; à marée haute, bateaux rapides ; à marée basse, boue.
- **Traces :** peaux séchées, sillages, appâts.
- **Boss :** chef trafiquant (humain, phase 2 en bateau).

**3. Pantanal** — profondeur avec feux
- S1 Forêt-galerie · S2 Prairie inondée (caïmans) · S3 Ferme des incendiaires · S4 Lisière du jaguar · S5 Front de feu · S6 Bras de rivière
- **Mécanique :** le feu avance de S3 vers S1 ; il brouille le thermique et ferme des passages.
- **Traces :** bidons d'essence, traces de bottes, cendres chaudes.
- **Boss :** chef incendiaire (humain) ; jaguar mélanique (animal, signature).

**4. Kimberley** — vertical
- S1 Plateau de grès · S2 Gorge (descente en rappel) · S3 Crique des trafiquants · S4 Billabong du crocodile · S5 Mangrove côtière · S6 Sommet de la falaise
- **Mécanique :** orage tous les 8 min : visibilité nulle 60 s, crues soudaines.
- **Traces :** bateau caché, caisses, feu éteint.
- **Boss :** « le Vieux du Fitzroy » (animal) ; pilote trafiquant (humain, secondaire).

**5. Everglades** — sous-zones avec hydroglisseurs
- S1 Îlot boisé · S2 Prairie de carex · S3 Cabane des chasseurs de python · S4 Canal des contrebandiers · S5 Ruine de motel au bord du marais · S6 Îlot de cyprès
- **Mécanique :** bordure urbaine en S5 et S6 : Indice × 2 dans ces secteurs.
- **Traces :** sacs de pythons, traces d'hydroglisseur, caméra de chasse.
- **Boss :** chef contrebandier (humain, phase 2 en hydroglisseur) ; python géant (animal, signature).

**6. Carpates** — metroidvania forêt et grottes
- S1 Clairière de hêtres · S2 Gorge brumeuse · S3 Camp de bûcherons · S4 Grotte de l'ours · S5 Scierie illégale · S6 Crête
- **Mécanique :** brouillard qui monte et descend ; portée des armes à distance réduite de moitié dans le brouillard.
- **Traces :** souches fraîches, chaînes de tronçonneuse, collets.
- **Boss :** chef de la garde (humain) ; ours géant (animal, signature).

### Palier 2 — Adjutant

**7. Congo** — sous-zones, canopée fermée
- S1 Rive du fleuve · S2 Forêt marécageuse · S3 Camp de la milice A · S4 Clairière à éléphants · S5 Camp de la milice B (village abandonné) · S6 Rive aval
- **Mécanique :** les deux milices se battent ; le joueur peut provoquer un affrontement (voix imitée, embuscade d'un côté).
- **Traces :** douilles de deux calibres, barrages, pirogues.
- **Boss :** chef de milice (humain, très armé).

**8. Bornéo** — vertical
- S1 Couronne d'un arbre géant · S2 Canopée · S3 Exploitation (bulldozers) · S4 Rivière sous les arbres · S5 Dernier grand arbre (abattage en cours) · S6 Cime
- **Mécanique :** des arbres tombent pendant la mission ; chemins de canopée qui disparaissent.
- **Traces :** marques de peinture sur les troncs, chenilles d'engins.
- **Boss :** chef de la sécurité (humain, combat dans la canopée).

**9. Nouvelle-Guinée** — profondeur + mine
- S1 Crête dans les nuages · S2 Forêt d'altitude · S3 Village minier (non-combattants) · S4 Gorge · S5 Galeries de la mine · S6 Plateau
- **Mécanique :** pluie forte : traces effacées au bout de 2 min ; glissements de terrain.
- **Traces :** rails, sacs de minerai, bottes.
- **Boss :** chef mercenaire (humain, phase 2 dans la mine).

**10. Kamtchatka** — sous-zones par rivières
- S1 Pente volcanique · S2 Rivière à saumons · S3 Camp des braconniers · S4 Champ de geysers · S5 Vallée de l'ours dominant · S6 Lac de cratère
- **Mécanique :** geysers qui éclatent : cachent la signature thermique et blessent.
- **Traces :** filets, peaux d'ours, quad.
- **Boss :** ours dominant (animal) ; chef braconnier (humain).

**11. Namib / Skeleton Coast** — profondeur large + épaves
- S1 Dune · S2 Plage aux ossements · S3 Campement des contrebandiers · S4 Lit de rivière sec (lion) · S5 Grande épave · S6 Dune au brouillard
- **Mécanique :** brouillard côtier le matin, chaleur l'après-midi ; vent qui efface les traces.
- **Traces :** traces de 4×4, tamis à diamants.
- **Boss :** chef contrebandier (humain, dans l'épave) ; lion du désert (animal, signature).

**12. Tibesti** — profondeur + canyons
- S1 Plateau volcanique · S2 Canyon · S3 Oasis (non-combattants) · S4 Route du convoi · S5 Camp d'orpaillage · S6 Cratère
- **Mécanique :** le convoi traverse S4 à heure fixe ; tempête de sable aléatoire.
- **Traces :** traces de camion, jerrycans, tas de gravats.
- **Boss :** chef de convoi (humain, phase 1 sur le camion en marche).

### Palier 3 — Elite

**13. Gobi** — à découvert
- S1 Falaise · S2 Steppe · S3 Poste frontière · S4 Désert de pierre · S5 Camp des trafiquants · S6 Falaises flamboyantes
- **Mécanique :** horizon ouvert : tout humain voit loin ; seul le relief et le camouflage cachent.
- **Traces :** traces de chevaux et de motos, bivouacs.
- **Boss :** chef de patrouille (humain, à découvert).

**14. Alang (urbain)** — vertical dans les coques
- S1 Plage boueuse · S2 Coque éventrée · S3 Ateliers de découpe (ouvriers) · S4 Pont d'un pétrolier · S5 Cale cachée du trafiquant · S6 Grue
- **Mécanique :** marée qui noie ou découvre les coques ; étincelles de découpe qui révèlent le camouflage.
- **Traces :** caisses d'armes, gardes qui ne travaillent pas, câbles.
- **Boss :** trafiquant d'armes (humain).

**15. Mustang** — metroidvania en grottes
- S1 Col · S2 Canyon d'ocre · S3 Village fortifié (non-combattants) · S4 Grottes hautes · S5 Grotte des pilleurs · S6 Falaise
- **Mécanique :** altitude : endurance – 30 % ; échelles et cordes.
- **Traces :** objets pillés, marques d'outils, cordes.
- **Boss :** chef des pilleurs (humain, dans les grottes).

**16. Altiplano** — à découvert + mine
- S1 Volcan · S2 Salar · S3 Village de la mine · S4 Lagune · S5 Galerie principale · S6 Bord du salar
- **Mécanique :** sur le salar, le camouflage reflète le ciel ; altitude.
- **Traces :** traces de camion, déchets de mine.
- **Boss :** chef de la sécurité (humain) ; puma (animal, optionnel).

**17. Brooks Range** — sous-zones de montagne
- S1 Toundra · S2 Rivière · S3 Lodge de chasse · S4 Col · S5 Vallée du grizzly · S6 Piste d'atterrissage
- **Mécanique :** **pas de nuit** ; les chasseurs pistent le joueur (traces du joueur lisibles par eux).
- **Traces :** douilles de gros calibre, appâts, peaux.
- **Boss :** guide légendaire (humain, phase 2 « Chasseur » renforcée).

**18. Iakoutie** — sous-zones + mine d'or
- S1 Taïga · S2 Rivière gelée · S3 Village d'orpailleurs · S4 Forêt de mélèzes · S5 Mine d'or · S6 Clairière
- **Mécanique :** jauge de chaleur corporelle ; feux, machines et sources chaudes réchauffent.
- **Traces :** traces de motoneige, pièges à fourrure.
- **Boss :** glouton nommé (animal) ; chef orpailleur (humain).

### Palier 4 — Elder

**19. Norilsk (urbain)** — cité + tunnels
- S1 Toits sous dôme · S2 Rues de l'usine · S3 Quartier coupé par ARGOS · S4 Tunnels de service · S5 Centre ARGOS · S6 Cheminée
- **Mécanique :** brouilleurs géants : camouflage coupé dans S3 ; caméras partout.
- **Boss :** cheffe d'ARGOS (section 18.3).

**20. Patagonie** — grande chasse
- S1 Fjord · S2 Forêt australe · S3 Lac glaciaire · S4 Champ de glace · S5 Arête du glacier · S6 Refuge
- **Mécanique :** vents qui poussent ; crevasses qui s'ouvrent.
- **Boss :** selon le contrat (avenant, section 13.1).

---

## 21. Systèmes à créer

| Système | Fichier proposé | Rôle |
| --- | --- | --- |
| Sites | `app/game/data/earthSites.ts` | les 20 sites : palier, rang, saison, forme, secteurs, zones de dépôt, météo, époques |
| Contrats | `app/game/data/earthContracts.ts` + `systems/earthContracts.ts` | gabarits, tirage par ellipse, expiration, héritiers |
| Registre | `systems/earthRegistry.ts` | entrées écrites, histoire des sites |
| Indice | `systems/earthDiscretion.ts` | jauge, gains, baisses, plancher, niveaux |
| Témoins | `systems/earthWitnesses.ts` | vue claire, jauge d'envoi, fuite |
| Traces | `systems/earthTraces.ts` | corps, appareils, technologie, sang ; nettoyage |
| Traces de piste | `systems/earthTracks.ts` | traces de la proie, lecture, révélation du secteur |
| Imitation de voix | `systems/voiceMimicry.ts` | enregistrer, rejouer, attirer |
| IA humaine Terre | extension de l'IA d'escouade | Calme, Suspicion, Recherche, Combat, Panique, Fuite |
| Extraction | `systems/earthExtraction.ts` | fenêtres, urgence, embuscade |
| ARGOS | `systems/argosArc.ts` | phases, personnages, succession, fins |
| Ellipse Terre | `systems/earthEllipse.ts` | `advanceEarthOnEllipse` |

### 21.1 Types de données *(esquisse)*

```ts
type EarthTier = 1 | 2 | 3 | 4;
type EarthContractKind = "designated" | "free" | "trial" | "pack-outing" | "cleaner" | "ultimate";
type WitnessState = "calm" | "suspicious" | "searching" | "combat" | "panic" | "fleeing";
type TargetMark = "armed" | "primary" | "noncombatant" | "uncertain" | "specialist" | "fauna" | "protected";

interface EarthSiteDefinition {
  id: string;                    // "okavango"
  order: number;                 // 1…20
  tier: EarthTier;
  requiredRank: "blooded" | "adjutant" | "elite" | "elder";
  name: string; country: string;
  season: { fromMonth: number; toMonth: number };
  form: "sub-zones" | "depth" | "vertical" | "metroidvania" | "open";
  sectors: WorldScreenSector[];  // 6, modèle existant
  dropZones: { sectorId: string; cover: 0 | 1 | 2; arrivalRisk: number }[];
  weather: { id: string; weight: number }[];
  sensitivity: "low" | "medium" | "high";
  apexFaunaId: string | null;
  protectedSpeciesIds: string[];
  eras: { fromYear: number; note: string; changes: string[] }[];
}

interface EarthContract {
  id: string; siteId: string; kind: EarthContractKind;
  title: string; issuedYear: number; expiresYear: number | null;
  primaryTargetId: string | null;  // boss
  optionalHonorRuleIds: string[];  // 2 ou 3
  trialConditions?: string[];
}

interface EarthProfileV171 {
  unlocked: boolean;
  discretion: number;              // 0…100
  discretionFloor: 0 | 40;
  argosPhase: 0 | 1 | 2 | 3 | 4 | 5;
  sites: Record<string, { lastHuntYear: number | null; trophies: number; burned: boolean }>;
  registry: { siteId: string; year: number; summary: string; spared: string[]; infractions: string[] }[];
  activeContracts: EarthContract[];
}
```

### 21.2 Sauvegarde et migration
- Nouveau champ `profile.earthV171`.
- Sauvegarde sans ce champ : Terre fermée si R2-M023 n'est pas faite ; sinon ouverte, Indice 0, ARGOS non créée.
- Aller-retour JSON testé ; entrées forgées ignorées (même règle que V168).

---

## 22. Écrans et interface à créer

| Écran | Contenu |
| --- | --- |
| Registre terrestre | globe, 20 marques, fiche de site, contrats, histoire |
| Briefing Terre | contrat, interdits, objectifs d'honneur, épreuve engagée |
| Orbite | carte du site vue de dessus, zones de dépôt, frise des fenêtres, scan |
| HUD Terre | marque des cibles (7 couleurs), jauge d'envoi au-dessus d'un humain qui filme, minuteur de fenêtre, Indice en petit |
| Liste des traces | panneau du biomask (section 12.1) |
| Choix achever / épargner | glyphe à maintenir |
| Débrief Terre | honneur détaillé, Indice avant/après avec ses causes, trophées, matériaux, registre |
| Écoute | nouvelles humaines captées (texte, voix) |

Les deux modes d'interface décidés (biomask et gantelet, ou classique) s'appliquent à tous ces écrans.

---

## 23. Ennemis, faune et personnages à créer

### 23.1 Archétypes humains (à ajouter à `EnemyArchetype`)

| Archétype | Armes | Particularité | Sites |
| --- | --- | --- | --- |
| `poacher-rifle` | fusil de chasse | lâche sous pression | 1, 2, 3, 7, 10 |
| `poacher-tracker` | fusil, chien | lit les traces du joueur | 1, 3, 10 |
| `militia-fighter` | fusil d'assaut, RPG | nombreux, moral bas | 7 |
| `private-guard` | fusil, lampe, radio | discipliné, appelle vite | 8, 9, 14, 15, 16, 18 |
| `smuggler` | pistolet-mitrailleur, véhicule | fuit vers son véhicule | 2, 4, 5, 11, 12, 13 |
| `hunter-guide` | fusil à lunette | piste le joueur | 5, 6, 17 |
| `soldier` | équipement militaire de l'époque | escouade réaliste | 13, 19 |
| `argos-operator` | capteurs, filets, brouilleurs | spécialiste | tous dès Indice 60 |
| `argos-sniper` | fusil à capteurs | voit sous camouflage à distance | tous dès Indice 60 |
| `owlf-agent` | selon l'arc OWLF | efface les preuves | selon l'arc |
| `civilian` | aucune | **non-combattant**, jamais une cible | 2, 3, 5, 9, 12, 14, 15, 19 |
| `journalist` | caméra | témoin dangereux, non-combattant | événement |

Chaque archétype a des **variantes d'époque** (1990–2025, 2025–2050, 2050–2100, 2100–2150) : armes, tenues et capteurs changent.

### 23.2 Boss (20)
14 humains : chefs braconniers (1, 10), chef trafiquant (2), chef incendiaire (3), pilote trafiquant (4), chef contrebandier (5, 11), chef de la garde (6), chef de milice (7), chef de la sécurité (8, 16), chef mercenaire (9), chef de convoi (12), chef de patrouille (13), trafiquant d'armes (14), chef des pilleurs (15), guide légendaire (17), chef orpailleur (18), cheffe d'ARGOS (19).
6 animaux nommés : Crinière-Noire (1), Celle-des-Racines (2), jaguar mélanique (3), le Vieux du Fitzroy (4), ours dominant (10), glouton (18) ; plus les signatures optionnelles (python, ours des Carpates, lion du désert, puma).

### 23.3 Faune
- 20 proies apex et environ 25 espèces secondaires (sprites, comportements simples : rôder, charger, fuir).
- Oiseaux (envol d'alerte) : un comportement commun, 4 apparences par biome.

### 23.4 Personnages ARGOS
Varga, Echeverría, Mensah, « Aiguille », puis la successeure (avenant). Portraits pour l'écoute et les scènes.

---

## 24. Décors, props et effets à créer

- **20 sites × 6 secteurs** : arrière-plans et premiers plans (modèle `WorldScreenLayerPlan`), avec leurs variantes d'époque pour les sites qui changent beaucoup (2, 5, 14, 19).
- **Props communs :** camps (tentes, feux, caisses), véhicules (4×4, quad, hydroglisseur, bateau rapide, camion, motoneige), caméras de chasse, pièges humains, antennes radio.
- **Props ARGOS :** brouilleurs, capteurs sur trépied, filets, base souterraine.
- **Nouvelles caractéristiques de terrain** (`WorldScreenFeatureKind`) : `mangrove-root`, `airboat-channel`, `wildfire-front`, `fog-bank`, `geyser`, `ship-hull`, `salt-flat`, `permafrost-mud`, `city-dome`, `glacier-crevasse`.
- **Effets :** distorsion du camouflage sous la pluie, reflet sur le salar, fumée de dissolvant bleu, étincelles de découpe, marée qui monte.

---

## 25. Son et musique à créer

- **Ambiances :** une par site (20), avec variante nuit / orage quand le site en a.
- **Radios humaines :** voix en langues locales, sans sous-titres, sauf ce que le joueur traduit en écoute *(proposé)*.
- **SFX :** `earth-registry-open`, `analysis-scan`, `mark-armed`, `mark-noncombatant`, `upload-bar`, `phone-destroyed`, `voice-record`, `voice-replay`, `dissolve-hiss`, `extraction-window`, `argos-pulse-jammer`, `argos-net-launch`, `tide-rise`, `airboat-pass`, `wildfire-roar`, `geyser-burst`.
- **Musique :** thème « Terre » (registre, orbite), thème ARGOS, thème de la chasse ultime (après MUS-73).

---

## 26. Équilibrage : tableaux de départ

### 26.1 Honneur par mission (cible)
| Palier | Honneur d'une mission propre, sans bonus | Avec objectifs et trophée signature |
| --- | --- | --- |
| 1 | 150–250 | 350–450 |
| 2 | 250–400 | 500–700 |
| 3 | 400–600 | 800–1 100 |
| 4 | 600–900 | 1 200–1 600 |

Repère : de Blooded (1 500) à Adjutant (3 000), environ 5 missions terrestres propres, si le joueur ne fait que ça.

### 26.2 Saison
- En saison : honneur normal.
- Hors saison : honneur – 20 %, mais moins d'humains sur le site.

### 26.3 Visibilité
| Action | Distance à laquelle un humain en Calme voit la distorsion |
| --- | --- |
| Immobile | 2 m |
| Marche | 6 m |
| Course | 15 m |
| Dans l'eau ou sous la pluie | 25 m |
| ARGOS (capteurs) | × 2 |

### 26.4 Indice
Valeurs de l'avenant (section 7). Cible : un joueur discret reste sous 40 jusqu'à Elite ; un joueur brutal atteint 60 vers la fin du palier 2.

---

## 27. Ordre de production

1. **Tranche verticale : Okavango (site 1).** Toute la boucle sur un seul site : Registre (1 site), orbite, insertion, repérage, traque, boss humain, trophée, nettoyage, extraction, débrief. Systèmes : Indice, témoins, traces, IA à 6 états.
2. **Palier 1 complet** (sites 2 à 6) : mécaniques de site (marée, feu, orage, bordure urbaine, brouillard), boss animaux.
3. **Ellipse et époques** : contrats tirés, expiration, évolutions de site, écoute des nouvelles.
4. **ARGOS phases 1 à 3**, archétypes ARGOS.
5. **Palier 2** et contrats d'Adjutant (épreuve, sortie du pack).
6. **Palier 3**, contrat Cleaner, capture et évasion.
7. **Palier 4** : Norilsk (3 actes) et chasse ultime.

---

## 28. Tests

- Terre fermée avant R2-M023 ; ouverte après.
- Palier ouvert au **rang acquis** seulement (pas au seuil d'honneur).
- Marquage : frapper une cible jaune ou blanche sans scan déclenche la règle `scan-target`.
- Témoin : jauge d'envoi pleine = + 8 ; appareil détruit avant = – 3.
- Plancher à 40 après le premier niveau 3.
- Points de contrôle : l'Indice ne revient pas en arrière.
- Infraction sur Terre transmise au tribunal avec ses preuves.
- Ellipse : contrats retirés, époque du site appliquée, proie expirée remplacée par son héritier.
- Sortie du pack : un Unblooded qui tue un humain déclenche un jugement pour lui et pour l'Adjutant.
- Sauvegarde : migration sans `earthV171`, aller-retour JSON, entrées forgées ignorées.

---

## 29. Questions ouvertes

1. **Autodestruction en mode normal** : que devient la partie ? (proposé : le joueur survit de justesse, évacué par le vaisseau, avec une perte d'honneur forte ; seule la version hardcore tue)
2. **Prélèvement du trophée** : le camouflage est-il coupé pendant le geste ?
3. **Fuyard désarmé** : peut-on l'assommer, ou seulement le laisser partir ?
4. **Animal attiré qui tue des humains** : aucun honneur pour le joueur, ou une part ?
5. **Capture par ARGOS** : sauvetage du clan au bout de 15 min, ou évasion seule ?
6. **Imitation de voix** : limite de 3 phrases, et peut-on imiter une radio ?
7. **Langues des radios** : traduites par l'écoute ou jamais ?
