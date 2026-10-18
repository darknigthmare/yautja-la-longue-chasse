import type { PitAttackDefinition, PitAttackKind, PitFighterDefinition } from './pitCombat';
import type { PitEditionTechniqueDefinition } from './pitFirstEdition';

/** These are authored duel rules. Sources establish equipment, not these frame
 * data, hitboxes, counter choreography or a certified 1:1 combat kit. */
export type PitAuthoredMovesetIdV92 = 'ahab-spear-contact-v92' | 'samurai-katana-contact-v92';
export interface PitAuthoredMovesetV92 {
  readonly id: PitAuthoredMovesetIdV92;
  readonly fighterId: 'user-ahab' | 'user-samurai';
  readonly variantIds: readonly string[];
  readonly equipment: 'spear' | 'katana';
  readonly title: string;
  readonly sourceUrl: string;
  readonly sourceScope: string;
  readonly limitation: string;
  readonly certifiedOneToOne: false;
  readonly attacks: Record<PitAttackKind, PitAttackDefinition>;
  readonly technique: PitEditionTechniqueDefinition;
  readonly walkSpeed: number;
  readonly airSpeed: number;
}

function strike(kind: PitAttackKind, label: string, startup: number, active: number, recovery: number,
  damage: number, range: number, height: number, hitLevel: PitAttackDefinition['hitLevel'],
  options: Partial<PitAttackDefinition> = {}): PitAttackDefinition {
  return { kind, label: label + ' · adaptation', startup, active, recovery, damage,
    chipDamage: kind === 'heavy' ? Math.ceil(damage * .06) : 0,
    hitstun: kind === 'light' ? 15 : kind === 'medium' ? 22 : 29,
    blockstun: kind === 'light' ? 8 : kind === 'medium' ? 12 : 16,
    range, height, hitLevel, pushback: kind === 'light' ? 12 : kind === 'medium' ? 24 : 35,
    knockdown: false, antiAir: false, launchY: 0, ...options };
}
const contact: PitEditionTechniqueDefinition = {
  id: '', device: 'spear', contactEffect: 'strike', motion: 'attached', trigger: 'contact',
  lifetimeFrames: 4, armFrames: 0, speed: 0, returnFrame: null, width: 140, height: 26,
  verticalOffset: 78, damageScale: 1, chipScale: 1, hitstunBonus: 0, blockstunBonus: 0,
  pushbackScale: 1, guardBreak: false, knockdown: false, ownerDashSpeed: 0, maxHits: 1,
  rehitFrames: 0, status: null, statusFrames: 0, movementScale: 1,
  jumpLocked: false, cloakLocked: false,
};

export const PIT_AUTHORED_MOVESETS_V92: Readonly<Record<PitAuthoredMovesetIdV92, PitAuthoredMovesetV92>> = {
  'ahab-spear-contact-v92': {
    id: 'ahab-spear-contact-v92', fighterId: 'user-ahab',
    variantIds: ['ahab-avec-casque-0c8ceb1c95', 'ahab-sans-casque-91544a7fb2'],
    equipment: 'spear', title: 'Lance d’Ahab · contrôle de distance',
    sourceUrl: 'https://store.necaonline.com/blogs/news/shipping-this-week-ultimate-ahab-ultimate-dream-sequence-jason-and-chucky-thanos-groot-head-knockers-1',
    sourceScope: 'NECA, version Ultimate issue des comics : présence de la lance et du gantelet.',
    limitation: 'Estocs, balayage et timings originaux de THE PIT. Aucun tir d’Engineer Gun, onde, pouvoir ou lance autonome. Les actions non couvertes par des clips admis gardent leur repli visuel signalé.',
    certifiedOneToOne: false, walkSpeed: 3.45, airSpeed: 2.85,
    attacks: {
      light: strike('light', 'Coup court au manche', 7, 3, 13, 52, 78, 34, 'high'),
      medium: strike('medium', 'Estoc de lance', 11, 3, 20, 84, 132, 28, 'mid'),
      heavy: strike('heavy', 'Balayage bas à la lance', 18, 4, 29, 110, 116, 25, 'low', { knockdown: true }),
      technique: strike('technique', 'Estoc engagé de lance', 16, 4, 28, 104, 140, 26, 'mid', { chipDamage: 6, pushback: 38 }),
    },
    technique: { ...contact, id: 'ahab-spear-contact-v92' },
  },
  'samurai-katana-contact-v92': {
    id: 'samurai-katana-contact-v92', fighterId: 'user-samurai',
    variantIds: ['samurai-avec-casque-d75f93b15e', 'samurai-sans-casque-fe1ba25104'],
    equipment: 'katana', title: 'Katana de Samurai PHG · taille et riposte',
    sourceUrl: 'https://blog.fr.playstation.com/2020/06/30/le-predator-samourai-rejoint-predator-hunting-grounds/',
    sourceScope: 'Jordan Mathewson, IllFonic / PlayStation : Samurai PHG et Predator Katana. Ce n’est pas Oni.',
    limitation: 'Tailles, contre de contact et timings originaux de THE PIT. Aucune technique empruntée à Oni, téléportation ou projectile. Les actions non couvertes par des clips admis gardent leur repli visuel signalé.',
    certifiedOneToOne: false, walkSpeed: 4.15, airSpeed: 3.4,
    attacks: {
      light: strike('light', 'Taille courte au katana', 5, 2, 10, 48, 80, 35, 'high'),
      medium: strike('medium', 'Taille transversale au katana', 9, 3, 17, 78, 104, 44, 'mid'),
      heavy: strike('heavy', 'Taille descendante au katana', 16, 3, 28, 118, 94, 66, 'high', { knockdown: true }),
      technique: strike('technique', 'Riposte rapprochée au katana', 6, 8, 26, 88, 82, 64, 'mid', { chipDamage: 0, hitstun: 27, pushback: 26 }),
    },
    technique: { ...contact, id: 'samurai-katana-contact-v92', device: 'counter-blade', trigger: 'counter',
      lifetimeFrames: 8, width: 82, height: 64, verticalOffset: 30, chipScale: 0 },
  },
};

export function getPitAuthoredMovesetV92(fighterId: string, variantId?: string | null): PitAuthoredMovesetV92 | null {
  if (typeof variantId !== 'string') return null;
  return Object.values(PIT_AUTHORED_MOVESETS_V92).find(profile => profile.fighterId === fighterId &&
    profile.variantIds.includes(variantId)) ?? null;
}

export function applyPitAuthoredMovesetV92(base: PitFighterDefinition, id: PitAuthoredMovesetIdV92): PitFighterDefinition {
  const profile = PIT_AUTHORED_MOVESETS_V92[id];
  return { ...base, epithet: profile.title, walkSpeed: profile.walkSpeed, airSpeed: profile.airSpeed,
    attacks: profile.attacks, technique: profile.technique };
}
