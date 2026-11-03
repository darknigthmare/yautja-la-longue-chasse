import assert from "node:assert/strict";
import {after,test} from "node:test";
import {readFile,mkdir,writeFile} from "node:fs/promises";
import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";
import {runInNewContext} from "node:vm";
import {createHash} from "node:crypto";
import {dirname,resolve} from "node:path";
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
export {makeGameState,makeEnemy,damageEnemy,updateHuntRitesV77,riteContextV77,startHuntRiteV77,snapshot,huntRiteMenuSnapshotV77,captureCheckpoint};
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
 const menu=r.huntRiteMenuSnapshotV77(state,base.actor,"unit-carried-body",true,{flayingToolOwned:true,supports:[],acceptSpecimen:()=>true});
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

after(async()=>{
 if(!process.env.YAUTJA_CARCASS_MENU_QA_REPORT)return;
 const reportPath=resolve(root,process.env.YAUTJA_CARCASS_MENU_QA_REPORT);
 const report={schema:1,classification:"CONSTRUCTED_NATIVE_MENU_REGRESSION_NOT_CAMPAIGN",result:records.length===20?"OK":"INCOMPLETE",cases:records,
  sourceSha256:hash(await readFile(root+"app/game/systems/huntRitesRuntimeV77.ts")),canvasSourceSha256:hash(source),testSourceSha256:hash(await readFile(fileURLToPath(import.meta.url))),bundleSha256:hash(bundle.outputFiles[0].text),node:process.version,
  previousConstructedCounterexample:"docs/qa/v112-ground-deposit-composition/operator-report.json",limits:["Fixture actors and tool ownership are admitted for a focused integration regression.","The actual menu component is server-rendered and its production callback is exercised; this is not a mounted GameClient campaign or a hardware test.","The earlier geometric report remains an unchanged baseline."]};
 await mkdir(dirname(reportPath),{recursive:true});await writeFile(reportPath,JSON.stringify(report,null,2)+"\n");
});
