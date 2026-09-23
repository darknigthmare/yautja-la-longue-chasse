import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
const bundle = await build({ entryPoints: [fileURLToPath(new URL("../app/game/systems/pitSelectionFlow.ts", import.meta.url))], bundle: true, platform: "node", format: "esm", write: false });
const { createPitSelectionState, movePitSelectionIndex, reducePitSelection } = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64")) as typeof import("../app/game/systems/pitSelectionFlow");

test("two separate confirmations are required before choosing a stage", () => {
  const initial = createPitSelectionState();
  const player = reducePitSelection(initial, { type: "confirm", player: "city-hunter", opponent: "celtic" });
  assert.equal(player.step, "fighters"); assert.equal(player.slot, "opponent");
  const ready = reducePitSelection(player, { type: "confirm", player: "city-hunter", opponent: "celtic" });
  assert.equal(ready.step, "stage"); assert.equal(ready.confirmedOpponent, "celtic");
  assert.deepEqual(initial, createPitSelectionState(), "selection does not mutate prior state");
});
test("duplicates are refused and a changed player cannot reuse an earlier confirmation", () => {
  const initial = createPitSelectionState();
  assert.equal(reducePitSelection(initial, { type: "confirm", player: "wolf", opponent: "wolf" }), initial);
  const player = reducePitSelection(initial, { type: "confirm", player: "wolf", opponent: "celtic" });
  const changed = reducePitSelection(player, { type: "confirm", player: "tracker", opponent: "celtic" });
  assert.equal(changed.step, "fighters"); assert.equal(changed.confirmedPlayer, "tracker");
});
test("returning from stages preserves chosen identities; editing invalidates confirmations", () => {
  const first = reducePitSelection(createPitSelectionState(), { type: "confirm", player: "wolf", opponent: "celtic" });
  const stage = reducePitSelection(first, { type: "confirm", player: "wolf", opponent: "celtic" });
  const back = reducePitSelection(stage, { type: "back" });
  assert.equal(back.step, "fighters"); assert.equal(back.slot, "opponent");
  assert.equal(back.confirmedPlayer, "wolf"); assert.equal(back.confirmedOpponent, "celtic");
  const edit = reducePitSelection(back, { type: "pick", slot: "player" });
  assert.equal(edit.confirmedPlayer, null); assert.equal(edit.confirmedOpponent, null);
});
test("a noncombat Descent event can be confirmed without inventing a rival", () => {
  const first = reducePitSelection(createPitSelectionState(), { type: "confirm", player: "wolf", opponent: "wolf", eventOnly: true });
  assert.equal(reducePitSelection(first, { type: "confirm", player: "wolf", opponent: "wolf", eventOnly: true }).step, "stage");
});
test("grid navigation wraps, moves by rows, and skips unavailable fighters", () => {
  assert.equal(movePitSelectionIndex(0, "right", 3, [true, false, true, true, true, true]), 2);
  assert.equal(movePitSelectionIndex(0, "left", 3, [true, true, true, true, true, true]), 5);
  assert.equal(movePitSelectionIndex(1, "down", 3, [true, true, true, true, true, true]), 4);
  assert.equal(movePitSelectionIndex(1, "up", 3, [true, true, true, true, true, true]), 4);
  assert.equal(movePitSelectionIndex(0, "right", 4, [false, false]), -1);
  assert.equal(movePitSelectionIndex(0, "down", 4, []), -1);
});


test("holding Escape sends only one selection back command", async () => {
  const [{ readFile }, { runInNewContext }, { default: ts }] = await Promise.all([import("node:fs/promises"), import("node:vm"), import("typescript")]);
  const source = await readFile(new URL("../app/game/PitCanvas.tsx", import.meta.url), "utf8");
  const tree = ts.createSourceFile("PitCanvas.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let callback: import("typescript").Expression | undefined;
  const visit = (node: import("typescript").Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(tree) === "onKeyDown" && node.initializer?.getText(tree).includes("selectionFlowRef")) callback = node.initializer;
    ts.forEachChild(node, visit);
  };
  visit(tree); assert.ok(callback);
  const calls: string[] = [];
  const options: { current: { open: boolean } | null } = { current: null };
  const js = ts.transpileModule(`const handler = ${callback.getText(tree)};`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  class EditableElement { closest() { return this; } }
  const handler = runInNewContext(`(() => { ${js}; return handler; })()`, {
    HTMLElement: EditableElement,
    selectionOptionsRef: options, closeSelectionOptions: () => calls.push("close-options"),
    matchesControlAction: () => true, controlBindings: {}, combatRef: { current: null },
    selectionFlowRef: { current: { command: (command: string) => calls.push(command) } },
  });
  for (const repeat of [false, true, true]) handler({ repeat, preventDefault() {} });
  assert.deepEqual(calls, ["back"]);
  handler({ repeat: false, preventDefault() {} }); assert.deepEqual(calls, ["back", "back"]);
  handler({ target: new EditableElement(), key: "e", repeat: false, preventDefault() { throw new Error("Typing must remain editable"); } });
  assert.deepEqual(calls, ["back", "back"], "a remapped pause letter must not leave search");
  handler({ target: new EditableElement(), key: "Escape", repeat: false, preventDefault() {} });
  assert.deepEqual(calls, ["back", "back", "back"], "Escape keeps its explicit back behavior");
  handler({ defaultPrevented: true, key: "Escape", repeat: false, preventDefault() {} });
  assert.equal(calls.length, 3, "a profile that consumed Escape must not leave selection");
  options.current = { open: true };
  for (const repeat of [false, true, true]) handler({ key: "Escape", repeat, preventDefault() {} });
  assert.deepEqual(calls, ["back", "back", "back", "close-options"], "Escape closes options once without also sending selection back");
});

test("unavailable stage Canvas publishes a visible retryable failure", async () => {
  const [{ readFile }, { runInNewContext }, { default: ts }] = await Promise.all([import("node:fs/promises"), import("node:vm"), import("typescript")]);
  const source = await readFile(new URL("../app/game/PitStagePreview.tsx", import.meta.url), "utf8");
  const tree = ts.createSourceFile("PitStagePreview.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let callback: import("typescript").Expression | undefined;
  const visit = (node: import("typescript").Node) => {
    if (ts.isCallExpression(node) && node.expression.getText(tree) === "useEffect") callback = node.arguments[0];
    ts.forEachChild(node, visit);
  };
  visit(tree); assert.ok(callback);
  const status: string[] = [], results: { id: string; status: string }[] = [];
  const canvas = { dataset: {} as Record<string, string>, getContext: () => null };
  const js = ts.transpileModule(`const effect = ${callback.getText(tree)};`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  const effect = runInNewContext(`(() => { ${js}; return effect; })()`, { AbortController, canvasRef: { current: canvas }, arenaId: "test-stage",
    onStatus: (_id: string, value: string) => status.push(value), setResult: (value: { id: string; status: string }) => results.push(value),
  });
  effect(); assert.deepEqual(status, ["loading", "failed"]);
  assert.equal(canvas.dataset.previewStatus, "failed"); assert.equal(results.length, 1);
  assert.equal(results[0].id, "test-stage"); assert.equal(results[0].status, "failed");
});
