import type { SceneAudioPort, SceneAudioSound } from './sceneAudio';
import type { WolfCastleRoomId, WolfCastleVisit } from './wolfCastle';
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
  room: visit.roomId,
  aboard: visit.status === 'aboard',
  round: combat ? `${combat.attempt}:${combat.encounterIndex}` : null,
  elapsedMs: combat?.elapsedMs ?? 0,
  sequence: combat?.event.sequence ?? -1,
  enemySequence: combat?.enemy.sequence ?? -1,
});

/**
 * Consume actual simulation events, including while muted/paused. Checkpoint
 * revisions are deliberately irrelevant: saving cannot replay a strike.
 */
export class WolfCastleAudio {
  private readonly voice: SceneAudioPort;
  private previous: ReturnType<typeof cursor>;
  private active = false;
  private disposed = false;

  constructor(voice: SceneAudioPort, saved: WolfCastleVisit) {
    this.voice = voice;
    this.previous = cursor(saved, saved.combat);
  }

  unlock(): void { if (!this.disposed) this.voice.unlock(); }

  sync(visit: WolfCastleVisit, combat = visit.combat, enabled = true): void {
    if (this.disposed) return;
    const previous = this.previous, next = cursor(visit, combat);
    this.previous = next;
    const sameOwner = next.owner === previous.owner;
    if (!sameOwner) this.suspend();
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

  suspend(): void {
    if (!this.active) return;
    this.active = false;
    this.voice.stop();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.active = false;
    this.voice.dispose();
  }
}
