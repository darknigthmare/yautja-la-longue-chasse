import type { HomeworldVec2 } from './homeworldCity';

export const HOMEWORLD_SKIFF_W3_S09 = {
  vessel: 'lava-skiff-v77',
  pilot: 'lava-ferryman-v77',
  destination: 'thermal-caves',
  shore: { x: 260, y: 3850 },
  seconds: 12,
} as const;

export type HomeworldSkiffArrivalW3S09 = Readonly<{
  vessel: typeof HOMEWORLD_SKIFF_W3_S09.vessel;
  pilot: typeof HOMEWORLD_SKIFF_W3_S09.pilot;
  destination: typeof HOMEWORLD_SKIFF_W3_S09.destination;
  shore: Readonly<HomeworldVec2>;
  seconds: number;
}>;

export type HomeworldSkiffReceiptW3S09 = HomeworldSkiffArrivalW3S09 & { runId: string };
const landed = new WeakSet<HomeworldSkiffArrivalW3S09>();
const route = HOMEWORLD_SKIFF_W3_S09;

export function recordSkiffLandingW3S09(shore: HomeworldVec2, seconds: number): HomeworldSkiffArrivalW3S09 | undefined {
  const offset = Math.hypot(shore.x - route.shore.x, shore.y - route.shore.y);
  if (seconds !== route.seconds || !Number.isFinite(offset) || offset > 0.01) return;
  const arrival = Object.freeze({ ...route, shore: Object.freeze({ ...route.shore }) });
  landed.add(arrival);
  return arrival;
}

/** A completed native transit can admit one departure. Failed writes leave the proof available. */
export function skiffArrivalReceiptW3S09(arrival: HomeworldSkiffArrivalW3S09 | undefined, runId: string) {
  if (!arrival || !landed.has(arrival)) return null;
  return normalizeSkiffReceiptW3S09({ ...arrival, runId }, runId);
}

export function acknowledgeSkiffReceiptW3S09(arrival: HomeworldSkiffArrivalW3S09) {
  landed.delete(arrival);
}

export function normalizeSkiffReceiptW3S09(value: unknown, runId: unknown): HomeworldSkiffReceiptW3S09 | null {
  if (!value || typeof value !== 'object' || typeof runId !== 'string' ||
      !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(runId)) return null;
  const receipt = value as Partial<HomeworldSkiffReceiptW3S09>;
  if (Object.keys(receipt).length !== 6 || receipt.runId !== runId || receipt.vessel !== route.vessel ||
      receipt.pilot !== route.pilot || receipt.destination !== route.destination || receipt.seconds !== route.seconds ||
      receipt.shore?.x !== route.shore.x || receipt.shore.y !== route.shore.y ||
      Object.keys(receipt.shore).length !== 2) return null;
  return { ...route, shore: { ...route.shore }, runId };
}
