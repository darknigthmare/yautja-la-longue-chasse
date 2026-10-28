#!/usr/bin/env node
/** Current-runtime V111 regressions. The immutable publication assertions are
 * executed, unchanged, by check-homeworld-history-v112.mjs --check --tests. */
import assert from 'node:assert/strict';
import {readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const archivedPublication='homeworld-excel-followup-v111.test.mjs';
const names=readdirSync(new URL('../tests/',import.meta.url));
assert.ok(names.includes(archivedPublication),'Historical V111 publication assertions must remain present');
const files=names.filter(name=>name.endsWith('-v111.test.mjs')&&name!==archivedPublication).sort().map(name=>'tests/'+name);
assert.ok(files.length>=10,'Current V111 runtime regression files must not disappear');
console.log(JSON.stringify({scope:'V111 regressions on the current runtime',testFiles:files,
 historicalAssertions:'tests/'+archivedPublication,historicalCommand:'node scripts/check-homeworld-history-v112.mjs --check --tests'}));
const result=spawnSync(process.execPath,['--experimental-strip-types','--test','--test-reporter=spec','--test-concurrency=1',...files],{cwd:root,stdio:'inherit'});
if(result.error)throw result.error;
process.exitCode=result.status??1;
