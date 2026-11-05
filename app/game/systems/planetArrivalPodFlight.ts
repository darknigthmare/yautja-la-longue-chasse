import { PLANET_ARRIVAL_SHOTS } from './planetArrival';
import type { ArrivalArtPoint } from './planetArrivalArt';

/** Authored cinematic timings, not a claim about the atmosphere of every planet.
 * The space shots retain folded control petals. They deploy only after the
 * initial hot entry, within the existing stratosphere shot. No second clock. */
export const ARRIVAL_POD_ENTRY_START_MS = PLANET_ARRIVAL_SHOTS[5].startMs;
export const ARRIVAL_POD_SHUTTERS_OPEN_START_MS = ARRIVAL_POD_ENTRY_START_MS + 1_400;
export const ARRIVAL_POD_SHUTTERS_OPEN_END_MS = ARRIVAL_POD_SHUTTERS_OPEN_START_MS + 1_800;
export const ARRIVAL_POD_ENTRY_END_MS = PLANET_ARRIVAL_SHOTS[5].endMs;

const clamp = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
const smooth = (value: number) => { const p = clamp(value); return p * p * (3 - 2 * p); };

/** Read from each pod's delayed saved clock, including after pause/reload.
 * Reduced motion keeps the mechanical state but omits panel travel and flutter. */
export function arrivalPodEntryFrame(elapsedMs: number, reducedMotion = false) {
  const time = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  const inAtmosphere = time >= ARRIVAL_POD_ENTRY_START_MS && time < ARRIVAL_POD_ENTRY_END_MS;
  const opening = clamp((time - ARRIVAL_POD_SHUTTERS_OPEN_START_MS) /
    (ARRIVAL_POD_SHUTTERS_OPEN_END_MS - ARRIVAL_POD_SHUTTERS_OPEN_START_MS));
  const shuttersOpen = reducedMotion ? time >= ARRIVAL_POD_SHUTTERS_OPEN_START_MS ? 1 : 0 : smooth(opening);
  // Heating rises on entry, then the aerodynamic slowdown cools the nose.
  // Fade to zero before the deliberate cut to the surface camera.
  const heat = inAtmosphere ? smooth((time - ARRIVAL_POD_ENTRY_START_MS) / 850) *
    (1 - .35 * smooth((time - ARRIVAL_POD_SHUTTERS_OPEN_END_MS) / 1_400)) *
    (1 - smooth((time - ARRIVAL_POD_ENTRY_END_MS + 1_600) / 1_600)) : 0;
  const phase = time >= ARRIVAL_POD_ENTRY_END_MS ? 'surface' : !inAtmosphere ? 'space'
    : time < ARRIVAL_POD_SHUTTERS_OPEN_START_MS ? 'entry'
    : time < ARRIVAL_POD_SHUTTERS_OPEN_END_MS ? 'stratosphere' : 'braking';
  return {
    phase,
    shutters: shuttersOpen === 0 ? 'closed' : shuttersOpen === 1 ? 'open' : 'opening',
    shuttersOpen,
    heat,
    hullHeat: heat * (reducedMotion ? .24 : .38),
    trailOpacity: heat * (reducedMotion ? .48 : .82),
    trailWidth: 175 + 135 * heat,
    bowShockOpacity: heat * (reducedMotion ? .3 : .68),
    flutterScale: !reducedMotion && heat > 0 ? 1 + .025 * Math.sin(time / 310) * heat : 1,
    label: phase === 'entry' ? 'Entrée atmosphérique · bouclier thermique'
      : phase === 'stratosphere' ? 'Stratosphère · ouverture des volets' : 'Freinage atmosphérique',
  } as const;
}

interface PodFlightPanel {
  id: 'upper' | 'lower';
  /** Normalized against the unmodified 1536 × 1024 flight image. */
  hinge: ArrivalArtPoint;
  foldedAngle: number;
  polygon: readonly ArrivalArtPoint[];
}

const point = (x: number, y: number): ArrivalArtPoint => ({ x: x / 1536, y: y / 1024 });
const polygon = (points: readonly (readonly [number, number])[]) => points.map(([x, y]) => point(x, y));

/**
 * The V1 image was authored with its two visible control petals deployed.
 * Partition that same source into a stationary core and two moving panels.
 * The complementary core mask removes the original open petals, so no duplicate
 * fins remain in space. These are artwork measurements, not canonical blueprints.
 * At deployment=1 the three layers reconstruct the exact original silhouette.
 * The outer contours deliberately extend into the transparent margin: tracing
 * inside a bright rim leaves a detached sliver behind when the panel rotates.
 * Only the shared attachment seams need to follow the painted boundary closely.
 */
export const ARRIVAL_POD_FLIGHT_PANELS: readonly PodFlightPanel[] = Object.freeze([
  { id: 'upper', hinge: point(288, 450), foldedAngle: 37,
    polygon: polygon([[244, 434], [250, 368], [277, 333], [306, 281], [345, 236],
      [380, 209], [420, 181], [490, 147], [555, 125], [622, 104], [699, 97],
      [746, 103], [746, 140], [729, 161], [676, 217], [624, 270], [576, 322],
      [532, 370], [487, 414], [455, 438], [414, 453], [367, 476],
      [321, 480], [282, 466], [256, 452]]) },
  { id: 'lower', hinge: point(294, 578), foldedAngle: -33,
    polygon: polygon([[253, 571], [313, 553], [374, 574], [453, 604], [511, 631],
      [559, 647], [611, 697], [656, 747], [704, 798], [751, 838], [775, 855],
      [778, 878], [742, 888], [675, 874], [576, 852], [472, 814], [390, 773],
      [321, 713], [277, 656], [257, 611]]) },
]);

export function arrivalPodPanelAngle(panel: PodFlightPanel, deployment: number) {
  return panel.foldedAngle * (1 - clamp(deployment));
}

const pathFor = (points: readonly ArrivalArtPoint[]) =>
  points.map(({ x, y }, index) => `${index ? 'L' : 'M'}${x} ${y}`).join(' ') + ' Z';

/** SVG objectBoundingBox clipping preserves the source aspect ratio at any size. */
export const ARRIVAL_POD_FLIGHT_CORE_CLIP = 'M0 0 H1 V1 H0 Z ' +
  ARRIVAL_POD_FLIGHT_PANELS.map(panel => pathFor(panel.polygon)).join(' ');

export const ARRIVAL_POD_FLIGHT_PANEL_CLIPS = Object.freeze(Object.fromEntries(
  ARRIVAL_POD_FLIGHT_PANELS.map(panel => [panel.id, pathFor(panel.polygon)]),
) as Readonly<Record<PodFlightPanel['id'], string>>);
