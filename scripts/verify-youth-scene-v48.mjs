import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { chromium } from "playwright-core";
// Resume an archive exported after an actual keyboard victory; never manufacture completion.
const base = process.env.V48_QA_URL || "http://127.0.0.1:4174";
const output = process.env.V48_YOUTH_SCENE_QA_OUTPUT || "work/v48/youth-scene-browser-qa";
const archivePath = process.env.V48_PLAYED_ARCHIVE || "work/v47/final-scene-browser-qa/played-campaign-storage.json";
const storage = JSON.parse(await fs.readFile(archivePath, "utf8"));
const original = JSON.parse(storage["yautja-long-hunt.save"]);
assert.equal(original.prologue.status, "completed");
assert.equal(original.prologue.checkpoint.winner, "player");
assert.equal(original.homeworld.greetedNpcIds.length, 0, "Archive must precede any NPC greeting");
async function moduleAt(name) {
 const result = await build({entryPoints:[fileURLToPath(new URL("../app/game/systems/" + name + ".ts", import.meta.url))], bundle:true, write:false, format:"esm", platform:"node", target:"es2022"});
 return import("data:text/javascript;base64," + Buffer.from(result.outputFiles[0].text).toString("base64"));
}
const city = await moduleAt("homeworldCity"), world = await moduleAt("homeworld"), youth = await moduleAt("youthTraining");
await fs.mkdir(output,{recursive:true});
const checks=[], errors=[], failures=[], routeEvidence=[], trainingEvidence=[];
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
 assert.match(journal,/Parcours Unblooded/); assert(!journal.includes("Un trophée contesté est arrivé"));
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
 await page.locator('[data-unblooded-objective="training"]').waitFor();
 const after=await saved(); assert(after.homeworld.greetedNpcIds.includes("terrace-instructor"));
 assert.deepEqual(after.prologue.chronicle,original.prologue.chronicle,"Meeting NPCs must not mint training or Blooded proof");
 assert.deepEqual(after.loadout,original.loadout,"No equipment reward for merely visiting");
 await page.screenshot({path:path.join(output,"mentor-welcome.png"),fullPage:true});
 checks.push({name:"chief-then-mentor-durable",realKeyboard:true,noFakeTrainingOrEquipment:true});

 await page.locator("[data-youth-enter-dojo]").click();
 const training = page.locator("[data-youth-training]"), canvas = training.locator("canvas[data-youth-stage]");
 await training.waitFor(); await page.clock.runFor(1000);
 await page.waitForFunction(() => document.querySelector("[data-youth-training] canvas[data-youth-stage]")?.dataset.youthAssets === "true", null, { timeout: 120000 });
 const exportStorage = async name => fs.writeFile(path.join(output,name),JSON.stringify(await page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).filter(k=>k.includes("yautja")).map(k=>[k,localStorage.getItem(k)]))),null,2));
 await exportStorage("dojo-start-storage.json");
 await canvas.focus(); await page.clock.runFor(100);
 const sceneState=()=>canvas.evaluate(node=>({phase:node.dataset.youthPhase,tick:Number(node.dataset.youthTick),x:node.dataset.youthPositions.split(",").map(Number),y:Number(node.dataset.youthY),vy:Number(node.dataset.youthVy),pose:node.dataset.youthPose,rivalPose:node.dataset.youthRivalPose,rivalTick:Number(node.dataset.youthRivalActionTick),counter:Number(node.dataset.youthCounter),target:node.dataset.youthTarget===""?null:Number(node.dataset.youthTarget),facing:Number(node.dataset.youthFacing),paused:node.dataset.youthPaused==="true",armed:node.dataset.youthArmed==="true",composure:node.dataset.youthComposure.split(",").map(Number)}));
 assert.equal((await sceneState()).phase,"dojo-move");assert.equal(await training.getByRole("meter").count(),0,"Dojo lessons do not show duel meters");
 await page.screenshot({path:path.join(output,"dojo-start.png"),fullPage:true});
 await page.keyboard.down("ArrowRight"); await page.clock.runFor(200); await page.keyboard.press("Escape");
 const paused=await sceneState();await page.clock.runFor(3000);assert.equal((await sceneState()).tick,paused.tick);
 const dialog=page.getByRole("dialog",{name:"Formation en pause"});await dialog.waitFor();
 const controls=dialog.getByRole("button");await controls.last().focus();await page.keyboard.press("Tab");assert(await controls.first().evaluate(e=>document.activeElement===e));
 await page.getByRole("button",{name:"Reprendre la formation",exact:true}).click();await page.clock.runFor(500);assert.equal((await sceneState()).tick,paused.tick);
 await page.keyboard.up("ArrowRight");await canvas.focus();await page.clock.runFor(100);
 checks.push({name:"youth-pause-and-key-release",heldKeysCannotAdvance:true,focusTrap:true,clockFrozen:true});
 const keys=new Set();const applyKeys=async desired=>{for(const k of keys)if(!desired.has(k)){await page.keyboard.up(k);keys.delete(k);}for(const k of desired)if(!keys.has(k)){await page.keyboard.down(k);keys.add(k);}};
 let priorPhase="",iterations=0, maskChosen=false,bladeRequested=false,bladeCaptured=false,bladeRivalBefore=null;const visited=new Set();
 for(;iterations<4000;iterations++){
  const s=await sceneState();visited.add(s.phase);if(s.phase==="morning")break;
  if(s.phase!==priorPhase){await applyKeys(new Set());await page.clock.runFor(100);priorPhase=s.phase;
   if(s.phase.startsWith("dojo-"))assert.equal(await training.getByRole("meter").count(),0);
   if(s.phase==="camp-duel"){
    assert.equal(await training.getByRole("meter").count(),2);
    assert.equal(await training.getByRole("meter",{name:"\u00c9quilibre \u2014 vous",exact:true}).getAttribute("aria-valuenow"),"100");
    assert.equal(await training.getByRole("meter",{name:"\u00c9quilibre \u2014 ma\u00eetre",exact:true}).getAttribute("aria-valuenow"),"84");
   }
   const checkpoint=await saved();trainingEvidence.push({phase:s.phase,tick:s.tick,receipts:checkpoint.youthTraining.receipts.map(r=>({id:r.id,tick:r.tick})),equipment:checkpoint.youthTraining.equipment});await page.screenshot({path:path.join(output,s.phase+".png"),fullPage:true});continue;}
  if(s.paused||!s.armed){await applyKeys(new Set());await page.clock.runFor(100);continue;}
  if(s.phase==="armory"&&!maskChosen){await applyKeys(new Set());await page.locator('[data-youth-choice="rust"]').click();await page.clock.runFor(100);maskChosen=true;continue;}
  if(s.phase==="camp-duel"&&s.pose==="blade"&&!bladeCaptured){
   await page.clock.runFor(150);const striking=await sceneState();
   assert.equal(striking.pose,"blade");assert(striking.composure[1]<bladeRivalBefore,"The earned blade must physically hit the rival");
   await page.clock.runFor(100);
   assert.equal(await training.getByRole("meter",{name:"\u00c9quilibre \u2014 ma\u00eetre",exact:true}).getAttribute("aria-valuenow"),String(striking.composure[1]));
   assert.equal(await training.getByRole("meter",{name:"\u00c9quilibre \u2014 vous",exact:true}).getAttribute("aria-valuenow"),String((await sceneState()).composure[0]));
   await page.screenshot({path:path.join(output,"camp-earned-blade-impact.png"),fullPage:true});bladeCaptured=true;
   checks.push({name:"earned-blade-physical-strike",realKeyboard:true,rivalBefore:bladeRivalBefore,rivalAfter:striking.composure[1],pose:"blade",readableDuelMeters:true,noDojoMeters:true});
  }
  const desired=new Set();const delta=s.target===null?0:s.target-s.x[0];const move=d=>{if(Math.abs(d)>8)desired.add(d<0?"ArrowLeft":"ArrowRight");};
  if(s.phase==="dojo-move")move(delta);
  else if(s.phase==="dojo-jump"||s.phase==="camp-run"){
   move(delta);const direction=delta<0?-1:1;const obstacles=s.phase==="dojo-jump"?[[440,90]]:[[350,70],[650,70]];
   const ahead=obstacles.find(([x,w])=>direction===1?x>s.x[0]&&x-s.x[0]<65:x+w<s.x[0]&&s.x[0]-x-w<65);
   if(ahead&&s.vy===0&&!keys.has("Space"))desired.add("Space");
  }else if(s.phase==="dojo-dodge"){
   if(s.rivalPose==="jab"&&s.rivalTick>=24&&s.rivalTick<32&&s.pose==="idle"){desired.add("u");desired.add("ArrowLeft");}
   else if(Math.abs(s.x[1]-s.x[0])>68)move(s.x[1]-s.x[0]);
  }else if(["dojo-strike","dojo-throw","camp-duel"].includes(s.phase)){
   const projection=s.phase==="dojo-throw",range=projection?46:59,d=s.x[1]-s.x[0];
   if(Math.abs(d)>range||s.facing!==(d<0?-1:1))move(d);
   else if(s.pose==="idle"){const key=projection?"p":s.phase==="camp-duel"&&!bladeRequested?"k":"j";if(!keys.has(key)){desired.add(key);if(key==="k"){bladeRequested=true;bladeRivalBefore=s.composure[1];}}}
  }else if(["blade-award","armory","barracks"].includes(s.phase)){
   if(Math.abs(delta)>35)move(delta);else if(!keys.has("h"))desired.add("h");
  }else if(s.phase==="camp-defeat")throw new Error("Actual keyboard combat was defeated");
  await applyKeys(desired);await page.clock.runFor(50);
 }
 await applyKeys(new Set());await page.clock.runFor(500);assert.equal((await sceneState()).phase,"morning");
 assert(iterations<4000);assert.equal(visited.size,12);assert(bladeCaptured,"The full route includes a rendered earned-blade impact");
 await exportStorage("morning-played-storage.json");await page.screenshot({path:path.join(output,"morning.png"),fullPage:true});
 const morning=await saved();assert.equal(morning.youthTraining.status,"completed");
 assert(youth.normalizeYouthTraining(morning.youthTraining.checkpoint));
 assert.deepEqual(morning.youthTraining.receipts.map(r=>r.id),youth.YOUTH_MILESTONES);
 assert.equal(new Set(morning.youthTraining.receipts.map(r=>r.tick)).size,6);
 assert.deepEqual(morning.youthTraining.equipment,{wristblade:true,biomask:true,accent:"rust"});
 assert.deepEqual(morning.inventory,original.inventory,"Training does not mint unrelated adult inventory");
 assert.deepEqual(morning.loadout,original.loadout);
 assert.equal(morning.profile.rankId,original.profile.rankId,"Training never grants Blooded");
 assert.equal(morning.profile.honor,original.profile.honor);
 assert.equal(morning.prologue.chronicle.evidence.filter(e=>e.id==="training-completed").length,1);
 for(const entry of trainingEvidence){
  const passedDojo=youth.YOUTH_PHASES.indexOf(entry.phase)>=youth.YOUTH_PHASES.indexOf("blade-award");
  if(!passedDojo)assert.equal(entry.receipts.length,0,"No equipment or completion before physical dojo exercises");
 }
 checks.push({name:"full-physical-youth-route",realKeyboard:true,stateInjection:false,iterations,phases:[...visited],milestones:6});
 await page.getByRole("button",{name:"Revenir dans la cité au matin",exact:true}).click();await page.clock.runFor(200);await hub.waitFor();
 await page.clock.resume();await page.reload({waitUntil:"networkidle"});await page.getByRole("button",{name:/^Continuer/}).click();await hub.waitFor();
 checks.push({name:"morning-durable-and-return-to-city",completedTrainingPersists:true});
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(200);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
 await fs.writeFile(path.join(output,"report.json"),JSON.stringify({passed:true,base,checks,routeEvidence,trainingEvidence,errors,failures,limitation:"Simulated player; real keyboard movement and controlled browser clock. Initial archive was exported from a genuine nursery victory."},null,2));console.log(JSON.stringify({passed:true,checks:checks.length,errors,failures}));
} catch(error) {
 await page.screenshot({path:path.join(output,"failure.png"),fullPage:true}).catch(()=>{});await fs.writeFile(path.join(output,"report.json"),JSON.stringify({passed:false,base,checks,routeEvidence,trainingEvidence,errors,failures,error:String(error)},null,2));throw error;
} finally {await browser.close();}
