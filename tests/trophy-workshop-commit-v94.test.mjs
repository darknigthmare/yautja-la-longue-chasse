import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
const bundled = await build({stdin: {contents: `export * from './app/game/systems/trophyWorkshopCommitV94'; export * from './app/game/save';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const a=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const owner='2026-10-16T00:00:00.000Z', date='2026-10-16T12:00:00.000Z',key='workshop-test';
function setup(action='clean'){
 const values=new Map(),faults={drop:false,quota:false,readback:false,read:false},writes=[];
 const storage={getItem(k){if(k===key&&faults.read){faults.read=false;throw Error('read');}return values.get(k)??null;},setItem(k,v){if(k===key){writes.push(v);if(faults.quota)throw Error('quota');if(faults.drop)return;}values.set(k,v);if(k===key&&faults.readback){faults.readback=false;faults.read=true;}},removeItem(k){values.delete(k);}};
 const s=a.defaultSave(owner);s.trophies=[{id:'claim-v94',definitionId:'trophy-vey',targetName:'Prise',targetKind:'human',partId:'insignia',condition:'pristine',quality:'elite',missionId:'jungle-vey',difficultyId:'elite',score:200,claimedAt:owner}];
 if(action!=='clean')s.trophies[0].workshop={completedActions:['clean','prepare','display'].slice(0,['clean','prepare','display','rite'].indexOf(action)),bestScore:500,lastCompletedAt:owner};
 const base=a.writeSaveWithStatus(s,storage,key).save;assert.equal(base.trophies.length,1);
 const target={trophyId:base.trophies[0].id,trophyName:'Prise',action};
 const result={action,score:450,accuracy:.9,mistakes:0,elapsedSeconds:10,grade:'elite'};
 const io={write:save=>a.writeSaveWithStatus(save,storage,key),reconcile:(r,o)=>a.reconcileSaveWrite(r,o,storage,key)};
 const receipt=a.createTrophyWorkshopCommitV94(base,target,result,io,date);assert.ok(receipt);
 writes.length=0;return{values,faults,writes,storage,base,target,result,io,receipt};
}
for(const action of ['clean','prepare','display','rite'])test(`${action}: one confirmed intent, original campaign unchanged, no second reward`,()=>{
 const s=setup(action),original=JSON.stringify(s.base);const r=s.receipt.run(s.base,true);assert.equal(r.status,'confirmed');assert.equal(JSON.stringify(s.base),original);assert.ok(r.save.trophies[0].workshop.completedActions.includes(action));assert.equal(r.save.trophies[0].workshop.lastCompletedAt,date);assert.equal(s.receipt.run(s.base,true).status,'ignored');assert.equal(s.writes.length,1);
});
for(const fault of ['drop','quota'])test(`${fault}: retry persists the pinned result without replaying or changing its completion time`,()=>{
 const s=setup();s.faults[fault]=true;assert.equal(s.receipt.run(s.base,true).status,'pending');assert.equal(s.base.trophies[0].workshop,undefined);s.faults[fault]=false;const r=s.receipt.run(s.base,true);assert.equal(r.status,'confirmed');assert.equal(r.save.trophies[0].workshop.lastCompletedAt,date);assert.deepEqual(r.save.trophies[0].workshop.completedActions,['clean']);
});
test('written-before-readback-failure is reconciled without a second primary write',()=>{
 const s=setup();s.faults.readback=true;assert.equal(s.receipt.run(s.base,true).status,'pending');assert.equal(s.writes.length,1);assert.equal(s.receipt.run(s.base,true).status,'confirmed');assert.equal(s.writes.length,1);
});
test('reconciliation read refusal keeps the original receipt for a later attempt',()=>{
 const s=setup();s.faults.readback=true;s.receipt.run(s.base,true);s.faults.read=true;assert.equal(s.receipt.run(s.base,true).status,'pending');assert.equal(s.receipt.run(s.base,true).status,'confirmed');assert.equal(s.writes.length,1);
});
for(const change of ['owner','progress','future'])test(`${change}: external bytes are not overwritten on retry`,()=>{
 const s=setup();s.faults.drop=true;s.receipt.run(s.base,true);s.faults.drop=false;
 const external=change==='future'?'{"version":999}':JSON.stringify({...s.base,...(change==='owner'?{createdAt:'2026-10-15T00:00:00.000Z'}:{updatedAt:'2026-10-16T19:00:00.000Z'})});s.values.set(key,external);const n=s.writes.length;assert.equal(s.receipt.run(s.base,true).status,'pending');assert.equal(s.values.get(key),external);assert.equal(s.writes.length,n);
});
test('an unrelated in-memory update cannot be lost through an old completed rite',()=>{const s=setup();assert.equal(s.receipt.run({...s.base,updatedAt:date},true).status,'pending');assert.equal(s.writes.length,0);});
test('a temporarily blocked parent preserves the intent but performs no write',()=>{const s=setup();assert.equal(s.receipt.run(s.base,false).status,'pending');assert.equal(s.writes.length,0);assert.equal(s.receipt.run(s.base,true).status,'confirmed');});
test('candidate exports and original result objects cannot mutate the pinned intent',()=>{const s=setup();s.receipt.candidate().trophies.length=0;s.result.score=0;s.target.trophyId='other';assert.equal(s.receipt.candidate().trophies.length,1);assert.equal(s.receipt.candidate().trophies[0].workshop.bestScore,450);});
test('prerequisites, action mismatch, absent and duplicate trophies are refused',()=>{
 const s=setup();for(const [base,target,result] of [[s.base,{...s.target,action:'rite'},{...s.result,action:'rite'}],[s.base,s.target,{...s.result,action:'display'}],[{...s.base,trophies:[]},s.target,s.result],[{...s.base,trophies:[...s.base.trophies,...s.base.trophies]},s.target,s.result]])assert.equal(a.createTrophyWorkshopCommitV94(base,target,result,s.io,date),null);
});
test('nonfinite and out-of-contract result data never creates a write intent',()=>{const s=setup();for(const bad of [{score:NaN},{score:Infinity},{score:601},{score:-1},{accuracy:2},{accuracy:NaN},{mistakes:3},{elapsedSeconds:-1},{grade:'fake'}])assert.equal(a.createTrophyWorkshopCommitV94(s.base,s.target,{...s.result,...bad},s.io,date),null);assert.equal(s.writes.length,0);});
test('reentrant writer callbacks cannot submit a second primary',()=>{
 const s=setup();let receipt,calls=0;receipt=a.createTrophyWorkshopCommitV94(s.base,s.target,s.result,{...s.io,write(v){calls++;assert.equal(receipt.run(s.base,true).status,'ignored');return s.io.write(v);}},date);assert.equal(receipt.run(s.base,true).status,'confirmed');assert.equal(calls,1);
});
test('a throwing custom writer without an authentic receipt remains uncertain, never replayed',()=>{const s=setup();let calls=0;const r=a.createTrophyWorkshopCommitV94(s.base,s.target,s.result,{...s.io,write(){calls++;throw Error('after an unknown write');}},date);assert.equal(r.run(s.base,true).status,'pending');assert.equal(r.run(s.base,true).status,'pending');assert.equal(calls,1);});

// Integration: execute the exact GameClient callbacks, not copies of their
// acknowledgement/closure logic. DOM rendering is covered separately in Chrome.
const {readFile} = await import('node:fs/promises');
const {default:ts} = await import('typescript');
const {transform} = await import('esbuild');
const source = await readFile(new URL('../app/game/GameClient.tsx', import.meta.url),'utf8');
const tree=ts.createSourceFile('GameClient.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
function callback(name){let found;function visit(node){if(ts.isVariableDeclaration(node)&&node.name.getText(tree)===name)found=node.initializer;ts.forEachChild(node,visit);}visit(tree);assert.ok(found&&ts.isCallExpression(found),name);return found.arguments[0].getText(tree);}
const parentCode=await transform(`export function mount(initial,target,api,io,date){
 const saveRef={current:initial},sessionAliveRef={current:true},pendingTrophyCommitRef={current:null};
 const campaignOperationRef={current:null},nurseryWriteAttemptRef={current:null},pendingSocialWriteRef={current:null},pendingTerminalRunRef={current:null},activeHuntSessionRef={current:null};
 let archiveTransferBusy=false,archiveRecoveryIssue=null,trophyWorkshop=target,pendingTrophyCommit=null,save=initial,failure=null,toast='',transfer='';
 const sounds=[],blobs=[];const playSound=name=>{sounds.push(name);};
 const setSave=v=>save=v,setSaveFailure=v=>failure=v,setToast=v=>toast=v,setPendingTrophyCommit=v=>pendingTrophyCommit=v,setTrophyWorkshop=v=>trophyWorkshop=v,setSaveTransferMessage=v=>transfer=v;
 const createTrophyWorkshopCommitV94=(base,t,r)=>api.createTrophyWorkshopCommitV94(base,t,r,io,date);
 const exportSave=api.exportSave,URL={createObjectURL(blob){blobs.push(blob);return 'blob:qa';},revokeObjectURL(){}},document={createElement(){return{click(){}};}},window={setTimeout(){}};
 const retryTrophyWorkshopSave=${callback('retryTrophyWorkshopSave')};
 const completeTrophyWorkshop=${callback('completeTrophyWorkshop')};
 const exportCampaign=${callback('exportCampaign')};
 return {complete:completeTrophyWorkshop,retry:retryTrophyWorkshopSave,export:exportCampaign,
 close(){trophyWorkshop=null;},end(){sessionAliveRef.current=false;},busy(v){archiveTransferBusy=v;},replace(v){saveRef.current=v;save=v;},
 block(name){({campaignOperationRef,nurseryWriteAttemptRef,pendingSocialWriteRef,pendingTerminalRunRef,activeHuntSessionRef})[name].current={};},
 get save(){return save;},get ref(){return saveRef.current;},get pending(){return pendingTrophyCommit;},get panel(){return trophyWorkshop;},get failure(){return failure;},get toast(){return toast;},get transfer(){return transfer;},sounds,blobs};
}`,{loader:'ts',format:'esm',target:'es2022'});
const {mount}=await import('data:text/javascript;base64,'+Buffer.from(parentCode.code).toString('base64'));
test('actual parent closes and plays its trophy sound only after a confirmed write',()=>{const s=setup(),p=mount(s.base,s.target,a,s.io,date);p.complete(s.result);assert.equal(p.panel,null);assert.equal(p.pending,null);assert.equal(p.failure,null);assert.deepEqual(p.sounds,['trophy']);assert.equal(p.save,p.ref);assert.deepEqual(p.save.trophies[0].workshop.completedActions,['clean']);p.complete(s.result);assert.equal(s.writes.length,1);});
test('actual parent preserves the panel and authoritative campaign when storage drops a write',()=>{const s=setup(),p=mount(s.base,s.target,a,s.io,date);s.faults.drop=true;p.complete(s.result);assert.ok(p.panel);assert.ok(p.pending);assert.equal(p.save,s.base);assert.deepEqual(p.sounds,[]);assert.match(p.toast,/non confirmée/);});
test('actual parent retries a closed workshop without replaying or losing its receipt',()=>{const s=setup(),p=mount(s.base,s.target,a,s.io,date);s.faults.quota=true;p.complete(s.result);p.close();s.faults.quota=false;p.retry();assert.equal(p.pending,null);assert.equal(p.save.trophies[0].workshop.lastCompletedAt,date);assert.deepEqual(p.sounds,['trophy']);});
test('actual parent reconciles successful bytes after readback failure with one write',()=>{const s=setup(),p=mount(s.base,s.target,a,s.io,date);s.faults.readback=true;p.complete(s.result);p.complete(s.result);assert.equal(s.writes.length,1);p.retry();assert.equal(s.writes.length,1);assert.deepEqual(p.sounds,['trophy']);});
test('actual parent retains a blocked result until the transfer is finished',()=>{const s=setup(),p=mount(s.base,s.target,a,s.io,date);p.busy(true);p.complete(s.result);assert.equal(s.writes.length,0);assert.ok(p.pending);p.busy(false);p.retry();assert.equal(s.writes.length,1);});
for(const guard of ['campaignOperationRef','nurseryWriteAttemptRef','pendingSocialWriteRef','pendingTerminalRunRef','activeHuntSessionRef'])test(`actual parent refuses the conflicting ${guard}`,()=>{const s=setup(),p=mount(s.base,s.target,a,s.io,date);p.block(guard);p.complete(s.result);assert.equal(s.writes.length,0);assert.ok(p.pending);assert.deepEqual(p.sounds,[]);});
test('actual parent rejects a changed campaign rather than applying an older pending rite',()=>{const s=setup(),p=mount(s.base,s.target,a,s.io,date);s.faults.drop=true;p.complete(s.result);s.faults.drop=false;const newer={...s.base,updatedAt:date};p.replace(newer);const n=s.writes.length;p.retry();assert.equal(p.failure,'save-conflict');assert.equal(p.save,newer);assert.equal(s.writes.length,n);});
test('actual parent lightweight export includes the pending result without claiming persistence',async()=>{const s=setup(),p=mount(s.base,s.target,a,s.io,date);s.faults.drop=true;p.complete(s.result);p.close();p.export();const exported=JSON.parse(await p.blobs[0].text());assert.ok(JSON.stringify(exported).includes('lastCompletedAt'));assert.ok(p.pending);assert.equal(p.save,s.base);assert.match(p.transfer,/ne confirme pas/);});
test('an ended parent session cannot create or retry a rite write',()=>{const s=setup(),p=mount(s.base,s.target,a,s.io,date);p.end();p.complete(s.result);p.retry();assert.equal(s.writes.length,0);assert.deepEqual(p.sounds,[]);});

// Pending rites also own the parent mutation boundary, including the interval
// before React has published saveFailure and after the workshop has closed.
const {runInNewContext}=await import('node:vm');
for(const name of ['persist','persistNursery','persistSocialProgress','go','launchMission','resetProgress','confirmCompleteImport','confirmImport','saveManagedCheckpoint','returnToMainMenu','persistExplorationProgress','completeMission','exportComplete','readArchiveFile'])test(`actual ${name} cannot discard or overwrite an unconfirmed rite`,async()=>{
 const messages=[],pending={current:{}};
 const env={pendingTrophyCommitRef:pending,sessionAliveRef:{current:true},saveRef:{current:{createdAt:owner}},setToast:m=>messages.push(m),setSaveTransferMessage:m=>messages.push(m),setCampaignSaveMessage:m=>messages.push(m)};
 const code=ts.transpileModule(`(${callback(name)})`,{compilerOptions:{module:ts.ModuleKind.None,target:ts.ScriptTarget.ES2022}}).outputText;
 const fn=runInNewContext(code,env);await fn({createdAt:owner});assert.equal(pending.current!==null,true);
 // Every other campaign dependency is deliberately absent: reaching it would
 // throw, making a missing guard visible rather than mocking a successful save.
});
let unloadEffect;
function visitUnload(n){if(ts.isCallExpression(n)&&n.expression.getText(tree)==='useEffect'&&n.arguments[0]?.getText(tree).includes('beforeunload'))unloadEffect=n.arguments[0].getText(tree);ts.forEachChild(n,visitUnload);}visitUnload(tree);assert.ok(unloadEffect);
for(const pending of [false,true])test(`actual unload warning follows pending=${pending} and removes its exact listener`,()=>{
 const added=[],removed=[],window={addEventListener:(...args)=>added.push(args),removeEventListener:(...args)=>removed.push(args)};
 const code=ts.transpileModule(`(${unloadEffect})`,{compilerOptions:{module:ts.ModuleKind.None,target:ts.ScriptTarget.ES2022}}).outputText;
 const cleanup=runInNewContext(code,{pendingTrophyCommit:pending?{}:null,window})();assert.equal(added.length,pending?1:0);
 if(pending){let prevented=false;const event={returnValue:null,preventDefault(){prevented=true;}};added[0][1](event);assert.equal(prevented,true);assert.equal(event.returnValue,'');cleanup();assert.deepEqual(removed,added);}else assert.equal(cleanup,undefined);
});

test('checkpoint and title import affordances explain that a trophy receipt blocks leaving',()=>{
 assert.match(source,/checkpointBlockedReason = pendingTrophyCommit \?/);
 assert.match(source,/if \(pendingTrophyCommitRef\.current\) \{ setSaveTransferMessage\("Rite en attente : confirmez la sauvegarde avant de quitter/);
});
