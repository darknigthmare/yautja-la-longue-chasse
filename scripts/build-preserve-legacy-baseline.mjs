// Rebuild the V1–V5 parity baseline from the exact application sources of one Git commit.
// Usage, from the repository root: node scripts/build-preserve-legacy-baseline.mjs <commit>
// The historical 03cf baseline is never rewritten; each run writes legacy-baseline-<short>.json.
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {captureLegacyReserveSnapshotV6} from '../tests/helpers/preserve-legacy-snapshot-v6.mjs';

const ref = process.argv[2];
if (!ref) throw new Error('Commit requis : node scripts/build-preserve-legacy-baseline.mjs <commit>');
const root = process.cwd(), commit = execFileSync('git', ['rev-parse', '--verify', ref + '^{commit}']).toString().trim();
const output = path.join(root, 'tests/fixtures/preserve-v6-history-20261102'), name = `legacy-baseline-${commit.slice(0, 8)}.json`;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const inputs = new Map();
const built = await build({stdin: {contents: "export * from './app/game/systems/gameReserveV66';export * from './app/game/systems/gameReserveExpeditionV109';export * from './app/game/gameReserveV66Rendering';", resolveDir: root},
  bundle: true, write: false, format: 'esm', platform: 'node', minify: true, logLevel: 'silent',
  plugins: [{name: 'pinned-preserve-sources', setup(builder) {
    builder.onLoad({filter: /\.(ts|tsx|json)$/}, args => {
      const relative = path.relative(root, args.path).replaceAll(path.sep, '/');
      if (!relative.startsWith('app/')) return;
      const source = execFileSync('git', ['show', `${commit}:${relative}`], {maxBuffer: 32 * 1024 * 1024});
      inputs.set(relative, sha(source));
      return {contents: source.toString(), loader: relative.endsWith('.json') ? 'json' : relative.endsWith('.tsx') ? 'tsx' : 'ts'};
    });
  }}]});
const api = await import('data:text/javascript;base64,' + Buffer.from(built.outputFiles[0].text).toString('base64'));
await fs.writeFile(path.join(output, name), JSON.stringify({sourceCommit: commit, inputs: Object.fromEntries([...inputs].sort()),
  scope: 'Exact serialized factory/normalizer states, 10001-frame geometry traces, 900-frame living traces, terrain and Canvas command parity (including render-only decor) for six V1–V5 identities.',
  snapshot: captureLegacyReserveSnapshotV6(api)}));
console.log(JSON.stringify({baseline: name, sourceCommit: commit, inputs: inputs.size}));
