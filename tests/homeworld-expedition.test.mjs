import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
const bundle=await build({entryPoints:["app/game/systems/homeworldExpedition.ts"],bundle:true,write:false,platform:"node",format:"esm"});
const ash=await import("data:text/javascript;base64,"+Buffer.from(bundle.outputFiles[0].text).toString("base64"));
const sim=(state,input={},ticks=1)=>{for(let i=0;i<ticks;i++)state=ash.stepAshExpedition(state,i===0?input:{...input,jumpPressed:false});return state;};
function runner(initial=ash.createAshExpedition()){
 let s=initial;const inputs=[];
 const step=(input={},n=1)=>{for(let i=0;i<n;i++){const actual=i===0?input:{...input,jumpPressed:false};inputs.push(actual);s=ash.stepAshExpedition(s,actual);}return s;};
 const walk=(x)=>{for(let i=0;i<700&&Math.abs(s.actor.x-x)>3;i++)step({moveX:Math.sign(x-s.actor.x)});assert(Math.abs(s.actor.x-x)<=3,"walk "+x+" actual "+JSON.stringify(s.actor));return s;};
 const jump=(x)=>{step({jumpPressed:true,moveX:Math.sign(x-s.actor.x)});for(let i=0;i<150&&!s.actor.grounded;i++)step({moveX:Math.abs(x-s.actor.x)>3?Math.sign(x-s.actor.x):0});assert(s.actor.grounded,"land at "+x);return s;};
 return {get state(){return s;},inputs,step,walk,jump};
}
function playRoute(){
 const r=runner();
 r.walk(450);r.step({scanPressed:true,interactPressed:true});
 r.jump(470);assert.equal(r.state.actor.y,800);
 r.walk(555);r.jump(690);assert.equal(r.state.actor.y,680);
 r.walk(780);r.jump(980);assert.equal(r.state.actor.y,600);
 r.step({interactPressed:true});assert.equal(r.state.secretFound,true);
 r.walk(1120);r.step({},80);r.walk(1080);assert.equal(r.state.actor.y,880);
 r.step({scanPressed:true,interactPressed:true});
 r.walk(1390);r.step({interactPressed:true});
 r.walk(1450);r.jump(1640);
 // First leftward charge is baited, then wait safely above its line.
 r.jump(1740);r.step({},500);
 assert.equal(r.state.obstacleMoved,true,JSON.stringify(r.state));
 r.walk(2360);r.jump(2530);
 r.step({interactPressed:true});
 r.walk(2770);r.step({interactPressed:true});
 r.walk(3040);r.step({interactPressed:true});
 return r;
}
test("complete route uses real movement, three upper platforms, trail scanning and grazer charge",()=>{
 const r=playRoute(),p=ash.ashMarchesCompletion(r.state);
 assert(p);assert.equal(p.secretFound,true);assert.equal(r.state.falls,0);
 assert.equal(ash.nearestAshPoint(r.state).id,"extraction");
 let replay=ash.createAshExpedition();for(const input of r.inputs)replay=ash.stepAshExpedition(replay,input);
 assert.deepEqual(replay,r.state);
});
test("every objective requires proximity and traces require an active scanner",()=>{
 const initial=ash.createAshExpedition();assert.equal(ash.interactAshPoint(initial).trueTrailInspected,false);
 let s={...initial,actor:{...initial.actor,x:450}};
 assert.equal(ash.interactAshPoint(s).trueTrailInspected,false);
 s=sim(s,{scanPressed:true,interactPressed:true});assert(s.trueTrailInspected);
 s=sim(s,{},241);assert.equal(s.scanTicks,0);
 s.actor={...s.actor,x:1080,y:880};assert.equal(ash.interactAshPoint(s).falseTrailRejected,false);
 assert.equal(ash.ashMarchesCompletion(s),null);
 s.actor={...s.actor,x:2770,y:920};s.obstacleMoved=true;
 assert.equal(ash.interactAshPoint(s).convoyRecovered,false);
});
test("60Hz simulation is immutable and ignores nonfinite movement",()=>{
 const state=ash.createAshExpedition(),snapshot=structuredClone(state);
 const next=sim(state,{moveX:Number.NaN},60);
 assert.deepEqual(state,snapshot);assert.equal(next.tick,60);assert.equal(next.actor.x,100);assert.equal(next.actor.y,920);
 assert.equal(sim(state,{moveX:100}).actor.x,105);
});
test("telegraph holds a fixed direction, does not hurt and has a 75-tick reaction window",()=>{
 let s=ash.createAshExpedition();s.actor.x=1850;
 s=sim(s);assert.equal(s.grazer.phase,"telegraph");assert.equal(s.grazer.direction,-1);
 s=sim(s,{moveX:1},74);assert.equal(s.grazer.phase,"telegraph");assert.equal(s.actor.health,3);assert.equal(s.grazer.direction,-1);
 s=sim(s);assert.equal(s.grazer.phase,"charge");
});
test("gaps cause a local fall, shortcut bridges have real collision",()=>{
 let s=ash.createAshExpedition();s.actor.x=750;s.actor.grounded=false;
 s=sim(s,{},60);assert.equal(s.falls,1);assert.equal(s.actor.x,100);
 s={...ash.createAshExpedition(),shortcutOpened:true};s.actor.x=750;
 s=sim(s,{},60);assert.equal(s.falls,0);assert.equal(s.actor.y,920);
});
test("report normalizer rejects incomplete or invalid data and clones accepted proofs",()=>{
 const p=ash.ashMarchesCompletion(playRoute().state);
 assert.deepEqual(ash.normalizeHomeworldExpeditionProof(p),p);
 assert.notEqual(ash.normalizeHomeworldExpeditionProof(p),p);
 for(const bad of [null,[],{}, {...p,ticks:0},{...p,ticks:Infinity},{...p,ticks:1.1},{...p,expeditionId:"other"},{...p,falseTrailRejected:false},{...p,secretFound:1}]){
  assert.equal(ash.normalizeHomeworldExpeditionProof(bad),null);
 }
 const clean=ash.normalizeHomeworldExpeditionProof({...p,unknown:{x:1}});assert.equal("unknown" in clean,false);
});

test("only the charge damages; the cover protects and checkpoint preserves outing observations",()=>{
 let base=ash.createAshExpedition();base.actor.x=1900;base.trueTrailInspected=true;
 base.grazer={x:1860,phase:"charge",ticks:0,direction:1};
 const hit=sim(base);assert.equal(hit.actor.health,2);assert(hit.actor.invulnerableTicks>0);
 const above={...base,actor:{...base.actor,x:1740,y:800}};
 above.grazer={...base.grazer,x:1700};
 assert.equal(sim(above).actor.health,3);
 let dead={...hit,actor:{...hit.actor,health:0},checkpoint:{x:1390,y:880}};
 dead=sim(dead);assert.equal(dead.actor.x,1390);assert.equal(dead.actor.y,880);
 assert.equal(dead.trueTrailInspected,true);assert.equal(dead.falls,1);assert.equal(ash.ashMarchesCompletion(dead),null);
});
test("an unbroken obstacle blocks movement and no point can remotely open its shortcut",()=>{
 let s=ash.createAshExpedition();s.actor.x=2190;
 s=sim(s,{moveX:1},20);assert.equal(s.actor.x,2208);assert.equal(s.obstacleMoved,false);
 const atWinch={...s,actor:{...s.actor,x:2530,y:920}};
 assert.equal(ash.interactAshPoint(atWinch).shortcutOpened,false);
});
