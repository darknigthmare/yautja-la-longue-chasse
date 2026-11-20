import assert from 'node:assert/strict';

/** Joue R2-M021 au chantier V89 avec l’attestation V161, à pied, sans raccourci.
 * `authority: null` reproduit un chantier joué avant V161 (aucune attestation).
 * `stop` arrête le parcours avant la remise ('report') ou avant l’entrée ('rights'). */
export function playShipAcquisitionV161(qa, save, stop = null, authority = undefined) {
  const ship = qa.load('app/game/systems/shipAcquisitionV89.ts');
  const receipt = qa.load('app/game/systems/shipReceiptV161.ts');
  const b = ship.SHIP_ACQUISITION_BINDING_V89;
  const context = {save, active: true, focused: true, suspended: false,
    ...ship.shipAcquisitionSceneFactsV89(), authority: authority === undefined ? receipt.shipAcquisitionAuthorityV161(save) : authority};
  let state = save.shipAcquisitionV89 ?? null;
  const act = action => {
    const result = ship.actShipAcquisitionV89(state, action, context);
    assert(result.accepted, result.message); state = result.state; return result;
  };
  const walk = x => { while ((state?.actor.x ?? b.spawnX) !== x) act({kind: 'walk', direction: x > (state?.actor.x ?? b.spawnX) ? 1 : -1}); };
  act({kind: 'intent', option: 'A'}); walk(480); act({kind: 'inspect-hull'}); walk(792); act({kind: 'inspect-load'});
  walk(1080); act({kind: 'test-sas'}); act({kind: 'align-latch', direction: 1}); act({kind: 'align-latch', direction: 1});
  act({kind: 'seat-latch'}); act({kind: 'lock-latch'}); act({kind: 'test-sas'}); walk(144); act({kind: 'report'});
  if (stop === 'report') return {...save, shipAcquisitionV89: state};
  act({kind: 'request-rights'});
  if (stop === 'rights') return {...save, shipAcquisitionV89: state};
  walk(b.entryX);
  assert.notEqual(state.enteredAtStep, null);
  return {...save, shipAcquisitionV89: state};
}
