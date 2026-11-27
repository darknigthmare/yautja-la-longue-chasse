export const LION_SURVEY_WINDOWS_V174 = {
  dusk: { label: "Crépuscule", detail: "Le couloir bas est encore praticable. La crue monte pendant la marche." },
  night: { label: "Nuit", detail: "Le bras d’eau a isolé la plaine. La levée reste ouverte." },
} as const;
export const LION_SURVEY_DEPOSIT_V174 = { x: 0, lane: 0 } as const;
export const LION_SURVEY_WIDTH_V174 = 7;
export const LION_SURVEY_MARKERS_V174 = [
  { id: "tracks", name: "Empreintes dans le limon", x: 2, lane: 0,
    detail: "Plusieurs traces de lionnes convergent vers le couvert de l’îlot." },
  { id: "pride", name: "Lisière de la troupe", x: 5, lane: 1,
    detail: "Depuis le couvert, le biomask consigne la troupe à distance. Son trajet passe près de la rive du camp." },
] as const;

type LionWindow = keyof typeof LION_SURVEY_WINDOWS_V174;
type LionMarker = typeof LION_SURVEY_MARKERS_V174[number]["id"];
type Lane = 0 | 1;
const directions = ["west", "east", "north", "south"] as const;
export type LionSurveyDirectionV174 = typeof directions[number];
export type LionSurveyOrderV174 =
  | { kind: "lion-prepare" | "lion-land" | "lion-analyse" | "lion-observe" | "lion-extract" }
  | { kind: "lion-window"; window: LionWindow }
  | { kind: "lion-move"; direction: LionSurveyDirectionV174 };
export type LionSurveyViewV174 = {
  stage: "planning" | "survey" | "complete";
  window: LionWindow | null;
  x: number;
  lane: Lane;
  steps: number;
  visor: "normal" | "analyse";
  readings: LionMarker[];
};

export function createLionSurveyV174(): LionSurveyViewV174 {
  return { stage: "planning", window: null, ...LION_SURVEY_DEPOSIT_V174, steps: 0, visor: "normal", readings: [] };
}

export function lionSurveyFloodedV174(view: LionSurveyViewV174) {
  return view.window === "night" || view.steps >= 6;
}
function lionSurveyWalkable(view: LionSurveyViewV174, x: number, lane: Lane) {
  return x >= 0 && x < LION_SURVEY_WIDTH_V174 && (lane === 0 || x < 2 || x > 4 || !lionSurveyFloodedV174(view));
}
export function lionSurveyMoveV174(view: LionSurveyViewV174, direction: LionSurveyDirectionV174) {
  if (view.stage !== "survey" || (!lionSurveyWalkable(view, view.x, view.lane) && direction !== "north")) return null;
  const x = view.x + (direction === "east" ? 1 : direction === "west" ? -1 : 0);
  const lane = direction === "north" ? 0 : direction === "south" ? 1 : view.lane;
  return (x !== view.x || lane !== view.lane) && lionSurveyWalkable(view, x, lane) ? { x, lane } : null;
}
export function lionSurveyMarkerV174(view: LionSurveyViewV174) {
  return LION_SURVEY_MARKERS_V174.find(marker => marker.x === view.x && marker.lane === view.lane);
}
export function lionSurveyCanObserveV174(view: LionSurveyViewV174) {
  const marker = lionSurveyMarkerV174(view);
  return view.stage === "survey" && view.visor === "analyse" && !!marker && !view.readings.includes(marker.id);
}
export function lionSurveyCanExtractV174(view: LionSurveyViewV174) {
  return view.stage === "survey" && view.readings.length === LION_SURVEY_MARKERS_V174.length
    && view.x === LION_SURVEY_DEPOSIT_V174.x && view.lane === LION_SURVEY_DEPOSIT_V174.lane;
}

export function advanceLionSurveyV174(view: LionSurveyViewV174, order: LionSurveyOrderV174): LionSurveyViewV174 | null {
  if (view.stage === "planning") {
    if (order.kind === "lion-window" && view.window !== order.window) return { ...view, window: order.window };
    if (order.kind === "lion-land" && view.window) return { ...view, stage: "survey" };
    return null;
  }
  if (view.stage !== "survey") return null;
  switch (order.kind) {
    case "lion-move": {
      const next = lionSurveyMoveV174(view, order.direction);
      return next ? { ...view, ...next, steps: Math.min(6, view.steps + 1) } : null;
    }
    case "lion-analyse":
      return { ...view, visor: view.visor === "analyse" ? "normal" : "analyse" };
    case "lion-observe": {
      const marker = lionSurveyMarkerV174(view);
      return marker && lionSurveyCanObserveV174(view) ? { ...view, readings: [...view.readings, marker.id] } : null;
    }
    case "lion-extract":
      return lionSurveyCanExtractV174(view) ? { ...view, stage: "complete" } : null;
    default:
      return null;
  }
}

export function readLionSurveyOrderV174(value: Record<string, unknown>): LionSurveyOrderV174 | null {
  switch (value.kind) {
    case "lion-prepare":
    case "lion-land":
    case "lion-analyse":
    case "lion-observe":
    case "lion-extract":
      return { kind: value.kind };
    case "lion-window":
      return value.window === "dusk" || value.window === "night" ? { kind: value.kind, window: value.window } : null;
    case "lion-move": {
      const direction = directions.find(id => id === value.direction);
      return direction ? { kind: value.kind, direction } : null;
    }
    default:
      return null;
  }
}
