/** Authored preparation for the clan's initiation. This is neither its Temple nor a Blooded rite. */
export const SOLO_V69_PHASES = ['briefing', 'observation', 'signals', 'stealth', 'gate-first', 'gate-second', 'gate-third', 'evacuation', 'escort', 'return', 'debrief', 'recognition', 'complete'] as const;
export type SoloV69Phase = typeof SOLO_V69_PHASES[number];
export const SOLO_V69_PROOFS = ['briefed', 'veteran-observed', 'signals-read', 'shadow-route', 'first-sas-crossed', 'second-sas-crossed', 'third-sas-crossed', 'evacuation-briefed', 'trainee-extracted', 'returned', 'mentor-report', 'preparation-certified'] as const;
export type SoloV69Proof = typeof SOLO_V69_PROOFS[number];
export interface SoloV69Receipt { id: SoloV69Proof; sourceId: 'solo.thresholds.v69'; tick: number }
export interface SoloV69Actor { x: number; y: number; vx: number; vy: number; facing: -1 | 1; crouched: boolean }
export interface SoloV69State {
  version: 1; phase: SoloV69Phase; tick: number; phaseStartedAt: number; walked: number; player: SoloV69Actor;
  veteran: { x: number; facing: -1 | 1; turns: number };
  observedTurns: number; observedTicks: number; shadowPosts: number; alarm: number; detections: number; scan: number;
  gateTimers: [number, number, number]; gatesCrossed: number;
  trainee: { x: number; following: boolean; reached: boolean }; waitingSignal: boolean; scouted: boolean; escortSignals: number;
  inputArmed: boolean; previousJump: boolean; previousInteract: boolean; previousCommand: boolean;
  milestones: Partial<Record<SoloV69Proof, number>>;
}
export interface SoloV69Input { move?: -1 | 0 | 1; jump?: boolean; interact?: boolean; command?: boolean }
export interface SoloV69Environment { assetsReady: boolean; pageVisible: boolean; paused: boolean }
export const SOLO_V69_WORLD = { width: 5800, height: 540, ground: 430, left: 65, right: 5710, mentorX: 160, observationX: 820, signalX: 1070, evacuationX: 4300, waitX: 4470, lookoutX: 5050, refugeX: 5460 } as const;
export const SOLO_V69_POSTS = [1380, 1740, 2070] as const;
export const SOLO_V69_GATES = [
  { leverX: 2420, x: 2540, exitX: 2780, openTicks: 160, label: 'Sas I · le signal' },
  { leverX: 3040, x: 3180, exitX: 3440, openTicks: 190, label: 'Sas II · l’élan' },
  { leverX: 3700, x: 3830, exitX: 4120, openTicks: 200, label: 'Sas III · le retour' },
] as const;
export const SOLO_V69_ROCKS = [{ x: 1140, y: 370, width: 65, height: 60 }, { x: 1470, y: 360, width: 65, height: 70 }, { x: 1830, y: 375, width: 65, height: 55 }, { x: 3250, y: 369, width: 75, height: 61 }, { x: 3930, y: 360, width: 78, height: 70 }] as const;
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const finite = (v: unknown, lo: number, hi: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
const integer = (v: unknown, lo: number, hi: number): v is number => finite(v, lo, hi) && Number.isSafeInteger(v);
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
export const soloV69GateIndex = (phase: SoloV69Phase) => (['gate-first', 'gate-second', 'gate-third'] as SoloV69Phase[]).indexOf(phase);
export const soloV69Hazard = (tick: number) => tick % 300 < 75 ? 'warning' : tick % 300 < 165 ? 'active' : 'calm';
/** Physical evidence must be committed at its actual position before another
 * simulation step can leave it. The two-second autosave only covers movement. */
export function soloV69NeedsImmediateCheckpoint(before: SoloV69State, next: SoloV69State): boolean {
  return before.phase !== next.phase || before.shadowPosts !== next.shadowPosts || before.waitingSignal !== next.waitingSignal || before.scouted !== next.scouted || before.escortSignals !== next.escortSignals || before.trainee.following !== next.trainee.following || next.gateTimers.some((timer, i) => timer > before.gateTimers[i]);
}
export function createSoloV69State(): SoloV69State {
  return { version: 1, phase: 'briefing', tick: 0, phaseStartedAt: 0, walked: 0, player: { x: 125, y: 430, vx: 0, vy: 0, facing: 1, crouched: false },
    veteran: { x: 1960, facing: -1, turns: 0 }, observedTurns: 0, observedTicks: 0, shadowPosts: 0, alarm: 0, detections: 0, scan: 0,
    gateTimers: [0, 0, 0], gatesCrossed: 0, trainee: { x: 4300, following: false, reached: false }, waitingSignal: false, scouted: false, escortSignals: 0,
    inputArmed: false, previousJump: false, previousInteract: false, previousCommand: false, milestones: {} };
}
export function soloV69ProofCount(s: Pick<SoloV69State, 'phase'>) { return SOLO_V69_PHASES.indexOf(s.phase); }
export function soloV69Receipts(s: SoloV69State): SoloV69Receipt[] { return SOLO_V69_PROOFS.slice(0, soloV69ProofCount(s)).map(id => ({ id, sourceId: 'solo.thresholds.v69', tick: s.milestones[id]! })); }
export function soloV69Support(a: Pick<SoloV69Actor, 'x' | 'y'>) { return SOLO_V69_ROCKS.find(r => a.x > r.x - 17 && a.x < r.x + r.width + 17 && a.y <= r.y + .01)?.y ?? 430; }
export function soloV69Covered(s: SoloV69State) {
  const a = s.player, b = s.veteran;
  return SOLO_V69_ROCKS.some(r => r.x >= Math.min(a.x, b.x) && r.x + r.width <= Math.max(a.x, b.x) && (a.crouched || a.y <= r.y));
}
export function soloV69Detected(s: SoloV69State) {
  if (!['signals', 'stealth'].includes(s.phase)) return false;
  const a = s.player, b = s.veteran, signed = (a.x - b.x) * b.facing;
  return signed >= 0 && signed < (a.crouched ? 185 : 315) && !soloV69Covered(s);
}
export function normalizeSoloV69State(v: unknown): SoloV69State | null {
  if (!record(v) || v.version !== 1 || !SOLO_V69_PHASES.some(p => p === v.phase) || !record(v.player) || !record(v.veteran) || !record(v.trainee) || !record(v.milestones) || !integer(v.tick, 0, 5_184_000) || !integer(v.phaseStartedAt, 0, v.tick) || !finite(v.walked, 0, v.tick * 3.5 + .1) || !Array.isArray(v.gateTimers) || v.gateTimers.length !== 3 || !v.gateTimers.every((t, i) => integer(t, 0, SOLO_V69_GATES[i].openTicks)) || !integer(v.gatesCrossed, 0, 3) || !integer(v.shadowPosts, 0, 3) || !integer(v.observedTurns, 0, 2) || !integer(v.observedTicks, 0, 180) || !integer(v.alarm, 0, 120) || !integer(v.detections, 0, 9999) || !integer(v.scan, 0, 89) || !integer(v.escortSignals, 0, 9999) || typeof v.waitingSignal !== 'boolean' || typeof v.scouted !== 'boolean') return null;
  const a = v.player, b = v.veteran, c = v.trainee, phase = v.phase as SoloV69Phase, count = soloV69ProofCount({ phase });
  if (!finite(a.x, 65, 5710) || !finite(a.y, 170, 430) || !finite(a.vx, -3.5, 3.5) || !finite(a.vy, -12, 16) || ![1, -1].includes(a.facing as number) || typeof a.crouched !== 'boolean' || !finite(b.x, 1150, 2160) || ![1, -1].includes(b.facing as number) || !integer(b.turns, 0, 99999) || !finite(c.x, 4200, 5530) || typeof c.following !== 'boolean' || typeof c.reached !== 'boolean') return null;
  if (SOLO_V69_ROCKS.some(r => (a.x as number) > r.x - 17 + .01 && (a.x as number) < r.x + r.width + 17 - .01 && (a.y as number) > r.y + .01)) return null;
  if (count >= 2 && (v.observedTicks !== 180 || v.observedTurns !== 2) || count < 3 && v.shadowPosts !== 0 || count >= 4 && v.shadowPosts !== 3 || v.gatesCrossed !== (count < 4 ? 0 : Math.min(3, count - 4)) || count < 8 && (c.following || c.reached || v.waitingSignal || v.scouted || v.escortSignals !== 0) || count >= 9 && (!c.reached || c.following || !v.waitingSignal || !v.scouted || v.escortSignals < 3 || !finite(c.x, 5300, 5530)) || (count < 2 && (v.observedTicks as number) === 180)) return null;
  if (phase !== 'observation' && count < 2 && (v.observedTicks !== 0 || v.observedTurns !== 0) || !['signals', 'stealth', 'escort', 'recognition'].includes(phase) && v.scan !== 0 || count !== Object.keys(v.milestones).length) return null;
  const milestones: SoloV69State['milestones'] = {}; let previous = 0;
  for (const id of SOLO_V69_PROOFS.slice(0, count)) { const tick = v.milestones[id]; if (!integer(tick, 1, v.tick) || tick <= previous) return null; previous = tick; milestones[id] = tick; }
  if (previous > v.phaseStartedAt) return null;
  return { version: 1, phase, tick: v.tick, phaseStartedAt: v.phaseStartedAt, walked: v.walked, player: { x: a.x, y: a.y, vx: a.vx, vy: a.vy, facing: a.facing as -1 | 1, crouched: a.crouched }, veteran: { x: b.x, facing: b.facing as -1 | 1, turns: b.turns }, observedTurns: v.observedTurns, observedTicks: v.observedTicks, shadowPosts: v.shadowPosts, alarm: v.alarm, detections: v.detections, scan: v.scan, gateTimers: v.gateTimers as SoloV69State['gateTimers'], gatesCrossed: v.gatesCrossed, trainee: { x: c.x, following: c.following, reached: c.reached }, waitingSignal: v.waitingSignal, scouted: v.scouted, escortSignals: v.escortSignals, inputArmed: false, previousJump: false, previousInteract: false, previousCommand: false, milestones };
}
function movePlayer(s: SoloV69State, direction: -1 | 0 | 1, jump: boolean) {
  const a = s.player, oldX = a.x, oldY = a.y;
  a.vx = direction * (a.crouched ? 1.65 : 3.5); if (direction) a.facing = direction;
  if (jump && a.vy === 0 && a.y === soloV69Support(a)) a.vy = -11.7;
  a.x = clamp(a.x + a.vx, 65, 5710);
  for (const r of SOLO_V69_ROCKS) if (oldY > r.y + .01 && a.x > r.x - 17 && a.x < r.x + r.width + 17) { a.x = oldX <= r.x - 17 ? r.x - 17 : r.x + r.width + 17; a.vx = 0; }
  for (let i = 0; i < 3; i++) { const g = SOLO_V69_GATES[i]; if (s.gatesCrossed <= i && s.gateTimers[i] === 0 && (oldX <= g.x - 25 && a.x > g.x - 25 || oldX >= g.x + 25 && a.x < g.x + 25)) { a.x = oldX; a.vx = 0; } }
  if (s.phase === 'escort' && soloV69Hazard(s.tick) === 'active' && (oldX < 4650 && a.x >= 4650 || oldX > 4870 && a.x <= 4870)) { a.x = oldX; a.vx = 0; }
  a.vy = Math.min(16, a.vy + .52); let y = a.y + a.vy;
  for (const r of SOLO_V69_ROCKS) if (a.vy >= 0 && oldY <= r.y && y >= r.y && a.x > r.x - 17 && a.x < r.x + r.width + 17) { y = r.y; a.vy = 0; }
  if (y >= 430) { y = 430; a.vy = 0; } a.y = y; s.walked += Math.abs(a.x - oldX);
}
export function stepSoloV69(state: SoloV69State, input: SoloV69Input, env: SoloV69Environment): { state: SoloV69State; receipts: SoloV69Receipt[] } {
  const s: SoloV69State = { ...state, player: { ...state.player }, veteran: { ...state.veteran }, trainee: { ...state.trainee }, gateTimers: [...state.gateTimers], milestones: { ...state.milestones } }, receipts: SoloV69Receipt[] = [];
  if (!env.assetsReady || !env.pageVisible || env.paused || s.phase === 'complete') { s.inputArmed = false; s.previousJump = s.previousInteract = s.previousCommand = false; return { state: s, receipts }; }
  if (!s.inputArmed) { if (!input.move && !input.jump && !input.interact && !input.command) s.inputArmed = true; return { state: s, receipts }; }
  const jump = input.jump === true && !s.previousJump, interact = input.interact === true && !s.previousInteract, command = input.command === true && !s.previousCommand;
  s.previousJump = input.jump === true; s.previousInteract = input.interact === true; s.previousCommand = input.command === true; s.tick++;
  s.player.crouched = ['signals', 'stealth'].includes(s.phase) && input.command === true;
  movePlayer(s, input.move === -1 || input.move === 1 ? input.move : 0, jump);
  if (['observation', 'signals', 'stealth'].includes(s.phase)) { const b = s.veteran; b.x += b.facing * 1.5; if (b.x <= 1150 || b.x >= 2160) { b.x = clamp(b.x, 1150, 2160); b.facing = b.facing === 1 ? -1 : 1; b.turns++; } }
  s.gateTimers = s.gateTimers.map(t => Math.max(0, t - 1)) as SoloV69State['gateTimers'];
  if (s.alarm) s.alarm--;
  if (soloV69Detected(s) && !s.alarm) { s.alarm = 120; s.detections++; s.scan = 0; }
  const a = s.player, near = (x: number, tolerance = 38) => Math.abs(a.x - x) < tolerance && a.y === 430;
  const transition = (phase: SoloV69Phase) => { s.phase = phase; s.phaseStartedAt = s.tick; s.scan = 0; s.inputArmed = false; s.previousJump = s.previousInteract = s.previousCommand = false; };
  const proof = (id: SoloV69Proof, phase: SoloV69Phase) => { s.milestones[id] = s.tick; receipts.push({ id, sourceId: 'solo.thresholds.v69', tick: s.tick }); transition(phase); };
  if (s.phase === 'briefing' && near(160) && interact) proof('briefed', 'observation');
  else if (s.phase === 'observation') {
    if (near(820) && !a.vx && input.interact) { s.observedTicks = Math.min(179, s.observedTicks + 1); s.observedTurns = Math.min(2, s.veteran.turns); if (s.observedTicks >= 179 && s.observedTurns === 2) { s.observedTicks = 180; proof('veteran-observed', 'signals'); } }
  } else if (s.phase === 'signals') { s.scan = near(1070) && a.crouched && !a.vx && input.interact && !s.alarm && !soloV69Detected(s) ? s.scan + 1 : 0; if (s.scan >= 45) proof('signals-read', 'stealth'); }
  else if (s.phase === 'stealth') { s.scan = near(SOLO_V69_POSTS[s.shadowPosts]) && a.crouched && !a.vx && input.interact && !s.alarm && !soloV69Detected(s) ? s.scan + 1 : 0; if (s.scan >= 45) { s.shadowPosts++; s.scan = 0; if (s.shadowPosts === 3) proof('shadow-route', 'gate-first'); } }
  else if (soloV69GateIndex(s.phase) >= 0) {
    const i = soloV69GateIndex(s.phase), g = SOLO_V69_GATES[i];
    if ((near(g.leverX) || near(g.x + 45)) && interact) s.gateTimers[i] = g.openTicks;
    if (s.gateTimers[i] > 0 && a.x >= g.exitX && a.y === 430) { s.gatesCrossed++; s.gateTimers[i] = 0; proof(SOLO_V69_PROOFS[4 + i], (['gate-second', 'gate-third', 'evacuation'] as const)[i]); }
  } else if (s.phase === 'evacuation' && near(4300) && interact) proof('evacuation-briefed', 'escort');
  else if (s.phase === 'escort') {
    const c = s.trainee;
    if (command && Math.abs(c.x - a.x) < 125 && a.y === 430) { c.following = !c.following; s.escortSignals++; if (!c.following && c.x >= 4400 && c.x <= 4520) s.waitingSignal = true; }
    if (c.following && Math.abs(a.x - 90 - c.x) > 5) { const next = clamp(c.x + (a.x - 90 < c.x ? -2.9 : 2.9), 4200, 5530); if (!(soloV69Hazard(s.tick) === 'active' && next >= 4650 && next <= 4870)) c.x = next; }
    if (!s.scouted) { s.scan = s.waitingSignal && !c.following && near(5050) && !a.vx && input.interact && soloV69Hazard(s.tick) === 'calm' ? s.scan + 1 : 0; if (s.scan >= 30) { s.scouted = true; s.scan = 0; } }
    if (s.waitingSignal && s.scouted && s.escortSignals >= 3 && c.following && near(5460) && c.x >= 5300 && Math.abs(c.x - 5460) < 165 && interact) { c.following = false; c.reached = true; proof('trainee-extracted', 'return'); }
  } else if (s.phase === 'return' && near(160) && s.walked >= 10500 && interact) proof('returned', 'debrief');
  else if (s.phase === 'debrief' && near(160) && interact) proof('mentor-report', 'recognition');
  else if (s.phase === 'recognition') { s.scan = near(160) && input.interact && !a.vx ? s.scan + 1 : 0; if (s.scan >= 90) proof('preparation-certified', 'complete'); }
  return { state: s, receipts };
}
export function soloV69Objective(s: SoloV69State): { title: string; instruction: string; targetX: number | null } {
  const gate = soloV69GateIndex(s.phase);
  if (gate >= 0) { const g = SOLO_V69_GATES[gate]; return { title: g.label, instruction: s.gateTimers[gate] ? `Le sas reste ouvert ${(s.gateTimers[gate] / 60).toFixed(1)} s. Franchis la borne de sortie${gate ? ' en sautant l’affleurement' : ''}. Une fois franchi, il reste ouvert pour ton retour.` : 'Approche une borne de commande, relâche puis presse Interaction. Cours jusqu’à la borne de sortie. La commande de l’autre côté permet de rouvrir si la fenêtre expire ; les sas précédents restent acquis.', targetX: s.gateTimers[gate] ? g.exitX + 6 : aPastGate(s, g.x) ? g.x + 45 : g.leverX }; }
  const objectives: Record<Exclude<SoloV69Phase, 'gate-first' | 'gate-second' | 'gate-third'>, { title: string; instruction: string; targetX: number | null }> = {
    briefing: { title: 'Les Seuils du Premier Sang', instruction: 'Écoute le vétéran. Cette préparation vérifie l’observation, les ouvertures et le retour des autres ; elle ne donne ni Blooded ni vaisseau.', targetX: 160 },
    observation: { title: 'Suivre sans être vu', instruction: `Rejoins le poste d’observation. Maintiens Interaction immobile pendant deux demi-tours du vétéran : ${s.observedTurns}/2, observation ${Math.min(180, s.observedTicks)}/180.`, targetX: 820 },
    signals: { title: 'Lire le regard du vétéran', instruction: 'À la borne, maintiens Marche à couvert et Interaction. Son cône indique le regard ; un affleurement entre lui et toi coupe sa vue. Une alerte interrompt le relevé.', targetX: 1070 },
    stealth: { title: 'Trois postes dans l’ombre', instruction: `Postes ${s.shadowPosts}/3. Avance lentement à couvert, contourne les affleurements en sautant ; à chaque borne, garde Couvert et Interaction 45 instants sans alerte.`, targetX: SOLO_V69_POSTS[s.shadowPosts] ?? null },
    evacuation: { title: 'La place du dernier', instruction: 'Rejoins le novice au relais et écoute la consigne. Il reste au clan ; cet exercice n’est pas une nouvelle chasse qualifiante.', targetX: 4300 },
    escort: { title: 'Ouvrir un passage aux autres', instruction: !s.waitingSignal ? 'Commande près du novice : suivre / attendre. Avance jusqu’à la borne d’attente, puis laisse-le à couvert avant de vérifier le danger.' : !s.scouted ? 'Laisse le novice attendre et rejoins l’autre rive. Pendant l’accalmie, maintiens Interaction au poste pour reconnaître la traversée.' : 'Reviens réellement chercher le novice, donne le signal de suivi puis conduis-le au refuge. Le dispositif se ferme pendant l’alerte rouge ; attends l’accalmie. Confirme au refuge.', targetX: !s.waitingSignal ? s.trainee.following ? 4560 : s.trainee.x : !s.scouted ? 5050 : !s.trainee.following ? s.trainee.x : 5460 },
    return: { title: 'Le retour fait partie de l’épreuve', instruction: 'Le novice est au refuge. Reviens à pied au vétéran. Les trois sas validés restent ouverts ; aucun raccourci de menu ne signe le rapport.', targetX: 160 },
    debrief: { title: 'Un départ se prépare', instruction: 'Remets les observations, les sas et l’évacuation au vétéran. Le rapport distingue la préparation du futur Temple.', targetX: 160 },
    recognition: { title: 'Une attestation, pas une initiation', instruction: 'Maintiens Interaction pour recevoir l’attestation de préparation. Le Temple des Trois Ombres et les chasses individuelles ne sont pas encore accomplis.', targetX: 160 },
    complete: { title: 'Young Blood · Préparation attestée', instruction: 'Les exercices sont reçus. Tu restes Young Blood ; aucun xénomorphe vaincu, rite Blooded, plasma caster personnel ou vaisseau n’a été attribué.', targetX: null },
  };
  return objectives[s.phase as Exclude<SoloV69Phase, 'gate-first' | 'gate-second' | 'gate-third'>];
}
const aPastGate = (s: SoloV69State, x: number) => s.player.x > x + 25;
export function soloV69CameraX(s: SoloV69State, width: number) {
  // Once the actor reaches the observation post, its view follows the actual
  // patrol rather than leaving the lesson off-screen on portrait displays.
  const watching = s.phase === 'observation' && Math.abs(s.player.x - 820) < 40 && s.player.y === 430;
  return clamp((watching ? s.veteran.x : s.player.x) - width * (watching ? .55 : .45), 0, SOLO_V69_WORLD.width - width);
}
