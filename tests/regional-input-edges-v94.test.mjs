import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { createHomeworldGamepadState, stepHomeworldGamepad } from '../app/game/systems/homeworldInput.ts';

// Execute each production RAF callback with the real input model. The world-step
// boundary records consumed inputs; this does not pretend to traverse a village.
async function productionLoop(kind) {
  const path = `../app/game/${kind === 'passage' ? 'HomeworldPassageV67' : 'HomeworldRegionV68'}.tsx`;
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const tree = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const callbacks = [];
  function visit(node) {
    if (ts.isCallExpression(node) && node.expression.getText(tree) === 'useEffect' &&
        node.arguments[0]?.getText(tree).includes('stepHomeworldGamepad')) callbacks.push(node.arguments[0]);
    ts.forEachChild(node, visit);
  }
  visit(tree); assert.equal(callbacks.length, 1, 'exactly one live polling effect');
  return ts.transpileModule(`const effect = ${callbacks[0].getText(tree)}; effect;`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;
}
const callbacks = { passage: await productionLoop('passage'), region: await productionLoop('region') };
function fixture(kind) {
  const actor = { x: 10, y: 10 }, current = { current: { tick: 1, actor, status: kind === 'passage' ? 'travelling' : 'walking', zone: 'passage' } };
  const paused = { current: false }, padState = { current: createHomeworldGamepadState() };
  const controller = { id: 'qa-pad', index: 0, connected: true, axes: [0, 0], buttons: Array.from({length:16},()=>({pressed:false})) };
  const inputs = [], frames = new Map(); let nextId = 0;
  const interact = { current: false }, held = { current: new Set() }, touch = { current: new Set() };
  const clear = () => { interact.current = false; held.current.clear(); touch.current.clear(); padState.current = createHomeworldGamepadState(); };
  const step = (value, input) => { inputs.push({ ...input }); return { ...value, tick: value.tick + 1 }; };
  const env = {
    createHomeworldGamepadState, stepHomeworldGamepad, regionId: 'ash-marches',
    navigator: { getGamepads: () => [controller] },
    requestAnimationFrame: cb => { frames.set(++nextId, cb); return nextId; },
    cancelAnimationFrame: id => frames.delete(id),
    latest: { current: { suspended: false, save: { settings: { controlBindings: {} } } } },
    readyRef: { current: true }, codexRef: { current: false },
    stateRef: current, current, pausedRef: paused, pauseRef: paused, pad: padState, gamepad: padState,
    held, touch, interact, matchesControlAction: () => false,
    canEnterHomeworldPassageV67: () => ({allowed:true}), canEnterHomeworldRegionV68: () => ({allowed:true}),
    stepHomeworldPassageV67: step, stepHomeworldRegionV68: step,
    homeworldRegionInteractionV68: () => null, bibleCulturalNearbyV86: () => false,
    nearestVillageActivityV70: () => null, nearestHomeworldVillageResidentV69: () => null,
    regionInteractionDialogueV68: () => '', setState() {}, persist: () => true,
    field: () => true, freeze: clear, leave: clear, openBible: clear,
    pause: () => { clear(); paused.current = true; }, resume: () => { clear(); paused.current = false; },
  };
  const cleanup = runInNewContext(callbacks[kind], env)();
  return { env, controller, inputs, clear, cleanup,
    tick(now) { const batch = [...frames]; frames.clear(); for (const [, cb] of batch) cb(now); assert.equal(frames.size, 1); },
    confirms() { return inputs.filter(i => i.interact).length; },
  };
}
for (const kind of ['passage', 'region']) {
  test(`${kind}: an A edge between simulation ticks is queued until the next step`, () => {
    const f=fixture(kind);try {
      f.tick(1); f.controller.buttons[0].pressed=true; f.tick(7);
      assert.equal(f.inputs.length,0,'no physics step on the high-frequency frame');
      f.controller.buttons[0].pressed=false; f.tick(21);f.tick(41);
      assert.equal(f.confirms(),1,'the short gamepad press is not discarded');
    }finally{f.cleanup();}
  });
  test(`${kind}: one A press is not repeated in multiple catch-up steps`, () => {
    const f=fixture(kind);try {
      f.tick(1); f.controller.buttons[0].pressed=true; f.tick(51);
      assert(f.inputs.length>=2,'low refresh frame executes several simulation steps');
      assert.equal(f.confirms(),1);f.tick(101);assert.equal(f.confirms(),1,'held A never repeats');
    }finally{f.cleanup();}
  });
  test(`${kind}: a queued interaction is discarded when the scene is suspended`, () => {
    const f=fixture(kind);try {
      f.tick(1);f.controller.buttons[0].pressed=true;f.tick(7);
      f.env.latest.current.suspended=true;f.tick(8);
      f.env.latest.current.suspended=false;f.controller.buttons[0].pressed=false;f.tick(28);f.tick(48);
      assert.equal(f.confirms(),0);f.controller.buttons[0].pressed=true;f.tick(68);assert.equal(f.confirms(),1);
    }finally{f.cleanup();}
  });
  test(`${kind}: keyboard and gamepad on the same step coalesce as one interaction`, () => {
    const f=fixture(kind);try {
      f.tick(1);f.env.interact.current=true;f.controller.buttons[0].pressed=true;f.tick(51);
      assert.equal(f.confirms(),1);assert.equal(f.env.interact.current,false);
    }finally{f.cleanup();}
  });
  test(`${kind}: denied controller polling still runs the fixed-step keyboard/touch path`, () => {
    const f=fixture(kind);try {
      f.env.navigator.getGamepads=()=>{throw new DOMException('denied','SecurityError');};
      f.env.touch.current.add('right');f.env.interact.current=true;f.tick(1);f.tick(21);
      assert.equal(f.inputs.at(-1).x,1);assert.equal(f.confirms(),1);
    }finally{f.cleanup();}
  });
}
