import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";

const ts = createRequire(import.meta.url)("typescript");

const read = (path) => readFile(path, "utf8");

// Execute the actual source callbacks: a source regex alone cannot establish
// which focused controls may receive a nonmodal hunt shortcut.
function actualHuntKeyboardHandler(source, actions) {
  const file = ts.createSourceFile("HuntCanvas.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const callbacks = new Map();
  function visit(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) &&
        ["isInteractiveControl", "onKeyDown"].includes(node.name.text)) {
      assert(!callbacks.has(node.name.text), "keyboard callback must be unambiguous");
      callbacks.set(node.name.text, node.initializer.getText(file));
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  assert.equal(callbacks.size, 2, "actual interactive predicate and handler must exist");
  const input = { keyboardHeld: new Set(), pressed: new Set() };
  class FocusElement {
    constructor(interactive, rites = false) { this.interactive = interactive; this.rites = rites; }
    closest(selector) { return (selector === "[data-hunt-rites-v77]" ? this.rites : this.interactive) ? this : null; }
  }
  const compiled = ts.transpileModule(
    [...callbacks].map(([name, body]) => `const ${name} = ${body};`).join("\n") + "\nthis.invoke = onKeyDown;",
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } },
  ).outputText;
  const context = { Element: FocusElement, input, activeBindings: [],
    matchingControlActions: () => actions, HUNT_CONTROL_ACTIONS: Object.fromEntries(actions.map(action => [action, action])),
    isHeldKeyboardAction: action => ["left", "right", "jump"].includes(action) };
  runInNewContext(compiled, context);
  return { input, FocusElement, invoke: context.invoke };
}

function checkHuntShortcut(source, { interactive, rites = false, action, key, allowed, modifier = false }) {
  const runtime = actualHuntKeyboardHandler(source, [action]);
  let prevented = false;
  runtime.invoke({ target: new runtime.FocusElement(interactive, rites), key, code: "KeyE",
    defaultPrevented: false, ctrlKey: modifier, metaKey: false, altKey: false, repeat: false,
    preventDefault() { prevented = true; } });
  assert.equal(runtime.input.pressed.has(action), allowed, `${action}/${key}: focused control safety`);
  assert.equal(prevented, allowed, `${action}/${key}: native activation/default must stay untouched when refused`);
}

test("galaxy navigation keeps flight controls inside its spatial region", async () => {
  const source = await read("app/game/GalaxyMapPanel.tsx");
  const sectionTag = source.slice(
    source.indexOf("<section"),
    source.indexOf(">", source.indexOf("<section")) + 1,
  );

  assert.doesNotMatch(sectionTag, /onKeyDown/);
  assert.match(source, /role="region"/);
  assert.match(source, /<nav className="galaxy-v10-spatial-map"/);
  assert.match(source, /aria-current=\{selected \? "true"/);
  assert.match(source, /ref=\{stageRef\}[\s\S]*onKeyDown=\{onKeyDown\}/);
  assert.match(source, /if \(event\.target !== event\.currentTarget\) return/);
  assert.match(source, /matchingControlActions\([\s\S]*"galaxy"/);
  assert.doesNotMatch(source, /event\.key === "Tab"/);
  assert.match(source, /data-flight-x="-1"/);
});

test("galaxy route and bridge origins survive briefing and station detours", async () => {
  const [panel, client] = await Promise.all([
    read("app/game/GalaxyMapPanel.tsx"),
    read("app/game/GameClient.tsx"),
  ]);

  assert.match(panel, /initialState\?: GalaxyNavigationState/);
  assert.match(panel, /onStateChange\?: \(state: GalaxyNavigationState\)/);
  assert.match(panel, /initialState \?\? createGalaxyNavigationState\(\)/);
  assert.match(panel, /onStateChange\?\.\(state\)/);

  assert.match(client, /useState<GalaxyNavigationState>\(createGalaxyNavigationState\)/);
  assert.match(client, /initialState=\{galaxyNavigationState\}/);
  assert.match(client, /onStateChange=\{setGalaxyNavigationState\}/);
  assert.match(client, /onBack=\{\(\) => go\(mapReturnScreen\)\}/);
  assert.match(client, /onOpenMap=\{\(\) => openMap\("deck"\)\}/);
  assert.match(client, /openStationScreen\("armory", "briefing"\)/);
  assert.match(client, /onBack=\{\(\) => go\(stationReturnScreen\)\}/);
});

test("trophy workshop traps and restores focus with a narrow-screen layout", async () => {
  const [source, css] = await Promise.all([
    read("app/game/TrophyWorkshop.tsx"),
    read("app/globals.css"),
  ]);

  assert.match(source, /previouslyFocusedRef/);
  assert.match(source, /setAttribute\("inert", ""\)/);
  assert.match(source, /event\.key === "Tab"/);
  assert.match(source, /previouslyFocusedRef\.current\?\.focus/);
  assert.match(source, /event\.detail === 0/);
  assert.match(css, /@media \(max-width: 440px\)[\s\S]*\.trophy-workshop-work-area[\s\S]*grid-template-columns: minmax\(0, 1fr\)/);
});

test("physical deck exposes local stations, semantic shortcuts and a bounded camera viewport", async () => {
  const [source, scene, css] = await Promise.all([
    read("app/game/PhysicalShipDeck.tsx"), read("app/game/ShipLevelScene.tsx"), read("app/game/ship-level.css"),
  ]);
  assert.match(source, /role="region"/);
  assert.match(source, /physical-ship-deck__station-shortcuts/);
  assert.match(source, /event\.defaultPrevented/);
  assert.match(scene, /event\.stopPropagation\(\)/);
  assert.match(source, /getShipCamera\(player, cameraSize\)/);
  assert.doesNotMatch(source, /viewport\.scrollLeft/);
  assert.match(source, /inert=\{suspended\}/);
  assert.match(source, /touchControls: \{[\s\S]*flexWrap: "wrap"/);
  assert.match(scene, /tabIndex=\{suspended \? -1 : 0\}/);
  assert.match(css, /ship-level-scene[\s\S]*min-width: 0 !important/);
  assert.match(css, /@media \(pointer: coarse\)/);
  assert.match(source, /sans déplacement du chasseur/);
});

test("hunt mission keeps keyboard controls, live updates and modal focus accessible", async () => {
  const [hunt, client, css] = await Promise.all([
    read("app/game/HuntCanvas.tsx"),
    read("app/game/GameClient.tsx"),
    read("app/globals.css"),
  ]);
  const actionButton = hunt.slice(
    hunt.indexOf("function ActionButton("),
    hunt.indexOf("function formatTime("),
  );

  assert.match(hunt, /className="screen hunt-screen"[\s\S]*data-screen-focus[\s\S]*tabIndex=\{-1\}/);
  assert.match(hunt, /button, a, input, select, textarea, \[contenteditable\]/);
  assert.match(
    hunt,
    /isInteractiveControl\(event\.target\) &&\s*\(event\.key === "Enter" \|\| event\.key === " "\)/,
  );
  for (const example of [
    { interactive: true, action: "interact", key: "e", allowed: false },
    { interactive: true, action: "melee", key: "j", allowed: false },
    { interactive: true, action: "pause", key: "Escape", allowed: true },
    { interactive: true, rites: true, action: "interact", key: "e", allowed: true },
    { interactive: false, action: "interact", key: "e", allowed: true },
    { interactive: true, rites: true, action: "interact", key: "Enter", allowed: false },
    { interactive: true, rites: true, action: "interact", key: " ", allowed: false },
    { interactive: true, action: "pause", key: "Enter", allowed: false },
    { interactive: true, rites: true, action: "interact", key: "e", allowed: false, modifier: true },
  ]) checkHuntShortcut(hunt, example);
  assert.match(
    hunt,
    /const onKeyUp = \(event: KeyboardEvent\) => \{\s*const actions = matchingControlActions/,
  );
  assert.match(hunt, /onKeyDown: \(event: ReactKeyboardEvent<HTMLButtonElement>\)/);
  assert.match(hunt, /onKeyUp: \(event: ReactKeyboardEvent<HTMLButtonElement>\)/);
  assert.match(hunt, /event\.key !== " " && event\.key !== "Enter"/);
  assert.match(hunt, /onBlur: \(\) => setTouchHeld\(action, false\)/);
  const jumpBinding = hunt.indexOf('{...makeHoldHandlers("jump")}');
  assert.notEqual(jumpBinding, -1, "jump must expose the same held-input contract as movement");
  const jumpButton = hunt.slice(hunt.lastIndexOf("<button", jumpBinding), hunt.indexOf("</button>", jumpBinding) + 9);
  assert.match(jumpButton, /type="button"/);
  assert.match(jumpButton, /aria-label="Sauter[^"\n]*maintenir[^"\n]*"/);
  assert.doesNotMatch(jumpButton, /onClick|onPress/, "pointer release must not queue a duplicate jump");
  const holdHandlers = hunt.slice(hunt.indexOf("const makeHoldHandlers ="), hunt.indexOf("const updatePointerScreen ="));
  const pointerDown = holdHandlers.slice(holdHandlers.indexOf("onPointerDown:"), holdHandlers.indexOf("onPointerUp:"));
  const keyDown = holdHandlers.slice(holdHandlers.indexOf("onKeyDown:"), holdHandlers.indexOf("onKeyUp:"));
  for (const handler of [pointerDown, keyDown]) {
    assert.match(handler, /event\.preventDefault\(\)/);
    assert.match(handler, /action === "jump"\) \{\s*pressAction\(action\);/);
    assert.match(handler, /setTouchHeld\(action, true\)/);
  }
  assert.match(pointerDown, /setPointerCapture\(event\.pointerId\)/);
  assert.match(keyDown, /event\.key !== " " && event\.key !== "Enter"/);
  assert.match(keyDown, /if \(event\.repeat\) return/);
  assert.match(holdHandlers, /onPointerUp:[\s\S]*?setTouchHeld\(action, false\)/);
  assert.match(holdHandlers, /onPointerCancel: \(\) => setTouchHeld\(action, false\)/);
  assert.match(holdHandlers, /onLostPointerCapture: \(\) => setTouchHeld\(action, false\)/);
  assert.match(holdHandlers, /onKeyUp:[\s\S]*?event\.preventDefault\(\);\s*setTouchHeld\(action, false\)/);
  assert.match(holdHandlers, /onBlur: \(\) => setTouchHeld\(action, false\)/);
  assert.equal((holdHandlers.match(/pressAction\(action\)/g) ?? []).length, 2, "only pointer-down and a fresh activation key press may queue an action");
  assert.match(actionButton, /onClick=\{onPress\}/);
  assert.doesNotMatch(actionButton, /onPointerDown/);
  assert.match(
    hunt,
    /<div style=\{styles\.objectiveBar\}>\s*<div aria-live="polite" aria-atomic="true">/,
  );
  assert.doesNotMatch(hunt, /<div style=\{styles\.objectiveBar\}[^>]*aria-live/);
  assert.doesNotMatch(hunt, /<div style=\{styles\.trophyTimer\}[^>]*aria-live/);
  assert.match(hunt, /const huntDialogRef/);
  assert.match(hunt, /setAttribute\("inert", ""\)/);
  assert.match(hunt, /if \(event\.key !== "Tab"\) return/);
  assert.match(hunt, /previouslyFocusedRef\.current/);
  assert.match(hunt, /role="group" aria-label="Déplacement tactile"/);
  assert.match(hunt, /role="group" aria-label="Actions tactiles"/);
  assert.match(
    client,
    /data-high-contrast=\{\s*screen === "mission"\s*\? activeMissionSave\.settings\.highContrastVision\s*: save\.settings\.highContrastVision\s*\}/,
  );
  assert.match(client, /<h2 id="briefing-title">/);
  assert.doesNotMatch(client, /<h1 id="briefing-title">/);
  assert.match(css, /\.hunt-screen:focus-visible,\s*\.hunt-canvas:focus-visible/);
  assert.match(css, /\.hub-screen\[data-ship-room\]:focus-visible/);
});

test("mobile catalogue, armory and galaxy keep the map spatial without the previous crop", async () => {
  const [catalogue, client, hub, css] = await Promise.all([
    read("app/game/CatalogueHunterBrowser.tsx"),
    read("app/game/GameClient.tsx"),
    read("app/game/ShipHub.tsx"),
    read("app/globals.css"),
  ]);

  assert.match(catalogue, /matchMedia\("\(max-width: 760px\)"\)/);
  assert.match(catalogue, /mediaQuery\.matches \? 6 : 18/);
  assert.match(catalogue, /aria-current=\{selected \? "true"/);
  assert.doesNotMatch(client, /className="physical-deck-launch"/);
  assert.match(hub, /id: "explore-physical-deck"/);
  assert.match(css, /\.armory-war-room-background[\s\S]*object-fit: contain/);
  assert.match(
    css,
    /@media \(max-width: 760px\)[\s\S]*\.galaxy-v10-stage \{ min-height: max\(650px, calc\(100svh - 178px\)\); \}/,
  );
  assert.match(
    css,
    /@media \(max-width: 760px\)[\s\S]*\.galaxy-v10-node \{[^}]*top: clamp\(24%, var\(--node-y\), 78%\); left: clamp\(18%, var\(--node-x\), 82%\)/,
  );
  assert.match(
    css,
    /\.galaxy-v10-node \{[\s\S]*position: absolute;[\s\S]*top: var\(--node-y\);[\s\S]*left: var\(--node-x\)/,
  );
  const mobileV10Start = css.lastIndexOf("@media (max-width: 760px)");
  const mobileV10End = css.indexOf("@media (max-width: 430px)", mobileV10Start);
  const mobileV10 = css.slice(mobileV10Start, mobileV10End);
  assert.doesNotMatch(mobileV10, /galaxy-v10-spatial-map[\s\S]*grid-template-columns/);
  assert.match(
    css,
    /rotate\(var\(--ship-rotation\)\) scaleX\(var\(--ship-flip\)\)/,
  );
});
