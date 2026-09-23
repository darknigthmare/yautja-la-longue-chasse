import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { chromium } from "playwright-core";
// Resume an archive exported after an actual keyboard victory; never manufacture completion.
const base = process.env.V47_QA_URL || "http://127.0.0.1:4174";
const output = process.env.V47_WELCOME_QA_OUTPUT || "work/v47/unblooded-welcome-qa";
const archivePath = process.env.V47_PLAYED_ARCHIVE || "work/v47/nursery-scene-browser-qa/played-campaign-storage.json";
const storage = JSON.parse(await fs.readFile(archivePath, "utf8"));
const original = JSON.parse(storage["yautja-long-hunt.save"]);
assert.equal(original.prologue.status, "completed");
assert.equal(original.prologue.checkpoint.winner, "player");
assert.equal(original.homeworld.greetedNpcIds.length, 0, "Archive must precede any NPC greeting");
async function moduleAt(name) {
 const result = await build({entryPoints:[fileURLToPath(new URL("../app/game/systems/" + name + ".ts", import.meta.url))], bundle:true, write:false, format:"esm", platform:"node", target:"es2022"});
 return import("data:text/javascript;base64," + Buffer.from(result.outputFiles[0].text).toString("base64"));
}
const city = await moduleAt("homeworldCity"), world = await moduleAt("homeworld");
await fs.mkdir(output,{recursive:true});
const checks=[], errors=[], failures=[], routeEvidence=[];
const browser=await chromium.launch({channel:"chrome",headless:true});
const page=await browser.newPage({viewport:{width:1280,height:900}});
page.setDefaultTimeout(45000);
page.on("pageerror", e=>errors.push(e.message));
page.on("response", r=>{if(r.status()>=400)failures.push({url:r.url(),status:r.status()});});
const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem("yautja-long-hunt.save")));
try {
 await page.goto(base,{waitUntil:"networkidle",timeout:120000});
 await page.evaluate(entries=>{localStorage.clear(); for(const [k,v]of Object.entries(entries))localStorage.setItem(k,v);},storage);
 await page.reload({waitUntil:"networkidle"});
 await page.getByRole("button",{name:/^Continuer/}).click();
 const hub=page.locator("[data-homeworld-hub]"); await hub.waitFor();
 const viewport=page.getByRole("group",{name:"Cité jouable en perspective 2.5D",exact:true});
 await page.locator('[data-unblooded-objective="chief"]').waitFor();
 assert(!(await hub.innerText()).includes("Ton vaisseau reste ton refuge"));
 assert(!(await hub.innerText()).includes("Sas de ton vaisseau"));
 assert.equal(await hub.locator('[data-homeworld-actor] img').first().getAttribute("src"),"/game/prologue/v47/unblooded-player.png");
 assert.equal((await saved()).prologue.chronicle.evidence.filter(e=>e.id==="intro-completed").length,1);
 checks.push({name:"real-prologue-handoff",archive:archivePath,completionUnique:true,youngUnbloodedBitmap:true});

 const modules=hub.locator("[data-modular-homeworld-character]");
 assert.equal(await modules.count(),12);
 await page.waitForFunction(()=>[...document.querySelectorAll("[data-modular-homeworld-character] img")].every(img=>img.complete&&img.naturalWidth>0));
 const layers=await modules.evaluateAll(nodes=>nodes.map(node=>({morph:node.dataset.bodyMorph,body:node.querySelector('[data-homeworld-layer="body"]').getAttribute("src"),dreads:node.querySelectorAll('[data-homeworld-layer="dread"]').length,cloth:node.querySelectorAll('[data-homeworld-layer="loincloth"]').length})));
 assert(layers.every(item=>!item.body.includes("/net/")&&item.dreads===7&&item.cloth===1));
 await page.getByRole("button",{name:"Journal de l’accueil",exact:true}).click();
 const journal=await hub.getByRole("dialog").innerText();
 assert.match(journal,/Accueil Unblooded/); assert(!journal.includes("Un trophée contesté est arrivé"));
 await page.getByRole("button",{name:"Revenir à la cité",exact:true}).click();
 checks.push({name:"modular-npcs-and-youth-journal",inhabitants:layers.length,bodyDreadsClothDecoded:true,adultInquiryNotPresentedAsYouthObjective:true});
 await page.screenshot({path:path.join(output,"unblooded-entry.png"),fullPage:true});
 await page.clock.install();
  const position = () => page.locator("[data-homeworld-actor]").evaluate(element => ({ x: Number(element.dataset.x), y: Number(element.dataset.y) }));
  const segmentClear = (a, b) => {
    const count = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 6));
    // Leave clearance for discrete keyboard steps and rounded DOM observations.
    for (let i = 0; i <= count; i += 1) {
      const point={x:a.x+(b.x-a.x)*i/count,y:a.y+(b.y-a.y)*i/count};
      const margin=Math.min(14,Math.hypot(point.x-a.x,point.y-a.y));
      if(!city.isHomeworldWalkable(point,{halfWidth:city.HOMEWORLD_ACTOR.halfWidth+margin,halfDepth:city.HOMEWORLD_ACTOR.halfDepth+margin}))return false;
    }
    return true;
  };
  const route = (start, target, tolerance) => {
    const cell = 25, columns = Math.ceil(city.HOMEWORLD_WORLD.width / cell), rows = Math.ceil(city.HOMEWORLD_WORLD.height / cell);
    const key = point => point.y * columns + point.x;
    const rounded = {x:Math.round(start.x/cell),y:Math.round(start.y/cell)};
    const candidates=[];
    for(let dx=-2;dx<=2;dx++)for(let dy=-2;dy<=2;dy++)candidates.push({x:rounded.x+dx,y:rounded.y+dy});
    const startCell=candidates.sort((a,b)=>Math.hypot(a.x*cell-start.x,a.y*cell-start.y)-Math.hypot(b.x*cell-start.x,b.y*cell-start.y)).find(p=>city.isHomeworldWalkable({x:p.x*cell,y:p.y*cell},{halfWidth:city.HOMEWORLD_ACTOR.halfWidth+14,halfDepth:city.HOMEWORLD_ACTOR.halfDepth+14})&&segmentClear(start,{x:p.x*cell,y:p.y*cell}));
    assert(startCell,"No safe nearby route origin");
    const queue = [startCell], visited = new Map([[key(startCell), null]]);
    let end;
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const point = queue[cursor], worldPoint = { x: point.x * cell, y: point.y * cell };
      if (Math.hypot(worldPoint.x - target.x, worldPoint.y - target.y) <= tolerance) { end = point; break; }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const next = { x: point.x + dx, y: point.y + dy };
        if (next.x < 0 || next.y < 0 || next.x >= columns || next.y >= rows || visited.has(key(next))) continue;
        if (!segmentClear(worldPoint, { x: next.x * cell, y: next.y * cell })) continue;
        visited.set(key(next), point); queue.push(next);
      }
    }
    assert(end, "No collision-safe keyboard route to " + JSON.stringify(target));
    const points = [];
    for (let point = end; point; point = visited.get(key(point))) points.unshift({ x: point.x * cell, y: point.y * cell });
    const simplified = [];
    let anchor = start, cursor = 0;
    while (cursor < points.length) {
      let next = cursor;
      while (next + 1 < points.length && segmentClear(anchor, points[next + 1])) next += 1;
      simplified.push(points[next]); anchor = points[next]; cursor = next + 1;
    }
    return simplified;
  };
  const walkTo = async (target, tolerance = 20) => {
    const start = await position();
    const planned = route(start, target, tolerance);
    const points = [];
    let segmentStart = start;
    for (const endpoint of planned) {
      // Short targets keep real digital inputs close to the collision-tested
      // segment even though horizontal and depth movement have different speeds.
      const count = Math.max(1, Math.ceil(Math.hypot(endpoint.x - segmentStart.x, endpoint.y - segmentStart.y) / 25));
      for (let i = 1; i <= count; i += 1) points.push({ x: segmentStart.x + (endpoint.x - segmentStart.x) * i / count, y: segmentStart.y + (endpoint.y - segmentStart.y) * i / count });
      segmentStart = endpoint;
    }
    await viewport.focus();
    for (const point of points) {
      for (let attempt = 0; attempt < 160; attempt += 1) {
        const current = await position(), dx = point.x - current.x, dy = point.y - current.y;
        if (Math.hypot(dx, dy) < 9) break;
        const keys = [];
        if (Math.abs(dx) > 2) keys.push(dx > 0 ? "ArrowRight" : "ArrowLeft");
        if (Math.abs(dy) > 2) keys.push(dy > 0 ? "ArrowDown" : "ArrowUp");
        const duration = Math.max(16, Math.min(100, Math.max(Math.abs(dx) / 330, Math.abs(dy) / 260) * 1000));
        for (const key of keys) await page.keyboard.down(key);
        await page.clock.runFor(duration);
        for (const key of keys) await page.keyboard.up(key);
        await page.clock.runFor(34);
        if (attempt === 159) throw new Error(`Keyboard route blocked at ${JSON.stringify(await position())}; target ${JSON.stringify(point)}`);
      }
    }
    const end = await position();
    assert(Math.hypot(end.x - target.x, end.y - target.y) <= tolerance + 12, "Keyboard target not reached");
    assert(city.isHomeworldWalkable(end), "Actual actor remains inside the collision-safe city");
    routeEvidence.push({ from: start, target, actual: end, waypoints: points.length });
  };


 const approach = async id => {
  const target=world.HOMEWORLD_POINTS.find(p=>p.id===id); assert(target);
  await walkTo(target,65); await page.clock.runFor(100);
  const actual=await position(); assert.equal(world.nearestHomeworldPoint(actual)?.id,id);
  await page.keyboard.press("e"); await page.clock.runFor(100);
  await hub.getByRole("dialog").waitFor();
 };
 const close=async()=>{await page.getByRole("button",{name:"Revenir à la cité",exact:true}).click();await page.clock.runFor(100);};
 await approach("personal-ship");
 assert.equal(await page.getByRole("button",{name:/Rentrer à bord/}).count(),0);
 assert.match(await hub.getByRole("dialog").innerText(),/après le rite Blooded/);
 await close(); checks.push({name:"no-personal-ship-before-blooded",blocked:true});
 await approach("training-service");
 await page.locator('[data-unblooded-conversation="terrace-instructor"]').waitFor();
 assert.equal((await saved()).homeworld.greetedNpcIds.includes("terrace-instructor"),false);
 assert.equal(await page.locator('[data-unblooded-objective="chief"]').count(),1);
 await close(); checks.push({name:"mentor-cannot-skip-chief",realKeyboard:true});
 await approach("audience-point");
 await page.getByRole("heading",{name:"Accueil du chef du clan",exact:true}).waitFor();
 await page.locator('[data-unblooded-objective="mentor"]').waitFor();
 assert.equal((await saved()).homeworld.greetedNpcIds.includes("hunt-king"),true);
 await page.screenshot({path:path.join(output,"chief-welcome.png"),fullPage:true});
 await close();
 await approach("training-service");
 await page.locator('[data-unblooded-objective="training-pending"]').waitFor();
 const after=await saved(); assert(after.homeworld.greetedNpcIds.includes("terrace-instructor"));
 assert.deepEqual(after.prologue.chronicle,original.prologue.chronicle,"Meeting NPCs must not mint training or Blooded proof");
 assert.deepEqual(after.loadout,original.loadout,"No equipment reward for merely visiting");
 await page.screenshot({path:path.join(output,"mentor-welcome.png"),fullPage:true});
 checks.push({name:"chief-then-mentor-durable",realKeyboard:true,noFakeTrainingOrEquipment:true});
 await close();
 await page.clock.resume(); await page.reload({waitUntil:"networkidle"});
 await page.getByRole("button",{name:/^Continuer/}).click();
 await page.locator('[data-unblooded-objective="training-pending"]').waitFor();
 assert.deepEqual((await saved()).homeworld.greetedNpcIds,after.homeworld.greetedNpcIds);
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(200);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:path.join(output,"unblooded-mobile.png"),fullPage:true});
 checks.push({name:"welcome-reload-and-mobile",greetingsPersist:true,noOverflow390:true});
 assert.deepEqual(errors,[]); assert.deepEqual(failures,[]);
 await fs.writeFile(path.join(output,"report.json"),JSON.stringify({passed:true,base,checks,routeEvidence,errors,failures,limitation:"Isolated browser; actual keyboard movement under controlled clock. Source archive exported from genuine played nursery."},null,2));
 console.log(JSON.stringify({passed:true,checks:checks.length,errors,failures}));
} catch(error) {
 await page.screenshot({path:path.join(output,"failure.png"),fullPage:true}).catch(()=>{});
 await fs.writeFile(path.join(output,"report.json"),JSON.stringify({passed:false,base,checks,routeEvidence,errors,failures,error:String(error)},null,2));throw error;
} finally {await browser.close();}
