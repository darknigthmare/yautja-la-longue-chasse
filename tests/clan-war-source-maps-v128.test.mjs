import assert from "node:assert/strict";
import test from "node:test";
import {build} from "esbuild";
const bundled=await build({
 stdin:{contents:[
 "export * from './app/game/systems/clanWarSourceMapsV128';",
 "export * from './app/game/systems/clanWarBibleV6';",
 ].join("\n"),resolveDir:process.cwd()},
 bundle:true,write:false,format:"esm",platform:"node",target:"es2022",logLevel:"silent",
});
const war=await import("data:text/javascript;base64,"+Buffer.from(bundled.outputFiles[0].text).toString("base64"));
const rules=war.DEFAULT_WAR_RULES_V6;
const mapIds=Array.from({length:12},(_,i)=>"W3-MAP"+String(i+1).padStart(2,"0"));
const officialDimensions=[[32,24],[30,26],[36,28],[28,28],[34,30],[32,24],
 [36,24],[30,30],[32,28],[28,26],[34,32],[38,22]];
const walk=(m,p)=>war.warMapWalkableV128(m,p);
const command=(state,dir)=>war.commandWarMapPracticeV128(state,dir);
const direction=(a,b)=>{
 if(b.x>a.x)return "right";if(b.x<a.x)return "left";
 if(b.y>a.y)return "down";if(b.y<a.y)return "up";
 throw Error("nonstep");
};
test("12 maps preserve exact source dimensions and all authored W3 scene descriptions",()=>{
 const audit=war.auditWarSourceMapsV128(rules);
 assert.equal(audit.maps,12);
 assert.deepEqual(audit.problems,[]);
 for(let i=0;i<12;i++){
  const map=war.createWarSourceMapV128(mapIds[i],rules);
  const entry=rules.entries.find(x=>x.sheet==="Cartes des escarmouches"&&x.id===map.id);
  assert.ok(entry);
  const val=k=>String(entry.fields.find(f=>f.column===k)?.value??"").trim();
  assert.deepEqual([map.width,map.height],officialDimensions[i],map.id);
  assert.equal(map.name,String(entry.title));
  assert.equal(map.planetId,val("C"));
  assert.equal(map.sourceSituation,val("F"));
  assert.equal(map.sourceGeometry,val("G"));
  assert.equal(map.sourceCover,val("H"));
  assert.equal(map.sourceEvent,val("I"));
  assert.equal(map.sourceObjective,val("J"));
  assert.equal(map.sourceAccess,val("K"));
  assert.equal(map.sourceExtraction,val("L"));
  assert.equal(map.tiles.length,map.width*map.height);
  assert.equal(map.interpretation,"source-guided-tile-study-not-final-authored-or-film-map");
 }
});
test("every W3 world has three explicit alternatives and a physical out-and-back",()=>{
 for(const id of mapIds){
  const m=war.createWarSourceMapV128(id,rules);
  assert.ok(walk(m,m.start)&&walk(m,m.goal),id);
  assert.equal(m.mandatoryPaths.length,3,id);
  assert.equal(new Set(m.mandatoryPaths.map(path=>path.map(p=>p.x+","+p.y).join(";"))).size,3);
  for(const route of m.mandatoryPaths){
   assert.deepEqual(route[0],m.start);assert.deepEqual(route.at(-1),m.goal);
   assert.ok(route.every(p=>walk(m,p)),id+" corridor was obstructed");
   assert.ok(route.slice(1).every((p,i)=>Math.abs(p.x-route[i].x)+Math.abs(p.y-route[i].y)===1));
  }
  const shortest=war.warMapFindPathV128(m,m.start,m.goal);
  assert.ok(shortest?.length>=5,id);
  assert.ok(war.warMapFindPathV128(m,m.goal,m.extraction),id);
  assert.equal(war.warMapWalkableV128(m,{x:0,y:0}),false,id);
  assert.equal(war.warMapTileV128(m,-1,4),null);
 }
});
test("the sources have 12 distinct regions and do not place frozen terrain on lava/crater maps",()=>{
 const maps=mapIds.map(id=>war.createWarSourceMapV128(id,rules));
 assert.equal(new Set(maps.map(x=>x.name)).size,12);
 assert.equal(maps.find(m=>m.id==="W3-MAP03").biome,"cratères volcaniques");
 assert.equal(maps.find(m=>m.id==="W3-MAP09").biome,"glacier et crevasses");
 for(const m of maps){
  assert.ok(m.tiles.some(x=>x.kind==="cover"));
  assert.ok(m.tiles.some(x=>x.kind==="wall"));
  if(m.id==="W3-MAP09")assert.ok(m.tiles.some(x=>x.kind==="ice"));
  if(m.id==="W3-MAP03")assert.ok(m.tiles.some(x=>x.kind==="lava"));
  if(m.id==="W3-MAP12"){
   assert.ok(!m.tiles.some(x=>["water","ice","lava"].includes(x.kind)),"ship is not open sea");
  }
  assert.deepEqual(war.createWarSourceMapV128(m.id,rules),m,"rebuild must not mutate authored layout");
 }
});
test("a whole source-size scenario can be observed, interacted with and physically extracted without enemies",()=>{
 const original=war.createWarMapPracticeV128("W3-MAP01",rules);
 assert.equal(original.report,null);
 let game={...original,enemies:[]};
 const path=war.warMapFindPathV128(game.map,game.player,game.map.goal);
 assert.ok(path);
 for(let i=1;i<path.length;i++){
  const result=command(game,direction(path[i-1],path[i]));
  assert.equal(result.accepted,true,result.message);
  game=result.state;
  assert.equal(game.report,null,"outbound must not automatically award victory");
 }
 const observed=command(game,"observe");
 assert.equal(observed.accepted,true);
 game=observed.state;
 const interacted=command(game,"interact");
 assert.equal(interacted.accepted,true);
 assert.equal(interacted.state.objectiveDone,true);
 game=interacted.state;
 const returnRoute=war.warMapFindPathV128(game.map,game.player,game.map.extraction);
 assert.ok(returnRoute);
 for(let i=1;i<returnRoute.length;i++){
  const next=command(game,direction(returnRoute[i-1],returnRoute[i]));
  assert.equal(next.accepted,true,next.message);
  game=next.state;
 }
 assert.equal(game.report?.outcome,"victory");
 assert.equal(game.report?.mapId,"W3-MAP01");
 assert.equal(game.report?.campaignMutation,false);
 assert.equal(command(game,"wait").accepted,false);
 assert.equal(original.turn,0,"original snapshot is immutable");
});
test("real tactical controls cannot bypass collision, range, or map geometry",()=>{
 const state=war.createWarMapPracticeV128("W3-MAP03",rules);
 assert.equal(command(state,"attack").accepted,false,"out-of-range enemy cannot be attacked");
 assert.equal(command(state,"interact").accepted,false,"remote objective may not be claimed");
 assert.equal(command(state,"power").accepted,false,"remote power lever must not teleport");
 assert.equal(command(state,"retreat").accepted,true,"real spawn is a safe retreat boundary");
 assert.equal(command(state,"up").accepted,true,"open northern step must be passable");
 assert.equal(command(state,"bogus").accepted,false);
 assert.deepEqual(state,war.createWarMapPracticeV128("W3-MAP03",rules));
});
test("disabling enemies does not create an occupation or trophy, but refusing reconnaissance blocks results",()=>{
 let game={...war.createWarMapPracticeV128("W3-MAP06",rules),enemies:[]};
 const path=war.warMapFindPathV128(game.map,game.player,game.map.goal);
 for(let i=1;i<path.length;i++)game=command(game,direction(path[i-1],path[i])).state;
 assert.equal(command(game,"interact").accepted,false,"must observe the right source objective");
 assert.equal(game.objectiveDone,false);
 const after=command(game,"observe");
 assert.equal(after.accepted,true);
 game=command(after.state,"interact").state;
 assert.equal(game.objectiveDone,true);
 assert.equal(game.report,null);
 assert.ok(!("territoryOwner" in game));
});
test("targeted attack is source-bounded, idempotent and consumes a turn only if valid",()=>{
 let game=war.createWarMapPracticeV128("W3-MAP11",rules);
 const enemy=game.enemies[0];
 const near={...enemy,x:game.player.x+2,y:game.player.y,hp:7};
 // The collision wall may block this ray; use the path to find a valid enemy square.
 const open=war.warMapFindPathV128(game.map,game.player,game.map.goal);
 const p=open[2];
 const active={...near,x:p.x,y:p.y};
 game={...game,enemies:[active]};
 const action=command(game,"attack");
 if(war.warMapLineOfSightV128(game.map,game.player,active)){
  assert.equal(action.accepted,true,action.message);
  assert.ok(action.state.enemies[0].hp<7);
  assert.equal(action.state.turn,1);
 }else{
  assert.equal(action.accepted,false);
  assert.equal(action.state.turn,0);
 }
 assert.equal(game.enemies[0].hp,7);
});
test("12 map IDs are strictly linked to W3 source, not to invented Earth or movie cities",()=>{
 for(const id of mapIds){
  const map=war.createWarSourceMapV128(id,rules);
  assert.match(map.planetId,/^W3-P0[1-6]$/);
  assert.ok(map.sourceCells.some(c=>/^D\d+/.test(c)));
  assert.ok(map.sourceCells.some(c=>/^E\d+/.test(c)));
  assert.ok(!map.name.includes("Gunnison")&&!map.name.includes("Los Angeles"));
 }
 assert.throws(()=>war.createWarSourceMapV128("earth-gunnison",rules),/inconnue/);
});
