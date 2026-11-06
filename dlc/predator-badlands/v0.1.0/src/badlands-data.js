window.BADLANDS_DATA = {
  "version": "0.1.0",
  "title": "PREDATOR: BADLANDS — LA MEUTE DE GENNA",
  "hostBaseline": {
    "repo": "darknigthmare/aliens-tantalus-frontier",
    "commit": "496996f5ea557d970ec625aa346876f3eaed1c5f",
    "package": "86.0.0"
  },
  "campaigns": [
    {
      "id": "weyland",
      "title": "CAMPAGNE I — WEYLAND-YUTANI",
      "subtitle": "Le « côté humain » demandé, transposé fidèlement aux synthétiques Thia/Tessa puisque le film ne montre aucun humain.",
      "playable": [
        "Tessa",
        "Thia"
      ],
      "scenes": [
        {
          "id": "wy_recovery",
          "title": "Réactivation de Tessa",
          "location": "Base Weyland-Yutani · baie médicale",
          "environment": "LAB",
          "profile": "SIDE",
          "objectiveType": "interact",
          "objective": "Réactiver les systèmes, récupérer le dossier Kalisk et reprendre la mission.",
          "actors": [
            "Tessa",
            "Drones synthétiques"
          ],
          "enemies": [],
          "gear": [
            "scanner",
            "repair_tool"
          ],
          "canonLock": true,
          "canonOutcome": "Tessa est remise en service et la mission de capture reprend.",
          "chapter": 1,
          "next": [
            "wy_briefing"
          ],
          "prev": []
        },
        {
          "id": "wy_briefing",
          "title": "Directive MU/TH/UR",
          "location": "Centre de commandement",
          "environment": "LAB",
          "profile": "DEPTH",
          "objectiveType": "collect",
          "objective": "Récupérer les trois blocs de données de la mission : Kalisk, Thia, activité Yautja.",
          "actors": [
            "Tessa"
          ],
          "enemies": [],
          "gear": [
            "scanner"
          ],
          "canonLock": true,
          "canonOutcome": "La Corporation privilégie la capture du Kalisk et identifie Dek comme variable hostile.",
          "chapter": 2,
          "next": [
            "wy_jungle_entry"
          ],
          "prev": [
            "wy_recovery"
          ]
        },
        {
          "id": "wy_jungle_entry",
          "title": "Déploiement sur Genna",
          "location": "Jungle extérieure de la base",
          "environment": "GENNA",
          "profile": "HYBRID",
          "objectiveType": "combat",
          "objective": "Traverser la zone hostile avec l’escouade synthétique.",
          "actors": [
            "Tessa",
            "Drones synthétiques"
          ],
          "enemies": [
            "tree_vine",
            "spike_pod"
          ],
          "gear": [
            "synth_rifle",
            "scanner"
          ],
          "canonLock": true,
          "canonOutcome": "Les synthétiques peuvent opérer là où des humains ne survivraient pas.",
          "chapter": 3,
          "next": [
            "wy_ship_wreck"
          ],
          "prev": [
            "wy_briefing"
          ]
        },
        {
          "id": "wy_ship_wreck",
          "title": "Le vaisseau de Kwei",
          "location": "Épave Yautja · coque",
          "environment": "SHIP",
          "profile": "SIDE",
          "objectiveType": "combat",
          "objective": "Sécuriser l’épave et ouvrir l’accès intérieur.",
          "actors": [
            "Tessa",
            "Drones synthétiques"
          ],
          "enemies": [
            "rock_biter"
          ],
          "gear": [
            "synth_rifle"
          ],
          "canonLock": true,
          "canonOutcome": "Tessa localise le vaisseau écrasé de Kwei.",
          "chapter": 4,
          "next": [
            "wy_trophy_deck"
          ],
          "prev": [
            "wy_jungle_entry"
          ]
        },
        {
          "id": "wy_trophy_deck",
          "title": "Trophées et technologies",
          "location": "Épave Yautja · galerie de trophées",
          "environment": "SHIP",
          "profile": "DEPTH",
          "objectiveType": "collect",
          "objective": "Scanner trois éléments technologiques sans détériorer les preuves.",
          "actors": [
            "Tessa"
          ],
          "enemies": [],
          "gear": [
            "scanner"
          ],
          "canonLock": true,
          "canonOutcome": "La galerie sert de trace matérielle de la culture de chasse du clan.",
          "chapter": 5,
          "next": [
            "wy_cockpit"
          ],
          "prev": [
            "wy_ship_wreck"
          ]
        },
        {
          "id": "wy_cockpit",
          "title": "Cryo et plasmacaster",
          "location": "Épave Yautja · cockpit",
          "environment": "SHIP",
          "profile": "SIDE",
          "objectiveType": "collect",
          "objective": "Récupérer la bandoulière cryogénique et l’arme d’épaule.",
          "actors": [
            "Tessa"
          ],
          "enemies": [],
          "gear": [
            "cryo_grenade",
            "kwei_plasmacaster"
          ],
          "canonLock": true,
          "canonOutcome": "Tessa récupère l’équipement qui permettra la capture.",
          "chapter": 6,
          "next": [
            "wy_track"
          ],
          "prev": [
            "wy_trophy_deck"
          ]
        },
        {
          "id": "wy_track",
          "title": "Piste de Dek",
          "location": "Razor Grass · piste de chasse",
          "environment": "GENNA",
          "profile": "HYBRID",
          "objectiveType": "survive",
          "objective": "Suivre les traces à travers la Razor Grass pendant 15 secondes.",
          "actors": [
            "Tessa",
            "Drones synthétiques"
          ],
          "enemies": [
            "bone_bison",
            "spike_pod"
          ],
          "gear": [
            "scanner",
            "synth_rifle"
          ],
          "canonLock": true,
          "canonOutcome": "L’équipe remonte la piste laissée par Dek, Thia et Bud.",
          "chapter": 7,
          "next": [
            "wy_den_edge"
          ],
          "prev": [
            "wy_cockpit"
          ]
        },
        {
          "id": "wy_den_edge",
          "title": "Aux abords du Kalisk",
          "location": "Lisière du repaire",
          "environment": "GENNA",
          "profile": "SIDE",
          "objectiveType": "combat",
          "objective": "Établir un périmètre sans provoquer le Kalisk avant l’ordre.",
          "actors": [
            "Tessa",
            "Drones synthétiques"
          ],
          "enemies": [
            "luna_bug"
          ],
          "gear": [
            "synth_rifle",
            "cryo_grenade"
          ],
          "canonLock": true,
          "canonOutcome": "La capture intervient après le duel entre Dek et le Kalisk.",
          "chapter": 8,
          "next": [
            "wy_capture"
          ],
          "prev": [
            "wy_track"
          ]
        },
        {
          "id": "wy_capture",
          "title": "Capture cryogénique",
          "location": "Repaire du Kalisk",
          "environment": "GENNA",
          "profile": "HYBRID",
          "objectiveType": "boss",
          "objective": "Immobiliser le Kalisk et Dek avec l’équipement cryogénique.",
          "actors": [
            "Tessa",
            "Dek",
            "Kalisk"
          ],
          "enemies": [
            "kalisk",
            "dek_target"
          ],
          "gear": [
            "cryo_grenade",
            "kwei_plasmacaster"
          ],
          "canonLock": true,
          "canonOutcome": "Dek et le Kalisk sont capturés vivants.",
          "chapter": 9,
          "next": [
            "wy_transport"
          ],
          "prev": [
            "wy_den_edge"
          ]
        },
        {
          "id": "wy_transport",
          "title": "Retour avec spécimens",
          "location": "Convoi vers la base",
          "environment": "BASE",
          "profile": "SIDE",
          "objectiveType": "escort",
          "objective": "Maintenir l’intégrité du conteneur Kalisk jusqu’au laboratoire.",
          "actors": [
            "Tessa",
            "Drones synthétiques",
            "Kalisk"
          ],
          "enemies": [
            "tree_vine"
          ],
          "gear": [
            "synth_rifle"
          ],
          "canonLock": true,
          "canonOutcome": "Les spécimens sont transférés vers les installations Weyland-Yutani.",
          "chapter": 10,
          "next": [
            "wy_experiment"
          ],
          "prev": [
            "wy_capture"
          ]
        },
        {
          "id": "wy_experiment",
          "title": "Sujet Yautja",
          "location": "Laboratoire de contention",
          "environment": "BASE",
          "profile": "DEPTH",
          "objectiveType": "interact",
          "objective": "Lancer l’analyse de Dek puis traiter l’objection de Thia.",
          "actors": [
            "Tessa",
            "Thia",
            "Dek"
          ],
          "enemies": [],
          "gear": [
            "scanner",
            "syringe"
          ],
          "canonLock": true,
          "canonOutcome": "Tessa étudie Dek; Thia intervient et est jugée défaillante.",
          "chapter": 11,
          "next": [
            "wy_decommission"
          ],
          "prev": [
            "wy_transport"
          ]
        },
        {
          "id": "wy_decommission",
          "title": "Désactivation de Thia",
          "location": "Secteur de maintenance synthétique",
          "environment": "BASE",
          "profile": "SIDE",
          "objectiveType": "interact",
          "objective": "Placer Thia en procédure de désactivation.",
          "actors": [
            "Tessa",
            "Thia"
          ],
          "enemies": [],
          "gear": [
            "repair_tool"
          ],
          "canonLock": true,
          "canonOutcome": "Thia doit être mise hors service, mais aide Dek à s’échapper.",
          "chapter": 12,
          "next": [
            "wy_breach"
          ],
          "prev": [
            "wy_experiment"
          ]
        },
        {
          "id": "wy_breach",
          "title": "Brèche interne",
          "location": "Corridor de sécurité",
          "environment": "BASE",
          "profile": "HYBRID",
          "objectiveType": "combat",
          "objective": "Contenir l’évasion de Dek et les sabotages organiques.",
          "actors": [
            "Tessa",
            "Drones synthétiques",
            "Dek"
          ],
          "enemies": [
            "organic_trap"
          ],
          "gear": [
            "synth_rifle",
            "kwei_plasmacaster"
          ],
          "canonLock": true,
          "canonOutcome": "Dek transforme l’écologie de Genna en arsenal.",
          "chapter": 13,
          "next": [
            "wy_legs"
          ],
          "prev": [
            "wy_decommission"
          ]
        },
        {
          "id": "wy_legs",
          "title": "Les jambes de Thia",
          "location": "Dépôt de maintenance",
          "environment": "BASE",
          "profile": "DEPTH",
          "objectiveType": "combat",
          "objective": "Empêcher les jambes autonomes de rejoindre le torse de Thia.",
          "actors": [
            "Tessa",
            "Thia legs"
          ],
          "enemies": [
            "thia_legs"
          ],
          "gear": [
            "synth_rifle"
          ],
          "canonLock": true,
          "canonOutcome": "Les deux moitiés de Thia finissent par se réunir.",
          "chapter": 14,
          "next": [
            "wy_loader"
          ],
          "prev": [
            "wy_breach"
          ]
        },
        {
          "id": "wy_loader",
          "title": "Power Loader",
          "location": "Hangar industriel",
          "environment": "BASE",
          "profile": "SIDE",
          "objectiveType": "interact",
          "objective": "Monter dans le Power Loader et rejoindre le secteur de confinement.",
          "actors": [
            "Tessa"
          ],
          "enemies": [],
          "gear": [
            "power_loader",
            "kwei_plasmacaster",
            "cryo_grenade"
          ],
          "canonLock": true,
          "canonOutcome": "Tessa utilise un exosquelette lourd pendant le combat final.",
          "chapter": 15,
          "next": [
            "wy_finale"
          ],
          "prev": [
            "wy_legs"
          ]
        },
        {
          "id": "wy_finale",
          "title": "Directive terminale",
          "location": "Enclos Kalisk / hangar",
          "environment": "BASE",
          "profile": "HYBRID",
          "objectiveType": "boss",
          "objective": "Combattre jusqu’au verrouillage canonique de l’issue.",
          "actors": [
            "Tessa",
            "Dek",
            "Thia",
            "Bud",
            "Kalisk"
          ],
          "enemies": [
            "kalisk_ally",
            "dek_boss"
          ],
          "gear": [
            "power_loader",
            "kwei_plasmacaster",
            "cryo_grenade"
          ],
          "canonLock": true,
          "canonOutcome": "Le Kalisk est tué; Tessa est ensuite détruite par Dek et Bud.",
          "chapter": 16,
          "next": [],
          "prev": [
            "wy_loader"
          ]
        }
      ]
    },
    {
      "id": "predator",
      "title": "CAMPAGNE II — DEK",
      "subtitle": "Le film depuis le point de vue du jeune Yautja : de Yautja Prime à Genna, puis retour au clan.",
      "playable": [
        "Dek"
      ],
      "scenes": [
        {
          "id": "pred_crystal_cave",
          "title": "L’épreuve du cadet",
          "location": "Yautja Prime · grotte de cristal",
          "environment": "YAUTJA",
          "profile": "HYBRID",
          "objectiveType": "combat",
          "objective": "Vaincre Kwei lors de l’entraînement sans quitter l’arène.",
          "actors": [
            "Dek",
            "Kwei"
          ],
          "enemies": [
            "kwei_spar"
          ],
          "gear": [
            "plasma_sword",
            "gauntlet"
          ],
          "canonLock": true,
          "canonOutcome": "Ouverture sur l’entraînement de Dek et Kwei.",
          "chapter": 1,
          "next": [
            "pred_hunt_atlas"
          ],
          "prev": []
        },
        {
          "id": "pred_hunt_atlas",
          "title": "Choisir l’impossible",
          "location": "Vaisseau de Kwei · atlas de chasse",
          "environment": "SHIP",
          "profile": "DEPTH",
          "objectiveType": "collect",
          "objective": "Examiner trois hologrammes puis sélectionner Genna et le Kalisk.",
          "actors": [
            "Dek",
            "Kwei"
          ],
          "enemies": [],
          "gear": [
            "scanner_yautja"
          ],
          "canonLock": true,
          "canonOutcome": "Dek choisit le Kalisk pour prouver sa valeur.",
          "chapter": 2,
          "next": [
            "pred_trophy_room"
          ],
          "prev": [
            "pred_crystal_cave"
          ]
        },
        {
          "id": "pred_trophy_room",
          "title": "Héritage de Kwei",
          "location": "Vaisseau de Kwei · galerie",
          "environment": "SHIP",
          "profile": "SIDE",
          "objectiveType": "collect",
          "objective": "Inspecter le mur de trophées et récupérer l’équipement préparé.",
          "actors": [
            "Dek",
            "Kwei"
          ],
          "enemies": [],
          "gear": [
            "plasma_sword",
            "bow",
            "combistick",
            "cryo_grenade",
            "medikit"
          ],
          "canonLock": true,
          "canonOutcome": "La galerie matérialise le statut de chasseur de Kwei.",
          "chapter": 3,
          "next": [
            "pred_father"
          ],
          "prev": [
            "pred_hunt_atlas"
          ]
        },
        {
          "id": "pred_father",
          "title": "Le jugement de Njohrr",
          "location": "Yautja Prime · esplanade du clan",
          "environment": "YAUTJA",
          "profile": "SIDE",
          "objectiveType": "boss",
          "objective": "Résister à Njohrr; l’issue est verrouillée par le film.",
          "actors": [
            "Dek",
            "Kwei",
            "Njohrr"
          ],
          "enemies": [
            "njohrr_script"
          ],
          "gear": [
            "plasma_sword"
          ],
          "canonLock": true,
          "canonOutcome": "Njohrr ordonne la mort de Dek; Kwei refuse et sauve son frère.",
          "chapter": 4,
          "next": [
            "pred_launch"
          ],
          "prev": [
            "pred_trophy_room"
          ]
        },
        {
          "id": "pred_launch",
          "title": "La mort de Kwei",
          "location": "Vaisseau de Kwei · sas",
          "environment": "SHIP",
          "profile": "SIDE",
          "objectiveType": "survive",
          "objective": "Tenir jusqu’au lancement automatique; aucune intervention ne peut sauver Kwei.",
          "actors": [
            "Dek",
            "Kwei",
            "Njohrr"
          ],
          "enemies": [],
          "gear": [
            "plasma_sword"
          ],
          "canonLock": true,
          "canonOutcome": "Dek assiste à l’exécution de Kwei pendant que le vaisseau part pour Genna.",
          "chapter": 5,
          "next": [
            "pred_orbit"
          ],
          "prev": [
            "pred_father"
          ]
        },
        {
          "id": "pred_orbit",
          "title": "Genna en vue",
          "location": "Orbite rocheuse de Genna",
          "environment": "SPACE",
          "profile": "SIDE",
          "objectiveType": "survive",
          "objective": "Éviter les débris et maintenir la coque jusqu’à l’éjection.",
          "actors": [
            "Dek"
          ],
          "enemies": [
            "debris"
          ],
          "gear": [
            "ship_controls"
          ],
          "canonLock": true,
          "canonOutcome": "Le vaisseau est endommagé dans la zone de débris.",
          "chapter": 6,
          "next": [
            "pred_pod"
          ],
          "prev": [
            "pred_launch"
          ]
        },
        {
          "id": "pred_pod",
          "title": "Éjection",
          "location": "Capsule au-dessus de Genna",
          "environment": "SPACE",
          "profile": "SIDE",
          "objectiveType": "survive",
          "objective": "Survivre à la descente et à l’attaque de la faune volante.",
          "actors": [
            "Dek"
          ],
          "enemies": [
            "genna_vulture"
          ],
          "gear": [
            "plasma_sword"
          ],
          "canonLock": true,
          "canonOutcome": "Dek s’éjecte avant l’impact.",
          "chapter": 7,
          "next": [
            "pred_vines"
          ],
          "prev": [
            "pred_orbit"
          ]
        },
        {
          "id": "pred_vines",
          "title": "La planète attaque",
          "location": "Jungle · zone des lianes",
          "environment": "GENNA",
          "profile": "HYBRID",
          "objectiveType": "survive",
          "objective": "Échapper aux lianes sans pouvoir sauver tout l’arsenal.",
          "actors": [
            "Dek"
          ],
          "enemies": [
            "tree_vine",
            "tree_vine"
          ],
          "gear": [
            "plasma_sword",
            "bow",
            "combistick",
            "cryo_grenade",
            "medikit"
          ],
          "canonLock": true,
          "canonOutcome": "Les lianes détruisent ou emportent l’essentiel de son équipement.",
          "chapter": 8,
          "next": [
            "pred_spike_field"
          ],
          "prev": [
            "pred_pod"
          ]
        },
        {
          "id": "pred_spike_field",
          "title": "Le nid",
          "location": "Champ de Spike Pods",
          "environment": "GENNA",
          "profile": "SIDE",
          "objectiveType": "boss",
          "objective": "Survivre au venin, libérer Thia et abattre le Vulture.",
          "actors": [
            "Dek",
            "Thia"
          ],
          "enemies": [
            "spike_pod",
            "genna_vulture"
          ],
          "gear": [
            "plasma_sword",
            "shuriken"
          ],
          "canonLock": true,
          "canonOutcome": "Thia fournit l’antidote après avoir utilisé l’arme lancée par Dek.",
          "chapter": 9,
          "next": [
            "pred_thia"
          ],
          "prev": [
            "pred_vines"
          ]
        },
        {
          "id": "pred_thia",
          "title": "Un outil parlant",
          "location": "Canopée hostile",
          "environment": "GENNA",
          "profile": "DEPTH",
          "objectiveType": "escort",
          "objective": "Transporter Thia et franchir la végétation prédatrice.",
          "actors": [
            "Dek",
            "Thia"
          ],
          "enemies": [
            "rock_biter",
            "spike_pod"
          ],
          "gear": [
            "plasma_sword"
          ],
          "canonLock": true,
          "canonOutcome": "Dek accepte Thia comme guide vers le repaire du Kalisk.",
          "chapter": 10,
          "next": [
            "pred_imbre"
          ],
          "prev": [
            "pred_spike_field"
          ]
        },
        {
          "id": "pred_imbre",
          "title": "Imbre Anguis",
          "location": "Vallée humide",
          "environment": "GENNA",
          "profile": "HYBRID",
          "objectiveType": "collect",
          "objective": "Observer trois organismes et progresser sans les gaspiller.",
          "actors": [
            "Dek",
            "Thia"
          ],
          "enemies": [
            "imbre_anguis"
          ],
          "gear": [
            "plasma_sword"
          ],
          "canonLock": true,
          "canonOutcome": "Thia exploite sa connaissance des organismes de Genna.",
          "chapter": 11,
          "next": [
            "pred_razor"
          ],
          "prev": [
            "pred_thia"
          ]
        },
        {
          "id": "pred_razor",
          "title": "La Razor Grass",
          "location": "Plaine coupante",
          "environment": "GENNA",
          "profile": "HYBRID",
          "objectiveType": "survive",
          "objective": "Traverser la Razor Grass en utilisant les ouvertures créées par la faune.",
          "actors": [
            "Dek",
            "Thia"
          ],
          "enemies": [
            "razor_grass",
            "bone_bison"
          ],
          "gear": [
            "plasma_sword"
          ],
          "canonLock": true,
          "canonOutcome": "Le terrain lui-même devient une menace.",
          "chapter": 12,
          "next": [
            "pred_bison"
          ],
          "prev": [
            "pred_imbre"
          ]
        },
        {
          "id": "pred_bison",
          "title": "La chasse du Bone Bison",
          "location": "Plaine du troupeau",
          "environment": "GENNA",
          "profile": "SIDE",
          "objectiveType": "boss",
          "objective": "Abattre le Bone Bison lors de sa charge.",
          "actors": [
            "Dek",
            "Thia",
            "Bud"
          ],
          "enemies": [
            "bone_bison_boss"
          ],
          "gear": [
            "plasma_sword"
          ],
          "canonLock": true,
          "canonOutcome": "Dek coupe le Bone Bison pendant la charge.",
          "chapter": 13,
          "next": [
            "pred_luna"
          ],
          "prev": [
            "pred_razor"
          ]
        },
        {
          "id": "pred_luna",
          "title": "Bud",
          "location": "Bordure de la plaine",
          "environment": "GENNA",
          "profile": "SIDE",
          "objectiveType": "boss",
          "objective": "Sauver la petite créature attaquée par le Luna Bug.",
          "actors": [
            "Dek",
            "Thia",
            "Bud"
          ],
          "enemies": [
            "luna_bug_boss"
          ],
          "gear": [
            "plasma_sword"
          ],
          "canonLock": true,
          "canonOutcome": "Bud rejoint le groupe après le sauvetage.",
          "chapter": 14,
          "next": [
            "pred_camp"
          ],
          "prev": [
            "pred_bison"
          ]
        },
        {
          "id": "pred_camp",
          "title": "Une nouvelle meute",
          "location": "Camp de nuit",
          "environment": "GENNA",
          "profile": "DEPTH",
          "objectiveType": "interact",
          "objective": "Partager la chasse, écouter Thia et laisser Bud marquer Dek.",
          "actors": [
            "Dek",
            "Thia",
            "Bud"
          ],
          "enemies": [],
          "gear": [
            "plasma_sword"
          ],
          "canonLock": true,
          "canonOutcome": "Bud marque Dek de son odeur; Thia évoque la notion de meute.",
          "chapter": 15,
          "next": [
            "pred_wreckage"
          ],
          "prev": [
            "pred_luna"
          ]
        },
        {
          "id": "pred_wreckage",
          "title": "Les morts de la première mission",
          "location": "Avant-poste Weyland-Yutani détruit",
          "environment": "GENNA",
          "profile": "HYBRID",
          "objectiveType": "collect",
          "objective": "Identifier trois restes de l’équipe de Thia et atteindre le terminal.",
          "actors": [
            "Dek",
            "Thia"
          ],
          "enemies": [
            "rock_biter"
          ],
          "gear": [
            "plasma_sword"
          ],
          "canonLock": true,
          "canonOutcome": "Thia retrouve les traces de son ancienne équipe.",
          "chapter": 16,
          "next": [
            "pred_mother"
          ],
          "prev": [
            "pred_camp"
          ]
        },
        {
          "id": "pred_mother",
          "title": "Signal à la Corporation",
          "location": "Terminal MU/TH/UR",
          "environment": "BASE",
          "profile": "DEPTH",
          "objectiveType": "interact",
          "objective": "Laisser Thia se connecter au système; la conséquence est canonique.",
          "actors": [
            "Dek",
            "Thia"
          ],
          "enemies": [],
          "gear": [
            "plasma_sword"
          ],
          "canonLock": true,
          "canonOutcome": "Thia révèle que Weyland-Yutani arrive pour capturer le Kalisk.",
          "chapter": 17,
          "next": [
            "pred_den"
          ],
          "prev": [
            "pred_wreckage"
          ]
        },
        {
          "id": "pred_den",
          "title": "Le Kalisk",
          "location": "Repaire du Kalisk",
          "environment": "GENNA",
          "profile": "HYBRID",
          "objectiveType": "boss",
          "objective": "Sectionner le Kalisk et survivre jusqu’à sa régénération complète.",
          "actors": [
            "Dek",
            "Kalisk"
          ],
          "enemies": [
            "kalisk_boss"
          ],
          "gear": [
            "plasma_sword"
          ],
          "canonLock": true,
          "canonOutcome": "Dek le décapite, mais le Kalisk se régénère et le domine.",
          "chapter": 18,
          "next": [
            "pred_capture"
          ],
          "prev": [
            "pred_mother"
          ]
        },
        {
          "id": "pred_capture",
          "title": "Pris vivant",
          "location": "Repaire · assaut Weyland-Yutani",
          "environment": "GENNA",
          "profile": "SIDE",
          "objectiveType": "survive",
          "objective": "Résister à l’escouade; la cryo-capture est verrouillée.",
          "actors": [
            "Dek",
            "Tessa",
            "Kalisk"
          ],
          "enemies": [
            "synth_drone",
            "synth_drone"
          ],
          "gear": [
            "plasma_sword"
          ],
          "canonLock": true,
          "canonOutcome": "Tessa immobilise Dek et le Kalisk avec l’équipement cryogénique.",
          "chapter": 19,
          "next": [
            "pred_lab"
          ],
          "prev": [
            "pred_den"
          ]
        },
        {
          "id": "pred_lab",
          "title": "Sujet d’étude",
          "location": "Laboratoire de contention",
          "environment": "BASE",
          "profile": "DEPTH",
          "objectiveType": "survive",
          "objective": "Tenir pendant l’examen jusqu’à l’intervention de Thia.",
          "actors": [
            "Dek",
            "Tessa",
            "Thia"
          ],
          "enemies": [
            "synth_drone"
          ],
          "gear": [],
          "canonLock": true,
          "canonOutcome": "Thia détourne l’attention et permet à Dek de s’échapper.",
          "chapter": 20,
          "next": [
            "pred_escape"
          ],
          "prev": [
            "pred_capture"
          ]
        },
        {
          "id": "pred_escape",
          "title": "Évasion",
          "location": "Galerie technique",
          "environment": "BASE",
          "profile": "HYBRID",
          "objectiveType": "combat",
          "objective": "Sortir du secteur d’étude sans récupérer l’ancien arsenal.",
          "actors": [
            "Dek"
          ],
          "enemies": [
            "synth_drone",
            "synth_drone"
          ],
          "gear": [
            "improvised_blade"
          ],
          "canonLock": true,
          "canonOutcome": "Dek fuit la base avec des moyens limités.",
          "chapter": 21,
          "next": [
            "pred_kwei_wreck"
          ],
          "prev": [
            "pred_lab"
          ]
        },
        {
          "id": "pred_kwei_wreck",
          "title": "Le dernier refuge de Kwei",
          "location": "Épave Yautja · intérieur",
          "environment": "SHIP",
          "profile": "DEPTH",
          "objectiveType": "interact",
          "objective": "Soigner les blessures, affronter le deuil de Kwei et préparer le retour.",
          "actors": [
            "Dek"
          ],
          "enemies": [],
          "gear": [
            "medikit_salvaged"
          ],
          "canonLock": true,
          "canonOutcome": "Dek retrouve le vaisseau de Kwei et change sa conception de la force.",
          "chapter": 22,
          "next": [
            "pred_organic"
          ],
          "prev": [
            "pred_escape"
          ]
        },
        {
          "id": "pred_organic",
          "title": "Arsenal de Genna",
          "location": "Jungle · atelier improvisé",
          "environment": "GENNA",
          "profile": "HYBRID",
          "objectiveType": "collect",
          "objective": "Fabriquer quatre armes à partir de l’écologie locale.",
          "actors": [
            "Dek",
            "Bud"
          ],
          "enemies": [
            "spike_pod",
            "explosive_grub"
          ],
          "gear": [
            "vulture_wristblade",
            "razor_claw",
            "explosive_grub_weapon",
            "squirt_cannon"
          ],
          "canonLock": true,
          "canonOutcome": "Dek transforme la faune et la flore de Genna en armes.",
          "chapter": 23,
          "next": [
            "pred_infiltration"
          ],
          "prev": [
            "pred_kwei_wreck"
          ]
        },
        {
          "id": "pred_infiltration",
          "title": "Retour à la base",
          "location": "Périmètre Weyland-Yutani",
          "environment": "BASE",
          "profile": "HYBRID",
          "objectiveType": "combat",
          "objective": "Neutraliser les gardes synthétiques avec l’arsenal organique.",
          "actors": [
            "Dek",
            "Bud"
          ],
          "enemies": [
            "synth_drone",
            "synth_drone",
            "synth_drone"
          ],
          "gear": [
            "vulture_wristblade",
            "explosive_grub_weapon",
            "squirt_cannon"
          ],
          "canonLock": true,
          "canonOutcome": "Dek et Bud infiltrent la base.",
          "chapter": 24,
          "next": [
            "pred_rescue"
          ],
          "prev": [
            "pred_organic"
          ]
        },
        {
          "id": "pred_rescue",
          "title": "Récupérer Thia",
          "location": "Maintenance synthétique",
          "environment": "BASE",
          "profile": "DEPTH",
          "objectiveType": "combat",
          "objective": "Libérer Thia et permettre à ses jambes de la rejoindre.",
          "actors": [
            "Dek",
            "Thia",
            "Bud"
          ],
          "enemies": [
            "synth_drone",
            "synth_drone"
          ],
          "gear": [
            "vulture_wristblade",
            "squirt_cannon"
          ],
          "canonLock": true,
          "canonOutcome": "Thia est réunifiée et le groupe reforme sa meute.",
          "chapter": 25,
          "next": [
            "pred_free_kalisk"
          ],
          "prev": [
            "pred_infiltration"
          ]
        },
        {
          "id": "pred_free_kalisk",
          "title": "Libérer la mère",
          "location": "Zone de confinement",
          "environment": "BASE",
          "profile": "SIDE",
          "objectiveType": "boss",
          "objective": "Ouvrir le confinement du Kalisk et survivre à la rupture.",
          "actors": [
            "Dek",
            "Thia",
            "Bud",
            "Kalisk"
          ],
          "enemies": [
            "containment_drones"
          ],
          "gear": [
            "organic_trap",
            "vulture_wristblade"
          ],
          "canonLock": true,
          "canonOutcome": "Le Kalisk est libéré et détruit une partie de la base.",
          "chapter": 26,
          "next": [
            "pred_tessa"
          ],
          "prev": [
            "pred_rescue"
          ]
        },
        {
          "id": "pred_tessa",
          "title": "Tessa au Power Loader",
          "location": "Hangar final",
          "environment": "BASE",
          "profile": "HYBRID",
          "objectiveType": "boss",
          "objective": "Vaincre le Power Loader, récupérer le plasmacaster de Kwei et protéger Thia.",
          "actors": [
            "Dek",
            "Tessa",
            "Thia",
            "Bud",
            "Kalisk"
          ],
          "enemies": [
            "tessa_loader_boss"
          ],
          "gear": [
            "vulture_wristblade",
            "squirt_cannon"
          ],
          "canonLock": true,
          "canonOutcome": "Tessa tue le Kalisk puis est détruite; Dek récupère le plasmacaster.",
          "chapter": 27,
          "next": [
            "pred_return"
          ],
          "prev": [
            "pred_free_kalisk"
          ]
        },
        {
          "id": "pred_return",
          "title": "Retour au clan",
          "location": "Yautja Prime · zone d’atterrissage",
          "environment": "YAUTJA",
          "profile": "SIDE",
          "objectiveType": "combat",
          "objective": "Traverser la garde du clan avec Thia et Bud.",
          "actors": [
            "Dek",
            "Thia",
            "Bud"
          ],
          "enemies": [
            "clan_guard",
            "clan_guard"
          ],
          "gear": [
            "kwei_plasmacaster",
            "plasma_sword"
          ],
          "canonLock": true,
          "canonOutcome": "Dek revient présenter son trophée et réclamer son dû.",
          "chapter": 28,
          "next": [
            "pred_njohrr"
          ],
          "prev": [
            "pred_tessa"
          ]
        },
        {
          "id": "pred_njohrr",
          "title": "Le père",
          "location": "Yautja Prime · esplanade du clan",
          "environment": "YAUTJA",
          "profile": "HYBRID",
          "objectiveType": "boss",
          "objective": "Désarmer Njohrr et briser son piège de domination.",
          "actors": [
            "Dek",
            "Njohrr",
            "Bud",
            "Thia"
          ],
          "enemies": [
            "njohrr_boss"
          ],
          "gear": [
            "kwei_plasmacaster",
            "plasma_sword"
          ],
          "canonLock": true,
          "canonOutcome": "Dek bat Njohrr; Bud l’achève et Dek prend le camouflage.",
          "chapter": 29,
          "next": [
            "pred_mother_ship"
          ],
          "prev": [
            "pred_return"
          ]
        },
        {
          "id": "pred_mother_ship",
          "title": "La prochaine chasse",
          "location": "Yautja Prime · horizon",
          "environment": "YAUTJA",
          "profile": "SIDE",
          "objectiveType": "interact",
          "objective": "Observer le vaisseau qui apparaît et terminer sur la révélation finale.",
          "actors": [
            "Dek",
            "Thia",
            "Bud"
          ],
          "enemies": [],
          "gear": [
            "cloak",
            "plasma_sword"
          ],
          "canonLock": true,
          "canonOutcome": "Un immense vaisseau arrive; Dek l’identifie comme celui de sa mère.",
          "chapter": 30,
          "next": [],
          "prev": [
            "pred_njohrr"
          ]
        }
      ]
    }
  ],
  "weapons": {
    "plasma_sword": {
      "name": "Épée plasma",
      "kind": "melee",
      "damage": 44
    },
    "gauntlet": {
      "name": "Gantelet Yautja",
      "kind": "utility",
      "damage": 0
    },
    "bow": {
      "name": "Arc Yautja",
      "kind": "ranged",
      "damage": 26
    },
    "combistick": {
      "name": "Combistick",
      "kind": "melee",
      "damage": 32
    },
    "cryo_grenade": {
      "name": "Grenade cryogénique",
      "kind": "ranged",
      "damage": 36
    },
    "medikit": {
      "name": "Medi-kit Yautja",
      "kind": "heal",
      "damage": 0
    },
    "shuriken": {
      "name": "Shuriken",
      "kind": "ranged",
      "damage": 28
    },
    "scanner_yautja": {
      "name": "Atlas de chasse",
      "kind": "utility",
      "damage": 0
    },
    "ship_controls": {
      "name": "Commandes de vol",
      "kind": "utility",
      "damage": 0
    },
    "scanner": {
      "name": "Scanner Weyland-Yutani",
      "kind": "utility",
      "damage": 0
    },
    "repair_tool": {
      "name": "Outil de réparation synthétique",
      "kind": "heal",
      "damage": 0
    },
    "synth_rifle": {
      "name": "Fusil synthétique",
      "kind": "ranged",
      "damage": 18
    },
    "kwei_plasmacaster": {
      "name": "Plasmacaster de Kwei",
      "kind": "ranged",
      "damage": 40
    },
    "syringe": {
      "name": "Sonde d’échantillonnage",
      "kind": "utility",
      "damage": 0
    },
    "power_loader": {
      "name": "Power Loader",
      "kind": "melee",
      "damage": 52
    },
    "improvised_blade": {
      "name": "Lame improvisée",
      "kind": "melee",
      "damage": 24
    },
    "medikit_salvaged": {
      "name": "Medi-kit récupéré",
      "kind": "heal",
      "damage": 0
    },
    "vulture_wristblade": {
      "name": "Wristblade · bec de Vulture",
      "kind": "melee",
      "damage": 34
    },
    "razor_claw": {
      "name": "Lames de Razor Grass",
      "kind": "melee",
      "damage": 30
    },
    "explosive_grub_weapon": {
      "name": "Grubs explosifs",
      "kind": "ranged",
      "damage": 42
    },
    "squirt_cannon": {
      "name": "Squirt · canon organique",
      "kind": "ranged",
      "damage": 24
    },
    "organic_trap": {
      "name": "Piège organique",
      "kind": "ranged",
      "damage": 34
    },
    "cloak": {
      "name": "Camouflage de Njohrr",
      "kind": "utility",
      "damage": 0
    }
  },
  "enemies": {
    "tree_vine": {
      "name": "Liane prédatrice",
      "hp": 36,
      "damage": 8
    },
    "spike_pod": {
      "name": "Spike Pod",
      "hp": 30,
      "damage": 7
    },
    "rock_biter": {
      "name": "Rock Biter",
      "hp": 42,
      "damage": 10
    },
    "bone_bison": {
      "name": "Bone Bison",
      "hp": 72,
      "damage": 15
    },
    "bone_bison_boss": {
      "name": "Bone Bison",
      "hp": 180,
      "damage": 20
    },
    "luna_bug": {
      "name": "Luna Bug",
      "hp": 70,
      "damage": 14
    },
    "luna_bug_boss": {
      "name": "Luna Bug",
      "hp": 170,
      "damage": 18
    },
    "genna_vulture": {
      "name": "Genna Vulture",
      "hp": 85,
      "damage": 16
    },
    "kalisk": {
      "name": "Kalisk",
      "hp": 400,
      "damage": 25
    },
    "kalisk_boss": {
      "name": "Kalisk",
      "hp": 700,
      "damage": 28
    },
    "kalisk_ally": {
      "name": "Kalisk",
      "hp": 450,
      "damage": 0
    },
    "dek_target": {
      "name": "Dek",
      "hp": 250,
      "damage": 16
    },
    "dek_boss": {
      "name": "Dek",
      "hp": 360,
      "damage": 22
    },
    "synth_drone": {
      "name": "Drone synthétique",
      "hp": 80,
      "damage": 14
    },
    "containment_drones": {
      "name": "Drones de confinement",
      "hp": 220,
      "damage": 16
    },
    "organic_trap": {
      "name": "Défense organique",
      "hp": 70,
      "damage": 12
    },
    "thia_legs": {
      "name": "Jambes autonomes de Thia",
      "hp": 120,
      "damage": 9
    },
    "debris": {
      "name": "Débris orbital",
      "hp": 60,
      "damage": 18
    },
    "imbre_anguis": {
      "name": "Imbre Anguis",
      "hp": 45,
      "damage": 5
    },
    "razor_grass": {
      "name": "Razor Grass",
      "hp": 50,
      "damage": 12
    },
    "explosive_grub": {
      "name": "Explosive Grub",
      "hp": 25,
      "damage": 20
    },
    "kwei_spar": {
      "name": "Kwei · entraînement",
      "hp": 260,
      "damage": 16
    },
    "njohrr_script": {
      "name": "Njohrr",
      "hp": 999,
      "damage": 22
    },
    "tessa_loader_boss": {
      "name": "Tessa · Power Loader",
      "hp": 620,
      "damage": 24
    },
    "clan_guard": {
      "name": "Garde du clan",
      "hp": 120,
      "damage": 18
    },
    "njohrr_boss": {
      "name": "Njohrr",
      "hp": 720,
      "damage": 26
    }
  },
  "sources": [
    {
      "name": "20th Century Studios — Predator: Badlands",
      "url": "https://www.20thcenturystudios.com/movies/predator-badlands",
      "use": "Synopsis officiel, date, durée, protagonistes."
    },
    {
      "name": "The Walt Disney Company — How Predator: Badlands Expands the Franchise",
      "url": "https://thewaltdisneycompany.com/news/predator-badlands/",
      "use": "Dek, Thia, Kalisk, statut d’outsider, absence initiale de cloak/plasmacaster."
    },
    {
      "name": "Reuters — Predator perspective at Comic-Con",
      "url": "https://www.reuters.com/business/media-telecom/predator-badlands-propels-predator-perspective-comic-con-2025-07-26/",
      "use": "Confirmation qu’aucun personnage humain n’apparaît dans le film."
    },
    {
      "name": "Wētā Workshop Design Studio — Predator: Badlands Yautja Weapons",
      "url": "https://wetaworkshopdesignstudio.artstation.com/projects/rlxRPa",
      "use": "Références de design canon : épée, arc, combistick, shuriken, gauntlet, plasmacaster, etc."
    },
    {
      "name": "AVP Galaxy — Badlands set report",
      "url": "https://www.avpgalaxy.net/2025/10/06/predator-badlands-set-report-confirms-new-details-pg-13-rating/",
      "use": "Équipement visible, cryo-grenades, outils de Thia, improvisation organique."
    },
    {
      "name": "Wikipedia — Predator: Badlands",
      "url": "https://en.wikipedia.org/wiki/Predator:_Badlands",
      "use": "Ordre détaillé des événements du film, recoupé avec les sources secondaires."
    },
    {
      "name": "AVP Central — Creatures of Genna",
      "url": "https://www.avpcentral.com/badlands-creatures-genna-monsters-guide",
      "use": "Noms usuels des créatures et dangers de Genna."
    },
    {
      "name": "AVP Central — Kwei’s ship",
      "url": "https://www.avpcentral.com/kwei-ship",
      "use": "Organisation du vaisseau, crash, récupération par Tessa et retour final."
    }
  ],
  "fidelity": {
    "humanPOV": "Le film ne contient pas de personnages humains; la campagne 1 utilise donc la branche Weyland-Yutani synthétique, sans inventer un protagoniste humain.",
    "dialogue": "Dialogues du prototype originaux/paraphrasés; aucun script du film n’est reproduit.",
    "locations": "Les noms de zones naturelles sont descriptifs lorsqu’aucun nom officiel public n’existe.",
    "canonLocks": [
      "Mort de Kwei",
      "Perte de l’arsenal dans les lianes",
      "Défaite/régénération du Kalisk",
      "Capture cryogénique",
      "Mort du Kalisk",
      "Mort de Tessa",
      "Défaite de Njohrr",
      "Arrivée du vaisseau de la mère de Dek"
    ]
  }
};
