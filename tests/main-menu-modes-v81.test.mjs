import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { homeworldQaModelV64 } from '../scripts/homeworld-qa-model-v64.mjs';

const model = homeworldQaModelV64(process.cwd(), ['mainMenuModesV81.ts', '../save.ts', 'clanChronicle.ts', 'pitSave.ts', 'gameReserveV66.ts', 'progression.ts', 'cloudArchiveV71.ts']);
const stamp = '2026-10-04T10:00:00.000Z';
const storage = () => {
  const values = new Map(), writes = [];
  return { values, writes, get length() { return values.size; }, key: index => [...values.keys()][index] ?? null, getItem: key => values.get(key) ?? null, setItem: (key, value) => { writes.push(key); values.set(key, value); }, removeItem: key => { writes.push(key); values.delete(key); } };
};
function narrativeSave(rank = 'blooded', coordinates = false) {
  const save = model.defaultSave(stamp);
  const rites = model.CHRONICLE_RITES.filter(item => item.grantsRankId !== null);
  const last = rites.findIndex(item => item.grantsRankId === rank);
  const selected = last < 0 ? [] : rites.slice(0, last + 1);
  const evidence = new Set(['intro-begun', ...selected.flatMap(item => item.requiredEvidenceIds), ...(coordinates ? ['reserve-coordinates'] : [])]);
  save.prologue = { status: 'completed', chronicle: {
    version: 1, evidence: model.CHRONICLE_EVIDENCE.filter(item => evidence.has(item.id)).map(({ id, sourceId }) => ({ id, sourceId })),
    rites: selected.map(({ id, sourceId }) => ({ id, sourceId })), legacyRecognition: null,
  } };
  return save;
}
test('fresh and youth modes warn; editable profile ranks cannot forge the real narrative milestones', () => {
  assert.deepEqual(model.mainMenuModeAccessV81(null), { 'the-pit': false, 'game-reserve': false });
  for (const rank of ['youngling', 'unblooded', 'young-blood']) {
    const save = narrativeSave(rank, true); save.profile.rankId = 'elder';
    assert.deepEqual(model.mainMenuModeAccessV81(save, { personalShipAvailable: true }), { 'the-pit': false, 'game-reserve': false });
  }
  const forged = narrativeSave('youngling'); forged.prologue.chronicle.rankId = 'ancient';
  forged.prologue.chronicle.rites.push({ id: 'blooding-mark', sourceId: 'chronicle.rite.blooding' });
  assert.equal(model.mainMenuModeAccessV81(forged)['the-pit'], false);
});
test('The Pit opens at the verified adult rite; Reserve additionally requires its story coordinates and actual ship', () => {
  const blooded = narrativeSave(); const before = JSON.stringify(blooded);
  assert.deepEqual(model.mainMenuModeAccessV81(blooded, { personalShipAvailable: true }), { 'the-pit': true, 'game-reserve': false });
  assert.equal(JSON.stringify(blooded), before, 'query must never grant progression');
  const located = narrativeSave('blooded', true);
  assert.equal(model.mainMenuModeAccessV81(located)['game-reserve'], false);
  assert.equal(model.mainMenuModeAccessV81(located, { personalShipAvailable: true })['game-reserve'], true);
  for (const rank of ['elite', 'elder', 'ancient']) assert.equal(model.mainMenuModeAccessV81(narrativeSave(rank, true), { personalShipAvailable: true })['game-reserve'], true);
  assert.deepEqual(model.mainMenuModeAccessV81(model.defaultSave(stamp)), { 'the-pit': true, 'game-reserve': true }, 'preserve previously playable legacy adult campaigns');
});
test('ship ownership is a read-only query; missing, legacy, other-owner and malformed sidecars do not become invented defaults', () => {
  const save = narrativeSave('blooded', true), store = storage();
  assert.equal(model.mainMenuShipContextV81(save, store).personalShipAvailable, false);
  const fleet = model.createDefaultShipProgression(save, stamp);
  store.values.set(model.SHIP_PROGRESSION_STORAGE_KEY, JSON.stringify(fleet));
  assert.equal(model.mainMenuShipContextV81(save, store).personalShipAvailable, true);
  for (const source of [{ ...fleet, ownerSaveCreatedAt: '2025-01-01T00:00:00.000Z' }, { ...fleet, version: 1 }, { ...fleet, unlockedShipIds: [] }, { ...fleet, selectedShipId: 'invented-ship', unlockedShipIds: ['invented-ship'] }]) {
    store.values.set(model.SHIP_PROGRESSION_STORAGE_KEY, JSON.stringify(source));
    assert.equal(model.mainMenuShipContextV81(save, store).personalShipAvailable, false);
  }
  store.values.set(model.SHIP_PROGRESSION_STORAGE_KEY, '{broken');
  assert.equal(model.mainMenuShipContextV81(save, store).personalShipAvailable, false);
  assert.deepEqual(store.writes, [], 'menu query must not migrate/adopt/write a ship sidecar');
});
test('free-play storage namespaces every existing controller key, including attempts to use a campaign key', () => {
  const store = storage(), bonus = model.mainMenuBonusStorageV81(store), save = model.defaultSave(stamp);
  const campaign = JSON.stringify(save); store.values.set(model.SAVE_STORAGE_KEY, campaign);
  bonus.setItem(model.SAVE_STORAGE_KEY, 'isolated');
  assert.equal(bonus.getItem(model.SAVE_STORAGE_KEY), 'isolated');
  assert.equal(store.getItem(model.SAVE_STORAGE_KEY), campaign);
  bonus.removeItem(model.SAVE_STORAGE_KEY);
  assert.equal(store.getItem(model.SAVE_STORAGE_KEY), campaign);
  assert(store.writes.every(key => key.startsWith(model.MAIN_MENU_BONUS_PREFIX_V81)));
});
test('a real free-play PIT result persists only in its profile; the owner sidecar, slots and story remain byte-identical', () => {
  const store = storage(), bonus = model.mainMenuBonusStorageV81(store), save = narrativeSave('young-blood');
  store.values.set(model.SAVE_STORAGE_KEY, JSON.stringify(save));
  store.values.set(model.pitSaveStorageKey(save.createdAt), JSON.stringify(model.createPitSave(save.createdAt)));
  store.values.set('yautja-long-hunt.campaign-slot.1', 'original-slot');
  const originals = new Map(store.values);
  const initial = model.createPitSave(model.MAIN_MENU_BONUS_OWNER_V81);
  const outcome = model.applyPitResult(initial, { id: 'bonus-test-duel', mode: 'cpu', outcome: 'victory', fighterId: 'jungle-hunter', arenaId: 'the-pit', roundsWon: 2, roundsLost: 0, completedAt: stamp });
  const options = { storage: bonus, key: model.pitSaveStorageKey(model.MAIN_MENU_BONUS_OWNER_V81), expectedOwnerSaveCreatedAt: model.MAIN_MENU_BONUS_OWNER_V81 };
  const written = model.writePitSave(outcome.save, options);
  assert(written.persisted, written.failure);
  assert.equal(model.loadPitSave(options).save.stats.cpu.victories, 1);
  for (const [key, value] of originals) assert.equal(store.getItem(key), value, key);
  assert(store.writes.every(key => key.startsWith(model.MAIN_MENU_BONUS_PREFIX_V81)));
});
test('actual account capture excludes the free profile and keeps the campaign cloud identity unchanged', () => {
  const store = storage(), bonus = model.mainMenuBonusStorageV81(store);
  store.values.set(model.SAVE_STORAGE_KEY, JSON.stringify(model.defaultSave(stamp)));
  const before = model.captureCloudArchiveV71(store, stamp);
  bonus.setItem(model.pitSaveStorageKey(model.MAIN_MENU_BONUS_OWNER_V81), JSON.stringify(model.createPitSave(model.MAIN_MENU_BONUS_OWNER_V81)));
  bonus.setItem('reserve', JSON.stringify({ version: 1, state: model.createGameReserveV66(81) }));
  bonus.setItem('chronicle-fixture', 'separate local record');
  const after = model.captureCloudArchiveV71(store, stamp);
  assert.equal(model.cloudArchiveIdentityV71(after), model.cloudArchiveIdentityV71(before));
  assert(after.entries.every(entry => !entry.key.startsWith(model.MAIN_MENU_BONUS_PREFIX_V81)));
});

const source = fs.readFileSync('app/game/CampaignMainMenu.tsx', 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const walk = node => Array.isArray(node) ? node.flatMap(walk) : !node || typeof node !== 'object' ? [] : [node, ...walk(node.props?.children)];
function menuHarness(unlocked = false) {
  const values = [], refs = [], calls = []; let stateIndex = 0, refIndex = 0;
  const exports = {}, jsx = (type, props) => ({ type, props });
  vm.runInNewContext(compiled, { exports, require(name) {
    if (name === 'react') return { useState(initial) { const index = stateIndex++; if (!(index in values)) values[index] = initial; return [values[index], value => values[index] = typeof value === 'function' ? value(values[index]) : value]; }, useRef(initial) { return refs[refIndex++] ??= { current: initial }; }, useLayoutEffect() {}, useCallback: value => value };
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (name.includes('useMenuGamepad')) return { useMenuGamepad() {} };
    if (name.includes('mainMenuModesV81')) return model;
    return { default: {} };
  } });
  const props = { catalog: { activeSlotId: null, slots: [1, 2, 3, 4, 5].map(id => ({ id, status: 'empty', revision: 0, checkpoints: [], lastCheckpointId: null })) }, busy: false, message: null, modeAccess: { 'the-pit': unlocked, 'game-reserve': unlocked }, onOpenGameMode: (...args) => calls.push(args) };
  const render = () => { stateIndex = 0; refIndex = 0; return exports.default(props); };
  // Mount the rendered main ref, not an assumed React hook index: the menu
  // also owns refs for asynchronous import reads and confirmation focus.
  return { props, calls, render, escape(tree) { tree.props.ref.current = {}; tree.props.onKeyDown({ key: 'Escape', repeat: false, defaultPrevented: false, preventDefault() {} }); }, find: (tree, attr, value = true) => walk(tree).find(node => node.props?.[attr] === value) };
}
test('both real menu buttons warn before callbacks; cancel and Escape are reversible, confirmation is explicit', () => {
  for (const mode of ['the-pit', 'game-reserve']) {
    const ui = menuHarness(); let tree = ui.render();
    const button = ui.find(tree, 'data-main-menu-mode', mode);
    assert.equal(button.props.disabled, false);
    button.props.onClick({ currentTarget: { isConnected: false } }); tree = ui.render();
    const dialog = ui.find(tree, 'data-main-menu-spoiler', mode);
    assert.equal(dialog.props.role, 'alertdialog'); assert.equal(dialog.props['aria-modal'], 'true');
    assert(walk(tree).some(node => node.props?.inert === true)); assert.deepEqual(ui.calls, []);
    ui.find(tree, 'data-spoiler-cancel').props.onClick(); assert.equal(ui.find(ui.render(), 'data-main-menu-spoiler', mode), undefined);
    button.props.onClick({ currentTarget: { isConnected: false } }); tree = ui.render();
    ui.escape(tree); assert.equal(ui.find(ui.render(), 'data-main-menu-spoiler', mode), undefined); assert.deepEqual(ui.calls, []);
    button.props.onClick({ currentTarget: { isConnected: false } }); tree = ui.render();
    ui.find(tree, 'data-spoiler-confirm').props.onClick();
    assert.deepEqual(ui.calls, [[mode, true]]);
  }
});
test('unlocked shortcuts use the normal campaign path without an unnecessary spoiler prompt; busy buttons are disabled', () => {
  const ui = menuHarness(true); let tree = ui.render();
  ui.find(tree, 'data-main-menu-mode', 'the-pit').props.onClick({ currentTarget: {} });
  ui.find(tree, 'data-main-menu-mode', 'game-reserve').props.onClick({ currentTarget: {} });
  assert.deepEqual(ui.calls, [['the-pit', false], ['game-reserve', false]]);
  assert.equal(walk(ui.render()).some(node => node.props?.role === 'alertdialog'), false);
  ui.props.busy = true; tree = ui.render();
  assert.equal(ui.find(tree, 'data-main-menu-mode', 'the-pit').props.disabled, true);
  assert.equal(ui.find(tree, 'data-main-menu-mode', 'game-reserve').props.disabled, true);
});
