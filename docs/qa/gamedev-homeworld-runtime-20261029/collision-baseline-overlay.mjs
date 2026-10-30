import fs from 'node:fs';
import path from 'node:path';

// Run the new regression test unchanged against the two published preimages.
// Other application modules, data, test helpers and assertions stay current.
const repository = '/workspace/scratch/56a0bf56582d/yautja-apply-guides';
const baseline = '/tmp/yautja-homeworld-runtime-20261029/baseline';
const replacements = new Map(['homeworldCourtArtV80.ts', 'homeworldCivicDecorV80.ts'].map(name => [path.join(repository, 'app/game/systems', name), path.join(baseline, name)]));
const read = fs.readFileSync.bind(fs);
fs.readFileSync = (file, ...args) => read(typeof file === 'string' ? replacements.get(path.resolve(file)) ?? file : file, ...args);
