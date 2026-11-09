import assert from 'node:assert/strict';
import { homeworldSceneSsrV78 } from './homeworld-scene-ssr-v78.mjs';

export const qa = homeworldSceneSsrV78();
export const escort = qa.load('app/game/systems/clanShipReturnEscort.ts');
export const motion = qa.load('app/game/systems/clanShipInterior.ts');
export const docking = qa.load('app/game/systems/clanShipDocking.ts');
export const ops = qa.load('app/game/systems/clanShipOperations.ts');
export const saves = qa.load('app/game/save.ts');
export const OWNER = '2026-11-09T12:00:00.000Z', SHIP = 'classic-predator-spaceship';
export const clone = value => JSON.parse(JSON.stringify(value));
export const point = (roomId, position) => ({ roomId, x: position.x, y: position.y });
export function located(save, roomId) {
  if (save.clanShipDocking?.status === 'aboard') return { ...save, clanShipDocking: { ...save.clanShipDocking, roomId } };
  let state = docking.createClanShipDockingState(save.createdAt, SHIP);
  for (const type of ['approach', 'dock', 'board']) state = docking.actClanShipDocking(state, { type },
    { ownerCreatedAt: save.createdAt, personalShipId: SHIP }).state;
  return { ...save, clanShipDocking: { ...state, roomId } };
}
function operation(save, command, roomId = 'conseil') {
  save = located(save, roomId);
  const state = save.clanShipOperations ?? ops.createClanShipOperations(save.createdAt);
  const result = ops.actClanShipOperations(state, { ...command, expectedRevision: state.revision },
    { ownerCreatedAt: save.createdAt, campaign: save, docking: save.clanShipDocking });
  assert.equal(result.accepted, true, result.message);
  return { ...save, clanShipOperations: result.state,
    profile: { ...save.profile, clanMarks: save.profile.clanMarks + result.clanMarksReward } };
}
/** Synthetic adult prerequisite fixture. The actual reducers play the spatial
 * orders, not a browser campaign. No B04 acceptance, movement or report seeded. */
export function fixture({ recovery = true, medical = true } = {}) {
  let save = saves.defaultSave(OWNER);
  for (const step of ops.CLAN_SHIP_ONBOARDING_STEPS) save = operation(save, { type: 'onboard-step', stepId: step.id }, step.roomId);
  save = operation(save, { type: 'accept-mandate' });
  for (const contractId of ['ship-seal-check', ...(medical ? ['ship-triage-route'] : [])]) {
    save = operation(save, { type: 'accept-contract', contractId });
    for (const step of ops.clanShipContract(contractId).steps) save = operation(save, { type: 'interior-step', stepId: step.id }, step.roomId);
  }
  if (recovery) for (const [contractId, orders] of [
    ['space-screening', ['scan', 'manoeuvre', 'brace', 'brace', 'extract']],
    ['space-recovery', ['scan', 'scan', 'manoeuvre', 'brace', 'disrupt', 'brace', 'disrupt', 'brace', 'manoeuvre', 'brace', 'board', 'brace', 'extract']],
  ]) {
    save = operation(save, { type: 'accept-contract', contractId });
    for (const type of orders) save = operation(save, { type: 'space-command',
      command: { type, expectedTurn: save.clanShipOperations.spaceEncounter.turn } });
  }
  return located(save, 'hangar');
}
export const action = (save, command) => ({ ...command, ownerCreatedAt: save.createdAt, expectedRevision: save.clanShipReturnEscort?.revision ?? 0 });
export function context(save, command, observation = null, overrides = {}) {
  const target = escort.clanShipReturnEscortTarget(save, command);
  return { save: observation ? save : located(save, target.roomId), active: true,
    observation: observation ?? point(target.roomId, target), ...overrides };
}
export function act(save, command, observation = null) {
  const ctx = context(save, command, observation), before = JSON.stringify(ctx.save);
  const result = escort.actClanShipReturnEscort(action(ctx.save, command), ctx);
  assert.equal(result.accepted, true, `${command.type}: ${result.message}`);
  assert.equal(JSON.stringify(ctx.save), before, 'reducer must not mutate its campaign');
  const next = result.changed ? { ...ctx.save, clanShipReturnEscort: result.state,
    ...(result.dockingState ? { clanShipDocking: result.dockingState } : {}) } : ctx.save;
  assert.ok(saves.parseSaveImport(saves.exportSave(next)).save, 'each acknowledged return must pass the real save boundary');
  return next;
}
export function started(post = 'medical-bed') {
  let save = act(fixture(), { type: 'accept' });
  save = act(save, { type: 'prepare-route', post });
  return act(save, { type: 'start' });
}
/** The leader and group both use production path planning/controller steps.
 * No position or medical flag is overwritten to manufacture arrival. */
export function walk(save, from, to, maxSteps = 2000) {
  const roomId = save.clanShipDocking.roomId, plan = motion.planClanShipInteriorPath(roomId, from, to);
  assert.ok(plan, 'actual leader route exists');
  let leader = { ...from, facing: -1 }, waypoints = plan.points.slice(1), frames = [], steps = 0;
  const flush = () => {
    if (frames.length) { save = act(save, { type: 'advance', frames }, point(roomId, leader)); frames = []; }
  };
  while (waypoints.length && steps++ < maxSteps) {
    const next = motion.stepClanShipInteriorPath(roomId, leader, waypoints, 1 / 60);
    assert.equal(next.blocked, false); assert.ok(motion.isClanShipInteriorWalkable(roomId, next.actor));
    leader = next.actor; waypoints = next.remaining;
    frames.push({ seconds: 1 / 60, leader: point(roomId, leader) });
    if (frames.length === 60) flush();
  }
  flush(); return { save, leader, arrived: waypoints.length === 0 };
}
export function settle(save, leader, seconds = 1) {
  return act(save, { type: 'advance', frames: Array.from({ length: Math.round(seconds * 60) }, () =>
    ({ seconds: 1 / 60, leader: point(save.clanShipDocking.roomId, leader) })) }, point(save.clanShipDocking.roomId, leader));
}
export function medicalApproach(post = 'medical-bed') {
  let save = started(post);
  let walked = walk(save, motion.CLAN_SHIP_INTERIOR_ROOMS.hangar.servicePoint, { x: 128, y: 635 });
  assert.equal(walked.arrived, true);
  save = settle(walked.save, walked.leader);
  save = act(save, { type: 'transfer-room', roomId: 'soins' }, point('hangar', walked.leader));
  walked = walk(save, motion.clanShipInteriorSpawn('soins', 'hangar'), escort.CLAN_SHIP_RETURN_ESCORT_POSTS[post]);
  save = settle(walked.save, walked.leader);
  return { save, leader: walked.leader };
}
export function medical(post = 'medical-bed') {
  const { save, leader } = medicalApproach(post);
  return act(save, { type: 'confirm-medical' }, point('soins', leader));
}
