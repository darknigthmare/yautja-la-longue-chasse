import type { SceneAudioPort, SceneAudioSound } from './sceneAudio';
import { inspectClanShipOperations, type ClanShipOperationsAction, type ClanShipOperationsState } from './clanShipOperations';
import { actClanShipSpaceEncounter, clanShipSpaceEnemyIntent, type ClanShipSpaceEncounter } from './clanShipSpaceEncounter';

/** OPS-B14. Original synthesis on GameAudio's shared effects bus. These are
 * interface/formation signals, never samples or canonical Yautja language. */
export const CLAN_SHIP_OPERATIONS_SOUND_CUES = {
  'table-open': { tones: [{ frequency: 164.8, endFrequency: 247.2, duration: .2, gain: .028 }, { frequency: 329.6, duration: .2, delay: .08, gain: .018 }] },
  'table-close': { tones: [{ frequency: 247.2, endFrequency: 123.6, duration: .18, gain: .026 }] },
  'order-accepted': { tones: [{ frequency: 309, duration: .1, gain: .025 }, { frequency: 412, duration: .12, delay: .06, gain: .018 }] },
  'order-refused': { tones: [{ frequency: 123.6, endFrequency: 82.4, duration: .16, gain: .032 }, { frequency: 123.6, duration: .1, delay: .17, gain: .022 }] },
  'contact-alert': { tones: [{ frequency: 494.4, endFrequency: 370.8, duration: .13, delay: .2, gain: .025 }, { frequency: 494.4, duration: .1, delay: .38, gain: .018 }] },
  'mission-start': { tones: [{ frequency: 123.6, duration: .2, gain: .03 }, { frequency: 185.4, duration: .23, delay: .08, gain: .022 }] },
  scan: { tones: [{ frequency: 247.2, endFrequency: 741.6, duration: .18, gain: .023 }] },
  manoeuvre: { tones: [{ frequency: 82.4, endFrequency: 123.6, duration: .22, gain: .028 }], noises: [{ duration: .2, filterFrequency: 420, endFilterFrequency: 760, gain: .015 }] },
  recharge: { tones: [{ frequency: 123.6, endFrequency: 247.2, duration: .24, gain: .026 }] },
  brace: { tones: [{ frequency: 123.6, duration: .16, gain: .025 }, { frequency: 185.4, duration: .13, delay: .05, gain: .018 }] },
  disrupt: { tones: [{ frequency: 309, endFrequency: 82.4, duration: .16, gain: .028 }], noises: [{ duration: .12, filterFrequency: 920, endFilterFrequency: 330, gain: .019 }] },
  fire: { tones: [{ frequency: 92.5, endFrequency: 46.2, duration: .19, gain: .032 }], noises: [{ duration: .14, filterFrequency: 760, endFilterFrequency: 220, gain: .025 }] },
  board: { tones: [{ frequency: 164.8, duration: .16, gain: .028 }, { frequency: 247.2, duration: .2, delay: .08, gain: .019 }] },
  extraction: { tones: [{ frequency: 123.6, endFrequency: 370.8, duration: .25, gain: .026 }], noises: [{ duration: .2, filterFrequency: 620, endFilterFrequency: 230, gain: .014 }] },
  victory: { tones: [{ frequency: 164.8, duration: .4, delay: .25, gain: .031 }, { frequency: 247.2, duration: .35, delay: .35, gain: .023 }, { frequency: 329.6, duration: .35, delay: .45, gain: .017 }] },
  defeat: { tones: [{ frequency: 123.6, endFrequency: 61.8, duration: .35, gain: .033 }, { frequency: 92.7, endFrequency: 46.3, duration: .3, delay: .1, gain: .021 }] },
  withdrawn: { tones: [{ frequency: 185.4, endFrequency: 123.6, duration: .24, gain: .025 }] },
} as const satisfies Record<string, SceneAudioSound>;
export type ClanShipOperationsSoundCue = keyof typeof CLAN_SHIP_OPERATIONS_SOUND_CUES;

function sameEncounter(one: ClanShipSpaceEncounter, two: ClanShipSpaceEncounter): boolean {
  return Object.keys(one).every(key => {
    const field = key as keyof ClanShipSpaceEncounter;
    return Array.isArray(one[field]) ? JSON.stringify(one[field]) === JSON.stringify(two[field]) : one[field] === two[field];
  });
}

/** No sound is derived from a forecast, a render, a receipt merely loaded from
 * storage, or an onAction(true) without the corresponding new campaign state. */
export function confirmedClanShipOperationsCues(before: ClanShipOperationsState, action: ClanShipOperationsAction,
  after: ClanShipOperationsState): ClanShipOperationsSoundCue[] {
  if (inspectClanShipOperations(before, before?.ownerCreatedAt).status !== 'valid' ||
      inspectClanShipOperations(after, before.ownerCreatedAt).status !== 'valid' ||
      action.expectedRevision !== before.revision || after.revision !== before.revision + 1) return [];
  if (action.type === 'space-command') {
    const previous = before.spaceEncounter, next = after.spaceEncounter;
    if (!previous || !next) return [];
    const result = actClanShipSpaceEncounter(previous, action.command);
    if (!result.accepted || !result.changed || !sameEncounter(result.state, next)) return [];
    if (next.status === 'defeat') return ['defeat'];
    if (next.status === 'withdrawn') return ['withdrawn'];
    if (next.status === 'victory') return action.command.type === 'extract' ? ['extraction', 'victory'] : ['victory'];
    const order = action.command.type;
    const cues: ClanShipOperationsSoundCue[] = order === 'extract' ? ['extraction'] : order === 'withdraw' ? ['withdrawn'] : [order];
    // An announced hostile volley/flank sounds once for its newly confirmed
    // turn. Terminal debriefs above take priority over a stale warning.
    if (next.hostileDrive > 0 && next.hostileIntegrity > 0 && clanShipSpaceEnemyIntent(next).id !== 'acquire') cues.push('contact-alert');
    return cues;
  }
  switch (action.type) {
    case 'onboard-step': return after.onboardingStep === before.onboardingStep + 1 ? ['order-accepted'] : [];
    case 'accept-mandate': return !before.mandateAccepted && after.mandateAccepted ? ['order-accepted'] : [];
    case 'accept-contract': return after.activeContract?.contractId === action.contractId && after.activeContract.acceptedRevision === after.revision
      ? after.spaceEncounter ? ['mission-start', 'contact-alert'] : ['order-accepted'] : [];
    case 'interior-step': return before.activeContract && (after.activeContract?.stepIndex === before.activeContract.stepIndex + 1 ||
      after.completedContracts.some(receipt => receipt.contractId === before.activeContract?.contractId && receipt.completedRevision === after.revision)) ? ['order-accepted'] : [];
    case 'cancel-contract': return before.activeContract && !after.activeContract ? ['withdrawn'] : [];
    case 'recruit': return !before.recruitedNpcIds.includes(action.npcId) && after.recruitedNpcIds.includes(action.npcId) ? ['order-accepted'] : [];
    case 'confirm-circle': return !before.circleConfirmed && after.circleConfirmed ? ['order-accepted'] : [];
    default: return [];
  }
}

/** One director per mounted Clan Ship. No timers, loops, storage or independent
 * AudioContext. The hub sends explicit input attempts; sync acknowledges only
 * the state returned by the actual durable campaign owner. */
export class ClanShipOperationsAudio {
  private readonly voice: SceneAudioPort;
  private readonly owner: string;
  private openState = false;
  private enabled = false;
  private disposed = false;
  private pending: { before: ClanShipOperationsState; action: ClanShipOperationsAction } | null = null;

  constructor(voice: SceneAudioPort, ownerCreatedAt: string) { this.voice = voice; this.owner = ownerCreatedAt; }

  open(state: ClanShipOperationsState, enabled = true): void {
    if (this.disposed || inspectClanShipOperations(state, this.owner).status !== 'valid') return;
    this.enabled = enabled;
    if (this.openState) return;
    this.openState = true;
    this.pending = null;
    if (enabled) this.play(['table-open']);
  }

  close(): void {
    if (this.disposed || !this.openState) return;
    this.openState = false;
    this.pending = null;
    this.voice.stop();
    if (this.enabled) this.play(['table-close']);
  }

  issued(state: ClanShipOperationsState, action: ClanShipOperationsAction, accepted: boolean): void {
    if (this.disposed || !this.openState || !this.enabled) return;
    const inspected = inspectClanShipOperations(state, this.owner);
    this.pending = null;
    if (!inspected.state || action.expectedRevision !== state.revision) return;
    // A storage refusal is deliberately distinct from a confirmed command.
    if (!accepted) { this.play(['order-refused']); return; }
    this.pending = { before: inspected.state, action: JSON.parse(JSON.stringify(action)) as ClanShipOperationsAction };
  }

  sync(state: ClanShipOperationsState | null, enabled = true): void {
    if (this.disposed) return;
    this.enabled = enabled;
    if (!enabled || !state || inspectClanShipOperations(state, this.owner).status !== 'valid') { this.suspend(); return; }
    const pending = this.pending;
    if (!pending || state.revision === pending.before.revision) return;
    // Consume before playback: muted, blocked-autoplay and skipped revisions
    // never queue an old success for a later render or focus restoration.
    this.pending = null;
    if (this.openState) this.play(confirmedClanShipOperationsCues(pending.before, pending.action, state));
  }

  suspend(): void {
    if (this.disposed) return;
    this.enabled = false;
    this.pending = null;
    this.voice.stop();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.pending = null;
    this.openState = false;
    this.enabled = false;
    this.voice.dispose();
  }

  private play(cues: readonly ClanShipOperationsSoundCue[]): void {
    if (!cues.length) return;
    // Latest interaction owns the voice. Rapid repeat/refusal cannot stack an
    // unbounded mix; unlock never stores these one-shots behind its promise.
    this.voice.stop();
    this.voice.unlock();
    for (const cue of cues) this.voice.play(CLAN_SHIP_OPERATIONS_SOUND_CUES[cue]);
  }
}
