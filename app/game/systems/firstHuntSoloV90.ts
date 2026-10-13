/** Original training before the actual Quatza-Rij. The existing drone is not
 * renamed as that rite or as a new canonical species. All numbers are design. */
export const SOLO_V90_SOURCE_SHA = '87ad5d1a6eaf49f2908a4457ef3f97b8f34db481a24bbc121d2e924559b19183';
export const SOLO_V90_PHASES = ['briefing', 'arsenal', 'assemble', 'observe', 'combat', 'return', 'debrief', 'complete'] as const;
export type SoloV90Phase = typeof SOLO_V90_PHASES[number];
export const SOLO_V90_PROOFS = ['training-briefed', 'loaned-tools-checked', 'roles-positioned', 'target-observed', 'training-resolved', 'triad-returned', 'training-reported'] as const;
export type SoloV90Proof = typeof SOLO_V90_PROOFS[number];
export interface SoloV90Receipt { id: SoloV90Proof; sourceId: 'solo.triad-training.v90'; tick: number }
export interface SoloV90Input { move?: -1 | 0 | 1; jump?: boolean; interact?: boolean; command?: boolean; dodge?: boolean }
export interface SoloV90Environment { assetsReady: boolean; pageVisible: boolean; paused: boolean }
export interface SoloV90State {
  version: 1; phase: SoloV90Phase; tick: number; phaseStartedAt: number; walked: number;
  player: { x: number; y: number; vx: number; vy: number; facing: -1 | 1 };
  companions: [{ x: number }, { x: number }]; roleMode: 'follow' | 'posts';
  contributions: { player: number; saar: number; vek: number }; observedCycles: number;
  drone: { x: number; hp: number; mode: 'watch' | 'telegraph' | 'lunge' | 'recover' | 'dead'; age: number; cycles: number };
  health: number; hurtTimer: number; attackTimer: number; attackCooldown: number;
  acid: { x: number; ttl: number }; scan: number; result: null | 'success' | 'retreated' | 'assisted';
  inputArmed: boolean; previousJump: boolean; previousInteract: boolean; previousCommand: boolean;
  /** Additive local action. Old checkpoints remain byte-for-byte unchanged
   * until this control is used; no old receipt or rite is inferred from it. */
  evasion?: { ticks: number; cooldown: number; direction: -1 | 1; previousDodge: boolean };
  milestones: Partial<Record<SoloV90Proof, number>>;
  /** Uncommitted commands, bounded to 120 frames. Owner replays, then clears. */
  replay: number[];
}
export const SOLO_V90_WORLD_WIDTH = 3440, SOLO_V90_GROUND = 430;
/** Original combat tuning, borrowing the already learned dojo movement. */
export const SOLO_V92_EVASION = { duration: 23, recovery: 60, speed: 5.2, safeFrom: 2, safeUntil: 13 } as const;
export const SOLO_V90_POSTS = [2360, 2800] as const;
export const soloV90ObservationPostReady = (s: SoloV90State) => s.phase === 'observe' && Math.abs(s.player.x - 2590) < 65 && s.player.y === 430 && s.player.vx === 0;
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const finite = (v: unknown, lo: number, hi: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
const integer = (v: unknown, lo: number, hi: number): v is number => finite(v, lo, hi) && Number.isSafeInteger(v);
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
export const soloV90ProofCount = (state: Pick<SoloV90State, 'phase'>) => SOLO_V90_PHASES.indexOf(state.phase);
export const soloV90Receipts = (state: SoloV90State): SoloV90Receipt[] => SOLO_V90_PROOFS.slice(0, soloV90ProofCount(state)).map(id => ({ id, sourceId: 'solo.triad-training.v90', tick: state.milestones[id]! }));
export function createSoloV90State(): SoloV90State {
  return { version: 1, phase: 'briefing', tick: 0, phaseStartedAt: 0, walked: 0,
    player: { x: 160, y: 430, vx: 0, vy: 0, facing: 1 }, companions: [{ x: 110 }, { x: 65 }], roleMode: 'follow',
    contributions: { player: 0, saar: 0, vek: 0 }, observedCycles: 0,
    drone: { x: 3130, hp: 8, mode: 'watch', age: 0, cycles: 0 }, health: 6, hurtTimer: 0, attackTimer: 0, attackCooldown: 0,
    acid: { x: 3130, ttl: 0 }, scan: 0, result: null, inputArmed: false, previousJump: false, previousInteract: false, previousCommand: false, milestones: {}, replay: [] };
}
export function normalizeSoloV90State(raw: unknown): SoloV90State | null {
  if (!record(raw) || raw.version !== 1 || !SOLO_V90_PHASES.some(p => p === raw.phase) || !integer(raw.tick, 0, 5_184_000) ||
      !integer(raw.phaseStartedAt, 0, raw.tick) || !finite(raw.walked, 0, raw.tick * SOLO_V92_EVASION.speed + .01) || !record(raw.player) ||
      !Array.isArray(raw.companions) || raw.companions.length !== 2 || !raw.companions.every(c => record(c) && finite(c.x, 65, 3375)) ||
      !['follow', 'posts'].includes(String(raw.roleMode)) || !record(raw.contributions) ||
      !['player', 'saar', 'vek'].every(k => integer((raw.contributions as Record<string, unknown>)[k], 0, 8)) ||
      !integer(raw.observedCycles, 0, 3) || !record(raw.drone) || !finite(raw.drone.x, 2520, 3130) || !integer(raw.drone.hp, 0, 8) ||
      !['watch', 'telegraph', 'lunge', 'recover', 'dead'].includes(String(raw.drone.mode)) || !integer(raw.drone.age, 0, 180) ||
      !integer(raw.drone.cycles, 0, 99_999) || !integer(raw.health, 0, 6) || !integer(raw.hurtTimer, 0, 90) ||
      !integer(raw.attackTimer, 0, 18) || !integer(raw.attackCooldown, 0, 45) || !record(raw.acid) || !finite(raw.acid.x, 2520, 3130) ||
      !integer(raw.acid.ttl, 0, 110) || !integer(raw.scan, 0, 89) || ![null, 'success', 'retreated', 'assisted'].includes(raw.result as null) ||
      !['inputArmed', 'previousJump', 'previousInteract', 'previousCommand'].every(k => typeof raw[k] === 'boolean') ||
      !record(raw.milestones) || !Array.isArray(raw.replay) || raw.replay.length > 120 || !raw.replay.every(code => integer(code, 0, 62) && (code & 3) < 3)) return null;
  if (raw.evasion !== undefined && (!record(raw.evasion) ||
      !integer(raw.evasion.ticks, 0, SOLO_V92_EVASION.duration) || !integer(raw.evasion.cooldown, 0, SOLO_V92_EVASION.recovery) ||
      ![-1, 1].includes(raw.evasion.direction as number) || typeof raw.evasion.previousDodge !== 'boolean' ||
      raw.evasion.ticks > 0 && (raw.phase !== 'combat' || raw.health === 0 || raw.evasion.cooldown < raw.evasion.ticks))) return null;
  const a = raw.player, count = soloV90ProofCount(raw as unknown as SoloV90State), d = raw.drone, c = raw.contributions;
  // Preserve the validated numeric narrowing across the local record alias.
  if (!integer(d.hp, 0, 8)) return null;
  const movingEvasion = record(raw.evasion) && typeof raw.evasion.ticks === 'number' && raw.evasion.ticks > 0;
  const maxSpeed = movingEvasion ? SOLO_V92_EVASION.speed : 3.5;
  if (!finite(a.x, 65, 3375) || !finite(a.y, 130, 430) || !finite(a.vx, -maxSpeed, maxSpeed) || !finite(a.vy, -12, 16) || ![-1, 1].includes(a.facing as number) ||
      Object.keys(raw.milestones).length !== count || (d.hp === 0) !== (d.mode === 'dead') || c.player !== 8 - d.hp || c.saar !== c.player || c.vek !== c.player ||
      count < 4 && (d.hp !== 8 || raw.health !== 6 || raw.result !== null) || count >= 4 && raw.observedCycles !== 3 ||
      count >= 5 && raw.result === null || count < 5 && raw.result !== null ||
      raw.result === 'success' && (d.hp !== 0 || raw.health === 0) || raw.result === 'assisted' && raw.health !== 0 ||
      count >= 6 && (a.x > 198 || raw.companions.some(c => Math.abs(c.x - 160) > 120))) return null;
  let prior = 0;
  const milestones: SoloV90State['milestones'] = {};
  for (const id of SOLO_V90_PROOFS.slice(0, count)) {
    const tick = raw.milestones[id]; if (!integer(tick, 1, raw.tick) || tick <= prior) return null;
    milestones[id] = tick; prior = tick;
  }
  if (prior !== raw.phaseStartedAt) return null;
  return { ...raw, ...(record(raw.evasion) ? { evasion: { ...raw.evasion } } : {}), player: { ...a }, companions: raw.companions.map(c => ({ ...c })), contributions: { ...c }, drone: { ...d }, acid: { ...raw.acid }, milestones, replay: [...raw.replay] } as unknown as SoloV90State;
}
export function packSoloV90Input(input: SoloV90Input): number { return (input.move === -1 ? 0 : input.move === 1 ? 2 : 1) | (input.jump ? 4 : 0) | (input.interact ? 8 : 0) | (input.command ? 16 : 0) | (input.dodge ? 32 : 0); }
export function unpackSoloV90Input(code: number): SoloV90Input { return { move: ((code & 3) - 1) as -1 | 0 | 1, jump: !!(code & 4), interact: !!(code & 8), command: !!(code & 16), dodge: !!(code & 32) }; }
export function stepSoloV90(before: SoloV90State, input: SoloV90Input, env: SoloV90Environment): { state: SoloV90State; receipts: SoloV90Receipt[] } {
  const s: SoloV90State = { ...before, ...(before.evasion ? { evasion: { ...before.evasion } } : {}), player: { ...before.player }, companions: before.companions.map(c => ({ ...c })) as SoloV90State['companions'], contributions: { ...before.contributions }, drone: { ...before.drone }, acid: { ...before.acid }, milestones: { ...before.milestones }, replay: [...before.replay] }, receipts: SoloV90Receipt[] = [];
  if (!env.assetsReady || !env.pageVisible || env.paused || s.phase === 'complete' || s.replay.length >= 120) return { state: s, receipts };
  s.replay.push(packSoloV90Input(input));
  if (!s.inputArmed) { if (!input.move && !input.jump && !input.interact && !input.command && !input.dodge) s.inputArmed = true; return { state: s, receipts }; }
  const jump = !!input.jump && !s.previousJump, interact = !!input.interact && !s.previousInteract, command = !!input.command && !s.previousCommand;
  s.previousJump = !!input.jump; s.previousInteract = !!input.interact; s.previousCommand = !!input.command; s.tick++;
  const a = s.player, oldX = a.x;
  if (s.evasion || input.dodge) {
    const action = s.evasion ?? { ticks: 0, cooldown: 0, direction: a.facing, previousDodge: false };
    action.ticks = Math.max(0, action.ticks - 1); action.cooldown = Math.max(0, action.cooldown - 1);
    const pressed = !!input.dodge && !action.previousDodge; action.previousDodge = !!input.dodge;
    if (pressed && s.phase === 'combat' && s.health > 0 && a.y === SOLO_V90_GROUND && a.vy === 0 &&
        !action.cooldown && !s.attackTimer && !s.hurtTimer) {
      action.ticks = SOLO_V92_EVASION.duration; action.cooldown = SOLO_V92_EVASION.recovery;
      action.direction = input.move || (a.facing === 1 ? -1 : 1);
    }
    s.evasion = action;
  }
  // Zero vitality means supported extraction, not resurrection. Saar walks to
  // the player before movement is possible and stays beside the carried body.
  const supported = s.health > 0 || Math.abs(s.companions[0].x - a.x) <= 38;
  const speed = s.health > 0 ? 3.5 : 1.25;
  a.vx = s.evasion?.ticks ? s.evasion.direction * SOLO_V92_EVASION.speed : supported ? (input.move === -1 ? -1 : input.move === 1 ? 1 : 0) * speed : 0;
  if (a.vx) a.facing = a.vx < 0 ? -1 : 1;
  a.x = clamp(a.x + a.vx, 65, s.phase === 'combat' ? 3090 : soloV90ProofCount(s) >= 6 ? 198 : 3375);
  if (jump && !s.evasion?.ticks && s.health > 0 && a.y === 430 && a.vy === 0) a.vy = -11.7;
  a.vy = Math.min(16, a.vy + .52); a.y += a.vy; if (a.y >= 430) { a.y = 430; a.vy = 0; }
  s.walked += Math.abs(a.x - oldX);
  s.attackTimer = Math.max(0, s.attackTimer - 1); s.attackCooldown = Math.max(0, s.attackCooldown - 1);
  s.hurtTimer = Math.max(0, s.hurtTimer - 1); s.acid.ttl = Math.max(0, s.acid.ttl - 1);
  s.companions.forEach((c, i) => {
    const target = s.health === 0 && i === 0 ? clamp(a.x + 18, 65, 3375) : s.roleMode === 'posts' ? SOLO_V90_POSTS[i] : clamp(a.x - 65 * (i + 1), 65, 3375);
    if (Math.abs(c.x - target) > 2) c.x = clamp(c.x + Math.sign(target - c.x) * 3, 65, 3375);
  });
  const near = (x: number, range = 38) => Math.abs(a.x - x) < range && a.y === 430;
  const hold = (condition: boolean, ticks: number) => { s.scan = condition ? s.scan + 1 : 0; return s.scan >= ticks; };
  const proof = (id: SoloV90Proof, phase: SoloV90Phase) => { s.milestones[id] = s.tick; receipts.push({ id, sourceId: 'solo.triad-training.v90', tick: s.tick }); s.phase = phase; s.phaseStartedAt = s.tick; s.scan = 0; s.inputArmed = false; s.previousJump = s.previousInteract = s.previousCommand = false; if (s.evasion) { s.evasion.ticks = 0; s.evasion.previousDodge = false; a.vx = 0; } };
  if (command && s.phase === 'assemble') s.roleMode = s.roleMode === 'follow' ? 'posts' : 'follow';
  if (s.phase === 'briefing' && near(160) && interact) proof('training-briefed', 'arsenal');
  else if (s.phase === 'arsenal' && hold(near(780) && !a.vx && !!input.interact, 45)) proof('loaned-tools-checked', 'assemble');
  else if (s.phase === 'assemble' && hold(near(2590) && !a.vx && s.roleMode === 'posts' && s.companions.every((c, i) => Math.abs(c.x - SOLO_V90_POSTS[i]) < 5) && !!input.interact, 45)) proof('roles-positioned', 'observe');
  else if (s.phase === 'observe' || s.phase === 'combat') {
    const d = s.drone; d.age++;
    if (d.mode === 'watch' && d.age >= 60) { d.mode = 'telegraph'; d.age = 0; }
    else if (d.mode === 'telegraph' && d.age >= 30) { d.mode = 'lunge'; d.age = 0; }
    else if (d.mode === 'lunge' && d.age >= 60) { d.mode = 'recover'; d.age = 0; d.cycles++; if (soloV90ObservationPostReady(s) && input.interact && s.observedCycles < 3) s.observedCycles++; }
    else if (d.mode === 'recover' && d.age >= 100) { d.mode = 'watch'; d.age = 0; }
    // The protected distant demonstration has a shorter physical stroke. It
    // does not charge through the observer while silently suppressing a hit.
    if (d.mode === 'lunge') d.x = Math.max(s.phase === 'observe' ? 2980 : 2520, d.x - 8.5); else if (d.mode === 'recover') d.x = Math.min(3130, d.x + 5);
    if (s.phase === 'observe' && s.observedCycles === 3) proof('target-observed', 'combat');
    else if (s.phase === 'combat') {
      if (command && !s.evasion?.ticks && !s.attackCooldown && s.health > 0) {
        s.attackTimer = 18; s.attackCooldown = 45;
        if (d.mode === 'recover' && Math.abs(a.x - d.x) < 100 && a.y > 335 && s.companions.every((c, i) => Math.abs(c.x - SOLO_V90_POSTS[i]) < 5)) {
          d.hp--; s.contributions.player++; s.contributions.saar++; s.contributions.vek++; s.acid = { x: d.x, ttl: 110 };
        }
      }
      const dodgeAge = s.evasion?.ticks ? SOLO_V92_EVASION.duration - s.evasion.ticks : -1;
      const evadeCharge = dodgeAge >= SOLO_V92_EVASION.safeFrom && dodgeAge <= SOLO_V92_EVASION.safeUntil;
      // A brief evasive motion avoids the charge, never corrosive ground.
      if (!s.hurtTimer && (!evadeCharge && d.mode === 'lunge' && Math.abs(a.x - d.x) < 62 && a.y > 350 || s.acid.ttl > 0 && Math.abs(a.x - s.acid.x) < 42 && a.y === 430)) { s.health--; s.hurtTimer = 90; if (s.evasion?.ticks) { s.evasion.ticks = 0; a.vx = 0; } }
      if (s.health === 0 || d.hp === 0 || near(2220, 60) && interact) {
        if (d.hp === 0) { d.mode = 'dead'; d.age = 0; }
        s.result = s.health === 0 ? 'assisted' : d.hp === 0 ? 'success' : 'retreated'; s.roleMode = 'follow'; s.acid.ttl = 0; proof('training-resolved', 'return');
      }
    }
  } else if (s.phase === 'return' && near(160) && s.walked >= 4400 && s.companions.every(c => Math.abs(c.x - 160) < 120) && interact) proof('triad-returned', 'debrief');
  else if (s.phase === 'debrief' && hold(near(160) && !a.vx && !!input.interact, 60)) proof('training-reported', 'complete');
  return { state: s, receipts };
}
export const soloV90NeedsImmediateCheckpoint = (a: SoloV90State, b: SoloV90State) => a.phase !== b.phase || a.roleMode !== b.roleMode || a.health !== b.health || a.drone.hp !== b.drone.hp || a.observedCycles !== b.observedCycles || (a.evasion?.ticks ?? 0) === 0 && (b.evasion?.ticks ?? 0) > 0 || b.replay.length >= 120;
export function soloV90Objective(s: SoloV90State) {
  const objectives: Record<SoloV90Phase, [string, string, number]> = {
    briefing: ['Trois rôles, une fenêtre', 'Écoute le vétéran. Cet entraînement prépare le rite ; il ne valide pas le Quatza-Rij ni Blooded.', 160],
    arsenal: ['Râtelier de prêt', 'Marche jusqu’au râtelier. Tiens Interaction pour contrôler les outils mécaniques du prêt ; aucune arme énergétique n’est engagée.', 780],
    assemble: ['Approche · Ouverture · Frappe', 'Signal place Saar et Vek sur leurs postes. Gagne le repère central et tiens Interaction après leur arrivée physique.', 2590],
    observe: ['Lire avant de frapper', `Observe à distance depuis le repère : tiens Interaction pour trois cycles courts de démonstration, annonce, charge, retrait (${s.observedCycles}/3). Ensuite la cible emploie toute l’aire de combat.`, 2590],
    combat: ['Combat de seuil · Entraînement', 'La charge est annoncée : saute, recule ou utilise Esquive avec une direction (sans direction : recul). Son esquive brève ne protège pas de l’acide et doit récupérer. Frappe pendant le retrait, avec Saar et Vek aux postes. Repli : Interaction au jalon arrière (2220).', 2700],
    return: ['Retour des trois', s.result === 'assisted' ? 'Tu es blessé : attends Saar à ton côté puis reviens lentement, aidé par la triade. La vitalité reste à zéro et le résultat est un échec d’entraînement.' : 'Reviens à pied jusqu’au vétéran avec Saar et Vek. Les coups reçus, contributions et l’issue sont conservés ; aucun retour instantané.', 160],
    debrief: ['Nommer les faits', 'Tiens Interaction devant le témoin : résultat réel, contributions des trois, blessures et retour. Ce rapport n’est pas une reconnaissance Blooded.', 160],
    complete: ['Préparation conservée', 'L’entraînement et le retour sont enregistrés. Le Quatza-Rij, son retour de reconnaissance et le marquage Blooded restent à accomplir.', 160],
  };
  const [title, instruction, targetX] = objectives[s.phase]; return { title, instruction, targetX };
}
/** Read-only debrief. A retreat and an assisted extraction are never renamed
 * victory; no field here can change a saved result, vitality or reward. */
export function soloV92Evaluation(s: SoloV90State) {
  if (!s.result) return null;
  return { result: s.result === 'success' ? 'Entraînement réussi' : s.result === 'retreated' ? 'Repli volontaire' : 'Extraction assistée après blessure',
    contributions: { ...s.contributions }, health: s.health,
    injury: s.health === 0 ? 'Blessure conservée ; aucun soin reçu' : s.health < 6 ? 'Blessures conservées ; aucun soin reçu' : 'Aucun coup reçu',
    reported: s.phase === 'complete' };
}
