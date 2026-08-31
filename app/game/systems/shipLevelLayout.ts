/** V21 physical ship layout. SVG world units; rendered art never defines collision. */
export const SHIP_LEVEL_WORLD = { width: 4_000, height: 1_500, floorY: 1_360 } as const;
export const SHIP_LEVEL_GRID = 20;
export const SHIP_LEVEL_PLAYER = { halfWidth: 24, height: 112 } as const;
export const SHIP_LEVEL_SPAWN = { x: 3_500, y: 1_360 } as const;

export type PhysicalShipStationId = "galaxy-map" | "wall-armory" | "trophy-hall" | "clan-archives" | "appearance-forge" | "medical-bay" | "training-arena" | "launch-airlock";
export interface ShipRectangle { x: number; y: number; width: number; height: number }
export type ShipRoomKind = "navigation" | "armory" | "archives" | "forge" | "trophies" | "medbay" | "training" | "airlock";
export interface ShipRoomDefinition extends ShipRectangle {
  id: PhysicalShipStationId;
  label: string;
  kind: ShipRoomKind;
  deckY: number;
}
export interface ShipSpaceDefinition extends ShipRectangle {
  id: string;
  label: string;
  kind: ShipRoomKind | "corridor" | "shaft";
  deckY: number;
}
export interface ShipSolidDefinition extends ShipRectangle { id: string; kind: "hull" | "platform" }
export interface ShipSurfaceDefinition { id: string; left: number; right: number; y: number; kind: "floor" | "gantry" }
export interface ShipLadderDefinition { id: string; x: number; top: number; bottom: number }
export interface ShipDoorDefinition extends ShipRectangle { id: string; roomIds: readonly string[] }
export interface ShipDoorState { openness: number; holdSeconds: number }
export type ShipDoorStates = Readonly<Record<string, ShipDoorState>>;
export interface PhysicalShipStationDefinition {
  id: PhysicalShipStationId;
  label: string;
  shortLabel: string;
  description: string;
  x: number;
  y: number;
  level: "floor" | "gantry";
}

export const SHIP_LEVEL_ROOMS: readonly ShipRoomDefinition[] = [
  { id: "galaxy-map", label: "Passerelle de navigation", kind: "navigation", x: 120, y: 160, width: 760, height: 540, deckY: 700 },
  { id: "wall-armory", label: "Armurerie", kind: "armory", x: 1_220, y: 260, width: 680, height: 440, deckY: 700 },
  { id: "clan-archives", label: "Archives du clan", kind: "archives", x: 2_120, y: 220, width: 660, height: 480, deckY: 700 },
  { id: "appearance-forge", label: "Forge des parures", kind: "forge", x: 3_120, y: 140, width: 760, height: 560, deckY: 700 },
  { id: "trophy-hall", label: "Galerie des trophées", kind: "trophies", x: 120, y: 960, width: 760, height: 400, deckY: 1_360 },
  { id: "medical-bay", label: "Baie médicale", kind: "medbay", x: 1_220, y: 980, width: 680, height: 380, deckY: 1_360 },
  { id: "training-arena", label: "Cercle d’entraînement", kind: "training", x: 2_120, y: 880, width: 660, height: 480, deckY: 1_360 },
  { id: "launch-airlock", label: "Sas de chasse", kind: "airlock", x: 3_120, y: 960, width: 760, height: 400, deckY: 1_360 },
];

const CORRIDOR_SPANS = [{ left: 880, right: 1_220 }, { left: 1_900, right: 2_120 }, { left: 2_780, right: 3_120 }] as const;
export const SHIP_LEVEL_CORRIDORS: readonly ShipSpaceDefinition[] = [700, 1_360].flatMap((deckY) => CORRIDOR_SPANS.map(({ left, right }, index) => ({
  id: `corridor-${deckY}-${index}`, label: deckY === 700 ? "Coursive haute" : "Coursive de préparation", kind: "corridor" as const,
  x: left, y: deckY - 180, width: right - left, height: 180, deckY,
})));
const PRIMARY_LADDERS: readonly ShipLadderDefinition[] = [
  { id: "west-shaft", x: 1_060, top: 700, bottom: 1_360 },
  { id: "east-shaft", x: 2_980, top: 700, bottom: 1_360 },
];
export const SHIP_LEVEL_LADDERS: readonly ShipLadderDefinition[] = [
  ...PRIMARY_LADDERS,
  { id: "archive-mezzanine", x: 2_260, top: 500, bottom: 700 },
  { id: "gallery-balcony", x: 220, top: 1_200, bottom: 1_360 },
];
export const SHIP_LEVEL_SHAFTS: readonly ShipSpaceDefinition[] = PRIMARY_LADDERS.map((ladder) => ({
  id: ladder.id, label: ladder.id === "west-shaft" ? "Puits de navigation" : "Puits du sas", kind: "shaft",
  x: ladder.x - 100, y: 520, width: 200, height: 840, deckY: 1_360,
}));
export const SHIP_LEVEL_SPACES: readonly ShipSpaceDefinition[] = [...SHIP_LEVEL_ROOMS, ...SHIP_LEVEL_CORRIDORS, ...SHIP_LEVEL_SHAFTS];

/** Merge the complement of connected walkable spaces into actual solid hull rectangles. */
function buildSolidHull(): ShipSolidDefinition[] {
  const result: ShipSolidDefinition[] = [];
  let previousRuns = new Map<string, ShipSolidDefinition>();
  for (let y = 0; y < SHIP_LEVEL_WORLD.height; y += SHIP_LEVEL_GRID) {
    const rowRuns = new Map<string, ShipSolidDefinition>();
    let runStart: number | null = null;
    for (let x = 0; x <= SHIP_LEVEL_WORLD.width; x += SHIP_LEVEL_GRID) {
      const open = x === SHIP_LEVEL_WORLD.width || SHIP_LEVEL_SPACES.some((space) =>
        x + SHIP_LEVEL_GRID / 2 > space.x && x + SHIP_LEVEL_GRID / 2 < space.x + space.width &&
        y + SHIP_LEVEL_GRID / 2 > space.y && y + SHIP_LEVEL_GRID / 2 < space.y + space.height);
      if (!open && runStart === null) runStart = x;
      if (open && runStart !== null) {
        const key = `${runStart}:${x}`;
        const previous = previousRuns.get(key);
        if (previous) {
          previous.height += SHIP_LEVEL_GRID;
          rowRuns.set(key, previous);
        } else {
          const solid: ShipSolidDefinition = { id: `hull-${result.length}`, kind: "hull", x: runStart, y, width: x - runStart, height: SHIP_LEVEL_GRID };
          result.push(solid); rowRuns.set(key, solid);
        }
        runStart = null;
      }
    }
    previousRuns = rowRuns;
  }
  return result;
}
export const SHIP_LEVEL_SOLIDS: readonly ShipSolidDefinition[] = [
  ...buildSolidHull(),
  { id: "navigation-observation-dais", kind: "platform", x: 220, y: 620, width: 180, height: 80 },
  { id: "navigation-dais-step", kind: "platform", x: 400, y: 660, width: 60, height: 40 },
];

// Ordinary deck floors are solid hull. The two shaft bridges are one-way
// gratings: walking across is safe, but climbing down passes through them.
export const SHIP_LEVEL_SURFACES: readonly ShipSurfaceDefinition[] = [
  { id: "upper-west-floor", left: 120, right: 960, y: 700, kind: "floor" },
  { id: "upper-central-floor", left: 1_160, right: 2_880, y: 700, kind: "floor" },
  { id: "upper-east-floor", left: 3_080, right: 3_880, y: 700, kind: "floor" },
  { id: "lower-floor", left: 120, right: 3_880, y: 1_360, kind: "floor" },
  { id: "west-shaft-bridge", left: 960, right: 1_160, y: 700, kind: "gantry" },
  { id: "east-shaft-bridge", left: 2_880, right: 3_080, y: 700, kind: "gantry" },
  { id: "navigation-observation-top", left: 220, right: 400, y: 620, kind: "floor" },
  { id: "navigation-step-top", left: 400, right: 460, y: 660, kind: "floor" },
  { id: "archive-mezzanine", left: 2_200, right: 2_560, y: 500, kind: "gantry" },
  { id: "gallery-balcony", left: 180, right: 420, y: 1_200, kind: "gantry" },
  { id: "training-first-platform", left: 2_200, right: 2_340, y: 1_300, kind: "gantry" },
  { id: "training-second-platform", left: 2_360, right: 2_480, y: 1_240, kind: "gantry" },
  { id: "training-third-platform", left: 2_540, right: 2_680, y: 1_180, kind: "gantry" },
];

const DOOR_THRESHOLDS = [880, 1_220, 1_900, 2_120, 2_780, 3_120] as const;
export const SHIP_LEVEL_DOORS: readonly ShipDoorDefinition[] = [700, 1_360].flatMap((deckY) => DOOR_THRESHOLDS.map((x) => ({
  id: `door-${deckY}-${x}`, x: x - 12, y: deckY - 180, width: 24, height: 180,
  roomIds: SHIP_LEVEL_ROOMS.filter((room) => room.deckY === deckY && (room.x === x || room.x + room.width === x)).map((room) => room.id),
})));

const STATION_TEXT: Record<PhysicalShipStationId, { shortLabel: string; description: string }> = {
  "galaxy-map": { shortLabel: "NAVIGATION", description: "Explorer la galaxie et choisir la prochaine chasse." },
  "wall-armory": { shortLabel: "ARMURERIE", description: "Préparer les armes, l’armure et les équipements du départ." },
  "clan-archives": { shortLabel: "ARCHIVES", description: "Consulter les chasseurs, les rangs, le bestiaire et les chroniques." },
  "appearance-forge": { shortLabel: "PARURES", description: "Ajuster ton chasseur, son biomask, ses plaques et ses ornements." },
  "trophy-hall": { shortLabel: "TROPHÉES", description: "Préparer et exposer les prises rapportées de tes chasses." },
  "medical-bay": { shortLabel: "SOINS", description: "Traiter les blessures entre deux chasses." },
  "training-arena": { shortLabel: "ENTRAÎNEMENT", description: "Éprouver mobilité, camouflage et acquisition biomask." },
  "launch-airlock": { shortLabel: "DÉPART", description: "Vérifier la destination et le chargement avant de partir en chasse." },
};
export const SHIP_LEVEL_STATIONS: readonly PhysicalShipStationDefinition[] = SHIP_LEVEL_ROOMS.map((room) => ({
  id: room.id, label: room.label, ...STATION_TEXT[room.id], x: room.x + room.width / 2, y: room.deckY,
  level: room.deckY === 700 ? "gantry" : "floor",
}));

export function shipRoomAt(player: { x: number; y: number }): ShipRoomDefinition | null {
  return SHIP_LEVEL_ROOMS.find((room) => player.x >= room.x && player.x <= room.x + room.width && player.y >= room.y && player.y <= room.y + room.height + 1) ?? null;
}
export function shipSpaceAt(player: { x: number; y: number }): ShipSpaceDefinition | null {
  return shipRoomAt(player) ?? SHIP_LEVEL_SPACES.find((space) => player.x >= space.x && player.x <= space.x + space.width && player.y >= space.y && player.y <= space.y + space.height + 1) ?? null;
}

export function getShipCamera(player: { x: number; y: number }, viewport: { width?: number; height?: number } = {}) {
  const width = Math.max(320, Math.min(SHIP_LEVEL_WORLD.width, viewport.width ?? 1_100));
  const height = Math.max(300, Math.min(SHIP_LEVEL_WORLD.height, viewport.height ?? 650));
  return {
    x: Math.max(0, Math.min(SHIP_LEVEL_WORLD.width - width, player.x - width / 2)),
    y: Math.max(0, Math.min(SHIP_LEVEL_WORLD.height - height, player.y - height * 0.72)),
    width, height,
  };
}

export function createShipDoorStates(): ShipDoorStates {
  return Object.fromEntries(SHIP_LEVEL_DOORS.map((door) => [door.id, { openness: 0, holdSeconds: 0 }]));
}

export function shipDoorPanel(door: ShipDoorDefinition, state: ShipDoorState | undefined): ShipRectangle | null {
  const height = door.height * (1 - Math.max(0, Math.min(1, state?.openness ?? 0)));
  return height <= 0.01 ? null : { x: door.x, y: door.y, width: door.width, height };
}

/** Doors open before contact and stay open for an occupied threshold (anti-crush). */
export function stepShipDoorStates(states: ShipDoorStates, player: { x: number; y: number }, elapsedSeconds: number, suspended = false): ShipDoorStates {
  if (suspended) return states;
  const delta = Math.max(0, Math.min(0.034, elapsedSeconds));
  if (delta === 0) return states;
  let changed = false;
  const next: Record<string, ShipDoorState> = { ...states };
  for (const door of SHIP_LEVEL_DOORS) {
    const before = states[door.id] ?? { openness: 0, holdSeconds: 0 };
    const sameDeck = player.y > door.y && player.y - SHIP_LEVEL_PLAYER.height < door.y + door.height;
    const near = sameDeck && Math.abs(player.x - door.x - door.width / 2) <= 155;
    const occupied = sameDeck && player.x + SHIP_LEVEL_PLAYER.halfWidth > door.x && player.x - SHIP_LEVEL_PLAYER.halfWidth < door.x + door.width;
    const holdSeconds = near || occupied ? 1.15 : Math.max(0, before.holdSeconds - delta);
    const targetOpen = holdSeconds > 0 || occupied;
    const openness = Math.max(0, Math.min(1, before.openness + delta * (targetOpen ? 1.8 : -1.15)));
    if (openness !== before.openness || holdSeconds !== before.holdSeconds) {
      next[door.id] = { openness, holdSeconds }; changed = true;
    }
  }
  return changed ? next : states;
}
