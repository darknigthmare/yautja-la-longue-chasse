/** Native background drawings only. No combat sprite, tween or physics state is used. */
export interface PitArenaLifeSheet {
  readonly id: "colony-watchers" | "yautja-spectators";
  readonly src: string;
  readonly columns: 3;
  readonly rows: 2;
  readonly frameCount: 6;
  readonly fps: 3;
  readonly reviewed: boolean;
  /** Foot baseline within each untrimmed native cell. */
  readonly footRatio: number;
  /** Measured foot pivots, native pixels; stabilise cell composition without editing drawings. */
  readonly nativePivots?: readonly (readonly [number, number])[];
}
export interface PitArenaLifeActor {
  readonly id: string;
  readonly sheetId: PitArenaLifeSheet["id"];
  readonly x: number;
  readonly bottom: number;
  readonly height: number;
  readonly parallax: number;
  readonly phaseOffset: number;
  readonly mirror: boolean;
}

export const PIT_ARENA_LIFE_SHEETS: readonly PitArenaLifeSheet[] = [
  { id: "colony-watchers", src: "/game/sprites/v54/pit-life/colony-watchers.png", columns: 3, rows: 2, frameCount: 6, fps: 3, reviewed: true, footRatio: 483 / 512, nativePivots: [[286,483],[254,483],[243,483],[286,482],[253,482],[244,482]] },
  { id: "yautja-spectators", src: "/game/sprites/v54/pit-life/yautja-spectators.png", columns: 3, rows: 2, frameCount: 6, fps: 3, reviewed: true, footRatio: 502 / 512, nativePivots: [[262,502],[261,502],[257,502],[263,500],[256,500],[258,500]] },
];
const watchers: readonly PitArenaLifeActor[] = [
  { id: "left-clan-observers", sheetId: "yautja-spectators", x: 130, bottom: 430, height: 98, parallax: .43, phaseOffset: 0, mirror: false },
  { id: "right-clan-observers", sheetId: "yautja-spectators", x: 830, bottom: 430, height: 98, parallax: .43, phaseOffset: 41, mirror: true },
];
export const PIT_ARENA_LIFE_CAST: Readonly<Record<string, readonly PitArenaLifeActor[]>> = {
  "arena-138-avp-ryushi-prosperity-wells": [
    { id: "ranch-workers", sheetId: "colony-watchers", x: 155, bottom: 430, height: 92, parallax: .43, phaseOffset: 0, mirror: false },
  ],
  "arena-016-terrasse-des-jeunes-sangs": watchers,
  "arena-035-fosse-des-cent-masques": watchers,
};

export function getPitArenaLifeCast(arenaId: string) { return PIT_ARENA_LIFE_CAST[arenaId] ?? []; }
export function getPitArenaLifePaths(arenaId: string): readonly string[] {
  return [...new Set(getPitArenaLifeCast(arenaId).flatMap(actor => {
    const sheet = PIT_ARENA_LIFE_SHEETS.find(candidate => candidate.id === actor.sheetId);
    return sheet?.reviewed ? [sheet.src] : [];
  }))];
}
/** 60 simulation ticks/sec, six distinct drawings at 3 fps. Repeating a frame never advances time. */
export function getPitArenaLifeFrame(frame: number, phaseOffset = 0, reducedMotion = false): number {
  if (reducedMotion || !Number.isFinite(frame) || !Number.isFinite(phaseOffset)) return 0;
  return Math.floor((Math.max(0, Math.floor(frame)) + Math.max(0, Math.floor(phaseOffset))) / 20) % 6;
}
export function isPitArenaLifeSheetSize(width: number, height: number): boolean {
  return Number.isInteger(width) && Number.isInteger(height) && width >= 96 && height >= 64
    && width % 3 === 0 && height % 2 === 0 && width / 3 === height / 2;
}
