import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { huntStructuralBarrierV94 as barrier } from '../app/game/systems/huntStructuralBarrierV94.ts';

const source = readFileSync(new URL('../app/game/HuntCanvas.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('HuntCanvas.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const solid = { x: 60, y: -100, width: 8, height: 300, collision: 'solid' };
const pos = (x, y = 0) => ({ x, y });
for (const [label, start, end, obstacles, expected] of [
  ['solid wall', pos(0), pos(100), [solid], true],
  ['reverse wall', pos(100), pos(0), [solid], true],
  ['clear segment', pos(0), pos(40), [solid], false],
  ['one-way ledge', pos(0), pos(100), [{ ...solid, collision: 'one-way' }], false],
  ['wall tangent', pos(0, -100), pos(100, -100), [solid], false],
  ['endpoint touching wall', pos(0), pos(60), [solid], false],
  ['enter from edge', pos(60), pos(65), [solid], true],
  ['stationary inside wall', pos(65), pos(65), [solid], true],
]) test(`structural geometry: ${label}`, () => assert.equal(barrier(start, end, obstacles), expected));
test('invalid endpoints are refused without mutating the level', () => {
  const obstacles = [solid], snapshot = JSON.stringify(obstacles);
  assert.equal(barrier(pos(NaN), pos(5), obstacles), true);
  assert.equal(JSON.stringify(obstacles), snapshot);
});
function actual(name, globals = {}) {
  const fn = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.ok(fn, `missing live function ${name}`);
  const body = ts.transpileModule(fn.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  return runInNewContext(`${body}\n${name}`, { huntStructuralBarrierV94: barrier, ...globals });
}
const fighter = (x, y = 0) => ({ id: 'fighter', x, y, width: 40, height: 80, facing: 1 });
function boss(behavior, x, y, platforms = []) {
  const hit = [], fired = [];
  const state = { boss: fighter(0), player: fighter(x, y), world: { platforms, covers: [] }, brokenPillarIds: new Set(), screenShakeEnabled: false };
  const mission = { boss: { attacks: [{ id: 'test', behavior, damage: 20, rangePx: 350 }], color: 'red' }, palette: { danger: 'red' } };
  const fn = actual('executeBossAttack', { DIFFICULTY_BY_ID: { test: { enemyDamageMultiplier: 1 } },
    emitNoise() {}, resolvePlayerMeleeParry: () => false, hurtPlayer: (_s, n) => hit.push(n), forceDecloak() {},
    fireHostileProjectile: (...args) => fired.push(args), calculateLineOfSightOcclusion: () => 0 });
  fn(state, mission, 'test', 'test', 1);
  return { hit, fired };
}
test('a boss melee whiff does not become a ranged projectile', () => {
  for (const p of [pos(400), pos(0, 250), pos(165), pos(0, 135)]) {
    const result = boss('melee', p.x, p.y);
    assert.equal(result.hit.length, 0);
    assert.equal(result.fired.length, 0);
  }
});
test('solid walls block authored boss melee/charge/area without suppressing attacks on ledges', () => {
  for (const kind of ['melee', 'charge', 'area']) {
    assert.equal(boss(kind, 90, 0, [solid]).hit.length, 0, kind);
    assert.equal(boss(kind, 90, 0, [{ ...solid, collision: 'one-way' }]).hit.length, 1, kind);
  }
});
test('ranged boss actions still emit their intended shots', () => {
  assert.equal(boss('burst', 400, 0).fired.length, 3);
  assert.equal(boss('plasma', 400, 0).fired.length, 1);
  assert.equal(boss('disc', 400, 0).fired.length, 1);
});
test('player melee, context selection, regular melee and splash use the structural gate', () => {
  for (const name of ['nearestHuntMeleeTarget', 'updatePlayerMeleeCombat', 'updateRegularEnemy', 'executeBossAttack', 'updateProjectiles']) {
    const fn = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
    assert.ok(fn, `function ${name} missing`);
    assert.match(fn.getText(ast), /huntStructuralBarrierV94\(/);
  }
});
