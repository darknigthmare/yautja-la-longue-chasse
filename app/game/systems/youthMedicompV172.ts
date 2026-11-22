export const YOUTH_MEDICOMP = {
  kitX: 334,
  exitX: 490,
  screenX: 753,
  alcoveX: 844,
  reach: 27,
  alertTick: 34,
  duration: 96,
} as const;

const stages = ["cover", "ready", "treating", "alert", "resume", "complete"] as const;
export interface YouthMedicomp {
  version: 1;
  stage: typeof stages[number];
  route: "unchecked" | "prepared" | "reactive";
  treatedTicks: number;
  alertCleared: boolean;
}
export function createYouthMedicomp(): YouthMedicomp {
  return { version: 1, stage: "cover", route: "unchecked", treatedTicks: 0, alertCleared: false };
}
export function youthMedicompCharges(state: YouthMedicomp): number {
  return state.stage === "cover" || state.stage === "ready" ? 3 : 2;
}

export const nearYouthMedicomp = (x: number, target: number): boolean => Math.abs(x - target) <= YOUTH_MEDICOMP.reach;

export function stepYouthMedicomp(state: YouthMedicomp, x: number, stationary: boolean, interact: boolean): YouthMedicomp {
  const { alcoveX, screenX, exitX, alertTick, duration } = YOUTH_MEDICOMP;
  if (state.stage === "complete") return state;
  if (state.stage === "treating") {
    if (!stationary || !nearYouthMedicomp(x, alcoveX)) return { ...state, stage: "resume" };
    const treatedTicks = state.treatedTicks + 1;
    if (treatedTicks === alertTick && !state.alertCleared) return { ...state, treatedTicks, stage: "alert" };
    return { ...state, treatedTicks, ...(treatedTicks === duration ? { stage: "complete" as const } : {}) };
  }
  if (!stationary || !interact) return state;
  if ((state.stage === "cover" || state.stage === "ready") && state.route === "unchecked" && nearYouthMedicomp(x, exitX)) {
    return { ...state, route: "prepared" };
  }
  if (state.stage === "cover" && nearYouthMedicomp(x, screenX)) return { ...state, stage: "ready" };
  if ((state.stage === "ready" || state.stage === "resume") && nearYouthMedicomp(x, alcoveX)) {
    return { ...state, stage: "treating" };
  }
  if (state.stage === "alert") {
    if (state.route === "prepared" && nearYouthMedicomp(x, alcoveX)) return { ...state, stage: "resume", alertCleared: true };
    if (state.route === "unchecked" && nearYouthMedicomp(x, exitX)) return { ...state, route: "reactive", stage: "resume", alertCleared: true };
  }
  return state;
}

export function normalizeYouthMedicomp(value: unknown): YouthMedicomp | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const { version, stage, route, treatedTicks, alertCleared } = value as Partial<YouthMedicomp>;
  if (version !== 1 || stage === undefined || !stages.includes(stage) ||
      (route !== "unchecked" && route !== "prepared" && route !== "reactive") ||
      typeof treatedTicks !== "number" || !Number.isInteger(treatedTicks) || treatedTicks < 0 ||
      treatedTicks > YOUTH_MEDICOMP.duration || typeof alertCleared !== "boolean") return null;
  if ((stage === "cover" || stage === "ready") && (treatedTicks !== 0 || alertCleared) ||
      stage === "alert" && (treatedTicks !== YOUTH_MEDICOMP.alertTick || alertCleared) ||
      stage !== "alert" && ((treatedTicks >= YOUTH_MEDICOMP.alertTick) !== alertCleared) ||
      (stage === "complete") !== (treatedTicks === YOUTH_MEDICOMP.duration) ||
      alertCleared && route === "unchecked" || route === "reactive" && !alertCleared) return null;
  return { version, stage, route, treatedTicks, alertCleared };
}

export function youthMedicompObjective(state: YouthMedicomp) {
  const { alcoveX, screenX, exitX } = YOUTH_MEDICOMP;
  switch (state.stage) {
    case "cover": return { targetX: screenX, instruction: "Rejoins l’écran de l’alcôve et ferme-le. Tu peux d’abord contrôler la sortie au repère du couloir." };
    case "ready": return { targetX: alcoveX, instruction: "Rejoins l’alcôve, arrête-toi et interagis pour utiliser une charge." };
    case "treating": return { targetX: alcoveX, instruction: "Reste immobile pour poursuivre le soin." };
    case "alert":
      return state.route === "prepared"
        ? { targetX: alcoveX, instruction: "Alerte extérieure. La sortie a été vérifiée. Depuis l’abri, interagis pour confirmer le signal." }
        : { targetX: exitX, instruction: "Alerte extérieure. Rejoins le repère du couloir pour vérifier la sortie. Ton soin et la charge consommée restent enregistrés." };
    case "resume": return { targetX: alcoveX, instruction: "Arrête-toi dans l’alcôve et interagis pour reprendre le soin." };
    case "complete": return { targetX: 680, instruction: "Soin enregistré. Rejoins la couche si tu veux passer la nuit." };
  }
}
