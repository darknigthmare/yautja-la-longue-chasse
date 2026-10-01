import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import {templeCampaignRoute,thresholdsTemple} from './helpers/solo-v70-played-route.mjs';
import {p} from './helpers/solo-v67-campaign-route.mjs';
import {homeworldQaModelV64} from '../scripts/homeworld-qa-model-v64.mjs';

const source=await readFile(new URL('../app/game/GameClient.tsx',import.meta.url),'utf8'),tree=ts.createSourceFile('GameClient.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
function find(name){let found;function visit(n){if(ts.isVariableDeclaration(n)&&n.name.getText(tree)===name)found=n;ts.forEachChild(n,visit);}visit(tree);assert(found,'actual GameClient declaration '+name);return found;}
function implementation(name,environment){const decl=find(name),fn=decl.initializer.arguments[0],compiled=ts.transpileModule('const handler='+fn.getText(tree)+';',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;return runInNewContext('(()=>{'+compiled+';return handler;})()',environment);}
let route;const played=()=>route??=templeCampaignRoute();let n=0;
function fixture(save){const key='solo-runtime-v70-'+n++,values=new Map([[key,JSON.stringify(save)]]),screens=[],notices=[];let quota=false,afterWrite=false,badRead=false;
 const store={getItem(k){if(k===key&&badRead){badRead=false;throw Error('readback interrupted');}return values.get(k)??null;},setItem(k,v){if(k===key&&quota)throw new DOMException('quota','QuotaExceededError');values.set(k,v);if(k===key&&afterWrite){afterWrite=false;badRead=true;}},removeItem:k=>values.delete(k)};
 const initial=p.loadSaveWithStatus(store,key).save,env={...p,...thresholdsTemple,entry:{ownerCreatedAt:initial.createdAt},sessionAliveRef:{current:true},save:initial,saveRef:{current:initial},nurseryWriteAttemptRef:{current:null},nurseryPersistenceHealthyRef:{current:true},pendingSocialWriteRef:{current:null},pendingTerminalRunRef:{current:null},activeHuntSessionRef:{current:null},SAVE_STORAGE_KEY:key,window:{localStorage:store},
  setSave(s){env.save=s;},setSaveFailure(v){env.failure=v;},setNurseryPersistenceError(v){notices.push(v);},setHubLocation(){},setScreen(s){screens.push(s);},
  writeSaveWithStatus(s){return p.writeSaveWithStatus(s,store,key);},reconcileSaveWrite(a,o){return p.reconcileSaveWrite(a,o,store,key);}};
 for(const name of ['reconcileNurseryAttempt','persistNursery','enterSoloV70','checkpointSoloV70','progressSoloV70','returnFromSoloV70'])env[name]=implementation(name,env);
 return{env,values,key,screens,notices,quota(v){quota=v;},uncertain(){afterWrite=true;},store};
}

test('actual GameClient V70 callbacks refuse quota, confirm an uncertain exact retry once and protect a replaced owner',async()=>{
 const commit=played().commits[0],f=fixture(commit.before);f.quota(true);assert.equal(await f.env.progressSoloV70(commit.receipts,commit.state),false);assert.equal(f.env.saveRef.current.soloV70.receipts.length,0);assert(f.env.nurseryWriteAttemptRef.current);assert.equal(await f.env.returnFromSoloV70(),false);assert.deepEqual(f.screens,[]);
 f.quota(false);f.uncertain();assert.equal(await f.env.progressSoloV70(commit.receipts,commit.state),false);assert.equal(JSON.parse(f.values.get(f.key)).soloV70.receipts.length,1);assert.equal(await f.env.progressSoloV70(commit.receipts,commit.state),true);assert.equal(f.env.saveRef.current.soloV70.receipts.length,1);const time=f.env.saveRef.current.profile.playTimeSeconds;assert.equal(await f.env.progressSoloV70(commit.receipts,commit.state),true);assert.equal(f.env.saveRef.current.profile.playTimeSeconds,time);
 const replaced=fixture(commit.before);replaced.quota(true);assert.equal(await replaced.env.progressSoloV70(commit.receipts,commit.state),false);replaced.quota(false);const raw=JSON.stringify(p.defaultSave('2026-10-02T00:00:00.000Z'));replaced.values.set(replaced.key,raw);assert.equal(await replaced.env.progressSoloV70(commit.receipts,commit.state),false);assert.equal(replaced.values.get(replaced.key),raw);assert.deepEqual(replaced.screens,[]);
});

test('actual GameClient completed return navigates only after ownership and durable same-payload readback',async()=>{
 const run=played(),f=fixture(run.save);assert.equal(await f.env.returnFromSoloV70(),true);assert.deepEqual(f.screens,['homeworld']);const replaced=fixture(run.save),raw=JSON.stringify(p.defaultSave('2026-10-02T00:00:00.000Z'));replaced.values.set(replaced.key,raw);assert.equal(await replaced.env.returnFromSoloV70(),false);assert.deepEqual(replaced.screens,[]);assert.equal(replaced.values.get(replaced.key),raw);
});

test('hydration keeps a valid active Temple ahead of a terminal at-city region retained by an older archive',async()=>{
 const extras=homeworldQaModelV64(process.cwd(),['homeworldRegionsV68.ts','campaignSoloV69.ts','campaignSoloV68.ts','campaignSoloV67.ts','campaignSoloV66.ts','youthCampaign.ts','clanChronicle.ts','campaignWorldResumeV70.ts']);
 const terminal=extras.stepHomeworldRegionV68(extras.createHomeworldRegionV68('ash-marches','hydration-audit'),{interact:true});assert.equal(terminal.status,'at-city');const active=thresholdsTemple.startSoloV70Campaign({...played().origin,homeworldRegionV68:terminal});assert(active);const parsed=p.parseSaveImport(JSON.stringify(active));assert.equal(parsed.failure,null);
 const screens=[],env={...extras,...thresholdsTemple,ARCHIVE_TRANSFER_JOURNAL_KEY:'not-present',hydrationCancelled:false,entry:{ownerCreatedAt:active.createdAt,location:'youth-training'},sessionAliveRef:{current:true},expeditionOwnerRef:{current:null},saveRef:{current:null},window:{localStorage:{getItem:()=>null}},loadSaveWithStatus:()=>({save:parsed.save,loaded:true,failure:null}),setSave(){},setScreen(s){screens.push(s);},setNewGamePhase(){},setHubLocation(){},setSaveLoadIssue(){},setSelectedShipId(){},loadShipProgression:()=>({selectedShipId:'none'}),hydratePitReplayForOwner:()=>({replay:null,diagnostic:null}),setLastPitReplay(){},loadActiveHuntSave:()=>({save:null}),setCampaignCatalog(){},loadCampaignSlots:()=>null,setHydrated(){}};
 await implementation('hydrationTask',env)();assert.equal(screens.at(-1),'solo-v70','terminal region must not replace the active chapter selected during hydration');
});

test('the real world-resume helper preserves live region/passage screens and sends terminal reducer arrivals to the city',()=>{
 const q=homeworldQaModelV64(process.cwd(),['campaignWorldResumeV70.ts','homeworldRegionsV68.ts','homeworldPassageV67.ts']);
 const region=q.createHomeworldRegionV68('ash-marches','resume-region'),passage=q.createHomeworldPassageV67('ash-marches','outbound','resume-passage');
 const endedRegion=q.stepHomeworldRegionV68(region,{interact:true}),endedPassage=q.stepHomeworldPassageV67(passage,{interact:true});assert.equal(endedRegion.status,'at-city');assert.equal(endedPassage.status,'at-city');assert(q.normalizeHomeworldRegionV68(endedRegion));assert(q.normalizeHomeworldPassageV67(endedPassage));
 const youth=played().origin,adult=p.defaultSave('2026-10-03T00:00:00.000Z');adult.homeworld.evidenceIds=['suspect-trophy'];
 for(const [base,key,live,ended,screen]of [[youth,'homeworldRegionV68',region,endedRegion,'homeworld-region-v68'],[adult,'homeworldPassageV67',passage,endedPassage,'homeworld-passage-v67']]){
  assert.equal(p.parseSaveImport(JSON.stringify({...base,[key]:ended})).failure,null);assert.equal(q.campaignWorldResumeV70({...base,[key]:live},'homeworld'),screen);assert.equal(q.campaignWorldResumeV70({...base,[key]:ended},'homeworld'),'homeworld');
  // Defensive screen ordering also remains correct for a terminal field from
  // any archive; chapter prerequisite validation belongs to the save parser.
  const active=thresholdsTemple.startSoloV70Campaign(youth);assert(active);assert.equal(q.campaignWorldResumeV70({...active,[key]:ended},'youth-training'),null);
 }
});
