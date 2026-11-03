import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {gameBuildIdentity} from '../scripts/game-build-identity.ts';

test('published identity uses the actual deployment revision before CI or local Git',()=>{
  const local=()=>{throw Error('a deployment must not need the local checkout');};
  assert.equal(gameBuildIdentity({env:{VERCEL_GIT_COMMIT_SHA:'a'.repeat(40),GITHUB_SHA:'b'.repeat(40)},gitRevision:local}),'aaaaaaaa');
  assert.equal(gameBuildIdentity({env:{GITHUB_SHA:'b'.repeat(40)},gitRevision:local}),'bbbbbbbb');
});

test('untrusted environment text is never rendered as a release identifier',()=>{
  for(const invalid of ['https://secret@example.com/repo','<script>alert(1)</script>','abcd1234','a'.repeat(40)+'\n']) {
    assert.equal(gameBuildIdentity({env:{VERCEL_GIT_COMMIT_SHA:invalid,GITHUB_SHA:invalid},gitRevision:()=>'c'.repeat(40)}),'cccccccc');
  }
  assert.equal(gameBuildIdentity({env:{},gitRevision:()=>{throw Error('no .git directory');}}),'local');
  assert.equal(gameBuildIdentity({env:{},gitRevision:()=>'not a revision'}),'local');
});

test('browser fixtures without process and compiled releases both load the same release metadata',()=>{
  const source=readFileSync(new URL('../app/game/buildInfo.ts',import.meta.url),'utf8');
  const compile=code=>ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  const local={exports:{}};
  vm.runInNewContext(compile(source),local);
  assert.equal(local.exports.GAME_BUILD_ID,'local');
  const published={exports:{}};
  vm.runInNewContext(compile(source.replace('process.env.NEXT_PUBLIC_YAUTJA_BUILD_ID',JSON.stringify('abcd1234'))),published);
  assert.equal(published.exports.GAME_BUILD_ID,'abcd1234');
  assert.equal(published.exports.GAME_RELEASE_VERSION,local.exports.GAME_RELEASE_VERSION);
});

