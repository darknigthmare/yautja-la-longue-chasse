// Reproduce pinned test fixtures from real Git preimages; never edit application
// source or published runtime certificates. Run from the isolated repository root.
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {build} from 'esbuild';
import {captureLegacyReserveSnapshotV6} from '../tests/helpers/preserve-legacy-snapshot-v6.mjs';

const root = process.cwd(), output = path.join(root, 'tests/fixtures/preserve-v6-history-20261102');
await fs.mkdir(output, {recursive: true});
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
async function historical(ref, contents) {
  const inputs = new Map();
  const built = await build({stdin: {contents, resolveDir: root}, bundle: true, write: false, format: 'esm', platform: 'node', minify: true, logLevel: 'silent',
    plugins: [{name: 'pinned-preserve-preimages', setup(builder) {
      builder.onLoad({filter: /\.(ts|tsx|json)$/}, args => {
        const relative = path.relative(root, args.path).replaceAll(path.sep, '/');
        if (!relative.startsWith('app/')) return;
        const source = execFileSync('git', ['show', `${ref}:${relative}`], {maxBuffer: 32 * 1024 * 1024});
        inputs.set(relative, sha(source));
        return {contents: source.toString(), loader: relative.endsWith('.json') ? 'json' : relative.endsWith('.tsx') ? 'tsx' : 'ts'};
      });
    }}]});
  const bytes = Buffer.from(built.outputFiles[0].text), api = await import('data:text/javascript;base64,' + bytes.toString('base64'));
  return {bytes, api, inputs: Object.fromEntries([...inputs].sort())};
}
const common = "export * from './app/game/systems/gameReserveV66';";
const baseline = await historical('03cf51badd450338d748da55599a317a71debd28', common + "export * from './app/game/systems/gameReserveExpeditionV109';export * from './app/game/gameReserveV66Rendering';");
await fs.writeFile(path.join(output, 'legacy-baseline-03cf.json'), JSON.stringify({sourceCommit: '03cf51badd450338d748da55599a317a71debd28', inputs: baseline.inputs,
  scope: 'Exact serialized factory/normalizer states, 10001-frame geometry traces, 900-frame living traces, terrain and Canvas command parity for six V1–V5 identities.', snapshot: captureLegacyReserveSnapshotV6(baseline.api)}, null, 2) + '\n');
const manifest = {schemaVersion: 1, scope: 'Historical API capsules used only by the two preserved future-version assertions; all other persistence cases run on current source.', capsules: []};
for (const [version, commit, testPath] of [
  [107, '711724e898f8fcc681212c0252ea7249aa64208d', 'tests/game-reserve-expedition-persistence-v107.test.mjs'],
  [108, '515964be994586a7c4cbb7d00419902fcb2495ed', 'tests/game-reserve-expedition-persistence-v108.test.mjs'],
]) {
  const capsule = await historical(commit, common + "export {defaultSave,parseSaveImport} from './app/game/save';");
  const name = `reserve-v${version}-${commit.slice(0, 8)}.mjs.gz`, compressed = gzipSync(capsule.bytes, {level: 9});
  const testSource = execFileSync('git', ['show', `${commit}:${testPath}`]);
  await fs.writeFile(path.join(output, name), compressed);
  await fs.writeFile(path.join(output, `original-v${version}.test.mjs.txt`), testSource);
  manifest.capsules.push({version, commit, path: name, bytes: compressed.length, sha256: sha(compressed), sourceBytes: capsule.bytes.length, sourceSha256: sha(capsule.bytes),
    originalTest: `original-v${version}.test.mjs.txt`, originalTestSha256: sha(testSource), inputs: capsule.inputs});
}
await fs.writeFile(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({baseline: 'legacy-baseline-03cf.json', capsules: manifest.capsules.map(({version, bytes}) => ({version, bytes}))}));
