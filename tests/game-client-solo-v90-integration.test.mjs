import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import {formationCampaignRoute,formationModel} from './helpers/solo-v90-played-route.mjs';
import {p} from './helpers/solo-v67-campaign-route.mjs';
import {homeworldQaModelV64} from '../scripts/homeworld-qa-model-v64.mjs';

const source=await readFile(new URL('../app/game/GameClient.tsx',import.meta.url),'utf8'),tree=ts.createSourceFile('GameClient.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
function find(name){let found;function visit(n){if(ts.isVariableDeclaration(n)&&n.name.getText(tree)===name)found=n;ts.forEachChild(n,visit);}visit(tree);assert(found,'actual GameClient declaration '+name);return found;}
function implementation(name,environment){const decl=find(name),fn=decl.initializer.arguments[0],compiled=ts.transpileModule('const handler='+fn.getText(tree)+';',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;return runInNewContext('(()=>{'+compiled+';return handler;})()',environment);}
let route;const played=()=>route??=formationCampaignRoute();let n=0;
function fixture(save){const key='solo-runtime-v90-'+n++,values=new Map([[key,JSON.stringify(save)]]),screens=[],notices=[];let quota=false,afterWrite=false,badRead=false;
 const store={getItem(k){if(k===key&&badRead){badRead=false;throw Error('readback interrupted');}return values.get(k)??null;},setItem(k,v){if(k===key&&quota)throw new DOMException('quota','QuotaExceededError');values.set(k,v);if(k===key&&afterWrite){afterWrite=false;badRead=true;}},removeItem:k=>values.delete(k)};
 const initial=p.loadSaveWithStatus(store,key).save,env={...p,...formationModel,entry:{ownerCreatedAt:initial.createdAt},sessionAliveRef:{current:true},pendingTrophyCommitRef:{current:null},save:initial,saveRef:{current:initial},nurseryWriteAttemptRef:{current:null},nurseryPersistenceHealthyRef:{current:true},pendingSocialWriteRef:{current:null},pendingTerminalRunRef:{current:null},activeHuntSessionRef:{current:null},SAVE_STORAGE_KEY:key,window:{localStorage:store},
  setSave(s){env.save=s;},setSaveFailure(v){env.failure=v;},setNurseryPersistenceError(v){notices.push(v);},setHubLocation(){},setScreen(s){screens.push(s);},
  writeSaveWithStatus(s){return p.writeSaveWithStatus(s,store,key);},reconcileSaveWrite(a,o){return p.reconcileSaveWrite(a,o,store,key);}};
 for(const name of ['reconcileNurseryAttempt','persistNursery','enterSoloV90','checkpointSoloV90','progressSoloV90','returnFromSoloV90'])env[name]=implementation(name,env);
 return{env,values,key,screens,notices,quota(v){quota=v;},uncertain(){afterWrite=true;},store};
}

test('actual GameClient V90 callbacks refuse quota, confirm an uncertain exact retry once and protect a replaced owner',async()=>{
 const commit=played().commits.find(c=>c.receipts.length),f=fixture(commit.before);f.quota(true);assert.equal(await f.env.progressSoloV90(commit.receipts,commit.state),false);assert.equal(f.env.saveRef.current.soloV90.receipts.length,0);assert(f.env.nurseryWriteAttemptRef.current);assert.equal(await f.env.returnFromSoloV90(),false);assert.deepEqual(f.screens,[]);
 f.quota(false);f.uncertain();assert.equal(await f.env.progressSoloV90(commit.receipts,commit.state),false);assert.equal(JSON.parse(f.values.get(f.key)).soloV90.receipts.length,1);assert.equal(await f.env.progressSoloV90(commit.receipts,commit.state),true);assert.equal(f.env.saveRef.current.soloV90.receipts.length,1);const time=f.env.saveRef.current.profile.playTimeSeconds;assert.equal(await f.env.progressSoloV90(commit.receipts,commit.state),true);assert.equal(f.env.saveRef.current.profile.playTimeSeconds,time);
 const replaced=fixture(commit.before);replaced.quota(true);assert.equal(await replaced.env.progressSoloV90(commit.receipts,commit.state),false);replaced.quota(false);const raw=JSON.stringify(p.defaultSave('2026-10-02T00:00:00.000Z'));replaced.values.set(replaced.key,raw);assert.equal(await replaced.env.progressSoloV90(commit.receipts,commit.state),false);assert.equal(replaced.values.get(replaced.key),raw);assert.deepEqual(replaced.screens,[]);
});

test('actual GameClient completed return navigates only after ownership and durable same-payload readback',async()=>{
 const run=played(),f=fixture(run.save);assert.equal(await f.env.returnFromSoloV90(),true);assert.deepEqual(f.screens,['homeworld']);const replaced=fixture(run.save),raw=JSON.stringify(p.defaultSave('2026-10-02T00:00:00.000Z'));replaced.values.set(replaced.key,raw);assert.equal(await replaced.env.returnFromSoloV90(),false);assert.deepEqual(replaced.screens,[]);assert.equal(replaced.values.get(replaced.key),raw);
});

test('hydration keeps a valid active triad preparation ahead of a terminal at-city region retained by an older archive',async()=>{
 const extras=homeworldQaModelV64(process.cwd(),['campaignSoloV70.ts','campaignSoloV90.ts','homeworldRegionsV68.ts','campaignSoloV69.ts','campaignSoloV68.ts','campaignSoloV67.ts','campaignSoloV66.ts','youthCampaign.ts','clanChronicle.ts','campaignWorldResumeV70.ts']);
 const terminal=extras.stepHomeworldRegionV68(extras.createHomeworldRegionV68('ash-marches','hydration-audit'),{interact:true});assert.equal(terminal.status,'at-city');const active=formationModel.startSoloV90Campaign({...played().origin,homeworldRegionV68:terminal});assert(active);const parsed=p.parseSaveImport(JSON.stringify(active));assert.equal(parsed.failure,null);
 const screens=[],env={...extras,...formationModel,ARCHIVE_TRANSFER_JOURNAL_KEY:'not-present',hydrationCancelled:false,entry:{ownerCreatedAt:active.createdAt,location:'youth-training'},sessionAliveRef:{current:true},expeditionOwnerRef:{current:null},saveRef:{current:null},window:{localStorage:{getItem:()=>null}},loadSaveWithStatus:()=>({save:parsed.save,loaded:true,failure:null}),setSave(){},setScreen(s){screens.push(s);},setNewGamePhase(){},setHubLocation(){},setSaveLoadIssue(){},setSelectedShipId(){},loadShipProgression:()=>({selectedShipId:'none'}),hydratePitReplayForOwner:()=>({replay:null,diagnostic:null}),setLastPitReplay(){},loadActiveHuntSave:()=>({save:null}),setCampaignCatalog(){},loadCampaignSlots:()=>null,setHydrated(){}};
 await implementation('hydrationTask',env)();assert.equal(screens.at(-1),'solo-v90','terminal region must not replace the active chapter selected during hydration');
});


test('actual V90 progression preserves a pending trophy receipt and resumes only after resolution',async()=>{
 const commit=played().commits.find(c=>c.receipts.length),f=fixture(commit.before),receipt={},before=f.values.get(f.key),initial=f.env.saveRef.current;
 f.env.pendingTrophyCommitRef.current=receipt;
 assert.equal(await f.env.progressSoloV90(commit.receipts,commit.state),false);
 assert.equal(f.values.get(f.key),before);assert.equal(f.env.saveRef.current,initial);assert.equal(f.env.pendingTrophyCommitRef.current,receipt);assert.deepEqual(f.screens,[]);
 f.env.pendingTrophyCommitRef.current=null;
 assert.equal(await f.env.progressSoloV90(commit.receipts,commit.state),true);assert.equal(f.env.saveRef.current.soloV90.receipts.length,1);
});
