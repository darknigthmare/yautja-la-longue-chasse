import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";
const compiled = await build({ entryPoints: ["app/game/systems/homeworld.ts"], bundle: true, write: false, format: "esm", platform: "node", logLevel: "silent" });
const hw = await import("data:text/javascript;base64," + Buffer.from(compiled.outputFiles[0].text).toString("base64"));
const { HOMEWORLD_DISTRICTS, HOMEWORLD_PLATFORMS, HOMEWORLD_LIFTS, HOMEWORLD_POINTS, HOMEWORLD_REGIONS, HOMEWORLD_NPCS, HOMEWORLD_ORGANIZATIONS, HOMEWORLD_EVIDENCE, HOMEWORLD_WITNESS_CHOICES, defaultHomeworldProgress, normalizeHomeworldProgress, applyHomeworldAction, createHomeworldActor, stepHomeworldActor, nearestHomeworldPoint, districtAtHomeworldActor } = hw;
const context = { rankId: "young-blood", ownedTrophyCount: 0 };
const act = (progress, action, settings = context) => applyHomeworldAction(progress, action, settings);
const chain = () => HOMEWORLD_EVIDENCE.reduce((p, e) => act(p, { type: "inspect", evidenceId: e.id }).progress, defaultHomeworldProgress());
const input = (moveX = 0, climb = 0, jumpPressed = false) => ({ moveX, climb, jumpPressed });
const sim = (actor, controls, ticks, dt = 1 / 60) => { let next = actor; for (let i = 0; i < ticks; i++) next = stepHomeworldActor(next, controls, dt); return next; };
test("twelve districts, three circulation lanes and every point reachable on its actual floor", () => {
  assert.equal(HOMEWORLD_DISTRICTS.length, 12);
  assert.equal(new Set(HOMEWORLD_DISTRICTS.map(d => d.id)).size, 12);
  assert.deepEqual(HOMEWORLD_PLATFORMS.map(p => p.y), [500, 1000, 1500]);
  assert.equal(HOMEWORLD_LIFTS.length, 3);
  for (const district of HOMEWORLD_DISTRICTS) {
    assert(HOMEWORLD_POINTS.some(p => p.districtId === district.id));
    assert(HOMEWORLD_PLATFORMS.some(p => p.y === district.floorY && p.x <= district.x && p.x + p.width >= district.x + district.width));
  }
  for (const point of HOMEWORLD_POINTS) {
    assert.equal(districtAtHomeworldActor(point)?.id, point.districtId, point.id);
    assert.equal(nearestHomeworldPoint(point)?.id, point.id, point.id + " cannot be shadowed");
    if (point.npcId) assert(HOMEWORLD_NPCS.some(n => n.id === point.npcId));
  }
  assert.deepEqual(new Set(HOMEWORLD_POINTS.filter(p => p.service).map(p => p.service)), new Set(["armory","customization","trophies","codex","medbay","training","pit","justice"]));
});
test("one playable introduction is distinguished from nine regions and five unbuilt acts", () => {
  assert.equal(HOMEWORLD_REGIONS.length, 10);
  assert.equal(HOMEWORLD_REGIONS.filter(r => r.sourceCompleteness === "complete-description").length, 10);
  assert.equal(HOMEWORLD_REGIONS[7].id, "cold-crown");
  assert.equal(HOMEWORLD_REGIONS[7].sourceCompleteness, "complete-description");
  assert.equal(HOMEWORLD_REGIONS[8].id, "first-city-ruins");
  assert.equal(HOMEWORLD_REGIONS[9].id, "forbidden-reserve");
  assert.equal(hw.HOMEWORLD_CAMPAIGN_ACTS.length, 5);
  assert(hw.HOMEWORLD_CAMPAIGN_ACTS.every(act => act.status === "not-playable"));
  for (const r of HOMEWORLD_REGIONS) { assert.equal(r.status, r.id === "ash-marches" ? "playable-introduction" : "not-playable"); assert.equal(r.missionId, undefined); }
});
test("corrupt or future data cannot invent prerequisites, audience outcomes or factions", () => {
  assert.deepEqual(normalizeHomeworldProgress(null), defaultHomeworldProgress());
  assert.deepEqual(normalizeHomeworldProgress({ ...defaultHomeworldProgress(), version: 2 }), defaultHomeworldProgress());
  const p = normalizeHomeworldProgress({ version: 1, evidenceIds:["memory-register","undercity-testimony"], witnessChoice:"protect", audienceOutcome:"protected-witness", visitedDistrictIds:["port","port","fake"], greetedNpcIds:["fake","hunt-king","hunt-king"], relations:{"throne-court":Infinity,"exile-network":10000,"forge-circle":-1000,fake:999} });
  assert.deepEqual(p.evidenceIds, []); assert.equal(p.witnessChoice, null); assert.equal(p.audienceOutcome, null);
  assert.deepEqual(p.visitedDistrictIds, ["port"]); assert.deepEqual(p.greetedNpcIds, ["hunt-king"]);
  assert.equal(p.relations["throne-court"],0); assert.equal(p.relations["exile-network"],100); assert.equal(p.relations["forge-circle"],-100); assert.equal(p.relations.fake, undefined);
});
test("greetings and visits cannot farm relations and never mutate their input", () => {
  const original=defaultHomeworldProgress(); const json=JSON.stringify(original); let p=original;
  for (const npc of HOMEWORLD_NPCS) {
    const first=act(p,{type:"greet",npcId:npc.id},{rankId:"elder",ownedTrophyCount:7});
    assert.equal(first.changed,true); assert.match(first.message,/Elder/);
    if(npc.id==="trophy-herald") assert.match(first.message,/7 prise/);
    const again=act(first.progress,{type:"greet",npcId:npc.id});
    assert.equal(again.changed,false); assert.deepEqual(again.progress,first.progress); p=first.progress;
  }
  for (const d of HOMEWORLD_DISTRICTS) {
    const first=act(p,{type:"visit",districtId:d.id}); assert.equal(first.changed,true);
    assert.equal(act(first.progress,{type:"visit",districtId:d.id}).changed,false); p=first.progress;
  }
  assert.equal(JSON.stringify(original),json);
  assert.equal(Object.values(p.relations).reduce((a,b)=>a+b,0),HOMEWORLD_NPCS.length);
  assert.equal(p.visitedDistrictIds.length,12);
  assert.equal(act(p,{type:"greet",npcId:"invented"}).ok,false);
});
test("Elder rank cannot skip ordered evidence, and inspection never awards the suspect trophy", () => {
  const fresh=defaultHomeworldProgress();
  for (const action of [{type:"inspect",evidenceId:"memory-register"},{type:"inspect",evidenceId:"undercity-testimony"},{type:"choose-witness",choice:"protect"},{type:"audience"}]) {
    const r=act(fresh,action,{rankId:"elder",ownedTrophyCount:100});
    assert.equal(r.ok,false); assert.equal(r.changed,false); assert.deepEqual(r.progress,fresh);
  }
  let p=fresh;
  for (const e of HOMEWORLD_EVIDENCE) {
    const r=act(p,{type:"inspect",evidenceId:e.id}); assert.equal(r.ok,true); assert.equal(r.changed,true);
    assert.equal(act(r.progress,{type:"inspect",evidenceId:e.id}).changed,false); p=r.progress;
  }
  assert.equal(act(p,{type:"audience"}).ok,false); assert.equal(p.ownedTrophyCount,undefined);
});
for (const choice of HOMEWORLD_WITNESS_CHOICES) test("route "+choice.id+" applies one consequence and one audience, without closing the campaign", () => {
  const r=act(chain(),{type:"choose-witness",choice:choice.id});
  assert.equal(r.ok,true); assert.equal(r.changed,true); assert.equal(r.progress.witnessChoice,choice.id);
  assert.notDeepEqual(r.progress.relations,defaultHomeworldProgress().relations);
  assert.equal(act(r.progress,{type:"choose-witness",choice:choice.id}).changed,false);
  const other=HOMEWORLD_WITNESS_CHOICES.find(c=>c.id!==choice.id);
  assert.equal(act(r.progress,{type:"choose-witness",choice:other.id}).ok,false);
  const audience=act(r.progress,{type:"audience"});
  assert.equal(audience.ok,true); assert.equal(audience.changed,true); assert(audience.progress.audienceOutcome);
  assert.match(audience.message,/n'est pas résolue/);
  assert.equal(act(audience.progress,{type:"audience"}).changed,false);
  assert.deepEqual(normalizeHomeworldProgress(JSON.parse(JSON.stringify(audience.progress))),audience.progress);
});
test("an imported audience inconsistent with its witness decision is discarded", () => {
  const p=act(chain(),{type:"choose-witness",choice:"protect"}).progress;
  assert.equal(normalizeHomeworldProgress({...p,audienceOutcome:"ordered-restitution"}).audienceOutcome,null);
});
for (const lift of HOMEWORLD_LIFTS) test(lift.id+" reaches all landings, holds a cabin midway and allows diagonal exit", () => {
  let a=sim({...createHomeworldActor(),x:lift.x},input(0,-1),120);
  assert(Math.abs(a.y-1000)<0.01);
  a=sim(a,input(1,-1),18); assert(a.x>lift.x+lift.halfWidth); assert.equal(a.y,1000);
  a=sim({...a,x:lift.x},input(0,-1),60); assert(Math.abs(a.y-750)<0.01);
  const held=sim(a,input(),60); assert.equal(held.y,a.y);
  a=sim(held,input(0,-1),90); assert.equal(a.y,500);
  a=sim(a,input(-1,-1),18); assert(a.x<lift.x-lift.halfWidth); assert.equal(a.y,500);
  a=sim({...a,x:lift.x},input(0,1),260); assert.equal(a.y,1500); assert.equal(a.grounded,true);
});
test("a continuous journey without teleport visits all districts and physical interactions", () => {
  let a=createHomeworldActor(); const visited=new Set(); const seen=new Set();
  const advance=(controls,ticks)=>{for(let i=0;i<ticks;i++){a=stepHomeworldActor(a,controls,1/60);const d=districtAtHomeworldActor(a);if(d)visited.add(d.id);const p=nearestHomeworldPoint(a);if(p)seen.add(p.id);}};
  advance(input(-1),20); advance(input(1),780); assert.equal(a.x,4100);
  advance(input(1),110); advance(input(-1),110); advance(input(0,-1),120);
  advance(input(1),110); advance(input(-1),790); assert.equal(a.x,700);
  advance(input(-1),100); advance(input(1),100); advance(input(0,-1),120);
  advance(input(-1),100); advance(input(1),890);
  assert.equal(visited.size,12);
  for(const point of HOMEWORLD_POINTS) assert(seen.has(point.id),"not reached: "+point.id);
});
test("jumps land, movement rates agree and untrusted frame deltas stay bounded", () => {
  const source=createHomeworldActor();
  const jumped=stepHomeworldActor(source,input(0,0,true),1/60); assert(jumped.y<source.y);
  const landed=sim(jumped,input(),90); assert.equal(landed.y,source.y); assert.equal(landed.grounded,true);
  assert.equal(sim(source,input(1),60).x,sim(source,input(1),30,1/30).x);
  assert.equal(sim(source,input(1),60).x,sim(source,input(1),120,1/120).x);
  assert.equal(stepHomeworldActor(source,input(1),Infinity),source);
  assert.equal(stepHomeworldActor(source,input(1),-1),source);
  assert(stepHomeworldActor(source,input(1),100).x-source.x<=10.01);
  const bad=stepHomeworldActor({x:Infinity,y:NaN,vx:Infinity,vy:-Infinity,facing:42},input(NaN,Infinity),1/60);
  for(const field of ["x","y","vx","vy"])assert(Number.isFinite(bad[field]));
  assert.equal(nearestHomeworldPoint({x:Infinity,y:1500}),null);
  assert.equal(HOMEWORLD_ORGANIZATIONS.length,6);
});
