import { JUMP_VELOCITY } from "./jumpAssist";
import { overlapsSolidPlatform, resolvePlatformMotion } from "./platformCollision";
import type { WorldPlatform, WorldPoint, WorldRect } from "./worldBlueprints";

/** Source topology, authored geometry. No generated artwork or campaign/save wiring. */
export const BURIED_CRADLE_SOURCE = {
  threadId: "6aa9e19e-0604-83ed-890a-68ad704e932f",
  userTurnId: "44c763fa-5928-4ab1-81c5-7a5e14dc26ed",
  geometryStatus: "authored-adaptation",
  deliveredArtCount: 0,
} as const;

export const CRADLE_ROOM_IDS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"] as const;
export type CradleRoomId = typeof CRADLE_ROOM_IDS[number];
export type CradleShortcutId = "perch-forest" | "fault-river" | "roots-fault";
export type CradleCheckpointId = "01" | "07" | "11";
export const CRADLE_PHYSICS = {
  width: 72, height: 116, speed: 300, gravity: 1_850,
  jumpVelocity: JUMP_VELOCITY, floorY: 624, maximumStepSeconds: 1 / 60,
  // A conservative ordinary strike; not a replacement for Hunt's combo system.
  meleeReach: 100, meleeDamage: 20, meleeCooldown: 0.55,
} as const;

export interface CradleRoom {
  id: CradleRoomId;
  name: string;
  width: number;
  height: 720;
  mapCell: WorldPoint;
  layer: "surface" | "canopy" | "underground" | "basin";
  purpose: string;
  platforms: readonly WorldPlatform[];
  /** A traversable sequence of permanent landings, expressed as feet positions. */
  mainRoute: readonly WorldPoint[];
}
type Slab = readonly [x: number, y: number, width: number, collision?: "solid" | "one-way"];

function platform(id: string, slab: Slab, material: WorldPlatform["material"] = "basalt", height = 24): WorldPlatform {
  return { id, x: slab[0], y: slab[1], width: slab[2], height,
    collision: slab[3] ?? "one-way", material, routeId: slab[1] < 480 ? "canopy" : "ground",
    noiseMultiplier: 1, trackPersistence: 1 };
}
function room(id: CradleRoomId, name: string, width: number, mapCell: WorldPoint, layer: CradleRoom["layer"],
  purpose: string, slabs: readonly Slab[], mainRoute: readonly WorldPoint[]): CradleRoom {
  const platforms: WorldPlatform[] = [];
  // Separate reusable floor modules, not one collider spanning a whole level.
  for (let x = 0; x < width; x += 256) {
    platforms.push(platform(`${id}-bedrock-${x / 256}`, [x, 624, Math.min(256, width - x), "solid"], "basalt", 96));
  }
  platforms.push(...slabs.map((slab, index) => platform(`${id}-support-${index}`, slab,
    layer === "surface" || layer === "canopy" ? "root" : "basalt")));
  return { id, name, width, height: 720, mapCell, layer, purpose, platforms, mainRoute };
}
const point = (x: number, y = 624): WorldPoint => ({ x, y });

/** Local spaces stream through explicit doors. Map coordinates are not collision coordinates. */
export const BURIED_CRADLE_ROOMS: readonly CradleRoom[] = [
  room("01", "La Lisière des exuvies", 1536, point(0, 1), "surface", "Insertion, corniche et premier refuge.",
    [[280, 544, 224], [540, 448, 208], [800, 544, 208]], [point(96), point(1440)]),
  room("02", "La Forêt des calices noirs", 1792, point(1, 1), "surface", "Voie basse sous les racines et itinéraire de contreforts.",
    [[256, 528, 224], [496, 424, 320], [848, 424, 320], [1216, 528, 240], [560, 272, 240], [900, 272, 240]],
    [point(96), point(1696)]),
  room("03", "Le Lit de la rivière morte", 1792, point(2, 1), "surface", "Balayage annoncé ; appuis minéraux sur le lit organique.",
    [[352, 552, 208], [664, 520, 240], [1008, 552, 208], [1320, 472, 208]], [point(96), point(1696)]),
  room("04", "Les Troncs étranglés", 1792, point(3, 1), "canopy", "Ascension de trois troncs par quatre paliers pétrifiés.",
    [[224, 520, 320], [584, 416, 320], [944, 312, 320], [1304, 208, 392],
      [300, 360, 144], [660, 256, 144], [1020, 152, 144]],
    [point(96), point(400, 520), point(760, 416), point(1120, 312), point(1520, 208)]),
  room("05", "La Canopée des membranes", 1792, point(3, 0), "canopy", "Haute voie permanente sous les membranes mobiles.",
    [[0, 416, 320], [352, 416, 320], [704, 416, 320], [1056, 416, 320], [1408, 416, 384],
      [560, 520, 256], [1008, 520, 256], [1360, 520, 256]],
    [point(96, 416), point(1696, 416)]),
  room("06", "Le Perchoir abandonné", 1280, point(2, 0), "canopy", "Observatoire facultatif et passerelle de retour vers 02.",
    [[0, 416, 320], [320, 416, 320], [640, 416, 320], [960, 416, 320], [480, 312, 240]],
    [point(96, 416), point(1184, 416)]),
  room("07", "La Faille qui respire", 1792, point(3, 2), "underground", "Descente, deuxième refuge et retour vers la rivière.",
    [[0, 312, 320], [336, 416, 304], [656, 520, 304], [1104, 520, 240],
      [1088, 208, 288, "solid"], [1408, 208, 320, "solid"]],
    [point(96, 312), point(480, 416), point(800, 520), point(1056), point(1696)]),
  room("08", "Les Galeries sous la peau", 1792, point(4, 2), "underground", "Galeries acides, alternance de rebords hauts et bas.",
    [[368, 520, 320], [752, 424, 224], [1032, 520, 320], [96, 272, 256, "solid"],
      [416, 272, 256, "solid"], [1056, 272, 256, "solid"], [1408, 272, 288, "solid"]],
    [point(96), point(1696)]),
  room("09", "La Pouponnière de dérivation", 1536, point(4, 3), "underground", "Valve facultative ; réduit la durée des flaques du boss.",
    [[320, 536, 256], [656, 456, 256], [1008, 536, 304], [128, 232, 288, "solid"], [960, 232, 288, "solid"]],
    [point(96), point(1408)]),
  room("10", "Le Nœud des racines", 1792, point(5, 2), "underground", "Faire manquer une perforation, couper l’anneau et libérer la porte.",
    [[432, 552, 256], [848, 520, 256], [1328, 528, 256], [128, 232, 256, "solid"], [1120, 232, 256, "solid"]],
    [point(96), point(1696)]),
  room("11", "La Lèvre silencieuse", 1280, point(6, 2), "underground", "Dernier refuge, puis franchissement volontaire du seuil.",
    [[288, 536, 240], [608, 472, 256], [128, 240, 240, "solid"], [912, 240, 240, "solid"]],
    [point(96), point(1184)]),
  room("12", "Le Bassin de la Matriarche", 1920, point(7, 2), "basin", "Tête couchée, trois appuis bas, mâchoire accessible et sortie derrière la joue.",
    [[320, 552, 240], [840, 528, 240], [1360, 552, 240]], [point(96), point(1824)]),
];

export interface CradleDoorEnd { roomId: CradleRoomId; feet: WorldPoint }
export interface CradleDoor {
  id: string;
  a: CradleDoorEnd;
  b: CradleDoorEnd;
  shortcutId?: CradleShortcutId;
  /** Shortcuts can only be first deployed from a; then they work in both directions. */
  requiresRootRing?: true;
}
const end = (roomId: CradleRoomId, x: number, y = 624): CradleDoorEnd => ({ roomId, feet: point(x, y) });
export const BURIED_CRADLE_DOORS: readonly CradleDoor[] = [
  { id: "01-02", a: end("01", 1440), b: end("02", 96) },
  { id: "02-03", a: end("02", 1696), b: end("03", 96) },
  { id: "03-04", a: end("03", 1696), b: end("04", 96) },
  { id: "04-05", a: end("04", 1520, 208), b: end("05", 96, 416) },
  { id: "05-07", a: end("05", 1696, 416), b: end("07", 96, 312) },
  { id: "05-06", a: end("05", 880, 416), b: end("06", 1184, 416) },
  { id: "07-08", a: end("07", 1696), b: end("08", 96) },
  { id: "08-09", a: end("08", 880), b: end("09", 96) },
  { id: "08-10", a: end("08", 1696), b: end("10", 96) },
  { id: "10-11", a: end("10", 1696), b: end("11", 96), requiresRootRing: true },
  { id: "11-12", a: end("11", 1184), b: end("12", 96) },
  { id: "06-02", a: end("06", 96, 416), b: end("02", 1056, 424), shortcutId: "perch-forest" },
  { id: "07-03", a: end("07", 480, 416), b: end("03", 1440, 472), shortcutId: "fault-river" },
  { id: "10-07", a: end("10", 320), b: end("07", 1216, 520), shortcutId: "roots-fault", requiresRootRing: true },
];

export interface BuriedCradleProgress {
  version: 1;
  visitedRoomIds: CradleRoomId[];
  shortcutIds: CradleShortcutId[];
  checkpointId: CradleCheckpointId;
  drainageOpened: boolean;
  rootRingCut: boolean;
  bossDefeated: boolean;
  crownClaimed: boolean;
}
export function createBuriedCradleProgress(): BuriedCradleProgress {
  return { version: 1, visitedRoomIds: ["01"], shortcutIds: [], checkpointId: "01",
    drainageOpened: false, rootRingCut: false, bossDefeated: false, crownClaimed: false };
}

/** Invalid/future data is rejected; callers must retain their original save on failure. */
export function parseBuriedCradleProgress(value: unknown): BuriedCradleProgress | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const p = value as Partial<BuriedCradleProgress>;
  if (p.version !== 1 || !Array.isArray(p.visitedRoomIds) || p.visitedRoomIds.length > 12 ||
    p.visitedRoomIds.some(id => !CRADLE_ROOM_IDS.includes(id)) || new Set(p.visitedRoomIds).size !== p.visitedRoomIds.length ||
    !Array.isArray(p.shortcutIds) || p.shortcutIds.length > 3 ||
    p.shortcutIds.some(id => !["perch-forest", "fault-river", "roots-fault"].includes(id)) || new Set(p.shortcutIds).size !== p.shortcutIds.length ||
    !["01", "07", "11"].includes(p.checkpointId ?? "") ||
    [p.drainageOpened, p.rootRingCut, p.bossDefeated, p.crownClaimed].some(flag => typeof flag !== "boolean") ||
    !p.visitedRoomIds.includes("01") || !p.visitedRoomIds.includes(p.checkpointId!) ||
    (p.crownClaimed && !p.bossDefeated) || (p.bossDefeated && (!p.rootRingCut || !p.visitedRoomIds.includes("12"))) ||
    (p.drainageOpened && !p.visitedRoomIds.includes("09")) || (p.rootRingCut && !p.visitedRoomIds.includes("10")) ||
    ((p.visitedRoomIds.includes("11") || p.visitedRoomIds.includes("12")) && !p.rootRingCut) ||
    (p.shortcutIds.includes("perch-forest") && (!p.visitedRoomIds.includes("06") || !p.visitedRoomIds.includes("02"))) ||
    (p.shortcutIds.includes("fault-river") && (!p.visitedRoomIds.includes("07") || !p.visitedRoomIds.includes("03"))) ||
    (p.shortcutIds.includes("roots-fault") && (!p.rootRingCut || !p.visitedRoomIds.includes("07")))) return null;
  return { version: 1, visitedRoomIds: [...p.visitedRoomIds], shortcutIds: [...p.shortcutIds], checkpointId: p.checkpointId!,
    drainageOpened: p.drainageOpened!, rootRingCut: p.rootRingCut!, bossDefeated: p.bossDefeated!, crownClaimed: p.crownClaimed! };
}

export function buriedCradleRoom(id: CradleRoomId): CradleRoom {
  const result = BURIED_CRADLE_ROOMS.find(candidate => candidate.id === id);
  if (!result) throw new RangeError("Unknown Berceau room");
  return result;
}
export function getBuriedCradlePlatforms(id: CradleRoomId, progress: BuriedCradleProgress): readonly WorldPlatform[] {
  const result = [...buriedCradleRoom(id).platforms];
  if (id === "10" && !progress.rootRingCut) {
    result.push(platform("10-living-root-gate", [1568, 288, 32, "solid"], "root", 336));
  }
  // An inert member adds a bridge; no permanent landing is removed.
  if (id === "03" && progress.bossDefeated) result.push(platform("03-inert-tentacle-bridge", [560, 552, 432], "root"));
  return result;
}
export function getCradleReachableRooms(progress: BuriedCradleProgress, from: CradleRoomId = "01"): CradleRoomId[] {
  const visited = new Set<CradleRoomId>([from]);
  for (let size = -1; size !== visited.size;) {
    size = visited.size;
    for (const door of BURIED_CRADLE_DOORS) {
      if (door.requiresRootRing && !progress.rootRingCut) continue;
      if (door.shortcutId && !progress.shortcutIds.includes(door.shortcutId)) continue;
      if (visited.has(door.a.roomId)) visited.add(door.b.roomId);
      if (visited.has(door.b.roomId)) visited.add(door.a.roomId);
    }
  }
  return CRADLE_ROOM_IDS.filter(id => visited.has(id));
}

export type CradleBossPhase = "tentacles" | "sheath" | "bulb" | "defeated";
export type CradleAttack = "puncture" | "sweep" | "capture" | "salvo" | "breath" | "bite" | "pulse" | "whips";
export type CradlePartId = "motor-a" | "motor-b" | "sheath-a" | "sheath-b" | "bulb";
export interface CradleWeakPoint extends WorldRect { partId: CradlePartId | "root-ring" }
export interface CradlePool extends WorldRect { remainingSeconds: number }
export interface CradleBoss {
  phase: CradleBossPhase;
  health: Record<CradlePartId, number>;
  attack: CradleAttack;
  stage: "telegraph" | "active" | "opening";
  remainingSeconds: number;
  cycle: number;
  targetX: number;
  targetFloorY: number;
  attackHit: boolean;
  weakPoint: CradleWeakPoint | null;
  pools: CradlePool[];
}
export interface CradlePlayer extends WorldRect {
  velocityX: number; velocityY: number; facing: -1 | 1; grounded: boolean;
  health: number; hurtSeconds: number; meleeSeconds: number;
}
export interface CradleRootTrap {
  stage: "waiting" | "telegraph" | "active" | "opening";
  remainingSeconds: number;
  targetX: number;
  targetFloorY: number;
  attackHit: boolean;
}
export interface BuriedCradleRun {
  progress: BuriedCradleProgress;
  roomId: CradleRoomId;
  player: CradlePlayer;
  boss: CradleBoss;
  rootTrap: CradleRootTrap;
  clockSeconds: number;
  extracted: boolean;
}
export interface CradleInput { move?: -1 | 0 | 1; jumpPressed?: boolean; jumpHeld?: boolean; meleePressed?: boolean; interactPressed?: boolean }
export interface CradleEvent { type: "door-locked" | "shortcut-opened" | "room-entered" | "drainage-opened" | "root-cut" |
  "part-cut" | "boss-phase" | "hurt" | "knockout" | "crown-claimed" | "extracted"; id?: string }
export interface CradleStep { run: BuriedCradleRun; events: CradleEvent[] }

const BOSS_SEQUENCES: Record<Exclude<CradleBossPhase, "defeated">, readonly CradleAttack[]> = {
  tentacles: ["puncture", "sweep", "capture", "puncture"],
  sheath: ["breath", "salvo", "breath"],
  bulb: ["bite", "sweep", "bite", "pulse", "whips"],
};
const checkpointFeet: Record<CradleCheckpointId, WorldPoint> = { "01": point(96), "07": point(96, 312), "11": point(96) };
export const CRADLE_BOSS_HEAD: Readonly<WorldRect> = { x: 1010, y: 120, width: 880, height: 504 };
export const CRADLE_BOSS_POOL_DURATION = { normal: 8, drained: 3 } as const;
const ROOT_TRAP_BAND = { x: 704, y: 280, width: 512, height: 344 };
const overlaps = (a: WorldRect, b: WorldRect) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function newBoss(defeated = false): CradleBoss {
  return { phase: defeated ? "defeated" : "tentacles", health: { "motor-a": defeated ? 0 : 60, "motor-b": defeated ? 0 : 60,
    "sheath-a": defeated ? 0 : 60, "sheath-b": defeated ? 0 : 60, bulb: defeated ? 0 : 100 },
    attack: "puncture", stage: "telegraph", remainingSeconds: 1.2, cycle: 0, targetX: 340, targetFloorY: 624,
    attackHit: false, weakPoint: null, pools: [] };
}
function newRootTrap(): CradleRootTrap {
  return { stage: "waiting", remainingSeconds: 0, targetX: 0, targetFloorY: 624, attackHit: false };
}
function playerAt(feet: WorldPoint): CradlePlayer {
  return { x: feet.x - 36, y: feet.y - 116, width: 72, height: 116,
    velocityX: 0, velocityY: 0, facing: 1, grounded: true, health: 100, hurtSeconds: 0, meleeSeconds: 0 };
}
export function createBuriedCradleRun(saved?: unknown): BuriedCradleRun {
  const progress = saved === undefined ? createBuriedCradleProgress() : parseBuriedCradleProgress(saved);
  if (!progress) throw new RangeError("Unsupported or malformed Berceau progress; keep the original save");
  return { progress, roomId: progress.checkpointId, player: playerAt(checkpointFeet[progress.checkpointId]),
    boss: newBoss(progress.bossDefeated), rootTrap: newRootTrap(), clockSeconds: 0, extracted: false };
}
function cloneRun(run: BuriedCradleRun): BuriedCradleRun {
  return { ...run, progress: { ...run.progress, visitedRoomIds: [...run.progress.visitedRoomIds], shortcutIds: [...run.progress.shortcutIds] },
    player: { ...run.player }, boss: { ...run.boss, health: { ...run.boss.health }, weakPoint: run.boss.weakPoint && { ...run.boss.weakPoint },
      pools: run.boss.pools.map(pool => ({ ...pool })) }, rootTrap: { ...run.rootTrap } };
}
function nearFeet(player: CradlePlayer, feet: WorldPoint, range = 84): boolean {
  return Math.abs(player.x + player.width / 2 - feet.x) <= range && Math.abs(player.y + player.height - feet.y) <= 42;
}
function supportY(run: BuriedCradleRun, x: number): number {
  const feetY = run.player.y + run.player.height;
  return getBuriedCradlePlatforms(run.roomId, run.progress)
    .filter(p => x >= p.x && x <= p.x + p.width && p.y >= feetY - 1)
    .reduce((y, p) => Math.min(y, p.y), 624);
}

/** Entry is voluntary. The arena's only temporary seal is removed on KO or victory. */
function interact(run: BuriedCradleRun, events: CradleEvent[]): void {
  const { player, progress } = run;
  if (run.roomId === "09" && nearFeet(player, point(1408)) && !progress.drainageOpened) {
    progress.drainageOpened = true; events.push({ type: "drainage-opened" }); return;
  }
  if (run.roomId === "12" && progress.bossDefeated) {
    if (nearFeet(player, point(1656)) && !progress.crownClaimed) {
      progress.crownClaimed = true; events.push({ type: "crown-claimed", id: "crown-fragment" }); return;
    }
    if (nearFeet(player, point(1824))) { run.extracted = true; events.push({ type: "extracted" }); return; }
  }
  for (const door of BURIED_CRADLE_DOORS) {
    const origin = door.a.roomId === run.roomId ? door.a : door.b.roomId === run.roomId ? door.b : null;
    if (!origin || !nearFeet(player, origin.feet)) continue;
    if ((run.roomId === "12" && !progress.bossDefeated) || (door.requiresRootRing && !progress.rootRingCut)) {
      events.push({ type: "door-locked", id: door.id }); return;
    }
    if (door.shortcutId && !progress.shortcutIds.includes(door.shortcutId)) {
      if (origin !== door.a) { events.push({ type: "door-locked", id: door.id }); return; }
      progress.shortcutIds.push(door.shortcutId);
      events.push({ type: "shortcut-opened", id: door.shortcutId });
    }
    const destination = origin === door.a ? door.b : door.a;
    const nextPlayer = { ...playerAt(destination.feet), health: player.health, hurtSeconds: player.hurtSeconds };
    if (overlapsSolidPlatform(nextPlayer, getBuriedCradlePlatforms(destination.roomId, progress))) {
      throw new Error(`Embedded Berceau door spawn: ${door.id}`);
    }
    run.roomId = destination.roomId; run.player = nextPlayer; run.rootTrap = newRootTrap();
    if (!progress.visitedRoomIds.includes(run.roomId)) progress.visitedRoomIds.push(run.roomId);
    if (run.roomId === "07" || run.roomId === "11") progress.checkpointId = run.roomId;
    if (run.roomId === "12") { run.boss = newBoss(progress.bossDefeated); aimBoss(run); }
    events.push({ type: "room-entered", id: run.roomId }); return;
  }
}

function hurt(run: BuriedCradleRun, damage: number, events: CradleEvent[]): void {
  if (run.player.hurtSeconds > 0) return;
  run.player.health = Math.max(0, run.player.health - damage); run.player.hurtSeconds = 0.85;
  events.push({ type: "hurt" });
}
function knockout(run: BuriedCradleRun, events: CradleEvent[]): void {
  run.roomId = run.progress.checkpointId;
  run.player = playerAt(checkpointFeet[run.progress.checkpointId]);
  run.boss = newBoss(run.progress.bossDefeated); run.rootTrap = newRootTrap();
  events.push({ type: "knockout", id: run.roomId });
}
function aimBoss(run: BuriedCradleRun): void {
  run.boss.targetX = clamp(run.player.x + run.player.width / 2, 160, 1720);
  run.boss.targetFloorY = supportY(run, run.boss.targetX);
}
function firstAlive(boss: CradleBoss, ids: readonly CradlePartId[]): CradlePartId {
  return ids.find(id => boss.health[id] > 0) ?? ids[0];
}

export function getCradleMeleeBox(player: CradlePlayer): WorldRect {
  // Same forward-edge and vertical inset as Hunt's ordinary light attack.
  const edge = player.x + player.width * (player.facing > 0 ? 0.54 : 0.46);
  return { x: player.facing > 0 ? edge : edge - CRADLE_PHYSICS.meleeReach,
    y: player.y + player.height * 0.14, width: CRADLE_PHYSICS.meleeReach, height: player.height * 0.72 };
}
function rootWeakPoint(run: BuriedCradleRun): CradleWeakPoint | null {
  return run.roomId === "10" && !run.progress.rootRingCut && run.rootTrap.stage === "opening" && !run.rootTrap.attackHit
    ? { partId: "root-ring", x: run.rootTrap.targetX - 24, y: run.rootTrap.targetFloorY - 88, width: 48, height: 72 } : null;
}
export function getCradleWeakPoint(run: BuriedCradleRun): CradleWeakPoint | null {
  return run.roomId === "12" ? run.boss.weakPoint : rootWeakPoint(run);
}

function melee(run: BuriedCradleRun, events: CradleEvent[]): void {
  if (run.player.meleeSeconds > 0) return;
  run.player.meleeSeconds = CRADLE_PHYSICS.meleeCooldown;
  const box = getCradleMeleeBox(run.player);
  // The capture loop can be cut before it closes, using the same ordinary strike.
  if (run.roomId === "12" && run.boss.attack === "capture" && run.boss.stage === "telegraph" &&
    overlaps(box, { x: run.boss.targetX - 24, y: 510, width: 48, height: 100 })) {
    run.boss.stage = "opening"; run.boss.remainingSeconds = 2; return;
  }
  const target = getCradleWeakPoint(run);
  if (!target || !overlaps(box, target)) return;
  if (target.partId === "root-ring") {
    run.progress.rootRingCut = true; events.push({ type: "root-cut" }); return;
  }
  const boss = run.boss;
  boss.health[target.partId] = Math.max(0, boss.health[target.partId] - CRADLE_PHYSICS.meleeDamage);
  if (boss.health[target.partId] > 0) return;
  events.push({ type: "part-cut", id: target.partId }); boss.weakPoint = null;
  const phase = boss.health["motor-a"] + boss.health["motor-b"] > 0 ? "tentacles"
    : boss.health["sheath-a"] + boss.health["sheath-b"] > 0 ? "sheath" : boss.health.bulb > 0 ? "bulb" : "defeated";
  if (phase === boss.phase) return;
  boss.phase = phase; boss.cycle = 0; boss.stage = "telegraph"; boss.remainingSeconds = 1.2; boss.attackHit = false;
  events.push({ type: "boss-phase", id: phase });
  if (phase === "defeated") { run.progress.bossDefeated = true; boss.pools = []; }
  else { boss.attack = BOSS_SEQUENCES[phase][0]; aimBoss(run); }
}

function stepRootTrap(run: BuriedCradleRun, dt: number, events: CradleEvent[]): void {
  if (run.roomId !== "10" || run.progress.rootRingCut) return;
  const trap = run.rootTrap;
  if (trap.stage === "waiting") {
    if (!overlaps(run.player, ROOT_TRAP_BAND)) return;
    trap.stage = "telegraph"; trap.remainingSeconds = 1.2; trap.targetX = run.player.x + 36;
    trap.targetFloorY = supportY(run, trap.targetX); trap.attackHit = false;
  }
  trap.remainingSeconds -= dt;
  if (trap.stage === "active" && overlaps(run.player, { x: trap.targetX - 48, y: 280, width: 96, height: 344 })) {
    trap.attackHit = true; hurt(run, 18, events);
  }
  if (trap.remainingSeconds > 0) return;
  if (trap.stage === "telegraph") { trap.stage = "active"; trap.remainingSeconds = 0.3; }
  else if (trap.stage === "active") { trap.stage = "opening"; trap.remainingSeconds = 3.8; }
  else { trap.stage = "waiting"; }
}

/** Attack rectangles and warnings are shared with an eventual renderer. No hidden offscreen tip. */
export function getCradleBossAttackRects(boss: CradleBoss): readonly WorldRect[] {
  switch (boss.attack) {
    case "puncture": return [{ x: boss.targetX - 48, y: 80, width: 96, height: boss.targetFloorY - 80 }];
    case "capture": return [{ x: boss.targetX - 56, y: 492, width: 112, height: 132 }];
    case "sweep": return [{ x: 200, y: 584, width: 1310, height: 40 }];
    case "breath": return [{ x: 580, y: 568, width: 1050, height: 56 }];
    case "bite": return [{ x: 1336, y: 460, width: 384, height: 164 }];
    case "pulse": return [{ x: 128, y: 594, width: 1560, height: 30 }];
    case "whips": return [{ x: 340, y: 380, width: 200, height: 244 }, { x: 1216, y: 380, width: 200, height: 244 }];
    case "salvo": return [{ x: 640, y: 574, width: 144, height: 50 }, { x: 1120, y: 574, width: 144, height: 50 }];
  }
}
function openBossWeakPoint(boss: CradleBoss): void {
  boss.weakPoint = null;
  if (boss.attack === "puncture" && boss.phase === "tentacles" && !boss.attackHit) {
    boss.weakPoint = { partId: firstAlive(boss, ["motor-a", "motor-b"]), x: boss.targetX - 24,
      y: boss.targetFloorY - 88, width: 48, height: 72 };
  } else if (boss.attack === "breath" && boss.phase === "sheath") {
    boss.weakPoint = { partId: firstAlive(boss, ["sheath-a", "sheath-b"]), x: 1550, y: 474, width: 56, height: 72 };
  } else if (boss.attack === "bite" && boss.phase === "bulb" && !boss.attackHit) {
    boss.weakPoint = { partId: "bulb", x: 1550, y: 474, width: 56, height: 72 };
  }
}
function stepBoss(run: BuriedCradleRun, dt: number, events: CradleEvent[]): void {
  if (run.roomId !== "12" || run.boss.phase === "defeated") return;
  const boss = run.boss;
  boss.pools = boss.pools.map(pool => ({ ...pool, remainingSeconds: pool.remainingSeconds - dt })).filter(pool => pool.remainingSeconds > 0);
  for (const pool of boss.pools) if (overlaps(run.player, pool)) hurt(run, 8, events);
  boss.remainingSeconds -= dt;
  if (boss.stage === "active" && getCradleBossAttackRects(boss).some(rect => overlaps(run.player, rect))) {
    boss.attackHit = true; hurt(run, 16, events);
  }
  if (boss.remainingSeconds > 0) return;
  if (boss.stage === "telegraph") {
    boss.stage = "active"; boss.remainingSeconds = boss.attack === "breath" ? 0.8 : 0.3;
    if (boss.attack === "breath" || boss.attack === "salvo") {
      // Fixed pockets leave the left refuge, all three supports and the jaw approach dry.
      boss.pools = [640, 1120].map(x => ({ x, y: 602, width: 144, height: 22,
        remainingSeconds: run.progress.drainageOpened ? CRADLE_BOSS_POOL_DURATION.drained : CRADLE_BOSS_POOL_DURATION.normal }));
    }
  } else if (boss.stage === "active") {
    boss.stage = "opening"; boss.remainingSeconds = boss.phase === "bulb" ? 5 : 4;
    openBossWeakPoint(boss);
  } else {
    boss.cycle += 1; const sequence = BOSS_SEQUENCES[boss.phase as Exclude<CradleBossPhase, "defeated">];
    boss.attack = sequence[boss.cycle % sequence.length]; boss.stage = "telegraph";
    boss.remainingSeconds = 1.2; boss.attackHit = false; boss.weakPoint = null; aimBoss(run);
  }
}

export interface CradleEnvironmentHazard extends WorldRect {
  id: string; warning: string; stage: "idle" | "telegraph" | "active";
}
export function getCradleEnvironmentHazards(run: BuriedCradleRun): CradleEnvironmentHazard[] {
  const t = run.clockSeconds % 5;
  const stage = t < 2.8 ? "idle" : t < 4 ? "telegraph" : "active";
  if (run.roomId === "03" && !run.progress.bossDefeated) return [{ id: "river-sweep", x: 680, y: 584, width: 304, height: 40, warning: "Tension, raclement puis balayage.", stage }];
  if (run.roomId === "07" && !run.progress.bossDefeated) return [{ id: "fault-vent", x: 1008, y: 504, width: 80, height: 120, warning: "Membrane gonflée puis évent.", stage }];
  if (run.roomId === "08" || run.roomId === "09") return [{ id: "autonomous-acid", x: 512, y: 602, width: 144, height: 22,
    warning: "Acide autonome ; ne disparaît pas avec la Matriarche.", stage: "active" }];
  return [];
}
export function getCradleWorldCondition(progress: BuriedCradleProgress) {
  return { fungalForestRemains: true, autonomousXenomorphsRemain: true, headRemainsInRoom12: true,
    basinControlAlive: !progress.bossDefeated, riverBridgeDeployed: progress.bossDefeated,
    canopyMembranesRelaxed: progress.bossDefeated, controlledVentsCalm: progress.bossDefeated,
    crownTrophy: progress.crownClaimed ? "fragment" as const : null };
}

/** Pure room simulation. Pressed actions fire once even when a frame is subdivided. */
export function stepBuriedCradle(current: BuriedCradleRun, input: CradleInput, deltaSeconds: number): CradleStep {
  if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0 || deltaSeconds > 0.25) throw new RangeError("Berceau frame must be between 0 and 0.25 seconds");
  if (input.move !== undefined && input.move !== -1 && input.move !== 0 && input.move !== 1) throw new RangeError("Invalid Berceau movement axis");
  const run = cloneRun(current); const events: CradleEvent[] = [];
  if (run.extracted || deltaSeconds === 0) return { run, events };
  if (run.player.health <= 0) { knockout(run, events); return { run, events }; }
  const steps = Math.ceil(deltaSeconds / CRADLE_PHYSICS.maximumStepSeconds);
  const dt = deltaSeconds / steps;
  for (let index = 0; index < steps; index += 1) {
    run.clockSeconds += dt;
    const player = run.player; const axis = input.move ?? 0;
    player.hurtSeconds = Math.max(0, player.hurtSeconds - dt); player.meleeSeconds = Math.max(0, player.meleeSeconds - dt);
    player.velocityX = axis * CRADLE_PHYSICS.speed;
    if (axis) player.facing = axis;
    if (index === 0 && input.jumpPressed && player.grounded) { player.velocityY = CRADLE_PHYSICS.jumpVelocity; player.grounded = false; }
    if (input.jumpHeld === false && player.velocityY < -300) player.velocityY = -300;
    player.velocityY += CRADLE_PHYSICS.gravity * dt;
    const platforms = getBuriedCradlePlatforms(run.roomId, run.progress);
    if (overlapsSolidPlatform(player, platforms)) throw new Error("Embedded Berceau actor; restore a valid checkpoint");
    const desired = { x: clamp(player.x + player.velocityX * dt, 0, buriedCradleRoom(run.roomId).width - player.width),
      y: Math.max(0, player.y + player.velocityY * dt) };
    // Keep the whole actor in the local camera space above the highest landing.
    if (desired.y === 0 && player.velocityY < 0) player.velocityY = 0;
    Object.assign(player, resolvePlatformMotion(player, desired, platforms, CRADLE_PHYSICS.floorY));
    stepRootTrap(run, dt, events); stepBoss(run, dt, events);
    for (const hazard of getCradleEnvironmentHazards(run)) if (hazard.stage === "active" && overlaps(player, hazard)) hurt(run, 10, events);
    if (run.player.health <= 0) { knockout(run, events); break; }
    if (index === 0 && input.meleePressed) melee(run, events);
    if (index === 0 && input.interactPressed) { interact(run, events); if (events.some(event => event.type === "room-entered") || run.extracted) break; }
  }
  return { run, events };
}
