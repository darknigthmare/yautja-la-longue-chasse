import assert from "node:assert/strict";
import test from "node:test";
import { homeworldSceneSsrV78 } from "./helpers/homeworld-scene-ssr-v78.mjs";

const ssr = homeworldSceneSsrV78();
const engine = ssr.load("app/game/systems/gameReserveV66.ts");
const { gameReserveTacticalV98 } = ssr.load("app/game/systems/gameReserveTacticalV98.ts");
const fresh = () => engine.stepGameReserveV66(engine.createGameReserveV66(37));

test("field notebook follows real sectors and never mutates the expedition", () => {
  const state = fresh(), before = structuredClone(state);
  const initial = gameReserveTacticalV98(state);
  assert.deepEqual(initial.sectors.map(sector => [sector.visited, sector.current]), [[true, true], [false, false], [false, false]]);
  assert.equal(initial.action.kind, "return"); assert.equal(initial.action.remaining, 1);
  assert.deepEqual(state, before);
  state.player.x = 3400; state.visited.push(1, 2);
  const traveled = gameReserveTacticalV98(state);
  assert.deepEqual(traveled.sectors.map(sector => sector.current), [false, false, true]);
  assert(traveled.sectors.every(sector => sector.visited));
});

test("a known sector and a distant audible launch do not reveal parts, repair or passengers", () => {
  const state = fresh(); state.player.x = 1810; state.visited.push(1);
  state.ships[0].parts = 3; state.ships[0].repair = 2999;
  assert.equal(engine.gameReserveV66LineClear(state.player.x, 383, 2360, 385), false, "a fern hides the hull approach");
  const hidden = gameReserveTacticalV98(state).ships[0];
  assert.equal(hidden.phase, "unknown");
  assert.deepEqual([hidden.parts, hidden.repair, hidden.aboard], [null, null, null]);
  state.tick = 600; state.ships[0].repair = 3600; state.ships[0].launch = 500;
  for (const human of state.humans.slice(0, 4)) { human.x = 2360; human.status = "boarded"; }
  assert(engine.normalizeGameReserveV66(state));
  const heard = gameReserveTacticalV98(state).ships[0];
  assert.equal(heard.phase, "boarding"); assert.equal(heard.countdown, 14);
  assert.deepEqual([heard.parts, heard.repair, heard.aboard], [null, null, null]);
  state.player.x = 2360; state.player.y = 280;
  assert.equal(gameReserveTacticalV98(state).ships[0].parts, null, "canopy proximity does not inspect the circuit");
  state.player.y = 438;
  const inspected = gameReserveTacticalV98(state).ships[0];
  assert.deepEqual([inspected.parts, inspected.repair, inspected.aboard], [3, 100, 4]);
  state.player.x = 2285;
  assert.equal(gameReserveTacticalV98(state).ships[0].parts, null, "inspection uses the same strict 75-unit ramp range as interaction");
});

test("contacts require local line of sight; unnamed roles remain private until actual observation", () => {
  const state = fresh(); state.player.x = 430;
  state.humans[0].x = 610; state.humans[0].facing = -1;
  assert.equal(gameReserveTacticalV98(state).contacts.length, 0);
  state.player.x = 700; state.humans[0].x = 790;
  let contact = gameReserveTacticalV98(state).contacts.find(item => item.id === state.humans[0].id);
  assert.equal(contact.name, "Combattant non identifié");
  assert.doesNotMatch(contact.description, /cheffe|leader|fusil/);
  state.humans[0].identified = true; state.humans[0].scan = 90; state.humans[0].carrying = true;
  contact = gameReserveTacticalV98(state).contacts.find(item => item.id === state.humans[0].id);
  assert.equal(contact.name, "Veyra"); assert.equal(contact.carrying, true);
  state.humans[0].x = 1800;
  assert.equal(gameReserveTacticalV98(state).contacts.some(item => item.id === state.humans[0].id), false, "identified people are not tracked through the world");
});

test("an active launch takes priority over a body at the ramp, with physical channel progress", () => {
  const state = fresh(); state.tick = 700; state.player.x = 2360;
  state.ships[0] = { parts: 3, repair: 3600, launch: 500, departedAt: null, sabotages: 0 };
  Object.assign(state.humans[0], { x: 2360, hp: 0, status: "down", downAt: 600 });
  assert(engine.normalizeGameReserveV66(state));
  assert.equal(engine.gameReserveV66Interaction(state).kind, "sabotage");
  state.channel = { kind: "sabotage", target: 0, ticks: 60 };
  const action = gameReserveTacticalV98(state).action;
  assert.equal(action.title, "Intercepter le décollage"); assert.equal(action.remaining, .5); assert.equal(action.progress, 2 / 3);
  state.player.y = 350;
  assert.equal(gameReserveTacticalV98(state).action.kind, "none");
});

test("notebook renders accessible geography and honest uninspected ship states", () => {
  const state = fresh();
  const html = ssr.render("app/game/GameReserveTacticalV98.tsx", { state });
  assert.match(html, /aria-label="Carnet de traque"/);
  assert.match(html, /aria-current="location"/);
  assert.match(html, /Position du chasseur : Jungle des Parachutes/);
  assert.match(html, /2 secteurs|0\/8 rôles|1\/3 secteurs/);
  assert.equal((html.match(/Circuit non inspecté/g) ?? []).length, 2);
  assert.doesNotMatch(html, /Veyra|Marek|Solen|Nara|circuit 0 %|NaN|undefined|Infinity/);
});

test("closed expeditions show a historical notebook without suggesting playable actions", () => {
  let state = fresh();
  for (let tick = 0; tick < 60; tick++) state = engine.stepGameReserveV66(state, { interact: true });
  assert.equal(state.status, "returned");
  const tactical = gameReserveTacticalV98(state);
  assert.equal(tactical.action.kind, "none"); assert.equal(tactical.action.title, "Expédition close");
  const html = ssr.render("app/game/GameReserveTacticalV98.tsx", { state });
  assert.match(html, /Le carnet conserve le dernier état/);
  assert.doesNotMatch(html, /Maintenir Interagir|Un mouvement ou une blessure/);
});
