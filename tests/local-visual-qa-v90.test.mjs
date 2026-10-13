import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
import {build} from 'esbuild';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

const pageSource=fs.readFileSync('app/visual-qa-v90/page.tsx','utf8'),clientSource=fs.readFileSync('app/visual-qa-v90/client.tsx','utf8');
const transpile=source=>ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;

function pageGate(env){
 const exports={},calls=[],client=()=>{},missing=Error('NEXT_HTTP_ERROR_FALLBACK;404');
 const context={exports,process:{env},require(name){
  if(name==='next/navigation')return{notFound(){calls.push('404');throw missing;}};
  if(name==='react/jsx-runtime')return{jsx:(type,props)=>{calls.push('jsx');return{type,props};}};
  if(name==='./client')return{default:client};throw Error('Unexpected gate import '+name);
 }};
 vm.runInNewContext(transpile(pageSource),context);
 return{exports,calls,client,missing};
}

test('server gate rejects synchronously before suspension and never accepts query or NEXT_PUBLIC values',()=>{
 assert.doesNotMatch(pageSource,/^["']use client["']/m);
 for(const value of [undefined,'','0','true',' 1','1 ','yes']){
  const gate=pageGate({YAUTJA_LOCAL_VISUAL_QA_V90:value,NEXT_PUBLIC_YAUTJA_LOCAL_VISUAL_QA_V90:'1'});
  assert.throws(()=>gate.exports.default({searchParams:Promise.resolve({YAUTJA_LOCAL_VISUAL_QA_V90:'1',enabled:'1'})}),error=>error===gate.missing);
  assert.deepEqual(gate.calls,['404']);
 }
});

test('deployment on Vercel is synchronously refused even if the local flag were mistakenly present',()=>{
 const gate=pageGate({YAUTJA_LOCAL_VISUAL_QA_V90:'1',VERCEL:'1'});
 assert.throws(()=>gate.exports.default(),error=>error===gate.missing);assert.deepEqual(gate.calls,['404']);
});

test('force-dynamic gate rereads runtime environment without a Promise or build-time decision',()=>{
 const env={},gate=pageGate(env);assert.equal(gate.exports.dynamic,'force-dynamic');
 assert.throws(()=>gate.exports.default(),error=>error===gate.missing);
 env.YAUTJA_LOCAL_VISUAL_QA_V90='1';const allowed=gate.exports.default();assert.strictEqual(allowed.type,gate.client);assert.equal(allowed.then,undefined);
 assert.equal(gate.exports.metadata.robots.index,false);assert.equal(gate.exports.metadata.robots.follow,false);
 delete env.YAUTJA_LOCAL_VISUAL_QA_V90;assert.throws(()=>gate.exports.default(),error=>error===gate.missing);
 assert.deepEqual(gate.calls,['404','jsx','404']);
});

const bundled=await build({stdin:{contents:`
 export {default} from './app/visual-qa-v90/client'; export * from './app/visual-qa-v90/client';
 export {default as RealSceneV77} from './app/game/HomeworldWorldSceneV77';
 export * from './app/game/systems/homeworldEcotonesV90';
 export * from './app/game/systems/homeworldStreetCompositionQaV92';
 export * from './app/game/systems/homeworldStreetCompositionV92';
 export {HOMEWORLD_LEVELS_V77,HOMEWORLD_CONNECTIONS_V77,HOMEWORLD_REGIONAL_DOCKS_V77,HOMEWORLD_WORLD_V77,homeworldCameraWorldV77,homeworldLevelV77,homeworldWalkableV77,projectHomeworldWorldV77} from './app/game/systems/homeworldWorldV77';
 export {HOMEWORLD_GEOMETRY_V64} from './app/game/systems/homeworldGeometryV64';`,resolveDir:process.cwd()},
 bundle:true,write:false,format:'cjs',platform:'node',external:['react'],logLevel:'silent',plugins:[{name:'test-css-modules',setup(builder){
  builder.onLoad({filter:/\.module\.css$/},()=>({contents:'export default {}',loader:'js'}));
 }}]});
const localRequire=createRequire(import.meta.url),taskModule={exports:{}};
const realNextServer=localRequire('next/server');
// The installed module still exports the previous name; use its real matcher.
const {unstable_doesMiddlewareMatch}=localRequire('next/experimental/testing/server');
const proxySource=fs.readFileSync('proxy.ts','utf8');
function proxyGate(env){
 const exports={};vm.runInNewContext(transpile(proxySource),{exports,process:{env},require(name){
  assert.equal(name,'next/server');return realNextServer;
 }});return exports;
}

test('real NextResponse rejects the local QA route with status 404 before app rendering, ignoring browser flags',async()=>{
 for(const env of [{},{YAUTJA_LOCAL_VISUAL_QA_V90:'true'},{YAUTJA_LOCAL_VISUAL_QA_V90:'1 ',NEXT_PUBLIC_YAUTJA_LOCAL_VISUAL_QA_V90:'1'},
  {YAUTJA_LOCAL_VISUAL_QA_V90:'1',VERCEL:'1'}]){
  const proxy=proxyGate(env),request=new realNextServer.NextRequest('http://localhost:3031/visual-qa-v90?YAUTJA_LOCAL_VISUAL_QA_V90=1',{
   headers:{cookie:'YAUTJA_LOCAL_VISUAL_QA_V90=1','x-visual-qa-enabled':'1'},
  });
  const response=proxy.proxy(request);assert(response instanceof realNextServer.NextResponse);assert.equal(response.status,404);
  assert.equal(response.headers.get('cache-control'),'private, no-store');assert.equal(response.headers.get('x-robots-tag'),'noindex, nofollow');
  assert.equal(response.headers.get('x-middleware-next'),null);assert.equal(await response.text(),'Not found');
 }
});

test('real proxy next response is local-only and the same module rereads runtime flag changes',()=>{
 const env={},proxy=proxyGate(env),request=new realNextServer.NextRequest('http://localhost:3031/visual-qa-v90');
 assert.equal(proxy.proxy(request).status,404);env.YAUTJA_LOCAL_VISUAL_QA_V90='1';
 const allowed=proxy.proxy(request);assert(allowed instanceof realNextServer.NextResponse);assert.equal(allowed.headers.get('x-middleware-next'),'1');
 env.VERCEL='1';assert.equal(proxy.proxy(request).status,404);delete env.VERCEL;delete env.YAUTJA_LOCAL_VISUAL_QA_V90;
 assert.equal(proxy.proxy(request).status,404);
});

test('installed Next proxy matcher applies only to local QA routes and descendants, never the game or assets',()=>{
 const {config}=proxyGate({});assert.deepEqual(Array.from(config.matcher),['/visual-qa-v90/:path*','/solo-qa-v92/:path*','/clan-war-qa-v92/:path*']);
 for(const url of ['/visual-qa-v90','/visual-qa-v90?YAUTJA_LOCAL_VISUAL_QA_V90=1','/visual-qa-v90/child','/solo-qa-v92','/solo-qa-v92/child','/clan-war-qa-v92','/clan-war-qa-v92/child'])
  assert.equal(unstable_doesMiddlewareMatch({config,nextConfig:{},url}),true,url);
 for(const url of ['/','/pit-lab','/rig-lab','/api/save','/_next/static/renderer.js','/game/homeworld/native.png','/visual-qa-v90-other','/somewhere/visual-qa-v90'])
  assert.equal(unstable_doesMiddlewareMatch({config,nextConfig:{},url}),false,url);
});

const storageTrap={get(){throw Error('Visual QA must not access browser storage');}};
const bundleContext={module:taskModule,exports:taskModule.exports,require:localRequire};
Object.defineProperties(bundleContext,{localStorage:storageTrap,sessionStorage:storageTrap});
vm.runInNewContext(bundled.outputFiles[0].text,bundleContext);
const api=taskModule.exports;

test('all eleven fixtures preserve admitted V90 coordinates and source anchors; refused candidates remain absent',()=>{
 assert.equal(api.VISUAL_QA_FIXTURES_V90.length,11);
 assert.equal(api.VISUAL_QA_FIXTURES_V90.filter(item=>item.patch.regionId).length,7);
 assert.equal(api.VISUAL_QA_FIXTURES_V90.filter(item=>!item.patch.regionId).length,4);
 for(const fixture of api.VISUAL_QA_FIXTURES_V90){
  const actual=api.HOMEWORLD_ECOTONES_V90.find(patch=>patch.id===fixture.id);assert.strictEqual(fixture.patch,actual);
  assert.equal(fixture.levelId,actual.levelId);assert.deepEqual({...fixture.anchor},{x:actual.x,y:actual.y});assert.deepEqual({...fixture.arrival},{...actual.arrival});
  assert(actual.anchorElementId);assert.equal(actual.status,'MOUNTED');assert.equal(actual.solid,false);assert.equal(actual.interactive,false);
  assert(!api.HOMEWORLD_ECOTONE_REFUSALS_V90.some(patch=>patch.id===fixture.id));
 }
});

test('native camera and projection are retained; panorama rescales only the observational viewport',()=>{
 for(const fixture of api.VISUAL_QA_FIXTURES_V90){
  const viewport={width:1280,height:720},native=api.homeworldCameraWorldV77(fixture.arrival,fixture.levelId,viewport);
  const view=api.visualQaSceneViewV90(fixture,'arrival',fixture.levelId,viewport,'follow',{x:0,y:0});
  assert.deepEqual({...view.camera},{...native});assert.deepEqual({...view.projectedActor},{...api.projectHomeworldWorldV77(fixture.arrival,fixture.levelId)});
  const panorama=api.visualQaSceneViewV90(fixture,'anchor',fixture.levelId,viewport,'panorama',{x:240,y:-160});
  const expanded=api.homeworldCameraWorldV77(fixture.anchor,fixture.levelId,{width:viewport.width/.45,height:viewport.height/.45});
  assert.equal(panorama.camera.x,expanded.x+240);assert.equal(panorama.camera.y,expanded.y-160);assert.equal(panorama.camera.zoom,expanded.zoom*.45);
  assert.equal(panorama.camera.viewWidth*panorama.camera.zoom,viewport.width);
 }
});

test('sixteen V92 observational fixtures identify admitted instances and keep native working faces or existing approaches',()=>{
 assert.equal(api.VISUAL_QA_FIXTURES_V92.length,16);
 for(const fixture of api.VISUAL_QA_FIXTURES_V92){
  const members=api.HOMEWORLD_STREET_COMPOSITION_PROPS_V92.filter(item=>'composition-v92:'+item.compositionId===fixture.id);
  assert(members.length);assert.deepEqual([...fixture.memberIds],Array.from(members,item=>item.id));
  assert.equal(fixture.anchorElementId,members[0].id);assert.deepEqual({...fixture.anchor},{x:members[0].x,y:members[0].y});
  assert.equal(fixture.levelId,members[0].levelId);assert(!('patch' in fixture));
  const view=api.visualQaSceneViewV90(fixture,'arrival',fixture.levelId,{width:1280,height:720},'follow',{x:0,y:0});
  assert.deepEqual({...view.camera},{...api.homeworldCameraWorldV77(fixture.arrival,fixture.levelId,{width:1280,height:720})});
 }
});

test('actual React SSR mounts the real scene and its native ecotone material references without browser storage',()=>{
 const html=renderToStaticMarkup(React.createElement(api.default));
 assert.match(html,/QA visuelle synthétique · aucune sauvegarde\/campagne/);
 assert.match(html,/data-visual-qa-renderer="HomeworldWorldSceneV77"/);
 assert.match(html,/data-homeworld-ecotones-v90="true"/);assert.match(html,/data-homeworld-ecotone-native-material-v90=/);
 assert.match(html,/data-homeworld-ecotone-v90=/);assert.match(html,/data-homeworld-level-ground-v77="0"/);
 assert.match(html,/landscape-ground-materials-native\.png/);assert.doesNotMatch(html,/data-homeworld-actor="true"|data-campaign-menu|Enregistrer la position/);
});

const walk=node=>Array.isArray(node)?node.flatMap(walk):node&&typeof node==='object'?[node,...walk(node.props?.children)]:[];
function controlsHarness(){
 const values=[],refs=[],effects=[];let cursor=0,refCursor=0;const exports={},jsx=(type,props)=>({type,props});
 vm.runInNewContext(transpile(clientSource),{exports,require(name){
  if(name==='react')return{
   useState(initial){const n=cursor++;if(!(n in values))values[n]=initial;return[values[n],next=>{values[n]=typeof next==='function'?next(values[n]):next;}];},
   useRef(initial){return refs[refCursor++]??={current:initial};},useEffect(callback){if(!effects.length)effects.push(callback);},
  };
  if(name==='react/jsx-runtime')return{jsx,jsxs:jsx};if(name.includes('HomeworldWorldSceneV77'))return{default:api.RealSceneV77};
  if(name.includes('homeworld'))return api;if(name.endsWith('.css'))return{default:{}};throw Error('Unexpected client import '+name);
 }});
 const render=()=>{cursor=0;refCursor=0;return exports.default();};
 const find=key=>walk(render()).find(node=>node.props?.[key]);
 const scene=()=>walk(render()).find(node=>node.type===api.RealSceneV77);
 return{render,find,scene};
}

test('real local selectors pass fixture, level, actor, camera and routine time to the exact scene without campaign handlers',()=>{
 const ui=controlsHarness();assert(ui.scene());
 for(const fixture of [...api.VISUAL_QA_FIXTURES_V90,...api.VISUAL_QA_FIXTURES_V92]){
  ui.find('data-visual-qa-fixture').props.onChange({target:{value:fixture.id}});
  const scene=ui.scene();assert.strictEqual(scene.type,api.RealSceneV77);assert.equal(scene.props.levelId,fixture.levelId);assert.deepEqual({...scene.props.actor},{...fixture.arrival});
  assert.equal(scene.props.activeDoorId,null);assert.equal(scene.props.activePointId,null);assert.equal(scene.props.transit,null);assert.equal(scene.props.liftStateV83,null);
  ui.find('data-visual-qa-actor').props.onChange({target:{value:'anchor'}});assert.deepEqual({...ui.scene().props.actor},{...fixture.anchor});
 }
 ui.find('data-visual-qa-level').props.onChange({target:{value:'+2'}});assert.equal(ui.scene().props.levelId,'+2');
 ui.find('data-visual-qa-camera').props.onChange({target:{value:'panorama'}});assert.equal(ui.scene().props.camera.zoom,api.homeworldLevelV77('+2').zoom*.45);
 walk(ui.render()).find(node=>node.type==='input'&&node.props.type==='range').props.onChange({target:{value:'15'}});assert.equal(ui.scene().props.seconds,15);
 assert.equal(ui.scene().props.reducedMotion,true);
 assert.doesNotMatch(clientSource,/localStorage|sessionStorage|campaignSlots|prepareCampaign|navigator\.locks|onProgress|onExpedition|onService|onSave|GameClient|HomeworldHub/);
 const before=ui.scene().props.actor;walk(ui.render()).find(node=>node.type==='button'&&node.props.children==='→').props.onClick();assert.strictEqual(ui.scene().props.actor,before);
});
