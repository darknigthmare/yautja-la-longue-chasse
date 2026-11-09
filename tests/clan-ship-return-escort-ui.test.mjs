import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { qa, escort, motion, docking, saves, clone, fixture, started, medicalApproach, medical, located, act, action, point, walk, settle } from './helpers/clan-ship-return-escort-fixture.mjs';

// Real components in SSR and real GameClient callbacks/persistence below.
// Hydration, movement inputs and pixels are covered by the separate browser recipe.
const Scene = qa.load('app/game/ClanShipReturnEscortScene.tsx');
const count = (html, attr, value) => html.split(`${attr}="${value}"`).length - 1;
const button = (html, key) => [...html.matchAll(/<button\b[^>]*>/g)].map(x => x[0]).find(tag => tag.includes(`data-return-escort-command="${key}"`));
function controls(save, position, extra = {}) {
  return renderToStaticMarkup(React.createElement(Scene.ClanShipReturnEscortControls, {
    controlled: { save, onAction: () => assert.fail('SSR cannot acknowledge progress'), onRetry: () => false, checkpointFailed: false },
    draft: save.clanShipReturnEscort ?? null, position, suspended: false, frozen: false,
    onNavigate: () => {}, onCommand: () => {}, onRetry: () => {}, onExit: () => {}, ...extra,
  }));
}
test('SSR keeps ordinary campaigns unchanged and exposes no invented return group without the actual recovery prerequisite', () => {
  const save = fixture({ recovery: false }), before = JSON.stringify(save);
  assert.equal(controls(save, { roomId: 'hangar', x: 820, y: 650 }), '');
  assert.equal(qa.render('app/game/ClanShipReturnEscortScene.tsx', { state: null, roomId: 'hangar' }), '');
  assert.equal(JSON.stringify(save), before);
});
test('SSR draws exactly two stable return identities in their actual room without duplicating recruited officers', () => {
  const save = started(), before = JSON.stringify(save), state = save.clanShipReturnEscort;
  for (const roomId of motion.CLAN_SHIP_INTERIOR_ROOM_ORDER) {
    const html = qa.render('app/game/ClanShipReturnEscortScene.tsx', { state, roomId });
    for (const actor of state.actors) assert.equal(count(html, 'data-return-escort-actor', actor.id), roomId === 'hangar' ? 1 : 0);
    assert.doesNotMatch(html, /data-clan-crew=|data-companion-avatar=|data-trophy-hearing-witness=/);
    if (roomId === 'hangar') assert.match(html, /data-return-escort-motion="translated-static-source"/);
  }
  assert.equal(JSON.stringify(save), before);
});
test('SSR explains both post choices at the real threshold and prevents a distant or unjoined confirmation', () => {
  const accepted = act(fixture(), { type: 'accept' });
  const far = controls(accepted, { roomId: 'hangar', x: 820, y: 650 });
  assert.match(button(far, 'prepare-route:medical-bed'), /disabled/);
  assert.match(far, /Rejoins le poste indiqué à pied/);
  const near = controls(accepted, { roomId: 'hangar', x: 128, y: 635 });
  for (const key of ['prepare-route:medical-bed', 'prepare-route:medical-terminal']) {
    assert.doesNotMatch(button(near, key), /disabled/);
    assert.match(button(near, key), /aria-describedby=/);
  }
  const waiting = controls(started(), { roomId: 'hangar', x: 128, y: 635 });
  assert.match(button(waiting, 'transfer-room'), /disabled/);
  assert.match(waiting, /Attends toute l’équipe au seuil/);
});
test('SSR freezes confirmations after an unacknowledged write while retaining a separate retry and the bounded resumption explanation', () => {
  const save = started(), html = controls(save, { roomId: 'hangar', x: 128, y: 635 }, { frozen: true });
  assert.match(html, /data-return-escort-frozen="true"/);
  assert.match(button(html, 'transfer-room'), /disabled/);
  assert.match(html, /data-return-escort-retry/); assert.match(html, /role="alert"/);
  assert.match(html, /au plus une seconde/);
  assert.doesNotMatch([...html.matchAll(/<button\b[^>]*>/g)].map(x => x[0]).find(x => x.includes('data-return-escort-retry')), /disabled/);
});
test('SSR first guides a reloaded or distant player back to the safely waiting group instead of away toward the threshold', () => {
  const save = started();
  for (const position of [{ roomId: 'hangar', x: 240, y: 645 }, { roomId: 'archives', x: 790, y: 645 }]) {
    const html = controls(save, position);
    assert.match(html, /data-return-escort-guide-target="regroup"/);
    assert.match(html, /Rejoindre l’équipe arrêtée/);
    assert.match(html, /Rejoins-la avant de reprendre/);
  }
  assert.match(controls(save, { roomId: 'hangar', x: 820, y: 650 }), /data-return-escort-guide-target="step"/);
});
test('SSR preserves the medical group while the player reports alone at the council, with no new reward promise', () => {
  const save = act(medical(), { type: 'report' }), state = save.clanShipReturnEscort;
  const medicalHtml = qa.render('app/game/ClanShipReturnEscortScene.tsx', { state, roomId: 'soins' });
  const councilHtml = qa.render('app/game/ClanShipReturnEscortScene.tsx', { state, roomId: 'conseil' });
  assert.equal(count(medicalHtml, 'data-return-escort-actor', 'return-alpha'), 1);
  assert.equal(count(medicalHtml, 'data-return-escort-actor', 'return-beta'), 1);
  assert.equal(councilHtml, '');
  assert.match(controls(save, { roomId: 'conseil', x: 740, y: 650 }), /ni soin gratuit, ni monnaie, ni recrutement/);
});

const source = fs.readFileSync('app/game/GameClient.tsx', 'utf8');
const ast = ts.createSourceFile('GameClient.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function callback(name, environment) {
  let declaration;
  const visit = node => { if (ts.isVariableDeclaration(node) && node.name.getText(ast) === name) declaration = node; else ts.forEachChild(node, visit); };
  visit(ast); assert.ok(declaration, `actual ${name} callback exists`);
  const code = ts.transpileModule(`const handler = ${declaration.initializer.arguments[0].getText(ast)}; return handler;`,
    { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  // The ordinary application uses one realm. Keep the genuine plain-object
  // validators in that same realm instead of weakening them for a VM fixture.
  return new Function(...Object.keys(environment), code)(...Object.values(environment));
}
function client(initial) {
  const values = new Map(), disk = { quota: false, uncertain: false, denyRead: false,
    get length() { return values.size; }, key: i => [...values.keys()][i] ?? null,
    getItem(key) { if (key === saves.SAVE_STORAGE_KEY && this.denyRead) { this.denyRead = false; throw Error('readback'); } return values.get(key) ?? null; },
    setItem(key, value) { if (this.quota && key === saves.SAVE_STORAGE_KEY) throw new DOMException('full', 'QuotaExceededError');
      values.set(key, value); if (key === saves.SAVE_STORAGE_KEY && this.uncertain) { this.uncertain = false; this.denyRead = true; } },
    removeItem: key => values.delete(key),
  };
  const written = saves.writeSaveWithStatus(initial, disk); assert.equal(written.persisted, true, written.failure);
  const state = { failure: null, published: [], toasts: [] };
  const env = {
    sessionAliveRef: { current: true }, saveRef: { current: written.save }, entry: { ownerCreatedAt: initial.createdAt },
    screen: 'clan-ship', gameFocusedV89: true, settingsOpen: false, trophyWorkshop: null,
    archiveTransferBusy: false, archiveRecoveryIssue: null, campaignSaveBusy: false, resumableHunt: null,
    activeHuntSessionRef: { current: null }, pendingTrophyCommitRef: { current: null }, pendingTerminalRunRef: { current: null },
    pendingSocialWriteRef: { current: null }, actClanShipReturnEscort: escort.actClanShipReturnEscort,
    isExplorationMission: () => assert.fail('no hunt is active'), explorationWriteFailure: () => assert.fail('no exploration write'),
    reconcileHuntWrite: () => assert.fail('no hunt write'),
    writeSaveWithStatus: save => saves.writeSaveWithStatus(save, disk),
    reconcileSaveWrite: (attempt, owner) => saves.reconcileSaveWrite(attempt, owner, disk),
    setSaveFailure: value => { state.failure = value; }, setSave: save => state.published.push(save), setToast: value => state.toasts.push(value),
  };
  env.persistSocialProgress = callback('persistSocialProgress', env);
  return { env, state, disk, values, run: (command, observation) => callback('commitClanShipReturnEscort', env)(action(env.saveRef.current, command), observation),
    retry: () => callback('retryClanShipReturnEscort', env)() };
}
test('the actual GameClient acknowledgement writes threshold docking and group in one real save', () => {
  const moved = walk(started(), motion.CLAN_SHIP_INTERIOR_ROOMS.hangar.servicePoint, { x: 128, y: 635 });
  const current = settle(moved.save, moved.leader), c = client(current);
  assert.equal(c.run({ type: 'transfer-room', roomId: 'soins' }, point('hangar', moved.leader)), true);
  const stored = JSON.parse(c.values.get(saves.SAVE_STORAGE_KEY));
  assert.equal(stored.clanShipDocking.roomId, 'soins'); assert.ok(stored.clanShipReturnEscort.actors.every(actor => actor.roomId === 'soins'));
  assert.deepEqual(stored.profile, current.profile); assert.deepEqual(stored.inventory, current.inventory);
});
test('the actual GameClient scene/owner guards reject commands without publishing any campaign', () => {
  for (const mutate of [
    e => { e.sessionAliveRef.current = false; }, e => { e.entry.ownerCreatedAt = 'foreign'; }, e => { e.screen = 'deck'; },
    e => { e.gameFocusedV89 = false; }, e => { e.settingsOpen = true; }, e => { e.trophyWorkshop = {}; },
    e => { e.archiveTransferBusy = true; }, e => { e.archiveRecoveryIssue = {}; }, e => { e.campaignSaveBusy = true; },
    e => { e.resumableHunt = {}; }, e => { e.activeHuntSessionRef.current = {}; },
    e => { e.saveRef.current = { ...e.saveRef.current, planetArrival: {} }; },
    e => { e.saveRef.current = { ...e.saveRef.current, buriedCradle: { status: 'active' } }; },
  ]) {
    const c = client(fixture()), before = c.values.get(saves.SAVE_STORAGE_KEY); mutate(c.env);
    assert.equal(c.run({ type: 'accept' }, { roomId: 'hangar', x: 820, y: 650 }), false);
    assert.equal(c.state.published.length, 0); assert.equal(c.values.get(saves.SAVE_STORAGE_KEY), before);
  }
});
test('quota refusal preserves the confirmed group and retry writes no extra movement', () => {
  const c = client(started()), before = clone(c.env.saveRef.current), leader = { roomId: 'hangar', x: 750, y: 650 };
  c.disk.quota = true;
  assert.equal(c.run({ type: 'advance', frames: [{ seconds: 0.05, leader }] }, leader), false);
  assert.deepEqual(c.env.saveRef.current, before); assert.equal(c.state.published.length, 0);
  c.disk.quota = false; assert.equal(c.retry(), true);
  assert.deepEqual(c.env.saveRef.current.clanShipReturnEscort, before.clanShipReturnEscort);
});
test('uncertain advancement is reconciled separately from a different proposal, so the UI cannot acknowledge the wrong positions', () => {
  const c = client(started()), original = clone(c.env.saveRef.current), leader = { roomId: 'hangar', x: 750, y: 650 };
  const first = { type: 'advance', frames: [{ seconds: 0.05, leader }] };
  const expected = escort.actClanShipReturnEscort(action(original, first), { save: original, active: true, observation: leader }).state;
  c.disk.uncertain = true; assert.equal(c.run(first, leader), false);
  assert.ok(c.env.pendingSocialWriteRef.current); assert.deepEqual(c.env.saveRef.current, original);
  const secondLeader = { roomId: 'hangar', x: 920, y: 660 };
  assert.equal(c.run({ type: 'advance', frames: [{ seconds: 0.05, leader: secondLeader }] }, secondLeader), false);
  assert.equal(c.env.pendingSocialWriteRef.current, null); assert.deepEqual(c.env.saveRef.current.clanShipReturnEscort, expected);
  assert.equal(c.state.failure, null);
});
test('legacy room changes cannot bypass the escorted threshold callback', () => {
  const c = client(started());
  assert.equal(callback('commitClanShipAction', c.env)({ type: 'move-room', roomId: 'soins' }), false);
  assert.equal(c.state.published.length, 0); assert.equal(c.env.saveRef.current.clanShipDocking.roomId, 'hangar');
});
test('the actual legacy doorway still lets a player rejoin a medical group after leaving its room or ship', () => {
  const source = medicalApproach().save;
  const current = located(source, 'hangar');
  assert.ok(saves.parseSaveImport(saves.exportSave(current)).save, 'outside-room resumption is a valid real save');
  const c = client(current);
  Object.assign(c.env, {
    loadShipProgression: qa.load('app/game/systems/progression.ts').loadShipProgression,
    normalizeClanShipDocking: docking.normalizeClanShipDocking, actClanShipDocking: docking.actClanShipDocking,
    setSelectedShipId: () => {}, setHubLocation: () => {}, setScreen: () => {},
  });
  assert.equal(callback('commitClanShipAction', c.env)({ type: 'move-room', roomId: 'soins' }), true);
  assert.equal(c.env.saveRef.current.clanShipDocking.roomId, 'soins');
  assert.deepEqual(c.env.saveRef.current.clanShipReturnEscort, current.clanShipReturnEscort);
  assert.equal(callback('commitClanShipAction', c.env)({ type: 'move-room', roomId: 'trophees' }), true,
    'the player may leave a safely waiting medical group before its final confirmation');
  assert.equal(c.env.saveRef.current.clanShipDocking.roomId, 'trophees');
  assert.deepEqual(c.env.saveRef.current.clanShipReturnEscort, current.clanShipReturnEscort);
});
