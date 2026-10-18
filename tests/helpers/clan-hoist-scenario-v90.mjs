import assert from "node:assert/strict";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";

const bundle = await build({ stdin: { contents: "export * from './app/game/systems/clanWarWorksV6'; export * from './app/game/systems/clanWarBibleV6';", resolveDir: fileURLToPath(new URL("../../", import.meta.url)) }, bundle: true, write: false, format: "esm", platform: "node", target: "es2022", logLevel: "silent" });
export const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
export const rules = api.DEFAULT_WAR_RULES_V6;
export function act(state, action, context = rules) {
  const before = structuredClone(state), result = api.applyWarWorksV6(state, action, context);
  assert.deepEqual(state, before, "Every order preserves its input snapshot");
  assert(result.accepted, `${action.kind}: ${result.message}`);
  assert.equal(result.state.ravStock, result.state.lots.reduce((sum, lot) => sum + lot.rav, 0));
  assert.equal(result.state.ravStock, result.state.startingRav - result.state.accounts.recruitmentReserved - result.state.accounts.kitsReserved - result.state.accounts.upkeepConsumed - (result.state.maintenance?.reservedRav ?? 0));
  assert(api.exportWarWorksV87(result.state, context), `${action.kind}: each transition must remain a valid checkpoint`);
  return result.state;
}
export function denied(state, action, context = rules) {
  const before = structuredClone(state), result = api.applyWarWorksV6(state, action, context);
  assert(!result.accepted, result.message); assert(!result.changed); assert.strictEqual(result.state, state); assert.deepEqual(state, before);
}
export function travel(state, teamId, destinationId) {
  state = act(state, { kind: "plan", teamId, destinationId });
  let safety = 0;
  while (state.teams.find(group => group.team.id === teamId).route) {
    assert(safety++ < 36); state = act(state, { kind: "advance", teamId });
  }
  assert.equal(state.teams.find(group => group.team.id === teamId).territoryId, destinationId); return state;
}
function install(state, teamId, structureId, passageId) {
  state = act(state, { kind: "reserve-kit", structureId, territoryId: "W3-K25", passageId }); const workId = state.works.at(-1).id;
  state = act(state, { kind: "load", workId, teamId }); state = act(state, { kind: "unload", workId, teamId });
  for (let n = 0; n < api.warWorksDefinitionsV6().find(def => def.id === structureId).delayTurns; n++) state = act(state, { kind: "work", workId, teamId });
  return { state, workId };
}
/** Synthetic, explicit regional start; everything following it is actually
 * reduced by public game actions with the unmodified V6 120-RAV rules. */
export function hoistScenarioV90({ railsRecon = false } = {}) {
  let state = api.createWarWorksRegionalV90(120, "W3-U20"), teamId = state.teams[0].team.id;
  state = act(state, { kind: "observe", teamId }); state = travel(state, teamId, "W3-K19");
  state = act(state, { kind: "observe", teamId }); state = travel(state, teamId, "W3-K25");
  if (railsRecon) {
    state = travel(state, teamId, "W3-K26"); state = act(state, { kind: "observe", teamId });
    state = travel(state, teamId, "W3-K27"); state = act(state, { kind: "observe", teamId }); state = travel(state, teamId, "W3-K25");
  }
  const hoist = install(state, teamId, "W3-S17", "W3-L49"); state = hoist.state;
  state = act(state, { kind: "enable-hoist-wear", workId: hoist.workId });
  state = act(state, { kind: "release", teamId });
  const workshop = install(state, teamId, "W3-S04"); state = workshop.state;
  state = act(state, { kind: "release", teamId }); state = act(state, { kind: "assign", workId: hoist.workId, teamId });
  const kits = [];
  for (const structureId of ["W3-S05", "W3-S02", "W3-S07"]) {
    state = act(state, { kind: "reserve-kit", structureId, territoryId: "W3-K25", passageId: "W3-L49" }); kits.push(state.works.at(-1).id);
  }
  for (const kitWorkId of kits.slice(0, 2)) state = act(state, { kind: "lift-kit", teamId, workId: hoist.workId, kitWorkId });
  const beforeFault = state;
  state = act(state, { kind: "lift-kit", teamId, workId: hoist.workId, kitWorkId: kits[2] });
  return { state, beforeFault, teamId, hoistId: hoist.workId, workshopId: workshop.workId, kitIds: kits, eventId: state.maintenance.faults[0].id };
}
export function sectionReservedV90() {
  const scenario = hoistScenarioV90(); let state = act(scenario.state, { kind: "release", teamId: scenario.teamId });
  state = act(state, { kind: "assign", workId: scenario.workshopId, teamId: scenario.teamId });
  state = act(state, { kind: "reserve-chain-section", eventId: scenario.eventId, workshopWorkId: scenario.workshopId, teamId: scenario.teamId });
  return { ...scenario, state };
}
export function repairStartedV90({ excursion = false } = {}) {
  const scenario = sectionReservedV90(); let state = act(scenario.state, { kind: "release", teamId: scenario.teamId });
  state = act(state, { kind: "load-chain-section", eventId: scenario.eventId, teamId: scenario.teamId });
  const carried = state;
  if (excursion) { state = travel(state, scenario.teamId, "W3-K26"); state = travel(state, scenario.teamId, "W3-K25"); }
  state = act(state, { kind: "unload-chain-section", eventId: scenario.eventId, teamId: scenario.teamId });
  state = act(state, { kind: "begin-chain-repair", eventId: scenario.eventId, teamId: scenario.teamId });
  return { ...scenario, state, carried };
}
