import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { build } from "esbuild";
const compiled = await build({ entryPoints: ["app/game/systems/homeworld.ts"], bundle: true, write: false, format: "esm", platform: "node", logLevel: "silent" });
const hw = await import("data:text/javascript;base64," + Buffer.from(compiled.outputFiles[0].text).toString("base64"));
const { HOMEWORLD_WORLD, HOMEWORLD_DISTRICTS, HOMEWORLD_STREETS, HOMEWORLD_BUILDINGS, HOMEWORLD_PROPS, HOMEWORLD_POINT_POSITIONS, HOMEWORLD_POINT_PROP_COLLIDERS, HOMEWORLD_NPC_COLLIDERS, HOMEWORLD_NPC_PLATES, HOMEWORLD_GENERIC_HUNTER_PLATES, HOMEWORLD_TROPHY_SLOTS, HOMEWORLD_POINTS, HOMEWORLD_REGIONS, HOMEWORLD_NPCS, HOMEWORLD_ORGANIZATIONS, HOMEWORLD_EVIDENCE, HOMEWORLD_WITNESS_CHOICES, defaultHomeworldProgress, normalizeHomeworldProgress, applyHomeworldAction, createHomeworldActor, stepHomeworldActor, nearestHomeworldPoint, districtAtHomeworldActor, isHomeworldTerrainWalkable, isHomeworldWalkable, homeworldBuildingCollision, homeworldBuildingDoorPosition, homeworldCollisionAt, homeworldHeroPlate, homeworldNpcPlate, homeworldTrophyDisplays, nearestHomeworldDoor, shouldFadeHomeworldForeground } = hw;
const context = { rankId: "young-blood", ownedTrophyCount: 0 };
const act = (progress, action, settings = context) => applyHomeworldAction(progress, action, settings);
const chain = () => HOMEWORLD_EVIDENCE.reduce((p, e) => act(p, { type: "inspect", evidenceId: e.id }).progress, defaultHomeworldProgress());
const input = (moveX = 0, climb = 0, jumpPressed = false) => ({ moveX, climb, jumpPressed });
const sim = (actor, controls, ticks, dt = 1 / 60) => { let next = actor; for (let i = 0; i < ticks; i++) next = stepHomeworldActor(next, controls, dt); return next; };
test("the 2.5D city has twelve irregular districts, modular buildings and independent prop planes", () => {
  assert.equal(HOMEWORLD_DISTRICTS.length, 12);
  assert.equal(new Set(HOMEWORLD_DISTRICTS.map(d => d.id)).size, 12);
  assert.equal(hw.HOMEWORLD_PLATFORMS, undefined);
  assert.equal(hw.HOMEWORLD_LIFTS, undefined);
  assert(HOMEWORLD_STREETS.length >= 9);
  assert(HOMEWORLD_BUILDINGS.length >= 13);
  assert(HOMEWORLD_PROPS.length >= 10);
  assert(HOMEWORLD_DISTRICTS.every(d => d.polygon.length >= 5));
  assert.equal(new Set(HOMEWORLD_BUILDINGS.map(b => b.id)).size, HOMEWORLD_BUILDINGS.length);
  assert.deepEqual(new Set(HOMEWORLD_PROPS.map(p => p.plane)), new Set(["rear", "ground", "front"]));
  for (const district of HOMEWORLD_DISTRICTS) {
    assert(HOMEWORLD_POINTS.some(p => p.districtId === district.id), district.id);
    assert(HOMEWORLD_BUILDINGS.some(b => b.districtId === district.id), district.id + " needs its own building module");
  }
  assert.equal(Object.keys(HOMEWORLD_POINT_POSITIONS).length, HOMEWORLD_POINTS.length);
  for (const point of HOMEWORLD_POINTS) {
    assert.equal(districtAtHomeworldActor(point)?.id, point.districtId, point.id);
    assert.equal(nearestHomeworldPoint(point)?.id, point.id, point.id + " cannot be shadowed");
    assert(isHomeworldTerrainWalkable(point, { halfWidth: 0, halfDepth: 0 }), point.id + " must be on the public street network");
    if (point.npcId) assert(HOMEWORLD_NPCS.some(n => n.id === point.npcId));
  }
  assert.deepEqual(new Set(HOMEWORLD_POINTS.filter(p => p.service).map(p => p.service)), new Set(["armory","customization","trophies","codex","medbay","training","pit","justice"]));
  const memoryService = HOMEWORLD_POINTS.find(point => point.id === "memory-service");
  assert.equal(memoryService?.service, "codex");
  assert.equal(memoryService?.npcId, undefined);
  assert.equal(HOMEWORLD_POINTS.filter(point => point.npcId === "memory-keeper").length, 1);
  assert.equal(HOMEWORLD_NPC_COLLIDERS.some(collider => collider.id === "memory-service"), false);
});

test("city originals and unrepresented presets never borrow another known hunter identity", () => {
  assert.deepEqual(new Set(Object.keys(HOMEWORLD_NPC_PLATES)), new Set(HOMEWORLD_NPCS.map(({ id }) => id)));
  for (const [npcId, asset] of Object.entries(HOMEWORLD_NPC_PLATES)) {
    assert.equal(homeworldNpcPlate(npcId), asset);
    assert.match(asset, /^\/game\/assets\/v3\/actors\/yautja\/hunter\/body\/.+\.webp$/);
    assert(!asset.includes("/film-plates/"), npcId + " must remain an original city character");
    assert(existsSync("public" + asset), npcId + " has a missing modular body asset");
  }
  assert.equal(homeworldNpcPlate("unknown-city-role"), HOMEWORLD_GENERIC_HUNTER_PLATES.hunter);

  const exactV31 = [
    "city-hunter", "scarface", "stone-heart", "valkyrie", "witch", "enforcer",
    "alpha", "samurai", "cleopatra", "bionic", "broken-tusk", "ahab", "big-mama",
    "bad-blood-comic", "hashori",
  ];
  for (const presetId of exactV31) {
    const plate = homeworldHeroPlate(presetId);
    assert.equal(plate.exactPreset, true, presetId);
    assert.equal(plate.plateId, presetId);
    assert.equal(plate.src, `/game/sprites/v31/film-plates/${presetId}.png`);
    assert.equal(plate.status, "exact-plate");
    assert.equal(
      plate.provenanceStatus,
      presetId === "hashori" ? "noncanonical-project-interpretation" : "source-anchored-fan-plate",
      presetId,
    );
    assert(existsSync("public" + plate.src), presetId + " V31 plate is missing");
  }
  assert.equal(homeworldHeroPlate("youngblood").plateId, "youngblood");
  assert.equal(homeworldHeroPlate("youngblood").src, "/game/sprites/v5/film-plates/youngblood.png");

  assert.equal(exactV31.length, 15);
  assert.equal(new Set(exactV31.map((presetId) => homeworldHeroPlate(presetId).src)).size, exactV31.length);
  assert.equal(hw.HOMEWORLD_PENDING_HERO_PLATES, undefined);
  const custom = homeworldHeroPlate("custom");
  assert.equal(custom.status, "custom-modular-body");
  assert.equal(custom.plateId, "custom");
  assert.equal(custom.src, HOMEWORLD_GENERIC_HUNTER_PLATES.hunter);
  assert(existsSync("public" + custom.src));
});

test("solid scenery has actor volume while every authored doorway keeps a reachable threshold", () => {
  assert.equal(HOMEWORLD_NPC_COLLIDERS.length, HOMEWORLD_POINTS.filter(point => point.npcId).length);
  for (const npc of HOMEWORLD_NPC_COLLIDERS) {
    assert.deepEqual(homeworldCollisionAt(npc, { halfWidth: 0, halfDepth: 0 }), { kind: "npc", id: npc.id });
    assert.equal(isHomeworldWalkable(npc), false);
  }
  for (const prop of HOMEWORLD_PROPS.filter(prop => prop.plane === "ground")) {
    const collision = homeworldCollisionAt(prop, { halfWidth: 0, halfDepth: 0 });
    assert.equal(collision?.kind, "prop", prop.id);
    assert.equal(collision?.id, prop.id, prop.id);
  }
  assert(HOMEWORLD_POINT_PROP_COLLIDERS.length >= 20);
  for (const prop of HOMEWORLD_POINT_PROP_COLLIDERS) {
    assert.equal(isHomeworldWalkable(prop), false, prop.id + " station or portal has no volume");
  }
  for (const building of HOMEWORLD_BUILDINGS) {
    const volume = homeworldBuildingCollision(building);
    const wallX = Math.abs(volume.left - homeworldBuildingDoorPosition(building).x) > Math.abs(volume.right - homeworldBuildingDoorPosition(building).x)
      ? volume.left + 8 : volume.right - 8;
    const wall = { x: wallX, y: building.y - 24 };
    assert.equal(homeworldCollisionAt(wall, { halfWidth: 0, halfDepth: 0 })?.id, building.id, building.id + " facade is not solid");
    const door = homeworldBuildingDoorPosition(building);
    assert(isHomeworldWalkable(door), building.id + " door approach is blocked");
    assert.equal(nearestHomeworldDoor(door)?.id, building.id, building.id + " door cannot activate");
  }
});

test("owned trophies receive independent display slots and honest unknown-definition art", () => {
  const trophies = [
    { id: "known", definitionId: "trophy-vey", targetName: "Commandante Vey", partId: "insignia" },
    { id: "unknown", definitionId: "future-trophy", targetName: "Proie inconnue", partId: "skull" },
  ];
  const displays = homeworldTrophyDisplays(trophies);
  assert.equal(HOMEWORLD_TROPHY_SLOTS.length, 12);
  assert.equal(displays.length, 2);
  assert.equal(new Set(displays.map(display => display.claimId)).size, 2);
  assert.equal(new Set(displays.map(display => display.x + ":" + display.y)).size, 2);
  assert.match(displays[0].asset, /\/v15\/trophies\/trophy-vey\.webp$/);
  assert.match(displays[1].asset, /\/trophies\/trophy-skull\.webp$/);
  assert.deepEqual(new Set(HOMEWORLD_TROPHY_SLOTS.map(slot => slot.plane)), new Set(["rear", "ground"]));
});

test("foreground occluders fade only inside their authored radius", () => {
  const front = HOMEWORLD_PROPS.find(prop => prop.plane === "front");
  const ground = HOMEWORLD_PROPS.find(prop => prop.plane === "ground");
  assert(front && ground);
  assert.equal(shouldFadeHomeworldForeground(front, front), true);
  assert.equal(shouldFadeHomeworldForeground(front, { x: front.x + front.fadeRadius + 1, y: front.y }), false);
  assert.equal(shouldFadeHomeworldForeground(ground, ground), false);
});

test("the scene keeps stations, NPCs, doors, trophies and occlusion as separate render layers", () => {
  const scene = readFileSync("app/game/HomeworldCityScene.tsx", "utf8");
  const hub = readFileSync("app/game/HomeworldHub.tsx", "utf8");
  const css = readFileSync("app/game/HomeworldCity.module.css", "utf8");
  assert.match(scene, /data-station-art="true"/);
  assert.match(scene, /data-original-city-character="true"/);
  assert.match(scene, /trophyDisplays\.map/);
  assert.match(scene, /data-faded=\{faded\}/);
  assert.match(scene, /data-active=\{active\}/);
  assert.match(hub, /activeDoorId=\{activeDoorId\} fadedFrontPropIds=\{fadedFrontPropIds\} trophies=\{save\.trophies\}/);
  assert.match(hub, /data-asset-status=\{heroPlate\.status\}/);
  assert.match(hub, /data-provenance-status=\{heroPlate\.provenanceStatus\}/);
  assert.match(hub, /data-facing=\{actor\.facing\}/);
  assert.match(css, /\.hero\[data-facing='-1'\] \.heroPlate\s*\{[^}]*transform:\s*scaleX\(-1\)/s);
  assert.doesNotMatch(hub, /Plaque exacte à produire|heroPlatePending/);
  assert.match(hub, /rampes obliques forment un seul réseau au sol/);
  assert.match(css, /buildingDoorLeaf/);
  assert.doesNotMatch(css, /heroPlatePending/);
  assert.match(css, /data-faded='true'/);
  assert.equal(existsSync("app/game/HomeworldHub.module.css"), false);
});
test("two playable introductions are distinguished from eight regions and five unbuilt acts", () => {
  assert.equal(HOMEWORLD_REGIONS.length, 10);
  assert.equal(HOMEWORLD_REGIONS.filter(r => r.sourceCompleteness === "complete-description").length, 10);
  assert.equal(HOMEWORLD_REGIONS[7].id, "cold-crown");
  assert.equal(HOMEWORLD_REGIONS[7].sourceCompleteness, "complete-description");
  assert.equal(HOMEWORLD_REGIONS[8].id, "first-city-ruins");
  assert.equal(HOMEWORLD_REGIONS[9].id, "forbidden-reserve");
  assert.equal(hw.HOMEWORLD_CAMPAIGN_ACTS.length, 5);
  assert(hw.HOMEWORLD_CAMPAIGN_ACTS.every(act => act.status === "not-playable"));
  for (const r of HOMEWORLD_REGIONS) { assert.equal(r.status, ["ash-marches","glass-desert"].includes(r.id) ? "playable-introduction" : "not-playable"); assert.equal(r.missionId, undefined); }
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
test("the authored street mask connects spawn to every point without platforming", () => {
  const cell = 25;
  const columns = Math.ceil(HOMEWORLD_WORLD.width / cell);
  const rows = Math.ceil(HOMEWORLD_WORLD.height / cell);
  const start = createHomeworldActor();
  const startX = Math.round(start.x / cell);
  const startY = Math.round(start.y / cell);
  const key = (x, y) => y * columns + x;
  const queue = [[startX, startY]];
  const visited = new Set([key(startX, startY)]);
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const [x, y] = queue[cursor];
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]) {
      const nx=x+dx, ny=y+dy;
      if(nx<0||ny<0||nx>=columns||ny>=rows||visited.has(key(nx,ny))) continue;
      if(!isHomeworldWalkable({x:nx*cell,y:ny*cell})) continue;
      visited.add(key(nx,ny)); queue.push([nx,ny]);
    }
  }
  assert(queue.length > 8_000, "the reachable mask must describe a city, not a narrow lane");
  for (const point of HOMEWORLD_POINTS) {
    const reachable = queue.some(([x,y]) => Math.hypot(x*cell-point.x,y*cell-point.y) <= 90);
    assert(reachable, "not connected to spawn: " + point.id);
  }
  for (const building of HOMEWORLD_BUILDINGS) {
    const door = homeworldBuildingDoorPosition(building);
    const reachable = queue.some(([x,y]) => Math.hypot(x*cell-door.x,y*cell-door.y) <= 90);
    assert(reachable, "door not connected to spawn: " + building.id);
  }
});
test("walking uses the same collision model in four directions and slides along authored boundaries", () => {
  const source = createHomeworldActor();
  const right = sim(source, input(1), 30);
  const up = sim(source, input(0,-1), 30);
  assert(right.x > source.x);
  assert(up.y < source.y);
  assert(isHomeworldWalkable(right));
  assert(isHomeworldWalkable(up));
  const diagonal = sim(source, input(1,-1), 30);
  assert(isHomeworldWalkable(diagonal));
  const normalized = Math.hypot((diagonal.x-source.x)/330, (diagonal.y-source.y)/260);
  assert(normalized <= .51, "diagonal input must not gain speed");
});
test("the ground-plane runtime is deterministic and rejects untrusted frame data", () => {
  const source=createHomeworldActor();
  const reservedJump=stepHomeworldActor(source,input(0,0,true),1/60);
  assert.deepEqual(reservedJump,{...source,vx:0,vy:0});
  assert(Math.abs(sim(source,input(1),30).x-sim(source,input(1),15,1/30).x)<0.001);
  assert(Math.abs(sim(source,input(1),30).x-sim(source,input(1),60,1/120).x)<0.001);
  assert.equal(stepHomeworldActor(source,input(1),Infinity),source);
  assert.equal(stepHomeworldActor(source,input(1),-1),source);
  assert(stepHomeworldActor(source,input(1),100).x-source.x<=11.01);
  const bad=stepHomeworldActor({x:Infinity,y:NaN,vx:Infinity,vy:-Infinity,facing:42},input(NaN,Infinity),1/60);
  for(const field of ["x","y","vx","vy"])assert(Number.isFinite(bad[field]));
  assert.equal(nearestHomeworldPoint({x:Infinity,y:1500}),null);
  assert.equal(HOMEWORLD_ORGANIZATIONS.length,6);
});
