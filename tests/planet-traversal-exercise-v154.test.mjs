import assert from "node:assert/strict";
import test,{after} from "node:test";
import {mkdtemp,writeFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {pathToFileURL} from "node:url";
import {build} from "esbuild";
const dir=await mkdtemp(join(tmpdir(),"planet-traverse-v154-"));
after(()=>rm(dir,{recursive:true,force:true}));
const b=await build({stdin:{contents:
 'export * from "./app/game/systems/clanWarPlanetTraverseV154";',
 resolveDir:process.cwd(),loader:"ts"},bundle:true,write:false,platform:"node",format:"esm",target:"es2022",logLevel:"silent"});
const file=join(dir,"lab.mjs");await writeFile(file,b.outputFiles[0].text);
const a=await import(pathToFileURL(file));
const W=128,H=64,N=W*H,MAX=8000;
function fixtures(){
 const rgba=new Uint8ClampedArray(N*4),mask=new Uint8ClampedArray(N*4),grades=new Uint16Array(N);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
   const i=y*W+x,o=i*4;
   rgba[o]=100;rgba[o+1]=20;rgba[o+3]=255;
   mask[o]=1;mask[o+3]=255;
   if(x===65&&y!==32){rgba[o+3]=0;mask[o+3]=0;mask[o]=0;}
   if(x===66)grades[i]=2200; // 22 percent ridge, whole meridian
 }
 const raster={width:W,height:H,radiusKm:6371,maxElevationMeters:MAX,
   rg16:rgba,preview:new Uint8ClampedArray(N*4),regions:[{regionIndex:1,biome:"mountain",landPixels:N,averageElevationMeters:3000,maximumElevationMeters:MAX}]};
 const slope={width:W,height:H,radiusKm:6371,gradeHundredthsPercent:grades,preview:new Uint8ClampedArray(N*4)};
 return {raster,slope,mask};
}
const input=fixtures();
const grid=a.buildPlanetTraversalGridV154(input.raster,input.slope,input.mask,{worldCode:"proc-v115-TEST",longitude:0,latitude:0,width:13,height:9});
const cell=(x,y)=>grid.cells[y*grid.width+x];

test("six actual clan-war RTS unit IDs have distinct prototype mobility caps",()=>{
 assert.deepEqual(a.PLANET_MOBILITY_PROFILES_V154.map(x=>x.unitTypeId),
  ["RTS-U01","RTS-U02","RTS-U07","RTS-U21","RTS-U23","RTS-U24"]);
 assert(a.PLANET_MOBILITY_PROFILES_V154.every(x=>x.maxGradePercent>0&&x.effort>0));
 assert(a.PLANET_MOBILITY_PROFILES_V154[2].maxGradePercent >
   a.PLANET_MOBILITY_PROFILES_V154[3].maxGradePercent);
});

test("true coast pixels are blocked and can't be bypassed by diagonal or fictional bridge",()=>{
 assert.equal(grid.width,13);assert.equal(grid.height,9);
 const mid=4;
 const seaX=6+(65-64); // sourceX 65
 assert.equal(cell(seaX,mid).land,true);
 assert.equal(cell(seaX,mid+1).land,false);
 assert.equal(a.isTraversalCellPassableV154(cell(seaX,mid+1),"RTS-U02"),false);
 const blocked=a.planPlanetTraversalV154(grid,{x:4,y:mid},{x:9,y:mid+1},"RTS-U21");
 assert.equal(blocked.status,"no-route");
});

test("a pisteur can follow the one actual dry pass, while a chariot cannot cross the 22% ridge",()=>{
 const start={x:4,y:4},target={x:9,y:4};
 const scout=a.planPlanetTraversalV154(grid,start,target,"RTS-U02");
 assert.equal(scout.status,"reachable");
 assert(scout.path.length>3);assert(scout.distanceKm>0);
 assert(scout.path.every(p=>a.isTraversalCellPassableV154(cell(p.x,p.y),"RTS-U02")));
 const vehicle=a.planPlanetTraversalV154(grid,start,target,"RTS-U21");
 assert.equal(vehicle.status,"no-route");
 const blocked=a.planPlanetTraversalV154(grid,start,{x:7,y:3},"RTS-U02");
 assert.equal(blocked.status,"blocked");
});

test("the playable exercise advances one real adjacent tile at a time; bad cross-world plan is ignored",()=>{
 const state=a.createPlanetTraversalSessionV154(grid,"RTS-U02");
 assert(state.position);assert.equal(state.steps,0);
 const destination={x:9,y:4};
 const plan=a.planPlanetTraversalV154(grid,state.position,destination,"RTS-U02");
 assert.equal(plan.status,"reachable");
 const armed=a.commitPlanetTraversalPlanV154(state,grid,plan);
 assert(armed.queued.length>0);
 let moving=armed,cycles=0;
 while(moving.queued.length && cycles++<100) {
   const next=a.advancePlanetTraversalV154(moving,grid);
   assert.notDeepEqual(next.position,moving.position);
   assert.equal(next.walked.length,moving.walked.length+1);
   moving=next;
 }
 assert.deepEqual(moving.position,destination);
 assert.equal(moving.steps,moving.walked.length-1);
 assert(moving.totalDistanceKm>0);
 assert.equal(a.advancePlanetTraversalV154(moving,grid),moving);
 const forged={...armed,worldCode:"foreign-world"};
 assert.equal(a.advancePlanetTraversalV154(forged,grid),forged);
 assert.equal(a.commitPlanetTraversalPlanV154(state,grid,{...plan,unitTypeId:"RTS-U24"}),state);
});

test("antimeridian wraps, pole edges are out-of-world instead of mirrored, inputs remain immutable",()=>{
 const before=JSON.stringify([...input.raster.rg16.slice(0,64)]);
 const dateline=a.buildPlanetTraversalGridV154(input.raster,input.slope,input.mask,{
  worldCode:"earthlike-alien",longitude:-179.8,latitude:0,width:7,height:7});
 assert.equal(dateline.cells[0].sourceX,125);
 assert.equal(dateline.cells[6].sourceX,3);
 const polar=a.buildPlanetTraversalGridV154(input.raster,input.slope,input.mask,{
  worldCode:"polar-alien",longitude:10,latitude:89.9,width:7,height:7});
 assert(polar.cells.some(x=>x.outside));
 assert(polar.cells.every(x=>!x.outside||!x.land));
 assert.equal(JSON.stringify([...input.raster.rg16.slice(0,64)]),before);
});

test("invalid local resolution, foreign region gradient and unusable slope map are rejected",()=>{
 assert.throws(()=>a.buildPlanetTraversalGridV154(input.raster,input.slope,input.mask,{
  worldCode:"",longitude:0,latitude:0}),/incompatibles/);
 assert.throws(()=>a.buildPlanetTraversalGridV154(input.raster,input.slope,input.mask,{
  worldCode:"x",longitude:0,latitude:95}),/incompatibles/);
 assert.throws(()=>a.buildPlanetTraversalGridV154(input.raster,input.slope,input.mask,{
  worldCode:"x",longitude:0,latitude:0,width:8}),/incompatibles/);
 assert.throws(()=>a.buildPlanetTraversalGridV154(input.raster,{...input.slope,radiusKm:0},{
  worldCode:"x",longitude:0,latitude:0}),/incompatibles/);
 assert.throws(()=>a.planPlanetTraversalV154(grid,{x:-1,y:0},{x:1,y:1},"RTS-U02"),/hors/);
});
