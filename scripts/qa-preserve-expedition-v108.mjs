/** Local browser recipe. Fixtures are explicit; movement, jumps and interaction
 * go through the real mounted game. Existing browser profiles are never used. */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { build } from "esbuild";
import { chromium } from "playwright-core";
import { campaignFixture, enterCampaignDeck } from "./campaign-browser-helpers.mjs";

const baseUrl = process.env.YAUTJA_QA_BASE_URL ?? "http://127.0.0.1:3101";
assert(["127.0.0.1", "localhost"].includes(new URL(baseUrl).hostname));
const output = path.resolve(process.env.YAUTJA_PRESERVE_V108_OUTPUT ?? "outputs/qa-preserve-v108/production");
const reserveKey = "yautja-main-menu-bonus.v81.reserve";
await fs.mkdir(output, { recursive: true });
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const sourcePaths = ["app/game/systems/gameReserveV66.ts", "app/game/systems/gameReserveLookoutV104.ts", "app/game/systems/gameReserveExpeditionV107.ts", "app/game/systems/gameReserveExpeditionV108.ts", "app/game/GameClient.tsx", "app/game/ClanChroniclePanel.tsx", "app/game/save.ts", "scripts/qa-preserve-expedition-v108.mjs", "app/game/systems/gameReserveTacticalV98.ts", "app/game/GameReserveV66.tsx", "app/game/GameReserveEntryV66.tsx", "app/game/GameReserveEntryV104.module.css", "app/game/GameReserveV66.module.css", "app/game/GameReserveTacticalV98.tsx", "app/game/gameReserveV66Rendering.ts", "app/game/MainMenuBonusModesV81.tsx"];
sourcePaths.push('public/game/assets/v2/environments/jungle/layers/far-lake.webp','public/game/props/v4/root-platform.png','public/game/props/v4/expedition-platform.png','public/game/props/v4/foreground-ferns.png','public/game/ship-interior/v21/wall-machinery.webp','public/game/sprites/hunter.webp','public/game/ships/v14/game-preserve-ship.webp','public/game/sprites/v7/enemies/humanoid-badblood/frontier-raider-sheet.png','public/game/sprites/v7/enemies/humanoid-badblood/colonial-marine-sheet.png','public/game/sprites/v7/enemies/humanoid-badblood/colonial-sniper-sheet.png');
const snapshot = () => Promise.all(sourcePaths.map(async file => ({ file, sha256: sha(await fs.readFile(file)) })));
const expectedBuildId = process.env.YAUTJA_QA_BUILD_ID, runtimeCommit = process.env.YAUTJA_QA_RUNTIME_COMMIT;
assert(expectedBuildId && /^[0-9a-f]{40}$/.test(runtimeCommit ?? ""), "Compiled build identity and runtime commit required");
const servedBuilds = [];
const sourceBefore = await snapshot();
const compiled = await build({ stdin: { contents: "import * as reserve from './app/game/systems/gameReserveV66'; window.__preserveExpeditionQaV108=reserve;", loader: "ts", resolveDir: process.cwd() }, bundle: true, write: false, format: "iife", platform: "browser", target: "es2022", logLevel: "silent" });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH ?? "/usr/bin/chromium", headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage", "--mute-audio"] });
const contexts = [], checks = [], captures = [], fixtures = [], route = [], errors = [];
const check = (name, result) => { assert(result, name); checks.push({ name, status: "PASS" }); console.log(JSON.stringify({ check: name, status: "PASS" })); };
const canvas = page => page.locator("canvas[data-reserve-tick]");
const view = page => canvas(page).evaluate(node => ({ ...node.dataset }));
const disk = page => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? "null")?.state, reserveKey);
const diskRaw = page => page.evaluate(key => localStorage.getItem(key), reserveKey);
const createPage = async ({ clock = false, mobile = false } = {}) => {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, reducedMotion: "reduce" });
  contexts.push(context);
  const page = await context.newPage(); page.setDefaultTimeout(30000);
  if (clock) await page.clock.install();
  page.on("pageerror", error => errors.push({ url: page.url(), message: error.message }));
  return page;
};
const capture = async (page, file, locator = page) => {
  await locator.screenshot({ path: path.join(output, file) });
  captures.push({ file, sha256: sha(await fs.readFile(path.join(output, file))), bytes: (await fs.stat(path.join(output, file))).size, viewport: page.viewportSize() });
};
async function title(page) {
  const response = await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
  const html = await page.content();
  servedBuilds.push({ url: page.url(), status: response?.status() ?? null, expectedBuildId, foundInHtml: html.includes(expectedBuildId), htmlSha256: sha(html) });
  assert.equal(response?.status(), 200); assert(html.includes(expectedBuildId), "The served HTML identifies the frozen compiled build");
  await page.locator('[data-campaign-menu="main"]').waitFor();
}
async function entry(page, protectedProfile = false) {
  await title(page);
  await page.locator('[data-main-menu-mode="game-reserve"]').click();
  await page.getByRole("button", { name: "Accéder malgré les spoilers", exact: true }).click();
  await page.locator('[data-main-menu-bonus-entry="game-reserve"]').waitFor();
  if (!protectedProfile) await page.locator("[data-bonus-start]:not(:disabled)").waitFor();
}
async function mounted(page) {
  await page.locator("[data-bonus-start]").click();
  await page.waitForFunction(() => document.querySelector("canvas[data-reserve-assets]")?.getAttribute("data-reserve-assets") === "true");
}
async function seed(page, kind) {
  await title(page); await page.addScriptTag({ content: compiled.outputFiles[0].text });
  const receipt = await page.evaluate(({ key, kind }) => {
    const api = window.__preserveExpeditionQaV108;
    const state = kind === "legacy" ? api.createGameReserveV66(108) : kind === "legacy-v2" ? api.createGameReserveV104(108) : kind === "legacy-v3" ? api.createGameReserveV107(108) : api.createGameReserveV108(108);
    if (kind === "quiet") for (const human of state.humans) { human.hp = 0; human.status = "down"; human.downAt = 0; human.moving = false; }
    if (kind !== "future" && !api.normalizeGameReserveV66(state)) throw Error("QA fixture rejected by the runtime normalizer");
    if (kind === "future") state.version = 5;
    localStorage.setItem(key, JSON.stringify({ version: 1, state }));
    return { kind, version: state.version, reserveId: state.reserveId, start: state.player, visited: state.visited, humansAlreadyDown: state.humans.filter(h => h.status === "down").length };
  }, { key: reserveKey, kind });
  fixtures.push(receipt);
}
async function walk(page, target) {
  let data = await view(page);
  const direction = target > Number(data.reserveX) ? 1 : -1, key = direction > 0 ? "ArrowRight" : "ArrowLeft";
  await canvas(page).focus(); await page.keyboard.down(key);
  // Each180ms slice advances at most about40world units. Size the finite
  // input budget for a complete reserve return instead of inheriting V107's cap.
  const budget = Math.ceil(Math.abs(target - Number(data.reserveX)) / 30) + 20;
  for (let count = 0; count < budget && (target - Number(data.reserveX)) * direction > 0; count++) {
    const remaining = Math.abs(target - Number(data.reserveX));
    await page.clock.runFor(Math.min(180, Math.max(17, Math.floor((remaining - 1) / 3.8) * 1000 / 60)));
    data = await view(page); route.push({ tick: Number(data.reserveTick), x: Number(data.reserveX), y: Number(data.reserveY), sector: data.reserveSector, input: direction > 0 ? "right" : "left" });
    assert.equal(data.reserveStatus, "active", "the geometry fixture remains active during real movement");
  }
  await page.keyboard.up(key); await page.clock.runFor(32);
  // A17ms clock slice can straddle two60Hz frames. Correct its small endpoint
  // overshoot with real opposite input; never assign the player's coordinates.
  for (let correction = 0; correction < 6; correction++) {
    data = await view(page);
    if (Math.abs(Number(data.reserveX) - target) < 5) break;
    const correctionKey = target > Number(data.reserveX) ? "ArrowRight" : "ArrowLeft";
    await page.keyboard.down(correctionKey); await page.clock.runFor(17); await page.keyboard.up(correctionKey); await page.clock.runFor(32);
    data = await view(page); route.push({ tick: Number(data.reserveTick), x: Number(data.reserveX), y: Number(data.reserveY), sector: data.reserveSector, input: correctionKey === "ArrowRight" ? "correct-right" : "correct-left" });
  }
  assert(Math.abs(Number((await view(page)).reserveX) - target) < 5, `physical walk reaches ${target}`);
}
async function jump(page, landingY, move = false) {
  await canvas(page).focus();
  if (move) await page.keyboard.down("ArrowRight");
  await page.keyboard.down("Space"); await page.clock.runFor(32); await page.keyboard.up("Space");
  let data = await view(page), landed = false;
  for (let count = 0; count < 90; count++) {
    await page.clock.runFor(17); data = await view(page);
    route.push({ tick: Number(data.reserveTick), x: Number(data.reserveX), y: Number(data.reserveY), sector: data.reserveSector, input: move ? "jump-right" : "jump" });
    if (Number(data.reserveY) === landingY && Number(data.reserveVy) === 0) { landed = true; break; }
  }
  if (move) await page.keyboard.up("ArrowRight");
  await page.clock.runFor(32);
  assert(landed, `the real jump lands on the ${landingY}-unit branch`);
}
const startClocked = async page => {
  await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now() + 100)));
  await page.getByRole('button', { name: 'Commencer l’expédition', exact: true }).click({ force: true });
  await page.clock.runFor(160);
};
const hold = async (page, key, duration) => { await canvas(page).focus(); await page.keyboard.down(key); await page.clock.runFor(duration); await page.keyboard.up(key); await page.clock.runFor(64); };
const survey = async (page, count, filename) => { await hold(page,'KeyE',2200);check(`Physical site ${count} completes its own exposed channel`,(await view(page)).reserveRouteRecorded===String(count));await capture(page,filename); };
const behavioralSamples = [], behaviorKinds = new Set();
let surveyed, returned, combatOutcome;
try {
  const ordinary = await createPage(); await entry(ordinary);
  check('The ordinary free-menu defaults to historical V1',await ordinary.locator('[data-reserve-expedition-choice]').inputValue()==='1');
  await ordinary.locator('[data-reserve-expedition-choice]').selectOption('4');await capture(ordinary,'choice-v4-desktop.png');await mounted(ordinary);
  const ordinaryStart=await disk(ordinary);
  check('Explicit V4 starts Avar’Kesh with sixteen living adults, four aircraft and no replaced Vharuun identity',ordinaryStart.version===4&&ordinaryStart.reserveId==='kesh-watch-expedition'&&ordinaryStart.humans.every(h=>h.status==='active'&&h.hp===70)&&ordinaryStart.ships.length===4&&(await view(ordinary)).reserveWorldWidth==='12800');
  await ordinary.getByRole('button',{name:'Commencer l’expédition',exact:true}).click();await ordinary.waitForFunction(()=>Number(document.querySelector('canvas[data-reserve-tick]')?.dataset.reserveTick)>=2);await canvas(ordinary).focus();await ordinary.keyboard.down('ArrowRight');await ordinary.waitForTimeout(400);await ordinary.keyboard.up('ArrowRight');check('Normal keyboard moves the living V4 actor',Number((await view(ordinary)).reserveX)>125);
  await ordinary.setViewportSize({width:844,height:390});await ordinary.getByRole('button',{name:'Tactile',exact:true}).click();const touch=ordinary.locator('[data-reserve-action="right"]'),bounds=await touch.boundingBox();assert(bounds);const beforeTouch=Number((await view(ordinary)).reserveX);await ordinary.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2);await ordinary.mouse.down();await ordinary.waitForTimeout(400);await ordinary.mouse.up();check('Actual touch-pointer input moves V4',Number((await view(ordinary)).reserveX)>beforeTouch+10);check('All eight touch controls fit landscape with44px targets',await ordinary.locator('[data-reserve-action]').evaluateAll(nodes=>nodes.length===8&&nodes.every(node=>{const r=node.getBoundingClientRect();return r.width>=44&&r.height>=44&&r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight;})));await capture(ordinary,'living-v4-landscape-touch.png');await ordinary.getByRole('button',{name:'Pause',exact:true}).click();await ordinary.getByRole('button',{name:'Sauvegarder et revenir au dossier',exact:true}).click();check('Played V4 leaves a durable independent free checkpoint',(await disk(ordinary)).version===4&&await ordinary.locator('[data-main-menu-bonus-entry="game-reserve"]').count()===1);

  for(const kind of['legacy','legacy-v2','legacy-v3']){const legacy=await createPage();await seed(legacy,kind);await entry(legacy);const previous=await diskRaw(legacy),version=(await disk(legacy)).version;await legacy.getByRole('button',{name:'Nouvelle expédition libre…',exact:true}).click();await legacy.locator('[data-reserve-expedition-choice]').selectOption('4');await legacy.getByRole('button',{name:'Conserver l’expédition',exact:true}).click();check(`Cancelling V4 replacement preserves V${version} bytes`,await diskRaw(legacy)===previous);await mounted(legacy);check(`V${version} resumes its original identity`,(await view(legacy)).reserveVersion===String(version));if(version===3)await capture(legacy,'legacy-v3-preserved.png');}

  const campaign=await createPage(),campaignSeed=await campaignFixture();fixtures.push({kind:'legacy-adult-campaign-entry',description:'Isolated adult campaign fixture; no rite played by this recipe',owner:campaignSeed.save.createdAt});await enterCampaignDeck(campaign,{url:baseUrl});await campaign.getByRole('button',{name:'Dossier de campagne',exact:true}).click();await campaign.getByRole('button',{name:'Mondes et réserves',exact:true}).click();await campaign.locator('[data-reserve-expedition-choice]').selectOption('4');await campaign.locator('[data-game-reserve-start]').click();await campaign.waitForFunction(()=>document.querySelector('[data-game-reserve-campaign] canvas')?.getAttribute('data-reserve-assets')==='true');const campaignState=await campaign.evaluate(key=>JSON.parse(localStorage.getItem(key)),campaignSeed.key);check('The real campaign callback creates V4 without changing campaign ownership',campaignState.gameReserveV66.version===4&&campaignState.gameReserveV66.reserveId==='kesh-watch-expedition'&&campaignState.createdAt===campaignSeed.save.createdAt);check('Campaign entry leaves the independent free profile absent',await diskRaw(campaign)===null);await capture(campaign,'campaign-v4-entry.png',campaign.getByRole('dialog'));

  const protectedPage=await createPage();await seed(protectedPage,'future');const futureRaw=await diskRaw(protectedPage);await entry(protectedPage,true);check('Future V5 remains protected against V4 replacement',await protectedPage.locator('[data-bonus-start]').isDisabled()&&await diskRaw(protectedPage)===futureRaw);

  const living=await createPage({clock:true});await seed(living,'living-initial');await entry(living);await mounted(living);await startClocked(living);await living.addScriptTag({content:compiled.outputFiles[0].text});
  for(let sample=0;sample<55;sample++){await living.clock.runFor(1000);const receipt=await living.evaluate(key=>{const state=JSON.parse(localStorage.getItem(key)).state;const api=window.__preserveExpeditionQaV108;return{tick:state.tick,total:api.gameReserveV66MaterialTotal(state),humans:state.humans.map(h=>({id:h.id,x:h.x,status:h.status,carrying:h.carrying})),ships:state.ships.map(ship=>({parts:ship.parts,repair:ship.repair,launch:ship.launch,departedAt:ship.departedAt})),assignments:state.humans.flatMap((h,index)=>{const a=api.gameReserveV108Behavior(state,index);return a?[{id:h.id,x:h.x,...a}]:[]})};},reserveKey);behavioralSamples.push(receipt);receipt.assignments.forEach(a=>behaviorKinds.add(a.kind));assert.equal(receipt.total,32);}
  check('All three different work behaviors run in the actual living compiled V4',behaviorKinds.size===3);check('The living simulation physically carries and repairs at all four ramps',behavioralSamples.some(s=>s.humans.some(h=>h.carrying))&&behavioralSamples.at(-1).ships.every(ship=>ship.parts>=3&&ship.repair>0));check('Living V4 conserves all32 material lots',behavioralSamples.every(s=>s.total===32));await living.getByRole('button',{name:'Pause',exact:true}).click({force:true});await living.clock.runFor(96);await capture(living,'living-v4-physical-logistics.png',living.getByRole('dialog'));

  const combat=await createPage({clock:true});await seed(combat,'living-initial');await entry(combat);await mounted(combat);await startClocked(combat);await walk(combat,600);await hold(combat,'KeyJ',32);await combat.clock.runFor(500);await hold(combat,'KeyJ',32);check('Two actual melee inputs down one initially healthy adult without a combat fixture override',Number((await view(combat)).reserveDownCount)===1&&Number((await view(combat)).reserveHealth)>0);await walk(combat,650);await hold(combat,'KeyE',3200);check('A played exposed trophy channel secures that adult',(await view(combat)).reserveSecured==='1');await combat.getByRole('button',{name:'Pause',exact:true}).click({force:true});await combat.clock.runFor(96);combatOutcome=await disk(combat);check('The persisted combat outcome retains one secured adult and fifteen living or escaped adults',combatOutcome.humans.filter(h=>h.status==='down'&&h.secured).length===1&&combatOutcome.humans.filter(h=>h.status==='down').length===1);await capture(combat,'played-v4-one-adult-secured.png',combat.getByRole('dialog'));

  const played=await createPage({clock:true});await seed(played,'quiet');await entry(played);await mounted(played);await startClocked(played);
  await walk(played,1700);await jump(played,360);await walk(played,1900);await jump(played,286,true);await walk(played,2275);await jump(played,220,true);await walk(played,2550);await canvas(played).focus();await played.keyboard.down('KeyE');await played.clock.runFor(1000);check('The first high survey remains unfinished after one second',(await view(played)).reserveChannel==='survey'&&Number((await view(played)).reserveChannelTicks)>20&&(await view(played)).reserveRouteRecorded==='0');await capture(played,'canopy-channel-in-progress.png');await played.clock.runFor(1200);await played.keyboard.up('KeyE');await played.clock.runFor(64);check('The first high post is recorded on its220-unit branch',(await view(played)).reserveRouteRecorded==='1'&&Number((await view(played)).reserveY)===220);await capture(played,'canopy-recorded.png');
  await walk(played,4910);await jump(played,365);await walk(played,5125);await jump(played,295,true);await walk(played,5500);await jump(played,230,true);await walk(played,5790);await survey(played,2,'foundry-recorded.png');
  await walk(played,8140);await jump(played,365);await walk(played,8330);await jump(played,290,true);await walk(played,8735);await jump(played,225,true);await walk(played,9010);await survey(played,3,'array-recorded.png');
  await walk(played,9735);await jump(played,370);await walk(played,10015);await jump(played,305,true);await walk(played,10435);await jump(played,350,true);check('The seventh sector has a separate physical root-vault route',(await view(played)).reserveSector==='kesh-root-vault'&&Number((await view(played)).reserveY)===350);await capture(played,'root-vault-physical-route.png');
  await walk(played,12040);await jump(played,355);await walk(played,12245);await jump(played,280,true);await walk(played,12480);await survey(played,4,'ash-landing-recorded.png');check('Eight new sectors are visited physically before the last high record',new Set(route.filter(s=>s.sector.startsWith('kesh-')).map(s=>s.sector)).size===8);
  await played.getByRole('button',{name:'Ouvrir le carnet de traque et suspendre la chasse',exact:true}).click({force:true});await played.clock.runFor(96);surveyed=await disk(played);const surveyedRaw=await diskRaw(played),pausedTick=(await view(played)).reserveTick;check('The notebook records four exact post positions and eight visited sectors',surveyed.routeV108.siteRecords.every(site=>site.recordedAt!==null)&&JSON.stringify(surveyed.visited)==='[0,1,2,3,4,5,6,7]');await played.clock.runFor(600);check('Notebook reading pauses simulation and preserves durable bytes',(await view(played)).reserveTick===pausedTick&&await diskRaw(played)===surveyedRaw);await capture(played,'route-notebook-desktop.png',played.getByRole('dialog'));
  await played.evaluate(key=>{window.__preserveOriginalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===key)throw new DOMException('QA quota','QuotaExceededError');return window.__preserveOriginalSetItem.call(this,k,v);};},reserveKey);await played.getByRole('button',{name:'Reprendre la chasse',exact:true}).click({force:true});await played.clock.runFor(96);check('A real rejected storage write blocks resume and preserves V4 bytes',(await view(played)).reservePaused==='true'&&await diskRaw(played)===surveyedRaw);await played.evaluate(()=>{Storage.prototype.setItem=window.__preserveOriginalSetItem;delete window.__preserveOriginalSetItem;});await played.getByRole('button',{name:'Réessayer la sauvegarde et reprendre',exact:true}).click({force:true});await played.clock.runFor(96);check('Retry resumes the same physical location with all four V4 records',(await view(played)).reservePaused==='false'&&(await view(played)).reserveRouteRecorded==='4'&&Math.abs(Number((await view(played)).reserveX)-surveyed.player.x)<2);
  await played.getByRole('button',{name:'Ouvrir le carnet de traque et suspendre la chasse',exact:true}).click({force:true});await played.clock.runFor(96);await played.setViewportSize({width:390,height:844});await played.clock.runFor(96);await played.locator('[data-reserve-notebook] h2').scrollIntoViewIfNeeded();check('The eight-sector V4 notebook fits a390px viewport',await played.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)&&await played.locator('[data-reserve-route-site]').count()===4);await capture(played,'route-notebook-mobile.png');
  await played.clock.resume();await entry(played);await mounted(played);check('Reload restores the separate reserve and its four exact observations',(await disk(played)).version===4&&JSON.stringify((await disk(played)).routeV108)===JSON.stringify(surveyed.routeV108)&&Number((await view(played)).reserveX)===Math.round(surveyed.player.x));await played.setViewportSize({width:1440,height:1000});await played.clock.pauseAt(new Date(await played.evaluate(()=>Date.now()+100)));await played.getByRole('button',{name:'Reprendre la chasse',exact:true}).click({force:true});await played.clock.runFor(160);await walk(played,115);await hold(played,'KeyE',1200);returned=await disk(played);check('All four observations return physically through the final extraction channel',returned.status==='returned'&&Math.abs(returned.player.x-115)<5&&JSON.stringify(returned.routeV108)===JSON.stringify(surveyed.routeV108));check('The route fixture does not falsely award an interception or campaign inventory',returned.ships.every(ship=>!ship.interception)&&!Object.hasOwn(returned,'inventory')&&!Object.hasOwn(returned,'rankId')&&!Object.hasOwn(returned,'honor'));await played.locator('[data-reserve-notebook-summary]').click({force:true});await played.clock.runFor(64);check('The terminal notebook separates reported observations from the unachieved interception',(await played.locator('[data-reserve-route-v108]').innerText()).includes('4/4 relevés rapportés')&&(await played.locator('[data-reserve-interception-v108]').innerText()).includes('Aucun départ interrompu'));await capture(played,'survey-returned-outcome.png',played.getByRole('dialog'));
  check('No JavaScript error occurred in the isolated V4 journeys',errors.length===0);const sourceAfter=await snapshot();check('Preserve sources and driver remained unchanged during the entire compiled recipe',JSON.stringify(sourceBefore)===JSON.stringify(sourceAfter));
  const report={status:'PASS',mode:'compiled-app',runtimeCommit,buildId:expectedBuildId,baseUrl,servedBuilds,production:{mode:'compiled-app',runtimeCommit,buildId:expectedBuildId,browserErrors:errors.length,checksPassed:checks.length,checksFailed:0,servedBuilds},checks,fixtures,captures,route,behavioralSamples,errors,sourceBefore,sourceAfter,outcomes:{surveyed,returned,combatOutcome},scope:'Actual local compiled entry with16healthy original adults; keyboard/touch,all3workbehaviors,real melee on1adult and exposed trophy channel,persistence,pause,reload,refusal/retry. Geometry/four-post/physical-return route uses an explicitly declared fixture with16adults already down; it certifies terrain and channels,not a full combat victory or interception. Shared native art,noH001–H100 images,new hunter animations,canonical geography,campaign rewards,all80sectors or deployment claimed.'};await fs.writeFile(path.join(output,'result.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:'PASS',checks:checks.length,captures:captures.length,output}));
} catch(error){await fs.writeFile(path.join(output,'failure.json'),JSON.stringify({status:'FAIL',mode:'compiled-app',runtimeCommit,buildId:expectedBuildId,error:error.stack,checks,fixtures,captures,route,behavioralSamples,errors,sourceBefore},null,2)+'\n');throw error;}finally{await Promise.allSettled(contexts.map(context=>context.close()));await browser.close();}
