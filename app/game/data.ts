import type {
  ArmorDefinition,
  ArmorId,
  CodexEntryId,
  DifficultyDefinition,
  DifficultyId,
  GearDefinition,
  GearId,
  MissionDefinition,
  MissionId,
  WeaponDefinition,
  WeaponId,
} from "./types";

// ---------------------------------------------------------------------------
// Armory
// ---------------------------------------------------------------------------

export const WEAPONS: readonly WeaponDefinition[] = [
  {
    id: "wristblades",
    name: "Lames de poignet",
    shortName: "Wristblades",
    description:
      "Lames rétractables intégrées. Le choix le plus direct et le plus honorable pour conclure une chasse.",
    attackType: "melee",
    role: "Combo rapide et parade rapprochée",
    weight: 0,
    honorPower: 1,
    damage: 22,
    heavyDamage: 50,
    cooldownMs: 260,
    rangePx: 74,
    projectileSpeedPx: 0,
    staminaCost: 8,
    energyCost: 0,
    ammo: null,
    color: "#d7f7eb",
    unlock: { minimumHonor: 0, requiredMissionId: null },
    upgradeCosts: [200, 450],
  },
  {
    id: "combistick",
    name: "Combistick",
    shortName: "Combistick",
    description:
      "Lance télescopique efficace en mêlée ou au lancer. Une arme rituelle précise qui doit être récupérée.",
    attackType: "hybrid",
    role: "Portée moyenne, contrôle et lancer puissant",
    weight: 2,
    honorPower: 1,
    damage: 30,
    heavyDamage: 68,
    cooldownMs: 430,
    rangePx: 550,
    projectileSpeedPx: 760,
    staminaCost: 12,
    energyCost: 0,
    ammo: 1,
    color: "#a8d3c5",
    unlock: { minimumHonor: 0, requiredMissionId: null },
    upgradeCosts: [200, 450],
  },
  {
    id: "plasma-caster",
    name: "Plasmacaster",
    shortName: "Plasma",
    description:
      "Canon d'épaule lié au biomask. Dévastateur, mais gourmand en énergie et peu honorable contre une proie faible.",
    attackType: "ranged",
    role: "Dégâts énergétiques et tir chargé",
    weight: 3,
    honorPower: 3,
    damage: 34,
    heavyDamage: 95,
    cooldownMs: 650,
    rangePx: 820,
    projectileSpeedPx: 900,
    staminaCost: 0,
    energyCost: 22,
    ammo: null,
    color: "#ff4f4f",
    unlock: { minimumHonor: 0, requiredMissionId: null },
    upgradeCosts: [200, 450],
  },
  {
    id: "yautja-bow",
    name: "Arc Yautja",
    shortName: "Arc",
    description:
      "Arc compact et silencieux. Les flèches peuvent être récupérées et gagnent en puissance avec la charge.",
    attackType: "ranged",
    role: "Précision silencieuse et dégâts de charge",
    weight: 2,
    honorPower: 2,
    damage: 20,
    heavyDamage: 65,
    cooldownMs: 520,
    rangePx: 920,
    projectileSpeedPx: 980,
    staminaCost: 4,
    energyCost: 0,
    ammo: 8,
    color: "#d4b76e",
    unlock: { minimumHonor: 300, requiredMissionId: "jungle-vey" },
    upgradeCosts: [200, 450],
  },
  {
    id: "smart-disc",
    name: "Smart Disc",
    shortName: "Disque",
    description:
      "Disque guidé pouvant traverser plusieurs cibles avant de revenir au chasseur.",
    attackType: "hybrid",
    role: "Ricochet, pénétration et retour automatique",
    weight: 2,
    honorPower: 2,
    damage: 70,
    heavyDamage: 45,
    cooldownMs: 7_000,
    rangePx: 760,
    projectileSpeedPx: 820,
    staminaCost: 0,
    energyCost: 20,
    ammo: 1,
    color: "#bde9ff",
    unlock: { minimumHonor: 800, requiredMissionId: "ice-cryostalker" },
    upgradeCosts: [200, 450],
  },
];

export const GEAR: readonly GearDefinition[] = [
  {
    id: "motion-sensor",
    name: "Capteur de mouvement",
    description:
      "Révèle brièvement les déplacements dans une large zone, même derrière les plateformes.",
    role: "Reconnaissance",
    weight: 1,
    charges: 3,
    durationSeconds: 12,
    rangePx: 500,
    color: "#61f2d2",
    unlock: { minimumHonor: 0, requiredMissionId: null },
    upgradeCosts: [150, 350],
  },
  {
    id: "audio-decoy",
    name: "Leurre audio",
    description:
      "Reproduit des vocalises et des signatures d'armes pour détourner une patrouille.",
    role: "Distraction",
    weight: 1,
    charges: 3,
    durationSeconds: 8,
    rangePx: 460,
    color: "#dccb65",
    unlock: { minimumHonor: 0, requiredMissionId: null },
    upgradeCosts: [150, 350],
  },
  {
    id: "netgun",
    name: "Netgun",
    description:
      "Immobilise une proie et crée une ouverture pour une mise à mort rapprochée.",
    role: "Contrôle d'une cible",
    weight: 1,
    charges: 4,
    durationSeconds: 4,
    rangePx: 430,
    color: "#d7e8df",
    unlock: { minimumHonor: 300, requiredMissionId: "jungle-vey" },
    upgradeCosts: [150, 350],
  },
  {
    id: "snare",
    name: "Piège de chasse",
    description:
      "Piège compact qui retient une proie ou ralentit fortement un adversaire Apex.",
    role: "Embuscade",
    weight: 1,
    charges: 2,
    durationSeconds: 5,
    rangePx: 86,
    color: "#f09d4f",
    unlock: { minimumHonor: 800, requiredMissionId: "ice-cryostalker" },
    upgradeCosts: [150, 350],
  },
];

export const ARMORS: readonly ArmorDefinition[] = [
  {
    id: "hunter",
    name: "Armure Hunter",
    description:
      "Équilibre traditionnel entre résistance, mobilité, énergie et capacité d'emport.",
    maxHealth: 160,
    maxStamina: 100,
    maxEnergy: 100,
    moveSpeedMultiplier: 1,
    energyRegenMultiplier: 1,
    meleeDamageMultiplier: 1,
    carryingCapacity: 8,
    medicompCharges: 2,
    color: "#8b6f4f",
    unlock: { minimumHonor: 0, requiredMissionId: null },
    upgradeCosts: [250, 550],
  },
  {
    id: "scout",
    name: "Armure Scout",
    description:
      "Armure légère pour les longues approches camouflées et les attaques depuis la hauteur.",
    maxHealth: 125,
    maxStamina: 115,
    maxEnergy: 110,
    moveSpeedMultiplier: 1.15,
    energyRegenMultiplier: 1.2,
    meleeDamageMultiplier: 0.95,
    carryingCapacity: 6,
    medicompCharges: 2,
    color: "#617c63",
    unlock: { minimumHonor: 300, requiredMissionId: "jungle-vey" },
    upgradeCosts: [250, 550],
  },
  {
    id: "berserker",
    name: "Armure Berserker",
    description:
      "Plaques lourdes et puissance de mêlée accrue, au prix de la vitesse et de la recharge énergétique.",
    maxHealth: 220,
    maxStamina: 90,
    maxEnergy: 90,
    moveSpeedMultiplier: 0.86,
    energyRegenMultiplier: 0.85,
    meleeDamageMultiplier: 1.15,
    carryingCapacity: 10,
    medicompCharges: 2,
    color: "#7e4640",
    unlock: { minimumHonor: 800, requiredMissionId: "ice-cryostalker" },
    upgradeCosts: [250, 550],
  },
];

export const DIFFICULTIES: readonly DifficultyDefinition[] = [
  {
    id: "young-blood",
    name: "Young Blood",
    description:
      "Indices de traque généreux et deux checkpoints pour apprendre les outils du chasseur.",
    enemyHealthMultiplier: 0.9,
    enemyDamageMultiplier: 0.75,
    detectionMultiplier: 0.85,
    rewardMultiplier: 1,
    checkpointCount: 2,
    medicompModifier: 1,
    unlockedByDefault: true,
  },
  {
    id: "hunter",
    name: "Hunter",
    description:
      "L'expérience équilibrée : une proie dangereuse, un checkpoint avant l'Apex.",
    enemyHealthMultiplier: 1,
    enemyDamageMultiplier: 1,
    detectionMultiplier: 1,
    rewardMultiplier: 1.15,
    checkpointCount: 1,
    medicompModifier: 1,
    unlockedByDefault: true,
  },
  {
    id: "elite",
    name: "Elite",
    description:
      "Les proies réagissent plus vite, encaissent davantage et ne laissent aucun checkpoint.",
    enemyHealthMultiplier: 1.15,
    enemyDamageMultiplier: 1.25,
    detectionMultiplier: 1.25,
    rewardMultiplier: 1.35,
    checkpointCount: 0,
    medicompModifier: 1,
    unlockedByDefault: true,
  },
  {
    id: "elder",
    name: "Elder",
    description:
      "Rite d'après-campagne : ennemis renforcés, un seul Medicomp et aucune reprise.",
    enemyHealthMultiplier: 1.25,
    enemyDamageMultiplier: 1.5,
    detectionMultiplier: 1.35,
    rewardMultiplier: 1.6,
    checkpointCount: 0,
    medicompModifier: -1,
    unlockedByDefault: false,
  },
];

// ---------------------------------------------------------------------------
// Campaign hunts
// ---------------------------------------------------------------------------

type ExpansionMissionSpec = {
  id: MissionId;
  order: number;
  title: string;
  subtitle: string;
  planetName: string;
  biome: MissionDefinition["biome"];
  targetName: string;
  briefing: string;
  threatLevel: MissionDefinition["threatLevel"];
  prerequisiteMissionId: MissionId;
  recommendedArmorId: ArmorId;
  recommendedWeaponIds: WeaponId[];
  parTimeSeconds: number;
  rewards: MissionDefinition["baseRewards"];
  palette: MissionDefinition["palette"];
  traceLabel: string;
  traceDescription: string;
  huntLabel: string;
  huntDescription: string;
  recoverLabel: string;
  recoverDescription: string;
  bossTitle: string;
  bossHealth: number;
  bossSpeed: number;
  bossColor: string;
  bossAttacks: MissionDefinition["boss"]["attacks"];
  phaseLabels: readonly [string, string, string];
  phaseBehaviors: readonly [string, string, string];
  phaseHazards: readonly [string, string, string];
  trophyName: string;
  trophyDescription: string;
  trophyPartId: MissionDefinition["trophy"]["partId"];
  trophyIcon: string;
  codexUnlockIds: CodexEntryId[];
  waveArchetypes: readonly [
    MissionDefinition["enemyWaves"][number]["archetype"],
    MissionDefinition["enemyWaves"][number]["archetype"],
    MissionDefinition["enemyWaves"][number]["archetype"],
  ];
};

/**
 * Expansion planets share the proven objective/runtime contract while keeping
 * their ecology, encounter copy, boss data and rewards authored per world.
 * The archetypes are AI behaviour classes; the V8 ecology registry supplies
 * the endemic visual identity selected for each spawn slot.
 */
function expansionMission(spec: ExpansionMissionSpec): MissionDefinition {
  const scanId = `${spec.id}-scan`;
  const huntId = `${spec.id}-hunt`;
  const recoverId = `${spec.id}-recover`;
  const bossId = `${spec.id}-boss`;
  const extractId = `${spec.id}-extract`;
  return {
    id: spec.id,
    order: spec.order,
    title: spec.title,
    subtitle: spec.subtitle,
    planetName: spec.planetName,
    biome: spec.biome,
    targetName: spec.targetName,
    targetKind: "beast",
    briefing: spec.briefing,
    threatLevel: spec.threatLevel,
    prerequisiteMissionId: spec.prerequisiteMissionId,
    recommendedArmorId: spec.recommendedArmorId,
    recommendedWeaponIds: spec.recommendedWeaponIds,
    parTimeSeconds: spec.parTimeSeconds,
    baseRewards: spec.rewards,
    palette: spec.palette,
    objectives: [
      {
        id: scanId,
        label: spec.traceLabel,
        description: spec.traceDescription,
        kind: "scan",
        required: true,
        targetCount: 3,
        honorBonus: 20,
      },
      {
        id: huntId,
        label: spec.huntLabel,
        description: spec.huntDescription,
        kind: "hunt",
        required: true,
        targetCount: 6,
        honorBonus: 25,
      },
      {
        id: recoverId,
        label: spec.recoverLabel,
        description: spec.recoverDescription,
        kind: "recover",
        required: true,
        targetCount: 2,
        honorBonus: 25,
      },
      {
        id: bossId,
        label: `Affronter ${spec.targetName}`,
        description: `Isole la proie dominante et conclus la chasse contre ${spec.targetName}.`,
        kind: "boss",
        required: true,
        targetCount: 1,
        honorBonus: 55,
      },
      {
        id: extractId,
        label: "Rejoindre le faisceau d'extraction",
        description:
          "Préserve le trophée, sécurise les prélèvements et rappelle le vaisseau au-dessus de la balise.",
        kind: "extract",
        required: true,
        targetCount: 1,
        honorBonus: 15,
      },
    ],
    honorRules: [
      {
        id: `${spec.id}-study`,
        label: "Cartographier avant de frapper",
        description:
          "Termine les relevés du biome avant d'engager sa proie dominante.",
        kind: "scan-target",
        bonus: 20,
        violationPenalty: 0,
      },
      {
        id: `${spec.id}-restraint`,
        label: "Force mesurée",
        description:
          "N'emploie pas de tir plasma chargé contre la petite faune endémique.",
        kind: "weapon-restraint",
        bonus: 20,
        violationPenalty: 15,
      },
      {
        id: `${spec.id}-survive`,
        label: "Chasseur inébranlable",
        description: "Termine la chasse sans déclencher le Second Wind.",
        kind: "no-second-wind",
        bonus: 20,
        violationPenalty: 0,
      },
    ],
    enemyWaves: [
      {
        id: `${spec.id}-foragers`,
        trigger: "start",
        triggerId: null,
        archetype: spec.waveArchetypes[0],
        count: 5,
        health: 78 + spec.order * 4,
        damage: 10 + spec.order,
        moveSpeed: 168,
        threatLevel: 1,
        spawnDelaySeconds: 0.7,
      },
      {
        id: `${spec.id}-territorials`,
        trigger: "objective",
        triggerId: scanId,
        archetype: spec.waveArchetypes[1],
        count: 4,
        health: 112 + spec.order * 6,
        damage: 14 + spec.order,
        moveSpeed: 145,
        threatLevel: 2,
        spawnDelaySeconds: 1,
      },
      {
        id: `${spec.id}-guardians`,
        trigger: "objective",
        triggerId: recoverId,
        archetype: spec.waveArchetypes[2],
        count: 3,
        health: 165 + spec.order * 8,
        damage: 19 + spec.order,
        moveSpeed: 122,
        threatLevel: 3,
        spawnDelaySeconds: 1.25,
      },
    ],
    boss: {
      name: spec.targetName,
      title: spec.bossTitle,
      maxHealth: spec.bossHealth,
      moveSpeed: spec.bossSpeed,
      threatLevel: 4,
      color: spec.bossColor,
      silhouette: "beast",
      trophyWindowSeconds: 16,
      attacks: spec.bossAttacks,
      phases: [0, 1, 2].map((index) => ({
        id: `${spec.id}-phase-${index + 1}`,
        label: spec.phaseLabels[index],
        startsAtHealthRatio: [1, 0.6, 0.25][index],
        behavior: spec.phaseBehaviors[index],
        hazard: spec.phaseHazards[index],
        speedMultiplier: [1, 1.12, 1.24][index],
        damageMultiplier: [1, 1.1, 1.22][index],
      })),
    },
    trophy: {
      id: `trophy-${spec.id}`,
      name: spec.trophyName,
      description: spec.trophyDescription,
      targetName: spec.targetName,
      partId: spec.trophyPartId,
      icon: spec.trophyIcon,
    },
    codexUnlockIds: spec.codexUnlockIds,
  };
}

export const MISSIONS: readonly MissionDefinition[] = [
  {
    id: "jungle-vey",
    order: 1,
    title: "Sang dans la canopée",
    subtitle: "La commandante qui a appris à voir l'invisible",
    planetName: "Oseris-IV",
    biome: "jungle",
    targetName: "Commandante Vey",
    targetKind: "human",
    briefing:
      "Une unité armée a récupéré un transpondeur Yautja et l'utilise pour tendre des embuscades. Étudie ses éclaireurs, reprends la technologie du clan et affronte leur commandante, une guerrière qui a survécu à deux chasses.",
    threatLevel: 3,
    prerequisiteMissionId: null,
    recommendedArmorId: "hunter",
    recommendedWeaponIds: ["combistick", "plasma-caster"],
    parTimeSeconds: 600,
    baseRewards: { honor: 100, clanMarks: 180 },
    palette: {
      sky: "#071a18",
      haze: "#174b3a",
      ground: "#10251d",
      platform: "#315139",
      accent: "#6bff9c",
      danger: "#ff5a47",
    },
    objectives: [
      {
        id: "scan-vanguard",
        label: "Étudier l'avant-garde",
        description:
          "Scanne trois soldats pour identifier les contre-mesures thermiques de Vey.",
        kind: "scan",
        required: true,
        targetCount: 3,
        honorBonus: 15,
      },
      {
        id: "recover-transponder",
        label: "Reprendre le transpondeur",
        description:
          "Récupère intacte la technologie Yautja dans le camp avancé.",
        kind: "recover",
        required: true,
        targetCount: 1,
        honorBonus: 25,
      },
      {
        id: "defeat-vey",
        label: "Affronter la commandante Vey",
        description:
          "Force Vey à épuiser ses fusées et réclame une victoire digne.",
        kind: "boss",
        required: true,
        targetCount: 1,
        honorBonus: 40,
      },
      {
        id: "extract-jungle-trophy",
        label: "Quitter la zone de chasse",
        description:
          "Rejoins le point d'extraction avec le trophée et le transpondeur.",
        kind: "extract",
        required: true,
        targetCount: 1,
        honorBonus: 10,
      },
    ],
    honorRules: [
      {
        id: "study-vey",
        label: "Connaître sa proie",
        description: "Scanne Vey avant de lui porter le premier coup.",
        kind: "scan-target",
        bonus: 15,
        violationPenalty: 0,
      },
      {
        id: "protect-tech",
        label: "Ne laisser aucune technologie",
        description: "Le transpondeur doit revenir au clan.",
        kind: "recover-technology",
        bonus: 20,
        violationPenalty: 25,
      },
      {
        id: "restrained-caster",
        label: "Puissance mesurée",
        description:
          "N'utilise pas de tir plasma chargé contre les soldats ordinaires.",
        kind: "weapon-restraint",
        bonus: 15,
        violationPenalty: 10,
      },
    ],
    enemyWaves: [
      {
        id: "jungle-patrol",
        trigger: "start",
        triggerId: null,
        archetype: "rifle-soldier",
        count: 4,
        health: 55,
        damage: 8,
        moveSpeed: 125,
        threatLevel: 1,
        spawnDelaySeconds: 0,
      },
      {
        id: "jungle-scouts",
        trigger: "objective",
        triggerId: "scan-vanguard",
        archetype: "scout",
        count: 3,
        health: 45,
        damage: 7,
        moveSpeed: 175,
        threatLevel: 1,
        spawnDelaySeconds: 1,
      },
      {
        id: "vey-guard",
        trigger: "objective",
        triggerId: "recover-transponder",
        archetype: "heavy",
        count: 2,
        health: 150,
        damage: 14,
        moveSpeed: 90,
        threatLevel: 3,
        spawnDelaySeconds: 1.5,
      },
    ],
    boss: {
      name: "Commandante Vey",
      title: "La proie qui voit l'invisible",
      maxHealth: 600,
      moveSpeed: 145,
      threatLevel: 4,
      color: "#df6c4f",
      silhouette: "human",
      trophyWindowSeconds: 12,
      attacks: [
        {
          id: "vey-rifle-burst",
          label: "Rafale disciplinée",
          damage: 10,
          cooldownSeconds: 2.2,
          rangePx: 640,
          telegraphMs: 520,
          behavior: "burst",
        },
        {
          id: "vey-flare",
          label: "Fusée révélatrice",
          damage: 5,
          cooldownSeconds: 7,
          rangePx: 390,
          telegraphMs: 900,
          behavior: "area",
        },
        {
          id: "vey-knife",
          label: "Contre rapproché",
          damage: 22,
          cooldownSeconds: 1.6,
          rangePx: 82,
          telegraphMs: 280,
          behavior: "melee",
        },
      ],
      phases: [
        {
          id: "vey-hunt",
          label: "Contre-chasse",
          startsAtHealthRatio: 1,
          behavior:
            "Vey alterne couverture et rafales, puis se couvre de boue lorsqu'elle perd la ligne de vue.",
          hazard: "Les fusées révèlent le camouflage dans leur halo.",
          speedMultiplier: 1,
          damageMultiplier: 1,
        },
        {
          id: "vey-reinforcements",
          label: "Dernier carré",
          startsAtHealthRatio: 0.65,
          behavior:
            "Vey appelle deux gardes et avance derrière des tirs de suppression.",
          hazard: "Les plateformes basses sont balayées par les rafales.",
          speedMultiplier: 1.08,
          damageMultiplier: 1.1,
        },
        {
          id: "vey-duel",
          label: "Guerrière acculée",
          startsAtHealthRatio: 0.3,
          behavior:
            "À court de munitions, Vey accepte le combat rapproché et expose ses défenses après chaque charge.",
          hazard: "Rompre le duel avec un tir lourd réduit l'honneur.",
          speedMultiplier: 1.18,
          damageMultiplier: 1.2,
        },
      ],
    },
    trophy: {
      id: "trophy-vey",
      name: "Insigne de Vey",
      description:
        "La marque d'une humaine ayant transformé une embuscade en véritable chasse.",
      targetName: "Commandante Vey",
      partId: "insignia",
      icon: "insignia",
    },
    codexUnlockIds: [
      "yautja-honor",
      "biomask",
      "cloaking-device",
      "osiris-jungle",
      "commandante-vey",
    ],
  },
  {
    id: "ice-cryostalker",
    order: 2,
    title: "Chaleur sous la glace",
    subtitle: "Le Cryostalker ne laisse aucune trace chaude",
    planetName: "Nivalis-K",
    biome: "ice",
    targetName: "Cryostalker Alpha",
    targetKind: "beast",
    briefing:
      "Une colonie d'extraction a réveillé une forme de vie Apex sous la banquise. Sa température imite la glace. Analyse ses traces bioélectriques, élimine sa meute et attire l'Alpha hors de ses tunnels.",
    threatLevel: 4,
    prerequisiteMissionId: "jungle-vey",
    recommendedArmorId: "scout",
    recommendedWeaponIds: ["yautja-bow", "combistick"],
    parTimeSeconds: 720,
    baseRewards: { honor: 140, clanMarks: 230 },
    palette: {
      sky: "#071729",
      haze: "#2d6180",
      ground: "#102839",
      platform: "#7898aa",
      accent: "#8cf5ff",
      danger: "#f55d77",
    },
    objectives: [
      {
        id: "scan-ice-traces",
        label: "Lire les traces bioélectriques",
        description:
          "Scanne trois empreintes froides pour calibrer le biomask.",
        kind: "scan",
        required: true,
        targetCount: 3,
        honorBonus: 20,
      },
      {
        id: "hunt-cryorunners",
        label: "Disperser la meute",
        description:
          "Élimine quatre Cryorunners avant qu'ils ne préviennent l'Alpha.",
        kind: "hunt",
        required: true,
        targetCount: 4,
        honorBonus: 20,
      },
      {
        id: "defeat-cryostalker",
        label: "Abattre l'Alpha",
        description:
          "Brise ses plaques en utilisant les piliers de glace, puis frappe les tissus exposés.",
        kind: "boss",
        required: true,
        targetCount: 1,
        honorBonus: 50,
      },
      {
        id: "extract-ice-trophy",
        label: "Extraire le trophée",
        description:
          "Rejoins la balise avant l'effondrement complet de la caverne.",
        kind: "extract",
        required: true,
        targetCount: 1,
        honorBonus: 10,
      },
    ],
    honorRules: [
      {
        id: "study-alpha",
        label: "Comprendre l'Apex",
        description: "Complète les trois scans avant d'attaquer l'Alpha.",
        kind: "scan-target",
        bonus: 20,
        violationPenalty: 0,
      },
      {
        id: "break-armor-cleanly",
        label: "Force contre instinct",
        description:
          "Brise au moins une plaque en attirant une charge contre un pilier.",
        kind: "weapon-restraint",
        bonus: 20,
        violationPenalty: 10,
      },
      {
        id: "no-second-wind-ice",
        label: "Chasseur inébranlable",
        description: "Termine sans déclencher le Second Wind.",
        kind: "no-second-wind",
        bonus: 15,
        violationPenalty: 0,
      },
    ],
    enemyWaves: [
      {
        id: "ice-runners",
        trigger: "start",
        triggerId: null,
        archetype: "cryostalker-runner",
        count: 4,
        health: 70,
        damage: 14,
        moveSpeed: 190,
        threatLevel: 2,
        spawnDelaySeconds: 0.8,
      },
      {
        id: "ice-salvagers",
        trigger: "objective",
        triggerId: "scan-ice-traces",
        archetype: "rifle-soldier",
        count: 3,
        health: 55,
        damage: 8,
        moveSpeed: 120,
        threatLevel: 1,
        spawnDelaySeconds: 1.2,
      },
      {
        id: "ice-brutes",
        trigger: "objective",
        triggerId: "hunt-cryorunners",
        archetype: "cryostalker-brute",
        count: 2,
        health: 180,
        damage: 22,
        moveSpeed: 118,
        threatLevel: 3,
        spawnDelaySeconds: 1,
      },
    ],
    boss: {
      name: "Cryostalker Alpha",
      title: "La faim sous la banquise",
      maxHealth: 720,
      moveSpeed: 175,
      threatLevel: 4,
      color: "#b9eafa",
      silhouette: "beast",
      trophyWindowSeconds: 14,
      attacks: [
        {
          id: "cryo-charge",
          label: "Charge blindée",
          damage: 30,
          cooldownSeconds: 4.8,
          rangePx: 610,
          telegraphMs: 950,
          behavior: "charge",
        },
        {
          id: "cryo-claws",
          label: "Balayage de griffes",
          damage: 24,
          cooldownSeconds: 1.8,
          rangePx: 110,
          telegraphMs: 360,
          behavior: "melee",
        },
        {
          id: "cryo-burrow",
          label: "Éruption sous-glaciaire",
          damage: 20,
          cooldownSeconds: 6.5,
          rangePx: 300,
          telegraphMs: 1_100,
          behavior: "area",
        },
      ],
      phases: [
        {
          id: "cryo-armored",
          label: "Carapace intacte",
          startsAtHealthRatio: 1,
          behavior:
            "L'Alpha charge en ligne droite. Les impacts contre les piliers fissurent son armure.",
          hazard: "Le sol signale tardivement les sorties de tunnel.",
          speedMultiplier: 1,
          damageMultiplier: 1,
        },
        {
          id: "cryo-pack",
          label: "Appel de la meute",
          startsAtHealthRatio: 0.55,
          behavior:
            "L'Alpha appelle des runners et alterne tunnel et attaques latérales.",
          hazard: "Deux Cryorunners rejoignent l'arène.",
          speedMultiplier: 1.12,
          damageMultiplier: 1.08,
        },
        {
          id: "cryo-exposed",
          label: "Prédateur blessé",
          startsAtHealthRatio: 0.22,
          behavior:
            "Sans carapace, l'Alpha devient plus rapide mais son dos bioélectrique reste exposé.",
          hazard: "Des stalactites tombent après chaque charge.",
          speedMultiplier: 1.25,
          damageMultiplier: 1.18,
        },
      ],
    },
    trophy: {
      id: "trophy-cryostalker",
      name: "Crâne de Cryostalker",
      description:
        "Carapace polaire d'un prédateur qui effaçait jusqu'à sa propre chaleur.",
      targetName: "Cryostalker Alpha",
      partId: "skull-and-spine",
      icon: "beast-skull",
    },
    codexUnlockIds: ["nivalis-ice", "cryostalker"],
  },
  {
    id: "volcano-bad-blood",
    order: 3,
    title: "Le dernier rite",
    subtitle: "Aucune chasse ne justifie la profanation du clan",
    planetName: "Cinder-12",
    biome: "volcano",
    targetName: "Le Bad Blood",
    targetKind: "yautja",
    briefing:
      "Trois chasseurs ont disparu autour d'un ancien sanctuaire. Un Paria utilise leurs trophées et leur technologie pour attirer de nouvelles victimes. Retrouve les marques des morts, détruis ses balises et impose le jugement du clan.",
    threatLevel: 4,
    prerequisiteMissionId: "ice-cryostalker",
    recommendedArmorId: "berserker",
    recommendedWeaponIds: ["smart-disc", "combistick"],
    parTimeSeconds: 840,
    baseRewards: { honor: 200, clanMarks: 320 },
    palette: {
      sky: "#17090c",
      haze: "#5d1f22",
      ground: "#1d1315",
      platform: "#493234",
      accent: "#ffb64b",
      danger: "#ff3c28",
    },
    objectives: [
      {
        id: "scan-fallen-hunters",
        label: "Honorer les chasseurs tombés",
        description:
          "Scanne les trois marques de clan avant de poursuivre le Paria.",
        kind: "scan",
        required: true,
        targetCount: 3,
        honorBonus: 30,
      },
      {
        id: "recover-stolen-beacons",
        label: "Détruire le piège",
        description:
          "Désactive trois balises volées sans les abandonner dans le sanctuaire.",
        kind: "recover",
        required: true,
        targetCount: 3,
        honorBonus: 30,
      },
      {
        id: "defeat-bad-blood",
        label: "Juger le Bad Blood",
        description:
          "Survis à ses armes de chasse, puis accepte son duel final.",
        kind: "boss",
        required: true,
        targetCount: 1,
        honorBonus: 60,
      },
      {
        id: "escape-self-destruct",
        label: "Empêcher l'effacement",
        description:
          "Interromps l'autodestruction en 45 secondes ou quitte la zone sans le trophée parfait.",
        kind: "extract",
        required: true,
        targetCount: 1,
        honorBonus: 25,
      },
    ],
    honorRules: [
      {
        id: "honor-fallen",
        label: "Mémoire du clan",
        description: "Trouve les trois marques des chasseurs assassinés.",
        kind: "recover-technology",
        bonus: 25,
        violationPenalty: 20,
      },
      {
        id: "accept-final-duel",
        label: "Le dernier rite",
        description:
          "Durant la phase de duel, utilise uniquement les Wristblades ou le Combistick.",
        kind: "accept-duel",
        bonus: 35,
        violationPenalty: 30,
      },
      {
        id: "stop-purge",
        label: "Ne laisser aucune trace",
        description:
          "Interromps l'autodestruction et récupère la technologie profanée.",
        kind: "recover-technology",
        bonus: 30,
        violationPenalty: 25,
      },
    ],
    enemyWaves: [
      {
        id: "volcano-hounds",
        trigger: "start",
        triggerId: null,
        archetype: "razor-hound",
        count: 5,
        health: 65,
        damage: 13,
        moveSpeed: 205,
        threatLevel: 1,
        spawnDelaySeconds: 0.6,
      },
      {
        id: "volcano-initiates",
        trigger: "objective",
        triggerId: "scan-fallen-hunters",
        archetype: "bad-blood-initiate",
        count: 3,
        health: 130,
        damage: 18,
        moveSpeed: 150,
        threatLevel: 3,
        spawnDelaySeconds: 1.5,
      },
      {
        id: "volcano-ambush",
        trigger: "objective",
        triggerId: "recover-stolen-beacons",
        archetype: "razor-hound",
        count: 4,
        health: 65,
        damage: 13,
        moveSpeed: 215,
        threatLevel: 1,
        spawnDelaySeconds: 0.5,
      },
    ],
    boss: {
      name: "Le Bad Blood",
      title: "Paria aux trophées volés",
      maxHealth: 850,
      moveSpeed: 178,
      threatLevel: 4,
      color: "#a83c2e",
      silhouette: "yautja",
      trophyWindowSeconds: 45,
      attacks: [
        {
          id: "pariah-disc",
          label: "Smart Disc volé",
          damage: 34,
          cooldownSeconds: 5.2,
          rangePx: 700,
          telegraphMs: 650,
          behavior: "disc",
        },
        {
          id: "pariah-plasma",
          label: "Tir plasma",
          damage: 38,
          cooldownSeconds: 4.2,
          rangePx: 760,
          telegraphMs: 900,
          behavior: "plasma",
        },
        {
          id: "pariah-combistick",
          label: "Combistick du Paria",
          damage: 28,
          cooldownSeconds: 1.45,
          rangePx: 122,
          telegraphMs: 310,
          behavior: "melee",
        },
        {
          id: "pariah-purge",
          label: "Surcharge du sanctuaire",
          damage: 45,
          cooldownSeconds: 8,
          rangePx: 340,
          telegraphMs: 1_200,
          behavior: "area",
        },
      ],
      phases: [
        {
          id: "pariah-stalk",
          label: "Chasseur de chasseurs",
          startsAtHealthRatio: 1,
          behavior:
            "Le Paria alterne camouflage, Smart Disc et tirs plasma depuis les hauteurs.",
          hazard: "La chaleur volcanique sature la vision thermique.",
          speedMultiplier: 1,
          damageMultiplier: 1,
        },
        {
          id: "pariah-duel",
          label: "Duel du sanctuaire",
          startsAtHealthRatio: 0.58,
          behavior:
            "Une impulsion coupe les armes énergétiques. Le Paria engage au Combistick et aux Wristblades.",
          hazard: "Employer une arme à distance disponible rompt le rite.",
          speedMultiplier: 1.16,
          damageMultiplier: 1.12,
        },
        {
          id: "pariah-self-destruct",
          label: "Effacement",
          startsAtHealthRatio: 0.18,
          behavior:
            "Le Paria lance une purge de 45 secondes. Trois consoles doivent être interrompues entre ses charges.",
          hazard:
            "L'explosion détruit le trophée et la technologie si le compte à rebours expire.",
          speedMultiplier: 1.25,
          damageMultiplier: 1.25,
        },
      ],
    },
    trophy: {
      id: "trophy-bad-blood",
      name: "Masque du Paria",
      description:
        "Un biomask récupéré après le jugement d'un chasseur ayant trahi le code.",
      targetName: "Le Bad Blood",
      partId: "mask",
      icon: "broken-mask",
    },
    codexUnlockIds: ["cinder-volcano", "bad-blood"],
  },
  expansionMission({
    id: "swamp-hydra",
    order: 4,
    title: "Les gueules du delta",
    subtitle: "Dans la mangrove, chaque remous peut mordre",
    planetName: "Naraka-Delta",
    biome: "swamp",
    targetName: "Hydre de vase",
    briefing:
      "Un delta planétaire à marée noire abrite une chaîne alimentaire bâtie autour d'une hydre amphibie. Relève les pistes communes aux berges, identifie ses nourriceries et force la matriarche à quitter les chenaux profonds.",
    threatLevel: 4,
    prerequisiteMissionId: "volcano-bad-blood",
    recommendedArmorId: "hunter",
    recommendedWeaponIds: ["combistick", "yautja-bow"],
    parTimeSeconds: 900,
    rewards: { honor: 220, clanMarks: 350 },
    palette: {
      sky: "#071815",
      haze: "#315a49",
      ground: "#13231d",
      platform: "#4a5741",
      accent: "#9cff69",
      danger: "#dc6b3d",
    },
    traceLabel: "Lire les remous de chasse",
    traceDescription:
      "Scanne les traînées de mucus laissées entre trois bras du delta.",
    huntLabel: "Briser la meute amphibie",
    huntDescription:
      "Élimine les chasseurs de rive qui rabattent les proies vers la fosse.",
    recoverLabel: "Prélever les œufs sentinelles",
    recoverDescription:
      "Récupère deux capsules viables sans contaminer l'écosystème du clan.",
    bossTitle: "La matriarche des eaux noires",
    bossHealth: 940,
    bossSpeed: 158,
    bossColor: "#738f45",
    bossAttacks: [
      { id: "hydra-lunge", label: "Jaillissement du chenal", damage: 32, cooldownSeconds: 4.2, rangePx: 520, telegraphMs: 780, behavior: "charge" },
      { id: "hydra-tail", label: "Balayage caudal", damage: 26, cooldownSeconds: 1.8, rangePx: 145, telegraphMs: 360, behavior: "melee" },
      { id: "hydra-spit", label: "Jet de vase acide", damage: 24, cooldownSeconds: 5.4, rangePx: 650, telegraphMs: 900, behavior: "projectile" },
    ],
    phaseLabels: ["Sous la surface", "Trois gueules", "Furie des marées"],
    phaseBehaviors: [
      "La matriarche alterne embuscades aquatiques et charges courtes.",
      "Ses têtes latérales verrouillent les routes hautes pendant que le corps avance.",
      "Blessée, elle poursuit sans regagner les chenaux profonds.",
    ],
    phaseHazards: [
      "Les remous révèlent tardivement sa trajectoire.",
      "La marée monte et réduit les appuis au sol.",
      "Chaque charge projette une vague qui perturbe le camouflage.",
    ],
    trophyName: "Crâne trifide de l'Hydre",
    trophyDescription:
      "La couronne osseuse d'une matriarche ayant dominé tout un delta.",
    trophyPartId: "skull-and-spine",
    trophyIcon: "hydra-skull",
    codexUnlockIds: ["naraka-swamp", "mire-hydra"],
    waveArchetypes: ["cryostalker-runner", "razor-hound", "cryostalker-brute"],
  }),
  expansionMission({
    id: "desert-sandmaw",
    order: 5,
    title: "Le chant sous les dunes",
    subtitle: "Le désert écoute chaque pas",
    planetName: "Serekh-9",
    biome: "desert",
    targetName: "Matriarche Sandmaw",
    briefing:
      "Les caravanes minières de Serekh-9 disparaissent au bord d'un canyon vitrifié. Une prédatrice fouisseuse chasse par vibrations et commande plusieurs castes endémiques sous la mer de silice.",
    threatLevel: 4,
    prerequisiteMissionId: "swamp-hydra",
    recommendedArmorId: "scout",
    recommendedWeaponIds: ["yautja-bow", "smart-disc"],
    parTimeSeconds: 930,
    rewards: { honor: 240, clanMarks: 380 },
    palette: {
      sky: "#29160d",
      haze: "#a35831",
      ground: "#36251b",
      platform: "#7c573b",
      accent: "#ffd16a",
      danger: "#ff6542",
    },
    traceLabel: "Calibrer le masque sismique",
    traceDescription:
      "Analyse trois cratères d'écoute avant de traverser la mer de dunes.",
    huntLabel: "Écarter les rôdeurs de silice",
    huntDescription:
      "Traque les castes rapides sans attirer prématurément la Matriarche.",
    recoverLabel: "Récupérer les balises englouties",
    recoverDescription:
      "Dégage deux balises minières contenant les cycles vibratoires de la meute.",
    bossTitle: "La mâchoire sous le verre",
    bossHealth: 1_000,
    bossSpeed: 172,
    bossColor: "#c6864c",
    bossAttacks: [
      { id: "sandmaw-breach", label: "Percée de silice", damage: 34, cooldownSeconds: 4.6, rangePx: 580, telegraphMs: 980, behavior: "charge" },
      { id: "sandmaw-mandibles", label: "Cisaille mandibulaire", damage: 29, cooldownSeconds: 1.65, rangePx: 125, telegraphMs: 320, behavior: "melee" },
      { id: "sandmaw-quake", label: "Onde de dune", damage: 22, cooldownSeconds: 6, rangePx: 360, telegraphMs: 1_100, behavior: "area" },
    ],
    phaseLabels: ["Écoute profonde", "Canyon vitrifié", "Tempête de silice"],
    phaseBehaviors: [
      "La Matriarche suit les vibrations et frappe depuis le sous-sol.",
      "Elle utilise les parois pour ricocher et couper les hauteurs.",
      "Ses attaques deviennent continues lorsque la tempête efface les traces.",
    ],
    phaseHazards: [
      "Courir sur le sable révèle immédiatement la position du chasseur.",
      "Les plaques de verre se brisent sous les impacts lourds.",
      "La silice suspendue réduit toutes les visions du biomask.",
    ],
    trophyName: "Mandibules de Sandmaw",
    trophyDescription:
      "Deux lames minérales polies par des décennies de chasse souterraine.",
    trophyPartId: "skull",
    trophyIcon: "sandmaw-skull",
    codexUnlockIds: ["serekh-desert", "sandmaw"],
    waveArchetypes: ["razor-hound", "cryostalker-runner", "cryostalker-brute"],
  }),
  expansionMission({
    id: "ocean-leviathan",
    order: 6,
    title: "Sous l'œil de la tempête",
    subtitle: "Un récif vertical au-dessus d'un abîme vivant",
    planetName: "Pelagos-M",
    biome: "ocean",
    targetName: "Léviathan abyssal",
    briefing:
      "Sur Pelagos-M, seules des arches récifales émergent d'un océan global. Le clan a marqué un Léviathan capable de bondir d'une fosse à l'autre et de commander la faune bioluminescente du récif.",
    threatLevel: 4,
    prerequisiteMissionId: "desert-sandmaw",
    recommendedArmorId: "scout",
    recommendedWeaponIds: ["combistick", "plasma-caster"],
    parTimeSeconds: 960,
    rewards: { honor: 260, clanMarks: 410 },
    palette: {
      sky: "#031d2b",
      haze: "#17627a",
      ground: "#103b43",
      platform: "#41777b",
      accent: "#4dffe1",
      danger: "#ff6f7f",
    },
    traceLabel: "Échantillonner les chants abyssaux",
    traceDescription:
      "Enregistre trois signatures sonar depuis les arches du récif.",
    huntLabel: "Disperser les gardiens du récif",
    huntDescription:
      "Neutralise les prédateurs bioluminescents qui protègent la fosse.",
    recoverLabel: "Reprendre les harpons de clan",
    recoverDescription:
      "Récupère deux harpons rituels abandonnés par une chasse précédente.",
    bossTitle: "Le roi de la fosse sans fond",
    bossHealth: 1_080,
    bossSpeed: 164,
    bossColor: "#3da6a4",
    bossAttacks: [
      { id: "leviathan-breach", label: "Bond de l'abîme", damage: 38, cooldownSeconds: 5, rangePx: 640, telegraphMs: 1_050, behavior: "charge" },
      { id: "leviathan-fin", label: "Faux dorsale", damage: 30, cooldownSeconds: 1.9, rangePx: 155, telegraphMs: 380, behavior: "melee" },
      { id: "leviathan-sonar", label: "Détonation sonar", damage: 25, cooldownSeconds: 6.4, rangePx: 420, telegraphMs: 1_150, behavior: "area" },
    ],
    phaseLabels: ["Prédateur submergé", "Récif brisé", "Appel de l'abîme"],
    phaseBehaviors: [
      "Le Léviathan disparaît entre les arches avant chaque bond.",
      "Il fracasse les plateformes basses et force la chasse verticale.",
      "Ses impulsions sonar accélèrent tandis que la tempête ferme l'arène.",
    ],
    phaseHazards: [
      "Les vagues rendent le camouflage instable sur les plateformes basses.",
      "Les fragments de corail coupent les passages submergés.",
      "La foudre frappe les structures métalliques après chaque impulsion.",
    ],
    trophyName: "Crête du Léviathan",
    trophyDescription:
      "Une vertèbre-couronne bioluminescente arrachée au maître d'un océan.",
    trophyPartId: "skull-and-spine",
    trophyIcon: "leviathan-spine",
    codexUnlockIds: ["pelagos-ocean", "abyss-leviathan"],
    waveArchetypes: ["cryostalker-runner", "razor-hound", "cryostalker-brute"],
  }),
  expansionMission({
    id: "fungal-hivemind",
    order: 7,
    title: "La forêt qui se souvient",
    subtitle: "Chaque spore transmet la peur au monde entier",
    planetName: "Mycora-V",
    biome: "fungal",
    targetName: "Cœur-Mère mycélien",
    briefing:
      "Mycora-V est un organisme à l'échelle planétaire. Ses prédateurs partagent leurs perceptions par un réseau mycélien, et le Cœur-Mère réécrit leurs réponses à mesure que la chasse progresse.",
    threatLevel: 4,
    prerequisiteMissionId: "ocean-leviathan",
    recommendedArmorId: "hunter",
    recommendedWeaponIds: ["smart-disc", "plasma-caster"],
    parTimeSeconds: 990,
    rewards: { honor: 280, clanMarks: 450 },
    palette: {
      sky: "#130b22",
      haze: "#593b72",
      ground: "#24172e",
      platform: "#594463",
      accent: "#d98cff",
      danger: "#ff557f",
    },
    traceLabel: "Cartographier le réseau mycélien",
    traceDescription:
      "Scanne trois nœuds avant que la conscience planétaire ne masque leurs signaux.",
    huntLabel: "Rompre la mémoire de meute",
    huntDescription:
      "Élimine les relais mobiles qui partagent la position du chasseur.",
    recoverLabel: "Isoler les graines-mémoires",
    recoverDescription:
      "Scelle deux capsules de spores anciennes pour les archives du clan.",
    bossTitle: "La conscience sous les racines",
    bossHealth: 1_120,
    bossSpeed: 146,
    bossColor: "#a962c3",
    bossAttacks: [
      { id: "hivemind-tendril", label: "Fouet de mycélium", damage: 31, cooldownSeconds: 1.75, rangePx: 180, telegraphMs: 420, behavior: "melee" },
      { id: "hivemind-spores", label: "Nuage neurospore", damage: 24, cooldownSeconds: 5.6, rangePx: 390, telegraphMs: 1_000, behavior: "area" },
      { id: "hivemind-dart", label: "Épine symbiotique", damage: 27, cooldownSeconds: 3.8, rangePx: 670, telegraphMs: 720, behavior: "projectile" },
    ],
    phaseLabels: ["Éveil du réseau", "Mémoire adaptative", "Floraison terminale"],
    phaseBehaviors: [
      "Le Cœur-Mère teste les distances avec ses vrilles et ses épines.",
      "Le réseau anticipe les routes déjà utilisées par le chasseur.",
      "Toutes les capsules s'ouvrent et le Cœur abandonne sa protection.",
    ],
    phaseHazards: [
      "Les spores persistantes marquent les déplacements rapides.",
      "Répéter une route déclenche une floraison défensive.",
      "Le nuage terminal rend la vision thermique presque opaque.",
    ],
    trophyName: "Noyau du Cœur-Mère",
    trophyDescription:
      "Un nœud pétrifié contenant les souvenirs sensoriels d'une biosphère.",
    trophyPartId: "skull",
    trophyIcon: "mycelial-core",
    codexUnlockIds: ["mycora-fungal", "hivemind"],
    waveArchetypes: ["cryostalker-runner", "razor-hound", "cryostalker-brute"],
  }),
  expansionMission({
    id: "ruins-ancient-guardian",
    order: 8,
    title: "Les chasseurs de pierre",
    subtitle: "Une cité morte vient de reconnaître le clan",
    planetName: "Acheron-Sigma",
    biome: "ruins",
    targetName: "Gardien d'obsidienne",
    briefing:
      "Une lune sans atmosphère abrite une cité prédatrice antérieure aux archives du clan. Ses sentinelles se réveillent au passage d'une biomask et adaptent leurs armes à chaque technologie observée.",
    threatLevel: 4,
    prerequisiteMissionId: "fungal-hivemind",
    recommendedArmorId: "berserker",
    recommendedWeaponIds: ["combistick", "wristblades"],
    parTimeSeconds: 1_020,
    rewards: { honor: 320, clanMarks: 520 },
    palette: {
      sky: "#05070d",
      haze: "#253148",
      ground: "#131722",
      platform: "#3b4351",
      accent: "#63d8ff",
      danger: "#ff496c",
    },
    traceLabel: "Déchiffrer les marques de chasse",
    traceDescription:
      "Scanne trois stèles qui réagissent aux fréquences du biomask.",
    huntLabel: "Désassembler les sentinelles",
    huntDescription:
      "Neutralise les unités qui reproduisent les tactiques Yautja observées.",
    recoverLabel: "Extraire les prismes mémoriels",
    recoverDescription:
      "Retire deux prismes sans activer le protocole d'effacement de la cité.",
    bossTitle: "Le dernier protocole de la cité",
    bossHealth: 1_250,
    bossSpeed: 182,
    bossColor: "#557b9b",
    bossAttacks: [
      { id: "guardian-lance", label: "Lance photonique", damage: 36, cooldownSeconds: 3.4, rangePx: 720, telegraphMs: 760, behavior: "projectile" },
      { id: "guardian-blade", label: "Lame mimétique", damage: 34, cooldownSeconds: 1.5, rangePx: 138, telegraphMs: 300, behavior: "melee" },
      { id: "guardian-field", label: "Prison gravitationnelle", damage: 28, cooldownSeconds: 6.6, rangePx: 410, telegraphMs: 1_200, behavior: "area" },
    ],
    phaseLabels: ["Protocole d'étude", "Contre-chasse mimétique", "Effacement de la cité"],
    phaseBehaviors: [
      "Le Gardien mesure chaque arme avant de choisir sa contre-mesure.",
      "Il reproduit les changements d'altitude et les feintes du chasseur.",
      "Le noyau s'ouvre et le Gardien abandonne toute défense passive.",
    ],
    phaseHazards: [
      "Les champs de stase déplacent périodiquement les zones sûres.",
      "Une arme répétée trois fois perd temporairement son avantage.",
      "Les plateformes s'effacent du fond vers le centre de l'arène.",
    ],
    trophyName: "Masque du Gardien",
    trophyDescription:
      "Une face minérale dont les capteurs ont étudié puis reconnu un chasseur digne.",
    trophyPartId: "mask",
    trophyIcon: "guardian-mask",
    codexUnlockIds: ["acheron-ruins", "ancient-guardian"],
    waveArchetypes: ["scout", "rifle-soldier", "heavy"],
  }),
];

// ---------------------------------------------------------------------------
// Codex copy and indexed accessors for menus/runtime code
// ---------------------------------------------------------------------------

export interface CodexEntryDefinition {
  id: CodexEntryId;
  category: "tradition" | "technology" | "planet" | "prey";
  title: string;
  text: string;
}

export const CODEX_ENTRIES: readonly CodexEntryDefinition[] = [
  {
    id: "yautja-honor",
    category: "tradition",
    title: "Valeur de la proie",
    text: "Une proie observée, dangereuse et affrontée avec une force mesurée rapporte davantage d'honneur.",
  },
  {
    id: "biomask",
    category: "technology",
    title: "Biomask",
    text: "Le masque analyse chaleur, activité bioélectrique et technologie. Ses modes partagent l'énergie du chasseur.",
  },
  {
    id: "cloaking-device",
    category: "technology",
    title: "Camouflage actif",
    text: "Presque parfait à l'arrêt, le camouflage réfracte visiblement la lumière en mouvement et cède au moment d'attaquer.",
  },
  {
    id: "osiris-jungle",
    category: "planet",
    title: "Oseris-IV",
    text: "Une jungle humide où la canopée favorise l'approche verticale, mais où l'eau trahit les systèmes de camouflage.",
  },
  {
    id: "commandante-vey",
    category: "prey",
    title: "Commandante Vey",
    text: "Chef d'une unité de récupération, Vey emploie boue froide, fusées spectrales et tirs de suppression.",
  },
  {
    id: "nivalis-ice",
    category: "planet",
    title: "Nivalis-K",
    text: "Sous la raffinerie gelée, des galeries biologiques absorbent chaleur et vibrations.",
  },
  {
    id: "cryostalker",
    category: "prey",
    title: "Cryostalker",
    text: "Prédateur polaire original dont la carapace imite la glace. Une charge mal dirigée fracture ses plaques.",
  },
  {
    id: "cinder-volcano",
    category: "planet",
    title: "Cinder-12",
    text: "Sanctuaire volcanique abandonné. Le rayonnement thermique rend les signatures ordinaires presque inutiles.",
  },
  {
    id: "bad-blood",
    category: "prey",
    title: "Bad Blood",
    text: "Un Paria qui vole trophées et technologie. Le combattre est un jugement du clan, pas une chasse ordinaire.",
  },
  {
    id: "naraka-swamp",
    category: "planet",
    title: "Naraka-Delta",
    text: "Un réseau de mangroves à marées rapides où les pistes changent avec l'eau et où chaque racine abrite une niche endémique.",
  },
  {
    id: "mire-hydra",
    category: "prey",
    title: "Hydre de vase",
    text: "Matriarche amphibie à trois crêtes, capable de coordonner les chasseurs de rive par vibrations aquatiques.",
  },
  {
    id: "serekh-desert",
    category: "planet",
    title: "Serekh-9",
    text: "Une mer de silice bordée de canyons vitrifiés. Les organismes locaux détectent les vibrations bien avant la chaleur.",
  },
  {
    id: "sandmaw",
    category: "prey",
    title: "Matriarche Sandmaw",
    text: "Apex fouisseur dont les mandibules minérales fracturent la roche et dont la meute chasse sous le sable.",
  },
  {
    id: "pelagos-ocean",
    category: "planet",
    title: "Pelagos-M",
    text: "Monde-océan où les routes de chasse relient arches coralliennes, stations noyées et cheminées hydrothermales.",
  },
  {
    id: "abyss-leviathan",
    category: "prey",
    title: "Léviathan abyssal",
    text: "Prédateur pélagique bioluminescent qui transforme ses impulsions sonar en arme de territoire.",
  },
  {
    id: "mycora-fungal",
    category: "planet",
    title: "Mycora-V",
    text: "Biosphère mycélienne continue dont les forêts, sols et animaux partagent une mémoire sensorielle.",
  },
  {
    id: "hivemind",
    category: "prey",
    title: "Cœur-Mère mycélien",
    text: "Nœud conscient qui adapte les défenses de la planète à chaque tactique observée pendant la chasse.",
  },
  {
    id: "acheron-ruins",
    category: "planet",
    title: "Acheron-Sigma",
    text: "Lune de pierre noire couverte d'une cité automatique antérieure aux archives connues du clan.",
  },
  {
    id: "ancient-guardian",
    category: "prey",
    title: "Gardien d'obsidienne",
    text: "Sentinelle minérale capable d'étudier, mémoriser puis reproduire les tactiques de ses intrus.",
  },
];

function indexById<T extends { id: string }>(
  items: readonly T[],
): Record<string, T> {
  return Object.fromEntries(items.map((item) => [item.id, item]));
}

export const WEAPON_BY_ID = indexById(WEAPONS) as Record<
  WeaponId,
  WeaponDefinition
>;
export const GEAR_BY_ID = indexById(GEAR) as Record<GearId, GearDefinition>;
export const ARMOR_BY_ID = indexById(ARMORS) as Record<ArmorId, ArmorDefinition>;
export const DIFFICULTY_BY_ID = indexById(DIFFICULTIES) as Record<
  DifficultyId,
  DifficultyDefinition
>;
export const MISSION_BY_ID = indexById(MISSIONS) as Record<
  MissionId,
  MissionDefinition
>;
export const CODEX_ENTRY_BY_ID = indexById(CODEX_ENTRIES) as Record<
  CodexEntryId,
  CodexEntryDefinition
>;
