import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const source = fs.readFileSync('app/game/CampaignMainMenu.tsx', 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const walk = node => Array.isArray(node) ? node.flatMap(walk) : !node || typeof node !== 'object' ? [] : [node, ...walk(node.props?.children)];
const label = node => Array.isArray(node) ? node.map(label).join('') : node && typeof node === 'object' ? label(node.props?.children) : String(node ?? '');
const emptySlot = id => ({ id, status: 'empty', revision: 0, ownerCreatedAt: null, hunterName: null, checkpoints: [], lastCheckpointId: null });
const checkpoint = (kind, index, resumeLocation = 'prologue') => ({ id: `${kind}-${index}`, kind, index, label: `${kind} ${index}`, savedAt: '2026-09-20T09:00:00Z', hasActiveHunt: false, playTimeSeconds: 90, resumeLocation });
const readySlot = (id, location = 'prologue') => ({ ...emptySlot(id), status: 'ready', revision: 7, ownerCreatedAt: `owner-${id}`, hunterName: `Chasseur ${id}`, checkpoints: [checkpoint('auto', 1, location)], lastCheckpointId: 'auto-1' });
function harness(catalog) {
  const values = [], refs = [], calls = [];
  let stateIndex = 0, refIndex = 0;
  const exports = {};
  const jsx = (type, props) => ({ type, props });
  vm.runInNewContext(compiled, { exports, require(name) {
    if (name === 'react') return {
      useState(initial) { const index = stateIndex++; if (!(index in values)) values[index] = initial; return [values[index], value => { values[index] = typeof value === 'function' ? value(values[index]) : value; }]; },
      useRef(initial) { const index = refIndex++; return refs[index] ??= { current: initial }; },
      useLayoutEffect() {}, useCallback: callback => callback,
    };
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (name.includes('useMenuGamepad')) return { useMenuGamepad() {} };
    return { default: {} };
  } });
  const props = { catalog, busy: false, message: null, onRefresh() {}, onCreate: (...args) => calls.push(['create', ...args]), onContinue: (...args) => calls.push(['continue', ...args]), onLoad: (...args) => calls.push(['load', ...args]), onRecover: (...args) => calls.push(['recover', ...args]) };
  const render = () => { stateIndex = 0; refIndex = 0; return exports.default(props); };
  const button = (tree, starts) => walk(tree).find(node => node.type === 'button' && label(node).startsWith(starts));
  return { props, calls, render, button };
}
const catalog = slots => ({ slots, activeSlotId: null });
const fresh = () => catalog(Array.from({ length: 5 }, (_, i) => emptySlot(i + 1)));

test('fresh menu starts in the nursery and cannot continue or load empty archives', () => {
  const ui = harness(fresh()), tree = ui.render();
  assert.equal(ui.button(tree, 'Continuer').props.disabled, true);
  assert.equal(ui.button(tree, 'Nouvelle partie').props.disabled, false);
  assert.equal(ui.button(tree, 'Charger une partie').props.disabled, true);
  assert.match(label(tree), /nurserie/);
  assert.equal(walk(tree).some(node => node.type === 'img' && node.props.src.includes('jungle-hunter')), false);
});

test('new campaign selects the first empty owner slot and submits the trimmed optional name', () => {
  const ui = harness(catalog([readySlot(1), emptySlot(2), ...[3, 4, 5].map(emptySlot)]));
  ui.button(ui.render(), 'Nouvelle partie').props.onClick();
  let tree = ui.render();
  const slots = walk(tree).filter(node => node.props?.['data-campaign-slot']);
  assert.equal(slots.length, 5);
  assert.equal(slots.find(node => node.props['aria-pressed']).props['data-campaign-slot'], 2);
  walk(tree).find(node => node.type === 'input').props.onChange({ target: { value: '  Kaail  ' } });
  tree = ui.render();
  walk(tree).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} });
  assert.deepEqual(ui.calls, [['create', 2, 'Kaail']]);
});

test('occupied and future-version slots cannot be replaced by the new campaign form', () => {
  const slots = [readySlot(1), { ...emptySlot(2), status: 'blocked' }, ...[3, 4, 5].map(emptySlot)];
  const ui = harness(catalog(slots));
  ui.button(ui.render(), 'Nouvelle partie').props.onClick();
  for (const id of [1, 2]) {
    walk(ui.render()).find(node => node.props?.['data-campaign-slot'] === id).props.onClick();
    const tree = ui.render();
    assert.equal(ui.button(tree, 'Créer la partie').props.disabled, true);
    walk(tree).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} });
  }
  assert.deepEqual(ui.calls, []);
});

test('full archive catalog and pending transactions never offer destructive creation', () => {
  const ui = harness(catalog(Array.from({ length: 5 }, (_, i) => readySlot(i + 1))));
  assert.equal(ui.button(ui.render(), 'Nouvelle partie').props.disabled, true);
  ui.props.catalog = fresh();
  ui.button(ui.render(), 'Nouvelle partie').props.onClick();
  ui.props.busy = true;
  const tree = ui.render();
  assert.equal(walk(tree).filter(node => node.type === 'button' || node.type === 'input').every(node => node.props.disabled), true);
  walk(tree).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} });
  assert.deepEqual(ui.calls, []);
});

test('continue identifies the active campaign and its selected checkpoint without granting a ship', () => {
  const active = readySlot(2, 'youth-training');
  active.checkpoints.push({ ...checkpoint('auto', 2, 'deck'), savedAt: '2026-09-21T10:00:00Z' });
  const ui = harness({ slots: [readySlot(1), active, ...[3, 4, 5].map(emptySlot)], activeSlotId: 2 });
  const tree = ui.render();
  const summary = walk(tree).find(node => node.type === 'aside');
  assert.match(label(summary), /Formation Unblooded/);
  assert.doesNotMatch(label(summary), /Vaisseau/);
  ui.button(tree, 'Continuer').props.onClick();
  assert.deepEqual(ui.calls, [['continue', 2]]);
});

test('load exposes ten manual and two auto checkpoints and pins the confirmed revision', () => {
  const owned = readySlot(1); owned.checkpoints.push(checkpoint('manual', 3));
  const ui = harness(catalog([owned, ...[2, 3, 4, 5].map(emptySlot)]));
  ui.button(ui.render(), 'Charger une partie').props.onClick();
  let tree = ui.render();
  const checkpoints = walk(tree).filter(node => node.props?.['data-checkpoint-id']);
  assert.equal(checkpoints.length, 12);
  assert.equal(checkpoints.filter(node => node.props['data-checkpoint-id'].startsWith('manual-')).length, 10);
  assert.equal(checkpoints.filter(node => !node.props.disabled).length, 2);
  checkpoints.find(node => node.props['data-checkpoint-id'] === 'manual-3').props.onClick({ currentTarget: { isConnected: false } });
  ui.props.catalog = catalog([{ ...owned, revision: 9 }, ...[2, 3, 4, 5].map(emptySlot)]);
  tree = ui.render();
  assert.equal(walk(tree).some(node => node.props?.inert === true), true);
  ui.button(tree, 'Confirmer le chargement').props.onClick();
  assert.deepEqual(ui.calls, [['load', 1, 'manual-3', 7]]);
});

test('protected archive recovery is explicit and never creates a replacement campaign', () => {
  const blocked = { ...emptySlot(1), status: 'blocked', recoveryAvailable: true };
  const ui = harness(catalog([blocked, ...[2, 3, 4, 5].map(emptySlot)]));
  ui.button(ui.render(), 'Charger une partie').props.onClick();
  const tree = ui.render();
  assert.match(label(tree), /version plus récente/);
  ui.button(tree, 'Récupérer la copie').props.onClick();
  assert.deepEqual(ui.calls, [['recover', 1]]);
});
