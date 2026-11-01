import assert from "node:assert/strict";
import test,{after} from "node:test";
import {mkdtemp,writeFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {pathToFileURL} from "node:url";
import {build} from "esbuild";
const dir=await mkdtemp(join(tmpdir(),"planet-section-v155-"));
after(()=>rm(dir,{recursive:true,force:true}));
const out=await build({stdin:{contents:[
  'export * from "./app/game/systems/clanWarPlanetTraverseSectionV155";',
  'export * from "./app/game/systems/clanWarPlanetTraverseV154";',
].join("\n"),resolveDir:process.cwd(),loader:"ts"},bundle:true,write:false,
format:"esm",platform:"node",target:"es2022",logLevel:"silent"});
const file=join(dir,"section.mjs");await writeFile(file,out.outputFiles[0].text);
const api=await import(pathToFileURL(file));
const grid={
  format:"yautja-planet-traversal-lab",version:154,worldCode:"proc-v115-terrain",
  width:7,height:7,samplePixels:1,radiusKm:6371,center:{longitude:0,latitude:0,sourceX:64,sourceY:32},
  limitations:[],
  cells:Array.from({length:49},(_,index)=>{
    const x=index%7,y=Math.floor(index/7);
    return {x,y,sourceX:61+x,sourceY:29+y,longitude:(x-3)*2,latitude:(3-y)*2,
      regionIndex:1,land:true,outside:false,
      elevationMeters:Math.max(0,300+(x-3)*180+(y-3)*40),gradePercent:3};
  }),
};
const session=api.createPlanetTraversalSessionV154(grid,"RTS-U02");

test("V155 profile includes the actual starting altitude with no fabricated points",()=>{
 const result=api.analyzePlanetTraverseSectionV155(grid,session);
 assert.equal(result.nodes.length,1);
 assert.equal(result.currentNodeIndex,0);
 assert.equal(result.nodes[0].distanceFromStartKm,0);
 assert.equal(result.nodes[0].elevationMeters,300);
 assert.equal(result.worldCode,grid.worldCode);
 assert.equal(result.totalDistanceKm,0);
});

test("V155 profile follows a real V154 path; one step moves the marker, not the terrain",()=>{
 const original=JSON.stringify({grid,session});
 const plan=api.planPlanetTraversalV154(grid,session.position,{x:5,y:3},"RTS-U02");
 assert.equal(plan.status,"reachable");
 const pending=api.commitPlanetTraversalPlanV154(session,grid,plan);
 const before=api.analyzePlanetTraverseSectionV155(grid,pending);
 assert.equal(before.nodes.length,3);
 assert.equal(before.currentNodeIndex,0);
 assert.deepEqual(before.nodes.map(n=>n.elevationMeters),[300,480,660]);
 assert(before.totalDistanceKm>0);assert.equal(before.ascentMeters,360);
 const moved=api.advancePlanetTraversalV154(pending,grid);
 const during=api.analyzePlanetTraverseSectionV155(grid,moved);
 assert.equal(during.currentNodeIndex,1);
 assert.deepEqual(during.nodes.map(n=>n.distanceFromStartKm),before.nodes.map(n=>n.distanceFromStartKm));
 assert.equal(during.nodes.filter(n=>n.visited).length,2);
 const arrived=api.advancePlanetTraversalV154(moved,grid);
 assert.equal(api.analyzePlanetTraverseSectionV155(grid,arrived).currentNodeIndex,2);
 assert.equal(JSON.stringify({grid,session}),original);
});

test("V155 refuses a different world, a forged teleport and a submerged route",()=>{
 assert.throws(()=>api.analyzePlanetTraverseSectionV155(grid,{...session,worldCode:"other"}),/étranger/);
 assert.throws(()=>api.analyzePlanetTraverseSectionV155(grid,{
  ...session,queued:[{x:5,y:5}],
 }),/adjacentes/);
 const bad={...grid,cells:grid.cells.map((c,i)=>i===3*7+4?{...c,land:false,regionIndex:0}:c)};
 assert.throws(()=>api.analyzePlanetTraverseSectionV155(bad,{
  ...session,queued:[{x:4,y:3}],
 }),/obstacle/);
 assert.throws(()=>api.analyzePlanetTraverseSectionV155(grid,{
  ...session,position:{x:2,y:3},
 }),/incohérente/);
});

test("an uninhabitable grid gives an honest empty elevation profile",()=>{
 const noGround={...grid,cells:grid.cells.map(c=>({...c,land:false,regionIndex:0}))};
 const empty=api.createPlanetTraversalSessionV154(noGround,"RTS-U21");
 const section=api.analyzePlanetTraverseSectionV155(noGround,empty);
 assert.equal(section.currentNodeIndex,-1);
 assert.equal(section.nodes.length,0);
 assert.equal(section.totalDistanceKm,0);
});
