import { warTerrainLineOfSightV116, type WarMissionTerrainV116 } from "./clanWarMissionTerrainV116";
import type { WarStealthV115 } from "./clanWarOperationsV115";
import type { SceneAudioSample } from "./sceneAudio";

export interface WarStealthListenCueV115 extends SceneAudioSample {
  bearing: "est" | "ouest" | "proche";
}

const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/** Sample the nearest patrol at the start of the listen action. */
export function warStealthListenCueV115(
  stealth: WarStealthV115, terrain: WarMissionTerrainV116,
): WarStealthListenCueV115 | null {
  const patrol = { x: stealth.guardX, y: stealth.guardY ?? 2 };
  const support = stealth.supportGuard;
  const source = support && distance(stealth, support) < distance(stealth, patrol) ? support : patrol;
  const range = distance(stealth, source);
  if (range > 5) return null;

  const door = terrain.poweredDoor;
  const acousticTerrain = stealth.gridPowered === false
    ? { ...terrain, walls: [...terrain.walls, `${door.x},${door.y}`] }
    : terrain;
  const clear = warTerrainLineOfSightV116(acousticTerrain, stealth, source);
  const dx = source.x - stealth.x;
  const bearing = dx > 1 ? "est" : dx < -1 ? "ouest" : "proche";
  return {
    bearing,
    pan: bearing === "est" ? .65 : bearing === "ouest" ? -.65 : 0,
    gain: (.38 - .045 * range) * (clear ? 1 : .4),
    lowpassHz: clear ? 8_000 : 750,
  };
}
