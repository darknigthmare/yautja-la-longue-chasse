import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import sharp from "sharp";
import test from "node:test";
import { build } from "esbuild";
async function load(path) { const compiled = await build({ entryPoints: [path], bundle: true, write: false, platform: "node", format: "esm", logLevel: "silent" }); return import("data:text/javascript;base64," + Buffer.from(compiled.outputFiles[0].text).toString("base64")); }
const city = await load("app/game/systems/homeworldCity.ts");
const codex = await load("app/game/systems/homeworldSpatialCodex.ts");
const hw = await load("app/game/systems/homeworld.ts");
const art = (await load("app/game/systems/homeworldCityArtV54.ts")).HOMEWORLD_CITY_ART_V54;

test("V54 extends two sides of the city while preserving spawn and the historical service coordinates", () => {
  assert.deepEqual(city.HOMEWORLD_WORLD, { width: 6300, height: 3400 });
  assert.deepEqual(city.createHomeworldActor(), { x: 430, y: 2210, vx: 0, vy: 0, grounded: true, facing: 1 });
  assert.equal(city.HOMEWORLD_DISTRICTS.length, 14);
  assert.equal(city.HOMEWORLD_BUILDINGS.length, 19);
  assert.equal(city.HOMEWORLD_STREETS.length, 14);
  assert.deepEqual(city.HOMEWORLD_POINT_POSITIONS["personal-ship"], { x: 400, y: 2220 });
  assert.deepEqual(city.HOMEWORLD_POINT_POSITIONS["temple-point"], { x: 3390, y: 760 });
  assert.deepEqual(city.HOMEWORLD_POINT_POSITIONS["training-service"], { x: 2220, y: 1330 });
  assert.equal(Object.keys(city.HOMEWORLD_POINT_POSITIONS).length, 25);
  assert.equal(hw.HOMEWORLD_REGIONS.length, 10);
  assert.equal(hw.HOMEWORLD_NPCS.length, 12);
});

test("all fourteen codex destinations are reachable with the full hunter footprint; no shortcut crosses scenery", () => {
  const start = city.createHomeworldActor();
  for (const site of codex.HOMEWORLD_SPATIAL_SITES) {
    assert(city.isHomeworldWalkable(site.approach), site.id + " approach must remain free");
    const route = codex.homeworldSpatialRoute(start, site.approach);
    assert.equal(route.status, "reachable", site.id);
    assert.deepEqual(route.points[0], { x: start.x, y: start.y });
    assert.deepEqual(route.points.at(-1), site.approach);
    assert(route.distance > 0);
    for (let i = 1; i < route.points.length; i++) assert(codex.isHomeworldRouteSegmentWalkable(route.points[i - 1], route.points[i]), site.id + " segment " + i);
  }
});

test("new districts form loops: routes between both entrances stay within the sector and its links", () => {
  for (const [from, to, sector] of [
    [{ x: 1080, y: 2380 }, { x: 3140, y: 2230 }, "convoy-works"],
    [{ x: 5260, y: 1010 }, { x: 5490, y: 2360 }, "rampart-walk"],
  ]) {
    const route = codex.homeworldSpatialRoute(from, to);
    assert.equal(route.status, "reachable", sector);
    assert(route.points.some(point => city.districtAtHomeworldPosition(point)?.id === sector), sector + " route must use extension");
  }
  for (const mark of city.HOMEWORLD_WAYMARKS) assert(city.isHomeworldWalkable(mark), mark.id + " ground waymark cannot lie under a solid prop");
});

test("navigation refuses corrupt, blocked and out-of-world destinations without moving or persisting anything", () => {
  const actor = city.createHomeworldActor(), original = JSON.stringify(actor);
  for (const goal of [{ x: NaN, y: 1 }, { x: 500000, y: 100 }, { x: 760, y: 2110 }, { x: 650, y: 1860 }]) {
    assert.equal(codex.homeworldSpatialRoute(actor, goal).status, "unavailable");
  }
  assert.equal(JSON.stringify(actor), original);
  const site = codex.HOMEWORLD_SPATIAL_SITES.find(s => s.id === "convoy-works");
  const route = codex.homeworldSpatialRoute(actor, site.approach);
  assert.equal(codex.homeworldRouteGuidance(site.approach, route).arrived, true);
  assert.equal(codex.homeworldRouteGuidance(actor, { status: "unavailable", points: [], distance: 0 }), null);
});

test("the spatial codex inspects actual placement, door collision, alpha anchor and depth rules", () => {
  for (const site of codex.HOMEWORLD_SPATIAL_SITES) {
    const record = codex.homeworldPlacementRecords(site.id);
    assert.deepEqual(record.rules, city.HOMEWORLD_PLACEMENT_RULES);
    assert.equal(record.buildings.length, city.HOMEWORLD_BUILDINGS.filter(b => b.districtId === site.id).length);
    for (const building of record.buildings) {
      const source = city.HOMEWORLD_BUILDINGS.find(b => b.id === building.id);
      assert.deepEqual(building.collision, city.homeworldBuildingCollision(source));
      assert.deepEqual(building.door, city.homeworldBuildingDoorPosition(source));
      assert.equal(building.depth, source.y);
    }
    for (const prop of record.props) assert.deepEqual(prop.image, city.homeworldPropArtPlacement(city.HOMEWORLD_PROPS.find(p => p.id === prop.id)));
  }
});

test("lore sources support only their narrow motif; all city plans and institutions remain original", () => {
  assert(codex.HOMEWORLD_SPATIAL_SITES.every(site => site.lore === "original-adaptation"));
  assert.equal(codex.HOMEWORLD_SPATIAL_SITES.filter(site => site.sourceId).length, 1);
  assert.equal(codex.HOMEWORLD_SPATIAL_SITES.find(site => site.sourceId).id, "esplanade");
  assert.match(codex.HOMEWORLD_CODEX_SOURCES[0].url, /^https:\/\/store.necaonline.com\//);
  assert.match(codex.HOMEWORLD_CODEX_SOURCES[0].fact, /ni les rues ni les institutions/);
});

test("building occlusion follows rear ground depth and never fades a hunter in front or an unrelated facade", () => {
  for (const building of city.HOMEWORLD_BUILDINGS) {
    assert.equal(city.shouldFadeHomeworldBuilding(building, { x: building.x, y: building.y - 130 }), true);
    assert.equal(city.shouldFadeHomeworldBuilding(building, city.homeworldBuildingDoorPosition(building)), false);
    assert.equal(city.shouldFadeHomeworldBuilding(building, { x: building.x + building.width + 100, y: building.y - 130 }), false);
  }
});

test("extension visits round-trip without rewriting rank, evidence, expeditions or legacy visits", () => {
  const fresh = hw.defaultHomeworldProgress();
  fresh.visitedDistrictIds = ["port", "temple"];
  const before = JSON.stringify(fresh);
  const next = hw.applyHomeworldAction(fresh, { type: "visit", districtId: "convoy-works" }, { rankId: "young-blood", ownedTrophyCount: 0 });
  assert.equal(next.ok, true);
  assert.deepEqual(next.progress.visitedDistrictIds, ["port", "temple", "convoy-works"]);
  assert.equal(JSON.stringify(fresh), before);
  assert.deepEqual(hw.normalizeHomeworldProgress(JSON.parse(JSON.stringify(next.progress))), next.progress);
  for (const key of ["inquiry", "expeditions", "evidenceIds", "greetedNpcIds", "relations", "witnessChoice", "audienceOutcome"]) assert.deepEqual(next.progress[key], fresh[key], key);
});

test("atlas has a keyboard modal and read-only navigation, with no bypass to adult services or progression", () => {
  const source = readFileSync("app/game/HomeworldSpatialCodex.tsx", "utf8");
  assert.match(source, /aria-modal="true"/);
  assert.match(source, /event\.code === "Escape"/);
  assert.match(source, /document\.activeElement === first/);
  assert.match(source, /document\.activeElement === last/);
  assert.match(source, /youthWelcome \?/);
  assert.doesNotMatch(source, /localStorage|onProgress|onService|onExpedition|setActor|requestAnimationFrame/);
  const scene = readFileSync("app/game/HomeworldCityScene.tsx", "utf8");
  assert.match(scene, /shouldFadeHomeworldBuilding\(building, actorPosition\)/);
  assert.match(scene, /data-homeworld-waymark/);
});

test("three source PNGs retain exact bytes; native building and beacon have audited alpha and pavement stays opaque", async () => {
  for (const [id, asset] of Object.entries(art)) {
    const bytes = readFileSync("public" + asset.src);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), asset.sha256, id);
    const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.equal(info.width, asset.sourceWidth); assert.equal(info.height, asset.sourceHeight);
    let x0 = info.width, y0 = info.height, x1 = -1, y1 = -1, empty = 0;
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
      const a = data[(y * info.width + x) * 4 + 3]; if (a === 0) empty++;
      if (a > 8) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    }
    assert.deepEqual({ x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 }, asset.alphaBounds, id);
    if (id === "pavement") assert.equal(empty, 0); else assert(empty > info.width * info.height * .35, id + " needs true alpha");
  }
});

test("all six native buildings share scale, ground contact, usable doorway and no foreign door overlay", () => {
  const native = city.HOMEWORLD_BUILDINGS.filter(building => building.art);
  assert.equal(native.length, 6);
  const scales = [];
  for (const building of native) {
    const placed = city.homeworldBuildingArtPlacement(building), source = building.art;
    const sx = placed.width / source.sourceWidth, sy = placed.height / source.sourceHeight;
    assert(Math.abs(sx - sy) < 1e-8);
    assert(Math.abs(placed.left + (source.alphaBounds.x + source.alphaBounds.width / 2) * sx - building.width / 2) < 1e-8);
    assert(Math.abs(placed.top + (source.alphaBounds.y + source.alphaBounds.height) * sy - building.height) < 1e-8);
    assert(art.compactRelay.doorway.width * sx >= 165, "door opening is wider than hero rig");
    assert(art.compactRelay.doorway.height * sy >= 205, "door opening fits hero rig height");
    assert(city.isHomeworldWalkable(city.homeworldBuildingDoorPosition(building)));
    scales.push(sx);
  }
  assert(scales.every(scale => scale === scales[0]));
  const beacons = city.HOMEWORLD_PROPS.filter(prop => prop.asset === art.beacon.src);
  assert.equal(beacons.length, 16);
  assert(beacons.every(prop => prop.width === 76 && prop.height === 128));
  const source = readFileSync("app/game/HomeworldCityScene.tsx", "utf8");
  assert.match(source, /building\.art \? <>[\s\S]*?nativeBuildingArt[\s\S]*?: <>/);
});

test("run2 narrow clan/forge join cannot become a false shortcut between sixteen-unit samples", () => {
  // Run2 browser: actual keys stopped at3589,1608. The old simplified segment
  // crossed a tiny invalid terrain interval that its16-unit sampling missed.
  assert.equal(city.isHomeworldWalkable({ x: 3569.230769230769, y: 1614.7692307692307 }), false);
  assert.equal(codex.isHomeworldRouteSegmentWalkable({ x: 3456, y: 1728 }, { x: 3584, y: 1600 }), false);
  assert.equal(codex.isHomeworldRouteSegmentWalkable({ x: 3584, y: 1600 }, { x: 4032, y: 1408 }), false);
  const start = { x: 1752, y: 2530 }, target = codex.HOMEWORLD_SPATIAL_SITES.find(site => site.id === "rampart-walk").approach;
  const route = codex.homeworldSpatialRoute(start, target);
  assert.equal(route.status, "reachable");
  let actor = { ...city.createHomeworldActor(), ...start };
  for (let i = 1; i < route.points.length; i++) {
    const from = route.points[i - 1], to = route.points[i];
    const dense = Math.ceil(Math.hypot(to.x - from.x, to.y - from.y));
    for (let j = 0; j <= dense; j++) assert(city.isHomeworldWalkable({ x: from.x + (to.x - from.x) * j / dense, y: from.y + (to.y - from.y) * j / dense }), `new segment${i} is blocked at sample${j}`);
    const count = Math.max(1, Math.ceil(dense / 24));
    for (let j = 1; j <= count; j++) {
      const goal = { x: from.x + (to.x - from.x) * j / count, y: from.y + (to.y - from.y) * j / count };
      let reached = false;
      for (let tick = 0; tick < 160; tick++) {
        const dx = goal.x - actor.x, dy = goal.y - actor.y;
        if (Math.hypot(dx, dy) < 10) { reached = true; break; }
        actor = city.stepHomeworldActor(actor, { moveX: Math.abs(dx) > 4 ? Math.sign(dx) : 0, climb: Math.abs(dy) > 4 ? Math.sign(dy) : 0, jumpPressed: false }, 1 / 60);
      }
      assert(reached, `digital movement blocked at${actor.x},${actor.y}`);
    }
  }
  assert(Math.hypot(actor.x - target.x, actor.y - target.y) < 15);
});

test("ship occlusion reveals the historical spawn but never relocates it or fades a player standing in front", () => {
  const ship = city.HOMEWORLD_POINT_POSITIONS["personal-ship"];
  assert.equal(city.shouldFadeHomeworldShip(ship, city.createHomeworldActor()), true);
  assert.equal(city.shouldFadeHomeworldShip(ship, { x: ship.x + 300, y: ship.y - 20 }), false);
  assert.equal(city.shouldFadeHomeworldShip(ship, { x: ship.x, y: ship.y + 30 }), false);
  assert.equal(city.shouldFadeHomeworldShip(ship, { x: ship.x, y: ship.y - 300 }), false);
  assert.deepEqual({ x: city.createHomeworldActor().x, y: city.createHomeworldActor().y }, { x: 430, y: 2210 });
});

test("compass preserves a nearby turning waypoint when the onward line would cut the building corner", () => {
  const actor = { x: 1460, y: 2760 }, turn = { x: 1460, y: 2800 }, target = { x: 2100, y: 2800 };
  assert(city.isHomeworldWalkable(actor));
  assert.equal(codex.isHomeworldRouteSegmentWalkable(actor, target), false);
  assert.equal(codex.isHomeworldRouteSegmentWalkable(actor, turn), true);
  const guide = codex.homeworldRouteGuidance(actor, { status: "reachable", distance: 740, points: [{ x: 1460, y: 2700 }, turn, target] });
  assert.deepEqual(guide.waypoint, turn);
  assert.equal(guide.direction, "Sud ↓");
  assert.equal(guide.arrived, false);
});
