import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";

const bundle = await build({ stdin: { contents: 'export * from "./app/game/systems/pitGamepadAssignments";', loader: "ts", resolveDir: process.cwd() }, bundle: true, write: false, platform: "node", format: "esm" });
const { createPitGamepadAssignments, resolvePitGamepadAssignments: resolve, disconnectPitGamepadAssignment: disconnect } = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));
const pad = (id, index, connected = true) => ({ id, index, connected, axes: [0, 0], buttons: [{ pressed: false }] });

test("a lone controller in any browser slot keeps J1 from menu to live fight", () => {
  for (let slot = 0; slot < 4; slot++) {
    const device = pad("first", slot), browserPads = Array(4).fill(null);
    browserPads[slot] = device;
    const menu = resolve(createPitGamepadAssignments(), browserPads);
    assert.strictEqual(menu.pads[0], device);
    assert.equal(menu.pads[1], null);
    const combat = resolve(menu.assignments, browserPads);
    assert.strictEqual(combat.pads[0], device);
    assert.deepEqual(combat.assignments, menu.assignments);
  }
});

test("two sparse controllers have stable roles and J2 never substitutes for lost J1", () => {
  const first = pad("first", 1), second = pad("second", 3);
  const ready = resolve(createPitGamepadAssignments(), [null, first, null, second]);
  assert.deepEqual(ready.pads, [first, second]);
  const snapshot = JSON.stringify(ready.assignments);
  const lost = resolve(ready.assignments, [null, null, null, second]);
  assert.deepEqual(lost.pads, [null, second]);
  assert.equal(lost.assignments[0].slot, 1);
  assert.equal(lost.assignments[0].revision, ready.assignments[0].revision + 1);
  assert.equal(lost.assignments[1].revision, ready.assignments[1].revision);
  assert.equal(JSON.stringify(ready.assignments), snapshot, "the resolver must not mutate the previous sample");
  const repeated = resolve(lost.assignments, [null, null, null, second]);
  assert.deepEqual(repeated.assignments, lost.assignments, "remaining offline must not create repeated reconnections");
  const reconnected = resolve(lost.assignments, [null, first, null, second]);
  assert.deepEqual(reconnected.pads, [first, second]);
  assert.equal(reconnected.assignments[0].revision, lost.assignments[0].revision + 1, "the runtime must rearm neutral input after reconnecting");
});

test("a disconnected flag, a reused slot and a new extra controller cannot steal reserved roles", () => {
  const first = pad("first", 0), second = pad("second", 1), extra = pad("third", 2);
  const ready = resolve(createPitGamepadAssignments(), [first, second]);
  for (const absent of [null, undefined, pad("first", 0, false), pad("replacement", 0)]) {
    const result = resolve(ready.assignments, [absent, second, extra]);
    assert.deepEqual(result.pads, [null, second]);
    assert.equal(result.assignments[0].id, "first");
  }
});

test("only never-assigned roles accept hot-plug devices; explicit return to selection starts new roles", () => {
  const first = pad("first", 2), second = pad("second", 0);
  const initial = resolve(createPitGamepadAssignments(), [null, null, first]);
  const joined = resolve(initial.assignments, [second, null, first]);
  assert.deepEqual(joined.pads, [first, second], "lower browser slot does not displace J1");
  const lost = resolve(joined.assignments, [second]);
  assert.deepEqual(lost.pads, [null, second]);
  assert.deepEqual(resolve(createPitGamepadAssignments(), [second]).pads, [second, null]);
});

test("identical model IDs stay distinct by browser slot and neither role consumes the other", () => {
  const first = pad("same-model", 0), second = pad("same-model", 2);
  const ready = resolve(createPitGamepadAssignments(), [first, null, second]);
  assert.deepEqual(resolve(ready.assignments, [null, null, second]).pads, [null, second]);
  assert.deepEqual(resolve(ready.assignments, [first]).pads, [first, null]);
});

test("a real disconnect callback observed between simulation samples still forces rearming", () => {
  const first = pad("first", 0), second = pad("second", 1);
  const ready = resolve(createPitGamepadAssignments(), [first, second]);
  const eventState = disconnect(ready.assignments, 0, "first");
  assert.equal(eventState[0].connected, false);
  assert.deepEqual(eventState[1], ready.assignments[1]);
  const reconnected = resolve(eventState, [first, second]);
  assert.equal(reconnected.assignments[0].revision, ready.assignments[0].revision + 2);
  assert.deepEqual(disconnect(ready.assignments, 0, "unrelated"), ready.assignments);
  assert.deepEqual(disconnect(eventState, 0, "first"), eventState);
});

test("empty/disconnected arrays and legacy virtual-pad fixtures remain inert or assignable", () => {
  const empty = createPitGamepadAssignments();
  assert.deepEqual(resolve(empty, []).pads, [null, null]);
  assert.deepEqual(resolve(empty, [pad("off", 0, false)]).assignments, empty);
  const legacy = { axes: [0, 0], buttons: [] };
  assert.strictEqual(resolve(empty, [null, legacy]).pads[0], legacy);
});
