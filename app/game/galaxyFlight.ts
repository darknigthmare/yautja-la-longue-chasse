/**
 * Pure, presentation-agnostic flight model for the galactic map.
 *
 * Coordinates are map percentages (0..100). Heading is expressed in degrees:
 * 0 points right/east and 90 points down/south, matching screen coordinates.
 */

export interface GalaxyFlightPoint {
  x: number;
  y: number;
}

export interface GalaxyFlightBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export type GalaxyFlightMode = "manual" | "autopilot";

export interface GalaxyFlightState {
  position: GalaxyFlightPoint;
  velocity: GalaxyFlightPoint;
  heading: number;
  mode: GalaxyFlightMode;
  targetId: string | null;
}

export interface GalaxyFlightTarget {
  id: string;
  position: GalaxyFlightPoint;
}

export type GalaxyFlightMapLevel =
  | "galaxy"
  | "sector"
  | "system"
  | "planet"
  | "mission";

export interface GalaxyFlightNavigationPath {
  level: GalaxyFlightMapLevel;
  sectorId: string | null;
  systemId: string | null;
  planetId: string | null;
}

export interface GalaxyShipVisualPose {
  /** A side-view ship is mirrored instead of ever being rendered upside down. */
  scaleX: -1 | 1;
  /** Screen-space bank kept inside an upright, readable range. */
  rotationDegrees: number;
}

export interface GalaxyFlightConfig {
  bounds: GalaxyFlightBounds;
  /** Map units per second squared. */
  acceleration: number;
  /** Maximum map units per second. */
  maxSpeed: number;
  /** Exponential velocity loss per second when flying manually. */
  drag: number;
  /** Maximum velocity change per second while the autopilot is steering. */
  autopilotAcceleration: number;
  /** Deceleration used to calculate the autopilot braking distance. */
  autopilotBrake: number;
  /** Exact-position snap distance for an autopilot destination. */
  arrivalRadius: number;
  /** Gameplay interaction distance around a destination. */
  interactionRadius: number;
  inputDeadzone: number;
  stopSpeed: number;
  /** Avoid a large tab-resume delta teleporting the vessel across the map. */
  maxDeltaMs: number;
}

export type GalaxyFlightConfigOverride = Partial<
  Omit<GalaxyFlightConfig, "bounds">
> & {
  bounds?: Partial<GalaxyFlightBounds>;
};

export const GALAXY_FLIGHT_BOUNDS: Readonly<GalaxyFlightBounds> = Object.freeze({
  minX: 0,
  maxX: 100,
  minY: 0,
  maxY: 100,
});

export const DEFAULT_GALAXY_FLIGHT_CONFIG: Readonly<GalaxyFlightConfig> =
  Object.freeze({
    bounds: GALAXY_FLIGHT_BOUNDS,
    acceleration: 72,
    maxSpeed: 24,
    drag: 2.6,
    autopilotAcceleration: 58,
    autopilotBrake: 46,
    arrivalRadius: 0.3,
    interactionRadius: 5,
    inputDeadzone: 0.08,
    stopSpeed: 0.035,
    maxDeltaMs: 250,
  });

export interface CreateGalaxyFlightStateOptions {
  position?: Partial<GalaxyFlightPoint>;
  velocity?: Partial<GalaxyFlightPoint>;
  heading?: number;
  mode?: GalaxyFlightMode;
  targetId?: string | null;
  bounds?: Partial<GalaxyFlightBounds>;
}

const FIXED_SUBSTEP_SECONDS = 1 / 120;
const EPSILON = 1e-9;

function finiteOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function nonNegative(value: unknown, fallback: number): number {
  return Math.max(0, finiteOr(value, fallback));
}

function positive(value: unknown, fallback: number): number {
  const finite = finiteOr(value, fallback);
  return finite > 0 ? finite : fallback;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function normalizedHeading(value: unknown, fallback = 0): number {
  const finite = finiteOr(value, fallback);
  return ((finite % 360) + 360) % 360;
}

/**
 * Convert a 360° flight heading to an upright pose for side-profile ship art.
 * The source sprite faces left: eastbound headings mirror it, while north and
 * south movement use a maximum 80° bank so the hull can never roll inverted.
 */
export function galaxyShipUprightPose(
  rawHeading: unknown,
): Readonly<GalaxyShipVisualPose> {
  const heading = normalizedHeading(rawHeading);
  const facesRight = heading <= 90 || heading >= 270;
  const signedRotation = facesRight
    ? (heading > 180 ? heading - 360 : heading)
    : heading - 180;
  return Object.freeze({
    scaleX: facesRight ? -1 : 1,
    rotationDegrees: clamp(signedRotation, -80, 80),
  });
}

/**
 * A dorsal orthographic ship can follow the complete heading without mirroring
 * or rolling upside down. V13 masters point east (nose to the right) at 0°.
 */
export function galaxyShipTopDownPose(
  rawHeading: unknown,
): Readonly<GalaxyShipVisualPose> {
  return Object.freeze({
    scaleX: 1,
    rotationDegrees: normalizedHeading(rawHeading),
  });
}

function resolveBounds(
  override: Partial<GalaxyFlightBounds> | undefined,
): GalaxyFlightBounds {
  const minX = finiteOr(override?.minX, GALAXY_FLIGHT_BOUNDS.minX);
  const maxX = finiteOr(override?.maxX, GALAXY_FLIGHT_BOUNDS.maxX);
  const minY = finiteOr(override?.minY, GALAXY_FLIGHT_BOUNDS.minY);
  const maxY = finiteOr(override?.maxY, GALAXY_FLIGHT_BOUNDS.maxY);
  return {
    minX: Math.min(minX, maxX),
    maxX: Math.max(minX, maxX),
    minY: Math.min(minY, maxY),
    maxY: Math.max(minY, maxY),
  };
}

function resolveConfig(
  override: GalaxyFlightConfigOverride | undefined,
): GalaxyFlightConfig {
  const defaults = DEFAULT_GALAXY_FLIGHT_CONFIG;
  return {
    bounds: resolveBounds(override?.bounds),
    acceleration: nonNegative(override?.acceleration, defaults.acceleration),
    maxSpeed: positive(override?.maxSpeed, defaults.maxSpeed),
    drag: nonNegative(override?.drag, defaults.drag),
    autopilotAcceleration: positive(
      override?.autopilotAcceleration,
      defaults.autopilotAcceleration,
    ),
    autopilotBrake: positive(
      override?.autopilotBrake,
      defaults.autopilotBrake,
    ),
    arrivalRadius: nonNegative(
      override?.arrivalRadius,
      defaults.arrivalRadius,
    ),
    interactionRadius: nonNegative(
      override?.interactionRadius,
      defaults.interactionRadius,
    ),
    inputDeadzone: clamp(
      nonNegative(override?.inputDeadzone, defaults.inputDeadzone),
      0,
      1,
    ),
    stopSpeed: nonNegative(override?.stopSpeed, defaults.stopSpeed),
    maxDeltaMs: positive(override?.maxDeltaMs, defaults.maxDeltaMs),
  };
}

export function clampGalaxyFlightPosition(
  point: Partial<GalaxyFlightPoint>,
  bounds: Partial<GalaxyFlightBounds> = GALAXY_FLIGHT_BOUNDS,
): GalaxyFlightPoint {
  const resolvedBounds = resolveBounds(bounds);
  return {
    x: clamp(
      finiteOr(point.x, (resolvedBounds.minX + resolvedBounds.maxX) / 2),
      resolvedBounds.minX,
      resolvedBounds.maxX,
    ),
    y: clamp(
      finiteOr(point.y, (resolvedBounds.minY + resolvedBounds.maxY) / 2),
      resolvedBounds.minY,
      resolvedBounds.maxY,
    ),
  };
}

/** Clamp an arbitrary stick/keyboard vector to a unit circle. */
export function normalizeGalaxyFlightInput(
  input: Partial<GalaxyFlightPoint> | null | undefined,
): GalaxyFlightPoint {
  const x = finiteOr(input?.x, 0);
  const y = finiteOr(input?.y, 0);
  const magnitude = Math.hypot(x, y);
  if (magnitude <= EPSILON) return { x: 0, y: 0 };
  const divisor = Math.max(1, magnitude);
  return { x: x / divisor, y: y / divisor };
}

export function galaxyFlightDistance(
  from: GalaxyFlightPoint,
  to: GalaxyFlightPoint,
): number {
  return Math.hypot(
    finiteOr(to.x, 0) - finiteOr(from.x, 0),
    finiteOr(to.y, 0) - finiteOr(from.y, 0),
  );
}

export function isGalaxyFlightNear(
  position: GalaxyFlightPoint,
  target: GalaxyFlightPoint,
  radius = DEFAULT_GALAXY_FLIGHT_CONFIG.interactionRadius,
): boolean {
  return galaxyFlightDistance(position, target) <= nonNegative(radius, 0);
}

export function hasGalaxyFlightArrived(
  position: GalaxyFlightPoint,
  target: GalaxyFlightPoint,
  radius = DEFAULT_GALAXY_FLIGHT_CONFIG.arrivalRadius,
): boolean {
  return isGalaxyFlightNear(position, target, radius);
}

export function createGalaxyFlightState(
  options: CreateGalaxyFlightStateOptions = {},
): GalaxyFlightState {
  const position = clampGalaxyFlightPosition(
    {
      x: finiteOr(options.position?.x, 50),
      y: finiteOr(options.position?.y, 50),
    },
    options.bounds,
  );
  const velocity = {
    x: finiteOr(options.velocity?.x, 0),
    y: finiteOr(options.velocity?.y, 0),
  };
  const targetId =
    typeof options.targetId === "string" && options.targetId.length > 0
      ? options.targetId
      : null;
  const mode = options.mode === "autopilot" && targetId ? "autopilot" : "manual";
  return {
    position,
    velocity,
    heading: normalizedHeading(options.heading),
    mode,
    targetId: mode === "autopilot" ? targetId : null,
  };
}

/** Convert a visual map node into the aspect-corrected flight coordinate space. */
export function galaxyFlightPointFromMapPosition(
  mapPosition: Partial<GalaxyFlightPoint>,
  aspect: number,
): GalaxyFlightPoint {
  const resolvedAspect = positive(aspect, 1);
  return {
    x: finiteOr(mapPosition.x, 50) * resolvedAspect,
    y: finiteOr(mapPosition.y, 50),
  };
}

/**
 * Return the node representing the place just exited when moving back through
 * the hierarchy: planet in system, system in sector, then sector in galaxy.
 */
export function galaxyFlightReturnAnchorId(
  previous: GalaxyFlightNavigationPath,
  destinationLevel: GalaxyFlightMapLevel,
): string | null {
  const rank: Readonly<Record<GalaxyFlightMapLevel, number>> = {
    galaxy: 0,
    sector: 1,
    system: 2,
    planet: 3,
    mission: 4,
  };
  if (rank[destinationLevel] >= rank[previous.level]) return null;
  if (destinationLevel === "galaxy") return previous.sectorId;
  if (destinationLevel === "sector") return previous.systemId;
  if (destinationLevel === "system") return previous.planetId;
  return null;
}

export function engageGalaxyAutopilot(
  state: GalaxyFlightState,
  targetId: string,
): GalaxyFlightState {
  if (!targetId) return { ...state, mode: "manual", targetId: null };
  return { ...state, mode: "autopilot", targetId };
}

export function cancelGalaxyAutopilot(
  state: GalaxyFlightState,
): GalaxyFlightState {
  return state.mode === "manual" && state.targetId === null
    ? state
    : { ...state, mode: "manual", targetId: null };
}

function limitVelocity(
  velocity: GalaxyFlightPoint,
  maxSpeed: number,
): GalaxyFlightPoint {
  const speed = Math.hypot(velocity.x, velocity.y);
  if (speed <= maxSpeed || speed <= EPSILON) return velocity;
  const scale = maxSpeed / speed;
  return { x: velocity.x * scale, y: velocity.y * scale };
}

function moveVelocityToward(
  current: GalaxyFlightPoint,
  desired: GalaxyFlightPoint,
  maximumDelta: number,
): GalaxyFlightPoint {
  const deltaX = desired.x - current.x;
  const deltaY = desired.y - current.y;
  const distance = Math.hypot(deltaX, deltaY);
  if (distance <= maximumDelta || distance <= EPSILON) return desired;
  const scale = maximumDelta / distance;
  return {
    x: current.x + deltaX * scale,
    y: current.y + deltaY * scale,
  };
}

function headingFromVelocity(
  velocity: GalaxyFlightPoint,
  fallback: number,
): number {
  return Math.hypot(velocity.x, velocity.y) > EPSILON
    ? normalizedHeading((Math.atan2(velocity.y, velocity.x) * 180) / Math.PI)
    : fallback;
}

function constrainFlight(
  position: GalaxyFlightPoint,
  velocity: GalaxyFlightPoint,
  bounds: GalaxyFlightBounds,
): { position: GalaxyFlightPoint; velocity: GalaxyFlightPoint } {
  const clamped = clampGalaxyFlightPosition(position, bounds);
  return {
    position: clamped,
    velocity: {
      x:
        (clamped.x <= bounds.minX && velocity.x < 0) ||
        (clamped.x >= bounds.maxX && velocity.x > 0)
          ? 0
          : velocity.x,
      y:
        (clamped.y <= bounds.minY && velocity.y < 0) ||
        (clamped.y >= bounds.maxY && velocity.y > 0)
          ? 0
          : velocity.y,
    },
  };
}

function stepManual(
  state: GalaxyFlightState,
  input: GalaxyFlightPoint,
  seconds: number,
  config: GalaxyFlightConfig,
): GalaxyFlightState {
  const inputMagnitude = Math.hypot(input.x, input.y);
  const drivenInput =
    inputMagnitude >= config.inputDeadzone ? input : { x: 0, y: 0 };
  let velocity = {
    x: state.velocity.x + drivenInput.x * config.acceleration * seconds,
    y: state.velocity.y + drivenInput.y * config.acceleration * seconds,
  };
  const dragScale = Math.exp(-config.drag * seconds);
  velocity = limitVelocity(
    { x: velocity.x * dragScale, y: velocity.y * dragScale },
    config.maxSpeed,
  );
  if (
    drivenInput.x === 0 &&
    drivenInput.y === 0 &&
    Math.hypot(velocity.x, velocity.y) <= config.stopSpeed
  ) {
    velocity = { x: 0, y: 0 };
  }
  const constrained = constrainFlight(
    {
      x: state.position.x + velocity.x * seconds,
      y: state.position.y + velocity.y * seconds,
    },
    velocity,
    config.bounds,
  );
  return {
    ...state,
    position: constrained.position,
    velocity: constrained.velocity,
    heading: headingFromVelocity(constrained.velocity, state.heading),
    mode: "manual",
    targetId: null,
  };
}

function stepAutopilot(
  state: GalaxyFlightState,
  target: GalaxyFlightTarget,
  seconds: number,
  config: GalaxyFlightConfig,
): GalaxyFlightState {
  const targetPosition = clampGalaxyFlightPosition(target.position, config.bounds);
  const toTarget = {
    x: targetPosition.x - state.position.x,
    y: targetPosition.y - state.position.y,
  };
  const distance = Math.hypot(toTarget.x, toTarget.y);
  if (distance <= config.arrivalRadius) {
    return {
      ...state,
      position: targetPosition,
      velocity: { x: 0, y: 0 },
      mode: "manual",
      targetId: null,
    };
  }

  const direction = { x: toTarget.x / distance, y: toTarget.y / distance };
  const brakingDistance = Math.max(0, distance - config.arrivalRadius);
  const desiredSpeed = Math.min(
    config.maxSpeed,
    Math.sqrt(2 * config.autopilotBrake * brakingDistance),
  );
  const desiredVelocity = {
    x: direction.x * desiredSpeed,
    y: direction.y * desiredSpeed,
  };
  const velocity = limitVelocity(
    moveVelocityToward(
      state.velocity,
      desiredVelocity,
      config.autopilotAcceleration * seconds,
    ),
    config.maxSpeed,
  );
  const candidate = {
    x: state.position.x + velocity.x * seconds,
    y: state.position.y + velocity.y * seconds,
  };
  const remaining = galaxyFlightDistance(candidate, targetPosition);
  const passedTargetPlane =
    toTarget.x * (targetPosition.x - candidate.x) +
      toTarget.y * (targetPosition.y - candidate.y) <=
    0;
  if (remaining <= config.arrivalRadius || passedTargetPlane) {
    return {
      ...state,
      position: targetPosition,
      velocity: { x: 0, y: 0 },
      heading: headingFromVelocity(direction, state.heading),
      mode: "manual",
      targetId: null,
    };
  }

  const constrained = constrainFlight(candidate, velocity, config.bounds);
  return {
    ...state,
    position: constrained.position,
    velocity: constrained.velocity,
    heading: headingFromVelocity(constrained.velocity, state.heading),
  };
}

/**
 * Advance the vessel. The optional target is only followed when its id matches
 * state.targetId. A meaningful manual input cancels autopilot in the same step.
 */
export function stepGalaxyFlight(
  sourceState: GalaxyFlightState,
  rawInput: Partial<GalaxyFlightPoint> | null | undefined,
  dtMs: number,
  target: GalaxyFlightTarget | null = null,
  override?: GalaxyFlightConfigOverride,
): GalaxyFlightState {
  const config = resolveConfig(override);
  const input = normalizeGalaxyFlightInput(rawInput);
  const inputIsManual = Math.hypot(input.x, input.y) >= config.inputDeadzone;
  let state = createGalaxyFlightState({
    ...sourceState,
    bounds: config.bounds,
  });

  if (state.mode === "autopilot" && inputIsManual) {
    state = cancelGalaxyAutopilot(state);
  } else if (
    state.mode === "autopilot" &&
    (!target || target.id !== state.targetId)
  ) {
    state = cancelGalaxyAutopilot(state);
  }

  let remainingSeconds =
    clamp(nonNegative(dtMs, 0), 0, config.maxDeltaMs) / 1000;
  while (remainingSeconds > EPSILON) {
    const seconds = Math.min(FIXED_SUBSTEP_SECONDS, remainingSeconds);
    state =
      state.mode === "autopilot" && target
        ? stepAutopilot(state, target, seconds, config)
        : stepManual(state, input, seconds, config);
    remainingSeconds -= seconds;
  }

  return state;
}
