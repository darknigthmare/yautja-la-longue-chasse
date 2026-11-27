import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";

const bundle = await build({ stdin: { contents: `
  export * from './app/game/systems/clanWarV85';
  export * from './app/game/systems/clanWarConvoyRouteV105';
  export * from './app/game/systems/clanWarM037';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: "esm", platform: "node", target: "es2022", logLevel: "silent" });
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);

const site = "CON-T09";
const origin = "CON-T02";
const empty = { s: 0, m: 0, i: 0 };

function accepted(result) {
  assert.equal(result.accepted, true, result.message);
  return result.state;
}

function deliver() {
  const initial = api.createWarSimulationV85(10537);
  const assigned = accepted(api.queueWarOrderV85(initial, {
    kind: "cession", fromId: origin, targetId: site, combatantIds: ["P07"], cargo: empty,
  }));
  const held = accepted(api.advanceWarTurnV85(assigned));
  assert.equal(held.territories[site].controller, "CON-F01");
  assert.equal(api.warGarrisonV85(held, site)[0].id, "P07");
  const planned = accepted(api.planWarConvoyV105(held, {
    territoryIds: [origin, site], combatantIds: ["P11"], cargo: { s: 0, m: 1, i: 0 },
  }));
  const queued = accepted(api.queueWarConvoyLegV105(planned));
  assert.equal(api.startCanyonPatrolM037(queued), null);
  return accepted(api.advanceWarTurnV85(queued));
}

function inspect(state) {
  let patrol = api.startCanyonPatrolM037(state);
  assert.ok(patrol);
  assert.equal(patrol.inspectorId, "P11");
  patrol = api.changeCanyonLevelM037(patrol);
  assert.equal(patrol.level, 1);
  for (let step = 0; step < 7; step++) patrol = api.walkCanyonM037(patrol, 1);
  assert.equal(patrol.x, 34);
  assert.equal(api.changeCanyonLevelM037(patrol), patrol);
  patrol = api.checkCanyonSignM037(patrol);
  assert.equal(api.checkCanyonSignM037(patrol), patrol);
  assert.deepEqual(patrol.checked, [34]);
  let blocked = patrol;
  for (let step = 0; step < 15; step++) blocked = api.walkCanyonM037(blocked, 1);
  assert.equal(blocked.x, 46);
  for (let step = 0; step < 4; step++) patrol = api.walkCanyonM037(patrol, -1);
  patrol = api.changeCanyonLevelM037(patrol);
  assert.equal(patrol.level, 0);
  for (let step = 0; step < 13; step++) patrol = api.walkCanyonM037(patrol, 1);
  assert.equal(patrol.x, 70);
  patrol = api.checkCanyonSignM037(patrol);
  assert.deepEqual(patrol.checked, [34, 72]);
  assert.equal(api.canyonDecisionM037(patrol), null);
  return patrol;
}

test("a real cession, garrison and delivery open both endpoints of the authored canyon", () => {
  const initial = api.createWarSimulationV85(10537);
  assert.equal(api.startCanyonPatrolM037(initial), null);
  const state = deliver();
  assert.equal(state.stocks[site].m, 1);
  const patrol = inspect(state);
  for (const [direction, choice] of [[-1, "consolider"], [1, "pousser"]]) {
    let exit = patrol;
    for (let step = 0; step < 25; step++) exit = api.walkCanyonM037(exit, direction);
    assert.equal(api.canyonDecisionM037(exit), choice);
    const next = accepted(api.archiveCanyonPatrolM037(state, exit));
    assert.deepEqual(next.stocks, state.stocks);
    assert.deepEqual(next.combatants, state.combatants);
    assert.equal(next.turn, state.turn);
    assert.equal(next.revision, state.revision + 1);
    assert.deepEqual(api.readWarSimulationV85(JSON.parse(JSON.stringify(next))), next);
    const report = api.canyonReportM037(next);
    assert.ok(report.sourceIds.includes(state.convoyRouteV105.completedOrderIds[0]));
    assert.match(report.text, choice === "consolider" ? /Consolidation/ : /Progression/);
    assert.equal(api.archiveCanyonPatrolM037(next, exit).accepted, false);
  }
});

test("a live inspection cannot file a receipt after the route or garrison is lost", () => {
  const state = deliver();
  const patrol = inspect(state);
  const exit = Array.from({ length: 25 }).reduce(current => api.walkCanyonM037(current, 1), patrol);
  const moved = structuredClone(state);
  moved.combatants.find(person => person.id === "P07").status = "wounded";
  assert.equal(api.startCanyonPatrolM037(moved), null);
  assert.equal(api.archiveCanyonPatrolM037(moved, exit).accepted, false);
  const withdrawn = accepted(api.removeWarConvoyV105(state));
  assert.equal(api.archiveCanyonPatrolM037(withdrawn, exit).accepted, false);
});
