import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import ts from "typescript";
const source = await fs.readFile("app/game/useMenuGamepad.ts", "utf8");
const ast = ts.createSourceFile("useMenuGamepad.ts", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
let tick;
const visit = node => { if (ts.isVariableDeclaration(node) && node.name.getText(ast) === "tick") tick = node.initializer; ts.forEachChild(node, visit); };
visit(ast); assert(tick, "The actual menu gamepad tick must exist");
const code = ts.transpileModule("const extracted=" + tick.getText(ast) + ";export default extracted;", { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
function run(inert) {
  let backed = 0, resets = 0;
  const env = {
    window: { requestAnimationFrame: () => 1 }, document: { hidden: false, hasFocus: () => true, activeElement: null },
    navigator: { getGamepads: () => [{ connected: true, index: 0, id: "QA pad", axes: [0, 0], buttons: [ { pressed: false }, { pressed: true } ] }] },
    frameId: 0, tick: () => {}, padIdentity: "0:QA pad", state: { armed: true },
    freshMenuPadState: () => { resets++; return { armed: false }; },
    menuPadStep: () => ({ state: { armed: true }, direction: null, confirm: false, back: true }),
    rootRef: { current: { closest: () => inert ? {} : null, querySelectorAll: () => [] } },
    HTMLElement: class {}, FOCUSABLE: "button", onBack: () => { backed++; },
  };
  const exports = {}, actual = Function(...Object.keys(env), "exports", code + ";return exports.default;")(...Object.values(env), exports);
  actual(100); return { backed, resets };
}
test("actual menu gamepad does not close the game settings behind an inert account modal", () => {
  const result = run(true); assert.equal(result.backed, 0); assert(result.resets > 0, "Inputs must require release when this menu becomes active again");
});
test("actual active account menu still accepts controller back exactly once", () => {
  assert.equal(run(false).backed, 1);
});
