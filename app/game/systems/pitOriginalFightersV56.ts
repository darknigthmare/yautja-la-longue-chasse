import type { PitEditionFighterDefinition, PitEditionMoveDefinition, PitEditionTechniqueDefinition } from './pitFirstEdition';

/** Three supplied identities, never aliases of a canon hunter or companion variants. */
export const PIT_ORIGINAL_FIGHTER_IDS_V56 = ['original-arid-ermit-yautja', 'original-mutated-yautja', 'guest-amengi-female'] as const;
export type PitOriginalFighterIdV56 = typeof PIT_ORIGINAL_FIGHTER_IDS_V56[number];
export type PitOriginalFighterDefinitionV56 = Omit<PitEditionFighterDefinition, 'id' | 'rivalId'> & {
  readonly id: PitOriginalFighterIdV56;
  readonly rivalId: null;
  readonly progressionAvailable: false;
  readonly canonicalIdentityVerified: false;
  readonly gameplayAdaptation: 'authored-original-contact-duel';
  readonly visualStatus: 'single-static-cutout';
  readonly nativeAnimationClips: 0;
  readonly canCloak: false;
};

export function isPitOriginalFighterIdV56(id: unknown): id is PitOriginalFighterIdV56 {
  return typeof id === 'string' && (PIT_ORIGINAL_FIGHTER_IDS_V56 as readonly string[]).includes(id);
}

type MoveValues = readonly [number, number, number, number, number, number, number, number, number];
function move(kind: PitEditionMoveDefinition['kind'], label: string, values: MoveValues, low = false): PitEditionMoveDefinition {
  const [startup, active, recovery, damage, hitstun, blockstun, range, height, pushback] = values;
  return { kind, label, startup, active, recovery, damage, chipDamage: kind === 'heavy' ? Math.ceil(damage * .06) : 0,
    hitstun, blockstun, range, height, pushback, hitLevel: low ? 'low' : kind === 'light' ? 'high' : 'mid',
    knockdown: kind === 'heavy', antiAir: false, launchY: 0 };
}

/** Attached physical contact uses the engine's shoulder impact, with no projectile or invented gear. */
function bodyContact(id: string, values: Partial<PitEditionTechniqueDefinition>): PitEditionTechniqueDefinition {
  return { id, device: 'shoulder', contactEffect: 'strike', motion: 'attached', trigger: 'contact', lifetimeFrames: 8,
    armFrames: 0, speed: 0, returnFrame: null, width: 58, height: 48, verticalOffset: 24,
    damageScale: 1, chipScale: 0, hitstunBonus: 0, blockstunBonus: 0, pushbackScale: 1,
    guardBreak: false, knockdown: false, ownerDashSpeed: 0, maxHits: 1, rehitFrames: 0,
    status: null, statusFrames: 0, movementScale: 1, jumpLocked: false, cloakLocked: true, ...values };
}

const LIMITS = { selectable: true, runtimeStatus: 'authored', rivalId: null, progressionAvailable: false,
  canonicalIdentityVerified: false, gameplayAdaptation: 'authored-original-contact-duel',
  visualStatus: 'single-static-cutout', nativeAnimationClips: 0, canCloak: false,
  continuity: 'expanded', arcadeEnding: 'Personnage fourni pour le duel libre. Aucune campagne, fin Arcade, récompense ou rencontre de chasse ajoutée.' } as const;

export const PIT_ORIGINAL_FIGHTERS_V56: Readonly<Record<PitOriginalFighterIdV56, PitOriginalFighterDefinitionV56>> = {
  'original-arid-ermit-yautja': {
    ...LIMITS, id: 'original-arid-ermit-yautja', name: 'Arid Ermit Yautja', epithet: 'Création utilisateur · riposte de contact',
    sourcePresetId: 'original-arid-ermit-yautja', sourceWork: 'Pack utilisateur V56 · Arid Ermit Yautja.png · création originale du projet',
    archetype: 'punisher', difficulty: 3, maxHealth: 930, walkSpeed: 4.85, airSpeed: 3.2, jumpSpeed: 12.6,
    power: .98, bodyWidth: 46, bodyHeight: 125, crouchHeight: 76,
    palette: { primary: '#b9a58d', secondary: '#372e27', accent: '#e2d2ad' },
    attacks: {
      light: move('light', 'Contact bref — adaptation', [5, 3, 10, 51, 15, 8, 60, 36, 13]),
      medium: move('medium', 'Allonge mesurée — adaptation', [9, 4, 17, 79, 21, 12, 92, 44, 20]),
      heavy: move('heavy', 'Heurt d’appui — adaptation', [17, 5, 27, 116, 30, 18, 65, 48, 31]),
      technique: move('technique', 'Riposte rapprochée — adaptation', [7, 15, 26, 76, 25, 12, 56, 46, 25]),
    },
    technique: bodyContact('arid-contact-riposte-v56', { trigger: 'counter', lifetimeFrames: 15, width: 56, height: 48, hitstunBonus: 2 }),
    arcadeIntro: 'Nom et dessin originaux fournis par le joueur. Aucun clan, âge, équipement ou biographie canonique déduit de son apparence. Profil de riposte créé pour THE PIT, sans camouflage. Une pose détourée ; déplacements et impacts de simulation, aucune planche d’animation native.',
  },
  'original-mutated-yautja': {
    ...LIMITS, id: 'original-mutated-yautja', name: 'Yautja Mutated', epithet: 'Création utilisateur · pression corporelle',
    sourcePresetId: 'original-mutated-yautja', sourceWork: 'Pack utilisateur V56 · Yautja Mutated.png · création originale du projet',
    archetype: 'bruiser', difficulty: 2, maxHealth: 1080, walkSpeed: 4.05, airSpeed: 2.7, jumpSpeed: 11.7,
    power: 1.04, bodyWidth: 59, bodyHeight: 130, crouchHeight: 82,
    palette: { primary: '#a8624b', secondary: '#41271f', accent: '#e1ac83' },
    attacks: {
      light: move('light', 'Contact lourd — adaptation', [7, 3, 12, 61, 17, 9, 58, 42, 18]),
      medium: move('medium', 'Poussée de contact — adaptation', [11, 4, 19, 89, 24, 13, 80, 50, 26]),
      heavy: move('heavy', 'Heurt massif — adaptation', [19, 6, 30, 139, 34, 20, 74, 56, 41]),
      technique: move('technique', 'Percussion corporelle — adaptation', [15, 7, 29, 108, 28, 17, 64, 58, 38]),
    },
    technique: bodyContact('mutated-body-impact-v56', { lifetimeFrames: 7, width: 64, height: 58, ownerDashSpeed: 5.3, knockdown: true, pushbackScale: 1.1 }),
    arcadeIntro: 'Nom exact et dessin originaux fournis par le joueur. La cause de mutation et les capacités biologiques ne sont pas établies. Pression lente au contact créée pour THE PIT, sans régénération, projectile ni camouflage. Une pose détourée, aucune animation native de coup ou de marche.',
  },
  'guest-amengi-female': {
    ...LIMITS, id: 'guest-amengi-female', name: 'Amengi female', epithet: 'Adversaire fourni · allonge insectoïde',
    sourcePresetId: 'guest-amengi-female', sourceWork: 'Pack utilisateur V56 · Amengi female.png · attribution utilisateur, design non certifié',
    archetype: 'reach', difficulty: 4, maxHealth: 970, walkSpeed: 4.45, airSpeed: 3.05, jumpSpeed: 12.1,
    power: .99, bodyWidth: 54, bodyHeight: 122, crouchHeight: 70,
    palette: { primary: '#974a35', secondary: '#36251e', accent: '#dcb04f' },
    attacks: {
      light: move('light', 'Contact des griffes — adaptation', [6, 3, 12, 50, 16, 8, 72, 38, 14]),
      medium: move('medium', 'Allonge des griffes — adaptation', [12, 4, 23, 83, 23, 14, 108, 42, 22]),
      heavy: move('heavy', 'Balayage appuyé — adaptation', [20, 5, 31, 121, 31, 19, 93, 30, 33], true),
      technique: move('technique', 'Balayage de contact — adaptation', [16, 6, 30, 92, 27, 16, 101, 26, 28], true),
    },
    technique: bodyContact('amengi-ground-contact-v56', { lifetimeFrames: 6, width: 101, height: 26, verticalOffset: 3, knockdown: true }),
    arcadeIntro: 'Amengi female est l’intitulé du fichier fourni : ni le design ni cette identité individuelle ne sont certifiés canoniques. Adversaire insectoïde distinct, avec allonge et balayage de contact adaptés au duel ; aucun équipement Yautja, camouflage ou projectile. Une pose fixe détourée, aucune locomotion native ni rencontre de campagne annoncée.',
  },
};
