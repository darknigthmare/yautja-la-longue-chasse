import {
  advanceWarTurnV85, createWarSimulationV85, queueWarOrderV85,
  type WarSimulationV85, type WarUpdateV85,
} from "./clanWarV85";
import { planWarConvoyV105, queueWarConvoyLegV105 } from "./clanWarConvoyRouteV105";
import { archiveCanyonPatrolM037, startCanyonPatrolM037 } from "./clanWarM037";
import {
  CONQUEST_ORIGIN_R2_M037 as origin, CONQUEST_PASS_R2_M037 as pass,
  type ConquestStrategyPhaseR2M037, type ConquestViewR2M037,
} from "./warConquestR2M037";

const operations: {
  [Phase in Exclude<ConquestStrategyPhaseR2M037, "brief">]:
    readonly [ConquestStrategyPhaseR2M037, (state: WarSimulationV85) => WarUpdateV85];
} = {
  guard: ["brief", state => queueWarOrderV85(state, {
    kind: "cession", fromId: origin, targetId: pass, combatantIds: ["P07"], cargo: { s: 0, m: 0, i: 0 },
  })],
  held: ["guard", advanceWarTurnV85],
  convoy: ["held", state => planWarConvoyV105(state, {
    territoryIds: [origin, pass], combatantIds: ["P11"], cargo: { s: 0, m: 1, i: 0 },
  })],
  reserved: ["convoy", queueWarConvoyLegV105],
  delivered: ["reserved", advanceWarTurnV85],
};

type Front = { ok: true; simulation: WarSimulationV85 } | { ok: false; message: string };
const fronts = new Map<ConquestStrategyPhaseR2M037, Front>();

function strategy(phase: ConquestStrategyPhaseR2M037): Front {
  const cached = fronts.get(phase);
  if (cached) return cached;
  let front: Front;
  if (phase === "brief") {
    front = { ok: true, simulation: createWarSimulationV85() };
  } else {
    const [previous, act] = operations[phase];
    const before = strategy(previous);
    if (!before.ok) return before;
    const result = act(before.simulation);
    front = result.accepted ? { ok: true, simulation: result.state } : { ok: false, message: result.message };
  }
  // The authored route is deterministic. Neither the menu nor the V85 reducers mutate these position snapshots.
  fronts.set(phase, front);
  return front;
}

/** Runs the authored route through the territory, convoy and field engines without opening an exercise save. */
export function conquestFrontR2M037(view: ConquestViewR2M037) {
  const { phase, patrol: position } = view;
  if (phase !== "field" && phase !== "report" && phase !== "complete") return strategy(phase);
  const front = strategy("delivered");
  if (!front.ok) return front;
  const inspection = startCanyonPatrolM037(front.simulation);
  if (!inspection || !position) {
    return { ok: false as const, message: "Le convoi doit être livré et la garde apte doit tenir le passage." };
  }
  const patrol = { ...inspection, ...position };
  if (phase === "field") return { ...front, patrol };
  const archived = archiveCanyonPatrolM037(front.simulation, patrol);
  return archived.accepted ? { ok: true as const, simulation: archived.state, patrol }
    : { ok: false as const, message: archived.message };
}
