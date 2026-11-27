import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';
import ts from 'typescript';

const source = await readFile(new URL('../app/game/GameClient.tsx', import.meta.url), 'utf8');
const tree = ts.createSourceFile('GameClient.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const owner = '2026-11-27T07:00:00.000Z';
const otherOwner = '2026-11-26T07:00:00.000Z';

async function moduleAt(relative) {
  const result = await build({ entryPoints: [fileURLToPath(new URL(relative, import.meta.url))],
    bundle: true, platform: 'node', format: 'esm', target: 'es2022', write: false });
  return import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'));
}
const [saves, gallery, firstEdition, arcade] = await Promise.all([
  moduleAt('../app/game/systems/pitSave.ts'), moduleAt('../app/game/systems/pitHonorGalleryV1.ts'),
  moduleAt('../app/game/systems/pitFirstEdition.ts'), moduleAt('../app/game/systems/pitArcade.ts'),
]);

function implementation(name, environment) {
  let declaration;
  function visit(node) {
    if ((ts.isVariableDeclaration(node) || ts.isFunctionDeclaration(node)) && node.name?.getText(tree) === name) declaration = node;
    ts.forEachChild(node, visit);
  }
  visit(tree);
  assert.ok(declaration, `actual GameClient ${name}`);
  const body = ts.isFunctionDeclaration(declaration) ? declaration.getText(tree)
    : `const ${name} = ${declaration.initializer.arguments[0].getText(tree)};`;
  const compiled = ts.transpileModule(body, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  return runInNewContext(`(() => { ${compiled}; return ${name}; })()`, environment);
}

function fixture({ saved = saves.createPitSave(owner), location = 'deck', screen = 'ship-station', pending = null } = {}) {
  const key = saves.pitSaveStorageKey(owner);
  const values = new Map(saved === null ? [] : [[key, typeof saved === 'string' ? saved : saves.serializePitSave(saved)]]);
  const calls = { routes: [], screens: [], returns: [], toasts: [], cosmetics: [], circuit: [], descent: [], reads: 0, writes: 0 };
  const storage = { getItem: key => { calls.reads++; return values.get(key) ?? null; },
    setItem: (key, value) => { calls.writes++; values.set(key, value); }, removeItem: key => { calls.writes++; values.delete(key); } };
  const env = { ...saves, ...gallery, ...firstEdition, hubLocation: location, screen, shipStationOpen: screen === 'ship-station',
    saveRef: { current: { createdAt: owner } }, pendingTrophyCommitRef: { current: pending },
    setToast: value => calls.toasts.push(value), setPitHonorRoute: value => calls.routes.push(value),
    setPitReturnScreen: value => calls.returns.push(value), setPitUnlockedCosmeticIds: value => calls.cosmetics.push(value),
    setPitCircuitRuns: value => calls.circuit.push(value), setPitDescentRuns: value => calls.descent.push(value),
    loadPitSave: options => saves.loadPitSave({ ...options, storage }), go: value => calls.screens.push(value) };
  env.pitRunSnapshots = implementation('pitRunSnapshots', env);
  return { calls, values, env, open: implementation('openPit', env) };
}

function completedArcade() {
  let save = saves.createPitSave(owner);
  const ladder = arcade.PIT_ARCADE_LADDERS.wolf;
  for (let i = 0; i < ladder.encounters.length; i++) save = saves.applyPitResult(save, {
    id: `honor-route-fixture-${i}`, mode: 'arcade', outcome: 'victory', fighterId: 'wolf', arenaId: ladder.encounters[i].arenaId,
    roundsWon: 2, roundsLost: 0, arcadeEncounterIndex: i, arcadeCompleted: i === ladder.encounters.length - 1,
    cosmeticRewardIds: i === ladder.encounters.length - 1 ? [ladder.cosmeticRewardId] : [], completedAt: '2026-11-27T07:01:00.000Z',
  }).save;
  return save;
}

test('real shell prepares the requested route with canonical acquisitions and no archive write', () => {
  const f = fixture({ saved: completedArcade(), location: 'homeworld' });
  const before = [...f.values];
  f.open({ mode: 'circuit', fighterId: 'wolf', chapterId: 'judgment', forgedReward: 'all' });
  assert.deepEqual(f.calls.routes, [{ mode: 'circuit', fighterId: 'wolf', chapterId: 'judgment' }]);
  assert.deepEqual(Array.from(f.calls.cosmetics[0]), [arcade.PIT_ARCADE_LADDERS.wolf.cosmeticRewardId]);
  assert.deepEqual(f.calls.screens, ['pit']);
  assert.deepEqual(f.calls.returns, ['homeworld']);
  assert.equal(f.calls.writes, 0);
  assert.deepEqual([...f.values], before);
});

test('generic PIT entry clears an earlier distinction request instead of retaining its mode', () => {
  const f = fixture();
  f.open({ mode: 'descent', fighterId: 'city-hunter' });
  f.open();
  assert.deepEqual(f.calls.routes, [{ mode: 'descent', fighterId: 'city-hunter' }, null]);
  assert.equal(f.calls.writes, 0);
});

test('pending trophy confirmation prevents route changes, storage reads and navigation', () => {
  const f = fixture({ pending: { receipt: 'unfinished' } });
  f.open({ mode: 'arcade', fighterId: 'wolf' });
  assert.deepEqual(f.calls.routes, []);
  assert.deepEqual(f.calls.screens, []);
  assert.equal(f.calls.reads, 0);
  assert.equal(f.calls.writes, 0);
  assert.match(f.calls.toasts[0], /Confirmez le rite/);
});

test('wrong owner and corrupt saves remain unchanged and expose no acquisitions', () => {
  for (const saved of [saves.createPitSave(otherOwner), '{broken']) {
    const f = fixture({ saved });
    const before = [...f.values];
    f.open({ mode: 'arcade', fighterId: 'jungle-hunter' });
    assert.deepEqual(Array.from(f.calls.cosmetics[0]), []);
    assert.deepEqual(Object.keys(f.calls.circuit[0]), []);
    assert.deepEqual(Object.keys(f.calls.descent[0]), []);
    assert.match(f.calls.toasts.at(-1), /indisponible/);
    assert.equal(f.calls.writes, 0);
    assert.deepEqual([...f.values], before);
  }
});

test('unsupported mode, progression fighter or chapter cannot become a launch request', () => {
  for (const request of [{ mode: 'tag' }, { mode: 'arcade', fighterId: 'greyback' }, { mode: 'descent', chapterId: 'judgment' }]) {
    const f = fixture();
    f.open(request);
    assert.deepEqual(f.calls.routes, [null]);
    assert.deepEqual(f.calls.screens, ['pit']);
    assert.equal(f.calls.writes, 0);
  }
});

test('route entry keeps the actual hub return destination', () => {
  for (const location of ['deck', 'homeworld', 'clan-ship']) {
    const f = fixture({ location });
    f.open({ mode: 'circuit', fighterId: 'scar', chapterId: 'call-of-the-circle' });
    assert.deepEqual(f.calls.returns, [location]);
    assert.equal(f.calls.writes, 0);
  }
});
