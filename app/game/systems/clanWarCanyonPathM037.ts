export const CANYON_GEOMETRY_V85 = { start: 6, finish: 96, westRamp: 20, eastStair: 86, bridgeWest: 48, bridgeEast: 56 } as const;
const SIGNS = [34, 72] as const;
type Level = 0 | 1;
export type CanyonDecisionM037 = "consolider" | "pousser";

export interface CanyonPositionM037 {
  x: number;
  level: Level;
  checked: number[];
}

export function initialCanyonPositionM037(): CanyonPositionM037 {
  return { x: CANYON_GEOMETRY_V85.start, level: 0, checked: [] };
}

export function walkCanyonM037<Patrol extends CanyonPositionM037>(patrol: Patrol, direction: -1 | 1): Patrol {
  const { start, finish, bridgeWest, bridgeEast } = CANYON_GEOMETRY_V85;
  const x = Math.max(start, Math.min(finish, patrol.x + direction * 4));
  if (patrol.level === 1 && ((patrol.x <= bridgeWest && x > bridgeWest)
    || (patrol.x >= bridgeEast && x < bridgeEast))) return patrol;
  return { ...patrol, x };
}

export function changeCanyonLevelM037<Patrol extends CanyonPositionM037>(patrol: Patrol): Patrol {
  const { westRamp, eastStair } = CANYON_GEOMETRY_V85;
  return patrol.x <= westRamp || patrol.x >= eastStair
    ? { ...patrol, level: patrol.level === 0 ? 1 : 0 } : patrol;
}

export function nearCanyonSignM037(patrol: CanyonPositionM037): number | undefined {
  return SIGNS.find(sign => Math.abs(sign - patrol.x) <= 2
    && patrol.level === (sign === SIGNS[0] ? 1 : 0)
    && !patrol.checked.includes(sign));
}

export function checkCanyonSignM037<Patrol extends CanyonPositionM037>(patrol: Patrol): Patrol {
  const sign = nearCanyonSignM037(patrol);
  return sign === undefined ? patrol : { ...patrol, checked: [...patrol.checked, sign] };
}

export function canyonDecisionM037(patrol: CanyonPositionM037): CanyonDecisionM037 | null {
  if (patrol.level !== 0 || !SIGNS.every(sign => patrol.checked.includes(sign))) return null;
  if (patrol.x === CANYON_GEOMETRY_V85.start) return "consolider";
  if (patrol.x === CANYON_GEOMETRY_V85.finish) return "pousser";
  return null;
}
