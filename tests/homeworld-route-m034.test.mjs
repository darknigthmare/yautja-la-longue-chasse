import assert from "node:assert/strict";
import test from "node:test";
import { firstVoyageAdmissionV173, OWNER, qa, saves, SHIP } from "./helpers/first-interstellar-fixture-v173.mjs";

const model = qa.load("app/game/systems/homeworldRouteM034.ts");
const voyage = qa.load("app/game/systems/firstInterstellarV173.ts");
const native = qa.load("app/game/systems/spaceRoutesV159.ts");
const interiors = qa.load("app/game/systems/homeworldInteriorsV64.ts");
const { HOMEWORLD_POINTS } = qa.load("app/game/systems/homeworld.ts");
const dock = { ...model.ROUTE_OFFICER_M034, suspended: false };
const sas = { ...model.ROUTE_BOARDING_M034, suspended: false };
const { save: owned } = firstVoyageAdmissionV173({ prepared: true });
const cleared = voyage.firstInterstellarAccessV173(owned, SHIP, true, null);
assert.equal(cleared.allowed, true);

const walk = direction => ({ kind: "walk", direction });
const steer = direction => ({ kind: "steer", direction });
const mooring = action => ({ kind: "mooring", action });
const repeat = (count, action) => Array.from({ length: count }, () => action);
const beacon = { kind: "beacon" };

function firstTrip() {
  let state = null;
  const run = (...commands) => {
    for (const command of commands) {
      const result = voyage.commitFirstInterstellarV173(state, command, cleared);
      assert.ok(result.accepted, result.message);
      state = result.state;
    }
  };
  run({ kind: "plan", route: "direct" }, ...repeat(4, walk(1)), { kind: "launch" },
    steer(-1), beacon, steer(1), steer(1), beacon, steer(-1), beacon);
  run(...repeat(3, mooring({ type: "lateral", direction: -1 })), mooring({ type: "align" }));
  const flight = voyage.inspectFirstInterstellarV173(state, OWNER).view.flight;
  assert.ok(flight);
  run(...repeat(flight.speed - 1, mooring({ type: "speed", direction: -1 })),
    ...repeat(flight.distance / 10, mooring({ type: "advance" })),
    mooring({ type: "lock", index: 0 }), mooring({ type: "lock", index: 1 }),
    ...repeat(2, mooring({ type: "ring", direction: 1 })), mooring({ type: "berth" }));
  run(...repeat(5, walk(1)));
  const alongside = state;
  run(...repeat(5, walk(-1)));
  return { alongside, returned: state };
}

function loadWithRoute(save, route) {
  const hydrated = saves.parseSaveImport(saves.exportSave({
    ...save, homeworld: { ...save.homeworld, nextRouteM034: route },
  }));
  assert.ok(hydrated.save, hydrated.failure);
  assert.deepEqual(hydrated.save.homeworld.nextRouteM034, route);
  return hydrated.save;
}

test("M034 unlocks from the real berth and return, not a previously bought hull or a Warp tier", () => {
  const { alongside, returned } = firstTrip();
  assert.equal(model.homeworldRouteChoicesM034(owned), null);
  assert.equal(model.homeworldRouteChoicesM034({ ...owned, firstInterstellarV173: alongside }), null);
  const save = { ...owned, firstInterstellarV173: returned };
  const briefing = model.homeworldRouteChoicesM034(save);
  assert.ok(briefing);
  assert.equal(briefing.blocked, null);
  assert.deepEqual(briefing.choices.map(choice => choice.kind), ["hunt", "hunt", "survey", "service"]);
  assert.equal(briefing.choices.find(choice => choice.destinationId === "nivalis-hunt").unlocked, false);
  for (const choice of briefing.choices) {
    assert.deepEqual(choice.itinerary, native.planSpaceRouteV159(briefing.currentSystemId, choice.systemId));
  }
  assert.ok(interiors.homeworldInteriorForBuildingV64(dock.roomId).points.some(point => point.pointId === dock.pointId));
  assert.equal(HOMEWORLD_POINTS.find(point => point.id === sas.pointId).kind, "ship");
  assert.equal(model.actHomeworldRouteM034(null, save, { kind: "plan", destinationId: "nivalis-hunt" }, dock).state, undefined);
});

test("M034 compares and prepares a hunt, an exploration or a service at the physical stations across reloads", () => {
  const { returned } = firstTrip();
  const game = { ...owned, firstInterstellarV173: returned };
  for (const destinationId of ["oseris-hunt", "kaail-survey", "pilgrim-relay"]) {
    const action = { kind: "plan", destinationId };
    assert.equal(model.actHomeworldRouteM034(null, game, action, sas).state, undefined);
    assert.equal(model.actHomeworldRouteM034(null, game, action, { ...dock, suspended: true }).state, undefined);
    const initial = model.actHomeworldRouteM034(null, game, action, dock);
    assert.ok(initial.state, initial.message);
    const planned = loadWithRoute(game, initial.state);
    assert.equal(model.homeworldRouteReadyM034(planned.homeworld.nextRouteM034, planned), false);
    assert.equal(model.actHomeworldRouteM034(planned.homeworld.nextRouteM034, planned, { kind: "seal" }, dock).state, undefined);
    const seal = model.actHomeworldRouteM034(planned.homeworld.nextRouteM034, planned, { kind: "seal" }, sas);
    assert.ok(seal.state, seal.message);
    const saved = loadWithRoute(planned, seal.state);
    assert.equal(model.homeworldRouteReadyM034(saved.homeworld.nextRouteM034, saved), true);
    assert.equal(seal.state.destinationId, destinationId);
    assert.deepEqual(seal.state.fieldKit, { armorId: saved.loadout.armorId, weaponId: saved.loadout.weaponIds[0], gearId: saved.loadout.gearIds[0] });
    assert.equal(model.actHomeworldRouteM034(seal.state, saved, { kind: "seal" }, sas).state, undefined);
    assert.deepEqual(saved.loadout, game.loadout);
    assert.deepEqual(saved.inventory, game.inventory);
    assert.equal(saved.profile.honor, game.profile.honor);
    assert.deepEqual(saved.missionProgress, game.missionProgress);
    assert.deepEqual(saved.spaceRoutesV159, game.spaceRoutesV159);
  }
});

test("M034 refuses unsupported plans, other owners and concurrent space travel", () => {
  const { returned } = firstTrip();
  const save = { ...owned, firstInterstellarV173: returned };
  const plan = model.actHomeworldRouteM034(null, save, { kind: "plan", destinationId: "kaail-survey" }, dock).state;
  assert.ok(plan);
  assert.equal(model.normalizeHomeworldRouteM034({ ...plan, destinationId: "absent" }), null);
  assert.equal(model.normalizeHomeworldRouteM034({ ...plan, version: 2 }), null);
  assert.equal(model.normalizeHomeworldRouteM034({ ...plan, phase: "prepared" }), null);
  for (const foreign of [{ ...plan, ownerCreatedAt: "2024-01-01T12:00:00Z" }, { ...plan, hullInstanceId: "other-instance" }]) {
    assert.equal(model.homeworldRouteStateM034(foreign, save), null);
    assert.equal(model.actHomeworldRouteM034(foreign, save, { kind: "seal" }, sas).state, undefined);
  }
  const route = native.spaceRoutesFromV159(plan.originSystemId)[0];
  const trip = native.actSpaceRoutesV159(null, { kind: "engage", routeId: route.id }, {
    ownerCreatedAt: save.createdAt, ship: native.spacePersonalShipV159(save),
  });
  assert.equal(trip.accepted, true);
  assert.match(model.actHomeworldRouteM034(plan, { ...save, spaceRoutesV159: trip.state }, { kind: "seal" }, sas).message, /liaison en cours/);
  assert.equal(model.actHomeworldRouteM034(plan, save, { kind: "plan", destinationId: "pilgrim-relay" }, dock).state.destinationId, "pilgrim-relay");
});
