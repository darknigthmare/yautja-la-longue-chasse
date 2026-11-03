import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { api as model, hoistScenarioV90, repairStartedV90 } from "./helpers/clan-hoist-scenario-v90.mjs";

// Actual JSX and handlers with transparent in-memory hooks. These tests do not
// constitute browser layout, animated 2D scene, download or human QA evidence.
const hooks = `let values=[],cursor=0;
export const reset=()=>{values=[];cursor=0}; export const begin=()=>{cursor=0};
export const exercise=()=>values.find(value=>value?.state?.context==='free-workshop')?.state;
export function useMemo(factory){const slot=cursor++;values[slot]=factory();return values[slot]}
export function useState(initial){const slot=cursor++;if(!(slot in values))values[slot]=typeof initial==='function'?initial():initial;return [values[slot],next=>{values[slot]=typeof next==='function'?next(values[slot]):next}]}
export function useReducer(reducer,arg,initialize){const slot=cursor++;if(!(slot in values))values[slot]=initialize?initialize(arg):arg;return [values[slot],event=>{values[slot]=reducer(values[slot],event)}]}`;
const bundle = await build({ stdin: { contents: "export {default as Panel} from './app/game/ClanWarWorksV6'; export {DEFAULT_WAR_RULES_V6 as rules} from './app/game/systems/clanWarBibleV6'; export * from 'chain-ui-hooks';", resolveDir: fileURLToPath(new URL("../", import.meta.url)), loader: "tsx" }, jsx: "automatic", bundle: true, write: false, format: "esm", platform: "node", target: "es2022", logLevel: "silent", define: { "process.env.NODE_ENV": '"production"' }, plugins: [{ name: "chain-ui-hooks", setup(builder) {
  builder.onResolve({ filter: /^(react|chain-ui-hooks)$/ }, () => ({ path: "hooks", namespace: "chain-test-hooks" }));
  builder.onLoad({ filter: /.*/, namespace: "chain-test-hooks" }, () => ({ contents: hooks, loader: "js" }));
  builder.onResolve({ filter: /\.module\.css$/ }, () => ({ path: "css", namespace: "chain-test-css" }));
  builder.onLoad({ filter: /.*/, namespace: "chain-test-css" }, () => ({ contents: "export default new Proxy({}, {get:(_,key)=>String(key)});", loader: "js" }));
} }] });
const uiApi = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
const nodes = value => Array.isArray(value) ? value.flatMap(nodes) : value?.props ? [value, ...nodes(value.props.children)] : [];
const textOf = value => Array.isArray(value) ? value.map(textOf).join("") : value?.props ? textOf(value.props.children) : value == null || typeof value === "boolean" ? "" : String(value);
function mount() {
  uiApi.reset(); let tree;
  const render = () => { uiApi.begin(); tree = uiApi.Panel({ rules: uiApi.rules }); }; render();
  return {
    state: () => structuredClone(uiApi.exercise()), nodes: () => nodes(tree), text: () => textOf(tree),
    click(label, workId) { const scope = workId ? nodes(tree).find(node => node.props["data-work-id"] === workId) : tree; assert(scope);
      const button = nodes(scope).find(node => node.type === "button" && textOf(node) === label); assert(button, `Missing ${label}`); assert(!button.props.disabled); button.props.onClick(); render(); },
    fill(label, value) { const owner = nodes(tree).find(node => node.type === "label" && textOf(node).startsWith(label)); assert(owner); const field = nodes(owner).find(node => ["input", "select", "textarea"].includes(node.type)); assert(field && !field.props.readOnly); field.props.onChange({ target: { value } }); render(); },
    check(label, checked) { const owner = nodes(tree).find(node => node.type === "label" && textOf(node).startsWith(label)); assert(owner); const field = nodes(owner).find(node => node.props.type === "checkbox"); assert(field); field.props.onChange({ target: { checked } }); render(); },
    restore(state) { this.click("Coller un JSON de reprise"); this.fill("JSON de reprise à coller", model.exportWarWorksV87(state)); this.click("Valider le JSON collé"); this.click("Préparer la reprise sélectionnée"); this.click("Confirmer la reprise de l’exercice"); assert.deepEqual(this.state(), state); },
  };
}

test("regional checkbox initializes an explicit isolated finite depot only after replacement confirmation", () => {
  const ui = mount(), original = ui.state();
  ui.fill("Équipe équipée au départ", "W3-U20"); ui.fill("Budget choisi · RAV", "120"); ui.check("Départ régional KR05 à Cour des Pièces", true);
  assert.deepEqual(ui.state(), original); ui.click("Préparer un nouvel exercice"); assert.deepEqual(ui.state(), original);
  ui.click("Confirmer le nouveau départ"); assert.equal(ui.state().originId, "W3-K25"); assert.equal(ui.state().ravStock, 120);
  assert.equal(ui.state().turn, 1); assert.match(ui.text(), /Ce setup de simulation n’est pas un voyage/); assert.equal("campaign" in ui.state(), false);
});

test("actual panel opens a fault on the remaining third lift and exposes source costs and a consigned diagram", () => {
  const scenario = hoistScenarioV90(), ui = mount(); ui.restore(scenario.beforeFault);
  const kit = scenario.beforeFault.works.find(work => work.id === scenario.kitIds[2]);
  ui.click(`Lever ${kit.kitId} vers W3-K19`, scenario.hoistId);
  assert.deepEqual(ui.state(), scenario.state); assert(ui.nodes().some(node => node.props["data-chain-event"] === scenario.eventId));
  assert(ui.nodes().some(node => node.props["data-hoist-service"] === "blocked")); assert.match(ui.text(), /Chaîne fissurée/);
  assert.match(ui.text(), /W5-EV25 C30:M30/); assert.match(ui.text(), /Six RAV locaux/); assert.match(ui.text(), /Deux RAV locaux/);
  assert(!ui.nodes().some(node => node.type === "button" && textOf(node).startsWith("Lever ")));
});

test("actual panel resumes a consigned repair; waiting does not work, two buttons consume exactly one section", () => {
  const scenario = repairStartedV90(), ui = mount(); ui.restore(scenario.state);
  const identities = structuredClone(ui.state().teams[0].team), reservedRav = ui.state().maintenance.reservedRav;
  ui.click("Écouler un tour sans travaux"); assert.equal(ui.state().maintenance.faults[0].repair.workedTurns.length, 0);
  ui.click("Accomplir un tour réel de réparation · 0/2", scenario.hoistId); assert.equal(ui.state().maintenance.faults[0].phase, "repairing");
  ui.click("Accomplir un tour réel de réparation · 1/2", scenario.hoistId); const state = ui.state();
  assert.equal(state.maintenance.faults[0].phase, "repaired"); assert.equal(state.maintenance.faults[0].section.consumedTurn, state.turn);
  assert.equal(state.maintenance.reservedRav, reservedRav); assert.deepEqual(state.teams[0].team, identities);
  assert.match(ui.text(), /Consommée une fois au tour/); assert(ui.nodes().some(node => node.props["data-hoist-service"] === "available"));
});
