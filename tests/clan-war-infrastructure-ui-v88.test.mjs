import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";

// Actual panel handlers, with a transparent in-memory hook scheduler. This
// covers UI dispatch/state wiring, not browser layout, CUA or production proof.
const hooks = `let values=[],cursor=0;
export const reset=()=>{values=[];cursor=0}; export const begin=()=>{cursor=0};
export const exercise=()=>values.find(value=>value?.state?.context==='free-workshop')?.state;
export function useMemo(factory){const slot=cursor++;values[slot]=factory();return values[slot]}
export function useState(initial){const slot=cursor++;if(!(slot in values))values[slot]=typeof initial==='function'?initial():initial;return [values[slot],next=>{values[slot]=typeof next==='function'?next(values[slot]):next}]}
export function useReducer(reducer,arg,initialize){const slot=cursor++;if(!(slot in values))values[slot]=initialize?initialize(arg):arg;return [values[slot],event=>{values[slot]=reducer(values[slot],event)}]}`;
const bundled = await build({ stdin: { contents: "export {default as Panel} from './app/game/ClanWarWorksV6'; export {DEFAULT_WAR_RULES_V6 as rules} from './app/game/systems/clanWarBibleV6'; export * from 'infrastructure-ui-hooks';", resolveDir: fileURLToPath(new URL("../", import.meta.url)), loader: "tsx" }, jsx: "automatic", bundle: true, write: false, format: "esm", platform: "node", target: "es2022", logLevel: "silent", define: { "process.env.NODE_ENV": '"production"' }, plugins: [{ name: "transparent-infrastructure-hooks", setup(builder) {
  builder.onResolve({ filter: /^(react|infrastructure-ui-hooks)$/ }, () => ({ path: "hooks", namespace: "test-hooks" }));
  builder.onLoad({ filter: /.*/, namespace: "test-hooks" }, () => ({ contents: hooks, loader: "js" }));
  builder.onResolve({ filter: /\.module\.css$/ }, () => ({ path: "styles", namespace: "test-css" }));
  builder.onLoad({ filter: /.*/, namespace: "test-css" }, () => ({ contents: "export default new Proxy({}, {get:(_,key)=>String(key)});", loader: "js" }));
} }] });
const api = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`);
const nodes = value => Array.isArray(value) ? value.flatMap(nodes) : value?.props ? [value, ...nodes(value.props.children)] : [];
const textOf = value => Array.isArray(value) ? value.map(textOf).join("") : value?.props ? textOf(value.props.children) : value == null || typeof value === "boolean" ? "" : String(value);
function mount(unit) {
  api.reset(); let tree;
  const render = () => { api.begin(); tree = api.Panel({ rules: api.rules }); };
  render();
  const ui = {
    state: () => structuredClone(api.exercise()), text: () => textOf(tree), nodes: () => nodes(tree),
    click(label) { const button = nodes(tree).find(node => node.type === "button" && textOf(node) === label); assert(button, `Missing button: ${label}`); assert(!button.props.disabled); button.props.onClick(); render(); },
    fill(label, value) { const owner = nodes(tree).find(node => node.type === "label" && textOf(node).startsWith(label)); assert(owner, `Missing label: ${label}`); const field = nodes(owner).find(node => ["select", "input", "textarea"].includes(node.type)); assert(field && !field.props.readOnly); field.props.onChange({ target: { value } }); render(); },
    close(passageId, checked) { const label = nodes(tree).find(node => node.type === "label" && textOf(node).startsWith(`${passageId} · `)); const checkbox = nodes(label).find(node => node.props.type === "checkbox"); assert(checkbox); checkbox.props.onChange({ target: { checked } }); render(); },
    travel(teamId, destinationId) { this.fill("Équipe à commander", teamId); this.fill("Destination de cette équipe", destinationId); this.click(`Préparer le trajet${this.state().teams.find(item => item.team.id === teamId).payloadWorkId ? " du kit" : ""}`); while (this.state().teams.find(item => item.team.id === teamId).route) this.click("Exécuter un passage"); },
    reserve(id, site, passageId) { this.fill("Ouvrage", id); this.fill("Site du chantier", site); if (passageId) this.fill("Passage précis de l’ouvrage", passageId); this.click("Réserver le kit au départ"); },
    observe() { this.click("Reconnaître ici · 4 XP une fois"); },
    export() { this.click("Afficher le JSON de reprise"); const owner = nodes(tree).find(node => node.type === "label" && textOf(node).startsWith("JSON de reprise copiable")); const field = nodes(owner).find(node => node.type === "textarea"); assert(field.props.readOnly); return field.props.value; },
  };
  ui.fill("Équipe équipée au départ", unit); ui.fill("Budget choisi · RAV", "120"); ui.click("Préparer un nouvel exercice"); ui.click("Confirmer le nouveau départ");
  return ui;
}

test("actual UI builds S12, traverses its link and displays original dates after a controlled, idempotent transmission", () => {
  const ui = mount("W3-U28"), sender = ui.state().teams[0].team.id;
  ui.observe(); ui.reserve("W3-S12", "W3-K01", "W3-L01"); const workId = ui.state().works[0].id;
  ui.travel(sender, "W3-K02"); ui.observe(); ui.travel(sender, "W3-K01");
  ui.click("Charger avec l’équipe choisie"); ui.click("Livrer avec le vrai porteur"); ui.click("Accomplir un tour de travaux"); ui.click("Accomplir un tour de travaux");
  ui.fill("Profil d’opérateur", "W3-U19"); ui.click("Réserver une formation volontaire"); ui.click("Écouler un tour sans travaux"); ui.click("Écouler un tour sans travaux");
  const recipient = ui.state().teams.find(item => item.team.unitId === "W3-U19").team.id; ui.travel(recipient, "W3-K02"); ui.fill("Équipe à commander", sender);
  const before = ui.state(); ui.close("W3-L01", true); ui.click(`Transmettre les relevés à ${recipient}`);
  assert.equal(ui.state().turn, before.turn); assert.equal(ui.state().ravStock, before.ravStock); assert.equal(ui.state().infrastructure.relayReceipts.length, 0);
  ui.close("W3-L01", false); ui.click(`Transmettre les relevés à ${recipient}`); assert.equal(ui.state().turn, 11); assert.equal(ui.state().ravStock, 82);
  assert(ui.nodes().some(node => node.props["data-relay-receipt"])); assert.match(ui.text(), /observé au tour 2/); assert.match(ui.text(), /âge actuel 9 tour/);
  assert.match(ui.text(), /observé au tour 4/); assert.match(ui.text(), /Situation cachée depuis : inconnue/); assert.equal(ui.state().infrastructure.relayReceipts[0].relayWorkId, workId);
  const delivered = ui.state(); ui.click(`Transmettre les relevés à ${recipient}`); assert.deepEqual(ui.state(), delivered);
  const exported = ui.export(); ui.click("Écouler un tour sans travaux"); ui.click("Coller un JSON de reprise"); ui.fill("JSON de reprise à coller", exported);
  ui.click("Valider le JSON collé"); ui.click("Préparer la reprise sélectionnée"); ui.click("Confirmer la reprise de l’exercice"); assert.deepEqual(ui.state(), delivered);
});

test("actual UI lifts the identified kit alone, shows its true site, and rejects a closed link without time or cost", () => {
  const ui = mount("W3-U20"), artisan = ui.state().teams[0].team.id;
  ui.observe(); ui.travel(artisan, "W3-K07"); ui.observe(); ui.travel(artisan, "W3-K01");
  ui.reserve("W3-S17", "W3-K01", "W3-L31"); ui.click("Charger avec l’équipe choisie"); ui.click("Livrer avec le vrai porteur");
  for (let n = 0; n < 3; n++) ui.click("Accomplir un tour de travaux");
  ui.reserve("W3-S02", "W3-K07"); const kit = ui.state().works.at(-1), label = `Lever ${kit.kitId} vers W3-K07`;
  const before = ui.state(); ui.close("W3-L31", true); ui.click(label); assert.equal(ui.state().turn, before.turn); assert.equal(ui.state().ravStock, before.ravStock);
  ui.close("W3-L31", false); ui.click(label); assert.equal(ui.state().turn, 9); assert.equal(ui.state().ravStock, 82);
  assert.match(ui.text(), /Kit déposé à W3-K07/); assert.match(ui.text(), /Emplacement réel du kit : W3-K07/); assert(ui.nodes().some(node => node.props["data-kit-lift"]));
  assert.equal(ui.state().teams[0].territoryId, "W3-K01"); assert.equal(ui.state().works.at(-1).phase, "reserved"); assert.equal(ui.state().works.at(-1).kitId, kit.kitId);
  const lifted = ui.state(); ui.click("Charger avec l’équipe choisie"); assert.deepEqual(ui.state(), lifted);
  assert.equal("campaign" in JSON.parse(ui.export()).exercise, false);
});
