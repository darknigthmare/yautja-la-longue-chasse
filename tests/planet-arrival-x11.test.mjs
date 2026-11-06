import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

test('the native acquisition protocol requires all four fresh corners and preserves every rejected source', () => {
  const script = fileURLToPath(new URL('./test_planet_arrival_x11.py', import.meta.url));
  const python = process.platform === 'win32' ? 'py' : 'python3';
  const args = process.platform === 'win32' ? ['-3', '-B', script] : ['-B', script];
  const result = spawnSync(python, args, { encoding: 'utf8', timeout: 10_000 });
  assert.equal(result.error, undefined, String(result.error));
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
