import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { build } from "esbuild";
import { chromium } from "playwright-core";
import { campaignFixture, enterCampaignDeck } from "./campaign-browser-helpers.mjs";
import { choosePitFighter, choosePitStage } from "./pit-selection-browser-helpers.mjs";
const url=process.env.V49_FIXED_QA_URL||"http://127.0.0.1:4174";
const output=process.env.V49_FIXED_QA_OUTPUT||"outputs/qa-commercial-audit/v49/fixed-ahab-browser-qa";
const variant="ahab-avec-casque-0c8ceb1c95";
await fs.mkdir(output,{recursive:true});
let browser,page;const errors=[],responses=[],checks=[];
try {
 const bundle=await build({stdin:{contents:'export {getPitCombatBitmapVisualBounds} from "./app/game/pitCombatBitmapArt"; export {PIT_ARENAS,createPitCombatState} from "./app/game/systems/pitCombat";',resolveDir:process.cwd(),loader:"ts"},bundle:true,write:false,platform:"node",format:"esm",logLevel:"silent"});
 const api=await import("data:text/javascript;base64,"+Buffer.from(bundle.outputFiles[0].text).toString("base64"));
 browser=await chromium.launch({channel:"chrome",headless:true});
 page=await browser.newPage({viewport:{width:1280,height:720},reducedMotion:"reduce"});page.setDefaultTimeout(45000);
 page.on("pageerror",e=>errors.push(e.message.slice(0,500)));page.on("response",r=>{if(r.status()>=400)responses.push({url:r.url(),status:r.status()});});
 const fixture=structuredClone(await campaignFixture());await page.addInitScript(({key,save})=>localStorage.setItem(key,JSON.stringify(save)),fixture);
 await enterCampaignDeck(page,{url});await page.getByRole("button",{name:"THE PIT · combat",exact:true}).click();
 await page.getByRole("radio",{name:/^Versus local/}).click();
 await choosePitFighter(page,"user-ahab");await page.locator('[data-pit-variant-select]').selectOption(variant);
 await page.locator('[data-pit-selection-confirm]').click();await choosePitFighter(page,"city-hunter");await page.locator('[data-pit-selection-confirm]').click();
 await choosePitStage(page,"the-pit");await page.waitForFunction(()=>document.querySelector('[data-pit-stage-preview]')?.dataset.previewStatus==='ready');await page.locator('[data-pit-selection-confirm]').click();
 await page.locator('[data-pit-match-loading]').waitFor({state:'detached'});
 await page.waitForFunction(()=>document.activeElement?.getAttribute('aria-label')==='Combat THE PIT'&&Number(document.querySelector('[data-pit-frame]')?.dataset.pitFrame)>3);
 assert.equal(await page.locator('[data-pit-bitmap-slot="0"]').getAttribute('data-pit-bitmap-variant'),variant);
 const snapshot=()=>page.locator('canvas[data-pit-camera-mode]').evaluate(c=>({mode:c.dataset.pitCameraMode,zoom:Number(c.dataset.pitCameraZoom),x:Number(c.dataset.pitCameraCenterX),y:Number(c.dataset.pitCameraCenterY),arenaId:c.dataset.pitArenaId,width:c.width,height:c.height,fighters:JSON.parse(c.dataset.pitFighterPositions)}));
 const initial=await snapshot();assert.equal(initial.mode,'fixed');
 const appearance=api.createPitCombatState('user-ahab','city-hunter').fighters[0];appearance.variantId=variant;
 function contained(snap){assert.deepEqual([snap.mode,snap.zoom,snap.x,snap.y],[initial.mode,initial.zoom,initial.x,initial.y]);return [-1,1].map(facing=>{const b=api.getPitCombatBitmapVisualBounds({...appearance,...snap.fighters[0],facing},api.PIT_ARENAS[snap.arenaId].groundY);assert(b);const screen={left:(b.x-snap.x)*snap.zoom+snap.width/2,right:(b.x+b.width-snap.x)*snap.zoom+snap.width/2,top:(b.y-snap.y)*snap.zoom+snap.height/2,bottom:(b.y+b.height-snap.y)*snap.zoom+snap.height/2};assert(screen.left>=-.1&&screen.right<=snap.width+.1&&screen.top>=-.1&&screen.bottom<=snap.height+.1,JSON.stringify({facing,snap,screen}));return {facing,screen};});}
 const waitX=(limit,direction)=>page.waitForFunction(({limit,direction})=>{const x=JSON.parse(document.querySelector('canvas[data-pit-fighter-positions]').dataset.pitFighterPositions)[0].x;return direction==='left'?x<=limit:x>=limit;},{limit,direction});
 async function jump(label){await page.keyboard.down('Space');try{await page.waitForFunction(()=>JSON.parse(document.querySelector('canvas[data-pit-fighter-positions]').dataset.pitFighterPositions)[0].y>=65);const snap=await snapshot();const bounds=contained(snap);await page.screenshot({path:output+'/'+label+'.png'});checks.push({name:label,snapshot:snap,bounds});}finally{await page.keyboard.up('Space');}await page.waitForFunction(()=>JSON.parse(document.querySelector('canvas[data-pit-fighter-positions]').dataset.pitFighterPositions)[0].y===0);}
 await page.keyboard.down('ArrowLeft');try{await waitX(90,'left');await page.waitForTimeout(300);}finally{await page.keyboard.up('ArrowLeft');}
 const left=await snapshot();const leftBounds=contained(left);await page.screenshot({path:output+'/left-wall.png'});checks.push({name:'left-wall',snapshot:left,bounds:leftBounds});await jump('left-wall-jump');
 // Both players use real controls: J2 crouch-walks left while Ahab jumps right.
 // Ahab's air speed cannot clear a stationary 80-unit crouch during one jump.
 await page.keyboard.down('ArrowRight');
 try {await page.waitForFunction(()=>{const p=JSON.parse(document.querySelector('canvas[data-pit-fighter-positions]').dataset.pitFighterPositions);return p[1].x-p[0].x<70;});await page.keyboard.down('Numpad2');await page.keyboard.down('Numpad4');await page.waitForTimeout(60);await page.keyboard.down('Space');await page.waitForFunction(()=>{const p=JSON.parse(document.querySelector('canvas[data-pit-fighter-positions]').dataset.pitFighterPositions);return p[0].x>p[1].x+45;});await page.keyboard.up('Space');await page.keyboard.up('Numpad2');await page.keyboard.up('Numpad4');await waitX(870,'right');await page.waitForTimeout(300);}finally{await page.keyboard.up('ArrowRight');await page.keyboard.up('Space');await page.keyboard.up('Numpad2');await page.keyboard.up('Numpad4');}
 const right=await snapshot();const rightBounds=contained(right);await page.screenshot({path:output+'/right-wall.png'});checks.push({name:'right-wall',snapshot:right,bounds:rightBounds});await jump('right-wall-jump');
 assert.deepEqual(errors,[]);assert.deepEqual(responses,[]);
 const report={passed:true,checkedAt:new Date().toISOString(),url,variant,checks,errors,responses,limits:['Positions and camera read from the real canvas DOM; alpha envelopes calculated read-only from the exact committed atlas metadata. No combat state or clock injection.','Keyboard movement and system reduced-motion emulation; visual screenshots must also be reviewed.']};await fs.writeFile(output+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:true,checks:checks.length,zoom:initial.zoom,output}));
}catch(error){if(page)await page.screenshot({path:output+'/failure.png'}).catch(()=>{});await fs.writeFile(output+'/failure.json',JSON.stringify({error:String(error).slice(0,2000),checks,errors,responses},null,2));console.error(String(error).slice(0,500));process.exitCode=1;}
finally{await browser?.close();}
