import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

/** QA-only local TS loader. It reads only relative project modules, avoiding
 * package/tsconfig discovery outside the sandboxed workspace. No source changes,
 * private browser state, network requests, or replacement runtime functions. */
export function homeworldQaModelV64(root = process.cwd(), entries = ['homeworldCity.ts', 'homeworldSpatialCodex.ts', 'homeworldInteriorsV64.ts']) {
  const cache = new Map(), base = path.resolve(root);
  function load(file) {
    const resolved = path.resolve(file);
    if (!resolved.startsWith(base + path.sep)) throw new Error('QA import outside project: ' + file);
    if (cache.has(resolved)) return cache.get(resolved).exports;
    const loadedModule = { exports: {} }; cache.set(resolved, loadedModule);
    if (resolved.endsWith('.json')) return loadedModule.exports = JSON.parse(fs.readFileSync(resolved, 'utf8'));
    const javascript = ts.transpileModule(fs.readFileSync(resolved, 'utf8'), {
      fileName: resolved, compilerOptions: { target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS, esModuleInterop: true, resolveJsonModule: true },
    }).outputText;
    const localRequire = specifier => {
      if (!specifier.startsWith('.')) throw new Error('Non-local QA dependency: ' + specifier);
      const candidate = path.resolve(path.dirname(resolved), specifier);
      const next = [candidate, candidate + '.ts', candidate + '.json'].find(item => fs.existsSync(item) && fs.statSync(item).isFile());
      if (!next) throw new Error('Missing QA dependency: ' + candidate);
      return load(next);
    };
    new Function('require', 'module', 'exports', javascript)(localRequire, loadedModule, loadedModule.exports);
    return loadedModule.exports;
  }
  return Object.assign({}, ...entries
    .map(file => load(path.join(base, 'app/game/systems', file))));
}
