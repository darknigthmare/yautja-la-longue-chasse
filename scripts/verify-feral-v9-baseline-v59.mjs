import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { build } from 'esbuild';

// Independent differential review against the published V58 source. Read-only:
// historical sources are supplied to esbuild in memory, never restored over files.
const ref = process.env.V59_BASELINE_REF || '00a6a323f49a1412d820060476c68fc4b81221d0';
const output = process.env.V59_BASELINE_OUTPUT || 'work-local/v59/qa/feral-v9-baseline.json';
const root = process.cwd();
const oldSources = new Map(['pitCombat.ts', 'pitFirstEdition.ts'].map(name => [name,
  execFileSync('git', ['show', `${ref}:app/game/systems/${name}`], { encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 })]));
async function load(historical) {
  const result = await build({ stdin: { contents: `export * from './app/game/systems/pitCombat';`, resolveDir: root },
    bundle: true, write: false, platform: 'node', format: 'esm',
    plugins: historical ? [{ name: 'read-only-published-baseline', setup(api) {
      api.onLoad({ filter: /[\\/]pit(?:Combat|FirstEdition)\.ts$/ }, async args => ({
        contents: oldSources.get(path.basename(args.path)), loader: 'ts', resolveDir: path.dirname(args.path),
      }));
    } }] : [] });
  return import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'));
}
const previous = await load(true), current = await load(false);
assert.equal(previous.PIT_STATE_VERSION, 9);
assert.equal(current.PIT_STATE_VERSION, 10);
const checks = [];
for (const opponent of ['jungle-hunter', 'city-hunter', 'falconer', 'tracker']) {
  for (const slot of [0, 1]) for (const variant of [null, 'feral-sans-casque-75100c4c5e']) {
    const ids = slot ? [opponent, 'feral-hunter'] : ['feral-hunter', opponent];
    const variants = slot ? [null, variant] : [variant, null];
    let old = previous.createPitCombatState(...ids, { mode: 'training', variants });
    let next = current.createPitCombatState(...ids, { mode: 'training', variants });
    for (let frame = 0; frame < 900; frame++) {
      const cycle = frame % 180;
      const inputs = [
        { right: cycle < 36, left: cycle >= 140, jump: frame % 127 === 0,
          attack: frame % 43 === 0 ? 'technique' : frame % 31 === 0 ? 'light' : frame % 101 === 0 ? 'heavy' : undefined,
          guardHigh: cycle >= 72 && cycle < 104, guardLow: cycle >= 104 && cycle < 136, down: cycle >= 104 && cycle < 136 },
        { left: cycle < 42, right: cycle >= 144, jump: frame % 137 === 0,
          attack: frame % 47 === 0 ? 'technique' : frame % 29 === 0 ? 'medium' : undefined,
          guardHigh: cycle >= 55 && cycle < 90, guardLow: cycle >= 90 && cycle < 135, down: cycle >= 90 && cycle < 135 },
      ];
      old = previous.stepPitCombat(old, inputs);
      next = current.stepPitCombatV9Compatibility(next, inputs);
      const normalized = JSON.parse(current.serializePitCombat(next)); normalized.version = 9;
      assert.deepEqual(normalized, JSON.parse(previous.serializePitCombat(old)), `${opponent}/${slot}/${variant || 'default'}/tick${frame + 1}`);
    }
    checks.push({ opponent, slot, variant, ticks: 900, health: old.fighters.map(f => f.health) });
  }
}
await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(output, JSON.stringify({ passed: true, baseline: ref, checks, totalComparedStates: checks.length * 900,
  scope: 'Every serialized combat field compared at each tick; only the declared state schema version normalized from 10 to 9. Published Feral salvos, guard, projectiles and opponent behavior must remain unchanged.' }, null, 2));
console.log(JSON.stringify({ passed: true, totalComparedStates: checks.length * 900, output }));
