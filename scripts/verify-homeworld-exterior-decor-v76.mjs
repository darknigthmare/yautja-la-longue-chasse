import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {chromium} from 'playwright-core';
import {homeworldQaModelV64} from './homeworld-qa-model-v64.mjs';
import {homeworldNavigatorV66} from './homeworld-navigation-browser-v66.mjs';
import {firstTracksCompleted,p} from '../tests/helpers/solo-v67-campaign-route.mjs';
const url=(process.env.V76_EXTERIOR_QA_URL??'http://127.0.0.1:4192').replace(/\/$/,''),
  output=process.env.V76_EXTERIOR_QA_OUTPUT??'work-local/v76/qa/exterior-local';
const naturalDevHydration=process.env.V76_QA_NATURAL_HYDRATION==='1';
await fs.mkdir(output,{recursive:true});
const api=homeworldQaModelV64(process.cwd(),['homeworldCity.ts','homeworldGeometryV64.ts','homeworldExteriorDecorV76.ts',
  'homeworldSpatialCodex.ts','homeworldLifeV69.ts']);
const browser=await chromium.launch({channel:'chrome',headless:true}),context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
const checks=[],captures=[],errors=[],failures=[],routes=[],serialization=[],observations=[];
page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failures.push({url:r.url(),status:r.status()});});
const capture=async name=>{const file=output+'/'+name+'.jpg';await page.screenshot({path:file,type:'jpeg',quality:92});captures.push(file);};
// Blink serializes CSSNumericLiteralValue with %.6g, not the full double from
// React's inline style. Only half the last significant decimal is permitted.
// Primary implementation: chromium/chromium css_numeric_literal_value.cc,
// FormatNumber(). This is .005px at top=2000 and .0005px at width=200.
function assertCssNumber(node,field,expected,scale){
  const quantum=expected===0?0:10**(Math.floor(Math.log10(Math.abs(expected)))-5);
  const tolerance=(Number.isInteger(expected)?0:quantum/2)+Math.max(1e-7,Math.abs(expected)*Number.EPSILON*8);
  const actual=node[field],delta=Math.abs(actual-expected);
  serialization.push({id:node.id,field,actual,expected,scale,delta,tolerance});
  assert(Number.isFinite(actual)&&delta<=tolerance,
    `${node.id} ${field}: actual=${actual}; expected=${expected}; s=${scale}; delta=${delta}; CSS6gBudget=${tolerance}`);
}
async function inspect(name,requiredId){
  await page.locator('[data-homeworld-hub] img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
  const data=await page.locator('[data-homeworld-prop-id^="exterior-v76-"]').evaluateAll(nodes=>nodes.map(node=>({
    id:node.dataset.homeworldPropId,artId:node.dataset.homeworldArtId,sourceRect:node.dataset.nativeSourceRect,
    src:node.querySelector('img').getAttribute('src'),width:parseFloat(node.style.width),height:parseFloat(node.style.height),
    left:parseFloat(node.style.left),top:parseFloat(node.style.top),imageWidth:parseFloat(node.querySelector('img').style.width),
    imageHeight:parseFloat(node.querySelector('img').style.height),
    zIndex:Number(getComputedStyle(node).zIndex),opacity:Number(getComputedStyle(node).opacity),
    transform:getComputedStyle(node).transform,imageTransform:getComputedStyle(node.querySelector('img')).transform,
    loaded:node.querySelector('img').complete&&node.querySelector('img').naturalWidth>0})));
  assert(data.length>0&&data.length<api.HOMEWORLD_EXTERIOR_MODULES_V76.length,'individual native objects are camera-culled');
  assert(data.some(node=>node.id===requiredId),'selected functional fixture appears in actual camera');
  const selected=api.HOMEWORLD_EXTERIOR_MODULES_V76.find(item=>item.id===requiredId),selectedArt=api.HOMEWORLD_EXTERIOR_ART_V76[selected.artId];
  const paint=await page.locator('[data-homeworld-prop-id="'+requiredId+'"]').evaluate((node,art)=>{
    const box=node.getBoundingClientRect(),viewport=document.querySelector('[data-homeworld-viewport]').getBoundingClientRect();
    const sx=box.width/art.sourceRect.width,sy=box.height/art.sourceRect.height;
    const painted={left:box.left+art.alphaBounds.x*sx,top:box.top+art.alphaBounds.y*sy,
      right:box.left+(art.alphaBounds.x+art.alphaBounds.width)*sx,bottom:box.top+(art.alphaBounds.y+art.alphaBounds.height)*sy};
    return{painted,viewport:{left:viewport.left,right:viewport.right,top:viewport.top,bottom:viewport.bottom},
      visibleWidth:Math.max(0,Math.min(painted.right,viewport.right)-Math.max(painted.left,viewport.left)),
      visibleHeight:Math.max(0,Math.min(painted.bottom,viewport.bottom)-Math.max(painted.top,viewport.top)),
      opacity:Number(getComputedStyle(node).opacity),imageVisible:node.querySelector('img').checkVisibility()};
  },selectedArt);
  assert(paint.imageVisible&&paint.opacity>=.2&&paint.visibleWidth>=16&&paint.visibleHeight>=16,
    requiredId+' native painted silhouette must occupy the actual visible camera, not only a mounted transparent source rectangle');
  for(const node of data){const item=api.HOMEWORLD_EXTERIOR_MODULES_V76.find(item=>item.id===node.id);assert(item);
    const art=api.HOMEWORLD_EXTERIOR_ART_V76[item.artId],scale=art.scaleWorldPerPixel*item.scale;
    assert.equal(node.src,art.src);assert(node.loaded);assert.equal(node.sourceRect,Object.values(art.sourceRect).join(','));
    assertCssNumber(node,'imageWidth',art.sourceWidth*scale,scale);assertCssNumber(node,'imageHeight',art.sourceHeight*scale,scale);
    assertCssNumber(node,'width',art.sourceRect.width*scale,scale);assertCssNumber(node,'height',art.sourceRect.height*scale,scale);
    assertCssNumber(node,'left',item.x-art.pivot.x*scale,scale);
    assertCssNumber(node,'top',item.y*api.HOMEWORLD_GEOMETRY_V64.depthScale-(item.elevation??0)-art.pivot.y*scale,scale);
    assert.equal(node.zIndex,Math.round(Math.max(1,item.y)));assert.equal(node.transform,'none');assert.equal(node.imageTransform,'none');
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  await capture(name);checks.push({name:'functional-native-exterior-view',view:name,requiredId,mounted:data.length,paint,objects:data});
}
function observationRoute(item,from){const box=api.homeworldExteriorFootprintV76(item);
  const side=(box.right-box.left)/2+55,behind=box.top-box.bottom-65;
  // A clear shoulder need not belong to the connected street network. Historic
  // furniture encloses the first two clear memory shoulders even with all V76
  // solids absent. Require an actual full-model route from the current actor;
  // wider observations stay inside the same camera and never teleport him.
  const candidates=[[0,70],[-65,70],[65,70],[0,behind],[-50,behind],[50,behind],[-side,-35],[side,-35],[-side,-80],[side,-80],[0,125],[-140,110],[140,110],
    [-210,245],[-280,185],[-350,185]],rejected=[];
  for(const [dx,dy]of candidates){
    const target={x:item.x+dx,y:box.bottom+dy};
    if(!api.isHomeworldWalkable(target,{halfWidth:36,halfDepth:26})){rejected.push({target,reason:'full-body-clearance'});continue;}
    const route=api.homeworldSpatialRoute(from,target);
    if(route.status!=='reachable'){rejected.push({target,reason:'no-connected-route'});continue;}
    assert(Math.hypot(target.x-item.x,target.y-item.y)<380,'observation remains near the original native decoration');
    observations.push({itemId:item.id,from,target,rejected,clearance:{halfWidth:36,halfDepth:26},distanceToItem:Math.hypot(target.x-item.x,target.y-item.y)});
    return{target,route};
  }throw Error('No safe connected observation shoulder: '+item.id+' '+JSON.stringify(rejected));
}
try{
  await page.addInitScript(({key,save})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(save));},{key:p.SAVE_STORAGE_KEY,save:firstTracksCompleted()});
  if(!naturalDevHydration)await page.clock.install();await page.goto(url,{waitUntil:'networkidle'});
  if(naturalDevHydration){await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>/^Continuer/.test(b.textContent??'')&&!b.disabled));await page.clock.install();}
  else await page.clock.runFor(250);
  await page.getByRole('button',{name:/^Continuer/}).click();await page.locator('[data-homeworld-hub][data-homeworld-motion-ready="true"]').waitFor({timeout:120000});
  assert.equal(await page.locator('main').getAttribute('data-game-content-version'),process.env.YAUTJA_QA_EXPECTED_VERSION??'V76');
  await page.clock.pauseAt(await page.evaluate(()=>Date.now()+150));const nav=homeworldNavigatorV66(page,api);await nav.focus();
  const selections=[['merchant-canopy-diagonal','market'],['terrace-bench-right','terraces'],['mineral-planter-left','memory'],
    ['logistics-container-rack','convoy-works'],['mineral-planter-left','rampart-walk']];
  for(const[artId,districtId]of selections){
    const item=api.HOMEWORLD_EXTERIOR_SOLIDS_V76.find(item=>item.artId===artId&&item.districtId===districtId);assert(item);
    const from=await nav.position(),{target,route}=observationRoute(item,from);
    assert.equal(route.status,'reachable',item.id);await nav.follow(route.points);await nav.tick(100);
    assert(Math.hypot((await nav.position()).x-target.x,(await nav.position()).y-target.y)<11);
    routes.push({itemId:item.id,from,to:await nav.position(),distance:route.distance,publicKeyboard:true});
    await inspect(districtId+'-'+artId,item.id);
    if(districtId==='market'){
      await page.setViewportSize({width:393,height:852});await nav.tick(100);await nav.focus();await inspect('market-canopy-mobile',item.id);
      await page.setViewportSize({width:1440,height:1000});await nav.tick(100);await nav.focus();
    }
  }
  const native=Object.values(api.HOMEWORLD_EXTERIOR_ART_V76).filter(art=>art.nativeGroundSupport);
  for(const source of native){const response=await page.request.get(url+source.src);assert.equal(response.status(),200);
    const hash=crypto.createHash('sha256').update(await response.body()).digest('hex');assert.equal(hash,source.sha256);
    checks.push({name:'four-original-native-png-sha',src:source.src,sha256:hash});
  }
  const actorBefore=await nav.position(),secondsBefore=await page.locator('[data-homeworld-viewport]').getAttribute('data-city-seconds');
  await page.getByRole('button',{name:/^Atlas de la cité/}).click();await page.getByRole('button',{name:'Codex des éléments',exact:true}).click();
  const item=api.HOMEWORLD_EXTERIOR_SOLIDS_V76.find(item=>item.artId==='merchant-canopy-diagonal');
  await page.getByRole('searchbox',{name:'Rechercher',exact:true}).fill(item.id);await page.locator('[data-homeworld-element-id="'+item.id+'"]').click();
  const detail=page.locator('[data-homeworld-element-detail="'+item.id+'"]');assert((await detail.textContent()).includes('Volume solide'));
  assert((await detail.textContent()).includes('aucun butin'));await nav.tick(1000);assert.deepEqual(await nav.position(),actorBefore);
  assert.equal(await page.locator('[data-homeworld-viewport]').getAttribute('data-city-seconds'),secondsBefore);await capture('native-merchant-linked-codex');
  checks.push({name:'exterior-codex-ground-volume-read-only',itemId:item.id});
  assert.equal(api.HOMEWORLD_RESIDENTS_V69.length,98);assert.equal(api.HOMEWORLD_BUILDINGS.length,43);assert.equal(api.HOMEWORLD_EXTERIOR_SOLIDS_V76.length,70);
  checks.push({name:'live-model-counts',solid:70,wallOrnaments:4,routines:98,buildings:43});
  assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
  await fs.writeFile(output+'/report.json',JSON.stringify({status:'PASS',url,checks,routes,captures,errors,failures,serialization,observations,
    limits:'Four independently generated native PNGs, seventy solid exterior fixtures and four passive wall textiles. Five representative pockets reached by real keyboard, one mobile view; all43doors/tenregionthresholds/98continuousroutines are separate model gates, not each manually visited. Original civil furniture, no official canonical city plan or new loot/service. Source contact points measured visually; no raster edits or CSS rotations.'},null,2)+'\n');
  console.log(JSON.stringify({status:'PASS',checks:checks.length,routes:routes.length,captures:captures.length,output}));
}catch(error){await capture('failure').catch(()=>{});await fs.writeFile(output+'/report.json',JSON.stringify({status:'FAIL',url,error:String(error),checks,routes,captures,errors,failures,serialization,observations},null,2)+'\n');throw error;}
finally{await browser.close();}
