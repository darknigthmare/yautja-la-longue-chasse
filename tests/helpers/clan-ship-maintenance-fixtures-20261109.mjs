/** Disclosed historical prerequisites built with production reducers. These
 * fixtures are not evidence that onboarding, repair or escort was browser-played. */
export const MAINTENANCE_OWNER = '2026-11-09T18:00:00.000Z';
const SHIP = 'classic-predator-spaceship';
const requireAccepted = result => {
  if (!result.accepted) throw new Error(result.message);
  return result;
};
export function maintenanceAt(domain, save, roomId) {
  if (save.clanShipDocking.roomId === roomId) return save;
  const result = requireAccepted(domain.actClanShipDocking(save.clanShipDocking, { type: 'move-room', roomId },
    { ownerCreatedAt: save.createdAt, personalShipId: SHIP }));
  return { ...save, clanShipDocking: result.state };
}
export function maintenanceOperation(domain, save, command, roomId = 'conseil') {
  save = maintenanceAt(domain, save, roomId);
  const state = save.clanShipOperations;
  const result = requireAccepted(domain.actClanShipOperations(state, { ...command, expectedRevision: state.revision },
    { ownerCreatedAt: save.createdAt, campaign: save, docking: save.clanShipDocking }));
  return { ...save, clanShipOperations: result.state,
    profile: { ...save.profile, clanMarks: save.profile.clanMarks + result.clanMarksReward } };
}
export function maintenanceIntervene(domain, save, incidentId, type, branch) {
  const target = domain.clanShipIncidentTarget(incidentId, type, save);
  save = maintenanceAt(domain, save, target.roomId);
  const result = requireAccepted(domain.actClanShipIncident({ incidentId, type, ...(branch ? { branch } : {}),
    ownerCreatedAt: save.createdAt, expectedRevision: save.clanShipIncidents?.revision ?? 0 },
  { save, active: true, observation: { roomId: target.roomId, x: target.x, y: target.y } }));
  return { ...save, clanShipIncidents: result.state,
    profile: { ...save.profile, clanMarks: save.profile.clanMarks + result.clanMarksReward } };
}
export function completeMaintenance(domain, save, id) {
  const variant = domain.clanShipIncidentVariant(save.createdAt, id);
  const commands = id === 'sealed-lot'
    ? [['accept'], ['inspect-witness'], ['read-reference'], ['isolate', variant.branch], ['check-pressure'], ['close-lot']]
    : [['accept'], ['inspect-witness'], ['read-reference'], ['isolate', variant.branch], ['collect-component'],
      ['install-component'], ['restore-circuit', variant.other], ['restore-circuit', variant.branch], ['verify-signal']];
  for (const [type, branch] of commands) save = maintenanceIntervene(domain, save, id, type, branch);
  return save;
}
export function maintenanceInterception(domain, save) {
  save = maintenanceOperation(domain, save, { type: 'accept-contract', contractId: 'space-screening' });
  for (const type of ['scan', 'manoeuvre', 'brace', 'brace', 'extract'])
    save = maintenanceOperation(domain, save, { type: 'space-command', command: { type, expectedTurn: save.clanShipOperations.spaceEncounter.turn } });
  return maintenanceOperation(domain, save, { type: 'accept-contract', contractId: 'space-interception' });
}
export function buildMaintenanceFixture(domain, { owner = MAINTENANCE_OWNER, completed = false, interception = false } = {}) {
  let save = domain.defaultSave(owner);
  save.profile.clanMarks = 200;
  let berth = domain.createClanShipDockingState(owner, SHIP);
  for (const type of ['approach', 'dock', 'board']) berth = requireAccepted(domain.actClanShipDocking(berth, { type },
    { ownerCreatedAt: owner, personalShipId: SHIP })).state;
  save = { ...save, clanShipDocking: berth, clanShipOperations: domain.createClanShipOperations(owner) };
  for (const step of domain.CLAN_SHIP_ONBOARDING_STEPS)
    save = maintenanceOperation(domain, save, { type: 'onboard-step', stepId: step.id }, step.roomId);
  save = maintenanceOperation(domain, save, { type: 'accept-mandate' });
  for (const contractId of ['ship-seal-check', 'ship-armory-audit']) {
    save = maintenanceOperation(domain, save, { type: 'accept-contract', contractId });
    for (const step of domain.clanShipContract(contractId).steps)
      save = maintenanceOperation(domain, save, { type: 'interior-step', stepId: step.id }, step.roomId);
  }
  if (completed) {
    save = completeMaintenance(domain, save, 'sealed-lot');
    save = completeMaintenance(domain, save, 'relay-fault');
  }
  if (interception) save = maintenanceInterception(domain, save);
  const checked = domain.parseSaveImport(JSON.stringify(save));
  if (!checked.save || checked.failure) throw new Error(`Fixture validation: ${checked.failure}`);
  return save;
}
