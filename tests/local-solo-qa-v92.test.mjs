import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {createRequire} from 'node:module';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';

const qa=homeworldSceneSsrV78(),fixtures=qa.load('app/solo-qa-v92/fixtures.ts'),solo=qa.load('app/game/systems/firstHuntSoloV90.ts');
const controls=qa.load('app/game/systems/youthControls.ts'),bindings=qa.load('app/game/systems/controlBindings.ts');
const pageSource=fs.readFileSync('app/solo-qa-v92/page.tsx','utf8'),clientSource=fs.readFileSync('app/solo-qa-v92/client.tsx','utf8');
const transpile=source=>ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
function pageGate(env){const exports={},missing=Error('404'),client=()=>{};
 vm.runInNewContext(transpile(pageSource),{exports,process:{env},require(name){
  if(name==='next/navigation')return{notFound(){throw missing;}};
  if(name==='react/jsx-runtime')return{jsx:(type,props)=>({type,props})};
  if(name==='./client')return{default:client};throw Error('Unexpected server import '+name);
 }});return{exports,missing,client};
}

test('solo route uses synchronous server-only opt-in, always rejects Vercel, and rereads the environment',()=>{
 assert.doesNotMatch(pageSource,/^["']use client["']/m);
 for(const flag of [undefined,'','0','true',' 1','1 ','yes']){const gate=pageGate({YAUTJA_LOCAL_VISUAL_QA_V90:flag,NEXT_PUBLIC_YAUTJA_LOCAL_VISUAL_QA_V90:'1'});
  assert.throws(()=>gate.exports.default({searchParams:Promise.resolve({enabled:'1',fixture:'complete'})}),error=>error===gate.missing);
 }
 const env={YAUTJA_LOCAL_VISUAL_QA_V90:'1',VERCEL:'1'},gate=pageGate(env);
 assert.throws(()=>gate.exports.default(),error=>error===gate.missing);delete env.VERCEL;
 const allowed=gate.exports.default();assert.strictEqual(allowed.type,gate.client);assert.equal(allowed.then,undefined);
 delete env.YAUTJA_LOCAL_VISUAL_QA_V90;assert.throws(()=>gate.exports.default(),error=>error===gate.missing);
 assert.equal(gate.exports.dynamic,'force-dynamic');assert.equal(gate.exports.metadata.robots.index,false);assert.equal(gate.exports.metadata.robots.follow,false);
});

test('all four tracked fixtures validate with the real codec and contain only scene state, not campaign identities or permissions',()=>{
 const expected=[['arsenal','arsenal',1,160],['combat','combat',1634,2589],['dodge','combat',1635,2583.8],['complete','complete',7047,163.5]];
 assert.equal(fixtures.SOLO_QA_FIXTURES_V92.length,4);
 for(const [id,phase,tick,x]of expected){const fixture=fixtures.SOLO_QA_FIXTURES_V92.find(item=>item.id===id),copy=fixtures.soloQaCheckpointV92(id);
  assert(fixture&&copy);assert.equal(fixture.sourceSha256,solo.SOLO_V90_SOURCE_SHA);assert.equal(copy.phase,phase);assert.equal(copy.tick,tick);assert.equal(copy.player.x,x);
  assert.deepEqual(copy,solo.normalizeSoloV90State(fixture.checkpoint));assert.notStrictEqual(copy,fixture.checkpoint);assert.notStrictEqual(copy.player,fixture.checkpoint.player);
  assert.deepEqual(Object.keys(fixture).sort(),['checkpoint','id','label','sourceFile','sourceSha256']);
  assert.equal(fixture.sourceFile,'campaign-played-'+id+'.json');
  for(const forbidden of ['ownerCreatedAt','profile','inventory','settings','createdAt','storyCompleted','homeworld','justice','rankId','honor'])assert(!JSON.stringify(fixture).includes('"'+forbidden+'"'));
 }
 assert.equal(fixtures.soloQaCheckpointV92('unknown'),null);
 const dodge=fixtures.soloQaCheckpointV92('dodge');assert.equal(dodge.evasion.ticks,23);assert.equal(dodge.evasion.cooldown,60);
});

test('the actual keyboard binding sampler reaches real movement and evasion in the combat simulation',()=>{
 const original=fixtures.soloQaCheckpointV92('combat'),env={assetsReady:true,pageVisible:true,paused:false};
 const neutral=solo.stepSoloV90(original,{},env).state;
 const input=controls.sampleYouthControls(new Set(['KeyU']),new Set(),bindings.DEFAULT_CONTROL_BINDINGS,null).actions;
 assert.equal(input.dodge,true);
 const evaded=solo.stepSoloV90(neutral,{move:input.move,jump:input.jump,interact:input.interact,command:input.blade,dodge:input.dodge},env).state;
 assert.equal(evaded.evasion.ticks,solo.SOLO_V92_EVASION.duration);assert.equal(evaded.evasion.cooldown,solo.SOLO_V92_EVASION.recovery);
 assert(Math.abs(Math.abs(evaded.player.x-neutral.player.x)-solo.SOLO_V92_EVASION.speed)<1e-9);assert.equal(evaded.health,neutral.health);assert(solo.normalizeSoloV90State(evaded));
 const walking=controls.sampleYouthControls(new Set(['ArrowRight']),new Set(),bindings.DEFAULT_CONTROL_BINDINGS,null).actions;
 const moved=solo.stepSoloV90(neutral,{move:walking.move},env).state;assert(moved.player.x>neutral.player.x);
 assert.equal(original.player.x,2589,'fixture source must never be mutated by QA play');
});

test('memory owner rejects invalid state and mismatched or duplicate receipts without awarding campaign progress',()=>{
 const snapshot=fixtures.soloQaCheckpointV92('complete'),receipts=solo.soloV90Receipts(snapshot);
 assert.deepEqual(fixtures.soloQaAcceptV92(snapshot,receipts),snapshot);
 assert.equal(fixtures.soloQaAcceptV92({...snapshot,health:99}),null);
 assert.equal(fixtures.soloQaAcceptV92(snapshot,[{...receipts[0],tick:999}]),null);
 assert.equal(fixtures.soloQaAcceptV92(snapshot,[{...receipts[0],sourceId:'other.source'}]),null);
 assert.equal(fixtures.soloQaAcceptV92(snapshot,[receipts[0],receipts[0]]),null);
 assert.doesNotMatch(clientSource,/localStorage|sessionStorage|fetch\(|campaignSlots|prepareCampaign|onSave|GameClient|homeworldProgress|saveProfile|router\.|window\.|document\./);
 assert.doesNotMatch(fs.readFileSync('app/solo-qa-v92/fixtures.ts','utf8'),/work-local|ownerCreatedAt|rankId|writeFile|createSoloV90State\(/);
});

test('actual React SSR mounts FirstHuntSoloV90 and the source arsenal HUD/canvas, without campaign saves',()=>{
 const html=qa.render('app/solo-qa-v92/client.tsx',{});
 assert.match(html,/data-local-solo-qa-v92="synthetic-replayed-memory-only"/);
 assert.match(html,/data-solo-qa-renderer="FirstHuntSoloV90"/);assert.match(html,/data-solo-step="arsenal"/);assert.match(html,/<canvas[^>]*tabindex="0"/);
 assert.match(html,/Fixtures synthétiques rejouées/);assert.match(html,/aucune sauvegarde réelle/i);assert.match(html,/campagne achevée/);
 assert.match(html,/KeyU|Esquive U/);assert.doesNotMatch(html,/data-campaign-menu|data-homeworld-actor=/);
});

const walk=node=>Array.isArray(node)?node.flatMap(walk):node&&typeof node==='object'?[node,...walk(node.props?.children)]:[];
function controlsHarness(){const values=[],refs=[];let cursor=0,refCursor=0;const exports={},real=qa.load('app/game/FirstHuntSoloV90.tsx').default,jsx=(type,props,key)=>({type,props,key});
 vm.runInNewContext(transpile(clientSource),{exports,require(name){
  if(name==='react')return{useState(initial){const index=cursor++;if(!(index in values))values[index]=typeof initial==='function'?initial():initial;return[values[index],next=>{values[index]=typeof next==='function'?next(values[index]):next;}];},useRef(initial){return refs[refCursor++]??={current:initial};},useCallback:fn=>fn};
  if(name==='react/jsx-runtime')return{jsx,jsxs:jsx};if(name.includes('FirstHuntSoloV90'))return{default:real};
  if(name.includes('controlBindings'))return bindings;if(name==='./fixtures')return fixtures;if(name.endsWith('.css'))return{default:{}};throw Error('Unexpected QA client import '+name);
 }});
 const render=()=>{cursor=0;refCursor=0;return exports.default();},scene=()=>walk(render()).find(node=>node.type===real),find=key=>walk(render()).find(node=>node.props?.[key]);
 return{render,scene,find};
}

test('real selector/reset and memory callbacks drive the exact component, while exit/city return unmount only the QA scene',async()=>{
 const ui=controlsHarness();assert(ui.scene());
 for(const fixture of fixtures.SOLO_QA_FIXTURES_V92){ui.find('data-solo-qa-fixture').props.onChange({target:{value:fixture.id}});
  const scene=ui.scene();assert.deepEqual(scene.props.checkpoint,fixture.checkpoint);assert.strictEqual(scene.props.bindings,bindings.DEFAULT_CONTROL_BINDINGS);assert.equal(scene.props.soundEnabled,false);
  assert.equal(scene.props.onCheckpoint(fixture.checkpoint),true);assert.equal(scene.props.onCheckpoint({...fixture.checkpoint,tick:-1}),false);
 }
 const previousKey=ui.scene().key;ui.find('data-solo-qa-reset').props.onClick();assert.notEqual(ui.scene().key,previousKey);
 const checkpoint=ui.scene().props.checkpoint;assert.equal(await ui.scene().props.onProgress(solo.soloV90Receipts(checkpoint),checkpoint),true);
 await ui.scene().props.onExit();assert.equal(ui.scene(),undefined);ui.find('data-solo-qa-reset').props.onClick();assert(ui.scene());
 assert.equal(await ui.scene().props.onReturnToCity(),true);assert.equal(ui.scene(),undefined);
});

test('installed Next proxy covers only local QA routes and denies solo with real HTTP 404 before streaming',async()=>{
 const require=createRequire(import.meta.url),server=require('next/server'),{unstable_doesMiddlewareMatch}=require('next/experimental/testing/server');
 const source=fs.readFileSync('proxy.ts','utf8');
 const load=env=>{const exports={};vm.runInNewContext(transpile(source),{exports,process:{env},require(name){assert.equal(name,'next/server');return server;}});return exports;};
 const config=load({}).config;
 for(const url of ['/solo-qa-v92','/solo-qa-v92?enabled=1','/solo-qa-v92/child','/visual-qa-v90','/clan-war-qa-v92','/clan-war-qa-v92/child'])assert.equal(unstable_doesMiddlewareMatch({config,nextConfig:{},url}),true,url);
 for(const url of ['/','/api/save','/game/homeworld/v83/basalt-planter-left.png','/_next/static/client.js','/solo-qa-v92-other'])assert.equal(unstable_doesMiddlewareMatch({config,nextConfig:{},url}),false,url);
 for(const env of [{},{YAUTJA_LOCAL_VISUAL_QA_V90:'true'},{YAUTJA_LOCAL_VISUAL_QA_V90:'1',VERCEL:'1'}]){
  const response=load(env).proxy(new server.NextRequest('http://localhost:3031/solo-qa-v92?enabled=1',{headers:{cookie:'YAUTJA_LOCAL_VISUAL_QA_V90=1'}}));
  assert.equal(response.status,404);assert.equal(await response.text(),'Not found');assert.equal(response.headers.get('x-robots-tag'),'noindex, nofollow');
 }
 assert.equal(load({YAUTJA_LOCAL_VISUAL_QA_V90:'1'}).proxy(new server.NextRequest('http://localhost:3031/solo-qa-v92')).headers.get('x-middleware-next'),'1');
});
