import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";

// Exercise the actual component's event handlers with an in-memory hook scheduler.
// This is component integration coverage, not browser/download or visual proof.
// No campaign, browser storage, injected exercise state or DOM security setting is used.
const hooks = `
let values = [], cursor = 0;
export function resetUiHooksV87() { values = []; cursor = 0; }
export function beginUiRenderV87() { cursor = 0; }
export function inspectExerciseV87() { return values.find(value => value?.state?.context === 'free-workshop')?.state; }
export function useMemo(factory) { const slot = cursor++; values[slot] = factory(); return values[slot]; }
export function useState(initial) {
  const slot = cursor++;
  if (!(slot in values)) values[slot] = typeof initial === 'function' ? initial() : initial;
  return [values[slot], next => { values[slot] = typeof next === 'function' ? next(values[slot]) : next; }];
}
export function useReducer(reducer, argument, initialize) {
  const slot = cursor++;
  if (!(slot in values)) values[slot] = initialize ? initialize(argument) : argument;
  return [values[slot], event => { values[slot] = reducer(values[slot], event); }];
}`;
const bundled = await build({
  stdin: {
    contents: "export {default as Panel} from './app/game/ClanWarWorksV6'; export {DEFAULT_WAR_RULES_V6} from './app/game/systems/clanWarBibleV6'; export * from 'clan-ui-test-hooks-v87';",
    resolveDir: fileURLToPath(new URL("../", import.meta.url)), loader: "tsx",
  },
  jsx: "automatic", bundle: true, write: false, format: "esm", platform: "node", target: "es2022", logLevel: "silent",
  define: { "process.env.NODE_ENV": '"production"' },
  plugins: [{ name: "clan-component-test-hooks", setup(builder) {
    builder.onResolve({ filter: /^(react|clan-ui-test-hooks-v87)$/ }, () => ({ path: "hooks", namespace: "clan-test-hooks" }));
    builder.onLoad({ filter: /.*/, namespace: "clan-test-hooks" }, () => ({ contents: hooks, loader: "js" }));
    builder.onResolve({ filter: /\.module\.css$/ }, () => ({ path: "styles", namespace: "clan-test-css" }));
    builder.onLoad({ filter: /.*/, namespace: "clan-test-css" }, () => ({ contents: "export default new Proxy({}, { get: (_, key) => String(key) });", loader: "js" }));
  } }],
});
const api = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`);
const rules = api.DEFAULT_WAR_RULES_V6;

function allNodes(value) {
  if (Array.isArray(value)) return value.flatMap(allNodes);
  if (!value || typeof value !== "object" || !value.props) return [];
  return [value, ...allNodes(value.props.children)];
}
function textOf(value) {
  if (Array.isArray(value)) return value.map(textOf).join("");
  if (value && typeof value === "object") return textOf(value.props?.children);
  return value == null || typeof value === "boolean" ? "" : String(value);
}
function mount() {
  api.resetUiHooksV87(); let tree, currentRules = rules;
  const render = () => { api.beginUiRenderV87(); tree = api.Panel({ rules: currentRules }); };
  render();
  const nodes = () => allNodes(tree);
  const button = name => nodes().find(node => node.type === "button" && textOf(node) === name);
  const field = label => {
    const owner = nodes().find(node => node.type === "label" && textOf(node) === label);
    return owner && allNodes(owner).find(node => ["textarea", "input"].includes(node.type));
  };
  return {
    button, field,
    state: () => structuredClone(api.inspectExerciseV87()),
    status: () => nodes().filter(node => node.props.role === "status").map(textOf).join("\n"),
    click(name) { const element = button(name); assert(element, `Missing button: ${name}`); assert(!element.props.disabled); element.props.onClick(); render(); },
    fill(label, value) { const element = field(label); assert(element && !element.props.readOnly); element.props.onChange({ target: { value } }); render(); },
    async chooseFile(text) {
      const element = field("Fichier de reprise JSON"); assert.equal(element.props.type, "file"); assert.equal(element.props.accept, "application/json,.json");
      await element.props.onChange({ target: { files: [{ size: Buffer.byteLength(text), text: async () => text }] } }); render();
    },
    exportText() { this.click("Afficher le JSON de reprise"); const element = field("JSON de reprise copiable"); assert(element.props.readOnly); return element.props.value; },
    changeRules(value) { currentRules = value; render(); },
  };
}

test("explicit pasted checkpoint restores played component state only after validation and confirmation; visible export survives editing", () => {
  const ui = mount(); assert.equal(ui.state().turn, 1); assert.equal(ui.state().ravStock, 80);
  assert(!ui.field("JSON de reprise copiable")); assert(!ui.field("JSON de reprise à coller"));
  ui.click(`Reconnaître ici · ${rules.parameters.xp_recon} XP une fois`); ui.click("Écouler un tour sans travaux");
  const played = ui.state(), exported = ui.exportText(); assert.equal(JSON.parse(exported).exercise.turn, played.turn);
  ui.click("Écouler un tour sans travaux"); const later = ui.state(); assert(later.turn > played.turn);
  ui.click("Coller un JSON de reprise"); assert.equal(ui.field("JSON de reprise copiable").props.value, exported);
  ui.fill("JSON de reprise à coller", exported); assert.deepEqual(ui.state(), later); assert(!ui.button("Préparer la reprise sélectionnée"));
  ui.click("Valider le JSON collé"); assert.deepEqual(ui.state(), later); assert.match(ui.status(), /JSON collé compatible/);
  ui.click("Préparer la reprise sélectionnée"); assert.deepEqual(ui.state(), later);
  ui.click("Conserver l’exercice présent"); assert.deepEqual(ui.state(), later);
  ui.click("Préparer la reprise sélectionnée"); ui.click("Confirmer la reprise de l’exercice");
  assert.deepEqual(ui.state(), played); assert.equal(ui.exportText(), exported);
  assert.equal("save" in ui.state(), false); assert.equal("account" in ui.state(), false);
});

test("malformed, executable, foreign-source, forged-stock and campaign text never reach a confirmation or alter the exercise", () => {
  const ui = mount(), before = ui.state(), exported = ui.exportText();
  const foreign = JSON.parse(exported); foreign.exercise.sourceSha = "0".repeat(64);
  const forged = JSON.parse(exported); forged.exercise.lots[0].rav += 1;
  const campaign = JSON.parse(exported); campaign.exercise.save = { campaign: true };
  const attempts = ["{", "globalThis.__clanPasteEvaluatedV87 = true", "null", JSON.stringify({ save: before }), JSON.stringify(foreign), JSON.stringify(forged), JSON.stringify(campaign)];
  for (const value of attempts) {
    ui.click("Coller un JSON de reprise"); ui.fill("JSON de reprise à coller", value); ui.click("Valider le JSON collé");
    assert(!ui.button("Préparer la reprise sélectionnée")); assert(!ui.button("Confirmer la reprise de l’exercice"));
    assert.deepEqual(ui.state(), before); assert.equal(ui.field("JSON de reprise copiable").props.value, exported);
    assert.match(ui.status(), /illisible|incompatible/);
  }
  assert.equal(globalThis.__clanPasteEvaluatedV87, undefined);
});

test("editing a validated draft cancels a pending confirmation and the existing JSON file input still uses the same guard", async () => {
  const ui = mount(), before = ui.state(), exported = ui.exportText();
  ui.click("Coller un JSON de reprise"); ui.fill("JSON de reprise à coller", exported); ui.click("Valider le JSON collé"); ui.click("Préparer la reprise sélectionnée");
  assert(ui.button("Confirmer la reprise de l’exercice")); ui.fill("JSON de reprise à coller", "{}");
  assert(!ui.button("Confirmer la reprise de l’exercice")); assert(!ui.button("Préparer la reprise sélectionnée")); assert.deepEqual(ui.state(), before);
  await ui.chooseFile("{}"); assert(!ui.button("Préparer la reprise sélectionnée")); assert.deepEqual(ui.state(), before);
  await ui.chooseFile(exported); assert(ui.button("Préparer la reprise sélectionnée")); assert(!ui.button("Confirmer la reprise de l’exercice")); assert.deepEqual(ui.state(), before);
});

test("confirmation revalidates against the current workbook instead of trusting a previously accepted pasted snapshot", () => {
  const ui = mount(), before = ui.state(), exported = ui.exportText();
  ui.click("Coller un JSON de reprise"); ui.fill("JSON de reprise à coller", exported); ui.click("Valider le JSON collé"); ui.click("Préparer la reprise sélectionnée");
  const changedRules = structuredClone(rules); changedRules.metadata.sha256 = "0".repeat(64); ui.changeRules(changedRules);
  ui.click("Confirmer la reprise de l’exercice"); assert.deepEqual(ui.state(), before); assert.match(ui.status(), /Reprise incompatible/);
});
