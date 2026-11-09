import assert from "node:assert/strict";
import {after,test} from "node:test";
import {readFile,mkdir,writeFile} from "node:fs/promises";
import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";
import {runInNewContext} from "node:vm";
import {createHash} from "node:crypto";
import {dirname,resolve} from "node:path";
import {gzipSync} from "node:zlib";
import {renderToStaticMarkup} from "react-dom/server";
import {createElement} from "react";
import {build} from "esbuild";
import ts from "typescript";

const root=fileURLToPath(new URL("../",import.meta.url));
const source=await readFile(root+"app/game/HuntCanvas.tsx","utf8");
const ast=ts.createSourceFile("HuntCanvas.tsx",source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let handler;
const visit=node=>{if(ts.isBinaryExpression(node)&&node.left.getText(ast)==="riteMenuActionRef.current"&&ts.isArrowFunction(node.right)&&node.right.parameters.length===1)handler=node.right;ts.forEachChild(node,visit);};visit(ast);
assert.ok(handler);
const appended=String.raw`
export {makeGameState,makeEnemy,damageEnemy,updateRegularEnemy,updateHuntRitesV77,riteContextV77,startHuntRiteV77,snapshot,huntRiteMenuSnapshotV77,captureCheckpoint,restoreRitesRuntimeV77,riteSourceLabelV77};
export {defaultSave} from "./save";export {MISSION_BY_ID} from "./data";
export {default as NativeRiteMenu} from "./HuntRitesMenuV77";
export function nativeRiteCallbackUnit(game,mission,action,observed){
 const setUi=ui=>observed.ui=ui;const emitPersistence=()=>observed.emissions++;
 const persistHuntRef={current:null};const handler=`+handler.getText(ast)+`;handler(action);}`;
const bundle=await build({stdin:{contents:source+appended,resolveDir:root+"app/game",sourcefile:root+"app/game/HuntCanvas.tsx",loader:"tsx"},bundle:true,write:false,format:"cjs",platform:"node",jsx:"automatic",loader:{".module.css":"empty"},external:["react","react/jsx-runtime","react-dom"],logLevel:"silent"});
const mod={exports:{}};runInNewContext(bundle.outputFiles[0].text,{module:mod,exports:mod.exports,require:createRequire(import.meta.url)});
const r=mod.exports,plain=value=>JSON.parse(JSON.stringify(value)),records=[];
const hash=value=>createHash("sha256").update(value).digest("hex");
function fixture(){
 // Constructed native integration fixture, never claimed as a mission run.
 const save=r.defaultSave("2026-11-02T00:00:00.000Z");save.inventory.fieldToolIds=["flaying-tool"];
 const mission=r.MISSION_BY_ID["jungle-vey"],game=r.makeGameState(mission,save.loadout,save.inventory,"hunter",save.appearance,false,false,0,save.exploration);
 for(const id of ["unit-carried-body","unit-nearer-body"]){
  const enemy=r.makeEnemy(id,"hell-hound-stalker",mission.id,game.player.x,game.world.width,80,10,0,1,1);
  Object.assign(enemy,{x:game.player.x+game.player.width/2-20,y:game.world.floorY-60,width:40,height:60,scanned:true});
  game.enemies.push(enemy);r.damageEnemy(game,mission,enemy,enemy.health,"melee");
 }
 const flay=r.startHuntRiteV77(game.huntRites,"unit-carried-body","flay",r.riteContextV77(game));
 assert.equal(flay.accepted,true);game.huntRites=flay.state;game.riteOperationDamageStart=game.damageTaken;
 for(let i=0;i<100&&game.huntRites.operation;i++){game.elapsed+=.05;r.updateHuntRitesV77(game,.05);}
 assert.equal(game.huntRites.operation,null);
 const observed={ui:null,emissions:0};
 r.nativeRiteCallbackUnit(game,mission,"open",observed);r.nativeRiteCallbackUnit(game,mission,"carry",observed);
 assert.equal(game.huntRites.carryingCorpseId,"unit-carried-body");
 const actor={x:game.player.x+game.player.width/2,y:game.player.y+game.player.height};
 return {game,mission,actor,observed};
}
function checkpointWithoutCarrying(game){
 const cp=r.captureCheckpoint(game,"resume");cp.spawnedWaves=[...cp.spawnedWaves];cp.completedObjectives=[...cp.completedObjectives];cp.brokenPillarIds=[...cp.brokenPillarIds];delete cp.huntRites.carryingCorpseId;return plain(cp);
}
function freezeTree(value){if(value&&typeof value==="object"){Object.freeze(value);for(const entry of Object.values(value))freezeTree(entry);}return value;}

test("a native carried body remains the real menu target above a nearer corpse, and its drop callback works",()=>{
 const f=fixture(),before=plain(f.game.huntRites),checkpoint=checkpointWithoutCarrying(f.game),positions=plain(f.game.enemies.map(e=>[e.id,e.x,e.y,e.health]));
 const menu=r.snapshot(f.game,f.mission).huntRiteMenu;
 assert.equal(menu.corpseId,"unit-carried-body");assert.equal(menu.open,true);assert.equal(menu.carrying,true);
 assert.deepEqual(plain(f.game.huntRites),before,"snapshot selection must not mutate source state");
 const markup=renderToStaticMarkup(createElement(r.NativeRiteMenu,{menu,onOpen:()=>{},onClose:()=>{},onAction:()=>{}}));
 assert.match(markup,/data-rite-action-v112="drop"/);assert.match(markup,/Déposer la carcasse/);
 assert.doesNotMatch(markup,/<button[^>]*disabled=""[^>]*data-rite-action-v112="drop"/);
 r.nativeRiteCallbackUnit(f.game,f.mission,"drop",f.observed);
 assert.equal(f.game.huntRites.carryingCorpseId,null);assert.equal(f.observed.ui.fieldPackV112.canDrop,true);
 assert.deepEqual(checkpointWithoutCarrying(f.game),checkpoint,"drop must preserve all other checkpoint fields, stock, provenance, wear receipts and mandatory objectives");
 assert.deepEqual(plain(f.game.enemies.map(e=>[e.id,e.x,e.y,e.health])),positions);
 records.push({case:"native-carry-menu-and-drop-callback",classification:"CONSTRUCTED_NATIVE_INTEGRATION_NOT_CAMPAIGN",menuTargetBeforeDrop:menu.corpseId,dropButtonRenderedAndEnabled:true,carryingAfterDrop:null,otherCheckpointFieldsUnchanged:true});
});

test("selection is read only for a deeply frozen corpse registry and retains its array order",()=>{
 const f=fixture(),state=freezeTree(plain(f.game.huntRites)),before=JSON.stringify(state);
 const menu=r.huntRiteMenuSnapshotV77(state,f.actor,"unit-carried-body",true,{flayingToolOwned:true,supports:[],acceptSpecimen:()=>true});
 assert.equal(menu.corpseId,"unit-carried-body");assert.equal(JSON.stringify(state),before);
 records.push({case:"frozen-state-immutability",passed:true});
});

const base=fixture();
const cases=[
 ["missing carried identity",state=>state.carryingCorpseId="missing","unit-nearer-body"],
 ["erased carried body",state=>state.corpses[0].erased=true,"unit-nearer-body"],
 ["supported carried body",state=>{state.corpses[0].supportId="unit-hook";state.corpses[0].hangingAt={x:0,y:0};},"unit-nearer-body"],
 ["inconsistent hanging anchor",state=>state.corpses[0].hangingAt={x:0,y:0},"unit-nearer-body"],
 ["unflayed carried body",state=>state.corpses[0].flayed=false,"unit-nearer-body"],
 ["overweight carried body",state=>state.corpses[0].massKg=171,"unit-nearer-body"],
 ["nonphysical carried mass",state=>state.corpses[0].massKg=0,"unit-nearer-body"],
 ["nonfinite carried mass",state=>state.corpses[0].massKg=Infinity,"unit-nearer-body"],
 ["nonfinite carried position",state=>state.corpses[0].x=NaN,"unit-nearer-body"],
 ["legacy omitted mass",state=>delete state.corpses[0].massKg,"unit-carried-body"],
 ["exact native reach",state=>{state.corpses[0].x=base.actor.x+88;state.corpses[0].y=base.actor.y;},"unit-carried-body"],
 ["outside native reach",state=>{state.corpses[0].x=base.actor.x+88.001;state.corpses[0].y=base.actor.y;},"unit-nearer-body"],
 ["vertical outside native reach",state=>{state.corpses[0].x=base.actor.x;state.corpses[0].y=base.actor.y+89;},"unit-nearer-body"],
 ["no carried body",state=>state.carryingCorpseId=null,"unit-nearer-body"],
];
for(const [name,alter,expected] of cases)test("carried preference preserves fallback and validity: "+name,()=>{
 const state=plain(base.game.huntRites);alter(state);const before=JSON.stringify(state);
 // These cases isolate carried preference and nearest fallback. An explicit
 // selection is now independently retained and is covered below.
 const menu=r.huntRiteMenuSnapshotV77(state,base.actor,null,true,{flayingToolOwned:true,supports:[],acceptSpecimen:()=>true});
 assert.equal(menu?.corpseId,expected);assert.equal(JSON.stringify(state),before);
 records.push({case:name,expectedTarget:expected,actualTarget:menu.corpseId,sourceStateUnchanged:true});
});
for(const actor of [{x:NaN,y:0},{x:Infinity,y:0},{x:1e9,y:0}])test("invalid actor never obtains remote carried access: "+String(actor.x),()=>{
 assert.equal(r.huntRiteMenuSnapshotV77(base.game.huntRites,actor,"unit-carried-body",true),null);
 records.push({case:"invalid-actor-"+String(actor.x),target:null});
});
test("unavailable menu remains unavailable even while carrying",()=>{
 assert.equal(r.huntRiteMenuSnapshotV77(base.game.huntRites,base.actor,"unit-carried-body",false),null);
 records.push({case:"unavailable-menu",target:null});
});

function fallingPair(){
 const save=r.defaultSave("2026-11-09T00:00:00.000Z");save.inventory.fieldToolIds=["flaying-tool"];
 const mission=r.MISSION_BY_ID["jungle-vey"],game=r.makeGameState(mission,save.loadout,save.inventory,"hunter",save.appearance,false,false,0,save.exploration);
 const actor={x:game.player.x+game.player.width/2,y:game.player.y+game.player.height};
 const kill=(id,x,feet)=>{
  const enemy=r.makeEnemy(id,"hell-hound-stalker",mission.id,x,game.world.width,100,10,0,1,1);
  Object.assign(enemy,{x:x-enemy.width/2,y:feet-enemy.height,knockbackRestY:feet-enemy.height,scanned:true});
  game.enemies.push(enemy);r.damageEnemy(game,mission,enemy,enemy.maxHealth+1,"melee");
  assert.equal(enemy.alive,false);return enemy;
 };
 const a=kill("unit-working-body",actor.x+40,actor.y),b=kill("unit-falling-body",actor.x,actor.y-80);
 const observed={ui:null,emissions:0},initialPlayer=plain(game.player);
 const tick=()=>{
  game.elapsed+=.05;r.updateRegularEnemy(game,a,mission,.05);r.updateRegularEnemy(game,b,mission,.05);
  r.updateHuntRitesV77(game,.05);
 };
 const distanceTo=id=>{const corpse=game.huntRites.corpses.find(c=>c.id===id);return Math.hypot(corpse.x-actor.x,corpse.y-actor.y);};
 const cross=()=>{
  for(let ticks=0;ticks<12&&distanceTo(b.id)>=distanceTo(a.id);ticks++)tick();
  assert.ok(distanceTo(b.id)<distanceTo(a.id),"the second real corpse must fall nearer through native gravity");
  assert.deepEqual(plain(game.player),initialPlayer,"the hunter never moves to manufacture the selection change");
 };
 const legal=()=>assert.ok(r.restoreRitesRuntimeV77(game.huntRites,game.huntRites.runId,mission.id,
  game.enemies,game.elapsed,r.riteSourceLabelV77,{flayingToolOwned:true,maximumSpecimens:256,world:game.world}),
  "both corpse identities, death proofs and positions must still pass the real runtime decoder");
 return {game,mission,actor,a,b,observed,tick,cross,legal};
}

test("a second native falling corpse cannot hide the active body's interrupt action",()=>{
 const f=fallingPair();
 r.nativeRiteCallbackUnit(f.game,f.mission,"open",f.observed);
 assert.equal(f.game.riteMenuCorpseId,f.a.id);
 r.nativeRiteCallbackUnit(f.game,f.mission,"flay",f.observed);
 assert.equal(f.game.huntRites.operation?.corpseId,f.a.id);
 const events=plain(f.game.huntRites.completedEventIds);f.cross();f.legal();
 assert.equal(r.huntRiteMenuSnapshotV77(f.game.huntRites,f.actor,f.b.id,true,{flayingToolOwned:true}).corpseId,f.a.id,
  "the active operation has priority even above a different explicit selection");
 const menu=r.snapshot(f.game,f.mission).huntRiteMenu;
 assert.equal(f.game.riteMenuCorpseId,f.a.id);assert.equal(menu.corpseId,f.a.id);assert.equal(menu.open,true);
 assert.equal(menu.operation?.action,"flay");assert.ok(menu.operation.progress>0&&menu.operation.progress<1);
 const markup=renderToStaticMarkup(createElement(r.NativeRiteMenu,{menu,onOpen:()=>{},onClose:()=>{},onAction:()=>{}}));
 assert.match(markup,/data-rite-action-v112="interrupt"/);assert.match(markup,/Interrompre le geste/);
 r.nativeRiteCallbackUnit(f.game,f.mission,"close",f.observed);
 assert.equal(f.game.huntRites.operation,null);assert.equal(f.game.riteMenuCorpseId,null);
 assert.deepEqual(plain(f.game.huntRites.completedEventIds),events);
 assert.equal(f.observed.ui.toolConditionV112,100);assert.equal(f.game.huntRites.specimensV112.length,0);f.legal();
 records.push({case:"native-falling-neighbour-keeps-operation-and-interrupt",classification:"CONSTRUCTED_NATIVE_INTEGRATION_NOT_CAMPAIGN",
  target:f.a.id,fallingNeighbour:f.b.id,playerUnchanged:true,interruptRendered:true,cancelledWithoutStockOrWear:true});
});

test("a selected body stays open until erased or out of reach, then falls back to a real neighbour",()=>{
 const f=fallingPair();r.nativeRiteCallbackUnit(f.game,f.mission,"open",f.observed);f.cross();f.legal();
 assert.equal(f.game.huntRites.operation,null);assert.equal(f.game.riteMenuCorpseId,f.a.id);
 assert.equal(r.snapshot(f.game,f.mission).huntRiteMenu.corpseId,f.a.id);
 const frozen=freezeTree(plain(f.game.huntRites)),frozenBytes=JSON.stringify(frozen);
 assert.equal(r.huntRiteMenuSnapshotV77(frozen,f.actor,f.a.id,true,{flayingToolOwned:true}).corpseId,f.a.id);
 assert.equal(JSON.stringify(frozen),frozenBytes,"retaining an explicit selection is read only");
 r.nativeRiteCallbackUnit(f.game,f.mission,"erase",f.observed);
 for(let ticks=0;ticks<50&&f.game.huntRites.operation;ticks++)f.tick();
 assert.equal(f.game.huntRites.corpses.find(c=>c.id===f.a.id).erased,true);f.legal();
 assert.equal(f.game.riteMenuCorpseId,null);
 const fallback=r.snapshot(f.game,f.mission).huntRiteMenu;
 assert.equal(fallback.corpseId,f.b.id);assert.equal(fallback.open,false);
 r.nativeRiteCallbackUnit(f.game,f.mission,"open",f.observed);
 assert.equal(f.observed.ui.huntRiteMenu.corpseId,f.b.id);assert.equal(f.observed.ui.huntRiteMenu.open,true);
 const state=plain(f.game.huntRites);state.corpses.find(c=>c.id===f.a.id).erased=false;
 const options={flayingToolOwned:true,supports:[],acceptSpecimen:()=>true};
 const selected=state.corpses.find(c=>c.id===f.a.id);
 selected.x=f.actor.x+88;selected.y=f.actor.y;
 assert.equal(r.huntRiteMenuSnapshotV77(state,f.actor,f.a.id,true,options).corpseId,f.a.id);
 state.operation={corpseId:"missing",action:"flay",elapsed:.2,startHealth:100,supportId:null,confirmedDishonor:false};
 assert.equal(r.huntRiteMenuSnapshotV77(state,f.actor,f.a.id,true,options).corpseId,f.a.id,
  "an invalid operation falls back to a valid explicit selection before the nearer body");
 selected.x=f.actor.x+88.001;
 assert.equal(r.huntRiteMenuSnapshotV77(state,f.actor,f.a.id,true,options).corpseId,f.b.id);
 assert.equal(r.huntRiteMenuSnapshotV77(state,f.actor,f.a.id,true,options).corpseId,f.b.id);
 records.push({case:"native-selected-body-and-invalid-target-fallback",classification:"CONSTRUCTED_NATIVE_INTEGRATION_NOT_CAMPAIGN",
  selectedRetainedUntilNativeErasure:true,erasedFallback:f.b.id,exact88Retained:true,outside88FallsBack:true,missingOperationCannotPin:true});
});

after(async()=>{
 if(!process.env.YAUTJA_CARCASS_MENU_QA_REPORT)return;
 const reportPath=resolve(root,process.env.YAUTJA_CARCASS_MENU_QA_REPORT);
 const report={schema:1,classification:"CONSTRUCTED_NATIVE_MENU_REGRESSION_NOT_CAMPAIGN",result:records.length===22?"OK":"INCOMPLETE",cases:records,
  sourceSha256:hash(await readFile(root+"app/game/systems/huntRitesRuntimeV77.ts")),canvasSourceSha256:hash(source),testSourceSha256:hash(await readFile(fileURLToPath(import.meta.url))),bundleSha256:hash(bundle.outputFiles[0].text),node:process.version,
  previousConstructedCounterexample:"https://github.com/darknigthmare/yautja-la-longue-chasse/blob/b00b091623b968c2f84e6909deb590ecf70581eb/docs/qa/v112-ground-deposit-composition/operator-report.json",limits:["Fixture actors and tool ownership are admitted for a focused integration regression.","The actual menu component is server-rendered and its production callback is exercised; this is not a mounted GameClient campaign or a hardware test.","The earlier geometric report is a pinned upstream reference, not a local current-run result."]};
 await mkdir(dirname(reportPath),{recursive:true});
 const rawBundle=gzipSync(bundle.outputFiles[0].text),bundleName="native-menu-bundle.cjs.gz";
 await writeFile(resolve(dirname(reportPath),bundleName),rawBundle);
 report.rawExecutedBundle={path:bundleName,bytes:rawBundle.length,sha256:hash(rawBundle),encoding:"gzip of the actual in-memory esbuild CommonJS bundle"};
 await writeFile(reportPath,JSON.stringify(report,null,2)+"\n");
});
