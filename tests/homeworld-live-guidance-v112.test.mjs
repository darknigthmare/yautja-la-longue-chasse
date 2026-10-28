import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';

const file='app/game/HomeworldWorldMapV77.tsx';
const text=fs.readFileSync(file,'utf8');
const source=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const declarations=new Map();
function visit(node){if(ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name))declarations.set(node.name.text,node);ts.forEachChild(node,visit);}
visit(source);
const memo=name=>{const call=declarations.get(name)?.initializer;assert(call&&ts.isCallExpression(call)&&call.expression.getText(source)==='useMemo',name+' is a real React memo');return call;};
const model=homeworldSceneSsrV78();
const navigation=model.load('app/game/systems/homeworldWayfindingV112.ts');
const saves=model.load('app/game/save.ts');

test('the actual React origin memo depends on both published coordinates and the physical space, without a delayed second state',()=>{
 const call=memo('routeOrigin');
 assert.deepEqual(call.arguments[1].elements.map(node=>node.getText(source)),['actor.x','actor.y','levelId','interiorId']);
 assert(!text.includes('setRouteOrigin'));
 assert(!text.includes('setInterval(update,350)'));
 const callback=ts.transpileModule('export default '+call.arguments[0].getText(source),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 function origin(actor,levelId='0',interiorId=null){const compiledModule={exports:{}};new Function('actor','levelId','interiorId','module','exports',callback)(actor,levelId,interiorId,compiledModule,compiledModule.exports);return compiledModule.exports.default();}
 const first={x:7520,y:5350},next={x:7480,y:5346};
 assert.deepEqual(origin(first),{actor:first,levelId:'0',interiorId:null});
 assert.deepEqual(origin(next),{actor:next,levelId:'0',interiorId:null});
 assert.notEqual(origin(first).actor,first,'the memo snapshots scalar coordinates instead of retaining a mutable body reference');
 assert.deepEqual(origin(next,'+1','council'),{actor:next,levelId:'+1',interiorId:'council'});
 const guidance=memo('guidance');
 assert.deepEqual(guidance.arguments[1].elements.map(node=>node.getText(source)),['activePlan','routeOrigin','save']);
 assert.match(guidance.arguments[0].getText(source),/homeworldRouteGuidanceV112\(activePlan,routeOrigin,save\)/);
});

test('the unchanged current guide changes its heading for a newly published body and preserves owner and ground refusals',()=>{
 const save=saves.defaultSave('2026-09-20T10:00:00.000Z');
 save.homeworld.visitedDistrictIds=['port'];
 const origin={actor:{x:7520,y:5350},levelId:'0',interiorId:null};
 const plan=navigation.homeworldRoutePlanV112(save,origin,'point:personal-ship');
 assert.equal(plan.status,'reachable');
 const before=navigation.homeworldRouteGuidanceV112(plan,origin,save);
 const moved=navigation.homeworldRouteGuidanceV112(plan,{...origin,actor:{x:7480,y:5346}},save);
 assert.equal(before.state,'walking');assert.equal(moved.state,'walking');
 assert.notDeepEqual(before.waypoint,moved.waypoint,'a subsequent body cannot keep the initial heading');
 assert.equal(navigation.homeworldRouteGuidanceV112(plan,origin,{...save,createdAt:'2026-09-21T10:00:00.000Z'}),null);
 assert.equal(navigation.homeworldRouteGuidanceV112({...plan,geometryKey:'changed'},origin,save).state,'off-route');
 assert.match(text,/suspended=\{routeSuspended\}/,'pause still reaches the actual guide');
 assert.match(text,/homeworldRouteResponseCurrentV112\(request,next,latest\.save,/,'the actual Worker response keeps its ownership and origin gate');
});

test('the actual browser follower refuses a stale arrived guide before accepting the last step',async()=>{
 const driverFile='scripts/qa-homeworld-public-spaces-v112.mjs',driverText=fs.readFileSync(driverFile,'utf8');
 const driver=ts.createSourceFile(driverFile,driverText,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 let follower;
 function find(node){if(ts.isFunctionDeclaration(node)&&node.name?.text==='followGuide')follower=node;ts.forEachChild(node,find);}
 find(driver);assert(follower);
 const routine=new Function('page','actor','tick','observations','name','assert','return '+follower.getText(driver));
 for(const state of [{state:'arrived',current:'false'},{state:'off-route',current:'true'},{state:'arrived',current:'true'}]){
  const observations=[],page={locator:()=>({count:async()=>1,evaluate:async()=>state}),keyboard:{up:async()=>{}}};
  const follow=routine(page,async()=>({x:1,y:2,level:'0'}),async()=>{},observations,'authority-unit',assert);
  if(state.current==='true'&&state.state==='arrived')assert.equal((await follow('actual-target')).state.state,'arrived');
  else await assert.rejects(follow('actual-target'),/Actual guide must remain current/);
  assert.equal(observations[0].tail.length,1,'the real bounded trace retains the final inspected state');
 }
});
