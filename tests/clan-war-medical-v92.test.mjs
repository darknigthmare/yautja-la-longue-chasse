import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";

// Actual model and real component handlers, with a transparent in-memory hook
// scheduler. This is not browser layout or public gameplay verification.
const hooks = `let values=[],cursor=0; export const reset=()=>{values=[];cursor=0}; export const begin=()=>{cursor=0};
export const exercise=()=>values.find(value=>value?.state?.context==='free-workshop')?.state;
export function useMemo(factory){const i=cursor++;values[i]=factory();return values[i]}
export function useState(initial){const i=cursor++;if(!(i in values))values[i]=typeof initial==='function'?initial():initial;return [values[i],next=>{values[i]=typeof next==='function'?next(values[i]):next}]}
export function useReducer(reducer,arg,init){const i=cursor++;if(!(i in values))values[i]=init?init(arg):arg;return [values[i],event=>{values[i]=reducer(values[i],event)}]}`;
const bundled = await build({ stdin: { contents: "export * from './app/game/systems/clanWarWorksV6'; export * from './app/game/systems/clanWarMedicalV92'; export * from './app/game/systems/clanWarBibleV6'; export {default as Panel} from './app/game/ClanWarWorksV6'; export {default as Medical} from './app/game/ClanWarMedicalV92'; export * from 'medical-ui-hooks';", resolveDir: fileURLToPath(new URL("../", import.meta.url)), loader: "tsx" }, jsx: "automatic", bundle: true, write: false, format: "esm", platform: "node", target: "es2022", logLevel: "silent", define: { "process.env.NODE_ENV": '"production"' }, plugins: [{ name: "transparent-medical-hooks", setup(builder) {
  builder.onResolve({ filter: /^(react|medical-ui-hooks)$/ }, () => ({ path: "hooks", namespace: "test-hooks" }));
  builder.onLoad({ filter: /.*/, namespace: "test-hooks" }, () => ({ contents: hooks, loader: "js" }));
  builder.onResolve({ filter: /\.module\.css$/ }, () => ({ path: "styles", namespace: "test-css" }));
  builder.onLoad({ filter: /.*/, namespace: "test-css" }, () => ({ contents: "export default new Proxy({}, {get:(_,key)=>String(key)});", loader: "js" }));
} }] });
const api = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`), rules = api.DEFAULT_WAR_RULES_V6;
const fresh = (unit = "W3-U18") => api.createWarWorksV6(Math.min(400, rules.parameters.rav_cap), unit, rules, "local");
const team = (state, unit) => state.teams.find(group => group.team.unitId === unit);
function act(state, action) {
  const before = structuredClone(state), result = api.applyWarWorksV6(state, action);
  assert.deepEqual(state, before); assert(result.accepted, `${action.kind}: ${result.message}`);
  assert(api.exportWarWorksV87(result.state), `${action.kind}: invalid checkpoint`);
  assert.equal(result.state.ravStock, result.state.startingRav - result.state.accounts.recruitmentReserved - result.state.accounts.kitsReserved
    - result.state.accounts.upkeepConsumed - (result.state.maintenance?.reservedRav ?? 0) - (result.state.medical?.reservedRav ?? 0));
  return result.state;
}
function denied(state, action) { const before = structuredClone(state), result = api.applyWarWorksV6(state, action); assert(!result.accepted, result.message); assert.strictEqual(result.state, state); assert.deepEqual(state, before); }
function travel(state, teamId, destinationId) { state = act(state, { kind: "plan", teamId, destinationId }); while (state.teams.find(group => group.team.id === teamId).route) state = act(state, { kind: "advance", teamId }); return state; }
function buildWork(state, teamId, structureId, site = state.originId) {
  if (state.teams.find(group => group.team.id === teamId).territoryId !== site) state = travel(state, teamId, site);
  state = act(state, { kind: "observe", teamId }); state = act(state, { kind: "reserve-kit", structureId, territoryId: site });
  const workId = state.works.find(work => work.structureId === structureId && work.territoryId === site).id;
  if (site !== state.originId) state = travel(state, teamId, state.originId);
  state = act(state, { kind: "load", teamId, workId });
  if (site !== state.originId) state = travel(state, teamId, site);
  state = act(state, { kind: "unload", teamId, workId });
  const turns = api.warWorksDefinitionsV6().find(def => def.id === structureId).delayTurns;
  for (let n = 0; n < turns; n++) state = act(state, { kind: "work", teamId, workId });
  return { state, workId };
}
function ready({ site = "W3-K01" } = {}) {
  let state = fresh(), medicId = state.teams[0].team.id; const built = buildWork(state, medicId, "W3-S11", site); state = built.state;
  state = act(state, { kind: "recruit", unitId: "W3-U19" }); state = act(state, { kind: "wait" }); state = act(state, { kind: "wait" });
  const ownerId = team(state, "W3-U19").team.id;
  if (site !== state.originId) state = travel(state, ownerId, site);
  const patientId = team(state, "W3-U19").team.members[0].id;
  state = act(state, { kind: "declare-patient", teamId: ownerId, memberId: patientId });
  return { state, workId: built.workId, medicId, patientId, ownerId };
}
function start(scenario, units = 1) {
  let state = act(scenario.state, { kind: "stock-medical", workId: scenario.workId, teamId: scenario.medicId, units });
  state = act(state, { kind: "begin-medical", workId: scenario.workId, teamId: scenario.medicId, memberId: scenario.patientId });
  return state;
}

test("S11/U18 preserve original source costs and require full source, real delivery and three worked turns", () => {
  const def = api.warWorksDefinitionsV6().find(def => def.id === "W3-S11"), unit = rules.units.find(unit => unit.id === "W3-U18");
  assert.deepEqual([def.costRav, def.upkeepRav, def.delayTurns, def.operatorUnitId, def.sourceRow], [14, 2, 3, "W3-U18", 16]);
  assert.deepEqual([unit.fullMembers, unit.commandPoints, unit.recruitmentRav, unit.upkeepRav, unit.delayTurns], [1, 2, 10, 2, 3]);
  assert(api.warMedicalAvailableV92(rules)); assert(def.sourceCells.includes("I16"));
  const missing = structuredClone(rules); missing.entries.find(entry => entry.id === "W3-S11").fields.find(field => field.column === "I").value = "";
  assert(!api.warMedicalAvailableV92(missing)); assert(!api.warWorksDefinitionsV6(missing).some(def => def.id === "W3-S11"));
  let state = fresh(), medicId = state.teams[0].team.id;
  denied(state, { kind: "reserve-kit", structureId: "W3-S11", territoryId: "W3-K01" });
  state = act(state, { kind: "observe", teamId: medicId }); state = act(state, { kind: "reserve-kit", structureId: "W3-S11", territoryId: "W3-K01" });
  const workId = state.works[0].id; denied(state, { kind: "stock-medical", teamId: medicId, workId, units: 1 });
  state = act(state, { kind: "wait" }); assert.equal(state.works[0].workedTurns, 0); assert.equal(state.medical, undefined);
  state = act(state, { kind: "load", teamId: medicId, workId }); state = act(state, { kind: "unload", teamId: medicId, workId });
  for (let n = 0; n < 3; n++) state = act(state, { kind: "work", teamId: medicId, workId }); assert(api.warWorkOccupiedV6(state, state.works[0]));
  const front = api.createWarWorksV6(120, "W3-U18", rules, "front"), observed = act(front, { kind: "observe", teamId: front.teams[0].team.id });
  denied(observed, { kind: "reserve-kit", structureId: "W3-S11", territoryId: "W3-K01" });
});

test("finite local doses debit actual lots once; empty, excess, distant and unoccupied stocks grant no care", () => {
  const scenario = ready(); let state = scenario.state;
  denied(state, { kind: "begin-medical", workId: scenario.workId, teamId: scenario.medicId, memberId: scenario.patientId });
  denied(state, { kind: "stock-medical", workId: scenario.workId, teamId: scenario.medicId, units: 21 });
  const oldStock = state.ravStock, beforeTeams = structuredClone(state.teams);
  state = act(state, { kind: "stock-medical", workId: scenario.workId, teamId: scenario.medicId, units: 3 });
  assert.equal(state.ravStock, oldStock - 3); assert.equal(state.medical.reservedRav, 3); assert.equal(api.warMedicalStockV92(state, scenario.workId), 3); assert.deepEqual(state.teams, beforeTeams);
  assert.equal(state.transfers.at(-1).purpose, "medical"); assert.equal(state.transfers.at(-1).fromId, "rav:v87:depot");
  const remote = ready({ site: "W3-K02" }); assert(remote.state.ravStock > 20);
  denied(remote.state, { kind: "stock-medical", workId: remote.workId, teamId: remote.medicId, units: 1 });
  state = act(state, { kind: "release", teamId: scenario.medicId }); denied(state, { kind: "stock-medical", workId: scenario.workId, teamId: scenario.medicId, units: 1 });
});

test("stabilisation immobilises the actual healer and patient, requires worked turns and retains wound, XP and identity", () => {
  const scenario = ready(); let state = start(scenario), beforeTeams = structuredClone(state.teams), treatmentId = state.medical.treatments[0].id;
  assert.equal(api.warMedicalStockV92(state, scenario.workId), 0); assert(api.warMedicalPatientLockedV92(state, scenario.patientId));
  denied(state, { kind: "release", teamId: scenario.medicId }); denied(state, { kind: "plan", teamId: scenario.medicId, destinationId: "W3-K02" });
  state = act(state, { kind: "recruit", unitId: "W3-U17" }); state = act(state, { kind: "wait" }); state = act(state, { kind: "wait" });
  const porter = team(state, "W3-U17"); denied(state, { kind: "load-patient", teamId: porter.team.id, memberId: scenario.patientId, carrierId: porter.team.members[0].id });
  assert.equal(state.medical.treatments[0].workedTurns.length, 0);
  const beginAgain = api.applyWarWorksV6(state, { kind: "begin-medical", workId: scenario.workId, teamId: scenario.medicId, memberId: scenario.patientId }); assert(!beginAgain.accepted || !beginAgain.changed); assert.strictEqual(beginAgain.state, state);
  state = act(state, { kind: "work-medical", treatmentId, teamId: scenario.medicId }); state = act(state, { kind: "work-medical", treatmentId, teamId: scenario.medicId });
  assert.equal(state.medical.treatments[0].phase, "stabilised"); assert.equal(api.warMedicalStockV92(state, scenario.workId), 0);
  for (const old of beforeTeams) assert.deepEqual(state.teams.find(group => group.team.id === old.team.id).team.members, old.team.members);
  assert.equal(state.extraction.patients[0].arrival, null); assert(!api.warMedicalTeamLockedV92(state, scenario.medicId));
  const repeated = api.applyWarWorksV6(state, { kind: "work-medical", treatmentId, teamId: scenario.medicId }); assert(!repeated.changed); assert.strictEqual(repeated.state, state);
});

test("interruption frees the healer, consumes its already used dose and permits a separately paid new attempt", () => {
  const scenario = ready(); let state = start(scenario), id = state.medical.treatments[0].id, stock = state.ravStock;
  state = act(state, { kind: "cancel-medical", treatmentId: id, teamId: scenario.medicId }); assert.equal(state.ravStock, stock); assert.equal(api.warMedicalStockV92(state, scenario.workId), 0);
  assert(!api.warMedicalTeamLockedV92(state, scenario.medicId)); denied(state, { kind: "begin-medical", workId: scenario.workId, teamId: scenario.medicId, memberId: scenario.patientId });
  state = act(state, { kind: "stock-medical", workId: scenario.workId, teamId: scenario.medicId, units: 1 });
  state = act(state, { kind: "begin-medical", workId: scenario.workId, teamId: scenario.medicId, memberId: scenario.patientId }); assert.equal(state.medical.treatments.length, 2);
  assert.equal(state.medical.reservedRav, 2); assert.equal(team(state, "W3-U19").team.members[0].status, "wounded");
});

test("a delivered remote RAV lot really stocks S11 at its cache; the rich origin cannot replace a depleted local budget", () => {
  let state = fresh(), medicId = state.teams[0].team.id;
  const medical = buildWork(state, medicId, "W3-S11", "W3-K02"); state = medical.state;
  state = act(state, { kind: "recruit", unitId: "W3-U19" }); state = act(state, { kind: "wait" }); state = act(state, { kind: "wait" });
  const porterId = team(state, "W3-U19").team.id, cache = buildWork(state, porterId, "W3-S03", "W3-K02"); state = cache.state;
  state = act(state, { kind: "release", teamId: porterId }); state = travel(state, porterId, state.originId);
  state = act(state, { kind: "load-rav", teamId: porterId, rav: 20 }); state = travel(state, porterId, "W3-K02");
  state = act(state, { kind: "deposit-rav", teamId: porterId, workId: cache.workId });
  const cacheBefore = api.warWorksCacheRavV87(state, cache.workId), depotBefore = api.warWorksDepotV87(state);
  state = act(state, { kind: "stock-medical", workId: medical.workId, teamId: medicId, units: 1 });
  assert.equal(api.warWorksCacheRavV87(state, cache.workId), cacheBefore - 1); assert.equal(api.warWorksDepotV87(state), depotBefore);
  assert.equal(state.transfers.at(-1).fromId, `rav:cache:${cache.workId}`);
  const patientId = team(state, "W3-U19").team.members[0].id;
  state = act(state, { kind: "declare-patient", teamId: porterId, memberId: patientId });
  state = act(state, { kind: "begin-medical", workId: medical.workId, teamId: medicId, memberId: patientId });
  while (api.warWorksCacheRavV87(state, cache.workId) > 0) state = act(state, { kind: "wait" });
  assert(api.warWorksDepotV87(state) > 0); denied(state, { kind: "work-medical", treatmentId: state.medical.treatments[0].id, teamId: medicId });
  assert.equal(state.medical.treatments[0].workedTurns.length, 0); assert.equal(state.medical.treatments[0].phase, "treating");
});

test("a stabilised person can physically enter S16 without being healed or counted twice", () => {
  const scenario = ready(); let state = start(scenario), treatmentId = state.medical.treatments[0].id;
  state = act(state, { kind: "work-medical", treatmentId, teamId: scenario.medicId }); state = act(state, { kind: "work-medical", treatmentId, teamId: scenario.medicId });
  state = act(state, { kind: "recruit", unitId: "W3-U17" }); state = act(state, { kind: "wait" }); state = act(state, { kind: "wait" });
  const porter = team(state, "W3-U17"), depot = buildWork(state, porter.team.id, "W3-S16"); state = depot.state;
  state = act(state, { kind: "release", teamId: porter.team.id });
  const before = structuredClone(state.teams.map(group => group.team.members));
  state = act(state, { kind: "load-patient", teamId: porter.team.id, memberId: scenario.patientId, carrierId: porter.team.members[0].id });
  state = act(state, { kind: "return-patient", teamId: porter.team.id, memberId: scenario.patientId, workId: depot.workId });
  assert.equal(state.extraction.patients[0].arrival.workId, depot.workId); assert.equal(state.medical.treatments[0].phase, "stabilised");
  assert.deepEqual(state.teams.map(group => group.team.members), before);
  const duplicate = api.applyWarWorksV6(state, { kind: "return-patient", teamId: porter.team.id, memberId: scenario.patientId, workId: depot.workId }); assert(!duplicate.changed); assert.strictEqual(duplicate.state, state);
});

test("strict import retains genuine care but rejects future versions, copied identities, missing dose receipts and fabricated healing", () => {
  const scenario = ready(); const state = start(scenario), text = api.exportWarWorksV87(state); assert.deepEqual(api.importWarWorksV87(text).state, state);
  const modifications = [s => { s.medical.version = 2; }, s => { s.medical.deliveries[0].units = 2; }, s => { s.medical.treatments[0].id = s.medical.deliveries[0].id; },
    s => { s.medical.treatments[0].phase = "stabilised"; }, s => { team(s, "W3-U19").team.members[0].status = "fit"; }, s => { s.extraction.patients[0].territoryId = "W3-K02"; },
    s => { s.medical.treatments[0].startedTurn = 1; }, s => { s.medical.rulesKey += "copied"; }, s => { s.transfers.find(tx => tx.purpose === "medical").purpose = "upkeep"; }];
  for (const change of modifications) { const file = JSON.parse(text); change(file.exercise); assert.equal(api.importWarWorksV87(JSON.stringify(file)).state, null); }
  const legacy = api.createWarWorksV6(120, "W3-U17", rules, "local"), legacyText = api.exportWarWorksV87(legacy), resumed = api.importWarWorksV87(legacyText).state;
  assert.deepEqual(resumed, legacy); assert.equal(resumed.medical, undefined); assert.equal(resumed.infrastructure, undefined);
});

const nodes = value => Array.isArray(value) ? value.flatMap(nodes) : value?.props ? [value, ...nodes(value.type === api.Medical ? api.Medical(value.props) : value.props.children)] : [];
const textOf = value => Array.isArray(value) ? value.map(textOf).join("") : value?.props ? textOf(value.type === api.Medical ? api.Medical(value.props) : value.props.children) : value == null || typeof value === "boolean" ? "" : String(value);
test("the actual workshop consumer constructs S11 and its real child handlers pay, work and display unchanged unfit patients", () => {
  api.reset(); let tree; const render = () => { api.begin(); tree = api.Panel({ rules }); }; render();
  const click = label => { const button = nodes(tree).find(node => node.type === "button" && textOf(node) === label); assert(button, `Missing ${label}`); assert(!button.props.disabled, label); button.props.onClick(); render(); };
  const fill = (label, value) => { const owner = nodes(tree).find(node => node.type === "label" && textOf(node).startsWith(label)); assert(owner); const field = nodes(owner).find(node => ["select", "input"].includes(node.type)); field.props.onChange({ target: { value } }); render(); };
  fill("Équipe équipée au départ", "W3-U18"); fill("Budget choisi · RAV", "120"); click("Préparer un nouvel exercice"); click("Confirmer le nouveau départ");
  click("Reconnaître ici · 4 XP une fois"); fill("Ouvrage", "W3-S11"); fill("Site du chantier", "W3-K01"); click("Réserver le kit au départ"); click("Charger avec l’équipe choisie"); click("Livrer avec le vrai porteur");
  for (let n = 0; n < 3; n++) click("Accomplir un tour de travaux");
  fill("Profil d’opérateur", "W3-U19"); click("Réserver une formation volontaire"); click("Écouler un tour sans travaux"); click("Écouler un tour sans travaux");
  const medic = team(api.exercise(), "W3-U18").team.id, owner = team(api.exercise(), "W3-U19").team.id, patient = team(api.exercise(), "W3-U19").team.members[0].id;
  fill("Équipe à commander", owner); click(`Déclarer blessé d’exercice · ${patient}`); fill("Équipe à commander", medic);
  click("Préparer 1 consommable(s) · 1 RAV locaux"); click("Commencer la stabilisation · 1 consommable"); assert(textOf(tree).includes("Soin travaillé : 0/2 tours."));
  click("Accomplir un tour de soin"); click("Accomplir un tour de soin"); assert(textOf(tree).includes("Stabilisation terminée."));
  assert.equal(team(api.exercise(), "W3-U19").team.members[0].status, "wounded"); click("Afficher le JSON de reprise");
  const checkpoint = nodes(tree).find(node => node.type === "textarea" && node.props.readOnly); assert(checkpoint); assert(api.importWarWorksV87(checkpoint.props.value).state);
});
