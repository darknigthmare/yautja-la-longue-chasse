import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";

const bundled = await build({
  stdin: { contents: "export * from './app/game/systems/clanWarMissionModesV114'; export * from './app/game/systems/clanWarV85';", resolveDir: process.cwd() },
  bundle: true, write: false, format: "esm", platform: "node", target: "es2022", logLevel: "silent",
});
const api = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`);

test("twelve missions, four modes, existing V3 RTS-U roster", () => {
  const templates = api.WAR_MISSION_TEMPLATES_V114;
  assert.equal(templates.length, 12);
  assert.equal(new Set(templates.map(item => item.id)).size, 12);
  for (const mode of ["line", "dispatch", "stealth", "rts"]) assert.equal(templates.filter(item => item.mode === mode).length, 3);
  assert.ok(api.WAR_LINE_ROSTER_V114.length >= 1);
  for (const unit of api.WAR_LINE_ROSTER_V114) {
    assert.ok(unit.id.startsWith("RTS-U"));
    assert.ok(unit.cost >= 20 && unit.cost <= 95);
  }
});

test("independent board rejects invalid/future/cross-planet saved data", () => {
  const board = api.createWarMissionBoardV114("korthas");
  assert.deepEqual(api.readWarMissionBoardV114(JSON.parse(JSON.stringify(board)), "korthas"), board);
  assert.equal(api.readWarMissionBoardV114({ ...board, version: 2 }, "korthas"), null);
  assert.equal(api.readWarMissionBoardV114({ ...board, revision: -1 }, "korthas"), null);
  assert.equal(api.readWarMissionBoardV114({ ...board, rav: -10 }, "korthas"), null);
  assert.equal(api.readWarMissionBoardV114({ ...board, reports: [{ id: "fake" }] }, "korthas"), null);
  assert.equal(api.readWarMissionBoardV114(board, "other-planet"), null);
  assert.notEqual(api.warMissionStorageKeyV114("korthas"), api.warMissionStorageKeyV114("alien-world"));
});

test("lateral battle deploys units, regenerates AP, spawns opponent and preserves input", () => {
  const original = api.createWarLineV114(33, 60, 1);
  const before = JSON.stringify(original);
  const available = api.WAR_LINE_ROSTER_V114.findIndex(unit => unit.cost <= original.ap);
  assert.ok(available >= 0);
  const deployed = api.deployWarLineV114(original, available);
  assert.equal(deployed.actors.length, 1);
  assert.equal(deployed.actors[0].side, "own");
  assert.ok(deployed.ap < original.ap);
  assert.equal(JSON.stringify(original), before);
  assert.equal(api.deployWarLineV114(original, -1), original);
  let played = deployed;
  for (let i = 0; i < 7; i++) played = api.stepWarLineV114(played);
  assert.equal(played.tick, 7);
  assert.ok(played.ap >= deployed.ap);
  assert.ok(played.actors.some(a => a.side === "enemy"));
  const helped = api.activateWarLineSupportV114(played);
  assert.equal(helped.lastSpecial, played.tick);
  assert.equal(api.activateWarLineSupportV114(helped), helped);
  assert.equal(api.stepWarLineV114({ ...played, phase: "victory" }).phase, "victory");
});

test("detached operation reserves actual fighters, respects local strategic orders, resolves once", () => {
  const simulation = api.createWarSimulationV85();
  const initialWar = JSON.stringify(simulation);
  const board = api.createWarMissionBoardV114("korthas");
  const origin = "CON-T02", target = api.warTerritoryForSimulationV96(simulation, origin).neighbors[0];
  assert.ok(target);
  const eligible = simulation.combatants.find(p => p.factionId === "CON-F01" && p.territoryId === origin && p.status === "fit" && p.trainingUntilTurn === null);
  assert.ok(eligible);
  const now = 1690000000000;
  const issued = api.issueWarDispatchV114(board, simulation, "W114-D01", origin, target, [eligible.id], now);
  assert.equal(issued.error, null);
  assert.equal(issued.board.rav, board.rav - 5);
  assert.equal(issued.board.dispatches.length, 1);
  assert.equal(api.issueWarDispatchV114(issued.board, simulation, "W114-D01", origin, target, [eligible.id], now + 10).board, issued.board);
  assert.equal(api.issueWarDispatchV114(board, simulation, "W114-D01", origin, "missing", [eligible.id], now).board, board);
  assert.equal(api.resolveWarDispatchesV114(issued.board, issued.board.dispatches[0].dueAt - 1), issued.board);
  const resolved = api.resolveWarDispatchesV114(issued.board, issued.board.dispatches[0].dueAt);
  assert.equal(resolved.dispatches[0].status, "resolved");
  assert.equal(resolved.reports.length, 1);
  assert.equal(resolved.receipts.length, 1);
  assert.equal(api.resolveWarDispatchesV114(resolved, now + 1000000), resolved);
  assert.equal(JSON.stringify(simulation), initialWar);
});

test("infiltration: walls, interacting with relay and extracting all have concrete consequences", () => {
  const starting = api.createWarStealthV114();
  assert.equal(starting.phase, "active");
  assert.equal(api.actWarStealthV114(starting, "left").x, starting.x - 1);
  assert.equal(api.actWarStealthV114({ ...starting, x: 3, y: 3 }, "right").x, 3);
  const touching = { ...starting, x: 9, y: 2, guards: [] };
  const sabotaged = api.actWarStealthV114(touching, "interact");
  assert.equal(sabotaged.planted, true);
  assert.equal(sabotaged.phase, "active");
  const extracted = api.actWarStealthV114({ ...sabotaged, x: 1, y: 7 }, "up");
  assert.equal(extracted.phase, "victory");
  assert.equal(api.actWarStealthV114(extracted, "right"), extracted);
  assert.equal(starting.planted, false);
});

test("RTS: selectable allied squads, reinforcement, dual point capture, terminal victory", () => {
  const first = api.createWarRtsV114();
  const moved = api.orderWarRtsV114(first, "own-1", 7, 3);
  assert.notEqual(moved, first);
  assert.equal(moved.units.find(u => u.id === "own-1").targetX, 7);
  assert.equal(first.units.find(u => u.id === "own-1").targetX, 3);
  assert.equal(api.orderWarRtsV114(first, "enemy-3", 3, 3), first);
  assert.equal(api.orderWarRtsV114(first, "own-1", -1, 0), first);
  const recruited = api.deployWarRtsV114(first);
  assert.equal(recruited.units.filter(u => u.side === "own").length, 3);
  assert.equal(recruited.points, first.points - 35);
  const winning = { ...first, tick: 11, hold: 5, leftCapture: 6, rightCapture: 6,
    units: [
      { id: "own-1", side: "own", x: 3, y: 3, targetX: 3, targetY: 3, hp: 30, cooldown: 0 },
      { id: "own-2", side: "own", x: 7, y: 3, targetX: 7, targetY: 3, hp: 30, cooldown: 0 },
    ] };
  const next = api.stepWarRtsV114(winning);
  assert.equal(next.phase, "victory");
  assert.equal(next.hold, 6);
  assert.equal(api.stepWarRtsV114(next), next);
});

test("reports are deduplicated; war campaign/territories remain untouched", () => {
  const simulation = api.createWarSimulationV85();
  const warBytes = JSON.stringify(simulation);
  const original = api.createWarMissionBoardV114("korthas");
  const receipt = { id: "mission-korthas-safe-1", templateId: "W114-S01", mode: "stealth", planetId: "korthas",
    fromId: "CON-T02", targetId: "CON-T08", success: true, losses: 0, at: 1600000000000,
    text: "Transmetteur neutralisé. Rapport d'exercice." };
  const recorded = api.finishWarMissionV114(original, receipt);
  assert.equal(recorded.reports.length, 1);
  assert.equal(recorded.intel, 8);
  assert.equal(recorded.sabotage, 12);
  assert.equal(api.finishWarMissionV114(recorded, receipt), recorded);
  assert.equal(api.finishWarMissionV114(original, { ...receipt, planetId: "wrong" }), original);
  assert.equal(JSON.stringify(simulation), warBytes);
});
