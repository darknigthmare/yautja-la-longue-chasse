globalThis.AVPR_WOLF_DATA = {
  "version": "0.7.0-candidate.1",
  "saveKey": "tantalus.avpr.wolf.v07",
  "worldWidth": 2300,
  "chapters": [
    {
      "id": 0,
      "title": "LE SIGNAL",
      "summary": "Wolf reçoit l’appel de détresse sur le monde Yautja et prépare le Cleaner case."
    },
    {
      "id": 1,
      "title": "DESCENTE",
      "summary": "Transit solitaire vers Gunnison."
    },
    {
      "id": 2,
      "title": "LE VAISSEAU ÉCRASÉ",
      "summary": "Enquête sur l’épave, biomask Unrated, pistage et destruction des preuves."
    },
    {
      "id": 3,
      "title": "PREMIÈRES TRACES",
      "summary": "Buddy, Sam, facehuggers et Deputy Ray."
    },
    {
      "id": 4,
      "title": "SOUS GUNNISON",
      "summary": "Nettoyage des égouts, mines laser et premier affrontement avec le Predalien."
    },
    {
      "id": 5,
      "title": "PANNE GÉNÉRALE",
      "summary": "Poursuite à la centrale, interférences de ciblage, blessure et blackout."
    },
    {
      "id": 6,
      "title": "EAU NOIRE",
      "summary": "Piscine du lycée : élimination puis dissolution des traces."
    },
    {
      "id": 7,
      "title": "LA BLESSURE",
      "summary": "Medicomp dans l’arbre et cimetière en montage Unrated."
    },
    {
      "id": 8,
      "title": "VILLE EN GUERRE",
      "summary": "Traversée de Gunnison pendant l’effondrement de la Garde nationale."
    },
    {
      "id": 9,
      "title": "LE MAGASIN",
      "summary": "Dallas utilisé comme appât, bataille et conversion des plasmacasters en arme de poing."
    },
    {
      "id": 10,
      "title": "LA RUCHE DE L’HÔPITAL",
      "summary": "Infestation de l’hôpital, maternité et confrontation avec le Predalien."
    },
    {
      "id": 11,
      "title": "CHUTE",
      "summary": "Accident du shuriken, Ricky, cage d’ascenseur et perte du Plasma Pistol."
    },
    {
      "id": 12,
      "title": "REQUIEM",
      "summary": "Toit, gauntlet endommagé, retrait volontaire du biomask, duel et lutte finale Wolf contre Predalien."
    },
    {
      "id": 13,
      "title": "ZÉRO TRACE",
      "summary": "Frappe nucléaire et épilogue Yutani."
    }
  ],
  "rooms": [
    {
      "id": "homeworld_signal",
      "c": 0,
      "name": "Monde Yautja — chambre des trophées",
      "theme": "home",
      "fidelity": "screen",
      "action": "interact",
      "objective": "Recevoir le signal de détresse et ouvrir le Cleaner case.",
      "target": "Console de détresse",
      "lanes": 2,
      "next": "homeworld_gear",
      "fx": [],
      "canonRequired": true
    },
    {
      "id": "homeworld_gear",
      "c": 0,
      "name": "Monde Yautja — armement de Wolf",
      "theme": "home",
      "fidelity": "screen",
      "action": "loadout",
      "objective": "Valider l’équipement de nettoyage de Wolf.",
      "target": "Cleaner case",
      "lanes": 2,
      "next": "homeworld_launch",
      "fx": [],
      "canonRequired": true
    },
    {
      "id": "homeworld_launch",
      "c": 0,
      "name": "Plateforme de départ",
      "theme": "home",
      "fidelity": "reconstruction",
      "action": "exit",
      "objective": "Rejoindre l’appareil personnel de Wolf.",
      "lanes": 2,
      "next": "craft_transit",
      "fx": [],
      "canonRequired": false
    },
    {
      "id": "craft_transit",
      "c": 1,
      "name": "Appareil de Wolf — transit",
      "theme": "craft",
      "fidelity": "reconstruction",
      "action": "interact",
      "objective": "Synchroniser les coordonnées du crash à Gunnison.",
      "target": "Navigation",
      "lanes": 1,
      "next": "crash_perimeter",
      "fx": [],
      "canonRequired": false
    },
    {
      "id": "crash_perimeter",
      "c": 2,
      "name": "Forêt — périmètre du crash",
      "theme": "forest",
      "fidelity": "screen",
      "action": "scan",
      "objective": "Repérer l’épave et les traces biologiques avec le matériel Yautja.",
      "target": "Trace biologique",
      "lanes": 3,
      "next": "wreck_exterior",
      "fx": [
        "fog",
        "foliage"
      ],
      "canonRequired": true
    },
    {
      "id": "wreck_exterior",
      "c": 2,
      "name": "Scout ship — coque éventrée",
      "theme": "ship",
      "fidelity": "screen",
      "action": "cleanup",
      "objective": "Dissoudre les traces et dépouilles visibles autour de l’épave.",
      "evidence": 3,
      "lanes": 3,
      "next": "wreck_biomask",
      "fx": [],
      "canonRequired": true
    },
    {
      "id": "wreck_biomask",
      "c": 2,
      "name": "Scout ship — compartiment des morts",
      "theme": "ship",
      "fidelity": "unrated",
      "action": "unrated_interact",
      "objective": "Porter le biomask du Predator mort et consulter l’enregistrement.",
      "target": "Biomask du mort",
      "lanes": 2,
      "next": "wreck_trace",
      "fx": [],
      "canonRequired": true
    },
    {
      "id": "wreck_trace",
      "c": 2,
      "name": "Scout ship — piste du facehugger",
      "theme": "ship",
      "fidelity": "screen",
      "action": "scan",
      "objective": "Analyser la trace laissée par les facehuggers.",
      "target": "Résidu organique",
      "lanes": 2,
      "next": "wreck_core",
      "fx": [],
      "canonRequired": true
    },
    {
      "id": "wreck_core",
      "c": 2,
      "name": "Scout ship — noyau de destruction",
      "theme": "ship",
      "fidelity": "screen",
      "action": "interact",
      "objective": "Armer la destruction de l’appareil avant de quitter le site.",
      "target": "Charge de destruction",
      "lanes": 2,
      "next": "forest_buddy",
      "fx": [],
      "canonRequired": true
    },
    {
      "id": "forest_buddy",
      "c": 3,
      "name": "Forêt — zone de chasse",
      "theme": "forest",
      "fidelity": "screen",
      "action": "cleanup",
      "objective": "Dissoudre Buddy, Sam et les Facehuggers morts avant l’arrivée de Ray.",
      "enemies": [],
      "evidence": 4,
      "lanes": 3,
      "next": "forest_ray",
      "fx": [
        "fog",
        "foliage"
      ],
      "canonRequired": true
    },
    {
      "id": "forest_ray",
      "c": 3,
      "name": "Forêt — Deputy Ray",
      "theme": "forest",
      "fidelity": "screen",
      "action": "human_script",
      "objective": "Neutraliser le témoin qui surprend Wolf puis effacer sa présence.",
      "target": "Deputy Ray",
      "evidence": 1,
      "lanes": 3,
      "next": "sewer_access",
      "fx": [
        "fog",
        "foliage"
      ],
      "canonRequired": true
    },
    {
      "id": "sewer_access",
      "c": 4,
      "name": "Égouts — accès de maintenance",
      "theme": "sewer",
      "fidelity": "screen",
      "action": "scan",
      "objective": "Tracer la contamination jusqu’au réseau souterrain.",
      "target": "Résidu xénomorphe",
      "lanes": 3,
      "next": "sewer_bodies",
      "fx": [
        "steam"
      ],
      "canonRequired": true
    },
    {
      "id": "sewer_bodies",
      "c": 4,
      "name": "Égouts — chambre des victimes",
      "theme": "hive",
      "fidelity": "screen",
      "action": "cleanup",
      "objective": "Dissoudre les corps abandonnés par l’infestation.",
      "evidence": 5,
      "lanes": 3,
      "next": "sewer_traps",
      "fx": [
        "steam"
      ],
      "canonRequired": true
    },
    {
      "id": "sewer_traps",
      "c": 4,
      "name": "Égouts — corridor d’embuscade",
      "theme": "sewer",
      "fidelity": "screen",
      "action": "mine_ambush",
      "objective": "Tendre les mines laser et éliminer les deux Xénomorphes de l’embuscade.",
      "requiredMines": 2,
      "enemies": [
        [
          "xeno",
          2
        ]
      ],
      "lanes": 3,
      "next": "sewer_wave",
      "fx": [
        "steam"
      ],
      "canonRequired": true
    },
    {
      "id": "sewer_wave",
      "c": 4,
      "name": "Égouts — mêlée de nettoyage",
      "theme": "sewer",
      "fidelity": "reconstruction",
      "action": "exit",
      "objective": "Traverser le collecteur jusqu’au point de contact avec le Predalien.",
      "enemies": [],
      "lanes": 3,
      "next": "sewer_predalien",
      "fx": [
        "steam"
      ],
      "canonRequired": false
    },
    {
      "id": "sewer_predalien",
      "c": 4,
      "name": "Égouts — premier Predalien",
      "theme": "hive",
      "fidelity": "screen",
      "action": "predalien_retreat",
      "objective": "Survivre au choc du Predalien et constater sa fuite.",
      "enemies": [
        [
          "predalien_shadow",
          1
        ]
      ],
      "lanes": 3,
      "next": "sewer_breakout",
      "fx": [
        "steam"
      ],
      "canonRequired": true
    },
    {
      "id": "sewer_breakout",
      "c": 4,
      "name": "Égouts — rupture du collecteur",
      "theme": "sewer",
      "fidelity": "screen",
      "action": "power_punch_exit",
      "objective": "Utiliser le Power Punch Glove pour percer la chaussée et remonter en ville.",
      "lanes": 3,
      "next": "power_roof",
      "fx": [
        "steam"
      ],
      "lockWeapon": "gauntlet",
      "canonRequired": true
    },
    {
      "id": "power_roof",
      "c": 5,
      "name": "Centrale — structures extérieures",
      "theme": "power",
      "fidelity": "reconstruction",
      "action": "exit",
      "objective": "Suivre la piste jusqu’à la zone d’interférences de la centrale.",
      "enemies": [],
      "lanes": 3,
      "next": "power_heat",
      "fx": [
        "sparks"
      ],
      "canonRequired": false
    },
    {
      "id": "power_heat",
      "c": 5,
      "name": "Centrale — zone d’interférences",
      "theme": "power",
      "fidelity": "screen",
      "action": "power_interference",
      "objective": "Maintenir la poursuite malgré les émissions thermiques qui perturbent la visée.",
      "enemies": [
        [
          "xeno",
          1
        ]
      ],
      "lanes": 3,
      "next": "power_blackout",
      "fx": [
        "sparks"
      ],
      "canonRequired": true
    },
    {
      "id": "power_blackout",
      "c": 5,
      "name": "Centrale — blackout",
      "theme": "power",
      "fidelity": "screen",
      "action": "script",
      "objective": "Survivre à la chute et accepter la panne générale comme conséquence canonique.",
      "lanes": 2,
      "next": "school_approach",
      "fx": [
        "sparks"
      ],
      "canonRequired": true
    },
    {
      "id": "school_approach",
      "c": 6,
      "name": "Lycée — approche nocturne",
      "theme": "street",
      "fidelity": "reconstruction",
      "action": "exit",
      "objective": "Suivre la piste jusqu’à la piscine.",
      "lanes": 3,
      "next": "pool_fight",
      "fx": [
        "blackout"
      ],
      "canonRequired": false
    },
    {
      "id": "pool_fight",
      "c": 6,
      "name": "Lycée — piscine",
      "theme": "pool",
      "fidelity": "screen",
      "action": "fight",
      "objective": "Tuer le Xénomorphe de la piscine avec le Combistick.",
      "enemies": [
        [
          "xeno",
          1
        ]
      ],
      "lanes": 2,
      "next": "pool_cleanup",
      "fx": [
        "water"
      ],
      "lockWeapon": "combistick",
      "canonRequired": true
    },
    {
      "id": "pool_cleanup",
      "c": 6,
      "name": "Lycée — bassin contaminé",
      "theme": "pool",
      "fidelity": "screen",
      "action": "cleanup",
      "objective": "Dissoudre le xénomorphe et les traces dans le bassin.",
      "evidence": 3,
      "lanes": 2,
      "next": "tree_medicomp",
      "fx": [
        "water"
      ],
      "canonRequired": true
    },
    {
      "id": "tree_medicomp",
      "c": 7,
      "name": "Forêt — perchoir de soin",
      "theme": "forest",
      "fidelity": "screen",
      "action": "medicomp",
      "objective": "Utiliser le Medicomp jusqu’à fermeture de la blessure.",
      "lanes": 2,
      "next": "cemetery_karl",
      "fx": [
        "fog",
        "foliage"
      ],
      "canonRequired": true
    },
    {
      "id": "cemetery_karl",
      "c": 7,
      "name": "Cimetière de Gunnison",
      "theme": "cemetery",
      "fidelity": "unrated",
      "action": "human_script",
      "objective": "Neutraliser Karl lorsqu’il menace Kelly et Molly.",
      "target": "Karl",
      "lanes": 3,
      "next": "street_blackout",
      "fx": [
        "fog",
        "foliage"
      ],
      "canonRequired": true
    },
    {
      "id": "street_blackout",
      "c": 8,
      "name": "Gunnison — rues sans courant",
      "theme": "street",
      "fidelity": "reconstruction",
      "action": "exit",
      "objective": "Traverser Gunnison plongée dans le noir en suivant la piste.",
      "enemies": [],
      "lanes": 3,
      "next": "guard_ruins",
      "fx": [
        "blackout"
      ],
      "canonRequired": false
    },
    {
      "id": "guard_ruins",
      "c": 8,
      "name": "Gunnison — position de la Garde nationale",
      "theme": "street",
      "fidelity": "parallel",
      "action": "exit",
      "objective": "Passer la position détruite de la Garde nationale sans détourner la chasse.",
      "enemies": [],
      "lanes": 3,
      "next": "store_roof",
      "fx": [
        "blackout"
      ],
      "canonRequired": false
    },
    {
      "id": "store_roof",
      "c": 9,
      "name": "Magasin d’armes — accès supérieur",
      "theme": "store",
      "fidelity": "reconstruction",
      "action": "exit",
      "objective": "Entrer dans le magasin où les survivants se sont retranchés.",
      "lanes": 3,
      "next": "store_dallas",
      "fx": [
        "blackout"
      ],
      "canonRequired": false
    },
    {
      "id": "store_dallas",
      "c": 9,
      "name": "Magasin d’armes — Dallas",
      "theme": "store",
      "fidelity": "screen",
      "action": "capture_bait",
      "objective": "Suspendre Dallas comme appât pour attirer les xénomorphes.",
      "target": "Dallas",
      "lanes": 3,
      "next": "store_battle",
      "fx": [
        "blackout"
      ],
      "canonRequired": true
    },
    {
      "id": "store_battle",
      "c": 9,
      "name": "Magasin d’armes — siège",
      "theme": "store",
      "fidelity": "screen",
      "action": "store_battle",
      "objective": "Neutraliser Earl et Scotty, puis survivre à l’assaut des cinq Xénomorphes.",
      "enemies": [
        [
          "human_looter",
          2
        ]
      ],
      "lanes": 3,
      "next": "store_conversion",
      "fx": [
        "blackout"
      ],
      "canonRequired": true
    },
    {
      "id": "store_conversion",
      "c": 9,
      "name": "Magasin d’armes — conversion",
      "theme": "store",
      "fidelity": "screen",
      "action": "convert_pistol",
      "objective": "Assembler les deux plasmacasters en Plasma Pistol de fortune.",
      "target": "Plasmacasters",
      "lanes": 2,
      "next": "hospital_approach",
      "fx": [
        "blackout"
      ],
      "canonRequired": true
    },
    {
      "id": "hospital_approach",
      "c": 10,
      "name": "Hôpital — parking et accès",
      "theme": "hospital",
      "fidelity": "reconstruction",
      "action": "exit",
      "objective": "Atteindre l’hôpital en suivant les signatures xénomorphes.",
      "enemies": [],
      "lanes": 3,
      "next": "hospital_corridor",
      "fx": [
        "blackout",
        "steam"
      ],
      "canonRequired": false
    },
    {
      "id": "hospital_corridor",
      "c": 10,
      "name": "Hôpital — couloirs",
      "theme": "hospital",
      "fidelity": "screen",
      "action": "exit",
      "objective": "Progresser dans les couloirs jusqu’à la maternité contaminée.",
      "enemies": [],
      "lanes": 3,
      "next": "hospital_predalien",
      "fx": [
        "blackout",
        "steam"
      ],
      "canonRequired": true
    },
    {
      "id": "hospital_predalien",
      "c": 10,
      "name": "Hôpital — contact Predalien",
      "theme": "hive",
      "fidelity": "screen",
      "action": "predalien_retreat",
      "objective": "Blesser le Predalien aux Wrist Blades et le forcer à se retirer.",
      "enemies": [
        [
          "predalien_shadow",
          1
        ]
      ],
      "lockWeapon": "blades",
      "lanes": 3,
      "next": "hospital_three",
      "fx": [
        "blackout",
        "steam"
      ],
      "canonRequired": true
    },
    {
      "id": "hospital_three",
      "c": 10,
      "name": "Hôpital — trois guerriers",
      "theme": "hospital",
      "fidelity": "screen",
      "action": "hospital_three",
      "objective": "Éliminer les trois xénomorphes avec le Plasma Pistol et le liquide dissolvant.",
      "enemies": [
        [
          "xeno",
          2
        ]
      ],
      "lanes": 3,
      "next": "maternity_hive",
      "fx": [
        "blackout",
        "steam"
      ],
      "canonRequired": true
    },
    {
      "id": "maternity_hive",
      "c": 10,
      "name": "Hôpital — maternité",
      "theme": "maternity",
      "fidelity": "screen",
      "action": "scan",
      "objective": "Identifier la maternité transformée en ruche et confirmer la présence du Predalien.",
      "enemies": [],
      "lanes": 3,
      "next": "hospital_shuriken",
      "fx": [
        "blackout",
        "steam"
      ],
      "canonRequired": true
    },
    {
      "id": "hospital_shuriken",
      "c": 11,
      "name": "Hôpital — croisement avec les survivants",
      "theme": "hospital",
      "fidelity": "screen",
      "action": "shuriken_crossfire",
      "objective": "Abattre deux xénomorphes au shuriken ; la trajectoire de l’un d’eux déclenche l’accident canonique.",
      "enemies": [
        [
          "xeno",
          2
        ]
      ],
      "lockWeapon": "shuriken",
      "lanes": 3,
      "next": "hospital_ricky",
      "fx": [
        "blackout",
        "steam"
      ],
      "canonRequired": true
    },
    {
      "id": "hospital_ricky",
      "c": 11,
      "name": "Hôpital — Ricky ouvre le feu",
      "theme": "hospital",
      "fidelity": "screen",
      "action": "script",
      "objective": "Encaisser la fusillade jusqu’à l’intervention du Predalien.",
      "lanes": 3,
      "next": "elevator_fall",
      "fx": [
        "blackout",
        "steam"
      ],
      "canonRequired": true
    },
    {
      "id": "elevator_fall",
      "c": 11,
      "name": "Hôpital — cage d’ascenseur",
      "theme": "shaft",
      "fidelity": "screen",
      "action": "elevator_fall",
      "objective": "Survivre à l’attaque qui précipite Wolf dans la cage d’ascenseur.",
      "enemies": [
        [
          "xeno",
          1
        ]
      ],
      "lanes": 2,
      "next": "shaft_bottom",
      "fx": [
        "blackout",
        "steam"
      ],
      "canonRequired": true
    },
    {
      "id": "shaft_bottom",
      "c": 11,
      "name": "Cage d’ascenseur — niveau inférieur",
      "theme": "shaft",
      "fidelity": "reconstruction",
      "action": "fight",
      "objective": "Achever le xénomorphe et retrouver un passage vers le toit.",
      "enemies": [
        [
          "xeno",
          1
        ]
      ],
      "lanes": 2,
      "next": "shaft_climb",
      "fx": [
        "blackout",
        "steam"
      ],
      "canonRequired": false
    },
    {
      "id": "shaft_climb",
      "c": 11,
      "name": "Cage d’ascenseur — remontée",
      "theme": "shaft",
      "fidelity": "reconstruction",
      "action": "exit",
      "objective": "Remonter sans le Plasma Pistol, désormais récupéré par Dallas.",
      "lanes": 2,
      "next": "roof_access",
      "fx": [
        "blackout",
        "steam"
      ],
      "canonRequired": false
    },
    {
      "id": "roof_access",
      "c": 12,
      "name": "Hôpital — accès toiture",
      "theme": "hospital",
      "fidelity": "reconstruction",
      "action": "exit",
      "objective": "Rejoindre le toit après la remontée de la cage d’ascenseur.",
      "enemies": [],
      "lanes": 3,
      "next": "roof_wave",
      "fx": [
        "blackout",
        "steam"
      ],
      "canonRequired": false
    },
    {
      "id": "roof_wave",
      "c": 12,
      "name": "Hôpital — toit sous la pluie",
      "theme": "roof",
      "fidelity": "screen",
      "action": "fight",
      "objective": "Exécuter le Xénomorphe qui menace Dallas avant le duel final.",
      "enemies": [
        [
          "xeno",
          1
        ]
      ],
      "lanes": 3,
      "next": "roof_duel",
      "fx": [
        "rain",
        "lightning"
      ],
      "canonRequired": true
    },
    {
      "id": "roof_duel",
      "c": 12,
      "name": "Hôpital — duel Wolf / Predalien",
      "theme": "roof",
      "fidelity": "screen",
      "action": "boss",
      "objective": "Affronter le Predalien : gauntlet brisé, retrait volontaire du biomask, extraction de la mâchoire interne et échange mortel.",
      "enemies": [
        [
          "predalien",
          1
        ]
      ],
      "lanes": 3,
      "next": "strike_warning",
      "bossPhases": [
        "gauntlet_damage",
        "gear_shed",
        "inner_jaw_rip",
        "final_grapple",
        "mutual_fatality"
      ],
      "fx": [
        "rain",
        "lightning"
      ],
      "canonRequired": true
    },
    {
      "id": "strike_warning",
      "c": 13,
      "name": "Gunnison — dernier verrouillage",
      "theme": "roof",
      "fidelity": "screen",
      "action": "finale",
      "objective": "Wolf et le Predalien sont mortellement blessés ; aucune fuite n’est possible.",
      "lanes": 1,
      "next": "blast",
      "fx": [
        "rain",
        "lightning"
      ],
      "canonRequired": true
    },
    {
      "id": "blast",
      "c": 13,
      "name": "Gunnison — frappe nucléaire",
      "theme": "blast",
      "fidelity": "screen",
      "action": "finale",
      "objective": "Fin canonique de Wolf et du Predalien.",
      "lanes": 1,
      "next": "yutani",
      "fx": [
        "blast"
      ],
      "canonRequired": true
    },
    {
      "id": "yutani",
      "c": 13,
      "name": "Épilogue — technologie récupérée",
      "theme": "epilogue",
      "fidelity": "screen",
      "action": "epilogue",
      "objective": "Le Plasma Pistol saisi à Dallas est remis à Ms. Yutani.",
      "lanes": 1,
      "next": null,
      "fx": [],
      "canonRequired": true
    }
  ],
  "parallelEvents": [
    {
      "after": "crash_perimeter",
      "title": "Périphérie du crash",
      "text": "Buddy et Sam deviennent les premières victimes humaines à proximité de l’épave."
    },
    {
      "after": "forest_ray",
      "title": "Gunnison",
      "text": "La disparition de Ray et des chasseurs déclenche les recherches locales."
    },
    {
      "after": "sewer_predalien",
      "title": "Diner",
      "text": "Le Predalien atteint la ville et propage l’infestation pendant que Wolf rejoint la surface."
    },
    {
      "after": "power_heat",
      "title": "Karl voit Wolf",
      "text": "Unrated : Karl, employé de la centrale, aperçoit Wolf camouflé et s’enfuit ; il réapparaît ensuite au cimetière.",
      "unrated": true
    },
    {
      "after": "power_blackout",
      "title": "Blackout",
      "text": "L’extinction plonge la piscine, les habitations et les rues dans le chaos."
    },
    {
      "after": "pool_cleanup",
      "title": "O’Brien",
      "text": "Kelly et Molly fuient leur domicile après l’attaque xénomorphe."
    },
    {
      "after": "guard_ruins",
      "title": "Garde nationale",
      "text": "Les renforts militaires sont submergés avant de pouvoir contenir Gunnison."
    },
    {
      "after": "store_conversion",
      "title": "Évacuation",
      "text": "Les survivants apprennent l’existence d’un point de rassemblement militaire mais choisissent l’hôpital."
    },
    {
      "after": "maternity_hive",
      "title": "Hôpital",
      "text": "Le Predalien utilise la maternité pour accélérer la propagation de l’infestation."
    },
    {
      "after": "elevator_fall",
      "title": "Arme perdue",
      "text": "Dallas récupère le Plasma Pistol tombé par Wolf et l’utilise pour survivre."
    },
    {
      "after": "roof_wave",
      "title": "Fuite humaine",
      "text": "Kelly, Molly, Dallas et Ricky quittent le toit en hélicoptère."
    },
    {
      "after": "blast",
      "title": "Après la frappe",
      "text": "Le groupe évacué s’écrase hors de la zone puis est récupéré par l’armée."
    },
    {
      "after": "yutani",
      "title": "Yutani",
      "text": "La technologie de Wolf devient un artefact humain après sa mort."
    }
  ],
  "weapons": [
    {
      "id": "blades",
      "name": "Wrist Blades",
      "range": 88,
      "damage": 34,
      "energy": 0,
      "ammo": null,
      "kind": "melee",
      "availableFrom": "homeworld_signal"
    },
    {
      "id": "dual",
      "name": "Dual Plasmacasters",
      "range": 780,
      "damage": 50,
      "energy": 9,
      "ammo": null,
      "kind": "plasma",
      "availableFrom": "homeworld_signal",
      "unavailableAfter": "store_battle"
    },
    {
      "id": "combistick",
      "name": "Combistick",
      "range": 170,
      "damage": 45,
      "energy": 0,
      "ammo": null,
      "kind": "melee",
      "availableFrom": "homeworld_signal"
    },
    {
      "id": "whip",
      "name": "Razor Whip",
      "range": 225,
      "damage": 58,
      "energy": 0,
      "ammo": null,
      "kind": "melee",
      "availableFrom": "homeworld_signal"
    },
    {
      "id": "shuriken",
      "name": "Collapsible Shuriken",
      "range": 640,
      "damage": 62,
      "energy": 0,
      "ammo": 7,
      "kind": "projectile",
      "availableFrom": "homeworld_signal"
    },
    {
      "id": "pistol",
      "name": "Plasma Pistol",
      "range": 650,
      "damage": 68,
      "energy": 12,
      "ammo": null,
      "kind": "plasma",
      "availableFrom": "store_conversion",
      "unavailableAfter": "elevator_fall"
    },
    {
      "id": "mine",
      "name": "Laser Mine",
      "range": 0,
      "damage": 115,
      "energy": 0,
      "ammo": 7,
      "kind": "mine",
      "availableFrom": "homeworld_signal"
    },
    {
      "id": "gauntlet",
      "name": "Power Punch Glove",
      "range": 72,
      "damage": 50,
      "energy": 7,
      "ammo": null,
      "kind": "melee",
      "availableFrom": "homeworld_signal"
    }
  ],
  "artVersion": "gameplay-production-v07",
  "previousSaveKeys": [
    "tantalus.avpr.wolf.v06",
    "tantalus.avpr.wolf.v05",
    "tantalus.avpr.wolf.v04",
    "tantalus.avpr.wolf.v03"
  ],
  "hunterProtocol": {
    "chainWindow": 6.5,
    "maxChainBonus": 0.75,
    "chainStep": 0.06,
    "bossTelegraphSeconds": 0.62,
    "bossSpecialCooldown": 3.2,
    "alertMemorySeconds": 4.2
  },
  "difficulties": {
    "canon": {
      "label": "FILM CANON",
      "enemyHealth": 1,
      "enemyDamage": 1,
      "enemySpeed": 1,
      "score": 1
    },
    "veteran": {
      "label": "VÉTÉRAN",
      "enemyHealth": 1.18,
      "enemyDamage": 1.15,
      "enemySpeed": 1.08,
      "score": 1.2
    },
    "nightmare": {
      "label": "CHASSE NOIRE",
      "enemyHealth": 1.38,
      "enemyDamage": 1.32,
      "enemySpeed": 1.16,
      "score": 1.5
    }
  }
};
