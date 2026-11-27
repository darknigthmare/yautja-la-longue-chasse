export const HULL_EXTERIOR_GRID = [
  "#############",
  "#..R..#...V.#",
  "#.....#.....#",
  "#..#..#..#..#",
  "#.....G.....#",
  "#..#..#..#..#",
  "#S...C#.....#",
  "#############",
] as const;

export const HULL_EXTERIOR_DIRECTIONS = {
  north: { label: "Nord", key: "ArrowUp", column: 0, row: -1 },
  west: { label: "Ouest", key: "ArrowLeft", column: -1, row: 0 },
  south: { label: "Sud", key: "ArrowDown", column: 0, row: 1 },
  east: { label: "Est", key: "ArrowRight", column: 1, row: 0 },
} as const;

export type HullExteriorDirection = keyof typeof HULL_EXTERIOR_DIRECTIONS;
export type HullExteriorCommand = HullExteriorDirection | "inspect" | "report";
export type HullExteriorSurveyV172 = { route: HullExteriorCommand[] };

type Position = { column: number; row: number };
type HullExteriorView = {
  position: Position;
  gantrySecured: boolean;
  reliefSeen: boolean;
  watchSeen: boolean;
  returned: boolean;
};

export const MAX_HULL_EXTERIOR_STEPS = 120;

export function createHullExteriorView(): HullExteriorView {
  return {
    position: { column: 1, row: 6 },
    gantrySecured: false, reliefSeen: false, watchSeen: false, returned: false,
  };
}

export function hullExteriorTile({ column, row }: Position): string {
  return HULL_EXTERIOR_GRID[row]?.[column] ?? "#";
}

function isDirection(name: unknown): name is HullExteriorDirection {
  return typeof name === "string" && Object.hasOwn(HULL_EXTERIOR_DIRECTIONS, name);
}

export function stepHullExterior(view: HullExteriorView, command: HullExteriorCommand): HullExteriorView {
  if (view.returned) return view;
  if (isDirection(command)) {
    const step = HULL_EXTERIOR_DIRECTIONS[command];
    const next = { column: view.position.column + step.column, row: view.position.row + step.row };
    const tile = hullExteriorTile(next);
    if (tile === "#" || (tile === "G" && !view.gantrySecured)) return view;
    return { ...view, position: next };
  }
  const tile = hullExteriorTile(view.position);
  if (command === "inspect") {
    if (tile === "C" && !view.gantrySecured) return { ...view, gantrySecured: true };
    if (tile === "R" && !view.reliefSeen) return { ...view, reliefSeen: true };
    if (tile === "V" && !view.watchSeen) return { ...view, watchSeen: true };
  }
  if (command === "report" && tile === "S" && view.gantrySecured && view.reliefSeen && view.watchSeen) {
    return { ...view, returned: true };
  }
  return view;
}

export function inspectHullExteriorSurvey(raw: unknown): HullExteriorSurveyV172 | null {
  if (!raw || typeof raw !== "object" || Object.keys(raw).length !== 1 || !("route" in raw) ||
      !Array.isArray(raw.route) || raw.route.length < 1 || raw.route.length > MAX_HULL_EXTERIOR_STEPS) return null;
  let view = createHullExteriorView();
  const route: HullExteriorCommand[] = [];
  for (const command of raw.route) {
    if (!isDirection(command) && command !== "inspect" && command !== "report") return null;
    const next = stepHullExterior(view, command);
    if (next === view) return null;
    view = next;
    route.push(command);
  }
  return view.returned ? { route } : null;
}
