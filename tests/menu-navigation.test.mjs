import assert from "node:assert/strict";
import test from "node:test";
import { freshMenuPadState, menuPadStep, menuFocusIndex } from "../app/game/systems/menuNavigation.ts";

const neutral = { direction: null, confirm: false, back: false };
test("menu entry requires neutral input and confirm fires once per press", () => {
  let state = freshMenuPadState();
  let result = menuPadStep(state, { ...neutral, confirm: true }, 0);
  assert.equal(result.confirm, false);
  result = menuPadStep(result.state, neutral, 10);
  result = menuPadStep(result.state, { ...neutral, confirm: true }, 20);
  assert.equal(result.confirm, true);
  assert.equal(menuPadStep(result.state, { ...neutral, confirm: true }, 1000).confirm, false);
});
test("direction repeats have an initial delay and independent confirm edges", () => {
  let state = menuPadStep(freshMenuPadState(), neutral, 0).state;
  let result = menuPadStep(state, { ...neutral, direction: "down" }, 1);
  assert.equal(result.direction, "down");
  result = menuPadStep(result.state, { ...neutral, direction: "down", confirm: true }, 200);
  assert.equal(result.direction, null);
  assert.equal(result.confirm, true);
  result = menuPadStep(result.state, { ...neutral, direction: "down" }, 341);
  assert.equal(result.direction, "down");
  assert.equal(menuPadStep(result.state, { ...neutral, direction: "down" }, 350).direction, null);
  assert.equal(menuPadStep(result.state, { ...neutral, direction: "up" }, 351).direction, "up");
});
test("spatial menu navigation handles grids, empty screens and wraparound", () => {
  const grid = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 0, y: 80 }, { x: 100, y: 80 }];
  assert.equal(menuFocusIndex(grid, 0, "right"), 1);
  assert.equal(menuFocusIndex(grid, 0, "down"), 2);
  assert.equal(menuFocusIndex(grid, 3, "left"), 2);
  assert.equal(menuFocusIndex(grid, 3, "down"), 0);
  assert.equal(menuFocusIndex(grid, -1, "down"), 0);
  assert.equal(menuFocusIndex([], -1, "down"), -1);
});
test("a held back input cannot cascade across opened menus", () => {
  let state = menuPadStep(freshMenuPadState(), neutral, 0).state;
  const result = menuPadStep(state, { ...neutral, back: true }, 1);
  assert.equal(result.back, true);
  assert.equal(menuPadStep(result.state, { ...neutral, back: true }, 900).back, false);
  assert.equal(menuPadStep(freshMenuPadState(), { ...neutral, back: true }, 901).back, false);
});


test("the real menu control adapter clamps sliders and skips locked select options", async () => {
  const { readFile } = await import("node:fs/promises");
  const { runInNewContext } = await import("node:vm");
  const { default: ts } = await import("typescript");
  const source = await readFile(new URL("../app/game/useMenuGamepad.ts", import.meta.url), "utf8");
  const ast = ts.createSourceFile("useMenuGamepad.ts", source, ts.ScriptTarget.Latest, true);
  const declaration = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "adjustControl");
  class Input {
    constructor() { this.type = "range"; this.min = "0"; this.max = "1"; this.step = "0.1"; this._value = "0.9"; this.events = []; }
    get value() { return this._value; }
    set value(value) { this._value = value; }
    dispatchEvent(event) { this.events.push(event.type); }
  }
  class Select extends Input {
    constructor() { super(); this._value = "easy"; this.options = [{ value: "easy", disabled: false }, { value: "locked", disabled: true }, { value: "hard", disabled: false }]; }
    get value() { return this._value; }
    set value(value) { this._value = value; }
  }
  const compiled = ts.transpileModule(declaration.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  const adjust = runInNewContext(compiled + ";adjustControl", { HTMLInputElement: Input, HTMLSelectElement: Select, Event });
  const slider = new Input();
  assert.equal(adjust(slider, "right"), true);
  assert.equal(slider.value, "1");
  adjust(slider, "right");
  assert.equal(slider.value, "1");
  assert.deepEqual(slider.events, ["input", "change", "input", "change"]);
  const select = new Select();
  select.type = "select";
  adjust(select, "right");
  assert.equal(select.value, "hard");
  assert.equal(adjust(select, "down"), false, "up/down remains available to leave a setting");
});


test("simultaneous navigation and confirm activates the newly focused control", async () => {
  const { readFile } = await import("node:fs/promises");
  const { runInNewContext } = await import("node:vm");
  const { default: ts } = await import("typescript");
  const source = await readFile(new URL("../app/game/useMenuGamepad.ts", import.meta.url), "utf8");
  const ast = ts.createSourceFile("useMenuGamepad.ts", source, ts.ScriptTarget.Latest, true);
  const hook = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "useMenuGamepad");
  const compiled = ts.transpileModule(hook.getText(ast).replace(/^export /, ""), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  const document = { hidden: false, hasFocus: () => true, activeElement: null };
  let frame;
  const pad = { connected: true, index: 2, id: "controller", axes: [0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false })) };
  class Control {
    constructor(y) { this.y = y; this.clicks = 0; }
    closest() { return null; }
    getClientRects() { return [1]; }
    getAttribute() { return null; }
    getBoundingClientRect() { return { x: 0, y: this.y, width: 100, height: 20 }; }
    focus() { document.activeElement = this; }
    scrollIntoView() {}
    click() { this.clicks++; }
  }
  const first = new Control(0), second = new Control(80);
  const root = { querySelectorAll: selector => selector === "controls" ? [first, second] : [], contains: element => [first, second].includes(element) };
  document.activeElement = first;
  const environment = {
    useEffect: callback => callback(), freshMenuPadState, menuPadStep, menuFocusIndex,
    FOCUSABLE: "controls", adjustControl: () => false, document, HTMLElement: Control,
    navigator: { getGamepads: () => [null, null, pad] },
    window: { requestAnimationFrame: callback => { frame = callback; return 1; }, cancelAnimationFrame() {} },
  };
  const useMenu = runInNewContext(compiled + ";useMenuGamepad", environment);
  useMenu({ current: root }, true, "settings", () => {});
  frame(0);
  pad.buttons[13].pressed = true;
  pad.buttons[0].pressed = true;
  frame(16);
  assert.equal(document.activeElement, second);
  assert.equal(first.clicks, 0);
  assert.equal(second.clicks, 1);
  frame(32);
  assert.equal(second.clicks, 1, "holding A cannot reactivate the control");
  environment.navigator.getGamepads = () => { throw new Error("Gamepad access denied"); };
  assert.doesNotThrow(() => frame(48), "a restricted gamepad API leaves keyboard navigation available");
});
