import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { build } from "esbuild";
const bundle = await build({ stdin: { contents: 'export * from "./app/game/systems/firstHuntGuide";', resolveDir: process.cwd() }, bundle: true, write: false, platform: "node", format: "esm" });
const { createFirstHuntLearning: create, observeFirstHunt: observe, firstHuntHint: hint } = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));
const sample = (patch = {}) => ({ x: 100, y: 550, velocityY: 0, grounded: true, elapsed: 0, paused: false, phase: "tracking", energy: 100, scanCooldown: 0, traces: [{x:500,y:560,scanned:false},{x:1400,y:560,scanned:false}], recoveries: [{x:1800,y:560,recovered:false}], bossActive:false,bossAlive:true,bossX:3000,danger:false,extractionX:3600,trophyExtracting:false,transportPhase:null, ...patch });
function move(learning, frames = 30) { for (let n=0;n<frames;n++) learning=observe(learning,{...learning.last,x:learning.last.x+5,elapsed:learning.last.elapsed+1/60});return learning; }
test("first hunt teaches actual locomotion and ascent, not elapsed time or falling", () => {
  let learning=create(sample());assert.equal(hint(learning).id,"move");
  learning=observe(learning,sample({elapsed:.1}));assert.equal(hint(learning).id,"move");
  learning=move(learning);assert.equal(hint(learning).id,"jump");
  learning=observe(learning,{...learning.last,grounded:false,velocityY:300,elapsed:learning.last.elapsed+1/60});assert.equal(hint(learning).id,"jump");
  learning=observe(learning,{...learning.last,grounded:true,velocityY:0,elapsed:learning.last.elapsed+1/60});
  learning=observe(learning,{...learning.last,grounded:false,velocityY:-600,elapsed:learning.last.elapsed+1/60});assert.equal(hint(learning).id,"scan");
});
test("pause, restore and teleport cannot credit an exercise", () => {
  const learning=create(sample());
  for(const change of [{paused:true,elapsed:.1,x:200},{elapsed:5,x:200},{elapsed:.01,x:900},{elapsed:0,x:200}]) assert.equal(observe(learning,sample(change)).distance,0);
});
test("first trace outranks the optional exercises; an empty pulse never increments the trace count", () => {
  let learning=observe(create(sample()),sample({elapsed:1/60,scanCooldown:.7}));
  assert(learning.scanned);assert.equal(hint(learning).progress,"Premiers pas 1/3");
  learning=observe(learning,sample({elapsed:2/60,scanCooldown:.6,traces:[{x:500,y:560,scanned:true},{x:1400,y:560,scanned:false}]}));
  assert.equal(hint(learning).id,"track");assert.equal(hint(learning).progress,"1/2 traces analysées");assert.equal(hint(learning).direction,"right");
});
test("a resumed hunt gives context directly and uses two-dimensional scan range", () => {
  assert.equal(hint(create(sample(),true)).id,"scan");
  assert.equal(hint(create(sample({traces:[{x:100,y:-800,scanned:false}]}),true)).id,"track");
  assert.equal(hint(create(sample({x:1900}),true)).direction,"left");
});
test("guide cannot instruct an unaffordable scan or a repeated pickup", () => {
  assert.equal(hint(create(sample({energy:7}),true)).id,"scan-energy");
  const traced=sample({traces:[{x:500,y:560,scanned:true}]});
  assert.equal(hint(create(traced,true)).id,"recover");
  assert.equal(hint(create({...traced,recoveries:[{x:1800,y:560,recovered:true}]},true)).id,"approach");
});
test("immediate danger overrides drills; trophy and extraction follow the true mission phases", () => {
  assert.equal(hint(create(sample({danger:true}))).id,"combat");
  assert.equal(hint(create(sample({bossActive:true}))).id,"combat");
  const trophy=hint(create(sample({phase:"trophy"})));assert.match(trophy.title,/insigne/);assert.equal(trophy.id,"trophy");
  assert.equal(hint(create(sample({phase:"extraction"}))).id,"extraction");
  assert.match(hint(create(sample({phase:"extraction",transportPhase:"boarding"}))).detail,/terminer/);
  assert.equal(hint(create(sample({phase:"dead"}))),null);assert.equal(hint(create(sample({phase:"finished"}))),null);
});
test("observation leaves the live hunt and previous learning immutable", () => {
  const initial=sample();Object.freeze(initial.traces[0]);Object.freeze(initial.traces);Object.freeze(initial);
  const learning=Object.freeze(create(initial));const before=JSON.stringify(learning);observe(learning,sample({x:105,elapsed:1/60}));assert.equal(JSON.stringify(learning),before);
});
const source=await readFile(new URL("../app/game/HuntCanvas.tsx",import.meta.url),"utf8");
const ast=ts.createSourceFile("HuntCanvas.tsx",source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const declaration=ast.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==="firstHuntObservation");
const body=ts.transpileModule(declaration.getText(ast),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
const observation=runInNewContext(body+";firstHuntObservation;",{});
test("real Canvas bridge counts scanned trail nodes, never scanned enemies, and detaches mutable arrays", () => {
  const game={player:{x:100,y:500,width:60,height:100,velocityY:0,grounded:true,energy:100,scanCooldown:0},elapsed:1,paused:false,phase:"tracking",scanNodes:[{x:500,y:560,scanned:false}],recoveryNodes:[],boss:{active:false,alive:true,x:3000,width:80},enemies:[{id:"enemy",alive:true,active:true,scanned:true}],aiBrains:{enemy:{mode:"patrol"}},world:{extraction:{x:3600}},trophyExtracting:false,dropShip:null};
  const result=observation(game);assert.equal(result.x,130);assert.equal(result.y,550);assert.equal(result.traces.filter(t=>t.scanned).length,0);
  game.scanNodes[0].scanned=true;assert.equal(result.traces[0].scanned,false);assert.equal(observation(game).traces[0].scanned,true);
  game.aiBrains.enemy.mode="engage";assert.equal(observation(game).danger,true);
});
