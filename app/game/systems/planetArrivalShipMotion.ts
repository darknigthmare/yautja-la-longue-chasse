import { shipProfileAssetPath, type ShipId } from '../shipCatalogue';
import { carrierArtForShip, type ArrivalArtPoint, type ArrivalCarrierArt } from './planetArrivalArt';
import { ARRIVAL_ADDITIONAL_SHIP_MOTION_CALIBRATIONS } from './planetArrivalShipMotionCalibrations';
import type { PlanetInsertionPlan } from './planetInsertion';

/**
 * Camera-view sprites for the existing classical hull. These are presentation
 * frames, not new spacecraft identities or a second simulation/animation clock.
 * The historical V13 "top" image is deliberately excluded: it is a different
 * interpretation of this hull and cannot be an animation frame of the V12 art.
 */
export const ARRIVAL_SHIP_MOTION_VERSION = 1 as const;
export const ARRIVAL_SHIP_MOTION_HULL: ShipId = 'classic-predator-spaceship';
export const ARRIVAL_SHIP_MOTION_TRANSITION_MS = 160;

export type ArrivalShipVariantId =
  | 'forward-quarter'
  | 'forward-quarter-shallow'
  | 'bank-dorsal'
  | 'bank-dorsal-shallow'
  | 'bank-ventral'
  | 'bank-ventral-shallow'
  | 'rear-quarter-shallow'
  | 'rear-quarter';
export type ArrivalShipViewId = 'profile' | ArrivalShipVariantId;

export interface ArrivalShipCameraAttitude {
  /** Authored camera target, not a measured or canonical three-dimensional angle. */
  yawDeg: number;
  rollDeg: number;
  pitchDeg: number;
}

export interface ArrivalShipExhaustSocket {
  id: 'main';
  /** Full source-canvas coordinates, including transparent margins. */
  point: ArrivalArtPoint;
  /** Outward direction in source-image clockwise degrees. Facing is applied later. */
  angle: number;
  /** Uninspected sockets stay invisible; a tail landmark is not engine approval. */
  visibility: number;
  review: 'unreviewed' | 'inspected-source-art';
}

export interface ArrivalShipMotionView {
  id: ArrivalShipViewId;
  shipId: ShipId;
  path: string;
  art: ArrivalCarrierArt;
  pivot: ArrivalArtPoint;
  exhaust: readonly ArrivalShipExhaustSocket[];
  attitude: ArrivalShipCameraAttitude;
  attitudeBasis: 'authored-camera-target';
  /** Projected nose-to-tail length as a fraction of the full source width. */
  projectedHullSpan: number;
  calibration: 'pending-measurement' | 'inspected-source-art';
}

export interface ArrivalShipMotionFrame {
  from: ArrivalShipMotionView;
  to: ArrivalShipMotionView | null;
  /** Opacity of `to`; `from` has opacity 1 - mix. Held frames have to=null. */
  mix: number;
  /** One continuous geometry for the rendered hull's tracked attachment points. */
  art: ArrivalCarrierArt;
  pivot: ArrivalArtPoint;
  exhaust: readonly ArrivalShipExhaustSocket[];
  attitude: ArrivalShipCameraAttitude;
  projectedHullSpan: number;
  /** True only for unsupported hulls or an unavailable requested optional frame. */
  fallback: boolean;
}

export interface ArrivalShipViewTransform {
  /** Full-canvas fractions, multiplied by the rendered width/height in CSS. */
  translateX: number;
  translateY: number;
  /** Clockwise source-space rotation, before the carrier's facing mirror. */
  rotationDeg: number;
  scale: number;
  /** Cancels only the source-to-frame canvas stretch, before the uniform
   * registration. Absent for matching canvases, including every classic view. */
  sourceScale?: { x: number; y: number };
}

type PixelPoint = readonly [number, number];
export interface ArrivalShipMotionViewCalibration {
  path: string;
  width: number;
  height: number;
  nose: PixelPoint;
  tail: PixelPoint;
  release: PixelPoint;
  pivot: PixelPoint;
  calibration: 'inspected-source-art';
}

export interface ArrivalShipMotionFamilyCalibration {
  /** Exact active profile inspected alongside the generated perspectives. */
  profilePath: string;
  sourceReview: string;
  methods: readonly PlanetInsertionPlan['method'][];
  views: Readonly<Partial<Record<ArrivalShipVariantId, ArrivalShipMotionViewCalibration>>>;
}

export interface ArrivalShipMotionFamily {
  shipId: ShipId;
  methods: readonly PlanetInsertionPlan['method'][];
  views: Readonly<Partial<Record<ArrivalShipVariantId, ArrivalShipMotionView>>>;
  paths: readonly string[];
  sourceReview: string;
}

interface ClassicViewCalibration {
  nose: PixelPoint;
  tail: PixelPoint;
  release: PixelPoint;
  pivot: PixelPoint;
  exhaust: PixelPoint;
  exhaustAngleDeg: number;
  exhaustVisibility: 0 | 1;
  calibration: ArrivalShipMotionView['calibration'];
  exhaustReview: ArrivalShipExhaustSocket['review'];
}

const WIDTH = 1536;
const HEIGHT = 1024;
const point = ([x, y]: PixelPoint): ArrivalArtPoint => ({ x: x / WIDTH, y: y / HEIGHT });
const clamped = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
const smooth = (value: number) => { const p = clamped(value); return p * p * (3 - 2 * p); };
const blend = (a: number, b: number, p: number) => a + (b - a) * p;
const blendPoint = (a: ArrivalArtPoint, b: ArrivalArtPoint, p: number): ArrivalArtPoint =>
  ({ x: blend(a.x, b.x, p), y: blend(a.y, b.y, p) });

const hullSpan = (art: ArrivalCarrierArt) => Math.hypot(art.nose.x - art.tail.x,
  (art.nose.y - art.tail.y) * art.height / art.width);
const aftAngle = (art: ArrivalCarrierArt) => Math.atan2(
  (art.tail.y - art.nose.y) * art.height, (art.tail.x - art.nose.x) * art.width,
) * 180 / Math.PI;

/**
 * Measured against the complete 1536×1024 output canvases. The nose is the
 * midpoint of both leading prongs, intentionally inside their fork; tail and
 * visible nozzle center are distinct. Pivots preserve the original profile's
 * axis-relative offset. This is technical source-art inspection, not canonical
 * geometry or human artistic acceptance. See the adjacent production report:
 * production/ship-motion-20261105/art/sprite-review.json.
 * Active launches and ground contacts always retain the original profile.
 */
export const ARRIVAL_CLASSIC_SHIP_MOTION_CALIBRATION: Readonly<Record<ArrivalShipVariantId, ClassicViewCalibration>> = Object.freeze({
  'forward-quarter': { nose: [142.5, 505.75], tail: [1402, 478], release: [650, 683], pivot: [774, 517],
    exhaust: [1402, 478], exhaustAngleDeg: 0, exhaustVisibility: 0,
    calibration: 'inspected-source-art', exhaustReview: 'inspected-source-art' },
  'forward-quarter-shallow': { nose: [140.5, 507], tail: [1394, 493], release: [600, 670], pivot: [769, 526],
    exhaust: [1394, 493], exhaustAngleDeg: 0, exhaustVisibility: 0,
    calibration: 'inspected-source-art', exhaustReview: 'inspected-source-art' },
  'bank-dorsal': { nose: [117.5, 494.5], tail: [1430, 472.5], release: [550, 669], pivot: [775, 509],
    exhaust: [1430, 472.5], exhaustAngleDeg: 0, exhaustVisibility: 0,
    calibration: 'inspected-source-art', exhaustReview: 'inspected-source-art' },
  'bank-dorsal-shallow': { nose: [121, 520.75], tail: [1426, 516.5], release: [550, 682], pivot: [775, 544],
    exhaust: [1426, 516.5], exhaustAngleDeg: 0, exhaustVisibility: 0,
    calibration: 'inspected-source-art', exhaustReview: 'inspected-source-art' },
  'bank-ventral': { nose: [122.5, 453], tail: [1414, 504.5], release: [550, 652], pivot: [770, 505],
    exhaust: [1414, 504.5], exhaustAngleDeg: 0, exhaustVisibility: 0,
    calibration: 'inspected-source-art', exhaustReview: 'inspected-source-art' },
  'bank-ventral-shallow': { nose: [106.5, 479.25], tail: [1430, 500], release: [550, 640], pivot: [770, 515],
    exhaust: [1430, 500], exhaustAngleDeg: 0, exhaustVisibility: 0,
    calibration: 'inspected-source-art', exhaustReview: 'inspected-source-art' },
  'rear-quarter-shallow': { nose: [164, 469], tail: [1392, 481], release: [470, 652], pivot: [779, 501],
    exhaust: [1364, 482], exhaustAngleDeg: 0, exhaustVisibility: 1,
    calibration: 'inspected-source-art', exhaustReview: 'inspected-source-art' },
  'rear-quarter': { nose: [132.5, 475.25], tail: [1420, 490.5], release: [425, 652], pivot: [778, 509],
    exhaust: [1378, 491], exhaustAngleDeg: 0, exhaustVisibility: 1,
    calibration: 'inspected-source-art', exhaustReview: 'inspected-source-art' },
});

function classicView(id: ArrivalShipVariantId, yawDeg: number, rollDeg: number): ArrivalShipMotionView {
  const calibration = ARRIVAL_CLASSIC_SHIP_MOTION_CALIBRATION[id];
  const art: ArrivalCarrierArt = {
    ...carrierArtForShip(ARRIVAL_SHIP_MOTION_HULL), width: WIDTH, height: HEIGHT,
    nose: point(calibration.nose), tail: point(calibration.tail), release: point(calibration.release),
    review: calibration.calibration === 'inspected-source-art' ? 'inspected-source-art' : 'unreviewed',
    directionBasis: 'authored-view-with-perspective',
  };
  return Object.freeze({
    id, shipId: ARRIVAL_SHIP_MOTION_HULL,
    path: `/game/planet-arrival/ship-motion-v1/classic-${id}.webp`,
    art, pivot: point(calibration.pivot),
    exhaust: [{ id: 'main' as const, point: point(calibration.exhaust), angle: calibration.exhaustAngleDeg,
      visibility: calibration.exhaustReview === 'inspected-source-art' ? calibration.exhaustVisibility : 0,
      review: calibration.exhaustReview }],
    attitude: { yawDeg, rollDeg, pitchDeg: 0 }, attitudeBasis: 'authored-camera-target' as const,
    projectedHullSpan: hullSpan(art), calibration: calibration.calibration,
  });
}

export const ARRIVAL_CLASSIC_SHIP_VIEWS: Readonly<Record<ArrivalShipVariantId, ArrivalShipMotionView>> = Object.freeze({
  'forward-quarter': classicView('forward-quarter', 22, 0),
  'forward-quarter-shallow': classicView('forward-quarter-shallow', 8, 0),
  'bank-dorsal': classicView('bank-dorsal', 0, 24),
  'bank-dorsal-shallow': classicView('bank-dorsal-shallow', 0, 12),
  'bank-ventral': classicView('bank-ventral', 0, -24),
  'bank-ventral-shallow': classicView('bank-ventral-shallow', 0, -12),
  'rear-quarter-shallow': classicView('rear-quarter-shallow', -8, 0),
  'rear-quarter': classicView('rear-quarter', -22, 0),
});
const CLASSIC_VIEW_PATHS = Object.freeze(Object.values(ARRIVAL_CLASSIC_SHIP_VIEWS).map(view => view.path));
const NO_VIEW_PATHS: readonly string[] = Object.freeze([]);

function profileView(shipId: ShipId): ArrivalShipMotionView {
  const art = carrierArtForShip(shipId);
  const classic = shipId === ARRIVAL_SHIP_MOTION_HULL;
  return {
    id: 'profile', shipId, path: shipProfileAssetPath(shipId), art, pivot: { x: .5, y: .5 },
    // The classic profile exposes the engine housing, not its open rear face.
    // Other hulls need their own nozzle inspection before they can receive VFX.
    exhaust: [{ id: 'main', point: classic ? point([1405, 486]) : art.tail,
      angle: classic ? 0 : aftAngle(art), visibility: 0,
      review: classic ? 'inspected-source-art' : 'unreviewed' }],
    attitude: { yawDeg: 0, rollDeg: 0, pitchDeg: 0 }, attitudeBasis: 'authored-camera-target',
    projectedHullSpan: hullSpan(art), calibration: art.review === 'inspected-source-art' ? 'inspected-source-art' : 'pending-measurement',
  };
}

/** Keep available image nodes mounted between uses. Participants remain first
 * in their original from/to order; the other slots never contribute opacity.
 * An unavailable family retains only the frame's existing fallback source. */
export function arrivalShipViewSlots(frame: ArrivalShipMotionFrame,
  unavailablePaths: readonly string[] = []): readonly { view: ArrivalShipMotionView; opacity: number }[] {
  const active = [{ view: frame.from, opacity: 1 - frame.mix },
    ...(frame.to ? [{ view: frame.to, opacity: frame.mix }] : [])].filter(entry => entry.opacity > 0);
  const family = ARRIVAL_SHIP_MOTION_FAMILIES[frame.from.shipId];
  if (frame.fallback || !family || family.paths.some(path => unavailablePaths.includes(path))) return active;
  const activeIds = new Set(active.map(entry => entry.view.id));
  const retained = [profileView(frame.from.shipId), ...Object.values(family.views)]
    .filter(view => !activeIds.has(view.id)).map(view => ({ view, opacity: 0 }));
  return [...active, ...retained];
}

interface ViewCue { atMs: number; id: ArrivalShipViewId; durationMs: number }
const cue = (atMs: number, id: ArrivalShipViewId, durationMs = ARRIVAL_SHIP_MOTION_TRANSITION_MS): ViewCue => ({ atMs, id, durationMs });

/** First visible frame arrives on the existing 13s camera cut. Every later
 * change passes through adjacent shallow views; direction families meet at the
 * original profile. In particular 22.26–24.4s retains the complete launch art. */
const APPROACH_CUES: readonly ViewCue[] = Object.freeze([
  cue(13_000, 'forward-quarter', 0),
  cue(15_200, 'forward-quarter-shallow'),
  cue(17_100, 'profile'),
  cue(18_800, 'bank-dorsal-shallow'),
  cue(20_000, 'bank-dorsal'),
  cue(21_000, 'bank-dorsal-shallow'),
  cue(22_100, 'profile'),
]);
const POD_CUES: readonly ViewCue[] = Object.freeze([
  ...APPROACH_CUES,
  cue(24_400, 'rear-quarter-shallow'),
  cue(26_400, 'rear-quarter'),
]);
const SHIP_CUES: readonly ViewCue[] = Object.freeze([
  ...APPROACH_CUES,
  cue(24_400, 'bank-ventral-shallow'),
  cue(26_200, 'bank-ventral'),
  // The same view spans the release/descent label change at31s.
  cue(34_800, 'bank-ventral-shallow'),
  cue(37_000, 'profile'),
  cue(42_000, 'forward-quarter-shallow'),
  cue(44_000, 'forward-quarter'),
  cue(45_400, 'forward-quarter-shallow'),
  cue(47_000, 'profile'),
]);

function inspectedFamily(shipId: ShipId, calibration: ArrivalShipMotionFamilyCalibration): ArrivalShipMotionFamily | null {
  const { methods } = calibration;
  if (!calibration.sourceReview || calibration.profilePath !== shipProfileAssetPath(shipId) ||
    !methods.length || new Set(methods).size !== methods.length ||
    !methods.every(method => method === 'pod' || method === 'ship')) return null;
  const required = new Set(methods.flatMap(method => (method === 'ship' ? SHIP_CUES : POD_CUES)
    .map(entry => entry.id).filter((id): id is ArrivalShipVariantId => id !== 'profile')));
  const entries = Object.entries(calibration.views) as [ArrivalShipVariantId, ArrivalShipMotionViewCalibration][];
  if (entries.length !== required.size || entries.some(([id]) => !required.has(id))) return null;
  const original = carrierArtForShip(shipId);
  const direction = Math.sign(original.nose.x - original.tail.x);
  const paths = new Set<string>();
  const views: Partial<Record<ArrivalShipVariantId, ArrivalShipMotionView>> = {};
  for (const [id, measured] of entries) {
    if (measured.calibration !== 'inspected-source-art' ||
      !Number.isInteger(measured.width) || measured.width <= 0 ||
      !Number.isInteger(measured.height) || measured.height <= 0 ||
      !measured.path.startsWith('/game/planet-arrival/') || !measured.path.endsWith('.webp') ||
      measured.path === calibration.profilePath || paths.has(measured.path) ||
      ![measured.nose, measured.tail, measured.release, measured.pivot].every(([x, y]) =>
        Number.isFinite(x) && Number.isFinite(y) && x >= 0 && x <= measured.width && y >= 0 && y <= measured.height) ||
      Math.sign(measured.nose[0] - measured.tail[0]) !== direction) return null;
    paths.add(measured.path);
    const sourcePoint = ([x, y]: PixelPoint): ArrivalArtPoint => ({ x: x / measured.width, y: y / measured.height });
    const art: ArrivalCarrierArt = { ...original, width: measured.width, height: measured.height,
      nose: sourcePoint(measured.nose), tail: sourcePoint(measured.tail), release: sourcePoint(measured.release),
      review: 'inspected-source-art', directionBasis: 'authored-view-with-perspective' };
    views[id] = Object.freeze({ id, shipId, path: measured.path, art, pivot: sourcePoint(measured.pivot),
      // This hidden marker preserves the profile's socket identity, not an
      // approved nozzle. New hulls cannot borrow the classic engine effects.
      exhaust: [{ id: 'main' as const, point: art.tail, angle: aftAngle(art), visibility: 0,
        review: 'unreviewed' as const }],
      attitude: { ...ARRIVAL_CLASSIC_SHIP_VIEWS[id].attitude }, attitudeBasis: 'authored-camera-target' as const,
      projectedHullSpan: hullSpan(art), calibration: measured.calibration });
  }
  return Object.freeze({ shipId, methods: Object.freeze([...methods]), views: Object.freeze(views),
    paths: Object.freeze([...paths]), sourceReview: calibration.sourceReview });
}

/** Only complete, inspected families participate. An unsupported method or
 * rejected registration retains that selected hull's historical profile. */
export const ARRIVAL_SHIP_MOTION_FAMILIES: Readonly<Partial<Record<ShipId, ArrivalShipMotionFamily>>> = Object.freeze({
  [ARRIVAL_SHIP_MOTION_HULL]: Object.freeze({ shipId: ARRIVAL_SHIP_MOTION_HULL,
    methods: Object.freeze(['pod', 'ship'] as const), views: ARRIVAL_CLASSIC_SHIP_VIEWS, paths: CLASSIC_VIEW_PATHS,
    sourceReview: 'production/ship-motion-20261105/art/sprite-review.json' }),
  ...Object.fromEntries(Object.entries(ARRIVAL_ADDITIONAL_SHIP_MOTION_CALIBRATIONS).flatMap(([id, calibration]) => {
    if (id === ARRIVAL_SHIP_MOTION_HULL || !calibration) return [];
    const family = inspectedFamily(id as ShipId, calibration);
    return family ? [[id, family]] : [];
  })),
});

/** Optional preloads; never merge them into the required cinematic asset gate. */
export function arrivalShipMotionAssetPaths(shipId: ShipId): readonly string[] {
  return ARRIVAL_SHIP_MOTION_FAMILIES[shipId]?.paths ?? NO_VIEW_PATHS;
}

function held(view: ArrivalShipMotionView, fallback = false): ArrivalShipMotionFrame {
  return { from: view, to: null, mix: 0, art: view.art, pivot: view.pivot, exhaust: view.exhaust,
    attitude: view.attitude, projectedHullSpan: view.projectedHullSpan, fallback };
}

/**
 * Align both projected hull axes during a dissolve, using uniform scale only.
 * CSS must use view.pivot as transform-origin and apply, in this written order,
 * translate(translateX * width, translateY * height) rotate(rotationDeg) scale(scale),
 * followed by scale(sourceScale.x, sourceScale.y) when present. The latter
 * cancels the image's initial canvas stretch: source pixels then receive one
 * uniform scale and rotation, even when the two native canvases differ.
 * The parent carrier then applies its facing mirror and world rotation. The
 * center compensation also supports the profile's unchanged (.5, .5) pivot.
 */
export function arrivalShipViewRegistration(frame: Pick<ArrivalShipMotionFrame, 'art'>,
  view: ArrivalShipMotionView): ArrivalShipViewTransform {
  if (frame.art === view.art) return { translateX: 0, translateY: 0, rotationDeg: 0, scale: 1 };
  const aspect = frame.art.height / frame.art.width;
  const sourceScale = view.art.width === frame.art.width && view.art.height === frame.art.height ? undefined
    : { x: view.art.width / frame.art.width, y: view.art.height / frame.art.height };
  const sourceAxis = { x: (view.art.tail.x - view.art.nose.x) * (sourceScale?.x ?? 1),
    y: (view.art.tail.y - view.art.nose.y) * aspect * (sourceScale?.y ?? 1) };
  const targetAxis = { x: frame.art.tail.x - frame.art.nose.x, y: (frame.art.tail.y - frame.art.nose.y) * aspect };
  const rotation = Math.atan2(targetAxis.y, targetAxis.x) - Math.atan2(sourceAxis.y, sourceAxis.x);
  const scale = Math.hypot(targetAxis.x, targetAxis.y) / Math.hypot(sourceAxis.x, sourceAxis.y);
  const sourceCenter = blendPoint(view.art.nose, view.art.tail, .5);
  const targetCenter = blendPoint(frame.art.nose, frame.art.tail, .5);
  const dx = (sourceCenter.x - view.pivot.x) * (sourceScale?.x ?? 1);
  const dy = (sourceCenter.y - view.pivot.y) * aspect * (sourceScale?.y ?? 1);
  const cosine = Math.cos(rotation), sine = Math.sin(rotation);
  return {
    translateX: targetCenter.x - view.pivot.x - scale * (dx * cosine - dy * sine),
    translateY: targetCenter.y - view.pivot.y - scale * (dx * sine + dy * cosine) / aspect,
    rotationDeg: rotation * 180 / Math.PI, scale, ...(sourceScale ? { sourceScale } : {}),
  };
}

function registeredPoint(frame: Pick<ArrivalShipMotionFrame, 'art'>, view: ArrivalShipMotionView,
  point: ArrivalArtPoint, registration: ArrivalShipViewTransform): ArrivalArtPoint {
  const aspect = frame.art.height / frame.art.width;
  const radians = registration.rotationDeg * Math.PI / 180;
  const dx = (point.x - view.pivot.x) * (registration.sourceScale?.x ?? 1);
  const dy = (point.y - view.pivot.y) * aspect * (registration.sourceScale?.y ?? 1);
  const cosine = Math.cos(radians), sine = Math.sin(radians);
  return {
    x: view.pivot.x + registration.translateX + registration.scale * (dx * cosine - dy * sine),
    y: view.pivot.y + registration.translateY + registration.scale * (dx * sine + dy * cosine) / aspect,
  };
}

/** Source attachment mapped by exactly the same transform as its visible pixels. */
export function arrivalShipViewPoint(frame: Pick<ArrivalShipMotionFrame, 'art'>,
  view: ArrivalShipMotionView, point: ArrivalArtPoint): ArrivalArtPoint {
  return registeredPoint(frame, view, point, arrivalShipViewRegistration(frame, view));
}

function transition(from: ArrivalShipMotionView, to: ArrivalShipMotionView, mix: number): ArrivalShipMotionFrame {
  const art: ArrivalCarrierArt = {
    width: blend(from.art.width, to.art.width, mix), height: blend(from.art.height, to.art.height, mix),
    nose: blendPoint(from.art.nose, to.art.nose, mix), tail: blendPoint(from.art.tail, to.art.tail, mix),
    release: blendPoint(from.art.release, to.art.release, mix),
    groundContact: blendPoint(from.art.groundContact, to.art.groundContact, mix),
    groundExit: blendPoint(from.art.groundExit, to.art.groundExit, mix),
    review: from.art.review === 'inspected-source-art' && to.art.review === 'inspected-source-art' ? 'inspected-source-art' : 'unreviewed',
    directionBasis: 'authored-view-with-perspective',
  };
  const pivot = blendPoint(from.pivot, to.pivot, mix);
  const geometry = { art };
  const fromTransform = arrivalShipViewRegistration(geometry, from);
  const toTransform = arrivalShipViewRegistration(geometry, to);
  const fromPoint = (point: ArrivalArtPoint) => registeredPoint(geometry, from, point, fromTransform);
  const toPoint = (point: ArrivalArtPoint) => registeredPoint(geometry, to, point, toTransform);
  // Registration rotates/scales each view. Raw source-coordinate interpolation
  // would make these attachments drift away from their own painted hulls.
  for (const key of ['release', 'groundContact', 'groundExit'] as const) {
    art[key] = blendPoint(fromPoint(from.art[key]), toPoint(to.art[key]), mix);
  }
  return {
    from, to, mix, art, pivot,
    exhaust: from.exhaust.map(socket => {
      const target = to.exhaust.find(next => next.id === socket.id);
      const sourceReviewed = socket.review === 'inspected-source-art';
      const targetReviewed = target?.review === 'inspected-source-art';
      // A nozzle appearing/disappearing behind the hull fades with its own
      // inspected view. Never snap it on at the last frame, or drag it toward
      // an uninspected tail landmark. The offset matches the registered paint.
      const sourceWeight = sourceReviewed ? (1 - mix) * socket.visibility : 0;
      const targetWeight = targetReviewed ? mix * target.visibility : 0;
      const visibility = sourceWeight + targetWeight;
      const sourceVisible = sourceWeight > 0, targetVisible = targetWeight > 0;
      const socketMix = visibility > 0 ? targetWeight / visibility : mix;
      const sourceAngle = socket.angle + fromTransform.rotationDeg;
      const targetAngle = target ? target.angle + toTransform.rotationDeg : sourceAngle;
      return { ...socket,
        point: sourceVisible && targetVisible ? blendPoint(fromPoint(socket.point), toPoint(target!.point), socketMix)
          : sourceVisible ? fromPoint(socket.point)
            : targetVisible ? toPoint(target!.point) : fromPoint(socket.point),
        angle: sourceVisible && targetVisible
          ? sourceAngle + ((targetAngle - sourceAngle + 540) % 360 - 180) * socketMix
          : targetVisible ? targetAngle : sourceAngle,
        visibility,
        review: sourceReviewed || targetReviewed ? 'inspected-source-art' : 'unreviewed' };
    }),
    attitude: { yawDeg: blend(from.attitude.yawDeg, to.attitude.yawDeg, mix),
      rollDeg: blend(from.attitude.rollDeg, to.attitude.rollDeg, mix),
      pitchDeg: blend(from.attitude.pitchDeg, to.attitude.pitchDeg, mix) },
    projectedHullSpan: hullSpan(art), fallback: false,
  };
}

/**
 * A pure reading of the existing persisted elapsedMs. Pause, seek, replay and
 * reduced motion never create another clock or alter campaign state. Supply
 * failed OR not-yet-decoded optional paths in unavailablePaths; if this view
 * family is incomplete, use the selected hull's complete original profile.
 * Keep that decision for the full sequence so later available angles cannot
 * suddenly appear after a failed intermediate view.
 * Never substitute the classic hull for a different player's ship.
 */
export function arrivalShipMotionFrame(shipId: ShipId, elapsedMs: number,
  method: PlanetInsertionPlan['method'], reducedMotion = false,
  unavailablePaths: readonly string[] = []): ArrivalShipMotionFrame {
  const profile = profileView(shipId);
  const family = ARRIVAL_SHIP_MOTION_FAMILIES[shipId];
  if (!family || !family.methods.includes(method)) return held(profile, true);
  const time = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  // Landing and the eventual HuntCanvas must use exactly the same image/pivot.
  if (reducedMotion || time < 13_000 || time >= 49_000) return held(profile);
  const cues = method === 'ship' ? SHIP_CUES : POD_CUES;
  let previous: ArrivalShipViewId = 'profile';
  let active: ViewCue | null = null;
  for (const entry of cues) {
    if (entry.atMs > time) break;
    if (active) previous = active.id;
    active = entry;
  }
  if (!active) return held(profile);
  const view = (id: ArrivalShipViewId) => id === 'profile' ? profile : family.views[id];
  const target = view(active.id);
  const inTransition = active.durationMs > 0 && time < active.atMs + active.durationMs;
  const source = inTransition ? view(previous) : target;
  if (!source || !target) return held(profile, true);
  const familyUnavailable = arrivalShipMotionAssetPaths(shipId).some(path => unavailablePaths.includes(path));
  if (familyUnavailable && (source.id !== 'profile' || target.id !== 'profile')) return held(profile, true);
  return inTransition ? transition(source, target, smooth((time - active.atMs) / active.durationMs)) : held(target);
}
