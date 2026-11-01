import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

// Execute the real JSX callbacks with real V102/V103 recipes and generation.
// Controlled hooks make File.text completion order reproducible. Canvas children,
// effects and native file-picker interactions are not exercised by this harness.
const directory = await fs.mkdtemp(path.join(os.tmpdir(), "planet-import-race-v103-"));
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
export function useId() { return useRef('controlled-planet').current; }
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
    contents: `export { default as Component } from './app/game/PlanetGeneratorV103';
      export { normalizeWarPlanetRecipeV102 } from './app/game/systems/clanWarPlanetGeneratorV102';
      export { normalizeWarPlanetRecipeV103 } from './app/game/systems/clanWarPlanetGeneratorV103';
      export { encodeWarPlanetRecipeCodeV103, resolveProceduralWarPlanetV103 } from './app/game/systems/clanWarProceduralV103';
      export { beginRender, resetHooks } from 'react';`,
    resolveDir: process.cwd(),
  },
  bundle: true, write: false, format: "esm", platform: "node", target: "es2022", jsx: "automatic", logLevel: "silent",
  plugins: [{
    name: "controlled-planet-hooks",
    setup(build) {
      build.onResolve({ filter: /^react(?:\/jsx-runtime)?$/ }, args => ({ path: args.path, namespace: "controlled-react" }));
      build.onLoad({ filter: /.*/, namespace: "controlled-react" }, args => ({
        contents: args.path === "react" ? hooks : `export const Fragment = 'fragment'; export function jsx(type, props) { return { type, props }; } export const jsxs = jsx;`,
        loader: "js",
      }));
      build.onResolve({ filter: /^\.\/(ClanWarAtlasV95|PlanetMaterialCanvasV101|PlanetLayerExportV102)$/ }, args => ({ path: args.path, namespace: "render-only-child" }));
      build.onLoad({ filter: /.*/, namespace: "render-only-child" }, () => ({ contents: "export default function RenderOnlyChild() { return null; }", loader: "js" }));
      build.onLoad({ filter: /\.module\.css$/ }, () => ({ contents: "export default {};", loader: "js" }));
    },
  }],
});
const file = path.join(directory, "component.mjs");
await fs.writeFile(file, compiled.outputFiles[0].text);
const api = await import(pathToFileURL(file));

function dossier(recipe) {
  const code = api.encodeWarPlanetRecipeCodeV103(recipe);
  return { recipe, code, json: JSON.stringify({ format: "yautja-war-planet", version: recipe.version, code, recipe }) };
}
const initial = dossier(api.normalizeWarPlanetRecipeV103({ seed: 201, territoryCount: 18, regionCount: 3, landform: "supercontinent", hydrology: "none" }));
const incoming = dossier(api.normalizeWarPlanetRecipeV103({ ...initial.recipe, seed: 202 }));
const legacy = dossier(api.normalizeWarPlanetRecipeV102({ seed: 203, landform: "supercontinent" }));
const activePlanet = api.resolveProceduralWarPlanetV103(initial.code);
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
    click(label) { const button = this.one(node => node.type === "button" && text(node) === label); assert.ok(!button.props.disabled, `${label} is available`); button.props.onClick(); this.render(); },
    generate() { this.one(node => node.type === "form").props.onSubmit({ preventDefault() {} }); this.render(); },
    lockSeed() { this.one(node => node.type === "input" && node.props["aria-label"] === "Conserver : Graine du monde").props.onChange(); this.render(); },
    startFile(read) { this.one(node => node.type === "input" && node.props.type === "file").props.onChange({ target: { files: [{ size: 1024, text: () => read.promise }], value: "selected.json" } }); this.render(); },
    snapshot() {
      return {
        code: tree.props["data-preview-planet-code"], version: tree.props["data-recipe-version"], changed: tree.props["data-draft-modified"],
        seed: nodes(tree).find(node => node.type === "input" && node.props.placeholder === "Un nom ou un nombre")?.props.value,
        importCode: this.input("Collez un code de monde").props.value,
        message: text(this.one(node => node.props?.role === "status")), opened: [...opened],
      };
    },
  };
  ui.render();
  return ui;
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
async function complete(ui, read, value, rejected = false) {
  if (rejected) read.reject(value); else read.resolve(value);
  await Promise.allSettled([read.promise]);
  await Promise.resolve();
  ui.render();
}

const refusedActions = [
  { name: "an unrecognized world code", prepare: ui => ui.edit("Collez un code de monde", "incomplete-world-code"), act: ui => ui.click("Retrouver le monde"), error: /code de monde n’est pas reconnu/ },
  { name: "generation with an invalid seed", prepare: ui => ui.edit("Un nom ou un nombre", "4294967296"), act: ui => ui.generate(), error: /4 294 967 295/ },
  { name: "a preset with an invalid seed", prepare: ui => ui.edit("Un nom ou un nombre", "4294967296"), act: ui => ui.click("Base terrestre"), error: /4 294 967 295/ },
  { name: "randomization with an invalid locked seed", prepare: ui => { ui.edit("Un nom ou un nombre", "4294967296"); ui.lockSeed(); }, act: ui => ui.click("Mélanger les réglages"), error: /4 294 967 295/ },
];
for (const action of refusedActions) test(`${action.name} supersedes an older pending file even when refused`, async () => {
  const ui = component();
  // Prepare invalid input BEFORE reading the file so only the later action can
  // invalidate it; an earlier seed edit must not accidentally hide the race.
  action.prepare(ui);
  const read = deferred(); ui.startFile(read); action.act(ui);
  const before = ui.snapshot();
  assert.match(before.message, action.error);
  assert.equal(before.code, initial.code);
  await complete(ui, read, incoming.json);
  assert.deepEqual(ui.snapshot(), before, "the refused action keeps its draft, preview and error after an older file completes");
  assert.deepEqual(before.opened, [], "an import must not open or replace the active front");
});

test("editing the shared-world code supersedes an older file before submitting the new code", async () => {
  const ui = component(), read = deferred(); ui.startFile(read);
  ui.edit("Collez un code de monde", legacy.code);
  const before = ui.snapshot();
  await complete(ui, read, incoming.json);
  assert.deepEqual(ui.snapshot(), before);
  ui.click("Retrouver le monde");
  assert.equal(ui.snapshot().code, legacy.code);
  assert.equal(ui.snapshot().version, 102);
  assert.deepEqual(ui.snapshot().opened, []);
});

test("a late read rejection does not replace the error from a newer refused code import", async () => {
  const ui = component(); ui.edit("Collez un code de monde", "invalid-code");
  const read = deferred(); ui.startFile(read); ui.click("Retrouver le monde");
  const before = ui.snapshot();
  await complete(ui, read, new Error("old file read failed"), true);
  assert.deepEqual(ui.snapshot(), before);
});

for (const world of [legacy, incoming]) test(`the current V${world.recipe.version} file still restores its exact code without opening a front`, async () => {
  const ui = component(), read = deferred(); ui.startFile(read);
  await complete(ui, read, world.json);
  const after = ui.snapshot();
  assert.equal(after.code, world.code);
  assert.equal(after.version, world.recipe.version);
  assert.equal(after.changed, false);
  assert.match(after.message, /Fiche importée/);
  assert.deepEqual(after.opened, []);
});

test("file B keeps its exact legacy identity when the older file A completes last", async () => {
  const ui = component(), a = deferred(), b = deferred(); ui.startFile(a); ui.startFile(b);
  await complete(ui, b, legacy.json);
  const before = ui.snapshot();
  assert.equal(before.code, legacy.code);
  await complete(ui, a, incoming.json);
  assert.deepEqual(ui.snapshot(), before);
});

test("an older completion cannot replace the preview while the latest file is still pending", async () => {
  const ui = component(), a = deferred(), b = deferred(); ui.startFile(a); ui.startFile(b);
  const before = ui.snapshot();
  await complete(ui, a, incoming.json);
  assert.deepEqual(ui.snapshot(), before);
  await complete(ui, b, legacy.json);
  assert.equal(ui.snapshot().code, legacy.code);
});

test("a late read rejection from file A preserves the accepted file B", async () => {
  const ui = component(), a = deferred(), b = deferred(); ui.startFile(a); ui.startFile(b);
  await complete(ui, b, legacy.json);
  const before = ui.snapshot();
  await complete(ui, a, new Error("old file read failed"), true);
  assert.deepEqual(ui.snapshot(), before);
});

test("a successful generation keeps its new recipe when an older file finishes", async () => {
  const ui = component(); ui.edit("Un nom ou un nombre", "204");
  const read = deferred(); ui.startFile(read); ui.generate();
  const before = ui.snapshot();
  assert.equal(before.code, api.encodeWarPlanetRecipeCodeV103({ ...initial.recipe, seed: 204 }));
  assert.deepEqual(before.opened, []);
  await complete(ui, read, incoming.json);
  assert.deepEqual(ui.snapshot(), before);
});

test("a successful shared-code import keeps its world when an older file finishes", async () => {
  const ui = component(); ui.edit("Collez un code de monde", legacy.code);
  const read = deferred(); ui.startFile(read); ui.click("Retrouver le monde");
  const before = ui.snapshot();
  assert.equal(before.code, legacy.code);
  assert.deepEqual(before.opened, []);
  await complete(ui, read, incoming.json);
  assert.deepEqual(ui.snapshot(), before);
});
