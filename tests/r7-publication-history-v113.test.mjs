import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {R7_PUBLICATION_COMMIT_V113,R7_PUBLICATION_TREE_V113,R7_RUNTIME_COMMIT_V113,
 readR7PublicationManifestV113,prepareR7PublicationV113,verifyR7PublicationV113,
 verifyR7CurrentInputsUnchangedV113,runR7PublicationV113} from '../scripts/check-homeworld-publication-history-v112-r7.mjs';

let context;
test.before(async()=>{context=await prepareR7PublicationV113();});
test.after(async()=>{await context?.dispose();});

test('R7 retains the nine assertions, 1894 publication files and the original V111 negative-test fixture',async()=>{
 const manifest=await readR7PublicationManifestV113();
 assert.equal(manifest.sourceCommit,R7_PUBLICATION_COMMIT_V113);assert.equal(manifest.sourceTree,R7_PUBLICATION_TREE_V113);
 assert.equal(manifest.originalTest.bytes,9389);assert.equal(manifest.originalTest.gitBlobSha,'8716293c200408c46fbec3d5f8251ded05ef5f19');
 const result=await verifyR7PublicationV113(context);
 assert.equal(result.privateRegularFiles,1895);assert.equal(result.publicationRegularFiles,1894);assert.equal(result.originalTestFixtureFiles,1);
 assert.equal(result.frozenInputs,1649);assert.equal(result.publicationInputs,1891);
 assert.ok(result.copiedMatchingCurrentFiles>0);assert.ok(result.restoredPinnedGitFiles>0,'Changed current hunting sources must be restored from their real Git preimages');
 for(const directory of ['docs','public','art-source','.git'])assert.equal((await fs.lstat(path.join(context.root,directory))).isSymbolicLink(),false);
 assert.equal(result.currentRuntimeCovered,false);
});

test('R7 executes its complete unchanged nine-assertion test and three original CLIs without certifying current code',{timeout:480000},async()=>{
 let result;
 try{result=await runR7PublicationV113(context);}
 catch(error){if(error.stdout)process.stdout.write(error.stdout);if(error.stderr)process.stderr.write(error.stderr);throw error;}
 assert.equal(result.status,'PASS_HISTORICAL_R7_PUBLICATION');assert.equal(result.originalAssertions,9);
 assert.equal(result.originalTestsExecuted,true);assert.equal(result.originalCommandsExecuted,3);
 assert.equal(result.currentInputsUnchanged,1895);assert.equal(result.currentRuntimeCovered,false);
 assert.equal(result.runtimeBrowserEvidenceReexecuted,false);assert.equal(result.nativeExcelExecuted,false);
 assert.equal(result.commands[2].result.bytes,9433700);
 assert.equal(result.commands[2].result.sha256,'723cc894b643d55dcd076cab8b615866c6879ecc481c55616adcdd0508d2eccc');
 process.stdout.write(result.originalTestOutput);
 for(const command of result.commands)process.stdout.write(command.stdout);
});

test('R7 rejects private input, metadata and HEAD tampering while original current files stay unchanged',async()=>{
 for(const relative of ['app/game/ClanWarAtlasV95.tsx','docs/v112-runtime-freeze.json','.git/HEAD']){
  const file=path.join(context.root,relative),before=await fs.readFile(file);
  const current=relative.startsWith('.git/')?null:await fs.readFile(relative);
  try{
   await fs.chmod(file,0o644);await fs.appendFile(file,'\n');await fs.chmod(file,0o444);
   await assert.rejects(verifyR7PublicationV113(context),/R7 (?:historical input|historical HEAD) changed/);
   if(current)assert.deepEqual(await fs.readFile(relative),current);
  }finally{await fs.chmod(file,0o644);await fs.writeFile(file,before);await fs.chmod(file,0o444);}
 }
 await verifyR7PublicationV113(context);await verifyR7CurrentInputsUnchangedV113(context);
});

test('R7 refuses substituted current contexts, unpinned metadata labels and symlinked historical directories',async()=>{
 await assert.rejects(verifyR7PublicationV113({...context}),/Unrecognized R7 historical context/);
 const root=context.root,source=context.sourceCommit,runtime=context.runtimeCommit;
 try{context.root=process.cwd();await assert.rejects(verifyR7PublicationV113(context),/context root changed/);}finally{context.root=root;}
 try{context.sourceCommit=R7_RUNTIME_COMMIT_V113;await assert.rejects(verifyR7PublicationV113(context),/context source changed/);}finally{context.sourceCommit=source;}
 try{context.runtimeCommit=R7_PUBLICATION_COMMIT_V113;await assert.rejects(verifyR7PublicationV113(context),/context runtime changed/);}finally{context.runtimeCommit=runtime;}
 const directory=path.join(root,'docs'),moved=path.join(root,'private-docs-moved');
 try{
  await fs.rename(directory,moved);await fs.symlink(path.resolve('docs'),directory,'dir');
  await assert.rejects(verifyR7PublicationV113(context),/private regular file/);
 }finally{await fs.unlink(directory);await fs.rename(moved,directory);}
 await verifyR7PublicationV113(context);
});

test('missing shallow-checkout objects are fetched from the named canonical commits only into private Git',{timeout:240000},async()=>{
 const empty=await fs.mkdtemp(path.join(os.tmpdir(),'r7-empty-object-source-'));
 let isolated;
 try{
  execFileSync('git',['-C',empty,'init','--quiet'],{stdio:'ignore'});
  const before=await fs.readFile(path.join(empty,'.git/HEAD'));
  isolated=await prepareR7PublicationV113({objectRepository:empty});
  const integrity=await verifyR7PublicationV113(isolated);
  assert.deepEqual(integrity.fetchedCanonicalCommits,[R7_PUBLICATION_COMMIT_V113,R7_RUNTIME_COMMIT_V113]);
  assert.equal(integrity.currentRuntimeCovered,false);
  assert.deepEqual(await fs.readFile(path.join(empty,'.git/HEAD')),before);
  const refs=execFileSync('git',['-C',empty,'for-each-ref'],{encoding:'utf8'});assert.equal(refs,'');
 }finally{await isolated?.dispose();await fs.rm(empty,{recursive:true,force:true});}
});
