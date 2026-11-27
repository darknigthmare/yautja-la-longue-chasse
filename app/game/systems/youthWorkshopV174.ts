export const YOUTH_WORKSHOP_GATE = 112;
export const YOUTH_WORKSHOP_REPORT = 844;
export const YOUTH_WORKSHOP_SURFACES = [
  { x: 384, label: "Pierre froide", reading: "La pierre coupe la silhouette." },
  { x: 503, label: "Eau", reading: "L’eau reflète une chaleur qui peut venir d’ailleurs." },
  { x: 624, label: "Métal chaud", reading: "Une pièce immobile peut rester très chaude." },
  { x: 746, label: "Végétal", reading: "Le feuillage découpe une silhouette irrégulière." },
] as const;
export const YOUTH_WORKSHOP_LESSONS = [
  { id: "M007", title: "Le masque et ses lectures", last: 8 },
  { id: "M008", title: "La distance des lames", last: 4 },
  { id: "M009", title: "Ce que le camouflage laisse voir", last: 4 },
  { id: "M010", title: "Le combistick revient à la main", last: 5 },
  { id: "M011", title: "Le tir qui demande une ligne", last: 6 },
  { id: "M012", title: "Le piège et le retour", last: 5 },
] as const;
export const YOUTH_WORKSHOP_RANGES = [
  ["contrast", "wide"], ["short", "parry"], ["wait", "vertical"],
  ["close", "long"], ["wait", "shift"], ["block", "detour"],
] as const;
type Route = (typeof YOUTH_WORKSHOP_RANGES)[number][number];
export type YouthWorkshopOpeningV176 = "mask" | "blades";
type Notice = "calibration" | "certainty" | "reach" | "counter" | "water" | "stones" | "leaves" | "cloak" | "off-target" | "cover" | "miss" | "ally";

interface WorkshopTool {
  x: number;
  y: number;
  flying: boolean;
  hit: boolean;
}
interface WorkshopAttempt {
  lesson: number;
  stage: number;
  stageAt: number;
  failures: number;
  route: Route | null;
  equipped: boolean;
  notice: Notice | null;
  tool: WorkshopTool | null;
}
interface WorkshopReport { tick: number; route: Route; failures: number }
export interface YouthWorkshop {
  version: 1;
  active: WorkshopAttempt | null;
  reports: WorkshopReport[];
  maskProfile?: "contrast" | "wide";
}
interface Position { x: number; y: number; facing: -1 | 1 }
interface Controls {
  interact: boolean; light: boolean; blade: boolean; jump: boolean; dodge: boolean; throw: boolean;
  moving: boolean;
}
type Signal = "step" | "warning" | "earned";
type Step = { state: YouthWorkshop; signal?: Signal; resetTo?: number };

const notices: Notice[] = ["calibration", "certainty", "reach", "counter", "water", "stones", "leaves", "cloak", "off-target", "cover", "miss", "ally"];
const near = (x: number, target: number, reach = 32) => Math.abs(x - target) <= reach;
const clamp = (x: number, min: number, max: number) => Math.max(min, Math.min(max, x));
export const workshopCanOpen = (state: YouthWorkshop | undefined) => !state?.active && (state?.reports.length ?? 0) < YOUTH_WORKSHOP_LESSONS.length;
function lessonAt(index: number, opening?: YouthWorkshopOpeningV176) {
  return opening === "blades" && index < 2 ? 1 - index : index;
}
export const workshopHasMaskReport = (state: YouthWorkshop | undefined, opening?: YouthWorkshopOpeningV176) =>
  (state?.reports.length ?? 0) > lessonAt(0, opening);
export function startYouthWorkshop(state: YouthWorkshop | undefined, tick: number, opening?: YouthWorkshopOpeningV176): YouthWorkshop {
  const progress: YouthWorkshop = state ?? { version: 1, active: null, reports: [] };
  return { ...progress, active: { lesson: lessonAt(progress.reports.length, opening), stage: 0, stageAt: tick,
    failures: 0, route: null, equipped: false, notice: null, tool: null } };
}
export const youthWorkshopEquipment = (state: YouthWorkshop | undefined, opening?: YouthWorkshopOpeningV176) => state ? {
  maskCalibrated: workshopHasMaskReport(state, opening), wristTiming: state.reports.length > lessonAt(1, opening),
  cloak: state.reports.length >= 3, combistick: state.reports.length >= 4,
  speargun: state.reports.length >= 5, minesAccess: state.reports.length >= 6,
  ...(state.maskProfile ? { maskProfile: state.maskProfile } : {}),
} : undefined;
export const youthWorkshopObstacles = (attempt: WorkshopAttempt) =>
  attempt.lesson === 1 && attempt.stage === 3 && attempt.equipped ? [{ x: 691, y: 278, width: 54, height: 152 }]
    : attempt.lesson === 2 && attempt.route === "vertical" ? [{ x: 566, y: 370, width: 179, height: 60 }]
    : attempt.lesson === 3 ? [{ x: 578, y: 380, width: 66, height: 50 }]
    : attempt.lesson === 4 ? [{ x: 522, y: 358, width: 55, height: 72 }]
    : [];

export function workshopTarget(attempt: WorkshopAttempt, tick: number) {
  const phase = tick - attempt.stageAt;
  if (attempt.lesson === 0) return { x: attempt.stage < 2 ? 360 : 394 + 32 * Math.sin(phase / 11), y: 352 };
  if (attempt.lesson === 3) return { x: 658 + 34 * Math.sin(phase / 19), y: 362 };
  const row = Math.floor(attempt.stage / 2);
  return { x: 754, y: row === 0 ? 378 : row === 1 ? 352 : 345 + 45 * Math.sin(phase / 18) };
}
export function workshopSightBlocked(attempt: WorkshopAttempt, player: Position, tick: number) {
  const target = workshopTarget(attempt, tick);
  if (player.x >= 577) return false;
  const originY = player.y - 74;
  const y = (x: number) => originY + (target.y - originY) * (x - player.x) / (target.x - player.x);
  return Math.max(y(522), y(577)) >= 358;
}
export function stepYouthWorkshop(state: YouthWorkshop, a: Position, input: Controls, tick: number): Step {
  const old = state.active;
  if (!old) return { state };
  const { lesson, stage, stageAt } = old;
  const next = (patch: Partial<WorkshopAttempt>, signal?: Signal, resetTo?: number): Step =>
    ({ state: { ...state, active: { ...old, ...patch } }, signal, resetTo });
  const go = (stage: number, patch: Partial<WorkshopAttempt> = {}): Step => next({ stage, stageAt: tick, notice: null, ...patch }, "step");
  const fail = (notice: Notice, resetTo?: number, patch: Partial<WorkshopAttempt> = {}): Step =>
    next({ notice, failures: old.failures + 1, ...patch }, "warning", resetTo);
  const interact = input.interact && !input.moving;
  if (stage === YOUTH_WORKSHOP_LESSONS[lesson].last) {
    if (!interact || !old.route || !near(a.x, YOUTH_WORKSHOP_REPORT) || a.y !== 430) return { state };
    return { state: { ...state, active: null, reports: [...state.reports, { tick, route: old.route, failures: old.failures }],
      ...(old.route === "contrast" || old.route === "wide" ? { maskProfile: old.route } : {}) }, signal: "earned", resetTo: YOUTH_WORKSHOP_GATE };
  }

  switch (lesson) {
    case 0: {
      if (stage === 0 && interact && near(a.x, 196)) return go(1);
      if (stage === 1) {
        if (near(a.x, 196) && (input.light || input.blade)) return next({ route: input.light ? "contrast" : "wide" }, "step");
        if (old.route && interact && near(a.x, 315) && a.facing === 1) return go(2);
      }
      if (stage === 2 && interact && near(a.x, 315) && a.facing === 1) {
        return Math.abs(workshopTarget(old, tick).x - 394) <= 18 ? go(3)
          : fail("calibration", undefined, { stage: 1, stageAt: tick });
      }
      if (stage >= 3 && stage <= 6 && interact && near(a.x, YOUTH_WORKSHOP_SURFACES[stage - 3].x)) return go(stage + 1);
      if (stage === 7 && near(a.x, YOUTH_WORKSHOP_REPORT)) {
        if (input.light) return go(8);
        if (input.blade) return fail("certainty");
      }
      break;
    }
    case 1: {
      if (input.blade && !(stage === 3 && a.x > 671 && a.x < 765)) return stage === 0 ? go(1, { equipped: true }) : next({ equipped: !old.equipped }, "step");
      if (stage === 1 && input.light && old.equipped) {
        if (a.x >= 450 && a.x <= 523 && a.facing === 1 && a.y === 430) return go(2, { route: "short" });
        return fail("reach");
      }
      if (stage === 2) {
        if (input.dodge && tick - stageAt >= 8 && a.x >= 424 && a.x <= 532) return go(3, { route: "parry" });
        if (a.x <= 420) return go(3);
        if (tick - stageAt >= 32) return fail("counter", 460, { stage: 1, stageAt: tick, route: null });
      }
      if (stage === 3 && !old.equipped && a.x >= 777 && a.y === 430) return go(4);
      break;
    }
    case 2: {
      if (input.blade) return next({ equipped: !old.equipped }, "step");
      if (stage === 0 && a.x >= 302 && a.x <= 404 && input.moving && old.equipped && a.y === 430) {
        return fail("water", 430, { stage: 1, stageAt: tick });
      }
      if (stage === 1 && interact && near(a.x, 464)) return go(2);
      if (stage === 2 && old.equipped && near(a.x, 527)) {
        if (input.jump) return go(3, { route: "vertical" });
        if (interact) return go(3, { route: "wait" });
      }
      if (stage === 3) {
        if (!old.equipped) return fail("cloak", 527, { stage: 2, stageAt: tick, route: null });
        if (old.route === "wait" && a.x > 552 && tick - stageAt < 42) return fail("cloak", 527, { stage: 2, stageAt: tick, route: null });
        if (a.x >= 565 && a.x <= 745 && a.y === 430 && input.moving && !input.dodge) {
          return fail(a.x <= 650 ? "stones" : "leaves", 527, { stage: 2, stageAt: tick, route: null });
        }
        if (a.x >= 782 && a.y === 430) return go(4);
      }
      break;
    }
    case 3: {
      if (stage === 0 && interact && near(a.x, 180)) return go(1);
      if (stage === 1 && input.blade) return go(2, { equipped: true });
      if (stage === 2 && input.light && near(a.x, 467, 36)) return next({ route: "close" }, "step");
      if (stage === 2 && input.throw && a.facing === 1 && a.x >= (old.route === "close" ? 436 : 244) && a.x <= 526) {
        const route = old.route ?? "long";
        return go(3, { route, equipped: false, tool: { x: a.x, y: a.y - 69, flying: true, hit: false } });
      }
      if (stage === 3 && old.tool) {
        const x = old.tool.x + 15;
        const y = old.tool.y + Math.max(0, tick - stageAt - 4) * .14;
        const target = workshopTarget(old, tick);
        const close = Math.abs(x - target.x) <= 18 && Math.abs(y - target.y) <= 31;
        if (close) return go(4, { tool: { x: target.x, y: 414, flying: false, hit: true } });
        if (x >= 824 || y >= 426) return fail("off-target", undefined, { stage: 4, stageAt: tick, tool: { x: clamp(x, 669, 824), y: 415, flying: false, hit: false } });
        return next({ tool: { x, y, flying: true, hit: false } });
      }
      if (stage === 4 && old.tool && interact && near(a.x, old.tool.x) && a.y === 430) {
        return old.tool.hit ? go(5, { tool: null, equipped: true }) : { ...go(2, { tool: null, equipped: true }), resetTo: 409 };
      }
      break;
    }
    case 4: {
      const row = Math.floor(stage / 2);
      if (stage % 2 === 0 && input.light && a.facing === 1 && a.x >= 210 && a.x <= 716) {
        const target = workshopTarget(old, tick);
        const blocked = workshopSightBlocked(old, a, tick);
        const hit = !blocked && Math.abs(a.y - 74 - target.y) <= [39, 22, 17][row];
        const tool = { x: blocked ? 499 : hit ? target.x : clamp(a.x + 61, 256, 804), y: 410, flying: false, hit };
        const patch = { stage: stage + 1, stageAt: tick, route: old.route ?? (a.x < 522 ? "wait" as const : "shift" as const), tool };
        return hit ? go(stage + 1, patch) : fail(blocked ? "cover" : "miss", undefined, patch);
      }
      if (stage % 2 === 1 && old.tool && interact && near(a.x, old.tool.x) && a.y === 430) {
        return go(old.tool.hit ? stage + 1 : stage - 1, { tool: null, ...(!old.tool.hit && stage === 1 ? { route: null } : {}) });
      }
      break;
    }
    case 5: {
      if (stage === 0 && old.tool) {
        if (interact && near(a.x, old.tool.x)) return next({ tool: null, notice: null }, "step");
        break;
      }
      if (stage === 0 && interact && a.x >= 385 && a.x <= 701 && a.y === 430) {
        if (a.x >= 595) return fail("ally", undefined, { tool: { x: a.x, y: 414, flying: false, hit: false } });
        return go(1, { route: a.x < 470 ? "block" : "detour", tool: { x: a.x, y: 414, flying: false, hit: false } });
      }
      if (stage === 1 && old.tool && interact && near(a.x, old.tool.x)) return go(2, { equipped: true });
      if (stage === 2 && old.tool && 322 + (tick - stageAt) * 3 >= old.tool.x - 36) {
        return go(3, { equipped: false, tool: { ...old.tool, hit: true } });
      }
      if (stage === 3 && a.x >= 785) return go(4);
      if (stage === 4 && old.tool && interact && near(a.x, old.tool.x)) return go(5, { tool: null });
      break;
    }
  }
  return { state };
}

export function workshopObjective(state: YouthWorkshop | undefined, x: number) {
  const a = state?.active;
  const title = a ? YOUTH_WORKSHOP_LESSONS[a.lesson].title : "Ateliers Unblooded";
  if (!a) return { title, instruction: "Rejoins la porte des ateliers à gauche et interagis.", targetX: YOUTH_WORKSHOP_GATE };
  const stage = a.stage;
  const floor = (instruction: string, targetX: number | null) => ({ title, instruction, targetX });
  if (stage === YOUTH_WORKSHOP_LESSONS[a.lesson].last) return floor("Rejoins le pupitre de droite et interagis pour consigner l’exercice.", YOUTH_WORKSHOP_REPORT);
  switch (a.lesson) {
    case 0:
      if (stage === 0) return floor("À l’établi, interagis pour monter les attaches du masque.", 196);
      if (stage === 1 && (!a.route || near(x, 196))) return floor(a.route
        ? "Profil réglé. Tu peux le changer ici ou rejoindre la balise de la cible fixe."
        : "À l’établi, utilise Frappe pour le contraste ou Lame pour la lecture large.", 196);
      if (stage <= 2) return floor(stage === 1 ? "Face à la cible fixe, interagis à la balise.": "Sur la balise, interagis quand la cible mobile rejoint le cadre.", 315);
      if (stage <= 6) return floor(YOUTH_WORKSHOP_SURFACES[stage - 3].label + " · rejoins le panneau et interagis pour lire sa signature.", YOUTH_WORKSHOP_SURFACES[stage - 3].x);
      return floor("Au pupitre, réponds avec Frappe si le masque indique une signature, ou Lame si elle suffit à identifier la cible.", YOUTH_WORKSHOP_REPORT);
    case 1:
      if (stage === 0) return floor("Utilise Lame pour sortir les lames d’exercice.", null);
      if (stage === 1) return floor("Approche par la droite du repère de portée puis utilise Frappe face au mannequin, lames sorties.", 484);
      if (stage === 2) return floor("Le bras mécanique prépare son retour. Recule immédiatement ou pare avec Esquive dès que le signal s’allume.", 414);
      return floor("Rentre les lames avant de franchir le passage étroit.", 789);
    case 2:
      if (stage === 0) return floor("Utilise Lame pour te camoufler, puis traverse la flaque à pied.", 357);
      if (stage === 1) return floor("Interagis avec l’écran pour examiner ta trace dans l’eau.", 464);
      if (stage === 2) return floor("Au couvert, camoufle-toi puis interagis pour attendre, ou saute pour prendre la corniche.", 527);
      return floor(a.route === "wait"
        ? "Attends que le signal s’éteigne. Traverse ensuite pierres et feuilles en tenant Esquive pour ralentir."
        : "Saute sur la corniche et traverse-la sans toucher le sol dans les feuilles.", 787);
    case 3:
      if (stage === 0) return floor("Au râtelier, interagis pour prendre le combistick replié.", 180);
      if (stage === 1) return floor("Utilise Lame pour déployer la hampe.", null);
      if (stage === 2) return floor("Utilise Projection pour lancer à l’horizontale. Tu peux tester la portée courte avec Frappe près du repère.", a.route === "close" ? 467 : 310);
      if (stage === 3) return floor("Suis le trajet du combistick puis franchis la traverse.", 678);
      return floor("Franchis la traverse et interagis au contact du combistick pour le récupérer.", a.tool?.x ?? null);
    case 4:
      return a.tool ? floor("Rejoins le harpon d’exercice et interagis pour le récupérer.", a.tool.x)
        : floor("Face à la cible, utilise Frappe. Une visée rouge rencontre la couverture. Attends l’ouverture ou change de poste.", x <= 522 ? 412 : 663);
    default:
      if (stage === 0) return a.tool ? floor("Reprends le disque à son emplacement avant de le déplacer.", a.tool.x) : floor("Interagis sur un repère pour poser le disque d’exercice. Laisse libre le trajet vert du mannequin allié.", 454);
      if (stage === 1) return floor("Au contact du disque, interagis pour armer le marquage.", a.tool?.x ?? null);
      if (stage === 2) return floor("Observe le passage de la cible sur le rail.", a.tool?.x ?? null);
      if (stage === 3) return floor("Traverse le couloir et atteins le repère de droite.", 791);
      return floor("Reviens à la mine et interagis pour récupérer le disque d’exercice.", a.tool?.x ?? null);
  }
}
export function workshopFeedback(state: YouthWorkshop, tick: number) {
  const a = state.active;
  if (!a) return state.reports.length ? "Exercice consigné." : "";
  if (a.lesson === 0 && a.stage >= 4 && a.stage <= 7) return YOUTH_WORKSHOP_SURFACES[a.stage - 4].reading;
  if (a.lesson === 1 && a.stage === 2 && tick - a.stageAt >= 8) return "Signal de parade allumé.";
  if (a.lesson === 2 && a.stage === 3 && a.route === "wait" && tick - a.stageAt >= 42) return "Signal éteint. Avance accroupi.";
  if (a.lesson === 2 && a.stage === 2 && !a.notice) return "L’écran a enregistré les ondulations de ton passage camouflé.";
  switch (a.notice) {
    case "calibration": return "Cible hors cadre. Reprends sur la cible fixe.";
    case "certainty": return "Une signature ne permet pas de conclure à une identité.";
    case "reach": return "Le coup est parti hors de portée.";
    case "counter": return "Le bras t’a rejoint. Reprise à la dernière balise.";
    case "water": return "Détecté par les ondulations. Reprise sur la rive couverte.";
    case "stones": return "Les pierres ont bougé sous tes pas.";
    case "leaves": return "Le feuillage a gardé ton passage.";
    case "cloak": return "Détecté. Reprends depuis le couvert et attends le signal.";
    case "off-target": return "Lancer hors cible. La hampe est au sol, après la traverse.";
    case "cover": return "La couverture a arrêté le harpon. Récupère-le.";
    case "miss": return "Harpon hors cible. Va le récupérer.";
    case "ally": return "Le rayon recouvre le trajet de l’allié. Déplace le disque.";
    default: return "";
  }
}

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const int = (value: unknown, min: number, max: number): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= min && value <= max;
const finite = (value: unknown, min: number, max: number): value is number => typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
function validRoute(lesson: number, value: unknown): value is Route {
  return (YOUTH_WORKSHOP_RANGES[lesson] as readonly unknown[]).includes(value);
}
export function normalizeYouthWorkshop(value: unknown, tick: number, opening?: YouthWorkshopOpeningV176): YouthWorkshop | null {
  if (!record(value) || value.version !== 1 || !Array.isArray(value.reports) || value.reports.length > YOUTH_WORKSHOP_LESSONS.length) return null;
  const reports: WorkshopReport[] = [];
  for (const [index, item] of value.reports.entries()) {
    if (!record(item) || !int(item.tick, (reports.at(-1)?.tick ?? 0) + 1, tick) ||
        !int(item.failures, 0, item.tick) || !validRoute(lessonAt(index, opening), item.route)) return null;
    reports.push({ tick: item.tick, route: item.route, failures: item.failures });
  }
  const profile = value.maskProfile === "contrast" || value.maskProfile === "wide" ? value.maskProfile : undefined;
  if (reports.length > lessonAt(0, opening) ? !profile : value.maskProfile !== undefined) return null;
  if (value.active === null) return { version: 1, active: null, reports, ...(profile ? { maskProfile: profile } : {}) };
  const a = value.active;
  if (!record(a) || !int(a.lesson, 0, 5) || a.lesson !== lessonAt(reports.length, opening) ||
      !int(a.stage, 0, YOUTH_WORKSHOP_LESSONS[a.lesson].last) || !int(a.stageAt, (reports.at(-1)?.tick ?? 0) + 1, tick) ||
      !int(a.failures, 0, tick) || typeof a.equipped !== "boolean" ||
      (a.notice !== null && !(notices as readonly unknown[]).includes(a.notice)) ||
      (a.route !== null && !validRoute(a.lesson, a.route))) return null;
  const routeFrom = [2, 2, 3, 3, 1, 1][a.lesson];
  if (a.stage >= routeFrom && a.route === null) return null;
  const needsTool = a.lesson === 3 && (a.stage === 3 || a.stage === 4)
    || a.lesson === 4 && a.stage % 2 === 1 || a.lesson === 5 && a.stage >= 1 && a.stage < 5;
  let tool: WorkshopTool | null = null;
  if (needsTool || a.tool !== null) {
    if (!record(a.tool) || !finite(a.tool.x, 70, 890) || !finite(a.tool.y, 190, 430) ||
        typeof a.tool.flying !== "boolean" || typeof a.tool.hit !== "boolean" ||
        a.tool.flying !== (a.lesson === 3 && a.stage === 3) ||
        (!needsTool && !(a.lesson === 5 && a.stage === 0 && a.notice === "ally" && !a.tool.hit))) return null;
    tool = { x: a.tool.x, y: a.tool.y, flying: a.tool.flying, hit: a.tool.hit };
  }
  const active: WorkshopAttempt = { lesson: a.lesson, stage: a.stage, stageAt: a.stageAt, failures: a.failures,
    route: a.route as Route | null, equipped: a.equipped, notice: a.notice as Notice | null, tool };
  return { version: 1, active, reports, ...(profile ? { maskProfile: profile } : {}) };
}
export function youthWorkshopProgressMatches(before: YouthWorkshop | undefined, after: YouthWorkshop | undefined) {
  if (!before) return !after || after.reports.length === 0 && after.active?.stage === 0;
  if (!after || after.reports.length < before.reports.length || after.reports.length > before.reports.length + 1
      || before.reports.some((report, index) => JSON.stringify(report) !== JSON.stringify(after.reports[index]))) return false;
  const old = before.active, next = after.active, fresh = after.reports.length > before.reports.length;
  if (fresh) return Boolean(old && !next && old.stage === YOUTH_WORKSHOP_LESSONS[old.lesson].last
    && after.reports.at(-1)?.route === old.route && after.reports.at(-1)?.failures === old.failures);
  if (old) {
    if (!next || next.lesson !== old.lesson || next.failures < old.failures || next.stageAt < old.stageAt) return false;
    if (next.stage < old.stage) {
      const retried = old.lesson === 0 && old.stage === 2 && next.stage === 1
        || old.lesson === 1 && old.stage === 2 && next.stage === 1
        || old.lesson === 2 && old.stage === 3 && next.stage === 2;
      const retrieved = old.lesson === 3 && old.stage === 4 && next.stage === 2 && old.tool?.hit === false
        || old.lesson === 4 && old.stage % 2 === 1 && next.stage === old.stage - 1 && old.tool?.hit === false;
      return Boolean(retrieved || retried && next.failures > old.failures);
    }
    return next.stage <= old.stage + 1 && (next.stage === old.stage || next.stageAt > old.stageAt);
  }
  return !next || next.stage === 0;
}
