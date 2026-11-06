import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';
import ts from 'typescript';

// Run the production state machine and Canvas host. The only adaptation is an
// in-memory export of their existing functions; no gameplay is reimplemented.
const sourceUrl = new URL('../app/game/HuntCanvas.tsx', import.meta.url);
const source = await readFile(sourceUrl, 'utf8');
const ast = ts.createSourceFile('HuntCanvas.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const bundled = await build({
  stdin: {
    contents: `${source.replace('export default function HuntCanvas', 'function HuntCanvas')}
export { makeGameState, makeEnemy, stepGame, commandHuntPod, updateHuntPodRecovery, updateRegularEnemy,
  podSafetyInput, applyHuntInsertion, captureCheckpoint, restoreCheckpoint, snapshot, persistencePayloadFor,
  serializeActiveHuntCheckpoint, deserializeActiveHuntCheckpoint, HUNT_CONTROL_ACTIONS,
  matchingControlActions, isHeldKeyboardAction };
export * from './systems/huntPodRecovery';
export { cloneHuntInsertion, restoreHuntInsertion } from './systems/huntInsertion';
export { WORLD_BLUEPRINTS_BY_MISSION } from './systems/worldBlueprints';
export { DEFAULT_CONTROL_BINDINGS } from './systems/controlBindings';
export { createAiBrain } from './systems/huntSystems';
export { defaultSave } from './save';
export { MISSION_BY_ID } from './data';
export const deserializeStoredCheckpoint = serialized => deserializeActiveHuntCheckpoint(JSON.parse(serialized));
export const testPlan = (method='pod', team='solo') => ({version:1,method,team});`,
    resolveDir: fileURLToPath(new URL('../app/game/', import.meta.url)),
    sourcefile: fileURLToPath(sourceUrl), loader: 'tsx',
  },
  bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic',
  loader: { '.module.css': 'empty' }, external: ['react', 'react/jsx-runtime', 'react-dom'], logLevel: 'silent',
});
const browser = { hidden: false, focused: true };
const compiled = { exports: {} };
runInNewContext(bundled.outputFiles[0].text, {
  module: compiled, exports: compiled.exports, require: createRequire(import.meta.url),
  document: { get hidden() { return browser.hidden; }, hasFocus: () => browser.focused },
  navigator: { getGamepads: () => [] },
});
const r = compiled.exports;
// Exercise the real campaign writer, active-hunt sidecar and complete archive
// in the host realm. Only serialized JSON crosses the Canvas VM boundary.
const persistenceBundle = await build({
  stdin: {
    contents: `export { defaultSave, SAVE_STORAGE_KEY, writeSaveWithStatus, loadSaveWithStatus } from './save';
export * from './systems/activeHuntSave';
export * from './systems/completeArchive';`,
    resolveDir: fileURLToPath(new URL('../app/game/', import.meta.url)), loader: 'ts',
  },
  bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent',
});
const persistence = await import('data:text/javascript;base64,' + Buffer.from(persistenceBundle.outputFiles[0].text).toString('base64'));
const plain = value => JSON.parse(JSON.stringify(value));
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);
const cfg = r.HUNT_POD_RECOVERY;
const solo = r.testPlan(), trio = r.testPlan('pod', 'triad');
const anchors = [{ id: 'hunter', x: 0, y: 0 }];
const body = (x = 600, extra = {}) => ({ x, y: -116, width: 72, height: 116, health: 100, ...extra });
const input = (player = body(), companions = []) => ({ player, companions, operational: true });
const fresh = () => r.createHuntPodRecovery(solo);
const sounds = (state, id) => state.soundEvents.filter(sound => sound === id).length;

function handler(name, environment) {
  let declaration;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === name) declaration = node;
    else ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.ok(declaration, `production ${name} handler must exist`);
  const code = ts.transpileModule(`const handler = ${declaration.initializer.getText(ast)};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;
  return runInNewContext(`(() => { ${code}; return handler; })()`, environment);
}

function fixture(team = 'solo', method = 'pod', missionId = 'jungle-vey', encounterRun = 'pod-recovery-qa', runId = 'pod-recovery-run') {
  browser.hidden = false; browser.focused = true;
  const save = r.defaultSave('2026-11-05T00:00:00.000Z'), mission = r.MISSION_BY_ID[missionId];
  const state = r.makeGameState(mission, save.loadout, save.inventory, 'hunter', save.appearance, false, false,
    encounterRun, save.exploration, r.testPlan(method, team), runId, 'wolf-ship');
  const controls = { keyboardHeld: new Set(), touchHeld: new Set(), gamepadHeld: new Set(), pressed: new Set(),
    previousGamepadButtons: [], activeGamepadIndex: null, gamepadNeedsNeutral: true, gamepadDialogActions: [], pointerScreen: null };
  const environment = { ...r, input: controls, activeBindings: r.DEFAULT_CONTROL_BINDINGS, Element: class Element {} };
  environment.isInteractiveControl = handler('isInteractiveControl', environment);
  const onKeyDown = handler('onKeyDown', environment);
  const press = (repeat = false) => onKeyDown({ code: 'KeyX', key: 'x', repeat, defaultPrevented: false,
    ctrlKey: false, altKey: false, metaKey: false, target: null, preventDefault() { this.defaultPrevented = true; } });
  const f = { save, mission, state, controls, press,
    step: (delta = 1 / 60) => r.stepGame(f.state, f.mission, f.save.loadout, f.save.inventory, f.save.appearance,
      'hunter', f.controls, delta, () => {}),
  };
  return f;
}

function storageFrom(entries = []) {
  const data = new Map(entries);
  return { data, getItem: key => data.get(key) ?? null,
    setItem: (key, value) => { data.set(key, value); }, removeItem: key => { data.delete(key); } };
}

function durableFixture(team = 'solo') {
  const f = fixture(team, 'pod', 'jungle-vey', 0);
  const storage = storageFrom();
  const result = persistence.writeSaveWithStatus(plain(f.save), storage);
  assert.equal(result.persisted, true, result.failure);
  f.save = result.save;
  return { f, storage };
}

function savedHunt(f, sequence, runId = 'pod-recovery-run') {
  const payload = plain(r.persistencePayloadFor(f.state));
  assert.ok(payload);
  return {
    version: persistence.ACTIVE_HUNT_SAVE_VERSION, runtimeRevision: persistence.ACTIVE_HUNT_RUNTIME_REVISION,
    ownerSaveCreatedAt: f.save.createdAt, missionId: f.mission.id, difficultyId: 'hunter',
    encounterRun: f.save.missionProgress[f.mission.id].attempts, runId, sequence,
    startedAt: f.save.createdAt, savedAt: new Date(Date.parse(f.save.createdAt) + sequence * 1000).toISOString(),
    configuration: plain({ inventory: f.save.inventory, loadout: f.save.loadout, appearance: f.save.appearance,
      visualOptions: { screenShake: f.save.settings.screenShake, reducedGore: f.save.settings.reducedGore,
        highContrastVision: f.save.settings.highContrastVision }, elapsedSeconds: payload.elapsed,
      insertion: f.state.insertion.plan, insertionShipId: f.state.insertionShipId }),
    snapshot: payload.snapshot, retryCheckpoint: payload.retryCheckpoint,
  };
}

function reloadDurableHunt(storage, runId) {
  const campaign = persistence.loadSaveWithStatus(storage);
  assert.equal(campaign.loaded, true, campaign.failure);
  const result = persistence.loadActiveHuntSave({ storage, compatibility: {
    ownerSaveCreatedAt: campaign.save.createdAt, missionId: 'jungle-vey', difficultyId: 'hunter',
    encounterRun: campaign.save.missionProgress['jungle-vey'].attempts, missionAvailable: true,
  } });
  assert.equal(result.loaded, true, result.failure);
  const claimed = persistence.claimActiveHuntSave(result.save, runId, { storage });
  assert.equal(claimed.persisted, true, claimed.failure);
  const active = claimed.save;
  const decoded = r.deserializeStoredCheckpoint(JSON.stringify(active.snapshot));
  assert.ok(decoded);
  const f = fixture(active.configuration.insertion.team, 'pod', active.missionId, active.encounterRun, active.runId);
  f.save = campaign.save;
  f.state = r.restoreCheckpoint(f.state, decoded.checkpoint, 'resume');
  assert.equal(f.state.elapsed, active.configuration.elapsedSeconds);
  assert.equal(f.state.paused, true);
  assert.deepEqual(plain(f.state.insertion.podRecovery), active.snapshot.checkpoint.insertion.podRecovery);
  return { f, active };
}

function clearArena(f) {
  f.state.world = { ...f.state.world, platforms: [], covers: [], hazards: [], climbables: [] };
  f.state.enemies = []; f.state.noiseEvents = []; f.state.tracks = []; f.state.scentNodes = [];
  f.state.insertion.alertedIds = []; f.state.insertion.patrolIds = [];
}

function moveSafely(f) {
  const pods = r.huntPodAnchors(f.state.insertion.plan, f.state.world);
  f.state.player.x = Math.max(...pods.map(pod => pod.x)) + cfg.safeRadius + 120;
  f.state.player.y = f.state.world.floorY - f.state.player.height;
  f.state.player.velocityX = 0; f.state.player.velocityY = 0; f.state.player.grounded = true;
  for (const [index, member] of f.state.insertion.companions.entries()) {
    member.x = f.state.player.x + 120 * (index + 1); member.order = 'hold';
  }
}

function tickPod(f, seconds) {
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    f.state.elapsed += 1 / 60;
    r.updateHuntPodRecovery(f.state, 1 / 60);
  }
}

test('all eight worlds create one or three persistent pod anchors; ship insertion creates none', () => {
  for (const world of Object.values(r.WORLD_BLUEPRINTS_BY_MISSION)) {
    for (const plan of [solo, trio]) {
      const result = r.huntPodAnchors(plan, world), origin = Math.max(22, world.spawn.x - 96);
      assert.equal(result.length, plan.team === 'solo' ? 1 : 3);
      assert.deepEqual(plain(result.map(pod => pod.x)), plan.team === 'solo' ? [origin] : [origin, origin + 160, origin + 320]);
      assert.ok(result.every(pod => pod.y === world.floorY));
      assert.equal(new Set(result.map(pod => pod.id)).size, result.length);
    }
    assert.deepEqual(plain(r.huntPodAnchors(r.testPlan('ship', 'triad'), world)), []);
  }
  assert.equal(r.createHuntPodRecovery(r.testPlan('ship', 'triad')), undefined);
});

test('safety uses the closest part of the body, including exact safe-radius boundaries', () => {
  assert.equal(r.huntPodSafety(fresh(), anchors, input(body(cfg.safeRadius - 1))).reason, 'unsafe-player');
  assert.equal(r.huntPodSafety(fresh(), anchors, input(body(cfg.safeRadius))).canArm, true);
  assert.equal(r.huntPodSafety(fresh(), anchors, input(body(-cfg.safeRadius - 72))).canArm, true);
  assert.equal(r.huntPodSafety(fresh(), anchors, input(body(-cfg.safeRadius - 71))).reason, 'unsafe-player');
  close(r.huntPodBodyDistance(anchors[0], body(300, { y: -516 })), 500);
});

test('arming checks every capsule and every ally, including downed or left-behind hunters', () => {
  const pods = [...anchors, { id: 'karhek', x: 160, y: 0 }, { id: 'saketh', x: 320, y: 0 }];
  assert.equal(r.huntPodSafety(fresh(), pods, input(body(500))).reason, 'unsafe-player');
  for (const status of ['active', 'downed', 'boarding', 'left-behind']) {
    const ally = { ...body(200), id: 'saketh', status };
    const result = r.huntPodSafety(fresh(), pods, input(body(900), [ally]));
    assert.equal(result.reason, 'unsafe-companion'); assert.equal(result.blockedMemberId, 'saketh');
  }
  assert.equal(r.huntPodSafety(fresh(), pods, input(body(900), [{ ...body(200), id: 'karhek', status: 'extracted' }])).canArm, true);
});

test('the radio must reach the farthest pod, even when the nearest pod is reachable', () => {
  const pods = [...anchors, { id: 'saketh', x: 320, y: 0 }];
  const player = body(2_500);
  assert.ok(Math.hypot(player.x + 36 - 320, -58) < cfg.radioRange);
  assert.equal(r.huntPodSafety(fresh(), pods, input(player)).reason, 'out-of-range');
  assert.equal(r.commandHuntPodRecovery(fresh(), pods, input(player)).event, 'blocked');
});

test('walking across the real radio boundary cancels once and returning does not rearm the pod', () => {
  const f = fixture();
  const pods = r.huntPodAnchors(f.state.insertion.plan, f.state.world), player = f.state.player;
  player.y = f.state.world.floorY - player.height;
  player.x = pods[0].x + Math.sqrt(cfg.radioRange ** 2 - (player.height / 2) ** 2) - player.width / 2 - 2;
  player.velocityX = 0; player.velocityY = 0; player.grounded = true;
  const safety = () => r.huntPodSafety(f.state.insertion.podRecovery, pods, r.podSafetyInput(f.state));
  assert.equal(safety().canArm, true);
  assert.equal(r.commandHuntPod(f.state), true);
  const startX = player.x;
  f.controls.keyboardHeld.add('right');
  for (let i = 0; i < 30 && f.state.insertion.podRecovery.phase === 'countdown'; i++) f.step();
  assert.ok(player.x > startX, 'production movement must cross the boundary');
  assert.ok(safety().radioDistance > cfg.radioRange);
  assert.equal(f.state.insertion.podRecovery.phase, 'ready');
  assert.equal(sounds(f.state, 'pod-cancel'), 1); assert.equal(sounds(f.state, 'pod-detonate'), 0);
  f.controls.keyboardHeld.delete('right'); f.controls.keyboardHeld.add('left');
  for (let i = 0; i < 60 && safety().radioDistance > cfg.radioRange; i++) f.step();
  assert.equal(safety().canArm, true);
  f.controls.keyboardHeld.clear();
  for (let i = 0; i < 15; i++) f.step();
  assert.equal(f.state.insertion.podRecovery.phase, 'ready');
  assert.equal(sounds(f.state, 'pod-cancel'), 1); assert.equal(sounds(f.state, 'pod-arm'), 1);
  assert.equal(r.commandHuntPod(f.state), true);
  assert.equal(f.state.insertion.podRecovery.remainingSeconds, cfg.countdownSeconds);
});

test('invalid bodies, missing pods and non-operational hunters cannot arm', () => {
  for (const player of [body(NaN), body(600, { y: Infinity }), body(600, { width: 0 }), body(600, { height: -1 }),
    body(600, { health: 0 }), body(600, { health: NaN })]) {
    assert.equal(r.commandHuntPodRecovery(fresh(), anchors, input(player)).event, 'blocked');
  }
  assert.equal(r.commandHuntPodRecovery(fresh(), anchors, { ...input(), operational: false }).event, 'blocked');
  assert.equal(r.commandHuntPodRecovery(fresh(), [], input()).event, 'blocked');
  assert.equal(r.commandHuntPodRecovery(undefined, anchors, input()).event, 'blocked');
  assert.equal(r.commandHuntPodRecovery(fresh(), [{ ...anchors[0], x: NaN }], input()).event, 'blocked');
  assert.equal(r.huntPodSafety(fresh(), anchors, input(body(), [{ ...body(NaN), id: 'karhek', status: 'active' }])).reason, 'unsafe-companion');
});

test('the countdown requires three active seconds, fires once and stays destroyed', () => {
  const state = fresh();
  assert.equal(r.commandHuntPodRecovery(state, anchors, input()).event, 'armed');
  for (let i = 1; i < 180; i++) assert.equal(r.stepHuntPodRecovery(state, anchors, input(), 1 / 60, i / 60).event, 'none');
  assert.equal(state.phase, 'countdown');
  assert.equal(r.stepHuntPodRecovery(state, anchors, input(), 1 / 60, 3).event, 'detonated');
  assert.equal(state.phase, 'destroyed'); assert.equal(state.remainingSeconds, 0); assert.equal(state.destroyedAt, 3);
  for (let i = 0; i < 60; i++) assert.equal(r.stepHuntPodRecovery(state, anchors, input(), 1 / 60, 4).event, 'none');
  assert.equal(r.commandHuntPodRecovery(state, anchors, input()).reason, 'destroyed');
});

test('a second press cancels immediately; a later deliberate press starts a fresh full countdown', () => {
  const state = fresh();
  r.commandHuntPodRecovery(state, anchors, input());
  r.stepHuntPodRecovery(state, anchors, input(), .1, .1);
  assert.equal(r.commandHuntPodRecovery(state, anchors, { ...input(), operational: false }).event, 'cancelled');
  assert.deepEqual(plain(state), plain(fresh()));
  assert.equal(r.commandHuntPodRecovery(state, anchors, input()).event, 'armed');
  assert.equal(state.remainingSeconds, 3);
});

test('the last tick cancels if the player, an ally, or radio link becomes unsafe', () => {
  const cases = [
    { safety: input(body(359)), reason: 'unsafe-player' },
    { safety: input(body(), [{ ...body(100), id: 'karhek', status: 'downed' }]), reason: 'unsafe-companion' },
    { safety: input(body(3_000)), reason: 'out-of-range' },
    { safety: { ...input(), operational: false }, reason: 'unavailable' },
  ];
  for (const { safety, reason } of cases) {
    const state = fresh(); r.commandHuntPodRecovery(state, anchors, input()); state.remainingSeconds = .001;
    assert.deepEqual(plain(r.stepHuntPodRecovery(state, anchors, safety, 1 / 60, 3)), { event: 'cancelled', reason });
    assert.deepEqual(plain(state), plain(fresh()));
  }
});

test('invalid or stalled time cannot consume a countdown, and a delayed tick is bounded', () => {
  const state = fresh(); r.commandHuntPodRecovery(state, anchors, input());
  for (const [delta, elapsed] of [[0, 1], [-1, 1], [NaN, 1], [Infinity, 1], [.1, NaN], [.1, -1], [.1, Infinity]]) {
    assert.equal(r.stepHuntPodRecovery(state, anchors, input(), delta, elapsed).event, 'none');
    assert.equal(state.remainingSeconds, 3);
  }
  assert.equal(r.stepHuntPodRecovery(state, anchors, input(), 60, 60).event, 'none');
  close(state.remainingSeconds, 2.9);
});

test('archive validation rejects future versions, impossible phases, malformed timers and duplicate enemy IDs', () => {
  const invalid = [null, [], { ...fresh(), version: 2 }, { ...fresh(), phase: 'unknown' },
    { ...fresh(), phase: 'countdown' }, { ...fresh(), remainingSeconds: .1 },
    { ...fresh(), phase: 'countdown', remainingSeconds: 3.1 }, { ...fresh(), phase: 'countdown', remainingSeconds: NaN },
    { ...fresh(), phase: 'destroyed' }, { ...fresh(), destroyedAt: 2 }, { ...fresh(), alertedIds: ['enemy'] },
    { ...fresh(), phase: 'destroyed', destroyedAt: -1 }, { ...fresh(), phase: 'destroyed', destroyedAt: Infinity },
    { ...fresh(), phase: 'destroyed', destroyedAt: 4, alertedIds: ['enemy', 'enemy'] },
    { ...fresh(), phase: 'destroyed', destroyedAt: 4, alertedIds: [''] },
  ];
  for (const value of invalid) assert.equal(r.restoreHuntPodRecovery(value, solo), null, JSON.stringify(value));
  assert.equal(r.restoreHuntPodRecovery(fresh(), r.testPlan('ship')), null);
  assert.equal(r.restoreHuntPodRecovery(undefined, solo), undefined);
  const original = { ...fresh(), phase: 'destroyed', destroyedAt: 8, alertedIds: ['guard'] };
  const restored = r.restoreHuntPodRecovery(original, solo), clone = r.cloneHuntPodRecovery(original);
  original.alertedIds.push('other');
  assert.deepEqual(plain(restored.alertedIds), ['guard']); assert.deepEqual(plain(clone.alertedIds), ['guard']);
});

test('real keyboard X arms once, ignores auto-repeat, and a fresh press cancels', () => {
  const f = fixture(); clearArena(f); moveSafely(f);
  f.press(); f.step();
  assert.equal(f.state.insertion.podRecovery.phase, 'countdown');
  assert.equal(sounds(f.state, 'pod-arm'), 1);
  f.press(true); f.step();
  assert.equal(f.state.insertion.podRecovery.phase, 'countdown');
  assert.equal(sounds(f.state, 'pod-arm'), 1); assert.equal(sounds(f.state, 'pod-cancel'), 0);
  f.press(); f.step();
  assert.equal(f.state.insertion.podRecovery.phase, 'ready'); assert.equal(sounds(f.state, 'pod-cancel'), 1);
});

test('the real simulation freezes the countdown during pause and focus loss and does not queue X', () => {
  const f = fixture(); clearArena(f); moveSafely(f);
  f.press(); f.step();
  const remaining = f.state.insertion.podRecovery.remainingSeconds, elapsed = f.state.elapsed;
  f.state.paused = true; f.press();
  for (let i = 0; i < 240; i++) f.step();
  assert.equal(f.state.insertion.podRecovery.remainingSeconds, remaining); assert.equal(f.state.elapsed, elapsed);
  f.state.paused = false; browser.hidden = true; f.step();
  assert.equal(f.state.paused, true); assert.equal(f.state.insertion.podRecovery.remainingSeconds, remaining);
  browser.hidden = false; f.state.paused = false; f.step();
  assert.equal(f.state.insertion.podRecovery.phase, 'countdown');
  close(f.state.insertion.podRecovery.remainingSeconds, remaining - 1 / 60);
});

test('the Canvas host aborts an armed pod when an ally returns and emits only one cancellation', () => {
  const f = fixture('triad'); moveSafely(f);
  assert.equal(r.commandHuntPod(f.state), true); tickPod(f, 2.5);
  const ally = f.state.insertion.companions[1];
  ally.x = r.huntPodAnchors(trio, f.state.world)[2].x;
  tickPod(f, 1);
  assert.equal(f.state.insertion.podRecovery.phase, 'ready'); assert.equal(sounds(f.state, 'pod-cancel'), 1);
  assert.equal(sounds(f.state, 'pod-detonate'), 0); assert.match(f.state.message, /Sa’keth/);
});

test('extraction, ritual, and death stop an armed pod before it can detonate', () => {
  for (const alter of [state => { state.phase = 'extraction'; }, state => { state.trophyExtracting = true; },
    state => { state.riteMenuCorpseId = 'corpse-test'; }, state => { state.player.health = 0; state.phase = 'dead'; }]) {
    const f = fixture(); moveSafely(f); r.commandHuntPod(f.state);
    f.state.insertion.podRecovery.remainingSeconds = .001; alter(f.state); r.updateHuntPodRecovery(f.state, 1 / 60);
    assert.equal(f.state.insertion.podRecovery.phase, 'ready'); assert.equal(sounds(f.state, 'pod-detonate'), 0);
  }
});

test('a real paused checkpoint round-trip retains the countdown and its detached pod state', () => {
  const f = fixture(); moveSafely(f); r.commandHuntPod(f.state); tickPod(f, 1.25); f.state.paused = true;
  const payload = r.persistencePayloadFor(f.state); assert.ok(payload);
  const decoded = r.deserializeActiveHuntCheckpoint(payload.snapshot); assert.ok(decoded);
  const restored = r.restoreCheckpoint(fixture().state, decoded.checkpoint, 'resume');
  assert.equal(restored.paused, true); close(restored.insertion.podRecovery.remainingSeconds, 1.75);
  assert.equal(restored.elapsed, f.state.elapsed);
  const copy = r.cloneHuntInsertion(restored.insertion);
  copy.podRecovery.remainingSeconds = .1;
  close(restored.insertion.podRecovery.remainingSeconds, 1.75);
  restored.paused = false;
  const resumed = { ...f, state: restored }; tickPod(resumed, 1.75);
  assert.equal(restored.insertion.podRecovery.phase, 'destroyed'); assert.equal(sounds(restored, 'pod-detonate'), 1);
});

test('campaign storage preserves an interrupted pod countdown and a claimed resume rejects the old session', () => {
  const { f, storage } = durableFixture();
  moveSafely(f); r.commandHuntPod(f.state); tickPod(f, 1.25); f.state.paused = true;
  const candidate = savedHunt(f, 1);
  assert.equal(persistence.writeActiveHuntSave(candidate, { storage }).persisted, true);
  const campaignBytes = storage.getItem(persistence.SAVE_STORAGE_KEY);
  const activeBytes = storage.getItem(persistence.ACTIVE_HUNT_STORAGE_KEY);

  // A denied autosave must leave the previous resumable countdown intact.
  const denied = { ...storage, setItem() { throw new Error('QuotaExceededError'); } };
  const failed = persistence.writeActiveHuntSave(savedHunt(f, 2), { storage: denied });
  assert.equal(failed.persisted, false); assert.equal(failed.failure, 'write-failed');
  assert.equal(storage.getItem(persistence.ACTIVE_HUNT_STORAGE_KEY), activeBytes);
  assert.equal(storage.getItem(persistence.SAVE_STORAGE_KEY), campaignBytes);

  // Start again from bytes only, with a new runtime and session owner.
  const reopened = storageFrom([...storage.data]);
  const { f: resumed, active } = reloadDurableHunt(reopened, 'pod-resumed-session');
  close(resumed.state.insertion.podRecovery.remainingSeconds, 1.75);
  for (let i = 0; i < 240; i++) resumed.step();
  close(resumed.state.insertion.podRecovery.remainingSeconds, 1.75);
  close(resumed.state.elapsed, 1.25);
  const claimedBytes = reopened.getItem(persistence.ACTIVE_HUNT_STORAGE_KEY);
  const stale = persistence.writeActiveHuntSave(savedHunt(f, 3), { storage: reopened });
  assert.equal(stale.persisted, false); assert.equal(stale.failure, 'stale-run');
  assert.equal(reopened.getItem(persistence.ACTIVE_HUNT_STORAGE_KEY), claimedBytes);

  resumed.state.paused = false; tickPod(resumed, 1.75);
  assert.equal(resumed.state.insertion.podRecovery.phase, 'destroyed');
  assert.equal(sounds(resumed.state, 'pod-detonate'), 1);
  const destroyed = savedHunt(resumed, active.sequence + 1, active.runId);
  assert.equal(persistence.writeActiveHuntSave(destroyed, { storage: reopened }).persisted, true);
  const { f: finalResume } = reloadDurableHunt(storageFrom([...reopened.data]), 'pod-final-session');
  const expected = plain(resumed.state.insertion.podRecovery);
  finalResume.state.paused = false; tickPod(finalResume, 4);
  assert.deepEqual(plain(finalResume.state.insertion.podRecovery), expected);
  assert.equal(sounds(finalResume.state, 'pod-detonate'), 0);
  assert.equal(r.commandHuntPod(finalResume.state), false);
});

test('complete campaign export and import retain armed and destroyed triad pods through the live decoder', () => {
  const { f, storage } = durableFixture('triad');
  moveSafely(f); r.commandHuntPod(f.state); tickPod(f, .75);
  for (const [index, phase] of ['countdown', 'destroyed'].entries()) {
    if (phase === 'destroyed') tickPod(f, 2.25);
    assert.equal(f.state.insertion.podRecovery.phase, phase);
    assert.equal(persistence.writeActiveHuntSave(savedHunt(f, index + 1), { storage }).persisted, true);
    const sourceBytes = [...storage.data];
    const exported = persistence.createCompleteArchive(f.save, storage, f.save.createdAt);
    assert.deepEqual(exported.warnings, []); assert.deepEqual([...storage.data], sourceBytes);
    const parsed = persistence.parseCompleteArchive(exported.serialized);
    assert.ok(parsed.archive, parsed.failure);
    const destination = storageFrom();
    const oldCampaign = persistence.defaultSave('2026-11-04T00:00:00.000Z');
    assert.equal(persistence.writeSaveWithStatus(oldCampaign, destination).persisted, true);
    const imported = persistence.importCompleteArchive(persistence.prepareCompleteArchiveImport(parsed.archive, destination), destination);
    assert.equal(imported.persisted, true, imported.failure);
    const { f: restored } = reloadDurableHunt(storageFrom([...destination.data]), `imported-pods-${phase}`);
    assert.deepEqual(plain(restored.state.insertion.podRecovery), plain(f.state.insertion.podRecovery));
    assert.deepEqual(plain(restored.state.insertion.companions), plain(f.state.insertion.companions));
    assert.equal(restored.save.createdAt, f.save.createdAt);
    restored.state.paused = false; tickPod(restored, 2.25);
    assert.equal(restored.state.insertion.podRecovery.phase, 'destroyed');
    assert.equal(sounds(restored.state, 'pod-detonate'), phase === 'countdown' ? 1 : 0);
  }
});

test('destruction, heard-enemy IDs and expiry survive a real reload without replaying effects', () => {
  const f = fixture(); moveSafely(f); r.commandHuntPod(f.state); tickPod(f, 3);
  assert.equal(sounds(f.state, 'pod-detonate'), 1);
  const decoded = r.deserializeActiveHuntCheckpoint(r.serializeActiveHuntCheckpoint(r.captureCheckpoint(f.state, 'resume'), 0));
  assert.ok(decoded);
  const restored = r.restoreCheckpoint(fixture().state, decoded.checkpoint, 'resume');
  assert.deepEqual(plain(restored.insertion.podRecovery), plain(f.state.insertion.podRecovery));
  restored.paused = false; const before = sounds(restored, 'pod-detonate');
  const resumed = { ...f, state: restored }; tickPod(resumed, 4);
  assert.equal(sounds(restored, 'pod-detonate'), before);
  assert.equal(r.commandHuntPod(restored), false);
  r.applyHuntInsertion(restored, f.mission, 'hunter');
  assert.equal(restored.insertion.podRecovery.phase, 'destroyed');
});

test('older archives without a pod retain their absence and cannot gain a new detonation on resume', () => {
  const f = fixture(), checkpoint = r.captureCheckpoint(f.state, 'resume');
  delete checkpoint.insertion.podRecovery;
  const decoded = r.deserializeActiveHuntCheckpoint(r.serializeActiveHuntCheckpoint(checkpoint, 0)); assert.ok(decoded);
  const restored = r.restoreCheckpoint(fixture().state, decoded.checkpoint, 'resume');
  assert.equal(restored.insertion.podRecovery, undefined);
  restored.paused = false; r.applyHuntInsertion(restored, f.mission, 'hunter');
  assert.equal(restored.insertion.podRecovery, undefined); assert.equal(r.commandHuntPod(restored), false);
});

test('the real archive rejects a future detonation timestamp or enemies that never existed', () => {
  const f = fixture(); moveSafely(f); r.commandHuntPod(f.state); tickPod(f, 3);
  for (const mutate of [pod => { pod.destroyedAt = f.state.elapsed + 1; }, pod => { pod.alertedIds = ['invented']; }]) {
    const checkpoint = r.captureCheckpoint(f.state, 'resume'); mutate(checkpoint.insertion.podRecovery);
    const raw = r.serializeActiveHuntCheckpoint(checkpoint, 0); assert.ok(raw);
    assert.equal(r.deserializeActiveHuntCheckpoint(raw), null);
  }
});

test('detonation creates one noise per pod and directs a listener toward the pod, never the hidden moving hunter', () => {
  const f = fixture('triad'); clearArena(f); moveSafely(f);
  const enemy = r.makeEnemy('pod-listener', 'bad-blood-initiate', f.mission.id, 800, f.state.world.width, 80, 18, 100, 1, 1);
  Object.assign(enemy, { x: 800, y: f.state.world.floorY - enemy.height, active: true, waveActivationAt: null, facing: -1 });
  f.state.enemies.push(enemy); f.state.aiBrains[enemy.id] = r.createAiBrain(enemy.id, enemy.kind);
  r.commandHuntPod(f.state); tickPod(f, 3);
  const noises = f.state.noiseEvents.filter(noise => noise.sourceId.startsWith('pod-recovery:'));
  assert.equal(noises.length, 3); assert.equal(new Set(noises.map(noise => noise.sourceId)).size, 3);
  assert.deepEqual(plain(f.state.insertion.podRecovery.alertedIds), [enemy.id]);
  const pods = r.huntPodAnchors(trio, f.state.world);
  const nearest = pods[pods.length - 1];
  assert.deepEqual(plain(f.state.aiBrains[enemy.id].lastKnownTarget), { x: nearest.x, y: nearest.y - 60 });
  f.state.player.x = f.state.world.width - 250; f.state.player.cloaked = true;
  f.state.insertion.companions.forEach(member => { member.x = f.state.world.width - 600; });
  f.state.noiseEvents = []; f.state.tracks = []; f.state.scentNodes = [];
  f.state.elapsed += 4;
  r.updateRegularEnemy(f.state, enemy, f.mission, 1 / 60);
  assert.deepEqual(plain(f.state.aiBrains[enemy.id].lastKnownTarget), { x: nearest.x, y: nearest.y - 60 });
  assert.equal(sounds(f.state, 'pod-detonate'), 1);
});

test('immediate persistence keys change only for phase transitions and retain the original destruction time', () => {
  const state = fresh(), ready = r.huntPodRecoveryPersistenceKey(state);
  r.commandHuntPodRecovery(state, anchors, input()); const armed = r.huntPodRecoveryPersistenceKey(state);
  assert.notEqual(armed, ready);
  r.stepHuntPodRecovery(state, anchors, input(), .1, .1); assert.equal(r.huntPodRecoveryPersistenceKey(state), armed);
  state.remainingSeconds = .01; r.stepHuntPodRecovery(state, anchors, input(), .1, 3);
  const destroyed = r.huntPodRecoveryPersistenceKey(state); assert.notEqual(destroyed, armed);
  r.stepHuntPodRecovery(state, anchors, input(), .1, 10); assert.equal(r.huntPodRecoveryPersistenceKey(state), destroyed);
  assert.equal(r.huntPodRecoveryPersistenceKey(undefined), '');
});
