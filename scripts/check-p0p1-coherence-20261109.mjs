/** Portable CI runner for the real P0/P1 regression suite. Each file executes
 * directly, preserving its actual node:test TAP count on Node22. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.resolve(root, process.env.P0P1_CI_OUTPUT || 'outputs/p0p1-coherence-20261109');
const selectionFile = process.env.P0P1_CI_SELECTION || 'production/p0p1-20261109/qa/root/test-selection-current.json';
assert.match(selectionFile, /^production\/(?:p0p1-20261109\/qa\/root|clan-war-command-20261109\/qa\/ci)\/[A-Za-z0-9._-]+\.json$/);
const selectionPath = path.join(root, selectionFile);
const selection = JSON.parse(fs.readFileSync(selectionPath, 'utf8'));
assert.ok(Array.isArray(selection) && selection.length > 0);
assert.equal(new Set(selection).size, selection.length);
fs.mkdirSync(output, { recursive: true });
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const filePassed = row => !row.spawnError && row.exitCode === 0 && row.sourceUnchanged &&
  ['tests', 'pass', 'fail', 'skipped', 'cancelled', 'todo'].every(key => Number.isSafeInteger(row[key]) && row[key] >= 0) &&
  row.pass > 0 && row.tests === row.pass && row.fail === 0 && row.cancelled === 0 && row.skipped === 0 && row.todo === 0;
const escapeCommandData = value => String(value).replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
const escapeCommandProperty = value => escapeCommandData(value).replaceAll(':', '%3A').replaceAll(',', '%2C');
const report = { node: process.version, startedAt: new Date().toISOString(), selection: selectionFile, selectionSha256: hash(fs.readFileSync(selectionPath)), files: [] };
for (const file of selection) {
  assert.match(file, /^tests\/[A-Za-z0-9._/-]+\.test\.mjs$/);
  assert.ok(!file.split('/').includes('..'));
  const source = fs.readFileSync(path.join(root, file));
  const args = ['--experimental-strip-types'];
  if (process.env.P0P1_FILE_TRACE) args.push('--import', path.join(root, 'scripts/lib/trace-p0p1-file-inputs-20261109.mjs'));
  args.push(file);
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  const text = (result.stdout || '') + (result.stderr || '');
  const log = path.join(output, path.basename(file) + '.tap'); fs.writeFileSync(log, text);
  const counts = {};
  for (const name of ['tests', 'pass', 'fail', 'skipped', 'cancelled', 'todo']) {
    const matches = [...text.matchAll(new RegExp('^# ' + name + ' (\\d+)\\s*$', 'gm'))];
    counts[name] = matches.length ? Number(matches.at(-1)[1]) : null;
  }
  const row = { file, command: [process.execPath, ...args], exitCode: result.status,
    spawnError: result.error ? { code: result.error.code, message: result.error.message } : null, sourceSha256: hash(source),
    sourceUnchanged: hash(source) === hash(fs.readFileSync(path.join(root, file))),
    log: path.relative(root, log), logSha256: hash(text), ...counts };
  report.files.push(row); fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ file, exitCode: row.exitCode, tests: row.tests, passed: row.pass, failed: row.fail }));
  if (process.env.GITHUB_ACTIONS === 'true' && !filePassed(row)) {
    const message = `file=${row.file}; exit=${row.exitCode}; tests=${row.tests}; pass=${row.pass}; fail=${row.fail}; skipped=${row.skipped}; cancelled=${row.cancelled}; todo=${row.todo}; sourceUnchanged=${row.sourceUnchanged}; spawnError=${row.spawnError?.code ?? 'none'}; TAP=${row.log}`;
    console.log(`::error file=${escapeCommandProperty(row.file)},title=P0/P1 regression failed::${escapeCommandData(message)}`);
  }
}
report.finishedAt = new Date().toISOString();
report.passed = report.files.every(filePassed);
report.totals = Object.fromEntries(['tests', 'pass', 'fail', 'skipped', 'cancelled', 'todo'].map(key => [key, report.files.reduce((sum, row) => sum + (row[key] || 0), 0)]));
fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ passed: report.passed, totals: report.totals }));
if (!report.passed) process.exitCode = 1;
