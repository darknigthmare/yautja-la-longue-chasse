/** Original Vharuun extension. These coordinates never replace the historical V1 terrain. */
export const GAME_RESERVE_LOOKOUT_V104_WORLD = { width: 6400, height: 540, ground: 438, returnX: 115 } as const;
export const GAME_RESERVE_LOOKOUT_V104_SECTOR = { id: "beacon-ridge", name: "Crête des Balises", left: 4800, right: 6400 } as const;
export const GAME_RESERVE_LOOKOUT_V104_PLATFORMS = [
  { x: 4600, y: 360, w: 240 }, { x: 4920, y: 300, w: 280 }, { x: 5280, y: 345, w: 280 },
  { x: 5640, y: 280, w: 320 }, { x: 6040, y: 340, w: 260 },
] as const;
export const GAME_RESERVE_LOOKOUT_V104_COVER = [
  { x: 4860, w: 95, top: 345 }, { x: 5320, w: 90, top: 355 }, { x: 6080, w: 110, top: 340 },
] as const;
export const GAME_RESERVE_LOOKOUT_V104_SURVEY = { x: 5840, y: 280, range: 30, ticks: 120 } as const;
export interface GameReserveLookoutV104Record {
  recordedAt: number | null; hunterX: number | null; hunterY: number | null;
}
