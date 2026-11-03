import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { ship } from "./helpers/ship-level-runtime.mjs";

const IDLE = { horizontal: 0, vertical: 0, jump: false };
const EPSILON = 0.002;
const primaryLadders = ship.PHYSICAL_SHIP_LADDERS.filter((ladder) =>
  ladder.top === 700 && ladder.bottom === 1360);

function overlaps(a, b) {
  return a.x < b.x + b.width - EPSILON && a.x + a.width > b.x + EPSILON &&
    a.y < b.y + b.height - EPSILON && a.y + a.height > b.y + EPSILON;
}

function simulation(dt = 1 / 60) {
  let player = ship.createPhysicalShipMotion();
  let doors = ship.createShipDoorStates();
  let ticks = 0;
  return {
    get player() { return player; },
    get doors() { return doors; },
    get dt() { return dt; },
    tick(input = IDLE, suspended = false) {
      doors = ship.stepShipDoorStates(doors, player, dt, suspended);
      player = ship.stepPhysicalShipMotion(player, input, dt, suspended, doors);
      ticks += 1;
      const bounds = ship.physicalShipPlayerBounds(player);
      const blockers = [...ship.SHIP_LEVEL_SOLIDS, ...ship.SHIP_LEVEL_DOORS.flatMap((door) => {
        const panel = ship.shipDoorPanel(door, doors[door.id]);
        return panel ? [{ ...panel, id: door.id }] : [];
      })];
      const collision = blockers.find((solid) => overlaps(bounds, solid));
      assert.equal(collision, undefined,
        `tick ${ticks}: actor ${JSON.stringify(bounds)} intersects ${collision?.id}`);
      assert.ok(Number.isFinite(player.x) && Number.isFinite(player.y));
      return player;
    },
  };
}

function walkTo(run, x) {
  for (let frame = 0; frame < 2400 && Math.abs(run.player.x - x) > EPSILON; frame += 1) {
    const horizontal = Math.max(-1, Math.min(1,
      (x - run.player.x) / (ship.PHYSICAL_SHIP_MOVEMENT.walkSpeed * run.dt)));
    run.tick({ ...IDLE, horizontal });
  }
  assert.ok(Math.abs(run.player.x - x) <= EPSILON,
    `walking from the real spawn failed to reach ${x}: ${JSON.stringify(run.player)}`);
}

function climbTo(run, y) {
  for (let frame = 0; frame < 1000 && Math.abs(run.player.y - y) > EPSILON; frame += 1) {
    const vertical = Math.max(-1, Math.min(1, (y - run.player.y) / (ship.PHYSICAL_SHIP_MOVEMENT.climbSpeed * run.dt)));
    run.tick({ ...IDLE, vertical });
  }
  assert.ok(Math.abs(run.player.y - y) <= EPSILON,
    `climb failed to reach ${y}: ${JSON.stringify(run.player)}`);
}

function arriveAtLadderBottom(run, ladder) {
  if (ladder.bottom === 700) {
    const shaft = primaryLadders[1];
    walkTo(run, shaft.x);
    climbTo(run, shaft.top);
  }
  walkTo(run, ladder.x);
  assert.equal(run.player.y, ladder.bottom);
}

for (const ladder of ship.PHYSICAL_SHIP_LADDERS) {
  for (const direction of [-1, 1]) {
    test(`${ladder.id}: held up plus horizontal ${direction} exits the top instead of being magnetized`, () => {
      const run = simulation();
      arriveAtLadderBottom(run, ladder);
      climbTo(run, ladder.top);
      for (let frame = 0; frame < 30; frame += 1) {
        run.tick({ ...IDLE, horizontal: direction, vertical: -1 });
      }
      assert.ok((run.player.x - ladder.x) * direction > 40,
        `diagonal exit stalled at ${run.player.x}`);
      assert.equal(run.player.climbing, false);
    });

    test(`${ladder.id}: held down plus horizontal ${direction} exits the bottom after a real descent`, () => {
      const run = simulation();
      arriveAtLadderBottom(run, ladder);
      climbTo(run, ladder.top);
      climbTo(run, ladder.bottom);
      for (let frame = 0; frame < 30; frame += 1) {
        run.tick({ ...IDLE, horizontal: direction, vertical: 1 });
      }
      assert.ok((run.player.x - ladder.x) * direction > 40,
        `diagonal exit stalled at ${run.player.x}`);
      assert.equal(run.player.climbing, false);
    });
  }
}

for (const rate of [30, 60, 144]) {
  test(`all twelve occupied thresholds resist crushing and close after departure at ${rate} Hz`, () => {
    for (const door of ship.SHIP_LEVEL_DOORS) {
      const run = simulation(1 / rate);
      if (door.y + door.height === 700) {
        walkTo(run, primaryLadders[1].x);
        climbTo(run, primaryLadders[1].top);
      }
      const center = door.x + door.width / 2;
      walkTo(run, center);
      for (let frame = 0; frame < rate * 2; frame += 1) run.tick();
      assert.equal(run.doors[door.id].openness, 1, `${door.id}: occupied door closed`);
      const heldPlayer = run.player;
      const heldDoors = run.doors;
      for (let frame = 0; frame < 10; frame += 1) {
        run.tick({ horizontal: 1, vertical: 1, jump: true }, true);
      }
      assert.equal(run.player, heldPlayer, "station suspension moved the hunter in the threshold");
      assert.equal(run.doors, heldDoors, "station suspension changed door geometry");
      walkTo(run, center + 220);
      for (let frame = 0; frame < rate * 3; frame += 1) run.tick();
      assert.equal(run.doors[door.id].openness, 0, `${door.id}: unoccupied door never closed`);
    }
  });
}

test("one continuous loop visits every station with no teleport and keeps a portrait camera on the hunter", () => {
  const run = simulation();
  const visited = new Set();
  const visit = (id) => {
    const station = ship.PHYSICAL_SHIP_STATIONS.find((entry) => entry.id === id);
    assert.ok(station);
    walkTo(run, station.x);
    assert.equal(ship.nearestPhysicalShipStation(run.player)?.id, id);
    assert.equal(ship.shipRoomAt(run.player)?.id, id);
    visited.add(id);
    for (const width of [440, 1100, 1500]) {
      const camera = ship.getShipCamera(run.player, { width, height: 650 });
      const body = ship.physicalShipPlayerBounds(run.player);
      assert.ok(camera.x >= 0 && camera.y >= 0);
      assert.ok(camera.x + camera.width <= ship.PHYSICAL_SHIP_WORLD.width);
      assert.ok(camera.y + camera.height <= ship.PHYSICAL_SHIP_WORLD.height);
      assert.ok(body.x >= camera.x && body.x + body.width <= camera.x + camera.width);
      assert.ok(body.y >= camera.y && body.y + body.height <= camera.y + camera.height);
      assert.ok(station.y - 180 >= camera.y, `${id}: interaction cue clipped above camera`);
    }
  };
  for (const id of ["launch-airlock", "training-arena", "medical-bay", "trophy-hall"]) visit(id);
  walkTo(run, primaryLadders[0].x);
  climbTo(run, primaryLadders[0].top);
  for (const id of ["galaxy-map", "wall-armory", "clan-archives", "appearance-forge"]) visit(id);
  walkTo(run, primaryLadders[1].x);
  climbTo(run, primaryLadders[1].bottom);
  visit("launch-airlock");
  assert.equal(visited.size, 8);
  assert.equal(run.player.y, ship.PHYSICAL_SHIP_WORLD.floorY);
});

const deckSource = await readFile(new URL("../app/game/PhysicalShipDeck.tsx", import.meta.url), "utf8");
const deckAst = ts.createSourceFile("PhysicalShipDeck.tsx", deckSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const guidanceNode = deckAst.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "shipWaypointGuidance");
assert.ok(guidanceNode, "navigation guidance must remain testable");
const guidanceCode = ts.transpileModule(guidanceNode.getText(deckAst), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
const guidance = runInNewContext(guidanceCode + "\nshipWaypointGuidance;", {
  exports: {}, LADDERS: ship.PHYSICAL_SHIP_LADDERS, SHIP_LEVEL_SHAFTS: ship.SHIP_LEVEL_SHAFTS,
  shipRoomAt: ship.shipRoomAt, nearestStationFor: ship.nearestPhysicalShipStation,
});

test("guidance keeps a real shaft direction until the upper and lower exits are reached", () => {
  const run = simulation();
  const navigation = ship.PHYSICAL_SHIP_STATIONS.find((station) => station.id === "galaxy-map");
  const gallery = ship.PHYSICAL_SHIP_STATIONS.find((station) => station.id === "trophy-hall");
  walkTo(run, gallery.x);
  assert.match(guidance(run.player, navigation), /^→.*monter/, "the nearby gallery balcony cannot replace the west shaft");
  walkTo(run, primaryLadders[0].x);
  climbTo(run, 850);
  assert.match(guidance(run.player, navigation), /^↑.*monter/);
  climbTo(run, primaryLadders[0].top);
  climbTo(run, 1210);
  assert.match(guidance(run.player, gallery), /^↓.*descendre/);
});

test("a station beneath the archive mezzanine is not advertised as in interaction range", () => {
  const run = simulation();
  const ladder = ship.PHYSICAL_SHIP_LADDERS.find((entry) => entry.id === "archive-mezzanine");
  const archives = ship.PHYSICAL_SHIP_STATIONS.find((station) => station.id === "clan-archives");
  arriveAtLadderBottom(run, ladder);
  climbTo(run, ladder.top);
  walkTo(run, archives.x);
  assert.equal(ship.nearestPhysicalShipStation(run.player), null);
  assert.doesNotMatch(guidance(run.player, archives), /Station à portée/);
});
