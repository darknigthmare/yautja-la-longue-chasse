/** Read-only discovery for the sparse CI checkout. Native fs calls are retained;
 * only successful repository reads outside the always-included source trees
 * are recorded. This is tooling evidence, never a gameplay observer. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { syncBuiltinESMExports } from 'node:module';

const destination = process.env.P0P1_FILE_TRACE;
if (destination) {
  const root = path.resolve(process.cwd()), seen = new Set();
  const nativeAppend = fs.appendFileSync.bind(fs);
  const nativeStat = fs.statSync.bind(fs);
  const record = value => {
    if (typeof value === 'number' || value === undefined || value === null) return;
    let full;
    try { full = path.resolve(value instanceof URL ? fileURLToPath(value) : String(value)); } catch { return; }
    const relative = path.relative(root, full).split(path.sep).join('/');
    if (!/^(public|docs|art-source|production)\//.test(relative) || seen.has(relative)) return;
    try { if (!nativeStat(full).isFile()) return; } catch { return; }
    seen.add(relative); nativeAppend(destination, JSON.stringify(relative) + '\n');
  };
  for (const name of ['readFileSync', 'statSync', 'lstatSync', 'accessSync', 'existsSync']) {
    const original = fs[name].bind(fs);
    fs[name] = (...args) => { const result = original(...args); if (result !== false) record(args[0]); return result; };
  }
  const originalRead = fs.readFile.bind(fs);
  fs.readFile = (...args) => {
    const callback = args.at(-1);
    if (typeof callback !== 'function') return originalRead(...args);
    const value = args[0];
    args[args.length - 1] = (...result) => { if (!result[0]) record(value); callback(...result); };
    return originalRead(...args);
  };
  for (const name of ['readFile', 'stat', 'lstat', 'access']) {
    const original = fs.promises[name].bind(fs.promises);
    fs.promises[name] = async (...args) => { const result = await original(...args); record(args[0]); return result; };
  }
  syncBuiltinESMExports();
}
