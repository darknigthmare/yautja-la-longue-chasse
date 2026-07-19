import type {
  ArmorId,
  ArmorTintId,
  BiomaskId,
  DreadStyleId,
  DreadTintId,
  GearId,
  HunterAppearance,
  HunterArmorStyleId,
  HunterBodyMorphId,
  HunterPresetId,
  HunterSkinId,
  TrophyAdornmentId,
  WeaponId,
} from "./types";

/**
 * The selectable roster deliberately keeps film canon, crossovers and
 * licensed expanded-universe material separate. This lets the UI be generous
 * with the franchise without presenting every appearance as one continuity.
 */
export type HunterMedia =
  | "film"
  | "animated-film"
  | "video-game"
  | "comic"
  | "novel";

export type HunterContinuity =
  | "canon"
  | "crossover"
  | "expanded";

export type HunterLorePresetId = Exclude<HunterPresetId, "custom">;

export interface HunterPresetDefinition {
  readonly id: HunterLorePresetId;
  readonly name: string;
  readonly work: string;
  readonly year: number;
  readonly media: HunterMedia;
  readonly continuity: HunterContinuity;
  readonly bodyMorphId: HunterBodyMorphId;
  readonly skinId: HunterSkinId;
  readonly biomaskId: BiomaskId | null;
  readonly dreadStyleId: DreadStyleId;
  readonly dreadTintId: DreadTintId;
  readonly armorStyleId: HunterArmorStyleId;
  readonly armorTintId: ArmorTintId;
  readonly trophyAdornmentId: TrophyAdornmentId;
  readonly recommendedArmorId: ArmorId;
  readonly signatureWeaponIds: readonly WeaponId[];
  readonly signatureGearIds: readonly GearId[];
  readonly description: string;
  readonly fidelityNote: string;
  readonly sourceUrls: readonly string[];
  /**
   * True when a plate documents a recurring screen design rather than one
   * uniquely named individual. The archive keeps one representative plate
   * instead of inflating the roster with visually identical guards.
   */
  readonly isArchetype?: true;
  /**
   * True when prose supplies the character but no fixed screen or comic
   * design exists. The resulting appearance is an explicitly labelled visual
   * interpretation, not a claim of canonical colours or mask geometry.
   */
  readonly textInterpretation?: true;
}

/**
 * Franchise-faithful hunter roster.
 *
 * The current modular renderer has fewer parts than the wider franchise.
 * fidelityNote records every deliberate approximation so a future bespoke
 * sprite can replace it without losing the source-of-truth decision.
 */
export const HUNTER_PRESETS = [
  {
    id: "jungle-hunter",
    name: "Jungle Hunter",
    work: "Predator",
    year: 1987,
    media: "film",
    continuity: "canon",
    bodyMorphId: "classic",
    skinId: "ochre-mottle",
    biomaskId: "jungle",
    dreadStyleId: "classic",
    dreadTintId: "obsidian",
    armorStyleId: "classic",
    armorTintId: "bronze",
    trophyAdornmentId: "skull-spine",
    recommendedArmorId: "hunter",
    signatureWeaponIds: ["wristblades", "plasma-caster"],
    signatureGearIds: ["motion-sensor", "audio-decoy"],
    description:
      "Le chasseur classique de Val Verde : silhouette élancée, armure minimale, peau ocre mouchetée et biomask lisse.",
    fidelityNote:
      "Le leurre audio représente son mimétisme vocal ; le système de vision thermique reste porté par le biomask.",
    sourceUrls: [
      "https://www.20thcenturystudios.com/movies/predator",
      "https://www.avpgalaxy.net/predator/jungle-hunter/",
    ],
  },
  {
    id: "city-hunter",
    name: "City Hunter",
    work: "Predator 2",
    year: 1990,
    media: "film",
    continuity: "canon",
    bodyMorphId: "classic",
    skinId: "dark-mottle",
    biomaskId: "city",
    dreadStyleId: "ringed",
    dreadTintId: "obsidian",
    armorStyleId: "city",
    armorTintId: "bronze",
    trophyAdornmentId: "skull-spine",
    recommendedArmorId: "hunter",
    signatureWeaponIds: ["wristblades", "combistick", "smart-disc"],
    signatureGearIds: ["netgun", "motion-sensor"],
    description:
      "Le jeune chasseur de Los Angeles, reconnaissable à son masque anguleux, ses dreads annelées et son arsenal urbain.",
    fidelityNote:
      "Le smart-disc, le combistick et le netgun privilégient son équipement propre au second film.",
    sourceUrls: [
      "https://www.20thcenturystudios.com/movies/predator-2",
      "https://www.avpgalaxy.net/predator/city-hunter/",
    ],
  },
  {
    id: "greyback",
    name: "Greyback",
    work: "Predator 2",
    year: 1990,
    media: "film",
    continuity: "canon",
    bodyMorphId: "elder",
    skinId: "ashen-mottle",
    biomaskId: "elder",
    dreadStyleId: "elder",
    dreadTintId: "ashen",
    armorStyleId: "city",
    armorTintId: "bronze",
    trophyAdornmentId: "skull-spine",
    recommendedArmorId: "hunter",
    signatureWeaponIds: ["wristblades", "smart-disc"],
    signatureGearIds: ["motion-sensor"],
    description:
      "L'Elder du Lost Tribe, vieux chef à la peau pâlie et aux dreads grisonnantes qui reconnaît une victoire honorable.",
    fidelityNote:
      "Son pistolet à silex de 1715 n'existe pas dans l'arsenal actuel ; le masque elder sert de variante jouable.",
    sourceUrls: [
      "https://www.20thcenturystudios.com/movies/predator-2",
      "https://necaonline.com/2022/07/predator-2-7-scale-action-figure-ultimate-elder-predator/",
    ],
  },
  {
    id: "boar",
    name: "Boar Predator",
    work: "Predator 2",
    year: 1990,
    media: "film",
    continuity: "canon",
    bodyMorphId: "classic",
    skinId: "dark-mottle",
    biomaskId: "city",
    dreadStyleId: "ringed",
    dreadTintId: "obsidian",
    armorStyleId: "city",
    armorTintId: "bronze",
    trophyAdornmentId: "skull-spine",
    recommendedArmorId: "hunter",
    signatureWeaponIds: [
      "wristblades",
      "combistick",
      "smart-disc",
      "plasma-caster",
    ],
    signatureGearIds: ["motion-sensor", "snare"],
    description:
      "Le Lost Hunter au biomask frontal massif, au collier de trophées et à l’armure de poursuite vue dans le vaisseau de 1990.",
    fidelityNote:
      "Sa plaque de sélection V5 suit les vues film et la galerie licenciée ; le rig jouable conserve encore le masque city le plus proche.",
    sourceUrls: [
      "https://www.20thcenturystudios.com/movies/predator-2",
      "https://necaonline.com/2022/05/predator-2-7-scale-action-figure-ultimate-boar-predator/",
    ],
  },
  {
    id: "shaman",
    name: "Shaman",
    work: "Predator 2",
    year: 1990,
    media: "film",
    continuity: "canon",
    bodyMorphId: "elder",
    skinId: "ashen-mottle",
    biomaskId: null,
    dreadStyleId: "elder",
    dreadTintId: "ashen",
    armorStyleId: "city",
    armorTintId: "bronze",
    trophyAdornmentId: "skull-spine",
    recommendedArmorId: "scout",
    signatureWeaponIds: ["combistick", "smart-disc"],
    signatureGearIds: ["snare"],
    description:
      "Un ancien émacié du Lost Tribe, présenté tête nue avec des ornements rituels et une allure de gardien spirituel.",
    fidelityNote:
      "Le crâne-masque et le bâton détaillés par les figurines licenciées ne sont pas visibles comme tels dans le film.",
    sourceUrls: [
      "https://www.20thcenturystudios.com/movies/predator-2",
      "https://necaonline.com/2022/02/predator-7-scale-action-figure-ultimate-shaman/",
    ],
  },
  {
    id: "lost-borg",
    name: "Lost Predator / Borg",
    work: "Predator 2",
    year: 1990,
    media: "film",
    continuity: "canon",
    bodyMorphId: "classic",
    skinId: "ashen-mottle",
    biomaskId: null,
    dreadStyleId: "veteran",
    dreadTintId: "obsidian",
    armorStyleId: "city",
    armorTintId: "gunmetal",
    trophyAdornmentId: "none",
    recommendedArmorId: "berserker",
    signatureWeaponIds: ["wristblades", "smart-disc"],
    signatureGearIds: ["motion-sensor"],
    description:
      "Le membre cybernétique du Lost Tribe, doté d'une armure asymétrique sombre et d'un œil mécanique très distinctif.",
    fidelityNote:
      "Le renderer ne possède pas encore de tête cybernétique ; l'armure gunmetal et le morph vétéran en sont l'approximation.",
    sourceUrls: [
      "https://www.20thcenturystudios.com/movies/predator-2",
      "https://necaonline.com/2020/02/predator-2-7-scale-action-figure-ultimate-armored-lost-predator/",
    ],
  },
  {
    id: "snake",
    name: "Snake Predator",
    work: "Predator 2",
    year: 1990,
    media: "film",
    continuity: "canon",
    bodyMorphId: "classic",
    skinId: "ochre-mottle",
    biomaskId: "city",
    dreadStyleId: "classic",
    dreadTintId: "obsidian",
    armorStyleId: "city",
    armorTintId: "bronze",
    trophyAdornmentId: "none",
    recommendedArmorId: "hunter",
    signatureWeaponIds: ["wristblades", "combistick", "smart-disc"],
    signatureGearIds: ["netgun"],
    description:
      "Un Lost Hunter compact, à la peau chaude et au masque urbain, associé à un équipement léger de poursuite.",
    fidelityNote:
      "Ses dreads particulièrement courtes sont rendues par le style classic, le plus proche du rig disponible.",
    sourceUrls: [
      "https://www.20thcenturystudios.com/movies/predator-2",
      "https://necaonline.com/2022/07/predator-2-7-scale-action-figure-ultimate-snake/",
    ],
  },
  {
    id: "warrior",
    name: "Warrior Predator",
    work: "Predator 2",
    year: 1990,
    media: "film",
    continuity: "canon",
    bodyMorphId: "classic",
    skinId: "ashen-mottle",
    biomaskId: "city",
    dreadStyleId: "classic",
    dreadTintId: "obsidian",
    armorStyleId: "city",
    armorTintId: "gunmetal",
    trophyAdornmentId: "none",
    recommendedArmorId: "berserker",
    signatureWeaponIds: ["wristblades", "combistick", "plasma-caster"],
    signatureGearIds: ["motion-sensor"],
    description:
      "Un combattant lourd du Lost Tribe, au masque étroit et à l'armure argentée plus couvrante que celle du City Hunter.",
    fidelityNote:
      "Son canon et ses lames restent volontairement dans le vocabulaire technologique visible du clan de 1990.",
    sourceUrls: [
      "https://www.20thcenturystudios.com/movies/predator-2",
      "https://necaonline.com/2022/01/predator-2-7-scale-action-figure-ultimate-warrior-predator-30th-anniversary/",
    ],
  },
  {
    id: "guardian",
    name: "Guardian Predator",
    work: "Predator 2",
    year: 1990,
    media: "film",
    continuity: "canon",
    bodyMorphId: "classic",
    skinId: "ashen-mottle",
    biomaskId: "enforcer",
    dreadStyleId: "veteran",
    dreadTintId: "obsidian",
    armorStyleId: "city",
    armorTintId: "gunmetal",
    trophyAdornmentId: "none",
    recommendedArmorId: "hunter",
    signatureWeaponIds: ["wristblades", "combistick", "smart-disc"],
    signatureGearIds: ["motion-sensor"],
    description:
      "Le gardien du Lost Tribe, reconnaissable à son grand biomask strié, sa cuirasse sombre et sa silhouette de sentinelle.",
    fidelityNote:
      "La plaque V5 est propre au personnage ; le biomask enforcer reste une approximation fonctionnelle dans le rig modulaire.",
    sourceUrls: [
      "https://www.20thcenturystudios.com/movies/predator-2",
      "https://necaonline.com/2012/11/14-scale-predators-series-2-action-figures-guardian-unmasked-city-hunter/",
    ],
  },
  {
    id: "lost-scout",
    name: "Scout Predator",
    work: "Predator 2",
    year: 1990,
    media: "film",
    continuity: "canon",
    bodyMorphId: "classic",
    skinId: "ashen-mottle",
    biomaskId: "city",
    dreadStyleId: "classic",
    dreadTintId: "obsidian",
    armorStyleId: "city",
    armorTintId: "bronze",
    trophyAdornmentId: "none",
    recommendedArmorId: "scout",
    signatureWeaponIds: ["wristblades", "combistick", "smart-disc"],
    signatureGearIds: ["motion-sensor", "netgun"],
    description:
      "L’éclaireur du Lost Tribe, plus léger, aux plaques réduites et au casque compact adapté à la reconnaissance.",
    fidelityNote:
      "Sa plaque V5 verrouille sa silhouette film ; le catalogue d’armes ne lui attribue aucun accessoire non attesté.",
    sourceUrls: [
      "https://www.20thcenturystudios.com/movies/predator-2",
      "https://store.necaonline.com/blogs/news/predators-introducing-the-lost-tribe-from-our-series-6-action-figures",
    ],
  },
  {
    id: "lost-stalker",
    name: "Stalker Predator",
    work: "Predator 2",
    year: 1990,
    media: "film",
    continuity: "canon",
    bodyMorphId: "classic",
    skinId: "dark-mottle",
    biomaskId: "city",
    dreadStyleId: "ringed",
    dreadTintId: "obsidian",
    armorStyleId: "city",
    armorTintId: "obsidian",
    trophyAdornmentId: "none",
    recommendedArmorId: "scout",
    signatureWeaponIds: ["wristblades", "combistick", "smart-disc"],
    signatureGearIds: ["motion-sensor", "snare"],
    description:
      "Le Stalker de la Lost Tribe cinématographique, distinct du design Kenner homonyme, avec armure sombre et profil furtif.",
    fidelityNote:
      "Le nom est limité au membre du clan de 1990 ; la plaque V5 ne reprend aucun élément du Stalker Kenner.",
    sourceUrls: [
      "https://www.20thcenturystudios.com/movies/predator-2",
      "https://store.necaonline.com/blogs/news/predators-introducing-the-lost-tribe-from-our-series-6-action-figures",
    ],
  },
  {
    id: "scar",
    name: "Scar",
    work: "Alien vs. Predator",
    year: 2004,
    media: "film",
    continuity: "crossover",
    bodyMorphId: "young",
    skinId: "ochre-mottle",
    biomaskId: "scar",
    dreadStyleId: "ringed",
    dreadTintId: "obsidian",
    armorStyleId: "avp",
    armorTintId: "bronze",
    trophyAdornmentId: "skull-spine",
    recommendedArmorId: "hunter",
    signatureWeaponIds: ["wristblades", "combistick", "plasma-caster"],
    signatureGearIds: ["motion-sensor", "netgun"],
    description:
      "Le Young Blood qui s'allie à Alexa Woods, avec masque marqué, armure cérémonielle et scarification au sang acide.",
    fidelityNote:
      "Le préréglage représente son état blooded ; le bouclier et la lance improvisés en carapace xénomorphe restent hors catalogue.",
    sourceUrls: [
      "https://www.20thcenturystudios.com/movies/alien-vs-predator",
      "https://www.avpgalaxy.net/predator/scar/",
    ],
  },
  {
    id: "celtic",
    name: "Celtic",
    work: "Alien vs. Predator",
    year: 2004,
    media: "film",
    continuity: "crossover",
    bodyMorphId: "young",
    skinId: "ashen-mottle",
    biomaskId: "celtic",
    dreadStyleId: "braided",
    dreadTintId: "obsidian",
    armorStyleId: "avp",
    armorTintId: "gunmetal",
    trophyAdornmentId: "none",
    recommendedArmorId: "berserker",
    signatureWeaponIds: ["wristblades", "combistick"],
    signatureGearIds: ["netgun", "snare"],
    description:
      "Le plus massif des trois Young Bloods de Bouvetøya, immédiatement identifiable à son biomask celtique.",
    fidelityNote:
      "Sa grande musculature et son armure lourde prennent priorité sur les détails trop fins du motif de masque.",
    sourceUrls: [
      "https://www.20thcenturystudios.com/movies/alien-vs-predator",
      "https://www.avpgalaxy.net/predator/celtic/",
    ],
  },
  {
    id: "chopper",
    name: "Chopper",
    work: "Alien vs. Predator",
    year: 2004,
    media: "film",
    continuity: "crossover",
    bodyMorphId: "young",
    skinId: "ochre-mottle",
    biomaskId: "chopper",
    dreadStyleId: "classic",
    dreadTintId: "obsidian",
    armorStyleId: "avp",
    armorTintId: "gunmetal",
    trophyAdornmentId: "none",
    recommendedArmorId: "hunter",
    signatureWeaponIds: ["wristblades", "combistick"],
    signatureGearIds: ["netgun"],
    description:
      "Le Young Blood au masque à mandibules et aux longues lames dorsales, préparé pour une chasse rituelle en équipe.",
    fidelityNote:
      "Les deux trophées-lames qui dépassent de son dos demandent à terme un sprite dédié.",
    sourceUrls: [
      "https://www.20thcenturystudios.com/movies/alien-vs-predator",
      "https://www.avpgalaxy.net/predator/chopper/",
    ],
  },
  {
    id: "avp-elder",
    name: "AVP Elder",
    work: "Alien vs. Predator",
    year: 2004,
    media: "film",
    continuity: "crossover",
    bodyMorphId: "elder",
    skinId: "ashen-mottle",
    biomaskId: null,
    dreadStyleId: "elder",
    dreadTintId: "ashen",
    armorStyleId: "avp",
    armorTintId: "gunmetal",
    trophyAdornmentId: "skull-spine",
    recommendedArmorId: "hunter",
    signatureWeaponIds: ["combistick", "smart-disc"],
    signatureGearIds: ["motion-sensor"],
    description:
      "Le chef du clan de 2004, vétéran capé qui reconnaît Alexa comme guerrière après la destruction de la pyramide.",
    fidelityNote:
      "Il reste tête nue afin de préserver son visage âgé et ses scarifications, son principal signe d'identité à l'écran.",
    sourceUrls: [
      "https://www.20thcenturystudios.com/movies/alien-vs-predator",
      "https://mcfarlane.com/toys/elder-predator/",
    ],
  },
  {
    id: "ancient-warrior",
    name: "Ancient Warrior",
    work: "Alien vs. Predator",
    year: 2004,
    media: "film",
    continuity: "crossover",
    bodyMorphId: "young",
    skinId: "ashen-mottle",
    biomaskId: "scar",
    dreadStyleId: "braided",
    dreadTintId: "obsidian",
    armorStyleId: "avp",
    armorTintId: "bronze",
    trophyAdornmentId: "skull-spine",
    recommendedArmorId: "hunter",
    signatureWeaponIds: ["wristblades", "combistick", "plasma-caster"],
    signatureGearIds: ["motion-sensor", "netgun"],
    description:
      "Un ancien combattant de la pyramide, couvert d’une armure cérémonielle AVP, de trophées et de gantelets propres à sa caste.",
    fidelityNote:
      "La plaque V5 se fonde sur les plans du film et la galerie licenciée ; elle ne réutilise pas la silhouette de Scar.",
    sourceUrls: [
      "https://www.20thcenturystudios.com/movies/alien-vs-predator",
      "https://necaonline.com/2016/04/closer-look-predator-series-15-action-figures/",
    ],
  },
  {
    id: "temple-guard",
    name: "Temple Guard",
    work: "Alien vs. Predator",
    year: 2004,
    media: "film",
    continuity: "crossover",
    bodyMorphId: "young",
    skinId: "dark-mottle",
    biomaskId: "celtic",
    dreadStyleId: "temple",
    dreadTintId: "obsidian",
    armorStyleId: "avp",
    armorTintId: "gunmetal",
    trophyAdornmentId: "none",
    recommendedArmorId: "berserker",
    signatureWeaponIds: ["wristblades", "combistick", "smart-disc"],
    signatureGearIds: ["motion-sensor", "snare"],
    description:
      "Le garde lourd associé au temple, doté d’un masque, d’un plastron et de plaques cérémonielles distincts des trois Young Bloods.",
    fidelityNote:
      "Le biomask celtic n’est utilisé que par le rig générique ; sa plaque V5 conserve sa géométrie de garde propre.",
    sourceUrls: [
      "https://www.20thcenturystudios.com/movies/alien-vs-predator",
      "https://necaonline.com/2016/04/closer-look-predator-series-15-action-figures/",
    ],
  },
  {
    id: "youngblood",
    name: "Youngblood Predator",
    work: "Alien vs. Predator",
    year: 2004,
    media: "film",
    continuity: "crossover",
    bodyMorphId: "young",
    skinId: "ochre-mottle",
    biomaskId: "scar",
    dreadStyleId: "ringed",
    dreadTintId: "obsidian",
    armorStyleId: "avp",
    armorTintId: "bronze",
    trophyAdornmentId: "skull-spine",
    recommendedArmorId: "hunter",
    signatureWeaponIds: ["wristblades", "combistick", "smart-disc"],
    signatureGearIds: ["netgun", "motion-sensor"],
    description:
      "Le Youngblood cérémoniel à doubles lames et staff-trophée, conservé comme individu distinct de Scar, Celtic et Chopper.",
    fidelityNote:
      "La tête de Xénomorphe portée par son staff reste un trophée de plaque et non un nouveau type d’arme jouable.",
    sourceUrls: [
      "https://www.20thcenturystudios.com/movies/alien-vs-predator",
      "https://necaonline.com/2016/10/predator-7-scale-action-figures-series-17-assortment/",
    ],
  },
  {
    id: "wolf",
    name: "Wolf",
    work: "Aliens vs. Predator: Requiem",
    year: 2007,
    media: "film",
    continuity: "crossover",
    bodyMorphId: "classic",
    skinId: "dark-mottle",
    biomaskId: "wolf",
    dreadStyleId: "veteran",
    dreadTintId: "ashen",
    armorStyleId: "avp",
    armorTintId: "gunmetal",
    trophyAdornmentId: "skull-spine",
    recommendedArmorId: "hunter",
    signatureWeaponIds: ["wristblades", "combistick", "plasma-caster"],
    signatureGearIds: ["netgun", "snare"],
    description:
      "Le nettoyeur balafré de Gunnison, vétéran solitaire équipé de deux plasmacasters et d'un masque abîmé.",
    fidelityNote:
      "Le liquide dissolvant, les mines laser et le fouet xénomorphe sont approximés par les outils de contrôle existants.",
    sourceUrls: [
      "https://www.20thcenturystudios.com/movies/aliens-vs-predator-requiem",
      "https://www.avpgalaxy.net/predator/wolf/",
    ],
  },
  {
    id: "bull",
    name: "Bull Predator",
    work: "Aliens vs. Predator: Requiem",
    year: 2007,
    media: "film",
    continuity: "crossover",
    bodyMorphId: "classic",
    skinId: "dark-mottle",
    biomaskId: "wolf",
    dreadStyleId: "ringed",
    dreadTintId: "obsidian",
    armorStyleId: "avp",
    armorTintId: "gunmetal",
    trophyAdornmentId: "none",
    recommendedArmorId: "hunter",
    signatureWeaponIds: ["wristblades", "plasma-caster", "smart-disc"],
    signatureGearIds: ["motion-sensor", "snare"],
    description:
      "Le Blooded robuste du Scout Ship, identifiable à son biomask argenté Bull et à ses plaques industrielles intactes avant le crash.",
    fidelityNote:
      "Le masque wolf n’est qu’une approximation articulée du rig ; la plaque V5 conserve le biomask Bull propre, ses fentes noires, son caster et son shuriken attestés.",
    sourceUrls: [
      "https://www.20thcenturystudios.com/movies/aliens-vs-predator-requiem",
      "https://funko.com/pop-bull-predator/90243.html",
      "https://www.avpcentral.com/bull-predator",
    ],
  },
  {
    id: "bonegrill",
    name: "Bonegrill Predator",
    work: "Aliens vs. Predator: Requiem",
    year: 2007,
    media: "film",
    continuity: "crossover",
    bodyMorphId: "classic",
    skinId: "dark-mottle",
    biomaskId: "wolf",
    dreadStyleId: "ringed",
    dreadTintId: "obsidian",
    armorStyleId: "avp",
    armorTintId: "gunmetal",
    trophyAdornmentId: "none",
    recommendedArmorId: "hunter",
    signatureWeaponIds: ["wristblades", "plasma-caster"],
    signatureGearIds: ["motion-sensor", "snare"],
    description:
      "Le Yautja de la salle des trophées du Scout Ship, reconnaissable à la grille mandibulaire osseuse imbriquée de son biomask.",
    fidelityNote:
      "Le rig emploie provisoirement le volume wolf ; seule la plaque V5 reproduit la grille Bone Grill sans la transformer en crâne blanc générique.",
    sourceUrls: [
      "https://www.20thcenturystudios.com/movies/aliens-vs-predator-requiem",
      "https://www.1999.co.jp/eng/image/10178863",
      "https://www.avpcentral.com/bonegrill-predator",
    ],
  },
  {
    id: "classic-captive",
    name: "Classic / Captive Predator",
    work: "Predators",
    year: 2010,
    media: "film",
    continuity: "canon",
    bodyMorphId: "classic",
    skinId: "ochre-mottle",
    biomaskId: "jungle",
    dreadStyleId: "classic",
    dreadTintId: "obsidian",
    armorStyleId: "classic",
    armorTintId: "bronze",
    trophyAdornmentId: "none",
    recommendedArmorId: "hunter",
    signatureWeaponIds: ["wristblades", "plasma-caster"],
    signatureGearIds: ["motion-sensor", "snare"],
    description:
      "Le Yautja classique retenu et crucifié sur la réserve de chasse, avec biomask ancien, armure endommagée et silhouette distincte des Super Predators.",
    fidelityNote:
      "Captive, Crucified et battle-damaged sont des états du même individu ; la plaque V5 les regroupe sans créer trois chasseurs.",
    sourceUrls: [
      "https://www.20thcenturystudios.com/movies/predators",
      "https://necaonline.com/2011/03/predators-7-action-figure-series-2-assortment/",
    ],
  },
  {
    id: "berserker",
    name: "Berserker / Mr. Black",
    work: "Predators",
    year: 2010,
    media: "film",
    continuity: "canon",
    bodyMorphId: "super",
    skinId: "dark-mottle",
    biomaskId: "berserker",
    dreadStyleId: "feral",
    dreadTintId: "obsidian",
    armorStyleId: "super",
    armorTintId: "obsidian",
    trophyAdornmentId: "skull-spine",
    recommendedArmorId: "berserker",
    signatureWeaponIds: ["wristblades", "plasma-caster"],
    signatureGearIds: ["snare"],
    description:
      "Le chef des Super Predators de la réserve de chasse, massif, noir et rouge, avec mandibule inférieure exposée.",
    fidelityNote:
      "Le rig super distingue sa taille et sa posture des Yautja classiques sans inventer une nouvelle espèce jouable.",
    sourceUrls: [
      "https://www.20thcenturystudios.com/movies/predators",
      "https://www.avpgalaxy.net/predator/berserker/",
    ],
  },
  {
    id: "falconer",
    name: "Falconer",
    work: "Predators",
    year: 2010,
    media: "film",
    continuity: "canon",
    bodyMorphId: "super",
    skinId: "dark-mottle",
    biomaskId: "berserker",
    dreadStyleId: "feral",
    dreadTintId: "obsidian",
    armorStyleId: "super",
    armorTintId: "gunmetal",
    trophyAdornmentId: "none",
    recommendedArmorId: "scout",
    signatureWeaponIds: ["wristblades", "smart-disc"],
    signatureGearIds: ["motion-sensor"],
    description:
      "Le Super Predator à l'armure légère et au drone-faucon, combattant au corps à corps contre Hanzo.",
    fidelityNote:
      "Le biomask berserker est une base provisoire ; son masque à fines stries et son drone exigent des modules dédiés.",
    sourceUrls: [
      "https://www.20thcenturystudios.com/movies/predators",
      "https://www.avpgalaxy.net/predator/falconer/",
    ],
  },
  {
    id: "tracker",
    name: "Tracker",
    work: "Predators",
    year: 2010,
    media: "film",
    continuity: "canon",
    bodyMorphId: "super",
    skinId: "dark-mottle",
    biomaskId: "berserker",
    dreadStyleId: "feral",
    dreadTintId: "obsidian",
    armorStyleId: "super",
    armorTintId: "bronze",
    trophyAdornmentId: "none",
    recommendedArmorId: "hunter",
    signatureWeaponIds: ["wristblades", "plasma-caster"],
    signatureGearIds: ["motion-sensor", "snare"],
    description:
      "Le pisteur tuské de la réserve, maître des Predator Hounds et reconnaissable à son masque allongé.",
    fidelityNote:
      "Les hounds ne sont pas des équipements portables ; motion-sensor et snare n'en représentent que la fonction de traque.",
    sourceUrls: [
      "https://www.20thcenturystudios.com/movies/predators",
      "https://www.avpgalaxy.net/predator/tracker/",
    ],
  },
  {
    id: "fugitive",
    name: "Fugitive Predator",
    work: "The Predator",
    year: 2018,
    media: "film",
    continuity: "canon",
    bodyMorphId: "classic",
    skinId: "ashen-mottle",
    biomaskId: "fugitive",
    dreadStyleId: "veteran",
    dreadTintId: "obsidian",
    armorStyleId: "classic",
    armorTintId: "gunmetal",
    trophyAdornmentId: "none",
    recommendedArmorId: "hunter",
    signatureWeaponIds: ["wristblades", "plasma-caster"],
    signatureGearIds: ["motion-sensor", "audio-decoy"],
    description:
      "Le fugitif gris de 2018, silhouette classique modernisée, venu sur Terre avec une cargaison destinée aux humains.",
    fidelityNote:
      "Son matériel biologique et la cargaison Predator Killer ne font pas partie de son équipement de chasse jouable.",
    sourceUrls: [
      "https://www.20thcenturystudios.com/movies/the-predator",
      "https://www.avpgalaxy.net/predator/fugitive/",
    ],
  },
  {
    id: "assassin",
    name: "Assassin / Upgrade Predator",
    work: "The Predator",
    year: 2018,
    media: "film",
    continuity: "canon",
    bodyMorphId: "super",
    skinId: "ochre-mottle",
    biomaskId: null,
    dreadStyleId: "feral",
    dreadTintId: "obsidian",
    armorStyleId: "super",
    armorTintId: "obsidian",
    trophyAdornmentId: "none",
    recommendedArmorId: "berserker",
    signatureWeaponIds: ["wristblades", "plasma-caster"],
    signatureGearIds: ["motion-sensor", "snare"],
    description:
      "L'Upgrade Predator de onze pieds, dont la peau renforcée et les armes organiques remplacent presque toute armure.",
    fidelityNote:
      "L'armure super obsidienne représente son exosquelette biologique ; il reste tête nue comme dans le film.",
    sourceUrls: [
      "https://www.20thcenturystudios.com/movies/the-predator",
      "https://www.avpgalaxy.net/predator/upgrade/",
    ],
  },
  {
    id: "emissary-one",
    name: "Emissary Predator 1",
    work: "The Predator — scènes supprimées",
    year: 2018,
    media: "film",
    continuity: "expanded",
    bodyMorphId: "classic",
    skinId: "ashen-mottle",
    biomaskId: "fugitive",
    dreadStyleId: "veteran",
    dreadTintId: "obsidian",
    armorStyleId: "classic",
    armorTintId: "gunmetal",
    trophyAdornmentId: "none",
    recommendedArmorId: "hunter",
    signatureWeaponIds: ["wristblades", "plasma-caster"],
    signatureGearIds: ["motion-sensor", "audio-decoy"],
    description:
      "Premier Emissary du matériel de production supprimé de 2018, équipé d’une armure militaire et d’un fusil conçu pour les séquences abandonnées.",
    fidelityNote:
      "Cette plaque est étiquetée scène supprimée et ne prétend pas que l’Emissary apparaît dans le montage cinéma.",
    sourceUrls: [
      "https://www.20thcenturystudios.com/movies/the-predator",
      "https://store.necaonline.com/blogs/toy-fair/toy-fair-2019-day-2-reveals-action-figures-from-the-predator-godzilla-more",
    ],
  },
  {
    id: "emissary-two",
    name: "Emissary Predator 2",
    work: "The Predator — scènes supprimées",
    year: 2018,
    media: "film",
    continuity: "expanded",
    bodyMorphId: "classic",
    skinId: "ochre-mottle",
    biomaskId: "fugitive",
    dreadStyleId: "ringed",
    dreadTintId: "obsidian",
    armorStyleId: "classic",
    armorTintId: "bronze",
    trophyAdornmentId: "none",
    recommendedArmorId: "hunter",
    signatureWeaponIds: ["wristblades", "plasma-caster"],
    signatureGearIds: ["motion-sensor", "netgun"],
    description:
      "Second Emissary du tournage de 2018, variante individuelle masquée et démasquée du duo allié retiré du montage final.",
    fidelityNote:
      "La plaque conserve son équipement de production licencié sans le mélanger au Fugitive ni au montage distribué.",
    sourceUrls: [
      "https://www.20thcenturystudios.com/movies/the-predator",
      "https://store.necaonline.com/blogs/toy-fair/toy-fair-2019-day-2-reveals-action-figures-from-the-predator-godzilla-more",
    ],
  },
  {
    id: "feral-hunter",
    name: "Feral Predator",
    work: "Prey",
    year: 2022,
    media: "film",
    continuity: "canon",
    bodyMorphId: "feral",
    skinId: "ochre-mottle",
    biomaskId: "feral",
    dreadStyleId: "feral",
    dreadTintId: "obsidian",
    armorStyleId: "feral",
    armorTintId: "bronze",
    trophyAdornmentId: "skull-spine",
    recommendedArmorId: "scout",
    signatureWeaponIds: ["wristblades", "combistick", "yautja-bow"],
    signatureGearIds: ["netgun", "snare"],
    description:
      "Le chasseur de 1719, plus fin et primitif, au masque de crâne, bouclier segmenté et bolt gun guidé.",
    fidelityNote:
      "Le yautja-bow sert de substitut mécanique au bolt gun ; le combistick représente sa lance télescopique.",
    sourceUrls: [
      "https://www.20thcenturystudios.com/movies/prey",
      "https://www.avpgalaxy.net/predator/feral/",
    ],
  },
  {
    id: "kok-jotun",
    name: "Viking Segment Hunter",
    work: "Predator: Killer of Killers",
    year: 2025,
    media: "animated-film",
    continuity: "canon",
    bodyMorphId: "super",
    skinId: "ashen-mottle",
    biomaskId: "feral",
    dreadStyleId: "feral",
    dreadTintId: "obsidian",
    armorStyleId: "feral",
    armorTintId: "gunmetal",
    trophyAdornmentId: "none",
    recommendedArmorId: "berserker",
    signatureWeaponIds: ["wristblades", "combistick"],
    signatureGearIds: ["snare"],
    description:
      "Le colosse envoyé dans la Scandinavie viking, bâti comme un bélier et armé pour briser un groupe au contact.",
    fidelityNote:
      "La plaque suit le chasseur visible dans le segment viking ; le nom Jötunn d’un design licencié distinct n’est pas gravé comme identité film.",
    sourceUrls: [
      "https://www.20thcenturystudios.com/movies/predator-killer-of-killers",
      "https://www.hulu.com/movie/predator-killer-of-killers-5d9e2aa0-286f-4029-89de-114baa89036d",
    ],
  },
  {
    id: "kok-oni",
    name: "Feudal Japan Hunter",
    work: "Predator: Killer of Killers",
    year: 2025,
    media: "animated-film",
    continuity: "canon",
    bodyMorphId: "classic",
    skinId: "dark-mottle",
    biomaskId: "chopper",
    dreadStyleId: "temple",
    dreadTintId: "obsidian",
    armorStyleId: "avp",
    armorTintId: "gunmetal",
    trophyAdornmentId: "none",
    recommendedArmorId: "hunter",
    signatureWeaponIds: ["wristblades", "combistick", "smart-disc"],
    signatureGearIds: ["netgun", "snare"],
    description:
      "Le chasseur du Japon féodal, silhouette agile inspirée de l'oni et spécialisée dans le duel rapproché.",
    fidelityNote:
      "La plaque suit uniquement l’adversaire du segment japonais et ne le fusionne pas automatiquement avec le cosmétique Oni de Hunting Grounds.",
    sourceUrls: [
      "https://www.20thcenturystudios.com/movies/predator-killer-of-killers",
      "https://www.hulu.com/movie/predator-killer-of-killers-5d9e2aa0-286f-4029-89de-114baa89036d",
    ],
  },
  {
    id: "kok-pilot",
    name: "Predator Pilot",
    work: "Predator: Killer of Killers",
    year: 2025,
    media: "animated-film",
    continuity: "canon",
    bodyMorphId: "feral",
    skinId: "ashen-mottle",
    biomaskId: "feral",
    dreadStyleId: "temple",
    dreadTintId: "obsidian",
    armorStyleId: "feral",
    armorTintId: "gunmetal",
    trophyAdornmentId: "none",
    recommendedArmorId: "scout",
    signatureWeaponIds: ["wristblades", "plasma-caster", "smart-disc"],
    signatureGearIds: ["motion-sensor", "audio-decoy"],
    description:
      "Le chasseur aérien du segment Seconde Guerre mondiale, conçu autour de la poursuite en vol et d’une silhouette aérodynamique propre.",
    fidelityNote:
      "La plaque V5 reprend uniquement l’équipement visible dans le segment aérien ; aucun module du Jötunn ou de l’Oni n’est ajouté.",
    sourceUrls: [
      "https://www.20thcenturystudios.com/movies/predator-killer-of-killers",
      "https://jsmarantz.artstation.com/projects/L4VNgK",
    ],
  },
  {
    id: "kok-warlord",
    name: "Warlord Predator",
    work: "Predator: Killer of Killers",
    year: 2025,
    media: "animated-film",
    continuity: "canon",
    bodyMorphId: "elder",
    skinId: "dark-mottle",
    biomaskId: "elder",
    dreadStyleId: "veteran",
    dreadTintId: "obsidian",
    armorStyleId: "super",
    armorTintId: "obsidian",
    trophyAdornmentId: "skull-spine",
    recommendedArmorId: "berserker",
    signatureWeaponIds: ["wristblades", "combistick", "smart-disc"],
    signatureGearIds: ["snare"],
    description:
      "Le seigneur de guerre qui règne sur l'arène Yautja, ancien, massif et couvert d'une armure cérémonielle sombre.",
    fidelityNote:
      "Le masque elder est la silhouette la plus proche du casque royal animé, sans prétendre en reproduire chaque gravure.",
    sourceUrls: [
      "https://www.20thcenturystudios.com/movies/predator-killer-of-killers",
      "https://www.hulu.com/movie/predator-killer-of-killers-5d9e2aa0-286f-4029-89de-114baa89036d",
    ],
  },
  {
    id: "kok-captive",
    name: "Captive Yautja — individu sans nom officiel",
    work: "Predator: Killer of Killers",
    year: 2025,
    media: "animated-film",
    continuity: "canon",
    bodyMorphId: "classic",
    skinId: "ashen-mottle",
    biomaskId: null,
    dreadStyleId: "ringed",
    dreadTintId: "obsidian",
    armorStyleId: "classic",
    armorTintId: "gunmetal",
    trophyAdornmentId: "none",
    recommendedArmorId: "scout",
    signatureWeaponIds: ["wristblades"],
    signatureGearIds: ["motion-sensor"],
    description:
      "Le prisonnier pâle et démasqué de l’arène, blessé à l’œil droit et à la mandibule, dépouillé de son arsenal et maintenu par un collier explosif.",
    fidelityNote:
      "La recommandation jouable permet de rééquiper le prisonnier après sélection ; sa plaque d’archive reste strictement sans masque, caster ni panoplie héroïque.",
    sourceUrls: [
      "https://www.20thcenturystudios.com/movies/predator-killer-of-killers",
      "https://depredador-avp.fandom.com/es/wiki/Captive_Predator_%28Killer_of_Killers%29",
    ],
  },
  {
    id: "kok-arena-guard",
    name: "Arena Guard — archétype collectif",
    work: "Predator: Killer of Killers",
    year: 2025,
    media: "animated-film",
    continuity: "canon",
    bodyMorphId: "super",
    skinId: "dark-mottle",
    biomaskId: "feral",
    dreadStyleId: "ringed",
    dreadTintId: "obsidian",
    armorStyleId: "feral",
    armorTintId: "bronze",
    trophyAdornmentId: "skull-spine",
    recommendedArmorId: "berserker",
    signatureWeaponIds: ["wristblades", "combistick"],
    signatureGearIds: ["motion-sensor", "snare"],
    description:
      "Le modèle collectif des gardes massifs du clan du désert : masque osseux symétrique à deux cornes latérales, harnais segmenté et lourdes protections.",
    fidelityNote:
      "Une seule plaque représente ce design récurrent d’écran ; elle suit le turnaround de production et ne lui attribue ni l’équipement du Warlord ni celui du Pilot.",
    sourceUrls: [
      "https://www.20thcenturystudios.com/movies/predator-killer-of-killers",
      "https://jsmarantz.artstation.com/projects/0lgDQG",
      "https://predator-movies.com/gallery/view/img/8782",
    ],
    isArchetype: true,
  },
  {
    id: "dek",
    name: "Dek",
    work: "Predator: Badlands",
    year: 2025,
    media: "film",
    continuity: "canon",
    bodyMorphId: "young",
    skinId: "dark-mottle",
    biomaskId: "dek",
    dreadStyleId: "temple",
    dreadTintId: "obsidian",
    armorStyleId: "feral",
    armorTintId: "gunmetal",
    trophyAdornmentId: "none",
    recommendedArmorId: "scout",
    signatureWeaponIds: [
      "wristblades",
      "combistick",
      "smart-disc",
      "yautja-bow",
    ],
    signatureGearIds: ["motion-sensor", "snare"],
    description:
      "Le jeune Yautja banni de Genna, plus petit que son clan et contraint de transformer l'environnement en arsenal.",
    fidelityNote:
      "Le masque dek et le morph young couvrent sa silhouette ; ses armes improvisées de Genna sont ramenées aux familles jouables.",
    sourceUrls: [
      "https://www.20thcenturystudios.com/movies/predator-badlands",
      "https://www.avpgalaxy.net/predator/dek/",
    ],
  },
  {
    id: "kwei",
    name: "Kwei",
    work: "Predator: Badlands",
    year: 2025,
    media: "film",
    continuity: "canon",
    bodyMorphId: "classic",
    skinId: "dark-mottle",
    biomaskId: "dek",
    dreadStyleId: "temple",
    dreadTintId: "obsidian",
    armorStyleId: "feral",
    armorTintId: "bronze",
    trophyAdornmentId: "none",
    recommendedArmorId: "hunter",
    signatureWeaponIds: ["wristblades", "combistick", "yautja-bow"],
    signatureGearIds: ["motion-sensor", "snare"],
    description:
      "Le frère de Dek, chasseur plus accompli du clan, reconnaissable à sa stature, ses plaques et son équipement d’entraînement distincts.",
    fidelityNote:
      "La plaque V5 suit ses scènes et ne transforme pas Kwei en simple recoloration de Dek.",
    sourceUrls: [
      "https://www.20thcenturystudios.com/movies/predator-badlands",
      "https://yautjaclan.com/lore/kwei--yautja--predator-badlands-character",
    ],
  },
  {
    id: "dek-father",
    name: "Njohrr — père de Dek",
    work: "Predator: Badlands",
    year: 2025,
    media: "film",
    continuity: "canon",
    bodyMorphId: "elder",
    skinId: "dark-mottle",
    biomaskId: "elder",
    dreadStyleId: "elder",
    dreadTintId: "ashen",
    armorStyleId: "super",
    armorTintId: "obsidian",
    trophyAdornmentId: "skull-spine",
    recommendedArmorId: "berserker",
    signatureWeaponIds: ["wristblades", "combistick", "plasma-caster"],
    signatureGearIds: ["motion-sensor", "snare"],
    description:
      "Le patriarche du clan de Dek, ancien massif aux plaques cérémonielles sombres et à l’autorité martiale immédiatement lisible.",
    fidelityNote:
      "La plaque suit son masque à appendices, ses dreads blanches et son armure noire et or visibles dans Badlands ; le rig elder n’en est que la base articulée.",
    sourceUrls: [
      "https://www.20thcenturystudios.com/movies/predator-badlands",
      "https://yautjaclan.com/lore/njohrr--yautja-clan-leader--deks-father-predator-badlands",
    ],
  },
  {
    id: "scarface",
    name: "Scarface",
    work: "Predator: Concrete Jungle",
    year: 2005,
    media: "video-game",
    continuity: "expanded",
    bodyMorphId: "classic",
    skinId: "ochre-mottle",
    biomaskId: "enforcer",
    dreadStyleId: "veteran",
    dreadTintId: "obsidian",
    armorStyleId: "city",
    armorTintId: "bronze",
    trophyAdornmentId: "skull-spine",
    recommendedArmorId: "hunter",
    signatureWeaponIds: [
      "wristblades",
      "combistick",
      "plasma-caster",
      "smart-disc",
    ],
    signatureGearIds: ["netgun", "snare"],
    description:
      "Le chasseur défiguré de Concrete Jungle, exilé puis revenu à Neonopolis avec une armure reconstruite et un vaste arsenal.",
    fidelityNote:
      "Le masque enforcer reproduit seulement son volume agressif ; la cicatrice faciale et les variantes d'armure requièrent des sprites dédiés.",
    sourceUrls: [
      "https://necaonline.com/2016/11/closer-look-video-game-appearance-ultimate-scarface-predator/",
    ],
  },
  {
    id: "stone-heart",
    name: "Stone Heart",
    work: "Predator: Concrete Jungle",
    year: 2005,
    media: "video-game",
    continuity: "expanded",
    bodyMorphId: "super",
    skinId: "dark-mottle",
    biomaskId: null,
    dreadStyleId: "veteran",
    dreadTintId: "obsidian",
    armorStyleId: "super",
    armorTintId: "gunmetal",
    trophyAdornmentId: "none",
    recommendedArmorId: "berserker",
    signatureWeaponIds: ["wristblades", "plasma-caster"],
    signatureGearIds: ["motion-sensor"],
    description:
      "Un Yautja capturé et transformé en cyborg géant, avec implants massifs, vision intégrée et lames renforcées.",
    fidelityNote:
      "Il ne porte pas de biomask ; le morph super et l'armure gunmetal traduisent son augmentation cybernétique.",
    sourceUrls: [
      "https://store.necaonline.com/products/predator-7-scale-action-figure-concrete-jungle-stone-heart-predator",
    ],
  },
  {
    id: "alpha",
    name: "Alpha Predator",
    work: "Predator: Hunting Grounds",
    year: 2020,
    media: "video-game",
    continuity: "expanded",
    bodyMorphId: "classic",
    skinId: "ashen-mottle",
    biomaskId: "feral",
    dreadStyleId: "feral",
    dreadTintId: "ashen",
    armorStyleId: "feral",
    armorTintId: "bronze",
    trophyAdornmentId: "skull-spine",
    recommendedArmorId: "scout",
    signatureWeaponIds: ["wristblades", "combistick", "smart-disc"],
    signatureGearIds: ["snare"],
    description:
      "Le chasseur mythique de Hunting Grounds, conçu autour d'un masque osseux et d'une armure primitive de fondateur.",
    fidelityNote:
      "Son histoire d'origine est du contenu étendu licencié ; le masque feral est le parent modulaire de son crâne sculpté.",
    sourceUrls: [
      "https://blog.playstation.com/2020/07/17/july-free-update-comes-to-predator-hunting-grounds/",
      "https://necaonline.com/2020/01/predator-7-scale-action-figure-ultimate-alpha-predator-100th-edition-figure/",
    ],
  },
  {
    id: "samurai",
    name: "Samurai Predator",
    work: "Predator: Hunting Grounds",
    year: 2020,
    media: "video-game",
    continuity: "expanded",
    bodyMorphId: "classic",
    skinId: "ochre-mottle",
    biomaskId: "celtic",
    dreadStyleId: "temple",
    dreadTintId: "obsidian",
    armorStyleId: "avp",
    armorTintId: "bronze",
    trophyAdornmentId: "none",
    recommendedArmorId: "hunter",
    signatureWeaponIds: ["wristblades", "combistick", "plasma-caster"],
    signatureGearIds: ["snare"],
    description:
      "Une variante de duel inspirée du samouraï, avec kabuto Yautja, plaques lamellaires et longues lames de contact.",
    fidelityNote:
      "Le masque celtic et l'armure avp servent de base au kabuto ; les ornements japonais restent à illustrer séparément.",
    sourceUrls: [
      "https://blog.playstation.com/2020/06/30/the-samurai-predator-arrives-in-predator-hunting-grounds/",
    ],
  },
  {
    id: "valkyrie",
    name: "Valkyrie Predator",
    work: "Predator: Hunting Grounds",
    year: 2021,
    media: "video-game",
    continuity: "expanded",
    bodyMorphId: "huntress",
    skinId: "ashen-mottle",
    biomaskId: "elder",
    dreadStyleId: "huntress",
    dreadTintId: "obsidian",
    armorStyleId: "avp",
    armorTintId: "gunmetal",
    trophyAdornmentId: "none",
    recommendedArmorId: "scout",
    signatureWeaponIds: ["wristblades", "combistick"],
    signatureGearIds: ["motion-sensor", "snare"],
    description:
      "Une chasseuse rapide aux plaques nordiques et au masque ailé, bâtie pour fondre sur une cible puis rompre le contact.",
    fidelityNote:
      "Le biomask elder n'est qu'une base pour sa couronne ailée ; le morph huntress ne sexualise pas sa silhouette de combat.",
    sourceUrls: [
      "https://blog.playstation.com/2021/02/16/new-year-new-mode-new-content-for-predator-hunting-grounds/",
    ],
  },
  {
    id: "cleopatra",
    name: "Cleopatra Predator",
    work: "Predator: Hunting Grounds",
    year: 2021,
    media: "video-game",
    continuity: "expanded",
    bodyMorphId: "huntress",
    skinId: "ochre-mottle",
    biomaskId: "elder",
    dreadStyleId: "huntress",
    dreadTintId: "obsidian",
    armorStyleId: "avp",
    armorTintId: "bronze",
    trophyAdornmentId: "skull-spine",
    recommendedArmorId: "hunter",
    signatureWeaponIds: ["combistick", "plasma-caster", "smart-disc"],
    signatureGearIds: ["netgun"],
    description:
      "Une Elder Huntress à l'esthétique pharaonique, richement dorée et associée à une longue histoire de chasses sur Terre.",
    fidelityNote:
      "La couronne de son biomask et ses glyphes demandent un sprite dédié ; la palette bronze conserve sa lecture royale.",
    sourceUrls: [
      "https://blog.playstation.com/2021/08/31/become-the-fearsome-cleopatra-with-this-months-new-additions-to-predator-hunting-grounds/",
    ],
  },
  {
    id: "bionic",
    name: "Bionic Predator",
    work: "Predator: Hunting Grounds",
    year: 2022,
    media: "video-game",
    continuity: "expanded",
    bodyMorphId: "super",
    skinId: "dark-mottle",
    biomaskId: null,
    dreadStyleId: "veteran",
    dreadTintId: "obsidian",
    armorStyleId: "super",
    armorTintId: "gunmetal",
    trophyAdornmentId: "none",
    recommendedArmorId: "berserker",
    signatureWeaponIds: ["wristblades", "plasma-caster"],
    signatureGearIds: ["motion-sensor"],
    description:
      "Un vétéran presque reconstruit par la technologie, dont les implants métalliques composent une silhouette lourde et asymétrique.",
    fidelityNote:
      "Le renderer n'a pas encore de membres bioniques ; le choix sans biomask préserve au moins sa tête augmentée visible.",
    sourceUrls: [
      "https://forum.predator.illfonic.com/t/patch-notes-2-42/28894",
    ],
  },
  {
    id: "witch",
    name: "Witch Predator",
    work: "Predator: Hunting Grounds",
    year: 2024,
    media: "video-game",
    continuity: "expanded",
    bodyMorphId: "huntress",
    skinId: "dark-mottle",
    biomaskId: "feral",
    dreadStyleId: "huntress",
    dreadTintId: "obsidian",
    armorStyleId: "feral",
    armorTintId: "obsidian",
    trophyAdornmentId: "skull-spine",
    recommendedArmorId: "scout",
    signatureWeaponIds: ["wristblades", "yautja-bow"],
    signatureGearIds: ["motion-sensor", "snare"],
    description:
      "Une chasseuse rituelle sombre, parée d'os et de trophées, pensée pour la furtivité et la terreur à longue portée.",
    fidelityNote:
      "Le masque feral et l'ornement de trophée synthétisent son équipement osseux sans lui attribuer de pouvoirs surnaturels.",
    sourceUrls: [
      "https://forum.predator.illfonic.com/t/the-witch-predator-has-arrived/36352",
    ],
  },
  {
    id: "broken-tusk",
    name: "Broken Tusk / Dachande",
    work: "Aliens vs. Predator",
    year: 1989,
    media: "comic",
    continuity: "expanded",
    bodyMorphId: "classic",
    skinId: "ochre-mottle",
    biomaskId: "scar",
    dreadStyleId: "ringed",
    dreadTintId: "obsidian",
    armorStyleId: "avp",
    armorTintId: "bronze",
    trophyAdornmentId: "skull-spine",
    recommendedArmorId: "hunter",
    signatureWeaponIds: ["wristblades", "combistick", "plasma-caster"],
    signatureGearIds: ["motion-sensor"],
    description:
      "Le vétéran du comic AVP original, masque doré marqué d'un éclair et armure lourde ornée de carapace xénomorphe.",
    fidelityNote:
      "Le plasmacaster représente son Burner portatif ; l'armure actuelle ne possède pas encore son plastron vert à tête de Xénomorphe.",
    sourceUrls: [
      "https://digital.darkhorse.com/books/47483ce0aec5466783599e38c9d0ac47/aliens-vs-predator-the-original-comics-series-30th-anniversary-edition",
      "https://necaonline.com/2017/06/predator-7-scale-action-figures-series-18-assortment/",
    ],
  },
  {
    id: "ahab",
    name: "Ahab",
    work: "Predator: Fire and Stone",
    year: 2014,
    media: "comic",
    continuity: "expanded",
    bodyMorphId: "elder",
    skinId: "ochre-mottle",
    biomaskId: "elder",
    dreadStyleId: "veteran",
    dreadTintId: "obsidian",
    armorStyleId: "classic",
    armorTintId: "bronze",
    trophyAdornmentId: "skull-spine",
    recommendedArmorId: "hunter",
    signatureWeaponIds: ["combistick", "plasma-caster", "smart-disc"],
    signatureGearIds: ["motion-sensor", "snare"],
    description:
      "L'Elder borgne obsédé par la chasse aux Engineers, couvert de cicatrices, de plaques disparates et de trophées antiques.",
    fidelityNote:
      "Son fusil d'Engineer et sa mandible mutilée ne sont pas encore des modules ; le preset conserve son âge et son équipement patchwork.",
    sourceUrls: [
      "https://necaonline.com/2017/05/predator-7-scale-action-figure-ultimate-ahab-predator/",
    ],
  },
  {
    id: "big-mama",
    name: "Big Mama",
    work: "Aliens vs. Predator: Deadliest of the Species",
    year: 1993,
    media: "comic",
    continuity: "expanded",
    bodyMorphId: "huntress",
    skinId: "dark-mottle",
    biomaskId: "city",
    dreadStyleId: "huntress",
    dreadTintId: "obsidian",
    armorStyleId: "classic",
    armorTintId: "bronze",
    trophyAdornmentId: "none",
    recommendedArmorId: "berserker",
    signatureWeaponIds: ["wristblades", "combistick", "plasma-caster"],
    signatureGearIds: ["netgun"],
    description:
      "La grande chasseuse de Deadliest of the Species, puissante et non sexualisée, avec une présence comparable aux Yautja mâles.",
    fidelityNote:
      "Ses biomasks varient dans le récit ; city fournit une silhouette neutre et le morph huntress évite tout dimorphisme inventé.",
    sourceUrls: [
      "https://www.comics.org/issue/172977/",
      "https://avp.fandom.com/wiki/Big_Mama",
    ],
  },
  {
    id: "enforcer",
    name: "Enforcer Predator",
    work: "Predator: Bad Blood",
    year: 1993,
    media: "comic",
    continuity: "expanded",
    bodyMorphId: "super",
    skinId: "ochre-mottle",
    biomaskId: "enforcer",
    dreadStyleId: "veteran",
    dreadTintId: "umber",
    armorStyleId: "city",
    armorTintId: "gunmetal",
    trophyAdornmentId: "none",
    recommendedArmorId: "berserker",
    signatureWeaponIds: [
      "wristblades",
      "combistick",
      "plasma-caster",
      "smart-disc",
    ],
    signatureGearIds: ["motion-sensor"],
    description:
      "L'immense agent chargé d'abattre un Bad Blood, armuré d'argent sombre et coiffé d'un biomask à haute lame centrale.",
    fidelityNote:
      "Le preset enforcer est la traduction directe de sa crête ; le speargun de poignet reste hors de l'arsenal courant.",
    sourceUrls: [
      "https://necaonline.com/2014/08/closer-look-enforcer-predator-action-figure-from-series-12/",
    ],
  },
  {
    id: "bad-blood-comic",
    name: "Bad Blood",
    work: "Predator: Bad Blood",
    year: 1993,
    media: "comic",
    continuity: "expanded",
    bodyMorphId: "classic",
    skinId: "dark-mottle",
    biomaskId: "enforcer",
    dreadStyleId: "feral",
    dreadTintId: "obsidian",
    armorStyleId: "city",
    armorTintId: "obsidian",
    trophyAdornmentId: "skull-spine",
    recommendedArmorId: "berserker",
    signatureWeaponIds: ["wristblades", "combistick", "smart-disc"],
    signatureGearIds: ["snare"],
    description:
      "Le renégat du New Jersey, silhouette barbare couverte d'os, de têtes et de trophées pris sans respect du code de chasse.",
    fidelityNote:
      "L'identifiant désigne cet individu du comic, pas tous les Yautja déshonorés ; sa grande épée n'a pas encore d'équivalent exact.",
    sourceUrls: [
      "https://store.necaonline.com/blogs/behind-the-scenes/closer-look-predator-bad-blood-deluxe-7-scale-action-figure",
      "https://www.marvel.com/comics/collection/92869/predator_the_original_years_omnibus_vol_1_hardcover",
    ],
  },
  {
    id: "hashori",
    name: "Hashori",
    work: "Predator: Incursion",
    year: 2015,
    media: "novel",
    continuity: "expanded",
    bodyMorphId: "huntress",
    skinId: "dark-mottle",
    biomaskId: null,
    dreadStyleId: "huntress",
    dreadTintId: "obsidian",
    armorStyleId: "classic",
    armorTintId: "bronze",
    trophyAdornmentId: "skull-spine",
    recommendedArmorId: "berserker",
    signatureWeaponIds: ["wristblades", "combistick", "plasma-caster"],
    signatureGearIds: ["snare"],
    description:
      "La cheffe de clan géante de la trilogie Rage War, décrite comme massivement musclée et couverte de vieilles cicatrices.",
    fidelityNote:
      "Le roman ne fixe ni peau, ni biomask, ni dreads : couleurs et armure sont une interprétation originale explicitement non canonique.",
    sourceUrls: [
      "https://titanbooks.com/8140-predator-incursion-the-rage-war-1/",
      "https://avp.fandom.com/wiki/Hashori",
    ],
    textInterpretation: true,
  },
] as const satisfies readonly HunterPresetDefinition[];

export const HUNTER_FILM_PLATE_ROOT = "/game/sprites/v5/film-plates";

export const HUNTER_FILM_PRESETS = HUNTER_PRESETS.filter(
  (preset) => preset.media === "film" || preset.media === "animated-film",
);

export const HUNTER_EXPANDED_PRESETS = HUNTER_PRESETS.filter(
  (preset) => preset.media !== "film" && preset.media !== "animated-film",
);

export const HUNTER_FILM_GROUPS = Object.freeze(
  Array.from(
    HUNTER_FILM_PRESETS.reduce((groups, preset) => {
      const group = groups.get(preset.work) ?? [];
      group.push(preset);
      groups.set(preset.work, group);
      return groups;
    }, new Map<string, (typeof HUNTER_FILM_PRESETS)[number][]>()),
    ([work, presets]) => ({
      work,
      year: Math.min(...presets.map((preset) => preset.year)),
      presets: Object.freeze(presets),
    }),
  ),
);

export function hunterFilmPlatePath(
  preset: Pick<HunterPresetDefinition, "id" | "media">,
): string | null {
  if (preset.media !== "film" && preset.media !== "animated-film") return null;
  return `${HUNTER_FILM_PLATE_ROOT}/${preset.id}.png`;
}

export const HUNTER_PRESET_BY_ID = Object.freeze(
  Object.fromEntries(HUNTER_PRESETS.map((preset) => [preset.id, preset])),
) as unknown as Readonly<
  Record<HunterLorePresetId, HunterPresetDefinition>
>;

/**
 * Produces a fresh serializable appearance object for save data and previews.
 * "custom" is intentionally excluded because it has no authoritative preset.
 */
export function appearanceForPreset(
  presetId: HunterLorePresetId,
): HunterAppearance {
  const preset = HUNTER_PRESET_BY_ID[presetId];

  return {
    presetId: preset.id,
    bodyMorphId: preset.bodyMorphId,
    skinId: preset.skinId,
    biomaskId: preset.biomaskId,
    dreadStyleId: preset.dreadStyleId,
    dreadTintId: preset.dreadTintId,
    armorStyleId: preset.armorStyleId,
    armorTintId: preset.armorTintId,
    trophyAdornmentId: preset.trophyAdornmentId,
  };
}
