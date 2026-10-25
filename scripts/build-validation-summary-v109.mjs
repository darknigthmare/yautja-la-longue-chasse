/** Assemble four real, fully portable production runs on one immutable build. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {snapshotRuntimeV109} from './snapshot-runtime-v109.mjs';
import {verifyProductionSummaryV109} from './build-excel-followup-v109.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export async function buildValidationSummaryV109({entries, runtimeCommit, productionBuildId}) {
  assert.match(runtimeCommit ?? '', /^[a-f0-9]{40}$/); assert.ok(productionBuildId); assert.equal(entries.length, 4);
  assert.equal((await fs.readFile(path.join(ROOT, '.next/BUILD_ID'), 'utf8')).trim(), productionBuildId);
  const bytes = await fs.readFile(path.join(ROOT, 'docs/v109-runtime-freeze.json')), freeze = JSON.parse(bytes);
  assert.deepEqual(await snapshotRuntimeV109(), freeze, 'Runtime changed since the production freeze');
  const production = await Promise.all(entries.map(async file => JSON.parse(await fs.readFile(file, 'utf8'))));
  const master = {schemaVersion: 1, release: 'V109', status: 'PASS_CIBLE', recordedAt: new Date().toISOString(), runtimeCommit, productionBuildId,
    scope: 'Four bounded actual journeys on one compiled production build: Feral/Scar unvaried native forward throws; ROLE03 plaque/impression comparison and dynamic cargo navigation; physical six-stage clan supply route from an explicit legacy checkpoint; two new adapted desert/ice reserves with declared geometry fixtures. Complete kits, all partners/costumes, source campaigns, campaign acquisitions, canonical fidelity and the 80/100 Preserve target remain open. All 56 original source requirements remain open.',
    sourceFreeze: {path: 'docs/v109-runtime-freeze.json', sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length}, production};
  await verifyProductionSummaryV109(master, freeze); await fs.writeFile(path.join(ROOT, 'docs/v109-validation-summary.json'), JSON.stringify(master, null, 2) + '\n'); return master;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2), options = {entries: []};
  for (let i = 0; i < args.length; i += 2) {assert.ok(args[i + 1]); if (args[i] === '--entry') options.entries.push(args[i + 1]); else if (args[i] === '--runtime-commit') options.runtimeCommit = args[i + 1]; else if (args[i] === '--build-id') options.productionBuildId = args[i + 1]; else throw Error('Unknown option');}
  const master = await buildValidationSummaryV109(options); console.log(JSON.stringify({status: master.status, domains: 4, checks: master.production.reduce((sum, row) => sum + row.browserChecksPassed, 0), captures: master.production.reduce((sum, row) => sum + row.capturesInspected, 0), buildId: master.productionBuildId}));
}
