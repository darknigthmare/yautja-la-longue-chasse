import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { homeworldSceneSsrV78 } from "./helpers/homeworld-scene-ssr-v78.mjs";

const bundle = await build({ stdin: { contents: "export * from './app/game/systems/clanWarV85'; export * from './app/game/systems/clanWarCommandV98'; export * from './app/game/systems/clanWarPlanetsV96';", resolveDir: process.cwd() }, bundle: true, write: false, format: "esm", platform: "node", target: "es2022", logLevel: "silent" });
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
const draft = (state, kind = "recon", extra = {}) => ({ kind, fromId: "CON-T02", targetId: api.warTerritoryForSimulationV96(state, "CON-T02").neighbors[0], combatantIds: ["P07"], cargo: { s: 0, m: 0, i: 0 }, ...extra });

test("all thirty command views retain exact state bytes and expose only controlled sites", () => {
  for (const planet of api.WAR_PLANETS_V96) {
    const state = api.createWarSimulationV85(undefined, planet.id), before = JSON.stringify(state);
    const command = api.warCommandV98(state);
    api.warOrderPreviewV98(state, draft(state));
    assert.equal(JSON.stringify(state), before, planet.id);
    assert.equal(command.sites.length, Object.values(state.territories).filter(site => site.controller === "CON-F01").length);
    assert.ok(command.sites.every(site => state.territories[site.id].controller === "CON-F01"));
    assert.equal(command.regions.length, 6);
    assert.equal(command.regions.reduce((total, region) => total + region.total, 0), 36);
    for (const site of command.sites) {
      assert.equal(site.garrison, api.warGarrisonV85(state, site.id).length);
      assert.equal(site.supplied, api.warSuppliedV85(state).has(site.id));
      assert.deepEqual(site.income, site.producing ? planet.definitions.find(item => item.id === site.id).income : { s: 0, m: 0, i: 0 });
    }
  }
});

test("preview acceptance is the real validator for seven order types, thirty worlds and current reservations", () => {
  let comparisons = 0;
  for (const planet of api.WAR_PLANETS_V96) {
    const initial = api.createWarSimulationV85(undefined, planet.id);
    const queued = api.queueWarOrderV85(initial, draft(initial));
    assert.equal(queued.accepted, true);
    const poor = structuredClone(initial); poor.stocks["CON-T02"] = { s: 0, m: 0, i: 0 };
    for (const state of [initial, queued.state, poor]) for (const kind of ["move", "attack", "recon", "cession", "transit", "logistics", "heal"]) for (const ids of [[], ["P07"], ["P08"], ["P07", "P07"]]) {
      const input = draft(state, kind, { targetId: kind === "heal" ? "CON-T02" : draft(state).targetId, combatantIds: ids, cargo: kind === "logistics" ? { s: 5, m: 2, i: 0 } : { s: 0, m: 0, i: 0 } });
      const preview = api.warOrderPreviewV98(state, input);
      const actual = api.queueWarOrderV85(state, input);
      assert.equal(preview.issue, api.warOrderIssueV85(state, { ...input, id: "test", factionId: "CON-F01", mode: "auto" }), `${planet.id}/${kind}`);
      assert.equal(preview.issue === null, actual.accepted, `${planet.id}/${kind}`);
      if (!actual.accepted) assert.equal(preview.issue, actual.message);
      comparisons++;
    }
  }
  assert.equal(comparisons, 2520);
});

test("hidden enemy stocks and identities cannot alter command or assault advice", () => {
  const original = api.createWarSimulationV85(), hidden = structuredClone(original);
  for (const [id, site] of Object.entries(hidden.territories)) if (site.controller !== "CON-F01") hidden.stocks[id] = { s: 923813, m: 923814, i: 923815 };
  hidden.combatants = hidden.combatants.filter(actor => actor.factionId === "CON-F01");
  for (let i = 0; i < 120; i++) hidden.combatants.push({ id: `SECRET-IDENTITY-${i}`, unitTypeId: "RTS-U01", factionId: "CON-F02", territoryId: "CON-T08", status: "fit", xp: 999, garrison: true, trainingUntilTurn: null });
  const attack = draft(original, "attack", { targetId: "CON-T08" });
  assert.deepEqual(api.warCommandV98(hidden), api.warCommandV98(original));
  assert.deepEqual(api.warOrderPreviewV98(hidden, attack), api.warOrderPreviewV98(original, attack));
  assert.doesNotMatch(JSON.stringify([api.warCommandV98(hidden), api.warOrderPreviewV98(hidden, attack)]), /SECRET-IDENTITY|923813|923814|923815/);
  const foreign = api.warOrderPreviewV98(hidden, { ...attack, fromId: "CON-T08" });
  assert.equal(foreign.available, null);
  assert.equal(foreign.after, null);
});

test("local stock reservations and operation slots are released by cancellation", () => {
  const initial = api.createWarSimulationV85();
  const attack = api.queueWarOrderV85(initial, draft(initial, "attack", { targetId: "CON-T08" }));
  assert.equal(attack.accepted, true);
  const site = api.warCommandV98(attack.state).sites.find(item => item.id === "CON-T02");
  assert.equal(site.availableStock.s, initial.stocks["CON-T02"].s - 3);
  assert.equal(site.availableStock.m, initial.stocks["CON-T02"].m - 1);
  assert.equal(site.available, site.ready - 1);
  assert.equal(api.warCommandV98(attack.state).slots[0].used, 1);
  const restored = api.cancelWarOrderV85(attack.state, attack.state.orders[0].id);
  assert.deepEqual(api.warCommandV98(restored), api.warCommandV98(initial));
});

test("convoys reserve local stock while preserving consolidated upkeep funds", () => {
  const initial = api.createWarSimulationV85();
  const convoy = api.queueWarOrderV85(initial, draft(initial, "logistics", { targetId: "CON-T01", cargo: { s: 5, m: 2, i: 0 } }));
  assert.equal(convoy.accepted, true);
  const before = api.warCommandV98(initial), after = api.warCommandV98(convoy.state);
  assert.equal(after.upkeepAvailable, before.upkeepAvailable);
  assert.equal(after.sites.find(site => site.id === "CON-T02").availableStock.s, initial.stocks["CON-T02"].s - 5);
  assert.deepEqual(after.slots.map(slot => slot.used), [0, 1, 0]);
  const zero = api.warOrderPreviewV98(initial, draft(initial, "logistics", { targetId: "CON-T01" }));
  assert.ok(zero.warnings.some(text => text.includes("aucun lot")));
});

test("departure guards, isolated occupation and unpaid upkeep produce actionable warnings", () => {
  const initial = api.createWarSimulationV85();
  const move = api.warOrderPreviewV98(initial, draft(initial, "move", { combatantIds: ["P02"], targetId: "CON-T01" }));
  assert.ok(move.warnings.some(text => text.includes("Tous les gardes")));
  const recon = api.warOrderPreviewV98(initial, draft(initial, "recon", { combatantIds: ["P02"] }));
  assert.ok(recon.warnings.every(text => !text.includes("Tous les gardes")));
  const isolated = structuredClone(initial); isolated.territories["CON-T01"].installationIntact = false;
  const assault = api.warOrderPreviewV98(isolated, draft(isolated, "attack", { targetId: "CON-T08" }));
  assert.ok(assault.warnings.some(text => text.includes("ne validera pas l’occupation")));
  for (const site of Object.keys(isolated.stocks)) if (isolated.territories[site].controller === "CON-F01") isolated.stocks[site] = { s: 0, m: 0, i: 0 };
  assert.ok(api.warOrderPreviewV98(isolated, draft(isolated)).warnings.some(text => text.includes("entretien actuel")));
});

test("assault advice retains dated estimates without computing a hidden battle outcome", () => {
  const state = api.createWarSimulationV85(), assault = draft(state, "attack", { targetId: "CON-T08" });
  assert.ok(api.warOrderPreviewV98(state, assault).warnings.some(text => text.includes("Effectif adverse inconnu")));
  state.observations.push({ territoryId: "CON-T08", turn: 1, lower: 2, upper: 6, sourceId: "P08" }); state.turn = 4;
  const preview = api.warOrderPreviewV98(state, assault);
  assert.equal(preview.intel.lower, 2); assert.equal(preview.intel.upper, 6);
  assert.equal(preview.intel.count, null); assert.equal(preview.intel.stale, true);
  assert.ok(preview.warnings.some(text => text.includes("renseignement est ancien")));
  assert.equal(Object.hasOwn(preview, "victory"), false);
});

test("objective diagnostics distinguish regional coverage from every-site occupation and track transit expiry", () => {
  for (const planet of api.WAR_PLANETS_V96) {
    const state = api.createWarSimulationV85(undefined, planet.id);
    for (const site of Object.values(state.territories)) site.controller = "CON-F01";
    for (const actor of state.combatants) if (actor.factionId === "CON-F01") actor.garrison = false;
    const regionNames = [...new Set(planet.definitions.map(site => site.region))];
    regionNames.forEach((name, index) => { const actor = state.combatants[index]; actor.territoryId = planet.definitions.find(site => site.region === name).id; actor.garrison = true; });
    const command = api.warCommandV98(state);
    assert.ok(command.regions.every(region => region.guarded === 1 && region.controlled === 6 && region.ready === 1));
    for (const site of command.corridor) assert.equal(site.guarded, api.warGarrisonV85(state, site.id).length > 0);
    if (planet.id === "korthas") assert.ok(command.corridor.some(site => !site.guarded));
    const independent = planet.definitions.find(site => site.initialController === "CON-F03").id;
    state.territories[independent].controller = "CON-F03"; state.territories[independent].transitUntilTurn = state.turn;
    assert.deepEqual(api.warCommandV98(state).transits, [{ id: independent, expires: state.turn }]);
    state.turn++;
    assert.equal(api.warCommandV98(state).transits.length, 0);
  }
});

test("actual command markup renders each world with real own sites and safe diagnostics", t => {
  const ssr = homeworldSceneSsrV78(), engine = ssr.load("app/game/systems/clanWarV85.ts");
  const errors = t.mock.method(console, "error");
  for (const planet of api.WAR_PLANETS_V96) {
    const simulation = engine.createWarSimulationV85(undefined, planet.id);
    const html = ssr.render("app/game/ClanWarCommandV98.tsx", { simulation, selectedTerritoryId: "CON-T02", onPrepare() {} });
    assert.match(html, /data-testid="war-command-v98"/);
    assert.match(html, /Poste de commandement/);
    assert.match(html, /aria-pressed="true">Priorités/);
    assert.match(html, /Domination/);
    assert.match(html, /type="button"/);
    assert.doesNotMatch(html, /NaN|Infinity|undefined/);
    for (const match of html.matchAll(/data-war-command-site="([^"]+)"/g)) assert.equal(simulation.territories[match[1]].controller, "CON-F01");
  }
  assert.equal(errors.mock.callCount(), 0);
});
