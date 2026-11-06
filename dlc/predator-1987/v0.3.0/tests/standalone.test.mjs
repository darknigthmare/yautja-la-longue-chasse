import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');

test('browser engine is valid JavaScript',()=>{
  const r=spawnSync(process.execPath,['--check',resolve(ROOT,'src/browser-engine.js')],{encoding:'utf8'});
  assert.equal(r.status,0,r.stderr||r.stdout);
});

test('standalone HTML embeds game data and browser engine',()=>{
  const html=readFileSync(resolve(ROOT,'JOUER_PREDATOR_1987.html'),'utf8');
  assert.match(html,/PREDATOR 1987/);
  assert.match(html,/window\.__GAME_DATA__/);
  assert.match(html,/function primaryAttack/);
  assert.doesNotMatch(html,/<script[^>]+src=/i);
  assert.doesNotMatch(html,/<link[^>]+href=/i);
});

test('standalone does not embed official remote media',()=>{
  const html=readFileSync(resolve(ROOT,'JOUER_PREDATOR_1987.html'),'utf8');
  assert.doesNotMatch(html,/<(?:img|video|audio|source)[^>]+https?:/i);
});
