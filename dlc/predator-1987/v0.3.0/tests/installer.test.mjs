import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');

test('local installer is reversible and touches only private-dlc/predator-1987',()=>{
  const dir=mkdtempSync(join(tmpdir(),'predator-dlc-fixture-'));
  try{
    writeFileSync(join(dir,'package.json'),JSON.stringify({name:'yautja-la-longue-chasse'}));
    writeFileSync(join(dir,'sentinel.txt'),'unchanged');
    const install=spawnSync(process.execPath,[join(ROOT,'INSTALLER_DLC_LOCAL.mjs'),dir],{encoding:'utf8'});
    assert.equal(install.status,0,install.stderr||install.stdout);
    assert.ok(existsSync(join(dir,'private-dlc','predator-1987','JOUER_PREDATOR_1987.html')));
    assert.equal(readFileSync(join(dir,'sentinel.txt'),'utf8'),'unchanged');
    const uninstall=spawnSync(process.execPath,[join(ROOT,'DESINSTALLER_DLC_LOCAL.mjs'),dir],{encoding:'utf8'});
    assert.equal(uninstall.status,0,uninstall.stderr||uninstall.stdout);
    assert.equal(existsSync(join(dir,'private-dlc','predator-1987')),false);
    assert.equal(readFileSync(join(dir,'sentinel.txt'),'utf8'),'unchanged');
  } finally {rmSync(dir,{recursive:true,force:true});}
});
