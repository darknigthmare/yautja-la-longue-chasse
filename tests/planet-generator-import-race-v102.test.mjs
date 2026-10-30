import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

// The public V102 editor still owns its own import callbacks. Execute those
// callbacks and the real historical generator, with controlled hook slots and
// File.text completion order. This harness does not render Canvas or a browser.
const directory = await fs.mkdtemp(path.join(os.tmpdir(), "planet-import-race-v102-"));
after(() => fs.rm(directory, { recursive: true, force: true }));
const hooks = `let slots = [], cursor = 0;
export function beginRender() { cursor = 0; }
export function resetHooks() { slots = []; cursor = 0; }
export function useState(initial) {
  const index = cursor++;
  if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
  return [slots[index], next => { slots[index] = typeof next === 'function' ? next(slots[index]) : next; }];
}
export function useRef(initial) {
  const index = cursor++;
  if (!(index in slots)) slots[index] = { current: initial };
  return slots[index];
}
export function useId() { return useRef('controlled-legacy-planet').current; }
export function useMemo(calculate, dependencies) {
  const index = cursor++;
  const previous = slots[index];
  if (!previous || dependencies.length !== previous.dependencies.length || dependencies.some((value, i) => !Object.is(value, previous.dependencies[i]))) {
    slots[index] = { value: calculate(), dependencies };
  }
  return slots[index].value;
}
export function useSyncExternalStore(_subscribe, _snapshot, serverSnapshot) { cursor++; return serverSnapshot(); }`;
const compiled = await build({
  stdin: {
    contents: `export { default as Component } from './app/game/PlanetGeneratorV102';
      export { normalizeWarPlanetRecipeV102, encodeWarPlanetV102, generatedWarPlanetV102 } from './app/game/systems/clanWarPlanetGeneratorV102';
      export { beginRender, resetHooks } from 'react';`,
    resolveDir: process.cwd(),
  },
  bundle: true, write: false, format: "esm", platform: "node", target: "es2022", jsx: "automatic", logLevel: "silent",
  plugins: [{ name: "controlled-legacy-planet-hooks", setup(build) {
    build.onResolve({ filter: /^react(?:\/jsx-runtime)?$/ }, args => ({ path: args.path, namespace: "controlled-react" }));
    build.onLoad({ filter: /.*/, namespace: "controlled-react" }, args => ({
      contents: args.path === "react" ? hooks : `export const Fragment = 'fragment'; export function jsx(type, props) { return { type, props }; } export const jsxs = jsx;`, loader: "js",
    }));
    build.onResolve({ filter: /^\.\/(ClanWarAtlasV95|PlanetLayerExportV102)$/ }, args => ({ path: args.path, namespace: "render-only-child" }));
    build.onLoad({ filter: /.*/, namespace: "render-only-child" }, () => ({ contents: "export default function RenderOnlyChild() { return null; }", loader: "js" }));
    build.onLoad({ filter: /\.module\.css$/ }, () => ({ contents: "export default {};", loader: "js" }));
  } }],
});
const modulePath = path.join(directory, "legacy-component.mjs");
await fs.writeFile(modulePath, compiled.outputFiles[0].text);
const api = await import(pathToFileURL(modulePath));
function dossier(seed) {
  const recipe = api.normalizeWarPlanetRecipeV102({ seed, landform: "supercontinent" });
  const code = api.encodeWarPlanetV102(recipe);
  return { recipe, code, json: JSON.stringify({ format: "yautja-war-planet", version: 102, code, recipe }) };
}
const initial = dossier(201), incoming = dossier(202), third = dossier(203);
const activePlanet = api.generatedWarPlanetV102(initial.code);
assert.ok(activePlanet);

function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== "object") return [];
  return [tree, ...nodes(tree.props?.children)];
}
function text(tree) {
  if (Array.isArray(tree)) return tree.map(text).join("");
  if (!tree || typeof tree !== "object") return tree ?? "";
  return text(tree.props?.children);
}
function component() {
  api.resetHooks();
  let tree;
  const opened = [];
  const ui = {
    render() { api.beginRender(); tree = api.Component({ activePlanet, onOpen(id) { opened.push(id); } }); return tree; },
    one(predicate) { const matches = nodes(tree).filter(predicate); assert.equal(matches.length, 1, "one actual JSX control"); return matches[0]; },
    input(placeholder) { return this.one(node => node.type === "input" && node.props.placeholder === placeholder); },
    edit(placeholder, value) { this.input(placeholder).props.onChange({ target: { value } }); this.render(); },
    select(label, value) {
      const owner = this.one(node => node.type === "label" && node.props.children[0] === label);
      const select = nodes(owner).find(node => node.type === "select");
      assert.ok(nodes(select).some(node => node.type === "option" && (node.props.value === value)), "choose a real available option");
      select.props.onChange({ target: { value } }); this.render();
    },
    click(label) { const button = this.one(node => node.type === "button" && text(node) === label); assert.ok(!button.props.disabled); button.props.onClick(); this.render(); },
    generate() { this.one(node => node.type === "form").props.onSubmit({ preventDefault() {} }); this.render(); },
    startFile(read) { this.one(node => node.type === "input" && node.props.type === "file").props.onChange({ target: { files: [{ size: 1024, text: () => read.promise }], value: "selected.json" } }); this.render(); },
    snapshot() {
      return {
        code: tree.props["data-preview-planet-code"], changed: tree.props["data-draft-modified"],
        seed: this.input("Un nom ou un nombre").props.value,
        importCode: this.input("Collez un code de monde").props.value,
        fields: nodes(tree).filter(node => node.type === "label" && nodes(node).some(child => child.type === "select")).map(label => [label.props.children[0], nodes(label).find(child => child.type === "select").props.value]),
        message: text(this.one(node => node.props?.role === "status")), opened: [...opened],
      };
    },
  };
  ui.render(); return ui;
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
async function complete(ui, read, value, rejected = false) {
  if (rejected) read.reject(value); else read.resolve(value);
  await Promise.allSettled([read.promise]); await Promise.resolve(); ui.render();
}

const draftEdits = [
  ["seed", ui => ui.edit("Un nom ou un nombre", "205")],
  ["landform", ui => ui.select("Répartition des terres", "archipelago")],
  ["coverage", ui => ui.select("Étendue des terres", "low")],
  ["coast", ui => ui.select("Dessin des côtes", "fjords")],
  ["diversity", ui => ui.select("Biomes des régions", "uniform")],
  ["land biome", ui => ui.select("Terres dominantes", "snow")],
  ["surface", ui => ui.select("Mers et milieux intermédiaires", "acid")],
  ["atmosphere", ui => ui.select("Atmosphère", "aurora")],
];
for (const [name, edit] of draftEdits) test(`the V102 ${name} draft survives a file that started before the edit`, async () => {
  const ui = component(), read = deferred(); ui.startFile(read); edit(ui);
  const edited = ui.snapshot();
  assert.equal(edited.code, initial.code, "editing must not silently apply a world");
  assert.equal(edited.changed, true);
  await complete(ui, read, incoming.json);
  assert.deepEqual(ui.snapshot(), edited, "the older file must not erase the edited draft or replace its preview");
  assert.deepEqual(edited.opened, []);
});

test("a rejected V102 generation cancels an older file even with invalid input prepared before reading", async () => {
  const ui = component(); ui.edit("Un nom ou un nombre", "4294967296");
  const read = deferred(); ui.startFile(read); ui.generate();
  const refused = ui.snapshot(); assert.match(refused.message, /4 294 967 295/);
  await complete(ui, read, incoming.json); assert.deepEqual(ui.snapshot(), refused);
});

test("a refused V102 shared code keeps its error when a previously started file succeeds or rejects", async () => {
  for (const rejected of [false, true]) {
    const ui = component(); ui.edit("Collez un code de monde", "incomplete-code");
    const read = deferred(); ui.startFile(read); ui.click("Retrouver le monde");
    const refused = ui.snapshot(); assert.match(refused.message, /code de monde n’est pas reconnu/);
    await complete(ui, read, rejected ? new Error("Old read failure") : incoming.json, rejected);
    assert.deepEqual(ui.snapshot(), refused);
  }
});

test("editing a V102 shared code cancels a previous file without automatically opening the typed world", async () => {
  const ui = component(), read = deferred(); ui.startFile(read); ui.edit("Collez un code de monde", third.code);
  const edited = ui.snapshot(); await complete(ui, read, incoming.json); assert.deepEqual(ui.snapshot(), edited);
  ui.click("Retrouver le monde"); assert.equal(ui.snapshot().code, third.code); assert.deepEqual(ui.snapshot().opened, []);
});

test("a newly selected V102 file still restores its exact historical recipe after an edit cancelled another read", async () => {
  const ui = component(), old = deferred(); ui.startFile(old); ui.select("Atmosphère", "aurora");
  await complete(ui, old, incoming.json);
  const current = deferred(); ui.startFile(current); await complete(ui, current, third.json);
  const restored = ui.snapshot();
  assert.equal(restored.code, third.code); assert.equal(restored.seed, "203"); assert.equal(restored.changed, false);
  assert.match(restored.message, /Fiche importée/); assert.deepEqual(restored.opened, []);
});

test("a successful V102 generation and manual import remain newer than a pending file", async () => {
  const ui = component(); ui.edit("Un nom ou un nombre", "203");
  const first = deferred(); ui.startFile(first); ui.generate();
  const generated = ui.snapshot(); assert.equal(generated.code, third.code);
  await complete(ui, first, incoming.json); assert.deepEqual(ui.snapshot(), generated);
  ui.edit("Collez un code de monde", initial.code);
  const second = deferred(); ui.startFile(second); ui.click("Retrouver le monde");
  const imported = ui.snapshot(); assert.equal(imported.code, initial.code);
  await complete(ui, second, incoming.json); assert.deepEqual(ui.snapshot(), imported);
});

test("the latest V102 file wins in either completion order and keeps the front unopened", async () => {
  for (const newerFirst of [false, true]) {
    const ui = component(), a = deferred(), b = deferred(); ui.startFile(a); ui.startFile(b);
    if (newerFirst) {
      await complete(ui, b, third.json); const latest = ui.snapshot();
      await complete(ui, a, incoming.json); assert.deepEqual(ui.snapshot(), latest);
    } else {
      const initialView = ui.snapshot(); await complete(ui, a, incoming.json); assert.deepEqual(ui.snapshot(), initialView);
      await complete(ui, b, third.json);
    }
    assert.equal(ui.snapshot().code, third.code); assert.deepEqual(ui.snapshot().opened, []);
  }
});
