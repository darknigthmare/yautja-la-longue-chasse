import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {HUNT_SOURCE_PUBLICATION_V112,HUNT_SOURCE_REF_V112,prepareHuntSourceHistoryV112,
 verifyHuntSourceHistoryV112,runHuntSourceHistoryV112} from '../scripts/check-hunt-integration-source-history-v112.mjs';

test('the unchanged V112 inventory verifies all 2500 original sources in its published Git context',async t=>{
 const context=await prepareHuntSourceHistoryV112();
 t.after(()=>context.dispose());
 const result=await runHuntSourceHistoryV112(context);
 assert.equal(result.result,'PASS_HISTORICAL_HUNT_SOURCE_INPUTS_V112');
 assert.equal(result.publicationCommit,HUNT_SOURCE_PUBLICATION_V112);assert.equal(result.sourceRef,HUNT_SOURCE_REF_V112);
 assert.equal(result.files,2500);assert.equal(result.bytes,128194222);assert.equal(result.currentInputsUnchanged,2501);
 assert.equal(result.originalCommandExecuted,true);assert.equal(result.currentRuntimeCovered,false);
 assert.ok(result.copiedMatchingCurrentFiles>0);assert.ok(result.restoredPinnedGitFiles>0);

 await t.test('an altered frozen input, substituted context or relabelled publication cannot pass',async()=>{
  await assert.rejects(verifyHuntSourceHistoryV112({...context}),/Unrecognized V112 source historical context/);
  try{context.sourceRef=HUNT_SOURCE_PUBLICATION_V112;await assert.rejects(verifyHuntSourceHistoryV112(context),/historical source label changed/);}
  finally{context.sourceRef=HUNT_SOURCE_REF_V112;}
  for(const relative of ['app/game/save.ts','.git/HEAD','.git/index']){
   const target=path.join(context.root,relative),before=await fs.readFile(target);
   try{
    await fs.chmod(target,0o644);await fs.appendFile(target,'\n');
    await assert.rejects(verifyHuntSourceHistoryV112(context),/V112 historical (?:source|HEAD|index) changed/);
   }finally{await fs.writeFile(target,before);await fs.chmod(target,0o444);}
  }
  await verifyHuntSourceHistoryV112(context);
 });
});

test('the current source check fingerprints HEAD, rejects drift and never rewrites the dated inventory',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'hunt-current-source-'));
 const script='scripts/check-hunt-integration-source-v112.mjs';
 const git=args=>execFileSync('git',['-C',root,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 try{
  git(['init','--quiet']);git(['config','user.name','Current source fixture']);git(['config','user.email','source@example.test']);
  const files={
   'app/input.ts':'export const value=1;\n','build/check.mjs':'export {};\n','worker/index.ts':'export {};\n',
   'package.json':'{"private":true}\n','.github/workflows/audit-v94.yml':'name: fixture\n','.openai/hosting.json':'{}\n',
   'docs/qa/v112-hunt-integration/source-inputs.json':'{"historical":"unchanged"}\n',
  };
  for(const [name,bytes]of Object.entries(files)){await fs.mkdir(path.dirname(path.join(root,name)),{recursive:true});await fs.writeFile(path.join(root,name),bytes);}
  await fs.mkdir(path.join(root,'scripts'));await fs.copyFile(new URL('../'+script,import.meta.url),path.join(root,script));
  git(['add','.']);git(['commit','--quiet','-m','source fixture']);
  const result=JSON.parse(execFileSync(process.execPath,[script,'--current'],{cwd:root,encoding:'utf8'}));
  assert.equal(result.result,'PASS_CURRENT_SOURCE_INPUTS');assert.equal(result.sourceRef,git(['rev-parse','HEAD']));
  assert.equal(result.files,7);assert.match(result.inventorySha256,/^[a-f0-9]{64}$/);
  assert.equal(result.currentSourceCovered,true);assert.equal(result.runtimeExecuted,false);assert.equal(result.historicalInventoryRewritten,false);
  await fs.appendFile(path.join(root,'app/input.ts'),'// drift\n');
  const rejected=spawnSync(process.execPath,[script,'--current'],{cwd:root,encoding:'utf8'});
  assert.equal(rejected.status,1);assert.match(rejected.stderr,/Current source differs from HEAD: app\/input.ts/);
  assert.equal(await fs.readFile(path.join(root,'docs/qa/v112-hunt-integration/source-inputs.json'),'utf8'),files['docs/qa/v112-hunt-integration/source-inputs.json']);
  assert.equal(git(['diff','--name-only']),'app/input.ts');
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
