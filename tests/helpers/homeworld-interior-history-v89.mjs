import fs from 'node:fs/promises';
import { build } from 'esbuild';

let authoring;
/** Historical authoring only, never used for current movement/clearance tests.
 * Cut off exactly the three additive post-V81 layers. All original producers,
 * source images and pre-existing fields are evaluated unchanged. No collider,
 * actor footprint, source file or active runtime module is replaced. */
export function historicalHomeworldInteriorsV81() {
  if (!authoring) authoring = (async () => {
    const suffix = '.map(homeworldPublicFittingsV82).map(homeworldCivicPublicComplexV83).map(homeworldPortPublicComplexV84)';
    let cutoffs = 0;
    const bundle = await build({
      stdin: { contents: "export * from './app/game/systems/homeworldInteriorsV64.ts';", resolveDir: process.cwd() },
      bundle: true, write: false, platform: 'node', format: 'esm',
      plugins: [{ name: 'historical-v81-authoring-only', setup(builder) {
        builder.onLoad({ filter: /homeworldInteriorsV64[.]ts$/ }, async ({ path }) => {
          const source = await fs.readFile(path, 'utf8');
          if (source.split(suffix).length !== 2) throw new Error('Historical V81 authoring boundary changed');
          cutoffs++;
          return { contents: source.replace(suffix, ''), loader: 'ts' };
        });
      } }],
    });
    if (cutoffs !== 1) throw new Error('Historical authoring must remove exactly one known layer suffix');
    const api = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
    return api.HOMEWORLD_INTERIORS_V64;
  })();
  return authoring;
}
