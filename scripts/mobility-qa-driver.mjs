/** Read-only waypoint guidance for native keyboard QA, never a game autopilot.
 * Keeps a 12-unit margin above the player's collision radius and stops before
 * turns. The former 24-unit path plus a .04-radian deadband could push forever
 * into the top boundary. This helper returns controls only; it writes no state.
 */
export const MOBILITY_QA_ROUTE = Object.freeze([
  [820, 490], [820, 130], [820, 30], [140, 30], [140, 130], [140, 490],
]);
function waypointGuidance(state, target, radius, shouldInteract) {
  if (!target || !['x', 'y', 'heading', 'speed'].every(k => Number.isFinite(state[k]))) {
    throw new TypeError('Invalid native QA navigation observation');
  }
  const [tx, ty] = target;
  const distance = Math.hypot(tx - state.x, ty - state.y);
  const error = Math.atan2(Math.sin(Math.atan2(ty - state.y, tx - state.x) - state.heading),
    Math.cos(Math.atan2(ty - state.y, tx - state.x) - state.heading));
  const stopped = Math.abs(state.speed) < 5;
  const arrived = distance < radius;
  const brakingDistance = state.speed * state.speed / (2 * 240) + Math.abs(state.speed) * .16;
  const turning = Math.abs(error) > .12;
  const brake = arrived || (!stopped && (turning || distance < brakingDistance + radius));
  // A narrow deadband turns the exact failing boundary pose back into the yard.
  const steer = !arrived && Math.abs(error) > .008 ? Math.sign(error) : 0;
  return { throttle: !arrived && !brake && !turning ? 1 : 0, steer, brake,
    boost: false, interact: arrived && stopped && shouldInteract,
    advance: arrived && stopped, distance, error };
}

export function mobilityQaGuidance(state, stage) {
  return waypointGuidance(state, Number.isInteger(stage) ? MOBILITY_QA_ROUTE[stage] : undefined, stage === 2 || stage === 3 ? 3 : 27, stage === 1 || stage === 5);
}

const FORGE_QA_ROUTE = [
  [140, 290], [140, 130], [140, 29], [840, 29], [840, 290], [840, 490], [140, 490],
];

export function forgeDeliveryQaGuidance(state, stage) {
  return waypointGuidance(state, Number.isInteger(stage) ? FORGE_QA_ROUTE[stage] : undefined, stage === 2 || stage === 3 ? 3 : 27, stage === 1 || stage === 6);
}

const NEW_ROUTE_GUIDANCE = {
  'dunes-crossing': [[470, 490], [870, 490], [870, 125], [870, 29], [140, 29], [140, 490]],
  'trophy-convoy': [[140, 285], [140, 140], [140, 29], [825, 29], [825, 490], [140, 490]],
};

export function mobilityExtensionQaGuidance(state, route, stage) {
  const boundary = route === 'dunes-crossing' ? stage === 3 || stage === 4 : stage === 2 || stage === 3;
  return waypointGuidance(state, NEW_ROUTE_GUIDANCE[route]?.[stage], boundary ? 3 : 27, stage === 1 || stage === 5);
}
