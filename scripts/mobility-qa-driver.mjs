/** Read-only waypoint guidance for native keyboard QA, never a game autopilot.
 * Keeps a 12-unit margin above the player's collision radius and stops before
 * turns. The former 24-unit path plus a .04-radian deadband could push forever
 * into the top boundary. This helper returns controls only; it writes no state.
 */
export const MOBILITY_QA_ROUTE = Object.freeze([
  [820, 490], [820, 130], [820, 30], [140, 30], [140, 130], [140, 490],
]);
export function mobilityQaGuidance(state, stage) {
  if (!Number.isInteger(stage) || stage < 0 || stage >= MOBILITY_QA_ROUTE.length ||
      !['x', 'y', 'heading', 'speed'].every(k => Number.isFinite(state[k]))) {
    throw new TypeError('Invalid native QA navigation observation');
  }
  const [tx, ty] = MOBILITY_QA_ROUTE[stage];
  const distance = Math.hypot(tx - state.x, ty - state.y);
  const error = Math.atan2(Math.sin(Math.atan2(ty - state.y, tx - state.x) - state.heading),
    Math.cos(Math.atan2(ty - state.y, tx - state.x) - state.heading));
  const radius = stage === 2 || stage === 3 ? 3 : 27;
  const stopped = Math.abs(state.speed) < 5;
  const arrived = distance < radius;
  const brakingDistance = state.speed * state.speed / (2 * 240) + Math.abs(state.speed) * .16;
  const turning = Math.abs(error) > .12;
  const brake = arrived || (!stopped && (turning || distance < brakingDistance + radius));
  // A narrow deadband turns the exact failing boundary pose back into the yard.
  const steer = !arrived && Math.abs(error) > .008 ? Math.sign(error) : 0;
  return { throttle: !arrived && !brake && !turning ? 1 : 0, steer, brake,
    boost: false, interact: arrived && stopped && (stage === 1 || stage === 5),
    advance: arrived && stopped, distance, error };
}
