import assert from 'node:assert/strict';

/** Real navigation/threshold/interaction functions. No position teleporting
 * between services: every leg is walked and every door is traversed. */
export function createCradleReturnRoute(qa) {
  const ship = qa.load('app/game/systems/shipInterior25d.ts');
  const campaign = qa.load('app/game/systems/buriedCradleCampaign.ts');
  const returns = qa.load('app/game/systems/buriedCradleReturn.ts');
  let roomId = 'galaxy-map', actor = ship.shipInterior25dSpawn(roomId);
  const trace = [];
  function walk(goal) {
    const path = ship.planShipInterior25dPath(roomId, actor, goal);
    assert(path, `walkable route to ${roomId} ${JSON.stringify(goal)}`);
    let remaining = path.points.slice(1), steps = 0;
    while (remaining.length && ++steps < 2000) {
      const result = ship.stepShipInterior25dPath(roomId, actor, remaining, 1 / 30);
      assert.equal(result.blocked, false, `blocked in ${roomId}`);
      actor = result.actor; remaining = result.remaining;
    }
    assert.equal(remaining.length, 0, 'finite arrival');
  }
  function approach(target) {
    while (roomId !== target) {
      const route = ship.shipInterior25dRoomRoute(roomId, target);
      assert(route.length > 1);
      const door = ship.SHIP_INTERIOR_25D_ROOMS[roomId].doors.find(item => item.targetRoomId === route[1]);
      assert(door); walk(door);
      const transition = ship.shipInterior25dTransition(roomId, door.id, actor);
      assert(transition, `physical threshold ${door.id}`);
      trace.push(door.id); roomId = transition.roomId; actor = transition.actor;
    }
    walk(ship.SHIP_INTERIOR_25D_ROOMS[roomId].station.approach);
    const interaction = ship.nearbyShipInterior25dInteraction(roomId, actor);
    assert.equal(interaction?.type, 'service'); assert.equal(interaction.station.id, target);
    return { roomId, x: actor.x, y: actor.y };
  }
  function act(save, type, context) {
    const observation = approach(returns.CRADLE_RETURN_STATIONS[type]);
    const result = campaign.actBuriedCradleCampaign(save, { type, expectedRevision: save.buriedCradle.returnVisit.revision },
      { ...context, returnActive: true, returnObservation: observation });
    assert.equal(result.accepted, true, `${type}: ${result.message}`);
    return { ...save, buriedCradle: result.state, prologue: result.prologue };
  }
  return { approach, act, trace, complete(save, context, choice = 'present-clan') {
    for (const type of ['treat-return', 'inspect-return', choice]) save = act(save, type, context);
    return save;
  } };
}
