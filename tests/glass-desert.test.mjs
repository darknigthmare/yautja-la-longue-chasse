import assert from "node:assert/strict";
import {test} from "node:test";
import {build} from "esbuild";
const compile=async file=>{const r=await build({entryPoints:[file],bundle:true,write:false,format:"esm",platform:"node",logLevel:"silent"});return import("data:text/javascript;base64,"+Buffer.from(r.outputFiles[0].text).toString("base64"));};
const g=await compile("app/game/systems/glassDesert.ts");
const h=await compile("app/game/systems/homeworld.ts");
const valid={expeditionId:"glass-desert",terrainSurveyed:true,transportLogRecovered:true,diversionCorroborated:true,safePassageOpened:true,crossingRoute:"decoy-corridor",beaconDisposition:"disable",secretFound:false,ticks:2400};
const ash={expeditionId:"ash-marches",trueTrailInspected:true,falseTrailRejected:true,obstacleMoved:true,convoyRecovered:true,shortcutOpened:true,secretFound:true,ticks:1500};
const withAsh=()=>({...h.defaultHomeworldProgress(),expeditions:{"ash-marches":ash,"glass-desert":null}});
function route(kind,secret=false){
 let state=g.createGlassDesertExpedition();
 const tick=input=>{state=g.stepGlassDesert(state,input);return state;};
 const walk=(x,careful=true)=>{for(let n=0;n<8000;n++){if(Math.abs(state.actor.x-x)<3&&state.actor.grounded)return;tick({moveX:Math.abs(state.actor.x-x)<3?0:Math.sign(x-state.actor.x),careful});}throw new Error("Unreachable physical target "+x+" at "+state.actor.x+","+state.actor.y);};
 const jump=()=>{tick({moveX:1,jumpPressed:true});for(let n=0;n<120;n++){if(state.actor.grounded)return;tick({moveX:1});}throw new Error("Jump never landed");};
 const inspect=()=>tick({scanPressed:true,interactPressed:true});
 walk(320);inspect();walk(1200);tick({interactPressed:true});state=g.chooseGlassRoute(state,kind);
 if(kind==="decoy-corridor"){tick({decoyPressed:true});for(let n=0;n<100;n++)tick({});}
 else{walk(1350);jump();jump();walk(1740);tick({interactPressed:true});}
 walk(2310);inspect();
 if(secret){walk(2340);jump();walk(2480);jump();walk(2640);tick({interactPressed:true});}
 walk(2760);inspect();state=g.chooseGlassBeacon(state,"disable");walk(2890);tick({interactPressed:true});walk(3450);tick({interactPressed:true});
 return state;
}
test("complete reports require every real stage and bounded known values",()=>{
 assert.equal(g.glassDesertCompletion(g.createGlassDesertExpedition()),null);
 assert.deepEqual(g.normalizeGlassDesertProof(valid),valid);
 for(const patch of [{ticks:0},{ticks:NaN},{ticks:Infinity},{ticks:5_184_001},{ticks:1.5},{safePassageOpened:false},{crossingRoute:"teleport"},{beaconDisposition:"steal"}])
  assert.equal(g.normalizeGlassDesertProof({...valid,...patch}),null);
 for(const key of ["terrainSurveyed","transportLogRecovered","diversionCorroborated"])assert.equal(g.normalizeGlassDesertProof({...valid,[key]:false}),null);
});
test("physical decoy route reaches extraction, with a true diversion and no forged state",()=>{
 const state=route("decoy-corridor");
 assert.ok(state.successfulDecoys>=1);assert.equal(state.falls,0);assert.equal(g.nearestGlassPoint(state)?.id,"extraction");
 assert.equal(g.glassDesertCompletion(state)?.beaconDisposition,"disable");
});
test("physical stable-rock route and optional upper secret are reachable by jumps",()=>{
 const state=route("stepping-stones",true);
 assert.equal(state.crossingResolved,true);assert.equal(state.successfulDecoys,0);assert.equal(state.falls,0);
 assert.equal(g.glassDesertCompletion(state)?.secretFound,true);
});
test("running on glass alerts the predator while measured steps do not share that noise rate",()=>{
 const initial=g.createGlassDesertExpedition();initial.actor.x=460;
 let fast=initial,careful=initial;let alerted=false;
 for(let n=0;n<80;n++){fast=g.stepGlassDesert(fast,{moveX:1});careful=g.stepGlassDesert(careful,{moveX:1,careful:true});alerted ||= fast.burrower.phase==="warning";}
 assert.ok(alerted);assert.equal(careful.burrower.phase,"listening");assert.ok(careful.vibration<10);
 assert.equal(initial.tick,0);assert.equal(initial.actor.x,460);
});
test("telegraphed target remains fixed so a real avoidance window exists",()=>{
 let s=g.createGlassDesertExpedition();s.actor.x=700;s.vibration=40;s=g.stepGlassDesert(s,{});
 assert.equal(s.burrower.phase,"warning");const target=s.burrower.targetX;
 for(let n=0;n<35;n++)s=g.stepGlassDesert(s,{moveX:1});
 assert.equal(s.burrower.targetX,target);assert.ok(s.actor.x>target+90);assert.equal(s.hits,0);
});
test("decoy inventory is bounded and rest replenishes it without a soft lock",()=>{
 let s=g.createGlassDesertExpedition();s.actor.x=1200;s=g.stepGlassDesert(s,{decoyPressed:true});
 assert.equal(s.decoys,2);s=g.stepGlassDesert(s,{decoyPressed:true});assert.equal(s.decoys,2);
 s=g.interactGlassPoint(s);assert.equal(s.decoys,3);assert.equal(s.actor.health,3);
});
test("falls return to the local relay and keep observations without manufacturing a report",()=>{
 let s=g.createGlassDesertExpedition();s.terrainSurveyed=true;s.checkpoint={x:1200,y:900};s.actor={...s.actor,x:3100,y:1130,grounded:false};
 s=g.stepGlassDesert(s,{});assert.equal(s.actor.x,1200);assert.equal(s.terrainSurveyed,true);assert.equal(s.falls,1);assert.equal(g.glassDesertCompletion(s),null);
});
test("beacon choice changes future pulses and cannot be silently changed",()=>{
 let base=route("decoy-corridor");base.actor.x=2760;base.beaconDisposition=null;base.burrower={...base.burrower,phase:"listening",ticks:0};base.tick=239;
 const preserved=g.stepGlassDesert(g.chooseGlassBeacon(base,"preserve"),{});
 const disabled=g.stepGlassDesert(g.chooseGlassBeacon(base,"disable"),{});
 assert.equal(preserved.burrower.target,"beacon");assert.equal(preserved.burrower.phase,"warning");assert.equal(disabled.burrower.phase,"listening");
 assert.equal(g.chooseGlassBeacon(preserved,"disable").beaconDisposition,"preserve");
});
test("old V7 Homeworld shape retains the Marches report and initializes only the new field",()=>{
 const old={...withAsh(),expeditions:{"ash-marches":ash}};
 const normalized=h.normalizeHomeworldProgress(old);
 assert.deepEqual(normalized.expeditions["ash-marches"],ash);assert.equal(normalized.expeditions["glass-desert"],null);
 assert.equal(h.normalizeHomeworldProgress({...h.defaultHomeworldProgress(),expeditions:{"glass-desert":valid}}).expeditions["glass-desert"],null);
});
test("recording requires a durable Marches report and preserves unrelated progression",()=>{
 assert.equal(h.recordGlassDesertExpedition(h.defaultHomeworldProgress(),valid).ok,false);
 const old=withAsh();old.visitedDistrictIds=["port"];old.relations["throne-court"]=4;
 const result=h.recordGlassDesertExpedition(old,valid);
 assert.equal(result.ok,true);assert.equal(result.changed,true);assert.deepEqual(result.progress.expeditions["ash-marches"],ash);
 assert.deepEqual(result.progress.visitedDistrictIds,["port"]);assert.equal(result.progress.relations["throne-court"],4);
 assert.equal(old.expeditions["glass-desert"],null);
});
test("revisits preserve choices, merge secrets, keep the best trace and remain idempotent",()=>{
 const first=h.recordGlassDesertExpedition(withAsh(),valid).progress;
 const better=h.recordGlassDesertExpedition(first,{...valid,secretFound:true,ticks:2200});
 assert.equal(better.progress.expeditions["glass-desert"].secretFound,true);assert.equal(better.progress.expeditions["glass-desert"].ticks,2200);
 const slower=h.recordGlassDesertExpedition(better.progress,{...valid,ticks:2700});
 assert.equal(slower.changed,false);assert.deepEqual(slower.progress.expeditions["glass-desert"],better.progress.expeditions["glass-desert"]);
 assert.equal(h.recordGlassDesertExpedition(first,{...valid,beaconDisposition:"preserve"}).ok,false);
 const revisit=g.createGlassDesertExpedition(better.progress.expeditions["glass-desert"]);
 assert.equal(revisit.beaconDisposition,"disable");assert.equal(revisit.crossingRoute,"decoy-corridor");assert.equal(g.glassDesertCompletion(revisit),null);
});
test("all region interaction points have a physical landing and unpublished acts remain unpublished",()=>{
 for(const p of g.GLASS_POINTS)assert.ok(g.GLASS_PLATFORMS.some(f=>p.x>=f.x&&p.x<=f.x+f.width&&p.y===f.y),p.id);
 assert.equal(h.HOMEWORLD_REGIONS.filter(r=>r.status==="playable-introduction").length,2);
 assert.ok(h.HOMEWORLD_CAMPAIGN_ACTS.every(a=>a.status==="not-playable"));
});
