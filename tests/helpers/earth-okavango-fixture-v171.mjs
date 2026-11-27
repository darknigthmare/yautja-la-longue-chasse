import assert from "node:assert/strict";
import { firstVoyageAdmissionV173, OWNER, qa, SHIP, saves } from "./first-interstellar-fixture-v173.mjs";

export { OWNER, qa, SHIP, saves };
const voyage = qa.load("app/game/systems/firstInterstellarV173.ts");

export function okavangoAdmissionV171({ returned = true } = {}) {
  const fixture = firstVoyageAdmissionV173({ prepared: true });
  if (!returned) return fixture;
  const access = voyage.firstInterstellarAccessV173(fixture.save, SHIP, true, null);
  assert.equal(access.allowed, true);
  let state = null;
  function play(...orders) {
    for (const order of orders) {
      const result = voyage.commitFirstInterstellarV173(state, order, access);
      assert(result.accepted, result.message);
      state = result.state;
    }
  }
  const walk = direction => ({ kind: "walk", direction });
  const steer = direction => ({ kind: "steer", direction });
  const mooring = action => ({ kind: "mooring", action });
  const times = (n, order) => Array.from({ length: n }, () => order);
  const beacon = { kind: "beacon" };
  play({ kind: "plan", route: "direct" }, ...times(4, walk(1)), { kind: "launch" },
    steer(-1), beacon, steer(1), steer(1), beacon, steer(-1), beacon,
    ...times(3, mooring({ type: "lateral", direction: -1 })), mooring({ type: "align" }));
  const { flight } = voyage.inspectFirstInterstellarV173(state, OWNER).view;
  play(...times(flight.speed - 1, mooring({ type: "speed", direction: -1 })),
    ...times(flight.distance / 10, mooring({ type: "advance" })),
    mooring({ type: "lock", index: 0 }), mooring({ type: "lock", index: 1 }),
    ...times(2, mooring({ type: "ring", direction: 1 })), mooring({ type: "berth" }),
    ...times(5, walk(1)), ...times(5, walk(-1)));
  assert.equal(voyage.firstInterstellarReceiptV173(fixture.save, state)?.firstInterstellarComplete, true);
  return { ...fixture, save: { ...fixture.save, firstInterstellarV173: state } };
}
