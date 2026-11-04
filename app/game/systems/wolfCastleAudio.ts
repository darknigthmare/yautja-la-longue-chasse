import type { SceneAudioPort, SceneAudioSound } from './sceneAudio';
import { WOLF_CASTLE_WORLD, wolfCastleActiveCombat,
  type WolfCastleAction, type WolfCastlePoint, type WolfCastleRoomId, type WolfCastleVisit } from './wolfCastle';
import type { WolfCastleCombatEvent, WolfCastleCombatState } from './wolfCastleCombat';

/** Original synth effects: no film samples and no separate audio context or mix. */
export const WOLF_CASTLE_SOUND_CUES = {
  begin: { tones: [{ frequency: 110, endFrequency: 165, duration: .26, gain: .055 }, { frequency: 220, duration: .2, delay: .12, gain: .035 }] },
  attack: { noises: [{ duration: .13, filterFrequency: 1_700, endFilterFrequency: 600, gain: .055 }] },
  hit: { tones: [{ frequency: 150, endFrequency: 55, duration: .13, gain: .095 }], noises: [{ duration: .11, filterFrequency: 700, endFilterFrequency: 240, gain: .07 }] },
  miss: { noises: [{ duration: .09, filterFrequency: 1_100, endFilterFrequency: 500, gain: .025 }] },
  parry: { tones: [{ frequency: 790, endFrequency: 540, duration: .19, gain: .065, type: 'triangle' }, { frequency: 1_120, duration: .12, gain: .025 }], noises: [{ duration: .06, filterFrequency: 2_300, gain: .05 }] },
  evade: { noises: [{ duration: .19, filterFrequency: 800, endFilterFrequency: 300, gain: .045 }] },
  hurt: { tones: [{ frequency: 88, endFrequency: 43, duration: .2, gain: .09 }], noises: [{ duration: .17, filterType: 'lowpass', filterFrequency: 460, gain: .075 }] },
  exhausted: { tones: [{ frequency: 95, endFrequency: 76, duration: .13, gain: .035 }] },
  intermission: { tones: [{ frequency: 165, duration: .35, gain: .05 }, { frequency: 220, duration: .32, delay: .13, gain: .04 }] },
  victory: { tones: [{ frequency: 132, duration: .65, gain: .06 }, { frequency: 198, duration: .55, delay: .13, gain: .045 }, { frequency: 264, duration: .5, delay: .26, gain: .035 }] },
  defeat: { tones: [{ frequency: 120, endFrequency: 60, duration: .45, gain: .055 }, { frequency: 90, endFrequency: 45, duration: .4, delay: .15, gain: .035 }] },
  abandoned: { tones: [{ frequency: 150, endFrequency: 100, duration: .16, gain: .025 }] },
  'thrust-warning': { tones: [{ frequency: 460, endFrequency: 520, duration: .12, gain: .04 }] },
  'sweep-warning': { tones: [{ frequency: 125, endFrequency: 100, duration: .13, gain: .045 }, { frequency: 125, endFrequency: 100, duration: .13, delay: .18, gain: .04 }] },
} as const satisfies Record<WolfCastleCombatEvent | 'thrust-warning' | 'sweep-warning', SceneAudioSound>;

/** Quiet, original room interactions share the existing effects bus. */
export const WOLF_CASTLE_EXPLORATION_CUES = {
  'step-stone': { tones: [{ frequency: 92, endFrequency: 47, duration: .075, gain: .025 }], noises: [{ duration: .065, filterType: 'lowpass', filterFrequency: 520, endFilterFrequency: 180, gain: .026 }] },
  'step-metal': { tones: [{ frequency: 158, endFrequency: 96, duration: .095, gain: .021, type: 'triangle' }], noises: [{ duration: .075, filterFrequency: 1_150, endFilterFrequency: 390, gain: .023 }] },
  door: { tones: [{ frequency: 88, endFrequency: 57, duration: .3, gain: .028, type: 'triangle' }], noises: [{ duration: .36, filterFrequency: 740, endFilterFrequency: 190, gain: .038 }] },
  audience: { tones: [{ frequency: 123.6, duration: .48, gain: .033 }, { frequency: 185.4, duration: .38, delay: .1, gain: .024 }] },
  archive: { tones: [{ frequency: 410, endFrequency: 615, duration: .12, gain: .026 }, { frequency: 820, duration: .16, delay: .1, gain: .016 }] },
  'trial-begin': { tones: [{ frequency: 164.8, duration: .22, gain: .03 }, { frequency: 247.2, duration: .26, delay: .12, gain: .022 }] },
  seal: { tones: [{ frequency: 247.2, endFrequency: 329.6, duration: .25, gain: .034 }, { frequency: 494.4, duration: .35, delay: .08, gain: .019 }] },
  'seal-reset': { tones: [{ frequency: 164.8, endFrequency: 82.4, duration: .25, gain: .028 }] },
  'trial-complete': { tones: [{ frequency: 164.8, duration: .45, gain: .032 }, { frequency: 247.2, duration: .4, delay: .1, gain: .025 }, { frequency: 329.6, duration: .45, delay: .2, gain: .02 }] },
  'mandate-complete': { tones: [{ frequency: 206, duration: .5, gain: .032 }, { frequency: 309, duration: .45, delay: .14, gain: .024 }, { frequency: 412, duration: .5, delay: .28, gain: .018 }] },
} as const satisfies Record<string, SceneAudioSound>;

const AMBIENCES = {
  orbit: { tones: [{ frequency: 38, gain: .035 }], noises: [{ filterType: 'lowpass', filterFrequency: 180, gain: .016 }] },
  berth: { tones: [{ frequency: 45, gain: .032, type: 'triangle', filterFrequency: 250 }], noises: [{ filterType: 'lowpass', filterFrequency: 310, gain: .025 }] },
  gallery: { tones: [{ frequency: 55, gain: .025 }, { frequency: 82.5, gain: .012 }], noises: [{ filterFrequency: 420, gain: .012 }] },
  audience: { tones: [{ frequency: 41.2, gain: .035 }, { frequency: 61.8, gain: .018 }, { frequency: 123.6, gain: .009 }], noises: [{ filterType: 'lowpass', filterFrequency: 230, gain: .012 }] },
  court: { tones: [{ frequency: 49, gain: .025 }, { frequency: 73.5, gain: .012 }], noises: [{ filterFrequency: 560, gain: .018 }] },
  service: { tones: [{ frequency: 60, gain: .02, type: 'triangle', filterFrequency: 200 }], noises: [{ filterType: 'lowpass', filterFrequency: 500, gain: .022 }] },
} as const satisfies Record<string, SceneAudioSound>;

const ROOM_AMBIENCE: Readonly<Record<WolfCastleRoomId, keyof typeof AMBIENCES>> = {
  'royal-berth': 'berth', 'royal-airlock': 'berth', 'royal-vestibule': 'gallery',
  'royal-gallery': 'gallery', 'royal-audience': 'audience', 'royal-council': 'audience',
  'royal-archives': 'gallery', 'royal-court': 'court', 'royal-service-pass': 'service',
};

export function wolfCastleAmbience(visit: Pick<WolfCastleVisit, 'status' | 'roomId'>) {
  const key = visit.status === 'approach' ? 'orbit' : ROOM_AMBIENCE[visit.roomId];
  return { key: `wolf:${key}`, sound: AMBIENCES[key] };
}

const cursor = (visit: WolfCastleVisit, combat: WolfCastleCombatState | null) => ({
  owner: visit.ownerCreatedAt,
  ship: visit.personalShipId,
  room: visit.roomId,
  aboard: visit.status === 'aboard',
  round: combat ? `${combat.scenario ?? 'training'}:${combat.attempt}:${combat.encounterIndex}` : null,
  fighting: combat?.status === 'active' || combat?.status === 'intermission',
  elapsedMs: combat?.elapsedMs ?? 0,
  sequence: combat?.event.sequence ?? -1,
  enemySequence: combat?.enemy.sequence ?? -1,
});

function confirmedCue(before: WolfCastleVisit, action: WolfCastleAction, after: WolfCastleVisit): SceneAudioSound | null {
  const cues = WOLF_CASTLE_EXPLORATION_CUES;
  switch (action.type) {
    case 'board': return before.status === 'approach' && after.status === 'aboard' ? cues.door : null;
    case 'move-room': return before.status === 'aboard' && after.status === 'aboard' && before.roomId !== after.roomId && after.roomId === action.roomId ? cues.door : null;
    case 'hear-audience': return before.audience === 'unheard' && after.audience === 'pending' ? cues.audience : null;
    case 'decide-audience': return before.audience !== after.audience && after.audience === action.decision ? cues.audience : null;
    case 'read-archive': return !before.archiveRead && after.archiveRead ? cues.archive : null;
    case 'accept-dungeon': return before.dungeon?.status !== after.dungeon?.status && ['accepted', 'ready'].includes(after.dungeon?.status ?? '') ? cues.audience : null;
    case 'inspect-dungeon-archive': return !before.dungeon?.objectives.archives && after.dungeon?.objectives.archives ? cues.archive : null;
    case 'inspect-dungeon-gallery': return !before.dungeon?.objectives.gallery && after.dungeon?.objectives.gallery ? cues.archive : null;
    case 'inspect-dungeon-council': return !before.dungeon?.objectives.council && after.dungeon?.objectives.council ? cues.archive : null;
    case 'extract-dungeon': return !before.dungeon?.reward.claimed && after.dungeon?.reward.claimed ? cues['mandate-complete'] : null;
    case 'start-trial': return before.trial.status !== 'active' && after.trial.status === 'active' && after.trial.attempts === before.trial.attempts + 1 ? cues['trial-begin'] : null;
    case 'activate-seal':
      if (before.trial.status !== 'active' || after.trial.status !== 'active' || before.trial.attempts !== after.trial.attempts) return null;
      if (after.trial.progress === before.trial.progress + 1) return cues.seal;
      return before.trial.progress > 0 && after.trial.progress === 0 ? cues['seal-reset'] : null;
    case 'finish-trial': return before.trial.status === 'active' && after.trial.status === 'complete' ? cues['trial-complete'] : null;
    default: return null; // Combat begin/results belong solely to the live simulation.
  }
}

/**
 * Consume actual simulation events, including while muted/paused. Checkpoint
 * revisions are deliberately irrelevant: saving cannot replay a strike.
 */
export class WolfCastleAudio {
  private readonly voice: SceneAudioPort;
  private previous: ReturnType<typeof cursor>;
  private confirmedRevision: number;
  private walk: (WolfCastlePoint & { distance: number }) | null = null;
  private active = false;
  private disposed = false;

  constructor(voice: SceneAudioPort, saved: WolfCastleVisit) {
    this.voice = voice;
    this.previous = cursor(saved, wolfCastleActiveCombat(saved));
    this.confirmedRevision = saved.revision;
  }

  unlock(): void { if (!this.disposed) this.voice.unlock(); }

  sync(visit: WolfCastleVisit, combat = wolfCastleActiveCombat(visit), enabled = true): void {
    if (this.disposed) return;
    const previous = this.previous, next = cursor(visit, combat);
    this.previous = next;
    const sameOwner = next.owner === previous.owner && next.ship === previous.ship;
    if (!sameOwner) { this.suspend(); this.confirmedRevision = visit.revision; }
    if (next.room !== previous.room || next.aboard !== previous.aboard || next.fighting) this.walk = null;
    if (!enabled || visit.status === 'departed') { this.suspend(); return; }
    this.active = true;
    const ambience = wolfCastleAmbience(visit);
    this.voice.loop(ambience.key, ambience.sound);
    if (!sameOwner || !next.aboard || next.room !== 'royal-court' || !combat) return;

    const sameRound = next.round === previous.round;
    const timely = sameRound && next.elapsedMs >= previous.elapsedMs && next.elapsedMs - previous.elapsedMs <= 250;
    const freshRound = !sameRound && previous.aboard && previous.room === next.room && combat.event.kind === 'begin';
    if ((timely && next.sequence > previous.sequence || freshRound) && combat.event.remainingMs > 0) {
      this.voice.play(WOLF_CASTLE_SOUND_CUES[combat.event.kind]);
    }
    if (timely && combat.status === 'active' && combat.enemy.phase === 'windup' && next.enemySequence > previous.enemySequence) {
      this.voice.play(WOLF_CASTLE_SOUND_CUES[combat.enemy.strike === 'thrust' ? 'thrust-warning' : 'sweep-warning']);
    }
  }

  /** Only the caller's durable, changed action may request an interaction sound. */
  confirmedAction(before: WolfCastleVisit, action: WolfCastleAction, after: WolfCastleVisit): void {
    if (this.disposed || before.ownerCreatedAt !== after.ownerCreatedAt || before.personalShipId !== after.personalShipId ||
      after.ownerCreatedAt !== this.previous.owner || after.personalShipId !== this.previous.ship ||
      after.revision !== before.revision + 1 || after.revision <= this.confirmedRevision) return;
    // Consume even when a commit completes behind a menu, blur or blocked save.
    this.confirmedRevision = after.revision;
    if (before.roomId !== after.roomId || before.status !== after.status) this.walk = null;
    if (!this.active || after.status !== 'aboard' || after.roomId !== this.previous.room) return;
    const sound = confirmedCue(before, action, after);
    if (sound) this.voice.play(sound);
  }

  /** Real collision-resolved travel, never animation time or checkpoint position. */
  motion(visit: WolfCastleVisit, from: WolfCastlePoint, to: WolfCastlePoint, enabled = true): void {
    if (this.disposed) return;
    if (!enabled || !this.active || visit.status !== 'aboard' || !this.previous.aboard || this.previous.fighting ||
      visit.ownerCreatedAt !== this.previous.owner || visit.personalShipId !== this.previous.ship || visit.roomId !== this.previous.room) {
      this.walk = null; return;
    }
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    // The actor simulation clamps a frame to 50 ms. A larger delta is a relocation.
    if (!Number.isFinite(distance) || distance <= .02 || distance > WOLF_CASTLE_WORLD.actorSpeed * .05 + .001) {
      this.walk = null; return;
    }
    if (this.walk && Math.hypot(this.walk.x - from.x, this.walk.y - from.y) > .05) {
      this.walk = { ...to, distance: 0 }; return;
    }
    this.walk = { ...to, distance: (this.walk?.distance ?? 0) + distance };
    if (this.walk.distance < 86) return;
    this.walk.distance -= 86;
    const metal = visit.roomId === 'royal-berth' || visit.roomId === 'royal-airlock' || visit.roomId === 'royal-service-pass';
    this.voice.play(WOLF_CASTLE_EXPLORATION_CUES[metal ? 'step-metal' : 'step-stone']);
  }

  suspend(): void {
    this.walk = null;
    if (!this.active) return;
    this.active = false;
    this.voice.stop();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.active = false;
    this.walk = null;
    this.voice.dispose();
  }
}
