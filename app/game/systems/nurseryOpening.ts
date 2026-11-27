/** The detached latch and staged net are original nursery props. All distances use
 * the same fixed-step canvas coordinates as the prologue. */
export const NURSERY_OPENING = {
  playerStart: 328, left: 112, right: 844, toolX: 360, shelterX: 222,
  coverMinX: 246, baitX: 415, ropeX: 534, gateX: 842, looseBeastX: 722, allyX: 240,
  instructorX: 807, radius: 38, latchTicks: 72, rescueTicks: 90,
  coverTicks: 48, recoverTicks: 20, closeReach: 84,
} as const;

const TACTICS = {
  bait: { label: "Déposer l’appât", origin: 600, step: 67, pushes: 3, netX: 801, warning: 60 },
  net: { label: "Avancer le filet", origin: 634, step: 71, pushes: 2, netX: 776, warning: 47 },
} as const;
type Tactic = keyof typeof TACTICS;
const STAGES = ["latch", "tool", "cover", "tactic", "drive", "rescue", "resolved"] as const;
type Stage = typeof STAGES[number];
const MOTIONS = ["rest", "warning", "charge", "recover"] as const;
type Motion = typeof MOTIONS[number];

export interface NurseryOpening {
  stage: Stage;
  x: number;
  facing: -1 | 1;
  walking: boolean;
  /** The animal retreats to the next position only after a real close-range action. */
  beastX: number;
  tactic: Tactic | null;
  motion: Motion;
  ticks: number;
  coverTicks: number;
  pushes: number;
  rescues: number;
  openingResolved: boolean;
  openingSuccess: boolean;
}

export function createNurseryOpening(): NurseryOpening {
  return { stage: "latch", x: NURSERY_OPENING.playerStart, facing: 1, walking: false, beastX: NURSERY_OPENING.gateX,
    tactic: null, motion: "rest", ticks: 0, coverTicks: 0, pushes: 0, rescues: 0,
    openingResolved: false, openingSuccess: false };
}

export const nurseryOpeningNetX = (opening: NurseryOpening): number =>
  opening.tactic ? TACTICS[opening.tactic].netX : TACTICS.bait.netX;

const near = (opening: NurseryOpening, x: number) => Math.abs(opening.x - x) <= NURSERY_OPENING.radius;
const warningLength = (tactic: Tactic, rescues: number) => TACTICS[tactic].warning + (rescues > 0 ? 16 : 0);
export function nurseryOpeningWindow(opening: NurseryOpening): boolean {
  return Boolean(opening.stage === "drive" && opening.tactic && (
    opening.motion === "charge" ||
    opening.motion === "warning" && opening.ticks >= warningLength(opening.tactic, opening.rescues) - 30
  ));
}
const canDrive = (opening: NurseryOpening) => {
  const distance = opening.beastX - opening.x;
  return nurseryOpeningWindow(opening) && distance >= 0 && distance <= NURSERY_OPENING.closeReach;
};
const interaction = (opening: NurseryOpening): string | null => {
  switch (opening.stage) {
    case "tool": return near(opening, NURSERY_OPENING.toolX) ? "Ramasser l’outil en bois" : null;
    case "cover": return near(opening, NURSERY_OPENING.shelterX) ? "Faire passer Tov" : null;
    case "tactic":
      if (near(opening, NURSERY_OPENING.baitX)) return TACTICS.bait.label;
      return near(opening, NURSERY_OPENING.ropeX) ? TACTICS.net.label : null;
    case "drive": return canDrive(opening) ? "Repousser la charge" : null;
    case "rescue": return opening.ticks >= NURSERY_OPENING.rescueTicks ? "Reprendre avec Saar" : null;
    case "resolved": return opening.ticks >= 30 ? "Poursuivre l’entraînement" : null;
    default: return null;
  }
};

const PROMPTS = {
  latch: "Saar accompagne la bête d’exercice par le passage de service. Le loquet plie.",
  tool: "Le loquet a cédé. Récupère l’outil d’exercice au sol.",
  cover: "Rejoins l’abri à gauche. Reste entre la bête et Tov pendant qu’il sort.",
  tactic: "Dépose l’appât pour ralentir la charge, ou rapproche le filet pour réduire la distance à parcourir.",
  drive: "Approche la bête par la gauche. Repousse-la avec l’outil quand le sol s’illumine.",
  rescue: "Saar te couvre et repousse la bête. Attends son signal pour reprendre depuis son repère.",
  resolved: "Saar ferme le filet. La bête est contenue et Tov est à l’abri.",
} as const;

export function nurseryOpeningCue(opening: NurseryOpening) {
  return { prompt: PROMPTS[opening.stage], action: interaction(opening),
    assisted: opening.stage === "resolved" && !opening.openingSuccess };
}

export interface NurseryOpeningStep {
  state: NurseryOpening;
  cue?: "latch" | "tool" | "impact" | "capture" | "assist";
  finished?: boolean;
}

/** One tick. Touch, keyboard and gamepad all dispatch the same spatial action. */
export function stepNurseryOpening(previous: NurseryOpening, move: -1 | 0 | 1, use: boolean): NurseryOpeningStep {
  const state = { ...previous };
  const result: NurseryOpeningStep = { state };
  const go = (stage: Stage) => { state.stage = stage; state.ticks = 0; };
  const switchMotion = (motion: Motion) => { state.motion = motion; state.ticks = 0; };
  state.walking = false;
  if (state.stage !== "rescue" && state.stage !== "resolved") {
    const right = Math.min(NURSERY_OPENING.right, state.beastX - 36);
    const left = state.stage === "cover" ? NURSERY_OPENING.coverMinX : NURSERY_OPENING.left;
    state.x = Math.min(right, Math.max(left, state.x + move * 3));
    state.walking = state.x !== previous.x;
    if (move) state.facing = move;
  }
  state.ticks++;
  if (STAGES.indexOf(state.stage) > STAGES.indexOf("cover")) {
    state.coverTicks = Math.min(NURSERY_OPENING.coverTicks, state.coverTicks + 1);
  }
  switch (state.stage) {
    case "latch":
      if (state.ticks >= NURSERY_OPENING.latchTicks - 24) {
        state.beastX = NURSERY_OPENING.gateX - (state.ticks - (NURSERY_OPENING.latchTicks - 24)) * 5;
      }
      if (state.ticks === NURSERY_OPENING.latchTicks - 23) result.cue = "latch";
      if (state.ticks >= NURSERY_OPENING.latchTicks) go("tool");
      break;
    case "tool":
      if (use && interaction(state)) {
        result.cue = "tool";
        go("cover");
      }
      break;
    case "cover":
      if (use && interaction(state)) go("tactic");
      break;
    case "tactic":
      if (use && interaction(state)) {
        state.tactic = near(state, NURSERY_OPENING.baitX) ? "bait" : "net";
        state.motion = "recover";
        go("drive");
      }
      break;
    case "drive": {
      if (!state.tactic) break;
      const tactic = TACTICS[state.tactic];
      if (use && canDrive(state)) {
        state.pushes++;
        state.facing = 1;
        result.cue = "impact";
        switchMotion("recover");
      } else if (state.motion === "recover") {
        const goal = tactic.origin + tactic.step * state.pushes;
        state.beastX += (goal - state.beastX) / Math.max(1, NURSERY_OPENING.recoverTicks - state.ticks + 1);
        if (state.ticks >= NURSERY_OPENING.recoverTicks) {
          if (state.pushes === tactic.pushes) {
            state.openingResolved = true;
            state.openingSuccess = state.rescues === 0;
            state.motion = "rest";
            result.cue = "capture";
            go("resolved");
          } else switchMotion("warning");
        }
      } else if (state.motion === "warning") {
        if (state.ticks >= warningLength(state.tactic, state.rescues)) switchMotion("charge");
      } else if (state.motion === "charge") {
        state.beastX = Math.max(NURSERY_OPENING.left + 32, state.beastX - 7);
        if (state.beastX - state.x <= 33) {
          state.rescues++;
          state.motion = "rest";
          result.cue = "assist";
          go("rescue");
        } else if (state.ticks >= 30) switchMotion("recover");
      }
      break;
    }
    case "rescue":
      if (state.tactic && state.ticks >= 42 && state.ticks <= NURSERY_OPENING.rescueTicks) {
        state.beastX += (TACTICS[state.tactic].origin - state.beastX) /
          (NURSERY_OPENING.rescueTicks - state.ticks + 1);
      }
      if (use && interaction(state) && state.tactic) {
        const tactic = TACTICS[state.tactic];
        state.beastX = tactic.origin;
        state.x = tactic.origin - 74;
        state.facing = 1;
        state.pushes = 0;
        state.motion = "warning";
        go("drive");
      }
      break;
    case "resolved":
      if (use && interaction(state)) result.finished = true;
      break;
  }
  return result;
}

export function normalizeNurseryOpening(raw: unknown): NurseryOpening | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const state = raw as NurseryOpening;
  const finite = (n: unknown, from: number, to: number) => typeof n === "number" && Number.isFinite(n) && n >= from && n <= to;
  const count = (n: unknown, to: number) => typeof n === "number" && Number.isSafeInteger(n) && n >= 0 && n <= to;
  if (!STAGES.includes(state.stage) || !MOTIONS.includes(state.motion) ||
      (state.facing !== -1 && state.facing !== 1) || ![null, "bait", "net"].includes(state.tactic) ||
      !finite(state.x, NURSERY_OPENING.left, NURSERY_OPENING.right) ||
      !finite(state.beastX, NURSERY_OPENING.left + 32, NURSERY_OPENING.gateX) ||
      !count(state.ticks, 3_600_000) || !count(state.coverTicks, NURSERY_OPENING.coverTicks) ||
      !count(state.pushes, 3) || !count(state.rescues, 3_600_000)) return null;
  const tactic = state.tactic && TACTICS[state.tactic];
  const finished = state.stage === "resolved";
  const afterChoice = finished || state.stage === "rescue" || state.stage === "drive";
  if (Boolean(tactic) !== afterChoice || (!afterChoice && (state.pushes !== 0 || state.rescues !== 0)) ||
      (state.stage === "drive") === (state.motion === "rest") ||
      state.stage === "rescue" && state.rescues === 0 ||
      state.stage === "latch" && state.ticks >= NURSERY_OPENING.latchTicks ||
      state.stage === "drive" && state.motion === "recover" && state.ticks >= NURSERY_OPENING.recoverTicks ||
      state.stage === "drive" && state.motion === "charge" && state.ticks >= 30 ||
      state.stage === "drive" && state.motion === "warning" && state.tactic && state.ticks >= warningLength(state.tactic, state.rescues) ||
      state.stage === "drive" && tactic && state.pushes === tactic.pushes && state.motion !== "recover" ||
      state.stage === "rescue" && tactic && state.pushes === tactic.pushes ||
      (tactic && state.pushes > tactic.pushes) || (finished && (!tactic || state.pushes !== tactic.pushes)) ||
      state.openingResolved !== finished || state.openingSuccess !== (finished && state.rescues === 0)) return null;
  return { stage: state.stage, x: state.x, facing: state.facing, walking: false, beastX: state.beastX, tactic: state.tactic,
    motion: state.motion, ticks: state.ticks, coverTicks: state.coverTicks, pushes: state.pushes,
    rescues: state.rescues, openingResolved: state.openingResolved, openingSuccess: state.openingSuccess };
}

/** This was an additive scene. Saves already in or beyond the duel remain playable. */
export function keepsNurseryOpening(previous: NurseryOpening | undefined, next: NurseryOpening | undefined): boolean {
  if (!previous) return true;
  if (!next || next.rescues < previous.rescues || previous.tactic && next.tactic !== previous.tactic) return false;
  if (previous.openingResolved) return next.openingResolved && next.openingSuccess === previous.openingSuccess && next.rescues === previous.rescues;
  if (previous.stage === "rescue" && next.stage === "drive") return true;
  return STAGES.indexOf(next.stage) >= STAGES.indexOf(previous.stage) &&
    (next.rescues !== previous.rescues || next.pushes >= previous.pushes);
}
