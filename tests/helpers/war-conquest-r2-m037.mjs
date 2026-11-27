import assert from "node:assert/strict";
import { OWNER, SHIP, firstVoyageAdmissionV173, qa } from "./first-interstellar-fixture-v173.mjs";

export function conquestAdmissionR2M037() {
  const { save, fleet, fleetKey } = firstVoyageAdmissionV173({ prepared: true });
  const voyage = qa.load("app/game/systems/firstInterstellarV173.ts");
  const access = voyage.firstInterstellarAccessV173(save, SHIP, true, null);
  const walk = direction => ({ kind: "walk", direction });
  const steer = direction => ({ kind: "steer", direction });
  const moor = (type, fields = {}) => ({ kind: "mooring", action: { type, ...fields } });
  const beacon = { kind: "beacon" };
  const times = (count, command) => Array.from({ length: count }, () => command);
  let state = null;
  function run(...commands) {
    for (const command of commands) {
      const result = voyage.commitFirstInterstellarV173(state, command, access);
      assert.equal(result.accepted, true, result.message);
      state = result.state;
    }
  }
  run({ kind: "plan", route: "direct" }, ...times(4, walk(1)), { kind: "launch" },
    steer(-1), beacon, steer(1), steer(1), beacon, steer(-1), beacon,
    ...times(3, moor("lateral", { direction: -1 })), moor("align"));
  const { flight } = voyage.inspectFirstInterstellarV173(state, OWNER).view;
  run(...times(flight.speed - 1, moor("speed", { direction: -1 })),
    ...times(flight.distance / 10, moor("advance")), moor("lock", { index: 0 }), moor("lock", { index: 1 }),
    ...times(2, moor("ring", { direction: 1 })), moor("berth"),
    ...times(5, walk(1)), ...times(5, walk(-1)));
  assert.ok(voyage.firstInterstellarReceiptV173(save, state));
  return { owned: save, fleet, fleetKey, traveled: { ...save, firstInterstellarV173: state } };
}
