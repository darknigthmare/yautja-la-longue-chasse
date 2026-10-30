import assert from "node:assert/strict";
import test from "node:test";
import {build} from "esbuild";
const result=await build({
 stdin:{contents:[
  "export * from './app/game/systems/clanWarMultiplayerV126';",
  "export * from './app/game/systems/clanWarMultiplayerPracticeV127';",
  "export * from './app/game/systems/clanWarWorldClimateV126';",
 ].join("\n"),resolveDir:process.cwd()},bundle:true,write:false,
 format:"esm",platform:"node",target:"es2022",logLevel:"silent",
});
const game=await import("data:text/javascript;base64,"+Buffer.from(result.outputFiles[0].text).toString("base64"));
const site=game.CLAN_WAR_COHERENT_VARIANTS_V126.find(s=>s.geography.worldKind==="earth");
function readyPvp(){
 let room=game.createWarMultiplayerLobbyV126("ROOM-TRAIN",site.sourceId,"clan-pvp",
  "HOST","Chef","HASH-ROOM",42);
 room=game.joinWarMultiplayerLobbyV126(room,"GUEST","Rival","rival").room;
 room=game.setWarMultiplayerLoadoutV126(room,"HOST",["H-SQUAD"]).room;
 room=game.setWarMultiplayerLoadoutV126(room,"GUEST",["R-SQUAD"]).room;
 room=game.setWarMultiplayerReadyV126(room,"HOST",true).room;
 room=game.setWarMultiplayerReadyV126(room,"GUEST",true).room;
 const result=game.startWarMultiplayerLobbyV126(room,"HOST");
 assert.equal(result.accepted,true);
 return game.createWarMultiplayerPracticeV127(result.room);
}
const order=(state,id,unitId,sequence,kind,targetX=null,targetY=null)=>({
 clientCommandId:"CMD-"+id+"-"+sequence,actorId:id,sequence,expectedRevision:state.room.revision,
 tick:state.room.tick,kind,unitInstanceId:unitId,targetX,targetY,
});
test("local two-player simulation has disjoint teams, no campaign writes and fixed exercise map",()=>{
 const state=readyPvp();
 assert.equal(state.version,127);
 assert.equal(state.saveScope,"practice-memory-only");
 assert.equal(state.campaignWrite,"forbidden");
 assert.equal(state.room.authority,"server-required");
 assert.equal(state.fighters.length,2);
 assert.equal(state.fighters.find(s=>s.ownerId==="HOST").side,"hunter");
 assert.equal(state.fighters.find(s=>s.ownerId==="GUEST").side,"rival");
 assert.deepEqual(state.map.capture,{x:4,y:2});
 assert.equal(state.winner,null);
 assert.equal(state.room.stage,"started");
});
test("signed principal and owned unit are required and replays cannot move twice",()=>{
 const state=readyPvp();
 const move=order(state,"HOST","H-SQUAD",1,"move",2,1);
 assert.equal(game.applyWarMultiplayerPracticeCommandV127(state,move,"GUEST").accepted,false);
 assert.equal(game.applyWarMultiplayerPracticeCommandV127(state,{...move,unitInstanceId:"R-SQUAD"},"HOST").accepted,false);
 assert.equal(game.applyWarMultiplayerPracticeCommandV127(state,{...move,targetX:4,targetY:2},"HOST").accepted,false);
 const ok=game.applyWarMultiplayerPracticeCommandV127(state,move,"HOST");
 assert.equal(ok.accepted,true);
 assert.equal(ok.state.fighters.find(x=>x.ownerId==="HOST").x,2);
 assert.equal(game.applyWarMultiplayerPracticeCommandV127(ok.state,move,"HOST").accepted,false);
 assert.equal(game.applyWarMultiplayerPracticeCommandV127(state,move,"HOST").accepted,true,"original immutable practice state untouched");
});
test("rival visibility is distance-limited; spectator cannot reveal other clan's units",()=>{
 const initial=readyPvp();
 assert.equal(game.viewWarMultiplayerPracticeV127(initial,"HOST").fighters.length,1);
 assert.equal(game.viewWarMultiplayerPracticeV127(initial,"GUEST").fighters.length,1);
 assert.equal(game.viewWarMultiplayerPracticeV127(initial,"not-a-member"),null);
 const moved=game.applyWarMultiplayerPracticeCommandV127(initial,order(initial,"HOST","H-SQUAD",1,"move",2,1),"HOST").state;
 assert.equal(game.viewWarMultiplayerPracticeV127(moved,"HOST").fighters.length,1);
});
test("server alone resolves damage; the client cannot attack without a valid visible target",()=>{
 const initial=readyPvp();
 assert.equal(game.applyWarMultiplayerPracticeCommandV127(initial,
  order(initial,"HOST","H-SQUAD",1,"attack",7,1),"HOST").accepted,false);
 const close={
  ...initial,fighters:initial.fighters.map(f=>f.ownerId==="HOST"?{...f,x:5,y:1}:f),
 };
 const hit=game.applyWarMultiplayerPracticeCommandV127(close,
  order(close,"HOST","H-SQUAD",1,"attack",7,1),"HOST");
 assert.equal(hit.accepted,true);
 assert.equal(hit.state.fighters.find(f=>f.ownerId==="GUEST").hp,8);
 assert.equal(close.fighters.find(f=>f.ownerId==="GUEST").hp,12);
});
test("capture needs actual occupation through three distinct authoritative ticks",()=>{
 let state=readyPvp(),sequence=0;
 for(const [x,y] of [[2,1],[3,1],[4,1],[4,2]]){
  const cmd=order(state,"HOST","H-SQUAD",++sequence,"move",x,y);
  const issued=game.applyWarMultiplayerPracticeCommandV127(state,cmd,"HOST");
  assert.equal(issued.accepted,true,issued.reason);
  state=issued.state;
  const tick=game.stepWarMultiplayerPracticeV127(state);
  assert.equal(tick.accepted,true);
  state=tick.state;
 }
 assert.equal(state.hold.hunter,1);
 for(let i=0;i<2;i++){
  state=game.stepWarMultiplayerPracticeV127(state).state;
 }
 assert.equal(state.winner,"hunter");
 assert.equal(state.room.stage,"completed");
 assert.equal(state.campaignWrite,"forbidden");
 assert.equal(game.stepWarMultiplayerPracticeV127(state).accepted,false);
});
test("blocked squares, illegal orders, occupied zones and out-of-range commands do not mutate the match",()=>{
 const s=readyPvp(),original=JSON.stringify(s);
 assert.equal(game.applyWarMultiplayerPracticeCommandV127(s,order(s,"HOST","H-SQUAD",1,"move",4,0),"HOST").accepted,false);
 assert.equal(game.applyWarMultiplayerPracticeCommandV127(s,order(s,"HOST","H-SQUAD",1,"attack",1,2),"HOST").accepted,false);
 assert.equal(game.applyWarMultiplayerPracticeCommandV127(s,order(s,"HOST","H-SQUAD",1,"hold",1,1),"HOST").accepted,false);
 assert.equal(game.applyWarMultiplayerPracticeCommandV127(s,order(s,"HOST","H-SQUAD",1,"deploy",1,1),"HOST").accepted,false);
 assert.equal(JSON.stringify(s),original);
});
