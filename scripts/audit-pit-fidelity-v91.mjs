import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';

// Private QA inventory only. Running this never changes registries, saves or art.
const root = process.cwd();
const bundle = await build({
  stdin: { contents: "export * from './app/game/systems/pitFidelityV91'; export { PIT_FIGHTERS } from './app/game/systems/pitCombat';", resolveDir: root, loader: 'ts' },
  bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent',
});
const p = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const inventory = p.auditPitFidelityV91();
const paths = [
  'app/game/systems/pitFidelityV91.ts', 'app/game/systems/pitCombat.ts', 'app/game/systems/pitFirstEdition.ts',
  'app/game/systems/pitRosterExpansion.ts', 'app/game/systems/pitUserRoster.ts', 'app/game/systems/pitOriginalFightersV56.ts',
  'app/game/data/pitUserHuntersV44.json', 'app/game/data/pitUserHuntersV62.json', 'app/game/data/pitUserHuntersV79.json', 'app/game/data/pitUserVariantsV63.json',
];
const result = {
  ...inventory,
  sourceHashes: Object.fromEntries(paths.map(path => [path, sha(readFileSync(resolve(root, path)))])),
  citations: p.PIT_FIDELITY_SOURCES_V91,
  entries: inventory.entries.map(entry => ({
    ...entry, runtime: {
      technique: p.PIT_FIGHTERS[entry.fighterId].technique,
      attacks: p.PIT_FIGHTERS[entry.fighterId].attacks,
      recipeSha256: sha(JSON.stringify(p.PIT_FIGHTERS[entry.fighterId])),
    },
  })),
};
const directory = resolve(root, 'work-local/v91/qa');
mkdirSync(directory, { recursive: true });
const target = resolve(directory, 'pit-fidelity-runtime.json');
const bytes = JSON.stringify(result, null, 2) + '\n';
writeFileSync(target, bytes, 'utf8');
console.log(JSON.stringify({ target: relative(root, target), sha256: sha(bytes), counts: inventory.counts, issues: inventory.issues.length, sourceCount: Object.keys(p.PIT_FIDELITY_SOURCES_V91).length }, null, 2));
