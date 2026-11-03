import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { homeworldSceneSsrV78 } from "./helpers/homeworld-scene-ssr-v78.mjs";

const bundle = await build({ stdin: { contents: "export * from './app/game/systems/clanWarV85'; export * from './app/game/systems/clanWarCommandV98'; export * from './app/game/systems/clanWarPlanetsV96'; export * from './app/game/systems/clanWarSessionV85'; export { CANYON_STORAGE_KEY_V85 } from './app/game/systems/clanWarCanyonV85';", resolveDir: process.cwd() }, bundle: true, write: false, format: "esm", platform: "node", target: "es2022", logLevel: "silent" });
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
const local = (extra = {}) => ({ territoryId: "CON-T02", combatantId: "P07", garrison: true, ...extra });
const actor = (state, id) => state.combatants.find(person => person.id === id);
const lock = async operation => ({ acquired: true, value: await operation() });
function disk(entries = []) {
  const data = new Map(entries), writes = [];
  return { data, writes, full: false, getItem: key => data.get(key) ?? null,
    setItem(key, value) { if (this.full) throw Error("Quota exceeded"); writes.push([key, value]); data.set(key, value); },
  };
}
async function mount(storage, planetId) {
  const session = api.createWarSessionV85(() => storage, lock, null, { planetId });
  session.subscribe(() => {}); await session.whenSettled(); return session;
}
function freeze(value) {
  for (const item of Object.values(value)) if (item && typeof item === "object") freeze(item);
  return Object.freeze(value);
}
function refuse(state, input, message) {
  const before = JSON.stringify(state), result = api.changeWarGarrisonV99(state, input);
  assert.equal(result.accepted, false); assert.equal(result.state, state); assert.match(result.message, message);
  assert.equal(JSON.stringify(state), before);
  assert.equal(api.warGarrisonIssueV99(state, input), result.message);
}

test("all thirty worlds reassign the existing local person without a second roster slot, time or stock change", () => {
  for (const planet of api.WAR_PLANETS_V96) {
    const state = freeze(api.createWarSimulationV85(undefined, planet.id)), before = JSON.stringify(state);
    const changed = api.changeWarGarrisonV99(state, local());
    assert.equal(changed.accepted, true, `${planet.id}: ${changed.message}`);
    const expected = structuredClone(state);
    actor(expected, "P07").garrison = true; expected.revision++; expected.reports = changed.state.reports;
    assert.deepEqual(changed.state, expected, planet.id);
    assert.equal(JSON.stringify(state), before);
    assert.equal(api.warGarrisonV85(changed.state, "CON-T02").length, 2);
    assert.equal(api.warUpkeepV85(changed.state), api.warUpkeepV85(state));
    assert.deepEqual(changed.state.combatants.map(person => person.id), state.combatants.map(person => person.id));
    assert.deepEqual(changed.state.reports.slice(0, -1), state.reports);
    const report = changed.state.reports.at(-1);
    assert.deepEqual(report.sourceIds, ["CON-R08", "CON-R12"]); assert.equal(report.turn, state.turn);
    assert.match(report.text, /P07.*CON-T02.*Aucun déplacement ni revenu immédiat/);
    assert.deepEqual(api.readWarSimulationV85(changed.state), changed.state, planet.id);
    const released = api.changeWarGarrisonV99(changed.state, local({ garrison: false }));
    assert.equal(released.accepted, true); assert.equal(actor(released.state, "P07").garrison, false);
    assert.equal(released.state.turn, state.turn); assert.equal(released.state.revision, state.revision + 2);
    assert.equal(new Set(released.state.reports.map(item => item.id)).size, released.state.reports.length);
  }
});

test("only the last fit guard needs explicit confirmation and no-op requests are immutable refusals", () => {
  const initial = api.createWarSimulationV85(), release = local({ combatantId: "P02", garrison: false });
  refuse(initial, release, /Confirmez le retrait du dernier garde/);
  refuse(initial, { ...release, confirmLastGuard: false }, /dernier garde/);
  refuse(initial, local({ combatantId: "P02" }), /assure déjà la garde/);
  refuse(initial, local({ garrison: false }), /fait déjà partie des mobiles/);
  const changed = api.changeWarGarrisonV99(initial, { ...release, confirmLastGuard: true });
  assert.equal(changed.accepted, true); assert.equal(api.warGarrisonV85(changed.state, "CON-T02").length, 0);
  assert.equal(changed.state.territories["CON-T02"].controller, "CON-F01");
  assert.deepEqual(changed.state.stocks, initial.stocks);
  const restored = api.changeWarGarrisonV99(changed.state, local());
  assert.equal(restored.accepted, true); assert.equal(api.warGarrisonV85(restored.state, "CON-T02").length, 1);
  const two = api.changeWarGarrisonV99(restored.state, local({ combatantId: "P02" }));
  assert.equal(api.changeWarGarrisonV99(two.state, release).accepted, true);
});

test("wounded, dead, training, remote, missing and foreign persons cannot be assigned or released", () => {
  for (const changes of [{ status: "wounded" }, { status: "dead" }, { trainingUntilTurn: 99 }]) {
    for (const garrison of [false, true]) {
      const state = api.createWarSimulationV85(); Object.assign(actor(state, "P07"), changes, { garrison });
      refuse(state, local({ garrison: !garrison }), /personne apte/);
    }
  }
  const initial = api.createWarSimulationV85();
  for (const input of [local({ combatantId: "P03" }), local({ combatantId: "F01" }), local({ combatantId: "N-CON-T07" }), local({ combatantId: "MISSING" })]) refuse(initial, input, /pas présente/);
  refuse(initial, local({ territoryId: "CON-T08", combatantId: "F01" }), /sous votre commandement/);
  refuse(initial, local({ territoryId: "MISSING" }), /Site absent/);
  refuse({ ...initial, planetId: "MISSING" }, local(), /Site absent/);
  for (const input of [local({ garrison: "true" }), local({ confirmLastGuard: "yes" })]) refuse(initial, input, /invalide/);
  const lost = structuredClone(initial); lost.territories["CON-T02"].controller = "CON-F02";
  refuse(lost, local(), /sous votre commandement/);
});

test("orders retain exclusive ownership of both guards and mobiles until cancellation on every planet", () => {
  for (const planet of api.WAR_PLANETS_V96) {
    const initial = api.createWarSimulationV85(undefined, planet.id);
    for (const id of ["P02", "P07"]) {
      const reserved = api.queueWarOrderV85(initial, { kind: "recon", fromId: "CON-T02", targetId: api.warTerritoryForSimulationV96(initial, "CON-T02").neighbors[0], combatantIds: [id], cargo: { s: 0, m: 0, i: 0 } });
      assert.equal(reserved.accepted, true, planet.id);
      const input = local({ combatantId: id, garrison: !actor(initial, id).garrison, confirmLastGuard: true });
      refuse(reserved.state, input, /ordre réservé/);
      const cancelled = api.cancelWarOrderV85(reserved.state, reserved.state.orders[0].id);
      assert.equal(api.changeWarGarrisonV99(cancelled, input).accepted, true);
    }
    const guard = api.changeWarGarrisonV99(initial, local()).state;
    const reserved = api.queueWarOrderV85(guard, { kind: "recon", fromId: "CON-T02", targetId: api.warTerritoryForSimulationV96(guard, "CON-T02").neighbors[0], combatantIds: ["P07"], cargo: { s: 0, m: 0, i: 0 } });
    assert.equal(reserved.accepted, true, "an explicitly selected identified guard is still eligible for an order");
    assert.equal(reserved.state.orders.flatMap(order => order.combatantIds).filter(id => id === "P07").length, 1);
  }
});

test("guarding an intact supplied site changes the next turn income only, with unchanged upkeep", () => {
  const initial = api.createWarSimulationV85();
  for (const person of initial.combatants) if (person.factionId === "CON-F02") person.garrison = true;
  const unguarded = api.changeWarGarrisonV99(initial, local({ territoryId: "CON-T01", combatantId: "P01", garrison: false, confirmLastGuard: true })).state;
  const guarded = api.changeWarGarrisonV99(unguarded, local({ territoryId: "CON-T01", combatantId: "P24" })).state;
  assert.deepEqual(unguarded.stocks, initial.stocks); assert.deepEqual(guarded.stocks, initial.stocks);
  assert.equal(api.warCommandV98(unguarded).sites.find(site => site.id === "CON-T01").producing, false);
  assert.equal(api.warCommandV98(guarded).sites.find(site => site.id === "CON-T01").producing, true);
  assert.equal(api.warUpkeepV85(guarded), api.warUpkeepV85(unguarded));
  const withoutIncome = api.advanceWarTurnV85(unguarded).state, withIncome = api.advanceWarTurnV85(guarded).state;
  const income = api.warTerritoryForSimulationV96(guarded, "CON-T01").income;
  for (const resource of ["s", "m", "i"]) assert.equal(withIncome.stocks["CON-T01"][resource] - withoutIncome.stocks["CON-T01"][resource], income[resource]);
  for (const id of Object.keys(initial.stocks).filter(id => id !== "CON-T01")) assert.deepEqual(withIncome.stocks[id], withoutIncome.stocks[id]);
});

test("the actual care cycle returns the same healed person to a local garrison without a travel detour", () => {
  const initial = api.createWarSimulationV85(); actor(initial, "P01").status = "wounded"; actor(initial, "P01").garrison = false;
  for (const person of initial.combatants) if (person.factionId === "CON-F02") person.garrison = true;
  const care = api.queueWarOrderV85(initial, { kind: "heal", fromId: "CON-T01", targetId: "CON-T01", combatantIds: ["P01"], cargo: { s: 0, m: 0, i: 0 } });
  assert.equal(care.accepted, true);
  const inCare = api.advanceWarTurnV85(care.state).state;
  assert.equal(actor(inCare, "P01").status, "wounded"); assert.equal(actor(inCare, "P01").trainingUntilTurn, 2);
  const input = local({ territoryId: "CON-T01", combatantId: "P01" });
  refuse(inCare, input, /hors soins ou formation/);
  const healed = api.advanceWarTurnV85(inCare).state;
  assert.equal(actor(healed, "P01").status, "fit"); assert.equal(actor(healed, "P01").garrison, false);
  const restored = api.changeWarGarrisonV99(healed, input);
  assert.equal(restored.accepted, true); assert.equal(actor(restored.state, "P01").territoryId, "CON-T01");
  assert.equal(restored.state.turn, healed.turn); assert.equal(restored.state.combatants.length, healed.combatants.length);
  assert.deepEqual(restored.state.stocks, healed.stocks); assert.deepEqual(restored.state.orders, []);
  assert.deepEqual(api.warGarrisonV85(restored.state, "CON-T01").map(person => person.id), ["P01"]);
});

test("assignments cannot bypass a broken installation or supply route for production", () => {
  for (const broken of ["CON-T01", "CON-T02"]) {
    const state = api.createWarSimulationV85(); state.territories[broken].installationIntact = false;
    const change = api.changeWarGarrisonV99(state, local());
    assert.equal(change.accepted, true, "local assignment does not invent a supply requirement");
    const site = api.warCommandV98(change.state).sites.find(site => site.id === "CON-T02");
    assert.equal(site.garrison, 2); assert.equal(site.producing, false); assert.deepEqual(site.income, { s: 0, m: 0, i: 0 });
    assert.deepEqual(change.state.stocks, state.stocks);
  }
});

test("archive limits reject a local change before writing an unreadable revision or report count", () => {
  const initial = api.createWarSimulationV85();
  refuse({ ...initial, revision: 1000000 }, local(), /limite/);
  refuse({ ...initial, reports: Array.from({ length: 100000 }, (_, i) => ({ id: `test-${i}`, turn: 1, text: "Archive", sourceIds: [] })) }, local(), /limite/);
  const nearLimit = { ...initial, revision: 999999 };
  const changed = api.changeWarGarrisonV99(nearLimit, local());
  assert.equal(changed.accepted, true); assert.equal(changed.state.revision, 1000000);
  assert.ok(api.readWarSimulationV85(changed.state)); refuse(changed.state, local({ garrison: false }), /limite/);
});

test("thirty independent sessions durably reload the exact changed roster while preserving campaign and canyon bytes", async () => {
  const storage = disk([["yautja-long-hunt.save", "campaign-before"], [api.CANYON_STORAGE_KEY_V85, "canyon-before"]]);
  const originals = new Map();
  for (const planet of api.WAR_PLANETS_V96) {
    const key = api.warPlanetStorageKeyV96(planet.id), raw = JSON.stringify(api.createWarSimulationV85(undefined, planet.id), null, 2) + "\n";
    storage.data.set(key, raw); originals.set(key, raw);
  }
  const changed = new Map();
  for (const planet of api.WAR_PLANETS_V96) {
    const session = await mount(storage, planet.id);
    const result = api.changeWarGarrisonV99(session.getSnapshot().simulation, local());
    assert.equal(result.accepted, true); session.setSimulation(result.state); await session.whenSettled();
    assert.equal(session.getSnapshot().persistedWar, true, planet.id); changed.set(planet.id, result.state);
    for (const [key, raw] of originals) if (!changed.has(api.warPlanetIdForStorageKeyV96(key))) assert.equal(storage.data.get(key), raw, "unopened world bytes preserved");
  }
  assert.deepEqual(storage.writes.map(([key]) => key), api.WAR_PLANETS_V96.map(planet => api.warPlanetStorageKeyV96(planet.id)));
  for (const planet of api.WAR_PLANETS_V96) {
    const reopened = await mount(storage, planet.id);
    assert.deepEqual(reopened.getSnapshot().simulation, changed.get(planet.id), planet.id);
    assert.equal(actor(reopened.getSnapshot().simulation, "P07").garrison, true);
  }
  assert.equal(storage.data.get("yautja-long-hunt.save"), "campaign-before");
  assert.equal(storage.data.get(api.CANYON_STORAGE_KEY_V85), "canyon-before");
  assert.equal(storage.writes.length, 30);
});

test("a failed garrison write retains the previous archive and retries the newest identified roster", async () => {
  const planet = api.WAR_PLANETS_V96[1], key = api.warPlanetStorageKeyV96(planet.id), original = JSON.stringify(api.createWarSimulationV85(undefined, planet.id));
  const storage = disk([[key, original]]), session = await mount(storage, planet.id); storage.full = true;
  session.setSimulation(api.changeWarGarrisonV99(session.getSnapshot().simulation, local()).state); await session.whenSettled();
  assert.equal(session.getSnapshot().persistedWar, false); assert.equal(storage.data.get(key), original);
  assert.equal(actor(session.getSnapshot().simulation, "P07").garrison, true);
  session.setSimulation(api.changeWarGarrisonV99(session.getSnapshot().simulation, local({ combatantId: "P02", garrison: false })).state);
  storage.full = false; session.retryPersistence(); await session.whenSettled();
  assert.equal(session.getSnapshot().persistedWar, true); assert.equal(storage.writes.length, 1);
  const reopened = await mount(storage, planet.id);
  assert.equal(actor(reopened.getSnapshot().simulation, "P07").garrison, true);
  assert.equal(actor(reopened.getSnapshot().simulation, "P02").garrison, false);
  assert.deepEqual(reopened.getSnapshot().simulation.combatants.map(person => person.id), session.getSnapshot().simulation.combatants.map(person => person.id));
});

test("actual React guard rosters show only local own people and explain disabled wounded, training and reserved controls", t => {
  const ssr = homeworldSceneSsrV78(), errors = t.mock.method(console, "error");
  for (const planet of api.WAR_PLANETS_V96) {
    const initial = api.createWarSimulationV85(undefined, planet.id);
    actor(initial, "P07").status = "wounded"; actor(initial, "P08").status = "dead"; actor(initial, "P09").trainingUntilTurn = 9;
    const reserved = api.queueWarOrderV85(initial, { kind: "recon", fromId: "CON-T02", targetId: api.warTerritoryForSimulationV96(initial, "CON-T02").neighbors[0], combatantIds: ["P10"], cargo: { s: 0, m: 0, i: 0 } });
    assert.equal(reserved.accepted, true);
    const html = ssr.render("app/game/ClanWarGarrisonV99.tsx", { simulation: reserved.state, territoryId: "CON-T02", onChange() { throw Error("SSR must not mutate a roster"); } });
    assert.match(html, /data-testid="war-garrison-v99"/); assert.match(html, /Garnison sur place · 1 garde/);
    assert.match(html, /Affecter P11 à la garde/); assert.match(html, /Libérer P02 de la garde/);
    for (const id of ["P07", "P08", "P09", "P10"]) {
      const row = html.match(new RegExp(`data-war-garrison-person="${id}"[\\s\\S]*?</li>`))[0];
      assert.match(row, /<button[^>]*disabled=""[^>]*aria-describedby="[^"]+"/);
      assert.match(row, /<small id="[^"]+">/);
    }
    assert.match(html, /ordre réservé/); assert.match(html, /Décédé · registre conservé/);
    assert.doesNotMatch(html, /data-war-garrison-person="(?:F|N-)|NaN|Infinity|undefined/);
    assert.equal(ssr.render("app/game/ClanWarGarrisonV99.tsx", { simulation: reserved.state, territoryId: "CON-T08", onChange() {} }), "");
    const lost = structuredClone(reserved.state); lost.territories["CON-T02"].controller = "CON-F02";
    assert.equal(ssr.render("app/game/ClanWarGarrisonV99.tsx", { simulation: lost, territoryId: "CON-T02", onChange() {} }), "");
  }
  assert.equal(errors.mock.callCount(), 0);
});
