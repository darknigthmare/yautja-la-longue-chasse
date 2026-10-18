import assert from "node:assert/strict";
import test from "node:test";
import { homeworldSceneSsrV78 } from "./helpers/homeworld-scene-ssr-v78.mjs";

function fixture() {
  const ssr = homeworldSceneSsrV78();
  const simulation = ssr.load("app/game/systems/clanWarV85.ts").createWarSimulationV85();
  const render = (selectedTerritoryId = "CON-T02") => ssr.render("app/game/ClanWarAtlasV95.tsx", {
    simulation, selectedTerritoryId, targetTerritoryId: "CON-T08", onSelectTerritory() {}, onSelectTarget() {},
  });
  return { simulation, render };
}

test("the real atlas renders on the server with faction shares, all territory names and accessible controls", t => {
  const { render } = fixture();
  const errors = t.mock.method(console, "error");
  const html = render();
  assert.equal(errors.mock.callCount(), 0, "React SSR should render the atlas without warnings");
  assert.match(html, /data-testid="clan-war-atlas-v95"/);
  assert.match(html, /17 % des territoires/);
  assert.match(html, /39 % des territoires/);
  assert.match(html, /44 % des territoires/);
  assert.match(html, /12 personnes aptes/);
  assert.match(html, /aria-label="Longitude du globe"/);
  assert.match(html, /aria-label="Zoom du globe"/);
  assert.match(html, /role="button" tabindex="0"/);
  assert.match(html, /Port des Hautes Mesas/);
  assert.match(html, /Couronne d’Arrivée/);
  assert.doesNotMatch(html, /NaN|Infinity/);
});

test("inspecting an enemy never publishes its live roster, local stock or supply state", () => {
  const { simulation, render } = fixture();
  simulation.stocks["CON-T08"] = { s: 928389, m: 929918, i: 929919 };
  simulation.combatants.push(...Array.from({ length: 1111 }, (_, index) => ({
    id: `HIDDEN-ENEMY-${index}`, territoryId: "CON-T08", factionId: "CON-F02", status: "fit",
    unitTypeId: "RTS-U01", xp: 0, garrison: false, trainingUntilTurn: null,
  })));
  const html = render("CON-T08");
  assert.match(html, /Effectif inconnu/);
  assert.match(html, /Liaison non observée/);
  assert.doesNotMatch(html, /HIDDEN-ENEMY|928389|929918|929919|Stocks locaux|Installation<\/dt>|1115 personnes/);
});

test("an old observation stays a dated estimate after the hidden enemy roster changes", () => {
  const { simulation, render } = fixture();
  simulation.turn = 7;
  simulation.observations.push({ territoryId: "CON-T08", lower: 3, upper: 6, turn: 2, sourceId: "CON-T02" });
  simulation.combatants = simulation.combatants.filter(actor => actor.territoryId !== "CON-T08");
  const html = render("CON-T08");
  assert.match(html, /3–6 estimées · tour 2 · ancien renseignement/);
  assert.match(html, /Tour 2 · ancien, à renouveler/);
  assert.doesNotMatch(html, /0 personne apte/);
});
